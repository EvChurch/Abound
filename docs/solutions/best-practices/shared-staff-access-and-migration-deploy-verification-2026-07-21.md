---
title: Shared Staff Access And Migration Deploy Verification
date: 2026-07-21
category: best-practices
module: auth-and-deployment
problem_type: best_practice
component: authentication
severity: high
applies_when:
  - Removing local role or permission boundaries from staff workflows.
  - Shipping Prisma schema changes that delete columns or enum types.
  - Preparing Railway deployments that rely on pre-deploy migrations.
related_components:
  - database
  - development_workflow
  - testing_framework
tags: [auth0, authorization, prisma, migrations, railway, deployment]
---

# Shared Staff Access And Migration Deploy Verification

## Context

The app moved from Finance, Pastoral Care, and Admin roles to a simpler model: Auth0 proves identity, and an active local `AppUser` grants the same staff access everywhere. The refactor removed role checks from saved segments, list filters, profiles, communications, settings, pledges, GraphQL, and user management.

This kind of change is deceptively broad. It is easy to delete the visible role enum while leaving behind no-op permission helpers, hidden UI branches, stale GraphQL fields, or broken migration directories.

## Guidance

Treat shared staff access as an end-to-end model, not a role rename.

- Remove the local role column, enum, generated types, imports, tests, UI controls, and API fields.
- Remove no-op permission helpers and dead branches rather than leaving `if (true)` style scaffolding.
- Keep the real authorization boundary at active local access: anonymous users redirect or get `UNAUTHENTICATED`, and Auth0 users without active local access redirect or get `FORBIDDEN`.
- Update current architecture docs so future agents do not reintroduce the old role matrix.
- Run `pnpm prisma migrate deploy` locally against an appropriate database before merge when migrations are part of the PR.

For Railway, the web service runs production migrations through `railway.web.toml`:

```toml
[deploy]
preDeployCommand = "pnpm prisma migrate deploy"
```

The worker service intentionally skips migrations, so the web service must deploy successfully before relying on worker code that expects the new schema.

## Why This Matters

Prisma treats every migration directory as part of the migration history. An empty or partially deleted migration directory can pass ordinary code checks but make `prisma migrate deploy` fail in production before the app starts.

Role-removal refactors also change sensitive data exposure. If the product decision is equal staff access, the code should say that plainly. Keeping dead permission layers makes later changes harder to reason about and can fool reviewers into thinking a permission boundary still exists.

## When to Apply

- Removing, renaming, or replacing local authorization roles.
- Sharing records that were previously owner- or role-scoped.
- Dropping Prisma enum types or columns.
- Preparing PRs where deployment success depends on `prisma migrate deploy`.

## Examples

Before:

```ts
if (!hasPermission(actor.role, "pledges:manage")) {
  return null;
}
```

After:

```ts
const accessState = await getCurrentAccessState(session?.user);

if (accessState.status === "anonymous") {
  redirect("/auth/login");
}

if (accessState.status === "needs_access") {
  redirect("/access-request");
}
```

Before merging a migration PR:

```bash
pnpm prisma:generate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma migrate deploy
pnpm prisma migrate status
```

## Related

- `docs/solutions/security-issues/nextjs-auth0-prisma-auth-foundation-guardrails-2026-04-17.md`
- `docs/solutions/best-practices/rock-sync-local-mirror-and-test-database-boundaries-2026-04-17.md`
- `railway.web.toml`
