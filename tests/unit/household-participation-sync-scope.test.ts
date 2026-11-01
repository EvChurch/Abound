import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { RockSyncSlice } from "@/lib/rock/client";
import { syncRockPersonSlice, syncRockSlice } from "@/lib/sync/run-sync";
import { getHouseholdParticipation } from "@/lib/giving/household-participation";

vi.mock("@/lib/giving/lifecycle-snapshots", () => ({
  refreshGivingLifecycleSnapshots: vi.fn(),
}));
vi.mock("@/lib/giving/pledges", () => ({
  refreshPledgeRecommendationSnapshots: vi.fn(),
}));
const emptySlice: RockSyncSlice = {
  groupTypes: [],
  groupRoles: [],
  definedValues: [],
  personAliases: [],
  people: [],
  familyGroups: [],
  familyMembers: [],
  campuses: [],
  groups: [],
  groupMembers: [],
  financialAccounts: [],
  financialTransactions: [],
  financialTransactionDetails: [],
  financialScheduledTransactions: [],
  financialScheduledTransactionDetails: [],
};
const actor = {
  id: "staff",
  active: true,
  auth0Subject: "auth0|staff",
  name: null,
  email: null,
  rockPersonId: null,
};
type Run = {
  id: string;
  source: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
};
function harness() {
  const runs: Run[] = [];
  const member = {
    rockId: 1,
    lastSyncRunId: "",
    lastSyncedAt: new Date("2026-10-01Z"),
    person: {
      rockId: 1,
      connectionStatusValueRockId: 65,
      connectionStatus: { value: "Investigating" },
      givingGroupRockId: 1,
      primaryFamilyRockId: 1,
    },
  };
  const tx = {
    syncRun: {
      create: vi.fn(
        async ({ data }: { data: { source: string; status: string } }) => {
          const run = {
            ...data,
            id: `run${runs.length + 1}`,
            startedAt: new Date(Date.UTC(2026, 9, 1, 0, runs.length)),
            completedAt: null,
          };
          runs.push(run);
          return run;
        },
      ),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<Run>;
        }) => {
          const run = runs.find((r) => r.id === where.id)!;
          return Object.assign(
            run,
            data,
            data.completedAt
              ? { completedAt: new Date(run.startedAt.getTime() + 1000) }
              : {},
          );
        },
      ),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where?: {
            source?: string | { in: string[] };
            status?: string | { in: string[] };
            OR?: Array<{
              source?: { in: string[] };
              status?: string;
              startedAt?: { gte: Date };
              completedAt?: { gte: Date };
            }>;
          };
        }) =>
          [...runs]
            .reverse()
            .find(
              (r) =>
                (!where?.source ||
                  (typeof where.source === "string"
                    ? r.source === where.source
                    : where.source.in.includes(r.source))) &&
                (!where?.status ||
                  (typeof where.status === "string"
                    ? r.status === where.status
                    : where.status.in.includes(r.status))) &&
                (!where?.OR ||
                  where.OR.some(
                    (c) =>
                      (c.status === "STARTED" &&
                        r.status === "STARTED" &&
                        !!c.source?.in.includes(r.source)) ||
                      (c.startedAt && r.startedAt >= c.startedAt.gte) ||
                      (c.completedAt &&
                        r.completedAt &&
                        r.completedAt >= c.completedAt.gte),
                  )),
            ) ?? null,
      ),
    },
    syncIssue: { createMany: vi.fn(async () => ({ count: 1 })) },
    givingFact: {
      deleteMany: vi.fn(),
      groupBy: vi.fn(async () => []),
      findMany: vi.fn(async () => []),
    },
    platformFundSetting: {
      findMany: vi.fn(async () => [{ accountRockId: 1, enabled: true }]),
    },
    rockFinancialAccount: {
      findMany: vi.fn(async () => [{ rockId: 1, name: "Synthetic fund" }]),
    },
    rockHousehold: {
      findMany: vi.fn(async () => [
        {
          rockId: 1,
          name: "Synthetic family",
          campusRockId: 3,
          campus: { name: "Central" },
          members: [member],
        },
      ]),
    },
  };
  const db = {
    ...tx,
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  } as unknown as PrismaClient;
  return { db, member, runs };
}
describe("full versus person sync report freshness", () => {
  it("keeps an untouched family's measures after a real full-sync then person-sync persistence sequence", async () => {
    const { db, member, runs } = harness();
    const full = await syncRockSlice(db, emptySlice);
    member.lastSyncRunId = full.syncRunId;
    member.lastSyncedAt = runs[0].startedAt;
    const before = await getHouseholdParticipation(
      { asOf: "2026-10-24T00:00:00Z" },
      actor,
      db,
    );
    expect(before.rows[0].reviewReasons).toEqual([]);
    expect(before.summaries.at(-1)?.participationRate).toBe(0);
    await syncRockPersonSlice(db, emptySlice);
    const after = await getHouseholdParticipation(
      { asOf: "2026-10-24T00:00:00Z" },
      actor,
      db,
    );
    expect(after.latestSync?.id).toBe(runs[1].id);
    expect(after.rows[0]).toMatchObject({
      givingSelected: false,
      reviewReasons: [],
    });
    expect(after.dataComplete).toBe(true);
    expect(after.summaries.at(-1)?.participationRate).toBe(0);
    expect(runs.map((r) => r.source)).toEqual([
      "rock:v1:full",
      "rock:v1:person",
    ]);
    expect(after.snapshotId).not.toBe(before.snapshotId);
  });
  it("does not certify legacy ambiguous runs or person-only runs as a successful full baseline", async () => {
    const { db, member, runs } = harness();
    runs.push({
      id: "legacy",
      source: "rock:v1",
      status: "SUCCEEDED",
      startedAt: new Date("2026-09-01Z"),
      completedAt: new Date("2026-09-01Z"),
    });
    await syncRockPersonSlice(db, emptySlice);
    const report = await getHouseholdParticipation(
      { asOf: "2026-10-24T00:00:00Z" },
      actor,
      db,
    );
    expect(report.dataComplete).toBe(false);
    expect(report.summaries.at(-1)?.participationRate).toBeNull();
    expect(report.warnings).toContain(
      "The latest full Rock sync is missing or incomplete; participation rates are withheld.",
    );
    const full = await syncRockSlice(db, emptySlice);
    member.lastSyncRunId = full.syncRunId;
    member.lastSyncedAt = runs.at(-1)!.startedAt;
    const established = await getHouseholdParticipation(
      { asOf: "2026-10-24T00:00:00Z" },
      actor,
      db,
    );
    expect(established.dataComplete).toBe(true);
    expect(established.summaries.at(-1)?.participationRate).toBe(0);
  });
  it.each([
    { label: "full", sync: syncRockSlice },
    { label: "person", sync: syncRockPersonSlice },
  ])(
    "does not let a successful person slice hide an incomplete newer $label sync",
    async ({ sync }) => {
      const { db, member, runs } = harness();
      const full = await syncRockSlice(db, emptySlice);
      member.lastSyncRunId = full.syncRunId;
      member.lastSyncedAt = runs[0].startedAt;
      await sync(db, emptySlice, {
        sourceIssues: [
          {
            severity: "ERROR",
            source: "rock:v1",
            code: "UNRESOLVED_SOURCE",
            message: "Synthetic unresolved source",
          },
        ],
      });
      await syncRockPersonSlice(db, emptySlice);
      const report = await getHouseholdParticipation(
        { asOf: "2026-10-24T00:00:00Z" },
        actor,
        db,
      );
      expect(report.latestSync?.status).toBe("SUCCEEDED");
      expect(report.snapshotStable).toBe(false);
      await expect(
        getHouseholdParticipation(
          { ...report.filters, snapshotId: report.snapshotId },
          actor,
          db,
        ),
      ).rejects.toThrow("Sync data is incomplete");
      expect(report.dataComplete).toBe(false);
      expect(report.summaries.at(-1)?.participationRate).toBeNull();
      expect(report.rows[0].reviewReasons).toEqual([]);
      // A later complete population snapshot is the conservative recovery boundary.
      const recovery = await syncRockSlice(db, emptySlice);
      member.lastSyncRunId = recovery.syncRunId;
      member.lastSyncedAt = runs.at(-1)!.startedAt;
      const recovered = await getHouseholdParticipation(
        { asOf: "2026-10-24T00:00:00Z" },
        actor,
        db,
      );
      expect(recovered.dataComplete).toBe(true);
      expect(recovered.snapshotStable).toBe(true);
    },
  );
  it("blocks an older scoped person writer still running after a newer full baseline", async () => {
    const { db, member, runs } = harness();
    const older: Run = {
      id: "older-person",
      source: "rock:v1:person",
      status: "STARTED",
      startedAt: new Date("2026-09-30Z"),
      completedAt: null,
    };
    runs.push(older);
    const full = await syncRockSlice(db, emptySlice);
    member.lastSyncRunId = full.syncRunId;
    member.lastSyncedAt = runs.at(-1)!.startedAt;
    const running = await getHouseholdParticipation(
      { asOf: "2026-10-24T00:00:00Z" },
      actor,
      db,
    );
    expect(running.latestSync?.id).toBe(full.syncRunId);
    expect(running.snapshotStable).toBe(false);
    expect(running.dataComplete).toBe(false);
    older.status = "SUCCEEDED";
    older.completedAt = new Date(runs.at(-1)!.completedAt!.getTime() + 1000);
    const finished = await getHouseholdParticipation(
      { asOf: "2026-10-24T00:00:00Z" },
      actor,
      db,
    );
    expect(finished.snapshotStable).toBe(true);
    expect(finished.snapshotId).not.toBe(running.snapshotId);
  });
});
