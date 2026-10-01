import "server-only";

import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";

export type AiPurpose = "VISION" | "EXTRACT" | "PARTS_PRICE" | "MARKET_ESTIMATE" | "NARRATIVE" | "TITLE";

/** "3,15" → { input: 3, output: 15 } USD per million tokens. */
export function parsePrice(raw: string): { input: number; output: number } {
  const [i, o] = raw.split(",").map((x) => Number(x.trim()));
  return { input: Number.isFinite(i) ? i! : 0, output: Number.isFinite(o) ? o! : 0 };
}

export function costUsd(kind: "vision" | "text", inputTokens: number, outputTokens: number): number {
  const p = parsePrice(kind === "vision" ? env().AI_PRICE_VISION : env().AI_PRICE_TEXT);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export async function recordAiUsage(u: {
  analysisId: string | null;
  purpose: AiPurpose;
  model: string;
  kind: "vision" | "text";
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  try {
    await prisma.aiUsage.create({
      data: {
        analysisId: u.analysisId,
        purpose: u.purpose,
        model: u.model,
        inputTokens: u.inputTokens,
        outputTokens: u.outputTokens,
        costUsd: costUsd(u.kind, u.inputTokens, u.outputTokens),
      },
    });
  } catch (err) {
    console.error("Failed to record AI usage", err);
  }
}

export async function analysisAiCost(analysisId: string): Promise<number> {
  const agg = await prisma.aiUsage.aggregate({ where: { analysisId }, _sum: { costUsd: true } });
  return agg._sum.costUsd ?? 0;
}
