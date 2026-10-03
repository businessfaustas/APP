"use client";

import {
  BookOpenIcon,
  CalculatorIcon,
  CreditCardIcon,
  EyeIcon,
  GaugeIcon,
  HistoryIcon,
  LayoutGridIcon,
  LogOutIcon,
  SettingsIcon,
  ShieldIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export interface ShellUser {
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  plan: string;
  creditsRemaining: number;
  isDemo: boolean;
}

type NavKey = "dashboard" | "compare" | "calculator" | "watchlist" | "history" | "journal" | "settings" | "billing";

const NAV: { href: string; key: NavKey; icon: typeof GaugeIcon; exact?: boolean }[] = [
  { href: "/app", key: "dashboard", icon: GaugeIcon, exact: true },
  { href: "/app/compare", key: "compare", icon: LayoutGridIcon },
  { href: "/app/calculator", key: "calculator", icon: CalculatorIcon },
  { href: "/app/watchlist", key: "watchlist", icon: EyeIcon },
  { href: "/app/history", key: "history", icon: HistoryIcon },
  { href: "/app/journal", key: "journal", icon: BookOpenIcon },
  { href: "/app/settings", key: "settings", icon: SettingsIcon },
  { href: "/app/billing", key: "billing", icon: CreditCardIcon },
];

const MOBILE_NAV = [NAV[0]!, NAV[1]!, NAV[3]!, NAV[4]!, NAV[6]!];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      {/* Desktop sidebar */}
      <aside className="bg-card/40 sticky top-0 hidden h-dvh flex-col border-r md:flex">
        <div className="px-4 py-4">
          <Logo href="/app" />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2" aria-label={t("nav.main")}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(pathname, item.href, item.exact) && "bg-accent text-accent-foreground font-medium",
              )}
            >
              <item.icon className="size-4" />
              {t(`nav.${item.key}`)}
            </Link>
          ))}
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className={cn(
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground mt-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                pathname.startsWith("/admin") && "bg-accent text-accent-foreground font-medium",
              )}
            >
              <ShieldIcon className="size-4" />
              {t("nav.admin")}
            </Link>
          )}
        </nav>
        <div className="space-y-3 border-t p-3">
          <LanguageSwitcher className="w-full justify-center [&>button]:flex-1" />
          <Link href="/app/billing" className="bg-muted flex items-center justify-between rounded-md px-3 py-2 text-xs">
            <span className="text-muted-foreground">{t("common.credits")}</span>
            <span className="num font-semibold">{user.creditsRemaining}</span>
          </Link>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user.name ?? user.email}</div>
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                {user.plan}
                {user.isDemo && <Badge variant="info">{t("common.demo")}</Badge>}
              </div>
            </div>
            <div className="flex items-center">
              <ThemeToggle />
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  aria-label={t("common.signOut")}
                  className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md"
                >
                  <LogOutIcon className="size-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="bg-background/90 sticky top-0 z-30 flex items-center justify-between border-b px-4 py-2.5 backdrop-blur md:hidden">
        <Logo href="/app" className="text-sm" />
        <div className="flex items-center gap-1">
          <Link href="/app/billing" className="num bg-muted rounded-md px-2 py-1 text-xs font-medium">
            {t("common.creditsN", { n: user.creditsRemaining })}
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="min-w-0 pb-24 md:pb-10">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="pb-safe bg-background/95 fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t backdrop-blur md:hidden" aria-label={t("nav.main")}>
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "text-muted-foreground flex flex-col items-center gap-0.5 pt-2 pb-1 text-[11px]",
              isActive(pathname, item.href, item.exact) && "text-primary",
            )}
          >
            <item.icon className="size-5" />
            {t(`nav.${item.key}`)}
          </Link>
        ))}
      </nav>
    </div>
  );
}
