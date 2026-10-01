export interface Capture {
  url: string;
  pageText: string;
  html: string | null;
  jsonLd: string[];
  imageUrls: string[];
}

export type Message = { type: "AP_ANALYZE"; capture: Capture } | { type: "AP_TEST" } | { type: "AP_CAPTURE_AND_ANALYZE" };

export type AnalyzeResult = { ok: true; url: string } | { ok: false; error: string; needsSetup?: boolean };
export type TestResult = { ok: true; plan: string; creditsRemaining: number } | { ok: false; error: string };

export interface Config {
  apiBase: string;
  token: string;
}

declare const __DEFAULT_APP_URL__: string;

export async function getConfig(): Promise<Config> {
  const stored = (await chrome.storage.local.get(["apiBase", "token"])) as Partial<Config>;
  return { apiBase: (stored.apiBase || __DEFAULT_APP_URL__).replace(/\/+$/, ""), token: stored.token ?? "" };
}

export async function setConfig(c: Config): Promise<void> {
  await chrome.storage.local.set({ apiBase: c.apiBase.trim().replace(/\/+$/, ""), token: c.token.trim() });
}
