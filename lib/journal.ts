/** Deal-journal P&L math (pure, isomorphic). */

export interface JournalNumbers {
  estimatedRepair: number | null;
  estimatedProfit: number | null;
  purchasePrice: number | null;
  auctionFeesActual: number | null;
  transportActual: number | null;
  partsActual: number | null;
  laborActual: number | null;
  otherCostsActual: number | null;
  salePrice: number | null;
}

export interface DealPnl {
  actualRepair: number | null;
  totalCost: number;
  profit: number | null;
  roiBps: number | null;
  repairErrorBps: number | null;
  sold: boolean;
}

export function dealPnl(e: JournalNumbers): DealPnl {
  const n = (v: number | null) => v ?? 0;
  const actualRepair = e.partsActual !== null || e.laborActual !== null ? n(e.partsActual) + n(e.laborActual) : null;
  const totalCost = n(e.purchasePrice) + n(e.auctionFeesActual) + n(e.transportActual) + n(e.partsActual) + n(e.laborActual) + n(e.otherCostsActual);
  const sold = e.salePrice !== null && e.salePrice > 0;
  const profit = sold ? e.salePrice! - totalCost : null;
  const roiBps = profit !== null && totalCost > 0 ? Math.round((profit / totalCost) * 10000) : null;
  const repairErrorBps =
    actualRepair !== null && e.estimatedRepair !== null && e.estimatedRepair > 0
      ? Math.round(((actualRepair - e.estimatedRepair) / e.estimatedRepair) * 10000)
      : null;
  return { actualRepair, totalCost, profit, roiBps, repairErrorBps, sold };
}

export interface JournalSummary {
  deals: number;
  sold: number;
  totalProfit: number;
  avgRoiBps: number | null;
  /** median absolute repair-estimate error */
  medianRepairErrorBps: number | null;
  /** positive = repairs cost more than estimated on average */
  avgRepairBiasBps: number | null;
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : Math.round((s[m - 1]! + s[m]!) / 2);
}

export function journalSummary(entries: JournalNumbers[]): JournalSummary {
  const pnls = entries.map(dealPnl);
  const sold = pnls.filter((p) => p.sold);
  const rois = sold.map((p) => p.roiBps).filter((x): x is number => x !== null);
  const errs = pnls.map((p) => p.repairErrorBps).filter((x): x is number => x !== null);
  return {
    deals: entries.length,
    sold: sold.length,
    totalProfit: sold.reduce((a, p) => a + (p.profit ?? 0), 0),
    avgRoiBps: rois.length ? Math.round(rois.reduce((a, b) => a + b, 0) / rois.length) : null,
    medianRepairErrorBps: median(errs.map(Math.abs)),
    avgRepairBiasBps: errs.length ? Math.round(errs.reduce((a, b) => a + b, 0) / errs.length) : null,
  };
}
