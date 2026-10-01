# acr

Accessibility Conformance Reports for Conveyal Analysis, a product of EBP, Inc.

## First reviewed interim assessment

Collection `2026-10-01.3` evaluates Conveyal Analysis at **http://localhost:3000**, in local mode without authentication, on October 1, 2026. Trevor Gerhardt reviewed the findings, scope, public distribution, and nine rated conclusions. Forty-one criteria remain unknown. Vendor approval is withheld and qualified-evaluator credentials are not asserted. The assessment is approved for distribution under CC0-1.0 but has not been published; it is not a completed conformance evaluation or submission-ready ACR.

## Results and documents

- [Scope and coverage](scope.md): evaluated configuration, sample, and exclusions.
- [Findings](findings.md): confirmed failures, reproduction, proposed remediation, and retest criteria.
- [Criteria matrix](criteria-matrix.md): all 50 WCAG 2.1 A/AA criteria and the six additional WCAG 2.2 A/AA criteria.
- [Testing matrix and manual evidence](manual-testing.md): performed checks and remaining human tests.
- [Interim assessment worksheet](assessment-worksheet.md): reviewed conclusions aligned with VPAT® 2.5Rev WCAG.
- [Draft questionnaire responses](questionnaire.md): all 15 questions, with organizational facts awaiting confirmation.
- [Draft roadmap](roadmap.md): required fields, evidence, and proposed remediation.
- [Raw evidence index](evidence/README.md): axe results and screenshots.

## Run accessibility collection from ACR

Use Node **24.21.0** and pnpm 12.6.0. Keep the UI, backend, storage/task processing, and R5 worker running. Run from this repository:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm audit:a11y --config audit/target.local.json
```

The checked-in local target explicitly permits creating a fresh disposable dataset at `http://localhost:3000`, with the backend at `http://localhost:7070/api`. Preflight requires the dummy local user. The runner uses the 30 checksum-verified assets in `fixtures/` and standalone runtime settings in `audit/fixture-manifest.json`, creates uniquely named resources, computes regional results, and removes only resources belonging to that run. It does not start services or download fixture data.

One Chromium worker runs with isolated test contexts and no automatic retries. Default processing limits are 240 seconds for uploads, 300 seconds for interactive results, and 600 seconds for regional results. A missing worker, unfinished processing, expired session, or cleanup failure fails the command. Accessibility violations and failed keyboard observations are collected as findings and do not fail it. Passing collection does not establish conformance.

All 36 original scan states are retained, with additional keyboard checks for tabs, dialog/menu focus, form errors, narrow layout, map controls, bounds alternatives, polygon selection, feature properties, analysis sliders, and histogram controls. Full axe results retain nodes, check diagnostics, passing rules, incomplete results, and inapplicable rules. Human screen-reader evaluation remains necessary.

### Other targets and saved sessions

Create an ignored `.audit-targets/target.json`. For example:

```json
{
  "baseURL": "https://disposable-ui.example.test",
  "backendURL": "https://disposable-backend.example.test/api",
  "disposable": true,
  "storageState": "../.auth/session.json",
  "workerVersion": "v7.6",
  "timeouts": { "upload": 240000, "interactive": 300000, "regional": 600000 },
  "trace": false
}
```

Supply a Playwright storage-state file from an existing authenticated session; the runner does not log in. Paths resolve relative to the target configuration. The account must permit fixture uploads, computation, and deletion. Provisioning requires `disposable: true`; use only an environment designated for test data. Application-specific API paths match the Conveyal Analysis backend, so this is not a generic website scanner.

```sh
pnpm audit:a11y --config .audit-targets/target.json
```

Authentication files stay outside evidence. Tracing is opt-in; traces include network details and stay in ignored diagnostics. Review rendered text, DOM excerpts, URLs, and screenshots before external distribution, especially for authenticated targets.

### Interrupted runs and evidence replacement

Each run prints an ignored `.cache/audit/collections/YYYY-MM-DD.N/recovery.json` manifest. Identifiers use the UTC collection date and a counter starting at 1; failed attempts also reserve their identifier. Created IDs are recorded immediately; region creation intent is recorded before sending the request, and asynchronous work is reconciled within exact run-owned regions. A lost creation response keeps the manifest pending until explicit recovery confirms the outcome. Cleanup runs on success and failure using existing application deletion workflows. Backend caches and retained storage objects follow backend retention behavior; the collector does not delete backend filesystem files directly. After interruption or a cleanup error, use the same target and a valid saved session:

```sh
pnpm audit:cleanup --config audit/target.local.json --cleanup .cache/audit/collections/YYYY-MM-DD.N/recovery.json
```

Only complete collection with successful cleanup creates a compressed pending bundle and refreshed drafts under ignored `.cache/audit/collections/YYYY-MM-DD.N/`. Collection leaves repository assessments, reports, and evidence unchanged. Partial runs retain recovery manifests and leave the current assessment intact. Successful runs remove redundant staged evidence; authentication and diagnostics never enter bundles.

Draft refresh preserves existing ratings and approvals and displays **NEW EVIDENCE AWAITS RECONCILIATION**. Prior conclusions require reconciliation before the new evidence can support a reviewed assessment. Monthly collection does not require monthly publication.

### Review a collection in a PR

After the reporting tooling is installed in Git, start from clean, up-to-date `main`. GitHub CLI (`gh`) must be authenticated with repository write access. This **explicit remote-writing command** creates `audit/YYYY-MM-DD.N`, applies the draft, commits and pushes report changes, uploads an unpublished draft Release, and opens a PR:

```sh
pnpm audit:prepare 2026-10-01.3
```

Resume on that audit branch. Edit `assessment.json`, maintained findings, and `changes.md`; use stable finding IDs to describe reviewed new, resolved, and reopened findings and scope changes. Scan counts are supporting observations, not automatic finding resolutions. Run the command again to regenerate reports, commit changes, update the PR, and refresh the same draft Release. Only report inputs and outputs are staged; unrelated edits are rejected. Published collections cannot be prepared again.

Reviewers need repository write access to download draft Release assets. Bundle names contain their SHA-256 checksum. Replacement uploads are downloaded and verified before superseded draft assets are removed; failed uploads preserve local pending evidence.

Approve a reviewed interim assessment by setting `latestAudit.reviewed` and these `reportReview` fields in `assessment.json`:

```json
{
  "approved": true,
  "reviewer": "Actual reviewer name",
  "reviewedAt": "2026-10-01T10:00:00Z",
  "findingsReconciled": true,
  "scopeReviewed": true,
  "publicDistributionApproved": true,
  "kind": "interim"
}
```

Also approve and record `distributionLicense`. Unknown criteria may remain explicitly unknown. This approval does not satisfy the final ACR gates. Review content suitability before putting any sensitive material into a public PR, and separately review the raw bundle before publication. Configure GitHub branch protection to require PR approval and prohibit direct report changes on `main`; CLI checks cannot enforce repository settings.

### Publish after approval and merge

Refresh preparation after the final review edits, obtain PR approval, and merge. Then run the **explicit publication command**:

```sh
pnpm audit:release 2026-10-01.3
```

It checks the merged PR, approval, review metadata, matching prepared commit and report contents, generated-report freshness, and downloaded bundle checksums. It tags the merged commit as `audit-2026-10-01.3` and publishes the finalized draft Release with reviewed change notes. The Release is labeled **reviewed interim assessment — incomplete conformance evaluation**. Failure preserves local evidence and permits retry. No merge or publication happens automatically.

`main` keeps current reviewed reports, findings, change notes, and a compact [evidence manifest](evidence/manifest.json) and index. Git records text changes. Raw JSON and screenshots are ignored and distributed with reports in Release bundles; downloaded reports have direct local evidence links. Repository reports link through the tracked evidence index to the dated Release.

Restore checksum-verified raw evidence for the current checkout from a local pending bundle or its GitHub Release:

```sh
pnpm audit:evidence 2026-10-01.3
```

Published Release assets are retained indefinitely. Keep compressed pending collections until publication or explicit discard. After a successful publication verifies the uploaded bundle, local copies may be removed manually.

## Next gates

Complete human assistive-technology testing and the remaining criteria checks.
Resolve the local failures and validate fixes against isolated fixtures.
Audit authentication and role-dependent behavior as a separate follow-up, then reconcile results with the proposed release.
Confirm externally hosted documentation and training, additional report/export types, and other delivered surfaces.
Assign a qualified evaluator and vendor contact. Approve questionnaire answers, owners, and target dates before submission.
No remediation dates or organizational policies are implied by this assessment.

## Portable OpenACR reporting package

All OpenACR code, dependency manifests, schemas, catalogs, templates and reports live at the root of this ACR repository. Preserve the directory structure when transferring the package to keep evidence and relative links intact. Report generation does not need the UI checkout, a backend, network access after installation, or the running local server. The Playwright collector and its fixture assets now live in this repository; UI retains its general Cypress E2E suite.

Use Node **24.21.0** and pnpm 12.6.0 (pinned in `package.json`). Run **from the ACR repository root**:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm lint
pnpm fmt:check
pnpm run typecheck
pnpm test
pnpm run validate
pnpm run build
pnpm run check
```

Zod validates maintained inputs and imports the unchanged pinned OpenACR JSON Schemas; compatibility tests cover the importer against the former Ajv behavior. Octokit handles GitHub API calls and Release assets without automatic write retries. Authentication uses `GH_TOKEN`, then `GITHUB_TOKEN`, then an in-memory `gh auth token` result. The GitHub CLI remains required for repository discovery, and local Git commands still require working Git credentials.

Scripts, tests, and Playwright configuration use TypeScript with explicit `.ts` imports. Node 24.21.0 runs the scripts and Node tests directly using built-in type stripping; no transpiler or emitted JavaScript is needed. `pnpm run typecheck` uses TypeScript 7 (`tsc --noEmit`) with strict checks and erasable syntax. The three maintained TypeScript fixture references retain their original UI imports and remain excluded from runtime and type checking. They include ACR documentation and formatting; `audit/fixture-manifest.json` records the original copied hashes in `sourceFiles` and maintained hashes in `files`. The other fixture assets remain unchanged. Native type stripping does not perform type checking, so run the separate check before review.

`assessment.json` is the maintained reporting source. Pending assessments have a null rating; approved conclusions require an explicit reviewer flag. Findings and the tracked evidence manifest remain companion inputs; raw evidence is restored only when needed. WCAG 2.2 additions stay outside the WCAG 2.1 export. The companion worksheet and criteria matrix document this collection and remaining coverage. Update `assessment.json` and maintained companions for subsequent reporting rather than editing generated files.

Generated files:

- [OpenACR YAML](reports/conveyal-openacr.yaml), validated against the pinned OpenACR schema and maintained WCAG catalog.
- [HTML assessment](reports/conveyal-acr.html), self-contained styling and links through the evidence index.
- [Markdown assessment](reports/conveyal-acr.md), generated from the same assessment.

The reviewed interim assessment contains 41 unrated criteria, eight reviewed Partially Supports conclusions, and the reviewed template-directed Supports for Parsing. Unrated criteria omit `adherence`; their unknowns are preserved in chapter notes and rendered tables. Author/reviewer contact is recorded; vendor contact and approval remain unset. Interim review does not satisfy completed-conformance gates. Future refreshed bundles include the unchanged repository `LICENSE` and `PROVENANCE.md`; third-party rights remain separate.

`pnpm run build:final` requires all 50 reviewed ratings, qualified review and vendor approval, real contact information, a publication date and an approved distribution license. It writes separate `conveyal-final-*` files alongside the drafts. This command currently fails by design. It does not create a completed official VPAT document, publish, deploy, or send anything.

Read [asset provenance and template alignment](PROVENANCE.md) and the [publication checklist](PUBLISHING.md) before moving or releasing this directory. Review and redistribution approval apply to this collection; subsequent collections require their own review.
