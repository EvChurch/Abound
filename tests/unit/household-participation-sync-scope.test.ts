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
        }) =>
          Object.assign(
            runs.find((r) => r.id === where.id)!,
            data,
          ),
      ),
      findFirst: vi.fn(
        async ({ where }: { where?: { source?: string; status?: string } }) =>
          [...runs]
            .reverse()
            .find(
              (r) =>
                (!where?.source || r.source === where.source) &&
                (!where?.status || r.status === where.status),
            ) ?? null,
      ),
    },
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
      "No successful full Rock sync is available; participation rates are withheld.",
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
});
