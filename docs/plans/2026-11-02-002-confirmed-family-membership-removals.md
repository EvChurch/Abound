---
title: Reconcile source-confirmed family membership removals
date: 2026-11-02
status: implementing-authorized-review-and-release-pending
roadmap: RM-007
---

# Source-confirmed family membership removal

## Evidence and scope

The remaining report case has source history explicitly recording removal of the exact member 79767 and exact retained person from the exact family on 29 June. The bounded targeted history contains no later re-add. Person/member ID and GUID lookups remain unavailable and no verified merge destination exists. See `docs/research/2026-11-02-unavailable-identity-follow-up.md`.

This is sufficient evidence to propose reconciling the old family association independently of the person's unresolved disposition. It is not permission to delete the person, invent Rock archive/deceased/status fields, transfer giving, merge a household or issue a manual production repair. The current review flag remains until a reviewed implementation and normal sync establish the new state.

## Proposed normal-sync path

1. Define a local, auditable membership-presence state that can represent source-confirmed cessation separately from Rock-owned activity/archive values. Retain the original membership identity and minimal source evidence (history identity, verb, related entity identity and timestamp). Do not store raw notes or full source history payloads.
2. For a bounded set of known family memberships absent from the new collection, verify exact member ID, original person/family bindings, current source reads and typed targeted history. Require direct matching removal evidence, check later activity, and preserve unresolved state on cap, permission, schema, ordering, identity or read failures. A 404 alone is insufficient. Distinguish a later new membership ID from restoration of the old ID; preserve any current source membership.
3. Exclude only confirmed ceased associations from current household membership/classification queries. Preserve historical giving attribution and person-owned records; the current person's deletion/merge/retention state remains a separate source-owner question. Any source reappearance must be verified and restore current presence through the normal sync.
4. Apply the same presence rule consistently to household reporting, household lists and related consumers, with source provenance and a reviewable disposition. Avoid an implementation that changes only one display while leaving another current-population query counting the old association.
5. Add regression coverage for current record missing without evidence, exact recorded removal, different person/family/member IDs, absent/limited history, timezones, later re-adds/new IDs, source reappearance, repeated syncs, retained historical giving and a surviving adult keeping the family in the report. Review the actual instance's History contract and response bounds before extending the production read allowlist.

## Release and verification

Keep the implementation GitHub-managed and reviewed. Verify complete normal sync completion, consistent report/list cohorts, the original family's surviving eligible adult, no false source flags or identity changes, financial/reference preservation and the remaining person-disposition warning. No operational SQL repair is proposed. Positive Christian-marker authority remains independent and pending Rowan.

## Authorized implementation decisions

Tataihono authorized implementation, independent review, GitHub merge/deployment and normal full-sync verification. Initial removal discovery is limited to retained active Adult-role memberships of active, unarchived type-10 families whose local people are active, non-deceased and unmerged. It is generic, not hardcoded to membership 79767. A read-only production check found exactly one such stale association. Other historical children/inactive-person reconciliation remains separately scoped. Marked associations that reappear in current source collections are also checked regardless of person eligibility.

- Add local `sourceRemovalVerifiedAt` and minimal JSON proof on the retained membership. A database constraint requires proof for a marker; the latest proof also remains after a verified reappearance, so replay protection does not depend on retaining old sync logs. Write an append-only SyncIssue proof record in the same transaction. An absent source person leaves a WARNING for disposition review; current source-person presence records an INFO reconciliation. No raw history values/notes are retained.
- Replace unconditional person/family uniqueness with an indexed historical pair plus a SQL partial unique index for current (`sourceRemovalVerifiedAt IS NULL`) associations. This permits old confirmed-removed IDs and a new source ID to coexist, while retaining one current association per pair. Prisma's model represents the pair as a non-unique index; the migration owns the partial uniqueness constraint.
- Use typed 404-only absence and complete bounded Histories metadata, preserve source timestamps without adding offsets, normalize fractional precision, reject contradictory equal-time activity, and require matching Person/GroupMember removal records for the exact family. A later new ID is separately read and verified. Current member reads can refresh real archive/status values instead of inventing cessation.
- Scan only bounded metadata pages (at most 100,000 rows) to discover at most 200 source checks, avoiding oversized SQL bind lists. A truncated scan/candidate cap fails closed before source probes. Missing/ambiguous evidence records ERROR and keeps the run partial and retained state unchanged.
- Conditional writes bind original identity/revision; restoration is part of the current-member write, not a later update. Fresh direct same-identity source verification is required to restore a marked row. Person slices cannot clear a marker without that proof. A recorded reappearance prevents replay of the old removal event: later cessation needs a newer source history identity and timestamp.
- Shared current-presence predicates cover participation/classification, current member counts/contacts, household email/Connect Group predicates, people age-group predicates and profile membership lists. Rock primary-family and giving pointers remain source-owned and unchanged. Original membership rows and audit history remain available.

Rollback is not a blind column/index drop: once historical and current IDs coexist, restoring the old unconditional unique pair would require discarding history. Retain the presence-aware reader contract and partial index during rollback, or roll forward with a reviewed correction. Clearing confirmations or rewriting archive/deceased/identity fields is not a rollback step. Verify web migrations have applied before enqueueing the new worker's verification sync; do not run repair SQL.
