import type { SyncIssueSummary, SyncRunSummary } from "@/lib/sync/status";
import { getSyncStatusSummary } from "@/lib/sync/status";
import { builder } from "@/lib/graphql/builder";
import { requireStaffUser } from "@/lib/graphql/context";

const MAX_SYNC_ISSUE_LIMIT = 50;

const syncRunType = builder.objectRef<SyncRunSummary>("SyncRun").implement({
  fields: (t) => ({
    id: t.exposeString("id"),
    source: t.exposeString("source"),
    status: t.exposeString("status"),
    startedAt: t.string({
      resolve: (run) => run.startedAt.toISOString(),
    }),
    completedAt: t.string({
      nullable: true,
      resolve: (run) => run.completedAt?.toISOString() ?? null,
    }),
    recordsRead: t.exposeInt("recordsRead"),
    recordsWritten: t.exposeInt("recordsWritten"),
    recordsSkipped: t.exposeInt("recordsSkipped"),
  }),
});

const syncIssueType = builder
  .objectRef<SyncIssueSummary>("SyncIssue")
  .implement({
    fields: (t) => ({
      id: t.exposeString("id"),
      severity: t.exposeString("severity"),
      source: t.exposeString("source"),
      recordType: t.exposeString("recordType", { nullable: true }),
      rockId: t.exposeString("rockId", { nullable: true }),
      code: t.exposeString("code"),
      message: t.exposeString("message"),
      createdAt: t.string({
        resolve: (issue) => issue.createdAt.toISOString(),
      }),
    }),
  });

const syncedCountsType = builder
  .objectRef<
    Awaited<ReturnType<typeof getSyncStatusSummary>>["syncedCounts"]
  >("SyncedCounts")
  .implement({
    fields: (t) => ({
      people: t.exposeInt("people"),
      households: t.exposeInt("households"),
      householdMembers: t.exposeInt("householdMembers"),
      connectGroups: t.exposeInt("connectGroups"),
      connectGroupMembers: t.exposeInt("connectGroupMembers"),
      financialTransactions: t.exposeInt("financialTransactions"),
      financialTransactionDetails: t.exposeInt("financialTransactionDetails"),
      givingFacts: t.exposeInt("givingFacts"),
    }),
  });

const syncStatusType = builder
  .objectRef<Awaited<ReturnType<typeof getSyncStatusSummary>>>("SyncStatus")
  .implement({
    fields: (t) => ({
      latestRun: t.field({
        nullable: true,
        type: syncRunType,
        resolve: (summary) => summary.latestRun,
      }),
      recentRuns: t.field({
        type: [syncRunType],
        resolve: (summary) => summary.recentRuns,
      }),
      openIssues: t.field({
        args: {
          limit: t.arg.int(),
        },
        type: [syncIssueType],
        resolve: (summary, args) =>
          summary.openIssues.slice(0, clampSyncIssueLimit(args.limit)),
      }),
      openIssueCount: t.exposeInt("openIssueCount"),
      syncedCounts: t.field({
        type: syncedCountsType,
        resolve: (summary) => summary.syncedCounts,
      }),
    }),
  });

export function registerSyncTypes() {
  builder.queryField("syncStatus", (t) =>
    t.field({
      nullable: true,
      type: syncStatusType,
      resolve: async (_root, _args, context) => {
        requireStaffUser(context);
        return getSyncStatusSummary();
      },
    }),
  );
}

function clampSyncIssueLimit(limit: number | null | undefined) {
  if (!limit || limit < 1) {
    return 10;
  }

  return Math.min(Math.trunc(limit), MAX_SYNC_ISSUE_LIMIT);
}
