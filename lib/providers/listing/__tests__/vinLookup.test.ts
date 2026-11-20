import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  decode: vi.fn(),
  research: vi.fn(),
  structured: vi.fn(),
  ai: { on: true },
}));
vi.mock("../../vin/nhtsa", () => ({ nhtsaDecode: mocks.decode }));
vi.mock("@/lib/ai/client", () => ({ generateWebResearch: mocks.research, generateStructured: mocks.structured }));
vi.mock("@/lib/config/env", () => ({ features: { ai: () => mocks.ai.on } }));

const { lookupByVin } = await import("../vinLookup");

const VIN = "WBS43AZ00R0000001";
const decoded = {
  year: 2025,
  make: "BMW",
  model: "M4",
  trim: "Competition",
  engine: "3.0L 6-cyl Turbo",
  driveType: "RWD",
  fuelType: "Gasoline",
  transmission: "Automatic",
};
const found = {
  found: true,
  vinOnPage: true,
  source: "BIDCARS",
  sourceUrl: "https://bid.cars/en/lot/0-46363981/2025-BMW-M4",
  lotNumber: "0-46363981",
  status: "UPCOMING",
  saleDate: "2026-11-25T15:00:00Z",
  odometer: 4200,
  titleRaw: "Salvage",
  primaryDamage: "Front end",
  secondaryDamage: null,
  runCondition: "Run and drive",
  hasKeys: true,
  currentBid: 11000,
  city: "Chicago South",
  state: "il",
  color: "Red",
  photoUrls: ["https://img.example.com/1.jpg", "http://insecure.example.com/2.jpg"],
};

describe("lookupByVin", () => {
  beforeEach(() => {
    for (const m of [mocks.decode, mocks.research, mocks.structured]) m.mockReset();
    mocks.ai.on = true;
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("decodes who the car is even without AI, and finds no lot", async () => {
    mocks.ai.on = false;
    mocks.decode.mockResolvedValue(decoded);
    const r = await lookupByVin(VIN, "a1");
    expect(r.identity).toMatchObject({ vin: VIN, year: 2025, make: "BMW", model: "M4", trim: "Competition", engine: "3.0L 6-cyl Turbo" });
    expect(r.found).toBeNull();
    expect(mocks.research).not.toHaveBeenCalled();
  });

  it("copes with the decode being down", async () => {
    mocks.ai.on = false;
    mocks.decode.mockRejectedValue(new Error("HTTP 503"));
    expect(await lookupByVin(VIN, "a1")).toEqual({ identity: null, found: null });
  });

  it("turns a lot found on the web into listing fields, keeping only https photos", async () => {
    mocks.decode.mockResolvedValue(decoded);
    mocks.research.mockResolvedValue({ text: "lot page notes", searches: 2, sources: [] });
    mocks.structured.mockResolvedValue(found);
    const r = await lookupByVin(VIN, "a1");
    expect(r.found?.raw).toMatchObject({
      source: "BIDCARS",
      lotNumber: "0-46363981",
      odometer: 4200,
      primaryDamage: "Front end",
      currentBid: 11000,
      location: { city: "Chicago South", state: "IL" },
      photoUrls: ["https://img.example.com/1.jpg"],
    });
    expect(r.found?.warnings[0]).toContain("Check the details against the lot page");
  });

  it("warns that a finished sale may be an earlier one", async () => {
    mocks.decode.mockResolvedValue(decoded);
    mocks.research.mockResolvedValue({ text: "notes", searches: 1, sources: [] });
    mocks.structured.mockResolvedValue({ ...found, status: "SOLD", saleDate: "2025-02-01T00:00:00Z" });
    const r = await lookupByVin(VIN, "a1");
    expect(r.found?.warnings[0]).toContain("may be an earlier sale");
    expect(r.found?.raw.saleDate).toBeNull();
  });

  it("ignores a lot that doesn't show this VIN or says nothing about damage or photos", async () => {
    mocks.decode.mockResolvedValue(decoded);
    mocks.research.mockResolvedValue({ text: "notes", searches: 1, sources: [] });
    mocks.structured.mockResolvedValueOnce({ ...found, vinOnPage: false });
    expect((await lookupByVin(VIN, "a1")).found).toBeNull();
    mocks.structured.mockResolvedValueOnce({ ...found, primaryDamage: null, photoUrls: [] });
    expect((await lookupByVin(VIN, "a1")).found).toBeNull();
    mocks.structured.mockResolvedValueOnce({ ...found, found: false });
    expect((await lookupByVin(VIN, "a1")).found).toBeNull();
  });

  it("keeps the decoded identity when the web search fails", async () => {
    mocks.decode.mockResolvedValue(decoded);
    mocks.research.mockRejectedValue(new Error("web search is not enabled"));
    const r = await lookupByVin(VIN, "a1");
    expect(r.identity?.make).toBe("BMW");
    expect(r.found).toBeNull();
  });
});
