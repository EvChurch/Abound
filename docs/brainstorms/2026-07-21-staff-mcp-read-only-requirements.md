---
date: 2026-07-21
topic: staff-mcp-read-only
---

# Staff MCP Read-Only Access

## Problem Frame

Abound should let staff connect AI systems through OAuth and ask broad questions about donor giving, households, segments, lifecycle movement, and existing operational context. The first MCP version should prioritize autonomous read access over narrow lookup commands, but it must stay inside Abound's existing staff access boundary and Rock RMS source-of-truth rules.

The goal is not to build a new analytics layer before MCP. The first version should expose the useful read models Abound already has, especially person and household profiles, giving summaries, lifecycle labels, saved list views, sync status, communications context, and related staff workflow context.

## Requirements

**Authentication and Access**

- R1. Staff must connect to the MCP through OAuth.
- R2. Abound must accept MCP access only for Auth0-authenticated users who have an active local `AppUser`.
- R3. For v1, every active local staff user should receive the full MCP read surface; no MCP-specific role, scope, or per-user permission trimming is required.
- R4. MCP access must remain read-only. It must not create, update, delete, send, sync, schedule, approve, or mutate Abound, Rock, payment, communication, pledge, or task state.

**Readable Staff Context**

- R5. The MCP should expose existing person and household profile read models, including identity context, household/campus context, lifecycle labels, staff tasks, communications context, and giving summaries where those models already provide them.
- R6. The MCP should expose existing giving summary fields rather than requiring a new "rich summary" implementation. Current relevant fields include total giving, first/last gift dates, last gift amount, last twelve months total, monthly giving, months with giving, reliability kinds, and source explanation.
- R7. The MCP should expose enough list and segment read capabilities for AI systems to discover cohorts and retrieve the records needed to answer staff questions autonomously.
- R8. The MCP should expose sync freshness and source explanation context so generated answers can state when data was last synced or when calculations are derived from local Rock mirror data.

**Data Boundaries**

- R9. Rock RMS remains authoritative for people, households, gifts, Rock-owned giving fields, and synced source records.
- R10. The MCP must not expose payment instruments, payment tokens, gateway secrets, Rock credentials, raw access tokens, or raw provider payloads.
- R11. Transaction-level giving access is not a required v1 capability unless planning finds an existing safe read model already intended for that purpose.
- R12. AI systems may use MCP output to generate insights, summaries, comparisons, and recommendations for staff review, but the MCP must not enable autonomous donor communication or financial decisions.

**Operational Safety**

- R13. MCP tool calls should be auditable enough to understand which staff user connected, which tool was called, and what broad record or query scope was accessed.
- R14. MCP tool responses should use bounded result sizes and pagination or cursoring for list-like reads.
- R15. MCP errors must avoid leaking stack traces, credentials, raw donor payloads, or database internals.

## Success Criteria

- A staff user with active Abound access can connect an AI system through OAuth and ask useful read-only questions about donor giving and household context.
- The first MCP implementation reuses existing Abound read models rather than requiring new enriched summary infrastructure.
- AI systems can autonomously gather enough context for staff-facing insights using profile, segment, list, summary, and sync-status tools.
- No MCP operation can mutate Abound, Rock, payment, communication, pledge, task, sync, or schedule state.
- The MCP design remains compatible with the current flat active-staff access model while leaving room for future scoped authorization if product requirements change.

## Scope Boundaries

- Do not restore Finance, Pastoral Care, or Admin role behavior as part of MCP v1.
- Do not add donor self-service MCP access in v1.
- Do not build payment, recurring gift, payment method, or donor-facing giving management tools.
- Do not invent new Rock API capabilities or query live Rock directly for MCP responses unless planning explicitly validates that path.
- Do not build a new AI-generated rich-summary storage layer before exposing MCP.
- Do not expose unrestricted SQL, unrestricted Prisma, raw GraphQL passthrough, or arbitrary database querying.
- Do not send emails, create tasks, modify pledges, approve access requests, run syncs, or schedule jobs through MCP v1.

## Key Decisions

- Staff-only first: The first MCP is for internal staff users, not donors.
- Full read access for active staff: Current Abound main treats active local app users as the single staff authorization boundary, and MCP v1 should match that model instead of adding separate permission work.
- Reuse existing summaries: Giving summaries already exist in `lib/giving/metrics.ts`, `lib/people/profiles.ts`, and GraphQL profile fields, so MCP v1 should wrap those models rather than create a parallel analytics system.
- Prefer governed tools over raw query access: The AI should be highly autonomous, but through bounded tools and existing read models rather than unrestricted database or GraphQL access.

## Existing Surfaces Verified

- `lib/giving/metrics.ts` provides person and household giving summaries from `GivingFact`.
- `lib/people/profiles.ts` composes person and household profile read models with giving summaries, lifecycle labels, tasks, and communication context.
- `lib/graphql/types/people.ts` exposes `rockPerson` and `rockHousehold` profile reads.
- `lib/graphql/schema.ts` currently exposes staff GraphQL reads behind active local app access.
- `prisma/schema.prisma` contains synced financial transaction tables and `GivingFact`, but the current staff API shape is summary/profile oriented rather than a raw donor transaction ledger.

## Dependencies / Assumptions

- Auth0 remains the identity provider for staff OAuth.
- Active local `AppUser` access remains the v1 staff authorization boundary.
- The MCP implementation should follow current MCP OAuth expectations for remote protected resources during planning.
- Existing GraphQL/profile services are acceptable source read models for MCP tools unless planning finds a concrete mismatch.

## Outstanding Questions

### Resolve Before Planning

- None.

### Deferred to Planning

- [Affects R1-R3][Technical] Which Auth0 application, audience/resource indicators, token validation rules, and MCP authorization metadata should be used for the remote MCP server?
- [Affects R5-R8][Technical] Which existing GraphQL services should be wrapped directly as MCP tools, and which should be called through shared service functions to avoid HTTP-internal coupling?
- [Affects R7, R14][Technical] What result limits and pagination shape should each MCP list/segment tool use?
- [Affects R11][Technical] Should any transaction-level detail be exposed if an existing safe service already supports it, or should v1 explicitly stay summary-only?
- [Affects R13][Technical] Where should MCP audit events be stored, and what fields can be logged without exposing donor PII unnecessarily?

## Next Steps

-> `/ce:plan` for structured implementation planning.
