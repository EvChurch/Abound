import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HouseholdProfile } from "@/components/people/household-profile";
import type { RockHouseholdProfile } from "@/lib/people/profiles";

const monthlyGiving = [
  { giftCount: 0, month: "2025-05", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-06", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-07", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-08", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-09", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-10", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-11", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-12", totalGiven: "0.00" },
  { giftCount: 1, month: "2026-01", totalGiven: "1500.00" },
  { giftCount: 1, month: "2026-02", totalGiven: "1500.00" },
  { giftCount: 1, month: "2026-03", totalGiven: "1500.00" },
  { giftCount: 1, month: "2026-04", totalGiven: "1500.00" },
].map((month) => ({
  ...month,
  previousGiftCount: 0,
  previousMonth: previousYearMonth(month.month),
  previousTotalGiven: "0.00",
}));

function previousYearMonth(value: string) {
  const [year, month] = value.split("-").map(Number);

  return new Date(Date.UTC(year - 1, month - 1, 1)).toISOString().slice(0, 7);
}

function householdProfile(
  overrides: Partial<RockHouseholdProfile> = {},
): RockHouseholdProfile {
  return {
    active: true,
    amountsHidden: false,
    archived: false,
    campus: {
      name: "North Campus",
      rockId: 30,
      shortCode: "N",
    },
    givingPeople: [
      {
        deceased: false,
        displayName: "Jane Donor",
        email: "jane@example.com",
        emailActive: true,
        firstName: "Jane",
        lastName: "Donor",
        nickName: "Jane",
        photoUrl: null,
        primaryCampus: null,
        primaryHousehold: null,
        rockId: 910001,
      },
    ],
    givingSummary: {
      firstGiftAt: new Date("2022-01-12T00:00:00.000Z"),
      lastGiftAmount: "500.00",
      lastGiftAt: new Date("2026-04-07T00:00:00.000Z"),
      lastTwelveMonthsTotal: "6000.00",
      monthlyGiving,
      monthsWithGiving: 61,
      reliabilityKinds: ["SCHEDULED_RECURRING"],
      sourceExplanation: "Derived from local GivingFact rows synced from Rock.",
      totalGiven: "34820.00",
    },
    lastSyncedAt: new Date("2026-04-18T10:00:00.000Z"),
    members: [
      {
        archived: false,
        groupRole: "Adult",
        household: {
          active: true,
          archived: false,
          campus: null,
          lastSyncedAt: new Date("2026-04-18T10:00:00.000Z"),
          name: "Donor Family",
          rockId: 920001,
        },
        person: {
          deceased: false,
          displayName: "Jane Donor",
          email: "jane@example.com",
          emailActive: true,
          firstName: "Jane",
          lastName: "Donor",
          nickName: "Jane",
          photoUrl: null,
          primaryCampus: null,
          primaryHousehold: null,
          rockId: 910001,
        },
        rockId: 1,
        status: "Active",
      },
    ],
    name: "Donor Family",
    rockId: 920001,
    staffTasks: [],
    ...overrides,
  };
}

describe("HouseholdProfile", () => {
  it("renders household members and household giving summary", () => {
    render(<HouseholdProfile profile={householdProfile()} />);

    expect(
      screen.getByRole("heading", { name: "Donor Family" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Donor Family household members" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Jane Donor").length).toBeGreaterThan(0);
    expect(screen.getByText("$6,000.00")).toBeInTheDocument();
    expect(screen.getByText("Current 12 months")).toBeInTheDocument();
  });

  it("uses available member photos in the household avatar", () => {
    const { container } = render(
      <HouseholdProfile
        profile={householdProfile({
          members: [
            {
              ...householdProfile().members[0],
              person: {
                ...householdProfile().members[0].person!,
                photoUrl: "/api/rock/person-photo/12345",
              },
            },
          ],
        })}
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/api/rock/person-photo/12345",
    );
  });

  it("keeps the originating person selected when opened from a person tab", () => {
    render(
      <HouseholdProfile
        currentPersonRockId={910002}
        profile={householdProfile({
          members: [
            ...householdProfile().members,
            {
              archived: false,
              groupRole: "Child",
              household: householdProfile().members[0].household,
              person: {
                deceased: false,
                displayName: "John Donor",
                email: "john@example.com",
                emailActive: true,
                firstName: "John",
                lastName: "Donor",
                nickName: "John",
                photoUrl: null,
                primaryCampus: null,
                primaryHousehold: null,
                rockId: 910002,
              },
              rockId: 2,
              status: "Active",
            },
          ],
        })}
      />,
    );

    expect(screen.getByRole("link", { name: "Person" })).toHaveAttribute(
      "href",
      "/people/910002",
    );
  });

  it("uses a deliberate hidden state for pastoral care visibility", () => {
    render(
      <HouseholdProfile
        profile={householdProfile({
          amountsHidden: true,
          givingSummary: null,
        })}
      />,
    );

    expect(screen.getByText("Giving amounts hidden")).toBeInTheDocument();
    expect(screen.queryByText("$6,000.00")).not.toBeInTheDocument();
  });
});
