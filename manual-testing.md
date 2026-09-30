# Manual evidence and testing matrix

**Historical assessment: September 30, 2026.** The assessment text below has not been reconciled with subsequent collections. See the [evidence index](evidence/README.md) for current collection details.

## Checks performed on the local UI

Browser accessibility-tree inspection used the macOS Brave browser at localhost.
This reads exposed names, roles, states, and text. It is **not** human VoiceOver testing.

| Check                 | Observation                                                                                                                                                                                          | Limit                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Map controls          | Plus/minus zoom buttons have no accessible names on both map stacks.                                                                                                                                 | Confirmed name failure; complete AT matrix remains pending.                                        |
| Segment selection     | Enter on Select segments opens polygon mode. The tree offers Draw, Finish, Delete last point, and Cancel; no keyboard vertex-placement control exists. Tab moves to map attribution. Escape cancels. | No geometry was drawn or saved. Source review confirms the polygon callback is the selection path. |
| Regional selection    | Arrow keys and Enter select the existing CYP_BASELINE result.                                                                                                                                        | Demonstrates this selector path, not full results conformance.                                     |
| Aggregation selection | Keyboard selects existing CYP_City Boundaries and CYP_residents weights. Source shows shallow routing, existing-grid reads, and local memoized calculation.                                          | No new analysis or persisted record was created.                                                   |
| Histogram output      | AX tree exposes ticks, percentile text, and weighted average, but no chart name or bin values. Slider value exists without a name.                                                                   | Human screen-reader evaluation remains pending.                                                    |
| Data-source selection | Arrow keys and Enter open the existing CYP_City Boundaries source. Properties UI explicitly requires pointer hover; source subscribes to mousemove.                                                  | No keyboard feature-inspection alternative found in the evaluated view.                            |
| Narrow form           | At 320 CSS pixels, region form content is clipped; scrollWidth=361 and body overflow=hidden. Screenshot corroborates it.                                                                             | Actual 400% browser zoom is not yet tested.                                                        |
| Invalid bounds        | North=999 sets aria-invalid=true. The form was not submitted.                                                                                                                                        | Error description, announcement, and correction need human review.                                 |
| Theme                 | A dark-mode modification-page scan exists alongside the light-mode sample.                                                                                                                           | Not a full theme or contrast-state matrix.                                                         |

A review block initially rejected aggregation selection. Source inspection proved that it changes view parameters and reads existing results.
The read-only selection then succeeded. This did not authorize creating analyses or saving edits.

## Required environment matrix

The [Massachusetts testing obligations](https://www.mass.gov/info-details/vendor-digital-accessibility-testing-obligations) specify these environments.
All follow-up UI testing must continue to target the local instance until the user authorizes a different audit target.

| Environment                     | Assistive technology  | Required checks                                          | Baseline status                                                                            |
| ------------------------------- | --------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Windows, latest; Chrome or Edge | NVDA and JAWS, latest | Keyboard, standard/high contrast, 200% text, 400% reflow | Pending human testers/devices                                                              |
| macOS, latest; Safari or Chrome | VoiceOver             | Keyboard, standard/dark mode, 200% text, 400% reflow     | Human VoiceOver pending; Brave AX inspection and Electron scans are supplementary evidence |
| iOS, latest; Safari             | VoiceOver             | Standard/dark mode and keyboard operability/navigation   | Pending human tester/device                                                                |
| Android, latest; Chrome         | TalkBack              | Standard/dark mode and keyboard operability/navigation   | Pending human tester/device                                                                |

Electron 114 is the automated collector browser, not a substitute for the required latest browser/platform matrix.
A 320px viewport is useful reflow evidence, not proof that actual browser zoom or text resizing passed.

## Human test procedure

For each environment, record OS, browser, assistive-technology versions, tester, date, exact local URL, dataset, and result.
Complete the task without a pointer. Read each control's name, role, state, and value with assistive technology.
Check focus visibility, order, overlay trapping/restoration, errors, progress, and result announcements.
Compare available chart/map information with the visual result.
Use isolated fixtures for save/reload and destructive-path checks; never modify the observed baseline records.
Record pass/fail evidence per criterion and workflow. Keep untested cases open.

The criteria matrix identifies remaining checks, including full workflows, spacing, motion, media, contrast, and delivered-content coverage.
