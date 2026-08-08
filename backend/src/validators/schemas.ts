import { z } from 'zod';
import { ASSIGNABLE_PERMISSIONS } from '../lib/permissions';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createCompetitionSchema = z
  .object({
    name: z.string().min(1).max(200),
    type: z.enum(['TOURNAMENT', 'LEAGUE', 'GROUP_STAGE', 'GROUP_KNOCKOUT']),
    format: z.enum(['BO1', 'BO3']).optional(),
    description: z.string().max(2000).optional(),
    groupCount: z.number().int().min(2).max(8).optional(),
    advancementPerGroup: z.number().int().min(1).max(4).optional(),
  })
  .superRefine((data, ctx) => {
    const isGroupFormat = data.type === 'GROUP_STAGE' || data.type === 'GROUP_KNOCKOUT';
    if (isGroupFormat) {
      if (!data.groupCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'groupCount is required for group formats',
          path: ['groupCount'],
        });
      } else if (![2, 4, 8].includes(data.groupCount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'groupCount must be 2, 4, or 8',
          path: ['groupCount'],
        });
      }
    }
  });

export const updateCompetitionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  format: z.enum(['BO1', 'BO3']).optional(),
  description: z.string().max(2000).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  shortName: z.string().max(10).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  colorPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  coachName: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateTeamSchema = createTeamSchema.partial();

export const createPlayerSchema = z.object({
  name: z.string().min(1).max(100),
  gamerTag: z.string().max(50).optional().nullable(),
  platform: z.enum(['PS5', 'XBOX', 'STEAM', 'MOBILE', 'OTHER']).optional().nullable(),
  jerseyNumber: z.number().int().min(1).max(99).optional().nullable(),
  position: z.string().max(50).optional().nullable(),
  preferredClub: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updatePlayerSchema = createPlayerSchema.partial();

export const reorderPlayersSchema = z.object({
  playerIds: z.array(z.string().uuid()).min(1),
});

export const transferPlayerSchema = z.object({
  toTeamId: z.string().uuid(),
  notes: z.string().max(500).optional().nullable(),
});

export const updateScoreSchema = z.object({
  homeScore: z.union([z.number().int().min(0), z.null()]).optional(),
  awayScore: z.union([z.number().int().min(0), z.null()]).optional(),
  homePenalties: z.union([z.number().int().min(0), z.null()]).optional(),
  awayPenalties: z.union([z.number().int().min(0), z.null()]).optional(),
  games: z
    .array(
      z.object({
        gameNumber: z.number().int().min(1).max(3),
        homeScore: z.number().int().min(0),
        awayScore: z.number().int().min(0),
        homePenalties: z.union([z.number().int().min(0), z.null()]).optional(),
        awayPenalties: z.union([z.number().int().min(0), z.null()]).optional(),
      })
    )
    .optional(),
  goals: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        gameNumber: z.number().int().min(1).max(3).optional(),
        isOwnGoal: z.boolean().optional(),
        minute: z.number().int().min(0).max(120).optional(),
      })
    )
    .optional(),
  appearances: z
    .array(z.object({ playerId: z.string().uuid() }))
    .optional(),
});

export const createAwardSchema = z
  .object({
    playerId: z.string().uuid(),
    awardType: z.enum(['MVP', 'BEST_GOALKEEPER', 'FAIR_PLAY', 'CUSTOM']),
    label: z.string().min(1).max(100).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.awardType === 'CUSTOM' && !data.label?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'label is required for CUSTOM awards',
        path: ['label'],
      });
    }
  });

export const updateAwardSchema = z.object({
  playerId: z.string().uuid().optional(),
  label: z.string().min(1).max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const updateMatchStatusSchema = z.object({
  status: z.enum(['SCHEDULED', 'POSTPONED', 'CANCELLED', 'WALKOVER']),
  statusNote: z.string().max(500).optional().nullable(),
  winnerTeamId: z.string().uuid().optional().nullable(),
});

export const updateMatchDetailsSchema = z.object({
  scheduledAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
});

export const createMatchSchema = z.object({
  round: z.number().int().min(1),
  matchNumber: z.number().int().min(1),
  stage: z.enum(['KNOCKOUT', 'LEAGUE', 'GROUP']),
  groupId: z.string().uuid().optional().nullable(),
  homeTeamId: z.string().uuid().optional().nullable(),
  awayTeamId: z.string().uuid().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateFixtureSchema = z.object({
  round: z.number().int().min(1).optional(),
  matchNumber: z.number().int().min(1).optional(),
  stage: z.enum(['KNOCKOUT', 'LEAGUE', 'GROUP']).optional(),
  groupId: z.string().uuid().optional().nullable(),
  homeTeamId: z.string().uuid().optional().nullable(),
  awayTeamId: z.string().uuid().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  permissions: z
    .array(z.enum(ASSIGNABLE_PERMISSIONS as [string, ...string[]]))
    .default([]),
});

export const updateMemberSchema = z.object({
  permissions: z.array(z.enum(ASSIGNABLE_PERMISSIONS as [string, ...string[]])),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  pinned: z.boolean().optional(),
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  pinned: z.boolean().optional(),
});

export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx', 'pdf', 'png', 'jpeg']).default('csv'),
  theme: z
    .enum(['efootball_yellow', 'ucl_blue', 'premier_purple', 'laliga_dark', 'custom'])
    .optional(),
  size: z
    .enum(['a4', 'a3', 'social_1080x1350', 'story_1080x1920', 'hd_1920x1080', 'uhd_4k'])
    .optional(),
  matchId: z.string().uuid().optional(),
  round: z.coerce.number().int().min(1).optional(),
  zones: z.string().max(50).optional(),
});
