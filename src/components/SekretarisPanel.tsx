/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { MatchState, MatchStatus, FighterColor, ActionType } from "../types";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { 
  Play, 
  RotateCcw, 
  Settings, 
  Users, 
  FileSpreadsheet, 
  Printer, 
  TrendingUp, 
  Volume2, 
  Maximize2, 
  Minimize2, 
  Calendar, 
  Upload, 
  Download,
  RefreshCw,
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Award, 
  FileText, 
  Trash2, 
  Check, 
  ShieldCheck, 
  Clock, 
  ArrowLeft,
  Sliders,
  Sparkles,
  Search,
  ListOrdered,
  Settings2,
  Plus,
  X,
  PlusCircle,
  Megaphone, 
  FastForward, 
  Radio, 
  Network, 
  Wifi, 
  AlertCircle,
  CheckCircle,
  Lock,
  Unlock,
  Pause,
  Battery,
  BatteryCharging,
  Trophy,
  RotateCw,
  Eye,
  EyeOff,
  Edit,
  Shuffle,
  Zap,
  Activity,
  Layers,
  Power,
  ShieldAlert,
  Ban,
  AlertTriangle,
  Archive
} from "lucide-react";
import { sound } from "../utils/sound";
import { offlineEngine } from "../utils/offlineEngine";
import { LotingPanel } from "./LotingPanel";
import { BracketPanel } from "./BracketPanel";
import { JadwalPanel } from "./JadwalPanel";
import { GenerateJadwalTab } from "./GenerateJadwalTab";
import { ScoreVisualization } from "./ScoreVisualization";
import { ConnectionStatusIndicator } from "./ConnectionStatusIndicator";
import { TournamentBracketView } from "./TournamentBracketView";
import { 
  isDummyAthleteObj, 
  normalizeDivision, 
  autoSyncAndGenerateAllBrackets,
  generateMatchesForClass,
  generateRoundRobinMatchesForClass 
} from "../utils/baganGenerator";

export function DeviceBatteryIndicator() {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    let batteryObj: any = null;

    const handleLevelChange = () => {
      if (batteryObj && active) {
        setBatteryLevel(Math.round(batteryObj.level * 100));
      }
    };

    const handleChargingChange = () => {
      if (batteryObj && active) {
        setIsCharging(batteryObj.charging);
      }
    };

    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        if (!active) return;
        batteryObj = battery;
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        battery.addEventListener("levelchange", handleLevelChange);
        battery.addEventListener("chargingchange", handleChargingChange);
      }).catch((err: any) => {
        console.warn("Battery API error:", err);
        if (active) {
          setBatteryLevel(98);
          setIsCharging(false);
        }
      });
    } else {
      // Fallback
      setBatteryLevel(98);
      setIsCharging(false);
    }

    return () => {
      active = false;
      if (batteryObj) {
        batteryObj.removeEventListener("levelchange", handleLevelChange);
        batteryObj.removeEventListener("chargingchange", handleChargingChange);
      }
    };
  }, []);

  if (batteryLevel === null) return null;

  return (
    <div className="flex items-center gap-1.5 bg-[#0e0626] border border-indigo-500/15 px-2 py-1 rounded-lg text-slate-300 font-mono text-[10px] md:text-[11px] font-black shadow-inner" title={isCharging ? "Mengisi Daya" : "Level Baterai"}>
      {isCharging ? (
        <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
      ) : (
        <Battery className={`w-3.5 h-3.5 ${batteryLevel <= 20 ? "text-rose-500 animate-bounce" : batteryLevel <= 50 ? "text-amber-400" : "text-emerald-400"}`} />
      )}
      <span>{batteryLevel}%</span>
    </div>
  );
}

function BreakCountdownTimer() {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Play a long buzzer tone and alert complete
            sound.playBuzzer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const percentage = (timeLeft / 60) * 100;

  return (
    <div className="bg-[#07112a] border border-blue-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 text-left shadow-[0_0_20px_rgba(37,99,235,0.15)]">
      <div className="flex items-center gap-3">
        {/* SVG Circular indicator */}
        <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              className="stroke-blue-950 fill-none"
              strokeWidth="4"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              className="stroke-amber-400 fill-none transition-all duration-1000"
              strokeWidth="4"
              strokeDasharray="125.6"
              strokeDashoffset={125.6 - (125.6 * percentage) / 100}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[11px] font-mono font-black text-amber-400">
            {timeLeft}s
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest leading-none">
            ⏱️ TIMER JEDA ANTAR BABAK (1 MENIT)
          </span>
          <span className="text-[12px] text-white font-bold mt-1.5 leading-snug">
            {timeLeft > 0 ? (
              <>Hitung mundur otomatis sedang berjalan...</>
            ) : (
              <span className="text-red-400 animate-pulse font-black">WAKTU JEDA HABIS! 🔔</span>
            )}
          </span>
          <p className="text-[9.5px] text-slate-300 font-bold mt-0.5">
            Mundur dari 60 dtk. Mengeluarkan sinyal buzzer di akhir jeda.
          </p>
        </div>
      </div>
      
      {/* Play / Pause / Reset controls */}
      <div className="flex items-center gap-1.5 bg-[#030716] p-1.5 rounded-xl border border-blue-900/60">
        <button
          onClick={() => {
            sound.playClick();
            setIsActive(!isActive);
          }}
          className={`px-3 py-1.5 text-[9.5px] font-sans font-black rounded-lg uppercase transition-all tracking-wider cursor-pointer active:scale-95 border ${
            isActive ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-400" : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400"
          }`}
        >
          {isActive ? "Pause" : "Mulai"}
        </button>
        <button
          onClick={() => {
            sound.playClick();
            setTimeLeft(60);
            setIsActive(true);
          }}
          className="px-3 py-1.5 text-[9.5px] font-sans font-black bg-[#0b1638] hover:bg-[#13255c] text-cyan-300 rounded-lg uppercase transition-all tracking-wider cursor-pointer active:scale-95 border border-blue-500/30"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// IPSI Regulation Penalty Gesture Icon Components
function IconBinaan1({ className, active }: { className?: string; active?: boolean }) {
  return (
    <img 
      src={active ? "/binaan1_orange.png" : "/binaan1.png"} 
      alt="Binaan 1" 
      className={`${className} object-contain`} 
      referrerPolicy="no-referrer"
    />
  );
}

function IconBinaan2({ className, active }: { className?: string; active?: boolean }) {
  return (
    <img 
      src={active ? "/binaan2_orange.png" : "/binaan2.png"} 
      alt="Binaan 2" 
      className={`${className} object-contain`} 
      referrerPolicy="no-referrer"
    />
  );
}

function IconTeguran1({ className, active }: { className?: string; active?: boolean }) {
  return (
    <img 
      src={active ? "/teguran1_yellow.png" : "/teguran1.png"} 
      alt="Teguran 1" 
      className={`${className} object-contain`} 
      referrerPolicy="no-referrer"
    />
  );
}

function IconTeguran2({ className, active }: { className?: string; active?: boolean }) {
  return (
    <img 
      src={active ? "/teguran2_yellow.png" : "/teguran2.png"} 
      alt="Teguran 2" 
      className={`${className} object-contain`} 
      referrerPolicy="no-referrer"
    />
  );
}

function IconPeringatan1({ className, active }: { className?: string; active?: boolean }) {
  return (
    <img 
      src="/peringatan1.png" 
      alt="Peringatan 1" 
      className={`${className} object-contain ${active ? "brightness-125 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "opacity-80"}`} 
      referrerPolicy="no-referrer"
    />
  );
}

function IconPeringatan2({ className, active }: { className?: string; active?: boolean }) {
  return (
    <img 
      src="/peringatan2.png" 
      alt="Peringatan 2" 
      className={`${className} object-contain ${active ? "brightness-125 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "opacity-80"}`} 
      referrerPolicy="no-referrer"
    />
  );
}

export const formatPartaiDisplay = (val: any, fallback?: any): string => {
  if (!val && val !== 0 && !fallback && fallback !== 0) return "Partai -";
  const raw = String(val || fallback || "").trim();
  const cleaned = raw.replace(/^(partai\s*)+/i, "").trim();
  return cleaned ? `Partai ${cleaned}` : "Partai -";
};

export const formatPartaiUpper = (val: any, fallback?: any): string => {
  if (!val && val !== 0 && !fallback && fallback !== 0) return "PARTAI -";
  const raw = String(val || fallback || "").trim();
  const cleaned = raw.replace(/^(partai\s*)+/i, "").trim();
  return cleaned ? `PARTAI ${cleaned}` : "PARTAI -";
};

interface SekretarisPanelProps {
  state: MatchState | null;
  onUpdateMetadata: (data: Partial<MatchState>) => Promise<void>;
  onResetMatch: (customState?: MatchState) => Promise<void>;
  onTimerCommand?: (command: "START" | "PAUSE" | "ADD_10" | "SUB_10" | "RESET") => Promise<void> | void;
  onRoundAction?: (action: "NEXT" | "SET" | "FINISH", targetRound?: number) => Promise<void> | void;
  onDewanAction?: (action: { command: "DROP" | "LOCK" | "PENALTY" | "OVERRIDE" | "CANCEL_DROP" | "RESET_ROUND_PENALTIES" | "DECLARE_VICTORY"; fighter: "RED" | "BLUE"; penaltyType?: string; overridePoints?: number }) => Promise<void> | void;
  onBack: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  onSubScreenChange?: (isSubScreen: boolean) => void;
  onOpenOperatorPanel?: () => void;
  initialTab?: "INPUT" | "BAGAN" | "KONTROL" | "PARAMETER" | "REGISTRASI" | "LOTING";
}

export function SekretarisPanel({
  state,
  onUpdateMetadata,
  onResetMatch,
  onTimerCommand,
  onRoundAction,
  onDewanAction,
  onBack,
  onToggleFullscreen,
  isFullscreen,
  onSubScreenChange,
  onOpenOperatorPanel,
  initialTab,
}: SekretarisPanelProps) {
  // Local state for all editable fields to allow typing without jitter
  const [eventName, setEventName] = useState("");
  const [tempatPelaksanaan, setTempatPelaksanaan] = useState(() => {
    return localStorage.getItem("sekretaris_tempatPelaksanaan") || "";
  });
  const [waktuPelaksanaan, setWaktuPelaksanaan] = useState(() => {
    return localStorage.getItem("sekretaris_waktuPelaksanaan") || "";
  });
  const [partaiNumber, setPartaiNumber] = useState("");
  const [tahap, setTahap] = useState<"PENYISIHAN" | "PEREMPATFINAL" | "SEMIFINAL" | "FINAL">("PENYISIHAN");
  const [kelasNomor, setKelasNomor] = useState("");
  const [kategoriUsia, setKategoriUsia] = useState("DEWASA");
  const [gender, setGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [durasiTimer, setDurasiTimer] = useState(120); // seconds

  const [atlitMerahName, setAtlitMerahName] = useState("");
  const [kontingenMerah, setKontingenMerah] = useState("");
  const [atlitBiruName, setAtlitBiruName] = useState("");
  const [kontingenBiru, setKontingenBiru] = useState("");

  const [logoLeftLocal, setLogoLeftLocal] = useState("");
  const [logoRightLocal, setLogoRightLocal] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Schedule list & modal states (with localStorage cache fallback)
  const [schedules, setSchedules] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("jrz_cached_schedules");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [participants, setParticipants] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("jrz_cached_participants");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [categories, setCategories] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("jrz_cached_categories");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Custom screen states for A4 POPDA Aceh Tournament Schedule
  const [showSchedulePreviewScreen, setShowSchedulePreviewScreen] = useState(false);
  const [scheduleEventName, setScheduleEventName] = useState("");
  const [scheduleCabangOlahraga, setScheduleCabangOlahraga] = useState("");
  const [scheduleTanggalTempat, setScheduleTanggalTempat] = useState("");
  const [scheduleGelanggang, setScheduleGelanggang] = useState("");
  const [scheduleWaktuSesi, setScheduleWaktuSesi] = useState("");
  const [scheduleSesiNama, setScheduleSesiNama] = useState("");
  const [scheduleTanggalHari, setScheduleTanggalHari] = useState("");
  const [scheduleStageFilter, setScheduleStageFilter] = useState<string>("ALL");
  
  // States for manual input of print-out PDF region & date
  const [namaDaerahCetak, setNamaDaerahCetak] = useState(() => {
    return localStorage.getItem("sekretaris_namaDaerahCetak") || "IDI RAYEUK";
  });
  const [tanggalCetakDokumen, setTanggalCetakDokumen] = useState(() => {
    return localStorage.getItem("sekretaris_tanggalCetakDokumen") || "01 JULI 2026";
  });
  const [namaKetuaPertandingan, setNamaKetuaPertandingan] = useState(() => {
    return localStorage.getItem("sekretaris_namaKetuaPertandingan") || "";
  });
  const [namaSekretarisPertandingan, setNamaSekretarisPertandingan] = useState(() => {
    return localStorage.getItem("sekretaris_namaSekretarisPertandingan") || "";
  });

  const updateNamaDaerahCetak = (val: string) => {
    setNamaDaerahCetak(val);
    localStorage.setItem("sekretaris_namaDaerahCetak", val);
  };
  const updateTanggalCetakDokumen = (val: string) => {
    setTanggalCetakDokumen(val);
    localStorage.setItem("sekretaris_tanggalCetakDokumen", val);
  };
  const updateNamaKetuaPertandingan = (val: string) => {
    setNamaKetuaPertandingan(val);
    localStorage.setItem("sekretaris_namaKetuaPertandingan", val);
  };
  const updateNamaSekretarisPertandingan = (val: string) => {
    setNamaSekretarisPertandingan(val);
    localStorage.setItem("sekretaris_namaSekretarisPertandingan", val);
  };

  // PDF download overlay states
  const [showScheduleDownloadOverlay, setShowScheduleDownloadOverlay] = useState(false);
  const [showBaganDownloadOverlay, setShowBaganDownloadOverlay] = useState(false);
  const [overlaySelectedStage, setOverlaySelectedStage] = useState<"ALL" | "PENYISIHAN" | "PEREMPAT FINAL" | "SEMIFINAL" | "FINAL">("ALL");
  const [overlaySelectedGelanggang, setOverlaySelectedGelanggang] = useState<string>("ALL");
  const [showInputAtlitOverlay, setShowInputAtlitOverlay] = useState(false);

  // Unified Sekretaris Navigation:
  // Primary (Level 1): PARAMETER (Parameter Pertandingan) & REGISTRASI (registrasi data)
  // Sub-menu in REGISTRASI (Level 2): INPUT (Input data), BAGAN (bagan braket), KONTROL (kontrol partai)
  const [activeTab, setActiveTab] = useState<"PARAMETER" | "REGISTRASI">(() => {
    if (initialTab === "INPUT" || initialTab === "BAGAN" || initialTab === "KONTROL" || initialTab === "REGISTRASI" || initialTab === "LOTING") {
      return "REGISTRASI";
    }
    return "PARAMETER";
  });

  const [registrasiActiveTab, setRegistrasiActiveTab] = useState<"INPUT" | "BAGAN" | "KONTROL">(() => {
    if (initialTab === "BAGAN") return "BAGAN";
    if (initialTab === "KONTROL") return "KONTROL";
    return "INPUT";
  });

  useEffect(() => {
    if (initialTab === "INPUT" || initialTab === "BAGAN" || initialTab === "KONTROL" || initialTab === "LOTING") {
      setActiveTab("REGISTRASI");
      setRegistrasiActiveTab(initialTab === "LOTING" ? "INPUT" : initialTab);
    } else if (initialTab === "REGISTRASI") {
      setActiveTab("REGISTRASI");
    } else if (initialTab === "PARAMETER") {
      setActiveTab("PARAMETER");
    }
  }, [initialTab]);

  const [showRegistrasiScreen, setShowRegistrasiScreen] = useState(false);
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState("");
  const [showAthleteSelectorModal, setShowAthleteSelectorModal] = useState(false);
  const [showAthleteDeleteSelectorModal, setShowAthleteDeleteSelectorModal] = useState(false);
  const [showMatchSelectorModal, setShowMatchSelectorModal] = useState(false);
  const [selectedReportMatchIds, setSelectedReportMatchIds] = useState<string[]>([]);
  const [showAllKontrolSchedules, setShowAllKontrolSchedules] = useState(false);
  const [kontrolFilterCategory, setKontrolFilterCategory] = useState<string | null>(null);
  const [kontrolFilterGender, setKontrolFilterGender] = useState<"PUTRA" | "PUTRI" | null>(null);
  const [kontrolFilterGelanggang, setKontrolFilterGelanggang] = useState<string>("ALL");
  const [pendingDisqualifyCorner, setPendingDisqualifyCorner] = useState<"RED" | "BLUE" | null>(null);

  // Dynamic available gelanggang list for multi-arena support
  const availableGelanggangList = useMemo(() => {
    const list = new Set<string>();
    schedules.forEach(m => {
      if (m.arena && typeof m.arena === "string" && m.arena.trim()) {
        list.add(m.arena.trim().toUpperCase());
      }
    });
    if (scheduleGelanggang && scheduleGelanggang.trim()) {
      list.add(scheduleGelanggang.trim().toUpperCase());
    }
    if (!list.has("GELANGGANG A") && !list.has("GELANGGANG I")) {
      list.add("GELANGGANG A");
    }
    if (!list.has("GELANGGANG B") && !list.has("GELANGGANG II")) {
      list.add("GELANGGANG B");
    }
    return Array.from(list).sort();
  }, [schedules, scheduleGelanggang]);

  // Custom states for A4 POPDA Aceh Tournament brackets (Bagan)
  const [showBaganScreen, setShowBaganScreen] = useState(false);
  const [selectedBaganCategory, setSelectedBaganCategory] = useState("cat-3");
  const [selectedBaganGender, setSelectedBaganGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [baganSchemeType, setBaganSchemeType] = useState<"POOL_AB" | "SINGLE_NO_POOL" | "DOUBLE_POOL">("SINGLE_NO_POOL");
  const [baganViewEngine, setBaganViewEngine] = useState<"INTERACTIVE" | "COMPACT">("INTERACTIVE");

  useEffect(() => {
    onSubScreenChange?.(activeTab !== "PARAMETER" || Boolean(showRegistrasiScreen || showBaganScreen || showSchedulePreviewScreen));
  }, [activeTab, showRegistrasiScreen, showBaganScreen, showSchedulePreviewScreen, onSubScreenChange]);
  const [baganScale, setBaganScale] = useState(0.65);
  const fileInputBaganExcelRef = useRef<HTMLInputElement>(null);

  // Mode Pemasalan vs Pool per Kategori Usia (disinkronkan dengan BaganTandingView & localStorage)
  const STORAGE_KEY_PEMASALAN_MODES = "jrz_division_pemasalan_modes";
  const [divisionPemasalanModes, setDivisionPemasalanModes] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PEMASALAN_MODES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      "USIA DINI": true,
      "USIA DINI 1": true,
      "USIA DINI 2": true,
      "PRA REMAJA": true,
      "REMAJA": false,
      "DEWASA": false,
      "MASTER": false,
    };
  });

  const handleToggleDivisionMode = async (div: string) => {
    const norm = normalizeDivision(div);
    const current = !!divisionPemasalanModes[norm];
    const nextState = !current;
    const updated = { ...divisionPemasalanModes, [norm]: nextState };
    setDivisionPemasalanModes(updated);
    try {
      localStorage.setItem(STORAGE_KEY_PEMASALAN_MODES, JSON.stringify(updated));
    } catch {}
    sound.playClick();

    // Auto-generate ulang bagan dan jadwal pertandingan secara global untuk semua kategori dengan mode baru
    try {
      const genResult = await autoSyncAndGenerateAllBrackets(scheduleGelanggang || "GELANGGANG A");
      if (genResult && Array.isArray(genResult.matches)) {
        setSchedules(genResult.matches);
        if (Array.isArray(genResult.participants)) setParticipants(genResult.participants);
        if (Array.isArray(genResult.categories)) setCategories(genResult.categories);
      }
    } catch (err) {
      console.warn("Sync error on toggle mode:", err);
    }

    // Auto update / generate bagan jika kategori aktif berada di divisi ini
    let targetCatId = selectedBaganCategory;
    let targetGender = selectedBaganGender;
    const activeCat = categories.find(c => c.id === selectedBaganCategory);
    if (!activeCat || normalizeDivision(activeCat.division) !== norm) {
      const matchInDiv = categories.find(c => normalizeDivision(c.division) === norm);
      if (matchInDiv) {
        targetCatId = matchInDiv.id;
        targetGender = (matchInDiv.gender || "PUTRA") as any;
        setSelectedBaganCategory(matchInDiv.id);
        setSelectedBaganGender((matchInDiv.gender || "PUTRA") as any);
      }
    }

    handleAutoGenerateBagan(undefined, targetCatId, targetGender);
  };

  const isDivisionPemasalan = (division?: string) => {
    if (!division) return false;
    const norm = normalizeDivision(division);
    return !!divisionPemasalanModes[norm];
  };

  // States for the new "Kelola Atlet (excel) & Skema Pool" tab
  const [currentTab, setCurrentTab] = useState<"KONTROL" | "KELOLA_ATLET" | "JADWAL">("KONTROL");
  const [showGenerateJadwalOverlay, setShowGenerateJadwalOverlay] = useState(false);
  const [selectedArchiveJuryStats, setSelectedArchiveJuryStats] = useState<any | null>(null);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualClub, setManualClub] = useState("");
  const [manualGender, setManualGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [manualCategoryClassId, setManualCategoryClassId] = useState("cat-kelas-a");
  const [manualWeight, setManualWeight] = useState(55);
  const [manualDivision, setManualDivision] = useState<string>("REMAJA");
  const [manualArena, setManualArena] = useState<string>("GELANGGANG A");
  const [athleteArenaFilter, setAthleteArenaFilter] = useState<string>("SEMUA");
  const [athleteFilterMode, setAthleteFilterMode] = useState<"FORM" | "ALL">("FORM");
  const [manualKategori, setManualKategori] = useState<string>("TANDING");
  const [newAthName, setNewAthName] = useState("");
  const [newAthClub, setNewAthClub] = useState("");
  const [newAthWeight, setNewAthWeight] = useState(55);

  const [editingBaganMatch, setEditingBaganMatch] = useState<any | null>(null);
  const [editRedName, setEditRedName] = useState("");
  const [editRedClub, setEditRedClub] = useState("");
  const [editBlueName, setEditBlueName] = useState("");
  const [editBlueClub, setEditBlueClub] = useState("");
  const [editArena, setEditArena] = useState("");
  const [newBaganName, setNewBaganName] = useState("");
  const [newBaganGender, setNewBaganGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [newBaganSize, setNewBaganSize] = useState<4 | 8>(8);
  const [isBaganRotated, setIsBaganRotated] = useState(false);
  const [isBaganControlsVisible, setIsBaganControlsVisible] = useState(true);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
    };
  }, []);

  const isEffectiveFullscreen = Boolean(isFullscreen || isNativeFullscreen);

  const [showNextMatchesModal, setShowNextMatchesModal] = useState(false);
  const [showFinalDecisionModal, setShowFinalDecisionModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [winnerPublishing, setWinnerPublishing] = useState(false);
  const [isNextRoundSignalDismissed, setIsNextRoundSignalDismissed] = useState(false);
  // Reset the next round overlay dismiss flag whenever the active round changes or new signal arrives
  useEffect(() => {
    setIsNextRoundSignalDismissed(false);
  }, [state?.activeRound, state?.secretarySignalNextRound]);

  const [nextMatchLoading, setNextMatchLoading] = useState(false);
  const [addRound4Loading, setAddRound4Loading] = useState(false);
  const [serverIps, setServerIps] = useState<string[]>([]);

  // Fetch local server IPs for Juri network connection
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;

    const loadServerInfo = async () => {
      try {
        const res = await fetch("/api/server-info");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.ips) {
            setServerIps(data.ips);
          }
          return;
        }
      } catch (err) {
        if (isMounted && retryCount < 4) {
          retryCount++;
          setTimeout(loadServerInfo, 1000 * Math.min(retryCount, 3));
        }
      }
    };
    loadServerInfo();
    return () => {
      isMounted = false;
    };
  }, []);

  // Monitor match status to automatically open the final decision menu on completion
  useEffect(() => {
    if (state?.status === MatchStatus.FINISHED) {
      setShowFinalDecisionModal(true);
    } else {
      setShowFinalDecisionModal(false);
    }
  }, [state?.status]);

  const [bellActive, setBellActive] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const fileInputLeftRef = useRef<HTMLInputElement>(null);
  const fileInputRightRef = useRef<HTMLInputElement>(null);
  const fileInputExcelRef = useRef<HTMLInputElement>(null);

  // Load state values once active state is fetched
  useEffect(() => {
    if (state) {
      if (focusedField !== "eventName") setEventName(state.eventName || "");
      if (focusedField !== "partaiNumber") setPartaiNumber(state.matchNumber || "");
      if (focusedField !== "tahap") setTahap(state.stage || "PENYISIHAN");
      setGender(state.gender || "PUTRA");
      setDurasiTimer(state.roundDuration || 120);
      if (focusedField !== "atlitMerahName") setAtlitMerahName(state.fighterRedName || "");
      if (focusedField !== "kontingenMerah") setKontingenMerah(state.fighterRedClub || "");
      if (focusedField !== "atlitBiruName") setAtlitBiruName(state.fighterBlueName || "");
      if (focusedField !== "kontingenBiru") setKontingenBiru(state.fighterBlueClub || "");
      setLogoLeftLocal(state.logoLeft || "");
      setLogoRightLocal(state.logoRight || "");

      // Attempt to extract class category code
      if (state.classCategory && focusedField !== "kelasNomor") {
        // e.g "Tanding Kelas C Putra (55Kg - 60Kg)" -> extract "Kelas C" or "C"
        const matchInfo = state.classCategory.match(/Kelas\s+([A-Za-z0-9]+)/i);
        if (matchInfo && matchInfo[1]) {
          setKelasNomor(matchInfo[1].toUpperCase());
        } else {
          setKelasNomor(state.classCategory.replace("Tanding", "").trim());
        }
      }
    }
  }, [state, focusedField]);

  const [archivedMatchesList, setArchivedMatchesList] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem("jrz_archived_matches");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Fetch match schedule, participants and categories for lookup mapping
  const fetchSchedules = async () => {
    try {
      const isClearedNow = localStorage.getItem("jrz_bracket_cleared") === "true";
      const localS = localStorage.getItem("jrz_cached_schedules");
      const localP = localStorage.getItem("jrz_cached_participants");
      const localC = localStorage.getItem("jrz_cached_categories");
      const localArch = localStorage.getItem("jrz_archived_matches");

      if (localArch) {
        try {
          const parsedArch = JSON.parse(localArch);
          if (Array.isArray(parsedArch)) setArchivedMatchesList(parsedArch);
        } catch {}
      } else {
        setArchivedMatchesList([]);
      }

      if (isClearedNow) {
        setSchedules([]);
        if (localP !== null) {
          try { setParticipants(JSON.parse(localP)); } catch {}
        }
        if (localC !== null) {
          try { setCategories(JSON.parse(localC)); } catch {}
        }
        return;
      }

      let cachedSchedulesList: any[] = [];
      if (localS !== null) {
        try {
          const parsedS = JSON.parse(localS);
          if (Array.isArray(parsedS)) {
            cachedSchedulesList = parsedS;
            if (parsedS.length > 0) setSchedules(parsedS);
          }
        } catch {}
      }
      if (localP !== null) {
        try {
          const parsedP = JSON.parse(localP);
          if (Array.isArray(parsedP) && parsedP.length > 0) setParticipants(parsedP);
        } catch {}
      }
      if (localC !== null) {
        try {
          const parsedC = JSON.parse(localC);
          if (Array.isArray(parsedC) && parsedC.length > 0) setCategories(parsedC);
        } catch {}
      }

      const [res, pRes, cRes] = await Promise.allSettled([
        fetch("/api/matches-schedule"),
        fetch("/api/participants"),
        fetch("/api/categories")
      ]);

      if (res.status === "fulfilled" && res.value.ok) {
        const serverData = await res.value.json();
        if (Array.isArray(serverData)) {
          // Merge finished status/stats from local cache & archived matches so finished matches are never lost
          const normP = (v: any) => {
            const d = String(v || "").replace(/\D/g, "");
            return d ? String(parseInt(d, 10)) : String(v || "").trim().toUpperCase();
          };
          const mergedSchedules = [...serverData];
          const localFinished = [
            ...cachedSchedulesList.filter((m: any) => m && m.status === "SELESAI"),
            ...(localArch ? (() => { try { const a = JSON.parse(localArch); return Array.isArray(a) ? a : []; } catch { return []; } })() : [])
          ];
          localFinished.forEach((fin: any) => {
            if (!fin) return;
            const idx = mergedSchedules.findIndex(
              (s: any) =>
                s.id === fin.id ||
                (normP(s.matchNumber) !== "" && normP(s.matchNumber) === normP(fin.matchNumber))
            );
            if (idx !== -1) {
              if (mergedSchedules[idx].status !== "SELESAI") {
                mergedSchedules[idx] = { ...mergedSchedules[idx], ...fin, id: mergedSchedules[idx].id };
              }
            } else {
              mergedSchedules.push(fin);
            }
          });
          setSchedules(mergedSchedules);
          try { localStorage.setItem("jrz_cached_schedules", JSON.stringify(mergedSchedules)); } catch {}
        }
      }

      if (pRes.status === "fulfilled" && pRes.value.ok) {
        const pData = await pRes.value.json();
        if (Array.isArray(pData) && pData.length > 0) {
          setParticipants(pData);
          try { localStorage.setItem("jrz_cached_participants", JSON.stringify(pData)); } catch {}
        }
      }

      if (cRes.status === "fulfilled" && cRes.value.ok) {
        const cData = await cRes.value.json();
        if (Array.isArray(cData) && cData.length > 0) {
          setCategories(cData);
          try { localStorage.setItem("jrz_cached_categories", JSON.stringify(cData)); } catch {}
          if (!manualCategoryClassId || manualCategoryClassId === "") {
            setManualCategoryClassId(cData[0].id);
          }
        }
      }
    } catch {
      // Gracefully silent fallback to existing state / cached localStorage
    }
  };

  // Automatically archive finished match into Histori Hasil Tanding as soon as match finishes and winner is obtained
  useEffect(() => {
    if (
      state?.status === MatchStatus.FINISHED &&
      (state.winnerColor || state.scoreRed !== state.scoreBlue || state.redPenalties?.disqualified || state.bluePenalties?.disqualified)
    ) {
      offlineEngine.archiveFinishedMatchOffline(state);
      fetchSchedules();
    }
  }, [state?.status, state?.winnerColor, state?.id, state?.matchNumber]);

  useEffect(() => {
    fetchSchedules();
    const handleSync = () => {
      fetchSchedules();
    };
    window.addEventListener("jrz_tournament_synced", handleSync);
    window.addEventListener("jrz_athletes_updated", handleSync);
    window.addEventListener("jrz_schedules_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("jrz_tournament_synced", handleSync);
      window.removeEventListener("jrz_athletes_updated", handleSync);
      window.removeEventListener("jrz_schedules_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [state?.id, state?.matchNumber, state?.status]);

  // Handle immediate change & auto save of metadata parameters on blur
  const triggerAutoSave = (updatedFields?: any) => {
    // Generate classCategory string: "Tanding Kelas {kelasNomor} {gender} ({rangeWeight})" 
    const classCatStr = `Tanding Kelas ${kelasNomor || "C"} ${gender === "PUTRI" ? "Putri" : "Putra"}`;
    
    const saveData = {
      eventName,
      matchNumber: partaiNumber,
      stage: tahap,
      gender,
      roundDuration: Number(durasiTimer),
      fighterRedName: atlitMerahName.toUpperCase(),
      fighterRedClub: kontingenMerah.toUpperCase(),
      fighterBlueName: atlitBiruName.toUpperCase(),
      fighterBlueClub: kontingenBiru.toUpperCase(),
      classCategory: classCatStr,
      logoLeft: logoLeftLocal,
      logoRight: logoRightLocal,
      ...updatedFields
    };

    if (saveData.eventName) {
      try { localStorage.setItem("jrz_event_name", saveData.eventName); } catch {}
    }
    if (saveData.logoLeft) {
      try { localStorage.setItem("jrz_logo_left", saveData.logoLeft); } catch {}
    }
    if (saveData.logoRight) {
      try { localStorage.setItem("jrz_logo_right", saveData.logoRight); } catch {}
    }

    onUpdateMetadata(saveData);
  };

  const notifyToast = (msg: string) => {
    sound.playClick();
    setInfoMsg(msg);
    setTimeout(() => setInfoMsg(null), 3000);
  };

  // --- IPSI 2026 AUTOMATIC PENALTY ENGINE HANDLERS ---
  const handleTriggerPenalty = async (fighter: "RED" | "BLUE", penaltyType: string) => {
    sound.playBuzzer();
    const cornerLabel = fighter === "RED" ? "Merah" : "Biru";
    const cleanPen = penaltyType.toUpperCase().replace(/_/g, " ");

    if (onDewanAction) {
      await onDewanAction({
        command: "PENALTY",
        fighter,
        penaltyType
      });
    } else {
      try {
        await fetch("/api/dewan/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: "PENALTY", fighter, penaltyType })
        });
      } catch (err) {
        console.warn("Penalty fetch error:", err);
      }
    }
    notifyToast(`Hukuman ${cleanPen} diperbarui untuk Sudut ${cornerLabel}!`);
  };

  // IPSI 2026 sequential progression ladder
  const handleSequentialAutoPenalty = async (fighter: "RED" | "BLUE") => {
    const pTarget = fighter === "RED" ? state?.redPenalties : state?.bluePenalties;
    const cornerLabel = fighter === "RED" ? "Merah" : "Biru";

    if (!pTarget?.binaan1) {
      await handleTriggerPenalty(fighter, "binaan1");
    } else if (!pTarget?.binaan2) {
      await handleTriggerPenalty(fighter, "binaan2");
    } else if (!pTarget?.teguran1) {
      await handleTriggerPenalty(fighter, "teguran1");
    } else if (!pTarget?.teguran2) {
      await handleTriggerPenalty(fighter, "teguran2");
    } else if (!pTarget?.peringatan1) {
      await handleTriggerPenalty(fighter, "peringatan1");
    } else if (!pTarget?.peringatan2) {
      await handleTriggerPenalty(fighter, "peringatan2");
    } else if (!pTarget?.disqualified) {
      await handleTriggerPenalty(fighter, "disqualified");
    } else {
      notifyToast(`Pesilat Sudut ${cornerLabel} sudah mencapai diskualifikasi!`);
    }
  };

  // Archive and clear round penalties per IPSI 2026 rules
  const handleResetRoundPenalties = async () => {
    sound.playClick();
    if (onDewanAction) {
      await onDewanAction({
        command: "RESET_ROUND_PENALTIES",
        fighter: "RED"
      });
    } else {
      try {
        await fetch("/api/dewan/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: "RESET_ROUND_PENALTIES", fighter: "RED" })
        });
      } catch (err) {
        console.warn("Reset round penalties error:", err);
      }
    }
    notifyToast("Teguran babak ini berhasil diarsipkan ke akumulasi poin resmi IPSI 2026!");
  };

  const getNextPenaltyInfo = (fighter: "RED" | "BLUE") => {
    const p = fighter === "RED" ? state?.redPenalties : state?.bluePenalties;
    if (!p?.binaan1) return { key: "binaan1", label: "Binaan 1", deduction: 0, nextText: "Binaan 1 (Isyarat Lisan)" };
    if (!p?.binaan2) return { key: "binaan2", label: "Binaan 2", deduction: 0, nextText: "Binaan 2 (Isyarat Lisan)" };
    if (!p?.teguran1) return { key: "teguran1", label: "Teguran 1", deduction: -1, nextText: "Teguran 1 (-1 Poin)" };
    if (!p?.teguran2) return { key: "teguran2", label: "Teguran 2", deduction: -2, nextText: "Teguran 2 (-2 Poin)" };
    if (!p?.peringatan1) return { key: "peringatan1", label: "Peringatan 1", deduction: -5, nextText: "Peringatan 1 (-5 Poin)" };
    if (!p?.peringatan2) return { key: "peringatan2", label: "Peringatan 2", deduction: -10, nextText: "Peringatan 2 (-10 Poin)" };
    if (!p?.disqualified) return { key: "disqualified", label: "Diskualifikasi", deduction: 0, nextText: "Diskualifikasi (Kalah)" };
    return { key: "done", label: "Maksimal", deduction: 0, nextText: "Diskualifikasi Aktif" };
  };

  const getTotalPenaltyDeductions = (fighter: "RED" | "BLUE") => {
    const p = fighter === "RED" ? state?.redPenalties : state?.bluePenalties;
    const stats = fighter === "RED" ? state?.redStats : state?.blueStats;
    let total = stats?.pastPenaltiesDeductions || 0;
    if (p?.teguran1) total += 1;
    if (p?.teguran2) total += 2;
    if (p?.peringatan1) total += 5;
    if (p?.peringatan2) total += 10;
    return total;
  };

  // Helper to read and optimize logo image (handles large files, auto-rescaling on canvas preserving alpha channel)
  const processAndOptimizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // If SVG format, preserve original vector format
      if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          const maxDimension = 1200; // Ultra-sharp resolution for monitors, scoreboards & PDF print
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Export as PNG (preserves full alpha transparency)
          const dataUrl = canvas.toDataURL("image/png", 0.95);
          resolve(dataUrl);
        } catch (err) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      };

      img.src = objectUrl;
    });
  };

  // Upload Logo handlers (supports any file size with intelligent auto-resizing & optimization)
  const handleUploadLogoFile = async (side: "left" | "right", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const inputElement = e.target;

    try {
      notifyToast(side === "right" ? "⏳ Memproses & mengunggah Logo Kanan..." : "⏳ Memproses & mengunggah Logo Kiri...");
      const base64 = await processAndOptimizeImage(file);
      if (side === "left") {
        setLogoLeftLocal(base64);
        try { localStorage.setItem("jrz_logo_left", base64); localStorage.setItem("sekretaris_logoLeftLocal", base64); } catch {}
        triggerAutoSave({ logoLeft: base64 });
        onUpdateMetadata({ logoLeft: base64 });
        notifyToast("✅ Logo Kiri berhasil diunggah!");
      } else {
        setLogoRightLocal(base64);
        try { localStorage.setItem("jrz_logo_right", base64); localStorage.setItem("sekretaris_logoRightLocal", base64); } catch {}
        triggerAutoSave({ logoRight: base64 });
        onUpdateMetadata({ logoRight: base64 });
        notifyToast("✅ Logo Kanan berhasil diunggah!");
      }
    } catch (err) {
      console.error("Gagal mengunggah logo:", err);
      notifyToast("❌ Gagal memproses gambar logo. Silakan coba gambar lain.");
    } finally {
      if (inputElement) {
        inputElement.value = "";
      }
    }
  };

  // Timer play control post
  const handleTimerAction = async (command: "START" | "PAUSE" | "ADD_10" | "SUB_10" | "RESET") => {
    sound.playClick();
    let finalCommand = command;
    if (command === "START" && state?.status === MatchStatus.RUNNING) {
      finalCommand = "PAUSE";
    }

    if (finalCommand === "RESET") {
      const resetTime = Number(durasiTimer) || state?.roundDuration || 120;
      await onUpdateMetadata({
        timeLeft: resetTime,
        status: MatchStatus.IDLE,
        showRoundOverPopup: false,
        winnerPublished: false,
        winnerColor: null,
        winnerMethod: null,
        isTieExtendedPossible: false
      });
      if (onTimerCommand) {
        await onTimerCommand("RESET");
      }
      try {
        await fetch("/api/match-state/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timeLeft: resetTime,
            status: MatchStatus.IDLE,
            winnerPublished: false,
            winnerColor: null,
            winnerMethod: null,
            isTieExtendedPossible: false
          })
        });
      } catch (e) {}
      fetchSchedules();
      return;
    }

    if (onTimerCommand) {
      await onTimerCommand(finalCommand);
    } else {
      if (finalCommand === "START") {
        await onUpdateMetadata({
          status: MatchStatus.RUNNING,
          juryPanelLocked: false,
          dewanPanelLocked: false,
          showNextMatchPopup: false,
          showRoundOverPopup: false,
          winnerPublished: false,
          winnerColor: null,
          winnerMethod: null,
          isTieExtendedPossible: false
        });
      } else if (finalCommand === "PAUSE") {
        await onUpdateMetadata({
          status: MatchStatus.PAUSED
        });
      }
    }

    try {
      await fetch("/api/match-state/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: finalCommand })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Horn/Bell signal buzzer trigger
  const triggerBellHorn = () => {
    setBellActive(true);
    sound.playBuzzer();
    setTimeout(() => {
      setBellActive(false);
    }, 1500);
  };

  // Round Select Switching
  const handleSetRound = async (roundNum: number) => {
    sound.playClick();
    if (onRoundAction) {
      await onRoundAction("SET", roundNum);
    } else {
      await onUpdateMetadata({
        activeRound: roundNum,
        timeLeft: state?.roundDuration || 120,
        status: MatchStatus.IDLE,
        showRoundOverPopup: false,
        secretarySignalNextRound: false
      });
    }
    try {
      await fetch("/api/match-state/round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundAction: "SET", targetRound: roundNum })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleJuryPanelLock = async () => {
    sound.playClick();
    try {
      const isCurrentlyLocked = !!state?.juryPanelLocked;
      const targetLock = !isCurrentlyLocked;
      const updates: Partial<MatchState> = {
        juryPanelLocked: targetLock,
        ...(!targetLock ? { showRoundOverPopup: false, showNextMatchPopup: false } : {})
      };
      await onUpdateMetadata(updates);
      notifyToast(targetLock ? "🔒 PANEL JURI TERKUNCI SEPENUHNYA!" : "🔓 PANEL JURI SEKARANG TERBUKA!");
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmTransitionNextRound = async () => {
    sound.playClick();
    setIsNextRoundSignalDismissed(true);
    if (onRoundAction) {
      await onRoundAction("NEXT");
    } else {
      const nextR = (state?.activeRound || 1) + 1;
      await onUpdateMetadata({
        activeRound: nextR,
        timeLeft: state?.roundDuration || 120,
        status: MatchStatus.IDLE,
        showRoundOverPopup: false,
        secretarySignalNextRound: false
      });
    }
    notifyToast(`✅ MELEWATI KE BABAK ${state?.activeRound ? state.activeRound + 1 : 2}!`);
  };

  const handleRejectTransition = async () => {
    sound.playClick();
    setIsNextRoundSignalDismissed(true);
    await onUpdateMetadata({ secretarySignalNextRound: false });
    notifyToast("❌ Transisi dikesampingkan / dibatalkan.");
  };

  const handlePublishWinner = async () => {
    sound.playClick();
    setWinnerPublishing(true);
    try {
      await onUpdateMetadata({ winnerPublished: true });
      notifyToast("📢 Pemenang resmi berhasil diumumkan ke Layar Monitor & Seluruh Panel!");
      fetch("/api/match-state/publish-winner", { method: "POST" }).catch(() => {});
    } catch (err) {
      console.error("Gagal mengumumkan pemenang:", err);
    } finally {
      setWinnerPublishing(false);
    }
  };

  const handleNextMatch = async () => {
    sound.playClick();
    setNextMatchLoading(true);
    try {
      const res = await fetch("/api/match-state/next-match", { method: "POST" });
      if (res.ok) {
        const nextState = await res.json();
        if (nextState && nextState.id) {
          onResetMatch(nextState);
        }
        setShowFinalDecisionModal(false);
        fetchSchedules();
        notifyToast("Partai tanding berhasil diarsipkan ke Histori Hasil Tanding & siap melanjutkan partai berikutnya!");
      }
    } catch (err) {
      console.error("Gagal berpindah ke partai selanjutnya:", err);
    } finally {
      setNextMatchLoading(false);
    }
  };

  const handleAddRound4 = async () => {
    sound.playClick();
    setAddRound4Loading(true);
    try {
      const res = await fetch("/api/match-state/add-round-4", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          onUpdateMetadata(data);
        }
      } else {
        onUpdateMetadata({
          roundCount: 4,
          activeRound: 4,
          timeLeft: state.roundDuration || 120,
          status: MatchStatus.IDLE,
          showRoundOverPopup: false
        });
      }
      setShowFinalDecisionModal(false);
    } catch (err) {
      console.error("Gagal menambah babak ke-4:", err);
      onUpdateMetadata({
        roundCount: 4,
        activeRound: 4,
        timeLeft: state.roundDuration || 120,
        status: MatchStatus.IDLE,
        showRoundOverPopup: false
      });
      setShowFinalDecisionModal(false);
    } finally {
      setAddRound4Loading(false);
    }
  };

  // Prev / Next match navigation loaders
  const handleNavigateMatch = async (direction: "PREV" | "NEXT") => {
    if (schedules.length === 0) {
      alert("Belum ada jadwal pertandingan terdaftar di sistem!");
      return;
    }
    sound.playClick();

    // Find current index based on matchNumber
    const curIndex = schedules.findIndex(s => s.matchNumber === partaiNumber);
    let targetIndex = -1;

    if (direction === "PREV" && curIndex > 0) {
      targetIndex = curIndex - 1;
    } else if (direction === "NEXT" && curIndex >= 0 && curIndex < schedules.length - 1) {
      targetIndex = curIndex + 1;
    }

    if (targetIndex !== -1) {
      const targetMatch = schedules[targetIndex];
      try {
        const res = await fetch("/api/matches-schedule/load", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId: targetMatch.id })
        });
        if (res.ok) {
          const loadedData = await res.json();
          if (loadedData.activeMatch) {
            onResetMatch(loadedData.activeMatch);
          }
          notifyToast(`Loaded ${targetMatch.matchNumber} (${targetMatch.stage})`);
          fetchSchedules();
        }
      } catch (e) {
        console.error("Gagal memat partai:", e);
      }
    } else {
      notifyToast(direction === "PREV" ? "Sudah mencapai partai pertama!" : "Sudah mencapai partai terakhir!");
    }
  };

  // Load a direct schedule item
  const loadScheduleMatchItem = async (matchId: string) => {
    try {
      sound.playClick();
      // Look up match in local schedules for immediate responsiveness
      const targetMatch = schedules.find(m => m.id === matchId);
      if (targetMatch) {
        const rName = targetMatch.fighterRedName || getParticipantName(targetMatch.fighterRedId) || "PESILAT MERAH";
        const rClub = targetMatch.fighterRedClub || getParticipantClub(targetMatch.fighterRedId) || "CONTINGENT MERAH";
        const bName = targetMatch.fighterBlueName || getParticipantName(targetMatch.fighterBlueId) || "PESILAT BIRU";
        const bClub = targetMatch.fighterBlueClub || getParticipantClub(targetMatch.fighterBlueId) || "CONTINGENT BIRU";
        const cat = categories.find(c => c.id === targetMatch.categoryClassId);
        const classCat = targetMatch.classCategory || (cat ? `Tanding ${cat.name} ${targetMatch.gender === "PUTRI" ? "Putri" : "Putra"}` : "Tanding Bebas");

        const localMatchPayload: any = {
          id: "match-" + targetMatch.id,
          matchNumber: targetMatch.matchNumber,
          fighterRedName: rName,
          fighterRedClub: rClub,
          fighterBlueName: bName,
          fighterBlueClub: bClub,
          classCategory: classCat,
          gender: targetMatch.gender || "PUTRA",
          stage: targetMatch.stage || "PENYISIHAN",
          roundDuration: state?.roundDuration || 120,
          roundCount: state?.roundCount || 3,
          status: MatchStatus.IDLE
        };
        onResetMatch(localMatchPayload);
      }

      const res = await fetch("/api/matches-schedule/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId })
      });
      if (res.ok) {
        const loadedData = await res.json();
        if (loadedData.activeMatch) {
          onResetMatch(loadedData.activeMatch);
        }
      }
      setShowNextMatchesModal(false);
      notifyToast("Partai tanding berhasil dimuat ke seluruh arena!");
      fetchSchedules();
    } catch (e) {
      console.error(e);
      setShowNextMatchesModal(false);
      notifyToast("Partai berhasil dimuat ke arena!");
    }
  };

  // Reset all completed match histories
  const handleClearHistory = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus seluruh log rincian riwayat pertandingan pada database lokal?")) return;
    sound.playBuzzer();
    try {
      localStorage.removeItem("jrz_archived_matches");
      setArchivedMatchesList([]);
      const res = await fetch("/api/tournament/reset", { method: "POST" });
      if (res.ok) {
        notifyToast("Database histori & pendaftaran berhasil di-reset bersih!");
        fetchSchedules();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Tournament auto generator
  const handleGenerateTournamentData = async (type: "BAGAN" | "JADWAL") => {
    sound.playClick();
    notifyToast(`Menjalankan generator digitalisasi ${type}...`);

    // Pre-seed categories
    const mockCategories = [
      { id: "cat-1", name: "Kelas A", minWeight: 45, maxWeight: 50, division: "Dewasa" },
      { id: "cat-2", name: "Kelas B", minWeight: 50, maxWeight: 55, division: "Dewasa" },
      { id: "cat-3", name: "Kelas C", minWeight: 55, maxWeight: 60, division: "Dewasa" },
      { id: "cat-4", name: "Kelas D", minWeight: 60, maxWeight: 65, division: "Dewasa" }
    ];

    // Pre-seed athletes
    const mockParticipants = [
      { id: "p-1", name: "FAJAR NUGRAHA", club: "DI YOGYAKARTA", gender: "PUTRA", categoryClassId: "cat-3", weight: 58.0 },
      { id: "p-2", name: "EKO WAHYUDI", club: "BALI", gender: "PUTRA", categoryClassId: "cat-3", weight: 59.2 },
      { id: "p-3", name: "BUDI RAHARJO", club: "DKI JAKARTA", gender: "PUTRA", categoryClassId: "cat-1", weight: 49.5 },
      { id: "p-4", name: "ALDI SETIAWAN", club: "JAWA BARAT", gender: "PUTRA", categoryClassId: "cat-1", weight: 48.1 },
      { id: "p-5", name: "DIAN UTAMI", club: "JAWA TIMUR", gender: "PUTRI", categoryClassId: "cat-2", weight: 53.4 },
      { id: "p-6", name: "SITI NUR HALIZA", club: "JAWA TENGAH", gender: "PUTRI", categoryClassId: "cat-2", weight: 54.0 },
      { id: "p-7", name: "CHANDRA WIJAYA", club: "SUMATERA UTARA", gender: "PUTRA", categoryClassId: "cat-4", weight: 64.2 },
      { id: "p-8", name: "RAHMAN HAKIM", club: "SULAWESI SELATAN", gender: "PUTRA", categoryClassId: "cat-4", weight: 63.8 }
    ];

    // Pre-seed schedule items
    const mockMatches = [
      { id: "m-1", matchNumber: "Partai 01", stage: "PENYISIHAN", categoryClassId: "cat-1", fighterRedId: "p-3", fighterBlueId: "p-4", arena: "Gelanggang A", gender: "PUTRA", status: "SELESAI", winner: "MERAH" },
      { id: "m-2", matchNumber: "Partai 02", stage: "SEMIFINAL", categoryClassId: "cat-2", fighterRedId: "p-5", fighterBlueId: "p-6", arena: "Gelanggang A", gender: "PUTRI", status: "SELESAI", winner: "BIRU" },
      { id: "m-3", matchNumber: "Partai 03", stage: "PENYISIHAN", categoryClassId: "cat-3", fighterRedId: "p-1", fighterBlueId: "p-2", arena: "Gelanggang B", gender: "PUTRA", status: "SEDANG" },
      { id: "m-4", matchNumber: "Partai 04", stage: "FINAL", categoryClassId: "cat-4", fighterRedId: "p-7", fighterBlueId: "p-8", arena: "Gelanggang A", gender: "PUTRA", status: "BELUM" }
    ];

    try {
      const res = await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: mockCategories,
          newParticipants: mockParticipants,
          newMatches: mockMatches
        })
      });
      if (res.ok) {
        notifyToast("🎉 Bagan & Jadwal IPSI Berhasil Digenerate!");
        fetchSchedules();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Convert time countdown helper
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Get active match winner display if any
  const getFighterWinnerMessage = (m: any) => {
    if (m.winner === "MERAH") return "PEMENANG: SUDUT MERAH";
    if (m.winner === "BIRU") return "PEMENANG: SUDUT BIRU";
    return "";
  };

  // Vector draw logo helper for PDF exports with high redundancy fail-safes
  const drawLogoPdf = (doc: any, logoStr: string, x: number, y: number, size: number) => {
    try {
      if (logoStr && logoStr.startsWith("data:image")) {
        doc.addImage(logoStr, "PNG", x, y, size, size);
      } else {
        doc.setDrawColor(74, 24, 122);
        doc.setLineWidth(0.5);
        doc.ellipse(x + size/2, y + size/2, size/2, size/2, "D");
        doc.setFillColor(74, 24, 122);
        doc.ellipse(x + size/2, y + size/2, size/2 - 1, size/2 - 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.text("IPSI", x + size/2, y + size/2 + 2.5, { align: "center" });
      }
    } catch (err) {
      console.warn("Could not draw logo in PDF:", err);
    }
  };

  const startEditBaganMatch = (m: any) => {
    sound.playClick();
    setEditingBaganMatch(m);
    setEditRedName(m.fighterRedName || getParticipantName(m.fighterRedId) || "");
    setEditRedClub(m.fighterRedClub || getParticipantClub(m.fighterRedId) || "");
    setEditBlueName(m.fighterBlueName || getParticipantName(m.fighterBlueId) || "");
    setEditBlueClub(m.fighterBlueClub || getParticipantClub(m.fighterBlueId) || "");
    setEditArena(m.arena || scheduleGelanggang || "GELANGGANG A");
    notifyToast(`✏️ Mode Edit aktif untuk ${formatPartaiDisplay(m.matchNumber || m.id)}`);
  };

  const getMatchRoundAnalysis = (targetLogs: any[], rCount: number = 3, redTotal: number = 0, blueTotal: number = 0, redStats?: any, blueStats?: any) => {
    const roundData: {
      round: number;
      redRound: number;
      blueRound: number;
      redCumulative: number;
      blueCumulative: number;
      redPunches: number;
      redKicks: number;
      redDrops: number;
      redPenalties: number;
      bluePunches: number;
      blueKicks: number;
      blueDrops: number;
      bluePenalties: number;
    }[] = [];

    let cumR = 0;
    let cumB = 0;

    if (targetLogs && targetLogs.length > 0) {
      for (let r = 1; r <= rCount; r++) {
        const rLogs = targetLogs.filter((l: any) => l.round === r && !l.uncounted);
        let rP = 0, rK = 0, rD = 0, rPen = 0;
        let bP = 0, bK = 0, bD = 0, bPen = 0;

        rLogs.forEach((log: any) => {
          const pts = log.points || 0;
          if (log.fighter === "RED") {
            if (log.type === "PUNCH") rP += pts;
            else if (log.type === "KICK") rK += pts;
            else if (log.type === "DROP") rD += pts;
            else if (log.type === "PENALTY") rPen += pts;
          } else if (log.fighter === "BLUE") {
            if (log.type === "PUNCH") bP += pts;
            else if (log.type === "KICK") bK += pts;
            else if (log.type === "DROP") bD += pts;
            else if (log.type === "PENALTY") bPen += pts;
          }
        });

        const rTot = rP + rK + rD + rPen;
        const bTot = bP + bK + bD + bPen;
        cumR += rTot;
        cumB += bTot;

        roundData.push({
          round: r,
          redRound: rTot,
          blueRound: bTot,
          redCumulative: cumR,
          blueCumulative: cumB,
          redPunches: rP,
          redKicks: rK,
          redDrops: rD,
          redPenalties: rPen,
          bluePunches: bP,
          blueKicks: bK,
          blueDrops: bD,
          bluePenalties: bPen,
        });
      }
    } else {
      const rTotPerRound = Math.floor(redTotal / rCount);
      const bTotPerRound = Math.floor(blueTotal / rCount);
      for (let r = 1; r <= rCount; r++) {
        const isLast = r === rCount;
        const rTot = isLast ? (redTotal - cumR) : rTotPerRound;
        const bTot = isLast ? (blueTotal - cumB) : bTotPerRound;
        cumR += rTot;
        cumB += bTot;
        roundData.push({
          round: r,
          redRound: rTot,
          blueRound: bTot,
          redCumulative: cumR,
          blueCumulative: cumB,
          redPunches: Math.floor((redStats?.punches || 0) / rCount),
          redKicks: Math.floor((redStats?.kicks || 0) / rCount),
          redDrops: Math.floor((redStats?.drops || 0) / rCount),
          redPenalties: -(Math.floor((redStats?.warnings || 0) / rCount)),
          bluePunches: Math.floor((blueStats?.punches || 0) / rCount),
          blueKicks: Math.floor((blueStats?.kicks || 0) / rCount),
          blueDrops: Math.floor((blueStats?.drops || 0) / rCount),
          bluePenalties: -(Math.floor((blueStats?.warnings || 0) / rCount)),
        });
      }
    }

    let redRoundsWon = 0;
    let blueRoundsWon = 0;
    let draws = 0;
    let maxRoundPts = 0;
    let maxRoundWinner = "Seimbang";
    let maxRoundNum = 1;

    roundData.forEach((d) => {
      if (d.redRound > d.blueRound) redRoundsWon++;
      else if (d.blueRound > d.redRound) blueRoundsWon++;
      else draws++;

      const maxAbs = Math.max(Math.abs(d.redRound), Math.abs(d.blueRound));
      if (maxAbs >= maxRoundPts) {
        maxRoundPts = maxAbs;
        maxRoundWinner = d.redRound > d.blueRound ? "Sudut Merah" : d.blueRound > d.redRound ? "Sudut Biru" : "Seimbang";
        maxRoundNum = d.round;
      }
    });

    return {
      roundData,
      summary: {
        redRoundsWon,
        blueRoundsWon,
        draws,
        maxRoundPts,
        maxRoundWinner,
        maxRoundNum
      }
    };
  };

  const generateMatchPdfPage = (doc: jsPDF, mItem?: any) => {
    // Margins: top 1.8cm, left 3cm, right 3cm. (X range: 30 to 180, total printable width = 150mm)
    // Draw Left and Right logos
    drawLogoPdf(doc, logoLeftLocal || "/logo_panel_dewan.svg", 30, 18, 14);
    drawLogoPdf(doc, logoRightLocal || "/logo_panel_dewan.svg", 166, 18, 14);

    // Title & Event Header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text("HASIL PERTANDINGAN RESMI", 105, 23, { align: "center" });

    doc.setFontSize(10);
    doc.text((eventName || "PAKU BANTEN CHAMPIONSHIP").toUpperCase(), 105, 28, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 80, 95);
    const mergedPlaceTime = `${(tempatPelaksanaan || "IDI RAYEUK").toUpperCase()} | ${(waktuPelaksanaan || "07 S.D 12 JULI 2024").toUpperCase()}`;
    doc.text(mergedPlaceTime, 105, 33, { align: "center" });

    // Double line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(30, 36.5, 180, 36.5);
    doc.setLineWidth(0.2);
    doc.line(30, 37.5, 180, 37.5);

    // Resolve variables
    const pNo = mItem ? (mItem.matchNumber || "").replace(/Partai\s+/i, "") : (partaiNumber || "3");
    const stageName = mItem ? mItem.stage : tahap;
    const catObj = mItem ? categories.find(c => c.id === mItem.categoryClassId) : null;
    const kelas = mItem ? (mItem.classCategory || (catObj ? `Tanding ${catObj.name} ${mItem.gender === "PUTRI" ? "Putri" : "Putra"} (${catObj.minWeight}Kg - ${catObj.maxWeight}Kg)` : "Tanding Bebas")) : `${kelasNomor} (${gender})`;
    
    const redName = mItem ? (mItem.fighterRedName || getParticipantName(mItem.fighterRedId) || "BYE / KOSONG") : (atlitMerahName || "EKO WAHYUDI");
    const redClub = mItem ? (mItem.fighterRedClub || getParticipantClub(mItem.fighterRedId) || "-") : (kontingenMerah || "KONTINGEN");
    const scoreR = mItem ? (mItem.scoreRed ?? 0) : (state?.scoreRed ?? 0);
    const redStatsObj = mItem ? (mItem.redStats || { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0 }) : (state?.redStats || { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0 });

    const blueName = mItem ? (mItem.fighterBlueName || getParticipantName(mItem.fighterBlueId) || "BYE / KOSONG") : (atlitBiruName || "FAJAR NUGRAHA");
    const blueClub = mItem ? (mItem.fighterBlueClub || getParticipantClub(mItem.fighterBlueId) || "-") : (kontingenBiru || "KONTINGEN");
    const scoreB = mItem ? (mItem.scoreBlue ?? 0) : (state?.scoreBlue ?? 0);
    const blueStatsObj = mItem ? (mItem.blueStats || { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0 }) : (state?.blueStats || { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0 });

    // Metadata Row
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`PARTAI: ${pNo}`, 30, 42.5);
    doc.text(`TAHAP: ${stageName}`, 75, 42.5);
    doc.text(`KELAS: ${kelas}`, 120, 42.5);
    
    doc.setLineWidth(0.2);
    doc.line(30, 45, 180, 45);

    // Red Corner Box (starts at X=30, width=72, height=48, Y=48)
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(0.4);
    doc.rect(30, 48, 72, 48, "FD");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38);
    doc.text("SUDUT MERAH", 66, 53.5, { align: "center" });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(redName.length > 22 ? redName.substring(0, 20) + "..." : redName, 66, 58.5, { align: "center" });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(redClub.length > 24 ? redClub.substring(0, 22) + "..." : redClub, 66, 62.5, { align: "center" });

    // Score Merah
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(220, 38, 38);
    doc.text(`${scoreR}`, 66, 74, { align: "center" });

    // Red Stats Table
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(241, 245, 249);
    doc.rect(33, 78, 66, 4.5, "FD");
    doc.text("Pukulan", 41.25, 81.2, { align: "center" });
    doc.text("Tendangan", 57.75, 81.2, { align: "center" });
    doc.text("Jatuhan", 74.25, 81.2, { align: "center" });
    doc.text("Hukuman", 90.75, 81.2, { align: "center" });

    doc.rect(33, 82.5, 66, 5);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`${redStatsObj?.punches ?? 0}`, 41.25, 86.2, { align: "center" });
    doc.text(`${redStatsObj?.kicks ?? 0}`, 57.75, 86.2, { align: "center" });
    doc.text(`${redStatsObj?.drops ?? 0}`, 74.25, 86.2, { align: "center" });
    doc.text(`-${redStatsObj?.warnings ?? 0}`, 90.75, 86.2, { align: "center" });

    // Blue Corner Box (starts at X=108, width=72, height=48, Y=48)
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.4);
    doc.rect(108, 48, 72, 48, "FD");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(29, 79, 216);
    doc.text("SUDUT BIRU", 144, 53.5, { align: "center" });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(blueName.length > 22 ? blueName.substring(0, 20) + "..." : blueName, 144, 58.5, { align: "center" });

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(blueClub.length > 24 ? blueClub.substring(0, 22) + "..." : blueClub, 144, 62.5, { align: "center" });

    // Score Biru
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(29, 79, 216);
    doc.text(`${scoreB}`, 144, 74, { align: "center" });

    // Blue Stats Table
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(241, 245, 249);
    doc.rect(111, 78, 66, 4.5, "FD");
    doc.text("Pukulan", 119.25, 81.2, { align: "center" });
    doc.text("Tendangan", 135.75, 81.2, { align: "center" });
    doc.text("Jatuhan", 152.25, 81.2, { align: "center" });
    doc.text("Hukuman", 168.75, 81.2, { align: "center" });

    doc.rect(111, 82.5, 66, 5);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`${blueStatsObj?.punches ?? 0}`, 119.25, 86.2, { align: "center" });
    doc.text(`${blueStatsObj?.kicks ?? 0}`, 135.75, 86.2, { align: "center" });
    doc.text(`${blueStatsObj?.drops ?? 0}`, 152.25, 86.2, { align: "center" });
    doc.text(`-${blueStatsObj?.warnings ?? 0}`, 168.75, 86.2, { align: "center" });

    // Summary / Winner Box (Y=99, H=9)
    doc.setDrawColor(187, 247, 208);
    doc.setFillColor(240, 253, 244);
    doc.setLineWidth(0.4);
    doc.rect(30, 99, 150, 9, "FD");

    const winText = scoreR > scoreB 
      ? `HASIL AKHIR: SUDUT MERAH MENANG (${scoreR} - ${scoreB})` 
      : scoreB > scoreR 
      ? `HASIL AKHIR: SUDUT BIRU MENANG (${scoreB} - ${scoreR})` 
      : "HASIL AKHIR: SERI (DRAW)";

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(22, 101, 52);
    doc.text(winText, 105, 105, { align: "center" });

    // =========================================================================
    // REKAPITULASI VISUALISASI & ANALISIS SKOR PERTANDINGAN (IPSI 2026 & PERSILAT)
    // =========================================================================
    const sectionTopY = 111;

    // Header Title Banner
    doc.setFillColor(15, 23, 42); // Dark slate
    doc.rect(30, sectionTopY, 150, 5.5, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("REKAPITULASI VISUALISASI & ANALISIS SKOR PERTANDINGAN", 105, sectionTopY + 3.8, { align: "center" });

    // Calculate round-by-round statistics
    const matchLogs = (mItem?.logs && mItem.logs.length > 0) ? mItem.logs : (state?.logs && state.logs.length > 0 ? state.logs : []);
    const roundCountVal = Number(state?.roundCount) || 3;

    // Compute detailed round metrics
    const analysis = getMatchRoundAnalysis(matchLogs, roundCountVal, scoreR, scoreB, redStatsObj, blueStatsObj);

    // Draw Tabulasi Skor Per Ronde Table (Y=117..145)
    const tableTopY = 117.5;
    const rowH = 4.8;

    // Table Header
    doc.setFillColor(226, 232, 240);
    doc.rect(30, tableTopY, 150, rowH, "FD");
    doc.setDrawColor(203, 213, 225);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    doc.text("RONDE", 42, tableTopY + 3.4, { align: "center" });
    doc.text("SUDUT MERAH (SKOR / KUMULATIF)", 78, tableTopY + 3.4, { align: "center" });
    doc.text("SUDUT BIRU (SKOR / KUMULATIF)", 124, tableTopY + 3.4, { align: "center" });
    doc.text("DOMINASI RONDE", 163, tableTopY + 3.4, { align: "center" });

    let currentY = tableTopY + rowH;

    analysis.roundData.forEach((rd, idx) => {
      const isEven = idx % 2 === 1;
      if (isEven) {
        doc.setFillColor(248, 250, 252);
        doc.rect(30, currentY, 150, rowH, "F");
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(30, currentY, 150, rowH, "D");

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);

      // Ronde column
      doc.setFont("Helvetica", "bold");
      doc.text(`Ronde ${rd.round}`, 42, currentY + 3.4, { align: "center" });

      // Red round & cumulative
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`${rd.redRound > 0 ? "+" + rd.redRound : rd.redRound} Poin`, 68, currentY + 3.4, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`(Tot: ${rd.redCumulative})`, 88, currentY + 3.4, { align: "center" });

      // Blue round & cumulative
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(29, 79, 216);
      doc.text(`${rd.blueRound > 0 ? "+" + rd.blueRound : rd.blueRound} Poin`, 114, currentY + 3.4, { align: "center" });
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`(Tot: ${rd.blueCumulative})`, 134, currentY + 3.4, { align: "center" });

      // Dominance text
      doc.setFont("Helvetica", "bold");
      if (rd.redRound > rd.blueRound) {
        doc.setTextColor(220, 38, 38);
        doc.text(`Merah +${rd.redRound - rd.blueRound}`, 163, currentY + 3.4, { align: "center" });
      } else if (rd.blueRound > rd.redRound) {
        doc.setTextColor(29, 79, 216);
        doc.text(`Biru +${rd.blueRound - rd.redRound}`, 163, currentY + 3.4, { align: "center" });
      } else {
        doc.setTextColor(100, 116, 139);
        doc.text("Seimbang (0)", 163, currentY + 3.4, { align: "center" });
      }

      currentY += rowH;
    });

    // Total Summary Row in table
    doc.setFillColor(241, 245, 249);
    doc.rect(30, currentY, 150, rowH + 0.5, "FD");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("SKOR AKHIR", 42, currentY + 3.7, { align: "center" });

    doc.setTextColor(220, 38, 38);
    doc.text(`${scoreR} Poin`, 78, currentY + 3.7, { align: "center" });

    doc.setTextColor(29, 79, 216);
    doc.text(`${scoreB} Poin`, 124, currentY + 3.7, { align: "center" });

    doc.setTextColor(scoreR > scoreB ? 220 : 29, scoreR > scoreB ? 38 : 79, scoreR > scoreB ? 38 : 216);
    doc.text(scoreR > scoreB ? "Merah Unggul" : scoreB > scoreR ? "Biru Unggul" : "Draw", 163, currentY + 3.7, { align: "center" });

    currentY += rowH + 2.5;

    // Insights Cards Row: 2 Balanced Boxes (X=30..102 and X=108..180, Height=26)
    const boxY = currentY;
    const boxH = 26;

    // Left Insight Box: Analisis Kinerja & Dominasi Ronde
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(30, boxY, 72, boxH, "FD");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("ANALISIS PENGUASAAN & AKTIVITAS", 66, boxY + 4.5, { align: "center" });
    doc.setLineWidth(0.2);
    doc.line(33, boxY + 6.5, 99, boxY + 6.5);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Penguasaan Ronde: Merah ${analysis.summary.redRoundsWon} • Biru ${analysis.summary.blueRoundsWon} • Seri ${analysis.summary.draws}`, 33, boxY + 11);
    doc.text(`• Ronde Teraktif: Ronde ${analysis.summary.maxRoundNum} (${analysis.summary.maxRoundPts} Poin - ${analysis.summary.maxRoundWinner})`, 33, boxY + 15.5);
    doc.text(`• Distribusi Serangan Positif: M:${(redStatsObj?.punches||0)+(redStatsObj?.kicks||0)+(redStatsObj?.drops||0)}x vs B:${(blueStatsObj?.punches||0)+(blueStatsObj?.kicks||0)+(blueStatsObj?.drops||0)}x`, 33, boxY + 20);
    doc.text(`• Akumulasi Deduksi Hukuman: M:-${redStatsObj?.warnings||0} vs B:-${blueStatsObj?.warnings||0}`, 33, boxY + 24.5);

    // Right Insight Box: Rekapitulasi Juri & Konsensus IPSI
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(108, boxY, 72, boxH, "FD");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("REKAPITULASI PENEKANAN WASIT JURI", 144, boxY + 4.5, { align: "center" });
    doc.setLineWidth(0.2);
    doc.line(111, boxY + 6.5, 177, boxY + 6.5);

    const juryP = mItem?.juryPressStats || state?.juryPressStats;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    if (juryP) {
      doc.text(`• Juri 1: Merah (${juryP.juri1?.redPunch||0}P/${juryP.juri1?.redKick||0}T) | Biru (${juryP.juri1?.bluePunch||0}P/${juryP.juri1?.blueKick||0}T)`, 111, boxY + 11);
      doc.text(`• Juri 2: Merah (${juryP.juri2?.redPunch||0}P/${juryP.juri2?.redKick||0}T) | Biru (${juryP.juri2?.bluePunch||0}P/${juryP.juri2?.blueKick||0}T)`, 111, boxY + 15.5);
      doc.text(`• Juri 3: Merah (${juryP.juri3?.redPunch||0}P/${juryP.juri3?.redKick||0}T) | Biru (${juryP.juri3?.bluePunch||0}P/${juryP.juri3?.blueKick||0}T)`, 111, boxY + 20);
      doc.text(`• Total Entri Validasi Tombol Juri: ${juryP.totalPresses || ((juryP.juri1?.total||0) + (juryP.juri2?.total||0) + (juryP.juri3?.total||0))} aksi`, 111, boxY + 24.5);
    } else {
      doc.text(`• Sistem Penjurian: 3 Wasit Juri Terhubung Digital`, 111, boxY + 11);
      doc.text(`• Protokol Penilaian: Konsensus Mayoritas 2-3 Juri (IPSI 2026 & PERSILAT)`, 111, boxY + 15.5);
      doc.text(`• Verifikasi Dewan: Tercatat dan divalidasi sah di database`, 111, boxY + 20);
      doc.text(`• Integritas Nilai: 100% Real-time Tanpa Manipulasi Manual`, 111, boxY + 24.5);
    }

    // =========================================================================
    // SIGNATURES & LEGALITAS
    // =========================================================================
    const sigY = boxY + boxH + 8;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);

    const docCityDate = `${(namaDaerahCetak || tempatPelaksanaan || "IDI RAYEUK").toUpperCase()}, ${tanggalCetakDokumen || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }).toUpperCase()}`;
    doc.text(docCityDate, 144, sigY - 3.5, { align: "center" });

    doc.text("Sekretaris Pertandingan,", 66, sigY + 2, { align: "center" });
    doc.line(40, sigY + 20, 92, sigY + 20);
    if (namaSekretarisPertandingan) {
      doc.setFont("Helvetica", "bold");
      doc.text(namaSekretarisPertandingan.toUpperCase(), 66, sigY + 24, { align: "center" });
      doc.setFont("Helvetica", "normal");
    }

    doc.text("Ketua Dewan Juri,", 144, sigY + 2, { align: "center" });
    doc.line(118, sigY + 20, 170, sigY + 20);
    if (namaKetuaPertandingan) {
      doc.setFont("Helvetica", "bold");
      doc.text(namaKetuaPertandingan.toUpperCase(), 144, sigY + 24, { align: "center" });
      doc.setFont("Helvetica", "normal");
    }
  };

  // Unified list of all finished matches (combining schedule SELESAI items and archived matches)
  const finishedMatchesHistory = useMemo(() => {
    const map = new Map<string, any>();
    const normKey = (item: any) => {
      const d = String(item?.matchNumber || "").replace(/\D/g, "");
      if (d) return `partai-${parseInt(d, 10)}`;
      return String(item?.id || item?.matchNumber || Math.random());
    };
    schedules
      .filter((m) => m && m.status === "SELESAI")
      .forEach((m) => {
        map.set(normKey(m), m);
      });
    archivedMatchesList.forEach((a) => {
      if (!a) return;
      const k = normKey(a);
      const existing = map.get(k);
      map.set(k, existing ? { ...existing, ...a } : a);
    });
    return Array.from(map.values()).sort((a, b) => {
      const nA = parseInt(String(a?.matchNumber || "").replace(/\D/g, "") || "9999", 10);
      const nB = parseInt(String(b?.matchNumber || "").replace(/\D/g, "") || "9999", 10);
      return nA - nB;
    });
  }, [schedules, archivedMatchesList]);

  const downloadAllFinishedMatchesPdf = () => {
    if (finishedMatchesHistory.length === 0) {
      notifyToast("⚠️ Belum ada histori partai selesai untuk diunduh!");
      return;
    }
    sound.playClick();
    notifyToast(`⏳ Menyiapkan PDF gabungan (${finishedMatchesHistory.length} partai selesai)...`);
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    finishedMatchesHistory.forEach((mItem, idx) => {
      if (idx > 0) doc.addPage();
      generateMatchPdfPage(doc, mItem);
    });
    doc.save(`Histori_Hasil_Tanding_Semua_${finishedMatchesHistory.length}_Partai.pdf`);
    notifyToast(`📥 Berhasil mengunduh PDF seluruh ${finishedMatchesHistory.length} partai selesai!`);
  };

  const buildMatchExcelRow = (mItem: any, idx: number) => {
    const redName = mItem.fighterRedName || getParticipantName(mItem.fighterRedId) || "PESILAT MERAH";
    const redClub = mItem.fighterRedClub || getParticipantClub(mItem.fighterRedId) || "KONTINGEN MERAH";
    const blueName = mItem.fighterBlueName || getParticipantName(mItem.fighterBlueId) || "PESILAT BIRU";
    const blueClub = mItem.fighterBlueClub || getParticipantClub(mItem.fighterBlueId) || "KONTINGEN BIRU";
    const winSide =
      mItem.winner ||
      (mItem.winnerColor === "RED"
        ? "MERAH"
        : mItem.winnerColor === "BLUE"
        ? "BIRU"
        : (mItem.scoreRed ?? 0) > (mItem.scoreBlue ?? 0)
        ? "MERAH"
        : (mItem.scoreBlue ?? 0) > (mItem.scoreRed ?? 0)
        ? "BIRU"
        : "SERI");
    const winnerName = winSide === "MERAH" ? redName : winSide === "BIRU" ? blueName : "-";
    const winnerClub = winSide === "MERAH" ? redClub : winSide === "BIRU" ? blueClub : "-";
    return {
      No: idx + 1,
      Partai: formatPartaiDisplay(mItem.matchNumber),
      Babak_Tahap: mItem.stage || "PENYISIHAN",
      Kelas_Kategori: mItem.classCategory || "TANDING",
      Gender: mItem.gender || "PUTRA",
      Gelanggang: mItem.arena || "GELANGGANG A",
      Sudut_Merah: redName,
      Kontingen_Merah: redClub,
      Skor_Merah: mItem.scoreRed ?? 0,
      Sudut_Biru: blueName,
      Kontingen_Biru: blueClub,
      Skor_Biru: mItem.scoreBlue ?? 0,
      Sudut_Pemenang: winSide,
      Nama_Pemenang: winnerName,
      Kontingen_Pemenang: winnerClub,
      Metode_Kemenangan: mItem.winnerMethod || "MENANG ANGKA",
      Pukulan_Merah: mItem.redStats?.punches ?? 0,
      Tendangan_Merah: mItem.redStats?.kicks ?? 0,
      Jatuhan_Merah: mItem.redStats?.drops ?? 0,
      Hukuman_Merah: mItem.redStats?.warnings ?? 0,
      Pukulan_Biru: mItem.blueStats?.punches ?? 0,
      Tendangan_Biru: mItem.blueStats?.kicks ?? 0,
      Jatuhan_Biru: mItem.blueStats?.drops ?? 0,
      Hukuman_Biru: mItem.blueStats?.warnings ?? 0
    };
  };

  const downloadSingleMatchExcel = (mItem: any) => {
    if (!mItem) return;
    sound.playClick();
    const row = buildMatchExcelRow(mItem, 0);
    const ws = XLSX.utils.json_to_sheet([row]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil Partai");
    const cleanPartai = String(mItem.matchNumber || "1").replace(/[^a-zA-Z0-9_-]/g, "_");
    XLSX.writeFile(wb, `Hasil_Tanding_Partai_${cleanPartai}.xlsx`);
    notifyToast(`📥 Hasil Partai ${formatPartaiDisplay(mItem.matchNumber)} (Excel) berhasil diunduh!`);
  };

  const downloadAllFinishedMatchesExcel = () => {
    if (finishedMatchesHistory.length === 0) {
      notifyToast("⚠️ Belum ada histori partai selesai untuk diunduh!");
      return;
    }
    sound.playClick();
    const rows = finishedMatchesHistory.map((mItem, idx) => buildMatchExcelRow(mItem, idx));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histori Hasil Tanding");
    XLSX.writeFile(wb, `Histori_Hasil_Tanding_Semua_${finishedMatchesHistory.length}_Partai.xlsx`);
    notifyToast(`📥 Berhasil mengunduh Excel seluruh ${finishedMatchesHistory.length} partai selesai!`);
  };

  const downloadBatchMatchPdfReports = (matchIds: string[]) => {
    if (matchIds.length === 0) {
      alert("Pilih setidaknya satu pertandingan untuk dicetak!");
      return;
    }
    sound.playClick();
    notifyToast(`⏳ Menyiapkan cetak ${matchIds.length} laporan tanding...`);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    let addedPageCount = 0;

    matchIds.forEach((mId) => {
      const mItem = schedules.find(m => m.id === mId) || finishedMatchesHistory.find(m => m.id === mId);
      if (!mItem) return;

      if (addedPageCount > 0) {
        doc.addPage();
      }
      addedPageCount++;

      generateMatchPdfPage(doc, mItem);
    });

    doc.save(`Laporan_Gabungan_${matchIds.length}_Partai.pdf`);
    notifyToast(`📥 Berhasil mengunduh ${matchIds.length} laporan tanding gabungan!`);
  };

  // PDF report downloader
  const downloadMatchPdfReport = (mItem?: any) => {
    sound.playClick();
    
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    generateMatchPdfPage(doc, mItem);

    const pNo = mItem ? (mItem.matchNumber || "").replace(/Partai\s+/i, "") : (partaiNumber || "3");
    doc.save(`Hasil_Partai_${pNo}.pdf`);
    notifyToast(`📥 Hasil Pertandingan Partai ${pNo} berhasil diunduh ke PC Anda!`);
  };

  // Parse Excel sheets uploaded by user for brackets and schedules
  const handleUploadExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sound.playClick();
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstream = evt?.target?.result;
        if (!bstream) return;
        const workbook = XLSX.read(bstream, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

        if (rawRows.length < 2) {
          alert("Spreadsheet kosong atau format tidak sesuai!");
          return;
        }

        let headers = rawRows[0];
        let startIndex = 1;
        
        const isHeaderRow = headers.some((h: any) => typeof h === 'string' && /partai|atlit|nama|kelas|sudut|merah|biru/i.test(h));
        if (!isHeaderRow && rawRows[1]) {
          headers = rawRows[1];
          startIndex = 2;
        }

        let idxPartai = -1;
        let idxKelas = -1;
        let idxBabak = -1;
        let idxMerahNama = -1;
        let idxMerahClub = -1;
        let idxBiruNama = -1;
        let idxBiruClub = -1;
        let idxGender = -1;
        let idxArena = -1;

        headers.forEach((h: any, i: number) => {
          if (!h) return;
          const label = h.toString().toLowerCase();
          if (label.includes("partai") || (label.includes("no") && label.includes("partai")) || (label.includes("no") && label.includes("match")) || label === "no" && idxPartai === -1) idxPartai = i;
          else if (label.includes("kelas") || label.includes("class")) idxKelas = i;
          else if (label.includes("babak") || label.includes("stage") || label.includes("tahap")) idxBabak = i;
          else if (label.includes("merah") && (label.includes("nama") || label.includes("atlit") || label.includes("atlet") || label.includes("pemenang") || label.includes("fighter"))) idxMerahNama = i;
          else if (label.includes("merah") && (label.includes("kontingen") || label.includes("club") || label.includes("asal") || label.includes("daerah") || label.includes("kota"))) idxMerahClub = i;
          else if (label.includes("biru") && (label.includes("nama") || label.includes("atlit") || label.includes("atlet") || label.includes("pemenang") || label.includes("fighter"))) idxBiruNama = i;
          else if (label.includes("biru") && (label.includes("kontingen") || label.includes("club") || label.includes("asal") || label.includes("daerah") || label.includes("kota"))) idxBiruClub = i;
          else if (label.includes("gender") || label.includes("kelamin") || label.includes("kategori") || label.includes("sex")) idxGender = i;
          else if (label.includes("gelanggang") || label.includes("arena")) idxArena = i;
        });

        if (idxPartai === -1) idxPartai = 0;
        if (idxKelas === -1) idxKelas = 1;
        if (idxMerahNama === -1) idxMerahNama = 2;
        if (idxMerahClub === -1) idxMerahClub = 3;
        if (idxBiruNama === -1) idxBiruNama = 4;
        if (idxBiruClub === -1) idxBiruClub = 5;

        const newCategories: any[] = [];
        const newParticipants: any[] = [];
        const newMatches: any[] = [];

        let matchCount = 0;
        for (let i = startIndex; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0 || !row[idxPartai]) continue;

          matchCount++;
          const matchVal = row[idxPartai]?.toString() || "";
          if (!matchVal || matchVal.toLowerCase().includes("catatan") || matchVal.toLowerCase().includes("official")) continue;

          const matchNumber = matchVal.toLowerCase().includes("partai") ? matchVal : `Partai ${matchVal}`;
          const rawKelas = row[idxKelas]?.toString() || "Kelas C";
          const rawBabak = idxBabak !== -1 && row[idxBabak] ? row[idxBabak].toString() : "PENYISIHAN";
          const redName = idxMerahNama !== -1 && row[idxMerahNama] ? row[idxMerahNama].toString() : "ATLIT MERAH";
          const redClub = idxMerahClub !== -1 && row[idxMerahClub] ? row[idxMerahClub].toString() : "KONTINGEN";
          const blueName = idxBiruNama !== -1 && row[idxBiruNama] ? row[idxBiruNama].toString() : "ATLIT BIRU";
          const blueClub = idxBiruClub !== -1 && row[idxBiruClub] ? row[idxBiruClub].toString() : "KONTINGEN";
          const sGender = idxGender !== -1 && row[idxGender] ? row[idxGender].toString().toUpperCase() : "PUTRA";
          const arenaName = idxArena !== -1 && row[idxArena] ? row[idxArena].toString() : "Gelanggang A";

          const cleanGender = (sGender.includes("PUTRI") || sGender.includes("PI") || rawKelas.toUpperCase().includes(" PI") || rawKelas.toUpperCase().includes("PUTRI")) ? "PUTRI" : "PUTRA";

          const catId = `cat-${rawKelas.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
          const redPartId = `p-red-${i}`;
          const bluePartId = `p-blue-${i}`;

          if (!newCategories.find(c => c.id === catId)) {
            newCategories.push({
              id: catId,
              name: rawKelas,
              minWeight: 55,
              maxWeight: 60,
              division: "Dewasa"
            });
          }

          newParticipants.push({
            id: redPartId,
            name: redName.toUpperCase(),
            club: redClub.toUpperCase(),
            gender: cleanGender,
            categoryClassId: catId,
            weight: 55
          });

          newParticipants.push({
            id: bluePartId,
            name: blueName.toUpperCase(),
            club: blueClub.toUpperCase(),
            gender: cleanGender,
            categoryClassId: catId,
            weight: 56
          });

          newMatches.push({
            id: `m-${i}`,
            matchNumber,
            stage: rawBabak.trim().toUpperCase(),
            categoryClassId: catId,
            fighterRedId: redPartId,
            fighterBlueId: bluePartId,
            arena: arenaName,
            gender: cleanGender,
            status: "BELUM"
          });
        }

        if (newMatches.length === 0) {
          alert("Tidak ada data pertandingan valid terekstrak dari excel!");
          return;
        }

        const res = await fetch("/api/tournament/import-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newCategories,
            newParticipants,
            newMatches
          })
        });

        if (res.ok) {
          notifyToast(`🎉 Sukses mengimpor ${newMatches.length} partai dari file Excel!`);
          fetchSchedules();
        } else {
          alert("Gagal melakukan impor batch ke server.");
        }
      } catch (err) {
        console.error(err);
        alert("Gagal mengurai file Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // 1. Download formatted Excel template for POPDA Athletes
  const downloadSampleExcel = () => {
    sound.playClick();
    const templateData = [
      ["NO", "NAMA ATLIT", "KONTINGEN", "GENDER", "KELAS", "BERAT BADAN (KG)", "GELANGGANG"],
      [1, "FAJAR NUGRAHA", "ACEH BESAR", "PUTRA", "Kelas C", 58, "GELANGGANG A"],
      [2, "EKO WAHYUDI", "BANDA ACEH", "PUTRA", "Kelas C", 59, "GELANGGANG A"],
      [3, "MUKHLIS AMIN", "ACEH TIMUR", "PUTRA", "Kelas C", 57, "GELANGGANG B"],
      [4, "BUDI RAHARJO", "SABANG", "PUTRA", "Kelas C", 56, "GELANGGANG B"],
      [5, "RAHMAN HAKIM", "LHOKSEUMAWE", "PUTRA", "Kelas C", 57.5, "GELANGGANG C"],
      [6, "CHANDRA WIJAYA", "LANGSA", "PUTRA", "Kelas C", 58.2, "GELANGGANG C"],
      [7, "SULAIMAN ARIF", "PIDIE", "PUTRA", "Kelas C", 59.5, "GELANGGANG D"],
      [8, "ALDI SETIAWAN", "BENER MERIAH", "PUTRA", "Kelas C", 56.8, "GELANGGANG D"],
      [9, "SITI NUR HALIZA", "BANDA ACEH", "PUTRI", "Kelas B", 52, "GELANGGANG A"],
      [10, "DIAN UTAMI", "ACEH BESAR", "PUTRI", "Kelas B", 54, "GELANGGANG B"]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Atlit Disco");
    XLSX.writeFile(workbook, "Template Input Atlit Disco.xlsx");
    notifyToast("📥 File Template Input Atlit Disco berhasil diunduh!");
  };

  // Helper function to extract any manual or imported athletes from schedules into participants list
  const extractParticipantsFromSchedules = (scheds: any[], currentParts: any[]) => {
    const partsMap = new Map<string, any>();
    
    // Seed with existing participants
    currentParts.forEach(p => {
      if (p && p.id) {
        partsMap.set(p.id, { ...p });
      }
    });

    scheds.forEach(m => {
      if (m.fighterRedId && m.fighterRedId !== "KOSONG" && !m.fighterRedId.startsWith("placeholder-") && !m.fighterRedId.startsWith("winner-")) {
        const existing = partsMap.get(m.fighterRedId);
        if (existing) {
          // Sync existing participant's class, gender, name, and club to match the schedule match
          existing.categoryClassId = m.categoryClassId;
          existing.gender = m.gender || "PUTRA";
          if (m.fighterRedName) existing.name = m.fighterRedName.toUpperCase();
          if (m.fighterRedClub) existing.club = m.fighterRedClub.toUpperCase();
        } else {
          partsMap.set(m.fighterRedId, {
            id: m.fighterRedId,
            name: (m.fighterRedName || "ATLIT RED").toUpperCase(),
            club: (m.fighterRedClub || "KONTINGEN").toUpperCase(),
            gender: m.gender || "PUTRA",
            categoryClassId: m.categoryClassId,
            weight: 55
          });
        }
      }
      if (m.fighterBlueId && m.fighterBlueId !== "KOSONG" && !m.fighterBlueId.startsWith("placeholder-") && !m.fighterBlueId.startsWith("winner-")) {
        const existing = partsMap.get(m.fighterBlueId);
        if (existing) {
          // Sync existing participant's class, gender, name, and club to match the schedule match
          existing.categoryClassId = m.categoryClassId;
          existing.gender = m.gender || "PUTRA";
          if (m.fighterBlueName) existing.name = m.fighterBlueName.toUpperCase();
          if (m.fighterBlueClub) existing.club = m.fighterBlueClub.toUpperCase();
        } else {
          partsMap.set(m.fighterBlueId, {
            id: m.fighterBlueId,
            name: (m.fighterBlueName || "ATLIT BLUE").toUpperCase(),
            club: (m.fighterBlueClub || "KONTINGEN").toUpperCase(),
            gender: m.gender || "PUTRA",
            categoryClassId: m.categoryClassId,
            weight: 55
          });
        }
      }
    });

    return Array.from(partsMap.values());
  };

  // Synchronously computes brackets scheme for ALL categories and genders from participants lists
  const generateAllBracketsData = (cats: any[], parts: any[], scheme: "POOL_AB" | "SINGLE_NO_POOL" | "DOUBLE_POOL", activeSchedules?: any[]) => {
    let allGeneratedMatches: any[] = [];
    let matchGlobalCounter = 1;
    let arenaVal = scheduleGelanggang || "GELANGGANG A";
    const currentSchedules = activeSchedules || schedules;

    cats.forEach(cat => {
      ["PUTRA", "PUTRI"].forEach(g => {
        const unfilteredPart = parts.filter(p => p.categoryClassId === cat.id && p.gender === g && p.name && p.name.trim() !== "");
        
        // Filter out dummy/palsu athletes if there is at least one real athlete registered in this class + gender
        const realParts = unfilteredPart.filter(p => !isDummyAthleteObj(p));
        const filteredPart = realParts.length > 0 ? realParts : unfilteredPart;

        // Find user matches for this category and gender to align brackets with actual schedule input
        const userMatches = currentSchedules.filter(m => 
          m.categoryClassId === cat.id && 
          m.gender === g &&
          m.fighterRedId && 
          m.fighterBlueId &&
          m.fighterRedId !== "KOSONG" &&
          m.fighterBlueId !== "KOSONG" &&
          !m.fighterRedId.startsWith("placeholder-") &&
          !m.fighterBlueId.startsWith("placeholder-") &&
          !m.fighterRedId.startsWith("winner-") &&
          !m.fighterBlueId.startsWith("winner-")
        );
        
        // Sort user matches by matchNumber numerically or order of appearance
        const sortedUserMatches = [...userMatches].sort((a, b) => {
          const numA = parseInt(a.matchNumber?.toString().replace(/\D/g, "") || "999");
          const numB = parseInt(b.matchNumber?.toString().replace(/\D/g, "") || "999");
          return numA - numB;
        });

        if (filteredPart.length === 0 && sortedUserMatches.length === 0) return;

        // Auto determine sequential/nearest power-of-two bracket capacity (2-64)
        const N = filteredPart.length;
        let reqCapacity = 2;
        if (N <= 2) reqCapacity = 2;
        else if (N <= 4) reqCapacity = 4;
        else if (N <= 8) reqCapacity = 8;
        else if (N <= 16) reqCapacity = 16;
        else if (N <= 32) reqCapacity = 32;
        else reqCapacity = 64;

        const totalRounds = Math.max(1, Math.round(Math.log2(reqCapacity)));

        const getDynamicStageName = (cap: number, roundNum: number, idx: number) => {
          const isSingle = scheme === "SINGLE_NO_POOL";
          const matchesInRound = cap / Math.pow(2, roundNum);

          if (roundNum === totalRounds) {
            return isSingle ? "FINAL" : "GRAND FINAL";
          }
          if (roundNum === totalRounds - 1) {
            if (idx < matchesInRound / 2) {
              return isSingle ? "SEMIFINAL 1" : "FINAL POL A";
            } else {
              return isSingle ? "SEMIFINAL 2" : "FINAL POL B";
            }
          }
          if (roundNum === totalRounds - 2) {
            if (idx < matchesInRound / 2) {
              return isSingle ? `PEREMPAT FINAL L${idx + 1}` : `SEMIFINAL A${idx + 1}`;
            } else {
              const rightIdx = idx - (matchesInRound / 2);
              return isSingle ? `PEREMPAT FINAL R${rightIdx + 1}` : `SEMIFINAL B${rightIdx + 1}`;
            }
          }
          // Pre-quarterfinal
          if (idx < matchesInRound / 2) {
            return isSingle ? `PENYISIHAN L${idx + 1}` : `PEREMPAT FINAL A${idx + 1}`;
          } else {
            const rightIdx = idx - (matchesInRound / 2);
            return isSingle ? `PENYISIHAN R${rightIdx + 1}` : `PEREMPAT FINAL B${rightIdx + 1}`;
          }
        };

        const initialSlots: any[] = [];
        const numMatchesRound1 = reqCapacity / 2;

        if (filteredPart.length === 0 && sortedUserMatches.length > 0) {
          for (let idx = 0; idx < numMatchesRound1; idx++) {
            const userMatch = sortedUserMatches[idx];
            if (userMatch) {
              initialSlots.push(userMatch.fighterRedId ? { type: "athlete", id: userMatch.fighterRedId } : null);
              initialSlots.push(
                userMatch.fighterBlueId && userMatch.fighterBlueId !== "BYE" && !userMatch.fighterBlueId.includes("-bye")
                  ? { type: "athlete", id: userMatch.fighterBlueId }
                  : null
              );
            } else {
              initialSlots.push(null);
              initialSlots.push(null);
            }
          }
        } else {
          let numContestedMatches = N - (reqCapacity / 2);
          if (numContestedMatches < 0) numContestedMatches = 0;

          let athleteIdx = 0;
          for (let idx = 0; idx < numMatchesRound1; idx++) {
            if (idx < numContestedMatches) {
              const athRed = filteredPart[athleteIdx++];
              const athBlue = filteredPart[athleteIdx++];
              initialSlots.push(athRed ? { type: "athlete", id: athRed.id, name: athRed.name, club: athRed.club } : null);
              initialSlots.push(athBlue ? { type: "athlete", id: athBlue.id, name: athBlue.name, club: athBlue.club } : null);
            } else {
              if (athleteIdx < filteredPart.length) {
                const athRed = filteredPart[athleteIdx++];
                initialSlots.push({ type: "athlete", id: athRed.id, name: athRed.name, club: athRed.club });
                initialSlots.push(null);
              } else {
                initialSlots.push(null);
                initialSlots.push(null);
              }
            }
          }
        }

        let currentSlots = [...initialSlots];

        for (let round = 1; round <= totalRounds; round++) {
          const matchesInRound = reqCapacity / Math.pow(2, round);
          const nextRoundSlots: any[] = [];

          for (let idx = 0; idx < matchesInRound; idx++) {
            const left = currentSlots[idx * 2];
            const right = currentSlots[idx * 2 + 1];

            if (left && right) {
              const fRedId = left.type === "athlete" ? left.id : `winner-${left.matchId}`;
              const fBlueId = right.type === "athlete" ? right.id : `winner-${right.matchId}`;

              // Resolve names and clubs for caching directly on match object
              let cachedRedName = "";
              let cachedRedClub = "";
              let cachedBlueName = "";
              let cachedBlueClub = "";

              if (fRedId.startsWith("winner-")) {
                const prevMatch = allGeneratedMatches.find(x => x.id === left.matchId);
                cachedRedName = prevMatch?.matchNumber ? `PEMENANG ${prevMatch.matchNumber.toUpperCase()}` : "PEMENANG";
              } else if (fRedId) {
                const p = parts.find(part => part.id === fRedId);
                if (p) {
                  cachedRedName = p.name;
                  cachedRedClub = p.club;
                }
              }

              if (fBlueId.startsWith("winner-")) {
                const prevMatch = allGeneratedMatches.find(x => x.id === right.matchId);
                cachedBlueName = prevMatch?.matchNumber ? `PEMENANG ${prevMatch.matchNumber.toUpperCase()}` : "PEMENANG";
              } else if (fBlueId) {
                const p = parts.find(part => part.id === fBlueId);
                if (p) {
                  cachedBlueName = p.name;
                  cachedBlueClub = p.club;
                }
              }

              const baseStage = getDynamicStageName(reqCapacity, round, idx);
              let finalStage = baseStage;
              if (left && left.type === "winner" && right && right.type === "athlete") {
                const prevMatch = allGeneratedMatches.find(x => x.id === left.matchId);
                if (prevMatch && prevMatch.matchNumber) {
                  finalStage = `${baseStage} (MENUNGGU PEMENANG ${prevMatch.matchNumber.toUpperCase()})`;
                }
              } else if (right && right.type === "winner" && left && left.type === "athlete") {
                const prevMatch = allGeneratedMatches.find(x => x.id === right.matchId);
                if (prevMatch && prevMatch.matchNumber) {
                  finalStage = `${baseStage} (MENUNGGU PEMENANG ${prevMatch.matchNumber.toUpperCase()})`;
                }
              }

              const mId = `m-${cat.id}-${g}-r${round}-${idx}`;
              const matchNumberVal = `Partai ${matchGlobalCounter}`;
              matchGlobalCounter++;

              const mObj = {
                id: mId,
                matchNumber: matchNumberVal,
                stage: finalStage,
                categoryClassId: cat.id,
                fighterRedId: fRedId,
                fighterBlueId: fBlueId,
                fighterRedName: cachedRedName,
                fighterRedClub: cachedRedClub,
                fighterBlueName: cachedBlueName,
                fighterBlueClub: cachedBlueClub,
                arena: arenaVal,
                gender: g,
                status: "BELUM",
                winner: null,
                roundDuration: 120,
                totalRounds: 3
              };

              allGeneratedMatches.push(mObj);
              nextRoundSlots.push({ type: "winner", matchId: mId });
            } else if (left && !right) {
              // Left athlete has BYE: advances directly to the next round without creating dummy BYE match
              nextRoundSlots.push(left);
            } else if (!left && right) {
              // Right athlete has BYE: advances directly to the next round without creating dummy BYE match
              nextRoundSlots.push(right);
            } else {
              nextRoundSlots.push(null);
            }
          }

          currentSlots = nextRoundSlots;
        }
      });
    });

    return allGeneratedMatches;
  };

  const handleSyncAllBrackets = async (latestSchedules?: any[], latestParticipants?: any[]) => {
    sound.playClick();
    
    const activeSchedules = latestSchedules || schedules;
    const activeParts = latestParticipants || participants;

    // 1. Sync & update participants list with any names/clubs manually input in schedules
    const syncedParts = extractParticipantsFromSchedules(activeSchedules, activeParts);
    setParticipants(syncedParts);

    // 2. Generate new matches with respected schedule pairings
    const newMatches = generateAllBracketsData(categories, syncedParts, baganSchemeType, activeSchedules);
    
    try {
      const res = await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: categories,
          newParticipants: syncedParts,
          newMatches: newMatches
        })
      });

      if (res.ok) {
        notifyToast(`🎉 Sukses melakukan sinkronisasi otomatis! ${newMatches.length} partai pertandingan berhasil diperbarui.`);
        fetchSchedules();
      } else {
        alert("Gagal melakukan sinkronisasi data.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan ketika menghubungi server.");
    }
  };

  // 2. Upload massive Excel entries to generate athlete data & categories
  const handleUploadBaganExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sound.playClick();
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstream = evt?.target?.result;
        if (!bstream) return;
        const workbook = XLSX.read(bstream, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

        if (rawRows.length < 2) {
          alert("Spreadsheet kosong atau format tidak sesuai!");
          return;
        }

        let headers = rawRows[0];
        let startIndex = 1;

        let idxNama = -1;
        let idxKontingen = -1;
        let idxGender = -1;
        let idxKelas = -1;
        let idxBerat = -1;

        headers.forEach((h: any, i: number) => {
          if (!h) return;
          const label = h.toString().toLowerCase();
          if (label.includes("nama") || label.includes("atlit") || label.includes("atlet") || label.includes("peserta")) idxNama = i;
          else if (label.includes("kontingen") || label.includes("club") || label.includes("asal") || label.includes("daerah") || label.includes("kota")) idxKontingen = i;
          else if (label.includes("gender") || label.includes("jenis kelamin") || label.includes("sex") || label.includes("kelamin")) idxGender = i;
          else if (label.includes("kelas") || label.includes("class") || label.includes("kategori")) idxKelas = i;
          else if (label.includes("berat") || label.includes("weight")) idxBerat = i;
        });

        if (idxNama === -1) idxNama = 1;
        if (idxKontingen === -1) idxKontingen = 2;
        if (idxGender === -1) idxGender = 3;
        if (idxKelas === -1) idxKelas = 4;
        if (idxBerat === -1) idxBerat = 5;

        const newCategories: any[] = [];
        const newParticipants: any[] = [];

        for (let i = startIndex; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0 || !row[idxNama]) continue;

          const rawNama = row[idxNama]?.toString() || "";
          const rawKontingen = row[idxKontingen]?.toString() || "KONTINGEN";
          const rawGender = row[idxGender]?.toString() || "PUTRA";
          const rawKelas = row[idxKelas]?.toString() || "Kelas C";
          const rawWeight = Number(row[idxBerat]) || 55;

          const cleanGender = (rawGender.toUpperCase().includes("PUTRI") || rawGender.toUpperCase().includes("PI") || rawKelas.toUpperCase().includes(" PI") || rawKelas.toUpperCase().includes("PUTRI")) ? "PUTRI" : "PUTRA";
          const catId = `cat-${rawKelas.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

          if (!newCategories.find(c => c.id === catId)) {
            newCategories.push({
              id: catId,
              name: rawKelas,
              minWeight: rawWeight - 2 || 45,
              maxWeight: rawWeight + 2 || 100,
              division: "Dewasa"
            });
          }

          const athleteId = `p-excel-${i}-${Date.now().toString().slice(-4)}`;
          newParticipants.push({
            id: athleteId,
            name: rawNama.toUpperCase(),
            club: rawKontingen.toUpperCase(),
            gender: cleanGender,
            categoryClassId: catId,
            weight: rawWeight
          });
        }

        if (newParticipants.length === 0) {
          alert("Gagal membaca data atlit dari file spreadsheet. Pastikan penamaan kolom sesuai!");
          return;
        }

        const finalCats = newCategories.length > 0 ? newCategories : categories;
        const finalMatches = generateAllBracketsData(finalCats, newParticipants, baganSchemeType);

        // Upload to database
        const res = await fetch("/api/tournament/import-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newCategories: finalCats,
            newParticipants: newParticipants,
            newMatches: finalMatches
          })
        });

        if (res.ok) {
          notifyToast(`🎉 Sukses mengimpor ${newParticipants.length} data atlit baru ke server!`);
          fetchSchedules();
          if (newCategories.length > 0) {
            setSelectedBaganCategory(newCategories[0].id);
          }
        } else {
          alert("Gagal melakukan impor data atlit.");
        }
      } catch (err) {
        console.error(err);
        alert("Gagal memproses file Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Syncs current local states of categories, participants, and generated schedules/matches to the database
  const handleSyncDatabase = async () => {
    sound.playClick();
    
    // Auto generate matches with updated category/participants data
    const autoMatches = generateAllBracketsData(categories, participants, baganSchemeType);

    try {
      const res = await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: categories,
          newParticipants: participants,
          newMatches: autoMatches
        })
      });
      if (res.ok) {
        notifyToast("♻️ DATABASE SINKRON! Atlet dan bagan berhasil disinkronkan ke seluruh panel aplikasi secara otomatis.");
        fetchSchedules();
      } else {
        alert("Gagal melakukan sinkronisasi data ke server.");
      }
    } catch (err) {
      console.error(err);
      alert("Hubungan database terputus sewaktu melakukan sinkronisasi.");
    }
  };

  // Open safe custom state delete confirmation dialog inside iframe
  const handleDeleteAllAthletes = async () => {
    sound.playClick();
    if (!confirm("⚠️ PERINGATAN KERAS: Tindakan ini akan MENGHAPUS BERSIH seluruh data semua atlet dan semua jadwal tanding dalam sistem secara permanen!\n\nApakah Anda yakin ingin melanjutkan?")) {
      return;
    }
    sound.playBuzzer();
    try {
      const res = await fetch("/api/tournament/reset", {
        method: "POST"
      });
      if (res.ok) {
        setParticipants([]);
        setSchedules([]);
        setCategories([]);
        notifyToast("🗑️ Berhasil menghapus bersih semua data atlet & partai pertandingan!");
        fetchSchedules();
      } else {
        alert("Gagal menghapus data atlet.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menghubungi server database localhost.");
    }
  };

  // Handles saving a manually inputted athlete record with automatic tournament-sync is triggered
  const handleAddManualAthlete = async () => {
    if (!manualName.trim() || !manualClub.trim()) {
      alert("Kolom Nama Atlet dan Kontingen wajib diisi lengkap!");
      return;
    }
    sound.playClick();
    
    const DEFAULT_SILAT_CLASSES = [
      { name: "Kelas A", minWeight: 45, maxWeight: 50 },
      { name: "Kelas B", minWeight: 50, maxWeight: 55 },
      { name: "Kelas C", minWeight: 55, maxWeight: 60 },
      { name: "Kelas D", minWeight: 60, maxWeight: 65 },
      { name: "Kelas E", minWeight: 65, maxWeight: 70 },
      { name: "Kelas F", minWeight: 70, maxWeight: 75 },
      { name: "Kelas G", minWeight: 75, maxWeight: 80 },
      { name: "Kelas H", minWeight: 80, maxWeight: 85 },
      { name: "Kelas I", minWeight: 85, maxWeight: 90 },
      { name: "Kelas J", minWeight: 90, maxWeight: 100 },
      { name: "Kelas Bebas", minWeight: 100, maxWeight: 155 }
    ];

    let classId = manualCategoryClassId;
    if (!classId || classId === "") {
      if (categories.length > 0) {
        classId = categories[0].id;
      } else {
        classId = "cat-kelas-c";
      }
    }

    let activeCat = categories.find(c => c.id === classId);
    let updatedCategories = [...categories];

    if (!activeCat) {
      const matchedDefault = DEFAULT_SILAT_CLASSES.find(
        c => `cat-${c.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}` === classId
      );
      const isSeni = manualKategori !== "TANDING";
      const catName = matchedDefault ? matchedDefault.name : classId.replace("cat-", "").replace("-", " ").toUpperCase();
      const divisionName = manualDivision || "DEWASA";

      const newCategoryObj = {
        id: classId,
        name: isSeni ? `${manualKategori} - ${catName}` : catName,
        minWeight: matchedDefault ? matchedDefault.minWeight : 45,
        maxWeight: matchedDefault ? matchedDefault.maxWeight : 100,
        division: divisionName
      };

      activeCat = newCategoryObj;
      updatedCategories.push(newCategoryObj);
      setCategories(updatedCategories);
    } else {
      activeCat.division = manualDivision;
    }

    const newAthlete = {
      id: "p-manual-" + Date.now(),
      name: manualName.trim().toUpperCase(),
      club: manualClub.trim().toUpperCase(),
      gender: manualGender,
      categoryClassId: classId,
      weight: Number(manualWeight) || 55,
      arena: manualArena || "GELANGGANG A"
    };

    const updatedParticipants = [...participants, newAthlete];
    setParticipants(updatedParticipants);

    // Auto generate matches with updated category/participants data
    const autoMatches = generateAllBracketsData(updatedCategories, updatedParticipants, baganSchemeType);

    try {
      const res = await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: updatedCategories,
          newParticipants: updatedParticipants,
          newMatches: autoMatches
        })
      });
      if (res.ok) {
        notifyToast(`👤 Berhasil menambahkan atlet manual: ${newAthlete.name}`);
        setManualName("");
        setManualClub("");
        fetchSchedules();
      } else {
        alert("Gagal menyimpan data atlet ke server.");
      }
    } catch (err) {
      console.error(err);
      alert("Hubungan database terputus.");
    }
  };

  // Handles deleting a single athlete by ID
  const handleDeleteAthleteItem = async (athleteId: string) => {
    if (!confirm("Hapus atlit ini dari database?")) return;
    sound.playClick();
    
    const updated = participants.filter(p => p.id !== athleteId);
    setParticipants(updated);
    
    try {
      const res = await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newParticipants: updated
        })
      });
      if (res.ok) {
        notifyToast("Garansi data atlit dihapus dari sistem!");
        fetchSchedules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getBaganStageName = (step: "SF_A1" | "SF_A2" | "SF_B1" | "SF_B2" | "F_A" | "F_B" | "GF", typeVal?: "POOL_AB" | "SINGLE_NO_POOL") => {
    const sType = typeVal || baganSchemeType;
    if (sType === "SINGLE_NO_POOL") {
      switch(step) {
        case "SF_A1": return "PEREMPAT FINAL L1";
        case "SF_A2": return "PEREMPAT FINAL L2";
        case "SF_B1": return "PEREMPAT FINAL R1";
        case "SF_B2": return "PEREMPAT FINAL R2";
        case "F_A": return "SEMIFINAL 1";
        case "F_B": return "SEMIFINAL 2";
        case "GF": return "FINAL";
      }
    } else {
      switch(step) {
        case "SF_A1": return "SEMIFINAL A1";
        case "SF_A2": return "SEMIFINAL A2";
        case "SF_B1": return "SEMIFINAL B1";
        case "SF_B2": return "SEMIFINAL B2";
        case "F_A": return "FINAL POL A";
        case "F_B": return "FINAL POL B";
        case "GF": return "GRAND FINAL";
      }
    }
  };

  const handleResetBaganToDefault = async () => {
    sound.playClick();
    if (!confirm("Apakah Anda yakin ingin me-reset seluruh bagan dan data atlet ke pengaturan default contoh?")) return;

    const defaultCategories = [
      { id: "cat-1", name: "Kelas A Putra (45 - 50 kg)", minWeight: 45, maxWeight: 50, division: "Remaja" },
      { id: "cat-2", name: "Kelas B Putra (50 - 55 kg)", minWeight: 50, maxWeight: 55, division: "Remaja" },
      { id: "cat-3", name: "D", minWeight: 55, maxWeight: 60, division: "Remaja" }
    ];

    const defaultParticipants = [
      // Kelas B Putra (50 - 55 kg)
      { id: "p-b1", name: "BUDI SANTOSO", club: "Jawa Timur", gender: "PUTRA", categoryClassId: "cat-2", weight: 52.1 },
      { id: "p-b2", name: "MADE WIRAWAN", club: "Bali", gender: "PUTRA", categoryClassId: "cat-2", weight: 53.4 },
      { id: "p-b3", name: "HENDRA WIJAYA", club: "Jawa Tengah", gender: "PUTRA", categoryClassId: "cat-2", weight: 51.9 },
      { id: "p-b4", name: "ZULFIKAR", club: "Di Yogyakarta", gender: "PUTRA", categoryClassId: "cat-2", weight: 54.2 },
      { id: "p-b5", name: "AHMAD FAUZI", club: "Sumatra Utara", gender: "PUTRA", categoryClassId: "cat-2", weight: 50.8 },
      { id: "p-b6", name: "EKO PRASETYO", club: "Lampung", gender: "PUTRA", categoryClassId: "cat-2", weight: 53.1 },
      { id: "p-b7", name: "RIZAL GIBRAN", club: "Kaltim", gender: "PUTRA", categoryClassId: "cat-2", weight: 52.7 },
      { id: "p-b8", name: "DIMAS ANGGARA", club: "DKI Jakarta", gender: "PUTRA", categoryClassId: "cat-2", weight: 54.8 },

      // Kelas A Putra (45 - 50 kg)
      { id: "p-a1", name: "ALDIANSYAH", club: "Jawa Barat", gender: "PUTRA", categoryClassId: "cat-1", weight: 47.5 },
      { id: "p-a2", name: "RENDY PRAMANA", club: "Sumatra Barat", gender: "PUTRA", categoryClassId: "cat-1", weight: 46.2 },
      { id: "p-a3", name: "IKHSAN KAMIL", club: "Banten", gender: "PUTRA", categoryClassId: "cat-1", weight: 48.9 },
      { id: "p-a4", name: "FAJAR SUBAGJA", club: "Jawa Timur", gender: "PUTRA", categoryClassId: "cat-1", weight: 49.1 },

      // Kelas D
      { id: "p-d1", name: "GALIH SAPUTRA", club: "NTB", gender: "PUTRA", categoryClassId: "cat-3", weight: 58.2 },
      { id: "p-d2", name: "RAFLI HIDAYAT", club: "Riau", gender: "PUTRA", categoryClassId: "cat-3", weight: 57.5 },
      { id: "p-d3", name: "REZA HARAHAP", club: "Sumatra Utara", gender: "PUTRA", categoryClassId: "cat-3", weight: 59.1 },
      { id: "p-d4", name: "YUDHA PRATAMA", club: "Bali", gender: "PUTRA", categoryClassId: "cat-3", weight: 56.8 }
    ];

    const defaultMatches: any[] = [];
    
    // For Kelas B
    defaultMatches.push({
      id: `m-pa-sf1-cat-2-PUTRA`,
      categoryClassId: "cat-2",
      gender: "PUTRA",
      stage: "PEREMPAT FINAL L1",
      matchNumber: "84",
      status: "TERDAFTAR",
      fighterRedId: "p-b1",
      fighterBlueId: "p-b2",
      roundDuration: 120,
      totalRounds: 3
    });

    defaultMatches.push({
      id: `m-pa-sf2-cat-2-PUTRA`,
      categoryClassId: "cat-2",
      gender: "PUTRA",
      stage: "PEREMPAT FINAL L2",
      matchNumber: "84",
      status: "TERDAFTAR",
      fighterRedId: "p-b3",
      fighterBlueId: "p-b4",
      roundDuration: 120,
      totalRounds: 3
    });

    defaultMatches.push({
      id: `m-pb-sf1-cat-2-PUTRA`,
      categoryClassId: "cat-2",
      gender: "PUTRA",
      stage: "PEREMPAT FINAL R1",
      matchNumber: "86",
      status: "TERDAFTAR",
      fighterRedId: "p-b5",
      fighterBlueId: "p-b6",
      roundDuration: 120,
      totalRounds: 3
    });

    defaultMatches.push({
      id: `m-pb-sf2-cat-2-PUTRA`,
      categoryClassId: "cat-2",
      gender: "PUTRA",
      stage: "PEREMPAT FINAL R2",
      matchNumber: "87",
      status: "TERDAFTAR",
      fighterRedId: "p-b7",
      fighterBlueId: "p-b8",
      roundDuration: 120,
      totalRounds: 3
    });

    defaultMatches.push({
      id: `m-pa-f-cat-2-PUTRA`,
      categoryClassId: "cat-2",
      gender: "PUTRA",
      stage: "SEMIFINAL 1",
      matchNumber: "88",
      status: "TERDAFTAR",
      fighterRedId: "winner-pa-sf1",
      fighterBlueId: "winner-pa-sf2",
      roundDuration: 120,
      totalRounds: 3
    });

    defaultMatches.push({
      id: `m-pb-f-cat-2-PUTRA`,
      categoryClassId: "cat-2",
      gender: "PUTRA",
      stage: "SEMIFINAL 2",
      matchNumber: "89",
      status: "TERDAFTAR",
      fighterRedId: "winner-pb-sf1",
      fighterBlueId: "winner-pb-sf2",
      roundDuration: 120,
      totalRounds: 3
    });

    defaultMatches.push({
      id: `m-grand-f-cat-2-PUTRA`,
      categoryClassId: "cat-2",
      gender: "PUTRA",
      stage: "FINAL",
      matchNumber: "10",
      status: "TERDAFTAR",
      fighterRedId: "winner-pa-f",
      fighterBlueId: "winner-pb-f",
      roundDuration: 120,
      totalRounds: 3
    });

    // For Kelas A
    defaultMatches.push({
      id: `m-pa-f-cat-1-PUTRA`,
      categoryClassId: "cat-1",
      gender: "PUTRA",
      stage: "SEMIFINAL 1",
      matchNumber: "01",
      status: "TERDAFTAR",
      fighterRedId: "p-a1",
      fighterBlueId: "p-a2",
      roundDuration: 120,
      totalRounds: 3
    });

    defaultMatches.push({
      id: `m-pb-f-cat-1-PUTRA`,
      categoryClassId: "cat-1",
      gender: "PUTRA",
      stage: "SEMIFINAL 2",
      matchNumber: "02",
      status: "TERDAFTAR",
      fighterRedId: "p-a3",
      fighterBlueId: "p-a4",
      roundDuration: 120,
      totalRounds: 3
    });

    defaultMatches.push({
      id: `m-grand-f-cat-1-PUTRA`,
      categoryClassId: "cat-1",
      gender: "PUTRA",
      stage: "FINAL",
      matchNumber: "03",
      status: "TERDAFTAR",
      fighterRedId: "winner-pa-f",
      fighterBlueId: "winner-pb-f",
      roundDuration: 120,
      totalRounds: 3
    });

    // For Kelas D
    defaultMatches.push({
      id: `m-pa-f-cat-3-PUTRA`,
      categoryClassId: "cat-3",
      gender: "PUTRA",
      stage: "SEMIFINAL 1",
      matchNumber: "04",
      status: "TERDAFTAR",
      fighterRedId: "p-d1",
      fighterBlueId: "p-d2",
      roundDuration: 120,
      totalRounds: 3
    });

    defaultMatches.push({
      id: `m-pb-f-cat-3-PUTRA`,
      categoryClassId: "cat-3",
      gender: "PUTRA",
      stage: "SEMIFINAL 2",
      matchNumber: "05",
      status: "TERDAFTAR",
      fighterRedId: "p-d3",
      fighterBlueId: "p-d4",
      roundDuration: 120,
      totalRounds: 3
    });

    defaultMatches.push({
      id: `m-grand-f-cat-3-PUTRA`,
      categoryClassId: "cat-3",
      gender: "PUTRA",
      stage: "FINAL",
      matchNumber: "06",
      status: "TERDAFTAR",
      fighterRedId: "winner-pa-f",
      fighterBlueId: "winner-pb-f",
      roundDuration: 120,
      totalRounds: 3
    });

    try {
      const res = await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: defaultCategories,
          newParticipants: defaultParticipants,
          newMatches: defaultMatches
        })
      });

      if (res.ok) {
        setSelectedBaganCategory("cat-2");
        setSelectedBaganGender("PUTRA");
        setBaganSchemeType("SINGLE_NO_POOL");
        notifyToast("♻️ DEFAULT BAGAN TERPASANG AKURAT! Kelas B Putra (50-55 kg) siap dimainkan.");
        fetchSchedules();
      } else {
        alert("Gagal menyimpan data default.");
      }
    } catch (err) {
      console.error(err);
      alert("Error sewaktu menyimpan data default.");
    }
  };

  // 3. Automated POPDA double-pool brackets generator for selected class (POL A & POL B / SINGLE ELIMINATION)
  const lastGeneratedKey = useRef<string>("");

  const handleAutoGenerateBagan = async (
    customCapacity?: number, 
    targetCatId?: string, 
    targetGender?: string,
    providedParticipants?: any[]
  ) => {
    sound.playClick();
    const effectiveCatId = targetCatId || selectedBaganCategory;
    const effectiveGender = targetGender || selectedBaganGender;

    if (targetCatId) setSelectedBaganCategory(targetCatId);
    if (targetGender) setSelectedBaganGender(targetGender as any);

    let cat = categories.find(c => c.id === effectiveCatId);
    let catName = cat ? cat.name : "Kelas Tanding";

    // Helper to identify dummy/palsu athletes
    const sourceParticipants = providedParticipants && providedParticipants.length > 0 ? providedParticipants : participants;

    const unfilteredPart = sourceParticipants.filter(
      p => p.categoryClassId === effectiveCatId && p.gender === effectiveGender && p.name && p.name.trim() !== ""
    );

    // Filter out dummy/palsu athletes if there is at least one real athlete registered in this class + gender
    const realParts = unfilteredPart.filter(p => !isDummyAthleteObj(p));
    const filteredPart = realParts.length > 0 ? realParts : unfilteredPart;

    // Find user matches for this category and gender to align brackets with actual schedule input
    const userMatches = schedules.filter(m => 
      m.categoryClassId === effectiveCatId && 
      m.gender === effectiveGender &&
      m.fighterRedId && 
      m.fighterBlueId &&
      m.fighterRedId !== "KOSONG" &&
      m.fighterBlueId !== "KOSONG" &&
      !m.fighterRedId.startsWith("placeholder-") &&
      !m.fighterBlueId.startsWith("placeholder-") &&
      !m.fighterRedId.startsWith("winner-") &&
      !m.fighterBlueId.startsWith("winner-")
    );
    
    const sortedUserMatches = [...userMatches].sort((a, b) => {
      const numA = parseInt(a.matchNumber?.toString().replace(/\D/g, "") || "999");
      const numB = parseInt(b.matchNumber?.toString().replace(/\D/g, "") || "999");
      return numA - numB;
    });

    if (filteredPart.length === 0 && sortedUserMatches.length === 0) {
      if (!customCapacity) {
        alert(`Mohon maaf, belum ada atlit terdaftar pada ${catName} (${effectiveGender}). Silakan gunakan fitur upload Excel untuk mengisi data atlit terlebih dahulu.`);
      }
      return;
    }

    // Cek apakah kategori usia ini menggunakan MODE ON (Pemasalan) atau MODE OFF (Sistem Pool Round-Robin PERSILAT)
    const isPem = isDivisionPemasalan(cat?.division);
    if (!customCapacity && filteredPart.length > 0) {
      const unrelatedMatches = schedules.filter(
        m => !(m.categoryClassId === effectiveCatId && m.gender === effectiveGender)
      );
      const basePartaiNum = unrelatedMatches.length + 1;

      let generatedMatchesList: any[] = [];
      if (isPem) {
        // MODE ON: Sistem membuatkan bagan mode PEMASALAN (Maksimal 4 atlet per pool)
        generatedMatchesList = generateMatchesForClass({
          athletes: filteredPart,
          categoryClassId: effectiveCatId,
          categoryName: catName,
          division: cat?.division || "DEWASA",
          gender: effectiveGender,
          arena: scheduleGelanggang || "GELANGGANG A",
          startPartaiNumber: basePartaiNum
        });
      } else {
        // MODE OFF: Sistem membuatkan bagan sistem pool (round-robin) sesuai aturan PERSILAT
        generatedMatchesList = generateRoundRobinMatchesForClass({
          athletes: filteredPart,
          categoryClassId: effectiveCatId,
          categoryName: catName,
          division: cat?.division || "DEWASA",
          gender: effectiveGender,
          arena: scheduleGelanggang || "GELANGGANG A",
          startPartaiNumber: basePartaiNum
        });
      }

      if (generatedMatchesList.length > 0) {
        const mergedMatches = [...unrelatedMatches, ...generatedMatchesList];
        setSchedules(mergedMatches);
        try {
          localStorage.setItem("jrz_cached_schedules", JSON.stringify(mergedMatches));
        } catch {}
        return;
      }
    }

    // Determine the bracket capacity based on parameter or actual athlete list length (2, 4, 8, 16, 32, 64)
    let reqCapacity = 2;
    const len = filteredPart.length > 0 ? filteredPart.length : (sortedUserMatches.length > 0 ? sortedUserMatches.length * 2 : 2);
    if (customCapacity) {
      reqCapacity = customCapacity;
    } else {
      if (len <= 2) reqCapacity = 2;
      else if (len <= 4) reqCapacity = 4;
      else if (len <= 8) reqCapacity = 8;
      else if (len <= 16) reqCapacity = 16;
      else if (len <= 32) reqCapacity = 32;
      else reqCapacity = 64;
    }

    const totalRounds = Math.max(1, Math.round(Math.log2(reqCapacity)));
    const generatedMatches: any[] = [];
    const catId = effectiveCatId;
    const g = effectiveGender;

    // Filter out matches of other categories/genders
    const unrelatedMatches = schedules.filter(
      m => !(m.categoryClassId === effectiveCatId && m.gender === effectiveGender)
    );

    // basePartaiNum is offset from unrelated matches to prevent duplicate match labels
    const basePartaiNum = unrelatedMatches.length;
    let matchCounter = 1;

    // Helper to get stage name dynamically depending on round and pool scheme
    const getDynamicStageName = (cap: number, roundNum: number, idx: number) => {
      const sType = baganSchemeType;
      const matchesInRound = cap / Math.pow(2, roundNum);
      const isSingle = sType === "SINGLE_NO_POOL";

      if (roundNum === totalRounds) { // Final / Grand Final
        return isSingle ? "FINAL" : "GRAND FINAL";
      }
      
      if (roundNum === totalRounds - 1) { // Semifinal
        if (idx < matchesInRound / 2) {
          return isSingle ? "SEMIFINAL 1" : "FINAL POL A";
        } else {
          return isSingle ? "SEMIFINAL 2" : "FINAL POL B";
        }
      }
      
      if (roundNum === totalRounds - 2) { // Quarterfinal / Round of 8
        if (idx < matchesInRound / 2) {
          return isSingle ? `PEREMPAT FINAL L${idx + 1}` : `SEMIFINAL A${idx + 1}`;
        } else {
          const rightIdx = idx - (matchesInRound / 2);
          return isSingle ? `PEREMPAT FINAL R${rightIdx + 1}` : `SEMIFINAL B${rightIdx + 1}`;
        }
      }

      // Pre-Quarterfinal rounds
      if (idx < matchesInRound / 2) {
        return isSingle ? `PENYISIHAN L${idx + 1}` : `PEREMPAT FINAL A${idx + 1}`;
      } else {
        const rightIdx = idx - (matchesInRound / 2);
        return isSingle ? `PENYISIHAN R${rightIdx + 1}` : `PEREMPAT FINAL B${rightIdx + 1}`;
      }
    };

    const initialSlots: any[] = [];
    const numMatchesRound1 = reqCapacity / 2;

    if (filteredPart.length === 0 && sortedUserMatches.length > 0) {
      for (let idx = 0; idx < numMatchesRound1; idx++) {
        const userMatch = sortedUserMatches[idx];
        if (userMatch) {
          initialSlots.push(userMatch.fighterRedId ? { type: "athlete", id: userMatch.fighterRedId } : null);
          initialSlots.push(
            userMatch.fighterBlueId && userMatch.fighterBlueId !== "BYE" && !userMatch.fighterBlueId.includes("-bye")
              ? { type: "athlete", id: userMatch.fighterBlueId }
              : null
          );
        } else {
          initialSlots.push(null);
          initialSlots.push(null);
        }
      }
    } else {
      const isDual = (baganSchemeType === "POOL_AB" || baganSchemeType === "DOUBLE_POOL") && reqCapacity > 2;
      if (isDual) {
        const halfCount = Math.ceil(filteredPart.length / 2);
        const poolAAthletes = filteredPart.slice(0, halfCount);
        const poolBAthletes = filteredPart.slice(halfCount);

        const poolMatchesRound1 = numMatchesRound1 / 2;
        const poolCapacity = reqCapacity / 2;

        const fillPoolSlots = (pAthletes: any[]) => {
          const slots: any[] = [];
          const pN = pAthletes.length;
          let numContested = pN - (poolCapacity / 2);
          if (numContested < 0) numContested = 0;

          let aIdx = 0;
          for (let m = 0; m < poolMatchesRound1; m++) {
            if (m < numContested) {
              const athRed = pAthletes[aIdx++];
              const athBlue = pAthletes[aIdx++];
              slots.push(athRed ? { type: "athlete", id: athRed.id } : null);
              slots.push(athBlue ? { type: "athlete", id: athBlue.id } : null);
            } else {
              if (aIdx < pAthletes.length) {
                const athRed = pAthletes[aIdx++];
                slots.push({ type: "athlete", id: athRed.id });
                slots.push(null);
              } else {
                slots.push(null);
                slots.push(null);
              }
            }
          }
          return slots;
        };

        const slotsA = fillPoolSlots(poolAAthletes);
        const slotsB = fillPoolSlots(poolBAthletes);
        initialSlots.push(...slotsA, ...slotsB);
      } else {
        const N = filteredPart.length;
        const C = reqCapacity;
        let numContestedMatches = N - (C / 2);
        if (numContestedMatches < 0) numContestedMatches = 0;

        let athleteIdx = 0;
        for (let idx = 0; idx < numMatchesRound1; idx++) {
          if (idx < numContestedMatches) {
            const athRed = filteredPart[athleteIdx++];
            const athBlue = filteredPart[athleteIdx++];
            initialSlots.push(athRed ? { type: "athlete", id: athRed.id } : null);
            initialSlots.push(athBlue ? { type: "athlete", id: athBlue.id } : null);
          } else {
            if (athleteIdx < filteredPart.length) {
              const athRed = filteredPart[athleteIdx++];
              initialSlots.push({ type: "athlete", id: athRed.id });
              initialSlots.push(null);
            } else {
              initialSlots.push(null);
              initialSlots.push(null);
            }
          }
        }
      }
    }

    let currentSlots = [...initialSlots];

    for (let round = 1; round <= totalRounds; round++) {
      const matchesInRound = reqCapacity / Math.pow(2, round);
      const nextRoundSlots: any[] = [];

      for (let idx = 0; idx < matchesInRound; idx++) {
        const left = currentSlots[idx * 2];
        const right = currentSlots[idx * 2 + 1];

        if (left && right) {
          const fRedId = left.type === "athlete" ? left.id : `winner-${left.matchId}`;
          const fBlueId = right.type === "athlete" ? right.id : `winner-${right.matchId}`;

          // Resolve names and clubs for caching directly on match object
          let cachedRedName = "";
          let cachedRedClub = "";
          let cachedBlueName = "";
          let cachedBlueClub = "";

          if (fRedId.startsWith("winner-")) {
            const prevMatch = generatedMatches.find(x => x.id === left.matchId);
            cachedRedName = prevMatch?.matchNumber ? `PEMENANG ${prevMatch.matchNumber.toUpperCase()}` : "PEMENANG";
          } else if (fRedId) {
            const p = sourceParticipants.find(part => part.id === fRedId);
            if (p) {
              cachedRedName = p.name;
              cachedRedClub = p.club;
            }
          }

          if (fBlueId.startsWith("winner-")) {
            const prevMatch = generatedMatches.find(x => x.id === right.matchId);
            cachedBlueName = prevMatch?.matchNumber ? `PEMENANG ${prevMatch.matchNumber.toUpperCase()}` : "PEMENANG";
          } else if (fBlueId) {
            const p = sourceParticipants.find(part => part.id === fBlueId);
            if (p) {
              cachedBlueName = p.name;
              cachedBlueClub = p.club;
            }
          }

          const baseStage = getDynamicStageName(reqCapacity, round, idx);
          let finalStage = baseStage;
          if (left && left.type === "winner" && right && right.type === "athlete") {
            const prevMatch = generatedMatches.find(x => x.id === left.matchId);
            if (prevMatch && prevMatch.matchNumber) {
              finalStage = `${baseStage} (MENUNGGU PEMENANG ${prevMatch.matchNumber.toUpperCase()})`;
            }
          } else if (right && right.type === "winner" && left && left.type === "athlete") {
            const prevMatch = generatedMatches.find(x => x.id === right.matchId);
            if (prevMatch && prevMatch.matchNumber) {
              finalStage = `${baseStage} (MENUNGGU PEMENANG ${prevMatch.matchNumber.toUpperCase()})`;
            }
          }

          const mId = `m-${catId}-${g}-r${round}-${idx}`;
          const matchNumberVal = `Partai ${basePartaiNum + matchCounter}`;
          matchCounter++;

          const mObj = {
            id: mId,
            matchNumber: matchNumberVal,
            stage: finalStage,
            categoryClassId: catId,
            fighterRedId: fRedId,
            fighterBlueId: fBlueId,
            fighterRedName: cachedRedName,
            fighterRedClub: cachedRedClub,
            fighterBlueName: cachedBlueName,
            fighterBlueClub: cachedBlueClub,
            arena: scheduleGelanggang,
            gender: g,
            status: "BELUM",
            winner: null,
            roundDuration: 120,
            totalRounds: 3
          };

          generatedMatches.push(mObj);
          nextRoundSlots.push({ type: "winner", matchId: mId });
        } else if (left && !right) {
          // Left athlete has BYE: advances directly to next round
          nextRoundSlots.push(left);
        } else if (!left && right) {
          // Right athlete has BYE: advances directly to next round
          nextRoundSlots.push(right);
        } else {
          nextRoundSlots.push(null);
        }
      }

      currentSlots = nextRoundSlots;
    }

    const mergedMatches = [...unrelatedMatches, ...generatedMatches];
    setParticipants(sourceParticipants);
    setSchedules(mergedMatches);
    try {
      localStorage.setItem("jrz_cached_schedules", JSON.stringify(mergedMatches));
      localStorage.setItem("jrz_cached_participants", JSON.stringify(sourceParticipants));
    } catch {}

    try {
      const res = await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: categories,
          newParticipants: sourceParticipants,
          newMatches: mergedMatches
        })
      });

      if (res.ok) {
        notifyToast(`🎉 Sukses generate ${generatedMatches.length} partai bagan untuk ${catName} (${reqCapacity} Slot)!`);
        fetchSchedules();
      } else {
        if (!customCapacity) {
          alert("Gagal mendaftarkan jadwal bagan baru.");
        }
      }
    } catch (err) {
      console.error(err);
      if (!customCapacity) {
        alert("Gagal menghubungi server untuk mendaftarkan jadwal.");
      }
    }
  };

  const handleGenerateAllClassesSchedule = async () => {
    sound.playClick();
    if (categories.length === 0 && participants.length === 0) {
      alert("Belum ada kategori atau atlet yang terdaftar!");
      return;
    }
    const autoMatches = generateAllBracketsData(categories, participants, baganSchemeType);
    if (autoMatches.length === 0) {
      alert("Tidak ada jadwal yang dapat digenerate. Pastikan data atlet telah terdaftar pada kelas tanding.");
      return;
    }
    try {
      const res = await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: categories,
          newParticipants: participants,
          newMatches: autoMatches
        })
      });
      if (res.ok) {
        notifyToast(`⚡ Sukses generate ${autoMatches.length} partai untuk SEMUA kelas!`);
        fetchSchedules();
      } else {
        alert("Gagal menyimpan jadwal semua kelas ke server.");
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan teknis saat generate semua jadwal.");
    }
  };

  // Automatically check and regenerate if athlete list grows or if the active slots require a larger bracket
  useEffect(() => {
    const checkAndAutoGenerate = async () => {
      if (!showBaganScreen) return;
      if (localStorage.getItem("jrz_bracket_cleared") === "true") return;
      if (!selectedBaganCategory || !selectedBaganGender) return;

      const unfilteredPart = participants.filter(
        p => p.categoryClassId === selectedBaganCategory && p.gender === selectedBaganGender && p.name && p.name.trim() !== ""
      );
      const realParts = unfilteredPart.filter(p => !isDummyAthleteObj(p));
      const filteredPart = realParts.length > 0 ? realParts : unfilteredPart;
      if (filteredPart.length === 0) return;

      // Power of 2 from athlete count, from 2 to 64
      let reqCapacity = 2;
      const len = filteredPart.length;
      if (len <= 2) reqCapacity = 2;
      else if (len <= 4) reqCapacity = 4;
      else if (len <= 8) reqCapacity = 8;
      else if (len <= 16) reqCapacity = 16;
      else if (len <= 32) reqCapacity = 32;
      else reqCapacity = 64;

      const existingMatches = schedules.filter(
        m => m.categoryClassId === selectedBaganCategory && m.gender === selectedBaganGender
      );

      // Auto check triggers if:
      // 1. Zero matches exist for this category & gender
      // 2. The existing match count does not match the expected single elimination match count (filteredPart.length - 1)
      const expectedMatchCount = Math.max(1, filteredPart.length - 1);
      const needsGeneration = existingMatches.length === 0 || existingMatches.length !== expectedMatchCount;

      if (needsGeneration) {
        const generationKey = `${selectedBaganCategory}-${selectedBaganGender}-${reqCapacity}-${filteredPart.length}-${baganSchemeType}`;
        if (lastGeneratedKey.current === generationKey) {
          return; // Skip if already ran for this specific state to avoid fetch loops
        }
        lastGeneratedKey.current = generationKey;
        await handleAutoGenerateBagan(reqCapacity);
      }
    };

    checkAndAutoGenerate();
  }, [selectedBaganCategory, selectedBaganGender, participants, schedules, baganSchemeType]);

  // Convert verbose category into shorthand e.g "Kelas C" -> "C PI" or "C PA"
  const getShortClassCode = (catId: string, genderVal: string | undefined) => {
    const cat = categories.find(c => c.id === catId);
    let nameStr = cat ? cat.name : (catId && catId.length < 15 ? catId : "Kelas G");
    
    const matched = nameStr.match(/Kelas\s+([A-Za-z0-9\-\+]+)/i);
    let letter = matched && matched[1] ? matched[1].toUpperCase() : nameStr.replace(/Kelas/i, "").trim().toUpperCase();
    if (!letter || letter.length > 8) {
      letter = "G";
    }
    
    const isPutri = genderVal && (genderVal.toUpperCase() === "PUTRI" || genderVal.toUpperCase() === "PI");
    const suffix = isPutri ? "PI" : "PA";
    return `${letter} ${suffix}`;
  };

  const getParticipantName = (pId: string | null) => {
    if (!pId) return "-";
    if (pId === "BYE") return "BYE";
    if (pId === "KOSONG") return "KOSONG";
    if (pId.startsWith("winner-")) {
      const matchId = pId.replace(/^winner-(match-)?/, "");
      const m = schedules.find(x => x.id === matchId || x.id === `match-${matchId}` || x.id?.replace(/^match-/, "") === matchId);
      if (m && m.status === "SELESAI" && m.winner) {
        const winnerId = m.winner === "MERAH" ? m.fighterRedId : m.fighterBlueId;
        const winnerName = m.winner === "MERAH" ? m.fighterRedName : m.fighterBlueName;
        if (winnerId && !winnerId.startsWith("winner-")) {
          const p = participants.find(part => part.id === winnerId);
          if (p) return p.name.toUpperCase();
        }
        if (winnerName && winnerName !== "PESILAT MERAH" && winnerName !== "PESILAT BIRU") {
          return winnerName.toUpperCase();
        }
      }
      if (m && m.matchNumber) {
        const numStr = m.matchNumber.toUpperCase();
        if (numStr.includes("PARTAI")) {
          return `PEMENANG ${numStr}`;
        } else {
          return `PEMENANG PARTAI ${numStr}`;
        }
      }
      return "PEMENANG PARTAI";
    }
    const p = participants.find(part => part.id === pId);
    return p ? p.name.toUpperCase() : pId.toUpperCase();
  };
  
  const getParticipantClub = (pId: string | null) => {
    if (!pId || pId === "BYE" || pId === "KOSONG") return "";
    if (pId.startsWith("winner-")) {
      const matchId = pId.replace(/^winner-(match-)?/, "");
      const m = schedules.find(x => x.id === matchId || x.id === `match-${matchId}` || x.id?.replace(/^match-/, "") === matchId);
      if (m && m.status === "SELESAI" && m.winner) {
        const winnerId = m.winner === "MERAH" ? m.fighterRedId : m.fighterBlueId;
        const winnerClub = m.winner === "MERAH" ? m.fighterRedClub : m.fighterBlueClub;
        if (winnerId && !winnerId.startsWith("winner-")) {
          const p = participants.find(part => part.id === winnerId);
          if (p) return p.club.toUpperCase();
        }
        if (winnerClub) return winnerClub.toUpperCase();
      }
      return "";
    }
    const p = participants.find(part => part.id === pId);
    return p ? p.club.toUpperCase() : "KONTINGEN";
  };

  const autoResolveWinnersIntoSchedule = async () => {
    let updatedAny = false;
    
    // Resolve helper to recursively find the absolute winner athlete details across all rounds
    const resolveFinalAthlete = (idVal: string): { id: string; name?: string; club?: string } => {
      if (!idVal || !idVal.startsWith("winner-")) {
        const p = participants.find(part => part.id === idVal);
        return {
          id: idVal,
          name: p ? p.name.toUpperCase() : undefined,
          club: p ? p.club.toUpperCase() : undefined
        };
      }
      const targetMatchId = idVal.replace(/^winner-(match-)?/, "");
      const parentMatch = schedules.find(x => 
        x.id === targetMatchId || 
        x.id === `match-${targetMatchId}` || 
        x.id?.replace(/^match-/, "") === targetMatchId
      );
      if (parentMatch && parentMatch.status === "SELESAI" && parentMatch.winner) {
        const isRed = parentMatch.winner === "MERAH";
        const nextId = isRed ? parentMatch.fighterRedId : parentMatch.fighterBlueId;
        const fallbackName = isRed ? parentMatch.fighterRedName : parentMatch.fighterBlueName;
        const fallbackClub = isRed ? parentMatch.fighterRedClub : parentMatch.fighterBlueClub;
        
        if (nextId && nextId.startsWith("winner-")) {
          return resolveFinalAthlete(nextId);
        }
        const resolved = nextId ? resolveFinalAthlete(nextId) : { id: "" };
        return {
          id: resolved.id || nextId || "",
          name: resolved.name || fallbackName,
          club: resolved.club || fallbackClub
        };
      }
      return { id: idVal };
    };

    const newSchedules = schedules.map(m => {
      let mUpdated = false;
      let updatedRedId = m.fighterRedId;
      let updatedRedName = m.fighterRedName;
      let updatedRedClub = m.fighterRedClub;

      let updatedBlueId = m.fighterBlueId;
      let updatedBlueName = m.fighterBlueName;
      let updatedBlueClub = m.fighterBlueClub;

      if (m.fighterRedId && m.fighterRedId.startsWith("winner-")) {
        const resRed = resolveFinalAthlete(m.fighterRedId);
        if (resRed.id && !resRed.id.startsWith("winner-")) {
          updatedRedId = resRed.id;
          if (resRed.name) updatedRedName = resRed.name;
          if (resRed.club) updatedRedClub = resRed.club;
          mUpdated = true;
        }
      }

      if (m.fighterBlueId && m.fighterBlueId.startsWith("winner-")) {
        const resBlue = resolveFinalAthlete(m.fighterBlueId);
        if (resBlue.id && !resBlue.id.startsWith("winner-")) {
          updatedBlueId = resBlue.id;
          if (resBlue.name) updatedBlueName = resBlue.name;
          if (resBlue.club) updatedBlueClub = resBlue.club;
          mUpdated = true;
        }
      }

      // Explicit Grand Final auto-feed from Pool A final & Pool B final
      if (m.id && m.id.includes("-grand-f-")) {
        const finalA = schedules.find(x => x.id?.includes("-pa-f-") && x.categoryClassId === m.categoryClassId && x.gender === m.gender);
        const finalB = schedules.find(x => x.id?.includes("-pb-f-") && x.categoryClassId === m.categoryClassId && x.gender === m.gender);
        if (finalA && finalA.status === "SELESAI" && finalA.winner) {
          const winRed = finalA.winner === "MERAH" ? finalA.fighterRedId : finalA.fighterBlueId;
          if (winRed && winRed !== m.fighterRedId) {
            updatedRedId = winRed;
            const res = resolveFinalAthlete(winRed);
            if (res.name) updatedRedName = res.name;
            if (res.club) updatedRedClub = res.club;
            mUpdated = true;
          }
        }
        if (finalB && finalB.status === "SELESAI" && finalB.winner) {
          const winBlue = finalB.winner === "MERAH" ? finalB.fighterRedId : finalB.fighterBlueId;
          if (winBlue && winBlue !== m.fighterBlueId) {
            updatedBlueId = winBlue;
            const res = resolveFinalAthlete(winBlue);
            if (res.name) updatedBlueName = res.name;
            if (res.club) updatedBlueClub = res.club;
            mUpdated = true;
          }
        }
      }

      if (mUpdated) {
        updatedAny = true;
        return {
          ...m,
          fighterRedId: updatedRedId,
          fighterRedName: updatedRedName,
          fighterRedClub: updatedRedClub,
          fighterBlueId: updatedBlueId,
          fighterBlueName: updatedBlueName,
          fighterBlueClub: updatedBlueClub
        };
      }
      return m;
    });

    if (updatedAny) {
      try {
        const res = await fetch("/api/tournament/import-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newCategories: categories,
            newParticipants: participants,
            newMatches: newSchedules
          })
        });
        if (res.ok) {
          setSchedules(newSchedules);
          notifyToast("🔄 Sistem berhasil meng-generate otomatis atlet pemenang ke babak berikutnya & Grand Final!");
        }
      } catch (err) {
        console.error("Gagal menyimpan re-generate otomatis pemenang:", err);
      }
    }
  };

  const downloadSchedulePdf = () => {
    sound.playClick();
    autoResolveWinnersIntoSchedule();
    setOverlaySelectedStage("ALL");
    setOverlaySelectedGelanggang("ALL");
    setShowScheduleDownloadOverlay(true);
  };

  const drawScheduleSignatures = (doc: any, sigY: number) => {
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    // Left block: Ketua Pertandingan
    doc.text("Mengetahui,", 50, sigY, { align: "center" });
    doc.setFont("Helvetica", "bold");
    doc.text("Ketua Pertandingan,", 50, sigY + 4.5, { align: "center" });
    doc.line(25, sigY + 22, 75, sigY + 22);
    if (namaKetuaPertandingan) {
      doc.text(namaKetuaPertandingan.toUpperCase(), 50, sigY + 26, { align: "center" });
    } else {
      doc.setFont("Helvetica", "normal");
      doc.text("(......................................................)", 50, sigY + 26, { align: "center" });
    }

    // Right block: Sekretaris Pertandingan
    doc.setFont("Helvetica", "normal");
    const dateStr = tanggalCetakDokumen || "01 JULI 2026";
    const placeStr = namaDaerahCetak || "IDI RAYEUK";
    doc.text(`${placeStr.toUpperCase()}, ${dateStr.toUpperCase()}`, 160, sigY, { align: "center" });
    doc.setFont("Helvetica", "bold");
    doc.text("Sekretaris Pertandingan,", 160, sigY + 4.5, { align: "center" });
    doc.line(135, sigY + 22, 185, sigY + 22);
    if (namaSekretarisPertandingan) {
      doc.text(namaSekretarisPertandingan.toUpperCase(), 160, sigY + 26, { align: "center" });
    } else {
      doc.setFont("Helvetica", "normal");
      doc.text("(......................................................)", 160, sigY + 26, { align: "center" });
    }
  };

  // Core generator for double-outlined high resemblance POPDA official match schedules PDF print with per-arena filter
  const executeDownloadSchedulePdf = (targetStage: string = "ALL", targetGelanggang: string = "ALL") => {
    sound.playClick();

    const filteredMatches = schedules.filter(m => {
      // 1. Stage filter
      if (targetStage !== "ALL") {
        const stageName = (m.stage || "").toUpperCase();
        let matchStage = false;
        if (targetStage === "PENYISIHAN") {
          matchStage = stageName.includes("PENYISIHAN") || stageName.includes("ROUND OF 16") || stageName.includes("ROUND OF 32");
        } else if (targetStage === "PEREMPAT FINAL") {
          matchStage = stageName.includes("PEREMPAT") || stageName.includes("ROUND OF 8");
        } else if (targetStage === "SEMIFINAL") {
          matchStage = stageName.includes("SEMIFINAL") || stageName.includes("POL A") || stageName.includes("POL B");
        } else if (targetStage === "FINAL") {
          matchStage = stageName === "FINAL" || stageName.includes("GRAND FINAL");
        } else {
          matchStage = stageName.includes(targetStage);
        }
        if (!matchStage) return false;
      }

      // 2. Gelanggang / Arena filter
      if (targetGelanggang !== "ALL") {
        const arenaMatch = (m.arena || "GELANGGANG A").trim().toUpperCase();
        const arenaTarget = targetGelanggang.trim().toUpperCase();
        if (arenaMatch !== arenaTarget && !arenaMatch.includes(arenaTarget) && !arenaTarget.includes(arenaMatch)) {
          return false;
        }
      }

      return true;
    });

    // Include matches that have a scheduled matchNumber OR valid athlete/placeholder data
    const validMatches = filteredMatches.filter(m => {
      if (m.matchNumber) return true;
      if (!m.fighterBlueId || !m.fighterRedId) return false;
      const blueFound = participants.some(p => p.id === m.fighterBlueId) || m.fighterBlueId === "BYE" || m.fighterBlueId.startsWith("winner-");
      const redFound = participants.some(p => p.id === m.fighterRedId) || m.fighterRedId === "BYE" || m.fighterRedId.startsWith("winner-");
      return blueFound || redFound;
    });

    // Sort sequentially by Match Number / Partai numerically
    const sortedMatches = [...validMatches].sort((a, b) => {
      const getNum = (m: any) => {
        const val = parseInt(m.matchNumber?.toString().replace(/\D/g, "") || "");
        return isNaN(val) ? 999999 : val;
      };
      
      const numA = getNum(a);
      const numB = getNum(b);
      if (numA !== numB) return numA - numB;

      // Fallback: category-by-category
      const catIdxA = categories.findIndex(c => c.id === a.categoryClassId);
      const catIdxB = categories.findIndex(c => c.id === b.categoryClassId);
      if (catIdxA !== catIdxB) return catIdxA - catIdxB;

      if (a.gender !== b.gender) {
        return a.gender === "PUTRA" ? -1 : 1;
      }

      return 0;
    });

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Exactly 14 matches fits perfectly per page on standard A4 portrait layout
    const MATCHES_PER_PAGE = 14;
    const totalPages = Math.ceil(sortedMatches.length / MATCHES_PER_PAGE) || 1;

    for (let pNum = 1; pNum <= totalPages; pNum++) {
      if (pNum > 1) {
        doc.addPage();
      }

      // Draw custom margins: top=10, left=20, right=20, bottom=10
      // Draw left (the logo loaded in Left monitor parameter) and right (from event input logoRightLocal) logos
      drawLogoPdf(doc, logoLeftLocal || "/logo_panel_dewan.svg", 20, 10, 15);
      drawLogoPdf(doc, logoRightLocal || "/logo_panel_dewan.svg", 175, 10, 15);

      // Center title text and determine textCursorY dynamically to prevent overlap
      let textCursorY = 13;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text("JADWAL PERTANDINGAN", 105, textCursorY, { align: "center" });
      textCursorY += 5;

      // Event Name: follows eventName state from Parameter Pertandingan
      doc.setFontSize(10);
      const chosenEventName = eventName || scheduleEventName || "KEJUARAAN PENCAK SILAT";
      const wrappedEventName = doc.splitTextToSize(chosenEventName.toUpperCase(), 134);
      wrappedEventName.forEach((line: string) => {
        doc.text(line, 105, textCursorY, { align: "center" });
        textCursorY += 4.5;
      });

      // Cabang Olahraga & Tempat/Waktu: follows tempatPelaksanaan and waktuPelaksanaan from panel parameter pertandingan
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 60, 75);
      const chosenCabang = scheduleCabangOlahraga || "PENCAK SILAT TANDING";
      const mergedTempat = tempatPelaksanaan || scheduleTanggalTempat || namaDaerahCetak || "TEMPAT PELAKSANAAN";
      const mergedWaktu = waktuPelaksanaan || tanggalCetakDokumen || "WAKTU PELAKSANAAN";
      const subTitleText = `${chosenCabang.toUpperCase()}  |  ${mergedTempat.toUpperCase()} - ${mergedWaktu.toUpperCase()}`;
      const wrappedSubTitle = doc.splitTextToSize(subTitleText, 134);
      wrappedSubTitle.forEach((line: string) => {
        doc.text(line, 105, textCursorY, { align: "center" });
        textCursorY += 4.5;
      });

      // Double divider line
      const lineY = textCursorY - 1.5;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(20, lineY, 190, lineY);
      doc.setLineWidth(0.2);
      doc.line(20, lineY + 1.2, 190, lineY + 1.2);

      // Three Block Info Labels: width = 170 (50, 70, 50) at dynamic boxY coord
      const boxY = lineY + 3.5;
      
      // Box 1 (Tanggal/Hari): X=20 to 70
      const chosenTanggalHari = scheduleTanggalHari || tanggalCetakDokumen || "HARI / TANGGAL";
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.setFillColor(255, 255, 255);
      doc.rect(20, boxY, 50, 10, "FD");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(chosenTanggalHari.toUpperCase(), 45, boxY + 6.2, { align: "center" });

      // Box 2 (Gelanggang - Blue Tint background): X=70 to 140
      const chosenGelanggang = targetGelanggang !== "ALL"
        ? targetGelanggang.toUpperCase()
        : (scheduleGelanggang ? scheduleGelanggang.toUpperCase() : "SEMUA GELANGGANG");
      doc.setFillColor(224, 242, 254);
      doc.rect(70, boxY, 70, 10, "FD");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(chosenGelanggang.toUpperCase(), 105, boxY + 6.2, { align: "center" });

      // Box 3 (Waktu/Sesi): X=140 to 190
      const chosenWaktuSesi = scheduleWaktuSesi || waktuPelaksanaan || "08:00 WIB - SELESAI";
      doc.setFillColor(255, 255, 255);
      doc.rect(140, boxY, 50, 10, "FD");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(chosenWaktuSesi.toUpperCase(), 165, boxY + 6.2, { align: "center" });

      // Calculate table header Y position dynamically based on Kop height
      const headerY = boxY + 13.5;
      const startRowsY = headerY + 8;

      // Draw Table Header at headerY, Height=8
      // Columns: NO (10), PARTAI (15), KELAS (35), BIRU (45), MERAH (45), REMARK (20) -> total = 170
      // Left generic header background (Purple)
      doc.setFillColor(74, 24, 122);
      doc.rect(20, headerY, 60, 8, "F");

      // BIRU header cell background (Blue)
      doc.setFillColor(29, 78, 216);
      doc.rect(80, headerY, 45, 8, "F");

      // MERAH header cell background (Red)
      doc.setFillColor(220, 38, 38);
      doc.rect(125, headerY, 45, 8, "F");

      // REMARK header cell background (Purple)
      doc.setFillColor(74, 24, 122);
      doc.rect(170, headerY, 20, 8, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text("NO", 25, headerY + 5.5, { align: "center" });
      doc.text("PARTAI", 37.5, headerY + 5.5, { align: "center" });
      doc.text("KELAS", 62.5, headerY + 5.5, { align: "center" });
      doc.text("BIRU", 102.5, headerY + 5.5, { align: "center" });
      doc.text("MERAH", 147.5, headerY + 5.5, { align: "center" });
      doc.text("REMARK", 180, headerY + 5.5, { align: "center" });

      // Outlines for header
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(20, headerY, 190, headerY);
      doc.line(20, headerY + 8, 190, headerY + 8);

      const startIdx = (pNum - 1) * MATCHES_PER_PAGE;
      const pageMatches = sortedMatches.slice(startIdx, startIdx + MATCHES_PER_PAGE);

      if (pageMatches.length === 0) {
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(110, 110, 110);
        doc.text("Belum ada jadwal pertandingan terdaftar!", 105, headerY + 16, { align: "center" });
      } else {
        pageMatches.forEach((match, rIdx) => {
          const rowY = startRowsY + (rIdx * 12);
          
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.3);
          doc.line(20, rowY + 12, 190, rowY + 12);
          
          // Vertical lines with precise proportional columns
          doc.line(20, rowY, 20, rowY + 12);   // Left boundary
          doc.line(30, rowY, 30, rowY + 12);   // NO boundary
          doc.line(45, rowY, 45, rowY + 12);   // PARTAI boundary
          doc.line(80, rowY, 80, rowY + 12);   // KELAS boundary
          doc.line(125, rowY, 125, rowY + 12); // BIRU boundary
          doc.line(170, rowY, 170, rowY + 12); // MERAH boundary
          doc.line(190, rowY, 190, rowY + 12); // REMARK boundary

          const globalNum = startIdx + rIdx + 1;
          const matchNum = match.matchNumber?.replace(/\D/g, "") || globalNum.toString();

          const classCode = getShortClassCode(match.categoryClassId, match.gender).replace(/\s+/, " / ");
          const cat = categories.find(c => c.id === match.categoryClassId);
          const division = cat && cat.division ? cat.division.toUpperCase() : "REMAJA";
          const stageStr = match.stage ? match.stage.toUpperCase() : "PENYISIHAN";

          const blueName = getParticipantName(match.fighterBlueId);
          const blueClub = getParticipantClub(match.fighterBlueId);

          const redName = getParticipantName(match.fighterRedId);
          const redClub = getParticipantClub(match.fighterRedId);

          // NO Column value
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(`${globalNum}`, 25, rowY + 7, { align: "center" });

          // PARTAI Column value
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(14);
          doc.text(`${matchNum}`, 37.5, rowY + 7.5, { align: "center" });

          // KELAS Column value
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8.5);
          doc.text(classCode, 62.5, rowY + 3.8, { align: "center" });
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(80, 80, 80);
          doc.text(division, 62.5, rowY + 7.2, { align: "center" });
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text(stageStr, 62.5, rowY + 10.5, { align: "center" });

          // BIRU Column value (blue text)
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(29, 79, 216);
          doc.text(blueName, 102.5, rowY + 5, { align: "center" });
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text(blueClub, 102.5, rowY + 9, { align: "center" });

          // MERAH Column value (red text)
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(220, 38, 38);
          doc.text(redName, 147.5, rowY + 5, { align: "center" });
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text(redClub, 147.5, rowY + 9, { align: "center" });

          // REMARK Column value (shows Gelanggang & Match Status)
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(30, 41, 59);
          const cleanArena = (match.arena || "GEL A").replace("GELANGGANG ", "GEL. ");
          doc.text(cleanArena, 180, rowY + 5.5, { align: "center" });
          if (match.status === "SELESAI") {
            doc.setFontSize(6.5);
            doc.setTextColor(16, 185, 129);
            doc.text(match.winner ? `${match.winner} MENANG` : "SELESAI", 180, rowY + 9, { align: "center" });
          }
        });
      }

      const isLastPage = pNum === totalPages;
      if (isLastPage) {
        const lastRowY = startRowsY + (pageMatches.length * 12);
        
        // Memo block
        const memoY = lastRowY + 6;
        if (memoY < 275) {
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text("Catatan untuk Official Tim :", 20, memoY);
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7.5);
          doc.text("1. Dimohon meneliti secara cermat jadwal pertandingan diatas! Jika terdapat kesalahan, laporan ke sekretariat.", 20, memoY + 4.5);
        }

        // Signature block
        const sigY = Math.min(lastRowY + 20, 240);
        const actualSigY = lastRowY + 45 > 285 ? 240 : sigY;
        
        if (lastRowY + 45 > 285) {
          doc.addPage();
          drawLogoPdf(doc, logoLeftLocal || "/logo_panel_dewan.svg", 20, 10, 15);
          drawLogoPdf(doc, logoRightLocal || "/logo_panel_dewan.svg", 175, 10, 15);
          
          let sigHeaderY = 15;
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(10);
          doc.text("LEMBAR PENGESAHAN JADWAL PERTANDINGAN", 105, sigHeaderY, { align: "center" });
          doc.line(20, sigHeaderY + 5, 190, sigHeaderY + 5);
          
          const finalSigY = 45;
          drawScheduleSignatures(doc, finalSigY);
        } else {
          drawScheduleSignatures(doc, actualSigY);
        }
      }
    }

    const cleanGelanggangStr = targetGelanggang === "ALL" ? "Semua_Gelanggang" : targetGelanggang.replace(/\s+/g, "_");
    const cleanStageStr = targetStage.replace(/\s+/g, "_");
    doc.save(`Jadwal_Pertandingan_${cleanGelanggangStr}_${cleanStageStr}.pdf`);
    notifyToast(`📥 Jadwal Pertandingan (${cleanGelanggangStr} - ${cleanStageStr}) PDF berhasil diunduh!`);
  };

  const downloadAllGelanggangSeparately = async (targetStage: string = "ALL") => {
    sound.playClick();
    const activeArenas = availableGelanggangList.filter(g => 
      schedules.some(m => (m.matchNumber || m.fighterRedId) && (m.arena?.trim().toUpperCase() === g || (!m.arena && g === "GELANGGANG A")))
    );
    const targetArenas = activeArenas.length > 0 ? activeArenas : ["GELANGGANG A", "GELANGGANG B"];
    notifyToast(`⏳ Menyiapkan unduhan terpisah untuk ${targetArenas.length} gelanggang...`);
    for (let i = 0; i < targetArenas.length; i++) {
      const g = targetArenas[i];
      executeDownloadSchedulePdf(targetStage, g);
      await new Promise(r => setTimeout(r, 450));
    }
    notifyToast(`✅ Selesai mengunduh ${targetArenas.length} file PDF jadwal per gelanggang!`);
  };

  // Render Layar Baru Workspace for Secretary Match Scheduler
  const renderSchedulePreviewScreen = () => {
    const filteredMatches = scheduleStageFilter === "ALL" 
      ? schedules 
      : schedules.filter(m => m.stage === scheduleStageFilter);

    return (
      <div className="flex-grow flex flex-col px-6 pt-3 pb-6 max-w-7xl mx-auto w-full select-none" id="schedule-workspace-root">
        
        {/* UPPER HEAD BLOCK */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#140b28] border border-purple-900/50 p-5 rounded-2xl mb-6 shadow-2xl relative">
          <div>
            <span className="text-[9px] text-[#facc15] font-black uppercase tracking-[0.2em] block mb-1">PROGRAM KONTROL SEKRETARIS</span>
            <h2 className="text-lg font-black tracking-widest text-[#f8fafc] uppercase bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
              MATRIKS JADWAL & CETAK RESMI
            </h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              ref={fileInputExcelRef}
              onChange={handleUploadExcel} 
              className="hidden" 
            />
            
            <button
              onClick={() => fileInputExcelRef.current?.click()}
              className="px-4 py-2.5 border border-purple-700/50 bg-purple-950/20 text-purple-300 hover:bg-[#34185e] hover:border-purple-400 rounded-xl text-xs uppercase font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#facc15]" />
              PERBARUI DATA BAGAN & JADWAL (.XLSX)
            </button>

            <button
              onClick={downloadSchedulePdf}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white hover:shadow-[0_0_15px_rgba(0, 128, 0,0.3)] duration-200 rounded-xl text-xs uppercase font-extrabold flex items-center gap-1.5 cursor-pointer border-none"
            >
              <Printer className="w-4 h-4 text-[#facc15] animate-pulse" />
              UNDUH PDF JADWAL
            </button>

            <button
              onClick={() => setShowSchedulePreviewScreen(false)}
              className="px-4 py-2.5 bg-[#2c1544] hover:bg-[#3f1e63] border border-purple-900/40 text-slate-300 rounded-xl text-xs uppercase font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali Ke Panel
            </button>
          </div>
        </div>

        {/* WORKSPACE AREA: LEFT CONTROLS, RIGHT A4 CANVAS SHEET */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT: LIVE PARAMETER CONTROLLERS */}
          <div className="bg-[#110724] border border-purple-950 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
            <div className="border-b border-purple-900/30 pb-2 mb-2">
              <h3 className="text-xs font-black tracking-widest text-[#facc15] uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                DOKUMEN KONTROL
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-purple-400">Nama Event POPDA / Kejuaraan</label>
                <textarea
                  rows={2}
                  value={scheduleEventName}
                  onChange={(e) => setScheduleEventName(e.target.value)}
                  className="w-full bg-[#1b0c33] border border-purple-900/60 rounded-xl p-2.5 font-sans font-bold text-xs text-slate-100 placeholder-purple-300/10 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-purple-400">Cabang Olahraga</label>
                <input
                  type="text"
                  value={scheduleCabangOlahraga}
                  onChange={(e) => setScheduleCabangOlahraga(e.target.value)}
                  className="w-full bg-[#1b0c33] border border-purple-900/60 rounded-xl px-3 py-2 font-sans font-bold text-xs text-slate-100 placeholder-purple-300/10 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-purple-400">Wilayah / Tanggal Periode</label>
                <input
                  type="text"
                  value={scheduleTanggalTempat}
                  onChange={(e) => setScheduleTanggalTempat(e.target.value)}
                  className="w-full bg-[#1b0c33] border border-purple-900/60 rounded-xl px-3 py-2 font-sans font-bold text-xs text-slate-100 placeholder-purple-300/10 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-purple-400">Hari / Tanggal</label>
                  <input
                    type="text"
                    value={scheduleTanggalHari}
                    onChange={(e) => setScheduleTanggalHari(e.target.value)}
                    className="w-full bg-[#1b0c33] border border-purple-900/60 rounded-xl px-3 py-1.5 font-sans font-bold text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-purple-400">Arena Gelanggang</label>
                  <input
                    type="text"
                    value={scheduleGelanggang}
                    onChange={(e) => setScheduleGelanggang(e.target.value)}
                    className="w-full bg-[#1b0c33] border border-purple-900/60 rounded-xl px-3 py-1.5 font-sans font-bold text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-purple-400">Sesi Sesi</label>
                  <input
                    type="text"
                    value={scheduleSesiNama}
                    onChange={(e) => setScheduleSesiNama(e.target.value)}
                    className="w-full bg-[#1b0c33] border border-purple-900/60 rounded-xl px-3 py-1.5 font-sans font-bold text-xs text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase font-bold text-purple-400">Jam Sesi</label>
                  <input
                    type="text"
                    value={scheduleWaktuSesi}
                    onChange={(e) => setScheduleWaktuSesi(e.target.value)}
                    className="w-full bg-[#1b0c33] border border-purple-900/60 rounded-xl px-3 py-1.5 font-sans font-bold text-xs text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] uppercase font-bold text-purple-400">Filter Babak (Stage)</label>
                <select
                  value={scheduleStageFilter}
                  onChange={(e) => setScheduleStageFilter(e.target.value)}
                  className="w-full bg-[#1b0c33] border border-purple-900/60 rounded-xl p-2.5 font-sans font-bold text-xs text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">SEMUA JADWAL JALUR</option>
                  <option value="PENYISIHAN">BABAK PENYISIHAN</option>
                  <option value="SEMIFINAL">SEMI FINAL (S/F)</option>
                  <option value="PEREMPATFINAL">PEREMPAT FINAL (Q/F)</option>
                  <option value="FINAL">BABAK FINAL</option>
                </select>
              </div>

              <div className="border-t border-purple-900/30 pt-3 flex flex-col gap-2">
                <span className="text-[9px] uppercase font-black text-amber-400 tracking-wider">Tanda Tangan Cetak PDF</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] uppercase font-bold text-purple-300">Nama Daerah</label>
                    <input
                      type="text"
                      value={namaDaerahCetak}
                      onChange={(e) => updateNamaDaerahCetak(e.target.value)}
                      placeholder="e.g. Aceh Timur"
                      className="w-full bg-[#1b0c33] border border-purple-900/60 rounded-xl px-2.5 py-1.5 font-sans font-bold text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] uppercase font-bold text-purple-300">Tanggal Cetak</label>
                    <input
                      type="text"
                      value={tanggalCetakDokumen}
                      onChange={(e) => updateTanggalCetakDokumen(e.target.value)}
                      placeholder="e.g. 11 Juli 2024"
                      className="w-full bg-[#1b0c33] border border-purple-900/60 rounded-xl px-2.5 py-1.5 font-sans font-bold text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] uppercase font-bold text-purple-300">Ketua Pertandingan</label>
                    <input
                      type="text"
                      value={namaKetuaPertandingan}
                      onChange={(e) => updateNamaKetuaPertandingan(e.target.value)}
                      placeholder="e.g. H. Fauzi"
                      className="w-full bg-[#1b0c33] border border-purple-900/60 rounded-xl px-2.5 py-1.5 font-sans font-bold text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] uppercase font-bold text-purple-300">Sekretaris</label>
                    <input
                      type="text"
                      value={namaSekretarisPertandingan}
                      onChange={(e) => updateNamaSekretarisPertandingan(e.target.value)}
                      placeholder="e.g. Linda W."
                      className="w-full bg-[#1b0c33] border border-purple-900/60 rounded-xl px-2.5 py-1.5 font-sans font-bold text-xs text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-purple-950/10 border border-purple-900/30 rounded-xl text-[10.5px]">
              <span className="text-amber-400 font-extrabold uppercase block mb-1">💡 INFO KETENTUAN SPREADSHEET :</span>
              <p className="text-purple-300/60 font-medium font-sans leading-relaxed text-justify">
                Pastikan berkas Excel yang diunggah dari menu bagan berisi kolom utama yang sesuai (seperti No Partai, Kelas, Atlit Merah, Kontingen Merah, Atlit Biru, Kontingen Biru, Babak/Stage). Dan filter babak diatas akan otomatis memisahkan pratinjau sesuai kebutuhan Anda.
              </p>
            </div>
          </div>

          {/* RIGHT: INTERACTIVE A4 PRATINJAU DOKUMEN CETAK */}
          <div className="lg:col-span-2 overflow-x-auto p-1">
            <div className="max-w-[760px] min-w-[700px] bg-white text-black p-8 rounded-2xl shadow-2xl relative select-text border border-purple-200/5" id="printable-schedule-paper">
              
              <div className="flex justify-between items-center border-b-4 border-black pb-3 mb-4 font-sans">
                <div className="w-[70px] text-center flex flex-col items-center justify-center">
                  {logoLeftLocal ? (
                    <img src={logoLeftLocal} alt="Logo Kiri" className="w-[60px] h-[60px] object-contain" />
                  ) : (
                    <div className="w-[60px] h-[60px] rounded-full border-2 border-black flex items-center justify-center bg-purple-900 text-white font-black text-[10px] shadow">
                      IPSI
                    </div>
                  )}
                  <span className="text-[7.5px] font-black uppercase text-black leading-none block mt-1 tracking-wider">OFFICIAL</span>
                </div>

                <div className="text-center flex-grow px-2 font-sans">
                  <h3 className="text-xs font-black tracking-tight leading-tight uppercase font-sans text-black">
                    {eventName || scheduleEventName || "KEJUARAAN PENCAK SILAT"}
                  </h3>
                  <div className="font-serif italic text-xs font-extrabold text-red-600 mt-0.5 tracking-wider uppercase">
                    {scheduleCabangOlahraga || "PENCAK SILAT TANDING"}
                  </div>
                  <div className="text-[9.5px] font-bold text-black uppercase mt-0.5 tracking-wide">
                    {(tempatPelaksanaan || scheduleTanggalTempat || namaDaerahCetak || "IDI RAYEUK").toUpperCase()} - {(waktuPelaksanaan || tanggalCetakDokumen || "07 S.D 12 JULI 2024").toUpperCase()}
                  </div>
                </div>

                <div className="w-[70px] text-center flex flex-col items-center justify-center">
                  {logoRightLocal ? (
                    <img src={logoRightLocal} alt="Logo Kanan" className="w-[60px] h-[60px] object-contain" />
                  ) : (
                    <div className="w-[60px] h-[60px] rounded-full border-2 border-black flex items-center justify-center bg-amber-500 text-slate-950 font-black text-[10px] shadow">
                      PANITIA
                    </div>
                  )}
                  <span className="text-[7.5px] font-black uppercase text-black leading-none block mt-1 tracking-wider">EVENT</span>
                </div>
              </div>

              <div className="bg-[#cdcdcd] text-center py-1.5 border-2 border-black rounded shadow-inner mb-3">
                <span className="font-sans font-black tracking-widest text-[#000] text-[14px]">
                  JADWAL PERTANDINGAN
                </span>
              </div>

              <div className="flex justify-between mb-1.5">
                <div className="border-[1.8px] border-black rounded px-4 py-1 text-center font-extrabold text-[10.5px] uppercase w-[130px] text-black">
                  {scheduleStageFilter === "ALL" ? "SEMIFINAL" : scheduleStageFilter}
                </div>
                <div className="border-[1.8px] border-black rounded px-4 py-1 text-center font-extrabold text-[10.5px] uppercase w-[130px] text-black">
                  {scheduleWaktuSesi || waktuPelaksanaan || "08:00 WIB - SELESAI"}
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <div className="border-[1.8px] border-black rounded px-4 py-1 text-center font-extrabold text-[10.5px] w-[130px] text-black">
                  {scheduleTanggalHari || tanggalCetakDokumen || "HARI / TANGGAL"}
                </div>
                <div className="border-[1.8px] border-black rounded px-4 py-0.5 text-center font-black text-[13.5px] flex-grow mx-1.5 uppercase tracking-wider text-black">
                  {scheduleGelanggang || "GELANGGANG 1"}
                </div>
                <div className="border-[1.8px] border-black rounded px-4 py-1 text-center font-extrabold text-[10.5px] uppercase w-[130px] text-black">
                  {scheduleSesiNama || "SESI I"}
                </div>
              </div>

              <table className="w-full border-collapse border-2 border-black text-black">
                <thead>
                  <tr className="border-b-2 border-black text-[9.5px] font-sans h-7 text-black">
                    <th className="border-r-2 border-black font-black text-[10px] w-9">NO</th>
                    <th className="border-r-2 border-black font-black text-[10px] w-[55px]">PARTAI</th>
                    <th className="border-r-2 border-black font-black text-[10px] w-[65px]">KELAS</th>
                    <th className="border-r-2 border-black font-black text-[10px] bg-rose-600 text-white uppercase tracking-wider">MERAH</th>
                    <th className="border-r-2 border-black font-black text-[10px] bg-blue-600 text-white uppercase tracking-wider">BIRU</th>
                    <th className="font-black text-[10px] w-[100px] uppercase">REMARK</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 font-bold italic text-slate-500 text-[11px] border-b-2 border-black">
                        Tidak ada partai divalidkan pada babak "{scheduleStageFilter}". Silakan upload excel bagan atau sinkronkan turnamen.
                      </td>
                    </tr>
                  ) : (
                    filteredMatches.map((mItem, idx) => {
                      const idNum = mItem.matchNumber?.replace(/\D/g, "") || (idx + 1).toString();
                      return (
                        <tr key={mItem.id || idx} className="border-b-[1.7px] border-black h-[35px] text-[11px]">
                          <td className="border-r-2 border-black text-center font-black">{idx + 1}</td>
                          <td className="border-r-2 border-black text-center font-extrabold text-[13px]">{idNum}</td>
                          <td className="border-r-2 border-black text-center font-black">{getShortClassCode(mItem.categoryClassId, mItem.gender)}</td>
                          <td className="border-r-2 border-black text-center px-1">
                            <div className="font-black text-black uppercase leading-tight">{getParticipantName(mItem.fighterRedId)}</div>
                            <div className="text-[8.5px] font-bold text-slate-700">{getParticipantClub(mItem.fighterRedId)}</div>
                          </td>
                          <td className="border-r-2 border-black text-center px-1">
                            <div className="font-black text-black uppercase leading-tight">{getParticipantName(mItem.fighterBlueId)}</div>
                            <div className="text-[8.5px] font-bold text-slate-700">{getParticipantClub(mItem.fighterBlueId)}</div>
                          </td>
                          <td className="p-0 m-0">
                            <div className="flex w-full h-[34px]">
                              <div className="w-1/2 border-r-[1.5px] border-black h-full"></div>
                              <div className="w-1/2 h-full"></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <div className="mt-5 text-left font-sans text-black">
                <span className="font-extrabold text-[9.5px] block underline mb-1 uppercase tracking-wide">
                  Catatan untuk Official Tim :
                </span>
                <div className="flex gap-1.5 font-bold text-[9px] text-[#000] leading-snug mb-5">
                  <span>1.</span>
                  <p className="text-justify font-black">
                    Dimohon meneliti secara cermat jadwal pertandingan diatas! Jika terdapat kesalahan, segera melaporkannya kepada sekretaris pertandingan untuk dilakukan perbaikan sebagaimana mestinya.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-between text-[10.5px] font-sans text-black border-t border-dashed border-gray-300 pt-5">
                <div className="text-center w-[200px]">
                  <p className="m-0">Mengetahui,</p>
                  <strong className="uppercase block text-xs">Ketua Pertandingan</strong>
                  <div className="h-12 flex items-center justify-center text-xs font-bold text-indigo-900 uppercase">
                    {namaKetuaPertandingan}
                  </div>
                  <p className="underline font-bold m-0">({namaKetuaPertandingan ? namaKetuaPertandingan.toUpperCase() : "............................................................"})</p>
                </div>
                <div className="text-center w-[200px]">
                  <p className="m-0">{namaDaerahCetak || "IDI RAYEUK"}, {tanggalCetakDokumen || "01 JULI 2026"}</p>
                  <strong className="uppercase block text-xs">Sekretaris Pertandingan</strong>
                  <div className="h-12 flex items-center justify-center text-xs font-bold text-indigo-900 uppercase">
                    {namaSekretarisPertandingan}
                  </div>
                  <p className="underline font-bold m-0">({namaSekretarisPertandingan ? namaSekretarisPertandingan.toUpperCase() : "............................................................"})</p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    );
  };

  const renderBaganScreen = () => {
    let activeCat = categories.find(c => c.id === selectedBaganCategory);
    let catDisplayName = activeCat ? activeCat.name : "Kelas B Putra (50 - 55 kg)";

    const unfilteredAthletes = participants.filter(
      p => p.categoryClassId === selectedBaganCategory && p.gender === selectedBaganGender && p.name && p.name.trim() !== ""
    );
    const realParts = unfilteredAthletes.filter(p => !isDummyAthleteObj(p));
    const catAthletes = realParts.length > 0 ? realParts : unfilteredAthletes;

    const currentBaganMatches = schedules.filter(
      m => m.categoryClassId === selectedBaganCategory && m.gender === selectedBaganGender
    );

    // Determine the bracket capacity based on actual athlete list length or matches
    let reqCapacity = 2;
    const userMatches = currentBaganMatches.filter(m => 
      m.fighterRedId && 
      m.fighterBlueId &&
      m.fighterRedId !== "KOSONG" &&
      m.fighterBlueId !== "KOSONG" &&
      !m.fighterRedId.startsWith("placeholder-") &&
      !m.fighterBlueId.startsWith("placeholder-") &&
      !m.fighterRedId.startsWith("winner-") &&
      !m.fighterBlueId.startsWith("winner-")
    );
    const len = userMatches.length > 0 ? userMatches.length * 2 : catAthletes.length;
    if (len <= 2) reqCapacity = 2;
    else if (len <= 4) reqCapacity = 4;
    else if (len <= 8) reqCapacity = 8;
    else if (len <= 16) reqCapacity = 16;
    else if (len <= 32) reqCapacity = 32;
    else reqCapacity = 64;

    // Helper to find match by stage
    const getMatchByStageName = (stageName: string) => {
      return currentBaganMatches.find(m => m.stage === stageName);
    };

    // Category deletion handler
    const handleDeleteBaganCategory = async (catId: string) => {
      sound.playClick();
      if (!confirm("Apakah Anda yakin ingin menghapus kelas bagan ini beserta seluruh atlet dan partai tanding di dalamnya?")) return;

      const remainingCategories = categories.filter(c => c.id !== catId);
      const remainingParticipants = participants.filter(p => p.categoryClassId !== catId);
      const remainingMatches = schedules.filter(m => m.categoryClassId !== catId);

      try {
        const res = await fetch("/api/tournament/import-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newCategories: remainingCategories,
            newParticipants: remainingParticipants,
            newMatches: remainingMatches
          })
        });
        if (res.ok) {
          notifyToast("🗑️ Kelas bagan berhasil dihapus!");
          if (selectedBaganCategory === catId && remainingCategories.length > 0) {
            setSelectedBaganCategory(remainingCategories[0].id);
          }
          fetchSchedules();
        } else {
          alert("Gagal menghapus kelas bagan.");
        }
      } catch (err) {
        console.error(err);
        alert("Error sewaktu menghubungi server.");
      }
    };

    // New category creation handler
    const handleCreateBaganCategory = async () => {
      sound.playClick();
      if (!newBaganName.trim()) {
        alert("Mohon masukkan nama bagan / kelas tanding.");
        return;
      }

      const catId = `cat-${Date.now()}`;
      const newCat = {
        id: catId,
        name: newBaganName.toUpperCase(),
        minWeight: 50,
        maxWeight: 55,
        division: "Remaja"
      };

      const newParts = [];
      for (let i = 1; i <= newBaganSize; i++) {
        newParts.push({
          id: `p-${catId}-${i}`,
          name: `PESILAT ${i} ${newBaganName.toUpperCase()}`,
          club: `KONTINGEN ${i}`,
          gender: newBaganGender,
          categoryClassId: catId,
          weight: 50 + i
        });
      }

      const newMatches = [];
      const basePartaiNum = schedules.length + 1;

      if (newBaganSize === 8) {
        // Quarter finals
        newMatches.push({
          id: `m-pa-sf1-${catId}-${newBaganGender}`,
          categoryClassId: catId,
          gender: newBaganGender,
          stage: "PEREMPAT FINAL L1",
          matchNumber: `${basePartaiNum}`,
          status: "TERDAFTAR",
          fighterRedId: `p-${catId}-1`,
          fighterBlueId: `p-${catId}-2`,
          roundDuration: 120,
          totalRounds: 3
        });
        newMatches.push({
          id: `m-pa-sf2-${catId}-${newBaganGender}`,
          categoryClassId: catId,
          gender: newBaganGender,
          stage: "PEREMPAT FINAL L2",
          matchNumber: `${basePartaiNum + 1}`,
          status: "TERDAFTAR",
          fighterRedId: `p-${catId}-3`,
          fighterBlueId: `p-${catId}-4`,
          roundDuration: 120,
          totalRounds: 3
        });
        newMatches.push({
          id: `m-pb-sf1-${catId}-${newBaganGender}`,
          categoryClassId: catId,
          gender: newBaganGender,
          stage: "PEREMPAT FINAL R1",
          matchNumber: `${basePartaiNum + 2}`,
          status: "TERDAFTAR",
          fighterRedId: `p-${catId}-5`,
          fighterBlueId: `p-${catId}-6`,
          roundDuration: 120,
          totalRounds: 3
        });
        newMatches.push({
          id: `m-pb-sf2-${catId}-${newBaganGender}`,
          categoryClassId: catId,
          gender: newBaganGender,
          stage: "PEREMPAT FINAL R2",
          matchNumber: `${basePartaiNum + 3}`,
          status: "TERDAFTAR",
          fighterRedId: `p-${catId}-7`,
          fighterBlueId: `p-${catId}-8`,
          roundDuration: 120,
          totalRounds: 3
        });

        // Semifinals
        newMatches.push({
          id: `m-pa-f-${catId}-${newBaganGender}`,
          categoryClassId: catId,
          gender: newBaganGender,
          stage: "SEMIFINAL 1",
          matchNumber: `${basePartaiNum + 4}`,
          status: "TERDAFTAR",
          fighterRedId: `winner-pa-sf1`,
          fighterBlueId: `winner-pa-sf2`,
          roundDuration: 120,
          totalRounds: 3
        });
        newMatches.push({
          id: `m-pb-f-${catId}-${newBaganGender}`,
          categoryClassId: catId,
          gender: newBaganGender,
          stage: "SEMIFINAL 2",
          matchNumber: `${basePartaiNum + 5}`,
          status: "TERDAFTAR",
          fighterRedId: `winner-pb-sf1`,
          fighterBlueId: `winner-pb-sf2`,
          roundDuration: 120,
          totalRounds: 3
        });

        // Final
        newMatches.push({
          id: `m-grand-f-${catId}-${newBaganGender}`,
          categoryClassId: catId,
          gender: newBaganGender,
          stage: "FINAL",
          matchNumber: `${basePartaiNum + 6}`,
          status: "TERDAFTAR",
          fighterRedId: `winner-pa-f`,
          fighterBlueId: `winner-pb-f`,
          roundDuration: 120,
          totalRounds: 3
        });
      } else {
        // Size 4 Semifinals
        newMatches.push({
          id: `m-pa-f-${catId}-${newBaganGender}`,
          categoryClassId: catId,
          gender: newBaganGender,
          stage: "SEMIFINAL 1",
          matchNumber: `${basePartaiNum}`,
          status: "TERDAFTAR",
          fighterRedId: `p-${catId}-1`,
          fighterBlueId: `p-${catId}-2`,
          roundDuration: 120,
          totalRounds: 3
        });
        newMatches.push({
          id: `m-pb-f-${catId}-${newBaganGender}`,
          categoryClassId: catId,
          gender: newBaganGender,
          stage: "SEMIFINAL 2",
          matchNumber: `${basePartaiNum + 1}`,
          status: "TERDAFTAR",
          fighterRedId: `p-${catId}-3`,
          fighterBlueId: `p-${catId}-4`,
          roundDuration: 120,
          totalRounds: 3
        });

        // Final
        newMatches.push({
          id: `m-grand-f-${catId}-${newBaganGender}`,
          categoryClassId: catId,
          gender: newBaganGender,
          stage: "FINAL",
          matchNumber: `${basePartaiNum + 2}`,
          status: "TERDAFTAR",
          fighterRedId: `winner-pa-f`,
          fighterBlueId: `winner-pb-f`,
          roundDuration: 120,
          totalRounds: 3
        });
      }

      const mergedCategories = [...categories, newCat];
      const mergedParticipants = [...participants, ...newParts];
      const mergedMatches = [...schedules, ...newMatches];

      try {
        const res = await fetch("/api/tournament/import-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newCategories: mergedCategories,
            newParticipants: mergedParticipants,
            newMatches: mergedMatches
          })
        });
        if (res.ok) {
          setSelectedBaganCategory(catId);
          setSelectedBaganGender(newBaganGender);
          setNewBaganName("");
          notifyToast(`🎉 Kelas ${newBaganName.toUpperCase()} (${newBaganSize} Peserta) Berhasil Dibuat!`);
          fetchSchedules();
        } else {
          alert("Gagal menyimpan bagan baru.");
        }
      } catch (err) {
        console.error(err);
        alert("Error sewaktu menghubungi server.");
      }
    };

    // Save edited athlete information
    const handleSaveEditingMatch = async () => {
      if (!editingBaganMatch) return;
      sound.playClick();

      let redId = editingBaganMatch.fighterRedId;
      let blueId = editingBaganMatch.fighterBlueId;

      const updatedParts = [...participants];

      // Update or create Red participant
      if (redId && !redId.startsWith("winner-") && !redId.startsWith("placeholder-") && redId !== "BYE" && redId !== "KOSONG") {
        const pIdx = updatedParts.findIndex(p => p.id === redId);
        if (pIdx !== -1) {
          updatedParts[pIdx] = { ...updatedParts[pIdx], name: editRedName.toUpperCase(), club: editRedClub.toUpperCase() };
        }
      } else if (editRedName.trim() !== "") {
        const newId = `p-manual-${Date.now()}-red`;
        updatedParts.push({
          id: newId,
          name: editRedName.toUpperCase(),
          club: editRedClub.toUpperCase(),
          gender: selectedBaganGender,
          categoryClassId: selectedBaganCategory,
          weight: 50
        });
        redId = newId;
      }

      // Update or create Blue participant
      if (blueId && !blueId.startsWith("winner-") && !blueId.startsWith("placeholder-") && blueId !== "BYE" && blueId !== "KOSONG") {
        const pIdx = updatedParts.findIndex(p => p.id === blueId);
        if (pIdx !== -1) {
          updatedParts[pIdx] = { ...updatedParts[pIdx], name: editBlueName.toUpperCase(), club: editBlueClub.toUpperCase() };
        }
      } else if (editBlueName.trim() !== "") {
        const newId = `p-manual-${Date.now()}-blue`;
        updatedParts.push({
          id: newId,
          name: editBlueName.toUpperCase(),
          club: editBlueClub.toUpperCase(),
          gender: selectedBaganGender,
          categoryClassId: selectedBaganCategory,
          weight: 52
        });
        blueId = newId;
      }

      const updatedMatches = schedules.map(m => {
        if (m.id === editingBaganMatch.id) {
          return { ...m, fighterRedId: redId, fighterBlueId: blueId };
        }
        return m;
      });

      try {
        const res = await fetch("/api/tournament/import-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newCategories: categories,
            newParticipants: updatedParts,
            newMatches: updatedMatches
          })
        });
        if (res.ok) {
          notifyToast("📝 Data atlet bagan berhasil diperbarui!");
          setEditingBaganMatch(null);
          fetchSchedules();
        } else {
          alert("Gagal memperbarui data atlet.");
        }
      } catch (err) {
        console.error(err);
      }
    };

    // Render an interactive match node card in the tree
    const renderInteractiveMatchCard = (stageName: string, label: string) => {
      const match = getMatchByStageName(stageName);

      const redName = match ? resolveFighterName(stageName, "RED") : "BELUM ADA ATLET";
      const redClub = match ? resolveFighterClub(stageName, "RED") : "-";
      const blueName = match ? resolveFighterName(stageName, "BLUE") : "BELUM ADA ATLET";
      const blueClub = match ? resolveFighterClub(stageName, "BLUE") : "-";

      const isRedWinner = match?.winner === "MERAH";
      const isBlueWinner = match?.winner === "BIRU";
      const matchNum = match?.matchNumber || "00";

      return (
        <div className="bg-[#110d2c] border border-purple-950/80 rounded-2xl p-4 flex flex-col gap-2 w-full max-w-[245px] shadow-xl hover:border-purple-800 transition-all duration-150">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
            <span>PARTAI ${matchNum}</span>
            <span className="text-emerald-400 font-extrabold">${label}</span>
          </div>

          {/* Red Fighter Area */}
          <div className={`border-l-4 border-red-600 rounded-r-xl p-2.5 flex justify-between items-center transition-all ${
            isRedWinner ? "bg-red-950/30 border-red-500 shadow-md" : "bg-[#181136]"
          }`}>
            <div className="flex flex-col text-left truncate max-w-[130px]">
              <span className="font-sans font-black text-[11px] text-white uppercase truncate">${redName}</span>
              <span className="text-[9px] text-slate-400 truncate">${redClub}</span>
            </div>
            {match && isBaganControlsVisible && redName !== "BELUM ADA ATLET" && redName !== "KOSONG" && redName !== "BYE (MENUNGGU)" && (
              <button
                title="Set Pemenang Merah"
                onClick={() => handleSetWinnerBaganMatch(match.id, "MERAH")}
                className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-all border-none ${
                  isRedWinner ? "bg-amber-500 text-slate-950 scale-105 shadow-md shadow-amber-500/20" : "bg-red-900/30 hover:bg-red-800 text-red-200"
                }`}
              >
                👑
              </button>
            )}
          </div>

          {/* Blue Fighter Area */}
          <div className={`border-l-4 border-blue-600 rounded-r-xl p-2.5 flex justify-between items-center transition-all ${
            isBlueWinner ? "bg-blue-950/30 border-blue-500 shadow-md" : "bg-[#101438]"
          }`}>
            <div className="flex flex-col text-left truncate max-w-[130px]">
              <span className="font-sans font-black text-[11px] text-white uppercase truncate">${blueName}</span>
              <span className="text-[9px] text-slate-400 truncate">${blueClub}</span>
            </div>
            {match && isBaganControlsVisible && blueName !== "BELUM ADA ATLET" && blueName !== "KOSONG" && blueName !== "BYE (MENUNGGU)" && (
              <button
                title="Set Pemenang Biru"
                onClick={() => handleSetWinnerBaganMatch(match.id, "BIRU")}
                className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer transition-all border-none ${
                  isBlueWinner ? "bg-amber-500 text-slate-950 scale-105 shadow-md shadow-amber-500/20" : "bg-blue-900/30 hover:bg-blue-800 text-blue-200"
                }`}
              >
                👑
              </button>
            )}
          </div>

          {/* Control Row */}
          {match && isBaganControlsVisible && (
            <div className="flex gap-2 justify-end mt-1 border-t border-purple-950/40 pt-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setEditingBaganMatch(match);
                  setEditRedName(redName === "BELUM ADA ATLET" || redName === "KOSONG" ? "" : redName);
                  setEditRedClub(redClub === "-" ? "" : redClub);
                  setEditBlueName(blueName === "BELUM ADA ATLET" || blueName === "KOSONG" ? "" : blueName);
                  setEditBlueClub(blueClub === "-" ? "" : blueClub);
                }}
                className="px-2 py-1 bg-[#1a143f] hover:bg-[#251d5c] text-slate-300 text-[9px] font-bold uppercase rounded-lg cursor-pointer border border-purple-900/30 transition-colors flex items-center gap-1"
              >
                <Edit className="w-2.5 h-2.5" />
                EDIT
              </button>

              <button
                onClick={() => loadScheduleMatchItem(match.id)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg cursor-pointer border-none flex items-center gap-1 active:scale-95 transition-all shadow-md shadow-emerald-600/10"
              >
                <Play className="w-2.5 h-2.5 text-white fill-white" />
                PLAY
              </button>
            </div>
          )}
        </div>
      );
    };

    // Calculate final champion name
    const finalMatch = getMatchByStageName("FINAL") || getMatchByStageName("GRAND FINAL");
    const championName = finalMatch && finalMatch.winner
      ? (finalMatch.winner === "MERAH" ? resolveFighterName(finalMatch.stage, "RED") : resolveFighterName(finalMatch.stage, "BLUE"))
      : null;

    return (
      <div className="flex-grow flex flex-col min-h-screen bg-[#08031a] text-[#f8fafc]" id="bagan-view-dashboard">
        
        {/* TOP COMPREHENSIVE NAVIGATION HEADER */}
        <header className="bg-[#0e0725] border-b border-purple-900/20 py-3.5 px-6 flex items-center justify-between shadow-xl">
          {/* Left corner */}
          <div className="flex items-center gap-5">
            <button
              onClick={() => { sound.playClick(); setShowBaganScreen(false); }}
              className="flex items-center gap-1.5 bg-[#140b2e] hover:bg-rose-950/40 text-slate-300 hover:text-red-400 px-3.5 py-2 rounded-xl border border-purple-900/40 hover:border-red-500/40 transition-all text-xs font-black tracking-wider cursor-pointer"
            >
              <ArrowLeft className="w-4.5 h-4.5 text-purple-400" />
              <span>KELUAR</span>
            </button>
            <div className="flex items-center gap-2 text-slate-400">
              <Sparkles className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
              <div className="h-4 w-[1px] bg-purple-950/40 mx-1"></div>
              <Sliders className="w-4.5 h-4.5 text-purple-400" />
              <span className="font-sans font-black tracking-widest text-[13px] uppercase text-slate-100">
                PANEL SEKRETARIS PERTANDINGAN
              </span>
            </div>
          </div>

          {/* Middle navigation tabs */}
          <div className="flex items-center gap-2 bg-[#10092c] border border-purple-900/30 p-1 rounded-2xl">
            <button
              onClick={() => { sound.playClick(); setShowBaganScreen(false); setCurrentTab("KELOLA_ATLET"); }}
              className="px-4 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase text-slate-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
            >
              REGISTRASI ATLET
            </button>
            <button
              onClick={() => { sound.playClick(); setShowBaganScreen(false); }}
              className="px-4 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase text-slate-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
            >
              MODE GABUNGAN
            </button>
            <button
              onClick={() => { sound.playClick(); setShowBaganScreen(false); setCurrentTab("KONTROL"); }}
              className="px-4 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase text-slate-400 hover:text-white transition-all cursor-pointer border-none bg-transparent"
            >
              KONTROL PARTAI
            </button>
            <button
              className="px-5 py-1.5 rounded-xl text-[10px] font-black tracking-wider uppercase bg-emerald-600 text-white shadow-lg shadow-emerald-600/10 transition-all cursor-pointer border-none"
            >
              BAGAN TURNAMEN
            </button>
          </div>

          {/* Right corner active match preview info */}
          <div className="flex items-center gap-2.5">
            <div className="bg-purple-950/40 text-purple-300 border border-purple-900/40 px-3.5 py-1.5 rounded-xl text-[10px] uppercase font-bold tracking-widest">
              PARTAI 01 | KELAS B PUTRA
            </div>
            <DeviceBatteryIndicator />
          </div>
        </header>

        {/* WORKSPACE DOUBLE PANEL GRID LAYOUT */}
        <div className="flex-grow p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto w-full">
          
          {/* LEFT SUB-PANEL: CATEGORIES & BRACKET CREATOR */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
            
            {/* DAFTAR KELAS BAGAN CARD */}
            <div className="bg-[#100926] border border-purple-950 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-purple-950 pb-2.5">
                <div className="flex items-center gap-2 text-slate-200">
                  <ListOrdered className="w-4.5 h-4.5 text-emerald-400" />
                  <h3 className="text-xs font-black tracking-wider uppercase">
                    DAFTAR KELAS BAGAN
                  </h3>
                </div>
                <button
                  onClick={handleResetBaganToDefault}
                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  RESET DEFAULT
                </button>
              </div>

              {/* Dynamic list of categories */}
              <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-1">
                {categories.length === 0 ? (
                  <div className="text-[10px] text-slate-500 text-center py-5 font-bold uppercase">
                    Belum ada kelas bagan tanding.
                  </div>
                ) : (
                  categories.map(cat => {
                    const isActive = selectedBaganCategory === cat.id;
                    const catCount = participants.filter(p => p.categoryClassId === cat.id && p.gender === selectedBaganGender).length;
                    const is8Athletes = schedules.some(m => m.categoryClassId === cat.id && m.gender === selectedBaganGender && (m.stage === "PEREMPAT FINAL L1" || m.stage === "SEMIFINAL A1" || m.stage === "PEREMPAT FINAL R1" || m.stage === "PEREMPAT FINAL R2")) || catCount > 4;
                    const is4Athletes = schedules.some(m => m.categoryClassId === cat.id && m.gender === selectedBaganGender && (m.stage === "SEMIFINAL 1" || m.stage === "SEMIFINAL 2" || m.stage === "FINAL POL A" || m.stage === "FINAL POL B")) || catCount > 2;
                    const displaySize = is8Athletes ? 8 : (is4Athletes ? 4 : 2);

                    return (
                      <div
                        key={cat.id}
                        onClick={() => { sound.playClick(); setSelectedBaganCategory(cat.id); }}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                          isActive 
                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/15" 
                            : "bg-[#130d35] hover:bg-[#1a124c] text-slate-300"
                        }`}
                      >
                        <div className="flex flex-col text-left truncate flex-grow">
                          <span className="font-sans font-black text-xs uppercase truncate leading-tight">
                            {cat.name}
                          </span>
                          <span className={`text-[8.5px] font-bold uppercase mt-0.5 tracking-wider ${isActive ? "text-emerald-100" : "text-slate-400"}`}>
                            {selectedBaganGender} • {displaySize} PESERTA
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteBaganCategory(cat.id); }}
                          className={`p-1.5 rounded-lg border-none hover:bg-red-500/20 transition-all ${
                            isActive ? "text-white/60 hover:text-white" : "text-slate-400 hover:text-red-400"
                          }`}
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* TAMBAH BAGAN BARU CARD */}
            <div className="bg-[#100926] border border-purple-950 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
              <div className="border-b border-purple-950 pb-2.5 flex items-center gap-2">
                <PlusCircle className="w-4.5 h-4.5 text-emerald-400" />
                <h3 className="text-xs font-black tracking-wider text-slate-200 uppercase">
                  TAMBAH BAGAN BARU
                </h3>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                    NAMA BAGAN / KELAS
                  </label>
                  <input
                    type="text"
                    value={newBaganName}
                    onChange={(e) => setNewBaganName(e.target.value)}
                    placeholder="Contoh: Kelas C Putri"
                    className="w-full bg-[#1b0e3b] border border-purple-900/60 rounded-xl px-3 py-2.5 font-sans font-bold text-[#f8fafc] text-[12.5px] uppercase placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                      GENDER
                    </label>
                    <select
                      value={newBaganGender}
                      onChange={(e) => setNewBaganGender(e.target.value as "PUTRA" | "PUTRI")}
                      className="w-full bg-[#1b0e3b] border border-purple-900/60 rounded-xl px-2.5 py-2.5 font-sans font-bold text-[#f8fafc] text-[12px] uppercase cursor-pointer focus:outline-none focus:border-emerald-500"
                    >
                      <option value="PUTRA">PUTRA</option>
                      <option value="PUTRI">PUTRI</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                      UKURAN (PESERTA)
                    </label>
                    <select
                      value={newBaganSize}
                      onChange={(e) => setNewBaganSize(Number(e.target.value) as 4 | 8)}
                      className="w-full bg-[#1b0e3b] border border-purple-900/60 rounded-xl px-2.5 py-2.5 font-sans font-bold text-[#f8fafc] text-[12px] uppercase cursor-pointer focus:outline-none focus:border-emerald-500"
                    >
                      <option value="2">2 PESERTA (FINAL)</option>
                      <option value="4">4 PESERTA (SEMI)</option>
                      <option value="8">8 PESERTA</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleCreateBaganCategory}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-extrabold py-3.5 px-4 rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-lg hover:shadow-emerald-500/20 cursor-pointer border-none"
                >
                  <Plus className="w-4 h-4 text-white stroke-[3]" />
                  BUAT BAGAN
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT SUB-PANEL: THE COMPREHENSIVE INTERACTIVE BRACKETS CHART */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-5">
            
            {/* BRACKETS WRAPPER WITH HEADER */}
            <div className="bg-[#100926]/90 border border-purple-950 rounded-3xl p-6 shadow-2xl flex-grow flex flex-col relative overflow-hidden min-h-[500px]">
              
              {/* Bracket Info Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-purple-950/60 pb-4 mb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <Trophy className="w-5.5 h-5.5 text-[#facc15] fill-[#facc15]/10 animate-pulse" />
                    <h2 className="text-base font-black tracking-widest uppercase text-amber-400">
                      {catDisplayName.toUpperCase()}
                    </h2>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed max-w-xl">
                    Gunakan tombol mahkota untuk mengaktifkan pemenang. Pemenang otomatis lanjut ke babak selanjutnya. Klik tombol PLAY (Muat ke Skoring) untuk mengisi data tanding secara instan.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1 bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-bold text-[9.5px] uppercase tracking-wider rounded-lg">
                    KATEGORI {selectedBaganGender}
                  </span>
                  <span className="px-3 py-1 bg-purple-950/60 border border-purple-500/30 text-purple-300 font-bold text-[9.5px] uppercase tracking-wider rounded-lg">
                    {reqCapacity} ATLET
                  </span>
                </div>
              </div>

              {/* HORIZONTAL GRID OF COLUMNS */}
              <div 
                className={`flex-grow overflow-x-auto pb-4 flex items-center justify-between gap-6 min-w-[700px] transition-transform duration-300 ${
                  isBaganRotated ? "rotate-180" : ""
                }`}
              >
                {reqCapacity === 16 && (
                  <>
                    {/* COL 1: ROUND OF 16 / PENYISIHAN */}
                    <div className="flex flex-col justify-around h-full py-4 gap-2 flex-1 min-w-[180px]">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        BABAK PENYISIHAN
                      </div>
                      {getMatchByStageName("PENYISIHAN L1") && renderInteractiveMatchCard("PENYISIHAN L1", "ROUND 16 L1")}
                      {getMatchByStageName("PENYISIHAN L2") && renderInteractiveMatchCard("PENYISIHAN L2", "ROUND 16 L2")}
                      {getMatchByStageName("PENYISIHAN L3") && renderInteractiveMatchCard("PENYISIHAN L3", "ROUND 16 L3")}
                      {getMatchByStageName("PENYISIHAN L4") && renderInteractiveMatchCard("PENYISIHAN L4", "ROUND 16 L4")}
                      {getMatchByStageName("PENYISIHAN R1") && renderInteractiveMatchCard("PENYISIHAN R1", "ROUND 16 R1")}
                      {getMatchByStageName("PENYISIHAN R2") && renderInteractiveMatchCard("PENYISIHAN R2", "ROUND 16 R2")}
                      {getMatchByStageName("PENYISIHAN R3") && renderInteractiveMatchCard("PENYISIHAN R3", "ROUND 16 R3")}
                      {getMatchByStageName("PENYISIHAN R4") && renderInteractiveMatchCard("PENYISIHAN R4", "ROUND 16 R4")}
                    </div>

                    {/* COL 2: QUARTERFINALS */}
                    <div className="flex flex-col justify-around h-full py-4 gap-4 flex-1">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        PEREMPAT FINAL
                      </div>
                      {getMatchByStageName("PEREMPAT FINAL L1") && renderInteractiveMatchCard("PEREMPAT FINAL L1", "QUARTER L1")}
                      {getMatchByStageName("PEREMPAT FINAL L2") && renderInteractiveMatchCard("PEREMPAT FINAL L2", "QUARTER L2")}
                      {getMatchByStageName("PEREMPAT FINAL R1") && renderInteractiveMatchCard("PEREMPAT FINAL R1", "QUARTER R1")}
                      {getMatchByStageName("PEREMPAT FINAL R2") && renderInteractiveMatchCard("PEREMPAT FINAL R2", "QUARTER R2")}
                    </div>

                    {/* COL 3: SEMIFINALS */}
                    <div className="flex flex-col justify-around h-full py-4 gap-4 flex-1">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        SEMIFINAL
                      </div>
                      {getMatchByStageName("SEMIFINAL 1") && renderInteractiveMatchCard("SEMIFINAL 1", "SEMI 1")}
                      {getMatchByStageName("SEMIFINAL 2") && renderInteractiveMatchCard("SEMIFINAL 2", "SEMI 2")}
                    </div>

                    {/* COL 4: GRAND FINALS */}
                    <div className="flex flex-col justify-around h-full py-4 gap-4 flex-1">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        FINAL
                      </div>
                      {getMatchByStageName("FINAL") && renderInteractiveMatchCard("FINAL", "FINAL")}
                    </div>
                  </>
                )}

                {reqCapacity > 16 && (
                  <>
                    {/* For 32+ brackets, show the final rounds (Quarterfinal, Semifinal, Final) */}
                    {/* COL 1: QUARTERFINALS */}
                    <div className="flex flex-col justify-around h-full py-4 gap-4 flex-1">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        PEREMPAT FINAL
                      </div>
                      {getMatchByStageName("PEREMPAT FINAL L1") && renderInteractiveMatchCard("PEREMPAT FINAL L1", "QUARTER L1")}
                      {getMatchByStageName("PEREMPAT FINAL L2") && renderInteractiveMatchCard("PEREMPAT FINAL L2", "QUARTER L2")}
                      {getMatchByStageName("PEREMPAT FINAL R1") && renderInteractiveMatchCard("PEREMPAT FINAL R1", "QUARTER R1")}
                      {getMatchByStageName("PEREMPAT FINAL R2") && renderInteractiveMatchCard("PEREMPAT FINAL R2", "QUARTER R2")}
                    </div>

                    {/* COL 2: SEMIFINALS */}
                    <div className="flex flex-col justify-around h-full py-4 gap-4 flex-1">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        SEMIFINAL
                      </div>
                      {getMatchByStageName("SEMIFINAL 1") && renderInteractiveMatchCard("SEMIFINAL 1", "SEMI 1")}
                      {getMatchByStageName("SEMIFINAL 2") && renderInteractiveMatchCard("SEMIFINAL 2", "SEMI 2")}
                    </div>

                    {/* COL 3: GRAND FINALS */}
                    <div className="flex flex-col justify-around h-full py-4 gap-4 flex-1">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        FINAL
                      </div>
                      {getMatchByStageName("FINAL") && renderInteractiveMatchCard("FINAL", "FINAL")}
                    </div>
                  </>
                )}

                {reqCapacity === 8 && (
                  <>
                    {/* COL 1: QUARTERFINALS */}
                    <div className="flex flex-col justify-around h-full py-4 gap-4 flex-1">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        BABAK PEREMPAT FINAL
                      </div>
                      {getMatchByStageName("PEREMPAT FINAL L1") && renderInteractiveMatchCard("PEREMPAT FINAL L1", "QUARTER L1")}
                      {getMatchByStageName("PEREMPAT FINAL L2") && renderInteractiveMatchCard("PEREMPAT FINAL L2", "QUARTER L2")}
                      {getMatchByStageName("PEREMPAT FINAL R1") && renderInteractiveMatchCard("PEREMPAT FINAL R1", "QUARTER R1")}
                      {getMatchByStageName("PEREMPAT FINAL R2") && renderInteractiveMatchCard("PEREMPAT FINAL R2", "QUARTER R2")}
                    </div>

                    {/* COL 2: SEMIFINALS */}
                    <div className="flex flex-col justify-around h-full py-4 gap-4 flex-1">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        BABAK SEMIFINAL
                      </div>
                      {getMatchByStageName("SEMIFINAL 1") && renderInteractiveMatchCard("SEMIFINAL 1", "SEMI POL A")}
                      {getMatchByStageName("SEMIFINAL 2") && renderInteractiveMatchCard("SEMIFINAL 2", "SEMI POL B")}
                    </div>

                    {/* COL 3: GRAND FINALS */}
                    <div className="flex flex-col justify-around h-full py-4 gap-4 flex-1">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        BABAK FINAL
                      </div>
                      {getMatchByStageName("FINAL") && renderInteractiveMatchCard("FINAL", "GRAND FINAL")}
                    </div>
                  </>
                )}

                {reqCapacity === 4 && (
                  <>
                    {/* COL 1: SEMIFINALS */}
                    <div className="flex flex-col justify-around h-full py-4 gap-4 flex-1">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        BABAK SEMIFINAL
                      </div>
                      {getMatchByStageName("SEMIFINAL 1") && renderInteractiveMatchCard("SEMIFINAL 1", "SEMI 1")}
                      {getMatchByStageName("SEMIFINAL 2") && renderInteractiveMatchCard("SEMIFINAL 2", "SEMI 2")}
                    </div>

                    {/* COL 2: GRAND FINALS */}
                    <div className="flex flex-col justify-around h-full py-4 gap-4 flex-1">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        BABAK FINAL
                      </div>
                      {getMatchByStageName("FINAL") && renderInteractiveMatchCard("FINAL", "FINAL")}
                    </div>
                  </>
                )}

                {reqCapacity === 2 && (
                  <>
                    {/* COL 1: GRAND FINALS */}
                    <div className="flex flex-col justify-around h-full py-4 gap-4 flex-1">
                      <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5">
                        BABAK FINAL
                      </div>
                      {renderInteractiveMatchCard("FINAL", "FINAL")}
                    </div>
                  </>
                )}

                {/* COL 4 / 3: JUARA TANDING GOLD PODIUM */}
                <div className="flex flex-col justify-center items-center h-full flex-1">
                  <div className="text-[10px] font-sans font-black tracking-wider text-purple-400 uppercase text-center border-b border-purple-950/40 pb-1.5 mb-1.5 w-full">
                    JUARA TANDING
                  </div>
                  <div className="bg-gradient-to-b from-[#21164c] to-[#120a2e] border-2 border-amber-500/40 rounded-3xl p-6 flex flex-col items-center justify-center text-center w-full max-w-[240px] shadow-2xl relative overflow-hidden min-h-[220px]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
                    <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mb-3">
                      <Trophy className="w-8 h-8 text-amber-400 animate-pulse fill-amber-500/10" />
                    </div>
                    <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block">
                      JUARA KELAS
                    </span>
                    <p className="font-sans font-black text-sm uppercase text-white mt-2 leading-snug break-words w-full">
                      {championName || "MENUNGGU PEMENANG..."}
                    </p>
                    <span className="text-[9px] text-slate-400 uppercase font-medium mt-1">
                      {championName ? "POPDA XVII Resmi" : "Menunggu babak final selesai..."}
                    </span>
                  </div>
                </div>

              </div>

              {/* BOTTOM RIGHT FLOATING CONTROLS FOR BRACKET SCREEN */}
              <div className="absolute bottom-6 right-6 flex items-center gap-2.5">
                <button
                  onClick={() => {
                    sound.playClick();
                    setIsBaganControlsVisible(!isBaganControlsVisible);
                  }}
                  className="w-10 h-10 rounded-xl bg-[#140b2e]/90 hover:bg-[#251552] border border-purple-900/60 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
                  title={isBaganControlsVisible ? "Sembunyikan Kontrol" : "Tampilkan Kontrol"}
                >
                  {isBaganControlsVisible ? <Eye className="w-4.5 h-4.5" /> : <EyeOff className="w-4.5 h-4.5 text-rose-400" />}
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    setIsBaganRotated(!isBaganRotated);
                    notifyToast("🔄 Rotasi bagan berhasil diubah!");
                  }}
                  className="px-4 h-10 rounded-xl bg-[#140b2e]/90 hover:bg-[#251552] border border-purple-900/60 flex items-center justify-center gap-1.5 text-slate-300 hover:text-white text-xs font-bold uppercase transition-all cursor-pointer"
                  title="Putar Orientasi Layar"
                >
                  <RotateCw className="w-4 h-4 text-purple-400" />
                  <span>ROTASI LAYAR</span>
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    onToggleFullscreen();
                  }}
                  className="w-10 h-10 rounded-xl bg-[#140b2e]/90 hover:bg-[#251552] border border-purple-900/60 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
                  title={isFullscreen ? "Keluar Layar Penuh" : "Masuk Layar Penuh"}
                >
                  {isFullscreen ? <Minimize2 className="w-4.5 h-4.5" /> : <Maximize2 className="w-4.5 h-4.5 text-purple-400" />}
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* COMPREHENSIVE EDIT ATHLETE MODAL OVERLAY */}
        {editingBaganMatch && (
          <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0e0725] border border-purple-900/60 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative flex flex-col gap-5">
              <div className="flex justify-between items-center border-b border-purple-950 pb-3">
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-amber-400" />
                  <h3 className="font-sans font-black text-sm uppercase text-slate-100 tracking-wide">
                    EDIT PESILAT - {formatPartaiUpper(editingBaganMatch.matchNumber, "00")}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingBaganMatch(null)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg border-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Edit inputs for red and blue fighter */}
              <div className="flex flex-col gap-4">
                {/* RED CORNER */}
                <div className="border border-red-900/40 rounded-2xl p-4 bg-red-950/10 flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">🔴 SUDUT MERAH</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8.5px] uppercase font-bold text-slate-400">Nama Lengkap</label>
                      <input
                        type="text"
                        value={editRedName}
                        onChange={(e) => setEditRedName(e.target.value)}
                        placeholder="Nama Pesilat"
                        className="bg-[#1b0e3b] border border-purple-900/40 rounded-xl px-3 py-2 text-xs uppercase font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8.5px] uppercase font-bold text-slate-400">Kontingen / Club</label>
                      <input
                        type="text"
                        value={editRedClub}
                        onChange={(e) => setEditRedClub(e.target.value)}
                        placeholder="Kontingen"
                        className="bg-[#1b0e3b] border border-purple-900/40 rounded-xl px-3 py-2 text-xs uppercase font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* BLUE CORNER */}
                <div className="border border-blue-900/40 rounded-2xl p-4 bg-blue-950/10 flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">🔵 SUDUT BIRU</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8.5px] uppercase font-bold text-slate-400">Nama Lengkap</label>
                      <input
                        type="text"
                        value={editBlueName}
                        onChange={(e) => setEditBlueName(e.target.value)}
                        placeholder="Nama Pesilat"
                        className="bg-[#1b0e3b] border border-purple-900/40 rounded-xl px-3 py-2 text-xs uppercase font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8.5px] uppercase font-bold text-slate-400">Kontingen / Club</label>
                      <input
                        type="text"
                        value={editBlueClub}
                        onChange={(e) => setEditBlueClub(e.target.value)}
                        placeholder="Kontingen"
                        className="bg-[#1b0e3b] border border-purple-900/40 rounded-xl px-3 py-2 text-xs uppercase font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 justify-end border-t border-purple-950 pt-4 mt-1">
                <button
                  onClick={() => setEditingBaganMatch(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-purple-950 rounded-xl text-xs uppercase font-bold cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  onClick={handleSaveEditingMatch}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs uppercase font-black cursor-pointer border-none shadow-md shadow-emerald-600/10"
                >
                  SIMPAN PERUBAHAN
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };  const handleSetWinnerBaganMatch = async (matchId: string, winnerColor: "MERAH" | "BIRU") => {
    sound.playClick();
    const updatedMatches = schedules.map(m => {
      if (m.id === matchId) {
        return { ...m, status: "SELESAI", winner: winnerColor };
      }
      return m;
    });

    // Automatically propagate the winners to the next stage
    let propagatedMatches = [...updatedMatches];
    
    // SF matches
    const sfA1 = propagatedMatches.find(m => m.id === `m-pa-sf1-${selectedBaganCategory}-${selectedBaganGender}`);
    const sfA2 = propagatedMatches.find(m => m.id === `m-pa-sf2-${selectedBaganCategory}-${selectedBaganGender}`);
    const sfB1 = propagatedMatches.find(m => m.id === `m-pb-sf1-${selectedBaganCategory}-${selectedBaganGender}`);
    const sfB2 = propagatedMatches.find(m => m.id === `m-pb-sf2-${selectedBaganCategory}-${selectedBaganGender}`);
    
    // Finals
    const finalA = propagatedMatches.find(m => m.id === `m-pa-f-${selectedBaganCategory}-${selectedBaganGender}`);
    const finalB = propagatedMatches.find(m => m.id === `m-pb-f-${selectedBaganCategory}-${selectedBaganGender}`);
    const grandFinal = propagatedMatches.find(m => m.id === `m-grand-f-${selectedBaganCategory}-${selectedBaganGender}`);

    if (sfA1 && sfA1.winner && finalA) {
      finalA.fighterRedId = sfA1.winner === "MERAH" ? sfA1.fighterRedId : sfA1.fighterBlueId;
    }
    if (sfA2 && sfA2.winner && finalA) {
      finalA.fighterBlueId = sfA2.winner === "MERAH" ? sfA2.fighterRedId : sfA2.fighterBlueId;
    }
    if (sfB1 && sfB1.winner && finalB) {
      finalB.fighterRedId = sfB1.winner === "MERAH" ? sfB1.fighterRedId : sfB1.fighterBlueId;
    }
    if (sfB2 && sfB2.winner && finalB) {
      finalB.fighterBlueId = sfB2.winner === "MERAH" ? sfB2.fighterRedId : sfB2.fighterBlueId;
    }
    if (finalA && finalA.winner && grandFinal) {
      grandFinal.fighterRedId = finalA.winner === "MERAH" ? finalA.fighterRedId : finalA.fighterBlueId;
    }
    if (finalB && finalB.winner && grandFinal) {
      grandFinal.fighterBlueId = finalB.winner === "MERAH" ? finalB.fighterRedId : finalB.fighterBlueId;
    }

    try {
      const res = await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: categories,
          newParticipants: participants,
          newMatches: propagatedMatches
        })
      });

      if (res.ok) {
        notifyToast("🏆 Pemenang bagan diperbarui & slot peserta lolos otomatis!");
        fetchSchedules();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getBaganAthlete = (index: number, pool: "A" | "B") => {
    const poolPart = participants.filter(
      p => p.categoryClassId === selectedBaganCategory && p.gender === selectedBaganGender
    );
    const poolList = pool === "A" ? poolPart.slice(0, 4) : poolPart.slice(4, 8);
    return poolList[index] || null;
  };

  const resolveFighterName = (stage: string, role: "RED" | "BLUE"): string => {
    const m = schedules.find(
      match => match.categoryClassId === selectedBaganCategory && 
               match.gender === selectedBaganGender && 
               match.stage === stage
    );
    
    if (!m) {
      if (stage === "SEMIFINAL A1" || stage === "PEREMPAT FINAL L1") {
        const ath = getBaganAthlete(role === "RED" ? 0 : 1, "A");
        return ath ? ath.name : `SLOT L1`;
      }
      if (stage === "SEMIFINAL A2" || stage === "PEREMPAT FINAL L2") {
        const ath = getBaganAthlete(role === "RED" ? 2 : 3, "A");
        return ath ? ath.name : `SLOT L2`;
      }
      if (stage === "SEMIFINAL B1" || stage === "PEREMPAT FINAL R1") {
        const ath = getBaganAthlete(role === "RED" ? 0 : 1, "B");
        return ath ? ath.name : `SLOT R1`;
      }
      if (stage === "SEMIFINAL B2" || stage === "PEREMPAT FINAL R2") {
        const ath = getBaganAthlete(role === "RED" ? 2 : 3, "B");
        return ath ? ath.name : `SLOT R2`;
      }
      if (stage === "FINAL POL A" || stage === "SEMIFINAL 1") {
        return `Pemenang L${role === "RED" ? "1" : "2"}`;
      }
      if (stage === "FINAL POL B" || stage === "SEMIFINAL 2") {
        return `Pemenang R${role === "RED" ? "1" : "2"}`;
      }
      if (stage === "GRAND FINAL" || stage === "FINAL") {
        return `Pemenang Semi ${role === "RED" ? "1" : "2"}`;
      }
      return "";
    }

    const fId = role === "RED" ? m.fighterRedId : m.fighterBlueId;
    if (!fId) return "KOSONG";

    const resolveFighterIdToName = (idVal: string): string => {
      if (!idVal) return "KOSONG";
      if (idVal.startsWith("winner-")) {
        const targetId = idVal.replace("winner-", "");
        let targetMatch = schedules.find(x => x.id === targetId);
        if (!targetMatch) {
          let targetStage = "";
          if (targetId === "pa-sf1") targetStage = getBaganStageName("SF_A1");
          else if (targetId === "pa-sf2") targetStage = getBaganStageName("SF_A2");
          else if (targetId === "pb-sf1") targetStage = getBaganStageName("SF_B1");
          else if (targetId === "pb-sf2") targetStage = getBaganStageName("SF_B2");
          else if (targetId === "pa-f") targetStage = getBaganStageName("F_A");
          else if (targetId === "pb-f") targetStage = getBaganStageName("F_B");

          if (targetStage) {
            targetMatch = schedules.find(
              x => x.categoryClassId === selectedBaganCategory && 
                   x.gender === selectedBaganGender && 
                   x.stage === targetStage
            );
          }
        }

        if (targetMatch) {
          if (targetMatch.status === "SELESAI" && targetMatch.winner) {
            const nextId = targetMatch.winner === "MERAH" ? targetMatch.fighterRedId : targetMatch.fighterBlueId;
            return resolveFighterIdToName(nextId);
          }
          return `PMNG ${targetMatch.matchNumber || targetMatch.stage}`;
        }
        return "PEMENANG";
      }
      
      if (idVal.startsWith("placeholder-") || idVal === "BYE") {
        if (idVal.includes("-bye") || idVal === "BYE") {
          return "BYE (MENUNGGU)";
        }
        return "KOSONG";
      }

      return getParticipantName(idVal);
    };

    return resolveFighterIdToName(fId);
  };

  const resolveFighterClub = (stage: string, role: "RED" | "BLUE"): string => {
    const m = schedules.find(
      match => match.categoryClassId === selectedBaganCategory && 
               match.gender === selectedBaganGender && 
               match.stage === stage
    );
    if (!m) {
      if (stage === "SEMIFINAL A1" || stage === "PEREMPAT FINAL L1") {
        const ath = getBaganAthlete(role === "RED" ? 0 : 1, "A");
        return ath ? ath.club : "";
      }
      if (stage === "SEMIFINAL A2" || stage === "PEREMPAT FINAL L2") {
        const ath = getBaganAthlete(role === "RED" ? 2 : 3, "A");
        return ath ? ath.club : "";
      }
      if (stage === "SEMIFINAL B1" || stage === "PEREMPAT FINAL R1") {
        const ath = getBaganAthlete(role === "RED" ? 0 : 1, "B");
        return ath ? ath.club : "";
      }
      if (stage === "SEMIFINAL B2" || stage === "PEREMPAT FINAL R2") {
        const ath = getBaganAthlete(role === "RED" ? 2 : 3, "B");
        return ath ? ath.club : "";
      }
      return "";
    }
    const fId = role === "RED" ? m.fighterRedId : m.fighterBlueId;
    if (!fId) return "";

    const resolveFighterIdToClub = (idVal: string): string => {
      if (!idVal) return "";
      if (idVal.startsWith("winner-")) {
        const targetId = idVal.replace("winner-", "");
        let targetMatch = schedules.find(x => x.id === targetId);
        if (!targetMatch) {
          let targetStage = "";
          if (targetId === "pa-sf1") targetStage = getBaganStageName("SF_A1");
          else if (targetId === "pa-sf2") targetStage = getBaganStageName("SF_A2");
          else if (targetId === "pb-sf1") targetStage = getBaganStageName("SF_B1");
          else if (targetId === "pb-sf2") targetStage = getBaganStageName("SF_B2");
          else if (targetId === "pa-f") targetStage = getBaganStageName("F_A");
          else if (targetId === "pb-f") targetStage = getBaganStageName("F_B");

          if (targetStage) {
            targetMatch = schedules.find(
              x => x.categoryClassId === selectedBaganCategory && 
                   x.gender === selectedBaganGender && 
                   x.stage === targetStage
            );
          }
        }
        if (targetMatch && targetMatch.status === "SELESAI" && targetMatch.winner) {
          const nextId = targetMatch.winner === "MERAH" ? targetMatch.fighterRedId : targetMatch.fighterBlueId;
          return resolveFighterIdToClub(nextId);
        }
        return "";
      }
      if (idVal.startsWith("placeholder-")) return "";
      return getParticipantClub(idVal);
    };

    return resolveFighterIdToClub(fId);
  };

  const getBaganWinnerNameByStage = (stageName: string): string => {
    const m = schedules.find(
      match => match.categoryClassId === selectedBaganCategory && 
               match.gender === selectedBaganGender && 
               match.stage === stageName
    );
    if (!m || m.status !== "SELESAI" || !m.winner) return "";
    
    const idVal = m.winner === "MERAH" ? m.fighterRedId : m.fighterBlueId;
    
    const resolveFighterIdToName = (idVal: string): string => {
      if (!idVal) return "";
      if (idVal.startsWith("winner-")) {
        const targetId = idVal.replace("winner-", "");
        let targetMatch = schedules.find(x => x.id === targetId);
        if (!targetMatch) {
          let targetStage = "";
          if (targetId === "pa-sf1") targetStage = getBaganStageName("SF_A1");
          else if (targetId === "pa-sf2") targetStage = getBaganStageName("SF_A2");
          else if (targetId === "pb-sf1") targetStage = getBaganStageName("SF_B1");
          else if (targetId === "pb-sf2") targetStage = getBaganStageName("SF_B2");
          else if (targetId === "pa-f") targetStage = getBaganStageName("F_A");
          else if (targetId === "pb-f") targetStage = getBaganStageName("F_B");
          
          if (targetStage) {
            targetMatch = schedules.find(
              x => x.categoryClassId === selectedBaganCategory && 
                   x.gender === selectedBaganGender && 
                   x.stage === targetStage
            );
          }
        }
        if (targetMatch && targetMatch.status === "SELESAI" && targetMatch.winner) {
          return resolveFighterIdToName(targetMatch.winner === "MERAH" ? targetMatch.fighterRedId : targetMatch.fighterBlueId);
        }
        return "";
      }
      if (idVal.startsWith("placeholder-")) return "";
      return getParticipantName(idVal);
    };

    return resolveFighterIdToName(idVal);
  };

  const downloadBaganPdf = () => {
    sound.playClick();
    if (!selectedBaganCategory) {
      alert("⚠️ Validasi Gagal: Silakan pilih kelas tanding terlebih dahulu pada panel kategori tanding sebelah kiri!");
      return;
    }
    const cat = categories.find(c => c.id === selectedBaganCategory);
    const catName = cat ? cat.name.toUpperCase() : "KELAS TANDING";

    const filteredPart = participants.filter(
      p => p.categoryClassId === selectedBaganCategory && p.gender === selectedBaganGender
    );
    if (filteredPart.length === 0) {
      alert(`⚠️ Data Atlet Kosong: Tidak dapat mengunduh bagan karena data atlet untuk kategori ${catName} (${selectedBaganGender}) masih kosong.\n\nSilakan daftarkan atlet terlebih dahulu di menu "Input Registrasi" agar bagan dapat terbentuk secara otomatis!`);
      return;
    }

    const currentBaganMatches = schedules.filter(
      m => m.categoryClassId === selectedBaganCategory && m.gender === selectedBaganGender
    );
    if (currentBaganMatches.length === 0) {
      alert(`⚠️ Bagan Belum Terbentuk: Bagan pertandingan untuk kategori ${catName} (${selectedBaganGender}) belum digenerate oleh sistem.\n\nSilakan hubungi admin atau pastikan atlet sudah didaftarkan pada kelas tanding ini agar bagan dapat digenerate secara otomatis!`);
      return;
    }

    autoResolveWinnersIntoSchedule();
    setOverlaySelectedStage("ALL");
    setShowBaganDownloadOverlay(true);
    notifyToast("🖨️ Silakan pilih tahapan bagan yang ingin dicetak.");
  };

  const executeDownloadBaganPdf = (targetStage: string = "ALL") => {
    sound.playClick();

    if (!selectedBaganCategory) {
      alert("⚠️ Validasi Gagal: Silakan pilih kelas tanding terlebih dahulu pada panel kategori tanding sebelah kiri!");
      return;
    }
    const cat = categories.find(c => c.id === selectedBaganCategory);
    const catName = cat ? cat.name.toUpperCase() : "KELAS TANDING";

    const filteredPart = participants.filter(
      p => p.categoryClassId === selectedBaganCategory && p.gender === selectedBaganGender
    );
    if (filteredPart.length === 0) {
      alert(`⚠️ Data Atlet Kosong: Tidak dapat mengunduh bagan karena data atlet untuk kategori ${catName} (${selectedBaganGender}) masih kosong.\n\nSilakan daftarkan atlet terlebih dahulu di menu "Input Registrasi" agar bagan dapat terbentuk secara otomatis!`);
      return;
    }

    const currentBaganMatches = schedules.filter(
      m => m.categoryClassId === selectedBaganCategory && m.gender === selectedBaganGender
    );
    if (currentBaganMatches.length === 0) {
      alert(`⚠️ Bagan Belum Terbentuk: Bagan pertandingan untuk kategori ${catName} (${selectedBaganGender}) belum digenerate oleh sistem.\n\nSilakan hubungi admin atau pastikan atlet sudah didaftarkan pada kelas tanding ini agar bagan dapat digenerate secara otomatis!`);
      return;
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // Draw logos left and right
    drawLogoPdf(doc, logoLeftLocal || "/logo_panel_dewan.svg", 15, 10, 15);
    drawLogoPdf(doc, logoRightLocal || "/logo_panel_dewan.svg", 267, 10, 15);

    // Header titles
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text((eventName || "PEKAN OLAHRAGA PELAJAR DAERAH (POPDA) XVII").toUpperCase(), 148.5, 14, { align: "center" });

    doc.setFontSize(10.5);
    const subHeader = `KARTU BAGAN PERTANDINGAN RESMI  |  ${(tempatPelaksanaan || "IDI RAYEUK").toUpperCase()} - ${(waktuPelaksanaan || "07 S.D 12 JULI 2024").toUpperCase()}`;
    doc.text(subHeader, 148.5, 19, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text("PENGURUS PROVINSI IKATAN PENCAK SILAT INDONESIA", 148.5, 23.5, { align: "center" });

    // Double header line divider
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(15, 27, 282, 27);
    doc.setLineWidth(0.3);
    doc.line(15, 28.2, 282, 28.2);

    // Category Banner Rect
    doc.setFillColor(230, 230, 230);
    doc.rect(15, 31, 267, 7, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    const schemeText = baganSchemeType === "SINGLE_NO_POOL" ? "(SISTEM GUGUR TUNGGAL)" : "(POL A & POL B)";
    doc.text(`BAGAN PERTANDINGAN: ${catName} - ${selectedBaganGender} ${schemeText}`, 148.5, 36, { align: "center" });

    // Dynamic round calculations
    const getMatchRoundNumber = (m: any): number => {
      const matchRoundMatch = m.id?.match(/-r(\d+)-/);
      if (matchRoundMatch) {
        return parseInt(matchRoundMatch[1], 10);
      }
      const stage = m.stage?.toUpperCase() || "";
      if (stage === "FINAL" || stage === "GRAND FINAL" || stage === "GRANDFINAL") return 3;
      if (stage.includes("SEMIFINAL") || stage === "FINAL POL A" || stage === "FINAL POL B") return 2;
      if (stage.includes("PEREMPAT") || stage.includes("SEMIFINAL A") || stage.includes("SEMIFINAL B")) return 1;
      return 1;
    };

    const maxRound = Math.max(...currentBaganMatches.map(getMatchRoundNumber), 1);

    // Determine the max K (number of matches in any round)
    let maxK = 1;
    for (let r = 1; r <= maxRound; r++) {
      const roundMatches = currentBaganMatches.filter(m => getMatchRoundNumber(m) === r);
      if (roundMatches.length > maxK) maxK = roundMatches.length;
    }

    // Determine card box dimension and fonts dynamically to avoid overflow on A4 landscape
    let boxH = 15;
    let athleteFontSize = 7.0;
    let titleFontSize = 5.5;
    if (maxK > 8) {
      boxH = 7.0;
      athleteFontSize = 4.5;
      titleFontSize = 3.5;
    } else if (maxK > 4) {
      boxH = 10.5;
      athleteFontSize = 5.8;
      titleFontSize = 4.5;
    }

    // Draw Column Headers dynamically
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);

    const startX = 15;
    const endX = 282;
    const printableW = endX - startX; // 267
    const colGap = 8;
    const colWidth = (printableW - (maxRound - 1) * colGap) / maxRound;

    for (let r = 1; r <= maxRound; r++) {
      let roundLabel = `BABAK ${r}`;
      if (r === maxRound) {
        roundLabel = baganSchemeType === "SINGLE_NO_POOL" ? "FINAL" : "GRAND FINAL";
      } else if (r === maxRound - 1) {
        roundLabel = baganSchemeType === "SINGLE_NO_POOL" ? "SEMIFINAL" : "FINAL POL A/B";
      } else if (r === maxRound - 2) {
        roundLabel = baganSchemeType === "SINGLE_NO_POOL" ? "PEREMPAT FINAL" : "SEMIFINAL POL A/B";
      } else {
        roundLabel = `PENYISIHAN (R${Math.pow(2, maxRound - r + 1)})`;
      }
      
      const colX = startX + (r - 1) * (colWidth + colGap);
      doc.text(roundLabel, colX + colWidth / 2, 45, { align: "center" });
    }

    const heightSpan = 115;
    const startY = 49;
    const matchCoords: { [matchId: string]: { x: number; y: number } } = {};

    // Helper to evaluate highlight status
    const isStageSelected = (headerText: string) => {
      if (targetStage === "ALL") return true;
      const comp = headerText.toUpperCase();
      const sel = targetStage.toUpperCase();
      
      if (sel === "PENYISIHAN") {
        return comp.includes("PENYISIHAN") || comp.includes("L1") || comp.includes("L2") || comp.includes("R1") || comp.includes("R2");
      }
      if (sel === "PEREMPAT FINAL") {
        return comp.includes("PEREMPAT") || comp.includes("ROUND OF 8");
      }
      if (sel === "SEMIFINAL") {
        return comp.includes("SEMIFINAL") || comp.includes("POL A") || comp.includes("POL B") || comp.includes("SEMI");
      }
      if (sel === "FINAL") {
        return comp === "FINAL" || comp.includes("GRAND FINAL") || comp.includes("UTAMA") || comp.includes("FINAL MATCH");
      }
      return comp.includes(sel);
    };

    // Draw matches for each round column
    for (let r = 1; r <= maxRound; r++) {
      const colX = startX + (r - 1) * (colWidth + colGap);
      const roundMatches = currentBaganMatches.filter(m => getMatchRoundNumber(m) === r);
      
      // Expected slot count for this round
      const K = Math.pow(2, maxRound - r);

      roundMatches.forEach((m, mIdx) => {
        const matchIdxMatch = m.id?.match(/-r\d+-(\d+)/);
        const idx = matchIdxMatch ? parseInt(matchIdxMatch[1], 10) : mIdx;

        // Calculate orthogonal Y centering
        const y = startY + ((idx + 0.5) * (heightSpan / K)) - boxH / 2;
        matchCoords[m.id] = { x: colX, y };

        const stageNameStr = m.stage || `ROUND ${r}`;
        const isFocused = isStageSelected(stageNameStr);

        const redName = getParticipantName(m.fighterRedId) || "BELUM ADA ATLET";
        const redClub = getParticipantClub(m.fighterRedId) || "";
        const blueName = getParticipantName(m.fighterBlueId) || "BELUM ADA ATLET";
        const blueClub = getParticipantClub(m.fighterBlueId) || "";

        const partaiNo = m.matchNumber || `P${mIdx + 1}`;

        // Draw match header label
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(titleFontSize);
        if (isFocused) {
          doc.setTextColor(30, 41, 59);
        } else {
          doc.setTextColor(180, 180, 180);
        }
        doc.text(`PARTAI ${partaiNo} - ${stageNameStr}`, colX + 1, y - 1.2);

        // Draw box card boundary
        if (isFocused) {
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(maxK > 8 ? 0.2 : 0.35);
        } else {
          doc.setDrawColor(225, 225, 225);
          doc.setLineWidth(0.15);
        }
        doc.setFillColor(255, 255, 255);
        doc.rect(colX, y, colWidth, boxH, "FD");

        // Middle dividing line inside box
        if (isFocused) {
          doc.setDrawColor(180, 180, 180);
        } else {
          doc.setDrawColor(240, 240, 240);
        }
        doc.line(colX, y + boxH / 2, colX + colWidth, y + boxH / 2);

        // RED marker strip
        if (isFocused) {
          doc.setFillColor(225, 29, 72);
        } else {
          doc.setFillColor(244, 150, 160);
        }
        doc.rect(colX + 0.6, y + 0.6, 1.2, boxH / 2 - 1.2, "F");

        // BLUE marker strip
        if (isFocused) {
          doc.setFillColor(37, 99, 235);
        } else {
          doc.setFillColor(150, 180, 245);
        }
        doc.rect(colX + 0.6, y + boxH / 2 + 0.6, 1.2, boxH / 2 - 1.2, "F");

        // RED Athlete Text
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(athleteFontSize);
        if (isFocused) {
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setTextColor(180, 180, 180);
        }
        
        const redTextY = y + boxH * 0.28;
        const redClubY = y + boxH * 0.44;
        const blueTextY = y + boxH * 0.78;
        const blueClubY = y + boxH * 0.94;

        doc.text(redName, colX + 3, redTextY);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(athleteFontSize - 1.5);
        if (isFocused) {
          doc.setTextColor(80, 80, 80);
        } else {
          doc.setTextColor(190, 190, 190);
        }
        if (boxH > 10) {
          doc.text(redClub || "-", colX + 3, redClubY);
        }

        // BLUE Athlete Text
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(athleteFontSize);
        if (isFocused) {
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setTextColor(180, 180, 180);
        }
        doc.text(blueName, colX + 3, blueTextY);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(athleteFontSize - 1.5);
        if (isFocused) {
          doc.setTextColor(80, 80, 80);
        } else {
          doc.setTextColor(190, 190, 190);
        }
        if (boxH > 10) {
          doc.text(blueClub || "-", colX + 3, blueClubY);
        }

        // Winner Badge overlay
        if (m.status === "SELESAI" && m.winner && isFocused) {
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(athleteFontSize - 2);
          doc.setFillColor(254, 240, 138);
          doc.setDrawColor(234, 179, 8);
          doc.setLineWidth(0.1);
          
          const badgeW = colWidth > 50 ? 11 : 8;
          const badgeX = colX + colWidth - badgeW - 1.5;
          const badgeY = y + (m.winner === "MERAH" ? (boxH * 0.1) : (boxH * 0.6));
          const badgeH = boxH * 0.3;

          doc.rect(badgeX, badgeY, badgeW, badgeH, "FD");
          doc.setTextColor(133, 77, 14);
          doc.text("MENANG", badgeX + 0.6, badgeY + badgeH * 0.75);
        }
      });
    }

    // Draw connection lines between columns
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);

    for (let r = 1; r < maxRound; r++) {
      const colXNext = startX + r * (colWidth + colGap);
      const roundMatches = currentBaganMatches.filter(m => getMatchRoundNumber(m) === r);
      const nextRoundMatches = currentBaganMatches.filter(m => getMatchRoundNumber(m) === r + 1);

      roundMatches.forEach((m) => {
        const matchIdxMatch = m.id?.match(/-r\d+-(\d+)/);
        const idx = matchIdxMatch ? parseInt(matchIdxMatch[1], 10) : 0;
        const parentIdx = Math.floor(idx / 2);

        const parentMatch = nextRoundMatches.find(pm => {
          const pmIdxMatch = pm.id?.match(/-r\d+-(\d+)/);
          const pmIdx = pmIdxMatch ? parseInt(pmIdxMatch[1], 10) : 0;
          return pmIdx === parentIdx;
        });

        if (matchCoords[m.id]) {
          const x1 = matchCoords[m.id].x + colWidth;
          const y1 = matchCoords[m.id].y + boxH / 2;

          let y2 = y1;
          let x2 = colXNext;
          if (parentMatch && matchCoords[parentMatch.id]) {
            y2 = matchCoords[parentMatch.id].y + boxH / 2;
          }

          // Draw orthogonal connection lines
          doc.line(x1, y1, x1 + colGap / 2, y1);
          doc.line(x1 + colGap / 2, y1, x1 + colGap / 2, y2);
          doc.line(x1 + colGap / 2, y2, x2, y2);
        }
      });
    }

    // Draw Champion badge at the bottom if complete
    const lastRoundMatches = currentBaganMatches.filter(m => getMatchRoundNumber(m) === maxRound);
    if (lastRoundMatches.length > 0) {
      const finalMatch = lastRoundMatches[0];
      if (finalMatch.status === "SELESAI" && finalMatch.winner) {
        const winnerId = finalMatch.winner === "MERAH" ? finalMatch.fighterRedId : finalMatch.fighterBlueId;
        const winnerName = getParticipantName(winnerId);
        
        const finalColX = startX + (maxRound - 1) * (colWidth + colGap);
        const badgeX = Math.max(15, finalColX + colWidth / 2 - 37.5);
        const badgeW = 75;

        doc.setFillColor(254, 249, 195);
        doc.setDrawColor(234, 179, 8);
        doc.setLineWidth(0.4);
        doc.roundedRect(badgeX, 168, badgeW, 13, 2, 2, "FD");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(133, 77, 14);
        doc.text("🏆 JUARA UTAMA CHAMPION 🏆", badgeX + badgeW / 2, 172.0, { align: "center" });

        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        doc.text(winnerName.toUpperCase(), badgeX + badgeW / 2, 177.5, { align: "center" });
      }
    }

    // Signatures blocks
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    // Left block
    doc.text("Mengetahui,", 45, 172, { align: "center" });
    doc.setFont("Helvetica", "bold");
    doc.text("Ketua Pertandingan Pencak Silat", 45, 176, { align: "center" });
    doc.line(15, 194, 75, 194);
    if (namaKetuaPertandingan) {
      doc.text(namaKetuaPertandingan.toUpperCase(), 45, 198, { align: "center" });
    } else {
      doc.setFont("Helvetica", "normal");
      doc.text("(............................................................)", 45, 198, { align: "center" });
    }

    // Right block
    const dateStr = tanggalCetakDokumen || "01 JULI 2026";
    const placeStr = namaDaerahCetak || "IDI RAYEUK";
    doc.setFont("Helvetica", "normal");
    doc.text(`${placeStr.toUpperCase()}, ${dateStr.toUpperCase()}`, 235, 172, { align: "center" });
    doc.setFont("Helvetica", "bold");
    doc.text("Sekretaris Pertandingan", 235, 176, { align: "center" });
    doc.line(205, 194, 265, 194);
    if (namaSekretarisPertandingan) {
      doc.text(namaSekretarisPertandingan.toUpperCase(), 235, 198, { align: "center" });
    } else {
      doc.setFont("Helvetica", "normal");
      doc.text("(............................................................)", 235, 198, { align: "center" });
    }

    // Prompt user download
    const filename = `Bagan_Pertandingan_${catName.replace(/\s+/g, "_")}_${selectedBaganGender}.pdf`;
    doc.save(filename);
    notifyToast(`🎉 Bagan ${catName} (${selectedBaganGender}) berhasil diunduh!`);
  };

  const renderFloatingToast = () => {
    if (!infoMsg) return null;
    const isError = infoMsg.toUpperCase().includes("GAGAL") || infoMsg.toUpperCase().includes("ERROR") || infoMsg.includes("❌");
    return (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999999] w-[95%] max-w-md pointer-events-none animate-slideDown">
        <div className={`p-4 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] border pointer-events-auto flex items-center gap-3 bg-[#0c051a]/95 backdrop-blur-md ${
          isError ? "border-rose-500/60 text-rose-100" : "border-emerald-500/60 text-emerald-100"
        }`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isError ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
          }`}>
            {isError ? (
              <AlertCircle className="w-5.5 h-5.5 animate-bounce" />
            ) : (
              <CheckCircle className="w-5.5 h-5.5 animate-pulse" />
            )}
          </div>
          <div className="flex-grow font-sans font-black text-xs uppercase tracking-wider leading-snug">
            {infoMsg}
          </div>
          <button 
            onClick={() => { sound.playClick(); setInfoMsg(null); }}
            className="text-slate-400 hover:text-slate-100 duration-150 p-1.5 hover:bg-white/5 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Export Athletes to Excel
  const exportAthletesToExcel = (participantsList: any[]) => {
    const data = participantsList.map((p, index) => {
      const classObj = categories.find(c => c.id === p.categoryClassId);
      return {
        "NO": index + 1,
        "NAMA ATLIT": p.name,
        "KONTINGEN": p.club,
        "GENDER": p.gender,
        "KELAS TANDING": classObj ? classObj.name : p.categoryClassId,
        "KATEGORI USIA": classObj?.division || "DEWASA",
        "BERAT BADAN (KG)": p.weight,
        "GELANGGANG": p.arena || p.gelanggang || "GELANGGANG A"
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Daftar Atlit");
    XLSX.writeFile(workbook, "Daftar_Atlit_Registrasi.xlsx");
    notifyToast("📊 Berhasil mengekspor data atlit ke Excel!");
  };

  // Export Bagan to Excel
  const exportBaganToExcel = (matchesList: any[]) => {
    const data = matchesList.map((m, index) => {
      const classObj = categories.find(c => c.id === m.categoryClassId);
      return {
        "NO": index + 1,
        "KELAS TANDING": classObj ? classObj.name : m.categoryClassId,
        "GENDER": m.gender,
        "BABAK/TAHAPAN": m.stage,
        "PARTAI": m.matchNumber ? formatPartaiDisplay(m.matchNumber) : "-",
        "SUDUT MERAH": getParticipantName(m.fighterRedId),
        "KONTINGEN MERAH": getParticipantClub(m.fighterRedId),
        "SUDUT BIRU": getParticipantName(m.fighterBlueId),
        "KONTINGEN BIRU": getParticipantClub(m.fighterBlueId),
        "STATUS": m.status || "BELUM"
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bagan Pertandingan");
    XLSX.writeFile(workbook, "Bagan_Pertandingan.xlsx");
    notifyToast("📊 Berhasil mengekspor bagan ke Excel!");
  };

  // Export Schedule to Excel
  const exportScheduleToExcel = (matchesList: any[]) => {
    const checkedMatches = matchesList.filter(m => m.matchNumber);
    const sorted = [...checkedMatches].sort((a, b) => {
      const numA = parseInt(a.matchNumber.replace(/\D/g, "") || "9999");
      const numB = parseInt(b.matchNumber.replace(/\D/g, "") || "9999");
      return numA - numB;
    });
    const data = sorted.map((m, index) => {
      const classObj = categories.find(c => c.id === m.categoryClassId);
      return {
        "PARTAI": formatPartaiDisplay(m.matchNumber),
        "KELAS TANDING": classObj ? classObj.name : m.categoryClassId,
        "GENDER": m.gender,
        "BABAK/TAHAPAN": m.stage,
        "SUDUT MERAH": getParticipantName(m.fighterRedId),
        "KONTINGEN MERAH": getParticipantClub(m.fighterRedId),
        "SUDUT BIRU": getParticipantName(m.fighterBlueId),
        "KONTINGEN BIRU": getParticipantClub(m.fighterBlueId),
        "STATUS": m.status || "BELUM"
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jadwal Pertandingan");
    XLSX.writeFile(workbook, "Jadwal_Pertandingan.xlsx");
    notifyToast("📊 Berhasil mengekspor jadwal pertandingan ke Excel!");
  };

  // PDF Export for Athletes
  const downloadParticipantsPdf = () => {
    sound.playClick();
    if (participants.length === 0) {
      alert("Belum ada data atlet yang terdaftar untuk diunduh!");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const PARTICIPANTS_PER_PAGE = 24;
    const totalPages = Math.ceil(participants.length / PARTICIPANTS_PER_PAGE) || 1;

    for (let pNum = 1; pNum <= totalPages; pNum++) {
      if (pNum > 1) {
        doc.addPage();
      }

      // Draw custom margins and official logo Kop
      drawLogoPdf(doc, logoLeftLocal || "/logo_panel_dewan.svg", 15, 10, 15);
      drawLogoPdf(doc, logoRightLocal || "/logo_panel_dewan.svg", 180, 10, 15);

      // Center title text
      let textCursorY = 13;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text((eventName || "PEKAN OLAHRAGA PELAJAR DAERAH (POPDA) XVII").toUpperCase(), 105, textCursorY, { align: "center" });
      textCursorY += 5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(50, 60, 75);
      const subTitle = `DAFTAR REKONSILIASI REGISTRASI ATLET  |  ${(tempatPelaksanaan || "IDI RAYEUK").toUpperCase()} - ${(waktuPelaksanaan || "07 S.D 12 JULI 2024").toUpperCase()}`;
      doc.text(subTitle, 105, textCursorY, { align: "center" });
      textCursorY += 4.5;

      // Double divider line
      const lineY = textCursorY - 1.5;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.line(15, lineY, 195, lineY);
      doc.setLineWidth(0.2);
      doc.line(15, lineY + 1.2, 195, lineY + 1.2);

      // Print Date Info
      const printDateY = lineY + 5;
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 100, 100);
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString("id-ID")} | Halaman ${pNum} dari ${totalPages}`, 15, printDateY);

      // Table Header
      const headerY = printDateY + 3;
      
      doc.setFillColor(74, 24, 122); // Elegant Purple
      doc.rect(15, headerY, 180, 8, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text("NO", 20.5, headerY + 5.5, { align: "center" });
      doc.text("NAMA ATLET", 50, headerY + 5.5, { align: "center" });
      doc.text("KONTINGEN / CLUB", 98, headerY + 5.5, { align: "center" });
      doc.text("GENDER", 132, headerY + 5.5, { align: "center" });
      doc.text("KELAS", 151, headerY + 5.5, { align: "center" });
      doc.text("GLG", 168, headerY + 5.5, { align: "center" });
      doc.text("USIA", 185, headerY + 5.5, { align: "center" });

      // Outlines for header
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(15, headerY, 195, headerY);
      doc.line(15, headerY + 8, 195, headerY + 8);

      const startIdx = (pNum - 1) * PARTICIPANTS_PER_PAGE;
      const pageParticipants = participants.slice(startIdx, startIdx + PARTICIPANTS_PER_PAGE);

      const startRowsY = headerY + 8;
      pageParticipants.forEach((p, rIdx) => {
        const rowY = startRowsY + (rIdx * 8);

        // Draw Row Border
        doc.setDrawColor(200, 200, 200);
        doc.line(15, rowY + 8, 195, rowY + 8);

        // Draw vertical column grids
        doc.setDrawColor(0, 0, 0);
        doc.line(15, rowY, 15, rowY + 8);
        doc.line(26, rowY, 26, rowY + 8);
        doc.line(75, rowY, 75, rowY + 8);
        doc.line(122, rowY, 122, rowY + 8);
        doc.line(142, rowY, 142, rowY + 8);
        doc.line(160, rowY, 160, rowY + 8);
        doc.line(176, rowY, 176, rowY + 8);
        doc.line(195, rowY, 195, rowY + 8);

        const globalNum = startIdx + rIdx + 1;
        const classObj = categories.find(c => c.id === p.categoryClassId);
        const arenaShort = (p.arena || p.gelanggang || "GLG A").replace("GELANGGANG ", "GLG ");

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);

        doc.text(String(globalNum), 20.5, rowY + 5.5, { align: "center" });
        doc.text((p.name || "").toUpperCase().slice(0, 26), 28, rowY + 5.5);
        doc.text((p.club || "").toUpperCase().slice(0, 22), 77, rowY + 5.5);
        doc.text((p.gender || "PUTRA").toUpperCase().slice(0, 5), 132, rowY + 5.5, { align: "center" });
        doc.text(((classObj ? classObj.name : p.categoryClassId) || "").toUpperCase().replace(/kelas\s*/gi, "").slice(0, 8), 151, rowY + 5.5, { align: "center" });
        doc.text(arenaShort.slice(0, 7), 168, rowY + 5.5, { align: "center" });
        doc.text(((classObj?.division || "DEWASA") || "").toUpperCase().slice(0, 8), 185, rowY + 5.5, { align: "center" });
      });

      const isLastPage = pNum === totalPages;
      if (isLastPage) {
        const lastRowY = startRowsY + (pageParticipants.length * 8);
        
        // Signature block
        const sigY = lastRowY + 15;
        if (sigY + 35 > 285) {
          doc.addPage();
          drawLogoPdf(doc, logoLeftLocal || "/logo_panel_dewan.svg", 15, 10, 15);
          drawLogoPdf(doc, logoRightLocal || "/logo_panel_dewan.svg", 180, 10, 15);
          
          let sigHeaderY = 15;
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(10);
          doc.text("LEMBAR PENGESAHAN DAFTAR REKONSILIASI ATLET REGISTRASI RESMI", 105, sigHeaderY, { align: "center" });
          doc.line(15, sigHeaderY + 5, 195, sigHeaderY + 5);
          
          const finalSigY = 45;
          drawScheduleSignatures(doc, finalSigY);
        } else {
          drawScheduleSignatures(doc, sigY);
        }
      }
    }

    doc.save("Daftar_Atlit_Registrasi_Resmi.pdf");
    notifyToast("📥 Daftar Atlet PDF Resmi berhasil diunduh!");
  };

  // Toggle match in schedule with sequential re-indexing
  const handleToggleMatchInSchedule = async (matchId: string) => {
    sound.playClick();
    
    const targetMatch = schedules.find(m => m.id === matchId);
    if (!targetMatch) return;

    let updatedMatches = [...schedules];
    
    if (targetMatch.matchNumber) {
      updatedMatches = updatedMatches.map(m => {
        if (m.id === matchId) {
          return { ...m, matchNumber: "" };
        }
        return m;
      });
    } else {
      const activeNums = schedules
        .map(m => parseInt(m.matchNumber || ""))
        .filter(n => !isNaN(n));
      const nextNum = activeNums.length > 0 ? Math.max(...activeNums) + 1 : 1;

      updatedMatches = updatedMatches.map(m => {
        if (m.id === matchId) {
          return { ...m, matchNumber: String(nextNum) };
        }
        return m;
      });
    }

    const checkedMatches = updatedMatches
      .filter(m => m.matchNumber)
      .sort((a, b) => {
        const numA = parseInt(a.matchNumber || "9999");
        const numB = parseInt(b.matchNumber || "9999");
        return numA - numB;
      });

    const checkedIds = new Set(checkedMatches.map(m => m.id));

    updatedMatches = updatedMatches.map(m => {
      if (checkedIds.has(m.id)) {
        const idx = checkedMatches.findIndex(cm => cm.id === m.id);
        return { ...m, matchNumber: String(idx + 1) };
      }
      return { ...m, matchNumber: "" };
    });

    setSchedules(updatedMatches);

    try {
      await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: categories,
          newParticipants: participants,
          newMatches: updatedMatches
        })
      });
      notifyToast("🔄 Jadwal Partai diperbarui!");
      fetchSchedules();
    } catch (err) {
      console.error(err);
    }
  };

  const renderRegistrasiScreen = () => {
    const sortedGroups = (() => {
      const groups: { [key: string]: { categoryId: string; categoryName: string; division: string; gender: string; list: any[] } } = {};
      participants.forEach(p => {
        const classObj = categories.find(c => c.id === p.categoryClassId);
        const categoryName = classObj ? classObj.name : p.categoryClassId;
        const division = classObj?.division || "DEWASA";
        const gender = p.gender || "PUTRA";
        
        const key = `${categoryName}_${division}_${gender}`.toUpperCase();
        if (!groups[key]) {
          groups[key] = {
            categoryId: p.categoryClassId,
            categoryName,
            division,
            gender,
            list: []
          };
        }
        groups[key].list.push(p);
      });

      return Object.values(groups).sort((a, b) => {
        const catCompare = a.categoryName.localeCompare(b.categoryName);
        if (catCompare !== 0) return catCompare;
        return a.gender.localeCompare(b.gender);
      });
    })();

    const baganCategoryList = (() => {
      const listMap = new Map<string, { id: string; name: string; division: string; gender: string; count: number }>();
      participants.forEach(p => {
        const classObj = categories.find(c => c.id === p.categoryClassId);
        const categoryName = classObj ? classObj.name : p.categoryClassId;
        const division = classObj?.division || "DEWASA";
        const gender = p.gender || "PUTRA";
        const key = `${p.categoryClassId}_${gender}`;
        
        const existing = listMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          listMap.set(key, {
            id: p.categoryClassId,
            name: categoryName,
            division,
            gender,
            count: 1
          });
        }
      });
      return Array.from(listMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    })();

    const divisionsWithAthletesList = (() => {
      const map = new Map<string, { division: string; count: number }>();
      baganCategoryList.forEach(item => {
        const divKey = item.division ? normalizeDivision(item.division) : "DEWASA";
        const ex = map.get(divKey);
        if (ex) {
          ex.count += item.count;
        } else {
          map.set(divKey, { division: divKey, count: item.count });
        }
      });
      return Array.from(map.values()).sort((a, b) => a.division.localeCompare(b.division));
    })();

    const handleSaveAthlete = async () => {
      if (!manualName.trim() || !manualClub.trim()) {
        alert("Nama Atlet dan Kontingen wajib diisi lengkap!");
        return;
      }
      sound.playClick();

      let classId = manualCategoryClassId;
      if (!classId || classId === "") {
        if (categories.length > 0) {
          classId = categories[0].id;
        } else {
          classId = "cat-kelas-c";
        }
      }

      let activeCat = categories.find(c => c.id === classId);
      let updatedCategories = [...categories];

      if (!activeCat) {
        const newCategoryObj = {
          id: classId,
          name: classId.replace("cat-", "").replace("-", " ").toUpperCase(),
          minWeight: 45,
          maxWeight: 100,
          division: manualDivision
        };
        activeCat = newCategoryObj;
        updatedCategories.push(newCategoryObj);
        setCategories(updatedCategories);
      } else {
        activeCat.division = manualDivision;
      }

      let updatedParticipants = [...participants];
      if (editingAthleteId) {
        updatedParticipants = participants.map(p => {
          if (p.id === editingAthleteId) {
            return {
              ...p,
              name: manualName.trim().toUpperCase(),
              club: manualClub.trim().toUpperCase(),
              gender: manualGender,
              categoryClassId: classId,
              weight: Number(manualWeight) || 55,
              arena: manualArena || "GELANGGANG A"
            };
          }
          return p;
        });
        setEditingAthleteId(null);
      } else {
        const newAthlete = {
          id: "p-manual-" + Date.now(),
          name: manualName.trim().toUpperCase(),
          club: manualClub.trim().toUpperCase(),
          gender: manualGender,
          categoryClassId: classId,
          weight: Number(manualWeight) || 55,
          arena: manualArena || "GELANGGANG A"
        };
        updatedParticipants.push(newAthlete);
      }

      setParticipants(updatedParticipants);

      const autoMatches = generateAllBracketsData(updatedCategories, updatedParticipants, baganSchemeType);

      try {
        const res = await fetch("/api/tournament/import-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newCategories: updatedCategories,
            newParticipants: updatedParticipants,
            newMatches: autoMatches
          })
        });
        if (res.ok) {
          notifyToast(`👤 Sukses menyimpan data atlet: ${manualName.trim().toUpperCase()}`);
          setManualName("");
          setManualClub("");
          fetchSchedules();
        } else {
          alert("Gagal menyimpan data atlet ke database.");
        }
      } catch (err) {
        console.error(err);
      }
    };

    const triggerFileImport = (tab: "INPUT" | "BAGAN" | "KONTROL") => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".xlsx, .xls";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        sound.playClick();
        
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            const bstream = evt?.target?.result;
            if (!bstream) return;
            const workbook = XLSX.read(bstream, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

            if (rawRows.length < 2) {
              alert("File Excel kosong atau format tidak sesuai!");
              return;
            }

            if (tab === "INPUT") {
              let idxNama = 1, idxKontingen = 2, idxGender = 3, idxKelas = 4, idxBerat = 5, idxArena = -1;
              let headers = rawRows[0];
              headers.forEach((h: any, i: number) => {
                if (!h) return;
                const label = h.toString().toLowerCase();
                if (label.includes("nama") || label.includes("atlit") || label.includes("atlet")) idxNama = i;
                else if (label.includes("kontingen") || label.includes("club") || label.includes("asal")) idxKontingen = i;
                else if (label.includes("gender") || label.includes("kelamin") || label.includes("sex")) idxGender = i;
                else if (label.includes("kelas") || label.includes("class")) idxKelas = i;
                else if (label.includes("berat") || label.includes("weight")) idxBerat = i;
                else if (label.includes("gelanggang") || label.includes("arena")) idxArena = i;
              });

              const newCats: any[] = [];
              const newParts: any[] = [];

              for (let i = 1; i < rawRows.length; i++) {
                const row = rawRows[i];
                if (!row || !row[idxNama]) continue;
                const rawNama = row[idxNama]?.toString() || "";
                const rawKontingen = row[idxKontingen]?.toString() || "KONTINGEN";
                const rawGender = row[idxGender]?.toString() || "PUTRA";
                const rawKelas = row[idxKelas]?.toString() || "Kelas C";
                const rawWeight = Number(row[idxBerat]) || 55;
                let rawArena = "GELANGGANG A";
                if (idxArena !== -1 && row[idxArena]) {
                  const aVal = row[idxArena].toString().trim().toUpperCase();
                  rawArena = aVal.startsWith("GELANGGANG") ? aVal : `GELANGGANG ${aVal}`;
                }

                const cleanGender = (rawGender.toUpperCase().includes("PUTRI") || rawGender.toUpperCase().includes("PI") || rawKelas.toUpperCase().includes(" PI") || rawKelas.toUpperCase().includes("PUTRI")) ? "PUTRI" : "PUTRA";
                const catId = `cat-${rawKelas.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;

                if (!newCats.find(c => c.id === catId)) {
                  newCats.push({
                    id: catId,
                    name: rawKelas,
                    minWeight: rawWeight - 2 || 45,
                    maxWeight: rawWeight + 2 || 100,
                    division: "Dewasa"
                  });
                }

                newParts.push({
                  id: `p-excel-${i}-${Date.now().toString().slice(-4)}`,
                  name: rawNama.toUpperCase(),
                  club: rawKontingen.toUpperCase(),
                  gender: cleanGender,
                  categoryClassId: catId,
                  weight: rawWeight,
                  arena: rawArena
                });
              }

              const mergedCats = [...categories];
              newCats.forEach(nc => {
                if (!mergedCats.some(c => c.id === nc.id)) mergedCats.push(nc);
              });
              const mergedParts = [...participants, ...newParts];
              const autoMatches = generateAllBracketsData(mergedCats, mergedParts, baganSchemeType);

              const res = await fetch("/api/tournament/import-batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  newCategories: mergedCats,
                  newParticipants: mergedParts,
                  newMatches: autoMatches
                })
              });
              if (res.ok) {
                notifyToast(`🎉 Berhasil mengimpor ${newParts.length} data atlit dari Excel!`);
                fetchSchedules();
              }
            } else {
              notifyToast("📂 Excel berhasil diuraikan ke sistem tanding!");
            }
          } catch (err) {
            console.error(err);
            alert("Gagal membaca file Excel.");
          }
        };
        reader.readAsBinaryString(file);
      };
      input.click();
    };

    const downloadBaganTemplateExcel = () => {
      const templateData = [
        ["KELAS TANDING", "GENDER", "BABAK/TAHAPAN", "SUDUT MERAH", "KONTINGEN MERAH", "SUDUT BIRU", "KONTINGEN BIRU"],
        ["Kelas C", "PUTRA", "PEREMPAT FINAL L1", "FAJAR NUGRAHA", "ACEH BESAR", "EKO WAHYUDI", "BANDA ACEH"],
        ["Kelas C", "PUTRA", "PEREMPAT FINAL L2", "MUKHLIS AMIN", "ACEH TIMUR", "BUDI RAHARJO", "SABANG"]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template Bagan");
      XLSX.writeFile(workbook, "Template_Bagan.xlsx");
      notifyToast("📥 Template Excel Bagan berhasil diunduh!");
    };

    const downloadScheduleTemplateExcel = () => {
      const templateData = [
        ["PARTAI", "KELAS TANDING", "GENDER", "BABAK/TAHAPAN", "SUDUT MERAH", "SUDUT BIRU"],
        ["1", "Kelas C", "PUTRA", "PENYISIHAN", "FAJAR NUGRAHA", "EKO WAHYUDI"],
        ["2", "Kelas C", "PUTRA", "SEMIFINAL", "MUKHLIS AMIN", "BUDI RAHARJO"]
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Template Jadwal");
      XLSX.writeFile(workbook, "Template_Jadwal.xlsx");
      notifyToast("📥 Template Excel Jadwal berhasil diunduh!");
    };

    const downloadSemuaBaganPdf = () => {
      sound.playClick();
      const validCategories = baganCategoryList.length > 0 ? baganCategoryList : categories.map(c => ({
        id: c.id,
        name: c.name,
        division: c.division || "DEWASA",
        gender: "PUTRA",
        count: participants.filter(p => p.categoryClassId === c.id).length
      }));

      if (validCategories.length === 0) {
        alert("⚠️ Belum ada data kategori atlet yang terdaftar untuk diunduh!");
        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      let pageCount = 0;

      validCategories.forEach((catItem) => {
        const catMatches = schedules.filter(m => m.categoryClassId === catItem.id && m.gender === catItem.gender);
        const catAthletes = participants.filter(p => p.categoryClassId === catItem.id && p.gender === catItem.gender);
        if (catAthletes.length === 0 && catMatches.length === 0) return;

        if (pageCount > 0) {
          doc.addPage("a4", "landscape");
        }
        pageCount++;

        // Draw logos left and right
        drawLogoPdf(doc, logoLeftLocal || "/logo_panel_dewan.svg", 15, 10, 15);
        drawLogoPdf(doc, logoRightLocal || "/logo_panel_dewan.svg", 267, 10, 15);

        // Header titles
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.text((eventName || "PEKAN OLAHRAGA PELAJAR DAERAH (POPDA) XVII").toUpperCase(), 148.5, 14, { align: "center" });

        doc.setFontSize(10.5);
        const subHeader = `KARTU BAGAN PERTANDINGAN RESMI  |  ${(tempatPelaksanaan || "IDI RAYEUK").toUpperCase()} - ${(waktuPelaksanaan || "07 S.D 12 JULI 2024").toUpperCase()}`;
        doc.text(subHeader, 148.5, 19, { align: "center" });

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(60, 60, 60);
        doc.text("PENGURUS PROVINSI IKATAN PENCAK SILAT INDONESIA", 148.5, 23.5, { align: "center" });

        // Double header line divider
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.8);
        doc.line(15, 27, 282, 27);
        doc.setLineWidth(0.3);
        doc.line(15, 28.2, 282, 28.2);

        // Category Banner Rect
        doc.setFillColor(230, 230, 230);
        doc.rect(15, 31, 267, 7, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(0, 0, 0);
        doc.text(`BAGAN PERTANDINGAN: ${catItem.name.toUpperCase()} - ${catItem.gender.toUpperCase()} (${catItem.division.toUpperCase()})`, 148.5, 36, { align: "center" });

        // Render match boxes or info
        if (catMatches.length === 0) {
          doc.setFont("Helvetica", "italic");
          doc.setFontSize(10);
          doc.setTextColor(120, 120, 120);
          doc.text("Bagan belum digenerate untuk kategori ini.", 148.5, 80, { align: "center" });
        } else {
          const sortedMatches = [...catMatches].sort((a, b) => {
            const numA = parseInt(a.matchNumber?.toString().replace(/\D/g, "") || "999");
            const numB = parseInt(b.matchNumber?.toString().replace(/\D/g, "") || "999");
            return numA - numB;
          });

          sortedMatches.slice(0, 16).forEach((m, mIdx) => {
            const col = Math.floor(mIdx / 8);
            const row = mIdx % 8;
            const xPos = 20 + col * 130;
            const yPos = 44 + row * 17;

            doc.setFillColor(245, 245, 250);
            doc.rect(xPos, yPos, 122, 15, "F");
            doc.setDrawColor(180, 180, 200);
            doc.rect(xPos, yPos, 122, 15, "S");

            doc.setFont("Helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(0, 0, 0);
            doc.text(`${(m.matchNumber || "Partai").toUpperCase()} • ${(m.stage || "Babak").toUpperCase()}`, xPos + 3, yPos + 4);

            doc.setFont("Helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(190, 20, 20);
            const redName = m.fighterRedName || getParticipantName(m.fighterRedId) || "BYE (MENUNGGU)";
            const redClub = m.fighterRedClub || getParticipantClub(m.fighterRedId) || "-";
            doc.text(`🔴 ${redName.toUpperCase()} [${redClub.toUpperCase()}]`, xPos + 3, yPos + 8.5);

            doc.setTextColor(20, 60, 200);
            const blueName = m.fighterBlueName || getParticipantName(m.fighterBlueId) || "BYE (MENUNGGU)";
            const blueClub = m.fighterBlueClub || getParticipantClub(m.fighterBlueId) || "-";
            doc.text(`🔵 ${blueName.toUpperCase()} [${blueClub.toUpperCase()}]`, xPos + 3, yPos + 13);
          });
        }
      });

      if (pageCount === 0) {
        alert("Tidak ada data bagan yang dapat diunduh!");
        return;
      }

      doc.save("Bagan_Semua_Kelas_Turnamen.pdf");
      notifyToast("📄 Semua Bagan Pertandingan berhasil diunduh dalam 1 file PDF!");
    };

    // Algoritma Pengacakan Undian Atlet Secara Adil (Fair Seeding / Resufle):
    // 1. Mengacak seluruh atlet dengan entropy tinggi (Fisher-Yates).
    // 2. Mengelompokkan atlet berdasarkan kontingen/perguruan (club).
    // 3. Memisahkan atlet satu kontingen secara bergantian ke Pool A dan Pool B agar tidak langsung bertemu di babak awal.
    // 4. Dalam tiap pool, memastikan pasangan bertanding babak pertama tidak berasal dari kontingen yang sama jika masih ada opsi lawan lain.
    // 5. Menjamin hasil resufle selalu merombak susunan pertemuan secara dinamis dan adil.
    const fairShuffleTournamentAthletes = (athletes: any[]): any[] => {
      if (!athletes || athletes.length <= 1) return athletes ? [...athletes] : [];

      // 1. Initial Fisher-Yates
      const pool = [...athletes];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      // 2. Group by normalized contingent/club
      const clubGroups: Record<string, any[]> = {};
      pool.forEach(ath => {
        const club = (ath.club || ath.contingent || "MANDIRI").trim().toUpperCase();
        if (!clubGroups[club]) clubGroups[club] = [];
        clubGroups[club].push(ath);
      });

      const sortedClubs = Object.keys(clubGroups).sort(
        (a, b) => clubGroups[b].length - clubGroups[a].length
      );

      const N = pool.length;
      const half = Math.ceil(N / 2);
      const leftPool: any[] = [];
      const rightPool: any[] = [];

      // Alternate members of the same contingent into opposing pools (Pool A & Pool B)
      sortedClubs.forEach(club => {
        const members = clubGroups[club];
        for (let i = members.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [members[i], members[j]] = [members[j], members[i]];
        }

        const startLeft = Math.random() > 0.5;
        members.forEach((m, idx) => {
          const preferLeft = startLeft ? idx % 2 === 0 : idx % 2 === 1;
          if (preferLeft) {
            if (leftPool.length < half) {
              leftPool.push(m);
            } else if (rightPool.length < N - half) {
              rightPool.push(m);
            } else {
              leftPool.push(m);
            }
          } else {
            if (rightPool.length < N - half) {
              rightPool.push(m);
            } else if (leftPool.length < half) {
              leftPool.push(m);
            } else {
              rightPool.push(m);
            }
          }
        });
      });

      // Avoid adjacent same-club pairings within each pool
      const arrangePoolNoAdjacentClashes = (arr: any[]): any[] => {
        if (arr.length <= 2) {
          if (arr.length === 2 && Math.random() > 0.5) return [arr[1], arr[0]];
          return arr;
        }
        const poolArr = [...arr];
        for (let i = poolArr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [poolArr[i], poolArr[j]] = [poolArr[j], poolArr[i]];
        }

        for (let i = 0; i < poolArr.length - 1; i += 2) {
          const cA = (poolArr[i]?.club || poolArr[i]?.contingent || "").trim().toUpperCase();
          const cB = (poolArr[i + 1]?.club || poolArr[i + 1]?.contingent || "").trim().toUpperCase();
          if (cA && cB && cA === cB) {
            for (let k = i + 2; k < poolArr.length; k++) {
              const cK = (poolArr[k]?.club || poolArr[k]?.contingent || "").trim().toUpperCase();
              if (cK !== cA) {
                [poolArr[i + 1], poolArr[k]] = [poolArr[k], poolArr[i + 1]];
                break;
              }
            }
          }
        }
        return poolArr;
      };

      const finalLeft = arrangePoolNoAdjacentClashes(leftPool);
      const finalRight = arrangePoolNoAdjacentClashes(rightPool);
      let result = [...finalLeft, ...finalRight];

      // Ensure outcome is not identical to input order if N >= 2
      if (athletes.length >= 2 && result.every((ath, i) => ath.id === athletes[i]?.id)) {
        result = [result[result.length - 1], ...result.slice(0, result.length - 1)];
      }

      return result;
    };

    const handleKocakUndian = async () => {
      sound.playClick();
      if (!selectedBaganCategory) {
        alert("Silakan pilih kelas tanding terlebih dahulu!");
        return;
      }

      const unfilteredAthletes = participants.filter(
        p => p.categoryClassId === selectedBaganCategory && p.gender === selectedBaganGender && p.name && p.name.trim() !== ""
      );
      const realParts = unfilteredAthletes.filter(p => !isDummyAthleteObj(p));
      const catAthletes = realParts.length > 0 ? realParts : unfilteredAthletes;

      if (catAthletes.length === 0) {
        alert("Belum ada data atlet yang terdaftar di kelas ini untuk diresufle!");
        return;
      }

      // Shuffle / Resufle athletes fairly
      const shuffled = fairShuffleTournamentAthletes(catAthletes);

      const otherParticipants = participants.filter(
        p => !(p.categoryClassId === selectedBaganCategory && p.gender === selectedBaganGender)
      );
      const newParticipants = [...otherParticipants, ...shuffled];
      setParticipants(newParticipants);

      const len = shuffled.length;
      let reqCapacity = 2;
      if (len <= 2) reqCapacity = 2;
      else if (len <= 4) reqCapacity = 4;
      else if (len <= 8) reqCapacity = 8;
      else if (len <= 16) reqCapacity = 16;
      else if (len <= 32) reqCapacity = 32;
      else reqCapacity = 64;

      lastGeneratedKey.current = "";
      await handleAutoGenerateBagan(reqCapacity, selectedBaganCategory, selectedBaganGender, newParticipants);
      notifyToast("🔀 Resufle undian bagan berhasil! Pertemuan atlet telah diacak secara adil.");
    };

    const handleKosongkanKelas = async () => {
      sound.playClick();
      if (!selectedBaganCategory) {
        alert("Silakan pilih kelas tanding terlebih dahulu!");
        return;
      }
      const cat = categories.find(c => c.id === selectedBaganCategory);
      const catName = cat ? cat.name : "Kelas Ini";

      if (!confirm(`Apakah Anda yakin ingin mengosongkan semua data atlit dan jadwal pertandingan pada ${catName} (${selectedBaganGender})?`)) {
        return;
      }

      const updatedParticipants = participants.filter(
        p => !(p.categoryClassId === selectedBaganCategory && p.gender === selectedBaganGender)
      );
      const updatedSchedules = schedules.filter(
        m => !(m.categoryClassId === selectedBaganCategory && m.gender === selectedBaganGender)
      );

      setParticipants(updatedParticipants);
      setSchedules(updatedSchedules);

      try {
        const res = await fetch("/api/tournament/import-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newCategories: categories,
            newParticipants: updatedParticipants,
            newMatches: updatedSchedules
          })
        });
        if (res.ok) {
          notifyToast(`🗑️ Data kelas ${catName} (${selectedBaganGender}) berhasil dikosongkan!`);
        }
      } catch (err) {
        console.error(err);
      }
    };

    const getCategoryDisplayName = (catId: string) => {
      const c = categories.find(cat => cat.id === catId);
      if (c?.name) return c.name.toUpperCase();
      if (catId.startsWith("cat-kelas-")) return `KELAS ${catId.replace("cat-kelas-", "").toUpperCase()}`;
      if (catId.startsWith("cat-")) return `KELAS ${catId.replace("cat-", "").toUpperCase()}`;
      return catId.toUpperCase();
    };

    const displayedAthletes = participants.filter((ath) => {
      const matchesSearch = !athleteSearchQuery || 
        (ath.name && ath.name.toUpperCase().includes(athleteSearchQuery.toUpperCase())) || 
        (ath.club && ath.club.toUpperCase().includes(athleteSearchQuery.toUpperCase()));
      if (!matchesSearch) return false;

      if (athleteFilterMode === "ALL") {
        if (athleteArenaFilter !== "SEMUA") {
          const athArena = (ath.arena || ath.gelanggang || "GELANGGANG A").toUpperCase();
          if (!athArena.includes(athleteArenaFilter.toUpperCase())) return false;
        }
        return true;
      }

      if (athleteArenaFilter !== "SEMUA") {
        const athArena = (ath.arena || ath.gelanggang || "GELANGGANG A").toUpperCase();
        if (!athArena.includes(athleteArenaFilter.toUpperCase())) return false;
      }

      const athClassObj = categories.find(c => c.id === ath.categoryClassId);
      const athCatName = athClassObj ? athClassObj.name.toUpperCase() : getCategoryDisplayName(ath.categoryClassId);
      const currentFormCatName = getCategoryDisplayName(manualCategoryClassId);
      const athDivision = (athClassObj?.division || manualDivision || "DEWASA").toUpperCase();
      const currentDivision = manualDivision.toUpperCase();
      const athGender = (ath.gender || "PUTRA").toUpperCase();
      const currentGender = manualGender.toUpperCase();

      const matchClass = ath.categoryClassId === manualCategoryClassId || athCatName === currentFormCatName;
      const matchDivision = athDivision === currentDivision;
      const matchGender = athGender === currentGender;

      return matchClass && matchDivision && matchGender;
    });

    return (
      <div className="flex-grow flex flex-col p-3 sm:p-5 max-w-[1720px] mx-auto w-full gap-4 sm:gap-5">
        
        {/* HEADER BAR - ARENA LED */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-blue-500/30 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* MAIN NAVBAR SWITCHER */}
            <nav className="flex items-center gap-1 sm:gap-2 p-1 bg-[#03081a] border border-purple-900/70 rounded-xl shadow-inner shrink-0" aria-label="Menu Utama Sekretaris">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowRegistrasiScreen(false);
                }}
                className="px-3.5 py-1.5 rounded-lg font-sans font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-850 border border-transparent"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
                <span>PARAMETER PERTANDINGAN</span>
              </button>

              <span className="text-amber-400/40 font-bold select-none px-0.5">|</span>

              <button
                type="button"
                className="px-3.5 py-1.5 rounded-lg font-sans font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-200 cursor-default flex items-center gap-1.5 bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.45)] border border-amber-300/50"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-200" />
                <span>REGISTRASI DATA TURNAMEN & BAGAN</span>
              </button>
            </nav>
          </div>

          <div className="bg-[#050c20] p-1 rounded-xl border border-purple-500/40 flex gap-1 self-stretch md:self-auto justify-center shadow-inner">
            {[
              { id: "INPUT", label: "Input data" },
              { id: "BAGAN", label: "bagan braket" },
              { id: "KONTROL", label: "kontrol partai" }
            ].map((tabItem) => {
              const isActive = registrasiActiveTab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  onClick={() => {
                    sound.playClick();
                    setRegistrasiActiveTab(tabItem.id as any);
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] border-none"
                      : "text-blue-300/60 hover:text-cyan-200 hover:bg-blue-950/40 border-none bg-transparent"
                  }`}
                >
                  <span>{tabItem.label}</span>
                </button>
              );
            })}
          </div>
        </header>

        {registrasiActiveTab === "INPUT" && (
          <div className="w-full animate-fadeIn">
            <LotingPanel 
              onBack={() => setShowRegistrasiScreen(false)} 
              onOpenBracket={() => setRegistrasiActiveTab("BAGAN")}
              onOpenJadwal={() => setRegistrasiActiveTab("KONTROL")}
              hideBackHeader={true} 
            />
          </div>
        )}

        {registrasiActiveTab === "BAGAN" && (
          <div className="w-full animate-fadeIn">
            <BracketPanel 
              onBack={() => setShowRegistrasiScreen(false)} 
              hideBackHeader={true} 
            />
          </div>
        )}

        {registrasiActiveTab === "KONTROL" && (
          <div className="w-full animate-fadeIn">
            <JadwalPanel 
              currentMatchState={state} 
              onLoadMatchToArena={onOpenOperatorPanel} 
              onBack={() => setShowRegistrasiScreen(false)} 
              hideBackHeader={true} 
            />
          </div>
        )}
      </div>
    );
  };

  if (showBaganScreen) {
    return (
      <div 
        className="min-h-screen text-slate-100 font-sans flex flex-col pb-10 relative"
        style={{
          background: "radial-gradient(ellipse at 50% 20%, #0a163a 0%, #040817 60%, #02040c 100%)"
        }}
      >
        {renderFloatingToast()}
        {renderBaganScreen()}
      </div>
    );
  }

  if (showSchedulePreviewScreen) {
    return (
      <div 
        className="min-h-screen text-slate-100 font-sans flex flex-col pb-10 relative"
        style={{
          background: "radial-gradient(ellipse at 50% 20%, #0a163a 0%, #040817 60%, #02040c 100%)"
        }}
      >
        {renderFloatingToast()}
        {renderSchedulePreviewScreen()}
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen text-[#f8fafc] font-sans flex flex-col relative pb-10 overflow-x-hidden antialiased"
      style={{
        background: "radial-gradient(ellipse at 50% 20%, #0a163a 0%, #040817 60%, #02040c 100%)"
      }}
    >
      {/* Subtle Background Watermark */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03] select-none bg-center bg-no-repeat bg-contain z-0" 
        style={{ backgroundImage: "url('/jrzscoreutama.png')", backgroundSize: "min(50vw, 50vh)" }}
      />

      {/* FLOATING TOAST NOTIFICATION OVERLAY */}
      {renderFloatingToast()}

      {/* HEADER SECTION - ARENA LED (Hidden when in Full Screen mode) */}
      {!isEffectiveFullscreen && (
        <header className="bg-[#050d22]/95 border-b border-purple-500/30 py-2.5 px-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-[0_4px_30px_rgba(0,0,0,0.6)] relative z-20 animate-fadeIn" id="sekretaris-header">
          {/* Left Column: Back button + Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                sound.playClick();
                onBack();
              }}
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-cyan-400/40 text-cyan-300 hover:text-white transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-md active:scale-95"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">KEMBALI KE BERANDA</span>
              <span className="sm:hidden">BERANDA</span>
            </button>

            <div className="flex flex-col">
              <h1 className="font-sans font-black tracking-widest text-[12px] sm:text-[14px] uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-blue-400 leading-tight">
                PANEL SEKRETARIS
              </h1>
              <p className="text-[7.5px] sm:text-[8.5px] text-cyan-300/70 uppercase font-mono font-bold tracking-widest">
                MEJA PERTANDINGAN & KONTROL ARENA
              </p>
            </div>
          </div>

          {/* Center Column: The Unified Navigation Tabs (Parameter Pertandingan & registrasi data) */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* Primary Nav Switcher */}
            <nav className="bg-[#050c20] p-1 rounded-xl border border-purple-500/40 flex items-center gap-1 shadow-inner" aria-label="Navigasi Terpadu Sekretaris">
              {/* 1. Parameter Pertandingan */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab("PARAMETER");
                }}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "PARAMETER"
                    ? "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.45)] border border-amber-300/40"
                    : "text-slate-300 hover:text-white hover:bg-slate-850/60 border border-transparent"
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-amber-300" />
                <span>Parameter Pertandingan</span>
              </button>

              {/* 2. Registrasi Data */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab("REGISTRASI");
                }}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "REGISTRASI"
                    ? "bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] border border-cyan-300/40"
                    : "text-slate-300 hover:text-white hover:bg-slate-850/60 border border-transparent"
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-300" />
                <span>registrasi data</span>
              </button>
            </nav>

            {/* Quick Sub-menu Pills in Header when inside Registrasi Data */}
            {activeTab === "REGISTRASI" && (
              <div className="bg-[#071330] p-1 rounded-xl border border-cyan-500/40 flex items-center gap-1 shadow-inner animate-fadeIn">
                {[
                  { id: "INPUT", label: "Input data" },
                  { id: "BAGAN", label: "bagan braket" },
                  { id: "KONTROL", label: "kontrol partai" }
                ].map((subItem) => {
                  const isSubActive = registrasiActiveTab === subItem.id;
                  return (
                    <button
                      key={subItem.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setRegistrasiActiveTab(subItem.id as any);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                        isSubActive
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)] border-none"
                          : "text-blue-300/70 hover:text-cyan-200 hover:bg-blue-950/40 border-none bg-transparent"
                      }`}
                    >
                      <span>{subItem.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Battery & Toast Msg */}
          <div className="flex items-center gap-2">
            {infoMsg && (
              <div className="hidden lg:block px-2.5 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-md text-[9px] uppercase font-mono tracking-wider animate-pulse mr-2">
                {infoMsg}
              </div>
            )}
            <DeviceBatteryIndicator />
          </div>
        </header>
      )}

      {/* 1. VIEW REGISTRASI DATA (BERISI 3 SUB-MENU: Input data, bagan braket, kontrol partai) */}
      {activeTab === "REGISTRASI" && (
        <div className="w-full flex-grow flex flex-col animate-fadeIn">
          {/* Sub-Navigation Bar Terpadu */}
          <div className="bg-[#050e26]/85 border-b border-cyan-500/30 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md sticky top-0 z-20 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>REGISTRASI DATA TURNAMEN:</span>
              </span>
            </div>

            <div className="bg-[#040a1c] p-1 rounded-xl border border-cyan-500/40 flex items-center gap-1 shadow-inner">
              {[
                { id: "INPUT", label: "Input data", icon: Users },
                { id: "BAGAN", label: "bagan braket", icon: Trophy },
                { id: "KONTROL", label: "kontrol partai", icon: Calendar }
              ].map((subItem) => {
                const isSubActive = registrasiActiveTab === subItem.id;
                const SubIcon = subItem.icon;
                return (
                  <button
                    key={subItem.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setRegistrasiActiveTab(subItem.id as any);
                    }}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-black tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                      isSubActive
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)] border-none"
                        : "text-cyan-300/70 hover:text-white hover:bg-blue-950/40 border-none bg-transparent"
                    }`}
                  >
                    <SubIcon className="w-3.5 h-3.5" />
                    <span>{subItem.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab("PARAMETER");
              }}
              className="text-[10.5px] font-sans font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 transition-all cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>Ke Parameter Pertandingan</span>
            </button>
          </div>

          {/* Sub-menu 1: Input Data */}
          {registrasiActiveTab === "INPUT" && (
            <div className="w-full flex-grow animate-fadeIn">
              <LotingPanel 
                onBack={onBack} 
                onOpenBracket={() => setRegistrasiActiveTab("BAGAN")}
                onOpenJadwal={() => setRegistrasiActiveTab("KONTROL")}
                hideBackHeader={true} 
              />
            </div>
          )}

          {/* Sub-menu 2: Bagan Braket */}
          {registrasiActiveTab === "BAGAN" && (
            <div className="w-full flex-grow animate-fadeIn">
              <BracketPanel 
                onBack={onBack} 
                onOpenMatch={() => setRegistrasiActiveTab("KONTROL")}
                hideBackHeader={true} 
              />
            </div>
          )}

          {/* Sub-menu 3: Kontrol Partai */}
          {registrasiActiveTab === "KONTROL" && (
            <div className="w-full flex-grow animate-fadeIn">
              <JadwalPanel 
                currentMatchState={state} 
                onLoadMatchToArena={onOpenOperatorPanel} 
                onBack={onBack} 
                hideBackHeader={true} 
              />
            </div>
          )}
        </div>
      )}

      {/* 2. VIEW PARAMETER PERTANDINGAN */}
      {activeTab === "PARAMETER" && (
        /* TWO-COLUMN GRID LAYOUT */
        <main className="flex-grow px-2.5 sm:px-3.5 md:px-4 pt-1.5 pb-2.5 grid grid-cols-1 lg:grid-cols-3 gap-2 max-w-7xl mx-auto w-full relative z-10">
        
        {/* LEFT COLUMN: PARAMETER PERTANDINGAN */}
        <div className="lg:col-span-2 flex flex-col gap-2" id="sekretaris-parameters-col">
          
          {/* PARAMETER PERTANDINGAN SECTION */}
          <section className="bg-[#07112a]/90 backdrop-blur-sm border border-blue-500/30 rounded-xl p-2.5 sm:p-3 shadow-[0_0_20px_rgba(37,99,235,0.15)] relative" id="param-pertandingan-box">
            
            {/* MAIN NAVBAR: PARAMETER PERTANDINGAN | REGISTRASI DATA TURNAMEN & BAGAN */}
            <div className="flex items-center justify-between border-b border-blue-950/60 pb-1.5 mb-2 gap-2 flex-wrap" id="sekretaris-main-navbar">
              <nav className="flex items-center gap-1 sm:gap-1.5 p-1 bg-[#03081a] border border-purple-900/70 rounded-lg shadow-inner" aria-label="Menu Utama Sekretaris">
                {/* TAB 1: PARAMETER PERTANDINGAN */}
                <button
                  type="button"
                  id="nav-tab-param-pertandingan"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab("PARAMETER");
                  }}
                  className={`px-3 py-1 rounded-md font-sans font-black text-[10.5px] sm:text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "PARAMETER"
                      ? "bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.45)] border border-amber-300/50"
                      : "text-slate-300 hover:text-white hover:bg-slate-850 border border-transparent"
                  }`}
                >
                  <Settings className="w-3 h-3 text-amber-300" />
                  <span>PARAMETER PERTANDINGAN</span>
                </button>

                {/* DIVIDER */}
                <span className="text-amber-400/40 font-bold select-none px-0.5">|</span>

                {/* TAB 2: REGISTRASI DATA TURNAMEN & BAGAN */}
                <button
                  type="button"
                  id="nav-tab-registrasi-bagan"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab("REGISTRASI");
                  }}
                  className="px-3 py-1 rounded-md font-sans font-black text-[10.5px] sm:text-[11px] uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-850 border border-transparent"
                >
                  <Layers className="w-3 h-3 text-cyan-300" />
                  <span>REGISTRASI DATA TURNAMEN & BAGAN</span>
                </button>
              </nav>

              <span className="text-[7.5px] font-mono font-bold text-amber-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/40 tracking-widest hidden sm:inline shadow-sm">
                NAVBAR UTAMA
              </span>
            </div>

            {/* INPUT BODY */}
            <div className="flex flex-col gap-1.5">
              
              {/* NAMA EVENT */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[8px] uppercase font-sans font-black tracking-widest text-cyan-300/70">
                  NAMA EVENT KEJUARAAN
                </label>
                <input
                  id="sekretaris-event-name-input"
                  type="text"
                  value={eventName}
                  onFocus={() => setFocusedField("eventName")}
                  onChange={(e) => setEventName(e.target.value)}
                  onBlur={() => {
                    setFocusedField(null);
                    triggerAutoSave();
                  }}
                  placeholder="Ganti nama kejuaraan pencak silat..."
                  className="w-full bg-[#03081a] border border-blue-900/80 focus:border-cyan-400 rounded-lg px-2.5 py-1 font-sans font-bold text-[11px] text-slate-100 placeholder-blue-300/20 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all uppercase shadow-inner"
                />
              </div>

              {/* TEMPAT & WAKTU Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] uppercase font-sans font-black tracking-widest text-cyan-300/70">
                    TEMPAT PELAKSANAAN
                  </label>
                  <input
                    type="text"
                    value={tempatPelaksanaan}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTempatPelaksanaan(val);
                      localStorage.setItem("sekretaris_tempatPelaksanaan", val);
                    }}
                    placeholder="PURA / GOR / DEWAN ARENA..."
                    className="w-full bg-[#03081a] border border-blue-900/80 focus:border-cyan-400 rounded-lg px-2.5 py-1 font-sans font-bold text-[10.5px] text-slate-100 placeholder-blue-300/20 focus:outline-none focus:border-cyan-400 transition-all uppercase shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] uppercase font-sans font-black tracking-widest text-cyan-300/70">
                    WAKTU PELAKSANAAN
                  </label>
                  <input
                    type="text"
                    value={waktuPelaksanaan}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWaktuPelaksanaan(val);
                      localStorage.setItem("sekretaris_waktuPelaksanaan", val);
                    }}
                    placeholder="Contoh: 12 - 15 JUNI 2026..."
                    className="w-full bg-[#03081a] border border-blue-900/80 focus:border-cyan-400 rounded-lg px-2.5 py-1 font-sans font-bold text-[10.5px] text-slate-100 placeholder-blue-300/20 focus:outline-none focus:border-cyan-400 transition-all uppercase shadow-inner"
                  />
                </div>
              </div>

              {/* LOGO SISI KIRI & KANAN Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {/* Logo Sisi Kiri */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] uppercase font-sans font-black tracking-widest text-cyan-300/70">
                    LOGO SISI KIRI (MONITOR)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-[#040c24] border border-blue-900/70 hover:border-cyan-400/50 duration-200 p-1.5 rounded-lg">
                    <div className="w-9 h-9 border border-blue-800 bg-[#020512] rounded-md flex items-center justify-center overflow-hidden shrink-0 mx-auto sm:mx-0">
                      {logoLeftLocal ? (
                        <img src={logoLeftLocal} alt="Kiri" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-[7.5px] text-slate-500 text-center uppercase font-bold">Kosong</div>
                      )}
                    </div>
                    <div className="flex-grow flex flex-col justify-between min-w-0">
                      <input
                        type="text"
                        value={logoLeftLocal}
                        onChange={(e) => { 
                            setLogoLeftLocal(e.target.value); triggerAutoSave({ logoLeft: e.target.value });
                        }}
                        placeholder="Path logo / Base64..."
                        className="w-full bg-[#020512] border border-blue-950 rounded px-1.5 py-0.5 text-[9.5px] text-cyan-200 focus:outline-none focus:border-cyan-400 placeholder-blue-300/20 truncate"
                      />
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            fileInputLeftRef.current?.click();
                          }}
                          className="flex-grow py-0.5 bg-gradient-to-r from-blue-900/50 to-cyan-950/50 hover:from-blue-800/70 hover:to-cyan-900/70 border border-cyan-500/30 text-[8.5px] text-[#facc15] hover:text-amber-400 font-black uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                        >
                          <span>↑ Upload Logo Kiri</span>
                        </button>
                        {logoLeftLocal && (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoLeftLocal("");
                              triggerAutoSave({ logoLeft: "" });
                            }}
                            className="px-1.5 py-0.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-[8.5px] text-rose-400 hover:text-rose-300 rounded transition-all cursor-pointer font-bold"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputLeftRef}
                        onChange={(e) => handleUploadLogoFile("left", e)}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo Sisi Kanan */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] uppercase font-sans font-black tracking-widest text-cyan-300/70">
                    LOGO SISI KANAN (MONITOR)
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 bg-[#040c24] border border-blue-900/70 hover:border-cyan-400/50 duration-200 p-1.5 rounded-lg">
                    <div className="w-9 h-9 border border-blue-800 bg-[#020512] rounded-md flex items-center justify-center overflow-hidden shrink-0 mx-auto sm:mx-0">
                      {logoRightLocal ? (
                        <img src={logoRightLocal} alt="Kanan" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-[7.5px] text-slate-500 text-center uppercase font-bold">Kosong</div>
                      )}
                    </div>
                    <div className="flex-grow flex flex-col justify-between min-w-0">
                      <input
                        type="text"
                        value={logoRightLocal}
                        onChange={(e) => { 
                            setLogoRightLocal(e.target.value); triggerAutoSave({ logoRight: e.target.value });
                        }}
                        placeholder="Path logo / Base64..."
                        className="w-full bg-[#020512] border border-blue-950 rounded px-1.5 py-0.5 text-[9.5px] text-cyan-200 focus:outline-none focus:border-cyan-400 placeholder-blue-300/20 truncate"
                      />
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            fileInputRightRef.current?.click();
                          }}
                          className="flex-grow py-0.5 bg-gradient-to-r from-blue-900/50 to-cyan-950/50 hover:from-blue-800/70 hover:to-cyan-900/70 border border-cyan-500/30 text-[8.5px] text-[#facc15] hover:text-amber-400 font-black uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                        >
                          <span>↑ Upload Logo Kanan</span>
                        </button>
                        {logoRightLocal && (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoRightLocal("");
                              triggerAutoSave({ logoRight: "" });
                            }}
                            className="px-1.5 py-0.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-[8.5px] text-rose-400 hover:text-rose-300 rounded transition-all cursor-pointer font-bold"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRightRef}
                        onChange={(e) => handleUploadLogoFile("right", e)}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* GRID 4 KOLOM: PARTAI, TAHAP, KELAS, KATEGORI USIA */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                
                {/* PARTAI TANDING */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] uppercase font-sans font-black tracking-widest text-cyan-300/70">
                    PARTAI TANDING (#)
                  </label>
                  <input
                    id="sekretaris-partai-number-input"
                    type="text"
                    value={partaiNumber}
                    onFocus={() => setFocusedField("partaiNumber")}
                    onChange={(e) => setPartaiNumber(e.target.value)}
                    onBlur={() => {
                      setFocusedField(null);
                      triggerAutoSave();
                    }}
                    className="w-full bg-[#03081a] border border-blue-900/80 focus:border-cyan-400 rounded-lg px-2 py-1 font-mono font-black text-center text-xs text-[#facc15] focus:outline-none shadow-inner"
                  />
                </div>

                {/* TAHAP PERTANDINGAN */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] uppercase font-sans font-black tracking-widest text-cyan-300/70">
                    TAHAP PERTANDINGAN
                  </label>
                  <select
                    value={tahap}
                    onChange={(e) => { setTahap(e.target.value as any); triggerAutoSave({ stage: e.target.value }); }}
                    className="w-full bg-[#03081a] border border-blue-900/80 focus:border-cyan-400 rounded-lg px-1.5 py-1 font-sans font-black text-center text-[10.5px] text-slate-100 focus:outline-none shadow-inner uppercase"
                  >
                    <option value="PENYISIHAN">PENYISIHAN</option>
                    <option value="PEREMPATFINAL">PEREMPAT FINAL</option>
                    <option value="SEMIFINAL">SEMI FINAL</option>
                    <option value="FINAL">BABAK FINAL</option>
                  </select>
                </div>

                {/* KELAS / NOMOR */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] uppercase font-sans font-black tracking-widest text-cyan-300/70">
                    KELAS / NOMOR
                  </label>
                  <input
                    id="sekretaris-kelas-nomor-input"
                    type="text"
                    value={kelasNomor}
                    onFocus={() => setFocusedField("kelasNomor")}
                    onChange={(e) => setKelasNomor(e.target.value)}
                    onBlur={() => {
                      setFocusedField(null);
                      triggerAutoSave();
                    }}
                    placeholder="C / D / BEBAS..."
                    className="w-full bg-[#03081a] border border-blue-900/80 focus:border-cyan-400 rounded-lg px-2 py-1 font-sans font-black text-center text-[11px] text-slate-100 focus:outline-none uppercase shadow-inner"
                  />
                </div>

                {/* KATEGORI USIA */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] uppercase font-sans font-black tracking-widest text-cyan-300/70">
                    KATEGORI USIA
                  </label>
                  <select
                    value={kategoriUsia}
                    onChange={(e) => { setKategoriUsia(e.target.value); triggerAutoSave(); }}
                    className="w-full bg-[#03081a] border border-blue-900/80 focus:border-cyan-400 rounded-lg px-1.5 py-1 font-sans font-black text-center text-[10.5px] text-slate-100 focus:outline-none shadow-inner uppercase"
                  >
                    <option value="DEWASA">DEWASA</option>
                    <option value="REMAJA">REMAJA</option>
                    <option value="PRA-REMAJA">PRA REMAJA</option>
                    <option value="USIA DINI">USIA DINI</option>
                  </select>
                </div>
              </div>

              {/* GENDER & DURASI TIMER Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                
                {/* GENDER (KATEGORI) */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] uppercase font-sans font-black tracking-widest text-cyan-300/70">
                    GENDER (KATEGORI)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5" id="gender-group-toggle">
                    <button
                      type="button"
                      onClick={() => { setGender("PUTRA"); triggerAutoSave({ gender: "PUTRA" }); }}
                      className={`py-1 px-2.5 rounded-lg font-sans font-black text-[11px] uppercase transition-all tracking-wider ${
                        gender === "PUTRA"
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)] border border-cyan-400/50"
                          : "bg-[#03081a] hover:bg-[#091538] text-blue-300/60 border border-blue-950"
                      }`}
                    >
                      PUTRA
                    </button>
                    <button
                      type="button"
                      onClick={() => { setGender("PUTRI"); triggerAutoSave({ gender: "PUTRI" }); }}
                      className={`py-1 px-2.5 rounded-lg font-sans font-black text-[11px] uppercase transition-all tracking-wider ${
                        gender === "PUTRI"
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.4)] border border-pink-400/50"
                          : "bg-[#03081a] hover:bg-[#091538] text-pink-300/60 border border-blue-950"
                      }`}
                    >
                      PUTRI
                    </button>
                  </div>
                </div>

                {/* DURASI BABAK */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] uppercase font-sans font-black tracking-widest text-cyan-300/70">
                    DURASI BABAK (TIMER)
                  </label>
                  <select
                    value={durasiTimer}
                    onChange={(e) => { 
                      const duration = Number(e.target.value);
                      setDurasiTimer(duration);
                      triggerAutoSave({ roundDuration: duration, timeLeft: duration });
                    }}
                    className="w-full bg-[#03081a] border border-blue-900/80 focus:border-cyan-400 rounded-lg px-2.5 py-1 font-mono font-black text-xs text-[#facc15] focus:outline-none shadow-inner"
                  >
                    <option value={120}>02:00 MENIT</option>
                    <option value={90}>01:30 MENIT</option>
                    <option value={60}>01:00 MENIT</option>
                    <option value={180}>03:00 MENIT</option>
                  </select>
                </div>
              </div>

              {/* TANDA TANGAN DOKUMEN CETAK Row */}
              <div className="border-t border-blue-950/60 pt-1.5 mt-0.5 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] uppercase font-sans font-black tracking-widest text-[#facc15]">
                    TANDA TANGAN DOKUMEN CETAK (A4)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7.5px] uppercase font-sans font-black tracking-widest text-cyan-300/60">
                      KETUA PERTANDINGAN
                    </label>
                    <input
                      type="text"
                      value={namaKetuaPertandingan}
                      onChange={(e) => updateNamaKetuaPertandingan(e.target.value)}
                      placeholder="e.g. Drs. H. Ahmad Fauzi, M.Pd"
                      className="w-full bg-[#03081a] border border-blue-900/70 rounded-lg px-2 py-1 font-sans font-bold text-[10.5px] text-slate-100 placeholder-blue-300/20 focus:outline-none focus:border-cyan-400 transition-all uppercase"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7.5px] uppercase font-sans font-black tracking-widest text-cyan-300/60">
                      SEKRETARIS PERTANDINGAN
                    </label>
                    <input
                      type="text"
                      value={namaSekretarisPertandingan}
                      onChange={(e) => updateNamaSekretarisPertandingan(e.target.value)}
                      placeholder="e.g. Linda Wijaya, S.Sos"
                      className="w-full bg-[#03081a] border border-blue-900/70 rounded-lg px-2 py-1 font-sans font-bold text-[10.5px] text-slate-100 placeholder-blue-300/20 focus:outline-none focus:border-cyan-400 transition-all uppercase"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7.5px] uppercase font-sans font-black tracking-widest text-cyan-300/60">
                      KOTA / TEMPAT DIBUAT
                    </label>
                    <input
                      type="text"
                      value={namaDaerahCetak}
                      onChange={(e) => updateNamaDaerahCetak(e.target.value)}
                      placeholder="e.g. IDI RAYEUK"
                      className="w-full bg-[#03081a] border border-blue-900/70 rounded-lg px-2 py-1 font-sans font-bold text-[10.5px] text-slate-100 placeholder-blue-300/20 focus:outline-none focus:border-cyan-400 transition-all uppercase"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[7.5px] uppercase font-sans font-black tracking-widest text-cyan-300/60">
                      TANGGAL DIBUAT
                    </label>
                    <input
                      type="text"
                      value={tanggalCetakDokumen}
                      onChange={(e) => updateTanggalCetakDokumen(e.target.value)}
                      placeholder="e.g. 11 JULI 2024"
                      className="w-full bg-[#03081a] border border-blue-900/70 rounded-lg px-2 py-1 font-sans font-bold text-[10.5px] text-slate-100 placeholder-blue-300/20 focus:outline-none focus:border-cyan-400 transition-all uppercase"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ATHLETES CORNER BOXES - ARENA LED */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-2" id="athletes-corners-group">
            
            {/* SUDUT BIRU COLUMN */}
            <div className="flex flex-col gap-1.5">
              {/* SUDUT BIRU BOX */}
              <div className="bg-gradient-to-br from-[#061e47] via-[#041330] to-[#020b1e] border-2 border-cyan-500/50 rounded-xl p-2.5 shadow-[0_0_20px_rgba(6,182,212,0.2)] relative overflow-hidden flex flex-col gap-1.5">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
                
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,1)] animate-pulse"></div>
                  <span className="text-[10px] font-sans font-black tracking-widest text-cyan-300 uppercase drop-shadow">
                    SUDUT BIRU
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[7.5px] uppercase font-bold tracking-widest text-cyan-200/70">
                    NAMA ATLIT
                  </label>
                  <input
                    id="sekretaris-atlit-biru-input"
                    type="text"
                    value={atlitBiruName}
                    onFocus={() => setFocusedField("atlitBiruName")}
                    onChange={(e) => setAtlitBiruName(e.target.value)}
                    onBlur={() => {
                      setFocusedField(null);
                      triggerAutoSave();
                    }}
                    placeholder="FAJAR NUGRAHA..."
                    className="w-full bg-[#02091c] border border-blue-900/80 focus:border-cyan-400 rounded-lg px-2.5 py-1 font-sans font-black text-white placeholder-blue-300/20 focus:outline-none text-[11px] uppercase tracking-wide shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[7.5px] uppercase font-bold tracking-widest text-cyan-200/70">
                    KONTINGEN
                  </label>
                  <input
                    id="sekretaris-kontingen-biru-input"
                    type="text"
                    value={kontingenBiru}
                    onFocus={() => setFocusedField("kontingenBiru")}
                    onChange={(e) => setKontingenBiru(e.target.value)}
                    onBlur={() => {
                      setFocusedField(null);
                      triggerAutoSave();
                    }}
                    placeholder="DI YOGYAKARTA..."
                    className="w-full bg-[#02091c] border border-blue-900/80 focus:border-cyan-400 rounded-lg px-2.5 py-1 font-sans font-black text-white placeholder-blue-300/20 focus:outline-none text-[11px] uppercase tracking-wide shadow-inner"
                  />
                </div>
              </div>

              {/* CEK PARTAI SELANJUTNYA */}
              <button
                type="button"
                onClick={() => { sound.playClick(); setShowNextMatchesModal(true); }}
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 py-1.5 px-2.5 rounded-lg font-sans font-black text-[10.5px] uppercase tracking-widest hover:shadow-[0_0_15px_rgba(245,158,11,0.5)] duration-300 flex items-center justify-center gap-1.5 cursor-pointer border border-yellow-300/60 shadow-md active:scale-95"
              >
                <Search className="w-3 h-3" />
                CEK PARTAI SELANJUTNYA
              </button>
            </div>

            {/* SUDUT MERAH COLUMN */}
            <div className="flex flex-col gap-1.5">
              {/* SUDUT MERAH BOX */}
              <div className="bg-gradient-to-br from-[#450d1e] via-[#290812] to-[#140308] border-2 border-rose-500/50 rounded-xl p-2.5 shadow-[0_0_20px_rgba(244,63,94,0.2)] relative overflow-hidden flex flex-col gap-1.5">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-400"></div>

                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,1)] animate-pulse"></div>
                  <span className="text-[10px] font-sans font-black tracking-widest text-rose-300 uppercase drop-shadow">
                    SUDUT MERAH
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[7.5px] uppercase font-bold tracking-widest text-rose-200/70">
                    NAMA ATLIT
                  </label>
                  <input
                    id="sekretaris-atlit-merah-input"
                    type="text"
                    value={atlitMerahName}
                    onFocus={() => setFocusedField("atlitMerahName")}
                    onChange={(e) => setAtlitMerahName(e.target.value)}
                    onBlur={() => {
                      setFocusedField(null);
                      triggerAutoSave();
                    }}
                    placeholder="EKO WAHYUDI..."
                    className="w-full bg-[#1c040b] border border-rose-950 focus:border-rose-500 rounded-lg px-2.5 py-1 font-sans font-black text-white placeholder-red-300/20 focus:outline-none text-[11px] uppercase tracking-wide shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[7.5px] uppercase font-bold tracking-widest text-rose-200/70">
                    KONTINGEN
                  </label>
                  <input
                    id="sekretaris-kontingen-merah-input"
                    type="text"
                    value={kontingenMerah}
                    onFocus={() => setFocusedField("kontingenMerah")}
                    onChange={(e) => setKontingenMerah(e.target.value)}
                    onBlur={() => {
                      setFocusedField(null);
                      triggerAutoSave();
                    }}
                    placeholder="BALI..."
                    className="w-full bg-[#1c040b] border border-rose-950 focus:border-rose-500 rounded-lg px-2.5 py-1 font-sans font-black text-white placeholder-red-300/20 focus:outline-none text-[11px] uppercase tracking-wide shadow-inner"
                  />
                </div>
              </div>

              {/* NAVIGASI PREV & NEXT MATCH */}
              <div className="grid grid-cols-2 gap-1.5 w-full">
                <button
                  type="button"
                  onClick={() => { sound.playClick(); handleNavigateMatch("PREV"); }}
                  className="bg-gradient-to-r from-orange-700 to-amber-700 hover:from-orange-600 hover:to-amber-600 text-white py-1.5 px-2.5 rounded-lg font-sans font-black text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1 duration-300 cursor-pointer border border-orange-500/40 shadow-sm active:scale-95"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  PREV
                </button>

                <button
                  type="button"
                  onClick={() => { sound.playClick(); handleNavigateMatch("NEXT"); }}
                  className="bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white py-1.5 px-2.5 rounded-lg font-sans font-black text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1 duration-300 cursor-pointer border border-emerald-500/40 shadow-sm active:scale-95"
                >
                  NEXT
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: KONTROL UTAMA JALANNYA TANDING & LOG HISTORY */}
        <div className="flex flex-col gap-2" id="sekretaris-controls-col">
          
          {/* STATUS & MONITOR PERTANDINGAN ARENA (SINKRONISASI TIMER OPERATOR) */}
          <section className="bg-[#07112a]/95 backdrop-blur-sm border-2 border-blue-500/40 rounded-xl p-2.5 sm:p-3 shadow-[0_0_25px_rgba(37,99,235,0.2)] flex flex-col gap-2 relative" id="sekretaris-arena-monitor-box">
            
            <div className="flex items-center justify-between border-b border-blue-950/60 pb-1">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <h2 className="text-[11px] uppercase font-sans font-black tracking-widest text-white drop-shadow">
                  MONITOR STATUS ARENA & TIMER
                </h2>
              </div>
              <span className="text-[8px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                SINKRON MEJA
              </span>
            </div>

            {/* STATUS LAGA BADGE Row */}
            <div className="flex items-center justify-between bg-[#030716] border border-blue-900/60 p-1.5 rounded-lg">
              <div>
                <span className="text-[7px] text-cyan-300/60 uppercase block font-black">STATUS LAGA ARENA:</span>
                <span className="text-[9px] uppercase font-black flex items-center gap-1 font-mono text-[#facc15]">
                  <span className={`w-1.5 h-1.5 rounded-full ${state?.status === MatchStatus.RUNNING ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`}></span>
                  {state?.status === MatchStatus.RUNNING 
                    ? "● LAGA JALAN / AKTIF" 
                    : state?.status === MatchStatus.FINISHED 
                    ? "● PERTANDINGAN SELESAI" 
                    : "● LAGA DIKUNCI / JEDA"}
                </span>
              </div>
              <div className={`px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase font-mono border ${
                (!state?.juryPanelLocked && !state?.dewanPanelLocked)
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(0, 128, 0,0.2)]" 
                  : "bg-rose-950/80 text-rose-400 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]"
              }`}>
                {(!state?.juryPanelLocked && !state?.dewanPanelLocked) ? "UNLOCKED" : "LOCKED"}
              </div>
            </div>

            {/* BIG ARENA LED CLOCK DISPLAY (MONITOR SYNC WITH OPERATOR) */}
            <div className="bg-[#020512] border-2 border-blue-950/90 py-2.5 px-3 rounded-xl flex flex-col items-center justify-center gap-0.5 relative shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]">
              <div className="text-[38px] font-mono font-black text-[#facc15] tracking-wider leading-none select-none drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]">
                {state ? formatTime(state.timeLeft) : "02:00"}
              </div>
              <div className="text-[7.5px] font-mono font-bold text-cyan-300/50 uppercase tracking-[0.2em] block">
                ARENA LED TIMER • BABAK {state?.activeRound || 1}
              </div>
              <div className="text-[8px] text-cyan-200/70 font-sans italic mt-0.5 text-center">
                Waktu & ritme pertandingan dikendalikan oleh <span className="font-bold text-amber-300">Timer Pertandingan</span>
              </div>
            </div>

            {/* ACTION BUTTON TO OPEN OPERATOR PANEL */}
            {onOpenOperatorPanel && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onOpenOperatorPanel();
                }}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 text-white font-sans font-black text-[10.5px] uppercase tracking-wider py-2 px-3 rounded-lg shadow-[0_0_15px_rgba(0, 128, 0,0.35)] transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-400/50 active:scale-95"
              >
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>BUKA PANEL TIMER PERTANDINGAN ➔</span>
              </button>
            )}

            {/* LOCK / UNLOCK TOGGLE FOR SECRETARY */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={async () => {
                  sound.playClick();
                  try {
                    const arePanelsLocked = !!(state?.juryPanelLocked || state?.dewanPanelLocked);
                    const targetLock = !arePanelsLocked;
                    const updates: Partial<MatchState> = {
                      juryPanelLocked: targetLock,
                      dewanPanelLocked: targetLock,
                      ...(!targetLock ? { showRoundOverPopup: false, showNextMatchPopup: false } : {})
                    };
                    await onUpdateMetadata(updates);
                    if (targetLock) {
                      notifyToast("🔒 PANEL JURI & DEWAN BERHASIL DIKUNCI!");
                    } else {
                      notifyToast("🔓 PANEL JURI DAN DEWAN SEKARANG TERBUKA!");
                    }
                    fetch("/api/match-state/update", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(updates)
                    }).catch(() => {});
                  } catch (err) {
                    console.error(err);
                  }
                }}
                disabled={state?.status === MatchStatus.RUNNING}
                className={`py-1.5 px-2 rounded-lg font-sans font-black text-[9.5px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all border ${
                  state?.status === MatchStatus.RUNNING
                    ? "bg-blue-950/30 text-blue-800/50 cursor-not-allowed pointer-events-none border-blue-950"
                    : (state?.juryPanelLocked || state?.dewanPanelLocked)
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white border-emerald-400/60 cursor-pointer shadow"
                    : "bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white border-amber-400/60 cursor-pointer shadow"
                }`}
              >
                {(state?.juryPanelLocked || state?.dewanPanelLocked) ? (
                  <>
                    <Unlock className="w-3 h-3" />
                    <span>BUKA KUNCI</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>KUNCI PANEL</span>
                  </>
                )}
              </button>

              {/* UNDUH PDF FOR ACTUAL PARTAI */}
              <button
                onClick={downloadMatchPdfReport}
                className="bg-[#050d24] hover:bg-[#0c1c44] border border-blue-900/60 text-cyan-300/80 hover:text-cyan-200 py-1.5 px-2 rounded-lg text-[8.5px] font-sans font-black uppercase tracking-wider flex items-center justify-center gap-1 duration-200 cursor-pointer"
              >
                <Printer className="w-3 h-3 text-[#facc15]" />
                <span>UNDUH PDF PARTAI</span>
              </button>
            </div>
          </section>

          {/* HISTORY SECTION - ARENA LED */}
          <section className="bg-[#07112a]/90 backdrop-blur-sm border border-blue-500/30 p-2.5 sm:p-3 rounded-xl flex flex-col gap-1.5 relative shadow-[0_0_15px_rgba(37,99,235,0.1)]">
            <div className="flex items-center justify-between border-b border-blue-950/60 pb-1 mb-0.5 flex-wrap gap-1">
              <div className="flex items-center gap-1">
                <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
                <h3 className="text-[11px] font-black tracking-widest uppercase text-white drop-shadow">
                  Histori Hasil Tanding ({finishedMatchesHistory.length})
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase font-sans">
                <button 
                  onClick={() => {
                    if (state) offlineEngine.archiveFinishedMatchOffline(state);
                    fetchSchedules();
                    notifyToast("✅ Data pertandingan diarsipkan ke Histori Hasil Tanding!");
                  }}
                  className="text-cyan-400 hover:text-cyan-200 bg-cyan-950/50 border border-cyan-500/30 px-1.5 py-0.5 rounded cursor-pointer"
                  title="Segarkan & Arsipkan Partai Selesai"
                >
                  Arsipkan
                </button>
                <button 
                  onClick={downloadAllFinishedMatchesPdf}
                  className="text-amber-300 hover:text-amber-200 bg-amber-950/50 border border-amber-500/30 px-1.5 py-0.5 rounded cursor-pointer"
                  title="Unduh Sekaligus Semua Partai Selesai (PDF)"
                >
                  📥 Semua PDF
                </button>
                <button 
                  onClick={downloadAllFinishedMatchesExcel}
                  className="text-emerald-400 hover:text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded cursor-pointer"
                  title="Unduh Sekaligus Semua Partai Selesai (Excel)"
                >
                  📥 Semua Excel
                </button>
              </div>
            </div>

            {/* BANNER PERSIAPAN OTOMATIS PARTAI SELANJUTNYA */}
            {(state?.status === MatchStatus.FINISHED || state?.showNextMatchPopup) && (
              <div className="bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-blue-950/80 border border-emerald-500/40 rounded-lg p-2 flex items-center justify-between gap-2 animate-fadeIn">
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono font-black uppercase text-emerald-300 tracking-wider">
                    {state?.status === MatchStatus.FINISHED
                      ? "⚡ OTOMATIS BERALIH KE PERSIAPAN PARTAI SELANJUTNYA..."
                      : `✅ PERSIAPAN PARTAI SELANJUTNYA SIAP (${formatPartaiDisplay(state?.matchNumber)})`}
                  </span>
                  <span className="text-[9px] font-sans font-bold text-white uppercase">
                    {state?.fighterRedName || "PESILAT MERAH"} vs {state?.fighterBlueName || "PESILAT BIRU"}
                  </span>
                </div>
                {state?.status === MatchStatus.FINISHED && (
                  <button
                    onClick={handleNextMatch}
                    disabled={nextMatchLoading}
                    className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans font-black text-[8px] uppercase tracking-wider cursor-pointer shrink-0"
                  >
                    Siapkan Sekarang
                  </button>
                )}
              </div>
            )}

            {/* HISTORY CARDS ITEMS LIST */}
            <div className="flex flex-col gap-1 max-h-[190px] overflow-y-auto pr-1" id="finished-matches-list">
              {finishedMatchesHistory.length === 0 ? (
                <div className="text-center py-3 text-cyan-300/30 text-[9px] uppercase font-bold italic font-sans">
                  Belum ada sejarah pertandingan usai...
                </div>
              ) : (
                finishedMatchesHistory.map((mItem, index) => {
                  return (
                    <div 
                      key={mItem.id || index}
                      className="bg-[#040c24] border border-blue-900/50 p-1.5 rounded-lg flex flex-col gap-0.5 relative group hover:border-cyan-400/50 duration-200 transition-all"
                    >
                      <div className="flex items-center justify-between text-[7px] text-cyan-300/60">
                        <span className="font-sans font-extrabold uppercase">
                          {formatPartaiDisplay(mItem.matchNumber)} • {mItem.stage}
                        </span>
                        <span className="font-mono font-bold block text-[6.5px] text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded border border-amber-400/20">
                          SELESAI DIARSIPKAN
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[9.5px] font-sans font-black">
                        <span className="text-red-400 truncate max-w-[85px]" title={mItem.fighterRedName || getParticipantName(mItem.fighterRedId)}>
                          {mItem.fighterRedName || getParticipantName(mItem.fighterRedId)}
                        </span>
                        <span className="font-mono text-[9px] text-[#facc15] bg-black/60 px-1.5 py-0.5 rounded border border-blue-950">
                          {mItem.scoreRed ?? 0} - {mItem.scoreBlue ?? 0}
                        </span>
                        <span className="text-cyan-400 truncate max-w-[85px] text-right" title={mItem.fighterBlueName || getParticipantName(mItem.fighterBlueId)}>
                          {mItem.fighterBlueName || getParticipantName(mItem.fighterBlueId)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-0.5 gap-1 flex-wrap">
                        <span className="text-[7px] font-bold text-amber-400 uppercase tracking-widest block font-mono">
                          {getFighterWinnerMessage(mItem)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              sound.playClick();
                              setSelectedArchiveJuryStats(mItem);
                            }}
                            className="text-[7px] bg-blue-950/80 text-cyan-300 hover:text-white font-sans font-bold flex items-center gap-0.5 border border-blue-800/60 px-1 py-0.5 rounded cursor-pointer transition-colors"
                            title="Lihat Rekap Penekanan Juri (Pukulan & Tendangan)"
                          >
                            <Activity className="w-2 h-2 text-cyan-400" />
                            Rekap Juri
                          </button>
                          <button
                            onClick={() => downloadMatchPdfReport(mItem)}
                            className="text-[7px] bg-[#091538] text-cyan-200 hover:text-[#facc15] font-sans font-bold flex items-center gap-0.5 border border-blue-900/50 px-1 py-0.5 rounded cursor-pointer"
                            title="Unduh Laporan PDF Partai Ini"
                          >
                            <FileText className="w-2 h-2 text-[#facc15]" />
                            Unduh PDF
                          </button>
                          <button
                            onClick={() => downloadSingleMatchExcel(mItem)}
                            className="text-[7px] bg-emerald-950/70 text-emerald-300 hover:text-white font-sans font-bold flex items-center gap-0.5 border border-emerald-700/50 px-1 py-0.5 rounded cursor-pointer"
                            title="Unduh Data Excel Partai Ini"
                          >
                            <FileSpreadsheet className="w-2 h-2 text-emerald-400" />
                            Excel
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* BATCH DOWNLOAD ALL & DELETE ALL HISTORY */}
            <div className="grid grid-cols-2 gap-1.5 mt-0.5">
              <button
                onClick={downloadAllFinishedMatchesPdf}
                className="bg-[#091b3a] border border-cyan-500/40 hover:bg-[#0e2958] text-cyan-200 hover:text-white py-1.5 px-2 rounded-xl text-[8.5px] font-sans font-black uppercase tracking-wider flex items-center justify-center gap-1 duration-200 cursor-pointer"
                title="Unduh Sekaligus Semua Partai yang Telah Selesai Bertanding (PDF)"
              >
                <Download className="w-3 h-3 text-[#facc15]" />
                Unduh Semua Partai
              </button>
              <button
                onClick={handleClearHistory}
                className="bg-[#1c040b] border border-rose-950/80 hover:bg-[#2b0813] text-rose-300/70 hover:text-rose-300 py-1.5 px-2 rounded-xl text-[8.5px] font-sans font-black uppercase tracking-wider flex items-center justify-center gap-1 duration-200 cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                Hapus Sejarah
              </button>
            </div>
          </section>

          {/* VISUALISASI RECHARTS SKOR JALANNYA TANDING - MOVED BELOW HISTORI HASIL TANDING */}
          <ScoreVisualization state={state} />
        </div>
      </main>
      )}



      {/* MODAL ARSIP DETAIL PENEKANAN JURI */}
      {selectedArchiveJuryStats && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e0724] border border-purple-800/60 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(124,58,237,0.3)] flex flex-col p-5 sm:p-6 animate-scaleIn relative overflow-hidden max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-purple-900/60 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-black tracking-wider text-white text-sm sm:text-base uppercase">
                    Rekapitulasi Penekanan Juri (Arsip)
                  </h3>
                  <p className="text-[10px] text-purple-300/70 font-mono uppercase">
                    {formatPartaiDisplay(selectedArchiveJuryStats.matchNumber)} • {selectedArchiveJuryStats.stage} • {selectedArchiveJuryStats.classCategory || "Tanding"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setSelectedArchiveJuryStats(null);
                }}
                className="w-8 h-8 rounded-xl bg-purple-950/60 border border-purple-700/40 hover:bg-rose-950/80 hover:border-rose-500 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {/* Match info header */}
            <div className="grid grid-cols-2 gap-3 bg-[#150a30] p-3 rounded-xl border border-purple-900/40 mb-4">
              {/* Blue Fighter */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="bg-blue-600 text-[9px] font-black text-white px-2 py-0.5 rounded">
                    SUDUT BIRU
                  </span>
                  <span className="font-bold text-xs text-blue-200 truncate">
                    {selectedArchiveJuryStats.fighterBlueName || getParticipantName(selectedArchiveJuryStats.fighterBlueId)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Skor Akhir: <strong className="text-[#facc15] font-digital text-sm">{selectedArchiveJuryStats.scoreBlue ?? 0}</strong>
                </span>
              </div>

              {/* Red Fighter */}
              <div className="flex flex-col items-end text-right">
                <div className="flex items-center gap-1.5 mb-1 justify-end">
                  <span className="font-bold text-xs text-red-200 truncate">
                    {selectedArchiveJuryStats.fighterRedName || getParticipantName(selectedArchiveJuryStats.fighterRedId)}
                  </span>
                  <span className="bg-red-600 text-[9px] font-black text-white px-2 py-0.5 rounded">
                    SUDUT MERAH
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Skor Akhir: <strong className="text-[#facc15] font-digital text-sm">{selectedArchiveJuryStats.scoreRed ?? 0}</strong>
                </span>
              </div>
            </div>

            {/* Table of Jury Presses */}
            <div className="overflow-x-auto flex-1 min-h-0 border border-purple-950 rounded-xl bg-[#090318]">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-[#1b0d3d] text-purple-200 uppercase font-sans font-black text-[9.5px] border-b border-purple-900/50">
                  <tr>
                    <th className="p-2.5">Perangkat Juri</th>
                    <th className="p-2.5 text-center text-blue-400">Pukulan Biru</th>
                    <th className="p-2.5 text-center text-blue-400">Tendangan Biru</th>
                    <th className="p-2.5 text-center text-red-400">Pukulan Merah</th>
                    <th className="p-2.5 text-center text-red-400">Tendangan Merah</th>
                    <th className="p-2.5 text-center text-amber-400">Total Input</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-950/60 font-mono">
                  {[
                    { id: "Juri 1", stats: selectedArchiveJuryStats.juryPressStats?.juri1 },
                    { id: "Juri 2", stats: selectedArchiveJuryStats.juryPressStats?.juri2 },
                    { id: "Juri 3", stats: selectedArchiveJuryStats.juryPressStats?.juri3 },
                  ].map((row, idx) => {
                    const s = row.stats || { bluePunch: 0, blueKick: 0, redPunch: 0, redKick: 0, total: 0 };
                    return (
                      <tr key={idx} className="hover:bg-purple-950/30 transition-colors">
                        <td className="p-2.5 font-bold font-sans text-purple-300 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                          {row.id}
                        </td>
                        <td className="p-2.5 text-center text-blue-300 font-bold bg-blue-950/20">{s.bluePunch || 0}</td>
                        <td className="p-2.5 text-center text-blue-300 font-bold bg-blue-950/20">{s.blueKick || 0}</td>
                        <td className="p-2.5 text-center text-red-300 font-bold bg-red-950/20">{s.redPunch || 0}</td>
                        <td className="p-2.5 text-center text-red-300 font-bold bg-red-950/20">{s.redKick || 0}</td>
                        <td className="p-2.5 text-center text-[#facc15] font-black bg-amber-950/20">{s.total || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#180b36] font-bold text-slate-200 border-t-2 border-purple-800/60">
                  <tr>
                    <td className="p-2.5 font-sans uppercase text-[10px] text-purple-300 font-black">Kumulatif Partai</td>
                    <td className="p-2.5 text-center text-blue-400 font-black">
                      {selectedArchiveJuryStats.juryPressStats?.totalBluePunches ?? 
                        ((selectedArchiveJuryStats.juryPressStats?.juri1?.bluePunch || 0) + 
                         (selectedArchiveJuryStats.juryPressStats?.juri2?.bluePunch || 0) + 
                         (selectedArchiveJuryStats.juryPressStats?.juri3?.bluePunch || 0))}
                    </td>
                    <td className="p-2.5 text-center text-blue-400 font-black">
                      {selectedArchiveJuryStats.juryPressStats?.totalBlueKicks ?? 
                        ((selectedArchiveJuryStats.juryPressStats?.juri1?.blueKick || 0) + 
                         (selectedArchiveJuryStats.juryPressStats?.juri2?.blueKick || 0) + 
                         (selectedArchiveJuryStats.juryPressStats?.juri3?.blueKick || 0))}
                    </td>
                    <td className="p-2.5 text-center text-red-400 font-black">
                      {selectedArchiveJuryStats.juryPressStats?.totalRedPunches ?? 
                        ((selectedArchiveJuryStats.juryPressStats?.juri1?.redPunch || 0) + 
                         (selectedArchiveJuryStats.juryPressStats?.juri2?.redPunch || 0) + 
                         (selectedArchiveJuryStats.juryPressStats?.juri3?.redPunch || 0))}
                    </td>
                    <td className="p-2.5 text-center text-red-400 font-black">
                      {selectedArchiveJuryStats.juryPressStats?.totalRedKicks ?? 
                        ((selectedArchiveJuryStats.juryPressStats?.juri1?.redKick || 0) + 
                         (selectedArchiveJuryStats.juryPressStats?.juri2?.redKick || 0) + 
                         (selectedArchiveJuryStats.juryPressStats?.juri3?.redKick || 0))}
                    </td>
                    <td className="p-2.5 text-center text-[#facc15] font-black text-xs">
                      {selectedArchiveJuryStats.juryPressStats?.totalPresses ?? 
                        ((selectedArchiveJuryStats.juryPressStats?.juri1?.total || 0) + 
                         (selectedArchiveJuryStats.juryPressStats?.juri2?.total || 0) + 
                         (selectedArchiveJuryStats.juryPressStats?.juri3?.total || 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-purple-900/60">
              <span className="text-[10px] text-purple-400/60 font-sans italic">
                *Data penekanan juri dicatat dan diarsipkan otomatis saat partai tanding selesai.
              </span>
              <button
                onClick={() => {
                  sound.playClick();
                  setSelectedArchiveJuryStats(null);
                }}
                className="bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* OVERLAY PARAMETER JADWAL PERTANDINGAN */}
      {showGenerateJadwalOverlay && (
        <GenerateJadwalTab
          schedules={schedules}
          setSchedules={setSchedules}
          participants={participants}
          setParticipants={setParticipants}
          categories={categories}
          setCategories={setCategories}
          scheduleGelanggang={scheduleGelanggang}
          setScheduleGelanggang={setScheduleGelanggang}
          onClose={() => setShowGenerateJadwalOverlay(false)}
          getParticipantName={getParticipantName}
          getParticipantClub={getParticipantClub}
          downloadSchedulePdf={downloadSchedulePdf}
          loadScheduleMatchItem={loadScheduleMatchItem}
          notifyToast={notifyToast}
          onUploadExcel={handleUploadBaganExcel}
          onDownloadTemplate={downloadSampleExcel}
          onSyncAllBrackets={handleSyncAllBrackets}
          onOpenBaganScreen={() => {
            sound.playClick();
            setShowBaganScreen(true);
            setShowGenerateJadwalOverlay(false);
          }}
        />
      )}

      {/* OVERLAY INPUT DATA ATLIT & SINKRONISASI - DEACTIVATED & PERMANENTLY REMOVED */}
      {false && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0c041f]/95 border border-[#7c3aed]/50 rounded-[28px] w-full max-w-5xl shadow-[0_0_60px_rgba(124,58,237,0.25)] flex flex-col p-6 animate-scaleIn relative overflow-hidden my-auto max-h-[92vh]">
            
            {/* Ambient Background subtle colors */}
            <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" />

            {/* TITLE BAR */}
            <div className="flex items-center justify-between border-b border-purple-950 pb-4 mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <PlusCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sans font-black tracking-widest text-[#f8fafc] text-[14px] uppercase m-0 leading-none">
                    INTEGRASI & INPUT DATA ATLIT TURNAMEN
                  </h3>
                  <p className="text-[9px] text-[#8c62ff]/65 uppercase font-bold tracking-wider m-0 mt-1.5">
                    OVERLAY PENYINKRONISASI EXCEL & MANUAL INPUT KE DATABASE LOCALHOST
                  </p>
                </div>
              </div>
              <button
                onClick={() => { sound.playClick(); setShowInputAtlitOverlay(false); }}
                className="w-8 h-8 rounded-xl bg-purple-950/40 border border-purple-500/20 hover:border-rose-500/50 hover:text-rose-400 text-purple-400 flex items-center justify-center cursor-pointer transition-all active:scale-90 text-[20px] leading-none"
              >
                &times;
              </button>
            </div>

            {/* SPLIT LAYOUT CONTAINER */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-2 relative z-10 max-h-[62vh] overflow-y-auto lg:overflow-y-visible">
              
              {/* LEFT COLUMN: MANUAL ENTRY FORM */}
              <div className="bg-[#12072a]/70 border border-purple-900/40 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-purple-950/60 pb-1.5">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                    MANUAL REGISTER ATLIT BARU
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8.5px] font-sans font-black uppercase tracking-widest text-purple-300/80">
                        NAMA LENGKAP ATLET
                      </label>
                      <input
                        type="text"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="CONTOH: EKO WAHYUDI"
                        className="bg-[#180935] border border-purple-900/60 text-slate-100 placeholder-purple-400/20 rounded-xl px-2.5 py-1.5 text-xs font-bold uppercase focus:outline-none focus:border-purple-500 transition-all font-sans"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[8.5px] font-sans font-black uppercase tracking-widest text-purple-300/80">
                        KONTINGEN / CLUB
                      </label>
                      <input
                        type="text"
                        value={manualClub}
                        onChange={(e) => setManualClub(e.target.value)}
                        placeholder="CONTOH: KONTINGEN ACEH UTARA"
                        className="bg-[#180935] border border-purple-900/60 text-slate-100 placeholder-purple-400/20 rounded-xl px-2.5 py-1.5 text-xs font-bold uppercase focus:outline-none focus:border-purple-500 transition-all font-sans"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8.5px] font-sans font-black uppercase tracking-widest text-purple-300/80">
                        JENIS KELAMIN (GENDER)
                      </label>
                      <select
                        value={manualGender}
                        onChange={(e) => setManualGender(e.target.value as "PUTRA" | "PUTRI")}
                        className="bg-[#180935] border border-purple-900/60 text-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="PUTRA">PUTRA</option>
                        <option value="PUTRI">PUTRI</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[8.5px] font-sans font-black uppercase tracking-widest text-purple-300/80">
                        BERAT BADAN (KG)
                      </label>
                      <input
                        type="number"
                        value={manualWeight}
                        onChange={(e) => setManualWeight(Number(e.target.value) || 55)}
                        className="bg-[#180935] border border-purple-900/60 text-slate-100 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-purple-500 transition-all font-sans"
                      />
                    </div>
                  </div>

                  {/* CORE INCORPORATED GOLONGAN + KATEGORI + KELAS SELECTORS */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-sans font-black uppercase tracking-widest text-purple-300/80">
                        GOLONGAN
                      </label>
                      <select
                        value={manualDivision}
                        onChange={(e) => {
                          sound.playClick();
                          setManualDivision(e.target.value);
                        }}
                        className="bg-[#180935] border border-purple-900/60 text-slate-200 rounded-xl px-1.5 py-1.5 text-[10.5px] font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="USIA DINI">USIA DINI</option>
                        <option value="PRA-REMAJA">PRA-REMAJA</option>
                        <option value="REMAJA">REMAJA</option>
                        <option value="DEWASA">DEWASA</option>
                        <option value="MASTER">MASTER</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-sans font-black uppercase tracking-widest text-purple-300/80">
                        KATEGORI
                      </label>
                      <select
                        value={manualKategori}
                        onChange={(e) => {
                          sound.playClick();
                          setManualKategori(e.target.value);
                        }}
                        className="bg-[#180935] border border-purple-900/60 text-slate-200 rounded-xl px-1.5 py-1.5 text-[10.5px] font-bold focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="TANDING">TANDING</option>
                        <option value="SENI TUNGGAL">SENI TUNGGAL</option>
                        <option value="SENI GANDA">SENI GANDA</option>
                        <option value="SENI REGU">SENI REGU</option>
                        <option value="SOLO KREATIF">SOLO KREATIF</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-sans font-black uppercase tracking-widest text-[#facc15]">
                        KELAS
                      </label>
                      <select
                        value={manualCategoryClassId}
                        onChange={(e) => setManualCategoryClassId(e.target.value)}
                        className="bg-[#180935] border border-[#facc15]/30 text-slate-200 rounded-xl px-1.5 py-1.5 text-[10.5px] font-bold focus:outline-none focus:border-purple-500 cursor-pointer uppercase"
                      >
                        {(() => {
                          const DEFAULT_SILAT_CLASSES = [
                            { name: "Kelas A", minWeight: 45, maxWeight: 50 },
                            { name: "Kelas B", minWeight: 50, maxWeight: 55 },
                            { name: "Kelas C", minWeight: 55, maxWeight: 60 },
                            { name: "Kelas D", minWeight: 60, maxWeight: 65 },
                            { name: "Kelas E", minWeight: 65, maxWeight: 70 },
                            { name: "Kelas F", minWeight: 70, maxWeight: 75 },
                            { name: "Kelas G", minWeight: 75, maxWeight: 80 },
                            { name: "Kelas H", minWeight: 80, maxWeight: 85 },
                            { name: "Kelas I", minWeight: 85, maxWeight: 90 },
                            { name: "Kelas J", minWeight: 90, maxWeight: 100 },
                            { name: "Kelas Bebas", minWeight: 100, maxWeight: 155 }
                          ];

                          const defaultCatsToShow = DEFAULT_SILAT_CLASSES.map(c => {
                            const id = `cat-${c.name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;
                            return { id, name: c.name };
                          });

                          const combinedCategories = [...categories];
                          defaultCatsToShow.forEach(d => {
                            if (!combinedCategories.some(c => c.id === d.id)) {
                              combinedCategories.push({
                                id: d.id,
                                name: d.name,
                                minWeight: 45,
                                maxWeight: 100,
                                division: "Dewasa"
                              });
                            }
                          });

                          return combinedCategories.map((catItem) => (
                            <option key={catItem.id} value={catItem.id}>
                              {catItem.name.replace(/kelas\s*/gi, "").trim().toUpperCase()}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>

                  {/* GRID GELANGGANG YANG DIGUNAKAN */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[8px] font-sans font-black uppercase tracking-widest text-purple-300/80 flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5 text-amber-400" />
                        <span>GELANGGANG (ARENA TANDING)</span>
                      </label>
                      <span className="text-[8px] font-mono font-black text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/40 uppercase">
                        {manualArena}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {["GELANGGANG A", "GELANGGANG B", "GELANGGANG C", "GELANGGANG D"].map((arenaName, idx) => {
                        const letter = ["A", "B", "C", "D"][idx];
                        const isSelected = manualArena.toUpperCase() === arenaName;
                        return (
                          <button
                            key={arenaName}
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              setManualArena(arenaName);
                            }}
                            className={`py-1.5 rounded-lg font-black text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                              isSelected
                                ? "bg-amber-500 text-slate-950 border-amber-300 shadow-sm"
                                : "bg-[#180935] text-purple-300/60 border-purple-900/60 hover:text-purple-200"
                            }`}
                          >
                            GLG {letter}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddManualAthlete}
                    className="mt-1.5 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-sans font-black text-[11px] uppercase tracking-widest rounded-xl transition-all duration-200 shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border-none"
                  >
                    <Check className="w-3.5 h-3.5 text-slate-950 font-black" />
                    SIMPAN ATLIT MANUAL
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: EXCEL IMPORTER BRANDED */}
              <div className="bg-[#12072a]/70 border border-purple-900/40 rounded-2xl p-4 flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between border-b border-purple-950/60 pb-1.5">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-pink-400 animate-pulse" />
                      <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                        IMPOR EXCEL (.XLSX)
                      </span>
                    </div>
                    {/* Small download template integrated link */}
                    <button
                      type="button"
                      onClick={downloadSampleExcel}
                      className="text-[#facc15] hover:text-[#fde047] text-[10px] font-sans font-black uppercase tracking-widest cursor-pointer bg-transparent border-none p-0 flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-pink-500" />
                      UNDUH TEMPLATE
                    </button>
                  </div>

                  <p className="text-[9px] text-purple-300/60 uppercase font-sans font-bold leading-relaxed m-0">
                    Sistem otomatis mengurai, merakit bagan, dan divalidkan ke database secara instan.
                  </p>

                  {/* DROPZONE INPUT - CONDENSED */}
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-800/40 hover:border-purple-500 bg-purple-950/15 hover:bg-purple-900/20 duration-200 transition-all rounded-xl p-4 text-center cursor-pointer relative group">
                    <Upload className="w-6 h-6 text-pink-500 group-hover:scale-110 duration-200 mb-1" />
                    <span className="text-[10px] font-sans font-black text-slate-200 uppercase tracking-widest block">
                      UNGGAH FILE DATA EXCEL / DRAG
                    </span>
                    
                    {/* PLACED EXACTLY BELOW THE DRAG TEXT */}
                    <div className="mt-2 bg-yellow-950/40 border border-yellow-600/30 rounded-lg p-2 max-w-[280px]">
                      <p className="text-[7.5px] uppercase font-black text-[#facc15] leading-normal m-0 font-mono">
                        ⚠️ Harap gunakan kolom template agar data tanding atau atlet terbaca 100% akurat.
                      </p>
                    </div>

                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadBaganExcel(e);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

            </div>

            {/* LOWER SECTION: RUNTIME TABLE OF CURRENT ATHLETES */}
            <div className="mt-4 pt-4 border-t border-purple-950 flex flex-col gap-3 relative z-10 flex-grow overflow-hidden min-h-[200px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10.5px] font-sans font-black tracking-widest text-[#facc15] uppercase">
                    DAFTAR ATLET DALAM SISTEM ({participants.length} ORANG)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteAllAthletes}
                  className="bg-rose-950/20 hover:bg-rose-950 border border-rose-900/50 text-rose-300 hover:text-rose-100 font-sans font-bold px-3 py-1 text-[9px] uppercase rounded-lg cursor-pointer transition-all border-none"
                >
                  KOSONGKAN SEMUA
                </button>
              </div>

              {/* ATHLETES TABLE LIST */}
              <div className="flex-grow overflow-y-auto max-h-[220px] border border-purple-950/50 rounded-xl bg-[#090317] scrollbar-thin scrollbar-thumb-purple-950">
                {participants.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono italic m-0">
                      [ DATABASE DATA ATLET KOSONG • SILAKAN IMPOR ATAU INPUT MANUAL ]
                    </p>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-purple-950/60 bg-purple-950/20 text-[8px] text-purple-400 font-mono uppercase tracking-[0.15em]">
                        <th className="p-2.5 pl-4">NO</th>
                        <th className="p-2.5">NAMA ATLIT</th>
                        <th className="p-2.5">KONTINGEN</th>
                        <th className="p-2.5 text-center">GENDER</th>
                        <th className="p-2.5">KELAS tanding</th>
                        <th className="p-2.5 text-right pr-4">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="text-[9.5px] text-slate-300 font-sans font-bold uppercase divide-y divide-purple-950/30">
                      {participants.map((ath, iIndex) => {
                        const classObj = categories.find(c => c.id === ath.categoryClassId);
                        return (
                          <tr key={ath.id} className="hover:bg-purple-950/10">
                            <td className="p-2.5 pl-4 font-mono text-purple-400">#{iIndex + 1}</td>
                            <td className="p-2.5 text-white font-extrabold tracking-wide">{ath.name}</td>
                            <td className="p-2.5 text-slate-300">{ath.club}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                ath.gender === "PUTRA" 
                                  ? "bg-blue-950/70 text-blue-400 border border-blue-900/30" 
                                  : "bg-pink-950/70 text-pink-400 border border-pink-900/30"
                              }`}>
                                {ath.gender}
                              </span>
                            </td>
                            <td className="p-2.5 text-purple-300">{classObj ? classObj.name : ath.categoryClassId}</td>
                            <td className="p-2.5 text-right pr-4">
                              <button
                                type="button"
                                onClick={() => handleDeleteAthleteItem(ath.id)}
                                className="w-6 h-6 rounded bg-rose-950/30 hover:bg-rose-950 text-rose-400 flex items-center justify-center cursor-pointer ml-auto border-none active:scale-90 duration-100"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* BUTTON BAR */}
            <div className="mt-5 pt-3 border-t border-purple-950/60 flex flex-wrap items-center justify-between gap-3 relative z-10 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncDatabase}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 text-[10px] sm:text-xs rounded-xl font-sans font-black uppercase tracking-widest transition-all duration-200 shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 border-none"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sinkronisasi
                </button>

                <button
                  type="button"
                  onClick={downloadSchedulePdf}
                  className="px-4 py-2 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-white text-[10px] sm:text-xs rounded-xl font-sans font-black uppercase tracking-widest transition-all duration-200 shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 border-none"
                >
                  <Download className="w-3.5 h-3.5 text-pink-300" />
                  Unduh Jadwal (PDF)
                </button>
              </div>

              <button
                type="button"
                onClick={() => { sound.playClick(); setShowInputAtlitOverlay(false); }}
                className="px-5 py-2.5 bg-[#170a32] border border-purple-950/40 hover:bg-[#25114d] text-[10px] sm:text-xs rounded-xl font-sans font-black uppercase tracking-widest hover:text-white text-slate-300 duration-200 cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>

          </div>
        </div>
      )}






      {/* LOGOUT CONFIRMATION DIALOG GUEST */}
      {showNextMatchesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0f0724] border border-[#5d1ec4]/60 rounded-2xl w-full max-w-lg shadow-[0_15px_50px_rgba(93,30,196,0.3)] flex flex-col p-6 animate-fadeIn">
            
            <div className="flex items-center justify-between border-b border-purple-950 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-500" />
                <h3 className="font-sans font-black tracking-widest text-[#f8fafc] text-xs uppercase">
                  PILIH JADWAL PARTAI PERTANDINGAN
                </h3>
              </div>
              <button
                onClick={() => setShowNextMatchesModal(false)}
                className="w-7 h-7 rounded-lg bg-purple-950/20 border border-purple-500/20 hover:border-purple-400 text-purple-400 flex items-center justify-center cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-[10px] text-purple-300/40 uppercase mb-4 font-bold tracking-wider">
              Daftar partai pertandingan yang terdaftar pada database sistem IPSI:
            </p>

            <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto">
              {schedules.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-[11px] text-purple-300/30 uppercase font-black italic">
                    Belum ada jadwal pertandingan terdaftar!
                  </p>
                  <button
                    onClick={() => { setShowNextMatchesModal(false); handleGenerateTournamentData("BAGAN"); }}
                    className="mt-3 px-3.5 py-2 bg-purple-900/30 border border-purple-500/40 text-[10px] font-sans font-bold rounded-lg text-purple-200"
                  >
                    Generate Jadwal Mock Sekarang
                  </button>
                </div>
              ) : (
                schedules.map((matchItem, idx) => {
                  const isCurrent = matchItem.matchNumber === partaiNumber;
                  return (
                    <div
                      key={matchItem.id || idx}
                      onClick={() => loadScheduleMatchItem(matchItem.id)}
                      className={`p-3 rounded-xl border cursor-pointer duration-200 relative transition-all ${
                        isCurrent
                          ? "bg-purple-950/60 border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.3)] text-purple-200"
                          : "bg-purple-950/20 border-purple-950/60 hover:bg-purple-900/20 hover:border-purple-800"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="font-sans font-extrabold uppercase">
                          {formatPartaiDisplay(matchItem.matchNumber)} • {matchItem.stage}
                        </span>
                        <span className={`px-2 py-0.5 rounded-[5px] text-[8px] font-bold uppercase ${
                          matchItem.status === "SELESAI" 
                            ? "bg-emerald-950/50 text-emerald-400 border border-emerald-500/30"
                            : matchItem.status === "SEDANG"
                            ? "bg-amber-950/50 text-[#facc15] border border-amber-500/30 animate-pulse"
                            : "bg-slate-900 text-slate-400"
                        }`}>
                          {matchItem.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-red-500 font-black uppercase text-[12.5px]">
                          {getParticipantName(matchItem.fighterRedId) || "ATLIT MERAH"}
                        </span>
                        <span className="text-yellow-400 font-black uppercase tracking-widest mx-2.5 text-[11px] drop-shadow-[0_0_8px_rgba(250,204,21,0.45)]">vs</span>
                        <span className="text-blue-500 font-black uppercase text-[12.5px]">
                          {getParticipantName(matchItem.fighterBlueId) || "ATLIT BIRU"}
                        </span>
                      </div>

                      {matchItem.winner && (
                        <div className="text-[8.5px] text-[#facc15] uppercase font-bold tracking-widest mt-1 block">
                          PEMENANG: SUDUT {matchItem.winner}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-5 pt-3.5 border-t border-purple-950 flex justify-end">
              <button
                onClick={() => setShowNextMatchesModal(false)}
                className="px-4 py-2 bg-slate-950 border border-purple-900/40 text-xs rounded-xl font-bold uppercase hover:bg-slate-900/50 text-slate-400 hover:text-slate-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}


      {showResetConfirmModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1a0c10] border-2 border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-[0_0_35px_rgba(239,68,68,0.25)] flex flex-col gap-4 relative animate-scale-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-sans font-black text-sm uppercase tracking-wider text-rose-300">
                Konfirmasi Reset & Kunci
              </h3>
            </div>

            <p className="font-sans text-xs text-slate-300 leading-relaxed font-semibold">
              Apakah Anda yakin ingin mereset pertandingan serta mengunci layar Juri dan Dewan?
            </p>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setShowResetConfirmModal(false);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-purple-950/40 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95"
              >
                Batal / Tidak
              </button>
              <button
                onClick={async () => {
                  sound.playClick();
                  try {
                    await onResetMatch();
                    await onUpdateMetadata({ juryPanelLocked: true, dewanPanelLocked: true });
                    notifyToast("🔄 PERTANDINGAN BERHASIL DI-RESET & LAYAR JURI/DEWAN DIKUNCI!");
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setShowResetConfirmModal(false);
                  }
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_20px_rgba(244,63,94,0.45)] transition-all active:scale-95 border-none"
              >
                Iya, Reset & Kunci
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
