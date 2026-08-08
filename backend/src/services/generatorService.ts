import { prisma } from '../config/prisma';
import {
  MatchStage,
  MatchStatus,
  CompetitionStatus,
  NotificationType,
  CompetitionType,
} from '@prisma/client';
import { notFound, badRequest } from '../lib/AppError';
import { emitNotification } from './notificationService';
import { isTerminal } from '../lib/matchStatus';
import { calculateGroupStandings } from './recalculationService';

const GROUP_LETTERS = 'ABCDEFGH';

export interface KnockoutBracketOptions {
  teams?: { id: string }[];
  deleteExisting?: boolean;
}

const snakeSeedIntoGroups = (teamIds: string[], groupCount: number): string[][] => {
  const buckets: string[][] = Array.from({ length: groupCount }, () => []);
  let direction = 1;
  let groupIndex = 0;

  for (const teamId of teamIds) {
    buckets[groupIndex].push(teamId);
    if (direction === 1) {
      if (groupIndex === groupCount - 1) direction = -1;
      else groupIndex += 1;
    } else if (groupIndex === 0) direction = 1;
    else groupIndex -= 1;
  }

  return buckets;
};

const createRoundRobinMatches = async (
  competitionId: string,
  teamIds: string[],
  options: { stage: MatchStage; groupId?: string; roundOffset?: number }
) => {
  const { stage, groupId, roundOffset = 0 } = options;
  const N = teamIds.length;
  if (N < 2) return;

  const ids: (string | null)[] = [...teamIds];
  if (N % 2 !== 0) ids.push(null);

  const totalTeams = ids.length;
  const totalRounds = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;
  let currentList = [...ids];

  for (let r = 0; r < totalRounds; r++) {
    const roundNumber = roundOffset + r + 1;
    let matchNum = 1;

    for (let i = 0; i < matchesPerRound; i++) {
      const home = currentList[i];
      const away = currentList[totalTeams - 1 - i];

      if (home !== null && away !== null) {
        const isFlipped = r % 2 === 1 && i === 0;
        await prisma.match.create({
          data: {
            competitionId,
            round: roundNumber,
            matchNumber: matchNum++,
            stage,
            groupId: groupId ?? null,
            homeTeamId: isFlipped ? away : home,
            awayTeamId: isFlipped ? home : away,
            status: MatchStatus.SCHEDULED,
          },
        });
      }
    }

    const fixed = currentList[0];
    const rest = currentList.slice(1);
    const last = rest.pop()!;
    currentList = [fixed, last, ...rest];
  }
};

export const generateKnockoutBracket = async (
  competitionId: string,
  actorUserId?: string,
  options: KnockoutBracketOptions = {}
) => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: { teams: true },
  });

  if (!competition) throw notFound('Competition not found');

  const teams = options.teams ?? competition.teams;
  const N = teams.length;
  if (N < 2) {
    throw badRequest('At least 2 teams are required to generate a bracket');
  }

  const deleteExisting = options.deleteExisting !== false;
  if (deleteExisting) {
    await prisma.match.deleteMany({ where: { competitionId } });
  } else {
    const existingKnockout = await prisma.match.count({
      where: { competitionId, stage: MatchStage.KNOCKOUT },
    });
    if (existingKnockout > 0) {
      throw badRequest('Knockout bracket already exists for this competition');
    }
  }

  const R = Math.ceil(Math.log2(N));
  const P = Math.pow(2, R);
  const byesCount = P - N;
  const matchMap: Record<string, { id: string; nextMatchId: string | null; nextMatchSlot: string | null }> = {};

  for (let r = R; r >= 1; r--) {
    const matchesInRound = Math.pow(2, R - r);
    for (let m = 1; m <= matchesInRound; m++) {
      const match = await prisma.match.create({
        data: {
          competitionId,
          round: r,
          matchNumber: m,
          stage: MatchStage.KNOCKOUT,
          status: MatchStatus.SCHEDULED,
        },
      });
      matchMap[`${r}_${m}`] = match;
    }
  }

  for (let r = 1; r < R; r++) {
    const matchesInRound = Math.pow(2, R - r);
    for (let m = 1; m <= matchesInRound; m++) {
      const parentRound = r + 1;
      const parentMatchNum = Math.ceil(m / 2);
      const slot = m % 2 === 1 ? 'HOME' : 'AWAY';
      const parentMatch = matchMap[`${parentRound}_${parentMatchNum}`];
      const currentMatch = matchMap[`${r}_${m}`];

      await prisma.match.update({
        where: { id: currentMatch.id },
        data: {
          nextMatchId: parentMatch.id,
          nextMatchSlot: slot,
        },
      });
      currentMatch.nextMatchId = parentMatch.id;
      currentMatch.nextMatchSlot = slot;
    }
  }

  const round1MatchCount = P / 2;
  const teamList = [...teams];
  const slots: (string | null)[] = new Array(P).fill(null);
  let teamIdx = 0;

  for (let b = 0; b < byesCount; b++) {
    slots[b * 2] = teamList[teamIdx++].id;
    slots[b * 2 + 1] = null;
  }

  for (let i = byesCount * 2; i < P && teamIdx < N; i++) {
    slots[i] = teamList[teamIdx++].id;
  }

  for (let m = 1; m <= round1MatchCount; m++) {
    const homeTeamId = slots[(m - 1) * 2];
    const awayTeamId = slots[(m - 1) * 2 + 1];
    const currentMatch = matchMap[`1_${m}`];

    if (homeTeamId && !awayTeamId) {
      await prisma.match.update({
        where: { id: currentMatch.id },
        data: {
          homeTeamId,
          awayTeamId: null,
          homeScore: null,
          awayScore: null,
          status: MatchStatus.COMPLETED,
          winnerId: homeTeamId,
        },
      });

      if (currentMatch.nextMatchId && currentMatch.nextMatchSlot) {
        const dataToUpdate: Record<string, string> = {};
        if (currentMatch.nextMatchSlot === 'HOME') dataToUpdate.homeTeamId = homeTeamId;
        else dataToUpdate.awayTeamId = homeTeamId;
        await prisma.match.update({
          where: { id: currentMatch.nextMatchId },
          data: dataToUpdate,
        });
      }
    } else if (!homeTeamId && awayTeamId) {
      await prisma.match.update({
        where: { id: currentMatch.id },
        data: {
          homeTeamId: null,
          awayTeamId,
          homeScore: null,
          awayScore: null,
          status: MatchStatus.COMPLETED,
          winnerId: awayTeamId,
        },
      });

      if (currentMatch.nextMatchId && currentMatch.nextMatchSlot) {
        const dataToUpdate: Record<string, string> = {};
        if (currentMatch.nextMatchSlot === 'HOME') dataToUpdate.homeTeamId = awayTeamId;
        else dataToUpdate.awayTeamId = awayTeamId;
        await prisma.match.update({
          where: { id: currentMatch.nextMatchId },
          data: dataToUpdate,
        });
      }
    } else {
      await prisma.match.update({
        where: { id: currentMatch.id },
        data: {
          homeTeamId,
          awayTeamId,
          status: MatchStatus.SCHEDULED,
        },
      });
    }
  }

  await prisma.competition.update({
    where: { id: competitionId },
    data: { status: CompetitionStatus.IN_PROGRESS },
  });

  await emitNotification({
    competitionId,
    type: NotificationType.FIXTURES_PUBLISHED,
    title: 'Knockout bracket published',
    body: `${competition.name} knockout fixtures are ready.`,
    actorUserId,
  });

  return { message: 'Knockout bracket generated successfully' };
};

export const generateRoundRobinFixtures = async (competitionId: string, actorUserId?: string) => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: { teams: true },
  });

  if (!competition) throw notFound('Competition not found');

  const teams = competition.teams;
  if (teams.length < 2) {
    throw badRequest('At least 2 teams are required to generate league fixtures');
  }

  await prisma.match.deleteMany({ where: { competitionId } });

  await createRoundRobinMatches(
    competitionId,
    teams.map((t) => t.id),
    { stage: MatchStage.LEAGUE }
  );

  await prisma.competition.update({
    where: { id: competitionId },
    data: { status: CompetitionStatus.IN_PROGRESS },
  });

  await emitNotification({
    competitionId,
    type: NotificationType.FIXTURES_PUBLISHED,
    title: 'League fixtures published',
    body: `${competition.name} fixtures are ready. Check the schedule.`,
    actorUserId,
  });

  return { message: 'Round-robin fixtures generated successfully' };
};

export const generateGroupStageFixtures = async (competitionId: string, actorUserId?: string) => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      teams: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
    },
  });

  if (!competition) throw notFound('Competition not found');

  const groupCount = competition.groupCount;
  if (!groupCount || ![2, 4, 8].includes(groupCount)) {
    throw badRequest('Group formats require groupCount of 2, 4, or 8');
  }

  const teams = competition.teams;
  if (teams.length < groupCount * 2) {
    throw badRequest(`Need at least ${groupCount * 2} teams for ${groupCount} groups (min 2 per group)`);
  }

  await prisma.match.deleteMany({
    where: { competitionId, stage: MatchStage.GROUP },
  });
  await prisma.match.deleteMany({
    where: { competitionId, stage: MatchStage.KNOCKOUT },
  });
  await prisma.team.updateMany({
    where: { competitionId },
    data: { groupId: null },
  });
  await prisma.tournamentGroup.deleteMany({ where: { competitionId } });

  const teamIds = teams.map((t) => t.id);
  const buckets = snakeSeedIntoGroups(teamIds, groupCount);

  for (let i = 0; i < groupCount; i++) {
    const group = await prisma.tournamentGroup.create({
      data: {
        competitionId,
        name: `Group ${GROUP_LETTERS[i]}`,
        sortOrder: i,
      },
    });

    await prisma.team.updateMany({
      where: { id: { in: buckets[i] } },
      data: { groupId: group.id },
    });

    await createRoundRobinMatches(competitionId, buckets[i], {
      stage: MatchStage.GROUP,
      groupId: group.id,
    });
  }

  await prisma.competition.update({
    where: { id: competitionId },
    data: { status: CompetitionStatus.IN_PROGRESS },
  });

  await emitNotification({
    competitionId,
    type: NotificationType.FIXTURES_PUBLISHED,
    title: 'Group stage fixtures published',
    body: `${competition.name} group fixtures are ready.`,
    actorUserId,
  });

  return { message: 'Group stage fixtures generated successfully' };
};

export const generateKnockoutFromGroups = async (competitionId: string, actorUserId?: string) => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
  });

  if (!competition) throw notFound('Competition not found');
  if (competition.type !== CompetitionType.GROUP_KNOCKOUT) {
    throw badRequest('Knockout from groups is only available for GROUP_KNOCKOUT competitions');
  }

  const groupMatches = await prisma.match.findMany({
    where: { competitionId, stage: MatchStage.GROUP },
  });

  if (groupMatches.length === 0) {
    throw badRequest('Generate group stage fixtures first');
  }

  const incomplete = groupMatches.some((m) => !isTerminal(m.status));
  if (incomplete) {
    throw badRequest('All group stage matches must be completed before generating knockout');
  }

  const groups = await prisma.tournamentGroup.findMany({
    where: { competitionId },
    orderBy: { sortOrder: 'asc' },
  });

  const qualifiedTeams: { id: string }[] = [];
  for (const group of groups) {
    const standings = await calculateGroupStandings(competitionId, group.id);
    const advance = competition.advancementPerGroup;
    if (standings.length < advance) {
      throw badRequest(`Group ${group.name} does not have enough teams to advance ${advance}`);
    }
    for (let i = 0; i < advance; i++) {
      qualifiedTeams.push({ id: standings[i].teamId });
    }
  }

  if (qualifiedTeams.length < 2) {
    throw badRequest('At least 2 qualified teams are required for knockout');
  }

  return generateKnockoutBracket(competitionId, actorUserId, {
    teams: qualifiedTeams,
    deleteExisting: false,
  });
};
