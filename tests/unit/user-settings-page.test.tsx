import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";
import type { UserManagementSummary } from "@/lib/settings/users";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  redirect: vi.fn(),
  summary: {
    accessRequests: [
      {
        auth0Subject: "auth0|pending",
        createdAt: new Date("2026-04-23T00:00:00.000Z"),
        email: "pending@example.com",
        id: "request_1",
        name: "Pending User",
        status: "PENDING",
        updatedAt: new Date("2026-04-23T00:00:00.000Z"),
      },
    ],
    activeUserCount: 1,
    pendingRequestCount: 1,
    users: [
      {
        active: true,
        auth0Subject: "auth0|admin",
        createdAt: new Date("2026-04-20T00:00:00.000Z"),
        email: "admin@example.com",
        id: "user_1",
        linkedPerson: null,
        name: "Admin User",
        rockPersonId: "8597",
        role: "ADMIN",
        updatedAt: new Date("2026-04-22T00:00:00.000Z"),
      },
    ],
  } satisfies UserManagementSummary,
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

vi.mock("@/lib/settings/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/settings/users")>();

  return {
    ...actual,
    listUserManagementSummary: vi.fn(async () => mocks.summary),
  };
});

vi.mock("@/components/ui/query-result-toast", () => ({
  QueryResultToast: () => null,
}));

vi.mock("@/components/navigation/app-top-nav", () => ({
  AppTopNav: () => (
    <nav aria-label="Primary">
      <button type="button">Settings</button>
      <a href="/settings/funds">Funds</a>
      <a href="/settings/jobs">Jobs</a>
      <a href="/settings/users">Users</a>
      <a href="/sync">Sync status</a>
    </nav>
  ),
}));

import UserSettingsPage from "@/app/settings/users/page";

describe("UserSettingsPage", () => {
  beforeEach(() => {
    mocks.accessState = { status: "anonymous" };
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("redirects anonymous users to login", async () => {
    await expect(
      UserSettingsPage({ searchParams: Promise.resolve({}) }),
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

    render(await UserSettingsPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", {
        name: "Settings require administrator access.",
      }),
    ).toBeInTheDocument();
  });

  it("renders local users and access requests for Admin users", async () => {
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

    render(await UserSettingsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByText("Pending User")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deny" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("link", { name: "Funds" })).toHaveAttribute(
      "href",
      "/settings/funds",
    );
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
      "href",
      "/settings/users",
    );
    expect(screen.getByRole("link", { name: "Sync status" })).toHaveAttribute(
      "href",
      "/sync",
    );
  });
});
