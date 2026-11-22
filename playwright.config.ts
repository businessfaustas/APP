import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against demo mode (DEMO_MODE=true, seeded database) — no API keys.
 * Locally they reuse a running `pnpm dev`; in CI they start the production build.
 */
const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
// Sandboxes with a preinstalled Chromium (PLAYWRIGHT_BROWSERS_PATH) can point at it directly.
const localChromium = "/opt/pw-browsers/chromium";

export default defineConfig({
  testDir: "./e2e",
  // The setup clears the demo user's rate-limit counter in the local database; against a deployed URL there is nothing to clear.
  globalSetup: process.env.E2E_BASE_URL ? undefined : "./e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    // The cookie banner is covered by its own test; everywhere else it would sit on top of the page.
    storageState: {
      cookies: [
        {
          name: "fb_consent",
          value: "v1%3Aessential",
          domain: new URL(baseURL).hostname,
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /visual\.spec/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1366, height: 900 },
        launchOptions: !process.env.CI && existsSync(localChromium) ? { executablePath: localChromium } : {},
      },
    },
    // Screenshot comparison runs on its own (pnpm test:visual): baselines depend on the platform.
    {
      name: "visual",
      testMatch: /visual\.spec/,
      use: { ...devices["Desktop Chrome"], launchOptions: !process.env.CI && existsSync(localChromium) ? { executablePath: localChromium } : {} },
    },
    // Other browser engines for the smoke tests. Off by default (only Chromium is installed
    // locally); CI sets E2E_ALL_BROWSERS=1 after `playwright install` for all three.
    ...(process.env.E2E_ALL_BROWSERS
      ? [
          { name: "firefox", testMatch: /smoke\.spec/, use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", testMatch: /smoke\.spec/, use: { ...devices["Desktop Safari"] } },
          { name: "mobile-safari", testMatch: /smoke\.spec/, use: { ...devices["iPhone 13"] } },
        ]
      : []),
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: process.env.CI ? `pnpm start --port ${PORT}` : `pnpm dev --port ${PORT}`,
        url: `${baseURL}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: { DEMO_MODE: "true" },
      },
});
