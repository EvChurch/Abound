import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { GraphQLError } from "graphql";
import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import { getPlatformFundScope } from "@/lib/settings/funds";
import {
  classifyHouseholdAdults,
  completedParticipationWindow,
  HOUSEHOLD_STAGES,
  participationInputSchema,
  RULE_VERSION,
  SOURCE_EXPLANATION,
  type ParticipationInput,
  type HouseholdStage,
  type ChristianStatus,
} from "./household-participation-contract";

export const eligibleAdultMembershipWhere = {
  archived: false,
  groupMemberStatus: 1,
  groupRoleRockId: 3,
  person: {
    recordStatusValueRockId: 3,
    deceased: false,
    mergedIntoPersonRockId: null,
  },
} satisfies Prisma.RockHouseholdMemberWhereInput;

const householdSelect = {
  rockId: true,
  name: true,
  campusRockId: true,
  campus: { select: { name: true } },
  members: {
    where: eligibleAdultMembershipWhere,
    select: {
      rockId: true,
      lastSyncRunId: true,
      lastSyncedAt: true,
      person: {
        select: {
          rockId: true,
          connectionStatusValueRockId: true,
          connectionStatus: { select: { value: true } },
          givingGroupRockId: true,
          primaryFamilyRockId: true,
        },
      },
    },
  },
} satisfies Prisma.RockHouseholdSelect;
type Household = Prisma.RockHouseholdGetPayload<{
  select: typeof householdSelect;
}>;
export type ParticipationRow = {
  rockId: number;
  name: string;
  campusRockId: number | null;
  campusName: string;
  stage: HouseholdStage;
  christianStatus: ChristianStatus;
  adultCount: number;
  proxyAdultCount: number;
  adultStatuses: string[];
  givingSelected: boolean | null;
  givingLatest: boolean | null;
  recordedGivers: number | null;
  reviewReasons: string[];
  givingHouseholdRockIds: number[];
  reviewMembershipRockIds: number[];
};
export type ParticipationSummary = {
  stage: HouseholdStage | "TOTAL";
  households: number;
  christian: number;
  nonChristian: number;
  unknown: number;
  giving: number | null;
  latestGiving: number | null;
  christianGiving: number | null;
  participationRate: number | null;
  latestParticipationRate: number | null;
  christianParticipationRate: number | null;
  unresolvedGiving: number;
  reviewCount: number;
};
export type ParticipationReport = {
  filters: ReturnType<typeof participationInputSchema.parse> & { asOf: string };
  snapshotId: string;
  ruleVersion: string;
  sourceExplanation: string;
  start: string;
  endExclusive: string;
  latestStart: string;
  fundsConfigured: boolean;
  availableFunds: Array<{ rockId: number; name: string }>;
  fundRockIds: number[];
  funds: Array<{ rockId: number; name: string }>;
  positiveChristianSourceAvailable: boolean;
  dataComplete: boolean;
  warnings: string[];
  latestSync: { id: string; status: string; completedAt: string | null } | null;
  rows: ParticipationRow[];
  summaries: ParticipationSummary[];
  totalCount: number;
  nextAfter: number | null;
  recordedGiverDistribution: {
    zero: number;
    one: number;
    two: number;
    threeOrMore: number;
    unresolved: number;
  };
};

export async function getHouseholdParticipation(
  input: ParticipationInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
): Promise<ParticipationReport> {
  if (!actor.active)
    throw new GraphQLError("Local application access is required.", {
      extensions: { code: "FORBIDDEN" },
    });
  const parsed = participationInputSchema.safeParse(input);
  if (!parsed.success)
    throw new GraphQLError("Household participation input is invalid.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  const filters = {
    ...parsed.data,
    asOf: parsed.data.asOf ?? new Date().toISOString(),
  };
  const window = completedParticipationWindow(
    new Date(filters.asOf),
    filters.months,
  );
  return client.$transaction(
    async (tx) => {
      const scope = await getPlatformFundScope(tx);
      const funds = filters.fundRockIds ?? scope.enabledAccountRockIds;
      if (funds.some((id) => !scope.enabledAccountRockIds.includes(id)))
        throw new GraphQLError("Select enabled platform funds only.", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      const latest = await tx.syncRun.findFirst({
        orderBy: [{ startedAt: "desc" }, { id: "desc" }],
        select: { id: true, status: true, completedAt: true },
      });
      const latestFull = await tx.syncRun.findFirst({
        where: { source: "rock:v1", status: "SUCCEEDED" },
        orderBy: [{ startedAt: "desc" }, { id: "desc" }],
        select: { id: true, startedAt: true },
      });
      const snapshotId = createHash("sha256")
        .update(JSON.stringify([latest, latestFull, scope]))
        .digest("hex");
      if (filters.snapshotId && filters.snapshotId !== snapshotId)
        throw new GraphQLError(
          "Report data changed. Refresh the report before continuing.",
          { extensions: { code: "BAD_USER_INPUT" } },
        );
      if (filters.snapshotId && latest?.status !== "SUCCEEDED")
        throw new GraphQLError(
          "Sync data is incomplete. Open a fresh report after sync completes.",
          { extensions: { code: "BAD_USER_INPUT" } },
        );
      // Load the complete eligible family population before campus filtering. Mapping
      // ambiguity must not disappear when the other family is outside the filter.
      const households = await tx.rockHousehold.findMany({
        where: {
          active: true,
          archived: false,
          groupTypeRockId: 10,
          members: { some: eligibleAdultMembershipWhere },
        },
        select: householdSelect,
        orderBy: { rockId: "asc" },
      });
      const actualWhere = {
        accountRockId: { in: funds },
        transactionRockId: { not: null },
        transactionDetailRockId: { not: null },
        scheduledTransactionDetailRockId: null,
        occurredAt: { gte: window.start, lt: window.end },
        effectiveMonth: { gte: window.start, lt: window.end },
        transaction: { transactionTypeValueRockId: 53, status: null },
      } satisfies Prisma.GivingFactWhereInput;
      const factTotals = await tx.givingFact.groupBy({
        by: ["householdRockId", "personRockId", "effectiveMonth"],
        _sum: { amount: true },
        where: actualWhere,
      });
      const unsupportedStatuses = await tx.givingFact.findMany({
        where: {
          accountRockId: { in: funds },
          transactionRockId: { not: null },
          occurredAt: { gte: window.start, lt: window.end },
          transaction: {
            transactionTypeValueRockId: 53,
            status: { not: null },
          },
        },
        select: { householdRockId: true },
        distinct: ["householdRockId"],
      });
      const unsupportedGivingIds = new Set(
        unsupportedStatuses.map((row) => row.householdRockId),
      );
      const fundNames = await tx.rockFinancialAccount.findMany({
        where: { rockId: { in: scope.enabledAccountRockIds } },
        select: { rockId: true, name: true },
        orderBy: { rockId: "asc" },
      });
      const totals = factTotals.map((f) => ({
        ...f,
        amount: f._sum.amount?.toString() ?? "0",
      }));
      const allRows = buildParticipationRows(
        households,
        totals,
        window.latestStart,
      );
      const warnings = [
        "Positive Christian status is not yet verified; Christian-adult participation is unavailable.",
      ];
      const sourceComplete =
        latest?.status === "SUCCEEDED" &&
        !!latestFull &&
        scope.mode === "CONFIGURED" &&
        funds.length > 0 &&
        unsupportedStatuses.length === 0;
      if (latest?.status !== "SUCCEEDED")
        warnings.push(
          "The latest sync is missing, incomplete or in progress. Counts are provisional; participation rates are withheld.",
        );
      if (scope.mode !== "CONFIGURED")
        warnings.push(
          "Platform funds are not configured. Giving measures are unavailable.",
        );
      if (scope.mode === "CONFIGURED" && funds.length === 0)
        warnings.push(
          "No enabled fund is selected. Giving measures are unavailable.",
        );
      if (unsupportedStatuses.length > 0)
        warnings.push(
          "Contribution transaction statuses outside the verified null-status convention require review. Participation rates are withheld.",
        );
      let rows = allRows.filter((r) =>
        filters.campusRockIds.includes(r.campusRockId),
      );
      rows = rows.map((row) =>
        row.givingHouseholdRockIds.some((id) => unsupportedGivingIds.has(id))
          ? {
              ...row,
              givingSelected: null,
              givingLatest: null,
              recordedGivers: null,
              reviewReasons: [
                ...row.reviewReasons,
                "UNVERIFIED_TRANSACTION_STATUS",
              ],
            }
          : row,
      );
      if (scope.mode !== "CONFIGURED" || funds.length === 0)
        rows = rows.map((r) => ({
          ...r,
          givingSelected: null,
          givingLatest: null,
          recordedGivers: null,
        }));
      const staleMemberships = new Map(
        households.map((h) => [
          h.rockId,
          h.members
            .filter(
              (m) =>
                latestFull &&
                m.lastSyncRunId !== latestFull.id &&
                m.lastSyncedAt < latestFull.startedAt,
            )
            .map((m) => m.rockId),
        ]),
      );
      const staleFamilyIds = new Set(
        [...staleMemberships.entries()]
          .filter(([, ids]) => ids.length > 0)
          .map(([id]) => id),
      );
      rows = rows.map((row) =>
        staleFamilyIds.has(row.rockId)
          ? {
              ...row,
              givingSelected: null,
              givingLatest: null,
              recordedGivers: null,
              reviewReasons: [...row.reviewReasons, "STALE_ADULT_MEMBERSHIP"],
              reviewMembershipRockIds: staleMemberships.get(row.rockId) ?? [],
            }
          : row,
      );
      const hasStaleMemberships = rows.some((row) =>
        staleFamilyIds.has(row.rockId),
      );
      if (hasStaleMemberships)
        warnings.push(
          "Some adult memberships were not verified in the latest full sync. Their household classifications/counts are provisional, and affected participation rates are withheld. Tataihono should review the Rock membership states.",
        );
      if (!latestFull)
        warnings.push(
          "No successful full Rock sync is available; participation rates are withheld.",
        );
      const dataComplete = sourceComplete && !hasStaleMemberships;
      rows = rows.filter(
        (r) =>
          (!filters.stage || r.stage === filters.stage) &&
          (!filters.christianStatus ||
            r.christianStatus === filters.christianStatus) &&
          (!filters.reviewOnly || r.reviewReasons.length > 0) &&
          (!filters.recordedGivers ||
            (filters.recordedGivers === "ZERO"
              ? r.recordedGivers === 0
              : filters.recordedGivers === "ONE"
                ? r.recordedGivers === 1
                : filters.recordedGivers === "TWO"
                  ? r.recordedGivers === 2
                  : filters.recordedGivers === "THREE_OR_MORE"
                    ? r.recordedGivers !== null && r.recordedGivers >= 3
                    : r.recordedGivers === null)) &&
          (!filters.giving ||
            (filters.giving === "SELECTED"
              ? r.givingSelected === true
              : filters.giving === "LATEST"
                ? r.givingLatest === true
                : r.givingSelected === false)),
      );
      const summaries = [
        ...HOUSEHOLD_STAGES.map((stage) =>
          summarizeParticipation(
            rows.filter((r) => r.stage === stage),
            stage,
            sourceComplete,
          ),
        ),
        summarizeParticipation(rows, "TOTAL", sourceComplete),
      ];
      const page = rows
        .filter((r) => !filters.after || r.rockId > filters.after)
        .slice(0, filters.first + 1);
      const hasNext = page.length > filters.first;
      const pageRows = page.slice(0, filters.first);
      return {
        filters,
        snapshotId,
        ruleVersion: RULE_VERSION,
        sourceExplanation: SOURCE_EXPLANATION,
        start: window.start.toISOString(),
        endExclusive: window.end.toISOString(),
        latestStart: window.latestStart.toISOString(),
        fundsConfigured: scope.mode === "CONFIGURED",
        fundRockIds: funds,
        funds: fundNames.filter((f) => funds.includes(f.rockId)),
        availableFunds: fundNames,
        positiveChristianSourceAvailable: false,
        dataComplete,
        warnings,
        latestSync: latest
          ? {
              ...latest,
              completedAt: latest.completedAt?.toISOString() ?? null,
            }
          : null,
        rows: pageRows,
        summaries,
        totalCount: rows.length,
        nextAfter: hasNext ? pageRows.at(-1)!.rockId : null,
        recordedGiverDistribution: {
          zero: rows.filter((r) => r.recordedGivers === 0).length,
          one: rows.filter((r) => r.recordedGivers === 1).length,
          two: rows.filter((r) => r.recordedGivers === 2).length,
          threeOrMore: rows.filter(
            (r) => r.recordedGivers !== null && r.recordedGivers >= 3,
          ).length,
          unresolved: rows.filter((r) => r.recordedGivers === null).length,
        },
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: 30000,
    },
  );
}

type FactTotal = {
  householdRockId: number | null;
  personRockId: number | null;
  effectiveMonth: Date;
  amount: string;
};
export function buildParticipationRows(
  households: Household[],
  facts: FactTotal[],
  latestStart: Date,
): ParticipationRow[] {
  const familiesByPerson = new Map<number, Set<number>>();
  const familiesByGiving = new Map<number, Set<number>>();
  for (const h of households)
    for (const { person: p } of h.members) {
      const families = familiesByPerson.get(p.rockId) ?? new Set<number>();
      families.add(h.rockId);
      familiesByPerson.set(p.rockId, families);
      const givingId = p.givingGroupRockId ?? p.primaryFamilyRockId;
      if (givingId !== null) {
        const targets = familiesByGiving.get(givingId) ?? new Set<number>();
        targets.add(h.rockId);
        familiesByGiving.set(givingId, targets);
      }
    }
  const sums = new Map<
    number,
    {
      selected: Prisma.Decimal;
      latest: Prisma.Decimal;
      donors: Map<number, Prisma.Decimal>;
      unknownDonor: boolean;
    }
  >();
  for (const f of facts) {
    if (f.householdRockId === null) continue;
    const sum = sums.get(f.householdRockId) ?? {
      selected: new Prisma.Decimal(0),
      latest: new Prisma.Decimal(0),
      donors: new Map<number, Prisma.Decimal>(),
      unknownDonor: false,
    };
    sum.selected = sum.selected.add(f.amount);
    if (f.effectiveMonth >= latestStart) sum.latest = sum.latest.add(f.amount);
    if (f.personRockId !== null)
      sum.donors.set(
        f.personRockId,
        (sum.donors.get(f.personRockId) ?? new Prisma.Decimal(0)).add(f.amount),
      );
    else if (!new Prisma.Decimal(f.amount).isZero()) sum.unknownDonor = true;
    sums.set(f.householdRockId, sum);
  }
  return households.map((h) => {
    const adults = h.members.map((m) => m.person);
    const classification = classifyHouseholdAdults(adults);
    const givingIds = [
      ...new Set(
        adults
          .map((p) => p.givingGroupRockId ?? p.primaryFamilyRockId)
          .filter((id): id is number => id !== null),
      ),
    ];
    const reasons = new Set<string>();
    if (adults.some((p) => (familiesByPerson.get(p.rockId)?.size ?? 0) > 1))
      reasons.add("MULTIPLE_CURRENT_FAMILIES");
    if (
      adults.some(
        (p) => (p.givingGroupRockId ?? p.primaryFamilyRockId) === null,
      )
    )
      reasons.add("MISSING_GIVING_HOUSEHOLD");
    if (givingIds.some((id) => (familiesByGiving.get(id)?.size ?? 0) > 1))
      reasons.add("AMBIGUOUS_GIVING_HOUSEHOLD");
    if (givingIds.some((id) => id !== h.rockId))
      reasons.add("DIFFERENT_GIVING_HOUSEHOLD");
    if (classification.mismatch) reasons.add("CHRISTIAN_STATUS_MISMATCH");
    const unresolved = [
      "MULTIPLE_CURRENT_FAMILIES",
      "MISSING_GIVING_HOUSEHOLD",
      "AMBIGUOUS_GIVING_HOUSEHOLD",
    ].some((reason) => reasons.has(reason));
    let selected = new Prisma.Decimal(0),
      latest = new Prisma.Decimal(0);
    const donors = new Map<number, Prisma.Decimal>();
    let unknownDonor = false;
    for (const id of givingIds) {
      const sum = sums.get(id);
      if (!sum) continue;
      selected = selected.add(sum.selected);
      latest = latest.add(sum.latest);
      for (const [id, amount] of sum.donors)
        donors.set(id, (donors.get(id) ?? new Prisma.Decimal(0)).add(amount));
      unknownDonor ||= sum.unknownDonor;
    }
    return {
      rockId: h.rockId,
      name: h.name,
      campusRockId: h.campusRockId,
      campusName: h.campus?.name ?? "Unassigned",
      stage: classification.stage,
      christianStatus: classification.christianStatus,
      proxyAdultCount: classification.proxyAdultCount,
      adultCount: adults.length,
      adultStatuses: [
        ...new Set(
          adults.map((p) => p.connectionStatus?.value ?? "Missing status"),
        ),
      ].sort(),
      givingSelected: unresolved ? null : selected.greaterThan(0),
      givingLatest: unresolved ? null : latest.greaterThan(0),
      recordedGivers:
        unresolved || unknownDonor
          ? null
          : [...donors.values()].filter((amount) => amount.greaterThan(0))
              .length,
      reviewReasons: [...reasons],
      givingHouseholdRockIds: givingIds,
      reviewMembershipRockIds: [],
    };
  });
}
export function summarizeParticipation(
  rows: ParticipationRow[],
  stage: ParticipationSummary["stage"],
  dataComplete: boolean,
): ParticipationSummary {
  const giving = rows.filter((r) => r.givingSelected === true).length,
    latest = rows.filter((r) => r.givingLatest === true).length;
  const unresolved = rows.filter((r) => r.givingSelected === null).length;
  const rate = (count: number) =>
    dataComplete && unresolved === 0 && rows.length > 0
      ? count / rows.length
      : null;
  return {
    stage,
    households: rows.length,
    christian: rows.filter((r) => r.christianStatus === "CHRISTIAN").length,
    nonChristian: rows.filter((r) => r.christianStatus === "NON_CHRISTIAN")
      .length,
    unknown: rows.filter((r) => r.christianStatus === "UNKNOWN").length,
    giving: unresolved === rows.length && rows.length > 0 ? null : giving,
    latestGiving: unresolved === rows.length && rows.length > 0 ? null : latest,
    christianGiving: null,
    participationRate: rate(giving),
    latestParticipationRate: rate(latest),
    christianParticipationRate: null,
    unresolvedGiving: unresolved,
    reviewCount: rows.filter((r) => r.reviewReasons.length > 0).length,
  };
}
