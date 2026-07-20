DROP INDEX IF EXISTS "CommunicationAutomationRun_automationId_scheduledSendAt_key";

CREATE INDEX IF NOT EXISTS "CommunicationAutomationRun_automationId_scheduledSendAt_idx"
ON "CommunicationAutomationRun"("automationId", "scheduledSendAt");
