---
title: Person and Household Profiles
date: 2026-04-18
source_plan: docs/plans/2026-04-18-002-feat-rock-person-household-detail-plan.md
---

# Person and Household Profiles

## Purpose

The profile slice gives staff a focused view of synced Rock people and households. It is a read-only staff workspace over local mirror data plus app-owned workflow records. Rock remains authoritative for person, household, campus, membership, and giving source data.

## Current Shape

Core files:

- `lib/people/profiles.ts`: role-aware profile projection service.
- `lib/giving/metrics.ts`: compact giving summaries from `GivingFact`.
- `lib/graphql/types/people.ts`: GraphQL profile contract.
- `app/people/[rockId]/page.tsx`: staff person profile page.
- `app/households/[rockId]/page.tsx`: staff household profile page.
- `app/api/rock/person-photo/[photoId]/route.ts`: protected Rock profile photo proxy.
- `components/people/person-profile.tsx`: shared record-view components and person layout.
- `components/people/household-profile.tsx`: household layout.

Lookup pages at `app/people/page.tsx` and `app/households/page.tsx` navigate by Rock ID only. Broad directory search is intentionally deferred because it needs a separate privacy and UX decision.

## Source and Ownership Boundary

The pages and GraphQL fields read from local synced mirror rows:

- `RockPerson`
- `RockHousehold`
- `RockHouseholdMember`
- `RockCampus`
- `RockDefinedValue`
- `GivingFact`

They also read app-owned workflow rows:

- `StaffTask`
- `GivingPledge`

They do not edit Rock records, expose payment instruments, or manage recurring gift/payment setup. Profile reads use the local mirror. Person photos are the exception: the sync stores only Rock `Person.PhotoId`, and the staff UI loads the image through a protected app route that verifies local authorization before proxying Rock `GetImage.ashx?id=<PhotoId>` server-side.

Profile photo assumptions to verify against the live Rock instance:

- Rock `Person.PhotoId` is the profile photo binary file identifier.
- `GetImage.ashx?id=<PhotoId>` returns the image for authorized REST-key requests.
- The existing Rock REST key has read access to staff-visible profile photos.

## Role Behavior

Auth0 proves identity only. Local `AppUser` role controls visibility.

- Admin: can see profile context, local tasks, person giving summaries, and household giving summaries.
- Finance: can see profile context, giving summaries, and local pledge recommendations needed to identify donors and reconcile giving data.
- Pastoral Care: can see person/household care context and local tasks, but giving summaries and pledge recommendations are hidden.

Pastoral Care receives an explicit "Giving amounts hidden" UI state instead of blank summary data. GraphQL returns `givingSummary: null`, `pledgeEditor: null`, and `amountsHidden: true`.

## Giving Summary Contract

Giving summaries are derived only from `GivingFact`. They expose compact aggregate fields:

- `totalGiven`
- `firstGiftAt`
- `lastGiftAt`
- `lastGiftAmount`
- `monthsWithGiving`
- `reliabilityKinds`
- `sourceExplanation`

The slice does not expose raw transaction lists, payment method details, gateway identifiers, payment tokens, bank/card data, or recurring gift management controls.

Giving summaries use the Admin-configured platform fund set from `PlatformFundSetting`. Disabled Rock funds remain synced for Admin configuration context, but they do not contribute to person or household totals, dashboard lifecycle data, list filters, pledge recommendations, or staff-facing API responses. If platform funds have not been configured, fund-scoped giving values are withheld until an Admin saves the enabled fund set.

## Local Pledge Contract

Person profiles include a local pledge editor for Admin and Finance users. Pledges are app-owned staff commitments by person and Rock financial account/fund. They are not donor-submitted intent, Rock scheduled transactions, recurring gift setup, payment instructions, or processor-managed state.

Pledge recommendations are derived from the latest 12 months of local `GivingFact` rows grouped by person and enabled platform fund. If a fund has no current-month giving yet, the analysis window ends at the previous month so the current month is not treated as a missing giving month. The first recommendation rule is intentionally conservative: it recommends a monthly pledge only when an enabled platform fund has giving in at least eight of the latest twelve months and no active or draft local pledge already exists for that person/fund.

The person pledge editor shows funds that have giving in the latest 12 months, plus funds with an existing active or draft local pledge. Active Rock funds with no recent giving and no pledge work are omitted so staff do not review empty recommendation rows.

The pledge UI supports:

- quick creation of an active pledge from a recommendation
- creation of a persisted draft pledge from a recommendation
- rejection of a recommendation when staff judgement says it should not become a pledge
- editing draft or active pledge amount, period, status, and dates

Rejected recommendations are stored as local recommendation decisions, not pledge records. The decision snapshots the recommendation evidence at the time of rejection and suppresses the same recommendation until confidence improves, giving continues after the rejection, or the recommended amount changes materially.

Pledge mutations require local `pledges:manage` permission, currently granted to Admin and Finance. Mutations validate synced Rock person/fund links, require the fund to be enabled for platform calculations, and reject a second active pledge for the same person/fund.

Verification expectations for this contract:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test -- tests/unit/giving-pledges.test.ts tests/unit/people-profiles.test.ts tests/unit/person-profile-page.test.tsx tests/integration/graphql-api.test.ts`
- `pnpm build`

## Photo Contract

Person profiles expose `photoUrl` when a synced `RockPerson.photoRockId` is present. The URL is an app-local path, not a Rock URL, so Rock credentials and internal hostnames are not sent to the browser.

The photo proxy requires the same local staff access boundary as profile reads:

- anonymous users receive `401`
- Auth0 users without an active local `AppUser` receive `403`
- local users without people profile permissions receive `403`
- unknown or unsynced photo ids receive `404`

The application does not store image bytes in Postgres.

## Visual Direction

The staff profile pages use the warm-neutral record-detail style from `tmp/Rock Record Detail _standalone_.html` as the design reference:

- warm paper background
- ivory panels
- thin muted borders
- ink-colored text
- restrained blue links and focus states
- compact monospace metadata labels
- dense staff-table layouts

This style is implemented through Tailwind theme tokens in `app/globals.css`, not by copying the standalone prototype runtime.
