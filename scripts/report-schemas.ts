/** Runtime schemas for local assessment inputs and the pinned upstream report formats. */
import fs from "node:fs";
import { z } from "zod";

/** Allowed WCAG A/AA ratings used by the assessment and report domain gates. */
export const ratingSchema = z.enum([
  "supports",
  "partially-supports",
  "does-not-support",
  "not-applicable",
]);

/** Local criterion shape; extra evidence metadata remains available to callers. */
export const criterionSchema = z.looseObject({
  id: z.string(),
  name: z.string(),
  level: z.string(),
  component: z.string(),
  rating: z.string().nullable(),
  approved: z.boolean(),
  remarks: z.string(),
  evidence: z.array(z.string()),
  findings: z.array(z.string()),
});

/** Local assessment input shape, including review and audit provenance. */
export const assessmentSchema = z.looseObject({
  title: z.string(),
  product: z.looseObject({ name: z.string(), version: z.string() }),
  author: z.looseObject({ name: z.string(), email: z.string() }),
  vendor: z.looseObject({ name: z.string().optional(), email: z.string() }),
  notes: z.string(),
  evaluationDate: z.string(),
  publicationDate: z.string().nullable(),
  distributionLicense: z.string().nullable(),
  evaluation_methods_used: z.string(),
  authorQualifications: z.string().nullable().optional(),
  qualifiedReviewApproved: z.boolean(),
  vendorApproved: z.boolean(),
  criteria: z.array(criterionSchema),
  latestAudit: z
    .looseObject({
      runId: z.string().optional(),
      timestamp: z.string().optional(),
      baseURL: z.string().optional(),
      reviewed: z.boolean().optional(),
      states: z.array(z.string()).optional(),
    })
    .optional(),
  reportReview: z
    .looseObject({
      approved: z.boolean(),
      reviewer: z.string().optional(),
      reviewedAt: z.string().optional(),
      findingsReconciled: z.boolean().optional(),
      scopeReviewed: z.boolean().optional(),
      publicDistributionApproved: z.boolean().optional(),
      kind: z.string().optional(),
    })
    .optional(),
});

/** Minimum finding information needed to validate criterion references. */
export const findingsSchema = z.array(
  z.looseObject({ id: z.string(), criteria: z.array(z.string()) }),
);

/** Operational catalog shape, checked after the unchanged upstream catalog schema. */
export const catalogDataSchema = z.looseObject({
  chapters: z.array(
    z.looseObject({
      id: z.string(),
      criteria: z
        .array(
          z.looseObject({
            id: z.string(),
            components: z.array(z.string()),
          }),
        )
        .default([]),
    }),
  ),
  terms: z.array(z.looseObject({ id: z.string(), label: z.string(), description: z.string() })),
});

/** Read a pinned JSON Schema and import its validators once per process. */
function importPinnedSchema(name: string) {
  const schema = JSON.parse(
    fs.readFileSync(new URL(`../schemas/${name}-0.1.0.json`, import.meta.url), "utf8"),
  );
  return z.fromJSONSchema(schema);
}

/** Validator imported directly from the unchanged OpenACR JSON Schema. */
export const openACRSchema = importPinnedSchema("openacr");
/** Validator imported directly from the unchanged OpenACR catalog JSON Schema. */
export const openACRCatalogSchema = importPinnedSchema("openacr-catalog");

/** OpenACR criterion fields consumed by catalog-specific validation and rendering. */
export const openCriterionSchema = z.looseObject({
  num: z.string(),
  components: z.array(
    z.looseObject({
      name: z.string(),
      adherence: z.looseObject({ level: z.string(), notes: z.string() }).optional(),
    }),
  ),
});

/** Required local report fields layered on the broader upstream interchange schema. */
export const reportDataSchema = z.looseObject({
  title: z.string(),
  product: assessmentSchema.shape.product,
  author: assessmentSchema.shape.author,
  vendor: assessmentSchema.shape.vendor,
  report_date: z.string(),
  version: z.number().int(),
  notes: z.string(),
  evaluation_methods_used: z.string(),
  catalog: z.string(),
  chapters: z.record(
    z.string(),
    z.looseObject({
      notes: z.string(),
      disabled: z.boolean().optional(),
      criteria: z.array(openCriterionSchema).optional(),
    }),
  ),
  license: z.string().optional(),
});

/** Catalog fields needed by domain gates, without tightening the upstream interchange schema. */
export const reportDomainSchema = z.looseObject({
  catalog: z.string().optional(),
  chapters: z
    .record(
      z.string(),
      z.looseObject({
        criteria: z
          .array(
            openCriterionSchema.extend({
              components: z
                .array(
                  openCriterionSchema.shape.components.element.extend({
                    adherence: z
                      .looseObject({ level: z.string(), notes: z.string().optional() })
                      .optional(),
                  }),
                )
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});
