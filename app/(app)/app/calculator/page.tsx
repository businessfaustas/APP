import type { Metadata } from "next";

import { CalculatorClient } from "@/components/calculator/calculator-client";
import { PageContainer, PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { assumptionsFromSettings } from "@/lib/calc/build";
import { loadFeeSchedules, loadSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Calculator" };

export default async function CalculatorPage() {
  const user = await requireUser();
  const [{ snapshot }, copart, iaai] = await Promise.all([loadSettings(user.id), loadFeeSchedules("COPART"), loadFeeSchedules("IAAI")]);
  return (
    <PageContainer className="max-w-7xl">
      <PageHeader
        title="Max-bid calculator"
        description="Type your own numbers — no AI, no credits. Prefilled with the 2019 Audi A3 example so you can check the math."
      />
      <CalculatorClient defaults={assumptionsFromSettings(snapshot)} feeSchedules={{ COPART: copart, IAAI: iaai }} />
    </PageContainer>
  );
}
