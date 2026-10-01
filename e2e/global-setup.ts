import { Client } from "pg";

/**
 * The e2e suite shares the demo account, and the app limits each user to 30 analyses an
 * hour. Clear the demo user's counter so repeated local runs don't trip the limit.
 */
export default async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env");
    } catch {
      // no .env — CI provides DATABASE_URL in the environment
    }
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return;
  const db = new Client({ connectionString });
  await db.connect();
  try {
    await db.query(`DELETE FROM "RateLimitHit" WHERE key = $1`, ["analysis:demo-user"]);
  } finally {
    await db.end();
  }
}
