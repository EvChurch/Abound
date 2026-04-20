import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "prisma/migrations/20260420000000_initial_baseline/migration.sql",
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
      "GivingPledge",
      "GivingPledgeRecommendationDecision",
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

  it("indexes staff task list ordering", () => {
    expect(migration).toContain(
      'CREATE INDEX "StaffTask_createdAt_id_idx" ON "StaffTask"("createdAt" DESC, "id")',
    );
  });

  it("creates local person-fund pledge records without payment state", () => {
    expect(migration).toContain('CREATE TABLE "GivingPledge"');
    expect(migration).toContain(
      'CREATE TABLE "GivingPledgeRecommendationDecision"',
    );
    expect(migration).toContain(
      'CREATE INDEX "GivingPledge_personRockId_accountRockId_status_idx"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "GivingPledgeRecommendationDecision_personRockId_accou_key"',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId")',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("accountRockId") REFERENCES "RockFinancialAccount"("rockId")',
    );
  });
});
