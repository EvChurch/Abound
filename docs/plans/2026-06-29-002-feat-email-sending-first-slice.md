---
date: 2026-06-29
sequence: 002
feature: email-sending-first-slice
status: draft
brainstorm:
  - docs/brainstorms/2026-06-29-email-sending-communications-requirements.md
---

# Email Sending First Slice Plan

## Objective

Move the Communications workspace from handoff-only toward email sending by adding draft content, send-run tracking, recipient snapshots, and a non-delivering capture sender adapter.

This first slice must not deliver production email. It creates the technical and product workflow needed for sending while keeping external delivery disabled until the church verifies provider ownership, communication preference handling, sender domain setup, bounce/unsubscribe behavior, and authorization policy.

## Current Context

- `CommunicationPrep` owns audience preparation, review notes, audience preview, and status timestamps.
- The detail page at `app/communications/[id]/page.tsx` already supports ready, approve, hand off, and cancel.
- `lib/communications/segments.ts` can resolve a bounded, role-safe audience preview from saved list views or filters.
- Admin and Pastoral Care can manage communications through `communications:manage`; Finance cannot.
- Existing docs intentionally prohibit real send behavior in the current implementation.

## Requirements

- R1. Staff can store an email subject and body on a communication prep.
- R2. Staff can create a send run only after a prep is approved.
- R3. The first sender adapter captures intended sends locally and never sends external email.
- R4. Send runs snapshot recipients from the approved audience preview or resolver output with minimal necessary fields.
- R5. Missing or inactive email recipients are skipped and recorded with an exclusion reason.
- R6. Send-run status shows pending, captured, failed, skipped, and total counts.
- R7. Services enforce local authorization and do not rely only on UI state.
- R8. Tests cover approval gating, permission denial, recipient exclusion, and capture-adapter behavior.
- R9. Docs continue to make production delivery blockers explicit.

## Non-Goals

- Do not integrate a production email provider.
- Do not call Rock communication mutation APIs.
- Do not add SMS, push, scheduled campaigns, journeys, or AI autonomous sending.
- Do not implement unsubscribe or bounce sync until the authoritative owner is chosen.
- Do not store payment details, provider secrets, raw provider payloads, or sensitive logs.

## Proposed Data Model

Add fields to `CommunicationPrep`:

- `emailSubject String?`
- `emailPreviewText String?`
- `emailBody String?`
- `emailReplyTo String?`

Add `CommunicationSendRun`:

- `id String @id @default(cuid())`
- `communicationPrepId String`
- `status CommunicationSendRunStatus`
- `adapter String`
- `requestedByUserId String?`
- `recipientCount Int`
- `capturedCount Int`
- `skippedCount Int`
- `failedCount Int`
- `requestedAt DateTime @default(now())`
- `startedAt DateTime?`
- `completedAt DateTime?`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Add `CommunicationSendRecipient`:

- `id String @id @default(cuid())`
- `sendRunId String`
- `resource CommunicationAudienceResource`
- `personRockId Int?`
- `householdRockId Int?`
- `displayNameSnapshot String`
- `emailSnapshot String?`
- `status CommunicationSendRecipientStatus`
- `exclusionReason String?`
- `providerMessageId String?`
- `capturedAt DateTime?`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Enums:

- `CommunicationSendRunStatus`: `PENDING`, `CAPTURED`, `PARTIAL`, `FAILED`, `CANCELED`
- `CommunicationSendRecipientStatus`: `PENDING`, `CAPTURED`, `SKIPPED`, `FAILED`

Use an enum or string for recipient resource depending on whether the existing `SavedListViewResource` is sufficient. Avoid coupling recipient rows to the plural list-view enum if it makes person/household references awkward.

## Service Design

Add `lib/communications/sending.ts`:

- `updateCommunicationEmailDraft(input, actor, client)`
- `createCommunicationSendRun(input, actor, client, sender)`
- `listCommunicationSendRuns(prepId, actor, client)`
- `getCommunicationSendRun(id, actor, client)`

Add `lib/communications/email-sender.ts`:

- `EmailSender` interface
- `CaptureEmailSender` implementation
- payload and result types

Gating rules:

- Require `communications:manage` in this first slice.
- Refuse send-run creation unless prep status is `APPROVED`.
- Refuse send-run creation unless subject and body are present.
- Refuse external delivery entirely because only capture adapter exists.
- Skip recipients where `contactReady` is false or email is blank.

## UI Work

Update `app/communications/[id]/page.tsx`:

- Add an email draft form for subject, preview text, reply-to, and body.
- Add a send-readiness panel showing approved status, draft completeness, audience count, and exclusions.
- Add a "Capture send" action only when the prep is approved and draft is complete.
- Show recent send runs with captured/skipped/failed counts.

Keep the current status controls but rename final handoff language later if send runs replace handoff in the UX.

## Tests

Add or update unit tests:

- `tests/unit/communication-prep.test.ts`
  - draft fields normalize and persist
- `tests/unit/communication-sending.test.ts`
  - denies Finance
  - refuses unapproved prep
  - refuses missing subject/body
  - skips missing/inactive email recipients
  - records captured recipients with safe metadata
  - computes send-run counts
- `tests/unit/communications-page.test.tsx`
  - detail page shows draft/send panels for authorized users
  - unavailable send action is visibly gated

Add migration coverage in `tests/integration/prisma-migrations.test.ts`.

## Implementation Steps

1. Add Prisma models, enums, indexes, and migration.
2. Regenerate Prisma client and Pothos types if needed.
3. Add capture sender types and sending service.
4. Extend prep service for draft fields.
5. Add server actions for draft save and capture send.
6. Update the communication detail UI.
7. Add focused tests.
8. Run `pnpm prisma:generate`, `pnpm typecheck`, and relevant tests.
9. Update `docs/architecture/communications.md` to describe the new non-delivering send-run boundary.

## Failure Modes And Verification

| Risk                              | Mitigation                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| Accidental production email       | Only implement capture adapter; no provider dependency, key, or network send path.   |
| Sending before review             | Service-level `APPROVED` gate with tests.                                            |
| Sending to inactive/missing email | Recipient snapshot skips `contactReady=false` and blank email.                       |
| Role leakage                      | Reuse communication audience resolver and `communications:manage`; add denial tests. |
| Sensitive logs                    | Store aggregate status and minimal snapshots; do not log raw payloads or secrets.    |
| Stale audience confusion          | Label snapshots as send-run snapshots and preserve prep/audience source metadata.    |

## Open Decisions Before Production Send

- Which system owns production sending?
- Which source owns unsubscribe, suppression, bounce, and communication preference state?
- Should approval and send be separate permissions?
- Should the same user be allowed to approve and send?
- What sender domain and reply-to identity should be used?
- Are test sends required before production send?
