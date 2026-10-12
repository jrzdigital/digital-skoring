import React, { useState } from 'react';
import { TrainingLog, Student, SchoolProfile } from '../types';
import { formatIndoDate } from '../utils/pdfGenerator';
import {
  Search,
  Filter,
  PlusCircle,
  FileText,
  Trash2,
  Edit,
  Camera,
  Users,
  MapPin,
  Clock,
  Calendar,
  Share2,
  Eye,
  LayoutGrid,
  List,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  UserCheck
} from 'lucide-react';
import { SettingsTabType } from './SettingsModal';

interface TrainingLogsViewProps {
  logs: TrainingLog[];
  students: Student[];
  profile: SchoolProfile;
  onOpenAddLog: () => void;
  onEditLog: (log: TrainingLog) => void;
  onDeleteLog: (id: string) => void;
  onOpenPdfModal: () => void;
  onOpenShareModal: (log?: TrainingLog) => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenSettingsModal?: (tab?: SettingsTabType) => void;
}

export const TrainingLogsView: React.FC<TrainingLogsViewProps> = ({
  logs,
  students,
  profile,
  onOpenAddLog,
  onEditLog,
  onDeleteLog,
  onOpenPdfModal,
  onOpenShareModal,
  onNavigateToTab,
  onOpenSettingsModal,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; caption: string } | null>(null);

  // Available unique months
  const months = Array.from(new Set(logs.map(l => l.date.substring(0, 7)))).sort().reverse();

  // Filtered logs
  const filteredLogs = logs.filter(log => {
    const matchSearch =
      log.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.trainingType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.functionDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCategory = categoryFilter === 'all' || log.category === categoryFilter;
    const matchMonth = monthFilter === 'all' || log.date.startsWith(monthFilter);

    return matchSearch && matchCategory && matchMonth;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-purple-900/40">
        <div className="flex items-center gap-3">
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('landing')}
              className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-purple-950/60 border border-purple-900/50 hover:border-purple-500 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-95 group cursor-pointer"
              title="Kembali ke Halaman Utama"
            >
              <ArrowLeft className="w-4 h-4 text-yellow-400 group-hover:-translate-x-1 transition-transform" />
              <span>Kembali ke Beranda</span>
            </button>
          )}
          <div className="h-6 w-px bg-purple-900/50 hidden sm:block" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Daftar Laporan Latihan
            </h2>
            <p className="text-[11px] text-purple-300/80 font-medium">
              Total {logs.length} sesi terekam &bull; Ekspor lembar A4 berkop & foto dokumentasi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenSettingsModal && (
            <button
              onClick={() => onOpenSettingsModal('kop')}
              className="px-3.5 py-2 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700/60 hover:border-yellow-400 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
              title="Edit & Sesuaikan KOP Laporan, No. Telp, Email, dan Tanda Tangan"
            >
              <UserCheck className="w-4 h-4 text-yellow-400" />
              <span className="hidden sm:inline">KOP & TTD</span>
            </button>
          )}
          <button
            onClick={onOpenAddLog}
            className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white text-xs px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all shadow-md shadow-purple-950/50 flex items-center gap-2 active:scale-95 cursor-pointer border border-purple-500/40"
          >
            <PlusCircle className="w-4 h-4 text-yellow-300" />
            Tambah Laporan
          </button>
          <button
            onClick={onOpenPdfModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-purple-900/50 hover:border-blue-500 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
          >
            <FileText className="w-4 h-4 text-yellow-400" />
            Ekspor PDF
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/30 via-slate-900/90 to-black border border-purple-900/40 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari materi latihan, nomor, atau fungsi..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950/90 border border-purple-900/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-950/90 border border-purple-900/50 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono text-[11px]"
          >
            <option value="all">Semua Kategori</option>
            <option value="Dasar">Dasar (Kuda-kuda/Langkah)</option>
            <option value="Fisik">Fisik & Daya Tahan</option>
            <option value="Teknik/Tanding">Teknik / Sambung Tanding</option>
            <option value="Seni Tunggal/Ganda">Seni Tunggal / Ganda</option>
            <option value="Pernapasan">Pernapasan & Tenaga Dalam</option>
            <option value="Ujian Kenaikan Tingkat">Ujian Kenaikan Tingkat</option>
          </select>

          {/* Month Filter */}
          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-950/90 border border-purple-900/50 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono text-[11px]"
          >
            <option value="all">Semua Periode</option>
            {months.map(m => (
              <option key={m} value={m}>Bulan {m}</option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-purple-900/50">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded text-xs transition-colors ${
              viewMode === 'grid' ? 'bg-purple-900/50 text-yellow-300 border border-purple-600/70' : 'text-slate-400 hover:text-white'
            }`}
            title="Tampilan Grid Kartu"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded text-xs transition-colors ${
              viewMode === 'table' ? 'bg-purple-900/50 text-yellow-300 border border-purple-600/70' : 'text-slate-400 hover:text-white'
            }`}
            title="Tampilan Tabel Berkas"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Rendering */}
      {filteredLogs.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/30 border border-purple-900/40 flex flex-col items-center gap-3">
          <FileText className="w-10 h-10 text-purple-700" />
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">Tidak ada laporan latihan yang sesuai dengan filter.</p>
          <button
            onClick={onOpenAddLog}
            className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-purple-700 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white rounded-lg transition-all uppercase tracking-wider shadow-md cursor-pointer"
          >
            Buat Laporan Sekarang
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredLogs.map(log => {
            const isExpanded = expandedLogId === log.id;
            const hadirCount = log.attendance ? log.attendance.filter(a => a.status === 'hadir').length : 0;

            return (
              <div
                key={log.id}
                className="rounded-xl bg-gradient-to-br from-purple-950/20 via-slate-900/90 to-black border border-purple-900/40 hover:border-purple-600/60 transition-all shadow-xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Top Info */}
                  <div className="p-4 border-b border-purple-900/30 bg-slate-950/80 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold text-yellow-400 bg-purple-950/90 px-2 py-0.5 rounded border border-purple-700/60 uppercase tracking-widest">
                          No. {log.number}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800/60 text-blue-300 font-mono">
                          {log.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100 leading-snug">{log.trainingType}</h3>
                    </div>

                    {/* Quick Menu */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenShareModal(log)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Bagikan ke WhatsApp"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditLog(log)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Edit Laporan"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus laporan nomor ${log.number}?`)) {
                            onDeleteLog(log.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Hapus Laporan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Meta details */}
                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-[11px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        <strong className="text-slate-200 font-sans">{log.day}</strong>, {formatIndoDate(log.date)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        {log.startTime} - {log.endTime} WIB
                      </span>
                      <span className="flex items-center gap-1.5 font-sans">
                        <MapPin className="w-3.5 h-3.5 text-yellow-400" />
                        {log.location}
                      </span>
                    </div>

                    {/* Fungsi / Manfaat */}
                    <div className="p-3 rounded-lg bg-slate-950/80 border border-purple-950/80 space-y-1">
                      <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest font-mono">
                        FUNGSI & TUJUAN LATIHAN:
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {log.functionDescription}
                      </p>
                    </div>

                    {/* Photos Preview */}
                    {log.photos && log.photos.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-purple-300 font-bold uppercase tracking-widest font-mono flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-blue-400" />
                          DOKUMENTASI FOTO ({log.photos.length}):
                        </p>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {log.photos.map(photo => (
                            <button
                              key={photo.id}
                              type="button"
                              onClick={() => setSelectedPhoto({ url: photo.url, caption: photo.caption })}
                              className="group relative w-20 h-14 rounded-lg overflow-hidden border border-purple-900/60 shrink-0 bg-black hover:border-yellow-400 transition-colors"
                            >
                              <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expandable student attendance detail */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-purple-900/30 space-y-2">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-400" />
                          Presensi Pesilat:
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {log.attendance?.map(att => {
                            const std = students.find(s => s.id === att.studentId);
                            return (
                              <div
                                key={att.studentId}
                                className="p-1.5 px-2 rounded bg-slate-950 border border-purple-900/40 text-[11px] flex items-center justify-between"
                              >
                                <span className="text-slate-300 truncate">{std?.name || 'Siswa'}</span>
                                <span
                                  className={`font-mono font-bold capitalize px-1.5 py-0.2 rounded text-[9px] ${
                                    att.status === 'hadir'
                                      ? 'text-emerald-400 bg-emerald-950/40'
                                      : att.status === 'izin'
                                      ? 'text-amber-400 bg-amber-950/40'
                                      : att.status === 'sakit'
                                      ? 'text-blue-400 bg-blue-950/40'
                                      : 'text-rose-400 bg-rose-950/40'
                                  }`}
                                >
                                  {att.status}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {log.coachNotes && (
                          <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-900/50 text-xs text-slate-300">
                            <strong className="text-yellow-400 font-mono text-[10px] uppercase tracking-wider block mb-0.5">Catatan Pelatih: </strong>
                            {log.coachNotes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Toggle */}
                <div className="px-4 py-2.5 border-t border-purple-900/30 bg-slate-950/80 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 text-[11px]">
                    KEHADIRAN: <strong className="text-yellow-400">{hadirCount}</strong> / {students.length}
                  </span>
                  <button
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="text-blue-400 hover:text-yellow-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {isExpanded ? (
                      <>Tutup <ChevronUp className="w-3 h-3" /></>
                    ) : (
                      <>Detail <ChevronDown className="w-3 h-3" /></>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl bg-gradient-to-br from-purple-950/20 via-slate-900/90 to-black border border-purple-900/40 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-purple-300 uppercase font-mono text-[10px] tracking-wider border-b border-purple-900/40">
                <tr>
                  <th className="px-4 py-3.5">Nomor</th>
                  <th className="px-4 py-3.5">Hari / Tanggal</th>
                  <th className="px-4 py-3.5">Jenis Latihan</th>
                  <th className="px-4 py-3.5">Fungsi & Tujuan</th>
                  <th className="px-4 py-3.5 text-center">Foto</th>
                  <th className="px-4 py-3.5 text-center">Presensi</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-950/50">
                {filteredLogs.map(log => {
                  const hadir = log.attendance ? log.attendance.filter(a => a.status === 'hadir').length : 0;
                  return (
                    <tr key={log.id} className="hover:bg-purple-950/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-yellow-400 whitespace-nowrap text-xs">
                        {log.number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-slate-100">{log.day}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.date}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-200 leading-tight">{log.trainingType}</div>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800/60 text-purple-300 font-mono">
                          {log.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-xs line-clamp-2">
                        {log.functionDescription}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {log.photos && log.photos.length > 0 ? (
                          <button
                            onClick={() => setSelectedPhoto({ url: log.photos[0].url, caption: log.photos[0].caption })}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-950/80 hover:bg-purple-900/80 text-yellow-300 rounded border border-purple-700/60 text-[10px] font-mono"
                          >
                            <Camera className="w-3 h-3 text-blue-400" />
                            {log.photos.length} Foto
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[10px] font-mono">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-blue-950/80 text-yellow-300 border border-blue-800/80 font-bold font-mono text-[10px]">
                          {hadir} / {students.length}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenShareModal(log)}
                            className="p-1 text-slate-400 hover:text-emerald-400"
                            title="Bagikan WA"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditLog(log)}
                            className="p-1 text-slate-400 hover:text-blue-400"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus laporan nomor ${log.number}?`)) {
                                onDeleteLog(log.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-400"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="max-w-2xl w-full bg-[#09071a] border border-purple-800 rounded-xl overflow-hidden shadow-2xl p-4 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black">
              <img src={selectedPhoto.url} alt="Detail" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-200">{selectedPhoto.caption || 'Dokumentasi Latihan'}</p>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="px-3 py-1 bg-purple-900/60 hover:bg-purple-800 text-xs font-bold uppercase tracking-wider text-yellow-300 border border-purple-700 rounded-md font-mono"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
