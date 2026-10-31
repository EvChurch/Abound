---
title: Household report implementation and source verification
date: 2026-11-01
status: implemented-reviewed-awaiting-release
roadmap: RM-007
---

# Household report implementation and source verification

This executes phases 3–4 of the approved household participation plan under the repo's Compound Engineering work phase. The `ce:*` skills remain unavailable in this session; the existing plan and standard pre-PR review are used. Requirements retain Tataihono's approved temporary Investigating rule and first-recipient policy.

## Source checks

Bounded read-only queries against the production mirror confirmed campuses 2/3/4/5 (North/Central/UniChurch/Online), active/inactive Adult memberships, contribution type 53 versus event registration 54, actual versus scheduled facts and 194 negative actual facts. All current source transaction statuses and settled flags are null. The report preserves signed contribution values; it does not infer processor acceptance from unknown statuses. Existing sync derives effective months in UTC; no reporting-timezone migration is introduced.

A source freshness check found two locally active adult memberships absent from the most recent full-sync cohort. GET by ID returned one same-identity, active, unarchived membership; the other returned HTTP 404. This does not establish archive/deletion or the reason for collection omission. No Rock or production database writes were made. The report flags affected households for Tataihono and withholds their measures instead of silently excluding them or assuming source corrections. Root-cause investigation/source reconciliation remains a follow-up.

## Aggregate preview

The actual new service was bundled as a temporary read-only inspection script and run against the production mirror. It emitted aggregate metadata/counts only, with no names, person IDs, email addresses or gift amounts. This is a code preview, not a deployed report or an independent reconciliation of Rowan's October PDF/Xero analysis.

For the preview's completed window October 2025–September 2026, default Central/North/UniChurch campuses and one enabled fund:

| Stage     | Eligible households (provisional where flagged) | Known giving in period | Known giving in September | Unresolved households |
| --------- | ----------------------------------------------: | ---------------------: | ------------------------: | --------------------: |
| Growing   |                                             348 |                    222 |                       192 |                     1 |
| Attending |                                              85 |                     37 |                        29 |                     0 |
| Joining   |                                              36 |                      3 |                         1 |                     0 |
| Other     |                                             239 |                      8 |                         3 |                     1 |
| Total     |                                             708 |                    270 |                       225 |                     2 |

There are 93 all-Investigating households classified non-Christian under the temporary proxy and 615 Unknown households. Zero positive Christian classifications means no verified positive source, not evidence of no Christians. Christian-specific participation is unavailable. Overall/Growing/Other participation rates are withheld because of membership freshness. The same-period recorded-giver diagnostic is 436 households with zero, 244 with one, 25 with two, one with three or more, and two unresolved. No flat identification or automatic household split follows from those counts.

The earlier pre-freshness preview counted 271 giving households and 226 latest-month households. That preview is superseded by the conservative treatment above: two household measures are now unknown, while their demographic rows remain visible. The preview used latest successful sync `cmvwrxh341t9k08qljdjkqrgy` completed 31 October at 19:23:26 UTC. Future reads may change as Rock changes.

## Validation and review

The full suite passes: 470 tests across 79 files, including both isolated-database suites. Formatting, lint and typecheck pass; both compiled worker runtime tests pass. The production build passes, including the new report route. Synthetic markup with compiled production CSS was inspected in the browser at desktop and mobile sizes; the table scrolls inside its container without page-wide overflow. Local validation runs on Node 24.22.1; GitHub CI verifies the pinned Node 22.23.4 runtime. An isolated local database named `abound_participation_test` was created and received existing migrations; synthetic fixtures never touch development/production data. No migration is added to the application.

The review checks population/financial attribution, all-adult precedence, typed input validation, count/drilldown parity, snapshot refresh, active staff checks, bounded MCP payloads/audit redaction, and source-failure behavior. Positive-source, Xero evidence and attendance coverage remain explicit dependencies. The restricted read-only review list provides reasons and Rock relationship checks for Tataihono; it does not introduce automated delivery or disposition writes.

Standard pre-PR review found and resolved: continuation parsing dropping the new household filters; category drilldowns widening a restricted table cohort; provisional sync pages carrying an unusable stable snapshot; and stale adult memberships incorrectly appearing verified. The final implementation preserves filter context, rejects changed snapshots, allows fresh provisional first pages, and exposes restricted source membership IDs for staff review. No outstanding code-review blocker remains; unresolved source issues are explicitly represented in the product.
