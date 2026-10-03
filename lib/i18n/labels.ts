/** Labels for domain values (titles, damage, run condition) in the current language. */
import type { RunCondition, TitleCategory } from "@/lib/domain/schemas";
import type { ParsedInput } from "@/lib/input/parseInput";

import type { Translator } from "./translate";

export const titleLabel = (t: Translator, c: TitleCategory) => t(`domain.title.${c}`);
export const runLabel = (t: Translator, r: RunCondition) => t(`domain.run.${r}`);

/** "FRONT END" → "Front end" / "Priekis"; unknown auction wording is shown as-is. */
export function damageLabel(t: Translator, raw: string | null | undefined): string {
  if (!raw) return t("domain.damage.UNKNOWN");
  const key = raw
    .toUpperCase()
    .replace(/&/g, " ")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return t.dyn(`domain.damage.${key}`, undefined, raw.charAt(0) + raw.slice(1).toLowerCase());
}

/** "in 2d 4h" / "po 2 d. 4 val." — mirrors `formatCountdown`. */
export function countdownLabel(t: Translator, target: Date | string | null | undefined, now: Date = new Date()): string {
  if (!target) return "—";
  const ms = new Date(target).getTime() - now.getTime();
  if (ms <= 0) return t("report.saleEnded");
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return t("report.inDaysHours", { d, h });
  if (h > 0) return t("report.inHoursMinutes", { h, m });
  return t("report.inMinutes", { m });
}

export const keysLabel = (t: Translator, hasKeys: boolean | null) => t(`domain.keys.${hasKeys === null ? "unknown" : hasKeys ? "yes" : "no"}`);

/** What the input box recognised, in the active language (mirrors `parseInput` labels). */
export function parsedLabel(t: Translator, p: ParsedInput, raw: string): string {
  switch (p.type) {
    case "URL": {
      if (p.source === "OTHER") {
        let host = "";
        try {
          host = new URL(p.url).host;
        } catch {
          host = p.url;
        }
        return p.lotNumber ? t("parse.lotOnWithLot", { host, lot: p.lotNumber }) : t("parse.lotOn", { host });
      }
      return t("parse.lotDetected", { site: t(`domain.source.${p.source}`), lot: p.lotNumber ?? t("parse.unknownLot") });
    }
    case "VIN":
      return t("parse.vin", { vin: p.vin });
    case "TEXT":
      return p.vin ? t("parse.textVin", { vin: p.vin }) : t("parse.text");
    default:
      return raw.trim() ? t("parse.invalid") : t("parse.empty");
  }
}

export function parsedWarnings(t: Translator, p: ParsedInput): string[] {
  return p.warnings.map((w) => (w.startsWith("Couldn't find a lot") ? t("parse.noLot") : w.startsWith("The VIN check digit") ? t("parse.vinCheck") : w));
}

export const demoLotLabel = (t: Translator, lot: { id: string; label: string; description: string }) => ({
  label: t.dyn(`demoLots.${lot.id}.label`, undefined, lot.label),
  description: t.dyn(`demoLots.${lot.id}.description`, undefined, lot.description),
});
