---
title: Household participation source verification and review findings
date: 2026-10-31
status: partial-contract-verified
roadmap: RM-007
---

# Household participation source verification and review findings

Read-only discovery used the existing Abound production service's Rock credentials through `railway run`. Production mirror inspection used `railway ssh` on the web service and a PostgreSQL `BEGIN TRANSACTION READ ONLY`, closed with `ROLLBACK`. No secrets, person payloads, names, contact details or donor-level financial records were saved. These are session observations, not an atomic snapshot across Rock and Abound.

## Confirmed product decisions

Tataihono confirmed explicit Christian-field precedence, Unknown for missing explicit values, mismatch flags and himself as the first review recipient. Exploring is not a fallback classification. Review notifications must explain why they were sent, what needs checking and a suggested next action. Tataihono assigns subsequent Rock staff follow-up; Xero discrepancies go through him to Vincent.

## Connect Group coverage

| Measure                                                     | Type 25: Connect Group | Type 46: Connect Group - Unichurch Campus Group |
| ----------------------------------------------------------- | ---------------------: | ----------------------------------------------: |
| Rock groups returned                                        |                     28 |                                               6 |
| Active, unarchived Rock groups                              |                     28 |                                               6 |
| Rock memberships returned                                   |                    386 |                                             106 |
| Active, unarchived memberships in active, unarchived groups |                    374 |                                             104 |
| Distinct people in those active memberships                 |                    370 |                                             104 |
| Abound mirrored groups                                      |                     28 |                                               0 |
| Abound mirrored memberships                                 |                    423 |                                               0 |
| Abound memberships flagged active                           |                    403 |                                               0 |

Rock membership reads selected only ID, group/person references, membership status and archive state. They joined to source group types in memory and emitted aggregate counts only; they did not inspect contradictory member-level type values. Pagination used groups in batches of ten, up to twenty 1,000-row pages per batch. No bound was reached. A single 34-group OR filter exceeded Rock's OData node limit of 100; batching resolved it without changing server configuration.

Both source type IDs are verified current. UniChurch is missing locally, and the first correction preserves both types and applies the group/member activity rules consistently. The standard-group mirror/source discrepancy is a separate reconciliation finding: do not promise that upserting a full sync removes source-deleted memberships. Inspect missing source IDs, archived/inactive rows and snapshot timing before proposing cleanup. No deletion or merge is authorized by this finding.

The latest mirror sync inspected was `SUCCEEDED`, started `2026-10-31T08:08:25.904Z` and completed `2026-10-31T08:20:56.417Z`. Success alone does not certify source/mirror membership equality.

## Communication audience check

The production mirror contained two unarchived saved views. Neither referenced `activeConnectGroup` or `connectGroup` in its stored filter definition; no linked communication automations or runs were therefore identified by this check. Existing frozen runs keep their stored recipients. Recheck if saved views or automation configuration change before rollout. This inspection did not activate, pause or send communications.

## Christian-field discovery remains unresolved

- `/api/EntityTypes` identifies `Rock.Model.Person` as 15. A bounded metadata query returned 142 attributes for that entity, below its 500-row bound; no attribute key/name matched Christian, faith or convert. The sampled person response had no explicit Christian property and no populated `AttributeValues`; this sample does not prove the field is absent everywhere or accessible to this key.
- A global Christian-name/key metadata query found `Christian?`, key `Christian`, attribute 8148. It belongs to entity 113 (`Rock.Model.Workflow`), qualified by `WorkflowTypeId = 65`, with default `Unknown` and single-select field type 6. It is **not a verified person field**, and cannot be used as person truth without a documented identity link, update policy and authoritative-source decision. Other similarly named attributes also belong to workflow/calendar entities.
- The current connection-status defined type 4 contains Investigating (65), Visiting (66), Prospect (67), Attending (146), Fringe (203), Growing (1229), Community (1231), Supporter (1232), Joining (1406) and Establishing (in faith) (1407). No Exploring label was returned. Do not equate Investigating with Exploring or infer Christianity from other statuses.
- Family roles are verified as Adult 3 and Child 4. Record Status is defined type 2: Active 3, Inactive 4, Pending 5. Defined type 5 is person titles, not Record Status; it must not be used for eligibility.

Person Christian sync/schema binding remains gated on locating the actual source. The approved reporting rules can be implemented once that binding is verified; this evidence does not authorize substituting workflow answers or connection status.

## Attendance feasibility: initial findings

`GET /api/Attendances` and `GET /api/AttendanceOccurrences` are readable. Attendance exposes `OccurrenceId`, `PersonAliasId`, `StartDateTime`, `DidAttend`, `ScheduledToAttend`, `IsFirstTime` and other fields. Occurrences expose `GroupId`, `RootGroupTypeId`, `ScheduleId`, `OccurrenceDate` and `DidNotOccur`. Only shape keys and aggregate date endpoints were emitted; notes and raw records were not retained.

An unfiltered latest attendance date is 27 December 2026, demonstrating that future/scheduled entries exist. With `DidAttend eq true` and `StartDateTime` before `2026-10-31T00:00:00`, the earliest returned timestamp is `2021-01-05T14:25:04` and the latest is `2026-10-30T19:17:46.34`. These source timestamps have no timezone offset. They establish readable historical confirmed records, not continuous coverage, Sunday/Connect Group coverage, an individual's first visit or causal links with giving.

Next discovery must verify occurrence/group/schedule taxonomy for Sunday services versus Connect Groups, coverage and gaps by period/campus, alias identity joins and timestamp semantics. Attendance storage, sync allowlist expansion and attendance/giving analytics are not implemented by this feasibility check.

## Review findings for Tataihono

| ID     | Issue and why it needs review                                                                                                                           | Suggested check or next action                                                                                                                                                                                                                                                 | Owner/status                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| HP-001 | The explicit person Christian field and Exploring status do not match the metadata located so far. Reporting cannot safely bind to them.                | Identify the exact Rock person-screen field and its backing attribute/property with the Rock administrator; establish whether the workflow Christian answer is copied to a person field. Confirm the actual status label/ID intended by Exploring. Preserve Unknown meanwhile. | Tataihono: triage; open                 |
| HP-002 | Standard-group membership counts differ between the local mirror and current Rock source. A successful sync is insufficient evidence of reconciliation. | Compare source/mirror membership IDs in restricted tooling, separate removed/changed identities from archive/activity differences, then propose an explicitly scoped reconciliation change. Do not delete records based on count differences alone.                            | Tataihono: triage; open                 |
| HP-003 | Xero reconciliation still lacks an aligned export and mapping evidence.                                                                                 | Follow up with Vincent for the authorized export, account/fund mapping, reporting periods and treatment of reversals. Record discrepancies before declaring reconciliation.                                                                                                    | Tataihono: follow up with Vincent; open |

Notification destination: the connected personal Gmail profile verifies `tataihono.nikora@gmail.com`, the account already used for Rowan's plan thread. This is verified independently of the app's user table; the read-only app-user lookup did not find a unique active profile at that address, so it must not be used as an app-user identity mapping. Notifications to Tataihono do not authorize delivery to other staff.
