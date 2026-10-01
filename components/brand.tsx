import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 64 64" className="size-7 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx="14" className="fill-primary/15" />
        <path
          d="M8 36h12l5-14 8 26 6-18 4 6h13"
          fill="none"
          className="stroke-primary"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        AuctionPulse <span className="text-primary">AI</span>
      </span>
    </Link>
  );
}
