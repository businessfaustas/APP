/**
 * Runs on auction sites. On lot pages it shows an "Analyze with AuctionPulse" button that
 * sends what the user can see (text, structured data, photo URLs) to the app.
 */
import { LIMITS, lotFromUrl, selectImageUrls, truncate, type ImageCandidate } from "./lot";
import type { AnalyzeResult, Capture, Message } from "./messages";

function collectImages(): ImageCandidate[] {
  const out: ImageCandidate[] = [];
  for (const img of Array.from(document.images)) {
    const width = img.naturalWidth || img.width || 0;
    const sources = [img.currentSrc, img.src, img.getAttribute("data-src"), img.getAttribute("data-original"), img.getAttribute("data-lazy")];
    const srcset = img.getAttribute("srcset") ?? img.getAttribute("data-srcset");
    if (srcset) sources.push(srcset.split(",").map((s) => s.trim().split(/\s+/)[0]).pop() ?? null);
    for (const s of sources) if (s && !s.startsWith("data:")) out.push({ url: s, width });
  }
  for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
    if (/\.(jpe?g|png|webp)(\?|$)/i.test(a.href)) out.push({ url: a.href, width: 0 });
  }
  return out;
}

function capture(): Capture {
  const html = document.documentElement.outerHTML;
  const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map((s) => truncate(s.textContent ?? "", LIMITS.jsonLdItem))
    .filter(Boolean)
    .slice(0, LIMITS.jsonLdItems);
  return {
    url: location.href,
    pageText: truncate(document.body.innerText, LIMITS.pageText),
    html: html.length <= LIMITS.html ? html : null,
    jsonLd,
    imageUrls: selectImageUrls(collectImages(), location.href),
  };
}

async function analyzeHere(): Promise<AnalyzeResult> {
  if (!lotFromUrl(location.href)) return { ok: false, error: "Open a Copart, IAAI or Bid.cars lot page first." };
  return (await chrome.runtime.sendMessage({ type: "AP_ANALYZE", capture: capture() } satisfies Message)) as AnalyzeResult;
}

// ── Floating button (in a shadow root so the auction site's CSS can't touch it) ──
let host: HTMLElement | null = null;
let button: HTMLButtonElement | null = null;
let status: HTMLElement | null = null;

function mount() {
  if (host) return;
  host = document.createElement("div");
  host.id = "auctionpulse-root";
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `
    <style>
      .wrap { position: fixed; right: 20px; bottom: 20px; z-index: 2147483646; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
        font: 500 14px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; }
      button { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; padding: 11px 16px; border-radius: 10px;
        background: #1b2a44; color: #fff; box-shadow: 0 6px 20px rgba(0,0,0,.25); border: 1px solid #2f4a75; }
      button:hover { background: #22375a; }
      button:focus-visible { outline: 3px solid #5cc8ff; outline-offset: 2px; }
      button[disabled] { opacity: .7; cursor: progress; }
      svg { width: 20px; height: 20px; }
      .status { max-width: 280px; padding: 8px 12px; border-radius: 8px; background: #fff; color: #1d2433; box-shadow: 0 4px 14px rgba(0,0,0,.18); }
      .status[hidden] { display: none; }
      .status.error { background: #fdecec; color: #8a1c1c; }
    </style>
    <div class="wrap">
      <div class="status" role="status" aria-live="polite" hidden></div>
      <button type="button">
        <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 36h12l5-14 8 26 6-18 4 6h13" fill="none" stroke="#5cc8ff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span>Analyze with AuctionPulse</span>
      </button>
    </div>`;
  button = root.querySelector("button");
  status = root.querySelector(".status");
  button?.addEventListener("click", () => void run());
  document.documentElement.appendChild(host);
}

function showStatus(text: string, error = false) {
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("error", error);
  status.hidden = false;
}

async function run() {
  if (!button) return;
  button.disabled = true;
  showStatus("Sending this lot to AuctionPulse…");
  try {
    const r = await analyzeHere();
    if (r.ok) showStatus("Analysis started — it opened in a new tab.");
    else showStatus(r.error, true);
  } catch {
    showStatus("The extension was updated — reload this page and try again.", true);
  } finally {
    button.disabled = false;
  }
}

function sync() {
  const onLot = Boolean(lotFromUrl(location.href));
  if (onLot) mount();
  if (host) host.style.display = onLot ? "" : "none";
}

// Auction sites are single-page apps: watch for URL changes.
let last = "";
setInterval(() => {
  if (location.href !== last) {
    last = location.href;
    status?.setAttribute("hidden", "");
    sync();
  }
}, 800);
sync();

chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse: (r: AnalyzeResult) => void) => {
  if (msg.type === "AP_CAPTURE_AND_ANALYZE") {
    void analyzeHere().then(sendResponse);
    return true;
  }
  return false;
});
