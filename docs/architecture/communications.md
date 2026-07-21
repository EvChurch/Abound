---
date: 2026-04-20
topic: communications
status: active
related:
  - docs/research/church-giving-communications-benchmark.md
  - docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md
  - docs/plans/2026-04-20-001-feat-people-household-list-views-plan.md
---

# Communications Architecture

## Boundary

Communications now have two local workflow surfaces:

- `CommunicationPrep`: a handoff-oriented staff preparation workflow for one-off audiences.
- `CommunicationAutomation`: a reviewed, app-owned email automation workflow for recurring saved segments.

Rock remains authoritative for Rock-owned people, households, communication preferences, groups, data views, gifts, and giving setup. The app owns local automation configuration, reviewer gates, structured template fields, scheduled run snapshots, suppression records, and provider event audit history.

The first automation is intentionally narrow: people in the Rock `Joining` connection status who are also in the local `NEVER_GIVEN` giving lifecycle. It is associated to a saved People list view named `Joining - Never Given` rather than to hard-coded SQL.

Live external sending is disabled by default. Automation delivery uses capture mode unless all Resend and preference gates are deliberately configured.

The app-owned record is `CommunicationPrep`. It captures the staff review workflow around an audience:

- source resource: people or households
- saved view id when the audience came from a saved list view
- structured segment definition
- role-safe audience preview
- audience size and truncation state
- handoff target
- review notes
- status timestamps for ready for review, approved, handed off, or canceled

Automation records add:

- saved segment association and role-safe segment summary
- recurring cron schedule and timezone
- pre-send reviewer notice timing
- selected reviewer users
- structured React Email template key, version, and editable fields
- sender mode (`CAPTURE` or `RESEND`)
- suppression policy (`NEVER_RESEND` or cooldown days)
- frozen scheduled runs and frozen recipient snapshots
- recipient exclusions, provider message ids, provider events, and accepted-send suppression

## Audience Resolution

`lib/communications/segments.ts` resolves audiences from the same list-view engine used by People and Households:

- `SavedListView` filters are revalidated against the shared staff catalog before use.
- People and household list services apply the existing shared filter catalog.
- Audience previews store only operational contact/readiness context and plain-language explanations.
- Segment explanations may include the staff-visible giving context needed to explain audience membership.

The audience resolver scans a bounded number of rows for a first-pass size and preview. If the result exceeds the scan cap, `audienceTruncated` stays true so staff know the prep needs a broader review/export path later.

Automation run freezing uses the saved segment at the time a scheduled run is created. Later segment changes do not mutate already-frozen recipients.

## Workflow

Initial statuses:

- `DRAFT`: audience and handoff notes are being prepared.
- `READY_FOR_REVIEW`: a staff member has marked the prep ready for review.
- `APPROVED`: the reviewed prep is approved for handoff.
- `HANDED_OFF`: the prep has been exported or recreated in the verified communication system.
- `CANCELED`: the prep was abandoned and remains auditable.

Status changes are local workflow state. They do not mutate Rock.

Automation run statuses track the scheduled communication lifecycle: pending notice, notice sent, ready to send, sending, sent/partial/failed, canceled, or skipped. Recipient statuses track readiness, suppression, exclusion, provider acceptance, delivery, delay, bounce, complaint, or failure.

## Sending And Suppression

Templates are developer-owned React Email components with app-editable fields. Staff can edit subject, preview text, heading, body, CTA label, CTA URL, and signature, but cannot provide arbitrary HTML, CSS, or React code. Only approved tokens are rendered.

Sending is isolated behind `lib/communications/email-sender.ts` and `lib/communications/resend-sender.ts`:

- `CAPTURE` records acceptance without contacting Resend.
- `RESEND` requires `RESEND_API_KEY`; the default sender is `Ev Church <info@ev.church>`.
- Resend webhooks are verified before updating local status.
- Provider metadata is limited to automation/run/recipient/template tags. Do not store raw provider payloads or rendered email bodies.

Suppression is created after provider acceptance. In `NEVER_RESEND` mode, that recipient is suppressed from future runs of the same automation. In cooldown mode, the recipient becomes eligible again after the configured day count.

Communication preference ownership is still an unresolved production dependency. Keep production workflows limited to reviewed audiences until unsubscribe/preference source-of-truth behavior is confirmed for the church's Rock and Resend setup.

## UI

People and Households list views expose a "Prepare communication" action for the current audience. The Communications workspace at `app/communications/page.tsx` shows prep records, status, audience size, handoff target, and a preview of matching records.

The automations workspace at `app/communications/automations/page.tsx` lets staff create the initial `Joining - Never Given` automation. The detail route at `app/communications/automations/[id]/page.tsx` shows setup, readiness, structured template editing, rendered email preview, recent scheduled runs, and per-run recipient exclusion.

The first UI slice does not yet expose every automation setting as a general-purpose builder. Creation is opinionated and safe: current admin as reviewer, capture sender, Tuesday morning schedule, 24-hour notice, and never-resend suppression.

## Operations

Local commands:

- `pnpm communications:schedule`: register pg-boss schedules for active automations.
- `pnpm communications:worker`: process automation evaluation, notice, and send queues.
- `pnpm communications:worker -- --once`: process one queued automation job and exit.

Environment variables:

- `RESEND_API_KEY`
- `RESEND_FROM_NAME`
- `RESEND_REPLY_TO_EMAIL`
- `RESEND_WEBHOOK_SECRET`

Rollback is non-destructive: pause/archive automations or stop the automation worker. Existing runs, recipients, events, and suppressions remain available for audit.

## Follow-Up Work

- Add general automation setup editing for schedule, reviewers, sender, suppression, and saved segment selection.
- Add reviewer notification email content and acceptance workflow polish.
- Add explicit test-send UI using capture mode before any live sender rollout.
- Confirm Rock/Resend communication preference and unsubscribe ownership before live sends.
- Add communication preference/contact-readiness sync fields if Rock exposes them safely.
