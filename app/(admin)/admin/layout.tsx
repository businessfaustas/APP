import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/fees", label: "Fee tables" },
  { href: "/admin/references", label: "Parts & labor" },
  { href: "/admin/export-profiles", label: "Export profiles" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role, plan: user.plan, creditsRemaining: user.creditsRemaining, isDemo: user.isDemo }}>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-center gap-1 border-b pb-3">
          <span className="mr-3 font-semibold">Admin</span>
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} className="text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-1.5 text-sm">
              {t.label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </AppShell>
  );
}
