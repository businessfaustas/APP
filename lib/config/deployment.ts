/**
 * Deployment-dependent settings with zero-config defaults for Vercel. Pure (no server-only),
 * so prisma.config.ts and the seed script can use it too.
 */
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

/** Public base URL for links in emails and share links: explicit setting, else the Vercel domain. */
export function appUrl(e: EnvLike = process.env): string {
  const explicit = e.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = e.VERCEL_PROJECT_PRODUCTION_URL?.trim() || e.VERCEL_URL?.trim();
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}
