import Link from "next/link";

import { LOGO_ACCENT, LOGO_ACCENT_COLOR, LOGO_ASPECT, LOGO_EMBLEM, LOGO_EMBLEM_COLOR, LOGO_VIEWBOX, LOGO_WORDMARK } from "@/components/brand-art";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The logo artwork. It is sized by its height (1.4 × the surrounding font size unless a
 * `h-*` class says otherwise); the letters take the text colour, so it reads on light and dark
 * backgrounds alike. The tile and its flag keep their own colours (indigo and white).
 */
export function LogoArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      role="img"
      aria-label={BRAND_NAME}
      className={cn("h-[1.4em] w-auto shrink-0", className)}
      style={{ aspectRatio: LOGO_ASPECT }}
      fill="currentColor"
    >
      <path d={LOGO_EMBLEM} fill={LOGO_EMBLEM_COLOR} />
      <path d={LOGO_ACCENT} fill={LOGO_ACCENT_COLOR} />
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
