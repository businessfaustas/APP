import Link from "next/link";

import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("from-primary to-brand-2 grid size-8 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br shadow-sm", className)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" className="size-5">
        <path d="M6 36h12l5-14 8 26 6-18 4 6h17" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span>
        AuctionPulse <span className="text-primary">AI</span>
      </span>
    </Link>
  );
}
