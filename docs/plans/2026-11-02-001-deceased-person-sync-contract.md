---
title: Include deceased records in the normal Rock full-sync contract
date: 2026-11-02
status: implemented-tested-reviewed-awaiting-github-release
roadmap: RM-007
---

# Include deceased records in the normal full sync

## Confirmed problem and boundary

The default People collection excludes deceased people. GroupMembers also omits their memberships unless `IncludeDeceased=true`. If an existing local active person later becomes deceased in Rock, the upsert-only default full sync leaves that old eligibility intact. Household participation correctly withholds affected rates, but repeat syncs cannot clear the source staleness. See `docs/research/2026-11-02-household-membership-review-investigation.md`.

Rock remains authoritative. This correction consumes actual source inactive/deceased values through GET requests; it does not infer archive/deletion or manually repair production. Membership 79767 remains unresolved because person and membership identity cannot be read. Keep its current review guard.

## Scoped implementation

1. Change full-sync People query to `/api/People?includeDeceased=true&$orderby=Id asc` and GroupMembers query to `/api/GroupMembers?IncludeDeceased=true&$orderby=Id asc`. Use existing typed paging, cancellation, caps and endpoint allowlist. Preserve source fields and primary-alias mapping. Do not broaden arbitrary endpoints or enable archived collection semantics without verification.
2. Add meaningful reader contract tests that require both options and normal pagination. Add a regression at full-sync persistence/report service seams: initial active adult, source later inactive/deceased and omitted by default collection, deceased-inclusive full run updates the retained person, and report excludes that adult without rewriting membership archive state or deleting financial history. The unverified 404 case must remain unresolved.
3. Check cases where new deceased people have aliases, no current family, or historical references. Existing MISSING_PERSON warnings must not silently turn into guessed identities. Verify financial attribution and merge logic still use verified aliases. Do not infer current household mapping from old membership alone.
4. Review standards/spec, run format:check, lint, typecheck, relevant integration tests and full suite. Record failure and rollback behavior in sync architecture documentation.

## Failure modes

- API ignores or rejects option: contract test and actual instance controlled read must distinguish this; fail visibly rather than assuming completeness.
- Additional deceased records increase source/persistence volume: preserve paging limits and monitor full job duration/memory.
- Deceased-inclusive GroupMembers can expose rows whose people/parents are unavailable: retain existing safe missing-reference checks and redacted issues.
- Reflecting source deceased/inactive fields can change saved-view and future workflow eligibility: inspect affected audience predicates and pending/frozen audience behavior before release. No communication send is authorized.
- 404, permission errors and missing GUIDs never become an automatic deletion, archive flag, merge or replacement identity. Unresolved cases continue withholding affected report rates.

## GitHub release and verification

Production changes require reviewed/merged GitHub code and exact-main CI success, then successful connected web/worker deployments. Drain old sync work before rollout; run a normal full sync after both services update. Verify complete job completion including derived refreshes, correct scoped run source, refreshed deceased/inactive fields, no stale active interpretation for Case A, retained financial history, report counts/drilldowns and remaining Case B warning. Recheck UniChurch and standard active group memberships against source. No repair SQL or direct local Railway deploy.

Rollback uses GitHub to revert reader options, but does not set source-confirmed deceased/inactive data back to active. Retained source values are correct and the report must keep its existing freshness guard. Source deletion/retention disposition and Christian marker authority remain separate decisions.

## Implementation verification

Tataihono explicitly requested the fix and authorized asking Rowan about Commitment steps. The full reader now requests both verified deceased-inclusive options. Reader paging/GET tests and a real PostgreSQL reader → full-sync persistence → household-report regression failed before the fix and pass after it. The regression covers an initially active adult later becoming source inactive/deceased, stage recomputation from the surviving adult, unchanged membership archive/status values, retained historical giving and continued withholding for a separate unavailable identity. Shared test reference rows are restored to their pre-test state.

The known production case is not manually repaired by this code change. GitHub release and the following normal full sync remain required. Existing household eligibility filters already require non-deceased active adults; correcting the mirror can therefore change future audience resolution. Existing automation runs freeze recipients; this patch does not send any communication or change the approval/freeze contract.

Validation: all 479 tests across 81 files passed, including the isolated PostgreSQL regression. Formatting, lint and typecheck run in the repository-required order; compiled-worker checks are also part of the verification. Local Node is 24.22.1; GitHub CI validates the pinned Node 22.23.4 environment before merge readiness.

A bounded live GET-only impact query returned 13 deceased membership rows using `IncludeDeceased=true` and `Person/IsDeceased eq true`; none belong to the currently returned type-25/46 groups, and none satisfy the current active Connect Group predicate. Preserve the approved group/member-only active-membership definition (requirements R17); household reporting separately excludes inactive/deceased adults (R5). This observation does not replace post-sync source/count and audience verification.

Independent Standards and Spec review of commit `8d3e0ac` against merged main `2ad467c` found no actionable findings on either axis. The later documentation addition records only the bounded live Connect Group impact check; runtime and tests are unchanged.
