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

test("the landing page shows a lobby of cars that take turns, with no buttons on it", async ({ page }) => {
  await open(page, "/");
  const lobby = page.getByTestId("car-lobby").first();
  const active = () => lobby.locator('[data-active="true"]').getAttribute("data-src");
  const first = await active();
  expect(first, "starts on the wrecked sedan the scan marks").toBe("/cars/sedan-wrecked.webp");
  await expect.poll(active, { timeout: 15_000 }).not.toBe(first);
  await expect(lobby.getByRole("button")).toHaveCount(0);
});

test("signed-out visitors are sent to sign in, keeping where they were going", async ({ page }) => {
  await page.goto("/app/watchlist");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fwatchlist/);
});
