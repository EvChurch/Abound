---
date: 2026-04-20
topic: church-giving-communications-benchmark
status: active
sources:
  - https://pushpay.com/solutions/donor-development
  - https://www.planningcenter.com/giving
  - https://help.planningcenter.com/en/138346-introduction-for-administrators.html
  - https://simpledonation.com/analytics
  - https://community.rockrms.com/features
  - https://www.subsplash.com/product/messaging-for-churches
  - https://support.breezechms.com/hc/en-us/articles/27806429354647-Complete-Guide-to-Creating-Giving-Statements
---

# Church Giving and Communications Benchmark

## Research Frame

The next product slice should help staff understand where people are in their giving partnership journey and prepare thoughtful communication without sending messages from this app. The research focused on current church giving, donor development, Rock RMS, and church messaging products.

## Product Patterns Worth Borrowing

- Donor development is not just transaction reporting. Pushpay frames its donor tooling around stages, lists, giving patterns, recommended actions, at-risk/lapsed/new/recurring givers, and tailored gratitude workflows.
- Planning Center Giving emphasizes interactive dashboards, donations lists, recurring donations, donor reports, pledge campaigns, and giving statements. Its administrator documentation also calls out donor lists by amount, fund, and recurring status.
- Rock RMS already has strong native communication primitives: bulk email to groups or data views, SMS conversations, push notifications, communication flows, and communication analytics.
- Simple Donation's Rock-oriented analytics positioning reinforces a key boundary for this app: make Rock data work harder, avoid separate exports, and keep the data traceable to Rock.
- Subsplash and other engagement tools treat communication as a church relationship surface, with groups, SMS/email invitations, secure moderation, prayer/context, and ministry-specific messaging.
- Breeze's giving statement workflow shows how churches often bridge reporting and communications through filtered groups/tags, family-aware statements, export/handoff steps, and special handling for non-givers.

## Direction for Abound

Abound should feel like a premium church systems management layer, not a finance-only ledger and not a generic email tool. The best positioning is:

- **Partnership cockpit:** show lifecycle, recurring health, giving household context, campus/group context, tasks, and communication readiness in one operational view.
- **Audience-first communications:** let staff prepare audiences from saved people/household views, lifecycle cohorts, task states, and contact readiness.
- **Explainable inclusion:** every audience member should have a plain-language reason they is included. Admin/Finance explanations may include amount evidence; Pastoral Care explanations must use non-numeric care language.
- **Review before handoff:** communication prep should support draft, ready for review, approved, and handed-off states. No send action belongs in this app until the church's email/Rock boundary is explicitly verified.
- **Rock-compatible handoff:** the first handoff should preserve criteria, audience size, and recipient preview so staff can recreate the audience in Rock data views, export safely, or route to another tool.
- **Relationship language:** avoid making staff feel like they are mining donors. Use terms like partnership, encouragement, care cue, recurring health, gratitude, review, and next step.

## Premium UX Implications

- Saved list views should be treated as reusable audiences, not just table presets.
- Communication prep records need status, reviewer/owner, handoff target, audience size, segment definition, and an explanation snapshot.
- The Communications screen should be a work queue with tabs or filters for drafts, review, approved handoffs, and canceled work.
- The audience preview should make missing contact data and role-hidden financial evidence visible as operational states, not silent omissions.
- Dashboard and list views should offer "prepare communication" only as a reviewed workflow. Do not expose "send" or "campaign automation" controls.

## Boundaries

- Do not send email, SMS, push, or Rock communications from this app in this slice.
- Do not mutate Rock groups, Rock data views, gifts, scheduled gifts, payment methods, or communication preferences.
- Do not infer the church's preferred email provider, Rock communication templates, or payment processor behavior.
- Do not surface amount thresholds or amount deltas to Pastoral Care users.

## Implementation Priorities

1. Expand `CommunicationPrep` into an auditable local workflow that can reference a saved list view and store a structured audience definition.
2. Add `lib/communications/segments.ts` to resolve role-safe audience previews from people/household saved views.
3. Add `lib/communications/prep.ts` for create/list/update status operations guarded by `communications:manage`.
4. Expose communication prep through GraphQL and a staff page at `/communications`.
5. Add tests for role boundaries, empty audiences, saved-view revalidation, and no-send workflow states.
