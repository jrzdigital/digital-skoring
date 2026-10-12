import React, { useState, useEffect } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { UserRole } from '../../types/silat';
import { IpsiLogo, PersilatLogo } from '../shared/IpsiLogo';
import { toggleFullscreen, isFullscreenActive } from '../../utils/fullscreen';
import {
  Tv,
  ShieldAlert,
  UserCheck,
  ClipboardList,
  Volume2,
  VolumeX,
  ExternalLink,
  Flame,
  Radio,
  Lock,
  Unlock,
  Home,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentRole,
    setCurrentRole,
    isMuted,
    toggleMute,
    matchStatus,
    currentRound,
    timerSeconds,
    matchInfo,
    gapRuleTriggered,
    isJudgesLocked,
    setIsJudgesLocked,
  } = useSilatMatch();

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isFullscreenActive());
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    const active = await toggleFullscreen();
    setIsFullscreen(active);
  };

  const roles: { id: UserRole; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'LANDING',
      label: 'Beranda',
      icon: <Home className="w-4 h-4" />,
      color: 'hover:bg-cyan-900/40 text-cyan-300',
    },
    {
      id: 'SCOREBOARD',
      label: 'Layar TV / Scoreboard',
      icon: <Tv className="w-4 h-4" />,
      color: 'hover:bg-blue-900/40 text-blue-300',
    },
    {
      id: 'DEWAN',
      label: 'Dewan Juri / Wasit',
      icon: <ShieldAlert className="w-4 h-4" />,
      color: 'hover:bg-amber-900/40 text-amber-300',
    },
    {
      id: 'JURI_1',
      label: 'Juri 1',
      icon: <UserCheck className="w-4 h-4" />,
      color: 'hover:bg-emerald-900/40 text-emerald-300',
    },
    {
      id: 'JURI_2',
      label: 'Juri 2',
      icon: <UserCheck className="w-4 h-4" />,
      color: 'hover:bg-emerald-900/40 text-emerald-300',
    },
    {
      id: 'JURI_3',
      label: 'Juri 3',
      icon: <UserCheck className="w-4 h-4" />,
      color: 'hover:bg-emerald-900/40 text-emerald-300',
    },
    {
      id: 'SEKRETARIS',
      label: 'Sekretaris Pertandingan',
      icon: <ClipboardList className="w-4 h-4" />,
      color: 'hover:bg-purple-900/40 text-purple-300',
    },
  ];

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const openInNewWindow = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch {
      // Fallback
    }
  };

  return (
    <header
      id="main-app-header"
      className="no-print sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-3 py-2 sm:px-6 shadow-xl"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        {/* Left Branding & Live Match Pill */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <button
            onClick={() => setCurrentRole('LANDING')}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity text-left cursor-pointer"
            title="Kembali ke Beranda"
          >
            <IpsiLogo size={36} />
            <div className="hidden sm:block">
              <h1 className="text-sm font-black tracking-wider text-zinc-100 uppercase font-display leading-tight">
                PERSILAT / IPSI
              </h1>
              <p className="text-[10px] font-semibold text-amber-400/90 tracking-widest uppercase">
                Digital Scoring System
              </p>
            </div>
          </button>

          {/* Arena & Match Quick Status Pill */}
          <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-700/60 rounded-full px-3 py-1 text-xs">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
              {matchInfo.arena}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="font-mono font-bold text-zinc-200">{matchInfo.partaiNumber}</span>
            <span className="text-zinc-600">|</span>
            <span className="font-semibold text-zinc-300">BABAK {currentRound}</span>
            <span className="text-zinc-600">|</span>
            <span
              className={`font-mono font-bold ${
                matchStatus === 'RUNNING'
                  ? 'text-emerald-400'
                  : matchStatus === 'PAUSED'
                  ? 'text-amber-400'
                  : 'text-zinc-400'
              }`}
            >
              {formatTimer(timerSeconds)}
            </span>
          </div>
        </div>

        {/* Center Role Navigation Bar */}
        <nav id="role-navigation-bar" className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5 scrollbar-none">
          {roles.map((role) => {
            const isActive = currentRole === role.id;
            return (
              <button
                key={role.id}
                id={`nav-role-${role.id.toLowerCase()}`}
                onClick={() => setCurrentRole(role.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-md border border-zinc-600 ring-1 ring-zinc-500/30'
                    : `text-zinc-400 bg-zinc-900/60 border border-zinc-800/80 ${role.color}`
                }`}
              >
                {role.icon}
                <span>{role.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Tools (Mute, Popout, Judges Lock status) */}
        <div className="flex items-center gap-2">
          {gapRuleTriggered && (
            <div
              id="header-gap-alert"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-red-950/80 border border-red-500/80 rounded-full text-red-300 text-[11px] font-bold animate-pulse"
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              GAP RULE (+30)
            </div>
          )}

          <button
            id="btn-toggle-judge-lock"
            onClick={() => setIsJudgesLocked(!isJudgesLocked)}
            title={isJudgesLocked ? 'Panel Juri Terkunci (Klik untuk Buka)' : 'Kunci Panel Juri'}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              isJudgesLocked
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {isJudgesLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
          </button>

          <button
            id="btn-toggle-audio-mute"
            onClick={toggleMute}
            title={isMuted ? 'Aktifkan Suara Arena' : 'Bisukan Suara Arena'}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              isMuted
                ? 'bg-zinc-900 border-zinc-800 text-zinc-500'
                : 'bg-zinc-900 border-zinc-700 text-emerald-400 hover:bg-zinc-800'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            id="btn-navbar-fullscreen"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Keluar Layar Penuh (ESC / F11)' : 'Layar Penuh (F11 / Fullscreen)'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Layar Penuh</span>
          </button>

          <button
            id="btn-open-multiwindow"
            onClick={openInNewWindow}
            title="Buka di Layar/Tab Baru untuk Multi-Screen Setup (TV, Dewan, Juri)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tab Baru</span>
          </button>
        </div>
      </div>
    </header>
  );
};
