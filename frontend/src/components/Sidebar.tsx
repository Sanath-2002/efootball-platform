import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    {
      label: 'Competitions Overview',
      path: '/dashboard',
    },
    {
      label: 'Create Competition',
      path: '/competitions/new',
    }
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-60 bg-white border-r border-slate-200 z-50 flex flex-col transition-transform duration-150 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="w-7 h-7 rounded bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
              eFB
            </span>
            <span className="font-bold text-slate-900 text-sm tracking-tight">eFootball Manager</span>
          </NavLink>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-500 hover:text-slate-900 text-xs font-mono font-bold"
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-2 mb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Workspace
          </div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`block px-3 py-2 rounded text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </aside>
    </>
  );
};
