# Publication and submission checklist

Formatting checks are separate from evaluation and release approval. The checklist below governs completed conformance and formal submission; interim publication follows the separate section below.

- Complete outstanding evaluation, including authentication, the required human assistive-technology matrix, complete workflows, outputs, and delivered documentation/training. Reconcile results with the actual proposed product release.
- Designate qualified personnel and a real author/vendor contact. Review every rating and remark, then update `assessment.json`: per-criterion `approved`, qualified-review/vendor approval, publication date, report notes, product/version, methods, contacts and distribution license. Remove draft-specific language only after it is accurate to do so.
- Retest fixes and update linked findings/evidence. Approve roadmap owners/dates and confirm questionnaire organizational facts separately.
- Review all files for client or fixture names, uploaded content, user identifiers, DOM excerpts, URLs/query strings, tokens, and screenshot content. Local-mode collection is not a guarantee that evidence is suitable for public distribution. Redact or replace artifacts and update references before release; do not publish unresolved review artifacts.
- Confirm report text, evidence and screenshots can be redistributed and approve the distribution license. Preserve upstream provenance and dependency license notices when distributing tooling.
- Run `pnpm run typecheck`, `pnpm test`, `pnpm run validate`, `pnpm run build`, `pnpm run check`; inspect HTML with keyboard and assistive technology. Run `pnpm run build:final` only after final review gates are satisfied.
- Transfer reviewed metadata and conformance conclusions into the current official VPAT WCAG template, then verify the completed document's accessibility. Submit it with the approved questionnaire and roadmap. OpenACR YAML/HTML are additional representations.
- Preview the new repository with all evidence links intact. Collection performs no GitHub writes. `audit:prepare` explicitly commits, pushes, opens a PR, and uploads an unpublished draft Release. `audit:release` explicitly tags and publishes after recorded assessment approval and merge; external submission remains separate.

Repository reports use a compact evidence index; downloadable Release bundles retain relative local evidence links for portability. GitHub issue URLs intentionally continue to point to the Conveyal Analysis issue tracker (`conveyal/ui`). Code source paths in findings identify the audited UI checkout; they are provenance, not build dependencies.

- After each Playwright evidence replacement, reconcile the latest run with criterion conclusions and update dated evaluation metadata before marking `latestAudit.reviewed` true. Each collection requires review of its actual target and build. Authentication files and diagnostic traces must not enter published artifacts.

## Reviewed interim releases

Collection `2026-10-01.3` has content, scope, findings reconciliation, nine conclusion, and public-distribution approval from Trevor Gerhardt at 2026-10-01T09:41:25Z. CC0-1.0 is approved. Forty-one criteria remain unknown; vendor approval is withheld and qualified-evaluator credentials are not asserted. The first Release was published on October 1, 2026. Repository and hosted reports correct publication metadata; the original Release bundle remains its reviewed snapshot. Complete-conformance requirements above are separate from this interim Release.

A monthly scan is an evidence collection, not a conformance publication. Each collection is reviewed on an audit branch and PR. Only assessments with recorded review and distribution approval belong on `main`. A separate GitHub PR review is not required by this workflow.

Interim review may leave criteria explicitly unknown. Reconcile findings and scope, record the actual reviewer and date in `reportReview`, approve public distribution and its license, and mark `latestAudit.reviewed` true. Refresh the draft Release with `audit:prepare` after recording assessment approval and before merge. Run `audit:release` after merge; it verifies the prepared and merged content, recorded assessment approval, and downloaded evidence before publishing. These releases remain clearly labeled interim. Final ACR submissions still require every gate above.

Review report text before pushing a public PR. Draft Release evidence is available to repository users with write access; it becomes public only when explicitly published. Bundles exclude authentication files, recovery manifests, and diagnostic traces. Keep pending bundles locally; published assets remain retained indefinitely. Local published copies may be removed after upload verification.

## Post-publication metadata

After a Release succeeds, verify its actual UTC publication date in GitHub. Update `assessment.json`'s `publicationDate` and corresponding maintained narrative, then run `pnpm build` and `pnpm check`. Commit these metadata corrections to `main` through the normal review workflow. Do not rerun preparation for a published collection or replace its original Release bundle. Repository and hosted reports contain the correction; the Release remains its reviewed snapshot. Collection automatically clears the publication date for the next audit.
