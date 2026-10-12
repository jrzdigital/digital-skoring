import React, { useState, useEffect } from 'react';
import { TrainingLog, Student, SchoolProfile, ScheduleReminder, QRScanRecord } from '../types';
import { StorageService } from '../utils/storage';
import {
  Users,
  Calendar,
  Award,
  TrendingUp,
  Clock,
  PlusCircle,
  FileText,
  FileSpreadsheet,
  Share2,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
  Flame,
  Laptop,
  Download,
  WifiOff,
  ArrowLeft,
  Maximize,
  Minimize,
  QrCode,
  ScanLine,
  Camera,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { formatIndoDate } from '../utils/pdfGenerator';

interface DashboardViewProps {
  logs: TrainingLog[];
  students: Student[];
  profile: SchoolProfile;
  schedules: ScheduleReminder[];
  onOpenAddLog: () => void;
  onOpenPdfModal: () => void;
  onOpenSignaturesModal: () => void;
  onOpenShareModal: () => void;
  onOpenInstallModal: () => void;
  onNavigateToTab: (tab: string) => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenQRScanner?: () => void;
  onOpenStudentQR?: (studentId?: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Dasar': '#9333ea', // purple-600
  'Fisik': '#2563eb', // blue-600
  'Teknik/Tanding': '#7c3aed', // violet-600
  'Seni Tunggal/Ganda': '#06b6d4', // cyan-500
  'Pernapasan': '#10b981', // emerald-500
  'Ujian Kenaikan Tingkat': '#eab308', // yellow-500
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  logs,
  students,
  profile,
  schedules,
  onOpenAddLog,
  onOpenPdfModal,
  onOpenSignaturesModal,
  onOpenShareModal,
  onOpenInstallModal,
  onNavigateToTab,
  onToggleFullscreen,
  isFullscreen,
  onOpenQRScanner,
  onOpenStudentQR,
}) => {
  const [todayScans, setTodayScans] = useState<QRScanRecord[]>(() => StorageService.getTodayQRScans());

  // Poll or refresh today's scans
  useEffect(() => {
    setTodayScans(StorageService.getTodayQRScans());
  }, [logs]);

  // 1. Calculate overall stats
  const totalSessions = logs.length;
  const activeStudents = students.filter(s => s.status === 'Aktif').length;
  const todayScannedCount = todayScans.length;
  const todayScanPercentage = students.length > 0 ? Math.round((todayScannedCount / students.length) * 100) : 0;


  let totalPossibleAttendances = 0;
  let totalActualHadir = 0;

  logs.forEach(log => {
    if (log.attendance) {
      totalPossibleAttendances += log.attendance.length;
      totalActualHadir += log.attendance.filter(a => a.status === 'hadir').length;
    }
  });

  const overallAttendanceRate = totalPossibleAttendances > 0
    ? Math.round((totalActualHadir / totalPossibleAttendances) * 100)
    : 0;

  // 2. Prepare Weekly Trend Data for Recharts
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const weeklyTrendData = sortedLogs.slice(-8).map((log, idx) => {
    const hadir = log.attendance ? log.attendance.filter(a => a.status === 'hadir').length : 0;
    const rate = students.length > 0 ? Math.round((hadir / students.length) * 100) : 0;
    
    // Calculate average session score
    const scores = log.attendance?.map(a => a.score || 85) || [85];
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    return {
      name: `Sesi ${idx + 1} (${log.day.substring(0, 3)})`,
      tanggal: log.date.substring(5),
      kehadiran: rate,
      pesertaHadir: hadir,
      performaSkor: avgScore,
      kategori: log.category,
    };
  });

  // 3. Category distribution
  const categoryCounts: Record<string, number> = {};
  logs.forEach(l => {
    categoryCounts[l.category] = (categoryCounts[l.category] || 0) + 1;
  });

  const categoryPieData = Object.entries(categoryCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // Next active schedule
  const activeSchedule = schedules.find(s => s.isActive) || schedules[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-purple-900/40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToTab('landing')}
            className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-purple-950/60 border border-purple-900/50 hover:border-purple-500 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-95 group cursor-pointer"
            title="Kembali ke Halaman Utama"
          >
            <ArrowLeft className="w-4 h-4 text-yellow-400 group-hover:-translate-x-1 transition-transform" />
            <span>Kembali ke Beranda</span>
          </button>
          <div className="h-6 w-px bg-purple-900/50 hidden sm:block" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block shadow-sm shadow-yellow-400/50" />
              Dashboard Analitik
            </h2>
            <p className="text-[11px] text-purple-300/80 font-medium">
              {profile.schoolName} &bull; {profile.extracurricularName}
            </p>
          </div>
        </div>

        {/* Action Hub */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddLog}
            className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white text-xs px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider transition-all shadow-md shadow-purple-950/50 flex items-center gap-1.5 active:scale-95 cursor-pointer border border-purple-500/40"
          >
            <PlusCircle className="w-4 h-4 text-yellow-300" />
            Catat Laporan
          </button>

          <button
            onClick={onOpenPdfModal}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-purple-900/50 hover:border-blue-500 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
          >
            <FileText className="w-4 h-4 text-yellow-400" />
            Ekspor PDF
          </button>

          <button
            onClick={onOpenShareModal}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-purple-900/50 hover:border-purple-500 rounded-xl transition-colors flex items-center justify-center cursor-pointer shadow-sm"
            title="Bagikan Ringkasan Latihan"
          >
            <Share2 className="w-4 h-4 text-blue-400" />
          </button>

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              className="p-2 rounded-xl bg-slate-900 hover:bg-purple-950/80 text-yellow-400 hover:text-yellow-300 border border-purple-900/50 hover:border-yellow-500/80 shadow-md flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid - Ungu, Biru, Hitam & Kuning */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Latihan (Ungu) */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-purple-950/40 via-slate-900/90 to-black border border-purple-900/50 hover:border-purple-500/80 transition-all shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-purple-300/80 uppercase tracking-widest font-mono">TOTAL SESI TERLAKSANA</p>
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-700/60 flex items-center justify-center text-purple-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold tracking-tight text-white">{totalSessions} <span className="text-xs font-normal text-slate-400 font-sans">Pertemuan</span></h3>
            <p className="text-[10px] text-yellow-400 flex items-center gap-1 mt-1 font-mono uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3 text-yellow-400" />
              TERCATAT DALAM BASIS DATA
            </p>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
            <div className="bg-gradient-to-r from-purple-600 to-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (totalSessions / 20) * 100)}%` }} />
          </div>
        </div>

        {/* Card 2: Kehadiran Siswa (Biru-Kuning) */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-950/40 via-slate-900/90 to-black border border-blue-900/50 hover:border-blue-500/80 transition-all shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-blue-300/80 uppercase tracking-widest font-mono">RATA-RATA PRESENSI</p>
            <div className="w-8 h-8 rounded-lg bg-blue-950/80 border border-blue-700/60 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold tracking-tight text-yellow-400">{overallAttendanceRate}%</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider">
              {totalActualHadir} TOTAL KEHADIRAN SISWA
            </p>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-yellow-400 h-full rounded-full" style={{ width: `${overallAttendanceRate}%` }} />
          </div>
        </div>

        {/* Card 3: Pesilat Aktif (Indigo/Ungu) */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-black border border-indigo-900/50 hover:border-indigo-500/80 transition-all shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-indigo-300/80 uppercase tracking-widest font-mono">ANGGOTA PESILAT</p>
            <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold tracking-tight text-white">{activeStudents} <span className="text-xs font-normal text-slate-400 font-sans">Atlet Aktif</span></h3>
            <button
              onClick={() => onNavigateToTab('attendance')}
              className="text-[10px] text-yellow-400 hover:text-yellow-300 font-semibold uppercase tracking-wider flex items-center gap-0.5 mt-1 cursor-pointer"
            >
              Lihat performa <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, (activeStudents / 30) * 100)}%` }} />
          </div>
        </div>

        {/* Card 4: Jadwal Terdekat (Kuning-Emas) */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-yellow-950/30 via-slate-900/90 to-black border border-yellow-900/40 hover:border-yellow-500/80 transition-all shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-yellow-300/80 uppercase tracking-widest font-mono">JADWAL LATIHAN RUTIN</p>
            <div className="w-8 h-8 rounded-lg bg-yellow-950/80 border border-yellow-700/60 flex items-center justify-center text-yellow-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-base font-bold text-white truncate">
              {activeSchedule ? `${activeSchedule.day} (${activeSchedule.time})` : 'Selasa (15:30 WIB)'}
            </h3>
            <p className="text-[10px] text-slate-400 truncate mt-1 uppercase tracking-wider font-mono">
              {activeSchedule?.location || 'LAPANGAN SEKOLAH'}
            </p>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-400 h-full rounded-full w-full" />
          </div>
        </div>
      </div>

      {/* PANEL RINGKASAN ABSENSI SCAN QR REAL-TIME HARI INI */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#12092c] via-[#090618] to-black border-2 border-yellow-500/60 p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Glow ambient */}
        <div className="absolute top-0 right-10 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Panel Header */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-purple-900/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-950/90 border border-yellow-400 flex items-center justify-center text-yellow-400 shadow-lg shadow-purple-950/60">
              <ScanLine className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                  RINGKASAN PRESENSI SCAN QR HARI INI
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-500/60 text-emerald-300">
                  REAL-TIME STATISTIK
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Statistik pemindaian barcode atlet dan status kehadiran siswa untuk sesi aktif.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenStudentQR && (
              <button
                onClick={() => onOpenStudentQR()}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-blue-300 border border-blue-700/60 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-yellow-400" />
                Kartu QR Siswa
              </button>
            )}

            {onOpenQRScanner && (
              <button
                onClick={onOpenQRScanner}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-purple-950/60 border border-purple-500/40 transition-all active:scale-95 cursor-pointer"
              >
                <Camera className="w-4 h-4 text-yellow-300" />
                Buka Scanner QR
              </button>
            )}
          </div>
        </div>

        {/* Panel Stats & Live Feed Grid */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Stats Column */}
          <div className="lg:col-span-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-900/50">
                <span className="text-[10px] font-mono text-purple-300 uppercase block">
                  TERPINDAI HARI INI
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-yellow-400">{todayScannedCount}</span>
                  <span className="text-xs text-slate-400 font-mono">/ {students.length} Atlet</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-900/50">
                <span className="text-[10px] font-mono text-purple-300 uppercase block">
                  PERSENTASE HADIR
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-emerald-400">{todayScanPercentage}%</span>
                  <span className="text-[10px] text-slate-400 font-mono">Kehadiran</span>
                </div>
              </div>
            </div>

            {/* Attendance Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                <span>Progres Presensi Atlet</span>
                <span className="text-yellow-400 font-bold">{todayScannedCount} dari {students.length} Siswa</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-purple-900/60 p-0.5">
                <div
                  className="bg-gradient-to-r from-purple-600 via-blue-500 to-yellow-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${todayScanPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Live Recent Scanned Ticker / List */}
          <div className="lg:col-span-7 rounded-xl bg-slate-950/70 border border-purple-900/50 p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400 pb-1 border-b border-purple-900/40">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                PEMINDAIAN TERAKHIR
              </span>
              <span>{todayScans.length} TERCATAT</span>
            </div>

            {todayScans.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <ScanLine className="w-4 h-4 text-purple-500" />
                <span>Belum ada scan hari ini. Klik "Buka Scanner QR" untuk mulai presensi.</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                {todayScans.slice(0, 6).map((scan, idx) => (
                  <div
                    key={scan.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-purple-800/60 text-xs text-white"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold uppercase truncate max-w-[130px]">{scan.studentName}</span>
                    <span className="text-[10px] font-mono text-yellow-400 bg-yellow-950/60 px-1.5 py-0.5 rounded border border-yellow-800/40">
                      {scan.timeFormatted}
                    </span>
                  </div>
                ))}
                {todayScans.length > 6 && (
                  <span className="text-[11px] font-mono text-purple-300 self-center">
                    +{todayScans.length - 6} lainnya
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Weekly Progress & Attendance Trend */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-gradient-to-br from-slate-900/90 via-[#0a0a1a] to-black border border-purple-900/40 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Grafik Progres Latihan & Kehadiran Mingguan
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Memantau tingkat partisipasi siswa dan evaluasi performa per sesi</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block shadow-sm shadow-purple-500/50" /> KEHADIRAN (%)
              </span>
              <span className="flex items-center gap-1.5 text-yellow-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block shadow-sm shadow-yellow-400/50" /> SKOR PERFORMA
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKehadiran" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPerforma" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1b4b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontStyle="bold" />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09071a',
                    border: '1px solid #4c1d95',
                    borderRadius: '0.5rem',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="kehadiran"
                  name="Tingkat Kehadiran (%)"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorKehadiran)"
                />
                <Area
                  type="monotone"
                  dataKey="performaSkor"
                  name="Rata-rata Skor Performa"
                  stroke="#eab308"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorPerforma)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Chart: Training Category Distribution */}
        <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900/90 via-[#0a0a1a] to-black border border-purple-900/40 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-yellow-400" />
              Distribusi Materi Silat
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Komposisi kurikulum latihan yang telah dilaksanakan</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            {categoryPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[entry.name] || '#9333ea'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09071a',
                      border: '1px solid #4c1d95',
                      borderRadius: '0.5rem',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-500 text-xs font-mono">Belum ada data materi</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-900/30">
            {categoryPieData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-300 uppercase tracking-wider font-mono">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#9333ea' }}
                />
                <span className="truncate">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Training Sessions List */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900/90 via-[#0a0a1a] to-black border border-purple-900/40 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Histori Laporan Latihan Terakhir
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Ringkasan berkas pelaporan resmi yang siap diajukan ke pihak sekolah</p>
          </div>
          <button
            onClick={() => onNavigateToTab('logs')}
            className="text-xs font-bold text-yellow-400 hover:text-yellow-300 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            Lihat Semua ({logs.length}) <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {logs.slice(-4).reverse().map((log) => {
            const hadir = log.attendance ? log.attendance.filter(a => a.status === 'hadir').length : 0;
            return (
              <div
                key={log.id}
                className="p-4 rounded-lg bg-slate-950/80 border border-purple-950/80 hover:border-purple-700/60 hover:bg-purple-950/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-950 to-blue-950 border border-purple-800/60 flex flex-col items-center justify-center text-purple-300 shrink-0 font-bold font-mono">
                    <span className="text-[9px] leading-none uppercase">{log.day.substring(0, 3)}</span>
                    <span className="text-xs font-black text-yellow-400">{log.date.split('-')[2]}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono text-yellow-400 font-bold">{log.number}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/60 text-purple-300 font-mono">
                        {log.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100 leading-snug">{log.trainingType}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1">{log.functionDescription}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs">
                  <div className="text-right font-mono">
                    <p className="text-slate-200 font-semibold">{hadir} / {students.length} Hadir</p>
                    <p className="text-[10px] text-purple-400/80 uppercase tracking-widest">{log.photos?.length || 0} Dokumentasi</p>
                  </div>
                  {log.photos && log.photos.length > 0 && (
                    <div className="w-11 h-11 rounded-lg overflow-hidden border border-purple-900/60 shrink-0 bg-black">
                      <img src={log.photos[0].url} alt="Thumbnail" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PC / Laptop Installation Banner Card - Ungu, Biru, Emas */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-purple-950/50 via-slate-900 to-blue-950/50 border border-purple-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-700/80 flex items-center justify-center text-purple-300 shrink-0 shadow-md">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Gunakan SilatReport Sebagai Aplikasi Desktop di PC / Laptop
              </h4>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-950/80 text-yellow-400 border border-yellow-700/80 font-bold">
                100% OFFLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              Pasang aplikasi di komputer Windows, Mac, atau Linux Anda untuk akses cepat 1-klik dari Desktop, tanpa repot membuka browser & bekerja tanpa kuota internet.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenInstallModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-700 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white border border-purple-500/40 transition-all active:scale-95 shrink-0 shadow-md cursor-pointer"
        >
          <Download className="w-4 h-4 text-yellow-300" />
          Instal di PC / Laptop
        </button>
      </div>
    </div>
  );
};
