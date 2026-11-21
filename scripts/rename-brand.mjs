/**
 * Renames the product everywhere it is written out.
 *
 *   node scripts/rename-brand.mjs FlagBid NewName
 *
 * Replaces the display name ("FlagBid") and its lowercase slug ("flagbid", used in a few
 * identifiers such as the extension's element id) in every git-tracked text file. Both names
 * must be a single CamelCase word. Review the diff afterwards (`git diff --stat`), rebuild the
 * extension (`pnpm extension:build`) and run the checks.
 *
 * Not touched on purpose: the database name, the demo user's email, cookie prefixes and the
 * deployed URL. Those are identifiers, not branding; changing them would orphan existing data.
 * The logo is artwork, not text: after renaming, replace components/brand-art.ts and app/icon.svg
 * with a drawing of the new name (the favicon, app and extension icons are rendered from app/icon.svg).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const [from, to] = process.argv.slice(2);
const valid = /^[A-Z][A-Za-z0-9]*$/;
if (!from || !to || !valid.test(from) || !valid.test(to)) {
  console.error("Usage: node scripts/rename-brand.mjs <OldName> <NewName>   (single CamelCase words, e.g. FlagBid BidLens)");
  process.exit(1);
}
if (from === to) {
  console.error("The old and new names are the same.");
  process.exit(1);
}

const SKIP = /(^|\/)(pnpm-lock\.yaml|prisma\/migrations\/.*)$|\.(png|jpe?g|webp|ico|woff2?|pdf|zip)$/i;
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\0")
  .filter((f) => f && !SKIP.test(f));

let changed = 0;
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const next = text.replaceAll(from, to).replaceAll(from.toLowerCase(), to.toLowerCase());
  if (next !== text) {
    writeFileSync(file, next);
    changed++;
    console.log(`  ${file}`);
  }
}
console.log(`\nRenamed ${from} → ${to} in ${changed} file(s).`);
console.log(
  "Next: new logo artwork (components/brand-art.ts, app/icon.svg), pnpm extension:build, pnpm typecheck && pnpm lint && pnpm test, and update the Vercel project name or domain if you want the URL to match.",
);
