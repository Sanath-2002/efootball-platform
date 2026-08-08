-- CreateEnum
CREATE TYPE "AwardType" AS ENUM ('MVP', 'BEST_GOALKEEPER', 'FAIR_PLAY', 'CUSTOM');

-- CreateTable
CREATE TABLE "MatchGoal" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "gameNumber" INTEGER,
    "isOwnGoal" BOOLEAN NOT NULL DEFAULT false,
    "minute" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchAppearance" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchAppearance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionAward" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "awardType" "AwardType" NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchGoal_matchId_idx" ON "MatchGoal"("matchId");

-- CreateIndex
CREATE INDEX "MatchGoal_playerId_idx" ON "MatchGoal"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchAppearance_matchId_playerId_key" ON "MatchAppearance"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "MatchAppearance_playerId_idx" ON "MatchAppearance"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionAward_competitionId_awardType_key" ON "CompetitionAward"("competitionId", "awardType");

-- CreateIndex
CREATE INDEX "CompetitionAward_competitionId_idx" ON "CompetitionAward"("competitionId");

-- AddForeignKey
ALTER TABLE "MatchGoal" ADD CONSTRAINT "MatchGoal_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchGoal" ADD CONSTRAINT "MatchGoal_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAppearance" ADD CONSTRAINT "MatchAppearance_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchAppearance" ADD CONSTRAINT "MatchAppearance_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAward" ADD CONSTRAINT "CompetitionAward_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAward" ADD CONSTRAINT "CompetitionAward_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAward" ADD CONSTRAINT "CompetitionAward_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
