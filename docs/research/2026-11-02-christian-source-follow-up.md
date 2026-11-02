---
title: Christian source follow-up — recorded Commitment steps
date: 2026-11-02
status: positive-evidence-candidate-awaiting-source-owner-decision
roadmap: RM-007
---

# Christian source follow-up

The new source candidate is a **recorded Commitment step**, not a newly discovered Christian person attribute. Rock Step Type 5 is populated and explicitly describes a personal commitment to Jesus Christ. It offers positive evidence worth taking to the source owner, but does not establish a complete or current binary Christian status. No classification, source data, sync allowlist, schema, or production configuration was changed.

This follows `docs/research/2026-10-31-unichurch-release-verification.md`. All church-instance requests below were authenticated GETs through the existing service credentials. Database joins used an explicit read-only transaction with rollback. Output and this note contain metadata and aggregate counts only; no individual identity, notes, answers, tokens, or raw payloads were saved.

## What was verified

The Person entity (15) still exposes 142 attribute definitions, below a 500-row bound. Names, keys and descriptions were checked for Christian, faith, belief, conversion, salvation, spiritual, baptism, discipleship, maturity, religion, testimony, commitment and decision candidates. Baptism metadata, spiritual-gift/personality assessments and church membership fields exist, but no explicit Christian-status attribute was verified. This bounds the conclusion to the metadata visible to the existing key; it does not prove a field cannot exist in another surface or permission scope.

There are 79 Person tags, below a 500-row bound. In addition to the previously found negative tags 8 and 36, two active shared tags are relevant: 44, New Commitment Last Year, and 50, New Commitment This Year. They have no description or owner alias. Their assignments number 18 and 15 respectively. They are dated evidence candidates, not a complete binary status contract.

The 467 visible Person data views were read below a 1,000-row bound. View 499, Annual Commitments, has a description referring to commitments for Christ during a calendar year. Its actual filter 13453 uses `Rock.Reporting.DataFilter.Person.StepsTakenFilter` (entity 638). The configured program/type/status GUIDs resolve to:

| Setting         | Verified source metadata                                                     |
| --------------- | ---------------------------------------------------------------------------- |
| Program         | 1, Discipleship Path                                                         |
| Step type       | 5, Commitment; active; date required; multiple records disabled; no end date |
| Selected status | 2, Completed; completion status flag true                                    |

The step-type description explicitly connects this step to deciding to trust Jesus Christ and beginning a relationship with God. This is a stronger positive-evidence candidate than assuming every non-Investigating person is Christian.

There is also a configuration discrepancy: view 499 describes a calendar year, while its stored completed-period setting is `Current,,Month,,`. Upstream [StepsTakenFilter parameter mapping](https://github.com/SparkDevNetwork/Rock/blob/develop/Rock/Reporting/DataFilter/Person/StepsTakenFilter.cs) places this in the completed-date period. This suggests a current-month filter despite the view's name/description. The deployed server's exact filter implementation and evaluated result were not independently reproduced, so this remains a configuration review finding, not a certified annual count. The upstream source is explanatory; the actual instance's metadata is the primary evidence for the configured values.

## Recorded step coverage and contradictions

A bounded query returned 61 Commitment steps, all with completion timestamps and 61 distinct aliases. Expanded aliases resolve to 61 distinct people; all 61 were independently readable through `People/{id}`. This avoids treating absence from the default People collection as proof of deletion or status.

| Recorded status          | Steps | Source completion-status flag |
| ------------------------ | ----: | ----------------------------- |
| Completed (2)            |    57 | true                          |
| Serving in a Team (4)    |     3 | true                          |
| Plugged into a Group (3) |     1 | true                          |

The latter four rows use labels normally associated with other step types. They cannot be silently treated as equivalent to the data view's explicit status-2 selection merely because the program status has a completion flag. The response's top-level `IsComplete` value was unavailable for all 61 rows; the probe therefore uses the expanded status definition and recorded timestamp, not that property. Rock's [Step model](https://github.com/SparkDevNetwork/Rock/blob/develop/Rock/Model/Engagement/Step/Step.cs) documents the separate type, optional status, person-alias and completion-date relationships.

Of the 61 people, 34 currently have Active status (3) and are non-deceased according to by-ID source reads. Their connection statuses are Growing 16, Establishing 12, Investigating 2, Attending 2, Visiting 1 and Supporter 1. Thus **two active people have both recorded positive Commitment evidence and the temporary Investigating negative proxy**. They require review if this positive source is adopted; the proxy must not silently overwrite the recorded evidence. The 34-person figure uses all completion-flagged statuses, not only the data view's status-2 cohort.

A read-only join against the current mirror found 33 of those active people in 33 households with eligible adult memberships and the report's default campuses 2/3/4. This is a coverage diagnostic, not a replacement report: the two separate stale membership cases, complete reporting service predicates, cross-adult classification and snapshot timing still apply.

Completion years span 2013–2026. Seventeen steps are dated 2026; all 17 use Completed status 2. Tag 50's 15 assignments all belong to people with Commitment steps; 15 are active and non-deceased. Tag 44 overlaps ten of the 61 step people (four active/non-deceased). These unequal populations show why the seasonal tags and step history should not be substituted without an explicit policy. Among all 61 step people, three also have Non-Christian tag 8 and two have tag 36; none of these overlaps are active/non-deceased. Neither a tag absence nor an absent Commitment record proves Christian or non-Christian status.

## Other explicit answers remain workflow-scoped

A global Christian attribute-name/key query returned nine definitions, all scoped to workflows or a calendar, with no Person definition. The Serving Survey workflow (type 50) has attribute 7901, Became a Christian in the year…, with 88 stored answer rows. Its copy, workflow type 94 / attribute 9220, has zero rows. EC Feedback Form (workflow type 110) has attribute 9434, asking the respondent's position in relation to Jesus Christ, with nine stored rows. No individual answer values or identities were output. These are historical workflow answers; no authoritative person-field copy, identity-resolution policy, answer precedence or clearing behavior was verified.

## Decision needed before implementation

Recommended question for the church's source owner, routed through Tataihono: **Should a recorded completed Commitment step (type 5) count as explicit positive Christian evidence for this report? If so, accept only Completed status 2, or all statuses marked complete; who maintains/corrects it; and what should happen when it is removed, contradicted or becomes outdated?** Separately confirm whether the serving-survey answer or another person-screen marker is the intended authoritative field.

The recommendation is to retain the approved temporary Investigating rule and Unknown elsewhere until that source decision is recorded. If positive Commitment evidence is approved, implement a typed, bounded step/alias contract with provenance, mismatch flags, removal semantics, failure states and focused tests. Do not infer that people without recorded steps are non-Christian. The current report intentionally remains unchanged.

## Primary query record

All paths refer to the configured church Rock instance; credentials and base URL are omitted. Bounds were not reached. Relevant probes remain temporary diagnostic scripts under `/tmp/abound-rowan-discovery/`, not production application code.

- `GET /api/Attributes?$filter=EntityTypeId eq 15&$select=Id,Key,Name,Description,FieldTypeId,IsActive,EntityTypeQualifierColumn,EntityTypeQualifierValue&$top=500`
- `GET /api/Tags?$filter=EntityTypeId eq 15&$select=Id,Name,Description,IsActive,EntityTypeQualifierColumn,EntityTypeQualifierValue&$top=500`
- `GET /api/DataViews?$filter=EntityTypeId eq 15&$select=Id,Name,Description,DataViewFilterId&$top=1000`
- `GET /api/DataViewFilters?$filter=Id eq 13452 or ParentId eq 13452&$top=100`, followed by `/api/DataViewFilters/13453` and the referenced EntityType metadata.
- `GET /api/StepPrograms?$top=200`, `/api/StepTypes?$top=200`, `/api/StepTypes/5`, and `/api/StepPrograms/1?$expand=StepStatuses`. The standalone `/api/StepStatuses?$top=200` returned 404 and the program navigation returned empty; status definitions were verified through the expanded step records instead.
- `GET /api/Steps?$filter=StepTypeId eq 5&$expand=StepStatus,PersonAlias&$top=1000`, plus `/api/People/{id}?$select=Id,RecordStatusValueId,IsDeceased,ConnectionStatusValueId` for the 61 resolved IDs.
- `GET /api/TaggedItems?$filter=TagId eq {8|36|44|50}&$select=EntityGuid&$top=1000`; person GUIDs stayed in memory for aggregate intersection checks.
- `GET /api/WorkflowTypes/{50|94|110}`, `/api/Attributes/{7901|9220|9434}?$expand=AttributeQualifiers`, and `/api/AttributeValues?$filter=AttributeId eq {7901|9220|9434}&$select=Id&$top=1000`.

## Authorized question sent to Rowan

After reviewing these findings, Tataihono explicitly requested that Rowan be asked whether Commitment steps count as Christian evidence and which completion statuses qualify. Sent to Rowan alone at his verified `rowan@ev.church` address in the existing Giving Check thread, from Tataihono's same personal Gmail account. Gmail confirmed SENT message `1a1999efeec4ee59` in thread `1a16b4025525692b`; sent status was read back. The message lists all three observed statuses, recommends Completed-only if Rowan accepts this source, explains Unknown for absence and mismatch review for Investigating, and leaves classification unchanged pending his answer. No donor identities or individual records were included.
