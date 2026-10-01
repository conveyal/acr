/** Exercise static-site isolation, immutable links, review gates and failed-build preservation. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSite } from "../scripts/site.ts";
const revision = "a".repeat(40);
/** Create only the inputs required by the dependency-free builder. */
function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "acr-site-"));
  fs.mkdirSync(path.join(directory, "reports"));
  fs.mkdirSync(path.join(directory, "evidence"));
  fs.writeFileSync(
    path.join(directory, "assessment.json"),
    JSON.stringify({
      latestAudit: { reviewed: true },
      reportReview: {
        approved: true,
        findingsReconciled: true,
        scopeReviewed: true,
        publicDistributionApproved: true,
        reviewer: "Reviewer",
        reviewedAt: "2026-10-01T12:00:00Z",
      },
      distributionLicense: "CC0-1.0",
      vendorApproved: false,
      criteria: [{ rating: null }],
    }),
  );
  fs.writeFileSync(path.join(directory, "README.md"), "# Readme");
  fs.writeFileSync(path.join(directory, "evidence/README.md"), '<a id="artifact-test"></a>');
  fs.writeFileSync(path.join(directory, "evidence/private.json"), "secret");
  fs.writeFileSync(path.join(directory, "reports/style.css"), "body{}");
  fs.writeFileSync(path.join(directory, "reports/second.html"), "<h1>Second</h1>");
  fs.writeFileSync(
    path.join(directory, "reports/conveyal-acr.html"),
    '<a href="../README.md">Docs</a><a href="../evidence/README.md#artifact-test">Evidence</a><a href="second.html">Next</a><link href="style.css"><a href="https://example.com">External</a>',
  );
  return directory;
}

test("discovers HTML and documents, pins evidence links and copies only report assets", () => {
  const directory = fixture();
  try {
    const output = buildSite({ directory, revision, production: true });
    const home = fs.readFileSync(path.join(output, "index.html"), "utf8");
    assert.match(home, /reports\/second.html/);
    assert.match(home, /Latest published audit and evidence/);
    assert.match(home, /conveyal\/acr\/releases\/latest/);
    const report = fs.readFileSync(path.join(output, "reports/conveyal-acr.html"), "utf8");
    assert.ok(report.includes(`/blob/${revision}/README.md`));
    assert.ok(report.includes(`/blob/${revision}/evidence/README.md#artifact-test`));
    assert.match(report, /href="second.html"/);
    assert.match(report, /https:\/\/example.com/);
    assert.ok(fs.existsSync(path.join(output, "reports/style.css")));
    assert.deepEqual(fs.readdirSync(output).sort(), ["index.html", "reports"]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("missing links and evidence anchors reject replacement; production rejects unreviewed content", () => {
  const directory = fixture();
  try {
    const output = buildSite({ directory, revision });
    for (const link of [
      "missing.html",
      "../evidence/private.json",
      "../evidence/README.md#missing",
    ]) {
      fs.writeFileSync(path.join(directory, "reports/second.html"), `<a href="${link}">Broken</a>`);
      assert.throws(() => buildSite({ directory, revision }), /Missing|Unserved/);
      assert.equal(
        fs.readFileSync(path.join(output, "reports/second.html"), "utf8"),
        "<h1>Second</h1>",
      );
    }
    fs.writeFileSync(path.join(directory, "assessment.json"), "{}");
    assert.throws(() => buildSite({ directory, revision, production: true }), /approval/);
    assert.throws(() => buildSite({ directory, revision: "main" }), /commit SHA/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("native TypeScript builder runs without installed packages", () => {
  const directory = fixture();
  try {
    fs.mkdirSync(path.join(directory, "scripts"));
    fs.copyFileSync(
      new URL("../scripts/site.ts", import.meta.url),
      path.join(directory, "scripts/site.ts"),
    );
    execFileSync(process.execPath, ["scripts/site.ts", "--revision", revision, "--production"], {
      cwd: directory,
    });
    assert.ok(fs.existsSync(path.join(directory, "dist/site/index.html")));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
