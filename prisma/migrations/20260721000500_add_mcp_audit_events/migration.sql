-- CreateEnum
CREATE TYPE "McpAuditEventStatus" AS ENUM ('SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "McpAuditEvent" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "status" "McpAuditEventStatus" NOT NULL,
    "errorCode" TEXT,
    "targetType" TEXT,
    "targetRockId" INTEGER,
    "resultCount" INTEGER,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpAuditEvent_appUserId_createdAt_idx" ON "McpAuditEvent"("appUserId", "createdAt");

-- CreateIndex
CREATE INDEX "McpAuditEvent_toolName_createdAt_idx" ON "McpAuditEvent"("toolName", "createdAt");

-- CreateIndex
CREATE INDEX "McpAuditEvent_createdAt_idx" ON "McpAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "McpAuditEvent" ADD CONSTRAINT "McpAuditEvent_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
