---
title: Household participation requirements
date: 2026-10-24
status: feedback-incorporated-source-discovery-pending
roadmap: RM-007
---

# Household participation requirements

Staff need a trustworthy count of households by connection status, with recorded Christian status and giving participation shown separately. The first delivery combines this reporting with correction of UniChurch Connect Group coverage, verification of the October giving analysis, and an attendance feasibility investigation.

Rowan replied on 31 October 2026 and approved the direction, explicitly requesting the UniChurch fix and deployment. His additions are incorporated below; source-contract discovery still gates dependent implementation. The original interview remains as a historical proposal, with the decision changes recorded in the [feedback reconciliation](../research/2026-10-31-rowan-plan-feedback.md).

Related documents:

- [Assessment of Rowan's requests](../research/2026-10-24-rowan-abound-request-assessment.md)
- [Provisional implementation plan](../plans/2026-10-24-001-household-participation-plan.md)
- [Consolidated reply and review brief](../research/2026-10-24-rowan-abound-review-brief.md)

## Scope and ownership

- R1. Rock remains authoritative for people, families, giving relationships, Christian-status fields, connection statuses, membership and gifts. Abound owns reporting definitions and derived classifications.
- R2. First deliver household reporting, UniChurch membership coverage, a reproducible assessment of report claims and a household data-quality review list. Investigate attendance availability in parallel; a full attendance integration is a separately scoped follow-up.
- R3. Keep this work staff-only under existing active local app-user authorization. Changes to reporting must not activate campaigns, alter existing communication audiences silently, or send donor messages.
- R4. Suspected duplicate or placeholder records go into a review list. Rock merges, retirements and production data repair require separate stakeholder-approved actions and a written operational record. Similar names alone are insufficient evidence.

## Household population and classification

- R5. Default to active, unarchived Rock family households with at least one active, non-deceased adult in a current household membership. Resolve active person status and Adult household role against verified Rock reference data. Default campuses are Central, North and UniChurch; Online and unassigned remain selectable.
- R6. Retain suspicious household records that otherwise qualify, with review indicators. Do not adjust denominators by guessing from names. Count each eligible family household once; identify overlapping or ambiguous membership explicitly.
- R7. Use family households for demographic rows and Rock giving-household relationships for financial attribution. Where those relationships differ or are ambiguous, expose the mapping for review and prevent duplicate financial attribution. Final treatment of ambiguous mappings is a technical discovery gate, not an assumed name-based merge.
- R8. Determine household connection status from eligible adults, with initial precedence Growing > Attending > Joining. Preserve every underlying status. Households with only other statuses appear as Other / needs classification; missing statuses remain identifiable. Do not invent precedence for Fringe, Supporter, Investigating, Visiting, Community, Prospect or Establishing in faith. Rowan accepted this limited ordering on 31 October; a fuller ordering remains unspecified.
- R9. Use the temporary rule approved by Tataihono after Rowan's 31 October follow-up: Rock connection status Investigating (defined value 65) means non-Christian; other statuses remain Unknown unless a verified explicit Christian/non-Christian value exists. A verified explicit field takes precedence, and disagreement with Investigating raises a review finding. Preserve provenance: status-derived non-Christian is a temporary proxy, not an explicit person-field value. Do not infer Christian from absence of Investigating or a Non-Christian tag. At least one eligible adult explicitly Christian means Christian adult present. Every eligible adult classified non-Christian under the approved rule means All adults classified non-Christian, with proxy-derived cases labelled. All other households are Unknown, including one non-Christian plus one unknown adult. Children do not determine classification. Missing/inaccessible source data never becomes false. This temporary policy supersedes the earlier no-fallback decision; the positive explicit source and tag ownership remain unresolved.
- R10. Use current household membership, connection status and Christian status when describing giving during a historical period. Label this Current household profile, giving during the selected period. This release does not reconstruct historical membership or spiritual status.

## Giving measures and report behaviour

- R11. Participation means positive net actual giving to enabled platform funds during a selectable window of 1, 3, 6, 12 or 24 completed calendar months. Default to 12 months (working default retained from the approved proposal); show the last completed month alongside it. Pledges and scheduled future gifts are not actual giving. Reuse verified refund, reversal and financial-status semantics; test zero and negative net totals.
- R12. On 24 October 2026, the annual reporting months are October 2025 through September 2026, and the monthly comparison is September 2026. Confirm the source date/effective-month convention before implementing date boundaries; any timezone choice must be explicit and consistent across counts and drilldowns.
- R13. Show giving households divided by all eligible households, and giving households with a recorded Christian adult divided by all eligible households with a recorded Christian adult. Make the latter the primary answer to Rowan's question. Keep unknown-status counts visible. An empty denominator displays Not applicable, not 0%.
- R14. Keep individual recorded donors, adults belonging to giving households, and giving households as distinct measures. A gift recorded against one spouse does not establish the other spouse's personal participation. Preserve the existing Healthy lifecycle as a separate measure with its own definition and window.
- R15. The dashboard table groups households by connection status and shows total households, all three Christian-status counts, giving households, and both participation percentages. Provide a period dropdown for 1, 3, 6, 12 months and 2 years, with selected-period and latest-completed-month measures clearly labelled. Preserve the selected period in every drilldown and API request. Include totals, campus and Christian-status filters, reporting dates, fund scope and sync freshness. Each count opens the corresponding household list with identical population and measure filters.
- R16. Extend household list filters and row explanations to support the same connection and Christian-status definitions. Reuse one reporting service across dashboard, lists, GraphQL and bounded staff MCP tools; preserve authorization, pagination and donor-data handling.

## UniChurch and attendance

- R17. After checking the current church taxonomy, treat type 25 and UniChurch type 46 as Connect Groups, preserving their original Rock IDs and labels. Apply the same definition to sync, active membership, profiles, list filters, sync status and agent results. Active membership requires an active, unarchived group and active, unarchived membership. Do not assume all UniChurch people belong to groups.
- R18. Attendance discovery covers Sunday services and Connect Groups separately: endpoint availability, permission, recorded fields, coverage, history, omissions and source ownership. Assess first recorded attendance, recent attendance frequency and elapsed time to first recorded gift. Membership is not attendance, missing records are not absence, and first recorded attendance is not necessarily a first visit. A feasibility finding and follow-up proposal complete this part of the first delivery.

## Verification and completion

- R19. Classify the October report's material claims as verified, contradicted or unresolved. Record source, unit, funds, period, campus scope, extraction/sync date and household mapping. Reproducing a report requires the relevant authorised export or read model; arithmetic checks alone do not verify production counts.
- R20. The first delivery is complete when dashboard counts equal complete drilldown totals, Christian-status lineage is verified, UniChurch membership is covered consistently, material report claims have reproducible evidence or explicit unresolved dependencies, a staff review list exists, attendance feasibility is documented, and focused business-logic, sync, API and authorization checks pass.

- R21. Every data-quality review item needs an accountable recipient, why it was flagged, evidence, a suggested check or potential fix, and disposition tracking. Route initially to Tataihono for triage, as confirmed on 31 October. Tataihono then assigns the responsible Rock staff member; use a verified notification destination. Notification content must explain why the recipient is receiving it and what action to take, linking to restricted evidence rather than including donor details in email. Tataihono authorized review findings to be sent to him first; do not send them directly to Rowan, Vincent or other staff without further instruction.
- R22. Reconcile Xero and Abound with aligned funds, periods and financial units, documenting discrepancies and missing evidence. Tataihono owns follow-up with Vincent; do not declare reconciliation without the underlying authorized Xero evidence.
- R23. Investigate flat/shared-address records using verified Rock family and giving relationships. Individual donor counts do not resolve household denominator ambiguity. Present distinct recorded givers per household (zero, one, two, three or more) for the same cohort and period as a diagnostic; a donor recorded once can represent joint giving. Do not infer flat identity, split households or exclude them from names, addresses or ratios alone.

## Acceptance examples

1. An eligible household with Growing and Joining adults appears once in Growing. Its detail explains both source statuses.
2. One explicitly Christian adult and one unknown adult produce Christian adult present. One non-Christian adult and one unknown adult produce Unknown. All eligible adults non-Christian under the temporary rule produce All adults classified non-Christian, with status-proxy provenance visible. An Investigating adult and an unknown adult remain Unknown.
3. A household with only Fringe and Investigating adults stays visible under Other / needs classification, with the original labels available.
4. A qualifying annual giver with a gift in March appears in annual participation even if there is no September gift. This does not redefine Healthy or trigger communication.
5. A zero net annual total after refunds does not qualify as annual giving. A pledge without an actual gift does not qualify.
6. Clicking a Growing / Christian adult present / annual giving count returns exactly those distinct households across every page, retaining campus, fund and reporting-window context.
7. An active member of an active UniChurch type-46 group counts as a Connect Group member. Pending, inactive or archived membership and inactive or archived groups do not.
8. Missing Christian-field access preserves Unknown except for the explicitly approved Investigating proxy. It cannot silently classify every other status as Christian or non-Christian.
9. A family/giving-household mismatch is explainable and cannot cause the same gift to be counted twice in a financial total.
10. An authenticated person without active local app access cannot retrieve this report through UI, GraphQL or MCP.

## Outstanding stakeholder and discovery decisions

- Confirmed decisions: Investigating (65) is an approved temporary non-Christian proxy; other statuses remain Unknown without verified explicit values. Explicit values take precedence and contradictory Investigating values raise review findings. Tataihono is the confirmed first review recipient and triage owner. Source discovery still needs to establish actual field semantics and IDs; a fuller connection-stage ordering was not supplied. Rowan wants all workstreams pursued, with attendance implementation still gated by feasibility.
- Rock discovery: identify the explicit Christian field, value meanings, null semantics, API access and completeness; verify current group types and active person/membership meanings.
- Financial discovery: settle exceptional family/giving-household mappings without double counting; confirm enabled funds, reversal/status rules, month boundaries and reporting timezone.
- Evidence: obtain authorised access to the Xero analysis/export if needed to reproduce its claims; household cleanup decisions and dates remain uncommitted.
- Attendance: verify actual church endpoint capabilities and recording coverage before designing storage or promising attendance analytics.

## Interview questions and proposed answers

The following preserves all 15 interview decisions. The questions are lightly condensed for readability; their numbering and meaning match the conversation. Answers preserve Tataihono's original proposal before Rowan's reply. The current requirements above and the 31 October feedback reconciliation supersede changed answers, especially Q2, Q9 and Q10.

| Question                                                                                                         | Proposed answer                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1. What must the first release accomplish: household reporting, UniChurch membership, attendance, or all three? | Household reporting and UniChurch correction first, with reproducible report checks. Investigate attendance in parallel and scope its implementation separately.                                                        |
| Q2. Use explicit Christian status, connection status as a proxy, or both independently?                          | Use explicit adult fields where verified; temporarily classify Investigating (65) as non-Christian, preserve provenance and leave other statuses Unknown.                                                               |
| Q3. Should the highest adult connection status determine household stage?                                        | Yes as a labelled reporting rule, with underlying adult statuses visible.                                                                                                                                               |
| Q4. Count households giving, individual recorded donors, or adults in giving households?                         | Household participation is primary. Keep the other measures separate and clearly labelled with population, funds and time window.                                                                                       |
| Q5. Produce a household-problem review list or also correct Rock records?                                        | Review list first; decide corrections record by record with the responsible Rock staff member.                                                                                                                          |
| Q6. Which households appear by default?                                                                          | Active, unarchived households with an active, non-deceased adult; Central, North and UniChurch initially. Online/unassigned selectable; suspicious names alone do not exclude.                                          |
| Q7. Should family household or giving unit determine reporting rows?                                             | Family households determine demographics; verified Rock giving relationships determine attribution. Ambiguities are reviewable; no name/address-based merging.                                                          |
| Q8. How should mixed or incomplete Christian records classify a household?                                       | Any explicitly Christian adult: Christian adult present. All adults non-Christian under the approved rule: All adults classified non-Christian, with proxy provenance. Otherwise Unknown. Children do not determine it. |
| Q9. What period and funds qualify a household as giving?                                                         | Positive net actual giving to enabled funds over the last 12 completed calendar months, with latest completed month alongside. Healthy remains separate.                                                                |
| Q10. What should Rowan see first?                                                                                | A dashboard household table by stage with Christian-status categories and participation, consistent filters, exact drilldowns, reporting dates, funds and freshness.                                                    |
| Q11. What should attendance investigation answer?                                                                | Sunday and group attendance availability, completeness, history, first recorded attendance, frequency and time to first gift. Distinguish membership, attendance, missing data and true first visit.                    |
| Q12. How should adult connection statuses be ordered?                                                            | Growing > Attending > Joining initially; other source statuses stay visible under Other / needs classification until Rowan supplies a fuller rule.                                                                      |
| Q13. Should participation use all households or Christian households?                                            | Show both; primary measure is participation among households with a recorded Christian adult. Unknown status remains visible.                                                                                           |
| Q14. Use today's household context for historical giving?                                                        | Yes, explicitly labelled as current household profile with giving during the selected period.                                                                                                                           |
| Q15. What defines completion?                                                                                    | Counts match drilldowns; UniChurch coverage and Christian-field lineage are verified; report claims have reproducible verdicts; review list and attendance feasibility finding exist; required checks pass.             |
