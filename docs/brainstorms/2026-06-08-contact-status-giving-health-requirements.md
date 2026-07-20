---
date: 2026-06-08
topic: contact-status-giving-health
---

# Contact Status Giving Health

## Summary

Add a staff reporting capability that shows what percentage of each Rock connection/contact status is currently giving, using Abound's existing `Healthy` giving lifecycle definition. The first leadership use case is Steve's question: of people whose Rock status is `Growing`, what percentage are `Healthy`?

---

## Problem Frame

Leadership has a strategic target of 100% of `Growing` people giving. Rock owns the contact status labels, while Abound owns derived giving lifecycle labels. Staff need a report that joins those two concepts without redefining either one.

This should answer the immediate `Growing` question and support the same analysis for every Rock contact status in use.

---

## Key Decisions

- **Use Rock status as the cohort source.** Contact status labels such as `Growing`, `Visiting`, and `Community` come from Rock's `ConnectionStatusValueId` / local `connectionStatusValueRockId`.
- **Use Abound Healthy as the giving signal.** "Currently giving" means the person is `Healthy` according to Abound's giving lifecycle logic, not merely present in a Rock giving export.
- **Report every status, not only Growing.** `Growing` is the immediate leadership target, but a status-by-status report gives staff useful context and avoids a one-off metric.
- **Keep the report aggregate-first.** The primary report should show counts and percentages by status. Any drilldown must reuse existing staff authorization and giving-data masking.

---

## Actors

- A1. **Leadership reader:** asks for strategic progress against contact-status giving targets.
- A2. **Finance or Admin staff:** runs or refreshes the report and may inspect amount-bearing context where permitted.
- A3. **Pastoral Care staff:** may use non-amount lifecycle labels and follow-up cues, but must not see individual giving amounts.
- A4. **Rock RMS:** remains authoritative for people and contact status.
- A5. **Abound:** remains authoritative for local derived giving lifecycle labels and reporting presentation.

---

## Requirements

**Metric Definition**

- R1. The report must group people by Rock connection/contact status.
- R2. The report must count `Healthy` people within each status using the same lifecycle definition used by Abound list views and dashboards.
- R3. The report must calculate `Healthy %` as `healthy people / total people in status`.
- R4. The report must include the `Growing` status because it maps directly to Steve's strategic target.
- R5. The report must include every Rock connection/contact status that currently has at least one person.

**Report Output**

- R6. The default report must show status label, total people, Healthy people, Healthy percentage, and non-Healthy lifecycle counts.
- R7. The report should show `New`, `Reactivated`, `At-risk`, and `Dropped` counts beside Healthy so staff can understand why a status is not at 100%.
- R8. The report must show source freshness, including the latest Rock sync and lifecycle calculation window available to the report.
- R9. The report must provide a clear empty or unavailable state when Abound has Rock status data but no current lifecycle data.

**Permissions and Privacy**

- R10. Aggregate status counts may be visible to staff roles that can already view lifecycle reports.
- R11. Drilldowns into people must reuse existing People list permissions and role-safe field masking.
- R12. The report must not expose individual giving amounts to roles that cannot currently see them.
- R13. Logs and report-generation output must not print names, emails, raw gift rows, payment data, or access tokens.

---

## Acceptance Examples

- AE1. **Growing leadership answer**
  - **Covers:** R1-R4, R6, R8
  - **Given:** Rock has people with connection status `Growing` and Abound has current lifecycle data.
  - **When:** Staff runs the contact-status giving-health report.
  - **Then:** The report shows the total `Growing` people, the number classified as `Healthy`, and the Healthy percentage.

- AE2. **All-status comparison**
  - **Covers:** R5-R7
  - **Given:** Rock has multiple connection statuses in use.
  - **When:** Staff opens the report.
  - **Then:** Every populated status appears with Healthy and non-Healthy lifecycle counts.

- AE3. **Lifecycle unavailable**
  - **Covers:** R8-R9
  - **Given:** Rock status data is available but lifecycle snapshots or recent giving facts are unavailable.
  - **When:** Staff opens the report.
  - **Then:** The report shows status population counts and explains that Healthy percentages require a current Abound sync and lifecycle refresh.

- AE4. **Role-safe drilldown**
  - **Covers:** R10-R12
  - **Given:** A Pastoral Care user opens a status drilldown.
  - **When:** The user views matching people.
  - **Then:** The user sees role-safe lifecycle labels and person context without individual giving amounts.

---

## Current Aggregate Rock Context

Rock API aggregate-only query on 2026-06-08 found these connection/contact statuses in use:

| Status                  | People |
| ----------------------- | -----: |
| Visiting                |  3,719 |
| Community               |  3,366 |
| Supporter               |  2,195 |
| Attending               |    554 |
| Growing                 |    505 |
| Fringe                  |    442 |
| Investigating           |    247 |
| Joining                 |    121 |
| Prospect                |    109 |
| Establishing (in faith) |     20 |

Total people counted: 11,278.

Healthy percentages were not available from this query because Healthy is an Abound-derived lifecycle state and the available non-worktree database configuration did not point to a populated local Abound database.

---

## Steve-Facing Response Template

Use this after the Healthy count is available:

```text
Hi Steve,

Yes. Using Rock's "Growing" contact status as the group, [HEALTHY_COUNT] of [GROWING_TOTAL] people are currently Healthy in Abound's giving lifecycle, which is [HEALTHY_PERCENTAGE]%.

I can also provide the same percentage for the other Rock contact statuses if useful.

thanks,
Tatai
```

---

## Scope Boundaries

- Do not redefine Rock connection/contact statuses locally.
- Do not write contact status, giving status, gifts, or lifecycle values back to Rock.
- Do not create a new lifecycle category for this strategic target.
- Do not treat any direct Rock-only gift query as equivalent to Abound's `Healthy` lifecycle without reconciling the definition.
- Do not expose person-level gift rows from the aggregate report.

---

## Dependencies / Assumptions

- Rock's `ConnectionStatusValueId` is the correct field for the "contact status" language in Steve's email.
- Abound's current `Healthy` lifecycle remains the agreed definition of "currently giving" for this report.
- The denominator is all people in a Rock contact status unless a later product decision excludes inactive, deceased, or non-active record statuses.
- The report requires a populated Abound database with current Rock sync data, GivingFact rows, and lifecycle calculations.
- The known Rock population has no deceased people in the aggregate status query, but the report should still handle deceased records if they appear later.

---

## Outstanding Questions

### Resolve Before Planning

- None.

### Deferred to Planning

- [Affects R3][Product] Should denominator eligibility exclude inactive record statuses, deceased people, or other Rock status combinations?
- [Affects R6-R7][Product] Should the first UI be a dashboard card, a table in a reporting page, or a saved People list view with summary metrics?
- [Affects R8-R9][Technical] Should Healthy counts be computed from current lifecycle snapshots, query-time lifecycle classification, or a refreshed reporting aggregate?
- [Affects R10-R12][Product] Which staff roles should see the aggregate report if it includes no amounts but implies giving participation?

---

## Sources / Research

- `docs/brainstorms/2026-04-17-church-giving-management-requirements.md`
- `docs/plans/2026-04-20-001-feat-people-household-list-views-plan.md`
- `docs/plans/2026-04-23-002-feat-historical-giving-lifecycle-trends-plan.md`
- `docs/architecture/data-model.md`
- `lib/giving/lifecycle.ts`
- `lib/list-views/lifecycle-filtering.ts`
- `lib/list-views/connection-status-options.ts`
- `prisma/schema.prisma`
