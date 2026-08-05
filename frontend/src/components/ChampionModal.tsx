import React from 'react';
import { KitBadge } from './KitBadge';

interface ChampionModalProps {
  isOpen: boolean;
  onClose: () => void;
  championName: string;
  competitionName: string;
  competitionType: 'TOURNAMENT' | 'LEAGUE';
  runnerUpName?: string | null;
}

export const ChampionModal: React.FC<ChampionModalProps> = ({
  isOpen,
  onClose,
  championName,
  competitionName,
  competitionType,
  runnerUpName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div
        className="bg-white border-2 border-amber-400 rounded-xl p-6 max-w-sm w-full text-center shadow-xl space-y-5 animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Celebration Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-full font-mono text-[10px] font-extrabold uppercase tracking-widest">
            🏆 {competitionType === 'TOURNAMENT' ? 'Tournament Champions' : 'League Champions'}
          </div>
          <p className="text-[11px] text-slate-500 font-mono pt-1 truncate">{competitionName}</p>
        </div>

        {/* Winner Badge & Title */}
        <div className="flex flex-col items-center justify-center space-y-3 py-2">
          <div className="relative">
            <KitBadge name={championName} size="lg" className="w-16 h-16 text-xl shadow-md border-2" />
            <span className="absolute -top-2 -right-2 text-2xl">🏆</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
              {championName}
            </h2>
            <p className="text-xs font-bold text-amber-700 font-mono">
              CONGRATULATIONS ON THE TITLE!
            </p>
          </div>
        </div>

        {/* Runner-Up / Summary Info */}
        {runnerUpName && (
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs flex items-center justify-between font-mono">
            <span className="text-slate-500 font-semibold">Runner-up:</span>
            <span className="font-bold text-slate-900 truncate pl-2">{runnerUpName}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-lg text-xs tracking-wider uppercase transition-colors shadow-xs cursor-pointer"
        >
          View Full Leaderboard 🏆
        </button>
      </div>
    </div>
  );
};
