---
title: "Abound Roadmap"
date: 2026-07-21
status: active
---

# Abound Roadmap

## Purpose

This is the canonical roadmap and work-tracking index for the application. It exists so Codex and other agents can orient quickly without depending on GitHub Issues or chat history.

Use this document for product direction, priority, phase status, and links to durable Compound Engineering artifacts. Use `docs/brainstorms/` for requirements, `docs/plans/` for implementation plans, `docs/architecture/` and `docs/research/` for deeper context, and `docs/solutions/` for solved implementation learnings.

Current roadmap seed docs:

- `docs/brainstorms/2026-07-21-audience-quality-roadmap-seed.md`
- `docs/brainstorms/2026-07-21-communication-journeys-roadmap-seed.md`
- `docs/brainstorms/2026-07-21-communication-history-roadmap-seed.md`
- `docs/brainstorms/2026-07-21-opportunity-insights-roadmap-seed.md`
- `docs/brainstorms/2026-07-21-admin-mcp-reporting-roadmap-seed.md`
- `docs/brainstorms/2026-07-21-research-informed-strategy-roadmap-seed.md`

## Tracking Model

- Repo-local docs are the source of truth for roadmap tracking.
- GitHub Issues are not part of the core tracking model unless a future decision explicitly reintroduces them.
- Each roadmap item should have a stable ID so agents can refer to it across plans, docs, commits, and chat.
- A roadmap item moves into implementation only after it links to a requirements document or implementation plan.
- Status should describe product reality, not just whether code exists.

## Roadmap

### RM-001: Audience Quality

Status: `Exploring`

Timing: `Now`

Outcome: Staff can trust campaign audiences before any communication is prepared or sent.

What this covers:

- Saved segment quality.
- Exclusions and suppression.
- Stale data warnings.
- Missing or inactive contact data.
- Duplicate-looking person or household edge cases.
- Clear reasons why someone is included or excluded.

### RM-002: Communication Journeys

Status: `Exploring`

Timing: `Now`

Outcome: Staff can build drip campaigns and event-based emails that use safe context from the triggering event.

What this covers:

- Drip campaign sequences.
- Event-triggered emails.
- Dynamic fields from safe event and person/household context.
- Review and approval gates.
- Stop conditions, delays, and suppression rules.
- A simple first version before branching journey logic.

### RM-003: Communication History

Status: `Exploring`

Timing: `Next`

Outcome: Staff can see what each person or household has already received, skipped, opened, or been excluded from.

What this covers:

- Sent communication history.
- Skipped, bounced, suppressed, excluded, opened, and clicked states where available.
- Campaign and automation history on person and household profiles.
- Plain-language reasons for why someone received or did not receive a message.

### RM-004: Opportunity Insights

Status: `Exploring`

Timing: `Next`

Outcome: Staff can identify missed communication opportunities, under-served segments, and follow-up gaps.

What this covers:

- People who should likely receive follow-up but have not.
- Segments with low or missing communication coverage.
- Giving lifecycle or trend changes with no related communication.
- Campaigns that appear under-served or under-performing.
- Suggested staff review queues.

### RM-005: Admin MCP Reporting

Status: `Exploring`

Timing: `Later`

Outcome: Administrators and agents can use MCP for safe reporting, information collection, and operational analysis.

What this covers:

- Admin-focused reporting tools.
- Agent-safe query and inspection surfaces.
- Controlled access to Rock-synced data, Abound-derived data, communication history, and campaign outcomes.
- Structured information collection workflows.
- Guardrails against exposing unnecessary donor PII or financial detail.

### RM-006: Research-Informed Strategy

Status: `Exploring`

Timing: `Later`

Outcome: Staff can use credible third-party church giving research to shape communication ideas and generosity strategy.

What this covers:

- A curated research library.
- Research-backed campaign ideas.
- Giving encouragement patterns.
- Source notes or citations for recommendations.
- Reviewable strategy suggestions rather than autonomous communication.

## Maintenance Rules

- Update this roadmap when a roadmap item's priority, status, product scope, blocker, or source document changes.
- Prefer moving detailed implementation checklists into `docs/plans/` instead of expanding this document endlessly.
- Keep unresolved product assumptions visible here or in the relevant requirements document.
- Before starting substantial implementation, read this roadmap, then read the linked requirement or plan for the selected roadmap item.
- Before repeating similar auth, data, tooling, sync, or integration work, search `docs/solutions/`.
