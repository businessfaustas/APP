import { expect, test } from "@playwright/test";

import { analyze, LOTS, open, signInAsDemo } from "./helpers";
import { resetDemoRateLimit } from "./db";

/**
 * Regression tests: one per bug or promise we have fixed, so it can't come back unnoticed.
 */
test.describe("@regression", () => {
  test.beforeAll(resetDemoRateLimit);
  test("a shared report link never shows the owner's home ZIP", async ({ page, browser }) => {
    await signInAsDemo(page);
    await analyze(page, LOTS.audi);
    const id = page.url().split("/").pop()!;
    const res = await page.request.post(`/api/analyses/${id}/share`);
    expect(res.ok()).toBe(true);
    const { url } = (await res.json()) as { url?: string; token?: string };
    const link = url ?? `/r/${((await res.json()) as { token: string }).token}`;

    const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const shared = await anon.newPage();
    await shared.goto(new URL(link, "http://x").pathname); // the share URL uses the configured app address, so take just its path
    await expect(shared.getByTestId("deal-card")).toBeVisible();
    const html = await shared.content();
    expect(html).not.toContain("77002"); // the demo user's home ZIP
    await expect(shared.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await anon.close();
  });

  test("the Audi reference numbers do not move", async ({ page }) => {
    await signInAsDemo(page);
    await analyze(page, LOTS.audi);
    await expect(page.getByTestId("max-bid")).toHaveText("$3,100");
    await expect(page.getByTestId("deal-card")).toContainText("73");
  });

  test("a signed-in user opening someone else's report id gets a 404, not a crash", async ({ page }) => {
    await signInAsDemo(page);
    await page.goto("/app/analyses/clx0000000000000000000000");
    // The page streams, so the HTTP status is already 200 by the time notFound() fires; the visible result is what matters.
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
  });

  test("the cookie banner asks once, remembers the choice, and can be reopened", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await open(page, "/");
    const banner = page.getByRole("dialog", { name: /cookie preferences/i });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole("button", { name: "Essential only" })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Allow analytics" })).toBeVisible();
    await banner.getByRole("button", { name: "Essential only" }).click();
    await expect(banner).toBeHidden();
    await page.reload();
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
    await page.waitForTimeout(1000);
    await expect(banner).toBeHidden();
    await page.getByRole("button", { name: "Cookie settings" }).click();
    await expect(banner).toBeVisible();
    await ctx.close();
  });

  test("analytics are sent only after the visitor allows them", async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    const beacons: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/analytics") || r.url().includes("/api/vitals")) beacons.push(r.url());
    });
    await open(page, "/");
    await page.waitForTimeout(1500);
    expect(beacons, "nothing is sent before consent").toEqual([]);
    await page.getByRole("button", { name: "Allow analytics" }).click();
    await page.goto("/pricing");
    await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
    await expect.poll(() => beacons.length, { timeout: 10_000 }).toBeGreaterThan(0);
    await ctx.close();
  });

  test("creating an account needs the 18+ and terms tick, and sends nothing to Supabase without it", async ({ page }) => {
    await open(page, "/login");
    const createTab = page.getByRole("tab", { name: "Create account" });
    if ((await createTab.count()) === 0) test.skip(true, "Supabase sign-in is not configured in this environment (demo only).");
    const authCalls: string[] = [];
    page.on("request", (r) => r.url().includes("/auth/v1/") && authCalls.push(r.url()));
    await createTab.click();
    await page.getByLabel("Full name").fill("Jonas Jonaitis");
    await page.getByLabel("Email", { exact: true }).fill("jonas@example.com");
    await page.getByLabel("Phone number").fill("+37060012345");
    await page.getByLabel("Password", { exact: true }).fill("correct horse");
    await page.getByRole("button", { name: "Create account", exact: true }).last().click();
    await expect(page.getByText("Tick the box above to continue.")).toBeVisible();
    expect(authCalls, "nothing is sent before the box is ticked").toEqual([]);
  });

  test("an expired emailed link lands on sign-in with a plain message, never a raw error", async ({ page }) => {
    await page.goto("/auth/callback?code=expired-or-reused");
    await expect(page).toHaveURL(/\/login/);
    const alert = page.getByRole("alert").first();
    await expect(alert).toBeVisible();
    await expect(alert).not.toContainText(/code verifier|invalid request|PKCE/i);
  });

  test("the unsubscribe page rejects a forged link and accepts nothing from it", async ({ page }) => {
    await page.goto("/unsubscribe?t=forged.token");
    await page.getByRole("button", { name: "Unsubscribe" }).click();
    await expect(page.getByText(/isn't valid/i)).toBeVisible();
  });

  test("every subscribe and buy button has renewal and cancellation terms beside it", async ({ page }) => {
    await open(page, "/pricing");
    await expect(page.getByText(/renews automatically every month/i).first()).toBeVisible();
    await expect(page.getByText(/cancel any time in billing/i).first()).toBeVisible();
    await expect(page.getByText(/one-time payment of/i).first()).toBeVisible();
  });
  test("a lot with no photo shows a 'no preview' tile with the logo, not a car drawing", async ({ page }) => {
    await signInAsDemo(page);
    await open(page, "/app/history");
    const tile = page.getByTestId("no-preview").first();
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(/no preview available/i);
    await expect(tile.locator("svg").first()).toBeAttached(); // the logo behind the text
  });

  test("ticking every 'Before you bid' step stamps the checklist 'Ready to bid'", async ({ page }) => {
    await signInAsDemo(page);
    await open(page, "/app/history");
    await page.locator('a[href^="/app/analyses/"]').first().click();
    await page.waitForURL(/\/app\/analyses\/[^/]+$/);
    const list = page.getByTestId("checklist");
    await expect(list).toBeVisible({ timeout: 30_000 });
    const steps = list.locator("label");
    const n = await steps.count();
    expect(n).toBeGreaterThan(2);
    await steps.first().click();
    await expect(list.getByRole("checkbox").first()).toBeChecked();
    await expect(page.locator(".stamp:visible")).toHaveCount(0); // not ready yet
    for (let i = 1; i < n; i++) await steps.nth(i).click();
    await expect(page.locator(".stamp:visible")).toContainText(/ready to bid/i);
  });
});
