import { beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({ values: {} as Record<string, string | undefined> }));
vi.mock("@/lib/config/env", () => ({ env: () => envMock.values }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
const sdk = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("stripe", () => ({
  default: class {
    prices = { list: sdk.list };
  },
}));

const { isMissingCustomerError, planForPrice, resolvePriceId } = await import("../stripe");

describe("finding the price to charge", () => {
  beforeEach(() => {
    sdk.list.mockReset();
    envMock.values = { STRIPE_SECRET_KEY: "sk_test_x" };
  });

  it("uses the price id from the environment when there is one, without asking Stripe", async () => {
    envMock.values = { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_PACK_30: "price_env" };
    expect(await resolvePriceId("PACK_30")).toBe("price_env");
    expect(sdk.list).not.toHaveBeenCalled();
  });

  it("otherwise finds the active price by its lookup key, and remembers it for a few minutes", async () => {
    sdk.list.mockResolvedValue({ data: [{ id: "price_by_key" }] });
    expect(await resolvePriceId("PACK_100")).toBe("price_by_key");
    expect(sdk.list).toHaveBeenCalledWith({ lookup_keys: ["flagbid_pack_100"], active: true, limit: 1 });
    expect(await resolvePriceId("PACK_100")).toBe("price_by_key");
    expect(sdk.list).toHaveBeenCalledTimes(1);
  });

  it("is null when Stripe has no such price, and tries again next time", async () => {
    sdk.list.mockResolvedValue({ data: [] });
    expect(await resolvePriceId("BUSINESS")).toBeNull();
    expect(await resolvePriceId("BUSINESS")).toBeNull();
    expect(sdk.list).toHaveBeenCalledTimes(2);
  });
});

describe("which plan a subscription is for", () => {
  it("knows our plans by lookup key, so no price id has to be configured", () => {
    envMock.values = {};
    expect(planForPrice({ id: "price_x", lookup_key: "flagbid_pro_monthly" })).toBe("PRO");
    expect(planForPrice({ id: "price_y", lookup_key: "flagbid_business_monthly" })).toBe("BUSINESS");
    expect(planForPrice({ id: "price_z", lookup_key: "flagbid_pack_10" })).toBeNull(); // a pack is not a plan
    expect(planForPrice({ id: "price_z", lookup_key: null })).toBeNull();
    expect(planForPrice(null)).toBeNull();
  });
  it("still honours price ids set in the environment", () => {
    envMock.values = { STRIPE_PRICE_PRO: "price_pro", STRIPE_PRICE_BUSINESS: "price_biz" };
    expect(planForPrice("price_pro")).toBe("PRO");
    expect(planForPrice({ id: "price_biz" })).toBe("BUSINESS");
    expect(planForPrice("price_other")).toBeNull();
  });
});

describe("a customer id Stripe doesn't know", () => {
  it("is recognised, so a test-mode customer doesn't break checkout after switching to live keys", () => {
    expect(isMissingCustomerError({ code: "resource_missing", param: "customer", message: "No such customer: 'cus_123'" })).toBe(true);
    expect(isMissingCustomerError({ code: "resource_missing", message: "No such customer: 'cus_123'; a similar object exists in test mode" })).toBe(true);
    expect(isMissingCustomerError({ code: "resource_missing", param: "line_items[0][price]", message: "No such price: 'price_1'" })).toBe(false);
    expect(isMissingCustomerError(new Error("boom"))).toBe(false);
    expect(isMissingCustomerError(null)).toBe(false);
  });
});
