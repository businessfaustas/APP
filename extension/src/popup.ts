import { type AnalyzeResult, getConfig, type Message } from "./messages";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const msg = $<HTMLDivElement>("msg");
const say = (text: string, kind: "ok" | "err" | "" = "") => {
  msg.textContent = text;
  msg.className = `msg ${kind}`;
};

$<HTMLButtonElement>("analyze").addEventListener("click", async (e) => {
  const btn = e.currentTarget as HTMLButtonElement;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return say("No active tab.", "err");
  btn.disabled = true;
  say("Sending this lot…");
  try {
    const r = (await chrome.tabs.sendMessage(tab.id, { type: "AP_CAPTURE_AND_ANALYZE" } satisfies Message)) as AnalyzeResult;
    if (r.ok) window.close();
    else say(r.error, "err");
  } catch {
    say("Open a Copart, IAAI or Bid.cars lot page first (reload it if the extension was just installed).", "err");
  } finally {
    btn.disabled = false;
  }
});

$<HTMLButtonElement>("open").addEventListener("click", async () => {
  const { apiBase } = await getConfig();
  await chrome.tabs.create({ url: `${apiBase}/app` });
});

$<HTMLButtonElement>("options").addEventListener("click", () => void chrome.runtime.openOptionsPage());
