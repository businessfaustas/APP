"use client";

import {
  BookOpenIcon,
  CalculatorIcon,
  CoinsIcon,
  CreditCardIcon,
  EyeIcon,
  ArrowUpRightIcon,
  GaugeIcon,
  HistoryIcon,
  LayoutGridIcon,
  LogOutIcon,
  PlusIcon,
  SettingsIcon,
  ShieldIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
type NavItem = { href: string; key: NavKey; icon: typeof GaugeIcon; exact?: boolean };

const ITEMS: Record<NavKey, NavItem> = {
  dashboard: { href: "/app", key: "dashboard", icon: GaugeIcon, exact: true },
  compare: { href: "/app/compare", key: "compare", icon: LayoutGridIcon },
  calculator: { href: "/app/calculator", key: "calculator", icon: CalculatorIcon },
  watchlist: { href: "/app/watchlist", key: "watchlist", icon: EyeIcon },
  history: { href: "/app/history", key: "history", icon: HistoryIcon },
  journal: { href: "/app/journal", key: "journal", icon: BookOpenIcon },
  settings: { href: "/app/settings", key: "settings", icon: SettingsIcon },
  billing: { href: "/app/billing", key: "billing", icon: CreditCardIcon },
};

const GROUPS = [
  { label: null, items: [ITEMS.dashboard] },
  { label: "groupAnalyze", items: [ITEMS.compare, ITEMS.calculator] },
  { label: "groupTrack", items: [ITEMS.watchlist, ITEMS.history, ITEMS.journal] },
  { label: "groupAccount", items: [ITEMS.settings, ITEMS.billing] },
] as const;

const MOBILE_NAV = [ITEMS.dashboard, ITEMS.compare, ITEMS.watchlist, ITEMS.history, ITEMS.settings];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string | null, email: string): string {
  const source = (name ?? email).trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function NavLink({ item, active, label }: { item: NavItem; active: boolean; label: string }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group text-muted-foreground hover:bg-accent/60 hover:text-foreground relative flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors",
        active && "bg-lime text-lime-foreground hover:bg-lime hover:text-lime-foreground font-semibold shadow-[0_10px_24px_-14px_var(--lime)]",
      )}
    >
      <item.icon className={cn("size-[18px] shrink-0", !active && "opacity-80")} />
      {label}
    </Link>
  );
}

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="bg-sidebar sticky top-0 isolate hidden h-dvh flex-col overflow-hidden border-r md:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-[radial-gradient(120%_100%_at_0%_0%,color-mix(in_oklab,var(--color-primary)_16%,transparent),transparent_70%)]"
        />
        <div className="px-5 pt-5 pb-4">
          <Logo href="/app" className="text-lg" />
        </div>
        <div className="px-4 pb-2">
          <Button asChild className="w-full justify-start" size="default">
            <Link href="/app">
              <PlusIcon /> {t("nav.newAnalysis")}
            </Link>
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-3" aria-label={t("nav.main")}>
          {GROUPS.map((g, i) => (
            <div key={i} className="space-y-1">
              {g.label && <div className="eyebrow px-3 pb-1">{t(`nav.${g.label}`)}</div>}
              {g.items.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(pathname, item.href, item.exact)} label={t(`nav.${item.key}`)} />
              ))}
            </div>
          ))}
          {user.role === "ADMIN" && (
            <div className="space-y-1">
              <Link
                href="/admin"
                className={cn(
                  "text-muted-foreground hover:bg-accent/60 hover:text-foreground flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium",
                  pathname.startsWith("/admin") && "bg-accent text-accent-foreground",
                )}
              >
                <ShieldIcon className="size-[18px] opacity-80" />
                {t("nav.admin")}
              </Link>
            </div>
          )}
        </nav>
        <div className="space-y-3 border-t p-4">
          <Link
            href="/app/billing"
            className="bg-lime text-lime-foreground group flex items-center gap-3 rounded-2xl px-4 py-3 shadow-[0_14px_30px_-18px_var(--lime)] transition-[filter,transform] hover:brightness-105"
          >
            <span className="bg-lime-foreground/12 grid size-9 shrink-0 place-items-center rounded-full">
              <CoinsIcon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="num block text-base leading-tight font-bold">{t("common.creditsN", { n: user.creditsRemaining })}</span>
              <span className="block text-xs font-medium opacity-70">{t(`pricing.plans.${planId(user.plan)}.name`)}</span>
            </span>
            <ArrowUpRightIcon className="size-4 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="bg-secondary text-secondary-foreground grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold">
              {initials(user.name, user.email)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user.name ?? user.email}</div>
              <div className="flex items-center gap-1.5">
                {user.isDemo ? <Badge variant="info">{t("common.demo")}</Badge> : <span className="text-muted-foreground truncate text-xs">{user.email}</span>}
              </div>
            </div>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                aria-label={t("common.signOut")}
                title={t("common.signOut")}
                className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-9 cursor-pointer items-center justify-center rounded-lg"
              >
                <LogOutIcon className="size-4" />
              </button>
            </form>
          </div>
          <div className="flex items-center justify-between gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="bg-background/85 sticky top-0 z-30 flex items-center justify-between gap-2 border-b px-4 py-2.5 backdrop-blur md:hidden">
        <Logo href="/app" className="text-sm" />
        <div className="flex items-center gap-1">
          <Link href="/app/billing" className="num bg-muted rounded-full px-2.5 py-1 text-xs font-medium">
            {t("common.creditsN", { n: user.creditsRemaining })}
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <main className="min-w-0 pb-24 md:pb-10">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="pb-safe bg-background/95 fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t backdrop-blur md:hidden" aria-label={t("nav.main")}>
        {MOBILE_NAV.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("text-muted-foreground flex flex-col items-center gap-1 pt-2.5 pb-1 text-[11px] font-medium", active && "text-primary")}
            >
              <item.icon className="size-5" />
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function planId(plan: string): "FREE" | "PRO" | "BUSINESS" {
  return plan === "PRO" || plan === "BUSINESS" ? plan : "FREE";
}
