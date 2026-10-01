import "dotenv/config";
import { defineConfig } from "prisma/config";

import { directDatabaseUrl } from "./lib/config/deployment";

// Migrations use the direct (non-pooled) connection when available.
const url = directDatabaseUrl() ?? "postgresql://postgres:postgres@localhost:5432/auctionpulse";

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
