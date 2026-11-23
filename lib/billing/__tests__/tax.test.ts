import { describe, expect, it } from "vitest";

import { taxSessionOptions } from "../tax";

describe("taxSessionOptions", () => {
  it("adds nothing while Stripe Tax is off, so checkout works before tax is set up", () => {
    expect(taxSessionOptions(false)).toEqual({});
  });

  it("asks Stripe to calculate tax and collect the address and VAT number when on", () => {
    const o = taxSessionOptions(true);
    expect(o.automatic_tax).toEqual({ enabled: true });
    expect(o.billing_address_collection).toBe("required");
    expect(o.tax_id_collection).toEqual({ enabled: true });
    // required by Stripe when an existing customer is used with automatic tax and tax ID collection
    expect(o.customer_update).toEqual({ address: "auto", name: "auto" });
  });
});
