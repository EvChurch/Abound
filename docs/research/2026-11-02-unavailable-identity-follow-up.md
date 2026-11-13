---
title: Unavailable identity follow-up — membership 79767
date: 2026-11-02
status: family-removal-history-confirmed-person-disposition-unresolved
roadmap: RM-007
---

# Unavailable identity follow-up

Live Rock history provides new evidence for membership **79767**: the exact retained person and membership were recorded as **removed from the retained family on 29 June 2026**. No later re-add appears in the complete bounded targeted response. This establishes a recorded end to that family association; it does not establish whether the unavailable person was deleted, merged, moved, hidden, or archived. No repair, membership flag change, identity reassignment, giving transfer, source write or deployment was performed.

This extends Case B in `docs/research/2026-11-02-household-membership-review-investigation.md`. All church-instance requests were authenticated GETs. Database reads used READ ONLY transactions and ROLLBACK. The target's person/family identifiers stayed in memory. Output and this note contain only the restricted membership ID, metadata, aggregate counts and exact-link booleans. Names, notes, raw history values and actor identities were not saved or output.

## Exact target history

The actual instance identifies Person as entity type 15, Group as 16 and GroupMember as 90. The final query selected history whose primary or related entity was the exact target person or membership. It deliberately excluded unrelated events associated only with the shared family.

The query returned six rows, below the 200-row bound, ordered by `CreatedDateTime asc,Id asc`:

| Source timestamp, exactly as returned | History subject        | Verb / change type           | Verified structured relationship                                     |
| ------------------------------------- | ---------------------- | ---------------------------- | -------------------------------------------------------------------- |
| `2026-06-22T19:03:35.32`              | Exact membership 79767 | ADDEDTOGROUP / Record        | RelatedEntityTypeId 16 and RelatedEntityId equal the retained family |
| `2026-06-22T19:03:35.32`              | Exact membership 79767 | Three MODIFY / Property rows | Each related to that same family                                     |
| `2026-06-29T15:46:28.377`             | Exact retained person  | REMOVEDFROMGROUP / Record    | RelatedEntityTypeId 16 and RelatedEntityId equal the retained family |
| `2026-06-29T15:46:28.377`             | Exact membership 79767 | REMOVEDFROMGROUP / Record    | RelatedEntityTypeId 16 and RelatedEntityId equal the retained family |

These are structured identity links, not a name match. The two removal rows agree on timestamp and family. The six rows contain no subsequent ADD, re-add or later event. Timestamps are preserved without inventing an offset for the source's timezone-less strings. The conclusion is bounded by history visible to this key and its retention; it is not a guarantee against missing/unrecorded later activity.

[Rock 17 GroupMember SaveHook](https://github.com/SparkDevNetwork/Rock/blob/17.0/Rock/Model/Group/GroupMember/GroupMember.SaveHook.cs) corroborates this interpretation. It records additions/removals on both Person and GroupMember histories and sets the related Group explicitly. A removal can result from a deleted or changed person/group association; an archive transition also produces a member removal event. Therefore a removal verb must not be translated directly into `IsArchived=true`, person deletion or a merge destination. The actual instance's exact history rows are the operational evidence; upstream source explains the contract, rather than proving the installed implementation is byte-identical.

## Controls and unavailable evidence

- Swagger documents the GET endpoints under the plural controller names `/api/Histories`, `/api/GroupMemberHistoricals` and `/api/Audits`. Earlier singular controller-name probes returned no relevant paths; they are not evidence that these endpoints do not exist.
- A broader target/person/member/family History query returned 27 rows. A known-good current adult from the same family returned 195, including one MERGE event. Unfiltered History with `$top=1` returned one row. This confirms history access, while showing why family-only events must be excluded from the target finding.
- A narrow query for that known-good adult's single MERGE record found the source's formatted old-person ID, but it did **not** equal the target person ID. This only rules out that one event as a redirect for this target. Its free-text record value was inspected in memory and not output or saved.
- Target GroupMemberHistorical returned zero rows; the current family-adult control also returned zero. An unfiltered `$top=1` control returned a row, so the endpoint is accessible. The live Family group type 10 has `EnableGroupHistory=false`; this specialized historical table cannot supply the target's disposition on the observed evidence.
- Audits returned zero for target and family-adult control, and zero even for unfiltered `$top=1`. No deletion audit is available through the inspected surface. This does not establish whether auditing is disabled, purged or restricted.
- The actual PersonAlias Swagger model lacks AliasPersonId/AliasPersonGuid. As recorded in the earlier investigation, unsupported filters are not valid negative evidence. [Rock 17 PersonAlias](https://github.com/SparkDevNetwork/Rock/blob/17.0/Rock/Model/CRM/PersonAlias/PersonAlias.cs) defines those merge-link fields without DataMember exposure; the visible REST schema cannot be assumed to provide the full database merge map.
- A global exact-ID MERGE-history search with a 30-second client timeout did not return a verdict. It was not retried and is explicitly **unverified**, not counted as zero matches. Broad free-text searches were stopped. [Rock's merge block](https://github.com/SparkDevNetwork/Rock/blob/17.0/RockWeb/Blocks/Crm/PersonMerge.ascx.cs) writes an old-person ID into a formatted record label, while [the merge procedure](https://github.com/SparkDevNetwork/Rock/blob/17.0/database/Procedures/spCrm_PersonMerge.sql) can move person-linked history to a survivor. Neither fact identifies a survivor for this case.

## Primary query record

Paths refer to the configured church Rock instance; credentials, base URL and other individual IDs are omitted.

- `GET /api/doc/v1?controllerName={Histories|GroupMemberHistoricals|Audits|PersonAlias|People}` to verify available GETs and actual response schemas.
- `GET /api/EntityTypes?$filter=Name eq 'Rock.Model.Person' or Name eq 'Rock.Model.GroupMember' or Name eq 'Rock.Model.Group'&$select=Id,Name&$top=10`.
- `GET /api/Histories` with `$filter=(EntityTypeId eq 15 and EntityId eq <target-person>) or (RelatedEntityTypeId eq 15 and RelatedEntityId eq <target-person>) or (EntityTypeId eq 90 and EntityId eq 79767) or (RelatedEntityTypeId eq 90 and RelatedEntityId eq 79767)`, `$select=Id,EntityTypeId,EntityId,Verb,ChangeType,RelatedEntityTypeId,RelatedEntityId,CreatedDateTime`, `$orderby=CreatedDateTime asc,Id asc`, `$top=200`.
- Broader history controls also included the exact parent Group. The target response had 27 rows; the family-adult control had 195; neither reached the 200-row bound.
- `GET /api/GroupMemberHistoricals?$filter=GroupMemberId eq 79767&$select=Id,GroupMemberId,GroupId,GroupRoleId,GroupMemberStatus,IsArchived,CurrentRowIndicator&$top=200`, with equivalent known-good-member and unfiltered `$top=1` controls.
- `GET /api/Audits` with target Person/GroupMember/Group entity-ID predicates, `$select=Id,EntityTypeId,EntityId,AuditType`, `$top=200`, plus equivalent known-good-family-adult and unfiltered `$top=1` controls.
- `GET /api/GroupTypes/10`, output restricted to history configuration booleans.

## Proposed disposition and remaining check

Record this case as **source-recorded family removal; current person disposition unresolved**. The old active mirror association is not corroborated as current membership. Retain the original source history and avoid fabricating archive/deceased values, deleting the person, merging identities, transferring gifts or removing the whole family.

Any reporting/sync correction should model verified membership cessation or an explicit reviewed exclusion separately from Rock-owned archive/status values. It needs a documented policy for history freshness, later re-adds, collection omissions, permissions, bounded history reads and failures; it must follow GitHub review and normal sync. This investigation does not authorize an emergency data repair. Until a reviewed correction/disposition is approved, keep the review flag and affected measures withheld.

The remaining administrator check is precise: verify membership 79767's 29 June removal in Rock, identify whether the former person has a supported merge-map destination or an explicit deletion/privacy/retention disposition, and confirm whether any later family association exists outside the visible history. No fuzzy identity match or absent-tag inference should fill that gap.

## Local lineage and reference impact

A READ ONLY mirror inspection found distinct person/member IDs and GUIDs, with both GUIDs present. There is no same-ID/no-primary-alias pattern elsewhere in the family-member mirror. The person and membership were first mirrored on 22 June; their last retained provenance is the normal `rock:v1` source rather than a fixture. Early normalization code directly maps Person.Id and member.PersonId; the mapping-artifact hypothesis has no supporting evidence.

The last retained member write is from a 29 June FAILED legacy run, and the person write is from a 29 June legacy run still marked STARTED. Both have recordsRead=188270 and recordsWritten=0; those counters do not prove no earlier chunk writes occurred. These are stale partial-run provenance records, not reliable complete-population baselines. Their history was not changed. The new scoped full runs correctly keep the association provisional because it is no longer verified in the current source cohort.

The target has one local household membership and zero local Connect Group memberships, GivingFacts, staff tasks, communication drafts, automation recipients or pledges. The household has one other currently eligible adult. These bounded counts describe the inspected reference types; they do not prove there are no other possible references or authorize deleting a person/family.

The remaining alias-contract check found no documented former-person-ID meaning for PersonAlias.Name. [Rock 17 PersonAliasService](https://github.com/SparkDevNetwork/Rock/blob/17.0/Rock/Model/CRM/PersonAlias/PersonAliasService.cs) uses Name for named Chat aliases, among other purposes. No speculative Name lookup was performed. Current People/PersonAlias GET metadata offers alias-ID lookup, GUID VCard output and current queries, but no verified lookup by former person identity. Existing primary alias IDs are unavailable for this target.

A proposed implementation path is recorded in `docs/plans/2026-11-02-002-confirmed-family-membership-removals.md`. It retains source removal evidence and models cessation separately from Rock-owned archive/status fields; it is not implemented or deployed by this investigation.

## Rowan reply check

Checked the existing Giving Check thread `1a16b4025525692b` in the same personal Gmail account used to send the question. Its latest message remains outgoing `1a1999efeec4ee59`, asking whether Commitment steps count as Christian evidence and which completion statuses qualify. No later reply was present. A recent-sender search across Rowan's three known email addresses in the personal account returned no newer message; a topic-matched all-folder search in the church account also returned none. No follow-up message was sent. The approved temporary classification rule remains unchanged.
