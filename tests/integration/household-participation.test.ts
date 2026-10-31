// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { describe, expect, it } from "vitest";
import { getHouseholdParticipation } from "@/lib/giving/household-participation";
import { householdClassificationWhere } from "@/lib/giving/household-classification-where";
import {
  HOUSEHOLD_STAGES,
  CHRISTIAN_STATUSES,
  participationInputSchema,
} from "@/lib/giving/household-participation-contract";

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("household participation real database contract", () => {
  it("uses eligible adults, actual net gifts and exactly matching multi-page drilldowns", async () => {
    if (
      url === process.env.DATABASE_URL ||
      !new URL(url!).pathname.includes("test")
    )
      throw new Error("An isolated TEST_DATABASE_URL is required.");
    const db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url! }),
    });
    const prefix = `participation-${randomUUID()}`;
    const runId = prefix;
    const campusId = 780001;
    const accountId = 780002;
    const actor = {
      id: "test-staff",
      auth0Subject: "auth0|test",
      active: true,
      name: null,
      email: null,
      rockPersonId: null,
    };
    const asOf = "2026-10-24T00:00:00.000Z";
    try {
      await db.syncRun.create({
        data: {
          id: runId,
          source: "rock:v1",
          status: "SUCCEEDED",
          startedAt: new Date("2099-01-01Z"),
          completedAt: new Date("2099-01-01Z"),
        },
      });
      for (const [rockId, value] of [
        [3, "Active"],
        [4, "Inactive"],
        [65, "Investigating"],
        [1229, "Growing"],
        [146, "Attending"],
        [1406, "Joining"],
        [53, "Contribution"],
        [54, "Event Registration"],
      ] as const)
        await db.rockDefinedValue.upsert({
          where: { rockId },
          create: { rockId, value, lastSyncRunId: runId },
          update: {},
        });
      await db.rockGroupType.upsert({
        where: { rockId: 10 },
        create: { rockId: 10, name: "Family", lastSyncRunId: runId },
        update: {},
      });
      for (const [rockId, name] of [
        [3, "Adult"],
        [4, "Child"],
      ] as const)
        await db.rockGroupRole.upsert({
          where: { rockId },
          create: { rockId, name, groupTypeRockId: 10, lastSyncRunId: runId },
          update: {},
        });
      await db.rockCampus.create({
        data: {
          rockId: campusId,
          name: "Synthetic participation campus",
          active: true,
          lastSyncRunId: runId,
        },
      });
      await db.rockFinancialAccount.create({
        data: {
          rockId: accountId,
          name: "Synthetic participation fund",
          active: true,
          lastSyncRunId: runId,
        },
      });
      await db.platformFundSetting.create({
        data: { accountRockId: accountId, enabled: true },
      });
      for (let i = 0; i < 123; i++) {
        const id = 781000 + i;
        const status =
          i % 4 === 0 ? 65 : i % 4 === 1 ? 1229 : i % 4 === 2 ? 146 : 1406;
        await db.rockHousehold.create({
          data: {
            rockId: id,
            name: `Synthetic family ${i}`,
            active: true,
            campusRockId: campusId,
            lastSyncRunId: runId,
          },
        });
        await db.rockPerson.create({
          data: {
            rockId: id,
            recordStatusValueRockId: 3,
            connectionStatusValueRockId: status,
            primaryFamilyRockId: id,
            givingGroupRockId: id,
            lastSyncRunId: runId,
          },
        });
        await db.rockHouseholdMember.create({
          data: {
            rockId: id,
            householdRockId: id,
            personRockId: id,
            groupRoleRockId: 3,
            groupMemberStatus: 1,
            lastSyncRunId: runId,
          },
        });
      }
      // A child, inactive adult, archived/pending membership, deceased person and
      // merged person must never promote the household's stage or alter its faith.
      for (let i = 0; i < 6; i++) {
        const id = 782000 + i;
        await db.rockPerson.create({
          data: {
            rockId: id,
            recordStatusValueRockId: i === 1 ? 4 : 3,
            connectionStatusValueRockId: 1229,
            primaryFamilyRockId: 781000,
            givingGroupRockId: 781000,
            deceased: i === 4,
            mergedIntoPersonRockId: i === 5 ? 781000 : null,
            lastSyncRunId: runId,
          },
        });
        await db.rockHouseholdMember.create({
          data: {
            rockId: id,
            householdRockId: 781000,
            personRockId: id,
            groupRoleRockId: i === 0 ? 4 : 3,
            groupMemberStatus: i === 3 ? 2 : 1,
            archived: i === 2,
            lastSyncRunId: runId,
          },
        });
      }
      for (const [i, family, status] of [
        [0, 781004, null],
        [1, 781003, 146],
        [2, 781003, null],
        [3, 781003, 1229],
      ] as const) {
        const id = 782010 + i;
        await db.rockPerson.create({
          data: {
            rockId: id,
            recordStatusValueRockId: 3,
            connectionStatusValueRockId: status,
            primaryFamilyRockId: family,
            givingGroupRockId: family,
            lastSyncRunId: runId,
          },
        });
        await db.rockHouseholdMember.create({
          data: {
            rockId: id,
            personRockId: id,
            householdRockId: family,
            groupMemberStatus: 1,
            groupRoleRockId: 3,
            lastSyncRunId: runId,
          },
        });
      }
      for (const [index, amount, date, type, scheduled] of [
        [0, "100", "2026-03-01Z", 53, false],
        [1, "20", "2026-09-01Z", 53, false],
        [2, "-20", "2026-09-02Z", 53, false],
        [3, "999", "2026-09-01Z", 54, false],
        [4, "999", "2026-10-01Z", 53, false],
        [5, "999", "2026-09-01Z", 53, true],
      ] as const) {
        const id = 783000 + index;
        if (!scheduled) {
          await db.rockFinancialTransaction.create({
            data: {
              rockId: id,
              transactionDate: new Date(date),
              transactionTypeValueRockId: type,
              lastSyncRunId: runId,
            },
          });
          await db.rockFinancialTransactionDetail.create({
            data: {
              rockId: id,
              transactionRockId: id,
              accountRockId: accountId,
              amount,
              lastSyncRunId: runId,
            },
          });
        }
        await db.givingFact.create({
          data: {
            reliabilityKind: scheduled ? "SCHEDULED_RECURRING" : "ONE_OFF",
            transactionRockId: scheduled ? null : id,
            transactionDetailRockId: scheduled ? null : id,
            personRockId: 781000,
            householdRockId: 781000,
            accountRockId: accountId,
            amount,
            occurredAt: scheduled ? null : new Date(date),
            effectiveMonth: new Date(date.slice(0, 7) + "-01Z"),
            explanation: "Synthetic test",
            lastSyncRunId: runId,
          },
        });
      }
      const report = await getHouseholdParticipation(
        {
          asOf,
          campusRockIds: [campusId],
          fundRockIds: [accountId],
          first: 50,
        },
        actor,
        db,
      );
      expect(report.totalCount).toBe(123);
      expect(report.summaries.at(-1)).toMatchObject({
        households: 123,
        giving: 1,
        latestGiving: 0,
        nonChristian: 30,
        unknown: 93,
        unresolvedGiving: 0,
      });
      expect(report.rows[0]).toMatchObject({
        rockId: 781000,
        adultCount: 1,
        christianStatus: "NON_CHRISTIAN",
        stage: "OTHER",
        givingSelected: true,
        givingLatest: false,
        recordedGivers: 1,
      });
      expect(report.rows.find((r) => r.rockId === 781003)).toMatchObject({
        adultCount: 4,
        stage: "GROWING",
      });
      expect(report.rows.find((r) => r.rockId === 781004)).toMatchObject({
        christianStatus: "UNKNOWN",
      });
      const ids = report.rows.map((r) => r.rockId);
      let after = report.nextAfter;
      while (after !== null) {
        const page = await getHouseholdParticipation(
          { ...report.filters, after, snapshotId: report.snapshotId },
          actor,
          db,
        );
        expect(page.totalCount).toBe(123);
        ids.push(...page.rows.map((r) => r.rockId));
        after = page.nextAfter;
      }
      expect(new Set(ids).size).toBe(123);
      for (const field of [
        "householdStage",
        "householdChristianStatus",
      ] as const)
        for (const value of field === "householdStage"
          ? HOUSEHOLD_STAGES
          : CHRISTIAN_STATUSES) {
          const list = await db.rockHousehold.findMany({
            where: {
              AND: [
                { campusRockId: campusId },
                householdClassificationWhere(field, [value]),
              ],
            },
            select: { rockId: true },
          });
          const filtered = await getHouseholdParticipation(
            participationInputSchema.parse({
              ...report.filters,
              after: undefined,
              ...(field === "householdStage"
                ? { stage: value }
                : { christianStatus: value }),
            }),
            actor,
            db,
          );
          expect(filtered.totalCount).toBe(list.length);
        }
      const latest = await getHouseholdParticipation(
        { ...report.filters, giving: "LATEST" },
        actor,
        db,
      );
      expect(latest.totalCount).toBe(0);
      const giving = await getHouseholdParticipation(
        { ...report.filters, giving: "SELECTED" },
        actor,
        db,
      );
      expect(giving.totalCount).toBe(1);
      await db.rockFinancialTransaction.update({
        where: { rockId: 783000 },
        data: { status: "Unverified" },
      });
      const unverified = await getHouseholdParticipation(
        { ...report.filters },
        actor,
        db,
      );
      expect(unverified.dataComplete).toBe(false);
      expect(unverified.rows[0]).toMatchObject({
        givingSelected: null,
        reviewReasons: ["UNVERIFIED_TRANSACTION_STATUS"],
      });
    } finally {
      // Remove only this synthetic cohort; no reset of shared test fixtures.
      await db.givingFact.deleteMany({ where: { lastSyncRunId: runId } });
      await db.rockFinancialTransactionDetail.deleteMany({
        where: { lastSyncRunId: runId },
      });
      await db.rockFinancialTransaction.deleteMany({
        where: { lastSyncRunId: runId },
      });
      await db.rockHouseholdMember.deleteMany({
        where: { lastSyncRunId: runId },
      });
      await db.rockPerson.deleteMany({ where: { lastSyncRunId: runId } });
      await db.rockHousehold.deleteMany({ where: { lastSyncRunId: runId } });
      await db.platformFundSetting.deleteMany({
        where: { accountRockId: accountId },
      });
      await db.rockFinancialAccount.deleteMany({
        where: { lastSyncRunId: runId },
      });
      await db.rockCampus.deleteMany({ where: { lastSyncRunId: runId } });
      // Only reference rows created by this run are removed; other fixtures stay.
      await db.rockGroupRole.deleteMany({ where: { lastSyncRunId: runId } });
      await db.rockGroupType.deleteMany({ where: { lastSyncRunId: runId } });
      await db.rockDefinedValue.deleteMany({ where: { lastSyncRunId: runId } });
      await db.syncRun.deleteMany({ where: { id: runId } });
      await db.$disconnect();
    }
  }, 30000);
});
