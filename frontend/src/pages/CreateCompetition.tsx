import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export const CreateCompetition: React.FC = () => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'TOURNAMENT' | 'LEAGUE'>('TOURNAMENT');
  const [format, setFormat] = useState<'BO1' | 'BO3'>('BO1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/competitions', { name: name.trim(), type, format });
      navigate(`/competitions/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create competition.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6 font-sans">
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Create Competition</h1>
        </div>

        {error && (
          <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Competition Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Competition Title
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. eFootball Champions League 2026"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none"
            />
          </div>

          {/* Type Selection */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Format Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('TOURNAMENT')}
                className={`p-3 rounded border text-left flex flex-col justify-between transition-colors ${
                  type === 'TOURNAMENT'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <h4 className="font-bold text-xs">Knockout Tournament</h4>
                <p className="text-[10px] text-slate-400 leading-tight">Single elimination with BYE math</p>
              </button>

              <button
                type="button"
                onClick={() => setType('LEAGUE')}
                className={`p-3 rounded border text-left flex flex-col justify-between transition-colors ${
                  type === 'LEAGUE'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <h4 className="font-bold text-xs">Round-Robin League</h4>
                <p className="text-[10px] text-slate-400 leading-tight">All play all with live points table</p>
              </button>
            </div>
          </div>

          {/* Match Format */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Match Length
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormat('BO1')}
                className={`py-1.5 px-2 rounded border text-center font-bold text-xs transition-colors ${
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
                className={`py-1.5 px-2 rounded border text-center font-bold text-xs transition-colors ${
                  format === 'BO3'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Best of 3 (BO3)
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Competition'}
          </button>
        </form>
      </div>
    </div>
  );
};
