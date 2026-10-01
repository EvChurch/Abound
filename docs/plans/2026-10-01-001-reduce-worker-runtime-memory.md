# Reduce production worker runtime memory

## Scope and evidence

Production inspection on 2026-10-01 measured approximately 1.17 GB for the
worker, 0.35 GB for web, and 0.70 GB for Postgres. The worker stayed between
1.13 and 1.18 GB over the preceding day. Its process tree includes the sync
worker, communication worker, supervisor, three tsx launchers, and six esbuild
processes. Local HEAD matches the inspected production commit, `19587b2`.

The first implementation removes runtime TypeScript compilation. It preserves
separate worker processes, job behavior, polling, and local development commands.
Compile application imports at build time, leave npm dependencies external, and
launch the compiled supervisor and children directly with Node. The worker's
Railway build no longer needs to build the Next.js application.

Compound Engineering phases: scoped plan, implementation, verification, review.
The named ce skills were not found in the installed skill directories; this
document records the equivalent workflow and its verification gates.

## Implementation

- Add a pinned esbuild build dependency and a worker-only build command.
- Compile the supervisor and both worker entry points into ignored output.
- Use direct child processes without shells; forward shutdown signals to the
  actual worker processes and stop sibling workers on unexpected exits.
- Update Railway's worker build and start commands and build workers in CI.
- Verify the compiled process topology and shutdown with isolated fixtures.
- Run formatting, lint, typecheck, tests, and the production worker build.

## Limits and follow-up

The Rock client still accumulates all pages across 13 collections, normalizes
them, and creates further record objects. Snapshot refreshes also load giving
facts. Bounded sync processing is a separate, larger change requiring explicit
reconciliation and authorization regression coverage.

Production savings are unverified until deployment. Do not impose a hard memory
limit without peak measurements: an OOM during sync can leave an incomplete
local refresh. This change does not alter Rock reads, donor data, authorization,
or communication sending behavior. Build/import failures prevent workers from
starting; child exits stop the supervisor so Railway can restart the service.

Deploy only through GitHub review, passing main CI, and the connected Railway
deployment. After deployment, confirm successful jobs in both queues, exactly
three Node worker processes with no tsx/esbuild processes, and compare memory
over complete sync cycles. Roll back through GitHub if imports or jobs fail.

## Verification results

- `pnpm build:workers` succeeds. Both real compiled worker modules load and
  reach the expected connection-refused failure against an isolated localhost
  database address; no production connections or jobs were used.
- `pnpm test:workers`: two process-level tests pass, covering startup, shutdown
  signal forwarding, and sibling termination after an unexpected successful exit.
- The existing suite passes with CI placeholder environment variables: 408 tests
  passed, one skipped. The initial run without those variables failed at Prisma
  initialization; no product change was needed to resolve it.
- Formatting, lint, and typecheck pass. Generated worker output is excluded
  from lint and version control.
- A local Linux startup comparison used the same worker sources, production
  mode, placeholder credentials, and a localhost TCP database stub that accepts
  connections without replying. After four seconds, summing proportional set
  size (PSS) across each process group gave 447.3 MiB / 13 processes for
  `pnpm exec tsx scripts/worker.ts`, versus 137.6 MiB / 3 processes for
  `node dist/workers/worker.mjs`. Both groups were terminated afterward.
  This is a startup observation on Node 24, not a production steady-state or
  full-sync benchmark; do not translate it directly into guaranteed cost savings.
- Review confirmed local development still uses tsx, production children use
  direct Node execution, npm dependencies remain external, and worker-only
  compilation is covered by CI. No production service configuration was changed.
