import Link from "next/link";

import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#sample", label: "Sample report" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Logo />
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
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
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/app">Analyze a lot</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
            Estimates only — not an appraisal, insurance estimate or guarantee. Verify fees, title rules and vehicle condition before bidding. You are
            responsible for your bids. Not affiliated with Copart, IAAI or Bid.cars.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <div className="font-medium">Product</div>
          <ul className="text-muted-foreground space-y-1.5">
            <li>
              <Link className="hover:text-foreground" href="/#how-it-works">
                How it works
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/#sample">
                Sample report
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/pricing">
                Pricing
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/app/calculator">
                Bid calculator
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-2 text-sm">
          <div className="font-medium">Legal</div>
          <ul className="text-muted-foreground space-y-1.5">
            <li>
              <Link className="hover:text-foreground" href="/terms">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground" href="/privacy">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="text-muted-foreground border-t py-4 text-center text-xs">© {new Date().getFullYear()} AuctionPulse AI</div>
    </footer>
  );
}
