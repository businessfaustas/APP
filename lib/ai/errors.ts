/** AI can't be used right now: no key, spend cap reached, or the provider is down. Callers use their no-AI path. */
export class AiUnavailableError extends Error {
  constructor(message = "No AI provider key is configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY).") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

/**
 * A short, plain reason a live web search failed, for the admin check and the logs (never shown to customers).
 * The usual cause is that an organization admin has not switched web search on in the Anthropic Console.
 */
export function webSearchProblem(err: unknown): string {
  if (err instanceof AiUnavailableError) return err.message;
  const raw = err instanceof Error ? err.message : String(err);
  const msg = raw.replace(/\s+/g, " ").trim();
  if (/web.?search/i.test(msg) && /(not (been )?enabled|disabled|not allowed|permission|organi[sz]ation)/i.test(msg))
    return "web search isn't switched on for this Anthropic organization";
  if (/\b(401|403)\b|unauthori[sz]ed|forbidden|invalid x-api-key/i.test(msg)) return "Anthropic rejected the request (key or permissions)";
  if (/\b429\b|rate.?limit|overloaded/i.test(msg)) return "Anthropic is rate-limiting or overloaded right now";
  if (/abort|timed? ?out|timeout/i.test(msg)) return "the search didn't answer in time";
  return msg.slice(0, 160) || "unknown error";
}
