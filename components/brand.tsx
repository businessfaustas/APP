import Link from "next/link";

import { brandParts } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("from-primary to-brand-2 grid size-8 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br shadow-sm", className)}
      aria-hidden="true"
    >
      {/* a navigation arrow: the pilot pointing the way */}
      <svg viewBox="0 0 64 64" className="size-5">
        <path d="M13 30 L52 12 L35 52 L29 35 Z" fill="white" stroke="white" strokeWidth="5" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  const [first, second] = brandParts();
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span>
        {first}
        {second && <span className="text-primary">{second}</span>}
      </span>
    </Link>
  );
}
