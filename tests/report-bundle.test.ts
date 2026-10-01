/** Verify portable interim reports, licensing and compact-checkout links using synthetic evidence only. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  copyCompanions,
  evidenceIndex,
  evidenceManifest,
  extractBundle,
  pack,
  verifyBundle,
  writeJSON,
} from "../audit/bundles.ts";
import {
  artifacts,
  loadAssessment,
  root,
  validateAssessment,
  writeReportArtifacts,
} from "../scripts/report.ts";

/** Check relative HTML/Markdown file links and index anchors without following external URLs. */
function verifyLinks(directory: string) {
  const files = [
    ...fs.readdirSync(directory).filter((name) => name.endsWith(".md")),
    "evidence/README.md",
    "reports/conveyal-acr.html",
    "reports/conveyal-acr.md",
  ];
  for (const name of files) {
    const content = fs.readFileSync(path.join(directory, name), "utf8");
    const references = [...content.matchAll(/href="([^"]+)"|\]\(([^)]+)\)/g)];
    for (const reference of references) {
      const url = reference[1] ?? reference[2];
      if (/^[a-z]+:/.test(url)) continue;
      const [relative, fragment] = url.split("#");
      const target = path.resolve(directory, path.dirname(name), relative);
      assert.ok(fs.existsSync(target), `${name}: ${url}`);
      if (fragment?.startsWith("artifact-")) {
        assert.ok(fs.readFileSync(target, "utf8").includes(`id="${fragment}"`), url);
      }
    }
  }
}

test("refreshed bundles preserve CC0 license bytes, provenance and evidence links; compact reports need no raw files", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "acr-interim-bundle-"));
  const payload = path.join(temporary, "payload");
  const restored = path.join(temporary, "restored");
  const evidence = path.join(payload, "evidence");
  fs.mkdirSync(evidence, { recursive: true });
  fs.mkdirSync(restored);
  try {
    copyCompanions(root, payload);
    assert.deepEqual(
      fs.readFileSync(path.join(payload, "LICENSE")),
      fs.readFileSync(path.join(root, "LICENSE")),
    );
    assert.deepEqual(
      fs.readFileSync(path.join(payload, "PROVENANCE.md")),
      fs.readFileSync(path.join(root, "PROVENANCE.md")),
    );
    const assessment = loadAssessment();
    const currentManifest = JSON.parse(
      fs.readFileSync(path.join(root, "evidence/manifest.json"), "utf8"),
    );
    for (const name of Object.keys(currentManifest.files)) {
      const file = path.join(payload, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, "Synthetic artifact for bundle verification only");
    }
    const manifest = evidenceManifest(evidence, "2026-10-01.3", assessment.latestAudit);
    writeJSON(path.join(evidence, "manifest.json"), manifest);
    fs.writeFileSync(path.join(evidence, "README.md"), evidenceIndex(manifest, true));
    writeReportArtifacts(
      path.join(payload, "reports"),
      artifacts(assessment, false, { directory: payload, localEvidence: true }),
    );
    verifyLinks(payload);
    const bundle = path.join(temporary, "synthetic.tar.gz");
    const record = pack(payload, bundle);
    verifyBundle(bundle, record.files, record.sha256);
    extractBundle(bundle, restored);
    verifyLinks(restored);
    assert.deepEqual(
      fs.readFileSync(path.join(restored, "LICENSE")),
      fs.readFileSync(path.join(root, "LICENSE")),
    );
    for (const name of Object.keys(manifest.files)) fs.rmSync(path.join(payload, name));
    fs.writeFileSync(path.join(evidence, "README.md"), evidenceIndex(manifest));
    validateAssessment(assessment, false, { directory: payload });
    writeReportArtifacts(
      path.join(payload, "reports"),
      artifacts(assessment, false, { directory: payload }),
    );
    verifyLinks(payload);
    assert.throws(
      () => validateAssessment(assessment, false, { directory: payload, localEvidence: true }),
      /Invalid evidence reference/,
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("older companion names are normalized on copies and superseded files are removed without changing source content", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "acr-companion-rename-"));
  const source = path.join(temporary, "source");
  const destination = path.join(temporary, "destination");
  fs.mkdirSync(source);
  fs.mkdirSync(destination);
  try {
    for (const [oldName, newName] of [
      ["acr-draft.md", "assessment-worksheet.md"],
      ["questionnaire-draft.md", "questionnaire.md"],
    ]) {
      fs.writeFileSync(path.join(source, oldName), `Original ${oldName}`);
      fs.writeFileSync(path.join(destination, oldName), "Superseded content");
      copyCompanions(source, destination);
      assert.equal(fs.readFileSync(path.join(source, oldName), "utf8"), `Original ${oldName}`);
      assert.equal(fs.readFileSync(path.join(destination, newName), "utf8"), `Original ${oldName}`);
      assert.equal(fs.existsSync(path.join(destination, oldName)), false);
      fs.writeFileSync(path.join(source, newName), "Current reviewed content");
      copyCompanions(source, destination);
      assert.equal(
        fs.readFileSync(path.join(destination, newName), "utf8"),
        "Current reviewed content",
      );
    }
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
