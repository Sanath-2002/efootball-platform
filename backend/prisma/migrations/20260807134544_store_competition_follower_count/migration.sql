-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "followerCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill from existing follow rows
UPDATE "Competition" c
SET "followerCount" = (
  SELECT COUNT(*)::int FROM "CompetitionFollow" cf WHERE cf."competitionId" = c.id
);
