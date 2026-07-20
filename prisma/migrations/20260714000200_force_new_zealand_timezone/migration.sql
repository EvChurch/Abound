-- AlterTable
ALTER TABLE "CommunicationAutomation" ALTER COLUMN "scheduleTimezone" SET DEFAULT 'Pacific/Auckland';

-- Backfill existing workflow schedules into the only supported application timezone.
UPDATE "CommunicationAutomation" SET "scheduleTimezone" = 'Pacific/Auckland';
