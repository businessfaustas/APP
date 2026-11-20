"use client";

import { LogOutIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand";
import { CalcIcon, CockpitIcon, CompareIcon, FuelIcon, LedgerIcon, PoleFlagIcon, RewindIcon, ShieldBoltIcon, TrimIcon } from "@/components/icons";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/billing/plans";
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
type NavItem = { href: string; key: NavKey; icon: typeof CockpitIcon; exact?: boolean };

const ITEMS: Record<NavKey, NavItem> = {
  dashboard: { href: "/app", key: "dashboard", icon: CockpitIcon, exact: true },
  compare: { href: "/app/compare", key: "compare", icon: CompareIcon },
  calculator: { href: "/app/calculator", key: "calculator", icon: CalcIcon },
  watchlist: { href: "/app/watchlist", key: "watchlist", icon: PoleFlagIcon },
  history: { href: "/app/history", key: "history", icon: RewindIcon },
  journal: { href: "/app/journal", key: "journal", icon: LedgerIcon },
  settings: { href: "/app/settings", key: "settings", icon: TrimIcon },
  billing: { href: "/app/billing", key: "billing", icon: FuelIcon },
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
        "group text-muted-foreground hover:bg-accent/60 hover:text-foreground font-display relative flex items-center gap-3 rounded-[3px] px-3 py-2 text-[1.02rem] font-semibold tracking-[0.05em] uppercase transition-colors",
        active && "bg-accent/70 text-foreground",
      )}
    >
      {/* the notch: a skewed orange bar on the left edge of the page you are on */}
      <span
        aria-hidden="true"
        className={cn(
          "bg-primary absolute top-1.5 bottom-1.5 left-0 w-[3px] scale-y-0 skew-x-[-12deg] transition-transform duration-200",
          active && "scale-y-100",
        )}
      />
      <item.icon className={cn("size-[19px] shrink-0 transition-opacity", active ? "opacity-100" : "opacity-75 group-hover:opacity-100")} />
      {label}
    </Link>
  );
}

/** The credit balance as a fuel gauge: twelve cells, filled in proportion to the plan's monthly allowance. */
function FuelGauge({ credits, allowance }: { credits: number; allowance: number }) {
  const cells = 12;
  const full = Math.max(0, Math.min(cells, Math.round((credits / Math.max(allowance, credits, 1)) * cells)));
  const low = credits > 0 && full <= 2;
  return (
    <div className="flex gap-[3px]" aria-hidden="true">
      {Array.from({ length: cells }, (_, i) => (
        <span key={i} className={cn("h-3 flex-1 skew-x-[-18deg] rounded-[1px]", i < full ? (low ? "bg-stop" : "bg-primary") : "bg-foreground/12")} />
      ))}
    </div>
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
          className="hatch pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 [mask-image:linear-gradient(to_bottom,black,transparent)]"
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
                  "text-muted-foreground hover:bg-accent/60 hover:text-foreground font-display flex items-center gap-3 rounded-[3px] px-3 py-2 text-[1.02rem] font-semibold tracking-[0.05em] uppercase",
                  pathname.startsWith("/admin") && "bg-accent text-accent-foreground",
                )}
              >
                <ShieldBoltIcon className="size-[19px] opacity-75" />
                {t("nav.admin")}
              </Link>
            </div>
          )}
        </nav>
        <div className="space-y-3 border-t p-4">
          <Link href="/app/billing" className="surface bg-card hover:border-primary/50 block space-y-2.5 rounded-[4px] border px-3.5 py-3 transition-colors">
            <span className="flex items-baseline justify-between gap-2">
              <span className="eyebrow">{t("billing.creditsLeft")}</span>
              <span className="font-display text-muted-foreground text-[0.8rem] font-semibold tracking-[0.1em] uppercase">
                {t(`pricing.plans.${planId(user.plan)}.name`)}
              </span>
            </span>
            <span className="display num block text-[1.9rem] leading-none">{user.creditsRemaining}</span>
            <FuelGauge credits={user.creditsRemaining} allowance={PLANS[planId(user.plan)].monthlyCredits} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="bg-secondary text-secondary-foreground font-display grid size-9 shrink-0 skew-x-[-8deg] place-items-center rounded-[3px] text-[0.95rem] font-bold tracking-wide">
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
                className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-9 cursor-pointer items-center justify-center rounded-[3px]"
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
          <Link
            href="/app/billing"
            className="num font-display bg-muted rounded-[3px] px-2.5 py-1 text-[0.85rem] font-semibold tracking-wide whitespace-nowrap"
          >
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
              className={cn(
                "text-muted-foreground font-display flex flex-col items-center gap-1 pt-2.5 pb-1 text-[0.72rem] font-semibold tracking-[0.04em] uppercase",
                active && "text-primary",
              )}
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
