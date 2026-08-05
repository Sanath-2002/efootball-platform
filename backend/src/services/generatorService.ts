import { prisma } from '../config/prisma';

export const generateKnockoutBracket = async (competitionId: string) => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: { teams: true },
  });

  if (!competition) {
    throw new Error('Competition not found');
  }

  const teams = competition.teams;
  const N = teams.length;
  if (N < 2) {
    throw new Error('At least 2 teams are required to generate a bracket');
  }

  // Delete any existing matches for this competition
  await prisma.match.deleteMany({ where: { competitionId } });

  // Calculate total rounds R and power of two P
  const R = Math.ceil(Math.log2(N));
  const P = Math.pow(2, R);
  const byesCount = P - N;

  // We will build match slots from Final (Round R) back to Round 1
  // Store created match objects mapped by key "round_matchNum"
  const matchMap: Record<string, any> = {};

  // Step 1: Create all match slots in DB backwards from Final (Round R down to 1)
  for (let r = R; r >= 1; r--) {
    const matchesInRound = Math.pow(2, R - r);
    for (let m = 1; m <= matchesInRound; m++) {
      const match = await prisma.match.create({
        data: {
          competitionId,
          round: r,
          matchNumber: m,
          stage: 'KNOCKOUT',
          status: 'SCHEDULED',
        },
      });
      matchMap[`${r}_${m}`] = match;
    }
  }

  // Step 2: Link child matches to parent matches via nextMatchId and nextMatchSlot
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
    }
  }

  // Step 3: Populate Round 1 with teams and BYEs
  // P slots in Round 1 (each match has 2 slots: HOME and AWAY)
  // Teams 0 to N-1. BYEs count = P - N.
  // Top seeds receive BYEs.
  const round1MatchCount = P / 2;
  const teamList = [...teams];

  // Fill teams into slots: top byesCount seeds receive BYEs
  const slots: (string | null)[] = new Array(P).fill(null);
  let teamIdx = 0;

  // Place BYE matches for top seeds
  for (let b = 0; b < byesCount; b++) {
    slots[b * 2] = teamList[teamIdx++].id;
    slots[b * 2 + 1] = null; // BYE
  }

  // Place remaining teams in consecutive pairs
  for (let i = byesCount * 2; i < P && teamIdx < N; i++) {
    slots[i] = teamList[teamIdx++].id;
  }

  // Distribute slots across Round 1 matches
  for (let m = 1; m <= round1MatchCount; m++) {
    const homeTeamId = slots[(m - 1) * 2];
    const awayTeamId = slots[(m - 1) * 2 + 1];
    const currentMatch = matchMap[`1_${m}`];

    if (homeTeamId && !awayTeamId) {
      // Automatic BYE advancement for Home team
      const updatedMatch = await prisma.match.update({
        where: { id: currentMatch.id },
        data: {
          homeTeamId,
          awayTeamId: null,
          homeScore: 1,
          awayScore: 0,
          status: 'COMPLETED',
          winnerId: homeTeamId,
        },
      });

      // Advance winner to parent match directly
      if (currentMatch.nextMatchId && currentMatch.nextMatchSlot) {
        const dataToUpdate: any = {};
        if (currentMatch.nextMatchSlot === 'HOME') {
          dataToUpdate.homeTeamId = homeTeamId;
        } else {
          dataToUpdate.awayTeamId = homeTeamId;
        }
        await prisma.match.update({
          where: { id: currentMatch.nextMatchId },
          data: dataToUpdate,
        });
      }
    } else if (!homeTeamId && awayTeamId) {
      // Automatic BYE advancement for Away team
      await prisma.match.update({
        where: { id: currentMatch.id },
        data: {
          homeTeamId: null,
          awayTeamId,
          homeScore: 0,
          awayScore: 1,
          status: 'COMPLETED',
          winnerId: awayTeamId,
        },
      });

      if (currentMatch.nextMatchId && currentMatch.nextMatchSlot) {
        const dataToUpdate: any = {};
        if (currentMatch.nextMatchSlot === 'HOME') {
          dataToUpdate.homeTeamId = awayTeamId;
        } else {
          dataToUpdate.awayTeamId = awayTeamId;
        }
        await prisma.match.update({
          where: { id: currentMatch.nextMatchId },
          data: dataToUpdate,
        });
      }
    } else {
      // Normal matchup
      await prisma.match.update({
        where: { id: currentMatch.id },
        data: {
          homeTeamId,
          awayTeamId,
          status: 'SCHEDULED',
        },
      });
    }
  }

  // Update competition status to IN_PROGRESS
  await prisma.competition.update({
    where: { id: competitionId },
    data: { status: 'IN_PROGRESS' },
  });

  return { message: 'Knockout bracket generated successfully' };
};

export const generateRoundRobinFixtures = async (competitionId: string) => {
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: { teams: true },
  });

  if (!competition) {
    throw new Error('Competition not found');
  }

  const teams = competition.teams;
  const N = teams.length;
  if (N < 2) {
    throw new Error('At least 2 teams are required to generate league fixtures');
  }

  // Delete existing matches
  await prisma.match.deleteMany({ where: { competitionId } });

  const teamIds: (string | null)[] = teams.map((t) => t.id);
  if (N % 2 !== 0) {
    teamIds.push(null); // Add dummy BYE team
  }

  const totalTeams = teamIds.length;
  const totalRounds = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;

  let currentList = [...teamIds];

  for (let r = 0; r < totalRounds; r++) {
    const roundNumber = r + 1;
    let matchNum = 1;

    for (let i = 0; i < matchesPerRound; i++) {
      const home = currentList[i];
      const away = currentList[totalTeams - 1 - i];

      if (home !== null && away !== null) {
        // Alternate home/away based on round for balance
        const isFlipped = r % 2 === 1 && i === 0;
        await prisma.match.create({
          data: {
            competitionId,
            round: roundNumber,
            matchNumber: matchNum++,
            stage: 'LEAGUE',
            homeTeamId: isFlipped ? away : home,
            awayTeamId: isFlipped ? home : away,
            status: 'SCHEDULED',
          },
        });
      }
    }

    // Rotate array: keep first element fixed, rotate remaining elements right by 1
    const fixed = currentList[0];
    const rest = currentList.slice(1);
    const last = rest.pop()!;
    currentList = [fixed, last, ...rest];
  }

  // Update competition status to IN_PROGRESS
  await prisma.competition.update({
    where: { id: competitionId },
    data: { status: 'IN_PROGRESS' },
  });

  return { message: 'Round-robin fixtures generated successfully' };
};
