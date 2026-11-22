/**
 * Fails when any table in the public schema has row-level security switched off, or when the
 * Supabase API roles (anon, authenticated) can read a table. Run after migrations (CI does).
 *
 *   node scripts/check-rls.mjs            # uses DATABASE_URL
 */
import "dotenv/config";
import pg from "pg";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!url) {
  console.error("check-rls: set DATABASE_URL");
  process.exit(2);
}
const client = new pg.Client({ connectionString: url, ssl: /sslmode=require|supabase\.co|neon\.tech/.test(url) ? { rejectUnauthorized: false } : undefined });
await client.connect();
try {
  const tables = (await client.query(`SELECT c.relname AS name, c.relrowsecurity AS rls
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname`)).rows;
  const open = tables.filter((t) => !t.rls).map((t) => t.name);
  const policies = (await client.query(`SELECT tablename, policyname, qual FROM pg_policies WHERE schemaname = 'public'`)).rows;
  const permissive = policies.filter((p) => !p.qual || /^\(?true\)?$/i.test(p.qual.trim()));
  const grants = (await client.query(`SELECT table_name, grantee FROM information_schema.role_table_grants
      WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated') GROUP BY 1, 2`)).rows;
  let bad = false;
  if (open.length) { bad = true; console.error(`RLS is OFF on: ${open.join(", ")}`); }
  if (permissive.length) { bad = true; console.error(`Wide-open policies: ${permissive.map((p) => `${p.tablename}.${p.policyname}`).join(", ")}`); }
  if (grants.length) { bad = true; console.error(`API roles still hold privileges on: ${[...new Set(grants.map((g) => g.table_name))].join(", ")}`); }
  if (bad) process.exit(1);
  console.log(`check-rls: ok (${tables.length} tables, RLS on for all, no open policies, no API-role grants)`);
} finally {
  await client.end();
}
