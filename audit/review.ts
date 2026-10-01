/** Prepare report reviews and publish approved bundles; collection never invokes these remote writes. */
import { command, githubClient, type GitHubClient } from "./github.ts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { assessmentSchema } from "../scripts/report-schemas.ts";
import { finalizedCollectionSchema, evidenceManifestSchema } from "./bundle-schemas.ts";
import { artifacts, reportNames, writeReportArtifacts } from "../scripts/report.ts";
import { root } from "./config.ts";
import {
  collectionPattern,
  companions,
  copyCompanions,
  evidenceIndex,
  extractBundle,
  indexCompanionLinks,
  inventory,
  pack,
  readJSON,
  readValidatedJSON,
  verifyBundle,
  writeJSON,
} from "./bundles.ts";

import type { Assessment } from "../scripts/report-types.ts";
import type { CommandRunner, PullRequest, Release, ReviewContext } from "./github-types.ts";
/** Report-only paths preparation may stage; unrelated checkout changes are rejected. */
export const reviewPaths = [
  "assessment.json",
  "changes.md",
  ...companions,
  // Allow preparation to stage removal of renamed companions from existing review branches.
  "acr-draft.md",
  "questionnaire-draft.md",
  "evidence/manifest.json",
  "evidence/README.md",
  ...Object.values(reportNames).map((name) => `reports/${name}`),
];
export { command } from "./github.ts";
/** Coordinate review and publication, persisting progress before recoverable remote writes. */
export class ReviewWorkflow {
  directory: string;
  run: CommandRunner;
  private remote?: GitHubClient;
  /** Inject local commands and remote transport separately; authentication is resolved lazily. */
  constructor(directory = root, run = command, remote?: GitHubClient) {
    this.remote = remote;
    this.directory = directory;
    this.run = run;
  }
  private get github(): GitHubClient {
    return (this.remote ??= githubClient(this.directory, this.run));
  }
  private call(tool: string, args: string[], input?: string) {
    return this.run(tool, args, this.directory, input);
  }
  private git(...args: string[]) {
    return this.call("git", args);
  }
  private gh(...args: string[]) {
    return this.call("gh", args);
  }
  /** Validate archive ownership and checksums before loading this dated review. */
  private context(id: string): ReviewContext {
    if (!collectionPattern.test(id)) {
      throw Error("Supply a dated collection such as 2026-10-01.1");
    }
    const directory = path.join(this.directory, ".cache/audit/collections", id);
    const record = readValidatedJSON(
      path.join(directory, "collection.json"),
      finalizedCollectionSchema,
    );
    if (record.id !== id || !["pending", "published"].includes(record.status)) {
      throw Error("Collection is not complete");
    }
    const bundle = path.join(directory, record.bundle);
    if (path.dirname(bundle) !== directory) {
      throw Error("Invalid bundle path");
    }
    verifyBundle(bundle, record.files, record.sha256);
    const repo = JSON.parse(this.gh("repo", "view", "--json", "nameWithOwner")).nameWithOwner;
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || (record.repo && record.repo !== repo)) {
      throw Error("Collection repository mismatch");
    }
    return { branch: `audit/${id}`, bundle, directory, id, record, repo, tag: `audit-${id}` };
  }
  /** Atomically persist progress so interrupted preparation or publication can resume. */
  private save(ctx: ReviewContext) {
    writeJSON(path.join(ctx.directory, "collection.json"), ctx.record);
  }
  /** Keep extracted evidence alive through asynchronous work and always remove the temporary copy. */
  private async temporary<T>(
    ctx: ReviewContext,
    action: (directory: string) => T | Promise<T>,
  ): Promise<T> {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "acr-review-"));
    try {
      extractBundle(ctx.bundle, directory);
      return await action(directory);
    } finally {
      fs.rmSync(directory, { force: true, recursive: true });
    }
  }
  private dirty() {
    return this.git("status", "--porcelain", "--untracked-files=all");
  }
  /** Reject edits outside the maintained reports and their companion inputs. */
  private assertReviewOnlyChanges() {
    const changed = this.git("diff", "--name-only", "HEAD").split("\n").filter(Boolean);
    const untracked = this.git("ls-files", "--others", "--exclude-standard")
      .split("\n")
      .filter(Boolean);
    if ([...changed, ...untracked].some((name) => !reviewPaths.includes(name))) {
      throw Error("Unrelated working-tree changes must be handled before preparation");
    }
  }
  /** Verify that the selected evidence belongs to this collection and Release identifier. */
  private manifest(ctx: ReviewContext, directory: string) {
    const manifest = readValidatedJSON(
      path.join(directory, "evidence/manifest.json"),
      evidenceManifestSchema,
    );
    if (manifest.collection !== ctx.id || manifest.release !== ctx.tag) {
      throw Error("Evidence belongs to another collection");
    }
    return manifest;
  }
  /** Rebuild reports around immutable evidence, preserving the previous bundle when content is unchanged. */
  private async refreshBundle(ctx: ReviewContext) {
    return this.temporary(ctx, (payload) => {
      const originalManifest = this.manifest(ctx, payload);
      const currentManifest = this.manifest(ctx, this.directory);
      if (JSON.stringify(originalManifest) !== JSON.stringify(currentManifest)) {
        throw Error("Collected evidence manifest cannot change during report review");
      }
      const assessment = assessmentSchema.parse(
        readJSON(path.join(this.directory, "assessment.json")),
      );
      if (assessment.latestAudit?.runId !== currentManifest.provenance.runId) {
        throw Error("Assessment references another audit");
      }
      copyCompanions(this.directory, payload);
      for (const name of ["assessment.json", "changes.md"]) {
        fs.copyFileSync(path.join(this.directory, name), path.join(payload, name));
      }
      fs.writeFileSync(
        path.join(payload, "evidence/README.md"),
        evidenceIndex(currentManifest, true),
      );
      writeReportArtifacts(
        path.join(payload, "reports"),
        artifacts(assessment, false, { directory: payload, localEvidence: true }),
      );
      const files = inventory(payload);
      const unchanged =
        Object.keys(files).length === Object.keys(ctx.record.files).length &&
        Object.entries(files).every(([name, hash]) => ctx.record.files[name] === hash);
      if (!unchanged) {
        Object.assign(ctx.record, pack(payload, ctx.bundle));
      }
      this.save(ctx); // Persist before uploading: interrupted uploads remain recoverable.
    });
  }
  /** Verify the new asset by downloading it before deleting any superseded draft asset. */
  private async uploadVerified(ctx: ReviewContext, release: Release) {
    if (!release.draft) {
      throw Error("Refusing to replace assets on a published Release");
    }
    // Content-addressed names avoid deleting the previous asset before an upload succeeds.
    const assetName = `audit-${ctx.id}-${ctx.record.sha256}.tar.gz`;
    const upload = path.join(ctx.directory, assetName);
    fs.copyFileSync(ctx.bundle, upload);
    try {
      const current = await this.github.getRelease(ctx.repo, release.id);
      if (!current.draft) {
        throw Error("Release was published during preparation");
      }
      if (!current.assets.some((asset) => asset.name === assetName)) {
        await this.github.uploadAsset(ctx.repo, release, upload);
      }
      const downloaded = fs.mkdtempSync(path.join(os.tmpdir(), "acr-download-"));
      try {
        await this.github.downloadAsset(ctx.repo, release, assetName, downloaded);
        verifyBundle(path.join(downloaded, assetName), ctx.record.files, ctx.record.sha256);
      } finally {
        fs.rmSync(downloaded, { force: true, recursive: true });
      }
      ctx.record.asset = assetName;
      this.save(ctx);
      // Remove superseded bundles only after verifying the replacement.
      for (const asset of current.assets.filter(
        (asset) =>
          asset.name.startsWith(`audit-${ctx.id}-`) &&
          asset.name.endsWith(".tar.gz") &&
          asset.name !== assetName,
      )) {
        await this.github.deleteAsset(ctx.repo, asset.id);
      }
    } finally {
      fs.rmSync(upload, { force: true });
    }
  }
  /** Apply and push this draft, refresh its unpublished evidence asset, and create or update the same PR. */
  async prepare(id: string) {
    const ctx = this.context(id);
    if (ctx.record.status === "published") {
      throw Error("Collection already published");
    }
    let release = await this.github.findRelease(ctx.repo, ctx.tag);
    if (release && !release.draft) {
      throw Error("Dated Release already published");
    }
    const prs = await this.github.listPullRequests(
      ctx.repo,
      `${ctx.repo.split("/")[0]}:${ctx.branch}`,
    );
    if (prs.some((pr) => pr.state === "closed")) {
      throw Error("Review PR is closed; release it or start a new collection");
    }
    await this.selectReviewBranch(ctx, prs, release);
    await this.applyDraftReports(ctx);
    const sha = this.commitReview(ctx, id);
    if (!release) {
      release = await this.github.createRelease(ctx.repo, {
        tag_name: ctx.tag,
        target_commitish: sha,
        name: `Accessibility audit ${id} — awaiting review`,
        draft: true,
        body: "Unpublished audit evidence. Review and approval are required before publication.",
      });
    }
    await this.uploadVerified(ctx, release);
    const body =
      `Review the current assessment, findings, scope, and distribution suitability.\n\n` +
      `Collection: ${id}\nEvidence: ${release.html_url}\n` +
      `Bundle SHA-256: ${ctx.record.sha256}\n\n${fs.readFileSync(
        path.join(this.directory, "changes.md"),
        "utf8",
      )}`;
    const pr = prs[0]
      ? await this.github.updatePullRequest(ctx.repo, prs[0].number, body)
      : await this.github.createPullRequest(ctx.repo, {
          base: "main",
          body,
          head: ctx.branch,
          title: `Review accessibility audit ${id}`,
        });
    ctx.record.pr = pr.number;
    this.save(ctx);
    return pr.html_url;
  }
  /** Publish only the approved merged report tree and its verified evidence; interrupted writes remain recoverable. */
  async release(id: string) {
    const ctx = this.context(id);
    if (!ctx.record.pr || !ctx.record.preparedCommit) {
      throw Error("Collection has not been prepared for review");
    }
    const pr = await this.github.readPullRequest(ctx.repo, ctx.record.pr);
    if (
      pr.state !== "MERGED" ||
      pr.isDraft ||
      pr.baseRefName !== "main" ||
      pr.headRefName !== ctx.branch ||
      pr.headRefOid !== ctx.record.preparedCommit ||
      !pr.mergeCommit?.oid
    ) {
      throw Error("The prepared review PR must be merged into main without unprepared changes");
    }
    const sha = pr.mergeCommit.oid;
    this.git("fetch", "origin", "main");
    this.git("merge-base", "--is-ancestor", sha, "origin/main");
    // Compare every reviewed source and generated report with the merged tree, not the current checkout.
    const assessment = this.reviewedAssessment(
      JSON.parse(this.git("show", `${sha}:assessment.json`)),
    );
    const review = assessment.reportReview;
    if (
      assessment.latestAudit?.reviewed !== true ||
      review?.approved !== true ||
      review.findingsReconciled !== true ||
      review.scopeReviewed !== true ||
      review.publicDistributionApproved !== true ||
      !review.reviewer?.trim() ||
      !Number.isFinite(Date.parse(review.reviewedAt ?? "")) ||
      review.kind !== "interim" ||
      !assessment.distributionLicense?.trim()
    ) {
      throw Error("Reviewed interim metadata and approved distribution license are required");
    }
    await this.temporary(ctx, (payload) => {
      for (const name of reviewPaths.filter(
        (name) =>
          ![
            "evidence/README.md",
            ...Object.values(reportNames).map((name) => `reports/${name}`),
          ].includes(name),
      )) {
        if (!fs.existsSync(path.join(payload, name))) {
          continue;
        }
        if (
          this.git("show", `${sha}:${name}`) !==
          fs.readFileSync(path.join(payload, name), "utf8").trim()
        ) {
          throw Error(`Merged report differs from prepared bundle: ${name}`);
        }
      }
      for (const [name, content] of Object.entries(
        artifacts(assessment, false, { directory: payload }),
      )) {
        if (this.git("show", `${sha}:reports/${name}`) !== content.trim())
          throw Error(`Merged generated report is stale: ${name}`);
      }
    });
    let release = await this.github.findRelease(ctx.repo, ctx.tag);
    if (!release) {
      throw Error("Prepared draft Release is missing");
    }
    if (!release.draft) {
      if (
        release.target_commitish !== sha ||
        this.git("ls-remote", "--tags", "origin", `refs/tags/${ctx.tag}`).split(/\s/)[0] !== sha
      ) {
        throw Error("Published Release does not match the approved merged commit");
      }
      const assetName = `audit-${ctx.id}-${ctx.record.sha256}.tar.gz`;
      if (!release.assets.some((asset) => asset.name === assetName)) {
        throw Error("Published evidence asset differs from approved bundle");
      }
      const downloaded = fs.mkdtempSync(path.join(os.tmpdir(), "acr-published-"));
      try {
        await this.github.downloadAsset(ctx.repo, release, assetName, downloaded);
        verifyBundle(path.join(downloaded, assetName), ctx.record.files, ctx.record.sha256);
      } finally {
        fs.rmSync(downloaded, { force: true, recursive: true });
      }
      ctx.record.status = "published";
      ctx.record.publishedCommit = sha;
      ctx.record.releaseURL = release.html_url;
      this.save(ctx);
      return release.html_url;
    }
    await this.uploadVerified(ctx, release);
    const remote = this.git("ls-remote", "--tags", "origin", `refs/tags/${ctx.tag}`).split(/\s/)[0];
    if (remote && remote !== sha) {
      throw Error("Release tag points to another commit");
    }
    if (!remote) {
      const local = this.git("tag", "--list", ctx.tag);
      if (local && this.git("rev-parse", ctx.tag) !== sha) {
        throw Error("Local Release tag points to another commit");
      }
      if (!local) {
        this.git("tag", ctx.tag, sha);
      }
      this.git("push", "origin", `refs/tags/${ctx.tag}`);
    }
    const notes = this.git("show", `${sha}:changes.md`);
    release = await this.github.updateRelease(ctx.repo, release.id, {
      body: `Reviewed interim assessment; incomplete conformance evaluation.\n\n${notes}\n\nBundle SHA-256: ${ctx.record.sha256}`,
      draft: false,
      name: `Accessibility assessment ${id} — reviewed interim`,
      target_commitish: sha,
    });
    ctx.record.status = "published";
    ctx.record.publishedCommit = sha;
    ctx.record.releaseURL = release.html_url;
    this.save(ctx);
    return release.html_url;
  }

  /** Validate merged assessment input before approval gates consume it. */
  private reviewedAssessment(input: unknown): Assessment {
    const result = assessmentSchema.safeParse(input);
    if (!result.success) throw new Error("Reviewed interim metadata is invalid");
    return result.data;
  }
  /** Resume this collection's branch or create it from clean, current main. */
  private async selectReviewBranch(
    ctx: ReviewContext,
    prs: PullRequest[],
    release: Release | null,
  ) {
    const branch = this.git("branch", "--show-current");
    if (branch !== ctx.branch) {
      if (branch !== "main" || this.dirty()) {
        throw Error("Start preparation on clean main or this collection's review branch");
      }
      this.git("fetch", "origin", "main");
      if (this.git("rev-parse", "HEAD") !== this.git("rev-parse", "origin/main")) {
        throw Error("Update local main before preparation");
      }
      const existing = this.git("branch", "--list", ctx.branch);
      if (existing || prs.length > 0 || release) {
        throw Error("Resume preparation on the existing review branch");
      }
      this.git("switch", "-c", ctx.branch);
      await this.temporary(ctx, (payload) => {
        copyCompanions(payload, this.directory);
        for (const name of ["assessment.json", "changes.md", "evidence/manifest.json"]) {
          fs.copyFileSync(path.join(payload, name), path.join(this.directory, name));
        }
      });
    }
  }
  /** Apply the indexed review draft and rebuild its downloadable report bundle. */
  private async applyDraftReports(ctx: ReviewContext) {
    this.assertReviewOnlyChanges();
    const manifest = this.manifest(ctx, this.directory);
    indexCompanionLinks(this.directory, manifest);
    fs.writeFileSync(path.join(this.directory, "evidence/README.md"), evidenceIndex(manifest));
    const assessment = assessmentSchema.parse(
      readJSON(path.join(this.directory, "assessment.json")),
    );
    writeReportArtifacts(
      path.join(this.directory, "reports"),
      artifacts(assessment, false, { directory: this.directory }),
    );
    await this.refreshBundle(ctx);
  }
  /** Stage only reviewed report paths and persist the pushed revision before remote uploads. */
  private commitReview(ctx: ReviewContext, id: string) {
    const changed = this.git("diff", "--name-only", "HEAD").split("\n");
    this.git(
      "add",
      "--",
      ...reviewPaths.filter(
        (name) => fs.existsSync(path.join(this.directory, name)) || changed.includes(name),
      ),
    );
    if (this.git("diff", "--cached", "--name-only")) {
      this.git("commit", "-m", `Review accessibility audit ${id}`);
    }
    const sha = this.git("rev-parse", "HEAD");
    this.git("push", "--set-upstream", "origin", ctx.branch);
    Object.assign(ctx.record, { preparedCommit: sha, repo: ctx.repo });
    this.save(ctx);
    return sha;
  }
}
