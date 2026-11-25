/**
 * Builds the pictures used by the welcome-style account email (docs/email-templates/confirm-signup.html) into
 * public/email/: the hero (a screenshot of the landing page's product card on a brand-blue backdrop), four round
 * icons for the "get started" cards, a help icon and the car-on-a-disc for the dark promo block, and the headings.
 * Email apps don't draw SVG or WebP reliably, they strip CSS gradients, and Gmail ignores web fonts, so every picture is
 * a PNG or JPEG, and the headings are pictures of text set in the brand's heading font (Bricolage Grotesque, SIL OFL).
 *
 *   pnpm dev                                          # in another terminal: the hero is a screenshot of http://localhost:3000
 *   pnpm exec tsx scripts/make-email-art.ts           # everything; ART_BASE_URL=... to take the hero from somewhere else
 *   pnpm exec tsx scripts/make-email-art.ts headings  # only the headings (no dev server needed)
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { chromium, type Browser } from "@playwright/test";
import { CircleDollarSignIcon, LifeBuoyIcon, Link2Icon, ScanSearchIcon, TrendingUpIcon } from "lucide-react";
import sharp from "sharp";

const OUT = new URL("../public/email/", import.meta.url);
const BASE = process.env.ART_BASE_URL ?? "http://localhost:3000";

// The brand, from app/globals.css
const BLUE = "#545ce1"; // --logo
const LAVENDER = "#eceefc";
/** The flat colour along the bottom edge of the hero. The template gives the cell under it the same colour, so the button sits on it seamlessly. */
const HERO_BASE = "#5b63e6";

async function save(name: string, buf: Buffer) {
  await writeFile(new URL(name, OUT), buf);
  console.log(`public/email/${name} (${buf.length} bytes)`);
}

/** A line icon in the brand blue on a pale disc, 56 px shown, drawn at 2x. */
async function icon(name: string, Icon: ComponentType<Record<string, unknown>>) {
  const inner = renderToStaticMarkup(createElement(Icon, { size: 56, color: BLUE, strokeWidth: 1.7 })).replace("<svg", '<svg x="28" y="28"');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="0 0 112 112"><circle cx="56" cy="56" r="56" fill="${LAVENDER}"/>${inner}</svg>`;
  await save(name, await sharp(Buffer.from(svg), { density: 300 }).png({ compressionLevel: 9 }).toBuffer());
}

async function carDisc() {
  const size = 440;
  const disc = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#8f98f7"/><stop offset="1" stop-color="#4a52d6"/></radialGradient></defs><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="url(#g)"/><ellipse cx="${size / 2}" cy="${size * 0.69}" rx="${size * 0.36}" ry="${size * 0.05}" fill="#1a1c4d" opacity="0.35"/></svg>`;
  const car = await sharp("public/cars/sedan-blue.webp").resize({ width: 372 }).png().toBuffer();
  const meta = await sharp(car).metadata();
  const out = await sharp(Buffer.from(disc))
    .composite([{ input: car, left: Math.round((size - 372) / 2), top: Math.round(size * 0.67 - meta.height!) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await save("car-disc.png", out);
}

const NAVY = "#13141c";
const WHITE = "#ffffff";
const SOFT_BLUE = "#aab1ff";
const FONT = "Bricolage Grotesque";
const FONT_DIR = new URL("../node_modules/@fontsource/bricolage-grotesque/files/", import.meta.url);

/** One heading to draw: lines of text, each with its own colour, set at `size` CSS px and weight 800. */
interface Heading {
  file: string;
  lines: [text: string, color: string][];
  size: number;
  align?: "left" | "center";
  tracking?: string;
}

const HEADINGS: Heading[] = [
  {
    file: "h-welcome.png",
    lines: [
      ["Welcome to", NAVY],
      ["FlagBid", BLUE],
    ],
    size: 48,
    align: "center",
    tracking: "-0.035em",
  },
  { file: "h-start.png", lines: [["Let's get you started", BLUE]], size: 28, align: "center", tracking: "-0.02em" },
  {
    file: "h-promo.png",
    lines: [
      ["Built to help you", WHITE],
      ["bid smarter", SOFT_BLUE],
    ],
    size: 27,
    align: "left",
    tracking: "-0.025em",
  },
  { file: "h-step-1.png", lines: [["1. Paste a lot link", BLUE]], size: 17, align: "center", tracking: "-0.01em" },
  { file: "h-step-2.png", lines: [["2. Read the damage", BLUE]], size: 17, align: "center", tracking: "-0.01em" },
  { file: "h-step-3.png", lines: [["3. Get your max bid", BLUE]], size: 17, align: "center", tracking: "-0.01em" },
  { file: "h-step-4.png", lines: [["4. Check the profit", BLUE]], size: 17, align: "center", tracking: "-0.01em" },
  { file: "h-help.png", lines: [["Need help getting started?", NAVY]], size: 16, align: "left", tracking: "-0.01em" },
  { file: "h-reset.png", lines: [["Reset your password", NAVY]], size: 31, align: "left", tracking: "-0.03em" },
  { file: "h-reset-lt.png", lines: [["Slaptažodžio atkūrimas", NAVY]], size: 21, align: "left", tracking: "-0.02em" },
];

/** The headings as transparent PNGs, drawn at 3x. Prints each one's size in CSS px, which the templates use as width. */
async function headings(browser: Browser) {
  const woff = async (name: string) => (await readFile(new URL(name, FONT_DIR))).toString("base64");
  const [latin, ext] = [await woff(`bricolage-grotesque-latin-800-normal.woff2`), await woff(`bricolage-grotesque-latin-ext-800-normal.woff2`)];
  const face = (b64: string, range: string) =>
    `@font-face{font-family:'${FONT}';font-weight:800;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${range}}`;
  const css =
    face(
      latin,
      "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
    ) +
    face(
      ext,
      "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
    );

  const ctx = await browser.newContext({ viewport: { width: 900, height: 400 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  for (const h of HEADINGS) {
    const lines = h.lines.map(([t, c]) => `<div style="color:${c}">${t.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>`).join("");
    await page.setContent(
      `<style>${css}html,body{margin:0;background:transparent}#t{display:inline-block;padding:3px 5px 8px ${h.align === "left" ? "0" : "5px"};white-space:nowrap;font-family:'${FONT}',sans-serif;font-weight:800;font-size:${h.size}px;line-height:1.04;letter-spacing:${h.tracking ?? "0"};text-align:${h.align ?? "left"}}</style><div id="t">${lines}</div>`,
    );
    await page.evaluate((f) => document.fonts.load(`800 20px '${f}'`, "ąčęėįšųūž Wlg"), FONT);
    const el = page.locator("#t");
    const box = (await el.boundingBox())!;
    await save(h.file, await el.screenshot({ omitBackground: true }));
    console.log(`  ${h.file}: ${Math.round(box.width)} x ${Math.round(box.height)} CSS px`);
  }
  await ctx.close();
}

async function hero(browser: Browser) {
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
    storageState: {
      cookies: [
        {
          name: "fb_consent",
          value: "v1%3Aessential",
          domain: new URL(BASE).hostname,
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  const card = page.locator("div.dark.top-line").first();
  await card.waitFor();
  await page.locator('[data-testid="car-lobby"] [data-active="true"] img').first().waitFor();
  await page.waitForTimeout(800);
  const shot = await card.screenshot();
  await ctx.close();

  const W = 1200;
  const cardW = 920;
  const radius = 44;
  const scaled = await sharp(shot).resize({ width: cardW }).png().toBuffer();
  const cardH = (await sharp(scaled).metadata()).height!;
  const top = 36;
  const flat = 150; // the plain strip at the bottom that the button sits on
  const H = top + cardH + flat;
  const left = Math.round((W - cardW) / 2);

  const stripes = Array.from({ length: 12 }, (_, i) => `<rect x="${i * 100 + 8}" y="0" width="84" height="${H}" fill="url(#s)"/>`).join("");
  const backdrop = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#d9dcfa"/><stop offset="0.8" stop-color="${HERO_BASE}"/></linearGradient>
      <linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="0.7" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.1"/></linearGradient>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${HERO_BASE}" stop-opacity="0"/><stop offset="1" stop-color="${HERO_BASE}" stop-opacity="1"/></linearGradient>
      <filter id="blur" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="26"/></filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${stripes}
    <rect x="${left + 30}" y="${top + 50}" width="${cardW - 60}" height="${cardH}" rx="${radius}" fill="#1b1d6b" opacity="0.5" filter="url(#blur)"/>
    <rect y="${H - flat - 140}" width="${W}" height="140" fill="url(#fade)"/>
    <rect y="${H - flat}" width="${W}" height="${flat}" fill="${HERO_BASE}"/>
  </svg>`;
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cardW}" height="${cardH}"><rect width="${cardW}" height="${cardH}" rx="${radius}" fill="#fff"/></svg>`,
  );
  const rounded = await sharp(scaled)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
  const out = await sharp(Buffer.from(backdrop))
    .composite([{ input: rounded, left, top }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  await save("hero.jpg", out);
  console.log(`hero is ${W}x${H} (shown at ${W / 2}x${H / 2}); its bottom colour is ${HERO_BASE}, flat for the last ${flat / 2}px`);
}

const localChromium = "/opt/pw-browsers/chromium";
const browser = await chromium.launch(existsSync(localChromium) ? { executablePath: localChromium } : {});
await mkdir(OUT, { recursive: true });
if (process.argv[2] !== "headings") {
  await icon("icon-link.png", Link2Icon as unknown as ComponentType<Record<string, unknown>>);
  await icon("icon-scan.png", ScanSearchIcon as unknown as ComponentType<Record<string, unknown>>);
  await icon("icon-bid.png", CircleDollarSignIcon as unknown as ComponentType<Record<string, unknown>>);
  await icon("icon-profit.png", TrendingUpIcon as unknown as ComponentType<Record<string, unknown>>);
  await icon("icon-help.png", LifeBuoyIcon as unknown as ComponentType<Record<string, unknown>>);
  await carDisc();
  await hero(browser);
}
await headings(browser);
await browser.close();
