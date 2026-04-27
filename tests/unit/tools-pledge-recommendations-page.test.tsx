import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";
import type { PledgeCandidate } from "@/lib/giving/pledges";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  candidates: [] as PledgeCandidate[],
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

vi.mock("@/lib/giving/pledges", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/giving/pledges")>();

  return {
    ...actual,
    listPledgeCandidates: vi.fn(async () => mocks.candidates),
  };
});

vi.mock("@/components/navigation/app-top-nav", () => ({
  AppTopNav: () => <nav aria-label="Primary">Top nav</nav>,
}));

import PledgeRecommendationsPage from "@/app/tools/pledge-recommendations/page";

describe("PledgeRecommendationsPage", () => {
  beforeEach(() => {
    mocks.accessState = { status: "anonymous" };
    mocks.candidates = [];
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("redirects anonymous users to login", async () => {
    await expect(
      PledgeRecommendationsPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_REDIRECT:/auth/login");
  });

  it("renders unauthorized messaging when user lacks pledge permissions", async () => {
    mocks.accessState = {
      status: "authorized",
      user: {
        active: true,
        auth0Subject: "auth0|care",
        email: "care@example.com",
        id: "user_3",
        name: "Care",
        rockPersonId: null,
        role: "PASTORAL_CARE",
      },
    };

    render(
      await PledgeRecommendationsPage({ searchParams: Promise.resolve({}) }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Pledge recommendations require finance or administrator access.",
      }),
    ).toBeInTheDocument();
  });

  it("renders the tools queue page for finance users", async () => {
    mocks.accessState = {
      status: "authorized",
      user: {
        active: true,
        auth0Subject: "auth0|finance",
        email: "finance@example.com",
        id: "user_2",
        name: "Finance",
        rockPersonId: null,
        role: "FINANCE",
      },
    };
    mocks.candidates = [
      {
        account: { active: true, name: "General Fund", rockId: 1 },
        activePledge: null,
        basisMonths: 10,
        confidence: "HIGH",
        draftPledge: null,
        explanation: "Review recommendation.",
        givingTrendLast24Months: [
          { month: "2024-05", total: "0.00" },
          { month: "2024-06", total: "50.00" },
        ],
        lastGiftAt: new Date("2026-04-01T00:00:00.000Z"),
        lastTwelveMonthsTotal: "1200.00",
        personDisplayName: "Jordan Lee",
        personRockId: 8597,
        recommendedAmount: "100.00",
        recommendedMatchStreakCount: 6,
        recommendedMatchStreakStartedAt: new Date("2025-11-01T00:00:00.000Z"),
        recommendedPeriod: "MONTHLY",
        sourceExplanation: "Derived from giving facts.",
        status: "RECOMMENDED",
      },
    ];

    render(
      await PledgeRecommendationsPage({ searchParams: Promise.resolve({}) }),
    );

    expect(
      screen.getByRole("heading", { name: "Pledge Recommendations" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Jordan Lee" })).toHaveAttribute(
      "href",
      "/people/8597",
    );
    expect(screen.getByText("Top nav")).toBeInTheDocument();
  });
});
