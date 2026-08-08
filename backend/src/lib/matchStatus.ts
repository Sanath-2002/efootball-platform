import { MatchStatus } from '@prisma/client';
import { badRequest } from './AppError';

export const RESULT_STATUSES: MatchStatus[] = [MatchStatus.COMPLETED, MatchStatus.WALKOVER];
export const TERMINAL_STATUSES: MatchStatus[] = [
  ...RESULT_STATUSES,
  MatchStatus.CANCELLED,
];

export const isResult = (status: MatchStatus): boolean =>
  RESULT_STATUSES.includes(status);

export const isTerminal = (status: MatchStatus): boolean =>
  TERMINAL_STATUSES.includes(status);

/** Statuses allowed via PATCH /matches/:id/status (LIVE excluded). */
export const MANUAL_STATUSES: MatchStatus[] = [
  MatchStatus.SCHEDULED,
  MatchStatus.POSTPONED,
  MatchStatus.CANCELLED,
  MatchStatus.WALKOVER,
];

const ALLOWED_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  [MatchStatus.SCHEDULED]: [
    MatchStatus.COMPLETED,
    MatchStatus.POSTPONED,
    MatchStatus.CANCELLED,
    MatchStatus.WALKOVER,
  ],
  [MatchStatus.POSTPONED]: [
    MatchStatus.SCHEDULED,
    MatchStatus.COMPLETED,
    MatchStatus.CANCELLED,
    MatchStatus.WALKOVER,
  ],
  [MatchStatus.COMPLETED]: [MatchStatus.SCHEDULED],
  [MatchStatus.WALKOVER]: [MatchStatus.SCHEDULED],
  [MatchStatus.CANCELLED]: [],
  [MatchStatus.LIVE]: [],
};

export const assertTransition = (from: MatchStatus, to: MatchStatus): void => {
  if (to === MatchStatus.LIVE) {
    throw badRequest('LIVE status is not supported — enter scores after the match completes');
  }
  if (from === MatchStatus.LIVE) {
    throw badRequest('Cannot transition from LIVE status');
  }
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw badRequest(`Cannot transition match from ${from} to ${to}`);
  }
};
