# Audit scope and coverage

Evaluation date: September 30, 2026.
Target: http://localhost:3000. Authentication: disabled, local access group.
Source checkout commit: `aa60ece30cea92775f42a0e4b35d80f04be7c2bd`.
Observed Next.js build ID: `6kwCYVezKwd_VVcUldOAW`.
The server runs `next start` from this checkout. The commit and build ID are separate provenance fields; build-to-commit identity is not independently attested.

The baseline uses WCAG 2.1 A and AA. Additional WCAG 2.2 A and AA criteria are tracked separately.
The proposed customer release requires follow-up verification. No production UI or authentication service was tested.

## Sample and method

The sample covers common navigation and forms, both map implementations, scenario controls, existing results, and generated HTML report output.
It combines route scans, expanded interactive states, a validation state, narrow layout, and a dark-mode sample.
Existing named Cypress fixtures provide realistic local records without new records or saved changes.
The choice emphasizes maps, charts, shared components, and routes with different interaction patterns.
It is not a statistical sample or an exhaustive complete-process evaluation.

The raw evidence identifies each actual URL and state. The initial aggregation-area URL lacked its required `dataGroupId` and showed loading content.
Treat `aggregation-areas.json` as an incomplete/loading snapshot, not coverage of the populated page.
Use `aggregation-areas-populated.json` for the populated view.

## Included baseline surfaces

- Region selection, region creation/settings, project selection/creation/settings, bundles, spatial datasets, data sources, and activity.
- Modification lists, scenario tab, existing speed modification, polygon selection, and modification imports.
- Single-point analysis configuration, regional empty state, an existing completed regional result, aggregation controls, and histogram.
- Local status/session utility screens and existing unmodified and modified-scenario HTML summary reports.
- Shared navigation, zoom controls, documentation links, export modal, and result download menu where captured.

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
