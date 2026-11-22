import { randomUUID } from "node:crypto";

import pg from "pg";

/** Integration tests use the real database when one is reachable, and skip cleanly when not. */
export function loadEnv(): void {
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env");
    } catch {
      // CI supplies DATABASE_URL in the environment
    }
  }
}

export async function canConnect(): Promise<boolean> {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  const c = new pg.Client({ connectionString: url, connectionTimeoutMillis: 2_000 });
  try {
    await c.connect();
    await c.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await c.end().catch(() => undefined);
  }
}

export const uid = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;
