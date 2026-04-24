import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";
import type { JobsDashboardSummary } from "@/lib/settings/jobs";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  redirect: vi.fn(),
  summary: {
    degraded: null,
    derivedRefreshes: [],
    fetchedAt: new Date("2026-04-23T12:00:00.000Z"),
    queues: [],
    recentEvents: [],
    runningJobs: [],
    schedules: [],
    syncRuns: [],
  } satisfies JobsDashboardSummary,
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

vi.mock("@/lib/settings/jobs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/settings/jobs")>();

  return {
    ...actual,
    listJobsDashboardSummary: vi.fn(async () => mocks.summary),
  };
});

vi.mock("@/components/settings/jobs-dashboard", () => ({
  JobsDashboard: () => <h1>Jobs</h1>,
}));

import JobsSettingsPage from "@/app/settings/jobs/page";

describe("JobsSettingsPage", () => {
  beforeEach(() => {
    mocks.accessState = { status: "anonymous" };
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("redirects anonymous users to login", async () => {
    await expect(
      JobsSettingsPage({ searchParams: Promise.resolve({}) }),
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

    render(await JobsSettingsPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", {
        name: "Settings require administrator access.",
      }),
    ).toBeInTheDocument();
  });

  it("renders jobs settings surface for admins", async () => {
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

    render(await JobsSettingsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Jobs" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("link", { name: "Funds" })).toHaveAttribute(
      "href",
      "/settings/funds",
    );
    expect(screen.getByRole("link", { name: "Jobs" })).toHaveAttribute(
      "href",
      "/settings/jobs",
    );
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
      "href",
      "/settings/users",
    );
  });
});
