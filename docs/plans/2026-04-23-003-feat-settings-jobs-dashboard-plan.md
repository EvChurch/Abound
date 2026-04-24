---
title: "feat: Add settings jobs dashboard"
type: feat
status: planned
date: 2026-04-23
origin:
  - docs/brainstorms/2026-04-17-church-giving-management-requirements.md
  - docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md
  - docs/plans/2026-04-23-001-feat-admin-fund-settings-plan.md
---

# feat: Add Settings Jobs Dashboard

## Overview

Add an Admin-only `Settings > Jobs` page that gives staff an operational dashboard for background jobs: what is currently running, what is queued or retrying, what schedules are active, and recent job history. The page should combine pg-boss queue telemetry with app-owned job outcomes such as Rock sync runs and fund-scoped derived refresh records.

This is an operations surface, not a donor data surface. It should help staff answer "is the worker healthy and catching up?" and "what failed recently?" without exposing donor payloads.

## Problem Frame

Background jobs are becoming a core system path:

- Rock full-sync and person-sync jobs already run via pg-boss.
- Fund-scoped derived refresh jobs are now queued through the same worker.
- Existing `/sync` status is useful but centered on Rock sync outcomes, not full job operations.

Current gap:

- No single page shows queue state across all known job types.
- No staff-visible summary of active/scheduled/retrying work.
- No explicit history panel for pg-boss state transitions and recent failures.

As job usage grows, this creates operational blind spots and slows incident triage.

## Scope

In scope:

- New Admin-only route: `app/settings/jobs/page.tsx`.
- Settings navigation entry for Jobs.
- Service to aggregate pg-boss telemetry and app-owned run history.
- Dashboard sections for:
  - queue health by queue
  - currently active/running jobs
  - scheduled jobs
  - recent pg-boss history (completed/failed/cancelled/retry)
  - app-owned outcome history (SyncRun, DerivedCalculationRefresh)
- Safe metadata only (no donor payloads, no gift amounts).
- Unit/page tests for authorization, data mapping, and rendering states.

Out of scope for first pass:

- Building a new worker control plane (pause/resume/kill UI).
- Replacing `/sync` page immediately.
- Creating a generic plugin job framework.
- Real-time streaming via websockets.
- Storing raw worker logs in the app database.

## Requirements Trace

- Settings surfaces are Admin-managed (`settings:manage`).
- Rock is source of truth for donor/giving data; this page is operational metadata only.
- Auth0 proves identity only; local role authorization gates access.
- Sensitive donor data must not be exposed in operational dashboards.
- Compound direction already prefers pg-boss as the durable scheduler/runner.

## Current Context

Existing implementation to reuse:

- Job queues and queue constants live in `lib/sync/jobs.ts`.
- Worker processing and console progress logs live in `scripts/sync-worker.ts`.
- Sync outcome metadata already exists in `SyncRun` and `SyncIssue`.
- Derived refresh outcome metadata already exists in `DerivedCalculationRefresh`.
- Settings navigation already supports Admin-only items in `components/navigation/app-top-nav.tsx`.
- Existing Settings page patterns exist in:
  - `app/settings/funds/page.tsx`
  - `app/settings/users/page.tsx`

Available pg-boss API surfaces (from installed version) useful for this page:

- `getQueues()` / `getQueueStats(name)` for queue counters.
- `getSchedules()` for active cron schedules.
- `findJobs(name, { ... })` for queue history slices.
- Job states: `created`, `retry`, `active`, `completed`, `cancelled`, `failed`.

## Decisions

- Add a dedicated Settings Jobs page instead of expanding `/sync` in place.
- Keep the first pass read-only and operational.
- Use pg-boss API methods rather than querying `pgboss.*` tables directly.
- Keep queue-level telemetry and app-domain outcomes as separate sections to avoid conflating "job transport state" with "business result state".
- Use bounded history windows (for example, latest 50-100 per section) so the page is fast and predictable.
- Fail soft: if pg-boss is temporarily unavailable, still show app-owned history with a clear degraded-state banner.

## Proposed Service Design

Create `lib/settings/jobs.ts` as the service boundary.

Suggested summary shape:

- `queues`: per queue (`rock-full-sync`, `rock-person-sync`, `giving-derived-refresh`) with `deferredCount`, `queuedCount`, `activeCount`, `totalCount`, policy, and table.
- `activeJobs`: latest active jobs by queue with metadata-safe fields (id, name, state, startedOn, retryCount, singletonKey).
- `recentJobs`: recent completed/failed/cancelled/retry jobs per queue.
- `schedules`: current schedule key/cron/timezone/queue.
- `syncRuns`: latest `SyncRun` records (existing safe counters only).
- `derivedRefreshes`: latest `DerivedCalculationRefresh` rows (kind/status/timestamps/error summary).
- `warnings`: optional pg-boss warning count if available from API; omit if not stable in first pass.
- `degraded`: boolean + message when pg-boss calls fail but DB-backed history still loads.

Key helper structure:

- `createOperationsBoss()` wrapper (or reuse `createSyncBoss`) with explicit "read-only dashboard" intent.
- `getJobsDashboardSummary(client, options)` aggregator with internal timeouts and per-section fallbacks.
- Shared queue name list derived from `lib/sync/jobs.ts` constants to avoid drift.

## UI Design

Add a new component set under `components/settings/jobs-dashboard.tsx`.

Page structure:

1. Header row:
   - Title: "Jobs"
   - Status chip: Healthy / Degraded / Unavailable
   - Last fetched timestamp

2. Queue health cards:
   - One compact card per queue with queued, active, retry/deferred, total
   - Queue policy and schedule indicator

3. Running now:
   - Active jobs table/cards showing queue, job id, state, started time, retry count, singleton key

4. Scheduled jobs:
   - Cron key, queue, cron expression, timezone

5. Recent job history (pg-boss):
   - Tabs or segmented filter by state (`failed`, `retry`, `completed`, `cancelled`)
   - Most recent rows first

6. App outcomes:
   - Recent Sync runs (status/read/written/skipped/start/end)
   - Recent derived refreshes (status/requested/start/end/error)

7. Degraded-state panel:
   - Shows when pg-boss telemetry is unavailable but app history remains visible

Visual direction should stay operational and dense, aligned with existing Settings pages and current app tokens.

## Authorization And Privacy

- Route is Admin-only (`settings:manage`).
- Anonymous users redirect to `/auth/login`.
- Authenticated users without local access redirect to `/access-request`.
- Non-Admin users receive the existing safe unauthorized state pattern.
- Do not render raw `job.data` payloads unless explicitly whitelisted and redacted.
- Do not render donor PII or financial values from any payload.

## Implementation Units

1. Jobs summary service
   - Files:
     - `lib/settings/jobs.ts`
     - `lib/sync/jobs.ts` (shared queue list export cleanup only if needed)
   - Work:
     - Build aggregated summary from pg-boss queue stats, schedules, and job history.
     - Merge in app-owned `SyncRun` and `DerivedCalculationRefresh` histories.
     - Add degraded-mode fallback behavior.
   - Tests:
     - `tests/unit/settings-jobs-summary.test.ts`
   - Test scenarios:
     - Returns queue cards for all known queues.
     - Correctly maps active/retry/completed/failed states.
     - Handles pg-boss call failure with degraded flag and still includes app history.
     - Never includes raw payload fields beyond safe metadata.

2. Settings Jobs page and component
   - Files:
     - `app/settings/jobs/page.tsx`
     - `components/settings/jobs-dashboard.tsx`
   - Work:
     - Add page-level auth/access gate matching existing settings pages.
     - Render jobs dashboard sections and empty/degraded states.
   - Tests:
     - `tests/unit/settings-jobs-page.test.tsx`
   - Test scenarios:
     - Anonymous -> `/auth/login`.
     - Needs access -> `/access-request`.
     - Non-admin unauthorized state.
     - Admin renders queue health, running jobs, schedules, and history sections.

3. Settings navigation wiring
   - Files:
     - `components/navigation/app-top-nav.tsx`
     - any route using `settingsActiveItem` union types
   - Work:
     - Add `jobs` settings nav item and active-state support.
   - Tests:
     - update existing nav/page tests as needed
   - Test scenarios:
     - Jobs link appears only when `canManageSettings` is true.
     - Jobs link marks active when on `Settings > Jobs`.

4. Optional route convergence (follow-up)
   - Files:
     - `app/sync/page.tsx`
   - Work:
     - Decide whether `/sync` should stay as dedicated sync health view or redirect to `/settings/jobs` after migration.
   - Tests:
     - adjust `tests/unit/sync-status-page.test.tsx` if route behavior changes.

## Test Plan

- Unit: jobs summary mapping from pg-boss responses.
- Unit: degraded mode when pg-boss is unavailable.
- Unit: app history fallback still loads from Prisma.
- Page: auth redirects and admin-only rendering.
- UI: running/history sections render correct empty states.
- Regression: existing sync status and fund settings pages still render and nav still works.

## Risks And Mitigations

- pg-boss API latency or transient failures:
  - Mitigation: per-section try/catch, degraded status, bounded history queries.
- Queue/history overfetch causing slow page loads:
  - Mitigation: strict take limits and state-filtered queries.
- Accidental sensitive payload exposure:
  - Mitigation: whitelist-only metadata mapping; no raw `job.data` rendering in first pass.
- Ambiguity between queue state and business outcome:
  - Mitigation: separate "pg-boss transport" and "app outcomes" sections with explicit labels.

## Open Questions

- Should `/sync` become a subsection of `Settings > Jobs`, or remain standalone while Jobs covers all queues?
- Do we want first-pass manual actions (re-enqueue failed job, retry button), or keep read-only until audit and permission policy are defined?
- Should failed-job details include short error snippets from pg-boss output when present, or keep first pass to status/timestamps only?
- Should we introduce a refresh interval (e.g., every 15-30s) on this page, or start with manual refresh and server render only?
