import Link from "next/link";

import { Logo } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export async function SiteHeader() {
  const t = await getT();
  const nav = [
    { href: "/#how-it-works", label: t("site.howItWorks") },
    { href: "/#sample", label: t("site.sampleReport") },
    { href: "/pricing", label: t("site.pricing") },
    { href: "/#faq", label: t("site.faq") },
  ];
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <Logo className="text-lg sm:text-2xl" />
        <nav aria-label={t("nav.main")} className="ml-4 hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md px-3 py-1.5 text-sm transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <LanguageSwitcher />
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">{t("common.signIn")}</Link>
          </Button>
          <Button asChild size="sm" className="px-3 sm:px-4">
            <Link href="/app">{t("common.analyzeLot")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const t = await getT();
  const product = [
    { href: "/#how-it-works", label: t("site.howItWorks") },
    { href: "/#sample", label: t("site.sampleReport") },
    { href: "/pricing", label: t("site.pricing") },
    { href: "/app/calculator", label: t("site.bidCalculator") },
  ];
  const legal = [
    { href: "/terms", label: t("site.terms") },
    { href: "/privacy", label: t("site.privacy") },
  ];
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">{t("site.footerNote")}</p>
        </div>
        {[
          { title: t("site.product"), links: product },
          { title: t("site.legal"), links: legal },
        ].map((col) => (
          <div key={col.title} className="space-y-2 text-sm">
            <div className="font-medium">{col.title}</div>
            <ul className="text-muted-foreground space-y-1.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link className="hover:text-foreground" href={l.href}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="text-muted-foreground border-t py-4 text-center text-xs">© {new Date().getFullYear()} FlagBid</div>
    </footer>
  );
}
