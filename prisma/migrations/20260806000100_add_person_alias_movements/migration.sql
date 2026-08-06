CREATE TABLE "RockPersonAliasMovement" (
    "id" TEXT NOT NULL,
    "aliasRockId" INTEGER NOT NULL,
    "fromPersonRockId" INTEGER,
    "toPersonRockId" INTEGER,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceUpdatedAt" TIMESTAMP(3),
    "syncRunId" TEXT NOT NULL,

    CONSTRAINT "RockPersonAliasMovement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RockPerson" ADD COLUMN "mergedIntoPersonRockId" INTEGER;
ALTER TABLE "RockPerson" ADD COLUMN "mergedAt" TIMESTAMP(3);

CREATE INDEX "RockPersonAliasMovement_aliasRockId_idx" ON "RockPersonAliasMovement"("aliasRockId");
CREATE INDEX "RockPersonAliasMovement_fromPersonRockId_idx" ON "RockPersonAliasMovement"("fromPersonRockId");
CREATE INDEX "RockPersonAliasMovement_toPersonRockId_idx" ON "RockPersonAliasMovement"("toPersonRockId");
CREATE INDEX "RockPersonAliasMovement_syncRunId_idx" ON "RockPersonAliasMovement"("syncRunId");
CREATE INDEX "RockPersonAliasMovement_detectedAt_idx" ON "RockPersonAliasMovement"("detectedAt");
CREATE INDEX "RockPerson_mergedIntoPersonRockId_idx" ON "RockPerson"("mergedIntoPersonRockId");

ALTER TABLE "RockPersonAliasMovement" ADD CONSTRAINT "RockPersonAliasMovement_aliasRockId_fkey" FOREIGN KEY ("aliasRockId") REFERENCES "RockPersonAlias"("rockId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RockPersonAliasMovement" ADD CONSTRAINT "RockPersonAliasMovement_fromPersonRockId_fkey" FOREIGN KEY ("fromPersonRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RockPersonAliasMovement" ADD CONSTRAINT "RockPersonAliasMovement_toPersonRockId_fkey" FOREIGN KEY ("toPersonRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RockPersonAliasMovement" ADD CONSTRAINT "RockPersonAliasMovement_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "SyncRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RockPerson" ADD CONSTRAINT "RockPerson_mergedIntoPersonRockId_fkey" FOREIGN KEY ("mergedIntoPersonRockId") REFERENCES "RockPerson"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;
