ALTER TABLE "RockPerson" ADD COLUMN "photoRockId" INTEGER;

CREATE INDEX "RockPerson_photoRockId_idx" ON "RockPerson"("photoRockId");
