import React from 'react';
import type { Match } from '../services/api';

const STATUS_CONFIG: Record<
  Match['status'],
  { label: string; className: string }
> = {
  SCHEDULED: { label: 'SCHED', className: 'text-slate-400' },
  LIVE: { label: 'LIVE', className: 'text-rose-600' },
  COMPLETED: { label: 'FT', className: 'text-slate-900 font-bold' },
  POSTPONED: { label: 'PPD', className: 'text-amber-700 font-bold' },
  CANCELLED: { label: 'CANC', className: 'text-slate-500' },
  WALKOVER: { label: 'W/O', className: 'text-slate-700 font-bold' },
};

interface MatchStatusBadgeProps {
  status: Match['status'];
  className?: string;
}

export const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({ status, className = '' }) => {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.SCHEDULED;
  return (
    <span className={`uppercase text-[10px] font-mono ${config.className} ${className}`}>
      {config.label}
    </span>
  );
};

export const isResultStatus = (status: Match['status']) =>
  status === 'COMPLETED' || status === 'WALKOVER';
