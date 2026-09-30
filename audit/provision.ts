/** Provision the disposable network, data, and analysis fixtures. */
import { z } from "zod";
import { backendDocumentSchema, uploadStatusSchema, jobSchema } from "./types.ts";
import { expect } from "@playwright/test";
import { fixtureSettings } from "./config.ts";
import { find, poll, request } from "./api.ts";
import type { Page } from "@playwright/test";
import type { Ownership } from "./lifecycle.ts";
import type { BackendDocument, ProvisionedDataset, TargetConfiguration } from "./types.ts";
/** Shared request and ownership state passed through the ordered provisioning phases. */
interface ProvisioningContext {
  page: Page;
  config: TargetConfiguration;
  ownership: Ownership;
  name: string;
}
interface RegionContext extends ProvisioningContext {
  regionId: string;
}

/** Persist the returned identity immediately after a database creation succeeds. */
async function createOwnedDocument(
  { page, config, ownership }: ProvisioningContext,
  collection: string,
  data: unknown,
  parent: Record<string, string> = {},
) {
  return ownership.add(
    collection,
    await request(page, config, `/api/db/${collection}`, {
      data,
      schema: backendDocumentSchema,
      method: "POST",
    }),
    parent,
  );
}

/** Record creation intent before creating the region and await its uploaded network. */
async function provisionNetwork(context: ProvisioningContext) {
  const { page, config, ownership, name } = context;
  ownership.manifest.regionIntent = {
    description: "Disposable ACR accessibility fixture",
    name,
    state: "pending",
  };
  ownership.save();
  const region = await createOwnedDocument(context, "regions", {
    bounds: fixtureSettings.bounds,
    description: "Disposable ACR accessibility fixture",
    name,
  });
  ownership.manifest.regionIntent.state = "recorded";
  ownership.save();
  const regionId = region._id;
  console.log("Provisioning network bundle");
  const bundle = ownership.add(
    "bundles",
    await request(page, config, "/bundle", {
      schema: backendDocumentSchema,
      backend: true,
      fields: {
        bundleName: name,
        config: JSON.stringify({
          buildGridsForModes: ["WALK"],
          modifications: [],
        }),
        regionId,
      },
      files: [
        { field: "osm", file: "regions/nky/streets.osm.pbf" },
        { field: "feedGroup", file: "regions/nky/TANK-GTFS.zip" },
      ],
      method: "POST",
    }),
    { regionId },
  );
  await poll(
    () => request(page, config, `/api/db/bundles/${bundle._id}`, { schema: backendDocumentSchema }),
    (value) => {
      if (value.status === "ERROR") {
        throw Error("Bundle processing failed");
      }
      return value.status === "DONE";
    },
    config.timeouts.upload,
    "network bundle",
  );
  return { regionId, bundle };
}

/** Upload the population grid and record both status and source ownership. */
async function provisionPopulation(context: RegionContext) {
  const { page, config, ownership, name, regionId } = context;
  console.log("Provisioning population grid");
  const upload = await request(page, config, "/opportunities", {
    schema: uploadStatusSchema,
    backend: true,
    fields: {
      Name: name + " residents",
      freeform: "false",
      regionId,
      zoom: "9",
    },
    files: [{ field: "files", file: "regions/nky/people.grid" }],
    method: "POST",
  });
  ownership.add("uploadStatuses", { _id: upload.id }, { regionId });
  await poll(
    () =>
      request(page, config, `/opportunities/region/${regionId}/status`, {
        schema: uploadStatusSchema.array(),
        backend: true,
      }),
    (statuses) => {
      const uploadStatus = statuses.find((status) => status.id === upload.id);
      if (uploadStatus?.status === "ERROR") {
        throw Error("Population upload failed");
      }
      return uploadStatus?.status === "DONE";
    },
    config.timeouts.upload,
    "population upload",
  );
  const datasets = await find(page, config, "opportunityDatasets", {
    regionId,
  });
  if (datasets.length !== 1) {
    throw Error("Expected one fixture population layer");
  }
  const population = backendDocumentSchema.extend({ sourceId: z.string() }).parse(datasets[0]);
  ownership.add("opportunitySources", { _id: population.sourceId }, { regionId });
  return population;
}

/** Create a project and two scenarios under the exact recorded network bundle. */
async function provisionProject(context: RegionContext, bundle: BackendDocument) {
  const { name, regionId } = context;
  const project = await createOwnedDocument(
    context,
    "projects",
    { bundleId: bundle._id, name: name + " project", regionId },
    { bundleId: bundle._id, regionId },
  );
  const scenario = await createOwnedDocument(
    context,
    "scenarios",
    { modificationIds: [], name: "Example Scenario 1", projectId: project._id },
    { projectId: project._id },
  );
  await createOwnedDocument(
    context,
    "scenarios",
    { modificationIds: [], name: "Example Scenario 2", projectId: project._id },
    { projectId: project._id },
  );
  return { project, scenario };
}

/** Record asynchronous tasks before waiting for boundary and aggregation assets. */
async function provisionBoundaries(context: RegionContext) {
  const { page, config, ownership, name, regionId } = context;
  console.log("Provisioning boundaries and aggregation areas");
  const datasourceTask = await request(page, config, "/dataSource", {
    schema: z.string(),
    backend: true,
    fields: { regionId, sourceName: name + " boundaries" },
    files: ["dbf", "prj", "shp", "shx"].map((ext) => ({
      field: "sourceFiles",
      file: `regions/nky/city-boundaries/cities.${ext}`,
    })),
    method: "POST",
  });
  ownership.manifest.pendingTasks ??= [];
  ownership.manifest.pendingTasks.push({
    id: datasourceTask,
    kind: "dataSource",
    regionId,
  });
  ownership.save();
  const sources = await poll(
    () => find(page, config, "dataSources", { regionId }),
    (value) => value.length === 1,
    config.timeouts.upload,
    "uploaded datasource",
  );
  const datasource = ownership.add("dataSources", sources[0], { regionId });
  await poll(
    () =>
      request(page, config, `/api/db/dataSources/${datasource._id}`, {
        schema: backendDocumentSchema,
      }),
    (value) => {
      if (value.status === "ERROR") {
        throw Error("Datasource processing failed");
      }
      return (value.featureCount ?? 0) > 0 && Array.isArray(value.attributes);
    },
    config.timeouts.upload,
    "boundaries processing",
  );
  const aggregationTask = await request<string>(
    page,
    config,
    `/aggregationArea?dataSourceId=${datasource._id}&mergePolygons=true&nameProperty=name&zoom=9`,
    { backend: true, method: "POST", schema: z.string() },
  );
  ownership.manifest.pendingTasks.push({
    id: aggregationTask,
    kind: "aggregationArea",
    regionId,
  });
  ownership.save();
  const areas = await poll(
    () => find(page, config, "aggregationAreas", { regionId }),
    (aggregationAreas) => aggregationAreas.length > 0,
    config.timeouts.upload,
    "aggregation areas",
  );
  const groups = await poll(
    () => find(page, config, "dataGroups", { dataSourceId: datasource._id }),
    (groups) => groups.length > 0,
    config.timeouts.upload,
    "aggregation group",
  );
  if (groups.length === 0) {
    throw Error("Missing fixture aggregation group");
  }
  for (const area of areas) {
    ownership.add("aggregationAreas", area, {
      regionId,
      dataSourceId: datasource._id,
    });
  }
  for (const group of groups) {
    ownership.add("dataGroups", group, { dataSourceId: datasource._id });
  }
  return { datasource, areas, groups };
}

/** Create and configure the Adjust Speed fixture used by modification and report states. */
async function provisionModification(
  context: RegionContext,
  project: BackendDocument,
  scenario: BackendDocument,
) {
  const { page, config, ownership, regionId } = context;
  // Match Cypress example: create an Adjust Speed modification and use the first route.
  const projectPath = `/regions/${regionId}/projects/${project._id}`;
  await page.goto(`${config.baseURL + projectPath}/modifications`);
  await page.getByRole("button", { exact: true, name: "Create a modification" }).click();
  await page.getByLabel(/Modification name/i).fill("Scale speed by 10x");
  await page.getByLabel(/Transit modification type/i).selectOption({ label: "Adjust Speed" });
  const created = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().endsWith("/api/modification/create"),
  );
  await page.getByRole("dialog").getByRole("button", { exact: true, name: "Create" }).click();
  const response = await created;
  if (!response.ok()) {
    throw Error("Modification creation failed");
  }
  const createdId = backendDocumentSchema.parse(await response.json())._id;
  const modification = ownership.add(
    "modifications",
    await request(page, config, `/api/db/modifications/${createdId}`, {
      schema: backendDocumentSchema,
    }),
    { projectId: project._id },
  );
  await expect(page).toHaveURL(new RegExp(`/modifications/${modification._id}$`));
  const route = page.getByLabel(/Select route/i);
  await route.fill("Southbank Shuttle");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { exact: true, name: "Save" }).click();
  await expect(page.getByRole("button", { exact: true, name: "Save" })).toBeHidden();
  const current = await request(page, config, `/api/db/modifications/${modification._id}`, {
    schema: backendDocumentSchema,
  });
  await request(page, config, `/api/db/modifications/${modification._id}`, {
    data: { ...current, scale: 10 },
    method: "PUT",
  });
  await request(page, config, `/api/db/scenarios/${scenario._id}`, {
    data: { ...scenario, modificationIds: [modification._id] },
    method: "PUT",
  });
  return { projectPath, modification };
}

/** Compute and verify both regional result views before returning their evidence paths. */
async function provisionRegional(
  context: RegionContext,
  bundle: BackendDocument,
  population: BackendDocument,
  project: BackendDocument,
  areas: BackendDocument[],
) {
  const { page, config, ownership, name, regionId } = context;
  console.log("Computing regional fixture results");
  const settings: Record<string, unknown> = {
    ...fixtureSettings,
    bounds: fixtureSettings.subset,
    bundleId: bundle._id,
    destinationPointSetIds: [population._id],
    projectId: project._id,
    regionId,
    scenarioId: "baseline",
    workerVersion: config.workerVersion,
  };
  delete settings.subset;
  const regional = ownership.add(
    "regional-analyses",
    await request(page, config, "/regional", {
      schema: backendDocumentSchema,
      backend: true,
      data: {
        ...settings,
        cutoffsMinutes: [20, 30, 45, 60],
        dualAccessThresholds: [1, 10, 100],
        includeTemporalDensity: false,
        name: name + " BASELINE",
        oneToOne: false,
        originPointSetId: null,
        percentiles: [5, 25, 50, 75, 95],
        recordAccessibility: true,
        recordPaths: false,
        recordTimes: false,
        zoom: 9,
      },
      method: "POST",
    }),
    { bundleId: bundle._id, projectId: project._id, regionId },
  );
  await poll(
    () => request(page, config, "/jobs", { backend: true, schema: jobSchema.array() }),
    (jobs) => !jobs.some((job) => (job.jobId ?? job._id ?? job.id) === regional._id),
    config.timeouts.regional,
    "regional analysis",
  );
  const regionPath = `/regions/${regionId}`;
  const results = `${regionPath}/regional/${regional._id}?threshold=45&pointSetId=${population._id}&percentile=50`;
  await page.goto(config.baseURL + results);
  await expect(page.getByText("Legend", { exact: true })).toBeVisible({
    timeout: config.timeouts.regional,
  });
  const aggregated = `${results}&aggregationAreaId=${areas[0]._id}&weightsGridId=${population._id}`;
  await page.goto(config.baseURL + aggregated);
  await expect(page.getByText("Weighted average accessibility:", { exact: false })).toBeVisible({
    timeout: config.timeouts.regional,
  });
  return { aggregated, regional, regionPath, results, settings };
}

/** Provision each dependency in order while preserving ownership at every creation boundary. */
export async function provision(
  page: Page,
  config: TargetConfiguration,
  ownership: Ownership,
): Promise<ProvisionedDataset> {
  const name = ownership.manifest.runId;
  const context = { page, config, ownership, name };
  const { regionId, bundle } = await provisionNetwork(context);
  const regionContext = { ...context, regionId };
  const population = await provisionPopulation(regionContext);
  const { project, scenario } = await provisionProject(regionContext, bundle);
  const { datasource, areas, groups } = await provisionBoundaries(regionContext);
  const { projectPath, modification } = await provisionModification(
    regionContext,
    project,
    scenario,
  );
  const { aggregated, regional, regionPath, results, settings } = await provisionRegional(
    regionContext,
    bundle,
    population,
    project,
    areas,
  );
  return {
    aggregated,
    aggregationPath: `${regionPath}/aggregationAreas?dataGroupId=${groups[0]._id}`,
    datasourcePath: `${regionPath}/dataSources/${datasource._id}`,
    modificationPath: `${projectPath}/modifications/${modification._id}`,
    populationId: population._id,
    projectName: project.name ?? name + " project",
    projectPath,
    regionPath,
    regionalName: regional.name ?? name + " BASELINE",
    results,
    scenarioId: scenario._id,
    settings,
  };
}
