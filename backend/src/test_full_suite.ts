import { prisma } from './config/prisma';
import { generateKnockoutBracket, generateRoundRobinFixtures } from './services/generatorService';
import {
  updateMatchScoreAndRecalculate,
  calculateLeagueStandings,
  calculateCompetitionStats,
} from './services/recalculationService';

async function runFullTestSuite() {
  console.log('🧪 ===================================================');
  console.log('🧪 RUNNING COMPREHENSIVE EFOOTBALL PLATFORM TEST SUITE');
  console.log('🧪 ===================================================\n');

  // Create a clean test coordinator
  let user = await prisma.user.findUnique({ where: { email: 'suite_test@efootball.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'suite_test@efootball.com',
        name: 'Suite Coordinator',
        passwordHash: 'dummy_hash',
      },
    });
  }

  // ----------------------------------------------------
  // 1. KNOCKOUT BRACKET ALGORITHM TESTS (2, 3, 5, 6, 8, 10, 16 teams)
  // ----------------------------------------------------
  console.log('🏆 1. TESTING KNOCKOUT BRACKET ALGORITHM (BYE MATH & STRUCTURE)');
  const bracketCounts = [2, 3, 5, 6, 8, 10, 16];

  for (const count of bracketCounts) {
    const tourney = await prisma.competition.create({
      data: {
        name: `Suite Tourney ${count} Teams`,
        slug: `suite-tourney-${count}-${Date.now()}`,
        type: 'TOURNAMENT',
        coordinatorId: user.id,
      },
    });

    for (let i = 1; i <= count; i++) {
      await prisma.team.create({
        data: {
          name: `Team ${i}`,
          competitionId: tourney.id,
        },
      });
    }

    await generateKnockoutBracket(tourney.id);

    const tourneyMatches = await prisma.match.findMany({
      where: { competitionId: tourney.id },
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
    });

    const expectedRounds = Math.ceil(Math.log2(count));
    const expectedSlots = Math.pow(2, expectedRounds);
    const expectedByes = expectedSlots - count;
    const expectedTotalMatches = expectedSlots - 1;
    const actualRounds = Math.max(...tourneyMatches.map((m) => m.round));
    const autoAdvancedByes = tourneyMatches.filter((m) => m.status === 'COMPLETED' && m.round === 1);

    if (tourneyMatches.length !== expectedTotalMatches) {
      throw new Error(`[FAIL] ${count} Teams: Expected ${expectedTotalMatches} total matches, got ${tourneyMatches.length}`);
    }
    if (actualRounds !== expectedRounds) {
      throw new Error(`[FAIL] ${count} Teams: Expected ${expectedRounds} rounds, got ${actualRounds}`);
    }
    if (autoAdvancedByes.length !== expectedByes) {
      throw new Error(`[FAIL] ${count} Teams: Expected ${expectedByes} BYE advancements, got ${autoAdvancedByes.length}`);
    }

    console.log(`   ✅ ${count} Teams: ${expectedTotalMatches} tree slots, ${expectedRounds} rounds, ${expectedByes} BYEs auto-advanced cleanly.`);
  }

  // ----------------------------------------------------
  // 2. ROUND-ROBIN LEAGUE GENERATION TESTS (ODD AND EVEN TEAM COUNTS)
  // ----------------------------------------------------
  console.log('\n📊 2. TESTING ROUND-ROBIN LEAGUE FIXTURES (EVEN AND ODD TEAMS)');
  const leagueCounts = [2, 3, 4, 5, 6, 7, 8];

  for (const count of leagueCounts) {
    const league = await prisma.competition.create({
      data: {
        name: `Suite League ${count} Teams`,
        slug: `suite-league-${count}-${Date.now()}`,
        type: 'LEAGUE',
        coordinatorId: user.id,
      },
    });

    for (let i = 1; i <= count; i++) {
      await prisma.team.create({
        data: {
          name: `FC ${i}`,
          competitionId: league.id,
        },
      });
    }

    await generateRoundRobinFixtures(league.id);

    const leagueMatches = await prisma.match.findMany({
      where: { competitionId: league.id },
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
    });

    const totalRounds = count % 2 === 0 ? count - 1 : count;
    const matchesPerRound = count % 2 === 0 ? count / 2 : Math.floor(count / 2);
    const expectedTotalMatches = (count * (count - 1)) / 2;
    const actualRounds = Math.max(...leagueMatches.map((m) => m.round));

    if (leagueMatches.length !== expectedTotalMatches) {
      throw new Error(`[FAIL] ${count} Teams League: Expected ${expectedTotalMatches} total matches, got ${leagueMatches.length}`);
    }
    if (actualRounds !== totalRounds) {
      throw new Error(`[FAIL] ${count} Teams League: Expected ${totalRounds} rounds, got ${actualRounds}`);
    }

    console.log(`   ✅ ${count} Teams League: ${leagueMatches.length} total fixtures across ${totalRounds} rounds (${matchesPerRound} matches/round).`);
  }

  // ----------------------------------------------------
  // 3. RECALCULATION & SCORE EDITING ENGINE TESTS
  // ----------------------------------------------------
  console.log('\n🔄 3. TESTING SCORE RE-EDITING & STANDINGS/STATS RECALCULATION');

  const testLeague = await prisma.competition.create({
    data: {
      name: 'Recalc Engine League Test',
      slug: `suite-recalc-${Date.now()}`,
      type: 'LEAGUE',
      coordinatorId: user.id,
    },
  });

  const tA = await prisma.team.create({ data: { name: 'Alpha FC', competitionId: testLeague.id } });
  const tB = await prisma.team.create({ data: { name: 'Beta FC', competitionId: testLeague.id } });
  const tC = await prisma.team.create({ data: { name: 'Gamma FC', competitionId: testLeague.id } });

  await generateRoundRobinFixtures(testLeague.id);

  let matches = await prisma.match.findMany({
    where: { competitionId: testLeague.id },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  const match1 = matches[0]; // Alpha vs Beta or Beta vs Alpha

  // Step 3a: Enter initial score 3 - 0
  await updateMatchScoreAndRecalculate(match1.id, 3, 0, user.id);
  let standings = await calculateLeagueStandings(testLeague.id);
  let winnerStanding = standings.find((s) => s.teamId === match1.homeTeamId!);
  let loserStanding = standings.find((s) => s.teamId === match1.awayTeamId!);

  if (winnerStanding?.points !== 3 || winnerStanding?.goalsFor !== 3 || loserStanding?.points !== 0) {
    throw new Error('[FAIL] Initial score 3-0 standings calculation mismatch');
  }
  console.log('   ✅ Initial match score (3-0) calculated: Winner has 3 Pts, +3 GD.');

  // Step 3b: RE-EDIT already completed score from 3-0 to 0-4 (Reverse Winner!)
  await updateMatchScoreAndRecalculate(match1.id, 0, 4, user.id);
  standings = await calculateLeagueStandings(testLeague.id);
  const newHomeStanding = standings.find((s) => s.teamId === match1.homeTeamId!);
  const newAwayStanding = standings.find((s) => s.teamId === match1.awayTeamId!);

  if (newHomeStanding?.points !== 0 || newHomeStanding?.goalsFor !== 0 || newHomeStanding?.goalsAgainst !== 4 || newAwayStanding?.points !== 3) {
    throw new Error('[FAIL] Re-editing score from 3-0 to 0-4 failed to update standings correctly');
  }
  console.log('   ✅ Re-edited score (3-0 -> 0-4): Points & GD recalculated cleanly without ghost stats.');

  // Check stats recalculation
  const stats = await calculateCompetitionStats(testLeague.id);
  if (stats.completedMatches !== 1 || stats.totalGoals !== 4) {
    throw new Error('[FAIL] Stats recalculation mismatch after re-edit');
  }
  console.log('   ✅ Competition Stats recalculated cleanly: 1/3 completed matches, 4 total goals.');

  console.log('\n🎉 ===================================================');
  console.log('🎉 ALL UNIT TESTS & ALGORITHM CASES PASSED 100% CLEAN!');
  console.log('🎉 ===================================================');
  process.exit(0);
}

runFullTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
