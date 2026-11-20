import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/** Tags are small slanted plates in the display face, like a timing-board label. */
const badgeVariants = cva(
  "slant font-display inline-flex w-fit shrink-0 items-center justify-center gap-1 px-2.5 py-[3px] text-[0.8rem] leading-none font-semibold tracking-[0.07em] whitespace-nowrap uppercase [--slant-skew:-14deg] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "text-primary-foreground [--slant-bg:var(--primary)]",
        secondary: "text-secondary-foreground [--slant-bg:var(--secondary)]",
        outline: "text-muted-foreground [--slant-line:var(--input)]",
        go: "text-go [--slant-bg:var(--go-soft)]",
        caution: "text-caution [--slant-bg:var(--caution-soft)]",
        stop: "text-stop [--slant-bg:var(--stop-soft)]",
        info: "text-accent-foreground [--slant-bg:var(--accent)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
