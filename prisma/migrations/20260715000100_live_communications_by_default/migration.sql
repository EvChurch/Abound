DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'CommunicationAutomation'
      AND column_name = 'status'
  ) THEN
    DELETE FROM "CommunicationAutomation"
    WHERE "status" = 'DRAFT';
  END IF;
END $$;

UPDATE "CommunicationAutomation"
SET
  "activatedAt" = COALESCE("activatedAt", "createdAt"),
  "activatedByUserId" = COALESCE("activatedByUserId", "createdByUserId")
WHERE "activatedAt" IS NULL OR "activatedByUserId" IS NULL;

DROP INDEX IF EXISTS "CommunicationAutomation_status_nextNoticeAt_idx";
DROP INDEX IF EXISTS "CommunicationAutomation_status_nextSendAt_idx";

ALTER TABLE "CommunicationAutomation"
  DROP COLUMN IF EXISTS "description",
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "senderMode";

DROP TYPE IF EXISTS "CommunicationAutomationStatus";
DROP TYPE IF EXISTS "CommunicationAutomationSenderMode";

ALTER TYPE "CommunicationAutomationSuppressionMode" ADD VALUE IF NOT EXISTS 'EVERY_RUN';

CREATE INDEX IF NOT EXISTS "CommunicationAutomation_archivedAt_nextNoticeAt_idx"
  ON "CommunicationAutomation"("archivedAt", "nextNoticeAt");

CREATE INDEX IF NOT EXISTS "CommunicationAutomation_pausedAt_nextSendAt_idx"
  ON "CommunicationAutomation"("pausedAt", "nextSendAt");
