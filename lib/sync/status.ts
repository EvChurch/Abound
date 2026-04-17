import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type SyncStatusSummary = {
  latestRun: {
    id: string;
    source: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    recordsRead: number;
    recordsWritten: number;
    recordsSkipped: number;
  } | null;
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

export async function getSyncStatusSummary(
  client: PrismaClient = prisma,
): Promise<SyncStatusSummary> {
  const [
    latestRun,
    openIssueCount,
    people,
    households,
    householdMembers,
    connectGroups,
    connectGroupMembers,
    financialTransactions,
    financialTransactionDetails,
    givingFacts,
  ] = await Promise.all([
    client.syncRun.findFirst({
      orderBy: {
        startedAt: "desc",
      },
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
    latestRun,
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
