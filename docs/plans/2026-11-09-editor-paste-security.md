# Editor paste security repair

## Inspect and plan

GHSA-c8x8-7fp4-3x9w affects the ProseMirror view used by `@react-email/editor` in `components/communications/template-editor.tsx`. Staff may paste untrusted HTML while preparing sensitive communications. Verify the publisher range and patch, actual pnpm constraints, and runtime closure before changing dependencies.

## Work

- Refresh only the vulnerable transitive resolution to the minimum publisher-patched version if existing ranges permit; retain the editor and framework versions.
- Add an isolated synthetic DOM paste regression through the installed editor closure, including a harmless execution sentinel and normal paste/serialization compatibility. Capture red-before and green-after without staff data or external services.
- Preserve Rock ownership, Auth0 and active local authorization, staff review, and existing editor form behavior.

## Review and verification

Run formatting before lint/typecheck, focused regression, full tests with a private synthetic database, worker runtime and production build. Compare complete advisory identities and dependency paths before/after; retain unrelated findings. Refresh main and PR inventory before push, incorporate PR 76 if normally merged, and inspect the complete diff. Open a dedicated draft PR only; no merge or deployment.

## Failure modes and open assumptions

A dependency fix addresses this publisher paste vulnerability, not every possible unsafe stored HTML or unrelated advisory. DOM execution sentinel coverage must be distinguished from real browser execution. Hosted Verify/image results must match the final PR head or be reported pending. No production session, donor data, mail, Rock or Auth0 tenant access is needed. Validation evidence and exact commands live in the parent security run repair directory.

## Implementation findings

- Publisher advisory: https://github.com/ProseMirror/prosemirror-view/security/advisories/GHSA-c8x8-7fp4-3x9w (CVE-2026-104847), affected `<1.42.3`, first patch `1.42.3`. Publisher patch `2e91a612bbc1248e55b4f6061fc93fe459f977c1` validates attributes restored from clipboard slice context.
- Installed closure: `@react-email/editor@1.6.8 -> @tiptap/pm@3.27.4 -> prosemirror-view@1.42.1`. The existing `^1.41.9` range accepts `1.42.3`; its `prosemirror-model ^1.25.8` requirement is met by existing `1.25.11`. State `1.4.4` and transform `1.12.0` remain unchanged.
- Refresh only the view package resolution, publisher integrity, and all existing snapshot references. The manifest stays consistent without an override. Recursive pnpm update refreshed unrelated packages and was discarded before the targeted refresh; frozen install validates the final graph.
- Isolated jsdom regression resolves the view through the editor closure. A minimal schema with a rejecting attribute validator demonstrates the publisher contract: a harmless DOM-marker handler restored through clipboard context executes on `1.42.1`; `1.42.3` rejects it before rendering/serialization. This is synthetic schema coverage, not a claim to reproduce every attack against the email editor schema or a real browser session.
- Ordinary paste/serialization passes in that fixture. A separate unmocked `EmailEditor` test preserves template placeholders, formatted paste, update callbacks, JSON and HTML/text exports. Existing staff communication page tests cover the surrounding workflows.
- Full audit identity/path comparison removes only GHSA-c8x8-7fp4-3x9w at `.>@react-email/editor>@tiptap/pm>prosemirror-view`; 119 other advisory identities remain with unchanged findings. No blanket security clearance is implied.

## Review boundary

Dedicated draft PR only. Validation receipts, rejected update attempt, red/green logs, full advisory ledger and final patch are retained under the parent run's `batches/003/repair-abound-editor` directory. Any missing final-head hosted checks must stay explicit in that PR and run report. No production deployment or data repair is authorized by this plan.
