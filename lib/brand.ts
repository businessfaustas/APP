/**
 * The product's name, in one place.
 *
 * Text that can't import this (the README, legal pages, the browser extension, docs) is kept in
 * step by `node scripts/rename-brand.mjs <OldName> <NewName>`.
 */
export const BRAND_NAME = "BidPilot";

/**
 * Splits a CamelCase name where the second word starts: "BidPilot" → ["Bid", "Pilot"]. The logo
 * colours the second part. A name without such a boundary comes back whole, with an empty tail.
 */
export function brandParts(name: string = BRAND_NAME): [string, string] {
  const at = name.search(/(?<=[a-z0-9])[A-Z]/);
  return at > 0 ? [name.slice(0, at), name.slice(at)] : [name, ""];
}
