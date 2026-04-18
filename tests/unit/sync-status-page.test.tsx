import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";
import type { SyncStatusSummary } from "@/lib/sync/status";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  redirect: vi.fn(),
  summary: {
    latestRun: {
      id: "sync_1",
      source: "rock:v1",
      status: "SUCCEEDED",
      startedAt: new Date("2026-04-17T00:00:00.000Z"),
      completedAt: new Date("2026-04-17T00:01:00.000Z"),
      recordsRead: 55,
      recordsWritten: 75,
      recordsSkipped: 0,
    },
    recentRuns: [
      {
        id: "sync_1",
        source: "rock:v1",
        status: "SUCCEEDED",
        startedAt: new Date("2026-04-17T00:00:00.000Z"),
        completedAt: new Date("2026-04-17T00:01:00.000Z"),
        recordsRead: 55,
        recordsWritten: 75,
        recordsSkipped: 0,
      },
      {
        id: "sync_0",
        source: "rock:v1",
        status: "PARTIAL",
        startedAt: new Date("2026-04-16T23:00:00.000Z"),
        completedAt: new Date("2026-04-16T23:01:00.000Z"),
        recordsRead: 54,
        recordsWritten: 74,
        recordsSkipped: 1,
      },
    ],
    openIssues: [
      {
        id: "issue_1",
        severity: "WARNING",
        source: "rock:v1",
        recordType: "FinancialTransaction",
        rockId: "123",
        code: "MISSING_REFERENCE",
        message: "A synced record references a missing Rock row.",
        createdAt: new Date("2026-04-17T00:02:00.000Z"),
      },
    ],
    openIssueCount: 1,
    syncedCounts: {
      people: 6,
      households: 2,
      householdMembers: 6,
      connectGroups: 2,
      connectGroupMembers: 2,
      financialTransactions: 21,
      financialTransactionDetails: 22,
      givingFacts: 23,
    },
  } satisfies SyncStatusSummary,
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

vi.mock("@/lib/sync/status", () => ({
  getSyncStatusSummary: vi.fn(async () => mocks.summary),
}));

import SyncPage from "@/app/sync/page";

describe("SyncPage", () => {
  beforeEach(() => {
    mocks.accessState = { status: "anonymous" };
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("redirects anonymous users to login", async () => {
    await expect(SyncPage()).rejects.toThrow("NEXT_REDIRECT:/auth/login");
  });

  it("redirects authenticated users without local access", async () => {
    mocks.accessState = {
      status: "needs_access",
      identity: {
        sub: "auth0|pending",
        email: "pending@example.com",
        name: "Pending User",
        picture: null,
      },
    };

    await expect(SyncPage()).rejects.toThrow("NEXT_REDIRECT:/access-request");
  });

  it("renders sync status for authorized staff without donor details", async () => {
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

    render(await SyncPage());

    expect(
      screen.getByRole("heading", { name: "Rock data import health." }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Healthy").length).toBeGreaterThan(0);
    expect(screen.getByText("Records read")).toBeInTheDocument();
    expect(screen.getByText("Recent runs")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Open issues" }),
    ).toBeInTheDocument();
    expect(screen.getByText("MISSING_REFERENCE")).toBeInTheDocument();
    expect(screen.getByText("Runner recommendation")).toBeInTheDocument();
    expect(screen.queryByText(/donor@example/i)).not.toBeInTheDocument();
  });
});
