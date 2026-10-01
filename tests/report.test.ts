/** Report domain, publication gate and rendered artifact regression tests. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  artifacts,
  exportOpenACR,
  loadAssessment,
  root,
  validateAssessment,
  validateOpenACR,
} from "../scripts/report.ts";
import type { Assessment } from "../scripts/report-types.ts";
/** Build an explicitly unreviewed fixture, independent of live assessment approval and contacts. */
function fresh() {
  const assessment = structuredClone(loadAssessment());
  assessment.author = { name: "", email: "" };
  assessment.vendor.email = "";
  assessment.authorQualifications = null;
  assessment.distributionLicense = null;
  assessment.publicationDate = null;
  assessment.qualifiedReviewApproved = false;
  assessment.vendorApproved = false;
  assessment.reportReview = { approved: false, kind: "interim" };
  if (assessment.latestAudit) assessment.latestAudit.reviewed = false;
  for (const row of assessment.criteria) row.approved = false;
  return assessment;
}
test("draft preserves all criteria and represents pending ratings without Not Evaluated", () => {
  const a = fresh();
  const output = exportOpenACR(a);
  validateOpenACR(output);
  const rows = Object.values(output.chapters).flatMap((c) => c.criteria ?? []);
  assert.equal(rows.length, 50);
  assert.equal(rows.filter((r) => !r.components[0].adherence).length, 41);
  assert.equal(output.chapters.success_criteria_level_aaa.disabled, true);
  assert.equal(output.author.email, "");
});
test("criterion coverage, chapter membership and duplicates fail", () => {
  for (const mutate of [
    (a: Assessment) => a.criteria.pop(),
    (a: Assessment) => (a.criteria[0].id = "9.9.9"),
    (a: Assessment) => (a.criteria[0].level = "AA"),
    (a: Assessment) => (a.criteria[1].id = a.criteria[0].id),
  ]) {
    const a = fresh();
    mutate(a);
    assert.throws(() => validateAssessment(a));
  }
});
test("invalid A/AA rating and missing explanatory remarks fail", () => {
  for (const mutate of [
    (a: Assessment) => (a.criteria[0].rating = "not-evaluated"),
    (a: Assessment) => (a.criteria[0].remarks = ""),
  ]) {
    const a = fresh();
    mutate(a);
    assert.throws(() => validateAssessment(a));
  }
});
test("missing, escaped evidence and unrelated findings fail", () => {
  for (const mutate of [
    (a: Assessment) => (a.criteria[0].evidence = ["evidence/nonexistent.json"]),
    (a: Assessment) => (a.criteria[0].evidence = ["../package.json"]),
    (a: Assessment) => (a.criteria[0].findings = ["A11Y-001"]),
  ]) {
    const a = fresh();
    mutate(a);
    assert.throws(() => validateAssessment(a));
  }
});
test("final publication is blocked by pending assessments and review/contact/license gates", () => {
  const a = fresh();
  assert.throws(() => exportOpenACR(a, true), /Unresolved/);
  for (const r of a.criteria) {
    r.rating = "supports";
    r.approved = true;
  }
  if (a.latestAudit) {
    assert.throws(() => exportOpenACR(a, true), /reconciliation/);
    a.latestAudit.reviewed = true;
  }
  assert.throws(() => exportOpenACR(a, true), /approval/);
  a.qualifiedReviewApproved = a.vendorApproved = true;
  assert.throws(() => exportOpenACR(a, true), /email/);
  a.author = {
    email: "reviewer@example.test",
    name: "Synthetic test evaluator",
  };
  a.vendor.email = "vendor@example.test";
  assert.throws(() => exportOpenACR(a, true), /qualifications/);
  a.authorQualifications = "Synthetic test qualifications, not a real evaluator";
  a.publicationDate = "2026-09-30";
  assert.throws(() => exportOpenACR(a, true), /license/);
  // Synthetic test fixture only, never written to reports.
  a.distributionLicense = "CC-BY-4.0";
  if (a.latestAudit) {
    a.latestAudit.reviewed = true;
  }
  assert.doesNotThrow(() => exportOpenACR(a, true));
  assert.equal(exportOpenACR(a, true).title, `${a.product.name} Accessibility Conformance Report`);
});
test("schema and catalog validation reject malformed exports", () => {
  const o = exportOpenACR(fresh());
  Reflect.deleteProperty(o, "author");
  assert.throws(() => validateOpenACR(o), /Invalid OpenACR/);
  const c = exportOpenACR(fresh());
  c.chapters.success_criteria_level_a.criteria![0].components[0].name = "bogus";
  assert.throws(() => validateOpenACR(c), /component/);
});
test("rendered artifacts preserve limitations, ratings, remarks and local links", () => {
  const a = fresh();
  const files = artifacts(a);
  assert.match(files["conveyal-acr.html"], /<html lang="en">/);
  assert.match(files["conveyal-acr.html"], /<main>/);
  assert.match(files["conveyal-acr.html"], /scope="row"/);
  assert.match(files["conveyal-acr.html"], /tabindex="0"/);
  assert.match(files["conveyal-acr.html"], /No human VoiceOver/);
  assert.match(files["conveyal-acr.md"], /Pending evidence — no rating/);
  for (const row of a.criteria) {
    assert.ok(files["conveyal-acr.html"].includes(row.id + " "));
  }
  for (const match of files["conveyal-acr.html"].matchAll(/href="([^"]+)"/g)) {
    assert.ok(fs.existsSync(path.resolve(root, "reports", match[1].split("#")[0])), match[1]);
  }
});
test("HTML escapes user-authored remarks", () => {
  const a = fresh();
  a.criteria[0].remarks = "<script>alert(1)</script>";
  assert.match(artifacts(a)["conveyal-acr.html"], /&lt;script&gt;/);
  assert.doesNotMatch(artifacts(a)["conveyal-acr.html"], /<script>/);
});

test("unknown assessment input rejects malformed required values before domain access", () => {
  const source = fresh();
  const invalidInputs: unknown[] = [
    null,
    { ...source, criteria: null },
    { ...source, author: { name: "", email: 123 } },
    { ...source, criteria: [{ ...source.criteria[0], evidence: null }] },
  ];
  for (const input of invalidInputs) {
    assert.throws(() => validateAssessment(input));
  }
});

test("unknown OpenACR inputs fail with the report validation prefix", () => {
  for (const input of [null, {}]) {
    assert.throws(() => validateOpenACR(input), /Invalid OpenACR/);
  }
});

/** Approved interim fixture preserves unknown criteria and deliberately withholds full-conformance approval. */
function reviewedInterim() {
  const assessment = fresh();
  assessment.product.name = "Conveyal Analysis";
  assessment.author = {
    name: "Synthetic reviewer",
    email: "reviewer@example.test",
    company_name: "EBP, Inc.",
  };
  assessment.vendor.company_name = "EBP, Inc.";
  assessment.distributionLicense = "CC0-1.0";
  assessment.reportReview = {
    approved: true,
    kind: "interim",
    reviewer: assessment.author.name,
    reviewedAt: "2026-10-01T09:41:25Z",
    findingsReconciled: true,
    scopeReviewed: true,
    publicDistributionApproved: true,
  };
  if (assessment.latestAudit) assessment.latestAudit.reviewed = true;
  for (const row of assessment.criteria) row.approved = row.rating !== null;
  return assessment;
}

test("reviewed interim exports nine approved conclusions, 41 unknowns and CC0 without vendor approval", () => {
  const assessment = reviewedInterim();
  const output = exportOpenACR(assessment);
  assert.equal(output.license, "CC0-1.0");
  assert.equal(output.product.name, "Conveyal Analysis");
  assert.equal(output.author.company_name, "EBP, Inc.");
  assert.equal(output.vendor.company_name, "EBP, Inc.");
  assert.equal(assessment.vendorApproved, false);
  assert.equal(assessment.qualifiedReviewApproved, false);
  assert.equal(assessment.publicationDate, null);
  assert.equal(assessment.criteria.filter((row) => row.approved).length, 9);
  assert.equal(assessment.criteria.filter((row) => !row.rating && !row.approved).length, 41);
  const rated = Object.values(output.chapters)
    .flatMap((chapter) => chapter.criteria ?? [])
    .flatMap((row) =>
      row.components.flatMap((component) => (component.adherence ? [component.adherence] : [])),
    );
  assert.equal(rated.filter((row) => row.level === "partially-supports").length, 8);
  assert.equal(rated.filter((row) => row.level === "supports").length, 1);
  assert.ok(rated.every((row) => row.notes.startsWith("Reviewed interim conclusion")));
  const files = artifacts(assessment);
  assert.equal((files["conveyal-acr.md"].match(/ — reviewed interim/g) ?? []).length, 9);
  assert.equal((files["conveyal-acr.md"].match(/Pending evidence — no rating/g) ?? []).length, 41);
  for (const file of Object.values(files)) {
    assert.doesNotMatch(
      file,
      /NEW EVIDENCE AWAITS RECONCILIATION|Provisional; qualified review pending/,
    );
    assert.match(file, /CC0-1.0/);
  }
  assert.match(files["conveyal-acr.md"], /Vendor:\*\* EBP, Inc\./);
  assert.match(files["conveyal-acr.md"], /Author organization:\*\* EBP, Inc\./);
  assert.match(files["conveyal-acr.md"], /Vendor approval:\*\* Not approved/);
  assert.match(files["conveyal-acr.md"], /Publication date:\*\* Unpublished/);
  assert.throws(() => exportOpenACR(assessment, true), /Unresolved/);
  for (const row of assessment.criteria) {
    row.rating = "supports";
    row.approved = true;
  }
  assessment.qualifiedReviewApproved = true;
  assert.throws(() => exportOpenACR(assessment, true), /vendor approval/);
});

test("unapproved conclusions or unreconciled evidence retain provisional labels despite report approval", () => {
  const assessment = reviewedInterim();
  assessment.criteria[0].approved = false;
  assert.match(artifacts(assessment)["conveyal-acr.md"], /Partially Supports — provisional/);
  assert.match(
    exportOpenACR(assessment).chapters.success_criteria_level_a.criteria![0].components[0]
      .adherence!.notes,
    /Provisional/,
  );
  assessment.latestAudit!.reviewed = false;
  const markdown = artifacts(assessment)["conveyal-acr.md"];
  assert.match(markdown, /NEW EVIDENCE AWAITS RECONCILIATION/);
  assert.doesNotMatch(markdown, / — reviewed interim/);
});

test("published interim metadata records the Release date without changing evaluation or approval", () => {
  const assessment = reviewedInterim();
  const before = artifacts(assessment);
  assert.match(before["conveyal-acr.md"], /Publication date:\*\* Unpublished/);
  assessment.publicationDate = "2026-10-01";
  const after = artifacts(assessment);
  assert.match(after["conveyal-acr.md"], /Publication date:\*\* 2026-10-01/);
  assert.match(after["conveyal-acr.html"], /2026-10-01/);
  assert.equal(assessment.vendorApproved, false);
  assert.equal(assessment.criteria.filter((row) => !row.rating).length, 41);
  assert.throws(() => exportOpenACR(assessment, true), /Unresolved/);
});
