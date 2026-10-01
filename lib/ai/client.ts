import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, type ModelMessage } from "ai";
import type { z } from "zod";

import { env, features } from "@/lib/config/env";

import { recordAiUsage, type AiPurpose } from "./usage";

export type ModelKind = "vision" | "text";

export class AiUnavailableError extends Error {
  constructor() {
    super("No AI provider key is configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY).");
    this.name = "AiUnavailableError";
  }
}

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
 * Structured-output call with one validation retry: if the model's JSON fails the Zod
 * schema, the validation errors are sent back and it tries once more.
 */
export async function generateStructured<S extends z.ZodType>(call: StructuredCall<S>): Promise<z.infer<S>> {
  if (!features.ai()) throw new AiUnavailableError();
  const model = languageModel(call.kind);
  let messages = call.messages;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generateText({
        model,
        instructions: call.instructions,
        messages,
        output: Output.object({ schema: call.schema, name: call.schemaName }),
        maxOutputTokens: call.maxOutputTokens ?? 8000,
        temperature: 0.1,
        maxRetries: 2,
      });
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
      const detail = err instanceof Error ? err.message.slice(0, 1500) : String(err);
      messages = [
        ...call.messages,
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
  const result = await generateText({
    model: languageModel(args.kind),
    instructions: args.instructions,
    prompt: args.prompt,
    maxOutputTokens: 1200,
    temperature: 0.2,
    maxRetries: 2,
  });
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
