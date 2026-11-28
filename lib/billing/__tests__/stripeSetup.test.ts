import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/env", () => ({ env: () => ({ NEXT_PUBLIC_APP_URL: "https://app.example.com/" }) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("../stripe", () => ({
  stripe: () => {
    throw new Error("these tests pass their own client");
  },
}));

const { CATALOG, REQUIRED_WEBHOOK_EVENTS } = await import("../catalog");
const { createCatalog, diagnoseStripe, ensureWebhook, webhookUrl } = await import("../stripeSetup");

type AnyFn = (...a: never[]) => unknown;

/** A tiny in-memory Stripe: just the calls the setup makes. */
function fakeStripe(seed: { prices?: Record<string, object>; hooks?: object[]; taxStatus?: string; portal?: boolean } = {}) {
  const prices = new Map<string, object>(Object.entries(seed.prices ?? {}));
  const hooks = [...(seed.hooks ?? [])] as Array<{ id: string; url: string; enabled_events: string[]; status: string }>;
  const calls = { products: [] as object[], prices: [] as object[], hookCreates: [] as object[], hookUpdates: [] as object[] };
  const client = {
    products: { create: vi.fn(async (p: object) => (calls.products.push(p), { id: `prod_${calls.products.length}` })) },
    prices: {
      list: vi.fn(async ({ lookup_keys }: { lookup_keys: string[] }) => ({ data: prices.has(lookup_keys[0]!) ? [prices.get(lookup_keys[0]!)] : [] })),
      create: vi.fn(async (p: { lookup_key: string }) => {
        calls.prices.push(p);
        const made = { id: `price_${calls.prices.length}`, ...p };
        prices.set(p.lookup_key, made);
        return made;
      }),
    },
    webhookEndpoints: {
      list: vi.fn(async () => ({ data: hooks })),
      create: vi.fn(async (p: object) => (calls.hookCreates.push(p), { id: "we_1", secret: "whsec_new", ...p })),
      update: vi.fn(async (id: string, p: object) => (calls.hookUpdates.push({ id, ...p }), {})),
    },
    tax: { settings: { retrieve: vi.fn(async () => ({ status: seed.taxStatus ?? "active" })) } },
    billingPortal: { configurations: { list: vi.fn(async () => ({ data: seed.portal === false ? [] : [{ id: "bpc_1" }] })) } },
  };
  return { client: client as unknown as import("stripe").default, calls, prices };
}

const goodPrice = (c: (typeof CATALOG)[number]) => ({
  id: `price_${c.item}`,
  currency: "eur",
  unit_amount: c.amountCents,
  type: c.recurring ? "recurring" : "one_time",
  recurring: c.recurring ? { interval: "month" } : null,
  tax_behavior: "inclusive",
  lookup_key: c.lookupKey,
});
const allGoodPrices = () => Object.fromEntries(CATALOG.map((c) => [c.lookupKey, goodPrice(c)]));

describe("creating the prices", () => {
  it("creates five products, each with a description, features and a euro price with VAT included", async () => {
    const { client, calls } = fakeStripe();
    const out = await createCatalog(client);
    expect(out.map((r) => r.status)).toEqual(Array(5).fill("created"));
    expect(calls.products).toHaveLength(5);
    expect(calls.products[0]).toMatchObject({ name: "FlagBid: 10 cars", metadata: { flagbid_item: "PACK_10", reports: "10" } });
    expect((calls.products[0] as { description: string }).description).toContain("10 car reports");
    expect((calls.products[0] as { marketing_features: { name: string }[] }).marketing_features[0]).toEqual({ name: "10 full car reports" });

    const pack = calls.prices.find((p) => (p as { lookup_key: string }).lookup_key === "flagbid_pack_10")!;
    expect(pack).toMatchObject({ currency: "eur", unit_amount: 2900, tax_behavior: "inclusive" });
    expect(pack).not.toHaveProperty("recurring");
    const pro = calls.prices.find((p) => (p as { lookup_key: string }).lookup_key === "flagbid_pro_monthly")!;
    expect(pro).toMatchObject({ currency: "eur", unit_amount: 5900, recurring: { interval: "month" } });
  });

  it("does nothing the second time", async () => {
    const { client, calls } = fakeStripe({ prices: allGoodPrices() });
    const out = await createCatalog(client);
    expect(out.map((r) => r.status)).toEqual(Array(5).fill("exists"));
    expect(calls.products).toHaveLength(0);
    expect(calls.prices).toHaveLength(0);
  });

  it("creates only what is missing, and flags a price with the wrong amount instead of touching it", async () => {
    const seed = allGoodPrices();
    delete seed.flagbid_pack_30;
    seed.flagbid_pro_monthly = { ...goodPrice(CATALOG.find((c) => c.item === "PRO")!), unit_amount: 4900 };
    const { client, calls } = fakeStripe({ prices: seed });
    const out = await createCatalog(client);
    expect(calls.products).toHaveLength(1);
    expect(out.find((r) => r.item === "PACK_30")!.status).toBe("created");
    const pro = out.find((r) => r.item === "PRO")!;
    expect(pro.status).toBe("mismatch");
    expect(pro.note).toMatch(/49\.00, not 59\.00/);
  });
});

describe("the webhook", () => {
  const url = "https://app.example.com/api/stripe/webhook";

  it("is built from the site address", () => {
    expect(webhookUrl()).toBe(url);
  });

  it("is created with every event, and the signing secret comes back once", async () => {
    const { client, calls } = fakeStripe();
    const r = await ensureWebhook(client, url);
    expect(r).toMatchObject({ created: true, secret: "whsec_new", url });
    expect((calls.hookCreates[0] as { enabled_events: string[] }).enabled_events).toEqual([...REQUIRED_WEBHOOK_EVENTS]);
  });

  it("is completed, not duplicated, when it exists but misses events", async () => {
    const { client, calls } = fakeStripe({ hooks: [{ id: "we_9", url, enabled_events: ["checkout.session.completed"], status: "enabled" }] });
    const r = await ensureWebhook(client, url);
    expect(r.created).toBe(false);
    expect(r.secret).toBeNull();
    expect(r.addedEvents).toContain("charge.refunded");
    expect(calls.hookCreates).toHaveLength(0);
    expect((calls.hookUpdates[0] as { enabled_events: string[] }).enabled_events).toEqual(expect.arrayContaining([...REQUIRED_WEBHOOK_EVENTS]));
  });

  it("is left alone when it is already right (including an endpoint that listens to everything)", async () => {
    const { client, calls } = fakeStripe({ hooks: [{ id: "we_9", url, enabled_events: ["*"], status: "enabled" }] });
    const r = await ensureWebhook(client, url);
    expect(r).toMatchObject({ created: false, addedEvents: [] });
    expect(calls.hookUpdates).toHaveLength(0);
  });

  it("refuses an address Stripe can't call", async () => {
    const { client } = fakeStripe();
    await expect(ensureWebhook(client, "http://localhost:3000/api/stripe/webhook")).rejects.toThrow(/public https address/);
    await expect(ensureWebhook(client, "https://localhost/api/stripe/webhook")).rejects.toThrow(/public https address/);
  });
});

describe("the check", () => {
  const url = "https://app.example.com/api/stripe/webhook";
  const hook = { id: "we_1", url, enabled_events: [...REQUIRED_WEBHOOK_EVENTS], status: "enabled" };

  it("is clean when the prices, webhook, secret, tax and portal are all in place", async () => {
    const { client } = fakeStripe({ prices: allGoodPrices(), hooks: [hook] });
    const d = await diagnoseStripe(client, { key: "sk_test_x", webhookSecretSet: true, automaticTax: true, url });
    expect(d.ok).toBe(true);
    expect(d.lines[0]).toBe("Key accepted (test mode).");
    expect(d.lines.join(" ")).toMatch(/All 5 prices exist/);
  });

  it("names every problem, problems first, for a freshly connected account", async () => {
    const { client } = fakeStripe({ portal: false });
    const d = await diagnoseStripe(client, { key: "sk_live_x", webhookSecretSet: false, url });
    expect(d.ok).toBe(false);
    const text = d.lines.join("\n");
    expect(text).toMatch(/None of the 5 prices exist in this live account yet: press "Create prices"/);
    expect(text).toMatch(/No webhook points at https:\/\/app.example.com\/api\/stripe\/webhook/);
    expect(text).toMatch(/STRIPE_WEBHOOK_SECRET is not set/);
    expect(text).toMatch(/customer portal isn't set up/);
    expect(d.lines[d.lines.length - 1]).toBe("Key accepted (live mode).");
  });

  it("catches a wrong amount, VAT added on top, a disabled webhook, missing events and an inactive tax setup", async () => {
    const seed = allGoodPrices();
    seed.flagbid_pack_100 = { ...goodPrice(CATALOG.find((c) => c.item === "PACK_100")!), unit_amount: 19_900 + 100 };
    seed.flagbid_pack_10 = { ...goodPrice(CATALOG.find((c) => c.item === "PACK_10")!), tax_behavior: "exclusive" };
    const { client } = fakeStripe({ prices: seed, hooks: [{ ...hook, status: "disabled" }], taxStatus: "pending" });
    const text = (await diagnoseStripe(client, { key: "sk_test_x", webhookSecretSet: true, automaticTax: true, url })).lines.join("\n");
    expect(text).toMatch(/FlagBid: 100 cars: This price amount is 200\.00, not 199\.00/);
    expect(text).toMatch(/FlagBid: 10 cars: tax behaviour is "exclusive"/);
    expect(text).toMatch(/webhook endpoint is disabled/);
    expect(text).toMatch(/Stripe Tax isn't active yet/);

    const partial = fakeStripe({ prices: allGoodPrices(), hooks: [{ ...hook, enabled_events: ["checkout.session.completed"] }] });
    expect((await diagnoseStripe(partial.client, { key: "sk_test_x", webhookSecretSet: true, url })).lines.join("\n")).toMatch(
      /missing events: .*charge\.refunded/,
    );
  });
});

void (undefined as unknown as AnyFn);
