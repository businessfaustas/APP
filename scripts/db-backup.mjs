/**
 * Logical backup of the whole database with pg_dump (custom format: compressed, and pg_restore
 * can restore tables selectively). Optionally encrypted with a passphrase, because the dump
 * holds every customer's data.
 *
 *   node scripts/db-backup.mjs [outfile]
 *   BACKUP_PASSPHRASE=...  also writes <outfile>.gpg (AES-256) and deletes the plain dump
 *
 * Uses DIRECT_URL (not the pooled URL) when set, because pg_dump needs a real connection.
 * Needs the `pg_dump` client on PATH, in the same major version as the server or newer.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { statSync, unlinkSync } from "node:fs";

const url =
  process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("db-backup: set DATABASE_URL (or DIRECT_URL).");
  process.exit(2);
}
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = process.argv[2] || `flagbid-backup-${stamp}.dump`;

const dump = spawnSync("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", out, url], { stdio: ["ignore", "inherit", "inherit"] });
if (dump.status !== 0) {
  console.error("db-backup: pg_dump failed.");
  process.exit(1);
}
let final = out;
if (process.env.BACKUP_PASSPHRASE) {
  const gpg = spawnSync(
    "gpg",
    ["--batch", "--yes", "--pinentry-mode", "loopback", "--passphrase-fd", "0", "--symmetric", "--cipher-algo", "AES256", "--output", `${out}.gpg`, out],
    {
      input: process.env.BACKUP_PASSPHRASE,
      stdio: ["pipe", "inherit", "inherit"],
    },
  );
  if (gpg.status !== 0) {
    console.error("db-backup: encryption failed; the unencrypted dump was kept at", out);
    process.exit(1);
  }
  unlinkSync(out); // never leave the plain copy next to the encrypted one
  final = `${out}.gpg`;
}
console.log(
  `db-backup: wrote ${final} (${(statSync(final).size / 1024).toFixed(0)} KB)${process.env.BACKUP_PASSPHRASE ? ", encrypted" : ", NOT encrypted (set BACKUP_PASSPHRASE)"}`,
);
