/**
 * Builds public/email/flagbid-logo.png, the wordmark for the account emails (Supabase's confirm-signup and
 * reset-password templates in docs/email-templates). Gmail and Outlook don't show SVG images, so the vector logo
 * becomes a PNG, in the brand blue on a transparent background, drawn at 2x so it stays sharp on phones.
 *   pnpm exec tsx scripts/make-email-logo.ts
 */
import { mkdir, writeFile } from "node:fs/promises";

import sharp from "sharp";

import { LOGO_VIEWBOX, LOGO_WORDMARK } from "../components/brand-art";

const BLUE = "#545ce1"; // --logo in app/globals.css
const WIDTH = 520;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}"><path d="${LOGO_WORDMARK}" fill="${BLUE}" fill-rule="evenodd"/></svg>`;
const png = await sharp(Buffer.from(svg), { density: 1200 }).resize({ width: WIDTH }).png({ compressionLevel: 9 }).toBuffer();
const { width, height } = await sharp(png).metadata();

await mkdir(new URL("../public/email/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/email/flagbid-logo.png", import.meta.url), png);
console.log(`public/email/flagbid-logo.png written (${width}x${height}, ${png.length} bytes)`);
