"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer focus-visible:ring-ring/50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80 inline-flex h-5 w-10 shrink-0 skew-x-[-12deg] items-center rounded-[3px] border border-transparent px-0.5 transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="bg-background pointer-events-none block h-3.5 w-4 rounded-[2px] ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%+0.25rem)] data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}
