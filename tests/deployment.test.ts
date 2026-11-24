import { describe, expect, it } from "vitest";

import { appUrl, databaseUrl, demoModeEnabled, directDatabaseUrl, supabaseAnonKey, supabaseUrl } from "@/lib/config/deployment";

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

  it("uses the explicit app URL, else the Vercel domain, else localhost", () => {
    expect(appUrl({ NEXT_PUBLIC_APP_URL: "https://flagbid.app/" })).toBe("https://flagbid.app");
    expect(appUrl({ VERCEL_PROJECT_PRODUCTION_URL: "ap.vercel.app", VERCEL_URL: "ap-git-x.vercel.app" })).toBe("https://ap.vercel.app");
    expect(appUrl({ VERCEL_URL: "ap-git-x.vercel.app" })).toBe("https://ap-git-x.vercel.app");
    expect(appUrl({})).toBe("http://localhost:3000");
  });
});
