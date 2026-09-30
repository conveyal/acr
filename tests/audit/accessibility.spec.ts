/** Complete accessibility state collection and keyboard observations against disposable fixtures. */
import { expect, test } from "../../audit/test-fixture.ts";
import { baselineStates, ready, scan } from "../../audit/collect.ts";
import { observe, sliderCheck, tabTo } from "../../audit/keyboard.ts";
import type { Page } from "@playwright/test";
import { defaultViewport } from "../../audit/config.ts";
import type { Dataset } from "../../audit/types.ts";
/** Baseline states whose screenshots complement their complete axe diagnostics. */
const baselineScreenshotStates = ["region-create", "modifications", "analysis", "regional"];
/** Keep map keyboard observations bounded while allowing animation to complete. */
const mapChangeTimeout = 5_000;
/** Maximum forward focus steps used to observe keyboard exit from the map. */
const mapFocusExitLimit = 40;
/** Narrow viewport exercises WCAG reflow at the existing 320 pixel width. */
const narrowViewport = { ...defaultViewport, width: 320 };

/** Navigate within the fixture origin and await rendered controls before observing a state. */
const visitState = async (page: Page, dataset: Dataset, statePath: string) => {
  await page.goto(dataset.config.baseURL + statePath);
  await ready(page);
};
for (const [name, pathForState] of baselineStates) {
  test(`collect ${name}`, async ({ page, dataset }, testInfo) => {
    await visitState(page, dataset, pathForState(dataset));
    await scan(page, dataset, name, testInfo, {
      screenshot: baselineScreenshotStates.includes(name),
    });
  });
}
test("collect region form validation", async ({ page, dataset }, testInfo) => {
  await visitState(page, dataset, "/regions/create");
  await observe(page, dataset, testInfo, "form-error-association", async () => {
    const field = page.locator("#north-bound");
    if (!(await tabTo(page, field))) {
      return { passed: false, detail: "North bound not reachable" };
    }
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("999");
    await page.keyboard.press("Tab");
    const value = await field.evaluate((element) => ({
      describedBy: element.getAttribute("aria-describedby"),
      description: (element.getAttribute("aria-describedby") ?? "")
        .split(" ")
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" "),
      invalid: element.getAttribute("aria-invalid"),
    }));
    return {
      passed: value.invalid === "true" && value.description.trim().length > 0,
      ...value,
    };
  });
  await scan(page, dataset, "region-create-invalid-north", testInfo, {
    screenshot: true,
  });
});
test("collect narrow geometry", async ({ page, dataset }, testInfo) => {
  await page.setViewportSize(narrowViewport);
  await visitState(page, dataset, "/regions/create");
  await scan(page, dataset, "region-create-320px", testInfo, { screenshot: true });
  await observe(page, dataset, testInfo, "reflow-320px", async () => {
    const widths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: innerWidth,
    }));
    return { passed: widths.document <= widths.viewport, ...widths };
  });
});
test("collect modification and polygon selection", async ({ page, dataset }, testInfo) => {
  await visitState(page, dataset, dataset.modificationPath);
  await expect(page.getByRole("button", { exact: true, name: "Select segments" })).toBeVisible();
  await expect(page.locator('input[value="10"]')).toBeVisible();
  await scan(page, dataset, "adjust-speed", testInfo);
  await page.getByRole("button", { exact: true, name: "Select segments" }).click();
  await expect(page.getByText("Click to start drawing shape.", { exact: true })).toBeVisible();
  await scan(page, dataset, "adjust-speed-polygon-selection", testInfo, {
    screenshot: true,
  });
});
test("collect scenarios and reports", async ({ page, dataset }, testInfo) => {
  await visitState(page, dataset, `${dataset.projectPath}/modifications`);
  await page.getByRole("tab", { exact: true, name: "Scenarios" }).click();
  await expect(page.getByText("Example Scenario 1", { exact: true }).first()).toBeVisible();
  await scan(page, dataset, "scenarios", testInfo);
  const share = page.getByRole("button", {
    exact: true,
    name: "Download or share this project",
  });
  await share.click();
  await scan(page, dataset, "project-share-menu", testInfo);
  await page
    .getByRole("heading", { name: /Example Scenario 2/ })
    .locator("..")
    .getByRole("button", { exact: true, name: "Summary report" })
    .click();
  await expect(page).toHaveURL(/\/report(?:\?|$)/);
  await expect(page.getByText(dataset.projectName, { exact: false }).first()).toBeVisible();
  await scan(page, dataset, "project-report", testInfo, { screenshot: true });
  await visitState(page, dataset, `${dataset.projectPath}/modifications`);
  await share.click();
  await page
    .getByRole("heading", { name: /Example Scenario 1/ })
    .locator("..")
    .getByRole("button", { exact: true, name: "Summary report" })
    .click();
  await expect(page).toHaveURL(/\/report(?:\?|$)/);
  await expect(page.getByText("Scale speed by 10x", { exact: false }).first()).toBeVisible();
  await scan(page, dataset, "project-report-modified", testInfo, {
    screenshot: true,
  });
});
test("collect completed results and histogram", async ({ page, dataset }, testInfo) => {
  await visitState(page, dataset, dataset.results);
  await expect(page.getByText("Legend", { exact: true })).toBeVisible();
  await scan(page, dataset, "regional-completed", testInfo);
  await visitState(page, dataset, dataset.aggregated);
  await expect(page.getByText("Weighted average accessibility:", { exact: false })).toBeVisible();
  await page.getByText(/people within aggregation area/).scrollIntoViewIfNeeded();
  await scan(page, dataset, "regional-histogram", testInfo, { screenshot: true });
  await page
    .getByText("Weighted average accessibility:", { exact: false })
    .scrollIntoViewIfNeeded();
  await scan(page, dataset, "regional-histogram-controls", testInfo);
  await page.getByRole("button", { exact: true, name: "Download" }).click();
  await scan(page, dataset, "regional-download-menu", testInfo);
});
test("collect datasource detail", async ({ page, dataset }, testInfo) => {
  await visitState(page, dataset, dataset.datasourcePath);
  await expect(
    page.getByText("Show properties by hovering your mouse over a feature.", {
      exact: true,
    }),
  ).toBeVisible();
  await scan(page, dataset, "data-source-detail", testInfo, { screenshot: true });
});
test("collect populated aggregation areas", async ({ page, dataset }, testInfo) => {
  await visitState(page, dataset, dataset.aggregationPath);
  await expect(page.locator("select option").first()).toBeAttached();
  await scan(page, dataset, "aggregation-areas-populated", testInfo);
});
test("collect dark project controls", async ({ page, dataset }, testInfo) => {
  await visitState(page, dataset, `${dataset.projectPath}/modifications`);
  await expect(
    page.getByRole("button", { exact: true, name: "Create a modification" }),
  ).toBeVisible();
  await page.locator(".DEV").click();
  await scan(page, dataset, "modifications-dark", testInfo);
});
test("keyboard navigation, tabs and share dialog", async ({ page, dataset }, testInfo) => {
  await visitState(page, dataset, `${dataset.projectPath}/modifications`);
  await observe(page, dataset, testInfo, "tabs-keyboard", async () => {
    const tab = page.getByRole("tab", { name: /^Modifications/ });
    if (!(await tabTo(page, tab))) {
      return { passed: false, detail: "Tabs not reachable" };
    }
    await page.keyboard.press("ArrowRight");
    return {
      passed:
        (await page
          .getByRole("tab", { exact: true, name: "Scenarios" })
          .getAttribute("aria-selected")) === "true",
    };
  });
  await observe(page, dataset, testInfo, "share-dialog-focus", async () => {
    const button = page.getByRole("button", {
      exact: true,
      name: "Download or share this project",
    });
    if (!(await tabTo(page, button))) {
      return { passed: false, detail: "Share button not reachable" };
    }
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    const inside = await page
      .getByRole("dialog")
      .evaluate((element) => element.contains(document.activeElement));
    await page.keyboard.press("Tab");
    const trapped = await page
      .getByRole("dialog")
      .evaluate((element) => element.contains(document.activeElement));
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    const returned = await button.evaluate((element) => element === document.activeElement);
    return { inside, passed: inside && trapped && returned, returned, trapped };
  });
});
test("keyboard map pan, zoom and focus exit", async ({ page, dataset }, testInfo) => {
  await visitState(page, dataset, "/regions/create");
  await observe(page, dataset, testInfo, "map-keyboard-pan-zoom", async () => {
    const map = page.locator(".leaflet-container").first();
    if (!(await tabTo(page, map))) {
      return { passed: false, detail: "Map not reachable by Tab" };
    }
    /** Read the map state without introducing pointer interaction into the observation. */
    const readMapPosition = () =>
      page.evaluate(() =>
        window.LeafletMap
          ? {
              center: window.LeafletMap.getCenter(),
              zoom: window.LeafletMap.getZoom(),
            }
          : null,
      );
    const before = await readMapPosition();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("+");
    await page
      .waitForFunction(
        (before) =>
          window.LeafletMap &&
          window.LeafletMap.getZoom() !== before!.zoom &&
          window.LeafletMap.getCenter().lng !== before!.center.lng,
        before,
        { timeout: mapChangeTimeout },
      )
      .catch(() => {});
    const after = await readMapPosition();
    let escaped = false;
    for (let focusAttempt = 0; focusAttempt < mapFocusExitLimit && !escaped; focusAttempt++) {
      await page.keyboard.press("Tab");
      escaped = await map.evaluate((element) => !element.contains(document.activeElement));
    }
    return {
      afterPosition: after,
      beforePosition: before,
      escaped,
      passed:
        !!before &&
        !!after &&
        before.center.lng !== after.center.lng &&
        before.zoom !== after.zoom &&
        escaped,
    };
  });
  await observe(page, dataset, testInfo, "map-zoom-buttons", async () => {
    const button = page.locator(".leaflet-control button").first();
    if (!(await tabTo(page, button))) {
      return { passed: false, detail: "Zoom control not reachable" };
    }
    const before = await page.evaluate(() => window.LeafletMap?.getZoom());
    await page.keyboard.press("Enter");
    await page
      .waitForFunction((before) => window.LeafletMap?.getZoom() !== before, before, {
        timeout: mapChangeTimeout,
      })
      .catch(() => {});
    const after = await page.evaluate(() => window.LeafletMap?.getZoom());
    const accessibleName =
      (await button.getAttribute("aria-label")) || (await button.getAttribute("title"));
    return {
      accessibleName,
      afterZoom: after,
      beforeZoom: before,
      passed: before !== after && !!accessibleName,
    };
  });
  await observe(page, dataset, testInfo, "bounds-input-alternative", async () => {
    const field = page.locator("#north-bound");
    if (!(await tabTo(page, field))) {
      return { passed: false, detail: "North bound not reachable" };
    }
    const before = await field.inputValue();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type(String(Number(before) - 0.01));
    await page.keyboard.press("Tab");
    const after = await field.inputValue();
    const other =
      (await page.locator("#south-bound").count()) &&
      (await page.locator("#east-bound").count()) &&
      (await page.locator("#west-bound").count());
    return {
      afterValue: after,
      beforeValue: before,
      passed: before !== after && !!other,
    };
  });
});
test("keyboard polygon and feature properties", async ({ page, dataset }, testInfo) => {
  await visitState(page, dataset, dataset.modificationPath);
  await observe(page, dataset, testInfo, "polygon-keyboard", async () => {
    const button = page.getByRole("button", {
      exact: true,
      name: "Select segments",
    });
    if (!(await tabTo(page, button))) {
      return { passed: false, detail: "Selection button not reachable" };
    }
    await page.keyboard.press("Enter");
    await expect(page.getByText("Click to start drawing shape.", { exact: true })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const keyboardVertex = (await page.locator(".leaflet-editing-icon").count()) > 0;
    await page.keyboard.press("Escape");
    const cancelled = !(await page
      .getByText("Click to start drawing shape.", { exact: true })
      .isVisible());
    const returned = await button.evaluate((element) => element === document.activeElement);
    return {
      cancelled,
      detail: "Tests keyboard creation of a vertex, Escape cancellation and focus return",
      keyboardVertex,
      passed: keyboardVertex && cancelled && returned,
      returned,
    };
  });
  const previewResponse = page.waitForResponse(
    (response) => response.url().endsWith("/preview") && response.status() === 200,
  );
  await visitState(page, dataset, dataset.datasourcePath);
  const preview = await (await previewResponse).json();
  if (!preview.features?.length) {
    throw Error("Datasource fixture preview has no features");
  }
  await observe(page, dataset, testInfo, "feature-properties-keyboard", async () => {
    const map = page.locator(".mapboxgl-canvas");
    if (!(await tabTo(page, map))) {
      return {
        passed: false,
        detail: "Map features have no keyboard focus target",
        fixtureFeatureCount: preview.features.length,
      };
    }
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const exposed = await page
      .getByRole("heading", { exact: true, name: "Properties" })
      .isVisible();
    return {
      detail: "Keyboard activation exposes feature properties",
      fixtureFeatureCount: preview.features.length,
      passed: exposed,
    };
  });
});
test("keyboard histogram, legend and download", async ({ page, dataset }, testInfo) => {
  await visitState(page, dataset, dataset.aggregated);
  await expect(page.getByText("Weighted average accessibility:", { exact: false })).toBeVisible();
  await observe(page, dataset, testInfo, "histogram-slider-keyboard", () =>
    sliderCheck(page, page.getByRole("slider")),
  );
  await observe(page, dataset, testInfo, "chart-text-alternative", async () => {
    const charts = page.locator("svg").filter({ has: page.locator("rect") });
    const descriptions = await charts.evaluateAll((elements) =>
      elements
        .filter((element) => element.querySelectorAll("rect").length > 5)
        .map((element) => ({
          description: element.querySelector("desc")?.textContent,
          label: element.getAttribute("aria-label"),
          labelledBy: element.getAttribute("aria-labelledby"),
          title: element.querySelector("title")?.textContent,
        })),
    );
    if (descriptions.length === 0) {
      throw Error("Histogram not rendered");
    }
    return {
      descriptions,
      passed: descriptions.every(
        (description) => !!(description.description || description.labelledBy),
      ),
    };
  });
  await observe(page, dataset, testInfo, "legend-keyboard", async () => {
    const trigger = page
      .getByRole("heading", { exact: true, name: "Legend" })
      .locator("..")
      .getByRole("button");
    if (!(await tabTo(page, trigger))) {
      return { passed: false, detail: "Legend trigger not reachable by Tab" };
    }
    const before = await page.locator("body").textContent();
    await page.keyboard.press("Enter");
    const after = await page.locator("body").textContent();
    return {
      detail: "Enter changes legend disclosure",
      passed: before !== after,
    };
  });
  await observe(page, dataset, testInfo, "download-menu-keyboard", async () => {
    const button = page.getByRole("button", { exact: true, name: "Download" });
    if (!(await tabTo(page, button))) {
      return { passed: false, detail: "Download button not reachable" };
    }
    await page.keyboard.press("Enter");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("menuitem").first()).toBeFocused();
    const before = await page.evaluate(() => document.activeElement?.textContent);
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("menuitem").nth(1)).toBeFocused();
    const after = await page.evaluate(() => document.activeElement?.textContent);
    await page.keyboard.press("Escape");
    await expect(button).toBeFocused();
    return {
      afterFocus: after,
      beforeFocus: before,
      passed:
        before !== after &&
        (await button.evaluate((element) => element === document.activeElement)),
    };
  });
});
test("keyboard analysis sliders", async ({ page, dataset }, testInfo) => {
  await visitState(page, dataset, `${dataset.regionPath}/analysis`);
  const expand = page.locator('#PrimaryAnalysisSettings [title="expand"]');
  if (await expand.isVisible()) {
    await expand.click();
  }
  const primary = page.locator("#PrimaryAnalysisSettings");
  await primary.getByLabel("Project", { exact: true }).fill(dataset.projectName);
  await page.keyboard.press("Enter");
  await primary.getByLabel("Scenario", { exact: true }).fill("No modifications");
  await page.keyboard.press("Enter");
  await primary.getByRole("tab", { name: /Custom JSON editor/i }).click();
  const editor = primary.getByLabel(/Customize analysis request/i);
  const values = JSON.parse(await editor.inputValue());
  await editor.fill(JSON.stringify({ ...values, ...dataset.settings }));
  await primary.getByRole("tab", { name: /Form editor/i }).click();
  await page.getByRole("button", { exact: true, name: "Fetch results" }).click();
  await expect(page.getByRole("button", { exact: true, name: "Fetch results" })).toBeVisible({
    timeout: dataset.config.timeouts.interactive,
  });
  await expect(page.locator("[role=slider]").first()).toBeEnabled({
    timeout: dataset.config.timeouts.interactive,
  });
  for (const [name, selector] of [
    ["analysis-cutoff-keyboard", "[role=slider]"],
    ["analysis-percentile-keyboard", "[role=slider]"],
  ]) {
    const index = name.includes("percentile") ? 1 : 0;
    await observe(page, dataset, testInfo, name, () =>
      sliderCheck(page, page.locator(selector).nth(index)),
    );
  }
});
