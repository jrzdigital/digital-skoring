import React, { useState, useEffect } from "react";
import { AppState, Match, Athlete, CompetitorPerformance, JudgeScore } from "../types";
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Shuffle, 
  Download, 
  FileText, 
  Search, 
  Check, 
  ChevronRight, 
  Users, 
  GitBranch, 
  Activity, 
  Grid,
  Info,
  Calendar,
  AlertCircle
} from "lucide-react";

interface RegistrationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
  onDispatchAction: (type: string, payload: any) => void;
}

export default function RegistrationOverlay({ 
  isOpen, 
  onClose, 
  appState, 
  onDispatchAction 
}: RegistrationOverlayProps) {
  const { athletes = [], matches = [] } = appState;

  const [activeTab, setActiveTab] = useState<"input" | "bagan" | "kontrol">("input");

  // ==========================================
  // TAB 1: FORM STATES & MUTATIONS
  // ==========================================
  const [nama, setNama] = useState("");
  const [kontingen, setKontingen] = useState("");
  const [gelanggang, setGelanggang] = useState("GELANGGANG 1");
  const [sistemTanding, setSistemTanding] = useState<'Battle' | 'Pool'>("Battle");
  const [kategoriJurus, setKategoriJurus] = useState("Tunggal");
  const [usia, setUsia] = useState("REMAJA");
  const [gender, setGender] = useState<'Putera' | 'Puteri'>("Putera");
  const [tahap, setTahap] = useState("PENYISIHAN");
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(true);
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);

  // Stats calculation
  const totalTunggal = athletes.filter(a => a.kategoriJurus?.toLowerCase() === "tunggal").length;
  const totalGanda = athletes.filter(a => a.kategoriJurus?.toLowerCase() === "ganda").length;
  const totalRegu = athletes.filter(a => a.kategoriJurus?.toLowerCase() === "regu").length;
  const totalSoloCreative = athletes.filter(a => a.kategoriJurus?.toLowerCase() === "solo creative").length;

  const handleSaveAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !kontingen) {
      alert("Nama lengkap dan kontingen wajib diisi!");
      return;
    }

    if (editingAthleteId) {
      // Edit mode
      const updatedAthletes = athletes.map(a => {
        if (a.id === editingAthleteId) {
          return {
            ...a,
            nama: nama.toUpperCase(),
            kontingen: kontingen.toUpperCase(),
            gelanggang,
            sistemTanding,
            kategoriJurus,
            usia,
            gender,
            tahap
          };
        }
        return a;
      });
      onDispatchAction("UPDATE_ATHLETES", { athletes: updatedAthletes });
      setEditingAthleteId(null);
    } else {
      // Add mode
      onDispatchAction("ADD_ATHLETE", {
        nama,
        kontingen,
        gelanggang,
        sistemTanding,
        kategoriJurus,
        usia,
        gender,
        tahap
      });
    }

    // Reset some form fields
    setNama("");
    setKontingen("");
  };

  const handleEditAthleteClick = (ath: Athlete) => {
    setEditingAthleteId(ath.id);
    setNama(ath.nama);
    setKontingen(ath.kontingen);
    setGelanggang(ath.gelanggang || "GELANGGANG 1");
    setSistemTanding(ath.sistemTanding || "Battle");
    setKategoriJurus(ath.kategoriJurus || "Tunggal");
    setUsia(ath.usia || "REMAJA");
    setGender((ath.gender as 'Putera' | 'Puteri') || "Putera");
    setTahap(ath.tahap || "PENYISIHAN");
  };

  const handleDeleteAthlete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus atlit ini dari registrasi?")) {
      onDispatchAction("DELETE_ATHLETE", { athleteId: id });
    }
  };

  const handleClearForm = () => {
    setNama("");
    setKontingen("");
    setEditingAthleteId(null);
  };

  const handleResetAllData = () => {
    if (confirm("PERINGATAN: Tindakan ini akan menghapus semua atlet terdaftar dan semua partai tanding jadwal! Lanjutkan?")) {
      onDispatchAction("CLEAR_ALL_DATA", {});
    }
  };

  // Filter roster
  const filteredAthletes = athletes.filter(ath => {
    const matchesSearch = 
      ath.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ath.kontingen.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (showAll) return matchesSearch;

    // If showAll is false, filter only matching current form categories for dynamic focus
    return (
      matchesSearch &&
      ath.usia === usia &&
      ath.gender === gender &&
      ath.kategoriJurus === kategoriJurus
    );
  });

  // ==========================================
  // TAB 2: BAGAN PERTANDINGAN
  // ==========================================
  // Group athletes into unique bracket classes dynamically
  const uniqueClasses: Array<{
    key: string;
    kategoriJurus: string;
    usia: string;
    gender: 'Putera' | 'Puteri';
    count: number;
  }> = [];

  athletes.forEach(ath => {
    const key = `${ath.kategoriJurus} - ${ath.usia} - ${ath.gender}`;
    const existing = uniqueClasses.find(c => c.key === key);
    if (existing) {
      existing.count += 1;
    } else {
      uniqueClasses.push({
        key,
        kategoriJurus: ath.kategoriJurus || "Tunggal",
        usia: ath.usia || "REMAJA",
        gender: ath.gender || "Putera",
        count: 1
      });
    }
  });

  const [selectedClassKey, setSelectedClassKey] = useState<string>("");
  
  // Select first available class on load
  useEffect(() => {
    if (uniqueClasses.length > 0 && !selectedClassKey) {
      setSelectedClassKey(uniqueClasses[0].key);
    }
  }, [athletes]);

  const activeClass = uniqueClasses.find(c => c.key === selectedClassKey) || uniqueClasses[0];

  // Bracket system types
  const [baganSystem, setBaganSystem] = useState<"nasional" | "klasik">("nasional"); // Dua Sisi (Nasional) or Satu Sisi (Klasik)
  const [isBaganPool, setIsBaganPool] = useState(false);

  const activeClassAthletes = athletes.filter(ath => {
    if (!activeClass) return false;
    return (
      ath.kategoriJurus === activeClass.kategoriJurus &&
      ath.usia === activeClass.usia &&
      ath.gender === activeClass.gender
    );
  });

  // Shuffle athletes randomly
  const handleShuffleUndian = () => {
    if (activeClassAthletes.length < 2) {
      alert("Butuh minimal 2 atlet terdaftar di kelas ini untuk mengocok undian!");
      return;
    }
    const shuffled = [...activeClassAthletes].sort(() => Math.random() - 0.5);
    
    // Map shuffled back into the main athletes array
    const updatedAthletes = athletes.map(a => {
      if (
        a.kategoriJurus === activeClass.kategoriJurus &&
        a.usia === activeClass.usia &&
        a.gender === activeClass.gender
      ) {
        // Swap with shuffled pool
        const idx = activeClassAthletes.findIndex(aa => aa.id === a.id);
        return shuffled[idx];
      }
      return a;
    });

    onDispatchAction("UPDATE_ATHLETES", { athletes: updatedAthletes });
    alert("Kocok undian bagan berhasil diterapkan secara acak!");
  };

  // Clear bracket for active class
  const handleKosongkanKelas = () => {
    if (confirm(`Kosongkan semua atlet dari kelas ${selectedClassKey}?`)) {
      const updatedAthletes = athletes.filter(a => {
        return !(
          a.kategoriJurus === activeClass.kategoriJurus &&
          a.usia === activeClass.usia &&
          a.gender === activeClass.gender
        );
      });
      onDispatchAction("UPDATE_ATHLETES", { athletes: updatedAthletes });
    }
  };

  // Generate automated bracket match-ups inside state
  const handleGenerateBracketSchedule = () => {
    if (activeClassAthletes.length < 2) {
      alert("Dibutuhkan minimal 2 atlit dalam kelas ini untuk menyusun bagan!");
      return;
    }

    const newMatches: Match[] = [];
    const classAthletes = [...activeClassAthletes];

    // Determine matches based on capacity
    // 4 athletes = 2 Semi-finals, 1 Final (perfect power of two)
    // We will generate the semi-finals & final as draft matches
    let matchIdIndex = Date.now();
    let startPartaiNo = matches.length > 0 ? Math.max(...matches.map(m => m.noPartai)) + 1 : 1;

    if (classAthletes.length <= 2) {
      // Direct Final
      newMatches.push({
        id: `m-draft-${matchIdIndex}-1`,
        noPartai: startPartaiNo,
        kategori: activeClass.kategoriJurus as any,
        usia: activeClass.usia,
        gender: activeClass.gender,
        tahap: "FINAL",
        durasiTampil: "03.00 Menit",
        sudutMerah: { athlete: classAthletes[0], wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        sudutBiru: { athlete: classAthletes[1] || null, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        status: "Scheduled",
        activeSudut: null,
        winner: null
      });
    } else if (classAthletes.length <= 4) {
      // 2 Semifinals, 1 Final
      const s1: Match = {
        id: `m-draft-${matchIdIndex}-1`,
        noPartai: startPartaiNo,
        kategori: activeClass.kategoriJurus as any,
        usia: activeClass.usia,
        gender: activeClass.gender,
        tahap: "SEMIFINAL",
        durasiTampil: "03.00 Menit",
        sudutMerah: { athlete: classAthletes[0], wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        sudutBiru: { athlete: classAthletes[2] || null, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        status: "Scheduled",
        activeSudut: null,
        winner: null
      };

      const s2: Match = {
        id: `m-draft-${matchIdIndex}-2`,
        noPartai: startPartaiNo + 1,
        kategori: activeClass.kategoriJurus as any,
        usia: activeClass.usia,
        gender: activeClass.gender,
        tahap: "SEMIFINAL",
        durasiTampil: "03.00 Menit",
        sudutMerah: { athlete: classAthletes[1] || null, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        sudutBiru: { athlete: classAthletes[3] || null, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        status: "Scheduled",
        activeSudut: null,
        winner: null
      };

      const finalMatch: Match = {
        id: `m-draft-${matchIdIndex}-3`,
        noPartai: startPartaiNo + 2,
        kategori: activeClass.kategoriJurus as any,
        usia: activeClass.usia,
        gender: activeClass.gender,
        tahap: "FINAL",
        durasiTampil: "03.00 Menit",
        sudutMerah: { athlete: { id: "bye-1", nama: "MENUNGGU PEMENANG PARTAI 1", kontingen: "PEMENANG PTY 1", usia: activeClass.usia, gender: activeClass.gender }, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        sudutBiru: { athlete: { id: "bye-2", nama: "MENUNGGU PEMENANG PARTAI 2", kontingen: "PEMENANG PTY 2", usia: activeClass.usia, gender: activeClass.gender }, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        status: "Scheduled",
        activeSudut: null,
        winner: null
      };

      newMatches.push(s1, s2, finalMatch);
    } else {
      // Quarterfinals & Semis & Final
      // 8 athlete bracket logic
      let partaiNo = startPartaiNo;
      const qMatches: Match[] = [];
      for (let i = 0; i < 8; i += 2) {
        if (classAthletes[i]) {
          qMatches.push({
            id: `m-draft-${matchIdIndex}-${partaiNo}`,
            noPartai: partaiNo,
            kategori: activeClass.kategoriJurus as any,
            usia: activeClass.usia,
            gender: activeClass.gender,
            tahap: "PEREMPAT FINAL",
            durasiTampil: "03.00 Menit",
            sudutMerah: { athlete: classAthletes[i] || null, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
            sudutBiru: { athlete: classAthletes[i+1] || null, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
            status: "Scheduled",
            activeSudut: null,
            winner: null
          });
          partaiNo++;
        }
      }
      
      const sem1: Match = {
        id: `m-draft-${matchIdIndex}-sem-1`,
        noPartai: partaiNo,
        kategori: activeClass.kategoriJurus as any,
        usia: activeClass.usia,
        gender: activeClass.gender,
        tahap: "SEMIFINAL",
        durasiTampil: "03.00 Menit",
        sudutMerah: { athlete: { id: "q-1", nama: `PEMENANG QF 1`, kontingen: "-", usia: activeClass.usia, gender: activeClass.gender }, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        sudutBiru: { athlete: { id: "q-2", nama: `PEMENANG QF 2`, kontingen: "-", usia: activeClass.usia, gender: activeClass.gender }, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        status: "Scheduled",
        activeSudut: null,
        winner: null
      };
      partaiNo++;

      const sem2: Match = {
        id: `m-draft-${matchIdIndex}-sem-2`,
        noPartai: partaiNo,
        kategori: activeClass.kategoriJurus as any,
        usia: activeClass.usia,
        gender: activeClass.gender,
        tahap: "SEMIFINAL",
        durasiTampil: "03.00 Menit",
        sudutMerah: { athlete: { id: "q-3", nama: `PEMENANG QF 3`, kontingen: "-", usia: activeClass.usia, gender: activeClass.gender }, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        sudutBiru: { athlete: { id: "q-4", nama: `PEMENANG QF 4`, kontingen: "-", usia: activeClass.usia, gender: activeClass.gender }, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        status: "Scheduled",
        activeSudut: null,
        winner: null
      };
      partaiNo++;

      const finalMatch: Match = {
        id: `m-draft-${matchIdIndex}-fin`,
        noPartai: partaiNo,
        kategori: activeClass.kategoriJurus as any,
        usia: activeClass.usia,
        gender: activeClass.gender,
        tahap: "FINAL",
        durasiTampil: "03.00 Menit",
        sudutMerah: { athlete: { id: "s-1", nama: `PEMENANG SF 1`, kontingen: "-", usia: activeClass.usia, gender: activeClass.gender }, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        sudutBiru: { athlete: { id: "s-2", nama: `PEMENANG SF 2`, kontingen: "-", usia: activeClass.usia, gender: activeClass.gender }, wrongMovesDeduction: 0, judgesScores: {}, isDisqualified: false, scoreApproved: false },
        status: "Scheduled",
        activeSudut: null,
        winner: null
      };

      newMatches.push(...qMatches, sem1, sem2, finalMatch);
    }

    // Append newly drafted bracket matches into draft list
    setDraftMatches([...draftMatches, ...newMatches]);
    alert(`Sukses meng-generate ${newMatches.length} partai bagan draf tanding untuk ${activeClass.key}! Silakan cek tab '3. Kontrol Partai' untuk me-review dan melakukan 'Terapkan Jadwal Terpilih'.`);
  };

  // ==========================================
  // TAB 3: KONTROL PARTAI
  // ==========================================
  // We keep a local draft queue of newly generated matches that can be approved/promoted to server's scheduled matches.
  // We initialize the draft list with existing server matches and any newly generated brackets.
  const [draftMatches, setDraftMatches] = useState<Match[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Record<string, boolean>>({});

  // Sync draft list with matches from server on component load
  useEffect(() => {
    if (matches.length > 0 && draftMatches.length === 0) {
      setDraftMatches(matches);
      const initialSelected: Record<string, boolean> = {};
      matches.forEach(m => {
        initialSelected[m.id] = true;
      });
      setSelectedMatchIds(initialSelected);
    }
  }, [matches]);

  if (!isOpen) return null;

  const handleToggleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {};
    draftMatches.forEach(m => {
      updated[m.id] = checked;
    });
    setSelectedMatchIds(updated);
  };

  const handleToggleSelectMatch = (id: string, checked: boolean) => {
    setSelectedMatchIds(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  const handleTerapkanJadwal = () => {
    const selectedMatches = draftMatches.filter(m => selectedMatchIds[m.id]);
    if (selectedMatches.length === 0) {
      alert("Silakan centang/pilih minimal 1 partai tanding untuk diterapkan ke jadwal aktif!");
      return;
    }

    // Sort selected matches by partai no to ensure order
    const orderedMatches = selectedMatches.map((m, index) => ({
      ...m,
      noPartai: index + 1 // Re-order sequentially as requested
    }));

    // Dispatch update to server state
    onDispatchAction("UPDATE_MATCHES", { matches: orderedMatches });
    alert(`Sukses menerapkan ${orderedMatches.length} Partai ke Jadwal Laga Aktif Kejuaraan!`);
    onClose(); // Auto close overlay on apply
  };

  const handleShuffleDraft = () => {
    if (draftMatches.length < 2) return;
    const shuffled = [...draftMatches].sort(() => Math.random() - 0.5);
    setDraftMatches(shuffled);
    alert("Draf susunan partai tanding berhasil di-shuffle secara acak!");
  };

  const handleCancelAllDraft = () => {
    if (confirm("Apakah Anda yakin ingin membatalkan dan mengosongkan draf jadwal partai?")) {
      setDraftMatches([]);
      setSelectedMatchIds({});
    }
  };

  const handlePrintPDFDraft = () => {
    window.print();
  };

  const handleExportExcelDraft = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "No Partai,Kategori,Golongan Usia,Gender,Tahap,Sudut Biru,Kontingen Biru,Sudut Merah,Kontingen Merah\n";

    draftMatches.forEach(m => {
      const row = [
        m.noPartai,
        m.kategori,
        m.usia,
        m.gender,
        m.tahap || "-",
        m.sudutBiru.athlete?.nama || "TBD",
        m.sudutBiru.athlete?.kontingen || "-",
        m.sudutMerah.athlete?.nama || "TBD",
        m.sudutMerah.athlete?.kontingen || "-"
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Draf_Jadwal_Partai_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTemplateExcel = () => {
    alert("Mengunduh templat unggah data atlit Excel...");
  };

  const handleImportExcel = () => {
    alert("Silakan pilih berkas Excel (.xlsx / .csv) untuk mengimpor roster atlet secara massal.");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-md flex flex-col p-6 animate-fade-in text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-purple-500/30 pb-4 mb-4 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping"></span>
            <h1 className="text-xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 uppercase">
              REGISTRASI DATA TURNAMEN
            </h1>
          </div>
          <p className="text-xxs font-mono text-purple-400 font-bold uppercase tracking-wider mt-1">
            DASHBOARD MANAJEMEN PENDAFTARAN, BAGAN & PENJADWALAN PARTAI
          </p>
        </div>

        {/* TOP UTILITIES ROW */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleTemplateExcel}
            className="bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-md transition-all flex items-center gap-1 cursor-pointer select-none"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            TEMPLATE EXCEL
          </button>

          <button
            onClick={handleImportExcel}
            className="bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/30 text-purple-200 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-md transition-all flex items-center gap-1 cursor-pointer select-none"
          >
            <Download className="w-3.5 h-3.5 text-pink-400" rotate={180} />
            IMPOR EXCEL
          </button>

          <button
            onClick={handleExportExcelDraft}
            className="bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-md transition-all flex items-center gap-1 cursor-pointer select-none"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            EKSPOR EXCEL
          </button>

          <button
            onClick={handlePrintPDFDraft}
            className="bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-md transition-all flex items-center gap-1 cursor-pointer select-none"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            UNDUH PDF
          </button>

          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-white p-2 rounded-md transition-all cursor-pointer select-none ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* THREE TABS BAR */}
      <div className="flex border-b border-purple-500/10 mb-6 bg-slate-950/60 p-1.5 rounded-lg max-w-lg">
        <button
          onClick={() => setActiveTab("input")}
          className={`flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "input"
              ? "bg-purple-600 text-white shadow shadow-purple-900"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          1. INPUT DATA ATLIT
        </button>

        <button
          onClick={() => setActiveTab("bagan")}
          className={`flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "bagan"
              ? "bg-purple-600 text-white shadow shadow-purple-900"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          2. BAGAN PERTANDINGAN
        </button>

        <button
          onClick={() => setActiveTab("kontrol")}
          className={`flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "kontrol"
              ? "bg-purple-600 text-white shadow shadow-purple-900"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          3. KONTROL PARTAI
        </button>
      </div>

      {/* MAIN SCREEN INTERFACES */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        
        {/* ==========================================
            TAB 1: INPUT DATA ATLIT
            ========================================== */}
        {activeTab === "input" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT INPUT FORM (5 COLS) */}
            <form onSubmit={handleSaveAthlete} className="lg:col-span-5 bg-[#0b071e]/90 border border-purple-500/20 rounded-xl p-5 space-y-4 shadow-[0_0_20px_rgba(168,85,247,0.05)]">
              <h2 className="text-xs font-display font-black text-purple-400 uppercase tracking-widest border-b border-purple-500/10 pb-2.5 flex items-center gap-2">
                <Plus className="w-4 h-4 text-pink-400" />
                {editingAthleteId ? "EDIT DATA ATLIT TERDAFTAR" : "REGISTRASI DATA ATLIT BARU"}
              </h2>

              <div className="space-y-3">
                {/* NAMA LENGKAP ATLIT */}
                <div>
                  <label className="block text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider mb-1">
                    NAMA LENGKAP ATLIT
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="CTH: KADEK WAHYU DEWANTARA"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full bg-[#05030f] border border-purple-500/20 rounded-md px-3 py-2.5 text-xs text-white font-bold placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-all uppercase"
                  />
                </div>

                {/* DAERAH / KONTINGEN */}
                <div>
                  <label className="block text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider mb-1">
                    DAERAH / KONTINGEN
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="CTH: BALI - INDONESIA"
                    value={kontingen}
                    onChange={(e) => setKontingen(e.target.value)}
                    className="w-full bg-[#05030f] border border-purple-500/20 rounded-md px-3 py-2.5 text-xs text-white font-semibold placeholder:text-slate-600 focus:outline-none focus:border-purple-500 transition-all uppercase"
                  />
                </div>

                {/* GELANGGANG & SISTEM TANDING */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider mb-1">
                      GELANGGANG
                    </label>
                    <select
                      value={gelanggang}
                      onChange={(e) => setGelanggang(e.target.value)}
                      className="w-full bg-[#05030f] border border-purple-500/20 rounded-md px-2.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-purple-500"
                    >
                      {Array.from({ length: 10 }, (_, i) => (
                        <option key={i} value={`GELANGGANG ${i + 1}`}>
                          GELANGGANG {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider mb-1">
                      SISTEM TANDING
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 bg-[#05030f] p-1 rounded border border-purple-500/20">
                      <button
                        type="button"
                        onClick={() => setSistemTanding('Battle')}
                        className={`py-1.5 text-[10px] font-black rounded cursor-pointer uppercase transition-all ${
                          sistemTanding === "Battle"
                            ? "bg-purple-600 text-white font-black"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        ⚔️ BATTLE
                      </button>
                      <button
                        type="button"
                        onClick={() => setSistemTanding('Pool')}
                        className={`py-1.5 text-[10px] font-black rounded cursor-pointer uppercase transition-all ${
                          sistemTanding === "Pool"
                            ? "bg-purple-600 text-white font-black"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        🏆 POOL
                      </button>
                    </div>
                  </div>
                </div>

                {/* KATEGORI JURUS & KATEGORI USIA */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider mb-1">
                      KATEGORI JURUS
                    </label>
                    <select
                      value={kategoriJurus}
                      onChange={(e) => setKategoriJurus(e.target.value)}
                      className="w-full bg-[#05030f] border border-purple-500/20 rounded-md px-2.5 py-2 text-xs text-white font-bold focus:outline-none"
                    >
                      <option value="Tunggal">TUNGGAL</option>
                      <option value="Tunggal Bebas">TUNGGAL BEBAS</option>
                      <option value="Ganda">GANDA</option>
                      <option value="Regu">REGU</option>
                      <option value="Solo Creative">SOLO CREATIVE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider mb-1">
                      KATEGORI USIA
                    </label>
                    <select
                      value={usia}
                      onChange={(e) => setUsia(e.target.value)}
                      className="w-full bg-[#05030f] border border-purple-500/20 rounded-md px-2.5 py-2 text-xs text-white font-bold focus:outline-none"
                    >
                      <option value="DINI">DINI</option>
                      <option value="PRA REMAJA">PRA REMAJA</option>
                      <option value="REMAJA">REMAJA</option>
                      <option value="DEWASA">DEWASA</option>
                    </select>
                  </div>
                </div>

                {/* JENIS KELAMIN & TAHAPAN PERTANDINGAN */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider mb-1">
                      JENIS KELAMIN
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full bg-[#05030f] border border-purple-500/20 rounded-md px-2.5 py-2 text-xs text-white font-bold focus:outline-none"
                    >
                      <option value="Putera">PUTRA</option>
                      <option value="Puteri">PUTRI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider mb-1">
                      TAHAPAN PERTANDINGAN
                    </label>
                    <select
                      value={tahap}
                      onChange={(e) => setTahap(e.target.value)}
                      className="w-full bg-[#05030f] border border-purple-500/20 rounded-md px-2.5 py-2 text-xs text-white font-bold focus:outline-none"
                    >
                      <option value="PENYISIHAN">PENYISIHAN</option>
                      <option value="PEREMPAT FINAL">PEREMPAT FINAL</option>
                      <option value="SEMIFINAL">SEMIFINAL</option>
                      <option value="FINAL">FINAL</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SAVE / CLEAR BUTTONS */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="submit"
                  className="col-span-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs py-3 rounded-lg cursor-pointer transition-all shadow-md uppercase tracking-wider flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" />
                  {editingAthleteId ? "PERBARUI" : "SIMPAN ATLIT"}
                </button>

                <button
                  type="button"
                  onClick={handleClearForm}
                  className="bg-slate-900 border border-purple-500/20 hover:bg-slate-800 text-purple-300 font-black text-xs py-3 rounded-lg cursor-pointer transition-all uppercase tracking-wider"
                >
                  CLEAR
                </button>
              </div>

              {/* INFORMATION FOOTNOTE */}
              <div className="bg-purple-950/20 border border-purple-500/10 rounded-md p-3 flex gap-2.5 text-[10px] leading-relaxed text-slate-400 font-medium">
                <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span>
                  Gunakan pencarian atau aktifkan <strong>"Tampilkan Semua"</strong> pada daftar atlit di kanan untuk melihat, mengedit, atau menghapus atlit di kategori lain dengan mudah.
                </span>
              </div>

              {/* DESTRUCTIVE TRASH TRIGGER */}
              <button
                type="button"
                onClick={handleResetAllData}
                className="w-full bg-[#20070c] border border-red-500/20 hover:bg-[#2d0a11] text-red-400 font-black text-xs py-3 rounded-lg cursor-pointer transition-all uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                RESET / HAPUS SEMUA DATA
              </button>
            </form>

            {/* RIGHT ROSTER GRID VIEW (7 COLS) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* FILTER HEADER BOX */}
              <div className="bg-[#0b071e]/90 border border-purple-500/20 rounded-xl p-4 shadow-[0_0_20px_rgba(168,85,247,0.05)] space-y-3">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-500/10 pb-3">
                  <div>
                    <h3 className="text-xs font-display font-black text-white uppercase tracking-widest">
                      LIVE FILTER ROSTER ATLIT
                    </h3>
                    <p className="text-[10px] font-mono text-purple-400 font-bold uppercase mt-0.5">
                      {kategoriJurus} • {usia} • {gender === "Putera" ? "PUTRA" : "PUTRI"} • {tahap}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* CHECKBOX: Tampilkan semua */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showAll}
                        onChange={(e) => setShowAll(e.target.checked)}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <span className="text-xxs font-black text-slate-300 uppercase tracking-wider">
                        Tampilkan Semua ({athletes.length})
                      </span>
                    </label>
                  </div>
                </div>

                {/* SEARCH INPUT */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari Atlit / Kontingen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#05030f] border border-purple-500/20 rounded-md pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                  />
                </div>

              </div>

              {/* ROSTER CARDS LIST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredAthletes.length === 0 ? (
                  <div className="col-span-2 text-center py-16 text-xxs font-semibold text-slate-500 bg-[#0b071e]/40 rounded-xl border border-dashed border-purple-500/10 italic">
                    Belum ada data atlet yang cocok dengan filter atau pencarian.
                  </div>
                ) : (
                  filteredAthletes.map((ath) => (
                    <div 
                      key={ath.id}
                      className="bg-[#050311]/90 border border-purple-500/10 rounded-lg p-3.5 flex justify-between items-start hover:border-purple-500/30 transition-all shadow shadow-purple-950/20"
                    >
                      <div className="space-y-1">
                        <h4 className="text-xs font-display font-black text-white uppercase tracking-wide">
                          {ath.nama}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-300 uppercase">
                          {ath.kontingen}
                        </p>
                        
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          <span className="bg-purple-950/50 text-purple-300 border border-purple-500/20 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                            {ath.tahap || "PENYISIHAN"}
                          </span>
                          <span className="bg-purple-900/30 text-purple-300 border border-purple-500/10 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                            {ath.sistemTanding || "Battle"}
                          </span>
                          <span className="bg-blue-950/40 text-blue-300 border border-blue-500/10 text-[9px] font-mono px-1.5 py-0.5 rounded uppercase">
                            {ath.gelanggang || "GELANGGANG 1"}
                          </span>
                        </div>
                      </div>

                      {/* EDIT / DELETE ACTIONS */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditAthleteClick(ath)}
                          className="p-1.5 hover:bg-purple-500/10 rounded text-slate-400 hover:text-purple-400 cursor-pointer transition-all"
                          title="Edit atlit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAthlete(ath.id)}
                          className="p-1.5 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400 cursor-pointer transition-all"
                          title="Hapus atlit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ROSTER STATS INDICATOR PILLS */}
              <div className="bg-[#0b071e]/90 border border-purple-500/20 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xxs font-mono text-slate-400 font-bold uppercase">
                <span>TOTAL REGISTRASI: <strong className="text-white text-xs font-sans font-black">{athletes.length} ATLIT</strong></span>
                
                <div className="flex flex-wrap gap-1.5">
                  <span className="bg-purple-950/50 text-purple-300 border border-purple-500/10 px-2 py-0.5 rounded">
                    TUNGGAL: {totalTunggal}
                  </span>
                  <span className="bg-purple-950/50 text-purple-300 border border-purple-500/10 px-2 py-0.5 rounded">
                    GANDA: {totalGanda}
                  </span>
                  <span className="bg-purple-950/50 text-purple-300 border border-purple-500/10 px-2 py-0.5 rounded">
                    REGU: {totalRegu}
                  </span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==========================================
            TAB 2: BAGAN PERTANDINGAN
            ========================================== */}
        {activeTab === "bagan" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT SIDE: KELAS TERDAFTAR (4 COLS) */}
            <div className="lg:col-span-4 bg-[#0b071e]/90 border border-purple-500/20 rounded-xl p-4 shadow-[0_0_20px_rgba(168,85,247,0.05)] space-y-3">
              <h3 className="text-xs font-display font-black text-purple-400 uppercase tracking-widest border-b border-purple-500/10 pb-2 flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-pink-400" />
                KATEGORI JURUS TERSEDIA
              </h3>

              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {uniqueClasses.length === 0 ? (
                  <div className="text-center py-10 text-xxs font-semibold text-slate-500 italic">
                    Belum ada data kelas terdaftar. Silakan daftarkan atlet pada Tab 1.
                  </div>
                ) : (
                  uniqueClasses.map((cl) => {
                    const isActive = cl.key === selectedClassKey;
                    return (
                      <button
                        key={cl.key}
                        onClick={() => setSelectedClassKey(cl.key)}
                        className={`w-full p-3.5 rounded-lg text-left border uppercase cursor-pointer transition-all flex justify-between items-center ${
                          isActive
                            ? "bg-purple-600/25 border-purple-500 shadow shadow-purple-950/40"
                            : "bg-[#05030f]/80 border-purple-500/10 text-slate-300 hover:border-purple-500/30"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className={`text-xs font-display font-black ${isActive ? "text-white" : "text-slate-100"}`}>
                            {cl.kategoriJurus} ({cl.gender === "Putera" ? "PUTRA" : "PUTRI"})
                          </p>
                          <p className="text-[10px] font-mono text-purple-300 font-bold">
                            {cl.usia}
                          </p>
                        </div>
                        <span className="bg-purple-950 text-purple-300 text-[10px] font-sans font-black px-2 py-1 rounded-md">
                          {cl.count} Atlit
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT SIDE: VISUAL BAGAN (8 COLS) */}
            <div className="lg:col-span-8 bg-[#0b071e]/90 border border-purple-500/20 rounded-xl p-5 shadow-[0_0_20px_rgba(168,85,247,0.05)] space-y-4">
              
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-purple-500/10 pb-3">
                <div>
                  <h3 className="text-xs font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 uppercase tracking-wider">
                    {activeClass ? activeClass.key : "KELAS PERTANDINGAN"}
                  </h3>
                  <p className="text-[10px] font-mono text-purple-400 font-bold uppercase mt-0.5">
                    BAGAN & PENEMPATAN SUDUT DINAMIS
                  </p>
                </div>

                {/* BATTLE / POOL TOGGLE */}
                <div className="flex gap-1.5 bg-[#05030f] p-1 rounded border border-purple-500/10 text-[9px] font-black uppercase tracking-wider">
                  <button
                    onClick={() => setIsBaganPool(false)}
                    className={`px-3 py-1.5 rounded cursor-pointer ${
                      !isBaganPool ? "bg-purple-600 text-white font-black" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    BATTLE
                  </button>
                  <button
                    onClick={() => setIsBaganPool(true)}
                    className={`px-3 py-1.5 rounded cursor-pointer ${
                      isBaganPool ? "bg-purple-600 text-white font-black" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    POOL
                  </button>
                </div>
              </div>

              {/* ACTION UTILITIES PANEL */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xxs font-black uppercase tracking-wider">
                <button
                  onClick={() => setBaganSystem("nasional")}
                  className={`py-2 px-1.5 border rounded cursor-pointer transition-all ${
                    baganSystem === "nasional"
                      ? "bg-purple-600/20 border-purple-500 text-white"
                      : "bg-[#05030f] border-purple-500/10 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  Dua Sisi (Nasional)
                </button>

                <button
                  onClick={() => setBaganSystem("klasik")}
                  className={`py-2 px-1.5 border rounded cursor-pointer transition-all ${
                    baganSystem === "klasik"
                      ? "bg-purple-600/20 border-purple-500 text-white"
                      : "bg-[#05030f] border-purple-500/10 text-slate-400 hover:bg-white/5"
                  }`}
                >
                  Satu sisi (klasik)
                </button>

                <button
                  onClick={handleShuffleUndian}
                  className="py-2 px-1.5 bg-[#0e0a29] hover:bg-[#15103d] border border-purple-500/25 text-purple-300 rounded cursor-pointer transition-all"
                >
                  🎲 Kocok undian
                </button>

                <button
                  onClick={handleKosongkanKelas}
                  className="py-2 px-1.5 bg-[#210910] hover:bg-[#300c17] border border-red-500/20 text-red-300 rounded cursor-pointer transition-all"
                >
                  🚫 Kosongkan kelas
                </button>
              </div>

              {/* AUTOMATED BRACKETING GENERATION */}
              <div className="bg-[#05030f]/80 p-4 border border-purple-500/10 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h4 className="text-xs font-display font-black text-white uppercase tracking-wide">
                    GENERATE BAGAN JADWAL OTOMATIS
                  </h4>
                  <p className="text-[10px] font-mono text-slate-400 font-bold uppercase mt-0.5">
                    Sistem akan menyusun draf partai berdasarkan eliminasi murni IPSI TGR.
                  </p>
                </div>
                <button
                  onClick={handleGenerateBracketSchedule}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-sans font-black text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-all uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                >
                  <Shuffle className="w-3.5 h-3.5 text-slate-950 fill-current" />
                  SEBUTKAN BAGAN JADWAL
                </button>
              </div>

              {/* VISUAL TREE BRACKET DRAWING */}
              <div className="bg-[#030209] rounded-xl border border-purple-500/15 p-6 min-h-[280px] flex items-center justify-center relative overflow-hidden">
                
                {activeClassAthletes.length === 0 ? (
                  <div className="text-center text-slate-500 italic text-xxs font-semibold">
                    Belum ada atlet terdaftar di kelas yang dipilih. Daftarkan atlet atau pilih kelas lain.
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col md:flex-row items-center justify-around gap-6 relative">
                    
                    {/* CONNECTOR SVGS */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none hidden md:block">
                      {/* Connection Line 1 to Final (Top) */}
                      <path d="M 180,60 H 260 V 100 H 330" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2,2" />
                      {/* Connection Line 2 to Final (Bottom) */}
                      <path d="M 180,180 H 260 V 120 H 330" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2,2" />
                    </svg>

                    {/* ROUND 1: SEMIFINAL (LEFT) */}
                    <div className="flex flex-col gap-6 w-full md:w-52 shrink-0 space-y-4">
                      
                      {/* SEMIFINAL HEADER TABS */}
                      <div className="bg-amber-500 border border-amber-400 text-slate-950 text-[10px] font-sans font-black uppercase text-center py-1.5 rounded tracking-widest font-black">
                        SEMIFINAL
                      </div>

                      {/* PARTAI 1 CARD */}
                      <div className="bg-[#09061c]/95 border border-purple-500/20 rounded-lg p-3 space-y-2 text-xxs text-left relative z-10">
                        <span className="bg-purple-950 text-purple-400 text-[8px] font-mono font-black px-1 py-0.2 rounded border border-purple-500/20 uppercase">
                          PARTAI 1
                        </span>

                        {/* BLUE ATHLETE */}
                        <div className="flex items-center justify-between border-l-2 border-blue-500 pl-1.5">
                          <div>
                            <p className="font-display font-black text-blue-400 uppercase">
                              {activeClassAthletes[0]?.nama || "TBD"}
                            </p>
                            <p className="text-[8px] text-slate-400">{activeClassAthletes[0]?.kontingen || "-"}</p>
                          </div>
                        </div>

                        {/* RED ATHLETE */}
                        <div className="flex items-center justify-between border-l-2 border-red-500 pl-1.5 pt-1 border-t border-purple-500/10">
                          <div>
                            <p className="font-display font-black text-red-400 uppercase">
                              {activeClassAthletes[2]?.nama || "TBD"}
                            </p>
                            <p className="text-[8px] text-slate-400">{activeClassAthletes[2]?.kontingen || "-"}</p>
                          </div>
                        </div>
                      </div>

                      {/* PARTAI 2 CARD */}
                      <div className="bg-[#09061c]/95 border border-purple-500/20 rounded-lg p-3 space-y-2 text-xxs text-left relative z-10">
                        <span className="bg-purple-950 text-purple-400 text-[8px] font-mono font-black px-1 py-0.2 rounded border border-purple-500/20 uppercase">
                          PARTAI 2
                        </span>

                        {/* BLUE ATHLETE */}
                        <div className="flex items-center justify-between border-l-2 border-blue-500 pl-1.5">
                          <div>
                            <p className="font-display font-black text-blue-400 uppercase">
                              {activeClassAthletes[1]?.nama || "TBD"}
                            </p>
                            <p className="text-[8px] text-slate-400">{activeClassAthletes[1]?.kontingen || "-"}</p>
                          </div>
                        </div>

                        {/* RED ATHLETE */}
                        <div className="flex items-center justify-between border-l-2 border-red-500 pl-1.5 pt-1 border-t border-purple-500/10">
                          <div>
                            <p className="font-display font-black text-red-400 uppercase">
                              {activeClassAthletes[3]?.nama || "TBD"}
                            </p>
                            <p className="text-[8px] text-slate-400">{activeClassAthletes[3]?.kontingen || "-"}</p>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* ROUND 2: FINAL (RIGHT) */}
                    <div className="flex flex-col gap-6 w-full md:w-52 shrink-0 space-y-4">
                      
                      {/* FINAL HEADER TAB */}
                      <div className="bg-amber-500 border border-amber-400 text-slate-950 text-[10px] font-sans font-black uppercase text-center py-1.5 rounded tracking-widest font-black">
                        FINAL
                      </div>

                      {/* PARTAI 3 CARD (FINAL) */}
                      <div className="bg-[#09061c]/95 border border-purple-500/20 rounded-lg p-3 space-y-2 text-xxs text-left relative z-10">
                        <span className="bg-purple-950 text-purple-400 text-[8px] font-mono font-black px-1 py-0.2 rounded border border-purple-500/20 uppercase">
                          PARTAI 3
                        </span>

                        {/* BLUE WINNER PLACEHOLDER */}
                        <div className="flex items-center justify-between border-l-2 border-blue-500 pl-1.5">
                          <div>
                            <p className="font-display font-black text-blue-300/80 uppercase">
                              {activeClassAthletes.length > 2 ? "PEMENANG PTY 2" : (activeClassAthletes[0]?.nama || "TBD")}
                            </p>
                            <p className="text-[8px] text-slate-400">-</p>
                          </div>
                        </div>

                        {/* RED WINNER PLACEHOLDER */}
                        <div className="flex items-center justify-between border-l-2 border-red-500 pl-1.5 pt-1 border-t border-purple-500/10">
                          <div>
                            <p className="font-display font-black text-red-300/80 uppercase">
                              {activeClassAthletes.length > 2 ? "PEMENANG PTY 1" : (activeClassAthletes[1]?.nama || "TBD")}
                            </p>
                            <p className="text-[8px] text-slate-400">-</p>
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>
                )}

              </div>

              {/* FOOTER METRIC */}
              <div className="text-[9px] font-mono text-slate-500 text-right uppercase tracking-wider flex justify-between items-center bg-[#05030f] p-2 rounded border border-purple-500/5">
                <span>SISTEM SEEDING: STANDARD IPSI PENCAK SILAT</span>
                <span>AUTO-SEEDING POWER-OF-TWO (32 &amp; 16 SLOTS)</span>
              </div>

            </div>

          </div>
        )}

        {/* ==========================================
            TAB 3: KONTROL PARTAI
            ========================================== */}
        {activeTab === "kontrol" && (
          <div className="bg-[#0b071e]/90 border border-purple-500/20 rounded-xl p-5 shadow-[0_0_20px_rgba(168,85,247,0.05)] space-y-5">
            
            {/* SUBHEADER CONTROLS PANEL */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-purple-500/15 pb-4">
              
              <div className="space-y-0.5">
                <h3 className="text-xs font-display font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Grid className="w-4 h-4 text-pink-400" />
                  PENJADWALAN ROSTER &amp; KONTROL PARTAI
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">
                  ATUR PARAMETER DAN TAMPILKAN JADWAL PARTAI PERTANDINGAN
                </p>
              </div>

              {/* DRAFT ACTIONS ROW */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded transition-all cursor-pointer"
                >
                  BATTLE VIEW
                </button>
                <button
                  type="button"
                  className="bg-slate-900 border border-purple-500/20 hover:bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded transition-all cursor-pointer"
                >
                  POOL VIEW
                </button>

                <button
                  type="button"
                  onClick={handleShuffleDraft}
                  className="bg-purple-950/40 border border-purple-500/30 hover:bg-purple-900/40 text-purple-300 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Shuffle className="w-3 h-3 text-pink-400" />
                  SHUFFLE BATTLE
                </button>

                <button
                  type="button"
                  onClick={handlePrintPDFDraft}
                  className="bg-purple-950/40 border border-purple-500/30 hover:bg-purple-900/40 text-purple-300 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-purple-400" />
                  UNDUH DOKUMEN PDF BATTLE
                </button>

                <button
                  type="button"
                  onClick={handleCancelAllDraft}
                  className="bg-rose-950/30 border border-rose-500/25 hover:bg-rose-900/30 text-rose-300 text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded transition-all flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3 text-rose-400" />
                  BATALKAN SEMUA
                </button>

                <span className="bg-purple-950 text-purple-300 text-[10px] font-mono font-bold px-2 py-1.5 rounded-md border border-purple-500/20 ml-2 uppercase">
                  Jadwal Aktif: {draftMatches.filter(m => selectedMatchIds[m.id]).length} Partai
                </span>
              </div>

            </div>

            {/* TERAPKAN JADWAL ACTION HEADER */}
            <div className="flex justify-start">
              <button
                type="button"
                onClick={handleTerapkanJadwal}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-5 py-3 rounded-lg shadow-md uppercase tracking-widest flex items-center gap-2 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4 text-slate-950" />
                TERAPKAN JADWAL TERPILIH
              </button>
            </div>

            {/* SCHEDULING TABLE */}
            <div className="overflow-x-auto border border-purple-500/10 rounded-xl bg-[#05030f]/60 shadow-inner">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-purple-500/20 text-[10px] font-black text-purple-300 uppercase bg-purple-950/20 font-mono">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={draftMatches.length > 0 && draftMatches.every(m => selectedMatchIds[m.id])}
                        onChange={(e) => handleToggleSelectAll(e.target.checked)}
                        className="w-4 h-4 accent-purple-600 cursor-pointer"
                      />
                    </th>
                    <th className="p-4 w-20">ALL</th>
                    <th className="p-4">PARTAI</th>
                    <th className="p-4">KATEGORI / KELAS</th>
                    <th className="p-4 text-center">SUDUT BIRU (BLUE)</th>
                    <th className="p-4 text-center w-12 text-slate-500">VS</th>
                    <th className="p-4 text-center">SUDUT MERAH (RED)</th>
                    <th className="p-4 text-center">TAHAPAN PERTANDINGAN</th>
                    <th className="p-4 text-center">SKOR</th>
                    <th className="p-4 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/5 text-xs font-semibold">
                  {draftMatches.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-16 text-center text-xxs font-semibold text-slate-500 italic">
                        Belum ada partai draf terdaftar. Silakan buat bagan otomatis di Tab 2 terlebih dahulu.
                      </td>
                    </tr>
                  ) : (
                    draftMatches.map((m, index) => {
                      const isSelected = !!selectedMatchIds[m.id];
                      return (
                        <tr 
                          key={m.id}
                          className={`hover:bg-purple-950/10 transition-all ${isSelected ? "bg-purple-950/5" : "opacity-60"}`}
                        >
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleSelectMatch(m.id, e.target.checked)}
                              className="w-4 h-4 accent-purple-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-4">
                            <span className="text-slate-500 font-mono text-[10px]">
                              {isSelected ? "✔️ SELECTED" : "DRAFT"}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-black text-purple-400">
                            PTY {m.noPartai || (index + 1)}
                          </td>
                          <td className="p-4 uppercase">
                            <div className="space-y-0.5">
                              <p className="font-display font-black text-white">{m.kategori}</p>
                              <p className="text-[9px] font-mono text-slate-400 font-bold">
                                {m.usia} • {m.gender === "Putera" ? "PUTRA" : "PUTRI"}
                              </p>
                            </div>
                          </td>
                          
                          {/* BLUE CORNER */}
                          <td className="p-4 text-center">
                            {m.sudutBiru.athlete ? (
                              <div className="space-y-0.5 inline-block text-center">
                                <p className="font-display font-black text-blue-400 uppercase">
                                  {m.sudutBiru.athlete.nama}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">
                                  {m.sudutBiru.athlete.kontingen}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-600 font-mono text-[10px] uppercase">TBD</span>
                            )}
                          </td>

                          <td className="p-4 text-center">
                            <span className="bg-slate-900 border border-purple-500/10 text-slate-400 font-black text-[9px] font-mono px-1.5 py-0.5 rounded-full select-none">
                              VS
                            </span>
                          </td>

                          {/* RED CORNER */}
                          <td className="p-4 text-center">
                            {m.sudutMerah.athlete ? (
                              <div className="space-y-0.5 inline-block text-center">
                                <p className="font-display font-black text-red-400 uppercase">
                                  {m.sudutMerah.athlete.nama}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">
                                  {m.sudutMerah.athlete.kontingen}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-600 font-mono text-[10px] uppercase">TBD</span>
                            )}
                          </td>

                          {/* STAGE TAHAP */}
                          <td className="p-4 text-center">
                            <span className="bg-purple-950 border border-purple-500/20 text-purple-300 font-black text-[10px] px-2.5 py-1 rounded font-display uppercase tracking-wider">
                              {m.tahap || "FINAL"}
                            </span>
                          </td>

                          <td className="p-4 text-center font-mono font-black text-yellow-500">
                            -
                          </td>

                          {/* STATUS */}
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase ${
                              m.status === "Playing"
                                ? "bg-green-950/40 text-green-400 border-green-500/30"
                                : "bg-slate-900 text-slate-400 border-white/5"
                            }`}>
                              {m.status === "Playing" ? "SEDANG BERJALAN" : "BELUM MULAI"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* FOOTNOTE GUIDELINE DETAILS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-[10px] font-mono text-slate-500 uppercase tracking-wide border-t border-purple-500/10 pt-4">
              <span>CENTANG GANJIL/GENAP SECARA OTOMATIS MELAKUKAN PAIRING MERAH VS BIRU</span>
              <span>PARTAI TERURUT 1, 2, ... MENYESUAIKAN JUMLAH TERPILIH</span>
            </div>

          </div>
        )}

      </div>
      
    </div>
  );
}
