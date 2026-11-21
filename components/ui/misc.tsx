"use client";

import {
  Checkbox as CheckboxPrimitive,
  Progress as ProgressPrimitive,
  Separator as SeparatorPrimitive,
  ToggleGroup as ToggleGroupPrimitive,
  Tooltip as TooltipPrimitive,
} from "radix-ui";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export function Separator({ className, orientation = "horizontal", decorative = true, ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

export function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root className={cn("bg-muted relative h-2 w-full overflow-hidden rounded-full", className)} value={value} {...props}>
      <ProgressPrimitive.Indicator
        className="bg-brand h-full w-full flex-1 rounded-full transition-all duration-500"
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer border-input focus-visible:ring-ring/50 dark:bg-input/30 data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-foreground dark:data-[state=checked]:bg-brand size-4 shrink-0 rounded-[4px] border shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={4}
          className="bg-foreground text-background animate-in fade-in-0 zoom-in-95 z-50 max-w-xs rounded-md px-3 py-1.5 text-xs text-balance"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onValueChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  ariaLabel: string;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      aria-label={ariaLabel}
      onValueChange={(v) => {
        if (v) onValueChange(v as T);
      }}
      className={cn("bg-muted inline-flex w-full rounded-full p-1", className)}
    >
      {options.map((o) => (
        <ToggleGroupPrimitive.Item
          key={o.value}
          value={o.value}
          className="text-muted-foreground focus-visible:ring-ring/50 data-[state=on]:bg-card data-[state=on]:text-foreground dark:data-[state=on]:bg-surface-2 hover:text-foreground flex-1 cursor-pointer rounded-full px-2 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none data-[state=on]:shadow-sm"
        >
          {o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("bg-muted animate-pulse rounded-md", className)} {...props} />;
}

export function Alert({ className, variant = "default", ...props }: React.ComponentProps<"div"> & { variant?: "default" | "caution" | "stop" | "go" }) {
  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:top-3.5 [&>svg]:left-4 [&>svg]:size-4 [&>svg~*]:pl-7",
        variant === "caution" && "border-caution/40 bg-caution-soft/60 text-foreground [&>svg]:text-caution",
        variant === "stop" && "border-stop/40 bg-stop-soft/60 text-foreground [&>svg]:text-stop",
        variant === "go" && "border-go/40 bg-go-soft/60 text-foreground [&>svg]:text-go",
        className,
      )}
      {...props}
    />
  );
}

/** A section that opens and closes (native <details>, so it works without JavaScript and keeps its content in the page). */
export function Disclosure({
  title,
  meta,
  defaultOpen = false,
  className,
  children,
  testId,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <details open={defaultOpen} className={cn("group", className)} data-testid={testId}>
      <summary className="hover:text-foreground flex cursor-pointer list-none items-center gap-2 py-2 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-open:rotate-90" aria-hidden="true" />
        <span className="flex-1">{title}</span>
        {meta && <span className="text-muted-foreground text-xs font-normal">{meta}</span>}
      </summary>
      <div className="pt-2 pb-1">{children}</div>
    </details>
  );
}

/** Label over a big number, with an optional line under it. */
export function Stat({
  label,
  value,
  sub,
  tone,
  className,
  testId,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "go" | "stop" | "caution";
  className?: string;
  testId?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="eyebrow">{label}</div>
      <div
        className={cn(
          "num mt-1.5 text-2xl font-semibold tracking-tight",
          tone === "go" && "text-go",
          tone === "stop" && "text-stop",
          tone === "caution" && "text-caution",
        )}
        data-testid={testId}
      >
        {value}
      </div>
      {sub && <div className="text-muted-foreground mt-0.5 text-xs">{sub}</div>}
    </div>
  );
}
