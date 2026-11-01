# Next.js and DOMPurify security repair

## Scope and contracts

Repair GHSA-2464-fhr4-w9xw and GHSA-673q-mjm6-r5xr with Next.js 16.4.1, matching ESLint tooling, and the existing React Email UI Next override. Next 16.4.1 requires Node >=20.9 and accepts the existing React 19; its optional sharp range starts at 0.35.5. Production uses glibc Debian bookworm. The app uses next/image with default image configuration; no use-cache directives or Cache Components configuration were found. Upgrade despite unconfirmed exploitability.

Repair GHSA-cg2g-xh64-v4q7 by refreshing DOMPurify to 3.4.17 within @maildev/smtp 3.0.0's declared ^3.4.13 range. Maildev is already at its latest direct release. The current sole DOMPurify path is development maildev -> @maildev/smtp, not React Email editor. Maildev sanitizes HTML strings with WHOLE_DOCUMENT, SANITIZE_DOM, ADD_TAGS and ADD_ATTR, without SAFE_FOR_TEMPLATES or DOM-returning modes. No production application import was found, but Docker installs development dependencies, so this copy can ship in the image. No new transitive override or application behavior change is planned.

Primary contracts: [Next release](https://github.com/vercel/next.js/releases/tag/v16.4.1), [DOMPurify release](https://github.com/cure53/DOMPurify/releases/tag/3.4.17), [sharp release](https://github.com/lovell/sharp/releases/tag/v0.35.5), and npm manifests for these exact versions. Publisher advisory ranges and release fixes take precedence over stale prose in advisory descriptions.

## Work and verification

1. Preserve baseline frozen-install and audit evidence; inspect package owners, callers, release changes, engines and peers.
2. Update only Next and matching tooling/override; refresh the allowed DOMPurify resolution. Review all lockfile changes and confirm every resolved Next/sharp/DOMPurify copy meets patched ranges.
3. Generate Prisma with synthetic localhost configuration; run format:check, lint, typecheck, test, test:workers and build sequentially. Exercise native sharp image rendering and the DOMPurify shadow-root regression without evaluating injected expressions. Keep TEST_DATABASE_URL unset; report database suites skipped by design.
4. Compare full audits, document residual findings, review the final diff, then commit/push a dedicated branch and open a PR after refreshing GitHub ownership/dedup state. Inspect exact pushed head, PR diff and CI. No merge or deployment.

## Failure modes and delivery limits

Potential regressions are Next minor-release compilation/rendering, image native ABI/runtime loading, and sanitizer behavior. Revert the dependency commit through normal GitHub review if needed; no schema or data migration is involved. Local static/fixture validation cannot prove production integration behavior or exploitability. Keep unrelated audit findings visible in the repair report without broadening the dependency update. Exact logs, versions, audit deltas and delivery status live in the coordinator-requested local repair report.

## Compatibility finding

Matching eslint-config-next 16.4.1 requires eslint-plugin-react-hooks ^7.1.0 (resolved 7.1.1). Its rules flag the existing synchronous state reset in the pledge queue effect. Replace only that prop-to-state synchronization with React's guarded render-time adjustment, preserving optimistic removal and rollback. Verify refreshed candidate props, unchanged-prop rerenders, successful action removal and failed-action restoration. No financial recommendation algorithm or server action changes are needed.

The initial general transitive update attempt refreshed unrelated packages; discard that attempt. Refresh only DOMPurify's parsed lock entries and integrity from its exact npm manifest within the owner's compatible range, then verify with a frozen install. The final structured lock delta must contain only Next/tooling, sharp/libvips and DOMPurify changes.
