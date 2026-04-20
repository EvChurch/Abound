---
title: "feat: Add advanced people and household list views"
type: feat
status: active
date: 2026-04-20
origin:
  - docs/brainstorms/2026-04-17-church-giving-management-requirements.md
  - docs/design.md
  - docs/architecture/person-household-profiles.md
---

# feat: Add Advanced People and Household List Views

## Overview

Build staff-facing People and Households list views with advanced filtering, lifecycle segments, configurable columns, saved views, cursor pagination, and an optional infinite-scroll presentation. This is the directory/search counterpart to the existing person and household profile slice.

The feature should feel like a high-end CRM list-view workspace: fast scanning, saved operational views, role-aware data visibility, and clear links into record profiles. Rock remains the source of truth for people, households, campuses, groups, gifts, and Rock-owned giving fields. This app owns only derived lifecycle metrics, saved view preferences, workflow/task data, and the staff list-view experience.

## Problem Frame

The app now has staff profile pages for a known Rock person or household, but broad people and household discovery was intentionally deferred in `docs/architecture/person-household-profiles.md` because it needed separate privacy and UX decisions. Staff need a way to surface cohorts such as dropped, at risk, reactivated, and new donors without exporting spreadsheets or memorizing Rock IDs.

The list view must support finance-heavy analysis and pastoral follow-up while keeping role boundaries intact:

- Admin and Finance can use numeric giving filters, giving columns, giving sorts, and amount-bearing exports.
- Pastoral Care can use care-context lifecycle signals such as "giving pattern changed" or "follow-up suggested", but must not see individual giving amounts, individual aggregates, amount thresholds, or amount-derived explanations that reveal hidden values.

## Scope

In scope:

- People and Households list pages.
- Shared advanced filter system for both resources.
- Lifecycle filters for dropped, at risk, reactivated, and new.
- Filters for campus, household status, person status, email availability, Connect Group participation, giving recency, recurring-gift health, task state, pledge state, fund/account, and role-permitted giving amount ranges.
- Cursor-based pagination with stable sorting and an optional infinite-scroll UI mode.
- User-customizable visible columns, sort order, density, and page size.
- Private saved views per local app user, plus a data model that can later support shared team views.
- GraphQL list-view API contracts.
- Explainable filter and lifecycle matching.
- Unit, GraphQL, and UI tests for query correctness, permissions, saved views, and pagination.

Out of scope:

- Editing Rock people, households, gifts, recurring gifts, payment setup, or Rock groups.
- Donor-facing directory/list views.
- Autonomous AI communication or financial decisions.
- Bulk email sending. A later communication-prep slice can consume saved views as an audience input.
- Full admin UI for sharing/managing global saved views. This plan designs the model for it but starts with private saved views.
- Raw transaction drill-downs from the list view.

## Requirements Trace

- R1, R2: Rock-owned data stays read-only and authoritative. List views read local synced mirrors and derived app-owned metrics only.
- R4: Rows should include Rock IDs and sync freshness metadata where useful.
- R5: Staff can view donor lifecycle movement, giving segments, and operational exceptions.
- R6: Staff can filter by task state and link list results into follow-up work.
- R7: Saved views can later feed communication preparation, but do not send communications in this unit.
- R8: Lifecycle and filter matches should expose reviewable, role-safe explanations.
- R12, R14: Donor identity and giving data stay sensitive; amount-bearing filters/columns/exports require finance permission.
- R13, R16: Auth0 login alone is not access. All list and saved-view operations require active local app authorization.

## Current Context

Existing patterns to reuse:

- Auth and role checks: `lib/auth/roles.ts`, `lib/auth/permissions.ts`, `lib/graphql/context.ts`.
- Profile services and projections: `lib/people/profiles.ts`.
- GraphQL type registration pattern: `lib/graphql/types/people.ts`, `lib/graphql/schema.ts`.
- Giving aggregation helpers: `lib/giving/metrics.ts`.
- Staff task service: `lib/tasks/service.ts`.
- Profile pages: `app/people/[rockId]/page.tsx`, `app/households/[rockId]/page.tsx`.
- Existing lookup shells: `app/people/page.tsx`, `app/households/page.tsx`.
- Design direction: `docs/design.md` and `docs/architecture/person-household-profiles.md`.
- Data ownership and sync rules: `docs/architecture/data-model.md`.

Relevant model facts:

- `RockPerson.primaryCampusRockId`, `RockHousehold.campusRockId`, and `GivingFact.campusRockId` can all matter for campus filtering, depending on whether the user means person campus, household campus, or giving/fund campus.
- `GivingFact` has `personRockId`, `householdRockId`, `accountRockId`, `campusRockId`, `amount`, `effectiveMonth`, `occurredAt`, and `reliabilityKind`.
- `RockFinancialScheduledTransaction` and scheduled details can support recurring-gift health signals, but this app must not mutate scheduled giving setup.
- `RockGroupMember.activeConnectGroup` supports small-group/Connect Group filtering.
- `StaffTask` can link to a person or household and supports status, priority, assigned user, and due date filtering.

## Decisions

- Use one shared filter engine with resource-specific field catalogs. People and Households should not grow separate query syntaxes that drift over time.
- Store saved views as app-owned records linked to local `AppUser`, not to Rock users.
- Represent filter definitions as structured JSON validated by a typed schema. Avoid ad hoc SQL snippets, string-concatenated filters, or exposing Prisma where clauses directly to the browser.
- Use cursor pagination as the API primitive. The UI can offer classic paginated controls and infinite scrolling over the same connection contract.
- Start lifecycle metrics as app-derived, explainable snapshots. Do not recompute expensive rolling-window cohort logic inside every list query once the definitions stabilize.
- Keep lifecycle definitions configurable in code for the first pass and document the defaults. A settings UI for definitions can come later after staff use the first version.
- Treat amount filters as sensitive. Admin/Finance may filter/sort/display numeric giving values. Pastoral Care may filter by role-safe lifecycle labels but not by specific amount thresholds.
- Prefer list rows that carry enough summary fields for scanning, then link to profile pages for deeper context.
- Keep exports out of the first UI unless the implementation includes the same permission, audit, and masking rules as the on-screen table.

## Lifecycle Definitions

Initial default definitions should be explicit and test-covered. Exact thresholds can change after staff review, but the first implementation needs stable semantics:

- `NEW`: first gift within the selected comparison window, with no prior giving facts before that window.
- `REACTIVATED`: had prior giving, had no giving in a configured dormant window, then gave again in the selected current window.
- `AT_RISK`: has a recurring or historically consistent pattern, but expected giving is late or materially below the previous comparable period.
- `DROPPED`: previously active giver with no giving beyond the configured drop window.

Recommended first default windows:

- Current window: trailing 90 days.
- Prior comparison window: the 90 days before the current window.
- Dormant/reactivation window: no giving in the 180 days before the current window.
- Dropped window: no giving in the trailing 180 days after previous activity.
- At-risk recurring grace: expected gift is at least 30 days late or two expected intervals late, whichever is more conservative.

Each lifecycle result should include a role-safe explanation:

- Admin/Finance: may include comparison totals, last gift date, expected cadence, and amount deltas.
- Pastoral Care: may include non-numeric explanations such as "previously consistent giving appears interrupted" and "recent giving activity resumed", but not dollar values or threshold amounts.

## Filter Catalog

People filters:

- Name/email search.
- Rock person ID.
- Record status.
- Deceased flag.
- Email present and email active.
- Primary campus.
- Primary household.
- Giving household.
- Household role/status.
- Active Connect Group participation.
- Staff task status, priority, assignee, due date.
- Lifecycle labels: new, reactivated, at risk, dropped.
- Giving recency windows.
- Giving reliability kind: one-off, scheduled recurring, inferred recurring, pledge.
- Fund/account participation.
- Pledge state.
- Admin/Finance only: total given range, last gift amount range, trailing-period amount range, amount change range.

Household filters:

- Household name search.
- Rock household ID.
- Household active/archived state.
- Campus.
- Member count range.
- Has active email-capable member.
- Has active Connect Group member.
- Staff task status, priority, assignee, due date.
- Lifecycle labels at household/giving-group level.
- Giving recency windows.
- Giving reliability kind.
- Fund/account participation.
- Pledge coverage for household members.
- Admin/Finance only: household total given range, last gift amount range, trailing-period amount range, amount change range.

Filter groups:

- Support `all` and `any` groups.
- Support nested groups at least two levels deep.
- Support operators appropriate to field type: equals, in, contains, exists, between, before, after, less than, greater than.
- Support relative date operands such as trailing 30/90/180/365 days and absolute dates.
- Reject unsupported field/operator combinations with safe validation errors.

## List Row Contract

People rows should support:

- Rock person ID.
- Display name.
- Photo URL when available and authorized.
- Email state.
- Primary campus.
- Primary/giving household summary.
- Lifecycle labels.
- Last activity/giving signal.
- Open task count and next due task.
- Sync freshness.
- Admin/Finance columns: total given, trailing-period total, last gift date, last gift amount, recurring health, funds.

Household rows should support:

- Rock household ID.
- Household name.
- Campus.
- Active/archived state.
- Member count and primary contacts.
- Lifecycle labels.
- Last activity/giving signal.
- Open task count and next due task.
- Sync freshness.
- Admin/Finance columns: household total given, trailing-period total, last gift date, last gift amount, recurring health, funds.

Pastoral Care rows should replace amount columns with care-oriented non-numeric columns:

- Lifecycle labels.
- "Giving pattern changed" style signal.
- Follow-up suggested state.
- Open tasks and communication workflow state.
- Household/person context needed for care.

## Proposed Data Model

Add app-owned records:

- `SavedListView`
  - `id`
  - `ownerUserId`
  - `resource`: `PEOPLE` or `HOUSEHOLDS`
  - `name`
  - `description`
  - `visibility`: start with `PRIVATE`; reserve `TEAM` and `GLOBAL`
  - `filterDefinition` JSON
  - `sortDefinition` JSON
  - `columnDefinition` JSON
  - `density`: `COMFORTABLE` or `COMPACT`
  - `pageSize`
  - `isDefault`
  - `createdAt`, `updatedAt`

- `GivingLifecycleSnapshot`
  - `id`
  - `resource`: `PERSON` or `HOUSEHOLD`
  - `personRockId` nullable
  - `householdRockId` nullable
  - `lifecycle`: `NEW`, `REACTIVATED`, `AT_RISK`, `DROPPED`
  - `windowStartedAt`, `windowEndedAt`
  - role-safe `summary`
  - finance-only `detail` JSON with amount-bearing evidence
  - `computedAt`
  - `lastSyncRunId`

Implementation can begin by computing lifecycle in a service if that is faster, but the plan should prefer snapshots before the list grows beyond trivial data sizes. Lifecycle snapshot rows are derived app data and may be regenerated after sync; they are not Rock source records.

## Proposed GraphQL Contract

Queries:

- `peopleListView(input: PeopleListInput!): PeopleConnection!`
- `householdsListView(input: HouseholdListInput!): HouseholdConnection!`
- `listViewFilterCatalog(resource: ListViewResource!): ListViewFilterCatalog!`
- `savedListViews(resource: ListViewResource!): [SavedListView!]!`
- `savedListView(id: ID!): SavedListView`

Mutations:

- `createSavedListView(input: SavedListViewInput!): SavedListView!`
- `updateSavedListView(id: ID!, input: SavedListViewInput!): SavedListView!`
- `deleteSavedListView(id: ID!): Boolean!`
- `setDefaultSavedListView(id: ID!): SavedListView!`

Connection behavior:

- Use `first` and `after` for forward pagination.
- Enforce default page size and hard maximum page size.
- Include `totalCount` only when the implementation can compute it cheaply enough or behind an explicit `includeTotalCount` flag.
- Include `pageInfo.hasNextPage`, `pageInfo.endCursor`, and `appliedView`.

Authorization behavior:

- Anonymous callers receive `UNAUTHENTICATED`.
- Auth0 users without active local access receive `FORBIDDEN`.
- Users without people/care permissions cannot read list views.
- Amount filter fields, amount columns, and amount sorts are omitted from the filter catalog for Pastoral Care and rejected if submitted manually.
- Saved views must be revalidated against the current actor role at read time, because a user's role can change after the saved view was created.

## UX Direction

People and Households should use the same page shell:

- Object header with count/freshness summary and primary saved-view selector.
- Search box for name/email/household text.
- Filter button opening an advanced filter builder.
- Active filter chips with quick remove.
- Saved view menu: save current view, save as new view, rename, reset, set default, delete.
- Column picker with role-aware field availability.
- Density toggle.
- Sort menu and direct sortable table headers.
- Table with sticky header and stable column widths.
- Row click opens the profile page.
- Optional right inspector for selected row preview on desktop.
- Pagination footer by default, with an infinite-scroll toggle or preference using the same cursor connection.

Advanced filter builder:

- Uses grouped conditions, not a raw query language.
- Shows field type, operator, and value controls.
- Makes role restrictions visible by omitting unavailable fields and showing a concise unavailable state if an existing saved view contains now-forbidden fields.
- Supports reusable quick filters for `New`, `Reactivated`, `At risk`, `Dropped`, `Open tasks`, `No active email`, and `Campus`.

## Implementation Units

- [x] **Unit 1: Define Filter Schema and Lifecycle Semantics**

Goal: Create a typed filter definition and lifecycle definition layer that is shared by People and Households.

Files:

- Create: `lib/list-views/filter-schema.ts`
- Create: `lib/list-views/filter-catalog.ts`
- Create: `lib/giving/lifecycle.ts`
- Test: `tests/unit/list-view-filter-schema.test.ts`
- Test: `tests/unit/giving-lifecycle.test.ts`

Approach:

- Define resource types, field types, operators, condition groups, sort definitions, and column definitions.
- Validate submitted filters before they reach Prisma.
- Encode lifecycle definitions with explicit date windows and role-safe explanation builders.
- Add field metadata for permissions, supported operators, value source, and display label.

Test scenarios:

- Valid nested filter groups pass validation.
- Unsupported field/operator combinations fail safely.
- Amount fields are unavailable without `finance:read_amounts`.
- Lifecycle classification covers new, reactivated, at risk, dropped, and no-status cases.
- Pastoral Care explanations contain no numeric amounts.

Progress note 2026-04-20:

- Added `lib/list-views/filter-schema.ts` with grouped condition validation, typed operators, field-type value checks, relative date values, and safe forbidden-field errors for amount-like fields.
- Added `lib/list-views/filter-catalog.ts` with role-aware People and Households filter catalogs that omit finance-only amount fields for Pastoral Care.
- Added `lib/giving/lifecycle.ts` with default lifecycle window semantics and role-safe explanations for `NEW`, `REACTIVATED`, `AT_RISK`, and `DROPPED`.
- Added `tests/unit/list-view-filter-schema.test.ts` and `tests/unit/giving-lifecycle.test.ts`.

- [x] **Unit 2: Add Saved View and Lifecycle Snapshot Models**

Goal: Persist app-owned saved views and derived lifecycle snapshots.

Files:

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_list_views_and_lifecycle_snapshots/migration.sql`
- Modify if generated: `lib/graphql/pothos-prisma-types.ts`
- Test: `tests/integration/prisma-migrations.test.ts`

Approach:

- Add enums and models for saved list views and lifecycle snapshots.
- Index saved views by owner/resource/default state.
- Index lifecycle snapshots by resource, lifecycle, person/household Rock ID, window end, and sync run.
- Keep lifecycle evidence split between role-safe summary and finance-only detail.

Test scenarios:

- Migration creates expected tables, enums, indexes, and foreign keys.
- Saved views cascade or restrict on local user deletion according to the app's auth data retention decision.
- Snapshot rows can link to sync runs and Rock person/household IDs without making Rock rows locally owned.

Progress note 2026-04-20:

- Added `SavedListView` with owner, resource, visibility, filter/sort/column JSON definitions, density, page size, default flag, and private/team/global-ready indexing.
- Added `GivingLifecycleSnapshot` with person/household Rock links, lifecycle kind, window bounds, role-safe summary, optional finance detail JSON, sync run traceability, and list-query indexes.
- Added `prisma/migrations/20260420000100_add_list_views_and_lifecycle_snapshots/migration.sql`.
- Regenerated Prisma/Pothos types in `lib/graphql/pothos-prisma-types.ts`.
- Extended `tests/integration/prisma-migrations.test.ts` for saved view and lifecycle snapshot migration coverage.

- [ ] **Unit 3: Build List Query Services**

Goal: Convert validated filters into bounded, permission-aware list results.

Files:

- Create: `lib/list-views/people-list.ts`
- Create: `lib/list-views/households-list.ts`
- Create: `lib/list-views/cursors.ts`
- Create: `lib/list-views/saved-views.ts`
- Test: `tests/unit/people-list-view.test.ts`
- Test: `tests/unit/households-list-view.test.ts`
- Test: `tests/unit/saved-list-views.test.ts`

Approach:

- Require active local staff actor.
- Apply role-aware filter catalog before query construction.
- Use Prisma structured query APIs and controlled aggregate queries; do not build SQL from user strings.
- Use stable cursor ordering with deterministic tie-breakers such as `rockId`.
- Return deliberate DTOs instead of raw Prisma rows.
- Include role-aware row projection for amount-bearing fields.

Test scenarios:

- Campus, lifecycle, task, status, giving recency, and Connect Group filters return expected records.
- Amount filters work for Admin/Finance and are rejected for Pastoral Care.
- Cursor pagination is stable across pages.
- Sorting uses deterministic tie-breakers.
- Saved views are scoped to the current local app user.
- A saved view created under Finance permissions is safely revalidated if the user later becomes Pastoral Care.

Progress note 2026-04-20:

- Added cursor helpers in `lib/list-views/cursors.ts`.
- Added saved view service behavior in `lib/list-views/saved-views.ts`, including owner scoping, default view clearing, page-size validation, and role revalidation.
- Added first People and Households list services in `lib/list-views/people-list.ts` and `lib/list-views/households-list.ts`.
- Added `tests/unit/saved-list-views.test.ts`.
- Lifecycle filter evaluation is intentionally not marked complete yet: the first relation-based query caused a runtime Prisma client mismatch in local dev, so the live list path now avoids selecting or filtering through the new lifecycle relation until migration/client refresh is fully verified.

- [ ] **Unit 4: Expose GraphQL List View API**

Goal: Add a list-view contract without leaking Prisma models or forbidden filter fields.

Files:

- Create: `lib/graphql/types/list-views.ts`
- Modify: `lib/graphql/schema.ts`
- Test: `tests/integration/graphql-api.test.ts`

Approach:

- Register filter input types, saved view types, row types, and connection/page-info types.
- Expose catalog, list, and saved-view operations.
- Use safe error codes for invalid filters, forbidden fields, and missing saved views.
- Keep default and maximum page sizes aligned with the service layer.

Test scenarios:

- Authorized staff can fetch People and Households connections.
- Pastoral Care receives a catalog without amount filters or amount columns.
- Manually submitting forbidden amount filters returns a safe `FORBIDDEN` or `BAD_USER_INPUT` error.
- Saved views can be created, updated, deleted, and set as default by their owner.
- Cursor pagination returns stable `endCursor` and `hasNextPage`.

Progress note 2026-04-20:

- Added `lib/graphql/types/list-views.ts` and registered it from `lib/graphql/schema.ts`.
- Exposed filter catalog, People/Households list connections, and saved-list-view mutations.
- Filter/view JSON currently crosses GraphQL as JSON strings while service-level validation owns the actual structured contract.

- [ ] **Unit 5: Build People and Household List UI**

Goal: Replace Rock-ID-only lookup pages with operational list views.

Files:

- Modify: `app/people/page.tsx`
- Modify: `app/households/page.tsx`
- Create: `components/list-views/list-view-shell.tsx`
- Create: `components/list-views/filter-builder.tsx`
- Create: `components/list-views/saved-view-menu.tsx`
- Create: `components/list-views/column-picker.tsx`
- Create: `components/list-views/list-table.tsx`
- Test: `tests/unit/people-list-page.test.tsx`
- Test: `tests/unit/households-list-page.test.tsx`

Approach:

- Follow the existing staff access-state pattern.
- Server-render the initial view using the current user's default saved view or a role-safe default.
- Use client components for filter editing, saved view actions, column picking, and infinite-scroll loading.
- Keep table columns stable and responsive.
- Link rows to `app/people/[rockId]/page.tsx` and `app/households/[rockId]/page.tsx`.
- Show sync freshness and empty states that explain whether no records matched or data is unavailable.

Test scenarios:

- Anonymous users are redirected to Auth0 login.
- Authenticated users without local access are redirected to the access request flow.
- Admin/Finance see amount-capable columns when selected.
- Pastoral Care does not see amount columns and sees care-safe lifecycle signals.
- Filter chips, saved view selection, and column choices render from the supplied catalog.
- Infinite scroll fetches the next cursor without duplicating rows.
- Pagination footer remains usable when infinite scroll is off.

Progress note 2026-04-20:

- Replaced Rock-ID-only lookup pages with People and Households list pages backed by the list services.
- Added shared list components under `components/list-views/`.
- Removed visible record-ID search and record-ID display from the People and Households list pages after stakeholder feedback. Internal route identifiers still power profile links, but the pages do not show or invite searching by those IDs.

- [ ] **Unit 6: Add Lifecycle Snapshot Refresh**

Goal: Keep lifecycle filters fast and explainable after sync.

Files:

- Create: `lib/giving/lifecycle-snapshots.ts`
- Modify: `lib/sync/run-sync.ts`
- Optional create: `scripts/recompute-lifecycle-snapshots.ts`
- Test: `tests/unit/lifecycle-snapshots.test.ts`
- Test: `tests/integration/rock-sync.test.ts`

Approach:

- Recompute lifecycle snapshots after a successful or partial sync where giving facts changed.
- Support a manual recompute command for development and recovery.
- Store snapshots with sync run traceability.
- Make recomputation idempotent for the same window and resource.

Test scenarios:

- Snapshot refresh creates expected person and household lifecycle rows.
- Re-running refresh for the same window does not duplicate active snapshot rows.
- Partial sync behavior is explicit and does not erase prior lifecycle evidence without replacement.
- Snapshot explanations preserve role-safe and finance-only boundaries.

Progress note 2026-04-20:

- Added `lib/giving/lifecycle-snapshots.ts` and `tests/unit/lifecycle-snapshots.test.ts`.
- Hooked snapshot refresh after successful/partial sync persistence in `lib/sync/run-sync.ts`.
- Snapshot refresh is non-blocking when the target database has not applied the lifecycle snapshot migration yet or when tests use a narrow Prisma mock without the new delegate.

## Verification Plan

Expected verification for the full feature:

- `pnpm prisma:generate`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test -- tests/unit/list-view-filter-schema.test.ts tests/unit/giving-lifecycle.test.ts tests/unit/people-list-view.test.ts tests/unit/households-list-view.test.ts tests/unit/saved-list-views.test.ts tests/unit/people-list-page.test.tsx tests/unit/households-list-page.test.tsx tests/integration/graphql-api.test.ts tests/integration/prisma-migrations.test.ts tests/integration/rock-sync.test.ts`
- `pnpm build`

Browser verification should cover:

- People list desktop and mobile.
- Households list desktop and mobile.
- Advanced filter builder.
- Saved view menu.
- Column picker.
- Pagination and infinite-scroll modes.
- Pastoral Care role masking.

## Risks and Open Questions

- Lifecycle thresholds are product decisions, not purely technical facts. The first defaults should be treated as reviewable and easy to revise.
- Campus filtering needs clear labels because person campus, household campus, giving campus, and fund campus can differ.
- Amount filtering can leak sensitive information through audience membership. The first implementation must keep numeric filters Admin/Finance-only and should avoid showing small-audience amount-derived explanations to Pastoral Care.
- `totalCount` can become expensive with complex filters. Prefer cursor-first results and compute counts only when performance is acceptable.
- Saved shared/team views will need ownership, role compatibility, and moderation decisions. Private saved views are enough for the first implementation.
- Infinite scroll should not be the only navigation model because staff doing finance work often need stable pages, counts, and location memory.

## Future Extensions

- Shared team/global saved views with Admin moderation.
- Saved view audience handoff into Communications.
- Bulk task creation from selected rows with confirmation and audit logging.
- AI-assisted "explain this segment" summaries using role-safe evidence.
- Export workflows with permission checks, audit events, and masking.
- Natural-language-to-filter drafting as an assistive feature, with staff review before applying.
