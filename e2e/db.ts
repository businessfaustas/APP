import { Client } from "pg";

/**
 * The suite shares one demo account, and the app limits each user to 30 analyses an hour. The
 * heavier specs clear that counter before they start so the order of the files never matters.
 * Does nothing against a deployed URL (no database to reach) or when there is no DATABASE_URL.
 */
export async function resetDemoRateLimit(): Promise<void> {
  if (process.env.E2E_REMOTE === "1" || process.env.SMOKE_ONLY === "1") return;
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env");
    } catch {
      // no .env: CI provides DATABASE_URL
    }
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  const db = new Client({ connectionString, connectionTimeoutMillis: 3_000 });
  try {
    await db.connect();
    await db.query(`DELETE FROM "RateLimitHit" WHERE key = $1 OR key = $2`, ["analysis:demo-user", "api-token:demo-user"]);
  } catch {
    // best effort: a test that really hits the limit will say so
  } finally {
    await db.end().catch(() => undefined);
  }
}
