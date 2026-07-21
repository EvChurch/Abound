ALTER TABLE "SavedListView"
ALTER COLUMN "visibility" SET DEFAULT 'GLOBAL';

UPDATE "SavedListView"
SET "visibility" = 'GLOBAL'
WHERE "visibility" = 'PRIVATE';
