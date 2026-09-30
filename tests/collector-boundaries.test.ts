/** Collector boundary tests use controlled pages and injected resource APIs. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { chromium } from "@playwright/test";
import { request } from "../audit/api.ts";
import {
  configuration,
  defaultTimeouts,
  defaultViewport,
  setupBudget,
  collectionBudget,
} from "../audit/config.ts";
import { cleanup, Ownership } from "../audit/lifecycle.ts";
import type { CleanupApi } from "../audit/lifecycle.ts";
import { backendDocumentSchema, recoveryManifestSchema } from "../audit/types.ts";

const regionId = "000000000000000000000001";
const taskId = "owned-upload-task";

/** Create a recoverable manifest containing exactly one owned region. */
function ownedRegion(directory: string) {
  const owner = new Ownership(path.join(directory, "recovery.json"), {
    version: 1,
    runId: "acr-55555555-5555-5555-5555-555555555555",
    resources: [],
  });
  owner.add("regions", { _id: regionId, name: owner.manifest.runId });
  owner.manifest.pendingTasks = [{ id: taskId, regionId, kind: "dataSource" }];
  owner.save();
  return owner;
}

test("target schemas reject malformed input and central budgets retain existing values", () => {
  assert.throws(() => configuration({ disposable: true, trace: "yes" }), /configuration/);
  assert.deepEqual(configuration({ disposable: true, extension: { preserve: true } }).extension, {
    preserve: true,
  });
  assert.equal(setupBudget(), 1_890_000);
  assert.equal(collectionBudget(), 390_000);
  assert.deepEqual(defaultTimeouts, {
    action: 30_000,
    interactive: 300_000,
    regional: 600_000,
    upload: 240_000,
  });
  assert.deepEqual(defaultViewport, { width: 1280, height: 720 });
});

test("recovery schemas preserve extension fields and reject malformed nested ownership", () => {
  const manifest = {
    version: 1,
    runId: "acr-55555555-5555-5555-5555-555555555555",
    extension: { preserve: true },
    resources: [
      { collection: "regions", id: regionId, parent: {}, deleted: false, extension: "preserve" },
    ],
  };
  assert.deepEqual(recoveryManifestSchema.parse(manifest), manifest);
  assert.throws(() =>
    recoveryManifestSchema.parse({
      ...manifest,
      pendingTasks: [{ id: taskId, regionId: "invalid", kind: "upload" }],
    }),
  );
  assert.throws(() =>
    recoveryManifestSchema.parse({
      ...manifest,
      resources: [{ ...manifest.resources[0], deleted: "false" }],
    }),
  );
});

test("requests distinguish missing resources and malformed reads while accepting empty deletes", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route("http://collector.test/**", (route) => {
      const routePath = new URL(route.request().url()).pathname;
      if (routePath === "/missing") return route.fulfill({ status: 404, body: "missing" });
      if (routePath === "/null") return route.fulfill({ json: null });
      if (routePath === "/malformed") return route.fulfill({ json: { _id: 12 } });
      return route.fulfill({
        body: "<html><body>Controlled fixture</body></html>",
        contentType: "text/html",
      });
    });
    await page.goto("http://collector.test/");
    const config = configuration({
      disposable: true,
      baseURL: "http://collector.test",
      backendURL: "http://collector.test/backend",
    });
    assert.equal(await request(page, config, "/missing", { missingOK: true }), null);
    await assert.rejects(request(page, config, "/missing"), /404/);
    await assert.rejects(request(page, config, "/html"), /non-JSON/);
    await assert.rejects(request(page, config, "/null"), /null instead/);
    await assert.rejects(
      request(page, config, "/malformed", { schema: backendDocumentSchema }),
      /string/,
    );
    assert.equal(await request(page, config, "/empty", { method: "DELETE" }), null);
  } finally {
    await browser.close();
  }
});

test("cleanup settles owned tasks through the injected API and ignores unrelated active tasks", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "acr-owned-tasks-"));
  try {
    const owner = ownedRegion(directory);
    let activityReads = 0;
    const deleted: string[] = [];
    const api: CleanupApi = {
      find: async () => [],
      request: async (_page, _config, route, options = {}) => {
        if (route === "/activity") {
          activityReads++;
          return {
            taskProgress: [
              { id: taskId, state: activityReads === 1 ? "PROCESSING" : "DONE" },
              {
                id: "unrelated",
                state: "PROCESSING",
                workProduct: { regionId: "000000000000000000000099" },
              },
            ],
          };
        }
        if (options.method === "DELETE") {
          assert.equal(activityReads, 2);
          deleted.push(route);
          return null;
        }
        return { name: owner.manifest.runId };
      },
    };
    await cleanup(null, configuration({ disposable: true }), owner, api);
    assert.deepEqual(deleted, [`/api/db/regions/${regionId}`]);
    assert.equal(owner.manifest.cleanupComplete, true);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});

test("an owned task timeout leaves resources recoverable and prevents every deletion", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "acr-owned-timeout-"));
  try {
    const owner = ownedRegion(directory);
    let deleted = false;
    const api: CleanupApi = {
      find: async () => [],
      request: async (_page, _config, route, options = {}) => {
        if (options.method === "DELETE") deleted = true;
        return route === "/activity"
          ? {
              taskProgress: [
                { id: "derived-task", state: "PROCESSING", workProduct: { regionId } },
              ],
            }
          : { name: owner.manifest.runId };
      },
    };
    await assert.rejects(
      cleanup(null, configuration({ disposable: true, timeouts: { upload: 1 } }), owner, api),
      /Timed out/,
    );
    assert.equal(deleted, false);
    const recovered = Ownership.read(owner.file);
    assert.equal(recovered.manifest.cleanupComplete, false);
    assert.equal(recovered.manifest.resources[0].deleted, false);
    assert.deepEqual(recovered.manifest.pendingTasks, [
      { id: taskId, regionId, kind: "dataSource" },
    ]);
  } finally {
    fs.rmSync(directory, { recursive: true });
  }
});
