/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Calendar, 
  Search, 
  Download, 
  Plus, 
  ArrowLeft, 
  Filter, 
  Play, 
  CheckCircle2, 
  Clock, 
  Layers, 
  FileSpreadsheet, 
  Printer, 
  RefreshCw,
  X,
  Trophy,
  Swords,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Zap,
  Edit,
  FileText,
  Upload,
  PlusCircle,
  Sliders,
  Sparkles,
  ChevronRight,
  ListOrdered,
  UserPlus,
  Users,
  Scale
} from "lucide-react";
import { sound } from "../utils/sound";
import * as XLSX from "xlsx";
import { MatchState } from "../types";
import { JadwalPrintA4View } from "./JadwalPrintA4View";
import { DeviceBatteryIndicator } from "./SekretarisPanel";
import { 
  autoSyncAndGenerateAllBrackets, 
  isDummyAthleteObj,
  normalizeAthleteRecord,
  normalizeAgeCategory,
  normalizeWeightClass,
  getCanonicalCategoryClassId,
  buildAutoSchedulesAndCategories,
  syncAndGenerateSchedulesFromParticipants,
  clearAllSchedulesAndBrackets
} from "../utils/baganGenerator";

interface JadwalPanelProps {
  currentMatchState?: MatchState;
  onLoadMatchToArena?: (matchItem: any) => Promise<void> | void;
  onBack: () => void;
  hideBackHeader?: boolean;
}

const DEFAULT_INITIAL_PARTICIPANTS = [
  { id: "p-1", name: "FAJAR NUGRAHA", contingent: "PERSILAT BEKASI", ageCategory: "Remaja", weightClass: "Kelas A", gender: "PUTRA", seed: 1 },
  { id: "p-2", name: "EKO WAHYUDI", contingent: "TAPAK SUCI ACEH", ageCategory: "Remaja", weightClass: "Kelas A", gender: "PUTRA", seed: 2 },
  { id: "p-3", name: "ANDI SETIAWAN", contingent: "PERISAI DIRI BANTEN", ageCategory: "Remaja", weightClass: "Kelas A", gender: "PUTRA", seed: 3 },
  { id: "p-4", name: "BAYU PRATAMA", contingent: "MERPATI PUTIH JABAR", ageCategory: "Remaja", weightClass: "Kelas A", gender: "PUTRA", seed: 4 },
  { id: "p-5", name: "RIAN HIDAYAT", contingent: "SETIA HATI TERATE", ageCategory: "Dewasa", weightClass: "Kelas C", gender: "PUTRA", seed: 1 },
  { id: "p-6", name: "DENI SAPUTRA", contingent: "PAGAR NUSA JATIM", ageCategory: "Dewasa", weightClass: "Kelas C", gender: "PUTRA", seed: 2 },
  { id: "p-7", name: "SITI NURHALIZA", contingent: "KPS NUSANTARA", ageCategory: "Dewasa", weightClass: "Kelas D", gender: "PUTRI", seed: 1 },
  { id: "p-8", name: "DEWI ANGGRAINI", contingent: "CIMANDE BOGOR", ageCategory: "Dewasa", weightClass: "Kelas D", gender: "PUTRI", seed: 2 }
].map((p, idx) => normalizeAthleteRecord(p, idx));

export function JadwalPanel({ currentMatchState, onLoadMatchToArena, onBack, hideBackHeader = false }: JadwalPanelProps) {
  // Navigation tab: "KONTROL" (Tabel Kontrol Jadwal & Rekap) vs "LAYOUT_A4" (Layout Print Out PDF A4)
  const [activeTab, setActiveTab] = useState<"KONTROL" | "LAYOUT_A4">("KONTROL");

  // Track if bracket/schedule was explicitly cleared
  const [bracketCleared, setBracketCleared] = useState<boolean>(() => {
    try {
      return localStorage.getItem("jrz_bracket_cleared") === "true";
    } catch {
      return false;
    }
  });

  // Participants state (normalized & synced with LotingPanel)
  const [participants, setParticipants] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("jrz_cached_participants");
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((p, idx) => normalizeAthleteRecord(p, idx));
        }
      }
    } catch {}
    return DEFAULT_INITIAL_PARTICIPANTS;
  });

  // Schedules state (automatically built from participants if not cleared)
  const [schedules, setSchedules] = useState<any[]>(() => {
    try {
      const isCleared = localStorage.getItem("jrz_bracket_cleared") === "true";
      if (isCleared) return [];

      const saved = localStorage.getItem("jrz_cached_schedules");
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }

      const savedP = localStorage.getItem("jrz_cached_participants");
      const listP = savedP !== null ? JSON.parse(savedP) : DEFAULT_INITIAL_PARTICIPANTS;
      if (Array.isArray(listP) && listP.length > 0) {
        const auto = buildAutoSchedulesAndCategories(listP);
        return auto.matches;
      }
    } catch (e) {
      console.warn("Gagal membaca cached schedules:", e);
    }
    return [];
  });

  const [categories, setCategories] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("jrz_cached_categories");
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const savedP = localStorage.getItem("jrz_cached_participants");
      const listP = savedP !== null ? JSON.parse(savedP) : DEFAULT_INITIAL_PARTICIPANTS;
      if (Array.isArray(listP) && listP.length > 0) {
        const auto = buildAutoSchedulesAndCategories(listP);
        return auto.categories;
      }
    } catch {}
    return [];
  });

  // Toast & In-App Confirmation Modal State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    type: "RESET_ALL_SCHEDULES" | "DELETE_SELECTED_MATCHES" | "DELETE_SINGLE_MATCH" | "DELETE_ATHLETE";
    matchId?: string;
    matchNumber?: string | number;
    athleteId?: string;
    athleteName?: string;
  } | null>(null);

  // Filters & selection
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [showAllSchedules, setShowAllSchedules] = useState(true);
  const [filterGelanggang, setFilterGelanggang] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReportMatchIds, setSelectedReportMatchIds] = useState<string[]>([]);

  // Modals & Menu Input Data
  const [showAddModal, setShowAddModal] = useState(false);
  const [inputDataSubTab, setInputDataSubTab] = useState<"INPUT_ATLET" | "INPUT_PARTAI" | "DAFTAR_ATLET">("INPUT_ATLET");
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New match form state
  const [newMatch, setNewMatch] = useState({
    matchNumber: "",
    arena: "GELANGGANG A",
    stage: "Penyisihan",
    classCategory: "Tanding Remaja Kelas A Putra (39-43 Kg)",
    gender: "PUTRA",
    fighterBlueName: "",
    fighterBlueClub: "",
    fighterRedName: "",
    fighterRedClub: ""
  });

  // New Athlete form state according to PERSILAT & IPSI 2026 rules
  const [newAthlete, setNewAthlete] = useState({
    name: "",
    contingent: "",
    ageCategory: "Remaja",
    gender: "PUTRA",
    weightClass: "Kelas A",
    weight: "",
    seed: ""
  });

  // Official PERSILAT & IPSI 2026 Weight Classes by Age Category
  const IPSI_WEIGHT_CLASSES: Record<string, { label: string; range: string }[]> = {
    "Usia Dini": [
      { label: "Under", range: "< 26 Kg" },
      { label: "Kelas A", range: "26 - 28 Kg" },
      { label: "Kelas B", range: "28 - 30 Kg" },
      { label: "Kelas C", range: "30 - 32 Kg" },
      { label: "Kelas D", range: "32 - 34 Kg" },
      { label: "Kelas E", range: "34 - 36 Kg" },
      { label: "Kelas F", range: "36 - 38 Kg" },
      { label: "Kelas Bebas", range: "> 38 Kg" }
    ],
    "Pra Remaja": [
      { label: "Under", range: "< 30 Kg" },
      { label: "Kelas A", range: "30 - 33 Kg" },
      { label: "Kelas B", range: "33 - 36 Kg" },
      { label: "Kelas C", range: "36 - 39 Kg" },
      { label: "Kelas D", range: "39 - 42 Kg" },
      { label: "Kelas E", range: "42 - 45 Kg" },
      { label: "Kelas F", range: "45 - 48 Kg" },
      { label: "Kelas G", range: "48 - 51 Kg" },
      { label: "Kelas H", range: "51 - 54 Kg" },
      { label: "Kelas I", range: "54 - 57 Kg" },
      { label: "Kelas J", range: "57 - 60 Kg" },
      { label: "Kelas Bebas", range: "> 60 Kg" }
    ],
    "Remaja": [
      { label: "Under", range: "< 39 Kg" },
      { label: "Kelas A", range: "39 - 43 Kg" },
      { label: "Kelas B", range: "43 - 47 Kg" },
      { label: "Kelas C", range: "47 - 51 Kg" },
      { label: "Kelas D", range: "51 - 55 Kg" },
      { label: "Kelas E", range: "55 - 59 Kg" },
      { label: "Kelas F", range: "59 - 63 Kg" },
      { label: "Kelas G", range: "63 - 67 Kg" },
      { label: "Kelas H", range: "67 - 71 Kg" },
      { label: "Kelas I", range: "71 - 75 Kg" },
      { label: "Kelas J", range: "75 - 79 Kg" },
      { label: "Kelas Bebas", range: "> 79 Kg" }
    ],
    "Dewasa": [
      { label: "Under", range: "< 45 Kg" },
      { label: "Kelas A", range: "45 - 50 Kg" },
      { label: "Kelas B", range: "50 - 55 Kg" },
      { label: "Kelas C", range: "55 - 60 Kg" },
      { label: "Kelas D", range: "60 - 65 Kg" },
      { label: "Kelas E", range: "65 - 70 Kg" },
      { label: "Kelas F", range: "70 - 75 Kg" },
      { label: "Kelas G", range: "75 - 80 Kg" },
      { label: "Kelas H", range: "80 - 85 Kg" },
      { label: "Kelas I", range: "85 - 90 Kg" },
      { label: "Kelas J", range: "90 - 95 Kg" },
      { label: "Kelas Bebas", range: "> 95 Kg s/d 110 Kg" }
    ],
    "Master": [
      { label: "Kelas Bebas", range: "Terbuka (> 45 Thn)" }
    ]
  };

  // Sync data from localStorage & backend
  const fetchSchedules = async () => {
    try {
      const isClearedNow = localStorage.getItem("jrz_bracket_cleared") === "true";
      setBracketCleared(isClearedNow);

      const savedP = localStorage.getItem("jrz_cached_participants");
      let localParticipants: any[] | null = null;
      if (savedP !== null) {
        const parsedP = JSON.parse(savedP);
        if (Array.isArray(parsedP)) {
          localParticipants = parsedP.map((p, idx) => normalizeAthleteRecord(p, idx));
          setParticipants(localParticipants);
        }
      }

      if (isClearedNow) {
        setSchedules([]);
        if (localParticipants && localParticipants.length === 0) {
          setCategories([]);
        }
        return;
      }

      const savedS = localStorage.getItem("jrz_cached_schedules");
      const savedC = localStorage.getItem("jrz_cached_categories");
      if (savedC !== null) {
        const parsedC = JSON.parse(savedC);
        if (Array.isArray(parsedC)) setCategories(parsedC);
      }

      if (savedS !== null) {
        const parsedS = JSON.parse(savedS);
        if (Array.isArray(parsedS)) {
          if (parsedS.length > 0 || (localParticipants && localParticipants.length === 0)) {
            setSchedules(parsedS);
            return;
          }
        }
      }

      // If we have participants and schedules are empty (and not cleared), auto-build schedules & categories
      const activeParticipants = localParticipants ?? participants;
      if (activeParticipants.length > 0) {
        const res = await syncAndGenerateSchedulesFromParticipants(activeParticipants);
        setParticipants(res.participants);
        setCategories(res.categories);
        setSchedules(res.matches);
        return;
      }

      const [res, pRes, cRes] = await Promise.allSettled([
        fetch("/api/matches-schedule"),
        fetch("/api/participants"),
        fetch("/api/categories")
      ]);

      if (pRes.status === "fulfilled" && pRes.value.ok) {
        const pData = await pRes.value.json();
        if (Array.isArray(pData) && pData.length > 0) {
          const normP = pData.map((p, idx) => normalizeAthleteRecord(p, idx));
          setParticipants(normP);
          try { localStorage.setItem("jrz_cached_participants", JSON.stringify(normP)); } catch {}
        }
      }

      if (cRes.status === "fulfilled" && cRes.value.ok) {
        const cData = await cRes.value.json();
        if (Array.isArray(cData) && cData.length > 0) {
          setCategories(cData);
          try { localStorage.setItem("jrz_cached_categories", JSON.stringify(cData)); } catch {}
        }
      }

      if (res.status === "fulfilled" && res.value.ok) {
        const data = await res.value.json();
        if (Array.isArray(data) && data.length > 0) {
          setSchedules(data);
          try { localStorage.setItem("jrz_cached_schedules", JSON.stringify(data)); } catch {}
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchSchedules();

    const handleSync = () => {
      try {
        const isClearedNow = localStorage.getItem("jrz_bracket_cleared") === "true";
        setBracketCleared(isClearedNow);

        const savedP = localStorage.getItem("jrz_cached_participants");
        let currentP: any[] = [];
        if (savedP !== null) {
          const parsedP = JSON.parse(savedP);
          if (Array.isArray(parsedP)) {
            currentP = parsedP.map((p, idx) => normalizeAthleteRecord(p, idx));
            setParticipants(currentP);
          }
        }

        const savedC = localStorage.getItem("jrz_cached_categories");
        if (savedC !== null) {
          const parsedC = JSON.parse(savedC);
          if (Array.isArray(parsedC)) setCategories(parsedC);
        }

        if (isClearedNow) {
          setSchedules([]);
          return;
        }

        const savedS = localStorage.getItem("jrz_cached_schedules");
        if (savedS !== null) {
          const parsedS = JSON.parse(savedS);
          if (Array.isArray(parsedS)) {
            if (parsedS.length > 0 || currentP.length === 0) {
              setSchedules(parsedS);
            } else if (currentP.length > 0) {
              const auto = buildAutoSchedulesAndCategories(currentP);
              setCategories(auto.categories);
              setSchedules(auto.matches);
            }
          }
        }
      } catch {}
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("focus", handleSync);
    window.addEventListener("jrz_tournament_synced", handleSync as EventListener);
    window.addEventListener("jrz_schedules_updated", handleSync as EventListener);
    window.addEventListener("jrz_athletes_updated", handleSync as EventListener);

    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel("jrz_match_sync_A");
      ch.onmessage = () => handleSync();
    } catch {}

    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("jrz_tournament_synced", handleSync as EventListener);
      window.removeEventListener("jrz_schedules_updated", handleSync as EventListener);
      window.removeEventListener("jrz_athletes_updated", handleSync as EventListener);
      if (ch) ch.close();
    };
  }, []);

  // Save schedules helper
  const saveSchedules = async (updated: any[]) => {
    setSchedules(updated);
    const isNowEmpty = updated.length === 0;
    try {
      localStorage.setItem("jrz_bracket_cleared", isNowEmpty ? "true" : "false");
      setBracketCleared(isNowEmpty);
      localStorage.setItem("jrz_cached_schedules", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("jrz_schedules_updated", { detail: updated }));
      const ch = new BroadcastChannel("jrz_match_sync_A");
      ch.postMessage({ type: "SCHEDULES_UPDATED" });
      ch.close();
    } catch {}

    try {
      await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: categories,
          newParticipants: participants,
          newMatches: updated
        })
      });
    } catch {}
  };

  // Available gelanggang list
  const availableGelanggangList = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach(s => {
      if (s.arena) set.add(String(s.arena).toUpperCase());
    });
    if (set.size === 0) {
      set.add("GELANGGANG A");
      set.add("GELANGGANG B");
    }
    return Array.from(set).sort();
  }, [schedules]);

  // Category recap cards list (built from normalized participants & categories so all Loting classes appear)
  const baganCategoryList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; division: string; gender: string; count: number }>();

    participants.forEach((rawP, idx) => {
      const p = normalizeAthleteRecord(rawP, idx);
      const key = `${p.categoryClassId}__${p.gender}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          id: p.categoryClassId,
          name: `${p.ageCategory} - ${p.weightClass}`,
          division: p.ageCategory.toUpperCase(),
          gender: p.gender,
          count: 1
        });
      }
    });

    if (map.size === 0 && categories.length > 0) {
      categories.forEach(cat => {
        ["PUTRA", "PUTRI"].forEach(gen => {
          const count = participants.filter(p => p.categoryClassId === cat.id && p.gender === gen).length;
          if (count > 0) {
            map.set(`${cat.id}__${gen}`, {
              id: cat.id,
              name: cat.name,
              division: cat.division || "TANDING",
              gender: gen,
              count
            });
          }
        });
      });
    }

    return Array.from(map.values());
  }, [categories, participants]);

  // Filtered schedules for the table
  const displayedSchedules = useMemo(() => {
    let list = schedules;

    // Filter by class and gender if not showAll
    if (!showAllSchedules && selectedCategory) {
      list = list.filter(m => 
        m.categoryClassId === selectedCategory && (!selectedGender || m.gender === selectedGender)
      );
    }

    // Filter by arena
    if (filterGelanggang !== "ALL") {
      list = list.filter(m => {
        const arena = (m.arena || "GELANGGANG A").trim().toUpperCase();
        return arena === filterGelanggang.trim().toUpperCase();
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => {
        const pNo = String(m.matchNumber || "").toLowerCase();
        const bName = String(m.fighterBlueName || "").toLowerCase();
        const bClub = String(m.fighterBlueClub || "").toLowerCase();
        const rName = String(m.fighterRedName || "").toLowerCase();
        const rClub = String(m.fighterRedClub || "").toLowerCase();
        const cls = String(m.classCategory || "").toLowerCase();
        return pNo.includes(q) || bName.includes(q) || bClub.includes(q) || rName.includes(q) || rClub.includes(q) || cls.includes(q);
      });
    }

    return list;
  }, [schedules, showAllSchedules, selectedCategory, selectedGender, filterGelanggang, searchQuery]);

  // Toggle match in schedule
  const handleToggleMatchInSchedule = (matchId: string) => {
    sound.playClick();
    const updated = schedules.map(m => {
      if (m.id === matchId) {
        return {
          ...m,
          matchNumber: m.matchNumber ? "" : String(schedules.filter(s => s.matchNumber).length + 1)
        };
      }
      return m;
    });
    saveSchedules(updated);
  };

  // Generate all brackets & schedules from registered participants
  const handleGenerateAllSchedules = async () => {
    sound.playClick();
    if (participants.length === 0) {
      showToast("⚠️ Belum ada atlet yang terdaftar! Silakan tambahkan atlet di menu Input Data.");
      sound.playBuzzer();
      return;
    }
    try {
      setBracketCleared(false);
      const res = await syncAndGenerateSchedulesFromParticipants(participants);
      setParticipants(res.participants);
      setCategories(res.categories);
      setSchedules(res.matches);
      showToast(`⚡ Berhasil meng-generate ${res.matches.length} partai jadwal & bagan untuk seluruh kelas!`);
    } catch (e) {
      console.error(e);
      showToast("⚠️ Gagal meng-generate jadwal otomatis.");
    }
  };

  // Trigger Modal Reset Semua Jadwal (replaces window.confirm which is blocked in iframe)
  const handleClearAllSchedules = () => {
    sound.playClick();
    setConfirmDialog({
      type: "RESET_ALL_SCHEDULES"
    });
  };

  // Execute Confirmed Action from In-App Modal
  const executeConfirmDialog = async (mode: "CLEAR_SCHEDULES_ONLY" | "CLEAR_ALL_WITH_ATHLETES" | "REGENERATE_FROM_LOTING" = "CLEAR_SCHEDULES_ONLY") => {
    if (!confirmDialog) return;

    if (confirmDialog.type === "RESET_ALL_SCHEDULES") {
      if (mode === "REGENERATE_FROM_LOTING") {
        sound.playClick();
        setBracketCleared(false);
        const res = await syncAndGenerateSchedulesFromParticipants(participants);
        setParticipants(res.participants);
        setCategories(res.categories);
        setSchedules(res.matches);
        setSelectedReportMatchIds([]);
        showToast(`⚡ Jadwal direset & disusun ulang otomatis (${res.matches.length} partai dari hasil loting)!`);
      } else if (mode === "CLEAR_ALL_WITH_ATHLETES") {
        sound.playBuzzer();
        await clearAllSchedulesAndBrackets({ clearAthletes: true });
        setSchedules([]);
        setParticipants([]);
        setCategories([]);
        setBracketCleared(true);
        setSelectedReportMatchIds([]);
        showToast("🗑️ Seluruh Jadwal Partai, Bagan & Data Atlet berhasil dikosongkan!");
      } else {
        sound.playBuzzer();
        await clearAllSchedulesAndBrackets({ clearAthletes: false });
        setSchedules([]);
        setBracketCleared(true);
        setSelectedReportMatchIds([]);
        showToast("🗑️ Seluruh Jadwal Partai & Bagan berhasil direset/dikosongkan!");
      }
    } else if (confirmDialog.type === "DELETE_SELECTED_MATCHES") {
      sound.playClick();
      const count = selectedReportMatchIds.length;
      const updated = schedules.filter(m => !selectedReportMatchIds.includes(m.id));
      await saveSchedules(updated);
      setSelectedReportMatchIds([]);
      showToast(`🗑️ ${count} partai terpilih berhasil dihapus dari jadwal.`);
    } else if (confirmDialog.type === "DELETE_SINGLE_MATCH" && confirmDialog.matchId) {
      sound.playClick();
      const updated = schedules.filter(s => s.id !== confirmDialog.matchId);
      await saveSchedules(updated);
      setSelectedReportMatchIds(prev => prev.filter(id => id !== confirmDialog.matchId));
      showToast(`🗑️ Partai ${confirmDialog.matchNumber || ""} berhasil dihapus dari jadwal.`);
    } else if (confirmDialog.type === "DELETE_ATHLETE" && confirmDialog.athleteId) {
      sound.playClick();
      const updated = participants.filter(p => p.id !== confirmDialog.athleteId);
      if (updated.length === 0) {
        await clearAllSchedulesAndBrackets({ clearAthletes: true });
        setParticipants([]);
        setSchedules([]);
        setCategories([]);
        setBracketCleared(true);
      } else {
        const res = await syncAndGenerateSchedulesFromParticipants(updated);
        setParticipants(res.participants);
        setCategories(res.categories);
        setSchedules(res.matches);
      }
      showToast(`🗑️ Data atlet "${confirmDialog.athleteName}" dihapus & jadwal diperbarui.`);
    }

    setConfirmDialog(null);
  };

  // Add match submit
  const handleAddMatch = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    if (!newMatch.matchNumber || !newMatch.fighterBlueName || !newMatch.fighterRedName) {
      showToast("⚠️ Mohon lengkapi Nomor Partai dan Nama Pesilat di kedua sudut!");
      return;
    }
    const created = {
      id: `match-${Date.now()}`,
      matchNumber: newMatch.matchNumber,
      arena: newMatch.arena.toUpperCase(),
      stage: newMatch.stage,
      classCategory: newMatch.classCategory,
      gender: newMatch.gender,
      categoryClassId: selectedCategory || categories[0]?.id || "cat-remaja-kelas-a",
      fighterBlueName: newMatch.fighterBlueName.toUpperCase(),
      fighterBlueClub: newMatch.fighterBlueClub.toUpperCase() || "KONTINGEN BIRU",
      fighterRedName: newMatch.fighterRedName.toUpperCase(),
      fighterRedClub: newMatch.fighterRedClub.toUpperCase() || "KONTINGEN MERAH",
      scoreBlue: 0,
      scoreRed: 0,
      winner: null,
      status: "BELUM"
    };

    const updated = [...schedules, created];
    saveSchedules(updated);
    setShowAddModal(false);
    setNewMatch({
      matchNumber: "",
      arena: "GELANGGANG A",
      stage: "Penyisihan",
      classCategory: "Tanding Remaja Kelas A Putra (39-43 Kg)",
      gender: "PUTRA",
      fighterBlueName: "",
      fighterBlueClub: "",
      fighterRedName: "",
      fighterRedClub: ""
    });
    showToast(`✅ Partai ${created.matchNumber} berhasil ditambahkan ke jadwal!`);
  };

  // Save new athlete to database according to PERSILAT & IPSI 2026 rules -> Auto-syncs Bagan & Jadwal!
  const handleSaveAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    if (!newAthlete.name.trim() || !newAthlete.contingent.trim()) {
      showToast("⚠️ Mohon lengkapi Nama Atlit dan Asal Daerah / Perguruan!");
      return;
    }

    const nAge = normalizeAgeCategory(newAthlete.ageCategory);
    const nCls = normalizeWeightClass(newAthlete.weightClass);
    const nGen = newAthlete.gender === "PUTRI" ? "PUTRI" : "PUTRA";
    const sameClassCount = participants.filter(
      p =>
        normalizeAgeCategory(p.ageCategory) === nAge &&
        normalizeWeightClass(p.weightClass) === nCls &&
        p.gender === nGen
    ).length;

    const createdAthlete = normalizeAthleteRecord({
      id: `atlet-${Date.now()}`,
      name: newAthlete.name.toUpperCase().trim(),
      club: newAthlete.contingent.toUpperCase().trim(),
      contingent: newAthlete.contingent.toUpperCase().trim(),
      ageCategory: nAge,
      gender: nGen,
      weightClass: nCls,
      weight: newAthlete.weight ? Number(newAthlete.weight) : undefined,
      seed: newAthlete.seed ? Number(newAthlete.seed) : sameClassCount + 1,
      categoryClassId: getCanonicalCategoryClassId(nAge, nCls)
    });

    const updated = [...participants, createdAthlete];
    setBracketCleared(false);
    const res = await syncAndGenerateSchedulesFromParticipants(updated, {
      activeFilter: { ageCategory: nAge, weightClass: nCls, gender: nGen }
    });
    setParticipants(res.participants);
    setCategories(res.categories);
    setSchedules(res.matches);

    showToast(`✅ Atlit "${createdAthlete.name}" disimpan & Bagan/Jadwal otomatis diperbarui!`);

    // Reset form
    setNewAthlete({
      name: "",
      contingent: "",
      ageCategory: newAthlete.ageCategory,
      gender: newAthlete.gender,
      weightClass: newAthlete.weightClass,
      weight: "",
      seed: ""
    });
  };

  // Delete athlete from database (via in-app confirmation modal)
  const handleDeleteAthlete = (athleteId: string, athleteName: string) => {
    sound.playClick();
    setConfirmDialog({
      type: "DELETE_ATHLETE",
      athleteId,
      athleteName
    });
  };

  // Auto-fill match corners from registered athlete database
  const handleSelectAthleteForMatch = (corner: "BLUE" | "RED", athleteId: string) => {
    if (!athleteId) return;
    const athlete = participants.find(p => p.id === athleteId);
    if (!athlete) return;
    if (corner === "BLUE") {
      setNewMatch(prev => ({
        ...prev,
        fighterBlueName: athlete.name,
        fighterBlueClub: athlete.contingent || athlete.club || "-",
        gender: athlete.gender || prev.gender,
        classCategory: athlete.ageCategory && athlete.weightClass 
          ? `Tanding ${athlete.ageCategory} ${athlete.weightClass} ${athlete.gender || "PUTRA"}`
          : prev.classCategory
      }));
    } else {
      setNewMatch(prev => ({
        ...prev,
        fighterRedName: athlete.name,
        fighterRedClub: athlete.contingent || athlete.club || "-",
        gender: athlete.gender || prev.gender,
        classCategory: athlete.ageCategory && athlete.weightClass 
          ? `Tanding ${athlete.ageCategory} ${athlete.weightClass} ${athlete.gender || "PUTRA"}`
          : prev.classCategory
      }));
    }
  };

  // Save edit match submit
  const handleSaveEditMatch = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    if (!editingMatch) return;
    const updated = schedules.map(m => m.id === editingMatch.id ? editingMatch : m);
    saveSchedules(updated);
    setEditingMatch(null);
  };

  // Load match to Arena (direct action without window.confirm blocking in iframe)
  const handleLoadToArena = async (m: any) => {
    if (!onLoadMatchToArena) return;
    sound.playClick();
    showToast(`⚡ Memuat Partai ${m.matchNumber} (${m.fighterBlueName} vs ${m.fighterRedName}) ke Arena...`);
    await onLoadMatchToArena(m);
    onBack();
  };

  // Export Excel
  const handleExportExcel = () => {
    sound.playClick();
    try {
      const data = displayedSchedules.map((m, idx) => ({
        "PARTAI": m.matchNumber || idx + 1,
        "ARENA": m.arena || "GELANGGANG A",
        "KELAS TANDING": m.classCategory || "TANDING",
        "GENDER": m.gender || "PUTRA",
        "BABAK/STAGE": m.stage || "PENYISIHAN",
        "SUDUT BIRU": m.fighterBlueName || "-",
        "KONTINGEN BIRU": m.fighterBlueClub || "-",
        "SUDUT MERAH": m.fighterRedName || "-",
        "KONTINGEN MERAH": m.fighterRedClub || "-",
        "SKOR BIRU": m.scoreBlue ?? 0,
        "SKOR MERAH": m.scoreRed ?? 0,
        "PEMENANG": m.winner || "-",
        "STATUS": m.status || "BELUM"
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Jadwal Pertandingan");
      XLSX.writeFile(wb, `Jadwal_Pertandingan_${Date.now()}.xlsx`);
    } catch (e) {
      console.error(e);
      showToast("⚠️ Gagal mengunduh Excel.");
    }
  };

  // Download Template Excel
  const handleDownloadTemplateExcel = () => {
    sound.playClick();
    const templateData = [
      ["PARTAI", "ARENA", "KELAS TANDING", "GENDER", "BABAK/TAHAPAN", "SUDUT BIRU", "KONTINGEN BIRU", "SUDUT MERAH", "KONTINGEN MERAH"],
      ["1", "GELANGGANG A", "Kelas A Remaja", "PUTRA", "PENYISIHAN", "FAJAR NUGRAHA", "PERSILAT BEKASI", "EKO WAHYUDI", "TAPAK SUCI ACEH"],
      ["2", "GELANGGANG A", "Kelas B Remaja", "PUTRA", "SEMIFINAL", "ANDI SETIAWAN", "PERISAI DIRI", "BAYU PRATAMA", "MERPATI PUTIH"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Jadwal");
    XLSX.writeFile(wb, "Template_Jadwal_Pertandingan.xlsx");
  };

  // Import Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sound.playClick();
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);
        
        if (rows.length === 0) {
          showToast("⚠️ File Excel kosong atau format tidak sesuai!");
          return;
        }

        const imported = rows.map((r, i) => ({
          id: `match-import-${Date.now()}-${i}`,
          matchNumber: String(r["PARTAI"] || r["Partai"] || r["No. Partai"] || i + 1),
          arena: String(r["ARENA"] || r["Arena"] || r["Gelanggang"] || "GELANGGANG A").toUpperCase(),
          stage: String(r["BABAK/STAGE"] || r["BABAK/TAHAPAN"] || r["Babak"] || "Penyisihan"),
          classCategory: String(r["KELAS TANDING"] || r["Kelas"] || "Tanding"),
          gender: String(r["GENDER"] || r["Gender"] || "PUTRA").toUpperCase(),
          fighterBlueName: String(r["SUDUT BIRU"] || r["Sudut Biru"] || r["Pesilat Biru"] || "BIRU").toUpperCase(),
          fighterBlueClub: String(r["KONTINGEN BIRU"] || r["Kontingen Biru"] || "-").toUpperCase(),
          fighterRedName: String(r["SUDUT MERAH"] || r["Sudut Merah"] || r["Pesilat Merah"] || "MERAH").toUpperCase(),
          fighterRedClub: String(r["KONTINGEN MERAH"] || r["Kontingen Merah"] || "-").toUpperCase(),
          scoreBlue: 0,
          scoreRed: 0,
          winner: null,
          status: "BELUM"
        }));

        saveSchedules([...schedules, ...imported]);
        showToast(`🎉 Sukses mengimpor ${imported.length} partai jadwal pertandingan!`);
      } catch (err) {
        console.error(err);
        showToast("⚠️ Gagal membaca file Excel. Pastikan menggunakan format template!");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const activeCategoryObj = categories.find(c => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-[#070314] text-slate-100 flex flex-col font-sans select-none relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#14072f_1px,transparent_1px),linear-gradient(to_bottom,#14072f_1px,transparent_1px)] bg-[size:40px_40px] opacity-15 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-purple-600/10 via-indigo-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 border border-purple-500 text-white text-xs font-bold shadow-2xl animate-in fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* In-App Confirmation Modal (Reset Seluruh Jadwal / Hapus Partai / Hapus Atlet) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#110826] border-2 border-rose-500/60 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-purple-900/60 pb-3">
              <div className="w-10 h-10 bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white uppercase tracking-wider">
                  {confirmDialog.type === "RESET_ALL_SCHEDULES"
                    ? "KONFIRMASI RESET SEMUA JADWAL PARTAI"
                    : confirmDialog.type === "DELETE_SELECTED_MATCHES"
                    ? `HAPUS ${selectedReportMatchIds.length} PARTAI TERPILIH`
                    : confirmDialog.type === "DELETE_SINGLE_MATCH"
                    ? `HAPUS PARTAI ${confirmDialog.matchNumber || ""}`
                    : "HAPUS DATA ATLET"}
                </h3>
                <p className="text-[11px] text-purple-300/70">
                  Kontrol Partai & Bagan Bracket Terintegrasi
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed space-y-2">
              {confirmDialog.type === "RESET_ALL_SCHEDULES" && (
                <>
                  <p>Pilih mode reset jadwal yang ingin dijalankan:</p>
                  <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1">
                    <li><strong className="text-amber-300">Kosongkan Semua Jadwal & Bagan:</strong> Menghapus seluruh partai pertandingan hingga 0 partai (data atlet di Loting tetap aman).</li>
                    {participants.length > 0 && (
                      <li><strong className="text-cyan-300">Reset & Susun Ulang dari Loting:</strong> Mereset nomor partai & skor lalu menyusun ulang jadwal baru dari {participants.length} atlet terloting.</li>
                    )}
                    <li><strong className="text-rose-400">Reset Total (+ Hapus Semua Atlet):</strong> Mengosongkan jadwal partai, bagan, sekaligus seluruh daftar atlet.</li>
                  </ul>
                </>
              )}
              {confirmDialog.type === "DELETE_SELECTED_MATCHES" && (
                <p>
                  Apakah Anda yakin ingin menghapus <strong className="text-rose-300">{selectedReportMatchIds.length} partai</strong> yang dicentang dari jadwal pertandingan?
                </p>
              )}
              {confirmDialog.type === "DELETE_SINGLE_MATCH" && (
                <p>
                  Apakah Anda yakin ingin menghapus <strong className="text-amber-300">Partai {confirmDialog.matchNumber}</strong> dari tabel jadwal pertandingan?
                </p>
              )}
              {confirmDialog.type === "DELETE_ATHLETE" && (
                <p>
                  Apakah Anda yakin ingin menghapus atlet <strong className="text-rose-300">{confirmDialog.athleteName}</strong> dan memperbarui jadwal secara otomatis?
                </p>
              )}
            </div>

            {confirmDialog.type === "RESET_ALL_SCHEDULES" ? (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => executeConfirmDialog("CLEAR_SCHEDULES_ONLY")}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Kosongkan Semua Jadwal Partai (0 Partai)</span>
                </button>
                {participants.length > 0 && (
                  <button
                    type="button"
                    onClick={() => executeConfirmDialog("REGENERATE_FROM_LOTING")}
                    className="w-full py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reset & Susun Ulang dari Data Loting ({participants.length} Atlet)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => executeConfirmDialog("CLEAR_ALL_WITH_ATHLETES")}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reset Total (Hapus Jadwal, Bagan & Semua Atlet)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="py-2 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => executeConfirmDialog("CLEAR_SCHEDULES_ONLY")}
                  className="py-2 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOP BAR / NAVIGATION - Identical to SekretarisPanel menu kontrol partai */}
      <header className="relative z-30 flex flex-wrap items-center justify-between gap-3 px-3 sm:px-6 py-2 bg-[#0a051b]/95 backdrop-blur-md border-b border-purple-900/40 shadow-xl">
        <div className="flex items-center gap-3">
          {!hideBackHeader && (
            <button
              onClick={() => {
                sound.playClick();
                onBack();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-[#150a2b] hover:bg-[#25104d] border border-purple-800/40 text-purple-300 hover:text-white text-xs font-black transition-all active:scale-95 cursor-pointer shadow-md"
              title="Kembali ke Beranda Utama"
            >
              <ArrowLeft className="w-4 h-4 text-purple-400" />
              <span>KELUAR</span>
            </button>
          )}

          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <div className="h-4 w-[1px] bg-purple-900/40 mx-1"></div>
            <Sliders className="w-4 h-4 text-purple-400" />
            <span className="font-sans font-black tracking-widest text-[12px] sm:text-[13px] uppercase text-slate-100">
              PANEL JADWAL PERTANDINGAN
            </span>
          </div>
        </div>

        {/* Center navigation tabs (Identical pill menu style from SekretarisPanel) */}
        <div className="flex items-center gap-1 bg-[#10092c] border border-purple-900/40 p-1 rounded-none shadow-inner">
          <button
            onClick={() => { sound.playClick(); setActiveTab("KONTROL"); }}
            className={`px-4 py-1.5 rounded-none text-xs font-black tracking-wider uppercase transition-all cursor-pointer border-none ${
              activeTab === "KONTROL"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                : "text-slate-400 hover:text-white bg-transparent"
            }`}
          >
            KONTROL PARTAI
          </button>
          <button
            onClick={() => { sound.playClick(); setActiveTab("LAYOUT_A4"); }}
            className={`px-4 py-1.5 rounded-none text-xs font-black tracking-wider uppercase transition-all cursor-pointer border-none flex items-center gap-1.5 ${
              activeTab === "LAYOUT_A4"
                ? "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.45)]"
                : "text-slate-400 hover:text-white bg-transparent"
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" />
            <span>LAYOUT PRINT OUT PDF A4</span>
          </button>
        </div>

        {/* Right corner active match info & battery indicator */}
        <div className="flex items-center gap-2.5">
          <div className="bg-purple-950/40 text-purple-300 border border-purple-900/40 px-3 py-1 rounded-none text-[10px] uppercase font-bold tracking-widest font-mono">
            {currentMatchState?.matchNumber ? `PARTAI ${currentMatchState.matchNumber}` : `TOTAL: ${schedules.length} PARTAI`}
          </div>
          <DeviceBatteryIndicator />
          <button
            onClick={() => { sound.playClick(); fetchSchedules(); }}
            className="p-1.5 rounded-none bg-[#150a2b] hover:bg-[#25104d] border border-purple-800/40 text-purple-300 hover:text-white transition-all cursor-pointer"
            title="Sinkronisasi Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* TAB CONTENT 1: KONTROL PARTAI (Identical layout to SekretarisPanel) */}
      {activeTab === "KONTROL" && (
        <main className="flex-grow p-2.5 sm:p-4 flex flex-col lg:flex-row gap-3.5 max-w-[1760px] mx-auto w-full items-start">
          
          {/* LEFT COLUMN: REKAP TOTAL ATLIT PER KELAS & ALAT INTEGRASI JADWAL (Compact Left Sidebar) */}
          <div className="w-full lg:w-[250px] xl:w-[270px] shrink-0 bg-[#0e0720]/90 border border-purple-900/40 rounded-none p-3 flex flex-col gap-2.5 shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-500 rounded-none"></div>
            
            {/* Header: Rekap Total Atlit */}
            <div className="border-b border-purple-950/80 pb-2 flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-6 rounded-none bg-purple-950/80 border border-purple-700/50 flex items-center justify-center text-purple-300 shadow-inner shrink-0">
                  <TrendingUp className="w-3 h-3" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10.5px] font-black uppercase text-slate-100 tracking-wider block truncate">
                    REKAP TOTAL ATLIT
                  </span>
                  <span className="text-[7.5px] font-mono font-bold text-purple-300/70 uppercase block truncate">
                    PEMBAGIAN KELAS TANDING
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[8px] font-mono font-black bg-purple-950/90 border border-purple-800/60 px-1.5 py-0.5 rounded-none text-amber-300">
                  {baganCategoryList.length} KLS
                </span>
                <span className="text-[8px] font-mono font-black bg-blue-950/90 border border-blue-800/60 px-1.5 py-0.5 rounded-none text-cyan-300">
                  {participants.length} ATL
                </span>
              </div>
            </div>

            {/* Quick Action: Generate All */}
            <div className="w-full">
              <button
                type="button"
                onClick={handleGenerateAllSchedules}
                className="w-full bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-700 hover:from-purple-600 hover:to-indigo-500 text-white font-sans font-black py-1.5 px-2.5 rounded-none text-[9px] uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 shadow-md flex items-center justify-center gap-1.5 border border-purple-500/40"
                title="Generate seluruh jadwal pertandingan untuk semua kelas yang terdaftar"
              >
                <Zap className="w-3 h-3 text-amber-300 fill-amber-300 animate-pulse" />
                <span>⚡ GENERATE SEMUA</span>
              </button>
            </div>

            {/* Compact & Proportional List for Rekap Kelas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 overflow-y-auto max-h-[32vh] pr-1 scrollbar-thin scrollbar-thumb-purple-950">
              {baganCategoryList.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-5 px-2 bg-purple-950/20 rounded-none border border-purple-950/40 text-center gap-2">
                  <span className="italic text-[9.5px] text-slate-400 uppercase tracking-widest">[ Belum ada data atlit terdaftar ]</span>
                </div>
              ) : (
                baganCategoryList.map((catItem) => {
                  const isSelected = !showAllSchedules && selectedCategory === catItem.id && selectedGender === catItem.gender;
                  const matchCount = schedules.filter(m => m.categoryClassId === catItem.id && m.gender === catItem.gender).length;
                  const isPutri = (catItem.gender || "").toUpperCase().includes("PUTRI") || (catItem.gender || "").toUpperCase() === "PI";
                  
                  return (
                    <div
                      key={`recap-${catItem.id}-${catItem.gender}`}
                      onClick={() => {
                        sound.playClick();
                        setShowAllSchedules(false);
                        setSelectedCategory(catItem.id);
                        setSelectedGender(catItem.gender as "PUTRA" | "PUTRI");
                      }}
                      className={`group border rounded-none p-2 flex flex-col justify-between gap-1 transition-all duration-200 cursor-pointer text-left relative select-none ${
                        isSelected
                          ? "bg-gradient-to-br from-purple-900/70 to-indigo-950/80 border-amber-400 shadow-md shadow-purple-950/60 ring-1 ring-amber-400/60"
                          : "bg-[#0b0617] hover:bg-[#150a2b] border-purple-950 hover:border-purple-600/60"
                      }`}
                      title="Klik untuk memilih kelas dan filter jadwal pertandingan"
                    >
                      {/* Top: Class name & marker */}
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[9.5px] font-black uppercase tracking-wide truncate ${
                          isSelected ? "text-amber-300" : "text-slate-100 group-hover:text-purple-200"
                        }`}>
                          {catItem.name}
                        </span>
                        {isSelected ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse"></span>
                        ) : (
                          <span className="text-[7px] font-mono text-slate-500 uppercase font-bold shrink-0">
                            {catItem.division}
                          </span>
                        )}
                      </div>

                      {/* Middle & Bottom combined compact row */}
                      <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-purple-950/60">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`text-[7px] font-mono font-bold px-1 py-0.5 rounded-none border uppercase leading-none ${
                            isPutri 
                              ? "bg-pink-950/60 text-pink-300 border-pink-700/40" 
                              : "bg-blue-950/60 text-cyan-300 border-blue-700/40"
                          }`}>
                            {catItem.gender}
                          </span>
                          <span className="text-[7px] font-mono font-black bg-purple-950/80 text-purple-200 border border-purple-800/40 px-1 py-0.5 rounded-none leading-none">
                            {catItem.count} ATLIT
                          </span>
                          {matchCount > 0 ? (
                            <span className="text-[7px] font-mono text-emerald-400 font-black">
                              ✓ {matchCount} P
                            </span>
                          ) : (
                            <span className="text-[6.5px] font-mono text-amber-400/80 font-bold">
                              0 P
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            sound.playClick();
                            setShowAllSchedules(false);
                            setSelectedCategory(catItem.id);
                            setSelectedGender(catItem.gender as "PUTRA" | "PUTRI");
                          }}
                          className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 text-[7px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow transition-transform active:scale-95 cursor-pointer uppercase font-sans border-none shrink-0"
                          title="Filter Partai Kelas Ini"
                        >
                          <span>PILIH</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ALAT INTEGRASI JADWAL: 2-Grid Column Layout */}
            <div className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-purple-950/80">
              <span className="text-[7.5px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                ALAT INTEGRASI JADWAL
              </span>
              
              <div className="grid grid-cols-2 gap-1">
                {/* 1. Edit Data */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    const firstMatch = schedules[0];
                    if (firstMatch) setEditingMatch(firstMatch);
                    else showToast("⚠️ Belum ada data tanding untuk diedit!");
                  }}
                  className="flex items-center justify-center gap-1 bg-[#150a2b] hover:bg-purple-900/40 text-purple-200 border border-purple-800/40 py-1.5 px-1.5 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  title="Edit Data Pertandingan"
                >
                  <Edit className="w-3 h-3 text-purple-400 shrink-0" />
                  <span className="truncate">Edit Data</span>
                </button>

                {/* 2. Hapus Data Terpilih */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    if (selectedReportMatchIds.length === 0) {
                      showToast("⚠️ Pilih partai pada tabel (centang checkbox di kolom CETAK) untuk dihapus!");
                      return;
                    }
                    setConfirmDialog({
                      type: "DELETE_SELECTED_MATCHES"
                    });
                  }}
                  className="flex items-center justify-center gap-1 bg-[#1a0a1a] hover:bg-rose-950/40 text-rose-300 border border-rose-900/40 py-1.5 px-1.5 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  title="Hapus Partai Tercentang"
                >
                  <Trash2 className="w-3 h-3 text-rose-400 shrink-0" />
                  <span className="truncate">Hapus Data</span>
                </button>

                {/* 3. Unduh PDF A4 (Switches directly to Layout A4 view) */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab("LAYOUT_A4");
                  }}
                  className="flex items-center justify-center gap-1 bg-[#150a2b] hover:bg-purple-900/40 text-amber-300 border border-purple-800/40 py-1.5 px-1.5 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  title="Lihat & Cetak Layout PDF A4 Resmi"
                >
                  <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">Unduh PDF A4</span>
                </button>

                {/* 4. Template Excel */}
                <button
                  type="button"
                  onClick={handleDownloadTemplateExcel}
                  className="flex items-center justify-center gap-1 bg-[#150a2b] hover:bg-purple-900/40 text-pink-300 border border-purple-800/40 py-1.5 px-1.5 rounded-none text-[8.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  title="Unduh Template Format Excel"
                >
                  <Download className="w-3 h-3 text-pink-400 shrink-0" />
                  <span className="truncate">Template</span>
                </button>

                {/* 5. Impor Excel */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportExcel}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1 bg-[#150a2b] hover:bg-purple-900/40 text-teal-300 border border-purple-800/40 py-1.5 px-1.5 rounded-none text-[8.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  title="Impor Jadwal dari File Excel"
                >
                  <Upload className="w-3 h-3 text-teal-400 shrink-0" />
                  <span className="truncate">Impor Excel</span>
                </button>

                {/* 6. Ekspor Excel */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center justify-center gap-1 bg-[#150a2b] hover:bg-purple-900/40 text-emerald-300 border border-purple-800/40 py-1.5 px-1.5 rounded-none text-[8.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  title="Ekspor Jadwal ke Excel"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">Ekspor Excel</span>
                </button>

                {/* 7. Reset Semua Jadwal (Col-span-2) */}
                <button
                  type="button"
                  onClick={handleClearAllSchedules}
                  className="col-span-2 flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-950/60 to-rose-950/60 hover:from-red-900/80 hover:to-rose-900/80 text-rose-300 border border-rose-900/50 py-1.5 px-2 rounded-none text-[8.5px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  title="Kosongkan Seluruh Data Jadwal Pertandingan"
                >
                  <Trash2 className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>Reset Seluruh Jadwal</span>
                </button>
              </div>

              {/* Quick shortcut to A4 Print Preview */}
              <button
                type="button"
                onClick={() => { sound.playClick(); setActiveTab("LAYOUT_A4"); }}
                className="w-full bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 text-white font-sans font-black py-1.5 px-2 rounded-none text-[8.5px] uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 shadow-lg border border-amber-300/40 flex items-center justify-center gap-1 mt-0.5"
              >
                <Printer className="w-3 h-3 text-amber-200 animate-pulse shrink-0" />
                <span className="truncate">PRINT OUT PDF A4</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: TABEL KONTROL JADWAL PERTANDINGAN (Expanded Flex-1 so no columns are cut off) */}
          <div className="w-full lg:flex-1 min-w-0 bg-[#0b0c16]/90 border border-purple-950/60 rounded-none p-3 sm:p-4 flex flex-col gap-3 shadow-2xl relative">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-950 pb-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-200 tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#facc15]" />
                  TABEL KONTROL JADWAL
                </span>
                {!showAllSchedules && activeCategoryObj ? (
                  <div className="flex items-center gap-1.5 bg-purple-950/90 border border-purple-700/60 px-2.5 py-1 rounded-none">
                    <span className="text-[10px] font-black text-amber-300 uppercase font-sans">
                      {activeCategoryObj.name} ({selectedGender})
                    </span>
                    <span className="text-[9px] font-mono font-bold text-purple-300 bg-purple-900/60 px-1.5 py-0.2 rounded-none">
                      {displayedSchedules.length} Partai
                    </span>
                  </div>
                ) : (
                  <span className="bg-purple-950/80 border border-purple-800/40 text-purple-300 px-2.5 py-1 rounded-none text-[9px] font-bold font-mono">
                    SEMUA KELAS ({schedules.filter(m => m.matchNumber).length} Partai Aktif)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* FILTER GELANGGANG */}
                <div className="flex items-center gap-1.5 bg-purple-950/90 border border-purple-700/60 px-2.5 py-1 rounded-none">
                  <span className="text-[8.5px] font-mono font-bold text-sky-400 uppercase">ARENA:</span>
                  <select
                    value={filterGelanggang}
                    onChange={(e) => {
                      sound.playClick();
                      setFilterGelanggang(e.target.value);
                    }}
                    className="bg-transparent text-sky-300 text-[9px] font-black uppercase tracking-wider outline-none cursor-pointer border-none"
                  >
                    <option value="ALL" className="bg-[#110724] text-slate-100">SEMUA ARENA</option>
                    {availableGelanggangList.map(g => (
                      <option key={g} value={g} className="bg-[#110724] text-sky-300">{g}</option>
                    ))}
                  </select>
                </div>

                {/* BATCH PINDAH GELANGGANG */}
                {selectedReportMatchIds.length > 0 && (
                  <div className="flex items-center gap-1 bg-sky-950/90 border border-sky-500/50 px-2 py-0.5 rounded-none shadow-sm">
                    <span className="text-[8.5px] font-mono text-sky-300 font-bold uppercase">PINDAH KE:</span>
                    <select
                      onChange={(e) => {
                        const target = e.target.value;
                        if (!target) return;
                        sound.playClick();
                        const updated = schedules.map(m => 
                          selectedReportMatchIds.includes(m.id) ? { ...m, arena: target } : m
                        );
                        saveSchedules(updated);
                        setSelectedReportMatchIds([]);
                        e.target.value = "";
                      }}
                      defaultValue=""
                      className="bg-transparent text-sky-200 text-[9px] font-black uppercase tracking-wider outline-none cursor-pointer border-none"
                    >
                      <option value="" disabled className="bg-[#110724] text-slate-400">PILIH...</option>
                      {availableGelanggangList.map(g => (
                        <option key={g} value={g} className="bg-[#110724] text-sky-300">{g}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* TOGGLE ALL / FILTER */}
                {!showAllSchedules ? (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setShowAllSchedules(true);
                    }}
                    className="bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 text-purple-200 hover:text-white px-2.5 py-1 rounded-none text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Tampilkan Semua ({schedules.length})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setShowAllSchedules(false);
                    }}
                    className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-none text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Filter: {activeCategoryObj?.name || "Kelas Terpilih"}
                  </button>
                )}

                <span className="text-[8px] font-mono text-purple-400 uppercase font-bold hidden xl:inline">
                  SINKRONISASI REAL-TIME
                </span>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Cari nomor partai, nama pesilat, kontingen, kelas tanding..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#120727] border border-purple-950 text-slate-100 placeholder-purple-400/30 rounded-none pl-9 pr-3 py-1.5 text-xs font-bold focus:outline-none focus:border-purple-600 transition-all"
              />
            </div>

            {/* MATCH SCHEDULE TABLE (Proportional full-fit columns without cutoff) */}
            <div className="flex-grow overflow-x-auto overflow-y-auto max-h-[58vh] border border-purple-950/40 bg-[#090317]/50 rounded-none scrollbar-thin scrollbar-thumb-purple-950">
              {displayedSchedules.length === 0 ? (
                <div className="text-center py-16 italic text-xs text-slate-400 uppercase tracking-widest flex flex-col items-center justify-center gap-3">
                  <span>[ Belum ada data pertandingan untuk filter arena {filterGelanggang} / kelas {activeCategoryObj?.name || ""} ]</span>
                  <button
                    type="button"
                    onClick={handleGenerateAllSchedules}
                    className="bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-black px-4 py-2 rounded-none text-[10px] uppercase tracking-wider transition-all duration-150 cursor-pointer shadow-lg active:scale-95 flex items-center gap-1.5 border-none"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current text-slate-950" />
                    <span>Generate Jadwal Pertandingan Sekarang</span>
                  </button>
                </div>
              ) : (
                <table className="w-full border-collapse text-left table-auto">
                  <thead>
                    <tr className="border-b border-purple-950/60 bg-purple-950/25 text-[8px] text-purple-400 font-mono uppercase tracking-wider sticky top-0 bg-[#0c0520] z-10">
                      <th className="py-2.5 px-2 text-center w-10">AKTIF</th>
                      <th className="py-2.5 px-2 whitespace-nowrap">PARTAI</th>
                      <th className="py-2.5 px-2 whitespace-nowrap">GELANGGANG</th>
                      <th className="py-2.5 px-2">KELAS TANDING</th>
                      <th className="py-2.5 px-2 whitespace-nowrap">BABAK/STAGE</th>
                      <th className="py-2.5 px-2 text-red-400">SUDUT MERAH</th>
                      <th className="py-2.5 px-2 text-blue-400">SUDUT BIRU</th>
                      <th className="py-2.5 px-2 text-center w-12">
                        <div className="flex flex-col items-center gap-0.5">
                          <span>CETAK</span>
                          <input
                            type="checkbox"
                            checked={displayedSchedules.length > 0 && displayedSchedules.every(m => selectedReportMatchIds.includes(m.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReportMatchIds(displayedSchedules.map(m => m.id));
                              } else {
                                setSelectedReportMatchIds([]);
                              }
                            }}
                            className="w-3 h-3 rounded border-purple-950 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            title="Pilih Semua di Tabel Ini"
                          />
                        </div>
                      </th>
                      <th className="py-2.5 px-2 text-center whitespace-nowrap">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="text-[9.5px] text-slate-300 font-sans font-bold uppercase divide-y divide-purple-950/20">
                    {displayedSchedules.map((m) => {
                      const isChecked = !!m.matchNumber;
                      const arenaLabel = (m.arena || "GELANGGANG A").replace("GELANGGANG ", "GEL. ");

                      return (
                        <tr key={m.id} className="hover:bg-purple-950/20 transition-colors">
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleMatchInSchedule(m.id)}
                              className="w-3.5 h-3.5 rounded border-purple-950 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-2 font-mono text-white whitespace-nowrap">
                            {isChecked ? (
                              <span className="bg-yellow-950/60 border border-yellow-600/40 text-[#facc15] px-1.5 py-0.5 rounded text-[8px] font-extrabold font-mono">
                                PARTAI {m.matchNumber}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-2 font-mono whitespace-nowrap">
                            <span className="bg-sky-950/70 border border-sky-600/40 text-sky-300 px-1.5 py-0.5 rounded text-[8px] font-extrabold font-mono">
                              {arenaLabel}
                            </span>
                          </td>
                          <td className="py-2 px-2 leading-tight">
                            <span className="block">{m.classCategory || m.categoryClassId}</span>
                            <span className="text-[7.5px] text-purple-400 font-mono">{m.gender || "PUTRA"}</span>
                          </td>
                          <td className="py-2 px-2 font-mono text-purple-400 text-[8.5px] whitespace-nowrap">
                            {m.stage || "PENYISIHAN"}
                          </td>
                          {/* Sudut Merah */}
                          <td className="py-2 px-2 text-red-300 font-black leading-tight">
                            <span className="flex items-center gap-1">
                              {m.winner === "MERAH" && <Trophy className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
                              <span>{m.fighterRedName || "PESILAT MERAH"}</span>
                            </span>
                            <span className="text-[7.5px] text-red-400/70 font-mono font-bold block">{m.fighterRedClub || "-"}</span>
                          </td>
                          {/* Sudut Biru */}
                          <td className="py-2 px-2 text-blue-300 font-black leading-tight">
                            <span className="flex items-center gap-1">
                              {m.winner === "BIRU" && <Trophy className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0" />}
                              <span>{m.fighterBlueName || "PESILAT BIRU"}</span>
                            </span>
                            <span className="text-[7.5px] text-blue-400/70 font-mono font-bold block">{m.fighterBlueClub || "-"}</span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={selectedReportMatchIds.includes(m.id)}
                              onChange={() => {
                                setSelectedReportMatchIds(prev => 
                                  prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                );
                              }}
                              className="w-3.5 h-3.5 rounded border-purple-950 text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {onLoadMatchToArena && (
                                <button
                                  type="button"
                                  onClick={() => handleLoadToArena(m)}
                                  className="px-1.5 py-1 rounded bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold text-[8.5px] uppercase transition-all active:scale-95 cursor-pointer shadow-sm flex items-center gap-0.5"
                                  title="Muat Partai Ini ke Arena Pertandingan"
                                >
                                  <Play className="w-2.5 h-2.5 fill-white" />
                                  <span>ARENA</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setEditingMatch(m)}
                                className="bg-purple-950/40 hover:bg-purple-900 text-purple-400 hover:text-white p-1 rounded transition-colors cursor-pointer border border-purple-800/20"
                                title="Edit Partai"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  sound.playClick();
                                  setConfirmDialog({
                                    type: "DELETE_SINGLE_MATCH",
                                    matchId: m.id,
                                    matchNumber: m.matchNumber || "-"
                                  });
                                }}
                                className="bg-rose-950/40 hover:bg-rose-900 text-rose-400 hover:text-white p-1 rounded transition-colors cursor-pointer border border-rose-800/20"
                                title="Hapus Partai"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      )}

      {/* TAB CONTENT 2: LAYOUT PRINT OUT PDF A4 */}
      {activeTab === "LAYOUT_A4" && (
        <main className="flex-grow p-4 sm:p-6 max-w-[1680px] mx-auto w-full">
          <JadwalPrintA4View
            schedules={schedules}
            categories={categories}
            participants={participants}
            onBackToTable={() => setActiveTab("KONTROL")}
            onUpdateSchedules={saveSchedules}
          />
        </main>
      )}

      {/* FOOTER BAR (Identical to SekretarisPanel) */}
      <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-purple-900/40 bg-[#080415] mt-auto">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="px-4 py-1.5 rounded-xl bg-[#120727] hover:bg-[#1f0d3e] border border-[#581c87]/70 text-slate-200 hover:text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BERANDA UTAMA</span>
        </button>

        <div className="flex items-center gap-3 text-right">
          <span className="text-[10px] font-mono font-bold text-purple-300/60 uppercase tracking-widest">
            NAVATARA OFFICIAL DIGITAL SCORING &ndash; JADWAL PERTANDINGAN RESMI
          </span>
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              fetchSchedules();
            }}
            className="w-7 h-7 rounded-lg bg-[#120727] hover:bg-[#1f0d3e] border border-[#581c87]/70 text-purple-400 hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-90"
            title="Sinkronisasi Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </footer>

      {/* MODAL INPUT DATA (ATLET & PERTANDINGAN PERSILAT / IPSI 2026) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-[#0b0518] border-2 border-cyan-500/60 rounded-none p-4 sm:p-6 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar text-slate-100">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-none text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-purple-900/60">
              <div className="w-9 h-9 rounded-none border border-cyan-400/50 bg-cyan-500/10 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans font-black text-sm sm:text-base text-white uppercase tracking-wider flex items-center gap-2">
                  <span>MENU INPUT DATA (ATLET & PERTANDINGAN)</span>
                </h3>
                <p className="text-[10px] text-cyan-300/80 font-mono uppercase tracking-wider">
                  REGULASI RESMI PERSILAT & PERATURAN PB IPSI 2026
                </p>
              </div>
            </div>

            {/* Sub-Tab Navigation inside Input Data Modal */}
            <div className="grid grid-cols-3 gap-1 mb-4 border-b border-purple-900/50 pb-2">
              <button
                type="button"
                onClick={() => { sound.playClick(); setInputDataSubTab("INPUT_ATLET"); }}
                className={`py-2 px-2 rounded-none font-sans font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                  inputDataSubTab === "INPUT_ATLET"
                    ? "bg-gradient-to-r from-blue-700 to-cyan-600 text-white border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "bg-[#130926] text-slate-400 border-purple-900/60 hover:text-white hover:border-purple-600"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-cyan-300" />
                <span className="truncate">1. Input Data Atlet</span>
              </button>

              <button
                type="button"
                onClick={() => { sound.playClick(); setInputDataSubTab("INPUT_PARTAI"); }}
                className={`py-2 px-2 rounded-none font-sans font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                  inputDataSubTab === "INPUT_PARTAI"
                    ? "bg-gradient-to-r from-purple-700 to-indigo-600 text-white border-purple-300 shadow-[0_0_15px_rgba(147,51,234,0.4)]"
                    : "bg-[#130926] text-slate-400 border-purple-900/60 hover:text-white hover:border-purple-600"
                }`}
              >
                <Swords className="w-3.5 h-3.5 text-purple-300" />
                <span className="truncate">2. Buat Partai</span>
              </button>

              <button
                type="button"
                onClick={() => { sound.playClick(); setInputDataSubTab("DAFTAR_ATLET"); }}
                className={`py-2 px-2 rounded-none font-sans font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                  inputDataSubTab === "DAFTAR_ATLET"
                    ? "bg-gradient-to-r from-emerald-700 to-teal-600 text-white border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    : "bg-[#130926] text-slate-400 border-purple-900/60 hover:text-white hover:border-purple-600"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-emerald-300" />
                <span className="truncate">3. Data Atlet ({participants.length})</span>
              </button>
            </div>

            {/* TAB 1: FORM INPUT DATA ATLET RESMI PERSILAT & IPSI 2026 */}
            {inputDataSubTab === "INPUT_ATLET" && (
              <form onSubmit={handleSaveAthlete} className="space-y-3.5 text-xs animate-fadeIn">
                <div className="bg-[#120727] border border-cyan-500/30 p-3 rounded-none space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-900/50 pb-1.5">
                    <span className="text-[11px] font-black uppercase text-cyan-300 tracking-wider flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-cyan-400" />
                      IDENTITAS & KATEGORI PENCAK SILAT
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-400 uppercase">Regulasi 2026</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Nama Atlit */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 uppercase text-[10.5px]">
                        NAMA LENGKAP ATLIT / PESILAT: *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAthlete.name}
                        onChange={(e) => setNewAthlete({ ...newAthlete, name: e.target.value })}
                        placeholder="Contoh: AHMAD MAULANA"
                        className="w-full px-3 py-2 rounded-none bg-[#190c33] border border-purple-700/80 text-white focus:outline-none focus:border-cyan-400 uppercase font-bold text-xs"
                      />
                    </div>

                    {/* 2. Asal Daerah / Perguruan */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 uppercase text-[10.5px]">
                        ASAL DAERAH / KONTINGEN / PERGURUAN: *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAthlete.contingent}
                        onChange={(e) => setNewAthlete({ ...newAthlete, contingent: e.target.value })}
                        placeholder="Contoh: TAPAK SUCI SLEMAN / DIY"
                        className="w-full px-3 py-2 rounded-none bg-[#190c33] border border-purple-700/80 text-white focus:outline-none focus:border-cyan-400 uppercase font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 3. Kategori Tanding (Kelompok Usia) */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 uppercase text-[10.5px]">
                        KATEGORI USIA (IPSI 2026):
                      </label>
                      <select
                        value={newAthlete.ageCategory}
                        onChange={(e) => {
                          const age = e.target.value;
                          const defaultClass = IPSI_WEIGHT_CLASSES[age]?.[1]?.label || "Kelas A";
                          setNewAthlete({ ...newAthlete, ageCategory: age, weightClass: defaultClass });
                        }}
                        className="w-full px-3 py-2 rounded-none bg-[#190c33] border border-purple-700/80 text-white font-bold text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="Usia Dini">Usia Dini (7 - 11 Tahun)</option>
                        <option value="Pra Remaja">Pra Remaja (12 - 14 Tahun)</option>
                        <option value="Remaja">Remaja (14 - 17 Tahun)</option>
                        <option value="Dewasa">Dewasa (17 - 45 Tahun)</option>
                        <option value="Master">Master (Di atas 45 Tahun)</option>
                      </select>
                    </div>

                    {/* 4. Jenis Kelamin */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 uppercase text-[10.5px]">
                        JENIS KELAMIN:
                      </label>
                      <select
                        value={newAthlete.gender}
                        onChange={(e) => setNewAthlete({ ...newAthlete, gender: e.target.value })}
                        className="w-full px-3 py-2 rounded-none bg-[#190c33] border border-purple-700/80 text-white font-bold text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value="PUTRA">PUTRA</option>
                        <option value="PUTRI">PUTRI</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 5. Kelas Tanding Sesuai Aturan PERSILAT & IPSI 2026 */}
                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-bold mb-1 uppercase text-[10.5px]">
                        KELAS TANDING (RENTANG BOBOT RESMI):
                      </label>
                      <select
                        value={newAthlete.weightClass}
                        onChange={(e) => setNewAthlete({ ...newAthlete, weightClass: e.target.value })}
                        className="w-full px-3 py-2 rounded-none bg-[#190c33] border border-purple-700/80 text-white font-bold text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        {(IPSI_WEIGHT_CLASSES[newAthlete.ageCategory] || []).map((cls) => (
                          <option key={cls.label} value={cls.label}>
                            {cls.label} ({cls.range})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 6. Berat Badan Timbang Riil (Kg) */}
                    <div>
                      <label className="block text-slate-300 font-bold mb-1 uppercase text-[10.5px]">
                        BERAT TIMBANG (KG):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newAthlete.weight}
                        onChange={(e) => setNewAthlete({ ...newAthlete, weight: e.target.value })}
                        placeholder="Contoh: 42.5"
                        className="w-full px-3 py-2 rounded-none bg-[#190c33] border border-purple-700/80 text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* 7. Nomor Undian / Seed Loting */}
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 uppercase text-[10.5px]">
                      NOMOR UNDIAN / SEED LOTING (OPSIONAL):
                    </label>
                    <input
                      type="number"
                      value={newAthlete.seed}
                      onChange={(e) => setNewAthlete({ ...newAthlete, seed: e.target.value })}
                      placeholder="Contoh: 1 atau 2 (Biarkan kosong jika belum diundi)"
                      className="w-full px-3 py-2 rounded-none bg-[#190c33] border border-purple-700/80 text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-cyan-300/80 font-mono">
                    Total Atlet Terdaftar: {participants.length} Pesilat
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 rounded-none bg-[#190c33] text-slate-300 font-bold text-xs uppercase hover:bg-[#271350] transition-all cursor-pointer"
                    >
                      TUTUP
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-none bg-gradient-to-r from-blue-700 via-cyan-600 to-teal-600 hover:from-blue-600 hover:to-cyan-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      SIMPAN DATA ATLET
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TAB 2: BUAT PARTAI PERTANDINGAN DARI DATA ATLET */}
            {inputDataSubTab === "INPUT_PARTAI" && (
              <form onSubmit={handleAddMatch} className="space-y-3.5 text-xs animate-fadeIn">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 uppercase text-[10.5px]">Nomor Partai: *</label>
                    <input
                      type="number"
                      required
                      value={newMatch.matchNumber}
                      onChange={(e) => setNewMatch({ ...newMatch, matchNumber: e.target.value })}
                      placeholder="Contoh: 1"
                      className="w-full px-3 py-2 rounded-none bg-[#190c33] border border-purple-700/80 text-white focus:outline-none focus:border-purple-400 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 uppercase text-[10.5px]">Gelanggang: *</label>
                    <select
                      value={newMatch.arena}
                      onChange={(e) => setNewMatch({ ...newMatch, arena: e.target.value })}
                      className="w-full px-3 py-2 rounded-none bg-[#190c33] border border-purple-700/80 text-white font-bold text-xs focus:outline-none focus:border-purple-400 cursor-pointer"
                    >
                      <option value="GELANGGANG A">GELANGGANG A</option>
                      <option value="GELANGGANG B">GELANGGANG B</option>
                      <option value="GELANGGANG C">GELANGGANG C</option>
                      <option value="GELANGGANG D">GELANGGANG D</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 uppercase text-[10.5px]">Babak / Tahap:</label>
                    <select
                      value={newMatch.stage}
                      onChange={(e) => setNewMatch({ ...newMatch, stage: e.target.value })}
                      className="w-full px-3 py-2 rounded-none bg-[#190c33] border border-purple-700/80 text-white font-bold text-xs focus:outline-none focus:border-purple-400 cursor-pointer"
                    >
                      <option value="Penyisihan">Penyisihan</option>
                      <option value="Perempat Final">Perempat Final</option>
                      <option value="Semifinal">Semifinal</option>
                      <option value="Final">Final</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 uppercase text-[10.5px]">Jenis Kelamin:</label>
                    <select
                      value={newMatch.gender}
                      onChange={(e) => setNewMatch({ ...newMatch, gender: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-none bg-[#190c33] border border-purple-700/80 text-white font-bold text-xs focus:outline-none focus:border-purple-400 cursor-pointer"
                    >
                      <option value="PUTRA">PUTRA</option>
                      <option value="PUTRI">PUTRI</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 uppercase text-[10.5px]">Kelas Pertandingan:</label>
                  <input
                    type="text"
                    required
                    value={newMatch.classCategory}
                    onChange={(e) => setNewMatch({ ...newMatch, classCategory: e.target.value })}
                    placeholder="Contoh: Tanding Remaja Kelas A Putra (39-43 Kg)"
                    className="w-full px-3 py-2 rounded-none bg-[#190c33] border border-purple-700/80 text-white focus:outline-none focus:border-purple-400 text-xs font-bold"
                  />
                </div>

                {/* Atlit Sudut Biru */}
                <div className="p-3 rounded-none bg-blue-950/40 border border-blue-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="block font-black text-blue-400 uppercase text-[10.5px]">SUDUT BIRU</span>
                    {participants.length > 0 && (
                      <select
                        onChange={(e) => handleSelectAthleteForMatch("BLUE", e.target.value)}
                        className="px-2 py-0.5 rounded-none bg-[#120727] border border-blue-400/50 text-[10px] text-blue-300 font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Pilih dari Data Atlit --</option>
                        {participants.map((p) => (
                          <option key={`p-blue-${p.id}`} value={p.id}>
                            {p.name} ({p.contingent || p.club || "-"})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Nama Pesilat Biru *"
                    value={newMatch.fighterBlueName}
                    onChange={(e) => setNewMatch({ ...newMatch, fighterBlueName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-none bg-[#150a2b] border border-blue-800 text-slate-100 focus:outline-none focus:border-blue-400 uppercase font-bold text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Asal Daerah / Perguruan Biru"
                    value={newMatch.fighterBlueClub}
                    onChange={(e) => setNewMatch({ ...newMatch, fighterBlueClub: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-none bg-[#150a2b] border border-blue-800 text-slate-100 focus:outline-none focus:border-blue-400 uppercase text-xs"
                  />
                </div>

                {/* Atlit Sudut Merah */}
                <div className="p-3 rounded-none bg-red-950/40 border border-red-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="block font-black text-red-400 uppercase text-[10.5px]">SUDUT MERAH</span>
                    {participants.length > 0 && (
                      <select
                        onChange={(e) => handleSelectAthleteForMatch("RED", e.target.value)}
                        className="px-2 py-0.5 rounded-none bg-[#120727] border border-red-400/50 text-[10px] text-red-300 font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="">-- Pilih dari Data Atlit --</option>
                        {participants.map((p) => (
                          <option key={`p-red-${p.id}`} value={p.id}>
                            {p.name} ({p.contingent || p.club || "-"})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Nama Pesilat Merah *"
                    value={newMatch.fighterRedName}
                    onChange={(e) => setNewMatch({ ...newMatch, fighterRedName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-none bg-[#150a2b] border border-red-800 text-slate-100 focus:outline-none focus:border-red-400 uppercase font-bold text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Asal Daerah / Perguruan Merah"
                    value={newMatch.fighterRedClub}
                    onChange={(e) => setNewMatch({ ...newMatch, fighterRedClub: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-none bg-[#150a2b] border border-red-800 text-slate-100 focus:outline-none focus:border-red-400 uppercase text-xs"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-none bg-[#190c33] text-slate-300 font-bold text-xs uppercase hover:bg-[#271350] transition-all cursor-pointer"
                  >
                    BATAL
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-none bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    SIMPAN PARTAI KE JADWAL
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: DAFTAR ATLET TERDAFTAR (REKAP DATA PESILAT) */}
            {inputDataSubTab === "DAFTAR_ATLET" && (
              <div className="space-y-3 text-xs animate-fadeIn">
                <div className="flex items-center justify-between border-b border-purple-900/50 pb-2">
                  <span className="text-[11px] font-mono text-cyan-300 font-bold uppercase">
                    Total Atlet Terdaftar: {participants.length} Pesilat
                  </span>
                  <button
                    type="button"
                    onClick={() => setInputDataSubTab("INPUT_ATLET")}
                    className="px-2.5 py-1 rounded-none bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white border border-cyan-400/50 text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Tambah Atlet Baru
                  </button>
                </div>

                {participants.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic bg-[#130728] border border-purple-900/40 rounded-none">
                    Belum ada data atlet yang diinput. Silakan buka tab "1. Input Data Atlet" untuk mendaftarkan atlet baru.
                  </div>
                ) : (
                  <div className="max-h-[50vh] overflow-y-auto border border-purple-900/60 rounded-none">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#190c33] text-purple-200 border-b border-purple-800 text-[10px] font-mono uppercase sticky top-0">
                        <tr>
                          <th className="p-2 w-8 text-center">No</th>
                          <th className="p-2">Nama Atlit</th>
                          <th className="p-2">Perguruan / Daerah</th>
                          <th className="p-2">Kategori Usia</th>
                          <th className="p-2">Gender</th>
                          <th className="p-2">Kelas</th>
                          <th className="p-2 text-center w-12">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-950">
                        {participants.map((p, idx) => (
                          <tr key={p.id || idx} className="hover:bg-purple-950/40 transition-colors">
                            <td className="p-2 text-center font-mono text-slate-400 text-[10px]">{idx + 1}</td>
                            <td className="p-2 font-bold text-white uppercase">{p.name}</td>
                            <td className="p-2 text-slate-300 uppercase">{p.contingent || p.club || "-"}</td>
                            <td className="p-2 text-cyan-300 font-mono text-[10px] uppercase">{p.ageCategory || "Remaja"}</td>
                            <td className="p-2 text-slate-300 font-mono text-[10px]">{p.gender || "PUTRA"}</td>
                            <td className="p-2 text-amber-300 font-bold font-mono text-[10px]">{p.weightClass || "Kelas A"}</td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteAthlete(p.id, p.name)}
                                className="p-1 rounded-none text-red-400 hover:text-white hover:bg-red-800/60 transition-colors cursor-pointer"
                                title="Hapus Atlet"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-none bg-[#190c33] text-slate-300 font-bold text-xs uppercase hover:bg-[#271350] transition-all cursor-pointer"
                  >
                    SELESAI
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL EDIT PARTAI */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0720] border-2 border-purple-500/50 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setEditingMatch(null)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-sans font-black text-sm text-amber-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Edit className="w-4 h-4" />
              EDIT PARTAI {editingMatch.matchNumber}
            </h3>

            <form onSubmit={handleSaveEditMatch} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-purple-300 font-bold mb-1">Nomor Partai:</label>
                  <input
                    type="text"
                    required
                    value={editingMatch.matchNumber || ""}
                    onChange={(e) => setEditingMatch({ ...editingMatch, matchNumber: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#150a2b] border border-purple-800 text-slate-100 focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-purple-300 font-bold mb-1">Gelanggang:</label>
                  <input
                    type="text"
                    required
                    value={editingMatch.arena || ""}
                    onChange={(e) => setEditingMatch({ ...editingMatch, arena: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#150a2b] border border-purple-800 text-slate-100 focus:outline-none focus:border-purple-400 uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-purple-300 font-bold mb-1">Babak / Tahap:</label>
                  <input
                    type="text"
                    value={editingMatch.stage || ""}
                    onChange={(e) => setEditingMatch({ ...editingMatch, stage: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#150a2b] border border-purple-800 text-slate-100 focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="block text-purple-300 font-bold mb-1">Kelas Tanding:</label>
                  <input
                    type="text"
                    value={editingMatch.classCategory || ""}
                    onChange={(e) => setEditingMatch({ ...editingMatch, classCategory: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#150a2b] border border-purple-800 text-slate-100 focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Atlit Merah */}
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 space-y-2">
                <span className="block font-bold text-red-400 uppercase text-[10px]">Data Sudut Merah</span>
                <input
                  type="text"
                  placeholder="Nama Pesilat Merah"
                  value={editingMatch.fighterRedName || ""}
                  onChange={(e) => setEditingMatch({ ...editingMatch, fighterRedName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#150a2b] border border-red-800 text-slate-100 uppercase"
                />
                <input
                  type="text"
                  placeholder="Kontingen Sudut Merah"
                  value={editingMatch.fighterRedClub || ""}
                  onChange={(e) => setEditingMatch({ ...editingMatch, fighterRedClub: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#150a2b] border border-red-800 text-slate-100 uppercase"
                />
              </div>

              {/* Atlit Biru */}
              <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-2">
                <span className="block font-bold text-blue-400 uppercase text-[10px]">Data Sudut Biru</span>
                <input
                  type="text"
                  placeholder="Nama Pesilat Biru"
                  value={editingMatch.fighterBlueName || ""}
                  onChange={(e) => setEditingMatch({ ...editingMatch, fighterBlueName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#150a2b] border border-blue-800 text-slate-100 uppercase"
                />
                <input
                  type="text"
                  placeholder="Kontingen Sudut Biru"
                  value={editingMatch.fighterBlueClub || ""}
                  onChange={(e) => setEditingMatch({ ...editingMatch, fighterBlueClub: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#150a2b] border border-blue-800 text-slate-100 uppercase"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="px-4 py-2 rounded-xl bg-[#150a2b] text-slate-300 font-bold hover:bg-[#25104d] transition-all cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  SIMPAN PERUBAHAN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
