-- AlterTable
ALTER TABLE "RockPerson" ADD COLUMN "connectionStatusValueRockId" INTEGER;

-- CreateIndex
CREATE INDEX "RockPerson_connectionStatusValueRockId_idx" ON "RockPerson"("connectionStatusValueRockId");

-- AddForeignKey
ALTER TABLE "RockPerson" ADD CONSTRAINT "RockPerson_connectionStatusValueRockId_fkey" FOREIGN KEY ("connectionStatusValueRockId") REFERENCES "RockDefinedValue"("rockId") ON DELETE SET NULL ON UPDATE CASCADE;
