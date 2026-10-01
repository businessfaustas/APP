import "server-only";

import { prisma } from "@/lib/db/prisma";

import { PLANS, RATE_LIMITS, type PlanId } from "./plans";

export class CreditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreditError";
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/** Lazily resets monthly credits to the plan allowance (never lowers purchased extras). */
export async function ensureMonthlyCredits(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, creditsRemaining: true, creditsResetAt: true } });
  if (!user) return;
  const due = !user.creditsResetAt || Date.now() - user.creditsResetAt.getTime() > MONTH_MS;
  if (!due) return;
  const allowance = PLANS[user.plan as PlanId].monthlyCredits;
  const next = Math.max(user.creditsRemaining, allowance);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { creditsRemaining: next, creditsResetAt: new Date() } }),
    prisma.creditLedger.create({ data: { userId, delta: next - user.creditsRemaining, reason: "MONTHLY_RESET" } }),
  ]);
}

/** Throws RateLimitError when the user exceeded the hourly analysis limit; records the hit otherwise. */
export async function checkRateLimit(userId: string, count = 1): Promise<void> {
  const key = `analysis:${userId}`;
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const hits = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });
  if (hits + count > RATE_LIMITS.analysesPerHour) {
    throw new RateLimitError(`Limit reached: ${RATE_LIMITS.analysesPerHour} analyses per hour. Try again later.`);
  }
  await prisma.rateLimitHit.createMany({ data: Array.from({ length: count }, () => ({ key })) });
}

/**
 * Charges one credit for a new analysis. Re-analyzing the same input within 24 h is free
 * (the pipeline reuses cached steps). Returns whether a credit was charged.
 */
export async function chargeForAnalysis(userId: string, analysisId: string, inputValue: string): Promise<boolean> {
  const recent = await prisma.analysis.findFirst({
    where: { userId, inputValue, status: "COMPLETED", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, id: { not: analysisId } },
    select: { id: true },
  });
  if (recent) {
    await prisma.creditLedger.create({ data: { userId, delta: 0, reason: "ANALYSIS_CACHED", analysisId } });
    return false;
  }
  const updated = await prisma.user.updateMany({ where: { id: userId, creditsRemaining: { gt: 0 } }, data: { creditsRemaining: { decrement: 1 } } });
  if (updated.count === 0) throw new CreditError("You're out of credits. Upgrade your plan or buy a credit pack.");
  await prisma.creditLedger.create({ data: { userId, delta: -1, reason: "ANALYSIS", analysisId } });
  return true;
}

export async function refundAnalysis(analysisId: string): Promise<void> {
  const charge = await prisma.creditLedger.findFirst({ where: { analysisId, reason: "ANALYSIS" } });
  const refunded = await prisma.creditLedger.findFirst({ where: { analysisId, reason: "REFUND" } });
  if (!charge || refunded) return;
  await prisma.$transaction([
    prisma.user.update({ where: { id: charge.userId }, data: { creditsRemaining: { increment: 1 } } }),
    prisma.creditLedger.create({ data: { userId: charge.userId, delta: 1, reason: "REFUND", analysisId } }),
  ]);
}
