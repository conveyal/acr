/** Worker fixture provisions evidence data and always attempts cleanup. */
import fs from "node:fs";
import path from "node:path";
import { test as base } from "@playwright/test";
import { defaultViewport, setupBudget, loadConfiguration } from "./config.ts";
import { preflight } from "./api.ts";
import { Ownership, cleanup } from "./lifecycle.ts";
import { provision } from "./provision.ts";
import type { Dataset } from "./types.ts";
const target = process.env.ACR_TARGET_CONFIG
  ? loadConfiguration(process.env.ACR_TARGET_CONFIG)
  : null;
const setupTimeout = setupBudget(target?.timeouts);
export const test = base.extend<{}, { dataset: Dataset }>({
  dataset: [
    async ({ browser }, use) => {
      if (!process.env.ACR_RUN_DIR || !process.env.ACR_TARGET_CONFIG) {
        throw Error("Run through pnpm audit:a11y --config <target.json>");
      }
      const config = loadConfiguration(process.env.ACR_TARGET_CONFIG);
      const ownership = Ownership.read(path.join(process.env.ACR_RUN_DIR, "recovery.json"));
      const context = await browser.newContext({
        baseURL: config.baseURL,
        storageState: config.storageState,
        viewport: defaultViewport,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(config.timeouts.action);
      let failure;
      try {
        await preflight(page, config);
        const dataset = await provision(page, config, ownership);
        fs.writeFileSync(
          path.join(process.env.ACR_RUN_DIR, "dataset.json"),
          JSON.stringify(dataset, null, 2),
        );
        await use({
          ...dataset,
          config,
          runDir: process.env.ACR_RUN_DIR,
          runId: ownership.manifest.runId,
        });
      } catch (error) {
        failure = error;
      } finally {
        if (ownership.manifest.resources.length > 0 || ownership.manifest.regionIntent) {
          try {
            await cleanup(page, config, ownership);
          } catch (error) {
            failure = new AggregateError(
              [failure, error].filter(Boolean),
              "Collection or cleanup failed",
            );
          }
        } else {
          ownership.manifest.cleanupComplete = true;
          ownership.save();
        }
        await context.close();
      }
      if (failure) {
        throw failure;
      }
    },
    { scope: "worker", timeout: setupTimeout },
  ],
});
export { expect } from "@playwright/test";
