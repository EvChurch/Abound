import type { PrismaClient } from "@prisma/client";

import {
  classifyGivingLifecycle,
  GIVING_LIFECYCLE_KINDS,
  type GivingLifecycleFact,
  type GivingLifecycleKind,
} from "@/lib/giving/lifecycle";
import type {
  FilterCondition,
  FilterNode,
} from "@/lib/list-views/filter-schema";
import {
  getPlatformFundScope,
  whereForEnabledPlatformFunds,
} from "@/lib/settings/funds";

type LifecycleSnapshotDelegate = PrismaClient["givingLifecycleSnapshot"];
type GivingFactDelegate = PrismaClient["givingFact"];
type LifecycleFilterKind = GivingLifecycleKind | "HEALTHY";

export type LifecycleFilterResource = "PERSON" | "HOUSEHOLD";

export type LifecycleFilterClient = {
  givingFact: GivingFactDelegate;
  givingLifecycleSnapshot?: LifecycleSnapshotDelegate;
  platformFundSetting?: PrismaClient["platformFundSetting"];
};

export async function resolveLifecycleFilteredRockIds(
  filter: FilterNode,
  resource: LifecycleFilterResource,
  client: LifecycleFilterClient,
) {
  const lifecycles = lifecycleValuesFromFilter(filter);

  if (lifecycles.length === 0) {
    return null;
  }

  const snapshotIds = await resolveSnapshotLifecycleIds(
    lifecycles,
    resource,
    client,
  );

  if (snapshotIds) {
    return snapshotIds;
  }

  return resolveFactLifecycleIds(
    lifecycles,
    resource,
    client.givingFact,
    client,
  );
}

function lifecycleValuesFromFilter(node: FilterNode): LifecycleFilterKind[] {
  if (node.type === "group") {
    return uniqueLifecycleValues(
      node.conditions.flatMap((condition) =>
        lifecycleValuesFromFilter(condition),
      ),
    );
  }

  if (node.field !== "lifecycle") {
    return [];
  }

  return valuesFromCondition(node)
    .map((value) => normalizeLifecycle(value))
    .filter((value): value is LifecycleFilterKind => Boolean(value));
}

function valuesFromCondition(condition: FilterCondition) {
  if (condition.operator === "IN" && Array.isArray(condition.value)) {
    return condition.value;
  }

  return [condition.value];
}

function normalizeLifecycle(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (normalized === "HEALTHY") {
    return normalized;
  }

  return GIVING_LIFECYCLE_KINDS.find((kind) => kind === normalized) ?? null;
}

async function resolveSnapshotLifecycleIds(
  lifecycles: LifecycleFilterKind[],
  resource: LifecycleFilterResource,
  client: LifecycleFilterClient,
) {
  if (!client.givingLifecycleSnapshot) {
    return null;
  }

  try {
    const storedLifecycles = lifecycles.filter(
      (lifecycle): lifecycle is GivingLifecycleKind => lifecycle !== "HEALTHY",
    );
    const matchingIds =
      storedLifecycles.length > 0
        ? await idsForStoredLifecycleSnapshots(
            storedLifecycles,
            resource,
            client.givingLifecycleSnapshot,
          )
        : [];
    const healthyIds = lifecycles.includes("HEALTHY")
      ? await resolveHealthyLifecycleIds(resource, client)
      : [];

    return uniqueNumbers([...matchingIds, ...healthyIds]);
  } catch (error) {
    if (isMissingLifecycleSnapshotTable(error)) {
      return null;
    }

    throw error;
  }
}

async function idsForStoredLifecycleSnapshots(
  lifecycles: GivingLifecycleKind[],
  resource: LifecycleFilterResource,
  delegate: LifecycleSnapshotDelegate,
) {
  const rows = await delegate.findMany({
    select: {
      householdRockId: true,
      personRockId: true,
    },
    where: {
      lifecycle: { in: lifecycles },
      resource,
    },
  });

  return uniqueNumbers(
    rows
      .map((row) =>
        resource === "PERSON" ? row.personRockId : row.householdRockId,
      )
      .filter((rockId): rockId is number => typeof rockId === "number"),
  );
}

async function resolveHealthyLifecycleIds(
  resource: LifecycleFilterResource,
  client: LifecycleFilterClient,
) {
  if (!client.givingLifecycleSnapshot) {
    return [];
  }

  const referenceDate = new Date();
  const recentStart = subtractDays(referenceDate, 90);
  const fundScope = client.platformFundSetting
    ? await getPlatformFundScope(client)
    : { enabledAccountRockIds: [], mode: "UNCONFIGURED" as const };
  const [snapshotRows, factRows] = await Promise.all([
    client.givingLifecycleSnapshot.findMany({
      select: {
        householdRockId: true,
        personRockId: true,
      },
      where: {
        resource,
      },
    }),
    client.givingFact.findMany({
      orderBy: [{ occurredAt: "asc" }, { effectiveMonth: "asc" }],
      select: {
        effectiveMonth: true,
        householdRockId: true,
        occurredAt: true,
        personRockId: true,
      },
      where:
        resource === "PERSON"
          ? {
              ...whereForEnabledPlatformFunds(fundScope),
              personRockId: { not: null },
            }
          : {
              ...whereForEnabledPlatformFunds(fundScope),
              householdRockId: { not: null },
            },
    }),
  ]);
  const idsWithLifecycle = new Set(
    snapshotRows
      .map((row) =>
        resource === "PERSON" ? row.personRockId : row.householdRockId,
      )
      .filter((rockId): rockId is number => typeof rockId === "number"),
  );
  const latestGiftAtById = new Map<number, Date>();

  for (const fact of factRows) {
    const rockId =
      resource === "PERSON" ? fact.personRockId : fact.householdRockId;

    if (!rockId) {
      continue;
    }

    const giftAt = fact.occurredAt ?? fact.effectiveMonth;
    const latestGiftAt = latestGiftAtById.get(rockId);

    if (!latestGiftAt || giftAt > latestGiftAt) {
      latestGiftAtById.set(rockId, giftAt);
    }
  }

  return Array.from(latestGiftAtById.entries())
    .filter(
      ([rockId, latestGiftAt]) =>
        latestGiftAt >= recentStart &&
        latestGiftAt <= referenceDate &&
        !idsWithLifecycle.has(rockId),
    )
    .map(([rockId]) => rockId);
}

async function resolveFactLifecycleIds(
  lifecycles: LifecycleFilterKind[],
  resource: LifecycleFilterResource,
  delegate: GivingFactDelegate,
  client?: LifecycleFilterClient,
) {
  const fundScope = client?.platformFundSetting
    ? await getPlatformFundScope(client)
    : { enabledAccountRockIds: [], mode: "UNCONFIGURED" as const };
  const facts = await delegate.findMany({
    orderBy: [{ occurredAt: "asc" }, { effectiveMonth: "asc" }, { id: "asc" }],
    select: {
      amount: true,
      effectiveMonth: true,
      householdRockId: true,
      occurredAt: true,
      personRockId: true,
      reliabilityKind: true,
    },
    where:
      resource === "PERSON"
        ? {
            ...whereForEnabledPlatformFunds(fundScope),
            personRockId: { not: null },
          }
        : {
            ...whereForEnabledPlatformFunds(fundScope),
            householdRockId: { not: null },
          },
  });
  const lifecycleSet = new Set(lifecycles);
  const recentStart = subtractDays(new Date(), 90);
  const factsByRockId = new Map<number, GivingLifecycleFact[]>();

  for (const fact of facts) {
    const rockId =
      resource === "PERSON" ? fact.personRockId : fact.householdRockId;

    if (!rockId) {
      continue;
    }

    const group = factsByRockId.get(rockId) ?? [];
    group.push(fact);
    factsByRockId.set(rockId, group);
  }

  return [...factsByRockId.entries()]
    .filter(([, groupedFacts]) => {
      const result = classifyGivingLifecycle(groupedFacts);
      const latestGiftAt = groupedFacts
        .map((fact) => fact.occurredAt ?? fact.effectiveMonth)
        .sort((left, right) => right.getTime() - left.getTime())[0];

      if (
        lifecycleSet.has("HEALTHY") &&
        !result.kind &&
        latestGiftAt &&
        latestGiftAt >= recentStart
      ) {
        return true;
      }

      return result.kind ? lifecycleSet.has(result.kind) : false;
    })
    .map(([rockId]) => rockId);
}

function uniqueLifecycleValues(values: LifecycleFilterKind[]) {
  return [...new Set(values)];
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)];
}

function isMissingLifecycleSnapshotTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2021"
  );
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}
