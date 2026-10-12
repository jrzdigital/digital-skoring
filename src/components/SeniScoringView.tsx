import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, Play, Pause, RotateCcw, Award, Users, Shield, 
  Tv, UserCheck, Trash2, Clock, Check, Info, CheckSquare, Square, 
  Lightbulb, AlertTriangle, Plus, Minus, Maximize, Minimize, Lock, Unlock,
  Settings, User, Pencil, Shuffle, Trophy, Flame, Layers, Medal, ListOrdered,
  ChevronRight, RefreshCw, Printer, Download, Eye, Search, FileSpreadsheet,
  Upload, X, MapPin, Sparkles, UserPlus, Swords, Crown, Zap, CheckCircle2
} from "lucide-react";
import { playSoundByKey } from "../utils/audio";
import {
  TournamentSystemType,
  TournamentAthlete,
  KnockoutMatch,
  PoolGroup,
  PemasalanBracket,
  generateSingleEliminationBrackets,
  generatePoolGroups,
  generatePemasalanBrackets,
  updatePemasalanOutcome
} from "../utils/tournamentSystem";
import SpectatorMonitorView from "./SpectatorMonitorView";

interface Athlete {
  id: string;
  name: string;
  contingent: string;
  kelas: string;
  usia: string;
  gender: "PUTRA" | "PUTRI";
  gelanggang?: string;
  sistemTanding?: TournamentSystemType | "BATTLE";
  tahap?: string;
}

const initialDefaultAthletes: Athlete[] = [
  { id: "1", name: "ADI WIJAYA", contingent: "JAWA TENGAH", kelas: "TUNGGAL", usia: "REMAJA", gender: "PUTRA", gelanggang: "GELANGGANG 1", sistemTanding: "GUGUR", tahap: "SEMIFINAL" },
  { id: "2", name: "HERI KUSUMA", contingent: "BALI", kelas: "TUNGGAL", usia: "REMAJA", gender: "PUTRA", gelanggang: "GELANGGANG 1", sistemTanding: "GUGUR", tahap: "SEMIFINAL" },
  { id: "3", name: "FARHAN RAZAK", contingent: "JAWA BARAT", kelas: "TUNGGAL", usia: "REMAJA", gender: "PUTRA", gelanggang: "GELANGGANG 1", sistemTanding: "GUGUR", tahap: "SEMIFINAL" },
  { id: "4", name: "RIZKY PUTRA", contingent: "JAWA TIMUR", kelas: "TUNGGAL", usia: "REMAJA", gender: "PUTRA", gelanggang: "GELANGGANG 1", sistemTanding: "GUGUR", tahap: "SEMIFINAL" },
  { id: "5", name: "NURUL INDAH", contingent: "SULAWESI SELATAN", kelas: "TUNGGAL", usia: "REMAJA", gender: "PUTRI", gelanggang: "GELANGGANG 1", sistemTanding: "PEMASALAN", tahap: "SEMIFINAL 1" },
  { id: "6", name: "SITI AMINAH", contingent: "BANTEN", kelas: "TUNGGAL", usia: "REMAJA", gender: "PUTRI", gelanggang: "GELANGGANG 1", sistemTanding: "PEMASALAN", tahap: "SEMIFINAL 1" },
  { id: "7", name: "AKBAR MAULANA", contingent: "DI YOGYAKARTA", kelas: "GANDA", usia: "REMAJA", gender: "PUTRA", gelanggang: "GELANGGANG 1", sistemTanding: "POOL", tahap: "PENYISIHAN" },
  { id: "8", name: "DEWANTO SURYA", contingent: "DKI JAKARTA", kelas: "GANDA", usia: "REMAJA", gender: "PUTRA", gelanggang: "GELANGGANG 1", sistemTanding: "POOL", tahap: "PENYISIHAN" },
];

interface JuriScore {
  id: number;
  kebenaran: number; // 9.90 standard, -0.01 per mistake for Tunggal/Regu or 5.00-6.00 range
  kemantapan: number; // 5.00 to 6.00 or flow score 0.01 to 0.10
  keserasian?: number; // for Ganda (5.00 to 6.00)
  penjiwaan?: number; // for Solo Kreatif (5.00 to 6.00)
  submitted: boolean;
  wrongMoves?: number;
  flowScore?: number;
}

export default function SeniScoringView({ onBack, isFullscreen }: { onBack?: () => void; isFullscreen?: boolean }) {
  // Available categories
  const categories = [
    { id: "tunggal", name: "TUNGGAL", description: "Peragaan jurus tunggal baku IPSI (3 Menit)" },
    { id: "ganda", name: "GANDA", description: "Peragaan teknik serang bela pasang ganda kreatif (3 Menit)" },
    { id: "regu", name: "REGU", description: "Peragaan jurus regu baku IPSI (3 Menit)" },
    { id: "solo_kreatif", name: "SOLO KREATIF", description: "Koreografi senjata tunggal kreatif musik (3 Menit)" }
  ];

  const ageGroups = ["PRA USIA DINI", "USIA DINI", "PRA REMAJA", "REMAJA", "DEWASA", "MASTER"];

  // 1. Role State specifically for Multi-Screen layout
  // We use standard local state so each tab can choose its own role!
  const [role, setRole] = useState<"sekretaris" | "dewan" | "juri" | "monitor" | null>(null);

  // Which Juri ID is controlled on this specific tab if role is "juri"
  const [localJuriId, setLocalJuriId] = useState<number>(1);

  // List of athletes loaded from Pendaftaran
  const [poolAthletes, setPoolAthletes] = useState<Athlete[]>([]);
  const [showAthleteLoader, setShowAthleteLoader] = useState(false);

  // 2. Core Match States (Synchronized via localStorage)
  const [selectedCategory, setSelectedCategory] = useState("tunggal");
  const [selectedAge, setSelectedAge] = useState("PRA USIA DINI");
  const [gender, setGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [performerName, setPerformerName] = useState("BENNY G. SUMARSONO");
  const [contingent, setContingent] = useState("BALI");
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeActual, setTimeActual] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isMatchUnlocked, setIsMatchUnlocked] = useState(false);
  const [isTimer1Running, setIsTimer1Running] = useState(false);
  const [isTimer2Running, setIsTimer2Running] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<number>(0);
  const [timer1StartedAt, setTimer1StartedAt] = useState<number>(0);
  const [timer1BaseRemaining, setTimer1BaseRemaining] = useState<number>(0);
  const [timer2StartedAt, setTimer2StartedAt] = useState<number>(0);
  const [timer2BaseActual, setTimer2BaseActual] = useState<number>(0);
  const [timerBaseRemaining, setTimerBaseRemaining] = useState<number>(0);
  const [timerBaseActual, setTimerBaseActual] = useState<number>(0);
  const [deductions, setDeductions] = useState({
    timeOverUnder: 0, 
    weaponDrop: 0, 
    costumeMistake: false, 
    outOfBounds: 0, 
    otherPenalty: 0 
  });
  const [judgesCount, setJudgesCount] = useState<number>(10);
  const [juriScores, setJuriScores] = useState<JuriScore[]>([
    { id: 1, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 2, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 3, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 4, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 5, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 6, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 7, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 8, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 9, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 10, kebenaran: 9.90, kemantapan: 5.50, submitted: true }
  ]);
  const [logs, setLogs] = useState<{ time: string; msg: string; type: "system" | "deduction" | "score" }[]>([
    { time: "00:00", msg: "Sistem skoring seni diaktifkan.", type: "system" }
  ]);

  // 3. New Tournament & Secretary States (Synchronized via localStorage)
  const [namaEvent, setNamaEvent] = useState("KEJUARAAN NASIONAL PENCAK SILAT IPSI REKOR INDONESIA");
  const [tempatPelaksanaan, setTempatPelaksanaan] = useState("Padepokan Pencak Silat TMII, Jakarta East");
  const [waktuPelaksanaan, setWaktuPelaksanaan] = useState("20-25 Juni 2026");
  const [partaiTanding, setPartaiTanding] = useState("2");
  const [tahapPertandingan, setTahapPertandingan] = useState("FINAL");
  const [durasiTampil, setDurasiTampil] = useState("03:00");
  const [namaAtlitBiru, setNamaAtlitBiru] = useState("BENNY G. SUMARSONO");
  const [kontingenBiru, setKontingenBiru] = useState("BALI");
  const [namaAtlitMerah, setNamaAtlitMerah] = useState("SUHARTONO");
  const [kontingenMerah, setKontingenMerah] = useState("JAWA BARAT");
  const [activeCorner, setActiveCorner] = useState<"biru" | "merah" | null | "">("");
  const [logoKiri, setLogoKiri] = useState<string>(() => localStorage.getItem("logo_kiri") || "");
  const [logoKanan, setLogoKanan] = useState<string>(() => localStorage.getItem("logo_kanan") || "");

  const [disqualifiedBiru, setDisqualifiedBiru] = useState(false);
  const [undurDiriBiru, setUndurDiriBiru] = useState(false);
  const [disqualifiedMerah, setDisqualifiedMerah] = useState(false);
  const [undurDiriMerah, setUndurDiriMerah] = useState(false);
  const [showDiskUDModal, setShowDiskUDModal] = useState(false);

  const [isFs, setIsFs] = useState(false);
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFs(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFs(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFs(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
    };
  }, []);

  const [juriScoresBiru, setJuriScoresBiru] = useState<JuriScore[]>([
    { id: 1, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 2, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 3, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 4, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 5, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 6, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 7, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 8, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 9, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 10, kebenaran: 9.90, kemantapan: 5.50, submitted: true }
  ]);
  const [juriScoresMerah, setJuriScoresMerah] = useState<JuriScore[]>([
    { id: 1, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 2, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 3, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 4, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 5, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 6, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 7, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 8, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 9, kebenaran: 9.90, kemantapan: 5.50, submitted: true },
    { id: 10, kebenaran: 9.90, kemantapan: 5.50, submitted: true }
  ]);
  const [deductionsBiru, setDeductionsBiru] = useState({
    timeOverUnder: 0, weaponDrop: 0, costumeMistake: false, outOfBounds: 0, otherPenalty: 0
  });
  const [deductionsMerah, setDeductionsMerah] = useState({
    timeOverUnder: 0, weaponDrop: 0, costumeMistake: false, outOfBounds: 0, otherPenalty: 0
  });
  const [timeRemainingBiru, setTimeRemainingBiru] = useState(0);
  const [timeRemainingMerah, setTimeRemainingMerah] = useState(0);
  const [timeActualBiru, setTimeActualBiru] = useState(0);
  const [timeActualMerah, setTimeActualMerah] = useState(0);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);

  // Pre-configured match list for easy simulation (Kontrol Partai Roster)
  const [kontrolViewMode, setKontrolViewMode] = useState<"BATTLE" | "POOL">("BATTLE");
  const [partaiList, setPartaiList] = useState<any[]>([
    {
      id: "1",
      checked: true,
      partai: "DRAFT",
      kategoriMain: "TUNGGAL",
      kategoriSub: "REMAJA • PUTRA",
      kategori: "tunggal",
      usia: "REMAJA",
      gender: "PUTRA",
      tahap: "SEMIFINAL",
      skor: "-",
      status: "BELUM MULAI",
      biru: { name: "ADI WIJAYA", contingent: "JAWA TENGAH" },
      merah: { name: "HERI KUSUMA", contingent: "BALI" }
    },
    {
      id: "2",
      checked: true,
      partai: "DRAFT",
      kategoriMain: "TUNGGAL",
      kategoriSub: "REMAJA • PUTRA",
      kategori: "tunggal",
      usia: "REMAJA",
      gender: "PUTRA",
      tahap: "SEMIFINAL",
      skor: "-",
      status: "BELUM MULAI",
      biru: { name: "RIZKY PUTRA", contingent: "JAWA TIMUR" },
      merah: { name: "FARHAN RAZAK", contingent: "JAWA BARAT" }
    },
    {
      id: "3",
      checked: false,
      partai: "DRAFT",
      kategoriMain: "TUNGGAL",
      kategoriSub: "REMAJA • PUTRA",
      kategori: "tunggal",
      usia: "REMAJA",
      gender: "PUTRA",
      tahap: "FINAL",
      skor: "-",
      status: "BELUM MULAI",
      biru: { name: "MENUNGGU PEMENANG PARTAI 1", contingent: "PEMENANG" },
      merah: { name: "MENUNGGU PEMENANG PARTAI 2", contingent: "PEMENANG" }
    },
    {
      id: "4",
      checked: true,
      partai: "DRAFT",
      kategoriMain: "TUNGGAL",
      kategoriSub: "REMAJA • PUTRI",
      kategori: "tunggal",
      usia: "REMAJA",
      gender: "PUTRI",
      tahap: "FINAL",
      skor: "-",
      status: "BELUM MULAI",
      biru: { name: "NURUL INDAH", contingent: "SULAWESI SELATAN" },
      merah: { name: "SITI AMINAH", contingent: "BANTEN" }
    },
    {
      id: "5",
      checked: true,
      partai: "DRAFT",
      kategoriMain: "GANDA",
      kategoriSub: "DEWASA • PUTRA",
      kategori: "ganda",
      usia: "DEWASA",
      gender: "PUTRA",
      tahap: "FINAL",
      skor: "-",
      status: "BELUM MULAI",
      biru: { name: "DEWANTO SURYA", contingent: "DKI JAKARTA" },
      merah: { name: "AKBAR MAULANA", contingent: "DI YOGYAKARTA" }
    }
  ]);

  // UI state variables for overlays and printable screens
  const [showRegistrasiOverlay, setShowRegistrasiOverlay] = useState(false);
  const [registrasiActiveTab, setRegistrasiActiveTab] = useState<"input" | "bagan" | "partai">("input");
  const [showPrintScoresheet, setShowPrintScoresheet] = useState(false);
  const [showDeductionsModal, setShowDeductionsModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Form & Roster states for Input Data Atlit
  const [formName, setFormName] = useState("");
  const [formContingent, setFormContingent] = useState("");
  const [formGelanggang, setFormGelanggang] = useState("GELANGGANG 1");
  const [formSistemTanding, setFormSistemTanding] = useState<TournamentSystemType>("GUGUR");
  const [formCategory, setFormCategory] = useState("TUNGGAL");
  const [formAge, setFormAge] = useState("REMAJA");
  const [formGender, setFormGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [formTahap, setFormTahap] = useState("PENYISIHAN");
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);

  // Tournament System & Bagan states
  const [selectedTournamentSystem, setSelectedTournamentSystem] = useState<TournamentSystemType>("GUGUR");
  const [selectedBaganCategoryKey, setSelectedBaganCategoryKey] = useState("tunggal_remaja_putra");
  const [poolCountSetting, setPoolCountSetting] = useState<number>(2);
  const [poolModeSetting, setPoolModeSetting] = useState<"RANKING" | "KNOCKOUT_INTERNAL">("RANKING");
  const [activePoolSubTab, setActivePoolSubTab] = useState<string>("ALL");
  const [activePemasalanIndex, setActivePemasalanIndex] = useState<number>(0);

  // Dynamic tournament bracket data structures
  const [singleEliminationMatches, setSingleEliminationMatches] = useState<KnockoutMatch[]>([]);
  const [poolGroupsData, setPoolGroupsData] = useState<PoolGroup[]>([]);
  const [poolPlayoffMatches, setPoolPlayoffMatches] = useState<KnockoutMatch[]>([]);
  const [pemasalanBracketsData, setPemasalanBracketsData] = useState<PemasalanBracket[]>([]);

  const [rosterSearch, setRosterSearch] = useState("");
  const [showAllRoster, setShowAllRoster] = useState(true);
  const [rosterCategoryFilter, setRosterCategoryFilter] = useState<string>("ALL");
  const [rosterGenderFilter, setRosterGenderFilter] = useState<string>("ALL");
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  // Load athletes from local storage on mount
  useEffect(() => {
    const savedAthletes = localStorage.getItem("registered_athletes");
    if (savedAthletes) {
      try {
        const parsed = JSON.parse(savedAthletes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPoolAthletes(parsed);
        } else {
          setPoolAthletes(initialDefaultAthletes);
          localStorage.setItem("registered_athletes", JSON.stringify(initialDefaultAthletes));
        }
      } catch (e) {
        setPoolAthletes(initialDefaultAthletes);
      }
    } else {
      setPoolAthletes(initialDefaultAthletes);
      localStorage.setItem("registered_athletes", JSON.stringify(initialDefaultAthletes));
    }
    const savedHistory = localStorage.getItem("silat_seni_match_history");
    if (savedHistory) {
      try {
        setMatchHistory(JSON.parse(savedHistory));
      } catch (e) {}
    }
  }, []);

  // Handlers for Registration & Excel / PDF
  const handleSaveAthlete = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formName.trim() || !formContingent.trim()) {
      alert("Mohon isi Nama Lengkap Atlit dan Asal Kontingen!");
      return;
    }

    if (editingAthleteId) {
      const updated = poolAthletes.map(a => a.id === editingAthleteId ? {
        ...a,
        name: formName.toUpperCase().trim(),
        contingent: formContingent.toUpperCase().trim(),
        gelanggang: formGelanggang,
        sistemTanding: formSistemTanding,
        kelas: formCategory.toUpperCase(),
        usia: formAge,
        gender: formGender,
        tahap: formTahap
      } : a);
      setPoolAthletes(updated);
      localStorage.setItem("registered_athletes", JSON.stringify(updated));
      setEditingAthleteId(null);
      playSoundByKey("success_chime");
      alert(`Data atlit ${formName.toUpperCase()} berhasil diperbarui!`);
    } else {
      const newAth: Athlete = {
        id: Date.now().toString(),
        name: formName.toUpperCase().trim(),
        contingent: formContingent.toUpperCase().trim(),
        gelanggang: formGelanggang,
        sistemTanding: formSistemTanding,
        kelas: formCategory.toUpperCase(),
        usia: formAge,
        gender: formGender,
        tahap: formTahap
      };
      const updated = [newAth, ...poolAthletes];
      setPoolAthletes(updated);
      localStorage.setItem("registered_athletes", JSON.stringify(updated));
      playSoundByKey("success_chime");
      alert(`Berhasil mendaftarkan atlit ${newAth.name}!`);
    }

    setFormName("");
    setFormContingent("");
  };

  const handleClearForm = () => {
    playSoundByKey("short_beep");
    setFormName("");
    setFormContingent("");
    setEditingAthleteId(null);
  };

  const handleResetAllData = () => {
    playSoundByKey("short_beep");
    if (confirm("Apakah Anda yakin ingin menghapus SELURUH data registrasi atlit?")) {
      setPoolAthletes([]);
      localStorage.removeItem("registered_athletes");
      alert("Seluruh data atlit telah dihapus.");
    }
  };

  const handleEditAthlete = (ath: Athlete) => {
    playSoundByKey("short_beep");
    setEditingAthleteId(ath.id);
    setFormName(ath.name);
    setFormContingent(ath.contingent);
    if (ath.gelanggang) setFormGelanggang(ath.gelanggang);
    if (ath.sistemTanding && ath.sistemTanding !== "BATTLE") setFormSistemTanding(ath.sistemTanding);
    if (ath.kelas) setFormCategory(ath.kelas.toUpperCase());
    if (ath.usia) setFormAge(ath.usia);
    if (ath.gender) setFormGender(ath.gender);
    if (ath.tahap) setFormTahap(ath.tahap);
  };

  const handleDeleteAthlete = (id: string) => {
    playSoundByKey("short_beep");
    const target = poolAthletes.find(a => a.id === id);
    if (confirm(`Hapus atlit ${target?.name || "ini"} dari daftar?`)) {
      const filtered = poolAthletes.filter(a => a.id !== id);
      setPoolAthletes(filtered);
      localStorage.setItem("registered_athletes", JSON.stringify(filtered));
    }
  };

  const downloadExcelTemplate = () => {
    playSoundByKey("short_beep");
    const csvHeader = "Nama Atlit,Kontingen,Gelanggang,Sistem Tanding,Kategori Jurus,Kategori Usia,Gender,Tahap\n";
    const sampleRows = "KADEK WAHYU DEWANTARA,BALI - INDONESIA,GELANGGANG 1,BATTLE,TUNGGAL,REMAJA,PUTRA,PENYISIHAN\nADI WIJAYA,JAWA TENGAH,GELANGGANG 1,BATTLE,TUNGGAL,REMAJA,PUTRA,PENYISIHAN\n";
    const blob = new Blob([csvHeader + sampleRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Template_Import_Atlit_Seni.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcelData = () => {
    playSoundByKey("short_beep");
    let csvContent = "Nama Atlit,Kontingen,Gelanggang,Sistem Tanding,Kategori Jurus,Kategori Usia,Gender,Tahap\n";
    poolAthletes.forEach(a => {
      csvContent += `"${a.name}","${a.contingent}","${a.gelanggang || "GELANGGANG 1"}","${a.sistemTanding || "BATTLE"}","${a.kelas}","${a.usia}","${a.gender}","${a.tahap || "PENYISIHAN"}"\n`;
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Export_Data_Atlit_Seni_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importExcelData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) return;
      const newAthletes: Athlete[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").trim());
        if (cols.length >= 2 && cols[0]) {
          newAthletes.push({
            id: `${Date.now()}_${i}`,
            name: cols[0].toUpperCase(),
            contingent: (cols[1] || "KONTINGEN").toUpperCase(),
            gelanggang: cols[2] || "GELANGGANG 1",
            sistemTanding: (cols[3] as "BATTLE" | "POOL") || "BATTLE",
            kelas: (cols[4] || "TUNGGAL").toUpperCase(),
            usia: cols[5] || "REMAJA",
            gender: (cols[6] as "PUTRA" | "PUTRI") || "PUTRA",
            tahap: cols[7] || "PENYISIHAN"
          });
        }
      }
      if (newAthletes.length > 0) {
        const merged = [...newAthletes, ...poolAthletes];
        setPoolAthletes(merged);
        localStorage.setItem("registered_athletes", JSON.stringify(merged));
        playSoundByKey("success_chime");
        alert(`Berhasil mengimpor ${newAthletes.length} data atlit!`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const downloadPDF = () => {
    playSoundByKey("short_beep");
    window.print();
  };

  const filteredAthletes = poolAthletes.filter(ath => {
    const matchesSearch = rosterSearch.trim() === "" || 
      ath.name.toLowerCase().includes(rosterSearch.toLowerCase()) || 
      ath.contingent.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      (ath.gelanggang || "").toLowerCase().includes(rosterSearch.toLowerCase());

    const matchesCategoryFilter = rosterCategoryFilter === "ALL" || (ath.kelas || "").toUpperCase() === rosterCategoryFilter.toUpperCase();
    const matchesGenderFilter = rosterGenderFilter === "ALL" || (ath.gender || "PUTRA").toUpperCase() === rosterGenderFilter.toUpperCase();

    if (!showAllRoster) {
      const matchesCategory = (ath.kelas || "").toUpperCase() === formCategory.toUpperCase();
      return matchesSearch && matchesCategory && matchesCategoryFilter && matchesGenderFilter;
    }
    return matchesSearch && matchesCategoryFilter && matchesGenderFilter;
  });

  const countTunggal = poolAthletes.filter(a => (a.kelas || "").toUpperCase() === "TUNGGAL").length;
  const countGanda = poolAthletes.filter(a => (a.kelas || "").toUpperCase() === "GANDA").length;
  const countRegu = poolAthletes.filter(a => (a.kelas || "").toUpperCase() === "REGU").length;
  const countSolo = poolAthletes.filter(a => (a.kelas || "").toUpperCase() === "SOLO KREATIF").length;
  const countPutra = poolAthletes.filter(a => (a.gender || "PUTRA").toUpperCase() === "PUTRA").length;
  const countPutri = poolAthletes.filter(a => (a.gender || "").toUpperCase() === "PUTRI").length;

  // Bagan Categories List
  const baganCategoriesList = [
    { id: "tunggal_remaja_putra", name: "TUNGGAL (Putra)", kelas: "TUNGGAL", age: "REMAJA", gender: "PUTRA" as const },
    { id: "tunggal_remaja_putri", name: "TUNGGAL (Putri)", kelas: "TUNGGAL", age: "REMAJA", gender: "PUTRI" as const },
    { id: "tunggal_dewasa_putra", name: "TUNGGAL (Putra)", kelas: "TUNGGAL", age: "DEWASA", gender: "PUTRA" as const },
    { id: "tunggal_dewasa_putri", name: "TUNGGAL (Putri)", kelas: "TUNGGAL", age: "DEWASA", gender: "PUTRI" as const },
    { id: "ganda_remaja_putra", name: "GANDA (Putra)", kelas: "GANDA", age: "REMAJA", gender: "PUTRA" as const },
    { id: "ganda_dewasa_putra", name: "GANDA (Putra)", kelas: "GANDA", age: "DEWASA", gender: "PUTRA" as const },
    { id: "regu_remaja_putra", name: "REGU (Putra)", kelas: "REGU", age: "REMAJA", gender: "PUTRA" as const },
    { id: "solo_dewasa_putra", name: "SOLO KREATIF (Putra)", kelas: "SOLO KREATIF", age: "DEWASA", gender: "PUTRA" as const },
  ];

  // Helper to extract athletes for the active category
  const getAthletesForCurrentBagan = (): TournamentAthlete[] => {
    const currentCat = baganCategoriesList.find(c => c.id === selectedBaganCategoryKey) || baganCategoriesList[0];
    const matched = poolAthletes.filter(a => 
      (a.kelas || "").toUpperCase() === currentCat.kelas && 
      (a.usia || "").toUpperCase() === currentCat.age &&
      (a.gender || "PUTRA").toUpperCase() === currentCat.gender
    );

    if (matched.length >= 2) {
      return matched.map(a => ({
        id: a.id,
        name: a.name,
        contingent: a.contingent,
        gender: a.gender,
        usia: a.usia,
        kelas: a.kelas
      }));
    }

    // Default sample athletes if not yet populated
    return [
      { id: "demo-1", name: "ADI WIJAYA", contingent: "JAWA TENGAH", gender: currentCat.gender, usia: currentCat.age, kelas: currentCat.kelas },
      { id: "demo-2", name: "HERI KUSUMA", contingent: "BALI", gender: currentCat.gender, usia: currentCat.age, kelas: currentCat.kelas },
      { id: "demo-3", name: "FARHAN RAZAK", contingent: "JAWA BARAT", gender: currentCat.gender, usia: currentCat.age, kelas: currentCat.kelas },
      { id: "demo-4", name: "RIZKY PUTRA", contingent: "JAWA TIMUR", gender: currentCat.gender, usia: currentCat.age, kelas: currentCat.kelas },
    ];
  };

  // Refresh and initialize bracket data
  const refreshTournamentData = (shuffle: boolean = false) => {
    let athletes = getAthletesForCurrentBagan();
    if (shuffle) {
      athletes = [...athletes].sort(() => Math.random() - 0.5);
    }
    const currentCat = baganCategoriesList.find(c => c.id === selectedBaganCategoryKey) || baganCategoriesList[0];
    const catTitle = `${currentCat.kelas} ${currentCat.age} ${currentCat.gender}`;

    // 1. Single Elimination
    const gugur = generateSingleEliminationBrackets(athletes, catTitle);
    setSingleEliminationMatches(gugur);

    // 2. Pool Groups
    const poolRes = generatePoolGroups(athletes, catTitle, poolCountSetting, poolModeSetting);
    setPoolGroupsData(poolRes.pools);
    setPoolPlayoffMatches(poolRes.playoffMatches);

    // 3. Pemasalan
    const pemasalan = generatePemasalanBrackets(athletes, catTitle);
    setPemasalanBracketsData(pemasalan);
  };

  useEffect(() => {
    refreshTournamentData();
  }, [selectedBaganCategoryKey, poolCountSetting, poolModeSetting, poolAthletes.length]);

  // Load a match from the bracket directly into live scoring
  const handleLoadMatchToScoring = (
    matchTitle: string,
    biruName: string,
    biruContingent: string,
    merahName: string,
    merahContingent: string,
    tahapName: string,
    categoryName: string = "tunggal",
    ageName: string = "REMAJA",
    genderName: "PUTRA" | "PUTRI" = "PUTRA"
  ) => {
    playSoundByKey("success_chime");
    setPartaiTanding(matchTitle);
    setNamaAtlitBiru(biruName || "SUDUT BIRU");
    setKontingenBiru(biruContingent || "KONTINGEN BIRU");
    setNamaAtlitMerah(merahName || "SUDUT MERAH");
    setKontingenMerah(merahContingent || "KONTINGEN MERAH");
    setSelectedCategory(categoryName.toLowerCase());
    setSelectedAge(ageName);
    setGender(genderName);
    setTahapPertandingan(tahapName);

    saveSharedState({
      partaiTanding: matchTitle,
      selectedCategory: categoryName.toLowerCase(),
      selectedAge: ageName,
      gender: genderName,
      tahapPertandingan: tahapName,
      namaAtlitBiru: biruName || "SUDUT BIRU",
      kontingenBiru: biruContingent || "KONTINGEN BIRU",
      namaAtlitMerah: merahName || "SUDUT MERAH",
      kontingenMerah: merahContingent || "KONTINGEN MERAH",
      performerName: activeCorner === "biru" ? (biruName || "SUDUT BIRU") : (merahName || "SUDUT MERAH"),
      contingent: activeCorner === "biru" ? (biruContingent || "KONTINGEN BIRU") : (merahContingent || "KONTINGEN MERAH"),
    });

    setShowRegistrasiOverlay(false);
  };

  // Advance winner in Single Elimination
  const handlePromoteGugurWinner = (matchId: string, winnerCorner: "biru" | "merah") => {
    playSoundByKey("success_chime");
    setSingleEliminationMatches(prev => {
      const updated = [...prev];
      const matchIdx = updated.findIndex(m => m.id === matchId);
      if (matchIdx === -1) return prev;

      const currentMatch = updated[matchIdx];
      const winner = winnerCorner === "biru" ? currentMatch.p1 : currentMatch.p2;
      if (!winner) return prev;

      updated[matchIdx] = {
        ...currentMatch,
        winner,
        status: "COMPLETED"
      };

      // If next match exists, promote winner
      if (currentMatch.nextMatchId) {
        const nextIdx = updated.findIndex(m => m.id === currentMatch.nextMatchId);
        if (nextIdx !== -1) {
          const nextMatch = updated[nextIdx];
          if (!nextMatch.p1 || nextMatch.p1.name.includes("Pemenang")) {
            updated[nextIdx] = { ...nextMatch, p1: winner };
          } else if (!nextMatch.p2 || nextMatch.p2.name.includes("Pemenang")) {
            updated[nextIdx] = { ...nextMatch, p2: winner };
          }
        }
      }

      return updated;
    });
  };

  // Update Pemasalan Match Outcome
  const handlePemasalanOutcome = (
    bracketIndex: number,
    matchKey: "sf1" | "sf2" | "final",
    winnerCorner: "p1" | "p2"
  ) => {
    playSoundByKey("success_chime");
    setPemasalanBracketsData(prev => {
      if (!prev[bracketIndex]) return prev;
      const updatedBracket = updatePemasalanOutcome(prev[bracketIndex], matchKey, winnerCorner);
      const copy = [...prev];
      copy[bracketIndex] = updatedBracket;
      return copy;
    });
  };

  // Generate complete schedule into Partai List based on chosen tournament system
  const handleGenerateScheduleFromSystem = (system: TournamentSystemType) => {
    playSoundByKey("success_chime");
    const currentCat = baganCategoriesList.find(c => c.id === selectedBaganCategoryKey) || baganCategoriesList[0];
    const catName = currentCat.name;
    const newPartais: typeof partaiList = [];

    if (system === "GUGUR") {
      (singleEliminationMatches || []).forEach((m, idx) => {
        if (!m) return;
        const pNum = m.partaiNumber ?? m.matchNumber ?? (idx + 1);
        newPartais.push({
          id: `gugur_${m.id || idx}_${idx + 1}`,
          nomorPartai: (pNum ?? (idx + 1)).toString(),
          checked: true,
          kategori: `${catName} (${m.stage || m.roundName || "BABAK"})`,
          biru: {
            name: m.p1?.name || m.athleteBlue?.name || "TBD (SUDUT BIRU)",
            contingent: m.p1?.contingent || m.athleteBlue?.contingent || "-"
          },
          merah: {
            name: m.p2?.name || m.athleteRed?.name || "TBD (SUDUT MERAH)",
            contingent: m.p2?.contingent || m.athleteRed?.contingent || "-"
          }
        });
      });
    } else if (system === "POOL") {
      (poolGroupsData || []).forEach(pool => {
        if (!pool) return;
        const matchesList = pool.matches || pool.internalMatches || [];
        matchesList.forEach((m, idx) => {
          if (!m) return;
          newPartais.push({
            id: `pool_${pool.name}_${idx + 1}`,
            nomorPartai: (newPartais.length + 1).toString(),
            checked: true,
            kategori: `${catName} (${pool.name} - ${m.stage || m.roundName || "PENYISIHAN"})`,
            biru: {
              name: m.p1?.name || m.athleteBlue?.name || "TBD (SUDUT BIRU)",
              contingent: m.p1?.contingent || m.athleteBlue?.contingent || "-"
            },
            merah: {
              name: m.p2?.name || m.athleteRed?.name || "TBD (SUDUT MERAH)",
              contingent: m.p2?.contingent || m.athleteRed?.contingent || "-"
            }
          });
        });
      });
      (poolPlayoffMatches || []).forEach(m => {
        if (!m) return;
        newPartais.push({
          id: `playoff_${m.id}`,
          nomorPartai: (newPartais.length + 1).toString(),
          checked: true,
          kategori: `${catName} (PLAYOFF - ${m.stage || m.roundName || "BABAK UTAMA"})`,
          biru: {
            name: m.p1?.name || m.athleteBlue?.name || "JUARA POOL A",
            contingent: m.p1?.contingent || m.athleteBlue?.contingent || "-"
          },
          merah: {
            name: m.p2?.name || m.athleteRed?.name || "JUARA POOL B",
            contingent: m.p2?.contingent || m.athleteRed?.contingent || "-"
          }
        });
      });
    } else if (system === "PEMASALAN") {
      (pemasalanBracketsData || []).forEach((b, bIdx) => {
        if (!b) return;
        const sf1 = b.sf1 || b.semifinal1;
        const sf2 = b.sf2 || b.semifinal2;
        const finalMatch = b.final || b.finalMatch;

        if (sf1) {
          newPartais.push({
            id: `pemasalan_sf1_${bIdx}`,
            nomorPartai: (newPartais.length + 1).toString(),
            checked: true,
            kategori: `${catName} (BAGAN ${b.poolIndex || (bIdx + 1)} - SEMIFINAL 1)`,
            biru: {
              name: sf1.p1?.name || sf1.athleteBlue?.name || "ATLET 1",
              contingent: sf1.p1?.contingent || sf1.athleteBlue?.contingent || "-"
            },
            merah: {
              name: sf1.p2?.name || sf1.athleteRed?.name || "ATLET 2",
              contingent: sf1.p2?.contingent || sf1.athleteRed?.contingent || "-"
            }
          });
        }
        if (sf2) {
          newPartais.push({
            id: `pemasalan_sf2_${bIdx}`,
            nomorPartai: (newPartais.length + 1).toString(),
            checked: true,
            kategori: `${catName} (BAGAN ${b.poolIndex || (bIdx + 1)} - SEMIFINAL 2)`,
            biru: {
              name: sf2.p1?.name || sf2.athleteBlue?.name || "ATLET 3",
              contingent: sf2.p1?.contingent || sf2.athleteBlue?.contingent || "-"
            },
            merah: {
              name: sf2.p2?.name || sf2.athleteRed?.name || "ATLET 4",
              contingent: sf2.p2?.contingent || sf2.athleteRed?.contingent || "-"
            }
          });
        }
        if (finalMatch) {
          newPartais.push({
            id: `pemasalan_final_${bIdx}`,
            nomorPartai: (newPartais.length + 1).toString(),
            checked: true,
            kategori: `${catName} (BAGAN ${b.poolIndex || (bIdx + 1)} - FINAL EMAS/PERAK)`,
            biru: {
              name: finalMatch.p1?.name || finalMatch.athleteBlue?.name || "PEMENANG SF 1",
              contingent: finalMatch.p1?.contingent || finalMatch.athleteBlue?.contingent || "-"
            },
            merah: {
              name: finalMatch.p2?.name || finalMatch.athleteRed?.name || "PEMENANG SF 2",
              contingent: finalMatch.p2?.contingent || finalMatch.athleteRed?.contingent || "-"
            }
          });
        }
      });
    }

    if (newPartais.length > 0) {
      setPartaiList(newPartais);
      alert(`Berhasil membuat ${newPartais.length} jadwal partai untuk ${system === "GUGUR" ? "Sistem Gugur Tunggal" : system === "POOL" ? "Sistem Pool" : "Sistem Pemasalan"}! Silakan cek di tab '3. KONTROL PARTAI'.`);
    }
  };

  // Pack and save all states into a single JSON object in localStorage
  const saveSharedState = (updates: Partial<{
    selectedCategory: string;
    selectedAge: string;
    gender: "PUTRA" | "PUTRI";
    performerName: string;
    contingent: string;
    timeRemaining: number;
    timeActual: number;
    isTimerRunning: boolean;
    isMatchUnlocked: boolean;
    isTimer1Running: boolean;
    isTimer2Running: boolean;
    timerStartedAt: number;
    timer1StartedAt: number;
    timer1BaseRemaining: number;
    timer2StartedAt: number;
    timer2BaseActual: number;
    timerBaseRemaining: number;
    timerBaseActual: number;
    deductions: typeof deductions;
    judgesCount: number;
    juriScores: JuriScore[];
    logs: typeof logs;
    namaEvent: string;
    tempatPelaksanaan: string;
    waktuPelaksanaan: string;
    partaiTanding: string;
    tahapPertandingan: string;
    durasiTampil: string;
    namaAtlitBiru: string;
    kontingenBiru: string;
    namaAtlitMerah: string;
    kontingenMerah: string;
    activeCorner: "biru" | "merah" | null | "";
    logoKiri: string;
    logoKanan: string;
    juriScoresBiru: JuriScore[];
    juriScoresMerah: JuriScore[];
    deductionsBiru: typeof deductions;
    deductionsMerah: typeof deductions;
    timeRemainingBiru: number;
    timeRemainingMerah: number;
    timeActualBiru: number;
    timeActualMerah: number;
    matchHistory: any[];
    disqualifiedBiru: boolean;
    undurDiriBiru: boolean;
    disqualifiedMerah: boolean;
    undurDiriMerah: boolean;
  }>) => {
    // Merge existing local states with requested updates
    const nextIsMatchUnlocked = updates.isMatchUnlocked !== undefined ? updates.isMatchUnlocked : isMatchUnlocked;
    const nextIsTimer1Running = updates.isTimer1Running !== undefined ? updates.isTimer1Running : isTimer1Running;
    const nextIsTimer2Running = updates.isTimer2Running !== undefined ? updates.isTimer2Running : isTimer2Running;
    const nextIsTimerRunning = updates.isTimerRunning !== undefined ? updates.isTimerRunning : (nextIsTimer1Running || nextIsTimer2Running);

    let nextTimer1StartedAt = timer1StartedAt;
    if (updates.timer1StartedAt !== undefined) {
      nextTimer1StartedAt = updates.timer1StartedAt;
    } else if (nextIsTimer1Running && !isTimer1Running) {
      nextTimer1StartedAt = Date.now();
    }

    let nextTimer2StartedAt = timer2StartedAt;
    if (updates.timer2StartedAt !== undefined) {
      nextTimer2StartedAt = updates.timer2StartedAt;
    } else if (nextIsTimer2Running && !isTimer2Running) {
      nextTimer2StartedAt = Date.now();
    }

    let nextTimer1BaseRemaining = timer1BaseRemaining;
    if (updates.timer1BaseRemaining !== undefined) {
      nextTimer1BaseRemaining = updates.timer1BaseRemaining;
    } else if (updates.timerBaseRemaining !== undefined) {
      nextTimer1BaseRemaining = updates.timerBaseRemaining;
    } else if (!nextIsTimer1Running && updates.timeRemaining !== undefined) {
      nextTimer1BaseRemaining = updates.timeRemaining;
    } else if (nextIsTimer1Running && !isTimer1Running) {
      nextTimer1BaseRemaining = timeRemaining;
    }

    let nextTimer2BaseActual = timer2BaseActual;
    if (updates.timer2BaseActual !== undefined) {
      nextTimer2BaseActual = updates.timer2BaseActual;
    } else if (updates.timerBaseActual !== undefined) {
      nextTimer2BaseActual = updates.timerBaseActual;
    } else if (!nextIsTimer2Running && updates.timeActual !== undefined) {
      nextTimer2BaseActual = updates.timeActual;
    } else if (nextIsTimer2Running && !isTimer2Running) {
      nextTimer2BaseActual = timeActual;
    }

    const nextTimeRemaining = updates.timeRemaining !== undefined ? updates.timeRemaining : timeRemaining;
    const nextTimeActual = updates.timeActual !== undefined ? updates.timeActual : timeActual;

    const stateToSave = {
      selectedCategory: updates.selectedCategory !== undefined ? updates.selectedCategory : selectedCategory,
      selectedAge: updates.selectedAge !== undefined ? updates.selectedAge : selectedAge,
      gender: updates.gender !== undefined ? updates.gender : gender,
      performerName: updates.performerName !== undefined ? updates.performerName : performerName,
      contingent: updates.contingent !== undefined ? updates.contingent : contingent,
      timeRemaining: nextTimeRemaining,
      timeActual: nextTimeActual,
      isTimerRunning: nextIsTimerRunning,
      isMatchUnlocked: nextIsMatchUnlocked,
      isTimer1Running: nextIsTimer1Running,
      isTimer2Running: nextIsTimer2Running,
      timerStartedAt: nextTimer2StartedAt || nextTimer1StartedAt,
      timer1StartedAt: nextTimer1StartedAt,
      timer2StartedAt: nextTimer2StartedAt,
      timerBaseRemaining: nextTimer1BaseRemaining,
      timer1BaseRemaining: nextTimer1BaseRemaining,
      timerBaseActual: nextTimer2BaseActual,
      timer2BaseActual: nextTimer2BaseActual,
      deductions: updates.deductions !== undefined ? updates.deductions : deductions,
      judgesCount: updates.judgesCount !== undefined ? updates.judgesCount : judgesCount,
      juriScores: updates.juriScores !== undefined ? updates.juriScores : juriScores,
      logs: updates.logs !== undefined ? updates.logs : logs,
      
      namaEvent: updates.namaEvent !== undefined ? updates.namaEvent : namaEvent,
      tempatPelaksanaan: updates.tempatPelaksanaan !== undefined ? updates.tempatPelaksanaan : tempatPelaksanaan,
      waktuPelaksanaan: updates.waktuPelaksanaan !== undefined ? updates.waktuPelaksanaan : waktuPelaksanaan,
      partaiTanding: updates.partaiTanding !== undefined ? updates.partaiTanding : partaiTanding,
      tahapPertandingan: updates.tahapPertandingan !== undefined ? updates.tahapPertandingan : tahapPertandingan,
      durasiTampil: updates.durasiTampil !== undefined ? updates.durasiTampil : durasiTampil,
      namaAtlitBiru: updates.namaAtlitBiru !== undefined ? updates.namaAtlitBiru : namaAtlitBiru,
      kontingenBiru: updates.kontingenBiru !== undefined ? updates.kontingenBiru : kontingenBiru,
      namaAtlitMerah: updates.namaAtlitMerah !== undefined ? updates.namaAtlitMerah : namaAtlitMerah,
      kontingenMerah: updates.kontingenMerah !== undefined ? updates.kontingenMerah : kontingenMerah,
      activeCorner: updates.activeCorner !== undefined ? updates.activeCorner : activeCorner,
      logoKiri: updates.logoKiri !== undefined ? updates.logoKiri : logoKiri,
      logoKanan: updates.logoKanan !== undefined ? updates.logoKanan : logoKanan,
      
      juriScoresBiru: updates.juriScoresBiru !== undefined 
        ? updates.juriScoresBiru 
        : (updates.juriScores !== undefined && (activeCorner === "biru" || !activeCorner) ? updates.juriScores : juriScoresBiru),
      juriScoresMerah: updates.juriScoresMerah !== undefined 
        ? updates.juriScoresMerah 
        : (updates.juriScores !== undefined && activeCorner === "merah" ? updates.juriScores : juriScoresMerah),
      deductionsBiru: updates.deductionsBiru !== undefined 
        ? updates.deductionsBiru 
        : (updates.deductions !== undefined && (activeCorner === "biru" || !activeCorner) ? updates.deductions : deductionsBiru),
      deductionsMerah: updates.deductionsMerah !== undefined 
        ? updates.deductionsMerah 
        : (updates.deductions !== undefined && activeCorner === "merah" ? updates.deductions : deductionsMerah),
      timeRemainingBiru: updates.timeRemainingBiru !== undefined 
        ? updates.timeRemainingBiru 
        : (updates.timeRemaining !== undefined && (activeCorner === "biru" || !activeCorner) ? nextTimeRemaining : timeRemainingBiru),
      timeRemainingMerah: updates.timeRemainingMerah !== undefined 
        ? updates.timeRemainingMerah 
        : (updates.timeRemaining !== undefined && activeCorner === "merah" ? nextTimeRemaining : timeRemainingMerah),
      timeActualBiru: updates.timeActualBiru !== undefined 
        ? updates.timeActualBiru 
        : (updates.timeActual !== undefined && (activeCorner === "biru" || !activeCorner) ? nextTimeActual : timeActualBiru),
      timeActualMerah: updates.timeActualMerah !== undefined 
        ? updates.timeActualMerah 
        : (updates.timeActual !== undefined && activeCorner === "merah" ? nextTimeActual : timeActualMerah),
      matchHistory: updates.matchHistory !== undefined ? updates.matchHistory : matchHistory,
      disqualifiedBiru: updates.disqualifiedBiru !== undefined ? updates.disqualifiedBiru : disqualifiedBiru,
      undurDiriBiru: updates.undurDiriBiru !== undefined ? updates.undurDiriBiru : undurDiriBiru,
      disqualifiedMerah: updates.disqualifiedMerah !== undefined ? updates.disqualifiedMerah : disqualifiedMerah,
      undurDiriMerah: updates.undurDiriMerah !== undefined ? updates.undurDiriMerah : undurDiriMerah,
      timestamp: Date.now()
    };

    // Apply locally first for immediate responsiveness
    if (updates.selectedCategory !== undefined) setSelectedCategory(updates.selectedCategory);
    if (updates.selectedAge !== undefined) setSelectedAge(updates.selectedAge);
    if (updates.gender !== undefined) setGender(updates.gender);
    if (updates.performerName !== undefined) setPerformerName(updates.performerName);
    if (updates.contingent !== undefined) setContingent(updates.contingent);
    if (updates.timeRemaining !== undefined) setTimeRemaining(updates.timeRemaining);
    if (updates.timeActual !== undefined) setTimeActual(updates.timeActual);
    if (updates.isMatchUnlocked !== undefined) setIsMatchUnlocked(updates.isMatchUnlocked);
    if (updates.isTimer1Running !== undefined) setIsTimer1Running(updates.isTimer1Running);
    if (updates.isTimer2Running !== undefined) setIsTimer2Running(updates.isTimer2Running);
    if (updates.isTimerRunning !== undefined) setIsTimerRunning(updates.isTimerRunning);
    else setIsTimerRunning(nextIsTimerRunning);

    if (updates.timer1StartedAt !== undefined) setTimer1StartedAt(updates.timer1StartedAt);
    if (updates.timer2StartedAt !== undefined) setTimer2StartedAt(updates.timer2StartedAt);
    if (updates.timer1BaseRemaining !== undefined) setTimer1BaseRemaining(updates.timer1BaseRemaining);
    if (updates.timer2BaseActual !== undefined) setTimer2BaseActual(updates.timer2BaseActual);
    if (updates.timerBaseRemaining !== undefined) setTimerBaseRemaining(updates.timerBaseRemaining);
    if (updates.timerBaseActual !== undefined) setTimerBaseActual(updates.timerBaseActual);

    if (updates.deductions !== undefined) setDeductions(updates.deductions);
    if (updates.judgesCount !== undefined) setJudgesCount(updates.judgesCount);
    if (updates.juriScores !== undefined) setJuriScores(updates.juriScores);
    if (updates.logs !== undefined) setLogs(updates.logs);

    if (updates.namaEvent !== undefined) setNamaEvent(updates.namaEvent);
    if (updates.tempatPelaksanaan !== undefined) setTempatPelaksanaan(updates.tempatPelaksanaan);
    if (updates.waktuPelaksanaan !== undefined) setWaktuPelaksanaan(updates.waktuPelaksanaan);
    if (updates.partaiTanding !== undefined) setPartaiTanding(updates.partaiTanding);
    if (updates.tahapPertandingan !== undefined) setTahapPertandingan(updates.tahapPertandingan);
    if (updates.durasiTampil !== undefined) setDurasiTampil(updates.durasiTampil);
    if (updates.namaAtlitBiru !== undefined) setNamaAtlitBiru(updates.namaAtlitBiru);
    if (updates.kontingenBiru !== undefined) setKontingenBiru(updates.kontingenBiru);
    if (updates.namaAtlitMerah !== undefined) setNamaAtlitMerah(updates.namaAtlitMerah);
    if (updates.kontingenMerah !== undefined) setKontingenMerah(updates.kontingenMerah);
    if (updates.activeCorner !== undefined) setActiveCorner(updates.activeCorner);
    if (updates.logoKiri !== undefined) setLogoKiri(updates.logoKiri);
    if (updates.logoKanan !== undefined) setLogoKanan(updates.logoKanan);

    if (updates.juriScoresBiru !== undefined) {
      setJuriScoresBiru(updates.juriScoresBiru);
    } else if (updates.juriScores !== undefined && (activeCorner === "biru" || !activeCorner)) {
      setJuriScoresBiru(updates.juriScores);
    }

    if (updates.juriScoresMerah !== undefined) {
      setJuriScoresMerah(updates.juriScoresMerah);
    } else if (updates.juriScores !== undefined && activeCorner === "merah") {
      setJuriScoresMerah(updates.juriScores);
    }

    if (updates.deductionsBiru !== undefined) {
      setDeductionsBiru(updates.deductionsBiru);
    } else if (updates.deductions !== undefined && (activeCorner === "biru" || !activeCorner)) {
      setDeductionsBiru(updates.deductions);
    }

    if (updates.deductionsMerah !== undefined) {
      setDeductionsMerah(updates.deductionsMerah);
    } else if (updates.deductions !== undefined && activeCorner === "merah") {
      setDeductionsMerah(updates.deductions);
    }

    if (updates.timeRemainingBiru !== undefined) {
      setTimeRemainingBiru(updates.timeRemainingBiru);
    } else if (updates.timeRemaining !== undefined && (activeCorner === "biru" || !activeCorner)) {
      setTimeRemainingBiru(nextTimeRemaining);
    }

    if (updates.timeRemainingMerah !== undefined) {
      setTimeRemainingMerah(updates.timeRemainingMerah);
    } else if (updates.timeRemaining !== undefined && activeCorner === "merah") {
      setTimeRemainingMerah(nextTimeRemaining);
    }

    if (updates.timeActualBiru !== undefined) {
      setTimeActualBiru(updates.timeActualBiru);
    } else if (updates.timeActual !== undefined && (activeCorner === "biru" || !activeCorner)) {
      setTimeActualBiru(nextTimeActual);
    }

    if (updates.timeActualMerah !== undefined) {
      setTimeActualMerah(updates.timeActualMerah);
    } else if (updates.timeActual !== undefined && activeCorner === "merah") {
      setTimeActualMerah(nextTimeActual);
    }

    if (updates.disqualifiedBiru !== undefined) setDisqualifiedBiru(updates.disqualifiedBiru);
    if (updates.undurDiriBiru !== undefined) setUndurDiriBiru(updates.undurDiriBiru);
    if (updates.disqualifiedMerah !== undefined) setDisqualifiedMerah(updates.disqualifiedMerah);
    if (updates.undurDiriMerah !== undefined) setUndurDiriMerah(updates.undurDiriMerah);
    if (updates.matchHistory !== undefined) {
      setMatchHistory(updates.matchHistory);
      localStorage.setItem("silat_seni_match_history", JSON.stringify(updates.matchHistory));
    }

    localStorage.setItem("silat_seni_match_state", JSON.stringify(stateToSave));
  };

  // Sync state from localStorage on mount and when other tabs change it
  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem("silat_seni_match_state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSelectedCategory(parsed.selectedCategory);
          setSelectedAge(parsed.selectedAge);
          setGender(parsed.gender);
          setPerformerName(parsed.performerName);
          setContingent(parsed.contingent);

          if (parsed.isMatchUnlocked !== undefined) setIsMatchUnlocked(!!parsed.isMatchUnlocked);

          const t1Run = parsed.isTimer1Running !== undefined ? !!parsed.isTimer1Running : !!parsed.isTimerRunning;
          const t2Run = parsed.isTimer2Running !== undefined ? !!parsed.isTimer2Running : !!parsed.isTimerRunning;
          setIsTimer1Running(t1Run);
          setIsTimer2Running(t2Run);
          setIsTimerRunning(t1Run || t2Run);

          const t1Start = parsed.timer1StartedAt || parsed.timerStartedAt || 0;
          const t2Start = parsed.timer2StartedAt || parsed.timerStartedAt || 0;
          const t1BaseRem = parsed.timer1BaseRemaining !== undefined ? parsed.timer1BaseRemaining : (parsed.timerBaseRemaining !== undefined ? parsed.timerBaseRemaining : (parsed.timeRemaining || 0));
          const t2BaseAct = parsed.timer2BaseActual !== undefined ? parsed.timer2BaseActual : (parsed.timerBaseActual !== undefined ? parsed.timerBaseActual : (parsed.timeActual || 0));

          setTimer1StartedAt(t1Start);
          setTimer2StartedAt(t2Start);
          setTimer1BaseRemaining(t1BaseRem);
          setTimer2BaseActual(t2BaseAct);
          setTimerBaseRemaining(t1BaseRem);
          setTimerBaseActual(t2BaseAct);

          const now = Date.now();
          const limit = getDurasiSeconds(parsed.durasiTampil || "03:00");

          let computedRem = parsed.timeRemaining !== undefined ? parsed.timeRemaining : 0;
          if (t1Run && t1Start > 0) {
            const elapsedSec1 = Math.floor(Math.max(0, now - t1Start) / 1000);
            computedRem = Math.min(limit, t1BaseRem + elapsedSec1);
          }

          let computedAct = parsed.timeActual !== undefined ? parsed.timeActual : 0;
          if (t2Run && t2Start > 0) {
            const elapsedSec2 = Math.floor(Math.max(0, now - t2Start) / 1000);
            computedAct = t2BaseAct + elapsedSec2;
          }

          setTimeRemaining(computedRem);
          setTimeActual(computedAct);

          setDeductions(parsed.deductions);
          setJudgesCount(parsed.judgesCount);
          setJuriScores(parsed.juriScores);
          setLogs(parsed.logs || []);

          if (parsed.namaEvent !== undefined) setNamaEvent(parsed.namaEvent);
          if (parsed.tempatPelaksanaan !== undefined) setTempatPelaksanaan(parsed.tempatPelaksanaan);
          if (parsed.waktuPelaksanaan !== undefined) setWaktuPelaksanaan(parsed.waktuPelaksanaan);
          if (parsed.partaiTanding !== undefined) setPartaiTanding(parsed.partaiTanding);
          if (parsed.tahapPertandingan !== undefined) setTahapPertandingan(parsed.tahapPertandingan);
          if (parsed.durasiTampil !== undefined) setDurasiTampil(parsed.durasiTampil);
          if (parsed.namaAtlitBiru !== undefined) setNamaAtlitBiru(parsed.namaAtlitBiru);
          if (parsed.kontingenBiru !== undefined) setKontingenBiru(parsed.kontingenBiru);
          if (parsed.namaAtlitMerah !== undefined) setNamaAtlitMerah(parsed.namaAtlitMerah);
          if (parsed.kontingenMerah !== undefined) setKontingenMerah(parsed.kontingenMerah);
          if (parsed.activeCorner !== undefined) setActiveCorner(parsed.activeCorner);
          if (parsed.logoKiri !== undefined) setLogoKiri(parsed.logoKiri);
          if (parsed.logoKanan !== undefined) setLogoKanan(parsed.logoKanan);

          if (parsed.juriScoresBiru !== undefined) setJuriScoresBiru(parsed.juriScoresBiru);
          if (parsed.juriScoresMerah !== undefined) setJuriScoresMerah(parsed.juriScoresMerah);
          if (parsed.deductionsBiru !== undefined) setDeductionsBiru(parsed.deductionsBiru);
          if (parsed.deductionsMerah !== undefined) setDeductionsMerah(parsed.deductionsMerah);
          if (parsed.timeRemainingBiru !== undefined) setTimeRemainingBiru(parsed.timeRemainingBiru);
          if (parsed.timeRemainingMerah !== undefined) setTimeRemainingMerah(parsed.timeRemainingMerah);
          if (parsed.timeActualBiru !== undefined) setTimeActualBiru(parsed.timeActualBiru);
          if (parsed.timeActualMerah !== undefined) setTimeActualMerah(parsed.timeActualMerah);
          if (parsed.matchHistory !== undefined) setMatchHistory(parsed.matchHistory);
          if (parsed.disqualifiedBiru !== undefined) setDisqualifiedBiru(parsed.disqualifiedBiru);
          if (parsed.undurDiriBiru !== undefined) setUndurDiriBiru(parsed.undurDiriBiru);
          if (parsed.disqualifiedMerah !== undefined) setDisqualifiedMerah(parsed.disqualifiedMerah);
          if (parsed.undurDiriMerah !== undefined) setUndurDiriMerah(parsed.undurDiriMerah);
        } catch (e) {
          console.error("Error reading shared state:", e);
        }
      }
    };

    // Load initial state
    handleSync();

    // Listen to storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "silat_seni_match_state") {
        handleSync();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Listen for Shift key to trigger Bell/Horn when role is sekretaris
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (role !== "sekretaris") return;
      
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      
      if (e.key === "Shift") {
        e.preventDefault();
        playSoundByKey("buzzer");
        const updatedLogs = [
          { time: formatTime(timeRemaining), msg: "BELL / HORN dibunyikan oleh Sekretaris (Shortcut Shift)", type: "system" as const },
          ...logs
        ];
        saveSharedState({ logs: updatedLogs });
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [role, timeRemaining, logs]);

  const getDurasiSeconds = (dur: string) => {
    if (dur === "02:00") return 120;
    if (dur === "01:30") return 90;
    if (dur === "01:00") return 60;
    return 180; // default 03:00
  };

  // High-precision timer tick loop synchronized across all panels (Dewan, Monitor, Juri, Sekretaris)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isTimer1Running || isTimer2Running || isTimerRunning) {
      timer = setInterval(() => {
        const limit = getDurasiSeconds(durasiTampil);
        const now = Date.now();
        
        let nextRemaining = timeRemaining;
        let nextActual = timeActual;
        let buzzerTriggered = false;

        // Timer 1: Arena Match Timer (ticks up to limit 03:00)
        if (isTimer1Running && timer1StartedAt > 0) {
          const elapsedSec1 = Math.floor(Math.max(0, now - timer1StartedAt) / 1000);
          nextRemaining = timer1BaseRemaining + elapsedSec1;
          if (nextRemaining >= limit) {
            nextRemaining = limit;
            buzzerTriggered = true;
          }
        }

        // Timer 2: Actual Performer Timer (freezes when isTimer2Running is false)
        if (isTimer2Running && timer2StartedAt > 0) {
          const elapsedSec2 = Math.floor(Math.max(0, now - timer2StartedAt) / 1000);
          nextActual = timer2BaseActual + elapsedSec2;
        }

        if (buzzerTriggered) {
          playSoundByKey("buzzer");
          const updatedLogs = [
            { time: formatTime(limit), msg: "Waktu tampil mencapai batas (Buzzer)!", type: "system" as const },
            ...logs
          ];

          saveSharedState({
            isTimer1Running: false,
            isTimer2Running: false,
            isTimerRunning: false,
            timeRemaining: limit,
            timeActual: nextActual,
            timer1BaseRemaining: limit,
            timer2BaseActual: nextActual,
            timer1StartedAt: 0,
            timer2StartedAt: 0,
            logs: updatedLogs
          });
        } else {
          // Local real-time update for all open views (Sekretaris, Dewan, Monitor, Juri)
          setTimeRemaining(nextRemaining);
          setTimeActual(nextActual);
        }
      }, 100);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [
    isTimer1Running,
    isTimer2Running,
    isTimerRunning,
    timer1StartedAt,
    timer1BaseRemaining,
    timer2StartedAt,
    timer2BaseActual,
    durasiTampil,
    logs
  ]);

  const toggleTimer = () => {
    playSoundByKey("short_beep");
    const newTimerState = !isTimerRunning;
    const timeStr = formatTime(timeRemaining);
    const updatedLogs = [{ time: timeStr, msg: newTimerState ? "Timer Dijalankan" : "Timer Dihentikan Sementara", type: "system" as const }, ...logs];
    
    if (newTimerState) {
      const now = Date.now();
      saveSharedState({
        isTimerRunning: true,
        timerStartedAt: now,
        timerBaseRemaining: timeRemaining,
        timerBaseActual: timeActual,
        timeRemaining: timeRemaining,
        timeActual: timeActual,
        logs: updatedLogs
      });
    } else {
      const elapsedMs = Math.max(0, Date.now() - timerStartedAt);
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const limit = getDurasiSeconds(durasiTampil);
      const finalRemaining = Math.min(limit, timerBaseRemaining + elapsedSec);
      const finalActual = timerBaseActual + elapsedSec;
      
      saveSharedState({
        isTimerRunning: false,
        timeRemaining: finalRemaining,
        timeActual: finalActual,
        timerBaseRemaining: finalRemaining,
        timerBaseActual: finalActual,
        timerStartedAt: 0,
        logs: updatedLogs
      });
    }
  };

  const resetTimer = () => {
    playSoundByKey("warning_beep");
    const updatedLogs = [{ time: "00:00", msg: "Timer Diatur Ulang ke 0", type: "system" as const }, ...logs];
    saveSharedState({
      isTimerRunning: false,
      timeRemaining: 0,
      timeActual: 0,
      timerStartedAt: 0,
      timerBaseRemaining: 0,
      timerBaseActual: 0,
      logs: updatedLogs
    });
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Calculate Dewan Deduction total
  const getInitialDefaultScore = (cat: string = selectedCategory) => {
    if (cat === "ganda" || cat === "solo_kreatif" || cat === "tunggal_bebas") {
      return 9.10;
    }
    return 9.00;
  };

  const calculateMedian = (values: number[]) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const mid = Math.floor(n / 2);
    if (n % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  };

  const getDewanDeductionValue = () => {
    let total = 0;
    total += deductions.timeOverUnder * 0.01;
    total += deductions.weaponDrop * 0.50;
    if (deductions.costumeMistake) total += 0.50;
    total += deductions.outOfBounds * 0.50;
    total += deductions.otherPenalty;
    return total;
  };

  const handleResetScoring = () => {
    if (confirm("Apakah Anda yakin ingin mengatur ulang seluruh data dan nilai saat ini?")) {
      const isGandaOrBebas = selectedCategory === "ganda" || selectedCategory === "solo_kreatif";
      const initialScoreText = isGandaOrBebas ? "9.10" : "9.00";
      const resetScores = juriScores.map(js => ({
        ...js,
        kebenaran: isGandaOrBebas ? 0 : 9.90,
        kemantapan: 0.00,
        keserasian: 0.00,
        penjiwaan: 0.00,
        wrongMoves: 0,
        flowScore: 0.00,
        submitted: false
      }));

      playSoundByKey("warning_beep");
      saveSharedState({
        juriScores: resetScores,
        juriScoresBiru: resetScores,
        juriScoresMerah: resetScores,
        deductions: {
          timeOverUnder: 0,
          weaponDrop: 0,
          costumeMistake: false,
          outOfBounds: 0,
          otherPenalty: 0
        },
        timeRemaining: 0,
        timeActual: 0,
        isTimerRunning: false,
        logs: [{ time: "00:00", msg: `Seluruh skor, denda, dan timer diatur ulang (Tampilan awal: ${initialScoreText}).`, type: "system" as const }]
      });
    }
  };

  // Calculate individual judge score
  const getJudgeTotal = (js: JuriScore) => {
    if (selectedCategory === "tunggal" || selectedCategory === "regu") {
      if (!js.submitted) {
        return 9.00;
      }
      const wrong = js.wrongMoves !== undefined ? js.wrongMoves : Math.max(0, Math.round((9.90 - js.kebenaran) * 100));
      const acc = Math.max(0, 9.90 - wrong * 0.01);
      const flow = js.flowScore !== undefined ? js.flowScore : (js.kemantapan <= 0.10 ? js.kemantapan : (js.kemantapan > 5 ? 0.00 : js.kemantapan));
      return Number((acc + flow).toFixed(2));
    } else if (selectedCategory === "ganda") {
      if (!js.submitted) {
        return 9.10;
      }
      const serangBela = js.kebenaran ?? 0;
      const kemantapanHarmoni = js.kemantapan ?? 0;
      const penjiwaan = js.penjiwaan ?? js.keserasian ?? 0;
      const sumComponents = serangBela + kemantapanHarmoni + penjiwaan;
      if (sumComponents >= 8.0) {
        return Number(sumComponents.toFixed(2));
      }
      return Number((9.10 + sumComponents).toFixed(2));
    } else {
      // Solo Kreatif / Tunggal Bebas
      if (!js.submitted) {
        return 9.10;
      }
      const serangBela = js.kebenaran ?? 0;
      const kemantapan = js.kemantapan ?? 0;
      const penjiwaan = js.penjiwaan !== undefined ? js.penjiwaan : (js.keserasian ?? 0);
      const sumComponents = serangBela + kemantapan + penjiwaan;
      if (sumComponents >= 8.0) {
        return Number(sumComponents.toFixed(2));
      }
      return Number((9.10 + sumComponents).toFixed(2)); 
    }
  };

  // IPSI score processing (Median score calculation for all judges on duty)
  const getSeniCalculationResult = (customScores: JuriScore[] = juriScores, customDeductions = deductions) => {
    const onDutyScores = customScores.filter(js => js.id <= judgesCount);
    const submittedScores = onDutyScores.filter(js => js.submitted);
    const defaultInitial = getInitialDefaultScore();
    
    let dewanDeductions = 0;
    dewanDeductions += (customDeductions.timeOverUnder || 0) * 0.01;
    dewanDeductions += (customDeductions.weaponDrop || 0) * 0.50;
    if (customDeductions.costumeMistake) dewanDeductions += 0.50;
    dewanDeductions += (customDeductions.outOfBounds || 0) * 0.50;
    dewanDeductions += (customDeductions.otherPenalty || 0);

    if (submittedScores.length === 0) {
      const initialWithDeductions = Math.max(0, defaultInitial - dewanDeductions);
      return { 
        finalScore: initialWithDeductions, 
        minIdx: -1, 
        maxIdx: -1, 
        rawAverage: defaultInitial, 
        calculationsLog: `Tampilan Awal (${defaultInitial.toFixed(2)}). Menunggu nilai dari ${judgesCount} Juri...` 
      };
    }

    const activeValues = onDutyScores.map(js => getJudgeTotal(js));
    const median = calculateMedian(activeValues);
    const finalVal = Math.max(0, median - dewanDeductions);

    const logMsg = `Sistem Median (${judgesCount} Juri Bertugas): Nilai Median = ${median.toFixed(3)}. Hukuman Dewan = -${dewanDeductions.toFixed(2)}. Skor Akhir = ${finalVal.toFixed(3)}`;

    return {
      finalScore: finalVal,
      minIdx: -1,
      maxIdx: -1,
      rawAverage: median,
      calculationsLog: logMsg
    };
  };

  const getCalculatedScoreForCorner = (corner: "biru" | "merah") => {
    const isCurrentActive = (corner === "biru" && (activeCorner === "biru" || !activeCorner)) ||
                            (corner === "merah" && activeCorner === "merah");
    const scores = isCurrentActive ? juriScores : (corner === "biru" ? juriScoresBiru : juriScoresMerah);
    const dews = isCurrentActive ? deductions : (corner === "biru" ? deductionsBiru : deductionsMerah);

    return getSeniCalculationResult(scores, dews).finalScore;
  };

  const getFormattedScore = (corner: "biru" | "merah") => {
    if (corner === "biru") {
      if (disqualifiedBiru) return "DISQ";
      if (undurDiriBiru) return "WD";
    } else {
      if (disqualifiedMerah) return "DISQ";
      if (undurDiriMerah) return "WD";
    }
    return getCalculatedScoreForCorner(corner).toFixed(3);
  };

  const handleArchiveMatch = () => {
    const scoreB = getCalculatedScoreForCorner("biru");
    const scoreM = getCalculatedScoreForCorner("merah");
    
    let winner = "SERI";
    const isBDqOrWd = disqualifiedBiru || undurDiriBiru;
    const isMDqOrWd = disqualifiedMerah || undurDiriMerah;
    if (isBDqOrWd && !isMDqOrWd) {
      winner = "SUDUT MERAH";
    } else if (!isBDqOrWd && isMDqOrWd) {
      winner = "SUDUT BIRU";
    } else if (isBDqOrWd && isMDqOrWd) {
      winner = "BATAL";
    } else {
      winner = scoreB > scoreM ? "SUDUT BIRU" : scoreB < scoreM ? "SUDUT MERAH" : "SERI";
    }
    
    const newRecord = {
      id: Date.now(),
      partai: partaiTanding,
      kategori: selectedCategory,
      usia: selectedAge,
      gender,
      tahap: tahapPertandingan,
      biru: { name: namaAtlitBiru, contingent: kontingenBiru, score: scoreB, status: disqualifiedBiru ? "DISQ" : undurDiriBiru ? "WD" : "NORMAL" },
      merah: { name: namaAtlitMerah, contingent: kontingenMerah, score: scoreM, status: disqualifiedMerah ? "DISQ" : undurDiriMerah ? "WD" : "NORMAL" },
      winner,
      timestamp: new Date().toLocaleString("id-ID")
    };
    
    const updatedHistory = [newRecord, ...matchHistory];
    setMatchHistory(updatedHistory);
    localStorage.setItem("silat_seni_match_history", JSON.stringify(updatedHistory));
    
    // Play sound and show alert
    playSoundByKey("success_chime");
    
    const displayScoreB = disqualifiedBiru ? "DISQ" : undurDiriBiru ? "WD" : scoreB.toFixed(3);
    const displayScoreM = disqualifiedMerah ? "DISQ" : undurDiriMerah ? "WD" : scoreM.toFixed(3);
    alert(`Partai ${partaiTanding} berhasil diarsipkan!\nPemenang: ${winner}\nSkor - Biru: ${displayScoreB} | Merah: ${displayScoreM}`);
  };

  const exportHistoryToExcel = () => {
    if (matchHistory.length === 0) {
      alert("Belum ada data sejarah pertandingan untuk diekspor!");
      return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,PARTAI,KATEGORI,GOLONGAN USIA,GENDER,TAHAP,ATLET BIRU,KONTINGEN BIRU,SKOR BIRU,ATLET MERAH,KONTINGEN MERAH,SKOR MERAH,PEMENANG,WAKTU SINKRONISASI\n";
    
    matchHistory.forEach(r => {
      const row = [
        r.id,
        r.partai,
        r.kategori,
        r.usia,
        r.gender,
        r.tahap,
        `"${r.biru.name}"`,
        `"${r.biru.contingent}"`,
        r.biru.score,
        `"${r.merah.name}"`,
        `"${r.merah.contingent}"`,
        r.merah.score,
        `"${r.winner}"`,
        `"${r.timestamp}"`
      ].join(",");
      csvContent += row + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HISTORY_SKOR_SENI_PARTAI_${partaiTanding}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    playSoundByKey("success_chime");
  };

  const calcResult = getSeniCalculationResult();

  const handleLoadAthlete = (ath: Athlete) => {
    playSoundByKey("success_chime");
    const updatedLogs = [{ time: formatTime(timeRemaining), msg: `Pesilat ${ath.name} (${ath.contingent}) dimuat ke arena.`, type: "system" as const }, ...logs];
    
    saveSharedState({
      performerName: ath.name.toUpperCase(),
      contingent: ath.contingent.toUpperCase(),
      selectedAge: ath.usia.toUpperCase(),
      gender: ath.gender,
      logs: updatedLogs,
      // Reset current scores for the new performer
      juriScores: juriScores.map(js => ({
        ...js,
        kebenaran: selectedCategory === "tunggal" || selectedCategory === "regu" ? 9.90 : 5.50,
        kemantapan: 5.50,
        keserasian: 5.50,
        penjiwaan: 5.50,
        submitted: false
      })),
      deductions: {
        timeOverUnder: 0,
        weaponDrop: 0,
        costumeMistake: false,
        outOfBounds: 0,
        otherPenalty: 0
      },
      timeRemaining: 0,
      timeActual: 0,
      timerStartedAt: 0,
      timerBaseRemaining: 0,
      timerBaseActual: 0
    });

    setShowAthleteLoader(false);
  };

  // Helper to activate a corner (SUDUT BIRU or SUDUT MERAH) and swap relevant score sheets
  const activateCornerAndSync = (corner: "biru" | "merah") => {
    playSoundByKey("short_beep");

    // 1. Save current active values into the buffer of the OLD corner
    if (activeCorner === "biru") {
      setJuriScoresBiru(juriScores);
      setDeductionsBiru(deductions);
      setTimeRemainingBiru(timeRemaining);
      setTimeActualBiru(timeActual);
    } else if (activeCorner === "merah") {
      setJuriScoresMerah(juriScores);
      setDeductionsMerah(deductions);
      setTimeRemainingMerah(timeRemaining);
      setTimeActualMerah(timeActual);
    }

    // 2. Determine target values from the NEW corner's buffer
    const nextScores = corner === "biru" ? juriScoresBiru : juriScoresMerah;
    const nextDeductions = corner === "biru" ? deductionsBiru : deductionsMerah;
    const nextTime = corner === "biru" ? timeRemainingBiru : timeRemainingMerah;
    const nextActual = corner === "biru" ? timeActualBiru : timeActualMerah;
    const nextName = corner === "biru" ? namaAtlitBiru : namaAtlitMerah;
    const nextContingent = corner === "biru" ? kontingenBiru : kontingenMerah;

    // 3. Save to localStorage and update state
    saveSharedState({
      activeCorner: corner,
      juriScores: nextScores,
      deductions: nextDeductions,
      timeRemaining: nextTime,
      timeActual: nextActual,
      isTimerRunning: false,
      timerStartedAt: 0,
      timerBaseRemaining: nextTime,
      timerBaseActual: nextActual,
      performerName: nextName,
      contingent: nextContingent,
      juriScoresBiru: corner === "biru" ? juriScoresBiru : (activeCorner === "biru" ? juriScores : juriScoresBiru),
      juriScoresMerah: corner === "merah" ? juriScoresMerah : (activeCorner === "merah" ? juriScores : juriScoresMerah),
      deductionsBiru: corner === "biru" ? deductionsBiru : (activeCorner === "biru" ? deductions : deductionsBiru),
      deductionsMerah: corner === "merah" ? deductionsMerah : (activeCorner === "merah" ? deductions : deductionsMerah),
      timeRemainingBiru: corner === "biru" ? timeRemainingBiru : (activeCorner === "biru" ? timeRemaining : timeRemainingBiru),
      timeRemainingMerah: corner === "merah" ? timeRemainingMerah : (activeCorner === "merah" ? timeRemaining : timeRemainingMerah),
      timeActualBiru: corner === "biru" ? timeActualBiru : (activeCorner === "biru" ? timeActual : timeActualBiru),
      timeActualMerah: corner === "merah" ? timeActualMerah : (activeCorner === "merah" ? timeActual : timeActualMerah)
    });
  };

  // 1. LANDING PAGE MODE (Matches Landingpage.JPG perfectly with Arena LED Modern theme)
  if (role === null) {
    return (
      <div 
        id="seni-portal-root" 
        className="min-h-screen bg-[#040813] text-white flex flex-col justify-between items-center p-6 md:p-10 font-sans select-none relative overflow-hidden"
      >
        {/* Deep immersive arena lighting & stadium glow gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(6,182,212,0.15)_0%,transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_75%,rgba(29,78,216,0.12)_0%,transparent_45%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_80%,rgba(220,38,38,0.08)_0%,transparent_45%)] pointer-events-none" />

        {/* TOP ACTION BAR */}
        <div className="w-full flex justify-end items-center z-10">
          <button
            id="seni-main-fullscreen"
            onClick={toggleFullScreen}
            className="w-10 h-10 rounded-full border border-[#1a2c4a] hover:border-cyan-400 bg-[#08152c]/90 hover:bg-[#0f244a] text-cyan-300 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            title="Toggle Layar Penuh"
          >
            {isFs ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>

        {/* LOGO & TITLE SECTION */}
        <div className="text-center mt-4 max-w-4xl z-10 flex flex-col items-center">
          {/* Main Logo from public folder */}
          <div className="w-48 h-28 flex items-center justify-center relative mb-2">
            <img 
              src="/jrzscoreutama.png" 
              alt="JRZ Score Utama" 
              className="max-h-full object-contain drop-shadow-[0_0_25px_rgba(6,182,212,0.45)]"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-[0.16em] text-white uppercase select-none font-sans leading-none drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            PENCAK SILAT
          </h1>

          <div className="text-xs md:text-sm font-extrabold tracking-wider text-cyan-400 mt-4 uppercase font-sans flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <span>PLATFORM DIGITAL SKORING PENCAK SILAT KATEGORI JURUS</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>
          
          <div className="text-[10px] md:text-xs text-zinc-400 font-mono tracking-widest mt-2 uppercase">
            DENGAN SINKRONISASI INSTAN MULTI LAYAR SECARA ONLINE MAUPUN OFFLINE
          </div>
        </div>

        {/* FOUR MASSIVE MENU CARDS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mt-10 mb-8 px-4 z-10">
          
          {/* CARD 1: SEKRETARIS */}
          <button
            id="seni-card-sekretaris"
            onClick={() => { setRole("sekretaris"); playSoundByKey("short_beep"); }}
            className="group relative flex flex-col items-center justify-center bg-gradient-to-b from-[#08152c]/90 via-[#060e1d]/90 to-[#030712] hover:from-[#0d2247] hover:to-[#050e1e] backdrop-blur-md border border-[#162540] hover:border-cyan-400 rounded-2xl p-6 transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_40px_rgba(6,182,212,0.35)] cursor-pointer focus:outline-none min-h-[250px]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.04] to-transparent pointer-events-none rounded-2xl" />
            <img 
              src="/Iconsekretaris.png" 
              alt="SEKRETARIS" 
              className="w-44 h-44 object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              referrerPolicy="no-referrer"
            />
          </button>

          {/* CARD 2: DEWAN */}
          <button
            id="seni-card-dewan"
            onClick={() => { setRole("dewan"); playSoundByKey("short_beep"); }}
            className="group relative flex flex-col items-center justify-center bg-gradient-to-b from-[#08152c]/90 via-[#060e1d]/90 to-[#030712] hover:from-[#0d2247] hover:to-[#050e1e] backdrop-blur-md border border-[#162540] hover:border-yellow-400 rounded-2xl p-6 transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_40px_rgba(234,179,8,0.35)] cursor-pointer focus:outline-none min-h-[250px]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.04] to-transparent pointer-events-none rounded-2xl" />
            <img 
              src="/ketuadewan.png" 
              alt="DEWAN" 
              className="w-44 h-44 object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]"
              referrerPolicy="no-referrer"
            />
          </button>

          {/* CARD 3: JURI */}
          <button
            id="seni-card-juri"
            onClick={() => { setRole("juri"); playSoundByKey("short_beep"); }}
            className="group relative flex flex-col items-center justify-center bg-gradient-to-b from-[#08152c]/90 via-[#060e1d]/90 to-[#030712] hover:from-[#0d2247] hover:to-[#050e1e] backdrop-blur-md border border-[#162540] hover:border-blue-400 rounded-2xl p-6 transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_40px_rgba(59,130,246,0.35)] cursor-pointer focus:outline-none min-h-[250px]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.04] to-transparent pointer-events-none rounded-2xl" />
            <img 
              src="/juri.png" 
              alt="JURI" 
              className="w-44 h-44 object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              referrerPolicy="no-referrer"
            />
          </button>

          {/* CARD 4: MONITOR */}
          <button
            id="seni-card-monitor"
            onClick={() => { setRole("monitor"); playSoundByKey("short_beep"); }}
            className="group relative flex flex-col items-center justify-center bg-gradient-to-b from-[#08152c]/90 via-[#060e1d]/90 to-[#030712] hover:from-[#0d2247] hover:to-[#050e1e] backdrop-blur-md border border-[#162540] hover:border-emerald-400 rounded-2xl p-6 transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_0_40px_rgba(16,185,129,0.35)] cursor-pointer focus:outline-none min-h-[250px]"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.04] to-transparent pointer-events-none rounded-2xl" />
            <img 
              src="/iconmonitor.png" 
              alt="MONITOR" 
              className="w-44 h-44 object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              referrerPolicy="no-referrer"
            />
          </button>

        </div>

        {/* FOOTER */}
        <div className="text-[10px] text-zinc-500 font-mono tracking-widest mt-6 z-10">
          Developed by : <strong className="text-zinc-400">Jaka Oktorian</strong>
        </div>
      </div>
    );
  }

  // Common Back Action inside subviews
  const backToSeniMenuBtn = (
    <button
      onClick={() => { setRole(null); playSoundByKey("short_beep"); }}
      className="flex items-center gap-2 border border-[#1a2c4a] hover:border-cyan-400 bg-[#08152c] hover:bg-[#0f244a] text-cyan-300 hover:text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all hover:scale-103 active:scale-97 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
    >
      <ArrowLeft size={14} /> Kembali ke Menu Seni
    </button>
  );

  // ATHLETE LOADER DIALOG (Arena LED Modern Modal)
  const renderAthleteLoader = showAthleteLoader && (
    <div className="fixed inset-0 bg-[#020612]/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-gradient-to-b from-[#09152b] via-[#050b16] to-[#02050e] border-2 border-cyan-500/50 p-6 rounded-3xl max-w-lg w-full text-left shadow-[0_0_60px_rgba(6,182,212,0.3)] relative animate-fade-in">
        <h3 className="text-lg font-black tracking-widest text-white uppercase mb-1 flex items-center gap-2">
          <UserPlus size={18} className="text-cyan-400" />
          <span>Cari Atlit Terdaftar</span>
        </h3>
        <p className="text-xs text-zinc-400 mb-4">Pilih atlit dari basis data pendaftaran turnamen saat ini.</p>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent">
          {poolAthletes.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs font-mono">
              Belum ada atlit yang terdaftar dalam Pendaftaran. Silakan tambahkan di menu Pendaftaran terlebih dahulu.
            </div>
          ) : (
            poolAthletes.map(ath => (
              <button
                key={ath.id}
                onClick={() => handleLoadAthlete(ath)}
                className="w-full text-left bg-[#070e1c] hover:bg-[#0c1930] p-3.5 rounded-2xl border border-[#162540] hover:border-cyan-400 transition-all flex justify-between items-center group shadow-md"
              >
                <div>
                  <div className="font-extrabold text-sm text-zinc-100 group-hover:text-cyan-300 transition-colors">{ath.name.toUpperCase()}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">{ath.contingent.toUpperCase()} • {ath.kelas}</div>
                </div>
                <span className="text-[10px] bg-[#0c1e3a] text-cyan-300 font-bold px-3 py-1 rounded-full uppercase border border-cyan-800/60">{ath.usia}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => setShowAthleteLoader(false)}
            className="px-5 py-2.5 bg-[#09152b] hover:bg-[#0f244a] border border-[#1c3052] hover:border-cyan-400 text-zinc-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );

  // 2. ROLE: SEKRETARIS VIEW (Controls performers, timers, starts scoring rounds)
  if (role === "sekretaris") {
    // Determine calculated scores for display
    const finalScoreBiru = getCalculatedScoreForCorner("biru");
    const finalScoreMerah = getCalculatedScoreForCorner("merah");

    return (
      <div className="min-h-screen bg-[#040813] text-white flex flex-col font-sans select-none relative pb-6">
        
        {/* HOVER-TRIGGERED TOP-RIGHT CONTROLS (Hanya muncul saat mouse diarahkan ke sudut kanan atas) */}
        <div className="fixed top-0 right-0 z-50 p-2 sm:p-3 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-auto">
          <div className="bg-[#070e1c]/95 border-2 border-[#1c3258] backdrop-blur-md rounded-2xl p-1.5 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex items-center gap-2">
            <button
              id="btn-sekretaris-back"
              onClick={() => { setRole(null); playSoundByKey("short_beep"); }}
              className="bg-[#0b172a] hover:bg-[#162a4a] text-cyan-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-cyan-500/40 hover:border-cyan-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Kembali ke Menu Utama"
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </button>
            <button
              id="btn-sekretaris-fullscreen"
              onClick={toggleFullScreen}
              className="bg-[#0b172a] hover:bg-[#162a4a] text-amber-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-amber-500/40 hover:border-amber-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Toggle Full Screen"
            >
              {isFs ? <Minimize size={14} /> : <Maximize size={14} />}
              <span>{isFs ? "Normal" : "Full Screen"}</span>
            </button>
          </div>
        </div>

        {/* EVENT BANNER HEADER */}
        <header className="border-b border-[#142033] bg-[#070e1c] px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 z-10 shadow-lg">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div>
              <h1 className="font-black text-xs md:text-sm tracking-widest text-white uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <span>PANEL SEKRETARIS & ENGINE KONTROL</span>
              </h1>
              <p className="text-[10px] text-cyan-300/80 font-mono mt-0.5">
                {namaEvent} • {tempatPelaksanaan}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden lg:block">
              <span className="text-[9px] font-mono font-bold text-emerald-400 block tracking-widest">MASTER PANEL ACTIVE</span>
              <span className="text-[10px] text-zinc-400 font-mono">ROLE: SEKRETARIS PERTANDINGAN</span>
            </div>
            <div className="flex items-center gap-2 bg-[#041d14] border border-emerald-500/50 px-3 py-1.5 rounded-lg text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">ONLINE</span>
            </div>
          </div>
        </header>

        {/* MAIN CONTAINER */}
        <main className="max-w-[1400px] mx-auto w-full px-3 mt-2 grid grid-cols-1 lg:grid-cols-12 gap-2.5 z-10 flex-1">
          
          {/* LEFT SIDE: MATCH SPECIFICS & ATHLETES (col-span-7) */}
          <div className="lg:col-span-7 space-y-2">
            
            {/* PARAMETER PERTANDINGAN CARD */}
            <div className="bg-[#070e1c] border border-[#162540] p-3 rounded-xl space-y-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              
              {/* CARD HEADER */}
              <div className="flex items-center gap-2 border-b border-[#142033] pb-1.5">
                <Settings size={14} className="text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Parameter Pertandingan
                </span>
              </div>

              {/* ROW 1: NAMA EVENT KEJUARAAN */}
              <div className="space-y-0.5">
                <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                  NAMA EVENT KEJUARAAN
                </label>
                <input
                  type="text"
                  value={namaEvent}
                  onChange={(e) => saveSharedState({ namaEvent: e.target.value.toUpperCase() })}
                  className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2.5 py-1 text-[11px] font-black text-white focus:outline-none focus:border-cyan-400 uppercase tracking-wide"
                  placeholder="NAMA EVENT KEJUARAAN"
                />
              </div>

              {/* ROW 2: TEMPAT PELAKSANAAN & WAKTU PELAKSANAAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    TEMPAT PELAKSANAAN
                  </label>
                  <input
                    type="text"
                    value={tempatPelaksanaan}
                    onChange={(e) => saveSharedState({ tempatPelaksanaan: e.target.value })}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2.5 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400"
                    placeholder="Tempat Pelaksanaan"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    WAKTU PELAKSANAAN
                  </label>
                  <input
                    type="text"
                    value={waktuPelaksanaan}
                    onChange={(e) => saveSharedState({ waktuPelaksanaan: e.target.value })}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2.5 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400"
                    placeholder="Waktu / Tanggal Pelaksanaan"
                  />
                </div>
              </div>

              {/* ROW 3: LOGO SISI KIRI & LOGO SISI KANAN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* LOGO SISI KIRI */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    LOGO SISI KIRI (MONITOR)
                  </label>
                  <div className="bg-[#050b16] border border-[#1a2d4c] rounded-lg p-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded bg-[#030712] border border-[#142033] flex items-center justify-center shrink-0 overflow-hidden">
                        {logoKiri ? (
                          <img src={logoKiri} alt="Logo Kiri" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-zinc-600 text-[10px] font-mono">🔒</span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-400 truncate">
                        {logoKiri ? "Logo Terpasang" : "Default IPSI"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="bg-[#0c1e3a] hover:bg-[#122b52] border border-cyan-700/60 text-cyan-200 text-[9px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 shrink-0 transition-all">
                        <span>↑ Upload Logo Kiri</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const res = evt.target?.result as string;
                                setLogoKiri(res);
                                localStorage.setItem("logo_kiri", res);
                                saveSharedState({ logoKiri: res });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {logoKiri && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoKiri("");
                            localStorage.removeItem("logo_kiri");
                            saveSharedState({ logoKiri: "" });
                          }}
                          className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-[9px] px-1.5 py-0.5 rounded font-mono"
                          title="Hapus Logo Kiri"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* LOGO SISI KANAN */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    LOGO SISI KANAN (MONITOR)
                  </label>
                  <div className="bg-[#050b16] border border-[#1a2d4c] rounded-lg p-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-7 h-7 rounded bg-[#030712] border border-[#142033] flex items-center justify-center shrink-0 overflow-hidden">
                        {logoKanan ? (
                          <img src={logoKanan} alt="Logo Kanan" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-zinc-600 text-[10px] font-mono">🔒</span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-400 truncate">
                        {logoKanan ? "Logo Terpasang" : "Default IPSI"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <label className="bg-[#0c1e3a] hover:bg-[#122b52] border border-cyan-700/60 text-cyan-200 text-[9px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 shrink-0 transition-all">
                        <span>↑ Upload Logo Kanan</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                const res = evt.target?.result as string;
                                setLogoKanan(res);
                                localStorage.setItem("logo_kanan", res);
                                saveSharedState({ logoKanan: res });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {logoKanan && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoKanan("");
                            localStorage.removeItem("logo_kanan");
                            saveSharedState({ logoKanan: "" });
                          }}
                          className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-[9px] px-1.5 py-0.5 rounded font-mono"
                          title="Hapus Logo Kanan"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ROW 4: PARTAI TANDING (#), TAHAP PERTANDINGAN, KATEGORI JURUS, KATEGORI USIA */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* PARTAI TANDING (#) */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    PARTAI TANDING (#)
                  </label>
                  <input
                    type="text"
                    value={partaiTanding}
                    onChange={(e) => saveSharedState({ partaiTanding: e.target.value })}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2.5 py-1 text-[11px] font-black text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                {/* TAHAP PERTANDINGAN */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    TAHAP PERTANDINGAN
                  </label>
                  <select
                    value={tahapPertandingan}
                    onChange={(e) => saveSharedState({ tahapPertandingan: e.target.value.toUpperCase() })}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="PENYISIHAN">PENYISIHAN</option>
                    <option value="PEREMPAT FINAL">PEREMPAT FINAL</option>
                    <option value="SEMI FINAL">SEMI FINAL</option>
                    <option value="FINAL">FINAL</option>
                  </select>
                </div>

                {/* KATEGORI JURUS */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    KATEGORI JURUS
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const isGanda = cat === "ganda";
                      const isSoloBebas = cat === "solo_kreatif";
                      const initialKebenaran = (isGanda || isSoloBebas) ? 0 : 9.90;
                      const initialKemantapan = 0.00;
                      const initialKeserasian = 0.00;
                      const initialPenjiwaan = 0.00;
                      const resetScores = juriScores.map(js => ({
                        ...js,
                        kebenaran: initialKebenaran,
                        kemantapan: initialKemantapan,
                        keserasian: initialKeserasian,
                        penjiwaan: initialPenjiwaan,
                        wrongMoves: 0,
                        flowScore: 0.00,
                        submitted: false
                      }));
                      setSelectedCategory(cat);
                      setJuriScores(resetScores);
                      setJuriScoresBiru(resetScores);
                      setJuriScoresMerah(resetScores);
                      saveSharedState({
                        selectedCategory: cat,
                        juriScores: resetScores,
                        juriScoresBiru: resetScores,
                        juriScoresMerah: resetScores
                      });
                    }}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* KATEGORI USIA */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    KATEGORI USIA
                  </label>
                  <select
                    value={selectedAge}
                    onChange={(e) => saveSharedState({ selectedAge: e.target.value })}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400"
                  >
                    {ageGroups.map(ag => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ROW 5: GENDER (KATEGORI) & DURASI TAMPIL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* GENDER */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    GENDER (KATEGORI)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => saveSharedState({ gender: "PUTRA" })}
                      className={`py-1 text-[11px] font-black rounded-lg border transition-all cursor-pointer ${
                        gender === "PUTRA"
                          ? "bg-[#0284c7] border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                          : "bg-[#050b16] border-[#142033] text-zinc-400 hover:text-white"
                      }`}
                    >
                      PUTRA
                    </button>
                    <button
                      onClick={() => saveSharedState({ gender: "PUTRI" })}
                      className={`py-1 text-[11px] font-black rounded-lg border transition-all cursor-pointer ${
                        gender === "PUTRI"
                          ? "bg-[#0284c7] border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                          : "bg-[#050b16] border-[#142033] text-zinc-400 hover:text-white"
                      }`}
                    >
                      PUTRI
                    </button>
                  </div>
                </div>

                {/* DURASI TAMPIL */}
                <div className="space-y-0.5">
                  <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold tracking-wider">
                    DURASI TAMPIL
                  </label>
                  <select
                    value={durasiTampil}
                    onChange={(e) => {
                      const dur = e.target.value;
                      saveSharedState({ 
                        durasiTampil: dur,
                        timeRemaining: 0
                      });
                    }}
                    className="w-full bg-[#050b16] border border-[#1a2d4c] rounded-lg px-2.5 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="03:00">03.00 Menit</option>
                    <option value="02:00">02.00 Menit</option>
                    <option value="01:30">01.30 Menit</option>
                    <option value="01:00">01.00 Menit</option>
                  </select>
                </div>
              </div>

              {/* DUAL PERFORMERS BOXES (SUDUT BIRU & SUDUT MERAH) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                {/* SUDUT BIRU BOX */}
                <div className="bg-[#051329] border border-blue-600/50 p-2.5 rounded-lg space-y-1.5 relative shadow-[0_0_15px_rgba(37,99,235,0.15)]">
                  <div className="text-[9px] font-mono font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    SUDUT BIRU
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold">NAMA ATLIT</label>
                    <input
                      type="text"
                      value={namaAtlitBiru}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setNamaAtlitBiru(val);
                        if (activeCorner === "biru") {
                          saveSharedState({ namaAtlitBiru: val, performerName: val });
                        } else {
                          saveSharedState({ namaAtlitBiru: val });
                        }
                      }}
                      className="w-full bg-[#030917] border border-blue-900/60 rounded-lg px-2.5 py-1 text-[11px] font-black text-white focus:outline-none focus:border-blue-400 uppercase tracking-wide"
                      placeholder="NAMA ATLIT BIRU"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold">KONTINGEN</label>
                    <input
                      type="text"
                      value={kontingenBiru}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setKontingenBiru(val);
                        if (activeCorner === "biru") {
                          saveSharedState({ kontingenBiru: val, contingent: val });
                        } else {
                          saveSharedState({ kontingenBiru: val });
                        }
                      }}
                      className="w-full bg-[#030917] border border-blue-900/60 rounded-lg px-2.5 py-1 text-[11px] font-black text-white focus:outline-none focus:border-blue-400 uppercase tracking-wide"
                      placeholder="KONTINGEN BIRU"
                    />
                  </div>
                </div>

                {/* SUDUT MERAH BOX */}
                <div className="bg-[#24080e] border border-red-600/50 p-2.5 rounded-lg space-y-1.5 relative shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                  <div className="text-[9px] font-mono font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    SUDUT MERAH
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold">NAMA ATLIT</label>
                    <input
                      type="text"
                      value={namaAtlitMerah}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setNamaAtlitMerah(val);
                        if (activeCorner === "merah") {
                          saveSharedState({ namaAtlitMerah: val, performerName: val });
                        } else {
                          saveSharedState({ namaAtlitMerah: val });
                        }
                      }}
                      className="w-full bg-[#140407] border border-red-900/60 rounded-lg px-2.5 py-1 text-[11px] font-black text-white focus:outline-none focus:border-red-400 uppercase tracking-wide"
                      placeholder="NAMA ATLIT MERAH"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] text-zinc-400 font-mono uppercase font-bold">KONTINGEN</label>
                    <input
                      type="text"
                      value={kontingenMerah}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setKontingenMerah(val);
                        if (activeCorner === "merah") {
                          saveSharedState({ kontingenMerah: val, contingent: val });
                        } else {
                          saveSharedState({ kontingenMerah: val });
                        }
                      }}
                      className="w-full bg-[#140407] border border-red-900/60 rounded-lg px-2.5 py-1 text-[11px] font-black text-white focus:outline-none focus:border-red-400 uppercase tracking-wide"
                      placeholder="KONTINGEN MERAH"
                    />
                  </div>
                </div>
              </div>

              {/* BUTTON 1: CEK PARTAI SELANJUTNYA */}
              <div className="pt-1 space-y-1.5">
                <button
                  onClick={() => {
                    playSoundByKey("short_beep");
                    const activeIdx = partaiList.findIndex(p => p.partai === partaiTanding);
                    if (activeIdx !== -1 && activeIdx < partaiList.length - 1) {
                      const nextM = partaiList[activeIdx + 1];
                      alert(`Partai selanjutnya (${nextM.partai}): ${nextM.biru.name} vs ${nextM.merah.name}`);
                    } else {
                      alert("Belum ada partai selanjutnya yang dijadwalkan.");
                    }
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-[11px] uppercase py-2 rounded-lg tracking-wider shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📄</span>
                  <span>CEK PARTAI SELANJUTNYA</span>
                </button>

                {/* BUTTONS 2 & 3: PREV MATCH & NEXT MATCH */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      playSoundByKey("short_beep");
                      const currentIdx = partaiList.findIndex(p => p.partai === partaiTanding);
                      if (currentIdx > 0) {
                        const prevM = partaiList[currentIdx - 1];
                        const isGanda = prevM.kategori === "ganda";
                        const initKebenaran = isGanda ? 0 : (prevM.kategori === "solo_kreatif" ? 5.50 : 9.90);
                        const initKemantapan = isGanda ? 0 : 5.50;
                        const initKeserasian = isGanda ? 0 : 5.50;
                        const initPenjiwaan = isGanda ? 0 : 5.50;
                        const freshScores = juriScores.map(js => ({
                          ...js,
                          kebenaran: initKebenaran,
                          kemantapan: initKemantapan,
                          keserasian: initKeserasian,
                          penjiwaan: initPenjiwaan,
                          wrongMoves: 0,
                          flowScore: 0.00,
                          submitted: false
                        }));
                        saveSharedState({
                          partaiTanding: prevM.partai,
                          selectedCategory: prevM.kategori,
                          selectedAge: prevM.usia,
                          gender: prevM.gender,
                          tahapPertandingan: prevM.tahap,
                          namaAtlitBiru: prevM.biru.name,
                          kontingenBiru: prevM.biru.contingent,
                          namaAtlitMerah: prevM.merah.name,
                          kontingenMerah: prevM.merah.contingent,
                          performerName: activeCorner === "biru" ? prevM.biru.name : prevM.merah.name,
                          contingent: activeCorner === "biru" ? prevM.biru.contingent : prevM.merah.contingent,
                          juriScores: freshScores,
                          juriScoresBiru: freshScores,
                          juriScoresMerah: freshScores,
                          timeRemaining: 0,
                          timeActual: 0,
                          isTimerRunning: false
                        });
                        setNamaAtlitBiru(prevM.biru.name);
                        setKontingenBiru(prevM.biru.contingent);
                        setNamaAtlitMerah(prevM.merah.name);
                        setKontingenMerah(prevM.merah.contingent);
                      }
                    }}
                    className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-extrabold text-[11px] uppercase py-2 rounded-lg tracking-wider transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-orange-950/40"
                  >
                    <span>‹ PREV MATCH</span>
                  </button>

                  <button
                    onClick={() => {
                      playSoundByKey("short_beep");
                      const currentIdx = partaiList.findIndex(p => p.partai === partaiTanding);
                      if (currentIdx !== -1 && currentIdx < partaiList.length - 1) {
                        const nextM = partaiList[currentIdx + 1];
                        const isGanda = nextM.kategori === "ganda";
                        const initKebenaran = isGanda ? 0 : (nextM.kategori === "solo_kreatif" ? 5.50 : 9.90);
                        const initKemantapan = isGanda ? 0 : 5.50;
                        const initKeserasian = isGanda ? 0 : 5.50;
                        const initPenjiwaan = isGanda ? 0 : 5.50;
                        const freshScores = juriScores.map(js => ({
                          ...js,
                          kebenaran: initKebenaran,
                          kemantapan: initKemantapan,
                          keserasian: initKeserasian,
                          penjiwaan: initPenjiwaan,
                          wrongMoves: 0,
                          flowScore: 0.00,
                          submitted: false
                        }));
                        saveSharedState({
                          partaiTanding: nextM.partai,
                          selectedCategory: nextM.kategori,
                          selectedAge: nextM.usia,
                          gender: nextM.gender,
                          tahapPertandingan: nextM.tahap,
                          namaAtlitBiru: nextM.biru.name,
                          kontingenBiru: nextM.biru.contingent,
                          namaAtlitMerah: nextM.merah.name,
                          kontingenMerah: nextM.merah.contingent,
                          performerName: activeCorner === "biru" ? nextM.biru.name : nextM.merah.name,
                          contingent: activeCorner === "biru" ? nextM.biru.contingent : nextM.merah.contingent,
                          juriScores: freshScores,
                          juriScoresBiru: freshScores,
                          juriScoresMerah: freshScores,
                          timeRemaining: 0,
                          timeActual: 0,
                          isTimerRunning: false
                        });
                        setNamaAtlitBiru(nextM.biru.name);
                        setKontingenBiru(nextM.biru.contingent);
                        setNamaAtlitMerah(nextM.merah.name);
                        setKontingenMerah(nextM.merah.contingent);
                      }
                    }}
                    className="bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-[11px] uppercase py-2 rounded-lg tracking-wider transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-emerald-950/40"
                  >
                    <span>NEXT MATCH ›</span>
                  </button>
                </div>
              </div>

            </div>

            {/* REGISTRASI & PENJADWALAN DATA BOX */}
            <div className="bg-gradient-to-br from-[#09152b] via-[#060e1d] to-[#030712] border border-cyan-800/60 hover:border-cyan-500/80 p-3 rounded-2xl space-y-2.5 shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-all group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#0c1e3a] border border-cyan-600/60 flex items-center justify-center text-cyan-300 shadow-inner group-hover:scale-105 transition-transform">
                    <UserPlus size={16} className="text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>REGISTRASI DATA TURNAMEN</span>
                      <Sparkles size={11} className="text-cyan-400" />
                    </h4>
                    <p className="text-[9px] text-cyan-300/70 font-mono tracking-tight mt-0.5">
                      ROSTER • BAGAN PERTANDINGAN • KONTROL JADWAL
                    </p>
                  </div>
                </div>
                <span className="bg-[#0c1e3a] text-cyan-200 border border-cyan-600/60 font-mono text-[9px] font-bold px-2 py-0.5 rounded-md">
                  {poolAthletes.length} Atlet
                </span>
              </div>

              {/* Mini Features Pills */}
              <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-center">
                <div className="bg-[#050b16] border border-[#162540] px-1.5 py-1 rounded-lg">
                  <span className="text-[8px] font-mono text-zinc-400 block uppercase">1. Database</span>
                  <span className="text-[10px] font-black text-cyan-300">{poolAthletes.length} Terdaftar</span>
                </div>
                <div className="bg-[#050b16] border border-[#162540] px-1.5 py-1 rounded-lg">
                  <span className="text-[8px] font-mono text-zinc-400 block uppercase">2. Bagan</span>
                  <span className="text-[10px] font-black text-amber-300">3 Format</span>
                </div>
                <div className="bg-[#050b16] border border-[#162540] px-1.5 py-1 rounded-lg">
                  <span className="text-[8px] font-mono text-zinc-400 block uppercase">3. Partai</span>
                  <span className="text-[10px] font-black text-emerald-300">{partaiList.filter(p => p.checked).length} Aktif</span>
                </div>
              </div>

              <button
                onClick={() => {
                  playSoundByKey("short_beep");
                  setRegistrasiActiveTab("input");
                  setShowRegistrasiOverlay(true);
                }}
                className="w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-700 hover:from-cyan-500 hover:via-blue-500 hover:to-cyan-600 text-white font-black text-[11px] uppercase py-2.5 rounded-xl tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/60 active:scale-98 border border-cyan-400/30 hover:border-cyan-300/60"
              >
                <UserPlus size={14} className="text-cyan-200" />
                <span>BUKA MENU REGISTRASI DATA & BAGAN</span>
                <ChevronRight size={13} className="text-cyan-300" />
              </button>
            </div>

          </div>

          {/* RIGHT SIDE: MAIN CONTROLS & TIMERS (col-span-5) */}
          <div className="lg:col-span-5 space-y-2">
            {/* KONTROL UTAMA JALANNYA TANDING */}
            <div className="bg-[#070e1c] border border-[#162540] p-3 rounded-xl space-y-2.5 shadow-[0_0_25px_rgba(6,182,212,0.1)]">
              {/* Header Title with Icon */}
              <div className="flex items-center justify-center gap-2 border-b border-[#142033] pb-1.5">
                <Clock size={14} className="text-cyan-400" />
                <span className="text-[11px] font-black text-cyan-300 font-sans tracking-widest uppercase text-center">
                  KONTROL UTAMA JALANNYA TANDING
                </span>
              </div>

              {/* Row 1: Panel Juri & Dewan Lock Status */}
              <div className="bg-[#040813] px-3 py-1.5 rounded-lg border border-[#142033] flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[8px] text-zinc-400 font-mono tracking-widest uppercase font-bold">
                    STATUS LAGA:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${isMatchUnlocked ? "bg-[#10b981] animate-ping" : "bg-[#f59e0b]"}`} />
                    <span className={`text-[11px] font-black font-mono uppercase tracking-wide ${isMatchUnlocked ? "text-[#10b981]" : "text-[#f59e0b]"}`}>
                      {isMatchUnlocked ? "LAGA BERJALAN / AKTIF" : "LAGA DIKUNCI / JEDA"}
                    </span>
                  </div>
                </div>
                {isMatchUnlocked ? (
                  <span className="px-2 py-0.5 border border-emerald-500/40 rounded text-[8px] font-mono font-black text-emerald-400 bg-emerald-950/40 tracking-widest uppercase">
                    ACTIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 border border-amber-500/40 rounded text-[8px] font-mono font-black text-amber-400 bg-amber-950/40 tracking-widest uppercase">
                    LOCKED
                  </span>
                )}
              </div>

              {/* Row 2: MULAI (BUKA KUNCI) & RESET (RESET & KUNCI) */}
              <div className="grid grid-cols-2 gap-2">
                {/* MULAI (BUKA KUNCI) button */}
                <button
                  disabled={isMatchUnlocked}
                  onClick={() => {
                    if (isMatchUnlocked) return;
                    playSoundByKey("short_beep");
                    const updatedLogs = [
                      { time: formatTime(timeRemaining), msg: "Sekretaris: Membuka kunci panel Juri & Dewan", type: "system" as const },
                      ...logs
                    ];
                    saveSharedState({
                      isMatchUnlocked: true,
                      logs: updatedLogs
                    });
                  }}
                  className={`py-1.5 px-2.5 rounded-lg flex flex-col items-center justify-center transition-all duration-200 border ${
                    isMatchUnlocked
                      ? "bg-[#0284c7]/20 border-cyan-500/20 text-white/40 cursor-not-allowed opacity-60"
                      : "bg-[#0284c7] hover:bg-[#0369a1] border-cyan-400/60 text-white shadow-md shadow-cyan-900/40 active:scale-95 cursor-pointer"
                  }`}
                >
                  <span className="font-extrabold text-[11px] uppercase flex items-center gap-1 tracking-wider">
                    🚀 MULAI
                  </span>
                  <span className="text-[8px] opacity-80 uppercase font-mono tracking-wide">
                    (BUKA KUNCI)
                  </span>
                </button>

                {/* RESET (RESET & KUNCI) button */}
                <button
                  onClick={() => {
                    playSoundByKey("warning_beep");
                    const updatedLogs = [
                      { time: formatTime(timeRemaining), msg: "Sekretaris: Kunci panel Juri & Dewan (Reset Kunci)", type: "system" as const },
                      ...logs
                    ];
                    saveSharedState({
                      isMatchUnlocked: false,
                      logs: updatedLogs
                    });
                  }}
                  className="bg-[#24080e] hover:bg-[#380c16] border border-red-900/60 text-[#ff4d4d] py-1.5 px-2.5 rounded-lg flex flex-col items-center justify-center active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span className="font-extrabold text-[11px] uppercase flex items-center gap-1 tracking-wider">
                    🔴 RESET
                  </span>
                  <span className="text-[8px] text-red-400/80 uppercase font-mono tracking-wide">
                    (RESET & KUNCI)
                  </span>
                </button>
              </div>

              {/* Row 3: Timers Display Box */}
              <div className="bg-[#030712] border border-[#162540] p-2.5 rounded-lg shadow-inner">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                  {/* TIMER 1 */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[9px] text-[#ffea00]/90 font-mono font-bold tracking-widest uppercase">
                        TIMER 1
                      </span>
                      {isTimer1Running && <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-ping" />}
                    </div>
                    <span className="text-2xl md:text-3xl font-black font-mono tracking-widest text-[#ffea00] drop-shadow-[0_0_10px_rgba(255,234,0,0.5)] select-none">
                      {formatTime(timeRemaining)}
                    </span>
                  </div>

                  {/* Vertical yellow line divider */}
                  <div className="h-8 w-px bg-[#ffea00]/30 self-center" />

                  {/* TIMER 2 */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[9px] text-[#ffea00]/90 font-mono font-bold tracking-widest uppercase">
                        TIMER 2
                      </span>
                      {isTimer2Running && <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-ping" />}
                    </div>
                    <span className="text-2xl md:text-3xl font-black font-mono tracking-widest text-[#ffea00] drop-shadow-[0_0_10px_rgba(255,234,0,0.5)] select-none">
                      {formatTime(timeActual)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 4: Performer Timer Start/Stop (Play/Stop) & Reset Waktu */}
              <div className="grid grid-cols-2 gap-2">
                {!activeCorner ? (
                  <button
                    disabled
                    className="bg-[#050b16] border border-[#142033] text-zinc-500 rounded-lg py-1.5 px-2.5 flex items-center justify-center gap-1.5 text-[10px] uppercase font-mono font-bold opacity-60 cursor-not-allowed"
                  >
                    <Lock size={12} className="text-zinc-500" />
                    <span>SUDUT BELUM AKTIF</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const cornerName = activeCorner === "biru" ? "Sudut Biru" : "Sudut Merah";
                      if (isTimer2Running) {
                        playSoundByKey("short_beep");
                        const now = Date.now();
                        const elapsedSec2 = Math.floor(Math.max(0, now - timer2StartedAt) / 1000);
                        const finalActual = timer2BaseActual + elapsedSec2;
                        const updatedLogs = [
                          { time: formatTime(timeRemaining), msg: `Sekretaris: STOP Timer Penampil ${cornerName}`, type: "system" as const },
                          ...logs
                        ];
                        saveSharedState({
                          isTimer1Running: true,
                          isTimer2Running: false,
                          isTimerRunning: false,
                          timer2StartedAt: 0,
                          timer2BaseActual: finalActual,
                          timeActual: finalActual,
                          logs: updatedLogs
                        });
                      } else {
                        playSoundByKey("short_beep");
                        const now = Date.now();
                        const t1Started = isTimer1Running ? timer1StartedAt : now;
                        const t1Base = isTimer1Running ? timer1BaseRemaining : timeRemaining;
                        const updatedLogs = [
                          { time: formatTime(timeRemaining), msg: `Sekretaris: MULAI (PLAY) Pertandingan ${cornerName}`, type: "system" as const },
                          ...logs
                        ];
                        saveSharedState({
                          isTimer1Running: true,
                          isTimer2Running: true,
                          isTimerRunning: true,
                          timer1StartedAt: t1Started,
                          timer1BaseRemaining: t1Base,
                          timer2StartedAt: now,
                          timer2BaseActual: timeActual,
                          timeRemaining: timeRemaining,
                          timeActual: timeActual,
                          logs: updatedLogs
                        });
                      }
                    }}
                    title={isTimer2Running ? "Stop Timer Penampil" : "Mulai (Play) Timer Penampil"}
                    className={`rounded-lg py-1.5 px-2.5 flex items-center justify-center gap-1.5 text-[11px] uppercase font-mono font-black border transition-all duration-200 shadow-md active:scale-95 cursor-pointer ${
                      isTimer2Running
                        ? "bg-[#dc2626] hover:bg-[#b91c1c] border-red-400 text-white shadow-red-900/40 animate-pulse"
                        : "bg-[#059669] hover:bg-[#047857] border-emerald-400 text-white shadow-emerald-900/40"
                    }`}
                  >
                    {isTimer2Running ? (
                      <>
                        <Square size={13} className="fill-white" />
                        <span>STOP</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} className="fill-white" />
                        <span>MULAI (PLAY)</span>
                      </>
                    )}
                  </button>
                )}

                {/* Reset Waktu Button */}
                <button
                  onClick={() => {
                    playSoundByKey("warning_beep");
                    const updatedLogs = [
                      { time: "00:00", msg: "Seluruh waktu penampil (Timer 1 & Timer 2) direset ke 00:00 oleh Sekretaris", type: "system" as const },
                      ...logs
                    ];
                    saveSharedState({
                      isTimer1Running: false,
                      isTimer2Running: false,
                      isTimerRunning: false,
                      timeRemaining: 0,
                      timeActual: 0,
                      timer1StartedAt: 0,
                      timer1BaseRemaining: 0,
                      timer2StartedAt: 0,
                      timer2BaseActual: 0,
                      timeRemainingBiru: activeCorner === "biru" ? 0 : timeRemainingBiru,
                      timeActualBiru: activeCorner === "biru" ? 0 : timeActualBiru,
                      timeRemainingMerah: activeCorner === "merah" ? 0 : timeRemainingMerah,
                      timeActualMerah: activeCorner === "merah" ? 0 : timeActualMerah,
                      activeCorner: "",
                      logs: updatedLogs
                    });
                  }}
                  className="bg-[#050b16] hover:bg-[#0c182c] border border-[#162540] text-zinc-300 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  <RotateCcw size={12} className="text-cyan-400" />
                  RESET WAKTU
                </button>
              </div>

              {/* Row 5: AKTIFKAN BIRU & AKTIFKAN MERAH */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    activateCornerAndSync("biru");
                  }}
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all duration-200 active:scale-95 cursor-pointer ${
                    activeCorner === "biru"
                      ? "bg-[#155dfc] border-blue-400 text-white shadow-lg shadow-[#155dfc]/30 ring-2 ring-blue-400/40"
                      : "bg-[#050b16] border-[#142033] text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${activeCorner === "biru" ? "bg-white shadow-sm" : "bg-zinc-600"}`} />
                  AKTIFKAN BIRU
                </button>
                <button
                  onClick={() => {
                    activateCornerAndSync("merah");
                  }}
                  className={`py-1.5 px-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all duration-200 active:scale-95 cursor-pointer ${
                    activeCorner === "merah"
                      ? "bg-[#e7000b] border-red-400 text-white shadow-lg shadow-[#e7000b]/30 ring-2 ring-red-400/40"
                      : "bg-[#050b16] border-[#142033] text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${activeCorner === "merah" ? "bg-white shadow-sm" : "bg-zinc-600"}`} />
                  AKTIFKAN MERAH
                </button>
              </div>

              {/* Row 6: BELL / HORN Button */}
              <button
                onClick={() => {
                  playSoundByKey("buzzer");
                  const updatedLogs = [{ time: formatTime(timeRemaining), msg: "BELL / HORN dibunyikan oleh Sekretaris", type: "system" as const }, ...logs];
                  saveSharedState({ logs: updatedLogs });
                }}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-cyan-400/40"
              >
                <span>BELL / HORN</span>
                <span className="text-[8px] bg-[#0c1e3a] text-cyan-200 font-mono px-1.5 py-0.5 rounded border border-cyan-400/40 uppercase font-bold">
                  SHIFT
                </span>
              </button>

              {/* Row 7: JUMLAH JURI YANG AKAN DIGUNAKAN */}
              <div className="pt-0.5 space-y-1">
                <span className="text-[9px] text-zinc-400 font-mono font-bold tracking-wider uppercase text-center block">
                  JUMLAH JURI YANG AKAN DIGUNAKAN
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[4, 6, 8, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => saveSharedState({ judgesCount: num })}
                      className={`py-1 rounded-lg text-[10px] font-mono font-extrabold transition-all duration-200 cursor-pointer ${
                        judgesCount === num
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                          : "bg-[#050b16] hover:bg-[#0c182c] text-zinc-400 border border-[#162540]"
                      }`}
                    >
                      {num} Juri
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 8: UNDUH PDF (PARTAI SEDANG BERJALAN) */}
              <button
                onClick={() => {
                  playSoundByKey("success_chime");
                  setShowPrintScoresheet(true);
                }}
                className="w-full bg-[#050b16] hover:bg-[#0c182c] border border-[#162540] hover:border-cyan-500 text-zinc-200 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 shadow-sm"
              >
                <span className="text-red-400">📄</span>
                <span>UNDUH PDF (PARTAI SEDANG BERJALAN)</span>
              </button>
            </div>

            {/* PRINT & PREVIEW SCORE SHEET BUTTON */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  playSoundByKey("success_chime");
                  setShowPrintScoresheet(true);
                }}
                className="bg-[#050b16] hover:bg-[#0c182c] text-zinc-200 border border-[#162540] hover:border-cyan-500 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                📄 Lihat Score Sheet
              </button>

              <button
                onClick={handleArchiveMatch}
                className="bg-[#0c1e3a] hover:bg-[#122b52] text-cyan-200 border border-cyan-700/60 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              >
                📥 Arsipkan Partai
              </button>
            </div>

            {/* HISTORI HASIL TANDING & COMPLETED MATCHES ARCHIVE */}
            <div className="bg-[#070e1c] border border-[#162540] p-2.5 rounded-xl space-y-2 shadow-lg">
              <div className="flex justify-between items-center border-b border-[#142033] pb-1">
                <h4 className="text-[11px] font-mono font-black text-zinc-400 uppercase tracking-widest">HISTORI HASIL TANDING</h4>
                
                <div className="flex gap-1.5">
                  <button
                    onClick={() => alert("ZIP archive generated for completed matches in this session.")}
                    className="bg-[#050b16] hover:bg-[#0c182c] text-zinc-400 hover:text-white px-2 py-0.5 rounded text-[8px] font-mono border border-[#162540]"
                  >
                    ZIP ARSIP
                  </button>
                  <button
                    onClick={exportHistoryToExcel}
                    className="bg-[#041d14] text-emerald-400 hover:bg-[#072f21] px-2 py-1 rounded text-[9px] font-mono border border-emerald-600/60"
                  >
                    EXCEL EXPORT
                  </button>
                </div>
              </div>

              {/* Scrolling history list */}
              <div className="max-h-36 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-cyan-950 scrollbar-track-transparent">
                {matchHistory.length === 0 ? (
                  <div className="text-center py-6 text-[10px] font-mono text-zinc-600">
                    Belum ada partai tanding diarsipkan sesi ini.
                  </div>
                ) : (
                  matchHistory.map((item, idx) => (
                    <div key={item.id || idx} className="bg-[#050b16] p-2.5 rounded-lg border border-[#162540] flex flex-col gap-1 text-[10px] font-mono">
                      <div className="flex justify-between text-[9px] text-zinc-500">
                        <span>PARTAI {item.partai} • {item.kategori} • {item.tahap}</span>
                        <span className="text-cyan-400 font-bold">{item.usia}</span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span className={`font-bold ${item.winner === item.biruName ? "text-white" : "text-zinc-400"}`}>
                            {item.biruName} ({item.biruScore.toFixed(2)})
                          </span>
                        </div>
                        <span className="text-zinc-600 font-bold">vs</span>
                        <div className="flex items-center gap-1">
                          <span className={`font-bold ${item.winner === item.merahName ? "text-white" : "text-zinc-400"}`}>
                            {item.merahName} ({item.merahScore.toFixed(2)})
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        </div>
                      </div>

                      <div className="text-[9px] text-zinc-500 mt-1 flex justify-between border-t border-[#142033] pt-1">
                        <span>Pemenang: <strong className="text-emerald-400">{item.winner}</strong></span>
                        <button
                          onClick={() => {
                            if (confirm("Hapus rekam data histori ini?")) {
                              const updated = matchHistory.filter(mh => mh.id !== item.id);
                              saveSharedState({ matchHistory: updated });
                            }
                          }}
                          className="text-red-400 hover:text-red-300"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom buttons */}
              <div className="grid grid-cols-2 gap-3 border-t border-[#142033] pt-3">
                <button
                  onClick={() => alert("Statistik Pertandingan Sesi Seni TGR Aktif:\nTotal Atlet: 12\nPartai Selesai: " + matchHistory.length)}
                  className="bg-[#050b16] hover:bg-[#0c182c] text-cyan-400 text-[10px] font-mono font-bold py-2 rounded-lg border border-[#162540]"
                >
                  STATISTIK PERTANDINGAN
                </button>
                <button
                  onClick={() => alert("STATUS LISENSI:\nTGR Discors Platform - PROFESSIONAL LICENSE\nLicensed to: IPSI INDONESIA REKOR")}
                  className="bg-[#050b16] hover:bg-[#0c182c] text-cyan-400 text-[10px] font-mono font-bold py-2 rounded-lg border border-[#162540]"
                >
                  STATUS LISENSI
                </button>
              </div>

            </div>

          </div>

        </main>

        {/* ========================================================================= */}
        {/* INTERACTIVE OVERLAY MODAL: REGISTRASI DATA, BAGAN PERTANDINGAN, KONTROL PARTAI */}
        {/* ========================================================================= */}
        {showRegistrasiOverlay && (
          <div className="fixed inset-0 bg-[#040813]/98 backdrop-blur-2xl flex flex-col z-50 overflow-hidden text-white font-sans">
            <input
              type="file"
              ref={excelFileInputRef}
              onChange={importExcelData}
              accept=".csv,.xlsx,.xls"
              className="hidden"
            />
            
            {/* Top Navigation Bar / Tournament Header */}
            <header className="bg-gradient-to-r from-[#070e1c] via-[#091428] to-[#070e1c] border-b border-[#162540] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl shrink-0">
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => {
                    playSoundByKey("short_beep");
                    setShowRegistrasiOverlay(false);
                  }}
                  className="bg-[#0b172a] hover:bg-[#12233f] border border-[#1e2e48] text-cyan-300 w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 cursor-pointer shadow-md hover:border-cyan-400 group"
                  title="Kembali ke Layar Utama"
                >
                  <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 border border-cyan-400/40 flex items-center justify-center text-white shadow-lg shadow-cyan-950/60">
                    <Trophy size={20} className="text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-sm md:text-base font-black tracking-wider text-white uppercase leading-tight flex items-center gap-2">
                      <span>REGISTRASI DATA TURNAMEN</span>
                      <span className="bg-[#0b172a] text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-700/50">
                        OFFICIAL
                      </span>
                    </h3>
                    <p className="text-[10px] text-cyan-300/80 font-mono tracking-wider mt-0.5 uppercase">
                      MANAJEMEN DATABASE ATLET • BAGAN PERTANDINGAN • KONTROL JADWAL PARTAI
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Top Right */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={downloadExcelTemplate}
                  className="bg-[#07172e] hover:bg-[#0c2448] border border-cyan-500/50 hover:border-cyan-400 text-cyan-200 font-bold text-[11px] px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  <Download size={13} className="text-cyan-400" />
                  <span>TEMPLATE EXCEL</span>
                </button>
                <button
                  onClick={() => excelFileInputRef.current?.click()}
                  className="bg-[#091836] hover:bg-[#0e2554] border border-blue-500/50 hover:border-blue-400 text-blue-200 font-bold text-[11px] px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  <Upload size={13} className="text-blue-400" />
                  <span>IMPOR EXCEL</span>
                </button>
                <button
                  onClick={exportExcelData}
                  className="bg-[#06241a] hover:bg-[#0a3829] border border-emerald-500/50 hover:border-emerald-400 text-emerald-200 font-bold text-[11px] px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  <FileSpreadsheet size={13} className="text-emerald-400" />
                  <span>EKSPOR EXCEL</span>
                </button>
                <button
                  onClick={downloadPDF}
                  className="bg-[#091b3b] hover:bg-[#102d61] border border-sky-500/50 hover:border-sky-400 text-sky-200 font-bold text-[11px] px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  <Printer size={13} className="text-sky-300" />
                  <span>UNDUH PDF</span>
                </button>
                <button
                  onClick={() => {
                    playSoundByKey("short_beep");
                    setShowRegistrasiOverlay(false);
                  }}
                  className="bg-[#240a12] hover:bg-[#3d0f1f] border border-rose-900/60 hover:border-rose-500/60 text-rose-300 font-bold text-[11px] w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md"
                  title="Tutup Menu"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            {/* Overlay Navigation Tabs */}
            <nav className="flex bg-[#070e1c] border-b border-[#162540] px-5 py-2.5 gap-2.5 overflow-x-auto shrink-0 shadow-inner">
              <button
                onClick={() => { playSoundByKey("short_beep"); setRegistrasiActiveTab("input"); }}
                className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer border ${
                  registrasiActiveTab === "input"
                    ? "bg-gradient-to-r from-cyan-700 to-blue-700 text-white shadow-lg shadow-cyan-950 border-cyan-400/80"
                    : "bg-[#091122] text-zinc-400 hover:text-white hover:bg-[#0e1b36] border-[#142033]"
                }`}
              >
                <UserPlus size={14} className={registrasiActiveTab === "input" ? "text-amber-300" : "text-zinc-400"} />
                <span>1. INPUT DATA & ROSTER ATLIT</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                  registrasiActiveTab === "input" ? "bg-[#040813] text-cyan-200 border border-cyan-500/50" : "bg-[#040813]/60 text-zinc-400"
                }`}>
                  {poolAthletes.length}
                </span>
              </button>

              <button
                onClick={() => { playSoundByKey("short_beep"); setRegistrasiActiveTab("bagan"); }}
                className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer border ${
                  registrasiActiveTab === "bagan"
                    ? "bg-gradient-to-r from-cyan-700 to-blue-700 text-white shadow-lg shadow-cyan-950 border-cyan-400/80"
                    : "bg-[#091122] text-zinc-400 hover:text-white hover:bg-[#0e1b36] border-[#142033]"
                }`}
              >
                <Trophy size={14} className={registrasiActiveTab === "bagan" ? "text-amber-300" : "text-zinc-400"} />
                <span>2. BAGAN PERTANDINGAN (BRACKET HUB)</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                  registrasiActiveTab === "bagan" ? "bg-[#040813] text-cyan-200 border border-cyan-500/50" : "bg-[#040813]/60 text-zinc-400"
                }`}>
                  3 SISTEM
                </span>
              </button>

              <button
                onClick={() => { playSoundByKey("short_beep"); setRegistrasiActiveTab("partai"); }}
                className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer border ${
                  registrasiActiveTab === "partai"
                    ? "bg-gradient-to-r from-cyan-700 to-blue-700 text-white shadow-lg shadow-cyan-950 border-cyan-400/80"
                    : "bg-[#091122] text-zinc-400 hover:text-white hover:bg-[#0e1b36] border-[#142033]"
                }`}
              >
                <CheckSquare size={14} className={registrasiActiveTab === "partai" ? "text-emerald-400" : "text-zinc-400"} />
                <span>3. KONTROL JADWAL PARTAI</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                  registrasiActiveTab === "partai" ? "bg-[#040813] text-emerald-300 border border-emerald-500/50" : "bg-[#040813]/60 text-zinc-400"
                }`}>
                  {partaiList.filter(p => p.checked).length} Aktif
                </span>
              </button>
            </nav>

            {/* Overlay Active Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 bg-[#040813]">
              
              {/* 1. INPUT DATA TAB PANEL */}
              {registrasiActiveTab === "input" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1600px] mx-auto w-full">
                  
                  {/* Left Column: Form Registration (col-span-5) */}
                  <div className="lg:col-span-5 bg-gradient-to-b from-[#070e1c] to-[#040813] border border-[#162540] p-4 md:p-5 rounded-2xl space-y-4 shadow-2xl flex flex-col justify-between">
                    <div className="space-y-4">
                      
                      {/* Form Header Card */}
                      <div className="flex items-center justify-between border-b border-[#162540] pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#0b172a] border border-cyan-600/60 flex items-center justify-center text-cyan-300">
                            <UserPlus size={16} />
                          </div>
                          <div>
                            <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider">
                              {editingAthleteId ? "EDIT DATA ATLET" : "REGISTRASI ATLET BARU"}
                            </h3>
                            <p className="text-[9px] text-cyan-400/80 font-mono uppercase mt-0.5">
                              {editingAthleteId ? "PERBARUI PARAMETER DATA ATLET TERDAFTAR" : "ISI FORMULIR LENGKAP UNTUK MENDAFTARKAN ATLET"}
                            </p>
                          </div>
                        </div>
                        {editingAthleteId && (
                          <span className="bg-amber-950/80 border border-amber-500 text-amber-300 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full">
                            MODE EDIT
                          </span>
                        )}
                      </div>

                      <form onSubmit={handleSaveAthlete} className="space-y-3.5">
                        
                        {/* Nama Lengkap Atlet */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-cyan-200 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <User size={12} className="text-cyan-400" />
                            <span>NAMA LENGKAP ATLET</span>
                            <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={formName}
                            onChange={(e) => setFormName(e.target.value.toUpperCase())}
                            placeholder="CTH: I GEDE PUTRA PRATAMA"
                            className="w-full bg-[#081020] border border-[#162540] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white uppercase tracking-wide placeholder:text-zinc-600 transition-all outline-none"
                          />
                        </div>

                        {/* Daerah / Kontingen */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-cyan-200 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <MapPin size={12} className="text-cyan-400" />
                            <span>DAERAH / KONTINGEN / PERGURUAN</span>
                            <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={formContingent}
                            onChange={(e) => setFormContingent(e.target.value.toUpperCase())}
                            placeholder="CTH: BALI - KONTINGEN DENPASAR"
                            className="w-full bg-[#081020] border border-[#162540] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white uppercase tracking-wide placeholder:text-zinc-600 transition-all outline-none"
                          />
                        </div>

                        {/* Gelanggang & Tahap */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-cyan-200 font-mono font-bold uppercase tracking-wider">
                              GELANGGANG
                            </label>
                            <select
                              value={formGelanggang}
                              onChange={(e) => setFormGelanggang(e.target.value)}
                              className="w-full bg-[#081020] border border-[#162540] focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs font-bold text-white cursor-pointer outline-none transition-all"
                            >
                              <option value="GELANGGANG 1">GELANGGANG 1</option>
                              <option value="GELANGGANG 2">GELANGGANG 2</option>
                              <option value="GELANGGANG 3">GELANGGANG 3</option>
                              <option value="GELANGGANG 4">GELANGGANG 4</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-cyan-200 font-mono font-bold uppercase tracking-wider">
                              TAHAPAN
                            </label>
                            <select
                              value={formTahap}
                              onChange={(e) => setFormTahap(e.target.value.toUpperCase())}
                              className="w-full bg-[#081020] border border-[#162540] focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs font-bold text-white cursor-pointer outline-none transition-all"
                            >
                              <option value="PENYISIHAN">PENYISIHAN</option>
                              <option value="PEREMPAT FINAL">PEREMPAT FINAL</option>
                              <option value="SEMI FINAL">SEMI FINAL</option>
                              <option value="FINAL">FINAL</option>
                            </select>
                          </div>
                        </div>

                        {/* Sistem Pertandingan Selector Cards */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-cyan-200 font-mono font-bold uppercase tracking-wider flex items-center justify-between">
                            <span>SISTEM PERTANDINGAN TURNAMEN</span>
                            <span className="text-[9px] text-cyan-400 font-normal">PILIH FORMAT</span>
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => { playSoundByKey("short_beep"); setFormSistemTanding("GUGUR"); }}
                              className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between gap-1 ${
                                formSistemTanding === "GUGUR"
                                  ? "bg-gradient-to-br from-[#0c284a] to-[#07172e] border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400/50"
                                  : "bg-[#081020] border-[#142033] text-zinc-400 hover:text-white hover:border-[#1e2e48]"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm">⚔️</span>
                                {formSistemTanding === "GUGUR" && <Check size={12} className="text-cyan-300" />}
                              </div>
                              <div>
                                <span className="font-black text-[11px] block uppercase tracking-wide">GUGUR</span>
                                <span className="text-[8px] text-cyan-300/70 font-mono block">Single Elimination</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => { playSoundByKey("short_beep"); setFormSistemTanding("POOL"); }}
                              className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between gap-1 ${
                                formSistemTanding === "POOL"
                                  ? "bg-gradient-to-br from-[#0c284a] to-[#07172e] border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400/50"
                                  : "bg-[#081020] border-[#142033] text-zinc-400 hover:text-white hover:border-[#1e2e48]"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm">🏆</span>
                                {formSistemTanding === "POOL" && <Check size={12} className="text-cyan-300" />}
                              </div>
                              <div>
                                <span className="font-black text-[11px] block uppercase tracking-wide">POOL</span>
                                <span className="text-[8px] text-cyan-300/70 font-mono block">Group Klasemen</span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => { playSoundByKey("short_beep"); setFormSistemTanding("PEMASALAN"); }}
                              className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer flex flex-col justify-between gap-1 ${
                                formSistemTanding === "PEMASALAN"
                                  ? "bg-gradient-to-br from-[#0c284a] to-[#07172e] border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400/50"
                                  : "bg-[#081020] border-[#142033] text-zinc-400 hover:text-white hover:border-[#1e2e48]"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm">🏅</span>
                                {formSistemTanding === "PEMASALAN" && <Check size={12} className="text-cyan-300" />}
                              </div>
                              <div>
                                <span className="font-black text-[11px] block uppercase tracking-wide">PEMASALAN</span>
                                <span className="text-[8px] text-cyan-300/70 font-mono block">Bagan 4 Atlet</span>
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Kategori Jurus & Kategori Usia */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-cyan-200 font-mono font-bold uppercase tracking-wider">
                              KATEGORI JURUS
                            </label>
                            <select
                              value={formCategory}
                              onChange={(e) => setFormCategory(e.target.value.toUpperCase())}
                              className="w-full bg-[#081020] border border-[#162540] focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs font-bold text-white cursor-pointer outline-none transition-all"
                            >
                              <option value="TUNGGAL">TUNGGAL</option>
                              <option value="GANDA">GANDA</option>
                              <option value="REGU">REGU</option>
                              <option value="SOLO KREATIF">SOLO KREATIF</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] text-cyan-200 font-mono font-bold uppercase tracking-wider">
                              KATEGORI USIA
                            </label>
                            <select
                              value={formAge}
                              onChange={(e) => setFormAge(e.target.value)}
                              className="w-full bg-[#081020] border border-[#162540] focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs font-bold text-white cursor-pointer outline-none transition-all"
                            >
                              {ageGroups.map(ag => (
                                <option key={ag} value={ag}>{ag}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Jenis Kelamin Segmented */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-cyan-200 font-mono font-bold uppercase tracking-wider">
                            JENIS KELAMIN
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => { playSoundByKey("short_beep"); setFormGender("PUTRA"); }}
                              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                                formGender === "PUTRA"
                                  ? "bg-gradient-to-r from-blue-700 to-indigo-800 border-blue-400 text-white shadow-lg ring-1 ring-blue-400/40"
                                  : "bg-[#081020] border-[#142033] text-zinc-400 hover:text-white"
                              }`}
                            >
                              <span>♂</span>
                              <span>PUTRA</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { playSoundByKey("short_beep"); setFormGender("PUTRI"); }}
                              className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                                formGender === "PUTRI"
                                  ? "bg-gradient-to-r from-pink-700 to-rose-800 border-pink-400 text-white shadow-lg ring-1 ring-pink-400/40"
                                  : "bg-[#081020] border-[#142033] text-zinc-400 hover:text-white"
                              }`}
                            >
                              <span>♀</span>
                              <span>PUTRI</span>
                            </button>
                          </div>
                        </div>

                        {/* Submit & Clear Buttons */}
                        <div className="flex items-center gap-2.5 pt-2">
                          <button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-cyan-700 via-blue-600 to-cyan-800 hover:from-cyan-600 hover:via-blue-500 hover:to-cyan-700 text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider transition-all shadow-xl shadow-cyan-950/80 active:scale-98 cursor-pointer flex items-center justify-center gap-2 border border-cyan-400/40"
                          >
                            <CheckCircle2 size={15} />
                            <span>{editingAthleteId ? "UPDATE DATA ATLET" : "SIMPAN DATA ATLET"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleClearForm}
                            className="bg-[#081020] hover:bg-[#0e1c36] border border-[#162540] hover:border-cyan-500 text-cyan-200 font-black text-xs px-4 py-3 rounded-xl uppercase tracking-wider transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw size={13} />
                            <span>RESET</span>
                          </button>
                        </div>
                      </form>

                      {/* Helpful Guide Note */}
                      <div className="bg-[#081020]/90 border border-[#162540] p-3 rounded-xl flex items-start gap-2.5">
                        <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-cyan-200/80 leading-relaxed font-sans">
                          Data atlet yang tersimpan akan otomatis terintegrasi ke bagan pertandingan (Single Elimination / Pool / Pemasalan) dan siap dimuat ke kontrol partai.
                        </p>
                      </div>
                    </div>

                    {/* Reset Database Button at Bottom */}
                    <button
                      type="button"
                      onClick={handleResetAllData}
                      className="w-full bg-gradient-to-r from-[#210912] to-[#17050b] hover:from-[#330e1d] hover:to-[#220713] border border-rose-900/60 hover:border-rose-600/80 text-rose-300 font-extrabold text-xs py-2.5 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer mt-3 shadow-md"
                    >
                      <Trash2 size={14} className="text-rose-400" />
                      <span>KOSONGKAN / RESET SEMUA DATABASE</span>
                    </button>
                  </div>

                  {/* Right Column: Live Filter & Roster Cards (col-span-7) */}
                  <div className="lg:col-span-7 bg-gradient-to-b from-[#070e1c] to-[#040813] border border-[#162540] p-4 md:p-5 rounded-2xl space-y-3.5 shadow-2xl flex flex-col justify-between">
                    <div>
                      
                      {/* Live Filter Header & Search Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#162540] pb-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#0b172a] border border-cyan-600/60 flex items-center justify-center text-cyan-300">
                            <Users size={16} />
                          </div>
                          <div>
                            <h3 className="text-xs md:text-sm font-black text-white font-mono uppercase tracking-wider flex items-center gap-2">
                              <span>DATABASE & ROSTER ATLET</span>
                              <span className="bg-[#0b172a] text-cyan-300 text-[10px] px-2 py-0.5 rounded-full border border-cyan-700/50">
                                {filteredAthletes.length} / {poolAthletes.length}
                              </span>
                            </h3>
                            <p className="text-[9px] text-cyan-400/80 font-mono uppercase mt-0.5">
                              DAFTAR ATLET TERDAFTAR DI TURNAMEN
                            </p>
                          </div>
                        </div>

                        {/* Search and Toggle */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <label className="flex items-center gap-1.5 bg-[#081020] border border-[#162540] hover:border-cyan-500 px-2.5 py-1.5 rounded-xl text-[10px] font-mono font-bold text-cyan-200 cursor-pointer transition-all">
                            <input
                              type="checkbox"
                              checked={showAllRoster}
                              onChange={(e) => setShowAllRoster(e.target.checked)}
                              className="rounded border-[#162540] bg-[#040813] text-cyan-500 focus:ring-0 cursor-pointer"
                            />
                            <span>Semua Kategori</span>
                          </label>
                          <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" />
                            <input
                              type="text"
                              value={rosterSearch}
                              onChange={(e) => setRosterSearch(e.target.value)}
                              placeholder="Cari Nama / Kontingen..."
                              className="bg-[#081020] border border-[#162540] focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none w-48 sm:w-56 transition-all"
                            />
                            {rosterSearch && (
                              <button
                                onClick={() => setRosterSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Fast Category Filter Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pb-3">
                        <button
                          type="button"
                          onClick={() => { playSoundByKey("short_beep"); setRosterCategoryFilter("ALL"); }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                            rosterCategoryFilter === "ALL"
                              ? "bg-cyan-700 text-white border-cyan-400 shadow-sm"
                              : "bg-[#081020] text-zinc-400 border-[#142033] hover:text-white"
                          }`}
                        >
                          SEMUA JURUS ({poolAthletes.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => { playSoundByKey("short_beep"); setRosterCategoryFilter("TUNGGAL"); }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                            rosterCategoryFilter === "TUNGGAL"
                              ? "bg-cyan-700 text-white border-cyan-400 shadow-sm"
                              : "bg-[#081020] text-zinc-400 border-[#142033] hover:text-white"
                          }`}
                        >
                          TUNGGAL ({countTunggal})
                        </button>
                        <button
                          type="button"
                          onClick={() => { playSoundByKey("short_beep"); setRosterCategoryFilter("GANDA"); }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                            rosterCategoryFilter === "GANDA"
                              ? "bg-cyan-700 text-white border-cyan-400 shadow-sm"
                              : "bg-[#081020] text-zinc-400 border-[#142033] hover:text-white"
                          }`}
                        >
                          GANDA ({countGanda})
                        </button>
                        <button
                          type="button"
                          onClick={() => { playSoundByKey("short_beep"); setRosterCategoryFilter("REGU"); }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                            rosterCategoryFilter === "REGU"
                              ? "bg-cyan-700 text-white border-cyan-400 shadow-sm"
                              : "bg-[#081020] text-zinc-400 border-[#142033] hover:text-white"
                          }`}
                        >
                          REGU ({countRegu})
                        </button>
                        <button
                          type="button"
                          onClick={() => { playSoundByKey("short_beep"); setRosterCategoryFilter("SOLO KREATIF"); }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                            rosterCategoryFilter === "SOLO KREATIF"
                              ? "bg-cyan-700 text-white border-cyan-400 shadow-sm"
                              : "bg-[#081020] text-zinc-400 border-[#142033] hover:text-white"
                          }`}
                        >
                          SOLO ({countSolo})
                        </button>

                        <div className="h-4 w-px bg-[#162540] mx-1 hidden sm:block"></div>

                        <button
                          type="button"
                          onClick={() => { playSoundByKey("short_beep"); setRosterGenderFilter(rosterGenderFilter === "PUTRA" ? "ALL" : "PUTRA"); }}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all cursor-pointer border ${
                            rosterGenderFilter === "PUTRA"
                              ? "bg-blue-700 text-white border-blue-400 shadow-sm"
                              : "bg-[#081020] text-blue-300/70 border-[#142033] hover:text-white"
                          }`}
                        >
                          ♂ PUTRA ({countPutra})
                        </button>
                        <button
                          type="button"
                          onClick={() => { playSoundByKey("short_beep"); setRosterGenderFilter(rosterGenderFilter === "PUTRI" ? "ALL" : "PUTRI"); }}
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all cursor-pointer border ${
                            rosterGenderFilter === "PUTRI"
                              ? "bg-pink-700 text-white border-pink-400 shadow-sm"
                              : "bg-[#081020] text-pink-300/70 border-[#142033] hover:text-white"
                          }`}
                        >
                          ♀ PUTRI ({countPutri})
                        </button>
                      </div>

                      {/* Roster Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                        {filteredAthletes.length === 0 ? (
                          <div className="col-span-2 text-center py-16 px-4 bg-[#081020]/60 border border-[#162540] rounded-2xl space-y-2">
                            <div className="w-12 h-12 rounded-full bg-[#0b172a] border border-[#162540] mx-auto flex items-center justify-center text-cyan-400">
                              <Users size={22} />
                            </div>
                            <h4 className="text-xs font-bold text-cyan-200">Tidak Ada Data Atlet Sesuai Filter</h4>
                            <p className="text-[10px] text-zinc-500 font-sans">
                              Ubah kata kunci pencarian atau pilih tombol "Semua Kategori" untuk melihat seluruh roster.
                            </p>
                          </div>
                        ) : (
                          filteredAthletes.map(ath => {
                            const isMale = (ath.gender || "PUTRA").toUpperCase() === "PUTRA";
                            return (
                              <div
                                key={ath.id}
                                className="bg-gradient-to-br from-[#070e1c] to-[#050b16] border border-[#162540] hover:border-cyan-500/90 p-3.5 rounded-2xl flex flex-col justify-between space-y-3 transition-all shadow-lg hover:shadow-cyan-950/50 group"
                              >
                                <div className="flex items-start justify-between gap-2.5">
                                  <div className="flex items-start gap-2.5">
                                    {/* Initials Circle */}
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                                      isMale 
                                        ? "bg-blue-950/80 border-blue-500/50 text-blue-300 shadow-blue-950/50" 
                                        : "bg-pink-950/80 border-pink-500/50 text-pink-300 shadow-pink-950/50"
                                    }`}>
                                      {ath.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <h4 className="font-black text-xs text-white uppercase tracking-wide leading-tight group-hover:text-cyan-200 transition-colors">
                                        {ath.name}
                                      </h4>
                                      <p className="text-[10px] font-bold text-cyan-400 font-mono uppercase mt-0.5 flex items-center gap-1">
                                        <MapPin size={10} className="shrink-0" />
                                        <span>{ath.contingent}</span>
                                      </p>
                                    </div>
                                  </div>

                                  {/* Quick Action Buttons */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleEditAthlete(ath)}
                                      title="Edit Data Atlet"
                                      className="bg-[#0b172a] hover:bg-[#122442] border border-[#1e2e48] text-cyan-200 p-1.5 rounded-lg transition-all active:scale-95 cursor-pointer shadow"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAthlete(ath.id)}
                                      title="Hapus Atlet"
                                      className="bg-rose-950/80 hover:bg-rose-800 border border-rose-800 text-rose-300 p-1.5 rounded-lg transition-all active:scale-95 cursor-pointer shadow"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>

                                {/* Category Tags */}
                                <div className="flex items-center gap-1.5 pt-1 flex-wrap border-t border-[#142033]">
                                  <span className="bg-[#0b172a] text-cyan-200 border border-[#1e2e48] text-[9px] font-mono font-bold px-2 py-0.5 rounded-md uppercase">
                                    {ath.kelas || "TUNGGAL"}
                                  </span>
                                  <span className="bg-[#0b172a] text-cyan-200 border border-[#1e2e48] text-[9px] font-mono font-bold px-2 py-0.5 rounded-md uppercase">
                                    {ath.usia || "REMAJA"}
                                  </span>
                                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md uppercase border ${
                                    isMale ? "bg-blue-950 text-blue-300 border-blue-700/60" : "bg-pink-950 text-pink-300 border-pink-700/60"
                                  }`}>
                                    {ath.gender || "PUTRA"}
                                  </span>
                                  <span className="bg-[#052b33] text-cyan-300 border border-cyan-700/60 text-[9px] font-mono font-bold px-2 py-0.5 rounded-md uppercase">
                                    {ath.gelanggang || "GELANGGANG 1"}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Summary Footer Bar */}
                    <div className="border-t border-[#162540] pt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-bold text-zinc-300">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-300">Total Database:</span>
                        <span className="bg-[#0b172a] text-white px-2 py-0.5 rounded-md border border-[#1e2e48]">
                          {poolAthletes.length} Atlet
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-[#070e1c] border border-[#162540] px-2 py-1 rounded-lg text-[9px] text-cyan-300">
                          TUNGGAL: {countTunggal}
                        </span>
                        <span className="bg-[#070e1c] border border-[#162540] px-2 py-1 rounded-lg text-[9px] text-cyan-300">
                          GANDA: {countGanda}
                        </span>
                        <span className="bg-[#070e1c] border border-[#162540] px-2 py-1 rounded-lg text-[9px] text-cyan-300">
                          REGU: {countRegu}
                        </span>
                        <span className="bg-[#070e1c] border border-[#162540] px-2 py-1 rounded-lg text-[9px] text-cyan-300">
                          SOLO: {countSolo}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

                {/* 2. BAGAN PERTANDINGAN (BRACKET VISUALIZER) TAB PANEL */}
                {registrasiActiveTab === "bagan" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1600px] mx-auto w-full font-sans">
                    
                    {/* Left Column: KATEGORI JURUS TERSEDIA */}
                    <div className="lg:col-span-3 bg-gradient-to-b from-[#070e1c] to-[#040813] border border-[#162540] p-4 rounded-2xl space-y-4 shadow-2xl flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-[#162540] pb-2.5">
                          <Award size={16} className="text-cyan-400" />
                          <div>
                            <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                              KATEGORI JURUS
                            </h3>
                            <p className="text-[9px] text-cyan-400/80 font-mono uppercase mt-0.5">
                              PILIH KELAS TANDING
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                          {baganCategoriesList.map(cat => {
                            const isSelected = selectedBaganCategoryKey === cat.id;
                            const count = poolAthletes.filter(a => 
                              (a.kelas||"").toUpperCase() === cat.kelas && 
                              (a.usia||"").toUpperCase() === cat.age && 
                              (a.gender||"PUTRA").toUpperCase() === cat.gender
                            ).length;
                            return (
                              <div
                                key={cat.id}
                                onClick={() => {
                                  playSoundByKey("short_beep");
                                  setSelectedBaganCategoryKey(cat.id);
                                }}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                                  isSelected
                                    ? "bg-gradient-to-r from-cyan-900/90 to-blue-900/90 border-cyan-400 text-white shadow-lg shadow-cyan-950/80 font-bold ring-1 ring-cyan-400/40"
                                    : "bg-[#081020] border-[#142033] hover:border-cyan-600/80 text-zinc-300"
                                }`}
                              >
                                <div>
                                  <h4 className="text-xs uppercase font-black tracking-wide">{cat.name}</h4>
                                  <p className="text-[9px] uppercase font-mono opacity-80 mt-0.5">{cat.age} • {cat.gender}</p>
                                </div>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-bold ${
                                  isSelected
                                    ? "bg-[#0b172a] border-cyan-300 text-white"
                                    : "bg-[#081020] border-[#162540] text-cyan-300"
                                }`}>
                                  {count} Atlit
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Quick Actions at Sidebar Footer */}
                      <div className="pt-3 border-t border-[#162540] space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            playSoundByKey("short_beep");
                            refreshTournamentData(true);
                          }}
                          className="w-full bg-[#0b172a] hover:bg-[#122442] border border-cyan-700/60 text-cyan-200 font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer active:scale-98"
                        >
                          <Shuffle size={13} />
                          <span>UNDIAN ACAK (DRAWING)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerateScheduleFromSystem(selectedTournamentSystem)}
                          className="w-full bg-gradient-to-r from-cyan-700 to-blue-600 hover:brightness-110 text-white font-black text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-cyan-950 cursor-pointer active:scale-98 border border-cyan-400/40"
                        >
                          <ListOrdered size={13} />
                          <span>JADWALKAN KE KONTROL PARTAI</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Main Tournament Bracket Canvas */}
                    <div className="lg:col-span-9 bg-gradient-to-b from-[#070e1c] to-[#040813] border border-[#162540] p-5 rounded-2xl shadow-2xl flex flex-col justify-between min-h-[600px] space-y-4">
                      
                      {/* Top Bar: Tournament System Selection Tabs */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#162540] pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="bg-[#0b172a] text-cyan-200 border border-cyan-700/50 text-[10px] font-mono font-black px-2.5 py-0.5 rounded-lg uppercase">
                              {baganCategoriesList.find(c => c.id === selectedBaganCategoryKey)?.kelas || "TUNGGAL"}
                            </span>
                            <span className="text-zinc-500">•</span>
                            <span className="text-zinc-300 font-bold text-xs font-mono uppercase">
                              {baganCategoriesList.find(c => c.id === selectedBaganCategoryKey)?.age || "REMAJA"} - {baganCategoriesList.find(c => c.id === selectedBaganCategoryKey)?.gender || "PUTRA"}
                            </span>
                          </div>
                          <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider font-mono mt-1">
                            {selectedTournamentSystem === "GUGUR" && "1. SISTEM GUGUR TUNGGAL (SINGLE ELIMINATION)"}
                            {selectedTournamentSystem === "POOL" && "2. SISTEM POOL (PEMBAGIAN GRUP)"}
                            {selectedTournamentSystem === "PEMASALAN" && "3. SISTEM PEMASALAN (CHAMPIONSHIP - MAX 4 ATLET)"}
                          </h3>
                        </div>

                        {/* System Switcher Buttons */}
                        <div className="flex items-center gap-1.5 bg-[#081020] border border-[#162540] p-1.5 rounded-xl self-start md:self-auto">
                          <button
                            type="button"
                            onClick={() => {
                              playSoundByKey("short_beep");
                              setSelectedTournamentSystem("GUGUR");
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                              selectedTournamentSystem === "GUGUR"
                                ? "bg-cyan-700 text-white shadow-md border border-cyan-400"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            <span>⚔</span>
                            <span>GUGUR TUNGGAL</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playSoundByKey("short_beep");
                              setSelectedTournamentSystem("POOL");
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                              selectedTournamentSystem === "POOL"
                                ? "bg-cyan-700 text-white shadow-md border border-cyan-400"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            <span>🏆</span>
                            <span>SISTEM POOL</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playSoundByKey("short_beep");
                              setSelectedTournamentSystem("PEMASALAN");
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                              selectedTournamentSystem === "PEMASALAN"
                                ? "bg-cyan-700 text-white shadow-md border border-cyan-400"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            <span>🏅</span>
                            <span>PEMASALAN</span>
                          </button>
                        </div>
                      </div>

                      {/* SYSTEM 1: GUGUR TUNGGAL (SINGLE ELIMINATION) */}
                      {selectedTournamentSystem === "GUGUR" && (
                        <div className="flex-1 flex flex-col justify-between space-y-6">
                          
                          {/* Info Header Banner */}
                          <div className="bg-[#081020]/80 border border-[#162540] p-3 rounded-xl flex items-center justify-between text-xs font-mono text-cyan-200">
                            <div className="flex items-center gap-2">
                              <Info size={14} className="text-cyan-400 shrink-0" />
                              <span>Mekanisme: Kalah langsung gugur tereliminasi. Pemenang melaju ke babak berikutnya hingga final. Klik pada kartu partai untuk langsung mulai skoring!</span>
                            </div>
                            <span className="font-bold text-amber-400 shrink-0 ml-2">Total {singleEliminationMatches.length} Partai</span>
                          </div>

                          {/* Matches Bracket View */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {singleEliminationMatches.map(m => {
                              const isCompleted = m.status === "COMPLETED";
                              const currentCat = baganCategoriesList.find(c => c.id === selectedBaganCategoryKey) || baganCategoriesList[0];
                              return (
                                <div
                                  key={m.id}
                                  className={`bg-[#070e1c] border rounded-xl overflow-hidden shadow-xl transition-all relative flex flex-col justify-between ${
                                    isCompleted ? "border-emerald-500/60 ring-1 ring-emerald-500/30" : "border-[#162540] hover:border-cyan-500"
                                  }`}
                                >
                                  {/* Top Header Badge */}
                                  <div className="bg-[#0b172a] border-b border-[#162540] px-3 py-1.5 flex items-center justify-between">
                                    <span className="text-[10px] font-mono font-black text-amber-400 uppercase">
                                      PARTAI {m.partaiNumber} • {m.stage}
                                    </span>
                                    {isCompleted && (
                                      <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded">
                                        SELESAI
                                      </span>
                                    )}
                                  </div>

                                  {/* Sudut Biru */}
                                  <div className={`p-3 border-r-4 border-r-blue-500 transition-all ${
                                    m.winner?.name === m.p1?.name && isCompleted ? "bg-blue-950/40" : "bg-gradient-to-r from-transparent to-blue-950/20"
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <span className="font-black text-blue-400 text-xs md:text-sm uppercase tracking-wide truncate">
                                        {m.p1?.name || "TBD (SUDUT BIRU)"}
                                      </span>
                                      {m.winner?.name === m.p1?.name && isCompleted && (
                                        <span className="text-[9px] bg-blue-600 text-white font-mono px-1.5 py-0.2 rounded font-black">MENANG</span>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-bold text-zinc-400 font-mono uppercase mt-0.5">
                                      {m.p1?.contingent || "-"}
                                    </div>
                                  </div>

                                  <div className="border-b border-[#162540]" />

                                  {/* Sudut Merah */}
                                  <div className={`p-3 border-r-4 border-r-rose-500 transition-all ${
                                    m.winner?.name === m.p2?.name && isCompleted ? "bg-rose-950/40" : "bg-gradient-to-r from-transparent to-rose-950/20"
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <span className="font-black text-rose-400 text-xs md:text-sm uppercase tracking-wide truncate">
                                        {m.p2?.name || "TBD (SUDUT MERAH)"}
                                      </span>
                                      {m.winner?.name === m.p2?.name && isCompleted && (
                                        <span className="text-[9px] bg-rose-600 text-white font-mono px-1.5 py-0.2 rounded font-black">MENANG</span>
                                      )}
                                    </div>
                                    <div className="text-[10px] font-bold text-zinc-400 font-mono uppercase mt-0.5">
                                      {m.p2?.contingent || "-"}
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="p-2 bg-[#040813] border-t border-[#162540] flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleLoadMatchToScoring(
                                        `PARTAI ${m.partaiNumber} (${m.stage})`,
                                        m.p1?.name || "SUDUT BIRU",
                                        m.p1?.contingent || "-",
                                        m.p2?.name || "SUDUT MERAH",
                                        m.p2?.contingent || "-",
                                        m.stage,
                                        currentCat.kelas,
                                        currentCat.age,
                                        currentCat.gender
                                      )}
                                      className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white font-black text-[10px] py-1.5 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 shadow border border-cyan-400/40"
                                    >
                                      <span>⚔</span>
                                      <span>MULAI SKORING</span>
                                    </button>

                                    {/* Winner Advance Selectors */}
                                    <button
                                      type="button"
                                      title="Set Sudut Biru Menang"
                                      onClick={() => handlePromoteGugurWinner(m.id, "biru")}
                                      className="bg-blue-950/80 hover:bg-blue-900 border border-blue-700 text-blue-300 text-[9px] font-mono font-black px-2 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                                    >
                                      + BIRU
                                    </button>
                                    <button
                                      type="button"
                                      title="Set Sudut Merah Menang"
                                      onClick={() => handlePromoteGugurWinner(m.id, "merah")}
                                      className="bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 text-[9px] font-mono font-black px-2 py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                                    >
                                      + MERAH
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Podium Results Banner if Final is Completed */}
                          {singleEliminationMatches.some(m => m.stage === "FINAL" && m.status === "COMPLETED") && (
                            <div className="bg-gradient-to-r from-amber-950/50 via-[#0b172a] to-amber-950/50 border border-amber-500/60 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-around gap-4 shadow-2xl animate-fade-in">
                              <div className="text-center">
                                <span className="text-2xl">🥇</span>
                                <h4 className="text-xs font-black text-amber-400 uppercase font-mono mt-1">JUARA 1 (MEDALI EMAS)</h4>
                                <p className="text-sm font-extrabold text-white uppercase mt-0.5">
                                  {singleEliminationMatches.find(m => m.stage === "FINAL")?.winner?.name || "PEMENANG FINAL"}
                                </p>
                                <p className="text-[10px] text-amber-300/80 font-mono uppercase">
                                  {singleEliminationMatches.find(m => m.stage === "FINAL")?.winner?.contingent || "-"}
                                </p>
                              </div>
                              <div className="text-center">
                                <span className="text-2xl">🥈</span>
                                <h4 className="text-xs font-black text-slate-300 uppercase font-mono mt-1">JUARA 2 (MEDALI PERAK)</h4>
                                <p className="text-sm font-extrabold text-white uppercase mt-0.5">
                                  {(() => {
                                    const finalMatch = singleEliminationMatches.find(m => m.stage === "FINAL");
                                    if (!finalMatch || !finalMatch.winner) return "RUNNER UP FINAL";
                                    return finalMatch.winner.name === finalMatch.p1?.name ? finalMatch.p2?.name : finalMatch.p1?.name;
                                  })()}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SYSTEM 2: SISTEM POOL (PEMBAGIAN GRUP) */}
                      {selectedTournamentSystem === "POOL" && (
                        <div className="flex-1 flex flex-col justify-between space-y-5">
                          
                          {/* Pool Config Controls Bar */}
                          <div className="bg-[#081020] border border-[#162540] p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div>
                                <label className="text-[9px] font-mono font-bold text-cyan-300 uppercase block">JUMLAH POOL</label>
                                <div className="flex items-center gap-1 mt-1">
                                  {[2, 3, 4].map(num => (
                                    <button
                                      key={num}
                                      type="button"
                                      onClick={() => { playSoundByKey("short_beep"); setPoolCountSetting(num); }}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                                        poolCountSetting === num ? "bg-cyan-600 text-white shadow" : "bg-[#0b172a] text-zinc-400 hover:text-white"
                                      }`}
                                    >
                                      {num} POOL
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="h-8 w-px bg-[#162540]" />

                              <div>
                                <label className="text-[9px] font-mono font-bold text-cyan-300 uppercase block">FORMAT PENENTUAN</label>
                                <div className="flex items-center gap-1 mt-1">
                                  <button
                                    type="button"
                                    onClick={() => { playSoundByKey("short_beep"); setPoolModeSetting("RANKING"); }}
                                    className={`px-3 py-1 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                                      poolModeSetting === "RANKING" ? "bg-cyan-600 text-white shadow" : "bg-[#0b172a] text-zinc-400 hover:text-white"
                                    }`}
                                  >
                                    📊 PERANGKINGAN SKOR
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { playSoundByKey("short_beep"); setPoolModeSetting("KNOCKOUT_INTERNAL"); }}
                                    className={`px-3 py-1 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                                      poolModeSetting === "KNOCKOUT_INTERNAL" ? "bg-cyan-600 text-white shadow" : "bg-[#0b172a] text-zinc-400 hover:text-white"
                                    }`}
                                  >
                                    🥊 GUGUR INTERNAL POOL
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Sub-tab Navigation */}
                            <div className="flex items-center gap-1 bg-[#040813] p-1 rounded-xl border border-[#162540]">
                              <button
                                type="button"
                                onClick={() => setActivePoolSubTab("ALL")}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase transition-all ${
                                  activePoolSubTab === "ALL" ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"
                                }`}
                              >
                                SEMUA POOL
                              </button>
                              {poolGroupsData.map(p => (
                                <button
                                  key={p.name}
                                  type="button"
                                  onClick={() => setActivePoolSubTab(p.name)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase transition-all ${
                                    activePoolSubTab === p.name ? "bg-cyan-600 text-white" : "text-zinc-400 hover:text-white"
                                  }`}
                                >
                                  {p.name}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setActivePoolSubTab("PLAYOFF")}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase transition-all ${
                                  activePoolSubTab === "PLAYOFF" ? "bg-amber-600 text-white shadow" : "text-amber-400 hover:text-white"
                                }`}
                              >
                                🏆 BABAK UTAMA
                              </button>
                            </div>
                          </div>

                          {/* Pool Tables & Standings */}
                          {activePoolSubTab !== "PLAYOFF" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {poolGroupsData
                                .filter(p => activePoolSubTab === "ALL" || activePoolSubTab === p.name)
                                .map(pool => (
                                  <div key={pool.name} className="bg-[#070e1c] border border-[#162540] rounded-2xl p-4 space-y-3 shadow-xl">
                                    <div className="flex items-center justify-between border-b border-[#162540] pb-2">
                                      <div className="flex items-center gap-2">
                                        <Trophy size={14} className="text-amber-400" />
                                        <h4 className="font-black text-xs text-white uppercase font-mono tracking-wider">{pool.name}</h4>
                                      </div>
                                      <span className="text-[10px] text-cyan-300 font-mono font-bold">{pool.athletes.length} Peserta</span>
                                    </div>

                                    {/* Standings Table */}
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-xs font-mono">
                                        <thead>
                                          <tr className="border-b border-[#162540] text-cyan-300/80 text-[10px] uppercase">
                                            <th className="pb-1.5 px-2">Pos</th>
                                            <th className="pb-1.5 px-2">Nama Atlit</th>
                                            <th className="pb-1.5 px-2">Kontingen</th>
                                            <th className="pb-1.5 px-2 text-right">Skor</th>
                                            <th className="pb-1.5 px-2 text-center">Aksi</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#142033]">
                                          {pool.standings.map(st => (
                                            <tr key={st.athlete.id} className="hover:bg-cyan-950/20 transition-all">
                                              <td className="py-2 px-2 font-black text-amber-400">
                                                {st.rank === 1 ? "🥇 1" : st.rank === 2 ? "🥈 2" : st.rank === 3 ? "🥉 3" : st.rank}
                                              </td>
                                              <td className="py-2 px-2 font-bold text-white uppercase truncate max-w-[130px]">
                                                {st.athlete.name}
                                              </td>
                                              <td className="py-2 px-2 text-zinc-400 uppercase text-[10px] truncate max-w-[100px]">
                                                {st.athlete.contingent}
                                              </td>
                                              <td className="py-2 px-2 text-right font-mono font-black text-cyan-200">
                                                {st.score > 0 ? st.score.toFixed(3) : "-"}
                                              </td>
                                              <td className="py-2 px-2 text-center">
                                                <button
                                                  type="button"
                                                  onClick={() => handleLoadMatchToScoring(
                                                    `${pool.name} - ATLET #${st.rank}`,
                                                    st.athlete.name,
                                                    st.athlete.contingent,
                                                    "SUDUT MERAH (POOL B)",
                                                    "-",
                                                    `${pool.name} PENYISIHAN`
                                                  )}
                                                  className="bg-cyan-800 hover:bg-cyan-700 text-white font-bold text-[9px] px-2 py-1 rounded transition-all cursor-pointer border border-cyan-600/50"
                                                >
                                                  SKOR
                                                </button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Babak Utama (Playoff Knockout Antar Juara Pool) */}
                          {activePoolSubTab === "PLAYOFF" && (
                            <div className="bg-[#070e1c] border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-2xl">
                              <div className="flex items-center justify-between border-b border-amber-900/40 pb-3">
                                <div className="flex items-center gap-2">
                                  <Medal size={18} className="text-amber-400" />
                                  <div>
                                    <h4 className="text-xs font-black text-amber-300 uppercase font-mono tracking-wider">
                                      BABAK UTAMA (KNOCKOUT PLAYOFF ANTAR JUARA POOL)
                                    </h4>
                                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                      Para Juara dan Runner Up masing-masing pool bertanding di babak utama memperebutkan Medali Emas, Perak, dan Perunggu.
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                {poolPlayoffMatches.map(m => (
                                  <div key={m.id} className="bg-[#040813] border border-[#162540] rounded-xl p-3.5 space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-mono text-cyan-300 font-bold border-b border-[#162540] pb-1.5">
                                      <span>{m.stage}</span>
                                      <span className="text-amber-400">PARTAI {m.partaiNumber}</span>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      <div className="flex justify-between items-center text-blue-400 font-bold">
                                        <span>{m.p1?.name || "JUARA POOL A"}</span>
                                        <span className="text-[10px] text-zinc-500 font-mono">{m.p1?.contingent || "-"}</span>
                                      </div>
                                      <div className="flex justify-between items-center text-rose-400 font-bold">
                                        <span>{m.p2?.name || "JUARA POOL B"}</span>
                                        <span className="text-[10px] text-zinc-500 font-mono">{m.p2?.contingent || "-"}</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleLoadMatchToScoring(
                                        `PLAYOFF ${m.stage}`,
                                        m.p1?.name || "JUARA POOL A",
                                        m.p1?.contingent || "-",
                                        m.p2?.name || "JUARA POOL B",
                                        m.p2?.contingent || "-",
                                        m.stage
                                      )}
                                      className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-black text-[10px] py-2 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow border border-cyan-400/40"
                                    >
                                      <span>⚔</span>
                                      <span>TANDINGKAN PARTAI INI</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SYSTEM 3: SISTEM PEMASALAN (CHAMPIONSHIP - MAX 4 ATLET) */}
                      {selectedTournamentSystem === "PEMASALAN" && (
                        <div className="flex-1 flex flex-col justify-between space-y-5">
                          
                          {/* Info Banner Pemasalan */}
                          <div className="bg-gradient-to-r from-[#0c284a]/80 via-[#07172e] to-[#0c284a]/80 border border-cyan-500/60 p-3.5 rounded-2xl flex items-start gap-3 shadow-xl">
                            <Medal size={20} className="text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <h4 className="text-xs font-black text-amber-300 font-mono uppercase tracking-wider">
                                MEKANISME RESMI SISTEM PEMASALAN (CHAMPIONSHIP)
                              </h4>
                              <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                                Setiap bagan dibatasi secara ketat <strong>maksimal 4 atlet</strong> dengan tingkat usia dan kategori setara. Menggunakan format <strong>Semifinal Langsung</strong> (SF1 & SF2). Pemenang melaju ke <strong>Final Medali Emas & Perak</strong>, sedangkan kedua atlet yang gugur di semifinal otomatis memperoleh <strong>Juara 3 Bersama (Medali Perunggu Bersama)</strong>.
                              </p>
                            </div>
                          </div>

                          {/* Bagan Tabs Selector if Multiple Pemasalan Brackets */}
                          {pemasalanBracketsData.length > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                              {pemasalanBracketsData.map((b, idx) => (
                                <button
                                  key={b.poolIndex}
                                  type="button"
                                  onClick={() => {
                                    playSoundByKey("short_beep");
                                    setActivePemasalanIndex(idx);
                                  }}
                                  className={`px-4 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                                    activePemasalanIndex === idx
                                      ? "bg-cyan-700 text-white shadow-lg border border-cyan-400"
                                      : "bg-[#081020] text-zinc-400 hover:text-white border border-[#162540]"
                                  }`}
                                >
                                  <span>BAGAN {b.poolIndex}</span>
                                  <span className="text-[10px] opacity-75">({b.athletes.length} Atlet)</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Active Pemasalan Bracket Content */}
                          {pemasalanBracketsData[activePemasalanIndex] && (() => {
                            const b = pemasalanBracketsData[activePemasalanIndex];
                            return (
                              <div className="space-y-5">
                                
                                {/* 2 Semifinals & 1 Final Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  
                                  {/* SEMIFINAL 1 */}
                                  <div className="bg-[#070e1c] border border-[#162540] rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-lg">
                                    <div className="flex items-center justify-between border-b border-[#162540] pb-1.5">
                                      <span className="text-[10px] font-mono font-black text-cyan-300 uppercase">SEMIFINAL 1</span>
                                      <span className="text-[9px] bg-[#0b172a] text-cyan-300 px-1.5 py-0.5 rounded font-mono">BAGAN #{b.poolIndex}</span>
                                    </div>
                                    <div className="space-y-2">
                                      <div className={`p-2 rounded-lg border-l-4 border-l-blue-500 ${(b.sf1.winner === "blue" || b.sf1.winner === b.sf1.p1?.name || b.sf1.winner?.name === b.sf1.p1?.name) ? "bg-blue-950/40" : "bg-cyan-950/20"}`}>
                                        <div className="font-extrabold text-blue-400 text-xs uppercase truncate">{b.sf1.p1?.name || "ATLET 1"}</div>
                                        <div className="text-[9px] text-zinc-400 font-mono uppercase">{b.sf1.p1?.contingent || "-"}</div>
                                      </div>
                                      <div className={`p-2 rounded-lg border-l-4 border-l-rose-500 ${(b.sf1.winner === "red" || b.sf1.winner === b.sf1.p2?.name || b.sf1.winner?.name === b.sf1.p2?.name) ? "bg-rose-950/40" : "bg-cyan-950/20"}`}>
                                        <div className="font-extrabold text-rose-400 text-xs uppercase truncate">{b.sf1.p2?.name || "ATLET 2"}</div>
                                        <div className="text-[9px] text-zinc-400 font-mono uppercase">{b.sf1.p2?.contingent || "-"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleLoadMatchToScoring(
                                          `BAGAN ${b.poolIndex} - SEMIFINAL 1`,
                                          b.sf1.p1?.name || "ATLET 1",
                                          b.sf1.p1?.contingent || "-",
                                          b.sf1.p2?.name || "ATLET 2",
                                          b.sf1.p2?.contingent || "-",
                                          "SEMIFINAL 1"
                                        )}
                                        className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white font-black text-[10px] py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer border border-cyan-400/40"
                                      >
                                        ⚔ SKOR SF1
                                      </button>
                                      <button
                                        type="button"
                                        title="Pemenang Biru"
                                        onClick={() => handlePemasalanOutcome(activePemasalanIndex, "sf1", "p1")}
                                        className="bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 text-[9px] px-2 py-1.5 rounded-lg font-mono font-black cursor-pointer"
                                      >
                                        + 1
                                      </button>
                                      <button
                                        type="button"
                                        title="Pemenang Merah"
                                        onClick={() => handlePemasalanOutcome(activePemasalanIndex, "sf1", "p2")}
                                        className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[9px] px-2 py-1.5 rounded-lg font-mono font-black cursor-pointer"
                                      >
                                        + 2
                                      </button>
                                    </div>
                                  </div>

                                  {/* SEMIFINAL 2 */}
                                  <div className="bg-[#070e1c] border border-[#162540] rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-lg">
                                    <div className="flex items-center justify-between border-b border-[#162540] pb-1.5">
                                      <span className="text-[10px] font-mono font-black text-cyan-300 uppercase">SEMIFINAL 2</span>
                                      <span className="text-[9px] bg-[#0b172a] text-cyan-300 px-1.5 py-0.5 rounded font-mono">BAGAN #{b.poolIndex}</span>
                                    </div>
                                    <div className="space-y-2">
                                      <div className={`p-2 rounded-lg border-l-4 border-l-blue-500 ${(b.sf2.winner === "blue" || b.sf2.winner === b.sf2.p1?.name || b.sf2.winner?.name === b.sf2.p1?.name) ? "bg-blue-950/40" : "bg-cyan-950/20"}`}>
                                        <div className="font-extrabold text-blue-400 text-xs uppercase truncate">{b.sf2.p1?.name || "ATLET 3"}</div>
                                        <div className="text-[9px] text-zinc-400 font-mono uppercase">{b.sf2.p1?.contingent || "-"}</div>
                                      </div>
                                      <div className={`p-2 rounded-lg border-l-4 border-l-rose-500 ${(b.sf2.winner === "red" || b.sf2.winner === b.sf2.p2?.name || b.sf2.winner?.name === b.sf2.p2?.name) ? "bg-rose-950/40" : "bg-cyan-950/20"}`}>
                                        <div className="font-extrabold text-rose-400 text-xs uppercase truncate">{b.sf2.p2?.name || "ATLET 4"}</div>
                                        <div className="text-[9px] text-zinc-400 font-mono uppercase">{b.sf2.p2?.contingent || "-"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleLoadMatchToScoring(
                                          `BAGAN ${b.poolIndex} - SEMIFINAL 2`,
                                          b.sf2.p1?.name || "ATLET 3",
                                          b.sf2.p1?.contingent || "-",
                                          b.sf2.p2?.name || "ATLET 4",
                                          b.sf2.p2?.contingent || "-",
                                          "SEMIFINAL 2"
                                        )}
                                        className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white font-black text-[10px] py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer border border-cyan-400/40"
                                      >
                                        ⚔ SKOR SF2
                                      </button>
                                      <button
                                        type="button"
                                        title="Pemenang Biru"
                                        onClick={() => handlePemasalanOutcome(activePemasalanIndex, "sf2", "p1")}
                                        className="bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 text-[9px] px-2 py-1.5 rounded-lg font-mono font-black cursor-pointer"
                                      >
                                        + 3
                                      </button>
                                      <button
                                        type="button"
                                        title="Pemenang Merah"
                                        onClick={() => handlePemasalanOutcome(activePemasalanIndex, "sf2", "p2")}
                                        className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[9px] px-2 py-1.5 rounded-lg font-mono font-black cursor-pointer"
                                      >
                                        + 4
                                      </button>
                                    </div>
                                  </div>

                                  {/* FINAL EMAS & PERAK */}
                                  <div className="bg-gradient-to-b from-[#0e1c36] to-[#070e1c] border-2 border-amber-500/60 rounded-xl p-3.5 flex flex-col justify-between space-y-3 shadow-xl">
                                    <div className="flex items-center justify-between border-b border-amber-900/50 pb-1.5">
                                      <span className="text-[10px] font-mono font-black text-amber-400 uppercase">FINAL (EMAS & PERAK)</span>
                                      <span className="text-[9px] bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">JUARA 1 & 2</span>
                                    </div>
                                    <div className="space-y-2">
                                      <div className={`p-2 rounded-lg border-l-4 border-l-blue-500 ${(b.final.winner === "blue" || b.final.winner === b.final.p1?.name || b.final.winner?.name === b.final.p1?.name) ? "bg-amber-950/40" : "bg-cyan-950/20"}`}>
                                        <div className="font-extrabold text-blue-400 text-xs uppercase truncate">{b.final.p1?.name || "PEMENANG SF 1"}</div>
                                        <div className="text-[9px] text-zinc-400 font-mono uppercase">{b.final.p1?.contingent || "-"}</div>
                                      </div>
                                      <div className={`p-2 rounded-lg border-l-4 border-l-rose-500 ${(b.final.winner === "red" || b.final.winner === b.final.p2?.name || b.final.winner?.name === b.final.p2?.name) ? "bg-amber-950/40" : "bg-cyan-950/20"}`}>
                                        <div className="font-extrabold text-rose-400 text-xs uppercase truncate">{b.final.p2?.name || "PEMENANG SF 2"}</div>
                                        <div className="text-[9px] text-zinc-400 font-mono uppercase">{b.final.p2?.contingent || "-"}</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => handleLoadMatchToScoring(
                                          `BAGAN ${b.poolIndex} - FINAL EMAS & PERAK`,
                                          b.final.p1?.name || "PEMENANG SF 1",
                                          b.final.p1?.contingent || "-",
                                          b.final.p2?.name || "PEMENANG SF 2",
                                          b.final.p2?.contingent || "-",
                                          "FINAL"
                                        )}
                                        className="flex-1 bg-gradient-to-r from-amber-600 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-[10px] py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer shadow"
                                      >
                                        ⚔ SKOR FINAL
                                      </button>
                                      <button
                                        type="button"
                                        title="Juara 1: Pemenang SF1"
                                        onClick={() => handlePemasalanOutcome(activePemasalanIndex, "final", "p1")}
                                        className="bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700 text-[9px] px-2 py-1.5 rounded-lg font-mono font-black cursor-pointer"
                                      >
                                        🥇 1
                                      </button>
                                      <button
                                        type="button"
                                        title="Juara 1: Pemenang SF2"
                                        onClick={() => handlePemasalanOutcome(activePemasalanIndex, "final", "p2")}
                                        className="bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-700 text-[9px] px-2 py-1.5 rounded-lg font-mono font-black cursor-pointer"
                                      >
                                        🥇 2
                                      </button>
                                    </div>
                                  </div>

                                </div>

                                {/* Podium Medali Apresiasi 4 Atlet Lengkap */}
                                <div className="bg-[#070e1c] border border-[#162540] p-4 rounded-2xl space-y-3">
                                  <div className="flex items-center gap-2 border-b border-[#162540] pb-2">
                                    <Trophy size={16} className="text-amber-400" />
                                    <h4 className="text-xs font-black text-cyan-200 uppercase font-mono tracking-wider">
                                      DISTRIBUSI MEDALI APRESIASI (BAGAN #{b.poolIndex})
                                    </h4>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                                    {/* EMAS */}
                                    <div className="bg-amber-950/30 border border-amber-500/50 p-3 rounded-xl text-center space-y-1">
                                      <span className="text-xl">🥇</span>
                                      <div className="text-[10px] font-mono font-black text-amber-400 uppercase">JUARA 1 (EMAS)</div>
                                      <div className="text-xs font-extrabold text-white uppercase truncate">{b.juara1?.name || "MENUNGGU FINAL"}</div>
                                      <div className="text-[9px] text-amber-300/80 font-mono uppercase">{b.juara1?.contingent || "-"}</div>
                                    </div>

                                    {/* PERAK */}
                                    <div className="bg-slate-950/40 border border-slate-500/50 p-3 rounded-xl text-center space-y-1">
                                      <span className="text-xl">🥈</span>
                                      <div className="text-[10px] font-mono font-black text-slate-300 uppercase">JUARA 2 (PERAK)</div>
                                      <div className="text-xs font-extrabold text-white uppercase truncate">{b.juara2?.name || "MENUNGGU FINAL"}</div>
                                      <div className="text-[9px] text-slate-400 font-mono uppercase">{b.juara2?.contingent || "-"}</div>
                                    </div>

                                    {/* PERUNGGU BERSAMA A */}
                                    <div className="bg-orange-950/30 border border-orange-600/50 p-3 rounded-xl text-center space-y-1">
                                      <span className="text-xl">🥉</span>
                                      <div className="text-[10px] font-mono font-black text-orange-400 uppercase">JUARA 3 BERSAMA (PERUNGGU)</div>
                                      <div className="text-xs font-extrabold text-white uppercase truncate">{b.juara3BersamaA?.name || "KALAH SF 1"}</div>
                                      <div className="text-[9px] text-orange-300/80 font-mono uppercase">{b.juara3BersamaA?.contingent || "-"}</div>
                                    </div>

                                    {/* PERUNGGU BERSAMA B */}
                                    <div className="bg-orange-950/30 border border-orange-600/50 p-3 rounded-xl text-center space-y-1">
                                      <span className="text-xl">🥉</span>
                                      <div className="text-[10px] font-mono font-black text-orange-400 uppercase">JUARA 3 BERSAMA (PERUNGGU)</div>
                                      <div className="text-xs font-extrabold text-white uppercase truncate">{b.juara3BersamaB?.name || "KALAH SF 2"}</div>
                                      <div className="text-[9px] text-orange-300/80 font-mono uppercase">{b.juara3BersamaB?.contingent || "-"}</div>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            );
                          })()}

                        </div>
                      )}

                      {/* Footer Info Bar */}
                      <div className="border-t border-[#162540] pt-3 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-cyan-300/70 font-bold uppercase tracking-wider gap-2">
                        <span>SISTEM PERTANDINGAN DIGITAL SKORING SENI IPSI</span>
                        <span>MENDUKUNG GUGUR TUNGGAL • SISTEM POOL • PEMASALAN</span>
                      </div>

                    </div>

                  </div>
                )}

                {/* 3. KONTROL JADWAL PARTAI TAB PANEL */}
                {registrasiActiveTab === "partai" && (
                  <div className="space-y-2.5 max-w-[1600px] mx-auto w-full font-sans">
                    
                    {/* Header Action Bar */}
                    <div className="bg-[#070e1c] border border-[#162540] p-2.5 rounded-xl shadow-xl space-y-2">
                      
                      {/* Top Controls Row */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                        
                        {/* Title & Subtitle */}
                        <div className="flex items-center gap-2.5">
                          <div className="bg-[#0b172a] p-1.5 rounded-lg border border-cyan-700/50 text-cyan-400">
                            <CheckSquare size={16} />
                          </div>
                          <div>
                            <h3 className="text-[11px] md:text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                              PENJADWALAN ROSTER &amp; KONTROL PARTAI
                            </h3>
                            <p className="text-[9px] text-cyan-400/80 font-mono uppercase tracking-wider mt-0.5">
                              ATUR PARAMETER DAN TAMPILKAN JADWAL PARTAI PERTANDINGAN
                            </p>
                          </div>
                        </div>

                        {/* Control Buttons Group */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          
                          {/* View Toggle */}
                          <div className="flex items-center gap-0.5 bg-[#081020] border border-[#162540] p-0.5 rounded-lg">
                            <button
                              type="button"
                              onClick={() => {
                                playSoundByKey("short_beep");
                                setKontrolViewMode("BATTLE");
                              }}
                              className={`font-black text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider cursor-pointer transition-all ${
                                kontrolViewMode === "BATTLE"
                                  ? "bg-cyan-700 text-white shadow border border-cyan-400"
                                  : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              BATTLE VIEW
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                playSoundByKey("short_beep");
                                setKontrolViewMode("POOL");
                              }}
                              className={`font-black text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider cursor-pointer transition-all ${
                                kontrolViewMode === "POOL"
                                  ? "bg-cyan-700 text-white shadow border border-cyan-400"
                                  : "text-zinc-400 hover:text-white"
                              }`}
                            >
                              POOL VIEW
                            </button>
                          </div>

                          {/* Shuffle Battle */}
                          <button
                            type="button"
                            onClick={() => {
                              playSoundByKey("short_beep");
                              setPartaiList(prev => {
                                const shuffled = [...prev];
                                for (let i = shuffled.length - 1; i > 0; i--) {
                                  const j = Math.floor(Math.random() * (i + 1));
                                  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                                }
                                return shuffled;
                              });
                            }}
                            className="bg-[#0b172a] hover:bg-[#122442] border border-cyan-700/60 text-cyan-200 font-extrabold text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow"
                          >
                            <span>🔀</span> SHUFFLE BATTLE
                          </button>

                          {/* Unduh Dokumen PDF Battle */}
                          <button
                            type="button"
                            onClick={() => {
                              playSoundByKey("short_beep");
                              window.print();
                            }}
                            className="bg-[#0b172a] hover:bg-[#122442] border border-cyan-700/60 text-cyan-200 font-extrabold text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow"
                          >
                            <span>📥</span> UNDUH DOKUMEN PDF BATTLE
                          </button>

                          {/* Batalkan Semua */}
                          <button
                            type="button"
                            onClick={() => {
                              playSoundByKey("short_beep");
                              setPartaiList(prev => prev.map(p => ({ ...p, checked: false })));
                            }}
                            className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 font-extrabold text-[10px] px-2.5 py-1 rounded-lg uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow"
                          >
                            <span>☒</span> BATALKAN SEMUA
                          </button>

                          {/* Active Schedule Count Badge */}
                          <div className="bg-[#081020] border border-[#162540] text-cyan-200 font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-inner">
                            <span>Jadwal Aktif:</span>
                            <span className="text-cyan-300 font-black">{partaiList.filter(p => p.checked).length} Partai</span>
                          </div>

                        </div>

                      </div>

                      {/* Second Row: Terapkan Jadwal Terpilih */}
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            playSoundByKey("success_chime");
                            // Number selected parties sequentially
                            let counter = 1;
                            const updated = partaiList.map(item => {
                              if (item.checked) {
                                return { ...item, partai: `PARTAI ${counter++}` };
                              }
                              return { ...item, partai: "DRAFT" };
                            });
                            setPartaiList(updated);

                            // Load first checked party if available
                            const firstChecked = updated.find(p => p.checked);
                            if (firstChecked) {
                              setPartaiTanding(firstChecked.partai);
                              setNamaAtlitBiru(firstChecked.biru.name);
                              setKontingenBiru(firstChecked.biru.contingent);
                              setNamaAtlitMerah(firstChecked.merah.name);
                              setKontingenMerah(firstChecked.merah.contingent);
                              const isGanda = firstChecked.kategori === "ganda";
                              const initKebenaran = isGanda ? 0 : (firstChecked.kategori === "solo_kreatif" ? 5.50 : 9.90);
                              const initKemantapan = isGanda ? 0 : 5.50;
                              const initKeserasian = isGanda ? 0 : 5.50;
                              const initPenjiwaan = isGanda ? 0 : 5.50;
                              const freshScores = juriScores.map(js => ({
                                ...js,
                                kebenaran: initKebenaran,
                                kemantapan: initKemantapan,
                                keserasian: initKeserasian,
                                penjiwaan: initPenjiwaan,
                                wrongMoves: 0,
                                flowScore: 0.00,
                                submitted: false
                              }));
                              saveSharedState({
                                partaiTanding: firstChecked.partai,
                                selectedCategory: firstChecked.kategori,
                                selectedAge: firstChecked.usia,
                                gender: firstChecked.gender,
                                tahapPertandingan: firstChecked.tahap,
                                namaAtlitBiru: firstChecked.biru.name,
                                kontingenBiru: firstChecked.biru.contingent,
                                namaAtlitMerah: firstChecked.merah.name,
                                kontingenMerah: firstChecked.merah.contingent,
                                performerName: activeCorner === "biru" ? firstChecked.biru.name : firstChecked.merah.name,
                                contingent: activeCorner === "biru" ? firstChecked.biru.contingent : firstChecked.merah.contingent,
                                juriScores: freshScores,
                                juriScoresBiru: freshScores,
                                juriScoresMerah: freshScores,
                                timeRemaining: 0,
                                timeActual: 0,
                                isTimerRunning: false
                              });
                            }
                            setShowRegistrasiOverlay(false);
                          }}
                          className="bg-[#059669] hover:bg-[#10b981] text-white font-black text-[10px] px-3 py-1.5 rounded-lg border border-emerald-400/50 shadow-md shadow-emerald-950/50 flex items-center gap-1.5 uppercase tracking-wider cursor-pointer transition-all"
                        >
                          <span>✓</span> TERAPKAN JADWAL TERPILIH
                        </button>
                      </div>

                    </div>

                    {/* Main Table Container */}
                    <div className="bg-[#070e1c] border border-[#162540] rounded-xl overflow-hidden shadow-2xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] text-left border-collapse">
                          <thead className="bg-[#0b172a] border-b border-[#162540] text-[9px] font-mono text-cyan-300 uppercase tracking-wider">
                            <tr>
                              <th className="py-2 px-2 text-center w-10">
                                <input
                                  type="checkbox"
                                  checked={partaiList.length > 0 && partaiList.every(p => p.checked)}
                                  onChange={(e) => {
                                    const val = e.target.checked;
                                    setPartaiList(prev => prev.map(p => ({ ...p, checked: val })));
                                  }}
                                  className="accent-cyan-500 rounded cursor-pointer w-3.5 h-3.5"
                                />
                                <span className="ml-1 text-[8px]">ALL</span>
                              </th>
                              <th className="py-2 px-2 font-bold text-center">PARTAI</th>
                              <th className="py-2 px-2.5 font-bold">KATEGORI / KELAS</th>
                              <th className="py-2 px-2.5 font-bold">SUDUT BIRU (BLUE)</th>
                              <th className="py-2 px-1.5 font-bold text-center">VS</th>
                              <th className="py-2 px-2.5 font-bold">SUDUT MERAH (RED)</th>
                              <th className="py-2 px-2.5 font-bold text-center">TAHAPAN PERTANDINGAN</th>
                              <th className="py-2 px-2 font-bold text-center">SKOR</th>
                              <th className="py-2 px-2.5 font-bold text-center">STATUS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#142033]">
                            {partaiList.map((pm, idx) => (
                              <tr
                                key={pm.id || idx}
                                onClick={() => {
                                  playSoundByKey("short_beep");
                                  setPartaiList(prev => prev.map(p => p.id === pm.id ? { ...p, checked: !p.checked } : p));
                                }}
                                className={`transition-all cursor-pointer font-mono ${
                                  pm.checked
                                    ? "bg-[#0b1d36] hover:bg-[#0e274a]"
                                    : "bg-[#050b16] hover:bg-[#081020] opacity-80"
                                }`}
                              >
                                {/* Checkbox */}
                                <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={!!pm.checked}
                                    onChange={() => {
                                      setPartaiList(prev => prev.map(p => p.id === pm.id ? { ...p, checked: !p.checked } : p));
                                    }}
                                    className="accent-cyan-500 rounded cursor-pointer w-3.5 h-3.5"
                                  />
                                </td>

                                {/* PARTAI */}
                                <td className="py-1.5 px-2 text-center font-bold text-cyan-300/80 text-[10px]">
                                  {pm.partai || "DRAFT"}
                                </td>

                                {/* KATEGORI / KELAS */}
                                <td className="py-1.5 px-2.5">
                                  <div className="font-extrabold text-white text-[11px] uppercase tracking-wide">
                                    {pm.kategoriMain || (pm.kategori ? pm.kategori.toUpperCase() : "TUNGGAL")}
                                  </div>
                                  <div className="text-[9px] text-cyan-300/70 font-mono uppercase mt-0.5 font-semibold">
                                    {pm.kategoriSub || `${pm.usia} • ${pm.gender}`}
                                  </div>
                                </td>

                                {/* SUDUT BIRU */}
                                <td className="py-1.5 px-2.5">
                                  <div className="font-extrabold text-blue-400 text-[11px] uppercase tracking-wide">
                                    {pm.biru?.name || pm.biruName}
                                  </div>
                                  <div className="text-[9px] text-zinc-400 font-mono uppercase mt-0.5">
                                    {pm.biru?.contingent || pm.biruContingent}
                                  </div>
                                </td>

                                {/* VS */}
                                <td className="py-1.5 px-1.5 text-center">
                                  <span className="bg-[#0b172a] text-cyan-300 border border-[#162540] text-[8px] font-mono font-bold px-1 py-0.5 rounded">
                                    VS
                                  </span>
                                </td>

                                {/* SUDUT MERAH */}
                                <td className="py-1.5 px-2.5">
                                  <div className="font-extrabold text-rose-400 text-[11px] uppercase tracking-wide">
                                    {pm.merah?.name || pm.merahName}
                                  </div>
                                  <div className="text-[9px] text-zinc-400 font-mono uppercase mt-0.5">
                                    {pm.merah?.contingent || pm.merahContingent}
                                  </div>
                                </td>

                                {/* TAHAPAN PERTANDINGAN */}
                                <td className="py-1.5 px-2.5 text-center">
                                  <span className="bg-cyan-950 text-cyan-200 border border-cyan-600/60 text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm inline-block">
                                    {pm.tahap || "SEMIFINAL"}
                                  </span>
                                </td>

                                {/* SKOR */}
                                <td className="py-1.5 px-2 text-center text-[10px] font-mono font-bold text-zinc-400">
                                  {pm.skor || "-"}
                                </td>

                                {/* STATUS */}
                                <td className="py-1.5 px-2.5 text-center text-[10px] font-mono font-bold text-zinc-400 uppercase">
                                  {pm.status || "BELUM MULAI"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Footer Bar */}
                      <div className="border-t border-[#162540] bg-[#040813] p-2 flex flex-col sm:flex-row items-center justify-between text-[9px] font-mono text-cyan-400/80 uppercase font-bold tracking-wider gap-1.5">
                        <span>CENTANG GANJIL/GENAP SECARA OTOMATIS MELAKUKAN PAIRING MERAH VS BIRU</span>
                        <span>PARTAI TERURUT 1, 2, ... MENYESUAIKAN JUMLAH TERPILIH</span>
                      </div>
                    </div>

                  </div>
                )}

              </div>

            </div>
          )}

        {/* ========================================================================= */}
        {/* PRINTABLE SCORE SHEET PREVIEW MODAL */}
        {/* ========================================================================= */}
        {showPrintScoresheet && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white text-black p-8 rounded-xl max-w-4xl w-full relative my-8 print:p-0 print:m-0 print:rounded-none">
              
              {/* Modal close / Action header bar */}
              <div className="absolute top-4 right-4 flex gap-3 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg"
                >
                  🖨️ Cetak / Print
                </button>
                <button
                  onClick={() => setShowPrintScoresheet(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase px-4 py-2 rounded-lg"
                >
                  Tutup
                </button>
              </div>

              {/* PRINTABLE DOCUMENT BODY */}
              <div id="printable-area" className="space-y-6 font-sans text-xs">
                
                {/* Header Table */}
                <div className="border-b-2 border-black pb-4 text-center space-y-1">
                  <h2 className="text-lg font-black tracking-wide leading-none">{namaEvent}</h2>
                  <p className="font-bold text-[10px]">Tempat: {tempatPelaksanaan} • Tanggal: {waktuPelaksanaan}</p>
                  <p className="text-xs uppercase font-extrabold tracking-wider bg-black text-white py-1 rounded inline-block px-4">
                    LEMBAR PENILAIAN PERTANDINGAN SENI JURUS
                  </p>
                </div>

                {/* Match Info Strip */}
                <div className="grid grid-cols-2 gap-4 border border-black p-3 bg-zinc-50 rounded">
                  <div className="space-y-1">
                    <div><strong>Partai Nomor:</strong> {partaiTanding} ({tahapPertandingan})</div>
                    <div><strong>Kategori Seni:</strong> {categories.find(c => c.id === selectedCategory)?.name}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div><strong>Golongan Usia:</strong> {selectedAge}</div>
                    <div><strong>Gender:</strong> {gender}</div>
                  </div>
                </div>

                {/* Scoring Table */}
                <table className="w-full border-collapse border border-black text-left text-[11px]">
                  <thead>
                    <tr className="bg-zinc-100">
                      <th className="border border-black p-2">SUDUT PERTANDINGAN</th>
                      <th className="border border-black p-2">NAMA ATLET / TIM</th>
                      <th className="border border-black p-2">KONTINGEN</th>
                      <th className="border border-black p-2 text-center">SKOR AKHIR JURI</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-2 font-bold text-blue-600">SUDUT BIRU</td>
                      <td className="border border-black p-2 font-bold uppercase">{namaAtlitBiru}</td>
                      <td className="border border-black p-2 uppercase">{kontingenBiru}</td>
                      <td className="border border-black p-2 text-center text-lg font-black text-blue-600 font-mono">{getFormattedScore("biru")}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 font-bold text-red-600">SUDUT MERAH</td>
                      <td className="border border-black p-2 font-bold uppercase">{namaAtlitMerah}</td>
                      <td className="border border-black p-2 uppercase">{kontingenMerah}</td>
                      <td className="border border-black p-2 text-center text-lg font-black text-red-600 font-mono">{getFormattedScore("merah")}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Judges detailed table */}
                <div className="space-y-2">
                  <h4 className="font-bold border-b border-black pb-1 uppercase">REKAPITULASI WASIT-JURI SAH</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {juriScores.map((js, idx) => {
                      const totalBiru = getJudgeTotal(juriScoresBiru.find(s => s.id === js.id) || js);
                      const totalMerah = getJudgeTotal(juriScoresMerah.find(s => s.id === js.id) || js);
                      return (
                        <div key={js.id} className="border border-black p-2 rounded text-center bg-zinc-50 font-mono">
                          <div className="font-bold border-b border-zinc-300 pb-1 text-[10px]">JURI {js.id}</div>
                          <div className="mt-1 flex justify-between text-[10px]">
                            <span className="text-blue-600 font-bold">B: {totalBiru.toFixed(2)}</span>
                            <span className="text-red-600 font-bold">M: {totalMerah.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-10 pt-10 text-center font-bold">
                  <div className="space-y-12">
                    <div>KETUA DEWAN JURI</div>
                    <div className="border-t border-black pt-1 w-48 mx-auto">Tanda Tangan & Nama Terang</div>
                  </div>
                  <div className="space-y-12">
                    <div>SEKRETARIS PERTANDINGAN</div>
                    <div className="border-t border-black pt-1 w-48 mx-auto">Tanda Tangan & Nama Terang</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // 3. ROLE: DEWAN VIEW (Chair of the board panel, inputs deductions, displays calculation logs, matches dewantunggal.JPG perfectly)
  if (role === "dewan") {
    const calcResult = getSeniCalculationResult();
    const calculateSD = (scoresList: JuriScore[]) => {
      const totals = scoresList.map(js => getJudgeTotal(js));
      const n = totals.length;
      if (n === 0) return 0;
      const mean = totals.reduce((sum, val) => sum + val, 0) / n;
      const variance = totals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
      return Math.sqrt(variance);
    };

    const handleEditJudgeScore = (judgeId: number, type: 'kebenaran' | 'kemantapan' | 'serangBela' | 'penjiwaan') => {
      const activeScores = activeCorner === "biru" ? juriScoresBiru : juriScoresMerah;
      const currentJs = activeScores.find(js => js.id === judgeId);
      const isGanda = selectedCategory === "ganda";
      
      let label = "Kebenaran";
      let currentVal = 0;
      if (isGanda) {
        if (type === 'serangBela' || type === 'kebenaran') {
          label = "Serang Bela";
          currentVal = currentJs?.kebenaran ?? 0;
        } else if (type === 'kemantapan') {
          label = "Kemantapan dan Harmoni";
          currentVal = currentJs?.kemantapan ?? 0;
        } else if (type === 'penjiwaan') {
          label = "Penjiwaan dan Penghayatan";
          currentVal = currentJs?.penjiwaan ?? currentJs?.keserasian ?? 0;
        }
      } else {
        label = type === 'kebenaran' ? 'Nilai Kebenaran' : 'Kemantapan & Stamina';
        currentVal = currentJs?.[type === 'kebenaran' ? 'kebenaran' : 'kemantapan'] ?? 0;
      }
      
      const promptVal = prompt(`Ubah nilai ${label} Juri ${judgeId}:`, currentVal.toFixed(2));
      if (promptVal !== null) {
        const num = parseFloat(promptVal);
        if (!isNaN(num)) {
          const updatedScores = activeScores.map(js => {
            if (js.id === judgeId) {
              if (isGanda) {
                if (type === 'serangBela' || type === 'kebenaran') {
                  return { ...js, kebenaran: num, wrongMoves: num, submitted: true };
                } else if (type === 'kemantapan') {
                  return { ...js, kemantapan: num, submitted: true };
                } else if (type === 'penjiwaan') {
                  return { ...js, penjiwaan: num, keserasian: num, submitted: true };
                }
              }
              return { ...js, [type === 'serangBela' ? 'kebenaran' : type]: num, submitted: true };
            }
            return js;
          });
          
          if (activeCorner === "biru") {
            setJuriScoresBiru(updatedScores);
            setJuriScores(updatedScores);
            saveSharedState({
              juriScoresBiru: updatedScores,
              juriScores: updatedScores
            });
          } else {
            setJuriScoresMerah(updatedScores);
            setJuriScores(updatedScores);
            saveSharedState({
              juriScoresMerah: updatedScores,
              juriScores: updatedScores
            });
          }
          playSoundByKey("success_chime");
        }
      }
    };

    return (
      <div className="min-h-screen bg-[#040813] text-white flex flex-col font-sans select-none relative pb-6">
        
        {/* HOVER-TRIGGERED TOP-RIGHT CONTROLS (Hanya muncul saat mouse diarahkan ke sudut kanan atas) */}
        <div className="fixed top-0 right-0 z-50 p-2 sm:p-3 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-auto">
          <div className="bg-[#070e1c]/95 border-2 border-[#1c3258] backdrop-blur-md rounded-2xl p-1.5 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex items-center gap-2">
            <button
              id="btn-dewan-back"
              onClick={() => { setRole(null); playSoundByKey("short_beep"); }}
              className="bg-[#0b172a] hover:bg-[#162a4a] text-cyan-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-cyan-500/40 hover:border-cyan-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Kembali ke Menu Utama"
            >
              <ArrowLeft size={14} />
              <span>Kembali</span>
            </button>
            <button
              id="btn-dewan-fullscreen"
              onClick={toggleFullScreen}
              className="bg-[#0b172a] hover:bg-[#162a4a] text-amber-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-amber-500/40 hover:border-amber-400 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Toggle Full Screen"
            >
              {isFs ? <Minimize size={14} /> : <Maximize size={14} />}
              <span>{isFs ? "Normal" : "Full Screen"}</span>
            </button>
          </div>
        </div>

        {/* Top Header Event Info - Arena LED Modern */}
        <div className="bg-[#070e1c] border-b border-[#162540] py-3.5 px-6 flex flex-row items-center justify-between gap-4 z-10 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-left">
              <h1 className="text-sm md:text-base font-black text-white uppercase tracking-wider">
                {namaEvent || "KEJUARAAN NASIONAL PENCAK SILAT IPSI REKOR INDONESIA"}
              </h1>
              <p className="text-[10px] md:text-xs font-bold text-cyan-400/80 tracking-wider mt-0.5 uppercase font-mono">
                PARTAI {partaiTanding || "02"} | GELANGGANG 1 | {selectedCategory === "solo_kreatif" ? "SOLO KREATIF" : selectedCategory.toUpperCase()} ({gender.toUpperCase()}) | {selectedAge.toUpperCase()} | {tahapPertandingan.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="text-right whitespace-nowrap">
            <span className="text-sm md:text-base font-black text-cyan-300 tracking-widest uppercase font-mono">
              {selectedCategory === "solo_kreatif" ? "SOLO KREATIF" : selectedCategory.toUpperCase()} • {gender.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Athlete Section & Action controls */}
        <div className="px-6 pt-3 pb-3 flex flex-col xl:flex-row justify-between items-center gap-4 z-10 w-full">
          {/* Competitor Identity */}
          <div className="flex flex-col items-center xl:items-start text-center xl:text-left">
            <span className="text-xs font-sans font-bold text-cyan-400 uppercase tracking-wider block font-mono">
              {activeCorner === "biru" ? (kontingenBiru || "BALI") : (kontingenMerah || "JAWA BARAT")}
            </span>
            <h2 className="text-2xl font-black text-white tracking-wide mt-0.5 uppercase font-mono">
              {activeCorner === "biru" ? (namaAtlitBiru || "BENNY G. SUMARSONO") : (namaAtlitMerah || "SUHARTONO")}
            </h2>
          </div>

          {/* Action Center Row */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            
            {/* Sudut Biru & Merah Pill/Capsule Container */}
            <div className="bg-[#070e1c] border border-[#162540] rounded-xl p-1 flex items-center gap-1">
              <button
                id="dewan-btn-biru"
                onClick={() => activateCornerAndSync("biru")}
                className={`px-4 py-2 rounded-lg text-xs font-black tracking-widest flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCorner === "biru"
                    ? "bg-[#1e61ff] text-white shadow-[0_0_15px_rgba(30,97,255,0.4)]"
                    : "text-zinc-400 hover:text-white bg-transparent"
                }`}
              >
                <span className={activeCorner === "biru" ? "text-blue-200" : "text-blue-500/50"}>●</span> SUDUT BIRU
              </button>

              <button
                id="dewan-btn-merah"
                onClick={() => activateCornerAndSync("merah")}
                className={`px-4 py-2 rounded-lg text-xs font-black tracking-widest flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeCorner === "merah"
                    ? "bg-[#e11d48] text-white shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                    : "text-zinc-400 hover:text-white bg-transparent"
                }`}
              >
                <span className={activeCorner === "merah" ? "text-rose-200" : "text-rose-500/50"}>●</span> SUDUT MERAH
              </button>
            </div>

            {/* Progress to Penampilan 2 */}
            {activeCorner === "biru" && (
              <button
                id="dewan-btn-lanjut-penampilan"
                onClick={() => {
                  if (confirm("Lanjutkan pertandingan ke Penampilan ke-2 (Sudut Merah)?")) {
                    activateCornerAndSync("merah");
                    const updatedLogs = [
                      { time: formatTime(timeRemaining), msg: "DEWAN JURI MELANJUTKAN KE PENAMPILAN KE-2 (SUDUT MERAH)", type: "system" as const },
                      ...logs
                    ];
                    saveSharedState({ logs: updatedLogs });
                  }
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-black tracking-widest border border-amber-500/80 text-amber-400 bg-[#070e1c] hover:bg-amber-500/10 transition-all uppercase cursor-pointer animate-pulse"
              >
                LANJUT
              </button>
            )}

            {/* Hukuman / DISK - UD Button */}
            <button
              id="dewan-btn-disk-ud"
              onClick={() => setShowDiskUDModal(true)}
              className="px-5 py-2.5 rounded-xl text-xs font-black tracking-widest border border-rose-500/80 text-rose-400 bg-[#070e1c] hover:bg-rose-500/10 transition-all uppercase cursor-pointer"
            >
              DISK - UD
            </button>

            {/* Hukuman Panel Button */}
            <button
              id="dewan-btn-deductions"
              onClick={() => setShowDeductionsModal(true)}
              className="px-5 py-2.5 rounded-xl text-xs font-black tracking-widest border border-cyan-500/80 text-cyan-400 bg-[#070e1c] hover:bg-cyan-500/10 transition-all uppercase cursor-pointer"
            >
              HUKUMAN
            </button>

            {/* LED Digital Timer block */}
            <div className="bg-[#070e1c] border border-[#162540] px-5 py-1.5 rounded-xl flex items-center shadow-lg">
              <div className="flex flex-col items-center">
                <span className="text-[7px] text-amber-400/80 font-mono font-bold uppercase leading-none tracking-widest">WAKTU TAMPIL</span>
                <span className="text-xl font-black font-mono tracking-widest text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)] mt-0.5">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Main 10-Juri Grid Table */}
        <div className="flex-1 max-w-[100vw] overflow-x-auto px-6 pt-1 pb-2">
          <table className="w-full border-collapse border border-[#162540] text-center bg-[#070e1c] rounded-xl overflow-hidden shadow-2xl">
            <thead>
              <tr className="border-b border-[#162540]">
                <th className="border border-[#162540] text-cyan-300 bg-[#0b172a] text-xs font-mono py-4 px-4 text-left font-black uppercase">
                  JURI
                </th>
                {Array.from({ length: judgesCount }, (_, i) => i + 1).map((jNum) => (
                  <th key={jNum} className="border border-[#162540] text-white bg-[#0b172a] text-sm font-black py-4 px-2 font-mono">
                    JURI {jNum}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Kesalahan Gerak / Serang Bela display */}
              <tr className="border-b border-[#162540]">
                <td className="border border-[#162540] text-white text-xs font-bold py-4 px-4 text-left bg-[#0b172a] uppercase">
                  {selectedCategory === "ganda" ? "SERANG BELA" : "KESALAHAN GERAK"}
                </td>
                {Array.from({ length: judgesCount }, (_, i) => i + 1).map((jNum) => {
                  const js = juriScores.find(j => j.id === jNum);
                  if (selectedCategory === "ganda") {
                    const isSubmitted = js && js.submitted;
                    const serangBelaVal = isSubmitted ? (js.kebenaran ?? 0) : 0;
                    return (
                      <td 
                        key={jNum} 
                        onClick={() => handleEditJudgeScore(jNum, 'serangBela')}
                        className="border border-[#162540] py-3 px-2 bg-[#081020] hover:bg-amber-900/20 cursor-pointer transition-all"
                      >
                        <span className="font-mono font-black text-sm text-amber-400">
                          {serangBelaVal === 0 ? "0" : serangBelaVal.toFixed(2)}
                        </span>
                      </td>
                    );
                  }
                  const rawMistakes = js ? Math.max(0, Math.round((9.90 - js.kebenaran) / 0.01)) : 0;
                  return (
                    <td key={jNum} className="border border-[#162540] py-3 px-2 bg-[#081020]">
                      <span className="font-mono font-black text-sm text-amber-400">
                        {rawMistakes}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Row 2: Nilai Kebenaran / Kemantapan dan Harmoni editable */}
              <tr className="border-b border-[#162540]">
                <td 
                  className="border border-[#162540] text-white text-xs font-bold py-4 px-4 text-left bg-[#0b172a] cursor-pointer hover:bg-cyan-950/40 transition-all uppercase"
                  onClick={() => alert("Tips: Klik nilai pada sel kolom Juri untuk mengubah nilai.")}
                >
                  {selectedCategory === "ganda" ? (
                    "KEMANTAPAN DAN HARMONI"
                  ) : (
                    <>
                      NILAI KEBENARAN <span className="text-[10px] text-zinc-400 block font-normal lowercase">(base 9.90, -0.01/kesalahan)</span>
                    </>
                  )}
                </td>
                {Array.from({ length: judgesCount }, (_, i) => i + 1).map((jNum) => {
                  const js = juriScores.find(j => j.id === jNum);
                  if (selectedCategory === "ganda") {
                    const isSubmitted = js && js.submitted;
                    const kemantapanVal = isSubmitted ? (js.kemantapan ?? 0) : 0;
                    return (
                      <td 
                        key={jNum} 
                        onClick={() => handleEditJudgeScore(jNum, 'kemantapan')}
                        className="border border-[#162540] py-4 px-2 font-mono font-bold text-sm text-cyan-400 bg-[#081020] hover:bg-cyan-900/30 cursor-pointer transition-all"
                      >
                        {kemantapanVal === 0 ? "0" : kemantapanVal.toFixed(2)}
                      </td>
                    );
                  }
                  const kebenaranVal = js ? js.kebenaran : 9.90;
                  return (
                    <td 
                      key={jNum} 
                      onClick={() => handleEditJudgeScore(jNum, 'kebenaran')}
                      className="border border-[#162540] py-4 px-2 font-mono font-bold text-sm text-cyan-400 bg-[#081020] hover:bg-cyan-900/30 cursor-pointer transition-all"
                    >
                      {kebenaranVal.toFixed(2)}
                    </td>
                  );
                })}
              </tr>

              {/* Row 3: Kemantapan & Stamina / Penjiwaan dan Penghayatan editable */}
              <tr className="border-b border-[#162540]">
                <td 
                  className="border border-[#162540] text-white text-xs font-bold py-4 px-4 text-left bg-[#0b172a] cursor-pointer hover:bg-cyan-950/40 transition-all uppercase"
                  onClick={() => alert("Tips: Klik nilai pada sel kolom Juri untuk mengubah nilai.")}
                >
                  {selectedCategory === "ganda" ? (
                    "PENJIWAAN DAN PENGHAYATAN"
                  ) : (
                    <>
                      KEMANTAPAN & STAMINA <span className="text-[10px] text-zinc-400 block font-normal lowercase">(range 5.00 - 6.00)</span>
                    </>
                  )}
                </td>
                {Array.from({ length: judgesCount }, (_, i) => i + 1).map((jNum) => {
                  const js = juriScores.find(j => j.id === jNum);
                  if (selectedCategory === "ganda") {
                    const isSubmitted = js && js.submitted;
                    const penjiwaanVal = isSubmitted ? ((js.penjiwaan ?? js.keserasian) ?? 0) : 0;
                    return (
                      <td 
                        key={jNum} 
                        onClick={() => handleEditJudgeScore(jNum, 'penjiwaan')}
                        className="border border-[#162540] py-4 px-2 font-mono font-bold text-sm text-emerald-400 bg-[#081020] hover:bg-emerald-900/30 cursor-pointer transition-all"
                      >
                        {penjiwaanVal === 0 ? "0" : penjiwaanVal.toFixed(2)}
                      </td>
                    );
                  }
                  const kemantapanVal = js ? js.kemantapan : 5.50;
                  return (
                    <td 
                      key={jNum} 
                      onClick={() => handleEditJudgeScore(jNum, 'kemantapan')}
                      className="border border-[#162540] py-4 px-2 font-mono font-bold text-sm text-emerald-400 bg-[#081020] hover:bg-emerald-900/30 cursor-pointer transition-all"
                    >
                      {kemantapanVal.toFixed(2)}
                    </td>
                  );
                })}
              </tr>

              {/* Row 4: Total Skor */}
              <tr>
                <td className="border border-[#162540] text-cyan-300 text-xs font-black py-5 px-4 text-left bg-[#0b172a] uppercase font-mono">
                  TOTAL SKOR JURI
                </td>
                {Array.from({ length: judgesCount }, (_, i) => i + 1).map((jNum) => {
                  const js = juriScores.find(j => j.id === jNum);
                  if (selectedCategory === "ganda") {
                    const isSubmitted = js && js.submitted;
                    const total = isSubmitted ? getJudgeTotal(js) : 9.00;
                    return (
                      <td key={jNum} className="border border-[#162540] py-5 px-2 font-mono font-black text-base text-amber-400 bg-[#081020]">
                        {total.toFixed(2)}
                      </td>
                    );
                  }
                  const total = js ? getJudgeTotal(js) : 15.40;
                  return (
                    <td key={jNum} className="border border-[#162540] py-5 px-2 font-mono font-black text-base text-amber-400 bg-[#081020]">
                      {total.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Nilai Juri Bertugas Row with green highlighted median/trimmed elements */}
        <div className="px-6 pt-1 pb-3 grid grid-cols-1 xl:grid-cols-12 gap-6 z-10">
          
          {/* Card list of J1 to J10 sorted ascending */}
          <div className="xl:col-span-9 bg-[#070e1c] border border-[#162540] p-5 rounded-xl space-y-3.5 shadow-xl">
            <span className="text-[10px] text-zinc-400 font-mono font-black tracking-widest block uppercase">
              NILAI JURI BERTUGAS (URUTAN TERKECIL KE TERBESAR)
            </span>
            
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-10 gap-3">
              {(() => {
                const onDutyScores = juriScores.filter(js => js.id <= judgesCount);
                const judgeScoresWithId = onDutyScores.map(js => ({ id: js.id, val: getJudgeTotal(js) }));
                const sortedPairs = [...judgeScoresWithId].sort((a, b) => a.val - b.val);
                
                return sortedPairs.map((pair, index) => {
                  let isMedian = false;
                  if (judgesCount === 10) {
                    isMedian = index === 4 || index === 5;
                  } else if (judgesCount === 5) {
                    // For 5 judges, median/trimmed middle elements are index 1, 2, 3 (excluding highest and lowest: index 0 and 4)
                    isMedian = index === 1 || index === 2 || index === 3;
                  } else if (judgesCount === 3) {
                    isMedian = true; // All 3 count for average
                  }
                  
                  return (
                    <div 
                      key={pair.id} 
                      className={`text-center py-2 px-1 rounded-lg border transition-all ${
                        isMedian
                          ? "bg-emerald-950/60 border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                          : "bg-rose-950/30 border-rose-900/40 opacity-60 line-through"
                      }`}
                    >
                      <span className="text-[10px] text-zinc-400 font-mono block">J{pair.id}</span>
                      <span className={`text-sm font-black font-mono block mt-1 ${
                        isMedian ? "text-emerald-400 font-black" : "text-rose-400"
                      }`}>
                        {pair.val.toFixed(2)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Median Display Card */}
          <div className="xl:col-span-3 bg-[#070e1c] border-2 border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.15)] p-5 rounded-xl flex flex-col justify-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-amber-400/[0.04] to-transparent pointer-events-none" />
            <span className="text-[10px] text-amber-400 font-mono font-black tracking-widest uppercase">
              NILAI MEDIAN ({judgesCount} JURI)
            </span>
            <div className="text-4xl font-mono font-black text-amber-400 mt-1.5 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
              {(() => {
                const activeScores = juriScores.filter(js => js.id <= judgesCount);
                const vals = activeScores.map(js => getJudgeTotal(js));
                if (vals.length === 0) return "0.000";
                const median = calculateMedian(vals);
                return median.toFixed(3);
              })()}
            </div>
          </div>
        </div>

        {/* Bottom Banner Row: Skor Akhir & Standar Deviasi */}
        <div className="px-6 pt-1 pb-4 grid grid-cols-1 md:grid-cols-2 gap-6 z-10">
          
          {/* Final Score Card */}
          <div className="bg-[#070e1c] border-2 border-amber-400/50 rounded-xl p-5 flex justify-between items-center shadow-[0_0_25px_rgba(251,191,36,0.15)]">
            <div>
              <span className="text-sm font-black text-amber-400 tracking-widest block uppercase font-mono">SKOR AKHIR SAH</span>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5 uppercase">
                SKOR KEPUTUSAN MINUS DENDA DEWAN (-{getDewanDeductionValue().toFixed(2)})
              </p>
            </div>
            <div className="text-5xl font-mono font-black text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]">
              {calcResult.finalScore.toFixed(3)}
            </div>
          </div>

          {/* SD Card */}
          <div className="bg-[#070e1c] border border-emerald-500/50 rounded-xl p-5 flex justify-between items-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <div>
              <span className="text-sm font-black text-emerald-400 tracking-widest block uppercase font-mono">STANDAR DEVIASI</span>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5 uppercase">
                DISTRIBUSI NILAI {judgesCount} JURI BERTUGAS
              </p>
            </div>
            <div className="text-3xl font-mono font-black text-emerald-400 tracking-widest">
              {(() => {
                const activeScores = juriScores.filter(js => js.id <= judgesCount);
                const sd = calculateSD(activeScores);
                return sd.toFixed(9);
              })()}
            </div>
          </div>
        </div>

        {/* Deduction Inputs Modal Overlay */}
        {showDeductionsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[#070e1c] border border-[#162540] rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
              <button 
                onClick={() => setShowDeductionsModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-all font-bold text-lg"
              >
                ✕
              </button>
              
              <h3 className="text-lg font-black text-white uppercase tracking-wider border-b border-[#162540] pb-4 mb-6 flex items-center gap-2 font-mono">
                <AlertTriangle className="text-rose-400" size={18} /> INPUT HUKUMAN DEWAN JURI
              </h3>

              <div className="space-y-4">
                {/* 1. Timing Over/Under */}
                <div className="bg-[#050b16] p-4 rounded-xl border border-[#162540] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300 uppercase font-sans">Deviasi Batas Waktu (Over/Under)</span>
                    <span className="text-xs font-mono text-rose-400 font-bold">-${(deductions.timeOverUnder * 0.01).toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Denda -0.01 per dtk untuk keterlambatan atau kecepatan tampil dari batas waktu {durasiTampil} ({getDurasiSeconds(durasiTampil)} dtk).
                  </p>
                  
                  {/* T1 vs T2 Info Strip */}
                  <div className="grid grid-cols-2 gap-2 bg-[#081020] p-2.5 rounded-lg border border-[#162540] text-[10px] font-mono">
                    <div>
                      <span className="text-zinc-500 uppercase block text-[8px]">T1: KETEPATAN (Max)</span>
                      <span className="text-amber-400 font-bold">{formatTime(timeRemaining)} ({timeRemaining}s)</span>
                    </div>
                    <div className="border-l border-[#162540] pl-2.5">
                      <span className="text-zinc-500 uppercase block text-[8px]">T2: SEBENARNYA (Nyata)</span>
                      <span className="text-cyan-400 font-bold">{formatTime(timeActual)} ({timeActual}s)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => {
                        const newD = { ...deductions, timeOverUnder: Math.max(0, deductions.timeOverUnder - 1) };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("short_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-700/60 cursor-pointer"
                    >
                      -1s
                    </button>
                    <div className="flex-1 bg-[#040813] py-2 border border-[#162540] rounded-lg text-center font-mono font-bold text-xs text-white">
                      {deductions.timeOverUnder} DETIK DEVIASI
                    </div>
                    <button
                      onClick={() => {
                        const newD = { ...deductions, timeOverUnder: deductions.timeOverUnder + 1 };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("short_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-700/60 cursor-pointer"
                    >
                      +1s
                    </button>
                  </div>

                  {/* Auto-calculate button */}
                  <button
                    onClick={() => {
                      const limit = getDurasiSeconds(durasiTampil);
                      const diff = Math.abs(timeActual - limit);
                      const newD = { ...deductions, timeOverUnder: diff };
                      saveSharedState({ deductions: newD });
                      playSoundByKey("success_chime");
                    }}
                    className="w-full mt-1 bg-[#0b172a] hover:bg-[#122442] border border-cyan-700/60 text-cyan-300 hover:text-white py-2 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
                  >
                    ⚡ Hitung Selisih Otomatis ({Math.abs(timeActual - getDurasiSeconds(durasiTampil))} dtk)
                  </button>
                </div>

                {/* 2. Weapon Drops */}
                <div className="bg-[#050b16] p-4 rounded-xl border border-[#162540] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300 uppercase">Senjata Jatuh / Lepas</span>
                    <span className="text-xs font-mono text-rose-400 font-bold">-${(deductions.weaponDrop * 0.50).toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Hukuman -0.50 setiap kali senjata terlepas dari tangan.</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => {
                        const newD = { ...deductions, weaponDrop: Math.max(0, deductions.weaponDrop - 1) };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("short_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-700/60 cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex-1 bg-[#040813] py-2 border border-[#162540] rounded-lg text-center font-mono font-bold text-xs text-white">
                      {deductions.weaponDrop} KALI JATUH
                    </div>
                    <button
                      onClick={() => {
                        const newD = { ...deductions, weaponDrop: deductions.weaponDrop + 1 };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("warning_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-700/60 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 3. Out of Bounds */}
                <div className="bg-[#050b16] p-4 rounded-xl border border-[#162540] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300 uppercase">Keluar Gelanggang</span>
                    <span className="text-xs font-mono text-rose-400 font-bold">-${(deductions.outOfBounds * 0.50).toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Denda -0.50 jika atlet melangkah keluar garis arena.</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => {
                        const newD = { ...deductions, outOfBounds: Math.max(0, deductions.outOfBounds - 1) };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("short_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-700/60 cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex-1 bg-[#040813] py-2 border border-[#162540] rounded-lg text-center font-mono font-bold text-xs text-white">
                      {deductions.outOfBounds} KALI KELUAR
                    </div>
                    <button
                      onClick={() => {
                        const newD = { ...deductions, outOfBounds: deductions.outOfBounds + 1 };
                        saveSharedState({ deductions: newD });
                        playSoundByKey("short_beep");
                      }}
                      className="bg-[#0b172a] hover:bg-[#122442] text-cyan-300 font-extrabold w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-700/60 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 4. Costume Violation */}
                <div className="bg-[#050b16] p-4 rounded-xl border border-[#162540] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300 uppercase">Pelanggaran Pakaian</span>
                    <span className="text-xs font-mono text-rose-400 font-bold">-${(deductions.costumeMistake ? 0.50 : 0).toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500">Denda flat -0.50 jika aksesoris jatuh atau tidak lengkap.</p>
                  <button
                    onClick={() => {
                      const newD = { ...deductions, costumeMistake: !deductions.costumeMistake };
                      saveSharedState({ deductions: newD });
                      playSoundByKey(deductions.costumeMistake ? "short_beep" : "warning_beep");
                    }}
                    className={`w-full py-3 rounded-xl text-xs font-bold border transition-all flex justify-center items-center gap-2 cursor-pointer ${
                      deductions.costumeMistake 
                        ? "bg-rose-950/60 border-rose-500 text-rose-300 animate-pulse" 
                        : "bg-[#0b172a] border-[#162540] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {deductions.costumeMistake ? <CheckSquare size={14} /> : <Square size={14} />}
                    {deductions.costumeMistake ? "TERKENA DENDA (-0.50)" : "TIDAK ADA PELANGGARAN"}
                  </button>
                </div>

                {/* 5. Other Penalty */}
                <div className="space-y-2">
                  <label className="text-[11px] text-zinc-400 font-mono font-bold uppercase">Hukuman Lainnya Dewan Juri</label>
                  <div className="flex gap-4">
                    <input
                      type="number"
                      step="0.10"
                      value={deductions.otherPenalty || ""}
                      onChange={(e) => {
                        const newD = { ...deductions, otherPenalty: Number(e.target.value) };
                        saveSharedState({ deductions: newD });
                      }}
                      className="bg-[#050b16] border border-[#162540] rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-cyan-500 w-32"
                      placeholder="Ex: -0.10"
                    />
                    <p className="text-[10px] text-zinc-500 leading-normal flex-1">
                      Gunakan input ini jika terdapat hukuman kustom dewan lainnya yang tidak tercantum di atas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#162540] flex justify-end">
                <button
                  onClick={() => setShowDeductionsModal(false)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-6 py-2.5 rounded-full transition-all cursor-pointer font-mono"
                >
                  Selesai &amp; Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DISK - UD Special Status Modal Overlay */}
        {showDiskUDModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[#070e1c] border border-rose-500/40 rounded-2xl p-8 max-w-md w-full shadow-2xl relative animate-scale-up">
              <button 
                onClick={() => setShowDiskUDModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-all font-bold text-lg"
              >
                ✕
              </button>
              
              <div className="text-center space-y-4">
                <span className="bg-rose-950 text-rose-400 border border-rose-900 text-[10px] font-mono px-3.5 py-1 rounded-full uppercase tracking-wider font-bold">
                  DEWAN JURI OVERLAY
                </span>
                
                <h3 className="text-xl font-black text-white uppercase tracking-wider font-mono">
                  STATUS KHUSUS ATLET
                </h3>

                <div className={`p-4 rounded-xl border text-center ${
                  activeCorner === "biru" 
                    ? "bg-blue-950/30 border-blue-500/40 text-blue-200" 
                    : "bg-rose-950/30 border-rose-500/40 text-rose-200"
                }`}>
                  <span className="text-[10px] font-mono uppercase tracking-widest block font-bold">
                    SUDUT YANG SEDANG AKTIF
                  </span>
                  <p className="text-lg font-black mt-1 uppercase font-mono">
                    {activeCorner === "biru" ? "SUDUT BIRU" : "SUDUT MERAH"}
                  </p>
                  <p className="text-base font-extrabold text-white mt-2 font-mono">
                    {activeCorner === "biru" ? namaAtlitBiru : namaAtlitMerah}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 font-mono uppercase">
                    KONTINGEN: {activeCorner === "biru" ? kontingenBiru : kontingenMerah}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-2">
                  <button
                    onClick={() => {
                      playSoundByKey("buzzer");
                      if (activeCorner === "biru") {
                        saveSharedState({ disqualifiedBiru: true, undurDiriBiru: false });
                      } else {
                        saveSharedState({ disqualifiedMerah: true, undurDiriMerah: false });
                      }
                      const updatedLogs = [
                        { time: formatTime(timeRemaining), msg: `DEWAN JURI MENGDISKUALIFIKASI ${activeCorner === "biru" ? "SUDUT BIRU" : "SUDUT MERAH"} (${activeCorner === "biru" ? namaAtlitBiru : namaAtlitMerah})`, type: "deduction" as const },
                        ...logs
                      ];
                      saveSharedState({ logs: updatedLogs });
                      setShowDiskUDModal(false);
                      alert(`${activeCorner === "biru" ? "SUDUT BIRU" : "SUDUT MERAH"} TELAH DIDISKUALIFIKASI.`);
                    }}
                    className={`py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer font-mono ${
                      (activeCorner === "biru" ? disqualifiedBiru : disqualifiedMerah)
                        ? "bg-rose-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] border border-rose-500"
                        : "bg-rose-950/40 text-rose-400 border border-rose-900/60 hover:bg-rose-900/60"
                    }`}
                  >
                    ⚡ DISKUALIFIKASI
                  </button>

                  <button
                    onClick={() => {
                      playSoundByKey("warning_beep");
                      if (activeCorner === "biru") {
                        saveSharedState({ undurDiriBiru: true, disqualifiedBiru: false });
                      } else {
                        saveSharedState({ undurDiriMerah: true, disqualifiedMerah: false });
                      }
                      const updatedLogs = [
                        { time: formatTime(timeRemaining), msg: `DEWAN JURI MENYATAKAN ${activeCorner === "biru" ? "SUDUT BIRU" : "SUDUT MERAH"} UNDUR DIRI (WALKOVER)`, type: "system" as const },
                        ...logs
                      ];
                      saveSharedState({ logs: updatedLogs });
                      setShowDiskUDModal(false);
                      alert(`${activeCorner === "biru" ? "SUDUT BIRU" : "SUDUT MERAH"} MENYATAKAN UNDUR DIRI.`);
                    }}
                    className={`py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer font-mono ${
                      (activeCorner === "biru" ? undurDiriBiru : undurDiriMerah)
                        ? "bg-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.5)] border border-amber-500"
                        : "bg-amber-950/40 text-amber-400 border border-amber-900/60 hover:bg-amber-900/60"
                    }`}
                  >
                    🏳 UNDUR DIRI (WD)
                  </button>

                  <button
                    onClick={() => {
                      playSoundByKey("success_chime");
                      if (activeCorner === "biru") {
                        saveSharedState({ disqualifiedBiru: false, undurDiriBiru: false });
                      } else {
                        saveSharedState({ disqualifiedMerah: false, undurDiriMerah: false });
                      }
                      const updatedLogs = [
                        { time: formatTime(timeRemaining), msg: `DEWAN JURI MENGEMBALIKAN STATUS NORMAL UNTUK ${activeCorner === "biru" ? "SUDUT BIRU" : "SUDUT MERAH"}`, type: "system" as const },
                        ...logs
                      ];
                      saveSharedState({ logs: updatedLogs });
                      setShowDiskUDModal(false);
                    }}
                    className="py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest bg-[#0b172a] border border-[#162540] text-zinc-300 hover:text-white transition-all cursor-pointer font-mono"
                  >
                    ✓ KEMBALI NORMAL
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Logs Overlay Modal */}
        {showLogsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[#070e1c] border border-[#162540] rounded-2xl p-6 max-w-lg w-full shadow-2xl relative">
              <button 
                onClick={() => setShowLogsModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-all font-bold text-lg"
              >
                ✕
              </button>
              
              <h3 className="text-base font-black text-white uppercase tracking-wider border-b border-[#162540] pb-3 mb-4 font-mono">
                LOG AKTIVITAS PERTANDINGAN
              </h3>

              <div className="bg-[#050b16] p-4 rounded-xl border border-[#162540] h-[300px] overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-[#162540]">
                {logs.map((log, idx) => (
                  <div key={idx} className="text-[11px] font-mono flex items-start gap-2.5 leading-normal">
                    <span className="text-cyan-400 font-bold">[{log.time}]</span>
                    <span className={log.type === "deduction" ? "text-rose-400" : log.type === "score" ? "text-emerald-400" : "text-zinc-300"}>
                      {log.msg}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-[#162540] flex justify-end">
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-6 py-2.5 rounded-full transition-all cursor-pointer font-mono"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // 4. ROLE: JURI VIEW (Input Scoring Plate for Judges - DISCORS Style)
  if (role === "juri") {
    const isBiru = activeCorner === "biru" || activeCorner === "" || !activeCorner;
    const currentContingent = isBiru ? (kontingenBiru || "SINGAPORE") : (kontingenMerah || "INDONESIA");
    const currentAthleteName = isBiru ? (namaAtlitBiru || "ATLIT BIRU") : (namaAtlitMerah || "ATLIT MERAH");

    const currentScoreList = isBiru ? juriScoresBiru : juriScoresMerah;
    const js = currentScoreList.find(j => j.id === localJuriId) || { 
      id: localJuriId, 
      kebenaran: 9.90, 
      kemantapan: 0.00, 
      wrongMoves: 0, 
      flowScore: 0.00, 
      submitted: false 
    };

    const wrongMoves = js.wrongMoves !== undefined ? js.wrongMoves : Math.max(0, Math.round((9.90 - js.kebenaran) * 100));
    const accuracyScore = Math.max(0, Number((9.90 - wrongMoves * 0.01).toFixed(2)));
    const flowScore = js.flowScore !== undefined ? js.flowScore : (js.kemantapan <= 0.10 ? js.kemantapan : 0.00);
    const totalScore = Number((accuracyScore + flowScore).toFixed(2));

    const updateScoreListForCurrentJudge = (updater: (prev: JuriScore) => JuriScore) => {
      const updatedList = (isBiru ? juriScoresBiru : juriScoresMerah).map(score => {
        if (score.id === localJuriId) {
          return updater(score);
        }
        return score;
      });

      if (isBiru) {
        setJuriScoresBiru(updatedList);
        setJuriScores(updatedList);
        saveSharedState({ juriScoresBiru: updatedList, juriScores: updatedList });
      } else {
        setJuriScoresMerah(updatedList);
        setJuriScores(updatedList);
        saveSharedState({ juriScoresMerah: updatedList, juriScores: updatedList });
      }
    };

    const handleWrongMove = () => {
      const nextWrong = wrongMoves + 1;
      const nextAcc = Math.max(0, Number((9.90 - nextWrong * 0.01).toFixed(2)));
      playSoundByKey("short_beep");

      updateScoreListForCurrentJudge(prev => ({
        ...prev,
        wrongMoves: nextWrong,
        kebenaran: nextAcc,
        flowScore: flowScore,
        kemantapan: flowScore
      }));
    };

    const handleBackspace = () => {
      if (wrongMoves <= 0) return;
      const nextWrong = wrongMoves - 1;
      const nextAcc = Math.max(0, Number((9.90 - nextWrong * 0.01).toFixed(2)));
      playSoundByKey("short_beep");

      updateScoreListForCurrentJudge(prev => ({
        ...prev,
        wrongMoves: nextWrong,
        kebenaran: nextAcc,
        flowScore: flowScore,
        kemantapan: flowScore
      }));
    };

    const handleFlowSelect = (val: number) => {
      const nextFlow = flowScore === val ? 0.00 : val;
      playSoundByKey("short_beep");

      updateScoreListForCurrentJudge(prev => ({
        ...prev,
        flowScore: nextFlow,
        kemantapan: nextFlow,
        kebenaran: accuracyScore,
        wrongMoves: wrongMoves
      }));
    };

    const handleReadySubmit = () => {
      playSoundByKey("success_chime");
      const nextSubmitted = !js.submitted;

      updateScoreListForCurrentJudge(prev => ({
        ...prev,
        submitted: nextSubmitted
      }));

      const cornerLabel = isBiru ? "SUDUT BIRU" : "SUDUT MERAH";
      const logType: "score" | "system" = nextSubmitted ? "score" : "system";
      const updatedLogs = [
        { 
          time: formatTime(timeRemaining), 
          msg: `JURI ${localJuriId} (${cornerLabel}): Skor ${totalScore.toFixed(2)} ${nextSubmitted ? 'TERKIRIM (READY)' : 'DITARIK / DIEDIT'}`, 
          type: logType
        },
        ...logs
      ];
      saveSharedState({ logs: updatedLogs });
    };

    const handleCornerSwitch = (targetCorner: "biru" | "merah") => {
      setActiveCorner(targetCorner);
      const nextName = targetCorner === "biru" ? namaAtlitBiru : namaAtlitMerah;
      const nextCont = targetCorner === "biru" ? kontingenBiru : kontingenMerah;
      setPerformerName(nextName);
      setContingent(nextCont);
      playSoundByKey("short_beep");
      saveSharedState({
        activeCorner: targetCorner,
        performerName: nextName,
        contingent: nextCont,
        juriScores: targetCorner === "biru" ? juriScoresBiru : juriScoresMerah
      });
    };

    const resetToReadyDefault = () => {
      playSoundByKey("success_chime");
      updateScoreListForCurrentJudge(prev => ({
        ...prev,
        wrongMoves: 0,
        kebenaran: 9.90,
        flowScore: 0.00,
        kemantapan: 0.00,
        submitted: false
      }));
    };

    const categoryDisplayName = 
      selectedCategory === "tunggal" ? "TUNGGAL/SINGLE" :
      selectedCategory === "ganda" ? "GANDA" :
      selectedCategory === "regu" ? "REGU" : "SOLO KREATIF";

    const subheaderTitle = 
      selectedCategory === "tunggal" ? "JURUS TUNGGAL FULL (JURUS 1 - 14)" :
      selectedCategory === "regu" ? "JURUS REGU FULL (JURUS 1 - 100)" :
      selectedCategory === "ganda" ? "JURUS GANDA (3 MENIT)" : "SOLO KREATIF SENI (3 MENIT)";

    return (
      <div className="min-h-screen bg-[#040813] text-white flex flex-col justify-between select-none font-sans overflow-x-hidden">
        
        {/* TOP HEADER BAR */}
        <header className="bg-[#070e1c] border-b border-[#162540] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 z-20 shadow-lg">
          
          {/* Athlete and Contingent (Left) */}
          <div className="flex flex-col">
            <span className="text-[11px] sm:text-xs font-bold text-cyan-400 uppercase tracking-wider leading-tight font-mono">
              {currentContingent}
            </span>
            <span className="text-sm sm:text-lg font-black text-white uppercase tracking-wide leading-tight mt-0.5 font-mono">
              {currentAthleteName}
            </span>
          </div>

          {/* Pill Corner Switcher (Center) */}
          <div className="flex items-center bg-[#050b16] p-0.5 rounded-lg border border-[#162540] shadow-inner">
            <button
              onClick={() => handleCornerSwitch("biru")}
              className={`px-4 sm:px-7 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all cursor-pointer font-mono ${
                isBiru 
                  ? "bg-[#1e61ff] text-white shadow-md shadow-blue-900/60" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              BIRU
            </button>
            <button
              onClick={() => handleCornerSwitch("merah")}
              className={`px-4 sm:px-7 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all cursor-pointer font-mono ${
                !isBiru 
                  ? "bg-[#e11d48] text-white shadow-md shadow-rose-900/60" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              MERAH
            </button>
          </div>

          {/* Arena, Match & Category (Right) */}
          <div className="flex flex-col text-right">
            <span className="text-[10px] sm:text-xs font-mono font-medium text-zinc-400 uppercase tracking-tight">
              GELANGGANG 1, Partai {partaiTanding || "2"}
            </span>
            <span className="text-xs sm:text-base font-black text-amber-400 uppercase tracking-wider leading-tight mt-0.5 font-mono">
              {categoryDisplayName}
            </span>
          </div>
        </header>

        {/* SUB-HEADER BANNER & MATCH STATUS STRIP */}
        <div className="bg-[#050b16] border-b border-[#162540] px-4 sm:px-8 py-2 flex items-center justify-between">
          <div className="min-w-[60px] flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase hidden sm:inline font-bold">SALAH:</span>
            <span className="text-xl sm:text-2xl font-mono font-black text-amber-400 leading-none">
              {wrongMoves}
            </span>
          </div>

          <div className="text-center flex-1">
            <span className="text-xs sm:text-sm font-bold text-zinc-200 uppercase tracking-widest font-mono">
              {subheaderTitle}
            </span>
          </div>

          <div className="min-w-[60px] text-right flex items-center justify-end gap-2">
            <span className={`text-xs sm:text-sm font-mono font-black tracking-widest uppercase ${
              isMatchUnlocked ? "text-emerald-400" : "text-rose-400"
            }`}>
              {isMatchUnlocked ? "UNLOCKED" : "LOCKED"}
            </span>

            {/* Quick Juri Selector Dropdown */}
            <select
              value={localJuriId}
              onChange={(e) => {
                setLocalJuriId(Number(e.target.value));
                playSoundByKey("short_beep");
              }}
              className="bg-[#070e1c] border border-[#162540] text-amber-400 font-mono font-bold text-[10px] sm:text-xs px-2 py-1 rounded-lg focus:outline-none cursor-pointer"
              title="Pilih ID Juri untuk Tablet Ini"
            >
              {juriScores.map(score => (
                <option key={score.id} value={score.id} className="bg-[#070e1c] text-white">
                  JURI {score.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* STANDBY / READY MODE BANNER */}
        {js.submitted && (
          <div className="bg-emerald-950/40 border-b border-emerald-500/40 px-4 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-xs font-mono font-black text-emerald-400 uppercase tracking-wider">
                NILAI TERKIRIM KE SERVER ({totalScore.toFixed(2)}) — STANDBY SIAP PENILAIAN BERIKUTNYA
              </span>
            </div>
            <button
              onClick={resetToReadyDefault}
              className="bg-emerald-800/80 hover:bg-emerald-700 text-white text-[10px] font-mono font-bold px-3 py-0.5 rounded border border-emerald-400 cursor-pointer uppercase transition-all"
            >
              MODE SIAP PENILAIAN
            </button>
          </div>
        )}

        {/* MAIN 3-COLUMN TOUCH SCREEN */}
        <main className="flex-1 px-3 sm:px-6 py-3 sm:py-4 grid grid-cols-12 gap-3 sm:gap-5 items-stretch min-h-[300px] sm:min-h-[380px] max-w-7xl mx-auto w-full">
          
          {/* LEFT TOUCH AREA: WRONG MOVE */}
          <div 
            onClick={handleWrongMove}
            className="col-span-5 bg-[#070e1c] hover:bg-[#0b172a] active:scale-[0.985] border-2 border-[#162540] hover:border-cyan-500/60 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all shadow-2xl p-4 select-none group"
            title="Tekan untuk Menambahkan Kesalahan Gerak (-0.01)"
          >
            <span className="text-base sm:text-xl md:text-2xl font-black text-slate-300 group-hover:text-cyan-300 uppercase tracking-widest text-center transition-colors font-mono">
              WRONG MOVE
            </span>
            <span className="text-[10px] font-mono text-zinc-500 mt-2 block sm:hidden">
              Tap (-0.01)
            </span>
          </div>

          {/* CENTER AREA: DISCORS EMBLEM LOGO */}
          <div className="col-span-2 flex flex-col items-center justify-center relative select-none py-2">
            
            {/* DISCORS Vector Shield Crest */}
            <div className="relative flex flex-col items-center justify-center filter drop-shadow-[0_0_18px_rgba(0,229,255,0.3)]">
              <svg 
                viewBox="0 0 200 200" 
                className="w-24 sm:w-32 md:w-40 h-24 sm:h-32 md:h-40 transition-transform duration-300"
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Outer Wing Accents Red & Cyan */}
                <polygon points="100,10 175,45 190,110 160,165 100,195 40,165 10,110 25,45" fill="#070e1c" stroke="#00e5ff" strokeWidth="2.5" />
                <polygon points="100,18 168,50 180,108 152,158 100,186 48,158 20,108 32,50" fill="#040813" />
                
                {/* Right Red Wing Gradient */}
                <path d="M100 20 L165 50 L140 100 L100 70 Z" fill="url(#redWingGrad)" />
                {/* Left Cyan Wing Gradient */}
                <path d="M100 20 L35 50 L60 100 L100 70 Z" fill="url(#cyanWingGrad)" />
                
                {/* Inner Silhouette / Mask Headgear */}
                <path d="M100 35 L125 70 L115 110 L100 120 L85 110 L75 70 Z" fill="#0b172a" stroke="#38bdf8" strokeWidth="2" />
                <polygon points="100,45 118,72 100,85 82,72" fill="#070e1c" stroke="#ef4444" strokeWidth="1.5" />
                
                {/* Eye Slits Glow */}
                <line x1="88" y1="75" x2="96" y2="78" stroke="#00e5ff" strokeWidth="3" strokeLinecap="round" />
                <line x1="112" y1="75" x2="104" y2="78" stroke="#00e5ff" strokeWidth="3" strokeLinecap="round" />

                {/* Martial Arms Graphic */}
                <path d="M50 115 L80 105 L100 120 L120 105 L150 115 L135 140 L100 130 L65 140 Z" fill="#070e1c" stroke="#00e5ff" strokeWidth="1.5" />

                {/* Gradients */}
                <defs>
                  <linearGradient id="redWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#881337" />
                  </linearGradient>
                  <linearGradient id="cyanWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00e5ff" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>
                </defs>
              </svg>

              {/* DISCORS Metallic Typography Banner */}
              <div className="mt-[-28px] sm:mt-[-35px] flex flex-col items-center z-10">
                <div className="bg-gradient-to-b from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent text-sm sm:text-base md:text-lg font-black tracking-wider uppercase font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  DISCORS
                </div>
                <div className="bg-[#070e1c] border border-cyan-500/50 px-2.5 py-0.5 rounded-full mt-0.5 shadow-md">
                  <span className="text-[7px] sm:text-[8px] font-mono font-black text-cyan-300 uppercase tracking-tight whitespace-nowrap block">
                    DIGITAL SCORING PENCAK SILAT
                  </span>
                </div>
              </div>
            </div>

            {/* Active Judge Badge */}
            <div className="mt-3 bg-[#070e1c] border border-[#162540] px-3 py-1 rounded-md flex items-center gap-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">
                JURI {localJuriId}
              </span>
            </div>
          </div>

          {/* RIGHT TOUCH AREA: READY */}
          <div 
            onClick={handleReadySubmit}
            className={`col-span-5 active:scale-[0.985] border-2 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all shadow-2xl p-4 select-none ${
              js.submitted 
                ? "bg-emerald-950/60 border-emerald-400/80 text-white shadow-emerald-900/60" 
                : "bg-cyan-950/60 hover:bg-cyan-900/70 border-cyan-500/60 text-white shadow-cyan-950/80"
            }`}
            title="Tekan untuk Menandai Status Ready / Kirim Nilai"
          >
            <span className="text-base sm:text-xl md:text-2xl font-black text-white uppercase tracking-widest text-center drop-shadow-md font-mono">
              {js.submitted ? "SUBMITTED" : "READY"}
            </span>
            {js.submitted && (
              <span className="text-[10px] font-mono text-emerald-300 mt-1 font-bold">
                ✓ Nilai Terkirim ({totalScore.toFixed(2)})
              </span>
            )}
          </div>

        </main>

        {/* BOTTOM CONTROLS & SCORING BAR */}
        <footer className="bg-[#040813] border-t-2 border-[#162540] px-3 sm:px-6 py-2.5 space-y-2 z-20 shadow-2xl">
          
          {/* ROW 1: BACKSPACE & ACCURACY TOTAL SCORE */}
          <div className="flex items-center justify-between gap-3 border-b border-[#162540] pb-2">
            
            {/* Backspace Button */}
            <button
              onClick={handleBackspace}
              disabled={wrongMoves <= 0}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border ${
                wrongMoves > 0 
                  ? "bg-[#070e1c] hover:bg-[#0b172a] text-amber-400 hover:text-amber-300 border-[#162540] cursor-pointer active:scale-95 shadow" 
                  : "bg-[#050b16] text-zinc-600 border-[#162540] cursor-not-allowed opacity-60"
              }`}
              title="Hapus Kesalahan Terakhir (+0.01)"
            >
              <span className="text-sm">⌫</span>
              <span>BACKSPACE</span>
            </button>

            {/* Accuracy Total Score Label */}
            <div className="text-center flex-1">
              <span className="text-xs sm:text-sm font-mono font-bold text-zinc-300 uppercase tracking-widest">
                ACCURACY TOTAL SCORE
              </span>
            </div>

            {/* Accuracy Total Score Value */}
            <div className="min-w-[80px] text-right">
              <span className="text-xl sm:text-2xl font-mono font-black text-cyan-400 leading-none">
                {accuracyScore.toFixed(2)}
              </span>
            </div>
          </div>

          {/* ROW 2: FLOW OF MOVEMENT / STAMINA (0.01 - 0.10) */}
          <div className="space-y-1 border-b border-[#162540] pb-2">
            <div className="text-center">
              <span className="text-[10px] sm:text-[11px] font-mono font-bold text-zinc-300 uppercase tracking-wider">
                FLOW OF MOVEMENT / STAMINA (range score : 0.01 - 0.10)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="grid grid-cols-10 gap-1 sm:gap-1.5 flex-1">
                {[0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10].map(val => {
                  const isSelected = Math.abs(flowScore - val) < 0.001;
                  return (
                    <button
                      key={val}
                      onClick={() => handleFlowSelect(val)}
                      className={`py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-mono font-bold transition-all cursor-pointer border ${
                        isSelected 
                          ? "bg-cyan-600 border-cyan-400 text-white font-black shadow-md shadow-cyan-900/60 scale-105" 
                          : "bg-[#070e1c] hover:bg-[#0b172a] text-zinc-300 hover:text-white border-[#162540]"
                      }`}
                    >
                      {val.toFixed(2)}
                    </button>
                  );
                })}
              </div>

              {/* Selected Flow Value */}
              <div className="min-w-[80px] text-right pl-2">
                <span className="text-lg sm:text-xl font-mono font-black text-cyan-400 leading-none">
                  {flowScore.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* ROW 3: TOTAL SCORE */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="w-[120px] flex items-center gap-2">
              <button
                onClick={resetToReadyDefault}
                className="text-[10px] font-mono text-zinc-400 hover:text-cyan-300 uppercase underline cursor-pointer"
                title="Reset lembar ke default 9.90"
              >
                Reset Default
              </button>
            </div>

            <div className="text-center flex-1">
              <span className="text-xs sm:text-sm font-mono font-black text-amber-400 uppercase tracking-widest">
                TOTAL SCORE
              </span>
            </div>

            <div className="min-w-[80px] text-right">
              <span className="text-2xl sm:text-3xl font-mono font-black text-amber-400 leading-none">
                {totalScore.toFixed(2)}
              </span>
            </div>
          </div>

          {/* ROW 4: FOOTER BOTTOM INFO */}
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-[#162540]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setRole(null); playSoundByKey("short_beep"); }}
                className="hover:text-cyan-300 transition-colors cursor-pointer"
              >
                ← KEMBALI KE MENU PERAN
              </button>
              <span>•</span>
              <button
                onClick={toggleFullScreen}
                className="hover:text-cyan-300 transition-colors cursor-pointer"
              >
                {isFs ? "Exit Fullscreen" : "Fullscreen"}
              </button>
            </div>

            <div className="uppercase tracking-wider font-semibold text-cyan-400/70">
              NO DISCORS PENCAK SILAT - Versi 3.0
            </div>
          </div>

        </footer>

      </div>
    );
  }

  // 5. ROLE: MONITOR / SCOREBOARD VIEW (Ultra HD Dark Futuristic Stadium Arena Display)
  if (role === "monitor") {
    return (
      <SpectatorMonitorView
        selectedCategory={selectedCategory}
        selectedAge={selectedAge}
        gender={gender}
        performerName={performerName}
        contingent={contingent}
        timeRemaining={timeRemaining}
        timeActual={timeActual}
        isTimerRunning={isTimerRunning}
        isTimer1Running={isTimer1Running}
        isTimer2Running={isTimer2Running}
        durasiTampil={durasiTampil}
        partaiTanding={partaiTanding}
        tahapPertandingan={tahapPertandingan}
        namaEvent={namaEvent}
        tempatPelaksanaan={tempatPelaksanaan}
        waktuPelaksanaan={waktuPelaksanaan}
        namaAtlitBiru={namaAtlitBiru}
        kontingenBiru={kontingenBiru}
        namaAtlitMerah={namaAtlitMerah}
        kontingenMerah={kontingenMerah}
        activeCorner={activeCorner}
        juriScores={juriScores}
        juriScoresBiru={juriScoresBiru}
        juriScoresMerah={juriScoresMerah}
        deductions={deductions}
        deductionsBiru={deductionsBiru}
        deductionsMerah={deductionsMerah}
        judgesCount={judgesCount}
        disqualifiedBiru={disqualifiedBiru}
        undurDiriBiru={undurDiriBiru}
        disqualifiedMerah={disqualifiedMerah}
        undurDiriMerah={undurDiriMerah}
        logoKiri={logoKiri}
        logoKanan={logoKanan}
        isMatchUnlocked={isMatchUnlocked}
        onBack={() => setRole(null)}
        isFs={isFs}
        toggleFullScreen={toggleFullScreen}
        getCalculatedScoreForCorner={getCalculatedScoreForCorner}
        getFormattedScore={getFormattedScore}
        getJudgeTotal={getJudgeTotal}
        formatTime={formatTime}
        onSwitchCorner={(corner) => {
          saveSharedState({ activeCorner: corner });
        }}
      />
    );
  }

  // Fallback safe state
  return null;
}
