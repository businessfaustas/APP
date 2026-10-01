import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { InputError } from "@/lib/analysis/create";
import { CreditError, RateLimitError } from "@/lib/billing/credits";

export function json<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function errorResponse(message: string, status: number): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status });
}

/** Maps known errors to HTTP responses; logs and hides unknown ones. */
export function handleApiError(err: unknown): NextResponse<{ error: string }> {
  if (err instanceof ZodError) return errorResponse(err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "), 400);
  if (err instanceof InputError) return errorResponse(err.message, 400);
  if (err instanceof CreditError) return errorResponse(err.message, 402);
  if (err instanceof RateLimitError) return errorResponse(err.message, 429);
  console.error(err);
  return errorResponse("Something went wrong. Please try again.", 500);
}

export const unauthorized = () => errorResponse("Sign in required.", 401);
export const notFound = () => errorResponse("Not found.", 404);
