---
date: 2026-07-21
topic: communication-journeys-roadmap-seed
roadmap_id: RM-002
---

# Communication Journeys

## Problem Frame

Staff need communications to move beyond one-off automations into drip campaigns and event-based emails. Those journeys should use safe context from the triggering event while preserving human review, suppression, and communication preference boundaries.

## Seed Requirements

- R1. Staff should be able to define simple communication journeys with a trigger, audience, delay, email step, stop condition, and review gate.
- R2. Event-triggered emails should be able to use approved dynamic fields from the triggering event and related person or household context.
- R3. The first journey model should favor simple linear drips before branching journey logic.
- R4. Journey sends must respect suppression, exclusions, contact readiness, and human review boundaries.
- R5. Staff should be able to preview exactly how event data will appear in a message before a journey is activated.
- R6. Journeys should support configurable post-run completion reports for staff groups who need to review who entered or completed a journey, beginning with new-giver reporting to membership.

## Scope Boundaries

- Do not build branching journey logic in the first pass unless a later brainstorm explicitly chooses it.
- Do not authorize autonomous donor communication without review.
- Do not bypass verified sender setup or communication preference/suppression ownership.
- Do not make completion reports responsible for mutating Rock membership, activity status, or giving lifecycle fields.

## Questions To Pick Up

- Which event should trigger the first journey: segment entry, first gift, missed recurring pattern, lifecycle change, event attendance, connection status change, or campaign non-response?
- What dynamic fields are safe for each event type?
- Should a staff reviewer approve every scheduled send, or approve a journey once and then review exceptions?
- Should completion report recipients be managed per journey, per workflow template, or through reusable staff notification groups?

## Next Steps

-> Resume `/ce:brainstorm` for Communication Journeys before planning implementation.
