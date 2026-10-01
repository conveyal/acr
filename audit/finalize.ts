/** Finalize a cleaned collection into a checksum-verified pending review bundle. */

import fs from "node:fs";
import path from "node:path";
import { root } from "./config.ts";
import { stateNames } from "./collect.ts";
import { keyboardNames } from "./keyboard.ts";
import { artifacts, writeReportArtifacts } from "../scripts/report.ts";
import {
  collectionPattern,
  copyCompanions,
  evidenceIndex,
  evidenceManifest,
  pack,
  readJSON,
  readValidatedJSON,
  reserveCollection,
  writeJSON,
} from "./bundles.ts";
import { collectionRecordSchema } from "./bundle-schemas.ts";
import { recoveryManifestSchema } from "./types.ts";
import type { Assessment } from "../scripts/report-types.ts";
/** Validate collected coverage and retain one compressed draft for review. */
export function finalizeCollection(runDir: string, directory = root) {
  const recovery = readValidatedJSON(path.join(runDir, "recovery.json"), recoveryManifestSchema);
  if (!recovery.cleanupComplete || recovery.resources.some((r) => !r.deleted)) {
    throw Error("Cannot finalize before successful cleanup");
  }
  const staged = path.join(runDir, "evidence");
  for (const name of stateNames) {
    const evidence = JSON.parse(fs.readFileSync(path.join(staged, `${name}.json`), "utf8"));
    if (
      evidence.name !== name ||
      evidence.runId !== recovery.runId ||
      !Array.isArray(evidence.violations) ||
      !Array.isArray(evidence.passes) ||
      !Array.isArray(evidence.incomplete) ||
      !Array.isArray(evidence.inapplicable)
    ) {
      throw Error(`Incomplete evidence: ${name}`);
    }
  }
  for (const name of [
    "region-create",
    "modifications",
    "analysis",
    "regional",
    "region-create-invalid-north",
    "region-create-320px",
    "adjust-speed-polygon-selection",
    "project-report",
    "project-report-modified",
    "regional-histogram",
    "data-source-detail",
  ]) {
    if (!fs.existsSync(path.join(staged, "screenshots", name + ".png")))
      throw Error(`Missing screenshot: ${name}`);
  }
  const keyboard = path.join(staged, "keyboard");
  if (
    !fs.existsSync(keyboard) ||
    fs.readdirSync(keyboard).filter((n) => n.endsWith(".json")).length < 14
  ) {
    throw Error("Incomplete keyboard collection");
  }
  const observations = fs
    .readdirSync(keyboard)
    .filter((n) => n.endsWith(".json"))
    .map((n) => JSON.parse(fs.readFileSync(path.join(keyboard, n), "utf8")));
  if (
    keyboardNames.some(
      (name) => !observations.some((r) => r.name === name && r.runId === recovery.runId),
    )
  ) {
    throw Error("Missing keyboard observations");
  }
  for (const observation of observations) {
    if (!["pass", "fail", "blocked"].includes(observation.status)) {
      throw Error("Invalid keyboard status");
    }
    if (!fs.existsSync(path.join(keyboard, `${observation.name}.png`))) {
      throw Error("Missing keyboard screenshot");
    }
  }
  if (observations.some((r) => r.status === "blocked")) {
    throw Error("Blocked keyboard coverage");
  }
  const first = JSON.parse(fs.readFileSync(path.join(staged, "home.json"), "utf8"));
  if (!recovery.target) {
    throw Error("Recovery target is required");
  }
  const latest = {
    axeVersion: first.axeVersion,
    baseURL: recovery.target.baseURL,
    browser: first.browser,
    buildId: first.buildId,
    fixtureHashes: first.fixtureHashes,
    fixtureManifest: readJSON(path.join(directory, "audit/fixture-manifest.json")),
    keyboard: observations.map(({ name, status }) => ({ name, status })),
    playwrightVersion: first.playwrightVersion,
    reviewed: false,
    runId: recovery.runId,
    states: stateNames,
    target: recovery.target,
    timestamp: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(staged, "run.json"), `${JSON.stringify(latest, null, 2)}\n`);
  const data = readJSON<Assessment>(path.join(directory, "assessment.json"));
  data.latestAudit = latest;
  data.publicationDate = null;
  data.reportReview = {
    approved: false,
    findingsReconciled: false,
    kind: "interim",
    publicDistributionApproved: false,
    reviewedAt: "",
    reviewer: "",
    scopeReviewed: false,
  };
  const collection = collectionPattern.test(path.basename(runDir))
    ? runDir
    : reserveCollection(directory);
  const id = path.basename(collection);
  const recordFile = path.join(collection, "collection.json");
  if (readValidatedJSON(recordFile, collectionRecordSchema).status !== "collecting") {
    throw Error("Collection already finalized");
  }
  const draft = path.join(collection, "draft");
  fs.mkdirSync(draft, { recursive: true });
  fs.cpSync(staged, path.join(draft, "evidence"), { recursive: true });
  copyCompanions(directory, draft);
  const manifest = evidenceManifest(path.join(draft, "evidence"), id, latest);
  writeJSON(path.join(draft, "evidence/manifest.json"), manifest);
  fs.writeFileSync(path.join(draft, "evidence/README.md"), evidenceIndex(manifest, true));
  // The downloadable package contains direct evidence links; repository reports use the compact index.
  writeJSON(path.join(draft, "assessment.json"), data);
  fs.writeFileSync(
    path.join(draft, "changes.md"),
    `# Audit ${id}\n\nUnreviewed collection. Reconcile new, resolved, reopened findings and scope changes before approval.\n`,
  );
  writeReportArtifacts(
    path.join(draft, "reports"),
    artifacts(data, false, { directory: draft, localEvidence: true }),
  );
  const bundle = path.join(collection, `audit-${id}.tar.gz`);
  const packed = pack(draft, bundle);
  writeJSON(
    recordFile,
    collectionRecordSchema.parse({
      bundle: path.basename(bundle),
      id,
      status: "pending",
      ...packed,
    }),
  );
  // No repository assessment, reports, or baseline evidence is modified by collection.
  fs.rmSync(draft, { recursive: true });
  fs.rmSync(staged, { recursive: true });
  if (!recovery.target.trace) {
    fs.rmSync(path.join(runDir, "diagnostics"), { recursive: true, force: true });
  }
  return { ...latest, bundle, collection: id };
}
