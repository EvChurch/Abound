---
title: "feat: Add historical giving lifecycle trends"
type: feat
status: planned
date: 2026-04-23
origin:
  - docs/brainstorms/2026-04-17-church-giving-management-requirements.md
  - docs/architecture/data-model.md
  - docs/plans/2026-04-20-001-feat-people-household-list-views-plan.md
  - docs/plans/2026-04-23-001-feat-admin-fund-settings-plan.md
---

# feat: Add Historical Giving Lifecycle Trends

## Overview

Create historical giving lifecycle data so staff can graph how households and people have moved through lifecycle states over time. The first product goal is trend visibility: staff should be able to see whether lifecycle warnings cluster around December and Christmas, whether a church-wide event appears to line up with a downtrend, and whether current lifecycle movement is unusual compared with previous months.

The current lifecycle badge is a point-in-time derived signal. This feature turns the same business language into a historical series that can power dashboard charts, seasonal analysis, and future drilldowns without recomputing every month of history during page render.

## Problem Frame

The app can now classify current giving lifecycle states, including Healthy, New, Reactivated, At-risk, and Dropped. That is useful for today's staff action, but it cannot answer trend questions:

- Did At-risk or Dropped counts climb before Christmas?
- Was there a sudden change after a significant church event?
- Are more people becoming Healthy, or are Healthy givers slowly moving toward risk?
- Is a current spike a normal seasonal pattern or a meaningful shift?
- Which month did a particular person or household first enter an at-risk window?

The app needs durable historical lifecycle snapshots that are computed with the same enabled-fund boundary and lifecycle definitions as the current dashboard. These snapshots should be explainable, versioned enough to survive algorithm changes, and safe to aggregate for staff-facing reporting.

## Scope

In scope:

- Monthly historical lifecycle state generation for people and households.
- Backfilling historical lifecycle states from existing `GivingFact` data.
- Including Healthy as a first-class historical state, not just a UI filter.
- Using the configured platform fund set for all historical calculations.
- Storing enough per-resource detail to support drilldown and auditability.
- Aggregating monthly counts for fast dashboard charts.
- A staff dashboard trend chart for lifecycle counts over time.
- Tests for as-of-date lifecycle classification, backfill determinism, enabled-fund filtering, and aggregate counts.
- Documentation of the historical lifecycle calculation boundary.

Out of scope for the first pass:

- Predictive forecasting or automated causal claims.
- Automatically importing church calendar events from Rock or another system.
- Donor-facing lifecycle reporting.
- Mutating Rock or payment setup.
- Replacing the current lifecycle snapshot table before the historical model has proved stable.
- Showing individual giving amounts to roles that cannot currently see them.

## Requirements Trace

- Rock remains authoritative for people, households, gifts, and Rock-owned giving fields.
- The app owns local derived lifecycle calculations and historical reporting snapshots.
- Enabled platform funds define the calculation boundary.
- Auth0 proves identity only; local app roles decide access.
- Admin and Finance may see amount-bearing supporting views where already allowed.
- Pastoral Care may use lifecycle labels, counts, and task workflows, but must not receive individual giving amounts.
- AI or analytics features must assist staff with reviewable explanation and should not create autonomous financial decisions.

## Current Context

Existing surfaces and services to reuse:

- Current lifecycle classifier: `lib/giving/lifecycle.ts`.
- Current lifecycle refresh: `lib/giving/lifecycle-snapshots.ts`.
- Dashboard lifecycle counts: `lib/giving/metrics.ts`.
- Lifecycle filtering: `lib/list-views/lifecycle-filtering.ts`.
- People and household list views: `lib/list-views/people-list.ts`, `lib/list-views/households-list.ts`, and `components/list-views/list-view-shell.tsx`.
- Dashboard UI: `components/dashboard/staff-dashboard.tsx`.
- Fund settings plan: `docs/plans/2026-04-23-001-feat-admin-fund-settings-plan.md`.

Known current lifecycle meanings:

- Healthy: has given within the last 90 days and has no current warning signal.
- At-risk: usually gave regularly, but has not given for 90-180 days.
- Dropped: usually gave regularly, but has not given for 180-270 days.
- New: first recorded gift was within the last 90 days.
- Reactivated: gave again after at least 180 quiet days.

The historical feature should preserve these meanings, but evaluate them as of each historical month instead of only as of today.

## Decisions

- Store monthly historical lifecycle rows instead of deriving historical chart points on demand.
- Treat Healthy as a real historical lifecycle state for trend reporting.
- Keep current lifecycle snapshots and historical lifecycle snapshots separate at first. The current snapshot table is optimized for today's filters; the historical table is optimized for time-series analysis.
- Store per-resource monthly state rows, then derive aggregate chart series from those rows.
- Add a calculation version to historical rows so future algorithm changes can be identified and selectively rebuilt.
- Use month-end as the default `asOfDate` for historical states. For the current partial month, compute as of the current date only when the current month has relevant giving activity.
- Keep church event correlation manual in the first pass. The app can support event annotations later, but it should not imply causation from date overlap.

## Proposed Data Model

Add a historical lifecycle snapshot table, for example `GivingLifecyclePeriodSnapshot`:

- `id`
- `resourceType` enum: `PERSON`, `HOUSEHOLD`
- `rockPersonId` nullable
- `rockHouseholdId` nullable
- `periodMonth` date, normalized to the first day of the month
- `asOfDate` date, normally the final day of the month
- `state` enum: `HEALTHY`, `NEW`, `REACTIVATED`, `AT_RISK`, `DROPPED`, `NONE`
- `summary` short text
- `detail` JSON for explainability, such as last gift date, quiet-day count, baseline amount, and pledge consideration
- `calculationVersion` string
- `fundScopeHash` string
- `lastSyncRunId` optional relation or reference when available
- `computedAt`
- `createdAt`, `updatedAt`

Recommended constraints and indexes:

- Unique `resourceType`, resource id, `periodMonth`, `calculationVersion`, and `fundScopeHash`.
- Index `periodMonth`, `resourceType`, `state`.
- Index by resource id and `periodMonth` for profile drilldown.
- Check that exactly one resource id is present for the selected `resourceType`.

Optional aggregate table for fast dashboard loading, for example `GivingLifecycleTrendMonth`:

- `id`
- `resourceType`
- `periodMonth`
- `state`
- `count`
- `calculationVersion`
- `fundScopeHash`
- `computedAt`

The aggregate table is optional if monthly counts from the period snapshot table are fast enough. The implementation should benchmark the local dataset before adding extra storage.

## Historical Classification Rules

The classifier should support an explicit `asOfDate`:

- Only gifts on or before `asOfDate` participate.
- Quiet-day windows are measured from the last gift on or before `asOfDate`.
- New is based on first gift date relative to `asOfDate`.
- Reactivated is based on a gift on or before `asOfDate` that follows at least 180 quiet days.
- At-risk and Dropped require the same prior consistency checks used by the current classifier, evaluated against the period before the relevant window.
- Healthy means the resource has a gift within 90 days of `asOfDate` and no stronger lifecycle state applies.
- None means no current lifecycle label applies for that period.

For monthly backfill, evaluate each month independently. A resource can be Healthy in one month, At-risk in a later month, Dropped after that, and None once the dropped signal is too old to be useful.

## Backfill And Refresh Design

Create a historical lifecycle service under `lib/giving/`, for example `lib/giving/lifecycle-history.ts`.

Responsibilities:

- Generate a list of period months to compute, defaulting to the last 36 months.
- Load giving facts scoped to enabled platform funds.
- Load active pledges that should affect lifecycle interpretation.
- Build person and household lifecycle histories as of each period month.
- Persist period snapshot rows idempotently.
- Recompute aggregates after period rows are saved.
- Return a backfill summary with row counts, period range, calculation version, fund scope, and duration.

Create an operational entry point:

- A direct script, for example `pnpm giving:lifecycle-history:backfill -- --months 36`.
- A service function that future settings or sync jobs can call after fund settings change.
- A pg-boss job can be added if the backfill is slow enough to need background processing.

The backfill should not run inside normal dashboard page rendering.

## UI Design

Add a dashboard lifecycle trend section that answers the question "what changed over time?" rather than only "who needs action today?"

Recommended first chart:

- A stacked area or multi-line chart showing monthly counts by lifecycle state.
- Default range: last 12 months, with a control for 24 or 36 months.
- State toggles for Healthy, At-risk, Dropped, New, and Reactivated.
- A clear x-axis by month.
- Hover details with counts, not individual donor amounts.
- Click a state/month to open the people page filtered to that state and historical month once that drilldown is implemented.

December and event analysis:

- Add a small seasonal comparison view after the base chart is stable.
- Show December counts compared with the preceding three months and the previous December where data exists.
- Support manual event markers in a later slice so staff can annotate a chart with church events without the app claiming causation.

## Access And Privacy

- Lifecycle states and aggregate counts are staff-operational signals, but supporting amounts remain governed by existing role permissions.
- Pastoral Care can see lifecycle labels and counts if current permissions already allow lifecycle workflows.
- Finance and Admin can access amount-bearing supporting detail where existing giving screens allow it.
- Historical drilldowns must reuse the same people/household list authorization and masking rules as current filters.
- Do not log raw donor amounts, payment identifiers, or access tokens during backfill.

## Implementation Units

1. Historical classifier support
   - Add an explicit `asOfDate` path to lifecycle classification.
   - Keep current classification behavior unchanged when `asOfDate` is omitted.
   - Add tests for Healthy, At-risk, Dropped, New, and Reactivated across month-end dates.

2. Data model and persistence
   - Add historical period snapshot model and enums.
   - Add indexes and uniqueness constraints.
   - Update `docs/architecture/data-model.md`.
   - Generate Prisma client and add migration tests where appropriate.

3. Backfill service
   - Implement monthly person and household backfill.
   - Use enabled fund scope and active pledge consideration.
   - Persist rows idempotently by calculation version and fund scope.
   - Add unit tests for deterministic row creation and stale-fund exclusion.

4. Aggregation service
   - Add a query function for monthly lifecycle counts.
   - Decide whether aggregate storage is needed after checking query performance.
   - Add tests for state counts, month ordering, and empty-month behavior.

5. Dashboard trend UI
   - Add a compact historical lifecycle chart to the dashboard.
   - Keep current lifecycle cards as the action surface for today's filters.
   - Add range and state controls if they fit without cluttering the dashboard.
   - Verify responsive layout and visual hierarchy.

6. Drilldown and filtering
   - Extend people and household filters to accept historical lifecycle month only after the period snapshot table is available.
   - Ensure current filters keep using current lifecycle state by default.
   - Add tests that historical and current filters do not conflict.

7. Operational refresh
   - Add script or job entry point.
   - Rebuild historical data after fund-scope changes.
   - Document commands and failure modes.

## Test Plan

- Unit: lifecycle classifier with explicit `asOfDate`.
- Unit: one-off spike handling remains stable historically.
- Unit: active pledge consideration works for historical At-risk calculations.
- Unit: Healthy state is generated historically when recent giving exists and no warning state applies.
- Unit: Dropped state expires after the useful window rather than appearing forever.
- Unit: enabled fund scope is honored during backfill.
- Unit: monthly aggregate counts match saved period rows.
- Integration: backfill can be run twice without duplicate rows.
- Integration: dashboard trend query returns ordered months and zero-count states where needed for chart stability.
- Authorization: Pastoral Care cannot receive individual amount-bearing detail through historical drilldown.

## Open Questions

- Should the first backfill cover 24, 36, or all available months? The recommended first pass is 36 months because it supports seasonal comparison without overbuilding.
- Should household historical state be derived from household-level giving facts only, or from the union of household member giving according to current household-giving rules?
- Should event annotations be implemented now, or should the first release only make the trend visible so staff can decide which annotations matter?
- When lifecycle algorithms change, should the app retain older calculation versions for comparison, or replace historical rows after an Admin-reviewed rebuild?
- Should current partial-month history be shown by default, or should charts only show completed months until there is current-month giving?

## Verification Commands

- `pnpm prisma:generate`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm format:check`
- `git diff --check`
