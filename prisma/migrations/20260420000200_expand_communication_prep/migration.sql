-- AlterTable
ALTER TABLE "CommunicationPrep"
ADD COLUMN     "audiencePreview" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "audienceResource" "SavedListViewResource" NOT NULL DEFAULT 'PEOPLE',
ADD COLUMN     "audienceSize" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "audienceTruncated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "savedListViewId" TEXT,
ADD COLUMN     "segmentDefinition" JSONB NOT NULL DEFAULT '{"type":"group","mode":"all","conditions":[]}',
ADD COLUMN     "reviewNotes" TEXT,
ADD COLUMN     "readyForReviewAt" TIMESTAMP(3),
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "handedOffAt" TIMESTAMP(3),
ADD COLUMN     "canceledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "CommunicationPrep_audienceResource_status_idx" ON "CommunicationPrep"("audienceResource", "status");

-- CreateIndex
CREATE INDEX "CommunicationPrep_savedListViewId_idx" ON "CommunicationPrep"("savedListViewId");

-- CreateIndex
CREATE INDEX "CommunicationPrep_createdAt_id_idx" ON "CommunicationPrep"("createdAt" DESC, "id");

-- AddForeignKey
ALTER TABLE "CommunicationPrep" ADD CONSTRAINT "CommunicationPrep_savedListViewId_fkey" FOREIGN KEY ("savedListViewId") REFERENCES "SavedListView"("id") ON DELETE SET NULL ON UPDATE CASCADE;
