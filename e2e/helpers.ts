import { expect, type Page } from "@playwright/test";

export const LOTS = {
  audi: "https://www.copart.com/lot/90000001",
  f150: "https://bid.cars/en/lot/1-90000003/2020-Ford-F-150",
  civic: "https://www.copart.com/lot/90000005",
} as const;

/** Navigates and waits until React has hydrated, so clicks and typing reach the handlers. */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
}

/** Waits for a client-side navigation, failing fast with the toast text if the app shows an error instead. */
export async function expectNavigation(page: Page, url: RegExp) {
  let settled = false;
  const errorToast = page.locator('[data-sonner-toast][data-type="error"]').first();
  const toastFailure = errorToast.waitFor().then(
    async () => {
      if (!settled) throw new Error(`App showed an error instead of navigating: ${await errorToast.textContent()}`);
      return new Promise<never>(() => {});
    },
    // the page closed first — nothing to report
    () => new Promise<never>(() => {}),
  );
  try {
    await Promise.race([page.waitForURL(url), toastFailure]);
  } finally {
    settled = true;
  }
}

export async function signInAsDemo(page: Page) {
  await open(page, "/login");
  await page.getByRole("button", { name: "Continue as demo user" }).click();
  await page.waitForURL("**/app");
}

/** Pastes a lot link on the dashboard and waits for the finished report. */
export async function analyze(page: Page, input: string) {
  await open(page, "/app");
  await page.getByRole("textbox", { name: "Auction link, VIN or listing text" }).fill(input);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await expectNavigation(page, /\/app\/analyses\/[^/]+$/);
  await expect(page.getByTestId("deal-card")).toBeVisible({ timeout: 45_000 });
}

export function dealVerdict(page: Page) {
  return page.getByTestId("deal-card").getByTestId("verdict-badge");
}
