import { describe, expect, it } from "vitest";

import { buildChecklist } from "../checklist";
import { countKinds, stepKind } from "../checklistKinds";

describe("stepKind", () => {
  it("sorts the standard steps", () => {
    expect(stepKind("Ask the yard for photos under the front (frame rails, subframe, crossmembers).")).toBe("inspect");
    expect(stepKind("Get an engine-bay photo — check the radiator support, A/C lines and fluids.")).toBe("inspect");
    expect(stepKind("Run the VIN through NICB VINCheck (free) for theft and total-loss records.")).toBe("paperwork");
    expect(stepKind("Check open recalls by VIN — dealers fix them free.")).toBe("paperwork");
    expect(stepKind("Check TX's rebuilt-title inspection rules before buying.")).toBe("paperwork");
    expect(stepKind("Verify the auction's current fee chart for your buyer type and payment method.")).toBe("paperwork");
    expect(stepKind("Budget ADAS calibration after the bumper or windshield work.")).toBe("money");
    expect(stepKind("No keys: confirm the key-programming cost with a locksmith for this model.")).toBe("money");
    expect(stepKind("Plan pickup inside the free storage window to avoid daily storage fees.")).toBe("logistics");
    expect(stepKind("Sale is on approval — the seller can reject the high bid.")).toBe("logistics");
  });

  it("defaults to inspect", () => {
    expect(stepKind("Something nobody wrote a rule for.")).toBe("inspect");
  });

  it("counts every step exactly once", () => {
    const items = buildChecklist({
      flags: [],
      damage: { impact_zones: [], photo_coverage: { missing_critical_angles: ["undercarriage", "engine_bay", "interior"] } } as never,
      listing: { titleCategory: "SALVAGE", titleState: "TX", hasKeys: null } as never,
    });
    const counts = countKinds(items);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(items.length);
    expect(counts.paperwork).toBeGreaterThan(0);
    expect(counts.logistics).toBeGreaterThan(0);
  });
});
