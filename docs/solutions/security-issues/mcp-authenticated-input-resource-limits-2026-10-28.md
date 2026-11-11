---
title: Bound authenticated MCP input before validation and application work
date: 2026-10-28
category: security-issues
module: mcp
problem_type: security_issue
component: input_validation
---

# Authenticated MCP input limits

SDK 1.32.2 alone does not activate the mitigation described in
[GHSA-46jr-4wx8-v453](https://github.com/advisories/GHSA-46jr-4wx8-v453).
`maxToolInputElements` is disabled unless configured. Abound authenticates
requests before entering the SDK, so this is a resource risk from an authorized
caller, not an unauthenticated bypass. No out-of-memory crash was attempted.

The real list filter validator allows arbitrarily wide conditions and `IN`
arrays, although it limits group depth. MCP accepts `filterDefinition` as unknown
JSON. A valid campus `IN` filter with 10,001 values previously reached the tool
callback, as did deeply nested unknown arrays. Pagination's `first <= 100` does
not limit this input work. The previous 4 MiB body default also permits much more
data than these curated tools require.

## Client-visible limits

`lib/mcp/server.ts` now sets both supported SDK options:

- Each `tools/call` may contain at most **10,000 combined array elements and
  object members** in its arguments, counted across all nesting. The SDK's
  iterative counter stops as soon as the limit is exceeded, before tool input
  validation or the application callback. The response remains HTTP 200 with an
  MCP `isError: true` tool result describing the maximum.
- Each authenticated POST body may contain at most **65,536 bytes (64 KiB)**,
  across the whole request, including JSON-RPC batches. The transport checks
  both declared length and bytes read from streams. An oversized body receives
  HTTP 413 before JSON parsing; UTF-8 bytes, not characters, are counted.

These are conservative new request ceilings, not measured production usage
maxima. A caller exceeding either must simplify its request; callers should not
blindly retry an unchanged rejected request. A structurally valid filter can now
be rejected for its resource size. Empty inputs, ordinary filters, three nested
filter groups, 1,000-value `IN` filters and `first=100` remain supported. Tests
also verify the precise 10,000-member and 64 KiB boundaries.

The existing authentication/access-token lookup, staff permissions, read-only
tools, filter operators, output pagination and audit behavior for accepted calls
are unchanged. Calls rejected by the SDK element guard never enter the tool
callback, so they also do not create the callback's database audit event. No raw
rejected filter values or sensitive donor data are logged by this change.

## Verification

Run:

```sh
pnpm exec vitest run tests/integration/mcp-resource-limits.test.ts tests/integration/mcp-route.test.ts tests/unit/mcp-auth.test.ts tests/unit/mcp-tools.test.ts
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test --maxWorkers=2
pnpm test:workers
pnpm build
```

The resource-limit tests instantiate the actual app server and actual SDK
transport. They inject only synthetic data/audit dependencies for accepted tool
calls; body tests exercise the production `handleMcpRequest` directly. They do
not mock the SDK. Before the fix, four bounded rejection regressions failed;
normal-query and existing-schema rejection checks passed. No real donor data,
database, outbound email or production services are involved. The existing full
suite's database fixture test requires a separate synthetic `TEST_DATABASE_URL`;
without it, its skip must remain visible.

## Residual risk and review

This bounds per-request input, not concurrency, execution time, response size,
database query cost, authentication lookups, saved filter definitions loaded
from storage, or other HTTP APIs. The SDK's existing 100-message batch limit
remains, with the new byte ceiling applying to the aggregate body. An authorized
client can still issue many bounded requests. Other package-graph advisories are
not resolved by these source options. The SDK's optional audience feature is a
separate contract; Abound uses opaque local access tokens rather than its
`requireBearerAuth` API.

This is a standalone source-security change requiring human PR review. It must
never be merged automatically or deployed directly from a local worktree.
