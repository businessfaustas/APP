import { getT } from "@/lib/i18n/server";

export async function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  const t = await getT();
  return (
    <article className="mx-auto max-w-3xl px-4 py-16" lang="en">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{t("legal.lastUpdated", { date: updated })}</p>
      <div className="border-caution/30 bg-caution-soft text-caution mt-4 space-y-1 rounded-md border px-3 py-2 text-sm">
        <p>{t("legal.templateNote")}</p>
        {t("legal.englishOnly") && <p lang={t.locale}>{t("legal.englishOnly")}</p>}
      </div>
      <div className="text-muted-foreground [&_h2]:text-foreground mt-8 space-y-4 text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
