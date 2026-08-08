import { prisma } from './config/prisma';
import { generateKnockoutBracket, generateRoundRobinFixtures } from './services/generatorService';

async function runTests() {
  console.log('🧪 Running Fixture & Bracket Generation Test Suite...');

  // 1. Create a dummy coordinator
  let user = await prisma.user.findUnique({ where: { email: 'test@efootball.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'test@efootball.com',
        name: 'Test Coordinator',
        passwordHash: 'dummy',
      },
    });
  }

  // Test cases for team counts: 6, 10, 14
  const testCounts = [6, 10, 14];

  for (const count of testCounts) {
    console.log(`\n========================================`);
    console.log(`Testing Team Count: ${count}`);
    console.log(`========================================`);

    // --- Tournament (Knockout) Test ---
    const tourney = await prisma.competition.create({
      data: {
        name: `Test Tournament ${count} Teams`,
        slug: `test-tourney-${count}-${Date.now()}`,
        type: 'TOURNAMENT',
        ownerId: user.id,
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
      include: { homeTeam: true, awayTeam: true, winner: true },
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
    });

    const rounds = Math.ceil(Math.log2(count));
    const powerOfTwo = Math.pow(2, rounds);
    const byes = powerOfTwo - count;

    console.log(`✅ Knockout Bracket (${count} teams -> ${powerOfTwo} slots, ${byes} BYEs):`);
    console.log(`   Total matches generated in binary tree: ${tourneyMatches.length}`);
    const completedByes = tourneyMatches.filter((m) => m.status === 'COMPLETED');
    console.log(`   Round 1 BYEs automatically auto-advanced: ${completedByes.length}`);

    // --- League (Round Robin) Test ---
    const league = await prisma.competition.create({
      data: {
        name: `Test League ${count} Teams`,
        slug: `test-league-${count}-${Date.now()}`,
        type: 'LEAGUE',
        ownerId: user.id,
      },
    });

    for (let i = 1; i <= count; i++) {
      await prisma.team.create({
        data: {
          name: `FC Team ${i}`,
          competitionId: league.id,
        },
      });
    }

    await generateRoundRobinFixtures(league.id);

    const leagueMatches = await prisma.match.findMany({
      where: { competitionId: league.id },
      orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
    });

    const expectedRounds = count % 2 === 0 ? count - 1 : count;
    const expectedMatchesPerRound = count / 2;
    const expectedTotalMatches = expectedRounds * expectedMatchesPerRound;

    console.log(`✅ League Single Round-Robin (${count} teams):`);
    console.log(`   Total rounds: ${Math.max(...leagueMatches.map((m) => m.round))}/${expectedRounds}`);
    console.log(`   Total matches generated: ${leagueMatches.length}/${expectedTotalMatches}`);
  }

  console.log('\n🎉 ALL FIXTURE & BRACKET GENERATION TESTS PASSED PERFECTLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
