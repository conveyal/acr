# Conveyal Accessibility Conformance Report — INTERNAL DRAFT

**Internal working draft — do not submit**

**New evidence awaits reconciliation. Run acr-ebc598bf-5867-4ba3-89fe-ba7eac3925d4 collected 2026-10-01T03:01:00.638Z. Assessment text and criterion ratings are historical (2026-09-30); approvals were not re-reviewed.**

**Template alignment:** VPAT® 2.5Rev WCAG (April 2025); WCAG 2.1 A/AA only

**Product/version:** Conveyal UI / Conveyal Analysis — aa60ece30cea92775f42a0e4b35d80f04be7c2bd; local build 6kwCYVezKwd_VVcUldOAW

**Date:** 2026-09-30

**Author:** Not designated; qualified review pending

**Author contact:** Pending designation

**Vendor contact:** Pending designation

**Notes:** Internal engineering baseline only; do not submit as a completed ACR. Evaluated exclusively at http://localhost:3000 in local mode without authentication. Proposed-release, authentication, complete-process, documentation/training and human assistive-technology testing remain pending. No conformance claim. Report date in drafts is the engineering evaluation date, not a publication date.<br><br>NEW EVIDENCE AWAITS RECONCILIATION: acr-ebc598bf-5867-4ba3-89fe-ba7eac3925d4 collected at http://localhost:3000 on 2026-10-01T03:01:00.638Z. Criterion ratings and approvals refer to the historical 2026-09-30 evaluation and were not re-reviewed.

**Evaluation methods:** axe-core 4.13.0; Cypress 13.4.0 / Electron 114; local browser accessibility-tree inspection; limited keyboard checks; source review; 320 CSS-pixel viewport; dark-mode sample. No human VoiceOver, NVDA, JAWS or TalkBack evaluation.<br>Evaluator qualifications: Pending qualified evaluator designation.

**Distribution license:** Not approved; internal draft

## Conformance terms

- **Supports:** The functionality of the product has at least one method that meets the criterion without known defects or meets with equivalent facilitation.
- **Partially Supports:** Some functionality of the product does not meet the criterion.
- **Does Not Support:** The majority of product functionality does not meet the criterion.
- **Not Applicable:** The criterion is not relevant to the product.

## WCAG 2.1 Level A

| Criterion | Conformance | Remarks and evidence |
| --- | --- | --- |
| 1.1.1 Non-text Content | Partially Supports — provisional | A11Y-007: Inspect all map/chart equivalents and generated output; histogram distribution failure is confirmed. [evidence/regional-histogram-controls.json](../evidence/README.md#artifact-4cc085621a05ce70) [evidence/regional-histogram.json](../evidence/README.md#artifact-af1a22ba0c65f0ad) [Findings](../findings.md) |
| 1.2.1 Audio-only and Video-only (Prerecorded) | Pending evidence — no rating | No applicable media observed in sampled UI. Confirm documentation/training inventory.   |
| 1.2.2 Captions (Prerecorded) | Pending evidence — no rating | No applicable media observed in sampled UI. Confirm documentation/training inventory.   |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | Pending evidence — no rating | No applicable media observed in sampled UI. Confirm documentation/training inventory.   |
| 1.3.1 Info and Relationships | Partially Supports — provisional | A11Y-003: Inspect programmatic relationships, tables, groups, and chart equivalents; label association failures observed. [evidence/aggregation-areas-populated.json](../evidence/README.md#artifact-ccce63fb49f3f3e2) [evidence/analysis.json](../evidence/README.md#artifact-051f5f36a3fdbb9f) [evidence/import-modifications.json](../evidence/README.md#artifact-04eac4d729eb9de6) [evidence/regional-histogram-controls.json](../evidence/README.md#artifact-4cc085621a05ce70) [evidence/regional-histogram.json](../evidence/README.md#artifact-af1a22ba0c65f0ad) [Findings](../findings.md) |
| 1.3.2 Meaningful Sequence | Pending evidence — no rating | Read map/sidebar/report content in DOM and screen-reader order.   |
| 1.3.3 Sensory Characteristics | Pending evidence — no rating | Review spatial instructions, drawing tools, and sensory-only instructions.   |
| 1.4.1 Use of Color | Pending evidence — no rating | Inspect map legends, comparison series, status colors, and redundant cues.   |
| 1.4.2 Audio Control | Pending evidence — no rating | No autoplay audio observed; confirm full delivered-content inventory.   |
| 2.1.1 Keyboard | Partially Supports — provisional | A11Y-006, A11Y-008, A11Y-009: Polygon selection, feature inspection, and scrolling barriers observed. Complete remaining workflows without a pointer. [evidence/adjust-speed-polygon-selection.json](../evidence/README.md#artifact-c66d1af4edbd5307) [evidence/adjust-speed.json](../evidence/README.md#artifact-ccfaf9ba4397648c) [evidence/bundle-create.json](../evidence/README.md#artifact-7ec73c3a1c91b92a) [evidence/data-source-detail.json](../evidence/README.md#artifact-fde5193d62f033bb) [Findings](../findings.md) |
| 2.1.2 No Keyboard Trap | Pending evidence — no rating | Escape cancelled polygon drawing. Complete modal/menu/map keyboard-trap checks.   |
| 2.1.4 Character Key Shortcuts | Pending evidence — no rating | Inventory character shortcuts and verify off/remap/focus-only behavior.   |
| 2.2.1 Timing Adjustable | Pending evidence — no rating | Review job/session timing. Authentication/session-expiry testing is excluded.   |
| 2.2.2 Pause, Stop, Hide | Pending evidence — no rating | Review loading animations, dynamic updates, and any timed or moving content.   |
| 2.3.1 Three Flashes or Below Threshold | Pending evidence — no rating | Review flashes across loading, maps, errors, and media.   |
| 2.4.1 Bypass Blocks | Pending evidence — no rating | Review ways to bypass repeated navigation; headings exist, no main landmark recorded.   |
| 2.4.2 Page Titled | Pending evidence — no rating | Most sampled titles are Conveyal Analysis. Assess whether titles describe page purpose sufficiently.   |
| 2.4.3 Focus Order | Pending evidence — no rating | Complete keyboard order, modal return focus, and route-change focus checks.   |
| 2.4.4 Link Purpose (In Context) | Partially Supports — provisional | A11Y-002: Unnamed documentation links observed; assess all link purposes and contexts. [evidence/analysis.json](../evidence/README.md#artifact-051f5f36a3fdbb9f) [evidence/bundle-create.json](../evidence/README.md#artifact-7ec73c3a1c91b92a) [evidence/projects.json](../evidence/README.md#artifact-8906089a1c14303c) [evidence/region-create.json](../evidence/README.md#artifact-6a66134d732fe2ae) [Findings](../findings.md) |
| 2.5.1 Pointer Gestures | Pending evidence — no rating | Review gesture-dependent map operations and equivalent simple-pointer paths.   |
| 2.5.2 Pointer Cancellation | Pending evidence — no rating | Review cancellation for dragging/drawing and accidental activation.   |
| 2.5.3 Label in Name | Pending evidence — no rating | Compare visible labels with accessible names; automated passes are partial evidence.   |
| 2.5.4 Motion Actuation | Pending evidence — no rating | No motion-input feature observed. Confirm full input-method inventory.   |
| 3.1.1 Language of Page | Pending evidence — no rating | Rendered document lang=en in sampled states. Review remaining delivered surfaces.   |
| 3.2.1 On Focus | Pending evidence — no rating | Review all focus-triggered context changes and overlays.   |
| 3.2.2 On Input | Pending evidence — no rating | Review select/input-triggered navigation and announcements.   |
| 3.3.1 Error Identification | Pending evidence — no rating | Invalid North=999 exposes aria-invalid; error-text/announcement review remains pending.   |
| 3.3.2 Labels or Instructions | Partially Supports — provisional | A11Y-003: Unlabeled input controls observed. Review remaining form instructions and errors. [evidence/aggregation-areas-populated.json](../evidence/README.md#artifact-ccce63fb49f3f3e2) [evidence/analysis.json](../evidence/README.md#artifact-051f5f36a3fdbb9f) [evidence/import-modifications.json](../evidence/README.md#artifact-04eac4d729eb9de6) [evidence/regional-histogram-controls.json](../evidence/README.md#artifact-4cc085621a05ce70) [evidence/regional-histogram.json](../evidence/README.md#artifact-af1a22ba0c65f0ad) [Findings](../findings.md) |
| 4.1.1 Parsing | Supports — provisional | ITI template directs Supports for WCAG 2.1 under the published errata; removed in WCAG 2.2.   |
| 4.1.2 Name, Role, Value | Partially Supports — provisional | A11Y-001, A11Y-002, A11Y-003: Unnamed controls confirmed. Raw ARIA findings also require semantic/AT review. [evidence/aggregation-areas-populated.json](../evidence/README.md#artifact-ccce63fb49f3f3e2) [evidence/analysis.json](../evidence/README.md#artifact-051f5f36a3fdbb9f) [evidence/bundle-create.json](../evidence/README.md#artifact-7ec73c3a1c91b92a) [evidence/import-modifications.json](../evidence/README.md#artifact-04eac4d729eb9de6) [evidence/projects.json](../evidence/README.md#artifact-8906089a1c14303c) [evidence/region-create.json](../evidence/README.md#artifact-6a66134d732fe2ae) [evidence/regional-completed.json](../evidence/README.md#artifact-b7fdd1774fcc684b) [evidence/regional-histogram-controls.json](../evidence/README.md#artifact-4cc085621a05ce70) [evidence/regional-histogram.json](../evidence/README.md#artifact-af1a22ba0c65f0ad) [Findings](../findings.md) |

## WCAG 2.1 Level AA

| Criterion | Conformance | Remarks and evidence |
| --- | --- | --- |
| 1.2.4 Captions (Live) | Pending evidence — no rating | No applicable live media observed. Confirm delivered services and training.   |
| 1.2.5 Audio Description (Prerecorded) | Pending evidence — no rating | No applicable media observed in sampled UI. Confirm documentation/training inventory.   |
| 1.3.4 Orientation | Pending evidence — no rating | Test portrait and landscape on the required mobile environments.   |
| 1.3.5 Identify Input Purpose | Pending evidence — no rating | Review relevant personal-information fields; authentication is excluded.   |
| 1.4.3 Contrast (Minimum) | Partially Supports — provisional | A11Y-004: Enabled text failures measured. Review inactive exceptions and every theme/state. [evidence/analysis.json](../evidence/README.md#artifact-051f5f36a3fdbb9f) [evidence/home.json](../evidence/README.md#artifact-e7e09bf0a88c54fb) [evidence/import-modifications.json](../evidence/README.md#artifact-04eac4d729eb9de6) [evidence/project-share-menu.json](../evidence/README.md#artifact-b00ff0ff93161879) [evidence/region-create.json](../evidence/README.md#artifact-6a66134d732fe2ae) [Findings](../findings.md) |
| 1.4.4 Resize text | Pending evidence — no rating | Human actual 200% text/browser resizing remains pending.   |
| 1.4.5 Images of Text | Pending evidence — no rating | Review logos, maps, reports, and any embedded images of text.   |
| 1.4.10 Reflow | Partially Supports — provisional | A11Y-005: 320 CSS-pixel form clipping confirmed. Actual 400% zoom and remaining routes need testing. [evidence/region-create-320px.json](../evidence/README.md#artifact-de9708cca4706f82) [Findings](../findings.md) |
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
- [questionnaire-draft.md](../questionnaire-draft.md)
- [manual-testing.md](../manual-testing.md)
- [criteria-matrix.md](../criteria-matrix.md)
