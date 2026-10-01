import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Logo } from "@/components/brand";
import { SharedReport } from "@/components/report/report-view";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getAnalysisView } from "@/lib/analysis/view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const view = await getAnalysisView("", { shareToken: token });
  const l = view?.listing;
  return {
    title: l ? `${[l.year, l.make, l.model].filter(Boolean).join(" ")} — deal report` : "Shared report",
    robots: { index: false, follow: false },
  };
}

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{10,64}$/.test(token)) notFound();
  const view = await getAnalysisView("", { shareToken: token });
  if (!view || view.status !== "COMPLETED") notFound();
  return (
    <div className="min-h-dvh">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm">
            <Link href="/app">Analyze your own lot</Link>
          </Button>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <p className="bg-muted text-muted-foreground mb-4 rounded-md px-3 py-2 text-xs">
          Shared read-only report. You can move the What-if sliders, but nothing is saved. Auction photos are not included in shared reports.
        </p>
        <SharedReport view={view} />
      </div>
    </div>
  );
}
