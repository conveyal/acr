/** Types inferred from local runtime schemas and report rendering contracts. */
import type { z } from "zod";
import type {
  assessmentSchema,
  criterionSchema,
  findingsSchema,
  catalogDataSchema,
  openCriterionSchema,
  reportDataSchema,
} from "./report-schemas.ts";
/** One locally assessed criterion including evidence and review status. */
export type Criterion = z.infer<typeof criterionSchema>;
/** Validated local assessment and its retained extension fields. */
export type Assessment = z.infer<typeof assessmentSchema>;
/** Finding identity and criterion references used by report validation. */
export type Finding = z.infer<typeof findingsSchema>[number];
/** Validated operational catalog fields used to generate the report. */
export type Catalog = z.infer<typeof catalogDataSchema>;
/** Generated OpenACR criterion including component adherence notes. */
export type OpenCriterion = z.infer<typeof openCriterionSchema>;
/** Generated report contract layered on the upstream interchange schema. */
export type OpenACR = z.infer<typeof reportDataSchema>;
/** Evidence lookup and linking options shared by generation and validation. */
export interface ReportOptions {
  directory?: string;
  localEvidence?: boolean;
}
