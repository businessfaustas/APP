import { expect, test } from "@playwright/test";

import { analyze, dealVerdict, expectNavigation, LOTS, open, signInAsDemo } from "./helpers";

test.beforeEach(async ({ page }) => {
  await signInAsDemo(page);
});

test("Audi A3 reference lot: GO with a $3,100 max bid", async ({ page }) => {
  await analyze(page, LOTS.audi);
  await expect(page.getByTestId("report-title")).toContainText(/audi a3/i);
  await expect(dealVerdict(page)).toHaveText(/GO/);
  await expect(page.getByTestId("max-bid")).toHaveText("$3,100");
  await expect(page.getByTestId("risk-flags")).toContainText("Missing key photos");
  await expect(page.getByTestId("disclaimer").first()).toBeVisible();
});

test("raising the labor rate to $100/h recalculates to BE CAUTIOUS at $2,375", async ({ page }) => {
  await analyze(page, LOTS.audi);
  const slider = page.getByTestId("labor-rate").getByRole("slider");
  await slider.focus();
  // $70/h default, $5 steps.
  for (let i = 0; i < 6; i++) await slider.press("ArrowRight");
  await expect(page.getByTestId("labor-rate-value")).toHaveText("$100/h");
  await expect(page.getByTestId("max-bid")).toHaveText("$2,375");
  await expect(dealVerdict(page)).toHaveText(/BE CAUTIOUS/);
});

test("non-repairable Civic is a hard WALK AWAY", async ({ page }) => {
  await analyze(page, LOTS.civic);
  await expect(dealVerdict(page)).toHaveText(/WALK AWAY/);
  await expect(page.getByTestId("risk-flags")).toContainText(/destruction|non-repairable/i);
});

test("watching a lot adds it to the watchlist", async ({ page }) => {
  await analyze(page, LOTS.f150);
  const watch = page.getByTestId("watch-button");
  // The demo account is shared between runs: start from "not watching".
  if ((await watch.textContent())?.includes("Watching")) {
    await watch.click();
    await expect(watch).toHaveText(/^\s*Watch\s*$/);
  }
  await watch.click();
  await expect(watch).toHaveText(/Watching/);
  await page.goto("/app/watchlist");
  await expect(page.getByRole("link", { name: /F-150/ }).first()).toBeVisible();
});

test("batch of three demo lots fills the compare table", async ({ page }) => {
  await open(page, "/app/compare");
  await page.getByRole("button", { name: "Compare 3 demo lots" }).click();
  await expectNavigation(page, /\/app\/compare\/[^/]+$/);
  const table = page.getByTestId("compare-table");
  await expect(table).toBeVisible();
  await expect(table.getByTestId("verdict-badge")).toHaveCount(3, { timeout: 45_000 });
  await expect(table).toContainText(/audi a3/i);
});
