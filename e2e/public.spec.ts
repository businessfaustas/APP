import { expect, test } from "@playwright/test";

import { open } from "./helpers";

test("landing page shows the live sample report and pricing", async ({ page }) => {
  await open(page, "/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Know your max bid before you bid.");
  await expect(page.locator("#sample")).toContainText("$3,100");
  await expect(page.locator("#pricing")).toContainText("€29");
  await expect(page.locator("#pricing")).toContainText("€199");
  await page.getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy Policy");
});

test("the landing page shows a lobby of cars that take turns, and it can be paused", async ({ page }) => {
  await open(page, "/");
  const lobby = page.getByTestId("car-lobby").first();
  const active = () => lobby.locator('[data-active="true"]').getAttribute("data-src");
  const first = await active();
  expect(first, "starts on the wrecked sedan the scan marks").toBe("/cars/sedan-wrecked.webp");
  await expect.poll(active, { timeout: 15_000 }).not.toBe(first);
  await page.getByRole("button", { name: "Pause the cars" }).click();
  await page.mouse.move(0, 0);
  const held = await active();
  await page.waitForTimeout(5000);
  expect(await active(), "paused, so the same car is still there").toBe(held);
  await page.getByRole("button", { name: "Show car 1 of 8" }).click();
  expect(await active()).toBe("/cars/sedan-wrecked.webp");
});

test("signed-out visitors are sent to sign in, keeping where they were going", async ({ page }) => {
  await page.goto("/app/watchlist");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fwatchlist/);
});
