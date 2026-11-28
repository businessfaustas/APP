import type { Metadata } from "next";

import { PageContainer, PageHeader } from "@/components/page-header";
import { SetupForm } from "@/components/setup/setup-form";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { countryName, EXPORT_COUNTRIES, isExportCountry, normalizeCountry } from "@/lib/geo/countries";
import { getT } from "@/lib/i18n/server";
import { suggestedResale } from "@/lib/setup/derive";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("setup.title") };
}

export default async function SetupPage() {
  const user = await requireUser();
  const t = await getT();
  const [row, profiles, account] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId: user.id }, select: { homeZip: true } }),
    prisma.exportProfile.findMany({ select: { countryCode: true } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { country: true } }),
  ]);
  const have = new Set(profiles.map((p) => p.countryCode));
  const exportCountries = EXPORT_COUNTRIES.filter((c) => have.has(c)).map((code) => ({ code, name: countryName(code, t.locale) }));
  const country = normalizeCountry(account?.country);
  const guess = suggestedResale(country);
  return (
    <PageContainer className="max-w-2xl">
      <PageHeader title={t("setup.title")} description={t("setup.intro")} />
      <SetupForm
        exportCountries={exportCountries}
        suggested={guess !== null && (guess === "US" || have.has(guess)) ? guess : null}
        countryName={country ? countryName(country, t.locale) : null}
        unsupportedCountry={country !== null && country !== "US" && !isExportCountry(country)}
        initialZip={row?.homeZip && row.homeZip !== "77002" ? row.homeZip : ""}
      />
    </PageContainer>
  );
}
