/** Validate maintained bundle records while preserving historical provenance extensions. */

import { z } from "zod";

/** UTC collection date followed by its reserved positive sequence number. */
export const collectionIdentifierSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}\.[1-9]\d*$/);

/** SHA-256 hashes keyed by relative artifact paths. */
export const fileHashesSchema = z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/));

/** Legacy collections may omit newer provenance fields and retain extra observations. */
export const auditProvenanceSchema = z.looseObject({
  runId: z.string().optional(),
  timestamp: z.string().optional(),
  baseURL: z.string().optional(),
  reviewed: z.boolean().optional(),
  states: z.array(z.string()).optional(),
});

/** Tracked evidence index for a collection and its dated release. */
export const evidenceManifestSchema = z.looseObject({
  version: z.literal(1),
  collection: collectionIdentifierSchema,
  release: z.string(),
  provenance: auditProvenanceSchema,
  files: fileHashesSchema,
});

/** Reservation records have no archive yet; completed records require its full inventory. */
export const collectionRecordSchema = z
  .looseObject({
    id: collectionIdentifierSchema,
    status: z.enum(["collecting", "pending", "published", "historical-unreviewed"]),
    bundle: z.string().optional(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    files: fileHashesSchema.optional(),
    migrated: z.boolean().optional(),
    repo: z.string().optional(),
    preparedCommit: z.string().optional(),
    asset: z.string().optional(),
    pr: z.number().int().positive().optional(),
    publishedCommit: z.string().optional(),
    releaseURL: z.string().optional(),
  })
  .superRefine((record, context) => {
    if (record.status !== "collecting") {
      for (const field of ["bundle", "sha256", "files"] as const) {
        if (record[field] === undefined) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: "Finalized records require archive metadata",
          });
        }
      }
    }
  });

/** Finalized archive metadata is mandatory when reviewing or restoring evidence. */
export const finalizedCollectionSchema = collectionRecordSchema.and(
  z.looseObject({
    bundle: z.string(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    files: fileHashesSchema,
  }),
);
