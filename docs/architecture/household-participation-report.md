# Household participation report

The dashboard panel and `/households/participation` use `getHouseholdParticipation` in `lib/giving/household-participation.ts`. GraphQL `householdParticipation` and MCP `get_household_participation` call the same service. The service requires an active staff actor; HTTP/GraphQL/MCP entry points retain existing local-user authorization. It performs reads only. No schema migration, source write, communication activation or payment behavior changes are included.

## Verified instance contract

- Family type 10, Adult role 3, active person record status 3; membership status 1, unarchived, non-deceased, unmerged people. All qualifying adults are selected, with no three-contact limit.
- Growing 1229 > Attending 146 > Joining 1406; other and missing statuses remain visible. Investigating 65 is the approved temporary non-Christian proxy. Other statuses remain Unknown. No explicit positive Christian field is bound, so Christian-adult giving participation is unavailable rather than zero. The classifier supports explicit-field precedence when a verified field is later wired; present source reads never invent such a value.
- Default campus IDs: North 2, Central 3, UniChurch 4. Online 5 and unassigned are selectable. API callers can select other synced campus IDs.
- Actual contributions are GivingFacts with transaction/detail IDs, no scheduled-detail ID, a source Contribution transaction type 53 and null status. The live mirror has null statuses on all 83,797 transactions, of which 83,378 are contributions and 419 event registrations. Non-null contribution statuses are unverified: affected household giving measures are unknown and rates are withheld; no processor status is guessed.
- Signed refunds remain in the sum. Event registrations, scheduled-only facts, pledges and gifts outside the selected completed window are excluded. A completed payment linked to a recurring schedule remains an actual transaction and counts once.
- UTC effective months preserve the existing sync convention. Periods are 1/3/6/12/24 completed months, default 12, with the latest completed month alongside. Both effectiveMonth and occurredAt must be inside the window. This does not change existing giving or Healthy metrics.

## Attribution and review

Demographic rows are eligible family households. Giving facts retain Rock's GivingGroupId, falling back to PrimaryFamilyId. The service builds the reverse giving-group/family mapping over the entire eligible population before campus filtering. One unique giving group can be attributed to one eligible family, including an explainable differing-group link. Shared giving groups, overlapping current family memberships and missing identities preserve demographic rows but withhold their giving measures and affected rates. A cross-campus filter cannot hide ambiguity or duplicate gifts.

Recorded-giver diagnostics net each recorded person over the identical selected period and funds. Zero/one/two/three-or-more/unresolved counts have matching drilldowns. They do not establish flat identity or independent giving by both spouses. No name/address-based merge, split or exclusion is performed.

Memberships last seen before the latest successful full Rock sync, unless updated by a newer slice, raise STALE_ADULT_MEMBERSHIP. Such households remain visible with provisional demographic/classification counts, unavailable giving measures and affected rates withheld. Omission is not interpreted as deletion or archive. A missing or non-successful latest sync also withholds rates. The read-only review list routes to Tataihono for triage; no automated notification or source correction is introduced. Disposition tracking and any source repair remain separate work.

## Consistency and pagination

Each read uses a RepeatableRead transaction covering reference metadata, fund scope, complete eligible population, grouped giving totals and returned aggregates. Giving totals are grouped in Postgres; amounts use Prisma.Decimal. Responses contain counts/classification rather than gift amounts, and at most 100 household rows. There are no per-household queries.

Links retain months, asOf, campus IDs, fund IDs, classification and a snapshot fingerprint of sync/fund metadata. Pagination requires asOf and snapshotId. A changed sync or fund scope rejects the continuation with a refresh instruction instead of mixing cohorts. An in-progress/failed latest sync rejects snapshot-based drilldowns; a fresh provisional summary remains available. Aggregate counts are computed before pagination. Known giving counts remain distinct from unresolved mappings. Empty denominators and unavailable rates display Not applicable with the reason alongside.

Existing household list/saved-view filters gain householdStage and householdChristianStatus predicates, using the same eligible-adult and classification contract. Other list defaults and pre-existing saved views remain unchanged. Period-specific participation drilldowns use the report route/service rather than old list giving-recency filters, which have different semantics.

## Verification and release

Tests exercise the real Postgres/Prisma predicates with 123 synthetic households and complete multi-page enumeration, fourth-adult stage precedence, null statuses, eligibility exclusions, annual gifts, net-zero refunds, event/current-month/scheduled exclusions and unverified financial statuses. Unit/contract tests cover ambiguous attribution, stale membership, all windows, unknown/explicit provenance, fund validation, snapshot refresh, UI link context, typed GraphQL authorization and bounded audited MCP parity.

Deploy through GitHub review/main CI and connected Railway. No new migration or sync is required for report code alone. Verify aggregate/drilldown equality, temporary-status wording, restricted review access, anonymous/inactive-user denial and freshness warnings after release. Rollback by reverting report exposure and new read filters; historical source identities are unaffected. Xero reconciliation, attendance implementation, positive Christian-source binding and source membership repair are not claimed complete by this report.
