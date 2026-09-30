/** Collect complete axe diagnostics and sanitized page evidence. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { createRequire } from "node:module";
import { AxeBuilder } from "@axe-core/playwright";
import { root } from "./config.ts";
const require = createRequire(import.meta.url);
import type { Page } from "@playwright/test";
import type { Dataset, AttachmentInfo, FileHashes, TargetConfiguration } from "./types.ts";
/** Complete WCAG A and AA rule tags used by every state scan. */
export const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
/** Baseline navigation states collected before interactive observations. */
export const baselineStates: [string, (dataset: Dataset) => string][] = [
  ["home", () => "/"],
  ["region-create", () => "/regions/create"],
  ["projects", (dataset) => dataset.regionPath],
  ["region-settings", (dataset) => `${dataset.regionPath}/edit`],
  ["project-create", (dataset) => `${dataset.regionPath}/create-project`],
  ["bundles", (dataset) => `${dataset.regionPath}/bundles`],
  ["bundle-create", (dataset) => `${dataset.regionPath}/bundles/create`],
  ["opportunities", (dataset) => `${dataset.regionPath}/opportunities`],
  ["opportunities-upload", (dataset) => `${dataset.regionPath}/opportunities/upload`],
  ["data-sources", (dataset) => `${dataset.regionPath}/dataSources`],
  ["data-source-upload", (dataset) => `${dataset.regionPath}/dataSources/upload`],
  ["aggregation-areas", (dataset) => `${dataset.regionPath}/aggregationAreas`],
  ["activity", (dataset) => `${dataset.regionPath}/activity`],
  ["modifications", (dataset) => `${dataset.projectPath}/modifications`],
  ["project-settings", (dataset) => `${dataset.projectPath}/edit`],
  ["import-shapefile", (dataset) => `${dataset.projectPath}/import-shapefile`],
  ["import-modifications", (dataset) => `${dataset.projectPath}/import-modifications`],
  ["analysis", (dataset) => `${dataset.regionPath}/analysis`],
  ["regional", (dataset) => `${dataset.regionPath}/regional`],
  ["status", () => "/status"],
  ["session", () => "/session"],
];
/** Exhaustive evidence inventory required for a complete collection. */
export const stateNames = [
  ...baselineStates.map(([name]) => name),
  "region-create-invalid-north",
  "region-create-320px",
  "adjust-speed",
  "adjust-speed-polygon-selection",
  "scenarios",
  "project-share-menu",
  "project-report",
  "project-report-modified",
  "regional-completed",
  "regional-histogram",
  "regional-histogram-controls",
  "regional-download-menu",
  "data-source-detail",
  "aggregation-areas-populated",
  "modifications-dark",
];
/** Hash all fixture bytes for collection provenance. */
export function fixtureHashes(directory = path.join(root, "fixtures")) {
  const result: FileHashes = {};
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(filePath);
      } else if (entry.isFile()) {
        result[path.relative(directory, filePath)] = crypto
          .createHash("sha256")
          .update(fs.readFileSync(filePath))
          .digest("hex");
      }
    }
  };
  visit(directory);
  return result;
}
/** Wait for a rendered page and close the transient activity dialog. */
export async function ready(page: Page) {
  await page.locator("body").waitFor({ state: "visible" });
  await page.locator('[title="Loading..."]').first().waitFor({ state: "hidden" });
  const activity = page.getByRole("dialog", { name: /^Activity/ });
  if (await activity.isVisible()) {
    await activity.getByRole("button", { name: "Close", exact: true }).click();
  }
  await page.waitForFunction(
    () => document.readyState === "complete" && document.body.textContent.trim().length > 0,
  );
}
/** Write complete axe output and sanitized page metadata for one known state. */
export async function scan(
  page: Page,
  dataset: Pick<Dataset, "runDir" | "runId"> & { config: Pick<TargetConfiguration, "baseURL"> },
  name: string,
  testInfo: AttachmentInfo,
  { screenshot = false } = {},
) {
  if (!stateNames.includes(name)) {
    throw Error("Unknown evidence state");
  }
  if (new URL(page.url()).origin !== dataset.config.baseURL) {
    throw Error("Audit navigated outside target origin");
  }
  await ready(page);
  const axe = await new AxeBuilder({ page }).withTags(tags).analyze();
  const metadata = await page.evaluate(() => ({
    buildId:
      JSON.parse(document.querySelector("#__NEXT_DATA__")?.textContent ?? "{}").buildId ?? null,
    page: {
      bodyOverflow: getComputedStyle(document.body).overflow,
      charts: [...document.querySelectorAll("svg")]
        .filter((el) => el.querySelectorAll("rect").length > 5)
        .map((el) => ({
          html: el.outerHTML,
          title: el.querySelector("title")?.textContent ?? null,
          description: el.querySelector("desc")?.textContent ?? null,
          label: el.getAttribute("aria-label"),
          labelledBy: el.getAttribute("aria-labelledby"),
        })),
      headings: [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
        level: h.tagName,
        text: h.textContent,
      })),
      lang: document.documentElement.lang,
      mainCount: document.querySelectorAll("main,[role=main]").length,
      scrollWidth: document.documentElement.scrollWidth,
      sliders: [...document.querySelectorAll("[role=slider]")].map((el) => ({
        id: el.id,
        label: el.getAttribute("aria-label"),
        labelledBy: el.getAttribute("aria-labelledby"),
        disabled: el.getAttribute("aria-disabled"),
      })),
      text: document.body.innerText,
      title: document.title,
    },
    url: location.href,
    userAgent: navigator.userAgent,
    viewport: {
      deviceScaleFactor: devicePixelRatio,
      height: innerHeight,
      width: innerWidth,
    },
  }));
  const evidence = {
    name,
    runId: dataset.runId,
    ...metadata,
    operatingSystem: os.version(),
    playwrightVersion: require("@playwright/test/package.json").version,
    axeVersion: axe.testEngine.version,
    browser: { name: "chromium", version: page.context().browser()?.version() ?? "unknown" },
    fixtureHashes: fixtureHashes(),
    ...axe,
  };
  const folder = path.join(dataset.runDir, "evidence");
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, `${name}.json`);
  const sanitized = await page.evaluate((value) => {
    const data = JSON.parse(document.querySelector("#__NEXT_DATA__")?.textContent ?? "{}");
    const users = [
      window.__user,
      data.props?.pageProps?.user,
      data.props?.pageProps?.sessionInfo,
    ].filter(Boolean);
    const secrets = users.flatMap((user) =>
      Object.entries(user)
        .filter(
          ([key, v]) => /token|password|secret/i.test(key) && typeof v === "string" && v.length > 0,
        )
        .map(([, v]) => v),
    );
    let json = JSON.stringify(value);
    for (const secret of secrets) {
      json = json.split(JSON.stringify(secret).slice(1, -1)).join("[REDACTED]");
    }
    return JSON.parse(json);
  }, evidence);
  fs.writeFileSync(file, `${JSON.stringify(sanitized, null, 2)}\n`);
  await testInfo.attach(name, { contentType: "application/json", path: file });
  if (screenshot) {
    const filePath = path.join(folder, "screenshots", `${name}.png`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    await page.screenshot({ fullPage: false, path: filePath });
    await testInfo.attach(`${name} screenshot`, {
      contentType: "image/png",
      path: filePath,
    });
  }
}
