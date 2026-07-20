---
title: Refactor Scheduled Run Review Flow
type: refactor
status: active
date: 2026-07-15
origin: docs/brainstorms/2026-06-29-email-sending-communications-requirements.md
---

# Refactor Scheduled Run Review Flow

## Overview

The current `/communications/[id]/review` page is treated as a one-way pending review gate. That breaks down when a run is already `READY_TO_SEND`: sending the user to the review page first moves it back to `PENDING_NOTICE`, which is surprising and changes state before the user has actually edited anything.

The review route should become a scheduled-run editing surface. It should let staff inspect and adjust a specific run, and then offer actions based on that run's current state.

## Problem Frame

Staff are working with concrete scheduled runs, not an abstract workflow review. The show page can list multiple runs with different states, so row actions must target one run. Clicking Review/Edit for a ready run should not implicitly change the run state. State transitions should happen only when the user presses an explicit action such as "Send back to review", "Save changes", "Approve for sending", or "Cancel run".

## Requirements Trace

- R1. Row-level Review/Edit actions must target a specific scheduled run.
- R2. Opening a ready scheduled run must not automatically move it back to pending review.
- R3. The scheduled-run editing page must show recipients and the decision controls for that specific run.
- R4. Available actions must depend on run state.
- R5. Canceling a scheduled run must keep permanent exclusions intact.

## Scope Boundaries

- Do not redesign the email template editor or workflow settings page in this pass.
- Do not change the worker send semantics for `READY_TO_SEND` runs beyond preserving existing state transitions.
- Do not add a new database table unless implementation proves the route needs a stable run URL that cannot be expressed with existing IDs.

## Context & Research

### Relevant Code and Patterns

- `app/communications/[id]/page.tsx` lists scheduled runs and currently links row actions to `/communications/[id]/review`.
- `app/communications/[id]/review/page.tsx` finds the first pending review run for the workflow instead of addressing a specific run.
- `components/communications/automation-review-decision-rail.tsx` already stages recipient decisions locally and submits them as one review completion.
- `lib/communications/automation-runs.ts` owns run transitions: freeze, complete review, cancel review, cancel run, and return to review.
- `tests/unit/communication-automations-page.test.tsx`, `tests/unit/communication-automation-actions.test.ts`, and `tests/unit/communication-automation-runs.test.ts` cover the current page/action/service behavior.

### Institutional Learnings

- No directly relevant `docs/solutions/` entry was found for this specific communications review flow.

### External References

- Not used. Existing local Next.js server action and page patterns are sufficient.

## Key Technical Decisions

- Address review/edit pages by run identity, not by "first pending run". This avoids ambiguous behavior when a workflow has more than one run.
- Treat the page as "scheduled run edit/review" rather than "workflow review". The workflow remains the parent context, but the mutable object is the run.
- Keep explicit state transitions. Viewing a run must not modify it.
- Reuse the recipient decision rail where possible, but make its submit actions state-aware.

## Open Questions

### Resolved During Planning

- Should a ready run automatically become pending review when opened? No. Opening is inspection/editing; state changes require explicit action.

### Resolved During Implementation

- Route shape: use `app/communications/[id]/runs/[runId]/page.tsx`. The old `app/communications/[id]/review/page.tsx` route was removed because the feature has not shipped.
- Page title: use "Scheduled run" so the page reads as a run-specific surface, not a workflow-level review.

## Implementation Units

- [x] **Unit 1: Route Scheduled Run Actions To A Specific Run**

**Goal:** Make show-page row actions pass the selected run identity.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**

- Modify: `app/communications/[id]/page.tsx`
- Test: `tests/unit/communication-automations-page.test.tsx`

**Approach:**

- Replace workflow-level review links with run-specific links.
- Keep `Schedule` disabled when any pending-review run exists.
- Rename row action labels if needed so "Review" does not imply a hidden state transition.

**Patterns to follow:**

- Existing row action forms and links in `app/communications/[id]/page.tsx`.

**Test scenarios:**

- Happy path: pending-review row links to the scheduled-run editing route with that run ID.
- Happy path: ready-to-send row links to the same route without submitting a state-changing action.
- Edge case: canceled runs under "More" do not show edit actions.

**Verification:**

- The show page presents row actions that identify one run and do not mutate state on navigation.

- [x] **Unit 2: Load The Scheduled-Run Editing Page By Run ID**

**Goal:** Replace "first pending run" lookup with explicit run selection.

**Requirements:** R1, R2, R3

**Dependencies:** Unit 1

**Files:**

- Create: `app/communications/[id]/runs/[runId]/page.tsx`
- Delete: `app/communications/[id]/review/page.tsx`
- Modify: `lib/communications/automations.ts` or add a small run lookup service in `lib/communications/automation-runs.ts`
- Test: `tests/unit/communication-automations-page.test.tsx`

**Approach:**

- Load the parent workflow for context and the selected run for editing.
- Return not found or a clear empty state when the run does not belong to the workflow.
- Preserve the people list layout for recipients.

**Patterns to follow:**

- Existing auth/access handling from the removed `app/communications/[id]/review/page.tsx`.
- Existing people row rendering via `ListTable`.

**Test scenarios:**

- Happy path: selected pending run renders recipient decision controls.
- Happy path: selected ready run renders the same recipients without automatically changing status.
- Error path: unknown run ID renders not found or the existing safe empty state.

**Verification:**

- Navigating to the scheduled-run editing route never changes `CommunicationAutomationRun.status`.

- [x] **Unit 3: Make Run Actions State-Aware**

**Goal:** Offer explicit actions based on the selected run status.

**Requirements:** R2, R4, R5

**Dependencies:** Unit 2

**Files:**

- Modify: `components/communications/automation-review-decision-rail.tsx`
- Modify: `app/communications/actions.ts`
- Modify: `lib/communications/automation-runs.ts`
- Test: `tests/unit/communication-automation-actions.test.ts`
- Test: `tests/unit/communication-automation-runs.test.ts`

**Approach:**

- Pending review runs: allow recipient decisions, complete review, and cancel schedule.
- Ready-to-send runs: allow editing recipient decisions only if the user explicitly chooses to reopen/revise, or provide a clear "Send back to review" action.
- Canceled/sent runs: read-only, except future product decisions explicitly add restore or clone behavior.
- Keep permanent exclusions as durable suppressions when canceling.

**Patterns to follow:**

- Existing server action shape in `app/communications/actions.ts`.
- Existing validation and permission checks in `lib/communications/automation-runs.ts`.

**Test scenarios:**

- Happy path: completing a pending review moves the run to `READY_TO_SEND`.
- Happy path: opening a ready run does not change status.
- Happy path: explicit "send back to review" changes `READY_TO_SEND` to `PENDING_NOTICE`.
- Edge case: canceling a run leaves permanent exclusions intact.
- Error path: sent runs cannot be returned to review.

**Verification:**

- State transitions happen only through submitted actions, never page loads.

- [x] **Unit 4: Update Copy And Tests Around The New Mental Model**

**Goal:** Align labels with "editing a scheduled run" rather than "reviewing a workflow".

**Requirements:** R1, R3, R4

**Dependencies:** Units 1-3

**Files:**

- Modify: `app/communications/[id]/page.tsx`
- Modify: scheduled-run edit/review route file from Unit 2
- Modify: `tests/unit/communication-automations-page.test.tsx`

**Approach:**

- Use workflow name as parent navigation.
- Use page title/copy that names the scheduled run.
- Keep button labels explicit: "Approve", "Cancel run", "Send back to review", or "Save changes" depending on implemented state model.

**Patterns to follow:**

- Current communications container/header styling.
- Existing dialog copy in `components/communications/scheduled-run-cancel-action.tsx`.

**Test scenarios:**

- Happy path: pending run page shows action labels for approval and cancellation.
- Happy path: ready run page does not say it is pending review unless explicitly returned.
- Edge case: no selected run shows a clear empty/not found state.

**Verification:**

- The user can tell whether they are editing a workflow or a specific scheduled run.

## System-Wide Impact

- **Interaction graph:** Show page row actions route to a scheduled-run editing surface; that surface submits server actions; workers continue sending only `READY_TO_SEND` runs.
- **Error propagation:** Invalid run/workflow combinations should fail safely through not found or a non-mutating empty state.
- **State lifecycle risks:** The main risk is accidental status changes on navigation; the plan removes that behavior.
- **Unchanged invariants:** Permanent exclusions remain durable and are not undone by canceling or editing a run.

## Risks & Dependencies

| Risk                                                                           | Mitigation                                                                                                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| A ready run could still be picked up by the worker while someone is editing it | Do not implicitly reopen ready runs; require an explicit action and rely on existing worker status checks                        |
| Route choice creates churn                                                     | Prefer the cleaner run-specific URL if implementation is straightforward; otherwise use a query parameter as a transitional path |
| Recipient decisions on ready runs become ambiguous                             | Keep ready runs read-only unless the user explicitly sends the run back to review                                                |

## Sources & References

- Origin document: `docs/brainstorms/2026-06-29-email-sending-communications-requirements.md`
- Existing plan: `docs/plans/2026-07-02-001-feat-communication-automations-plan.md`
- Related code: `app/communications/[id]/page.tsx`
- Related code: `app/communications/[id]/runs/[runId]/page.tsx`
- Related code: `lib/communications/automation-runs.ts`
