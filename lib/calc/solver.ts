/**
 * The max bid is circular (fees, tax and duty depend on the bid), so it is solved by search:
 * the largest B (multiple of `increment`, 0 ≤ B ≤ ceiling) with acquisition(B) ≤ budget.
 * acquisition must be non-decreasing in B, which makes binary search exact.
 * Returns null when even a $0 bid exceeds the budget.
 */
export function solveBid(
  budget: number,
  acquisition: (bid: number) => number,
  increment: number,
  ceiling: number,
): number | null {
  if (increment <= 0) throw new Error("Bid increment must be positive");
  if (acquisition(0) > budget) return null;
  let lo = 0;
  let hi = Math.max(0, Math.floor(ceiling / increment));
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (acquisition(mid * increment) <= budget) lo = mid;
    else hi = mid - 1;
  }
  return lo * increment;
}
