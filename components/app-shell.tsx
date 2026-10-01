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
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ShellUser {
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  plan: string;
  creditsRemaining: number;
  isDemo: boolean;
}

const NAV = [
  { href: "/app", label: "Dashboard", icon: GaugeIcon, exact: true },
  { href: "/app/compare", label: "Compare", icon: LayoutGridIcon },
  { href: "/app/calculator", label: "Calculator", icon: CalculatorIcon },
  { href: "/app/watchlist", label: "Watchlist", icon: EyeIcon },
  { href: "/app/history", label: "History", icon: HistoryIcon },
  { href: "/app/journal", label: "Deal journal", icon: BookOpenIcon },
  { href: "/app/settings", label: "Settings", icon: SettingsIcon },
  { href: "/app/billing", label: "Billing", icon: CreditCardIcon },
];

const MOBILE_NAV = [NAV[0]!, NAV[1]!, NAV[3]!, NAV[4]!, NAV[6]!];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-card/40 md:flex">
        <div className="px-4 py-4">
          <Logo href="/app" />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive(pathname, item.href, item.exact) && "bg-accent font-medium text-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          {user.role === "ADMIN" && (
            <Link
              href="/admin"
              className={cn(
                "mt-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                pathname.startsWith("/admin") && "bg-accent font-medium text-accent-foreground",
              )}
            >
              <ShieldIcon className="size-4" />
              Admin
            </Link>
          )}
        </nav>
        <div className="space-y-3 border-t p-3">
          <Link href="/app/billing" className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs">
            <span className="text-muted-foreground">Credits</span>
            <span className="num font-semibold">{user.creditsRemaining}</span>
          </Link>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user.name ?? user.email}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {user.plan}
                {user.isDemo && <Badge variant="info">Demo</Badge>}
              </div>
            </div>
            <div className="flex items-center">
              <ThemeToggle />
              <form action="/api/auth/logout" method="post">
                <button type="submit" aria-label="Sign out" className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                  <LogOutIcon className="size-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-2.5 backdrop-blur md:hidden">
        <Logo href="/app" className="text-sm" />
        <div className="flex items-center gap-1">
          <Link href="/app/billing" className="num rounded-md bg-muted px-2 py-1 text-xs font-medium">
            {user.creditsRemaining} credits
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="min-w-0 pb-24 md:pb-10">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 backdrop-blur md:hidden" aria-label="Main">
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] text-muted-foreground",
              isActive(pathname, item.href, item.exact) && "text-primary",
            )}
          >
            <item.icon className="size-5" />
            {item.label === "Deal journal" ? "Journal" : item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
