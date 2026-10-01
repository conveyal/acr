# Conveyal Analysis Accessibility Audit — Reviewed Interim Assessment

**Reviewed interim assessment — incomplete conformance evaluation**

**Template alignment:** VPAT® 2.5Rev WCAG (April 2025); WCAG 2.1 A/AA only

**Product/version:** Conveyal Analysis — aa60ece30cea92775f42a0e4b35d80f04be7c2bd; local build 6kwCYVezKwd_VVcUldOAW

**Date:** 2026-10-01

**Author:** Trevor Gerhardt

**Author contact:** trevor.gerhardt@ebp-us.com

**Author organization:** EBP, Inc.

**Vendor:** EBP, Inc.

**Vendor contact:** Pending designation

**Reviewer:** Trevor Gerhardt

**Review timestamp (UTC):** 2026-10-01T09:41:25Z

**Vendor approval:** Not approved

**Publication date:** 2026-10-01

**Notes:** First reviewed interim audit, collection 2026-10-01.3, of http://localhost:3000 in unauthenticated local mode. Trevor Gerhardt reviewed the findings, scope, public distribution, and nine rated criterion conclusions; 41 criteria remain unknown and unapproved. The collection corroborates the nine existing GitHub findings and does not assert remediation or new, resolved, or reopened findings. Disposable run-owned fixtures were used; regional results completed and all 12 recorded resources were cleaned up. The source checkout was aa60ece30cea92775f42a0e4b35d80f04be7c2bd and the observed Next.js build was 6kwCYVezKwd_VVcUldOAW; build-to-commit identity is not independently attested. The target requested R5 v7.6, but the functioning local worker reported v7.5.1-11-g6f35542.dirty. Bounds validation and legend disclosure remain uncertain observations. Authentication, customer-release verification, complete-process coverage, documentation/training, and human assistive-technology evaluation remain pending. Vendor approval is withheld and qualified-evaluator credentials are not asserted. Public distribution is approved under CC0-1.0; the first Release was published on October 1, 2026. Repository and hosted reports correct publication metadata; the original Release bundle remains its reviewed snapshot. This limited interim assessment is not a completed conformance evaluation or certification.

**Evaluation methods:** October 1, 2026 collection: Playwright Test 1.63.0, Chromium 153.0.8010.12, axe-core 4.13.0, 36 scanned states, 15 automated keyboard/structure observations with before/after accessibility snapshots, screenshots, 320 CSS-pixel reflow sample, and dark-mode sample. Eight observations passed and seven failed; failed observations require interpretation, including bounds validation and legend disclosure. Trevor Gerhardt reviewed the collected material, reconciled findings, and approved nine rated conclusions within this limited scope. No human VoiceOver, NVDA, JAWS, or TalkBack evaluation was performed.<br>Evaluator qualifications: Not asserted for this interim assessment.

**Distribution license:** CC0-1.0

## Conformance terms

- **Supports:** The functionality of the product has at least one method that meets the criterion without known defects or meets with equivalent facilitation.
- **Partially Supports:** Some functionality of the product does not meet the criterion.
- **Does Not Support:** The majority of product functionality does not meet the criterion.
- **Not Applicable:** The criterion is not relevant to the product.

## WCAG 2.1 Level A

| Criterion | Conformance | Remarks and evidence |
| --- | --- | --- |
| 1.1.1 Non-text Content | Partially Supports — reviewed interim | A11Y-007: Inspect all map/chart equivalents and generated output; histogram distribution failure is confirmed. [evidence/regional-histogram-controls.json](../evidence/README.md#artifact-4cc085621a05ce70) [evidence/regional-histogram.json](../evidence/README.md#artifact-af1a22ba0c65f0ad) [Findings](../findings.md) |
| 1.2.1 Audio-only and Video-only (Prerecorded) | Pending evidence — no rating | No applicable media observed in sampled UI. Confirm documentation/training inventory.   |
| 1.2.2 Captions (Prerecorded) | Pending evidence — no rating | No applicable media observed in sampled UI. Confirm documentation/training inventory.   |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | Pending evidence — no rating | No applicable media observed in sampled UI. Confirm documentation/training inventory.   |
| 1.3.1 Info and Relationships | Partially Supports — reviewed interim | A11Y-003: Inspect programmatic relationships, tables, groups, and chart equivalents; label association failures observed. [evidence/aggregation-areas-populated.json](../evidence/README.md#artifact-ccce63fb49f3f3e2) [evidence/analysis.json](../evidence/README.md#artifact-051f5f36a3fdbb9f) [evidence/import-modifications.json](../evidence/README.md#artifact-04eac4d729eb9de6) [evidence/regional-histogram-controls.json](../evidence/README.md#artifact-4cc085621a05ce70) [evidence/regional-histogram.json](../evidence/README.md#artifact-af1a22ba0c65f0ad) [Findings](../findings.md) |
| 1.3.2 Meaningful Sequence | Pending evidence — no rating | Read map/sidebar/report content in DOM and screen-reader order.   |
| 1.3.3 Sensory Characteristics | Pending evidence — no rating | Review spatial instructions, drawing tools, and sensory-only instructions.   |
| 1.4.1 Use of Color | Pending evidence — no rating | Inspect map legends, comparison series, status colors, and redundant cues.   |
| 1.4.2 Audio Control | Pending evidence — no rating | No autoplay audio observed; confirm full delivered-content inventory.   |
| 2.1.1 Keyboard | Partially Supports — reviewed interim | A11Y-006, A11Y-008, A11Y-009: Polygon selection, feature inspection, and scrolling barriers observed. Complete remaining workflows without a pointer. [evidence/adjust-speed-polygon-selection.json](../evidence/README.md#artifact-c66d1af4edbd5307) [evidence/adjust-speed.json](../evidence/README.md#artifact-ccfaf9ba4397648c) [evidence/bundle-create.json](../evidence/README.md#artifact-7ec73c3a1c91b92a) [evidence/data-source-detail.json](../evidence/README.md#artifact-fde5193d62f033bb) [Findings](../findings.md) |
| 2.1.2 No Keyboard Trap | Pending evidence — no rating | Escape cancelled polygon drawing. Complete modal/menu/map keyboard-trap checks.   |
| 2.1.4 Character Key Shortcuts | Pending evidence — no rating | Inventory character shortcuts and verify off/remap/focus-only behavior.   |
| 2.2.1 Timing Adjustable | Pending evidence — no rating | Review job/session timing. Authentication/session-expiry testing is excluded.   |
| 2.2.2 Pause, Stop, Hide | Pending evidence — no rating | Review loading animations, dynamic updates, and any timed or moving content.   |
| 2.3.1 Three Flashes or Below Threshold | Pending evidence — no rating | Review flashes across loading, maps, errors, and media.   |
| 2.4.1 Bypass Blocks | Pending evidence — no rating | Review ways to bypass repeated navigation; headings exist, no main landmark recorded.   |
| 2.4.2 Page Titled | Pending evidence — no rating | Most sampled titles are Conveyal Analysis. Assess whether titles describe page purpose sufficiently.   |
| 2.4.3 Focus Order | Pending evidence — no rating | Complete keyboard order, modal return focus, and route-change focus checks.   |
| 2.4.4 Link Purpose (In Context) | Partially Supports — reviewed interim | A11Y-002: Unnamed documentation links observed; assess all link purposes and contexts. [evidence/analysis.json](../evidence/README.md#artifact-051f5f36a3fdbb9f) [evidence/bundle-create.json](../evidence/README.md#artifact-7ec73c3a1c91b92a) [evidence/projects.json](../evidence/README.md#artifact-8906089a1c14303c) [evidence/region-create.json](../evidence/README.md#artifact-6a66134d732fe2ae) [Findings](../findings.md) |
| 2.5.1 Pointer Gestures | Pending evidence — no rating | Review gesture-dependent map operations and equivalent simple-pointer paths.   |
| 2.5.2 Pointer Cancellation | Pending evidence — no rating | Review cancellation for dragging/drawing and accidental activation.   |
| 2.5.3 Label in Name | Pending evidence — no rating | Compare visible labels with accessible names; automated passes are partial evidence.   |
| 2.5.4 Motion Actuation | Pending evidence — no rating | No motion-input feature observed. Confirm full input-method inventory.   |
| 3.1.1 Language of Page | Pending evidence — no rating | Rendered document lang=en in sampled states. Review remaining delivered surfaces.   |
| 3.2.1 On Focus | Pending evidence — no rating | Review all focus-triggered context changes and overlays.   |
| 3.2.2 On Input | Pending evidence — no rating | Review select/input-triggered navigation and announcements.   |
| 3.3.1 Error Identification | Pending evidence — no rating | North=999 reverted to the original value after blur, without retaining an invalid state. Error identification and announcement remain unassessed; targeted validation testing is required.   |
| 3.3.2 Labels or Instructions | Partially Supports — reviewed interim | A11Y-003: Unlabeled input controls observed. Review remaining form instructions and errors. [evidence/aggregation-areas-populated.json](../evidence/README.md#artifact-ccce63fb49f3f3e2) [evidence/analysis.json](../evidence/README.md#artifact-051f5f36a3fdbb9f) [evidence/import-modifications.json](../evidence/README.md#artifact-04eac4d729eb9de6) [evidence/regional-histogram-controls.json](../evidence/README.md#artifact-4cc085621a05ce70) [evidence/regional-histogram.json](../evidence/README.md#artifact-af1a22ba0c65f0ad) [Findings](../findings.md) |
| 4.1.1 Parsing | Supports — reviewed interim | ITI template directs Supports for WCAG 2.1 under the published errata; removed in WCAG 2.2.   |
| 4.1.2 Name, Role, Value | Partially Supports — reviewed interim | A11Y-001, A11Y-002, A11Y-003: Unnamed controls confirmed. Raw ARIA findings also require semantic/AT review. [evidence/aggregation-areas-populated.json](../evidence/README.md#artifact-ccce63fb49f3f3e2) [evidence/analysis.json](../evidence/README.md#artifact-051f5f36a3fdbb9f) [evidence/bundle-create.json](../evidence/README.md#artifact-7ec73c3a1c91b92a) [evidence/import-modifications.json](../evidence/README.md#artifact-04eac4d729eb9de6) [evidence/projects.json](../evidence/README.md#artifact-8906089a1c14303c) [evidence/region-create.json](../evidence/README.md#artifact-6a66134d732fe2ae) [evidence/regional-completed.json](../evidence/README.md#artifact-b7fdd1774fcc684b) [evidence/regional-histogram-controls.json](../evidence/README.md#artifact-4cc085621a05ce70) [evidence/regional-histogram.json](../evidence/README.md#artifact-af1a22ba0c65f0ad) [Findings](../findings.md) |

## WCAG 2.1 Level AA

| Criterion | Conformance | Remarks and evidence |
| --- | --- | --- |
| 1.2.4 Captions (Live) | Pending evidence — no rating | No applicable live media observed. Confirm delivered services and training.   |
| 1.2.5 Audio Description (Prerecorded) | Pending evidence — no rating | No applicable media observed in sampled UI. Confirm documentation/training inventory.   |
| 1.3.4 Orientation | Pending evidence — no rating | Test portrait and landscape on the required mobile environments.   |
| 1.3.5 Identify Input Purpose | Pending evidence — no rating | Review relevant personal-information fields; authentication is excluded.   |
| 1.4.3 Contrast (Minimum) | Partially Supports — reviewed interim | A11Y-004: Enabled text failures measured. Review inactive exceptions and every theme/state. [evidence/analysis.json](../evidence/README.md#artifact-051f5f36a3fdbb9f) [evidence/home.json](../evidence/README.md#artifact-e7e09bf0a88c54fb) [evidence/import-modifications.json](../evidence/README.md#artifact-04eac4d729eb9de6) [evidence/project-share-menu.json](../evidence/README.md#artifact-b00ff0ff93161879) [evidence/region-create.json](../evidence/README.md#artifact-6a66134d732fe2ae) [Findings](../findings.md) |
| 1.4.4 Resize text | Pending evidence — no rating | Human actual 200% text/browser resizing remains pending.   |
| 1.4.5 Images of Text | Pending evidence — no rating | Review logos, maps, reports, and any embedded images of text.   |
| 1.4.10 Reflow | Partially Supports — reviewed interim | A11Y-005: 320 CSS-pixel form clipping confirmed. Actual 400% zoom and remaining routes need testing. [evidence/region-create-320px.json](../evidence/README.md#artifact-de9708cca4706f82) [Findings](../findings.md) |
| 1.4.11 Non-text Contrast | Pending evidence — no rating | Measure interactive boundaries, focus indicators, charts, and map overlays.   |
| 1.4.12 Text Spacing | Pending evidence — no rating | Apply WCAG spacing overrides and verify no content/function loss.   |
| 1.4.13 Content on Hover or Focus | Pending evidence — no rating | Test tooltip/popover dismissal, persistence, and hoverability.   |
| 2.4.5 Multiple Ways | Pending evidence — no rating | Review navigation and other ways to locate eligible pages.   |
| 2.4.6 Headings and Labels | Pending evidence — no rating | Review heading hierarchy and descriptive labels across all workflows.   |
| 2.4.7 Focus Visible | Pending evidence — no rating | Inspect visible focus on sidebar, tabs, maps, forms, and overlays.   |
| 3.1.2 Language of Parts | Pending evidence — no rating | Identify language changes in product and user-generated content.   |
| 3.2.3 Consistent Navigation | Pending evidence — no rating | Shared sidebar observed; review order across roles and workflows.   |
| 3.2.4 Consistent Identification | Pending evidence — no rating | Review control naming and identification across both map systems.   |
| 3.3.3 Error Suggestion | Pending evidence — no rating | Test validation and corrective suggestions using isolated fixtures.   |
| 3.3.4 Error Prevention (Legal, Financial, Data) | Pending evidence — no rating | Test reversible/confirmed delete and data-modification processes on isolated fixtures.   |
| 4.1.3 Status Messages | Pending evidence — no rating | Human screen-reader testing of progress, errors, toasts, and results is pending.   |

## Companion documents

- [scope.md](../scope.md)
- [findings.md](../findings.md)
- [roadmap.md](../roadmap.md)
- [questionnaire.md](../questionnaire.md)
- [manual-testing.md](../manual-testing.md)
- [criteria-matrix.md](../criteria-matrix.md)
