import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Buttons are slanted plates (see .slant in globals.css) set in the condensed display face.
 * The default is ink: black on paper, bone on asphalt, turning signal orange on hover.
 */
const buttonVariants = cva(
  "font-display inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 text-[0.95rem] leading-none font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-colors outline-none active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "slant text-background hover:text-primary-foreground [--slant-bg:var(--foreground)] hover:[--slant-bg:var(--primary)]",
        destructive: "slant text-white [--slant-bg:var(--destructive)] hover:[--slant-bg:color-mix(in_oklab,var(--destructive)_82%,black)]",
        outline:
          "slant text-foreground [--slant-line:var(--input)] hover:text-primary hover:[--slant-bg:color-mix(in_oklab,var(--primary)_8%,transparent)] hover:[--slant-line:var(--primary)]",
        secondary: "slant text-secondary-foreground [--slant-bg:var(--secondary)] hover:[--slant-line:var(--input)]",
        ghost: "rounded-[3px] hover:bg-accent hover:text-accent-foreground",
        link: "text-primary font-sans text-sm tracking-normal normal-case underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-5 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-4 text-[0.85rem] has-[>svg]:px-3.5",
        lg: "h-11 px-7 text-base has-[>svg]:px-5",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
