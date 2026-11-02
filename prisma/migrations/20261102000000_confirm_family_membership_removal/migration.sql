-- Preserve ceased membership identities without changing Rock-owned flags.
ALTER TABLE "RockHouseholdMember"
  ADD COLUMN "sourceRemovalVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "sourceRemovalEvidence" JSONB;
ALTER TABLE "RockHouseholdMember" ADD CONSTRAINT "RockHouseholdMember_removal_evidence_check"
  CHECK (("sourceRemovalVerifiedAt" IS NULL OR "sourceRemovalEvidence" IS NOT NULL)
    AND ("sourceRemovalEvidence" IS NULL OR jsonb_typeof("sourceRemovalEvidence") = 'object'));
DROP INDEX "RockHouseholdMember_householdRockId_personRockId_key";
CREATE INDEX "RockHouseholdMember_householdRockId_personRockId_idx"
  ON "RockHouseholdMember"("householdRockId", "personRockId");
-- Only one current association; retained ceased IDs may coexist with a new ID.
CREATE UNIQUE INDEX "RockHouseholdMember_current_household_person_key"
  ON "RockHouseholdMember"("householdRockId", "personRockId")
  WHERE "sourceRemovalVerifiedAt" IS NULL;
-- Rollback must retain history/filter compatibility once duplicate historical
-- pairs exist. Do not restore the former unique index by deleting history.
