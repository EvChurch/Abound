---
title: "Giving Management Design System and Stitch Screen Brief"
date: 2026-04-17
status: draft
origin:
  - docs/brainstorms/2026-04-17-church-giving-management-requirements.md
  - docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md
---

# Giving Management Design System and Stitch Screen Brief

## Purpose

This document defines the design system and screen-generation brief for a premium staff console for church giving management. It should feel like a high-end CRM: pristine, trustworthy, calm under pressure, dense enough for finance and operations work, and warm enough for pastoral care.

The design should be strongly inspired by Salesforce Lightning's record-first operating model: compact highlights, persistent navigation, clear object pages, related lists, tabs, action bars, and clean data tables. It should not copy Salesforce branding or component styling directly. The product should feel like a focused giving intelligence and stewardship workspace around Rock RMS.

This brief is intended to be handed to Stitch, Google's design AI tool. Stitch is the tool name, not the product name.

## Product Boundaries

- Rock RMS remains the source of truth for people, households, gifts, giving status, and Rock-owned fields.
- The application is an operational, reporting, workflow, and API layer around Rock.
- Auth0 handles authentication, but the application handles authorization through local app users and roles.
- Staff data is visible only after local authorization.
- Donor identity, giving history, payment setup, communication preferences, and staff notes are sensitive data.
- Donor-facing payment, recurring gift, and payment-method management is out of scope until Rock and payment processor capabilities are verified.
- AI features assist staff with reviewable summaries, explanations, prioritization, and drafting. They do not send donor communications or make financial decisions autonomously.

## Design Thesis

Premium enterprise stewardship console: bright, crisp, quiet, and highly structured, with the clarity of Salesforce Lightning, the polish of a modern executive dashboard, and the care posture of a ministry operations tool.

Avoid:

- Marketing landing-page treatment inside the app.
- Decorative gradients, oversized cards, and empty whitespace that reduce operational density.
- Dark-mode-first styling.
- Playful nonprofit tropes, generic charity imagery, or soft pastel dashboards.
- Interfaces that imply the application owns Rock data or can mutate giving/payment details when it cannot.

Prefer:

- Object and record pages.
- Compact field summaries.
- Dense but readable tables.
- Tabs and related-list groups.
- Inline status, provenance, freshness, and permission signals.
- A restrained light theme with premium depth through borders, elevation, spacing, and typography rather than decoration.

## Design References

Use these as design inspiration and product-pattern references:

- Salesforce Lightning Design System and Lightning Experience record pages: highlights panel, compact layouts, tabs, related lists, action buttons, path/status patterns, and dense data tables.
- Salesforce Nonprofit Cloud fundraising surfaces: donor profile timelines, portfolio management, segmentation, campaign insights, gift commitments, and fundraising operations.
- High-end CRM conventions: persistent app shell, global search, object navigation, split record/detail pages, related objects, saved views, filters, bulk actions, and activity timelines.

Reference notes:

- Salesforce documents compact layouts as the source of key fields in record highlights, with up to seven fields visible on larger screens and fewer on smaller screens.
- Salesforce guidance favors Related List Quick Links and Related List Single components to reduce scrolling and help users find record-adjacent data quickly.
- Lightning enhanced related lists can support richer table behavior such as sorting, resizable columns, wrapping, and up to 10 displayed fields.
- SLDS 2 guidance emphasizes styling hooks and accessible contrast rather than hard-coded legacy tokens.

## Users and Data Visibility

### Admin

Admin users have full staff visibility across finance, people, donations, tasks, communications, settings, and administration.

Design implication: Admins see all controls, configuration affordances, access requests, sync health, issue resolution, role management entry points, and full donor/giving detail.

### Finance

Finance users can see giving amounts and limited person or household details needed to identify donors, reconcile records, and understand giving context.

Design implication: Finance pages should prioritize reconciliation, giving trends, gift details, recurring giving health, source metadata, and exceptions.

### Pastoral Care

Pastoral Care users can see donor and household care context, communications, tasks, reports, and follow-up cues, but actual giving amounts and individual-level giving aggregates must be hidden.

Design implication: Amount fields should be replaced with non-numeric lifecycle and care signals such as "Giving pattern changed", "Follow-up suggested", "Recurring gift appears interrupted", or "Stewardship check-in due." Never show masked values like "$••••" if the hidden amount itself is the point; use a role-aware explanation instead.

## Information Architecture

Primary app areas:

- Home: staff dashboard and operating summary.
- People: individual Rock person records.
- Households: household giving and care profiles.
- Giving: gift facts, trends, recurring health, funds/accounts, and exceptions.
- Segments: saved and ad hoc donor/household segments.
- Tasks: follow-up, stewardship, data cleanup, and ministry operations work.
- Communications: prepared audience lists, drafts, handoff states, and review workflows.
- Sync: Rock sync runs, freshness, skipped records, reconciliation issues, and source traceability.
- AI Assist: reviewable summaries, explanations, and draft support. This may begin embedded inside profiles and dashboards rather than as a top-level area.
- Settings: local users, roles, access requests, integrations, audit policy, and app configuration.

Global shell:

- Persistent top bar with product name, environment label, global search, sync freshness indicator, help/documentation entry, user menu, and role indicator.
- Left navigation rail for primary areas. Use icon plus text at desktop widths; collapse to icons on narrower desktop; use a bottom or drawer navigation on mobile.
- Workspace area with page header, actions, tab set, main content, and optional right inspector.

## Visual System

### Color

The product should use a clean light theme with cool neutrals and a confident blue-teal accent. The palette should feel closer to enterprise trust and financial clarity than church branding.

Core tokens:

- Page background: `#F4F6F9`
- Surface: `#FFFFFF`
- Surface subtle: `#F8FAFC`
- Surface raised: `#FFFFFF`
- Border: `#D8DEE8`
- Border strong: `#B8C2D2`
- Text primary: `#172033`
- Text secondary: `#4F5B6F`
- Text muted: `#6E7A8E`
- Accent: `#176B87`
- Accent hover: `#0F4C63`
- Accent soft: `#E5F3F6`
- Finance positive: `#2E7D5B`
- Warning: `#B7791F`
- Error: `#B42318`
- Info: `#2563A8`
- AI assist: `#6B5DD3`

Use color functionally:

- Blue-teal is the main action/accent.
- Green means healthy or positive status, not "money" everywhere.
- Amber means review or stale data.
- Red means failure, blocked sync, unauthorized access, or critical exceptions.
- Purple is reserved for AI-assist affordances and should be sparse.

### Typography

Recommended type direction:

- Use a premium sans serif with excellent tabular numerals and UI readability.
- Preferred: `Aptos`, `Salesforce Sans`-like fallback, `Inter`, `system-ui`, `sans-serif`.
- Do not use decorative display fonts inside the application.
- Use tabular numerals for amounts, counts, dates, and dashboard metrics.

Type scale:

- Page title: 28px, 600 weight, 36px line height.
- Record title: 24px, 600 weight, 32px line height.
- Section title: 16px, 600 weight, 24px line height.
- Body: 14px, 400 weight, 20px line height.
- Dense table: 13px, 400 weight, 18px line height.
- Metadata/caption: 12px, 500 weight, 16px line height.
- Numeric KPI: 28px to 36px, 600 weight, tabular.

### Spacing and Density

Use an 8px spacing grid with compact CRM density.

- Page margin desktop: 24px.
- Page margin mobile: 16px.
- Record header padding: 16px to 20px.
- Panel padding: 16px.
- Table cell vertical padding: 8px to 10px.
- Form control height: 36px compact, 40px standard.
- Icon button target: minimum 36px.

Density modes should be planned:

- Comfortable: default for pastoral care and mixed staff views.
- Compact: available later for finance-heavy tables and reconciliation work.

### Shape and Elevation

- Border radius: 6px for panels, buttons, inputs, and cards.
- Small radius: 4px for badges, table pills, and compact controls.
- Avoid pill-heavy UI except for status badges and tags.
- Use borders before shadows.
- Use subtle shadow only for popovers, menus, modals, and raised inspectors.
- Do not nest cards inside cards. Use panels, sections, and table groups instead.

### Icons

Use a consistent line-icon set. Icons should support fast scanning, not decoration.

Required concepts:

- Home, People, Households, Giving, Segments, Tasks, Communications, Sync, Settings.
- Search, Filter, Sort, Refresh, Export, More, Edit, Add, Close, Warning, Check, Lock, Eye-off, AI Assist.

Icon-only controls need tooltips.

### Motion

Motion should be subtle and operational:

- Page transitions: 120ms fade/slide for route-level content changes.
- Row hover: instant background change or 80ms transition.
- Popovers/menus: 100ms opacity and slight translate.
- Right inspector: 180ms drawer resize, not overlay on desktop.
- Loading states: skeletons for lists and metrics; avoid flashy spinners except inside buttons.

## Core Components

### App Header

Desktop:

- Left: product wordmark, environment badge if non-production.
- Center: global search with placeholder such as "Search people, households, gifts, tasks".
- Right: sync freshness chip, notifications or issues icon, help icon, user avatar/menu, role badge.

The sync freshness chip is persistent because staff trust depends on data recency. Examples:

- "Rock synced 14 min ago"
- "Sync partial: 32 issues"
- "Rock sync stale"

### Navigation Rail

Primary nav items:

- Home
- People
- Households
- Giving
- Segments
- Tasks
- Communications
- Sync
- Settings

Use active states with accent border or soft accent fill. Do not overuse filled nav backgrounds.

### Page Header

Use a Lightning-like page header pattern:

- Object icon.
- Object label, such as "Household".
- Record/page title, such as "Martinez Household".
- Compact key fields in a horizontal row.
- Primary and secondary actions aligned right.
- Optional alert strip for stale source data, permission masking, sync issues, or unresolved tasks.

Record page header actions:

- Add task
- Prepare communication
- View in Rock
- Refresh from Rock, where available and read-only
- More menu

Actions that imply writes to Rock should be absent unless verified and implemented.

### Tabs

Use tabs for record pages and object workspaces. Keep labels concrete.

Household/person profile tabs:

- Overview
- Giving
- Tasks
- Communications
- Relationships
- Source
- Audit

Dashboard tabs:

- Overview
- Trends
- Recurring
- Lifecycle
- Exceptions

Tabs should preserve context and avoid full-page jumps where possible.

### Data Tables

Tables are a first-class component.

Required table capabilities:

- Sticky header for long lists.
- Sortable columns.
- Column visibility controls for dense finance views.
- Filter bar with saved views.
- Row selection for bulk workflow actions where safe.
- Inline row actions through a More menu.
- Empty, loading, stale, and error states.
- Permission-aware hidden fields.

Table style:

- White surface on page background.
- 13px row text.
- 8px to 10px vertical padding.
- Very light row separators.
- Hover state: subtle blue-gray background.
- Selected state: soft accent fill and left accent line.

### Status Badges

Use compact badges with semantic color.

Examples:

- Synced
- Stale
- Partial
- Needs review
- At risk
- Follow-up open
- Ready for review
- Handed off
- Hidden by role

### Right Inspector

The right inspector provides context without leaving the list or dashboard.

Use for:

- Donor or household preview.
- Segment explanation.
- Sync issue details.
- Task details.
- AI summary review.

Desktop behavior:

- Resizes the workspace.
- Does not cover the active table.
- Can be pinned or closed.

Mobile behavior:

- Opens as a full-height sheet.

### Timeline

Use timeline components for relationship and stewardship history.

Timeline event types:

- Gift received or giving pattern changed.
- Recurring gift status changed.
- Task created/completed.
- Communication prep created/approved/handed off.
- Sync issue opened/resolved.
- AI summary generated/reviewed.
- Staff note added, if notes are later approved.

Amounts must respect role visibility.

## Screen Specifications for Stitch Generation

These sections are written to be usable as direct prompts or briefs for a UI generation tool.

### 1. Staff Home Dashboard

Goal: Give staff an immediate operational read on giving health, sync trust, tasks, and exceptions.

Layout:

- App shell with header, left nav, and page workspace.
- Page header: "Home" with subtitle "Giving operations overview".
- Top status band with Rock sync freshness, current reporting period, and role-specific data visibility note.
- KPI row: total giving trend, recurring giving health, donor lifecycle movement, open exceptions. For Pastoral Care, replace amount KPIs with non-numeric care and lifecycle signals.
- Main grid: giving trend chart, recurring health distribution, donor lifecycle movement, operational exceptions table.
- Right column: assigned tasks, AI assist panel for reviewable insights, recent sync runs.

Primary interactions:

- Filter by date range, campus, fund/account, household segment, and role-visible view.
- Click any metric to open an explanation drawer.
- Click an exception row to open the right inspector.
- Create task from exception.

States:

- Fresh data.
- Stale sync warning.
- Partial sync warning with issue count.
- Empty state before first sync.
- Permission-masked Pastoral Care state.

### 2. Household Profile

Goal: Create the premium record-page pattern that all person and household screens follow.

Layout:

- Lightning-inspired record header.
- Object label: "Household".
- Title: household name.
- Compact fields: campus, primary adults, lifecycle status, recurring health, last Rock sync, open tasks.
- Right actions: Add task, Prepare communication, View in Rock, More.
- Alert strip when data is stale, giving details are hidden by role, or reconciliation issues exist.
- Tabs: Overview, Giving, Tasks, Communications, Relationships, Source, Audit.

Overview tab:

- Left/main: stewardship summary, giving lifecycle summary, important changes, household members, recent activity timeline.
- Right: open tasks, communication readiness, source confidence, AI summary draft.

Giving tab:

- Finance/Admin: trend chart, gift table, recurring giving status, funds/accounts breakdown, explainability notes.
- Pastoral Care: lifecycle signals, non-numeric pattern changes, care prompts, task history, no amounts or individual-level aggregates.

Source tab:

- Rock source IDs, last synced timestamps, sync run link, field ownership, reconciliation flags.
- Clearly label Rock-owned data as read-only.

Primary interactions:

- Add a follow-up task.
- Prepare communication from household context.
- Open explainability panel: "Why is this household in this segment?"
- View source metadata.

### 3. Person Profile

Goal: Give staff a person-centered CRM view while preserving household and Rock source context.

Layout:

- Record header with person name, household, campus, email status, local app user link if present, last synced.
- Role-aware key fields.
- Tabs: Overview, Giving, Tasks, Communications, Groups, Household, Source, Audit.

Overview:

- Identity and contact summary.
- Household membership.
- Active Connect Group participation.
- Recent stewardship activity.
- Open tasks.
- AI summary panel, clearly marked staff-review only.

Giving:

- Finance/Admin: person-linked gift facts where appropriate, household rollup with source explanation, recurring giving status.
- Pastoral Care: no numeric amounts; show care-safe pattern and lifecycle signals.

### 4. People and Households Lists

Goal: Let staff search and segment records quickly.

Layout:

- Object home page with page header, saved view selector, filter bar, bulk-safe actions, and enhanced table.
- Saved views: Recently viewed, Giving pattern changed, Open follow-up, Sync issues, Active recurring, At-risk recurring, Campus-specific views.
- Right inspector opens when a row is selected.

Table columns:

- Name.
- Household or primary contacts.
- Campus.
- Lifecycle status.
- Recurring health.
- Open tasks.
- Last synced.
- Source status.

Finance/Admin optional columns:

- Giving total for selected period.
- Last gift date.
- Fund/account summary.

Pastoral Care:

- Hide amount columns entirely.
- Use "Care signal" and "Follow-up reason" columns.

### 5. Giving Operations

Goal: Give finance and admins a dense operations view of giving facts, trends, recurring health, and exceptions.

Layout:

- Page header: "Giving".
- Tab set: Overview, Transactions, Recurring, Funds, Lifecycle, Exceptions.
- Filter bar: date range, campus, fund/account, gift reliability kind, sync run, exception type.
- Main content changes by tab, with tables and charts in a dense layout.

Transactions tab:

- Gift facts table with source traceability.
- Columns: date, donor/household, fund/account, amount, reliability kind, source transaction/detail IDs, sync status.
- Row action: view profile, view source metadata, create task.

Recurring tab:

- Recurring health dashboard.
- Categories: healthy, at risk, interrupted, unknown, needs verification.
- Explanation drawer for each classification.

Exceptions tab:

- Sync/reconciliation issue list with severity, source, record type, staff-readable message, status, and action.

### 6. Segments

Goal: Allow staff to define and review target groups without turning segmentation into a black box.

Layout:

- Page header: "Segments".
- Saved segments list on left.
- Segment builder/workspace on right.
- Segment preview table below criteria.
- Explanation and permission panel in right inspector.

Segment criteria examples:

- Lifecycle status.
- Giving pattern changed.
- Recurring health.
- Campus.
- Household composition.
- Communication readiness.
- Open tasks.
- Sync confidence.

Design requirements:

- Every segment preview needs "why included" explanations.
- Show permission warnings when a segment includes data hidden from the current role.
- Communication prep should require review before handoff.

### 7. Tasks

Goal: Make stewardship, data cleanup, and follow-up trackable.

Layout:

- Page header: "Tasks".
- Saved views: My open tasks, Stewardship follow-up, Data cleanup, Communication review, Completed.
- Kanban or split list optional, but default should be a dense list with right inspector.
- Table columns: title, priority, status, owner, linked record, reason, due date, last activity.

Task detail:

- Title, status, priority, assignee, due date.
- Linked person/household/segment/sync issue.
- Reason and explanation.
- Activity timeline.
- Communication prep link if applicable.

### 8. Communications

Goal: Prepare audiences and draft/handoff communication work without sending email in the first pass.

Layout:

- Page header: "Communications".
- Tabs: Prep records, Audiences, Drafts, Handoff history.
- Prep list table with status, audience size, criteria, reviewer, handoff target, and timestamps.
- Detail page with audience preview, review checklist, draft area, and handoff status.

Important boundary:

- No "Send" primary action in the first implementation.
- Use "Mark ready for review", "Approve", and "Export/handoff" only when those workflows exist.

### 9. Sync Health

Goal: Make Rock sync trustworthy and observable.

Layout:

- Page header: "Sync".
- Top summary: last successful sync, current status, records read/written/skipped, issue count.
- Timeline of sync runs.
- Issue table grouped by severity and source object.
- Source coverage panel showing people, households, groups, campuses, financial accounts, transactions, transaction details, scheduled transactions.

Interactions:

- Open sync run details.
- Acknowledge or resolve issue.
- View affected records.
- Copy safe diagnostic summary, with no secrets or PII.

States:

- Never synced.
- Running.
- Succeeded.
- Partial.
- Failed.
- Stale.

### 10. Access Needed

Goal: Let authenticated users without local authorization understand what happened and request access without seeing staff data.

Layout:

- Minimal centered page, not full app shell.
- Title: "Administrator approval required".
- Explanation: Auth0 sign-in succeeded, but this application requires a local user profile and role.
- Button: "Request access".
- Secondary action: sign out.

Do not show:

- Staff navigation.
- Donor data.
- Internal settings.
- User lists.

### 11. Settings and Access Requests

Goal: Give admins a clean future direction for local user and role management.

Layout:

- Settings shell with left settings nav.
- Sections: Users, Access requests, Roles, Integrations, Audit, AI policy.
- Access requests table: requester, email, Auth0 subject suffix, status, requested at, decision actions.
- User table: name, email, role, active state, Rock person link, last login if available.

Design note:

- This screen is not required for the first implementation pass, but the design system should anticipate it.

## AI Assist Design Rules

AI affordances should be visibly helpful but subordinate to staff judgment.

AI panel style:

- Use a small AI Assist badge.
- Use purple accent sparingly.
- Always show review status.
- Always show the data basis or summary inputs.
- Always include staff actions such as "Use as draft", "Revise", "Dismiss", or "Create task".

Required labels:

- "Draft for staff review"
- "Generated from synced giving summaries"
- "Does not send communication"
- "Review before use"

Do not design:

- Autonomous send flows.
- AI-only decisions.
- Chat interfaces with unrestricted database access.
- Prompt boxes that invite staff to paste sensitive payment details.

## Empty and Error States

Empty states should be operational and concise.

Examples:

- First sync empty state: "No Rock sync has completed yet."
- No segment results: "No households match these criteria."
- Permission hidden: "Giving amounts are hidden for your role."
- Stale data: "This view is based on the last successful Rock sync from Apr 17, 2026 at 10:42 UTC."
- Sync failure: "Rock sync failed. Review safe diagnostics and retry after checking integration access."

Do not use cheerful marketing copy for sensitive or failed states.

## Responsive Behavior

Desktop is the primary operating environment.

Desktop:

- Persistent top header and left nav.
- Tables and record pages optimized for 1280px to 1728px widths.
- Right inspector can be pinned.
- Compact density available for data-heavy users.

Tablet:

- Left nav collapses.
- Record compact fields wrap.
- Related lists become stacked table sections.
- Inspector becomes overlay sheet.

Mobile:

- Mobile support should preserve access, review, and simple task workflows.
- Dense finance reconciliation is not a primary mobile workflow.
- Tables collapse to list rows with key fields and row actions.

## Accessibility Requirements

- Meet WCAG AA contrast.
- Use semantic headings, nav, main, sections, tables, buttons, and forms.
- All icon-only buttons require accessible names and tooltips.
- All tables need clear column headers and keyboard focus behavior.
- Tabs, accordions, menus, drawers, and modals need correct keyboard interaction and ARIA states.
- Do not rely on color alone for status.
- Focus rings must be visible and premium, not removed.

## Stitch Generation Prompt Template

Use this prompt as a starting point when generating screens:

```text
Design a premium enterprise CRM screen for a church giving management staff console around Rock RMS. The visual language should be inspired by Salesforce Lightning record pages and high-end CRM tools: clean light theme, compact highlights, object/page headers, tabs, related lists, dense data tables, restrained borders, subtle elevation, and excellent spacing. Do not use a marketing landing-page style.

Use a polished light palette with cool gray surfaces, white panels, blue-teal primary actions, semantic status colors, and sparse purple only for AI Assist. The app handles sensitive donor and giving data, so the interface must feel trustworthy, operational, and careful.

Include a persistent top app header with the product wordmark, global search, Rock sync freshness, user role badge, and user menu. Include a left navigation rail with Home, People, Households, Giving, Segments, Tasks, Communications, Sync, and Settings.

Respect role-aware data visibility: Admin and Finance may see giving amounts where appropriate; Pastoral Care must not see actual giving amounts or individual-level giving aggregates. When hidden, replace values with clear permission-safe explanations rather than fake masked numbers.

Use realistic enterprise data labels and states, but no real donor PII. Show Rock source traceability, sync freshness, explanation drawers, task creation, communication prep review, and AI summaries as staff-reviewed drafts only. Do not include payment mutation or autonomous send actions.
```

## First Screens to Generate

Generate in this order:

1. Household Profile: establishes the core record-page pattern.
2. Staff Home Dashboard: establishes the operational dashboard system.
3. People/Households List: establishes object home, saved views, filters, tables, and inspector.
4. Giving Operations: establishes finance-heavy dense workflows.
5. Sync Health: establishes trust, observability, and source traceability.
6. Tasks: establishes operational workflow.
7. Communications: establishes review and handoff without sending.
8. Access Needed: establishes secure no-access behavior.

The Household Profile should be the design anchor. If it feels right, the rest of the product can inherit its header, tab, related-list, inspector, badge, and table patterns.

## Source Links

- Salesforce Lightning Design System design token and styling hook guidance: <https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-design-tokens>
- Salesforce Admin guidance on Lightning record-page efficiency, related lists, action buttons, and tab defaults: <https://admin.salesforce.com/blog/2018/how-to-configure-lightning-pages-that-work-for-your-users>
- Salesforce Lightning color system guidance: <https://v1.lightningdesignsystem.com/guidelines/color/our-color-system/>
- Salesforce Trailhead notes on compact layouts, highlights panels, related lists, and enhanced lists: <https://trailhead.salesforce.com/content/learn/modules/lex_migration_customization/lex_migration_customization_layouts_ui>
- Salesforce Nonprofit fundraising product patterns for donor profiles, segmentation, portfolio management, campaign insights, gift commitments, and operations: <https://www.salesforce.com/nonprofit/fundraising-software/>
