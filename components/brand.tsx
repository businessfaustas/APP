import Link from "next/link";

import { LOGO_ASPECT, LOGO_VIEWBOX, LOGO_WORDMARK } from "@/components/brand-art";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The logo artwork. It is sized by its height (1.4 × the surrounding font size unless a
 * `h-*` class says otherwise). The letters are drawn in `--logo` (mint on dark, a deeper green on
 * light), so the wordmark reads on both themes.
 */
export function LogoArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      role="img"
      aria-label={BRAND_NAME}
      className={cn("h-[1.4em] w-auto shrink-0", className)}
      style={{ aspectRatio: LOGO_ASPECT, fill: "var(--logo, currentColor)" }}
    >
      <path d={LOGO_WORDMARK} fillRule="evenodd" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center", className)}>
      <LogoArt />
    </Link>
  );
}
