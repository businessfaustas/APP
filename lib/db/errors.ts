import { databaseUrl } from "@/lib/config/deployment";

/** A short, secret-free explanation of why the database can't be used, for people setting the app up. */
export function explainDatabaseError(err: unknown): string {
  if (!databaseUrl()) {
    return "the database isn't connected yet. In Vercel, open Storage, connect a Postgres database (Neon is free) and redeploy.";
  }
  const raw = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string } | null)?.code;
  if (code === "P2021" || /does not exist/i.test(raw)) {
    return "the database tables haven't been created yet. Redeploy the project so the build can set them up.";
  }
  const detail = raw
    .replace(/postgres(ql)?:\/\/\S+/gi, "[database URL]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return `the database couldn't be reached (${detail || "unknown error"}).`;
}
