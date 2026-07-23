CREATE TABLE "CommunicationAutomationCompletionReportRecipient" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationAutomationCompletionReportRecipient_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CommunicationAutomationRun"
ADD COLUMN "completionReportSentAt" TIMESTAMP(3),
ADD COLUMN "completionReportFailedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "CommunicationAutomationCompletionReportRecipient_automationId_email_key"
ON "CommunicationAutomationCompletionReportRecipient"("automationId", "email");

CREATE INDEX "CommunicationAutomationCompletionReportRecipient_email_idx"
ON "CommunicationAutomationCompletionReportRecipient"("email");

ALTER TABLE "CommunicationAutomationCompletionReportRecipient"
ADD CONSTRAINT "CommunicationAutomationCompletionReportRecipient_automationId_fkey"
FOREIGN KEY ("automationId") REFERENCES "CommunicationAutomation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
