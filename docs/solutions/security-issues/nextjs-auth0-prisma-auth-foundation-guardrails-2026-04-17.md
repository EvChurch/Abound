---
title: Next.js Auth0 Prisma Auth Foundation Guardrails
date: 2026-04-17
category: security-issues
module: auth-foundation
problem_type: security_issue
component: authentication
symptoms:
  - Authorized local app users could call the access request server action instead of being redirected away.
  - Resubmitting an access request could reset DENIED or APPROVED decisions back to PENDING.
  - Prisma 7 configuration did not explicitly load .env before reading DATABASE_URL.
  - The Prisma schema existed without a committed initial migration.
  - The seed script could silently re-enable or promote an existing user to ADMIN.
root_cause: missing_permission
resolution_type: code_fix
severity: high
related_components:
  - database
  - tooling
  - testing_framework
  - documentation
tags:
  - nextjs
  - auth0
  - prisma
  - access-requests
  - seed-data
  - migrations
  - authorization
---

# Next.js Auth0 Prisma Auth Foundation Guardrails

## Problem

The auth foundation had several state-boundary issues around access requests and bootstrap users. Auth0 identity was being treated too directly in the access-request path, while local app access state, terminal request statuses, seed safety, and Prisma migration/config setup needed to be enforced consistently.

## Symptoms

- Authenticated users could submit access requests without first resolving whether they already had active local app access.
- Access request resubmission could lose terminal review state by resetting an existing request to `PENDING`.
- The submitted access-request page could be visited directly and claim a request had been recorded.
- The bootstrap admin seed could re-enable or re-promote an existing user when rerun.
- The Prisma schema added persistent models without a committed migration, making the database setup non-reproducible.
- Prisma 7 CLI commands depended on shell-exported environment variables instead of loading `.env` explicitly.

## What Didn't Work

- Checking only the Auth0 session inside a server action was insufficient. The UI page can hide a form, but server actions still need to enforce local authorization because they are callable independently of that page.
- A single upsert-style access request repository method was too blunt. It combined create and update behavior and allowed terminal administrator decisions to be overwritten by a later user submit.
- An upsert-based admin seed was too authoritative for authorization data. It could silently turn an existing inactive or non-admin user into an active admin.
- Relying on `schema.prisma` without `prisma/migrations/` did not satisfy reproducible deployment.
- Running `tsc` concurrently with `next build` caused a transient `.next/types` race. Sequential verification avoided treating generated-type churn as a code failure. (session history)

## Solution

The access-request action now resolves the full local access state before persistence:

```ts
const session = await auth0.getSession();
const accessState = await resolveAccessState(session?.user, prismaAppUsers);

if (accessState.status === "anonymous") {
  redirect("/auth/login");
}

if (accessState.status === "authorized") {
  redirect("/");
}
```

Reference: `app/access-request/actions.ts`.

The access-request domain repository was split into explicit operations:

- `createPending`
- `findByAuth0Subject`
- `updatePendingContact`

The domain service now normalizes input, finds any existing request, creates only when missing, updates contact details only for `PENDING`, and returns terminal `APPROVED` or `DENIED` records unchanged. References: `lib/auth/access-requests.ts` and `lib/auth/prisma-access-requests.ts`.

The submitted page became an async guarded page that redirects anonymous users to `/auth/login`, redirects authorized users to `/`, and uses neutral copy for authenticated users still awaiting local access. Reference: `app/access-request/submitted/page.tsx`.

Prisma setup was hardened in three ways:

- `prisma.config.ts` imports `dotenv/config` so local Prisma commands can load `.env`.
- `prisma/migrations/20260417000000_app_auth_foundation/migration.sql` creates the initial app-local auth schema.
- `prisma/migrations/migration_lock.toml` records the PostgreSQL migration provider.

The seed script now creates a bootstrap admin only when the Auth0 subject does not already exist, refuses unsafe reactivation or promotion, and only updates email for an existing active admin. Reference: `prisma/seed.ts`.

Tests were expanded around:

- server-action redirects and persistence boundaries in `tests/unit/access-request-action.test.ts`
- terminal access request status preservation in `tests/unit/access-request.test.ts`
- access-request page guards in `tests/unit/access-request-page.test.tsx`
- home-page auth branches in `tests/unit/app-smoke.test.tsx`
- the full local role permission matrix in `tests/unit/auth-roles.test.ts`

Docs were also updated so future agents can find the seed command and do not assume deferred Playwright/integration-test scaffolding exists yet.

## Why This Works

The fix separates identity, authorization, request state, and persistence.

Auth0 still proves identity, but `resolveAccessState` decides whether that identity is anonymous, needs local access, or is already authorized before the server action writes anything. That preserves the product rule that staff access depends on active local app users and roles, not Auth0 login alone.

Splitting repository methods forces the domain service to make request transitions explicit:

- missing request -> create `PENDING`
- existing `PENDING` request -> update contact details
- existing `APPROVED` or `DENIED` request -> preserve the administrator decision

The seed change applies the same fail-closed posture to bootstrap authorization. Seeding may create the first admin, but it does not silently repair, promote, or reactivate existing authorization records. Those changes require an explicit database/admin action.

The migration and schema give the auth foundation durable database constraints, especially unique `auth0Subject` values for local users and access requests.

## Prevention

- Keep auth flows state-machine based. Do not collapse request creation, contact refresh, and review-state transitions into a single generic upsert.
- Resolve local access state inside every server action that mutates auth-adjacent data. Page-level redirects are helpful but not sufficient.
- Preserve terminal review statuses unless a staff/admin action explicitly reopens or supersedes them.
- Keep bootstrap seed behavior create-only or fail-loud for authorization records. If a future break-glass seed path is needed, design it explicitly with a separate flag and documentation.
- Commit migrations with Prisma schema changes. Do not rely on schema push or hand-applied DDL for app-owned persistent data.
- Load Prisma CLI environment consistently with `dotenv/config` when using Prisma 7 config.
- Add branch tests whenever code touches donor data access, local roles, access-request status transitions, seed/admin tooling, or public auth pages.

## Related Issues

- `AGENTS.md` defines Auth0 as authentication only and local app users/roles as authorization.
- `docs/brainstorms/2026-04-17-church-giving-management-requirements.md` records the limited-access workflow.
- `docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md` records the active foundation plan and deferred architecture work.
- Session history found the same review/fix sequence in recent Codex sessions for this repo. No relevant Claude Code or Cursor sessions surfaced in the seven-day scan. (session history)
