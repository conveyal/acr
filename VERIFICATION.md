# Reporting package verification

Verified September 30, 2026 with Node 24.21.0:

- Eight Node tests passed: criterion coverage/levels, draft omissions, invalid ratings, broken evidence/finding links, final-review/contact/license gates, schema/catalog validation, rendering/link preservation and HTML escaping.
- Draft build, schema/catalog validation, and generated-output freshness checks passed.
- A copy outside the UI checkout installed its own dependencies with `npm ci --ignore-scripts --offline`, then passed tests, validation, build and freshness checks. It used no parent dependencies or configuration.
- `build:final` rejected the current assessment because it is unresolved, as intended.
- Generated HTML uses document language/title, a main landmark, heading hierarchy, captioned tables, row/column headers, named keyboard-focusable scroll regions, underlined links, and visible focus styles. Local evidence and companion-document link targets were checked.

Live visual/keyboard preview was not completed: browser security policy blocked navigation to the local-file report. No human screen-reader evaluation of the generated report has been performed. Complete the report inspection in the publication checklist before external release.

These checks validate the reporting package, not Conveyal UI's accessibility conformance. No public publication or client submission occurred.

## Playwright migration verification: October 1, 2026

Verified with Node 24.21.0, pnpm 12.6.0, Playwright 1.63.0, axe 4.13.0, and Chromium 153.0.8010.12. Installation with `pnpm install --frozen-lockfile --ignore-scripts` succeeded.

- All 30 copied fixture files match UI's original SHA-256 checksums. The standalone fixture manifest supplies runtime settings without importing UI code. All 36 original evidence state names are retained.
- The full local audit passed all 34 Playwright tests against `http://localhost:3000` and the backend at `http://localhost:7070/api`, with functioning workers. Run `acr-ebc598bf-5867-4ba3-89fe-ba7eac3925d4` completed regional results for 1,064 origins and collected both scenario reports, 36 full axe results, 11 state screenshots, and 15 keyboard observations with screenshots.
- Nine keyboard observations passed. Six recorded findings: missing zoom-control names, missing form-error association, 320px reflow, polygon keyboard selection/focus return, feature-property keyboard access, and chart text alternatives. These are engineering observations, not conformance ratings. The download menu passed after retrying assertions awaited its opening focus transition.
- All 21 Node tests passed, including configuration, preflight, saved-session/context isolation, owned-resource cleanup/recovery, lost creation/deletion responses, full axe serialization with more than ten nodes, token redaction, staged replacement, and reconciliation/publication gates.
- Authenticated-target handling was verified with controlled browser responses and synthetic saved cookies. No live remote authenticated target was tested because no saved session was supplied.
- Recovery and cleanup checks covered all ten completed/recovered development runs and 43 run-owned regions. No active fixture resources or datasource groups remain. Eight regional records remain soft-deleted as specified by the backend deletion workflow; backend storage/caches follow its retention behavior. Live recovery also recognized prior deletions after simulated loss of deletion acknowledgements.
- Draft validation, build, and generated-output freshness checks passed. Final generation rejected unresolved assessments as intended. Ratings, approvals, and historical assessment fields remain unchanged; new evidence is marked as awaiting reconciliation.
- All 538 checked local report, evidence, screenshot, companion-document, and archived-report links resolve. The completed histogram and modified report screenshots were inspected. No human assistive-technology evaluation was performed.
- UI's dedicated collector, script, configuration, and direct axe dependency are absent. Its ordinary Cypress suite and original fixtures remain; its Git status is clean. ACR's original repository description and license are preserved. Authentication files, diagnostics, and caches are ignored.

The [current evidence index](evidence/README.md) and [run provenance in the evidence manifest](evidence/manifest.json) contain the collection details. Earlier baselines were migrated into verified, unpublished local bundles under `.cache/audit/legacy/`. No product accessibility code, criterion ratings, Git commits, remote branches, or external publications were changed.

## Review and Release workflow verification: October 1, 2026

- All 36 unit and controlled-browser tests pass. Coverage includes isolated collection, UTC counters and discarded IDs, full bundle checksums, repeatable PR preparation, draft Release discovery, interrupted replacement uploads, review and merge gates, changed merged content, lost publication responses, and evidence retrieval into a clean checkout.
- Report validation, build, generated-report freshness, formatter checks, and Git whitespace checks pass with pnpm 12.6.0. All 30 copied fixture hashes match their original manifest; formatter-only changes to three fixtures were preserved locally before restoring checksum-matching originals. Fixtures and generated artifacts are excluded from formatting.
- Checked 152 repository links and 603 links across the three preserved bundles. All 78 active evidence artifact hashes match the compact manifest. Criterion conclusions and existing approval gates match the preserved baseline.
- Both historical snapshots were exported and verified file by file before removing `history/`. Compressed unpublished archives are under `.cache/audit/legacy/`; the active baseline is preserved as pending collection `2026-10-01.2`. Only the evidence index and manifest are eligible for Git tracking; raw evidence and local bundles are ignored.
- No product accessibility scans, commits, pushes, remote PR/Release creation, or publication were performed. GitHub operations were tested with controlled responses; live authenticated GitHub writes remain untested. The UI checkout is unchanged. Configure repository branch protection to enforce approval before merging report PRs; this implementation does not alter GitHub settings.

## Native TypeScript migration verification: October 1, 2026

- Node is pinned to exactly 24.21.0 in `package.json`; pnpm remains 12.6.0. TypeScript 7.0.2 and Node 24 types 24.19.0 are exact development dependencies. Frozen installation with scripts disabled succeeds.
- All reporting scripts, collector tooling, unit tests, collector specs, and Playwright configuration now use `.ts` files and explicit `.ts` imports. Node runs scripts and unit tests with native type stripping; no transpiler, runtime loader, or generated JavaScript is required.
- `pnpm run typecheck` passes under strict NodeNext checking with erasable syntax and no emit. Copied UI fixtures remain outside the TypeScript project and retain their original checksums.
- All 36 unit and controlled-browser tests pass. Playwright discovers all 34 collector tests without provisioning fixtures. Report validation, build, freshness, and formatting checks pass. No product scans, evidence replacement, commits, pushes, or publication were performed.
