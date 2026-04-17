import { describe, expect, it } from "vitest";

import sampleFixture from "@/lib/rock/fixtures/sanitized-rock-sample.json";
import {
  validateSanitizedRockFixtureBundle,
  type SanitizedRockFixtureBundle,
} from "@/lib/rock/types";

describe("sanitized Rock fixtures", () => {
  it("keeps the sample fixture aligned with the fixture contract", () => {
    const result = validateSanitizedRockFixtureBundle(
      sampleFixture as SanitizedRockFixtureBundle,
    );

    expect(result).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects duplicate IDs and broken references", () => {
    const invalidFixture: SanitizedRockFixtureBundle = {
      ...(sampleFixture as SanitizedRockFixtureBundle),
      people: [
        ...(sampleFixture as SanitizedRockFixtureBundle).people,
        {
          ...(sampleFixture as SanitizedRockFixtureBundle).people[0],
        },
      ],
      gifts: [
        {
          ...(sampleFixture as SanitizedRockFixtureBundle).gifts[0],
          personFixtureId: "missing_person",
          details: [
            {
              accountFixtureId: "missing_account",
              amountCents: 5000,
            },
          ],
        },
      ],
      groupMembers: [
        {
          ...(sampleFixture as SanitizedRockFixtureBundle).groupMembers[0],
          personFixtureId: "missing_person",
          groupFixtureId: "missing_group",
        },
      ],
    };

    const result = validateSanitizedRockFixtureBundle(invalidFixture);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "people.person_demo_001 has a duplicate fixtureId",
    );
    expect(result.errors).toContain(
      "gifts.gift_demo_001.details must sum to totalAmountCents",
    );
    expect(result.errors).toContain(
      "gifts.gift_demo_001.personFixtureId references missing person",
    );
    expect(result.errors).toContain(
      "gifts.gift_demo_001.details references missing financial account missing_account",
    );
    expect(result.errors).toContain(
      "groupMembers.group_member_demo_001.personFixtureId references missing person",
    );
    expect(result.errors).toContain(
      "groupMembers.group_member_demo_001.groupFixtureId references missing group",
    );
  });

  it("requires source metadata timestamps for reconciliation", () => {
    const invalidFixture: SanitizedRockFixtureBundle = {
      ...(sampleFixture as SanitizedRockFixtureBundle),
      generatedAt: "not-a-date",
      financialAccounts: [
        {
          ...(sampleFixture as SanitizedRockFixtureBundle).financialAccounts[0],
          sourceMetadata: {
            ...(sampleFixture as SanitizedRockFixtureBundle)
              .financialAccounts[0].sourceMetadata,
            fetchedAt: "not-a-date",
          },
        },
      ],
    };

    const result = validateSanitizedRockFixtureBundle(invalidFixture);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("generatedAt must be an ISO timestamp");
    expect(result.errors).toContain(
      "financialAccounts.account_general.sourceMetadata.fetchedAt must be an ISO timestamp",
    );
  });

  it("rejects obvious secrets and full payment instrument values", () => {
    const unsafeFixture = {
      ...(sampleFixture as SanitizedRockFixtureBundle),
      paymentToken: "Bearer abc.def.ghi",
      recurringGifts: [
        {
          ...(sampleFixture as SanitizedRockFixtureBundle).recurringGifts[0],
          fullCardNumber: "4242 4242 4242 4242",
        },
      ],
    } as unknown as SanitizedRockFixtureBundle;

    const result = validateSanitizedRockFixtureBundle(unsafeFixture);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "fixture.paymentToken must not be present in sanitized fixtures",
    );
    expect(result.errors).toContain(
      "fixture.paymentToken looks like an access token or secret",
    );
    expect(result.errors).toContain(
      "fixture.recurringGifts.0.fullCardNumber must not be present in sanitized fixtures",
    );
    expect(result.errors).toContain(
      "fixture.recurringGifts.0.fullCardNumber looks like a full payment instrument value",
    );
  });
});
