---
title: "feat: Establish GraphQL API boundary"
type: feat
status: active
date: 2026-04-18
origin: docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md
parent_unit: "Unit 5: Establish the GraphQL API Boundary"
---

# feat: Establish GraphQL API Boundary

## Overview

Build the first durable GraphQL API boundary for the giving management app. The API should expose staff-safe read and workflow operations from the existing Next.js app without leaking raw Prisma models, bypassing local authorization, or expanding beyond the verified read-only Rock sync foundation.

This plan implements Unit 5 from `docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md`. Units 1-4 are already complete enough for this work: the app scaffold exists, Auth0/local access request guardrails exist, Rock API v1 read-only sync is verified, local mirror tables are populated through Prisma, and sync health already has a staff page backed by `lib/sync/status.ts`.

## Problem Frame

The app now has useful synced data and a staff-visible sync status page, but there is not yet a stable API contract for staff UI growth or future external consumers. If dashboard, tasks, and communication features query Prisma directly from pages/components, the product will drift away from the contract-first direction in the origin requirements.

The next move is a small but real GraphQL boundary: auth-aware context, deliberate schema types, bounded queries, safe errors, and enough operations to prove the pattern before building richer dashboards and workflow screens.

## Scope

In scope:

- Add GraphQL Yoga at `app/api/graphql/route.ts`.
- Add Pothos schema builder under `lib/graphql/`.
- Add generated Pothos Prisma type support if it works cleanly with the current Prisma 7 setup.
- Create a GraphQL context that resolves Auth0 identity into local app access state.
- Expose staff-only sync health and open sync issue queries using `lib/sync/status.ts`.
- Expose a minimal staff task API over existing `StaffTask` records.
- Add API-boundary and auth architecture docs.
- Add unit and integration tests for auth denial, role permissions, pagination limits, safe errors, and baseline successful queries/mutations.

Out of scope:

- Donor-facing GraphQL schema or payment/recurring-gift mutations.
- Public unauthenticated API operations.
- Email sending, communication dispatch, or autonomous AI behavior.
- Full dashboard metric calculations. Unit 6 should own `lib/giving/metrics.ts` and the first broad dashboard data model.
- Dedicated user-management UI for approving access requests.
- WebSocket subscriptions or custom Next.js server work.

## Requirements Trace

- R5: The API must support staff dashboards by exposing sync health and the first staff-safe summary surfaces.
- R6: The API must support task creation/update as the first workflow mutation surface.
- R7: The API should leave room for communication prep, but only add types if they can be backed by current domain services without sending email.
- R8: API fields that expose derived data should carry explanation/provenance fields where available.
- R9: The API should be a contract boundary suitable for future website/CMS consumers, even though this unit remains staff-only.
- R12, R14: Sensitive donor and financial data must not leak through raw model exposure, logs, fixtures, or GraphQL errors.
- R13, R16: Auth0 is authentication only. Staff API access requires an active local `AppUser` and role.

## Current Context

Existing foundations to reuse:

- Auth0 client: `lib/auth/auth0.ts`
- Access state resolution: `lib/auth/access-control.ts`
- Local role helpers: `lib/auth/roles.ts`
- Local user repository: `lib/auth/prisma-users.ts`
- Access request state machine: `lib/auth/access-requests.ts`
- Sync status service: `lib/sync/status.ts`
- Sync status UI: `app/sync/page.tsx`, `components/sync/sync-status.tsx`
- Prisma client singleton: `lib/db/prisma.ts`
- Rock sync guardrails: `docs/solutions/best-practices/rock-sync-local-mirror-and-test-database-boundaries-2026-04-17.md`
- Auth guardrails: `docs/solutions/security-issues/nextjs-auth0-prisma-auth-foundation-guardrails-2026-04-17.md`

External reference checks on 2026-04-18:

- GraphQL Yoga's Next.js integration documents `app/api/graphql/route.ts`, `createYoga`, `graphqlEndpoint: "/api/graphql"`, `fetchAPI: { Response }`, and exporting `GET`, `POST`, and `OPTIONS`.
- Pothos Prisma setup expects `@pothos/core`, `@pothos/plugin-prisma`, a Prisma `generator pothos { provider = "prisma-pothos-types" }`, generated Pothos types, and `getDatamodel()` for runtime model metadata.
- Current package lookup found latest stable packages around `graphql-yoga@5.21.0`, `graphql@16.13.2`, `@pothos/core@4.12.0`, and `@pothos/plugin-prisma@4.14.3`.

## Decisions

- Start with a staff-only GraphQL schema. A future donor-facing schema should be separated or explicitly permission-scoped after payment/giving integration boundaries are verified.
- Keep resolver logic thin. Resolvers call domain services such as `lib/sync/status.ts` and task services rather than embedding Prisma queries everywhere.
- Model authorization in both context and field/mutation resolvers. Context decides whether the caller is anonymous, needs access, or authorized; resolvers still assert the specific permission they need.
- Do not expose raw Prisma objects wholesale. GraphQL types should deliberately choose fields and omit raw donor details unless a permission check allows them.
- Use max page sizes from the first implementation pass. Any list field should have a default limit and a hard cap.
- Keep GraphiQL/introspection development-friendly but production-restricted. Document the exact production posture in `docs/architecture/api-boundary.md`.
- Prefer Pothos Prisma generated types if they integrate cleanly; if Prisma 7 generator behavior blocks progress, fall back to Pothos object/simple object types for this unit and document the reason.

## Implementation Units

- [x] **Unit 5A: Install and Generate GraphQL Tooling**

Goal: Add the GraphQL runtime and schema-builder dependencies without destabilizing Prisma generation.

Files:

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `prisma/schema.prisma`
- Create if generated and committed: `lib/graphql/pothos-prisma-types.ts`
- Test: existing `pnpm prisma:generate`, `pnpm typecheck`

Approach:

- Add `graphql`, `graphql-yoga`, `@pothos/core`, and `@pothos/plugin-prisma`.
- Add the Pothos Prisma generator to `prisma/schema.prisma` if compatible with Prisma 7.
- Verify whether generated Pothos types should be committed or regenerated in normal Prisma generation. Keep the decision documented in `docs/architecture/api-boundary.md`.

Test scenarios:

- Prisma generation still succeeds with the existing Prisma 7 config.
- Typecheck can import the generated Pothos Prisma types.
- If generator setup fails, the fallback path is documented and the schema builder still compiles without the Prisma plugin.

Progress note 2026-04-18:

- Added `graphql`, `graphql-yoga`, `@pothos/core`, and `@pothos/plugin-prisma`.
- Added the Pothos Prisma generator to `prisma/schema.prisma`.
- Generated and committed `lib/graphql/pothos-prisma-types.ts`.
- Set `clientOutput = "@prisma/client"` so generated imports are portable instead of absolute `node_modules` paths.
- Verified `pnpm prisma:generate` and `pnpm typecheck`.

- [x] **Unit 5B: Add Auth-Aware GraphQL Context**

Goal: Convert Auth0 session state into a GraphQL context that preserves the app's local authorization boundary.

Files:

- Create: `lib/graphql/context.ts`
- Create or extend: `lib/auth/permissions.ts`
- Test: `tests/unit/graphql-auth.test.ts`

Approach:

- Resolve `auth0.getSession()` inside the request path.
- Use `resolveAccessState` with `prismaAppUsers`.
- Represent context as a discriminated union: anonymous, needs access, or authorized staff user.
- Add small assertion helpers such as `requireStaffUser(context)` and `requirePermission(context, permission)`.
- Return safe GraphQL errors for unauthenticated or unauthorized requests.

Test scenarios:

- Anonymous context denies staff queries.
- Auth0-authenticated users without active local app users are denied staff queries.
- Inactive or missing local users cannot access staff fields.
- Authorized local users include role and permission information in context.
- Safe errors do not expose Auth0 claims, session internals, stack traces, or database details.

Progress note 2026-04-18:

- Added `lib/graphql/context.ts`.
- Added `lib/auth/permissions.ts`.
- Reused `resolveAccessState` and `prismaAppUsers` for GraphQL context resolution.
- Added `requireStaffUser` and `requirePermission` helpers with safe GraphQL error codes.
- Added `tests/unit/graphql-auth.test.ts`.

- [x] **Unit 5C: Build the Schema and Route**

Goal: Add the Yoga route and first Pothos schema with a small, coherent query surface.

Files:

- Create: `app/api/graphql/route.ts`
- Create: `lib/graphql/builder.ts`
- Create: `lib/graphql/schema.ts`
- Create: `lib/graphql/types/sync.ts`
- Create: `lib/graphql/types/tasks.ts`
- Test: `tests/integration/graphql-api.test.ts`

Approach:

- Configure Yoga for `/api/graphql` in the Next.js App Router.
- Export `GET`, `POST`, and `OPTIONS`.
- Add root `Query` fields for `viewer`, `syncStatus`, and `syncIssues`.
- Add root `Mutation` fields for minimal staff task creation/update only after the task domain service exists.
- Keep error masking on for production behavior.
- Keep list fields bounded by default and cap caller-supplied limits.

Test scenarios:

- Authorized staff can run a `viewer` query and see their local role.
- Authorized staff can query sync health through GraphQL and receive the same safe operational counts as `lib/sync/status.ts`.
- Unauthenticated GraphQL requests cannot read sync status.
- `syncIssues(limit: N)` enforces a hard maximum page size.
- Resolver errors return safe messages.
- The route handler responds to `POST` integration tests against a test database.

Progress note 2026-04-18:

- Added Yoga route handler at `app/api/graphql/route.ts`.
- Added Pothos builder and schema registration under `lib/graphql/`.
- Added staff-only `viewer` and `syncStatus` fields.
- Added bounded `syncStatus.openIssues(limit)` with a max of 50.
- Added schema-level tests in `tests/integration/graphql-api.test.ts`.

- [x] **Unit 5D: Add Task Workflow API Baseline**

Goal: Prove mutation behavior over app-owned records without touching Rock-owned data.

Files:

- Create: `lib/tasks/service.ts`
- Create: `lib/graphql/types/tasks.ts`
- Test: `tests/unit/tasks-service.test.ts`
- Test: `tests/integration/graphql-api.test.ts`

Approach:

- Add a small task service around `StaffTask`.
- Allow authorized staff with care workflow permission to create, update status, and assign tasks.
- Keep links to Rock people/households optional and validated when supplied.
- Do not mutate Rock mirror rows.

Test scenarios:

- Admin and Pastoral Care can create follow-up tasks.
- Finance cannot create care workflow tasks unless the permission matrix changes deliberately.
- A task linked to a Rock person or household preserves the source record ID and local ownership boundary.
- Completed tasks remain queryable for audit/history.
- Invalid Rock links fail safely without exposing raw database errors.

Progress note 2026-04-18:

- Added `lib/tasks/service.ts`.
- Added `staffTasks`, `createStaffTask`, and `updateStaffTask` GraphQL fields.
- Kept staff tasks app-owned and validated optional Rock person/household links.
- Enforced `tasks:manage`, so Admin and Pastoral Care can use the workflow while Finance is denied.
- Added `tests/unit/tasks-service.test.ts`.

- [x] **Unit 5E: Document API Boundary and Verification**

Goal: Make the API contract, auth posture, and production risks durable for future agents.

Files:

- Create: `docs/architecture/api-boundary.md`
- Create: `docs/architecture/auth0-user-management.md`
- Modify: `docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md`

Approach:

- Document the staff-only GraphQL contract, field-level authorization expectations, error masking, pagination limits, and introspection/GraphiQL posture.
- Document local user/role behavior using the implementation that already exists in `lib/auth/`.
- Update the parent foundation plan's Unit 5 progress note after implementation is verified.

Test scenarios:

- Documentation references repo-relative paths only.
- The parent plan reflects completed work and any consciously deferred pieces.

Progress note 2026-04-18:

- Added `docs/architecture/api-boundary.md`.
- Added `docs/architecture/auth0-user-management.md`.
- Updated this focused plan with completion notes.

## Verification Plan

Run:

- `pnpm prisma:generate`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

When `TEST_DATABASE_URL` is configured, also run:

- `pnpm test:db:reset`
- targeted GraphQL integration tests

Optional manual check:

- Start `pnpm dev`.
- Verify `/api/graphql` denies anonymous staff queries.
- Verify an authorized local staff user can query `viewer` and `syncStatus`.

Verification result 2026-04-18:

- `pnpm prisma:generate` passed.
- `pnpm format:check` passed.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` passed with 20 test files and 77 tests.

Review hardening result 2026-04-18:

- Added production introspection blocking.
- Added route-level Yoga coverage.
- Added stable bad-input errors for invalid dates and assignees.
- Allowed local-only task creation without Rock anchors.
- Added assignee validation on task updates.
- Added a staff task list index migration.
- Added staff API examples and documented that non-browser machine auth is future work.

## Risks

| Risk                                                           | Mitigation                                                                                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Pothos Prisma generator friction with Prisma 7 blocks progress | Time-box generator setup, use explicit Pothos object types as fallback, and document the tradeoff.                     |
| GraphQL accidentally exposes raw synced donor data             | Start with sync operational metadata and task records only; require explicit permission helpers for sensitive fields.  |
| Auth0 session presence is mistaken for app authorization       | Reuse `resolveAccessState` and deny `needs_access` users in resolver assertions.                                       |
| Resolver tests use the development database                    | Keep integration tests behind `TEST_DATABASE_URL` and preserve the existing test database guardrails.                  |
| API grows too large before dashboards prove needs              | Limit this unit to `viewer`, `syncStatus`, bounded sync issues, and baseline tasks. Unit 6 owns richer giving metrics. |

## Ready-To-Start Checklist

- [ ] Confirm `DATABASE_URL` is available for local type generation/runtime imports.
- [ ] Confirm `TEST_DATABASE_URL` is configured before running database-backed integration tests.
- [ ] Install GraphQL dependencies with pnpm.
- [ ] Add tests for auth denial before exposing staff data fields.
- [ ] Keep donor-facing giving/payment behavior out of this unit.
