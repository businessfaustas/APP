/**
 * Vercel build: apply migrations and seed reference data when a database is connected,
 * then build. Without a database the build still succeeds (the marketing pages work) and
 * prints how to connect one.
 */
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const hasDatabase = Boolean(process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim());

if (hasDatabase) {
  run("pnpm db:deploy");
  run("pnpm db:seed");
} else {
  console.warn(
    "\n⚠  No database connected yet, so migrations were skipped. The home page will work, but the app needs Postgres:\n" +
      "   Vercel project → Storage → Create Database → Neon (free) → Connect, then redeploy.\n",
  );
}
run("pnpm build");
