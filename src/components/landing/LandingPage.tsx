import React, { useState, useEffect } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { UserRole } from '../../types/silat';
import { toggleFullscreen, isFullscreenActive } from '../../utils/fullscreen';
import {
  ShieldAlert,
  ClipboardList,
  UserCheck,
  Tv,
  MessageCircle,
  RefreshCw,
  Play,
  Layers,
  Sparkles,
  Wifi,
  Monitor,
  Smartphone,
  Laptop,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Info,
  PhoneCall,
  Flame,
  Award,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const {
    setCurrentRole,
    matchInfo,
    matchStatus,
    currentRound,
    timerSeconds,
    blueTotalScore,
    redTotalScore,
    isOffline,
  } = useSilatMatch();

  const [showJudgeModal, setShowJudgeModal] = useState<boolean>(false);
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="relative min-h-[calc(100vh-60px)] w-full bg-[#030612] text-zinc-100 flex flex-col justify-between overflow-x-hidden select-none">
      {/* Dynamic Cyber & Martial Arts Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Hexagonal & Grid Texture */}
        <div 
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
            backgroundSize: '32px 32px, 64px 64px, 64px 64px',
          }}
        />

        {/* Ambient Halos */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-b from-cyan-500/15 via-blue-600/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Background Silat Watermark & Ring Mandala */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] opacity-[0.04] flex items-center justify-center pointer-events-none">
          <svg viewBox="0 0 400 400" className="w-full h-full text-amber-400 animate-spin-slow">
            <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 6" />
            <circle cx="200" cy="200" r="160" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="200" cy="200" r="130" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
            <polygon points="200,20 350,200 200,380 50,200" fill="none" stroke="currentColor" strokeWidth="1" />
            <polygon points="200,50 320,200 200,350 80,200" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
      </div>

      {/* Main Hero Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-12 flex-1 flex flex-col justify-between">
        {/* Hero Title Section */}
        <div className="text-center max-w-4xl mx-auto flex flex-col items-center">
          {/* Angular Tech Capsule Badge */}
          <div className="relative group mb-3 sm:mb-4 inline-flex items-center">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-amber-500 rounded-full blur-xs opacity-75 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative px-6 py-1.5 rounded-full bg-zinc-950/90 border border-cyan-400/40 text-cyan-300 text-xs sm:text-sm font-black tracking-[0.25em] uppercase font-mono shadow-[0_0_20px_rgba(6,182,212,0.35)]">
              DIGITAL SCORING
            </div>
          </div>

          {/* 3D Metallic Stylized Main Title */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black italic tracking-wider uppercase font-display leading-none mb-4 select-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-400 drop-shadow-[0_0_35px_rgba(56,189,248,0.6)]">
              PENCAK{' '}
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-amber-300 to-orange-500 drop-shadow-[0_0_35px_rgba(245,158,11,0.6)]">
              SILAT
            </span>
          </h1>

          {/* Subtitle Description */}
          <p className="text-zinc-300 text-xs sm:text-sm md:text-base font-normal max-w-3xl leading-relaxed tracking-wide px-4 drop-shadow-md">
            Aplikasi digitalisasi penilaian wasit dan dewan juri cabang olahraga beladiri{' '}
            <strong className="text-amber-400 font-semibold">Pencak Silat IPSI</strong> secara professional{' '}
            dengan sinkronisasi instan multi-layar secara offline tingkat turnamen Nasional
          </p>
        </div>

        {/* 4 Feature / Role Selection Cards */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          
          {/* CARD 1: DEWAN */}
          <div
            id="card-landing-dewan"
            onClick={() => setCurrentRole('DEWAN')}
            className="group relative cursor-pointer bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950/95 border border-zinc-700/60 hover:border-amber-500/80 rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_30px_-5px_rgba(245,158,11,0.25)] flex flex-col items-center text-center overflow-hidden"
          >
            {/* Top Glowing Edge */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Custom Shield Emblem: DEWAN */}
            <div className="relative w-36 h-36 mb-4 flex items-center justify-center">
              <DewanShieldBadge />
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-black italic tracking-wide text-zinc-100 uppercase font-display group-hover:text-amber-400 transition-colors mb-2.5">
              DEWAN
            </h2>

            {/* Description */}
            <p className="text-[11px] sm:text-xs font-semibold text-zinc-400 group-hover:text-zinc-300 leading-relaxed uppercase tracking-wider flex-1">
              KELOLA PELANGGARAN, TEGURAN, PERINGATAN, JATUHAN SERTA INSTRUKSI VERIFIKASI PENILAIAN JURI
            </p>

            {/* Enter Button */}
            <div className="mt-5 w-full">
              <button
                id="btn-enter-dewan"
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800/90 group-hover:bg-amber-600 group-hover:text-zinc-950 font-bold text-xs tracking-wider uppercase border border-zinc-700/60 group-hover:border-amber-400 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>Masuk Panel Dewan</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CARD 2: SEKRETARIS */}
          <div
            id="card-landing-sekretaris"
            onClick={() => setCurrentRole('SEKRETARIS')}
            className="group relative cursor-pointer bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950/95 border border-zinc-700/60 hover:border-purple-500/80 rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_30px_-5px_rgba(168,85,247,0.25)] flex flex-col items-center text-center overflow-hidden"
          >
            {/* Top Glowing Edge */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Custom Shield Emblem: SEKRETARIS */}
            <div className="relative w-36 h-36 mb-4 flex items-center justify-center">
              <SekretarisShieldBadge />
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-black italic tracking-wide text-zinc-100 uppercase font-display group-hover:text-purple-400 transition-colors mb-2.5">
              SEKRETARIS
            </h2>

            {/* Description */}
            <p className="text-[11px] sm:text-xs font-semibold text-zinc-400 group-hover:text-zinc-300 leading-relaxed uppercase tracking-wider flex-1">
              ATUR IDENTITAS PESERTA, DURASI RONDE, CETAK PDF HASIL, SERTA AKSELERASI BAGAN TURNAMEN
            </p>

            {/* Enter Button */}
            <div className="mt-5 w-full">
              <button
                id="btn-enter-sekretaris"
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800/90 group-hover:bg-purple-600 group-hover:text-white font-bold text-xs tracking-wider uppercase border border-zinc-700/60 group-hover:border-purple-400 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>Masuk Sekretaris</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CARD 3: JURI */}
          <div
            id="card-landing-juri"
            onClick={() => setShowJudgeModal(true)}
            className="group relative cursor-pointer bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950/95 border border-zinc-700/60 hover:border-emerald-500/80 rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_30px_-5px_rgba(16,185,129,0.25)] flex flex-col items-center text-center overflow-hidden"
          >
            {/* Top Glowing Edge */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Custom Shield Emblem: JURI */}
            <div className="relative w-36 h-36 mb-4 flex items-center justify-center">
              <JuriShieldBadge />
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-black italic tracking-wide text-zinc-100 uppercase font-display group-hover:text-emerald-400 transition-colors mb-2.5">
              JURI
            </h2>

            {/* Description */}
            <p className="text-[11px] sm:text-xs font-semibold text-zinc-400 group-hover:text-zinc-300 leading-relaxed uppercase tracking-wider flex-1">
              BERIKAN PENILAIAN LANGSUNG PUKULAN & TENDANGAN SAAT WAKTU PERTANDINGAN AKTIF
            </p>

            {/* Enter Button */}
            <div className="mt-5 w-full">
              <button
                id="btn-enter-juri"
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800/90 group-hover:bg-emerald-600 group-hover:text-zinc-950 font-bold text-xs tracking-wider uppercase border border-zinc-700/60 group-hover:border-emerald-400 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>Pilih Panel Juri (1, 2, 3)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CARD 4: MONITOR */}
          <div
            id="card-landing-monitor"
            onClick={() => setCurrentRole('SCOREBOARD')}
            className="group relative cursor-pointer bg-gradient-to-b from-zinc-900/90 via-zinc-900/60 to-zinc-950/95 border border-zinc-700/60 hover:border-cyan-500/80 rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_15px_30px_-5px_rgba(6,182,212,0.25)] flex flex-col items-center text-center overflow-hidden"
          >
            {/* Top Glowing Edge */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Custom Shield Emblem: MONITOR */}
            <div className="relative w-36 h-36 mb-4 flex items-center justify-center">
              <MonitorShieldBadge />
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-black italic tracking-wide text-zinc-100 uppercase font-display group-hover:text-cyan-400 transition-colors mb-2.5">
              MONITOR
            </h2>

            {/* Description */}
            <p className="text-[11px] sm:text-xs font-semibold text-zinc-400 group-hover:text-zinc-300 leading-relaxed uppercase tracking-wider flex-1">
              DISPLAY LAYAR UTAMA PENONTON MENAMPILKAN SKOR REAL-TIME AKUMULATIF SECARA MIRRORED & MEGAH
            </p>

            {/* Enter Button */}
            <div className="mt-5 w-full">
              <button
                id="btn-enter-monitor"
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800/90 group-hover:bg-cyan-600 group-hover:text-zinc-950 font-bold text-xs tracking-wider uppercase border border-zinc-700/60 group-hover:border-cyan-400 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md"
              >
                <span>Buka Layar Monitor TV</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
        
        {/* DEVELOPED BY ATTRIBUTION */}
        <div className="w-full text-center mt-4 sm:mt-6 select-none">
          <span className="text-xs font-semibold tracking-wider font-mono text-zinc-400 uppercase">
            developed by : Jaka Oktorian
          </span>
        </div>

        {/* Bottom Control Bar */}
        <div className="mt-10 sm:mt-14 pt-4 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Floating Refresh & Quick Sync Button & Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              id="btn-landing-refresh"
              onClick={handleRefresh}
              title="Sinkronisasi Ulang Sinyal & Data Antar Perangkat"
              className="relative p-3 rounded-full bg-gradient-to-tr from-purple-900/80 to-indigo-600 border border-purple-400/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={() => setShowGuideModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Panduan Multi-Layar</span>
            </button>

            <button
              id="btn-landing-fullscreen"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (F11)'}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Layar Normal</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Layar Penuh</span>
                </>
              )}
            </button>
          </div>

          {/* Central Action Pill: HUBUNGI ADMIN */}
          <button
            id="btn-hubungi-admin"
            onClick={() => setShowContactModal(true)}
            className="group relative px-6 py-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800/90 border border-cyan-500/50 hover:border-cyan-400 text-white text-xs sm:text-sm font-bold tracking-wider uppercase transition-all duration-200 shadow-[0_0_20px_rgba(6,182,212,0.25)] flex items-center gap-2.5 hover:scale-105"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-zinc-950 shadow-sm group-hover:scale-110 transition-transform">
              <MessageCircle className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="text-zinc-100 group-hover:text-cyan-300 font-extrabold tracking-widest">
              HUBUNGI ADMIN
            </span>
          </button>

          {/* System Status / Version Badge */}
          <div className="text-right text-[11px] text-zinc-500 font-mono flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>PERSILAT RULES 2024 • V1.0 PRO</span>
          </div>
        </div>

      </div>

      {/* MODAL 1: SELECT JUROR (Juri 1, 2, 3) */}
      {showJudgeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100 font-display">Pilih Posisi Juri</h3>
                  <p className="text-xs text-zinc-400">Pilih nomor sudut juri untuk perangkat ini</p>
                </div>
              </div>
              <button
                onClick={() => setShowJudgeModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3">
              {(['JURI_1', 'JURI_2', 'JURI_3'] as UserRole[]).map((role, idx) => (
                <button
                  key={role}
                  id={`btn-select-${role.toLowerCase()}`}
                  onClick={() => {
                    setCurrentRole(role);
                    setShowJudgeModal(false);
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-emerald-500/80 hover:bg-emerald-950/20 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-bold text-emerald-400 group-hover:scale-110 transition-transform font-mono">
                      0{idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-200 group-hover:text-emerald-300">
                        {role === 'JURI_1' ? 'Juri 1 (Sudut Kiri Depan)' : role === 'JURI_2' ? 'Juri 2 (Sudut Kanan Depan)' : 'Juri 3 (Sudut Tengah/Belakang)'}
                      </h4>
                      <p className="text-xs text-zinc-400">Panel input sentuh Pukulan & Tendangan</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>

            <div className="mt-5 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Setiap juri dapat membuka halaman ini di smartphone atau tablet terpisah yang terhubung dalam satu jaringan Wi-Fi arena.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: HUBUNGI ADMIN (WhatsApp & Support) */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100 font-display">Layanan Bantuan & Dukungan Admin</h3>
                  <p className="text-xs text-zinc-400">Digital Scoring Pencak Silat IPSI / PERSILAT</p>
                </div>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs text-zinc-300">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-zinc-900 border border-emerald-500/30">
                <h4 className="font-bold text-sm text-emerald-300 flex items-center gap-2 mb-1">
                  <PhoneCall className="w-4 h-4" /> Konsultasi Turnamen & Teknis Perangkat
                </h4>
                <p className="text-zinc-400 leading-relaxed">
                  Hubungi tim teknis kami untuk konsultasi instalasi hardware arena (Router LAN/Offline Wi-Fi, LED Scoreboard TV, Tablet Juri, dan Lisensi Kejuaraan).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="https://wa.me/6281234567890?text=Halo%20Admin%20Digital%20Scoring%20Pencak%20Silat,%20saya%20ingin%20konsultasi%20penggunaan%20sistem%20pertandingan."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>WhatsApp Admin (Chat)</span>
                </a>

                <button
                  onClick={() => {
                    navigator.clipboard?.writeText('+62 812-3456-7890');
                    alert('Nomor WhatsApp admin disalin ke clipboard!');
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-zinc-700 transition-colors"
                >
                  <span>Salin No. HP Admin</span>
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <h5 className="font-bold text-zinc-200">Spesifikasi Minimal Perangkat Arena:</h5>
                <ul className="space-y-1.5 text-zinc-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span><strong>1x Laptop Dewan</strong> (Chrome / Edge / Firefox)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span><strong>3x Tablet / Smartphone Juri</strong> (Responsif & layar sentuh)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span><strong>1x TV Monitor / LED Videotron</strong> (Port HDMI / Miracast)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span><strong>1x Router Wi-Fi Lokal</strong> (Tidak memerlukan internet aktif)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PANDUAN MULTI-LAYAR */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100 font-display">Panduan Pengaturan Multi-Layar</h3>
                  <p className="text-xs text-zinc-400">Cara menghubungkan semua perangkat di Gelanggang</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs text-zinc-300">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h4 className="font-bold text-cyan-400 flex items-center gap-2">
                  <Wifi className="w-4 h-4" /> 1. Koneksi Jaringan Arena
                </h4>
                <p className="text-zinc-400 leading-relaxed">
                  Hubungkan semua laptop operator, tablet juri, dan laptop layar TV ke satu Wi-Fi atau hotspot yang sama. Aplikasi menggunakan sinkronisasi real-time instan.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h4 className="font-bold text-amber-400 flex items-center gap-2">
                  <Laptop className="w-4 h-4" /> 2. Meja Dewan & Operator
                </h4>
                <p className="text-zinc-400 leading-relaxed">
                  Dewan Pertandingan membuka menu <strong className="text-amber-300">DEWAN</strong> untuk kontrol timer, hukuman, jatuhan, dan request VAR. Sekretaris membuka menu <strong className="text-purple-300">SEKRETARIS</strong> untuk atur jadwal atlet dan cetak berita acara.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h4 className="font-bold text-emerald-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> 3. Tiga Tablet Juri Sudut
                </h4>
                <p className="text-zinc-400 leading-relaxed">
                  Buka browser di masing-masing tablet/HP juri. Klik kartu <strong className="text-emerald-300">JURI</strong> lalu pilih nomor juri (Juri 1, 2, atau 3). Tombol sentuh pukulan dan tendangan dirancang ergonomis untuk kedua tangan.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h4 className="font-bold text-blue-400 flex items-center gap-2">
                  <Monitor className="w-4 h-4" /> 4. Monitor / TV Utama Penonton
                </h4>
                <p className="text-zinc-400 leading-relaxed">
                  Buka menu <strong className="text-cyan-300">MONITOR</strong> di layar TV arena dan tekan tombol <em>F11 (Full Screen)</em> untuk tampilan scoreboard arena berstandar PERSILAT yang megah.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs"
                >
                  Tutup Panduan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   CUSTOM SHIELD BADGE EMBLEMS (Matched closely to Landing Page.JPG)
   ========================================================================= */

// 1. DEWAN BADGE
const DewanShieldBadge: React.FC = () => (
  <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_10px_15px_rgba(245,158,11,0.3)]">
    <defs>
      <linearGradient id="dewanShieldBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#78350f" />
        <stop offset="50%" stopColor="#451a03" />
        <stop offset="100%" stopColor="#1c1917" />
      </linearGradient>
      <linearGradient id="goldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="dewanBadgeGold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>

    {/* Outer Shield Outline */}
    <path
      d="M80 8 L142 32 C142 95 118 136 80 152 C42 136 18 95 18 32 Z"
      fill="url(#dewanShieldBg)"
      stroke="url(#goldBorder)"
      strokeWidth="4"
    />
    
    {/* Inner Shield Accent */}
    <path
      d="M80 18 L132 38 C132 90 110 126 80 140 C50 126 28 90 28 38 Z"
      fill="#0c0a09"
      stroke="#ca8a04"
      strokeWidth="1.5"
      opacity="0.8"
    />

    {/* Referee / Dewan Silhouette with Gavel & Ties */}
    {/* Head */}
    <circle cx="80" cy="50" r="14" fill="#fbbf24" />
    <path d="M72 44 Q80 40 88 44" stroke="#78350f" strokeWidth="2" fill="none" />
    
    {/* Suit and Tie */}
    <path d="M58 84 C58 68 68 64 80 64 C92 64 102 68 102 84 Z" fill="#1c1917" stroke="#fbbf24" strokeWidth="1.5" />
    {/* White Shirt Collar & Gold Tie */}
    <polygon points="76,64 84,64 80,74" fill="#f8fafc" />
    <polygon points="78,70 82,70 81,84 79,84" fill="#f59e0b" />
    
    {/* Crossed Flags & Gavel in Background */}
    <line x1="42" y1="92" x2="65" y2="70" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
    <polygon points="42,92 38,80 50,86" fill="#ef4444" />
    <line x1="118" y1="92" x2="95" y2="70" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
    <polygon points="118,92 122,80 110,86" fill="#3b82f6" />

    {/* Ribbon Banner at Bottom: KETUA */}
    <path d="M22 108 L40 102 L120 102 L138 108 L126 122 L34 122 Z" fill="#b45309" stroke="#fef08a" strokeWidth="1.5" />
    <text x="80" y="117" textAnchor="middle" fill="#fef08a" fontSize="8.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
      KETUA DEWAN
    </text>
  </svg>
);

// 2. SEKRETARIS BADGE
const SekretarisShieldBadge: React.FC = () => (
  <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_10px_15px_rgba(168,85,247,0.3)]">
    <defs>
      <linearGradient id="sekretarisShieldBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#581c87" />
        <stop offset="50%" stopColor="#2e1065" />
        <stop offset="100%" stopColor="#09090b" />
      </linearGradient>
      <linearGradient id="purpleGoldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#7e22ce" />
      </linearGradient>
    </defs>

    {/* Outer Shield Outline */}
    <path
      d="M80 8 L142 32 C142 95 118 136 80 152 C42 136 18 95 18 32 Z"
      fill="url(#sekretarisShieldBg)"
      stroke="url(#purpleGoldBorder)"
      strokeWidth="4"
    />
    
    {/* Inner Shield Accent */}
    <path
      d="M80 18 L132 38 C132 90 110 126 80 140 C50 126 28 90 28 38 Z"
      fill="#180c2e"
      stroke="#a855f7"
      strokeWidth="1.5"
      opacity="0.8"
    />

    {/* Clipboard / Scoreboard Tablet Graphic */}
    <rect x="52" y="40" width="56" height="46" rx="5" fill="#09090b" stroke="#fef08a" strokeWidth="2" />
    <rect x="68" y="34" width="24" height="8" rx="2" fill="#eab308" />
    
    {/* Digital Tournament Score graphic on Clipboard */}
    <rect x="58" y="48" width="18" height="12" rx="2" fill="#1d4ed8" />
    <text x="67" y="57" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">09</text>
    <rect x="84" y="48" width="18" height="12" rx="2" fill="#b91c1c" />
    <text x="93" y="57" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">04</text>
    
    {/* Bracket Lines */}
    <line x1="60" y1="68" x2="100" y2="68" stroke="#a855f7" strokeWidth="1.5" />
    <line x1="60" y1="74" x2="88" y2="74" stroke="#a855f7" strokeWidth="1.5" />
    <line x1="60" y1="80" x2="94" y2="80" stroke="#a855f7" strokeWidth="1.5" />

    {/* Ribbon Banner at Bottom: SEKRETARIS */}
    <path d="M22 108 L40 102 L120 102 L138 108 L126 122 L34 122 Z" fill="#6b21a8" stroke="#fef08a" strokeWidth="1.5" />
    <text x="80" y="117" textAnchor="middle" fill="#fef08a" fontSize="8.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
      SEKRETARIS
    </text>
  </svg>
);

// 3. JURI BADGE
const JuriShieldBadge: React.FC = () => (
  <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_10px_15px_rgba(16,185,129,0.3)]">
    <defs>
      <linearGradient id="juriShieldBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#064e3b" />
        <stop offset="50%" stopColor="#022c22" />
        <stop offset="100%" stopColor="#09090b" />
      </linearGradient>
      <linearGradient id="emeraldGoldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>

    {/* Outer Shield Outline */}
    <path
      d="M80 8 L142 32 C142 95 118 136 80 152 C42 136 18 95 18 32 Z"
      fill="url(#juriShieldBg)"
      stroke="url(#emeraldGoldBorder)"
      strokeWidth="4"
    />
    
    {/* Inner Shield Accent */}
    <path
      d="M80 18 L132 38 C132 90 110 126 80 140 C50 126 28 90 28 38 Z"
      fill="#022c22"
      stroke="#10b981"
      strokeWidth="1.5"
      opacity="0.8"
    />

    {/* Official Judge in Traditional White Pencak Silat Uniform */}
    {/* Head & Peci */}
    <circle cx="80" cy="48" r="13" fill="#fed7aa" />
    <path d="M68 44 Q80 37 92 44 Z" fill="#09090b" />
    
    {/* White Silat Uniform with Yellow/Gold Sash */}
    <path d="M60 84 C60 66 68 62 80 62 C92 62 100 66 100 84 Z" fill="#f8fafc" stroke="#34d399" strokeWidth="1.5" />
    {/* Sash */}
    <path d="M64 76 Q80 80 96 76" stroke="#eab308" strokeWidth="3" fill="none" />

    {/* Point Buttons graphic (+1, +2) */}
    <circle cx="48" cy="62" r="10" fill="#2563eb" stroke="#93c5fd" strokeWidth="1.5" />
    <text x="48" y="65" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">+1</text>
    
    <circle cx="112" cy="62" r="10" fill="#dc2626" stroke="#fca5a5" strokeWidth="1.5" />
    <text x="112" y="65" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">+2</text>

    {/* Ribbon Banner at Bottom: JURI */}
    <path d="M22 108 L40 102 L120 102 L138 108 L126 122 L34 122 Z" fill="#047857" stroke="#fef08a" strokeWidth="1.5" />
    <text x="80" y="117" textAnchor="middle" fill="#fef08a" fontSize="8.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
      JURI
    </text>
  </svg>
);

// 4. MONITOR BADGE
const MonitorShieldBadge: React.FC = () => (
  <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_10px_15px_rgba(6,182,212,0.3)]">
    <defs>
      <linearGradient id="monitorShieldBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#083344" />
        <stop offset="50%" stopColor="#0e1f38" />
        <stop offset="100%" stopColor="#09090b" />
      </linearGradient>
      <linearGradient id="cyanGoldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
    </defs>

    {/* Outer Shield Outline */}
    <path
      d="M80 8 L142 32 C142 95 118 136 80 152 C42 136 18 95 18 32 Z"
      fill="url(#monitorShieldBg)"
      stroke="url(#cyanGoldBorder)"
      strokeWidth="4"
    />
    
    {/* Inner Shield Accent */}
    <path
      d="M80 18 L132 38 C132 90 110 126 80 140 C50 126 28 90 28 38 Z"
      fill="#030712"
      stroke="#06b6d4"
      strokeWidth="1.5"
      opacity="0.8"
    />

    {/* LED Arena Monitor TV Screen */}
    <rect x="42" y="38" width="76" height="48" rx="4" fill="#000000" stroke="#38bdf8" strokeWidth="2" />
    
    {/* TV Stand */}
    <polygon points="76,86 84,86 88,94 72,94" fill="#64748b" />
    
    {/* Blue & Red Split Screen Inside TV */}
    <rect x="46" y="42" width="32" height="36" fill="#1e3a8a" />
    <text x="62" y="65" textAnchor="middle" fill="#93c5fd" fontSize="16" fontWeight="900" fontFamily="sans-serif">24</text>
    
    <rect x="82" y="42" width="32" height="36" fill="#7f1d1d" />
    <text x="98" y="65" textAnchor="middle" fill="#fca5a5" fontSize="16" fontWeight="900" fontFamily="sans-serif">18</text>

    {/* Center Round / Timer Pill */}
    <rect x="70" y="42" width="20" height="8" rx="2" fill="#09090b" stroke="#eab308" strokeWidth="1" />
    <text x="80" y="48" textAnchor="middle" fill="#eab308" fontSize="5" fontWeight="bold">02:00</text>

    {/* Ribbon Banner at Bottom: MONITOR */}
    <path d="M22 108 L40 102 L120 102 L138 108 L126 122 L34 122 Z" fill="#0369a1" stroke="#fef08a" strokeWidth="1.5" />
    <text x="80" y="117" textAnchor="middle" fill="#fef08a" fontSize="8.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="1">
      MONITOR
    </text>
  </svg>
);
