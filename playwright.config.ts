import { defineConfig, devices } from "@playwright/test";

// E2E tests need a running app talking to a real (or local) Supabase
// project with the migrations applied — see docs/testing.md. They are not
// run as part of `npm run build`/CI by default; run them explicitly with
// `npm run test:e2e` once NEXT_PUBLIC_SUPABASE_URL etc. are configured.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
