import React, { useState, useEffect } from 'react';
import { TrainingLog, SchoolProfile, Student } from '../types';
import { generateTrainingReportPdf, PdfExportOptions } from '../utils/pdfGenerator';
import { exportTrainingDataToExcel } from '../utils/excelGenerator';
import { X, Download, FileSpreadsheet, Printer, Eye, Calendar, Layers, ShieldCheck, Share2, UserCheck, Settings } from 'lucide-react';
import { SettingsTabType } from './SettingsModal';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: TrainingLog[];
  profile: SchoolProfile;
  students: Student[];
  onOpenShareModal?: () => void;
  onOpenSettingsModal?: (tab?: SettingsTabType) => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  logs,
  profile,
  students,
  onOpenShareModal,
  onOpenSettingsModal,
}) => {
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [includePhotos, setIncludePhotos] = useState<boolean>(true);
  const [includeAttendance, setIncludeAttendance] = useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Extract unique available months from logs
  const availableMonths = Array.from(
    new Set(logs.map(l => l.date.substring(0, 7)))
  ).sort().reverse();

  useEffect(() => {
    if (isOpen) {
      updatePdfPreview();
    }
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [isOpen, monthFilter, includePhotos, includeAttendance, includeSignatures, logs, profile]);

  const updatePdfPreview = async () => {
    setIsGenerating(true);
    try {
      const options: PdfExportOptions = {
        monthFilter,
        includePhotos,
        includeAttendanceRecap: includeAttendance,
        includeSignatures,
      };

      const doc = await generateTrainingReportPdf(logs, profile, students, options);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
      setPdfBlobUrl(url);
    } catch (e) {
      console.error('Error generating PDF preview:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      const options: PdfExportOptions = {
        monthFilter,
        includePhotos,
        includeAttendanceRecap: includeAttendance,
        includeSignatures,
      };
      const doc = await generateTrainingReportPdf(logs, profile, students, options);
      const suffix = monthFilter === 'all' ? 'Lengkap' : monthFilter;
      doc.save(`Laporan_Pencak_Silat_${profile.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${suffix}.pdf`);
    } catch (e) {
      console.error('Error downloading PDF:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadExcel = () => {
    exportTrainingDataToExcel(logs, students, profile, `Rekap_Ekskul_Silat_${profile.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}`);
  };

  const handlePrint = async () => {
    try {
      if (pdfBlobUrl) {
        const printWindow = window.open(pdfBlobUrl, '_blank', 'noopener,noreferrer');
        if (!printWindow) {
          await handleDownloadPdf();
        }
      } else {
        await handleDownloadPdf();
      }
    } catch (err) {
      console.warn('Direct print blocked by sandbox, downloading PDF instead:', err);
      await handleDownloadPdf();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-5xl h-[92vh] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                Pratinjau & Ekspor Laporan Resmi Sekolah
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/80">
                  PDF / XLSX READY
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Format standar administrasi sekolah dengan KOP, matriks materi, foto, dan pengesahan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-6 py-3 bg-zinc-900/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300 font-mono text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-red-500" />
              <span className="uppercase text-[10px] font-bold tracking-wider text-zinc-400">Periode:</span>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-white text-xs focus:outline-none focus:border-red-600 font-mono text-[11px]"
              >
                <option value="all">Semua Bulan (Semester Penuh)</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>Bulan {m}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 hover:border-zinc-700 text-[11px] font-mono">
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={e => setIncludePhotos(e.target.checked)}
                className="rounded accent-red-600"
              />
              <span>Foto Latihan</span>
            </label>

            <label className="flex items-center gap-1.5 text-zinc-300 cursor-pointer bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 hover:border-zinc-700 text-[11px] font-mono">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={e => setIncludeSignatures(e.target.checked)}
                className="rounded accent-red-600"
              />
              <span>Tanda Tangan & KOP</span>
            </label>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex items-center gap-2">
            {onOpenSettingsModal && (
              <button
                type="button"
                onClick={() => onOpenSettingsModal('kop')}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-yellow-300 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                title="Edit Nomor Telepon, Email, Nama Sekolah, dan Tanda Tangan"
              >
                <UserCheck className="w-3.5 h-3.5 text-yellow-400" />
                Edit KOP & TTD
              </button>
            )}

            {onOpenShareModal && (
              <button
                type="button"
                onClick={onOpenShareModal}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 bg-zinc-900 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-800"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                Medsos/WA
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/80 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm font-mono text-[11px]"
              title="Ekspor Seluruh Sheet ke Excel .xlsx"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (.xlsx)
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-800 font-mono text-[11px]"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-400" />
              Cetak
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-red-700 hover:bg-red-600 rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-red-900/20"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh PDF
            </button>
          </div>
        </div>

        {/* PDF Viewer Container */}
        <div className="flex-1 bg-zinc-950 p-3 md:p-6 overflow-hidden flex items-center justify-center">
          {pdfBlobUrl ? (
            <object
              data={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
              type="application/pdf"
              title="Pratinjau Laporan PDF"
              aria-label="Pratinjau Laporan PDF"
              className="w-full h-full rounded-lg border border-zinc-800 shadow-2xl bg-white"
            >
              <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-300 p-6 text-center">
                <p className="text-sm font-semibold">Pratinjau PDF siap untuk diunduh.</p>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-red-700 hover:bg-red-600 rounded-lg transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Unduh Dokumen PDF
                </button>
              </div>
            </object>
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-400 text-sm">
              <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              Menyiapkan Dokumen PDF...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
