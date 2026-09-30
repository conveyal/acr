/** Observe keyboard behavior and preserve failures as evidence. */
import fs from "node:fs";
import path from "node:path";
import type { Locator, Page } from "@playwright/test";
import type { AttachmentInfo, Dataset, KeyboardResult } from "./types.ts";
/** Search sequential keyboard focus for a required visible target. */
export async function tabTo(page: Page, locator: Locator, limit = 80) {
  if ((await locator.count()) === 0) {
    throw Error("Required target element absent");
  }
  await locator.first().waitFor({ state: "visible" });
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press("Tab");
    if (
      await locator
        .first()
        .evaluate((el) => el === document.activeElement || el.contains(document.activeElement))
    ) {
      return true;
    }
  }
  return false;
}
/** Save keyboard observations and distinguish behavior failures from blocked fixtures. */
export async function observe(
  page: Page,
  dataset: Pick<Dataset, "runDir" | "runId">,
  testInfo: AttachmentInfo,
  name: string,
  check: () => Promise<KeyboardResult>,
) {
  const before = await page.locator("body").ariaSnapshot();
  let result: KeyboardResult;
  try {
    result = await check();
    if (typeof result?.passed !== "boolean") {
      throw Error("Invalid keyboard observation");
    }
  } catch (error) {
    result = {
      blocked: !(error instanceof Error && "matcherResult" in error),
      detail: error instanceof Error ? error.message : String(error),
      passed: false,
    };
  }
  const folder = path.join(dataset.runDir, "evidence", "keyboard");
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, `${name}.json`);
  const record = {
    name,
    runId: dataset.runId,
    url: page.url(),
    timestamp: new Date().toISOString(),
    status: result.blocked ? "blocked" : result.passed ? "pass" : "fail",
    ...result,
    before,
    after: await page.locator("body").ariaSnapshot(),
  };
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  await testInfo.attach(name, { contentType: "application/json", path: file });
  await page.screenshot({ path: path.join(folder, `${name}.png`) });
  if (result.blocked) {
    throw Error(`Blocked keyboard coverage ${name}: ${result.detail}`);
  }
  return record;
}
/** Observe whether keyboard navigation changes a slider value. */
export async function sliderCheck(page: Page, locator: Locator) {
  if (!(await tabTo(page, locator))) {
    return { passed: false, detail: "Slider not reachable by Tab" };
  }
  const before = await locator.getAttribute("aria-valuenow");
  await page.keyboard.press("ArrowRight");
  const after = await locator.getAttribute("aria-valuenow");
  await page.keyboard.press("Home");
  const home = await locator.getAttribute("aria-valuenow");
  await page.keyboard.press("End");
  const end = await locator.getAttribute("aria-valuenow");
  return {
    afterValue: after,
    beforeValue: before,
    end,
    home,
    passed: before !== after && home !== end,
  };
}

/** Required keyboard observations for a complete evidence collection. */
export const keyboardNames = [
  "form-error-association",
  "reflow-320px",
  "tabs-keyboard",
  "share-dialog-focus",
  "map-keyboard-pan-zoom",
  "map-zoom-buttons",
  "bounds-input-alternative",
  "polygon-keyboard",
  "feature-properties-keyboard",
  "histogram-slider-keyboard",
  "chart-text-alternative",
  "legend-keyboard",
  "download-menu-keyboard",
  "analysis-cutoff-keyboard",
  "analysis-percentile-keyboard",
];
