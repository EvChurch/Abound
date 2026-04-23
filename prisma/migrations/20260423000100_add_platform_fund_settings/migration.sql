-- CreateEnum
CREATE TYPE "DerivedCalculationKind" AS ENUM ('FUND_SCOPED_GIVING');

-- CreateEnum
CREATE TYPE "DerivedCalculationRefreshStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "PlatformFundSetting" (
    "id" TEXT NOT NULL,
    "accountRockId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFundSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DerivedCalculationRefresh" (
    "id" TEXT NOT NULL,
    "kind" "DerivedCalculationKind" NOT NULL,
    "status" "DerivedCalculationRefreshStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DerivedCalculationRefresh_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformFundSetting_accountRockId_key" ON "PlatformFundSetting"("accountRockId");

-- CreateIndex
CREATE INDEX "PlatformFundSetting_enabled_idx" ON "PlatformFundSetting"("enabled");

-- CreateIndex
CREATE INDEX "PlatformFundSetting_updatedByUserId_idx" ON "PlatformFundSetting"("updatedByUserId");

-- CreateIndex
CREATE INDEX "DerivedCalculationRefresh_kind_status_idx" ON "DerivedCalculationRefresh"("kind", "status");

-- CreateIndex
CREATE INDEX "DerivedCalculationRefresh_requestedAt_idx" ON "DerivedCalculationRefresh"("requestedAt");

-- CreateIndex
CREATE INDEX "DerivedCalculationRefresh_requestedByUserId_idx" ON "DerivedCalculationRefresh"("requestedByUserId");

-- AddForeignKey
ALTER TABLE "PlatformFundSetting" ADD CONSTRAINT "PlatformFundSetting_accountRockId_fkey" FOREIGN KEY ("accountRockId") REFERENCES "RockFinancialAccount"("rockId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformFundSetting" ADD CONSTRAINT "PlatformFundSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DerivedCalculationRefresh" ADD CONSTRAINT "DerivedCalculationRefresh_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
