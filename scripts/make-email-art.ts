/**
 * Builds the pictures used by the welcome-style account email (docs/email-templates/confirm-signup.html) into
 * public/email/: the hero (a screenshot of the landing page's product card on a brand-blue backdrop), four round
 * icons for the "get started" cards, a help icon and the car-on-a-disc for the dark promo block.
 * Email apps don't draw SVG or WebP reliably, and they strip CSS gradients, so every picture is a PNG or JPEG.
 *
 *   pnpm dev                                   # in another terminal: the hero is a screenshot of http://localhost:3000
 *   pnpm exec tsx scripts/make-email-art.ts    # ART_BASE_URL=... to take it from somewhere else
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { chromium } from "@playwright/test";
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

async function hero() {
  const localChromium = "/opt/pw-browsers/chromium";
  const browser = await chromium.launch(existsSync(localChromium) ? { executablePath: localChromium } : {});
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
  await browser.close();

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

await mkdir(OUT, { recursive: true });
await icon("icon-link.png", Link2Icon as unknown as ComponentType<Record<string, unknown>>);
await icon("icon-scan.png", ScanSearchIcon as unknown as ComponentType<Record<string, unknown>>);
await icon("icon-bid.png", CircleDollarSignIcon as unknown as ComponentType<Record<string, unknown>>);
await icon("icon-profit.png", TrendingUpIcon as unknown as ComponentType<Record<string, unknown>>);
await icon("icon-help.png", LifeBuoyIcon as unknown as ComponentType<Record<string, unknown>>);
await carDisc();
await hero();
