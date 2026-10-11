import React, { useState, useRef, useEffect } from "react";
import { 
  Calendar,
  Layers,
  Trash2,
  Download,
  Upload,
  Plus,
  ArrowLeft,
  CheckCircle,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  RefreshCw,
  Clock,
  Award,
  Trophy,
  X
} from "lucide-react";
import { sound } from "../utils/sound";
import * as XLSX from "xlsx";
import { TournamentBracketView } from "./TournamentBracketView";

interface GenerateJadwalTabProps {
  schedules: any[];
  setSchedules: React.Dispatch<React.SetStateAction<any[]>>;
  participants: any[];
  setParticipants: React.Dispatch<React.SetStateAction<any[]>>;
  categories: any[];
  setCategories: React.Dispatch<React.SetStateAction<any[]>>;
  scheduleGelanggang: string;
  setScheduleGelanggang: (val: string) => void;
  onClose: () => void;
  // Helpers
  getParticipantName: (pId: string) => string;
  getParticipantClub: (pId: string) => string;
  downloadSchedulePdf: () => void;
  loadScheduleMatchItem: (matchId: string) => Promise<void>;
  notifyToast: (msg: string) => void;
  onUploadExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  onSyncAllBrackets: (latestSchedules?: any[], latestParticipants?: any[]) => Promise<void>;
  onOpenBaganScreen?: () => void;
}

export function GenerateJadwalTab({
  schedules,
  setSchedules,
  participants,
  setParticipants,
  categories,
  setCategories,
  scheduleGelanggang,
  setScheduleGelanggang,
  onClose,
  getParticipantName,
  getParticipantClub,
  downloadSchedulePdf,
  loadScheduleMatchItem,
  notifyToast,
  onUploadExcel,
  onDownloadTemplate,
  onSyncAllBrackets,
  onOpenBaganScreen
}: GenerateJadwalTabProps) {
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter schedules that match the active Gelanggang
  // If schedule Gelanggang is empty or matches
  const currentGelanggangMatches = schedules.filter(
    m => !scheduleGelanggang || m.arena?.trim().toUpperCase() === scheduleGelanggang.trim().toUpperCase()
  );

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>("ALL");
  const [sortByTime, setSortByTime] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showBracketModal, setShowBracketModal] = useState<boolean>(false);
  const [modalBracketCategory, setModalBracketCategory] = useState<string>("");
  const [modalBracketGender, setModalBracketGender] = useState<"PUTRA" | "PUTRI">("PUTRA");

  // Helper to parse time strings like "08:00", "08.00", "14:15 WIB" to minutes from midnight
  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 999999;
    const clean = timeStr.replace(".", ":").toLowerCase().replace("wib", "").trim();
    const parts = clean.split(":");
    if (parts.length >= 2) {
      const hours = parseInt(parts[0].replace(/\D/g, ""));
      const minutes = parseInt(parts[1].replace(/\D/g, ""));
      if (!isNaN(hours) && !isNaN(minutes)) {
        return hours * 60 + minutes;
      }
    }
    const digitsOnly = parseInt(clean.replace(/\D/g, ""));
    if (!isNaN(digitsOnly) && digitsOnly < 2400) {
      const hours = Math.floor(digitsOnly / 100);
      const minutes = digitsOnly % 100;
      return hours * 60 + minutes;
    }
    return 999999;
  };

  // Extract list of category / class options dynamically from categories and schedules
  const categoryOptions = React.useMemo(() => {
    const opts = new Map<string, string>(); // normalized upper categoryId/name -> Display Name
    
    // Add item classes from the categories prop
    categories.forEach(cat => {
      if (cat.id && cat.name) {
        opts.set(cat.id.toUpperCase(), cat.name.toUpperCase());
      }
    });

    // Add list of matches categories as fallback
    schedules.forEach(m => {
      const clsName = m.kelas || m.className;
      if (clsName) {
        const uppercaseVal = clsName.toUpperCase().trim();
        // Skip if its part of categories already
        const hasExisting = Array.from(opts.values()).some(v => v === uppercaseVal);
        if (!hasExisting) {
          opts.set(uppercaseVal, uppercaseVal);
        }
      }
      if (m.categoryClassId) {
        const uppercaseId = m.categoryClassId.toUpperCase().trim();
        if (!opts.has(uppercaseId)) {
          opts.set(uppercaseId, (m.kelas || uppercaseId).toUpperCase());
        }
      }
    });

    return Array.from(opts.entries()).map(([id, name]) => ({ id, name }));
  }, [categories, schedules]);

  // Combined filters applied to matches in the active Gelanggang
  const visibleMatches = React.useMemo(() => {
    const filtered = currentGelanggangMatches.filter(m => {
      // Class matching
      const matchCatId = (m.categoryClassId || "").toUpperCase();
      const matchKelas = (m.kelas || m.className || "").toUpperCase();
      
      const catMatch = selectedCategoryFilter === "ALL" || 
        matchCatId === selectedCategoryFilter || 
        matchKelas === selectedCategoryFilter ||
        `cat-${matchKelas.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`.toUpperCase() === selectedCategoryFilter;

      // Gender matching
      const genderMatch = selectedGenderFilter === "ALL" || 
        (m.gender || "").toUpperCase() === selectedGenderFilter;

      return catMatch && genderMatch;
    });

    if (sortByTime) {
      return [...filtered].sort((a, b) => {
        const timeA = parseTimeToMinutes(a.matchTime || "");
        const timeB = parseTimeToMinutes(b.matchTime || "");
        if (timeA !== timeB) return timeA - timeB;

        // Fallback to match number numerically
        const numA = parseInt(a.matchNumber?.toString().replace(/\D/g, "") || "");
        const numB = parseInt(b.matchNumber?.toString().replace(/\D/g, "") || "");
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return numA - numB;
        }
        return (a.matchNumber || "").localeCompare(b.matchNumber || "");
      });
    }

    return filtered;
  }, [currentGelanggangMatches, selectedCategoryFilter, selectedGenderFilter, sortByTime]);

  // Local helper for mapping class name/id to display text (e.g. "cat-3" -> "C" or "Kelas C" -> "C")
  const resolveClassDisplay = (catIdOrName: string) => {
    if (!catIdOrName) return "";
    let clean = catIdOrName;
    if (catIdOrName.startsWith("cat-")) {
      const found = categories.find(c => c.id === catIdOrName);
      if (found) clean = found.name;
    }
    // Extract letter/digit (e.g. "Kelas A" -> "A")
    return clean.replace(/kelas\s*/gi, "").toUpperCase().trim();
  };

  // Synchronize athletes edit in both schedules and participants
  const handleUpdateAthleteNameAndClub = (
    matchId: string, 
    role: "RED" | "BLUE", 
    field: "name" | "club", 
    value: string
  ) => {
    const updatedMatches = schedules.map(m => {
      if (m.id === matchId) {
        let fId = role === "RED" ? m.fighterRedId : m.fighterBlueId;
        
        // Auto-generate ID if empty or missing
        if (!fId || fId === "KOSONG" || fId.startsWith("p-red-KOSONG") || fId.startsWith("p-blue-KOSONG")) {
          fId = `p-auto-${role.toLowerCase()}-${matchId}-${Date.now()}`;
          if (role === "RED") {
            m.fighterRedId = fId;
          } else {
            m.fighterBlueId = fId;
          }
        }

        // Cache the name and club directly on the match object for consistency
        if (role === "RED") {
          if (field === "name") m.fighterRedName = value.toUpperCase();
          if (field === "club") m.fighterRedClub = value.toUpperCase();
        } else {
          if (field === "name") m.fighterBlueName = value.toUpperCase();
          if (field === "club") m.fighterBlueClub = value.toUpperCase();
        }

        // Update in participants state
        setParticipants(prevParts => {
          const idx = prevParts.findIndex(p => p.id === fId);
          if (idx > -1) {
            const nextList = [...prevParts];
            nextList[idx] = {
              ...nextList[idx],
              [field]: value.toUpperCase()
            };
            return nextList;
          } else {
            return [
              ...prevParts,
              {
                id: fId,
                name: field === "name" ? value.toUpperCase() : "",
                club: field === "club" ? value.toUpperCase() : "",
                gender: m.gender || "PUTRA",
                categoryClassId: m.categoryClassId || "cat-3",
                weight: 55
              }
            ];
          }
        });
      }
      return m;
    });

    setSchedules(updatedMatches);
  };

  // Update other attributes like Class, Gender, Usia, Stage
  const handleUpdateMatchField = (matchId: string, field: string, value: string) => {
    const updated = schedules.map(m => {
      if (m.id === matchId) {
        if (field === "kelas") {
          // Find or create category class ID
          const cleanK = value.trim().toUpperCase();
          const catId = `cat-${cleanK.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
          // Auto create category if not present
          if (!categories.find(c => c.id === catId)) {
            setCategories(prev => [
              ...prev,
              { id: catId, name: `Kelas ${cleanK}`, minWeight: 55, maxWeight: 60, division: "Dewasa" }
            ]);
          }
          return { ...m, categoryClassId: catId };
        } else if (field === "gender") {
          return { ...m, gender: value as "PUTRA" | "PUTRI" };
        } else if (field === "usia") {
          return { ...m, division: value }; // Keep division as age tier
        } else if (field === "stage") {
          return { ...m, stage: value.toUpperCase() };
        } else if (field === "matchNumber") {
          return { ...m, matchNumber: value };
        } else if (field === "matchTime") {
          return { ...m, matchTime: value };
        }
      }
      return m;
    });
    setSchedules(updated);
  };

  // Add empty manual party row
  const handleAddPartyRow = () => {
    sound.playClick();
    const nextPartaiNum = schedules.length + 1;
    const newMatchId = `m-manual-${Date.now()}`;
    
    const redPartId = `p-auto-red-${newMatchId}-${Date.now()}`;
    const bluePartId = `p-auto-blue-${newMatchId}-${Date.now()}`;
    
    const newRow = {
      id: newMatchId,
      matchNumber: `${nextPartaiNum}`,
      stage: "PENYISIHAN",
      categoryClassId: "cat-1",
      fighterRedId: redPartId,
      fighterBlueId: bluePartId,
      arena: scheduleGelanggang || "GELANGGANG I",
      gender: "PUTRA",
      division: "REMAJA",
      status: "BELUM"
    };

    setParticipants(prev => [
      ...prev,
      { id: redPartId, name: "", club: "", gender: "PUTRA", categoryClassId: "cat-1", weight: 55 },
      { id: bluePartId, name: "", club: "", gender: "PUTRA", categoryClassId: "cat-1", weight: 55 }
    ]);

    setSchedules(prev => [...prev, newRow]);
    notifyToast(`➕ Baris Partai ${nextPartaiNum} berhasil ditambahkan!`);
  };

  // Clear tournament schedules
  const handleClearSchedules = () => {
    sound.playClick();
    setShowClearConfirm(true);
  };

  const executeClearSchedules = async () => {
    setShowClearConfirm(false);
    sound.playBuzzer();
    setSchedules([]);
    try {
      const res = await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: categories,
          newParticipants: participants,
          newMatches: []
        })
      });
      if (res.ok) {
        notifyToast("🧹 Seluruh jadwal berhasil dikosongkan!");
      }
    } catch (err) {
      console.error(err);
    }
  };



  // Sync to backend with automatic sequential generation (Class A first down to last registered)
  const handleApplyAllSchedules = async () => {
    sound.playScore();
    try {
      // 1. Sort all schedules sequentially: optionally by time or Class 1 to last, Putra/Putri, Round 1 upwards, then Match index
      const sortedSchedules = [...schedules].sort((a, b) => {
        if (sortByTime) {
          const timeA = parseTimeToMinutes(a.matchTime || "");
          const timeB = parseTimeToMinutes(b.matchTime || "");
          if (timeA !== timeB) return timeA - timeB;
        }

        const catIdxA = categories.findIndex(c => c.id === a.categoryClassId);
        const catIdxB = categories.findIndex(c => c.id === b.categoryClassId);
        if (catIdxA !== catIdxB) return catIdxA - catIdxB;

        if (a.gender !== b.gender) {
          return a.gender === "PUTRA" ? -1 : 1;
        }

        const getRoundNum = (m: any) => {
          const match = m.id?.match(/-r(\d+)-/);
          return match ? parseInt(match[1]) : 0;
        };
        const rA = getRoundNum(a);
        const rB = getRoundNum(b);
        if (rA !== rB) return rA - rB;

        const getMatchIdx = (m: any) => {
          const parts = m.id?.split("-");
          const lastPart = parts ? parts[parts.length - 1] : "";
          const idxVal = parseInt(lastPart);
          return isNaN(idxVal) ? 0 : idxVal;
        };
        return getMatchIdx(a) - getMatchIdx(b);
      });

      // 2. Renumber match numbers sequentially (1, 2, etc.)
      const updatedSchedules = sortedSchedules.map((m, index) => ({
        ...m,
        matchNumber: `${index + 1}`
      }));

      // Update local state
      setSchedules(updatedSchedules);

      // Sync to database
      const res = await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: categories,
          newParticipants: participants,
          newMatches: updatedSchedules
        })
      });

      if (res.ok) {
        notifyToast(`🚀 Berhasil menggenerate secara otomatis ${updatedSchedules.length} partai jadwal tanding berurutan dari kelas A sampai terakhir!`);
        onClose();
      } else {
        notifyToast("❌ Gagal menerapkan jadwal ke server.");
      }
    } catch (err) {
      console.error(err);
      notifyToast("❌ Terjadi kesalahan saat menyimpan jadwal.");
    }
  };
  const handleDownloadJadwalTemplate = () => {
    sound.playClick();
    const headers = [
      "Partai", "Kelas", "Gender", "Kategori Usia", "Tahap",
      "Nama Biru", "Kontingen Biru", "Nama Merah", "Kontingen Merah"
    ];
    const data = [
      headers,
      ["1", "A", "PUTRA", "REMAJA", "PENYISIHAN", "BUDI PRASETYO", "DKI JAKARTA", "ANDI SANTOSO", "JAWA TENGAH"],
      ["2", "B", "PUTRI", "REMAJA", "PENYISIHAN", "DIAN UTAMI", "JAWA TIMUR", "SITI NUR HALIZA", "JAWA BARAT"],
      ["3", "C", "PUTRA", "DEWASA", "SEMIFINAL", "FAJAR NUGRAHA", "DI YOGYAKARTA", "EKO WAHYUDI", "BALI"],
      ["4", "A", "PUTRA", "DEWASA", "FINAL", "HERI SUSANTO", "SUMATERA UTARA", "GUNTUR PERMANA", "BANTEN"]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jadwal_Partai");
    XLSX.writeFile(workbook, "Template_Jadwal_Partai_IPSI.xlsx");
    notifyToast("📥 Template jadwal partai berhasil diunduh!");
  };

  const handleImportJadwalExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sound.playClick();
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstream = evt?.target?.result;
        if (!bstream) return;
        const workbook = XLSX.read(bstream, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

        if (rawRows.length < 2) {
          notifyToast("❌ Berkas Excel kosong atau format tidak didukung!");
          return;
        }

        const headers = rawRows[0] as any[];
        // Map columns
        let idxPartai = -1;
        let idxKelas = -1;
        let idxGender = -1;
        let idxUsia = -1;
        let idxTahap = -1;
        let idxNameRed = -1;
        let idxClubRed = -1;
        let idxNameBlue = -1;
        let idxClubBlue = -1;

        headers.forEach((h: any, i: number) => {
          if (!h) return;
          const s = h.toString().toLowerCase().trim();
          if (s.includes("partai") || s === "no" || s === "nomor" || s === "id") idxPartai = i;
          else if (s.includes("kelas") || s === "class") idxKelas = i;
          else if (s.includes("gender") || s === "jk" || s === "jenis kelamin" || s === "sex") idxGender = i;
          else if (s.includes("usia") || s.includes("umur") || s.includes("age") || s.includes("division") || s.includes("kategori")) idxUsia = i;
          else if (s.includes("tahap") || s.includes("babak") || s.includes("stage") || s.includes("tahapan")) idxTahap = i;
          else if (s.includes("nama merah") || s.includes("merah nama") || (s.includes("merah") && s.includes("nama"))) idxNameRed = i;
          else if (s.includes("kontingen merah") || s.includes("club merah") || (s.includes("merah") && (s.includes("kontingen") || s.includes("club") || s.includes("daerah")))) idxClubRed = i;
          else if (s.includes("nama biru") || s.includes("biru nama") || (s.includes("biru") && s.includes("nama"))) idxNameBlue = i;
          else if (s.includes("kontingen biru") || s.includes("club biru") || (s.includes("biru") && (s.includes("kontingen") || s.includes("club") || s.includes("daerah")))) idxClubBlue = i;
        });

        // Fallbacks if columns are not exactly named
        if (idxPartai === -1) idxPartai = 0;
        if (idxKelas === -1) idxKelas = 1;
        if (idxGender === -1) idxGender = 2;
        if (idxUsia === -1) idxUsia = 3;
        if (idxTahap === -1) idxTahap = 4;
        if (idxNameBlue === -1) idxNameBlue = 5;
        if (idxClubBlue === -1) idxClubBlue = 6;
        if (idxNameRed === -1) idxNameRed = 7;
        if (idxClubRed === -1) idxClubRed = 8;

        const newSchedules: any[] = [];
        const newParticipants: any[] = [...participants];
        const newCategories: any[] = [...categories];

        for (let j = 1; j < rawRows.length; j++) {
          const r = rawRows[j];
          if (!r || r.length === 0 || (!r[idxNameRed] && !r[idxNameBlue])) continue;

          const partaiVal = (r[idxPartai]?.toString() || `${j}`).replace(/partai\s*/gi, "").trim();
          const kelasVal = (r[idxKelas]?.toString() || "A").replace(/kelas\s*/gi, "").toUpperCase().trim();
          let genderVal = r[idxGender]?.toString()?.toUpperCase() || "PUTRA";
          if (genderVal.includes("W") || genderVal.includes("PUTRI") || genderVal.includes("F")) {
            genderVal = "PUTRI";
          } else {
            genderVal = "PUTRA";
          }
          const usiaVal = r[idxUsia]?.toString()?.toUpperCase() || "REMAJA";
          const tahapVal = r[idxTahap]?.toString()?.toUpperCase() || "PENYISIHAN";
          const nameRedVal = r[idxNameRed]?.toString() || "";
          const clubRedVal = r[idxClubRed]?.toString() || "";
          const nameBlueVal = r[idxNameBlue]?.toString() || "";
          const clubBlueVal = r[idxClubBlue]?.toString() || "";

          // Ensure class exists as category
          const cleanK = kelasVal.trim().toUpperCase();
          const catId = `cat-${cleanK.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
          if (!newCategories.some(c => c.id === catId)) {
            newCategories.push({
              id: catId,
              name: `Kelas ${cleanK}`,
              minWeight: 55,
              maxWeight: 60,
              division: usiaVal
            });
          }

          // Generate unique participant IDs for Red & Blue
          const redId = `p-auto-red-${j}-${Date.now()}`;
          const blueId = `p-auto-blue-${j}-${Date.now()}`;

          // Add participants if name exists
          if (nameRedVal) {
            newParticipants.push({
              id: redId,
              name: nameRedVal.toUpperCase(),
              club: clubRedVal.toUpperCase(),
              gender: genderVal,
              categoryClassId: catId,
              weight: 55
            });
          }
          if (nameBlueVal) {
            newParticipants.push({
              id: blueId,
              name: nameBlueVal.toUpperCase(),
              club: clubBlueVal.toUpperCase(),
              gender: genderVal,
              categoryClassId: catId,
              weight: 55
            });
          }

          newSchedules.push({
            id: `m-excel-${j}-${Date.now()}`,
            matchNumber: `${partaiVal}`,
            stage: tahapVal,
            categoryClassId: catId,
            fighterRedId: nameRedVal ? redId : "KOSONG",
            fighterBlueId: nameBlueVal ? blueId : "KOSONG",
            fighterRedName: nameRedVal ? nameRedVal.toUpperCase() : "",
            fighterRedClub: clubRedVal ? clubRedVal.toUpperCase() : "",
            fighterBlueName: nameBlueVal ? nameBlueVal.toUpperCase() : "",
            fighterBlueClub: clubBlueVal ? clubBlueVal.toUpperCase() : "",
            arena: scheduleGelanggang || "GELANGGANG I",
            gender: genderVal,
            division: usiaVal,
            status: "BELUM"
          });
        }

        setCategories(newCategories);
        setParticipants(newParticipants);
        setSchedules(newSchedules);
        notifyToast(`🎉 Sukses mengimpor ${newSchedules.length} partai dari file Excel!`);
      } catch (err) {
        console.error(err);
        notifyToast("❌ Gagal membaca file Excel. Pastikan format kolom sesuai.");
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" id="schedule-workspace-root">
      <div className="bg-[#0b0c24] border border-purple-800/60 rounded-2xl w-full max-w-5xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col p-4 sm:p-5 animate-scaleIn relative overflow-hidden my-auto max-h-[96vh]">
        
        {/* Glow Effects */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-fuchsia-600/10 blur-[100px] rounded-full pointer-events-none" />

        {/* TOP HEADER BLOCK */}
        <div className="border-b border-[#1e293b] pb-2.5 mb-2.5 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#1a0f35] border border-purple-800/40 p-2 rounded-lg shadow-[0_0_15px_rgba(147,51,234,0.3)]">
              <Calendar className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-purple-400 font-sans font-black text-xs tracking-wider uppercase">
                GENERATOR DAN PARAMETER JADWAL PERTANDINGAN
              </h2>
              <p className="text-[9.5px] text-slate-400 font-medium font-sans">
                Unggah berkas jadwal pertandingan (.xlsx), edit data secara presisi, lalu gunakan rincian partai langsung di lapangan.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="bg-[#e11d48] hover:bg-rose-500 text-white w-6 h-6 flex items-center justify-center font-bold transition-all rounded-md cursor-pointer shadow-md select-none text-xs border-0"
          >
            &times;
          </button>
        </div>

        {/* HIDDEN FILE INPUT */}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleImportJadwalExcel}
          accept=".xlsx, .xls"
          className="hidden"
        />

        {/* EXCEL UPLOAD HEADER DESIGN AND CONTROLS */}
        <div className="bg-[#0e1630] border border-[#232d5c]/60 rounded-xl p-3 mb-3.5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 relative z-10 shadow-inner">
          <div className="flex flex-col gap-0.5 max-w-xl">
            <h3 className="text-[10.5px] font-black tracking-wider text-slate-200 uppercase">
              UNGGAH SPREADSHEET JADWAL PARTAI
            </h3>
            <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed font-sans">
              Pastikan kolom spreadsheet mengandung: Partai, Kelas, Gender, Kategori Usia, Tahap, Nama Merah, Kontingen Merah, Nama Biru, Kontingen Biru
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            
            {/* FIRST ROW OF CONTROLS */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {/* GELANGGANG SELECTOR */}
              <div className="relative flex items-center bg-[#1a0f35] border border-purple-800/40 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors hover:border-purple-500/80 flex-1 sm:flex-initial min-w-[150px]">
                <Layers className="w-3 h-3 text-purple-400 mr-1 shrink-0" />
                <span className="text-[9px] font-sans font-bold text-slate-400 mr-1 uppercase">GELANGGANG:</span>
                <select
                  value={scheduleGelanggang}
                  onChange={(e) => {
                    sound.playClick();
                    setScheduleGelanggang(e.target.value);
                  }}
                  className="bg-transparent text-purple-400 font-sans font-black text-[11px] uppercase cursor-pointer focus:outline-none pr-3 border-none appearance-none flex-grow"
                >
                  <option value="GELANGGANG I" className="bg-[#0b0c24] text-purple-400 font-bold">GELANGGANG I</option>
                  <option value="GELANGGANG II" className="bg-[#0b0c24] text-purple-400 font-bold">GELANGGANG II</option>
                  <option value="GELANGGANG III" className="bg-[#0b0c24] text-purple-400 font-bold">GELANGGANG III</option>
                </select>
                <div className="pointer-events-none absolute right-2">
                  <ChevronDown className="w-2.5 h-2.5 text-purple-400" />
                </div>
              </div>

              {/* UNDUH TEMPLATE */}
              <button
                onClick={handleDownloadJadwalTemplate}
                className="bg-[#062d24] hover:bg-[#0d4f3e] border border-[#008000]/60 text-[#008000] font-sans font-black py-1.5 px-3 rounded-lg text-[9.5px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md flex-1 sm:flex-initial"
              >
                <Download className="w-3 h-3" />
                UNDUH TEMPLATE
              </button>
            </div>

            {/* SECOND ROW OF CONTROLS */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {/* KOSONGKAN JADWAL */}
              <button
                onClick={handleClearSchedules}
                className="bg-[#3b0f17] hover:bg-[#591421] border border-red-500/50 text-[#f43f5e] font-sans font-black py-1.5 px-3 rounded-lg text-[9.5px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md flex-1 sm:flex-initial"
              >
                <Trash2 className="w-3 h-3" />
                KOSONGKAN JADWAL
              </button>

              {/* BAGAN TURNAMEN MODAL TRIGGER */}
              <button
                onClick={() => {
                  sound.playClick();
                  const firstCat = categories.length > 0 ? categories[0].id : (schedules.length > 0 ? schedules[0].categoryClassId : "");
                  setModalBracketCategory(selectedCategoryFilter !== "ALL" ? selectedCategoryFilter : firstCat);
                  setModalBracketGender(selectedGenderFilter !== "ALL" ? (selectedGenderFilter as "PUTRA" | "PUTRI") : "PUTRA");
                  setShowBracketModal(true);
                }}
                className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-sans font-black py-1.5 px-3 rounded-lg text-[9.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md flex-1 sm:flex-initial"
              >
                <Trophy className="w-3.5 h-3.5" />
                BAGAN TURNAMEN
              </button>

              {/* IMPOR FILE JADWAL */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-[#1b1c50] hover:bg-[#272a76] border border-blue-500/60 text-[#818cf8] font-sans font-black py-1.5 px-3.5 rounded-lg text-[9.5px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md flex-1 sm:flex-initial"
              >
                <Upload className="w-3 h-3" />
                IMPOR FILE JADWAL
              </button>
            </div>
            
          </div>
        </div>

        {/* MIDDLE SECTION: TABLE */}
        <div className="bg-[#0e1630] border border-[#232d5c]/40 rounded-xl p-3 flex flex-col gap-2 relative z-10 flex-grow overflow-hidden shadow-inner">
          
          {/* Table Header Action Bar */}
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
            <h3 className="text-[11px] font-black tracking-wider text-slate-100 uppercase">
              DAFTAR JADWAL PERTANDINGAN YANG TERBUKA ({visibleMatches.length} PARTAI)
            </h3>
            <button
              onClick={handleAddPartyRow}
              className="text-[#0284c7] hover:text-[#38bdf8] font-sans font-black text-[11px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer bg-transparent border-0"
            >
              + TAMBAH BARIS PARTAI
            </button>
          </div>

          {/* TABLE SCROLL CONTAINER */}
          <div className="overflow-y-auto overflow-x-auto flex-grow max-h-[46vh] rounded-xl border border-[#232d5c]/60 shadow-lg min-h-[220px]">
            <table className="w-full border-collapse text-left text-xs min-w-[950px]">
              <thead className="bg-[#0b0c24] sticky top-0 z-30">
                <tr className="text-slate-400 font-sans text-[9px] font-black uppercase tracking-wider border-b border-[#232d5c]">
                  <th className="py-2 px-1.5 text-center border-r border-[#232d5c]/60 w-12">PARTAI</th>
                  <th className="py-2 px-1.5 text-center border-r border-[#232d5c]/60 w-12">KELAS</th>
                  <th className="py-2 px-1.5 text-center border-r border-[#232d5c]/60 w-22">GENDER</th>
                  <th className="py-2 px-1.5 text-center border-r border-[#232d5c]/60 w-24">USIA</th>
                  <th className="py-2 px-1.5 text-center border-r border-[#232d5c]/60 w-26">TAHAPAN</th>
                  <th className="py-2 px-2 border-r border-[#232d5c]/60 w-72 text-blue-400 bg-blue-950/10">SUDUT BIRU (ATLET & REGU)</th>
                  <th className="py-2 px-2 border-r border-[#232d5c]/60 w-72 text-rose-400 bg-rose-950/10">SUDUT MERAH (ATLET & REGU)</th>
                  <th className="py-2 px-1.5 text-center w-28">FITUR KONTROL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232d5c]/40 bg-[#0e1630]/60">
                {visibleMatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 italic font-mono uppercase text-[10px]">
                      Tidak ada daftar jadwal tanding aktif. Silakan unggah spreadsheet atau klik tambah baris partai.
                    </td>
                  </tr>
                ) : (
                  visibleMatches.map((m, idx) => {
                    const athleteRedName = getParticipantName(m.fighterRedId);
                    const athleteRedClub = getParticipantClub(m.fighterRedId);
                    const athleteBlueName = getParticipantName(m.fighterBlueId);
                    const athleteBlueClub = getParticipantClub(m.fighterBlueId);

                    return (
                       <tr key={m.id || idx} className="hover:bg-[#151c3d]/40 duration-150 transition-colors">
                        
                        {/* PARTAI CELL */}
                        <td className="py-1.5 px-1 border-r border-[#232d5c]/40 text-center font-sans font-black text-slate-100 text-[11px] justify-center">
                          <input
                            type="text"
                            value={m.matchNumber || ""}
                            onChange={(e) => handleUpdateMatchField(m.id, "matchNumber", e.target.value)}
                            className="bg-[#0b0c24] text-center font-bold text-slate-100 w-9 mx-auto focus:outline-none focus:bg-[#1a2046] rounded py-0.5 border border-[#232d5c]/50 text-[11px]"
                          />
                        </td>

                        {/* KELAS CELL */}
                        <td className="py-1.5 px-1 border-r border-[#232d5c]/40 text-center font-mono font-black text-slate-100">
                          <input
                            type="text"
                            value={resolveClassDisplay(m.categoryClassId)}
                            onChange={(e) => handleUpdateMatchField(m.id, "kelas", e.target.value)}
                            className="bg-[#0b0c24] text-center font-black text-slate-100 w-9 mx-auto focus:outline-none focus:bg-[#1a2046] rounded py-0.5 border border-[#232d5c]/50 text-[11px] uppercase"
                          />
                        </td>

                        {/* GENDER CELL */}
                        <td className="py-1.5 px-1 border-r border-[#232d5c]/40 text-center">
                          <select
                            value={m.gender || "PUTRA"}
                            onChange={(e) => handleUpdateMatchField(m.id, "gender", e.target.value)}
                            className="bg-[#0b0c24] text-purple-400 font-sans font-black text-[10px] uppercase cursor-pointer focus:outline-none px-1 py-0.5 rounded border border-purple-900/30 w-full text-center"
                          >
                            <option value="PUTRA" className="bg-[#0b0c24]">PUTRA</option>
                            <option value="PUTRI" className="bg-[#0b0c24]">PUTRI</option>
                          </select>
                        </td>

                        {/* USIA CELL */}
                        <td className="py-1.5 px-1 border-r border-[#232d5c]/40 text-center">
                          <input
                            type="text"
                            value={m.division || "REMAJA"}
                            onChange={(e) => handleUpdateMatchField(m.id, "usia", e.target.value)}
                            className="bg-[#0b0c24] text-center font-bold text-slate-100 w-full focus:outline-none focus:bg-[#1a2046] rounded py-0.5 border border-[#232d5c]/50 text-[11px] uppercase text-center justify-center"
                          />
                        </td>

                        {/* TAHAPAN CELL */}
                        <td className="py-1.5 px-1 border-r border-[#232d5c]/40 text-center mr-0.5">
                          <input
                            type="text"
                            value={m.stage || "PENYISIHAN"}
                            onChange={(e) => handleUpdateMatchField(m.id, "stage", e.target.value)}
                            className="bg-[#0b0c24] text-center font-bold text-slate-100 w-full focus:outline-none focus:bg-[#1a2046] rounded py-0.5 border border-[#232d5c]/50 text-[11px] uppercase text-center justify-center"
                          />
                        </td>

                        {/* SUDUT BIRU CELL */}
                        <td className="py-1 px-1.5 border-r border-[#232d5c]/40 bg-blue-950/5">
                          <div className="flex flex-col gap-0.5 w-full">
                            <input
                              type="text"
                              placeholder="NAMA ATLET BIRU"
                              value={athleteBlueName === "ATLIT" ? "" : athleteBlueName}
                              onChange={(e) => handleUpdateAthleteNameAndClub(m.id, "BLUE", "name", e.target.value)}
                              className="bg-[#0c132c] border border-blue-900/50 text-cyan-200 placeholder-blue-700/40 px-2 py-0.5 rounded text-[11px] font-sans font-black uppercase text-left focus:outline-none focus:border-blue-500 transition-all font-sans"
                            />
                            <input
                              type="text"
                              placeholder="KONTINGEN BIRU / REGU"
                              value={athleteBlueClub === "KONTINGEN" ? "" : athleteBlueClub}
                              onChange={(e) => handleUpdateAthleteNameAndClub(m.id, "BLUE", "club", e.target.value)}
                              className="bg-[#0c132c] border border-blue-900/42 text-slate-400 placeholder-blue-700/20 px-2 py-0.5 rounded text-[9.5px] font-mono uppercase text-left focus:outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                        </td>

                        {/* SUDUT MERAH CELL */}
                        <td className="py-1 px-1.5 border-r border-[#232d5c]/40 bg-rose-950/5">
                          <div className="flex flex-col gap-0.5 w-full">
                            <input
                              type="text"
                              placeholder="NAMA ATLET MERAH"
                              value={athleteRedName === "ATLIT" ? "" : athleteRedName}
                              onChange={(e) => handleUpdateAthleteNameAndClub(m.id, "RED", "name", e.target.value)}
                              className="bg-[#1c0813] border border-rose-950/60 text-rose-300 placeholder-rose-700/40 px-2 py-0.5 rounded text-[11px] font-sans font-black uppercase text-left focus:outline-none focus:border-rose-500 transition-all"
                            />
                            <input
                              type="text"
                              placeholder="KONTINGEN MERAH / REGU"
                              value={athleteRedClub === "KONTINGEN" ? "" : athleteRedClub}
                              onChange={(e) => handleUpdateAthleteNameAndClub(m.id, "RED", "club", e.target.value)}
                              className="bg-[#1c0813] border border-rose-950/50 text-slate-400 placeholder-rose-700/20 px-2 py-0.5 rounded text-[9.5px] font-mono uppercase text-left focus:outline-none focus:border-rose-500 transition-all"
                            />
                          </div>
                        </td>

                        {/* CONTROL FEATURE BUTTON */}
                        <td className="py-1 px-1 text-center">
                          <button
                            onClick={() => {
                              sound.playClick();
                              loadScheduleMatchItem(m.id);
                            }}
                            className="bg-[#1c204c] hover:bg-[#2b2e6e] border border-[#3b3f8c] text-white font-sans font-black py-1 px-1.5 rounded text-[9px] uppercase tracking-wider cursor-pointer w-full text-center transition-all shadow-md inline-block whitespace-nowrap"
                          >
                            GUNAKAN JADWAL
                          </button>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* BOTTOM ACTION BUTTONS BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[#1e293b] pt-2.5 mt-2.5 gap-3 px-1 relative z-10 select-none">
          <span className="text-slate-400 font-mono text-[9.5px] font-bold tracking-wider uppercase">
            Daftar Jadwal: {visibleMatches.length} Partai Pertandingan
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="px-3.5 py-1.5 text-slate-400 hover:text-white font-extrabold text-[10px] uppercase tracking-wider cursor-pointer bg-transparent border-0"
            >
              TUTUP
            </button>
            
            <button
              onClick={downloadSchedulePdf}
              className="bg-[#1d4ed8] hover:bg-blue-600 text-white font-sans font-black py-1.5 px-4 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md border-0"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              UNDUH PDF JADWAL
            </button>

            <button
              onClick={handleApplyAllSchedules}
              className="bg-[#008000] hover:bg-[#008000] text-white font-sans font-black py-1.5 px-4 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(0, 128, 0,0.2)] border-0"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              TERAPKAN SEMUA JADWAL
            </button>

            <button
              onClick={async () => {
                sound.playClick();
                if (onSyncAllBrackets) {
                  await onSyncAllBrackets(schedules, participants);
                  if (onOpenBaganScreen) {
                    onOpenBaganScreen();
                  }
                }
              }}
              className="bg-[#6d28d9] hover:bg-[#7c3aed] text-white font-sans font-black py-1.5 px-4 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(109,40,217,0.3)] border-0"
              title="Generate bagan otomatis menggunakan data atlit yang diinput pada tabel jadwal tanding"
            >
              <Award className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
              GENERATE BAGAN DARI JADWAL
            </button>
          </div>
        </div>

      </div>

      {/* CUSTOM CONFIRMATION MODAL FOR CLEARING SCHEDULE */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0c24] border border-red-500/50 rounded-2xl w-full max-w-sm p-5 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-scaleIn text-center relative overflow-hidden">
            {/* Ambient Red glow bg */}
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-red-600/10 blur-[40px] rounded-full pointer-events-none" />
            
            <div className="w-10 h-10 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-center text-red-500 mx-auto mb-3">
              <Trash2 className="w-5 h-5 animate-pulse" />
            </div>
            
            <h3 className="text-slate-100 font-sans font-black text-xs uppercase tracking-wider mb-1.5">
              yakin ingin mengosongkan jadwal?
            </h3>
            
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-5">
              Tindakan ini akan mengosongkan/menghapus seluruh rincian partai dan data tanding yang tersimpan secara permanen.
            </p>
            
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => {
                  sound.playClick();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-sans font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer border border-[#232d5c]"
              >
                batal
              </button>
              
              <button
                onClick={executeClearSchedules}
                className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-500 text-white font-sans font-black text-[10px] uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-md shadow-red-600/20"
              >
                Iya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW BAGAN INTERAKTIF TURNAMEN */}
      {showBracketModal && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0b0c24] border border-indigo-700/60 rounded-3xl w-full max-w-6xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden my-auto max-h-[95vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0c0f2b] via-[#151945] to-[#0c0f2b] border-b border-indigo-800/40 px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-xl text-slate-950 font-black shadow-md">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-black text-sm uppercase tracking-wide text-white flex items-center gap-2">
                    <span>Visual Bagan Turnamen Interaktif</span>
                  </h3>
                  <p className="text-xs text-indigo-300/70">
                    Braket tanding adaptif dengan penentuan otomatis pemenang dan jalur eliminasi
                  </p>
                </div>
              </div>

              {/* Category & Gender Switchers inside modal */}
              <div className="flex items-center gap-2">
                <select
                  value={modalBracketCategory}
                  onChange={e => setModalBracketCategory(e.target.value)}
                  className="bg-[#070b20] border border-indigo-700/60 text-xs font-bold text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#0c0f2b] text-white">
                      {c.name} ({c.division || "DEWASA"})
                    </option>
                  ))}
                </select>

                <select
                  value={modalBracketGender}
                  onChange={e => setModalBracketGender(e.target.value as "PUTRA" | "PUTRI")}
                  className="bg-[#070b20] border border-indigo-700/60 text-xs font-bold text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
                >
                  <option value="PUTRA" className="bg-[#0c0f2b] text-white">PUTRA</option>
                  <option value="PUTRI" className="bg-[#0c0f2b] text-white">PUTRI</option>
                </select>

                <button
                  onClick={() => setShowBracketModal(false)}
                  className="w-8 h-8 rounded-full bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800 text-slate-300 hover:text-white flex items-center justify-center transition-all ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: TournamentBracketView */}
            <div className="p-4 flex-1 overflow-auto bg-[#040612]">
              <TournamentBracketView
                participants={participants}
                matches={schedules}
                categoryName={categories.find(c => c.id === modalBracketCategory)?.name || "Kategori Turnamen"}
                categoryClassId={modalBracketCategory}
                gender={modalBracketGender}
                arenaName={scheduleGelanggang}
                className="w-full border-none shadow-none bg-transparent"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
