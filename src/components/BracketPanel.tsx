/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { 
  GitBranch, 
  ArrowLeft, 
  Download, 
  Search, 
  Layers, 
  Trophy, 
  Filter, 
  Users, 
  Plus, 
  Printer, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Medal,
  Swords,
  CheckCircle2,
  Clock,
  Play,
  Trash2,
  UserX,
  AlertTriangle,
  Sliders,
  Eye,
  UserPlus,
  Flame,
  Award,
  Dice5,
  Check
} from "lucide-react";
import { sound } from "../utils/sound";
import { TournamentBracketView, BracketParticipant, BracketMatch } from "./TournamentBracketView";
import { jsPDF } from "jspdf";
import {
  normalizeAthleteRecord,
  normalizeAgeCategory,
  normalizeWeightClass,
  getCanonicalCategoryClassId,
  buildAutoSchedulesAndCategories,
  syncAndGenerateSchedulesFromParticipants,
  clearAllSchedulesAndBrackets,
  getCategoryMethodsFromStorage,
  getCategoryPemasalanSchemesFromStorage,
  getCategoryPrestasiSchemesFromStorage
} from "../utils/baganGenerator";
import {
  getParameterPertandinganConfig,
  drawPdfLogo,
  drawPdfOfficialSignatures,
  preloadLogoForPdf
} from "../utils/pdfKopHelper";

interface BracketPanelProps {
  onBack: () => void;
  onOpenMatch?: (match: any) => void;
  hideBackHeader?: boolean;
}

// Custom Power Icon matching the user's uploaded on off.JPG
function PowerButtonIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="11" 
      strokeLinecap="round" 
      className={className}
    >
      {/* Circle arc with open gap at the top */}
      <path d="M 33 24 A 36 36 0 1 0 67 24" />
      {/* Vertical power bar */}
      <line x1="50" y1="11" x2="50" y2="44" />
    </svg>
  );
}

export function BracketPanel({ onBack, onOpenMatch, hideBackHeader = false }: BracketPanelProps) {
  // Track if bracket was explicitly cleared by user ("Kosongkan")
  const [bracketCleared, setBracketCleared] = useState<boolean>(() => {
    try {
      return localStorage.getItem("jrz_bracket_cleared") === "true";
    } catch {}
    return false;
  });

  // Load participants & schedules from localStorage (real-time sync with Panel Loting)
  const [participants, setParticipants] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("jrz_cached_participants");
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.map((p, idx) => normalizeAthleteRecord(p, idx));
      }
    } catch {}
    const starter = [
      { id: "atlet-1", name: "FAJAR NUGRAHA", contingent: "PERSILAT BEKASI", ageCategory: "Remaja", gender: "PUTRA", weightClass: "Kelas A", weight: 42, seed: 1 },
      { id: "atlet-2", name: "EKO WAHYUDI", contingent: "TAPAK SUCI ACEH", ageCategory: "Remaja", gender: "PUTRA", weightClass: "Kelas A", weight: 41.5, seed: 2 },
      { id: "atlet-3", name: "ANDI SETIAWAN", contingent: "PERISAI DIRI BANTEN", ageCategory: "Remaja", gender: "PUTRA", weightClass: "Kelas A", weight: 42.8, seed: 3 },
      { id: "atlet-4", name: "BAYU PRATAMA", contingent: "MERPATI PUTIH JABAR", ageCategory: "Remaja", gender: "PUTRA", weightClass: "Kelas A", weight: 40.2, seed: 4 },
      { id: "atlet-5", name: "RIAN HIDAYAT", contingent: "SETIA HATI TERATE", ageCategory: "Dewasa", gender: "PUTRA", weightClass: "Kelas C", weight: 58.5, seed: 1 },
      { id: "atlet-6", name: "DENI SAPUTRA", contingent: "PAGAR NUSA JATIM", ageCategory: "Dewasa", gender: "PUTRA", weightClass: "Kelas C", weight: 59.1, seed: 2 },
      { id: "atlet-7", name: "SITI NURHALIZA", contingent: "KPS NUSANTARA", ageCategory: "Dewasa", gender: "PUTRI", weightClass: "Kelas D", weight: 62.4, seed: 1 },
      { id: "atlet-8", name: "DEWI ANGGRAINI", contingent: "CIMANDE BOGOR", ageCategory: "Dewasa", gender: "PUTRI", weightClass: "Kelas D", weight: 63.0, seed: 2 }
    ];
    return starter.map((p, idx) => normalizeAthleteRecord(p, idx));
  });

  const [schedules, setSchedules] = useState<any[]>(() => {
    try {
      if (localStorage.getItem("jrz_bracket_cleared") === "true") {
        return [];
      }
      const saved = localStorage.getItem("jrz_cached_schedules");
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    // Automatically build schedules from current participants if not cleared
    try {
      const savedP = localStorage.getItem("jrz_cached_participants");
      const rawP = savedP !== null ? JSON.parse(savedP) : [];
      if (Array.isArray(rawP) && rawP.length > 0) {
        const auto = buildAutoSchedulesAndCategories(rawP);
        return auto.matches;
      }
    } catch {}
    return [];
  });

  // List of 4 age categories
  const AGE_CATEGORIES = [
    { id: "dini", label: "USIA DINI", ageKey: "Usia Dini" },
    { id: "pra", label: "PRA REMAJA", ageKey: "Pra Remaja" },
    { id: "remaja", label: "REMAJA", ageKey: "Remaja" },
    { id: "dewasa", label: "DEWASA", ageKey: "Dewasa" }
  ];

  // Per-category methods: PRESTASI (Merah / OFF) vs PEMASALAN (Hijau / ON)
  const [categoryMethods, setCategoryMethods] = useState<Record<string, "PRESTASI" | "PEMASALAN">>(() =>
    getCategoryMethodsFromStorage()
  );

  // Per-category skema pemasalan: SEMIFINAL vs FINAL
  const [categoryPemasalanSchemes, setCategoryPemasalanSchemes] = useState<Record<string, "SEMIFINAL" | "FINAL">>(() =>
    getCategoryPemasalanSchemesFromStorage()
  );

  // Per-category skema prestasi: SINGLE_NO_POOL vs POOL_AB
  const [categoryPrestasiSchemes, setCategoryPrestasiSchemes] = useState<Record<string, string>>(() =>
    getCategoryPrestasiSchemesFromStorage()
  );

  // Active Category & Filter State (Automatically initialized to last active filter from LotingPanel or first non-empty class)
  const [selectedAge, setSelectedAge] = useState<string>(() => {
    try {
      const f = localStorage.getItem("jrz_active_category_filter");
      if (f) {
        const parsed = JSON.parse(f);
        if (parsed?.ageCategory) return normalizeAgeCategory(parsed.ageCategory);
      }
    } catch {}
    return "Remaja";
  });

  const [selectedClass, setSelectedClass] = useState<string>(() => {
    try {
      const f = localStorage.getItem("jrz_active_category_filter");
      if (f) {
        const parsed = JSON.parse(f);
        if (parsed?.weightClass) return normalizeWeightClass(parsed.weightClass);
      }
    } catch {}
    return "Kelas A";
  });

  const [selectedGender, setSelectedGender] = useState<"PUTRA" | "PUTRI">(() => {
    try {
      const f = localStorage.getItem("jrz_active_category_filter");
      if (f) {
        const parsed = JSON.parse(f);
        if (parsed?.gender === "PUTRI" || parsed?.gender === "PUTRA") return parsed.gender;
      }
    } catch {}
    return "PUTRA";
  });

  // Metode Pertandingan active category
  const [competitionMethod, setCompetitionMethod] = useState<"PRESTASI" | "PEMASALAN">(() => {
    const methods = getCategoryMethodsFromStorage();
    return methods[selectedAge] || "PRESTASI";
  });

  // Skema Pemasalan active category
  const [pemasalanScheme, setPemasalanScheme] = useState<"SEMIFINAL" | "FINAL">(() => {
    const schemes = getCategoryPemasalanSchemesFromStorage();
    return schemes[selectedAge] || "SEMIFINAL";
  });

  // Skema Prestasi active category
  const [selectedPoolScheme, setSelectedPoolScheme] = useState(() => {
    const schemes = getCategoryPrestasiSchemesFromStorage();
    return schemes[selectedAge] || "SINGLE_NO_POOL";
  });
  const [selectedPoolFilter, setSelectedPoolFilter] = useState<string>("ALL");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selalu tampilkan semua bagan/pool saat kategori, kelas, atau gender berubah
  useEffect(() => {
    setSelectedPoolFilter("ALL");
  }, [selectedAge, selectedClass, selectedGender]);

  // In-App Confirm Modal State (replaces window.confirm which is blocked in iframe)
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "CLEAR_BRACKET" | "DELETE_MATCH" | "DELETE_CORNER_ATHLETE" | "DELETE_REGISTERED_ATHLETE";
    matchId?: string;
    matchNumber?: string | number;
    corner?: "BLUE" | "RED";
    athleteId?: string;
    athleteName?: string;
  } | null>(null);

  // Auto-sync on mount & listen to localStorage/BroadcastChannel/CustomEvent from LotingPanel & JadwalPanel
  useEffect(() => {
    // If participants exist and bracket is not cleared, ensure schedules are up-to-date
    if (participants.length > 0 && !bracketCleared && schedules.length === 0) {
      syncAndGenerateSchedulesFromParticipants(participants).then(res => {
        setParticipants(res.participants);
        setSchedules(res.matches);
      });
    }

    const syncFromLoting = (evt?: any) => {
      try {
        const isClearedNow = localStorage.getItem("jrz_bracket_cleared") === "true";
        setBracketCleared(isClearedNow);

        const methods = getCategoryMethodsFromStorage();
        const pSchemes = getCategoryPemasalanSchemesFromStorage();
        const prSchemes = getCategoryPrestasiSchemesFromStorage();
        setCategoryMethods(methods);
        setCategoryPemasalanSchemes(pSchemes);
        setCategoryPrestasiSchemes(prSchemes);

        const savedP = localStorage.getItem("jrz_cached_participants");
        let currentP: any[] = [];
        if (savedP !== null) {
          const parsed = JSON.parse(savedP);
          if (Array.isArray(parsed)) {
            currentP = parsed.map((p, idx) => normalizeAthleteRecord(p, idx));
            setParticipants(currentP);
          }
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
              setSchedules(auto.matches);
            }
          }
        }

        // Check if activeFilter was dispatched or saved
        const activeFilter = evt?.detail?.activeFilter || (() => {
          try {
            const rawF = localStorage.getItem("jrz_active_category_filter");
            return rawF ? JSON.parse(rawF) : null;
          } catch {
            return null;
          }
        })();

        if (activeFilter && activeFilter.ageCategory && activeFilter.weightClass) {
          const nAge = normalizeAgeCategory(activeFilter.ageCategory);
          const nCls = normalizeWeightClass(activeFilter.weightClass);
          const nGen = activeFilter.gender === "PUTRI" ? "PUTRI" : "PUTRA";
          setSelectedAge(nAge);
          setSelectedClass(nCls);
          setSelectedGender(nGen);
          setCompetitionMethod(methods[nAge] || "PRESTASI");
          setPemasalanScheme(pSchemes[nAge] || "SEMIFINAL");
          setSelectedPoolScheme(prSchemes[nAge] || "SINGLE_NO_POOL");
        }
      } catch {}
    };

    window.addEventListener("storage", syncFromLoting);
    window.addEventListener("focus", syncFromLoting);
    window.addEventListener("jrz_tournament_synced", syncFromLoting as EventListener);
    window.addEventListener("jrz_schedules_updated", syncFromLoting as EventListener);
    window.addEventListener("jrz_athletes_updated", syncFromLoting as EventListener);

    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel("jrz_match_sync_A");
      ch.onmessage = () => syncFromLoting();
    } catch {}

    return () => {
      window.removeEventListener("storage", syncFromLoting);
      window.removeEventListener("focus", syncFromLoting);
      window.removeEventListener("jrz_tournament_synced", syncFromLoting as EventListener);
      window.removeEventListener("jrz_schedules_updated", syncFromLoting as EventListener);
      window.removeEventListener("jrz_athletes_updated", syncFromLoting as EventListener);
      if (ch) ch.close();
    };
  }, []);

  // Auto-select a class that actually has registered athletes if current selection is empty
  useEffect(() => {
    if (participants.length === 0) return;
    const hasInCurrent = participants.some(
      p =>
        normalizeAgeCategory(p.ageCategory) === normalizeAgeCategory(selectedAge) &&
        normalizeWeightClass(p.weightClass) === normalizeWeightClass(selectedClass) &&
        p.gender === selectedGender
    );
    if (!hasInCurrent) {
      // Find first athlete in selectedAge, or any athlete
      const inSameAge = participants.find(p => normalizeAgeCategory(p.ageCategory) === normalizeAgeCategory(selectedAge));
      const target = inSameAge || participants[0];
      if (target) {
        const nAge = normalizeAgeCategory(target.ageCategory);
        const nCls = normalizeWeightClass(target.weightClass);
        const nGen = target.gender === "PUTRI" ? "PUTRI" : "PUTRA";
        setSelectedAge(nAge);
        setSelectedClass(nCls);
        setSelectedGender(nGen);
        setCompetitionMethod(categoryMethods[nAge] || "PRESTASI");
        setPemasalanScheme(categoryPemasalanSchemes[nAge] || "SEMIFINAL");
        setSelectedPoolScheme(categoryPrestasiSchemes[nAge] || "SINGLE_NO_POOL");
      }
    }
  }, [participants]);

  // Toggle switch method on a specific category -> Automatically rebuilds Bagan & Jadwal!
  const handleToggleCategoryMethod = async (ageKey: string) => {
    sound.playClick();
    const current = categoryMethods[ageKey] || "PRESTASI";
    const next: "PRESTASI" | "PEMASALAN" = current === "PRESTASI" ? "PEMASALAN" : "PRESTASI";
    const updated: Record<string, "PRESTASI" | "PEMASALAN"> = { ...categoryMethods, [ageKey]: next };
    setCategoryMethods(updated);
    try {
      localStorage.setItem("jrz_category_methods", JSON.stringify(updated));
    } catch {}

    // Set category as active and sync states
    setSelectedAge(ageKey);
    setCompetitionMethod(next);
    try {
      localStorage.setItem("jrz_competition_method", next);
    } catch {}
    const ps = categoryPemasalanSchemes[ageKey] || "SEMIFINAL";
    setPemasalanScheme(ps);
    const prs = categoryPrestasiSchemes[ageKey] || "SINGLE_NO_POOL";
    setSelectedPoolScheme(prs);

    if (participants.length > 0) {
      setBracketCleared(false);
      const res = await syncAndGenerateSchedulesFromParticipants(participants, {
        activeFilter: { ageCategory: ageKey, weightClass: selectedClass, gender: selectedGender }
      });
      setSchedules(res.matches);
    }

    showToast(
      next === "PEMASALAN"
        ? `🟢 ${ageKey.toUpperCase()}: Tombol HIJAU Aktif (Metode Pemasalan) & Jadwal Diperbarui`
        : `🔴 ${ageKey.toUpperCase()}: Tombol MERAH Aktif (Metode Prestasi) & Jadwal Diperbarui`
    );
  };

  // Select active category card
  const handleSelectCategory = (ageKey: string) => {
    sound.playClick();
    setSelectedAge(ageKey);
    const m = categoryMethods[ageKey] || "PRESTASI";
    setCompetitionMethod(m);
    try {
      localStorage.setItem("jrz_competition_method", m);
    } catch {}
    const ps = categoryPemasalanSchemes[ageKey] || "SEMIFINAL";
    setPemasalanScheme(ps);
    try {
      localStorage.setItem("jrz_pemasalan_scheme", ps);
    } catch {}
    const prs = categoryPrestasiSchemes[ageKey] || "SINGLE_NO_POOL";
    setSelectedPoolScheme(prs);

    // If this age category has athletes in another class, switch to that class automatically
    const inThisAge = participants.filter(p => normalizeAgeCategory(p.ageCategory) === normalizeAgeCategory(ageKey));
    if (inThisAge.length > 0) {
      const hasCurrentClass = inThisAge.some(
        p => normalizeWeightClass(p.weightClass) === normalizeWeightClass(selectedClass) && p.gender === selectedGender
      );
      if (!hasCurrentClass) {
        setSelectedClass(normalizeWeightClass(inThisAge[0].weightClass));
        setSelectedGender(inThisAge[0].gender === "PUTRI" ? "PUTRI" : "PUTRA");
      }
    }
  };

  // Update pemasalan scheme for category -> Automatically rebuilds Bagan & Jadwal!
  const handleUpdateCategoryPemasalanScheme = async (ageKey: string, scheme: "SEMIFINAL" | "FINAL") => {
    sound.playClick();
    const updated = { ...categoryPemasalanSchemes, [ageKey]: scheme };
    setCategoryPemasalanSchemes(updated);
    try {
      localStorage.setItem("jrz_category_pemasalan_schemes", JSON.stringify(updated));
    } catch {}

    if (selectedAge === ageKey) {
      setPemasalanScheme(scheme);
      try {
        localStorage.setItem("jrz_pemasalan_scheme", scheme);
      } catch {}
    }

    if (participants.length > 0) {
      setBracketCleared(false);
      const res = await syncAndGenerateSchedulesFromParticipants(participants, {
        activeFilter: { ageCategory: ageKey, weightClass: selectedClass, gender: selectedGender }
      });
      setSchedules(res.matches);
    }
    showToast(`Skema Pemasalan ${ageKey}: ${scheme} (Bagan & Jadwal Diperbarui)`);
  };

  // Update prestasi scheme for category -> Automatically rebuilds Bagan & Jadwal!
  const handleUpdateCategoryPrestasiScheme = async (ageKey: string, scheme: string) => {
    sound.playClick();
    const updated = { ...categoryPrestasiSchemes, [ageKey]: scheme };
    setCategoryPrestasiSchemes(updated);
    try {
      localStorage.setItem("jrz_category_prestasi_schemes", JSON.stringify(updated));
    } catch {}

    if (selectedAge === ageKey) {
      setSelectedPoolScheme(scheme);
    }

    if (participants.length > 0) {
      setBracketCleared(false);
      const res = await syncAndGenerateSchedulesFromParticipants(participants, {
        activeFilter: { ageCategory: ageKey, weightClass: selectedClass, gender: selectedGender }
      });
      setSchedules(res.matches);
    }
    showToast(`Skema Prestasi ${ageKey}: ${scheme === "POOL_AB" ? "POOL A & B" : "SINGLE POOL"} (Bagan & Jadwal Diperbarui)`);
  };

  // Quick Add Athlete State
  const [showAddAthlete, setShowAddAthlete] = useState(false);
  const [newAthleteName, setNewAthleteName] = useState("");
  const [newAthleteClub, setNewAthleteClub] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Canonical category ID
  const selectedCategoryId = useMemo(() => {
    return getCanonicalCategoryClassId(selectedAge, selectedClass);
  }, [selectedAge, selectedClass]);

  const currentCategoryName = useMemo(() => {
    return `Tanding ${selectedAge} ${selectedClass} ${selectedGender}`;
  }, [selectedAge, selectedClass, selectedGender]);

  // Filter participants for this specific category and gender (DATA HASIL LOTING DARI PANEL LOTING)
  const currentClassAthletes = useMemo(() => {
    const normAge = normalizeAgeCategory(selectedAge);
    const normCls = normalizeWeightClass(selectedClass);

    const matchesCategory = (p: any) => {
      const pAge = normalizeAgeCategory(p.ageCategory || p.division);
      const pCls = normalizeWeightClass(p.weightClass || p.className);
      const pGen = (p.gender || "PUTRA").toUpperCase();
      if (pAge === normAge && pCls === normCls && pGen === selectedGender.toUpperCase()) {
        return true;
      }
      if (p.categoryClassId === selectedCategoryId && pGen === selectedGender.toUpperCase()) {
        return true;
      }
      return false;
    };

    const list = participants.filter(matchesCategory);
    // Sort according to loting seed number
    return [...list].sort((a, b) => (a.seed || 999) - (b.seed || 999));
  }, [participants, selectedAge, selectedClass, selectedGender, selectedCategoryId]);

  // Count of athletes in current category that already have lottery seed from loting panel
  const lotingSeededCount = useMemo(() => {
    return currentClassAthletes.filter(a => a.seed && a.seed > 0).length;
  }, [currentClassAthletes]);

  // Overall participants breakdown by Age Category (from loting panel data)
  const ageCategoryLotingStats = useMemo(() => {
    const stats: Record<string, number> = {
      "Usia Dini": 0,
      "Pra Remaja": 0,
      "Remaja": 0,
      "Dewasa": 0
    };
    participants.forEach(p => {
      const norm = normalizeAgeCategory(p.ageCategory || p.age || p.division || "");
      if (stats[norm] !== undefined) {
        stats[norm]++;
      }
    });
    return stats;
  }, [participants]);

  // Normalized bracket participants for Prestasi tree (Empty when bracketCleared is true!)
  const bracketParticipants: BracketParticipant[] = useMemo(() => {
    if (bracketCleared) return [];
    return currentClassAthletes.map((p, idx) => ({
      id: p.id || `p-${idx}`,
      name: p.name || `Atlet ${idx + 1}`,
      club: p.contingent || p.club || "-",
      contingent: p.contingent || p.club || "-",
      gender: p.gender || selectedGender,
      categoryClassId: selectedCategoryId,
      seed: p.seed || idx + 1
    }));
  }, [currentClassAthletes, selectedCategoryId, selectedGender, bracketCleared]);

  // Normalized bracket matches for Prestasi tree
  const bracketMatches: BracketMatch[] = useMemo(() => {
    if (bracketCleared) return [];
    const normAge = normalizeAgeCategory(selectedAge).toLowerCase();
    const normCls = normalizeWeightClass(selectedClass).toLowerCase();

    return schedules
      .filter(m => {
        const mGen = (m.gender || "PUTRA").toUpperCase();
        if (mGen !== selectedGender.toUpperCase()) return false;
        if (m.categoryClassId === selectedCategoryId) return true;
        if (m.ageCategory && m.weightClass) {
          return (
            normalizeAgeCategory(m.ageCategory).toLowerCase() === normAge &&
            normalizeWeightClass(m.weightClass).toLowerCase() === normCls
          );
        }
        if (m.classCategory) {
          const c = m.classCategory.toLowerCase();
          return c.includes(normAge) && c.includes(normCls);
        }
        return false;
      })
      .map((m, idx) => ({
        id: m.id || `m-${idx}`,
        matchNumber: m.matchNumber || idx + 1,
        categoryClassId: selectedCategoryId,
        stage: m.stage || "Penyisihan",
        gender: m.gender || selectedGender,
        fighterBlueName: m.fighterBlueName || "SUDUT BIRU",
        fighterBlueClub: m.fighterBlueClub || "-",
        fighterRedName: m.fighterRedName || "SUDUT MERAH",
        fighterRedClub: m.fighterRedClub || "-",
        scoreBlue: m.scoreBlue ?? 0,
        scoreRed: m.scoreRed ?? 0,
        winner: m.winner || null,
        status: m.status || "BELUM",
        arena: m.arena || "A"
      }));
  }, [schedules, selectedAge, selectedClass, selectedCategoryId, selectedGender, bracketCleared]);

  // ---------------------------------------------------------------------------
  // PEMASALAN POOLS CALCULATION
  // ---------------------------------------------------------------------------
  interface PemasalanPool {
    poolLetter: string;
    poolName: string;
    athletes: any[];
    semifinal1?: any;
    semifinal2?: any;
    finalMatch?: any;
    champion?: any;
    runnerUp?: any;
    bronze1?: any;
    bronze2?: any;
  }

  const pemasalanPools = useMemo<PemasalanPool[]>(() => {
    if (competitionMethod !== "PEMASALAN" || bracketCleared) return [];

    const poolCapacity = pemasalanScheme === "SEMIFINAL" ? 4 : 2;
    const athletes = currentClassAthletes;

    // Filter schedules for the current category and gender (lengkap & presisi)
    const classSchedules = schedules.filter(m => {
      const mGen = (m.gender || "PUTRA").toUpperCase();
      if (mGen !== selectedGender.toUpperCase()) return false;
      if (m.categoryClassId === selectedCategoryId) return true;
      if (
        m.ageCategory && m.weightClass &&
        normalizeAgeCategory(m.ageCategory) === normalizeAgeCategory(selectedAge) &&
        normalizeWeightClass(m.weightClass) === normalizeWeightClass(selectedClass)
      ) return true;
      if (m.classCategory) {
        const c = m.classCategory.toLowerCase();
        return c.includes(selectedAge.toLowerCase()) && c.includes(selectedClass.toLowerCase());
      }
      return false;
    });

    if (athletes.length === 0 && classSchedules.length === 0) return [];

    // 1. Kumpulkan seluruh huruf pool / bagan yang terbentuk (berapapun jumlah bagan yang terbentuk)
    const poolLettersSet = new Set<string>();
    
    // Pool letters berdasarkan jumlah atlet terdaftar (kapasitas 4 untuk Semifinal, 2 untuk Final)
    if (athletes.length > 0) {
      const poolCountFromAthletes = Math.max(1, Math.ceil(athletes.length / poolCapacity));
      for (let i = 0; i < poolCountFromAthletes; i++) {
        poolLettersSet.add(String.fromCharCode(65 + i));
      }
    }

    // Pool letters berdasarkan partai jadwal yang sudah ter-generate
    classSchedules.forEach(m => {
      const poolField = m.poolName || "";
      const stageField = m.stage || "";
      const idField = m.id || "";
      const match1 = poolField.match(/Pool\s+([A-Za-z0-9]+)/i);
      const match2 = stageField.match(/Pool\s+([A-Za-z0-9]+)/i);
      const match3 = idField.match(/-pem-([A-Za-z0-9]+)-/i);
      if (match1) poolLettersSet.add(match1[1].toUpperCase());
      else if (match2) poolLettersSet.add(match2[1].toUpperCase());
      else if (match3) poolLettersSet.add(match3[1].toUpperCase());
      else if (m.poolLetter) poolLettersSet.add(String(m.poolLetter).toUpperCase());
    });

    if (poolLettersSet.size === 0) {
      poolLettersSet.add("A");
    }

    const sortedPoolLetters = Array.from(poolLettersSet).sort();
    const pools: PemasalanPool[] = [];

    sortedPoolLetters.forEach((poolLetter, pIdx) => {
      // Athletes in this pool
      let poolAthletes = athletes.slice(pIdx * poolCapacity, (pIdx + 1) * poolCapacity);

      // Matches belonging to this pool
      const poolMatches = classSchedules.filter(m => {
        const poolTag = `Pool ${poolLetter}`;
        const matchStage = m.stage || "";
        const matchPool = m.poolName || "";
        return (
          matchPool.toUpperCase() === poolTag.toUpperCase() ||
          matchStage.toUpperCase().includes(poolTag.toUpperCase())
        );
      });

      // If no athletes loaded from list but matches exist, reconstruct athletes from matches
      if (poolAthletes.length === 0 && poolMatches.length > 0) {
        const reconstructed: any[] = [];
        poolMatches.forEach(m => {
          if (m.fighterBlueName && m.fighterBlueName !== "BYE" && !m.fighterBlueName.toUpperCase().includes("PEMENANG") && !reconstructed.some(a => a.name === m.fighterBlueName)) {
            reconstructed.push({ id: m.fighterBlueId || `ath-b-${m.id}`, name: m.fighterBlueName, contingent: m.fighterBlueClub || "-" });
          }
          if (m.fighterRedName && m.fighterRedName !== "BYE" && !m.fighterRedName.toUpperCase().includes("PEMENANG") && !reconstructed.some(a => a.name === m.fighterRedName)) {
            reconstructed.push({ id: m.fighterRedId || `ath-r-${m.id}`, name: m.fighterRedName, contingent: m.fighterRedClub || "-" });
          }
        });
        if (reconstructed.length > 0) {
          poolAthletes = reconstructed;
        }
      }

      if (pemasalanScheme === "SEMIFINAL") {
        if (poolAthletes.length <= 2) {
          // Hanya 2 orang atlet: Langsung Partai Final
          const fn = poolMatches.find(m => m.stage?.includes("Final")) || {
            id: `m-${selectedCategoryId}-${selectedGender}-pem-${poolLetter}-fn`,
            matchNumber: `Final (Pool ${poolLetter})`,
            stage: `Partai Final (Pool ${poolLetter})`,
            fighterBlueName: poolAthletes[0]?.name || "PESILAT BIRU",
            fighterBlueClub: poolAthletes[0]?.contingent || "-",
            fighterRedName: poolAthletes[1]?.name || "BYE",
            fighterRedClub: poolAthletes[1]?.contingent || "-",
            scoreBlue: 0,
            scoreRed: 0,
            winner: poolAthletes[1] ? null : "BIRU",
            status: poolAthletes[1] ? "BELUM" : "SELESAI"
          };

          const champion = fn.winner === "BIRU"
            ? { name: fn.fighterBlueName, club: fn.fighterBlueClub }
            : fn.winner === "MERAH"
              ? { name: fn.fighterRedName, club: fn.fighterRedClub }
              : null;

          const runnerUp = fn.winner === "BIRU"
            ? { name: fn.fighterRedName, club: fn.fighterRedClub }
            : fn.winner === "MERAH"
              ? { name: fn.fighterBlueName, club: fn.fighterBlueClub }
              : null;

          pools.push({
            poolLetter,
            poolName: `Pool ${poolLetter}`,
            athletes: poolAthletes,
            finalMatch: fn,
            champion,
            runnerUp
          });
        } else {
          // Standard IPSI 2026 & PERSILAT (Pool 4 orang):
          // Terdapat 2 partai pada saat semifinal:
          // Partai 1: Semifinal 1 (Atlet 1 vs Atlet 2)
          // Partai 2: Semifinal 2 (Atlet 3 vs Atlet 4)
          // Partai ke-3: Final (Menunggu hasil kemenangan dari 2 partai sebelumnya)

          const sf1FromSched = poolMatches.find(m => m.stage?.includes("Semi Final 1") || m.stage?.includes("SF 1") || m.stage?.includes("Partai 1: Semi"));
          const sf1 = sf1FromSched || {
            id: `m-${selectedCategoryId}-${selectedGender}-pem-${poolLetter}-sf1`,
            matchNumber: `1 (Pool ${poolLetter})`,
            stage: `Partai 1: Semi Final 1 (Pool ${poolLetter})`,
            fighterBlueName: poolAthletes[0]?.name || "PESILAT BIRU",
            fighterBlueClub: poolAthletes[0]?.contingent || "-",
            fighterRedName: poolAthletes[1]?.name || (poolAthletes.length > 1 ? "PESILAT MERAH" : "BYE"),
            fighterRedClub: poolAthletes[1]?.contingent || "-",
            scoreBlue: 0,
            scoreRed: 0,
            winner: poolAthletes.length > 1 ? null : "BIRU",
            status: poolAthletes.length > 1 ? "BELUM" : "SELESAI"
          };

          const sf2FromSched = poolMatches.find(m => m.stage?.includes("Semi Final 2") || m.stage?.includes("SF 2") || m.stage?.includes("Partai 2: Semi"));
          const sf2 = sf2FromSched || (
            poolAthletes.length > 2 ? {
              id: `m-${selectedCategoryId}-${selectedGender}-pem-${poolLetter}-sf2`,
              matchNumber: `2 (Pool ${poolLetter})`,
              stage: `Partai 2: Semi Final 2 (Pool ${poolLetter})`,
              fighterBlueName: poolAthletes[2]?.name || "PESILAT BIRU",
              fighterBlueClub: poolAthletes[2]?.contingent || "-",
              fighterRedName: poolAthletes[3]?.name || "BYE",
              fighterRedClub: poolAthletes[3]?.contingent || "-",
              scoreBlue: 0,
              scoreRed: 0,
              winner: poolAthletes[3] ? null : "BIRU",
              status: poolAthletes[3] ? "BELUM" : "SELESAI"
            } : undefined
          );

          // Pemenang Semifinal 1 untuk Sudut Biru Partai ke-3
          const sf1WinnerResolved = sf1.winner === "BIRU"
            ? { name: sf1.fighterBlueName, club: sf1.fighterBlueClub }
            : sf1.winner === "MERAH"
              ? { name: sf1.fighterRedName, club: sf1.fighterRedClub }
              : null;

          // Pemenang Semifinal 2 untuk Sudut Merah Partai ke-3
          const sf2WinnerResolved = sf2?.winner === "BIRU"
            ? { name: sf2.fighterBlueName, club: sf2.fighterBlueClub }
            : sf2?.winner === "MERAH"
              ? { name: sf2.fighterRedName, club: sf2.fighterRedClub }
              : poolAthletes.length === 3
                ? { name: poolAthletes[2]?.name, club: poolAthletes[2]?.contingent } // Lawan BYE di SF2
                : null;

          const fnFromSched = poolMatches.find(m => m.stage?.includes("Final") && !m.stage?.includes("Semi"));
          
          const blueFinalistName = sf1WinnerResolved
            ? sf1WinnerResolved.name
            : "Pemenang Partai 1 (Menunggu Hasil)";
          const blueFinalistClub = sf1WinnerResolved
            ? sf1WinnerResolved.club
            : `Pool ${poolLetter}`;

          const redFinalistName = sf2WinnerResolved
            ? sf2WinnerResolved.name
            : poolAthletes.length > 3
              ? "Pemenang Partai 2 (Menunggu Hasil)"
              : (poolAthletes[2]?.name || "PESILAT MERAH");
          const redFinalistClub = sf2WinnerResolved
            ? sf2WinnerResolved.club
            : poolAthletes.length > 3
              ? `Pool ${poolLetter}`
              : (poolAthletes[2]?.contingent || "-");

          const fn = fnFromSched
            ? {
                ...fnFromSched,
                // Pastikan nama atlet di final otomatis menampilkan pemenang SF jika sudah selesai
                fighterBlueName: (fnFromSched.status === "SELESAI" || (fnFromSched.fighterBlueName && !fnFromSched.fighterBlueName.toUpperCase().includes("PEMENANG")))
                  ? fnFromSched.fighterBlueName
                  : blueFinalistName,
                fighterBlueClub: (fnFromSched.status === "SELESAI" || (fnFromSched.fighterBlueName && !fnFromSched.fighterBlueName.toUpperCase().includes("PEMENANG")))
                  ? fnFromSched.fighterBlueClub
                  : blueFinalistClub,
                fighterRedName: (fnFromSched.status === "SELESAI" || (fnFromSched.fighterRedName && !fnFromSched.fighterRedName.toUpperCase().includes("PEMENANG")))
                  ? fnFromSched.fighterRedName
                  : redFinalistName,
                fighterRedClub: (fnFromSched.status === "SELESAI" || (fnFromSched.fighterRedName && !fnFromSched.fighterRedName.toUpperCase().includes("PEMENANG")))
                  ? fnFromSched.fighterRedClub
                  : redFinalistClub
              }
            : {
                id: `m-${selectedCategoryId}-${selectedGender}-pem-${poolLetter}-fn`,
                matchNumber: `3 (Pool ${poolLetter})`,
                stage: `Partai 3: Final (Pool ${poolLetter})`,
                fighterBlueName: blueFinalistName,
                fighterBlueClub: blueFinalistClub,
                fighterRedName: redFinalistName,
                fighterRedClub: redFinalistClub,
                scoreBlue: 0,
                scoreRed: 0,
                winner: null,
                status: "BELUM"
              };

          const champion = fn.winner === "BIRU" 
            ? { name: fn.fighterBlueName, club: fn.fighterBlueClub } 
            : fn.winner === "MERAH" 
              ? { name: fn.fighterRedName, club: fn.fighterRedClub } 
              : null;

          const runnerUp = fn.winner === "BIRU" 
            ? { name: fn.fighterRedName, club: fn.fighterRedClub } 
            : fn.winner === "MERAH" 
              ? { name: fn.fighterBlueName, club: fn.fighterBlueClub } 
              : null;

          // Juara 3 Bersama (Medali Perunggu IPSI 2026): Kedua atlet yang gugur di Semifinal 1 dan Semifinal 2
          const bronze1 = sf1?.winner === "BIRU" 
            ? { name: sf1.fighterRedName, club: sf1.fighterRedClub } 
            : sf1?.winner === "MERAH" 
              ? { name: sf1.fighterBlueName, club: sf1.fighterBlueClub } 
              : poolAthletes[1] ? { name: poolAthletes[1].name, club: poolAthletes[1].contingent } : null;

          const bronze2 = sf2?.winner === "BIRU" 
            ? { name: sf2.fighterRedName, club: sf2.fighterRedClub } 
            : sf2?.winner === "MERAH" 
              ? { name: sf2.fighterBlueName, club: sf2.fighterBlueClub } 
              : poolAthletes[3] ? { name: poolAthletes[3].name, club: poolAthletes[3].contingent } : null;

          pools.push({
            poolLetter,
            poolName: `Pool ${poolLetter}`,
            athletes: poolAthletes,
            semifinal1: sf1,
            semifinal2: sf2,
            finalMatch: fn,
            champion,
            runnerUp,
            bronze1,
            bronze2
          });
        }
      } else {
        // FINAL (2 bagan)
        const fn = poolMatches.find(m => m.stage?.includes("Final")) || {
          id: `m-${selectedCategoryId}-${selectedGender}-pem-${poolLetter}-fn`,
          matchNumber: `Final (Pool ${poolLetter})`,
          stage: `Partai Final (Pool ${poolLetter})`,
          fighterBlueName: poolAthletes[0]?.name || "PESILAT BIRU",
          fighterBlueClub: poolAthletes[0]?.contingent || "-",
          fighterRedName: poolAthletes[1]?.name || (poolAthletes.length > 1 ? "PESILAT MERAH" : "BYE"),
          fighterRedClub: poolAthletes[1]?.contingent || "-",
          scoreBlue: 0,
          scoreRed: 0,
          winner: poolAthletes.length > 1 ? null : "BIRU",
          status: poolAthletes.length > 1 ? "BELUM" : "SELESAI"
        };

        const champion = fn.winner === "BIRU" 
          ? { name: fn.fighterBlueName, club: fn.fighterBlueClub } 
          : fn.winner === "MERAH" 
            ? { name: fn.fighterRedName, club: fn.fighterRedClub } 
            : null;

        const runnerUp = fn.winner === "BIRU" 
          ? { name: fn.fighterRedName, club: fn.fighterRedClub } 
          : fn.winner === "MERAH" 
            ? { name: fn.fighterBlueName, club: fn.fighterBlueClub } 
            : null;

        pools.push({
          poolLetter,
          poolName: `Pool ${poolLetter}`,
          athletes: poolAthletes,
          finalMatch: fn,
          champion,
          runnerUp
        });
      }
    });

    return pools;
  }, [competitionMethod, pemasalanScheme, currentClassAthletes, schedules, bracketCleared, selectedCategoryId, selectedGender, selectedAge, selectedClass]);

  const displayedPools = useMemo(() => {
    if (selectedPoolFilter === "ALL") return pemasalanPools;
    const filtered = pemasalanPools.filter(p => p.poolLetter === selectedPoolFilter);
    return filtered.length > 0 ? filtered : pemasalanPools;
  }, [pemasalanPools, selectedPoolFilter]);

  // Total matches generated in this category across ALL pools
  const totalMatchesInCategory = useMemo(() => {
    if (bracketCleared) return 0;
    if (competitionMethod === "PEMASALAN") {
      let count = 0;
      pemasalanPools.forEach(p => {
        if (p.semifinal1) count++;
        if (p.semifinal2) count++;
        if (p.finalMatch) count++;
      });
      return count;
    }
    return bracketMatches.length;
  }, [competitionMethod, pemasalanPools, bracketMatches, bracketCleared]);

  // ---------------------------------------------------------------------------
  // GENERATE BAGAN SECARA OTOMATIS KE SCHEDULES (TERPADU DENGAN SEMUA KELAS)
  // ---------------------------------------------------------------------------
  const handleAutoGenerateBagan = async () => {
    sound.playClick();
    if (participants.length === 0) {
      showToast("⚠️ Belum ada data atlet terdaftar! Silakan tambahkan atlet di menu Input Data.");
      sound.playBuzzer();
      return;
    }

    setBracketCleared(false);
    const res = await syncAndGenerateSchedulesFromParticipants(participants, {
      activeFilter: { ageCategory: selectedAge, weightClass: selectedClass, gender: selectedGender }
    });
    setParticipants(res.participants);
    setSchedules(res.matches);

    showToast(
      `⚡ Berhasil menyusun & menyinkronkan ${res.matches.length} partai ke Bagan & Jadwal Pertandingan!`
    );
  };

  // Tambah Pesilat Baru Cepat ke Kelas Aktif
  const handleQuickAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAthleteName.trim()) {
      showToast("⚠️ Masukkan nama atlet pesilat!");
      return;
    }

    const newAth = normalizeAthleteRecord({
      id: `ath-${Date.now()}`,
      name: newAthleteName.trim().toUpperCase(),
      contingent: (newAthleteClub.trim() || "KONTINGEN MANDIRI").toUpperCase(),
      categoryClassId: selectedCategoryId,
      ageCategory: selectedAge,
      weightClass: selectedClass,
      gender: selectedGender,
      seed: currentClassAthletes.length + 1
    });

    const updated = [...participants, newAth];
    setBracketCleared(false);
    const res = await syncAndGenerateSchedulesFromParticipants(updated, {
      activeFilter: { ageCategory: selectedAge, weightClass: selectedClass, gender: selectedGender }
    });
    setParticipants(res.participants);
    setSchedules(res.matches);

    setNewAthleteName("");
    setNewAthleteClub("");
    setShowAddAthlete(false);
    sound.playClick();
    showToast(`✅ Pesilat "${newAth.name}" berhasil ditambahkan & Bagan/Jadwal otomatis diperbarui!`);
  };

  // Trigger Modal Kosongkan Seluruh Bagan (menggantikan window.confirm yang diblokir iframe)
  const handleClearAllBracketData = () => {
    sound.playClick();
    setConfirmDialog({
      type: "CLEAR_BRACKET"
    });
  };

  // Trigger Modal Hapus Satu Partai dari Bagan
  const handleDeleteMatchFromBracket = (matchId: string, matchNumber: string | number) => {
    sound.playClick();
    setConfirmDialog({
      type: "DELETE_MATCH",
      matchId,
      matchNumber
    });
  };

  // Trigger Modal Hapus Atlet dari Partai (jadikan BYE)
  const handleDeleteAthleteFromBracket = (matchId: string, corner: "BLUE" | "RED") => {
    const target = schedules.find(m => m.id === matchId);
    const athleteName = target
      ? (corner === "BLUE" ? target.fighterBlueName : target.fighterRedName)
      : (corner === "BLUE" ? "Sudut Biru" : "Sudut Merah");
    sound.playClick();
    setConfirmDialog({
      type: "DELETE_CORNER_ATHLETE",
      matchId,
      matchNumber: target?.matchNumber || "-",
      corner,
      athleteName
    });
  };

  // Trigger Modal Hapus Atlet Terdaftar dari Kategori / Turnamen
  const handleDeleteRegisteredAthlete = (athleteId: string, athleteName: string) => {
    sound.playClick();
    setConfirmDialog({
      type: "DELETE_REGISTERED_ATHLETE",
      athleteId,
      athleteName
    });
  };

  // Eksekusi Konfirmasi Modal (Kosongkan Bagan / Hapus Partai / Hapus Atlet)
  const executeConfirmDialog = async (clearAthletesToo: boolean = false) => {
    if (!confirmDialog) return;

    if (confirmDialog.type === "CLEAR_BRACKET") {
      sound.playBuzzer();
      await clearAllSchedulesAndBrackets({ clearAthletes: clearAthletesToo });
      setSchedules([]);
      setBracketCleared(true);
      if (clearAthletesToo) {
        setParticipants([]);
        showToast("🗑️ Seluruh Bagan, Jadwal Partai, dan Data Atlet berhasil dikosongkan!");
      } else {
        showToast("🗑️ Seluruh Bagan & Jadwal Partai berhasil dikosongkan!");
      }
    } else if (confirmDialog.type === "DELETE_MATCH" && confirmDialog.matchId) {
      sound.playClick();
      const updated = schedules.filter(m => m.id !== confirmDialog.matchId);
      setSchedules(updated);
      try {
        localStorage.setItem("jrz_cached_schedules", JSON.stringify(updated));
        await fetch("/api/tournament/import-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newParticipants: participants, newMatches: updated })
        });
        window.dispatchEvent(new CustomEvent("jrz_schedules_updated", { detail: updated }));
        const ch = new BroadcastChannel("jrz_match_sync_A");
        ch.postMessage({ type: "SCHEDULES_UPDATED" });
        ch.close();
      } catch {}
      showToast(`🗑️ Partai ${confirmDialog.matchNumber} berhasil dihapus dari bagan & jadwal.`);
    } else if (confirmDialog.type === "DELETE_CORNER_ATHLETE" && confirmDialog.matchId && confirmDialog.corner) {
      sound.playClick();
      const corner = confirmDialog.corner;
      const updated = schedules.map(m => {
        if (m.id === confirmDialog.matchId) {
          if (corner === "BLUE") {
            const hasOpponent = m.fighterRedName && m.fighterRedName !== "BYE";
            return {
              ...m,
              fighterBlueName: "BYE",
              fighterBlueClub: "-",
              winner: hasOpponent ? "MERAH" : null,
              status: hasOpponent ? "SELESAI" : m.status
            };
          } else {
            const hasOpponent = m.fighterBlueName && m.fighterBlueName !== "BYE";
            return {
              ...m,
              fighterRedName: "BYE",
              fighterRedClub: "-",
              winner: hasOpponent ? "BIRU" : null,
              status: hasOpponent ? "SELESAI" : m.status
            };
          }
        }
        return m;
      });
      setSchedules(updated);
      try {
        localStorage.setItem("jrz_cached_schedules", JSON.stringify(updated));
        await fetch("/api/tournament/import-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newParticipants: participants, newMatches: updated })
        });
        window.dispatchEvent(new CustomEvent("jrz_schedules_updated", { detail: updated }));
        const ch = new BroadcastChannel("jrz_match_sync_A");
        ch.postMessage({ type: "SCHEDULES_UPDATED" });
        ch.close();
      } catch {}
      showToast(`Atlet ${confirmDialog.athleteName || ""} berhasil dihapus dari partai (diset BYE).`);
    } else if (confirmDialog.type === "DELETE_REGISTERED_ATHLETE" && confirmDialog.athleteId) {
      sound.playClick();
      const updatedParticipants = participants.filter(p => p.id !== confirmDialog.athleteId);
      if (updatedParticipants.length === 0) {
        await clearAllSchedulesAndBrackets({ clearAthletes: true });
        setParticipants([]);
        setSchedules([]);
        setBracketCleared(true);
      } else {
        const res = await syncAndGenerateSchedulesFromParticipants(updatedParticipants, {
          activeFilter: { ageCategory: selectedAge, weightClass: selectedClass, gender: selectedGender }
        });
        setParticipants(res.participants);
        setSchedules(res.matches);
      }
      showToast(`🗑️ Pesilat "${confirmDialog.athleteName}" berhasil dihapus & Bagan/Jadwal diperbarui.`);
    }

    setConfirmDialog(null);
  };

  // Preload Kop Surat logos from Parameter Pertandingan
  useEffect(() => {
    const syncLogos = () => {
      const cfg = getParameterPertandinganConfig();
      if (cfg.logoLeft) preloadLogoForPdf(cfg.logoLeft);
      if (cfg.logoRight) preloadLogoForPdf(cfg.logoRight);
    };
    syncLogos();
    window.addEventListener("jrz_parameters_updated", syncLogos);
    window.addEventListener("storage", syncLogos);
    return () => {
      window.removeEventListener("jrz_parameters_updated", syncLogos);
      window.removeEventListener("storage", syncLogos);
    };
  }, []);

  // Download PDF Bagan
  const handleDownloadBracketPDF = () => {
    try {
      sound.playClick();
      const cfg = getParameterPertandinganConfig();
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

      const titleText = competitionMethod === "PEMASALAN"
        ? `BAGAN PERTANDINGAN PEMASALAN (${pemasalanScheme === "SEMIFINAL" ? "SEMIFINAL - 4 BAGAN" : "FINAL - 2 BAGAN"})`
        : "BAGAN PERTANDINGAN PRESTASI (SISTEM GUGUR TUNGGAL)";

      const drawBaganKopHeader = () => {
        // 1. Logo sebelah kiri & kanan mengikuti input logo sisi kiri & kanan monitor di Parameter Pertandingan
        drawPdfLogo(doc, cfg.logoLeft, 15, 8, 16);
        drawPdfLogo(doc, cfg.logoRight, 266, 8, 16);

        // 2. Judul event mengikuti input nama event kejuaraan dari Parameter Pertandingan
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.text((cfg.eventName || "KEJUARAAN PENCAK SILAT").toUpperCase(), 148.5, 13, { align: "center" });

        // 3. Alamat serta tanggal mengikuti input tempat pelaksanaan dan waktu pelaksanaan dari Parameter Pertandingan
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(40, 50, 65);
        const subHeader = `${(cfg.tempatPelaksanaan || "TEMPAT PELAKSANAAN").toUpperCase()}  |  ${(cfg.waktuPelaksanaan || "WAKTU PELAKSANAAN").toUpperCase()}`;
        doc.text(subHeader, 148.5, 18, { align: "center" });

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        doc.text(
          `${titleText} — ${currentCategoryName.toUpperCase()} · ${selectedGender} | Total Peserta: ${currentClassAthletes.length} Atlet`,
          148.5,
          23,
          { align: "center" }
        );

        // Garis ganda Kop Surat
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.8);
        doc.line(15, 26, 282, 26);
        doc.setLineWidth(0.25);
        doc.line(15, 27, 282, 27);
      };

      drawBaganKopHeader();

      let y = 33;

      if (competitionMethod === "PEMASALAN") {
        pemasalanPools.forEach((pool) => {
          if (y > 152) {
            doc.addPage();
            drawBaganKopHeader();
            y = 33;
          }

          // Pool Header
          doc.setFillColor(15, 23, 42);
          doc.setTextColor(255, 255, 255);
          doc.rect(20, y, 257, 8, "F");
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9.5);
          doc.text(`BAGAN ${pool.poolName.toUpperCase()} - ${currentCategoryName.toUpperCase()}`, 25, y + 5.5);
          y += 10;

          if (pemasalanScheme === "SEMIFINAL") {
            const matchesToDraw = [pool.semifinal1, pool.semifinal2, pool.finalMatch].filter(Boolean);
            matchesToDraw.forEach(m => {
              if (y > 160) {
                doc.addPage();
                drawBaganKopHeader();
                y = 33;
              }
              doc.setFillColor(248, 250, 252);
              doc.rect(20, y, 257, 12, "F");
              doc.setDrawColor(203, 213, 225);
              doc.rect(20, y, 257, 12, "D");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              doc.text(`[PARTAI ${m.matchNumber || "-"}] ${m.stage}`, 25, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setTextColor(37, 99, 235);
              doc.text(`[BIRU] ${m.fighterBlueName} (${m.fighterBlueClub})`, 25, y + 9.5);

              doc.setTextColor(20, 20, 20);
              doc.text("VS", 125, y + 9.5);

              doc.setTextColor(220, 38, 38);
              doc.text(`[MERAH] ${m.fighterRedName} (${m.fighterRedClub})`, 145, y + 9.5);

              doc.setTextColor(15, 23, 42);
              doc.setFont("Helvetica", "bold");
              doc.text(m.winner ? `Pemenang: Sudut ${m.winner}` : "Menunggu Hasil", 225, y + 9.5);

              y += 14;
            });

            // Podium info
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            doc.text(
              `Hasil Juara: 🥇 Juara 1: ${pool.champion?.name || "-"} | 🥈 Juara 2: ${pool.runnerUp?.name || "-"} | 🥉 Juara 3 Bersama: ${pool.bronze1?.name || "-"} & ${pool.bronze2?.name || "-"}`,
              25,
              y + 3
            );
            y += 10;
          } else {
            const m = pool.finalMatch;
            if (m) {
              doc.setFillColor(248, 250, 252);
              doc.rect(20, y, 257, 12, "F");
              doc.setDrawColor(203, 213, 225);
              doc.rect(20, y, 257, 12, "D");

              doc.setFont("Helvetica", "bold");
              doc.setFontSize(8.5);
              doc.setTextColor(30, 41, 59);
              doc.text(`[PARTAI FINAL ${pool.poolName.toUpperCase()}]`, 25, y + 5);

              doc.setFont("Helvetica", "normal");
              doc.setTextColor(37, 99, 235);
              doc.text(`[BIRU] ${m.fighterBlueName} (${m.fighterBlueClub})`, 25, y + 9.5);

              doc.setTextColor(20, 20, 20);
              doc.text("VS", 125, y + 9.5);

              doc.setTextColor(220, 38, 38);
              doc.text(`[MERAH] ${m.fighterRedName} (${m.fighterRedClub})`, 145, y + 9.5);

              doc.setTextColor(15, 23, 42);
              doc.setFont("Helvetica", "bold");
              doc.text(m.winner ? `Pemenang: Sudut ${m.winner}` : "Menunggu Hasil", 225, y + 9.5);

              y += 14;
              doc.setFontSize(8.5);
              doc.setTextColor(71, 85, 105);
              doc.text(
                `Hasil Juara: 🥇 Juara 1: ${pool.champion?.name || "-"} | 🥈 Juara 2: ${pool.runnerUp?.name || "-"}`,
                25,
                y + 3
              );
              y += 10;
            }
          }
        });
      } else {
        // Prestasi
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text("BAGAN BABAK PERTANDINGAN PRESTASI (SISTEM GUGUR)", 20, y);
        y += 8;

        bracketMatches.forEach((m) => {
          if (y > 158) {
            doc.addPage();
            drawBaganKopHeader();
            y = 33;
          }
          doc.setFillColor(245, 247, 250);
          doc.rect(20, y, 257, 16, "F");
          doc.setDrawColor(200, 210, 220);
          doc.rect(20, y, 257, 16, "D");

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text(`PARTAI ${m.matchNumber} (${m.stage})`, 25, y + 5.5);

          doc.setFont("Helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(37, 99, 235);
          doc.text(`[BIRU] ${m.fighterBlueName} (${m.fighterBlueClub})`, 25, y + 11.5);

          doc.setTextColor(20, 20, 20);
          doc.text("VS", 130, y + 11.5);

          doc.setTextColor(220, 38, 38);
          doc.text(`[MERAH] ${m.fighterRedName} (${m.fighterRedClub})`, 160, y + 11.5);

          doc.setTextColor(15, 23, 42);
          doc.setFont("Helvetica", "bold");
          doc.text(m.winner ? `Pemenang: Sudut ${m.winner}` : "Menunggu Hasil", 225, y + 11.5);

          y += 20;
        });
      }

      // 4 & 5. Tanda tangan Ketua Pertandingan & Sekretaris Pertandingan + Tempat & Tanggal Dibuat
      if (y > 168) {
        doc.addPage();
        drawBaganKopHeader();
        y = 40;
      }
      const sigY = Math.max(y + 6, 172);
      drawPdfOfficialSignatures(doc, sigY, {
        isLandscape: true,
        leftCenterX: 50,
        rightCenterX: 245,
        config: cfg
      });

      doc.save(`Bagan_Pertandingan_${competitionMethod}_${selectedAge}_${selectedClass}_${Date.now()}.pdf`);
    } catch (e) {
      console.error("Gagal cetak PDF bagan:", e);
      showToast("⚠️ Gagal mengunduh PDF Bagan.");
    }
  };

  return (
    <div className="h-screen max-h-screen flex flex-col bg-[#050a18] text-slate-100 font-sans select-none overflow-hidden">
      {/* Background Subtle Ambience */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0c1d3f_1px,transparent_1px),linear-gradient(to_bottom,#0c1d3f_1px,transparent_1px)] bg-[size:44px_44px] opacity-10 pointer-events-none" />

      {/* In-App Confirmation Modal (Kosongkan Bagan / Hapus Partai / Hapus Atlet) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#0b152e] border-2 border-red-500/60 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white uppercase tracking-wider">
                  {confirmDialog.type === "CLEAR_BRACKET"
                    ? "KONFIRMASI KOSONGKAN BAGAN & JADWAL"
                    : confirmDialog.type === "DELETE_MATCH"
                    ? `HAPUS PARTAI ${confirmDialog.matchNumber}`
                    : confirmDialog.type === "DELETE_CORNER_ATHLETE"
                    ? "HAPUS ATLET DARI PARTAI"
                    : "HAPUS ATLET TERDAFTAR"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tindakan ini akan langsung menyinkronkan Bagan & Kontrol Partai
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed space-y-2">
              {confirmDialog.type === "CLEAR_BRACKET" && (
                <>
                  <p>
                    Pilih mode pengosongan yang diinginkan:
                  </p>
                  <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1">
                    <li><strong className="text-amber-300">Kosongkan Bagan & Jadwal Saja:</strong> Menghapus seluruh bagan & partai jadwal pertandingan, namun data atlet di Loting tetap tersimpan.</li>
                    <li><strong className="text-red-400">Reset Total (+ Hapus Data Atlet):</strong> Mengosongkan bagan, jadwal partai, sekaligus seluruh daftar atlet.</li>
                  </ul>
                </>
              )}
              {confirmDialog.type === "DELETE_MATCH" && (
                <p>
                  Apakah Anda yakin ingin menghapus <strong className="text-cyan-300">Partai {confirmDialog.matchNumber}</strong> dari Bagan dan Jadwal Pertandingan?
                </p>
              )}
              {confirmDialog.type === "DELETE_CORNER_ATHLETE" && (
                <p>
                  Apakah Anda yakin ingin menghapus atlet <strong className="text-amber-300">{confirmDialog.athleteName}</strong> dari Partai {confirmDialog.matchNumber} dan menjadikannya <strong className="text-emerald-300">BYE (Menang Otomatis Lawan)</strong>?
                </p>
              )}
              {confirmDialog.type === "DELETE_REGISTERED_ATHLETE" && (
                <p>
                  Apakah Anda yakin ingin menghapus <strong className="text-red-300">{confirmDialog.athleteName}</strong> dari daftar peserta dan menyusun ulang Bagan & Jadwal?
                </p>
              )}
            </div>

            {confirmDialog.type === "CLEAR_BRACKET" ? (
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => executeConfirmDialog(false)}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Kosongkan Bagan & Jadwal Partai Saja</span>
                </button>
                <button
                  type="button"
                  onClick={() => executeConfirmDialog(true)}
                  className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reset Total (Kosongkan Bagan, Jadwal & Data Atlet)</span>
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
                  onClick={() => executeConfirmDialog(false)}
                  className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Ya, Hapus</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 border border-indigo-500 text-white text-xs font-bold shadow-2xl animate-in fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER BAR (Only rendered if back button is needed) */}
      {!hideBackHeader && (
        <header className="relative z-20 flex items-center px-3 sm:px-6 py-2 bg-[#091227]/95 backdrop-blur-md border-b border-indigo-500/20 shadow-lg shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              onBack();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600/60 text-slate-300 hover:text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md"
            title="Kembali ke Beranda"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">BERANDA</span>
          </button>
        </header>
      )}

      {/* 2-COLUMN MAIN LAYOUT */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* KOLOM 1: MENU PILIHAN BAGAN (KIRI)                                       */}
        {/* ========================================================================= */}
        <aside className="w-full lg:w-[350px] xl:w-[380px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800/90 bg-[#081126]/95 backdrop-blur-md flex flex-col min-h-0 overflow-hidden shadow-2xl">
          
          {/* Kolom 1 Header */}
          <div className="p-2.5 sm:p-3 border-b border-slate-800 bg-[#060d1f] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <h2 className="font-sans font-black text-xs text-white uppercase tracking-wider">
                KOLOM 1: MENU PILIHAN BAGAN
              </h2>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/40">
              KONTROL
            </span>
          </div>

          {/* Kolom 1 Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
            
            {/* MENU KATEGORI PERTANDINGAN: 2 BARIS (ATAS: USIA DINI & PRA REMAJA, BAWAH: REMAJA & DEWASA) */}
            <div className="bg-[#0b1633] border border-slate-700/80 rounded-none p-2 sm:p-2.5 shadow-lg space-y-2">
              
              {/* GRID 2 KOLOM X 2 BARIS SESUAI KATEGORI */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {AGE_CATEGORIES.map((cat) => {
                  const isPemasalan = (categoryMethods[cat.ageKey] || "PRESTASI") === "PEMASALAN";
                  const athleteCount = ageCategoryLotingStats[cat.ageKey] || 0;
                  const isSelected = selectedAge === cat.ageKey;
                  const currentPemasalanScheme = categoryPemasalanSchemes[cat.ageKey] || "SEMIFINAL";
                  const currentPrestasiScheme = categoryPrestasiSchemes[cat.ageKey] || "SINGLE_NO_POOL";

                  return (
                    <div
                      key={cat.ageKey}
                      onClick={() => handleSelectCategory(cat.ageKey)}
                      className={`relative overflow-hidden rounded-none p-2 border transition-all duration-200 cursor-pointer shadow-md flex flex-col justify-between ${
                        isSelected
                          ? "bg-gradient-to-br from-[#0d1d44] via-[#0b1738] to-[#071026] border-indigo-400 ring-2 ring-indigo-400/40 shadow-indigo-950/60"
                          : "bg-[#09132c]/90 hover:bg-[#0c193a] border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {/* ANGKA JUMLAH ATLET YANG TERDAFTAR DI BELAKANG TULISAN & SKEMA (OPACITY 30%) */}
                      <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 pointer-events-none select-none font-sans font-black text-4xl sm:text-5xl text-slate-100 opacity-30 z-0 leading-none tracking-tighter tabular-nums">
                        {athleteCount}
                      </div>

                      {/* CONTENT */}
                      <div className="relative z-10 flex flex-col justify-between h-full gap-1.5">
                        
                        {/* BARIS ATAS: SWITCH DI KIRI, KATEGORI USIA DI KANAN (TANPA TEKS JUMLAH ATLET) */}
                        <div className="flex items-center gap-2">
                          {/* TOMBOL SWITCH 3D ON/OFF */}
                          <div className="shrink-0 flex flex-col items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCategoryMethod(cat.ageKey);
                              }}
                              className={`group relative rounded-full transition-all duration-300 cursor-pointer active:scale-95 focus:outline-none p-0.5 ${
                                isPemasalan
                                  ? "drop-shadow-[0_0_8px_rgba(34,197,94,0.7)] hover:scale-105"
                                  : "drop-shadow-[0_0_8px_rgba(239,68,68,0.7)] hover:scale-105"
                              }`}
                              style={{ width: "36px", height: "36px" }}
                              title={
                                isPemasalan
                                  ? `HIJAU: ${cat.label} PEMASALAN AKTIF (Klik untuk ganti PRESTASI)`
                                  : `MERAH: ${cat.label} PRESTASI AKTIF (Klik untuk ganti PEMASALAN)`
                              }
                            >
                              {/* Outer Ring Circle */}
                              <div className={`w-full h-full rounded-full transition-colors duration-300 flex items-center justify-center p-0.5 ${
                                isPemasalan
                                  ? "bg-gradient-to-b from-[#22c55e] via-[#16a34a] to-[#15803d]"
                                  : "bg-gradient-to-b from-[#ef4444] via-[#dc2626] to-[#b91c1c]"
                              }`}>
                                {/* Bevel White Center Face */}
                                <div className="w-full h-full rounded-full bg-gradient-to-b from-[#ffffff] via-[#f8fafc] to-[#e2e8f0] shadow-sm flex items-center justify-center relative border border-slate-200">
                                  <div className={`w-[85%] h-[85%] rounded-full border transition-colors duration-300 flex items-center justify-center ${
                                    isPemasalan ? "border-emerald-500/20" : "border-red-500/20"
                                  }`}>
                                    <PowerButtonIcon className={`w-3.5 h-3.5 transition-all duration-300 ${
                                      isPemasalan
                                        ? "text-[#16a34a] filter drop-shadow-[0_1px_1px_rgba(220,38,38,0.4)]"
                                        : "text-[#dc2626] filter drop-shadow-[0_1px_1px_rgba(220,38,38,0.4)]"
                                    }`} />
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>

                          {/* KATEGORI USIA (FOKUS NAMA & INDIKATOR AKTIF, TANPA TEKS 0 ATLET) */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="font-sans font-black text-[11px] sm:text-xs text-white uppercase tracking-wider truncate">
                                {cat.label}
                              </span>
                              {isSelected && (
                                <span className="w-1.5 h-1.5 bg-cyan-400 animate-pulse shrink-0" title="Kategori Aktif" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* BARIS BAWAH: 1 GRID GABUNGAN SKEMA (PEMASALAN & PRESTASI) */}
                        {/* Jika PEMASALAN aktif -> Single Pool & Pool A&B disabled (abu-abu). Jika PRESTASI aktif -> Semifinal & Final disabled (abu-abu) */}
                        <div className="grid grid-cols-2 gap-1 w-full mt-1" onClick={(e) => e.stopPropagation()}>
                          {/* SKEMA PEMASALAN: SEMIFINAL / FINAL */}
                          <select
                            value={currentPemasalanScheme}
                            disabled={!isPemasalan}
                            onChange={(e) => {
                              const val = e.target.value as "SEMIFINAL" | "FINAL";
                              handleUpdateCategoryPemasalanScheme(cat.ageKey, val);
                            }}
                            className={`w-full px-1 py-1 rounded-none border text-[8.5px] font-black uppercase tracking-wider focus:outline-none transition-all ${
                              isPemasalan
                                ? "bg-emerald-950/85 border-emerald-500/80 text-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.25)] hover:border-emerald-400 cursor-pointer"
                                : "bg-slate-900/50 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed pointer-events-none select-none"
                            }`}
                            title={isPemasalan ? `Skema Pemasalan ${cat.label}` : `Skema Pemasalan non-aktif (aktifkan Switch Hijau untuk memilih)`}
                          >
                            <option value="SEMIFINAL" className="bg-slate-900 text-emerald-300">SEMIFINAL</option>
                            <option value="FINAL" className="bg-slate-900 text-emerald-300">FINAL</option>
                          </select>

                          {/* SKEMA PRESTASI: SINGLE POOL / POOL A & B */}
                          <select
                            value={currentPrestasiScheme}
                            disabled={isPemasalan}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateCategoryPrestasiScheme(cat.ageKey, val);
                            }}
                            className={`w-full px-1 py-1 rounded-none border text-[8.5px] font-black uppercase tracking-wider focus:outline-none transition-all ${
                              !isPemasalan
                                ? "bg-blue-950/85 border-blue-500/80 text-blue-300 shadow-[0_0_6px_rgba(59,130,246,0.25)] hover:border-blue-400 cursor-pointer"
                                : "bg-slate-900/50 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed pointer-events-none select-none"
                            }`}
                            title={!isPemasalan ? `Skema Prestasi ${cat.label}` : `Skema Prestasi non-aktif (aktifkan Switch Merah untuk memilih)`}
                          >
                            <option value="SINGLE_NO_POOL" className="bg-slate-900 text-blue-300">SINGLE POOL</option>
                            <option value="POOL_AB" className="bg-slate-900 text-blue-300">POOL A & B</option>
                          </select>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Opsi Tambahan: Filter Pool jika Pemasalan > 1 pool */}
              {competitionMethod === "PEMASALAN" && pemasalanPools.length > 1 && (
                <div className="pt-2 border-t border-emerald-900/50 flex items-center justify-between gap-2">
                  <label className="text-[10px] font-bold text-emerald-300 uppercase shrink-0">
                    FILTER POOL AKTIF:
                  </label>
                  <select
                    value={selectedPoolFilter}
                    onChange={(e) => setSelectedPoolFilter(e.target.value)}
                    className="flex-1 px-2.5 py-1 rounded-none bg-slate-900 border border-emerald-500/50 text-emerald-300 font-mono text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">SEMUA POOL ({pemasalanPools.length} Pool)</option>
                    {pemasalanPools.map(p => (
                      <option key={p.poolLetter} value={p.poolLetter}>
                        {p.poolName} ({p.athletes.length} Atlet)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Opsi Tambahan: Zoom jika Prestasi */}
              {competitionMethod === "PRESTASI" && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    ZOOM PREVIEW PRESTASI:
                  </span>
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-none">
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.1))}
                      className="text-slate-300 hover:text-white p-0.5 cursor-pointer"
                      title="Perkecil Bagan"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 px-1">{Math.round(zoomLevel * 100)}%</span>
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
                      className="text-slate-300 hover:text-white p-0.5 cursor-pointer"
                      title="Perbesar Bagan"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setZoomLevel(1)}
                      className="text-slate-400 hover:text-white p-0.5 cursor-pointer ml-1"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 1.5 TOMBOL GENERATE & AKSI CEPAT */}
            <div className="pt-1 space-y-2">
              <button
                onClick={handleAutoGenerateBagan}
                className="w-full py-2.5 px-4 rounded-none bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>BUAT & GENERATE BAGAN INI</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadBracketPDF}
                  className="py-2 px-3 rounded-none bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Unduh PDF</span>
                </button>

                <button
                  onClick={handleClearAllBracketData}
                  className="py-2 px-3 rounded-none bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Kosongkan</span>
                </button>
              </div>
            </div>

          </div>
        </aside>

        {/* ========================================================================= */}
        {/* KOLOM 2: PREVIEW BAGAN PERTANDINGAN (KANAN)                              */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col min-h-0 bg-[#040815] overflow-hidden">
          
          {/* Kolom 2 Top Bar: Dynamic Preview Status Header */}
          <div className="p-3.5 border-b border-slate-800 bg-[#070e20] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-none bg-cyan-600/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-sans font-black text-xs sm:text-sm text-white uppercase tracking-wider">
                    KOLOM 2: PREVIEW BAGAN PERTANDINGAN
                  </h3>
                  <span className={`px-2 py-0.5 rounded-none text-[10px] font-mono font-black border ${
                    competitionMethod === "PEMASALAN"
                      ? "bg-emerald-950 text-emerald-400 border-emerald-500/50"
                      : "bg-red-950 text-red-400 border-red-500/50"
                  }`}>
                    {competitionMethod === "PEMASALAN" ? "PEMASALAN (HIJAU)" : "PRESTASI (MERAH)"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Hasil dari menu Kolom 1: <strong className="text-cyan-300">{currentCategoryName}</strong>
                </div>
              </div>
            </div>

            {/* Badges Info Preview */}
            <div className="flex items-center gap-2 text-xs">
              {/* Quick Class & Gender Selector */}
              <div className="flex items-center gap-1.5 bg-[#050c20] p-1 border border-slate-700">
                <span className="text-[10px] font-bold text-slate-400 pl-1 hidden sm:inline">KELAS:</span>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
                  title="Pilih Kelas Tanding"
                >
                  {["Kelas A", "Kelas B", "Kelas C", "Kelas D", "Kelas E", "Kelas F", "Kelas G", "Kelas H", "Kelas I", "Kelas J", "Bebas"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value as any)}
                  className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
                  title="Pilih Gender"
                >
                  <option value="PUTRA">PUTRA</option>
                  <option value="PUTRI">PUTRI</option>
                </select>
              </div>

              {competitionMethod === "PRESTASI" && (
                <button
                  type="button"
                  onClick={handleAutoGenerateBagan}
                  className="px-2.5 py-1 rounded-none bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow cursor-pointer flex items-center gap-1.5 transition-all"
                  title="Generate Partai Otomatis"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Partai</span>
                </button>
              )}
              <span className="px-2.5 py-1 rounded-none bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[11px]">
                {currentClassAthletes.length} Atlet Terloting
              </span>
              {competitionMethod === "PEMASALAN" && (
                <span className="px-2.5 py-1 rounded-none bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono text-[11px] font-bold">
                  {pemasalanPools.length} Pool ({pemasalanScheme === "SEMIFINAL" ? "4 Bagan" : "2 Bagan"})
                </span>
              )}
              <span className="px-2.5 py-1 rounded-none bg-indigo-950/80 border border-indigo-500/50 text-indigo-300 font-mono text-[11px] font-bold">
                {totalMatchesInCategory} Partai Terbentuk
              </span>
            </div>
          </div>

          {/* Kolom 2 Scrollable Viewport (Preview Canvas) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            {bracketCleared ? (
              <div className="w-full max-w-2xl mx-auto my-12 p-8 bg-[#09132c] border-2 border-dashed border-slate-700 text-center space-y-4 shadow-2xl">
                <div className="w-14 h-14 mx-auto bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400">
                  <Trash2 className="w-7 h-7" />
                </div>
                <h4 className="font-black text-base text-white uppercase tracking-wider">
                  BAGAN & JADWAL PERTANDINGAN TELAH DIKOSONGKAN
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Seluruh bagan dan jadwal partai saat ini dalam kondisi kosong.
                  {participants.length > 0
                    ? ` Terdapat ${participants.length} data atlet tersimpan di sistem Loting. Klik tombol di bawah untuk langsung menyusun kembali Bagan & Jadwal.`
                    : " Silakan input data atlet baru dan lakukan Loting di menu Input Data & Loting."}
                </p>
                {participants.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateBagan}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>BUAT & GENERATE ULANG BAGAN DARI DATA LOTING ({participants.length} ATLET)</span>
                  </button>
                )}
              </div>
            ) : currentClassAthletes.length === 0 ? (
              <div className="w-full max-w-2xl mx-auto my-12 p-8 bg-[#09132c] border border-slate-800 text-center space-y-4 shadow-2xl">
                <div className="w-12 h-12 mx-auto bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="font-black text-sm text-white uppercase tracking-wider">
                  BELUM ADA ATLET TERDAFTAR DI {currentCategoryName.toUpperCase()} ({selectedGender})
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {participants.length > 0
                    ? `Terdapat total ${participants.length} atlet terdaftar di kelas/kategori lain. Pilih kelas yang memiliki atlet pada tombol di bawah atau tambahkan atlet di kelas ini.`
                    : "Belum ada atlet yang diinput atau diloting. Silakan tambahkan atlet melalui menu Input Data & Loting."}
                </p>
                {participants.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                      KELAS YANG MEMILIKI DATA ATLET TERLOTING:
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {Array.from(
                        new Set(
                          participants.map(
                            p => `${normalizeAgeCategory(p.ageCategory)}|${normalizeWeightClass(p.weightClass)}|${p.gender === "PUTRI" ? "PUTRI" : "PUTRA"}`
                          )
                        )
                      ).map(key => {
                        const [ageK, clsK, genK] = key.split("|");
                        const count = participants.filter(
                          p =>
                            normalizeAgeCategory(p.ageCategory) === ageK &&
                            normalizeWeightClass(p.weightClass) === clsK &&
                            (p.gender === "PUTRI" ? "PUTRI" : "PUTRA") === genK
                        ).length;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setSelectedAge(ageK);
                              setSelectedClass(clsK);
                              setSelectedGender(genK as "PUTRA" | "PUTRI");
                              setCompetitionMethod(categoryMethods[ageK] || "PRESTASI");
                              setPemasalanScheme(categoryPemasalanSchemes[ageK] || "SEMIFINAL");
                              setSelectedPoolScheme(categoryPrestasiSchemes[ageK] || "SINGLE_NO_POOL");
                            }}
                            className="px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/50 text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer"
                          >
                            {ageK} - {clsK} ({genK}) · {count} Atlet
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : competitionMethod === "PEMASALAN" ? (
              /* =================================================================== */
              /* PREVIEW BAGAN PEMASALAN (SEMIFINAL 4 BAGAN ATAU FINAL 2 BAGAN)       */
              /* =================================================================== */
              <div className="w-full max-w-7xl mx-auto space-y-6">

                {/* Banner Status Seluruh Bagan Terbentuk */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-[#091b38] to-[#061126] border border-emerald-500/40 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-sans font-black text-sm text-white uppercase tracking-wider">
                          TOTAL BAGAN TERBENTUK: <strong className="text-emerald-300">{pemasalanPools.length} BAGAN / POOL</strong>
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-bold">
                          {pemasalanScheme === "SEMIFINAL" ? "SEMIFINAL (4 BAGAN/POOL)" : "FINAL LANGSUNG (2 BAGAN/POOL)"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                        Menampilkan <strong className="text-emerald-300">{displayedPools.length}</strong> dari total <strong className="text-white">{pemasalanPools.length}</strong> bagan kategori {currentCategoryName} ({selectedGender}) &bull; {currentClassAthletes.length} Atlet Terdaftar &bull; {totalMatchesInCategory} Partai
                      </p>
                    </div>
                  </div>

                  {pemasalanPools.length > 1 && (
                    <div className="flex items-center gap-2 bg-[#040c1e] p-1.5 border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-300 font-mono font-bold uppercase pl-1">
                        PILIH TAMPILAN:
                      </span>
                      <select
                        value={selectedPoolFilter}
                        onChange={(e) => setSelectedPoolFilter(e.target.value)}
                        className="px-2.5 py-1 bg-slate-900 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="ALL">SEMUA BAGAN ({pemasalanPools.length} Pool)</option>
                        {pemasalanPools.map(p => (
                          <option key={p.poolLetter} value={p.poolLetter}>
                            {p.poolName} ({p.athletes.length} Atlet)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Grid Kartu Pool Pemasalan */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {displayedPools.map((pool, poolIdx) => (
                    <div
                      key={pool.poolLetter}
                      className="rounded-none bg-gradient-to-b from-[#0a142c] to-[#060c1c] border-2 border-emerald-500/40 p-4 sm:p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden"
                    >
                      {/* Pool Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-none bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono font-black text-sm flex items-center justify-center shadow">
                            {pool.poolLetter}
                          </div>
                          <div>
                            <h4 className="font-sans font-black text-sm text-white uppercase tracking-wider">
                              {pool.poolName.toUpperCase()} (BAGAN {poolIdx + 1} DARI {pemasalanPools.length}) &bull; {currentCategoryName.toUpperCase()}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {pool.athletes.length} Atlet Terdaftar di Pool Ini
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-none bg-slate-900 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold">
                          {pemasalanScheme === "SEMIFINAL" ? "SEMIFINAL 4 BAGAN" : "FINAL 2 BAGAN"}
                        </span>
                      </div>

                      {/* Matches Layout */}
                      {pemasalanScheme === "SEMIFINAL" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          
                          {/* Semifinals (Left) */}
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                <Swords className="w-3 h-3" /> BABAK SEMIFINAL (2 PARTAI)
                              </span>
                              <span className="text-[8px] font-mono font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 border border-slate-700 uppercase">
                                IPSI 2026 &bull; PERSILAT
                              </span>
                            </div>

                            {/* SF 1 Card */}
                            {pool.semifinal1 && (
                              <div 
                                onClick={() => onOpenMatch && onOpenMatch(pool.semifinal1)}
                                className={`p-3 rounded-none border transition-all cursor-pointer relative group ${
                                  pool.semifinal1.status === "SELESAI"
                                    ? "bg-slate-900/90 border-slate-700"
                                    : "bg-slate-900/60 border-indigo-900/40 hover:border-indigo-500/50"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1.5 pb-1 border-b border-slate-800">
                                  <span className="font-bold text-cyan-300">PARTAI 1 &bull; SEMIFINAL 1</span>
                                  <div className="flex items-center gap-2">
                                    <span className={pool.semifinal1.status === "SELESAI" ? "text-emerald-400 font-bold" : "text-amber-400"}>
                                      {pool.semifinal1.status || "BELUM"}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMatchFromBracket(pool.semifinal1.id, pool.semifinal1.matchNumber || "1");
                                      }}
                                      className="p-1 rounded-none hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                      title={`Hapus Partai ${pool.semifinal1.matchNumber || "1"} dari bagan`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Blue */}
                                <div className={`flex items-center justify-between p-1.5 rounded-none mb-1 ${
                                  pool.semifinal1.winner === "BIRU" ? "bg-blue-950/80 border border-blue-500/50 text-white font-bold" : "text-slate-300"
                                }`}>
                                  <span className="text-xs truncate">{pool.semifinal1.fighterBlueName}</span>
                                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                    <span className="font-mono text-xs font-bold text-blue-400">{pool.semifinal1.scoreBlue ?? 0}</span>
                                    {pool.semifinal1.fighterBlueName && pool.semifinal1.fighterBlueName !== "BYE" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAthleteFromBracket(pool.semifinal1.id, "BLUE");
                                        }}
                                        className="p-1 rounded-none hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                        title={`Hapus atlet ${pool.semifinal1.fighterBlueName} (jadikan BYE)`}
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Red */}
                                <div className={`flex items-center justify-between p-1.5 rounded-none ${
                                  pool.semifinal1.winner === "MERAH" ? "bg-red-950/80 border border-red-500/50 text-white font-bold" : "text-slate-300"
                                }`}>
                                  <span className="text-xs truncate">{pool.semifinal1.fighterRedName}</span>
                                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                    <span className="font-mono text-xs font-bold text-red-400">{pool.semifinal1.scoreRed ?? 0}</span>
                                    {pool.semifinal1.fighterRedName && pool.semifinal1.fighterRedName !== "BYE" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAthleteFromBracket(pool.semifinal1.id, "RED");
                                        }}
                                        className="p-1 rounded-none hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                        title={`Hapus atlet ${pool.semifinal1.fighterRedName} (jadikan BYE)`}
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* SF 2 Card */}
                            {pool.semifinal2 && (
                              <div 
                                onClick={() => onOpenMatch && onOpenMatch(pool.semifinal2)}
                                className={`p-3 rounded-none border transition-all cursor-pointer relative group ${
                                  pool.semifinal2.status === "SELESAI"
                                    ? "bg-slate-900/90 border-slate-700"
                                    : "bg-slate-900/60 border-indigo-900/40 hover:border-indigo-500/50"
                                }`}
                              >
                                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1.5 pb-1 border-b border-slate-800">
                                  <span className="font-bold text-cyan-300">PARTAI 2 &bull; SEMIFINAL 2</span>
                                  <div className="flex items-center gap-2">
                                    <span className={pool.semifinal2.status === "SELESAI" ? "text-emerald-400 font-bold" : "text-amber-400"}>
                                      {pool.semifinal2.status || "BELUM"}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMatchFromBracket(pool.semifinal2.id, pool.semifinal2.matchNumber || "2");
                                      }}
                                      className="p-1 rounded-none hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                      title={`Hapus Partai ${pool.semifinal2.matchNumber || "2"} dari bagan`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Blue */}
                                <div className={`flex items-center justify-between p-1.5 rounded-none mb-1 ${
                                  pool.semifinal2.winner === "BIRU" ? "bg-blue-950/80 border border-blue-500/50 text-white font-bold" : "text-slate-300"
                                }`}>
                                  <span className="text-xs truncate">{pool.semifinal2.fighterBlueName}</span>
                                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                    <span className="font-mono text-xs font-bold text-blue-400">{pool.semifinal2.scoreBlue ?? 0}</span>
                                    {pool.semifinal2.fighterBlueName && pool.semifinal2.fighterBlueName !== "BYE" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAthleteFromBracket(pool.semifinal2.id, "BLUE");
                                        }}
                                        className="p-1 rounded-none hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                        title={`Hapus atlet ${pool.semifinal2.fighterBlueName} (jadikan BYE)`}
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Red */}
                                <div className={`flex items-center justify-between p-1.5 rounded-none ${
                                  pool.semifinal2.winner === "MERAH" ? "bg-red-950/80 border border-red-500/50 text-white font-bold" : "text-slate-300"
                                }`}>
                                  <span className="text-xs truncate">{pool.semifinal2.fighterRedName}</span>
                                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                    <span className="font-mono text-xs font-bold text-red-400">{pool.semifinal2.scoreRed ?? 0}</span>
                                    {pool.semifinal2.fighterRedName && pool.semifinal2.fighterRedName !== "BYE" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAthleteFromBracket(pool.semifinal2.id, "RED");
                                        }}
                                        className="p-1 rounded-none hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                        title={`Hapus atlet ${pool.semifinal2.fighterRedName} (jadikan BYE)`}
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Final Match (Right) */}
                          <div className="flex flex-col gap-3">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-amber-400" /> BABAK FINAL (PARTAI KE-3)
                            </span>

                            {pool.finalMatch && (
                              <div 
                                onClick={() => onOpenMatch && onOpenMatch(pool.finalMatch)}
                                className="p-3.5 rounded-none border-2 border-amber-500/40 bg-gradient-to-b from-[#141c38] to-[#0a1124] shadow-lg transition-all cursor-pointer hover:border-amber-400 relative group"
                              >
                                <div className="flex items-center justify-between text-[9px] font-mono text-amber-300/80 mb-2 pb-1 border-b border-amber-500/20">
                                  <span className="font-bold text-amber-300">PARTAI 3 &bull; FINAL {pool.poolName.toUpperCase()}</span>
                                  <div className="flex items-center gap-2">
                                    <span className={pool.finalMatch.status === "SELESAI" ? "text-emerald-400 font-bold" : "text-amber-400"}>
                                      {pool.finalMatch.status || "BELUM"}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMatchFromBracket(pool.finalMatch.id, `Final-${pool.poolName}`);
                                      }}
                                      className="p-1 rounded-none hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                      title="Hapus partai final ini dari bagan"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* Banner Informasi Pemasalan IPSI 2026 */}
                                {pool.finalMatch.status !== "SELESAI" && (
                                  <div className="mb-2 px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-[8.5px] text-amber-300 font-mono flex items-center gap-1.5">
                                    <span className="animate-pulse">⏳</span>
                                    <span>Partai ke-3 menunggu hasil kemenangan dari 2 partai sebelumnya (IPSI 2026 &bull; PERSILAT)</span>
                                  </div>
                                )}

                                {/* Blue */}
                                <div className={`flex items-center justify-between p-2 rounded-none mb-1.5 ${
                                  pool.finalMatch.winner === "BIRU" ? "bg-blue-950 border border-blue-400 text-white font-bold" : "bg-slate-900/80 text-slate-200"
                                }`}>
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[8px] font-mono font-bold text-blue-400 uppercase">SUDUT BIRU</span>
                                      {pool.semifinal1?.status === "SELESAI" ? (
                                        <span className="text-[7.5px] font-mono text-emerald-300 bg-emerald-950 px-1 py-0.2 border border-emerald-500/40">✓ PEMENANG PARTAI 1</span>
                                      ) : (
                                        <span className="text-[7.5px] font-mono text-amber-300 bg-amber-950 px-1 py-0.2 border border-amber-500/40">MENUNGGU SF 1</span>
                                      )}
                                    </div>
                                    <span className="text-xs truncate font-bold text-white">{pool.finalMatch.fighterBlueName}</span>
                                    <span className="text-[9px] text-slate-400 truncate">{pool.finalMatch.fighterBlueClub}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                    <span className="font-mono text-sm font-black text-blue-400">{pool.finalMatch.scoreBlue ?? 0}</span>
                                    {pool.finalMatch.fighterBlueName && pool.finalMatch.fighterBlueName !== "BYE" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAthleteFromBracket(pool.finalMatch.id, "BLUE");
                                        }}
                                        className="p-1 rounded-none hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                        title={`Hapus atlet ${pool.finalMatch.fighterBlueName} (jadikan BYE)`}
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Red */}
                                <div className={`flex items-center justify-between p-2 rounded-none ${
                                  pool.finalMatch.winner === "MERAH" ? "bg-red-950 border border-red-400 text-white font-bold" : "bg-slate-900/80 text-slate-200"
                                }`}>
                                  <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[8px] font-mono font-bold text-red-400 uppercase">SUDUT MERAH</span>
                                      {pool.semifinal2?.status === "SELESAI" || pool.athletes.length === 3 ? (
                                        <span className="text-[7.5px] font-mono text-emerald-300 bg-emerald-950 px-1 py-0.2 border border-emerald-500/40">✓ PEMENANG PARTAI 2</span>
                                      ) : (
                                        <span className="text-[7.5px] font-mono text-amber-300 bg-amber-950 px-1 py-0.2 border border-amber-500/40">MENUNGGU SF 2</span>
                                      )}
                                    </div>
                                    <span className="text-xs truncate font-bold text-white">{pool.finalMatch.fighterRedName}</span>
                                    <span className="text-[9px] text-slate-400 truncate">{pool.finalMatch.fighterRedClub}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                    <span className="font-mono text-sm font-black text-red-400">{pool.finalMatch.scoreRed ?? 0}</span>
                                    {pool.finalMatch.fighterRedName && pool.finalMatch.fighterRedName !== "BYE" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAthleteFromBracket(pool.finalMatch.id, "RED");
                                        }}
                                        className="p-1 rounded-none hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                        title={`Hapus atlet ${pool.finalMatch.fighterRedName} (jadikan BYE)`}
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      ) : (
                        /* Direct Final (2 bagan) */
                        <div className="flex flex-col gap-3">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-400" /> PERTANDINGAN FINAL LANGSUNG
                          </span>

                          {pool.finalMatch && (
                            <div 
                              onClick={() => onOpenMatch && onOpenMatch(pool.finalMatch)}
                              className="p-4 rounded-none border-2 border-amber-500/40 bg-gradient-to-b from-[#141c38] to-[#0a1124] shadow-lg transition-all cursor-pointer hover:border-amber-400 relative group"
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-amber-300/80 mb-2 pb-1 border-b border-amber-500/20">
                                <span className="font-bold text-amber-300">PARTAI FINAL {pool.poolName.toUpperCase()}</span>
                                <div className="flex items-center gap-2">
                                  <span className={pool.finalMatch.status === "SELESAI" ? "text-emerald-400 font-bold" : "text-amber-400"}>
                                    {pool.finalMatch.status || "BELUM"}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMatchFromBracket(pool.finalMatch.id, `Final-${pool.poolName}`);
                                    }}
                                    className="p-1 rounded-none hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                    title="Hapus partai final ini dari bagan"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {/* Blue */}
                                <div className={`p-2.5 rounded-none border relative ${
                                  pool.finalMatch.winner === "BIRU" ? "bg-blue-950 border-blue-400" : "bg-slate-900/90 border-slate-700"
                                }`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-mono text-blue-400 font-bold block">SUDUT BIRU</span>
                                    {pool.finalMatch.fighterBlueName && pool.finalMatch.fighterBlueName !== "BYE" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAthleteFromBracket(pool.finalMatch.id, "BLUE");
                                        }}
                                        className="p-1 rounded-none hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                        title={`Hapus atlet ${pool.finalMatch.fighterBlueName} (jadikan BYE)`}
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-white block truncate">{pool.finalMatch.fighterBlueName}</span>
                                  <span className="text-[9px] text-slate-400 block truncate">{pool.finalMatch.fighterBlueClub}</span>
                                  <span className="font-mono text-base font-black text-blue-400 block mt-1">{pool.finalMatch.scoreBlue ?? 0}</span>
                                </div>

                                {/* Red */}
                                <div className={`p-2.5 rounded-none border relative ${
                                  pool.finalMatch.winner === "MERAH" ? "bg-red-950 border-red-400" : "bg-slate-900/90 border-slate-700"
                                }`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-mono text-red-400 font-bold block">SUDUT MERAH</span>
                                    {pool.finalMatch.fighterRedName && pool.finalMatch.fighterRedName !== "BYE" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAthleteFromBracket(pool.finalMatch.id, "RED");
                                        }}
                                        className="p-1 rounded-none hover:bg-red-950 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                        title={`Hapus atlet ${pool.finalMatch.fighterRedName} (jadikan BYE)`}
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-white block truncate">{pool.finalMatch.fighterRedName}</span>
                                  <span className="text-[9px] text-slate-400 block truncate">{pool.finalMatch.fighterRedClub}</span>
                                  <span className="font-mono text-base font-black text-red-400 block mt-1">{pool.finalMatch.scoreRed ?? 0}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Podium Juara Pool */}
                      <div className="mt-2 pt-3 border-t border-slate-800/80 bg-slate-950/40 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3 sm:p-4 rounded-none">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Medal className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                            HASIL MEDALI {pool.poolName.toUpperCase()}:
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                          {/* Juara 1 */}
                          <div className="p-2 rounded-none bg-amber-950/40 border border-amber-500/30 flex items-center gap-2">
                            <span className="text-sm">🥇</span>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-amber-300 truncate">
                                {pool.champion ? pool.champion.name : "Menunggu Final"}
                              </span>
                              <span className="text-[9px] text-slate-400 truncate">Juara 1 (Emas)</span>
                            </div>
                          </div>

                          {/* Juara 2 */}
                          <div className="p-2 rounded-none bg-slate-900 border border-slate-700 flex items-center gap-2">
                            <span className="text-sm">🥈</span>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-200 truncate">
                                {pool.runnerUp ? pool.runnerUp.name : "Menunggu Final"}
                              </span>
                              <span className="text-[9px] text-slate-400 truncate">Juara 2 (Perak)</span>
                            </div>
                          </div>

                          {/* Juara 3 Bersama (untuk Semifinal 4 bagan) */}
                          {pemasalanScheme === "SEMIFINAL" && (
                            <div className="p-2 rounded-none bg-amber-950/20 border border-amber-800/30 flex items-center gap-2 col-span-2 sm:col-span-1">
                              <span className="text-sm">🥉</span>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-amber-200 truncate">
                                  {pool.bronze1 ? pool.bronze1.name : "-"} & {pool.bronze2 ? pool.bronze2.name : "-"}
                                </span>
                                <span className="text-[9px] text-slate-400 truncate">Juara 3 Bersama (Perunggu)</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>

              </div>
            ) : (
              /* =================================================================== */
              /* PREVIEW BAGAN PRESTASI (SISTEM GUGUR INTERAKTIF - TOMBOL MERAH)      */
              /* =================================================================== */
              <div className="w-full flex flex-col items-center justify-start space-y-4">
                
                {/* Bracket Tree Container */}
                <div 
                  className="w-full max-w-7xl transition-transform duration-200 origin-top overflow-x-auto"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <TournamentBracketView
                    participants={bracketParticipants}
                    matches={bracketMatches}
                    categoryName={currentCategoryName}
                    categoryClassId={selectedCategoryId}
                    gender={selectedGender}
                    poolScheme={selectedPoolScheme}
                    arenaName="A"
                    onSelectMatch={(m) => {
                      if (onOpenMatch) onOpenMatch(m);
                    }}
                    className="w-full min-h-[640px] border border-slate-800/80 rounded-none bg-[#09122a]/50 p-4 shadow-xl"
                  />
                </div>

              </div>
            )}

          </div>
        </main>

      </div>
    </div>
  );
}
