import React from 'react';

interface FollowerCountProps {
  count: number;
  className?: string;
}

export const FollowerCount: React.FC<FollowerCountProps> = ({ count, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 ${className}`}
    title="Tournament followers"
  >
    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
    <span className="font-bold tabular-nums">{count}</span>
    <span>{count === 1 ? 'follower' : 'followers'}</span>
  </span>
);
