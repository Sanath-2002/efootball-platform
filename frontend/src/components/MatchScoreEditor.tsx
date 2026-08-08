import React, { useState, useEffect, useMemo } from 'react';
import type {
  Match,
  MatchGameInput,
  UpdateScorePayload,
  Player,
  MatchGoalInput,
} from '../services/api';

interface MatchScoreEditorProps {
  match: Match;
  format: 'BO1' | 'BO3';
  compact?: boolean;
  onSave: (matchId: string, payload: UpdateScorePayload) => Promise<void>;
  onCancel: () => void;
}

interface GoalSlot {
  playerId: string;
  isOwnGoal: boolean;
  gameNumber?: number;
}

const buildSlotsFromMatch = (
  match: Match,
  side: 'home' | 'away',
  count: number
): GoalSlot[] => {
  const homeId = match.homeTeamId;
  const existing = (match.goals ?? []).filter((g) => {
    if (side === 'home') return g.teamId === homeId;
    return g.teamId === match.awayTeamId;
  });

  const slots: GoalSlot[] = existing.map((g) => ({
    playerId: g.playerId,
    isOwnGoal: g.isOwnGoal,
    gameNumber: g.gameNumber ?? undefined,
  }));

  while (slots.length < count) {
    slots.push({ playerId: '', isOwnGoal: false });
  }
  return slots.slice(0, count);
};

const GoalScorersSection: React.FC<{
  match: Match;
  homeScore: number;
  awayScore: number;
  homeSlots: GoalSlot[];
  awaySlots: GoalSlot[];
  onHomeSlotsChange: (slots: GoalSlot[]) => void;
  onAwaySlotsChange: (slots: GoalSlot[]) => void;
  lineupOpen: boolean;
  onLineupOpenChange: (open: boolean) => void;
  lineupPlayerIds: Set<string>;
  onLineupToggle: (playerId: string) => void;
}> = ({
  match,
  homeScore,
  awayScore,
  homeSlots,
  awaySlots,
  onHomeSlotsChange,
  onAwaySlotsChange,
  lineupOpen,
  onLineupOpenChange,
  lineupPlayerIds,
  onLineupToggle,
}) => {
  const homePlayers = match.homeTeam?.players ?? [];
  const awayPlayers = match.awayTeam?.players ?? [];
  const hasRosters = homePlayers.length > 0 || awayPlayers.length > 0;

  if (!hasRosters || (homeScore === 0 && awayScore === 0)) return null;

  const renderSlots = (
    label: string,
    slots: GoalSlot[],
    onChange: (slots: GoalSlot[]) => void,
    ownTeamPlayers: Player[],
    otherTeamPlayers: Player[]
  ) => {
    if (slots.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
        {slots.map((slot, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400 w-4">{idx + 1}.</span>
            <select
              value={slot.playerId}
              onChange={(e) => {
                const next = [...slots];
                next[idx] = { ...next[idx], playerId: e.target.value };
                onChange(next);
              }}
              className="flex-1 text-[10px] border border-slate-300 rounded px-1 py-0.5 bg-white"
            >
              <option value="">Select scorer</option>
              {(slot.isOwnGoal ? otherTeamPlayers : ownTeamPlayers).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ''}
                  {p.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-0.5 text-[9px] text-slate-500 whitespace-nowrap">
              <input
                type="checkbox"
                checked={slot.isOwnGoal}
                onChange={(e) => {
                  const next = [...slots];
                  next[idx] = { playerId: '', isOwnGoal: e.target.checked };
                  onChange(next);
                }}
              />
              OG
            </label>
          </div>
        ))}
      </div>
    );
  };

  const allPlayers = [...homePlayers, ...awayPlayers];

  return (
    <div className="mt-2 pt-2 border-t border-slate-200 space-y-2">
      <p className="text-[10px] font-bold text-slate-600">Goal scorers (optional)</p>
      {renderSlots(
        `${match.homeTeam?.name ?? 'Home'} goals`,
        homeSlots,
        onHomeSlotsChange,
        homePlayers,
        awayPlayers
      )}
      {renderSlots(
        `${match.awayTeam?.name ?? 'Away'} goals`,
        awaySlots,
        onAwaySlotsChange,
        awayPlayers,
        homePlayers
      )}
      <button
        type="button"
        onClick={() => onLineupOpenChange(!lineupOpen)}
        className="text-[10px] text-slate-600 underline"
      >
        {lineupOpen ? 'Hide lineup' : 'Track lineup / appearances'}
      </button>
      {lineupOpen && allPlayers.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {allPlayers.map((p) => (
            <label key={p.id} className="flex items-center gap-1 text-[10px]">
              <input
                type="checkbox"
                checked={lineupPlayerIds.has(p.id)}
                onChange={() => onLineupToggle(p.id)}
              />
              <span className="truncate">{p.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export const MatchScoreEditor: React.FC<MatchScoreEditorProps> = ({
  match,
  format,
  compact = false,
  onSave,
  onCancel,
}) => {
  const isKnockout = match.stage === 'KNOCKOUT';
  const [homeInput, setHomeInput] = useState(
    match.homeScore !== null ? String(match.homeScore) : ''
  );
  const [awayInput, setAwayInput] = useState(
    match.awayScore !== null ? String(match.awayScore) : ''
  );
  const [homePenalties, setHomePenalties] = useState(
    match.homePenalties !== null && match.homePenalties !== undefined
      ? String(match.homePenalties)
      : ''
  );
  const [awayPenalties, setAwayPenalties] = useState(
    match.awayPenalties !== null && match.awayPenalties !== undefined
      ? String(match.awayPenalties)
      : ''
  );
  const [games, setGames] = useState<MatchGameInput[]>(
    match.games?.length
      ? match.games.map((g) => ({
          gameNumber: g.gameNumber,
          homeScore: g.homeScore,
          awayScore: g.awayScore,
          homePenalties: g.homePenalties,
          awayPenalties: g.awayPenalties,
        }))
      : [{ gameNumber: 1, homeScore: 0, awayScore: 0 }]
  );
  const [homeSlots, setHomeSlots] = useState<GoalSlot[]>(() =>
    buildSlotsFromMatch(match, 'home', match.homeScore ?? 0)
  );
  const [awaySlots, setAwaySlots] = useState<GoalSlot[]>(() =>
    buildSlotsFromMatch(match, 'away', match.awayScore ?? 0)
  );
  const [lineupOpen, setLineupOpen] = useState(false);
  const [lineupPlayerIds, setLineupPlayerIds] = useState<Set<string>>(
    () => new Set((match.appearances ?? []).map((a) => a.playerId))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedHomeScore = useMemo(() => {
    if (format === 'BO3') return games.reduce((s, g) => s + g.homeScore, 0);
    return homeInput === '' ? 0 : Number(homeInput);
  }, [format, games, homeInput]);

  const resolvedAwayScore = useMemo(() => {
    if (format === 'BO3') return games.reduce((s, g) => s + g.awayScore, 0);
    return awayInput === '' ? 0 : Number(awayInput);
  }, [format, games, awayInput]);

  useEffect(() => {
    setHomeSlots((prev) => {
      const next = [...prev];
      while (next.length < resolvedHomeScore) next.push({ playerId: '', isOwnGoal: false });
      return next.slice(0, resolvedHomeScore);
    });
  }, [resolvedHomeScore]);

  useEffect(() => {
    setAwaySlots((prev) => {
      const next = [...prev];
      while (next.length < resolvedAwayScore) next.push({ playerId: '', isOwnGoal: false });
      return next.slice(0, resolvedAwayScore);
    });
  }, [resolvedAwayScore]);

  const levelTie =
    homeInput !== '' &&
    awayInput !== '' &&
    Number(homeInput) === Number(awayInput) &&
    isKnockout;

  const buildGoalsPayload = (): MatchGoalInput[] | undefined => {
    const all = [
      ...homeSlots.filter((s) => s.playerId),
      ...awaySlots.filter((s) => s.playerId),
    ];
    if (all.length === 0) return undefined;
    return all.map((s) => ({
      playerId: s.playerId,
      isOwnGoal: s.isOwnGoal,
      gameNumber: s.gameNumber,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: UpdateScorePayload = {
        homeScore: homeInput === '' ? null : Number(homeInput),
        awayScore: awayInput === '' ? null : Number(awayInput),
      };

      if (format === 'BO3') {
        payload.games = games;
        payload.homeScore = games.reduce((s, g) => s + g.homeScore, 0);
        payload.awayScore = games.reduce((s, g) => s + g.awayScore, 0);
      } else if (levelTie) {
        payload.homePenalties = homePenalties === '' ? null : Number(homePenalties);
        payload.awayPenalties = awayPenalties === '' ? null : Number(awayPenalties);
      }

      const goals = buildGoalsPayload();
      if (goals) payload.goals = goals;
      if (lineupPlayerIds.size > 0) {
        payload.appearances = [...lineupPlayerIds].map((playerId) => ({ playerId }));
      }

      await onSave(match.id, payload);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setError(msg || 'Failed to save score');
    } finally {
      setSaving(false);
    }
  };

  const updateGame = (index: number, field: keyof MatchGameInput, value: string) => {
    setGames((prev) => {
      const next = [...prev];
      const num = value === '' ? 0 : Number(value);
      next[index] = {
        ...next[index],
        [field]: field.includes('Penalties') ? (value === '' ? null : num) : num,
      };
      return next;
    });
  };

  const addGame = () => {
    if (games.length >= 3) return;
    setGames((prev) => [...prev, { gameNumber: prev.length + 1, homeScore: 0, awayScore: 0 }]);
  };

  const goalSection = (
    <GoalScorersSection
      match={match}
      homeScore={resolvedHomeScore}
      awayScore={resolvedAwayScore}
      homeSlots={homeSlots}
      awaySlots={awaySlots}
      onHomeSlotsChange={setHomeSlots}
      onAwaySlotsChange={setAwaySlots}
      lineupOpen={lineupOpen}
      onLineupOpenChange={setLineupOpen}
      lineupPlayerIds={lineupPlayerIds}
      onLineupToggle={(playerId) => {
        setLineupPlayerIds((prev) => {
          const next = new Set(prev);
          if (next.has(playerId)) next.delete(playerId);
          else next.add(playerId);
          return next;
        });
      }}
    />
  );

  const actionButtons = (
    <div className="flex gap-1">
      <button
        disabled={saving}
        onClick={handleSave}
        className="px-2.5 py-1 text-xs font-bold bg-slate-900 text-white rounded disabled:opacity-50"
      >
        Save
      </button>
      <button onClick={onCancel} className="px-2 py-1 text-xs text-slate-500">
        Cancel
      </button>
    </div>
  );

  if (format === 'BO3') {
    return (
      <div className={`space-y-2 ${compact ? '' : 'p-2 bg-slate-50 rounded border border-slate-200'}`}>
        {games.map((game, idx) => (
          <div key={game.gameNumber} className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-mono w-12">Leg {game.gameNumber}</span>
            <input
              type="number"
              min="0"
              value={game.homeScore}
              onChange={(e) => updateGame(idx, 'homeScore', e.target.value)}
              className="w-10 px-1 py-0.5 border border-slate-300 rounded text-center font-mono"
            />
            <span>:</span>
            <input
              type="number"
              min="0"
              value={game.awayScore}
              onChange={(e) => updateGame(idx, 'awayScore', e.target.value)}
              className="w-10 px-1 py-0.5 border border-slate-300 rounded text-center font-mono"
            />
            {isKnockout &&
              game.homeScore === game.awayScore &&
              game.homeScore > 0 && (
                <>
                  <span className="text-slate-400 text-[10px]">PEN</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="H"
                    value={game.homePenalties ?? ''}
                    onChange={(e) => updateGame(idx, 'homePenalties', e.target.value)}
                    className="w-8 px-1 py-0.5 border border-slate-300 rounded text-center font-mono text-[10px]"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="A"
                    value={game.awayPenalties ?? ''}
                    onChange={(e) => updateGame(idx, 'awayPenalties', e.target.value)}
                    className="w-8 px-1 py-0.5 border border-slate-300 rounded text-center font-mono text-[10px]"
                  />
                </>
              )}
          </div>
        ))}
        {games.length < 3 && (
          <button type="button" onClick={addGame} className="text-[10px] text-slate-600 underline">
            + Add leg
          </button>
        )}
        {goalSection}
        {error && <p className="text-[10px] text-rose-600">{error}</p>}
        {actionButtons}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${compact ? '' : ''}`}>
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded border border-slate-200">
        <input
          type="number"
          min="0"
          value={homeInput}
          onChange={(e) => setHomeInput(e.target.value)}
          placeholder="H"
          className="w-10 px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-mono"
        />
        <span className="text-slate-400 font-bold text-xs">:</span>
        <input
          type="number"
          min="0"
          value={awayInput}
          onChange={(e) => setAwayInput(e.target.value)}
          placeholder="A"
          className="w-10 px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-mono"
        />
        {levelTie && (
          <>
            <span className="text-[10px] text-slate-500 ml-1">PEN</span>
            <input
              type="number"
              min="0"
              value={homePenalties}
              onChange={(e) => setHomePenalties(e.target.value)}
              placeholder="H"
              className="w-8 px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-mono"
            />
            <input
              type="number"
              min="0"
              value={awayPenalties}
              onChange={(e) => setAwayPenalties(e.target.value)}
              placeholder="A"
              className="w-8 px-1 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-mono"
            />
          </>
        )}
        {!compact && actionButtons}
      </div>
      {goalSection}
      {compact && actionButtons}
      {error && <p className="text-[10px] text-rose-600">{error}</p>}
    </div>
  );
};
