/** Retrieve and restore checksum-verified evidence without modifying assessments or reports. */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { root } from "./config.ts";
import { command, githubClient, type GitHubClient } from "./github.ts";
import {
  collectionPattern,
  digest,
  extractBundle,
  inventory,
  readJSON,
  readValidatedJSON,
  verifyBundle,
  writeJSON,
} from "./bundles.ts";
import { finalizedCollectionSchema, evidenceManifestSchema } from "./bundle-schemas.ts";
import type { CommandRunner } from "./github-types.ts";
/** Restore raw files only after the bundle and checkout manifests match, leaving report inputs intact. */
export async function restoreEvidence(
  id: string,
  directory = root,
  run: CommandRunner = command,
  remote?: GitHubClient,
) {
  if (!collectionPattern.test(id)) {
    throw Error("Invalid collection identifier");
  }
  const location = path.join(directory, ".cache/audit/collections", id);
  const recordFile = path.join(location, "collection.json");
  if (!fs.existsSync(recordFile)) {
    await downloadEvidence(id, directory, run, remote);
  }
  const record = readValidatedJSON(recordFile, finalizedCollectionSchema);
  const bundle = path.join(location, record.bundle);
  verifyBundle(bundle, record.files, record.sha256);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "acr-evidence-"));
  try {
    extractBundle(bundle, temporary);
    const current = readValidatedJSON(
      path.join(directory, "evidence/manifest.json"),
      evidenceManifestSchema,
    );
    if (
      JSON.stringify(current) !==
      JSON.stringify(
        readValidatedJSON(path.join(temporary, "evidence/manifest.json"), evidenceManifestSchema),
      )
    ) {
      throw Error("Bundle differs from checkout's evidence manifest");
    }
    for (const [name, hash] of Object.entries(current.files)) {
      if (!name.startsWith("evidence/") || name.split("/").includes("..")) {
        throw Error("Invalid evidence path");
      }
      const source = path.join(temporary, name);
      if (digest(fs.readFileSync(source)) !== hash) {
        throw Error("Evidence checksum mismatch");
      }
      fs.mkdirSync(path.dirname(path.join(directory, name)), { recursive: true });
      fs.copyFileSync(source, path.join(directory, name));
    }
  } finally {
    fs.rmSync(temporary, { force: true, recursive: true });
  }
}

/** Download a unique dated asset, verify its full inventory, then retain the validated local copy. */
export async function downloadEvidence(
  id: string,
  directory = root,
  run: CommandRunner = command,
  remote?: GitHubClient,
) {
  if (!collectionPattern.test(id)) {
    throw Error("Invalid collection identifier");
  }
  const manifest = readValidatedJSON(
    path.join(directory, "evidence/manifest.json"),
    evidenceManifestSchema,
  );
  if (manifest.collection !== id) {
    throw Error("Collection differs from checkout");
  }
  const client = remote ?? githubClient(directory, run);
  const repo = JSON.parse(
    run("gh", ["repo", "view", "--json", "nameWithOwner"], directory),
  ).nameWithOwner;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error("Invalid repository identity");
  const release = await client.findRelease(repo, manifest.release);
  if (!release) {
    throw Error("Dated Release is unavailable");
  }
  const candidates = release.assets.filter((asset) =>
    new RegExp(`^audit-${id.replaceAll(".", String.raw`\.`)}-[a-f0-9]{64}\\.tar\\.gz$`).test(
      asset.name,
    ),
  );
  if (candidates.length !== 1) {
    throw Error("Release must contain exactly one current evidence bundle");
  }
  const asset = candidates[0];
  const sha256 = asset.name.slice(-71, -7);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "acr-fetch-"));
  try {
    await client.downloadAsset(repo, release, asset.name, temporary);
    const bundle = path.join(temporary, asset.name);
    if (digest(fs.readFileSync(bundle)) !== sha256) {
      throw Error("Downloaded bundle checksum mismatch");
    }
    const payload = path.join(temporary, "payload");
    fs.mkdirSync(payload);
    extractBundle(bundle, payload);
    if (
      JSON.stringify(readJSON(path.join(payload, "evidence/manifest.json"))) !==
      JSON.stringify(manifest)
    ) {
      throw Error("Downloaded evidence manifest differs from checkout");
    }
    const files = inventory(payload);
    for (const [name, hash] of Object.entries(manifest.files)) {
      if (files[name] !== hash) throw Error("Downloaded evidence checksum mismatch");
    }
    const location = path.join(directory, ".cache/audit/collections", id);
    fs.mkdirSync(location, { recursive: true });
    fs.copyFileSync(bundle, path.join(location, asset.name));
    writeJSON(path.join(location, "collection.json"), {
      bundle: asset.name,
      files,
      id,
      sha256,
      status: release.draft ? "pending" : "published",
    });
  } finally {
    fs.rmSync(temporary, { force: true, recursive: true });
  }
}
