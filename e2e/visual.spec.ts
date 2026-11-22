import { expect, test } from "@playwright/test";

import { open } from "./helpers";

/**
 * Visual regression: AI-assisted edits often break a layout while every functional test still
 * passes. These compare screenshots of the stable pages with saved baselines.
 *   pnpm test:visual            compare
 *   pnpm test:visual:update     accept the current look as the new baseline (review the diff first)
 * Baselines are per platform (Linux in CI), so they run as a separate, non-blocking CI job.
 */
const PAGES = ["/", "/pricing", "/login", "/terms"] as const;
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const vp of VIEWPORTS) {
  for (const theme of ["dark", "light"] as const) {
    for (const path of PAGES) {
      test(`@visual ${path} ${vp.name} ${theme}`, async ({ browser }) => {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: theme,
          reducedMotion: "reduce",
          storageState: {
            cookies: [
              { name: "fb_consent", value: "v1%3Aessential", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" },
            ],
            origins: [],
          },
        });
        await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
        const page = await ctx.newPage();
        await open(page, path);
        await page.waitForTimeout(800);
        await expect(page).toHaveScreenshot(`${path === "/" ? "home" : path.slice(1)}-${vp.name}-${theme}.png`, {
          fullPage: false,
          maxDiffPixelRatio: 0.02,
          animations: "disabled",
          mask: [page.locator("[data-visual-mask]"), page.locator("footer")],
        });
        await ctx.close();
      });
    }
  }
}
