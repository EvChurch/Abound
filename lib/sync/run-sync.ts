import type { Prisma, PrismaClient } from "@prisma/client";

import type { RockPersonSlice, RockSyncSlice } from "@/lib/rock/client";
import type { SanitizedRockFixtureBundle } from "@/lib/rock/types";
import {
  classifyGiftReliability,
  CONNECT_GROUP_TYPE_ID,
  FAMILY_GROUP_TYPE_ID,
  GROUP_MEMBER_STATUS,
  resolveGivingHouseholdRockId,
} from "@/lib/giving/models";
import { refreshGivingLifecycleSnapshots } from "@/lib/giving/lifecycle-snapshots";
import { ROCK_SYNC_SOURCE } from "@/lib/sync/models";
import type { SyncIssueInput } from "@/lib/sync/reconcile";
import { redactForLog } from "@/lib/sync/redaction";

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type SyncSummary = {
  syncRunId: string;
  status: "SUCCEEDED" | "PARTIAL" | "FAILED";
  recordsRead: number;
  recordsWritten: number;
  recordsSkipped: number;
  issueCount: number;
};

export type SyncProgressEvent = {
  syncRunId: string;
  stage: string;
  completed: number;
  total: number;
};

export type SyncRunOptions = {
  chunkSize?: number;
  onProgress?: (event: SyncProgressEvent) => void;
};

type NormalizedSyncData = {
  groupTypes: Prisma.RockGroupTypeCreateManyInput[];
  groupRoles: Prisma.RockGroupRoleCreateManyInput[];
  definedValues: Prisma.RockDefinedValueCreateManyInput[];
  personAliases: Prisma.RockPersonAliasCreateManyInput[];
  campuses: Prisma.RockCampusCreateManyInput[];
  households: Prisma.RockHouseholdCreateManyInput[];
  people: Prisma.RockPersonCreateManyInput[];
  householdMembers: Prisma.RockHouseholdMemberCreateManyInput[];
  groups: Prisma.RockGroupCreateManyInput[];
  groupMembers: Prisma.RockGroupMemberCreateManyInput[];
  financialAccounts: Prisma.RockFinancialAccountCreateManyInput[];
  financialTransactions: Prisma.RockFinancialTransactionCreateManyInput[];
  financialTransactionDetails: Prisma.RockFinancialTransactionDetailCreateManyInput[];
  financialScheduledTransactions: Prisma.RockFinancialScheduledTransactionCreateManyInput[];
  financialScheduledTransactionDetails: Prisma.RockFinancialScheduledTransactionDetailCreateManyInput[];
  givingFacts: Prisma.GivingFactCreateManyInput[];
  issues: SyncIssueInput[];
};

export async function syncFixtureBundle(
  prisma: PrismaClient,
  bundle: SanitizedRockFixtureBundle,
  options: SyncRunOptions = {},
) {
  return persistNormalizedSync(
    prisma,
    fixtureToNormalized(bundle),
    "fixture",
    options,
  );
}

export async function syncRockPersonSlice(
  prisma: PrismaClient,
  slice: RockPersonSlice,
  options: SyncRunOptions = {},
) {
  return syncRockSlice(prisma, slice, options);
}

export async function syncRockSlice(
  prisma: PrismaClient,
  slice: RockSyncSlice,
  options: SyncRunOptions = {},
) {
  return persistNormalizedSync(
    prisma,
    rockPersonSliceToNormalized(slice),
    "rock:v1",
    options,
  );
}

async function persistNormalizedSync(
  prisma: PrismaClient,
  data: NormalizedSyncData,
  source: string,
  options: SyncRunOptions,
): Promise<SyncSummary> {
  const recordsRead = countRecords(data);
  const chunkSize = options.chunkSize ?? 250;

  const syncRun = await prisma.syncRun.create({
    data: {
      source,
      status: "STARTED",
      recordsRead,
    },
  });

  try {
    const normalized = withSyncRunId(data, syncRun.id);
    let written = 0;
    const progress = (stage: string, completed: number, total: number) => {
      options.onProgress?.({ syncRunId: syncRun.id, stage, completed, total });
    };

    written += await persistUpserts(
      prisma,
      "groupTypes",
      normalized.groupTypes,
      chunkSize,
      progress,
      async (tx, groupType) => {
        await tx.rockGroupType.upsert({
          where: { rockId: groupType.rockId },
          create: groupType,
          update: groupType,
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "groupRoles",
      normalized.groupRoles,
      chunkSize,
      progress,
      async (tx, groupRole) => {
        await tx.rockGroupRole.upsert({
          where: { rockId: groupRole.rockId },
          create: groupRole,
          update: groupRole,
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "definedValues",
      normalized.definedValues,
      chunkSize,
      progress,
      async (tx, definedValue) => {
        await tx.rockDefinedValue.upsert({
          where: { rockId: definedValue.rockId },
          create: definedValue,
          update: definedValue,
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "campuses",
      normalized.campuses,
      chunkSize,
      progress,
      async (tx, campus) => {
        await tx.rockCampus.upsert({
          where: { rockId: campus.rockId },
          create: campus,
          update: campus,
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "households",
      normalized.households,
      chunkSize,
      progress,
      async (tx, household) => {
        await tx.rockHousehold.upsert({
          where: { rockId: household.rockId },
          create: household,
          update: household,
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "people",
      normalized.people,
      chunkSize,
      progress,
      async (tx, person) => {
        const personWithoutSelfReference = {
          ...person,
          primaryAliasRockId: null,
          givingLeaderRockId: null,
        };

        await tx.rockPerson.upsert({
          where: { rockId: person.rockId },
          create: personWithoutSelfReference,
          update: personWithoutSelfReference,
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "personAliases",
      normalized.personAliases,
      chunkSize,
      progress,
      async (tx, personAlias) => {
        await tx.rockPersonAlias.upsert({
          where: { rockId: personAlias.rockId },
          create: personAlias,
          update: personAlias,
        });
      },
    );

    await persistUpdates(
      prisma,
      "peopleReferences",
      normalized.people.filter(
        (person) => person.givingLeaderRockId || person.primaryAliasRockId,
      ),
      chunkSize,
      progress,
      async (tx, person) => {
        await tx.rockPerson.update({
          where: { rockId: person.rockId },
          data: {
            givingLeaderRockId: person.givingLeaderRockId,
            primaryAliasRockId: person.primaryAliasRockId,
          },
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "householdMembers",
      normalized.householdMembers,
      chunkSize,
      progress,
      async (tx, householdMember) => {
        await tx.rockHouseholdMember.upsert({
          where: { rockId: householdMember.rockId },
          create: householdMember,
          update: householdMember,
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "groups",
      normalized.groups,
      chunkSize,
      progress,
      async (tx, group) => {
        const groupWithoutSelfReference = {
          ...group,
          parentGroupRockId: null,
        };

        await tx.rockGroup.upsert({
          where: { rockId: group.rockId },
          create: groupWithoutSelfReference,
          update: groupWithoutSelfReference,
        });
      },
    );

    await persistUpdates(
      prisma,
      "groupParents",
      normalized.groups.filter((group) => group.parentGroupRockId),
      chunkSize,
      progress,
      async (tx, group) => {
        await tx.rockGroup.update({
          where: { rockId: group.rockId },
          data: { parentGroupRockId: group.parentGroupRockId },
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "groupMembers",
      normalized.groupMembers,
      chunkSize,
      progress,
      async (tx, groupMember) => {
        await tx.rockGroupMember.upsert({
          where: { rockId: groupMember.rockId },
          create: groupMember,
          update: groupMember,
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "financialAccounts",
      normalized.financialAccounts,
      chunkSize,
      progress,
      async (tx, account) => {
        const accountWithoutSelfReference = {
          ...account,
          parentAccountRockId: null,
        };

        await tx.rockFinancialAccount.upsert({
          where: { rockId: account.rockId },
          create: accountWithoutSelfReference,
          update: accountWithoutSelfReference,
        });
      },
    );

    await persistUpdates(
      prisma,
      "financialAccountParents",
      normalized.financialAccounts.filter(
        (account) => account.parentAccountRockId,
      ),
      chunkSize,
      progress,
      async (tx, account) => {
        await tx.rockFinancialAccount.update({
          where: { rockId: account.rockId },
          data: { parentAccountRockId: account.parentAccountRockId },
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "scheduledTransactions",
      normalized.financialScheduledTransactions,
      chunkSize,
      progress,
      async (tx, scheduledTransaction) => {
        await tx.rockFinancialScheduledTransaction.upsert({
          where: { rockId: scheduledTransaction.rockId },
          create: scheduledTransaction,
          update: scheduledTransaction,
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "transactions",
      normalized.financialTransactions,
      chunkSize,
      progress,
      async (tx, transaction) => {
        await tx.rockFinancialTransaction.upsert({
          where: { rockId: transaction.rockId },
          create: transaction,
          update: transaction,
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "transactionDetails",
      normalized.financialTransactionDetails,
      chunkSize,
      progress,
      async (tx, detail) => {
        await tx.rockFinancialTransactionDetail.upsert({
          where: { rockId: detail.rockId },
          create: detail,
          update: detail,
        });
      },
    );

    written += await persistUpserts(
      prisma,
      "scheduledTransactionDetails",
      normalized.financialScheduledTransactionDetails,
      chunkSize,
      progress,
      async (tx, detail) => {
        await tx.rockFinancialScheduledTransactionDetail.upsert({
          where: { rockId: detail.rockId },
          create: detail,
          update: detail,
        });
      },
    );

    written += await persistGivingFacts(
      prisma,
      normalized,
      chunkSize,
      progress,
    );

    await persistSyncIssues(
      prisma,
      normalized,
      syncRun.id,
      chunkSize,
      progress,
    );

    const status: SyncSummary["status"] = normalized.issues.some(
      (syncIssue) => syncIssue.severity === "ERROR",
    )
      ? "PARTIAL"
      : "SUCCEEDED";

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status,
        completedAt: new Date(),
        recordsWritten: written,
        recordsSkipped: normalized.issues.length,
      },
    });

    await refreshGivingLifecycleSnapshots({ syncRunId: syncRun.id }, prisma);

    return {
      syncRunId: syncRun.id,
      status,
      recordsRead,
      recordsWritten: written,
      recordsSkipped: normalized.issues.length,
      issueCount: data.issues.length,
    };
  } catch (error) {
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: String(
          redactForLog(error instanceof Error ? error.message : String(error)),
        ),
      },
    });
    throw error;
  }
}

function withSyncRunId(
  data: NormalizedSyncData,
  syncRunId: string,
): NormalizedSyncData {
  return {
    ...data,
    groupTypes: data.groupTypes.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
    groupRoles: data.groupRoles.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
    definedValues: data.definedValues.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
    personAliases: data.personAliases.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
    campuses: data.campuses.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
    households: data.households.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
    people: data.people.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
    householdMembers: data.householdMembers.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
    groups: data.groups.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
    groupMembers: data.groupMembers.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
    financialAccounts: data.financialAccounts.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
    financialTransactions: data.financialTransactions.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
    financialTransactionDetails: data.financialTransactionDetails.map(
      (record) => ({
        ...record,
        lastSyncRunId: syncRunId,
      }),
    ),
    financialScheduledTransactions: data.financialScheduledTransactions.map(
      (record) => ({
        ...record,
        lastSyncRunId: syncRunId,
      }),
    ),
    financialScheduledTransactionDetails:
      data.financialScheduledTransactionDetails.map((record) => ({
        ...record,
        lastSyncRunId: syncRunId,
      })),
    givingFacts: data.givingFacts.map((record) => ({
      ...record,
      lastSyncRunId: syncRunId,
    })),
  };
}

function fixtureToNormalized(
  bundle: SanitizedRockFixtureBundle,
): NormalizedSyncData {
  const issues: SyncIssueInput[] = [];
  const campusIds = idMap(bundle.campuses);
  const householdIds = idMap(bundle.households);
  const personIds = idMap(bundle.people);
  const groupIds = idMap(bundle.groups);
  const accountIds = idMap(bundle.financialAccounts);

  const groupTypes = [
    {
      rockId: FAMILY_GROUP_TYPE_ID,
      name: "Family",
      lastSyncRunId: "pending",
    },
    {
      rockId: CONNECT_GROUP_TYPE_ID,
      name: "Connect Group",
      lastSyncRunId: "pending",
    },
  ];

  const groupRoles: Prisma.RockGroupRoleCreateManyInput[] = [];
  const definedValues: Prisma.RockDefinedValueCreateManyInput[] = [];

  const campuses = bundle.campuses.map((campus) => ({
    rockId: Number(campus.sourceMetadata.rockId),
    rockGuid: campus.sourceMetadata.rockGuid,
    name: campus.name,
    shortCode: campus.shortCode,
    active: campus.isActive,
    sourceUpdatedAt: toDate(campus.sourceMetadata.sourceUpdatedAt),
    lastSyncRunId: "pending",
  }));

  const households = bundle.households.map((household) => ({
    rockId: Number(household.sourceMetadata.rockId),
    rockGuid: household.sourceMetadata.rockGuid,
    groupTypeRockId: FAMILY_GROUP_TYPE_ID,
    campusRockId: household.campusFixtureId
      ? campusIds.get(household.campusFixtureId)
      : null,
    name: household.name,
    active: household.isActive,
    archived: false,
    sourceUpdatedAt: toDate(household.sourceMetadata.sourceUpdatedAt),
    lastSyncRunId: "pending",
  }));

  const people = bundle.people.map((person) => {
    const householdRockId = person.householdFixtureId
      ? householdIds.get(person.householdFixtureId)
      : null;

    return {
      rockId: Number(person.sourceMetadata.rockId),
      rockGuid: person.sourceMetadata.rockGuid,
      primaryAliasRockId: person.primaryAliasId,
      givingGroupRockId: householdRockId,
      primaryFamilyRockId: householdRockId,
      primaryCampusRockId: person.campusFixtureId
        ? campusIds.get(person.campusFixtureId)
        : null,
      photoRockId: person.photoId,
      firstName: person.givenName,
      lastName: person.familyName,
      email: person.email,
      emailActive: person.email ? true : null,
      deceased: !person.isActive,
      sourceUpdatedAt: toDate(person.sourceMetadata.sourceUpdatedAt),
      lastSyncRunId: "pending",
    };
  });

  const personAliases = bundle.people.flatMap((person) =>
    person.primaryAliasId
      ? [
          {
            rockId: person.primaryAliasId,
            personRockId: Number(person.sourceMetadata.rockId),
            sourceUpdatedAt: toDate(person.sourceMetadata.sourceUpdatedAt),
            lastSyncRunId: "pending",
          },
        ]
      : [],
  );

  const householdMembers = bundle.households.flatMap((household) =>
    household.members.flatMap((member, index) => {
      const householdRockId = householdIds.get(household.fixtureId);
      const personRockId = personIds.get(member.personFixtureId);

      if (!householdRockId || !personRockId) {
        issues.push({
          severity: "ERROR",
          source: "fixture",
          recordType: "RockHouseholdMember",
          code: "MISSING_REFERENCE",
          message: "Household member references a missing household or person.",
          redactedDetail: {
            household: household.fixtureId,
            person: member.personFixtureId,
          },
        });
        return [];
      }

      return [
        {
          rockId: 900000000 + index + 1,
          householdRockId,
          personRockId,
          groupMemberStatus: GROUP_MEMBER_STATUS.ACTIVE,
          archived: false,
          sourceUpdatedAt: toDate(household.sourceMetadata.sourceUpdatedAt),
          lastSyncRunId: "pending",
        },
      ];
    }),
  );

  const groups = bundle.groups.map((group) => ({
    rockId: Number(group.sourceMetadata.rockId),
    rockGuid: group.sourceMetadata.rockGuid,
    groupTypeRockId: group.type === "small_group" ? CONNECT_GROUP_TYPE_ID : 0,
    campusRockId: group.campusFixtureId
      ? campusIds.get(group.campusFixtureId)
      : null,
    name: group.name,
    active: group.isActive,
    archived: group.isArchived,
    sourceUpdatedAt: toDate(group.sourceMetadata.sourceUpdatedAt),
    lastSyncRunId: "pending",
  }));

  const groupMembers = bundle.groupMembers.flatMap((member) => {
    const groupRockId = groupIds.get(member.groupFixtureId);
    const personRockId = personIds.get(member.personFixtureId);
    const group = bundle.groups.find(
      (candidate) => candidate.fixtureId === member.groupFixtureId,
    );
    const groupTypeRockId =
      group?.type === "small_group" ? CONNECT_GROUP_TYPE_ID : 0;

    if (!groupRockId || !personRockId) {
      issues.push({
        severity: "ERROR",
        source: "fixture",
        recordType: "RockGroupMember",
        rockId: String(member.sourceMetadata.rockId),
        code: "MISSING_REFERENCE",
        message: "Group member references a missing group or person.",
        redactedDetail: {
          group: member.groupFixtureId,
          person: member.personFixtureId,
        },
      });
      return [];
    }

    return [
      {
        rockId: Number(member.sourceMetadata.rockId),
        rockGuid: member.sourceMetadata.rockGuid,
        groupRockId,
        personRockId,
        groupTypeRockId,
        groupMemberStatus:
          member.status === "Active"
            ? GROUP_MEMBER_STATUS.ACTIVE
            : GROUP_MEMBER_STATUS.INACTIVE,
        archived: member.isArchived,
        activeConnectGroup:
          groupTypeRockId === CONNECT_GROUP_TYPE_ID &&
          !member.isArchived &&
          member.status === "Active" &&
          Boolean(group?.isActive) &&
          !group?.isArchived,
        sourceUpdatedAt: toDate(member.sourceMetadata.sourceUpdatedAt),
        lastSyncRunId: "pending",
      },
    ];
  });

  const financialAccounts = bundle.financialAccounts.map((account) => ({
    rockId: Number(account.sourceMetadata.rockId),
    rockGuid: account.sourceMetadata.rockGuid,
    campusRockId: account.campusFixtureId
      ? campusIds.get(account.campusFixtureId)
      : null,
    name: account.name,
    active: account.isActive,
    sourceUpdatedAt: toDate(account.sourceMetadata.sourceUpdatedAt),
    lastSyncRunId: "pending",
  }));

  const financialTransactions = bundle.gifts.map((gift) => ({
    rockId: Number(gift.sourceMetadata.rockId),
    rockGuid: gift.sourceMetadata.rockGuid,
    authorizedPersonRockId: gift.personFixtureId
      ? personIds.get(gift.personFixtureId)
      : null,
    transactionDate: new Date(gift.transactionDate),
    sourceUpdatedAt: toDate(gift.sourceMetadata.sourceUpdatedAt),
    lastSyncRunId: "pending",
  }));

  const financialTransactionDetails = bundle.gifts.flatMap((gift) =>
    gift.details.map((detail, index) => ({
      rockId: Number(gift.sourceMetadata.rockId) * 1000 + index + 1,
      transactionRockId: Number(gift.sourceMetadata.rockId),
      accountRockId: accountIds.get(detail.accountFixtureId) ?? -1,
      amount: centsToDecimal(detail.amountCents),
      sourceUpdatedAt: toDate(gift.sourceMetadata.sourceUpdatedAt),
      lastSyncRunId: "pending",
    })),
  );

  const financialScheduledTransactions = bundle.recurringGifts.map((gift) => ({
    rockId: Number(gift.sourceMetadata.rockId),
    rockGuid: gift.sourceMetadata.rockGuid,
    authorizedPersonRockId: gift.personFixtureId
      ? personIds.get(gift.personFixtureId)
      : null,
    active: gift.status === "active",
    status: gift.status,
    sourceUpdatedAt: toDate(gift.sourceMetadata.sourceUpdatedAt),
    lastSyncRunId: "pending",
  }));

  const financialScheduledTransactionDetails = bundle.recurringGifts.flatMap(
    (gift) => {
      const accountRockId = accountIds.get(gift.accountFixtureId);

      if (!accountRockId || gift.amountCents == null) {
        return [];
      }

      return [
        {
          rockId: Number(gift.sourceMetadata.rockId) * 1000 + 1,
          scheduledTransactionRockId: Number(gift.sourceMetadata.rockId),
          accountRockId,
          amount: centsToDecimal(gift.amountCents),
          sourceUpdatedAt: toDate(gift.sourceMetadata.sourceUpdatedAt),
          lastSyncRunId: "pending",
        },
      ];
    },
  );

  const givingFacts = [
    ...financialTransactionDetails.map((detail) => {
      const transaction = financialTransactions.find(
        (candidate) => candidate.rockId === detail.transactionRockId,
      );
      const person = people.find(
        (candidate) => candidate.rockId === transaction?.authorizedPersonRockId,
      );
      const householdRockId = person
        ? resolveGivingHouseholdRockId(person)
        : null;

      return {
        reliabilityKind: "ONE_OFF" as const,
        transactionRockId: detail.transactionRockId,
        transactionDetailRockId: detail.rockId,
        personRockId: transaction?.authorizedPersonRockId ?? null,
        householdRockId,
        accountRockId: detail.accountRockId,
        campusRockId: resolveGivingCampusRockId({
          accountRockId: detail.accountRockId,
          financialAccounts,
          householdRockId,
          households,
          person,
        }),
        amount: detail.amount,
        occurredAt: transaction?.transactionDate,
        effectiveMonth: monthStart(transaction?.transactionDate ?? new Date()),
        explanation: "Fixture gift has no scheduled transaction link.",
        lastSyncRunId: "pending",
      };
    }),
    ...financialScheduledTransactionDetails.map((detail) => {
      const scheduledTransaction = financialScheduledTransactions.find(
        (candidate) => candidate.rockId === detail.scheduledTransactionRockId,
      );
      const person = people.find(
        (candidate) =>
          candidate.rockId === scheduledTransaction?.authorizedPersonRockId,
      );
      const householdRockId = person
        ? resolveGivingHouseholdRockId(person)
        : null;

      return {
        reliabilityKind: "SCHEDULED_RECURRING" as const,
        scheduledTransactionRockId: detail.scheduledTransactionRockId,
        scheduledTransactionDetailRockId: detail.rockId,
        personRockId: scheduledTransaction?.authorizedPersonRockId ?? null,
        householdRockId,
        accountRockId: detail.accountRockId,
        campusRockId: resolveGivingCampusRockId({
          accountRockId: detail.accountRockId,
          financialAccounts,
          householdRockId,
          households,
          person,
        }),
        amount: detail.amount,
        effectiveMonth: monthStart(new Date()),
        explanation:
          "Fixture scheduled transaction is active recurring giving.",
        lastSyncRunId: "pending",
      };
    }),
  ];

  return {
    groupTypes,
    groupRoles,
    definedValues,
    personAliases,
    campuses,
    households,
    people,
    householdMembers,
    groups,
    groupMembers,
    financialAccounts,
    financialTransactions,
    financialTransactionDetails,
    financialScheduledTransactions,
    financialScheduledTransactionDetails,
    givingFacts,
    issues,
  };
}

function rockPersonSliceToNormalized(
  slice: RockPersonSlice,
): NormalizedSyncData {
  const issues: SyncIssueInput[] = [];
  const groupTypes = slice.groupTypes.map((groupType) => ({
    rockId: groupType.Id,
    rockGuid: groupType.Guid,
    name: groupType.Name ?? `Group Type ${groupType.Id}`,
    order: groupType.Order,
    sourceUpdatedAt: toDate(groupType.ModifiedDateTime),
    lastSyncRunId: "pending",
  }));
  const groupTypeIds = new Set(groupTypes.map((groupType) => groupType.rockId));

  const groupRoles = slice.groupRoles.flatMap((groupRole) => {
    if (groupRole.GroupTypeId && !groupTypeIds.has(groupRole.GroupTypeId)) {
      return [];
    }

    return [
      {
        rockId: groupRole.Id,
        rockGuid: groupRole.Guid,
        groupTypeRockId: groupRole.GroupTypeId,
        name: groupRole.Name ?? `Group Role ${groupRole.Id}`,
        order: groupRole.Order,
        maxCount: groupRole.MaxCount,
        minCount: groupRole.MinCount,
        sourceUpdatedAt: toDate(groupRole.ModifiedDateTime),
        lastSyncRunId: "pending",
      },
    ];
  });
  const groupRoleIds = new Set(groupRoles.map((groupRole) => groupRole.rockId));

  const definedValues = slice.definedValues.map((definedValue) => ({
    rockId: definedValue.Id,
    rockGuid: definedValue.Guid,
    definedTypeRockId: definedValue.DefinedTypeId,
    value: definedValue.Value ?? `Defined Value ${definedValue.Id}`,
    description: definedValue.Description,
    active: definedValue.IsActive,
    order: definedValue.Order,
    sourceUpdatedAt: toDate(definedValue.ModifiedDateTime),
    lastSyncRunId: "pending",
  }));
  const definedValueIds = new Set(
    definedValues.map((definedValue) => definedValue.rockId),
  );

  const campuses = slice.campuses.map((campus) => ({
    rockId: campus.Id,
    rockGuid: campus.Guid,
    name: campus.Name ?? `Campus ${campus.Id}`,
    shortCode: campus.ShortCode,
    active: campus.IsActive ?? true,
    sourceUpdatedAt: toDate(campus.ModifiedDateTime),
    lastSyncRunId: "pending",
  }));
  const campusIds = new Set(campuses.map((campus) => campus.rockId));

  const households = slice.familyGroups.map((group) => ({
    rockId: group.Id,
    rockGuid: group.Guid,
    groupTypeRockId: group.GroupTypeId ?? FAMILY_GROUP_TYPE_ID,
    campusRockId:
      group.CampusId && campusIds.has(group.CampusId) ? group.CampusId : null,
    name: group.Name ?? `Family ${group.Id}`,
    active: group.IsActive ?? true,
    archived: group.IsArchived ?? false,
    sourceUpdatedAt: toDate(group.ModifiedDateTime),
    lastSyncRunId: "pending",
  }));

  const householdIds = new Set(households.map((household) => household.rockId));

  const slicePersonIds = new Set(slice.people.map((person) => person.Id));
  const people = slice.people.map((person) => ({
    rockId: person.Id,
    rockGuid: person.Guid,
    primaryAliasRockId: person.PrimaryAliasId,
    primaryAliasGuid: person.PrimaryAliasGuid,
    givingGroupRockId:
      person.GivingGroupId && householdIds.has(person.GivingGroupId)
        ? person.GivingGroupId
        : null,
    givingId: person.GivingId,
    givingLeaderRockId:
      person.GivingLeaderId && slicePersonIds.has(person.GivingLeaderId)
        ? person.GivingLeaderId
        : null,
    primaryFamilyRockId:
      person.PrimaryFamilyId && householdIds.has(person.PrimaryFamilyId)
        ? person.PrimaryFamilyId
        : null,
    primaryCampusRockId:
      person.PrimaryCampusId && campusIds.has(person.PrimaryCampusId)
        ? person.PrimaryCampusId
        : null,
    photoRockId: person.PhotoId,
    firstName: person.FirstName,
    nickName: person.NickName,
    lastName: person.LastName,
    email: person.Email,
    emailActive: person.IsEmailActive,
    recordStatusValueRockId:
      person.RecordStatusValueId &&
      definedValueIds.has(person.RecordStatusValueId)
        ? person.RecordStatusValueId
        : null,
    deceased: person.IsDeceased ?? false,
    sourceUpdatedAt: toDate(person.ModifiedDateTime),
    lastSyncRunId: "pending",
  }));

  const personIds = new Set(people.map((person) => person.rockId));
  const personAliases = slice.personAliases.flatMap((alias) => {
    if (alias.PersonId && !personIds.has(alias.PersonId)) {
      return [];
    }

    return [
      {
        rockId: alias.Id,
        rockGuid: alias.Guid,
        personRockId: alias.PersonId,
        sourceUpdatedAt: toDate(alias.ModifiedDateTime),
        lastSyncRunId: "pending",
      },
    ];
  });
  const personAliasIds = new Set(
    personAliases.map((personAlias) => personAlias.rockId),
  );

  const householdMembers = slice.familyMembers.flatMap((member) => {
    if (
      !member.GroupId ||
      !member.PersonId ||
      !householdIds.has(member.GroupId)
    ) {
      return [];
    }

    if (!personIds.has(member.PersonId)) {
      issues.push({
        severity: "WARNING",
        source: ROCK_SYNC_SOURCE,
        recordType: "RockHouseholdMember",
        rockId: String(member.Id),
        code: "MISSING_PERSON",
        message:
          "Family member referenced a person outside the synced people set.",
      });
      return [];
    }

    return [
      {
        rockId: member.Id,
        rockGuid: member.Guid,
        householdRockId: member.GroupId,
        personRockId: member.PersonId,
        groupRoleRockId:
          member.GroupRoleId && groupRoleIds.has(member.GroupRoleId)
            ? member.GroupRoleId
            : null,
        groupMemberStatus: member.GroupMemberStatus,
        archived: member.IsArchived ?? false,
        sourceUpdatedAt: toDate(member.ModifiedDateTime),
        lastSyncRunId: "pending",
      },
    ];
  });

  const connectGroupIds = new Set(
    slice.groups
      .filter((group) => group.GroupTypeId === CONNECT_GROUP_TYPE_ID)
      .map((group) => group.Id),
  );
  const groups = slice.groups
    .filter((group) => group.GroupTypeId === CONNECT_GROUP_TYPE_ID)
    .map((group) => ({
      rockId: group.Id,
      rockGuid: group.Guid,
      groupTypeRockId: group.GroupTypeId ?? CONNECT_GROUP_TYPE_ID,
      parentGroupRockId:
        group.ParentGroupId && connectGroupIds.has(group.ParentGroupId)
          ? group.ParentGroupId
          : null,
      campusRockId:
        group.CampusId && campusIds.has(group.CampusId) ? group.CampusId : null,
      name: group.Name ?? `Group ${group.Id}`,
      active: group.IsActive ?? true,
      archived: group.IsArchived ?? false,
      sourceUpdatedAt: toDate(group.ModifiedDateTime),
      lastSyncRunId: "pending",
    }));
  const groupIds = new Set(groups.map((group) => group.rockId));

  const groupMembers = slice.groupMembers.flatMap((member) => {
    if (!member.GroupId || !member.PersonId || !groupIds.has(member.GroupId)) {
      return [];
    }

    return [
      {
        rockId: member.Id,
        rockGuid: member.Guid,
        groupRockId: member.GroupId,
        personRockId: member.PersonId,
        groupTypeRockId: member.GroupTypeId ?? CONNECT_GROUP_TYPE_ID,
        groupRoleRockId:
          member.GroupRoleId && groupRoleIds.has(member.GroupRoleId)
            ? member.GroupRoleId
            : null,
        groupMemberStatus:
          member.GroupMemberStatus ?? GROUP_MEMBER_STATUS.INACTIVE,
        archived: member.IsArchived ?? false,
        activeConnectGroup:
          (member.GroupTypeId ?? CONNECT_GROUP_TYPE_ID) ===
            CONNECT_GROUP_TYPE_ID &&
          (member.GroupMemberStatus ?? GROUP_MEMBER_STATUS.INACTIVE) ===
            GROUP_MEMBER_STATUS.ACTIVE &&
          !(member.IsArchived ?? false),
        sourceUpdatedAt: toDate(member.ModifiedDateTime),
        lastSyncRunId: "pending",
      },
    ];
  });

  const sliceAccountIds = new Set(
    slice.financialAccounts.map((account) => account.Id),
  );
  const financialAccounts = slice.financialAccounts.map((account) => ({
    rockId: account.Id,
    rockGuid: account.Guid,
    parentAccountRockId:
      account.ParentAccountId && sliceAccountIds.has(account.ParentAccountId)
        ? account.ParentAccountId
        : null,
    campusRockId:
      account.CampusId && campusIds.has(account.CampusId)
        ? account.CampusId
        : null,
    name: account.Name ?? `Account ${account.Id}`,
    active: account.IsActive ?? true,
    public: account.IsPublic,
    taxDeductible: account.IsTaxDeductible,
    startDate: toDate(account.StartDate),
    endDate: toDate(account.EndDate),
    sourceUpdatedAt: toDate(account.ModifiedDateTime),
    lastSyncRunId: "pending",
  }));
  const accountIds = new Set(
    financialAccounts.map((account) => account.rockId),
  );

  const transactions = slice.financialTransactions.map((transaction) => ({
    rockId: transaction.Id,
    rockGuid: transaction.Guid,
    authorizedPersonAliasRockId:
      transaction.AuthorizedPersonAliasId &&
      personAliasIds.has(transaction.AuthorizedPersonAliasId)
        ? transaction.AuthorizedPersonAliasId
        : null,
    authorizedPersonRockId: people.find(
      (person) =>
        person.primaryAliasRockId === transaction.AuthorizedPersonAliasId,
    )?.rockId,
    scheduledTransactionRockId: transaction.ScheduledTransactionId,
    transactionDate: toDate(transaction.TransactionDateTime) ?? new Date(),
    transactionDateKey: transaction.TransactionDateKey,
    status: transaction.Status,
    statusMessage: transaction.StatusMessage,
    sourceTypeValueRockId:
      transaction.SourceTypeValueId &&
      definedValueIds.has(transaction.SourceTypeValueId)
        ? transaction.SourceTypeValueId
        : null,
    transactionTypeValueRockId:
      transaction.TransactionTypeValueId &&
      definedValueIds.has(transaction.TransactionTypeValueId)
        ? transaction.TransactionTypeValueId
        : null,
    reconciled: transaction.IsReconciled,
    settled: transaction.IsSettled,
    showAsAnonymous: transaction.ShowAsAnonymous,
    sourceUpdatedAt: toDate(transaction.ModifiedDateTime),
    lastSyncRunId: "pending",
  }));
  const transactionIds = new Set(
    transactions.map((transaction) => transaction.rockId),
  );

  const financialTransactionDetails = slice.financialTransactionDetails.flatMap(
    (detail) => {
      if (!detail.TransactionId || !detail.AccountId) {
        return [];
      }
      if (
        !transactionIds.has(detail.TransactionId) ||
        !accountIds.has(detail.AccountId)
      ) {
        issues.push({
          severity: "WARNING",
          source: ROCK_SYNC_SOURCE,
          recordType: "RockFinancialTransactionDetail",
          rockId: String(detail.Id),
          code: "MISSING_REFERENCE",
          message:
            "Transaction detail referenced a transaction or account outside the synced slice.",
        });
        return [];
      }

      return [
        {
          rockId: detail.Id,
          rockGuid: detail.Guid,
          transactionRockId: detail.TransactionId,
          accountRockId: detail.AccountId,
          amount: toDecimal(detail.Amount),
          feeAmount:
            detail.FeeAmount == null ? null : toDecimal(detail.FeeAmount),
          sourceUpdatedAt: toDate(detail.ModifiedDateTime),
          lastSyncRunId: "pending",
        },
      ];
    },
  );

  const scheduledTransactions = slice.financialScheduledTransactions.map(
    (transaction) => ({
      rockId: transaction.Id,
      rockGuid: transaction.Guid,
      authorizedPersonAliasRockId:
        transaction.AuthorizedPersonAliasId &&
        personAliasIds.has(transaction.AuthorizedPersonAliasId)
          ? transaction.AuthorizedPersonAliasId
          : null,
      authorizedPersonRockId: people.find(
        (person) =>
          person.primaryAliasRockId === transaction.AuthorizedPersonAliasId,
      )?.rockId,
      transactionFrequencyValueRockId:
        transaction.TransactionFrequencyValueId &&
        definedValueIds.has(transaction.TransactionFrequencyValueId)
          ? transaction.TransactionFrequencyValueId
          : null,
      startDate: toDate(transaction.StartDate),
      endDate: toDate(transaction.EndDate),
      nextPaymentDate: toDate(transaction.NextPaymentDate),
      active: transaction.IsActive ?? false,
      status: transaction.Status,
      statusMessage: transaction.StatusMessage,
      sourceUpdatedAt: toDate(transaction.ModifiedDateTime),
      lastSyncRunId: "pending",
    }),
  );
  const scheduledTransactionIds = new Set(
    scheduledTransactions.map((transaction) => transaction.rockId),
  );

  const scheduledTransactionDetails =
    slice.financialScheduledTransactionDetails.flatMap((detail) => {
      if (!detail.ScheduledTransactionId || !detail.AccountId) {
        return [];
      }
      if (
        !scheduledTransactionIds.has(detail.ScheduledTransactionId) ||
        !accountIds.has(detail.AccountId)
      ) {
        issues.push({
          severity: "WARNING",
          source: ROCK_SYNC_SOURCE,
          recordType: "RockFinancialScheduledTransactionDetail",
          rockId: String(detail.Id),
          code: "MISSING_REFERENCE",
          message:
            "Scheduled transaction detail referenced a scheduled transaction or account outside the synced slice.",
        });
        return [];
      }

      return [
        {
          rockId: detail.Id,
          rockGuid: detail.Guid,
          scheduledTransactionRockId: detail.ScheduledTransactionId,
          accountRockId: detail.AccountId,
          amount: toDecimal(detail.Amount),
          sourceUpdatedAt: toDate(detail.ModifiedDateTime),
          lastSyncRunId: "pending",
        },
      ];
    });

  const givingFacts = [
    ...financialTransactionDetails.map((detail) => {
      const transaction = transactions.find(
        (candidate) => candidate.rockId === detail.transactionRockId,
      );
      const person = people.find(
        (candidate) => candidate.rockId === transaction?.authorizedPersonRockId,
      );
      const householdRockId = person
        ? resolveGivingHouseholdRockId(person)
        : null;

      return {
        reliabilityKind: classifyGiftReliability({
          scheduledTransactionRockId: transaction?.scheduledTransactionRockId,
        }),
        transactionRockId: detail.transactionRockId,
        transactionDetailRockId: detail.rockId,
        scheduledTransactionRockId: transaction?.scheduledTransactionRockId,
        personRockId: transaction?.authorizedPersonRockId,
        householdRockId,
        accountRockId: detail.accountRockId,
        campusRockId: resolveGivingCampusRockId({
          accountRockId: detail.accountRockId,
          financialAccounts,
          householdRockId,
          households,
          person,
        }),
        amount: detail.amount,
        occurredAt: transaction?.transactionDate,
        effectiveMonth: monthStart(transaction?.transactionDate ?? new Date()),
        explanation: transaction?.scheduledTransactionRockId
          ? "Rock transaction is linked to a scheduled transaction."
          : "Rock transaction has no scheduled transaction link.",
        lastSyncRunId: "pending",
      };
    }),
    ...scheduledTransactionDetails.map((detail) => {
      const transaction = scheduledTransactions.find(
        (candidate) => candidate.rockId === detail.scheduledTransactionRockId,
      );
      const person = people.find(
        (candidate) => candidate.rockId === transaction?.authorizedPersonRockId,
      );
      const householdRockId = person
        ? resolveGivingHouseholdRockId(person)
        : null;

      return {
        reliabilityKind: "SCHEDULED_RECURRING" as const,
        scheduledTransactionRockId: detail.scheduledTransactionRockId,
        scheduledTransactionDetailRockId: detail.rockId,
        personRockId: transaction?.authorizedPersonRockId,
        householdRockId,
        accountRockId: detail.accountRockId,
        campusRockId: resolveGivingCampusRockId({
          accountRockId: detail.accountRockId,
          financialAccounts,
          householdRockId,
          households,
          person,
        }),
        amount: detail.amount,
        effectiveMonth: monthStart(transaction?.nextPaymentDate ?? new Date()),
        explanation:
          "Rock scheduled transaction detail is active recurring giving.",
        lastSyncRunId: "pending",
      };
    }),
  ];

  return {
    groupTypes,
    groupRoles,
    definedValues,
    personAliases,
    campuses,
    households,
    people,
    householdMembers,
    groups,
    groupMembers,
    financialAccounts,
    financialTransactions: transactions,
    financialTransactionDetails,
    financialScheduledTransactions: scheduledTransactions,
    financialScheduledTransactionDetails: scheduledTransactionDetails,
    givingFacts,
    issues,
  };
}

function idMap<
  T extends { fixtureId: string; sourceMetadata: { rockId: string | number } },
>(values: T[]) {
  return new Map(
    values.map((value) => [
      value.fixtureId,
      Number(value.sourceMetadata.rockId),
    ]),
  );
}

function toDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function centsToDecimal(cents: number) {
  return (cents / 100).toFixed(2);
}

function toDecimal(value: number | string | null | undefined) {
  if (value == null) {
    return "0.00";
  }

  return Number(value).toFixed(2);
}

function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function resolveGivingCampusRockId({
  accountRockId,
  financialAccounts,
  householdRockId,
  households,
  person,
}: {
  accountRockId: number | null | undefined;
  financialAccounts: Prisma.RockFinancialAccountCreateManyInput[];
  householdRockId: number | null;
  households: Prisma.RockHouseholdCreateManyInput[];
  person?: Prisma.RockPersonCreateManyInput;
}) {
  const householdCampusRockId = householdRockId
    ? households.find((household) => household.rockId === householdRockId)
        ?.campusRockId
    : null;

  if (typeof householdCampusRockId === "number") {
    return householdCampusRockId;
  }

  if (typeof person?.primaryCampusRockId === "number") {
    return person.primaryCampusRockId;
  }

  const accountCampusRockId = accountRockId
    ? financialAccounts.find((account) => account.rockId === accountRockId)
        ?.campusRockId
    : null;

  return typeof accountCampusRockId === "number" ? accountCampusRockId : null;
}

function countRecords(data: NormalizedSyncData) {
  return (
    data.groupTypes.length +
    data.groupRoles.length +
    data.definedValues.length +
    data.personAliases.length +
    data.campuses.length +
    data.households.length +
    data.people.length +
    data.householdMembers.length +
    data.groups.length +
    data.groupMembers.length +
    data.financialAccounts.length +
    data.financialTransactions.length +
    data.financialTransactionDetails.length +
    data.financialScheduledTransactions.length +
    data.financialScheduledTransactionDetails.length
  );
}

async function persistUpserts<T>(
  prisma: PrismaClient,
  stage: string,
  records: T[],
  chunkSize: number,
  progress: (stage: string, completed: number, total: number) => void,
  upsert: (tx: PrismaTransaction, record: T) => Promise<void>,
) {
  await persistChunks(prisma, stage, records, chunkSize, progress, upsert);
  return records.length;
}

async function persistUpdates<T>(
  prisma: PrismaClient,
  stage: string,
  records: T[],
  chunkSize: number,
  progress: (stage: string, completed: number, total: number) => void,
  update: (tx: PrismaTransaction, record: T) => Promise<void>,
) {
  await persistChunks(prisma, stage, records, chunkSize, progress, update);
}

async function persistChunks<T>(
  prisma: PrismaClient,
  stage: string,
  records: T[],
  chunkSize: number,
  progress: (stage: string, completed: number, total: number) => void,
  operation: (tx: PrismaTransaction, record: T) => Promise<void>,
) {
  progress(stage, 0, records.length);

  for (let index = 0; index < records.length; index += chunkSize) {
    const chunk = records.slice(index, index + chunkSize);

    await prisma.$transaction(async (tx) => {
      for (const record of chunk) {
        await operation(tx, record);
      }
    }, syncTransactionOptions);

    progress(
      stage,
      Math.min(index + chunk.length, records.length),
      records.length,
    );
  }
}

async function persistGivingFacts(
  prisma: PrismaClient,
  data: NormalizedSyncData,
  chunkSize: number,
  progress: (stage: string, completed: number, total: number) => void,
) {
  await prisma.$transaction(async (tx) => deleteExistingGivingFacts(tx, data), {
    ...syncTransactionOptions,
    timeout: 60000,
  });

  progress("givingFacts", 0, data.givingFacts.length);

  for (let index = 0; index < data.givingFacts.length; index += chunkSize) {
    const chunk = data.givingFacts.slice(index, index + chunkSize);

    await prisma.$transaction(async (tx) => {
      await tx.givingFact.createMany({ data: chunk });
    }, syncTransactionOptions);

    progress(
      "givingFacts",
      Math.min(index + chunk.length, data.givingFacts.length),
      data.givingFacts.length,
    );
  }

  return data.givingFacts.length;
}

async function persistSyncIssues(
  prisma: PrismaClient,
  data: NormalizedSyncData,
  syncRunId: string,
  chunkSize: number,
  progress: (stage: string, completed: number, total: number) => void,
) {
  const issues = data.issues.map((syncIssue) => ({
    ...syncIssue,
    redactedDetail: redactForLog(
      syncIssue.redactedDetail,
    ) as Prisma.InputJsonValue,
    syncRunId,
  }));

  progress("syncIssues", 0, issues.length);

  for (let index = 0; index < issues.length; index += chunkSize) {
    const chunk = issues.slice(index, index + chunkSize);

    await prisma.$transaction(async (tx) => {
      await tx.syncIssue.createMany({ data: chunk });
    }, syncTransactionOptions);

    progress(
      "syncIssues",
      Math.min(index + chunk.length, issues.length),
      issues.length,
    );
  }
}

async function deleteExistingGivingFacts(
  tx: PrismaTransaction,
  data: NormalizedSyncData,
) {
  const transactionRockIds = data.financialTransactions.map(
    (record) => record.rockId,
  );
  const scheduledTransactionRockIds = data.financialScheduledTransactions.map(
    (record) => record.rockId,
  );

  await tx.givingFact.deleteMany({
    where: {
      OR: [
        { transactionRockId: { in: transactionRockIds } },
        { scheduledTransactionRockId: { in: scheduledTransactionRockIds } },
      ],
    },
  });
}

const syncTransactionOptions = {
  maxWait: 10000,
  timeout: 30000,
};
