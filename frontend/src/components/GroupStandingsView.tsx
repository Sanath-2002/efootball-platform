import React from 'react';
import type { GroupStandingsData } from '../services/api';
import { LeagueTable } from './LeagueTable';

interface GroupStandingsViewProps {
  data: GroupStandingsData;
  highlightQualifiers?: boolean;
  championName?: string | null;
}

export const GroupStandingsView: React.FC<GroupStandingsViewProps> = ({
  data,
  highlightQualifiers = false,
  championName,
}) => {
  if (!data.groups || data.groups.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg border border-slate-200 text-slate-500 text-xs font-medium">
        Group standings will appear after fixtures are generated.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {data.groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{group.name}</h3>
          <LeagueTable
            standings={group.standings ?? []}
            championName={championName}
            qualifiedCount={highlightQualifiers ? data.advancementPerGroup : undefined}
          />
        </div>
      ))}
    </div>
  );
};
