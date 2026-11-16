import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the two tables the storage module touches.
const objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
const photos: { id: string; listingId: string; position: number; originalUrl: string | null; storagePath: string | null; width?: number | null }[] = [];

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    storedObject: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { path: string };
        create: { path: string; bytes: Uint8Array; contentType: string };
        update: { bytes: Uint8Array; contentType: string };
      }) => {
        const row = objects.has(where.path) ? update : create;
        objects.set(where.path, { bytes: row.bytes, contentType: row.contentType });
      },
      findUnique: async ({ where }: { where: { path: string } }) => (objects.has(where.path) ? { bytes: objects.get(where.path)!.bytes } : null),
      count: async ({ where }: { where: { path: string } }) => (objects.has(where.path) ? 1 : 0),
      deleteMany: async ({ where }: { where: { path: { startsWith: string } } }) => {
        for (const k of [...objects.keys()]) if (k.startsWith(where.path.startsWith)) objects.delete(k);
      },
    },
    listingPhoto: {
      findMany: async ({ where }: { where: { listingId: string } }) =>
        photos.filter((p) => p.listingId === where.listingId).sort((a, b) => a.position - b.position),
      create: async ({ data }: { data: (typeof photos)[number] }) => void photos.push({ ...data, id: `p${photos.length + 1}` }),
      update: async ({ where, data }: { where: { id: string }; data: { width: number } }) =>
        void Object.assign(
          photos.find((p) => p.id === where.id)!,
          data,
        ),
    },
  },
}));

const config = { SCRAPINGBEE_API_KEY: undefined as string | undefined, SCRAPER_MAX_PAID_PHOTOS: 10 };
vi.mock("@/lib/config/env", () => ({
  env: () => ({ ...config, SUPABASE_PHOTOS_BUCKET: "listing-photos" }),
  features: { supabaseStorage: () => false },
}));

const requested: string[] = [];
let directStatus = 200;

vi.mock("@/lib/providers/http", () => ({
  assertPublicUrl: async (u: string) => new URL(u),
  fetchWithTimeout: async (url: string) => {
    requested.push(url);
    const viaScraper = url.startsWith("https://app.scrapingbee.com/");
    return viaScraper || directStatus === 200
      ? new Response(new Uint8Array(await jpeg()), { headers: { "content-type": "image/jpeg" } })
      : new Response("blocked", { status: directStatus });
  },
}));

async function jpeg(): Promise<Buffer> {
  return sharp({ create: { width: 64, height: 40, channels: 3, background: "#336699" } })
    .jpeg()
    .toBuffer();
}

const { getObject, hasObject, putObject, removePrefix, storageBackend, storeListingPhotos } = await import("../photos");

describe("photo storage without Supabase", () => {
  beforeEach(() => {
    objects.clear();
    photos.length = 0;
    requested.length = 0;
    directStatus = 200;
    config.SCRAPINGBEE_API_KEY = undefined;
    config.SCRAPER_MAX_PAID_PHOTOS = 10;
    vi.stubEnv("PHOTO_STORAGE", "db");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("keeps files in the database, so any server instance can serve them", async () => {
    expect(storageBackend()).toBe("db");
    await putObject("listings/a/1.jpg", new Uint8Array([1, 2, 3]), "image/jpeg");
    expect(await hasObject("listings/a/1.jpg")).toBe(true);
    expect([...(await getObject("listings/a/1.jpg"))!]).toEqual([1, 2, 3]);
    expect(await getObject("listings/a/missing.jpg")).toBeNull();
  });

  it("removes everything under a prefix and nothing else", async () => {
    await putObject("uploads/u1/a.jpg", new Uint8Array([1]), "image/jpeg");
    await putObject("uploads/u1/b.jpg", new Uint8Array([2]), "image/jpeg");
    await putObject("uploads/u10/c.jpg", new Uint8Array([3]), "image/jpeg");
    await removePrefix("uploads/u1");
    expect(await hasObject("uploads/u1/a.jpg")).toBe(false);
    expect(await hasObject("uploads/u1/b.jpg")).toBe(false);
    expect(await hasObject("uploads/u10/c.jpg")).toBe(true);
  });

  it("stores a listing's photos, then re-downloads the ones whose files went missing", async () => {
    const urls = ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg", "https://cdn.example/c.jpg"];
    expect(await storeListingPhotos("L1", urls, 24)).toEqual({ stored: 3, failed: 0 });
    expect(objects.size).toBe(3);

    // Simulate an earlier run whose files were lost with a wiped disk.
    objects.delete("listings/L1/2.jpg");
    objects.delete("listings/L1/3.jpg");
    expect(await storeListingPhotos("L1", urls, 24)).toEqual({ stored: 3, failed: 0 });
    expect(objects.size).toBe(3);
    expect(photos.filter((p) => p.listingId === "L1")).toHaveLength(3);
  });

  it("leaves demo photos alone and counts an unrecoverable upload as failed", async () => {
    photos.push({ id: "d1", listingId: "L2", position: 1, originalUrl: "/demo-photos/audi-a3/1", storagePath: null });
    photos.push({ id: "u1", listingId: "L2", position: 2, originalUrl: null, storagePath: "uploads/x/gone.jpg" });
    expect(await storeListingPhotos("L2", [], 24)).toEqual({ stored: 1, failed: 1 });
  });

  it("downloads directly for free, never touching the paid reader", async () => {
    config.SCRAPINGBEE_API_KEY = "key";
    const urls = Array.from({ length: 24 }, (_, i) => `https://cdn.example/${i}.jpg`);
    expect(await storeListingPhotos("L3", urls, 24)).toEqual({ stored: 24, failed: 0 });
    expect(requested.some((u) => u.includes("scrapingbee"))).toBe(false);
  });

  it("when the photo host blocks direct downloads, pays for at most the budget and skips the rest", async () => {
    config.SCRAPINGBEE_API_KEY = "key";
    config.SCRAPER_MAX_PAID_PHOTOS = 3;
    directStatus = 403;
    const urls = Array.from({ length: 8 }, (_, i) => `https://cdn.example/${i}.jpg`);
    expect(await storeListingPhotos("L4", urls, 24)).toEqual({ stored: 3, failed: 5 });
    expect(requested.filter((u) => u.includes("scrapingbee"))).toHaveLength(3);
    expect(photos.filter((p) => p.listingId === "L4")).toHaveLength(3);
  });

  it("never pays when the budget is 0 or no scraper key is set", async () => {
    directStatus = 403;
    const urls = ["https://cdn.example/a.jpg", "https://cdn.example/b.jpg"];
    expect(await storeListingPhotos("L5", urls, 24)).toEqual({ stored: 0, failed: 2 });
    config.SCRAPINGBEE_API_KEY = "key";
    config.SCRAPER_MAX_PAID_PHOTOS = 0;
    expect(await storeListingPhotos("L6", urls, 24)).toEqual({ stored: 0, failed: 2 });
    expect(requested.some((u) => u.includes("scrapingbee"))).toBe(false);
  });
});
