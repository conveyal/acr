# First reviewed interim audit verification

Collection `2026-10-01.3` was evaluated October 1, 2026 at `http://localhost:3000` in unauthenticated local mode. Trevor Gerhardt (trevor.gerhardt@ebp-us.com) reviewed the material at 2026-10-01T09:41:25Z.

## Collection evidence

The collected material records 34 passing Playwright tests, all 36 required scan states, 15 keyboard/structure observations (eight pass, seven fail, none blocked), completed regional results for 1,064 origins, and successful cleanup of all 12 recorded run-owned resources. Accessibility findings do not fail collection. Bounds validation and legend disclosure remain uncertain observations requiring targeted retesting. See [scope](scope.md), [testing evidence](manual-testing.md), and the [evidence index](evidence/README.md) for provenance and limitations.

## Reporting and workflow verification

Verified with Node 24.21.0 and pnpm 12.6.0:

- Correctness lint, formatting, strict TypeScript checking, all 61 unit/controlled-response tests, schema/catalog validation, report generation, and generated-report freshness pass.
- Nine criterion conclusions are approved within the interim scope: eight Partially Supports and the template-directed Supports for Parsing. The other 41 criteria remain unknown and unapproved. CC0-1.0 exports correctly, vendor approval remains withheld, and qualified-evaluator credentials are not asserted.
- Completed-conformance generation remains blocked. Synthetic tests independently verify the stricter qualified-review, vendor-approval, contact, publication-date, license, and all-criterion gates.
- Portable-bundle tests include byte-identical repository LICENSE and PROVENANCE.md, verify compressed inventories, and check report/companion/evidence links after extraction. Compact-checkout reports validate and link through the tracked evidence index without raw evidence.
- Existing collection and publication tests cover cleanup ownership/recovery, isolated collection, UTC counters, repeatable preparation, interrupted uploads, missing assessment-review metadata and unmerged-PR rejection, changed merged sources, lost publication responses, and checksum verification. Remote operations use controlled responses. Companion rename coverage verifies older bundle compatibility, removal of superseded filenames from refreshed copies, and staging of tracked deletions.
- All 78 raw evidence artifact hashes match the unchanged manifest. The retained 62-file and 93-file archives and both pending bundles verify against their recorded inventories/checksums. All 84 protected files remain byte-identical. Checked 527 relative links across the checkout, a temporarily refreshed real-evidence bundle, and its compact form without raw evidence. Raw evidence, its manifest/checksums, retained local archives, and the pending evidence bundle are unchanged. Maintained reports contain no previous-assessment narrative; real GitHub issue links remain intact.

The generated HTML includes document language/title, a main landmark, heading hierarchy, captioned tables, row/column headers, named keyboard-focusable scroll regions, and visible focus styles. No human screen-reader evaluation of the generated reports is asserted. Schema validity and automated checks do not establish product conformance.

This finalization ran no product scans, preparation, commits, pushes, merges, or publication. The reviewed interim assessment was subsequently published October 1, 2026. The original Release remains unchanged; repository reports now record that publication date.

## Static hosting verification

The dependency-free site builder passed discovery, commit-pinned document/evidence links, local HTML navigation, report asset copying, missing-link and missing-anchor rejection, production review gating, and preservation of previous output after a rejected build. It also ran in an isolated directory without installed packages. Collection coverage verifies that a previously published date is cleared without changing the repository assessment. Published and pending interim rendering are covered separately.

All 65 tests, correctness lint, formatting, type checking, validation, report generation/freshness, and production site generation passed. Existing compact-checkout and restored-evidence link checks remain covered. Complete-conformance generation remains blocked by unresolved criteria. Local browser checks verified Tab/Enter navigation, visible focus, a 320px homepage without horizontal overflow, and a report link reaching the commit-pinned GitHub evidence index.

Evidence files, manifests, local retained bundles, ratings, review metadata, assessment dates, vendor/qualification flags, tags, and published Release asset metadata matched the pre-change snapshot. Vercel deployment and its assigned URL remain pending the implementation commit/push; staged verification and promotion follow that handoff.
