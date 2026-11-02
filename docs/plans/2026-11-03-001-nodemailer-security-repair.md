---
title: Nodemailer direct and nested security repair
date: 2026-11-03
status: verified
---

# Scope and evidence

Repair PR #65 from `0f42f7c6d784180e9f2b14e46b05b69dd961b20b`, integrating current main `24586f3aa95656037788118fca4380b07bfc9a38` by normal merge. Preserve all other dependencies and overrides, including the merged Next/DOMPurify repair (#66, merge `4496c2abb2ea1d86819f429e73d976a6981ae09e`). No product, sender, authorization, donor data, database, or deployment changes.

The root Nodemailer 9.1.1 reproduces quoted-comment malformed recipient parsing. Existing tests only exercise the @maildev/smtp direct override, leaving the root and mailparser/smtp-server nested copies untested. GHSA-g57g-f23g-4646 affects >=9.1.0 <10.0.9; GHSA-prgh-xp8r-p3m5 affects >=9.1.0 <=10.0.4. Other historical Nodemailer advisories also require checking the whole resolved graph.

Primary references:

- https://github.com/nodemailer/nodemailer/releases
- https://registry.npmjs.org/nodemailer
- https://github.com/advisories/GHSA-g57g-f23g-4646
- https://github.com/advisories/GHSA-prgh-xp8r-p3m5
- https://registry.npmjs.org/mailparser
- https://registry.npmjs.org/smtp-server

Current primary registry reports Nodemailer 10.3.1, mailparser 3.14.1 and smtp-server 3.21.3. All support Node >=20; repository runtime is 22.23.4. The two supported nested releases depend on Nodemailer 10.3.1. Verify published sources and API compatibility before selection. The only application import is MailDevEmailSender, using createTransport/sendMail with string recipients, text/HTML/reply-to and success/failure mapping; Resend remains the default provider.

# Execution and review

1. Reconcile current worker ownership, exact remote head and #66 receipt; isolate this repair in its owned worktree. Preserve user and coordinator checkouts.
2. Merge verified current main normally. Discover the graph via frozen install with scripts disabled. Capture baseline lock audit.
3. Upgrade root Nodemailer to supported 10.3.1. Refresh only actual vulnerable MailDev mailparser/smtp-server paths within supported ranges, or use narrowly scoped overrides if necessary; retain the existing SMTP override. Inspect the full lock delta.
4. Add regression coverage resolving root, @maildev/smtp, mailparser and smtp-server copies through each parent's module context. Cover quoted/unquoted comments, adversarial comment-chain parsing in an isolated process with a deadline, and inbound mailparser parsing. Show regression detection against vulnerable versions.
5. Verify actual MailDevEmailSender over synthetic loopback SMTP, including envelope/MIME, acceptance and rejection. No external sends or donor data.
6. On Node 22.23.4/pnpm 10.34.9, frozen install, generate Prisma with synthetic nonconnecting DATABASE_URL, run format/lint/typecheck/build and focused/security tests; run ordinary suite where feasible, documenting database skips. Audit final lock versus current-main lock: named advisories absent at every level and no new advisory IDs.
7. Standard review of scope, API/engine contracts, tests, lock delta and failure modes before scoped commit/push. Recheck exclusive remote head; fast-forward only. Update PR title/body, capture remote SHA and hosted checks. No merge, deployment or auto-merge.

# Failure modes and verification limits

- Major Nodemailer upgrade may change parser normalization or SMTP behavior: verify published changes and real loopback transport; retain rejection-to-FAILED behavior.
- A direct override can miss nested parser imports: resolve dependencies from their real parent package paths and audit every lock entry.
- Parser denial-of-service tests must run outside the test process so a vulnerable parser cannot hang the suite indefinitely; use synthetic invalid-domain fixtures and a generous deadline.
- Development MailDev dependencies may ship in the image; do not dismiss nested findings as development-only. Resend is the default but configurable SMTP remains reachable.
- Audit counts are advisory matches, not exploitability proof. Review all residual findings separately and report any new IDs against current main.
- No real database is configured for verification. Prisma generation must not connect; database-dependent suites may skip and cannot establish live integration correctness.
- If remote ownership changes or push fails, preserve the tested patch and report delivery honestly. CI is separate from local validation.

# Implementation and primary-source review

Selected Nodemailer 10.3.1 after verifying registry metadata and SHA-512 tarball integrity. Published CHANGELOG records the 10.0.5 comment-chain fix, 10.0.9 quoted-local fix and subsequent parser hardening. The published package exports both ESM and CommonJS, the addressparser/mime-node subpaths used by nested consumers, and bundled declarations. createTransport/sendMail and the app's string recipient/MIME fields remain supported. Existing @types/nodemailer is preserved; repository typecheck validates the bundled declarations in use. Registry metadata and published source are retained in the external repair evidence. GitHub release API access was unavailable (App repository scope, then public API rate limit); the current publisher tarball and registry are the primary release/source evidence instead.

The recursive update experiment also refreshed unrelated tool dependencies, so its lock was discarded. The final change adds only `@maildev/smtp>mailparser: 3.14.1` and `@maildev/smtp>smtp-server: 3.21.3` alongside the existing direct SMTP override. Both versions satisfy MailDev's original semver ranges; supported package upgrades replace its nested Nodemailer pins. Lock changes beyond these packages are solely the new mailparser MIME dependency closure (mailsplit, libmime, libbase64, libqp, encoding-japanese, html-to-text and removal of the obsolete deepmerge-ts copy). All other importer versions and overrides are preserved.

Negative controls: quoted-local fixture fails against published 9.1.1, and the same 200,000-atom parser workload exceeds the four-second subprocess deadline on published 10.0.3. Every installed parent context is tested independently even when pnpm deduplicates the fixed package.

# Verification outcome and standard review

- Node 22.23.4 / pnpm 10.34.9 confirmed; frozen scripts-disabled install passes.
- Prisma generation passes with `postgresql://fixture:fixture@localhost:1/fixture`; generated source has no diff.
- `pnpm format:check`, `pnpm lint`, `pnpm typecheck` pass in order. Production build and two worker runtime tests pass.
- Focused sender/MailDev/security tests: 26 pass. Full ordinary suite: 82 files pass, 2 files skip; 517 tests pass, 4 skip with TEST_DATABASE_URL unset. Database integration remains unverified.
- Negative controls reproduce the quoted-local parser regression on 9.1.1 and the comment-chain deadline failure on 10.0.3. All four installed parent contexts resolve to 10.3.1 and pass.
- Current-main lock audit: 152 -> 137 findings, no new advisory IDs. Final: 0 critical, 52 high, 71 moderate, 14 low. No Nodemailer advisory remains, including GHSA-g57g-f23g-4646 and GHSA-prgh-xp8r-p3m5 that appear on the original PR head. Residual advisories concern other dependencies (including Hono, undici, fast-uri, tooling and editor packages) and need separate assessment; no clean-repository claim.
- Standard review before push checked the manifest/lock scope, publisher source and engine/API contracts, actual parent resolution, subprocess test deadlines, transport acceptance/rejection, unchanged default sender and ownership. Corrected test fixture/module resolution/escaping/type-narrowing issues found during validation; no application compatibility changes were necessary. No remaining scoped code-review findings.

GitHub delivery evidence, exact commit and hosted-check state are recorded externally with the coordinator repair result. This plan does not authorize merge or deployment. Narrow overrides should be removed when a future MailDev release selects these supported fixed versions itself and equivalent graph/security verification passes.
