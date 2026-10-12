import React, { useState, useRef } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { RegisteredAthlete } from '../../types/silat';
import * as XLSX from 'xlsx';
import {
  Plus,
  Save,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Trash2,
  Edit3,
  Check,
  X,
  Filter,
  Search,
  Users,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const KELAS_OPTIONS = [
  'KELAS A',
  'KELAS B',
  'KELAS C',
  'KELAS D',
  'KELAS E',
  'KELAS F',
  'KELAS G',
  'KELAS H',
  'KELAS I',
  'KELAS J',
  'BEBAS',
  'TUNGGAL',
  'GANDA',
  'REGU',
  'SOLO KREATIF',
];

const USIA_OPTIONS = [
  'USIA DINI',
  'PRA USIA DINI',
  'PRA REMAJA',
  'REMAJA',
  'DEWASA',
  'MASTER',
];

export const InputAtlitTab: React.FC = () => {
  const {
    registeredAthletes,
    addRegisteredAthlete,
    updateRegisteredAthlete,
    deleteRegisteredAthlete,
    setRegisteredAthletes,
    resetRegisteredAthletes,
  } = useSilatMatch();

  // Form State
  const [name, setName] = useState('');
  const [contingent, setContingent] = useState('');
  const [categoryClass, setCategoryClass] = useState('KELAS A');
  const [ageGroup, setAgeGroup] = useState('REMAJA');
  const [gender, setGender] = useState<'PUTRA' | 'PUTRI'>('PUTRA');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter & Search State
  const [filterMode, setFilterMode] = useState<'FORM_FILTER' | 'ALL'>('FORM_FILTER');
  const [searchKeyword, setSearchKeyword] = useState('');

  // Toast / Alert Notification
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Reset Confirmation Modal
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Hidden file input for Excel upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle Form Submit (Add / Edit)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Mohon masukkan nama lengkap pesilat!', 'error');
      return;
    }
    if (!contingent.trim()) {
      showToast('Mohon masukkan asal kontingen / daerah!', 'error');
      return;
    }

    if (editingId) {
      updateRegisteredAthlete(editingId, {
        name: name.toUpperCase().trim(),
        contingent: contingent.toUpperCase().trim(),
        categoryClass,
        ageGroup,
        gender,
      });
      showToast(`Data pesilat "${name.toUpperCase()}" berhasil diperbarui!`, 'success');
      setEditingId(null);
    } else {
      addRegisteredAthlete({
        name: name.toUpperCase().trim(),
        contingent: contingent.toUpperCase().trim(),
        categoryClass,
        ageGroup,
        gender,
      });
      showToast(`Pesilat "${name.toUpperCase()}" berhasil didaftarkan!`, 'success');
    }

    // Reset Name and Contingent, keep category selections
    setName('');
    setContingent('');
  };

  const handleEdit = (athlete: RegisteredAthlete) => {
    setEditingId(athlete.id);
    setName(athlete.name);
    setContingent(athlete.contingent);
    setCategoryClass(athlete.categoryClass);
    setAgeGroup(athlete.ageGroup);
    setGender(athlete.gender);
    showToast(`Mengedit data pesilat: ${athlete.name}`, 'info');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setContingent('');
  };

  const handleDelete = (athlete: RegisteredAthlete) => {
    deleteRegisteredAthlete(athlete.id);
    if (editingId === athlete.id) {
      handleCancelEdit();
    }
    showToast(`Pesilat "${athlete.name}" berhasil dihapus.`, 'info');
  };

  // Download Excel Template (.xlsx)
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'NO': 1,
        'NAMA LENGKAP PESILAT': 'ADI WIJAYA',
        'ASAL KONTINGEN / DAERAH': 'JAWA TENGAH',
        'KELAS TANDING': 'KELAS A',
        'KATEGORI USIA': 'REMAJA',
        'GENDER': 'PUTRA',
      },
      {
        'NO': 2,
        'NAMA LENGKAP PESILAT': 'CITRA LESTARI',
        'ASAL KONTINGEN / DAERAH': 'DKI JAKARTA',
        'KELAS TANDING': 'KELAS A',
        'KATEGORI USIA': 'REMAJA',
        'GENDER': 'PUTRI',
      },
      {
        'NO': 3,
        'NAMA LENGKAP PESILAT': 'BAMBANG PAMUNGKAS',
        'ASAL KONTINGEN / DAERAH': 'JAWA TIMUR',
        'KELAS TANDING': 'KELAS B',
        'KATEGORI USIA': 'DEWASA',
        'GENDER': 'PUTRA',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Atlit');
    XLSX.writeFile(wb, 'Template_Import_Pesilat_Silat.xlsx');
    showToast('Template Excel berhasil diunduh!', 'success');
  };

  // Import Excel (.xlsx, .xls, .csv)
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rows || rows.length === 0) {
          showToast('File Excel kosong atau format tidak sesuai!', 'error');
          return;
        }

        const imported: RegisteredAthlete[] = [];
        let count = 0;

        rows.forEach((row, idx) => {
          // Flexible key lookup
          const athName =
            row['NAMA LENGKAP PESILAT'] ||
            row['NAMA PESILAT'] ||
            row['NAMA'] ||
            row['Nama'] ||
            row['nama'];
          const athContingent =
            row['ASAL KONTINGEN / DAERAH'] ||
            row['KONTINGEN'] ||
            row['DAERAH'] ||
            row['Kontingen'] ||
            row['kontingen'] ||
            'KONTINGEN DAERAH';
          const athClass =
            row['KELAS TANDING'] || row['KELAS'] || row['Kelas'] || 'KELAS A';
          const athAge =
            row['KATEGORI USIA'] || row['USIA'] || row['Kategori'] || 'REMAJA';
          const rawGender =
            row['GENDER'] || row['JENIS KELAMIN'] || row['Gender'] || 'PUTRA';

          const parsedGender: 'PUTRA' | 'PUTRI' =
            String(rawGender).toUpperCase().includes('PUTRI') ||
            String(rawGender).toUpperCase().startsWith('PI') ||
            String(rawGender).toUpperCase().startsWith('W') ||
            String(rawGender).toUpperCase().startsWith('F')
              ? 'PUTRI'
              : 'PUTRA';

          if (athName && String(athName).trim().length > 0) {
            imported.push({
              id: 'ath-import-' + Date.now() + '-' + idx,
              name: String(athName).toUpperCase().trim(),
              contingent: String(athContingent).toUpperCase().trim(),
              categoryClass: String(athClass).toUpperCase().trim(),
              ageGroup: String(athAge).toUpperCase().trim(),
              gender: parsedGender,
              createdAt: Date.now() - idx * 100,
            });
            count++;
          }
        });

        if (imported.length > 0) {
          setRegisteredAthletes([...imported, ...registeredAthletes]);
          showToast(`Berhasil mengimpor ${count} data pesilat dari Excel!`, 'success');
        } else {
          showToast('Tidak ada data pesilat valid yang dapat diimpor.', 'error');
        }
      } catch (err) {
        console.error('Error importing Excel:', err);
        showToast('Gagal membaca file Excel. Pastikan file valid!', 'error');
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    if (registeredAthletes.length === 0) {
      showToast('Belum ada data pesilat untuk diekspor!', 'error');
      return;
    }

    const exportData = registeredAthletes.map((a, idx) => ({
      'NO': idx + 1,
      'NAMA LENGKAP PESILAT': a.name,
      'ASAL KONTINGEN': a.contingent,
      'KELAS TANDING': a.categoryClass,
      'KATEGORI USIA': a.ageGroup,
      'GENDER': a.gender,
      'TANGGAL DAFTAR': new Date(a.createdAt || Date.now()).toLocaleDateString('id-ID'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar_Pesilat');
    XLSX.writeFile(wb, `Data_Pesilat_Turnamen_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Data pesilat berhasil diekspor ke Excel!', 'success');
  };

  // Export / Print PDF (Clean HTML window print)
  const handleDownloadPDF = () => {
    if (registeredAthletes.length === 0) {
      showToast('Belum ada data pesilat untuk diunduh!', 'error');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Gagal membuka jendela cetak. Izinkan pop-up browser!', 'error');
      return;
    }

    const rowsHtml = registeredAthletes
      .map(
        (a, i) => `
        <tr style="border-bottom: 1px solid #ddd; ${i % 2 === 1 ? 'background-color: #f9f9f9;' : ''}">
          <td style="padding: 8px; text-align: center;">${i + 1}</td>
          <td style="padding: 8px; font-weight: bold;">${a.name}</td>
          <td style="padding: 8px;">${a.contingent}</td>
          <td style="padding: 8px; text-align: center;">${a.categoryClass}</td>
          <td style="padding: 8px; text-align: center;">${a.ageGroup}</td>
          <td style="padding: 8px; text-align: center; font-weight: bold; color: ${a.gender === 'PUTRA' ? '#1d4ed8' : '#be185d'};">${a.gender}</td>
        </tr>`
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daftar Pesilat Resmi Turnamen Pencak Silat</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
          .header p { margin: 4px 0 0 0; font-size: 12px; color: #555; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
          th { background: #1e1b4b; color: #fff; padding: 10px 8px; text-align: left; text-transform: uppercase; font-size: 11px; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; color: #777; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>DAFTAR REGISTRASI PESILAT TURNAMEN PENCAK SILAT</h1>
          <p>Sistem Digital Scoring & Manajemen Pertandingan Silat • Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
        </div>
        <div style="font-size: 12px; margin-bottom: 10px;">
          <strong>Total Pesilat Terdaftar:</strong> ${registeredAthletes.length} Atlet
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">NO</th>
              <th>NAMA PESILAT</th>
              <th>KONTINGEN / DAERAH</th>
              <th style="text-align: center;">KELAS</th>
              <th style="text-align: center;">GOLONGAN USIA</th>
              <th style="text-align: center;">GENDER</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          <div>Nebeng's Official Digital Scoring Silat | Versi 2.4</div>
          <div>Panitia Pelaksana Pertandingan</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    showToast('Dokumen siap dicetak / disimpan sebagai PDF!', 'success');
  };

  // Filtered list
  const filteredAthletes = registeredAthletes.filter((ath) => {
    // Search keyword
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matchName = ath.name.toLowerCase().includes(kw);
      const matchCont = ath.contingent.toLowerCase().includes(kw);
      const matchClass = ath.categoryClass.toLowerCase().includes(kw);
      if (!matchName && !matchCont && !matchClass) return false;
    }

    if (filterMode === 'FORM_FILTER') {
      return (
        ath.categoryClass === categoryClass &&
        ath.ageGroup === ageGroup &&
        ath.gender === gender
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toast Notification Alert */}
      {notification && (
        <div
          className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border border-emerald-500 text-emerald-200'
              : notification.type === 'error'
              ? 'bg-red-950/90 border border-red-500 text-red-200'
              : 'bg-purple-950/90 border border-purple-500 text-purple-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black/30 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        
        {/* ===================== LEFT COLUMN: FORM & EXCEL ACTIONS (5 COLS) ===================== */}
        <div className="lg:col-span-5 space-y-3">
          
          {/* CARD: PENDAFTARAN PESILAT */}
          <section className="bg-[#120722]/95 border border-[#3b135c] rounded-2xl p-3.5 shadow-xl space-y-3 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2d0f47] pb-2">
              <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs uppercase tracking-wider">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>{editingId ? 'EDIT DATA PESILAT' : 'PENDAFTARAN PESILAT'}</span>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-bold"
                >
                  Batal Edit
                </button>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* NAMA LENGKAP */}
              <div>
                <label className="block text-[10px] font-black text-purple-300 uppercase tracking-wider mb-1">
                  NAMA LENGKAP PESILAT
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="CONTOH: ADI WIJAYA"
                  className="w-full bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs text-white font-bold uppercase tracking-wide focus:outline-none shadow-inner"
                />
              </div>

              {/* ASAL KONTINGEN */}
              <div>
                <label className="block text-[10px] font-black text-purple-300 uppercase tracking-wider mb-1">
                  ASAL KONTINGEN / DAERAH
                </label>
                <input
                  type="text"
                  value={contingent}
                  onChange={(e) => setContingent(e.target.value.toUpperCase())}
                  placeholder="CONTOH: JAWA TENGAH"
                  className="w-full bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-bold uppercase tracking-wide focus:outline-none shadow-inner"
                />
              </div>

              {/* 2-Col: KELAS TANDING & KATEGORI USIA */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-purple-300 uppercase tracking-wider mb-1">
                    KELAS TANDING
                  </label>
                  <select
                    value={categoryClass}
                    onChange={(e) => setCategoryClass(e.target.value)}
                    className="w-full bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl px-2.5 py-1.5 text-[11px] text-white font-bold uppercase tracking-wide focus:outline-none cursor-pointer"
                  >
                    {KELAS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-purple-300 uppercase tracking-wider mb-1">
                    KATEGORI USIA
                  </label>
                  <select
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    className="w-full bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl px-2.5 py-1.5 text-[11px] text-white font-bold uppercase tracking-wide focus:outline-none cursor-pointer"
                  >
                    {USIA_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GENDER / JENIS KELAMIN */}
              <div>
                <label className="block text-[10px] font-black text-purple-300 uppercase tracking-wider mb-1">
                  GENDER / JENIS KELAMIN
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('PUTRA')}
                    className={`py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      gender === 'PUTRA'
                        ? 'bg-[#2563eb] text-white ring-2 ring-blue-400 shadow-md'
                        : 'bg-[#180930] hover:bg-[#250e4a] text-purple-300/70 border border-[#381359]'
                    }`}
                  >
                    PUTRA
                  </button>

                  <button
                    type="button"
                    onClick={() => setGender('PUTRI')}
                    className={`py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      gender === 'PUTRI'
                        ? 'bg-[#9333ea] text-white ring-2 ring-fuchsia-400 shadow-md'
                        : 'bg-[#180930] hover:bg-[#250e4a] text-purple-300/70 border border-[#381359]'
                    }`}
                  >
                    PUTRI
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#6b21a8] hover:bg-[#7e22ce] active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-950/80 cursor-pointer"
              >
                <Save className="w-4 h-4 text-purple-200" />
                <span>{editingId ? 'SIMPAN PERUBAHAN' : 'DAFTARKAN ATLIT'}</span>
              </button>
            </form>

            {/* Sub-Section: IMPOR / EKSPOR EXCEL MASAL */}
            <div className="border-t border-[#2d0f47] pt-2.5 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300/80 block">
                IMPOR / EKSPOR EXCEL MASAL
              </span>

              {/* Row 1: TEMPLATE & IMPOR */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="py-1.5 px-2 rounded-xl bg-[#180930] hover:bg-[#260e4c] border border-[#381359] text-purple-200 hover:text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>TEMPLATE EXCEL</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-1.5 px-2 rounded-xl bg-[#180930] hover:bg-[#260e4c] border border-[#381359] text-purple-200 hover:text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-400" />
                  <span>IMPOR EXCEL</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportExcel}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
              </div>

              {/* Row 2: EKSPOR & UNDUH PDF */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="py-1.5 px-2 rounded-xl bg-[#180930] hover:bg-[#260e4c] border border-[#381359] text-emerald-300 hover:text-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>EKSPOR EXCEL</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="py-1.5 px-2 rounded-xl bg-[#180930] hover:bg-[#260e4c] border border-[#381359] text-amber-300 hover:text-amber-200 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>UNDUH PDF</span>
                </button>
              </div>

              {/* Danger Button: RESET / HAPUS SEMUA DATA */}
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="w-full py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 hover:text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>RESET / HAPUS SEMUA DATA</span>
              </button>
            </div>
          </section>
        </div>

        {/* ===================== RIGHT COLUMN: ATHLETE GRID & FILTER (7 COLS) ===================== */}
        <div className="lg:col-span-7 space-y-3">
          
          {/* Header Bar: Filter Indicator & Counter */}
          <div className="bg-[#120722]/95 border border-[#3b135c] rounded-2xl p-3 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-purple-400" />
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-200">
                  {filterMode === 'FORM_FILTER'
                    ? `TERFILTER: ${categoryClass} • ${ageGroup} • ${gender}`
                    : 'SEMUA DATA PESILAT'}
                </span>
              </div>
              <p className="text-[10px] text-purple-300/70 font-medium">
                GRID DATA ATLIT BERDASARKAN ABJAD KELAS TANDING & GENDER
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setFilterMode((prev) => (prev === 'FORM_FILTER' ? 'ALL' : 'FORM_FILTER'))
                }
                className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                  filterMode === 'ALL'
                    ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                    : 'bg-[#180930] border-[#381359] text-purple-300 hover:text-white'
                }`}
              >
                {filterMode === 'ALL' ? 'FILTER SESUAI FORM' : 'TAMPILKAN SEMUA DATA'}
              </button>

              <span className="px-3 py-1 rounded-full bg-[#180930] border border-purple-500/60 text-[10px] font-black text-purple-200 uppercase tracking-wider">
                TOTAL: {registeredAthletes.length} PESILAT
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari pesilat berdasarkan nama atau kontingen..."
              className="w-full bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white uppercase placeholder:normal-case font-medium focus:outline-none shadow-inner"
            />
            {searchKeyword && (
              <button
                onClick={() => setSearchKeyword('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Athletes List Grid */}
          <div className="space-y-2 max-h-[62vh] overflow-y-auto pr-1">
            {filteredAthletes.length === 0 ? (
              <div className="bg-[#120722]/80 border border-[#381359] border-dashed rounded-2xl p-6 text-center space-y-3">
                <Users className="w-8 h-8 text-purple-400/50 mx-auto" />
                <div>
                  <p className="text-xs font-bold text-purple-200 uppercase">
                    Belum Ada Pesilat Sesuai Filter
                  </p>
                  <p className="text-[10px] text-purple-400/70 mt-0.5">
                    {filterMode === 'FORM_FILTER'
                      ? `Tidak ada pesilat untuk ${categoryClass} (${ageGroup} - ${gender}). Daftarkan pesilat baru di sebelah kiri atau klik "Tampilkan Semua Data".`
                      : 'Belum ada data pesilat terdaftar di sistem.'}
                  </p>
                </div>
                {filterMode === 'FORM_FILTER' && (
                  <button
                    onClick={() => setFilterMode('ALL')}
                    className="px-3 py-1 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider"
                  >
                    Tampilkan Semua Kategori
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {filteredAthletes.map((ath) => (
                  <div
                    key={ath.id}
                    className={`bg-[#120722] border rounded-2xl p-3 shadow-md transition-all flex items-start justify-between gap-2 ${
                      editingId === ath.id
                        ? 'border-amber-400 ring-1 ring-amber-400/50 bg-[#1e0a38]'
                        : 'border-[#3b135c] hover:border-purple-500/80'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      {/* Name with indicator dot */}
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            ath.gender === 'PUTRA' ? 'bg-blue-500' : 'bg-fuchsia-500'
                          }`}
                        />
                        <span className="text-xs font-black text-white uppercase tracking-wide truncate">
                          {ath.name}
                        </span>
                      </div>

                      {/* Contingent */}
                      <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wide truncate pl-3.5">
                        {ath.contingent}
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-1 pt-1 pl-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-[#1d0838] border border-[#521d80] text-[9px] font-bold text-purple-200 uppercase">
                          {ath.categoryClass}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[#1d0838] border border-[#521d80] text-[9px] font-bold text-purple-200 uppercase">
                          {ath.ageGroup}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase ${
                            ath.gender === 'PUTRA'
                              ? 'bg-blue-950/60 border-blue-600/60 text-blue-300'
                              : 'bg-fuchsia-950/60 border-fuchsia-600/60 text-fuchsia-300'
                          }`}
                        >
                          {ath.gender}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Edit & Delete */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(ath)}
                        title="Edit Pesilat"
                        className="p-1.5 rounded-xl bg-[#1f0a38] hover:bg-[#34125c] border border-[#481878] text-purple-300 hover:text-white transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(ath)}
                        title="Hapus Pesilat"
                        className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-400 hover:text-red-200 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Resetting All Data */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#120722] border border-red-600/70 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-950 border border-red-500 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                HAPUS SEMUA DATA PESILAT?
              </h3>
              <p className="text-xs text-purple-300/80 mt-1">
                Tindakan ini akan mengosongkan seluruh daftar registrasi pesilat ({registeredAthletes.length} atlet). Data yang dihapus tidak dapat dipulihkan secara otomatis.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  resetRegisteredAthletes();
                  setIsResetConfirmOpen(false);
                  showToast('Seluruh data pesilat berhasil dihapus.', 'info');
                }}
                className="py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
