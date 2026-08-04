---
date: 2026-08-04
topic: 2026-giving-sync-divergence
---

# 2026 Giving Sync Divergence

## Problem Frame

A test household, Timothy and Colleen Thang, reconciles perfectly across Xero, Rock, and Abound for 2025, but diverges in 2026. Xero and the bank statement agree exactly and show 18 gifts in 2026 through 29 Jul 2026. Rock currently shows 8 gifts, with a latest gift date of 29 Apr 2026. Abound currently shows 3 gifts, with a latest gift date of 11 Feb 2026.

The pattern suggests two separate sync or import failures:

- Rock stopped receiving or recording some 2026 gifts from the upstream bank/Xero process, with fund-specific symptoms around late March and April 2026.
- Abound stopped syncing from its source before Rock's own 2026 cut-off, because Abound is missing five gifts that Rock currently holds.

If these cut-offs apply church-wide, giving statements, lapsed-giver reporting, lifecycle status, and follow-up workflows may be wrong for many households from February or April 2026 onward.

## Known Incident Evidence

- Xero contacts involved: `Timothy THANG` and `Timothy & Colleen THANG`.
- Xero and the bank statement agree: 18 gifts in 2026, most recent 29 Jul 2026.
- Rock holds 8 gifts, most recent 29 Apr 2026.
- Abound holds 3 gifts, most recent 11 Feb 2026.
- 2025 reconciles across all three systems.
- Rock missing dates: 8 Apr, 22 Apr, 6 May, 20 May, 3 Jun, 17 Jun, 1 Jul, 15 Jul, 17 Jul, and 29 Jul 2026.
- Abound missing dates: 25 Feb, 11 Mar, 25 Mar, 1 Apr, 8 Apr, 22 Apr, 29 Apr, 6 May, 20 May, 3 Jun, 17 Jun, 1 Jul, 15 Jul, 17 Jul, and 29 Jul 2026.
- Rock fund symptom: last Investment Fund record is 25 Mar 2026; last General Fund record is 29 Apr 2026.
- Rock captured General Fund gifts on 1 Apr and 29 Apr while missing Investment Fund gifts on 8 Apr and 22 Apr for the same household.
- Rock rows are typed `Currency Type = Cash`, even though these are bank automatic payments.
- Rock rows have empty `Batch Id` and `Transaction Code`.
- The same Rock account appears to have changed label from `Building` to `Investment Fund` on 2 Dec 2025.

## Requirements

**Immediate Reconciliation**

- R1. Produce a full-scope 2026 reconciliation report that compares upstream complete giving records against Rock and Abound, not only the test household.
- R2. Identify the latest gift date held by Rock and Abound across all households, grouped by fund/account where possible.
- R3. Identify whether Rock's 2026 missing records are isolated to specific funds, import batches, payment methods, contacts, households, or dates.
- R4. Identify whether Abound's missing records are explained by a stopped sync, failed worker, stale database, source permission failure, or source-system cut-off.

**Rock Investigation**

- R5. Confirm what process writes bank automatic payment gifts into Rock, including whether the process is manual import, Xero export/import, bank statement import, payment processor feed, Rock job, or custom integration.
- R6. Confirm whether Rock's gift-writing process is configured per fund/account or uses fund-specific mapping rules.
- R7. Determine what changed around 25 Mar 2026 for Investment Fund/Building gifts and around 29 Apr 2026 for General Fund gifts.
- R8. Verify whether the `Building` to `Investment Fund` label change on 2 Dec 2025 was a rename of the same Rock financial account or a mapping/account transition.
- R9. Verify why bank automatic payments are represented in Rock as `Currency Type = Cash` with empty `Batch Id` and `Transaction Code`, and whether those fields are expected for this import path.

**Abound Investigation**

- R10. Confirm Abound's source system for gifts. Current codebase evidence indicates Abound reads Rock API v1 into a local database mirror and derives local `GivingFact` rows from Rock financial transactions and transaction details.
- R11. Confirm the timestamp, status, and error details of the last successful Abound Rock sync.
- R12. Confirm the latest gift date present in Abound across all households, and separately by Rock financial account/fund.
- R13. Confirm whether Abound's sync worker or scheduled `rock-full-sync` job has stopped, failed, lost permissions, or pointed at an unexpected database/environment.
- R14. Verify whether Abound's derived fund-scoped lifecycle snapshots are stale even if raw synced Rock transaction rows are current.

**Operational Safeguards**

- R15. Until reconciliation is complete, staff-facing giving statements, lifecycle/lapsed-giver reporting, and follow-up workflows should display a freshness or trust warning when relying on 2026 giving data.
- R16. Investigation output must avoid exposing raw donor gift amounts, bank/payment identifiers, access tokens, or unnecessary donor PII.

## Success Criteria

- Staff can answer whether the February/April 2026 cut-offs are household-specific or church-wide.
- Staff can name the exact upstream process that writes gifts into Rock and whether it behaves per fund.
- Staff can identify the last successful Abound sync and latest gift date present in Abound across all households.
- Staff can produce a date/fund/person-scope exception list sufficient for finance staff to repair Rock and rerun Abound sync.
- Abound reports clearly warn users when synced giving data is stale or incomplete.

## Scope Boundaries

- Do not infer missing gift amounts from chat context or reconstruct donor-level records without stakeholder-approved source exports.
- Do not write gifts back to Rock from Abound as part of this investigation.
- Do not change payment, recurring gift, or bank import behavior until the actual Rock/Xero/bank process is verified.
- Do not treat Abound as authoritative for gift truth; Rock remains authoritative for Rock-owned giving records, while Xero and bank statements are the reconciliation source in this incident.

## Key Decisions

- Treat this as two failures until disproven: Rock appears incomplete relative to Xero/bank, and Abound appears stale relative to Rock.
- Use full-scope aggregate checks first, then drill into stakeholder-approved household/person slices only when necessary.
- Keep unresolved Rock import/process assumptions visible because the Rock-writing process is outside the current Abound codebase.

## Codebase Context

- Abound's implemented source path is Rock API v1 read-only sync, not live reads from Rock on every report.
- Full sync reads `/api/FinancialTransactions`, `/api/FinancialTransactionDetails`, `/api/FinancialAccounts`, and related person/household/account records.
- Abound derives `GivingFact` rows locally after sync.
- Fund settings affect fund-scoped derived reporting and lifecycle calculations; they do not appear to limit which Rock financial transactions are fetched during full sync.
- Sync status is stored in `SyncRun` and `SyncIssue`; the latest sync can be viewed through the app sync status page or queried from the database.

## Production Railway Findings

Checked the Railway `Abound` production database on 2026-08-04.

- Abound production sync is not stopped. Recent `rock:v1` sync runs are succeeding hourly.
- Latest checked successful sync completed at 2026-08-04 20:16:58 UTC.
- Latest synced local `GivingFact.occurredAt` across all funds is 2026-07-29.
- Latest synced `RockFinancialTransaction.transactionDate` is 2026-07-29.
- Latest attributed household gift in `GivingFact` is also 2026-07-29.
- 2026 `GivingFact` rows exist in every month from January through July 2026.
- 2026 fund/account latest dates include `General Fund` and `Investment Fund` through 2026-07-29.
- In 2026, 153 of 7,477 `GivingFact` rows have no `personRockId` or `householdRockId`.
- For the approved Thang/Cheong investigation slice, the raw synced Rock transaction tables contain the eight Rock-held 2026 gifts:
  - 14 Jan, 28 Jan, 11 Feb, 25 Feb, 11 Mar, 25 Mar, 1 Apr, and 29 Apr 2026.
- The first three Thang/Cheong gifts are attributed to person/household in `GivingFact`.
- The later five Thang/Cheong gifts are present as raw synced transactions and transaction details, but their `GivingFact` rows have null `personRockId` and `householdRockId`.
- The later Thang/Cheong transactions use changing authorized alias IDs. Some aliases are not the current primary alias, and some point through duplicate-looking Timothy/Tim Rock person records.

Updated conclusion: Abound's production sync is current globally. The test-household Abound gap is an attribution/identity-resolution issue in derived giving facts and household reporting, not a stopped production sync.

## Production Reconciliation

Applied on 2026-08-04:

- Fixed Abound sync normalization to resolve gift attribution through `RockPersonAlias.personRockId` before falling back to primary-alias matching.
- Deployed the fix to Railway production:
  - Worker deployment `f1a8af41-576f-4e3f-a3e6-5aa8a1a67e76`.
  - Web deployment `25a5a657-5646-407b-816b-874ada3af5a6`.
- Reconciled production `GivingFact` attribution from synced Rock mirror tables.
- Refreshed fund-scoped derived lifecycle and pledge recommendation snapshots.

Verification after reconciliation:

- 2026 `GivingFact` rows with null person attribution dropped from 153 to 2.
- 2026 `GivingFact` rows with null household attribution dropped from 153 to 2.
- The approved Thang/Cheong slice now attributes all eight Rock-held 2026 gifts to person `9498` and household `28877`:
  - 14 Jan, 28 Jan, 11 Feb, 25 Feb, 11 Mar, 25 Mar, 1 Apr, and 29 Apr 2026.
- The remaining Rock-side gap remains outside Abound: Rock still needs investigation for gifts after 29 Apr 2026 that Xero/bank show but Rock does not hold.

## Dependencies / Assumptions

- Xero and bank statement exports are the complete reconciliation source for this incident.
- Rock API access used by Abound can read all relevant financial transaction and transaction detail rows if permissions and jobs are healthy.
- The local worktree database was unavailable during initial capture because Postgres on `localhost:5432` was not running.

## Outstanding Questions

### Resolve Before Planning

- None.

### Deferred to Planning

- [Affects R1-R4][Needs research] Are the Rock and Abound 2026 cut-offs visible across all households or only the test household?
- [Affects R5-R9][Needs stakeholder/process research] What process writes bank automatic payment gifts into Rock, is it per fund, and what changed around 25 Mar and 29 Apr 2026?
- [Affects R10-R14][Technical] Why does `GivingFact` derivation leave person and household attribution null for some transactions whose authorized alias exists in `RockPersonAlias`, including the later Thang/Cheong records?
- [Affects R15][Product] Which Abound surfaces should show data freshness warnings while giving records are under investigation?

## Next Steps

-> `/ce:plan` for structured implementation planning.
