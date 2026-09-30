/** In-memory review and publication scenarios; no GitHub operations or Git writes run here. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { root } from "../audit/config.ts";
import { artifacts, validateAssessment } from "../scripts/report.ts";
import {
  collectionPattern,
  copyCompanions,
  evidenceManifest,
  pack,
  readJSON,
  reserveCollection,
  verifyBundle,
  writeJSON,
} from "../audit/bundles.ts";
import { ReviewWorkflow, reviewPaths } from "../audit/review.ts";
import { restoreEvidence } from "../audit/evidence.ts";
import type { GitHubClient, ReleaseInput, PullInput } from "../audit/github.ts";

import type { Assessment } from "../scripts/report-types.ts";
import type { FinalizedCollection } from "../audit/types.ts";
import type { CommandRunner, PullRequest, Release } from "../audit/github-types.ts";
interface FakeState {
  branch: string;
  sha: string;
  release: Release | null;
  pr: PullRequest | null;
  uploaded: Map<string, Buffer>;
  calls: string[][];
  snapshots: Map<string, Map<string, string>>;
  remoteTag: string;
  failUpload: boolean;
  failPublish: boolean | "after";
  dirty: string;
}
/** Create a complete synthetic bundle, fake Git checkout, and independently injected remote operations. */
function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "acr-review-test-"));
  const collection = reserveCollection(directory, "2026-10-01T01:00:00Z");
  const id = path.basename(collection);
  const payload = path.join(directory, "payload");
  fs.mkdirSync(path.join(payload, "evidence"), { recursive: true });
  fs.mkdirSync(path.join(payload, "reports"));
  copyCompanions(root, payload);
  const assessment = readJSON<Assessment>(path.join(root, "assessment.json"));
  assessment.latestAudit = { ...assessment.latestAudit, reviewed: false, runId: `acr-${id}` };
  assessment.reportReview = { approved: false, kind: "interim" };
  const references = new Set(assessment.criteria.flatMap((row) => row.evidence));
  for (const match of fs
    .readFileSync(path.join(payload, "findings.md"), "utf8")
    .matchAll(/\]\((evidence\/[^)#]+)\)/g)) {
    if (!match[1].endsWith("README.md")) references.add(match[1]);
  }
  for (const name of references) {
    fs.writeFileSync(path.join(payload, name), JSON.stringify({ name, nodes: [1, 2, 3] }));
  }
  fs.writeFileSync(path.join(payload, "evidence/README.md"), "# Raw evidence\n");
  const manifest = evidenceManifest(path.join(payload, "evidence"), id, assessment.latestAudit);
  writeJSON(path.join(payload, "evidence/manifest.json"), manifest);
  writeJSON(path.join(payload, "assessment.json"), assessment);
  fs.writeFileSync(path.join(payload, "changes.md"), "# Changes\n\nPending review.\n");
  for (const [name, content] of Object.entries(
    artifacts(assessment, false, { directory: payload, localEvidence: true }),
  )) {
    fs.writeFileSync(path.join(payload, "reports", name), content);
  }
  const bundle = path.join(collection, `audit-${id}.tar.gz`);
  writeJSON(path.join(collection, "collection.json"), {
    bundle: path.basename(bundle),
    id,
    status: "pending",
    ...pack(payload, bundle),
  });
  fs.mkdirSync(path.join(directory, "evidence"));
  fs.mkdirSync(path.join(directory, "reports"));
  const state: FakeState = {
    branch: "main",
    calls: [],
    dirty: "",
    failPublish: false,
    failUpload: false,
    pr: null,
    release: null,
    remoteTag: "",
    sha: "1".repeat(40),
    snapshots: new Map(),
    uploaded: new Map(),
  };
  const snapshot = () =>
    new Map(
      reviewPaths
        .filter((n) => fs.existsSync(path.join(directory, n)))
        .map((n) => [n, fs.readFileSync(path.join(directory, n), "utf8").trim()]),
    );
  const run: CommandRunner = (tool, args) => {
    state.calls.push([tool, ...args]);
    if (tool === "git") {
      const [command, ...rest] = args;
      if (command === "status") {
        return state.dirty;
      }
      if (command === "branch") {
        return rest[0] === "--show-current" ? state.branch : "";
      }
      if (command === "switch") {
        state.branch = rest.at(-1)!;
        return "";
      }
      if (command === "diff") {
        if (!args.includes("--cached")) {
          return "";
        }
        const current = snapshot(),
          previous = state.snapshots.get(state.sha);
        return !previous || [...current].some(([name, value]) => previous.get(name) !== value)
          ? "assessment.json"
          : "";
      }
      if (command === "ls-files") {
        return "";
      }
      if (command === "commit") {
        state.sha = String(Number(state.sha[0]) + 1).repeat(40);
        state.snapshots.set(state.sha, snapshot());
        return "";
      }
      if (command === "rev-parse") {
        return state.sha;
      }
      if (command === "ls-remote") {
        return state.remoteTag;
      }
      if (command === "tag") {
        return "";
      }
      if (command === "show") {
        const [sha, name] = rest[0].split(":");
        if (!state.snapshots.get(sha)?.has(name)) {
          throw Error(`Missing committed ${name}`);
        }
        return state.snapshots.get(sha)!.get(name)!;
      }
      if (command === "push" && rest.at(-1)?.startsWith("refs/tags/")) {
        state.remoteTag = state.sha;
      }
      return "";
    }
    if (args[0] === "repo") {
      return JSON.stringify({ nameWithOwner: "conveyal/acr" });
    }
    throw new Error(`Unexpected local command: ${tool} ${args.join(" ")}`);
  };
  const remote: GitHubClient = {
    async findRelease() {
      state.calls.push(["github", "findRelease"]);
      return state.release;
    },
    async getRelease() {
      assert.ok(state.release);
      return state.release;
    },
    async createRelease(repo: string, body: ReleaseInput) {
      state.release = {
        tag_name: body.tag_name!,
        target_commitish: body.target_commitish!,
        name: body.name!,
        body: body.body!,
        draft: body.draft!,
        assets: [],
        html_url: `https://github.com/${repo}/releases/tag/audit-${id}`,
        id: 1,
      };
      return state.release;
    },
    async updateRelease(repo: string, releaseId: number, body: ReleaseInput) {
      assert.ok(state.release);
      if (state.failPublish === true) throw new Error("Publication interrupted");
      Object.assign(state.release, body);
      if (state.failPublish === "after") throw new Error("Publication response lost");
      return state.release;
    },
    async deleteAsset(repo: string, assetId: number) {
      assert.ok(state.release);
      state.release.assets = state.release.assets.filter((asset) => asset.id !== assetId);
    },
    async listPullRequests() {
      return state.pr
        ? [{ ...state.pr, state: state.pr.state === "MERGED" ? "closed" : "open" }]
        : [];
    },
    async createPullRequest(repo: string, body: PullInput) {
      state.pr = {
        ...body,
        headRefOid: state.sha,
        html_url: `https://github.com/${repo}/pull/1`,
        number: 1,
        state: "OPEN",
      };
      return state.pr;
    },
    async updatePullRequest(repo: string, number: number, body: string) {
      assert.ok(state.pr);
      Object.assign(state.pr, { body, headRefOid: state.sha });
      return state.pr;
    },
    async readPullRequest() {
      assert.ok(state.pr);
      return state.pr;
    },
    async uploadAsset(repo, release, file) {
      if (state.failUpload) throw new Error("Interrupted upload");
      const name = path.basename(file);
      state.uploaded.set(name, fs.readFileSync(file));
      release.assets.push({ id: state.uploaded.size, name });
    },
    async downloadAsset(repo, release, name, destination) {
      const bytes = state.uploaded.get(name);
      assert.ok(bytes);
      fs.writeFileSync(path.join(destination, name), bytes);
    },
  };
  const workflow = new ReviewWorkflow(directory, run, remote);
  const approve = async () => {
    const a = readJSON<Assessment>(path.join(directory, "assessment.json"));
    a.latestAudit!.reviewed = true;
    a.distributionLicense = "CC-BY-4.0";
    a.reportReview = {
      approved: true,
      findingsReconciled: true,
      kind: "interim",
      publicDistributionApproved: true,
      reviewedAt: "2026-10-01T03:00:00Z",
      reviewer: "Synthetic reviewer",
      scopeReviewed: true,
    };
    writeJSON(path.join(directory, "assessment.json"), a);
    fs.writeFileSync(
      path.join(directory, "changes.md"),
      "# Reviewed changes\n\nNo new confirmed findings. Scope unchanged.\n",
    );
    await workflow.prepare(id);
    Object.assign(state.pr!, {
      baseRefName: "main",
      headRefName: `audit/${id}`,
      headRefOid: state.sha,
      isDraft: false,
      latestReviews: [{ state: "APPROVED" }],
      mergeCommit: { oid: state.sha },
      reviewDecision: "APPROVED",
      state: "MERGED",
    });
  };
  return {
    approve,
    bundle,
    collection,
    directory,
    dispose: () => fs.rmSync(directory, { recursive: true, force: true }),
    id,
    payload,
    remote,
    state,
    workflow,
  };
}

test("dated identifiers reserve failed runs, existing legacy snapshots, and UTC dates", async () => {
  const scenario = fixture();
  try {
    assert.match(scenario.id, collectionPattern);
    assert.equal(
      path.basename(reserveCollection(scenario.directory, "2026-10-01T23:30:00-08:00")),
      "2026-10-02.1",
    );
    fs.mkdirSync(path.join(scenario.directory, ".cache/audit/legacy/2026-10-01.7"), {
      recursive: true,
    });
    assert.equal(
      path.basename(reserveCollection(scenario.directory, "2026-10-01")),
      "2026-10-01.8",
    );
  } finally {
    scenario.dispose();
  }
});
test("bundle verification detects tampering and source inventory mismatches", async () => {
  const scenario = fixture();
  try {
    const record = readJSON<FinalizedCollection>(path.join(scenario.collection, "collection.json"));
    assert.throws(
      () => verifyBundle(scenario.bundle, { ...record.files, missing: "wrong" }),
      /inventory/,
    );
    fs.appendFileSync(scenario.bundle, "tampered");
    await assert.rejects(() => scenario.workflow.prepare(scenario.id), /checksum/);
  } finally {
    scenario.dispose();
  }
});
test("discarded collections and a clean checkout do not reuse dated identifiers", async () => {
  const scenario = fixture();
  try {
    fs.rmSync(scenario.collection, { recursive: true });
    assert.equal(
      path.basename(reserveCollection(scenario.directory, "2026-10-01")),
      "2026-10-01.2",
    );
    fs.rmSync(path.join(scenario.directory, ".cache"), { recursive: true });
    writeJSON(path.join(scenario.directory, "evidence/manifest.json"), {
      ...readJSON<object>(path.join(scenario.payload, "evidence/manifest.json")),
      collection: "2026-10-01.5",
      release: "audit-2026-10-01.5",
    });
    assert.equal(
      path.basename(reserveCollection(scenario.directory, "2026-10-01")),
      "2026-10-01.6",
    );
  } finally {
    scenario.dispose();
  }
});
test("preparation is repeatable and does not duplicate commits, PRs, Releases, or assets", async () => {
  const scenario = fixture();
  try {
    assert.match(await scenario.workflow.prepare(scenario.id), /pull\/1$/);
    const { sha } = scenario.state;
    const digest = readJSON<FinalizedCollection>(
      path.join(scenario.collection, "collection.json"),
    ).sha256;
    await scenario.workflow.prepare(scenario.id);
    assert.equal(scenario.state.sha, sha);
    assert.equal(
      readJSON<FinalizedCollection>(path.join(scenario.collection, "collection.json")).sha256,
      digest,
    );
    assert.equal(scenario.state.release!.assets.length, 1);
    assert.equal(
      scenario.state.calls.filter(([tool, cmd]) => tool === "git" && cmd === "commit").length,
      1,
    );
    assert.equal(scenario.state.release!.draft, true);
    assert.equal(scenario.state.branch, `audit/${scenario.id}`);
  } finally {
    scenario.dispose();
  }
});
test("interrupted replacement upload preserves the previous draft asset and local pending bundle", async () => {
  const scenario = fixture();
  try {
    await scenario.workflow.prepare(scenario.id);
    const previous = scenario.state.release!.assets[0].name;
    fs.writeFileSync(path.join(scenario.directory, "changes.md"), "Updated review notes\n");
    scenario.state.failUpload = true;
    await assert.rejects(() => scenario.workflow.prepare(scenario.id), /Interrupted upload/);
    assert.equal(scenario.state.release!.assets[0].name, previous);
    const record = readJSON<FinalizedCollection>(path.join(scenario.collection, "collection.json"));
    verifyBundle(scenario.bundle, record.files, record.sha256);
    scenario.state.failUpload = false;
    await scenario.workflow.prepare(scenario.id);
    assert.equal(scenario.state.release!.assets.length, 1);
    assert.notEqual(scenario.state.release!.assets[0].name, previous);
  } finally {
    scenario.dispose();
  }
});
test("preparation refuses unrelated edits and published collections", async () => {
  const scenario = fixture();
  try {
    scenario.state.dirty = " M unrelated.txt";
    await assert.rejects(() => scenario.workflow.prepare(scenario.id), /clean main/);
    scenario.state.dirty = "";
    await scenario.workflow.prepare(scenario.id);
    scenario.state.release!.draft = false;
    await assert.rejects(() => scenario.workflow.prepare(scenario.id), /already published/);
  } finally {
    scenario.dispose();
  }
});
test("publication rejects unmerged, unapproved, or unprepared PR changes", async () => {
  const scenario = fixture();
  try {
    await scenario.workflow.prepare(scenario.id);
    await assert.rejects(() => scenario.workflow.release(scenario.id), /must be merged/);
    await scenario.approve();
    scenario.state.pr!.latestReviews = [];
    await assert.rejects(() => scenario.workflow.release(scenario.id), /PR approval/);
    scenario.state.pr!.latestReviews = [{ state: "APPROVED" }];
    scenario.state.pr!.headRefOid = "f".repeat(40);
    await assert.rejects(() => scenario.workflow.release(scenario.id), /unprepared changes/);
    assert.equal(scenario.state.release!.draft, true);
  } finally {
    scenario.dispose();
  }
});
test("reviewed interim publication allows unknown ratings but verifies approval, merged files and bundle", async () => {
  const scenario = fixture();
  try {
    await scenario.workflow.prepare(scenario.id);
    await scenario.approve();
    assert.ok(
      readJSON<Assessment>(path.join(scenario.directory, "assessment.json")).criteria.some(
        (r) => r.rating === null,
      ),
    );
    assert.match(await scenario.workflow.release(scenario.id), /releases/);
    assert.equal(scenario.state.release!.draft, false);
    assert.equal(scenario.state.remoteTag, scenario.state.sha);
    assert.match(scenario.state.release!.body ?? "", /Reviewed changes/);
    assert.equal(
      readJSON<FinalizedCollection>(path.join(scenario.collection, "collection.json")).status,
      "published",
    );
    assert.equal(fs.existsSync(scenario.bundle), true);
    assert.match(await scenario.workflow.release(scenario.id), /releases/);
  } finally {
    scenario.dispose();
  }
});
test("publication rejects missing review metadata and changed merged sources", async () => {
  const scenario = fixture();
  try {
    await scenario.workflow.prepare(scenario.id);
    await scenario.approve();
    const snapshot = scenario.state.snapshots.get(scenario.state.sha)!;
    const original = snapshot.get("assessment.json")!;
    const a = JSON.parse(original);
    for (const value of [false, "false"]) {
      a.reportReview.publicDistributionApproved = value;
      snapshot.set("assessment.json", JSON.stringify(a));
      await assert.rejects(() => scenario.workflow.release(scenario.id), /metadata/);
    }
    snapshot.set("assessment.json", original);
    snapshot.set("findings.json", "[]");
    await assert.rejects(() => scenario.workflow.release(scenario.id), /differs/);
    assert.equal(scenario.state.release!.draft, true);
  } finally {
    scenario.dispose();
  }
});
test("failed publication retains local evidence and can be retried", async () => {
  const scenario = fixture();
  try {
    await scenario.workflow.prepare(scenario.id);
    await scenario.approve();
    scenario.state.failPublish = true;
    await assert.rejects(() => scenario.workflow.release(scenario.id), /interrupted/);
    assert.equal(
      readJSON<FinalizedCollection>(path.join(scenario.collection, "collection.json")).status,
      "pending",
    );
    assert.equal(fs.existsSync(scenario.bundle), true);
    scenario.state.failPublish = false;
    await scenario.workflow.release(scenario.id);
    assert.equal(scenario.state.release!.draft, false);
  } finally {
    scenario.dispose();
  }
});
test("a lost publication response is recovered by verifying the published tag and downloaded evidence", async () => {
  const scenario = fixture();
  try {
    await scenario.workflow.prepare(scenario.id);
    await scenario.approve();
    scenario.state.failPublish = "after";
    await assert.rejects(() => scenario.workflow.release(scenario.id), /response lost/);
    assert.equal(scenario.state.release!.draft, false);
    assert.equal(
      readJSON<FinalizedCollection>(path.join(scenario.collection, "collection.json")).status,
      "pending",
    );
    scenario.state.failPublish = false;
    assert.match(await scenario.workflow.release(scenario.id), /releases/);
    assert.equal(
      readJSON<FinalizedCollection>(path.join(scenario.collection, "collection.json")).status,
      "published",
    );
  } finally {
    scenario.dispose();
  }
});
test("a clean checkout retrieves an unpublished Release bundle and restores verified evidence", async () => {
  const scenario = fixture();
  try {
    await scenario.workflow.prepare(scenario.id);
    fs.rmSync(scenario.collection, { recursive: true });
    await restoreEvidence(scenario.id, scenario.directory, scenario.workflow.run, scenario.remote);
    const a = readJSON<Assessment>(path.join(scenario.directory, "assessment.json"));
    assert.doesNotThrow(() =>
      validateAssessment(a, false, { directory: scenario.directory, localEvidence: true }),
    );
    assert.equal(
      readJSON<FinalizedCollection>(path.join(scenario.collection, "collection.json")).status,
      "pending",
    );
    assert.ok(
      scenario.state.calls.some(([tool, verb]) => tool === "github" && verb === "findRelease"),
    );
  } finally {
    scenario.dispose();
  }
});
test("reports validate and link through an indexed manifest without raw evidence; restoration verifies checksums", async () => {
  const scenario = fixture();
  try {
    await scenario.workflow.prepare(scenario.id);
    const a = readJSON<Assessment>(path.join(scenario.directory, "assessment.json"));
    assert.doesNotThrow(() => validateAssessment(a, false, { directory: scenario.directory }));
    const rendered = artifacts(a, false, { directory: scenario.directory });
    assert.match(rendered["conveyal-acr.html"], /README.md#artifact-/);
    await restoreEvidence(scenario.id, scenario.directory, scenario.workflow.run, scenario.remote);
    assert.doesNotThrow(() =>
      validateAssessment(a, false, { directory: scenario.directory, localEvidence: true }),
    );
    const criterion = a.criteria.find((r) => r.evidence.length);
    assert.ok(criterion);
    const reference = criterion.evidence[0];
    fs.writeFileSync(path.join(scenario.directory, reference), "tampered");
    assert.throws(
      () => validateAssessment(a, false, { directory: scenario.directory, localEvidence: true }),
      /checksum/,
    );
  } finally {
    scenario.dispose();
  }
});
