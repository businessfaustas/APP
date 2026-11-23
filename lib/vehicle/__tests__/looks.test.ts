import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { CAR_LOOKS, HERO_LOOK, pickCarLook } from "../looks";

describe("pickCarLook", () => {
  it("shows the photo closest to the listing's paint colour", () => {
    expect(pickCarLook("sedan", "#1f3566").src).toBe("/cars/sedan-blue.webp");
    expect(pickCarLook("sedan", "#7c8494").src).toBe("/cars/sedan.webp");
    expect(pickCarLook("coupe", "#d2632a").src).toBe("/cars/coupe-orange.webp");
    expect(pickCarLook("coupe", "#dfb637").src).toBe("/cars/coupe.webp");
    expect(pickCarLook("suv", "#d2632a").src).toBe("/cars/suv.webp");
    expect(["/cars/suv-volvo.webp", "/cars/suv-tesla.webp"]).toContain(pickCarLook("suv", "#e8ebf0").src);
  });

  it("prefers a photo made for the lot's make and model", () => {
    expect(pickCarLook("suv", "#262a32", "Tesla Model Y").src).toBe("/cars/suv-tesla.webp");
    expect(pickCarLook("suv", "#262a32", "2021 Volvo XC40").src).toBe("/cars/suv-volvo.webp");
    expect(pickCarLook("sedan", "#262a32", "2019 Audi A3").src).toBe("/cars/sedan-blue.webp");
    expect(pickCarLook("coupe", undefined, "McLaren 720S").src).toBe("/cars/coupe-orange.webp");
  });

  it("is stable: the same lot always gets the same photo, so server and browser agree", () => {
    for (const seed of ["Honda CR-V", "Toyota RAV4", "Hyundai Tucson", ""]) {
      expect(pickCarLook("suv", "#e8ebf0", seed)).toBe(pickCarLook("suv", "#e8ebf0", seed));
    }
    // equally close photos are both used across different lots
    const used = new Set(
      ["Honda CR-V", "Toyota RAV4", "Hyundai Tucson", "Kia Sportage", "Mazda CX-5", "Subaru Forester"].map((s) => pickCarLook("suv", "#e8ebf0", s).src),
    );
    expect(used.size).toBeGreaterThan(1);
  });

  it("never picks the wrecked showcase car for a real lot", () => {
    for (const body of ["sedan", "suv", "coupe", "pickup"] as const) {
      expect(CAR_LOOKS[body].map((l) => l.src)).not.toContain(HERO_LOOK.src);
    }
  });

  it("falls back to the first photo when the colour is unknown or malformed", () => {
    expect(pickCarLook("sedan").src).toBe("/cars/sedan.webp");
    expect(pickCarLook("sedan", "not-a-colour").src).toBe("/cars/sedan.webp");
  });

  it("every photo exists, is a WebP with transparency, and has the proportions the page assumes", async () => {
    for (const looks of [...Object.values(CAR_LOOKS), [HERO_LOOK]]) {
      for (const look of looks) {
        const file = join(process.cwd(), "public", look.src);
        expect(existsSync(file), look.src).toBe(true);
        const meta = await sharp(readFileSync(file)).metadata();
        expect(meta.format, look.src).toBe("webp");
        expect(meta.hasAlpha, look.src).toBe(true);
        expect(meta.width! / meta.height!, look.src).toBeCloseTo(look.ratio, 1);
      }
    }
  });
});
