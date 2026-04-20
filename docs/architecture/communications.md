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

Communications are local preparation and handoff workflows. This app does not send email, SMS, push, or Rock communications in the current slice. Rock remains authoritative for Rock-owned people, households, communication preferences, groups, data views, gifts, and giving setup.

The app-owned record is `CommunicationPrep`. It captures the staff review workflow around an audience:

- source resource: people or households
- saved view id when the audience came from a saved list view
- structured segment definition
- role-safe audience preview
- audience size and truncation state
- handoff target
- review notes
- status timestamps for ready for review, approved, handed off, or canceled

## Audience Resolution

`lib/communications/segments.ts` resolves audiences from the same list-view engine used by People and Households:

- `SavedListView` filters are revalidated against the current staff role before use.
- People and household list services apply the existing role-aware filter catalog.
- Audience previews store only operational contact/readiness context and plain-language explanations.
- Pastoral Care explanations must remain non-numeric and must not include individual giving amounts or amount deltas.

The audience resolver scans a bounded number of rows for a first-pass size and preview. If the result exceeds the scan cap, `audienceTruncated` stays true so staff know the prep needs a broader review/export path later.

## Workflow

Initial statuses:

- `DRAFT`: audience and handoff notes are being prepared.
- `READY_FOR_REVIEW`: a staff member has marked the prep ready for review.
- `APPROVED`: the reviewed prep is approved for handoff.
- `HANDED_OFF`: the prep has been exported or recreated in the verified communication system.
- `CANCELED`: the prep was abandoned and remains auditable.

Status changes are local workflow state. They do not mutate Rock.

## UI

People and Households list views expose a "Prepare communication" action for the current audience. The Communications workspace at `app/communications/page.tsx` shows prep records, status, audience size, handoff target, and a preview of matching records.

Future UI should add a dedicated detail screen before any export workflow:

- review checklist
- audience contact readiness
- role-safe explanation panel
- draft/handoff notes
- source saved view link
- staff activity timeline

## Follow-Up Work

- Add a detail route for a single communication prep record.
- Add status update actions from the UI.
- Add export/handoff only after the church confirms whether Rock, email, or another system owns sending.
- Add audit logging before any real external handoff.
- Add communication preference/contact-readiness sync fields if Rock exposes them safely.
