import { afterAll, describe, expect, it, vi } from "vitest";

import { canConnect, loadEnv, uid } from "./helpers/db";

/**
 * The "your data, your call" paths: deleting an account really removes everything, reminders go
 * out once and respect unsubscribe, and the unsubscribe link works without signing in.
 * Needs a database (skipped when none is reachable).
 */
const dbUp = await canConnect();
loadEnv();
process.env.PHOTO_STORAGE = "db"; // the production layout on Vercel: uploads live in Postgres

const session = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  getSessionUser: vi.fn(async () => session.user),
}));

describe.skipIf(!dbUp)("account lifecycle", () => {
  const made: string[] = [];
  const listings: string[] = [];
  afterAll(async () => {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.user.deleteMany({ where: { id: { in: made } } });
    await prisma.listing.deleteMany({ where: { id: { in: listings } } });
  });

  async function fixture() {
    const { prisma } = await import("@/lib/db/prisma");
    const id = uid("life");
    made.push(id);
    await prisma.user.create({ data: { id, email: `${id}@example.test`, settings: { create: {} }, ledger: { create: { delta: 3, reason: "SIGNUP" } } } });
    const listing = await prisma.listing.create({ data: { source: "COPART", lotNumber: uid("lot"), extractionMethod: "MANUAL" } });
    listings.push(listing.id);
    const analysis = await prisma.analysis.create({ data: { userId: id, listingId: listing.id, inputType: "TEXT", inputValue: "x", settingsSnapshot: {} } });
    await prisma.dealJournalEntry.create({ data: { userId: id, analysisId: analysis.id, title: "deal" } });
    await prisma.watchlistItem.create({ data: { userId: id, listingId: listing.id, remindAt: new Date(Date.now() - 1000) } });
    await prisma.batch.create({ data: { userId: id } });
    await prisma.storedObject.create({ data: { path: `uploads/${id}/a.jpg`, bytes: Buffer.from("x") } });
    return { id, prisma };
  }

  it("deleting an account removes the user, every record they own and their uploaded files", async () => {
    const { deleteAccount } = await import("@/lib/account/delete");
    const { id, prisma } = await fixture();
    await deleteAccount({ id });
    const counts = await Promise.all([
      prisma.user.count({ where: { id } }),
      prisma.userSettings.count({ where: { userId: id } }),
      prisma.analysis.count({ where: { userId: id } }),
      prisma.dealJournalEntry.count({ where: { userId: id } }),
      prisma.watchlistItem.count({ where: { userId: id } }),
      prisma.batch.count({ where: { userId: id } }),
      prisma.creditLedger.count({ where: { userId: id } }),
      prisma.storedObject.count({ where: { path: { startsWith: `uploads/${id}/` } } }),
    ]);
    expect(counts).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("the delete endpoint refuses the shared demo account and signed-out callers", async () => {
    const { DELETE } = await import("@/app/api/account/route");
    session.user = null;
    expect((await DELETE(new Request("http://localhost/api/account", { method: "DELETE" }))).status).toBe(401);
    session.user = { id: "demo-user", email: "demo@example.test", name: null, role: "USER", plan: "PRO", creditsRemaining: 1, isDemo: true, consented: true };
    expect((await DELETE(new Request("http://localhost/api/account", { method: "DELETE" }))).status).toBe(400);
  });

  it("a reminder is claimed once: running the job twice sends nothing the second time", async () => {
    const { sendDueReminders } = await import("@/lib/jobs/maintenance");
    const { id, prisma } = await fixture();
    const first = await sendDueReminders();
    const second = await sendDueReminders();
    expect(first.sent + first.skipped).toBeGreaterThanOrEqual(1); // no email key in tests, so it is skipped, but claimed
    expect(second.sent + second.skipped).toBe(0);
    expect((await prisma.watchlistItem.findFirst({ where: { userId: id } }))?.remindedAt).not.toBeNull();
  });

  it("the unsubscribe link switches email off with no sign-in, and a forged link does nothing", async () => {
    const { POST } = await import("@/app/api/unsubscribe/route");
    const { signToken } = await import("@/lib/security/tokens");
    const { id, prisma } = await fixture();
    const forged = await POST(new Request("http://localhost/api/unsubscribe?t=nope.nope", { method: "POST" }));
    expect(forged.status).toBe(400);
    expect((await prisma.user.findUnique({ where: { id } }))?.emailOptOut).toBe(false);
    const ok = await POST(
      new Request(`http://localhost/api/unsubscribe?t=${encodeURIComponent(signToken("unsubscribe", id))}`, {
        method: "POST",
        headers: { "list-unsubscribe": "One-Click" },
      }),
    );
    expect(ok.status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id } }))?.emailOptOut).toBe(true);
  });

  it("the age gate: the consent endpoint stamps the date and the terms version", async () => {
    const { POST } = await import("@/app/api/consent/route");
    const { id, prisma } = await fixture();
    session.user = { id, email: `${id}@example.test`, name: null, role: "USER", plan: "FREE", creditsRemaining: 3, isDemo: false, consented: false };
    const post = (body: unknown) =>
      POST(new Request("http://localhost/api/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    expect((await post({ ageConfirmed: true })).status).toBe(400);
    expect((await post({ ageConfirmed: false, termsAccepted: true })).status).toBe(400);
    expect((await prisma.user.findUnique({ where: { id } }))?.ageConfirmedAt).toBeNull();
    expect((await post({ ageConfirmed: true, termsAccepted: true })).status).toBe(200);
    const row = await prisma.user.findUnique({ where: { id } });
    expect(row?.ageConfirmedAt).not.toBeNull();
    expect(row?.termsVersion).toBeTruthy();
  });
});
