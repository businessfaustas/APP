import { getConfig, setConfig, type Message, type TestResult } from "./messages";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const form = $<HTMLFormElement>("form");
const apiBase = $<HTMLInputElement>("apiBase");
const token = $<HTMLInputElement>("token");
const msg = $<HTMLDivElement>("msg");
const settingsLink = $<HTMLAnchorElement>("settingsLink");

function say(text: string, kind: "ok" | "err" | "" = "") {
  msg.textContent = text;
  msg.className = `msg ${kind}`;
}

function updateLink() {
  settingsLink.href = `${apiBase.value.replace(/\/+$/, "")}/app/settings#extension`;
}

void getConfig().then((c) => {
  apiBase.value = c.apiBase;
  token.value = c.token;
  updateLink();
});
apiBase.addEventListener("input", updateLink);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  void setConfig({ apiBase: apiBase.value, token: token.value }).then(() => say("Saved.", "ok"));
});

$<HTMLButtonElement>("test").addEventListener("click", async () => {
  await setConfig({ apiBase: apiBase.value, token: token.value });
  say("Checking…");
  const r = (await chrome.runtime.sendMessage({ type: "AP_TEST" } satisfies Message)) as TestResult;
  if (r.ok) say(`Connected — ${r.plan} plan, ${r.creditsRemaining} reports left.`, "ok");
  else say(r.error, "err");
});
