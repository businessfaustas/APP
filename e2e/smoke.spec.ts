import { expect, test } from "@playwright/test";

/**
 * Smoke tests: the few checks that prove a deployment is alive and safe. They only read, never
 * sign in or create anything, so they can run against production after every deploy:
 *   E2E_BASE_URL=https://your-domain pnpm test:smoke
 */
test.describe("@smoke public site", () => {
  test("the site is reachable and is our app (not a login wall in front of it)", async ({ request }) => {
    const res = await request.get("/");
    // A 401 here means the host (for example Vercel Deployment Protection) is answering instead of the app. Test the
    // public domain, or give the test the bypass secret (VERCEL_AUTOMATION_BYPASS_SECRET); see docs/LAUNCH-PLAN.md.
    expect(res.status(), "the app should answer, not a protection page in front of it").toBe(200);
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("home page renders with a title, one h1 and valid structured data", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/FlagBid/);
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
    await expect(page.locator("h1")).toHaveCount(1);
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length).toBeGreaterThan(0);
    const types = blocks.flatMap((b) => (JSON.parse(b) as { "@type": string }[]).map((x) => x["@type"]));
    expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite", "SoftwareApplication", "FAQPage"]));
    expect(errors).toEqual([]);
  });

  for (const path of ["/pricing", "/login", "/terms", "/privacy", "/dmca"]) {
    test(`${path} loads`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1, h2, [data-slot=card-title]").filter({ visible: true }).first()).toBeVisible();
    });
  }

  test("health endpoint reports a working database", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { ok: boolean; databaseReachable: boolean };
    expect(body.ok).toBe(true);
    expect(body.databaseReachable).toBe(true);
  });

  test("search and answer-engine files exist", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toMatch(/Sitemap:|Disallow: \//);
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<urlset");
    expect((await request.get("/llms.txt")).status()).toBe(200);
    expect((await request.get("/.well-known/security.txt")).status()).toBe(200);
    expect((await request.get("/favicon.ico")).status()).toBe(200);
    const og = await request.get("/opengraph-image");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toContain("image/png");
  });

  test("an unknown page is a real 404 with a way home", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /home page/i })).toBeVisible();
  });

  test("security headers are present", async ({ request }) => {
    const h = (await request.get("/")).headers();
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["strict-transport-security"]).toMatch(/max-age=\d+/);
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-powered-by"]).toBeUndefined();
  });
});

test.describe("@smoke access control", () => {
  test("signed-out visitors are sent to sign in from /app and /admin", async ({ request }) => {
    for (const path of ["/app", "/app/history", "/admin", "/admin/users", "/admin/monitoring"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([302, 307, 308], path).toContain(res.status());
      expect(res.headers().location, path).toMatch(/\/login\?next=/);
    }
  });

  test("private API routes refuse signed-out callers", async ({ request }) => {
    for (const [method, path] of [
      ["GET", "/api/analyses"],
      ["POST", "/api/analyses"],
      ["GET", "/api/account"],
      ["DELETE", "/api/account"],
      ["GET", "/api/settings"],
      ["POST", "/api/uploads"],
      ["POST", "/api/stripe/checkout"],
      ["GET", "/api/vin/1HGCM82633A004352"],
      ["PUT", "/api/admin/fees"],
      ["PATCH", "/api/admin/users"],
    ] as const) {
      const res = await request.fetch(path, { method, data: {} });
      expect([401, 403], `${method} ${path} returned ${res.status()}`).toContain(res.status());
      expect(res.headers()["content-type"] ?? "", `${method} ${path} was refused by something other than the app`).toContain("application/json");
    }
  });

  test("webhook and cron endpoints refuse unsigned callers", async ({ request }) => {
    expect([400, 503]).toContain((await request.post("/api/stripe/webhook", { data: "{}" })).status());
    expect([401, 404]).toContain((await request.get("/api/cron/maintenance")).status());
  });

  test("a cross-site form post to the API is blocked", async ({ request }) => {
    const res = await request.post("/api/analyses", { data: {}, headers: { origin: "https://evil.example" } });
    expect(res.status()).toBe(403);
    expect(res.headers()["content-type"] ?? "").toContain("application/json");
  });
});
