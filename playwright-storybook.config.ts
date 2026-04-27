import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "storybook-vrt.spec.ts",
  fullyParallel: true,
  retries: 0,
  workers: 2,
  reporter: "html",
  use: {
    baseURL: "http://localhost:6006",
    screenshot: "off",
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
    },
  },
  webServer: {
    command: "pnpm dlx http-server storybook-static --port 6006 --silent",
    url: "http://localhost:6006",
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000,
  },
});
