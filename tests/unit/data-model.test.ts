import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  classifyGiftReliability,
  FAMILY_GROUP_TYPE_ID,
  GROUP_MEMBER_STATUS,
  isActiveConnectGroupMembership,
  resolveGivingHouseholdRockId,
} from "@/lib/giving/models";
import {
  assertNoForbiddenSensitiveKeys,
  assertRockSourceMetadata,
  findForbiddenSensitiveKeys,
  ROCK_READ_ENDPOINTS,
} from "@/lib/sync/models";
import { assertValidStaffTaskAnchor } from "@/lib/tasks/models";

const schema = readFileSync("prisma/schema.prisma", "utf8");

function modelBlock(modelName: string) {
  const start = schema.indexOf(`model ${modelName} {`);

  if (start === -1) {
    return null;
  }

  const rest = schema.slice(start);
  const end = rest.indexOf("\n}");

  return end === -1 ? null : rest.slice(0, end + 2);
}

describe("data model guardrails", () => {
  it("requires source metadata for Rock-owned records", () => {
    expect(() =>
      assertRockSourceMetadata({
        rockId: 1001,
        rockGuid: "00000000-0000-4000-8000-000000001001",
        lastSyncRunId: "sync_1",
        sourceUpdatedAt: "2026-04-17T00:00:00.000Z",
      }),
    ).not.toThrow();

    expect(() =>
      assertRockSourceMetadata({
        rockId: 0,
        lastSyncRunId: "sync_1",
      }),
    ).toThrow("positive integer rockId");

    expect(() =>
      assertRockSourceMetadata({
        rockId: 1001,
        lastSyncRunId: " ",
      }),
    ).toThrow("lastSyncRunId");
  });

  it("keeps sync code limited to documented Rock read endpoints", () => {
    expect(ROCK_READ_ENDPOINTS).toEqual([
      "/api/People",
      "/api/PersonAlias",
      "/api/DefinedValues",
      "/api/GroupTypes",
      "/api/GroupTypeRoles",
      "/api/Groups",
      "/api/GroupMembers",
      "/api/Campuses",
      "/api/FinancialAccounts",
      "/api/FinancialTransactions",
      "/api/FinancialTransactionDetails",
      "/api/FinancialScheduledTransactions",
      "/api/FinancialScheduledTransactionDetails",
    ]);
  });

  it("classifies one-off and recurring giving without mutating payment setup", () => {
    expect(classifyGiftReliability({})).toBe("ONE_OFF");
    expect(classifyGiftReliability({ scheduledTransactionRockId: 123 })).toBe(
      "SCHEDULED_RECURRING",
    );
    expect(classifyGiftReliability({ pledgeBacked: true })).toBe("PLEDGE");
    expect(classifyGiftReliability({ inferredRecurring: true })).toBe(
      "INFERRED_RECURRING",
    );
  });

  it("uses Connect Group active membership as the small-group reporting boundary", () => {
    expect(
      isActiveConnectGroupMembership({
        groupTypeId: 25,
        groupActive: true,
        groupArchived: false,
        memberArchived: false,
        groupMemberStatus: GROUP_MEMBER_STATUS.ACTIVE,
      }),
    ).toBe(true);

    expect(
      isActiveConnectGroupMembership({
        groupTypeId: 24,
        groupActive: true,
        groupArchived: false,
        memberArchived: false,
        groupMemberStatus: GROUP_MEMBER_STATUS.ACTIVE,
      }),
    ).toBe(false);

    expect(
      isActiveConnectGroupMembership({
        groupTypeId: 25,
        groupActive: true,
        groupArchived: false,
        memberArchived: false,
        groupMemberStatus: GROUP_MEMBER_STATUS.PENDING,
      }),
    ).toBe(false);
  });

  it("models Rock families as GroupType 10 and preserves giving group identity", () => {
    expect(FAMILY_GROUP_TYPE_ID).toBe(10);
    expect(resolveGivingHouseholdRockId({ primaryFamilyRockId: 100 })).toBe(
      100,
    );
    expect(
      resolveGivingHouseholdRockId({
        primaryFamilyRockId: 100,
        givingGroupRockId: 200,
      }),
    ).toBe(200);

    const personBlock = modelBlock("RockPerson");
    const householdBlock = modelBlock("RockHousehold");

    expect(personBlock).toContain("givingGroupRockId");
    expect(personBlock).toContain("givingId");
    expect(personBlock).toContain("givingLeaderRockId");
    expect(householdBlock).toContain("groupTypeRockId");
    expect(householdBlock).toContain("@default(10)");
    expect(householdBlock).toContain("givingId");
  });

  it("rejects payment instrument and secret-like fields from sync payloads", () => {
    expect(
      findForbiddenSensitiveKeys({
        nested: {
          gatewayCustomerId: "customer_123",
          paymentToken: "secret",
        },
      }),
    ).toEqual([
      "payload.nested.gatewayCustomerId",
      "payload.nested.paymentToken",
    ]);

    expect(() =>
      assertNoForbiddenSensitiveKeys({
        cardNumber: "4242424242424242",
      }),
    ).toThrow("forbidden sensitive fields");
  });

  it("anchors staff tasks to local workflow without claiming Rock ownership", () => {
    expect(() =>
      assertValidStaffTaskAnchor({ personRockId: 1001 }),
    ).not.toThrow();
    expect(() =>
      assertValidStaffTaskAnchor({ householdRockId: 2001 }),
    ).not.toThrow();
    expect(() => assertValidStaffTaskAnchor({})).toThrow(
      "attach to a synced person or household",
    );
  });

  it("keeps forbidden payment setup concepts out of the Prisma schema", () => {
    expect(schema).not.toMatch(/cardNumber|routingNumber|bankAccount/i);
    expect(schema).not.toMatch(/gatewayCustomerId|paymentMethod|paymentToken/i);
    expect(schema).not.toMatch(/paymentInstrument/i);
  });

  it("uses Rock IDs as primary keys for synced source tables", () => {
    for (const modelName of [
      "RockCampus",
      "RockGroupType",
      "RockGroupRole",
      "RockDefinedValue",
      "RockPersonAlias",
      "RockPerson",
      "RockHousehold",
      "RockHouseholdMember",
      "RockGroup",
      "RockGroupMember",
      "RockFinancialAccount",
      "RockFinancialTransaction",
      "RockFinancialTransactionDetail",
      "RockFinancialScheduledTransaction",
      "RockFinancialScheduledTransactionDetail",
    ]) {
      const block = modelBlock(modelName);

      expect(block, `${modelName} exists`).toBeTruthy();
      expect(block, `${modelName} has rockId primary key`).toMatch(
        /rockId\s+Int\s+@id/,
      );
      expect(
        block,
        `${modelName} does not carry a redundant local id`,
      ).not.toMatch(/\n\s+id\s+String\s+@id/);
      expect(block, `${modelName} has lastSyncRunId`).toMatch(
        /lastSyncRunId\s+String/,
      );
    }
  });
});
