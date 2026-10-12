import React, { useEffect, useState } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { UserRole } from '../../types/silat';
import { toggleFullscreen, isFullscreenActive } from '../../utils/fullscreen';
import {
  ArrowLeft,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Tv,
  ShieldAlert,
  UserCheck,
  ClipboardList,
  Home,
  RefreshCw,
  Info,
  CheckCircle2,
  Share2,
} from 'lucide-react';

interface PanelTopNavProps {
  currentPanelRole: UserRole;
  title: string;
  subtitle?: string;
  badgeColor?: 'amber' | 'purple' | 'emerald' | 'blue' | 'cyan';
  rightChildren?: React.ReactNode;
}

export const PanelTopNav: React.FC<PanelTopNavProps> = ({
  currentPanelRole,
  title,
  subtitle,
  badgeColor = 'amber',
  rightChildren,
}) => {
  const {
    setCurrentRole,
    matchInfo,
    isMuted,
    toggleMute,
    matchStatus,
    isOffline,
    lastSyncTimestamp,
  } = useSilatMatch();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSyncInfo, setShowSyncInfo] = useState(false);

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

  const getBadgeClass = () => {
    switch (badgeColor) {
      case 'purple':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/50';
      case 'emerald':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50';
      case 'blue':
      case 'cyan':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50';
      case 'amber':
      default:
        return 'bg-amber-950/80 text-amber-300 border-amber-500/50';
    }
  };

  return (
    <header className="relative z-20 w-full bg-zinc-900/90 border border-zinc-800/90 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md mb-4 flex flex-col md:flex-row items-center justify-between gap-3">
      {/* Left: Kembali Button + Panel Info */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        {/* Kembali ke Beranda / Menu Utama Button */}
        <button
          id="btn-nav-kembali-beranda"
          onClick={() => setCurrentRole('LANDING')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 hover:text-white text-xs font-bold transition-all duration-200 shadow-md group cursor-pointer"
          title="Kembali ke Beranda / Menu Pemilihan Peran"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
          <span className="font-extrabold tracking-wide">KEMBALI</span>
        </button>

        {/* Panel Title & Subtitle */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getBadgeClass()}`}
            >
              {title}
            </span>
            {matchInfo.partaiNumber && (
              <span className="hidden sm:inline-block text-xs font-mono font-bold text-amber-400">
                {matchInfo.partaiNumber} ({matchInfo.arena})
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-zinc-400 hidden sm:block truncate max-w-md mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Custom Actions + Offline Sync Badge + Sound + Fullscreen */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
        {/* Custom Role Actions passed as children */}
        {rightChildren}

        {/* Offline & Real-Time Sync Indicator Badge */}
        <div className="relative">
          <button
            onClick={() => setShowSyncInfo(!showSyncInfo)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-semibold text-zinc-300 hover:border-zinc-700 transition-colors"
            title="Status Mode Offline & Realtime Sync Antar Layar"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-400">
              100% OFFLINE REALTIME
            </span>
          </button>

          {/* Sync Info Popover */}
          {showSyncInfo && (
            <div className="absolute right-0 top-full mt-2 w-72 p-3.5 rounded-xl bg-zinc-950 border border-zinc-700 shadow-2xl z-50 text-left text-xs text-zinc-300 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Sinkronisasi Offline Aktif
                </span>
                <button
                  onClick={() => setShowSyncInfo(false)}
                  className="text-zinc-400 hover:text-white text-[10px]"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Aplikasi beroperasi secara lokal dan real-time menggunakan <strong>BroadcastChannel & LocalStorage Cache</strong>.
              </p>
              <ul className="mt-2 space-y-1 text-[11px] text-zinc-300">
                <li>• Tidak memerlukan kuota/koneksi internet aktif.</li>
                <li>• Buka tab Dewan, Juri, dan TV di browser perangkat arena yang sama atau satu hotspot lokal.</li>
                <li>• Seluruh skor tersimpan otomatis di memori perangkat.</li>
              </ul>
            </div>
          )}
        </div>

        {/* Audio Mute/Unmute Toggle */}
        <button
          onClick={toggleMute}
          title={isMuted ? 'Nyalakan Audio Arena' : 'Bisukan Audio Arena'}
          className={`p-2 rounded-xl border transition-all text-xs font-bold flex items-center gap-1 ${
            isMuted
              ? 'bg-red-950/60 border-red-800 text-red-400 hover:bg-red-900/60'
              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>

        {/* FULLSCREEN TOGGLE MENU */}
        <button
          id={`btn-fullscreen-${currentPanelRole.toLowerCase()}`}
          onClick={handleToggleFullscreen}
          title={isFullscreen ? 'Keluar dari Layar Penuh (ESC / F11)' : 'Buka Layar Penuh (F11 / Fullscreen)'}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm ${
            isFullscreen
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-1 ring-amber-400/40'
              : 'bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900 hover:to-blue-900 border-cyan-500/50 text-cyan-200'
          }`}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Keluar Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-4 h-4 text-cyan-400" />
              <span className="font-extrabold tracking-wide">FULL SCREEN</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
