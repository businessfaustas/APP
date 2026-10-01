import type { Metadata } from "next";

import { PricingTable } from "@/components/marketing/pricing-table";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free with 3 reports a month. Pro and Business plans for active flippers, dealers and exporters.",
};

const NOTES = [
  { q: "What counts as a report?", a: "One lot analyzed end to end. Moving the what-if sliders, exporting a PDF or sharing a link doesn't use another report. Re-running a lot to pull fresh data does." },
  { q: "Do unused reports roll over?", a: "Every 30 days your balance is topped back up to your plan's allowance. If you already have more than that — for example from a top-up pack — you keep the higher balance." },
  { q: "What if an analysis fails?", a: "If we can't finish a report — the listing can't be read and you don't enter the details — the report is refunded automatically." },
  { q: "Can I cancel any time?", a: "Yes. Manage or cancel from Billing; your plan stays active until the end of the period you paid for." },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-16">
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
        <p className="text-lg text-muted-foreground">Pay for the reports you need. Every plan gets the full investor report.</p>
      </div>
      <PricingTable />
      <div className="mx-auto grid max-w-4xl gap-x-10 gap-y-6 sm:grid-cols-2">
        {NOTES.map((n) => (
          <div key={n.q}>
            <h2 className="font-medium">{n.q}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{n.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
