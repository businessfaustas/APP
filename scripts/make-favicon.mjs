/**
 * Builds app/favicon.ico (16, 32 and 48 px) from app/icon.svg. An .ico file is a small index
 * followed by the images; modern browsers accept PNG data inside it.
 *   node scripts/make-favicon.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

import sharp from "sharp";

const svg = await readFile(new URL("../app/icon.svg", import.meta.url));
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => sharp(svg, { density: 512 }).resize(s, s).png().toBuffer()));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);

let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0); // width
  e.writeUInt8(s, 1); // height
  e.writeUInt8(0, 2); // palette
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); // planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});

await writeFile(new URL("../app/favicon.ico", import.meta.url), Buffer.concat([header, ...entries, ...pngs]));
console.log(`app/favicon.ico written (${offset} bytes)`);
