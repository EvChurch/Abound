---
date: 2026-07-21
topic: audience-quality-roadmap-seed
roadmap_id: RM-001
---

# Audience Quality

## Problem Frame

Staff need to trust a campaign audience before any communication is prepared or sent. Better drip campaigns and event-based emails will only help if the underlying audience is accurate, contactable, and safe to use.

## Seed Requirements

- R1. Staff should be able to see whether a campaign audience has missing, inactive, stale, duplicate-looking, suppressed, or excluded recipients.
- R2. Audience previews should explain why people or households are included without exposing unnecessary donor-sensitive detail.
- R3. Staff should be able to exclude people or households from a campaign without changing the underlying saved segment.
- R4. Audience quality should be visible before approval or sending, not discovered after a campaign runs.

## Scope Boundaries

- Do not change Rock-owned person, household, or communication preference data.
- Do not build journey or campaign authoring in this item.
- Do not expose raw Rock payloads, payment details, secrets, or unnecessary donor PII.

## Questions To Pick Up

- What quality warnings should block sending versus merely warn staff?
- Which Rock or Abound fields should count as contact-ready for email?
- Should audience quality be evaluated only at send time, or continuously as segments change?

## Next Steps

-> Resume `/ce:brainstorm` for Audience Quality before planning implementation.
