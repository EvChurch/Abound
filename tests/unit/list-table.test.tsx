import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ListTable } from "@/components/list-views/list-table";
import type { HouseholdsConnection } from "@/lib/list-views/households-list";
import type { PeopleConnection } from "@/lib/list-views/people-list";

const givingSummary = {
  accountSummaries: [],
  firstGiftAt: new Date("2025-05-01T00:00:00Z"),
  lastGiftAmount: "120.00",
  lastGiftAt: new Date("2026-04-01T00:00:00Z"),
  lastTwelveMonthsTotal: "600.00",
  monthlyGiving: [
    "0.00",
    "25.00",
    "50.00",
    "25.00",
    "75.00",
    "100.00",
    "80.00",
    "60.00",
    "90.00",
    "110.00",
    "95.00",
    "120.00",
  ].map((totalGiven, index) => ({
    giftCount: totalGiven === "0.00" ? 0 : 1,
    month: new Date(Date.UTC(2025, 4 + index, 1)).toISOString().slice(0, 7),
    previousGiftCount: 0,
    previousMonth: new Date(Date.UTC(2024, 4 + index, 1))
      .toISOString()
      .slice(0, 7),
    previousTotalGiven: "0.00",
    totalGiven,
  })),
  monthsWithGiving: 11,
  reliabilityKinds: ["ONE_OFF"],
  sourceExplanation: "Derived from local GivingFact rows synced from Rock.",
  totalGiven: "600.00",
} satisfies PeopleConnection["edges"][number]["node"]["givingSummary"];

describe("ListTable", () => {
  it("shows Rock person connection status in the name column", () => {
    const connection: PeopleConnection = {
      appliedView: {
        id: null,
        name: "All people",
        pageSize: 50,
      },
      edges: [
        {
          cursor: "person_1",
          node: {
            amountsHidden: false,
            connectionStatus: "Member",
            deceased: false,
            displayName: "Jane Donor",
            email: "jane@example.com",
            emailActive: true,
            givingSummary,
            lastSyncedAt: new Date("2026-04-20T00:00:00Z"),
            lifecycle: [
              {
                lifecycle: "AT_RISK",
                summary: "Giving is down in the latest window.",
                windowEndedAt: new Date("2026-04-20T00:00:00Z"),
              },
            ],
            openTaskCount: 0,
            pledgeSummary: {
              active: [
                {
                  accountName: "General Fund",
                  amount: "100",
                  period: "MONTHLY",
                },
                {
                  accountName: "Missions",
                  amount: "25",
                  period: "WEEKLY",
                },
              ],
              draft: [],
              review: [
                {
                  accountName: "Building Fund",
                  amount: "50",
                  period: "MONTHLY",
                },
              ],
            },
            photoUrl: null,
            primaryCampus: { name: "Central", rockId: 1, shortCode: "CEN" },
            primaryHousehold: null,
            recordStatus: "Active",
            rockId: 101,
          },
        },
      ],
      pageInfo: {
        endCursor: null,
        hasNextPage: false,
      },
    };

    render(<ListTable connection={connection} kind="people" />);

    expect(
      screen.getByText("Central · Member · jane@example.com"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Pledges")).toBeInTheDocument();
    const sparkline = screen.getByRole("img", {
      name: "Giving trend over the last 12 months",
    });

    expect(sparkline).toBeInTheDocument();
    expect(sparkline).toHaveClass("absolute", "inset-0", "text-app-muted");
    const sparklinePaths = sparkline.querySelectorAll("path");

    expect(sparklinePaths).toHaveLength(2);
    expect(sparklinePaths[0]).toHaveAttribute("opacity", "0.08");
    expect(sparklinePaths[1]).toHaveAttribute("opacity", "0.18");
    expect(sparklinePaths[1]).toHaveAttribute("stroke-width", "1.25");
    expect(sparklinePaths[1]).toHaveAttribute(
      "d",
      expect.stringContaining("M 0 32 C"),
    );
    expect(
      sparkline.parentElement?.querySelector('[aria-hidden="true"]'),
    ).toHaveClass("bg-gradient-to-r", "from-app-surface");
    expect(screen.getAllByLabelText("Active pledge")).toHaveLength(2);
    expect(screen.getByText("General Fund $100/mo")).toBeInTheDocument();
    expect(screen.getByText("Missions $25/wk")).toBeInTheDocument();
    expect(screen.getByLabelText("Review pledge")).toBeInTheDocument();
    expect(screen.getByText("Building Fund $50/mo")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.queryByText("Review")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Active General Fund $100/mo")).toBeNull();
    expect(
      screen.getByTitle("General Fund $100/mo (Active)"),
    ).toBeInTheDocument();
    expect(screen.getByText("At risk")).toHaveClass("text-amber-800");
    expect(screen.queryByText("0 tasks")).not.toBeInTheDocument();
    expect(screen.queryByText("AT RISK")).not.toBeInTheDocument();
    expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
    expect(screen.queryByText("Lifecycle")).not.toBeInTheDocument();
    expect(screen.queryByText("None")).not.toBeInTheDocument();
    expect(screen.queryByText("Campus")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("omits empty person secondary details instead of showing placeholders", () => {
    const connection: PeopleConnection = {
      appliedView: {
        id: null,
        name: "All people",
        pageSize: 50,
      },
      edges: [
        {
          cursor: "person_1",
          node: {
            amountsHidden: true,
            connectionStatus: "Prospect",
            deceased: false,
            displayName: "Pat Prospect",
            email: null,
            emailActive: null,
            givingSummary: null,
            lastSyncedAt: new Date("2026-04-20T00:00:00Z"),
            lifecycle: [],
            openTaskCount: 0,
            pledgeSummary: null,
            photoUrl: null,
            primaryCampus: null,
            primaryHousehold: null,
            recordStatus: "Active",
            rockId: 102,
          },
        },
      ],
      pageInfo: {
        endCursor: null,
        hasNextPage: false,
      },
    };

    render(<ListTable connection={connection} kind="people" />);

    expect(screen.getByText("Prospect")).toBeInTheDocument();
    expect(screen.queryByText(/No email/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Prospect ·/)).not.toBeInTheDocument();
    expect(screen.queryByText("0 tasks")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", {
        name: "Giving trend over the last 12 months",
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Lifecycle")).not.toBeInTheDocument();
    expect(screen.queryByText("None")).not.toBeInTheDocument();
  });

  it("omits the current month from the sparkline when current month giving is zero", () => {
    const currentMonthZeroSummary = {
      ...givingSummary!,
      monthlyGiving: givingSummary!.monthlyGiving.map((month, index, months) =>
        index === months.length - 1 ? { ...month, totalGiven: "0.00" } : month,
      ),
    };
    const connection: PeopleConnection = {
      appliedView: {
        id: null,
        name: "All people",
        pageSize: 50,
      },
      edges: [
        {
          cursor: "person_1",
          node: {
            amountsHidden: false,
            connectionStatus: "Member",
            deceased: false,
            displayName: "Jane Donor",
            email: "jane@example.com",
            emailActive: true,
            givingSummary: currentMonthZeroSummary,
            lastSyncedAt: new Date("2026-04-20T00:00:00Z"),
            lifecycle: [],
            openTaskCount: 0,
            pledgeSummary: null,
            photoUrl: null,
            primaryCampus: { name: "Central", rockId: 1, shortCode: "CEN" },
            primaryHousehold: null,
            recordStatus: "Active",
            rockId: 101,
          },
        },
      ],
      pageInfo: {
        endCursor: null,
        hasNextPage: false,
      },
    };

    render(<ListTable connection={connection} kind="people" />);

    const sparkline = screen.getByRole("img", {
      name: "Giving trend over the last 12 months",
    });
    const linePath = sparkline.querySelectorAll("path")[1];

    expect(linePath).toHaveAttribute("d", expect.stringContaining("120 "));
    expect(linePath).not.toHaveAttribute("d", expect.stringMatching(/120 32$/));
    expect(
      sparkline.parentElement?.querySelector('[aria-hidden="true"]'),
    ).toHaveClass("bg-gradient-to-r", "from-app-surface");
  });

  it("shows Rock household archive status in the name column", () => {
    const connection: HouseholdsConnection = {
      appliedView: {
        id: null,
        name: "All households",
        pageSize: 50,
      },
      edges: [
        {
          cursor: "household_1",
          node: {
            active: false,
            amountsHidden: true,
            archived: true,
            campus: null,
            givingSummary: null,
            lastSyncedAt: new Date("2026-04-20T00:00:00Z"),
            lifecycle: [],
            memberCount: 2,
            name: "Donor Household",
            openTaskCount: 0,
            primaryContacts: [],
            rockId: 501,
          },
        },
      ],
      pageInfo: {
        endCursor: null,
        hasNextPage: false,
      },
    };

    render(<ListTable connection={connection} kind="households" />);

    expect(
      screen.getByText("2 members · Archived in Rock"),
    ).toBeInTheDocument();
  });
});
