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

type LifecycleSnapshotDelegate = PrismaClient["givingLifecycleSnapshot"];
type GivingFactDelegate = PrismaClient["givingFact"];

export type LifecycleFilterResource = "PERSON" | "HOUSEHOLD";

export type LifecycleFilterClient = {
  givingFact: GivingFactDelegate;
  givingLifecycleSnapshot?: LifecycleSnapshotDelegate;
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
    client.givingLifecycleSnapshot,
  );

  if (snapshotIds) {
    return snapshotIds;
  }

  return resolveFactLifecycleIds(lifecycles, resource, client.givingFact);
}

function lifecycleValuesFromFilter(node: FilterNode): GivingLifecycleKind[] {
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
    .filter((value): value is GivingLifecycleKind => Boolean(value));
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

  return GIVING_LIFECYCLE_KINDS.find((kind) => kind === normalized) ?? null;
}

async function resolveSnapshotLifecycleIds(
  lifecycles: GivingLifecycleKind[],
  resource: LifecycleFilterResource,
  delegate: LifecycleSnapshotDelegate | undefined,
) {
  if (!delegate) {
    return null;
  }

  try {
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
  } catch (error) {
    if (isMissingLifecycleSnapshotTable(error)) {
      return null;
    }

    throw error;
  }
}

async function resolveFactLifecycleIds(
  lifecycles: GivingLifecycleKind[],
  resource: LifecycleFilterResource,
  delegate: GivingFactDelegate,
) {
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
        ? { personRockId: { not: null } }
        : { householdRockId: { not: null } },
  });
  const lifecycleSet = new Set(lifecycles);
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

      return result.kind ? lifecycleSet.has(result.kind) : false;
    })
    .map(([rockId]) => rockId);
}

function uniqueLifecycleValues(values: GivingLifecycleKind[]) {
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
