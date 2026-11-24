/**
 * Deployment-dependent settings with zero-config defaults for Vercel. Pure (no server-only),
 * so prisma.config.ts and the seed script can use it too.
 */
import { SUPABASE_ROOT_CA } from "./supabaseCa";

type EnvLike = Record<string, string | undefined>;

const POSTGRES = /^postgres(ql)?:\/\//i;
const DIRECT_KEY = /(UNPOOLED|NON_POOLING|DIRECT)/i;

/** Every `…_URL` variable holding a Postgres connection string, in a stable order. */
function postgresVars(e: EnvLike): { key: string; value: string }[] {
  return Object.keys(e)
    .filter((key) => /_URL(_UNPOOLED|_NON_POOLING)?$/i.test(key) && POSTGRES.test(e[key]?.trim() ?? ""))
    .sort()
    .map((key) => ({ key, value: e[key]!.trim() }));
}

/**
 * Runtime Postgres URL. Prefers DATABASE_URL (Neon) and POSTGRES_URL (Supabase); otherwise any
 * pooled `…_URL` holding a Postgres URL, so a Vercel integration's custom prefix (for example
 * STORAGE_URL) still works.
 */
export function databaseUrl(e: EnvLike = process.env): string | undefined {
  const named = e.DATABASE_URL?.trim() || e.POSTGRES_URL?.trim();
  if (named) return named;
  return postgresVars(e).find((v) => !DIRECT_KEY.test(v.key))?.value ?? postgresVars(e)[0]?.value;
}

/** Direct (non-pooled) URL for migrations, falling back to the runtime URL. */
export function directDatabaseUrl(e: EnvLike = process.env): string | undefined {
  const named = e.DIRECT_URL?.trim() || e.DATABASE_URL_UNPOOLED?.trim() || e.POSTGRES_URL_NON_POOLING?.trim();
  if (named) return named;
  return postgresVars(e).find((v) => DIRECT_KEY.test(v.key))?.value ?? databaseUrl(e);
}

const SUPABASE_HOST = /(^|\.)supabase\.(co|com)$/i;

/** True for Supabase's direct and pooler hosts, whose certificates are signed by Supabase's own authority. */
export function isSupabaseUrl(url: string): boolean {
  try {
    return SUPABASE_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * The certificate authority to check the database's certificate against: DATABASE_SSL_CA when set (any provider),
 * else Supabase's own root for Supabase hosts, else none (the system's trusted authorities, as for Neon).
 */
export function databaseCa(url: string, e: EnvLike = process.env): string | undefined {
  const custom = e.DATABASE_SSL_CA?.trim();
  if (custom) return custom.replace(/\\n/g, "\n");
  return isSupabaseUrl(url) ? SUPABASE_ROOT_CA : undefined;
}

/**
 * Pool settings for node-postgres (the app and the seed script). node-postgres lets a `sslmode` in the connection
 * string override explicit TLS settings, so when a CA applies the `sslmode` is removed and the settings are given
 * explicitly: always encrypted, certificate and host name always checked.
 */
export function nodePgConfig(url: string, e: EnvLike = process.env): { connectionString: string; ssl?: { ca: string; rejectUnauthorized: true } } {
  const ca = databaseCa(url, e);
  if (!ca) return { connectionString: url };
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  u.searchParams.delete("sslrootcert");
  return { connectionString: u.toString(), ssl: { ca, rejectUnauthorized: true } };
}

/** Connection string for Prisma's migration engine: points it at a file holding the CA to check the server against. */
export function prismaMigrateUrl(url: string, caFile: string | undefined): string {
  if (!caFile) return url;
  const u = new URL(url);
  u.searchParams.set("sslcert", caFile);
  if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
  return u.toString();
}

/** Supabase project URL: the app's own name first, then the plain name Vercel's Supabase integration sets. */
export function supabaseUrl(e: EnvLike = process.env): string | undefined {
  return e.NEXT_PUBLIC_SUPABASE_URL?.trim() || e.SUPABASE_URL?.trim() || undefined;
}

/** The public (anon / publishable) key, under any of the names Supabase and its Vercel integration use. */
export function supabaseAnonKey(e: EnvLike = process.env): string | undefined {
  const names = ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY"];
  for (const n of names) {
    const v = e[n]?.trim();
    if (v) return v;
  }
  return undefined;
}

/**
 * Demo sign-in ("Continue as demo user"). DEMO_MODE wins when set (true/1/yes/on, any case).
 * When it isn't set, demo sign-in stays on until a real login (Supabase) is configured, so a
 * fresh deployment is never left without a way in.
 */
export function demoModeEnabled(e: EnvLike = process.env): boolean {
  const raw = e.DEMO_MODE?.trim().toLowerCase();
  if (raw) return ["true", "1", "yes", "on"].includes(raw);
  return !(supabaseUrl(e) && supabaseAnonKey(e));
}

/** Public base URL for links in emails and share links: explicit setting, else the Vercel domain. */
export function appUrl(e: EnvLike = process.env): string {
  const explicit = e.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = e.VERCEL_PROJECT_PRODUCTION_URL?.trim() || e.VERCEL_URL?.trim();
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}
