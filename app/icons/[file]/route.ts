import { readFile } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

/** PNG app icons rendered from app/icon.svg at build time (PWA manifest, Apple touch icon). */
const ICONS: Record<string, { size: number; maskable: boolean }> = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
  "apple-touch-icon.png": { size: 180, maskable: true },
};

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((file) => ({ file }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const spec = ICONS[file];
  if (!spec) return new Response("Not found", { status: 404 });
  const svg = await readFile(join(process.cwd(), "app", "icon.svg"));
  let png: Buffer;
  if (spec.maskable) {
    // Full-bleed background with the mark inside the 80% safe zone.
    const inner = Math.round(spec.size * 0.8);
    const mark = await sharp(svg, { density: 512 }).resize(inner, inner).png().toBuffer();
    png = await sharp({ create: { width: spec.size, height: spec.size, channels: 4, background: "#1b2a44" } })
      .composite([{ input: mark, gravity: "center" }])
      .png()
      .toBuffer();
  } else {
    png = await sharp(svg, { density: 512 }).resize(spec.size, spec.size).png().toBuffer();
  }
  return new Response(new Uint8Array(png), { headers: { "content-type": "image/png", "cache-control": "public, max-age=604800, immutable" } });
}
