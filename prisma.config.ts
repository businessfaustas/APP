import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { defineConfig } from "prisma/config";

import { databaseCa, directDatabaseUrl, prismaMigrateUrl } from "./lib/config/deployment";

// Migrations use the direct (non-pooled) connection when available.
const direct = directDatabaseUrl() ?? "postgresql://postgres:postgres@localhost:5432/auctionpulse";

// Supabase's certificate authority is not in the system store: give the migration engine a file to check against.
let caFile: string | undefined;
const ca = databaseCa(direct);
if (ca) {
  const dir = join(tmpdir(), "flagbid-db");
  mkdirSync(dir, { recursive: true });
  caFile = join(dir, "ca.crt");
  writeFileSync(caFile, `${ca}\n`);
}
const url = prismaMigrateUrl(direct, caFile);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url,
  },
});
