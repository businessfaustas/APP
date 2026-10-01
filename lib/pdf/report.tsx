import "server-only";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { AnalysisView } from "@/lib/analysis/view";
import { linePrice } from "@/lib/calc/repair";
import type { Assumptions } from "@/lib/calc/build";
import type { CalculationResult } from "@/lib/calc/types";

// Built-in Helvetica only supports WinAnsi, so use ASCII minus signs.
function usd(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}$${s}`;
}
function pct(bps: number | null | undefined): string {
  return bps === null || bps === undefined ? "-" : `${(bps / 100).toFixed(1)}%`;
}

const c = { ink: "#111827", muted: "#6b7280", line: "#e5e7eb", go: "#047857", caution: "#b45309", stop: "#b91c1c", accent: "#1d4ed8" };

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: c.ink },
  h1: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  h2: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6 },
  muted: { color: c.muted },
  row: { flexDirection: "row" },
  card: { borderWidth: 1, borderColor: c.line, borderRadius: 6, padding: 10, marginTop: 10 },
  big: { fontSize: 26, fontFamily: "Helvetica-Bold" },
  th: { fontFamily: "Helvetica-Bold", color: c.muted, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: c.line },
  td: { paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: c.line },
  right: { textAlign: "right" },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 7, color: c.muted },
});

const VERDICT = { GO: { label: "GO", color: c.go }, BE_CAUTIOUS: { label: "BE CAUTIOUS", color: c.caution }, WALK_AWAY: { label: "WALK AWAY", color: c.stop } } as const;

export function ReportPdf({ view, calc, assumptions }: { view: AnalysisView; calc: CalculationResult; assumptions: Assumptions }) {
  const l = view.listing!;
  const v = VERDICT[calc.verdict];
  const title = [l.year, l.make, l.model, l.trim].filter(Boolean).join(" ");
  const sc = calc.scenarios;
  const lines = (view.overrides.lineItems ?? view.repair?.lineItems ?? []).filter((x) => x.included);
  const costRows: [string, (k: "best" | "expected" | "worst") => number | null][] = [
    ["Resale value", (k) => sc[k].resale],
    ["Bid + fees + taxes", (k) => (sc[k].totalCostAtMaxBid !== null ? -(sc[k].totalCostAtMaxBid! - sc[k].nonAcquisitionCosts) : null)],
    ["Repairs (incl. contingency)", (k) => -sc[k].repair],
    ["Transport / logistics", (k) => -sc[k].logistics],
    ["Title, inspection & storage", (k) => -sc[k].admin],
    ["Holding", (k) => -sc[k].holding],
    ["Selling costs", (k) => -sc[k].selling],
    ["Net profit", (k) => sc[k].profitAtMaxBid],
  ];
  return (
    <Document title={`${title} — AuctionPulse report`} author="AuctionPulse AI">
      <Page size="LETTER" style={s.page}>
        <Text style={s.muted}>
          {l.source} {l.lotNumber ? `lot ${l.lotNumber}` : ""} {l.vin ? `- VIN ${l.vin}` : ""}
        </Text>
        <Text style={s.h1}>{title || "Vehicle"}</Text>
        <Text style={s.muted}>
          {[l.odometer !== null ? `${l.odometer.toLocaleString("en-US")} ${l.odometerUnit}` : null, l.titleRaw ?? l.titleCategory, l.primaryDamage, l.location.yardName]
            .filter(Boolean)
            .join("  |  ")}
        </Text>

        <View style={[s.card, s.row, { justifyContent: "space-between" }]}>
          <View>
            <Text style={{ color: v.color, fontFamily: "Helvetica-Bold", fontSize: 14 }}>{v.label}</Text>
            <Text style={[s.muted, { marginTop: 6 }]}>Do not bid above</Text>
            <Text style={s.big}>{calc.maxBid !== null ? usd(calc.maxBid) : "No profitable bid"}</Text>
            <Text style={s.muted}>
              Comfort {usd(calc.comfortBid)} | Break-even {usd(calc.breakEvenBid)} | Current {usd(assumptions.currentBidOverride ?? view.base?.currentBid ?? null)}
            </Text>
          </View>
          <View style={{ width: 200 }}>
            <Text style={s.muted}>Expected profit at max bid</Text>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold" }}>{usd(sc.expected.profitAtMaxBid)}</Text>
            <Text style={s.muted}>
              ROI {pct(sc.expected.roiAtMaxBidBps)} | worst {usd(sc.worst.profitAtMaxBid)} | best {usd(sc.best.profitAtMaxBid)}
            </Text>
            <Text style={[s.muted, { marginTop: 6 }]}>Deal score {calc.dealScore}/100</Text>
            {calc.verdictReasons.slice(0, 3).map((r) => (
              <Text key={r}>- {r.replace(/−/g, "-")}</Text>
            ))}
          </View>
        </View>

        <Text style={s.h2}>Scenarios at the max bid</Text>
        <View style={s.row}>
          <Text style={[s.th, { width: "40%" }]} />
          <Text style={[s.th, s.right, { width: "20%" }]}>Best</Text>
          <Text style={[s.th, s.right, { width: "20%" }]}>Expected</Text>
          <Text style={[s.th, s.right, { width: "20%" }]}>Worst</Text>
        </View>
        {costRows.map(([label, fn]) => (
          <View key={label} style={s.row}>
            <Text style={[s.td, { width: "40%" }]}>{label}</Text>
            {(["best", "expected", "worst"] as const).map((k) => (
              <Text key={k} style={[s.td, s.right, { width: "20%" }]}>
                {usd(fn(k))}
              </Text>
            ))}
          </View>
        ))}

        <Text style={s.h2}>Repair estimate (expected case)</Text>
        <View style={s.row}>
          <Text style={[s.th, { width: "46%" }]}>Part / service</Text>
          <Text style={[s.th, { width: "14%" }]}>Action</Text>
          <Text style={[s.th, s.right, { width: "14%" }]}>Price</Text>
          <Text style={[s.th, s.right, { width: "13%" }]}>Body h</Text>
          <Text style={[s.th, s.right, { width: "13%" }]}>Paint h</Text>
        </View>
        {lines.map((x) => (
          <View key={x.id} style={s.row} wrap={false}>
            <Text style={[s.td, { width: "46%" }]}>
              {x.partName}
              {x.origin === "HIDDEN_LIKELY" ? ` (likely hidden, ${Math.round(x.probability * 100)}%)` : ""}
            </Text>
            <Text style={[s.td, { width: "14%" }]}>{x.kind === "SUBLET" ? "sublet" : x.action.toLowerCase()}</Text>
            <Text style={[s.td, s.right, { width: "14%" }]}>{usd(linePrice(x, "expected", assumptions.partsSourcePreference))}</Text>
            <Text style={[s.td, s.right, { width: "13%" }]}>{x.bodyHours.mid}</Text>
            <Text style={[s.td, s.right, { width: "13%" }]}>{x.paintHours.mid}</Text>
          </View>
        ))}
        <Text style={[s.muted, { marginTop: 4 }]}>
          Total repair: best {usd(sc.best.repair)} | expected {usd(sc.expected.repair)} | worst {usd(sc.worst.repair)}. Labor ${assumptions.laborRate}/h.
        </Text>

        <Text style={s.h2}>Risk flags</Text>
        {view.flags.map((f) => (
          <Text key={f.code} style={{ marginBottom: 2 }}>
            [{f.level}] {f.title} - <Text style={s.muted}>{f.detail}</Text>
          </Text>
        ))}

        <Text style={s.h2}>Before you bid</Text>
        {view.checklist.map((item) => (
          <Text key={item}>- {item}</Text>
        ))}

        <Text style={s.footer} fixed>
          Estimates only - not an appraisal, insurance estimate or guarantee. Verify fees, title rules and vehicle condition before bidding. Generated by
          AuctionPulse AI on {new Date().toISOString().slice(0, 10)}.
        </Text>
      </Page>
    </Document>
  );
}
