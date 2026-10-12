import React, { useState } from 'react';
import { Student, TrainingLog, BeltLevel } from '../types';
import {
  Users,
  UserPlus,
  Search,
  Award,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Phone,
  Trash2,
  Edit,
  FileSpreadsheet,
  ArrowLeft,
  Sparkles,
  Save,
  Shield,
  Layers,
  ChevronRight,
  QrCode,
  ScanLine,
  Camera,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { ImportStudentsModal } from './ImportStudentsModal';

interface AttendanceViewProps {
  students?: Student[];
  logs?: TrainingLog[];
  onSaveStudents: (students: Student[]) => void;
  onSelectStudentForProgress?: (student: Student) => void;
  onNavigateToTab?: (tab: string) => void;
  initialSubTab?: 'presensi' | 'sabuk';
  onOpenQRScanner?: () => void;
  onOpenStudentQR?: (studentId?: string) => void;
}

export const BELT_COLORS: Record<BeltLevel, string> = {
  'Putih / Dasar': 'bg-white text-slate-950 border-slate-300 font-bold',
  'Hijau': 'bg-[#008000] text-white border-green-500 font-bold',
  'Biru': 'bg-[#0000FF] text-white border-blue-500 font-bold',
  'Merah / Pelatih': 'bg-[#FF0000] text-white border-red-500 font-bold',
};

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  students = [],
  logs = [],
  onSaveStudents,
  onSelectStudentForProgress,
  onNavigateToTab,
  initialSubTab = 'presensi',
  onOpenQRScanner,
  onOpenStudentQR,
}) => {
  const [subTab, setSubTab] = useState<'presensi' | 'sabuk'>(initialSubTab);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [search, setSearch] = useState<string>('');
  const [beltFilter, setBeltFilter] = useState<string>('all');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const currentStudent = students.find(s => s.id === selectedStudentId) || students[0];

  const [skillState, setSkillState] = useState(
    currentStudent?.skillRatings || {
      fisik: 85,
      teknik: 85,
      seni: 85,
      tanding: 85,
      disiplin: 90,
    }
  );

  // Sync skill state when student changes
  React.useEffect(() => {
    if (currentStudent?.skillRatings) {
      setSkillState(currentStudent.skillRatings);
    }
  }, [currentStudent?.id]);

  // Form state for add/edit
  const [formState, setFormState] = useState<Partial<Student>>({
    name: '',
    nis: '',
    classGrade: '',
    gender: 'L',
    beltLevel: 'Putih / Dasar',
    phone: '',
    parentPhone: '',
    status: 'Aktif',
    skillRatings: { fisik: 80, teknik: 80, seni: 80, tanding: 80, disiplin: 85 },
  });

  const totalLogsCount = (logs || []).length;

  // Calculate statistics per student
  const studentStats = (students || []).map(std => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    (logs || []).forEach(log => {
      const rec = log.attendance?.find(a => a.studentId === std.id);
      if (rec) {
        if (rec.status === 'hadir') hadir++;
        else if (rec.status === 'izin') izin++;
        else if (rec.status === 'sakit') sakit++;
        else if (rec.status === 'alpa') alpa++;
      }
    });

    const rate = totalLogsCount > 0 ? Math.round((hadir / totalLogsCount) * 100) : 0;
    return {
      student: std,
      hadir,
      izin,
      sakit,
      alpa,
      rate,
    };
  });

  const filteredStats = studentStats.filter(({ student }) => {
    const matchSearch =
      (student.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (student.nis || '').toLowerCase().includes(search.toLowerCase()) ||
      (student.classGrade || '').toLowerCase().includes(search.toLowerCase());
    const matchBelt = beltFilter === 'all' || student.beltLevel === beltFilter;
    return matchSearch && matchBelt;
  });

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormState({
      name: '',
      nis: (2026100 + (students?.length || 0) + 1).toString(),
      classGrade: 'X',
      gender: 'L',
      beltLevel: 'Putih / Dasar',
      phone: '',
      parentPhone: '',
      status: 'Aktif',
      skillRatings: { fisik: 80, teknik: 80, seni: 80, tanding: 80, disiplin: 85 },
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormState({
      nis: student.nis || '',
      name: student.name || '',
      classGrade: student.classGrade || '',
      gender: student.gender || 'L',
      beltLevel: student.beltLevel || 'Putih / Dasar',
      phone: student.phone || '',
      parentPhone: student.parentPhone || '',
      status: student.status || 'Aktif',
      skillRatings: student.skillRatings
        ? { ...student.skillRatings }
        : { fisik: 80, teknik: 80, seni: 80, tanding: 80, disiplin: 85 },
    });
    setIsAddOpen(true);
  };

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
  };

  const handleConfirmDelete = () => {
    if (!studentToDelete) return;
    const updated = students.filter(s => s.id !== studentToDelete.id);
    onSaveStudents(updated);
    if (selectedStudentId === studentToDelete.id) {
      setSelectedStudentId(updated[0]?.id || '');
    }
    setStudentToDelete(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name?.trim() || !formState.nis?.trim()) return;

    if (editingStudent) {
      const updated = students.map(s =>
        s.id === editingStudent.id ? ({ ...s, ...formState } as Student) : s
      );
      onSaveStudents(updated);
    } else {
      const newStd: Student = {
        id: 'std-' + Date.now(),
        nis: formState.nis.trim(),
        name: formState.name.trim(),
        classGrade: formState.classGrade || 'X',
        gender: formState.gender || 'L',
        beltLevel: formState.beltLevel || 'Putih / Dasar',
        phone: formState.phone || '-',
        parentPhone: formState.parentPhone || '-',
        status: formState.status || 'Aktif',
        skillRatings: formState.skillRatings || {
          fisik: 80,
          teknik: 80,
          seni: 80,
          tanding: 80,
          disiplin: 85,
        },
      };
      onSaveStudents([...students, newStd]);
    }
    setIsAddOpen(false);
    setEditingStudent(null);
  };

  const handleSaveSkills = () => {
    if (!currentStudent) return;
    const updated = students.map(s =>
      s.id === currentStudent.id
        ? {
            ...s,
            skillRatings: skillState,
          }
        : s
    );
    onSaveStudents(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleUpdateStudentBelt = (newBelt: BeltLevel) => {
    if (!currentStudent) return;
    const updated = students.map(s =>
      s.id === currentStudent.id
        ? {
            ...s,
            beltLevel: newBelt,
          }
        : s
    );
    onSaveStudents(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Radar Data for current student
  const radarData = [
    { subject: 'Fisik & Stamina', score: skillState.fisik || 80, fullMark: 100 },
    { subject: 'Teknik Gerak', score: skillState.teknik || 80, fullMark: 100 },
    { subject: 'Seni & Jurus', score: skillState.seni || 80, fullMark: 100 },
    { subject: 'Tanding / Sparring', score: skillState.tanding || 80, fullMark: 100 },
    { subject: 'Disiplin & Mental', score: skillState.disiplin || 85, fullMark: 100 },
  ];

  // Attendance history for current student
  const studentLogs = currentStudent
    ? (logs || []).map(log => {
        const att = log.attendance?.find(a => a.studentId === currentStudent.id);
        return {
          logId: log.id,
          number: log.number,
          date: log.date,
          day: log.day,
          trainingType: log.trainingType,
          category: log.category,
          status: att ? att.status : 'alpa',
          score: att?.score || 85,
          notes: att?.notes || '-',
        };
      })
    : [];

  const studentHadirCount = studentLogs.filter(l => l.status === 'hadir').length;
  const studentAttRate = totalLogsCount > 0 ? Math.round((studentHadirCount / totalLogsCount) * 100) : 0;

  const avgSkill = Math.round(
    ((skillState.fisik || 80) + (skillState.teknik || 80) + (skillState.seni || 80) + (skillState.tanding || 80) + (skillState.disiplin || 85)) / 5
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar with Back Button & Sub-Tab Switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-purple-900/40">
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
              <Users className="w-5 h-5 text-blue-400" />
              Panel Siswa & Atlet Silat
            </h2>
            <p className="text-[11px] text-purple-300/80 font-medium">
              Kelola data pesilat, presensi latihan, tingkatan sabuk, dan evaluasi radar performa
            </p>
          </div>
        </div>

        {/* Integrated Sub-Tabs: Presensi vs Tingkatan Sabuk */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-purple-900/50 self-start md:self-auto">
          <button
            onClick={() => setSubTab('presensi')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'presensi'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-600 text-white shadow-md border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-yellow-300" />
            <span>Data & Presensi</span>
          </button>

          <button
            onClick={() => setSubTab('sabuk')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              subTab === 'sabuk'
                ? 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white shadow-md border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-yellow-300" />
            <span>Tingkatan Sabuk & Radar</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PRESENSI & DAFTAR SISWA */}
      {subTab === 'presensi' && (
        <div className="space-y-6">
          {/* Action & Filter Toolbar */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/20 via-slate-900/90 to-black border border-purple-900/40 shadow-lg flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nama siswa, NIS, atau kelas..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950/90 border border-purple-900/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans"
                />
              </div>

              <select
                value={beltFilter}
                onChange={e => setBeltFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-950/90 border border-purple-900/50 rounded-lg text-slate-200 focus:outline-none focus:border-purple-500 font-mono text-[11px]"
              >
                <option value="all">Semua Tingkatan Sabuk</option>
                {Object.keys(BELT_COLORS).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {onOpenQRScanner && (
                <button
                  onClick={onOpenQRScanner}
                  className="bg-purple-950/80 hover:bg-purple-900 text-yellow-300 text-xs px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 active:scale-95 border border-purple-700/80 hover:border-yellow-500/80 cursor-pointer"
                >
                  <ScanLine className="w-4 h-4 text-yellow-400 animate-pulse" />
                  Scan QR Absensi
                </button>
              )}

              {onOpenStudentQR && (
                <button
                  onClick={() => onOpenStudentQR()}
                  className="bg-slate-900 hover:bg-slate-800 text-blue-300 text-xs px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 active:scale-95 border border-blue-900/60 hover:border-blue-500/50 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-yellow-400" />
                  Kartu QR Siswa
                </button>
              )}

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-yellow-300 text-xs px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 active:scale-95 border border-purple-900/60 hover:border-yellow-500/50 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-yellow-400" />
                Impor Excel
              </button>

              <button
                onClick={handleOpenAdd}
                className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white text-xs px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all shadow-md shadow-purple-950/50 flex items-center gap-2 active:scale-95 cursor-pointer border border-purple-500/40"
              >
                <UserPlus className="w-4 h-4 text-yellow-300" />
                Tambah Atlet
              </button>
            </div>
          </div>

          {/* Roster & Attendance Table */}
          <div className="rounded-xl bg-gradient-to-br from-purple-950/20 via-slate-900/90 to-black border border-purple-900/40 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-purple-300 uppercase font-mono text-[10px] tracking-wider border-b border-purple-900/40">
                  <tr>
                    <th className="px-4 py-3.5">NIS & Nama Siswa</th>
                    <th className="px-4 py-3.5">Kelas & JK</th>
                    <th className="px-4 py-3.5">Tingkatan Sabuk</th>
                    <th className="px-4 py-3.5 text-center">Hadir</th>
                    <th className="px-4 py-3.5 text-center">Izin</th>
                    <th className="px-4 py-3.5 text-center">Sakit</th>
                    <th className="px-4 py-3.5 text-center">Alpa</th>
                    <th className="px-4 py-3.5 text-center">% Kehadiran</th>
                    <th className="px-4 py-3.5 text-right">Aksi & Performa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-950/50">
                  {filteredStats.map(({ student, hadir, izin, sakit, alpa, rate }) => (
                    <tr key={student.id} className="hover:bg-purple-950/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-100 text-sm">{student.name}</div>
                        <div className="text-[10px] text-yellow-400/80 font-mono">NIS: {student.nis}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-300">{student.classGrade}</div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono border ${
                            BELT_COLORS[student.beltLevel] || 'bg-slate-800 text-white'
                          }`}
                        >
                          {student.beltLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-emerald-400 font-mono">{hadir}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-amber-400 font-mono">{izin}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-blue-400 font-mono">{sakit}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={alpa > 0 ? 'text-rose-400 font-bold font-mono' : 'text-slate-600 font-mono'}>{alpa}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${
                              rate >= 85
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                                : rate >= 70
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                            }`}
                          >
                            {rate}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                rate >= 85 ? 'bg-emerald-500' : rate >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {onOpenStudentQR && (
                            <button
                              onClick={() => onOpenStudentQR(student.id)}
                              className="px-2 py-1 bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/80 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                              title="Lihat & Unduh Kartu QR Atlet"
                            >
                              <QrCode className="w-3 h-3 text-yellow-400" />
                              Kartu QR
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedStudentId(student.id);
                              setSubTab('sabuk');
                              if (onSelectStudentForProgress) onSelectStudentForProgress(student);
                            }}
                            className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-900 text-yellow-300 border border-purple-800/80 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                            title="Buka Evaluasi Sabuk & Radar Progres"
                          >
                            <Award className="w-3 h-3 text-yellow-400" />
                            Sabuk & Radar
                          </button>
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                            title="Edit Biodata"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(student)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 cursor-pointer"
                            title="Hapus Siswa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: TINGKATAN SABUK & EVALUASI RADAR */}
      {subTab === 'sabuk' && currentStudent && (
        <div className="space-y-6">
          {/* Athlete Profile & Belt Management Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-900/90 to-black border border-purple-900/40 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-800 via-indigo-700 to-blue-900 border border-purple-500/50 flex items-center justify-center text-yellow-300 text-2xl font-black shadow-lg shrink-0">
                {currentStudent.name?.charAt(0) || 'P'}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">{currentStudent.name}</h3>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono border ${BELT_COLORS[currentStudent.beltLevel] || 'bg-slate-800 text-white'}`}>
                    {currentStudent.beltLevel}
                  </span>
                </div>
                <p className="text-xs text-purple-300/80 font-mono">
                  NIS: {currentStudent.nis} &bull; Kelas: {currentStudent.classGrade} &bull; JK: {currentStudent.gender === 'L' ? 'Putra' : 'Putri'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-300 font-mono">Ubah Sabuk:</span>
                  <select
                    value={currentStudent.beltLevel}
                    onChange={e => handleUpdateStudentBelt(e.target.value as BeltLevel)}
                    className="px-2.5 py-1 text-xs bg-slate-950 border border-purple-900/60 rounded-lg text-white font-mono focus:border-purple-500 focus:outline-none"
                  >
                    {Object.keys(BELT_COLORS).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Switch Athlete Selector & Summary Stats */}
            <div className="flex flex-wrap items-center gap-6 border-t lg:border-t-0 lg:border-l border-purple-900/40 pt-4 lg:pt-0 lg:pl-6">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-purple-300 font-mono mb-1">
                  Pilih Pesilat Lain:
                </label>
                <select
                  value={currentStudent.id}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-950 border border-purple-900/60 rounded-xl text-white font-semibold focus:border-purple-500 focus:outline-none font-mono"
                >
                  {(students || []).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.classGrade} - {s.beltLevel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Skor Rata-rata</p>
                  <p className="text-xl font-black text-yellow-400 font-mono">{avgSkill}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-mono">Kehadiran</p>
                  <p className="text-xl font-black text-emerald-400 font-mono">{studentAttRate}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Radar & Evaluation Sliders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/20 via-slate-900/90 to-black border border-purple-900/40 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Radar Diagram 5 Pilar Kompetensi Silat
                </h3>
                <p className="text-xs text-purple-300/80 mt-0.5">Analisis keseimbangan fisik, teknik, estetika seni, tanding, dan mental</p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="#3b0764" />
                    <PolarAngleAxis dataKey="subject" stroke="#cbd5e1" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={10} />
                    <Radar
                      name="Skor Atlet"
                      dataKey="score"
                      stroke="#a855f7"
                      fill="#6366f1"
                      fillOpacity={0.5}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#09071a',
                        border: '1px solid #7e22ce',
                        borderRadius: '0.5rem',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Skill Rating Slider Adjustments */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/20 via-slate-900/90 to-black border border-purple-900/40 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-400" />
                    Penilaian Kompetensi (1 - 100)
                  </h3>
                  {savedSuccess && (
                    <span className="text-xs text-yellow-300 flex items-center gap-1 font-bold font-mono uppercase bg-purple-950/90 px-2 py-0.5 rounded border border-yellow-500/50">
                      <CheckCircle className="w-3.5 h-3.5 text-yellow-400" /> Tersimpan!
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-300/80 mt-0.5">Geser skala untuk memperbarui penilaian performa atlet</p>
              </div>

              <div className="space-y-3">
                {/* Fisik */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-200 font-medium">1. Kekuatan Fisik & Stamina</span>
                    <span className="font-bold font-mono text-yellow-400">{skillState.fisik || 80} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={skillState.fisik || 80}
                    onChange={e => setSkillState({ ...skillState, fisik: parseInt(e.target.value) })}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                {/* Teknik */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-200 font-medium">2. Penguasaan Teknik Gerak</span>
                    <span className="font-bold font-mono text-yellow-400">{skillState.teknik || 80} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={skillState.teknik || 80}
                    onChange={e => setSkillState({ ...skillState, teknik: parseInt(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Seni */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-200 font-medium">3. Seni Jurus & Estetika</span>
                    <span className="font-bold font-mono text-yellow-400">{skillState.seni || 80} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={skillState.seni || 80}
                    onChange={e => setSkillState({ ...skillState, seni: parseInt(e.target.value) })}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                {/* Tanding */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-200 font-medium">4. Kemampuan Tanding / Sparring</span>
                    <span className="font-bold font-mono text-yellow-400">{skillState.tanding || 80} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={skillState.tanding || 80}
                    onChange={e => setSkillState({ ...skillState, tanding: parseInt(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* Disiplin */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-200 font-medium">5. Kedisiplinan & Karakter Pendekar</span>
                    <span className="font-bold font-mono text-yellow-400">{skillState.disiplin || 85} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={skillState.disiplin || 85}
                    onChange={e => setSkillState({ ...skillState, disiplin: parseInt(e.target.value) })}
                    className="w-full accent-yellow-500 cursor-pointer"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveSkills}
                className="w-full py-2.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-purple-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-98 border border-purple-500/40"
              >
                <Save className="w-4 h-4 text-yellow-300" />
                Simpan Penilaian Pelatih
              </button>
            </div>
          </div>

          {/* Attendance History for this Student */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/20 via-slate-900/90 to-black border border-purple-900/40 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Histori Kehadiran Latihan: {currentStudent.name}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-purple-300 uppercase font-mono text-[10px] tracking-wider border-b border-purple-900/40">
                  <tr>
                    <th className="px-4 py-3">No. Laporan</th>
                    <th className="px-4 py-3">Hari & Tanggal</th>
                    <th className="px-4 py-3">Materi / Jenis Latihan</th>
                    <th className="px-4 py-3 text-center">Status Presensi</th>
                    <th className="px-4 py-3 text-center">Nilai Sesi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-950/50">
                  {studentLogs.length > 0 ? (
                    studentLogs.map((l, idx) => (
                      <tr key={l.logId || idx} className="hover:bg-purple-950/20">
                        <td className="px-4 py-2.5 font-mono text-yellow-400">{l.number}</td>
                        <td className="px-4 py-2.5 text-slate-300">{l.day}, {l.date}</td>
                        <td className="px-4 py-2.5 font-medium text-white">{l.trainingType}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                              l.status === 'hadir'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : l.status === 'izin'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : l.status === 'sakit'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono font-bold text-yellow-400">
                          {l.score}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500 font-mono">
                        Belum ada riwayat sesi latihan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#09071a] border border-purple-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900/50 bg-slate-950/80">
              <h3 className="text-sm font-bold uppercase tracking-wide text-white">
                {editingStudent ? 'Edit Biodata Pesilat' : 'Pendaftaran Anggota Silat Baru'}
              </h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-purple-300 uppercase tracking-wider mb-1">NIS:</label>
                  <input
                    type="text"
                    required
                    value={formState.nis}
                    onChange={e => setFormState({ ...formState, nis: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-purple-900/50 rounded-lg text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-purple-300 uppercase tracking-wider mb-1">Kelas & Jurusan:</label>
                  <input
                    type="text"
                    required
                    value={formState.classGrade}
                    onChange={e => setFormState({ ...formState, classGrade: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-purple-900/50 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    placeholder="Contoh: XI RPL 1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-purple-300 uppercase tracking-wider mb-1">Nama Lengkap:</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={e => setFormState({ ...formState, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-purple-900/50 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-purple-300 uppercase tracking-wider mb-1">Tingkatan Sabuk:</label>
                  <select
                    value={formState.beltLevel}
                    onChange={e => setFormState({ ...formState, beltLevel: e.target.value as BeltLevel })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-purple-900/50 rounded-lg text-white focus:border-purple-500 focus:outline-none font-mono text-[11px]"
                  >
                    {Object.keys(BELT_COLORS).map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-purple-300 uppercase tracking-wider mb-1">Jenis Kelamin:</label>
                  <select
                    value={formState.gender}
                    onChange={e => setFormState({ ...formState, gender: e.target.value as 'L' | 'P' })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-purple-900/50 rounded-lg text-white focus:border-purple-500 focus:outline-none font-mono text-[11px]"
                  >
                    <option value="L">Laki-laki (Putra)</option>
                    <option value="P">Perempuan (Putri)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-purple-300 uppercase tracking-wider mb-1">No. WhatsApp Siswa:</label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={e => setFormState({ ...formState, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-purple-900/50 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    placeholder="08123456789"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-purple-300 uppercase tracking-wider mb-1">No. WhatsApp Wali:</label>
                  <input
                    type="text"
                    value={formState.parentPhone}
                    onChange={e => setFormState({ ...formState, parentPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-purple-900/50 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                    placeholder="08139876543"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-purple-900/50 space-y-2">
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-yellow-400">Penilaian Keterampilan Silat Awal (1 - 100):</p>
                <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                  <div>
                    <label className="block text-purple-300 mb-0.5 font-mono">Fisik</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formState.skillRatings?.fisik || 80}
                      onChange={e =>
                        setFormState({
                          ...formState,
                          skillRatings: { ...formState.skillRatings!, fisik: parseInt(e.target.value) || 80 },
                        })
                      }
                      className="w-full text-center py-1 bg-slate-900 border border-purple-900/60 rounded text-yellow-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-purple-300 mb-0.5 font-mono">Teknik</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formState.skillRatings?.teknik || 80}
                      onChange={e =>
                        setFormState({
                          ...formState,
                          skillRatings: { ...formState.skillRatings!, teknik: parseInt(e.target.value) || 80 },
                        })
                      }
                      className="w-full text-center py-1 bg-slate-900 border border-purple-900/60 rounded text-yellow-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-purple-300 mb-0.5 font-mono">Seni</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formState.skillRatings?.seni || 80}
                      onChange={e =>
                        setFormState({
                          ...formState,
                          skillRatings: { ...formState.skillRatings!, seni: parseInt(e.target.value) || 80 },
                        })
                      }
                      className="w-full text-center py-1 bg-slate-900 border border-purple-900/60 rounded text-yellow-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-purple-300 mb-0.5 font-mono">Tanding</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formState.skillRatings?.tanding || 80}
                      onChange={e =>
                        setFormState({
                          ...formState,
                          skillRatings: { ...formState.skillRatings!, tanding: parseInt(e.target.value) || 80 },
                        })
                      }
                      className="w-full text-center py-1 bg-slate-900 border border-purple-900/60 rounded text-yellow-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-purple-300 mb-0.5 font-mono">Disiplin</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formState.skillRatings?.disiplin || 85}
                      onChange={e =>
                        setFormState({
                          ...formState,
                          skillRatings: { ...formState.skillRatings!, disiplin: parseInt(e.target.value) || 85 },
                        })
                      }
                      className="w-full text-center py-1 bg-slate-900 border border-purple-900/60 rounded text-yellow-300 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-purple-900/40">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white rounded-xl uppercase tracking-wider shadow-lg shadow-purple-950/50 transition-all cursor-pointer border border-purple-500/40"
                >
                  Simpan Data Pesilat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#09071a] border-2 border-rose-600/70 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-600/60 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-tight">Hapus Data Atlet / Siswa</h3>
                <p className="text-xs text-rose-300 font-mono">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-900/40 text-xs space-y-1">
              <p className="text-slate-300">
                Apakah Anda yakin ingin menghapus data siswa:
              </p>
              <p className="text-sm font-bold text-yellow-300 uppercase">{studentToDelete.name}</p>
              <p className="text-[11px] text-slate-400 font-mono">
                NIS: {studentToDelete.nis} &bull; Kelas: {studentToDelete.classGrade} &bull; Sabuk: {studentToDelete.beltLevel}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-purple-900/40">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-900/50 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-white rounded-xl bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/60 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Students from Excel Modal */}
      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentStudents={students}
        onImportSuccess={(newStudents) => {
          onSaveStudents(newStudents);
        }}
      />
    </div>
  );
};
