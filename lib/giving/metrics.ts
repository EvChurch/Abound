import type {
  GiftReliabilityKind,
  GivingPledgePeriod,
  PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  GIVING_LIFECYCLE_KINDS,
  type GivingLifecycleKind,
} from "@/lib/giving/lifecycle";
import {
  getPlatformFundScope,
  platformFundScopeSourceExplanation,
  whereForEnabledPlatformFunds,
} from "@/lib/settings/funds";

export type GivingSummary = {
  totalGiven: string;
  accountSummaries: GivingAccountSummary[];
  firstGiftAt: Date | null;
  lastGiftAt: Date | null;
  lastGiftAmount: string | null;
  lastTwelveMonthsTotal: string;
  monthlyGiving: MonthlyGiving[];
  monthsWithGiving: number;
  reliabilityKinds: GiftReliabilityKind[];
  sourceExplanation: string;
};

export type GivingAccountSummary = GivingSummaryBase & {
  accountName: string;
  accountRockId: number | null;
};

type GivingSummaryBase = {
  totalGiven: string;
  firstGiftAt: Date | null;
  lastGiftAt: Date | null;
  lastGiftAmount: string | null;
  lastTwelveMonthsTotal: string;
  monthlyGiving: MonthlyGiving[];
  monthsWithGiving: number;
  reliabilityKinds: GiftReliabilityKind[];
  sourceExplanation: string;
};

export type MonthlyGiving = {
  giftCount: number;
  month: string;
  previousGiftCount: number;
  previousMonth: string;
  previousTotalGiven: string;
  totalGiven: string;
};

export type HouseholdDonorTrend = {
  atRiskHouseholdDonors: number;
  campusSeries: CampusHouseholdDonorSeries[];
  lifecycleCounts: LifecycleCounts;
  movement: HouseholdMovementSummary;
  months: MonthlyHouseholdDonorCount[];
  sourceExplanation: string;
  totalHouseholdDonors: number;
};

export type GivingPerAdult = {
  adultCount: number;
  averagePledge: string;
  medianPledge: string;
  monthlyAverage: string;
  monthlyMedian: string;
  pledgedAdultCount: number;
  sourceExplanation: string;
  totalGiven: string;
  windowEndedMonth: string;
  windowStartedMonth: string;
};

export type DashboardLifecycleKind = GivingLifecycleKind | "HEALTHY";

export type LifecycleCounts = Record<DashboardLifecycleKind, number>;

export type HouseholdMovementKind =
  | "DROPPED"
  | "NEW"
  | "REACTIVATED"
  | "RETAINED";

export type HouseholdMovementSummary = {
  campusSummaries: CampusHouseholdMovementSummary[];
  counts: Record<HouseholdMovementKind, number>;
  households: HouseholdMovementHousehold[];
  latestMonth: string | null;
  previousMonth: string | null;
  sourceExplanation: string;
};

export type CampusHouseholdMovementSummary = {
  campusName: string;
  campusRockId: number | null;
  campusShortCode: string | null;
  counts: Record<HouseholdMovementKind, number>;
};

export type HouseholdMovementHousehold = {
  campusName: string;
  campusRockId: number | null;
  campusShortCode: string | null;
  householdName: string;
  householdRockId: number;
  lastActiveMonth: string | null;
  movementKind: HouseholdMovementKind;
};

export type CampusHouseholdDonorSeries = {
  atRiskHouseholdDonors: number;
  campusName: string;
  campusRockId: number | null;
  campusShortCode: string | null;
  months: MonthlyHouseholdDonorCount[];
  totalHouseholdDonors: number;
};

export type MonthlyHouseholdDonorCount = {
  householdDonorCount: number;
  month: string;
};

type GivingFactForSummary = {
  accountRockId: number | null;
  amount: unknown;
  occurredAt: Date | null;
  effectiveMonth: Date;
  reliabilityKind: GiftReliabilityKind;
};

type GivingFactForHouseholdDonorTrend = {
  campusRockId: number | null;
  effectiveMonth: Date;
  household?: {
    campusRockId: number | null;
    name?: string | null;
  } | null;
  householdRockId: number | null;
};

type GivingFactForAverageGivingPerAdult = {
  amount: unknown;
  householdRockId: number | null;
};

type HouseholdMemberForAverageGivingPerAdult = {
  archived: boolean;
  groupRole: {
    name: string;
  } | null;
  householdRockId: number;
  personRockId: number;
};

type PledgeForGivingPerAdult = {
  amount: unknown;
  period: GivingPledgePeriod;
  personRockId: number;
};

type CampusName = {
  name: string;
  shortCode: string | null;
};

const SOURCE_EXPLANATION =
  "Derived from local GivingFact rows synced from Rock.";

const HOUSEHOLD_DONOR_SOURCE_EXPLANATION =
  "Each household is counted once per month, grouped by campus.";

const HOUSEHOLD_MOVEMENT_SOURCE_EXPLANATION =
  "Compares distinct household donors in the latest completed month with the prior completed month.";

const GIVING_PER_ADULT_SOURCE_EXPLANATION =
  "Total platform-fund giving for the last 12 completed months divided by active Adult household members in households that gave during that window.";

const emptyMovementCounts = (): Record<HouseholdMovementKind, number> => ({
  DROPPED: 0,
  NEW: 0,
  REACTIVATED: 0,
  RETAINED: 0,
});

const emptyLifecycleCounts = (): LifecycleCounts => ({
  AT_RISK: 0,
  DROPPED: 0,
  HEALTHY: 0,
  NEW: 0,
  REACTIVATED: 0,
});

export async function getPersonGivingSummary(
  personRockId: number,
  client: PrismaClient = prisma,
) {
  const fundScope = await getPlatformFundScope(client);
  const facts = await client.givingFact.findMany({
    orderBy: [{ occurredAt: "asc" }, { effectiveMonth: "asc" }, { id: "asc" }],
    select: givingFactSummarySelect,
    where: {
      personRockId,
      ...whereForEnabledPlatformFunds(fundScope),
    },
  });

  return withPlatformFundSourceExplanation(
    summarizeGivingFacts(
      facts,
      new Date(),
      await accountNamesForFacts(facts, client),
    ),
    fundScope,
  );
}

export async function getHouseholdGivingSummary(
  householdRockId: number,
  client: PrismaClient = prisma,
) {
  const fundScope = await getPlatformFundScope(client);
  const facts = await client.givingFact.findMany({
    orderBy: [{ occurredAt: "asc" }, { effectiveMonth: "asc" }, { id: "asc" }],
    select: givingFactSummarySelect,
    where: {
      householdRockId,
      ...whereForEnabledPlatformFunds(fundScope),
    },
  });

  return withPlatformFundSourceExplanation(
    summarizeGivingFacts(
      facts,
      new Date(),
      await accountNamesForFacts(facts, client),
    ),
    fundScope,
  );
}

export async function getHouseholdDonorTrend(
  referenceDate = new Date(),
  client: PrismaClient = prisma,
) {
  const fundScope = await getPlatformFundScope(client);
  const monthKeys = lastTwentyFourCompletedMonthKeys(referenceDate);
  const startMonth = parseMonthKey(monthKeys[0] ?? monthKey(referenceDate));
  const endMonth = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  );
  const facts = await client.givingFact.findMany({
    select: {
      campusRockId: true,
      effectiveMonth: true,
      household: {
        select: {
          campusRockId: true,
          name: true,
        },
      },
      householdRockId: true,
    },
    where: {
      ...whereForEnabledPlatformFunds(fundScope),
      effectiveMonth: {
        gte: startMonth,
        lt: endMonth,
      },
      householdRockId: {
        not: null,
      },
    },
  });

  return withPlatformFundTrendSourceExplanation(
    summarizeHouseholdDonorTrend(
      facts,
      referenceDate,
      await campusNamesForFacts(facts, client),
      await personLifecycleCounts(client, fundScope, referenceDate),
    ),
    fundScope,
  );
}

export async function getGivingPerAdult(
  referenceDate = new Date(),
  client: PrismaClient = prisma,
) {
  const fundScope = await getPlatformFundScope(client);
  const monthKeys = lastTwelveCompletedMonthKeys(referenceDate);
  const startMonth = parseMonthKey(monthKeys[0] ?? monthKey(referenceDate));
  const endMonth = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  );
  const [facts, pledges] = await Promise.all([
    client.givingFact.findMany({
      select: {
        amount: true,
        householdRockId: true,
      },
      where: {
        ...whereForEnabledPlatformFunds(fundScope),
        effectiveMonth: {
          gte: startMonth,
          lt: endMonth,
        },
        householdRockId: {
          not: null,
        },
      },
    }),
    client.givingPledge.findMany({
      select: {
        amount: true,
        period: true,
        personRockId: true,
      },
      where: {
        ...whereForEnabledPlatformFunds(fundScope),
        status: "ACTIVE",
      },
    }),
  ]);
  const householdRockIds = distinctIntegerValues(
    facts.map((fact) => fact.householdRockId),
  );
  const adultMembers =
    householdRockIds.length === 0
      ? []
      : await client.rockHouseholdMember.findMany({
          select: {
            archived: true,
            groupRole: {
              select: {
                name: true,
              },
            },
            householdRockId: true,
            personRockId: true,
          },
          where: {
            archived: false,
            groupRole: {
              name: {
                equals: "Adult",
                mode: "insensitive",
              },
            },
            household: {
              active: true,
              archived: false,
            },
            householdRockId: {
              in: householdRockIds,
            },
          },
        });

  return withPlatformFundAverageSourceExplanation(
    summarizeGivingPerAdult(facts, adultMembers, pledges, monthKeys),
    fundScope,
  );
}

export function summarizeGivingFacts(
  facts: GivingFactForSummary[],
  referenceDate = new Date(),
  accountNames = new Map<number, string>(),
): GivingSummary {
  const summary = summarizeGivingFactTotals(facts, referenceDate);

  return {
    ...summary,
    accountSummaries: summarizeGivingFactsByAccount(
      facts,
      referenceDate,
      accountNames,
    ),
  };
}

export function summarizeGivingPerAdult(
  facts: GivingFactForAverageGivingPerAdult[],
  adultMembers: HouseholdMemberForAverageGivingPerAdult[],
  pledges: PledgeForGivingPerAdult[],
  monthKeys: string[],
): GivingPerAdult {
  const factsWithHouseholds = facts.filter(
    (fact) =>
      typeof fact.householdRockId === "number" &&
      Number.isInteger(fact.householdRockId),
  );
  const adultPersonRockIds = new Set<number>();
  const adultPersonRockIdsByHousehold = new Map<number, Set<number>>();
  const householdGivingCents = new Map<number, bigint>();
  const totalCents = factsWithHouseholds.reduce((total, fact) => {
    const householdRockId = fact.householdRockId!;
    const amountCents = decimalToCents(fact.amount);

    householdGivingCents.set(
      householdRockId,
      (householdGivingCents.get(householdRockId) ?? 0n) + amountCents,
    );

    return total + amountCents;
  }, 0n);

  for (const member of adultMembers) {
    if (
      member.archived ||
      member.groupRole?.name.trim().toLowerCase() !== "adult"
    ) {
      continue;
    }

    adultPersonRockIds.add(member.personRockId);
    const householdAdults =
      adultPersonRockIdsByHousehold.get(member.householdRockId) ??
      new Set<number>();

    householdAdults.add(member.personRockId);
    adultPersonRockIdsByHousehold.set(member.householdRockId, householdAdults);
  }

  const adultCount = adultPersonRockIds.size;
  const monthlyAverageCents =
    adultCount > 0 ? divideCents(totalCents, BigInt(adultCount * 12)) : 0n;
  const monthlyGivingPerAdultCents = Array.from(
    householdGivingCents.entries(),
  ).flatMap(([householdRockId, householdTotalCents]) => {
    const householdAdultCount =
      adultPersonRockIdsByHousehold.get(householdRockId)?.size ?? 0;

    if (householdAdultCount === 0) {
      return [];
    }

    const monthlyAdultCents = divideCents(
      householdTotalCents,
      BigInt(householdAdultCount * 12),
    );

    return Array.from({ length: householdAdultCount }, () => monthlyAdultCents);
  });
  const pledgeCentsByPerson = new Map<number, bigint>();

  for (const pledge of pledges) {
    const monthlyCents = pledgeAmountToMonthlyCents(
      decimalToCents(pledge.amount),
      pledge.period,
    );

    pledgeCentsByPerson.set(
      pledge.personRockId,
      (pledgeCentsByPerson.get(pledge.personRockId) ?? 0n) + monthlyCents,
    );
  }

  const monthlyPledgeCents = Array.from(pledgeCentsByPerson.values());

  return {
    adultCount,
    averagePledge: centsToDecimalString(averageCents(monthlyPledgeCents)),
    medianPledge: centsToDecimalString(medianCents(monthlyPledgeCents)),
    monthlyAverage: centsToDecimalString(monthlyAverageCents),
    monthlyMedian: centsToDecimalString(
      medianCents(monthlyGivingPerAdultCents),
    ),
    pledgedAdultCount: pledgeCentsByPerson.size,
    sourceExplanation: GIVING_PER_ADULT_SOURCE_EXPLANATION,
    totalGiven: centsToDecimalString(totalCents),
    windowEndedMonth: monthKeys.at(-1) ?? "",
    windowStartedMonth: monthKeys[0] ?? "",
  };
}

function withPlatformFundSourceExplanation(
  summary: GivingSummary,
  scope: Awaited<ReturnType<typeof getPlatformFundScope>>,
) {
  return {
    ...summary,
    sourceExplanation:
      summary.sourceExplanation + platformFundScopeSourceExplanation(scope),
    accountSummaries: summary.accountSummaries.map((accountSummary) => ({
      ...accountSummary,
      sourceExplanation:
        accountSummary.sourceExplanation +
        platformFundScopeSourceExplanation(scope),
    })),
  };
}

function withPlatformFundAverageSourceExplanation(
  summary: GivingPerAdult,
  scope: Awaited<ReturnType<typeof getPlatformFundScope>>,
) {
  return {
    ...summary,
    sourceExplanation:
      summary.sourceExplanation + platformFundScopeSourceExplanation(scope),
  };
}

function withPlatformFundTrendSourceExplanation(
  trend: HouseholdDonorTrend,
  scope: Awaited<ReturnType<typeof getPlatformFundScope>>,
) {
  return {
    ...trend,
    sourceExplanation:
      trend.sourceExplanation + platformFundScopeSourceExplanation(scope),
  };
}

export function summarizeHouseholdDonorTrend(
  facts: GivingFactForHouseholdDonorTrend[],
  referenceDate = new Date(),
  campusNames = new Map<number, CampusName>(),
  lifecycleCounts = emptyLifecycleCounts(),
): HouseholdDonorTrend {
  const monthKeys = lastTwentyFourCompletedMonthKeys(referenceDate);
  const monthKeySet = new Set(monthKeys);
  const householdIdsByMonth = new Map<string, Set<number>>();
  const atRiskSummary = summarizeAtRiskHouseholds(facts, monthKeys);
  const campusBuckets = new Map<
    string,
    {
      campusRockId: number | null;
      householdIds: Set<number>;
      householdIdsByMonth: Map<string, Set<number>>;
    }
  >();
  const totalHouseholdIds = new Set<number>();

  for (const fact of facts) {
    const householdRockId = fact.householdRockId;

    if (
      typeof householdRockId !== "number" ||
      !Number.isInteger(householdRockId)
    ) {
      continue;
    }

    const factMonthKey = monthKey(fact.effectiveMonth);

    if (!monthKeySet.has(factMonthKey)) {
      continue;
    }

    const monthHouseholdIds =
      householdIdsByMonth.get(factMonthKey) ?? new Set();

    monthHouseholdIds.add(householdRockId);
    householdIdsByMonth.set(factMonthKey, monthHouseholdIds);
    totalHouseholdIds.add(householdRockId);

    const campusRockId = resolveFactCampusRockId(fact);
    const campusKey = String(campusRockId ?? "unassigned");
    const campusBucket = campusBuckets.get(campusKey) ?? {
      campusRockId,
      householdIds: new Set<number>(),
      householdIdsByMonth: new Map<string, Set<number>>(),
    };
    const campusMonthHouseholdIds =
      campusBucket.householdIdsByMonth.get(factMonthKey) ?? new Set<number>();

    campusBucket.householdIds.add(householdRockId);
    campusMonthHouseholdIds.add(householdRockId);
    campusBucket.householdIdsByMonth.set(factMonthKey, campusMonthHouseholdIds);
    campusBuckets.set(campusKey, campusBucket);
  }

  return {
    atRiskHouseholdDonors: atRiskSummary.totalHouseholds,
    campusSeries: Array.from(campusBuckets.values())
      .map((bucket) => {
        const campusName =
          bucket.campusRockId === null
            ? "Unassigned campus"
            : (campusNames.get(bucket.campusRockId)?.name ??
              `Campus ${bucket.campusRockId}`);
        const campusShortCode =
          bucket.campusRockId === null
            ? null
            : (campusNames.get(bucket.campusRockId)?.shortCode ?? null);

        return {
          atRiskHouseholdDonors:
            atRiskSummary.householdIdsByCampusKey.get(
              String(bucket.campusRockId ?? "unassigned"),
            )?.size ?? 0,
          campusName,
          campusRockId: bucket.campusRockId,
          campusShortCode,
          months: monthKeys.map((key) => ({
            householdDonorCount: bucket.householdIdsByMonth.get(key)?.size ?? 0,
            month: key,
          })),
          totalHouseholdDonors: bucket.householdIds.size,
        };
      })
      .sort((left, right) => {
        return (
          right.totalHouseholdDonors - left.totalHouseholdDonors ||
          left.campusName.localeCompare(right.campusName, "en-US", {
            sensitivity: "base",
          }) ||
          (left.campusRockId ?? Number.MAX_SAFE_INTEGER) -
            (right.campusRockId ?? Number.MAX_SAFE_INTEGER)
        );
      }),
    movement: summarizeHouseholdMovement(facts, monthKeys, campusNames),
    lifecycleCounts,
    months: monthKeys.map((key) => ({
      householdDonorCount: householdIdsByMonth.get(key)?.size ?? 0,
      month: key,
    })),
    sourceExplanation: HOUSEHOLD_DONOR_SOURCE_EXPLANATION,
    totalHouseholdDonors: totalHouseholdIds.size,
  };
}

async function personLifecycleCounts(
  client: PrismaClient,
  fundScope: Awaited<ReturnType<typeof getPlatformFundScope>>,
  referenceDate: Date,
) {
  try {
    const [snapshotRows, factRows] = await Promise.all([
      client.givingLifecycleSnapshot.findMany({
        select: {
          lifecycle: true,
          personRockId: true,
        },
        where: {
          personRockId: {
            not: null,
          },
          resource: "PERSON",
        },
      }),
      client.givingFact.findMany({
        orderBy: [{ occurredAt: "asc" }, { effectiveMonth: "asc" }],
        select: {
          effectiveMonth: true,
          occurredAt: true,
          personRockId: true,
        },
        where: {
          ...whereForEnabledPlatformFunds(fundScope),
          personRockId: {
            not: null,
          },
        },
      }),
    ]);
    const personIdsByLifecycle = new Map<GivingLifecycleKind, Set<number>>();
    const personIdsWithLifecycle = new Set<number>();

    for (const row of snapshotRows) {
      if (row.personRockId && GIVING_LIFECYCLE_KINDS.includes(row.lifecycle)) {
        const people = personIdsByLifecycle.get(row.lifecycle) ?? new Set();
        people.add(row.personRockId);
        personIdsByLifecycle.set(row.lifecycle, people);
        personIdsWithLifecycle.add(row.personRockId);
      }
    }
    const counts = emptyLifecycleCounts();

    for (const lifecycle of GIVING_LIFECYCLE_KINDS) {
      counts[lifecycle] = personIdsByLifecycle.get(lifecycle)?.size ?? 0;
    }

    counts.HEALTHY = healthyPersonCount({
      factRows,
      personIdsWithLifecycle,
      referenceDate,
    });

    return counts;
  } catch (error) {
    if (isMissingLifecycleSnapshotTable(error)) {
      return emptyLifecycleCounts();
    }

    throw error;
  }
}

function healthyPersonCount({
  factRows,
  personIdsWithLifecycle,
  referenceDate,
}: {
  factRows: Array<{
    effectiveMonth: Date;
    occurredAt: Date | null;
    personRockId: number | null;
  }>;
  personIdsWithLifecycle: Set<number>;
  referenceDate: Date;
}) {
  const recentStart = subtractDays(referenceDate, 90);
  const latestGiftAtByPerson = new Map<number, Date>();

  for (const fact of factRows) {
    if (!fact.personRockId) {
      continue;
    }

    const giftAt = fact.occurredAt ?? fact.effectiveMonth;
    const currentLatest = latestGiftAtByPerson.get(fact.personRockId);

    if (!currentLatest || giftAt > currentLatest) {
      latestGiftAtByPerson.set(fact.personRockId, giftAt);
    }
  }

  return Array.from(latestGiftAtByPerson.entries()).filter(
    ([personRockId, latestGiftAt]) =>
      latestGiftAt >= recentStart &&
      latestGiftAt <= referenceDate &&
      !personIdsWithLifecycle.has(personRockId),
  ).length;
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function summarizeAtRiskHouseholds(
  facts: GivingFactForHouseholdDonorTrend[],
  monthKeys: string[],
) {
  const latestMonth = monthKeys.at(-1) ?? null;
  const recentBaseMonthKeys = monthKeys.slice(-4, -1);

  if (!latestMonth || recentBaseMonthKeys.length === 0) {
    return {
      householdIdsByCampusKey: new Map<string, Set<number>>(),
      totalHouseholds: 0,
    };
  }

  const latestHouseholdIds = new Set<number>();
  const recentBaseMonthKeySet = new Set(recentBaseMonthKeys);
  const recentHouseholds = new Map<
    number,
    {
      campusRockId: number | null;
    }
  >();

  for (const fact of facts) {
    const householdRockId = fact.householdRockId;

    if (
      typeof householdRockId !== "number" ||
      !Number.isInteger(householdRockId)
    ) {
      continue;
    }

    const factMonthKey = monthKey(fact.effectiveMonth);

    if (factMonthKey === latestMonth) {
      latestHouseholdIds.add(householdRockId);
      continue;
    }

    if (!recentBaseMonthKeySet.has(factMonthKey)) {
      continue;
    }

    const campusRockId = resolveFactCampusRockId(fact);
    const household = recentHouseholds.get(householdRockId) ?? {
      campusRockId,
    };

    if (household.campusRockId === null && campusRockId !== null) {
      household.campusRockId = campusRockId;
    }

    recentHouseholds.set(householdRockId, household);
  }

  const householdIdsByCampusKey = new Map<string, Set<number>>();
  let totalHouseholds = 0;

  for (const [householdRockId, household] of recentHouseholds) {
    if (latestHouseholdIds.has(householdRockId)) {
      continue;
    }

    const campusKey = String(household.campusRockId ?? "unassigned");
    const campusHouseholds =
      householdIdsByCampusKey.get(campusKey) ?? new Set<number>();

    campusHouseholds.add(householdRockId);
    householdIdsByCampusKey.set(campusKey, campusHouseholds);
    totalHouseholds += 1;
  }

  return {
    householdIdsByCampusKey,
    totalHouseholds,
  };
}

function summarizeHouseholdMovement(
  facts: GivingFactForHouseholdDonorTrend[],
  monthKeys: string[],
  campusNames: Map<number, CampusName>,
): HouseholdMovementSummary {
  const latestMonth = monthKeys.at(-1) ?? null;
  const previousMonth = monthKeys.at(-2) ?? null;

  if (!latestMonth || !previousMonth) {
    return {
      campusSummaries: [],
      counts: emptyMovementCounts(),
      households: [],
      latestMonth,
      previousMonth,
      sourceExplanation: HOUSEHOLD_MOVEMENT_SOURCE_EXPLANATION,
    };
  }

  const monthKeySet = new Set(monthKeys);
  const households = new Map<
    number,
    {
      campusRockId: number | null;
      householdName: string;
      months: Set<string>;
    }
  >();

  for (const fact of facts) {
    const householdRockId = fact.householdRockId;

    if (
      typeof householdRockId !== "number" ||
      !Number.isInteger(householdRockId)
    ) {
      continue;
    }

    const factMonthKey = monthKey(fact.effectiveMonth);

    if (!monthKeySet.has(factMonthKey)) {
      continue;
    }

    const existing = households.get(householdRockId);
    const campusRockId = resolveFactCampusRockId(fact);
    const householdName =
      fact.household?.name ?? `Household ${householdRockId}`;
    const household = existing ?? {
      campusRockId,
      householdName,
      months: new Set<string>(),
    };

    household.months.add(factMonthKey);

    if (household.campusRockId === null && campusRockId !== null) {
      household.campusRockId = campusRockId;
    }

    if (household.householdName === `Household ${householdRockId}`) {
      household.householdName = householdName;
    }

    households.set(householdRockId, household);
  }

  const counts = emptyMovementCounts();
  const campusSummaries = new Map<
    string,
    {
      campusRockId: number | null;
      counts: Record<HouseholdMovementKind, number>;
    }
  >();
  const movementHouseholds: HouseholdMovementHousehold[] = [];

  for (const [householdRockId, household] of households) {
    const movementKind = classifyHouseholdMovement(
      household.months,
      latestMonth,
      previousMonth,
    );

    if (!movementKind) {
      continue;
    }

    counts[movementKind] += 1;

    const campusKey = String(household.campusRockId ?? "unassigned");
    const campusSummary = campusSummaries.get(campusKey) ?? {
      campusRockId: household.campusRockId,
      counts: emptyMovementCounts(),
    };

    campusSummary.counts[movementKind] += 1;
    campusSummaries.set(campusKey, campusSummary);

    const campusDetails = campusDetailsForRockId(
      household.campusRockId,
      campusNames,
    );

    movementHouseholds.push({
      campusName: campusDetails.campusName,
      campusRockId: household.campusRockId,
      campusShortCode: campusDetails.campusShortCode,
      householdName: household.householdName,
      householdRockId,
      lastActiveMonth: latestActiveMonthBefore(
        household.months,
        movementKind === "DROPPED" || movementKind === "RETAINED"
          ? latestMonth
          : previousMonth,
      ),
      movementKind,
    });
  }

  return {
    campusSummaries: Array.from(campusSummaries.values())
      .map((summary) => ({
        ...campusDetailsForRockId(summary.campusRockId, campusNames),
        campusRockId: summary.campusRockId,
        counts: summary.counts,
      }))
      .sort(compareMovementCampusSummaries),
    counts,
    households: movementHouseholds.sort(compareMovementHouseholds),
    latestMonth,
    previousMonth,
    sourceExplanation: HOUSEHOLD_MOVEMENT_SOURCE_EXPLANATION,
  };
}

function classifyHouseholdMovement(
  months: Set<string>,
  latestMonth: string,
  previousMonth: string,
): HouseholdMovementKind | null {
  const hasLatest = months.has(latestMonth);
  const hasPrevious = months.has(previousMonth);

  if (hasLatest && hasPrevious) {
    return "RETAINED";
  }

  if (!hasLatest && hasPrevious) {
    return "DROPPED";
  }

  if (!hasLatest) {
    return null;
  }

  const hadEarlierActivity = Array.from(months).some(
    (month) => month !== latestMonth && month !== previousMonth,
  );

  return hadEarlierActivity ? "REACTIVATED" : "NEW";
}

function latestActiveMonthBefore(months: Set<string>, beforeMonth: string) {
  return (
    Array.from(months)
      .filter((month) => month < beforeMonth)
      .sort()
      .at(-1) ?? null
  );
}

function campusDetailsForRockId(
  campusRockId: number | null,
  campusNames: Map<number, CampusName>,
) {
  if (campusRockId === null) {
    return {
      campusName: "Unassigned campus",
      campusShortCode: null,
    };
  }

  const campusName =
    campusNames.get(campusRockId)?.name ?? `Campus ${campusRockId}`;
  const campusShortCode = campusNames.get(campusRockId)?.shortCode ?? null;

  return {
    campusName,
    campusShortCode,
  };
}

function compareMovementCampusSummaries(
  left: CampusHouseholdMovementSummary,
  right: CampusHouseholdMovementSummary,
) {
  return (
    right.counts.DROPPED - left.counts.DROPPED ||
    right.counts.REACTIVATED - left.counts.REACTIVATED ||
    left.campusName.localeCompare(right.campusName, "en-US", {
      sensitivity: "base",
    }) ||
    (left.campusRockId ?? Number.MAX_SAFE_INTEGER) -
      (right.campusRockId ?? Number.MAX_SAFE_INTEGER)
  );
}

function compareMovementHouseholds(
  left: HouseholdMovementHousehold,
  right: HouseholdMovementHousehold,
) {
  return (
    movementSortOrder(left.movementKind) -
      movementSortOrder(right.movementKind) ||
    left.campusName.localeCompare(right.campusName, "en-US", {
      sensitivity: "base",
    }) ||
    left.householdName.localeCompare(right.householdName, "en-US", {
      sensitivity: "base",
    }) ||
    left.householdRockId - right.householdRockId
  );
}

function movementSortOrder(kind: HouseholdMovementKind) {
  return {
    DROPPED: 0,
    REACTIVATED: 1,
    NEW: 2,
    RETAINED: 3,
  }[kind];
}

function summarizeGivingFactTotals(
  facts: GivingFactForSummary[],
  referenceDate: Date,
): GivingSummaryBase {
  let totalCents = 0n;
  let lastTwelveMonthsTotalCents = 0n;
  let lastFact: GivingFactForSummary | null = null;
  const months = new Set<string>();
  const monthlyTotals = new Map<
    string,
    { giftCount: number; totalCents: bigint }
  >();
  const reliabilityKinds = new Set<GiftReliabilityKind>();
  const recentMonthKeys = lastTwelveMonthKeys(referenceDate);
  const recentMonthKeySet = new Set(recentMonthKeys);
  const previousMonthByRecentMonth = new Map(
    recentMonthKeys.map((key) => [key, offsetMonthKey(key, -12)]),
  );
  const recentMonthByPreviousMonth = new Map(
    Array.from(previousMonthByRecentMonth.entries()).map(
      ([recent, previous]) => [previous, recent],
    ),
  );

  for (const fact of facts) {
    const amountCents = decimalToCents(fact.amount);
    const factMonthKey = monthKey(fact.effectiveMonth);

    totalCents += amountCents;
    months.add(factMonthKey);
    reliabilityKinds.add(fact.reliabilityKind);

    if (recentMonthKeySet.has(factMonthKey)) {
      const month = monthlyTotals.get(factMonthKey) ?? {
        giftCount: 0,
        totalCents: 0n,
      };

      month.giftCount += 1;
      month.totalCents += amountCents;
      monthlyTotals.set(factMonthKey, month);
      lastTwelveMonthsTotalCents += amountCents;
    }

    const recentMonthForPreviousFact =
      recentMonthByPreviousMonth.get(factMonthKey);

    if (recentMonthForPreviousFact) {
      const previousMonthKey =
        previousMonthByRecentMonth.get(recentMonthForPreviousFact) ??
        factMonthKey;
      const previousMonth = monthlyTotals.get(previousMonthKey) ?? {
        giftCount: 0,
        totalCents: 0n,
      };

      previousMonth.giftCount += 1;
      previousMonth.totalCents += amountCents;
      monthlyTotals.set(previousMonthKey, previousMonth);
    }

    if (!lastFact || giftDate(fact).getTime() >= giftDate(lastFact).getTime()) {
      lastFact = fact;
    }
  }

  return {
    totalGiven: centsToDecimalString(totalCents),
    firstGiftAt: facts[0] ? giftDate(facts[0]) : null,
    lastGiftAmount: lastFact
      ? centsToDecimalString(decimalToCents(lastFact.amount))
      : null,
    lastGiftAt: lastFact ? giftDate(lastFact) : null,
    lastTwelveMonthsTotal: centsToDecimalString(lastTwelveMonthsTotalCents),
    monthlyGiving: recentMonthKeys.map((key) => {
      const month = monthlyTotals.get(key);
      const previousMonthKey = previousMonthByRecentMonth.get(key) ?? key;
      const previousMonth = monthlyTotals.get(previousMonthKey);

      return {
        giftCount: month?.giftCount ?? 0,
        month: key,
        previousGiftCount: previousMonth?.giftCount ?? 0,
        previousMonth: previousMonthKey,
        previousTotalGiven: centsToDecimalString(
          previousMonth?.totalCents ?? 0n,
        ),
        totalGiven: centsToDecimalString(month?.totalCents ?? 0n),
      };
    }),
    monthsWithGiving: months.size,
    reliabilityKinds: Array.from(reliabilityKinds).sort(),
    sourceExplanation: SOURCE_EXPLANATION,
  };
}

const givingFactSummarySelect = {
  accountRockId: true,
  amount: true,
  effectiveMonth: true,
  id: true,
  occurredAt: true,
  reliabilityKind: true,
} as const;

async function accountNamesForFacts(
  facts: GivingFactForSummary[],
  client: PrismaClient,
) {
  const accountIds = Array.from(
    new Set(
      facts
        .map((fact) => fact.accountRockId)
        .filter((accountRockId): accountRockId is number =>
          Number.isInteger(accountRockId),
        ),
    ),
  );

  if (accountIds.length === 0) {
    return new Map<number, string>();
  }

  const accounts = await client.rockFinancialAccount.findMany({
    select: {
      name: true,
      rockId: true,
    },
    where: {
      rockId: {
        in: accountIds,
      },
    },
  });

  return new Map(
    accounts.map((account) => [account.rockId, account.name] as const),
  );
}

async function campusNamesForFacts(
  facts: GivingFactForHouseholdDonorTrend[],
  client: PrismaClient,
) {
  const campusIds = Array.from(
    new Set(
      facts
        .map(resolveFactCampusRockId)
        .filter(
          (campusRockId): campusRockId is number =>
            typeof campusRockId === "number" && Number.isInteger(campusRockId),
        ),
    ),
  );

  if (campusIds.length === 0) {
    return new Map<number, CampusName>();
  }

  const campuses = await client.rockCampus.findMany({
    select: {
      name: true,
      rockId: true,
      shortCode: true,
    },
    where: {
      rockId: {
        in: campusIds,
      },
    },
  });

  return new Map(
    campuses.map((campus) => [
      campus.rockId,
      { name: campus.name, shortCode: campus.shortCode },
    ]),
  );
}

function resolveFactCampusRockId(fact: GivingFactForHouseholdDonorTrend) {
  return fact.campusRockId ?? fact.household?.campusRockId ?? null;
}

function summarizeGivingFactsByAccount(
  facts: GivingFactForSummary[],
  referenceDate: Date,
  accountNames: Map<number, string>,
): GivingAccountSummary[] {
  const factsByAccount = new Map<string, GivingFactForSummary[]>();

  for (const fact of facts) {
    const key = String(fact.accountRockId ?? "unknown");
    const accountFacts = factsByAccount.get(key) ?? [];

    accountFacts.push(fact);
    factsByAccount.set(key, accountFacts);
  }

  return Array.from(factsByAccount.values())
    .map((accountFacts) => {
      const accountRockId = accountFacts[0]?.accountRockId ?? null;
      const summary = summarizeGivingFactTotals(accountFacts, referenceDate);

      return {
        ...summary,
        accountName:
          accountRockId === null
            ? "Unknown account"
            : (accountNames.get(accountRockId) ?? `Account ${accountRockId}`),
        accountRockId,
      };
    })
    .sort((left, right) => {
      return (
        left.accountName.localeCompare(right.accountName, "en-US", {
          sensitivity: "base",
        }) || (left.accountRockId ?? 0) - (right.accountRockId ?? 0)
      );
    });
}

function giftDate(fact: GivingFactForSummary) {
  return fact.occurredAt ?? fact.effectiveMonth;
}

function monthKey(value: Date) {
  return value.toISOString().slice(0, 7);
}

function lastTwelveMonthKeys(referenceDate: Date) {
  return lastMonthKeys(referenceDate, 12);
}

function lastTwelveCompletedMonthKeys(referenceDate: Date) {
  const completedReferenceDate = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth() - 1,
      1,
    ),
  );

  return lastMonthKeys(completedReferenceDate, 12);
}

function lastTwentyFourCompletedMonthKeys(referenceDate: Date) {
  const completedReferenceDate = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth() - 1,
      1,
    ),
  );

  return lastMonthKeys(completedReferenceDate, 24);
}

function lastMonthKeys(referenceDate: Date, count: number) {
  const start = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth() - (count - 1),
      1,
    ),
  );

  return Array.from({ length: count }, (_, index) => {
    return monthKey(
      new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1),
      ),
    );
  });
}

function parseMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, 1));
}

function offsetMonthKey(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);

  return monthKey(new Date(Date.UTC(year, month - 1 + offset, 1)));
}

function isMissingLifecycleSnapshotTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2021"
  );
}

function decimalToCents(value: unknown) {
  const [whole = "0", fractional = ""] = String(value).split(".");
  const sign = whole.startsWith("-") ? -1n : 1n;
  const normalizedWhole = whole.replace("-", "") || "0";
  const normalizedFractional = `${fractional}00`.slice(0, 2);

  return (
    sign *
    (BigInt(normalizedWhole) * 100n + BigInt(normalizedFractional || "0"))
  );
}

function divideCents(cents: bigint, divisor: bigint) {
  if (divisor <= 0n) {
    return 0n;
  }

  const sign = cents < 0n ? -1n : 1n;
  const absolute = cents < 0n ? -cents : cents;

  return sign * ((absolute + divisor / 2n) / divisor);
}

function averageCents(values: bigint[]) {
  if (values.length === 0) {
    return 0n;
  }

  return divideCents(sumBigInts(values), BigInt(values.length));
}

function medianCents(values: bigint[]) {
  if (values.length === 0) {
    return 0n;
  }

  const sorted = [...values].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0n;
  }

  return divideCents((sorted[middle - 1] ?? 0n) + (sorted[middle] ?? 0n), 2n);
}

function pledgeAmountToMonthlyCents(
  amountCents: bigint,
  period: GivingPledgePeriod,
) {
  switch (period) {
    case "WEEKLY":
      return divideCents(amountCents * 52n, 12n);
    case "FORTNIGHTLY":
      return divideCents(amountCents * 26n, 12n);
    case "MONTHLY":
      return amountCents;
    case "QUARTERLY":
      return divideCents(amountCents, 3n);
    case "ANNUALLY":
      return divideCents(amountCents, 12n);
  }
}

function sumBigInts(values: bigint[]) {
  return values.reduce((total, value) => total + value, 0n);
}

function distinctIntegerValues(values: Array<number | null | undefined>) {
  return Array.from(
    new Set(
      values.filter(
        (value): value is number =>
          typeof value === "number" && Number.isInteger(value),
      ),
    ),
  );
}

function centsToDecimalString(cents: bigint) {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  const whole = absolute / 100n;
  const fractional = String(absolute % 100n).padStart(2, "0");

  return `${sign}${whole}.${fractional}`;
}
