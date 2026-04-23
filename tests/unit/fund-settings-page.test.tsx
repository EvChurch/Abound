import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";
import type { PlatformFundSettingsSummary } from "@/lib/settings/funds";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  redirect: vi.fn(),
  summary: {
    configured: true,
    enabledCount: 1,
    funds: [
      {
        accountRockId: 101,
        active: true,
        campusName: "Central",
        enabled: true,
        factCount: 12,
        lastGiftAt: new Date("2026-04-01T00:00:00.000Z"),
        name: "General Fund",
        notes: null,
        public: true,
        taxDeductible: true,
        updatedAt: null,
        updatedByName: null,
      },
      {
        accountRockId: 202,
        active: true,
        campusName: null,
        enabled: false,
        factCount: 4,
        lastGiftAt: null,
        name: "Missions",
        notes: null,
        public: false,
        taxDeductible: true,
        updatedAt: null,
        updatedByName: null,
      },
    ],
    latestRefresh: null,
    totalCount: 2,
  } satisfies PlatformFundSettingsSummary,
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

vi.mock("@/lib/settings/funds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/settings/funds")>();

  return {
    ...actual,
    listPlatformFundSettings: vi.fn(async () => mocks.summary),
  };
});

import FundSettingsPage from "@/app/settings/funds/page";

describe("FundSettingsPage", () => {
  beforeEach(() => {
    mocks.accessState = { status: "anonymous" };
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("redirects anonymous users to login", async () => {
    await expect(
      FundSettingsPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_REDIRECT:/auth/login");
  });

  it("blocks non-Admin users", async () => {
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

    render(await FundSettingsPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", {
        name: "Settings require administrator access.",
      }),
    ).toBeInTheDocument();
  });

  it("renders fund settings for Admin users", async () => {
    mocks.accessState = {
      status: "authorized",
      user: {
        active: true,
        auth0Subject: "auth0|admin",
        email: "admin@example.com",
        id: "user_1",
        name: "Admin",
        rockPersonId: null,
        role: "ADMIN",
      },
    };

    render(await FundSettingsPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { name: "Platform funds" }),
    ).toBeInTheDocument();
    expect(screen.getByText("General Fund")).toBeInTheDocument();
    expect(screen.getByText("Missions")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings/funds",
    );
  });
});
