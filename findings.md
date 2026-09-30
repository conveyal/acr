# Confirmed baseline findings

**Historical assessment: September 30, 2026.** The assessment text below has not been reconciled with subsequent collections. See the [evidence index](evidence/README.md) for current collection details.

These findings apply to the evaluated local configuration. Severity follows the roadmap categories: critical, serious, medium, and minor.

Scanner impact values are retained in raw evidence. They are not automatically the roadmap severity.

No application remediation was performed. No screen-reader result is implied by accessibility-tree inspection.

| Finding                                                                         | Severity | WCAG                | GitHub                                     |
| ------------------------------------------------------------------------------- | -------- | ------------------- | ------------------------------------------ |
| A11Y-001: Give map zoom buttons accessible names                                | serious  | 4.1.2               | https://github.com/conveyal/ui/issues/2155 |
| A11Y-002: Give documentation and help links accessible names                    | serious  | 2.4.4, 4.1.2        | https://github.com/conveyal/ui/issues/2156 |
| A11Y-003: Associate accessible labels with analysis and import controls         | serious  | 1.3.1, 3.3.2, 4.1.2 | https://github.com/conveyal/ui/issues/2157 |
| A11Y-004: Correct enabled text and button contrast in the light theme           | serious  | 1.4.3               | https://github.com/conveyal/ui/issues/2158 |
| A11Y-005: Make surrounding map forms reflow at 320 CSS pixels                   | serious  | 1.4.10              | https://github.com/conveyal/ui/issues/2159 |
| A11Y-006: Provide keyboard access to selecting route segments                   | critical | 2.1.1               | https://github.com/conveyal/ui/issues/2160 |
| A11Y-007: Expose aggregate histogram information without relying on the graphic | serious  | 1.1.1               | https://github.com/conveyal/ui/issues/2161 |
| A11Y-008: Make spatial feature properties available from the keyboard           | serious  | 2.1.1               | https://github.com/conveyal/ui/issues/2162 |
| A11Y-009: Make horizontally scrollable bundle instructions keyboard accessible  | medium   | 2.1.1               | https://github.com/conveyal/ui/issues/2163 |

## A11Y-001: Give map zoom buttons accessible names

**Severity:** serious. **Criteria:** 4.1.2.

**Reproduce:** On any map page, inspect the plus/minus buttons in the accessibility tree. Both names are empty.

**Impact:** Users cannot identify zoom actions through assistive technology.

**Proposed change:** Add Zoom in and Zoom out accessible names to the shared buttons. Preserve keyboard activation.

**Retest:** Inspect both map systems with a screen reader and verify names, roles, activation, and disabled states.

Source: `lib/components/map/ZoomButtons.tsx`.

Evidence: [projects.json](evidence/README.md#artifact-8906089a1c14303c), [region-create.json](evidence/README.md#artifact-6a66134d732fe2ae), [regional-completed.json](evidence/README.md#artifact-b7fdd1774fcc684b).

## A11Y-002: Give documentation and help links accessible names

**Severity:** serious. **Criteria:** 2.4.4, 4.1.2.

**Reproduce:** Tab to the sidebar documentation link and inline question-mark links. Inspect their accessible names; the scanned anchors have none.

**Impact:** Users cannot identify the documentation destination or the purpose of help links.

**Proposed change:** Put descriptive names on the anchors themselves, using visible or visually hidden text. Do not rely on hover tooltips.

**Retest:** Tab through each affected link and verify its purpose is announced without hovering.

Source: `lib/components/docs-link.tsx`, `lib/components/sidebar.tsx`.

Evidence: [projects.json](evidence/README.md#artifact-8906089a1c14303c), [region-create.json](evidence/README.md#artifact-6a66134d732fe2ae), [analysis.json](evidence/README.md#artifact-051f5f36a3fdbb9f), [bundle-create.json](evidence/README.md#artifact-7ec73c3a1c91b92a).

## A11Y-003: Associate accessible labels with analysis and import controls

**Severity:** serious. **Criteria:** 1.3.1, 3.3.2, 4.1.2.

**Reproduce:** Inspect the analysis grid zoom select, cutoff slider, import project selector, aggregation-area select, and histogram slider. Scanned controls lack accessible names or label associations.

**Impact:** Users hear a control type or value without knowing which parameter it changes.

**Proposed change:** Give each control a descriptive label and associate it with the actual input or slider thumb. Include units where useful.

**Retest:** Verify every affected control announces its name, role, current value, bounds, and state; operate enabled controls with the keyboard.

Source: `lib/components/analysis/select-destination-layer.tsx`, `lib/components/analysis/results-sliders.tsx`, `lib/aggregation-area/components/chart.tsx`, `lib/components/import-modifications.tsx`, `pages/regions/[regionId]/aggregationAreas.tsx`.

Evidence: [analysis.json](evidence/README.md#artifact-051f5f36a3fdbb9f), [import-modifications.json](evidence/README.md#artifact-04eac4d729eb9de6), [aggregation-areas-populated.json](evidence/README.md#artifact-ccce63fb49f3f3e2), [regional-histogram.json](evidence/README.md#artifact-af1a22ba0c65f0ad), [regional-histogram-controls.json](evidence/README.md#artifact-4cc085621a05ce70).

## A11Y-004: Correct enabled text and button contrast in the light theme

**Severity:** serious. **Criteria:** 1.4.3.

**Reproduce:** Run the local scanner in light mode. Enabled white text on green #38a169 measures 3.24:1; white text on blue #3182ce measures 4.02:1. Grey instructions #718096 on white measure 4.01:1.

**Impact:** Normal-size enabled text falls below the required 4.5:1 contrast.

**Proposed change:** Adjust shared text and button colors, then measure rendered pairs. Review each hit; exclude genuinely inactive controls rather than accepting all scanner classifications.

**Retest:** Measure enabled foreground/background pairs in light and dark modes, including hover and focus states. Apply 4.5:1 to normal text and 3:1 only where the large-text threshold applies.

Source: `lib/config/chakra.tsx`, `lib/components/analysis/select-destination-layer.tsx`, `lib/components/edit-bounds-form.tsx`.

Evidence: [home.json](evidence/README.md#artifact-e7e09bf0a88c54fb), [region-create.json](evidence/README.md#artifact-6a66134d732fe2ae), [analysis.json](evidence/README.md#artifact-051f5f36a3fdbb9f), [import-modifications.json](evidence/README.md#artifact-04eac4d729eb9de6), [project-share-menu.json](evidence/README.md#artifact-b00ff0ff93161879).

## A11Y-005: Make surrounding map forms reflow at 320 CSS pixels

**Severity:** serious. **Criteria:** 1.4.10.

**Reproduce:** Open /regions/create at a 320 CSS-pixel viewport. The document scrollWidth is 361 and body overflow is hidden. The form and bounds text extend beyond the viewport.

**Impact:** Users lose ordinary form content and controls at narrow widths or high magnification.

**Proposed change:** Allow the form panel and controls to reflow and remain reachable. Apply any two-dimensional map exception only to the map, not the surrounding form.

**Retest:** At 320 CSS pixels and actual 400% zoom, complete the region form using the keyboard without clipped non-map content or two-dimensional scrolling.

Source: `lib/layouts/map.tsx`, `lib/layouts/sidebar.tsx`.

Evidence: [region-create-320px.json](evidence/README.md#artifact-de9708cca4706f82).

## A11Y-006: Provide keyboard access to selecting route segments

**Severity:** critical. **Criteria:** 2.1.1.

**Reproduce:** Open the existing CYP_Adjust Speed0 modification. Activate Select segments with Enter. The UI says Click to start drawing shape and exposes drawing toolbar links but no keyboard vertex-placement or equivalent segment selection. Escape cancels.

**Impact:** Keyboard users cannot complete segment-limited speed adjustment through this selection flow.

**Proposed change:** Provide an equivalent keyboard-operable segment selector, such as named stop-pair choices, or keyboard geometry editing with instructions. Assess other drawing tools separately.

**Retest:** Select, add, and remove intended segments without a pointer. Verify equivalent outcomes and cancellation. Use an isolated fixture for save/reload validation.

Source: `lib/components/modification/adjust-speed.tsx`, `lib/components/modifications-map/draw-polygon.tsx`, `lib/components/modifications-map/hop-select-polygon.tsx`.

Evidence: [adjust-speed.json](evidence/README.md#artifact-ccfaf9ba4397648c), [adjust-speed-polygon-selection.json](evidence/README.md#artifact-c66d1af4edbd5307).

## A11Y-007: Expose aggregate histogram information without relying on the graphic

**Severity:** serious. **Criteria:** 1.1.1.

**Reproduce:** Open the existing CYP_BASELINE result with CYP_City Boundaries and CYP_residents weighting. The histogram SVG has axis text but no accessible title/description or bin-value equivalent. The UI exposes a percentile summary and weighted average, not the histogram distribution.

**Impact:** Nonvisual users cannot access the distribution information conveyed by the histogram.

**Proposed change:** Add a descriptive chart name and a text or table equivalent for the bins and comparison series. Preserve the existing useful summary readouts.

**Retest:** Using a screen reader, identify the chart and inspect bin ranges, counts, units, and comparison series. Verify the equivalent matches rendered data.

Source: `lib/aggregation-area/components/chart.tsx`.

Evidence: [regional-histogram.json](evidence/README.md#artifact-af1a22ba0c65f0ad), [regional-histogram-controls.json](evidence/README.md#artifact-4cc085621a05ce70).

## A11Y-008: Make spatial feature properties available from the keyboard

**Severity:** serious. **Criteria:** 2.1.1.

**Reproduce:** Open the existing CYP_City Boundaries data source. The UI instructs users to hover over a feature. The feature hook subscribes to mousemove and provides no keyboard feature-selection path.

**Impact:** Keyboard users cannot inspect the properties presented by hovering over spatial features.

**Proposed change:** Add a keyboard-operable feature list/search or equivalent feature selection, with a readable properties panel. Keep pointer hover as an optional shortcut.

**Retest:** Select the same feature with keyboard and pointer and compare the properties. Test focus movement and announcements with assistive technology.

Source: `lib/map/components/FeatureTable.tsx`, `lib/map/hooks/useHoveredFeature.ts`.

Evidence: [data-source-detail.json](evidence/README.md#artifact-fde5193d62f033bb).

## A11Y-009: Make horizontally scrollable bundle instructions keyboard accessible

**Severity:** medium. **Criteria:** 2.1.1.

**Reproduce:** Open the bundle creation page. Axe identifies the overflowing osmconvert and osmosis command containers as scrollable regions without a keyboard focus target.

**Impact:** Keyboard users cannot reliably scroll to read the full command instructions.

**Proposed change:** Allow wrapping or give the scroll region an accessible keyboard focus target and label. Preserve selectable command text.

**Retest:** Reach and read each complete command using only the keyboard at normal size and magnification.

Source: `lib/components/code.tsx`.

Evidence: [bundle-create.json](evidence/README.md#artifact-7ec73c3a1c91b92a).

## Scanner results requiring interpretation

Shared generic `div` popover triggers carry unsupported ARIA attributes. The static activity indicator also carries a prohibited `aria-label`.
Preserve these raw findings for semantic and assistive-technology review. They do not by themselves establish a user-facing failure in the sampled inactive state.

Axe reports contrast on some disabled labels and controls. Confirm whether each instance qualifies for the inactive-component exception.
The confirmed contrast issue uses enabled controls and ordinary instructions, not those uncertain instances.

Missing main landmarks, repeated generic page titles, tabs with focus outlines removed, dynamic announcements, and geocoder results need manual review.
Do not infer a criterion failure solely from a missing landmark, generic title, or source-code styling.

The browser accessibility tree exposes histogram ticks and useful aggregate summaries. It does not expose the histogram bin distribution.
This finding does not claim the entire results page is inaccessible.

## Baseline verdict

Block a conformance claim or submission-ready ACR while the confirmed task blockers and other violations remain.
This is an engineering baseline with explicit testing gaps; remediation and qualified human evaluation remain follow-up work.
