import type { Metadata } from "next";

import { CalculatorClient } from "@/components/calculator/calculator-client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { assumptionsFromSettings } from "@/lib/calc/build";
import { getT } from "@/lib/i18n/server";
import { loadFeeSchedules, loadSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("calc.title") };
}

export default async function CalculatorPage() {
  const user = await requireUser();
  const t = await getT();
  const [{ snapshot }, copart, iaai] = await Promise.all([loadSettings(user.id), loadFeeSchedules("COPART"), loadFeeSchedules("IAAI")]);
  return (
    <PageContainer className="max-w-7xl">
      <PageHeader title={t("calc.title")} description={t("calc.body")} />
      <CalculatorClient defaults={assumptionsFromSettings(snapshot)} feeSchedules={{ COPART: copart, IAAI: iaai }} />
    </PageContainer>
  );
}
