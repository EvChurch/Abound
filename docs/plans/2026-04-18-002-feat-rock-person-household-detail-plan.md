---
title: "feat: Add Rock person and household detail slice"
type: feat
status: active
date: 2026-04-18
origin: docs/brainstorms/2026-04-17-church-giving-management-requirements.md
---

# feat: Add Rock Person and Household Detail Slice

## Overview

Build the first staff-facing profile slice over synced Rock people and households. Staff should be able to inspect a synced Rock person or household, understand the household/giving-group context, see related local workflow tasks, and see giving summary data only when their local role permits it.

This is a product slice on top of the GraphQL boundary from `docs/architecture/api-boundary.md`. Rock remains the source of truth. The app reads local mirror rows and app-owned workflow rows; it must not mutate Rock-owned records or invent donor/payment state.

## Problem Frame

The app can now sync Rock data and expose staff-safe GraphQL operations, but staff still cannot answer the basic operational question: "Who is this person or household, and what context do we have locally?" Without a person/household detail surface, later giving dashboards, task workflows, and communication prep have nowhere coherent to link.

The slice should prove the staff profile pattern without racing into full giving analytics. It should expose enough identity, household, campus, membership, task, and role-aware giving summary context to make the synced Rock mirror useful.

## Scope

In scope:

- Add a domain service that returns safe person and household profile DTOs from synced Rock mirror tables.
- Add role-aware amount visibility:
  - Admin and Finance can see giving amount summaries.
  - Pastoral Care can see care/context details but not giving amounts or individual giving aggregates.
- Add GraphQL fields for person and household detail by Rock ID.
- Add a small staff UI for person/household profile pages.
- Show related app-owned staff tasks for the selected person or household.
- Add enough empty/error states for missing sync data, missing records, and forbidden access.
- Add focused unit, GraphQL integration, and UI tests.
- Document the profile contract and privacy behavior.

Out of scope:

- Editing Rock person, household, giving, payment, or recurring gift data.
- Donor-facing profile pages.
- Payment method, payment processor, or recurring gift management.
- Full donor lifecycle segmentation or broad dashboard metrics.
- AI summaries or communication drafting.
- Bulk people search beyond a narrow first lookup/navigation path.
- New Rock API endpoints or live Rock reads in request/response paths.

## Requirements Trace

- R1, R2: Rock remains authoritative; this slice reads synced Rock mirror rows and local workflow rows only.
- R4: Profile data should preserve Rock IDs and source sync timestamps where useful for staff trust and traceability.
- R5: This creates the first profile surface that later giving dashboards can link into.
- R6: Staff tasks attached to a person or household should be visible from the profile.
- R8: Giving summaries should identify the source as derived `GivingFact` rows and avoid unexplained raw transaction exposure.
- R12, R14: Donor identity and giving history are sensitive. Amounts and aggregates require local role permission, and raw payment details remain absent.
- R13, R16: Auth0 login is not authorization. Profile fields require an active local `AppUser` and local role permissions.

## Current Context

Existing code to reuse:

- Auth and local roles: `lib/auth/access-control.ts`, `lib/auth/roles.ts`, `lib/auth/permissions.ts`
- GraphQL boundary: `app/api/graphql/route.ts`, `lib/graphql/context.ts`, `lib/graphql/schema.ts`
- Existing GraphQL type pattern: `lib/graphql/types/sync.ts`, `lib/graphql/types/tasks.ts`
- Prisma client: `lib/db/prisma.ts`
- Rock mirror schema: `prisma/schema.prisma`
- Giving grouping helpers: `lib/giving/models.ts`
- Task domain service: `lib/tasks/service.ts`
- Existing staff page patterns: `app/page.tsx`, `app/sync/page.tsx`, `components/sync/sync-status.tsx`
- Sync boundary documentation: `docs/architecture/data-model.md`

Relevant model facts:

- `RockPerson.rockId` is the Rock person ID and primary key.
- `RockPerson.primaryFamilyRockId` preserves Rock `People.PrimaryFamilyId`.
- `RockPerson.givingGroupRockId` preserves Rock `People.GivingGroupId` and should be preferred for giving rollups.
- `RockHousehold.rockId` is the Rock family group ID.
- `RockHouseholdMember` connects people to households and carries role/status/archive metadata.
- `GivingFact` stores derived giving rows with `personRockId`, `householdRockId`, `amount`, `effectiveMonth`, and `explanation`.
- `StaffTask` and `CommunicationPrep` can link to person or household Rock IDs as app-owned workflow records.

Institutional learnings to follow:

- `docs/solutions/best-practices/rock-sync-local-mirror-and-test-database-boundaries-2026-04-17.md`: use Rock IDs as mirror primary keys, keep app-owned records on local IDs, and do not mix fixture/live data.
- `docs/solutions/security-issues/nextjs-auth0-prisma-auth-foundation-guardrails-2026-04-17.md`: every staff surface must resolve local access state and enforce local authorization, not Auth0 identity alone.

## Decisions

- Build both person and household detail in the same slice. A person profile needs household context to be useful, and a household profile needs member context; splitting them would force a second near-identical boundary pass.
- Prefer a domain service over Prisma queries inside GraphQL resolvers or pages. The service owns permission-aware projection, not the transport layer.
- Use role-aware nullability for sensitive fields. Pastoral Care should receive `null` for giving amount summaries rather than a disguised zero.
- Start with read-by-Rock-ID detail fields. A broader search/list can follow after the detail contract is stable. The UI may include a simple Rock ID lookup form for navigation, but not a full directory search yet.
- Keep transaction-level detail out of the first slice. Summaries from `GivingFact` are enough to prove the profile and reduce privacy risk.
- Use `GivingFact.householdRockId` for household summaries and `GivingFact.personRockId` only for person-visible summaries when the role permits individual aggregates.
- Expose task links from the existing `StaffTask` service or a profile-specific read path, but do not add new mutations in this slice.
- Keep UI server-rendered first. Client components should be used only for interactive lookup/navigation if needed.

## Design Direction

Use `tmp/Rock Record Detail _standalone_.html` as the visual reference, but implement it through the app's Tailwind system rather than copying the standalone prototype runtime.

The target style is a warm staff console:

- warm paper app background
- ivory panels with thin muted borders
- compact monospace labels for Rock IDs, source metadata, and section eyebrows
- ink-colored headings and restrained muted body text
- muted blue links, focus states, and active accents
- dense tables for memberships and tasks
- explicit hidden-amount panels for Pastoral Care

Avoid donor-facing CRM polish, decorative hero imagery, large promotional copy, or broad directory search. The page should feel like a trustworthy staff record view.

## Proposed Contract

GraphQL query fields:

- `rockPerson(rockId: Int!): RockPersonProfile`
- `rockHousehold(rockId: Int!): RockHouseholdProfile`

Core person fields:

- `rockId`
- `displayName`
- `firstName`
- `nickName`
- `lastName`
- `email`
- `emailActive`
- `deceased`
- `recordStatus`
- `primaryCampus`
- `primaryHousehold`
- `givingHousehold`
- `householdMemberships`
- `givingSummary` (nullable when role cannot see giving amounts)
- `staffTasks`
- `lastSyncedAt`

Core household fields:

- `rockId`
- `name`
- `active`
- `archived`
- `campus`
- `members`
- `givingPeople`
- `givingSummary` (nullable when role cannot see giving amounts)
- `staffTasks`
- `lastSyncedAt`

Giving summary should stay compact:

- `totalGiven`
- `firstGiftAt`
- `lastGiftAt`
- `lastGiftAmount`
- `monthsWithGiving`
- `reliabilityKinds`
- `sourceExplanation`

The exact GraphQL names can shift during implementation if Pothos naming conventions suggest a cleaner shape, but the privacy semantics should not shift without updating this plan.

## Implementation Units

- [x] **Unit 1: Add Profile Domain Service**

Goal: Centralize person/household profile reads and role-aware projection.

Files:

- Create: `lib/people/profiles.ts`
- Optional create: `lib/people/models.ts`
- Test: `tests/unit/people-profiles.test.ts`

Approach:

- Add `getRockPersonProfile({ rockId }, actor)` and `getRockHouseholdProfile({ rockId }, actor)`.
- Require a local active actor before any profile read.
- Allow profile reads when the actor has either `people:read_limited` or `people:read_care_context`.
- Derive `canSeeGivingAmounts` and `canSeeIndividualGivingAggregates` from `lib/auth/roles.ts`.
- Select only fields needed for the profile. Avoid returning raw Prisma records.
- Include household and campus context through Prisma `include`/`select`.
- Include app-owned staff tasks linked to the person or household, ordered consistently with the existing task service.
- Return `null` for missing Rock rows, or throw a stable `NOT_FOUND` domain error if the GraphQL contract chooses non-nullable fields.

Test scenarios:

- Admin can read person and household profile identity, household, task, and giving summary fields.
- Finance can read limited person/household details and giving amount summaries.
- Pastoral Care can read profile and task/care context but receives `null` giving summaries.
- A role without person permissions is denied with a safe error.
- Missing person/household IDs return the planned missing-record behavior.
- The service never exposes payment tokens, payment method identifiers, raw transaction records, or access tokens.

Progress note 2026-04-18:

- Added `lib/people/profiles.ts`.
- Centralized role-aware profile projections for people and households.
- Added staff task summaries and Pastoral Care amount hiding.

- [x] **Unit 2: Add Giving Summary Aggregation**

Goal: Provide compact, explainable summary data from `GivingFact` without exposing raw transactions.

Files:

- Create or extend: `lib/giving/metrics.ts`
- Test: `tests/unit/giving-metrics.test.ts`

Approach:

- Add reusable helpers for person and household giving summaries.
- Aggregate from `GivingFact` only.
- Use `householdRockId` for household summaries.
- Use `personRockId` for person summaries only when the actor can see individual giving aggregates.
- Compute totals with Decimal-safe handling and return strings or numbers deliberately; avoid floating point surprises for money.
- Include a short explanation such as "Derived from local GivingFact rows synced from Rock."

Test scenarios:

- One-off and recurring facts are included in totals and reliability kind lists.
- Empty facts return a zero/empty summary only for roles allowed to see amounts.
- Month counts are based on distinct `effectiveMonth` values.
- Last gift fields use `occurredAt` when available and otherwise the effective month.
- Decimal amounts are formatted/serialized consistently.

Progress note 2026-04-18:

- Added `lib/giving/metrics.ts`.
- Summaries aggregate from `GivingFact` only and serialize money as decimal strings.

- [x] **Unit 3: Expose GraphQL Profile Types**

Goal: Add deliberate GraphQL profile fields without exposing raw Prisma models.

Files:

- Create: `lib/graphql/types/people.ts`
- Modify: `lib/graphql/schema.ts`
- Test: `tests/integration/graphql-api.test.ts`

Approach:

- Register Pothos object refs for person profile, household profile, household member profile, campus summary, task summary, and giving summary.
- Add `rockPerson(rockId: Int!)` and `rockHousehold(rockId: Int!)`.
- Call the profile service from resolvers.
- Use stable GraphQL errors with `UNAUTHENTICATED`, `FORBIDDEN`, and `NOT_FOUND` as appropriate.
- Keep list fields bounded if any nested lists accept limits. For this first slice, member/task lists may use fixed service caps instead of caller-provided pagination.

Test scenarios:

- Admin query returns identity, household, task, and giving summary fields.
- Finance query returns giving summary fields.
- Pastoral Care query returns profile fields while giving summary resolves to `null`.
- Anonymous and `needs_access` contexts cannot query profile data.
- Missing Rock IDs produce safe `NOT_FOUND` behavior.
- Serialized response does not contain forbidden payment/secret terms.

Progress note 2026-04-18:

- Added `lib/graphql/types/people.ts`.
- Added `rockPerson(rockId)` and `rockHousehold(rockId)`.

- [x] **Unit 4: Build Staff Profile Pages**

Goal: Give staff a usable first UI for person and household detail.

Files:

- Create: `app/people/[rockId]/page.tsx`
- Create: `app/households/[rockId]/page.tsx`
- Optional create: `app/people/page.tsx`
- Create: `components/people/person-profile.tsx`
- Create: `components/people/household-profile.tsx`
- Test: `tests/unit/person-profile-page.test.tsx`
- Test: `tests/unit/household-profile-page.test.tsx`

Approach:

- Follow the access-state pattern in `app/sync/page.tsx`.
- Redirect anonymous users to `/auth/login`.
- Redirect authenticated users without local access to `/access-request`.
- Fetch profile data through the profile service on the server page, not from a browser client with special credentials.
- Render identity and household context first.
- Render giving summary only when the service returns it.
- Render a clear "amounts hidden for this role" state for Pastoral Care instead of leaving a confusing empty area.
- Render related tasks as app-owned workflow records.
- Use restrained, scannable staff UI. Keep repeated records in simple cards/tables with stable responsive layout.

Test scenarios:

- Anonymous page requests redirect to Auth0 login.
- `needs_access` users redirect to access request.
- Admin/Finance pages show giving summary.
- Pastoral Care pages do not show giving amounts and do show the hidden-amount state.
- Missing profiles render `notFound()` or a clear missing-record state, matching the service contract.
- Person page links to household page when a household exists.
- Household page links to member person pages.

Progress note 2026-04-18:

- Added `/people`, `/people/[rockId]`, `/households`, and `/households/[rockId]`.
- Added warm-neutral record views in `components/people/`.

- [x] **Unit 5: Documentation and Plan Updates**

Goal: Make the profile contract and privacy posture durable.

Files:

- Create: `docs/architecture/person-household-profiles.md`
- Modify: `docs/architecture/api-boundary.md`
- Modify: `docs/plans/2026-04-18-002-feat-rock-person-household-detail-plan.md`

Approach:

- Document the profile fields, role matrix, and giving summary constraints.
- Record that profile pages read from local mirror tables and never call Rock live.
- Document that transaction-level giving history and payment/recurring setup remain out of scope.
- Update this plan with completion notes after implementation.

Test scenarios:

- Docs use repo-relative paths.
- Docs preserve the Rock source-of-truth boundary.
- Docs explicitly mention Pastoral Care amount hiding.

Progress note 2026-04-18:

- Added `docs/architecture/person-household-profiles.md`.
- Updated `docs/architecture/api-boundary.md`.

## Verification Plan

Run:

- `pnpm prisma:generate`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

If UI layout changes materially, also verify the person and household pages manually in the browser with Admin/Finance/Pastoral Care seeded users or equivalent mocked page tests.

## Risks and Mitigations

- **PII/financial exposure risk:** Keep projection in `lib/people/profiles.ts`; do not expose raw Prisma models in GraphQL.
- **Role confusion risk:** Add tests for Admin, Finance, and Pastoral Care behavior before broadening fields.
- **Giving group ambiguity:** Prefer `RockPerson.givingGroupRockId` over `primaryFamilyRockId` for giving rollups, matching `docs/architecture/data-model.md`.
- **Performance risk:** Profile queries can include multiple relations. Keep the first service queries bounded and add indexes only when a query path needs them.
- **False precision risk:** Label giving summaries as derived from local `GivingFact` rows and include sync recency so staff know they are not looking at live Rock.
- **Scope creep risk:** Defer full search, transaction drilldown, communication workflows, and AI summaries until this profile contract is stable.

## Open Questions

- Should the first UI include a simple Rock ID lookup page at `app/people/page.tsx`, or should implementation start with direct detail routes only?
- Should missing profiles use `notFound()` in pages and nullable GraphQL fields, or should GraphQL return a `NOT_FOUND` error? The implementation should choose one consistent behavior and document it.
- Which staff role should see email addresses if a future privacy review separates identity lookup from pastoral context? For this first slice, Finance and Pastoral Care both need enough identity context to identify the person, but this should be revisited before broad directory search.
