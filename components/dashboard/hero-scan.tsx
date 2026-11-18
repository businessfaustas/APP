"use client";

import { CircleDollarSignIcon, ScanSearchIcon, WrenchIcon } from "lucide-react";

import { CarArt, CarVisual } from "@/components/vehicle/car-art";
import { useT } from "@/lib/i18n/client";

const CHIPS = [
  { key: "chipDamage", Icon: ScanSearchIcon, pos: "top-[4%] left-[2%]", delay: "0s" },
  { key: "chipRepair", Icon: WrenchIcon, pos: "top-[30%] right-0", delay: "0.8s" },
  { key: "chipBid", Icon: CircleDollarSignIcon, pos: "bottom-[2%] left-[22%]", delay: "1.6s" },
] as const;

/**
 * The dashboard hero's motion piece: a car being scanned, with what the analysis produces.
 * Shows the latest analyzed lot's own auction photo when there is one, else the illustration.
 */
export function HeroScan({ photo, label }: { photo?: string | null; label?: string }) {
  const t = useT();
  return (
    <div className="relative hidden aspect-[16/9] w-full lg:block" aria-hidden={photo ? undefined : "true"}>
      {photo ? (
        <CarVisual photo={photo} label={label} scanning className="absolute inset-0 rounded-2xl border" />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <CarArt
            body="sedan"
            tone="neutral"
            scanning
            zones={[
              { zone: "front_left", severity: 7 },
              { zone: "front", severity: 5 },
            ]}
          />
        </div>
      )}
      {CHIPS.map((c, i) => (
        <div key={c.key} aria-hidden="true" className={`rise absolute ${c.pos}`} style={{ ["--i" as string]: 3 + i * 2 }}>
          <div
            className="float bg-card/90 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur"
            style={{ animationDelay: c.delay }}
          >
            <span className="bg-primary/12 text-primary grid size-5 place-items-center rounded-full">
              <c.Icon className="size-3" />
            </span>
            {t(`dash.${c.key}`)}
          </div>
        </div>
      ))}
    </div>
  );
}
