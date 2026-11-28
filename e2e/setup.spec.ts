import { expect, test } from "@playwright/test";

import { expectNavigation, open, signInAsDemo } from "./helpers";

/** The demo account is shared with every other test, so each run puts its settings back, even when an assertion fails. */
async function restoreUsDefaults(page: import("@playwright/test").Page) {
  const res = await page.request.post("/api/setup", { data: { resale: { kind: "US", homeZip: "77002" }, hasLicence: true } });
  expect(res.ok()).toBe(true);
}

test("the one-time setup turns three answers into export settings", async ({ page }) => {
  await signInAsDemo(page);
  try {
    await open(page, "/app/setup");
    const save = page.getByTestId("setup-save");
    await expect(save).toBeDisabled(); // nothing answered yet

    await page.getByRole("radio", { name: /Export to Lithuania/ }).check();
    await expect(page.getByText("Do you have a VAT number?")).toBeVisible(); // asked only for an export
    await page.getByRole("radio", { name: /Yes, I'm VAT-registered/ }).check();
    await expect(save).toBeDisabled(); // the licence question is still open
    await page.getByRole("radio", { name: /Through a broker/ }).check();
    await page.getByLabel(/broker's fee per car/i).fill("450");
    await expect(save).toBeEnabled();
    await save.click();
    await expectNavigation(page, /\/app$/);

    const { settings } = (await (await page.request.get("/api/settings")).json()) as { settings: Record<string, unknown> };
    expect(settings).toMatchObject({ exitStrategy: "EXPORT", vatRecoverable: true, buyerType: "PUBLIC_VIA_BROKER", brokerFee: 450, rebuiltFactorBps: 8000 });
    expect(settings.exportProfileId).toBeTruthy();
  } finally {
    await restoreUsDefaults(page);
  }
});

test("a US reseller is asked for a ZIP and no VAT question", async ({ page }) => {
  await signInAsDemo(page);
  try {
    await open(page, "/app/setup");
    await page.getByRole("radio", { name: /In the USA/ }).check();
    await expect(page.getByText("Do you have a VAT number?")).toHaveCount(0);
    await page.getByLabel(/Your US ZIP code/).fill("6060");
    await expect(page.getByText("Enter a 5-digit US ZIP code.")).toBeVisible();
    await page.getByLabel(/Your US ZIP code/).fill("60601");
    await page.getByRole("radio", { name: /With my own licence/ }).check();
    await page.getByTestId("setup-save").click();
    await expectNavigation(page, /\/app$/);
    const { settings } = (await (await page.request.get("/api/settings")).json()) as { settings: Record<string, unknown> };
    expect(settings).toMatchObject({ exitStrategy: "RETAIL_REBUILT", homeZip: "60601", buyerType: "LICENSED_DEALER" });
  } finally {
    await restoreUsDefaults(page);
  }
});

test("the settings page links to the setup", async ({ page }) => {
  await signInAsDemo(page);
  await open(page, "/app/settings");
  await page.getByRole("link", { name: "Run the setup again" }).click();
  await expect(page).toHaveURL(/\/app\/setup$/);
});
