import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";
import type { HouseholdDonorTrend } from "@/lib/giving/metrics";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  householdDonorTrend: {
    atRiskHouseholdDonors: 6,
    campusSeries: [
      {
        atRiskHouseholdDonors: 2,
        campusName: "Central",
        campusRockId: 1,
        campusShortCode: "CEN",
        months: Array.from({ length: 24 }, (_, index) => {
          const month = new Date(Date.UTC(2024, 4 + index, 1))
            .toISOString()
            .slice(0, 7);

          return {
            householdDonorCount: index === 23 ? 32 : Math.max(0, index - 2),
            month,
          };
        }),
        totalHouseholdDonors: 62,
      },
      {
        atRiskHouseholdDonors: 4,
        campusName: "North",
        campusRockId: 2,
        campusShortCode: "NTH",
        months: Array.from({ length: 24 }, (_, index) => {
          const month = new Date(Date.UTC(2024, 4 + index, 1))
            .toISOString()
            .slice(0, 7);

          return {
            householdDonorCount: index === 23 ? 10 : Math.max(0, index - 10),
            month,
          };
        }),
        totalHouseholdDonors: 26,
      },
    ],
    movement: {
      campusSummaries: [
        {
          campusName: "Central",
          campusRockId: 1,
          campusShortCode: "CEN",
          counts: {
            DROPPED: 2,
            NEW: 3,
            REACTIVATED: 1,
            RETAINED: 26,
          },
        },
        {
          campusName: "North",
          campusRockId: 2,
          campusShortCode: "NTH",
          counts: {
            DROPPED: 4,
            NEW: 1,
            REACTIVATED: 0,
            RETAINED: 9,
          },
        },
      ],
      counts: {
        DROPPED: 6,
        NEW: 4,
        REACTIVATED: 1,
        RETAINED: 35,
      },
      households: [
        {
          campusName: "North",
          campusRockId: 2,
          campusShortCode: "NTH",
          householdName: "Ng Household",
          householdRockId: 220,
          lastActiveMonth: "2026-03",
          movementKind: "DROPPED",
        },
        {
          campusName: "Central",
          campusRockId: 1,
          campusShortCode: "CEN",
          householdName: "Tan Household",
          householdRockId: 120,
          lastActiveMonth: "2025-11",
          movementKind: "REACTIVATED",
        },
        {
          campusName: "Central",
          campusRockId: 1,
          campusShortCode: "CEN",
          householdName: "Rivera Household",
          householdRockId: 121,
          lastActiveMonth: null,
          movementKind: "NEW",
        },
      ],
      latestMonth: "2026-04",
      previousMonth: "2026-03",
      sourceExplanation:
        "Compares distinct household donors in the latest completed month with the prior completed month.",
    },
    months: Array.from({ length: 24 }, (_, index) => {
      const month = new Date(Date.UTC(2024, 4 + index, 1))
        .toISOString()
        .slice(0, 7);

      return {
        householdDonorCount: index === 23 ? 42 : index,
        month,
      };
    }),
    sourceExplanation:
      "Each household is counted once per month, grouped by campus.",
    totalHouseholdDonors: 88,
  } satisfies HouseholdDonorTrend,
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/auth0", () => ({
  auth0: {
    getSession: vi.fn(async () => null),
  },
}));

vi.mock("@/lib/auth/access-control", () => ({
  getCurrentAccessState: vi.fn(async () => mocks.accessState),
}));

vi.mock("@/lib/giving/metrics", () => ({
  getHouseholdDonorTrend: vi.fn(async () => mocks.householdDonorTrend),
}));

import HomePage from "@/app/page";

describe("HomePage", () => {
  beforeEach(() => {
    mocks.accessState = { status: "anonymous" };
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("redirects anonymous users to the Auth0 login handler", async () => {
    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT:/auth/login");
  });

  it("renders the access request entry point for authenticated users without a local profile", async () => {
    mocks.accessState = {
      status: "needs_access",
      identity: {
        sub: "auth0|pending",
        email: "pending@example.com",
        name: "Pending User",
        picture: null,
      },
    };

    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        name: "You need administrator approval to continue.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Request access" }),
    ).toHaveAttribute("href", "/access-request");
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
  });

  it("renders the staff dashboard for authorized local users", async () => {
    mocks.accessState = {
      status: "authorized",
      user: {
        id: "user_1",
        auth0Subject: "auth0|admin",
        email: "admin@example.com",
        name: "Admin",
        role: "ADMIN",
        active: true,
        rockPersonId: null,
      },
    };

    render(await HomePage());

    expect(
      screen.queryByRole("heading", { name: "Household donor movement." }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /A 24-month view of distinct household donors from synced Rock giving facts/i,
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "People" })).toHaveAttribute(
      "href",
      "/people",
    );
    expect(screen.getByRole("link", { name: "Households" })).toHaveAttribute(
      "href",
      "/households",
    );
    expect(screen.getByRole("link", { name: "Sync" })).toHaveAttribute(
      "href",
      "/sync",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings/funds",
    );
    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/households gave in .+ households are at risk/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
    expect(screen.queryByText("Household donor trend")).not.toBeInTheDocument();
    expect(screen.getByText("Household donors by campus")).toBeInTheDocument();
    expect(screen.getByText("Household movement")).toBeInTheDocument();
    expect(screen.queryByText("Campus movement")).not.toBeInTheDocument();
    expect(screen.queryByText("Drop-off analysis")).not.toBeInTheDocument();
    expect(screen.queryByText("Last 24 months")).not.toBeInTheDocument();
    expect(screen.queryByText("Household drill-down")).not.toBeInTheDocument();
    expect(screen.queryByText("Dropped households")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Reactivated households"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("New households")).not.toBeInTheDocument();
    expect(screen.getAllByText("Dropped").length).toBeGreaterThan(0);
    expect(screen.getAllByText("At-risk").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Reactivated").length).toBeGreaterThan(0);
    expect(screen.queryByText("Retained")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ng Household/i })).toBeNull();
    expect(
      screen.getByRole("img", {
        name: "Stacked line chart of household donors by campus for the last 24 months",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Central").length).toBeGreaterThan(0);
    expect(screen.getAllByText("North").length).toBeGreaterThan(0);
    expect(screen.getByText("Current households")).toBeInTheDocument();
    expect(screen.queryByText("Last complete month")).not.toBeInTheDocument();
    expect(screen.queryByText("Active months")).not.toBeInTheDocument();
    expect(screen.getByText("At-risk households")).toBeInTheDocument();
    expect(screen.getAllByText("At risk").length).toBeGreaterThan(0);
    expect(screen.getByText("Role: ADMIN")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Request access" }),
    ).not.toBeInTheDocument();
  });
});
