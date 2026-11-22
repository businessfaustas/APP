"use client";

/**
 * Makes every call to our own API fail loudly and quickly instead of hanging: a lost connection
 * or a stalled request becomes a clear message (once, not once per retry), and the caller's own
 * error handling still runs because the original error is re-thrown.
 */
export interface GuardMessages {
  requestFailed: string;
  timeout: string;
}

const TIMEOUT_MS = { default: 45_000, upload: 180_000 };
let installed = false;

export function installFetchGuard(getMessages: () => GuardMessages, notify: (message: string, id: string) => void): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const isApi = url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`);
    if (!isApi || init?.signal) return original(input, init);
    const ms = url.includes("/api/uploads") ? TIMEOUT_MS.upload : TIMEOUT_MS.default;
    try {
      return await original(input, { ...init, signal: AbortSignal.timeout(ms) });
    } catch (err) {
      const m = getMessages();
      if (err instanceof DOMException && err.name === "TimeoutError") notify(m.timeout, "fetch-timeout");
      else if (err instanceof TypeError) notify(m.requestFailed, "fetch-offline");
      throw err;
    }
  };
}
