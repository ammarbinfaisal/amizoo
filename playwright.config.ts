import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:3099",
    screenshot: "on",
    acceptDownloads: true,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium", viewport: { width: 520, height: 900 } },
    },
  ],
  webServer: {
    // Next 16 defaults to Turbopack; this repo uses a webpack plugin (next-pwa),
    // so run the dev server in webpack mode to avoid Turbopack incompatibilities.
    command: "npx next dev --port 3099 --webpack",
    url: "http://localhost:3099",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
