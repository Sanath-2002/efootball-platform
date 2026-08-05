import React from 'react';

interface KitBadgeProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const getTeamInitials = (name: string): string => {
  if (!name) return 'TBD';
  const clean = name.trim().toUpperCase();
  const words = clean.split(/\s+/);
  
  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).slice(0, 3);
  }
  if (words.length === 2) {
    // e.g. Real Madrid -> RMA (R + MA), Manchester City -> MCI (M + CI)
    const w1 = words[0];
    const w2 = words[1];
    if (w2.length >= 2) {
      return (w1[0] + w2.slice(0, 2)).slice(0, 3);
    }
    return (w1.slice(0, 2) + w2[0]).slice(0, 3);
  }
  return clean.slice(0, 3);
};

// Hashes team name to a consistent, classic kit color palette
const getKitColor = (name: string): { bg: string; text: string; border: string } => {
  const colors = [
    { bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-800' }, // Classic Navy/Black
    { bg: 'bg-red-700', text: 'text-white', border: 'border-red-800' },     // Crimson Red
    { bg: 'bg-blue-700', text: 'text-white', border: 'border-blue-800' },   // Royal Blue
    { bg: 'bg-emerald-800', text: 'text-white', border: 'border-emerald-900' }, // Forest Green
    { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-700' }, // Gold/Yellow
    { bg: 'bg-indigo-800', text: 'text-white', border: 'border-indigo-900' }, // Deep Indigo
    { bg: 'bg-cyan-800', text: 'text-white', border: 'border-cyan-900' },    // Sky Blue
    { bg: 'bg-purple-800', text: 'text-white', border: 'border-purple-900' },// Purple
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const KitBadge: React.FC<KitBadgeProps> = ({ name, size = 'md', className = '' }) => {
  const initials = getTeamInitials(name);
  const color = getKitColor(name);

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-7 h-7 text-xs',
    lg: 'w-9 h-9 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-extrabold tracking-tighter rounded border uppercase shrink-0 shadow-xs ${color.bg} ${color.text} ${color.border} ${sizeClasses[size]} ${className}`}
      title={name}
    >
      {initials}
    </span>
  );
};
