import React from 'react';
import { SchoolProfile, TrainingLog, Student, UserAccount } from '../types';
import { SettingsTabType } from './SettingsModal';
import {
  FileText,
  Users,
  LayoutDashboard,
  Settings,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  User,
  Building2,
  ChevronRight,
  School,
} from 'lucide-react';

interface LandingPageViewProps {
  profile: SchoolProfile;
  currentUser?: UserAccount;
  onOpenAuthModal?: () => void;
  logs?: TrainingLog[];
  students?: Student[];
  onNavigateToTab: (tab: string) => void;
  onOpenSettings: (tab?: SettingsTabType) => void;
  onOpenQRScanner?: () => void;
  onOpenStudentQR?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  profile,
  currentUser,
  onOpenAuthModal,
  logs = [],
  students = [],
  onNavigateToTab,
  onOpenSettings,
}) => {
  return (
    <div className="w-full flex flex-col justify-center min-h-[calc(100vh-140px)] py-6 sm:py-10">
      {/* 4 MENU UTAMA EKSKLUSIF - UNGU, BIRU, HITAM & KUNING */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-purple-950/40 via-[#070714] to-black border border-purple-900/50 shadow-2xl p-6 sm:p-10 lg:p-14 max-w-5xl mx-auto w-full space-y-8">
        {/* Ambient Gradient Glows (Ungu - Biru - Kuning) */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Multi-User Current Account Banner */}
        {currentUser && (
          <div className="relative z-10 p-3.5 sm:p-4 rounded-2xl bg-zinc-950/85 border border-purple-800/40 shadow-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-900/50 border border-purple-600/70 flex items-center justify-center text-purple-200 font-bold text-sm shrink-0 shadow-md">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-white">Akun Pelatih: {currentUser.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-purple-950 text-purple-300 border border-purple-800 capitalize">
                    {currentUser.role}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-yellow-400 font-semibold mt-0.5">
                  <School className="w-3.5 h-3.5" />
                  <span>{currentUser.trainingLocation}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-400 font-normal">{logs.length} Laporan • {students.length} Atlet</span>
                </div>
              </div>
            </div>

            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="text-xs px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-purple-200 hover:text-white border border-purple-700/60 transition-all font-bold flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-yellow-400" />
                <span>Ganti Akun / Tempat Latihan</span>
                <ChevronRight className="w-3 h-3 text-zinc-400" />
              </button>
            )}
          </div>
        )}

        <div className="relative z-10 text-center space-y-6">
          {/* Logo Satria App - Tampil Bersih, Proporsional Tanpa Grid/Box & Tanpa Tulisan Badge */}
          <div className="flex justify-center items-center">
            <div className="relative group">
              {/* Subtle ambient glow behind logo */}
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-600/30 via-yellow-400/25 to-blue-600/30 rounded-full blur-xl opacity-60 group-hover:opacity-100 transition duration-500 pointer-events-none" />
              
              <img
                src="/logo_satriaapp.png"
                alt="Logo Satria App"
                loading="eager"
                decoding="async"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes('logo%20satriaapp.png')) {
                    target.src = '/logo satriaapp.png';
                  }
                }}
                className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 object-contain filter drop-shadow-[0_8px_20px_rgba(0,0,0,0.7)] transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </div>

          {/* School & Extracurricular Title - Gradient Ungu ke Biru ke Kuning */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white uppercase tracking-tight leading-tight drop-shadow-md">
              {profile.schoolName}
            </h1>
            <p className="text-base sm:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-yellow-400 uppercase tracking-wide">
              {profile.extracurricularName}
            </p>
          </div>

          {/* Subtitle / Description */}
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Portal pelaporan kegiatan latihan resmi berstandar kedinasan. Kelola log pertemuan, absensi scan barcode digital atlet, dan pengaturan administrasi dalam satu sistem terpadu.
          </p>
        </div>

        {/* 4 MENU UTAMA: DASHBOARD (UNGU) - LAPORAN (BIRU) - SISWA (INDIGO/BIRU) - SETTING (KUNING) */}
        <div className="relative z-10 space-y-5">
          <div className="text-center">
            <span className="text-[11px] font-mono text-purple-200 font-bold uppercase tracking-widest bg-purple-950/60 px-3.5 py-1 rounded-full border border-purple-800/60 shadow-sm">
              PILIH MENU UTAMA APLIKASI
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            {/* Menu 1: Dashboard (Ungu) */}
            <button
              onClick={() => onNavigateToTab('dashboard')}
              className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/60 via-slate-900/90 to-black hover:from-purple-900/60 hover:to-slate-900 border border-purple-900/50 hover:border-purple-500 shadow-xl transition-all group flex flex-col justify-between space-y-4 active:scale-95 text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-xl bg-purple-950 border border-purple-700/80 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform shadow-md shadow-purple-950/60">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400/60 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wide group-hover:text-purple-300 transition-colors">
                  Dashboard
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Ringkasan performa latihan, ringkasan absensi QR, dan statistik kehadiran siswa.
                </p>
              </div>
            </button>

            {/* Menu 2: Laporan (Biru) */}
            <button
              onClick={() => onNavigateToTab('logs')}
              className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/60 via-slate-900/90 to-black hover:from-blue-900/60 hover:to-slate-900 border border-blue-900/50 hover:border-blue-500 shadow-xl transition-all group flex flex-col justify-between space-y-4 active:scale-95 text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-700/80 flex items-center justify-center text-blue-300 group-hover:scale-110 transition-transform shadow-md shadow-blue-950/60">
                  <FileText className="w-6 h-6" />
                </div>
                <ArrowRight className="w-4 h-4 text-blue-400/60 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wide group-hover:text-blue-300 transition-colors">
                  Laporan
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Jurnal pertemuan 6 kolom, foto dokumentasi, dan ekspor lembar PDF A4 resmi.
                </p>
              </div>
            </button>

            {/* Menu 3: Siswa (Ungu-Biru / Indigo) */}
            <button
              onClick={() => onNavigateToTab('attendance')}
              className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-black hover:from-indigo-900/60 hover:to-slate-900 border border-indigo-900/50 hover:border-indigo-500 shadow-xl transition-all group flex flex-col justify-between space-y-4 active:scale-95 text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-xl bg-indigo-950 border border-indigo-700/80 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform shadow-md shadow-indigo-950/60">
                  <Users className="w-6 h-6" />
                </div>
                <ArrowRight className="w-4 h-4 text-indigo-400/60 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wide group-hover:text-indigo-300 transition-colors">
                  Siswa
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Data anggota atlet, presensi harian, kartu QR barcode, dan evaluasi radar sabuk.
                </p>
              </div>
            </button>

            {/* Menu 4: Setting (Kuning & Emas / Hitam) */}
            <button
              onClick={() => onOpenSettings()}
              className="p-5 rounded-2xl bg-gradient-to-br from-yellow-950/30 via-slate-900/90 to-black hover:from-yellow-950/50 hover:to-slate-900 border border-yellow-900/40 hover:border-yellow-500 shadow-xl transition-all group flex flex-col justify-between space-y-4 active:scale-95 text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-xl bg-yellow-950/80 border border-yellow-700/80 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform shadow-md shadow-yellow-950/60">
                  <Settings className="w-6 h-6" />
                </div>
                <ArrowRight className="w-4 h-4 text-yellow-500/60 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wide group-hover:text-yellow-400 transition-colors">
                  Setting
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  KOP & TTD digital, jadwal latihan, pasang di PC, enkripsi, dan tema.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Micro Specs Footer - Ungu, Biru, Emas */}
        <div className="relative z-10 pt-2 border-t border-purple-900/30 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400" />
            <span>Presensi Scan QR Barcode Otomatis</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            <span>100% Berjalan Offline (PWA)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Proteksi Enkripsi AES-256</span>
          </div>
        </div>
      </div>
    </div>
  );
};

