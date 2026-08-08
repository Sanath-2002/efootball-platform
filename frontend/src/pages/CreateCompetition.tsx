import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type CompetitionTypeOption =
  | 'TOURNAMENT'
  | 'LEAGUE'
  | 'GROUP_STAGE'
  | 'GROUP_KNOCKOUT';

export const CreateCompetition: React.FC = () => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<CompetitionTypeOption>('TOURNAMENT');
  const [format, setFormat] = useState<'BO1' | 'BO3'>('BO1');
  const [groupCount, setGroupCount] = useState<2 | 4 | 8>(4);
  const [advancementPerGroup, setAdvancementPerGroup] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const isGroupFormat = type === 'GROUP_STAGE' || type === 'GROUP_KNOCKOUT';

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-3 font-sans">
        <h2 className="text-lg font-bold text-slate-900">Authentication Required</h2>
        <p className="text-xs text-slate-500">You must be signed in to create and manage competitions.</p>
        <Link
          to="/login"
          className="inline-block px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded hover:bg-slate-800 transition-colors"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a competition title');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: Record<string, unknown> = { name: name.trim(), type, format };
      if (isGroupFormat) {
        payload.groupCount = groupCount;
        if (type === 'GROUP_KNOCKOUT') {
          payload.advancementPerGroup = advancementPerGroup;
        }
      }

      const res = await api.post('/competitions', payload);
      navigate(`/competitions/${res.data.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      console.error('Create competition error:', err);
      setError(e.response?.data?.error || 'Failed to create competition. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  const formatCards: { id: CompetitionTypeOption; title: string; desc: string }[] = [
    { id: 'TOURNAMENT', title: 'Knockout Tournament', desc: 'Single elimination with BYE math' },
    { id: 'LEAGUE', title: 'Round-Robin League', desc: 'All play all with live points table' },
    { id: 'GROUP_STAGE', title: 'Group Stage', desc: 'Round-robin within groups; winner by standings' },
    {
      id: 'GROUP_KNOCKOUT',
      title: 'Group + Knockout',
      desc: 'Groups then top teams advance to bracket',
    },
  ];

  return (
    <div className="max-w-lg mx-auto py-6 font-sans">
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Create Competition</h1>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Competition Title
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. eFootball Champions League 2026"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Format Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {formatCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setType(card.id)}
                  className={`p-3 rounded border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                    type === card.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <h4 className="font-bold text-xs">{card.title}</h4>
                  <p
                    className={`text-[10px] leading-tight ${
                      type === card.id ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {card.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {isGroupFormat && (
            <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Number of Groups
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([2, 4, 8] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setGroupCount(n)}
                      className={`py-1.5 px-2 rounded border text-center font-bold text-xs transition-colors cursor-pointer ${
                        groupCount === n
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {n} Groups
                    </button>
                  ))}
                </div>
              </div>

              {type === 'GROUP_KNOCKOUT' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teams Advancing per Group
                  </label>
                  <select
                    value={advancementPerGroup}
                    onChange={(e) => setAdvancementPerGroup(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs"
                  >
                    <option value={1}>Top 1</option>
                    <option value={2}>Top 2</option>
                    <option value={3}>Top 3</option>
                    <option value={4}>Top 4</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Match Length
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('BO1')}
                className={`py-1.5 px-2 rounded border text-center font-bold text-xs transition-colors cursor-pointer ${
                  format === 'BO1'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Single Match (BO1)
              </button>
              <button
                type="button"
                onClick={() => setFormat('BO3')}
                className={`py-1.5 px-2 rounded border text-center font-bold text-xs transition-colors cursor-pointer ${
                  format === 'BO3'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Best of 3 (BO3)
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Creating...' : 'Create Competition'}
          </button>
        </form>
      </div>
    </div>
  );
};
