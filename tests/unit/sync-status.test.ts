import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { getSyncStatusSummary } from "@/lib/sync/status";

describe("getSyncStatusSummary", () => {
  it("returns latest run, recent runs, open issues, and synced counts", async () => {
    const recentRuns = [
      {
        id: "sync_2",
        source: "rock:v1",
        status: "SUCCEEDED",
        startedAt: new Date("2026-04-17T01:00:00.000Z"),
        completedAt: new Date("2026-04-17T01:01:00.000Z"),
        recordsRead: 180_509,
        recordsWritten: 245_395,
        recordsSkipped: 1,
      },
      {
        id: "sync_1",
        source: "rock:v1",
        status: "PARTIAL",
        startedAt: new Date("2026-04-17T00:00:00.000Z"),
        completedAt: new Date("2026-04-17T00:01:00.000Z"),
        recordsRead: 180_000,
        recordsWritten: 244_000,
        recordsSkipped: 2,
      },
    ];
    const openIssues = [
      {
        id: "issue_1",
        severity: "WARNING",
        source: "rock:v1",
        recordType: "FinancialTransaction",
        rockId: "123",
        code: "MISSING_REFERENCE",
        message: "A synced record references a missing Rock row.",
        createdAt: new Date("2026-04-17T01:02:00.000Z"),
      },
    ];
    const client = {
      syncRun: {
        findMany: vi.fn(async () => recentRuns),
      },
      syncIssue: {
        count: vi.fn(async () => 1),
        findMany: vi.fn(async () => openIssues),
      },
      rockPerson: { count: vi.fn(async () => 10) },
      rockHousehold: { count: vi.fn(async () => 2) },
      rockHouseholdMember: { count: vi.fn(async () => 11) },
      rockGroup: { count: vi.fn(async () => 3) },
      rockGroupMember: { count: vi.fn(async () => 4) },
      rockFinancialTransaction: { count: vi.fn(async () => 5) },
      rockFinancialTransactionDetail: { count: vi.fn(async () => 6) },
      givingFact: { count: vi.fn(async () => 7) },
    } as unknown as PrismaClient;

    const summary = await getSyncStatusSummary(client);

    expect(summary.latestRun).toBe(recentRuns[0]);
    expect(summary.recentRuns).toEqual(recentRuns);
    expect(summary.openIssues).toEqual(openIssues);
    expect(summary.openIssueCount).toBe(1);
    expect(summary.syncedCounts).toEqual({
      people: 10,
      households: 2,
      householdMembers: 11,
      connectGroups: 3,
      connectGroupMembers: 4,
      financialTransactions: 5,
      financialTransactionDetails: 6,
      givingFacts: 7,
    });
  });
});
