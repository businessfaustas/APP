"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-5", className)} {...props} />;
}

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "text-muted-foreground inline-flex h-11 w-full [scrollbar-width:none] items-stretch justify-start gap-7 overflow-x-auto border-b",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "focus-visible:ring-ring/50 hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:bg-primary font-display relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 px-0.5 text-[1.02rem] font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-colors after:absolute after:inset-x-[-4px] after:-bottom-px after:h-[3px] after:skew-x-[-30deg] after:bg-transparent after:transition-colors focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:opacity-70 data-[state=active]:[&_svg]:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none", className)} {...props} />;
}
