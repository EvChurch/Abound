---
title: Auth0 and Local User Management
date: 2026-04-18
source_plan: docs/plans/2026-04-18-001-feat-graphql-api-boundary-plan.md
---

# Auth0 and Local User Management

## Boundary

Auth0 is the authentication platform. This app owns staff authorization through local `AppUser` records and local roles.

Rock RMS remains the source of truth for people, households, gifts, giving status, and Rock-owned fields. Rock users are not synced into app users, and a Rock person link is not required for authorization.

## Local Access States

`lib/auth/access-control.ts` resolves three states:

- `anonymous`: no valid Auth0 session user.
- `needs_access`: Auth0 identity exists, but no active local app user exists.
- `authorized`: an active local app user exists for the Auth0 subject.

Pages and server actions already use this state. GraphQL now uses the same state through `lib/graphql/context.ts`.

## Roles

Local roles are defined in `lib/auth/roles.ts`:

- `ADMIN`
- `FINANCE`
- `PASTORAL_CARE`

Current permission posture:

- Admin has full access across finance, people, care context, tasks, communications, settings, and administration.
- Finance can see giving amounts and limited people information needed for giving operations, but cannot manage care workflow tasks.
- Pastoral Care can manage care workflows and communications and see care context, but cannot see actual giving amounts or individual-level giving aggregates.

Any change to this matrix should update `tests/unit/auth-roles.test.ts` and the GraphQL permission tests.

## Access Requests

Auth0-authenticated users without active local access are routed to the access request flow. Access requests are persisted in `AccessRequest`, keyed by Auth0 subject.

The access request service preserves terminal `APPROVED` and `DENIED` states on resubmission. Do not replace this with a generic upsert that can reset administrator decisions.

The first implementation intentionally does not include a user-management UI or outbound notification workflow. Administrators can manage local users through seed/database tooling until a dedicated UI is planned.

## GraphQL Enforcement

GraphQL resolvers must not check Auth0 claims directly for staff authorization. They should use:

- `requireStaffUser(context)` for any active local staff user.
- `requirePermission(context, permission)` for permission-specific reads or mutations.

Known failures should return safe GraphQL errors:

- anonymous users: `UNAUTHENTICATED`
- Auth0 users without local access: `FORBIDDEN`
- local users without the required permission: `FORBIDDEN`

## Seed Safety

`prisma/seed.ts` may create a bootstrap admin when the Auth0 subject does not exist. It should not silently promote, reactivate, or repair existing authorization records. Authorization changes after bootstrap should be explicit administrator actions.

## Sensitive Data Rules

Do not log or expose:

- Auth0 access tokens or session internals.
- Raw donor PII beyond the fields explicitly needed for the authorized workflow.
- Payment instrument values or payment tokens.
- Raw Rock payloads from production.

Tests that touch auth, donor data access, role permissions, access request transitions, seed behavior, or GraphQL staff access should include denial cases as well as happy paths.
