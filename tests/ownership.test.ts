import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { canConnect, loadEnv, uid } from "./helpers/db";

/**
 * Data isolation, tested the way an attacker would: sign in as user B and ask for user A's
 * records by id. Every attempt must look like "not found" and must change nothing.
 * Needs a database (skipped when none is reachable).
 */
const dbUp = await canConnect();
loadEnv();

const session = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  getSessionUser: vi.fn(async () => session.user),
}));

const asUser = (id: string, email: string) => ({ id, email, name: null, role: "USER", plan: "FREE", creditsRemaining: 3, isDemo: false, consented: true });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (method: string, body?: unknown) =>
  new Request("http://localhost/api/x", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe.skipIf(!dbUp)("one user cannot reach another user's data", () => {
  const A = uid("own-a");
  const B = uid("own-b");
  const ids = { analysis: "", batch: "", journal: "", watch: "", listing: "", photo: "", share: "" };
  let prisma: typeof import("@/lib/db/prisma").prisma;

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db/prisma"));
    for (const id of [A, B]) await prisma.user.create({ data: { id, email: `${id}@example.test`, settings: { create: {} } } });
    const listing = await prisma.listing.create({
      data: {
        source: "COPART",
        lotNumber: uid("lot"),
        extractionMethod: "MANUAL",
        year: 2019,
        make: "Audi",
        model: "A3",
        photos: { create: { position: 0, storagePath: `listings/${uid("p")}/0.jpg` } },
      },
      include: { photos: true },
    });
    ids.listing = listing.id;
    ids.photo = listing.photos[0]!.id;
    const batch = await prisma.batch.create({ data: { userId: A, name: "A's batch" } });
    ids.batch = batch.id;
    ids.share = uid("share-token-0123456789");
    const analysis = await prisma.analysis.create({
      data: {
        userId: A,
        listingId: listing.id,
        batchId: batch.id,
        inputType: "TEXT",
        inputValue: "private pasted listing text with my phone 555-0100",
        status: "COMPLETED",
        shareToken: ids.share,
        settingsSnapshot: { homeZip: "77002", laborRate: 70 },
        logistics: { distanceMiles: 120, method: "ZIP_CENTROID", yardZip: "77001", userZip: "77002", milesToPort: null },
        aiCostUsd: 0.31,
      },
    });
    ids.analysis = analysis.id;
    ids.journal = (await prisma.dealJournalEntry.create({ data: { userId: A, analysisId: analysis.id, title: "A's deal" } })).id;
    ids.watch = (await prisma.watchlistItem.create({ data: { userId: A, listingId: listing.id, analysisId: analysis.id, notes: "A's note" } })).id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [A, B] } } });
    await prisma.listing.deleteMany({ where: { id: ids.listing } });
    await prisma.$disconnect();
  });

  const asB = () => {
    session.user = asUser(B, `${B}@example.test`);
  };

  it("user B cannot read, change, share, re-run or delete user A's analysis", async () => {
    asB();
    const one = await import("@/app/api/analyses/[id]/route");
    expect((await one.GET(req("GET"), params(ids.analysis))).status).toBe(404);
    expect((await one.PATCH(req("PATCH", { userOverrides: { assumptions: {}, lineItems: null } }), params(ids.analysis))).status).toBe(404);
    expect((await one.DELETE(req("DELETE"), params(ids.analysis))).status).toBe(404);
    const share = await import("@/app/api/analyses/[id]/share/route");
    expect((await share.POST(req("POST"), params(ids.analysis))).status).toBe(404);
    expect((await share.DELETE(req("DELETE"), params(ids.analysis))).status).toBe(404);
    const rerun = await import("@/app/api/analyses/[id]/rerun/route");
    expect((await rerun.POST(req("POST"), params(ids.analysis))).status).toBe(404);
    const resume = await import("@/app/api/analyses/[id]/resume/route");
    expect((await resume.POST(req("POST", {}), params(ids.analysis))).status).toBeGreaterThanOrEqual(400); // "Analysis not found."
    const stillThere = await prisma.analysis.findUnique({ where: { id: ids.analysis } });
    expect(stillThere?.shareToken).toBe(ids.share);
  });

  it("the analyses list, export and batches only show the caller's own records", async () => {
    asB();
    const list = await import("@/app/api/analyses/route");
    const body = (await (await list.GET(new Request("http://localhost/api/analyses"))).json()) as { analyses?: { id: string }[] };
    expect(JSON.stringify(body)).not.toContain(ids.analysis);
    const batch = await import("@/app/api/batches/[id]/route");
    expect((await batch.GET(req("GET"), params(ids.batch))).status).toBe(404);
    const account = await import("@/app/api/account/route");
    const exported = JSON.stringify(await (await account.GET(new Request("http://localhost/api/account"))).json());
    expect(exported).not.toContain(ids.analysis);
    expect(exported).not.toContain("A's note");
    expect(exported).not.toContain(`${A}@example.test`);
  });

  it("user B cannot touch A's journal, watchlist or photos", async () => {
    asB();
    const journal = await import("@/app/api/journal/route");
    await journal.PATCH(req("PATCH", { id: ids.journal, title: "hacked" }));
    await journal.DELETE(new Request(`http://localhost/api/journal?id=${ids.journal}`, { method: "DELETE" }));
    expect((await prisma.dealJournalEntry.findUnique({ where: { id: ids.journal } }))?.title).toBe("A's deal");
    const watch = await import("@/app/api/watchlist/route");
    await watch.PATCH(req("PATCH", { id: ids.watch, notes: "hacked" }));
    await watch.DELETE(new Request(`http://localhost/api/watchlist?id=${ids.watch}`, { method: "DELETE" }));
    expect((await prisma.watchlistItem.findUnique({ where: { id: ids.watch } }))?.notes).toBe("A's note");
    const photo = await import("@/app/api/photos/[id]/route");
    expect((await photo.GET(req("GET"), params(ids.photo))).status).toBe(404);
  });

  it("user B cannot journal or watch a deal on A's analysis id", async () => {
    asB();
    const journal = await import("@/app/api/journal/route");
    const res = await journal.POST(req("POST", { analysisId: ids.analysis, title: "mine now" }));
    expect(res.status).toBeGreaterThanOrEqual(400);
    const watch = await import("@/app/api/watchlist/route");
    const w = await watch.POST(req("POST", { analysisId: ids.analysis }));
    expect(w.status).toBeGreaterThanOrEqual(400);
    expect(await prisma.watchlistItem.count({ where: { userId: B } })).toBe(0);
  });

  it("a shared link shows the report but not the owner's pasted text, home ZIP or cost", async () => {
    const { getAnalysisView } = await import("@/lib/analysis/view");
    const shared = await getAnalysisView("", { shareToken: ids.share });
    expect(shared).not.toBeNull();
    expect(shared!.inputValue).toBe("");
    expect(shared!.settings.homeZip).toBe("");
    expect(shared!.logistics?.userZip).toBeNull();
    expect(shared!.aiCostUsd).toBeNull();
    expect(JSON.stringify(shared)).not.toContain("555-0100");
    expect(JSON.stringify(shared)).not.toContain(A);
    const own = await getAnalysisView(ids.analysis, { userId: A });
    expect(own!.settings.homeZip).toBe("77002");
  });
});

describe.skipIf(!dbUp)("credits cannot be overspent by racing requests", () => {
  it("ten simultaneous analyses on 3 credits charge exactly 3", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { chargeForAnalysis, CreditError } = await import("@/lib/billing/credits");
    const id = uid("race");
    await prisma.user.create({ data: { id, email: `${id}@example.test`, creditsRemaining: 3 } });
    try {
      const results = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => chargeForAnalysis(id, `a-${i}`, `input-${i}`)));
      expect(results.filter((r) => r.status === "fulfilled" && r.value === true)).toHaveLength(3);
      expect(results.filter((r) => r.status === "rejected" && r.reason instanceof CreditError)).toHaveLength(7);
      expect((await prisma.user.findUnique({ where: { id } }))?.creditsRemaining).toBe(0);
      expect(await prisma.creditLedger.count({ where: { userId: id, reason: "ANALYSIS" } })).toBe(3);
    } finally {
      await prisma.user.delete({ where: { id } });
    }
  });
});
