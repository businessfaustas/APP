import { expect, test } from "@playwright/test";

import { en } from "../lib/i18n/messages/en";
import { lt } from "../lib/i18n/messages/lt";
import { dealVerdict, expectNavigation, LOTS, open } from "./helpers";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "ap_locale", value: "lt", url: baseURL! }]);
});

test("the landing page and sign-in are in Lithuanian, and the switcher goes back to English", async ({ page }) => {
  await open(page, "/");
  await expect(page.locator("html")).toHaveAttribute("lang", "lt");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(lt.landing.heroTitle);
  await expect(page.locator("#sample")).toContainText("$3,100");
  await expect(page.getByTestId("verdict-badge").first()).toHaveText(lt.domain.verdict.GO);

  await page.getByRole("button", { name: "en", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.landing.heroTitle);
  await page.getByRole("button", { name: "lt", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(lt.landing.heroTitle);
});

test("a demo report reads in Lithuanian with the same numbers", async ({ page }) => {
  await open(page, "/login");
  await page.getByRole("button", { name: lt.auth.continueDemo }).click();
  await page.waitForURL("**/app");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(lt.dash.heading);

  await open(page, "/app");
  await page.getByRole("textbox", { name: lt.analyze.inputLabel }).fill(LOTS.audi);
  await page.getByRole("button", { name: lt.analyze.analyze, exact: true }).click();
  await expectNavigation(page, /\/app\/analyses\/[^/]+$/);
  await expect(page.getByTestId("deal-card")).toBeVisible({ timeout: 45_000 });

  await expect(dealVerdict(page)).toHaveText(lt.domain.verdict.GO);
  await expect(page.getByTestId("max-bid")).toHaveText("$3,100");
  await expect(page.getByTestId("deal-card")).toContainText(lt.report.doNotBidAbove);
  await expect(page.getByText("Verdiktas: PIRKTI — nestatykite daugiau nei $3,100")).toBeVisible();
  await expect(page.getByTestId("risk-flags")).toContainText(lt.gen.flags.FEE_TABLE_PLACEHOLDER.title);
  await expect(page.getByTestId("checklist")).toContainText(lt.gen.checklist.nicb);

  await page.getByRole("tab", { name: lt.report.tabRepair }).click();
  await expect(page.getByTestId("repair-table")).toContainText(lt.gen.parts.front_bumper_cover);
  await page.getByRole("tab", { name: lt.report.tabCosts }).click();
  await expect(page.getByTestId("scenario-table")).toContainText(lt.gen.waterfall.profit);
});
