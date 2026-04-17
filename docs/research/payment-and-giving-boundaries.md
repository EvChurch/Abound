---
title: Payment and Giving Boundaries
date: 2026-04-17
status: draft
source_plan: docs/plans/2026-04-17-001-feat-giving-management-foundation-plan.md
---

# Payment and Giving Boundaries

## Current Decision

Donor-facing payment setup, payment instrument management, and recurring gift mutations are out of scope.

This app may read giving-related data for staff reporting after the Rock integration path is confirmed. It must not invent local giving setup state or become a payment system by accident.

Updated 2026-04-17 from stakeholder input:

- Do not do work around payment or giving setup in this phase.
- Reporting should focus on distinguishing one-off giving from recurring giving.
- The product likely needs a pledge or intended-frequency concept eventually, whether automatically inferred or submitted by the end user, so staff can estimate reliable monthly giving for budgeting.
- Campus boundaries and small-group participation matter for reporting and segmentation.

## Source Of Truth Boundary

Rock remains authoritative for:

- People and households.
- Financial transactions and transaction details.
- Financial accounts/funds.
- Rock-owned giving fields and statuses.
- Scheduled/recurring giving records if Rock owns or exposes them.

The payment processor or hosted giving provider may be authoritative for:

- Payment instruments.
- Gateway customer profiles.
- Bank/card tokens.
- Recurring payment schedules or editable recurring payment setup.
- Hosted checkout/session state.
- Processor-level failures, retries, refunds, chargebacks, and settlement details.

The exact ownership boundary is unknown and must be verified.

## Deferred Donor-Facing Operations

Do not implement these operations yet:

- Add a payment method.
- Edit or remove a payment method.
- Start, pause, cancel, or update a recurring gift.
- Change recurring gift amount, schedule, fund, or payment instrument.
- Display full payment details.
- Attempt refunds, reversals, or chargeback workflows.
- Send payment or recurring-gift confirmation emails from this app.

Future donor-facing views must show authoritative state from Rock, the processor, or a hosted provider. If the state cannot be verified, the UI should say access is unavailable rather than displaying guessed local state.

## Reporting Boundary For Recurring Reliability

The app may model reporting concepts that help staff understand reliability, as long as those concepts are clearly derived or locally owned rather than presented as processor truth.

Candidate reporting concepts:

- One-off gift: a gift not linked to a scheduled/recurring transaction and not matching a reliable inferred cadence.
- Scheduled recurring gift: a gift or commitment tied to an authoritative Rock scheduled transaction when that read path is available.
- Inferred recurring pattern: repeated historical gifts that appear to follow a cadence, but are not guaranteed future funds.
- Pledge or intended frequency: a locally modeled commitment or donor-submitted intention, if a later requirements pass approves that feature.
- Reliable monthly estimate: a staff-facing projection that separates authoritative scheduled gifts, pledges/intentions, and inferred recurring patterns.

Any inferred or projected value must be explainable and labeled. It must not be treated as settled cash, a payment instruction, or a processor-managed recurring gift.

Relevant Rock API v1 fields discovered on 2026-04-17:

- `FinancialTransactions.ScheduledTransactionId` can help distinguish scheduled/recurring transactions from one-off gifts.
- `FinancialScheduledTransactions.TransactionFrequencyValueId`, `StartDate`, `EndDate`, `NextPaymentDate`, `IsActive`, `Status`, and `StatusMessage` can support recurring-giving health and reliable monthly estimate work if the fields are complete in production data.
- `FinancialScheduledTransactionDetails.ScheduledTransactionId`, `AccountId`, and `Amount` can support fund/account-level projections for scheduled giving.
- `FinancialTransactionDetails.AccountId` and `Amount` support fund/account-level reporting.
- `People.PrimaryCampusId`, `Groups.CampusId`, and `GroupMembers` support campus and small-group segmentation.
- `GroupTypeId = 25` (`Connect Group`) is the member-facing small-group boundary for segmentation.

One-off giving classification:

- A transaction with no `ScheduledTransactionId` should be treated as one-off unless a later inference model classifies it as an inferred recurring pattern.
- A transaction with `ScheduledTransactionId` should be treated as linked to an authoritative scheduled transaction.
- Transaction details should be fetched explicitly through `/api/FinancialTransactionDetails` rather than relying on embedded `FinancialTransactions.TransactionDetails`.

Recurring giving classification:

- Active scheduled transactions are available from `/api/FinancialScheduledTransactions`.
- Scheduled transaction detail rows are available from `/api/FinancialScheduledTransactionDetails`.
- Reliable monthly estimate calculations should start from active scheduled transactions and their detail amounts, then separately layer pledges or inferred recurring patterns if those features are approved later.

Campus and group segmentation:

- Primary person campus comes from `People.PrimaryCampusId`.
- Group campus comes from `Groups.CampusId`.
- Small-group membership should use active `GroupMembers` records whose group has `GroupTypeId = 25`.
- Rock defines `GroupMemberStatus` as `0 = Inactive`, `1 = Active`, and `2 = Pending`.
- `Small Group Section` groups should be treated as hierarchy/organization context, not direct small-group participation.

## Verification Checklist

Before planning donor-facing giving work, record:

- Payment processor or hosted giving provider name.
- Whether Rock is the operational owner for scheduled transactions.
- Whether scheduled-giving records can be read safely from Rock.
- Whether recurring gift changes must happen in Rock UI, processor-hosted UI, or this app.
- Whether hosted checkout or hosted payment-method update flows are available.
- Whether processor API access is permitted to this app.
- PCI scope expectations for the church and this application.
- Which identifiers are safe to store locally and which must never be persisted.
- How refunds, failed payments, retries, and settlement status flow back into Rock.

## Staff Reporting Boundary

Staff dashboards may eventually use synced application data for:

- Giving trends and fund/account summaries.
- Donor lifecycle movement.
- Recurring giving health indicators.
- One-off versus recurring giving classification.
- Reliable monthly giving estimates for budgeting.
- Campus-level giving and recurring reliability summaries.
- Small-group participation context for segmentation.
- Operational exceptions, such as missing household links or unresolved account mappings.
- Reconciliation visibility between Rock and imported payloads.

Role boundaries from the foundation plan still apply:

- Admin and Finance may see giving amounts.
- Pastoral Care must not see actual giving amounts or individual-level giving aggregates.
- All roles should see only the minimum person/household information needed for their workflow.

## Logging And Fixture Safety

Never log or commit:

- REST keys, cookies, bearer tokens, webhook secrets, or processor credentials.
- Full donor names, emails, phone numbers, or addresses from real payloads.
- Payment tokens, bank/card details, gateway customer IDs, or authorization codes.
- Raw processor payloads unless they have been explicitly sanitized and reviewed.

When an integration error needs debugging, log structured non-sensitive metadata such as source name, endpoint label, Rock record type, fake fixture ID, sync run ID, and redacted error category.

## Open Questions

- Are scheduled transactions readable from Rock without entering payment setup management scope?
- Are campus and small-group relationships available through API v2, API v1, or a custom endpoint/export?
- Should the first pledge/intended-frequency model be staff-entered, donor-submitted, automatically inferred, or deferred to a separate product pass?
- Are recurring gift statuses and failures readable without exposing payment details?
- Can the church generate sanitized examples for active, paused, failed, canceled, and expired recurring gifts?
- What sync freshness is required for recurring reliability reports to be useful for budgeting?
