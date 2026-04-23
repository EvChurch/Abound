---
title: "feat: Add admin fund settings"
type: feat
status: active
date: 2026-04-23
origin:
  - docs/brainstorms/2026-04-17-church-giving-management-requirements.md
  - docs/architecture/person-household-profiles.md
  - docs/plans/2026-04-20-001-feat-people-household-list-views-plan.md
---

# feat: Add Admin Fund Settings

## Overview

Add an Admin-only settings page that lets staff choose which synced Rock financial accounts, or funds, are available across the giving platform. Enabled funds become the mandatory fund set for staff-facing giving calculations, pledge analysis, list-view fund filters, dashboards, GraphQL/API responses, and future reporting. Disabled funds stay synced from Rock for auditability and future reconfiguration, but staff-facing callers must not be able to override the setting or request disabled-fund giving data through normal application services.

The immediate product example is that the church may only care about General Fund and Investment Fund for this application. The implementation should make that choice explicit, reviewable, and app-owned without mutating Rock financial accounts or payment setup.

## Problem Frame

The app currently treats every active `RockFinancialAccount` as usable. That leaks low-value or out-of-scope Rock funds into staff workflows:

- Person and household giving summaries can include funds staff do not want in operational totals.
- Pledge recommendations currently use all active funds through `findPledgeableFunds()` in `lib/giving/pledges.ts`.
- List-view fund filters expose raw account IDs from all synced giving facts.
- Future reports will be difficult to interpret if each service decides fund eligibility independently.

This feature introduces a single app-owned eligibility source so calculations and UI surfaces answer the same question consistently.

## Scope

In scope:

- Admin-only settings route under `app/settings/funds/`.
- A settings navigation entry visible only to Admin users.
- Listing synced `RockFinancialAccount` records with enough context to choose funds safely.
- Enable/disable controls for platform availability.
- A shared service that resolves enabled fund IDs for calculations.
- Updating current giving summaries, pledge analysis, dashboard donor trends, and list-view fund filters to use enabled funds as the enforced platform boundary.
- Invalidating or rebuilding any stored derived calculations that depend on fund-scoped giving data when the fund set changes.
- Tests for permission enforcement, fund-setting persistence, and calculation filtering.
- Architecture documentation that describes Rock/app ownership boundaries.

Out of scope:

- Editing Rock funds, account names, public flags, tax-deductible flags, parent accounts, or payment setup.
- Creating new Rock accounts.
- Per-role fund visibility. The first pass is a platform-wide fund set; role permissions still control whether amounts are visible.
- Per-report custom fund sets or saved fund presets.
- Historical resync or deletion of existing `GivingFact` rows.
- Donor-facing fund configuration.

## Requirements Trace

- Rock remains authoritative for the actual financial account catalog and giving facts.
- The app owns local platform configuration, including whether a Rock fund is included in staff calculations.
- Auth0 proves identity only; active local `AppUser` authorization decides access.
- Admin has full settings authority; Finance and Pastoral Care cannot manage settings.
- Admin and Finance may see amount-bearing results for enabled funds. Pastoral Care must still receive amount-hidden states.
- AI, recommendation, and reporting features must be explainable and reviewable; fund inclusion should be visible in source explanations when it affects totals.

## Current Context

Existing patterns to reuse:

- Auth/access gate: `app/sync/page.tsx`, `lib/auth/access-control.ts`, `lib/auth/permissions.ts`, `lib/auth/roles.ts`.
- Settings permission: `settings:manage` is already granted only to `ADMIN` in `lib/auth/roles.ts`.
- Primary nav: `components/navigation/app-top-nav.tsx`.
- Giving summaries: `lib/giving/metrics.ts` and `components/people/giving-summary-panel.tsx`.
- Pledge analysis: `lib/giving/pledges.ts`, `app/people/[rockId]/actions.ts`, and `tests/unit/giving-pledges.test.ts`.
- List-view fund/account filters and row summaries: `lib/list-views/filter-catalog.ts`, `lib/list-views/people-list.ts`, `lib/list-views/households-list.ts`.
- Architecture boundary: `docs/architecture/person-household-profiles.md` says pledges are app-owned by person and Rock fund, and Rock/payment setup is not mutated.

Relevant model facts:

- `RockFinancialAccount` is the synced Rock fund/account table. It has `rockId`, `name`, `active`, `public`, `taxDeductible`, parent account, campus, sync timestamps, and relations to giving facts, scheduled details, pledges, and pledge decisions.
- `GivingFact.accountRockId` is nullable and is the current calculation join key.
- `GivingPledge.accountRockId` and `GivingPledgeRecommendationDecision.accountRockId` point at `RockFinancialAccount`.
- Current summary functions do not accept a fund scope; they query all facts for a person or household.
- `GivingLifecycleSnapshot` is a stored derived table used by list-view lifecycle filtering. It is currently refreshed after Rock sync by `refreshGivingLifecycleSnapshots()` in `lib/giving/lifecycle-snapshots.ts`.
- pg-boss currently manages Rock sync jobs in `lib/sync/jobs.ts`. A derived-calculation rebuild job can reuse that infrastructure instead of forcing long recalculation work inside a settings form request.

## Decisions

- Add an app-owned fund settings table keyed by `RockFinancialAccount.rockId`. Do not add local columns to `RockFinancialAccount`, because that table mirrors Rock.
- Treat fund settings as a platform-wide calculation and access boundary. Per-report or caller-level overrides are intentionally not supported.
- Preserve raw synced facts. Filtering should happen in query/service layers, not by deleting or mutating `GivingFact` rows.
- Default behavior should fail closed: if no funds have ever been configured, staff-facing giving calculations should return no fund-scoped giving values and should surface a clear "platform funds are not configured" state. Admin must save the platform fund set before giving totals, pledge recommendations, fund filters, dashboards, and API responses can expose giving values.
- Keep disabled funds visible on the Admin settings page so staff can re-enable them later. Other staff surfaces should hide disabled funds from selectors and must not expose disabled-fund giving values.
- Existing pledges for disabled funds should remain stored and visible in Admin settings or person pledge history context, but disabled funds should not generate new recommendations or appear as normal pledge-review rows.
- Source explanations should mention when totals use the configured platform fund set.
- Fund setting changes are calculation-boundary changes. Any stored derived rows that were computed from giving facts must be rebuilt, invalidated, or marked stale in the same product flow that saves the setting.
- The settings save path should not quietly leave stale derived data behind. Prefer enqueueing a singleton derived rebuild job after committing the setting change; for local/dev and tests, expose a direct rebuild function that can run synchronously.

## Proposed Data Model

Add `PlatformFundSetting`:

- `id`
- `accountRockId` unique relation to `RockFinancialAccount.rockId`
- `enabled` boolean
- `calculationScope` enum or boolean field for first pass. Prefer a simple `enabledForPlatform` boolean unless the implementation uncovers a clear need to separate "visible" from "calculated".
- `notes` optional short text for Admin context.
- `updatedByUserId` optional relation to `AppUser`.
- `createdAt`, `updatedAt`

Add indexes:

- Unique `accountRockId`.
- Index on `enabled`.
- Index on `updatedByUserId`.

Do not migrate existing Rock financial account data into a separate local fund catalog. The Rock mirror remains the catalog; the app setting is only a local eligibility overlay.

## Service Design

Create `lib/settings/funds.ts` as the single fund-settings service.

Responsibilities:

- `listPlatformFundSettings(actor)` returns all synced accounts plus current app setting state and usage counts needed by the settings UI.
- `updatePlatformFundSettings(input, actor)` validates `settings:manage`, validates account IDs against synced Rock accounts, persists enabled/disabled settings, and records updater metadata.
- `updatePlatformFundSettings(input, actor)` also detects whether the enabled fund set actually changed and, when it did, requests derived-calculation refresh work.
- `getPlatformFundScope(client)` returns either:
  - `mode: "UNCONFIGURED"` with an empty enabled-account set when no settings rows are enabled or disabled.
  - `mode: "CONFIGURED"` with enabled account IDs once staff have made an explicit selection.
- `whereForEnabledPlatformFunds()` or equivalent helper returns a Prisma-safe condition for `GivingFact.accountRockId`.
- `markFundScopedDerivedDataStale()` or equivalent records that derived fund-scoped rows need refresh if a queue is unavailable.

The service should centralize the fallback rule. Other modules should not implement their own "enabled funds" interpretation, and staff-facing APIs should not accept an option that bypasses this service.

## UI Design

Add `app/settings/funds/page.tsx` and supporting components under `components/settings/`.

Page behavior:

- Anonymous users redirect to `/auth/login`.
- Authenticated users without local access redirect to `/access-request`.
- Non-Admin local users receive a safe unauthorized state or redirect, matching existing app patterns.
- Admin users see a compact settings workspace with:
  - fund search by name or Rock ID
  - active/inactive filter
  - enabled count and total synced fund count
  - rows/cards for each Rock fund with name, Rock ID, active state, public/tax-deductible state, campus when available, recent giving usage count, and enabled toggle
  - save/apply action with pending and success/error states
  - clear warning when no funds are configured and staff-facing giving calculations are paused until Admin saves the platform fund set

The settings page should feel operational rather than like a marketing page: dense, clear hierarchy, direct controls, and no decorative hero.

Navigation:

- Update `components/navigation/app-top-nav.tsx` so Admin users can reach Settings.
- If the current nav component has no actor context, thread a `canManageSettings` prop from layouts/pages rather than making the nav fetch auth state itself.
- Keep Settings hidden from Finance and Pastoral Care navigation, while still enforcing permissions server-side.

## Calculation Integration

Update giving calculations so the enabled fund scope is applied consistently:

- `lib/giving/metrics.ts`
  - Apply enabled fund filtering in `getPersonGivingSummary()`, `getHouseholdGivingSummary()`, and dashboard trend functions such as `getHouseholdDonorTrend()`.
  - Preserve `summarizeGivingFacts()` as a pure function over supplied facts.
  - Add source explanation text when the configured fund set is active.
  - Do not add caller parameters that request disabled-fund or all-fund staff-facing totals.

- `lib/giving/pledges.ts`
  - Replace `findPledgeableFunds()` all-active-account behavior with enabled platform funds when configured.
  - Filter recent facts and candidate facts by enabled funds when configured.
  - Keep existing active/draft pledges for disabled funds from being mutated accidentally; recommendation creation should reject disabled funds.

- `lib/list-views/people-list.ts` and `lib/list-views/households-list.ts`
  - Limit fund/account filter options and fund summaries to enabled funds when configured.
  - Reject manually submitted disabled `accountRockId` filters for normal list queries once configuration exists.
  - Keep Pastoral Care amount protection unchanged.

- `components/people/giving-summary-panel.tsx`
  - No major UI change required beyond receiving scoped account summaries and source explanation text.

## API And GraphQL Integration

First implementation can use Server Actions for the settings page if that matches existing page patterns. GraphQL should expose read-only settings/status later only if an external consumer needs it.

GraphQL/API surfaces must honor the platform fund boundary. They should not expose an `includeDisabledFunds`, `allFunds`, raw-giving, or similar escape hatch for staff-facing consumers.

If GraphQL is extended in this slice:

- Add Admin-only queries/mutations in `lib/graphql/types/settings.ts`.
- Register them from `lib/graphql/schema.ts`.
- Require `settings:manage` for mutations.
- Avoid returning donor amounts from settings APIs; usage counts should be aggregate counts only.

## Derived Calculations And Jobs

Fund settings affect both live query-time summaries and stored derived rows. The first known stored surface is `GivingLifecycleSnapshot`, but the design should allow future static calculations such as monthly giving summaries, dashboard KPI snapshots, reliable monthly estimates, or pledge candidate queues to join the same refresh flow.

Required behavior:

- Saving fund settings must compare the previous enabled fund set to the new enabled fund set.
- If the effective set did not change, no rebuild job is needed.
- If the effective set changed, enqueue or run a singleton derived-calculation refresh.
- Stored derived rows must be computed using the same enabled-fund scope as live calculations.
- Until stale derived rows are refreshed, list views and APIs should avoid returning stale fund-derived classifications as if they are current. The first implementation can either rebuild immediately for small local data, enqueue a job and show a "refresh pending" state, or delete affected lifecycle snapshots so query-time fallback recomputes with the new scope.

Recommended first implementation:

- Add a derived refresh service, for example `lib/giving/derived-refresh.ts`, that refreshes fund-scoped stored calculations.
- Update `refreshGivingLifecycleSnapshots()` so its `givingFact.findMany()` query uses the enabled platform fund scope and fails closed when unconfigured.
- Add a pg-boss queue such as `GIVING_DERIVED_REFRESH_QUEUE` in `lib/sync/jobs.ts`, or create a dedicated `lib/jobs/` boundary if sync jobs are getting too crowded.
- Enqueue the derived refresh from `updatePlatformFundSettings()` after the settings transaction commits.
- Use singleton queue semantics so repeated toggle/save activity coalesces into one rebuild.
- Surface refresh status on the settings page: last refresh time, pending/running/failed state when available, and a manual "rebuild calculations" Admin action if the job failed.

Do not solve this by triggering a Rock resync. The Rock mirror is still valid; only app-owned derived calculations need to be recomputed against the new enabled fund boundary.

## Implementation Units

1. Data model and migration
   - Files: `prisma/schema.prisma`, `prisma/migrations/<timestamp>_add_platform_fund_settings/migration.sql`, `docs/architecture/data-model.md`.
   - Add `PlatformFundSetting` and any enum only if a boolean is insufficient.
   - Test scenarios:
     - Migration creates the setting table with a unique `accountRockId`.
     - `prisma migrate status` succeeds.
     - Existing synced Rock accounts are not modified.

2. Fund settings service
   - Files: `lib/settings/funds.ts`, `tests/unit/platform-fund-settings.test.ts`.
   - Implement listing, updating, fallback scope resolution, Prisma filter helper, and derived-refresh request hooks.
   - Test scenarios:
     - Admin can enable General Fund and Investment Fund.
     - Finance and Pastoral Care cannot update settings.
     - Unknown Rock account IDs are rejected.
     - No configured rows returns unconfigured/no-enabled-funds mode.
     - At least one configured row returns only enabled fund IDs.
     - No service option exists to bypass configured enabled funds for staff-facing calculations.
     - Changing the enabled fund set requests a derived-calculation refresh.
     - Saving the same enabled fund set does not enqueue duplicate refresh work.

3. Admin settings UI
   - Files: `app/settings/funds/page.tsx`, `app/settings/funds/actions.ts`, `components/settings/fund-settings.tsx`, `components/navigation/app-top-nav.tsx`, UI tests under `tests/unit/`.
   - Build the Admin-only page and nav entry.
   - Test scenarios:
     - Anonymous user is redirected to Auth0 login.
     - User needing access is redirected to access request.
     - Finance/Pastoral Care cannot render or submit settings changes.
     - Admin can see synced funds and save enabled state.
     - Unconfigured state is clearly represented.

4. Giving summary and dashboard filtering
   - Files: `lib/giving/metrics.ts`, `tests/unit/giving-metrics.test.ts`, dashboard tests if present.
   - Thread fund scope into database queries.
   - Test scenarios:
     - Unconfigured mode returns no giving totals and prompts configuration instead of exposing all-fund values.
     - Configured mode excludes disabled fund facts from person and household totals.
     - Account summaries include enabled funds only.
     - Source explanation changes when configured scope is active.
     - Callers cannot request all-fund totals once configured mode is active.
     - Pastoral Care still receives hidden giving amounts through profile services.

5. Pledge analysis filtering
   - Files: `lib/giving/pledges.ts`, `tests/unit/giving-pledges.test.ts`, `tests/unit/person-profile-page.test.tsx`.
   - Use enabled funds for recommendation rows and mutation validation.
   - Test scenarios:
     - Disabled active Rock funds do not generate pledge rows or candidates.
     - Existing active/draft pledges on disabled funds are not quick-created or overwritten.
     - Recommendation mutation rejects disabled fund IDs.
     - Unconfigured mode returns no pledge recommendation rows.

6. List-view fund filtering
   - Files: `lib/list-views/filter-catalog.ts`, `lib/list-views/people-list.ts`, `lib/list-views/households-list.ts`, relevant list-view tests.
   - Scope account filters and summaries to enabled funds.
   - Test scenarios:
     - Enabled fund IDs can be filtered by Admin/Finance.
     - Disabled fund IDs are rejected once platform funds are configured.
     - Pastoral Care still cannot use amount filters or see amount-derived explanations.
     - Unconfigured mode exposes no fund filter options and no fund-derived rows.
     - No submitted filter or query parameter can force disabled-fund results once configured.

7. Derived calculation refresh
   - Files: `lib/giving/lifecycle-snapshots.ts`, `lib/giving/derived-refresh.ts`, `lib/sync/jobs.ts` or a new job module, relevant scripts if a manual CLI is added, tests under `tests/unit/` and `tests/integration/`.
   - Recompute stored fund-scoped rows after fund settings change.
   - Test scenarios:
     - Lifecycle snapshots are built from enabled funds only.
     - Disabled-fund facts do not create lifecycle labels after refresh.
     - Unconfigured mode clears or withholds fund-derived lifecycle snapshots.
     - A changed fund setting enqueues one singleton derived refresh job.
     - A failed queued refresh leaves a visible retryable status rather than silently serving stale rows.
     - Rock sync still refreshes lifecycle snapshots with the enabled fund boundary after syncing new facts.

8. Documentation and verification
   - Files: `docs/architecture/person-household-profiles.md`, `docs/architecture/data-model.md`, possibly `docs/solutions/` after implementation.
   - Document that Rock sync remains complete, while platform calculations and stored derived rows are fund-scoped.
   - Verification:
     - `pnpm format:check`
     - `pnpm typecheck`
     - `pnpm lint`
     - `pnpm test`
     - `pnpm prisma migrate status`
     - `pnpm build`

## Risks And Mitigations

- Misleading totals after configuration: Make source explanations explicit and add tests proving disabled funds are excluded.
- Empty totals immediately after deployment: Fail closed with a clear Admin configuration prompt until staff saves an explicit fund set.
- Hidden data leakage through filters: Keep Pastoral Care amount protections unchanged and reject disabled fund filters server-side.
- Divergent service behavior: Route all fund-scope decisions through `lib/settings/funds.ts`.
- Accidental bypass through future callers: Do not add opt-out parameters to staff-facing calculation services, and test API/list/profile paths against disabled-fund fixtures.
- Stale stored calculations after a settings change: Compare old/new enabled sets, enqueue a singleton derived refresh, and make pending/failed refresh state visible to Admin users.
- Existing pledges on disabled funds: Preserve records, but do not create new recommendations or quick-create pledges for disabled funds.
- Sync drift: Rock account activity/name changes should update through normal sync; app settings remain keyed by Rock ID and continue to apply.

## Open Questions

- Should "available across the platform" also control future communication audiences, or only giving calculations and pledge/list/report surfaces for now?
- Should the first settings page support parent/child account grouping if the Rock fund catalog has nested funds, or is a flat searchable list enough for the first pass?
- Should General Fund and Investment Fund be enabled through seed data once their Rock IDs are known, or should an Admin choose them manually in the UI?
- Should the first derived refresh use the existing pg-boss sync worker process, or should we split app-owned calculation jobs into a separate worker namespace before adding more derived tables?
