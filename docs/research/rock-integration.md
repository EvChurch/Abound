---
title: Rock Integration Research
date: 2026-04-17
status: draft
source_plan: docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md
---

# Rock Integration Research

## Current Decision

Do not implement live Rock sync yet.

The first integration boundary is a verified read contract: confirm the church's Rock version, available API surface, authentication method, controller permissions, and sanitized payload shapes before this app writes sync logic or dashboards that depend on Rock data.

Updated 2026-04-17 from stakeholder input:

- The church is running Rock 17.
- Rock is hosted by the church on an Azure scholarship environment.
- API v2 is available.
- API-based integration is preferred. Direct database access should stay off the table unless a later decision explicitly reverses that boundary.
- Both REST polling and webhook/event-style implementations may be considered, but reporting should run from this app's own synced database rather than from direct live Rock queries.
- A REST key can be provided for discovery and integration work. The key must only be stored in local ignored environment files or a secret manager, never in chat transcripts, committed docs, fixtures, logs, or tests.
- Payment and giving setup work is out of scope for now. The app should not add, edit, pause, cancel, or otherwise manage donor payment or giving setup.
- During discovery, the REST key was temporarily granted full admin access. The current Rock setup does not provide a separate read-only REST role, so implementation must enforce read-only behavior in code and treat the key as a high-risk infrastructure secret.

## What We Know From Public Rock Docs

- Rock exposes REST APIs for third-party integrations and internal Rock components.
- Rock REST access can use an authentication cookie or an `Authorization-Token` header from a REST key.
- REST keys are created in Rock under `Home > Security > REST Keys`, and permissions must be explicitly configured for API operations.
- Controller and method availability is discoverable inside the Rock instance under `Home > Security > REST Controllers`.
- Rock API v1 is described by Rock Community as legacy, while API v2 is the newer API line.
- Rock v2 API endpoints are secure by default. Access must be explicitly granted.
- Older OData-style queries are documented as deprecated and unavailable in API v2.

References:

- Rock REST API: https://community.rockrms.com/developer/303---blast-off/the-rock-rest-api
- Rock API resources: https://community.rockrms.com/api-docs/
- Rock v2 API patterns: https://community.rockrms.com/ask-chip-training/developer-books/article/231

## Instance Verification Checklist

Record these facts before building sync:

- Rock version and hosting model. Current answer: Rock 17, church-hosted on Azure scholarship infrastructure.
- Whether API v2 is available and enabled for the needed resources. Current answer: API v2 is available; exact resource coverage still needs endpoint discovery.
- Whether API v1 is required for any finance or person data not yet exposed through v2.
- Whether REST keys are allowed for this app, or whether the church requires cookie-based user authentication, exports, jobs, webhooks, or another path. Current answer: REST key access can be provided; REST polling and webhooks are both possible candidates.
- Exact REST controllers and methods granted to the app.
- Rate limits, request-size limits, network allowlists, CORS constraints, and maintenance windows.
- Whether the app can read only, or whether any write permissions are being considered.
- Whether direct database access is allowed. Current answer: no direct database access for this app; use APIs and synced local reporting data.

## First Data To Verify

Prioritize read-only fixtures in this order:

1. People and aliases needed to identify donors without over-collecting PII.
2. Households/families and household membership roles.
3. Primary campus affiliation for the person/household.
4. Small group participation.
5. Financial accounts/funds.
6. Financial transactions and transaction details.
7. Scheduled/recurring transaction status when readable without payment setup management.
8. Pledge or intended giving-frequency signals when available or later modeled locally.
9. Communication preferences relevant to stewardship workflows.

The first reporting goal is to distinguish one-off donations from recurring giving and estimate what giving is reliable enough for recurring monthly budgeting. Campus and small-group boundaries should be available for segmentation and pastoral context.

## Reporting Questions To Support First

- Which gifts look like one-off donations?
- Which gifts are part of a recurring or scheduled pattern?
- How much giving appears reliable for recurring monthly budgeting?
- Which donors or households have an explicit scheduled transaction, pledge, or intended giving frequency?
- Which recurring gifts are active, paused, canceled, failed, or stale?
- How do giving patterns break down by primary campus?
- How do giving patterns relate to small-group participation?

## Discovery Credential Handling

Do not paste the Rock REST key into committed files.

For local discovery, place credentials in an ignored `.env.local` file:

```bash
ROCK_BASE_URL="https://your-rock-host.example"
ROCK_REST_KEY="real-rest-key-goes-here"
```

Discovery scripts should:

- Send the REST key using Rock's `Authorization-Token` header.
- Redact the key from all errors and logs.
- Fetch only the minimum endpoint metadata and sample records needed to establish fixture shapes.
- Prefer the authenticated stakeholder's own Rock record for real-shape inspection when practical.
- Save only sanitized or hand-redacted samples to committed fixtures.

## API Discovery Results

Discovery command:

```bash
pnpm rock:discover
```

The command prints only endpoint status, content type, and top-level JSON keys. It does not print raw response values.

Results from 2026-04-17:

- API v2 documentation is available at `/api/v2/docs/index`.
- API v2 OpenAPI JSON is available at `/api/v2/doc`.
- API v2 model endpoints are documented under `/api/v2/models/...`.
- API v2 model search endpoints returned `401` when called with the REST key, even after the REST key user was temporarily granted admin access.
- API v1 documentation is available at `/api/docs/index`.
- API v1 REST endpoints were readable with the REST key after permissions were expanded.
- A stakeholder-owned target person record was inspected by ID and email to confirm relationship shape. The discovery output did not print or commit raw profile, contact, group, or giving values.

Readable API v1 endpoints relevant to the first reporting pass:

- `/api/People?$top=1`
- `/api/PersonAlias?$top=1`
- `/api/DefinedValues?$top=1`
- `/api/GroupTypes?$top=200`
- `/api/GroupTypeRoles?$top=1`
- `/api/Groups?$top=1`
- `/api/GroupMembers?$top=1`
- `/api/Campuses?$top=1`
- `/api/FinancialAccounts?$top=1`
- `/api/FinancialTransactions?$top=1`
- `/api/FinancialTransactionDetails?$top=1`
- `/api/FinancialScheduledTransactions?$top=1`
- `/api/FinancialScheduledTransactionDetails?$top=1`

Initially guessed endpoints `/api/PersonAliases?$top=1` and `/api/GroupRoles?$top=1` returned `404`. The verified v1 endpoints are singular `/api/PersonAlias` for aliases and `/api/GroupTypeRoles` for group member roles.

Important shape notes from top-level keys:

- `People` includes `Id`, `Guid`, `PrimaryAliasId`, `PrimaryAliasGuid`, `GivingGroupId`, `GivingId`, `PrimaryCampusId`, `PrimaryFamilyId`, record status fields, communication preference fields, and email/name fields.
- `PersonAlias` includes alias IDs and the linked person ID needed to enforce `People.PrimaryAliasId` and authorized-giver alias references locally.
- `DefinedValues` includes the value taxonomy used by person record statuses, transaction source/type values, and scheduled transaction frequency values.
- `GroupTypes` includes the group type taxonomy needed to identify families, small groups, serving teams, and other ministry structures.
- `GroupTypeRoles` includes the role taxonomy referenced by `GroupMembers.GroupRoleId`.
- `Groups` includes `Id`, `Guid`, `GroupTypeId`, `CampusId`, `ParentGroupId`, `Name`, `IsActive`, `IsArchived`, and `Members`.
- `GroupMembers` includes `Id`, `Guid`, `PersonId`, `GroupId`, `GroupRoleId`, `GroupTypeId`, `GroupMemberStatus`, and membership timestamps.
- `Campuses` includes `Id`, `Guid`, `Name`, `ShortCode`, `IsActive`, `CampusStatusValueId`, and `CampusTypeValueId`.
- `FinancialAccounts` includes `Id`, `Guid`, `Name`, `CampusId`, `ParentAccountId`, active/public/tax-deductible flags, and date fields.
- `FinancialTransactions` includes `Id`, `Guid`, `AuthorizedPersonAliasId`, `ScheduledTransactionId`, transaction date/status/source/type fields, reconciliation/settlement fields, and `TransactionDetails`.
- `FinancialTransactionDetails` includes `Id`, `Guid`, `TransactionId`, `AccountId`, and `Amount`.
- `FinancialScheduledTransactions` includes `Id`, `Guid`, `AuthorizedPersonAliasId`, `TransactionFrequencyValueId`, `StartDate`, `EndDate`, `NextPaymentDate`, `IsActive`, `Status`, `StatusMessage`, and `ScheduledTransactionDetails`.
- `FinancialScheduledTransactionDetails` includes `Id`, `Guid`, `ScheduledTransactionId`, `AccountId`, and `Amount`.

Relevant group types discovered:

| ID  | Name                                   |
| --- | -------------------------------------- |
| 10  | Family                                 |
| 23  | Serving Team                           |
| 24  | Small Group Section                    |
| 25  | Connect Group                          |
| 43  | Youth Group Area                       |
| 46  | Connect Group - Unichurch Campus Group |
| 63  | Explore Group                          |
| 64  | Coaching Group                         |
| 65  | Women's Connect                        |

The full group type list is available from `/api/GroupTypes`.

Small-group reporting boundary:

- `GroupTypeId = 25` (`Connect Group`) is the actual member-facing small-group membership boundary.
- `GroupTypeId = 24` (`Small Group Section`) appears to be hierarchy/organization context rather than the direct membership group type.
- A target stakeholder record confirmed an active Connect Group membership through `/api/GroupMembers?$filter=PersonId eq {personId}` and `/api/Groups/{groupId}` without printing or committing group names or member data.
- Connect Group records include `ParentGroupId` and `CampusId`, so reporting can preserve both hierarchy and campus context.
- `GroupMemberStatus` is a Rock enum: `0 = Inactive`, `1 = Active`, `2 = Pending`.
- A `GroupMemberStatus` value of `1` was observed on the active target membership, matching Rock's documented active value.

Target-record relationship paths confirmed:

- A person can be read by `/api/People/{id}`.
- A person can be found by email using `/api/People?$filter=Email eq '{encoded-email}'&$top=5`.
- Primary household/family can be read from `People.PrimaryFamilyId` through `/api/Groups/{id}`.
- Household members can be read through `/api/GroupMembers?$filter=GroupId eq {primaryFamilyId}`.
- Rock families are groups with `GroupTypeId = 10`; local `RockHousehold` rows preserve that source group.
- Giving rollups should preserve `People.GivingGroupId` and `People.GivingId`; `GivingGroupId` may be the right household/giving unit even when it needs to be distinguished from `PrimaryFamilyId`.
- Primary campus can be read from `People.PrimaryCampusId` through `/api/Campuses/{id}`.
- A person's group memberships can be read through `/api/GroupMembers?$filter=PersonId eq {personId}`.
- A person's financial transactions can be read through `/api/FinancialTransactions?$filter=AuthorizedPersonAliasId eq {primaryAliasId}`.
- A person's scheduled transactions can be read through `/api/FinancialScheduledTransactions?$filter=AuthorizedPersonAliasId eq {primaryAliasId}`. The target record had no scheduled transactions returned, so recurring scheduled transaction shape still needs a real non-sensitive example.
- The target record's sampled financial transactions had no `ScheduledTransactionId` values, so they are useful as one-off giving examples.
- Transaction details for the target record were available from `/api/FinancialTransactionDetails?$filter=TransactionId eq {transactionId}`. The sampled transaction did not include embedded `TransactionDetails`, so sync should fetch details explicitly rather than assuming they are expanded.
- A global active scheduled transaction shape was verified through `/api/FinancialScheduledTransactions?$filter=IsActive eq true&$top=1`.
- Scheduled transaction detail shape was verified through `/api/FinancialScheduledTransactionDetails?$top=1`.

Current implementation direction:

- Use API v1 REST as the first read path unless a later v2 auth investigation opens the v2 model endpoints.
- Use API v2 OpenAPI docs as reference material for available model names and future v2 work.
- Keep all sync read-only with respect to Rock.
- Store synced reporting data locally and run dashboards against the app database.
- Do not store payment instrument details, gateway customer identifiers, authorization codes, raw tokens, or REST keys.
- For small-group reporting, count active participation when the group has `GroupTypeId = 25`, the group is active and not archived, the group member is not archived, and `GroupMemberStatus = 1`.

## Final Credential Boundary

The current Rock setup does not provide a separate read-only REST role for this integration. The REST key used during discovery should therefore be treated as a high-risk infrastructure secret.

Compensating controls for implementation:

- Store the key only in ignored local environment files or a production secret manager.
- Never commit the key, derived credentials, request headers, cookies, or raw Rock responses.
- Use only `GET` requests from app sync/discovery code.
- Do not implement POST, PUT, PATCH, or DELETE calls to Rock in this phase.
- Keep endpoint access limited in code to the documented API v1 read endpoints.
- Redact the key and sensitive payload fields from all logs, errors, tests, and fixtures.

## Sanitized Fixture Policy

Fixtures must be generated from either fake demo data or sanitized church payloads. They must not contain:

- Real names, email addresses, phone numbers, street addresses, notes, or free-text prayer/care details.
- Full payment identifiers, tokens, bank/card details, gateway customer IDs, or transaction authorization codes.
- Access tokens, REST keys, cookies, headers, or Rock admin URLs.

Fixture values should preserve shape and edge cases:

- Use deterministic fake IDs and GUID-like strings.
- Preserve nullable fields, missing optional fields, inactive records, split gifts, unknown household links, and recurring-giving statuses.
- Keep enough timestamps to test freshness and reconciliation logic.
- Include `sourceMetadata` on every record so later sync code can trace records back to Rock without guessing.

The initial fixture contract lives in `lib/rock/types.ts`, with sanitized sample data in `lib/rock/fixtures/sanitized-rock-sample.json`.

## Initial Failure Modes To Design For

- Stale data: last successful sync is older than the staff-trust threshold.
- Missing records: gifts reference people, aliases, households, or accounts not included in the current payload.
- Duplicates: the same donor, alias, transaction, or scheduled transaction appears more than once.
- Deletions/inactivation: Rock marks records inactive or removes records from an export.
- Permission drift: a REST key loses access to a controller or field after deployment.
- Shape drift: Rock version or plugin changes alter field names or nested objects.
- Unsafe logging: errors include donor PII, financial details, headers, cookies, or REST keys.
- Partial sync: people load successfully but finance records fail, or transaction details load without matching transactions.

## Open Questions

- Which exact API v2 endpoints/controllers expose people, aliases, households, campus affiliation, group membership, financial accounts, transactions, transaction details, and scheduled transactions in this Rock 17 instance?
- Why do API v2 model search endpoints return `401` with the REST key while API v1 endpoints are readable?
- Is API v1 sufficient for the first sync, or should a separate v2 auth path be investigated before implementation?
- What is the Rock base URL for local discovery?
- Which Rock person record should be used for stakeholder-owned shape inspection?
- If Rock later gains a practical read-only REST role or narrower permission model, which permissions should replace the current broad discovery key?
- Are payment profiles or scheduled-giving statuses exposed through Rock, the payment processor, a hosted giving provider, or a combination?
- What sync freshness is acceptable before dashboards show warning states?
- Which staff roles should be allowed to inspect raw sync errors, skipped records, and reconciliation details?

## References

- Rock developer book, GroupMember enum mapping: https://community.rockrms.com/developer/book/17/17/content
