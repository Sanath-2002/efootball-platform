-- AlterEnum
ALTER TYPE "CompetitionType" ADD VALUE 'GROUP_STAGE';
ALTER TYPE "CompetitionType" ADD VALUE 'GROUP_KNOCKOUT';

-- AlterTable
ALTER TABLE "Competition" ADD COLUMN "groupCount" INTEGER;
ALTER TABLE "Competition" ADD COLUMN "advancementPerGroup" INTEGER NOT NULL DEFAULT 2;

-- CreateTable
CREATE TABLE "TournamentGroup" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "TournamentGroup_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "groupId" TEXT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TournamentGroup_competitionId_name_key" ON "TournamentGroup"("competitionId", "name");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TournamentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TournamentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentGroup" ADD CONSTRAINT "TournamentGroup_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
