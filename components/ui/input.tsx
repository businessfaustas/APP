import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input placeholder:text-muted-foreground bg-card/60 flex h-10 w-full min-w-0 rounded-[3px] border px-3 py-1 text-base transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-[0.95rem]",
        "focus-visible:border-primary focus-visible:shadow-[inset_0_-2px_0_var(--primary)]",
        "aria-invalid:border-destructive aria-invalid:shadow-[inset_0_-2px_0_var(--destructive)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-primary bg-card/60 flex min-h-24 w-full rounded-[3px] border px-3 py-2 text-base outline-none focus-visible:shadow-[inset_0_-2px_0_var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 md:text-[0.95rem]",
        className,
      )}
      {...props}
    />
  );
}
