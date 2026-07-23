---
date: 2026-07-21
topic: communication-history-roadmap-seed
roadmap_id: RM-003
---

# Communication History

## Problem Frame

Staff need to know what a person or household has already received before sending more communication. Without clear history, drip campaigns and event-triggered emails can become confusing, repetitive, or unsafe.

## Seed Requirements

- R1. Person and household profiles should show relevant communication history from Abound-owned workflows.
- R2. History should distinguish sent, skipped, bounced, suppressed, excluded, opened, clicked, and failed states when those signals are available.
- R3. Staff should be able to understand why someone received or did not receive a communication.
- R4. Communication history should support campaign-level review as well as person and household context.
- R5. Completed automation and journey runs should produce a staff-safe reportable recipient summary that can be emailed to configured completion report recipients.

## Scope Boundaries

- Do not assume Rock-originated communication history is available until verified.
- Do not show provider event detail that is only useful as audit metadata.
- Do not expose unnecessary donor-sensitive context in history summaries.
- Do not include gift amounts, payment details, raw provider payloads, or finance-only explanations in completion report summaries.

## Questions To Pick Up

- Which provider events should be shown to staff versus kept as audit metadata?
- How long should detailed communication event history be retained?
- Should Rock-originated communication history be synced into this surface, or should it only show Abound-owned workflows at first?
- What recipient-level outcome fields should completion reports share by email versus keep inside the authenticated staff app?

## Next Steps

-> Resume `/ce:brainstorm` for Communication History before planning implementation.
