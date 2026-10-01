# Testing evidence and remaining coverage — October 1, 2026

Collection `2026-10-01.3` used actual keyboard input for interactive checks and retained before/after accessibility snapshots. The chart check inspects rendered semantics; it does not simulate a screen reader. Eight observations passed and seven failed; none were blocked. A passing behavior check does not imply complete name, role, value, focus, or criterion conformance. No human assistive-technology evaluation was performed. Reviewed by Trevor Gerhardt (trevor.gerhardt@ebp-us.com) at 2026-10-01T09:41:25Z.

| Observation                  | Raw result | Evidence                                                                                   |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------------------ |
| analysis-cutoff-keyboard     | pass       | [keyboard/analysis-cutoff-keyboard.json](evidence/README.md#artifact-783c2befea03b31d)     |
| analysis-percentile-keyboard | pass       | [keyboard/analysis-percentile-keyboard.json](evidence/README.md#artifact-c32c4bd9a1143321) |
| bounds-input-alternative     | pass       | [keyboard/bounds-input-alternative.json](evidence/README.md#artifact-7bdf2b62afe0e876)     |
| chart-text-alternative       | fail       | [keyboard/chart-text-alternative.json](evidence/README.md#artifact-b24480d6ec4719fe)       |
| download-menu-keyboard       | pass       | [keyboard/download-menu-keyboard.json](evidence/README.md#artifact-bc48954912f2dbdb)       |
| feature-properties-keyboard  | fail       | [keyboard/feature-properties-keyboard.json](evidence/README.md#artifact-c01a29fea75b563e)  |
| form-error-association       | fail       | [keyboard/form-error-association.json](evidence/README.md#artifact-dd7405478db91df2)       |
| histogram-slider-keyboard    | pass       | [keyboard/histogram-slider-keyboard.json](evidence/README.md#artifact-d3f3b8a8fb7e42a9)    |
| legend-keyboard              | fail       | [keyboard/legend-keyboard.json](evidence/README.md#artifact-786684ee1d53a00d)              |
| map-keyboard-pan-zoom        | pass       | [keyboard/map-keyboard-pan-zoom.json](evidence/README.md#artifact-be650b9add79b78c)        |
| map-zoom-buttons             | fail       | [keyboard/map-zoom-buttons.json](evidence/README.md#artifact-e1066a41200e2abd)             |
| polygon-keyboard             | fail       | [keyboard/polygon-keyboard.json](evidence/README.md#artifact-254de0b8d625ae54)             |
| reflow-320px                 | fail       | [keyboard/reflow-320px.json](evidence/README.md#artifact-b316581e162cf7ee)                 |
| share-dialog-focus           | pass       | [keyboard/share-dialog-focus.json](evidence/README.md#artifact-01e1965f83dfae50)           |
| tabs-keyboard                | pass       | [keyboard/tabs-keyboard.json](evidence/README.md#artifact-f22a807f965df87f)                |

## Interpretation and required follow-up

- Bounds input editing passed, but the separate invalid-value observation reverted to the original North value after blur and did not retain an invalid state. Retest invalid values and error association deliberately before drawing a conformance conclusion.
- Legend disclosure has a failed raw flag, while its after snapshot shows changed disclosure content. Do not classify this as a confirmed failure without retesting visibility and keyboard activation after the transition completes.
- Keyboard zoom activation worked but lacked an accessible name. Polygon cancellation worked, while vertex creation and focus return did not. Histogram/analysis sliders changed value but still have naming findings.
- Map pan/zoom and focus exit, scenario tabs, share-dialog focus/trapping/return, and the download-menu focus change passed the sampled checks. Other map stacks and complete workflows remain outside those pass observations.
- Human VoiceOver, NVDA, JAWS, TalkBack, browser zoom/text resizing, high contrast, and full process testing remain pending. The environment matrix below identifies outstanding coverage; Chromium automation does not fulfill it.

## Required environment matrix

The [Massachusetts testing obligations](https://www.mass.gov/info-details/vendor-digital-accessibility-testing-obligations) specify these environments.
All follow-up UI testing must continue to target the local instance until the user authorizes a different audit target.

| Environment                     | Assistive technology  | Required checks                                          | Coverage status                                                        |
| ------------------------------- | --------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| Windows, latest; Chrome or Edge | NVDA and JAWS, latest | Keyboard, standard/high contrast, 200% text, 400% reflow | Pending human testers/devices                                          |
| macOS, latest; Safari or Chrome | VoiceOver             | Keyboard, standard/dark mode, 200% text, 400% reflow     | Human VoiceOver pending; Chromium automation is supplementary evidence |
| iOS, latest; Safari             | VoiceOver             | Standard/dark mode and keyboard operability/navigation   | Pending human tester/device                                            |
| Android, latest; Chrome         | TalkBack              | Standard/dark mode and keyboard operability/navigation   | Pending human tester/device                                            |

Chromium 153.0.8010.12 is the automated collector browser, not a substitute for the required latest browser/platform matrix.
A 320px viewport is useful reflow evidence, not proof that actual browser zoom or text resizing passed.

## Human test procedure

For each environment, record OS, browser, assistive-technology versions, tester, date, exact local URL, dataset, and result.
Complete the task without a pointer. Read each control's name, role, state, and value with assistive technology.
Check focus visibility, order, overlay trapping/restoration, errors, progress, and result announcements.
Compare available chart/map information with the visual result.
Use isolated fixtures for save/reload and destructive-path checks; never modify unrelated application records.
Record pass/fail evidence per criterion and workflow. Keep untested cases open.

The criteria matrix identifies remaining checks, including full workflows, spacing, motion, media, contrast, and delivered-content coverage.
