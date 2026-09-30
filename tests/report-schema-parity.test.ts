/** Regression fixtures whose acceptance matched Ajv 8.17.1 before its removal. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import YAML from "yaml";
import {
  openACRSchema,
  openACRCatalogSchema,
  assessmentSchema,
} from "../scripts/report-schemas.ts";

/** A validator acceptance fixture recorded during the Ajv to Zod migration. */
interface ValidationFixture {
  name: string;
  input: unknown;
  valid: boolean;
}

/** Read current pinned report data without relying on the replacement validators. */
function yamlFixture(relative: string): Record<string, unknown> {
  return YAML.parse(fs.readFileSync(new URL(relative, import.meta.url), "utf8"));
}

const report = yamlFixture("../reports/conveyal-openacr.yaml");
const catalog = yamlFixture("../catalogs/wcag-2.1-vpat-2.5rev.yaml");
const reportCases: ValidationFixture[] = [
  { name: "current report", input: report, valid: true },
  { name: "missing required fields", input: {}, valid: false },
  { name: "null report", input: null, valid: false },
  { name: "array report", input: [], valid: false },
  { name: "unknown property", input: { ...report, extra: { nested: true } }, valid: true },
  { name: "null title", input: { ...report, title: null }, valid: false },
  { name: "numeric title", input: { ...report, title: 5 }, valid: false },
  {
    name: "missing required referenced contact email",
    input: { ...report, author: {} },
    valid: false,
  },
  { name: "null referenced contact", input: { ...report, author: null }, valid: false },
  { name: "noninteger version", input: { ...report, version: 1.5 }, valid: false },
  {
    name: "invalid enum",
    input: { ...report, related_openacrs: [{ type: "invalid" }] },
    valid: false,
  },
  { name: "null array", input: { ...report, related_openacrs: null }, valid: false },
  {
    name: "missing referenced nested component name",
    input: {
      ...report,
      chapters: { success_criteria_level_a: { criteria: [{ num: "1", components: [{}] }] } },
    },
    valid: false,
  },
  {
    name: "invalid referenced criteria array",
    input: { ...report, chapters: { success_criteria_level_a: { criteria: "invalid" } } },
    valid: false,
  },
  {
    name: "unknown contact property",
    input: { ...report, author: { email: "", extra: "kept" } },
    valid: true,
  },
];
const catalogCases: ValidationFixture[] = [
  { name: "current catalog", input: catalog, valid: true },
  { name: "missing required fields", input: {}, valid: false },
  { name: "null catalog", input: null, valid: false },
  { name: "array catalog", input: [], valid: false },
  { name: "unknown property", input: { ...catalog, extra: { nested: true } }, valid: true },
  { name: "null title", input: { ...catalog, title: null }, valid: false },
  { name: "numeric title", input: { ...catalog, title: 5 }, valid: false },
  {
    name: "noninteger chapter order",
    input: { ...catalog, chapters: [{ id: "a", label: "A", order: 1.5 }] },
    valid: false,
  },
  {
    name: "missing nested criterion fields",
    input: { ...catalog, chapters: [{ id: "a", label: "A", order: 1, criteria: [{ id: "x" }] }] },
    valid: false,
  },
  {
    name: "null array item",
    input: {
      ...catalog,
      standards: [{ id: "a", label: "A", report_heading: "A", url: "x", chapters: [null] }],
    },
    valid: false,
  },
  { name: "null terms", input: { ...catalog, terms: null }, valid: false },
];

for (const [name, schema, cases] of [
  ["OpenACR", openACRSchema, reportCases],
  ["catalog", openACRCatalogSchema, catalogCases],
] as const) {
  test(`${name} preserves the acceptance of every recorded Ajv parity fixture`, () => {
    for (const fixture of cases) {
      assert.equal(schema.safeParse(fixture.input).success, fixture.valid, fixture.name);
    }
  });
}

test("assessment parsing preserves unknown product, contact, criterion and provenance fields", () => {
  const input = JSON.parse(fs.readFileSync(new URL("../assessment.json", import.meta.url), "utf8"));
  input.extension = { retained: true };
  input.product.extension = "product";
  input.author.extension = "author";
  input.criteria[0].extension = "criterion";
  input.latestAudit = { ...input.latestAudit, extension: "audit" };
  assert.deepEqual(assessmentSchema.parse(input), input);
});
