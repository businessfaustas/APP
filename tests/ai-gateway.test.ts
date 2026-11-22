import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { canConnect, loadEnv } from "./helpers/db";

/**
 * The AI gateway when things go wrong: the provider is down, the prompt is too long, the answer
 * is cut off, the spend cap is reached. In every case the caller gets an error it can fall back
 * from, and the app never hangs. The model is mocked; the spend cap uses the real database.
 */
const dbUp = await canConnect();
loadEnv();
process.env.ANTHROPIC_API_KEY = "test-key";
process.env.AI_PROVIDER = "anthropic";
process.env.AI_DAILY_BUDGET_USD = "0"; // no cap unless a test sets one
process.env.AI_MONTHLY_BUDGET_USD = "0";

const gen = vi.hoisted(() => ({
  calls: [] as { instructions: string; messages?: unknown; maxOutputTokens: number }[],
  impl: null as null | ((n: number) => unknown),
}));
vi.mock("ai", async (orig) => ({
  ...(await orig<typeof import("ai")>()),
  generateText: vi.fn(async (args: { instructions: string; messages?: unknown; maxOutputTokens: number }) => {
    gen.calls.push(args);
    const out = gen.impl!(gen.calls.length);
    if (out instanceof Error) throw out;
    return out;
  }),
}));

const Schema = z.object({ make: z.string() });
const ok = { output: { make: "AUDI" }, usage: { inputTokens: 10, outputTokens: 5 } };
const call = async () => {
  const { generateStructured } = await import("@/lib/ai/client");
  return generateStructured({
    purpose: "EXTRACT",
    kind: "text",
    schema: Schema,
    schemaName: "x",
    instructions: "Extract.",
    messages: [{ role: "user", content: "text" }],
  });
};

describe.skipIf(!dbUp)("AI gateway resilience", () => {
  beforeEach(async () => {
    gen.calls = [];
    const { aiBreaker } = await import("@/lib/ai/client");
    aiBreaker.success();
    const { resetAiBudgetCache } = await import("@/lib/ai/budget");
    resetAiBudgetCache();
  });

  it("every call carries the untrusted-data notice", async () => {
    gen.impl = () => ok;
    await call();
    expect(gen.calls[0]!.instructions).toContain("untrusted DATA");
  });

  it("a prompt-too-long error is retried once with the text shortened", async () => {
    const { generateStructured } = await import("@/lib/ai/client");
    gen.impl = (n) => (n === 1 ? new Error("prompt is too long: 300000 tokens > 200000 maximum") : ok);
    const big = "x".repeat(50_000);
    const out = await generateStructured({
      purpose: "EXTRACT",
      kind: "text",
      schema: Schema,
      schemaName: "x",
      instructions: "Extract.",
      messages: [{ role: "user", content: big }],
    });
    expect(out.make).toBe("AUDI");
    expect(gen.calls).toHaveLength(2);
    const second = JSON.stringify(gen.calls[1]!.messages);
    expect(second.length).toBeLessThan(JSON.stringify(gen.calls[0]!.messages).length);
  });

  it("an answer cut off at the output limit is retried with a bigger limit", async () => {
    gen.impl = (n) => (n === 1 ? Object.assign(new Error("No object generated"), { finishReason: "length" }) : ok);
    await call();
    expect(gen.calls[1]!.maxOutputTokens).toBeGreaterThan(gen.calls[0]!.maxOutputTokens);
  });

  it("when the provider is down the breaker opens, and later calls fail instantly instead of waiting", async () => {
    const { AiUnavailableError, aiBreaker } = await import("@/lib/ai/client");
    gen.impl = () => Object.assign(new Error("Overloaded"), { statusCode: 529 });
    for (let i = 0; i < 4; i++) await expect(call()).rejects.toThrow();
    expect(aiBreaker.isOpen).toBe(true);
    const before = gen.calls.length;
    await expect(call()).rejects.toBeInstanceOf(AiUnavailableError);
    expect(gen.calls.length).toBe(before); // no request was made
  });

  it("a bad answer shape gets one correction attempt, not an endless loop", async () => {
    gen.impl = () => ({ output: { wrong: true }, usage: { inputTokens: 1, outputTokens: 1 } });
    await expect(call()).rejects.toThrow();
    expect(gen.calls.length).toBeLessThanOrEqual(3);
  });

  it("the daily spend cap stops model calls and raises the no-AI fallback error", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    const { AiBudgetError, resetAiBudgetCache } = await import("@/lib/ai/budget");
    const { AiUnavailableError } = await import("@/lib/ai/client");
    const marker = await prisma.aiUsage.create({ data: { purpose: "TITLE", model: "test", inputTokens: 1, outputTokens: 1, costUsd: 1_000_000 } });
    try {
      process.env.AI_DAILY_BUDGET_USD = "5";
      const { env } = await import("@/lib/config/env");
      (env() as { AI_DAILY_BUDGET_USD: number }).AI_DAILY_BUDGET_USD = 5;
      resetAiBudgetCache();
      gen.impl = () => ok;
      const err = await call().catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AiBudgetError);
      expect(err).toBeInstanceOf(AiUnavailableError); // callers already treat this as "no AI"
      expect(gen.calls).toHaveLength(0);
    } finally {
      await prisma.aiUsage.delete({ where: { id: marker.id } });
      (await import("@/lib/config/env")).env().AI_DAILY_BUDGET_USD = 0;
      resetAiBudgetCache();
    }
  });
});
