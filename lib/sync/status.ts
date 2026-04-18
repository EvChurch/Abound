import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type SyncStatusSummary = {
  latestRun: SyncRunSummary | null;
  recentRuns: SyncRunSummary[];
  openIssues: SyncIssueSummary[];
  openIssueCount: number;
  syncedCounts: {
    people: number;
    households: number;
    householdMembers: number;
    connectGroups: number;
    connectGroupMembers: number;
    financialTransactions: number;
    financialTransactionDetails: number;
    givingFacts: number;
  };
};

export type SyncRunSummary = {
  id: string;
  source: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  recordsRead: number;
  recordsWritten: number;
  recordsSkipped: number;
};

export type SyncIssueSummary = {
  id: string;
  severity: string;
  source: string;
  recordType: string | null;
  rockId: string | null;
  code: string;
  message: string;
  createdAt: Date;
};

export async function getSyncStatusSummary(
  client: PrismaClient = prisma,
): Promise<SyncStatusSummary> {
  const [
    recentRuns,
    openIssueCount,
    openIssues,
    people,
    households,
    householdMembers,
    connectGroups,
    connectGroupMembers,
    financialTransactions,
    financialTransactionDetails,
    givingFacts,
  ] = await Promise.all([
    client.syncRun.findMany({
      orderBy: {
        startedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        source: true,
        status: true,
        startedAt: true,
        completedAt: true,
        recordsRead: true,
        recordsWritten: true,
        recordsSkipped: true,
      },
    }),
    client.syncIssue.count({
      where: {
        status: "OPEN",
      },
    }),
    client.syncIssue.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
      where: {
        status: "OPEN",
      },
      select: {
        id: true,
        severity: true,
        source: true,
        recordType: true,
        rockId: true,
        code: true,
        message: true,
        createdAt: true,
      },
    }),
    client.rockPerson.count(),
    client.rockHousehold.count(),
    client.rockHouseholdMember.count(),
    client.rockGroup.count({
      where: {
        groupTypeRockId: 25,
      },
    }),
    client.rockGroupMember.count({
      where: {
        activeConnectGroup: true,
      },
    }),
    client.rockFinancialTransaction.count(),
    client.rockFinancialTransactionDetail.count(),
    client.givingFact.count(),
  ]);

  return {
    latestRun: recentRuns[0] ?? null,
    recentRuns,
    openIssues,
    openIssueCount,
    syncedCounts: {
      people,
      households,
      householdMembers,
      connectGroups,
      connectGroupMembers,
      financialTransactions,
      financialTransactionDetails,
      givingFacts,
    },
  };
}
