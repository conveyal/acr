/** Shared collector types and runtime boundary schemas. */
import type { TestInfo } from "@playwright/test";

/** Runtime contracts for target inputs and normalized target configuration. */
import { z } from "zod";
import type {
  fileHashesSchema,
  evidenceManifestSchema,
  auditProvenanceSchema,
  collectionRecordSchema,
  finalizedCollectionSchema,
} from "./bundle-schemas.ts";

/** Positive integer budgets expressed in milliseconds. */
export const timeoutSchema = z.object({
  upload: z.number().int().positive(),
  interactive: z.number().int().positive(),
  regional: z.number().int().positive(),
  action: z.number().int().positive(),
});
/** Untrusted target options accept extension fields but validate every consumed setting. */
export const targetInputSchema = z.looseObject({
  baseURL: z.string().optional(),
  backendURL: z.string().optional(),
  storageState: z.string().optional(),
  disposable: z.boolean().optional(),
  workerVersion: z.string().optional(),
  trace: z.boolean().optional(),
  timeouts: timeoutSchema.partial().optional(),
});
/** Normalized configuration stored with a recoverable collector run. */
export const targetConfigurationSchema = z.looseObject({
  baseURL: z.string(),
  backendURL: z.string(),
  storageState: z.string().optional(),
  local: z.boolean(),
  disposable: z.literal(true),
  workerVersion: z.string(),
  trace: z.boolean(),
  timeouts: timeoutSchema,
});
export type TargetInput = z.infer<typeof targetInputSchema>;
export type TargetConfiguration = z.infer<typeof targetConfigurationSchema>;
export type FileHashes = z.infer<typeof fileHashesSchema>;
export type EvidenceManifest = z.infer<typeof evidenceManifestSchema>;
export type AuditProvenance = z.infer<typeof auditProvenanceSchema>;
export type CollectionRecord = z.infer<typeof collectionRecordSchema>;
export type FinalizedCollection = z.infer<typeof finalizedCollectionSchema>;
/** Minimal database identity with optional fields consumed by collector workflows. */
export const backendDocumentSchema = z.looseObject({
  _id: z.string(),
  name: z.string().optional(),
  sourceId: z.string().optional(),
  status: z.string().optional(),
  regionId: z.string().optional(),
  featureCount: z.number().optional(),
  attributes: z.array(z.unknown()).optional(),
  deleted: z.boolean().optional(),
  description: z.string().optional(),
});
export type BackendDocument = z.infer<typeof backendDocumentSchema>;
/** Activity responses identify active work and the owning region when available. */
export const activitySchema = z.looseObject({
  taskProgress: z.array(
    z.looseObject({
      id: z.string(),
      state: z.string(),
      workProduct: z.looseObject({ regionId: z.string().optional() }).optional(),
    }),
  ),
});
/** Opportunity upload responses contain a status identifier rather than a database document. */
export const uploadStatusSchema = z.looseObject({ id: z.string(), status: z.string().optional() });
/** Regional jobs expose their identity through backend-version-specific fields. */
export const jobSchema = z.looseObject({
  jobId: z.string().optional(),
  _id: z.string().optional(),
  id: z.string().optional(),
});
/** Persisted ownership remains extensible while validating deletion-critical identifiers. */
export const ownedIdSchema = z.string().regex(/^[a-f0-9]{24}$/);
/** Only maintained collections and valid parent identifiers can enter the cleanup ledger. */
export const ownedResourceSchema = z.looseObject({
  collection: z.enum([
    "aggregationAreas",
    "bundles",
    "dataGroups",
    "dataSources",
    "modifications",
    "opportunitySources",
    "projects",
    "regional-analyses",
    "regions",
    "scenarios",
    "uploadStatuses",
  ]),
  id: ownedIdSchema,
  parent: z.record(z.string(), ownedIdSchema),
  name: z.string().optional(),
  deleted: z.boolean(),
});
/** Validate nested ownership and pending asynchronous tasks before recovery. */
export const recoveryManifestSchema = z.looseObject({
  version: z.literal(1),
  runId: z.string().regex(/^acr-(?:[a-f0-9-]+|\d{4}-\d{2}-\d{2}\.[1-9]\d*)$/),
  target: targetConfigurationSchema.optional(),
  resources: z.array(ownedResourceSchema),
  cleanupComplete: z.boolean().optional(),
  regionIntent: z
    .looseObject({
      name: z.string(),
      description: z.string(),
      state: z.enum(["pending", "recorded", "absent"]),
    })
    .optional(),
  pendingTasks: z
    .array(z.looseObject({ id: z.string(), regionId: ownedIdSchema, kind: z.string() }))
    .optional(),
});
export type OwnedResource = z.infer<typeof ownedResourceSchema>;
export type RecoveryManifest = z.infer<typeof recoveryManifestSchema>;
export interface ProvisionedDataset {
  regionPath: string;
  projectPath: string;
  modificationPath: string;
  results: string;
  aggregated: string;
  datasourcePath: string;
  aggregationPath: string;
  projectName: string;
  regionalName: string;
  settings: Record<string, unknown>;
  populationId: string;
  scenarioId: string;
}
export interface Dataset extends ProvisionedDataset {
  config: TargetConfiguration;
  runId: string;
  runDir: string;
}
export type AttachmentInfo = Pick<TestInfo, "attach">;
export interface KeyboardResult {
  passed: boolean;
  blocked?: boolean;
  detail?: string;
  [key: string]: unknown;
}
declare global {
  interface Window {
    LeafletMap?: { getCenter: () => { lat: number; lng: number }; getZoom: () => number };
    __user?: { idToken?: string; adminTempAccessGroup?: string; [key: string]: unknown };
  }
}
