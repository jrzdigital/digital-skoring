import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Student, TrainingLog, QRScanRecord, AttendanceStatus } from '../types';
import { StorageService } from '../utils/storage';
import {
  X,
  Camera,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Users,
  RefreshCw,
  Upload,
  Search,
  Volume2,
  VolumeX,
  Flame,
  Clock,
  Sparkles,
  Award,
  Zap,
  Trash2,
  Check,
} from 'lucide-react';

const BELT_BADGE_STYLES: Record<string, string> = {
  'Putih / Dasar': 'bg-white text-slate-950 border-slate-300 font-bold',
  'Hijau': 'bg-[#008000] text-white border-green-500 font-bold',
  'Biru': 'bg-[#0000FF] text-white border-blue-500 font-bold',
  'Merah / Pelatih': 'bg-[#FF0000] text-white border-red-500 font-bold',
};

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  logs: TrainingLog[];
  onSaveLogs: (logs: TrainingLog[]) => void;
  onScannedStudent?: (student: Student, scanRecord: QRScanRecord) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  students,
  logs,
  onSaveLogs,
  onScannedStudent,
}) => {
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fastMode, setFastMode] = useState<boolean>(true); // Fast continuous multi-student scan
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [recentScan, setRecentScan] = useState<{ student: Student; scan: QRScanRecord } | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<{ student: Student; scan: QRScanRecord; message: string } | null>(null);
  const [todayScans, setTodayScans] = useState<QRScanRecord[]>(() => StorageService.getTodayQRScans());
  const [manualSearch, setManualSearch] = useState<string>('');
  const [selectedLogId, setSelectedLogId] = useState<string>(logs[0]?.id || '');
  const [scanTab, setScanTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [lastScannedPayload, setLastScannedPayload] = useState<string>('');

  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Sync today's scans on open
  useEffect(() => {
    if (isOpen) {
      setTodayScans(StorageService.getTodayQRScans());
      if (logs.length > 0 && !selectedLogId) {
        setSelectedLogId(logs[0].id);
      }
    }
  }, [isOpen, logs]);

  // Play pleasant check-in sound chime with Web Audio API
  const playBeepSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      // Dual tone harmonic chime (Major third)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc2.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5

      gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  // Play duplicate scan warning buzzer sound
  const playWarningSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.setValueAtTime(220, ctx.currentTime + 0.12);

      gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // ignore
    }
  };

  // Helper to attach stream to a video element
  const attachStreamToVideo = async (video: HTMLVideoElement | null, stream: MediaStream) => {
    if (!video) return;
    try {
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      video.autoplay = true;
      
      const playPromise = video.play();
      if (playPromise !== undefined) {
        await playPromise.catch(() => {
          video.onloadedmetadata = () => {
            video.play().catch(e => console.warn('Deferred video play:', e));
          };
        });
      }
    } catch (err) {
      console.warn('Error attaching video stream:', err);
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Perangkat atau browser ini tidak mendukung akses kamera langsung (getUserMedia). Silakan gunakan mode Unggah Foto Barcode atau Cari Manual.');
      setIsCameraActive(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false,
          });
        } catch {
          // Fallback to basic video constraint
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      streamRef.current = stream;

      // Attach stream to both mobile and desktop video elements
      await Promise.all([
        attachStreamToVideo(mobileVideoRef.current, stream),
        attachStreamToVideo(desktopVideoRef.current, stream),
      ]);

      setIsCameraActive(true);
      requestScanFrame();
    } catch (err: unknown) {
      console.warn('Camera access restriction:', err);
      const isNotAllowed = err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message.toLowerCase().includes('denied') || err.message.toLowerCase().includes('not allowed'));
      
      if (isNotAllowed) {
        setCameraError('Izin akses kamera belum diberikan. Izinkan akses kamera browser Anda atau gunakan fitur Unggah Foto QR / Cari Manual di bawah.');
      } else {
        const errMsg = err instanceof Error ? err.message : String(err);
        setCameraError(`Kamera tidak dapat diakses (${errMsg}). Gunakan opsi Unggah Foto Barcode atau Cari Manual.`);
      }
      setIsCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (mobileVideoRef.current) {
      mobileVideoRef.current.srcObject = null;
    }
    if (desktopVideoRef.current) {
      desktopVideoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Continuous QR Code Scanning Loop
  const requestScanFrame = () => {
    const video = (mobileVideoRef.current && mobileVideoRef.current.readyState >= 2 && mobileVideoRef.current.videoWidth > 0)
      ? mobileVideoRef.current
      : (desktopVideoRef.current && desktopVideoRef.current.readyState >= 2 && desktopVideoRef.current.videoWidth > 0)
        ? desktopVideoRef.current
        : (mobileVideoRef.current || desktopVideoRef.current);

    const canvas = canvasRef.current;
    if (!video || !canvas) {
      if (streamRef.current && streamRef.current.active) {
        animationFrameId.current = requestAnimationFrame(requestScanFrame);
      }
      return;
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          const now = Date.now();
          // Debounce same QR scan within 2.5 seconds
          if (now - lastScanTimeRef.current > 2000 || code.data !== lastScannedPayload) {
            lastScanTimeRef.current = now;
            setLastScannedPayload(code.data);
            handleDecodedQR(code.data, 'camera_scanner');
          }
        }
      }
    }

    if (streamRef.current && streamRef.current.active) {
      animationFrameId.current = requestAnimationFrame(requestScanFrame);
    }
  };

  // Switch between front/back cameras
  const handleToggleCameraFacing = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle scanned/decoded string
  const handleDecodedQR = (rawText: string, method: 'camera_scanner' | 'image_upload' | 'manual_nis') => {
    let matchedStudent: Student | undefined;
    const cleanText = (rawText || '').trim();
    if (!cleanText) return;

    // 1. Try parse JSON format
    try {
      const parsed = JSON.parse(cleanText);
      if (parsed.id || parsed.nis) {
        matchedStudent = students.find(s => (parsed.id && s.id === parsed.id) || (parsed.nis && s.nis === parsed.nis));
      }
    } catch {
      // Not JSON format
    }

    // 2. Try parse standard text formats e.g. "SILAT:id:nis", "SILAT:nis", or "SILAT:id"
    if (!matchedStudent && cleanText.toUpperCase().startsWith('SILAT:')) {
      const parts = cleanText.split(':');
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i]?.trim();
        if (part && part !== '0') {
          matchedStudent = students.find(s => s.id === part || s.nis === part);
          if (matchedStudent) break;
        }
      }
    }

    // 3. Try parse "PS-nis-xxxx" member card code
    if (!matchedStudent && cleanText.toUpperCase().startsWith('PS-')) {
      const parts = cleanText.split('-');
      const nisPart = parts[1]?.trim();
      if (nisPart) {
        matchedStudent = students.find(s => s.nis === nisPart || s.id === nisPart);
      }
    }

    // 4. Fallback to Plain NIS or ID or Name
    if (!matchedStudent) {
      matchedStudent = students.find(
        s => s.nis === cleanText || s.id === cleanText || (s.name && s.name.toLowerCase() === cleanText.toLowerCase())
      );
    }

    if (!matchedStudent) {
      // If not recognized
      return;
    }

    // Process Attendance Record
    recordStudentAttendance(matchedStudent, method);
  };

  // Record Attendance Logic
  const recordStudentAttendance = (student: Student, method: 'camera_scanner' | 'image_upload' | 'manual_nis') => {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = now.toISOString().split('T')[0];

    // Check if student has ALREADY been scanned today (Anti-duplikasi 1x per hari)
    const existingTodayScan = todayScans.find(
      s => (s.studentId === student.id || s.studentNis === student.nis) && s.dateFormatted === dateFormatted
    );

    if (existingTodayScan) {
      // Duplicate scan detected! Block multiple attendances for the same student on the same day
      setRecentScan(null);
      setDuplicateAlert({
        student,
        scan: existingTodayScan,
        message: `Siswa "${student.name}" (NIS: ${student.nis}) SUDAH melakukan presensi hari ini pada pukul ${existingTodayScan.timeFormatted} WIB.`
      });

      // Play warning tone & vibration feedback
      playWarningSound();
      if (navigator.vibrate) {
        navigator.vibrate([150, 100, 150]);
      }
      return;
    }

    // Clear duplicate alert if any previous
    setDuplicateAlert(null);

    // Determine status (e.g. hadir vs terlambat)
    const scanRecord: QRScanRecord = {
      id: `scan-${Date.now()}-${student.id}`,
      studentId: student.id,
      studentNis: student.nis,
      studentName: student.name,
      classGrade: student.classGrade,
      beltLevel: student.beltLevel,
      timestamp: now.toISOString(),
      timeFormatted,
      dateFormatted,
      status: 'hadir',
      method,
      trainingLogId: selectedLogId || undefined,
    };

    // Save to storage
    const updatedTodayScans = StorageService.addQRScan(scanRecord);
    setTodayScans(updatedTodayScans);
    setRecentScan({ student, scan: scanRecord });

    // Play feedback sound & vibration
    playBeepSound();
    if (navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }

    // Automatically update target TrainingLog's attendance list if exists
    if (selectedLogId && logs.length > 0) {
      const updatedLogs = logs.map(l => {
        if (l.id === selectedLogId) {
          const existingAtt = l.attendance || [];
          const exists = existingAtt.some(a => a.studentId === student.id);
          const newAtt = exists
            ? existingAtt.map(a => (a.studentId === student.id ? { ...a, status: 'hadir' as AttendanceStatus } : a))
            : [...existingAtt, { studentId: student.id, status: 'hadir' as AttendanceStatus, notes: `Presensi QR (${timeFormatted})` }];
          return { ...l, attendance: newAtt, updatedAt: now.toISOString() };
        }
        return l;
      });
      onSaveLogs(updatedLogs);
    }

    if (onScannedStudent) {
      onScannedStudent(student, scanRecord);
    }

    if (!fastMode) {
      // If single scan mode, stop after one
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  // Image Upload File QR Scanning
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            handleDecodedQR(code.data, 'image_upload');
          } else {
            alert('Tidak ditemukan QR code yang valid pada gambar tersebut. Coba gambar lain dengan pencahayaan jelas.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle Manual NIS / Name Click
  const handleManualSelect = (student: Student) => {
    recordStudentAttendance(student, 'manual_nis');
  };

  // Delete / Undo a Scan
  const handleDeleteScan = (scanId: string) => {
    const filtered = todayScans.filter(s => s.id !== scanId);
    StorageService.saveQRScans(filtered);
    setTodayScans(filtered);
    if (recentScan && recentScan.scan.id === scanId) {
      setRecentScan(null);
    }
  };

  // Manage camera lifecycle based on tab and open state
  useEffect(() => {
    if (isOpen && scanTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, scanTab, facingMode]);

  if (!isOpen) return null;

  const filteredManualStudents = students.filter(s =>
    (s.name || '').toLowerCase().includes(manualSearch.toLowerCase()) ||
    (s.nis || '').includes(manualSearch) ||
    (s.classGrade || '').toLowerCase().includes(manualSearch.toLowerCase())
  );

  const scannedStudentIds = new Set(todayScans.map(s => s.studentId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in">
      {/* Hidden Canvas for Decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ========================================================================= */}
      {/* MOBILE FULL CAMERA SCANNER (sm:hidden) */}
      {/* ========================================================================= */}
      <div className="sm:hidden fixed inset-0 w-full h-[100dvh] bg-black flex flex-col overflow-hidden z-50">
        {scanTab === 'camera' && (
          <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {/* Full screen Video Element */}
            <video
              ref={mobileVideoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              autoPlay
              muted
            />

            {/* Viewfinder Target in Center */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
              <div className="relative w-72 h-72 border-2 border-yellow-400 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]">
                {/* Gold corner brackets */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-xl" />

                {/* Animated Laser Scanning Beam */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_15px_#eab308] animate-scan-beam" />
              </div>

              <span className="mt-5 px-4 py-1.5 rounded-full bg-black/75 text-yellow-300 text-xs font-mono font-bold tracking-wider backdrop-blur-md border border-yellow-500/40 shadow-lg">
                ARAHKAN QR CODE SISWA KE SINI
              </span>
            </div>

            {/* Mobile Top Minimal Floating Bar */}
            <div className="absolute top-0 inset-x-0 p-4 pt-6 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
              <button
                onClick={onClose}
                aria-label="Tutup Scanner"
                className="w-11 h-11 rounded-full bg-black/70 hover:bg-rose-900/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg cursor-pointer transition-all active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleCameraFacing}
                  className="px-3 py-2 rounded-full bg-black/70 hover:bg-purple-900/80 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95"
                >
                  <RefreshCw className="w-4 h-4 text-yellow-400" />
                  <span>Kamera</span>
                </button>

                <button
                  onClick={() => setSoundEnabled(prev => !prev)}
                  className="w-11 h-11 rounded-full bg-black/70 hover:bg-purple-900/80 text-white flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg cursor-pointer transition-all active:scale-95"
                  title={soundEnabled ? 'Suara Aktif' : 'Suara Mati'}
                >
                  {soundEnabled ? <Volume2 className="w-5 h-5 text-yellow-400" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                </button>

                <button
                  onClick={() => setScanTab('manual')}
                  className="px-3 py-2 rounded-full bg-black/70 hover:bg-blue-900/80 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-lg cursor-pointer transition-all active:scale-95"
                >
                  <Search className="w-4 h-4 text-blue-400" />
                  <span>Manual</span>
                </button>
              </div>
            </div>

            {/* Error Overlay on Mobile */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-4 z-30">
                <div className="w-16 h-16 rounded-2xl bg-rose-950/90 border-2 border-rose-600 flex items-center justify-center text-rose-400 shadow-xl">
                  <AlertCircle className="w-9 h-9 text-rose-400" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Akses Kamera Belum Tersedia</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                </div>
                <div className="flex flex-col w-full max-w-xs gap-2 pt-2">
                  <button
                    onClick={startCamera}
                    className="w-full py-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Coba Izin Kamera Lagi
                  </button>
                  <button
                    onClick={() => {
                      setScanTab('upload');
                      fileInputRef.current?.click();
                    }}
                    className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Pilih Foto QR dari Galeri
                  </button>
                  <button
                    onClick={() => setScanTab('manual')}
                    className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Search className="w-4 h-4" />
                    Presensi Manual
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Post-Scan Bottom Sheet: Tampilkan Peringatan Presensi Ganda Jika Sudah Absen */}
            {duplicateAlert && (
              <div className="absolute bottom-0 inset-x-0 z-30 p-5 bg-gradient-to-t from-slate-950 via-[#180d0d] to-slate-900/95 border-t-2 border-rose-500 rounded-t-3xl shadow-2xl backdrop-blur-xl animate-slide-up space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1.5 shadow-lg shadow-rose-950/80">
                      <AlertCircle className="w-4 h-4 text-yellow-300" />
                      PRESENSI GANDA DITOLAK
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-rose-300 bg-black/60 px-2.5 py-1 rounded-lg border border-rose-500/30">
                    Tercatat {duplicateAlert.scan.timeFormatted} WIB
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-800/60 flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-900 via-purple-900 to-slate-900 border border-rose-500/50 flex items-center justify-center text-yellow-300 text-2xl font-black shadow-lg shrink-0">
                    {duplicateAlert.student.name?.charAt(0) || 'P'}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-base font-black text-white uppercase tracking-tight truncate">
                      {duplicateAlert.student.name}
                    </h3>
                    <p className="text-xs text-rose-200/90 font-mono">
                      NIS: <span className="text-yellow-300 font-bold">{duplicateAlert.student.nis}</span> &bull; {duplicateAlert.student.classGrade}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono border ${BELT_BADGE_STYLES[duplicateAlert.student.beltLevel] || 'bg-slate-800 text-white'}`}>
                        {duplicateAlert.student.beltLevel}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
                        SUDAH ABSEN HARI INI
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 bg-black/40 p-2.5 rounded-xl border border-rose-900/40 text-center">
                  {duplicateAlert.message}
                </p>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    onClick={() => setDuplicateAlert(null)}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                  >
                    <Zap className="w-4 h-4 text-black" />
                    Lanjut Scan Siswa Lain
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider border border-purple-900/60 cursor-pointer active:scale-95 transition-transform"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Post-Scan Bottom Sheet: Tampilkan Data Siswa & Presensi Berhasil Dicatat */}
            {recentScan && !duplicateAlert && (
              <div className="absolute bottom-0 inset-x-0 z-30 p-5 bg-gradient-to-t from-slate-950 via-[#0a0718] to-slate-900/95 border-t-2 border-emerald-500 rounded-t-3xl shadow-2xl backdrop-blur-xl animate-slide-up space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 text-black flex items-center gap-1.5 shadow-lg shadow-emerald-950/80">
                      <CheckCircle2 className="w-4 h-4 text-black" />
                      PRESENSI BERHASIL DICATAT
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-yellow-300 bg-black/60 px-2.5 py-1 rounded-lg border border-yellow-500/30">
                    {recentScan.scan.timeFormatted} WIB
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-900/60 flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-800 via-indigo-700 to-blue-900 border border-purple-400/50 flex items-center justify-center text-yellow-300 text-2xl font-black shadow-lg shrink-0">
                    {recentScan.student.name?.charAt(0) || 'P'}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-base font-black text-white uppercase tracking-tight truncate">
                      {recentScan.student.name}
                    </h3>
                    <p className="text-xs text-purple-300/90 font-mono">
                      NIS: <span className="text-yellow-300 font-bold">{recentScan.student.nis}</span> &bull; {recentScan.student.classGrade}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono border ${BELT_BADGE_STYLES[recentScan.student.beltLevel] || 'bg-slate-800 text-white'}`}>
                        {recentScan.student.beltLevel}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                        ● HADIR
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    onClick={() => setRecentScan(null)}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                  >
                    <Zap className="w-4 h-4 text-black" />
                    Scan Siswa Berikutnya
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider border border-purple-900/60 cursor-pointer active:scale-95 transition-transform"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile Upload Tab */}
        {scanTab === 'upload' && (
          <div className="relative w-full h-full bg-slate-950 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-purple-900/50">
              <button
                onClick={() => setScanTab('camera')}
                className="px-3 py-1.5 rounded-xl bg-purple-950 text-yellow-300 border border-purple-800 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Kembali ke Kamera
              </button>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-auto py-8 rounded-3xl p-6 bg-slate-900/80 border-2 border-dashed border-purple-700/60 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-950 border border-purple-600 flex items-center justify-center text-yellow-400 shadow-lg">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase">Unggah Foto Barcode QR</h3>
                <p className="text-xs text-slate-400 mt-1">Pilih tangkapan layar atau foto kartu dari galeri ponsel</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-700 to-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Pilih Foto dari Ponsel
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-500 font-mono">
              Presensi otomatis tercatat begitu QR barcode terdeteksi
            </p>
          </div>
        )}

        {/* Mobile Manual Tab */}
        {scanTab === 'manual' && (
          <div className="relative w-full h-full bg-slate-950 p-4 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/50 shrink-0">
              <button
                onClick={() => setScanTab('camera')}
                className="px-3 py-1.5 rounded-xl bg-purple-950 text-yellow-300 border border-purple-800 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Kamera QR
              </button>
              <h3 className="text-xs font-bold uppercase text-white">Presensi Manual</h3>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualSearch}
                  onChange={e => setManualSearch(e.target.value)}
                  placeholder="Ketik NIS, nama siswa, atau kelas..."
                  className="w-full bg-slate-900 text-white text-xs pl-9 pr-4 py-2.5 rounded-xl border border-purple-800 focus:border-yellow-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredManualStudents.map(std => {
                const isAlreadyScanned = scannedStudentIds.has(std.id);
                return (
                  <div
                    key={std.id}
                    className="p-3 rounded-xl bg-slate-900/90 border border-purple-900/40 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-white uppercase">{std.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        NIS: {std.nis} &bull; {std.classGrade} &bull; {std.beltLevel}
                      </p>
                    </div>
                    <button
                      onClick={() => handleManualSelect(std)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer ${
                        isAlreadyScanned
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-yellow-500 text-black font-extrabold shadow-sm'
                      }`}
                    >
                      {isAlreadyScanned ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Hadir
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          Absen
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP MODAL VIEW (hidden sm:block) */}
      {/* ========================================================================= */}
      <div className="hidden sm:block relative w-full max-w-5xl bg-gradient-to-b from-[#0f0722] via-[#090518] to-black border border-purple-800/80 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh]">
        {/* Glow ambient */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 px-6 sm:px-8 py-4 border-b border-purple-900/50 flex flex-wrap items-center justify-between gap-4 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950 border border-yellow-500/80 flex items-center justify-center text-yellow-400 shadow-md shadow-purple-950/50">
              <ScanLine className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                  SCANNER ABSENSI QR SISWA
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-900/60 text-yellow-300 border border-purple-700/60">
                  REAL-TIME PRESENSI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pindai kartu QR barcode siswa untuk pencatatan kehadiran instan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              aria-label={soundEnabled ? 'Matikan Suara Beep' : 'Nyalakan Suara Beep'}
              className="p-2 rounded-xl bg-slate-900 hover:bg-purple-950 text-slate-300 hover:text-yellow-400 border border-purple-900/50 transition-colors cursor-pointer"
              title={soundEnabled ? 'Suara Presensi Aktif' : 'Suara Presensi Dimatikan'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-yellow-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Tutup Scanner"
              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-600/50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Controls Bar */}
        <div className="relative z-10 px-6 sm:px-8 py-3 bg-purple-950/30 border-b border-purple-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Method Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-purple-900/60">
            <button
              onClick={() => setScanTab('camera')}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                scanTab === 'camera'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Kamera Langsung
            </button>

            <button
              onClick={() => setScanTab('upload')}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                scanTab === 'upload'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Unggah Foto QR
            </button>

            <button
              onClick={() => setScanTab('manual')}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                scanTab === 'manual'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Cari Manual / NIS
            </button>
          </div>

          {/* Training Log Target Selector */}
          {logs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-[11px]">Sesi Latihan:</span>
              <select
                value={selectedLogId}
                onChange={e => setSelectedLogId(e.target.value)}
                aria-label="Pilih Sesi Latihan untuk Presensi"
                className="bg-slate-900 text-white text-xs rounded-xl px-3 py-1.5 border border-purple-700/60 focus:border-yellow-400 focus:outline-none cursor-pointer"
              >
                {logs.map(log => (
                  <option key={log.id} value={log.id} className="bg-slate-900 text-white">
                    No. {log.number} - {log.date} ({log.trainingType.substring(0, 24)}...)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fast Multi-Scan Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
            <input
              type="checkbox"
              checked={fastMode}
              onChange={e => setFastMode(e.target.checked)}
              className="rounded bg-slate-900 border-purple-700 text-purple-600 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-semibold text-yellow-300 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              Mode Antrian Cepat
            </span>
          </label>
        </div>

        {/* Modal Main Grid */}
        <div className="relative z-10 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[calc(85vh-130px)] overflow-y-auto">
          {/* Left Column: Live Scanner / Upload / Manual */}
          <div className="lg:col-span-7 space-y-4">
            {scanTab === 'camera' && (
              <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-purple-700/70 shadow-2xl aspect-[4/3] flex flex-col items-center justify-center">
                {/* Live Video Element */}
                <video
                  ref={desktopVideoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                />

                {/* Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  {/* Dimmed backdrop around target */}
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-yellow-400 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                    {/* Viewfinder Target Corners */}
                    <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-yellow-400 rounded-br-lg" />

                    {/* Animated Scanning Laser Beam */}
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_15px_#eab308] animate-scan-beam" />
                  </div>
                </div>

                {/* Camera Top Controls */}
                <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                  <button
                    onClick={handleToggleCameraFacing}
                    className="px-3 py-1.5 rounded-xl bg-black/70 hover:bg-purple-900/80 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />
                    Ganti Kamera
                  </button>
                </div>

                {/* Error Notice & Fallbacks */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center space-y-4 z-30">
                    <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-600 flex items-center justify-center text-rose-400 shadow-lg">
                      <AlertCircle className="w-8 h-8 text-rose-400" />
                    </div>
                    <div className="space-y-1.5 max-w-md">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">Akses Kamera Belum Tersedia</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Coba Izin Kamera Lagi
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Pilih / Ambil Foto QR
                      </button>

                      <button
                        onClick={() => setScanTab('manual')}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider border border-slate-700 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <Search className="w-3.5 h-3.5" />
                        Presensi Manual
                      </button>
                    </div>
                  </div>
                )}

                {/* Prompt instructions */}
                <div className="absolute bottom-3 inset-x-0 text-center pointer-events-none z-20">
                  <span className="inline-block px-3.5 py-1 rounded-full bg-black/70 text-yellow-300 text-[11px] font-mono font-bold tracking-wider backdrop-blur-md border border-yellow-500/40">
                    ARAHKAN BARCODE QR KE DALAM KOTAK
                  </span>
                </div>
              </div>
            )}

            {scanTab === 'upload' && (
              <div className="rounded-3xl p-8 bg-slate-950/60 border-2 border-dashed border-purple-700/60 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
                <div className="w-16 h-16 rounded-2xl bg-purple-950 border border-purple-600/80 flex items-center justify-center text-purple-300 shadow-lg">
                  <Upload className="w-8 h-8 text-yellow-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white uppercase">Unggah Tangkapan Layar / Foto QR Siswa</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Pilih file gambar kartu QR atau foto barcode siswa dari galeri komputer/ponsel.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  Pilih Gambar dari Perangkat
                </button>
              </div>
            )}

            {scanTab === 'manual' && (
              <div className="rounded-3xl p-5 bg-slate-950/60 border border-purple-800/60 space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={e => setManualSearch(e.target.value)}
                    placeholder="Ketik NIS, nama siswa, atau kelas..."
                    className="w-full bg-slate-900 text-white text-xs pl-9 pr-4 py-2.5 rounded-xl border border-purple-800 focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                  {filteredManualStudents.map(std => {
                    const isAlreadyScanned = scannedStudentIds.has(std.id);
                    return (
                      <div
                        key={std.id}
                        className="p-3 rounded-xl bg-slate-900/80 border border-purple-900/40 hover:border-purple-600 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-white uppercase">{std.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            NIS: {std.nis} &bull; {std.classGrade} &bull; {std.beltLevel}
                          </p>
                        </div>

                        <button
                          onClick={() => handleManualSelect(std)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                            isAlreadyScanned
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                              : 'bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold shadow-sm'
                          }`}
                        >
                          {isAlreadyScanned ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              Sudah Hadir
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3" />
                              Absen Hadir
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Instant Confirmation Pop Card */}
            {recentScan && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-purple-950/90 border-2 border-emerald-500 shadow-xl flex items-center justify-between gap-4 animate-bounce-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                        PRESENSI BERHASIL DICATAT
                      </span>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-mono border ${BELT_BADGE_STYLES[recentScan.student.beltLevel] || 'bg-slate-800 text-white'}`}>
                        {recentScan.student.beltLevel}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-white uppercase">{recentScan.student.name}</h3>
                    <p className="text-xs text-slate-300 font-mono">
                      NIS: {recentScan.student.nis} &bull; {recentScan.student.classGrade} &bull; {recentScan.scan.timeFormatted} WIB
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 text-black">
                  HADIR
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Live Today Attendance Session List */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            {/* Stats Header */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/50 via-slate-900 to-black border border-purple-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-yellow-400" />
                  DATA KEHADIRAN HARI INI
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                  {todayScans.length} / {students.length} Siswa
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-purple-900/50">
                <div
                  className="bg-gradient-to-r from-purple-600 via-blue-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${students.length > 0 ? (todayScans.length / students.length) * 100 : 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Persentase Kehadiran</span>
                <span className="text-yellow-400 font-bold">
                  {students.length > 0 ? Math.round((todayScans.length / students.length) * 100) : 0}%
                </span>
              </div>
            </div>

            {/* Scanned List Items */}
            <div className="flex-1 rounded-2xl bg-slate-950/60 border border-purple-900/50 p-3 space-y-2 min-h-[220px] max-h-[360px] overflow-y-auto">
              <div className="flex items-center justify-between px-1 pb-1 border-b border-purple-900/30 text-[10px] font-mono uppercase text-slate-400">
                <span>RIWAYAT PEMINDAIAN TERBARU</span>
                <span>WAKTU SCAN</span>
              </div>

              {todayScans.length === 0 ? (
                <div className="py-12 text-center space-y-2 text-slate-500">
                  <ScanLine className="w-8 h-8 mx-auto text-purple-600/60 animate-pulse" />
                  <p className="text-xs">Belum ada siswa yang dipindai hari ini.</p>
                  <p className="text-[10px] text-slate-600">Arahkan barcode siswa ke kamera untuk memulai absensi.</p>
                </div>
              ) : (
                todayScans.map((scan, idx) => (
                  <div
                    key={scan.id}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-purple-900/40 hover:border-yellow-500/50 flex items-center justify-between gap-3 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 text-[10px] font-mono font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-white uppercase">{scan.studentName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          NIS: {scan.studentNis} &bull; {scan.classGrade} &bull; {scan.beltLevel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-yellow-400 bg-yellow-950/50 px-2 py-0.5 rounded border border-yellow-800/40">
                        {scan.timeFormatted}
                      </span>
                      <button
                        onClick={() => handleDeleteScan(scan.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Hapus / Batalkan Presensi Ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 px-6 sm:px-8 py-3.5 bg-slate-950/80 border-t border-purple-900/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Presensi otomatis tersimpan ke data log latihan & basis data lokal</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-purple-950 text-slate-300 hover:text-white font-semibold uppercase tracking-wider transition-colors cursor-pointer border border-purple-900/50"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
