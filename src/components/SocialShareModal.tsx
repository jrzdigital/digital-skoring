import React, { useState } from 'react';
import { TrainingLog, SchoolProfile, Student } from '../types';
import { formatIndoDate } from '../utils/pdfGenerator';
import { Share2, Copy, Check, MessageSquare, Send, Twitter, Facebook, ExternalLink } from 'lucide-react';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLog?: TrainingLog | null;
  log?: TrainingLog | null;
  logs?: TrainingLog[];
  allLogs?: TrainingLog[];
  profile: SchoolProfile;
  students: Student[];
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  targetLog,
  log,
  logs,
  allLogs,
  profile,
  students = [],
}) => {
  const effectiveLogs = logs || allLogs || [];
  const effectiveTargetLog = targetLog || log || null;
  const [selectedLogId, setSelectedLogId] = useState<string>(
    effectiveTargetLog?.id || (effectiveLogs.length > 0 ? effectiveLogs[effectiveLogs.length - 1]?.id : '')
  );
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const activeLog =
    effectiveLogs.find(l => l.id === selectedLogId) || effectiveTargetLog || (effectiveLogs.length > 0 ? effectiveLogs[effectiveLogs.length - 1] : null);

  if (!isOpen || !activeLog) return null;

  const hadirCount = activeLog.attendance ? activeLog.attendance.filter(a => a.status === 'hadir').length : 0;
  const totalStudents = students.length;

  // Formatted broadcast message for WhatsApp / Telegram
  const formattedText = `🥋 *LAPORAN LATIHAN PENCAK SILAT*
🏫 *${profile.schoolName}*
---------------------------------------
📌 *Nomor Laporan:* ${activeLog.number}
📅 *Hari/Tanggal:* ${activeLog.day}, ${formatIndoDate(activeLog.date)}
⏰ *Waktu:* ${activeLog.startTime} - ${activeLog.endTime} WIB
📍 *Lokasi:* ${activeLog.location}

🥊 *Materi Latihan:*
${activeLog.trainingType} (Kategori: ${activeLog.category})

🎯 *Fungsi & Manfaat Latihan:*
${activeLog.functionDescription}

👥 *Presensi Atlet:*
Hadir: ${hadirCount} dari ${totalStudents} Siswa

📝 *Catatan Pelatih:*
${activeLog.coachNotes || 'Kegiatan berjalan lancar, tertib dan bersemangat.'}

---------------------------------------
👤 *Pelatih Utama:* ${profile.coachName}
🛡️ *Mengetahui:* ${profile.principalName} (${profile.principalTitle})
#PencakSilat #Ekstrakurikuler #SilatPrestasi #${profile.schoolName.replace(/[^a-zA-Z0-9]/g, '')}`;

  const handleCopyText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(formattedText);
      } else {
        const temp = document.createElement('textarea');
        temp.value = formattedText;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const safeOpen = (url: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('window.open blocked:', e);
    }
  };

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(formattedText);
    safeOpen(`https://api.whatsapp.com/send?text=${encoded}`);
  };

  const handleShareTelegram = () => {
    const encoded = encodeURIComponent(formattedText);
    safeOpen(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encoded}`);
  };

  const handleShareTwitter = () => {
    const shortText = `🥋 Laporan Latihan Pencak Silat ${profile.schoolName}: ${activeLog.trainingType} terlaksana sukses dengan ${hadirCount}/${totalStudents} kehadiran pesilat!`;
    safeOpen(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shortText)}`);
  };

  const handleShareFacebook = () => {
    safeOpen(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-tight">Bagikan Progres & Laporan ke Medsos</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Kirim format laporan siap broadcast ke Grup WhatsApp Sekolah, Orang Tua, dan Media Sosial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-zinc-950/80">
          {/* Select Log */}
          <div>
            <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">
              Pilih Sesi Latihan yang Ingin Dibagikan:
            </label>
            <select
              value={selectedLogId}
              onChange={e => setSelectedLogId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none font-mono text-[11px]"
            >
              {logs.map(log => (
                <option key={log.id} value={log.id}>
                  {log.number} - {log.day}, {log.date} ({log.trainingType.substring(0, 40)}...)
                </option>
              ))}
            </select>
          </div>

          {/* Formatted Text Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono uppercase text-zinc-400">
                Format Teks Siap Kirim (WhatsApp / Telegram):
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg transition-colors flex items-center gap-1 border border-zinc-800 font-mono text-[11px]"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {isCopied ? 'Tersalin!' : 'Salin Teks'}
              </button>
            </div>
            <textarea
              readOnly
              rows={8}
              value={formattedText}
              className="w-full p-3 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 font-mono leading-relaxed select-all focus:outline-none"
            />
          </div>

          {/* Social Media Integration Buttons */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono text-[11px]">
              Kirim Langsung ke Platform:
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* WhatsApp */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="p-3 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm"
              >
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold uppercase font-mono text-[11px]">WhatsApp</span>
              </button>

              {/* Telegram */}
              <button
                type="button"
                onClick={handleShareTelegram}
                className="p-3 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-800/80 text-sky-300 transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm"
              >
                <Send className="w-5 h-5 text-sky-400" />
                <span className="text-xs font-bold uppercase font-mono text-[11px]">Telegram</span>
              </button>

              {/* Twitter / X */}
              <button
                type="button"
                onClick={handleShareTwitter}
                className="p-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm"
              >
                <Twitter className="w-5 h-5 text-zinc-300" />
                <span className="text-xs font-bold uppercase font-mono text-[11px]">Twitter / X</span>
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={handleShareFacebook}
                className="p-3 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-800/80 text-blue-300 transition-all flex flex-col items-center justify-center gap-1.5 shadow-sm"
              >
                <Facebook className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold uppercase font-mono text-[11px]">Facebook</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-800 bg-zinc-950">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 font-mono"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
