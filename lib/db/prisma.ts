import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { databaseUrl } from "@/lib/config/deployment";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = databaseUrl();
  if (!connectionString) {
    throw new Error("No database configured. Set DATABASE_URL (or connect a Postgres database to the Vercel project) and redeploy.");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function client(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

/**
 * Created on first use rather than at import, so `next build` and pages that never touch the
 * database (the marketing pages) work before a database is connected.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value: unknown = Reflect.get(c, prop, c);
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(c) : value;
  },
});
