/** Minimal formatter used inside the pure engine (no Intl dependency differences). */
export function formatUsdPlain(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const s = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${amount < 0 ? "−" : ""}$${s}`;
}
