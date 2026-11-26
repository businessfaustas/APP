/**
 * The odometer the AI read off the photos, if it is believable. A misread digit or a "0" from a dark photo would move the
 * market value by thousands of dollars, so anything outside a plausible range is ignored.
 */
export function usableOdometer(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 100 && v <= 400_000 ? Math.round(v) : null;
}
