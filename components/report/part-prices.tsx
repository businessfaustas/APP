"use client";

import { RadioIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PartSource, PriceEvidence, RepairLineItem } from "@/lib/domain/schemas";
import { useT } from "@/lib/i18n/client";
import { trPart } from "@/lib/i18n/generated";
import { cn, formatUsd } from "@/lib/utils";

const SOURCES: PartSource[] = ["OEM_NEW", "AFTERMARKET", "USED"];

const safeHref = (u: string) => (/^https:\/\//i.test(u) ? u : undefined);

/**
 * Every replaced part with its new (OEM and aftermarket) and used price, and where each number
 * comes from: live listings (with a few links as proof) or the reference table / an AI estimate.
 */
export function PartPrices({ lines }: { lines: RepairLineItem[] }) {
  const t = useT();
  const rows = lines.filter((l) => l.kind === "PART" && l.action === "REPLACE" && SOURCES.some((s) => l.prices[s]));
  if (rows.length === 0) return null;
  const live = rows.filter((l) => (l.priceEvidence?.length ?? 0) > 0);
  const proof = live.flatMap((l) => (l.priceEvidence ?? []).map((e) => ({ line: l, e })));

  return (
    <Card data-testid="part-prices">
      <CardHeader>
        <CardTitle className="text-base">{t("report.partPricesTitle")}</CardTitle>
        <p className="text-muted-foreground text-xs">
          {live.length > 0 ? t("report.partPricesLive", { live: live.length, total: rows.length }) : t("report.partPricesNoLive")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("report.partService")}</TableHead>
              {SOURCES.map((s) => (
                <TableHead key={s} className="text-right">
                  {t(`domain.partSource.${s}`)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="max-w-56 whitespace-normal">
                  <div className="text-sm font-medium">{trPart(t, l.partName)}</div>
                  <div className="text-muted-foreground text-[11px]">{t(`report.zone.${l.zone}`)}</div>
                </TableCell>
                {SOURCES.map((s) => {
                  const range = l.prices[s];
                  const ev = l.priceEvidence?.find((x) => x.source === s);
                  return (
                    <TableCell key={s} className="text-right">
                      {range ? (
                        <>
                          <div className={cn("num text-sm", ev && "font-semibold")}>
                            {range.low === range.high ? formatUsd(range.mid) : `${formatUsd(range.low)}–${formatUsd(range.high)}`}
                          </div>
                          <div className={cn("flex items-center justify-end gap-1 text-[11px]", ev ? "text-go" : "text-muted-foreground")}>
                            {ev && <RadioIcon className="size-3" aria-hidden="true" />}
                            {ev ? t("report.priceLive", { n: ev.count }) : l.priceOrigin === "AI_ESTIMATE" ? t("report.priceAi") : t("report.priceReference")}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {proof.length > 0 && (
          <Disclosure title={t("report.partPricesProof")} meta={t("report.partPricesProofMeta", { n: proof.length })}>
            <ul className="space-y-3 text-xs">
              {proof.map(({ line, e }) => (
                <ProofItem key={`${line.id}-${e.source}`} name={trPart(t, line.partName)} e={e} />
              ))}
            </ul>
          </Disclosure>
        )}
      </CardContent>
    </Card>
  );
}

function ProofItem({ name, e }: { name: string; e: PriceEvidence }) {
  const t = useT();
  return (
    <li>
      <div className="font-medium">
        {name} · {t(`domain.partSource.${e.source}`)}
        <span className="text-muted-foreground font-normal"> — {t("report.partPricesFrom", { n: e.count, provider: e.provider })}</span>
      </div>
      <ul className="mt-1 space-y-0.5">
        {e.sample.map((s) => (
          <li key={s.url} className="flex justify-between gap-3">
            <a
              href={safeHref(s.url)}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-muted-foreground hover:text-foreground min-w-0 truncate underline-offset-2 hover:underline"
            >
              {s.title}
            </a>
            <span className="num shrink-0">{formatUsd(s.price)}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}
