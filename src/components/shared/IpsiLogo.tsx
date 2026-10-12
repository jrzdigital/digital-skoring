import React from 'react';

export const IpsiLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 48 }) => {
  return (
    <div
      id="ipsi-logo-badge"
      className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-0.5 shadow-lg border border-amber-300/40 ${className}`}
      style={{ width: size, height: size }}
      title="Ikatan Pencak Silat Indonesia (IPSI)"
    >
      <div className="w-full h-full rounded-full bg-zinc-950 flex flex-col items-center justify-center p-1 relative overflow-hidden">
        {/* Decorative inner circle */}
        <div className="absolute inset-0.5 rounded-full border border-amber-500/30" />
        
        {/* Vector Silat Trisula / Garuda Icon */}
        <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-amber-400" aria-label="IPSI Emblem">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="3 2" />
          <path
            d="M50 12 L53 38 L65 30 L56 46 L78 45 L58 56 L72 72 L50 62 L28 72 L42 56 L22 45 L44 46 L35 30 L47 38 Z"
            fill="#fbbf24"
            stroke="#d97706"
            strokeWidth="1.5"
          />
          <circle cx="50" cy="50" r="9" fill="#dc2626" stroke="#fbbf24" strokeWidth="1.5" />
          <path d="M47 48 L50 44 L53 48 L50 54 Z" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
};

export const PersilatLogo: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 48 }) => {
  return (
    <div
      id="persilat-logo-badge"
      className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 p-0.5 shadow-lg border border-blue-400/40 ${className}`}
      style={{ width: size, height: size }}
      title="Persekutuan Pencak Silat Antarabangsa (PERSILAT)"
    >
      <div className="w-full h-full rounded-full bg-zinc-950 flex flex-col items-center justify-center p-1 relative overflow-hidden">
        <div className="absolute inset-0.5 rounded-full border border-blue-400/30" />
        <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-blue-400" aria-label="PERSILAT Emblem">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
          {/* Globe grid */}
          <ellipse cx="50" cy="50" rx="36" ry="18" fill="none" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
          <line x1="50" y1="5" x2="50" y2="95" stroke="#60a5fa" strokeWidth="1.5" opacity="0.6" />
          {/* Central Silat Keris */}
          <path
            d="M50 15 Q54 28 47 38 Q55 48 48 60 L50 78 L52 60 Q45 48 53 38 Q46 28 50 15 Z"
            fill="#f59e0b"
            stroke="#fbbf24"
            strokeWidth="1.5"
          />
          {/* Cross sabers / weapon */}
          <line x1="30" y1="65" x2="70" y2="65" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};
