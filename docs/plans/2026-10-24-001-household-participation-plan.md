---
title: Household participation implementation plan
date: 2026-10-24
status: feedback-incorporated-first-slice-locally-verified
roadmap: RM-007
---

# Household participation implementation plan

Deliver household participation reporting and consistent UniChurch Connect Group coverage, verify the October report, and establish attendance feasibility. Product definitions are in the [requirements](../brainstorms/2026-10-24-household-participation-requirements.md). Rowan's 31 October reply is reconciled in [the feedback record](../research/2026-10-31-rowan-plan-feedback.md). Begin with the bounded UniChurch correction; continue household reporting, report verification and attendance discovery as source contracts become available. Deployment follows GitHub review, main CI and the connected Railway flow.

## Workflow and existing boundaries

The requirements interview is the Compound Engineering brainstorm phase; this document is the plan phase. The matching `ce:*` skill files were not available in this session after local discovery, so the repo's documented workflow and artifact locations are used directly. Execution should use the available `ce:work` workflow when resumed, followed by `ce:review` or a standard code review before a PR.

Read `docs/roadmap.md`, the requirements above, `docs/research/rock-integration.md`, `docs/architecture/staff-read-only-mcp.md`, and `docs/solutions/best-practices/rock-sync-local-mirror-and-test-database-boundaries-2026-04-17.md` before implementation. Preserve Rock authority, active local app authorization, bounded MCP reads and GitHub-managed deployment.

## Phase 1 Resolve feedback and verify source contracts

1. Rowan's reply is incorporated. Preserve the original Q1-Q15 interview and use the feedback record for the current decisions. Resolve only remaining discovery-dependent definitions; do not reopen accepted scope or status ordering.
2. Verify current Rock group types 25 and 46, their roles, activity/archive flags, and whether any other group types are explicitly in scope. Preserve source taxonomy; do not infer membership from campus.
3. Identify the explicit Christian-status field on this church's Rock instance. Use bounded read-only discovery with typed validation; record field identifier, allowed values, null/unknown semantics, API permissions, coverage and source update behaviour without raw person values. Inspect both Christian/non-Christian fields if present. Cross-check the verified Exploring connection status as a non-Christian signal; record mismatches without overwriting source data. Tataihono confirmed explicit-field precedence: missing explicit values stay Unknown; Exploring is a mismatch cross-check and never a fallback classification. Discover source IDs/value meanings before binding these rules.
4. Verify Adult role and active person status using source IDs and reference tables. Review family membership multiplicity and GivingGroupId versus PrimaryFamilyId exceptions. Settle how every exceptional mapping appears in demographic rows without counting gifts twice or assigning misleading participation.
5. Verify enabled platform funds, actual gift/refund/reversal semantics and date boundaries. Existing `lib/giving/metrics.ts` uses UTC month helpers; inspect how `GivingFact.effectiveMonth` is generated before changing conventions. Propose Pacific/Auckland business-month interpretation where source timestamps support it; record any reconciliation impact before changing existing reports.
6. In parallel, inspect actual Sunday and group attendance capabilities, permissions and coverage. Add endpoints to any read allowlist only after verification; recording no capability is a valid feasibility result.

Completion: record verified contracts and all remaining limitations in `docs/research/`; Rowan's material product decisions are resolved. Christian classification implementation is blocked on a verified source contract; attendance integration remains separately scoped.

## Phase 2 Correct Connect Group coverage

Affected code: `lib/giving/models.ts`, `lib/sync/run-sync.ts`, `lib/sync/status.ts`, relevant fixture handling, `lib/rock/client.ts` only if discovery demonstrates a fetch gap, and existing group/profile/list consumers.

1. Replace the singular reporting assumption with one explicit accepted group-type set, initially verified types 25 and 46. Keep family type 10 separate.
2. Use one membership classifier for group type, group activity/archive state and member activity/archive state. Resolve member type through its parent group where source member fields are absent; detect contradictory source type values.
3. Update full and supported person-slice normalization, derived flags and sync-status counts. The full Rock client already fetches all groups; normalization currently discards types other than 25. Preserve parent relations only when referenced local groups exist.
4. Update affected profiles, filters and MCP explanations through shared services. Review saved segments and pending communication runs for audience changes; expose the impact for staff review without activating or sending communications.
5. Prepare the post-deploy normal sync/backfill and idempotency verification. A code change alone does not repair existing local membership rows.

Completion: synthetic type-25/type-46 fixtures yield consistent classifications through sync, filters, status and agent tools. After a normal GitHub deployment and controlled sync, aggregate before/after counts are explainable.

## Phase 3 Build the shared household reporting service

Proposed new module: `lib/giving/household-participation.ts`, with focused helpers only where there is a separate reusable responsibility. Keep population selection, derived household classification, financial attribution and measure definitions behind one typed interface.

1. Add the minimum nullable person field(s) to `prisma/schema.prisma` required by the verified Christian-source contract; preserve unknown and sync provenance. Use an additive migration. Do not add generic raw attribute dumps or attendance tables before source discovery.
2. Extend `lib/rock/client.ts` and sync normalization with structured validation and explicit nullable values. Distinguish source access/fetch failure from an actual unknown response. Clear genuinely changed values on subsequent sync; do not erase valid data on an incomplete/failed fetch.
3. Define typed report filters and metadata: as-of time, reporting months (1, 3, 6, 12 or 24 completed months; default 12), fund IDs, campus selection, Christian-status selection, mismatch state, connection status, snapshot/freshness context and rule version where needed.
4. Build eligible household IDs from all qualifying adult members, not the three contacts currently selected for household list presentation. Compute status and Christian classification once per distinct household. Retain original statuses and reasons for Unknown/Other.
5. Join actual giving through the verified attribution contract; calculate money with existing exact monetary helpers. Apply the selected period consistently to participation, recorded-giver diagnostics and drilldowns. Exclude future schedules and pledges. Produce selected-period/latest-month participation with explicit numerator and denominator IDs and nullable percentages.
6. Share the same filter predicates between aggregate counts and paginated lists. Aggregation must cover the full cohort, not one page. Use set-based queries and bounded response payloads; avoid a query per household. Ensure one report read is internally consistent across its aggregates and metadata.
7. Keep existing individual-giver and Healthy semantics distinct. Changing unrelated dashboards or communication rules requires a separate documented decision.

Completion: a deterministic fixture containing mixed-status adults, missing data, annual gifts, refunds, multiple memberships and differing family/giving groups produces exact expected counts and no duplicate financial attribution.

## Phase 4 Expose dashboard lists GraphQL and MCP

Affected surfaces: `app/page.tsx`, `components/dashboard/staff-dashboard.tsx`, a household participation panel, household list components/routes, `lib/list-views/filter-catalog.ts`, `filter-schema.ts`, `page-params.ts`, `households-list.ts`, `lib/graphql/types/list-views.ts`, schema registration, and `lib/mcp/{tools,tool-schemas}.ts` where needed.

1. Add the dashboard household table, period dropdown (1, 3, 6, 12 months, 2 years), filters, totals, explicit periods/fund scope/freshness and zero-denominator display. Keep responsive Tailwind styling consistent with existing components.
2. Expose connection-status and Christian-status filters, classification explanations and exact participation drilldowns through household lists and saved views. Preserve existing views without silently applying the new report's default population to unrelated workflows.
3. Add typed GraphQL report inputs/results under existing staff checks. Reuse the reporting service rather than reproducing calculations in resolvers.
4. Extend bounded MCP query metadata and, if the existing tools cannot represent the aggregate report, add a narrowly scoped read-only household participation tool. Reuse authorization, schemas, limits and audit patterns. Avoid exposing raw Rock data or an arbitrary query interface.
5. Return explicit incomplete-data states for missing Christian-field access or unresolved source freshness; do not present incomplete cohorts as a verified participation rate.

Completion: counts equal total drilldown results across all pages; UI, GraphQL and MCP produce the same measures for identical inputs; inactive or absent local users cannot read them.

## Phase 5 Verify report claims and prepare follow-up work

1. Reproduce the report's material aggregate claims using an authorised dataset and fixed as-of context. Record population, periods, funds, units, exclusions and extraction/sync freshness. Compare aligned queries; do not force the proposed definitions to reproduce differently defined historical numbers.
2. Obtain the underlying Xero analysis/export where needed, then reconcile grouping and funds with Rock identities. Mark unavailable evidence unresolved. Route discrepancies to Tataihono for follow-up with Vincent; include the needed export and exact fund/period/mapping checks. Preserve the report's original October figures as source claims, not accepted production baselines.
3. Maintain a claim ledger extending the [initial assessment](../research/2026-10-24-rowan-abound-request-assessment.md), with evidence and verdict for each material claim. Keep donor-level data in restricted operational storage.
4. Produce a restricted household review list with Rock IDs, reason/evidence, staff disposition and resolution status. Assign each item a recipient, reason, suggested check/fix and status. Tataihono is the confirmed first recipient and triage owner; he assigns the responsible Rock staff member. Verify his notification destination before delivery. Prepare notification instructions explaining why they receive it and the next action, with restricted evidence links. Tataihono authorized sending review findings to him first. Do not send directly to other staff without further instruction. Investigate flats through Rock relationship evidence and same-period counts of zero/one/two/three-or-more recorded givers per household; do not equate a recorded donor with an independently giving adult. No automated merges or name-based retirement. Scope and operational approval for source corrections are separate.
5. Write attendance feasibility findings covering first recorded attendance, frequency, Sunday/group differences, historical coverage, missing records and identity joins to first gifts. Recommend a separate implementation scope if evidence supports it; avoid causal claims about attendance and giving.

Completion: material report claims are verified, contradicted or explicitly unresolved; a review list and attendance proposal exist. No campaign dates or cleanup deadlines are promised by this plan.

## Verification strategy

- Unit tests: selectable 1/3/6/12/24-month windows and preserved drilldowns; explicit Christian/Exploring conflicts; same-period recorded-giver diagnostics; mixed adult statuses; all three Christian categories; unrecognised values; missing field access; ineligible children/deceased/inactive members; annual versus monthly participation; net-zero refunds; future pledges; empty denominators; date boundaries; ambiguous mappings and double-count protection.
- Sync tests: type 46 survives normalization with its source ID; group/member active/archive combinations; missing or contradictory member group type; idempotent resync; explicit Christian value changes and fetch failures. Use synthetic fixtures and an isolated `TEST_DATABASE_URL` when database tests are needed.
- Contract and UI tests: aggregate and drilldown equality beyond one page; combined filters and saved views; GraphQL/MCP parity and validation; unauthorized/inactive-user rejection; incomplete source metadata; responsive table and accessible labels.
- Extend relevant existing suites: `tests/unit/giving-metrics.test.ts`, `sync-normalization.test.ts`, `sync-status.test.ts`, `households-list-view.test.ts`, `mcp-tools.test.ts`, plus focused new report tests and necessary integration tests.
- Run formatting, lint, typecheck and focused tests after implementation; required commit checks stay `pnpm format:check`, `pnpm lint`, `pnpm typecheck` in order. Run the wider suite once relevant changes pass. Check schema generation/migrations if changed.

## Failure modes and release verification

| Failure                                                   | Required handling                                                                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source Christian field inaccessible, absent or incomplete | Preserve unknown/incomplete state and source metadata; never convert failures to false or an apparently complete rate.                 |
| Group coverage code deployed without resync               | Show freshness and verify a normal backfill before declaring the UniChurch correction complete.                                        |
| Family and giving households diverge                      | Expose mappings and unresolved attribution; never multiply financial totals across family rows.                                        |
| Multi-page lists or concurrent sync change counts         | Use the same cohort, snapshot/context and predicates; verify aggregate totals against complete enumeration.                            |
| Annual givers appear inactive in a monthly view           | Label windows and keep lifecycle separate; no automatic outreach changes.                                                              |
| Changed membership expands a communication segment        | Review affected pending audiences and existing freeze/review behaviour before sending; this feature does not grant send authorization. |
| Attendance sparsity appears to prove non-attendance       | Report coverage and first recorded dates explicitly; decline unsupported tenure/frequency conclusions.                                 |

Release through branch, review, GitHub merge, passing main CI and the GitHub-connected Railway deployment. Review before opening a PR. Use an additive migration with a documented rollback: revert report exposure, preserve nullable source fields and source identities, and re-run derived calculations if policy is reverted. No direct local archive deployment or production repair is part of this task.

## Stakeholder review checkpoint

Completed: Rowan replied on 31 October and his feedback is reconciled in `docs/research/2026-10-31-rowan-plan-feedback.md`. Tataihono confirmed explicit-field precedence, Unknown for missing explicit values, mismatch flags and himself as first review recipient on 31 October. Remaining discovery concerns field semantics/IDs, the verified notification destination, exceptional household mappings and attendance feasibility. Scope approval does not establish source-contract verification or completed deployment.

## First implementation slice

Local code now retains Connect Group types 25 and 46, uses the shared active-membership classifier in fixture and live normalization, resolves omitted member types from their parent group, flags contradictory types and includes both types in sync-status counts. Existing household/people filters consume the same persisted `activeConnectGroup` flag. No schema or endpoint change is required. Regression tests cover both types, parent links, inactive/archived group and member states, pending membership and contradictory types.

Code review checked normalization, full/person fetch paths, status and downstream predicates. Existing automation runs retain frozen recipients; future runs resolve current saved-view audiences (`lib/communications/automation-runs.ts`). Therefore review both inclusion and exclusion segments before the post-deploy sync changes flags. Live taxonomy verification, audience impact review, GitHub release and full-sync/idempotency checks remain pending. See the feedback record for test results.

## Live verification follow-up

See [31 October source verification and review findings](../research/2026-10-31-household-source-verification.md). Current Rock types 25/46 and the missing UniChurch mirror coverage are verified. No current unarchived saved view uses Connect Group filters. Christian person-field binding remains unresolved: the located Christian attribute belongs to a workflow, and Exploring was not returned in the connection-status taxonomy. Tataihono is confirmed as first recipient. Standard-group source/mirror membership differences require separate reconciliation review; a full upsert sync alone does not certify removal of stale memberships. Attendance endpoints and historical confirmed records are readable; coverage and joins need further discovery.
