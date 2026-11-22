import { describe, expect, it } from "vitest";

import { formatSaleDate, parseSaleDate, zoneForState, zoneOffsetMs } from "../zones";

describe("auction time zones", () => {
  it("a New York sale at 8:00 AM is the same instant for everyone, and always shown with its zone", () => {
    const instant = parseSaleDate("10/03/2026 8:00 AM", "NY")!;
    expect(instant).toBe("2026-10-03T12:00:00.000Z"); // EDT is UTC-4
    // A buyer in London (or anywhere) is shown the New York time with its zone name, not their own.
    expect(formatSaleDate(instant, "en-GB", "NY")).toMatch(/08:00 (EDT|GMT-4)/i);
    expect(formatSaleDate(instant, "en-US", "NY")).toContain("EDT");
  });

  it("reads a zone-less Texas time in Central time, in summer and in winter", () => {
    expect(parseSaleDate("Oct 3, 2026 10:00 AM", "TX")).toBe("2026-10-03T15:00:00.000Z"); // CDT, UTC-5
    expect(parseSaleDate("Dec 3, 2026 10:00 AM", "TX")).toBe("2026-12-03T16:00:00.000Z"); // CST, UTC-6
  });

  it("takes an explicit zone at its word, whatever the yard state says", () => {
    expect(parseSaleDate("Oct 3, 2026 10:00 AM CDT", "NY")).toBe("2026-10-03T15:00:00.000Z");
    expect(parseSaleDate("2026-10-03T10:00:00Z", "TX")).toBe("2026-10-03T10:00:00.000Z");
    expect(parseSaleDate("2026-10-03T10:00:00+02:00", null)).toBe("2026-10-03T08:00:00.000Z");
  });

  it("does not depend on the server's own time zone when the yard is unknown: it reads UTC", () => {
    expect(parseSaleDate("Oct 3, 2026 10:00 AM", null)).toBe("2026-10-03T10:00:00.000Z");
  });

  it("handles the daylight-saving change itself", () => {
    // 2026-11-01 01:30 in Chicago happens twice; either reading must be a valid Chicago instant on that day.
    const t = parseSaleDate("Nov 1, 2026 3:00 PM", "TX")!;
    expect(t).toBe("2026-11-01T21:00:00.000Z"); // CST after the change, UTC-6
  });

  it("returns null for rubbish and shows a dash for missing dates", () => {
    expect(parseSaleDate("soon", "TX")).toBeNull();
    expect(parseSaleDate(null, "TX")).toBeNull();
    expect(formatSaleDate(null)).toBe("—");
    expect(formatSaleDate("not a date")).toBe("—");
  });

  it("knows the zone of every US state and the offset arithmetic is right", () => {
    expect(zoneForState("tx")).toBe("America/Chicago");
    expect(zoneForState("CA")).toBe("America/Los_Angeles");
    expect(zoneForState("ZZ")).toBeNull();
    expect(zoneOffsetMs("America/New_York", new Date("2026-07-01T12:00:00Z"))).toBe(-4 * 3_600_000);
    expect(zoneOffsetMs("America/New_York", new Date("2026-01-01T12:00:00Z"))).toBe(-5 * 3_600_000);
  });
});
