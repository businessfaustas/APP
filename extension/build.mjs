/**
 * Builds the Chrome MV3 extension into extension/dist (load it via chrome://extensions →
 * "Load unpacked"). The default app URL is baked in from EXTENSION_APP_URL or
 * NEXT_PUBLIC_APP_URL; users can change it in the extension options.
 */
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "dist");
const appUrl = (process.env.EXTENSION_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const watch = process.argv.includes("--watch");

await rm(dist, { recursive: true, force: true });
await mkdir(join(dist, "icons"), { recursive: true });

const common = {
  bundle: true,
  target: "chrome120",
  sourcemap: watch ? "inline" : false,
  minify: !watch,
  define: { __DEFAULT_APP_URL__: JSON.stringify(appUrl) },
  logLevel: "info",
};
await build({ ...common, entryPoints: [join(here, "src/background.ts")], outfile: join(dist, "background.js"), format: "esm" });
await build({
  ...common,
  entryPoints: { content: join(here, "src/content.ts"), options: join(here, "src/options.ts"), popup: join(here, "src/popup.ts") },
  outdir: dist,
  format: "iife",
});

for (const f of ["options.html", "popup.html", "ui.css", "manifest.json"]) await cp(join(here, "static", f), join(dist, f));

const manifest = JSON.parse(await readFile(join(dist, "manifest.json"), "utf8"));
const pkg = JSON.parse(await readFile(join(here, "..", "package.json"), "utf8"));
manifest.version = pkg.version;
await writeFile(join(dist, "manifest.json"), JSON.stringify(manifest, null, 2));

const svg = await readFile(join(here, "..", "app", "icon.svg"));
for (const size of [16, 32, 48, 128]) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(dist, "icons", `icon-${size}.png`));
}

console.log(`Extension built → ${dist} (default app URL ${appUrl})`);
