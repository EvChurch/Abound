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
const personConnectionStatusMigration = readFileSync(
  "prisma/migrations/20260422000100_add_person_connection_status/migration.sql",
  "utf8",
);
const platformFundSettingsMigration = readFileSync(
  "prisma/migrations/20260423000100_add_platform_fund_settings/migration.sql",
  "utf8",
);
const pledgeRecommendationSnapshotsMigration = readFileSync(
  "prisma/migrations/20260425000100_add_pledge_recommendation_snapshots/migration.sql",
  "utf8",
);
const communicationAutomationsMigration = readFileSync(
  "prisma/migrations/20260702000100_add_communication_automations/migration.sql",
  "utf8",
);
const savedListViewArchiveMigration = readFileSync(
  "prisma/migrations/20260714000100_add_saved_list_view_archive/migration.sql",
  "utf8",
);
const newZealandTimezoneMigration = readFileSync(
  "prisma/migrations/20260714000200_force_new_zealand_timezone/migration.sql",
  "utf8",
);
const resendEmailEventTypesMigration = readFileSync(
  "prisma/migrations/20260720000100_add_resend_email_event_types/migration.sql",
  "utf8",
);
const sharedSavedListViewsMigration = readFileSync(
  "prisma/migrations/20260721000100_share_saved_list_views/migration.sql",
  "utf8",
);
const adminUsersMigration = readFileSync(
  "prisma/migrations/20260721000200_make_app_users_admin/migration.sql",
  "utf8",
);
const removeAppUserRolesMigration = readFileSync(
  "prisma/migrations/20260721000400_remove_app_user_roles/migration.sql",
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

  it("adds a soft archive marker for saved views", () => {
    expect(savedListViewArchiveMigration).toContain(
      'ALTER TABLE "SavedListView" ADD COLUMN "archivedAt" TIMESTAMP(3)',
    );
    expect(savedListViewArchiveMigration).toContain(
      'CREATE INDEX "SavedListView_ownerUserId_resource_archivedAt_idx"',
    );
  });

  it("makes saved list views shared by default", () => {
    expect(sharedSavedListViewsMigration).toContain(
      `ALTER COLUMN "visibility" SET DEFAULT 'GLOBAL'`,
    );
    expect(sharedSavedListViewsMigration).toContain(
      `SET "visibility" = 'GLOBAL'`,
    );
  });

  it("normalizes existing local user role values before removing roles", () => {
    expect(adminUsersMigration).toContain(`UPDATE "AppUser"`);
    expect(adminUsersMigration).toContain(`SET "role" = 'ADMIN'`);
  });

  it("removes app user roles", () => {
    expect(removeAppUserRolesMigration).toContain(
      `ALTER TABLE "AppUser" DROP COLUMN "role"`,
    );
    expect(removeAppUserRolesMigration).toContain(`DROP TYPE "AppRole"`);
  });

  it("forces communication schedules into New Zealand time", () => {
    expect(newZealandTimezoneMigration).toContain(
      `ALTER TABLE "CommunicationAutomation" ALTER COLUMN "scheduleTimezone" SET DEFAULT 'Pacific/Auckland'`,
    );
    expect(newZealandTimezoneMigration).toContain(
      `UPDATE "CommunicationAutomation" SET "scheduleTimezone" = 'Pacific/Auckland'`,
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

  it("mirrors Rock person connection status as a defined value relation", () => {
    expect(personConnectionStatusMigration).toContain(
      'ADD COLUMN "connectionStatusValueRockId" INTEGER',
    );
    expect(personConnectionStatusMigration).toContain(
      'CREATE INDEX "RockPerson_connectionStatusValueRockId_idx"',
    );
    expect(personConnectionStatusMigration).toContain(
      'FOREIGN KEY ("connectionStatusValueRockId") REFERENCES "RockDefinedValue"("rockId")',
    );
  });

  it("creates app-owned platform fund settings and refresh status", () => {
    expect(platformFundSettingsMigration).toContain(
      'CREATE TABLE "PlatformFundSetting"',
    );
    expect(platformFundSettingsMigration).toContain(
      'CREATE TABLE "DerivedCalculationRefresh"',
    );
    expect(platformFundSettingsMigration).toContain(
      'CREATE UNIQUE INDEX "PlatformFundSetting_accountRockId_key"',
    );
    expect(platformFundSettingsMigration).toContain(
      'FOREIGN KEY ("accountRockId") REFERENCES "RockFinancialAccount"("rockId")',
    );
    expect(platformFundSettingsMigration).toContain(
      'CREATE TYPE "DerivedCalculationKind" AS ENUM',
    );
  });

  it("creates persisted pledge recommendation snapshots for async streak metrics", () => {
    expect(pledgeRecommendationSnapshotsMigration).toContain(
      'CREATE TABLE "GivingPledgeRecommendationSnapshot"',
    );
    expect(pledgeRecommendationSnapshotsMigration).toContain(
      'CREATE UNIQUE INDEX "GivingPledgeRecommendationSnapshot_personRockId_accountRockId_key"',
    );
    expect(pledgeRecommendationSnapshotsMigration).toContain(
      'CREATE INDEX "GivingPledgeRecommendationSnapshot_recommendedPeriod_idx"',
    );
    expect(pledgeRecommendationSnapshotsMigration).toContain(
      'FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE CASCADE',
    );
    expect(pledgeRecommendationSnapshotsMigration).toContain(
      'FOREIGN KEY ("accountRockId") REFERENCES "RockFinancialAccount"("rockId") ON DELETE CASCADE',
    );
    expect(pledgeRecommendationSnapshotsMigration).toContain(
      'FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE CASCADE',
    );
  });

  it("creates app-owned communication automation workflow tables", () => {
    for (const table of [
      "CommunicationAutomation",
      "CommunicationAutomationReviewer",
      "CommunicationAutomationRun",
      "CommunicationAutomationRecipient",
      "CommunicationAutomationRecipientEvent",
      "CommunicationAutomationSuppression",
    ]) {
      expect(communicationAutomationsMigration).toContain(
        `CREATE TABLE "${table}"`,
      );
    }

    for (const enumName of [
      "CommunicationAutomationRunStatus",
      "CommunicationAutomationRecipientStatus",
      "CommunicationAutomationSuppressionMode",
    ]) {
      expect(communicationAutomationsMigration).toContain(
        `CREATE TYPE "${enumName}" AS ENUM`,
      );
    }

    expect(communicationAutomationsMigration).toContain(
      'CREATE INDEX "CommunicationAutomation_archivedAt_nextNoticeAt_idx"',
    );
    expect(communicationAutomationsMigration).toContain(
      'CREATE INDEX "CommunicationAutomation_pausedAt_nextSendAt_idx"',
    );
    expect(communicationAutomationsMigration).toContain(
      'CREATE INDEX "CommunicationAutomationRun_automationId_status_scheduledSendAt_idx"',
    );
    expect(communicationAutomationsMigration).toContain(
      'CREATE UNIQUE INDEX "CommunicationAutomationRun_automationId_scheduledSendAt_key"',
    );
    expect(communicationAutomationsMigration).toContain(
      'CREATE UNIQUE INDEX "CommunicationAutomationRecipient_providerMessageId_key"',
    );
    expect(communicationAutomationsMigration).toContain(
      'CREATE UNIQUE INDEX "CommunicationAutomationSuppression_automationId_recipientKey_key"',
    );
    expect(communicationAutomationsMigration).toContain(
      'FOREIGN KEY ("savedListViewId") REFERENCES "SavedListView"("id") ON DELETE RESTRICT',
    );
    expect(communicationAutomationsMigration).toContain(
      'FOREIGN KEY ("reviewerUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE',
    );
    expect(communicationAutomationsMigration).toContain(
      'FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL',
    );
    expect(communicationAutomationsMigration).toContain(
      'FOREIGN KEY ("householdRockId") REFERENCES "RockHousehold"("rockId") ON DELETE SET NULL',
    );
  });

  it("adds Resend engagement event types idempotently", () => {
    for (const eventType of ["OPENED", "CLICKED", "SCHEDULED", "RECEIVED"]) {
      expect(resendEmailEventTypesMigration).toContain(
        `ADD VALUE IF NOT EXISTS '${eventType}'`,
      );
    }
  });
});
