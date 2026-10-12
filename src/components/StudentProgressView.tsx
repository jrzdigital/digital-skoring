import React, { useState } from 'react';
import { Student, TrainingLog } from '../types';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { TrendingUp, User, Award, Shield, CheckCircle, Save, Sparkles, Phone, ArrowLeft } from 'lucide-react';

interface StudentProgressViewProps {
  students: Student[];
  logs: TrainingLog[];
  selectedStudent: Student | null;
  onSelectStudent: (student: Student) => void;
  onUpdateStudent: (updatedStudent: Student) => void;
  onBackToAttendance: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const StudentProgressView: React.FC<StudentProgressViewProps> = ({
  students,
  logs,
  selectedStudent,
  onSelectStudent,
  onUpdateStudent,
  onBackToAttendance,
  onNavigateToTab,
}) => {
  const currentStudent = selectedStudent || students[0];
  const [skillState, setSkillState] = useState(currentStudent?.skillRatings || {
    fisik: 85,
    teknik: 85,
    seni: 85,
    tanding: 85,
    disiplin: 90,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync skill state when student changes
  React.useEffect(() => {
    if (currentStudent) {
      setSkillState(currentStudent.skillRatings);
    }
  }, [currentStudent?.id]);

  if (!currentStudent) {
    return <div className="p-8 text-neutral-400 text-center">Tidak ada data siswa.</div>;
  }

  // Radar Data
  const radarData = [
    { subject: 'Fisik & Stamina', score: skillState.fisik, fullMark: 100 },
    { subject: 'Teknik Gerak', score: skillState.teknik, fullMark: 100 },
    { subject: 'Seni & Jurus', score: skillState.seni, fullMark: 100 },
    { subject: 'Tanding / Sparring', score: skillState.tanding, fullMark: 100 },
    { subject: 'Disiplin & Mental', score: skillState.disiplin, fullMark: 100 },
  ];

  // Attendance history for this student
  const studentLogs = logs.map(log => {
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
  });

  const totalSessions = logs.length;
  const hadirCount = studentLogs.filter(l => l.status === 'hadir').length;
  const attendanceRate = totalSessions > 0 ? Math.round((hadirCount / totalSessions) * 100) : 0;

  const avgSkill = Math.round(
    (skillState.fisik + skillState.teknik + skillState.seni + skillState.tanding + skillState.disiplin) / 5
  );

  const handleSaveSkills = () => {
    const updated = {
      ...currentStudent,
      skillRatings: skillState,
    };
    onUpdateStudent(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          {onNavigateToTab && (
            <button
              onClick={() => onNavigateToTab('landing')}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 hover:border-red-600 text-zinc-200 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-md active:scale-95 group cursor-pointer"
              title="Kembali ke Halaman Utama"
            >
              <ArrowLeft className="w-4 h-4 text-red-500 group-hover:-translate-x-1 transition-transform" />
              <span>Kembali ke Beranda</span>
            </button>
          )}
          <button
            onClick={onBackToAttendance}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
          >
            Daftar Siswa
          </button>
          <div className="h-6 w-px bg-zinc-800 hidden sm:block" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-500" />
              Evaluasi Radar & Performa Atlet
            </h2>
            <p className="text-[11px] text-zinc-400">
              Analisis 5 pilar kompetensi Pencak Silat & catatan pelatih
            </p>
          </div>
        </div>

        {/* Student Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Pilih Pesilat:</span>
          <select
            value={currentStudent.id}
            onChange={e => {
              const std = students.find(s => s.id === e.target.value);
              if (std) onSelectStudent(std);
            }}
            className="px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white font-semibold focus:border-red-600 focus:outline-none font-mono text-[11px]"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.classGrade} - {s.beltLevel})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Athlete Profile Card */}
      <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-800 to-zinc-950 border border-red-700/50 flex items-center justify-center text-white text-2xl font-black shadow-lg">
            {currentStudent.name.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">{currentStudent.name}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-950/80 text-red-300 border border-red-800/80 font-mono">
                {currentStudent.beltLevel}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              NIS: {currentStudent.nis} &bull; Kelas: {currentStudent.classGrade} &bull; JK: {currentStudent.gender === 'L' ? 'Putra' : 'Putri'}
            </p>
            <p className="text-[11px] text-zinc-500 flex items-center gap-2 font-mono">
              <Phone className="w-3 h-3 text-emerald-400" />
              Siswa: {currentStudent.phone || '-'} | Ortu: {currentStudent.parentPhone || '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono">Rata-rata Skor</p>
            <p className="text-2xl font-black text-red-400 font-mono">{avgSkill}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono">Kehadiran</p>
            <p className="text-2xl font-black text-emerald-400 font-mono">{attendanceRate}%</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono">Predikat</p>
            <p className="text-xs font-bold text-zinc-200 px-2.5 py-1 bg-zinc-950 rounded border border-zinc-800 font-mono uppercase">
              {avgSkill >= 90 ? 'Pendekar A' : avgSkill >= 80 ? 'Sangat Baik' : 'Cukup'}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Radar & Bar Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-500" />
              Radar Diagram Kompetensi Pesilat
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Keseimbangan antara kemampuan fisik, teknik, dan estetika seni</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="subject" stroke="#a1a1aa" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#3f3f46" fontSize={10} />
                <Radar
                  name="Skor Atlet"
                  dataKey="score"
                  stroke="#dc2626"
                  fill="#dc2626"
                  fillOpacity={0.45}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    border: '1px solid #27272a',
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
        <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Penilaian Pelatih (1 - 100)
              </h3>
              {savedSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold font-mono uppercase">
                  <CheckCircle className="w-3.5 h-3.5" /> Tersimpan!
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">Perbarui skor performa siswa setelah evaluasi mingguan</p>
          </div>

          <div className="space-y-3.5">
            {/* Fisik */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">1. Kekuatan Fisik & Stamina</span>
                <span className="font-bold font-mono text-red-400">{skillState.fisik} / 100</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={skillState.fisik}
                onChange={e => setSkillState({ ...skillState, fisik: parseInt(e.target.value) })}
                className="w-full accent-red-600"
              />
            </div>

            {/* Teknik */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">2. Penguasaan Teknik Gerak</span>
                <span className="font-bold font-mono text-red-400">{skillState.teknik} / 100</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={skillState.teknik}
                onChange={e => setSkillState({ ...skillState, teknik: parseInt(e.target.value) })}
                className="w-full accent-red-600"
              />
            </div>

            {/* Seni */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">3. Seni Jurus & Estetika</span>
                <span className="font-bold font-mono text-red-400">{skillState.seni} / 100</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={skillState.seni}
                onChange={e => setSkillState({ ...skillState, seni: parseInt(e.target.value) })}
                className="w-full accent-red-600"
              />
            </div>

            {/* Tanding */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">4. Kemampuan Tanding / Sparring</span>
                <span className="font-bold font-mono text-red-400">{skillState.tanding} / 100</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={skillState.tanding}
                onChange={e => setSkillState({ ...skillState, tanding: parseInt(e.target.value) })}
                className="w-full accent-red-600"
              />
            </div>

            {/* Disiplin */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300 font-medium">5. Kedisiplinan & Karakter Pendekar</span>
                <span className="font-bold font-mono text-red-400">{skillState.disiplin} / 100</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={skillState.disiplin}
                onChange={e => setSkillState({ ...skillState, disiplin: parseInt(e.target.value) })}
                className="w-full accent-red-600"
              />
            </div>
          </div>

          <button
            onClick={handleSaveSkills}
            className="w-full py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Simpan Nilai Performa
          </button>
        </div>
      </div>

      {/* Attendance History for this Student */}
      <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Histori Presensi Sesi Latihan ({currentStudent.name})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">No. Laporan</th>
                <th className="px-4 py-3">Hari / Tanggal</th>
                <th className="px-4 py-3">Materi Latihan</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Catatan Pelatih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {studentLogs.map(l => (
                <tr key={l.logId} className="hover:bg-zinc-900/60 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-red-400 text-xs font-bold">{l.number}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-zinc-400">{l.day}, {l.date}</td>
                  <td className="px-4 py-2.5 text-zinc-200 font-medium">{l.trainingType}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`capitalize px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                        l.status === 'hadir'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                          : l.status === 'izin'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                          : l.status === 'sakit'
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-800/80'
                          : 'bg-red-950/80 text-red-300 border border-red-800/80'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{l.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
