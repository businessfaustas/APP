export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">Last updated {updated}</p>
      <div className="border-caution/30 bg-caution-soft text-caution mt-4 rounded-md border px-3 py-2 text-sm">
        Template text — have it reviewed by a lawyer for your jurisdiction before launch.
      </div>
      <div className="text-muted-foreground [&_h2]:text-foreground mt-8 space-y-4 text-sm leading-relaxed [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
