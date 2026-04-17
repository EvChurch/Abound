# Giving Management Next Session Handoff

Created: 2026-04-17

## Current Stopping Point

The first application foundation pass is on branch `feat/app-auth-foundation`. The initial scaffold landed in commit `f7ca9f0`, with review hardening continuing on the same branch.

Completed:

- Next.js, TypeScript, pnpm, Tailwind, ESLint, Prettier, Vitest, Husky, Prisma, and CI scaffold.
- Initial Auth0 integration shell with local app authorization boundaries.
- Initial `AppUser` and `AccessRequest` Prisma models.
- Role vocabulary fixed to Admin, Finance, and Pastoral Care.
- Unknown Auth0 users are not authorized automatically; they see an access-needed path and can submit an access request.

The active implementation plan remains `docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md`.

## Recommended Next Brainstorm

Topic: Rock RMS and payment/giving integration boundary.

Purpose: decide what must be verified before building sync, what access to request from the church's Rock instance, and what donor-facing giving behavior is explicitly out of scope until payment processor capabilities are known.

The brainstorm should produce or update a requirements document that answers:

- Which Rock data must be read first: people, households, gifts, giving setup/status, communication preferences, or another subset.
- Which Rock integration path is actually available: REST API, jobs, exports, webhooks, direct database access, or a combination.
- Whether the church can provide sanitized payloads/fixtures for people, households, gifts, funds/accounts, batches, pledges, recurring giving, and payment profiles.
- Which payment processor is used and whether recurring gift setup/management is owned by Rock, the processor, or a hosted giving provider.
- What donor-facing giving functionality is definitely deferred until verified.
- What minimum sync freshness, auditability, and reconciliation visibility staff need before dashboards are trusted.

## Recommended Next Plan

After the brainstorm, create the next plan around Unit 2 from the active plan: `Document Rock Integration Research`.

The plan should likely cover:

- `docs/research/rock-integration.md`
- `docs/research/payment-and-giving-boundaries.md`
- sanitized fixture format and validation
- first Rock client type definitions without live sync behavior
- explicit failure modes around stale data, missing records, duplicates, and unsafe logging

Do not implement sync behavior until the Rock read path and sample payload shape are verified.

## Open Questions To Bring Forward

- What Rock version and API surface is the church running?
- What authentication method should this app use to read from Rock?
- Are there rate limits, API permissions, or hosting/network constraints?
- Are giving records, recurring giving setup, payment instruments, pledges, and funds all accessible from the same source?
- Is the payment processor directly accessible, or only through Rock/hosted giving?
- How should sanitized fixtures be generated and reviewed without exposing donor PII or payment details?
