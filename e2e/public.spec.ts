import { expect, test } from "@playwright/test";

import { open } from "./helpers";

test("landing page shows the live sample report and pricing", async ({ page }) => {
  await open(page, "/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Know your max bid before you bid.");
  await expect(page.locator("#sample")).toContainText("$3,100");
  await expect(page.locator("#pricing")).toContainText("$39");
  await page.getByRole("link", { name: "Privacy Policy" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy Policy");
});

test("signed-out visitors are sent to sign in, keeping where they were going", async ({ page }) => {
  await page.goto("/app/watchlist");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fwatchlist/);
});
