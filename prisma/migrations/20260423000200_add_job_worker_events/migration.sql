-- CreateEnum
CREATE TYPE "JobWorkerEventLevel" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "JobWorkerEvent" (
    "id" TEXT NOT NULL,
    "level" "JobWorkerEventLevel" NOT NULL DEFAULT 'INFO',
    "queue" TEXT,
    "jobId" TEXT,
    "eventType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobWorkerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobWorkerEvent_createdAt_idx" ON "JobWorkerEvent"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "JobWorkerEvent_queue_createdAt_idx" ON "JobWorkerEvent"("queue", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "JobWorkerEvent_jobId_createdAt_idx" ON "JobWorkerEvent"("jobId", "createdAt" DESC);
