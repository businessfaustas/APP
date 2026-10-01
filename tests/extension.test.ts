import { describe, expect, it } from "vitest";

import { LIMITS, lotFromUrl, selectImageUrls } from "@/extension/src/lot";

describe("extension lot detection", () => {
  it("recognizes lot pages on supported auctions", () => {
    expect(lotFromUrl("https://www.copart.com/lot/90000001/clean-title-2019-audi-a3")).toEqual({ source: "COPART", lotNumber: "90000001" });
    expect(lotFromUrl("https://www.iaai.com/VehicleDetail/41234567~US")).toEqual({ source: "IAAI", lotNumber: "41234567" });
    expect(lotFromUrl("https://bid.cars/en/lot/1-90000001/2019-audi-a3")).toEqual({ source: "BIDCARS", lotNumber: "1-90000001" });
  });

  it("ignores search results, home pages and other sites", () => {
    expect(lotFromUrl("https://www.copart.com/vehicleFinder?query=audi")).toBeNull();
    expect(lotFromUrl("https://www.iaai.com/")).toBeNull();
    expect(lotFromUrl("https://example.com/lot/12345678")).toBeNull();
  });
});

describe("extension photo selection", () => {
  const page = "https://www.copart.com/lot/90000001";

  it("keeps auction CDN photos, upgrades Copart thumbnails and dedupes", () => {
    const urls = selectImageUrls(
      [
        { url: "https://cs.copart.com/v1/AUTH_svc.pdoc00001/lpp/0925/abc_thb.jpg", width: 0 },
        { url: "https://cs.copart.com/v1/AUTH_svc.pdoc00001/lpp/0925/abc_ful.jpg", width: 640 },
        { url: "https://vis.iaai.com/resizer?imageKeys=41234567~SID~B1~I1&width=845", width: 0 },
        { url: "https://vis.iaai.com/resizer?imageKeys=41234567~SID~B1~I2&width=845", width: 0 },
      ],
      page,
    );
    expect(urls).toEqual([
      "https://cs.copart.com/v1/AUTH_svc.pdoc00001/lpp/0925/abc_ful.jpg",
      "https://vis.iaai.com/resizer?imageKeys=41234567~SID~B1~I1&width=845",
      "https://vis.iaai.com/resizer?imageKeys=41234567~SID~B1~I2&width=845",
    ]);
  });

  it("drops logos, icons, svgs, insecure and small unknown images", () => {
    const urls = selectImageUrls(
      [
        { url: "/images/copart-logo.png", width: 180 },
        { url: "https://cs.copart.com/icons/flag-us.jpg", width: 24 },
        { url: "https://cdn.example.com/badge.svg", width: 400 },
        { url: "http://insecure.example.com/car.jpg", width: 1200 },
        { url: "https://ads.example.com/tiny.jpg", width: 120 },
        { url: "https://cdn.example.com/large-car.jpg", width: 1024 },
      ],
      page,
    );
    expect(urls).toEqual(["https://cdn.example.com/large-car.jpg"]);
  });

  it(`caps the list at ${LIMITS.images} photos`, () => {
    const many = Array.from({ length: 120 }, (_, i) => ({ url: `https://cs.copart.com/lpp/p${i}_ful.jpg`, width: 0 }));
    expect(selectImageUrls(many, page)).toHaveLength(LIMITS.images);
  });
});
