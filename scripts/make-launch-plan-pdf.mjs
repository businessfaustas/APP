/**
 * Builds docs/FlagBid-Launch-Plan.pdf from docs/LAUNCH-PLAN.md, so the printable plan and the
 * markdown never drift apart: edit the markdown, then run
 *
 *   node scripts/make-launch-plan-pdf.mjs
 *
 * It renders with the Chromium that Playwright already installs, the project's own Geist font and
 * the blue logo (components/brand-art.ts). No new dependency. The PDF is tagged and has bookmarks.
 */
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

const root = new URL("../", import.meta.url);
const read = (p) => readFile(new URL(p, root), "utf8");

// ---------------------------------------------------------------------------------------------
// A small markdown reader for exactly the constructs the plan uses (headings, lists, tables,
// checkboxes, quotes, bold/italic/code/links). Anything else is a bug in the plan, not a feature.
// ---------------------------------------------------------------------------------------------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(raw) {
  const codes = [];
  let s = esc(raw).replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = s
    .replace(/&lt;(https?:\/\/[^\s]+?)&gt;/g, (_, u) => `<span class="url">${u}</span>`)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, t, u) => `${t} (<span class="url">${u}</span>)`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*]+)\*(?!\w)/g, "$1<em>$2</em>");
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
}

const lines = (await read("docs/LAUNCH-PLAN.md")).split("\n");

const sections = []; // { number, title, time, badge, html }
const intro = [];
let current = null;
let h1 = "";

const push = (html) => (current ? current.parts : intro).push(html);

function parseHeading(text) {
  let badge = "";
  const m = / — \*([^*]+)\*\s*$/.exec(text);
  if (m) {
    badge = m[1];
    text = text.slice(0, m.index);
  }
  let number = null;
  const n = /^(\d+)\.\s+/.exec(text);
  if (n) {
    number = Number(n[1]);
    text = text.slice(n[0].length);
  }
  let time = "";
  const t = /\((\d+(?:\s*(?:to|-)\s*\d+)?\s*(?:minutes?|hours?)[^)]*)\)/.exec(text);
  if (t) {
    time = t[1];
    text = text
      .replace(t[0], "")
      .replace(/\s+:/, ":")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  if (number !== null) text = text.replace(/\s*\([^)]*\)\s*$/, "");
  return { number, title: text.trim(), time, badge };
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim() || /^---+\s*$/.test(line)) continue;

  if (line.startsWith("# ")) {
    h1 = line.slice(2).trim();
    continue;
  }
  if (line.startsWith("## ")) {
    const h = parseHeading(line.slice(3).trim());
    current = { ...h, parts: [] };
    sections.push(current);
    continue;
  }
  if (line.startsWith("> ")) {
    const q = [];
    while (i < lines.length && lines[i].startsWith("> ")) q.push(lines[i++].slice(2));
    i--;
    push(`<div class="callout">${inline(q.join(" "))}</div>`);
    continue;
  }
  if (line.startsWith("|")) {
    const rows = [];
    while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
    i--;
    const cells = (r) =>
      r
        .replace(/^\||\|\s*$/g, "")
        .split("|")
        .map((c) => c.trim());
    const [head, , ...body] = rows;
    push(
      `<table><thead><tr>${cells(head)
        .map((c) => `<th>${inline(c)}</th>`)
        .join("")}</tr></thead><tbody>${body
        .map(
          (r) =>
            `<tr>${cells(r)
              .map((c) => `<td>${inline(c)}</td>`)
              .join("")}</tr>`,
        )
        .join("")}</tbody></table>`,
    );
    continue;
  }
  const list = /^(\s*)(- \[[ x]\] |- |\d+\. )(.*)$/.exec(line);
  if (list && list[1].length === 0) {
    const kind = list[2].startsWith("- [") ? "checks" : list[2] === "- " ? "bullets" : "steps";
    const items = [];
    while (i < lines.length) {
      const l = lines[i];
      const m = /^(\s*)(- \[[ x]\] |- |\d+\. )(.*)$/.exec(l);
      if (m && m[1].length === 0) {
        items.push({ text: m[3], sub: [], more: [] });
      } else if (m && m[1].length > 0 && items.length) {
        items[items.length - 1].sub.push(m[3]);
      } else if (/^\s{2,}\S/.test(l) && items.length) {
        items[items.length - 1].more.push(l.trim());
      } else break;
      i++;
    }
    i--;
    const li = (it) =>
      `<li>${kind === "checks" ? '<span class="box"></span>' : ""}<div>${inline(it.text)}${
        it.more.length ? `<div class="more">${it.more.map(inline).join("<br>")}</div>` : ""
      }${it.sub.length ? `<ul class="sub">${it.sub.map((s) => `<li>${inline(s)}</li>`).join("")}</ul>` : ""}</div></li>`;
    push(`<${kind === "steps" ? "ol" : "ul"} class="${kind}">${items.map(li).join("")}</${kind === "steps" ? "ol" : "ul"}>`);
    continue;
  }
  // paragraph(s): consecutive plain lines
  const para = [];
  while (i < lines.length && lines[i].trim() && !/^(#|>|\||- |\d+\. |---)/.test(lines[i])) para.push(lines[i++]);
  i--;
  let buffer = [];
  const flush = () => {
    if (buffer.length) push(`<p>${inline(buffer.join(" "))}</p>`);
    buffer = [];
  };
  for (const p of para) {
    const box = /^\*\*Unlocks:\*\*/.test(p) ? "unlocks" : /^\*\*Until then:\*\*/.test(p) ? "until" : /^\*\*Test it/.test(p) ? "test" : "";
    if (box) {
      flush();
      push(`<div class="kv ${box}">${inline(p)}</div>`);
    } else buffer.push(p.trim());
  }
  flush();
}

// ---------------------------------------------------------------------------------------------
// Presentation
// ---------------------------------------------------------------------------------------------
const FALLBACK_BADGE = {
  0: "do first",
  4: "recommended",
  7: "optional, add as customers ask",
  9: "recommended",
  10: "recommended",
  11: "recommended",
  12: "final check, run through once",
};
const badgeFor = (s) => s.badge || (s.number !== null ? (FALLBACK_BADGE[s.number] ?? "") : "");
const badgeClass = (b) => (/required/.test(b) && !/strongly|recommended/.test(b) ? "req" : /recommended|worth|first|final/.test(b) ? "rec" : "opt");

const numbered = sections.filter((s) => s.number !== null);
const glance = `<table class="glance"><thead><tr><th>Step</th><th>What</th><th>Time</th><th>Status</th></tr></thead><tbody>${numbered
  .map(
    (s) =>
      `<tr><td class="n">${s.number}</td><td>${inline(s.title)}</td><td class="t">${esc((s.time || "\u2014").replace(/,.*$/, ""))}</td><td><span class="chip ${badgeClass(badgeFor(s))}">${esc(badgeFor(s) || "\u2014")}</span></td></tr>`,
  )
  .join("")}</tbody></table>`;

const body = sections
  .map((s) => {
    const b = badgeFor(s);
    const head =
      s.number !== null
        ? `<header><span class="num">${s.number}</span><div><h2>${inline(s.title)}</h2><div class="meta">${s.time ? `<span class="time">${esc(s.time)}</span>` : ""}${b ? `<span class="chip ${badgeClass(b)}">${esc(b)}</span>` : ""}</div></div></header>`
        : `<header class="plain"><h2>${inline(s.title)}</h2></header>`;
    return `<section class="step">${head}${s.parts.join("\n")}</section>`;
  })
  .join("\n");

// logo, read from the generated artwork so the PDF always shows the current one
const art = await read("components/brand-art.ts");
const viewBox = /LOGO_VIEWBOX = "([^"]+)"/.exec(art)[1];
const wordmark = /LOGO_WORDMARK =\s*"([^"]+)"/.exec(art)[1];
const logo = `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="FlagBid"><path d="${wordmark}" fill="#545ce1" fill-rule="evenodd"/></svg>`;

const fontDir = new URL("node_modules/geist/dist/fonts/", root);
const font = async (file, family, weight) => {
  const b64 = (await readFile(new URL(file, fontDir))).toString("base64");
  return `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
};
const fonts = (
  await Promise.all([
    font("geist-sans/Geist-Regular.woff2", "Geist", 400),
    font("geist-sans/Geist-Medium.woff2", "Geist", 500),
    font("geist-sans/Geist-SemiBold.woff2", "Geist", 600),
    font("geist-sans/Geist-Bold.woff2", "Geist", 700),
    font("geist-mono/GeistMono-Regular.woff2", "Geist Mono", 400),
    font("geist-mono/GeistMono-Medium.woff2", "Geist Mono", 500),
  ])
).join("\n");

const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const introHtml = intro.join("\n");

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(h1)}</title>
<style>
${fonts}
:root{--ink:#13141c;--muted:#5a5d70;--line:#dcdde8;--brand:#545ce1;--tint:#f1f2ff;--amber:#8a5a00;--amber-bg:#fff6e0;--green:#0b6b45;--green-bg:#e8f7ef}
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font:9.6pt/1.5 "Geist",system-ui,sans-serif;color:var(--ink)}
code{font:500 8.4pt "Geist Mono",ui-monospace,monospace;background:#f3f3f8;border:1px solid #e6e6ef;border-radius:4px;padding:0 3px;word-break:break-word}
strong{font-weight:600}
.url{font-family:"Geist Mono",monospace;font-size:8.4pt;color:var(--brand);word-break:break-all}
.cover{break-after:page}
.cover .logo{width:58mm;margin:2mm 0 9mm}
.cover .logo svg{display:block;width:100%;height:auto}
.eyebrow{font-size:9pt;letter-spacing:.14em;text-transform:uppercase;color:var(--brand);font-weight:600}
h1{font-size:26pt;line-height:1.12;margin:2mm 0 4mm;font-weight:700;letter-spacing:-.02em}
.version{font-size:8.5pt;color:var(--muted);margin-top:6mm}
.callout{background:var(--tint);border-left:3px solid var(--brand);border-radius:0 8px 8px 0;padding:3mm 4mm;margin:4mm 0;font-size:9.4pt}
p{margin:0 0 2.6mm}
table{border-collapse:collapse;width:100%;margin:3mm 0 4mm;font-size:8.9pt;break-inside:avoid}
th{text-align:left;font-weight:600;font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);border-bottom:1.5px solid var(--ink);padding:1.6mm 2.4mm}
td{border-bottom:1px solid var(--line);padding:2mm 2.4mm;vertical-align:top}
tr{break-inside:avoid}
table.glance td.n{font-weight:700;color:var(--brand);width:11mm}
table.glance td.t{white-space:nowrap;color:var(--muted);width:30mm}
table.glance{font-size:9pt;table-layout:fixed;margin-top:2mm}
table.glance th:nth-child(1){width:12mm}
table.glance th:nth-child(3){width:38mm}
table.glance th:nth-child(4){width:54mm}
table.glance td{padding:1.5mm 2.4mm}
table.glance td.t{width:auto}
p:has(+ table){break-after:avoid}
.chip{display:inline-block;border-radius:99px;padding:.3mm 2.4mm;font-size:7.8pt;font-weight:600;white-space:nowrap}
.chip.req{background:var(--brand);color:#fff}
.chip.rec{background:var(--amber-bg);color:var(--amber)}
.chip.opt{background:#eceef4;color:var(--muted)}
.step{margin:0 0 9mm}
.step header{display:flex;gap:4mm;align-items:flex-start;margin:0 0 3.2mm;break-after:avoid;border-top:1.5px solid var(--ink);padding-top:3.5mm}
.step header.plain{display:block}
.num{flex:none;width:9mm;height:9mm;border-radius:50%;background:var(--brand);color:#fff;font-weight:700;font-size:12pt;display:flex;align-items:center;justify-content:center;margin-top:.5mm}
h2{font-size:14.5pt;line-height:1.22;margin:0;font-weight:700;letter-spacing:-.01em}
.meta{display:flex;gap:2.5mm;align-items:center;margin-top:1.4mm}
.time{font-size:8.6pt;color:var(--muted);font-weight:500}
.time::before{content:"\\23F1\\00a0";}
.kv{border-radius:8px;padding:2.4mm 3.6mm;margin:0 0 2mm;font-size:9.2pt}
.kv.unlocks{background:var(--green-bg);color:#0a3d29}
.kv.until{background:#f3f3f8;color:#3b3e52}
.kv.test{background:var(--amber-bg);color:#4f3300;margin-top:3mm}
ol.steps,ul.bullets,ul.checks,ul.sub{margin:2.4mm 0 2.6mm;padding:0;list-style:none}
ol.steps{counter-reset:s}
ol.steps>li{counter-increment:s;display:flex;gap:3mm;padding:1.7mm 0;border-bottom:1px solid #eeeef4;break-inside:avoid}
ol.steps>li:last-child{border-bottom:0}
ol.steps>li::before{content:counter(s);flex:none;width:5.4mm;height:5.4mm;border-radius:50%;border:1.3px solid var(--brand);color:var(--brand);font-weight:700;font-size:8pt;display:flex;align-items:center;justify-content:center;margin-top:.5mm}
ol.steps>li>div,ul.checks>li>div,ul.bullets>li>div{flex:1;min-width:0}
.more{margin-top:1.4mm;color:#3b3e52}
ul.sub{margin:1.6mm 0 0 1mm}
ul.sub>li{position:relative;padding:.7mm 0 .7mm 4mm;break-inside:avoid}
ul.sub>li::before{content:"";position:absolute;left:0;top:2.7mm;width:1.6mm;height:1.6mm;border-radius:50%;background:var(--brand)}
ul.bullets>li{display:flex;gap:3mm;padding:1mm 0}
ul.bullets>li::before{content:"";flex:none;width:1.6mm;height:1.6mm;border-radius:50%;background:var(--brand);margin-top:2.2mm}
ul.checks>li{display:flex;gap:3.2mm;padding:2.1mm 0;border-bottom:1px solid #eeeef4;break-inside:avoid}
.box{flex:none;width:4.6mm;height:4.6mm;border:1.4px solid var(--ink);border-radius:1.2mm;margin-top:.5mm}
</style></head>
<body>
<div class="cover">
  <div class="logo">${logo}</div>
  <div class="eyebrow">Launch plan</div>
  <h1>${esc(h1.replace(/^FlagBid launch plan:\s*/i, "").replace(/^./, (c) => c.toUpperCase()))}</h1>
  ${introHtml}
  <div class="version">Version of ${esc(today)}. Source: <code>docs/LAUNCH-PLAN.md</code> in the repository.</div>
  <h2 style="margin-top:7mm">At a glance</h2>
  ${glance}
</div>
${body}
</body></html>`;

const outPath = new URL("docs/FlagBid-Launch-Plan.pdf", root);
const dir = await mkdtemp(join(tmpdir(), "flagbid-plan-"));
const file = join(dir, "plan.html");
await writeFile(file, html);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: outPath.pathname,
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "18mm", left: "16mm", right: "16mm" },
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;padding:0 16mm;font:8px Helvetica,Arial,sans-serif;color:#5a5d70;display:flex;justify-content:space-between"><span>FlagBid launch plan</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
    tagged: true,
    outline: true,
  });
  console.log(`docs/FlagBid-Launch-Plan.pdf written (${numbered.length} numbered steps)`);
} finally {
  await browser.close();
  await rm(dir, { recursive: true, force: true });
}
