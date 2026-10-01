# Draft Digital Accessibility Roadmap

Collection `2026-10-01.3`, evaluated October 1, 2026. Reviewed by Trevor Gerhardt (trevor.gerhardt@ebp-us.com) at 2026-10-01T09:41:25Z.

**Internal preparation; not a contractual commitment.** Owners and target dates require EBP, Inc. approval.
All findings remain open. No implemented technique or successful remediation date exists.

| Finding                                                | Criterion           | Severity | Status | Owner              | Target date      | Remediated | Implemented technique |
| ------------------------------------------------------ | ------------------- | -------- | ------ | ------------------ | ---------------- | ---------- | --------------------- |
| [A11Y-001](https://github.com/conveyal/ui/issues/2155) | 4.1.2               | serious  | Open   | Pending assignment | Pending approval | —          | —                     |
| [A11Y-002](https://github.com/conveyal/ui/issues/2156) | 2.4.4, 4.1.2        | serious  | Open   | Pending assignment | Pending approval | —          | —                     |
| [A11Y-003](https://github.com/conveyal/ui/issues/2157) | 1.3.1, 3.3.2, 4.1.2 | serious  | Open   | Pending assignment | Pending approval | —          | —                     |
| [A11Y-004](https://github.com/conveyal/ui/issues/2158) | 1.4.3               | serious  | Open   | Pending assignment | Pending approval | —          | —                     |
| [A11Y-005](https://github.com/conveyal/ui/issues/2159) | 1.4.10              | serious  | Open   | Pending assignment | Pending approval | —          | —                     |
| [A11Y-006](https://github.com/conveyal/ui/issues/2160) | 2.1.1               | critical | Open   | Pending assignment | Pending approval | —          | —                     |
| [A11Y-007](https://github.com/conveyal/ui/issues/2161) | 1.1.1               | serious  | Open   | Pending assignment | Pending approval | —          | —                     |
| [A11Y-008](https://github.com/conveyal/ui/issues/2162) | 2.1.1               | serious  | Open   | Pending assignment | Pending approval | —          | —                     |
| [A11Y-009](https://github.com/conveyal/ui/issues/2163) | 2.1.1               | medium   | Open   | Pending assignment | Pending approval | —          | —                     |

## Locations, components, and proposed techniques

### A11Y-001

**Component:** Give map zoom buttons accessible names

**Locations:** projects, region-create, regional-completed. Exact URLs and DOM selectors appear in the linked [finding](findings.md#a11y-001-give-map-zoom-buttons-accessible-names).

**Violation:** On any map page, inspect the plus/minus buttons in the accessibility tree. Both names are empty.

**Proposed technique:** Add Zoom in and Zoom out accessible names to the shared buttons. Preserve keyboard activation.

**Validation:** Inspect both map systems with a screen reader and verify names, roles, activation, and disabled states.

### A11Y-002

**Component:** Give documentation and help links accessible names

**Locations:** projects, region-create, analysis, bundle-create. Exact URLs and DOM selectors appear in the linked [finding](findings.md#a11y-002-give-documentation-and-help-links-accessible-names).

**Violation:** Tab to the sidebar documentation link and inline question-mark links. Inspect their accessible names; the scanned anchors have none.

**Proposed technique:** Put descriptive names on the anchors themselves, using visible or visually hidden text. Do not rely on hover tooltips.

**Validation:** Tab through each affected link and verify its purpose is announced without hovering.

### A11Y-003

**Component:** Associate accessible labels with analysis and import controls

**Locations:** analysis, import-modifications, aggregation-areas-populated, regional-histogram, regional-histogram-controls. Exact URLs and DOM selectors appear in the linked [finding](findings.md#a11y-003-associate-accessible-labels-with-analysis-and-import-controls).

**Violation:** Inspect the analysis grid zoom select, cutoff slider, import project selector, aggregation-area select, and histogram slider. Scanned controls lack accessible names or label associations.

**Proposed technique:** Give each control a descriptive label and associate it with the actual input or slider thumb. Include units where useful.

**Validation:** Verify every affected control announces its name, role, current value, bounds, and state; operate enabled controls with the keyboard.

### A11Y-004

**Component:** Correct enabled text and button contrast in the light theme

**Locations:** home, region-create, analysis, import-modifications, project-share-menu. Exact URLs and DOM selectors appear in the linked [finding](findings.md#a11y-004-correct-enabled-text-and-button-contrast-in-the-light-theme).

**Violation:** Run the local scanner in light mode. Enabled white text on green #38a169 measures 3.24:1; white text on blue #3182ce measures 4.02:1. Grey instructions #718096 on white measure 4.01:1.

**Proposed technique:** Adjust shared text and button colors, then measure rendered pairs. Review each hit; exclude genuinely inactive controls rather than accepting all scanner classifications.

**Validation:** Measure enabled foreground/background pairs in light and dark modes, including hover and focus states. Apply 4.5:1 to normal text and 3:1 only where the large-text threshold applies.

### A11Y-005

**Component:** Make surrounding map forms reflow at 320 CSS pixels

**Locations:** region-create-320px. Exact URLs and DOM selectors appear in the linked [finding](findings.md#a11y-005-make-surrounding-map-forms-reflow-at-320-css-pixels).

**Violation:** Open /regions/create at a 320 CSS-pixel viewport. The document scrollWidth is 361 and body overflow is hidden. The form and bounds text extend beyond the viewport.

**Proposed technique:** Allow the form panel and controls to reflow and remain reachable. Apply any two-dimensional map exception only to the map, not the surrounding form.

**Validation:** At 320 CSS pixels and actual 400% zoom, complete the region form using the keyboard without clipped non-map content or two-dimensional scrolling.

### A11Y-006

**Component:** Provide keyboard access to selecting route segments

**Locations:** adjust-speed, adjust-speed-polygon-selection. Exact URLs and DOM selectors appear in the linked [finding](findings.md#a11y-006-provide-keyboard-access-to-selecting-route-segments).

**Violation:** Open the run-owned speed modification. Activate Select segments with Enter. The UI says Click to start drawing shape and exposes drawing toolbar links but no keyboard vertex-placement or equivalent segment selection. Escape cancels.

**Proposed technique:** Provide an equivalent keyboard-operable segment selector, such as named stop-pair choices, or keyboard geometry editing with instructions. Assess other drawing tools separately.

**Validation:** Select, add, and remove intended segments without a pointer. Verify equivalent outcomes and cancellation. Use an isolated fixture for save/reload validation.

### A11Y-007

**Component:** Expose aggregate histogram information without relying on the graphic

**Locations:** regional-histogram, regional-histogram-controls. Exact URLs and DOM selectors appear in the linked [finding](findings.md#a11y-007-expose-aggregate-histogram-information-without-relying-on-the-graphic).

**Violation:** Open the completed run-owned regional result with its boundary aggregation area and population weighting. The histogram SVG has axis text but no accessible title/description or bin-value equivalent. The UI exposes a percentile summary and weighted average, not the histogram distribution.

**Proposed technique:** Add a descriptive chart name and a text or table equivalent for the bins and comparison series. Preserve the existing useful summary readouts.

**Validation:** Using a screen reader, identify the chart and inspect bin ranges, counts, units, and comparison series. Verify the equivalent matches rendered data.

### A11Y-008

**Component:** Make spatial feature properties available from the keyboard

**Locations:** data-source-detail. Exact URLs and DOM selectors appear in the linked [finding](findings.md#a11y-008-make-spatial-feature-properties-available-from-the-keyboard).

**Violation:** Open the run-owned boundary data source. The UI instructs users to hover over a feature. The feature hook subscribes to mousemove and provides no keyboard feature-selection path.

**Proposed technique:** Add a keyboard-operable feature list/search or equivalent feature selection, with a readable properties panel. Keep pointer hover as an optional shortcut.

**Validation:** Select the same feature with keyboard and pointer and compare the properties. Test focus movement and announcements with assistive technology.

### A11Y-009

**Component:** Make horizontally scrollable bundle instructions keyboard accessible

**Locations:** bundle-create. Exact URLs and DOM selectors appear in the linked [finding](findings.md#a11y-009-make-horizontally-scrollable-bundle-instructions-keyboard-accessible).

**Violation:** Open the bundle creation page. Axe identifies the overflowing osmconvert and osmosis command containers as scrollable regions without a keyboard focus target.

**Proposed technique:** Allow wrapping or give the scroll region an accessible keyboard focus target and label. Preserve selectable command text.

**Validation:** Reach and read each complete command using only the keyboard at normal size and magnification.

## Sequence and maintenance

1. Resolve task blockers: polygon segment selection, feature inspection, and clipped forms.
2. Correct shared names, labels, contrast, histogram equivalents, and keyboard scrolling.
3. Retest the original failures and complete affected workflows with assistive technology.
4. Complete remaining manual tests, authentication, delivered materials, and proposed-release verification.

For each fixed violation, record the implemented technique, retest method, evidence, release, and successful remediation date.
A proposed technique is not evidence of a fix. Do not close an issue from an automated scan alone when its acceptance requires manual testing.
Add newly discovered violations to this roadmap. Approve dates before supplying it to the client.
