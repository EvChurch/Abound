---
title: "feat: Add outstanding pledge recommendations queue"
type: feat
status: active
date: 2026-04-24
origin:
  - docs/brainstorms/2026-04-17-church-giving-management-requirements.md
  - docs/plans/2026-04-23-001-feat-admin-fund-settings-plan.md
---

# feat: Add Outstanding Pledge Recommendations Queue

## Overview

Add a tools page for outstanding pledge recommendations so staff with pledge permissions (Admin and Finance) can process a queue quickly instead of opening each person profile. The page should present recommendation cards in a compact review list with direct `Accept` and `Deny` actions and clear progress feedback.

Acceptance should use the existing quick-create pledge workflow (local app-owned pledge records), and denial should use the existing recommendation rejection workflow that suppresses repeats until giving evidence materially changes.

## Problem Frame

Current pledge recommendation review is person-profile centric. That works for deep review but is slow for batch operations when staff need to clear many outstanding recommendations.

The codebase already anticipated a future bulk review surface:

- `lib/giving/pledges.ts` exposes `listPledgeCandidates()` for cross-person recommendation candidates.
- Existing person actions already implement the accept/deny primitives:
  - `quickCreateGivingPledge(...)`
  - `rejectGivingPledgeRecommendation(...)`

What is missing is an operational queue UI under `tools/pledge-recommendations` where staff can process recommendations as a worklist.

## Requirements Trace

- R1. Staff with pledge-management permission can review outstanding recommendations in one place.
- R2. Each queue row/card supports fast accept and deny actions without navigating to a person profile.
- R3. Actions reuse existing local authorization and business rules (no bypass path).
- R4. The page preserves role and privacy rules: no donor payload leakage beyond currently allowed profile-level giving context.
- R5. The queue should be fast to scan and process in sequence (worklist behavior).

## Scope Boundaries

- In scope:
  - New `tools/pledge-recommendations` route for outstanding recommendations.
  - Navigation entry under the tools menu.
  - Queue/list UI with direct accept/deny controls.
  - Server actions that wrap existing pledge service functions and revalidate queue + person pages.
  - Tests for access control, action behavior, and queue rendering states.
- Out of scope (this slice):
  - Bulk multi-select actions (accept/deny many at once in one submit).
  - New pledge recommendation scoring logic.
  - New donor communication or automation flows.
  - Replacing person-level pledge editor.

## Context & Research

### Relevant Code and Patterns

- Navigation and settings item wiring: `components/navigation/app-top-nav.tsx`.
- Existing settings page auth/permission gates:
  - `app/settings/users/page.tsx`
  - `app/settings/jobs/page.tsx`
- Existing pledge action flow on person page:
  - `app/people/[rockId]/actions.ts`
  - `lib/giving/pledges.ts`
- Existing cross-person recommendation query:
  - `lib/giving/pledges.ts` (`listPledgeCandidates`).
- Existing card-first pledge UI language:
  - `components/people/person-profile.tsx` (pledge analysis cards).

### Institutional Learnings

- Prior profile/pledge work explicitly prepared reusable logic for a future bulk review tool.
- Card-based pledge rows perform better than wide tables for this workflow.
- Recommendation rejection must remain persisted and suppress reappearance until material evidence change.

### External References

- None required for this plan; local patterns are strong and recent.

## Key Technical Decisions

- Route placement: add this surface at `tools/pledge-recommendations`, and gate page/actions by `pledges:manage` so Finance can use it.
- Action semantics:
  - `Accept` maps to existing quick-create flow (`quickCreateGivingPledge`), creating an active local pledge from the recommendation.
  - `Deny` maps to existing rejection flow (`rejectGivingPledgeRecommendation`).
- Reuse service boundaries instead of duplicating recommendation logic in UI/page code.
- First pass uses single-item actions for speed and safety; true bulk submit can be a follow-up once usage is validated.

## Open Questions

### Resolved During Planning

- Where should the page live? At `tools/pledge-recommendations` in the tools menu to match the intended workflow entry point.
- Should accept create draft or active by default? Active via existing quick-create pathway for fastest queue processing.

### Deferred to Implementation

- Whether to include an optional deny reason input inline on every card vs a default null reason for one-click denial.
- Whether to expose a small sort/filter bar in first pass or ship with sensible default ordering first.

## Implementation Units

- [ ] **Unit 1: Queue service + page data assembly**

**Goal:** Build a settings-facing query path that returns outstanding recommendation candidates in a stable order for queue processing.

**Requirements:** R1, R5

**Dependencies:** Existing `listPledgeCandidates` service.

**Files:**

- Modify: `lib/giving/pledges.ts`
- Modify: `app/tools/pledge-recommendations/page.tsx`
- Test: `tests/unit/settings-pledge-queue-page.test.tsx`

**Approach:**

- Reuse `listPledgeCandidates({ limit }, actor)` as the source for outstanding recommendations.
- Add page-level auth gate matching existing settings pages:
  - anonymous -> `/auth/login`
  - needs access -> `/access-request`
  - missing `pledges:manage` permission -> safe unauthorized page
- Sort recommendations by strongest review urgency signal (confidence and recency) using existing fields if no explicit sort controls are added in first pass.

**Patterns to follow:**

- `app/settings/jobs/page.tsx`
- `app/settings/users/page.tsx`

**Test scenarios:**

- Happy path: Admin user loads queue and sees recommendation cards.
- Happy path: Finance user with `pledges:manage` loads queue successfully.
- Error path: unauthorized user receives existing settings unauthorized state.
- Edge case: no candidates -> explicit empty-state message.

**Verification:**

- Route renders queue data using existing recommendation logic with no duplicate business rule implementation.

- [ ] **Unit 2: Queue actions (accept/deny) using existing pledge services**

**Goal:** Add server actions for one-click queue processing.

**Requirements:** R2, R3

**Dependencies:** Unit 1 page scaffold and existing pledge services.

**Files:**

- Create: `app/tools/pledge-recommendations/actions.ts`
- Modify: `lib/giving/pledges.ts`
- Test: `tests/unit/settings-pledge-queue-actions.test.ts`

**Approach:**

- Add `acceptPledgeRecommendationAction` and `denyPledgeRecommendationAction` server actions.
- Resolve actor with existing auth/access pattern from `app/people/[rockId]/actions.ts`.
- `Accept` calls `quickCreateGivingPledge({ personRockId, accountRockId, startDate? }, actor)`.
- `Deny` calls `rejectGivingPledgeRecommendation({ personRockId, accountRockId, reason? }, actor)`.
- Revalidate:
  - queue route (`/tools/pledge-recommendations`)
  - affected person profile (`/people/[rockId]`) to keep views in sync.

**Patterns to follow:**

- `app/people/[rockId]/actions.ts`

**Test scenarios:**

- Happy path: accept action creates pledge and removes recommendation from queue after revalidation.
- Happy path: deny action persists rejection and removes recommendation from queue.
- Error path: action fails with existing BAD_USER_INPUT when recommendation no longer exists (race condition) and page remains stable.
- Error path: non-authorized actor is redirected/blocked by access checks.

**Verification:**

- Queue actions only call existing domain services and preserve existing validation/authorization behavior.

- [ ] **Unit 3: Queue UI component optimized for rapid review**

**Goal:** Build a compact card/list component for quick sequential processing.

**Requirements:** R1, R2, R5

**Dependencies:** Unit 1 and Unit 2.

**Files:**

- Create: `components/settings/pledge-recommendations-queue.tsx`
- Modify: `app/tools/pledge-recommendations/page.tsx`
- Test: `tests/unit/settings-pledge-queue-page.test.tsx`

**Approach:**

- Render each recommendation as a card row with:
  - person display name (linked to `/people/[rockId]`)
  - fund name
  - last-12-month amount
  - confidence badge
  - explanation snippet
  - primary actions: `Accept` and `Deny`
- Keep visuals dense and operational (similar language to existing settings pages and pledge cards).
- Show lightweight result feedback (`processed`, `failed`) with query param flash pattern used in other settings pages.

**Patterns to follow:**

- `components/settings/jobs-dashboard.tsx`
- `components/people/person-profile.tsx` (pledge card styling and terminology)

**Test scenarios:**

- Happy path: cards render required recommendation fields and action buttons.
- Edge case: long recommendation list still renders in scannable order without horizontal overflow.
- Edge case: missing optional data (`lastGiftAt`, explanation detail) falls back to safe text.

**Verification:**

- Staff can process multiple recommendations in sequence without leaving the queue.

- [ ] **Unit 4: Tools navigation wiring + route activation**

**Goal:** Make the queue discoverable under the tools menu.

**Requirements:** R1

**Dependencies:** Unit 1 route exists.

**Files:**

- Modify: `components/navigation/app-top-nav.tsx`
- Modify: `app/tools/pledge-recommendations/page.tsx`
- Test: `tests/unit/navigation/app-top-nav.test.tsx`

**Approach:**

- Extend `settingsActiveItem` union with `"pledges"`.
- Add tools-menu item label such as `Pledge recommendations` linked to `/tools/pledge-recommendations`.
- Extend nav visibility so users with `pledges:manage` can discover this page while Admin-only items (`Funds`, `Jobs`, `Users`) remain tied to `settings:manage`.

**Patterns to follow:**

- Existing settings nav entries for `Funds`, `Jobs`, `Users`.

**Test scenarios:**

- Happy path: tools menu includes the pledge recommendations link for users with `pledges:manage`.
- Edge case: users without `pledges:manage` do not see the link.
- Happy path: pledge queue item is highlighted as active when on route.

**Verification:**

- Route is reachable from the same operational menu users already use for tools tasks.

## System-Wide Impact

- **Interaction graph:** New settings route/action path invokes existing `lib/giving/pledges.ts` workflows and updates person/profile views via cache revalidation.
- **Error propagation:** Domain-level GraphQL/validation errors should surface as action result states without exposing raw stack traces.
- **State lifecycle risks:** Concurrent reviewers may race on the same recommendation; expected handling is existing domain validation plus idempotent revalidation.
- **API surface parity:** No new external API required in first pass; GraphQL candidate query remains available for future consumers.
- **Integration coverage:** Need integration confidence that action -> domain service -> persisted pledge/rejection -> queue refresh all align.
- **Unchanged invariants:** Recommendation scoring, suppression thresholds, and fund-boundary rules remain in `lib/giving/pledges.ts` and `lib/settings/funds.ts`.

## Risks & Dependencies

| Risk                                                   | Mitigation                                                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Queue actions diverge from person-page pledge behavior | Reuse existing service functions (`quickCreateGivingPledge`, `rejectGivingPledgeRecommendation`) only          |
| Role ambiguity for who can process queue               | Enforce existing permission checks in server actions and page gates; avoid introducing custom role logic in UI |
| Concurrent processing race on same recommendation      | Rely on current domain validation; show non-fatal action feedback and refresh queue                            |
| Queue grows too long for one render                    | Start with bounded limit + deterministic sorting; add pagination/filter in follow-up if needed                 |

## Documentation / Operational Notes

- Update any relevant tools navigation docs after implementation if route naming differs from this plan.
- Keep donor-safe rendering rules: no raw payload dumping, no unnecessary identity fields beyond current profile-level norms.

## Sources & References

- **Origin document:** `docs/brainstorms/2026-04-17-church-giving-management-requirements.md`
- Related plan: `docs/plans/2026-04-23-001-feat-admin-fund-settings-plan.md`
- Related code: `lib/giving/pledges.ts`, `app/people/[rockId]/actions.ts`, `components/navigation/app-top-nav.tsx`, `app/settings/jobs/page.tsx`
