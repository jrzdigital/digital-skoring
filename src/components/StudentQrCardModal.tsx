import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Student, SchoolProfile, BeltLevel } from '../types';
import {
  X,
  Download,
  Printer,
  QrCode,
  Sparkles,
  ShieldCheck,
  User,
  School,
  Award,
  ChevronLeft,
  ChevronRight,
  Search,
  Layers,
  FileCheck,
  Copy,
  Check,
} from 'lucide-react';

interface StudentQrCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  profile: SchoolProfile;
  initialStudentId?: string;
}

const BELT_COLORS: Record<BeltLevel, { bg: string; text: string; border: string; glow: string; hex: string }> = {
  'Putih / Dasar': { bg: 'bg-white', text: 'text-slate-950', border: 'border-slate-300', glow: 'shadow-white/20', hex: '#FFFFFF' },
  'Hijau': { bg: 'bg-[#008000]', text: 'text-white', border: 'border-green-400', glow: 'shadow-green-500/30', hex: '#008000' },
  'Biru': { bg: 'bg-[#0000FF]', text: 'text-white', border: 'border-blue-400', glow: 'shadow-blue-500/30', hex: '#0000FF' },
  'Merah / Pelatih': { bg: 'bg-[#FF0000]', text: 'text-white', border: 'border-red-400', glow: 'shadow-red-500/30', hex: '#FF0000' },
};

// Robust canvas rounded rectangle helper (safe across all browser contexts)
const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

// Helper to generate high-res QR code with Satria App logo embedded seamlessly in the center
const generateQrWithSatriaLogo = async (payload: string, size = 720): Promise<string> => {
  try {
    // 1. Generate base QR code with High Error Correction ('H' = 30% error recovery)
    const baseQrUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: size,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    // 2. Create canvas to composite logo seamlessly into center of QR barcode
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return baseQrUrl;

    const baseImg = new Image();
    baseImg.src = baseQrUrl;
    await new Promise<void>((resolve) => {
      baseImg.onload = () => resolve();
      baseImg.onerror = () => resolve();
    });

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(baseImg, 0, 0, size, size);
    ctx.imageSmoothingEnabled = true;

    // 3. Load Satria App Logo
    const logoImg = new Image();
    logoImg.src = '/logo_satriaapp.png';
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
    });

    if (logoImg.complete && logoImg.naturalWidth > 0) {
      const center = size / 2;
      // Proportional box size (approx 19% of QR width, within 30% error recovery threshold)
      const logoBoxSize = Math.round(size * 0.19);
      const logoBoxHalf = logoBoxSize / 2;
      const x = center - logoBoxHalf;
      const y = center - logoBoxHalf;
      const radius = Math.round(logoBoxSize * 0.22);

      // Solid pure white backdrop plate for the logo
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      drawRoundedRect(ctx, x, y, logoBoxSize, logoBoxSize, radius);
      ctx.fill();

      // Clean gold accent border
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = Math.max(3, Math.round(size * 0.005));
      ctx.stroke();

      // Inner padding for logo image
      const pad = Math.round(logoBoxSize * 0.12);
      const drawSize = logoBoxSize - (pad * 2);
      ctx.drawImage(
        logoImg,
        x + pad,
        y + pad,
        drawSize,
        drawSize
      );
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Error generating QR with logo:', err);
    return QRCode.toDataURL(payload, { errorCorrectionLevel: 'H', margin: 2, width: size });
  }
};

export const StudentQrCardModal: React.FC<StudentQrCardModalProps> = ({
  isOpen,
  onClose,
  students,
  profile,
  initialStudentId,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof initialStudentId === 'string' && initialStudentId && students.some(s => s.id === initialStudentId)) {
      setSelectedStudentId(initialStudentId);
    } else if (students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [initialStudentId, students, isOpen]);

  const currentStudent = students.find(s => s.id === selectedStudentId) || students[0];
  const currentIndex = students.findIndex(s => s.id === (currentStudent?.id || ''));

  // Generate high-definition & simplified QR code payload with embedded Satria logo
  useEffect(() => {
    if (!currentStudent) return;
    const qrPayload = `SILAT:${currentStudent.id}:${currentStudent.nis || ''}`;

    let isMounted = true;
    generateQrWithSatriaLogo(qrPayload, 720)
      .then(url => {
        if (isMounted) {
          setQrDataUrl(url);
        }
      })
      .catch(err => {
        console.error('Error generating QR:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentStudent]);

  if (!isOpen || !currentStudent) return null;

  const beltInfo = BELT_COLORS[currentStudent.beltLevel] || BELT_COLORS['Putih / Dasar'];
  const memberCode = `PS-${currentStudent.nis || '0000'}-${currentStudent.id.substring(0, 4).toUpperCase()}`;

  // Navigate between students
  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedStudentId(students[currentIndex - 1].id);
    } else {
      setSelectedStudentId(students[students.length - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < students.length - 1) {
      setSelectedStudentId(students[currentIndex + 1].id);
    } else {
      setSelectedStudentId(students[0].id);
    }
  };

  // Copy Member Verification Code
  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(memberCode);
      } else {
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = memberCode;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Download QR Code Only as Image
  const handleDownloadQrOnly = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Absensi_${currentStudent.name.replace(/\s+/g, '_')}_${currentStudent.nis}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Render Card on High-Res Canvas and Download as PNG Card
  const handleDownloadCardPng = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 760;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Dark Luxurious Metallic Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 760);
    bgGrad.addColorStop(0, '#0c061d');
    bgGrad.addColorStop(0.4, '#130d2e');
    bgGrad.addColorStop(0.75, '#09081a');
    bgGrad.addColorStop(1, '#05030a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 760);

    // Decorative Gold & Purple Outer Borders
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 1160, 720);

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, 1144, 704);

    // Corner Gold Ornaments
    const drawCorner = (x: number, y: number, angle: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(40, 0);
      ctx.lineTo(0, 40);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    drawCorner(20, 20, 0);
    drawCorner(1180, 20, Math.PI / 2);
    drawCorner(1180, 740, Math.PI);
    drawCorner(20, 740, -Math.PI / 2);

    // 2. Header Container Box
    const headerGrad = ctx.createLinearGradient(40, 40, 1160, 180);
    headerGrad.addColorStop(0, 'rgba(76, 29, 149, 0.95)');
    headerGrad.addColorStop(0.5, 'rgba(30, 58, 138, 0.9)');
    headerGrad.addColorStop(1, 'rgba(15, 23, 42, 0.98)');
    ctx.fillStyle = headerGrad;
    drawRoundedRect(ctx, 40, 40, 1120, 145, 16);
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 2b. Draw Official Satria App Logo in Header Box
    const logoX = 58;
    const logoY = 52;
    const logoSize = 120;
    try {
      const logoImg = new Image();
      logoImg.src = '/logo_satriaapp.png';
      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });

      // Background plate for logo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        ctx.drawImage(logoImg, logoX + 8, logoY + 8, logoSize - 16, logoSize - 16);
      }
    } catch (e) {
      console.warn('Canvas logo load failed:', e);
    }

    const textOffsetX = 196;

    // Top Header Badge Tag: "KARTU ANGGOTA DIGITAL & PRESENSI BARCODE"
    ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
    drawRoundedRect(ctx, textOffsetX, 52, 420, 30, 8);
    ctx.fill();
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('★ KARTU ANGGOTA DIGITAL & PRESENSI BARCODE', textOffsetX + 12, 67);
    ctx.restore();

    // Header Titles (School & Extracurricular)
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 27px sans-serif';
    ctx.fillText((profile.schoolName || 'SMK NEGERI 1 JAKARTA').toUpperCase(), textOffsetX, 90);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText((profile.extracurricularName || 'EKSTRAKURIKULER PENCAK SILAT').toUpperCase(), textOffsetX, 128);
    ctx.restore();

    // Verified Athlete Badge on the right
    ctx.fillStyle = 'rgba(6, 78, 59, 0.95)';
    drawRoundedRect(ctx, 870, 54, 270, 44, 22);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✔ ATLET TERVERIFIKASI', 1005, 76);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`TAHUN AJARAN ${profile.academicYear || '2026/2027'}`, 1005, 122);
    ctx.restore();

    // 3. Left Column: Student Details
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('NAMA LENGKAP ATLET / PESILAT:', 60, 202);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px sans-serif';
    ctx.fillText(currentStudent.name.toUpperCase(), 60, 224);
    ctx.restore();

    // Box 1: NIS
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    drawRoundedRect(ctx, 60, 275, 290, 72, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('NOMOR INDUK SISWA (NIS)', 75, 287);
    ctx.fillStyle = '#facc15';
    ctx.font = '900 22px monospace';
    ctx.fillText(currentStudent.nis || '-', 75, 308);
    ctx.restore();

    // Box 2: Kelas
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    drawRoundedRect(ctx, 370, 275, 290, 72, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('KELAS / TINGKAT', 385, 287);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(currentStudent.classGrade || '-', 385, 308);
    ctx.restore();

    // Box 3: Tingkatan Sabuk (Prominent & High Contrast)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    drawRoundedRect(ctx, 60, 365, 290, 98, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('TINGKATAN SABUK / BELT', 75, 377);
    ctx.restore();

    // Belt Pill Box
    const beltBgColor = beltInfo.hex || '#FFFFFF';
    ctx.fillStyle = beltBgColor;
    drawRoundedRect(ctx, 75, 400, 260, 48, 10);
    ctx.fill();
    ctx.strokeStyle = currentStudent.beltLevel === 'Putih / Dasar' ? '#eab308' : 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Belt text with guaranteed high contrast & crisp visibility
    const isLightBelt = currentStudent.beltLevel === 'Putih / Dasar';
    ctx.save();
    ctx.fillStyle = isLightBelt ? '#09090b' : '#ffffff';
    ctx.font = '900 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentStudent.beltLevel || 'Putih / Dasar', 75 + 130, 400 + 24);
    ctx.restore();

    // Box 4: Status Keanggotaan
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    drawRoundedRect(ctx, 370, 365, 290, 98, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('STATUS KEANGGOTAAN', 385, 377);
    ctx.fillStyle = '#22c55e';
    ctx.font = '900 20px sans-serif';
    ctx.fillText('● AKTIF / RESMI', 385, 400);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.fillText('Terdaftar di Buku Induk Ekskul', 385, 430);
    ctx.restore();

    // Box 5: Digital ID Member Code
    ctx.fillStyle = 'rgba(88, 28, 135, 0.3)';
    drawRoundedRect(ctx, 60, 480, 600, 68, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 11px monospace';
    ctx.textBaseline = 'top';
    ctx.fillText('KODE DIGITAL ID ANGGOTA (VERIFIKASI):', 75, 492);
    ctx.fillStyle = '#fde047';
    ctx.font = '900 22px monospace';
    ctx.fillText(memberCode, 75, 514);
    ctx.restore();

    // 4. Right Column: Ultra-Bright High-Contrast Pure White QR Barcode Card (#FFFFFF)
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, 720, 200, 440, 440, 24);
    ctx.fill();
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Fill inner white card to ensure 0 grey transparency
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(728, 208, 424, 424);

    // Draw QR code image onto pure white card with imageSmoothingEnabled = false
    if (qrDataUrl) {
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise(resolve => {
        qrImg.onload = resolve;
      });
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qrImg, 740, 220, 400, 400);
      ctx.imageSmoothingEnabled = true;
    }
    ctx.restore();

    // QR Caption Banner Underneath
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    drawRoundedRect(ctx, 720, 652, 440, 38, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📸 SCAN BARCODE UNTUK PRESENSI OTOMATIS', 720 + 220, 652 + 19);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // 5. Card Footer Bar
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    drawRoundedRect(ctx, 40, 704, 1120, 38, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sistem Presensi SilatReport v2.4 • Terdaftar Resmi Ikatan Pencak Silat Indonesia (IPSI)', 60, 723);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`ID: ${currentStudent.id.substring(0, 14)}`, 1130, 723);
    ctx.textAlign = 'left';

    // Trigger high-res PNG download
    const link = document.createElement('a');
    link.download = `KTA_Silat_QR_${currentStudent.name.replace(/\s+/g, '_')}_${currentStudent.nis}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print single card
  const handlePrintCard = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('window.print() restricted in frame sandbox, downloading card image instead:', err);
      handleDownloadCardPng();
    }
  };

  const filteredStudents = students.filter(s =>
    (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.nis || '').includes(searchTerm) ||
    (s.classGrade || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl bg-gradient-to-b from-[#0e0720] via-[#080514] to-black border border-purple-800/70 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Glow ambient */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-60 h-60 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 px-5 sm:px-8 py-5 border-b border-purple-900/50 flex flex-wrap items-center justify-between gap-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950 border border-yellow-500/60 flex items-center justify-center text-yellow-400 shadow-md shadow-purple-950/50">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                  KARTU DIGITAL & QR BARCODE SISWA
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                  PRESENSI SIAP PAKAI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Barcode unik presensi atlet untuk pemindaian scanner kamera otomatis SilatReport.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(prev => (prev === 'single' ? 'all' : 'single'))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-yellow-500 text-black border-yellow-400 shadow-md'
                  : 'bg-purple-950/60 text-purple-200 border-purple-700/60 hover:bg-purple-900/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {viewMode === 'all' ? 'Lihat Kartu Tunggal' : `Lihat Semua (${students.length} Siswa)`}
            </button>

            <button
              onClick={onClose}
              aria-label="Tutup"
              className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-600/50 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 p-5 sm:p-8 max-h-[calc(88vh-140px)] overflow-y-auto">
          {viewMode === 'single' ? (
            <div className="space-y-6">
              {/* Student Carousel Navigation & Search */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-purple-950/30 p-3 rounded-2xl border border-purple-900/40">
                {/* Switcher Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    aria-label="Siswa Sebelumnya"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-purple-900 text-white border border-purple-800 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-mono text-slate-300 px-2 font-bold">
                    {currentIndex + 1} / {students.length}
                  </span>

                  <button
                    onClick={handleNext}
                    aria-label="Siswa Berikutnya"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-purple-900 text-white border border-purple-800 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Student Selector */}
                <div className="flex-1 min-w-[200px] max-w-sm">
                  <select
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    aria-label="Pilih Siswa"
                    className="w-full bg-slate-900/90 text-white text-xs rounded-xl px-3 py-2 border border-purple-700/60 focus:border-yellow-400 focus:outline-none cursor-pointer"
                  >
                    {students.map((std, idx) => (
                      <option key={std.id} value={std.id} className="bg-slate-900 text-white">
                        {idx + 1}. {std.name} ({std.classGrade} - {std.beltLevel})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fast Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadQrOnly}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-blue-300 border border-blue-800/60 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Unduh file barcode QR murni format PNG"
                  >
                    <QrCode className="w-3.5 h-3.5 text-blue-400" />
                    Unduh QR Saja
                  </button>

                  <button
                    onClick={handleDownloadCardPng}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-600 via-yellow-500 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-yellow-950/40 transition-all active:scale-95 cursor-pointer"
                    title="Unduh Kartu Identitas Siswa Lengkap Resolusi Tinggi (PNG)"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Kartu (PNG)
                  </button>
                </div>
              </div>

              {/* THE OFFICIAL ELEGANT MARTIAL ARTS QR CARD */}
              <div
                id="printable-silat-card"
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#120a2a] via-[#0c071d] to-[#04020a] border-2 border-yellow-500/70 p-6 sm:p-8 shadow-2xl shadow-purple-950/80"
              >
                {/* Gold corner ornaments */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-xl pointer-events-none" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-xl pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-xl pointer-events-none" />

                {/* Card Inner Header */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-950/80 via-blue-950/70 to-slate-950 border border-yellow-500/40 mb-6">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 p-1.5 border border-yellow-400/80 flex items-center justify-center shadow-lg shadow-yellow-500/10 backdrop-blur-sm flex-shrink-0">
                      <img
                        src="/logo_satriaapp.png"
                        alt="Logo Satria App"
                        className="w-full h-full object-contain filter drop-shadow"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black text-yellow-400 uppercase tracking-widest">
                          KARTU ANGGOTA DIGITAL & PRESENSI BARCODE
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                        {profile.schoolName || 'SMK NEGERI 1 JAKARTA'}
                      </h3>
                      <p className="text-xs font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-blue-300 to-yellow-300 uppercase tracking-wide">
                        {profile.extracurricularName || 'PENCAK SILAT SATRIA MUDA'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-[11px] font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ATLET TERVERIFIKASI</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      TAHUN AJARAN {profile.academicYear || '2026/2027'}
                    </p>
                  </div>
                </div>

                {/* Card Body: Student Details & Prominent QR Barcode */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Left Column: Student Details */}
                  <div className="md:col-span-7 space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                        NAMA LENGKAP ATLET / PESILAT
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                        {currentStudent.name}
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-900/50">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">
                          NOMOR INDUK (NIS)
                        </span>
                        <span className="text-base font-bold text-yellow-400 font-mono">
                          {currentStudent.nis || '-'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-900/50">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">
                          KELAS / TINGKAT
                        </span>
                        <span className="text-base font-bold text-white">
                          {currentStudent.classGrade || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-900/50">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">
                          TINGKAT SABUK
                        </span>
                        <span
                          className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm ${beltInfo.bg} ${beltInfo.text} ${beltInfo.border}`}
                        >
                          {currentStudent.beltLevel}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950/70 border border-purple-900/50">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">
                          STATUS ATLET
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          {currentStudent.status || 'Aktif'}
                        </span>
                      </div>
                    </div>

                    {/* Member Code with Copy Button */}
                    <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-purple-300 font-mono uppercase block">
                          KODE DIGITAL ID ANGGOTA
                        </span>
                        <span className="text-xs font-mono font-bold text-yellow-300">
                          {memberCode}
                        </span>
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-purple-900 text-slate-300 hover:text-white text-[11px] font-mono flex items-center gap-1 border border-purple-700/60 transition-colors cursor-pointer"
                        title="Salin Kode ID"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: High-Definition QR Barcode Container */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center">
                    <div className="relative p-4 rounded-2xl bg-white border-4 border-yellow-500 shadow-xl shadow-yellow-500/20 max-w-[280px] w-full flex flex-col items-center">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`QR Code ${currentStudent.name}`}
                          className="w-full aspect-square object-contain"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                          <QrCode className="w-12 h-12 animate-spin text-purple-600" />
                        </div>
                      )}

                      <div className="mt-2 text-center">
                        <span className="text-[10px] font-mono font-black text-slate-900 uppercase tracking-wider block">
                          SCAN UNTUK PRESENSI
                        </span>
                        <span className="text-[9px] font-mono text-slate-600 block">
                          {currentStudent.nis} • {currentStudent.name.split(' ')[0]}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 text-center mt-3 max-w-[260px] leading-tight">
                      Arahkan barcode ini ke kamera scanner absensi pada halaman utama untuk otomatis mencatat kehadiran.
                    </p>
                  </div>
                </div>

                {/* Card Footer Info */}
                <div className="relative z-10 mt-6 pt-4 border-t border-purple-900/40 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-3.5 h-3.5 text-yellow-400" />
                    <span>SilatReport App v2.4 • Otentikasi Terenkripsi IPSI</span>
                  </div>
                  <span>ID: {currentStudent.id.substring(0, 16)}</span>
                </div>
              </div>
            </div>
          ) : (
            /* ALL STUDENTS GRID (BATCH VIEW & DOWNLOAD) */
            <div className="space-y-6">
              {/* Batch Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Cari siswa berdasarkan nama, NIS, kelas..."
                    className="w-full bg-slate-900 text-white text-xs pl-9 pr-4 py-2.5 rounded-xl border border-purple-800/60 focus:border-yellow-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintCard}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-purple-900 text-white border border-purple-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-yellow-400" />
                    Cetak Lembar Kartu (Print)
                  </button>
                </div>
              </div>

              {/* Grid of Student Mini QR Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map(std => {
                  const sBelt = BELT_COLORS[std.beltLevel] || BELT_COLORS['Putih / Dasar'];
                  return (
                    <div
                      key={std.id}
                      onClick={() => {
                        setSelectedStudentId(std.id);
                        setViewMode('single');
                      }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-black border border-purple-900/50 hover:border-yellow-500/80 transition-all group flex flex-col justify-between space-y-3 cursor-pointer shadow-lg hover:scale-[1.02]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors uppercase">
                            {std.name}
                          </h4>
                          <p className="text-xs text-slate-400 font-mono">
                            NIS: {std.nis} &bull; {std.classGrade}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sBelt.bg} ${sBelt.text}`}
                        >
                          {std.beltLevel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-purple-900/40">
                        <span className="text-[10px] font-mono text-purple-300 flex items-center gap-1">
                          <QrCode className="w-3 h-3 text-yellow-400" />
                          Klik untuk Buka & Unduh
                        </span>
                        <span className="text-xs font-bold text-yellow-400 group-hover:translate-x-1 transition-transform">
                          &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 px-5 sm:px-8 py-4 bg-slate-950/80 border-t border-purple-900/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Format QR Code terstandarisasi untuk pemindai aplikasi SilatReport</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
