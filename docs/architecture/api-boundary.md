---
title: GraphQL API Boundary
date: 2026-04-18
source_plan: docs/plans/2026-04-18-001-feat-graphql-api-boundary-plan.md
---

# GraphQL API Boundary

## Purpose

The GraphQL API is the app's contract boundary for staff UI growth and future external consumers. It lives inside the Next.js App Router at `app/api/graphql/route.ts` and uses GraphQL Yoga with Pothos.

This first API pass is staff-only. Donor-facing giving, payment setup, payment-method management, and recurring gift mutation flows remain out of scope until Rock and payment processor boundaries are verified.

## Current Shape

Core files:

- `app/api/graphql/route.ts`: Yoga route handler for `GET`, `POST`, and `OPTIONS`.
- `lib/graphql/builder.ts`: Pothos builder with the Prisma plugin.
- `lib/graphql/context.ts`: Auth0 session to local app access-state resolution.
- `lib/graphql/schema.ts`: root query and mutation registration.
- `lib/graphql/types/sync.ts`: staff-safe sync health and issue fields.
- `lib/graphql/types/tasks.ts`: app-owned task query and mutation fields.
- `lib/graphql/pothos-prisma-types.ts`: generated Pothos Prisma metadata.

The route is configured for `/api/graphql`. GraphiQL is enabled outside production and disabled in production. Yoga error masking is enabled in production. Schema introspection is disabled in production by a validation plugin that rejects `__schema` and `__type` fields before execution.

## Auth Model

Auth0 proves identity only. Staff API access requires an active local `AppUser` with a local role.

The GraphQL context resolves one of three states:

- `anonymous`: no Auth0 session.
- `needs_access`: Auth0 session exists, but no active local app user exists.
- `authorized`: active local app user exists and carries a local role.

Resolvers must call one of:

- `requireStaffUser(context)` for staff-only reads that any active staff role may access.
- `requirePermission(context, permission)` for fields or mutations that need a specific permission.

Do not treat Rock people, Auth0 users, Auth0 roles, or Rock users as app authorization records.

## Current Contract

Root query fields:

- `viewer`: returns the active local app user's id, email, name, and role.
- `syncStatus`: returns safe operational sync metadata from `lib/sync/status.ts`.
- `staffTasks(limit, status)`: returns app-owned staff tasks for roles with `tasks:manage`.
- `rockPerson(rockId)`: returns a role-aware synced Rock person profile.
- `rockHousehold(rockId)`: returns a role-aware synced Rock household profile.

Root mutation fields:

- `createStaffTask`: creates a local `StaffTask`.
- `updateStaffTask`: updates local task fields and status.

The sync API exposes operational metadata and issue summaries only. It does not expose raw donor payloads, payment details, access tokens, or unrestricted synced Rock records.

Person and household profile fields are projected through `lib/people/profiles.ts` rather than exposing raw Prisma models. Admin and Finance can see derived giving summaries from `GivingFact`; Pastoral Care receives `amountsHidden: true` and `givingSummary: null`. Person `photoUrl` values point at the protected app-local Rock photo proxy, not directly at Rock.

## Staff API Usage

Local browser usage goes through Auth0 session cookies. A staff user can inspect the schema in local development through GraphiQL at `/api/graphql`.

Example local query:

```graphql
query StaffOverview {
  viewer {
    id
    email
    role
  }
  syncStatus {
    openIssueCount
    latestRun {
      status
      recordsRead
    }
  }
}
```

Example task mutation:

```graphql
mutation CreateFollowUpTask {
  createStaffTask(title: "Review sync issue queue", priority: NORMAL) {
    id
    title
    status
  }
}
```

Non-browser or agent use is intentionally not available yet because the app has not defined a machine-auth path. Agents should use local scripts for sync operations and wait for a future agent/API access plan before calling staff GraphQL in automation.

## Pagination and Bounds

List fields must have a default and maximum limit. Current caps:

- `syncStatus.openIssues(limit)`: max 50.
- `staffTasks(limit)`: max 50.

Future list fields should follow the same pattern before they are exposed to the UI or external consumers.

## Prisma and Pothos Generation

`prisma/schema.prisma` includes:

```prisma
generator pothos {
  provider     = "prisma-pothos-types"
  clientOutput = "@prisma/client"
  output       = "../lib/graphql/pothos-prisma-types.ts"
}
```

`clientOutput = "@prisma/client"` is intentional. Without it, the generated file can import Prisma types through an absolute `node_modules` path, which is not portable across machines or worktrees.

Run `pnpm prisma:generate` after schema changes. The generated `lib/graphql/pothos-prisma-types.ts` file is committed so typecheck does not depend on hidden local generation.

## Error Policy

Expected auth and validation failures should throw `GraphQLError` with stable extension codes:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `BAD_USER_INPUT`
- `NOT_FOUND`

Unexpected errors should not leak stack traces, database internals, Auth0 claims, API tokens, or donor data. Production Yoga masking is enabled, but resolvers and services should still prefer safe domain errors at known boundaries.

## Testing

Coverage added for this boundary:

- `tests/unit/graphql-auth.test.ts`: context resolution and permission errors.
- `tests/unit/tasks-service.test.ts`: app-owned task service behavior and permission boundaries.
- `tests/integration/graphql-api.test.ts`: schema-level staff queries, denied anonymous access, sync issue bounds, and task mutations.

Schema execution tests use the CommonJS GraphQL executor through `createRequire` because Pothos constructs the schema through the CommonJS GraphQL module in this toolchain. Importing the ESM executor directly can trigger GraphQL's duplicate-module realm check even when `pnpm why graphql` reports a single installed version.

## Future Work

- Unit 6 should add giving metrics in `lib/giving/metrics.ts` and expose them deliberately through GraphQL after role-aware amount visibility is tested.
- Communication prep should get dedicated services before GraphQL mutations are added.
- Donor-facing API fields should be separated or explicitly permission-scoped after payment/giving ownership is verified.
- Before external clients rely on the API, add schema inventory, rate limiting, object-level authorization tests, and compatibility checks.
