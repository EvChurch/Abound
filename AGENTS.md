# Agent Instructions

This repo is for a church giving management platform. Rock RMS is the source of truth; this application is an operational, reporting, workflow, and API layer around Rock.

## Product Ground Rules

- Treat Rock RMS as authoritative for people, households, gifts, and Rock-owned giving fields unless a later requirements document explicitly changes that boundary.
- Use Auth0 as the authentication platform. Rock may also use Auth0, but this app manages its own application users, roles, and permissions independently instead of syncing Rock users into local user accounts. Auth0 login alone is not authorization.
- If an Auth0-authenticated user has no active local app user profile or role, show a limited access screen with an invitation/access request action. Do not expose staff data.
- Do not invent payment, recurring gift, or Rock API behavior. Verify integration capabilities against the church's actual Rock instance and payment processor before implementing.
- Treat donor identity, giving history, payment setup, communication preferences, and staff notes as sensitive data.
- AI features must assist staff with reviewable analysis, drafting, explanations, and recommendations. Do not build autonomous donor communication or financial decision flows without explicit requirements.

## Current Durable Context

- Start with `docs/brainstorms/2026-04-17-church-giving-management-requirements.md`.
- Future implementation plans should live in `docs/plans/`.
- Architecture notes and integration research should live in `docs/architecture/` or `docs/research/`.
- Solved implementation learnings should live in `docs/solutions/`; search there before repeating similar auth, data, tooling, or integration work.
- Keep unresolved assumptions visible in the relevant document instead of burying them in chat.

## Preferred Technical Direction

- Expected application stack: Next.js, TypeScript, Prisma, and a relational database.
- Preferred external API direction: GraphQL in the Next.js `app/api` route tree, likely GraphQL Yoga with Pothos and Prisma integration, because future consumers may include a website/CMS block or other repos.
- tRPC can be considered for purely internal Next.js surfaces, but do not make it the only API boundary if external or multi-repo consumers need typed access.
- Initial user administration can be handled directly through Postgres/seed tooling. A dedicated user-management UI is not required for the first implementation pass.
- Use pnpm as the package manager. Keep `pnpm-lock.yaml` committed.
- Use Tailwind CSS for styling. Avoid hand-rolled component styling unless there is a clear reason Tailwind utilities do not fit.
- Husky runs pre-commit checks. Keep hooks fast and focused on lint/typecheck unless the project later chooses broader gates.
- Favor clear service boundaries around Rock sync, giving analytics, task workflows, communication workflows, donor-facing APIs, auth, and AI assistance.

## Engineering Standards

- Read existing docs and code before changing behavior.
- Prefer small, testable changes with explicit assumptions.
- Add or update tests for non-trivial business logic, data transforms, authorization behavior, sync reconciliation, and API contracts.
- Keep database migrations reversible or clearly documented when reversibility is not realistic.
- Avoid logging raw donor PII, full financial details, access tokens, or payment identifiers.
- Use structured parsers and typed APIs for integration data. Avoid ad hoc string parsing when a schema or generated type can be used.
- If a change affects donor data, auth, payments, sync behavior, or external APIs, document the failure modes and verification steps.

## Compound Engineering Workflow

- Use `ce:brainstorm` for product discovery and requirements.
- Use `ce:plan` before substantial implementation work.
- Use `ce:work` for execution after a plan exists.
- Use `ce:review` or a standard code-review pass before opening a PR.
- Use repo-relative paths in docs and plans.

## Local Commands

- Install dependencies: `pnpm install`
- Start dev server: `pnpm dev`
- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- Format: `pnpm format`
- Check formatting: `pnpm format:check`
- Generate Prisma client: `pnpm prisma:generate`
- Run development migrations: `pnpm prisma:migrate`
- Seed bootstrap admin data: `pnpm prisma:seed`
- Open Prisma Studio: `pnpm prisma:studio`
- Discover Rock endpoint availability without raw payload values: `pnpm rock:discover`
- Sync the verified Rock API v1 read surface into the local database using read-only GET requests: `pnpm rock:sync`
- Enqueue one pg-boss managed full Rock sync: `pnpm sync:enqueue`
- Schedule recurring pg-boss full Rock sync: `pnpm sync:schedule "0 * * * *"`
- Start the pg-boss sync worker: `pnpm sync:worker`
- Process one queued sync job and exit: `pnpm sync:worker -- --once`
- Debug one stakeholder-approved person slice only: `pnpm rock:sync-person <rock-person-id>`

## Claude Compatibility

Claude should follow this file as the primary repo instruction source. `CLAUDE.md` exists only as a pointer for Claude-specific startup behavior.
