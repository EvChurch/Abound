import { fireEvent, render, screen } from "@testing-library/react";
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
    connectionStatus: "Member",
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
      accountSummaries: [
        {
          accountName: "General Fund",
          accountRockId: 101,
          firstGiftAt: new Date("2022-01-12T00:00:00.000Z"),
          lastGiftAmount: "2000.00",
          lastGiftAt: new Date("2026-04-07T00:00:00.000Z"),
          lastTwelveMonthsTotal: "2000.00",
          monthlyGiving: monthlyGiving.map((month) => ({
            ...month,
            giftCount: month.month === "2026-04" ? 1 : 0,
            totalGiven: month.month === "2026-04" ? "2000.00" : "0.00",
          })),
          monthsWithGiving: 1,
          reliabilityKinds: ["ONE_OFF"],
          sourceExplanation:
            "Derived from local GivingFact rows synced from Rock.",
          totalGiven: "2000.00",
        },
        {
          accountName: "Missions",
          accountRockId: 102,
          firstGiftAt: new Date("2026-03-07T00:00:00.000Z"),
          lastGiftAmount: "1000.00",
          lastGiftAt: new Date("2026-03-07T00:00:00.000Z"),
          lastTwelveMonthsTotal: "1000.00",
          monthlyGiving: monthlyGiving.map((month) => ({
            ...month,
            giftCount: month.month === "2026-03" ? 1 : 0,
            totalGiven: month.month === "2026-03" ? "1000.00" : "0.00",
          })),
          monthsWithGiving: 1,
          reliabilityKinds: ["ONE_OFF"],
          sourceExplanation:
            "Derived from local GivingFact rows synced from Rock.",
          totalGiven: "1000.00",
        },
      ],
      firstGiftAt: new Date("2022-01-12T00:00:00.000Z"),
      lastGiftAmount: "250.00",
      lastGiftAt: new Date("2026-04-07T00:00:00.000Z"),
      lastTwelveMonthsTotal: "3000.00",
      monthlyGiving,
      monthsWithGiving: 38,
      reliabilityKinds: ["ONE_OFF"],
      source: "PERSON",
      sourceExplanation: "Derived from local GivingFact rows synced from Rock.",
      totalGiven: "12450.00",
    },
    pledgeEditor: {
      personRockId: 910001,
      rows: [
        {
          account: {
            active: true,
            name: "General Fund",
            rockId: 101,
          },
          activePledge: null,
          basisMonths: 9,
          confidence: "MEDIUM",
          draftPledge: null,
          explanation:
            "9 of the latest 12 months include giving to this fund, so a monthly pledge recommendation can be reviewed.",
          lastGiftAt: new Date("2026-04-07T00:00:00.000Z"),
          lastTwelveMonthsTotal: "3000.00",
          recommendedAmount: "250.00",
          recommendedPeriod: "MONTHLY",
          sourceExplanation:
            "Derived from local GivingFact rows synced from Rock. This is a review recommendation, not donor-submitted intent or payment setup.",
          status: "RECOMMENDED",
        },
        {
          account: {
            active: true,
            name: "Missions",
            rockId: 102,
          },
          activePledge: null,
          basisMonths: 1,
          confidence: null,
          draftPledge: {
            accountName: "Missions",
            accountRockId: 102,
            amount: "100.00",
            createdAt: new Date("2026-04-18T10:00:00.000Z"),
            endDate: null,
            id: "pledge_1",
            period: "MONTHLY",
            personRockId: 910001,
            source: "PATTERN_RECOMMENDED",
            startDate: new Date("2026-04-18T10:00:00.000Z"),
            status: "DRAFT",
            updatedAt: new Date("2026-04-18T10:00:00.000Z"),
          },
          explanation:
            "A draft pledge already exists for this person and fund.",
          lastGiftAt: new Date("2026-03-07T00:00:00.000Z"),
          lastTwelveMonthsTotal: "1000.00",
          recommendedAmount: null,
          recommendedPeriod: null,
          sourceExplanation:
            "Derived from local GivingFact rows synced from Rock. This is a review recommendation, not donor-submitted intent or payment setup.",
          status: "DRAFT_EXISTS",
        },
      ],
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
    lifecycle: [
      {
        lifecycle: "REACTIVATED",
        summary: "Giving activity resumed after a dormant period.",
      },
    ],
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
    expect(screen.getAllByText("$3,000.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Current 12 months")).toBeInTheDocument();
    expect(screen.getByLabelText("Account")).toHaveValue("all");
    expect(screen.getByText("Rock sync")).toBeInTheDocument();
    expect(screen.getByText("Connection status")).toBeInTheDocument();
    expect(screen.getByText("Member")).toBeInTheDocument();
    expect(screen.getByText("Lifecycle status")).toBeInTheDocument();
    expect(screen.getByText("Reactivated")).toHaveAttribute(
      "title",
      "Giving activity resumed after a dormant period.",
    );
    expect(screen.getByText("Pledges")).toBeInTheDocument();
    expect(screen.getByText("Quick create")).toBeInTheDocument();
    expect(screen.getByText("Create draft")).toBeInTheDocument();
    expect(screen.getByText("Reject")).toBeInTheDocument();
    expect(screen.getByText("Draft pledge")).toBeInTheDocument();
    expect(
      screen.getByText(/\$3,000\.00 given in the last 12 months/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Household" })).toHaveAttribute(
      "href",
      "/households/920001?person=910001",
    );
    expect(screen.queryByText("Giving amounts hidden")).not.toBeInTheDocument();
  });

  it("filters giving summary by account from the section header", () => {
    render(<PersonProfile profile={personProfile()} />);

    fireEvent.change(screen.getByLabelText("Account"), {
      target: { value: "102" },
    });

    expect(screen.getByLabelText("Account")).toHaveValue("102");
    expect(screen.getAllByText("$1,000.00").length).toBeGreaterThan(0);
  });

  it("renders an explicit hidden-amount state", () => {
    render(
      <PersonProfile
        profile={personProfile({ amountsHidden: true, givingSummary: null })}
      />,
    );

    expect(screen.getByText("Giving amounts hidden")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Giving amounts and pledge recommendations are hidden for this role.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("$3,000.00")).not.toBeInTheDocument();
  });

  it("uses person-specific empty giving copy", () => {
    render(
      <PersonProfile
        profile={personProfile({ amountsHidden: false, givingSummary: null })}
      />,
    );

    expect(
      screen.getByText("No gifts are linked to this person."),
    ).toBeInTheDocument();
  });

  it("indicates when the giving summary is household-sourced", () => {
    render(
      <PersonProfile
        profile={personProfile({
          givingSummary: {
            ...personProfile().givingSummary!,
            source: "HOUSEHOLD",
          },
        })}
      />,
    );

    expect(
      screen.getByText(
        "Showing giving from this person's assigned giving household.",
      ),
    ).toBeInTheDocument();
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
