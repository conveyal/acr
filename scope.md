# Audit scope and coverage

First audit: October 1, 2026 (`2026-10-01.3`). Reviewed by Trevor Gerhardt (trevor.gerhardt@ebp-us.com) at 2026-10-01T09:41:25Z.
Target: http://localhost:3000. Authentication: disabled, local access group.
Source checkout commit: `aa60ece30cea92775f42a0e4b35d80f04be7c2bd`.
Observed Next.js build ID: `6kwCYVezKwd_VVcUldOAW`.
The server runs `next start` from this checkout. The commit and build ID are separate provenance fields; build-to-commit identity is not independently attested.

The assessment uses WCAG 2.1 A and AA. Additional WCAG 2.2 A and AA criteria are tracked separately.
The proposed customer release requires follow-up verification. No production UI or authentication service was tested.

## Sample and method

The sample covers common navigation and forms, both map implementations, scenario controls, existing results, and generated HTML report output.
It combines route scans, expanded interactive states, a validation state, narrow layout, and a dark-mode sample.
Playwright Test 1.63.0 and axe-core 4.13.0 ran in Chromium 153.0.8010.12 using all 30 maintained fixture assets. The collector provisioned a fresh network bundle, population grid, project/scenarios, boundary datasource and aggregation area, speed modification, and regional analysis. All 12 recorded run-owned resources were removed after collection; existing records were not modified.

The local R5 worker completed 1,064 regional origin tasks. Target configuration requested `v7.6`; `/api/workers` reported `v7.5.1-11-g6f35542.dirty` on macOS 27.0/aarch64 with JVM 21.0.12.1. This is a locally modified worker, not an attested stock v7.6 deployment.

The choice emphasizes maps, charts, shared components, and routes with different interaction patterns.
It is not a statistical sample or an exhaustive complete-process evaluation.

The raw evidence identifies each actual URL and state. The initial aggregation-area URL lacked its required `dataGroupId` and showed loading content.
Treat `aggregation-areas.json` as an incomplete/loading snapshot, not coverage of the populated page.
Use `aggregation-areas-populated.json` for the populated view.

## Included surfaces

- Region selection, region creation/settings, project selection/creation/settings, bundles, spatial datasets, data sources, and activity.
- Modification lists, scenario tab, existing speed modification, polygon selection, and modification imports.
- Single-point analysis configuration, regional empty state, a newly computed completed regional result, aggregation controls, and histogram.
- Local status/session utility screens and newly provisioned unmodified and modified-scenario HTML summary reports.
- Shared navigation, zoom controls, documentation links, export modal, and result download menu where captured.

## Collection completion

All 34 Playwright tests passed and produced all 36 required scan states plus 15 keyboard/structure observations: eight pass, seven fail, no blocked observations. There were 159 state-rule violation entries and 306 node occurrences across nine distinct axe rules. These are repeated rule/node observations, not unique finding counts or conformance ratings. Full passes, incomplete results, inapplicable rules, and check diagnostics remain in the evidence bundle.

Fixture processing and regional completion prove collection readiness, not accessibility of every upload or computation workflow. Review retained uncertainty about bounds validation and legend disclosure; targeted retesting remains necessary; see findings and manual testing.

## Boundaries and remaining coverage

- Authentication, session expiry, production authorization, and customer administration unavailable to the local role: follow-up.
- Externally hosted documentation and training: not visited or audited. Local help links themselves were evaluated.
- Other report variants, downloaded GeoJSON/JSON/CSV/raster outputs, PDF printing, and training media: not fully evaluated.
- Complete create/upload/edit/save/export processes, server errors, active-task announcements, and destructive confirmation flows: remaining manual coverage.
- Other modification types, geocoder result keyboard selection, result comparisons, origin dragging, and stop placement: remaining workflow coverage.
- Windows, mobile assistive technologies, human VoiceOver, actual browser zoom, text-spacing overrides, and high-contrast testing: pending.

Missing coverage is an evidence gap. It is neither a pass nor a confirmed product violation.

## Authoritative references

- [Massachusetts contract language](https://www.mass.gov/info-details/vendor-digital-accessibility-contract-language)
- [Massachusetts testing obligations](https://www.mass.gov/info-details/vendor-digital-accessibility-testing-obligations)
- [Official questionnaire](https://www.mass.gov/doc/vendor-digital-accessibility-questionnaire/download)
- [ITI VPAT® templates](https://www.itic.org/policy/accessibility/vpat)
- [W3C evaluation methodology](https://www.w3.org/TR/wcag-em-2/)

The contract covers delivered interfaces, outputs, documentation, testing, remediation, and written validation.
A roadmap does not replace the requirement to remediate identified violations before delivery.
