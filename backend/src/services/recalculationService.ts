import { prisma } from '../config/prisma';

export const updateMatchScoreAndRecalculate = async (
  matchId: string,
  homeScore: number | null,
  awayScore: number | null,
  coordinatorId: string
) => {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { competition: true },
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.competition.coordinatorId !== coordinatorId) {
    throw new Error('Forbidden: You do not own this competition');
  }

  if (!match.homeTeamId || !match.awayTeamId) {
    throw new Error('Cannot set score for match without assigned teams');
  }

  // If score is null or undefined, clear match score
  if (homeScore === null || awayScore === null || homeScore === undefined || awayScore === undefined) {
    await prisma.match.update({
      where: { id: matchId },
      data: {
        homeScore: null,
        awayScore: null,
        status: 'SCHEDULED',
        winnerId: null,
      },
    });

    if (match.competition.type === 'TOURNAMENT') {
      await propagateKnockoutChanges(match.competitionId);
    } else {
      await updateLeagueStatus(match.competitionId);
    }

    return { message: 'Match score cleared successfully' };
  }

  // Determine winner
  let winnerId: string | null = null;
  if (homeScore > awayScore) {
    winnerId = match.homeTeamId;
  } else if (awayScore > homeScore) {
    winnerId = match.awayTeamId;
  } else {
    // In knockout, if draw, default winner to home team (or coordinator decision)
    winnerId = match.competition.type === 'TOURNAMENT' ? match.homeTeamId : null;
  }

  // Update current match
  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
      status: 'COMPLETED',
      winnerId,
    },
  });

  // Trigger cascade recalculations based on competition type
  if (match.competition.type === 'TOURNAMENT') {
    await propagateKnockoutChanges(match.competitionId);
  } else {
    await updateLeagueStatus(match.competitionId);
  }

  return { message: 'Match score updated and competition recalculated' };
};

// Helper: Propagate knockout winners iteratively up the binary tree
const propagateKnockoutChanges = async (competitionId: string) => {
  const matches = await prisma.match.findMany({
    where: { competitionId },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  const maxRound = Math.max(...matches.map((m) => m.round));

  // Round by round propagation from Round 1 up to maxRound
  for (let r = 1; r < maxRound; r++) {
    const roundMatches = matches.filter((m) => m.round === r);
    for (const m of roundMatches) {
      if (m.nextMatchId && m.nextMatchSlot) {
        const parentMatch = matches.find((pm) => pm.id === m.nextMatchId);
        if (parentMatch) {
          const winnerIdToSet = m.status === 'COMPLETED' ? m.winnerId : null;
          const dataToUpdate: any = {};
          if (m.nextMatchSlot === 'HOME') {
            if (parentMatch.homeTeamId !== winnerIdToSet) {
              dataToUpdate.homeTeamId = winnerIdToSet;
              // If team changed, clear parent score & winner
              dataToUpdate.homeScore = null;
              dataToUpdate.awayScore = null;
              dataToUpdate.status = 'SCHEDULED';
              dataToUpdate.winnerId = null;
            }
          } else {
            if (parentMatch.awayTeamId !== winnerIdToSet) {
              dataToUpdate.awayTeamId = winnerIdToSet;
              dataToUpdate.homeScore = null;
              dataToUpdate.awayScore = null;
              dataToUpdate.status = 'SCHEDULED';
              dataToUpdate.winnerId = null;
            }
          }

          if (Object.keys(dataToUpdate).length > 0) {
            await prisma.match.update({
              where: { id: parentMatch.id },
              data: dataToUpdate,
            });

            // Update in-memory parent match object for further rounds
            Object.assign(parentMatch, dataToUpdate);
          }
        }
      }
    }
  }

  // Check if Final match is COMPLETED
  const finalMatch = matches.find((m) => m.round === maxRound);
  if (finalMatch && finalMatch.status === 'COMPLETED' && finalMatch.winnerId) {
    await prisma.competition.update({
      where: { id: competitionId },
      data: { status: 'COMPLETED' },
    });
  } else {
    await prisma.competition.update({
      where: { id: competitionId },
      data: { status: 'IN_PROGRESS' },
    });
  }
};

// Helper: Check if all league matches complete
const updateLeagueStatus = async (competitionId: string) => {
  const matches = await prisma.match.findMany({
    where: { competitionId },
  });

  if (matches.length > 0 && matches.every((m) => m.status === 'COMPLETED')) {
    await prisma.competition.update({
      where: { id: competitionId },
      data: { status: 'COMPLETED' },
    });
  } else if (matches.length > 0) {
    await prisma.competition.update({
      where: { id: competitionId },
      data: { status: 'IN_PROGRESS' },
    });
  }
};

// Calculate Standings Table (for League)
export const calculateLeagueStandings = async (competitionId: string) => {
  const teams = await prisma.team.findMany({
    where: { competitionId },
  });

  const matches = await prisma.match.findMany({
    where: { competitionId, status: 'COMPLETED' },
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

        if (m.homeScore > m.awayScore) {
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

  // Calculate goal difference & array conversion
  const standings = Object.values(statsMap).map((s) => ({
    ...s,
    goalDifference: s.goalsFor - s.goalsAgainst,
  }));

  // Sort: Points DESC -> GD DESC -> GF DESC -> Name ASC
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.name.localeCompare(b.name);
  });

  return standings;
};

// Calculate Overall Statistics
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

  if (!competition) {
    throw new Error('Competition not found');
  }

  const completedMatches = competition.matches.filter((m) => m.status === 'COMPLETED');
  const standings = await calculateLeagueStandings(competitionId);

  // Highest scoring match
  let highestScoringMatch: any = null;
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

  // Top offense, defense, etc from standings
  const topOffense = [...standings].sort((a, b) => b.goalsFor - a.goalsFor)[0] || null;
  const topDefense = [...standings].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0] || null;
  const mostWins = [...standings].sort((a, b) => b.won - a.won)[0] || null;
  const mostLosses = [...standings].sort((a, b) => b.lost - a.lost)[0] || null;
  const bestGD = [...standings].sort((a, b) => b.goalDifference - a.goalDifference)[0] || null;
  const worstGD = [...standings].sort((a, b) => a.goalDifference - b.goalDifference)[0] || null;

  // Champion & Runner-up for Knockout
  let champion: string | null = null;
  let runnerUp: string | null = null;

  if (competition.type === 'TOURNAMENT') {
    const maxRound = Math.max(...competition.matches.map((m) => m.round), 0);
    const finalMatch = competition.matches.find((m) => m.round === maxRound);
    if (finalMatch && finalMatch.status === 'COMPLETED' && finalMatch.winnerId) {
      champion = finalMatch.winner?.name || null;
      runnerUp =
        finalMatch.winnerId === finalMatch.homeTeamId
          ? finalMatch.awayTeam?.name || null
          : finalMatch.homeTeam?.name || null;
    }
  } else if (competition.status === 'COMPLETED' && standings.length > 0) {
    champion = standings[0].name;
    runnerUp = standings[1]?.name || null;
  }

  return {
    totalMatches: competition.matches.length,
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
  };
};
