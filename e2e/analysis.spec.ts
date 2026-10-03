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

test("a real Copart link the site won't let us read: four details from the lot page give a report", async ({ page }) => {
  // A fresh lot number each run, so nothing from an earlier run is reused.
  const lot = String(40_000_000 + Math.floor(Math.random() * 9_000_000));
  await open(page, "/app");
  await page
    .getByRole("textbox", { name: "Auction link, VIN or listing text" })
    .fill(`https://www.copart.com/lot/${lot}/salvage-2019-honda-civic-lx-tx-dallas`);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await expectNavigation(page, /\/app\/analyses\/[^/]+$/);

  const form = page.getByTestId("needs-input");
  await expect(form).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("prefill-summary")).toHaveText("2019 HONDA CIVIC LX · salvage · Dallas, TX");
  await page.getByTestId("quick-damage").click();
  await page.getByRole("option", { name: "Front end" }).click();
  await page.locator("#q-odo").fill("48000");
  await page.locator("#q-bid").fill("1800");
  await page.locator("#q-acv").fill("16900");
  await page.getByRole("button", { name: "Analyze this lot" }).click();

  await expect(page.getByTestId("deal-card")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("report-title")).toContainText(/honda civic/i);
  await expect(page.getByText(`Lot ${lot}`)).toBeVisible();
  await expect(dealVerdict(page)).toHaveText(/GO|BE CAUTIOUS|WALK AWAY/);
});
