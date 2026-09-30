# OpenACR assets and VPAT alignment

Upstream: [GSA/openacr](https://github.com/GSA/openacr), pinned commit
`86f890a07a2a193d2a9404fb57d2cc2d62a60a4f`.

Unmodified upstream files:

- `schemas/openacr-0.1.0.json`: OpenACR draft-07 JSON schema, format version 0.1.0.
- `schemas/openacr-catalog-0.1.0.json`: catalog schema, format version 0.1.0.
- `catalogs/upstream-wcag-2.1.yaml`: upstream `catalog/2.4-edition-wcag-2.1-en.yaml`.

The source URLs use the pinned commit, for example:
[OpenACR schema](https://github.com/GSA/openacr/blob/86f890a07a2a193d2a9404fb57d2cc2d62a60a4f/schema/openacr-0.1.0.json).
GSA describes its original project material as public domain; third-party libraries have their own licenses. Report validation uses pinned Zod (MIT) and YAML (ISC); GitHub transport uses pinned Octokit (MIT). Their license notices are in the installed dependencies. No upstream CLI, USWDS, or third-party styles are redistributed in generated HTML.

## Local catalog adjustments

`catalogs/wcag-2.1-vpat-2.5rev.yaml` is a Conveyal-maintained derivative, **not an ITI or GSA published VPAT 2.5Rev catalog**.

The alignment review used the official [VPAT 2.5Rev WCAG template, April 2025](https://www.itic.org/policy/accessibility/vpat), downloaded for the initial baseline. Its instruction text and criterion rows were read directly from the DOCX XML.

- All 50 WCAG 2.1 A/AA IDs are present in that template and the upstream catalog: 30 A and 20 AA. No change to WCAG 2.1 IDs, level membership, or rating definitions was needed.
- The official instructions permit removing WCAG 2.2-only rows when reporting on WCAG 2.1. This package exports only WCAG 2.1 A/AA; six WCAG 2.2 A/AA additions remain in the separate gap assessment.
- The supplied four A/AA conformance terms match the current instructions. Not Evaluated remains restricted to AAA and is rejected for A/AA by our checks.
- Added an explicit description to 4.1.1 documenting the current instruction to always report Supports for WCAG 2.0/2.1 under the September 2023 errata. It is removed in WCAG 2.2. Our assessment carries that explanation and final validation enforces the rating.
- Updated catalog title and description to identify this maintained subset, provenance and limits. AAA definitions are retained for compatibility; the report disables that chapter.

The local HTML template is original reporting code, not a modified official ITI report form. It includes product/version, dates, contact information, scope notes, evaluation methods, applicable standard/level, term definitions, criterion ratings, remarks and evidence links. Drafts deliberately leave unpublished information blank or marked pending.

Schema and catalog validation do not certify ITI template compliance or product accessibility. Before submission, qualified personnel must review the completed conclusions and transfer the approved product metadata and all 50 criterion ratings/remarks into the current official VPAT WCAG template. Preserve the template's instructions, selected-standard declarations, service-mark notices, and required structure. Check the resulting document's accessibility. Do not submit our internal Markdown/HTML draft as that completed official document.

## Redistribution

The OpenACR content does not inherit the GSA source-code license. The author must approve the report's distribution license before final export. Our renderer never assigns OpenACR's usual default CC-BY-4.0 license silently. Until Conveyal approves public release and a license, these are internal drafts; the package does not publish or send them.

## Collector fixtures

`fixtures/` contains 30 assets copied from `conveyal/ui`'s `cypress/fixtures`. The original copied SHA-256 values are retained in `audit/fixture-manifest.json` under `sourceFiles`; `files` records the maintained ACR assets checked before provisioning. The three TypeScript references (`analysis-settings.ts`, `regions/scratch.ts`, and `regions/scratch-results.ts`) retain the original UI imports and values, with ACR file headings, declaration documentation, and formatting. They are reference material, excluded from the collector runtime and type checking; standalone runtime settings live in the manifest. All other fixture assets remain unchanged.

Historical collection manifests preserve their original fixture hashes. Updating the maintained manifest does not rewrite archived evidence or its provenance. The completed history migration tooling was retired after verifying the two retained local archives against their complete 62-file and 93-file inventories; the archives remain under ignored `.cache/audit/legacy/`.
