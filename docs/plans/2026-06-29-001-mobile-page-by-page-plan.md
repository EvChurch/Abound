---
date: 2026-06-29
title: "plan: Mobile page-by-page hardening"
status: draft
---

# Mobile Page-by-Page Hardening

## Goal

Make the current staff giving management application work comfortably on mobile and small tablet screens, one page group at a time, without weakening the existing desktop workflows or staff data protections.

This is a responsive hardening effort, not a product redesign. Rock remains the source of truth, Auth0 plus app-local authorization remains the access boundary, and donor identity/giving data must stay protected in UI, logs, screenshots, and test fixtures.

## Current Context

- The app runs with `pnpm dev` on `http://localhost:7000`.
- The application is a Next.js App Router project using Tailwind CSS.
- Primary routes currently include:
  - `/` dashboard
  - `/people` and `/households` list views
  - `/people/[rockId]` and `/households/[rockId]` detail views
  - `/communications` and `/communications/[id]`
  - `/tools/pledge-recommendations`
  - `/settings/funds`, `/settings/jobs`, `/settings/users`, and `/sync`
  - `/access-request`, `/access-request/submitted`, and `/auth/error`
- Existing UI already has some responsive behavior, but several surfaces remain desktop-first:
  - `components/navigation/app-top-nav.tsx` uses a fixed top nav with wrapping links and hover-oriented dropdowns.
  - `components/list-views/list-view-shell.tsx` uses a fixed left filter rail from `md` upward and a viewport-height locked workspace.
  - `components/list-views/list-table.tsx` uses fixed-height rows and dense multi-column row layouts.
  - Profile/detail pages use a two-column content plus rail layout at `lg`.
  - Dashboard and operational cards are generally responsive but need mobile content-density checks.

## Product Requirements

- R1. Staff must be able to complete primary read/review workflows on a phone-width viewport without horizontal page scrolling.
- R2. Mobile navigation must expose all role-allowed destinations, including nested People, Tools, and Settings items.
- R3. Mobile list views must support search, filters, saved view context, sort/view controls, column controls, and infinite loading without trapping the user in a cramped fixed panel.
- R4. Mobile detail pages must keep identity, household context, giving summary visibility rules, tasks, and permissions context readable.
- R5. Mobile settings/tools pages must keep action buttons, form controls, and destructive or state-changing actions easy to review before tapping.
- R6. Pastoral Care users must still not see giving amounts on mobile. Mobile simplification must not hide role/permission states in a misleading way.
- R7. Screenshots or test fixtures used for verification must avoid real donor PII and financial details.

## Non-Goals

- Do not introduce donor-facing mobile giving/payment flows.
- Do not change Rock sync semantics, giving calculations, permissions, or pledge recommendation business logic.
- Do not replace the existing design language or create a marketing-style mobile shell.
- Do not build a dedicated native app.

## Proposed Approach

Use a narrow vertical slice per page group:

1. Inspect the current route at mobile, small tablet, and desktop widths.
2. Fix shared layout or component issues before route-specific polish.
3. Add focused tests where behavior can regress, especially navigation visibility and permission-safe rendering.
4. Manually verify with seeded or synthetic data only.
5. Record remaining assumptions in this plan before moving to the next page group.

Recommended viewport checks:

- Mobile: 390 x 844
- Small mobile: 360 x 740
- Small tablet: 768 x 1024
- Desktop regression: 1280 x 900

## Implementation Units

### Unit 1: Shared Mobile Shell And Navigation

**Goal:** Make the top-level app shell usable on mobile before optimizing individual pages.

**Likely files:**

- `components/navigation/app-top-nav.tsx`
- `components/ui/dropdown-panel.tsx`
- `app/globals.css`
- `tests/unit/navigation/app-top-nav.test.tsx` if present, or add focused render coverage near existing unit tests

**Work:**

- Add a mobile navigation pattern that works by tap, not hover.
- Keep the brand, active route, profile menu, and role-gated destinations discoverable.
- Prevent fixed top nav wrapping from consuming excessive vertical space.
- Preserve desktop dropdown behavior where it already works.
- Verify that Settings and Tools links remain hidden unless the role permits them.

**Acceptance:**

- No horizontal body scroll at 360 px.
- A mobile user can reach Dashboard, People, Households, Communications, allowed Tools, allowed Settings, profile actions, and logout.
- Role-gated nav items remain server-authorized and visually absent when unavailable.

### Unit 2: People And Households List Views

**Goal:** Make list discovery, filtering, sorting, and infinite loading comfortable on mobile.

**Likely files:**

- `components/list-views/list-view-shell.tsx`
- `components/list-views/list-table.tsx`
- `components/list-views/infinite-list-table.tsx`
- `components/list-views/filter-accordion.tsx`
- `components/list-views/columns-menu.tsx`
- `components/list-views/saved-view-menu.tsx`

**Work:**

- Replace the mobile filter rail with a collapsible drawer, sheet, or stacked filter panel.
- Keep active filter chips visible near the list header.
- Let the list body use natural page scrolling on mobile instead of a nested viewport-height scroller.
- Rework people and household rows into mobile cards or taller rows when columns/signals do not fit.
- Keep the giving lifecycle timeline readable, or intentionally collapse it behind a compact summary on narrow screens.
- Ensure infinite loading sentinel still works with the selected scroll container.

**Acceptance:**

- Search, filters, reset, sort, view mode, columns, and saved views are reachable on mobile.
- People and household rows do not clip names, email/status text, lifecycle chips, pledge signals, or task counts.
- Infinite loading works on mobile and desktop.
- The list page remains efficient for repeated staff scanning.

### Unit 3: Person And Household Detail Pages

**Goal:** Preserve profile comprehension on mobile while avoiding cramped rails and wide tables.

**Likely files:**

- `components/people/person-profile.tsx`
- `components/people/household-profile.tsx`
- `components/people/giving-summary-panel.tsx`
- `components/people/delayed-sticky-summary.tsx`

**Work:**

- Stack the profile rail beneath or above the main content on mobile.
- Verify sticky summary behavior below the fixed nav on short screens.
- Convert member/task tables to stacked mobile rows where needed.
- Keep person/household tabs tappable and clear.
- Confirm hidden giving amount states are obvious for roles without amount permissions.

**Acceptance:**

- Identity, household context, members, tasks, giving summary, and permissions panels are readable at 360 px.
- No horizontal scroll is needed for profile content.
- Sticky header/summary does not overlap the fixed nav or hide page content.

### Unit 4: Dashboard

**Goal:** Make summary metrics, charts, lifecycle cards, and permission states scan well on mobile.

**Likely files:**

- `components/dashboard/staff-dashboard.tsx`
- `components/dashboard/household-donor-chart.tsx`

**Work:**

- Verify chart sizing, tooltip behavior, and axis readability on mobile.
- Reduce card density only where content wraps poorly.
- Keep lifecycle cards tappable and link targets clear.
- Preserve hidden amount messaging for non-finance roles.

**Acceptance:**

- Dashboard gives a useful first-screen summary on mobile.
- Chart renders nonblank and does not overflow.
- Lifecycle links remain usable touch targets.

### Unit 5: Tools And Communications

**Goal:** Make queue/review workflows safe and fast on mobile.

**Likely files:**

- `components/settings/pledge-recommendations-queue.tsx`
- `app/communications/page.tsx`
- `app/communications/[id]/page.tsx`
- related communication components if split later

**Work:**

- Make pledge recommendation cards readable without background chart overlap.
- Ensure accept/deny actions have comfortable touch targets and clear state after optimistic updates.
- Review communication list/detail layouts for long names, segment descriptions, and action controls.

**Acceptance:**

- A staff user can review, accept, and deny recommendations on mobile without accidental taps.
- Communication pages remain readable and do not expose more sensitive detail than desktop.

### Unit 6: Settings, Sync, Access Request, And Error States

**Goal:** Finish operational and edge-state pages.

**Likely files:**

- `components/settings/fund-settings.tsx`
- `components/settings/jobs-dashboard.tsx`
- `components/settings/user-management-settings.tsx`
- `components/sync/sync-status.tsx`
- `components/auth/access-request-form.tsx`
- `app/auth/error/page.tsx`

**Work:**

- Make settings forms and job dashboard tables/cards responsive.
- Ensure sync status, degraded states, logs, and job controls are readable.
- Verify access request and auth error pages are clean on mobile.
- Keep sensitive operational detail appropriately summarized.

**Acceptance:**

- Admin settings workflows can be reviewed and submitted on mobile.
- Sync/job status does not require horizontal scrolling.
- Limited-access users see only the access request flow and no staff data.

## Verification Strategy

- Run `pnpm lint`, `pnpm typecheck`, and focused tests after each implementation unit.
- Add or update unit tests for:
  - mobile navigation visibility and role gating
  - list controls that move into a mobile drawer/sheet
  - permission-safe hidden giving amount states where touched
- Use browser checks for the four viewport sizes listed above.
- Prefer screenshots with seeded or synthetic data. Do not capture real donor PII, payment identifiers, access tokens, or raw giving details.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Mobile nav accidentally exposes hidden role-gated routes | Keep nav item construction permission-aware and add render tests. Server-side route guards remain mandatory. |
| List filters become less efficient for staff power users | Preserve desktop rail behavior and use mobile-specific disclosure only below the chosen breakpoint. |
| Nested scroll changes break infinite loading | Verify sentinel behavior after changing scroll containers; add a focused test if practical. |
| Financial data appears in compact summaries for Pastoral Care | Reuse existing `amountsHidden` and role checks; test hidden states where components change. |
| Charts overflow or become unreadable | Give chart containers stable responsive dimensions and verify rendered output on mobile. |

## Open Questions

- Should mobile use a full-screen menu, a side drawer, or a compact top action bar plus menu button for primary navigation?
- Should list filters be a drawer, an inline collapsible panel above results, or a dedicated filter route-style screen?
- Are phones expected to be used for real staff operations, or mainly quick lookup/review during pastoral care conversations?
- Which route should be first after the shared shell: `/people`, `/`, or a detail page? The code suggests `/people` is the highest-risk first candidate.

## Recommended First Slice

Start with Unit 1 and the `/people` list from Unit 2:

1. Build mobile-capable `AppTopNav`.
2. Make `/people` usable at 360 px with a mobile filter panel and non-clipping rows.
3. Port the same list shell behavior to `/households`.
4. Verify desktop list behavior remains unchanged.

This gives the largest immediate benefit because most dashboard and detail workflows eventually link into People or Households.
