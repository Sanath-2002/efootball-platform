import React from 'react';

interface KitBadgeProps {
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  colorPrimary?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const getTeamInitials = (name: string, shortName?: string | null): string => {
  if (shortName?.trim()) return shortName.trim().toUpperCase().slice(0, 3);
  if (!name) return 'TBD';
  const clean = name.trim().toUpperCase();
  const words = clean.split(/\s+/);

  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).slice(0, 3);
  }
  if (words.length === 2) {
    const w1 = words[0];
    const w2 = words[1];
    if (w2.length >= 2) {
      return (w1[0] + w2.slice(0, 2)).slice(0, 3);
    }
    return (w1.slice(0, 2) + w2[0]).slice(0, 3);
  }
  return clean.slice(0, 3);
};

const getKitColor = (name: string): { bg: string; text: string; border: string } => {
  const colors = [
    { bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-800' },
    { bg: 'bg-red-700', text: 'text-white', border: 'border-red-800' },
    { bg: 'bg-blue-700', text: 'text-white', border: 'border-blue-800' },
    { bg: 'bg-emerald-800', text: 'text-white', border: 'border-emerald-900' },
    { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-700' },
    { bg: 'bg-indigo-800', text: 'text-white', border: 'border-indigo-900' },
    { bg: 'bg-cyan-800', text: 'text-white', border: 'border-cyan-900' },
    { bg: 'bg-purple-800', text: 'text-white', border: 'border-purple-900' },
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-7 h-7 text-xs',
  lg: 'w-9 h-9 text-sm',
};

export const KitBadge: React.FC<KitBadgeProps> = ({
  name,
  shortName,
  logoUrl,
  colorPrimary,
  size = 'md',
  className = '',
}) => {
  const initials = getTeamInitials(name, shortName);
  const color = getKitColor(name);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        title={name}
        className={`inline-block rounded border border-slate-200 object-cover shrink-0 shadow-xs ${sizeClasses[size]} ${className}`}
      />
    );
  }

  if (colorPrimary) {
    return (
      <span
        className={`inline-flex items-center justify-center font-mono font-extrabold tracking-tighter rounded border border-black/10 uppercase shrink-0 shadow-xs text-white ${sizeClasses[size]} ${className}`}
        style={{ backgroundColor: colorPrimary }}
        title={name}
      >
        {initials}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-mono font-extrabold tracking-tighter rounded border uppercase shrink-0 shadow-xs ${color.bg} ${color.text} ${color.border} ${sizeClasses[size]} ${className}`}
      title={name}
    >
      {initials}
    </span>
  );
};
