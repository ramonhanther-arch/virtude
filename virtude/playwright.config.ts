import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 40_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3211", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "http://127.0.0.1:3211/api/state",
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3211",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_test_only",
      OPENAI_API_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      AUTH_RATE_LIMIT_SECRET: "",
      NEXT_DIST_DIR: ".next-e2e",
    },
  },
});
