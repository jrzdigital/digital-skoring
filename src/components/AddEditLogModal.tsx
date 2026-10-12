import React, { useState } from 'react';
import { TrainingLog, Student, TrainingPhoto, StudentAttendanceRecord } from '../types';
import { CameraCaptureModal } from './CameraCaptureModal';
import { compressImage } from '../utils/imageCompressor';
import { X, Check, Camera, Upload, Trash2, Sparkles, BookOpen, Users, Loader2 } from 'lucide-react';

interface AddEditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: TrainingLog) => void;
  initialLog?: TrainingLog | null;
  students: Student[];
  nextNumber?: string;
}

const PRESET_TECHNIQUES = [
  {
    type: 'Kuda-Kuda Dasar & Pola Langkah 8 Penjuru Angin',
    category: 'Dasar' as const,
    fn: 'Melatih kekuatan otot tungkai kaki, stabilitas titik berat tubuh (keseimbangan), dan kesiapan manuver perpindahan gerak bertahan maupun menyerang.',
  },
  {
    type: 'Teknik Pukulan Lurus, Bandul, Tegak, & Tangkisan Luar/Dalam',
    category: 'Teknik/Tanding' as const,
    fn: 'Melatih kecepatan pukulan bersumber dari putaran pinggang, akurasi sasaran titik vital, serta refleks tangkisan spontan terhadap serangan lawan.',
  },
  {
    type: 'Pendalaman Jurus Tunggal Baku IPSI (Tangan Kosong & Senjata Golok)',
    category: 'Seni Tunggal/Ganda' as const,
    fn: 'Membangun penghayatan seni beladiri pencak silat, keselarasan ritme gerak estetika & ketegasan, serta mematangkan kekayaan teknik gerak tradisi.',
  },
  {
    type: 'Latihan Fisik Sirkuit, Tendangan Sabit/T/Belakang & Guntingan Tanding',
    category: 'Fisik' as const,
    fn: 'Meningkatkan VO2 Max, ledakan daya tahan aerobik, kelenturan sendi panggul, serta teknik sapuan dan guntingan jatuh aman pada matras standar IPSI.',
  },
  {
    type: 'Pernapasan Pengolahan Tenaga Dalam & Ketenangan Batin',
    category: 'Pernapasan' as const,
    fn: 'Melatih konsentrasi pemusatan pikiran, relaksasi otot setelah latihan intensif, ketenangan emosi spiritual pesilat, serta percepatan pemulihan fisik.',
  },
  {
    type: 'Simulasi Sambung Tanding (Sparring) Sistem Poin IPSI',
    category: 'Teknik/Tanding' as const,
    fn: 'Mengasah mental tanding di arena gelanggang, aplikasi teknik serang bela riil, timing counter attack, dan pemahaman regulasi perwasitan silat.',
  }
];

export const AddEditLogModal: React.FC<AddEditLogModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialLog,
  students,
  nextNumber = '01',
}) => {
  const getDayName = (dateStr: string) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const d = new Date(dateStr);
    return isNaN(d.getDay()) ? 'Selasa' : days[d.getDay()];
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const [number, setNumber] = useState<string>(initialLog?.number || nextNumber);
  const [date, setDate] = useState<string>(initialLog?.date || todayStr);
  const [day, setDay] = useState<string>(initialLog?.day || getDayName(todayStr));
  const [startTime, setStartTime] = useState<string>(initialLog?.startTime || '15:30');
  const [endTime, setEndTime] = useState<string>(initialLog?.endTime || '17:30');
  const [category, setCategory] = useState<TrainingLog['category']>(initialLog?.category || 'Teknik/Tanding');
  const [trainingType, setTrainingType] = useState<string>(initialLog?.trainingType || '');
  const [functionDescription, setFunctionDescription] = useState<string>(initialLog?.functionDescription || '');
  const [location, setLocation] = useState<string>(initialLog?.location || 'Lapangan Upacara & Aula Olahraga');
  const [coachNotes, setCoachNotes] = useState<string>(initialLog?.coachNotes || '');
  const [photos, setPhotos] = useState<TrainingPhoto[]>(initialLog?.photos || []);

  // Attendance state
  const [attendance, setAttendance] = useState<StudentAttendanceRecord[]>(() => {
    if (initialLog?.attendance && initialLog.attendance.length > 0) {
      return initialLog.attendance;
    }
    return students.map(s => ({
      studentId: s.id,
      status: 'hadir',
      score: 90,
      notes: '',
    }));
  });

  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'attendance' | 'photos'>('details');

  if (!isOpen) return null;

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setDay(getDayName(newDate));
  };

  const handlePresetSelect = (preset: typeof PRESET_TECHNIQUES[0]) => {
    setTrainingType(preset.type);
    setCategory(preset.category);
    setFunctionDescription(preset.fn);
  };

  const handleCameraCapture = async (photoBase64: string, caption: string) => {
    try {
      // Compress snapshot to ensure ultra fast rendering and zero memory lockup
      const compressed = await compressImage(photoBase64, 1080, 1080, 0.75);
      const newPhoto: TrainingPhoto = {
        id: 'photo-' + Date.now(),
        url: compressed || photoBase64,
        caption: caption || 'Dokumentasi Latihan Silat',
        timestamp: `${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
      };
      setPhotos(prev => [newPhoto, ...prev]);
    } catch (err) {
      console.warn('Error compressing camera photo:', err);
      const newPhoto: TrainingPhoto = {
        id: 'photo-' + Date.now(),
        url: photoBase64,
        caption: caption || 'Dokumentasi Latihan Silat',
        timestamp: `${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
      };
      setPhotos(prev => [newPhoto, ...prev]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImages(true);
    try {
      const fileList: File[] = Array.from(files);
      const processedPhotos: TrainingPhoto[] = [];

      for (const file of fileList) {
        try {
          const compressedUrl = await compressImage(file, 1080, 1080, 0.75);
          if (compressedUrl) {
            processedPhotos.push({
              id: 'photo-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now(),
              url: compressedUrl,
              caption: file.name.replace(/\.[^/.]+$/, ''),
              timestamp: `${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
            });
          }
        } catch (fileErr) {
          console.warn('Error processing image file:', file.name, fileErr);
        }
      }

      if (processedPhotos.length > 0) {
        setPhotos(prev => [...processedPhotos, ...prev]);
      }
    } finally {
      setIsUploadingImages(false);
      // Reset input value so same files can be re-selected if desired
      e.target.value = '';
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const updateAttendanceStatus = (studentId: string, status: StudentAttendanceRecord['status']) => {
    setAttendance(prev =>
      prev.map(a => (a.studentId === studentId ? { ...a, status } : a))
    );
  };

  const setAllAttendance = (status: StudentAttendanceRecord['status']) => {
    setAttendance(prev => prev.map(a => ({ ...a, status })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newLog: TrainingLog = {
        id: initialLog?.id || 'log-' + Date.now(),
        number: number.trim() || nextNumber,
        day: day.trim() || 'Selasa',
        date: date || todayStr,
        startTime: startTime || '15:30',
        endTime: endTime || '17:30',
        trainingType: trainingType.trim() || 'Latihan Rutin Silat',
        category,
        functionDescription: functionDescription.trim() || 'Peningkatan teknik dan fisik beladiri silat.',
        coachNotes: coachNotes.trim(),
        location: location.trim() || 'Lapangan Sekolah',
        photos: photos || [],
        attendance: attendance || [],
        createdAt: initialLog?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onSave(newLog);
      onClose();
    } catch (err) {
      console.error('Failed to save log:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md">
        <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-tight">
                  {initialLog ? 'Edit Laporan Latihan Pencak Silat' : 'Entri Laporan Latihan Baru'}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Laporan resmi berisikan nomor, jenis materi silat, fungsi, foto, dan absensi</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-zinc-800 px-6 bg-zinc-900/40">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-red-600 text-red-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              1. Rincian Materi & Fungsi
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('photos')}
              className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'photos'
                  ? 'border-red-600 text-red-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Camera className="w-4 h-4" />
              2. Dokumentasi Foto ({photos.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'attendance'
                  ? 'border-red-600 text-red-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-4 h-4" />
              3. Presensi Kehadiran ({attendance.filter(a => a.status === 'hadir').length}/{students.length})
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 bg-zinc-950/80">
            {activeTab === 'details' && (
              <div className="space-y-5">
                {/* Number, Date, Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Nomor Laporan:
                    </label>
                    <input
                      type="text"
                      value={number}
                      onChange={e => setNumber(e.target.value)}
                      required
                      placeholder="01"
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono focus:outline-none focus:border-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Tanggal Latihan:
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => handleDateChange(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Hari:
                    </label>
                    <input
                      type="text"
                      value={day}
                      onChange={e => setDay(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Jam Latihan:
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="w-full px-2 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 text-center font-mono"
                      />
                      <span className="text-zinc-500 text-xs">-</span>
                      <input
                        type="time"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="w-full px-2 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 text-center font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Suggestions Quick Chips */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold uppercase tracking-wider mb-2 font-mono">
                    <Sparkles className="w-3.5 h-3.5" />
                    Pilih Cepat Contoh Materi Latihan Pencak Silat:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TECHNIQUES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className="px-2.5 py-1 text-[11px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors text-left cursor-pointer"
                      >
                        ⚡ {preset.type.split('&')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Jenis Latihan & Kategori */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Jenis Latihan (Materi / Jurus / Gerakan):
                    </label>
                    <input
                      type="text"
                      value={trainingType}
                      onChange={e => setTrainingType(e.target.value)}
                      required
                      placeholder="Contoh: Kuda-Kuda Dasar, Tangkisan Dalam, Jurus Tunggal IPSI"
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Kategori Silat:
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as TrainingLog['category'])}
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 font-mono text-[11px]"
                    >
                      <option value="Dasar">Dasar (Kuda-kuda/Langkah)</option>
                      <option value="Fisik">Fisik & Daya Tahan</option>
                      <option value="Teknik/Tanding">Teknik / Sambung Tanding</option>
                      <option value="Seni Tunggal/Ganda">Seni Tunggal / Ganda / Regu</option>
                      <option value="Pernapasan">Pernapasan & Tenaga Dalam</option>
                      <option value="Ujian Kenaikan Tingkat">Ujian Kenaikan Tingkat</option>
                    </select>
                  </div>
                </div>

                {/* Fungsi / Manfaat Latihan */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Fungsi & Tujuan Latihan (Untuk Kurikulum Sekolah):
                  </label>
                  <textarea
                    rows={3}
                    value={functionDescription}
                    onChange={e => setFunctionDescription(e.target.value)}
                    required
                    placeholder="Jelaskan fungsi anatomis, biomekanik, kedisiplinan mental, dan manfaat bagi siswa..."
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                {/* Lokasi & Catatan Pelatih */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Lokasi / Tempat Latihan:
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Lapangan Olahraga / Aula Indoor"
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Catatan Evaluasi Khusus Pelatih:
                    </label>
                    <input
                      type="text"
                      value={coachNotes}
                      onChange={e => setCoachNotes(e.target.value)}
                      placeholder="Catatan perkembangan atlet, ketepatan gerak, dsb."
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-900/60 rounded-lg border border-zinc-800">
                  <div>
                    <h4 className="text-sm font-semibold text-white uppercase tracking-tight">Unggah & Tangkap Foto Latihan</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Otomatis dioptimasi cepat & jernih untuk lembar laporan resmi</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-red-900/20 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Ambil Foto (Kamera)
                    </button>

                    <label className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-zinc-800">
                      {isUploadingImages ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      {isUploadingImages ? 'Mengoptimasi...' : 'Unggah File'}
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        disabled={isUploadingImages}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {photos.length === 0 ? (
                  <div className="p-10 text-center border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/20 flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-zinc-600" />
                    <p className="text-xs text-zinc-400">Belum ada foto dokumentasi untuk sesi latihan ini.</p>
                    <p className="text-[11px] text-zinc-500 font-mono">Gunakan tombol kamera atau unggah berkas dari perangkat Anda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((photo, idx) => (
                      <div
                        key={photo.id || idx}
                        className="group relative bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden shadow-lg"
                      >
                        <div className="aspect-video w-full overflow-hidden bg-black">
                          <img
                            src={photo.url}
                            alt={photo.caption}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-2.5">
                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) => {
                              const newCaption = e.target.value;
                              setPhotos(prev =>
                                prev.map(p => (p.id === photo.id ? { ...p, caption: newCaption } : p))
                              );
                            }}
                            placeholder="Keterangan foto..."
                            className="w-full px-2 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded text-white focus:outline-none focus:border-red-600"
                          />
                          <div className="flex items-center justify-between mt-1.5 text-[10px] text-zinc-500 font-mono">
                            <span>{photo.timestamp || 'WIB'}</span>
                            <button
                              type="button"
                              onClick={() => removePhoto(photo.id)}
                              className="text-red-500 hover:text-red-400 flex items-center gap-1 font-bold uppercase cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900/60 rounded-lg border border-zinc-800">
                  <div className="text-xs text-zinc-300 font-mono">
                    Presensi Siswa: <strong className="text-red-400">{attendance.filter(a => a.status === 'hadir').length}</strong> Hadir dari total <strong>{students.length}</strong> anggota
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAllAttendance('hadir')}
                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded transition-colors font-mono cursor-pointer"
                    >
                      ✓ Semua Hadir
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllAttendance('izin')}
                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/80 rounded transition-colors font-mono cursor-pointer"
                    >
                      Semua Izin
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {students.map((student) => {
                    const record = attendance.find(a => a.studentId === student.id) || {
                      studentId: student.id,
                      status: 'hadir',
                    };

                    return (
                      <div
                        key={student.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white uppercase tracking-tight">{student.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider bg-red-950/80 text-red-300 border border-red-800/80">
                              {student.beltLevel}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-mono">
                            NIS: {student.nis} | Kelas: {student.classGrade}
                          </p>
                        </div>

                        {/* Status Buttons */}
                        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-md border border-zinc-800">
                          {(['hadir', 'izin', 'sakit', 'alpa'] as const).map(st => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => updateAttendanceStatus(student.id, st)}
                              className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded font-mono transition-all cursor-pointer ${
                                record.status === st
                                  ? st === 'hadir'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : st === 'izin'
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : st === 'sakit'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-red-700 text-white shadow-sm'
                                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors font-mono cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingImages}
                className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg shadow-lg shadow-red-900/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isSubmitting ? 'Menyimpan...' : 'Simpan & Rekam Laporan'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Camera Live Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </>
  );
};
