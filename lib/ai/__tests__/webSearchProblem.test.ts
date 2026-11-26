import { describe, expect, it } from "vitest";

import { AiUnavailableError, webSearchProblem } from "../errors";

describe("webSearchProblem", () => {
  it("says plainly when web search is not switched on for the organization", () => {
    expect(webSearchProblem(new Error("Web search is not enabled for your organization"))).toMatch(/isn't switched on/);
    expect(webSearchProblem(new Error("tool web_search_20260318 has been disabled by your organization"))).toMatch(/isn't switched on/);
  });
  it("recognises a rejected key, a rate limit and a timeout", () => {
    expect(webSearchProblem(new Error("HTTP 401 invalid x-api-key"))).toMatch(/key or permissions/);
    expect(webSearchProblem(new Error("429 rate_limit_error"))).toMatch(/rate-limiting/);
    expect(webSearchProblem(new Error("The operation was aborted due to timeout"))).toMatch(/in time/);
  });
  it("keeps an unknown message short and never throws on a non-error", () => {
    expect(webSearchProblem(new Error("x".repeat(500))).length).toBeLessThanOrEqual(160);
    expect(webSearchProblem("boom")).toBe("boom");
    expect(webSearchProblem(undefined)).toBe("undefined");
    expect(webSearchProblem(new AiUnavailableError())).toMatch(/No AI provider key/);
  });
});
