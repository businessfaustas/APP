import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { InputError } from "@/lib/analysis/create";
import { CreditError, RateLimitError } from "@/lib/billing/credits";
import { captureError } from "@/lib/observability/errors";
import { clientIp, rateLimit } from "@/lib/security/rateLimit";

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
  void captureError(err, { source: "server" });
  return errorResponse("Something went wrong. Please try again.", 500);
}

export function tooManyRequests(retryAfter: number): NextResponse<{ error: string }> {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}

/**
 * Applies a rate limit to a route. Returns the 429 response to send, or null when the call may
 * proceed. Pass the user id for signed-in routes (per-user) or leave it out to limit by IP.
 */
export async function limited(req: Request, bucket: string, max: number, windowSec: number, userId?: string): Promise<NextResponse<{ error: string }> | null> {
  const res = await rateLimit(bucket, userId ?? clientIp(req), max, windowSec);
  return res.ok ? null : tooManyRequests(res.retryAfter);
}

export const unauthorized = () => errorResponse("Sign in required.", 401);
export const notFound = () => errorResponse("Not found.", 404);

/** Age gate for the API: signed-in users must have confirmed they are 18+ and accepted the Terms. */
export const consentRequired = () => errorResponse("Confirm you are 18 or older and accept the Terms and Privacy Policy to continue.", 403);
