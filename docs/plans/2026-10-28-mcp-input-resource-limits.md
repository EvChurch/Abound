# MCP input resource limits

Phase: focused security execution and review. Scope: the authenticated Abound MCP
boundary only; no auth, permissions, filter semantics, dependency, or deployment changes.

## Evidence and intended fix

GHSA-46jr-4wx8-v453 requires configuration as well as SDK 1.32.0+. The current
SDK is 1.32.2, but `createAboundMcpServer` supplies no `maxToolInputElements` and
the transport retains its 4 MiB default. Authentication runs before the SDK;
this is an authorized-client resource risk, not an anonymous authentication bypass.

`filterDefinition: z.unknown()` admits arbitrary JSON to the list-query tools.
The real filter validator limits group depth to three, but does not bound group
width or `IN` values. `first <= 100` bounds output, not filter input. A valid
10,001-value campus `IN` filter fits well below 64 KiB and previously reached
the application callback. Deep unknown arrays also reach this boundary.

Use the SDK's iterative, early-stopping element counter, with a ceiling of
10,000 combined array elements/object members per tool call, before schema
validation/callback execution. Set the production transport's supported
`maxRequestBodySize` to 64 KiB. Test both controls through the real SDK and app
server, including byte boundaries, streamed UTF-8, wide valid filters, nested
unknown input, and ordinary queries with `first=100` and 1,000 `IN` values.
These are explicit new client limits, not observed production traffic maxima.

## Verification and boundaries

1. Run the new focused regressions before the fix; capture their rejection failures.
2. Apply only SDK constructor options; rerun focused tests and existing auth/tool tests.
3. Run formatting, lint, types, full unit/integration suite, both compiled worker
   checks and production build; keep the existing database fixture skip visible.
4. Audit the complete before/after lock closure at both immutable commits; no
   dependency change is expected. Review the full diff and inherited review rules.
5. Open a standalone source-security PR for human review. Never auto-merge or deploy.

Residuals: limits apply after existing authentication and do not bound token
lookup, concurrent requests, request duration, response size, saved filter data,
or other API surfaces. SDK batch count remains 100; its shared transport byte
limit bounds the aggregate body. Rejected over-cardinality calls do not invoke
application callbacks or their database audit recorder. No hostile OOM payloads,
real data, external services, or secrets are needed for the regression tests.
