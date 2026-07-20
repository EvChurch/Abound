---
date: 2026-06-24
topic: giving-drop-off-report
source:
  - /home/vscode/.codex/attachments/a3fcbc70-37f8-47c5-8aa4-1d1ba7981db3/Tataihono Nikora __ Giving Data Analysis_transcript.txt
  - /home/vscode/.codex/attachments/a3fcbc70-37f8-47c5-8aa4-1d1ba7981db3/Tataihono Nikora __ Landon_transcript.txt
---

# Giving Drop-Off Report

## Summary

Leadership needs an urgent, person-identifiable report that shows who used to give and has now stopped or materially reduced giving. The report should support pastoral and leadership triage: understanding whether the apparent drop-off is real, whether it moved to another household member, whether it shifted to apprentice or partner giving, and which people are worth following up with.

This request is related to the planned historical lifecycle trend work, but its first value is not a dashboard chart. The first value is a table that helps staff identify specific people and households, inspect monthly giving presence, and decide what kind of follow-up or broader church communication is needed.

## Problem Frame

Current point-in-time lifecycle views and Abound filters are not enough to answer the pastor's question:

- Who was giving and then stopped?
- When did they stop?
- Did they stop suddenly, or did the amount decline before stopping?
- Is the person still connected to church, or did they leave?
- Did giving move from one spouse/person record to another?
- Did giving shift from general church giving to apprentice or partner giving?
- Are leadership communications clear enough that people do not replace church giving with apprentice or partner support?

The pastor has spreadsheet exports from Vincent with month-by-month historical giving data that may go back several years and possibly to 2000. Those exports can be used to validate the app's synced Rock data and to fill historical gaps if Rock/Abound does not currently expose enough period history.

## Primary User Goal

Create a report that can answer:

> Who has dropped off from giving during the last five or six years, and when did that happen?

The first report should be useful even before AI tooling exists. AI can later help summarize patterns, generate hypotheses, or assist with analysis, but the report itself should use explicit, inspectable data and definitions.

## Report Shape

The requested first shape is a table, similar to Vincent's spreadsheet:

- one row per person, or potentially one row per giving unit/household with person-level context
- one column per month in the selected period
- each month showing whether the person gave in that month
- ideally also showing amount or directional change where role permissions allow
- columns for last gift date, months since last gift, and current lifecycle/status
- context fields for campus, Rock record status, Rock connection/contact status, and person category/status such as Joining, Attending, or Growing
- household giving context so staff can see whether another household member is still giving
- fund/category context to distinguish general church giving from building, apprentice, and partner giving

The report should be exportable as CSV so the pastor can do additional analysis or review in external tools.

## Filters

Likely useful filters from the conversation:

- date range, especially last five or six years
- "has given before, but not recently"
- "gave in any month during period X, but no gifts since period Y"
- campus
- Rock record status, especially Active and Pending
- Rock connection/contact status or local person category, especially Joining, Attending, and Growing
- current lifecycle state, especially At-risk and Dropped
- months since last gift
- fund scope: general church giving, building, apprentices, partners, or configured platform funds
- household still giving: yes/no/unknown
- active Connect Group participation or most recent Connect Group attendance where available

## Definitions To Decide

### Drop-Off

The conversation uses "dropped off" in more than one way. The report should probably support configurable thresholds rather than one hard-coded definition.

Possible definitions:

- no giving in the last N months after previously giving
- no giving in the last N months after giving in at least M of the prior 12 months
- total giving has declined by at least X% compared with the previous baseline period
- gave to general church funds previously, but now only gives to apprentice or partner funds

The existing lifecycle definitions can still power defaults:

- At-risk: usually gave regularly, but has not given for 90-180 days
- Dropped: usually gave regularly, but has not given for 180-270 days

For this report, the pastor may need a longer historical lens than the current Dropped window, because someone who stopped four years ago still matters for trend analysis.

### Person vs Household

The report needs both person-level and household-level signals.

Person-level drop-off is useful because follow-up is often with a person and Rock gifts may be tied to a single person. Household-level giving prevents false positives when a spouse or giving leader now makes the household gift.

The report should explicitly distinguish:

- person stopped and household also stopped
- person stopped but household still gives
- person amount dropped but household amount stayed steady
- household giving moved between members
- household giving dropped materially

### Fund Scope

The pastor specifically wants to compare general church giving with apprentice and partner giving. This should not be hidden inside one generic "platform giving" total.

The report should support fund grouping:

- general church giving
- building fund
- apprentice giving
- partner giving
- other configured platform funds

The exact Rock financial account IDs and grouping rules need stakeholder confirmation.

## Data Sources

Primary source:

- Rock RMS via local synced mirror and `GivingFact`, with Rock remaining authoritative.

Validation or historical supplement:

- Vincent's historical giving spreadsheets, especially if they contain month-by-month giving history beyond the current app/Rock accessible range.

Relevant local model concepts:

- `RockPerson`
- `RockHousehold`
- `RockHouseholdMember`
- `RockPerson.givingGroupRockId`
- `RockPerson.givingLeaderRockId`
- `RockFinancialAccount`
- `GivingFact`
- current and future lifecycle snapshots
- `PlatformFundSetting`

## Privacy And Permissions

This report is sensitive because it identifies donors, non-givers, giving changes, household giving behavior, and possible pastoral follow-up targets.

Requirements:

- Admin and Finance may see amount-bearing report detail if existing permissions allow.
- Pastoral Care may need lifecycle labels and follow-up context, but should not see individual giving amounts unless a later explicit permission decision changes that.
- CSV export must use the same role-based masking as the UI.
- AI analysis must be staff-reviewed and should not trigger autonomous donor communication.
- Logs and job output must not print donor names, emails, raw gift rows, or amounts.

## Relationship To Existing Plans

This request complements `docs/plans/2026-04-23-002-feat-historical-giving-lifecycle-trends-plan.md`.

The historical lifecycle plan creates durable month-end states and aggregate trends. This report needs a more operational drilldown:

- month-by-month person or household giving presence
- longer lookback windows
- fund-category comparison
- person and household disambiguation
- CSV export
- follow-up tagging or task creation later

The report could be implemented before the full charting/dashboard slice if the fastest path is a read-only table over existing `GivingFact` rows plus imported spreadsheet validation.

## Acceptance Examples

### AE1: Find Historical Drop-Offs

Given a selected five-year period and a configured general-giving fund scope, when staff opens the report, then it shows people who gave earlier in the period but have not given recently, including the month of their last gift and months since last gift.

### AE2: Show Month Presence

Given a matching person, when staff views the report table, then each month in the selected period shows whether that person gave in that month.

### AE3: Household Still Giving

Given a person stopped giving but another household member continues giving, when staff views the report, then the row clearly shows that the person's household is still giving.

### AE4: Fund Shift

Given a person reduced or stopped general church giving while increasing apprentice or partner giving, when staff views the report, then the row identifies the fund-category shift so leadership can evaluate communication needs.

### AE5: Pastoral Triage Filter

Given staff filters to Active or Pending people in Joining, Attending, or Growing, when the report refreshes, then it narrows to currently connected people likely to be relevant for follow-up.

### AE6: CSV Export

Given a user with permission to view the report, when they export CSV, then the file includes the same columns and masking that the UI permits for that user.

## Open Questions

- What exact period should the default report cover: last 60 months, last 72 months, since 2020, or all available history?
- What should count as "recently" for the default drop-off filter: no gift in 3 months, 6 months, 9 months, or a lifecycle-derived threshold?
- Should the default row grain be person, household/giving group, or person rows grouped visually by household?
- Which Rock financial accounts belong to general church giving, building, apprentices, and partners?
- Should "dropped off" be based on gift presence only, amount decline, or both?
- For amount decline, what counts as material: 25%, 50%, custom dollars/month, or pledge variance?
- Should the first version import Vincent's spreadsheet as a validation dataset, or only use it manually to validate app output?
- Does Vincent's spreadsheet identify people by Rock person ID, giving ID, email/name, or another key?
- Should non-Christian filtering exist now, or should the report simply exclude statuses/categories that staff decide are not relevant?
- Which roles should be able to export CSV from this report?
- Should follow-up tagging/task creation be part of the first report, or a later workflow after staff manually reviews the first list?

## Recommended First Slice

Build a read-only "Giving Drop-Off" report that:

1. defaults to the last 60 months;
2. uses configured general-giving funds for the primary drop-off signal;
3. shows person rows with household/giving-group context;
4. includes monthly gift presence, last gift date, months since last gift, current lifecycle, campus, record status, and connection/contact status;
5. includes household-still-giving and apprentice/partner-giving indicators;
6. supports filters for campus, status/category, lifecycle, months since last gift, and household still giving;
7. exports CSV with permission-safe masking;
8. can be validated against Vincent's spreadsheet before leadership uses it for decisions.
