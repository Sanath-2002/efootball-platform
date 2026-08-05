import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 h-14 flex items-center px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden px-2 py-1 text-slate-700 hover:bg-slate-100 rounded text-xs font-mono font-bold border border-slate-200"
              aria-label="Toggle Menu"
            >
              MENU
            </button>
          )}

          <Link to={user ? "/dashboard" : "/"} className={`flex items-center gap-2 ${user ? 'lg:hidden' : ''}`}>
            <span className="w-7 h-7 rounded bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
              eFB
            </span>
            <span className="font-bold text-slate-900 text-sm tracking-tight">eFootball Manager</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-xs text-right">
                <span className="font-bold text-slate-900 block leading-tight">{user.name}</span>
                <span className="text-[10px] text-slate-500 font-mono leading-tight">{user.email}</span>
              </div>

              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded font-semibold hover:bg-slate-50 transition-colors"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
