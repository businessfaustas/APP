const VIN_CHARS = /^[A-HJ-NPR-Z0-9]{17}$/;

const TRANSLITERATION: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** Uppercases and strips spaces/dashes. */
export function normalizeVin(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, "");
}

export function isVinFormat(vin: string): boolean {
  return VIN_CHARS.test(vin);
}

/** Expected North-American check digit (position 9) for a 17-char VIN. */
export function computeCheckDigit(vin: string): string {
  let total = 0;
  for (let i = 0; i < 17; i++) {
    const ch = vin[i]!;
    const value = /\d/.test(ch) ? Number(ch) : (TRANSLITERATION[ch] ?? 0);
    total += value * WEIGHTS[i]!;
  }
  const r = total % 11;
  return r === 10 ? "X" : String(r);
}

/**
 * True when position 9 matches the computed check digit. Non North-American VINs may not
 * use a check digit, so callers treat a failure as a warning, not an error.
 */
export function isCheckDigitValid(vin: string): boolean {
  if (!isVinFormat(vin)) return false;
  return vin[8] === computeCheckDigit(vin);
}

/** Returns the VIN with a correct check digit (used to build synthetic demo VINs). */
export function withCheckDigit(vin: string): string {
  const v = normalizeVin(vin);
  return v.slice(0, 8) + computeCheckDigit(v) + v.slice(9);
}

/** Model-year code at position 10 (1980–2039 cycle; ambiguous across 30-year cycles). */
export function modelYearCandidates(vin: string): number[] {
  const codes = "ABCDEFGHJKLMNPRSTVWXY123456789";
  const idx = codes.indexOf(vin[9] ?? "");
  if (idx < 0) return [];
  return [1980 + idx, 2010 + idx].filter((y) => y <= new Date().getFullYear() + 1);
}
