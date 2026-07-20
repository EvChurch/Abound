---
date: 2026-07-02
topic: communication-automations
status: draft
supersedes: email-sending-communications
related:
  - docs/brainstorms/2026-04-17-church-giving-management-requirements.md
  - docs/architecture/communications.md
  - docs/research/church-giving-communications-benchmark.md
---

# Communication Automations

## Problem Frame

Staff need a careful way to automate recurring stewardship and care emails based on safe app segments, beginning with people whose Rock connection status is `Joining` and whose giving lifecycle is `Never Given`.

The product should reduce manual list-building and reminder work without becoming an unreviewed marketing automation system. Rock RMS remains authoritative for people, households, connection status, and giving source data. This app owns the local automation configuration, schedule, recipient review workflow, templates, Resend delivery integration, and audit trail.

The first automation should feel operational and reviewable:

1. staff attach an automation to a saved segment,
2. the automation evaluates that segment on a recurring schedule,
3. selected reviewers receive a pre-send notice with the frozen recipient list,
4. reviewers may exclude individual recipients,
5. the remaining recipients send through Resend at the scheduled time,
6. suppression rules prevent accidental repeat sends.

## Requirements

**Automation Setup**

- R1. Staff can create a communication automation associated with a saved app segment, where the segment is a role-safe set of filters backed by existing list-view filtering.
- R2. The first required automation use case is a People segment where Rock connection status is `Joining` and giving lifecycle is `Never Given`.
- R3. Automation setup must include a recurring schedule such as a selected day/time cadence, not delay-after-entry timing in the first version.
- R4. Automation setup must include selected reviewer/admin recipients, chosen from active authorized local app users, who receive the pre-send notice.
- R5. Automation setup must include an active/inactive state so staff can pause the automation without deleting its configuration or history.
- R6. Staff must approve or activate the automation configuration before it can create scheduled send runs.

**Scheduled Run And Review**

- R7. For each scheduled run, the app evaluates the segment before the pre-send notice and freezes a recipient list for that run.
- R8. The app sends a notice to the selected reviewers at a configurable pre-send interval, defaulting to 24 hours before the scheduled send time, with a list of people who will be contacted if no further action is taken.
- R9. Reviewers can exclude individual people from that scheduled run before send time.
- R10. Excluded recipients remain visible in the run history with an exclusion reason or reviewer note when provided.
- R11. If the segment changes after the recipient list is frozen, the scheduled run continues using the frozen list unless a later requirement explicitly adds refresh behavior.

**Sending And Suppression**

- R12. The app sends production automation emails through Resend only after sender domain, from/reply-to identity, environment configuration, and credential handling are verified.
- R13. A recipient counts as having received this automation only after Resend accepts the message for that recipient.
- R14. Each automation has a suppression setting that defaults to never sending the same automation to the same person more than once.
- R15. Staff can optionally configure a cooldown window that allows the same person to receive the same automation again only after the selected duration has elapsed.
- R16. Recipients with missing or inactive email readiness must be skipped and recorded with a non-sensitive reason.
- R17. Send history must retain enough metadata for audit and troubleshooting without logging raw provider payloads, credentials, access tokens, or unnecessary donor PII.
- R18. Production delivery must respect the verified source of communication preferences, unsubscribes, and suppression state; if that ownership is unresolved, live sending remains disabled.

**Templates**

- R19. Automation emails use developer-owned React Email templates so layout and email-client-safe structure stay controlled.
- R20. Staff can customize approved template fields inside the app, such as subject, preview text, heading, body copy, CTA label, CTA URL, and signature.
- R21. The first template editor is structured, not drag-and-drop WYSIWYG.
- R22. Staff can use only approved personalization tokens, and the rendered preview must make token output reviewable before activation.
- R23. Staff can preview the rendered email and send a test email before activating or approving the automation.
- R24. Template customization must preserve email-client compatibility as a product requirement; arbitrary HTML, arbitrary CSS, and arbitrary layout editing are out of scope for the first version.

**Authorization, Privacy, And Auditability**

- R25. Auth0 authentication alone is insufficient; local app users and roles must authorize automation setup, review, exclusion, activation, and sending behavior.
- R26. Finance-only giving amounts or individual giving aggregates must not appear in Pastoral Care messaging, previews, reviewer notices, or explanations.
- R27. AI may assist with draft copy or explanations only as staff-reviewable output. It must not choose recipients, activate automations, exclude recipients, or send messages autonomously.
- R28. The app must not write communication, connection-status, gift, or giving-lifecycle changes back to Rock as part of this automation workflow.

## Success Criteria

- Staff can configure the `Joining` plus `Never Given` automation from a saved People segment.
- The automation can run on a recurring schedule, freeze a recipient list, and notify selected reviewers before sending.
- Reviewers can remove specific recipients without canceling the whole run.
- Resend-accepted recipients are suppressed from receiving the same automation again unless the configured cooldown permits it.
- Staff can edit content safely through structured React Email template fields and verify the rendered message before activation.
- Production delivery remains disabled until Resend configuration and communication preference/suppression ownership are verified.
- Audit history explains who configured, activated, reviewed, excluded, and sent each scheduled run without exposing sensitive payloads.

## Scope Boundaries

- Do not build a drag-and-drop email builder in the first version.
- Do not support SMS, push, direct mail, multi-channel journeys, A/B testing, or branching drip campaigns in the first version.
- Do not build delay-after-entering-segment automation timing in the first version.
- Do not send autonomously without a configured automation, selected reviewers, and the pre-send review window.
- Do not let staff define arbitrary HTML, arbitrary CSS, or arbitrary React template code in the app.
- Do not mutate Rock people, connection statuses, gifts, communication records, or giving lifecycle state.
- Do not use Rock as the production sender for this workflow unless a later requirements document changes the delivery boundary.

## Key Decisions

- **Automations attach to segments, not hard-coded queries:** The first use case depends on Rock connection status `Joining`, but reusable automations should use saved app filters as the audience boundary.
- **Recurring schedule first:** A recurring schedule is easier to reason about operationally than entry-delay automation and avoids needing perfect change-event detection for the first version.
- **Hybrid audience timing:** Each run evaluates the segment before reviewer notification, then freezes that list for the scheduled send.
- **Reviewer exclusion, not mandatory per-recipient approval:** Selected reviewers can remove individuals during the review window while the automation remains useful.
- **Resend is the intended production sender:** Resend acceptance is the suppression event for deciding whether someone already received the automation.
- **Structured React Email editor:** Staff can customize content fields and tokens while developers keep layout control for email-client compatibility.

## Dependencies / Assumptions

- Existing app infrastructure already includes saved list views with filter definitions, People filters for Rock connection status, and lifecycle filtering that includes `NEVER_GIVEN`.
- Existing app infrastructure mirrors Rock person connection status locally through `RockPerson.connectionStatusValueRockId`.
- Resend is the selected production email provider, but the repo does not currently appear to have Resend dependency/configuration wired in.
- React Email is the preferred template rendering system for developer-owned email layouts.
- The first implementation may still use a non-delivering or test-safe mode before live Resend delivery is enabled.

## Outstanding Questions

### Resolve Before Planning

- None.

### Deferred to Planning

- [Affects R3, R8][Technical] How should recurring schedules and the configurable pre-send notice be represented using the existing job/worker stack?
- [Affects R12, R13][Needs research] Which Resend API events and response states should count as accepted, failed, bounced, or suppressed for this product's audit model?
- [Affects R12, R18][Needs research] Which system is authoritative for communication preferences, unsubscribes, bounces, and suppression before live Resend delivery is enabled?
- [Affects R19-R24][Technical] Which React Email template fields and approved tokens should ship in the first `Joining` plus `Never Given` template?
- [Affects R25][Product/technical] Should activation, reviewer exclusion, and production send use one `communications:manage` permission initially or split into separate local permissions?
- [Affects R17, R26][Technical] What exact recipient and provider metadata is necessary for support without over-storing donor PII?

## Next Steps

-> /ce:plan for structured implementation planning.
