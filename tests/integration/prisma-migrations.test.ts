import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "prisma/migrations/20260417000000_initial_baseline/migration.sql",
  "utf8",
);

describe("synced data model migration", () => {
  it("creates source-traceable Rock and sync tables", () => {
    for (const table of [
      "SyncRun",
      "SyncIssue",
      "RockGroupType",
      "RockGroupRole",
      "RockDefinedValue",
      "RockPersonAlias",
      "RockPerson",
      "RockHousehold",
      "RockHouseholdMember",
      "RockGroup",
      "RockGroupMember",
      "RockFinancialTransaction",
      "RockFinancialTransactionDetail",
      "RockFinancialScheduledTransaction",
      "RockFinancialScheduledTransactionDetail",
      "GivingFact",
      "StaffTask",
      "CommunicationPrep",
    ]) {
      expect(migration).toContain(`CREATE TABLE "${table}"`);
    }
  });

  it("uses Rock IDs as primary keys for Rock mirror tables", () => {
    for (const table of [
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
      expect(migration).toContain(
        `CONSTRAINT "${table}_pkey" PRIMARY KEY ("rockId")`,
      );
    }
  });

  it("does not add payment instrument storage", () => {
    expect(migration).not.toMatch(/cardNumber|routingNumber|bankAccount/i);
    expect(migration).not.toMatch(
      /gatewayCustomerId|paymentMethod|paymentToken/i,
    );
    expect(migration).not.toMatch(/paymentInstrument/i);
  });
});
