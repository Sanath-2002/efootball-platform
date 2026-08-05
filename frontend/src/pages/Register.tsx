import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-10 px-4 font-sans">
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Create Coordinator Account</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Register account</p>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Coordinator Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="coordinator@example.com"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs transition-colors disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register Account'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-slate-900 font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
