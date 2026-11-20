import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * BidPilot's own icons. Same drawing rules as the logo: a 24-unit grid, a 1.75 stroke, square
 * ends and mitred corners, and one orange detail (a needle, a speed line) in each. They take a
 * size from className just like the lucide icons they sit beside.
 */
type IconProps = React.SVGProps<SVGSVGElement>;

function Icon({ className, children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={cn("size-5 shrink-0", className)}
      {...props}
    >
      {children}
    </svg>
  );
}

const A = { stroke: "var(--primary)" } as const;

/** Dashboard: a gauge with its needle. */
export function CockpitIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 18a9 9 0 0 1 18 0" />
      <path d="M12 6.2V8M5.7 8.7l1.3 1.3M18.3 8.7 17 10" />
      <path d="M12 18l4.2-5.6" {...A} />
      <path d="M10.5 18h3" />
    </Icon>
  );
}

/** Compare: two columns of different height. */
export function CompareIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 10.5h6V20h-6zM14.5 4h6v16h-6z" />
      <path d="M10.5 15h3" {...A} />
    </Icon>
  );
}

export function CalcIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 3h14v18H5z" />
      <path d="M8 6.5h8v3H8z" {...A} />
      <path d="M8 13h2M14 13h2M8 17h2M14 17h2" />
    </Icon>
  );
}

/** Watchlist: a flag on a pole. */
export function PoleFlagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 21V3" />
      <path d="M5 4.5h13l-3 4 3 4H5" />
      <path d="M8.5 8.5h4" {...A} />
    </Icon>
  );
}

/** History: a clock running backwards. */
export function RewindIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 3.5V8H8" />
      <path d="M12 7.5V12l3 2" {...A} />
    </Icon>
  );
}

/** Deal journal: a ledger. */
export function LedgerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 3h14v18H5zM8.5 3v18" />
      <path d="M11.5 8h4" {...A} />
      <path d="M11.5 12h4M11.5 16h2" />
    </Icon>
  );
}

/** Settings: sliders. */
export function TrimIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 7h5M12 7h9M3 12h10M17 12h4M3 17h3M10 17h11" />
      <path d="M8 5v4M13 10v4" />
      <path d="M6 15v4" {...A} />
    </Icon>
  );
}

/** Billing: fuel and credits. */
export function FuelIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20V4h9v16M2.5 20h12" />
      <path d="M6.5 7.5h4" {...A} />
      <path d="M13 9h2.5a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3" />
    </Icon>
  );
}

export function ShieldBoltIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 4.5 6v6c0 4.4 3 7.6 7.5 9 4.5-1.4 7.5-4.6 7.5-9V6z" />
      <path d="m12.8 8.5-2.6 4h3.6l-2.6 4" {...A} />
    </Icon>
  );
}

/** A waving race flag on a pole; the verdict colours it green, yellow or red. */
export function RaceFlagIcon({ className, ...props }: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn("size-5 shrink-0", className)} {...props}>
      <path d="M5 3v18" stroke="currentColor" strokeWidth={2} strokeLinecap="square" />
      <path d="M6 4.5c3-1.8 5.2 1.6 8 0 1.7-.9 3.2-1 4.5-.6v8.2c-1.3-.4-2.8-.3-4.5.6-2.8 1.6-5-1.8-8 0z" fill="currentColor" />
    </svg>
  );
}

/** A VIN plate: seventeen stamped cells, the maker code in orange. */
export function PlateIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 7h19v10h-19z" />
      <path d="M5.5 10.5v3M8.5 10.5v3" {...A} />
      <path d="M12 10.5v3M15 10.5v3M18 10.5v3" />
    </Icon>
  );
}
