import type { GivingPledgePeriod, Prisma, PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";

import { canSeeGivingAmounts, hasPermission } from "@/lib/auth/roles";
import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import {
  buildPledgeAnalysisRows,
  type PledgeAnalysisRow,
  type PledgeFund,
} from "@/lib/giving/pledges";
import { classifyGivingLifecycle } from "@/lib/giving/lifecycle";
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
import {
  getPlatformFundScope,
  whereForEnabledPlatformFunds,
} from "@/lib/settings/funds";

type PeopleListClient = Pick<
  PrismaClient,
  | "givingFact"
  | "givingLifecycleSnapshot"
  | "givingPledge"
  | "givingPledgeRecommendationDecision"
  | "platformFundSetting"
  | "rockFinancialAccount"
  | "rockPerson"
  | "savedListView"
>;

export type ListViewInput = {
  after?: string | null;
  filterDefinition?: unknown;
  first?: number | null;
  savedViewId?: string | null;
};

export type PageInfo = {
  endCursor: string | null;
  hasNextPage: boolean;
};

export type AppliedListView = {
  id: string | null;
  name: string;
  pageSize: number;
};

export type PersonListRow = {
  rockId: number;
  displayName: string;
  email: string | null;
  emailActive: boolean | null;
  deceased: boolean;
  recordStatus: string | null;
  connectionStatus: string | null;
  photoUrl: string | null;
  primaryCampus: ListCampus | null;
  primaryHousehold: ListHouseholdSummary | null;
  lifecycle: ListLifecycleLabel[];
  openTaskCount: number;
  lastSyncedAt: Date;
  givingSummary: GivingSummary | null;
  givingPresence: GivingPresenceMonth[];
  lastGiftMonth: string | null;
  pledgeSummary: PledgeListSummary | null;
  amountsHidden: boolean;
};

export type GivingPresenceMonth = {
  key: string;
  label: string;
  state: "given" | "none" | "reduced";
};

export type PledgeListSummary = {
  active: PledgeListItem[];
  draft: PledgeListItem[];
  review: PledgeListItem[];
};

export type PledgeListItem = {
  accountName: string;
  amount: string;
  period: GivingPledgePeriod;
};

export type PeopleConnection = {
  appliedView: AppliedListView;
  edges: Array<{
    cursor: string;
    node: PersonListRow;
  }>;
  pageInfo: PageInfo;
  resultCount?: {
    filtered: number;
    total: number;
  };
};

type ListCampus = {
  rockId: number;
  name: string;
  shortCode: string | null;
};

type ListHouseholdSummary = {
  rockId: number;
  name: string;
  active: boolean;
  archived: boolean;
};

type ListLifecycleLabel = {
  lifecycle: string;
  summary: string;
  windowEndedAt: Date;
};

const personListSelect = {
  _count: {
    select: {
      staffTasks: {
        where: {
          status: {
            in: ["OPEN", "IN_PROGRESS"],
          },
        },
      },
    },
  },
  deceased: true,
  email: true,
  emailActive: true,
  firstName: true,
  lastName: true,
  lastSyncedAt: true,
  nickName: true,
  photoRockId: true,
  primaryCampus: {
    select: {
      name: true,
      rockId: true,
      shortCode: true,
    },
  },
  primaryHousehold: {
    select: {
      active: true,
      archived: true,
      name: true,
      rockId: true,
    },
  },
  recordStatus: {
    select: {
      value: true,
    },
  },
  connectionStatus: {
    select: {
      value: true,
    },
  },
  rockId: true,
} satisfies Prisma.RockPersonSelect;

const RECENT_HOUSEHOLD_GIVING_DAYS = 90;
const RECENT_GIVING_DAYS = 90;
const LAPSED_AFTER_DAYS = 270;

type PersonListRecord = Prisma.RockPersonGetPayload<{
  select: typeof personListSelect;
}>;

export async function listPeople(
  input: ListViewInput,
  actor: LocalAppUser,
  client: PeopleListClient = prisma,
): Promise<PeopleConnection> {
  assertCanReadLists(actor);

  const savedView = input.savedViewId
    ? await getSavedListView(input.savedViewId, actor, client as PrismaClient)
    : null;
  const filterDefinition = resolveFilterDefinition(input, savedView);
  const validation = validateFilterDefinition(
    filterDefinition,
    getListViewFilterCatalog("PEOPLE", actor.role),
  );

  if (!validation.ok) {
    throw new GraphQLError("People list filter is invalid.", {
      extensions: {
        code: "BAD_USER_INPUT",
        validationErrors: validation.errors,
      },
    });
  }
  await assertPlatformFundFiltersAllowed(validation.definition, client);

  const limit = clampListLimit(input.first ?? savedView?.pageSize ?? null);
  const cursor = decodeRockIdCursor(input.after);
  const lifecycleRockIds = await resolveLifecycleFilteredRockIds(
    validation.definition,
    "PERSON",
    client,
  );
  const householdGivingStateRockIds =
    await resolveHouseholdGivingStateFilteredRockIds(
      validation.definition,
      client,
    );
  const pledgeStateRockIds = await resolvePledgeStateFilteredRockIds(
    validation.definition,
    actor,
    client,
  );
  const filteredWhere = withRockIdFilter(
    filterToPersonWhere(validation.definition, actor),
    intersectRockIds(
      intersectRockIds(lifecycleRockIds, householdGivingStateRockIds),
      pledgeStateRockIds,
    ),
  );
  const totalWhere = filterToPersonWhere(createEmptyFilter(), actor);
  const [records, filteredCount, totalCount] = await Promise.all([
    client.rockPerson.findMany({
      cursor: cursor ? { rockId: cursor.rockId } : undefined,
      orderBy: [{ rockId: "asc" }],
      select: personListSelect,
      skip: cursor ? 1 : 0,
      take: limit + 1,
      where: filteredWhere,
    }),
    client.rockPerson.count({
      where: filteredWhere,
    }),
    client.rockPerson.count({
      where: totalWhere,
    }),
  ]);
  const pageRecords = records.slice(0, limit);
  const givingSummaries = canSeeGivingAmounts(actor.role)
    ? await givingSummariesByPerson(
        pageRecords.map((record) => record.rockId),
        client,
      )
    : new Map<number, GivingSummary>();
  const givingPresence = await givingPresenceByPerson(
    pageRecords.map((record) => record.rockId),
    canSeeGivingAmounts(actor.role),
    client,
  );
  const lifecycleLabels = await lifecycleLabelsByPerson(
    pageRecords.map((record) => record.rockId),
    client,
  );
  const lastGiftMonths = await lastGiftMonthByPerson(
    pageRecords.map((record) => record.rockId),
    client,
  );
  const pledgeSummaries = hasPermission(actor.role, "pledges:manage")
    ? await pledgeSummariesByPerson(
        pageRecords.map((record) => record.rockId),
        client,
      )
    : new Map<number, PledgeListSummary>();

  return {
    appliedView: {
      id: savedView?.id ?? null,
      name: savedView?.name ?? "All people",
      pageSize: limit,
    },
    edges: pageRecords.map((record) => ({
      cursor: encodeRockIdCursor({ rockId: record.rockId }),
      node: mapPersonRow(
        record,
        actor,
        givingSummaries,
        givingPresence,
        pledgeSummaries,
        lifecycleLabels,
        lastGiftMonths,
      ),
    })),
    pageInfo: {
      endCursor: pageRecords.at(-1)
        ? encodeRockIdCursor({ rockId: pageRecords.at(-1)!.rockId })
        : null,
      hasNextPage: records.length > limit,
    },
    resultCount: {
      filtered: filteredCount,
      total: totalCount,
    },
  };
}

function resolveFilterDefinition(
  input: ListViewInput,
  savedView: { filterDefinition: unknown } | null,
) {
  return (
    input.filterDefinition ?? savedView?.filterDefinition ?? createEmptyFilter()
  );
}

function filterToPersonWhere(
  filter: FilterDefinition,
  actor: LocalAppUser,
): Prisma.RockPersonWhereInput {
  const where = nodeToPersonWhere(filter, actor) ?? {};

  const demographicWhere = filterIncludesAgeGroup(filter)
    ? currentHouseholdMembershipWhere()
    : adultWhere();

  return { AND: [demographicWhere, where] };
}

function withRockIdFilter(
  where: Prisma.RockPersonWhereInput,
  rockIds: number[] | null,
): Prisma.RockPersonWhereInput {
  if (!rockIds) {
    return where;
  }

  return { AND: [where, { rockId: { in: rockIds } }] };
}

function intersectRockIds(left: number[] | null, right: number[] | null) {
  if (!left) return right;
  if (!right) return left;

  const rightSet = new Set(right);

  return left.filter((rockId) => rightSet.has(rockId));
}

function nodeToPersonWhere(
  node: FilterNode,
  actor: LocalAppUser,
): Prisma.RockPersonWhereInput | null {
  if (node.type === "group") {
    return groupToPersonWhere(node, actor);
  }

  return conditionToPersonWhere(node, actor);
}

function groupToPersonWhere(
  group: FilterGroup,
  actor: LocalAppUser,
): Prisma.RockPersonWhereInput | null {
  const conditions = group.conditions
    .map((condition) => nodeToPersonWhere(condition, actor))
    .filter((condition): condition is Prisma.RockPersonWhereInput =>
      Boolean(condition),
    );

  if (conditions.length === 0) {
    return null;
  }

  return group.mode === "any" ? { OR: conditions } : { AND: conditions };
}

function conditionToPersonWhere(
  condition: FilterCondition,
  actor: LocalAppUser,
): Prisma.RockPersonWhereInput | null {
  switch (condition.field) {
    case "search":
      return {
        OR: [
          {
            firstName: {
              contains: stringValue(condition),
              mode: "insensitive",
            },
          },
          {
            nickName: { contains: stringValue(condition), mode: "insensitive" },
          },
          {
            lastName: { contains: stringValue(condition), mode: "insensitive" },
          },
          { email: { contains: stringValue(condition), mode: "insensitive" } },
        ],
      };
    case "deceased":
      return { deceased: Boolean(condition.value) };
    case "emailPresent":
      return { email: condition.value ? { not: null } : null };
    case "emailActive":
      return { emailActive: nullableBooleanWhere(condition) };
    case "recordStatus":
      return { recordStatus: { value: enumWhere(condition) } };
    case "connectionStatus":
      return { connectionStatus: { value: enumWhere(condition) } };
    case "primaryCampusRockId":
      return { primaryCampusRockId: numericNullableWhere(condition) };
    case "primaryHouseholdRockId":
      return { primaryFamilyRockId: numericNullableWhere(condition) };
    case "givingHouseholdRockId":
      return { givingGroupRockId: numericNullableWhere(condition) };
    case "ageGroup":
      return ageGroupWhere(condition);
    case "activeConnectGroup":
      return condition.value
        ? { groupMembers: { some: { activeConnectGroup: true } } }
        : { groupMembers: { none: { activeConnectGroup: true } } };
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
    case "householdGivingState":
      return null;
    case "pledgeState":
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

async function givingSummariesByPerson(
  personRockIds: number[],
  client: PeopleListClient,
) {
  if (personRockIds.length === 0) {
    return new Map<number, GivingSummary>();
  }

  const facts = await client.givingFact.findMany({
    orderBy: [{ occurredAt: "asc" }, { effectiveMonth: "asc" }, { id: "asc" }],
    select: {
      accountRockId: true,
      amount: true,
      effectiveMonth: true,
      occurredAt: true,
      personRockId: true,
      reliabilityKind: true,
    },
    where: {
      ...whereForEnabledPlatformFunds(await getPlatformFundScope(client)),
      personRockId: { in: personRockIds },
    },
  });
  const factsByPerson = new Map<number, typeof facts>();

  for (const fact of facts) {
    if (!fact.personRockId) continue;

    const group = factsByPerson.get(fact.personRockId) ?? [];
    group.push(fact);
    factsByPerson.set(fact.personRockId, group);
  }

  return new Map(
    personRockIds.map((personRockId) => [
      personRockId,
      summarizeGivingFacts(factsByPerson.get(personRockId) ?? []),
    ]),
  );
}

async function givingPresenceByPerson(
  personRockIds: number[],
  canExposeAmountPattern: boolean,
  client: PeopleListClient,
) {
  if (personRockIds.length === 0) {
    return new Map<number, GivingPresenceMonth[]>();
  }

  const referenceDate = new Date();
  const monthStarts = latestTwelveMonthStarts(referenceDate);
  const facts = await client.givingFact.findMany({
    orderBy: [
      { personRockId: "asc" },
      { effectiveMonth: "asc" },
      { id: "asc" },
    ],
    select: {
      amount: true,
      effectiveMonth: true,
      personRockId: true,
    },
    where: {
      ...whereForEnabledPlatformFunds(await getPlatformFundScope(client)),
      effectiveMonth: {
        gte: monthStarts[0],
      },
      personRockId: { in: personRockIds },
    },
  });
  const totalsByPersonMonth = new Map<number, Map<string, number>>();

  for (const fact of facts) {
    if (!fact.personRockId) {
      continue;
    }

    const personTotals =
      totalsByPersonMonth.get(fact.personRockId) ?? new Map<string, number>();
    const key = monthKey(fact.effectiveMonth);
    personTotals.set(key, (personTotals.get(key) ?? 0) + Number(fact.amount));
    totalsByPersonMonth.set(fact.personRockId, personTotals);
  }

  return new Map(
    personRockIds.map((personRockId) => [
      personRockId,
      buildGivingPresenceMonths(
        monthStarts,
        totalsByPersonMonth.get(personRockId) ?? new Map<string, number>(),
        canExposeAmountPattern,
      ),
    ]),
  );
}

function buildGivingPresenceMonths(
  monthStarts: Date[],
  totalsByMonth: Map<string, number>,
  canExposeAmountPattern: boolean,
): GivingPresenceMonth[] {
  const positiveTotals = monthStarts
    .map((monthStart) => totalsByMonth.get(monthKey(monthStart)) ?? 0)
    .filter((amount) => amount > 0);
  const baseline =
    positiveTotals.length === 0
      ? 0
      : positiveTotals.reduce((sum, amount) => sum + amount, 0) /
        positiveTotals.length;

  return monthStarts.map((monthStart) => {
    const amount = totalsByMonth.get(monthKey(monthStart)) ?? 0;
    const reduced =
      canExposeAmountPattern &&
      baseline > 0 &&
      amount > 0 &&
      amount < baseline * 0.5;

    return {
      key: monthKey(monthStart),
      label: formatShortMonth(monthStart),
      state: amount === 0 ? "none" : reduced ? "reduced" : "given",
    };
  });
}

async function lastGiftMonthByPerson(
  personRockIds: number[],
  client: PeopleListClient,
) {
  if (personRockIds.length === 0) {
    return new Map<number, string>();
  }

  const facts = await client.givingFact.findMany({
    orderBy: [
      { personRockId: "asc" },
      { occurredAt: "desc" },
      { effectiveMonth: "desc" },
      { id: "asc" },
    ],
    select: {
      effectiveMonth: true,
      occurredAt: true,
      personRockId: true,
    },
    where: {
      ...whereForEnabledPlatformFunds(await getPlatformFundScope(client)),
      personRockId: { in: personRockIds },
    },
  });
  const latestByPerson = new Map<number, Date>();

  for (const fact of facts) {
    if (!fact.personRockId) {
      continue;
    }

    const giftAt = fact.occurredAt ?? fact.effectiveMonth;
    const latestGiftAt = latestByPerson.get(fact.personRockId);

    if (!latestGiftAt || giftAt > latestGiftAt) {
      latestByPerson.set(fact.personRockId, giftAt);
    }
  }

  return new Map(
    Array.from(latestByPerson.entries()).map(([personRockId, date]) => [
      personRockId,
      formatMonthYear(date),
    ]),
  );
}

async function lifecycleLabelsByPerson(
  personRockIds: number[],
  client: PeopleListClient,
) {
  if (personRockIds.length === 0) {
    return new Map<number, ListLifecycleLabel[]>();
  }

  const labelsByPerson = new Map<number, ListLifecycleLabel[]>();

  if (client.givingLifecycleSnapshot) {
    const rows = await client.givingLifecycleSnapshot.findMany({
      orderBy: [{ windowEndedAt: "desc" }, { lifecycle: "asc" }],
      select: {
        lifecycle: true,
        personRockId: true,
        summary: true,
        windowEndedAt: true,
      },
      where: {
        personRockId: { in: personRockIds },
        resource: "PERSON",
      },
    });

    for (const row of rows) {
      if (!row.personRockId) continue;

      const group = labelsByPerson.get(row.personRockId) ?? [];
      if (group.some((label) => label.lifecycle === row.lifecycle)) {
        continue;
      }

      group.push({
        lifecycle: row.lifecycle,
        summary: row.summary,
        windowEndedAt: row.windowEndedAt,
      });
      labelsByPerson.set(row.personRockId, group);
    }
  }

  const computedLabels = await computedLifecycleLabelsByPerson(
    personRockIds.filter((personRockId) => {
      const labels = labelsByPerson.get(personRockId) ?? [];
      return labels.length === 0;
    }),
    client,
  );

  for (const [personRockId, labels] of computedLabels) {
    labelsByPerson.set(personRockId, labels);
  }

  return labelsByPerson;
}

async function computedLifecycleLabelsByPerson(
  personRockIds: number[],
  client: PeopleListClient,
) {
  if (personRockIds.length === 0) {
    return new Map<number, ListLifecycleLabel[]>();
  }

  const fundScope = await getPlatformFundScope(client);

  if (fundScope.mode !== "CONFIGURED") {
    return new Map<number, ListLifecycleLabel[]>();
  }

  const facts = await client.givingFact.findMany({
    orderBy: [
      { personRockId: "asc" },
      { effectiveMonth: "asc" },
      { id: "asc" },
    ],
    select: {
      amount: true,
      effectiveMonth: true,
      occurredAt: true,
      personRockId: true,
      reliabilityKind: true,
    },
    where: {
      ...whereForEnabledPlatformFunds(fundScope),
      personRockId: { in: personRockIds },
    },
  });
  const factsByPerson = groupByPerson(facts);
  const referenceDate = new Date();
  const recentStart = subtractDays(referenceDate, RECENT_GIVING_DAYS);
  const lapsedStart = subtractDays(referenceDate, LAPSED_AFTER_DAYS);

  const computedLabels = new Map<number, ListLifecycleLabel[]>();

  for (const personRockId of personRockIds) {
    const personFacts = factsByPerson.get(personRockId) ?? [];
    const classified = classifyGivingLifecycle(personFacts);

    if (personFacts.length === 0) {
      computedLabels.set(personRockId, [
        {
          lifecycle: "NEVER_GIVEN",
          summary: "No platform-fund giving activity is on record.",
          windowEndedAt: referenceDate,
        },
      ]);
      continue;
    }

    if (classified.kind) {
      computedLabels.set(personRockId, [
        {
          lifecycle: classified.kind,
          summary: classified.summary ?? "Current giving lifecycle signal.",
          windowEndedAt: classified.financeDetail?.lastGiftAt ?? referenceDate,
        },
      ]);
      continue;
    }

    const latestGiftAt = latestGiftDate(personFacts);

    if (latestGiftAt && latestGiftAt >= recentStart) {
      computedLabels.set(personRockId, [
        {
          lifecycle: "HEALTHY",
          summary: "Recent giving with no stronger lifecycle signal.",
          windowEndedAt: latestGiftAt,
        },
      ]);
      continue;
    }

    if (
      latestGiftAt &&
      latestGiftAt < lapsedStart &&
      distinctGivingMonths(personFacts) >= 3
    ) {
      computedLabels.set(personRockId, [
        {
          lifecycle: "LAPSED",
          summary:
            "Prior multi-month giving, but no gift in the lapsed window.",
          windowEndedAt: latestGiftAt,
        },
      ]);
    }
  }

  return computedLabels;
}

async function pledgeSummariesByPerson(
  personRockIds: number[],
  client: PeopleListClient,
) {
  if (personRockIds.length === 0) {
    return new Map<number, PledgeListSummary>();
  }

  const referenceDate = new Date();
  const fundScope = await getPlatformFundScope(client);
  const [funds, facts, pledges, decisions] = await Promise.all([
    client.rockFinancialAccount.findMany({
      orderBy: [{ name: "asc" }, { rockId: "asc" }],
      select: {
        active: true,
        name: true,
        rockId: true,
      },
      where: {
        active: true,
        rockId: { in: fundScope.enabledAccountRockIds },
      },
    }),
    client.givingFact.findMany({
      orderBy: [
        { personRockId: "asc" },
        { accountRockId: "asc" },
        { effectiveMonth: "asc" },
        { id: "asc" },
      ],
      select: {
        accountRockId: true,
        amount: true,
        effectiveMonth: true,
        occurredAt: true,
        personRockId: true,
      },
      where: {
        ...whereForEnabledPlatformFunds(fundScope),
        effectiveMonth: {
          gte: firstRecentMonthDate(referenceDate),
        },
        personRockId: { in: personRockIds },
      },
    }),
    client.givingPledge.findMany({
      include: {
        account: {
          select: {
            name: true,
            rockId: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
      where: {
        accountRockId: { in: fundScope.enabledAccountRockIds },
        personRockId: { in: personRockIds },
        status: {
          in: ["ACTIVE", "DRAFT"],
        },
      },
    }),
    client.givingPledgeRecommendationDecision.findMany({
      orderBy: [{ decidedAt: "desc" }, { id: "asc" }],
      where: {
        personRockId: { in: personRockIds },
        status: "REJECTED",
      },
    }),
  ]);

  const factsByPerson = groupByPerson(facts);
  const pledgesByPerson = groupByPerson(pledges);
  const decisionsByPerson = groupByPerson(decisions);
  const fundRows = funds.map((fund) => ({
    active: fund.active,
    name: fund.name,
    rockId: fund.rockId,
  })) satisfies PledgeFund[];

  return new Map(
    personRockIds.map((personRockId) => [
      personRockId,
      summarizePledgeRows(
        buildPledgeAnalysisRows({
          decisions: decisionsByPerson.get(personRockId) ?? [],
          facts: factsByPerson.get(personRockId) ?? [],
          funds: fundRows,
          pledges: pledgesByPerson.get(personRockId) ?? [],
          referenceDate,
        }),
      ),
    ]),
  );
}

async function resolvePledgeStateFilteredRockIds(
  filter: FilterNode,
  actor: LocalAppUser,
  client: PeopleListClient,
) {
  const requestedStates = pledgeStatesFromFilter(filter);

  if (requestedStates.length === 0) {
    return null;
  }

  if (!hasPermission(actor.role, "pledges:manage")) {
    throw new GraphQLError("Pledge filters require pledge permission.", {
      extensions: { code: "FORBIDDEN" },
    });
  }

  const referenceDate = new Date();
  const fundScope = await getPlatformFundScope(client);
  const [funds, facts, pledges, decisions] = await Promise.all([
    client.rockFinancialAccount.findMany({
      orderBy: [{ name: "asc" }, { rockId: "asc" }],
      select: {
        active: true,
        name: true,
        rockId: true,
      },
      where: {
        active: true,
        rockId: { in: fundScope.enabledAccountRockIds },
      },
    }),
    client.givingFact.findMany({
      orderBy: [
        { personRockId: "asc" },
        { accountRockId: "asc" },
        { effectiveMonth: "asc" },
        { id: "asc" },
      ],
      select: {
        accountRockId: true,
        amount: true,
        effectiveMonth: true,
        occurredAt: true,
        personRockId: true,
      },
      where: {
        ...whereForEnabledPlatformFunds(fundScope),
        effectiveMonth: {
          gte: firstRecentMonthDate(referenceDate),
        },
        personRockId: { not: null },
      },
    }),
    client.givingPledge.findMany({
      include: {
        account: {
          select: {
            name: true,
            rockId: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
      where: {
        accountRockId: { in: fundScope.enabledAccountRockIds },
        status: {
          in: ["ACTIVE", "DRAFT"],
        },
      },
    }),
    client.givingPledgeRecommendationDecision.findMany({
      orderBy: [{ decidedAt: "desc" }, { id: "asc" }],
      where: {
        status: "REJECTED",
      },
    }),
  ]);
  const factsByPerson = groupByPerson(facts);
  const pledgesByPerson = groupByPerson(pledges);
  const decisionsByPerson = groupByPerson(decisions);
  const personRockIds = new Set([
    ...factsByPerson.keys(),
    ...pledgesByPerson.keys(),
    ...decisionsByPerson.keys(),
  ]);
  const fundRows = funds.map((fund) => ({
    active: fund.active,
    name: fund.name,
    rockId: fund.rockId,
  })) satisfies PledgeFund[];
  const requested = new Set(requestedStates);

  return [...personRockIds].filter((personRockId) =>
    buildPledgeAnalysisRows({
      decisions: decisionsByPerson.get(personRockId) ?? [],
      facts: factsByPerson.get(personRockId) ?? [],
      funds: fundRows,
      pledges: pledgesByPerson.get(personRockId) ?? [],
      referenceDate,
    }).some((row) => pledgeRowMatchesStates(row, requested)),
  );
}

async function resolveHouseholdGivingStateFilteredRockIds(
  filter: FilterNode,
  client: PeopleListClient,
) {
  const requestedStates = householdGivingStatesFromFilter(filter);

  if (requestedStates.length === 0) {
    return null;
  }

  const recentHouseholdRockIds = await recentGivingHouseholdRockIds(client);
  const recentHouseholdSet = new Set(recentHouseholdRockIds);
  const people = await client.rockPerson.findMany({
    orderBy: [{ rockId: "asc" }],
    select: {
      givingGroupRockId: true,
      primaryFamilyRockId: true,
      rockId: true,
    },
  });
  const requested = new Set(requestedStates);

  return people
    .filter((person) => {
      const householdRockId =
        person.givingGroupRockId ?? person.primaryFamilyRockId;
      const stillGiving = householdRockId
        ? recentHouseholdSet.has(householdRockId)
        : false;

      return (
        (requested.has("STILL_GIVING") && stillGiving) ||
        (requested.has("STOPPED") && !stillGiving)
      );
    })
    .map((person) => person.rockId);
}

async function recentGivingHouseholdRockIds(client: PeopleListClient) {
  const recentStart = subtractDays(new Date(), RECENT_HOUSEHOLD_GIVING_DAYS);
  const facts = await client.givingFact.findMany({
    orderBy: [
      { householdRockId: "asc" },
      { occurredAt: "desc" },
      { effectiveMonth: "desc" },
    ],
    select: {
      householdRockId: true,
    },
    where: {
      ...whereForEnabledPlatformFunds(await getPlatformFundScope(client)),
      householdRockId: { not: null },
      OR: [
        { occurredAt: { gte: recentStart } },
        {
          occurredAt: null,
          effectiveMonth: { gte: recentStart },
        },
      ],
    },
  });

  return [
    ...new Set(
      facts
        .map((fact) => fact.householdRockId)
        .filter((rockId): rockId is number => typeof rockId === "number"),
    ),
  ];
}

type HouseholdGivingStateFilter = "STILL_GIVING" | "STOPPED";

function householdGivingStatesFromFilter(
  node: FilterNode,
): HouseholdGivingStateFilter[] {
  if (node.type === "group") {
    return node.conditions.flatMap(householdGivingStatesFromFilter);
  }

  if (node.field !== "householdGivingState") {
    return [];
  }

  return valuesFromCondition(node)
    .map(normalizeHouseholdGivingState)
    .filter((value): value is HouseholdGivingStateFilter => Boolean(value));
}

function normalizeHouseholdGivingState(
  value: unknown,
): HouseholdGivingStateFilter | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (normalized === "STILL_GIVING" || normalized === "STOPPED") {
    return normalized;
  }

  return null;
}

type PledgeFilterState = "ACTIVE" | "DRAFT" | "REVIEW";

function pledgeStatesFromFilter(node: FilterNode): PledgeFilterState[] {
  if (node.type === "group") {
    return node.conditions.flatMap(pledgeStatesFromFilter);
  }

  if (node.field !== "pledgeState") {
    return [];
  }

  return valuesFromCondition(node)
    .map(normalizePledgeFilterState)
    .filter((value): value is PledgeFilterState => Boolean(value));
}

function normalizePledgeFilterState(value: unknown): PledgeFilterState | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (
    normalized === "ACTIVE" ||
    normalized === "DRAFT" ||
    normalized === "REVIEW"
  ) {
    return normalized;
  }

  return null;
}

function pledgeRowMatchesStates(
  row: PledgeAnalysisRow,
  states: Set<PledgeFilterState>,
) {
  if (states.has("ACTIVE") && row.status === "ACTIVE_PLEDGE_EXISTS") {
    return true;
  }

  if (states.has("DRAFT") && row.status === "DRAFT_EXISTS") {
    return true;
  }

  if (states.has("REVIEW") && row.status === "RECOMMENDED") {
    return true;
  }

  return false;
}

function valuesFromCondition(condition: FilterCondition) {
  if (condition.operator === "IN" && Array.isArray(condition.value)) {
    return condition.value;
  }

  return [condition.value];
}

export async function assertPlatformFundFiltersAllowed(
  filter: FilterNode,
  client: Pick<PrismaClient, "platformFundSetting">,
) {
  const scope = await getPlatformFundScope(client);

  if (scope.mode !== "CONFIGURED") {
    return;
  }

  const enabled = new Set(scope.enabledAccountRockIds);
  const requested = accountRockIdsFromFilter(filter);
  const disabled = requested.filter(
    (accountRockId) => !enabled.has(accountRockId),
  );

  if (disabled.length > 0) {
    throw new GraphQLError("Fund filters must use enabled platform funds.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
}

function accountRockIdsFromFilter(node: FilterNode): number[] {
  if (node.type === "group") {
    return node.conditions.flatMap(accountRockIdsFromFilter);
  }

  if (node.field !== "accountRockId") {
    return [];
  }

  return valuesFromCondition(node)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function summarizePledgeRows(rows: PledgeAnalysisRow[]): PledgeListSummary {
  return {
    active: rows
      .filter((row) => row.status === "ACTIVE_PLEDGE_EXISTS")
      .map((row) => pledgeItemFromExisting(row.activePledge))
      .filter((item): item is PledgeListItem => Boolean(item)),
    draft: rows
      .filter((row) => row.status === "DRAFT_EXISTS")
      .map((row) => pledgeItemFromExisting(row.draftPledge))
      .filter((item): item is PledgeListItem => Boolean(item)),
    review: rows
      .filter((row) => row.status === "RECOMMENDED")
      .map((row) => pledgeItemFromRecommendation(row))
      .filter((item): item is PledgeListItem => Boolean(item)),
  };
}

function pledgeItemFromExisting(
  pledge: PledgeAnalysisRow["activePledge"] | PledgeAnalysisRow["draftPledge"],
): PledgeListItem | null {
  if (!pledge) {
    return null;
  }

  return {
    accountName: pledge.accountName,
    amount: pledge.amount,
    period: pledge.period,
  };
}

function pledgeItemFromRecommendation(
  row: PledgeAnalysisRow,
): PledgeListItem | null {
  if (!row.recommendedAmount || !row.recommendedPeriod) {
    return null;
  }

  return {
    accountName: row.account.name,
    amount: row.recommendedAmount,
    period: row.recommendedPeriod,
  };
}

function groupByPerson<T extends { personRockId: number | null }>(items: T[]) {
  const groups = new Map<number, T[]>();

  for (const item of items) {
    if (!item.personRockId) continue;

    const group = groups.get(item.personRockId) ?? [];
    group.push(item);
    groups.set(item.personRockId, group);
  }

  return groups;
}

function latestGiftDate(
  facts: Array<{ effectiveMonth: Date; occurredAt: Date | null }>,
) {
  return facts
    .map((fact) => fact.occurredAt ?? fact.effectiveMonth)
    .sort((left, right) => right.getTime() - left.getTime())[0];
}

function distinctGivingMonths(facts: Array<{ effectiveMonth: Date }>) {
  return new Set(facts.map((fact) => monthKey(fact.effectiveMonth))).size;
}

function firstRecentMonthDate(referenceDate: Date) {
  return new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - 11),
  );
}

function latestTwelveMonthStarts(referenceDate: Date) {
  const currentMonth = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  );

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(currentMonth);
    date.setUTCMonth(currentMonth.getUTCMonth() - (11 - index));
    return date;
  });
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function formatShortMonth(date: Date) {
  if (date.getUTCFullYear() < new Date().getUTCFullYear()) {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      timeZone: "UTC",
      year: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function mapPersonRow(
  record: PersonListRecord,
  actor: LocalAppUser,
  givingSummaries: Map<number, GivingSummary>,
  givingPresence: Map<number, GivingPresenceMonth[]>,
  pledgeSummaries: Map<number, PledgeListSummary>,
  lifecycleLabels: Map<number, ListLifecycleLabel[]>,
  lastGiftMonths: Map<number, string>,
): PersonListRow {
  return {
    amountsHidden: !canSeeGivingAmounts(actor.role),
    deceased: record.deceased,
    displayName: displayName(record),
    email: record.email,
    emailActive: record.emailActive,
    givingSummary: canSeeGivingAmounts(actor.role)
      ? (givingSummaries.get(record.rockId) ?? null)
      : null,
    givingPresence: givingPresence.get(record.rockId) ?? [],
    pledgeSummary: hasPermission(actor.role, "pledges:manage")
      ? (pledgeSummaries.get(record.rockId) ?? null)
      : null,
    lastGiftMonth: lastGiftMonths.get(record.rockId) ?? null,
    lastSyncedAt: record.lastSyncedAt,
    lifecycle: lifecycleLabels.get(record.rockId) ?? [],
    openTaskCount: record._count.staffTasks,
    photoUrl: rockPersonPhotoPath(record.photoRockId),
    primaryCampus: record.primaryCampus,
    primaryHousehold: record.primaryHousehold,
    recordStatus: record.recordStatus?.value ?? null,
    connectionStatus: record.connectionStatus?.value ?? null,
    rockId: record.rockId,
  };
}

function assertCanReadLists(actor: LocalAppUser) {
  if (
    !hasPermission(actor.role, "people:read_limited") &&
    !hasPermission(actor.role, "people:read_care_context")
  ) {
    throw new GraphQLError("You do not have permission to view people lists.", {
      extensions: { code: "FORBIDDEN" },
    });
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

function filterIncludesAgeGroup(node: FilterNode): boolean {
  if (node.type === "condition") {
    return node.field === "ageGroup";
  }

  return node.conditions.some(filterIncludesAgeGroup);
}

function adultWhere(): Prisma.RockPersonWhereInput {
  return {
    householdMembers: {
      some: {
        archived: false,
        household: {
          active: true,
          archived: false,
        },
        groupRole: {
          name: {
            equals: "Adult",
            mode: "insensitive",
          },
        },
      },
    },
  };
}

function childWhere(): Prisma.RockPersonWhereInput {
  return {
    householdMembers: {
      some: {
        archived: false,
        household: {
          active: true,
          archived: false,
        },
        groupRole: {
          name: {
            equals: "Child",
            mode: "insensitive",
          },
        },
      },
    },
  };
}

function currentHouseholdMembershipWhere(): Prisma.RockPersonWhereInput {
  return {
    householdMembers: {
      some: {
        archived: false,
        household: {
          active: true,
          archived: false,
        },
      },
    },
  };
}

function ageGroupWhere(
  condition: FilterCondition,
): Prisma.RockPersonWhereInput {
  const values =
    condition.operator === "IN" && Array.isArray(condition.value)
      ? condition.value.map((value) => String(value).toUpperCase())
      : [String(condition.value).toUpperCase()];

  if (values.includes("ALL")) {
    return {};
  }

  const groups = values.map((value) =>
    value === "CHILD" || value === "CHILDREN" ? childWhere() : adultWhere(),
  );

  return groups.length === 1 ? groups[0] : { OR: groups };
}

function stringValue(condition: FilterCondition) {
  return String(condition.value ?? "").trim();
}

function nullableBooleanWhere(condition: FilterCondition) {
  return condition.operator === "EXISTS"
    ? condition.value
      ? { not: null }
      : null
    : Boolean(condition.value);
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
