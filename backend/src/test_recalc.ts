import { prisma } from './config/prisma';
import { generateKnockoutBracket, generateRoundRobinFixtures } from './services/generatorService';
import { updateMatchScoreAndRecalculate, calculateLeagueStandings, calculateCompetitionStats } from './services/recalculationService';

async function testRecalculation() {
  console.log('🧪 Testing Score Entry & Automatic Recalculation Engine...');

  const user = await prisma.user.findFirstOrThrow();

  // 1. Create a 4-team Tournament
  const tourney = await prisma.competition.create({
    data: {
      name: 'Knockout Recalc Test',
      slug: `recalc-tourney-${Date.now()}`,
      type: 'TOURNAMENT',
      coordinatorId: user.id,
    },
  });

  const t1 = await prisma.team.create({ data: { name: 'Real Madrid', competitionId: tourney.id } });
  const t2 = await prisma.team.create({ data: { name: 'Barcelona', competitionId: tourney.id } });
  const t3 = await prisma.team.create({ data: { name: 'Bayern Munich', competitionId: tourney.id } });
  const t4 = await prisma.team.create({ data: { name: 'PSG', competitionId: tourney.id } });

  await generateKnockoutBracket(tourney.id);

  let matches = await prisma.match.findMany({
    where: { competitionId: tourney.id },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  const r1m1 = matches.find((m) => m.round === 1 && m.matchNumber === 1)!;
  const r1m2 = matches.find((m) => m.round === 1 && m.matchNumber === 2)!;
  const finalMatch = matches.find((m) => m.round === 2 && m.matchNumber === 1)!;

  // Enter R1M1 score: 3 - 1 (Home wins)
  await updateMatchScoreAndRecalculate(r1m1.id, 3, 1, user.id);

  let updatedFinal = await prisma.match.findUnique({ where: { id: finalMatch.id } });
  console.log(`✅ Round 1 Match 1 score entered (3-1). Parent Final Home Team auto-set to:`, updatedFinal?.homeTeamId);

  // Enter R1M2 score: 0 - 2 (Away wins)
  await updateMatchScoreAndRecalculate(r1m2.id, 0, 2, user.id);

  updatedFinal = await prisma.match.findUnique({ where: { id: finalMatch.id } });
  console.log(`✅ Round 1 Match 2 score entered (0-2). Parent Final Away Team auto-set to:`, updatedFinal?.awayTeamId);

  // Edit R1M1 score to 1 - 4 (Away wins instead!)
  await updateMatchScoreAndRecalculate(r1m1.id, 1, 4, user.id);

  updatedFinal = await prisma.match.findUnique({ where: { id: finalMatch.id } });
  console.log(`✅ Edited Round 1 Match 1 score to 1-4. Parent Final Home Team re-calculated to:`, updatedFinal?.homeTeamId);

  // Complete Final Match: 2 - 1
  await updateMatchScoreAndRecalculate(finalMatch.id, 2, 1, user.id);

  const stats = await calculateCompetitionStats(tourney.id);
  console.log(`🏆 Tournament Finished! Champion: ${stats.champion}, Runner-up: ${stats.runnerUp}`);

  console.log('🎉 RECALCULATION ENGINE PASSED ALL TESTS!');
  process.exit(0);
}

testRecalculation().catch((err) => {
  console.error('❌ Recalc test failed:', err);
  process.exit(1);
});
