-- CreateEnum
CREATE TYPE "CommunicationAutomationSuppressionMode" AS ENUM ('NEVER_RESEND', 'COOLDOWN', 'EVERY_RUN');

-- CreateEnum
CREATE TYPE "CommunicationAutomationRunStatus" AS ENUM ('PENDING_NOTICE', 'NOTICE_SENT', 'READY_TO_SEND', 'SENDING', 'SENT', 'PARTIAL', 'FAILED', 'CANCELED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CommunicationAutomationRecipientResource" AS ENUM ('PERSON', 'HOUSEHOLD');

-- CreateEnum
CREATE TYPE "CommunicationAutomationRecipientStatus" AS ENUM ('PENDING', 'READY', 'SKIPPED', 'EXCLUDED', 'ACCEPTED', 'DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED', 'DELAYED', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "CommunicationAutomationRecipientEventType" AS ENUM ('CREATED', 'SKIPPED', 'EXCLUDED', 'SEND_REQUESTED', 'PROVIDER_ACCEPTED', 'DELIVERED', 'FAILED', 'BOUNCED', 'COMPLAINED', 'DELAYED', 'SUPPRESSED');

-- CreateTable
CREATE TABLE "CommunicationAutomation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "audienceResource" "SavedListViewResource" NOT NULL DEFAULT 'PEOPLE',
    "savedListViewId" TEXT NOT NULL,
    "segmentSummary" TEXT NOT NULL,
    "scheduleCron" TEXT NOT NULL,
    "scheduleTimezone" TEXT NOT NULL DEFAULT 'UTC',
    "preSendNoticeMinutes" INTEGER NOT NULL DEFAULT 1440,
    "nextNoticeAt" TIMESTAMP(3),
    "nextSendAt" TIMESTAMP(3),
    "suppressionMode" "CommunicationAutomationSuppressionMode" NOT NULL DEFAULT 'NEVER_RESEND',
    "cooldownDays" INTEGER,
    "templateKey" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL DEFAULT 1,
    "templateFields" JSONB NOT NULL DEFAULT '{}',
    "fromName" TEXT,
    "fromEmail" TEXT,
    "replyToEmail" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "activatedByUserId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationAutomation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationAutomationReviewer" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationAutomationReviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationAutomationRun" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "status" "CommunicationAutomationRunStatus" NOT NULL DEFAULT 'PENDING_NOTICE',
    "scheduledSendAt" TIMESTAMP(3) NOT NULL,
    "noticeDueAt" TIMESTAMP(3) NOT NULL,
    "noticeSentAt" TIMESTAMP(3),
    "sendStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "deliverableCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "excludedCount" INTEGER NOT NULL DEFAULT 0,
    "acceptedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "workerJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationAutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationAutomationRecipient" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "resource" "CommunicationAutomationRecipientResource" NOT NULL,
    "recipientKey" TEXT NOT NULL,
    "personRockId" INTEGER,
    "householdRockId" INTEGER,
    "displayNameSnapshot" TEXT NOT NULL,
    "emailSnapshot" TEXT,
    "contactState" TEXT NOT NULL,
    "status" "CommunicationAutomationRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "skipReason" TEXT,
    "exclusionReason" TEXT,
    "excludedByUserId" TEXT,
    "excludedAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationAutomationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationAutomationRecipientEvent" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "eventType" "CommunicationAutomationRecipientEventType" NOT NULL,
    "providerEventId" TEXT,
    "providerMessageId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationAutomationRecipientEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationAutomationSuppression" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "resource" "CommunicationAutomationRecipientResource" NOT NULL,
    "recipientKey" TEXT NOT NULL,
    "personRockId" INTEGER,
    "householdRockId" INTEGER,
    "providerMessageId" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "eligibleAfter" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationAutomationSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunicationAutomation_archivedAt_nextNoticeAt_idx" ON "CommunicationAutomation"("archivedAt", "nextNoticeAt");

-- CreateIndex
CREATE INDEX "CommunicationAutomation_pausedAt_nextSendAt_idx" ON "CommunicationAutomation"("pausedAt", "nextSendAt");

-- CreateIndex
CREATE INDEX "CommunicationAutomation_savedListViewId_idx" ON "CommunicationAutomation"("savedListViewId");

-- CreateIndex
CREATE INDEX "CommunicationAutomation_createdByUserId_idx" ON "CommunicationAutomation"("createdByUserId");

-- CreateIndex
CREATE INDEX "CommunicationAutomation_activatedByUserId_idx" ON "CommunicationAutomation"("activatedByUserId");

-- CreateIndex
CREATE INDEX "CommunicationAutomation_createdAt_id_idx" ON "CommunicationAutomation"("createdAt" DESC, "id");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationAutomationReviewer_automationId_reviewerUserId_key" ON "CommunicationAutomationReviewer"("automationId", "reviewerUserId");

-- CreateIndex
CREATE INDEX "CommunicationAutomationReviewer_reviewerUserId_idx" ON "CommunicationAutomationReviewer"("reviewerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationAutomationRun_automationId_scheduledSendAt_key" ON "CommunicationAutomationRun"("automationId", "scheduledSendAt");

-- CreateIndex
CREATE INDEX "CommunicationAutomationRun_automationId_status_scheduledSendAt_idx" ON "CommunicationAutomationRun"("automationId", "status", "scheduledSendAt");

-- CreateIndex
CREATE INDEX "CommunicationAutomationRun_status_scheduledSendAt_idx" ON "CommunicationAutomationRun"("status", "scheduledSendAt");

-- CreateIndex
CREATE INDEX "CommunicationAutomationRun_noticeDueAt_idx" ON "CommunicationAutomationRun"("noticeDueAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationAutomationRecipient_providerMessageId_key" ON "CommunicationAutomationRecipient"("providerMessageId");

-- CreateIndex
CREATE INDEX "CommunicationAutomationRecipient_automationId_resource_recipientKey_idx" ON "CommunicationAutomationRecipient"("automationId", "resource", "recipientKey");

-- CreateIndex
CREATE INDEX "CommunicationAutomationRecipient_runId_status_idx" ON "CommunicationAutomationRecipient"("runId", "status");

-- CreateIndex
CREATE INDEX "CommunicationAutomationRecipient_personRockId_status_idx" ON "CommunicationAutomationRecipient"("personRockId", "status");

-- CreateIndex
CREATE INDEX "CommunicationAutomationRecipient_householdRockId_status_idx" ON "CommunicationAutomationRecipient"("householdRockId", "status");

-- CreateIndex
CREATE INDEX "CommunicationAutomationRecipient_excludedByUserId_idx" ON "CommunicationAutomationRecipient"("excludedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationAutomationRecipientEvent_providerEventId_key" ON "CommunicationAutomationRecipientEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "CommunicationAutomationRecipientEvent_automationId_eventType_occurredAt_idx" ON "CommunicationAutomationRecipientEvent"("automationId", "eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "CommunicationAutomationRecipientEvent_runId_eventType_occurredAt_idx" ON "CommunicationAutomationRecipientEvent"("runId", "eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "CommunicationAutomationRecipientEvent_recipientId_occurredAt_idx" ON "CommunicationAutomationRecipientEvent"("recipientId", "occurredAt");

-- CreateIndex
CREATE INDEX "CommunicationAutomationRecipientEvent_providerMessageId_idx" ON "CommunicationAutomationRecipientEvent"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationAutomationSuppression_automationId_recipientKey_key" ON "CommunicationAutomationSuppression"("automationId", "recipientKey");

-- CreateIndex
CREATE INDEX "CommunicationAutomationSuppression_resource_recipientKey_idx" ON "CommunicationAutomationSuppression"("resource", "recipientKey");

-- CreateIndex
CREATE INDEX "CommunicationAutomationSuppression_personRockId_idx" ON "CommunicationAutomationSuppression"("personRockId");

-- CreateIndex
CREATE INDEX "CommunicationAutomationSuppression_householdRockId_idx" ON "CommunicationAutomationSuppression"("householdRockId");

-- CreateIndex
CREATE INDEX "CommunicationAutomationSuppression_eligibleAfter_idx" ON "CommunicationAutomationSuppression"("eligibleAfter");

-- CreateIndex
CREATE INDEX "CommunicationAutomationSuppression_providerMessageId_idx" ON "CommunicationAutomationSuppression"("providerMessageId");

-- AddForeignKey
ALTER TABLE "CommunicationAutomation" ADD CONSTRAINT "CommunicationAutomation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomation" ADD CONSTRAINT "CommunicationAutomation_activatedByUserId_fkey" FOREIGN KEY ("activatedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomation" ADD CONSTRAINT "CommunicationAutomation_savedListViewId_fkey" FOREIGN KEY ("savedListViewId") REFERENCES "SavedListView"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationReviewer" ADD CONSTRAINT "CommunicationAutomationReviewer_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "CommunicationAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationReviewer" ADD CONSTRAINT "CommunicationAutomationReviewer_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationRun" ADD CONSTRAINT "CommunicationAutomationRun_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "CommunicationAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationRecipient" ADD CONSTRAINT "CommunicationAutomationRecipient_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "CommunicationAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationRecipient" ADD CONSTRAINT "CommunicationAutomationRecipient_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CommunicationAutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationRecipient" ADD CONSTRAINT "CommunicationAutomationRecipient_personRockId_fkey" FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationRecipient" ADD CONSTRAINT "CommunicationAutomationRecipient_householdRockId_fkey" FOREIGN KEY ("householdRockId") REFERENCES "RockHousehold"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationRecipient" ADD CONSTRAINT "CommunicationAutomationRecipient_excludedByUserId_fkey" FOREIGN KEY ("excludedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationRecipientEvent" ADD CONSTRAINT "CommunicationAutomationRecipientEvent_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "CommunicationAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationRecipientEvent" ADD CONSTRAINT "CommunicationAutomationRecipientEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CommunicationAutomationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationRecipientEvent" ADD CONSTRAINT "CommunicationAutomationRecipientEvent_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "CommunicationAutomationRecipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationSuppression" ADD CONSTRAINT "CommunicationAutomationSuppression_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "CommunicationAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationSuppression" ADD CONSTRAINT "CommunicationAutomationSuppression_personRockId_fkey" FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAutomationSuppression" ADD CONSTRAINT "CommunicationAutomationSuppression_householdRockId_fkey" FOREIGN KEY ("householdRockId") REFERENCES "RockHousehold"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;
