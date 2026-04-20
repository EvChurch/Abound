import type { Prisma, PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";

import { canSeeGivingAmounts, hasPermission } from "@/lib/auth/roles";
import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import { summarizeGivingFacts, type GivingSummary } from "@/lib/giving/metrics";
import { rockPersonPhotoPath } from "@/lib/rock/photos";
import {
  decodeRockIdCursor,
  encodeRockIdCursor,
  clampListLimit,
} from "@/lib/list-views/cursors";
import { getListViewFilterCatalog } from "@/lib/list-views/filter-catalog";
import {
  createEmptyFilter,
  validateFilterDefinition,
  type FilterCondition,
  type FilterDefinition,
  type FilterGroup,
  type FilterNode,
} from "@/lib/list-views/filter-schema";
import { getSavedListView } from "@/lib/list-views/saved-views";
import { resolveLifecycleFilteredRockIds } from "@/lib/list-views/lifecycle-filtering";
import type {
  AppliedListView,
  ListViewInput,
  PageInfo,
} from "@/lib/list-views/people-list";

type HouseholdsListClient = Pick<
  PrismaClient,
  "givingFact" | "givingLifecycleSnapshot" | "rockHousehold" | "savedListView"
>;

export type HouseholdListRow = {
  rockId: number;
  name: string;
  active: boolean;
  archived: boolean;
  campus: {
    rockId: number;
    name: string;
    shortCode: string | null;
  } | null;
  memberCount: number;
  primaryContacts: Array<{
    rockId: number;
    displayName: string;
    email: string | null;
    photoUrl: string | null;
  }>;
  lifecycle: Array<{
    lifecycle: string;
    summary: string;
    windowEndedAt: Date;
  }>;
  openTaskCount: number;
  lastSyncedAt: Date;
  givingSummary: GivingSummary | null;
  amountsHidden: boolean;
};

export type HouseholdsConnection = {
  appliedView: AppliedListView;
  edges: Array<{
    cursor: string;
    node: HouseholdListRow;
  }>;
  pageInfo: PageInfo;
};

const householdListSelect = {
  _count: {
    select: {
      members: true,
      staffTasks: {
        where: {
          status: {
            in: ["OPEN", "IN_PROGRESS"],
          },
        },
      },
    },
  },
  active: true,
  archived: true,
  campus: {
    select: {
      name: true,
      rockId: true,
      shortCode: true,
    },
  },
  lastSyncedAt: true,
  members: {
    orderBy: [{ archived: "asc" }, { rockId: "asc" }],
    select: {
      groupRole: {
        select: {
          name: true,
        },
      },
      person: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          nickName: true,
          photoRockId: true,
          rockId: true,
        },
      },
    },
    take: 3,
    where: {
      archived: false,
    },
  },
  name: true,
  rockId: true,
} satisfies Prisma.RockHouseholdSelect;

type HouseholdListRecord = Prisma.RockHouseholdGetPayload<{
  select: typeof householdListSelect;
}>;

export async function listHouseholds(
  input: ListViewInput,
  actor: LocalAppUser,
  client: HouseholdsListClient = prisma,
): Promise<HouseholdsConnection> {
  assertCanReadLists(actor);

  const savedView = input.savedViewId
    ? await getSavedListView(input.savedViewId, actor, client as PrismaClient)
    : null;
  const filterDefinition =
    input.filterDefinition ??
    savedView?.filterDefinition ??
    createEmptyFilter();
  const validation = validateFilterDefinition(
    filterDefinition,
    getListViewFilterCatalog("HOUSEHOLDS", actor.role),
  );

  if (!validation.ok) {
    throw new GraphQLError("Households list filter is invalid.", {
      extensions: {
        code: "BAD_USER_INPUT",
        validationErrors: validation.errors,
      },
    });
  }

  const limit = clampListLimit(input.first ?? savedView?.pageSize ?? null);
  const cursor = decodeRockIdCursor(input.after);
  const lifecycleRockIds = await resolveLifecycleFilteredRockIds(
    validation.definition,
    "HOUSEHOLD",
    client,
  );
  const records = await client.rockHousehold.findMany({
    cursor: cursor ? { rockId: cursor.rockId } : undefined,
    orderBy: [{ rockId: "asc" }],
    select: householdListSelect,
    skip: cursor ? 1 : 0,
    take: limit + 1,
    where: withRockIdFilter(
      filterToHouseholdWhere(validation.definition, actor),
      lifecycleRockIds,
    ),
  });
  const pageRecords = records.slice(0, limit);
  const givingSummaries = canSeeGivingAmounts(actor.role)
    ? await givingSummariesByHousehold(
        pageRecords.map((record) => record.rockId),
        client,
      )
    : new Map<number, GivingSummary>();

  return {
    appliedView: {
      id: savedView?.id ?? null,
      name: savedView?.name ?? "All households",
      pageSize: limit,
    },
    edges: pageRecords.map((record) => ({
      cursor: encodeRockIdCursor({ rockId: record.rockId }),
      node: mapHouseholdRow(record, actor, givingSummaries),
    })),
    pageInfo: {
      endCursor: pageRecords.at(-1)
        ? encodeRockIdCursor({ rockId: pageRecords.at(-1)!.rockId })
        : null,
      hasNextPage: records.length > limit,
    },
  };
}

function filterToHouseholdWhere(
  filter: FilterDefinition,
  actor: LocalAppUser,
): Prisma.RockHouseholdWhereInput {
  return nodeToHouseholdWhere(filter, actor) ?? {};
}

function withRockIdFilter(
  where: Prisma.RockHouseholdWhereInput,
  rockIds: number[] | null,
): Prisma.RockHouseholdWhereInput {
  if (!rockIds) {
    return where;
  }

  return { AND: [where, { rockId: { in: rockIds } }] };
}

function nodeToHouseholdWhere(
  node: FilterNode,
  actor: LocalAppUser,
): Prisma.RockHouseholdWhereInput | null {
  if (node.type === "group") {
    return groupToHouseholdWhere(node, actor);
  }

  return conditionToHouseholdWhere(node, actor);
}

function groupToHouseholdWhere(
  group: FilterGroup,
  actor: LocalAppUser,
): Prisma.RockHouseholdWhereInput | null {
  const conditions = group.conditions
    .map((condition) => nodeToHouseholdWhere(condition, actor))
    .filter((condition): condition is Prisma.RockHouseholdWhereInput =>
      Boolean(condition),
    );

  if (conditions.length === 0) {
    return null;
  }

  return group.mode === "any" ? { OR: conditions } : { AND: conditions };
}

function conditionToHouseholdWhere(
  condition: FilterCondition,
  actor: LocalAppUser,
): Prisma.RockHouseholdWhereInput | null {
  switch (condition.field) {
    case "search":
      return {
        name: { contains: stringValue(condition), mode: "insensitive" },
      };
    case "active":
      return { active: Boolean(condition.value) };
    case "archived":
      return { archived: Boolean(condition.value) };
    case "campusRockId":
      return { campusRockId: numericNullableWhere(condition) };
    case "hasEmailCapableMember":
      return condition.value
        ? {
            members: {
              some: { person: { email: { not: null }, emailActive: true } },
            },
          }
        : {
            members: {
              none: { person: { email: { not: null }, emailActive: true } },
            },
          };
    case "hasActiveConnectGroupMember":
      return condition.value
        ? {
            members: {
              some: {
                person: {
                  groupMembers: { some: { activeConnectGroup: true } },
                },
              },
            },
          }
        : {
            members: {
              none: {
                person: {
                  groupMembers: { some: { activeConnectGroup: true } },
                },
              },
            },
          };
    case "taskStatus":
      return {
        staffTasks: {
          some: {
            status: enumWhere(condition) as Prisma.EnumStaffTaskStatusFilter,
          },
        },
      };
    case "taskPriority":
      return {
        staffTasks: {
          some: {
            priority: enumWhere(
              condition,
            ) as Prisma.EnumStaffTaskPriorityFilter,
          },
        },
      };
    case "taskAssigneeUserId":
      return {
        staffTasks: {
          some: { assignedToUserId: stringNullableWhere(condition) },
        },
      };
    case "taskDueAt":
      return { staffTasks: { some: { dueAt: dateWhere(condition) } } };
    case "lifecycle":
      return null;
    case "givingRecency":
      return { givingFacts: { some: { occurredAt: dateWhere(condition) } } };
    case "reliabilityKind":
      return {
        givingFacts: {
          some: {
            reliabilityKind: enumWhere(
              condition,
            ) as Prisma.EnumGiftReliabilityKindFilter,
          },
        },
      };
    case "accountRockId":
      return {
        givingFacts: {
          some: { accountRockId: numericNullableWhere(condition) },
        },
      };
    case "totalGiven":
    case "lastGiftAmount":
    case "trailingPeriodTotal":
    case "amountChange":
      if (!canSeeGivingAmounts(actor.role)) {
        throw new GraphQLError("Amount filters require finance permission.", {
          extensions: { code: "FORBIDDEN" },
        });
      }
      return { givingFacts: { some: { amount: moneyWhere(condition) } } };
    default:
      return null;
  }
}

async function givingSummariesByHousehold(
  householdRockIds: number[],
  client: HouseholdsListClient,
) {
  if (householdRockIds.length === 0) {
    return new Map<number, GivingSummary>();
  }

  const facts = await client.givingFact.findMany({
    orderBy: [{ occurredAt: "asc" }, { effectiveMonth: "asc" }, { id: "asc" }],
    select: {
      accountRockId: true,
      amount: true,
      effectiveMonth: true,
      householdRockId: true,
      occurredAt: true,
      reliabilityKind: true,
    },
    where: {
      householdRockId: { in: householdRockIds },
    },
  });
  const factsByHousehold = new Map<number, typeof facts>();

  for (const fact of facts) {
    if (!fact.householdRockId) continue;

    const group = factsByHousehold.get(fact.householdRockId) ?? [];
    group.push(fact);
    factsByHousehold.set(fact.householdRockId, group);
  }

  return new Map(
    householdRockIds.map((householdRockId) => [
      householdRockId,
      summarizeGivingFacts(factsByHousehold.get(householdRockId) ?? []),
    ]),
  );
}

function mapHouseholdRow(
  record: HouseholdListRecord,
  actor: LocalAppUser,
  givingSummaries: Map<number, GivingSummary>,
): HouseholdListRow {
  return {
    active: record.active,
    amountsHidden: !canSeeGivingAmounts(actor.role),
    archived: record.archived,
    campus: record.campus,
    givingSummary: canSeeGivingAmounts(actor.role)
      ? (givingSummaries.get(record.rockId) ?? null)
      : null,
    lastSyncedAt: record.lastSyncedAt,
    lifecycle: [],
    memberCount: record._count.members,
    name: record.name,
    openTaskCount: record._count.staffTasks,
    primaryContacts: record.members.map((membership) => ({
      displayName: displayName(membership.person),
      email: membership.person.email,
      photoUrl: rockPersonPhotoPath(membership.person.photoRockId),
      rockId: membership.person.rockId,
    })),
    rockId: record.rockId,
  };
}

function assertCanReadLists(actor: LocalAppUser) {
  if (
    !hasPermission(actor.role, "people:read_limited") &&
    !hasPermission(actor.role, "people:read_care_context")
  ) {
    throw new GraphQLError(
      "You do not have permission to view household lists.",
      {
        extensions: { code: "FORBIDDEN" },
      },
    );
  }
}

function displayName(person: {
  firstName: string | null;
  lastName: string | null;
  nickName: string | null;
}) {
  return (
    [person.nickName || person.firstName, person.lastName]
      .filter(Boolean)
      .join(" ") || "Unnamed Rock person"
  );
}

function stringValue(condition: FilterCondition) {
  return String(condition.value ?? "").trim();
}

function numericNullableWhere(condition: FilterCondition) {
  if (condition.operator === "EXISTS") {
    return condition.value ? { not: null } : null;
  }

  if (condition.operator === "IN" && Array.isArray(condition.value)) {
    return { in: condition.value.map((value) => Number(value)) };
  }

  return Number(condition.value);
}

function stringNullableWhere(condition: FilterCondition) {
  if (condition.operator === "EXISTS") {
    return condition.value ? { not: null } : null;
  }

  if (condition.operator === "IN" && Array.isArray(condition.value)) {
    return { in: condition.value.map(String) };
  }

  return String(condition.value);
}

function enumWhere(condition: FilterCondition) {
  if (condition.operator === "IN" && Array.isArray(condition.value)) {
    return { in: condition.value.map(String) };
  }

  return String(condition.value);
}

function dateWhere(condition: FilterCondition): Prisma.DateTimeNullableFilter {
  if (condition.operator === "EXISTS") {
    return condition.value ? { not: null } : { equals: null };
  }

  if (condition.operator === "BETWEEN" && Array.isArray(condition.value)) {
    return {
      gte: parseDateValue(condition.value[0]),
      lte: parseDateValue(condition.value[1]),
    };
  }

  if (condition.operator === "AFTER") {
    return { gte: parseDateValue(condition.value) };
  }

  if (condition.operator === "BEFORE") {
    return { lte: parseDateValue(condition.value) };
  }

  return { equals: parseDateValue(condition.value) };
}

function moneyWhere(condition: FilterCondition): Prisma.DecimalFilter {
  if (condition.operator === "BETWEEN" && Array.isArray(condition.value)) {
    return { gte: String(condition.value[0]), lte: String(condition.value[1]) };
  }

  if (condition.operator === "GREATER_THAN") {
    return { gt: String(condition.value) };
  }

  if (condition.operator === "LESS_THAN") {
    return { lt: String(condition.value) };
  }

  return { equals: String(condition.value) };
}

function parseDateValue(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "amount" in value &&
    "unit" in value
  ) {
    const relative = value as { amount: number; unit: "DAYS" | "MONTHS" };
    const date = new Date();

    if (relative.unit === "DAYS") {
      date.setUTCDate(date.getUTCDate() - relative.amount);
    } else {
      date.setUTCMonth(date.getUTCMonth() - relative.amount);
    }

    return date;
  }

  return new Date(String(value));
}
