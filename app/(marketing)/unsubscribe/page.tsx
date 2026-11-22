import type { Metadata } from "next";

import { UnsubscribeForm } from "@/components/marketing/unsubscribe-form";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("unsubscribe.title"), robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

/** The link in every optional email lands here; confirming posts the signed token to /api/unsubscribe. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const sp = await searchParams;
  const t = await getT();
  return (
    <main className="mx-auto max-w-md px-4 py-20">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">{t("unsubscribe.title")}</h1>
      <UnsubscribeForm token={sp.t ?? null} />
    </main>
  );
}
