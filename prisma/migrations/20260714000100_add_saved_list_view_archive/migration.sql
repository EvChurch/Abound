-- AlterTable
ALTER TABLE "SavedListView" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SavedListView_ownerUserId_resource_archivedAt_idx" ON "SavedListView"("ownerUserId", "resource", "archivedAt");
