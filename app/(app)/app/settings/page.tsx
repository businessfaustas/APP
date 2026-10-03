import type { Metadata } from "next";

import { PageContainer, PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { requireUser } from "@/lib/auth/session";
import { integrationStatus } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n/server";
import { loadSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("settings.title") };
}

export default async function SettingsPage() {
  const user = await requireUser();
  const t = await getT();
  const [{ row }, profiles, account] = await Promise.all([
    loadSettings(user.id),
    prisma.exportProfile.findMany({ select: { id: true, name: true, isPlaceholder: true }, orderBy: { name: "asc" } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { apiTokenHash: true } }),
  ]);
  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title={t("settings.title")} description={t("settings.body")} />
      <SettingsForm
        initial={{
          homeZip: row.homeZip,
          currency: row.currency,
          buyerType: row.buyerType,
          laborRate: row.laborRate,
          paintMaterialsPerHour: row.paintMaterialsPerHour,
          partsSourcePreference: row.partsSourcePreference,
          partsDiscountBps: row.partsDiscountBps,
          rebuiltFactorBps: row.rebuiltFactorBps,
          listToSaleBps: row.listToSaleBps,
          targetProfitBps: row.targetProfitBps,
          targetProfitMin: row.targetProfitMin,
          transportCentsPerMile: row.transportCentsPerMile,
          transportMin: row.transportMin,
          titleRegInspection: row.titleRegInspection,
          storageDays: row.storageDays,
          storagePerDay: row.storagePerDay,
          holdingCostPerDay: row.holdingCostPerDay,
          holdingDaysExpected: row.holdingDaysExpected,
          sellingCostBps: row.sellingCostBps,
          sellingCostFixed: row.sellingCostFixed,
          salesTaxBps: row.salesTaxBps,
          brokerFee: row.brokerFee,
          contingencyOverrideBps: row.contingencyOverrideBps,
          exitStrategy: row.exitStrategy,
          exportProfileId: row.exportProfileId,
          vatRecoverable: row.vatRecoverable,
        }}
        exportProfiles={profiles}
        integrations={integrationStatus()}
        hasToken={Boolean(account?.apiTokenHash)}
      />
    </PageContainer>
  );
}
