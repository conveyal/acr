/** Validate assessments and generate the HTML, Markdown and OpenACR report artifacts. */
import fs from "node:fs";
import path from "node:path";
import {
  assessmentSchema,
  catalogDataSchema,
  findingsSchema,
  openACRSchema,
  openACRCatalogSchema,
  reportDomainSchema,
  ratingSchema,
} from "./report-schemas.ts";
import YAML from "yaml";
import { anchor, digest } from "../audit/bundles.ts";
import { evidenceManifestSchema } from "../audit/bundle-schemas.ts";

import type { Assessment, OpenACR, ReportOptions } from "./report-types.ts";
/** Repository root used by the command line and default evidence lookups. */
export const root = path.resolve(import.meta.dirname, "..");
/** Read a repository-owned UTF-8 report source. */
const read = (name: string) => fs.readFileSync(path.join(root, name), "utf8");
/** Load and structurally validate the local assessment without dropping extension fields. */
export const loadAssessment = (): Assessment =>
  assessmentSchema.parse(JSON.parse(read("assessment.json")));
/** Pinned catalog validated on initialization and retained for domain checks. */
const catalog = catalogDataSchema.parse(
  openACRCatalogSchema.parse(YAML.parse(read("catalogs/wcag-2.1-vpat-2.5rev.yaml"))),
);
/** Report filenames shared by local builds and immutable evidence bundles. */
export const reportNames = {
  html: "conveyal-acr.html",
  markdown: "conveyal-acr.md",
  openACR: "conveyal-openacr.yaml",
} as const;

/** Allowed rating identifiers used by catalog domain validation. */
const terms = new Set<string>(ratingSchema.options);
/** HTML replacements for authored report content. */
const htmlEscapes: Record<string, string> = {
  '"': "&quot;",
  "&": "&amp;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;",
};
/** Resolve the catalog chapter for an already checked assessment level. */
const chapterName = (level: string) =>
  level === "A" ? "success_criteria_level_a" : "success_criteria_level_aa";
/** Escape text inserted into HTML content and attributes. */
const escape = (value: unknown) =>
  String(value).replaceAll(/[&<>"']/g, (character) => htmlEscapes[character]!);
/** Escape authored text used in Markdown table cells. */
const md = (value: unknown) =>
  String(value)
    .replaceAll("|", String.raw`\|`)
    .replaceAll("\n", "<br>");

/** Compute shared status wording and reconciliation notices for every report format. */
function reportStatus(data: Assessment, completeConformance: boolean) {
  const status = completeConformance
    ? "Reviewed report"
    : data.reportReview?.approved
      ? "Reviewed interim assessment — incomplete conformance evaluation"
      : "Internal working draft — do not submit";
  const audit = data.latestAudit;
  const requiresReconciliation = audit && !audit.reviewed;
  const notes = requiresReconciliation
    ? `${data.notes}\n\nNEW EVIDENCE AWAITS RECONCILIATION: ${audit.runId} collected at ${audit.baseURL} on ${audit.timestamp}. Criterion ratings and approvals refer to the historical ${data.evaluationDate} evaluation and were not re-reviewed.`
    : data.notes;
  const banner = requiresReconciliation
    ? `New evidence awaits reconciliation. Run ${audit.runId} collected ${audit.timestamp}. Assessment text and criterion ratings are historical (${data.evaluationDate}); approvals were not re-reviewed.`
    : null;
  return { status, notes, banner };
}

/** Validate local input structure, criterion coverage, references and publication gates. */
export function validateAssessment(
  input: unknown,
  completeConformance = false,
  options: ReportOptions = {},
) {
  const data = assessmentSchema.parse(input);
  const directory = options.directory ?? root;
  const manifestPath = path.join(directory, "evidence/manifest.json");
  const manifest = fs.existsSync(manifestPath)
    ? evidenceManifestSchema.parse(JSON.parse(fs.readFileSync(manifestPath, "utf8")))
    : null;
  const expected = catalog.chapters
    .filter((c) => ["success_criteria_level_a", "success_criteria_level_aa"].includes(c.id))
    .flatMap((c) => (c.criteria ?? []).map((r) => [r.id, c.id]));
  if (expected.length !== 50 || data.criteria.length !== 50) {
    throw Error("Expected exactly 50 WCAG 2.1 A/AA criteria");
  }
  const seen = new Set<string>();
  const findings = findingsSchema.parse(
    JSON.parse(fs.readFileSync(path.join(directory, "findings.json"), "utf8")),
  );
  for (const row of data.criteria) {
    if (seen.has(row.id)) {
      throw Error(`Duplicate criterion ${row.id}`);
    }
    seen.add(row.id);
    const chapter = expected.find(([id]) => id === row.id)?.[1];
    if (!["A", "AA"].includes(row.level) || chapter !== chapterName(row.level)) {
      throw Error(`Unknown criterion or incorrect level: ${row.id}`);
    }
    if (row.component !== "web") {
      throw Error(`Unsupported component: ${row.component}`);
    }
    if (row.rating !== null && !terms.has(row.rating)) {
      throw Error(`Invalid A/AA rating: ${row.rating}`);
    }
    if (typeof row.approved !== "boolean") {
      throw Error(`Missing review status: ${row.id}`);
    }
    if (!row.remarks?.trim()) {
      throw Error(`Missing explanatory remarks: ${row.id}`);
    }
    for (const reference of row.evidence) {
      const target = path.resolve(directory, reference);
      const expectedHash = manifest?.files?.[reference];
      if (
        !target.startsWith(directory + path.sep) ||
        (manifest ? !expectedHash : !fs.existsSync(target)) ||
        (options.localEvidence && !fs.existsSync(target))
      ) {
        throw Error(`Invalid evidence reference: ${reference}`);
      }
      if (
        expectedHash &&
        options.localEvidence &&
        fs.existsSync(target) &&
        digest(fs.readFileSync(target)) !== expectedHash
      ) {
        throw Error(`Evidence checksum mismatch: ${reference}`);
      }
    }
    for (const id of row.findings) {
      if (!findings.some((f) => f.id === id && f.criteria.includes(row.id)))
        throw Error(`Invalid finding reference: ${id}`);
    }
    if (row.id === "4.1.1" && row.rating !== "supports") {
      throw Error("Parsing 4.1.1 must be Supports under current template errata");
    }
    if (completeConformance && (!row.rating || !row.approved)) {
      throw Error(`Unresolved assessment: ${row.id}`);
    }
  }
  if (completeConformance) {
    if (data.latestAudit && !data.latestAudit.reviewed) {
      throw Error("Latest audit evidence requires reconciliation");
    }
    if (!data.qualifiedReviewApproved || !data.vendorApproved) {
      throw Error("Qualified review and vendor approval required");
    }
    for (const role of ["author", "vendor"] as const) {
      if (!data[role]?.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw Error(`Real ${role} contact email required`);
      }
    }
    if (!data.authorQualifications?.trim()) {
      throw Error("Evaluator qualifications required");
    }
    if (!data.author.name?.trim()) {
      throw Error("Designated author required");
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(data.publicationDate ?? "") ||
      Number.isNaN(Date.parse(data.publicationDate ?? ""))
    ) {
      throw Error("Valid publication date required");
    }
    if (!data.distributionLicense?.trim()) {
      throw Error("Approved distribution license required");
    }
  }
}
/** Export the assessment in the unchanged upstream OpenACR format. */
export function exportOpenACR(
  data: Assessment,
  completeConformance = false,
  options: ReportOptions = {},
): OpenACR {
  return buildOpenACR(data, completeConformance, options, reportStatus(data, completeConformance));
}

/** Build an OpenACR using status wording shared with the rendered artifacts. */
function buildOpenACR(
  data: Assessment,
  completeConformance: boolean,
  options: ReportOptions,
  status: ReturnType<typeof reportStatus>,
): OpenACR {
  validateAssessment(data, completeConformance, options);
  const chapters: OpenACR["chapters"] = {};
  for (const level of ["A", "AA"]) {
    const rows = data.criteria.filter((r) => r.level === level);
    chapters[chapterName(level)] = {
      criteria: rows.map((r) => ({
        num: r.id,
        components: [
          {
            name: "web",
            ...(r.rating
              ? {
                  adherence: {
                    level: r.rating,
                    notes: `${!completeConformance ? "Provisional; qualified review pending. " : ""}${r.remarks}${
                      r.evidence.length
                        ? "\nEvidence: " +
                          r.evidence.map((e) => evidenceLink(e, options)).join(", ")
                        : ""
                    }${
                      r.findings.length
                        ? "\nFindings: " + r.findings.join(", ") + " (../findings.md)"
                        : ""
                    }`,
                  },
                }
              : {}),
          },
        ],
      })),
      notes: rows
        .filter((r) => !r.rating)
        .map((r) => `${r.id}: Pending evidence — ${r.remarks}`)
        .join("\n"),
    };
  }
  chapters.success_criteria_level_aaa = {
    disabled: true,
    notes: "AAA is outside this report.",
  };
  const output: OpenACR = {
    author: data.author,
    catalog: "wcag-2.1-vpat-2.5rev",
    chapters,
    evaluation_methods_used:
      data.evaluation_methods_used +
      "\nEvaluator qualifications: " +
      (data.authorQualifications || "Pending qualified evaluator designation."),
    notes: status.notes,
    product: data.product,
    report_date: completeConformance ? data.publicationDate! : data.evaluationDate,
    title: completeConformance ? "Conveyal Accessibility Conformance Report" : data.title,
    vendor: data.vendor,
    version: 1,
  };
  if (data.distributionLicense) {
    output.license = data.distributionLicense;
  }
  const validation = openACRSchema.safeParse(output);
  if (!validation.success) {
    throw Error(`Invalid OpenACR: ${validation.error.message}`);
  }
  return output;
}
/** Validate the upstream schema and catalog-specific coverage and component gates. */
export function validateOpenACR(input: unknown) {
  const validation = openACRSchema.safeParse(input);
  if (!validation.success) {
    throw Error(`Invalid OpenACR: ${validation.error.message}`);
  }
  const localValidation = reportDomainSchema.safeParse(input);
  if (!localValidation.success) {
    throw Error(`Invalid OpenACR: ${localValidation.error.message}`);
  }
  const output = localValidation.data;
  if (output.catalog !== "wcag-2.1-vpat-2.5rev") {
    throw Error("Wrong catalog");
  }
  const rows = Object.entries(output.chapters ?? {})
    .filter(([id]) => id !== "success_criteria_level_aaa")
    .flatMap(([chapter, c]) => (c.criteria ?? []).map((r) => ({ chapter, ...r })));
  if (rows.length !== 50 || new Set(rows.map((r) => r.num)).size !== 50) {
    throw Error("Incomplete or duplicate criterion coverage");
  }
  for (const r of rows) {
    const definition = catalog.chapters
      .find((c) => c.id === r.chapter)
      ?.criteria.find((c) => c.id === r.num);
    if (!definition) {
      throw Error(`Unknown catalog criterion ${r.num}`);
    }
    if (!r.components?.length) {
      throw Error(`Missing component ${r.num}`);
    }
    for (const c of r.components) {
      if (!definition.components.includes(c.name)) {
        throw Error(`Unknown catalog component ${c.name}`);
      }
      if (c.adherence && !terms.has(c.adherence.level)) {
        throw Error(`Invalid A/AA rating ${c.adherence.level}`);
      }
    }
  }
}
/** Link evidence to a local artifact or the public manifest entry. */
export function evidenceLink(reference: string, options: ReportOptions = {}) {
  return options.localEvidence ? `../${reference}` : `../evidence/README.md#${anchor(reference)}`;
}
/** Render report HTML and Markdown using the same status and reconciliation wording. */
export function render(
  data: Assessment,
  output: OpenACR,
  completeConformance = false,
  options: ReportOptions = {},
) {
  return renderReport(
    data,
    output,
    completeConformance,
    options,
    reportStatus(data, completeConformance),
  );
}

/** Render authored report content with accessible tables and evidence links. */
function renderReport(
  data: Assessment,
  output: OpenACR,
  completeConformance: boolean,
  options: ReportOptions,
  status: ReturnType<typeof reportStatus>,
) {
  const labels = Object.fromEntries(catalog.terms.map((term) => [term.id, term.label]));
  let body = `<h1>${escape(output.title)}</h1><p><strong>${status.status}</strong></p>`;
  let markdown = `# ${output.title}\n\n**${status.status}**\n\n`;
  if (status.banner) {
    body += `<p role="note"><strong>${escape(status.banner)}</strong></p>`;
    markdown += `**${status.banner}**\n\n`;
  }
  const fields = [
    ["Template alignment", "VPAT® 2.5Rev WCAG (April 2025); WCAG 2.1 A/AA only"],
    ["Product/version", `${data.product.name} — ${data.product.version}`],
    ["Date", output.report_date],
    ["Author", data.author.name || "Not designated; qualified review pending"],
    ["Author contact", data.author.email || "Pending designation"],
    ["Vendor contact", data.vendor.email || "Pending designation"],
    ["Notes", output.notes],
    ["Evaluation methods", output.evaluation_methods_used],
    ["Distribution license", data.distributionLicense || "Not approved; internal draft"],
  ];
  body += `<dl>${fields
    .map(([k, v]) => `<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`)
    .join("")}</dl>`;
  markdown += `${fields.map(([k, v]) => `**${k}:** ${md(v)}\n`).join("\n")}\n`;
  body += `<h2>Conformance terms</h2><dl>${catalog.terms
    .filter((t) => terms.has(t.id))
    .map((t) => `<dt>${escape(t.label)}</dt><dd>${escape(t.description)}</dd>`)
    .join("")}</dl>`;
  markdown += `## Conformance terms\n\n${catalog.terms
    .filter((t) => terms.has(t.id))
    .map((t) => `- **${t.label}:** ${t.description}\n`)
    .join("")}\n`;
  for (const level of ["A", "AA"]) {
    body += `<h2>WCAG 2.1 Level ${level}</h2><div class="table-scroll" tabindex="0" role="region" aria-label="Level ${level} conformance table"><table><caption>WCAG 2.1 Level ${level} assessment</caption><thead><tr><th scope="col">Criterion</th><th scope="col">Conformance</th><th scope="col">Remarks and evidence</th></tr></thead><tbody>`;
    markdown += `## WCAG 2.1 Level ${level}\n\n| Criterion | Conformance | Remarks and evidence |\n| --- | --- | --- |\n`;
    for (const row of data.criteria.filter((r) => r.level === level)) {
      const rating = row.rating
        ? labels[row.rating] + (completeConformance ? "" : " — provisional")
        : "Pending evidence — no rating";
      const links = row.evidence.map(
        (e) => `<a href="${escape(evidenceLink(e, options))}">${escape(e)}</a>`,
      );
      if (row.findings.length > 0) {
        links.push(`<a href="../findings.md">${escape(row.findings.join(", "))}</a>`);
      }
      body += `<tr><th scope="row">${escape(
        `${row.id} ${row.name}`,
      )}</th><td>${escape(rating)}</td><td>${escape(row.remarks)}${
        links.length > 0 ? `<ul>${links.map((l) => `<li>${l}</li>`).join("")}</ul>` : ""
      }</td></tr>`;
      markdown += `| ${md(`${row.id} ${row.name}`)} | ${rating} | ${md(
        row.remarks,
      )} ${row.evidence.map((e) => `[${e}](${evidenceLink(e, options)})`).join(" ")} ${
        row.findings.length > 0 ? "[Findings](../findings.md)" : ""
      } |\n`;
    }
    body += "</tbody></table></div>";
    markdown += "\n";
  }
  body += "<h2>Companion documents</h2><ul>";
  markdown += "## Companion documents\n\n";
  for (const file of [
    "scope.md",
    "findings.md",
    "roadmap.md",
    "questionnaire-draft.md",
    "manual-testing.md",
    "criteria-matrix.md",
  ]) {
    body += `<li><a href="../${file}">${file}</a></li>`;
    markdown += `- [${file}](../${file})\n`;
  }
  body +=
    "</ul><p>AAA is outside this report. WCAG 2.2 gaps are tracked separately. Formatting and schema validation do not establish product conformance.</p>";
  const html = read("templates/report.html")
    .replace("{{title}}", escape(output.title))
    .replace("{{body}}", body);
  return { html, markdown };
}
/** Generate all report artifacts from one shared status and reconciliation calculation. */
export function artifacts(
  data: Assessment,
  completeConformance = false,
  options: ReportOptions = {},
) {
  const status = reportStatus(data, completeConformance);
  const output = buildOpenACR(data, completeConformance, options, status);
  validateOpenACR(output);
  const { html, markdown } = renderReport(data, output, completeConformance, options, status);
  return {
    [reportNames.html]: html,
    [reportNames.markdown]: markdown,
    [reportNames.openACR]: YAML.stringify(output),
  };
}

/** Write generated artifacts to a report folder, applying the final filename prefix when needed. */
export function writeReportArtifacts(
  directory: string,
  files: ReturnType<typeof artifacts>,
  completeConformance = false,
) {
  fs.mkdirSync(directory, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const filename = completeConformance ? name.replace("conveyal-", "conveyal-final-") : name;
    fs.writeFileSync(path.join(directory, filename), content);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  try {
    const command = process.argv[2];
    const completeConformance = process.argv.includes("--final");
    const data = loadAssessment();
    const files = artifacts(data, completeConformance);
    if (command === "build") {
      writeReportArtifacts(path.join(root, "reports"), files, completeConformance);
    } else if (command === "check") {
      for (const [name, content] of Object.entries(files)) {
        if (read("reports/" + name) !== content)
          throw Error(`Stale generated report: ${name}; run pnpm run build`);
      }
    } else if (command !== "validate") {
      throw Error("Use validate, build, or check");
    }
    console.log(
      `${command}: valid ${completeConformance ? "final" : "draft"} format; ${
        data.criteria.filter((r) => !r.rating).length
      } unrated criteria. No product conformance certification.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
