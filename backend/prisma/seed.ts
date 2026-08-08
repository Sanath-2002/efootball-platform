import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma';
import {
  CompetitionRole,
  CompetitionType,
  MatchFormat,
  MatchStage,
  MatchStatus,
  PlayerPlatform,
  AwardType,
} from '@prisma/client';
import { PERMISSIONS } from '../src/lib/permissions';
import { generateRoundRobinFixtures } from '../src/services/generatorService';
import { updateMatchScoreAndRecalculate } from '../src/services/recalculationService';

async function seedPlayerStatsDemo(competitionId: string, adminId: string) {
  const goalCount = await prisma.matchGoal.count({
    where: { match: { competitionId } },
  });
  if (goalCount > 0) {
    console.log('   Player stats demo data already present.');
    return;
  }

  let matchCount = await prisma.match.count({ where: { competitionId } });
  if (matchCount === 0) {
    await generateRoundRobinFixtures(competitionId);
    matchCount = await prisma.match.count({ where: { competitionId } });
  }

  const teams = await prisma.team.findMany({
    where: { competitionId },
    include: { players: true },
    orderBy: { name: 'asc' },
  });
  if (teams.length < 2) return;

  const matches = await prisma.match.findMany({
    where: { competitionId, status: MatchStatus.SCHEDULED },
    take: 3,
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  if (matches[0]?.homeTeamId && matches[0]?.awayTeamId) {
    const home = teams.find((t) => t.id === matches[0].homeTeamId);
    const away = teams.find((t) => t.id === matches[0].awayTeamId);
    const scorer1 = home?.players[0];
    const scorer2 = away?.players[0];
    if (scorer1 && scorer2) {
      await updateMatchScoreAndRecalculate(matches[0].id, {
        homeScore: 2,
        awayScore: 1,
        goals: [
          { playerId: scorer1.id },
          { playerId: scorer1.id },
          { playerId: scorer2.id },
        ],
        appearances: [
          { playerId: scorer1.id },
          { playerId: scorer2.id },
          ...(home.players[1] ? [{ playerId: home.players[1].id }] : []),
        ],
      });
    }
  }

  if (matches[1]?.homeTeamId && matches[1]?.awayTeamId) {
    const home = teams.find((t) => t.id === matches[1].homeTeamId);
    const away = teams.find((t) => t.id === matches[1].awayTeamId);
    const scorer = home?.players[0];
    if (scorer) {
      await updateMatchScoreAndRecalculate(matches[1].id, {
        homeScore: 1,
        awayScore: 0,
        goals: [{ playerId: scorer.id }],
        appearances: [{ playerId: scorer.id }],
      });
    }
  }

  const mvpPlayer = teams[0]?.players[0];
  if (mvpPlayer) {
    await prisma.competitionAward.upsert({
      where: {
        competitionId_awardType: {
          competitionId,
          awardType: AwardType.MVP,
        },
      },
      update: {},
      create: {
        competitionId,
        playerId: mvpPlayer.id,
        awardType: AwardType.MVP,
        assignedById: adminId,
        notes: 'Outstanding all-round performance',
      },
    });
  }

  console.log('   Added demo match goals and MVP award.');
}

async function main() {
  console.log('🌱 Seeding eFootball platform demo data...');

  const adminEmail = 'admin@efootball.com';
  const coordEmail = 'coordinator@efootball.com';

  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Admin Coordinator',
    },
  });

  const coordinator = await prisma.user.upsert({
    where: { email: coordEmail },
    update: {},
    create: {
      email: coordEmail,
      passwordHash,
      name: 'Score Coordinator',
    },
  });

  const existing = await prisma.competition.findUnique({
    where: { slug: 'efootball-demo-cup-2026' },
    include: { teams: { include: { players: true } } },
  });

  if (existing) {
    await seedPlayerStatsDemo(existing.id, admin.id);
    console.log('✅ Seed complete (existing demo updated)');
    return;
  }

  const competition = await prisma.competition.create({
    data: {
      name: 'eFootball Demo Cup 2026',
      slug: 'efootball-demo-cup-2026',
      type: CompetitionType.LEAGUE,
      format: MatchFormat.BO1,
      description: 'Demo league showcasing teams, players, and coordinator permissions.',
      ownerId: admin.id,
    },
  });

  await prisma.competitionMember.createMany({
    data: [
      {
        competitionId: competition.id,
        userId: admin.id,
        role: CompetitionRole.OWNER,
        permissions: [],
      },
      {
        competitionId: competition.id,
        userId: coordinator.id,
        role: CompetitionRole.COORDINATOR,
        permissions: [PERMISSIONS.SCORES_UPDATE, PERMISSIONS.REPORTS_VIEW, PERMISSIONS.ANNOUNCEMENTS_PUBLISH],
        invitedById: admin.id,
      },
    ],
  });

  const teamData = [
    {
      name: 'Arsenal eFC',
      shortName: 'ARS',
      colorPrimary: '#EF0107',
      coachName: 'Mikel Arteta',
      players: [
        { name: 'Alex Turner', gamerTag: 'ArsenalAlex', platform: PlayerPlatform.PS5, jerseyNumber: 7, preferredClub: 'Arsenal' },
        { name: 'Sam Rice', gamerTag: 'RiceyFC', platform: PlayerPlatform.PS5, jerseyNumber: 41, preferredClub: 'Arsenal' },
      ],
    },
    {
      name: 'Barcelona eFC',
      shortName: 'BAR',
      colorPrimary: '#A50044',
      coachName: 'Hansi Flick',
      players: [
        { name: 'Carlos Vega', gamerTag: 'BarcaCarlos', platform: PlayerPlatform.STEAM, jerseyNumber: 10, preferredClub: 'Barcelona' },
        { name: 'Pedri Pro', gamerTag: 'Pedri8', platform: PlayerPlatform.XBOX, jerseyNumber: 8, preferredClub: 'Barcelona' },
      ],
    },
    {
      name: 'Real Madrid eFC',
      shortName: 'RMA',
      colorPrimary: '#FEBE10',
      coachName: 'Carlo Ancelotti',
      players: [
        { name: 'Diego Star', gamerTag: 'MadridDiego', platform: PlayerPlatform.PS5, jerseyNumber: 9, preferredClub: 'Real Madrid' },
        { name: 'Vinny Jr', gamerTag: 'Vini7', platform: PlayerPlatform.MOBILE, jerseyNumber: 7, preferredClub: 'Real Madrid' },
      ],
    },
    {
      name: 'Manchester City eFC',
      shortName: 'MCI',
      colorPrimary: '#6CABDD',
      coachName: 'Pep Guardiola',
      players: [
        { name: 'Kevin Pro', gamerTag: 'KDB17', platform: PlayerPlatform.STEAM, jerseyNumber: 17, preferredClub: 'Manchester City' },
        { name: 'Erling King', gamerTag: 'Haaland9', platform: PlayerPlatform.PS5, jerseyNumber: 9, preferredClub: 'Manchester City' },
      ],
    },
  ];

  for (const t of teamData) {
    const team = await prisma.team.create({
      data: {
        name: t.name,
        shortName: t.shortName,
        colorPrimary: t.colorPrimary,
        coachName: t.coachName,
        competitionId: competition.id,
        players: {
          create: t.players.map((p, idx) => ({
            name: p.name,
            gamerTag: p.gamerTag,
            platform: p.platform,
            jerseyNumber: p.jerseyNumber,
            preferredClub: p.preferredClub,
            sortOrder: idx,
          })),
        },
      },
      include: { players: true },
    });

    if (team.players[0]) {
      await prisma.team.update({
        where: { id: team.id },
        data: { captainId: team.players[0].id },
      });
    }
  }

  await prisma.announcement.createMany({
    data: [
      {
        competitionId: competition.id,
        title: 'Welcome to the Demo Cup',
        body: 'Fixtures will be published soon. Follow this tournament for match alerts.',
        pinned: true,
        authorId: admin.id,
      },
      {
        competitionId: competition.id,
        title: 'Rules reminder',
        body: 'BO1 matches — report scores within 24 hours of completion.',
        pinned: false,
        authorId: admin.id,
      },
    ],
  });

  await seedPlayerStatsDemo(competition.id, admin.id);

  console.log('✅ Seed complete');
  console.log(`   Owner: ${adminEmail} / admin123`);
  console.log(`   Coordinator (scores only): ${coordEmail} / admin123`);
  console.log(`   Demo tournament slug: ${competition.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
