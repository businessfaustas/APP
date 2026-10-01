import { describe, expect, it } from "vitest";

import { demoModeEnabled } from "@/lib/config/deployment";

describe("demo sign-in", () => {
  it("follows DEMO_MODE when it is set, in any case", () => {
    expect(demoModeEnabled({ DEMO_MODE: "true" })).toBe(true);
    expect(demoModeEnabled({ DEMO_MODE: " TRUE " })).toBe(true);
    expect(demoModeEnabled({ DEMO_MODE: "1" })).toBe(true);
    expect(demoModeEnabled({ DEMO_MODE: "false", NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" })).toBe(false);
    expect(demoModeEnabled({ DEMO_MODE: "true", NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" })).toBe(true);
  });

  it("is on by default until a real login is configured", () => {
    expect(demoModeEnabled({})).toBe(true);
    expect(demoModeEnabled({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" })).toBe(false);
  });
});
