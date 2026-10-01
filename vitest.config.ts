import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts") },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/calc/**/*.ts"],
      exclude: ["lib/calc/**/*.test.ts", "lib/calc/index.ts", "lib/calc/types.ts"],
    },
  },
});
