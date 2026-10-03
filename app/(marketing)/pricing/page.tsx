import type { Metadata } from "next";

import { PricingTable } from "@/components/marketing/pricing-table";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("pricing.title"), description: t("pricing.subtitle") };
}

const NOTES = ["n1", "n2", "n3", "n4"] as const;

export default async function PricingPage() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-16">
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">{t("pricing.title")}</h1>
        <p className="text-muted-foreground text-lg">{t("pricing.subtitle")}</p>
      </div>
      <PricingTable />
      <div className="mx-auto grid max-w-4xl gap-x-10 gap-y-6 sm:grid-cols-2">
        {NOTES.map((n) => (
          <div key={n}>
            <h2 className="font-medium">{t(`pricing.${n}q`)}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{t(`pricing.${n}a`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
