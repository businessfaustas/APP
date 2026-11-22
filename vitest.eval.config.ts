import path from "node:path";

import { defineConfig } from "vitest/config";

/** Evaluations: `pnpm eval` (offline, no key) or `pnpm eval:live` (also calls the real model). */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts") },
  },
  test: { environment: "node", include: ["evals/**/*.eval.ts"], testTimeout: 60_000 },
});
