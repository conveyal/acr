# Audit 2026-10-01.3 - Reviewed Interim Assessment

Collected October 1, 2026 against http://localhost:3000 in unauthenticated local mode. This is the first published audit.

## Scope and collection

- Product: **Conveyal Analysis**. Author organization and vendor: **EBP, Inc.**

- UI checkout: `aa60ece30cea92775f42a0e4b35d80f04be7c2bd`; observed build: `6kwCYVezKwd_VVcUldOAW`.
- Playwright Test 1.63.0, Chromium 153.0.8010.12, axe-core 4.13.0; all 30 maintained fixture assets were checksum verified.
- All 34 tests passed, producing 36 scan states and 15 keyboard/structure observations. Regional results completed for 1,064 origins, and all 12 recorded run-owned resources were cleaned up.
- Configured worker version: `v7.6`.

## Reviewed finding reconciliation

Collection evidence corroborates A11Y-001 through A11Y-009 in the sample: unnamed zoom/help/form controls, enabled-text contrast, narrow form clipping, polygon keyboard selection, histogram distribution alternatives, pointer-dependent feature properties, and unfocusable overflowing instructions. Their existing Open status and severity are retained. All linked UI issues remain open.

No new, resolved, or reopened finding is asserted. Automated totals: 159 state-rule entries, 306 node occurrences, and nine distinct axe rules. These totals are not unique findings or criterion ratings.

Eight raw keyboard/structure checks passed and seven failed. The legend flag conflicts with its before/after disclosure snapshots; it remains uncertain and is not a confirmed failure. Bounds validation did not retain an invalid field state after blur; its failed association flag also requires targeted human review.

## Approved conclusions and remaining coverage

Reviewed by Trevor Gerhardt (trevor.gerhardt@ebp-us.com) at 2026-10-01T09:41:25Z.

Findings reconciliation, scope, public distribution, and nine rated criterion conclusions are approved within this limited interim scope: eight Partially Supports and one template-directed Supports for Parsing. The other 41 criteria remain unrated and unapproved. Reports and evidence are approved for distribution under CC0-1.0, subject to retained third-party provenance.

Vendor approval remains withheld; qualified-evaluator credentials are not asserted. Authentication, customer-release verification, complete-process testing, documentation/training, and human assistive-technology coverage remain pending. No remediation, completed conformance certification, or vendor commitment is implied.

Published October 1, 2026 as a reviewed interim assessment with explicit unknowns. Repository and hosted reports correct publication metadata; the original Release bundle remains its reviewed snapshot.
