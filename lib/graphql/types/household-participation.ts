import { GraphQLError } from "graphql";
import { builder } from "@/lib/graphql/builder";
import { requireStaffUser } from "@/lib/graphql/context";
import {
  getHouseholdParticipation,
  type ParticipationReport,
  type ParticipationRow,
  type ParticipationSummary,
} from "@/lib/giving/household-participation";
import {
  HOUSEHOLD_STAGES,
  CHRISTIAN_STATUSES,
  participationInputSchema,
} from "@/lib/giving/household-participation-contract";
const stageEnum = builder.enumType("HouseholdParticipationStage", {
  values: HOUSEHOLD_STAGES,
});
const christianEnum = builder.enumType("HouseholdChristianClassification", {
  values: CHRISTIAN_STATUSES,
});
const givingEnum = builder.enumType("HouseholdParticipationGiving", {
  values: ["SELECTED", "LATEST", "NOT_SELECTED"] as const,
});

const recordedGiversEnum = builder.enumType("HouseholdRecordedGivers", {
  values: ["ZERO", "ONE", "TWO", "THREE_OR_MORE", "UNRESOLVED"] as const,
});
const rowType = builder
  .objectRef<ParticipationRow>("HouseholdParticipationRow")
  .implement({
    fields: (t) => ({
      rockId: t.exposeInt("rockId"),
      adultCount: t.exposeInt("adultCount"),
      proxyAdultCount: t.exposeInt("proxyAdultCount"),
      name: t.exposeString("name"),
      campusName: t.exposeString("campusName"),
      stage: t.exposeString("stage"),
      christianStatus: t.exposeString("christianStatus"),
      campusRockId: t.exposeInt("campusRockId", { nullable: true }),
      givingSelected: t.exposeBoolean("givingSelected", { nullable: true }),
      givingLatest: t.exposeBoolean("givingLatest", { nullable: true }),
      recordedGivers: t.exposeInt("recordedGivers", { nullable: true }),
      adultStatuses: t.field({
        type: ["String"],
        resolve: (row) => row.adultStatuses,
      }),
      reviewReasons: t.field({
        type: ["String"],
        resolve: (row) => row.reviewReasons,
      }),
      reviewMembershipRockIds: t.field({
        type: ["Int"],
        resolve: (row) => row.reviewMembershipRockIds,
      }),
      givingHouseholdRockIds: t.field({
        type: ["Int"],
        resolve: (row) => row.givingHouseholdRockIds,
      }),
    }),
  });
const summaryType = builder
  .objectRef<ParticipationSummary>("HouseholdParticipationSummary")
  .implement({
    fields: (t) => ({
      stage: t.exposeString("stage"),
      households: t.exposeInt("households"),
      christian: t.exposeInt("christian"),
      nonChristian: t.exposeInt("nonChristian"),
      unknown: t.exposeInt("unknown"),
      unresolvedGiving: t.exposeInt("unresolvedGiving"),
      reviewCount: t.exposeInt("reviewCount"),
      giving: t.exposeInt("giving", { nullable: true }),
      latestGiving: t.exposeInt("latestGiving", { nullable: true }),
      christianGiving: t.exposeInt("christianGiving", { nullable: true }),
      participationRate: t.exposeFloat("participationRate", { nullable: true }),
      latestParticipationRate: t.exposeFloat("latestParticipationRate", {
        nullable: true,
      }),
      christianParticipationRate: t.exposeFloat("christianParticipationRate", {
        nullable: true,
      }),
    }),
  });
const fundType = builder
  .objectRef<ParticipationReport["funds"][number]>("ParticipationFund")
  .implement({
    fields: (t) => ({
      rockId: t.exposeInt("rockId"),
      name: t.exposeString("name"),
    }),
  });
const syncType = builder
  .objectRef<NonNullable<ParticipationReport["latestSync"]>>(
    "ParticipationSync",
  )
  .implement({
    fields: (t) => ({
      id: t.exposeString("id"),
      status: t.exposeString("status"),
      completedAt: t.exposeString("completedAt", { nullable: true }),
    }),
  });
const distributionType = builder
  .objectRef<ParticipationReport["recordedGiverDistribution"]>(
    "RecordedGiverDistribution",
  )
  .implement({
    fields: (t) => ({
      zero: t.exposeInt("zero"),
      one: t.exposeInt("one"),
      two: t.exposeInt("two"),
      threeOrMore: t.exposeInt("threeOrMore"),
      unresolved: t.exposeInt("unresolved"),
    }),
  });
const reportType = builder
  .objectRef<ParticipationReport>("HouseholdParticipationReport")
  .implement({
    fields: (t) => ({
      snapshotId: t.exposeString("snapshotId"),
      ruleVersion: t.exposeString("ruleVersion"),
      sourceExplanation: t.exposeString("sourceExplanation"),
      start: t.exposeString("start"),
      endExclusive: t.exposeString("endExclusive"),
      latestStart: t.exposeString("latestStart"),
      fundsConfigured: t.exposeBoolean("fundsConfigured"),
      positiveChristianSourceAvailable: t.exposeBoolean(
        "positiveChristianSourceAvailable",
      ),
      dataComplete: t.exposeBoolean("dataComplete"),
      totalCount: t.exposeInt("totalCount"),
      nextAfter: t.exposeInt("nextAfter", { nullable: true }),
      fundRockIds: t.field({
        type: ["Int"],
        resolve: (row) => row.fundRockIds,
      }),
      warnings: t.field({ type: ["String"], resolve: (row) => row.warnings }),
      asOf: t.string({ resolve: (r) => r.filters.asOf }),
      months: t.int({ resolve: (r) => r.filters.months }),
      rows: t.field({ type: [rowType], resolve: (r) => r.rows }),
      summaries: t.field({ type: [summaryType], resolve: (r) => r.summaries }),
      funds: t.field({ type: [fundType], resolve: (r) => r.funds }),
      latestSync: t.field({
        type: syncType,
        nullable: true,
        resolve: (r) => r.latestSync,
      }),
      recordedGiverDistribution: t.field({
        type: distributionType,
        resolve: (r) => r.recordedGiverDistribution,
      }),
    }),
  });
export function registerHouseholdParticipationTypes() {
  builder.queryField("householdParticipation", (t) =>
    t.field({
      type: reportType,
      args: {
        months: t.arg.int(),
        asOf: t.arg.string(),
        campusRockIds: t.arg.intList(),
        includeUnassigned: t.arg.boolean(),
        fundRockIds: t.arg.intList(),
        stage: t.arg({ type: stageEnum }),
        christianStatus: t.arg({ type: christianEnum }),
        giving: t.arg({ type: givingEnum }),
        recordedGivers: t.arg({ type: recordedGiversEnum }),
        reviewOnly: t.arg.boolean(),
        after: t.arg.int(),
        first: t.arg.int(),
        snapshotId: t.arg.string(),
      },
      resolve: (_root, args, context) => {
        const actor = requireStaffUser(context);
        const parsed = participationInputSchema.safeParse({
          months: args.months ?? undefined,
          asOf: args.asOf ?? undefined,
          campusRockIds:
            args.campusRockIds || args.includeUnassigned
              ? [
                  ...(args.campusRockIds ?? [2, 3, 4]),
                  ...(args.includeUnassigned ? [null] : []),
                ]
              : undefined,
          fundRockIds: args.fundRockIds ?? undefined,
          stage: args.stage ?? undefined,
          christianStatus: args.christianStatus ?? undefined,
          giving: args.giving ?? undefined,
          recordedGivers: args.recordedGivers ?? undefined,
          reviewOnly: args.reviewOnly ?? undefined,
          after: args.after ?? undefined,
          first: args.first ?? undefined,
          snapshotId: args.snapshotId ?? undefined,
        });
        if (!parsed.success)
          throw new GraphQLError("Household participation input is invalid.", {
            extensions: { code: "BAD_USER_INPUT" },
          });
        return getHouseholdParticipation(parsed.data, actor);
      },
    }),
  );
}
