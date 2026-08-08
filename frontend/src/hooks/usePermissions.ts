import { useMemo } from 'react';
import type { Permission } from '../lib/permissions';
import { hasPermission } from '../lib/permissions';

export const usePermissions = (viewerPermissions?: Permission[]) => {
  return useMemo(
    () => ({
      permissions: viewerPermissions ?? [],
      can: (permission: Permission) => hasPermission(viewerPermissions, permission),
    }),
    [viewerPermissions]
  );
};
