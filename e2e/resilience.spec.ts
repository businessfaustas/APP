import { devices, expect, test, type Page } from "@playwright/test";

import { LOTS, open, signInAsDemo } from "./helpers";
import { resetDemoRateLimit } from "./db";

/**
 * Real-world conditions: small and mid-range phones, tablets, a slow mobile network with a
 * throttled CPU, and a dropped connection mid-action. These are emulations in Chromium (the
 * only browser installed here); CI also runs the smoke tests in Firefox and WebKit.
 */
const DEVICES = ["Pixel 5", "iPhone 13", "iPhone SE", "Galaxy S9+", "iPad Mini", "Galaxy Tab S4"] as const;

function emulated(name: (typeof DEVICES)[number]) {
  const { defaultBrowserType: _ignored, ...rest } = devices[name]; // the browser is chosen by the project, not the device
  void _ignored;
  return rest;
}

async function noHorizontalScroll(page: Page, label: string) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(scrollWidth, `${label}: page is wider than the screen`).toBeLessThanOrEqual(innerWidth + 1);
}

test.beforeAll(resetDemoRateLimit);

for (const name of DEVICES) {
  test.describe(`@devices ${name}`, () => {
    test.use(emulated(name));

    test("public pages fit the screen and the main call to action is reachable", async ({ page }) => {
      for (const path of ["/", "/pricing", "/login", "/terms"]) {
        await open(page, path);
        await noHorizontalScroll(page, `${name} ${path}`);
      }
      await open(page, "/");
      await expect(page.getByRole("link", { name: /analyze a lot/i }).first()).toBeVisible();
    });

    test("the signed-in app fits the screen: dashboard, report and billing", async ({ page }) => {
      await signInAsDemo(page);
      await noHorizontalScroll(page, `${name} /app`);
      await open(page, "/app");
      await page.getByRole("textbox", { name: "Auction link, VIN or listing text" }).fill(LOTS.audi);
      await page.getByRole("button", { name: "Analyze", exact: true }).click();
      await page.waitForURL(/\/app\/analyses\/[^/]+$/);
      await expect(page.getByTestId("deal-card")).toBeVisible({ timeout: 45_000 });
      await noHorizontalScroll(page, `${name} report`);
      await open(page, "/app/billing");
      await noHorizontalScroll(page, `${name} billing`);
    });
  });
}

test.describe("@slow slow mobile network and a slow phone", () => {
  test.use(emulated("Pixel 5"));

  test("the landing page becomes usable within the budget on slow 4G with a 4x slower CPU", async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    // Roughly Chrome's "Slow 4G" profile: 1.6 Mbps down, 750 Kbps up, 150 ms latency.
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const started = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toBeVisible({ timeout: 15_000 });
    const headingAt = Date.now() - started;
    await page.locator("html[data-hydrated]").waitFor({ state: "attached", timeout: 30_000 });
    const interactiveAt = Date.now() - started;
    test.info().annotations.push({ type: "timing", description: `h1 visible ${headingAt} ms, interactive ${interactiveAt} ms` });
    expect(headingAt, "headline visible").toBeLessThan(8_000);
    expect(interactiveAt, "page interactive").toBeLessThan(20_000);
  });

  test("the app shows loading skeletons, not a blank screen, while a page loads slowly", async ({ page, context }) => {
    await signInAsDemo(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 400,
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (200 * 1024) / 8,
    });
    await page.goto("/app/history", { waitUntil: "commit" });
    await expect(page.locator("body")).not.toBeEmpty();
    await page.locator("html[data-hydrated]").waitFor({ state: "attached", timeout: 40_000 });
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});

test.describe("@offline a dropped connection", () => {
  test("tells the user and recovers instead of spinning forever", async ({ page, context }) => {
    await signInAsDemo(page);
    await open(page, "/app");
    await page.getByRole("textbox", { name: "Auction link, VIN or listing text" }).fill(LOTS.audi);
    await context.setOffline(true);
    await expect(page.getByRole("status").filter({ hasText: /you're offline/i })).toBeVisible();
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(page.locator('[data-sonner-toast][data-type="error"]').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Analyze", exact: true })).toBeEnabled(); // not stuck in a loading state
    await context.setOffline(false);
    await expect(page.getByRole("status").filter({ hasText: /you're offline/i })).toBeHidden();
  });
});
