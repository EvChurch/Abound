// @vitest-environment node
import {
  ROCK_FULL_SYNC_SOURCE,
  ROCK_PERSON_SYNC_SOURCE,
} from "@/lib/sync/models";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { describe, expect, it, vi } from "vitest";
import { RockClient, type RockApiPerson } from "@/lib/rock/client";
import { performRockFullSyncJob } from "@/lib/sync/jobs";
import { listHouseholds } from "@/lib/list-views/households-list";
import { listPeople } from "@/lib/list-views/people-list";
import {
  getRockHouseholdProfile,
  getRockPersonProfile,
} from "@/lib/people/profiles";
import type { FilterDefinition } from "@/lib/list-views/filter-schema";
import type { RockSyncSlice } from "@/lib/rock/client";
import type { SyncProgressEvent } from "@/lib/sync/run-sync";
import { syncRockSlice } from "@/lib/sync/run-sync";
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
          source: ROCK_FULL_SYNC_SOURCE,
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
      await db.syncRun.create({
        data: {
          id: `${prefix}:older-person`,
          source: ROCK_PERSON_SYNC_SOURCE,
          status: "STARTED",
          startedAt: new Date("2098-01-01Z"),
        },
      });
      const overlapping = await getHouseholdParticipation(
        { ...report.filters },
        actor,
        db,
      );
      expect(overlapping.snapshotStable).toBe(false);
      expect(overlapping.dataComplete).toBe(false);
      await db.syncRun.update({
        where: { id: `${prefix}:older-person` },
        data: { status: "SUCCEEDED", completedAt: new Date("2099-01-02Z") },
      });
      const completed = await getHouseholdParticipation(
        { ...report.filters },
        actor,
        db,
      );
      expect(completed.snapshotStable).toBe(true);
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
      await db.syncRun.deleteMany({
        where: { id: { in: [runId, `${prefix}:older-person`] } },
      });
      await db.$disconnect();
    }
  }, 30000);

  it("refreshes a newly deceased adult through the full reader and preserves an unavailable identity for review", async () => {
    if (
      url === process.env.DATABASE_URL ||
      !new URL(url!).pathname.includes("test")
    )
      throw new Error("An isolated TEST_DATABASE_URL is required.");
    const db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url! }),
    });
    const campusId = 795000;
    const accountId = 795001;
    const familyA = 795010;
    const familyB = 795020;
    const deceasedId = 795101;
    const missingId = 795103;
    const people: RockApiPerson[] = [deceasedId, 795102, missingId, 795104].map(
      (Id, i) => ({
        Id,
        PrimaryAliasId: Id + 100,
        PrimaryFamilyId: i < 2 ? familyA : familyB,
        GivingGroupId: i < 2 ? familyA : familyB,
        RecordStatusValueId: 3,
        ConnectionStatusValueId: i % 2 === 0 ? 1229 : 65,
        IsDeceased: false,
      }),
    );
    let changed = false;
    const client = new RockClient({
      baseUrl: "https://rock.example.test",
      restKey: "synthetic-key",
      fetcher: async (input) => {
        const request = new URL(String(input));
        const currentPeople = people
          .filter((p) => !changed || p.Id !== missingId)
          .map((p) =>
            changed && p.Id === deceasedId
              ? { ...p, IsDeceased: true, RecordStatusValueId: 4 }
              : p,
          );
        const sources: Record<string, unknown[]> = {
          "/api/GroupTypes": [{ Id: 10, Name: "Family" }],
          "/api/GroupTypeRoles": [{ Id: 3, GroupTypeId: 10, Name: "Adult" }],
          "/api/DefinedValues": [
            { Id: 3, Value: "Active" },
            { Id: 4, Value: "Inactive" },
            { Id: 65, Value: "Investigating" },
            { Id: 1229, Value: "Growing" },
            { Id: 53, Value: "Contribution" },
          ],
          "/api/PersonAlias": currentPeople.map((p) => ({
            Id: p.PrimaryAliasId,
            PersonId: p.Id,
          })),
          "/api/People": currentPeople.filter(
            (p) =>
              request.searchParams.get("includeDeceased") === "true" ||
              !p.IsDeceased,
          ),
          "/api/Groups": [familyA, familyB].map((Id) => ({
            Id,
            Name: "Synthetic family",
            GroupTypeId: 10,
            CampusId: campusId,
            IsActive: true,
            IsArchived: false,
          })),
          "/api/GroupMembers": currentPeople
            .filter(
              (p) =>
                request.searchParams.get("IncludeDeceased") === "true" ||
                !p.IsDeceased,
            )
            .map((p) => ({
              Id: p.Id,
              PersonId: p.Id,
              GroupId: p.PrimaryFamilyId,
              GroupRoleId: 3,
              GroupMemberStatus: 1,
              IsArchived: false,
            })),
          "/api/Campuses": [
            {
              Id: campusId,
              Name: "Synthetic deceased sync campus",
              IsActive: true,
            },
          ],
          "/api/FinancialAccounts": [
            { Id: accountId, Name: "Synthetic fund", IsActive: true },
          ],
          "/api/FinancialTransactions": [
            {
              Id: 795301,
              AuthorizedPersonAliasId: deceasedId + 100,
              TransactionTypeValueId: 53,
              TransactionDateTime: "2026-09-15T00:00:00Z",
            },
          ],
          "/api/FinancialTransactionDetails": [
            {
              Id: 795401,
              TransactionId: 795301,
              AccountId: accountId,
              Amount: 10,
            },
          ],
        };
        const rows = sources[request.pathname] ?? [];
        const skip = Number(request.searchParams.get("$skip"));
        const top = Number(request.searchParams.get("$top"));
        return Response.json(rows.slice(skip, skip + top));
      },
    });
    const originalType = await db.rockGroupType.findUnique({
      where: { rockId: 10 },
    });
    const originalRole = await db.rockGroupRole.findUnique({
      where: { rockId: 3 },
    });
    const originalValues = await db.rockDefinedValue.findMany({
      where: { rockId: { in: [3, 4, 65, 1229, 53] } },
    });
    const runIds: string[] = [];
    const actor = {
      id: "synthetic-staff",
      auth0Subject: "synthetic-staff",
      active: true,
      name: null,
      email: null,
      rockPersonId: null,
    };
    const reportInput = {
      campusRockIds: [campusId],
      fundRockIds: [accountId],
      asOf: "2026-10-24T00:00:00Z",
    };
    try {
      const initial = await syncRockSlice(
        db,
        await client.getFullSyncSlice({ pageSize: 2 }),
      );
      runIds.push(initial.syncRunId);
      expect(initial.status).toBe("SUCCEEDED");
      await db.platformFundSetting.create({
        data: { accountRockId: accountId, enabled: true },
      });
      const before = await getHouseholdParticipation(reportInput, actor, db);
      expect(before.rows.map((r) => r.stage)).toEqual(["GROWING", "GROWING"]);
      changed = true;
      const updated = await syncRockSlice(
        db,
        await client.getFullSyncSlice({ pageSize: 2 }),
      );
      runIds.push(updated.syncRunId);
      expect(updated.status).toBe("SUCCEEDED");
      expect(
        await db.rockPerson.findUniqueOrThrow({
          where: { rockId: deceasedId },
        }),
      ).toMatchObject({
        deceased: true,
        recordStatusValueRockId: 4,
        lastSyncRunId: updated.syncRunId,
      });
      expect(
        await db.rockHouseholdMember.findUniqueOrThrow({
          where: { rockId: deceasedId },
        }),
      ).toMatchObject({
        archived: false,
        groupMemberStatus: 1,
        lastSyncRunId: updated.syncRunId,
      });
      const after = await getHouseholdParticipation(reportInput, actor, db);
      expect(after.snapshotStable).toBe(true);
      expect(after.rows.find((r) => r.rockId === familyA)).toMatchObject({
        adultCount: 1,
        stage: "OTHER",
        christianStatus: "NON_CHRISTIAN",
        givingSelected: true,
        reviewReasons: [],
      });
      expect(after.rows.find((r) => r.rockId === familyB)).toMatchObject({
        adultCount: 2,
        givingSelected: null,
        reviewReasons: ["STALE_ADULT_MEMBERSHIP"],
        reviewMembershipRockIds: [missingId],
      });
      expect(after.dataComplete).toBe(false);
      expect(
        await db.rockPerson.findUniqueOrThrow({ where: { rockId: missingId } }),
      ).toMatchObject({
        deceased: false,
        recordStatusValueRockId: 3,
        mergedIntoPersonRockId: null,
      });
      const facts = await db.givingFact.findMany({
        where: { personRockId: deceasedId },
      });
      expect(facts).toHaveLength(1);
      expect(facts[0].amount.toString()).toBe("10");
      expect(facts[0].householdRockId).toBe(familyA);
    } finally {
      const cohort = { lastSyncRunId: { in: runIds } };
      await db.givingLifecycleSnapshot.deleteMany({ where: cohort });
      await db.givingFact.deleteMany({ where: cohort });
      await db.rockFinancialTransactionDetail.deleteMany({ where: cohort });
      await db.rockFinancialTransaction.deleteMany({ where: cohort });
      await db.rockHouseholdMember.deleteMany({ where: cohort });
      await db.rockPerson.updateMany({
        where: cohort,
        data: { primaryAliasRockId: null },
      });
      await db.rockPersonAlias.deleteMany({ where: cohort });
      await db.rockPerson.deleteMany({ where: cohort });
      await db.rockHousehold.deleteMany({ where: cohort });
      await db.platformFundSetting.deleteMany({
        where: { accountRockId: accountId },
      });
      await db.rockFinancialAccount.deleteMany({ where: cohort });
      await db.rockCampus.deleteMany({ where: cohort });
      if (originalRole)
        await db.rockGroupRole.update({
          where: { rockId: 3 },
          data: originalRole,
        });
      if (originalType)
        await db.rockGroupType.update({
          where: { rockId: 10 },
          data: originalType,
        });
      for (const value of originalValues)
        await db.rockDefinedValue.update({
          where: { rockId: value.rockId },
          data: value,
        });
      await db.rockGroupRole.deleteMany({ where: cohort });
      await db.rockGroupType.deleteMany({ where: cohort });
      await db.rockDefinedValue.deleteMany({ where: cohort });
      await db.syncIssue.deleteMany({ where: { syncRunId: { in: runIds } } });
      await db.syncRun.deleteMany({ where: { id: { in: runIds } } });
      await db.$disconnect();
    }
  }, 30000);

  it("retains removal proof, reconciles current consumers and permits a later new Rock membership ID", async () => {
    if (
      url === process.env.DATABASE_URL ||
      !new URL(url!).pathname.includes("test")
    )
      throw new Error("An isolated TEST_DATABASE_URL is required.");
    const db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url! }),
    });
    const campusId = 796000,
      accountId = 796001,
      familyId = 796010,
      connectId = 796020;
    const oldId = 796101,
      survivorId = 796102,
      personId = 796201,
      otherPersonId = 796202,
      newId = 796103;
    const oldMember = {
      Id: oldId,
      GroupId: familyId,
      PersonId: personId,
      GroupTypeId: 10,
      GroupRoleId: 3,
      GroupMemberStatus: 1,
      IsArchived: false,
    };
    const survivor = { ...oldMember, Id: survivorId, PersonId: otherPersonId };
    const source: RockSyncSlice = {
      groupTypes: [
        { Id: 10, Name: "Family" },
        { Id: 25, Name: "Connect Group" },
      ],
      groupRoles: [{ Id: 3, GroupTypeId: 10, Name: "Adult" }],
      definedValues: [
        { Id: 3, Value: "Active" },
        { Id: 65, Value: "Investigating" },
        { Id: 1229, Value: "Growing" },
        { Id: 53, Value: "Contribution" },
      ],
      personAliases: [
        { Id: 796301, PersonId: personId },
        { Id: 796302, PersonId: otherPersonId },
      ],
      people: [
        {
          Id: personId,
          FirstName: "Synthetic Former",
          PrimaryAliasId: 796301,
          PrimaryFamilyId: familyId,
          PrimaryCampusId: campusId,
          GivingGroupId: familyId,
          RecordStatusValueId: 3,
          ConnectionStatusValueId: 1229,
          Email: "synthetic@example.test",
          IsEmailActive: true,
        },
        {
          Id: otherPersonId,
          FirstName: "Synthetic Survivor",
          PrimaryAliasId: 796302,
          PrimaryFamilyId: familyId,
          PrimaryCampusId: campusId,
          GivingGroupId: familyId,
          RecordStatusValueId: 3,
          ConnectionStatusValueId: 65,
        },
      ],
      familyGroups: [
        {
          Id: familyId,
          Name: "Synthetic reconciliation family",
          GroupTypeId: 10,
          CampusId: campusId,
          IsActive: true,
          IsArchived: false,
        },
      ],
      familyMembers: [oldMember, survivor],
      campuses: [
        {
          Id: campusId,
          Name: "Synthetic reconciliation campus",
          IsActive: true,
        },
      ],
      groups: [
        {
          Id: connectId,
          Name: "Synthetic connect",
          GroupTypeId: 25,
          IsActive: true,
          IsArchived: false,
        },
      ],
      groupMembers: [
        {
          Id: 796501,
          GroupId: connectId,
          PersonId: personId,
          GroupTypeId: 25,
          GroupMemberStatus: 1,
          IsArchived: false,
        },
      ],
      financialAccounts: [
        {
          Id: accountId,
          Name: "Synthetic reconciliation fund",
          IsActive: true,
        },
      ],
      financialTransactions: [
        {
          Id: 796401,
          AuthorizedPersonAliasId: 796301,
          TransactionTypeValueId: 53,
          TransactionDateTime: "2026-09-15T00:00:00Z",
        },
      ],
      financialTransactionDetails: [
        { Id: 796402, TransactionId: 796401, AccountId: accountId, Amount: 75 },
      ],
      financialScheduledTransactions: [],
      financialScheduledTransactionDetails: [],
    };
    const historyRow = (
      Id: number,
      EntityTypeId: number,
      EntityId: number,
      Verb: string,
      CreatedDateTime = "2026-06-29T15:46:28.377",
    ) => ({
      Id,
      EntityTypeId,
      EntityId,
      Verb,
      ChangeType: "Record",
      RelatedEntityTypeId: 16,
      RelatedEntityId: familyId,
      CreatedDateTime,
    });
    let histories = [
      historyRow(1, 90, oldId, "ADDEDTOGROUP", "2026-06-22T19:03:35.32"),
      historyRow(2, 15, personId, "REMOVEDFROMGROUP"),
      historyRow(3, 90, oldId, "REMOVEDFROMGROUP"),
    ];
    let oldPresent = false,
      replacementPresent = false;
    const rock = new RockClient({
      baseUrl: "https://rock.example.test",
      restKey: "synthetic-key",
      fetcher: async (input) => {
        const path = new URL(String(input)).pathname;
        if (path === "/api/Histories") return Response.json(histories);
        if (path === `/api/GroupMembers/${oldId}`)
          return oldPresent
            ? Response.json(oldMember)
            : new Response(null, { status: 404 });
        if (path === `/api/GroupMembers/${newId}`)
          return replacementPresent
            ? Response.json({ ...oldMember, Id: newId })
            : new Response(null, { status: 404 });
        throw new Error("Unexpected synthetic source request");
      },
    });
    vi.spyOn(rock, "getFullSyncSlice").mockImplementation(async () => source);
    const originals = {
      types: await db.rockGroupType.findMany({
        where: { rockId: { in: [10, 25] } },
      }),
      role: await db.rockGroupRole.findUnique({ where: { rockId: 3 } }),
      values: await db.rockDefinedValue.findMany({
        where: { rockId: { in: [3, 65, 1229, 53] } },
      }),
    };
    const runIds = new Set<string>();
    const syncOptions = {
      onProgress: ({ syncRunId }: SyncProgressEvent) => {
        runIds.add(syncRunId);
      },
    };
    const actor = {
      id: "synthetic-staff",
      auth0Subject: "synthetic-staff",
      active: true,
      name: null,
      email: null,
      rockPersonId: null,
    };
    const reportInput = {
      campusRockIds: [campusId],
      fundRockIds: [accountId],
      asOf: "2026-10-24T00:00:00Z",
    };
    const filter = (
      resource: "people" | "households",
      extra: FilterDefinition["conditions"] = [],
    ): FilterDefinition => ({
      type: "group",
      mode: "all",
      conditions: [
        {
          type: "condition",
          field: resource === "people" ? "primaryCampusRockId" : "campusRockId",
          operator: "EQUALS",
          value: String(campusId),
        },
        ...extra,
      ],
    });
    const run = () =>
      performRockFullSyncJob({}, { prisma: db, rockClient: rock, syncOptions });
    try {
      expect((await syncRockSlice(db, source, syncOptions)).status).toBe(
        "SUCCEEDED",
      );
      await db.platformFundSetting.create({
        data: { accountRockId: accountId, enabled: true },
      });
      expect(
        (await getHouseholdParticipation(reportInput, actor, db)).rows[0],
      ).toMatchObject({ adultCount: 2, stage: "GROWING" });
      source.familyMembers = [survivor];
      const removed = await run();
      expect(removed.status).toBe("SUCCEEDED");
      const retained = await db.rockHouseholdMember.findUniqueOrThrow({
        where: { rockId: oldId },
      });
      expect(retained).toMatchObject({
        archived: false,
        groupMemberStatus: 1,
        personRockId: personId,
        householdRockId: familyId,
        lastSyncRunId: removed.syncRunId,
      });
      expect(retained.sourceRemovalVerifiedAt).not.toBeNull();
      expect(retained.sourceRemovalEvidence).toMatchObject({
        memberHistoryRockId: 3,
        personHistoryRockId: 2,
        sourceRecordedAt: "2026-06-29T15:46:28.377",
      });
      const after = await getHouseholdParticipation(reportInput, actor, db);
      expect(after.dataComplete).toBe(true);
      expect(after.rows[0]).toMatchObject({
        adultCount: 1,
        stage: "OTHER",
        christianStatus: "NON_CHRISTIAN",
        givingSelected: true,
        reviewReasons: [],
      });
      expect(
        (
          await db.rockHousehold.findMany({
            where: householdClassificationWhere("householdChristianStatus", [
              "NON_CHRISTIAN",
            ]),
            select: { rockId: true },
          })
        ).map((h) => h.rockId),
      ).toContain(familyId);
      const list = await listHouseholds(
        { filterDefinition: filter("households") },
        actor,
        db,
      );
      expect(list.edges[0].node).toMatchObject({ memberCount: 1 });
      expect(list.edges[0].node.primaryContacts.map((p) => p.rockId)).toEqual([
        otherPersonId,
      ]);
      for (const field of [
        "hasEmailCapableMember",
        "hasActiveConnectGroupMember",
      ]) {
        const matching = await listHouseholds(
          {
            filterDefinition: filter("households", [
              { type: "condition", field, operator: "EQUALS", value: false },
            ]),
          },
          actor,
          db,
        );
        expect(matching.edges.map((e) => e.node.rockId)).toEqual([familyId]);
      }
      const adults = await listPeople(
        {
          filterDefinition: filter("people", [
            {
              type: "condition",
              field: "ageGroup",
              operator: "EQUALS",
              value: "ADULT",
            },
          ]),
        },
        actor,
        db,
      );
      expect(adults.edges.map((e) => e.node.rockId)).toEqual([otherPersonId]);
      expect(
        (
          await getRockHouseholdProfile({ rockId: familyId }, actor, db)
        )?.members.map((m) => m.rockId),
      ).toEqual([survivorId]);
      expect(
        (await getRockPersonProfile({ rockId: personId }, actor, db))
          ?.householdMemberships,
      ).toEqual([]);
      const assertGiving = async () => {
        const facts = await db.givingFact.findMany({
          where: { personRockId: personId },
        });
        expect(facts).toHaveLength(1);
        expect(facts[0].amount.toString()).toBe("75");
        expect(facts[0].householdRockId).toBe(familyId);
        expect(
          await db.rockPerson.findUniqueOrThrow({
            where: { rockId: personId },
          }),
        ).toMatchObject({
          primaryFamilyRockId: familyId,
          givingGroupRockId: familyId,
          mergedIntoPersonRockId: null,
          deceased: false,
        });
      };
      await assertGiving();
      expect((await run()).status).toBe("SUCCEEDED");
      expect(
        await db.syncIssue.count({
          where: {
            code: "FAMILY_MEMBERSHIP_REMOVAL_CONFIRMED",
            rockId: String(oldId),
          },
        }),
      ).toBe(1);
      oldPresent = true;
      source.familyMembers = [oldMember, survivor];
      expect((await run()).status).toBe("SUCCEEDED");
      expect(
        (
          await db.rockHouseholdMember.findUniqueOrThrow({
            where: { rockId: oldId },
          })
        ).sourceRemovalVerifiedAt,
      ).toBeNull();
      expect(
        (
          await db.rockHouseholdMember.findUniqueOrThrow({
            where: { rockId: oldId },
          })
        ).sourceRemovalEvidence,
      ).toMatchObject({ memberHistoryRockId: 3 });
      oldPresent = false;
      source.familyMembers = [survivor];
      expect((await run()).status).toBe("PARTIAL"); // Old June proof cannot be replayed after reappearance.
      expect(
        (
          await db.rockHouseholdMember.findUniqueOrThrow({
            where: { rockId: oldId },
          })
        ).sourceRemovalVerifiedAt,
      ).toBeNull();
      histories = [
        ...histories,
        historyRow(4, 15, personId, "ADDEDTOGROUP", "2026-07-01T10:00:00"),
        historyRow(5, 15, personId, "REMOVEDFROMGROUP", "2026-07-02T10:00:00"),
        historyRow(6, 90, oldId, "REMOVEDFROMGROUP", "2026-07-02T10:00:00"),
        historyRow(7, 15, personId, "ADDEDTOGROUP", "2026-07-03T10:00:00"),
      ];
      replacementPresent = true;
      source.familyMembers = [{ ...oldMember, Id: newId }, survivor];
      expect((await run()).status).toBe("SUCCEEDED");
      const rows = await db.rockHouseholdMember.findMany({
        where: { householdRockId: familyId },
        orderBy: { rockId: "asc" },
      });
      expect(rows).toHaveLength(3);
      expect(
        rows.find((m) => m.rockId === oldId)?.sourceRemovalVerifiedAt,
      ).not.toBeNull();
      expect(
        rows.find((m) => m.rockId === newId)?.sourceRemovalVerifiedAt,
      ).toBeNull();
      const final = await getHouseholdParticipation(reportInput, actor, db);
      expect(final.dataComplete).toBe(true);
      expect(final.rows[0]).toMatchObject({ adultCount: 2, stage: "GROWING" });
      expect(
        (
          await listHouseholds(
            { filterDefinition: filter("households") },
            actor,
            db,
          )
        ).edges[0].node.memberCount,
      ).toBe(2);
      expect(
        (
          await getRockPersonProfile({ rockId: personId }, actor, db)
        )?.householdMemberships.map((m) => m.rockId),
      ).toEqual([newId]);
      expect(
        await db.syncIssue.count({
          where: {
            code: "FAMILY_MEMBERSHIP_REMOVAL_CONFIRMED",
            rockId: String(oldId),
          },
        }),
      ).toBe(2);
      expect(
        await db.syncIssue.count({
          where: {
            code: "FAMILY_MEMBERSHIP_SOURCE_REAPPEARED",
            rockId: String(oldId),
          },
        }),
      ).toBe(1);
      await assertGiving();
    } finally {
      const ids = [...runIds],
        cohort = { lastSyncRunId: { in: ids } };
      await db.givingLifecycleSnapshot.deleteMany({ where: cohort });
      await db.givingFact.deleteMany({ where: cohort });
      await db.rockFinancialTransactionDetail.deleteMany({ where: cohort });
      await db.rockFinancialTransaction.deleteMany({ where: cohort });
      await db.rockGroupMember.deleteMany({ where: cohort });
      await db.rockGroup.deleteMany({ where: cohort });
      await db.rockHouseholdMember.deleteMany({ where: cohort });
      await db.rockPerson.updateMany({
        where: cohort,
        data: { primaryAliasRockId: null },
      });
      await db.rockPersonAlias.deleteMany({ where: cohort });
      await db.rockPerson.deleteMany({ where: cohort });
      await db.rockHousehold.deleteMany({ where: cohort });
      await db.platformFundSetting.deleteMany({
        where: { accountRockId: accountId },
      });
      await db.rockFinancialAccount.deleteMany({ where: cohort });
      await db.rockCampus.deleteMany({ where: cohort });
      if (originals.role)
        await db.rockGroupRole.update({
          where: { rockId: 3 },
          data: originals.role,
        });
      for (const t of originals.types)
        await db.rockGroupType.update({ where: { rockId: t.rockId }, data: t });
      for (const v of originals.values)
        await db.rockDefinedValue.update({
          where: { rockId: v.rockId },
          data: v,
        });
      await db.rockGroupRole.deleteMany({ where: cohort });
      await db.rockGroupType.deleteMany({ where: cohort });
      await db.rockDefinedValue.deleteMany({ where: cohort });
      await db.syncIssue.deleteMany({ where: { syncRunId: { in: ids } } });
      await db.syncRun.deleteMany({ where: { id: { in: ids } } });
      await db.$disconnect();
    }
  }, 30000);
});
