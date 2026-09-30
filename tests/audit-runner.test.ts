/** Controlled collector, recovery, fixture-integrity, and evidence workflow tests. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { configuration, root } from "../audit/config.ts";
import { Ownership, cleanup } from "../audit/lifecycle.ts";
import { preflight } from "../audit/api.ts";
import { fixtureHashes, stateNames } from "../audit/collect.ts";
import { finalizeCollection } from "../audit/finalize.ts";
import { extractBundle, readJSON, reserveCollection } from "../audit/bundles.ts";
import type { CleanupApi } from "../audit/lifecycle.ts";
import type { PreflightPage } from "../audit/api.ts";
import type { Assessment } from "../scripts/report-types.ts";
import type { CollectionRecord } from "../audit/types.ts";
import type { AxeBuilder } from "@axe-core/playwright";
const fakePage = (overrides: Partial<PreflightPage>): PreflightPage => ({
  evaluate: async () => false,
  goto: async () => null,
  request: {
    get: async () => {
      throw Error("Unexpected request");
    },
  },
  url: () => "http://localhost:3000",
  ...overrides,
});
const temporary = () => fs.mkdtempSync(path.join(os.tmpdir(), "acr-test-"));
const projectId = "000000000000000000000002";
const regionId = "000000000000000000000001";
const local = () => configuration({ disposable: true });
test("explicit disposable targets, backend origins, timeouts and storage state are validated", () => {
  assert.throws(() => configuration(), /disposable/);
  assert.throws(
    () => configuration({ baseURL: "https://example.test/path", disposable: true }),
    /origin/,
  );
  assert.throws(
    () => configuration({ baseURL: "https://example.test", disposable: true }),
    /backendURL/,
  );
  assert.throws(() => configuration({ disposable: true, timeouts: { upload: -1 } }), /timeout/);
  const dir = temporary();
  try {
    fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify({ cookies: [], origins: [] }));
    const config = configuration(
      {
        backendURL: "https://backend.example.test/api",
        baseURL: "https://example.test",
        disposable: true,
        storageState: "state.json",
      },
      dir,
    );
    assert.equal(config.storageState, path.join(dir, "state.json"));
    assert.equal(config.local, false);
    fs.writeFileSync(path.join(dir, "state.json"), "{}");
    assert.throws(
      () =>
        configuration(
          {
            backendURL: "http://localhost:7070/api",
            disposable: true,
            storageState: "state.json",
          },
          dir,
        ),
      /storage state/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
test("local preflight rejects redirects and nonlocal users before opening a browser page", async () => {
  const responses: [number, { email: string; accessGroup: string }][] = [
    [302, { accessGroup: "local", email: "local" }],
    [200, { accessGroup: "org", email: "person" }],
  ];
  for (const [status, user] of responses) {
    let opened = false;
    const page = fakePage({
      goto: () => {
        opened = true;
      },
      request: {
        get: async (url, options) => {
          assert.equal(options.maxRedirects, 0);
          return {
            status: () => status,
            text: async () =>
              `<script id="__NEXT_DATA__">${JSON.stringify({
                props: { pageProps: { user } },
              })}</script>`,
          };
        },
      },
    });
    await assert.rejects(preflight(page, local()), /local mode/);
    assert.equal(opened, false);
  }
});
test("authenticated preflight rejects expired sessions and cross-origin redirects", async () => {
  const config = configuration({
    backendURL: "https://backend.example.test/api",
    baseURL: "https://example.test",
    disposable: true,
  });
  await assert.rejects(
    preflight(
      fakePage({
        evaluate: async () => false,
        goto: async () => {},
        url: () => config.baseURL,
      }),
      config,
    ),
    /expired/,
  );
  await assert.rejects(
    preflight(fakePage({ goto: async () => {}, url: () => "https://login.example.test" }), config),
    /redirected/,
  );
});
test("copied fixtures match immutable source hashes and cover all 36 states", () => {
  const expected = JSON.parse(
    fs.readFileSync(path.join(root, "audit/fixture-manifest.json"), "utf8"),
  ).files;
  assert.equal(Object.keys(expected).length, 30);
  assert.deepEqual(fixtureHashes(), expected);
  assert.equal(stateNames.length, 36);
  assert.equal(new Set(stateNames).size, 36);
});
test("cleanup preserves failed parents and recovery retries only owned IDs", async () => {
  const dir = temporary();
  try {
    const owner = new Ownership(path.join(dir, "recovery.json"), {
      cleanupComplete: false,
      resources: [],
      runId: "acr-11111111-1111-1111-1111-111111111111",
      target: local(),
      version: 1,
    });
    owner.add("regions", { _id: regionId, name: owner.manifest.runId });
    owner.add("projects", { _id: projectId, name: "project" }, { regionId });
    const deleted: string[] = [];
    let failed = true;
    const api: CleanupApi = {
      find: async () => [],
      request: async (page, config, url, options = {}) => {
        if (options.method === "DELETE") {
          deleted.push(url);
          if (url.endsWith(projectId) && failed) {
            throw Error("service unavailable");
          }
          return null;
        }
        return url === "/activity"
          ? { taskProgress: [] }
          : url.endsWith(projectId)
            ? { regionId }
            : { name: owner.manifest.runId };
      },
    };
    await assert.rejects(cleanup(null, local(), owner, api), /incomplete/);
    assert.deepEqual(deleted, [`/api/db/projects/${projectId}`]);
    assert.equal(owner.manifest.cleanupComplete, false);
    failed = false;
    await cleanup(null, local(), Ownership.read(owner.file), api);
    assert.deepEqual(deleted, [
      `/api/db/projects/${projectId}`,
      `/api/db/projects/${projectId}`,
      `/api/db/regions/${regionId}`,
    ]);
    assert.equal(Ownership.read(owner.file).manifest.cleanupComplete, true);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
test("cleanup refuses resources whose parent ownership changed", async () => {
  const dir = temporary();
  try {
    const owner = new Ownership(path.join(dir, "recovery.json"), {
      resources: [],
      runId: "acr-11111111-1111-1111-1111-111111111111",
      target: local(),
      version: 1,
    });
    owner.add("projects", { _id: projectId }, { regionId });
    let deleted = false;
    await assert.rejects(
      cleanup(null, local(), owner, {
        find: async () => [],
        request: async (p, c, url, options = {}) => {
          if (options.method === "DELETE") {
            deleted = true;
          }
          return { regionId: projectId };
        },
      }),
      /ownership changed/,
    );
    assert.equal(deleted, false);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
test("partial collection and failed cleanup cannot replace evidence", () => {
  const dir = temporary();
  try {
    const run = path.join(dir, "run");
    fs.mkdirSync(run);
    fs.mkdirSync(path.join(dir, "evidence"));
    fs.writeFileSync(path.join(dir, "evidence", "original"), "baseline");
    fs.writeFileSync(
      path.join(run, "recovery.json"),
      JSON.stringify({
        version: 1,
        runId: "acr-77777777-7777-7777-7777-777777777777",
        cleanupComplete: false,
        resources: [],
      }),
    );
    assert.throws(() => finalizeCollection(run, dir), /cleanup/);
    fs.writeFileSync(
      path.join(run, "recovery.json"),
      JSON.stringify({
        version: 1,
        runId: "acr-77777777-7777-7777-7777-777777777777",
        cleanupComplete: true,
        resources: [],
      }),
    );
    assert.throws(() => finalizeCollection(run, dir), /ENOENT/);
    assert.equal(fs.readFileSync(path.join(dir, "evidence", "original"), "utf8"), "baseline");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
test("full axe evidence retains more than ten nodes and check diagnostics", async () => {
  const { chromium } = await import("@playwright/test");
  const { scan } = await import("../audit/collect.ts");
  const browser = await chromium.launch();
  const dir = temporary();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route("http://fixture.test/", (route) =>
      route.fulfill({
        body:
          '<html lang="en"><head><title>Fixture</title></head><body><main>' +
          Array.from({ length: 20 }, (_, i) => `<button id="button-${i}"></button>`).join("") +
          "</main></body></html>",
        contentType: "text/html",
      }),
    );
    await page.goto("http://fixture.test/");
    // An empty button page has no body text, so add a heading for readiness.
    await page.evaluate(() => {
      const heading = document.createElement("h1");
      heading.textContent = "Fixture";
      document.querySelector("main")!.prepend(heading);
      window.__user = { idToken: "synthetic-private-token" };
      const privateText = document.createElement("p");
      privateText.textContent = "synthetic-private-token";
      document.querySelector("main")!.append(privateText);
    });
    await scan(
      page,
      {
        config: { baseURL: "http://fixture.test" },
        runDir: dir,
        runId: "test",
      },
      "home",
      { attach: async () => {} },
    );
    const evidence: Awaited<ReturnType<AxeBuilder["analyze"]>> = JSON.parse(
      fs.readFileSync(path.join(dir, "evidence", "home.json"), "utf8"),
    );
    const rule = evidence.violations.find((r) => r.id === "button-name");
    assert.equal(rule!.nodes.length, 20);
    assert.ok(rule!.nodes[0].any.length > 0);
    assert.ok(Array.isArray(evidence.passes));
    assert.ok(Array.isArray(evidence.inapplicable));
    assert.equal(JSON.stringify(evidence).includes("synthetic-private-token"), false);
  } finally {
    await browser.close();
    fs.rmSync(dir, { recursive: true });
  }
});

test("saved sessions authenticate controlled targets and browser contexts stay isolated", async () => {
  const { chromium } = await import("@playwright/test");
  const { request } = await import("../audit/api.ts");
  const browser = await chromium.launch();
  const config = configuration({
    backendURL: "https://controlled.test/backend",
    baseURL: "https://controlled.test",
    disposable: true,
  });
  const authenticated = await browser.newContext({
    storageState: {
      cookies: [
        {
          domain: "controlled.test",
          expires: -1,
          httpOnly: true,
          name: "session",
          path: "/",
          sameSite: "Lax",
          secure: true,
          value: "synthetic-session",
        },
      ],
      origins: [],
    },
  });
  const anonymous = await browser.newContext();
  try {
    for (const context of [authenticated, anonymous]) {
      await context.route("https://controlled.test/**", async (route) => {
        const req = route.request();
        if (req.url().endsWith("/backend/probe")) {
          assert.equal(req.headers().authorization, "bearer synthetic-token");
          assert.equal(req.headers().cookie, undefined);
          return route.fulfill({ json: { authenticated: true } });
        }
        const user = req.headers().cookie?.includes("synthetic-session")
          ? {
              accessGroup: "fixture",
              email: "fixture@example.test",
              idToken: "synthetic-token",
            }
          : null;
        await route.fulfill({
          body: `<html><body>Controlled fixture<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
            { props: { pageProps: { user } } },
          )}</script></body></html>`,
          contentType: "text/html",
        });
      });
    }
    const page = await authenticated.newPage();
    await preflight(page, config);
    assert.deepEqual(await request(page, config, "/probe", { backend: true }), {
      authenticated: true,
    });
    await page.evaluate(() => localStorage.setItem("scenario", "modified"));
    const other = await anonymous.newPage();
    await assert.rejects(preflight(other, config), /expired/);
    assert.equal(await other.evaluate(() => localStorage.getItem("scenario")), null);
  } finally {
    await browser.close();
  }
});

test("complete collection creates an isolated bundle and keeps repository baseline intact", async () => {
  const { keyboardNames } = await import("../audit/keyboard.ts");
  const { artifacts, validateAssessment } = await import("../scripts/report.ts");
  const dir = temporary();
  const run = path.join(dir, "run");
  const staged = path.join(run, "evidence");
  const assessment: Assessment = JSON.parse(
    fs.readFileSync(path.join(root, "assessment.json"), "utf8"),
  );
  const runId = "acr-22222222-2222-2222-2222-222222222222";
  try {
    fs.mkdirSync(path.join(staged, "keyboard"), { recursive: true });
    fs.mkdirSync(path.join(staged, "screenshots"));
    fs.mkdirSync(path.join(dir, "evidence"));
    fs.mkdirSync(path.join(dir, "reports"));
    fs.mkdirSync(path.join(dir, "audit"));
    fs.copyFileSync(
      path.join(root, "audit/fixture-manifest.json"),
      path.join(dir, "audit/fixture-manifest.json"),
    );
    fs.copyFileSync(path.join(root, "findings.json"), path.join(dir, "findings.json"));
    fs.writeFileSync(path.join(dir, "evidence", "obsolete.png"), "old screenshot");
    fs.writeFileSync(path.join(dir, "assessment.json"), JSON.stringify(assessment));
    for (const [name, bytes] of Object.entries(artifacts(assessment))) {
      fs.writeFileSync(path.join(dir, "reports", name), bytes);
    }
    fs.writeFileSync(
      path.join(run, "recovery.json"),
      JSON.stringify({
        version: 1,
        cleanupComplete: true,
        resources: [],
        runId,
        target: local(),
      }),
    );
    for (const name of stateNames) {
      fs.writeFileSync(
        path.join(staged, `${name}.json`),
        JSON.stringify({
          inapplicable: [],
          incomplete: [],
          name,
          passes: [],
          runId,
          violations: [],
        }),
      );
      fs.writeFileSync(path.join(staged, "screenshots", `${name}.png`), "synthetic screenshot");
    }
    for (const name of keyboardNames) {
      fs.writeFileSync(
        path.join(staged, "keyboard", `${name}.json`),
        JSON.stringify({ name, runId, status: "fail" }),
      );
      fs.writeFileSync(path.join(staged, "keyboard", `${name}.png`), "synthetic screenshot");
    }
    const before = fs.readFileSync(path.join(dir, "assessment.json"), "utf8");
    const collected = finalizeCollection(run, dir);
    const record = readJSON<CollectionRecord>(
      path.join(path.dirname(collected.bundle), "collection.json"),
    );
    const extracted = path.join(dir, "extracted");
    fs.mkdirSync(extracted);
    extractBundle(collected.bundle, extracted);
    const refreshed = readJSON<Assessment>(path.join(extracted, "assessment.json"));
    const { latestAudit, reportReview: _reportReview, ...preserved } = refreshed;
    const { latestAudit: _oldAudit, reportReview: _oldReview, ...original } = assessment;
    assert.deepEqual(preserved, original);
    assert.ok(latestAudit?.states);
    assert.equal(latestAudit.reviewed, false);
    assert.equal(latestAudit.states.length, 36);
    assert.equal(record.status, "pending");
    assert.equal(
      fs.readFileSync(path.join(dir, "evidence", "obsolete.png"), "utf8"),
      "old screenshot",
    );
    assert.equal(fs.readFileSync(path.join(dir, "assessment.json"), "utf8"), before);
    assert.equal(fs.existsSync(path.join(dir, "history")), false);
    assert.match(
      fs.readFileSync(path.join(extracted, "reports", "conveyal-acr.md"), "utf8"),
      /New evidence awaits reconciliation/,
    );
    for (const row of refreshed.criteria) {
      row.rating ??= "supports";
      row.approved = true;
    }
    assert.throws(
      () => validateAssessment(refreshed, true, { directory: extracted }),
      /reconciliation/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("missing keyboard behavior is a finding while missing fixture data blocks collection", async () => {
  const { chromium, expect } = await import("@playwright/test");
  const { observe } = await import("../audit/keyboard.ts");
  const dir = temporary();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent("<h1>Fixture</h1><button>Open menu</button>");
    const dataset = { runDir: dir, runId: "synthetic-run" };
    const record = await observe(
      page,
      dataset,
      { attach: async () => {} },
      "missing-keyboard",
      async () => {
        await page.keyboard.press("Tab");
        await page.keyboard.press("Enter");
        await expect(page.getByRole("menu")).toBeVisible({ timeout: 50 });
        return { passed: true };
      },
    );
    assert.equal(record.status, "fail");
    await assert.rejects(
      observe(page, dataset, { attach: async () => {} }, "missing-fixture", async () => {
        throw new Error("Fixture results unavailable");
      }),
      /Blocked/,
    );
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(dir, "evidence/keyboard/missing-fixture.json"), "utf8"))
        .status,
      "blocked",
    );
  } finally {
    await browser.close();
    fs.rmSync(dir, { recursive: true });
  }
});

test("a lost region-creation response stays recoverable without broad deletion", async () => {
  const dir = temporary();
  try {
    const runId = "acr-33333333-3333-3333-3333-333333333333";
    const owner = new Ownership(path.join(dir, "recovery.json"), {
      cleanupComplete: false,
      regionIntent: {
        description: "Disposable ACR accessibility fixture",
        name: runId,
        state: "pending",
      },
      resources: [],
      runId,
      version: 1,
    });
    const api: CleanupApi = {
      find: async (page, config, collection, query) => {
        assert.equal(collection, "regions");
        assert.deepEqual(query, { name: runId });
        return [];
      },
      request: async () => {
        throw Error("Unexpected deletion");
      },
    };
    await assert.rejects(cleanup(null, local(), owner, api), /outcome uncertain/);
    assert.equal(owner.manifest.cleanupComplete, false);
    await cleanup(null, local(), Ownership.read(owner.file), api, {
      recoverInterrupted: true,
    });
    assert.equal(Ownership.read(owner.file).manifest.cleanupComplete, true);
    assert.equal(Ownership.read(owner.file).manifest.regionIntent!.state, "absent");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("recovery recognizes already deleted resources after a lost delete response", async () => {
  const dir = temporary();
  try {
    const owner = new Ownership(path.join(dir, "recovery.json"), {
      resources: [],
      runId: "acr-44444444-4444-4444-4444-444444444444",
      version: 1,
    });
    owner.add("projects", { _id: projectId }, { regionId });
    owner.add("regional-analyses", { _id: "000000000000000000000003" }, { projectId });
    await cleanup(null, local(), owner, {
      find: async () => [],
      request: async (p, c, url, options = {}) => {
        assert.notEqual(options.method, "DELETE");
        return url.includes("regional-analyses") ? { deleted: true, projectId } : null;
      },
    });
    assert.ok(owner.manifest.resources.every((r) => r.deleted));
    assert.equal(owner.manifest.cleanupComplete, true);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("dated archive counters preserve earlier snapshots and reset on the next day", () => {
  const dir = temporary();
  try {
    const first = reserveCollection(dir, "2026-09-30");
    fs.writeFileSync(path.join(first, "preserved"), "original");
    assert.equal(path.basename(first), "2026-09-30.1");
    assert.equal(path.basename(reserveCollection(dir, "2026-09-30")), "2026-09-30.2");
    assert.equal(path.basename(reserveCollection(dir, "2026-10-01")), "2026-10-01.1");
    assert.equal(fs.readFileSync(path.join(first, "preserved"), "utf8"), "original");
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
