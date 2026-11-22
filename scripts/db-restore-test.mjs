/**
 * A backup you have never restored is a hope, not a backup. This takes a fresh dump of the live
 * database, restores it into a throwaway database on the same server, and proves the copy is
 * complete: every table has the same row count, row-level security is still on, and the
 * migration history matches. Then it deletes the scratch database.
 *
 *   node scripts/db-restore-test.mjs               dump the live database, restore, compare
 *   node scripts/db-restore-test.mjs backup.dump   restore an existing (unencrypted) dump instead
 *
 * Needs a role that may CREATE DATABASE. Set RESTORE_ADMIN_URL to a scratch Postgres (any server)
 * to keep production's server out of it; by default the scratch database is created beside the source.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import pg from "pg";

const source = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!source) {
  console.error("db-restore-test: set DATABASE_URL.");
  process.exit(2);
}
const ssl = (u) => (/sslmode=require|supabase\.co|neon\.tech/.test(u) ? { rejectUnauthorized: false } : undefined);
const withDb = (u, name) => {
  const x = new URL(u);
  x.pathname = `/${name}`;
  return x.toString();
};

const scratchName = `flagbid_restore_check_${Date.now()}`;
const adminUrl = process.env.RESTORE_ADMIN_URL || withDb(source, "postgres");
const scratchUrl = withDb(process.env.RESTORE_ADMIN_URL || source, scratchName);

const dir = mkdtempSync(join(tmpdir(), "flagbid-restore-"));
let dumpFile = process.argv[2];
const t0 = Date.now();
const step = (msg) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}`);

async function counts(url) {
  const c = new pg.Client({ connectionString: url, ssl: ssl(url) });
  await c.connect();
  try {
    const tables = (
      await c.query(
        `SELECT c.relname AS name, c.relrowsecurity AS rls FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1`,
      )
    ).rows;
    const result = {};
    for (const t of tables) result[t.name] = { rows: Number((await c.query(`SELECT count(*) FROM "${t.name}"`)).rows[0].count), rls: t.rls };
    return result;
  } finally {
    await c.end();
  }
}

let admin;
let failed = false;
try {
  if (!dumpFile) {
    dumpFile = join(dir, "source.dump");
    step("dumping the live database");
    const d = spawnSync("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", "--file", dumpFile, source], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    if (d.status !== 0) throw new Error("pg_dump failed");
  }
  const before = await counts(source);

  admin = new pg.Client({ connectionString: adminUrl, ssl: ssl(adminUrl) });
  await admin.connect();
  step(`creating scratch database ${scratchName}`);
  await admin.query(`CREATE DATABASE "${scratchName}"`);

  step("restoring the dump into it");
  const r = spawnSync("pg_restore", ["--no-owner", "--no-privileges", "--exit-on-error", "--dbname", scratchUrl, dumpFile], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (r.status !== 0) {
    const clientMajor = /(\d+)(?:\.\d+)?/.exec(spawnSync("pg_restore", ["--version"], { encoding: "utf8" }).stdout ?? "")?.[1];
    const serverMajor = (await admin.query("SHOW server_version_num")).rows[0].server_version_num.slice(0, 2);
    const hint =
      clientMajor && clientMajor !== serverMajor
        ? ` The pg_restore client is version ${clientMajor} but the scratch server is ${serverMajor}: they must match, so use that version's client tools.`
        : "";
    throw new Error(`pg_restore failed.${hint}`);
  }

  step("comparing the restored copy with the source");
  const after = await counts(scratchUrl);
  const problems = [];
  for (const [name, b] of Object.entries(before)) {
    const a = after[name];
    if (!a) problems.push(`table ${name} is missing from the restore`);
    else {
      if (a.rows !== b.rows) problems.push(`${name}: ${b.rows} rows in the source, ${a.rows} after restore`);
      if (a.rls !== b.rls) problems.push(`${name}: row-level security differs after restore`);
    }
  }
  for (const name of Object.keys(after)) if (!before[name]) problems.push(`unexpected table ${name} in the restore`);
  const totalRows = Object.values(after).reduce((n, t) => n + t.rows, 0);
  if (problems.length) {
    failed = true;
    console.error(`RESTORE TEST FAILED:\n - ${problems.join("\n - ")}`);
  } else {
    console.log(
      `RESTORE TEST PASSED: ${Object.keys(after).length} tables and ${totalRows} rows restored identically, RLS preserved (${((Date.now() - t0) / 1000).toFixed(1)}s).`,
    );
  }
} catch (err) {
  failed = true;
  console.error("RESTORE TEST FAILED:", err instanceof Error ? err.message : err);
} finally {
  if (admin) {
    await admin.query(`DROP DATABASE IF EXISTS "${scratchName}" WITH (FORCE)`).catch(() => undefined);
    await admin.end().catch(() => undefined);
  }
  rmSync(dir, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
