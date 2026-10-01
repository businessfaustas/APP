/**
 * Deployment-dependent settings with zero-config defaults for Vercel. Pure (no server-only),
 * so prisma.config.ts and the seed script can use it too.
 */
type EnvLike = Record<string, string | undefined>;

/**
 * Runtime Postgres URL. Accepts the names Vercel's database integrations set:
 * Neon sets DATABASE_URL, Supabase sets POSTGRES_URL.
 */
export function databaseUrl(e: EnvLike = process.env): string | undefined {
  return e.DATABASE_URL?.trim() || e.POSTGRES_URL?.trim() || undefined;
}

/** Direct (non-pooled) URL for migrations, falling back to the runtime URL. */
export function directDatabaseUrl(e: EnvLike = process.env): string | undefined {
  return e.DIRECT_URL?.trim() || e.DATABASE_URL_UNPOOLED?.trim() || e.POSTGRES_URL_NON_POOLING?.trim() || databaseUrl(e);
}

/** Public base URL for links in emails and share links: explicit setting, else the Vercel domain. */
export function appUrl(e: EnvLike = process.env): string {
  const explicit = e.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = e.VERCEL_PROJECT_PRODUCTION_URL?.trim() || e.VERCEL_URL?.trim();
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}
