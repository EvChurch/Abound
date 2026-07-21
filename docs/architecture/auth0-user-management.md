---
title: Auth0 and Local User Management
date: 2026-04-18
source_plan: docs/plans/2026-04-18-001-feat-graphql-api-boundary-plan.md
---

# Auth0 and Local User Management

## Boundary

Auth0 is the authentication platform. This app owns staff authorization through local `AppUser` records. Local access, not Auth0 login alone, determines whether a user can enter staff workflows.

Rock RMS remains the source of truth for people, households, gifts, giving status, and Rock-owned fields. Rock users are not synced into app users, and a Rock person link is not required for authorization.

## Local Access States

`lib/auth/access-control.ts` resolves three states:

- `anonymous`: no valid Auth0 session user.
- `needs_access`: Auth0 identity exists, but no active local app user exists.
- `authorized`: an active local app user exists for the Auth0 subject.

Pages and server actions already use this state. GraphQL now uses the same state through `lib/graphql/context.ts`.

## Access Posture

All active local app users have the same staff access. Shared segments, communication workflows, settings, giving context, and workflow edits are no longer gated by Finance, Pastoral Care, Admin, or any other local app role.

`AppUser` records do not store a role. New approvals and user updates only decide whether a local user is active, and `prisma/migrations/20260721000400_remove_app_user_roles/migration.sql` removes the old role column and enum.

Any future change away from equal staff access should introduce a fresh authorization model with explicit requirements and update GraphQL staff access tests and workflow tests.

## Access Requests

Auth0-authenticated users without active local access are routed to the access request flow. Access requests are persisted in `AccessRequest`, keyed by Auth0 subject.

The access request service preserves terminal `APPROVED` and `DENIED` states on resubmission. Do not replace this with a generic upsert that can reset administrator decisions.

The first implementation intentionally does not include a user-management UI or outbound notification workflow. Administrators can manage local users through seed/database tooling until a dedicated UI is planned.

## GraphQL Enforcement

GraphQL resolvers must not check Auth0 claims directly for staff authorization. They should use:

- `requireStaffUser(context)` for any active local staff user.

Known failures should return safe GraphQL errors:

- anonymous users: `UNAUTHENTICATED`
- Auth0 users without local access: `FORBIDDEN`
- inactive local users: `FORBIDDEN`

## Seed Safety

`prisma/seed.ts` may create a bootstrap local user when the Auth0 subject does not exist. It should not silently reactivate or repair existing authorization records. Access changes after bootstrap should be explicit administrator actions.

## Sensitive Data Rules

Do not log or expose:

- Auth0 access tokens or session internals.
- Raw donor PII beyond the fields explicitly needed for the authorized workflow.
- Payment instrument values or payment tokens.
- Raw Rock payloads from production.

Tests that touch auth, donor data access, access request transitions, seed behavior, or GraphQL staff access should include denial cases as well as happy paths.
