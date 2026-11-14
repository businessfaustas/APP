import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="rise text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-8 sm:py-10", className)}>{children}</div>;
}

export function EmptyState({ icon, title, children }: { icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="relative isolate flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed px-6 py-16 text-center">
      <div aria-hidden="true" className="grid-lines absolute inset-0 -z-10 [mask-image:radial-gradient(50%_60%_at_50%_40%,black,transparent)]" />
      {icon && (
        <div className="bg-primary/12 text-primary mb-2 grid size-14 place-items-center rounded-2xl shadow-[0_0_0_8px_color-mix(in_oklab,var(--color-primary)_6%,transparent)] [&_svg]:size-6">
          {icon}
        </div>
      )}
      <div className="text-lg font-semibold tracking-tight">{title}</div>
      {children && <div className="text-muted-foreground max-w-md text-sm">{children}</div>}
    </div>
  );
}
