-- CreateEnum
CREATE TYPE "SavedListViewResource" AS ENUM ('PEOPLE', 'HOUSEHOLDS');

-- CreateEnum
CREATE TYPE "SavedListViewVisibility" AS ENUM ('PRIVATE', 'TEAM', 'GLOBAL');

-- CreateEnum
CREATE TYPE "SavedListViewDensity" AS ENUM ('COMFORTABLE', 'COMPACT');

-- CreateEnum
CREATE TYPE "GivingLifecycleSnapshotResource" AS ENUM ('PERSON', 'HOUSEHOLD');

-- CreateEnum
CREATE TYPE "GivingLifecycleKind" AS ENUM ('NEW', 'REACTIVATED', 'AT_RISK', 'DROPPED');

-- CreateTable
CREATE TABLE "SavedListView" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "resource" "SavedListViewResource" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "SavedListViewVisibility" NOT NULL DEFAULT 'PRIVATE',
    "filterDefinition" JSONB NOT NULL,
    "sortDefinition" JSONB NOT NULL,
    "columnDefinition" JSONB NOT NULL,
    "density" "SavedListViewDensity" NOT NULL DEFAULT 'COMFORTABLE',
    "pageSize" INTEGER NOT NULL DEFAULT 50,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedListView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GivingLifecycleSnapshot" (
    "id" TEXT NOT NULL,
    "resource" "GivingLifecycleSnapshotResource" NOT NULL,
    "personRockId" INTEGER,
    "householdRockId" INTEGER,
    "lifecycle" "GivingLifecycleKind" NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "windowEndedAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "GivingLifecycleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedListView_ownerUserId_resource_idx" ON "SavedListView"("ownerUserId", "resource");

-- CreateIndex
CREATE INDEX "SavedListView_ownerUserId_resource_isDefault_idx" ON "SavedListView"("ownerUserId", "resource", "isDefault");

-- CreateIndex
CREATE INDEX "SavedListView_visibility_resource_idx" ON "SavedListView"("visibility", "resource");

-- CreateIndex
CREATE INDEX "GivingLifecycleSnapshot_resource_lifecycle_idx" ON "GivingLifecycleSnapshot"("resource", "lifecycle");

-- CreateIndex
CREATE INDEX "GivingLifecycleSnapshot_personRockId_lifecycle_windowEndedAt_idx" ON "GivingLifecycleSnapshot"("personRockId", "lifecycle", "windowEndedAt");

-- CreateIndex
CREATE INDEX "GivingLifecycleSnapshot_householdRockId_lifecycle_windowEndedAt_idx" ON "GivingLifecycleSnapshot"("householdRockId", "lifecycle", "windowEndedAt");

-- CreateIndex
CREATE INDEX "GivingLifecycleSnapshot_lastSyncRunId_idx" ON "GivingLifecycleSnapshot"("lastSyncRunId");

-- CreateIndex
CREATE INDEX "GivingLifecycleSnapshot_resource_windowEndedAt_idx" ON "GivingLifecycleSnapshot"("resource", "windowEndedAt");

-- AddForeignKey
ALTER TABLE "SavedListView" ADD CONSTRAINT "SavedListView_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingLifecycleSnapshot" ADD CONSTRAINT "GivingLifecycleSnapshot_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingLifecycleSnapshot" ADD CONSTRAINT "GivingLifecycleSnapshot_personRockId_fkey" FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingLifecycleSnapshot" ADD CONSTRAINT "GivingLifecycleSnapshot_householdRockId_fkey" FOREIGN KEY ("householdRockId") REFERENCES "RockHousehold"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;
