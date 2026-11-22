import "server-only";

import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { sendAlert } from "@/lib/observability/alert";

import { AiUnavailableError } from "./errors";

/** The AI spend cap was reached; callers fall back to the no-AI path exactly as if no key were set. */
export class AiBudgetError extends AiUnavailableError {
  constructor(period: "day" | "month") {
    super(`The AI spend cap for this ${period} has been reached.`);
    this.name = "AiBudgetError";
  }
}

export interface AiSpend {
  day: number;
  month: number;
}

export async function aiSpend(now: Date = new Date()): Promise<AiSpend> {
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [day, month] = await Promise.all([
    prisma.aiUsage.aggregate({ where: { createdAt: { gte: startOfDay } }, _sum: { costUsd: true } }),
    prisma.aiUsage.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { costUsd: true } }),
  ]);
  return { day: day._sum.costUsd ?? 0, month: month._sum.costUsd ?? 0 };
}

let cache: { at: number; spend: AiSpend } | null = null;

/** Throws AiBudgetError when today's or this month's cap is used up; warns a human at 80%. */
export async function assertAiBudget(): Promise<void> {
  const { AI_DAILY_BUDGET_USD: dayCap, AI_MONTHLY_BUDGET_USD: monthCap } = env();
  if (!dayCap && !monthCap) return; // 0 = no cap
  if (!cache || Date.now() - cache.at > 20_000) cache = { at: Date.now(), spend: await aiSpend() };
  const { day, month } = cache.spend;
  const checks = [
    { period: "day" as const, spent: day, cap: dayCap },
    { period: "month" as const, spent: month, cap: monthCap },
  ];
  for (const c of checks) {
    if (!c.cap) continue;
    if (c.spent >= c.cap) {
      void sendAlert({
        key: `ai-budget-hit:${c.period}`,
        severity: "critical",
        title: `AI spend cap reached for the ${c.period}`,
        body: `$${c.spent.toFixed(2)} of $${c.cap.toFixed(2)}. Analyses continue without AI until the ${c.period} resets. Raise AI_${c.period === "day" ? "DAILY" : "MONTHLY"}_BUDGET_USD to allow more.`,
        throttleMinutes: 360,
      });
      throw new AiBudgetError(c.period);
    }
    if (c.spent >= c.cap * 0.8) {
      void sendAlert({
        key: `ai-budget-80:${c.period}`,
        severity: "warning",
        title: `AI spend is at 80% of the ${c.period} cap`,
        body: `$${c.spent.toFixed(2)} of $${c.cap.toFixed(2)}.`,
        throttleMinutes: 360,
      });
    }
  }
}

/** Test hook: forget the cached totals. */
export function resetAiBudgetCache(): void {
  cache = null;
}
