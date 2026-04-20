import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PersonProfile } from "@/components/people/person-profile";
import type { RockPersonProfile } from "@/lib/people/profiles";

const monthlyGiving = [
  { giftCount: 0, month: "2025-05", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-06", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-07", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-08", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-09", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-10", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-11", totalGiven: "0.00" },
  { giftCount: 0, month: "2025-12", totalGiven: "0.00" },
  { giftCount: 1, month: "2026-01", totalGiven: "750.00" },
  { giftCount: 1, month: "2026-02", totalGiven: "750.00" },
  { giftCount: 1, month: "2026-03", totalGiven: "750.00" },
  { giftCount: 1, month: "2026-04", totalGiven: "750.00" },
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

function personProfile(
  overrides: Partial<RockPersonProfile> = {},
): RockPersonProfile {
  return {
    amountsHidden: false,
    deceased: false,
    displayName: "Jane Donor",
    email: "jane@example.com",
    emailActive: true,
    firstName: "Jane",
    givingHousehold: {
      active: true,
      archived: false,
      campus: null,
      lastSyncedAt: new Date("2026-04-18T10:00:00.000Z"),
      name: "Donor Family",
      rockId: 920001,
    },
    givingId: "G-910001",
    givingLeaderRockId: null,
    givingSummary: {
      firstGiftAt: new Date("2022-01-12T00:00:00.000Z"),
      lastGiftAmount: "250.00",
      lastGiftAt: new Date("2026-04-07T00:00:00.000Z"),
      lastTwelveMonthsTotal: "3000.00",
      monthlyGiving,
      monthsWithGiving: 38,
      reliabilityKinds: ["ONE_OFF"],
      sourceExplanation: "Derived from local GivingFact rows synced from Rock.",
      totalGiven: "12450.00",
    },
    householdMemberships: [
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
        rockId: 1,
        status: "Active",
      },
    ],
    lastName: "Donor",
    lastSyncedAt: new Date("2026-04-18T10:00:00.000Z"),
    nickName: "Jane",
    photoUrl: null,
    primaryAliasRockId: 1001,
    primaryCampus: {
      name: "North Campus",
      rockId: 30,
      shortCode: "N",
    },
    primaryHousehold: {
      active: true,
      archived: false,
      campus: null,
      lastSyncedAt: new Date("2026-04-18T10:00:00.000Z"),
      name: "Donor Family",
      rockId: 920001,
    },
    recordStatus: "Active",
    rockId: 910001,
    staffTasks: [
      {
        assignedToEmail: "care@example.com",
        assignedToName: "Care User",
        createdAt: new Date("2026-04-18T10:00:00.000Z"),
        dueAt: null,
        householdRockId: 920001,
        id: "task_1",
        personRockId: 910001,
        priority: "HIGH",
        status: "OPEN",
        title: "Call Jane",
      },
    ],
    ...overrides,
  };
}

describe("PersonProfile", () => {
  it("renders the operational record view with finance-visible giving", () => {
    render(<PersonProfile profile={personProfile()} />);

    expect(
      screen.getByRole("heading", { name: "Jane Donor" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Donor Family").length).toBeGreaterThan(0);
    expect(screen.getByText("Call Jane")).toBeInTheDocument();
    expect(screen.getByText("$3,000.00")).toBeInTheDocument();
    expect(screen.getByText("Current 12 months")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Household" })).toHaveAttribute(
      "href",
      "/households/920001?person=910001",
    );
    expect(screen.queryByText("Giving amounts hidden")).not.toBeInTheDocument();
  });

  it("renders an explicit hidden-amount state", () => {
    render(
      <PersonProfile
        profile={personProfile({ amountsHidden: true, givingSummary: null })}
      />,
    );

    expect(screen.getByText("Giving amounts hidden")).toBeInTheDocument();
    expect(screen.queryByText("$3,000.00")).not.toBeInTheDocument();
  });

  it("renders a Rock profile photo when one is synced", () => {
    const { container } = render(
      <PersonProfile
        profile={personProfile({
          photoUrl: "/api/rock/person-photo/12345",
        })}
      />,
    );

    expect(
      screen.getByRole("img", { name: "Jane Donor profile picture" }),
    ).toHaveAccessibleName("Jane Donor profile picture");
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/api/rock/person-photo/12345",
    );
  });
});
