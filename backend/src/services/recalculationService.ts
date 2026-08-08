import { prisma } from '../config/prisma';
import {
  CompetitionStatus,
  CompetitionType,
  MatchFormat,
  MatchStage,
  MatchStatus,
  NotificationType,
} from '@prisma/client';
import { notFound, badRequest } from '../lib/AppError';
import { isResult, isTerminal, assertTransition } from '../lib/matchStatus';
import { emitNotification } from './notificationService';

export interface MatchGameInput {
  gameNumber: number;
  homeScore: number;
  awayScore: number;
  homePenalties?: number | null;
  awayPenalties?: number | null;
}

export interface MatchGoalInput {
  playerId: string;
  gameNumber?: number;
  isOwnGoal?: boolean;
  minute?: number;
}

export interface MatchAppearanceInput {
  playerId: string;
}

export interface UpdateScoreInput {
  homeScore?: number | null;
  awayScore?: number | null;
  homePenalties?: number | null;
  awayPenalties?: number | null;
  games?: MatchGameInput[];
  goals?: MatchGoalInput[];
  appearances?: MatchAppearanceInput[];
  actorUserId?: string;
}

export interface PlayerStatsRow {
  playerId: string;
  name: string;
  gamerTag: string | null;
  jerseyNumber: number | null;
  teamId: string;
  teamName: string;
  colorPrimary: string | null;
  goals: number;
  ownGoals: number;
  appearances: number;
  goalsPerGame: number;
}

const resolvePlayerTeam = async (
  playerId: string,
  homeTeamId: string,
  awayTeamId: string
): Promise<string> => {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { teamId: true },
  });
  if (!player) throw badRequest(`Player ${playerId} not found`);
  if (player.teamId !== homeTeamId && player.teamId !== awayTeamId) {
    throw badRequest('Goal scorer must belong to one of the match teams');
  }
  return player.teamId;
};

const validateAndBuildGoals = async (
  goals: MatchGoalInput[],
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number
) => {
  if (goals.length === 0) return [];

  let homeCredited = 0;
  let awayCredited = 0;
  const built: Array<{
    playerId: string;
    teamId: string;
    gameNumber: number | null;
    isOwnGoal: boolean;
    minute: number | null;
  }> = [];

  for (const goal of goals) {
    if (goal.gameNumber != null && (goal.gameNumber < 1 || goal.gameNumber > 3)) {
      throw badRequest('gameNumber must be 1, 2, or 3');
    }

    const playerTeamId = await resolvePlayerTeam(goal.playerId, homeTeamId, awayTeamId);
    const isOwnGoal = goal.isOwnGoal ?? false;
    const creditedTeamId = isOwnGoal
      ? playerTeamId === homeTeamId
        ? awayTeamId
        : homeTeamId
      : playerTeamId;

    if (creditedTeamId === homeTeamId) homeCredited += 1;
    else awayCredited += 1;

    built.push({
      playerId: goal.playerId,
      teamId: creditedTeamId,
      gameNumber: goal.gameNumber ?? null,
      isOwnGoal,
      minute: goal.minute ?? null,
    });
  }

  if (homeCredited !== homeScore || awayCredited !== awayScore) {
    throw badRequest(
      `Goal scorers (${homeCredited}-${awayCredited}) do not match team score (${homeScore}-${awayScore})`
    );
  }

  return built;
};

const persistGoalsAndAppearances = async (
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
  goals?: MatchGoalInput[],
  appearances?: MatchAppearanceInput[]
) => {
  await prisma.matchGoal.deleteMany({ where: { matchId } });
  await prisma.matchAppearance.deleteMany({ where: { matchId } });

  if (goals?.length) {
    const built = await validateAndBuildGoals(goals, homeTeamId, awayTeamId, homeScore, awayScore);
    await prisma.matchGoal.createMany({
      data: built.map((g) => ({ matchId, ...g })),
    });
  }

  if (appearances?.length) {
    const seen = new Set<string>();
    for (const app of appearances) {
      if (seen.has(app.playerId)) continue;
      seen.add(app.playerId);
      const teamId = await resolvePlayerTeam(app.playerId, homeTeamId, awayTeamId);
      await prisma.matchAppearance.create({
        data: { matchId, playerId: app.playerId, teamId },
      });
    }
  }
};

const resolveKnockoutWinner = (
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
  homePenalties: number | null | undefined,
  awayPenalties: number | null | undefined,
  stage: MatchStage
): string | null => {
  if (homeScore > awayScore) return homeTeamId;
  if (awayScore > homeScore) return awayTeamId;

  if (stage !== MatchStage.KNOCKOUT) return null;

  if (homePenalties == null || awayPenalties == null) {
    throw badRequest('Knockout match cannot end level - enter a penalty shootout result');
  }
  if (homePenalties === awayPenalties) {
    throw badRequest('Penalty shootout cannot end level');
  }
  return homePenalties > awayPenalties ? homeTeamId : awayTeamId;
};

const resolveLeagueWinner = (
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number
): string | null => {
  if (homeScore > awayScore) return homeTeamId;
  if (awayScore > homeScore) return awayTeamId;
  return null;
};

const processBo3Games = (
  games: MatchGameInput[],
  homeTeamId: string,
  awayTeamId: string,
  stage: MatchStage
) => {
  if (games.length === 0 || games.length > 3) {
    throw badRequest('BO3 requires 1 to 3 game legs');
  }

  let homeGamesWon = 0;
  let awayGamesWon = 0;
  let homeScore = 0;
  let awayScore = 0;

  for (const game of games) {
    homeScore += game.homeScore;
    awayScore += game.awayScore;

    let legWinner: string | null = null;
    if (game.homeScore > game.awayScore) {
      legWinner = homeTeamId;
    } else if (game.awayScore > game.homeScore) {
      legWinner = awayTeamId;
    } else if (stage === MatchStage.KNOCKOUT) {
      if (game.homePenalties == null || game.awayPenalties == null) {
        throw badRequest(`Game ${game.gameNumber} ended level - enter penalty shootout result`);
      }
      legWinner =
        game.homePenalties > game.awayPenalties ? homeTeamId : awayTeamId;
    }

    if (legWinner === homeTeamId) homeGamesWon += 1;
    else if (legWinner === awayTeamId) awayGamesWon += 1;
  }

  if (homeGamesWon < 2 && awayGamesWon < 2) {
    throw badRequest('BO3 series is incomplete - a team must win 2 legs');
  }
  if (homeGamesWon >= 2 && awayGamesWon >= 2) {
    throw badRequest('Invalid BO3 series - both teams cannot win 2 legs');
  }

  const winnerId = homeGamesWon >= 2 ? homeTeamId : awayTeamId;

  return {
    homeScore,
    awayScore,
    homeGamesWon,
    awayGamesWon,
    winnerId,
    homePenalties: null as number | null,
    awayPenalties: null as number | null,
  };
};

const clearMatchResultFields = {
  homeScore: null,
  awayScore: null,
  homeGamesWon: null,
  awayGamesWon: null,
  homePenalties: null,
  awayPenalties: null,
  winnerId: null,
  status: MatchStatus.SCHEDULED,
};

export const updateMatchScoreAndRecalculate = async (
  matchId: string,
  input: UpdateScoreInput
) => {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { competition: true },
  });

  if (!match) throw notFound('Match not found');
  if (!match.homeTeamId || !match.awayTeamId) {
    throw badRequest('Cannot set score for match without assigned teams');
  }

  const clearing =
    input.homeScore === null ||
    input.awayScore === null ||
    input.homeScore === undefined ||
    input.awayScore === undefined;

  if (clearing) {
    await prisma.matchGame.deleteMany({ where: { matchId } });
    await prisma.matchGoal.deleteMany({ where: { matchId } });
    await prisma.matchAppearance.deleteMany({ where: { matchId } });
    await prisma.match.update({
      where: { id: matchId },
      data: clearMatchResultFields,
    });

    await recalculateCompetition(match.competitionId, match.competition.type);
    return { message: 'Match score cleared successfully' };
  }

  let homeScore = Number(input.homeScore);
  let awayScore = Number(input.awayScore);
  let homePenalties = input.homePenalties ?? null;
  let awayPenalties = input.awayPenalties ?? null;
  let homeGamesWon: number | null = null;
  let awayGamesWon: number | null = null;
  let winnerId: string | null = null;

  if (match.competition.format === MatchFormat.BO3 && input.games?.length) {
    const bo3 = processBo3Games(
      input.games,
      match.homeTeamId,
      match.awayTeamId,
      match.stage
    );
    homeScore = bo3.homeScore;
    awayScore = bo3.awayScore;
    homeGamesWon = bo3.homeGamesWon;
    awayGamesWon = bo3.awayGamesWon;
    winnerId = bo3.winnerId;

    await prisma.matchGame.deleteMany({ where: { matchId } });
    await prisma.matchGame.createMany({
      data: input.games.map((g) => ({
        matchId,
        gameNumber: g.gameNumber,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        homePenalties: g.homePenalties ?? null,
        awayPenalties: g.awayPenalties ?? null,
      })),
    });
  } else {
    winnerId =
      match.competition.type === CompetitionType.TOURNAMENT ||
      match.stage === MatchStage.KNOCKOUT
        ? resolveKnockoutWinner(
            match.homeTeamId,
            match.awayTeamId,
            homeScore,
            awayScore,
            homePenalties,
            awayPenalties,
            match.stage
          )
        : resolveLeagueWinner(match.homeTeamId, match.awayTeamId, homeScore, awayScore);
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore,
      awayScore,
      homePenalties,
      awayPenalties,
      homeGamesWon,
      awayGamesWon,
      status: MatchStatus.COMPLETED,
      winnerId,
    },
  });

  await persistGoalsAndAppearances(
    matchId,
    match.homeTeamId,
    match.awayTeamId,
    homeScore,
    awayScore,
    input.goals,
    input.appearances
  );

  const homeName =
    (await prisma.team.findUnique({ where: { id: match.homeTeamId }, select: { name: true } }))
      ?.name ?? 'Home';
  const awayName =
    (await prisma.team.findUnique({ where: { id: match.awayTeamId }, select: { name: true } }))
      ?.name ?? 'Away';

  await emitNotification({
    competitionId: match.competitionId,
    type: NotificationType.MATCH_RESULT,
    title: `${homeName} ${homeScore}-${awayScore} ${awayName}`,
    body: `Round ${match.round}, Match #${match.matchNumber} result recorded.`,
    matchId,
    actorUserId: input.actorUserId,
  });

  const competitionCompleted = await recalculateCompetition(
    match.competitionId,
    match.competition.type
  );

  if (competitionCompleted) {
    await emitNotification({
      competitionId: match.competitionId,
      type: NotificationType.COMPETITION_COMPLETED,
      title: `${match.competition.name} completed`,
      body: 'The tournament has finished. Check the final standings or bracket.',
      actorUserId: input.actorUserId,
    });
  }

  return { message: 'Match score updated and competition recalculated' };
};

export interface UpdateMatchStatusInput {
  status: MatchStatus;
  statusNote?: string | null;
  winnerTeamId?: string | null;
  actorUserId?: string;
}

export const updateMatchStatusAndRecalculate = async (
  matchId: string,
  input: UpdateMatchStatusInput
) => {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { competition: true, homeTeam: true, awayTeam: true },
  });

  if (!match) throw notFound('Match not found');
  assertTransition(match.status, input.status);

  if (input.status === MatchStatus.WALKOVER) {
    if (!input.winnerTeamId) {
      throw badRequest('Walkover requires winnerTeamId');
    }
    if (
      input.winnerTeamId !== match.homeTeamId &&
      input.winnerTeamId !== match.awayTeamId
    ) {
      throw badRequest('Winner must be one of the match teams');
    }

    await prisma.matchGame.deleteMany({ where: { matchId } });
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.WALKOVER,
        statusNote: input.statusNote ?? null,
        winnerId: input.winnerTeamId,
        homeScore: input.winnerTeamId === match.homeTeamId ? 3 : 0,
        awayScore: input.winnerTeamId === match.awayTeamId ? 3 : 0,
        homePenalties: null,
        awayPenalties: null,
        homeGamesWon: null,
        awayGamesWon: null,
      },
    });
  } else if (input.status === MatchStatus.CANCELLED) {
    await prisma.matchGame.deleteMany({ where: { matchId } });
    await prisma.match.update({
      where: { id: matchId },
      data: {
        ...clearMatchResultFields,
        status: MatchStatus.CANCELLED,
        statusNote: input.statusNote ?? null,
      },
    });
  } else if (input.status === MatchStatus.POSTPONED) {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.POSTPONED,
        statusNote: input.statusNote ?? null,
      },
    });
  } else if (input.status === MatchStatus.SCHEDULED) {
    await prisma.matchGame.deleteMany({ where: { matchId } });
    await prisma.match.update({
      where: { id: matchId },
      data: {
        ...clearMatchResultFields,
        statusNote: input.statusNote ?? null,
      },
    });
  }

  if (
    input.status === MatchStatus.POSTPONED ||
    input.status === MatchStatus.CANCELLED ||
    input.status === MatchStatus.WALKOVER
  ) {
    const label =
      input.status === MatchStatus.POSTPONED
        ? 'postponed'
        : input.status === MatchStatus.CANCELLED
          ? 'cancelled'
          : 'walkover';

    await emitNotification({
      competitionId: match.competitionId,
      type: NotificationType.MATCH_STATUS_CHANGED,
      title: `Match #${match.matchNumber} ${label}`,
      body: `${match.homeTeam?.name ?? 'TBD'} vs ${match.awayTeam?.name ?? 'TBD'}${input.statusNote ? `: ${input.statusNote}` : ''}`,
      matchId,
      actorUserId: input.actorUserId,
    });
  }

  const competitionCompleted = await recalculateCompetition(
    match.competitionId,
    match.competition.type
  );

  if (competitionCompleted) {
    await emitNotification({
      competitionId: match.competitionId,
      type: NotificationType.COMPETITION_COMPLETED,
      title: `${match.competition.name} completed`,
      body: 'The tournament has finished.',
      actorUserId: input.actorUserId,
    });
  }

  return { message: 'Match status updated' };
};

const recalculateCompetition = async (
  competitionId: string,
  type: CompetitionType
): Promise<boolean> => {
  if (type === CompetitionType.TOURNAMENT) {
    return propagateKnockoutChanges(competitionId);
  }
  if (type === CompetitionType.GROUP_KNOCKOUT) {
    const knockoutCount = await prisma.match.count({
      where: { competitionId, stage: MatchStage.KNOCKOUT },
    });
    if (knockoutCount > 0) {
      return propagateKnockoutChanges(competitionId);
    }
    return updateGroupStageStatus(competitionId);
  }
  if (type === CompetitionType.GROUP_STAGE) {
    return updateGroupStageStatus(competitionId);
  }
  return updateLeagueStatus(competitionId);
};

const updateGroupStageStatus = async (competitionId: string): Promise<boolean> => {
  const matches = await prisma.match.findMany({
    where: { competitionId, stage: MatchStage.GROUP },
  });

  if (matches.length === 0) return false;

  const allTerminal = matches.every((m) => isTerminal(m.status));
  const hasResults = matches.some((m) => isResult(m.status));
  const completed = allTerminal && hasResults;

  await prisma.competition.update({
    where: { id: competitionId },
    data: {
      status: completed ? CompetitionStatus.COMPLETED : CompetitionStatus.IN_PROGRESS,
    },
  });

  return completed;
};

const propagateKnockoutChanges = async (competitionId: string): Promise<boolean> => {
  const matches = await prisma.match.findMany({
    where: { competitionId, stage: MatchStage.KNOCKOUT },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  if (matches.length === 0) return false;

  const maxRound = Math.max(...matches.map((m) => m.round));

  for (let r = 1; r < maxRound; r++) {
    const roundMatches = matches.filter((m) => m.round === r);
    for (const m of roundMatches) {
      if (m.nextMatchId && m.nextMatchSlot) {
        const parentMatch = matches.find((pm) => pm.id === m.nextMatchId);
        if (parentMatch) {
          const winnerIdToSet = isResult(m.status) ? m.winnerId : null;
          const dataToUpdate: Record<string, unknown> = {};
          if (m.nextMatchSlot === 'HOME') {
            if (parentMatch.homeTeamId !== winnerIdToSet) {
              dataToUpdate.homeTeamId = winnerIdToSet;
              Object.assign(dataToUpdate, clearMatchResultFields);
            }
          } else if (parentMatch.awayTeamId !== winnerIdToSet) {
            dataToUpdate.awayTeamId = winnerIdToSet;
            Object.assign(dataToUpdate, clearMatchResultFields);
          }

          if (Object.keys(dataToUpdate).length > 0) {
            await prisma.match.update({
              where: { id: parentMatch.id },
              data: dataToUpdate,
            });
            Object.assign(parentMatch, dataToUpdate);
          }
        }
      }
    }
  }

  const finalMatch = matches.find((m) => m.round === maxRound);
  const completed =
    !!finalMatch && isResult(finalMatch.status) && !!finalMatch.winnerId;

  await prisma.competition.update({
    where: { id: competitionId },
    data: {
      status: completed ? CompetitionStatus.COMPLETED : CompetitionStatus.IN_PROGRESS,
    },
  });

  return completed;
};

const updateLeagueStatus = async (competitionId: string): Promise<boolean> => {
  const matches = await prisma.match.findMany({
    where: { competitionId },
  });

  if (matches.length === 0) return false;

  const allTerminal = matches.every((m) => isTerminal(m.status));
  const hasResults = matches.some((m) => isResult(m.status));
  const completed = allTerminal && hasResults;

  await prisma.competition.update({
    where: { id: competitionId },
    data: {
      status: completed ? CompetitionStatus.COMPLETED : CompetitionStatus.IN_PROGRESS,
    },
  });

  return completed;
};

export const calculateLeagueStandings = async (competitionId: string) => {
  const teams = await prisma.team.findMany({
    where: { competitionId },
  });

  const matches = await prisma.match.findMany({
    where: {
      competitionId,
      status: { in: [MatchStatus.COMPLETED, MatchStatus.WALKOVER] },
    },
  });

  const statsMap: Record<
    string,
    {
      teamId: string;
      name: string;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      points: number;
    }
  > = {};

  teams.forEach((t) => {
    statsMap[t.id] = {
      teamId: t.id,
      name: t.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  });

  matches.forEach((m) => {
    if (m.homeTeamId && m.awayTeamId && m.homeScore !== null && m.awayScore !== null) {
      const homeStats = statsMap[m.homeTeamId];
      const awayStats = statsMap[m.awayTeamId];

      if (homeStats && awayStats) {
        homeStats.played += 1;
        awayStats.played += 1;

        homeStats.goalsFor += m.homeScore;
        homeStats.goalsAgainst += m.awayScore;
        awayStats.goalsFor += m.awayScore;
        awayStats.goalsAgainst += m.homeScore;

        if (m.status === MatchStatus.WALKOVER) {
          if (m.winnerId === m.homeTeamId) {
            homeStats.won += 1;
            homeStats.points += 3;
            awayStats.lost += 1;
          } else {
            awayStats.won += 1;
            awayStats.points += 3;
            homeStats.lost += 1;
          }
        } else if (m.homeScore > m.awayScore) {
          homeStats.won += 1;
          homeStats.points += 3;
          awayStats.lost += 1;
        } else if (m.awayScore > m.homeScore) {
          awayStats.won += 1;
          awayStats.points += 3;
          homeStats.lost += 1;
        } else {
          homeStats.drawn += 1;
          homeStats.points += 1;
          awayStats.drawn += 1;
          awayStats.points += 1;
        }
      }
    }
  });

  const standings = Object.values(statsMap).map((s) => ({
    ...s,
    goalDifference: s.goalsFor - s.goalsAgainst,
  }));

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });

  return standings;
};

export const calculateGroupStandings = async (competitionId: string, groupId: string) => {
  const teams = await prisma.team.findMany({
    where: { competitionId, groupId },
  });

  const matches = await prisma.match.findMany({
    where: {
      competitionId,
      groupId,
      stage: MatchStage.GROUP,
      status: { in: [MatchStatus.COMPLETED, MatchStatus.WALKOVER] },
    },
  });

  const statsMap: Record<
    string,
    {
      teamId: string;
      name: string;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      points: number;
    }
  > = {};

  teams.forEach((t) => {
    statsMap[t.id] = {
      teamId: t.id,
      name: t.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  });

  matches.forEach((m) => {
    if (m.homeTeamId && m.awayTeamId && m.homeScore !== null && m.awayScore !== null) {
      const homeStats = statsMap[m.homeTeamId];
      const awayStats = statsMap[m.awayTeamId];

      if (homeStats && awayStats) {
        homeStats.played += 1;
        awayStats.played += 1;
        homeStats.goalsFor += m.homeScore;
        homeStats.goalsAgainst += m.awayScore;
        awayStats.goalsFor += m.awayScore;
        awayStats.goalsAgainst += m.homeScore;

        if (m.status === MatchStatus.WALKOVER) {
          if (m.winnerId === m.homeTeamId) {
            homeStats.won += 1;
            homeStats.points += 3;
            awayStats.lost += 1;
          } else {
            awayStats.won += 1;
            awayStats.points += 3;
            homeStats.lost += 1;
          }
        } else if (m.homeScore > m.awayScore) {
          homeStats.won += 1;
          homeStats.points += 3;
          awayStats.lost += 1;
        } else if (m.awayScore > m.homeScore) {
          awayStats.won += 1;
          awayStats.points += 3;
          homeStats.lost += 1;
        } else {
          homeStats.drawn += 1;
          homeStats.points += 1;
          awayStats.drawn += 1;
          awayStats.points += 1;
        }
      }
    }
  });

  const standings = Object.values(statsMap).map((s) => ({
    ...s,
    goalDifference: s.goalsFor - s.goalsAgainst,
  }));

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });

  return standings;
};

export const getGroupStandings = async (competitionId: string) => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      groups: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (!competition) throw notFound('Competition not found');

  const groups = await Promise.all(
    competition.groups.map(async (group) => ({
      id: group.id,
      name: group.name,
      sortOrder: group.sortOrder,
      standings: await calculateGroupStandings(competitionId, group.id),
    }))
  );

  return {
    advancementPerGroup: competition.advancementPerGroup,
    groups,
  };
};

const getStatsMatchIds = async (competitionId: string): Promise<string[]> => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: { matches: { select: { id: true, stage: true, status: true } } },
  });
  if (!competition) throw notFound('Competition not found');

  const hasKnockout = competition.matches.some((m) => m.stage === MatchStage.KNOCKOUT);

  let statsMatches = competition.matches;
  if (competition.type === CompetitionType.GROUP_STAGE) {
    statsMatches = competition.matches.filter((m) => m.stage === MatchStage.GROUP);
  } else if (competition.type === CompetitionType.GROUP_KNOCKOUT && hasKnockout) {
    statsMatches = competition.matches.filter((m) => m.stage === MatchStage.KNOCKOUT);
  }

  return statsMatches.filter((m) => isResult(m.status)).map((m) => m.id);
};

export const calculatePlayerStats = async (competitionId: string): Promise<PlayerStatsRow[]> => {
  const matchIds = await getStatsMatchIds(competitionId);
  if (matchIds.length === 0) return [];

  const [goals, appearances, players] = await Promise.all([
    prisma.matchGoal.findMany({
      where: { matchId: { in: matchIds } },
      include: {
        player: {
          include: { team: { select: { id: true, name: true, colorPrimary: true } } },
        },
        match: { select: { id: true } },
      },
    }),
    prisma.matchAppearance.findMany({
      where: { matchId: { in: matchIds } },
      select: { matchId: true, playerId: true },
    }),
    prisma.player.findMany({
      where: { team: { competitionId } },
      include: { team: { select: { id: true, name: true, colorPrimary: true } } },
    }),
  ]);

  const statsMap = new Map<
    string,
    {
      player: (typeof players)[0];
      goals: number;
      ownGoals: number;
      matchIds: Set<string>;
    }
  >();

  for (const p of players) {
    statsMap.set(p.id, { player: p, goals: 0, ownGoals: 0, matchIds: new Set() });
  }

  for (const g of goals) {
    const entry = statsMap.get(g.playerId);
    if (!entry) continue;
    if (g.isOwnGoal) entry.ownGoals += 1;
    else entry.goals += 1;
    entry.matchIds.add(g.matchId);
  }

  for (const a of appearances) {
    const entry = statsMap.get(a.playerId);
    if (entry) entry.matchIds.add(a.matchId);
  }

  const rows: PlayerStatsRow[] = [];

  for (const [, entry] of statsMap) {
    if (entry.goals === 0 && entry.ownGoals === 0 && entry.matchIds.size === 0) continue;

    const appearancesCount = entry.matchIds.size;
    rows.push({
      playerId: entry.player.id,
      name: entry.player.name,
      gamerTag: entry.player.gamerTag,
      jerseyNumber: entry.player.jerseyNumber,
      teamId: entry.player.teamId,
      teamName: entry.player.team.name,
      colorPrimary: entry.player.team.colorPrimary,
      goals: entry.goals,
      ownGoals: entry.ownGoals,
      appearances: appearancesCount,
      goalsPerGame: entry.goals / Math.max(appearancesCount, 1),
    });
  }

  rows.sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.goalsPerGame !== a.goalsPerGame) return b.goalsPerGame - a.goalsPerGame;
    if (b.appearances !== a.appearances) return b.appearances - a.appearances;
    return a.name.localeCompare(b.name);
  });

  return rows;
};

export const calculateCompetitionStats = async (competitionId: string) => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      teams: true,
      matches: {
        include: { homeTeam: true, awayTeam: true, winner: true },
      },
    },
  });

  if (!competition) throw notFound('Competition not found');

  const hasKnockout = competition.matches.some((m) => m.stage === MatchStage.KNOCKOUT);

  let statsMatches = competition.matches;
  if (competition.type === CompetitionType.GROUP_STAGE) {
    statsMatches = competition.matches.filter((m) => m.stage === MatchStage.GROUP);
  } else if (
    competition.type === CompetitionType.GROUP_KNOCKOUT &&
    hasKnockout
  ) {
    statsMatches = competition.matches.filter((m) => m.stage === MatchStage.KNOCKOUT);
  }

  const completedMatches = statsMatches.filter((m) => isResult(m.status));

  let standings = await calculateLeagueStandings(competitionId);
  if (competition.type === CompetitionType.GROUP_STAGE) {
    const groupData = await getGroupStandings(competitionId);
    standings = groupData.groups
      .flatMap((g) => g.standings)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.name.localeCompare(b.name);
      });
  } else if (competition.type === CompetitionType.GROUP_KNOCKOUT && !hasKnockout) {
    const groupData = await getGroupStandings(competitionId);
    standings = groupData.groups.flatMap((g) => g.standings);
  } else if (competition.type === CompetitionType.GROUP_KNOCKOUT && hasKnockout) {
    standings = [];
  }

  let highestScoringMatch: {
    matchId: string;
    round: number;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    totalGoals: number;
  } | null = null;
  let maxGoalsInMatch = -1;

  completedMatches.forEach((m) => {
    if (m.homeScore !== null && m.awayScore !== null) {
      const totalGoals = m.homeScore + m.awayScore;
      if (totalGoals > maxGoalsInMatch) {
        maxGoalsInMatch = totalGoals;
        highestScoringMatch = {
          matchId: m.id,
          round: m.round,
          homeTeam: m.homeTeam?.name || 'TBD',
          awayTeam: m.awayTeam?.name || 'TBD',
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          totalGoals,
        };
      }
    }
  });

  const topOffense = standings.length
    ? [...standings].sort((a, b) => b.goalsFor - a.goalsFor)[0]
    : null;
  const topDefense = standings.length
    ? [...standings].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0]
    : null;
  const mostWins = standings.length
    ? [...standings].sort((a, b) => b.won - a.won)[0]
    : null;
  const mostLosses = standings.length
    ? [...standings].sort((a, b) => b.lost - a.lost)[0]
    : null;
  const bestGD = standings.length
    ? [...standings].sort((a, b) => b.goalDifference - a.goalDifference)[0]
    : null;
  const worstGD = standings.length
    ? [...standings].sort((a, b) => a.goalDifference - b.goalDifference)[0]
    : null;

  let champion: string | null = null;
  let runnerUp: string | null = null;

  if (competition.type === CompetitionType.TOURNAMENT) {
    const knockoutMatches = competition.matches.filter((m) => m.stage === MatchStage.KNOCKOUT);
    const maxRound = Math.max(...knockoutMatches.map((m) => m.round), 0);
    const finalMatch = knockoutMatches.find((m) => m.round === maxRound);
    if (finalMatch && isResult(finalMatch.status) && finalMatch.winnerId) {
      champion = finalMatch.winner?.name || null;
      runnerUp =
        finalMatch.winnerId === finalMatch.homeTeamId
          ? finalMatch.awayTeam?.name || null
          : finalMatch.homeTeam?.name || null;
    }
  } else if (
    competition.type === CompetitionType.GROUP_KNOCKOUT &&
    competition.matches.some((m) => m.stage === MatchStage.KNOCKOUT)
  ) {
    const knockoutMatches = competition.matches.filter((m) => m.stage === MatchStage.KNOCKOUT);
    const maxRound = Math.max(...knockoutMatches.map((m) => m.round), 0);
    const finalMatch = knockoutMatches.find((m) => m.round === maxRound);
    if (finalMatch && isResult(finalMatch.status) && finalMatch.winnerId) {
      champion = finalMatch.winner?.name || null;
      runnerUp =
        finalMatch.winnerId === finalMatch.homeTeamId
          ? finalMatch.awayTeam?.name || null
          : finalMatch.homeTeam?.name || null;
    }
  } else if (
    (competition.type === CompetitionType.LEAGUE ||
      competition.type === CompetitionType.GROUP_STAGE) &&
    competition.status === CompetitionStatus.COMPLETED &&
    standings.length > 0
  ) {
    champion = standings[0].name;
    runnerUp = standings[1]?.name || null;
  }

  const allPlayerStats = await calculatePlayerStats(competitionId);
  const topGoals = allPlayerStats.length > 0 ? allPlayerStats[0].goals : 0;
  const topScorers = allPlayerStats.filter((p) => p.goals === topGoals && topGoals > 0);
  const topScorer =
    topScorers.length > 0
      ? { ...topScorers[0], isShared: topScorers.length > 1 }
      : null;

  const awards = await prisma.competitionAward.findMany({
    where: { competitionId },
    include: {
      player: {
        include: { team: { select: { id: true, name: true, colorPrimary: true } } },
      },
      assignedBy: { select: { id: true, name: true } },
    },
    orderBy: { assignedAt: 'asc' },
  });

  return {
    totalMatches: statsMatches.length,
    completedMatches: completedMatches.length,
    totalGoals: completedMatches.reduce(
      (sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0),
      0
    ),
    champion,
    runnerUp,
    topOffense,
    topDefense,
    mostWins,
    mostLosses,
    bestGD,
    worstGD,
    highestScoringMatch,
    allTeamStats: standings,
    topScorer,
    allPlayerStats,
    awards,
  };
};
