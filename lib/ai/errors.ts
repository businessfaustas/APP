/** AI can't be used right now: no key, spend cap reached, or the provider is down. Callers use their no-AI path. */
export class AiUnavailableError extends Error {
  constructor(message = "No AI provider key is configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY).") {
    super(message);
    this.name = "AiUnavailableError";
  }
}
