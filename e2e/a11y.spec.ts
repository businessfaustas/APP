import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { analyze, LOTS, open, signInAsDemo } from "./helpers";
import { resetDemoRateLimit } from "./db";

/**
 * Accessibility: axe-core (WCAG 2.1 A and AA rules) on the public pages and the signed-in app,
 * in both themes. Serious and critical problems fail the build; the rest are listed in the report.
 */
async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = blocking.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n   ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join("\n   ")}`,
  );
  expect(summary, `${label}\n${summary.join("\n")}`).toEqual([]);
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => localStorage.setItem("theme", t), theme);
  await page.reload();
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
  await page.waitForTimeout(400);
}

test.describe("@a11y public pages", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const path of ["/", "/pricing", "/login", "/terms", "/privacy", "/dmca"]) {
      test(`${path} (${theme})`, async ({ page }) => {
        await open(page, path);
        await setTheme(page, theme);
        await audit(page, `${path} ${theme}`);
      });
    }
  }

  test("the page has a skip link or landmark to reach the main content, and a visible focus ring", async ({ page }) => {
    await open(page, "/");
    await expect(page.locator("main, [role=main]").first()).toBeAttached();
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "none";
      const s = getComputedStyle(el);
      return `${s.outlineStyle}|${s.boxShadow}`;
    });
    expect(outline).not.toBe("none|none");
  });

  test("respects reduced motion", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await open(page, "/");
    const animated = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => a.playState === "running" && (a as CSSAnimation).animationName && !String((a as CSSAnimation).animationName).startsWith("none"))
          .length,
    );
    expect(animated).toBeLessThanOrEqual(2);
    await ctx.close();
  });
});

test.describe("@a11y signed-in app", () => {
  test.beforeAll(resetDemoRateLimit);
  for (const theme of ["light", "dark"] as const) {
    test(`dashboard and report (${theme})`, async ({ page }) => {
      await signInAsDemo(page);
      await open(page, "/app");
      await setTheme(page, theme);
      await audit(page, `/app ${theme}`);
      await analyze(page, LOTS.audi);
      await page.waitForTimeout(600);
      await audit(page, `report ${theme}`);
    });
  }
});
