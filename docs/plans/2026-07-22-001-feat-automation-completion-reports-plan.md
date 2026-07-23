---
title: "feat: Add automation completion reports"
type: feat
status: active
date: 2026-07-22
origin: docs/brainstorms/2026-06-29-email-sending-communications-requirements.md
---

# feat: Add automation completion reports

## Overview

Add configurable post-run completion report emails for communication automations. A finished automation run should email a staff-safe recipient summary to configured report recipients, beginning with new-giver workflows where membership staff need to review who entered the follow-up path.

## Problem Frame

The origin requirements now distinguish pre-send review from post-run operational reporting. Reviewers approve or adjust a frozen run before sending, while completion report recipients receive a final summary after all sends have been attempted. These reports must help staff see who was included and what happened without mutating Rock or exposing gift amounts, payment details, raw provider payloads, or finance-only explanations.

## Requirements Trace

- R25. Active local app access authorizes automation setup, review, exclusion, activation, completion reporting, and sending.
- R29. Staff can configure one or more arbitrary completion report email addresses for an automation, independent of pre-send reviewers.
- R30. After a run finishes attempting recipient sends and reaches `SENT`, `PARTIAL`, `FAILED`, or `SKIPPED`, the app sends a completion report to configured recipients.
- R31. The report lists each included person's name and email address and distinguishes recipient outcomes from the frozen run snapshot where useful.
- R32. New-giver reports support membership review, including people separately reactivated upstream.
- R33. Reports avoid unnecessary donor-sensitive detail.
- R34. Report email subjects use the report/workflow name.
- R35. Report delivery is non-critical and must not mark the automation run failed.

## Scope Boundaries

- Do not make completion reports mutate Rock membership, connection status, activity status, giving lifecycle, gifts, or communication records.
- Do not include gift amounts, payment data, raw provider payloads, or finance-only explanations in report content.
- Do not introduce a broad notification/group-management system in this slice.
- Do not change pre-send reviewer semantics; completion report recipients are a separate configuration.

## Context & Research

### Relevant Code and Patterns

- `prisma/schema.prisma` already models automations, reviewers, frozen runs, recipients, provider events, and run outcome counts.
- `lib/communications/automation-jobs.ts` sends reviewer notices and performs due send jobs through the shared `EmailSender` abstraction.
- `lib/communications/automations.ts` owns create/update input normalization, reviewer validation, record includes, and readiness labels.
- `components/communications/automation-setup-form.tsx` is the existing setup/edit surface for schedule, reviewers, repeat sending, segment, and template fields.
- `tests/unit/communication-automation-jobs.test.ts`, `tests/unit/communication-automations.test.ts`, `tests/unit/communication-automation-actions.test.ts`, and `tests/unit/communication-automations-page.test.tsx` are the closest test patterns.

### Institutional Learnings

- `docs/solutions/best-practices/shared-staff-access-and-migration-deploy-verification-2026-07-21.md`: Auth0 proves identity; active local `AppUser` grants shared staff access. Do not reintroduce local roles by accident.
- `docs/solutions/best-practices/rock-sync-local-mirror-and-test-database-boundaries-2026-04-17.md`: Keep Rock authoritative and use app-owned rows for workflow/reporting state.

## Key Technical Decisions

- Store completion report recipients as app-owned automation configuration: They belong to the automation workflow, not Rock, and should be versioned with local migrations.
- Support arbitrary email addresses first, with validation and normalization: The stakeholder request explicitly supports typed email addresses such as individual staff and a membership inbox. A future iteration can add reusable staff groups if needed.
- Send reports from the existing automation send-job path after run terminal status is persisted: This keeps reports tied to the same frozen recipient snapshot and avoids a separate scheduler for the first slice.
- Prefer an idempotent completion-report marker on the run: Re-running a send job or retrying after partial failure should not send duplicate reports without an explicit future resend action.
- Treat report failure as non-critical: record the report failure separately, but do not mark the automation run failed when donor sends have already reached their own terminal status.

## Open Questions

### Resolved During Planning

- Should report recipients be independent of reviewers? Yes; the origin request explicitly separates review/activation from membership-oriented completion reporting.
- Should completion reports apply only to first-time-giver workflows? No; implement as reusable automation configuration, with new-giver/membership as the first product use case.
- Should reports be per-run or monthly? Per-run. Monthly reactivation or new-giver data views can remain separate reporting work.
- What should appear in the first report? Use the report/workflow name as the subject, and include recipient name and email in the summary.
- What if report delivery fails? Record the failure separately; do not mark the automation run failed.

### Deferred to Implementation

- Exact recipient outcome detail: Start with name and email, then include outcome and non-sensitive reason if the report needs to explain skipped/excluded/failed recipients without becoming noisy.

## Implementation Units

- [x] **Unit 1: Persist Completion Report Configuration**

**Goal:** Add app-owned storage for one or more completion report email addresses per automation and an idempotency marker for report delivery.

**Requirements:** R29, R30, R33

**Dependencies:** None.

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_communication_completion_reports/migration.sql`
- Modify: `tests/integration/prisma-migrations.test.ts`

**Approach:**

- Add a local child table such as `CommunicationAutomationCompletionReportRecipient` with `automationId`, normalized arbitrary `email`, optional display label, timestamps, cascade delete, and a uniqueness constraint per automation/email.
- Add nullable run fields `completionReportSentAt` and `completionReportFailedAt` on `CommunicationAutomationRun`.
- Keep the schema independent from `AppUser` so shared inboxes like a membership address are supported without creating local users.

**Patterns to follow:**

- `CommunicationAutomationReviewer` for child-row ownership and uniqueness shape.
- Existing migration tests that assert communication automation tables and indexes.

**Test scenarios:**

- Happy path: migration creates completion report recipient storage with a unique automation/email constraint.
- Edge case: deleting an automation cascades report recipient configuration.
- Integration: migration test recognizes the new table/index/foreign-key shape.

**Verification:**

- Prisma schema and migration agree, and migration integration assertions include the new communication-report objects.

- [x] **Unit 2: Add Configuration To Services, Actions, GraphQL, And UI**

**Goal:** Let staff create and edit completion report recipients alongside automation settings.

**Requirements:** R25, R29, R33

**Dependencies:** Unit 1.

**Files:**

- Modify: `lib/communications/automations.ts`
- Modify: `app/communications/actions.ts`
- Modify: `components/communications/automation-setup-form.tsx`
- Modify: `lib/graphql/types/communications.ts`
- Test: `tests/unit/communication-automations.test.ts`
- Test: `tests/unit/communication-automation-actions.test.ts`
- Test: `tests/unit/graphql-communication-automations.test.ts`
- Test: `tests/unit/communication-automations-page.test.tsx`

**Approach:**

- Add `completionReportEmails` or a similarly clear field to create/update inputs and record includes.
- Normalize emails by trimming, lowercasing the address portion, removing blanks, and de-duplicating.
- Validate with a conservative email check suitable for staff-entered operational addresses; reject invalid entries with `BAD_USER_INPUT`.
- Render a compact multi-email input in the setup/edit form. The existing UI can use comma/newline-separated entry for the first slice, with help text kept minimal and operational.
- Expose report recipient summaries through GraphQL only as safe configuration metadata.

**Patterns to follow:**

- Reviewer validation and create/update transaction replacement in `lib/communications/automations.ts`.
- Existing action form-data parsing in `app/communications/actions.ts`.
- Existing setup-form field styling and compact fieldsets.

**Test scenarios:**

- Happy path: create automation persists two report emails independent of reviewers.
- Happy path: update automation replaces report emails without changing reviewers.
- Edge case: blank and duplicate report emails collapse to one normalized value.
- Error path: invalid report email rejects the create/update action.
- Authorization: anonymous and needs-access users cannot submit completion report configuration, following existing action redirects.
- GraphQL: automation type exposes only safe completion-report metadata.
- UI: edit page renders existing report emails and submits changed values.

**Verification:**

- Staff can configure multiple completion report email addresses on create and edit without creating local app users for shared inboxes.

- [x] **Unit 3: Compose And Send Completion Reports**

**Goal:** Send one post-run summary email to each configured report recipient after a run reaches a terminal send outcome.

**Requirements:** R30, R31, R32, R33

**Dependencies:** Units 1-2.

**Files:**

- Modify: `lib/communications/automation-jobs.ts`
- Create: `lib/communications/completion-reports.ts`
- Test: `tests/unit/communication-automation-jobs.test.ts`
- Test: `tests/unit/communication-completion-reports.test.ts`

**Approach:**

- Build a small report composer that accepts an automation/run with ordered frozen recipients and returns subject, text, and HTML.
- Use the report/workflow name in the subject.
- Include counts and recipient rows with recipient name, email, sent/accepted, skipped, excluded, failed, and pending/unknown outcomes.
- Include only operational fields: display name, email when already stored on the frozen recipient, outcome, and non-sensitive skip/exclusion/failure reason.
- Call the composer from `performCommunicationAutomationSendJob` after updating the run's terminal send status. Guard with the run idempotency marker so retries do not duplicate reports.
- For zero-deliverable or skipped runs, still send a completion report if report recipients are configured and the run has frozen recipients to summarize.
- Record report send failures separately without changing the automation run's terminal status.
- Tag report emails separately from donor sends, for example `type: "completion-report"`.

**Patterns to follow:**

- `notifyCommunicationAutomationReviewers` in `lib/communications/automation-jobs.ts` for sender usage and staff-safe HTML/text construction.
- `recordAcceptedAutomationRecipient` for explicit event recording after provider acceptance.

**Test scenarios:**

- Happy path: completed run with sent, skipped, excluded, and failed recipients sends a summary to each configured report email.
- Happy path: report content includes membership-useful names/outcomes but no giving amounts, payment details, provider payloads, or rendered donor email body.
- Edge case: no configured report recipients means no report send attempt.
- Edge case: zero-deliverable skipped run with frozen skipped recipients still sends a report.
- Error path: report sender failure is recorded without marking donor recipients or the automation run as failed.
- Idempotency: re-running the job after `completionReportSentAt` does not send duplicate reports.

**Verification:**

- Terminal automation runs produce exactly one completion-report send per configured report address, using frozen recipient outcomes.

- [x] **Unit 4: Update Documentation And Operational Notes**

**Goal:** Keep the product and architecture docs aligned with the implemented behavior and operational verification steps.

**Requirements:** R29-R33

**Dependencies:** Units 1-3.

**Files:**

- Modify: `docs/architecture/communications.md`
- Modify: `docs/brainstorms/2026-06-29-email-sending-communications-requirements.md`
- Modify: `docs/plans/2026-07-22-001-feat-automation-completion-reports-plan.md`

**Approach:**

- Document the implemented report fields, failure policy, and idempotency marker.
- Document that completion reports are operational summaries and not Rock mutation workflows.
- Keep capture mode and live Resend behavior on the existing sender infrastructure.

**Patterns to follow:**

- Existing communication architecture boundary and follow-up-work sections.

**Test scenarios:**

- Test expectation: none -- documentation-only unit after behavioral tests land in Units 1-3.

**Verification:**

- Docs state what the shipped report includes, what it excludes, and how staff can verify a completed run.

## System-Wide Impact

- **Interaction graph:** Automation create/update, server actions, GraphQL reads, setup/edit UI, due send worker, and email sender are affected.
- **Error propagation:** Invalid configuration should fail during create/update; report send failures should not be confused with donor-recipient send failures.
- **State lifecycle risks:** Retry/idempotency matters because send jobs can be re-run; the plan requires a report delivery marker.
- **API surface parity:** GraphQL should expose safe report recipient configuration if the UI/API already exposes automation settings there.
- **Integration coverage:** Unit tests should cover service/action/job behavior; migration tests should cover persistence shape.
- **Unchanged invariants:** Rock remains authoritative, communication preferences remain unresolved for live sends, and reports do not include financial details or mutate donor/member state.

## Risks & Dependencies

| Risk                                              | Mitigation                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Reports leak sensitive giving context by accident | Compose reports from frozen recipient operational fields only; add tests asserting excluded terms/data are absent.          |
| Duplicate reports after job retries               | Persist a completion-report delivery marker before or transactionally around report send attempts, and test retry behavior. |
| Shared inboxes are not local app users            | Store normalized email addresses directly rather than requiring `AppUser` rows.                                             |
| Report delivery failure masks donor send results  | Treat completion report delivery as separate operational notification state, not recipient delivery state.                  |

## Documentation / Operational Notes

- Keep live-send gating unchanged. Completion reports should use the same sender/capture infrastructure so staging and local verification do not contact external recipients unexpectedly.
- When implemented, update `docs/architecture/communications.md` with exact report fields and failure behavior.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-06-29-email-sending-communications-requirements.md](../brainstorms/2026-06-29-email-sending-communications-requirements.md)
- Related roadmap seed: [docs/brainstorms/2026-07-21-communication-journeys-roadmap-seed.md](../brainstorms/2026-07-21-communication-journeys-roadmap-seed.md)
- Related roadmap seed: [docs/brainstorms/2026-07-21-communication-history-roadmap-seed.md](../brainstorms/2026-07-21-communication-history-roadmap-seed.md)
- Related architecture: [docs/architecture/communications.md](../architecture/communications.md)
- Related code: `lib/communications/automation-jobs.ts`
- Related code: `lib/communications/automations.ts`
- Related code: `components/communications/automation-setup-form.tsx`
- Related tests: `tests/unit/communication-automation-jobs.test.ts`
- Related tests: `tests/unit/communication-automations.test.ts`
