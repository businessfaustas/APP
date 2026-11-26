import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  appUrl,
  databaseCa,
  databaseUrl,
  demoModeEnabled,
  directDatabaseUrl,
  isSupabaseUrl,
  databasePoolMax,
  nodePgConfig,
  prismaMigrateUrl,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/config/deployment";
import { SUPABASE_ROOT_CA } from "@/lib/config/supabaseCa";

describe("deployment defaults", () => {
  it("accepts the database variable names Vercel integrations set", () => {
    expect(databaseUrl({ DATABASE_URL: "postgres://neon-pooled" })).toBe("postgres://neon-pooled");
    expect(databaseUrl({ POSTGRES_URL: "postgres://supabase" })).toBe("postgres://supabase");
    expect(databaseUrl({ DATABASE_URL: " ", POSTGRES_URL: "" })).toBeUndefined();
    expect(directDatabaseUrl({ DATABASE_URL: "postgres://pooled", DATABASE_URL_UNPOOLED: "postgres://direct" })).toBe("postgres://direct");
    expect(directDatabaseUrl({ POSTGRES_URL: "postgres://pooled", POSTGRES_URL_NON_POOLING: "postgres://direct" })).toBe("postgres://direct");
    expect(directDatabaseUrl({ DIRECT_URL: "postgres://explicit", DATABASE_URL_UNPOOLED: "postgres://direct" })).toBe("postgres://explicit");
    expect(directDatabaseUrl({ DATABASE_URL: "postgres://only" })).toBe("postgres://only");
  });

  it("finds the database under a custom integration prefix", () => {
    const e = {
      STORAGE_URL: "postgresql://pooled.neon.tech/db",
      STORAGE_URL_UNPOOLED: "postgresql://direct.neon.tech/db",
      STORAGE_PGHOST: "pooled.neon.tech",
      NEXT_PUBLIC_APP_URL: "https://flagbid.app",
    };
    expect(databaseUrl(e)).toBe("postgresql://pooled.neon.tech/db");
    expect(directDatabaseUrl(e)).toBe("postgresql://direct.neon.tech/db");
    expect(databaseUrl({ OTHER_URL: "https://example.com" })).toBeUndefined();
  });

  it("accepts Supabase's own variable names as well as the NEXT_PUBLIC_ ones", () => {
    expect(supabaseUrl({ SUPABASE_URL: "https://x.supabase.co" })).toBe("https://x.supabase.co");
    expect(supabaseUrl({ NEXT_PUBLIC_SUPABASE_URL: "https://a.supabase.co", SUPABASE_URL: "https://b.supabase.co" })).toBe("https://a.supabase.co");
    expect(supabaseAnonKey({ SUPABASE_ANON_KEY: "anon" })).toBe("anon");
    expect(supabaseAnonKey({ SUPABASE_PUBLISHABLE_KEY: "sb_publishable_1" })).toBe("sb_publishable_1");
    expect(supabaseAnonKey({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "mine", SUPABASE_ANON_KEY: "theirs" })).toBe("mine");
    expect(supabaseUrl({})).toBeUndefined();
    expect(supabaseAnonKey({ SUPABASE_ANON_KEY: "  " })).toBeUndefined();
  });

  it("turns demo sign-in off by default once Supabase is configured under any of those names", () => {
    expect(demoModeEnabled({})).toBe(true);
    expect(demoModeEnabled({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "k" })).toBe(false);
    expect(demoModeEnabled({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "k", DEMO_MODE: "true" })).toBe(true);
  });

  describe("database TLS", () => {
    const pooler = "postgres://postgres.abc:pw@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true";
    const neon = "postgres://u:p@ep-cool-123.eu-central-1.aws.neon.tech/neondb?sslmode=require";

    it("recognises Supabase hosts, and only those", () => {
      expect(isSupabaseUrl(pooler)).toBe(true);
      expect(isSupabaseUrl("postgres://u:p@db.abc.supabase.co:5432/postgres")).toBe(true);
      expect(isSupabaseUrl(neon)).toBe(false);
      expect(isSupabaseUrl("postgres://u:p@localhost:5432/x")).toBe(false);
      expect(isSupabaseUrl("not a url")).toBe(false);
      expect(isSupabaseUrl("postgres://u:p@evilsupabase.co:5432/x")).toBe(false);
    });

    it("checks Supabase connections against Supabase's certificate authority, never switching verification off", () => {
      const c = nodePgConfig(pooler, {});
      expect(c.ssl).toEqual({ ca: SUPABASE_ROOT_CA, rejectUnauthorized: true });
      expect(c.connectionString).not.toMatch(/sslmode/); // node-postgres would let it override the settings above
      expect(c.connectionString).toContain("pgbouncer=true");
      expect(SUPABASE_ROOT_CA).toMatch(/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----\s*$/);
    });

    it("leaves other providers alone, and lets DATABASE_SSL_CA name the authority for any of them", () => {
      expect(nodePgConfig(neon, {})).toEqual({ connectionString: neon });
      expect(databaseCa(neon, { DATABASE_SSL_CA: "PEM" })).toBe("PEM");
      expect(databaseCa(pooler, { DATABASE_SSL_CA: "line1\\nline2" })).toBe("line1\nline2");
      expect(nodePgConfig(neon, { DATABASE_SSL_CA: "PEM" }).ssl).toEqual({ ca: "PEM", rejectUnauthorized: true });
    });

    it("keeps each serverless instance to a few connections, so a burst of requests cannot use up the pooler's 200", () => {
      expect(databasePoolMax({})).toBeUndefined(); // local development and CI keep the library's default
      expect(databasePoolMax({ VERCEL: "1" })).toBe(3);
      expect(databasePoolMax({ VERCEL: "1", DATABASE_POOL_MAX: "5" })).toBe(5);
      expect(databasePoolMax({ DATABASE_POOL_MAX: "2" })).toBe(2);
      expect(databasePoolMax({ VERCEL: "1", DATABASE_POOL_MAX: "0" })).toBe(3); // nonsense is ignored
      expect(databasePoolMax({ VERCEL: "1", DATABASE_POOL_MAX: "lots" })).toBe(3);
      const c = nodePgConfig(pooler, { VERCEL: "1" });
      expect(c.max).toBe(3);
      expect(c.idleTimeoutMillis).toBe(10_000);
      expect(c.ssl).toEqual({ ca: SUPABASE_ROOT_CA, rejectUnauthorized: true }); // the pool limit does not change the TLS settings
      expect(nodePgConfig(neon, { VERCEL: "1" })).toEqual({ connectionString: neon, max: 3, idleTimeoutMillis: 10_000 });
    });

    it("every place that opens its own database connection goes through nodePgConfig (the seed script once did not, and a deploy failed)", () => {
      for (const file of ["lib/db/prisma.ts", "prisma/seed.ts", "scripts/check-rls.mjs", "scripts/db-restore-test.mjs"]) {
        expect(readFileSync(file, "utf8"), file).toContain("nodePgConfig(");
      }
    });

    it("points Prisma's migration engine at the certificate file", () => {
      expect(prismaMigrateUrl(pooler, "/tmp/ca.crt")).toContain("sslcert=%2Ftmp%2Fca.crt");
      expect(prismaMigrateUrl(neon, undefined)).toBe(neon);
    });
  });

  it("uses the explicit app URL, else the Vercel domain, else localhost", () => {
    expect(appUrl({ NEXT_PUBLIC_APP_URL: "https://flagbid.app/" })).toBe("https://flagbid.app");
    expect(appUrl({ VERCEL_PROJECT_PRODUCTION_URL: "ap.vercel.app", VERCEL_URL: "ap-git-x.vercel.app" })).toBe("https://ap.vercel.app");
    expect(appUrl({ VERCEL_URL: "ap-git-x.vercel.app" })).toBe("https://ap-git-x.vercel.app");
    expect(appUrl({})).toBe("http://localhost:3000");
  });
});
