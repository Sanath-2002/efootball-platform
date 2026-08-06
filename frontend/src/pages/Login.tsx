import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('admin@efootball.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (loginEmail: string, loginPass: string) => {
    setError('');
    setLoading(true);

    try {
      await login(loginEmail, loginPass);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sign in. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  const handleQuickDemoAdmin = () => {
    setEmail('admin@efootball.com');
    setPassword('admin123');
    handleLogin('admin@efootball.com', 'admin123');
  };

  return (
    <div className="max-w-sm mx-auto py-10 px-4 space-y-3 font-sans">
      {/* Quick Demo Admin Banner */}
      <div className="bg-slate-100 border border-slate-200 rounded p-3 flex items-center justify-between gap-2 shadow-xs">
        <div>
          <div className="text-xs font-bold text-slate-900">Default Test Admin</div>
          <div className="text-[10px] text-slate-600 font-mono">admin@efootball.com / admin123</div>
        </div>
        <button
          onClick={handleQuickDemoAdmin}
          disabled={loading}
          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded transition-colors"
        >
          Sign In
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Coordinator Sign In</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Manage competitions, update match scores, and track standings.</p>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@efootball.com"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded text-xs transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Need an account?{' '}
          <Link to="/register" className="text-slate-900 font-bold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};
