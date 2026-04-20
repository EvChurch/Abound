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

They do not edit Rock records, expose payment instruments, or manage recurring gift/payment setup. Profile reads use the local mirror. Person photos are the exception: the sync stores only Rock `Person.PhotoId`, and the staff UI loads the image through a protected app route that verifies local authorization before proxying Rock `GetImage.ashx?id=<PhotoId>` server-side.

Profile photo assumptions to verify against the live Rock instance:

- Rock `Person.PhotoId` is the profile photo binary file identifier.
- `GetImage.ashx?id=<PhotoId>` returns the image for authorized REST-key requests.
- The existing Rock REST key has read access to staff-visible profile photos.

## Role Behavior

Auth0 proves identity only. Local `AppUser` role controls visibility.

- Admin: can see profile context, local tasks, person giving summaries, and household giving summaries.
- Finance: can see profile context and giving summaries needed to identify donors and reconcile giving data.
- Pastoral Care: can see person/household care context and local tasks, but giving summaries are hidden.

Pastoral Care receives an explicit "Giving amounts hidden" UI state instead of blank summary data. GraphQL returns `givingSummary: null` and `amountsHidden: true`.

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
