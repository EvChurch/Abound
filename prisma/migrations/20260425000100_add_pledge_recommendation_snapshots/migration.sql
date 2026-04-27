-- CreateTable
CREATE TABLE "GivingPledgeRecommendationSnapshot" (
    "id" TEXT NOT NULL,
    "personRockId" INTEGER NOT NULL,
    "accountRockId" INTEGER NOT NULL,
    "recommendedAmount" DECIMAL(12,2) NOT NULL,
    "recommendedPeriod" "GivingPledgePeriod" NOT NULL,
    "recommendedMatchStreakCount" INTEGER NOT NULL,
    "recommendedMatchStreakStartedAt" TIMESTAMP(3),
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncRunId" TEXT NOT NULL,

    CONSTRAINT "GivingPledgeRecommendationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GivingPledgeRecommendationSnapshot_personRockId_accountRockId_key" ON "GivingPledgeRecommendationSnapshot"("personRockId", "accountRockId");

-- CreateIndex
CREATE INDEX "GivingPledgeRecommendationSnapshot_personRockId_idx" ON "GivingPledgeRecommendationSnapshot"("personRockId");

-- CreateIndex
CREATE INDEX "GivingPledgeRecommendationSnapshot_accountRockId_idx" ON "GivingPledgeRecommendationSnapshot"("accountRockId");

-- CreateIndex
CREATE INDEX "GivingPledgeRecommendationSnapshot_recommendedPeriod_idx" ON "GivingPledgeRecommendationSnapshot"("recommendedPeriod");

-- CreateIndex
CREATE INDEX "GivingPledgeRecommendationSnapshot_lastSyncRunId_idx" ON "GivingPledgeRecommendationSnapshot"("lastSyncRunId");

-- AddForeignKey
ALTER TABLE "GivingPledgeRecommendationSnapshot" ADD CONSTRAINT "GivingPledgeRecommendationSnapshot_personRockId_fkey" FOREIGN KEY ("personRockId") REFERENCES "RockPerson"("rockId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingPledgeRecommendationSnapshot" ADD CONSTRAINT "GivingPledgeRecommendationSnapshot_accountRockId_fkey" FOREIGN KEY ("accountRockId") REFERENCES "RockFinancialAccount"("rockId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GivingPledgeRecommendationSnapshot" ADD CONSTRAINT "GivingPledgeRecommendationSnapshot_lastSyncRunId_fkey" FOREIGN KEY ("lastSyncRunId") REFERENCES "SyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
