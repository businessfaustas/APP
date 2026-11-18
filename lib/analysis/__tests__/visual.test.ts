import { describe, expect, it } from "vitest";

import { auctionPhotoUrl, lotPhoto, photoUrl } from "../visual";

const stored = { id: "p1", originalUrl: "https://cs.copart.com/a.jpg", storagePath: "photos/p1.jpg" };

describe("lot photo choice", () => {
  it("prefers our stored copy", () => {
    expect(lotPhoto(stored, { photoUrls: ["https://cs.copart.com/a.jpg"] })).toBe("/api/photos/p1");
  });

  it("falls back to the auction's own image when nothing is stored", () => {
    expect(lotPhoto(undefined, { photoUrls: ["https://cs.copart.com/a.jpg", "https://cs.copart.com/b.jpg"] })).toBe("https://cs.copart.com/a.jpg");
    expect(lotPhoto({ ...stored, storagePath: null }, { photoUrls: ["https://cs.copart.com/a.jpg"] })).toBe("https://cs.copart.com/a.jpg");
  });

  it("never hot-links demo drawings, store: paths or plain http", () => {
    expect(auctionPhotoUrl(["/demo-photos/audi-a3/1.svg", "store:abc", "http://x.test/a.jpg"])).toBeNull();
    expect(auctionPhotoUrl(["/demo-photos/audi-a3/1.svg", "https://x.test/a.jpg"])).toBe("https://x.test/a.jpg");
    expect(photoUrl({ id: "d", originalUrl: "/demo-photos/audi-a3/1.svg", storagePath: "x" })).toBeNull();
  });

  it("is null without any photo", () => {
    expect(lotPhoto(undefined, null)).toBeNull();
    expect(lotPhoto(undefined, { photoUrls: [] })).toBeNull();
  });
});
