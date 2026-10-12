import React, { useState, useRef } from 'react';
import { Student } from '../types';
import { downloadStudentTemplateExcel, parseStudentsFromExcel } from '../utils/excelGenerator';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  X,
  Users,
  Info,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudents: Student[];
  onImportSuccess: (newStudentsList: Student[]) => void;
}

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  isOpen,
  onClose,
  currentStudents,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedStudents, setParsedStudents] = useState<Student[]>([]);
  const [parsingErrors, setParsingErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);
    setParsingErrors([]);
    setParsedStudents([]);
    setImportSuccess(false);

    try {
      const result = await parseStudentsFromExcel(selectedFile);
      setParsedStudents(result.students);
      setParsingErrors(result.errors);
    } catch (err) {
      setParsingErrors([`Terjadi kesalahan saat memproses file: ${(err as Error).message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = () => {
    if (parsedStudents.length === 0) return;

    let finalStudents: Student[] = [];
    if (importMode === 'replace') {
      finalStudents = parsedStudents;
    } else {
      // Append mode: avoid duplicate NIS if possible by updating or adding
      const existingMap = new Map<string, Student>();
      currentStudents.forEach(s => existingMap.set(s.nis, s));
      const newItems: Student[] = [];

      parsedStudents.forEach(item => {
        const existing = existingMap.get(item.nis);
        if (existing) {
          // Update existing with new data
          existingMap.set(item.nis, { ...existing, ...item });
        } else {
          newItems.push(item);
        }
      });

      finalStudents = [...Array.from(existingMap.values()), ...newItems];
    }

    onImportSuccess(finalStudents);
    setImportSuccess(true);
    setTimeout(() => {
      onClose();
      setImportSuccess(false);
      setFile(null);
      setParsedStudents([]);
    }, 1500);
  };

  const handleReset = () => {
    setFile(null);
    setParsedStudents([]);
    setParsingErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                Import Data Siswa Massal (Excel / CSV)
              </h3>
              <p className="text-xs text-zinc-400">
                Registrasi anggota silat secara cepat menggunakan file spreadsheet (.xlsx, .xls, .csv)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Step 1: Download Template */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-950/60 text-red-400 border border-red-900/60 shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Langkah 1: Format Input Excel</h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Unduh template resmi berformat .xlsx yang sudah dilengkapi kolom NIS, Nama, Kelas, JK, Sabuk, No HP, dan petunjuk pengisian.
                </p>
              </div>
            </div>
            <button
              onClick={downloadStudentTemplateExcel}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white shadow-md transition-all shrink-0 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Format Excel (.xlsx)
            </button>
          </div>

          {/* Step 2: Upload Zone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-red-500" />
                Langkah 2: Unggah File Data Siswa
              </h4>
              {file && (
                <button
                  onClick={handleReset}
                  className="text-[11px] text-zinc-400 hover:text-red-400 flex items-center gap-1 font-mono transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Ganti File
                </button>
              )}
            </div>

            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-800 hover:border-red-600/60 rounded-xl p-8 text-center cursor-pointer transition-all bg-zinc-900/40 hover:bg-zinc-900/70 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-zinc-800/80 group-hover:bg-red-950/60 group-hover:text-red-400 text-zinc-400 mx-auto flex items-center justify-center mb-3 transition-colors">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-zinc-200 mb-1">
                  Klik untuk memilih file atau tarik (drag & drop) file ke sini
                </p>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Mendukung format .xlsx, .xls, atau .csv (Maksimal 5 MB)
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">{file.name}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {(file.size / 1024).toFixed(1)} KB • {parsedStudents.length} siswa terbaca
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Siap Diimpor
                </span>
              </div>
            )}
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
              Membaca dan memvalidasi baris data Excel...
            </div>
          )}

          {/* Errors / Warnings */}
          {parsingErrors.length > 0 && (
            <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/70 text-amber-300 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Peringatan Validasi:
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-2 text-amber-200">
                {parsingErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          {parsedStudents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-red-500" />
                  Pratinjau Data Siswa ({parsedStudents.length} Anggota)
                </h4>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Menampilkan {Math.min(5, parsedStudents.length)} dari {parsedStudents.length} baris
                </span>
              </div>

              <div className="border border-zinc-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse font-mono text-[11px]">
                  <thead className="bg-zinc-900 text-zinc-400 sticky top-0 border-b border-zinc-800 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">NIS</th>
                      <th className="py-2 px-3">Nama Pesilat</th>
                      <th className="py-2 px-3">Kelas</th>
                      <th className="py-2 px-3">JK</th>
                      <th className="py-2 px-3">Sabuk</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70 text-zinc-300 bg-zinc-950">
                    {parsedStudents.slice(0, 5).map((std, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900/50">
                        <td className="py-1.5 px-3 font-semibold text-white">{std.nis}</td>
                        <td className="py-1.5 px-3 font-sans font-medium text-zinc-100">{std.name}</td>
                        <td className="py-1.5 px-3">{std.classGrade}</td>
                        <td className="py-1.5 px-3">{std.gender}</td>
                        <td className="py-1.5 px-3 text-red-400">{std.beltLevel}</td>
                        <td className="py-1.5 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                            {std.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Step 3: Mode Selection */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-2">
                  Metode Penggabungan Data:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setImportMode('append')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      importMode === 'append'
                        ? 'bg-red-950/40 border-red-700 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="mt-0.5 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-zinc-100">Gabungkan (Append / Update)</div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Menambahkan siswa baru dan memperbarui jika NIS sudah ada di sistem. Data lama tetap aman.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setImportMode('replace')}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      importMode === 'replace'
                        ? 'bg-red-950/40 border-red-700 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-zinc-100">Timpa Semua (Replace All)</div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Mengganti seluruh daftar siswa lama dengan daftar dari file Excel ini.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Success message banner */}
          {importSuccess && (
            <div className="p-3.5 rounded-lg bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2 font-bold animate-pulse">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Import berhasil! Data siswa berhasil disimpan ke sistem.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="text-[11px] text-zinc-400 font-mono">
            Total Siswa Terdaftar Saat Ini: <span className="text-white font-bold">{currentStudents.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={parsedStudents.length === 0 || isLoading || importSuccess}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white shadow-lg shadow-red-950/50 transition-all active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              Proses Import ({parsedStudents.length} Siswa)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
