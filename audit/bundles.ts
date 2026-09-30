/** Reserve collections, inventory evidence, and verify portable review bundles. */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

import type { z } from "zod";
import { collectionRecordSchema, evidenceManifestSchema } from "./bundle-schemas.ts";

import type { AuditProvenance, EvidenceManifest, FileHashes } from "./types.ts";
/** Collection identifiers use the UTC date and a positive reservation counter. */
export const collectionPattern = /^\d{4}-\d{2}-\d{2}\.[1-9]\d*$/;

/** Hash artifact bytes without normalizing their content. */
export const digest = (bytes: string | Uint8Array) =>
  crypto.createHash("sha256").update(bytes).digest("hex");

/** Parse JSON inputs whose shape is validated by their owning boundary. */
export const readJSON = <T = unknown>(file: string): T => JSON.parse(fs.readFileSync(file, "utf8"));
/** Parse and validate persisted metadata before trusting its fields. */
export function readValidatedJSON<T>(file: string, schema: z.ZodType<T>): T {
  return schema.parse(readJSON(file));
}

/** Atomically replace a JSON document after creating its parent directory. */
export function writeJSON(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
}
/** Enumerate regular artifact files and reject links or unsupported entries. */
export function inventory(directory: string, prefix = ""): FileHashes {
  const files: FileHashes = {};
  for (const name of fs.readdirSync(path.join(directory, prefix)).sort()) {
    if (name === ".DS_Store") {
      continue;
    }
    const relative = prefix ? `${prefix}/${name}` : name;
    const stat = fs.lstatSync(path.join(directory, relative));
    if (stat.isSymbolicLink()) {
      throw Error(`Symbolic links are not evidence: ${relative}`);
    }
    if (stat.isDirectory()) {
      Object.assign(files, inventory(directory, relative));
    } else if (stat.isFile()) {
      files[relative] = digest(fs.readFileSync(path.join(directory, relative)));
    } else {
      throw Error(`Unsupported artifact: ${relative}`);
    }
  }
  return files;
}
/** Reserve a unique collection identifier, including failed attempts. */
export function reserveCollection(directory: string, timestamp: string | Date = new Date()) {
  const date = new Date(timestamp).toISOString().slice(0, 10);
  const parent = path.join(directory, ".cache/audit/collections");
  fs.mkdirSync(parent, { recursive: true });
  const legacy = path.join(directory, ".cache/audit/legacy");
  const ledger = path.join(parent, "reservations.log");
  const manifestFile = path.join(directory, "evidence/manifest.json");
  const existing = [
    ...fs.readdirSync(parent),
    ...(fs.existsSync(legacy) ? fs.readdirSync(legacy) : []),
    ...(fs.existsSync(ledger) ? fs.readFileSync(ledger, "utf8").split("\n") : []),
    ...(fs.existsSync(manifestFile)
      ? [readValidatedJSON(manifestFile, evidenceManifestSchema).collection]
      : []),
  ];
  let number =
    1 +
    Math.max(
      0,
      ...existing
        .filter((name) => collectionPattern.test(name) && name.startsWith(date + "."))
        .map((name) => Number(name.slice(11))),
    );
  while (true) {
    const destination = path.join(parent, `${date}.${number}`);
    try {
      fs.mkdirSync(destination);
      fs.appendFileSync(ledger, `${date}.${number}\n`);
      writeJSON(
        path.join(destination, "collection.json"),
        collectionRecordSchema.parse({
          id: `${date}.${number}`,
          status: "collecting",
        }),
      );
      return destination;
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") {
        throw error;
      }
      number++;
    }
  }
}
/** Require an exact match of artifact paths and their checksums. */
export function verifyInventory(directory: string, expected: FileHashes) {
  const actual = inventory(directory);
  if (
    Object.keys(actual).length !== Object.keys(expected).length ||
    Object.entries(expected).some(([name, hash]) => actual[name] !== hash)
  ) {
    throw Error("Artifact inventory or checksum mismatch");
  }
}
/** Compress an inventory and verify its contents before retaining the archive. */
export function pack(directory: string, destination: string) {
  const files = inventory(directory);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp`;
  execFileSync("tar", ["--exclude=.DS_Store", "-czf", temporary, "-C", directory, "."], {
    env: { ...process.env, COPYFILE_DISABLE: "1" },
  });
  verifyBundle(temporary, files);
  fs.renameSync(temporary, destination);
  return { files, sha256: digest(fs.readFileSync(destination)) };
}
/** Reject unsafe paths and links before extracting an archive. */
export function extractBundle(bundle: string, destination: string) {
  const names = execFileSync("tar", ["-tzf", bundle], { encoding: "utf8" }).trim().split("\n");
  if (names.some((name) => name.startsWith("/") || name.split("/").includes(".."))) {
    throw Error("Unsafe archive path");
  }
  const types = execFileSync("tar", ["-tvzf", bundle], { encoding: "utf8" }).trim().split("\n");
  if (types.some((line) => !/^[-d]/.test(line))) {
    throw Error("Archive contains links or unsupported entries");
  }
  execFileSync("tar", ["-xzf", bundle, "-C", destination]);
}
/** Verify archive bytes and every extracted artifact in a temporary directory. */
export function verifyBundle(bundle: string, files: FileHashes, sha256?: string) {
  if (sha256 && digest(fs.readFileSync(bundle)) !== sha256) {
    throw Error("Bundle checksum mismatch");
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "acr-bundle-"));
  try {
    extractBundle(bundle, directory);
    verifyInventory(directory, files);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
}
/** Stable anchors let report links survive evidence restoration and compaction. */
export const anchor = (name: string) => `artifact-${digest(name).slice(0, 16)}`;
/** Build the tracked checksum index, excluding its own generated metadata. */
export function evidenceManifest(
  evidence: string,
  id: string,
  provenance: AuditProvenance = {},
): EvidenceManifest {
  if (!collectionPattern.test(id)) {
    throw Error("Invalid collection identifier");
  }
  return evidenceManifestSchema.parse({
    collection: id,
    files: Object.fromEntries(
      Object.entries(inventory(evidence))
        .filter(([name]) => !["manifest.json", "README.md"].includes(name))
        .map(([name, sha256]) => [`evidence/${name}`, sha256]),
    ),
    provenance,
    release: `audit-${id}`,
    version: 1,
  });
}
/** Render a compact release index or local links for a downloadable bundle. */
export function evidenceIndex(manifest: EvidenceManifest, local = false) {
  return (
    `# Accessibility evidence\n\nCollection: ${manifest.collection}\n\n` +
    `[Dated Release](https://github.com/conveyal/acr/releases/tag/${manifest.release}) — unpublished during review; repository write access is required.\n\n` +
    `Download the evidence bundle from this Release to inspect these files. Raw evidence is excluded from Git. Checksums and provenance are in [manifest.json](manifest.json).\n\n` +
    `| Artifact | SHA-256 |\n| --- | --- |\n${Object.entries(manifest.files)
      .map(
        ([name, hash]) =>
          `| <a id="${anchor(name)}"></a>${local ? `[${name}](${name.slice(9)})` : name} | ${hash} |`,
      )
      .join("\n")}\n`
  );
}
/** Maintained companion inputs included alongside each assessment. */
export const companions = [
  "findings.json",
  "findings.md",
  "scope.md",
  "roadmap.md",
  "questionnaire-draft.md",
  "manual-testing.md",
  "criteria-matrix.md",
  "criteria-matrix.csv",
  "acr-draft.md",
];
/** Copy maintained report companions into a collection draft. */
export function copyCompanions(source: string, destination: string) {
  for (const name of companions) {
    if (fs.existsSync(path.join(source, name)))
      fs.copyFileSync(path.join(source, name), path.join(destination, name));
  }
}
/** Replace raw companion links with stable anchors in the tracked evidence index. */
export function indexCompanionLinks(directory: string, manifest: EvidenceManifest) {
  for (const name of companions.filter((name) => name.endsWith(".md"))) {
    const file = path.join(directory, name);
    if (!fs.existsSync(file)) {
      continue;
    }
    const source = fs.readFileSync(file, "utf8");
    fs.writeFileSync(
      file,
      source.replaceAll(/\]\((evidence\/[^)#]+)\)/g, (match, reference) => {
        if (["evidence/README.md", "evidence/manifest.json"].includes(reference)) {
          return match;
        }
        if (!manifest.files[reference]) {
          throw Error(`Missing companion evidence: ${reference}`);
        }
        return `](evidence/README.md#${anchor(reference)})`;
      }),
    );
  }
}
