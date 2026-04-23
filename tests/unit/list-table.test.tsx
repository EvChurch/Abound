import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ListTable } from "@/components/list-views/list-table";
import type { HouseholdsConnection } from "@/lib/list-views/households-list";
import type { PeopleConnection } from "@/lib/list-views/people-list";

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
            givingSummary: null,
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
    expect(screen.getByText("AT RISK")).toBeInTheDocument();
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
    expect(screen.queryByText("Lifecycle")).not.toBeInTheDocument();
    expect(screen.queryByText("None")).not.toBeInTheDocument();
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
