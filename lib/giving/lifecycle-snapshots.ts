import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  classifyGivingLifecycle,
  type GivingLifecycleActivePledge,
  lifecycleExplanationForRole,
  type GivingLifecycleFact,
} from "@/lib/giving/lifecycle";
import {
  getPlatformFundScope,
  whereForEnabledPlatformFunds,
} from "@/lib/settings/funds";

type LifecycleSnapshotClient = Pick<
  PrismaClient,
  | "$transaction"
  | "givingFact"
  | "givingLifecycleSnapshot"
  | "platformFundSetting"
> &
  Partial<Pick<PrismaClient, "givingPledge">>;

export type RefreshLifecycleSnapshotsInput = {
  referenceDate?: Date;
  syncRunId: string;
};

type GivingFactForSnapshot = GivingLifecycleFact & {
  householdRockId: number | null;
  personRockId: number | null;
};

type GivingPledgeForSnapshot = GivingLifecycleActivePledge & {
  personRockId: number;
};

export async function refreshGivingLifecycleSnapshots(
  input: RefreshLifecycleSnapshotsInput,
  client: LifecycleSnapshotClient = prisma,
) {
  if (!canRefreshSnapshots(client)) {
    return emptyRefreshResult();
  }

  const referenceDate = input.referenceDate ?? new Date();
  const fundScope = await getPlatformFundScope(client);
  const [facts, activePledges] = await Promise.all([
    client.givingFact.findMany({
      orderBy: [
        { occurredAt: "asc" },
        { effectiveMonth: "asc" },
        { id: "asc" },
      ],
      select: {
        amount: true,
        effectiveMonth: true,
        householdRockId: true,
        occurredAt: true,
        personRockId: true,
        reliabilityKind: true,
      },
      where: whereForEnabledPlatformFunds(fundScope),
    }),
    client.givingPledge
      ? client.givingPledge.findMany({
          select: {
            amount: true,
            period: true,
            personRockId: true,
          },
          where: {
            accountRockId: {
              in: fundScope.enabledAccountRockIds,
            },
            status: "ACTIVE",
          },
        })
      : [],
  ]);
  const activePledgesByPerson = groupActivePledges(activePledges);
  const personRows = buildSnapshotRows({
    activePledgesByRockId: activePledgesByPerson,
    factsByRockId: groupFacts(facts, "personRockId"),
    referenceDate,
    resource: "PERSON",
    syncRunId: input.syncRunId,
  });
  const householdRows = buildSnapshotRows({
    activePledgesByRockId: new Map(),
    factsByRockId: groupFacts(facts, "householdRockId"),
    referenceDate,
    resource: "HOUSEHOLD",
    syncRunId: input.syncRunId,
  });
  const rows = [...personRows, ...householdRows];

  try {
    await client.$transaction(async (tx) => {
      await tx.givingLifecycleSnapshot.deleteMany({});

      if (rows.length > 0) {
        await tx.givingLifecycleSnapshot.createMany({
          data: rows,
        });
      }
    });
  } catch (error) {
    if (isMissingLifecycleSnapshotTable(error)) {
      return emptyRefreshResult();
    }

    throw error;
  }

  return {
    householdSnapshots: householdRows.length,
    personSnapshots: personRows.length,
    totalSnapshots: rows.length,
  };
}

function canRefreshSnapshots(client: LifecycleSnapshotClient) {
  return Boolean(
    client.givingFact &&
    client.givingLifecycleSnapshot &&
    typeof client.$transaction === "function",
  );
}

function emptyRefreshResult() {
  return {
    householdSnapshots: 0,
    personSnapshots: 0,
    totalSnapshots: 0,
  };
}

function isMissingLifecycleSnapshotTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2021"
  );
}

function groupFacts(
  facts: GivingFactForSnapshot[],
  key: "householdRockId" | "personRockId",
) {
  const grouped = new Map<number, GivingFactForSnapshot[]>();

  for (const fact of facts) {
    const rockId = fact[key];

    if (!rockId) {
      continue;
    }

    const group = grouped.get(rockId) ?? [];
    group.push(fact);
    grouped.set(rockId, group);
  }

  return grouped;
}

function groupActivePledges(pledges: GivingPledgeForSnapshot[]) {
  const grouped = new Map<number, GivingLifecycleActivePledge[]>();

  for (const pledge of pledges) {
    const group = grouped.get(pledge.personRockId) ?? [];
    group.push({
      amount: pledge.amount,
      period: pledge.period,
    });
    grouped.set(pledge.personRockId, group);
  }

  return grouped;
}

function buildSnapshotRows({
  activePledgesByRockId,
  factsByRockId,
  referenceDate,
  resource,
  syncRunId,
}: {
  activePledgesByRockId: Map<number, GivingLifecycleActivePledge[]>;
  factsByRockId: Map<number, GivingFactForSnapshot[]>;
  referenceDate: Date;
  resource: "PERSON" | "HOUSEHOLD";
  syncRunId: string;
}): Prisma.GivingLifecycleSnapshotCreateManyInput[] {
  const windowEndedAt = referenceDate;
  const windowStartedAt = new Date(referenceDate);
  windowStartedAt.setUTCDate(windowStartedAt.getUTCDate() - 90);

  return Array.from(factsByRockId.entries()).flatMap(([rockId, facts]) => {
    const result = classifyGivingLifecycle(facts, {
      activePledges: activePledgesByRockId.get(rockId) ?? [],
      referenceDate,
    });

    if (!result.kind || !result.summary) {
      return [];
    }

    return {
      detail: result.financeDetail
        ? {
            currentWindowTotal: result.financeDetail.currentWindowTotal,
            firstGiftAt: result.financeDetail.firstGiftAt.toISOString(),
            lastGiftAt: result.financeDetail.lastGiftAt.toISOString(),
            priorWindowTotal: result.financeDetail.priorWindowTotal,
          }
        : undefined,
      householdRockId: resource === "HOUSEHOLD" ? rockId : null,
      lastSyncRunId: syncRunId,
      lifecycle: result.kind,
      personRockId: resource === "PERSON" ? rockId : null,
      resource,
      summary:
        lifecycleExplanationForRole(result, "PASTORAL_CARE") ?? result.summary,
      windowEndedAt,
      windowStartedAt,
    };
  });
}
