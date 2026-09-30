/** Persisted bundle metadata rejects corruption and retains legacy extension fields. */

import assert from "node:assert/strict";
import test from "node:test";
import {
  auditProvenanceSchema,
  collectionRecordSchema,
  evidenceManifestSchema,
  finalizedCollectionSchema,
} from "../audit/bundle-schemas.ts";

/** A historical archive predates the optional preparation and publication metadata. */
const legacyRecord = {
  id: "2026-09-30.1",
  status: "historical-unreviewed",
  bundle: "audit-2026-09-30.1.tar.gz",
  sha256: "a".repeat(64),
  files: { "evidence/home.json": "b".repeat(64) },
  historicalNote: "Retained without review",
};

test("reservation records need no archive; finalized records require all archive metadata", () => {
  assert.deepEqual(collectionRecordSchema.parse({ id: "2026-10-01.1", status: "collecting" }), {
    id: "2026-10-01.1",
    status: "collecting",
  });
  for (const missing of ["bundle", "sha256", "files"] as const) {
    const incomplete: Record<string, unknown> = { ...legacyRecord };
    delete incomplete[missing];
    assert.equal(collectionRecordSchema.safeParse(incomplete).success, false);
    assert.equal(finalizedCollectionSchema.safeParse(incomplete).success, false);
  }
});

test("historical records retain extensions without requiring modern metadata", () => {
  assert.deepEqual(finalizedCollectionSchema.parse(legacyRecord), legacyRecord);
  const provenance = { runId: "legacy-run", workerVersion: "v7.6", reviewed: false };
  assert.deepEqual(auditProvenanceSchema.parse(provenance), provenance);
  const manifest = {
    version: 1,
    collection: legacyRecord.id,
    release: `audit-${legacyRecord.id}`,
    provenance,
    files: legacyRecord.files,
    historicalNote: "Original collection metadata",
  };
  assert.deepEqual(evidenceManifestSchema.parse(manifest), manifest);
});

test("malformed persisted identifiers, statuses, checksums and provenance fail validation", () => {
  for (const fields of [
    { id: "2026-10-01.0" },
    { status: "approved" },
    { sha256: "not-a-checksum" },
    { files: { "evidence/home.json": "truncated" } },
    { pr: -1 },
  ]) {
    assert.equal(collectionRecordSchema.safeParse({ ...legacyRecord, ...fields }).success, false);
  }
  assert.equal(auditProvenanceSchema.safeParse({ reviewed: "yes" }).success, false);
  assert.equal(auditProvenanceSchema.safeParse({ states: [1] }).success, false);
  assert.equal(evidenceManifestSchema.safeParse({ version: 2 }).success, false);
});
