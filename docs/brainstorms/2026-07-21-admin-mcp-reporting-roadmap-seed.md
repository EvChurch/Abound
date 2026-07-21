---
date: 2026-07-21
topic: admin-mcp-reporting-roadmap-seed
roadmap_id: RM-005
---

# Admin MCP Reporting

## Problem Frame

Administrators and trusted agents need a safer, more structured way to query, inspect, summarize, and collect information from Abound. MCP should become the agent-access layer for reporting and operational analysis without exposing raw sensitive data.

## Seed Requirements

- R1. MCP tools should expose administrator-safe reporting and information collection capabilities.
- R2. MCP access should respect the same sensitive-data boundaries as the app, including donor identity, giving history, communication preferences, and staff notes.
- R3. MCP tools should support questions about audience quality, communication coverage, campaign outcomes, and opportunity insights.
- R4. MCP tools should return structured, explainable results suitable for agents to use in follow-up planning.
- R5. MCP tools should avoid raw payload exposure, secrets, payment data, and unnecessary PII.

## Scope Boundaries

- Do not expose unrestricted database access through MCP.
- Do not create write-capable workflow tools until read/reporting boundaries are clear.
- Do not bypass app authorization or audit expectations.

## Questions To Pick Up

- Which administrator action should MCP support first: querying, report generation, export preparation, data collection, workflow creation, or another action?
- What authentication and authorization boundary should MCP use?
- What audit trail is required when agents query sensitive reporting data?

## Next Steps

-> Resume `/ce:brainstorm` for Admin MCP Reporting before planning implementation.
