export const PERMISSIONS = {
  FIXTURES_MANAGE: 'FIXTURES_MANAGE',
  SCORES_UPDATE: 'SCORES_UPDATE',
  TEAMS_MANAGE: 'TEAMS_MANAGE',
  PLAYERS_MANAGE: 'PLAYERS_MANAGE',
  ANNOUNCEMENTS_PUBLISH: 'ANNOUNCEMENTS_PUBLISH',
  REPORTS_VIEW: 'REPORTS_VIEW',
  TOURNAMENT_EDIT: 'TOURNAMENT_EDIT',
  TOURNAMENT_DELETE: 'TOURNAMENT_DELETE',
  COORDINATORS_MANAGE: 'COORDINATORS_MANAGE',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ASSIGNABLE_PERMISSIONS: Permission[] = [
  PERMISSIONS.FIXTURES_MANAGE,
  PERMISSIONS.SCORES_UPDATE,
  PERMISSIONS.TEAMS_MANAGE,
  PERMISSIONS.PLAYERS_MANAGE,
  PERMISSIONS.ANNOUNCEMENTS_PUBLISH,
  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.TOURNAMENT_EDIT,
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  FIXTURES_MANAGE: 'Manage Fixtures',
  SCORES_UPDATE: 'Update Scores',
  TEAMS_MANAGE: 'Manage Teams',
  PLAYERS_MANAGE: 'Manage Players',
  ANNOUNCEMENTS_PUBLISH: 'Publish Announcements',
  REPORTS_VIEW: 'View Reports',
  TOURNAMENT_EDIT: 'Edit Tournament',
  TOURNAMENT_DELETE: 'Delete Tournament',
  COORDINATORS_MANAGE: 'Manage Coordinators',
};

export const hasPermission = (
  viewerPermissions: Permission[] | undefined,
  permission: Permission
): boolean => Boolean(viewerPermissions?.includes(permission));
