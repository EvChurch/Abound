import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "prisma/migrations/20260420000000_initial_baseline/migration.sql",
  "utf8",
);
const listViewsMigration = readFileSync(
  "prisma/migrations/20260420000100_add_list_views_and_lifecycle_snapshots/migration.sql",
  "utf8",
);
const communicationPrepMigration = readFileSync(
  "prisma/migrations/20260420000200_expand_communication_prep/migration.sql",
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
      'CREATE UNIQUE INDEX "GivingPledgeRecommendationDecision_personRockId_accountRock_key"',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId")',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("accountRockId") REFERENCES "RockFinancialAccount"("rockId")',
    );
  });

  it("creates app-owned saved views and lifecycle snapshots", () => {
    expect(listViewsMigration).toContain('CREATE TABLE "SavedListView"');
    expect(listViewsMigration).toContain(
      'CREATE TABLE "GivingLifecycleSnapshot"',
    );
    expect(listViewsMigration).toContain(
      'CREATE TYPE "SavedListViewResource" AS ENUM',
    );
    expect(listViewsMigration).toContain(
      'CREATE TYPE "GivingLifecycleKind" AS ENUM',
    );
    expect(listViewsMigration).toContain(
      'CREATE INDEX "SavedListView_ownerUserId_resource_isDefault_idx"',
    );
    expect(listViewsMigration).toContain(
      'CREATE INDEX "GivingLifecycleSnapshot_personRockId_lifecycle_windowEndedAt_idx"',
    );
    expect(listViewsMigration).toContain(
      'FOREIGN KEY ("ownerUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE',
    );
    expect(listViewsMigration).toContain(
      'FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId")',
    );
    expect(listViewsMigration).toContain(
      'FOREIGN KEY ("householdRockId") REFERENCES "RockHousehold"("rockId")',
    );
  });

  it("expands communication prep into an auditable audience workflow", () => {
    expect(communicationPrepMigration).toContain(
      'ADD COLUMN     "audienceResource" "SavedListViewResource"',
    );
    expect(communicationPrepMigration).toContain(
      'ADD COLUMN     "segmentDefinition" JSONB',
    );
    expect(communicationPrepMigration).toContain(
      'ADD COLUMN     "audiencePreview" JSONB',
    );
    expect(communicationPrepMigration).toContain(
      'ADD COLUMN     "audienceSize" INTEGER',
    );
    expect(communicationPrepMigration).toContain(
      'ADD COLUMN     "readyForReviewAt" TIMESTAMP(3)',
    );
    expect(communicationPrepMigration).toContain(
      'CREATE INDEX "CommunicationPrep_savedListViewId_idx"',
    );
    expect(communicationPrepMigration).toContain(
      'FOREIGN KEY ("savedListViewId") REFERENCES "SavedListView"("id") ON DELETE SET NULL',
    );
  });
});
