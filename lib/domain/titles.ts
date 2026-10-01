import type { OdometerBrand, RunCondition, SaleStatus, TitleCategory } from "./schemas";

/**
 * Maps raw auction title strings to a category. Returns null when unknown so the
 * pipeline can ask the cheap LLM to classify it.
 */
export function normalizeTitle(raw: string | null | undefined): TitleCategory | null {
  if (!raw) return null;
  const s = raw.toUpperCase();
  if (/(CERT(IFICATE)?\s*OF\s*DESTRUCTION|NON[\s-]?REPAIRABLE|NONREPAIRABLE|JUNK|DISMANTLE|SCRAP|CRUSH)/.test(s)) return "NON_REPAIRABLE";
  if (/PARTS\s*ONLY/.test(s)) return "PARTS_ONLY";
  if (/(FLOOD|WATER\s*DAMAGE)/.test(s)) return "FLOOD";
  if (/(REBUILT|RECONSTRUCTED|REBUILDABLE\s*RESTORED|PRIOR\s*SALVAGE)/.test(s)) return "REBUILT";
  if (/(SALVAGE|\bSV\b|\bSLV\b|TOTAL\s*LOSS|CERT\s*OF\s*TITLE-SALVAGE)/.test(s)) return "SALVAGE";
  if (/(CLEAN|CERTIFICATE\s*OF\s*TITLE|\bCT\b|\bTITLE\b$)/.test(s)) return "CLEAN";
  if (/(BILL\s*OF\s*SALE|MV-?907|LIEN|EXPORT\s*ONLY|THEFT)/.test(s)) return "OTHER";
  return null;
}

export function normalizeRunCondition(raw: string | null | undefined): RunCondition {
  if (!raw) return "UNKNOWN";
  const s = raw.toUpperCase();
  if (/(WON'?T\s*START|DOES\s*NOT\s*START|NON[\s-]?RUNNER|STATIONARY|NOT\s*RUN)/.test(s)) return "WONT_START";
  if (/(RUN\s*(AND|&)\s*DRIVE|RUNS\s*(AND|&)\s*DRIVES|RUN\s*&\s*DRIVE)/.test(s)) return "RUNS_AND_DRIVES";
  if (/(ENGINE\s*START|STARTS|ENHANCED)/.test(s)) return "STARTS";
  return "UNKNOWN";
}

export function normalizeOdometerBrand(raw: string | null | undefined): OdometerBrand {
  if (!raw) return "UNKNOWN";
  const s = raw.toUpperCase();
  if (/NOT\s*ACTUAL|TMU|TRUE\s*MILEAGE\s*UNKNOWN/.test(s)) return "NOT_ACTUAL";
  if (/EXCEED/.test(s)) return "EXCEEDS_MECHANICAL_LIMITS";
  if (/EXEMPT/.test(s)) return "EXEMPT";
  if (/ACTUAL/.test(s)) return "ACTUAL";
  return "UNKNOWN";
}

export function normalizeSaleStatus(raw: string | null | undefined): SaleStatus {
  if (!raw) return "UNKNOWN";
  const s = raw.toUpperCase();
  if (/ON\s*APPROVAL|SELLER\s*APPROVAL|RESERVE/.test(s)) return "ON_APPROVAL";
  if (/MINIMUM\s*BID|MIN\s*BID/.test(s)) return "MINIMUM_BID";
  if (/PURE\s*SALE|NO\s*RESERVE/.test(s)) return "PURE_SALE";
  if (/BUY\s*(IT\s*)?NOW/.test(s)) return "BUY_NOW";
  return "UNKNOWN";
}

export const TITLE_LABELS: Record<TitleCategory, string> = {
  CLEAN: "Clean title",
  SALVAGE: "Salvage title",
  REBUILT: "Rebuilt title",
  NON_REPAIRABLE: "Non-repairable",
  PARTS_ONLY: "Parts only",
  FLOOD: "Flood title",
  OTHER: "Other title",
  UNKNOWN: "Title unknown",
};

export const RUN_LABELS: Record<RunCondition, string> = {
  RUNS_AND_DRIVES: "Runs & drives",
  STARTS: "Starts",
  WONT_START: "Won't start",
  UNKNOWN: "Run status unknown",
};

/** Parses money strings like "$12,345", "12345 USD" → 12345 (whole dollars). */
export function parseMoney(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw
    .replace(/(\d)[\s,](?=\d{3}\b)/g, "$1")
    .replace(/,/g, "")
    .match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Math.round(Number(m[1]));
  return Number.isFinite(n) ? n : null;
}

/** Parses odometer strings like "61,200 mi (Actual)" → 61200. */
export function parseOdometer(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.replace(/(\d)[\s,.](?=\d{3}\b)/g, "$1").match(/(\d{1,7})/);
  return m ? Number(m[1]) : null;
}
