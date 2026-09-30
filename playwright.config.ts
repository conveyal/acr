/** Serial Chromium collection with explicit target configuration. */
import { defineConfig } from "@playwright/test";
import {
  collectionBudget,
  defaultBaseURL,
  defaultTimeouts,
  defaultViewport,
  loadConfiguration,
} from "./audit/config.ts";
const target = process.env.ACR_TARGET_CONFIG;
// Listing tests must not require credentials or provision anything.
const config = target ? loadConfiguration(target) : null;
export default defineConfig({
  expect: { timeout: defaultTimeouts.action },
  fullyParallel: false,
  maxFailures: 1,
  outputDir: process.env.ACR_RUN_DIR
    ? `${process.env.ACR_RUN_DIR}/diagnostics`
    : "output/playwright",
  reporter: [["list"]],
  retries: 0,
  testDir: "./tests/audit",
  timeout: collectionBudget(config?.timeouts),
  use: {
    actionTimeout: config?.timeouts.action ?? defaultTimeouts.action,
    baseURL: config?.baseURL ?? defaultBaseURL,
    browserName: "chromium",
    navigationTimeout: 60000,
    screenshot: "only-on-failure",
    storageState: config?.storageState,
    trace: config?.trace ? "retain-on-failure" : "off",
    viewport: defaultViewport,
  },
  workers: 1,
});
