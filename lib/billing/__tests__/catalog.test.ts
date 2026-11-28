import { describe, expect, it } from "vitest";

import { CATALOG, CHECKOUT_ITEMS, entryFor, entryForLookupKey, REQUIRED_WEBHOOK_EVENTS } from "../catalog";
import { PACKS, PLANS } from "../plans";

describe("what we sell, as Stripe must have it", () => {
  it("has exactly the items checkout accepts, each once, with a unique lookup key", () => {
    expect(CATALOG.map((c) => c.item).sort()).toEqual([...CHECKOUT_ITEMS].sort());
    expect(new Set(CATALOG.map((c) => c.lookupKey)).size).toBe(CATALOG.length);
  });

  it("takes every amount from plans.ts, in euro cents", () => {
    for (const id of ["PACK_10", "PACK_30", "PACK_100"] as const) expect(entryFor(id).amountCents).toBe(PACKS[id].price * 100);
    expect(entryFor("PRO").amountCents).toBe(PLANS.PRO.priceMonthly * 100);
    expect(entryFor("BUSINESS").amountCents).toBe(PLANS.BUSINESS.priceMonthly * 100);
  });

  it("makes plans monthly and packs one-time", () => {
    expect(CATALOG.filter((c) => c.recurring).map((c) => c.item)).toEqual(["PRO", "BUSINESS"]);
  });

  it("tells the customer what they get: the number of reports, whether it expires, in words", () => {
    expect(entryFor("PACK_30").description).toContain("30 car reports");
    expect(entryFor("PACK_30").description).toMatch(/never expire/);
    expect(entryFor("PACK_30").features).toContain("30 full car reports");
    expect(entryFor("PRO").description).toContain("40 car reports every month");
    expect(entryFor("PRO").features[0]).toBe("40 car reports every month");
    expect(entryFor("BUSINESS").features).toContain("Export mode (EU landed cost)");
    for (const c of CATALOG) {
      expect(c.name.startsWith("FlagBid")).toBe(true);
      expect(c.features.length).toBeGreaterThan(2);
      expect(c.features.length).toBeLessThanOrEqual(15); // Stripe's limit on marketing features
      for (const f of c.features) expect(f.length).toBeLessThanOrEqual(80);
      expect(c.reports).toBeGreaterThan(0);
    }
  });

  it("finds an item from its lookup key", () => {
    expect(entryForLookupKey("flagbid_pro_monthly")?.item).toBe("PRO");
    expect(entryForLookupKey("flagbid_pack_10")?.item).toBe("PACK_10");
    expect(entryForLookupKey("other")).toBeNull();
    expect(entryForLookupKey(null)).toBeNull();
  });

  it("lists every event the webhook handler reacts to", () => {
    expect(new Set(REQUIRED_WEBHOOK_EVENTS)).toEqual(
      new Set([
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "invoice.paid",
        "invoice.payment_failed",
        "charge.refunded",
        "charge.dispute.created",
      ]),
    );
  });
});
