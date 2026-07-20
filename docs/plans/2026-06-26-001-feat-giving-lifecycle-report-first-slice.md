---
title: "feat: Build first real Giving Lifecycle report slice"
type: feat
status: in_progress
date: 2026-06-26
origin:
  - docs/brainstorms/2026-06-24-giving-drop-off-report-requirements.md
  - docs/plans/2026-04-23-002-feat-historical-giving-lifecycle-trends-plan.md
---

# feat: Build First Real Giving Lifecycle Report Slice

## Goal

Replace the synthetic giving drop-off prototype with a first real-data report over synced Rock people and local `GivingFact`/lifecycle data.

The report should stay visually close to the People page: left-side filters, compact person rows, and a quiet month-by-month giving presence strip.

## Naming

Use **Giving Lifecycle** as the product/report name. The original "Giving Drop-Off" language is now too narrow because the report includes the full lifecycle set:

- Healthy
- New
- Reactivated
- At-risk
- Dropped
- Lapsed

## First Slice Scope

In scope:

- A staff-only `/reports/giving-drop-off` route backed by real data.
- Person rows with avatar-style identity, lifecycle chip, record status chip, household giving-state chip, last gift month, and a 12-month giving presence strip.
- Filters for lifecycle, campus, connection/status stage, active-or-pending record status, household giving state, and text search.
- Role-safe amount behavior: finance/Admin can use real amounts internally for timeline intensity; Pastoral Care should not receive amount values.
- CSV export for currently loaded report rows using the same masked fields.
- Persisted `LAPSED` lifecycle snapshots and enum tracking.

Out of scope for this slice:

- Full historical backfill tables.
- All-time/five-year matrix.
- Saved People view integration.
- Fund-shift/apprentice/partner analysis.
- Follow-up tagging/task creation.

## Data Semantics

Use enabled platform funds via `PlatformFundSetting`. If platform funds are unconfigured, the report should fail closed by returning no amount-bearing/giving-derived rows rather than using all Rock funds.

Lifecycle handling:

- `NEW`, `REACTIVATED`, `AT_RISK`, and `DROPPED` come from current `GivingLifecycleSnapshot` rows where available.
- `HEALTHY` is derived the same way the People page lifecycle filter treats Healthy: recent giving in the last 90 days with no current lifecycle warning.
- `LAPSED` is a tracked lifecycle label for people with prior multi-month giving, no gift in the lapsed window, and no stronger current lifecycle warning. It is persisted in lifecycle snapshots so dashboards and list filters can count it consistently.

Household giving state:

- `Still giving`: person has no recent gift, but their Rock giving household/primary household has recent giving.
- `Stopped`: neither person nor household has recent giving.
- `Reduced`: reserved for later amount-baseline work; the first real slice can omit or rarely emit it.

## Privacy

- Do not log names, emails, raw gift rows, or amounts.
- Pastoral Care may see lifecycle labels, last gift month, household state, and presence/absence timeline.
- Only Admin/Finance should receive amount fields or amount-based CSV columns.

## Verification

- `pnpm typecheck`
- Focused report service tests if practical in this slice.
