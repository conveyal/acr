# Conveyal UI — draft Accessibility Conformance Report

**Historical assessment: September 30, 2026.** The assessment text below has not been reconciled with subsequent collections. See the [evidence index](evidence/README.md) for current collection details.

**Internal working draft. Do not submit this document as a completed ACR.**
It prepares the required fields and evidence for VPAT® Version 2.5Rev WCAG (April 2025).
Pending evidence markers below are not valid final A/AA conformance terms.

| Field                        | Draft value                                                                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product                      | Conveyal UI / Conveyal Analysis                                                                                                                                    |
| Evaluated version            | Local checkout `aa60ece30cea92775f42a0e4b35d80f04be7c2bd`; build `6kwCYVezKwd_VVcUldOAW`                                                                           |
| Configuration                | http://localhost:3000; local mode; authentication disabled                                                                                                         |
| Evaluation date              | September 30, 2026                                                                                                                                                 |
| Report publication date      | Pending qualified review and vendor approval                                                                                                                       |
| Product description          | Browser application for editing transportation scenarios and inspecting accessibility analysis results                                                             |
| Vendor contact               | Pending designation by Conveyal                                                                                                                                    |
| Evaluator and qualifications | Engineering evidence prepared with Codex assistance; qualified evaluator not yet designated                                                                        |
| Methods                      | axe-core 4.13.0 in Cypress 13.4.0 / Electron 114; local browser AX-tree inspection; limited keyboard checks; source review; 320 CSS-pixel layout; dark-mode sample |
| Standards                    | WCAG 2.1 A/AA baseline; WCAG 2.2 additions tracked separately, without a conformance claim                                                                         |

## Notes and limitations

This draft describes the local baseline, not the proposed customer release or authenticated product.
No human VoiceOver, NVDA, JAWS, or TalkBack results exist in this baseline.
The full required environment matrix and complete-process tests are outstanding.
No existing vendor ACR was supplied or verified. This draft does not establish that none exists.
The final report must identify the delivered configuration, qualified personnel, evaluation methods, and defensible criterion-level conclusions.

The final VPAT uses Supports, Partially Supports, Does Not Support, or Not Applicable for A/AA rows.
ITI permits Not Evaluated only for AAA. Do not turn missing evidence into Supports or Not Applicable.
A/AA pending rows must be resolved before this draft can become the requested ACR.

## Provisional criterion worksheet

Partially Supports below means accessible functionality exists alongside observed failures in the sample.
It is a proposed rating for evaluator review, not a completed assessment across the delivered product.

| WCAG 2.1 criterion                                         | Level | Proposed conformance term               | Remarks and evidence                                                                                                                                  |
| ---------------------------------------------------------- | ----- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1 Non-text Content                                     | A     | Partially Supports — provisional        | A11Y-007: Inspect all map/chart equivalents and generated output; histogram distribution failure is confirmed.                                        |
| 1.2.1 Audio-only and Video-only (Prerecorded)              | A     | Pending evidence — internal placeholder | No applicable media observed in sampled UI. Confirm documentation/training inventory.                                                                 |
| 1.2.2 Captions (Prerecorded)                               | A     | Pending evidence — internal placeholder | No applicable media observed in sampled UI. Confirm documentation/training inventory.                                                                 |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | A     | Pending evidence — internal placeholder | No applicable media observed in sampled UI. Confirm documentation/training inventory.                                                                 |
| 1.2.4 Captions (Live)                                      | AA    | Pending evidence — internal placeholder | No applicable live media observed. Confirm delivered services and training.                                                                           |
| 1.2.5 Audio Description (Prerecorded)                      | AA    | Pending evidence — internal placeholder | No applicable media observed in sampled UI. Confirm documentation/training inventory.                                                                 |
| 1.3.1 Info and Relationships                               | A     | Partially Supports — provisional        | A11Y-003: Inspect programmatic relationships, tables, groups, and chart equivalents; label association failures observed.                             |
| 1.3.2 Meaningful Sequence                                  | A     | Pending evidence — internal placeholder | Read map/sidebar/report content in DOM and screen-reader order.                                                                                       |
| 1.3.3 Sensory Characteristics                              | A     | Pending evidence — internal placeholder | Review spatial instructions, drawing tools, and sensory-only instructions.                                                                            |
| 1.3.4 Orientation                                          | AA    | Pending evidence — internal placeholder | Test portrait and landscape on the required mobile environments.                                                                                      |
| 1.3.5 Identify Input Purpose                               | AA    | Pending evidence — internal placeholder | Review relevant personal-information fields; authentication is excluded.                                                                              |
| 1.4.1 Use of Color                                         | A     | Pending evidence — internal placeholder | Inspect map legends, comparison series, status colors, and redundant cues.                                                                            |
| 1.4.2 Audio Control                                        | A     | Pending evidence — internal placeholder | No autoplay audio observed; confirm full delivered-content inventory.                                                                                 |
| 1.4.3 Contrast (Minimum)                                   | AA    | Partially Supports — provisional        | A11Y-004: Enabled text failures measured. Review inactive exceptions and every theme/state.                                                           |
| 1.4.4 Resize text                                          | AA    | Pending evidence — internal placeholder | Human actual 200% text/browser resizing remains pending.                                                                                              |
| 1.4.5 Images of Text                                       | AA    | Pending evidence — internal placeholder | Review logos, maps, reports, and any embedded images of text.                                                                                         |
| 1.4.10 Reflow                                              | AA    | Partially Supports — provisional        | A11Y-005: 320 CSS-pixel form clipping confirmed. Actual 400% zoom and remaining routes need testing.                                                  |
| 1.4.11 Non-text Contrast                                   | AA    | Pending evidence — internal placeholder | Measure interactive boundaries, focus indicators, charts, and map overlays.                                                                           |
| 1.4.12 Text Spacing                                        | AA    | Pending evidence — internal placeholder | Apply WCAG spacing overrides and verify no content/function loss.                                                                                     |
| 1.4.13 Content on Hover or Focus                           | AA    | Pending evidence — internal placeholder | Test tooltip/popover dismissal, persistence, and hoverability.                                                                                        |
| 2.1.1 Keyboard                                             | A     | Partially Supports — provisional        | A11Y-006, A11Y-008, A11Y-009: Polygon selection, feature inspection, and scrolling barriers observed. Complete remaining workflows without a pointer. |
| 2.1.2 No Keyboard Trap                                     | A     | Pending evidence — internal placeholder | Escape cancelled polygon drawing. Complete modal/menu/map keyboard-trap checks.                                                                       |
| 2.1.4 Character Key Shortcuts                              | A     | Pending evidence — internal placeholder | Inventory character shortcuts and verify off/remap/focus-only behavior.                                                                               |
| 2.2.1 Timing Adjustable                                    | A     | Pending evidence — internal placeholder | Review job/session timing. Authentication/session-expiry testing is excluded.                                                                         |
| 2.2.2 Pause, Stop, Hide                                    | A     | Pending evidence — internal placeholder | Review loading animations, dynamic updates, and any timed or moving content.                                                                          |
| 2.3.1 Three Flashes or Below Threshold                     | A     | Pending evidence — internal placeholder | Review flashes across loading, maps, errors, and media.                                                                                               |
| 2.4.1 Bypass Blocks                                        | A     | Pending evidence — internal placeholder | Review ways to bypass repeated navigation; headings exist, no main landmark recorded.                                                                 |
| 2.4.2 Page Titled                                          | A     | Pending evidence — internal placeholder | Most sampled titles are Conveyal Analysis. Assess whether titles describe page purpose sufficiently.                                                  |
| 2.4.3 Focus Order                                          | A     | Pending evidence — internal placeholder | Complete keyboard order, modal return focus, and route-change focus checks.                                                                           |
| 2.4.4 Link Purpose (In Context)                            | A     | Partially Supports — provisional        | A11Y-002: Unnamed documentation links observed; assess all link purposes and contexts.                                                                |
| 2.4.5 Multiple Ways                                        | AA    | Pending evidence — internal placeholder | Review navigation and other ways to locate eligible pages.                                                                                            |
| 2.4.6 Headings and Labels                                  | AA    | Pending evidence — internal placeholder | Review heading hierarchy and descriptive labels across all workflows.                                                                                 |
| 2.4.7 Focus Visible                                        | AA    | Pending evidence — internal placeholder | Inspect visible focus on sidebar, tabs, maps, forms, and overlays.                                                                                    |
| 2.5.1 Pointer Gestures                                     | A     | Pending evidence — internal placeholder | Review gesture-dependent map operations and equivalent simple-pointer paths.                                                                          |
| 2.5.2 Pointer Cancellation                                 | A     | Pending evidence — internal placeholder | Review cancellation for dragging/drawing and accidental activation.                                                                                   |
| 2.5.3 Label in Name                                        | A     | Pending evidence — internal placeholder | Compare visible labels with accessible names; automated passes are partial evidence.                                                                  |
| 2.5.4 Motion Actuation                                     | A     | Pending evidence — internal placeholder | No motion-input feature observed. Confirm full input-method inventory.                                                                                |
| 3.1.1 Language of Page                                     | A     | Pending evidence — internal placeholder | Rendered document lang=en in sampled states. Review remaining delivered surfaces.                                                                     |
| 3.1.2 Language of Parts                                    | AA    | Pending evidence — internal placeholder | Identify language changes in product and user-generated content.                                                                                      |
| 3.2.1 On Focus                                             | A     | Pending evidence — internal placeholder | Review all focus-triggered context changes and overlays.                                                                                              |
| 3.2.2 On Input                                             | A     | Pending evidence — internal placeholder | Review select/input-triggered navigation and announcements.                                                                                           |
| 3.2.3 Consistent Navigation                                | AA    | Pending evidence — internal placeholder | Shared sidebar observed; review order across roles and workflows.                                                                                     |
| 3.2.4 Consistent Identification                            | AA    | Pending evidence — internal placeholder | Review control naming and identification across both map systems.                                                                                     |
| 3.3.1 Error Identification                                 | A     | Pending evidence — internal placeholder | Invalid North=999 exposes aria-invalid; error-text/announcement review remains pending.                                                               |
| 3.3.2 Labels or Instructions                               | A     | Partially Supports — provisional        | A11Y-003: Unlabeled input controls observed. Review remaining form instructions and errors.                                                           |
| 3.3.3 Error Suggestion                                     | AA    | Pending evidence — internal placeholder | Test validation and corrective suggestions using isolated fixtures.                                                                                   |
| 3.3.4 Error Prevention (Legal, Financial, Data)            | AA    | Pending evidence — internal placeholder | Test reversible/confirmed delete and data-modification processes on isolated fixtures.                                                                |
| 4.1.1 Parsing                                              | A     | Supports — ITI errata instruction       | ITI template directs Supports for WCAG 2.1 under the published errata; removed in WCAG 2.2.                                                           |
| 4.1.2 Name, Role, Value                                    | A     | Partially Supports — provisional        | A11Y-001, A11Y-002, A11Y-003: Unnamed controls confirmed. Raw ARIA findings also require semantic/AT review.                                          |
| 4.1.3 Status Messages                                      | AA    | Pending evidence — internal placeholder | Human screen-reader testing of progress, errors, toasts, and results is pending.                                                                      |

## Finalization requirements

1. Complete remaining tests and evaluate all applicable A/AA rows with valid conformance terms and explanatory remarks.
2. Include authentication, role-dependent behavior, other delivered materials, and proposed-release verification.
3. Have qualified personnel complete or validate the evaluation and own the published conclusions.
4. Approve vendor contact, report date, questionnaire facts, and remediation commitments.
5. Transfer the reviewed evidence into the latest official template and verify the final document itself is accessible.

[ITI template and instructions](https://www.itic.org/policy/accessibility/vpat) · [Massachusetts contract requirements](https://www.mass.gov/info-details/vendor-digital-accessibility-contract-language)
