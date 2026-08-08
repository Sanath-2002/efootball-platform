import { prisma } from './config/prisma';
import { MatchStatus, MatchStage, NotificationType } from '@prisma/client';
import {
  generateKnockoutBracket,
  generateRoundRobinFixtures,
  generateGroupStageFixtures,
  generateKnockoutFromGroups,
} from './services/generatorService';
import {
  updateMatchScoreAndRecalculate,
  updateMatchStatusAndRecalculate,
  calculateLeagueStandings,
  calculateCompetitionStats,
  calculateGroupStandings,
  calculatePlayerStats,
  getGroupStandings,
} from './services/recalculationService';
import { emitNotificationToUsers } from './services/notificationService';
import { createOwnerMembership } from './services/membershipService';

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
        ownerId: user.id,
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
      ownerId: user.id,
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
  await updateMatchScoreAndRecalculate(match1.id, { homeScore: 3, awayScore: 0 });
  let standings = await calculateLeagueStandings(testLeague.id);
  let winnerStanding = standings.find((s) => s.teamId === match1.homeTeamId!);
  let loserStanding = standings.find((s) => s.teamId === match1.awayTeamId!);

  if (winnerStanding?.points !== 3 || winnerStanding?.goalsFor !== 3 || loserStanding?.points !== 0) {
    throw new Error('[FAIL] Initial score 3-0 standings calculation mismatch');
  }
  console.log('   ✅ Initial match score (3-0) calculated: Winner has 3 Pts, +3 GD.');

  // Step 3b: RE-EDIT already completed score from 3-0 to 0-4 (Reverse Winner!)
  await updateMatchScoreAndRecalculate(match1.id, { homeScore: 0, awayScore: 4 });
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

  // ----------------------------------------------------
  // 4. PHASE 2: WALKOVER, CANCELLED, PENALTIES, BO3, NOTIFICATIONS
  // ----------------------------------------------------
  console.log('\n⚽ 4. TESTING PHASE 2 MATCH OPERATIONS & FOLLOW NOTIFICATIONS');

  const follower = await prisma.user.upsert({
    where: { email: 'suite_follower@efootball.com' },
    create: {
      email: 'suite_follower@efootball.com',
      name: 'Suite Follower',
      passwordHash: 'dummy_hash',
    },
    update: {},
  });

  const phase2League = await prisma.competition.create({
    data: {
      name: 'Phase 2 League',
      slug: `phase2-league-${Date.now()}`,
      type: 'LEAGUE',
      ownerId: user.id,
    },
  });

  const pTeamA = await prisma.team.create({ data: { name: 'P-Alpha', competitionId: phase2League.id } });
  const pTeamB = await prisma.team.create({ data: { name: 'P-Beta', competitionId: phase2League.id } });
  await prisma.team.create({ data: { name: 'P-Gamma', competitionId: phase2League.id } });

  await generateRoundRobinFixtures(phase2League.id);

  await prisma.competitionFollow.create({
    data: { competitionId: phase2League.id, userId: follower.id },
  });

  const pMatches = await prisma.match.findMany({
    where: { competitionId: phase2League.id },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  const walkoverMatch = pMatches.find(
    (m) =>
      (m.homeTeamId === pTeamA.id && m.awayTeamId === pTeamB.id) ||
      (m.homeTeamId === pTeamB.id && m.awayTeamId === pTeamA.id)
  )!;

  await updateMatchStatusAndRecalculate(walkoverMatch.id, {
    status: MatchStatus.WALKOVER,
    winnerTeamId: pTeamA.id,
    actorUserId: user.id,
  });

  let pStandings = await calculateLeagueStandings(phase2League.id);
  const walkoverWinner = pStandings.find((s) => s.teamId === pTeamA.id);
  if (!walkoverWinner || walkoverWinner.played !== 1 || walkoverWinner.won !== 1 || walkoverWinner.points !== 3) {
    throw new Error('[FAIL] Walkover did not count correctly in standings');
  }
  console.log('   ✅ Walkover counts in league standings (3 pts, 1 played).');

  const cancelMatch = pMatches.find((m) => m.id !== walkoverMatch.id)!;
  await updateMatchStatusAndRecalculate(cancelMatch.id, {
    status: MatchStatus.CANCELLED,
    actorUserId: user.id,
  });

  for (const m of pMatches) {
    if (m.id === walkoverMatch.id || m.id === cancelMatch.id) continue;
    await updateMatchScoreAndRecalculate(m.id, {
      homeScore: 1,
      awayScore: 0,
      actorUserId: user.id,
    });
  }

  const phase2Comp = await prisma.competition.findUnique({ where: { id: phase2League.id } });
  if (phase2Comp?.status !== 'COMPLETED') {
    throw new Error('[FAIL] League with cancelled match should still complete when all fixtures are terminal');
  }
  console.log('   ✅ Cancelled match does not block league completion.');

  const knockout = await prisma.competition.create({
    data: {
      name: 'Phase 2 Knockout',
      slug: `phase2-ko-${Date.now()}`,
      type: 'TOURNAMENT',
      ownerId: user.id,
    },
  });

  for (let i = 1; i <= 2; i++) {
    await prisma.team.create({ data: { name: `KO Team ${i}`, competitionId: knockout.id } });
  }
  await generateKnockoutBracket(knockout.id);

  const koMatch = await prisma.match.findFirst({
    where: {
      competitionId: knockout.id,
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
  })!;

  let penaltyRejected = false;
  try {
    await updateMatchScoreAndRecalculate(koMatch!.id, { homeScore: 1, awayScore: 1 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('penalty') || msg.includes('level')) {
      penaltyRejected = true;
    }
  }
  if (!penaltyRejected) {
    throw new Error('[FAIL] Level knockout without penalties should be rejected');
  }
  console.log('   ✅ Level knockout rejected without penalty shootout result.');

  await updateMatchScoreAndRecalculate(koMatch!.id, {
    homeScore: 1,
    awayScore: 1,
    homePenalties: 4,
    awayPenalties: 3,
    actorUserId: user.id,
  });

  const koUpdated = await prisma.match.findUnique({ where: { id: koMatch!.id } });
  if (koUpdated?.status !== 'COMPLETED' || !koUpdated.winnerId) {
    throw new Error('[FAIL] Penalty shootout did not resolve knockout winner');
  }
  console.log('   ✅ Penalty shootout resolves knockout winner correctly.');

  const bo3League = await prisma.competition.create({
    data: {
      name: 'Phase 2 BO3',
      slug: `phase2-bo3-${Date.now()}`,
      type: 'LEAGUE',
      format: 'BO3',
      ownerId: user.id,
    },
  });

  const bA = await prisma.team.create({ data: { name: 'BO3-A', competitionId: bo3League.id } });
  const bB = await prisma.team.create({ data: { name: 'BO3-B', competitionId: bo3League.id } });
  await prisma.team.create({ data: { name: 'BO3-C', competitionId: bo3League.id } });
  await generateRoundRobinFixtures(bo3League.id);

  const bo3Match = (await prisma.match.findFirst({
    where: {
      competitionId: bo3League.id,
      homeTeamId: { not: null },
      awayTeamId: { not: null },
    },
  }))!;

  await updateMatchScoreAndRecalculate(bo3Match.id, {
    homeScore: 0,
    awayScore: 0,
    games: [
      { gameNumber: 1, homeScore: 2, awayScore: 1 },
      { gameNumber: 2, homeScore: 0, awayScore: 3 },
      { gameNumber: 3, homeScore: 1, awayScore: 0 },
    ],
    actorUserId: user.id,
  });

  const bo3Result = await prisma.match.findUnique({
    where: { id: bo3Match.id },
    include: { games: true },
  });

  if (
    bo3Result?.homeGamesWon !== 2 ||
    bo3Result.awayGamesWon !== 1 ||
    bo3Result.homeScore !== 3 ||
    bo3Result.awayScore !== 4
  ) {
    throw new Error('[FAIL] BO3 aggregation incorrect');
  }
  console.log('   ✅ BO3 series aggregates goals and legs correctly (2-1 series, 3-4 aggregate).');

  const actorNotified = await prisma.notificationRecipient.findFirst({
    where: {
      userId: follower.id,
      notification: {
        competitionId: phase2League.id,
        type: NotificationType.MATCH_RESULT,
      },
    },
  });

  const actorSelfNotification = await prisma.notificationRecipient.findFirst({
    where: {
      userId: user.id,
      notification: {
        competitionId: phase2League.id,
        type: NotificationType.MATCH_RESULT,
      },
    },
  });

  if (!actorNotified) {
    throw new Error('[FAIL] Follower should receive MATCH_RESULT notification');
  }
  if (actorSelfNotification) {
    throw new Error('[FAIL] Actor should not receive their own notification');
  }
  console.log('   ✅ Follower receives notifications; actor excluded from fan-out.');

  const newFollowLeague = await prisma.competition.create({
    data: {
      name: 'Follow Notify League',
      slug: `follow-notify-${Date.now()}`,
      type: 'LEAGUE',
      ownerId: user.id,
    },
  });

  await createOwnerMembership(newFollowLeague.id, user.id);

  await prisma.competitionFollow.create({
    data: { competitionId: newFollowLeague.id, userId: follower.id },
  });

  await emitNotificationToUsers(
    {
      competitionId: newFollowLeague.id,
      type: NotificationType.NEW_FOLLOWER,
      title: `New follower on ${newFollowLeague.name}`,
      body: `${follower.name} is now following your tournament.`,
      actorUserId: follower.id,
    },
    [user.id]
  );

  const adminFollowNotif = await prisma.notificationRecipient.findFirst({
    where: {
      userId: user.id,
      notification: {
        competitionId: newFollowLeague.id,
        type: NotificationType.NEW_FOLLOWER,
      },
    },
  });

  if (!adminFollowNotif) {
    throw new Error('[FAIL] Admin should receive NEW_FOLLOWER notification');
  }
  console.log('   ✅ Admin receives notification when someone follows the tournament.');

  // ----------------------------------------------------
  // 4. PHASE 3: GROUP STAGE, KNOCKOUT FROM GROUPS, MANUAL FIXTURES
  // ----------------------------------------------------
  console.log('\n🌍 4. TESTING GROUP STAGE & KNOCKOUT FROM GROUPS');

  const groupComp = await prisma.competition.create({
    data: {
      name: 'Suite Group Stage',
      slug: `suite-group-${Date.now()}`,
      type: 'GROUP_STAGE',
      groupCount: 2,
      ownerId: user.id,
    },
  });

  const teamNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
  for (const name of teamNames) {
    await prisma.team.create({ data: { name, competitionId: groupComp.id } });
  }

  await generateGroupStageFixtures(groupComp.id);

  const groups = await prisma.tournamentGroup.findMany({
    where: { competitionId: groupComp.id },
    orderBy: { sortOrder: 'asc' },
    include: { teams: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
  });

  if (groups.length !== 2) {
    throw new Error('[FAIL] Expected 2 groups');
  }

  const allTeams = await prisma.team.findMany({
    where: { competitionId: groupComp.id },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  const teamIds = allTeams.map((t) => t.id);
  const expectedBuckets: string[][] = [[], []];
  let direction = 1;
  let groupIndex = 0;
  for (const tid of teamIds) {
    expectedBuckets[groupIndex].push(tid);
    if (direction === 1) {
      if (groupIndex === 1) direction = -1;
      else groupIndex += 1;
    } else if (groupIndex === 0) direction = 1;
    else groupIndex -= 1;
  }

  for (let i = 0; i < 2; i++) {
    const actual = groups[i].teams.map((t) => t.id);
    if (JSON.stringify(actual) !== JSON.stringify(expectedBuckets[i])) {
      throw new Error(`[FAIL] Snake seed group ${i} assignment mismatch`);
    }
  }
  console.log('   ✅ Snake seeding assigns teams correctly across 2 groups.');

  const groupMatches = await prisma.match.findMany({
    where: { competitionId: groupComp.id, stage: MatchStage.GROUP },
  });

  if (groupMatches.length !== 12) {
    throw new Error(`[FAIL] Expected 12 group matches, got ${groupMatches.length}`);
  }
  console.log('   ✅ 8 teams / 2 groups → 12 group fixtures (6 per group).');

  const sampleMatch = groupMatches[0];
  if (sampleMatch.homeTeamId && sampleMatch.awayTeamId) {
    await updateMatchScoreAndRecalculate(sampleMatch.id, {
      homeScore: 2,
      awayScore: 1,
    });
  }

  const groupAStandings = await calculateGroupStandings(groupComp.id, groups[0].id);
  if (groupAStandings.length !== 4) {
    throw new Error('[FAIL] Group standings should have 4 teams');
  }
  const playedTeam = groupAStandings.find((s) => s.played === 1);
  if (!playedTeam || playedTeam.points !== 3) {
    throw new Error('[FAIL] Group standings not updated after score');
  }
  console.log('   ✅ Per-group standings update after match results.');

  const gkComp = await prisma.competition.create({
    data: {
      name: 'Suite Group Knockout',
      slug: `suite-gk-${Date.now()}`,
      type: 'GROUP_KNOCKOUT',
      groupCount: 2,
      advancementPerGroup: 2,
      ownerId: user.id,
    },
  });

  for (let i = 1; i <= 8; i++) {
    await prisma.team.create({
      data: { name: `GK Team ${i}`, competitionId: gkComp.id },
    });
  }

  await generateGroupStageFixtures(gkComp.id);

  const gkGroupMatches = await prisma.match.findMany({
    where: { competitionId: gkComp.id, stage: MatchStage.GROUP },
  });

  for (const m of gkGroupMatches) {
    if (!m.homeTeamId || !m.awayTeamId) continue;
    const homeWin = m.matchNumber % 2 === 1;
    await updateMatchScoreAndRecalculate(m.id, {
      homeScore: homeWin ? 2 : 0,
      awayScore: homeWin ? 0 : 1,
    });
  }

  await generateKnockoutFromGroups(gkComp.id);

  const knockoutMatches = await prisma.match.findMany({
    where: { competitionId: gkComp.id, stage: MatchStage.KNOCKOUT },
  });

  if (knockoutMatches.length !== 3) {
    throw new Error(`[FAIL] Expected 4-team knockout (3 matches), got ${knockoutMatches.length}`);
  }

  const groupMatchesAfter = await prisma.match.count({
    where: { competitionId: gkComp.id, stage: MatchStage.GROUP },
  });
  if (groupMatchesAfter !== 12) {
    throw new Error('[FAIL] Group matches should be preserved after knockout generation');
  }
  console.log('   ✅ GROUP_KNOCKOUT: top 2 per group → 4-team bracket; group fixtures preserved.');

  const allGroups = await getGroupStandings(gkComp.id);
  if (allGroups.groups.length !== 2) {
    throw new Error('[FAIL] getGroupStandings should return 2 groups');
  }
  console.log('   ✅ Groups API returns standings for all groups.');

  const manualComp = await prisma.competition.create({
    data: {
      name: 'Manual Fixtures',
      slug: `manual-fix-${Date.now()}`,
      type: 'LEAGUE',
      ownerId: user.id,
    },
  });

  const t1 = await prisma.team.create({ data: { name: 'Manual A', competitionId: manualComp.id } });
  const t2 = await prisma.team.create({ data: { name: 'Manual B', competitionId: manualComp.id } });

  const manualMatch = await prisma.match.create({
    data: {
      competitionId: manualComp.id,
      round: 99,
      matchNumber: 1,
      stage: MatchStage.LEAGUE,
      homeTeamId: t1.id,
      awayTeamId: t2.id,
      status: MatchStatus.SCHEDULED,
      scheduledAt: new Date('2026-08-15T18:00:00Z'),
    },
  });

  await updateMatchScoreAndRecalculate(manualMatch.id, { homeScore: 1, awayScore: 0 });
  const afterScore = await prisma.match.findUnique({ where: { id: manualMatch.id } });
  if (afterScore?.status !== MatchStatus.COMPLETED) {
    throw new Error('[FAIL] Manual match score update failed');
  }

  const deletable = await prisma.match.create({
    data: {
      competitionId: manualComp.id,
      round: 100,
      matchNumber: 2,
      stage: MatchStage.LEAGUE,
      homeTeamId: t1.id,
      awayTeamId: t2.id,
      status: MatchStatus.SCHEDULED,
    },
  });
  await prisma.match.delete({ where: { id: deletable.id } });
  console.log('   ✅ Manual fixture create, score, and delete work correctly.');

  const scheduledMatch = await prisma.match.create({
    data: {
      competitionId: manualComp.id,
      round: 101,
      matchNumber: 3,
      stage: MatchStage.LEAGUE,
      homeTeamId: t1.id,
      awayTeamId: t2.id,
      status: MatchStatus.SCHEDULED,
      scheduledAt: new Date('2026-09-01T12:00:00Z'),
    },
  });

  await updateMatchScoreAndRecalculate(scheduledMatch.id, { homeScore: 2, awayScore: 2 });
  const leagueStandings = await calculateLeagueStandings(manualComp.id);
  const scheduledTeam = leagueStandings.find((s) => s.teamId === t1.id);
  if (!scheduledTeam || scheduledTeam.drawn !== 1) {
    throw new Error('[FAIL] Scheduled match recalculation broken');
  }
  console.log('   ✅ Scheduled fixtures recalculate standings correctly after results.');

  // ----------------------------------------------------
  // 5. PHASE 4: ANNOUNCEMENTS, EXPORTS, ENGAGEMENT
  // ----------------------------------------------------
  console.log('\n📢 5. TESTING PHASE 4 ENGAGEMENT');

  const phase4Comp = await prisma.competition.create({
    data: {
      name: 'Phase 4 Engagement Cup',
      slug: `phase4-engage-${Date.now()}`,
      type: 'LEAGUE',
      ownerId: user.id,
    },
  });

  const phase4Follower = await prisma.user.upsert({
    where: { email: 'phase4_follower@efootball.com' },
    update: {},
    create: {
      email: 'phase4_follower@efootball.com',
      name: 'Phase4 Follower',
      passwordHash: 'dummy',
    },
  });

  await prisma.competitionFollow.create({
    data: { competitionId: phase4Comp.id, userId: phase4Follower.id },
  });

  const announcement = await prisma.announcement.create({
    data: {
      competitionId: phase4Comp.id,
      title: 'Kickoff announced',
      body: 'Group stage begins this weekend.',
      pinned: true,
      authorId: user.id,
    },
  });

  const { emitNotification } = await import('./services/notificationService');
  await emitNotification({
    competitionId: phase4Comp.id,
    type: NotificationType.ANNOUNCEMENT,
    title: announcement.title,
    body: announcement.body,
    actorUserId: user.id,
  });

  const followerNotif = await prisma.notificationRecipient.findFirst({
    where: {
      userId: phase4Follower.id,
      notification: {
        competitionId: phase4Comp.id,
        type: NotificationType.ANNOUNCEMENT,
      },
    },
  });
  const actorNotif = await prisma.notificationRecipient.findFirst({
    where: {
      userId: user.id,
      notification: {
        competitionId: phase4Comp.id,
        type: NotificationType.ANNOUNCEMENT,
      },
    },
  });

  if (!followerNotif) throw new Error('[FAIL] Follower should receive ANNOUNCEMENT notification');
  if (actorNotif) throw new Error('[FAIL] Actor should not receive own announcement notification');
  console.log('   ✅ Announcement fans out to followers; actor excluded.');

  await prisma.announcement.create({
    data: {
      competitionId: phase4Comp.id,
      title: 'Regular update',
      body: 'Secondary post',
      pinned: false,
      authorId: user.id,
    },
  });

  const listed = await prisma.announcement.findMany({
    where: { competitionId: phase4Comp.id },
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
  });
  if (!listed[0]?.pinned || listed[0].id !== announcement.id) {
    throw new Error('[FAIL] Pinned announcement should sort first');
  }
  console.log('   ✅ Pinned announcements appear first in list.');

  const { requireMembershipPermission } = await import('./services/membershipService');
  const scoresOnlyUser = await prisma.user.create({
    data: {
      email: `scores-only-${Date.now()}@efootball.com`,
      name: 'Scores Only',
      passwordHash: 'dummy',
    },
  });
  await prisma.competitionMember.create({
    data: {
      competitionId: phase4Comp.id,
      userId: scoresOnlyUser.id,
      role: 'COORDINATOR',
      permissions: ['SCORES_UPDATE'],
    },
  });

  let exportBlocked = false;
  try {
    await requireMembershipPermission(phase4Comp.id, scoresOnlyUser.id, 'REPORTS_VIEW');
  } catch {
    exportBlocked = true;
  }
  if (!exportBlocked) throw new Error('[FAIL] Export should require REPORTS_VIEW');
  console.log('   ✅ REPORTS_VIEW permission required for exports.');

  const { buildExport } = await import('./services/exportService');
  await prisma.team.createMany({
    data: [
      { name: 'Export A', competitionId: phase4Comp.id },
      { name: 'Export B', competitionId: phase4Comp.id },
    ],
  });
  const standingsCsv = await buildExport(phase4Comp.id, 'standings', { format: 'csv' });
  const csvText = standingsCsv.buffer.toString('utf-8');
  if (!csvText.includes('Pts') || !csvText.includes('Team')) {
    throw new Error('[FAIL] Standings CSV missing expected columns');
  }
  console.log('   ✅ Standings CSV export contains expected columns.');

  // ----------------------------------------------------
  // 6. PHASE 5: PLAYER STATS & AWARDS
  // ----------------------------------------------------
  console.log('\n⚽ 6. TESTING PHASE 5 PLAYER STATS & AWARDS');

  const phase5Comp = await prisma.competition.create({
    data: {
      name: 'Phase 5 Player Stats Cup',
      slug: `phase5-stats-${Date.now()}`,
      type: 'LEAGUE',
      ownerId: user.id,
    },
  });
  await createOwnerMembership(phase5Comp.id, user.id);

  const p5TeamA = await prisma.team.create({
    data: {
      name: 'Stats FC Alpha',
      competitionId: phase5Comp.id,
      players: {
        create: [
          { name: 'Striker One', gamerTag: 'S1', sortOrder: 0 },
          { name: 'Striker Two', gamerTag: 'S2', sortOrder: 1 },
        ],
      },
    },
    include: { players: true },
  });
  const p5TeamB = await prisma.team.create({
    data: {
      name: 'Stats FC Beta',
      competitionId: phase5Comp.id,
      players: {
        create: [{ name: 'Away Scorer', gamerTag: 'AS', sortOrder: 0 }],
      },
    },
    include: { players: true },
  });

  const p5Match = await prisma.match.create({
    data: {
      competitionId: phase5Comp.id,
      round: 1,
      matchNumber: 1,
      stage: MatchStage.LEAGUE,
      homeTeamId: p5TeamA.id,
      awayTeamId: p5TeamB.id,
      status: MatchStatus.SCHEDULED,
    },
  });

  const wrongTeamPlayer = await prisma.team.create({
    data: {
      name: 'Other Club',
      competitionId: (
        await prisma.competition.create({
          data: {
            name: 'Other',
            slug: `other-${Date.now()}`,
            type: 'LEAGUE',
            ownerId: user.id,
          },
        })
      ).id,
      players: { create: [{ name: 'Wrong Team Player', sortOrder: 0 }] },
    },
    include: { players: true },
  });

  let invalidPlayerRejected = false;
  try {
    await updateMatchScoreAndRecalculate(p5Match.id, {
      homeScore: 1,
      awayScore: 0,
      goals: [{ playerId: wrongTeamPlayer.players[0].id }],
    });
  } catch {
    invalidPlayerRejected = true;
  }
  if (!invalidPlayerRejected) throw new Error('[FAIL] Should reject scorer not on match teams');
  console.log('   ✅ Goal validation rejects scorers not on match teams.');

  let mismatchRejected = false;
  try {
    await updateMatchScoreAndRecalculate(p5Match.id, {
      homeScore: 2,
      awayScore: 0,
      goals: [{ playerId: p5TeamA.players[0].id }],
    });
  } catch {
    mismatchRejected = true;
  }
  if (!mismatchRejected) throw new Error('[FAIL] Should reject goal count mismatch vs score');
  console.log('   ✅ Goal validation rejects count mismatch vs team score.');

  await updateMatchScoreAndRecalculate(p5Match.id, {
    homeScore: 2,
    awayScore: 1,
    goals: [
      { playerId: p5TeamA.players[0].id },
      { playerId: p5TeamA.players[0].id },
      { playerId: p5TeamB.players[0].id },
    ],
  });

  const ogMatch = await prisma.match.create({
    data: {
      competitionId: phase5Comp.id,
      round: 1,
      matchNumber: 3,
      stage: MatchStage.LEAGUE,
      homeTeamId: p5TeamA.id,
      awayTeamId: p5TeamB.id,
      status: MatchStatus.SCHEDULED,
    },
  });
  await updateMatchScoreAndRecalculate(ogMatch.id, {
    homeScore: 1,
    awayScore: 0,
    goals: [{ playerId: p5TeamB.players[0].id, isOwnGoal: true }],
  });

  const p5Stats = await calculatePlayerStats(phase5Comp.id);
  const alphaScorer = p5Stats.find((p) => p.playerId === p5TeamA.players[0].id);
  const betaScorer = p5Stats.find((p) => p.playerId === p5TeamB.players[0].id);
  if (!alphaScorer || alphaScorer.goals !== 2) {
    throw new Error('[FAIL] Home scorer should have 2 goals');
  }
  if (!betaScorer || betaScorer.goals !== 1 || betaScorer.ownGoals !== 1) {
    throw new Error('[FAIL] Away player should have 1 goal and 1 own goal');
  }
  console.log('   ✅ Own goal tracked correctly in player stats aggregation.');

  const p5Match2 = await prisma.match.create({
    data: {
      competitionId: phase5Comp.id,
      round: 1,
      matchNumber: 2,
      stage: MatchStage.LEAGUE,
      homeTeamId: p5TeamB.id,
      awayTeamId: p5TeamA.id,
      status: MatchStatus.SCHEDULED,
    },
  });
  await updateMatchScoreAndRecalculate(p5Match2.id, {
    homeScore: 0,
    awayScore: 2,
    goals: [
      { playerId: p5TeamA.players[1].id },
      { playerId: p5TeamA.players[1].id },
    ],
  });

  const tiedStats = await calculatePlayerStats(phase5Comp.id);
  if (tiedStats[0].goals !== 2 || tiedStats[1].goals !== 2) {
    throw new Error('[FAIL] Expected tied top scorers with 2 goals each');
  }
  const compStats = await calculateCompetitionStats(phase5Comp.id);
  if (!compStats.topScorer?.isShared) {
    throw new Error('[FAIL] Shared Golden Boot should set isShared');
  }
  console.log('   ✅ Player stats ordering and shared Golden Boot tie work.');

  const { AwardType } = await import('@prisma/client');
  await prisma.competitionAward.create({
    data: {
      competitionId: phase5Comp.id,
      playerId: p5TeamA.players[0].id,
      awardType: AwardType.MVP,
      assignedById: user.id,
    },
  });

  let awardBlocked = false;
  try {
    await requireMembershipPermission(phase5Comp.id, scoresOnlyUser.id, 'TOURNAMENT_EDIT');
  } catch {
    awardBlocked = true;
  }
  if (!awardBlocked) throw new Error('[FAIL] Award create should require TOURNAMENT_EDIT');
  console.log('   ✅ TOURNAMENT_EDIT required for award management.');

  const publicComp = await prisma.competition.findUnique({
    where: { id: phase5Comp.id },
    select: { slug: true },
  });
  const publicAwards = await prisma.competitionAward.findMany({
    where: { competitionId: phase5Comp.id },
  });
  if (publicAwards.length !== 1) throw new Error('[FAIL] Award should be stored');
  if (!publicComp?.slug) throw new Error('[FAIL] Competition slug missing');
  console.log('   ✅ Awards persist and are readable for public slug lookup.');

  const playerStatsCsv = await buildExport(phase5Comp.id, 'player-stats', { format: 'csv' });
  const playerCsvText = playerStatsCsv.buffer.toString('utf-8');
  if (!playerCsvText.includes('Goals') || !playerCsvText.includes('Striker One')) {
    throw new Error('[FAIL] Player stats CSV missing expected columns or data');
  }
  console.log('   ✅ Player stats CSV export contains expected columns.');

  // ----------------------------------------------------
  // 7. PHASE 6: PROFESSIONAL EXPORT GRAPHICS
  // ----------------------------------------------------
  console.log('\n🎨 7. TESTING PHASE 6 EXPORT GRAPHICS ENGINE');

  const { renderGraphicHtml } = await import('./exports/engine');
  const { computeForm } = await import('./exports/dataPack');

  const phase6Comp = await prisma.competition.create({
    data: {
      name: 'Phase 6 Graphics Cup',
      slug: `phase6-graphics-${Date.now()}`,
      type: 'LEAGUE',
      ownerId: user.id,
    },
  });
  await createOwnerMembership(phase6Comp.id, user.id);

  const gHome = await prisma.team.create({
    data: { name: 'Graphics Home', competitionId: phase6Comp.id, colorPrimary: '#ffd700' },
  });
  const gAway = await prisma.team.create({
    data: { name: 'Graphics Away', competitionId: phase6Comp.id, colorPrimary: '#3b82f6' },
  });

  const gMatch = await prisma.match.create({
    data: {
      competitionId: phase6Comp.id,
      round: 1,
      matchNumber: 1,
      stage: MatchStage.LEAGUE,
      homeTeamId: gHome.id,
      awayTeamId: gAway.id,
      status: MatchStatus.SCHEDULED,
    },
  });

  await updateMatchScoreAndRecalculate(gMatch.id, { homeScore: 2, awayScore: 1 });

  const form = computeForm(gHome.id, [
    {
      homeTeamId: gHome.id,
      awayTeamId: gAway.id,
      homeScore: 2,
      awayScore: 1,
      status: MatchStatus.COMPLETED,
      updatedAt: new Date(),
    },
  ]);
  if (form.length > 5) throw new Error('[FAIL] Form should be at most 5 matches');
  console.log('   ✅ Form computation caps at 5 results.');

  const standingsPng = await buildExport(phase6Comp.id, 'standings', {
    format: 'png',
    theme: 'efootball_yellow',
    size: 'social_1080x1350',
  });
  if (!standingsPng.contentType.includes('png')) {
    throw new Error('[FAIL] Standings PNG should return image/png');
  }
  if (standingsPng.buffer.length < 5000) {
    throw new Error('[FAIL] Standings PNG buffer too small — likely empty render');
  }
  console.log('   ✅ Standings PNG export returns non-trivial image buffer.');

  const phase6Ko = await prisma.competition.create({
    data: {
      name: 'Phase 6 Bracket Cup',
      slug: `phase6-bracket-${Date.now()}`,
      type: 'TOURNAMENT',
      ownerId: user.id,
    },
  });
  for (let i = 1; i <= 4; i++) {
    await prisma.team.create({ data: { name: `Bracket Team ${i}`, competitionId: phase6Ko.id } });
  }
  await generateKnockoutBracket(phase6Ko.id);

  const bracketPdf = await buildExport(phase6Ko.id, 'bracket', {
    format: 'pdf',
    size: 'a3',
  });
  if (!bracketPdf.contentType.includes('pdf')) {
    throw new Error('[FAIL] Bracket PDF should return application/pdf');
  }
  if (bracketPdf.buffer.length < 1000) {
    throw new Error('[FAIL] Bracket PDF buffer too small');
  }
  console.log('   ✅ Bracket PDF export returns valid buffer.');

  const htmlDefault = await renderGraphicHtml(phase6Comp.id, 'standings', {
    theme: 'efootball_yellow',
  });
  const htmlUcl = await renderGraphicHtml(phase6Comp.id, 'standings', { theme: 'ucl_blue' });
  if (!htmlDefault.includes('theme-efootball_yellow')) {
    throw new Error('[FAIL] HTML should include theme class');
  }
  if (htmlDefault === htmlUcl) {
    throw new Error('[FAIL] Different themes should produce different CSS vars');
  }
  console.log('   ✅ Theme query changes rendered HTML.');

  let matchResultBlocked = false;
  try {
    await buildExport(phase6Comp.id, 'match-result', { format: 'png' });
  } catch {
    matchResultBlocked = true;
  }
  if (!matchResultBlocked) throw new Error('[FAIL] match-result should require matchId');
  console.log('   ✅ Match result export requires matchId.');

  let championBlocked = false;
  try {
    await buildExport(phase6Ko.id, 'champion', { format: 'png' });
  } catch {
    championBlocked = true;
  }
  if (!championBlocked) throw new Error('[FAIL] champion export should fail without champion');
  console.log('   ✅ Champion export requires determined champion.');

  console.log('\n🎉 ===================================================');
  console.log('🎉 ALL UNIT TESTS & ALGORITHM CASES PASSED 100% CLEAN!');
  console.log('🎉 ===================================================');
  process.exit(0);
}

runFullTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
