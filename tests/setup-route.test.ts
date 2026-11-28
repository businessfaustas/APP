import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { canConnect, loadEnv, uid } from "./helpers/db";

/** The one-time setup: three answers become saved settings, for the signed-in user only. Needs a database (skipped when none is reachable). */
const dbUp = await canConnect();
loadEnv();

const session = vi.hoisted(() => ({ user: null as unknown }));
vi.mock("@/lib/auth/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/session")>()),
  getSessionUser: vi.fn(async () => session.user),
}));

const asUser = (id: string) => ({
  id,
  email: `${id}@example.test`,
  name: null,
  role: "USER",
  plan: "FREE",
  creditsRemaining: 3,
  isDemo: false,
  consented: true,
});
const post = (body: unknown) =>
  new Request("http://localhost/api/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe.skipIf(!dbUp)("POST /api/setup", () => {
  const A = uid("setup-a");
  const B = uid("setup-b");
  let prisma: typeof import("@/lib/db/prisma").prisma;
  let POST: (req: Request) => Promise<Response>;

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db/prisma"));
    ({ POST } = await import("@/app/api/setup/route"));
    for (const id of [A, B]) await prisma.user.create({ data: { id, email: `${id}@example.test`, settings: { create: {} } } });
    // the export profiles come from the seed; make sure Lithuania exists even on a database that was not seeded
    if (!(await prisma.exportProfile.findFirst({ where: { countryCode: "LT" } })))
      await prisma.exportProfile.create({
        data: {
          name: "Lithuania (test)",
          countryCode: "LT",
          currency: "EUR",
          departurePortZip: "07114",
          inlandToPortCentsPerMile: 100,
          portAndLoading: 350,
          oceanFreight: 1450,
          marineInsuranceBps: 150,
          destinationPortFees: 450,
          customsBrokerFee: 250,
          dutyBps: 1000,
          vatBps: 2100,
          registrationTax: 300,
          complianceConversion: 450,
          deliveryFromPort: 150,
        },
      });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [A, B] } } });
    await prisma.$disconnect();
  });

  it("refuses someone who is not signed in", async () => {
    session.user = null;
    expect((await POST(post({ resale: { kind: "US", homeZip: "60601" }, hasLicence: true }))).status).toBe(401);
  });

  it("saves an export setup for the signed-in user, marks it done, and touches nobody else", async () => {
    session.user = asUser(A);
    const res = await POST(post({ resale: { kind: "EXPORT", country: "LT" }, hasVatNumber: true, hasLicence: false, brokerFee: 450 }));
    expect(res.status).toBe(200);
    const mine = await prisma.userSettings.findUniqueOrThrow({ where: { userId: A } });
    const lt = await prisma.exportProfile.findFirstOrThrow({ where: { countryCode: "LT" } });
    expect(mine).toMatchObject({
      exitStrategy: "EXPORT",
      exportProfileId: lt.id,
      vatRecoverable: true,
      buyerType: "PUBLIC_VIA_BROKER",
      brokerFee: 450,
      rebuiltFactorBps: 8000,
    });
    expect(mine.onboardedAt).not.toBeNull();
    const other = await prisma.userSettings.findUniqueOrThrow({ where: { userId: B } });
    expect(other).toMatchObject({ exitStrategy: "RETAIL_REBUILT", exportProfileId: null, onboardedAt: null });
  });

  it("switches back to US retail with a ZIP, clearing the export profile", async () => {
    session.user = asUser(A);
    expect((await POST(post({ resale: { kind: "US", homeZip: "60601" }, hasLicence: true }))).status).toBe(200);
    expect(await prisma.userSettings.findUniqueOrThrow({ where: { userId: A } })).toMatchObject({
      exitStrategy: "RETAIL_REBUILT",
      exportProfileId: null,
      vatRecoverable: false,
      homeZip: "60601",
      buyerType: "LICENSED_DEALER",
      rebuiltFactorBps: 7000,
    });
  });

  it("rejects a bad ZIP, an unknown country and a missing answer, and changes nothing", async () => {
    session.user = asUser(B);
    for (const body of [
      { resale: { kind: "US", homeZip: "ABC" }, hasLicence: true },
      { resale: { kind: "EXPORT", country: "FR" }, hasLicence: true },
      { resale: { kind: "EXPORT", country: "LT" } },
      { hasLicence: true },
    ])
      expect((await POST(post(body))).status).toBe(400);
    expect((await prisma.userSettings.findUniqueOrThrow({ where: { userId: B } })).onboardedAt).toBeNull();
  });
});
