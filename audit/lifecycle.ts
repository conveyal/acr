/** Persisted resource ownership and recoverable cleanup. */
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { activitySchema, recoveryManifestSchema } from "./types.ts";
import { find, poll, request } from "./api.ts";
import type { Page } from "@playwright/test";
import type { RecoveryManifest, TargetConfiguration } from "./types.ts";
import type { RequestOptions } from "./api.ts";
export interface CleanupApi {
  request: (
    page: Page | null,
    config: TargetConfiguration,
    route: string,
    options?: RequestOptions,
  ) => Promise<Record<string, unknown> | null>;
  find: typeof find;
}
const ownedResourceCollection = (value: string) =>
  recoveryManifestSchema.shape.resources.element.shape.collection.parse(value);
/** Owned backend identifiers must be Mongo-style object IDs. */
const idPattern = /^[a-f0-9]{24}$/;
/** Delete dependants before containers to preserve retryable ownership. */
const priority: Record<string, number> = {
  aggregationAreas: 6,
  bundles: 9,
  dataGroups: 7,
  dataSources: 8,
  modifications: 1,
  opportunitySources: 4,
  projects: 3,
  "regional-analyses": 0,
  regions: 10,
  scenarios: 2,
  uploadStatuses: 5,
};
/** Record resources immediately so interrupted runs remain recoverable. */
export class Ownership {
  file: string;
  manifest: RecoveryManifest;
  /** Initialize an ownership ledger and persist it before requests begin. */
  constructor(file: string, manifest: RecoveryManifest) {
    this.file = file;
    this.manifest = manifest;
    this.save();
  }
  /** Atomically replace the recoverable manifest on disk. */
  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(`${this.file}.tmp`, `${JSON.stringify(this.manifest, null, 2)}\n`);
    fs.renameSync(`${this.file}.tmp`, this.file);
  }
  /** Record only valid identifiers from supported owned collections. */
  add<T extends { _id?: string; id?: string; name?: string }>(
    collection: string,
    documentRecord: T,
    parent: Record<string, string> = {},
  ) {
    const id = documentRecord?._id ?? documentRecord?.id;
    if (!idPattern.test(id ?? "") || !Object.hasOwn(priority, collection)) {
      throw Error(`Invalid owned ${collection} ID`);
    }
    if (
      !this.manifest.resources.some(
        (resource) => resource.collection === collection && resource.id === id,
      )
    ) {
      this.manifest.resources.push({
        collection: ownedResourceCollection(collection),
        deleted: false,
        id: id!,
        name: documentRecord.name,
        parent,
      });
      this.save();
    }
    return documentRecord;
  }
  /** Validate a persisted recovery manifest before resuming cleanup. */
  static read(file: string) {
    const manifest = recoveryManifestSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
    return new Ownership(file, manifest);
  }
}
/** Cleanup uses the same injectable adapter for reads, task settlement, and deletion. */
const browserCleanupApi: CleanupApi = {
  find,
  request: async (page, config, route, options = {}) => {
    const value = options.missingOK
      ? await request(page, config, route, { ...options, missingOK: true })
      : await request(page, config, route, { ...options, missingOK: false });
    if (value === null || options.method === "DELETE") return null;
    return z.record(z.string(), z.unknown()).parse(value);
  },
};
interface CleanupContext {
  page: Page | null;
  config: TargetConfiguration;
  ownership: Ownership;
  api: CleanupApi;
}

/** Resolve an interrupted region creation using only its exact run name and description. */
async function reconcileRegionCreation(context: CleanupContext, recoverInterrupted: boolean) {
  const { page, config, ownership, api } = context;
  if (ownership.manifest.regionIntent?.state === "pending") {
    const intent = ownership.manifest.regionIntent;
    if (intent.name !== ownership.manifest.runId) {
      throw Error("Invalid region creation intent");
    }
    const regions = await api.find(page, config, "regions", { name: intent.name });
    if (
      regions.length > 1 ||
      regions.some((resource) => resource.description !== intent.description)
    ) {
      throw Error("Uncertain region ownership; manual reconciliation required");
    }
    if (regions.length > 0) {
      ownership.add("regions", regions[0]);
      intent.state = "recorded";
    } else if (recoverInterrupted) {
      intent.state = "absent";
    } else {
      ownership.manifest.cleanupComplete = false;
      ownership.save();
      throw new Error(
        "Region creation outcome uncertain; use explicit recovery after the request has settled",
      );
    }
    ownership.save();
  }
}

/** Await only tasks associated with this region or its recorded pending request IDs. */
async function settleOwnedTasks(context: CleanupContext, regionId: string) {
  const { page, config, ownership, api } = context;
  await poll(
    async () =>
      activitySchema.parse(await api.request(page, config, "/activity", { backend: true })),
    (activity) =>
      !(activity.taskProgress ?? []).some(
        (task) =>
          (task.workProduct?.regionId === regionId ||
            ownership.manifest.pendingTasks?.some(
              (pendingTask) => pendingTask.regionId === regionId && pendingTask.id === task.id,
            )) &&
          !["DONE", "ERROR"].includes(task.state),
      ),
    config.timeouts.upload,
    "owned upload tasks before cleanup",
  );
}

/** Discover asynchronous assets only beneath recorded region and datasource ownership. */
async function discoverOwnedResources(context: CleanupContext) {
  const { page, config, ownership, api } = context;
  // Discover asynchronous assets only under the exact region/datasource created by this run.
  for (const resource of ownership.manifest.resources.filter(
    (resource) => resource.collection === "regions",
  )) {
    const region = await api.request(page, config, `/api/db/regions/${resource.id}`, {
      missingOK: true,
    });
    if (region && region.name !== ownership.manifest.runId) {
      throw Error("Run-owned region name changed; manual reconciliation required");
    }
    await settleOwnedTasks(context, resource.id);
    for (const collection of [
      "opportunityDatasets",
      "regional-analyses",
      "bundles",
      "dataSources",
      "projects",
      "aggregationAreas",
    ]) {
      const docs = await api.find(page, config, collection, { regionId: resource.id });
      for (const documentRecord of docs) {
        if (collection === "opportunityDatasets") {
          ownership.add(
            "opportunitySources",
            { _id: String(documentRecord.sourceId ?? "") },
            { regionId: resource.id },
          );
        } else {
          ownership.add(collection, documentRecord, { regionId: resource.id });
          if (collection === "dataSources") {
            for (const group of await api.find(page, config, "dataGroups", {
              dataSourceId: documentRecord._id,
            }))
              ownership.add("dataGroups", group, { dataSourceId: documentRecord._id });
          }
          if (collection === "projects") {
            for (const child of ["scenarios", "modifications"])
              for (const childDocument of await api.find(page, config, child, {
                projectId: documentRecord._id,
              }))
                ownership.add(child, childDocument, { projectId: documentRecord._id });
          }
        }
      }
    }
  }
  for (const source of ownership.manifest.resources.filter(
    (resource) => resource.collection === "dataSources",
  )) {
    for (const group of await api.find(page, config, "dataGroups", {
      dataSourceId: source.id,
    }))
      ownership.add("dataGroups", group, { dataSourceId: source.id });
  }
}

/** Delete children first, persisting each outcome so unresolved parents remain retryable. */
async function deleteOwnedResources(context: CleanupContext) {
  const { page, config, ownership, api } = context;
  const errors: string[] = [];
  for (const resource of [...ownership.manifest.resources].sort(
    (first, second) => priority[first.collection] - priority[second.collection],
  )) {
    if (resource.deleted) {
      continue;
    }
    // Never delete a parent while any owned child remains unresolved.
    if (
      ownership.manifest.resources.some(
        (child) => !child.deleted && Object.values(child.parent).includes(resource.id),
      )
    ) {
      errors.push(`Unresolved children of ${resource.collection}/${resource.id}`);
      continue;
    }
    try {
      let route = `/api/db/${resource.collection}/${resource.id}`;
      let backend = false;
      if (resource.collection === "regional-analyses") {
        route = `/regional/${resource.id}`;
        backend = true;
      } else if (resource.collection === "opportunitySources") {
        route = `/opportunities/source/${resource.id}`;
        backend = true;
      } else if (resource.collection === "dataSources") {
        route = `/dataSource/${resource.id}`;
        backend = true;
      } else if (resource.collection === "uploadStatuses") {
        route = `/opportunities/region/${resource.parent.regionId}/status/${resource.id}`;
        backend = true;
      } else if (resource.collection === "modifications") {
        route = `/api/modification/${resource.id}/delete`;
      }
      if (!["opportunitySources", "uploadStatuses"].includes(resource.collection)) {
        const documentRecord = await api.request(
          page,
          config,
          `/api/db/${resource.collection}/${resource.id}`,
          {
            missingOK: true,
          },
        );
        if (!documentRecord) {
          resource.deleted = true;
          ownership.save();
          continue;
        }
        if (documentRecord) {
          for (const [key, id] of Object.entries(resource.parent))
            if (documentRecord[key] !== id) throw Error("Resource ownership changed");
        }
        if (resource.collection === "regional-analyses" && documentRecord.deleted === true) {
          resource.deleted = true;
          ownership.save();
          continue;
        }
      }
      await api.request(page, config, route, {
        backend,
        method: "DELETE",
        missingOK: true,
      });
      resource.deleted = true;
      ownership.save();
    } catch (error) {
      errors.push(
        `${resource.collection}/${resource.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return errors;
}

/** Settle owned tasks, discover run-owned assets, and delete children before parents. */
export async function cleanup(
  page: Page | null,
  config: TargetConfiguration,
  ownership: Ownership,
  api: CleanupApi = browserCleanupApi,
  { recoverInterrupted = false } = {},
) {
  ownership.manifest.cleanupComplete = false;
  ownership.save();
  const context = { page, config, ownership, api };
  await reconcileRegionCreation(context, recoverInterrupted);
  await discoverOwnedResources(context);
  const errors = await deleteOwnedResources(context);
  ownership.manifest.cleanupComplete = errors.length === 0;
  ownership.save();
  if (errors.length > 0) {
    throw Error(`Cleanup incomplete: ${errors.join("; ")}`);
  }
}
