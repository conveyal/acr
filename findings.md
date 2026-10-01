# Reviewed findings — October 1, 2026

Reviewed by Trevor Gerhardt (trevor.gerhardt@ebp-us.com) at 2026-10-01T09:41:25Z.

Collection `2026-10-01.3` is the first audit proposed for publication. It corroborates all nine existing findings and their real GitHub issues in the sampled local configuration. Their Open status, severity, and criterion relationships are retained; no new, resolved, or reopened finding is asserted. Review covers this limited interim scope, not complete conformance. No remediation or human screen-reader result is implied.

## A11Y-001: Give map zoom buttons accessible names

**Severity:** serious. **Criteria:** 4.1.2. **Status:** Open. [GitHub issue](https://github.com/conveyal/ui/issues/2155).

**Reproduce:** On any map page, inspect the plus/minus buttons in the accessibility tree. Both names are empty.

**Collection observation:** Axe reports unnamed zoom buttons; keyboard Enter changed zoom 12 to 13 but the activated button had no accessible name.

**Impact:** Users cannot identify zoom actions through assistive technology.

**Proposed change:** Add Zoom in and Zoom out accessible names to the shared buttons. Preserve keyboard activation.

**Retest:** Inspect both map systems with a screen reader and verify names, roles, activation, and disabled states.

UI source references: `lib/components/map/ZoomButtons.tsx`.

Evidence: [region-create.json](evidence/README.md#artifact-6a66134d732fe2ae), [keyboard/map-zoom-buttons.json](evidence/README.md#artifact-e1066a41200e2abd).

## A11Y-002: Give documentation and help links accessible names

**Severity:** serious. **Criteria:** 2.4.4, 4.1.2. **Status:** Open. [GitHub issue](https://github.com/conveyal/ui/issues/2156).

**Reproduce:** Tab to the sidebar documentation link and inline question-mark links. Inspect their accessible names; the scanned anchors have none.

**Collection observation:** Axe reports unnamed documentation/help anchors, including the sidebar documentation link.

**Impact:** Users cannot identify the documentation destination or the purpose of help links.

**Proposed change:** Put descriptive names on the anchors themselves, using visible or visually hidden text. Do not rely on hover tooltips.

**Retest:** Tab through each affected link and verify its purpose is announced without hovering.

UI source references: `lib/components/docs-link.tsx`, `lib/components/sidebar.tsx`.

Evidence: [projects.json](evidence/README.md#artifact-8906089a1c14303c), [region-create.json](evidence/README.md#artifact-6a66134d732fe2ae).

## A11Y-003: Associate accessible labels with analysis and import controls

**Severity:** serious. **Criteria:** 1.3.1, 3.3.2, 4.1.2. **Status:** Open. [GitHub issue](https://github.com/conveyal/ui/issues/2157).

**Reproduce:** Inspect the analysis grid zoom select, cutoff slider, import project selector, aggregation-area select, and histogram slider. Scanned controls lack accessible names or label associations.

**Collection observation:** Axe reports unnamed selects, sliders, and import controls. Keyboard slider value changes succeeded but do not resolve missing accessible names.

**Impact:** Users hear a control type or value without knowing which parameter it changes.

**Proposed change:** Give each control a descriptive label and associate it with the actual input or slider thumb. Include units where useful.

**Retest:** Verify every affected control announces its name, role, current value, bounds, and state; operate enabled controls with the keyboard.

UI source references: `lib/components/analysis/select-destination-layer.tsx`, `lib/components/analysis/results-sliders.tsx`, `lib/aggregation-area/components/chart.tsx`, `lib/components/import-modifications.tsx`, `pages/regions/[regionId]/aggregationAreas.tsx`.

Evidence: [analysis.json](evidence/README.md#artifact-051f5f36a3fdbb9f), [import-modifications.json](evidence/README.md#artifact-04eac4d729eb9de6), [aggregation-areas-populated.json](evidence/README.md#artifact-ccce63fb49f3f3e2), [regional-histogram-controls.json](evidence/README.md#artifact-4cc085621a05ce70).

## A11Y-004: Correct enabled text and button contrast in the light theme

**Severity:** serious. **Criteria:** 1.4.3. **Status:** Open. [GitHub issue](https://github.com/conveyal/ui/issues/2158).

**Reproduce:** Run the local scanner in light mode. Enabled white text on green #38a169 measures 3.24:1; white text on blue #3182ce measures 4.02:1. Grey instructions #718096 on white measure 4.01:1.

**Collection observation:** Axe reports insufficient contrast on enabled controls, including 3.24:1 white text on the green Create new region button; disabled-control hits remain subject to exception review.

**Impact:** Normal-size enabled text falls below the required 4.5:1 contrast.

**Proposed change:** Adjust shared text and button colors, then measure rendered pairs. Review each hit; exclude genuinely inactive controls rather than accepting all scanner classifications.

**Retest:** Measure enabled foreground/background pairs in light and dark modes, including hover and focus states. Apply 4.5:1 to normal text and 3:1 only where the large-text threshold applies.

UI source references: `lib/config/chakra.tsx`, `lib/components/analysis/select-destination-layer.tsx`, `lib/components/edit-bounds-form.tsx`.

Evidence: [home.json](evidence/README.md#artifact-e7e09bf0a88c54fb), [region-create.json](evidence/README.md#artifact-6a66134d732fe2ae).

## A11Y-005: Make surrounding map forms reflow at 320 CSS pixels

**Severity:** serious. **Criteria:** 1.4.10. **Status:** Open. [GitHub issue](https://github.com/conveyal/ui/issues/2159).

**Reproduce:** Open /regions/create at a 320 CSS-pixel viewport. The document scrollWidth is 361 and body overflow is hidden. The form and bounds text extend beyond the viewport.

**Collection observation:** At 320 CSS pixels, document scrollWidth was 361; the screenshot corroborates clipped non-map layout. Actual 400% browser zoom remains untested.

**Impact:** Users lose ordinary form content and controls at narrow widths or high magnification.

**Proposed change:** Allow the form panel and controls to reflow and remain reachable. Apply any two-dimensional map exception only to the map, not the surrounding form.

**Retest:** At 320 CSS pixels and actual 400% zoom, complete the region form using the keyboard without clipped non-map content or two-dimensional scrolling.

UI source references: `lib/layouts/map.tsx`, `lib/layouts/sidebar.tsx`.

Evidence: [region-create-320px.json](evidence/README.md#artifact-de9708cca4706f82), [screenshots/region-create-320px.png](evidence/README.md#artifact-7470138674f9235d), [keyboard/reflow-320px.json](evidence/README.md#artifact-b316581e162cf7ee).

## A11Y-006: Provide keyboard access to selecting route segments

**Severity:** critical. **Criteria:** 2.1.1. **Status:** Open. [GitHub issue](https://github.com/conveyal/ui/issues/2160).

**Reproduce:** Open the run-owned speed modification. Activate Select segments with Enter. The UI says Click to start drawing shape and exposes drawing toolbar links but no keyboard vertex-placement or equivalent segment selection. Escape cancels.

**Collection observation:** Keyboard activation entered polygon selection; no vertex was created, Escape cancelled, and focus did not return to the trigger in this observation. This is evidence about the sampled flow, not every drawing tool.

**Impact:** Keyboard users cannot complete segment-limited speed adjustment through this selection flow.

**Proposed change:** Provide an equivalent keyboard-operable segment selector, such as named stop-pair choices, or keyboard geometry editing with instructions. Assess other drawing tools separately.

**Retest:** Select, add, and remove intended segments without a pointer. Verify equivalent outcomes and cancellation. Use an isolated fixture for save/reload validation.

UI source references: `lib/components/modification/adjust-speed.tsx`, `lib/components/modifications-map/draw-polygon.tsx`, `lib/components/modifications-map/hop-select-polygon.tsx`.

Evidence: [adjust-speed-polygon-selection.json](evidence/README.md#artifact-c66d1af4edbd5307), [keyboard/polygon-keyboard.json](evidence/README.md#artifact-254de0b8d625ae54).

## A11Y-007: Expose aggregate histogram information without relying on the graphic

**Severity:** serious. **Criteria:** 1.1.1. **Status:** Open. [GitHub issue](https://github.com/conveyal/ui/issues/2161).

**Reproduce:** Open the completed run-owned regional result with its boundary aggregation area and population weighting. The histogram SVG has axis text but no accessible title/description or bin-value equivalent. The UI exposes a percentile summary and weighted average, not the histogram distribution.

**Collection observation:** The rendered histogram had no accessible title/description or labeling reference; snapshots retained aggregate summaries but no equivalent bin distribution. This supports the sampled finding; human screen-reader review remains pending.

**Impact:** Nonvisual users cannot access the distribution information conveyed by the histogram.

**Proposed change:** Add a descriptive chart name and a text or table equivalent for the bins and comparison series. Preserve the existing useful summary readouts.

**Retest:** Using a screen reader, identify the chart and inspect bin ranges, counts, units, and comparison series. Verify the equivalent matches rendered data.

UI source references: `lib/aggregation-area/components/chart.tsx`.

Evidence: [regional-histogram-controls.json](evidence/README.md#artifact-4cc085621a05ce70), [keyboard/chart-text-alternative.json](evidence/README.md#artifact-b24480d6ec4719fe).

## A11Y-008: Make spatial feature properties available from the keyboard

**Severity:** serious. **Criteria:** 2.1.1. **Status:** Open. [GitHub issue](https://github.com/conveyal/ui/issues/2162).

**Reproduce:** Open the run-owned boundary data source. The UI instructs users to hover over a feature. The feature hook subscribes to mousemove and provides no keyboard feature-selection path.

**Collection observation:** The fixture contained 36 spatial features; keyboard activation did not expose feature properties, and the view still instructed pointer hover.

**Impact:** Keyboard users cannot inspect the properties presented by hovering over spatial features.

**Proposed change:** Add a keyboard-operable feature list/search or equivalent feature selection, with a readable properties panel. Keep pointer hover as an optional shortcut.

**Retest:** Select the same feature with keyboard and pointer and compare the properties. Test focus movement and announcements with assistive technology.

UI source references: `lib/map/components/FeatureTable.tsx`, `lib/map/hooks/useHoveredFeature.ts`.

Evidence: [data-source-detail.json](evidence/README.md#artifact-fde5193d62f033bb), [keyboard/feature-properties-keyboard.json](evidence/README.md#artifact-c01a29fea75b563e).

## A11Y-009: Make horizontally scrollable bundle instructions keyboard accessible

**Severity:** medium. **Criteria:** 2.1.1. **Status:** Open. [GitHub issue](https://github.com/conveyal/ui/issues/2163).

**Reproduce:** Open the bundle creation page. Axe identifies the overflowing osmconvert and osmosis command containers as scrollable regions without a keyboard focus target.

**Collection observation:** Axe still identified both overflowing osmconvert/osmosis command containers as scroll regions without keyboard focus targets.

**Impact:** Keyboard users cannot reliably scroll to read the full command instructions.

**Proposed change:** Allow wrapping or give the scroll region an accessible keyboard focus target and label. Preserve selectable command text.

**Retest:** Reach and read each complete command using only the keyboard at normal size and magnification.

UI source references: `lib/components/code.tsx`.

Evidence: [bundle-create.json](evidence/README.md#artifact-7ec73c3a1c91b92a).

## Observations requiring interpretation

Bounds editing worked, but North=999 reverted to the original value after blur without retaining an invalid state. Its raw error-association flag does not establish a validation violation. Legend disclosure has a failed flag while its after snapshot shows changed content; targeted retesting is required before declaring a failure. These uncertainties do not alter the nine corroborated findings.

Unsupported ARIA attributes, an activity indicator's prohibited aria-label, and contrast hits on disabled controls require semantic and exception review. Missing landmarks, generic page titles, focus visibility, dynamic announcements, and geocoder results need further testing. Raw scanner flags alone do not determine criterion ratings.

## Interim limitations

Eight Partially Supports conclusions and the template-directed Supports for Parsing are reviewed within this limited scope. Forty-one criteria remain unknown. Remediation, human assistive-technology evaluation, and full delivered-product coverage remain follow-up work; this assessment does not establish completed conformance or submission readiness.
