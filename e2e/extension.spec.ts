import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { chromium, expect, test } from "@playwright/test";

// The Chrome extension on a Copart-style lot page. Copart itself is replaced by a local page
// (routed at the real URL), so the test never touches the live site.
const EXT = resolve("extension/dist");
const LOCAL_CHROMIUM = "/opt/pw-browsers/chromium";

const NAV = ["Skip to main content", "How it works", "Find vehicles", "Auctions", "Locations", "Sell my car", "Sign in", "Register"];
const row = (l: string, v: string) => `<div><span class="label">${l}</span> <span class="value">${v}</span></div>`;
const LOT_PAGE = `<!doctype html><html><head><title>2019 AUDI A3 PREMIUM | Copart</title></head><body>
<nav>${Array.from({ length: 60 }, (_, i) => `<a href="#">${NAV[i % NAV.length]}</a>`).join("\n")}</nav>
<main><h1>2019 AUDI A3 PREMIUM</h1>
${row("Lot Number:", "43562513")}${row("VIN:", "WAUAUGFF3K1******")}${row("Title Code:", "TX - SALVAGE CERTIFICATE")}
${row("Odometer:", "61,200 mi (ACTUAL)")}${row("Primary Damage:", "FRONT END")}${row("Estimated Retail Value:", "$21,450 USD")}
${row("Sale Location:", "TX - DALLAS")}${row("Current Bid:", "$2,100 USD")}
<h3>Similar vehicles</h3><div>2018 AUDI A4 PREMIUM</div></main>
<footer>© 2026 Copart Inc. All Rights Reserved</footer></body></html>`;

test.skip(!existsSync(join(EXT, "manifest.json")), "Build the extension first: pnpm extension:build");

test("extension: connect with a token, then analyze a Copart lot page in one click", async ({ baseURL }) => {
  const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "ap-ext-")), {
    headless: false,
    args: ["--headless=new", `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
    viewport: { width: 1280, height: 800 },
    ...(!process.env.CI && existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {}),
  });
  try {
    await ctx.route("https://www.copart.com/**", (r) => r.fulfill({ contentType: "text/html", body: LOT_PAGE }));
    const worker = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker"));
    const extId = new URL(worker.url()).host;
    // On install the extension opens its options page, sometimes in a tab we're about to use.
    await expect.poll(() => ctx.pages().some((p) => p.url().includes("options.html")), { timeout: 10_000 }).toBe(true);

    const app = await ctx.newPage();
    await app.goto(`${baseURL}/login`);
    await app.locator("html[data-hydrated]").waitFor({ state: "attached" });
    await app.getByRole("button", { name: "Continue as demo user" }).click();
    await app.waitForURL("**/app");
    const token = await app.evaluate(async () => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create-token" }),
      });
      return ((await res.json()) as { token: string }).token;
    });

    const options = await ctx.newPage();
    await options.goto(`chrome-extension://${extId}/options.html`);
    await options.fill("#apiBase", baseURL!);
    await options.fill("#token", token);
    await options.click("button[type=submit]");
    await options.click("#test");
    await expect(options.locator("#msg")).toHaveText(/Connected/, { timeout: 15_000 });

    const lot = await ctx.newPage();
    await lot.goto("https://www.copart.com/lot/43562513");
    await expect(lot.locator("#auctionpulse-root")).toBeAttached();
    const reportOpened = ctx.waitForEvent("page");
    // The button lives in a closed shadow root at the bottom-right corner.
    await lot.mouse.click(1280 - 130, 800 - 40);
    const report = await reportOpened;
    await expect(report.getByTestId("deal-card")).toBeVisible({ timeout: 45_000 });
    await expect(report.getByTestId("report-title")).toContainText("2019 AUDI A3");
    await expect(report.getByText("Lot 43562513")).toBeVisible();
  } finally {
    await ctx.close();
  }
});
