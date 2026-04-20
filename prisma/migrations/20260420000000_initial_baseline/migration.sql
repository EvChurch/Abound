-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('ADMIN', 'FINANCE', 'PASTORAL_CARE');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "SyncRunStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "SyncIssueSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "SyncIssueStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "GiftReliabilityKind" AS ENUM ('ONE_OFF', 'SCHEDULED_RECURRING', 'INFERRED_RECURRING', 'PLEDGE');

-- CreateEnum
CREATE TYPE "GivingPledgeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'CANCELED');

-- CreateEnum
CREATE TYPE "GivingPledgePeriod" AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "GivingPledgeSource" AS ENUM ('STAFF_ENTERED', 'PATTERN_RECOMMENDED');

-- CreateEnum
CREATE TYPE "GivingPledgeRecommendationDecisionStatus" AS ENUM ('REJECTED');

-- CreateEnum
CREATE TYPE "StaffTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "StaffTaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CommunicationPrepStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'APPROVED', 'HANDED_OFF', 'CANCELED');

-- CreateTable
CREATE TABLE "AppUser" (
    "id" TEXT NOT NULL,
    "auth0Subject" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "role" "AppRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rockPersonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "auth0Subject" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "SyncRunStatus" NOT NULL DEFAULT 'STARTED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastSourceDate" TIMESTAMP(3),
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsWritten" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncIssue" (
    "id" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "severity" "SyncIssueSeverity" NOT NULL,
    "status" "SyncIssueStatus" NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL,
    "recordType" TEXT,
    "rockId" TEXT,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "redactedDetail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SyncIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RockGroupType" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "name" TEXT NOT NULL,
    "order" INTEGER,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockGroupType_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockGroupRole" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "groupTypeRockId" INTEGER,
    "name" TEXT NOT NULL,
    "order" INTEGER,
    "maxCount" INTEGER,
    "minCount" INTEGER,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockGroupRole_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockDefinedValue" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "definedTypeRockId" INTEGER,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN,
    "order" INTEGER,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockDefinedValue_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockPersonAlias" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "personRockId" INTEGER,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockPersonAlias_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockCampus" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "name" TEXT NOT NULL,
    "shortCode" TEXT,
    "active" BOOLEAN NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockCampus_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockPerson" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "primaryAliasRockId" INTEGER,
    "primaryAliasGuid" TEXT,
    "givingGroupRockId" INTEGER,
    "givingId" TEXT,
    "givingLeaderRockId" INTEGER,
    "primaryFamilyRockId" INTEGER,
    "primaryCampusRockId" INTEGER,
    "photoRockId" INTEGER,
    "firstName" TEXT,
    "nickName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "emailActive" BOOLEAN,
    "recordStatusValueRockId" INTEGER,
    "deceased" BOOLEAN NOT NULL DEFAULT false,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockPerson_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockHousehold" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "groupTypeRockId" INTEGER NOT NULL DEFAULT 10,
    "campusRockId" INTEGER,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockHousehold_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockHouseholdMember" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "householdRockId" INTEGER NOT NULL,
    "personRockId" INTEGER NOT NULL,
    "groupRoleRockId" INTEGER,
    "groupMemberStatus" INTEGER,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockHouseholdMember_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockGroup" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "groupTypeRockId" INTEGER NOT NULL,
    "parentGroupRockId" INTEGER,
    "campusRockId" INTEGER,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockGroup_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockGroupMember" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "groupRockId" INTEGER NOT NULL,
    "personRockId" INTEGER NOT NULL,
    "groupTypeRockId" INTEGER NOT NULL,
    "groupRoleRockId" INTEGER,
    "groupMemberStatus" INTEGER NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "activeConnectGroup" BOOLEAN NOT NULL DEFAULT false,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockGroupMember_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockFinancialAccount" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "parentAccountRockId" INTEGER,
    "campusRockId" INTEGER,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL,
    "public" BOOLEAN,
    "taxDeductible" BOOLEAN,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockFinancialAccount_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "GivingPledge" (
    "id" TEXT NOT NULL,
    "personRockId" INTEGER NOT NULL,
    "accountRockId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "period" "GivingPledgePeriod" NOT NULL,
    "status" "GivingPledgeStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "GivingPledgeSource" NOT NULL DEFAULT 'STAFF_ENTERED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GivingPledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GivingPledgeRecommendationDecision" (
    "id" TEXT NOT NULL,
    "personRockId" INTEGER NOT NULL,
    "accountRockId" INTEGER NOT NULL,
    "status" "GivingPledgeRecommendationDecisionStatus" NOT NULL DEFAULT 'REJECTED',
    "reason" TEXT,
    "basisMonthsAtDecision" INTEGER NOT NULL,
    "confidenceAtDecision" TEXT,
    "recommendedAmountAtDecision" DECIMAL(12,2) NOT NULL,
    "recommendedPeriodAtDecision" "GivingPledgePeriod" NOT NULL,
    "lastGiftAtDecision" TIMESTAMP(3),
    "lastTwelveMonthsTotalAtDecision" DECIMAL(12,2) NOT NULL,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GivingPledgeRecommendationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RockFinancialTransaction" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "authorizedPersonAliasRockId" INTEGER,
    "authorizedPersonRockId" INTEGER,
    "scheduledTransactionRockId" INTEGER,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "transactionDateKey" INTEGER,
    "status" TEXT,
    "statusMessage" TEXT,
    "sourceTypeValueRockId" INTEGER,
    "transactionTypeValueRockId" INTEGER,
    "reconciled" BOOLEAN,
    "settled" BOOLEAN,
    "showAsAnonymous" BOOLEAN,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockFinancialTransaction_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockFinancialTransactionDetail" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "transactionRockId" INTEGER NOT NULL,
    "accountRockId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "feeAmount" DECIMAL(12,2),
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockFinancialTransactionDetail_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockFinancialScheduledTransaction" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "authorizedPersonAliasRockId" INTEGER,
    "authorizedPersonRockId" INTEGER,
    "transactionFrequencyValueRockId" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "nextPaymentDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL,
    "status" TEXT,
    "statusMessage" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockFinancialScheduledTransaction_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "RockFinancialScheduledTransactionDetail" (
    "rockId" INTEGER NOT NULL,
    "rockGuid" TEXT,
    "scheduledTransactionRockId" INTEGER NOT NULL,
    "accountRockId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "RockFinancialScheduledTransactionDetail_pkey" PRIMARY KEY ("rockId")
);

-- CreateTable
CREATE TABLE "GivingFact" (
    "id" TEXT NOT NULL,
    "reliabilityKind" "GiftReliabilityKind" NOT NULL,
    "transactionRockId" INTEGER,
    "transactionDetailRockId" INTEGER,
    "scheduledTransactionRockId" INTEGER,
    "scheduledTransactionDetailRockId" INTEGER,
    "personRockId" INTEGER,
    "householdRockId" INTEGER,
    "accountRockId" INTEGER,
    "campusRockId" INTEGER,
    "amount" DECIMAL(12,2) NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "effectiveMonth" TIMESTAMP(3) NOT NULL,
    "explanation" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3),
    "firstDerivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDerivedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "GivingFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "StaffTaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "StaffTaskPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedToUserId" TEXT,
    "personRockId" INTEGER,
    "householdRockId" INTEGER,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationPrep" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "CommunicationPrepStatus" NOT NULL DEFAULT 'DRAFT',
    "segmentSummary" TEXT NOT NULL,
    "handoffTarget" TEXT,
    "createdByUserId" TEXT,
    "personRockId" INTEGER,
    "householdRockId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationPrep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_auth0Subject_key" ON "AppUser"("auth0Subject");

-- CreateIndex
CREATE INDEX "AppUser_email_idx" ON "AppUser"("email");

-- CreateIndex
CREATE INDEX "AppUser_rockPersonId_idx" ON "AppUser"("rockPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRequest_auth0Subject_key" ON "AccessRequest"("auth0Subject");

-- CreateIndex
CREATE INDEX "AccessRequest_email_idx" ON "AccessRequest"("email");

-- CreateIndex
CREATE INDEX "AccessRequest_status_idx" ON "AccessRequest"("status");

-- CreateIndex
CREATE INDEX "SyncRun_source_startedAt_idx" ON "SyncRun"("source", "startedAt");

-- CreateIndex
CREATE INDEX "SyncRun_status_idx" ON "SyncRun"("status");

-- CreateIndex
CREATE INDEX "SyncIssue_syncRunId_idx" ON "SyncIssue"("syncRunId");

-- CreateIndex
CREATE INDEX "SyncIssue_status_idx" ON "SyncIssue"("status");

-- CreateIndex
CREATE INDEX "SyncIssue_recordType_rockId_idx" ON "SyncIssue"("recordType", "rockId");

-- CreateIndex
CREATE UNIQUE INDEX "RockGroupType_rockGuid_key" ON "RockGroupType"("rockGuid");

-- CreateIndex
CREATE INDEX "RockGroupType_name_idx" ON "RockGroupType"("name");

-- CreateIndex
CREATE INDEX "RockGroupType_lastSyncRunId_idx" ON "RockGroupType"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockGroupRole_rockGuid_key" ON "RockGroupRole"("rockGuid");

-- CreateIndex
CREATE INDEX "RockGroupRole_groupTypeRockId_idx" ON "RockGroupRole"("groupTypeRockId");

-- CreateIndex
CREATE INDEX "RockGroupRole_name_idx" ON "RockGroupRole"("name");

-- CreateIndex
CREATE INDEX "RockGroupRole_lastSyncRunId_idx" ON "RockGroupRole"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockDefinedValue_rockGuid_key" ON "RockDefinedValue"("rockGuid");

-- CreateIndex
CREATE INDEX "RockDefinedValue_definedTypeRockId_idx" ON "RockDefinedValue"("definedTypeRockId");

-- CreateIndex
CREATE INDEX "RockDefinedValue_value_idx" ON "RockDefinedValue"("value");

-- CreateIndex
CREATE INDEX "RockDefinedValue_lastSyncRunId_idx" ON "RockDefinedValue"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockPersonAlias_rockGuid_key" ON "RockPersonAlias"("rockGuid");

-- CreateIndex
CREATE INDEX "RockPersonAlias_personRockId_idx" ON "RockPersonAlias"("personRockId");

-- CreateIndex
CREATE INDEX "RockPersonAlias_lastSyncRunId_idx" ON "RockPersonAlias"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockCampus_rockGuid_key" ON "RockCampus"("rockGuid");

-- CreateIndex
CREATE INDEX "RockCampus_active_idx" ON "RockCampus"("active");

-- CreateIndex
CREATE INDEX "RockCampus_lastSyncRunId_idx" ON "RockCampus"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockPerson_rockGuid_key" ON "RockPerson"("rockGuid");

-- CreateIndex
CREATE UNIQUE INDEX "RockPerson_primaryAliasRockId_key" ON "RockPerson"("primaryAliasRockId");

-- CreateIndex
CREATE INDEX "RockPerson_email_idx" ON "RockPerson"("email");

-- CreateIndex
CREATE INDEX "RockPerson_primaryAliasRockId_idx" ON "RockPerson"("primaryAliasRockId");

-- CreateIndex
CREATE INDEX "RockPerson_givingGroupRockId_idx" ON "RockPerson"("givingGroupRockId");

-- CreateIndex
CREATE INDEX "RockPerson_givingId_idx" ON "RockPerson"("givingId");

-- CreateIndex
CREATE INDEX "RockPerson_givingLeaderRockId_idx" ON "RockPerson"("givingLeaderRockId");

-- CreateIndex
CREATE INDEX "RockPerson_recordStatusValueRockId_idx" ON "RockPerson"("recordStatusValueRockId");

-- CreateIndex
CREATE INDEX "RockPerson_primaryCampusRockId_idx" ON "RockPerson"("primaryCampusRockId");

-- CreateIndex
CREATE INDEX "RockPerson_primaryFamilyRockId_idx" ON "RockPerson"("primaryFamilyRockId");

-- CreateIndex
CREATE INDEX "RockPerson_photoRockId_idx" ON "RockPerson"("photoRockId");

-- CreateIndex
CREATE INDEX "RockPerson_lastSyncRunId_idx" ON "RockPerson"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockHousehold_rockGuid_key" ON "RockHousehold"("rockGuid");

-- CreateIndex
CREATE INDEX "RockHousehold_campusRockId_idx" ON "RockHousehold"("campusRockId");

-- CreateIndex
CREATE INDEX "RockHousehold_groupTypeRockId_idx" ON "RockHousehold"("groupTypeRockId");

-- CreateIndex
CREATE INDEX "RockHousehold_active_idx" ON "RockHousehold"("active");

-- CreateIndex
CREATE INDEX "RockHousehold_lastSyncRunId_idx" ON "RockHousehold"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockHouseholdMember_rockGuid_key" ON "RockHouseholdMember"("rockGuid");

-- CreateIndex
CREATE INDEX "RockHouseholdMember_personRockId_idx" ON "RockHouseholdMember"("personRockId");

-- CreateIndex
CREATE INDEX "RockHouseholdMember_groupRoleRockId_idx" ON "RockHouseholdMember"("groupRoleRockId");

-- CreateIndex
CREATE INDEX "RockHouseholdMember_lastSyncRunId_idx" ON "RockHouseholdMember"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockHouseholdMember_householdRockId_personRockId_key" ON "RockHouseholdMember"("householdRockId", "personRockId");

-- CreateIndex
CREATE UNIQUE INDEX "RockGroup_rockGuid_key" ON "RockGroup"("rockGuid");

-- CreateIndex
CREATE INDEX "RockGroup_groupTypeRockId_idx" ON "RockGroup"("groupTypeRockId");

-- CreateIndex
CREATE INDEX "RockGroup_campusRockId_idx" ON "RockGroup"("campusRockId");

-- CreateIndex
CREATE INDEX "RockGroup_parentGroupRockId_idx" ON "RockGroup"("parentGroupRockId");

-- CreateIndex
CREATE INDEX "RockGroup_active_archived_idx" ON "RockGroup"("active", "archived");

-- CreateIndex
CREATE INDEX "RockGroup_lastSyncRunId_idx" ON "RockGroup"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockGroupMember_rockGuid_key" ON "RockGroupMember"("rockGuid");

-- CreateIndex
CREATE INDEX "RockGroupMember_personRockId_idx" ON "RockGroupMember"("personRockId");

-- CreateIndex
CREATE INDEX "RockGroupMember_groupTypeRockId_idx" ON "RockGroupMember"("groupTypeRockId");

-- CreateIndex
CREATE INDEX "RockGroupMember_groupRoleRockId_idx" ON "RockGroupMember"("groupRoleRockId");

-- CreateIndex
CREATE INDEX "RockGroupMember_activeConnectGroup_idx" ON "RockGroupMember"("activeConnectGroup");

-- CreateIndex
CREATE INDEX "RockGroupMember_lastSyncRunId_idx" ON "RockGroupMember"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockGroupMember_groupRockId_personRockId_groupRoleRockId_key" ON "RockGroupMember"("groupRockId", "personRockId", "groupRoleRockId");

-- CreateIndex
CREATE UNIQUE INDEX "RockFinancialAccount_rockGuid_key" ON "RockFinancialAccount"("rockGuid");

-- CreateIndex
CREATE INDEX "RockFinancialAccount_campusRockId_idx" ON "RockFinancialAccount"("campusRockId");

-- CreateIndex
CREATE INDEX "RockFinancialAccount_parentAccountRockId_idx" ON "RockFinancialAccount"("parentAccountRockId");

-- CreateIndex
CREATE INDEX "RockFinancialAccount_active_idx" ON "RockFinancialAccount"("active");

-- CreateIndex
CREATE INDEX "RockFinancialAccount_lastSyncRunId_idx" ON "RockFinancialAccount"("lastSyncRunId");

-- CreateIndex
CREATE INDEX "GivingPledge_personRockId_idx" ON "GivingPledge"("personRockId");

-- CreateIndex
CREATE INDEX "GivingPledge_accountRockId_idx" ON "GivingPledge"("accountRockId");

-- CreateIndex
CREATE INDEX "GivingPledge_status_idx" ON "GivingPledge"("status");

-- CreateIndex
CREATE INDEX "GivingPledge_personRockId_accountRockId_status_idx" ON "GivingPledge"("personRockId", "accountRockId", "status");

-- CreateIndex
CREATE INDEX "GivingPledge_createdByUserId_idx" ON "GivingPledge"("createdByUserId");

-- CreateIndex
CREATE INDEX "GivingPledgeRecommendationDecision_personRockId_idx" ON "GivingPledgeRecommendationDecision"("personRockId");

-- CreateIndex
CREATE INDEX "GivingPledgeRecommendationDecision_accountRockId_idx" ON "GivingPledgeRecommendationDecision"("accountRockId");

-- CreateIndex
CREATE INDEX "GivingPledgeRecommendationDecision_status_idx" ON "GivingPledgeRecommendationDecision"("status");

-- CreateIndex
CREATE INDEX "GivingPledgeRecommendationDecision_decidedByUserId_idx" ON "GivingPledgeRecommendationDecision"("decidedByUserId");

-- CreateIndex
CREATE INDEX "GivingPledgeRecommendationDecision_personRockId_accountRock_idx" ON "GivingPledgeRecommendationDecision"("personRockId", "accountRockId");

-- CreateIndex
CREATE UNIQUE INDEX "GivingPledgeRecommendationDecision_personRockId_accou_key" ON "GivingPledgeRecommendationDecision"("personRockId", "accountRockId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RockFinancialTransaction_rockGuid_key" ON "RockFinancialTransaction"("rockGuid");

-- CreateIndex
CREATE INDEX "RockFinancialTransaction_authorizedPersonAliasRockId_idx" ON "RockFinancialTransaction"("authorizedPersonAliasRockId");

-- CreateIndex
CREATE INDEX "RockFinancialTransaction_authorizedPersonRockId_idx" ON "RockFinancialTransaction"("authorizedPersonRockId");

-- CreateIndex
CREATE INDEX "RockFinancialTransaction_scheduledTransactionRockId_idx" ON "RockFinancialTransaction"("scheduledTransactionRockId");

-- CreateIndex
CREATE INDEX "RockFinancialTransaction_sourceTypeValueRockId_idx" ON "RockFinancialTransaction"("sourceTypeValueRockId");

-- CreateIndex
CREATE INDEX "RockFinancialTransaction_transactionTypeValueRockId_idx" ON "RockFinancialTransaction"("transactionTypeValueRockId");

-- CreateIndex
CREATE INDEX "RockFinancialTransaction_transactionDate_idx" ON "RockFinancialTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "RockFinancialTransaction_lastSyncRunId_idx" ON "RockFinancialTransaction"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockFinancialTransactionDetail_rockGuid_key" ON "RockFinancialTransactionDetail"("rockGuid");

-- CreateIndex
CREATE INDEX "RockFinancialTransactionDetail_transactionRockId_idx" ON "RockFinancialTransactionDetail"("transactionRockId");

-- CreateIndex
CREATE INDEX "RockFinancialTransactionDetail_accountRockId_idx" ON "RockFinancialTransactionDetail"("accountRockId");

-- CreateIndex
CREATE INDEX "RockFinancialTransactionDetail_lastSyncRunId_idx" ON "RockFinancialTransactionDetail"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockFinancialScheduledTransaction_rockGuid_key" ON "RockFinancialScheduledTransaction"("rockGuid");

-- CreateIndex
CREATE INDEX "RockFinancialScheduledTransaction_authorizedPersonAliasRock_idx" ON "RockFinancialScheduledTransaction"("authorizedPersonAliasRockId");

-- CreateIndex
CREATE INDEX "RockFinancialScheduledTransaction_authorizedPersonRockId_idx" ON "RockFinancialScheduledTransaction"("authorizedPersonRockId");

-- CreateIndex
CREATE INDEX "RockFinancialScheduledTransaction_transactionFrequencyValue_idx" ON "RockFinancialScheduledTransaction"("transactionFrequencyValueRockId");

-- CreateIndex
CREATE INDEX "RockFinancialScheduledTransaction_active_idx" ON "RockFinancialScheduledTransaction"("active");

-- CreateIndex
CREATE INDEX "RockFinancialScheduledTransaction_nextPaymentDate_idx" ON "RockFinancialScheduledTransaction"("nextPaymentDate");

-- CreateIndex
CREATE INDEX "RockFinancialScheduledTransaction_lastSyncRunId_idx" ON "RockFinancialScheduledTransaction"("lastSyncRunId");

-- CreateIndex
CREATE UNIQUE INDEX "RockFinancialScheduledTransactionDetail_rockGuid_key" ON "RockFinancialScheduledTransactionDetail"("rockGuid");

-- CreateIndex
CREATE INDEX "RockFinancialScheduledTransactionDetail_scheduledTransactio_idx" ON "RockFinancialScheduledTransactionDetail"("scheduledTransactionRockId");

-- CreateIndex
CREATE INDEX "RockFinancialScheduledTransactionDetail_accountRockId_idx" ON "RockFinancialScheduledTransactionDetail"("accountRockId");

-- CreateIndex
CREATE INDEX "RockFinancialScheduledTransactionDetail_lastSyncRunId_idx" ON "RockFinancialScheduledTransactionDetail"("lastSyncRunId");

-- CreateIndex
CREATE INDEX "GivingFact_reliabilityKind_idx" ON "GivingFact"("reliabilityKind");

-- CreateIndex
CREATE INDEX "GivingFact_personRockId_idx" ON "GivingFact"("personRockId");

-- CreateIndex
CREATE INDEX "GivingFact_householdRockId_idx" ON "GivingFact"("householdRockId");

-- CreateIndex
CREATE INDEX "GivingFact_accountRockId_idx" ON "GivingFact"("accountRockId");

-- CreateIndex
CREATE INDEX "GivingFact_campusRockId_idx" ON "GivingFact"("campusRockId");

-- CreateIndex
CREATE INDEX "GivingFact_effectiveMonth_idx" ON "GivingFact"("effectiveMonth");

-- CreateIndex
CREATE INDEX "GivingFact_lastSyncRunId_idx" ON "GivingFact"("lastSyncRunId");

-- CreateIndex
CREATE INDEX "StaffTask_status_idx" ON "StaffTask"("status");

-- CreateIndex
CREATE INDEX "StaffTask_createdAt_id_idx" ON "StaffTask"("createdAt" DESC, "id");

-- CreateIndex
CREATE INDEX "StaffTask_assignedToUserId_idx" ON "StaffTask"("assignedToUserId");

-- CreateIndex
CREATE INDEX "StaffTask_personRockId_idx" ON "StaffTask"("personRockId");

-- CreateIndex
CREATE INDEX "StaffTask_householdRockId_idx" ON "StaffTask"("householdRockId");

-- CreateIndex
CREATE INDEX "StaffTask_dueAt_idx" ON "StaffTask"("dueAt");

-- CreateIndex
CREATE INDEX "CommunicationPrep_status_idx" ON "CommunicationPrep"("status");

-- CreateIndex
CREATE INDEX "CommunicationPrep_createdByUserId_idx" ON "CommunicationPrep"("createdByUserId");

-- CreateIndex
CREATE INDEX "CommunicationPrep_personRockId_idx" ON "CommunicationPrep"("personRockId");

-- CreateIndex
CREATE INDEX "CommunicationPrep_householdRockId_idx" ON "CommunicationPrep"("householdRockId");

-- AddForeignKey
ALTER TABLE "SyncIssue" ADD CONSTRAINT "SyncIssue_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "SyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockGroupType" ADD CONSTRAINT "RockGroupType_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockGroupRole" ADD CONSTRAINT "RockGroupRole_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockGroupRole" ADD CONSTRAINT "RockGroupRole_groupTypeRockId_fkey" FOREIGN KEY ("groupTypeRockId") REFERENCES "RockGroupType"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockDefinedValue" ADD CONSTRAINT "RockDefinedValue_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockPersonAlias" ADD CONSTRAINT "RockPersonAlias_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockPersonAlias" ADD CONSTRAINT "RockPersonAlias_personRockId_fkey" FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockCampus" ADD CONSTRAINT "RockCampus_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockPerson" ADD CONSTRAINT "RockPerson_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockPerson" ADD CONSTRAINT "RockPerson_primaryAliasRockId_fkey" FOREIGN KEY ("primaryAliasRockId") REFERENCES "RockPersonAlias"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockPerson" ADD CONSTRAINT "RockPerson_primaryCampusRockId_fkey" FOREIGN KEY ("primaryCampusRockId") REFERENCES "RockCampus"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockPerson" ADD CONSTRAINT "RockPerson_primaryFamilyRockId_fkey" FOREIGN KEY ("primaryFamilyRockId") REFERENCES "RockHousehold"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockPerson" ADD CONSTRAINT "RockPerson_givingGroupRockId_fkey" FOREIGN KEY ("givingGroupRockId") REFERENCES "RockHousehold"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockPerson" ADD CONSTRAINT "RockPerson_givingLeaderRockId_fkey" FOREIGN KEY ("givingLeaderRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockPerson" ADD CONSTRAINT "RockPerson_recordStatusValueRockId_fkey" FOREIGN KEY ("recordStatusValueRockId") REFERENCES "RockDefinedValue"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockHousehold" ADD CONSTRAINT "RockHousehold_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockHousehold" ADD CONSTRAINT "RockHousehold_groupTypeRockId_fkey" FOREIGN KEY ("groupTypeRockId") REFERENCES "RockGroupType"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockHousehold" ADD CONSTRAINT "RockHousehold_campusRockId_fkey" FOREIGN KEY ("campusRockId") REFERENCES "RockCampus"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockHouseholdMember" ADD CONSTRAINT "RockHouseholdMember_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockHouseholdMember" ADD CONSTRAINT "RockHouseholdMember_householdRockId_fkey" FOREIGN KEY ("householdRockId") REFERENCES "RockHousehold"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockHouseholdMember" ADD CONSTRAINT "RockHouseholdMember_personRockId_fkey" FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockHouseholdMember" ADD CONSTRAINT "RockHouseholdMember_groupRoleRockId_fkey" FOREIGN KEY ("groupRoleRockId") REFERENCES "RockGroupRole"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockGroup" ADD CONSTRAINT "RockGroup_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockGroup" ADD CONSTRAINT "RockGroup_groupTypeRockId_fkey" FOREIGN KEY ("groupTypeRockId") REFERENCES "RockGroupType"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockGroup" ADD CONSTRAINT "RockGroup_campusRockId_fkey" FOREIGN KEY ("campusRockId") REFERENCES "RockCampus"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockGroup" ADD CONSTRAINT "RockGroup_parentGroupRockId_fkey" FOREIGN KEY ("parentGroupRockId") REFERENCES "RockGroup"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockGroupMember" ADD CONSTRAINT "RockGroupMember_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockGroupMember" ADD CONSTRAINT "RockGroupMember_groupRockId_fkey" FOREIGN KEY ("groupRockId") REFERENCES "RockGroup"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockGroupMember" ADD CONSTRAINT "RockGroupMember_personRockId_fkey" FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockGroupMember" ADD CONSTRAINT "RockGroupMember_groupTypeRockId_fkey" FOREIGN KEY ("groupTypeRockId") REFERENCES "RockGroupType"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockGroupMember" ADD CONSTRAINT "RockGroupMember_groupRoleRockId_fkey" FOREIGN KEY ("groupRoleRockId") REFERENCES "RockGroupRole"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialAccount" ADD CONSTRAINT "RockFinancialAccount_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialAccount" ADD CONSTRAINT "RockFinancialAccount_campusRockId_fkey" FOREIGN KEY ("campusRockId") REFERENCES "RockCampus"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialAccount" ADD CONSTRAINT "RockFinancialAccount_parentAccountRockId_fkey" FOREIGN KEY ("parentAccountRockId") REFERENCES "RockFinancialAccount"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingPledge" ADD CONSTRAINT "GivingPledge_personRockId_fkey" FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingPledge" ADD CONSTRAINT "GivingPledge_accountRockId_fkey" FOREIGN KEY ("accountRockId") REFERENCES "RockFinancialAccount"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingPledge" ADD CONSTRAINT "GivingPledge_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingPledgeRecommendationDecision" ADD CONSTRAINT "GivingPledgeRecommendationDecision_personRockId_fkey" FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingPledgeRecommendationDecision" ADD CONSTRAINT "GivingPledgeRecommendationDecision_accountRockId_fkey" FOREIGN KEY ("accountRockId") REFERENCES "RockFinancialAccount"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingPledgeRecommendationDecision" ADD CONSTRAINT "GivingPledgeRecommendationDecision_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialTransaction" ADD CONSTRAINT "RockFinancialTransaction_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialTransaction" ADD CONSTRAINT "RockFinancialTransaction_authorizedPersonAliasRockId_fkey" FOREIGN KEY ("authorizedPersonAliasRockId") REFERENCES "RockPersonAlias"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialTransaction" ADD CONSTRAINT "RockFinancialTransaction_authorizedPersonRockId_fkey" FOREIGN KEY ("authorizedPersonRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialTransaction" ADD CONSTRAINT "RockFinancialTransaction_scheduledTransactionRockId_fkey" FOREIGN KEY ("scheduledTransactionRockId") REFERENCES "RockFinancialScheduledTransaction"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialTransaction" ADD CONSTRAINT "RockFinancialTransaction_sourceTypeValueRockId_fkey" FOREIGN KEY ("sourceTypeValueRockId") REFERENCES "RockDefinedValue"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialTransaction" ADD CONSTRAINT "RockFinancialTransaction_transactionTypeValueRockId_fkey" FOREIGN KEY ("transactionTypeValueRockId") REFERENCES "RockDefinedValue"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialTransactionDetail" ADD CONSTRAINT "RockFinancialTransactionDetail_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialTransactionDetail" ADD CONSTRAINT "RockFinancialTransactionDetail_transactionRockId_fkey" FOREIGN KEY ("transactionRockId") REFERENCES "RockFinancialTransaction"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialTransactionDetail" ADD CONSTRAINT "RockFinancialTransactionDetail_accountRockId_fkey" FOREIGN KEY ("accountRockId") REFERENCES "RockFinancialAccount"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialScheduledTransaction" ADD CONSTRAINT "RockFinancialScheduledTransaction_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialScheduledTransaction" ADD CONSTRAINT "RockFinancialScheduledTransaction_authorizedPersonAliasRoc_fkey" FOREIGN KEY ("authorizedPersonAliasRockId") REFERENCES "RockPersonAlias"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialScheduledTransaction" ADD CONSTRAINT "RockFinancialScheduledTransaction_authorizedPersonRockId_fkey" FOREIGN KEY ("authorizedPersonRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialScheduledTransaction" ADD CONSTRAINT "RockFinancialScheduledTransaction_transactionFrequencyValu_fkey" FOREIGN KEY ("transactionFrequencyValueRockId") REFERENCES "RockDefinedValue"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialScheduledTransactionDetail" ADD CONSTRAINT "RockFinancialScheduledTransactionDetail_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialScheduledTransactionDetail" ADD CONSTRAINT "RockFinancialScheduledTransactionDetail_scheduledTransacti_fkey" FOREIGN KEY ("scheduledTransactionRockId") REFERENCES "RockFinancialScheduledTransaction"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RockFinancialScheduledTransactionDetail" ADD CONSTRAINT "RockFinancialScheduledTransactionDetail_accountRockId_fkey" FOREIGN KEY ("accountRockId") REFERENCES "RockFinancialAccount"("rockId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingFact" ADD CONSTRAINT "GivingFact_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingFact" ADD CONSTRAINT "GivingFact_transactionRockId_fkey" FOREIGN KEY ("transactionRockId") REFERENCES "RockFinancialTransaction"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingFact" ADD CONSTRAINT "GivingFact_transactionDetailRockId_fkey" FOREIGN KEY ("transactionDetailRockId") REFERENCES "RockFinancialTransactionDetail"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingFact" ADD CONSTRAINT "GivingFact_scheduledTransactionRockId_fkey" FOREIGN KEY ("scheduledTransactionRockId") REFERENCES "RockFinancialScheduledTransaction"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingFact" ADD CONSTRAINT "GivingFact_scheduledTransactionDetailRockId_fkey" FOREIGN KEY ("scheduledTransactionDetailRockId") REFERENCES "RockFinancialScheduledTransactionDetail"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingFact" ADD CONSTRAINT "GivingFact_personRockId_fkey" FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingFact" ADD CONSTRAINT "GivingFact_householdRockId_fkey" FOREIGN KEY ("householdRockId") REFERENCES "RockHousehold"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTask" ADD CONSTRAINT "StaffTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTask" ADD CONSTRAINT "StaffTask_personRockId_fkey" FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTask" ADD CONSTRAINT "StaffTask_householdRockId_fkey" FOREIGN KEY ("householdRockId") REFERENCES "RockHousehold"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationPrep" ADD CONSTRAINT "CommunicationPrep_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationPrep" ADD CONSTRAINT "CommunicationPrep_personRockId_fkey" FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationPrep" ADD CONSTRAINT "CommunicationPrep_householdRockId_fkey" FOREIGN KEY ("householdRockId") REFERENCES "RockHousehold"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;
