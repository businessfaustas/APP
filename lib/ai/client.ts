import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, type ModelMessage } from "ai";
import type { z } from "zod";

import { env, features } from "@/lib/config/env";
import { log } from "@/lib/observability/log";

import { assertAiBudget } from "./budget";
import { AiUnavailableError } from "./errors";
import { capMessages, CircuitBreaker, isContextOverflow, isOutputTruncated, isTransientAiError, shrinkMessages, UNTRUSTED_NOTICE } from "./guard";
import { recordAiUsage, WEB_SEARCH_USD, type AiPurpose } from "./usage";

export { AiUnavailableError } from "./errors";
export type ModelKind = "vision" | "text";

export function modelId(kind: ModelKind): string {
  return kind === "vision" ? env().AI_MODEL_VISION : env().AI_MODEL_TEXT;
}

function languageModel(kind: ModelKind) {
  const e = env();
  const id = modelId(kind);
  if (e.AI_PROVIDER === "openai") {
    if (!e.OPENAI_API_KEY) throw new AiUnavailableError();
    return createOpenAI({ apiKey: e.OPENAI_API_KEY })(id);
  }
  if (!e.ANTHROPIC_API_KEY) throw new AiUnavailableError();
  return createAnthropic({ apiKey: e.ANTHROPIC_API_KEY })(id);
}

/** Per-call time limits: a hung provider must not hold an analysis open for minutes. */
const TIMEOUT_MS: Record<ModelKind, number> = { vision: 120_000, text: 60_000 };

/**
 * One breaker per server instance. Four transient failures within a minute open it for two
 * minutes; analyses keep running on the no-AI paths (heuristic parsing, reference prices,
 * template narrative) instead of each waiting on a provider that is down.
 */
export const aiBreaker = new CircuitBreaker({ failureThreshold: 4, windowMs: 60_000, openMs: 120_000 });

/** Every model call goes through here: spend cap, outage breaker, timeout. */
async function guarded<T>(kind: ModelKind, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  await assertAiBudget();
  if (!aiBreaker.allow()) throw new AiUnavailableError("The AI provider is temporarily unavailable; continuing without it.");
  try {
    const out = await run(AbortSignal.timeout(TIMEOUT_MS[kind]));
    aiBreaker.success();
    return out;
  } catch (err) {
    if (isTransientAiError(err)) {
      aiBreaker.failure();
      log.warn("ai.transient_failure", { kind, open: aiBreaker.isOpen, err });
    }
    throw err;
  }
}

export interface StructuredCall<S extends z.ZodType> {
  purpose: AiPurpose;
  kind: ModelKind;
  schema: S;
  schemaName: string;
  instructions: string;
  messages: ModelMessage[];
  analysisId?: string | null;
  maxOutputTokens?: number;
}

/**
 * Structured-output call with recovery:
 *  - a reply that fails the Zod schema is sent back with the errors for one correction,
 *  - an answer cut off at the output limit is retried with a larger limit,
 *  - a "prompt too long" error is retried with the text halved,
 *  - and the caller always gets an error it can fall back from (AiUnavailableError when the
 *    key is missing, the spend cap is hit or the provider is down).
 */
export async function generateStructured<S extends z.ZodType>(call: StructuredCall<S>): Promise<z.infer<S>> {
  if (!features.ai()) throw new AiUnavailableError();
  const model = languageModel(call.kind);
  let messages = capMessages(call.messages as never) as ModelMessage[];
  let maxOutputTokens = call.maxOutputTokens ?? 8000;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await guarded(call.kind, (abortSignal) =>
        generateText({
          model,
          instructions: `${call.instructions}\n${UNTRUSTED_NOTICE}`,
          messages,
          output: Output.object({ schema: call.schema, name: call.schemaName }),
          maxOutputTokens,
          temperature: 0.1,
          maxRetries: 2,
          abortSignal,
        }),
      );
      await recordAiUsage({
        analysisId: call.analysisId ?? null,
        purpose: call.purpose,
        model: modelId(call.kind),
        kind: call.kind,
        inputTokens: result.usage.inputTokens ?? 0,
        outputTokens: result.usage.outputTokens ?? 0,
      });
      return call.schema.parse(result.output) as z.infer<S>;
    } catch (err) {
      lastError = err;
      if (err instanceof AiUnavailableError) throw err;
      if (isContextOverflow(err)) {
        messages = shrinkMessages(messages as never) as ModelMessage[];
        continue;
      }
      if (isOutputTruncated(err)) {
        maxOutputTokens = Math.min(16_000, maxOutputTokens * 2);
        continue;
      }
      if (isTransientAiError(err)) throw err; // retrying a provider that is failing only slows the analysis down
      const detail = err instanceof Error ? err.message.slice(0, 1500) : String(err);
      messages = [
        ...messages,
        {
          role: "user",
          content: `Your previous answer did not match the required JSON schema. Error:\n${detail}\nReturn a corrected answer that matches the schema exactly.`,
        },
      ];
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI structured output failed");
}

/** Plain-text generation (used for the narrative). */
export async function generatePlainText(args: {
  purpose: AiPurpose;
  kind: ModelKind;
  instructions: string;
  prompt: string;
  analysisId?: string | null;
}): Promise<string> {
  if (!features.ai()) throw new AiUnavailableError();
  const model = languageModel(args.kind);
  const prompt = capMessages([{ role: "user", content: args.prompt }])[0]!.content as string;
  const result = await guarded(args.kind, (abortSignal) =>
    generateText({
      model,
      instructions: `${args.instructions}\n${UNTRUSTED_NOTICE}`,
      prompt,
      maxOutputTokens: 1200,
      temperature: 0.2,
      maxRetries: 2,
      abortSignal,
    }),
  );
  await recordAiUsage({
    analysisId: args.analysisId ?? null,
    purpose: args.purpose,
    model: modelId(args.kind),
    kind: args.kind,
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
  });
  return result.text;
}

export interface WebResearch {
  text: string;
  searches: number;
  sources: { url: string; title: string | null }[];
}

/**
 * Lets the model search the web and report what it found (Anthropic only: it runs the search
 * itself, so no search key is needed here). Throws AiUnavailableError for other providers, and
 * the API's own error when web search isn't enabled for the key's organization; callers fall
 * back to an answer from the model's own knowledge.
 */
export async function generateWebResearch(args: {
  purpose: AiPurpose;
  instructions: string;
  prompt: string;
  analysisId?: string | null;
  maxSearches?: number;
}): Promise<WebResearch> {
  const e = env();
  if (!features.ai() || e.AI_PROVIDER !== "anthropic" || !e.ANTHROPIC_API_KEY) throw new AiUnavailableError();
  const anthropic = createAnthropic({ apiKey: e.ANTHROPIC_API_KEY });
  const prompt = capMessages([{ role: "user", content: args.prompt }])[0]!.content as string;
  const result = await guarded("text", (abortSignal) =>
    generateText({
      model: anthropic(modelId("text")),
      instructions: `${args.instructions}\n${UNTRUSTED_NOTICE}`,
      prompt,
      // The basic tool version, on purpose: the newer ones (20260209, 20260318) call tools programmatically, which
      // Haiku 4.5 (the default text model) rejects with "does not support programmatic tool calling".
      tools: { web_search: anthropic.tools.webSearch_20250305({ maxUses: args.maxSearches ?? 4, userLocation: { type: "approximate", country: "US" } }) },
      maxOutputTokens: 2500,
      temperature: 0.1,
      maxRetries: 1,
      abortSignal,
    }),
  );
  const searches = result.steps.reduce((n, s) => n + s.toolCalls.filter((c) => c.toolName === "web_search").length, 0);
  await recordAiUsage({
    analysisId: args.analysisId ?? null,
    purpose: args.purpose,
    model: modelId("text"),
    kind: "text",
    inputTokens: result.usage.inputTokens ?? 0,
    outputTokens: result.usage.outputTokens ?? 0,
    extraUsd: searches * WEB_SEARCH_USD,
  });
  const sources = result.sources.flatMap((s) => (s.sourceType === "url" ? [{ url: s.url, title: s.title ?? null }] : []));
  return { text: result.text, searches, sources };
}
