import { type AnalyzeResult, type Capture, getConfig, type Message, type TestResult } from "./messages";

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (res.status === 401) return "Your API token was rejected. Create a new one in AuctionPulse → Settings.";
  if (res.status === 402) return body.error ?? "You're out of report credits.";
  return body.error ?? `Request failed (${res.status})`;
}

async function analyze(capture: Capture): Promise<AnalyzeResult> {
  const { apiBase, token } = await getConfig();
  if (!token) {
    await chrome.runtime.openOptionsPage();
    return { ok: false, error: "Add your API token in the extension options first.", needsSetup: true };
  }
  try {
    const res = await fetch(`${apiBase}/api/extension/ingest`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(capture),
    });
    if (!res.ok) return { ok: false, error: await readError(res) };
    const body = (await res.json()) as { id: string; url: string };
    await chrome.tabs.create({ url: body.url });
    return { ok: true, url: body.url };
  } catch {
    return { ok: false, error: `Couldn't reach ${apiBase}. Check the app URL in the extension options.` };
  }
}

async function test(): Promise<TestResult> {
  const { apiBase, token } = await getConfig();
  if (!token) return { ok: false, error: "No token saved." };
  try {
    const res = await fetch(`${apiBase}/api/extension/ingest`, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return { ok: false, error: await readError(res) };
    return (await res.json()) as TestResult;
  } catch {
    return { ok: false, error: `Couldn't reach ${apiBase}.` };
  }
}

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse: (r: AnalyzeResult | TestResult) => void) => {
  if (msg.type === "AP_ANALYZE") {
    void analyze(msg.capture).then(sendResponse);
    return true;
  }
  if (msg.type === "AP_TEST") {
    void test().then(sendResponse);
    return true;
  }
  return false;
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") void chrome.runtime.openOptionsPage();
});
