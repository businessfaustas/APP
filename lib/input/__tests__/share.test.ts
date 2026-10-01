import { describe, expect, it } from "vitest";

import { pickSharedInput } from "../share";

describe("pickSharedInput", () => {
  it("takes the lot URL out of shared text with extra words", () => {
    expect(pickSharedInput({ text: "Check out this 2019 AUDI A3 https://www.copart.com/lot/90000001. Thoughts?" })).toBe("https://www.copart.com/lot/90000001");
  });

  it("prefers an auction lot URL over other links", () => {
    expect(pickSharedInput({ url: "https://share.example.com/x", text: "https://www.iaai.com/VehicleDetail/41234567~US" })).toBe(
      "https://www.iaai.com/VehicleDetail/41234567~US",
    );
  });

  it("falls back to a VIN, then any URL, then the text", () => {
    expect(pickSharedInput({ text: "VIN WAUAUGFF3K1012345 on this one" })).toMatch(/^WAUAUGFF.K1012345$/);
    expect(pickSharedInput({ url: "https://example.com/listing/1" })).toBe("https://example.com/listing/1");
    expect(pickSharedInput({ title: "2019 Audi A3 salvage, front end" })).toBe("2019 Audi A3 salvage, front end");
    expect(pickSharedInput({})).toBe("");
  });
});
