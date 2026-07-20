---
date: 2026-07-02
topic: resend-communication-automation
status: active
related:
  - docs/architecture/communications.md
  - docs/plans/2026-07-02-001-feat-communication-automations-plan.md
---

# Resend Communication Automation Notes

## Implemented Boundary

Resend sending is isolated behind `lib/communications/resend-sender.ts`. The automation workflow calls an `EmailSender` abstraction so local and test environments can use MailDev without contacting Resend.

Live delivery requires:

- `RESEND_API_KEY` is set.
- `info@ev.church` is a verified sender address in Resend.

Optional sender settings:

- `RESEND_FROM_NAME`
- `RESEND_REPLY_TO_EMAIL`
- `RESEND_WEBHOOK_SECRET`

## Webhooks

Resend webhook events enter through `app/api/webhooks/resend/route.ts`.

The route requires Svix headers:

- `svix-id`
- `svix-signature`
- `svix-timestamp`

Verified events update the local recipient status by `providerMessageId` and create an idempotent recipient event keyed by provider event id. The app records only the event type, timestamps, recipient linkage, and provider ids needed for audit. It does not persist raw webhook payloads.

## Suppression

Suppression is created after provider acceptance, not after render or job enqueue. This keeps retry behavior conservative: a recipient is suppressed only after the provider accepted the send request.

Suppression modes:

- `NEVER_RESEND`: a recipient cannot receive the same automation again.
- `COOLDOWN`: a recipient is eligible again after the configured number of days.

Suppression is scoped to automation id plus recipient resource identity (`PERSON:<rockId>` or `HOUSEHOLD:<rockId>`).

## Operational Checklist Before Live Sends

- Confirm the church's authoritative communication preference and unsubscribe workflow.
- Verify the Resend sending domain and from address.
- Set `RESEND_WEBHOOK_SECRET` and confirm webhook delivery in a non-production environment.
- Run at least one automation through MailDev and review the frozen recipients.
- Send a test message through the same sender configuration.
- Keep pg-boss automation workers monitored after enabling.

## Disable / Rollback

Stop `pnpm communications:worker` and pause or archive active automations. Do not delete runs, recipients, suppressions, or provider events during incident review.
