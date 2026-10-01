/**
 * Vercel build: apply migrations and seed reference data when a database is connected,
 * then build. Without a database the build still succeeds (the marketing pages work) and
 * prints how to connect one.
 */
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
// Same rule as lib/config/deployment.ts: any …_URL variable holding a Postgres connection string.
const hasDatabase = Object.entries(process.env).some(
  ([key, value]) => /_URL(_UNPOOLED|_NON_POOLING)?$/i.test(key) && /^postgres(ql)?:\/\//i.test(value?.trim() ?? ""),
);

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
