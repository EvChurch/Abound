import { GraphQLError } from "graphql";
import type {
  GivingPledgePeriod,
  GivingPledgeRecommendationDecisionStatus,
  GivingPledgeSource,
  GivingPledgeStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { requireAppPermission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/roles";
import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import {
  getPlatformFundScope,
  whereForEnabledPlatformFunds,
} from "@/lib/settings/funds";

const ACTIVE_MONTH_THRESHOLD = 8;
const INSUFFICIENT_HISTORY_THRESHOLD = 4;
const DEFAULT_CANDIDATE_LIMIT = 50;
const MAX_CANDIDATE_LIMIT = 200;
const MATERIAL_RECOMMENDATION_CHANGE_RATIO = 0.2;
const MIN_CADENCE_GIFT_COUNT = 6;
const SOURCE_EXPLANATION =
  "Derived from local GivingFact rows synced from Rock. This is a review recommendation, not donor-submitted intent or payment setup.";

export type PledgeAnalysisStatus =
  | "RECOMMENDED"
  | "REJECTED"
  | "ACTIVE_PLEDGE_EXISTS"
  | "DRAFT_EXISTS"
  | "INSUFFICIENT_HISTORY"
  | "NO_CONSISTENT_PATTERN";

export type PledgeConfidence = "HIGH" | "MEDIUM" | "LOW";

export type PledgeFund = {
  active: boolean;
  name: string;
  rockId: number;
};

export type GivingPledgeRecord = {
  id: string;
  personRockId: number;
  accountRockId: number;
  accountName: string;
  amount: string;
  period: GivingPledgePeriod;
  status: GivingPledgeStatus;
  source: GivingPledgeSource;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PledgeAnalysisRow = {
  account: PledgeFund;
  status: PledgeAnalysisStatus;
  confidence: PledgeConfidence | null;
  basisMonths: number;
  lastGiftAt: Date | null;
  lastTwelveMonthsTotal: string;
  recommendedAmount: string | null;
  recommendedPeriod: GivingPledgePeriod | null;
  explanation: string;
  sourceExplanation: string;
  activePledge: GivingPledgeRecord | null;
  draftPledge: GivingPledgeRecord | null;
};

export type PersonPledgeEditor = {
  personRockId: number;
  rows: PledgeAnalysisRow[];
};

export type PledgeCandidate = PledgeAnalysisRow & {
  personRockId: number;
  personDisplayName: string;
  givingTrendLast24Months: GivingTrendPoint[];
  recommendedMatchStreakCount: number;
  recommendedMatchStreakStartedAt: Date | null;
};

export type GivingTrendPoint = {
  month: string;
  total: string;
};

export type QuickCreateGivingPledgeInput = {
  personRockId: number;
  accountRockId: number;
  startDate?: Date | null;
};

export type RejectGivingPledgeRecommendationInput = {
  personRockId: number;
  accountRockId: number;
  reason?: string | null;
};

export type UpdateGivingPledgeInput = {
  id: string;
  amount?: string | null;
  period?: GivingPledgePeriod | null;
  status?: GivingPledgeStatus | null;
  startDate?: Date | null;
  endDate?: Date | null;
};

type PledgeClient = Pick<
  PrismaClient,
  | "givingFact"
  | "givingPledge"
  | "givingPledgeRecommendationDecision"
  | "platformFundSetting"
  | "rockFinancialAccount"
  | "rockPerson"
> &
  Partial<Pick<PrismaClient, "givingPledgeRecommendationSnapshot">>;

type PledgeRecommendationSnapshotRefreshClient = Pick<
  PrismaClient,
  | "$transaction"
  | "givingFact"
  | "givingPledge"
  | "givingPledgeRecommendationDecision"
  | "givingPledgeRecommendationSnapshot"
  | "platformFundSetting"
  | "rockFinancialAccount"
>;

type GivingFactForPledge = {
  accountRockId: number | null;
  amount: unknown;
  effectiveMonth: Date;
  occurredAt: Date | null;
};

type PledgeRow = {
  id: string;
  personRockId: number;
  accountRockId: number;
  amount: unknown;
  period: GivingPledgePeriod;
  status: GivingPledgeStatus;
  source: GivingPledgeSource;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  account?: {
    name: string;
    rockId: number;
  };
};

type PledgeRecommendationDecisionRow = {
  id: string;
  personRockId: number;
  accountRockId: number;
  status: GivingPledgeRecommendationDecisionStatus;
  reason: string | null;
  basisMonthsAtDecision: number;
  confidenceAtDecision: string | null;
  recommendedAmountAtDecision: unknown;
  recommendedPeriodAtDecision: GivingPledgePeriod;
  lastGiftAtDecision: Date | null;
  lastTwelveMonthsTotalAtDecision: unknown;
  decidedByUserId: string | null;
  decidedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type PledgeRecommendationSnapshotRow = {
  personRockId: number;
  accountRockId: number;
  recommendedAmount: unknown;
  recommendedPeriod: GivingPledgePeriod;
  recommendedMatchStreakCount: number;
  recommendedMatchStreakStartedAt: Date | null;
};

export async function getPersonPledgeEditor(
  personRockId: number,
  actor: LocalAppUser,
  client: PledgeClient = prisma,
): Promise<PersonPledgeEditor | null> {
  if (!hasPermission(actor.role, "pledges:manage")) {
    return null;
  }

  assertPositiveRockId(personRockId, "Pledge personRockId");

  const [person, funds, facts, pledges, decisions] = await Promise.all([
    client.rockPerson.findUnique({
      select: { rockId: true },
      where: { rockId: personRockId },
    }),
    findPledgeableFunds(client),
    findRecentPersonGivingFacts(personRockId, new Date(), client),
    findVisiblePersonPledges(personRockId, client),
    findRejectedPersonPledgeRecommendationDecisions(personRockId, client),
  ]);

  if (!person) {
    throw new GraphQLError("Pledge person was not found.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  return {
    personRockId,
    rows: buildPledgeAnalysisRows({
      facts,
      funds,
      decisions,
      pledges,
      referenceDate: new Date(),
    }),
  };
}

export async function quickCreateGivingPledge(
  input: QuickCreateGivingPledgeInput,
  actor: LocalAppUser,
  client: PledgeClient = prisma,
) {
  const recommendation = await recommendationForMutation(input, actor, client);

  if (
    recommendation.status !== "RECOMMENDED" ||
    !recommendation.recommendedAmount ||
    !recommendation.recommendedPeriod
  ) {
    throw new GraphQLError(
      "A pledge recommendation is required before quick creation.",
      {
        extensions: { code: "BAD_USER_INPUT" },
      },
    );
  }

  await assertNoActivePledge(input, client);

  return createPledgeFromRecommendation(
    {
      ...input,
      amount: recommendation.recommendedAmount,
      period: recommendation.recommendedPeriod,
      status: "ACTIVE",
    },
    actor,
    client,
  );
}

export async function createDraftGivingPledgeFromRecommendation(
  input: QuickCreateGivingPledgeInput,
  actor: LocalAppUser,
  client: PledgeClient = prisma,
) {
  const recommendation = await recommendationForMutation(input, actor, client);

  if (
    recommendation.status !== "RECOMMENDED" ||
    !recommendation.recommendedAmount ||
    !recommendation.recommendedPeriod
  ) {
    throw new GraphQLError(
      "A pledge recommendation is required before creating a draft.",
      {
        extensions: { code: "BAD_USER_INPUT" },
      },
    );
  }

  return createPledgeFromRecommendation(
    {
      ...input,
      amount: recommendation.recommendedAmount,
      period: recommendation.recommendedPeriod,
      status: "DRAFT",
    },
    actor,
    client,
  );
}

export async function rejectGivingPledgeRecommendation(
  input: RejectGivingPledgeRecommendationInput,
  actor: LocalAppUser,
  client: PledgeClient = prisma,
) {
  const recommendation = await recommendationForMutation(input, actor, client);

  if (
    recommendation.status !== "RECOMMENDED" ||
    !recommendation.recommendedAmount ||
    !recommendation.recommendedPeriod
  ) {
    throw new GraphQLError("A pledge recommendation is required to reject.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  return client.givingPledgeRecommendationDecision.upsert({
    create: {
      accountRockId: input.accountRockId,
      basisMonthsAtDecision: recommendation.basisMonths,
      confidenceAtDecision: recommendation.confidence,
      decidedByUserId: actor.id,
      lastGiftAtDecision: recommendation.lastGiftAt,
      lastTwelveMonthsTotalAtDecision: recommendation.lastTwelveMonthsTotal,
      personRockId: input.personRockId,
      reason: normalizeDecisionReason(input.reason),
      recommendedAmountAtDecision: recommendation.recommendedAmount,
      recommendedPeriodAtDecision: recommendation.recommendedPeriod,
      status: "REJECTED",
    },
    update: {
      basisMonthsAtDecision: recommendation.basisMonths,
      confidenceAtDecision: recommendation.confidence,
      decidedAt: new Date(),
      decidedByUserId: actor.id,
      lastGiftAtDecision: recommendation.lastGiftAt,
      lastTwelveMonthsTotalAtDecision: recommendation.lastTwelveMonthsTotal,
      reason: normalizeDecisionReason(input.reason),
      recommendedAmountAtDecision: recommendation.recommendedAmount,
      recommendedPeriodAtDecision: recommendation.recommendedPeriod,
    },
    where: {
      personRockId_accountRockId_status: {
        accountRockId: input.accountRockId,
        personRockId: input.personRockId,
        status: "REJECTED",
      },
    },
  });
}

export async function updateGivingPledge(
  input: UpdateGivingPledgeInput,
  actor: LocalAppUser,
  client: PledgeClient = prisma,
) {
  requireAppPermission(actor, "pledges:manage");

  const existing = await client.givingPledge.findUnique({
    include: {
      account: {
        select: {
          name: true,
          rockId: true,
        },
      },
    },
    where: { id: input.id },
  });

  if (!existing) {
    throw new GraphQLError("Giving pledge was not found.", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  const status = input.status ?? existing.status;
  assertAllowedStatusTransition(existing.status, status);

  const amount =
    input.amount === undefined
      ? decimalToCents(existing.amount)
      : parsePositiveMoneyToCents(input.amount);
  const period = input.period ?? existing.period;

  if (status === "ACTIVE") {
    await assertNoActivePledge(
      {
        accountRockId: existing.accountRockId,
        personRockId: existing.personRockId,
      },
      client,
      existing.id,
    );
  }

  return mapPledge(
    await client.givingPledge.update({
      data: {
        amount: centsToDecimalString(amount),
        endDate: input.endDate === undefined ? existing.endDate : input.endDate,
        period,
        startDate:
          input.startDate === undefined ? existing.startDate : input.startDate,
        status,
      },
      include: {
        account: {
          select: {
            name: true,
            rockId: true,
          },
        },
      },
      where: { id: existing.id },
    }),
  );
}

export async function listPledgeCandidates(
  input: { limit?: number | null },
  actor: LocalAppUser,
  client: PledgeClient = prisma,
): Promise<PledgeCandidate[]> {
  requireAppPermission(actor, "pledges:manage");

  const facts = await findRecentGivingFactsForCandidates(new Date(), client);
  const personIds = Array.from(
    new Set(
      facts
        .map((fact) => fact.personRockId)
        .filter((personRockId): personRockId is number =>
          Number.isInteger(personRockId),
        ),
    ),
  );

  if (personIds.length === 0) {
    return [];
  }

  const [funds, pledges, decisions, people, snapshots] = await Promise.all([
    findPledgeableFunds(client),
    client.givingPledge.findMany({
      include: {
        account: {
          select: {
            name: true,
            rockId: true,
          },
        },
      },
      where: {
        personRockId: { in: personIds },
        status: { in: ["ACTIVE", "DRAFT"] },
      },
    }),
    client.givingPledgeRecommendationDecision.findMany({
      where: {
        personRockId: { in: personIds },
        status: "REJECTED",
      },
    }),
    client.rockPerson.findMany({
      select: {
        firstName: true,
        lastName: true,
        nickName: true,
        rockId: true,
      },
      where: {
        rockId: { in: personIds },
      },
    }),
    findPledgeRecommendationSnapshots(personIds, client),
  ]);
  const peopleById = new Map(
    people.map((person) => [person.rockId, displayName(person)] as const),
  );
  const snapshotsByKey = new Map(
    snapshots.map((snapshot) => [snapshotKey(snapshot), snapshot] as const),
  );
  const pledgesByPerson = groupBy(pledges, (pledge) =>
    String(pledge.personRockId),
  );
  const decisionsByPerson = groupBy(decisions, (decision) =>
    String(decision.personRockId),
  );
  const factsByPerson = groupBy(facts, (fact) => String(fact.personRockId));
  const limit = clampCandidateLimit(input.limit);

  return Array.from(factsByPerson.entries())
    .flatMap(([personRockId, personFacts]) =>
      buildPledgeAnalysisRows({
        facts: personFacts,
        funds,
        decisions: decisionsByPerson.get(personRockId) ?? [],
        pledges: pledgesByPerson.get(personRockId) ?? [],
        referenceDate: new Date(),
      })
        .filter((row) => row.status === "RECOMMENDED")
        .map((row) => {
          const personRockIdNumber = Number(personRockId);
          const snapshot = snapshotsByKey.get(
            snapshotKey({
              accountRockId: row.account.rockId,
              personRockId: personRockIdNumber,
            }),
          );
          const streak = resolveCandidateStreak(row, snapshot);

          return {
            ...row,
            confidence: confidenceFromStreak(
              streak.recommendedMatchStreakCount,
            ),
            givingTrendLast24Months: buildGivingTrendLast24Months({
              accountRockId: row.account.rockId,
              facts: personFacts,
              referenceDate: new Date(),
            }),
            ...streak,
            personDisplayName:
              peopleById.get(personRockIdNumber) ??
              `Rock person ${personRockId}`,
            personRockId: personRockIdNumber,
          };
        }),
    )
    .slice(0, limit);
}

export async function refreshPledgeRecommendationSnapshots(
  input: { referenceDate?: Date; syncRunId: string },
  client: PledgeRecommendationSnapshotRefreshClient = prisma,
) {
  const referenceDate = input.referenceDate ?? new Date();
  const facts = await findAllGivingFactsForCandidateSnapshots(client);
  const personIds = Array.from(
    new Set(
      facts
        .map((fact) => fact.personRockId)
        .filter((personRockId): personRockId is number =>
          Number.isInteger(personRockId),
        ),
    ),
  );

  if (personIds.length === 0) {
    await client.givingPledgeRecommendationSnapshot.deleteMany({});
    return { recommendationSnapshots: 0 };
  }

  const [funds, pledges, decisions] = await Promise.all([
    findPledgeableFunds(client),
    client.givingPledge.findMany({
      include: {
        account: {
          select: {
            name: true,
            rockId: true,
          },
        },
      },
      where: {
        personRockId: { in: personIds },
        status: { in: ["ACTIVE", "DRAFT"] },
      },
    }),
    client.givingPledgeRecommendationDecision.findMany({
      where: {
        personRockId: { in: personIds },
        status: "REJECTED",
      },
    }),
  ]);
  const pledgesByPerson = groupBy(pledges, (pledge) =>
    String(pledge.personRockId),
  );
  const decisionsByPerson = groupBy(decisions, (decision) =>
    String(decision.personRockId),
  );
  const factsByPerson = groupBy(facts, (fact) => String(fact.personRockId));
  const snapshotRows = Array.from(factsByPerson.entries()).flatMap(
    ([personRockId, personFacts]) =>
      buildPledgeAnalysisRows({
        facts: personFacts,
        funds,
        decisions: decisionsByPerson.get(personRockId) ?? [],
        pledges: pledgesByPerson.get(personRockId) ?? [],
        referenceDate,
      })
        .filter(
          (row) =>
            row.status === "RECOMMENDED" &&
            row.recommendedAmount &&
            row.recommendedPeriod,
        )
        .map((row) => {
          const recommendedAmount = row.recommendedAmount!;
          const recommendedPeriod = row.recommendedPeriod!;
          const streak = countRecommendedPeriodMatches({
            accountRockId: row.account.rockId,
            facts: personFacts,
            recommendationAmount: recommendedAmount,
            recommendationPeriod: recommendedPeriod,
            referenceDate,
            fullHistory: true,
          });

          return {
            accountRockId: row.account.rockId,
            computedAt: new Date(),
            lastSyncRunId: input.syncRunId,
            personRockId: Number(personRockId),
            recommendedAmount,
            recommendedMatchStreakCount: streak.recommendedMatchStreakCount,
            recommendedMatchStreakStartedAt:
              streak.recommendedMatchStreakStartedAt,
            recommendedPeriod,
          };
        }),
  );

  try {
    await client.$transaction(async (tx) => {
      await tx.givingPledgeRecommendationSnapshot.deleteMany({});

      if (snapshotRows.length > 0) {
        await tx.givingPledgeRecommendationSnapshot.createMany({
          data: snapshotRows,
        });
      }
    });
  } catch (error) {
    if (isMissingPledgeRecommendationSnapshotTable(error)) {
      return { recommendationSnapshots: 0 };
    }

    throw error;
  }

  return { recommendationSnapshots: snapshotRows.length };
}

export function buildPledgeAnalysisRows({
  decisions = [],
  facts,
  funds,
  pledges,
  referenceDate,
}: {
  decisions?: PledgeRecommendationDecisionRow[];
  facts: GivingFactForPledge[];
  funds: PledgeFund[];
  pledges: PledgeRow[];
  referenceDate: Date;
}): PledgeAnalysisRow[] {
  const factsByAccount = groupBy(
    facts.filter((fact) => Number.isInteger(fact.accountRockId)),
    (fact) => String(fact.accountRockId),
  );
  const pledgesByAccount = groupBy(pledges, (pledge) =>
    String(pledge.accountRockId),
  );
  const decisionsByAccount = groupBy(decisions, (decision) =>
    String(decision.accountRockId),
  );
  const fundById = new Map(funds.map((fund) => [fund.rockId, fund] as const));

  for (const accountId of new Set([
    ...factsByAccount.keys(),
    ...pledgesByAccount.keys(),
  ])) {
    const rockId = Number(accountId);

    if (!fundById.has(rockId)) {
      fundById.set(rockId, {
        active: false,
        name: `Account ${rockId}`,
        rockId,
      });
    }
  }

  return Array.from(fundById.values())
    .map((fund) =>
      analyzeFundPledge({
        facts: factsByAccount.get(String(fund.rockId)) ?? [],
        fund,
        rejectedDecision: newestRejectedDecision(
          decisionsByAccount.get(String(fund.rockId)) ?? [],
        ),
        pledges: pledgesByAccount.get(String(fund.rockId)) ?? [],
        referenceDate,
      }),
    )
    .filter(shouldShowPledgeRow)
    .sort(comparePledgeRows);
}

async function recommendationForMutation(
  input: QuickCreateGivingPledgeInput,
  actor: LocalAppUser,
  client: PledgeClient,
) {
  requireAppPermission(actor, "pledges:manage");
  await validatePersonAndFund(input, client);

  const editor = await getPersonPledgeEditor(input.personRockId, actor, client);
  const recommendation = editor?.rows.find(
    (row) => row.account.rockId === input.accountRockId,
  );

  if (!recommendation) {
    throw new GraphQLError("Pledge recommendation fund was not found.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  return recommendation;
}

async function createPledgeFromRecommendation(
  input: QuickCreateGivingPledgeInput & {
    amount: string;
    period: GivingPledgePeriod;
    status: GivingPledgeStatus;
  },
  actor: LocalAppUser,
  client: PledgeClient,
) {
  return mapPledge(
    await client.givingPledge.create({
      data: {
        accountRockId: input.accountRockId,
        amount: input.amount,
        createdByUserId: actor.id,
        period: input.period,
        personRockId: input.personRockId,
        source: "PATTERN_RECOMMENDED",
        startDate: input.startDate ?? new Date(),
        status: input.status,
      },
      include: {
        account: {
          select: {
            name: true,
            rockId: true,
          },
        },
      },
    }),
  );
}

function analyzeFundPledge({
  facts,
  fund,
  pledges,
  rejectedDecision,
  referenceDate,
}: {
  facts: GivingFactForPledge[];
  fund: PledgeFund;
  pledges: PledgeRow[];
  rejectedDecision?: PledgeRecommendationDecisionRow;
  referenceDate: Date;
}): PledgeAnalysisRow {
  const activePledge = newestPledgeWithStatus(pledges, "ACTIVE");
  const draftPledge = newestPledgeWithStatus(pledges, "DRAFT");
  const monthlyTotals = monthlyTotalsForRecentMonths(facts, referenceDate);
  const nonZeroMonths = monthlyTotals.filter((month) => month.totalCents > 0n);
  const basisMonths = nonZeroMonths.length;
  const lastGiftAt = latestGiftDate(facts);
  const lastTwelveMonthsTotal = centsToDecimalString(
    monthlyTotals.reduce((sum, month) => sum + month.totalCents, 0n),
  );
  const base = {
    account: fund,
    activePledge: activePledge ? mapPledge(activePledge) : null,
    basisMonths,
    draftPledge: draftPledge ? mapPledge(draftPledge) : null,
    lastGiftAt,
    lastTwelveMonthsTotal,
    sourceExplanation: SOURCE_EXPLANATION,
  };

  if (activePledge) {
    return {
      ...base,
      confidence: null,
      explanation: "An active pledge already exists for this person and fund.",
      recommendedAmount: null,
      recommendedPeriod: null,
      status: "ACTIVE_PLEDGE_EXISTS",
    };
  }

  if (draftPledge) {
    return {
      ...base,
      confidence: null,
      explanation: "A draft pledge already exists for this person and fund.",
      recommendedAmount: null,
      recommendedPeriod: null,
      status: "DRAFT_EXISTS",
    };
  }

  if (basisMonths < INSUFFICIENT_HISTORY_THRESHOLD) {
    return {
      ...base,
      confidence: null,
      explanation:
        basisMonths === 0
          ? "No gifts were found for this fund in the latest 12 months."
          : "There is not enough recent giving history to recommend a pledge.",
      recommendedAmount: null,
      recommendedPeriod: null,
      status: "INSUFFICIENT_HISTORY",
    };
  }

  if (basisMonths >= ACTIVE_MONTH_THRESHOLD) {
    const recommendation = recommendationFromGivingPattern({
      facts,
      monthlyTotals: nonZeroMonths,
      referenceDate,
    });
    const row = {
      ...base,
      confidence: confidenceFromStreak(
        recommendedMatchStreak({
          facts,
          recommendationAmount: centsToDecimalString(
            recommendation.amountCents,
          ),
          recommendationPeriod: recommendation.period,
          referenceDate,
        }).recommendedMatchStreakCount,
      ),
      explanation: `${basisMonths} of the latest 12 months include giving to this fund, so a ${periodPhrase(recommendation.period)} pledge recommendation can be reviewed.`,
      recommendedAmount: centsToDecimalString(recommendation.amountCents),
      recommendedPeriod: recommendation.period,
      status: "RECOMMENDED",
    } satisfies PledgeAnalysisRow;

    return shouldSuppressRejectedRecommendation(row, rejectedDecision)
      ? {
          ...row,
          status: "REJECTED",
          confidence: null,
          explanation:
            "This pledge recommendation was rejected and will return if giving continues or the confidence improves.",
          recommendedAmount: null,
          recommendedPeriod: null,
        }
      : row;
  }

  return {
    ...base,
    confidence: "LOW",
    explanation:
      "Recent giving exists for this fund, but the pattern is not consistent enough for a pledge recommendation.",
    recommendedAmount: null,
    recommendedPeriod: null,
    status: "NO_CONSISTENT_PATTERN",
  };
}

async function validatePersonAndFund(
  input: { accountRockId: number; personRockId: number },
  client: PledgeClient,
) {
  assertPositiveRockId(input.personRockId, "Pledge personRockId");
  assertPositiveRockId(input.accountRockId, "Pledge accountRockId");

  const fundScope = await getPlatformFundScope(client);
  const [person, account] = await Promise.all([
    client.rockPerson.findUnique({
      select: { rockId: true },
      where: { rockId: input.personRockId },
    }),
    client.rockFinancialAccount.findUnique({
      select: { active: true, rockId: true },
      where: { rockId: input.accountRockId },
    }),
  ]);

  if (!person) {
    throw new GraphQLError("Pledge person was not found.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  if (!account?.active) {
    throw new GraphQLError("Pledge fund was not found or is inactive.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  if (!fundScope.enabledAccountRockIds.includes(input.accountRockId)) {
    throw new GraphQLError(
      "Pledge fund is not enabled for platform calculations.",
      {
        extensions: { code: "BAD_USER_INPUT" },
      },
    );
  }
}

async function assertNoActivePledge(
  input: { accountRockId: number; personRockId: number },
  client: PledgeClient,
  excludePledgeId?: string,
) {
  const activePledge = await client.givingPledge.findFirst({
    select: { id: true },
    where: {
      accountRockId: input.accountRockId,
      id: excludePledgeId ? { not: excludePledgeId } : undefined,
      personRockId: input.personRockId,
      status: "ACTIVE",
    },
  });

  if (activePledge) {
    throw new GraphQLError(
      "An active pledge already exists for this person and fund.",
      {
        extensions: { code: "BAD_USER_INPUT" },
      },
    );
  }
}

async function findPledgeableFunds(
  client: Pick<PrismaClient, "platformFundSetting" | "rockFinancialAccount">,
): Promise<PledgeFund[]> {
  const fundScope = await getPlatformFundScope(client);

  return client.rockFinancialAccount.findMany({
    orderBy: [{ name: "asc" }, { rockId: "asc" }],
    select: {
      active: true,
      name: true,
      rockId: true,
    },
    where: {
      active: true,
      rockId: {
        in: fundScope.enabledAccountRockIds,
      },
    },
  });
}

async function findRecentPersonGivingFacts(
  personRockId: number,
  referenceDate: Date,
  client: PledgeClient,
) {
  return client.givingFact.findMany({
    orderBy: [{ effectiveMonth: "asc" }, { occurredAt: "asc" }, { id: "asc" }],
    select: givingFactSelect,
    where: {
      ...whereForEnabledPlatformFunds(await getPlatformFundScope(client)),
      effectiveMonth: {
        gte: firstRecentMonthDate(referenceDate),
      },
      personRockId,
    },
  });
}

async function findRecentGivingFactsForCandidates(
  referenceDate: Date,
  client: PledgeClient,
) {
  return client.givingFact.findMany({
    orderBy: [
      { personRockId: "asc" },
      { accountRockId: "asc" },
      { effectiveMonth: "asc" },
      { id: "asc" },
    ],
    select: {
      ...givingFactSelect,
      personRockId: true,
    },
    where: {
      ...whereForEnabledPlatformFunds(await getPlatformFundScope(client)),
      effectiveMonth: {
        gte: firstRecentCandidateMonthDate(referenceDate),
      },
      personRockId: { not: null },
    },
  });
}

async function findAllGivingFactsForCandidateSnapshots(
  client: Pick<PrismaClient, "givingFact" | "platformFundSetting">,
) {
  return client.givingFact.findMany({
    orderBy: [
      { personRockId: "asc" },
      { accountRockId: "asc" },
      { effectiveMonth: "asc" },
      { id: "asc" },
    ],
    select: {
      ...givingFactSelect,
      personRockId: true,
    },
    where: {
      ...whereForEnabledPlatformFunds(await getPlatformFundScope(client)),
      personRockId: { not: null },
    },
  });
}

async function findPledgeRecommendationSnapshots(
  personIds: number[],
  client: PledgeClient,
): Promise<PledgeRecommendationSnapshotRow[]> {
  if (!client.givingPledgeRecommendationSnapshot || personIds.length === 0) {
    return [];
  }

  return client.givingPledgeRecommendationSnapshot
    .findMany({
      select: {
        accountRockId: true,
        personRockId: true,
        recommendedAmount: true,
        recommendedMatchStreakCount: true,
        recommendedMatchStreakStartedAt: true,
        recommendedPeriod: true,
      },
      where: {
        personRockId: { in: personIds },
      },
    })
    .catch((error: unknown) => {
      if (isMissingPledgeRecommendationSnapshotTable(error)) {
        return [];
      }

      throw error;
    });
}

function isMissingPledgeRecommendationSnapshotTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2021"
  );
}

async function findVisiblePersonPledges(
  personRockId: number,
  client: PledgeClient,
) {
  const fundScope = await getPlatformFundScope(client);

  return client.givingPledge.findMany({
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
      accountRockId: {
        in: fundScope.enabledAccountRockIds,
      },
      personRockId,
      status: {
        in: ["ACTIVE", "DRAFT"],
      },
    },
  });
}

async function findRejectedPersonPledgeRecommendationDecisions(
  personRockId: number,
  client: PledgeClient,
) {
  return client.givingPledgeRecommendationDecision.findMany({
    orderBy: [{ decidedAt: "desc" }, { id: "asc" }],
    where: {
      personRockId,
      status: "REJECTED",
    },
  });
}

const givingFactSelect = {
  accountRockId: true,
  amount: true,
  effectiveMonth: true,
  id: true,
  occurredAt: true,
} satisfies Prisma.GivingFactSelect;

function newestPledgeWithStatus(
  pledges: PledgeRow[],
  status: GivingPledgeStatus,
) {
  return pledges
    .filter((pledge) => pledge.status === status)
    .sort((left, right) => {
      return (
        right.updatedAt.getTime() - left.updatedAt.getTime() ||
        left.id.localeCompare(right.id)
      );
    })[0];
}

function newestRejectedDecision(decisions: PledgeRecommendationDecisionRow[]) {
  return decisions
    .filter((decision) => decision.status === "REJECTED")
    .sort((left, right) => {
      return (
        right.decidedAt.getTime() - left.decidedAt.getTime() ||
        left.id.localeCompare(right.id)
      );
    })[0];
}

function shouldSuppressRejectedRecommendation(
  row: PledgeAnalysisRow,
  decision: PledgeRecommendationDecisionRow | undefined,
) {
  if (!decision) {
    return false;
  }

  if (
    confidenceRank(row.confidence) >
    confidenceRank(decision.confidenceAtDecision)
  ) {
    return false;
  }

  if (
    row.lastGiftAt &&
    row.lastGiftAt.getTime() > decision.decidedAt.getTime()
  ) {
    return false;
  }

  if (
    recommendationAmountChangedMaterially(
      row.recommendedAmount,
      decision.recommendedAmountAtDecision,
    )
  ) {
    return false;
  }

  return true;
}

function confidenceRank(confidence: string | null) {
  if (confidence === "HIGH") return 3;
  if (confidence === "MEDIUM") return 2;
  if (confidence === "LOW") return 1;
  return 0;
}

function recommendationAmountChangedMaterially(
  recommendedAmount: string | null,
  decidedAmount: unknown,
) {
  if (!recommendedAmount) {
    return false;
  }

  const current = decimalToCents(recommendedAmount);
  const previous = decimalToCents(decidedAmount);

  if (previous === 0n) {
    return current !== 0n;
  }

  const difference =
    current > previous ? current - previous : previous - current;
  const threshold = BigInt(
    Math.ceil(Number(previous) * MATERIAL_RECOMMENDATION_CHANGE_RATIO),
  );

  return difference >= threshold;
}

function monthlyTotalsForRecentMonths(
  facts: GivingFactForPledge[],
  referenceDate: Date,
) {
  const totals = new Map(
    recentAnalysisMonthKeys(facts, referenceDate).map((month) => [
      month,
      { month, totalCents: 0n },
    ]),
  );

  for (const fact of facts) {
    const key = monthKey(fact.effectiveMonth);
    const month = totals.get(key);

    if (month) {
      month.totalCents += decimalToCents(fact.amount);
    }
  }

  return Array.from(totals.values());
}

function recommendationFromGivingPattern({
  facts,
  monthlyTotals,
  referenceDate,
}: {
  facts: GivingFactForPledge[];
  monthlyTotals: Array<{ month: string; totalCents: bigint }>;
  referenceDate: Date;
}): { amountCents: bigint; period: GivingPledgePeriod } {
  const cadence = giftCadenceFromFacts(facts, referenceDate);

  if (cadence) {
    return cadence;
  }

  return {
    amountCents: medianCents(monthlyTotals.map((month) => month.totalCents)),
    period: "MONTHLY",
  };
}

function giftCadenceFromFacts(
  facts: GivingFactForPledge[],
  referenceDate: Date,
): { amountCents: bigint; period: GivingPledgePeriod } | null {
  const analysisMonths = new Set(recentAnalysisMonthKeys(facts, referenceDate));
  const giftFacts = facts
    .filter((fact) => {
      return (
        analysisMonths.has(monthKey(fact.effectiveMonth)) &&
        decimalToCents(fact.amount) > 0n
      );
    })
    .sort(
      (left, right) => giftDate(left).getTime() - giftDate(right).getTime(),
    );

  if (giftFacts.length < MIN_CADENCE_GIFT_COUNT) {
    return null;
  }

  const intervals = giftFacts
    .slice(1)
    .map((fact, index) =>
      daysBetween(giftDate(giftFacts[index]!), giftDate(fact)),
    )
    .filter((days) => days > 0);

  if (intervals.length < MIN_CADENCE_GIFT_COUNT - 1) {
    return null;
  }

  const medianInterval = Number(medianBigInts(intervals.map(BigInt)));

  if (medianInterval >= 5 && medianInterval <= 9) {
    return {
      amountCents: medianCents(
        giftFacts.map((fact) => decimalToCents(fact.amount)),
      ),
      period: "WEEKLY",
    };
  }

  if (medianInterval >= 11 && medianInterval <= 17) {
    return {
      amountCents: medianCents(
        giftFacts.map((fact) => decimalToCents(fact.amount)),
      ),
      period: "FORTNIGHTLY",
    };
  }

  return null;
}

function giftDate(fact: GivingFactForPledge) {
  return fact.occurredAt ?? fact.effectiveMonth;
}

function daysBetween(left: Date, right: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round((right.getTime() - left.getTime()) / millisecondsPerDay);
}

function latestGiftDate(facts: GivingFactForPledge[]) {
  return facts.reduce<Date | null>((latest, fact) => {
    const date = fact.occurredAt ?? fact.effectiveMonth;

    if (!latest || date.getTime() > latest.getTime()) {
      return date;
    }

    return latest;
  }, null);
}

function medianCents(values: bigint[]) {
  return medianBigInts(values);
}

function medianBigInts(values: bigint[]) {
  const sorted = [...values].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0n;
  }

  return ((sorted[middle - 1] ?? 0n) + (sorted[middle] ?? 0n)) / 2n;
}

function periodPhrase(period: GivingPledgePeriod) {
  const labels: Record<GivingPledgePeriod, string> = {
    ANNUALLY: "annual",
    FORTNIGHTLY: "fortnightly",
    MONTHLY: "monthly",
    QUARTERLY: "quarterly",
    WEEKLY: "weekly",
  };

  return labels[period];
}

function mapPledge(pledge: PledgeRow): GivingPledgeRecord {
  return {
    accountName: pledge.account?.name ?? `Account ${pledge.accountRockId}`,
    accountRockId: pledge.accountRockId,
    amount: centsToDecimalString(decimalToCents(pledge.amount)),
    createdAt: pledge.createdAt,
    endDate: pledge.endDate,
    id: pledge.id,
    period: pledge.period,
    personRockId: pledge.personRockId,
    source: pledge.source,
    startDate: pledge.startDate,
    status: pledge.status,
    updatedAt: pledge.updatedAt,
  };
}

function comparePledgeRows(left: PledgeAnalysisRow, right: PledgeAnalysisRow) {
  return (
    pledgeRowRank(left) - pledgeRowRank(right) ||
    right.basisMonths - left.basisMonths ||
    Number(right.lastTwelveMonthsTotal) - Number(left.lastTwelveMonthsTotal) ||
    left.account.name.localeCompare(right.account.name, "en-US", {
      sensitivity: "base",
    }) ||
    left.account.rockId - right.account.rockId
  );
}

function pledgeRowRank(row: PledgeAnalysisRow) {
  if (row.status === "RECOMMENDED") return 0;
  if (row.status === "DRAFT_EXISTS") return 1;
  if (row.status === "ACTIVE_PLEDGE_EXISTS") return 2;
  if (row.status === "REJECTED") return 3;
  if (Number(row.lastTwelveMonthsTotal) > 0) return 4;
  return 5;
}

function shouldShowPledgeRow(row: PledgeAnalysisRow) {
  return (
    Number(row.lastTwelveMonthsTotal) > 0 ||
    Boolean(row.activePledge ?? row.draftPledge)
  );
}

function assertAllowedStatusTransition(
  from: GivingPledgeStatus,
  to: GivingPledgeStatus,
) {
  const allowed: Record<GivingPledgeStatus, GivingPledgeStatus[]> = {
    ACTIVE: ["ACTIVE", "ENDED", "CANCELED"],
    CANCELED: ["CANCELED"],
    DRAFT: ["DRAFT", "ACTIVE", "CANCELED"],
    ENDED: ["ENDED"],
  };

  if (!allowed[from].includes(to)) {
    throw new GraphQLError(`Cannot move a pledge from ${from} to ${to}.`, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
}

function assertPositiveRockId(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new GraphQLError(`${label} must be a positive Rock id.`, {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
}

function normalizeDecisionReason(reason: string | null | undefined) {
  const normalized = reason?.trim();

  return normalized ? normalized.slice(0, 500) : null;
}

function parsePositiveMoneyToCents(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new GraphQLError("Pledge amount must be a positive money value.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  const [dollars, cents = ""] = normalized.split(".");
  const result = BigInt(dollars) * 100n + BigInt(cents.padEnd(2, "0"));

  if (result <= 0n) {
    throw new GraphQLError("Pledge amount must be greater than zero.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  return result;
}

function decimalToCents(value: unknown) {
  const decimal = String(value);
  const negative = decimal.startsWith("-");
  const normalized = negative ? decimal.slice(1) : decimal;
  const [dollars, cents = ""] = normalized.split(".");
  const result =
    BigInt(dollars) * 100n + BigInt(cents.padEnd(2, "0").slice(0, 2));

  return negative ? -result : result;
}

function centsToDecimalString(cents: bigint) {
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const dollars = absolute / 100n;
  const remainder = absolute % 100n;

  return `${negative ? "-" : ""}${dollars}.${remainder.toString().padStart(2, "0")}`;
}

function firstRecentMonthDate(referenceDate: Date) {
  const keys = lastThirteenMonthKeys(referenceDate);

  return new Date(`${keys[0]}-01T00:00:00.000Z`);
}

function firstRecentCandidateMonthDate(referenceDate: Date) {
  const keys = lastTwentyFourMonthKeys(referenceDate);

  return new Date(`${keys[0]}-01T00:00:00.000Z`);
}

function recentAnalysisMonthKeys(
  facts: GivingFactForPledge[],
  referenceDate: Date,
) {
  const currentMonth = monthKey(referenceDate);
  const hasCurrentMonthGiving = facts.some(
    (fact) =>
      monthKey(fact.effectiveMonth) === currentMonth &&
      decimalToCents(fact.amount) > 0n,
  );

  return twelveMonthKeysEndingAt(referenceDate, hasCurrentMonthGiving ? 0 : -1);
}

function streakAnalysisMonthKeys(
  facts: GivingFactForPledge[],
  referenceDate: Date,
  fullHistory: boolean,
) {
  if (!fullHistory) {
    return recentAnalysisMonthKeys(facts, referenceDate);
  }

  if (facts.length === 0) {
    return [];
  }

  const currentMonth = monthKey(referenceDate);
  const hasCurrentMonthGiving = facts.some(
    (fact) =>
      monthKey(fact.effectiveMonth) === currentMonth &&
      decimalToCents(fact.amount) > 0n,
  );
  const endDate = new Date(referenceDate);
  endDate.setUTCDate(1);

  if (!hasCurrentMonthGiving) {
    endDate.setUTCMonth(endDate.getUTCMonth() - 1);
  }

  const earliestFactMonth = facts.reduce(
    (earliest, fact) => {
      const month = new Date(fact.effectiveMonth);
      month.setUTCDate(1);

      if (!earliest || month.getTime() < earliest.getTime()) {
        return month;
      }

      return earliest;
    },
    null as Date | null,
  );

  if (!earliestFactMonth) {
    return [];
  }

  return monthKeysBetween(earliestFactMonth, endDate);
}

function lastThirteenMonthKeys(referenceDate: Date) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();

  return Array.from({ length: 13 }, (_value, index) => {
    const date = new Date(Date.UTC(year, month - 12 + index, 1));

    return monthKey(date);
  });
}

function lastTwentyFourMonthKeys(referenceDate: Date) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();

  return Array.from({ length: 24 }, (_value, index) => {
    const date = new Date(Date.UTC(year, month - 23 + index, 1));

    return monthKey(date);
  });
}

function monthKeysBetween(startDate: Date, endDate: Date) {
  const keys: string[] = [];
  const cursor = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1),
  );

  while (cursor.getTime() <= end.getTime()) {
    keys.push(monthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return keys;
}

function buildGivingTrendLast24Months({
  accountRockId,
  facts,
  referenceDate,
}: {
  accountRockId: number;
  facts: Array<GivingFactForPledge & { personRockId: number | null }>;
  referenceDate: Date;
}): GivingTrendPoint[] {
  const monthTotals = new Map(
    lastTwentyFourMonthKeys(referenceDate).map((month) => [month, 0n]),
  );

  for (const fact of facts) {
    if (fact.accountRockId !== accountRockId) {
      continue;
    }

    const month = monthKey(fact.effectiveMonth);
    const current = monthTotals.get(month);

    if (current === undefined) {
      continue;
    }

    monthTotals.set(month, current + decimalToCents(fact.amount));
  }

  return Array.from(monthTotals.entries()).map(([month, totalCents]) => ({
    month,
    total: centsToDecimalString(totalCents),
  }));
}

function countRecommendedPeriodMatches({
  accountRockId,
  facts,
  recommendationAmount,
  recommendationPeriod,
  referenceDate,
  fullHistory = false,
}: {
  accountRockId: number;
  facts: Array<GivingFactForPledge & { personRockId: number | null }>;
  recommendationAmount: string | null;
  recommendationPeriod: GivingPledgePeriod | null;
  referenceDate: Date;
  fullHistory?: boolean;
}) {
  const relevantFacts = facts.filter(
    (fact) => fact.accountRockId === accountRockId,
  );
  return recommendedMatchStreak({
    facts: relevantFacts,
    fullHistory,
    recommendationAmount,
    recommendationPeriod,
    referenceDate,
  });
}

function recommendedMatchStreak({
  facts,
  fullHistory = false,
  recommendationAmount,
  recommendationPeriod,
  referenceDate,
}: {
  facts: GivingFactForPledge[];
  fullHistory?: boolean;
  recommendationAmount: string | null;
  recommendationPeriod: GivingPledgePeriod | null;
  referenceDate: Date;
}) {
  if (!recommendationAmount || !recommendationPeriod) {
    return {
      recommendedMatchStreakCount: 0,
      recommendedMatchStreakStartedAt: null,
    };
  }

  const recommendedCents = decimalToCents(recommendationAmount);
  const analysisMonths = new Set(
    streakAnalysisMonthKeys(facts, referenceDate, fullHistory),
  );
  const analysisFacts = facts.filter((fact) =>
    analysisMonths.has(monthKey(fact.effectiveMonth)),
  );

  let periodTotals: PeriodTotal[] = [];

  if (recommendationPeriod === "MONTHLY") {
    periodTotals = sumByMonth(analysisFacts, analysisMonths);
  }

  if (recommendationPeriod === "QUARTERLY") {
    periodTotals = sumByQuarter(analysisFacts, analysisMonths);
  }

  if (recommendationPeriod === "ANNUALLY") {
    const annual = sumByYear(analysisFacts, analysisMonths);
    periodTotals = annual ? [annual] : [];
  }

  if (
    recommendationPeriod === "WEEKLY" ||
    recommendationPeriod === "FORTNIGHTLY"
  ) {
    periodTotals = analysisFacts
      .map((fact) => ({
        startDate: giftDate(fact),
        totalCents: decimalToCents(fact.amount),
      }))
      .filter((period) => period.totalCents > 0n)
      .sort(
        (left, right) => left.startDate.getTime() - right.startDate.getTime(),
      );
  }

  let streakCount = 0;
  let streakStartedAt: Date | null = null;

  for (let index = periodTotals.length - 1; index >= 0; index -= 1) {
    const period = periodTotals[index];

    if (!period || period.totalCents < recommendedCents) {
      break;
    }

    streakCount += 1;
    streakStartedAt = period.startDate;
  }

  return {
    recommendedMatchStreakCount: streakCount,
    recommendedMatchStreakStartedAt: streakStartedAt,
  };
}

function confidenceFromStreak(streakCount: number): PledgeConfidence {
  if (streakCount >= 4) {
    return "HIGH";
  }

  if (streakCount >= 2) {
    return "MEDIUM";
  }

  return "LOW";
}

type PeriodTotal = {
  startDate: Date;
  totalCents: bigint;
};

function sumByMonth(facts: GivingFactForPledge[], analysisMonths: Set<string>) {
  const totals = new Map(
    Array.from(analysisMonths).map((month) => [month, 0n]),
  );

  for (const fact of facts) {
    const month = monthKey(fact.effectiveMonth);
    const total = totals.get(month);

    if (total === undefined) {
      continue;
    }

    totals.set(month, total + decimalToCents(fact.amount));
  }

  return Array.from(totals.entries())
    .map(([month, totalCents]) => ({
      startDate: new Date(`${month}-01T00:00:00.000Z`),
      totalCents,
    }))
    .sort(
      (left, right) => left.startDate.getTime() - right.startDate.getTime(),
    );
}

function sumByQuarter(
  facts: GivingFactForPledge[],
  analysisMonths: Set<string>,
) {
  const monthTotals = sumByMonth(facts, analysisMonths);
  const quarterTotals = new Map<string, PeriodTotal>();

  for (const period of monthTotals) {
    const month = monthKey(period.startDate);
    const [yearText, monthText] = month.split("-");
    const quarter = Math.floor((Number(monthText) - 1) / 3) + 1;
    const key = `${yearText}-Q${quarter}`;
    const current = quarterTotals.get(key);

    if (!current) {
      quarterTotals.set(key, {
        startDate: new Date(Date.UTC(Number(yearText), (quarter - 1) * 3, 1)),
        totalCents: period.totalCents,
      });
      continue;
    }

    quarterTotals.set(key, {
      ...current,
      totalCents: current.totalCents + period.totalCents,
    });
  }

  return Array.from(quarterTotals.values()).sort(
    (left, right) => left.startDate.getTime() - right.startDate.getTime(),
  );
}

function sumByYear(facts: GivingFactForPledge[], analysisMonths: Set<string>) {
  const monthTotals = sumByMonth(facts, analysisMonths);

  if (monthTotals.length === 0) {
    return null;
  }

  return {
    startDate: monthTotals[0].startDate,
    totalCents: monthTotals.reduce(
      (total, period) => total + period.totalCents,
      0n,
    ),
  };
}

function twelveMonthKeysEndingAt(referenceDate: Date, endMonthOffset: number) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth();

  return Array.from({ length: 12 }, (_value, index) => {
    const date = new Date(
      Date.UTC(year, month + endMonthOffset - 11 + index, 1),
    );

    return monthKey(date);
  });
}

function monthKey(value: Date) {
  return value.toISOString().slice(0, 7);
}

function snapshotKey(input: { personRockId: number; accountRockId: number }) {
  return `${input.personRockId}:${input.accountRockId}`;
}

function resolveCandidateStreak(
  row: Pick<PledgeAnalysisRow, "recommendedAmount" | "recommendedPeriod">,
  snapshot: PledgeRecommendationSnapshotRow | undefined,
) {
  if (
    !snapshot ||
    !row.recommendedAmount ||
    !row.recommendedPeriod ||
    snapshot.recommendedPeriod !== row.recommendedPeriod ||
    decimalToCents(snapshot.recommendedAmount) !==
      decimalToCents(row.recommendedAmount)
  ) {
    return {
      recommendedMatchStreakCount: 0,
      recommendedMatchStreakStartedAt: null,
    };
  }

  return {
    recommendedMatchStreakCount: snapshot.recommendedMatchStreakCount,
    recommendedMatchStreakStartedAt: snapshot.recommendedMatchStreakStartedAt,
  };
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const groupKey = key(item);
    const group = grouped.get(groupKey) ?? [];

    group.push(item);
    grouped.set(groupKey, group);
  }

  return grouped;
}

function clampCandidateLimit(limit: number | null | undefined) {
  if (!limit || limit < 1) {
    return DEFAULT_CANDIDATE_LIMIT;
  }

  return Math.min(Math.trunc(limit), MAX_CANDIDATE_LIMIT);
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
