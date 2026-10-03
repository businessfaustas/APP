import { describe, expect, it } from "vitest";

import { decideVerdict } from "@/lib/calc/verdict";
import { DEMO_FIXTURES } from "@/lib/demo/fixtures";
import { runDemoFixtureOffline } from "@/lib/demo/offline";
import { buildChecklist } from "@/lib/flags/checklist";
import { localizedSummary, trPart, trText } from "@/lib/i18n/generated";
import { resolveLocale } from "@/lib/i18n/locales";
import { getMessages } from "@/lib/i18n/messages";
import { createTranslator, interpolate, pluralForm } from "@/lib/i18n/translate";
import { placeholderFeeSchedule } from "@/lib/calc/placeholderFees";
import { auctionFees } from "@/lib/calc/fees";

const en = createTranslator("en", getMessages("en"));
const lt = createTranslator("lt", getMessages("lt"), getMessages("en"));
const NOW = new Date("2026-03-02T12:00:00Z");

function leaves(obj: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (o: unknown, p: string) => {
    if (typeof o === "string") out.set(p, o);
    else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walk(v, p ? `${p}.${k}` : k);
  };
  walk(obj, prefix);
  return out;
}

const placeholders = (s: string) => [...new Set([...s.matchAll(/\{(\w+)(?::[^{}]*)?\}/g)].map((m) => m[1]))].sort();

describe("dictionaries", () => {
  const enLeaves = leaves(getMessages("en"));
  const ltLeaves = leaves(getMessages("lt"));

  it("have the same keys in both languages", () => {
    expect([...ltLeaves.keys()].sort()).toEqual([...enLeaves.keys()].sort());
  });

  it("use the same placeholders in both languages", () => {
    const mismatched = [...enLeaves].filter(([k, v]) => placeholders(v).join() !== placeholders(ltLeaves.get(k) ?? "").join()).map(([k]) => k);
    expect(mismatched).toEqual([]);
  });

  it("leave nothing empty in Lithuanian that English fills", () => {
    const empty = [...enLeaves].filter(([k, v]) => v.trim() && !ltLeaves.get(k)?.trim()).map(([k]) => k);
    expect(empty).toEqual([]);
  });
});

describe("translator", () => {
  it("picks Lithuanian plural forms", () => {
    expect([1, 2, 9, 10, 11, 12, 19, 21, 22, 30, 101, 111].map((n) => pluralForm("lt", n))).toEqual([
      "one",
      "few",
      "few",
      "many",
      "many",
      "many",
      "many",
      "one",
      "few",
      "many",
      "one",
      "many",
    ]);
    expect(interpolate("{n} {n:atšaukimas|atšaukimai|atšaukimų}", { n: 3 }, "lt")).toBe("3 atšaukimai");
    expect(interpolate("{n} {n:recall|recalls|recalls}", { n: 1 }, "en")).toBe("1 recall");
  });

  it("falls back to English for missing keys and to the key itself", () => {
    expect(lt("nav.dashboard")).toBe("Pradžia");
    expect(lt.dyn("domain.damage.SOMETHING_NEW", undefined, "Something new")).toBe("Something new");
  });

  it("resolves the language from the cookie, then the browser", () => {
    expect(resolveLocale("lt", "en-US")).toBe("lt");
    expect(resolveLocale(undefined, "lt-LT,lt;q=0.9")).toBe("lt");
    expect(resolveLocale(undefined, "de-DE")).toBe("en");
    expect(resolveLocale("xx", undefined)).toBe("en");
  });
});

describe("generated analysis text", () => {
  /** Every English sentence the engine produced for the demo lots, minus what the AI wrote about photos. */
  function engineText() {
    const out: { kind: string; text: string }[] = [];
    for (const fx of DEMO_FIXTURES) {
      const { assembled, calc, listing } = runDemoFixtureOffline(fx.id, NOW);
      for (const f of assembled.flags) {
        if (f.source === "VISION" && !getMessages("en").gen.flags[f.code as keyof ReturnType<typeof getMessages>["gen"]["flags"]]) continue;
        out.push({ kind: `flag ${f.code}`, text: f.title });
        const enDefault = en.dyn(`gen.flags.${f.code}.detail`);
        // Details the AI wrote (frame evidence, airbag lists) stay as written.
        if (!(f.source === "VISION" && f.detail !== enDefault)) out.push({ kind: `flag ${f.code} detail`, text: f.detail });
      }
      for (const r of calc.verdictReasons) out.push({ kind: "reason", text: r });
      for (const c of assembled.checklist) out.push({ kind: "checklist", text: c });
      for (const n of fx.market.notes) out.push({ kind: "market note", text: n });
      for (const l of fx.repair.lineItems) if (l.partKey) out.push({ kind: "part", text: l.partName });
      for (const w of calc.waterfall) out.push({ kind: "waterfall", text: w.label });
      void listing;
    }
    return out;
  }

  it("translates every engine sentence for the demo lots", () => {
    const missed = engineText().filter(({ text, kind }) => (kind === "part" ? trPart(lt, text) : trText(lt, text)) === text);
    expect(missed).toEqual([]);
  });

  it("leaves English untouched", () => {
    for (const { text } of engineText()) expect(trText(en, text)).toBe(text);
  });

  it("re-renders values inside templates", () => {
    expect(trText(lt, "No undercarriage, engine bay photos — hidden damage can't be ruled out.")).toBe(
      "Nėra dugno, variklio skyriaus nuotraukų — paslėptų pažeidimų atmesti negalima.",
    );
    expect(trText(lt, "3 recalls for this model year")).toBe("3 atšaukimai šiems modelio metams");
    expect(trText(lt, "1 recall for this model year")).toBe("1 atšaukimas šiems modelio metams");
    expect(trText(lt, "Check TX's rebuilt-title inspection rules before buying.")).toContain("TX valstijos");
    expect(trPart(lt, "Headlamp assembly LH")).toBe("Priekinis žibintas (kairė)");
    expect(trPart(lt, "Headlamp assembly LH (LED)")).toBe("Priekinis žibintas (kairė, LED)");
    expect(trPart(lt, "Seat belt pretensioner (driver)")).toBe("Saugos diržo įtempiklis (vairuotojo)");
    expect(trText(lt, "Something the AI wrote")).toBe("Something the AI wrote");
  });

  it("covers every verdict reason and checklist line", () => {
    const high = (code: string) => ({ code, level: "HIGH" as const, title: code });
    const calm = { severity: 2, frameSuspected: false, floodSuspected: false, airbagsDeployed: false, overallConfidence: 0.9, flags: [] };
    const base = {
      maxBid: 3000,
      currentBid: 2000,
      headroomBps: 3300,
      signals: calm,
      worstProfitAtMaxBid: 100,
      worstTotalCostAtMaxBid: 10000,
      expectedProfitAtMaxBid: 2500,
      expectedRoiAtMaxBidBps: 2551,
    };
    const go = decideVerdict(base);
    const goNoRoi = decideVerdict({ ...base, expectedRoiAtMaxBidBps: null });
    const caution = decideVerdict({
      ...base,
      currentBid: 2900,
      headroomBps: 345,
      signals: { ...calm, severity: 8, frameSuspected: true, floodSuspected: true, overallConfidence: 0.3, flags: [high("X"), high("Y")] },
      worstProfitAtMaxBid: -4000,
    });
    const walk = decideVerdict({ ...base, currentBid: 3500 });
    const none = decideVerdict({ ...base, maxBid: null });
    const reasons = [...caution.reasons, ...go.reasons, ...goNoRoi.reasons, ...walk.reasons, ...none.reasons];
    expect(reasons.length).toBeGreaterThan(10);
    expect(reasons.filter((r) => trText(lt, r) === r)).toEqual([]);

    const { fx } = runDemoFixtureOffline("audi-a3", NOW);
    const allFlags = [
      "FRAME_DAMAGE_SUSPECTED",
      "FLOOD_SUSPECTED",
      "EV_HV_BATTERY_RISK",
      "AIRBAGS_DEPLOYED",
      "ADAS_CALIBRATION_LIKELY",
      "KEYS_MISSING",
      "DOES_NOT_START",
      "SALE_ON_APPROVAL",
      "OPEN_RECALLS",
      "FEE_TABLE_PLACEHOLDER",
      "TITLE_PARTS_ONLY",
    ].map((code) => ({ code, level: "MEDIUM" as const, title: code, detail: code, source: "SYSTEM" as const }));
    const damage = { ...fx.damage, photo_coverage: { ...fx.damage.photo_coverage, missing_critical_angles: ["undercarriage", "engine_bay", "interior"] } };
    const lines = [
      ...buildChecklist({ flags: allFlags, damage, listing: { ...fx.listing(NOW), titleCategory: "SALVAGE", titleState: "TX", hasKeys: null } }),
      ...buildChecklist({ flags: [], damage, listing: { ...fx.listing(NOW), titleCategory: "FLOOD", titleState: null, hasKeys: null } }),
    ];
    expect(lines.filter((l) => trText(lt, l) === l)).toEqual([]);
  });

  it("translates fee lines", () => {
    const fees = auctionFees(placeholderFeeSchedule("COPART", "LICENSED_DEALER"), 3100);
    expect(fees.lines.filter((l) => trText(lt, l.label) === l.label)).toEqual([]);
  });

  it("writes the summary in Lithuanian from the stored numbers", () => {
    const { assembled, calc, listing } = runDemoFixtureOffline("audi-a3", NOW);
    const bullets = localizedSummary(lt, { calc, currentBid: listing.currentBid, flags: assembled.flags, checklist: assembled.checklist });
    expect(bullets[0]).toBe("Verdiktas: PIRKTI — nestatykite daugiau nei $3,100 (dabartinis statymas $2,100).");
    expect(bullets.join(" ")).not.toMatch(/\{\w+\}/);
    const enBullets = localizedSummary(en, { calc, currentBid: listing.currentBid, flags: assembled.flags, checklist: assembled.checklist });
    expect(enBullets[0]).toMatch(/^Verdict: GO — do not bid above \$3,100/);
  });
});
