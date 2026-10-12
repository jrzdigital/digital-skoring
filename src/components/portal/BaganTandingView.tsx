import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Trophy, 
  Award, 
  Shuffle, 
  Trash2, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  ChevronRight, 
  ListOrdered, 
  Lock, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Settings2,
  Check,
  Sparkles,
  Layers,
  Filter
} from "lucide-react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { TournamentBracketView, BracketParticipant, BracketMatch } from "../TournamentBracketView";
import { sound } from "../../utils/sound";
import { autoSyncAndGenerateAllBrackets } from "../../utils/baganGenerator";

export interface BaganTandingViewProps {
  currentUser?: any;
  onOpenSignModal?: (message?: string, isWarning?: boolean) => void;
  onActivateMatch?: (match: any) => void;
  selectedArena?: string;
  eventName?: string;
  venueName?: string;
  eventDates?: string;
  isGuestMode?: boolean;
}

// Module-level helper: check dummy athlete
function isDummyAthleteObj(p: any): boolean {
  if (!p) return false;
  const name = p.name ? p.name.toUpperCase() : "";
  const club = p.club ? p.club.toUpperCase() : "";
  const id = p.id ? p.id.toString() : "";
  if (name.startsWith("PESILAT ") && club.startsWith("KONTINGEN ")) return true;
  if (id.includes("-cat-") || id.startsWith("p-cat-") || id.startsWith("p-manual-dummy")) return true;
  return false;
}

// Module-level helper: normalize division
export function normalizeDivision(div?: string): string {
  if (!div) return "DEWASA";
  const up = div.toUpperCase().trim();
  if (up.includes("DINI")) return "USIA DINI";
  if (up.includes("PRA")) return "PRA REMAJA";
  if (up.includes("REMAJA")) return "REMAJA";
  if (up.includes("DEWASA")) return "DEWASA";
  if (up.includes("MASTER")) return "MASTER";
  return up;
}

// Module-level helper: load all unified participants from registered_athletes, jrz_portal_athletes, and jrz_cached_participants
export function loadUnifiedParticipants(): any[] {
  const result: any[] = [];
  const seenKeys = new Set<string>();

  const addPart = (item: any) => {
    if (!item) return;
    const name = (item.name || "").trim().toUpperCase();
    if (!name || isDummyAthleteObj(item)) return;

    // Filter kategori: tanding saja (abaikan seni/jurus)
    const category = (item.category || "").toUpperCase();
    if (category === "JURUS" || category === "SENI") return;

    const club = (item.club || item.contingent || item.kontingen || "MANDIRI").trim().toUpperCase();
    const gender = (item.gender || "PUTRA").toUpperCase().includes("PUTRI") || (item.gender || "").toUpperCase() === "P" ? "PUTRI" : "PUTRA";

    let rawClass = item.className || item.classCategory || item.kelas || "A";
    let catClassId = item.categoryClassId;
    if (!catClassId) {
      const clean = rawClass.toLowerCase().replace(/kelas\s*/i, "").replace(/[^a-z0-9]/g, "");
      catClassId = `cat-kelas-${clean || "a"}`;
    }
    let className = item.className;
    if (!className) {
      const upper = rawClass.toUpperCase().trim();
      className = upper.startsWith("KELAS") ? upper : `KELAS ${upper}`;
    }

    const rawDiv = item.division || item.ageDivision || item.ageCategory || item.usia || "DEWASA";
    const division = normalizeDivision(rawDiv);
    const weight = item.weight || item.actualWeight || item.beratBadan || item.weightTarget || 50;
    const arena = item.arena || "GELANGGANG A";
    const id = item.id || `ath-${name.replace(/\s+/g, "_")}-${catClassId}-${gender}`;

    const key = `${name}___${catClassId}___${division}___${gender}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      result.push({
        id,
        name,
        club,
        gender,
        categoryClassId: catClassId,
        className,
        division,
        weight,
        arena
      });
    }
  };

  // 1. Baca dari registered_athletes (RegistrasiDataView / Sekretariat)
  try {
    const rawReg = localStorage.getItem("registered_athletes");
    if (rawReg) {
      const parsed = JSON.parse(rawReg);
      if (Array.isArray(parsed)) parsed.forEach(addPart);
    }
  } catch {}

  // 2. Baca dari jrz_portal_athletes (Administrasi Pendaftaran)
  try {
    const rawPortal = localStorage.getItem("jrz_portal_athletes");
    if (rawPortal) {
      const parsed = JSON.parse(rawPortal);
      if (Array.isArray(parsed)) parsed.forEach(addPart);
    }
  } catch {}

  // 3. Baca dari jrz_cached_participants (Cache Sinkronisasi)
  try {
    const rawCached = localStorage.getItem("jrz_cached_participants");
    if (rawCached) {
      const parsed = JSON.parse(rawCached);
      if (Array.isArray(parsed)) parsed.forEach(addPart);
    }
  } catch {}

  // Sample default jika belum ada atlet sama sekali
  if (result.length === 0) {
    return [
      { id: "atl-1", name: "MUHAMMAD RIZKY FIRMANSYAH", club: "KONTINGEN JAWA BARAT", gender: "PUTRA", categoryClassId: "cat-kelas-a", className: "KELAS A (45 - 50 KG)", division: "DEWASA", weight: 48.2, arena: "GELANGGANG A" },
      { id: "atl-2", name: "BAGAS PRASETYA NUGRAHA", club: "KONTINGEN JAWA TIMUR", gender: "PUTRA", categoryClassId: "cat-kelas-a", className: "KELAS A (45 - 50 KG)", division: "DEWASA", weight: 48.9, arena: "GELANGGANG A" },
      { id: "atl-3", name: "DIMAS SATRIA PAMUNGKAS", club: "KONTINGEN DKI JAKARTA", gender: "PUTRA", categoryClassId: "cat-kelas-b", className: "KELAS B (50 - 55 KG)", division: "DEWASA", weight: 53.4, arena: "GELANGGANG A" },
      { id: "atl-4", name: "AHMAD FAUZI AL-KAUTSAR", club: "KONTINGEN JAWA TENGAH", gender: "PUTRA", categoryClassId: "cat-kelas-b", className: "KELAS B (50 - 55 KG)", division: "DEWASA", weight: 54.2, arena: "GELANGGANG B" },
      { id: "atl-5", name: "SITI NUR HALIZA", club: "KONTINGEN DI YOGYAKARTA", gender: "PUTRI", categoryClassId: "cat-kelas-a", className: "KELAS A (45 - 50 KG)", division: "DEWASA", weight: 46.8, arena: "GELANGGANG B" },
      { id: "atl-6", name: "DEWI RATNASARI", club: "KONTINGEN BALI", gender: "PUTRI", categoryClassId: "cat-kelas-a", className: "KELAS A (45 - 50 KG)", division: "DEWASA", weight: 49.3, arena: "GELANGGANG B" }
    ];
  }

  return result;
}

// Module-level helper: pastikan semua kategori kelas yang dimiliki atlet terdaftar ada di daftar categories
export function syncCategoriesFromParticipants(parts: any[], currentCats: any[]): any[] {
  const map = new Map<string, any>();
  currentCats.forEach(c => {
    if (c.id) map.set(c.id, c);
  });

  parts.forEach(p => {
    if (p.categoryClassId && !map.has(p.categoryClassId)) {
      map.set(p.categoryClassId, {
        id: p.categoryClassId,
        name: p.className || `KELAS ${p.categoryClassId.replace("cat-kelas-", "").toUpperCase()}`,
        division: p.division || "DEWASA",
        minWeight: p.weight ? Math.floor(p.weight) - 2 : 45,
        maxWeight: p.weight ? Math.floor(p.weight) + 3 : 50
      });
    }
  });

  return Array.from(map.values());
}

export function BaganTandingView({
  currentUser,
  onOpenSignModal,
  onActivateMatch,
  selectedArena = "A",
  eventName = "PEKAN OLAHRAGA PELAJAR DAERAH (POPDA) XVII",
  venueName = "IDI RAYEUK",
  eventDates = "07 S.D 12 JULI 2026",
  isGuestMode = false
}: BaganTandingViewProps) {
  // State for participants, categories, and schedules
  const [participants, setParticipants] = useState<any[]>(() => {
    return loadUnifiedParticipants();
  });

  const [categories, setCategories] = useState<any[]>(() => {
    let baseCats = [
      { id: "cat-kelas-a", name: "KELAS A (45 - 50 KG)", division: "DEWASA", minWeight: 45, maxWeight: 50 },
      { id: "cat-kelas-b", name: "KELAS B (50 - 55 KG)", division: "DEWASA", minWeight: 50, maxWeight: 55 },
      { id: "cat-kelas-c", name: "KELAS C (55 - 60 KG)", division: "DEWASA", minWeight: 55, maxWeight: 60 },
      { id: "cat-kelas-d", name: "KELAS D (60 - 65 KG)", division: "DEWASA", minWeight: 60, maxWeight: 65 }
    ];
    try {
      const saved = localStorage.getItem("jrz_cached_categories");
      if (saved) baseCats = JSON.parse(saved);
    } catch {}
    return syncCategoriesFromParticipants(loadUnifiedParticipants(), baseCats);
  });

  const [schedules, setSchedules] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("jrz_cached_schedules");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // UI Modes and selection
  const [selectedBaganCategory, setSelectedBaganCategory] = useState<string>("");
  const [selectedBaganGender, setSelectedBaganGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [baganSchemeType, setBaganSchemeType] = useState<"DOUBLE_POOL" | "SINGLE_NO_POOL">("DOUBLE_POOL");
  const [baganViewEngine, setBaganViewEngine] = useState<"INTERACTIVE" | "COMPACT">("INTERACTIVE");
  const [baganScale, setBaganScale] = useState<number>(1.0);
  const [searchClassQuery, setSearchClassQuery] = useState<string>("");
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Storage key for Mode Pemasalan vs Mode Pool per division
  const STORAGE_KEY_PEMASALAN_MODES = "jrz_division_pemasalan_modes";

  // Mode Pemasalan (ON) vs Mode Pool (OFF) per age category/division
  const [divisionPemasalanModes, setDivisionPemasalanModes] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PEMASALAN_MODES);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default: USIA DINI and PRA REMAJA default to ON (Pemasalan), REMAJA and DEWASA default to OFF (Pool)
    return {
      "USIA DINI": true,
      "PRA REMAJA": true,
      "REMAJA": false,
      "DEWASA": false,
      "MASTER": false
    };
  });

  // Active Pemasalan Pool Index (when a class has multiple 4-athlete pools)
  const [activePemasalanPoolIndex, setActivePemasalanPoolIndex] = useState<number>(1);

  const isDivisionPemasalan = (div?: string): boolean => {
    const norm = normalizeDivision(div);
    return !!divisionPemasalanModes[norm];
  };

  // Divisi yang memiliki atlet terdaftar beserta jumlah atletnya
  // Sesuai instruksi: jika tidak ada atlet yang terdaftar di suatu divisi, maka JANGAN DITAMPILKAN divisinya
  const divisionsWithAthletes = useMemo(() => {
    const divCounts = new Map<string, number>();

    participants.forEach(p => {
      if (!p.name || p.name.trim() === "" || isDummyAthleteObj(p)) return;
      const classObj = categories.find(c => c.id === p.categoryClassId);
      const rawDiv = p.division || p.ageDivision || p.ageCategory || classObj?.division || "DEWASA";
      const norm = normalizeDivision(rawDiv);
      divCounts.set(norm, (divCounts.get(norm) || 0) + 1);
    });

    const standardDivs = ["USIA DINI", "PRA REMAJA", "REMAJA", "DEWASA", "MASTER"];
    const result: Array<{ division: string; count: number }> = [];

    // Tampilkan HANYA divisi yang memiliki atlet terdaftar (count > 0)
    standardDivs.forEach(div => {
      const count = divCounts.get(div) || 0;
      if (count > 0) {
        result.push({ division: div, count });
      }
    });

    // Masukkan divisi non-standar lainnya jika memiliki atlet terdaftar
    divCounts.forEach((count, div) => {
      if (count > 0 && !standardDivs.includes(div)) {
        result.push({ division: div, count });
      }
    });

    return result;
  }, [participants, categories]);

  // Daftar Kategori Usia (Divisi) yang tersedia - HANYA divisi dengan atlet terdaftar
  const availableDivisions = useMemo(() => {
    return divisionsWithAthletes.map(d => d.division);
  }, [divisionsWithAthletes]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch live schedules from API
  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/matches-schedule");
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
        localStorage.setItem("jrz_cached_schedules", JSON.stringify(data));
      }
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    fetchSchedules();
    const handleSync = () => {
      fetchSchedules();
      try {
        const savedParts = localStorage.getItem("jrz_cached_participants");
        if (savedParts) setParticipants(JSON.parse(savedParts));
        const savedCats = localStorage.getItem("jrz_cached_categories");
        if (savedCats) setCategories(JSON.parse(savedCats));
      } catch {}
    };
    window.addEventListener("jrz_schedules_updated", handleSync);
    window.addEventListener("jrz_athletes_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("jrz_schedules_updated", handleSync);
      window.removeEventListener("jrz_athletes_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Compute registered categories list from participants and categories
  // Hanya memuat daftar kelas yang memiliki atlet terdaftar
  const baganCategoryList = useMemo(() => {
    const listMap = new Map<string, { id: string; name: string; division: string; gender: string; count: number }>();
    
    // Hanya tambahkan kelas yang memiliki atlet terdaftar
    participants.forEach(p => {
      if (!p.name || p.name.trim() === "" || isDummyAthleteObj(p)) return;
      const classObj = categories.find(c => c.id === p.categoryClassId);
      const categoryName = p.className || (classObj ? classObj.name : p.categoryClassId.replace("cat-", "").replace("-", " ").toUpperCase());
      const rawDiv = p.division || p.ageDivision || p.ageCategory || classObj?.division || "DEWASA";
      const division = normalizeDivision(rawDiv);
      const gender = (p.gender || "PUTRA").toUpperCase() === "PUTRI" ? "PUTRI" : "PUTRA";
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

    const result = Array.from(listMap.values()).filter(c => c.count > 0);
    // Sort: urutkan berdasarkan divisi lalu nama kelas
    return result.sort((a, b) => {
      if (a.division !== b.division) return a.division.localeCompare(b.division);
      return a.name.localeCompare(b.name);
    });
  }, [participants, categories]);

  // Set initial selected category
  useEffect(() => {
    if (!selectedBaganCategory && baganCategoryList.length > 0) {
      const firstWithAthletes = baganCategoryList.find(c => c.count > 0) || baganCategoryList[0];
      setSelectedBaganCategory(firstWithAthletes.id);
      setSelectedBaganGender(firstWithAthletes.gender as any);
    }
  }, [baganCategoryList, selectedBaganCategory]);

  // Filtered categories for sidebar search and division filter
  // Fungsikan menu divisi terpadu HANYA untuk memfilter daftar kelas yang ada atlet terdaftar
  const filteredCategoryList = useMemo(() => {
    let list = baganCategoryList;

    // Filter berdasarkan Divisi Terpadu
    if (selectedDivisionFilter !== "ALL") {
      list = list.filter(c => normalizeDivision(c.division) === normalizeDivision(selectedDivisionFilter));
    }

    // Filter berdasarkan query pencarian
    if (searchClassQuery.trim()) {
      const q = searchClassQuery.toUpperCase();
      list = list.filter(c => 
        c.name.toUpperCase().includes(q) || 
        c.division.toUpperCase().includes(q) || 
        c.gender.toUpperCase().includes(q)
      );
    }
    return list;
  }, [baganCategoryList, selectedDivisionFilter, searchClassQuery]);

  // Sinkronisasi kategori aktif ketika filter divisi berubah
  useEffect(() => {
    if (filteredCategoryList.length > 0) {
      const exists = filteredCategoryList.some(
        c => c.id === selectedBaganCategory && c.gender === selectedBaganGender
      );
      if (!exists) {
        setSelectedBaganCategory(filteredCategoryList[0].id);
        setSelectedBaganGender(filteredCategoryList[0].gender as any);
      }
    }
  }, [filteredCategoryList, selectedBaganCategory, selectedBaganGender]);

  const activeCategoryObj = useMemo(() => {
    return baganCategoryList.find(c => c.id === selectedBaganCategory && c.gender === selectedBaganGender) ||
      categories.find(c => c.id === selectedBaganCategory);
  }, [baganCategoryList, categories, selectedBaganCategory, selectedBaganGender]);

  // Athletes registered in currently selected class & gender
  const currentClassAthletes = useMemo(() => {
    return participants.filter(
      p => p.categoryClassId === selectedBaganCategory && 
      (p.gender || "PUTRA").toUpperCase() === selectedBaganGender
    );
  }, [participants, selectedBaganCategory, selectedBaganGender]);

  // Matches for currently selected class & gender
  const currentClassMatches = useMemo(() => {
    return schedules.filter(
      m => m.categoryClassId === selectedBaganCategory && 
      (m.gender || "PUTRA").toUpperCase() === selectedBaganGender
    );
  }, [schedules, selectedBaganCategory, selectedBaganGender]);

  // Current active division mode (Pemasalan vs Pool)
  const isCurrentPemasalan = useMemo(() => {
    return isDivisionPemasalan(activeCategoryObj?.division);
  }, [activeCategoryObj?.division, divisionPemasalanModes]);

  // Structured pools for Pemasalan mode (max 4 athletes per pool)
  const pemasalanPools = useMemo(() => {
    if (!isCurrentPemasalan) return [];
    const chunkSize = 4;
    const realParts = currentClassAthletes.filter(p => !isDummyAthleteObj(p));
    const athletes = realParts.length > 0 ? realParts : currentClassAthletes;
    const totalPools = Math.max(1, Math.ceil(athletes.length / chunkSize));
    
    const pools: Array<{
      poolNumber: number;
      poolTitle: string;
      athletes: any[];
      matches: any[];
      semifinal1?: any;
      semifinal2?: any;
      finalMatch?: any;
      goldWinner?: any;
      silverWinner?: any;
      bronze1?: any;
      bronze2?: any;
    }> = [];

    for (let pIdx = 0; pIdx < totalPools; pIdx++) {
      const pNum = pIdx + 1;
      const poolAthletes = athletes.slice(pIdx * chunkSize, (pIdx + 1) * chunkSize);
      const poolMatches = currentClassMatches.filter(m => 
        m.pemasalanPool === pNum || 
        (m.stage && m.stage.toUpperCase().includes(`POOL ${pNum}`))
      );

      const sf1 = poolMatches.find(m => m.stage && m.stage.toUpperCase().includes("SEMIFINAL 1")) || poolMatches[0];
      const sf2 = poolMatches.find(m => m.stage && m.stage.toUpperCase().includes("SEMIFINAL 2")) || poolMatches[1];
      const finalM = poolMatches.find(m => m.stage && m.stage.toUpperCase().includes("FINAL") && !m.stage.toUpperCase().includes("SEMIFINAL")) || poolMatches[poolMatches.length - 1];

      // Derive podium winners if matches are finished
      let goldWinner: any = null;
      let silverWinner: any = null;
      let bronze1: any = null;
      let bronze2: any = null;

      if (finalM && finalM.winner) {
        if (finalM.winner === "BLUE") {
          goldWinner = { name: finalM.fighterBlueName, club: finalM.fighterBlueClub };
          silverWinner = { name: finalM.fighterRedName, club: finalM.fighterRedClub };
        } else if (finalM.winner === "RED") {
          goldWinner = { name: finalM.fighterRedName, club: finalM.fighterRedClub };
          silverWinner = { name: finalM.fighterBlueName, club: finalM.fighterBlueClub };
        }
      }

      if (sf1 && sf1.winner) {
        bronze1 = sf1.winner === "BLUE" 
          ? { name: sf1.fighterRedName, club: sf1.fighterRedClub }
          : { name: sf1.fighterBlueName, club: sf1.fighterBlueClub };
      }
      if (sf2 && sf2.winner) {
        bronze2 = sf2.winner === "BLUE"
          ? { name: sf2.fighterRedName, club: sf2.fighterRedClub }
          : { name: sf2.fighterBlueName, club: sf2.fighterBlueClub };
      }

      pools.push({
        poolNumber: pNum,
        poolTitle: totalPools > 1 ? `POOL ${pNum}` : "POOL UTAMA",
        athletes: poolAthletes,
        matches: poolMatches,
        semifinal1: sf1,
        semifinal2: sf2,
        finalMatch: finalM,
        goldWinner,
        silverWinner,
        bronze1,
        bronze2
      });
    }

    return pools;
  }, [isCurrentPemasalan, currentClassAthletes, currentClassMatches]);

  // Check guest permission
  const checkPermission = (actionDesc: string): boolean => {
    if (!currentUser || isGuestMode) {
      if (onOpenSignModal) {
        onOpenSignModal(`Aksi Terbatas: Silakan masuk sebagai Panitia untuk ${actionDesc}.`, true);
      } else {
        alert(`Aksi ini memerlukan autentikasi Panitia Pertandingan.`);
      }
      return false;
    }
    return true;
  };

  // Fair shuffle tournament athletes
  const fairShuffleTournamentAthletes = (athletes: any[]): any[] => {
    if (!athletes || athletes.length <= 1) return athletes ? [...athletes] : [];
    const pool = [...athletes];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

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
          if (leftPool.length < half) leftPool.push(m);
          else if (rightPool.length < N - half) rightPool.push(m);
          else leftPool.push(m);
        } else {
          if (rightPool.length < N - half) rightPool.push(m);
          else if (leftPool.length < half) leftPool.push(m);
          else rightPool.push(m);
        }
      });
    });

    const finalShuffled: any[] = [];
    const maxLen = Math.max(leftPool.length, rightPool.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < leftPool.length) finalShuffled.push(leftPool[i]);
      if (i < rightPool.length) finalShuffled.push(rightPool[i]);
    }
    return finalShuffled;
  };

  // Generate Bagan Pemasalan Otomatis (Maksimal 4 Atlet per Pool)
  const handleAutoGeneratePemasalanBagan = async (
    providedAthletes?: any[],
    targetCatId?: string,
    targetGender?: string,
    isAutoSync: boolean = false
  ) => {
    if (!isAutoSync && !checkPermission("membuat atau mengubah susunan bagan pertandingan sistem pemasalan")) return;
    if (!isAutoSync) sound.playClick();

    const effectiveCatId = targetCatId || selectedBaganCategory;
    const effectiveGender = targetGender || selectedBaganGender;

    if (targetCatId) setSelectedBaganCategory(targetCatId);
    if (targetGender) setSelectedBaganGender(targetGender as any);

    const cat = categories.find(c => c.id === effectiveCatId) || baganCategoryList.find(c => c.id === effectiveCatId);
    const catName = cat ? cat.name : "Kelas Tanding";

    const sourceParticipants = participants;
    const unfilteredAthletes = (providedAthletes && providedAthletes.length > 0)
      ? providedAthletes
      : sourceParticipants.filter(
          p => p.categoryClassId === effectiveCatId && 
          (p.gender || "PUTRA").toUpperCase() === effectiveGender && 
          p.name && p.name.trim() !== ""
        );

    const realParts = unfilteredAthletes.filter(p => !isDummyAthleteObj(p));
    const catAthletes = realParts.length > 0 ? realParts : unfilteredAthletes;

    if (catAthletes.length === 0) {
      if (!isAutoSync) {
        alert(`Belum ada atlet terdaftar pada ${catName} (${effectiveGender}). Silakan daftarkan atlet terlebih dahulu.`);
      }
      return;
    }

    const unrelatedMatches = schedules.filter(
      m => !(m.categoryClassId === effectiveCatId && (m.gender || "PUTRA").toUpperCase() === effectiveGender)
    );

    const basePartaiNum = unrelatedMatches.length;
    let matchCounter = 1;
    const generatedMatches: any[] = [];

    const chunkSize = 4;
    const totalPools = Math.ceil(catAthletes.length / chunkSize);

    for (let pIdx = 0; pIdx < totalPools; pIdx++) {
      const poolNum = pIdx + 1;
      const chunk = catAthletes.slice(pIdx * chunkSize, (pIdx + 1) * chunkSize);
      const poolTag = totalPools > 1 ? `POOL ${poolNum}` : "POOL UTAMA";

      const ath1 = chunk[0] || null;
      const ath2 = chunk[1] || null;
      const ath3 = chunk[2] || null;
      const ath4 = chunk[3] || null;

      if (chunk.length >= 4) {
        // 4 atlet: SF1, SF2, Final Emas & Perak
        const sf1Id = `m-${effectiveCatId}-${effectiveGender}-pem-p${poolNum}-sf1`;
        const sf2Id = `m-${effectiveCatId}-${effectiveGender}-pem-p${poolNum}-sf2`;
        const finalId = `m-${effectiveCatId}-${effectiveGender}-pem-p${poolNum}-final`;

        const sf1Match = {
          id: sf1Id,
          matchNumber: `Partai ${basePartaiNum + matchCounter++}`,
          stage: `SEMIFINAL 1 (${poolTag})`,
          categoryClassId: effectiveCatId,
          fighterRedId: ath1.id,
          fighterRedName: ath1.name,
          fighterRedClub: ath1.club || ath1.contingent || "MANDIRI",
          fighterBlueId: ath2.id,
          fighterBlueName: ath2.name,
          fighterBlueClub: ath2.club || ath2.contingent || "MANDIRI",
          arena: `GELANGGANG ${selectedArena}`,
          gender: effectiveGender,
          status: "BELUM",
          winner: null,
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3
        };

        const sf2Match = {
          id: sf2Id,
          matchNumber: `Partai ${basePartaiNum + matchCounter++}`,
          stage: `SEMIFINAL 2 (${poolTag})`,
          categoryClassId: effectiveCatId,
          fighterRedId: ath3.id,
          fighterRedName: ath3.name,
          fighterRedClub: ath3.club || ath3.contingent || "MANDIRI",
          fighterBlueId: ath4.id,
          fighterBlueName: ath4.name,
          fighterBlueClub: ath4.club || ath4.contingent || "MANDIRI",
          arena: `GELANGGANG ${selectedArena}`,
          gender: effectiveGender,
          status: "BELUM",
          winner: null,
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3
        };

        const finalMatch = {
          id: finalId,
          matchNumber: `Partai ${basePartaiNum + matchCounter++}`,
          stage: `FINAL EMAS & PERAK (${poolTag})`,
          categoryClassId: effectiveCatId,
          fighterRedId: `winner-${sf1Id}`,
          fighterRedName: `PEMENANG SF 1 (${poolTag})`,
          fighterRedClub: "-",
          fighterBlueId: `winner-${sf2Id}`,
          fighterBlueName: `PEMENANG SF 2 (${poolTag})`,
          fighterBlueClub: "-",
          arena: `GELANGGANG ${selectedArena}`,
          gender: effectiveGender,
          status: "BELUM",
          winner: null,
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3
        };

        generatedMatches.push(sf1Match, sf2Match, finalMatch);
      } else if (chunk.length === 3) {
        // 3 atlet: SF (ath1 vs ath2), Final (ath3 vs winner SF)
        const sfId = `m-${effectiveCatId}-${effectiveGender}-pem-p${poolNum}-sf`;
        const finalId = `m-${effectiveCatId}-${effectiveGender}-pem-p${poolNum}-final`;

        const sfMatch = {
          id: sfId,
          matchNumber: `Partai ${basePartaiNum + matchCounter++}`,
          stage: `SEMIFINAL (${poolTag})`,
          categoryClassId: effectiveCatId,
          fighterRedId: ath1.id,
          fighterRedName: ath1.name,
          fighterRedClub: ath1.club || ath1.contingent || "MANDIRI",
          fighterBlueId: ath2.id,
          fighterBlueName: ath2.name,
          fighterBlueClub: ath2.club || ath2.contingent || "MANDIRI",
          arena: `GELANGGANG ${selectedArena}`,
          gender: effectiveGender,
          status: "BELUM",
          winner: null,
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3
        };

        const finalMatch = {
          id: finalId,
          matchNumber: `Partai ${basePartaiNum + matchCounter++}`,
          stage: `FINAL EMAS & PERAK (${poolTag})`,
          categoryClassId: effectiveCatId,
          fighterRedId: ath3.id,
          fighterRedName: ath3.name,
          fighterRedClub: ath3.club || ath3.contingent || "MANDIRI",
          fighterBlueId: `winner-${sfId}`,
          fighterBlueName: `PEMENANG SF (${poolTag})`,
          fighterBlueClub: "-",
          arena: `GELANGGANG ${selectedArena}`,
          gender: effectiveGender,
          status: "BELUM",
          winner: null,
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3
        };

        generatedMatches.push(sfMatch, finalMatch);
      } else if (chunk.length === 2) {
        // 2 atlet: langsung Final
        const finalId = `m-${effectiveCatId}-${effectiveGender}-pem-p${poolNum}-final`;
        const finalMatch = {
          id: finalId,
          matchNumber: `Partai ${basePartaiNum + matchCounter++}`,
          stage: `FINAL EMAS & PERAK (${poolTag})`,
          categoryClassId: effectiveCatId,
          fighterRedId: ath1.id,
          fighterRedName: ath1.name,
          fighterRedClub: ath1.club || ath1.contingent || "MANDIRI",
          fighterBlueId: ath2.id,
          fighterBlueName: ath2.name,
          fighterBlueClub: ath2.club || ath2.contingent || "MANDIRI",
          arena: `GELANGGANG ${selectedArena}`,
          gender: effectiveGender,
          status: "BELUM",
          winner: null,
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3
        };
        generatedMatches.push(finalMatch);
      }
    }

    const mergedMatches = [...unrelatedMatches, ...generatedMatches];
    setSchedules(mergedMatches);
    try {
      localStorage.setItem("jrz_cached_schedules", JSON.stringify(mergedMatches));
      await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: categories,
          newParticipants: sourceParticipants,
          newMatches: mergedMatches
        })
      });
    } catch {}

    showToast(`⭐ Bagan Pemasalan ${catName} (${effectiveGender}) dibuat! Total ${totalPools} Pool (${generatedMatches.length} Partai).`);
  };

  // Generate Bagan Otomatis Logic (matching scoring panel)
  const handleAutoGenerateBagan = async (
    customCapacity?: number,
    targetCatId?: string,
    targetGender?: string,
    providedParticipants?: any[],
    isAutoSync: boolean = false
  ) => {
    if (!isAutoSync && !checkPermission("membuat atau mengubah susunan bagan pertandingan")) return;
    if (!isAutoSync) sound.playClick();

    const effectiveCatId = targetCatId || selectedBaganCategory;
    const effectiveGender = targetGender || selectedBaganGender;

    if (targetCatId) setSelectedBaganCategory(targetCatId);
    if (targetGender) setSelectedBaganGender(targetGender as any);

    const cat = categories.find(c => c.id === effectiveCatId) || baganCategoryList.find(c => c.id === effectiveCatId);
    const catName = cat ? cat.name : "Kelas Tanding";
    const divName = cat?.division || "DEWASA";

    const sourceParticipants = providedParticipants && providedParticipants.length > 0 ? providedParticipants : participants;

    const unfilteredPart = sourceParticipants.filter(
      p => p.categoryClassId === effectiveCatId && 
      (p.gender || "PUTRA").toUpperCase() === effectiveGender && 
      p.name && p.name.trim() !== ""
    );

    const realParts = unfilteredPart.filter(p => !isDummyAthleteObj(p));
    const filteredPart = realParts.length > 0 ? realParts : unfilteredPart;

    if (filteredPart.length === 0) {
      if (!isAutoSync) {
        alert(`Belum ada atlet terdaftar pada ${catName} (${effectiveGender}). Silakan daftarkan atlet terlebih dahulu.`);
      }
      return;
    }

    // Cek jika kategori usia ini menggunakan MODE PEMASALAN
    if (isDivisionPemasalan(divName)) {
      await handleAutoGeneratePemasalanBagan(filteredPart, effectiveCatId, effectiveGender, isAutoSync);
      return;
    }

    // Determine power-of-2 capacity
    let reqCapacity = 2;
    const len = filteredPart.length;
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

    const unrelatedMatches = schedules.filter(
      m => !(m.categoryClassId === effectiveCatId && (m.gender || "PUTRA").toUpperCase() === effectiveGender)
    );

    const basePartaiNum = unrelatedMatches.length;
    let matchCounter = 1;

    const getDynamicStageName = (cap: number, roundNum: number, idx: number) => {
      const isSingle = baganSchemeType === "SINGLE_NO_POOL";
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
      if (idx < matchesInRound / 2) {
        return isSingle ? `PENYISIHAN L${idx + 1}` : `PEREMPAT FINAL A${idx + 1}`;
      } else {
        const rightIdx = idx - (matchesInRound / 2);
        return isSingle ? `PENYISIHAN R${rightIdx + 1}` : `PEREMPAT FINAL B${rightIdx + 1}`;
      }
    };

    const initialSlots: any[] = [];
    const numMatchesRound1 = reqCapacity / 2;

    const isDual = baganSchemeType === "DOUBLE_POOL" && reqCapacity > 2;
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
      let numContestedMatches = N - (reqCapacity / 2);
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
          const mId = `m-${catId}-${g}-r${round}-${idx}`;
          const matchNumberVal = `Partai ${basePartaiNum + matchCounter}`;
          matchCounter++;

          const mObj = {
            id: mId,
            matchNumber: matchNumberVal,
            stage: baseStage,
            categoryClassId: catId,
            fighterRedId: fRedId,
            fighterBlueId: fBlueId,
            fighterRedName: cachedRedName,
            fighterRedClub: cachedRedClub,
            fighterBlueName: cachedBlueName,
            fighterBlueClub: cachedBlueClub,
            arena: `GELANGGANG ${selectedArena}`,
            gender: g,
            status: "BELUM",
            winner: null,
            roundDuration: 120,
            totalRounds: 3
          };

          generatedMatches.push(mObj);
          nextRoundSlots.push({ type: "winner", matchId: mId });
        } else if (left && !right) {
          nextRoundSlots.push(left);
        } else if (!left && right) {
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
      await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: categories,
          newParticipants: sourceParticipants,
          newMatches: mergedMatches
        })
      });
    } catch {}

    if (!isAutoSync) {
      showToast(`⚡ Bagan ${catName} (${effectiveGender}) berhasil digenerate! Kapasitas: ${reqCapacity} atlet.`);
    }
  };

  // Auto-generate bagan secara otomatis saat atlet terdaftar terbaca pada kelas aktif namun bagan belum dibuat
  useEffect(() => {
    if (!selectedBaganCategory) return;
    const realAthletes = currentClassAthletes.filter(p => !isDummyAthleteObj(p));
    if (realAthletes.length > 0 && currentClassMatches.length === 0) {
      if (isCurrentPemasalan) {
        handleAutoGeneratePemasalanBagan(realAthletes, selectedBaganCategory, selectedBaganGender, true);
      } else {
        const len = realAthletes.length;
        let reqCapacity = 2;
        if (len <= 2) reqCapacity = 2;
        else if (len <= 4) reqCapacity = 4;
        else if (len <= 8) reqCapacity = 8;
        else if (len <= 16) reqCapacity = 16;
        else if (len <= 32) reqCapacity = 32;
        else reqCapacity = 64;
        handleAutoGenerateBagan(reqCapacity, selectedBaganCategory, selectedBaganGender, participants, true);
      }
    }
  }, [selectedBaganCategory, selectedBaganGender, currentClassAthletes.length, currentClassMatches.length, isCurrentPemasalan]);

  // Handle ON / OFF Mode Pemasalan vs Pool per Kategori Usia
  // Apabila diaktifkan (ON), sistem membuatkan bagan mode pemasalan.
  // Apabila di-off-kan (OFF), sistem menampilkan bagan pool (prestasi).
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

    // Tentukan kategori dan pesilat yang ditargetkan
    const activeDivNorm = normalizeDivision(activeCategoryObj?.division);
    let targetCatId = selectedBaganCategory;
    let targetGender = selectedBaganGender;

    // Jika kelas aktif saat ini bukan dari divisi yang di-toggle, alihkan ke kelas pertama di divisi ini
    if (activeDivNorm !== norm) {
      const matchInDiv = baganCategoryList.find(c => normalizeDivision(c.division) === norm);
      if (matchInDiv) {
        targetCatId = matchInDiv.id;
        targetGender = matchInDiv.gender as any;
        setSelectedBaganCategory(matchInDiv.id);
        setSelectedBaganGender(matchInDiv.gender as any);
      }
    }

    // Ambil peserta pada kelas target
    const targetAthletes = participants.filter(
      p => p.categoryClassId === targetCatId && 
      (p.gender || "PUTRA").toUpperCase() === targetGender &&
      p.name && p.name.trim() !== ""
    );

    if (nextState) {
      // MODE ON: Sistem membuatkan bagan mode PEMASALAN (Maksimal 4 atlet per pool)
      if (targetAthletes.length > 0) {
        await handleAutoGeneratePemasalanBagan(targetAthletes, targetCatId, targetGender);
      }
      setActivePemasalanPoolIndex(1);
      showToast(`⭐ Mode Pemasalan AKTIF [ON] (${norm}): Sistem membuatkan bagan Pemasalan (Pool 4 Besar).`);
    } else {
      // MODE OFF: Sistem menampilkan bagan POOL (Prestasi sistem gugur)
      if (targetAthletes.length > 0) {
        await handleAutoGenerateBagan(undefined, targetCatId, targetGender, targetAthletes);
      }
      showToast(`🏆 Mode Pool AKTIF [OFF] (${norm}): Sistem menampilkan bagan Pool sistem gugur prestasi.`);
    }
  };

  // Resufle / Undian Acak
  const handleKocakUndian = async () => {
    if (!checkPermission("mengacak ulang (resufle) undian bagan")) return;
    sound.playClick();
    if (!selectedBaganCategory) {
      alert("Silakan pilih kelas tanding terlebih dahulu!");
      return;
    }

    const unfilteredAthletes = participants.filter(
      p => p.categoryClassId === selectedBaganCategory && 
      (p.gender || "PUTRA").toUpperCase() === selectedBaganGender && 
      p.name && p.name.trim() !== ""
    );
    const realParts = unfilteredAthletes.filter(p => !isDummyAthleteObj(p));
    const catAthletes = realParts.length > 0 ? realParts : unfilteredAthletes;

    if (catAthletes.length === 0) {
      alert("Belum ada atlet terdaftar di kelas ini untuk diresufle!");
      return;
    }

    const shuffled = fairShuffleTournamentAthletes(catAthletes);
    const otherParticipants = participants.filter(
      p => !(p.categoryClassId === selectedBaganCategory && (p.gender || "PUTRA").toUpperCase() === selectedBaganGender)
    );
    const newParticipants = [...otherParticipants, ...shuffled];
    setParticipants(newParticipants);
    try {
      localStorage.setItem("jrz_cached_participants", JSON.stringify(newParticipants));
    } catch {}

    // Cek jika kategori aktif dalam Mode Pemasalan
    const isPem = isDivisionPemasalan(activeCategoryObj?.division);
    if (isPem) {
      await handleAutoGeneratePemasalanBagan(shuffled, selectedBaganCategory, selectedBaganGender);
      showToast("🔀 Resufle undian bagan Pemasalan berhasil! Pesilat diundi ulang per pool secara adil.");
      return;
    }

    const len = shuffled.length;
    let reqCapacity = 2;
    if (len <= 2) reqCapacity = 2;
    else if (len <= 4) reqCapacity = 4;
    else if (len <= 8) reqCapacity = 8;
    else if (len <= 16) reqCapacity = 16;
    else if (len <= 32) reqCapacity = 32;
    else reqCapacity = 64;

    await handleAutoGenerateBagan(reqCapacity, selectedBaganCategory, selectedBaganGender, newParticipants);
    showToast("🔀 Resufle undian bagan berhasil! Atlet diundi ulang secara adil antar-pool.");
  };

  // Kosongkan Kelas
  const handleKosongkanKelas = async () => {
    if (!checkPermission("mengosongkan data kelas pertandingan")) return;
    sound.playClick();
    if (!selectedBaganCategory) {
      alert("Silakan pilih kelas tanding terlebih dahulu!");
      return;
    }

    const catName = activeCategoryObj?.name || "Kelas Ini";
    if (!confirm(`Apakah Anda yakin ingin mengosongkan semua data atlet dan bagan pertandingan pada ${catName} (${selectedBaganGender})?`)) {
      return;
    }

    const updatedParticipants = participants.filter(
      p => !(p.categoryClassId === selectedBaganCategory && (p.gender || "PUTRA").toUpperCase() === selectedBaganGender)
    );
    const updatedSchedules = schedules.filter(
      m => !(m.categoryClassId === selectedBaganCategory && (m.gender || "PUTRA").toUpperCase() === selectedBaganGender)
    );

    setParticipants(updatedParticipants);
    setSchedules(updatedSchedules);

    try {
      localStorage.setItem("jrz_cached_participants", JSON.stringify(updatedParticipants));
      localStorage.setItem("jrz_cached_schedules", JSON.stringify(updatedSchedules));
      await fetch("/api/tournament/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCategories: categories,
          newParticipants: updatedParticipants,
          newMatches: updatedSchedules
        })
      });
      showToast(`🗑️ Data kelas ${catName} (${selectedBaganGender}) berhasil dikosongkan!`);
    } catch {
      showToast(`Data kelas ${catName} dikosongkan secara lokal.`);
    }
  };

  // Download Template Excel
  const downloadBaganTemplateExcel = () => {
    sound.playClick();
    const templateData = [
      ["NAMA ATLET", "KONTINGEN", "GENDER", "KELAS TANDING", "BERAT BADAN (KG)", "GELANGGANG"],
      ["FAJAR NUGRAHA", "KONTINGEN JAWA BARAT", "PUTRA", "Kelas C", "56.5", "GELANGGANG A"],
      ["EKO WAHYUDI", "KONTINGEN JAWA TIMUR", "PUTRA", "Kelas C", "57.2", "GELANGGANG A"],
      ["MUKHLIS AMIN", "KONTINGEN JAWA TENGAH", "PUTRA", "Kelas C", "58.0", "GELANGGANG A"],
      ["BUDI RAHARJO", "KONTINGEN DKI JAKARTA", "PUTRA", "Kelas C", "57.8", "GELANGGANG A"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Bagan");
    XLSX.writeFile(wb, "Template_Bagan_Tanding.xlsx");
    showToast("📥 Template Excel Bagan berhasil diunduh!");
  };

  // Import Excel File
  const fileInputRef = useRef<HTMLInputElement>(null);
  const triggerFileImport = () => {
    if (!checkPermission("mengimpor data bagan dari Excel")) return;
    sound.playClick();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

        if (rawRows.length < 2) {
          alert("File Excel kosong atau format tidak sesuai!");
          return;
        }

        let idxNama = 0, idxKontingen = 1, idxGender = 2, idxKelas = 3, idxBerat = 4, idxArena = 5;
        const headers = rawRows[0] || [];
        headers.forEach((h: any, i: number) => {
          if (!h) return;
          const label = h.toString().toLowerCase();
          if (label.includes("nama") || label.includes("atlet") || label.includes("atlit")) idxNama = i;
          else if (label.includes("kontingen") || label.includes("club") || label.includes("asal")) idxKontingen = i;
          else if (label.includes("gender") || label.includes("kelamin")) idxGender = i;
          else if (label.includes("kelas")) idxKelas = i;
          else if (label.includes("berat")) idxBerat = i;
          else if (label.includes("gelanggang") || label.includes("arena")) idxArena = i;
        });

        const newParts: any[] = [];
        const newCats: any[] = [];

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || !row[idxNama]) continue;

          const rawNama = row[idxNama]?.toString().trim() || "";
          const rawKontingen = row[idxKontingen]?.toString().trim() || "KONTINGEN";
          const rawGender = row[idxGender]?.toString().trim().toUpperCase() || "PUTRA";
          const cleanGender = (rawGender.includes("PUTRI") || rawGender.includes("PI")) ? "PUTRI" : "PUTRA";
          const rawKelas = row[idxKelas]?.toString().trim() || "Kelas A";
          const rawWeight = Number(row[idxBerat]) || 50;
          const rawArena = row[idxArena]?.toString().trim() || `GELANGGANG ${selectedArena}`;

          const catId = `cat-${rawKelas.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

          if (!newCats.find(c => c.id === catId)) {
            newCats.push({
              id: catId,
              name: rawKelas.toUpperCase(),
              division: "DEWASA",
              minWeight: rawWeight - 2,
              maxWeight: rawWeight + 2
            });
          }

          newParts.push({
            id: `p-excel-${i}-${Date.now().toString().slice(-4)}`,
            name: rawNama.toUpperCase(),
            club: rawKontingen.toUpperCase(),
            gender: cleanGender,
            categoryClassId: catId,
            className: rawKelas,
            weight: rawWeight,
            arena: rawArena
          });
        }

        const mergedCats = [...categories];
        newCats.forEach(nc => {
          if (!mergedCats.some(c => c.id === nc.id)) mergedCats.push(nc);
        });
        const mergedParts = [...participants, ...newParts];

        setCategories(mergedCats);
        setParticipants(mergedParts);
        localStorage.setItem("jrz_cached_categories", JSON.stringify(mergedCats));
        localStorage.setItem("jrz_cached_participants", JSON.stringify(mergedParts));

        // Sinkronkan dan generate bagan otomatis untuk seluruh kelas hasil impor
        autoSyncAndGenerateAllBrackets(selectedArena).catch(console.warn);

        showToast(`🎉 Berhasil mengimpor ${newParts.length} data atlet dari Excel! Bagan pertandingan digenerate otomatis.`);
      } catch (err) {
        console.error(err);
        alert("Gagal membaca file Excel. Pastikan format kolom sesuai dengan template.");
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export Active Bracket to Excel
  const exportBaganToExcel = () => {
    sound.playClick();
    if (currentClassMatches.length === 0) {
      alert("Belum ada data bagan tanding pada kelas ini untuk diekspor!");
      return;
    }

    const catName = activeCategoryObj?.name || selectedBaganCategory;
    const exportData = [
      ["NOMOR PARTAI", "KELAS TANDING", "GENDER", "BABAK / TAHAPAN", "SUDUT MERAH", "KONTINGEN MERAH", "SUDUT BIRU", "KONTINGEN BIRU", "STATUS", "GELANGGANG"]
    ];

    currentClassMatches.forEach(m => {
      exportData.push([
        m.matchNumber || "-",
        catName,
        m.gender || selectedBaganGender,
        m.stage || "-",
        m.fighterRedName || "-",
        m.fighterRedClub || "-",
        m.fighterBlueName || "-",
        m.fighterBlueClub || "-",
        m.status || "BELUM",
        m.arena || `GELANGGANG ${selectedArena}`
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bagan Tanding");
    XLSX.writeFile(wb, `Bagan_${catName.replace(/\s+/g, "_")}_${selectedBaganGender}.xlsx`);
    showToast("📊 Data bagan berhasil diekspor ke Excel!");
  };

  // Draw official logo on PDF
  const drawLogoPdf = (doc: any, x: number, y: number, size: number) => {
    try {
      doc.setDrawColor(74, 24, 122);
      doc.setLineWidth(0.5);
      doc.ellipse(x + size/2, y + size/2, size/2, size/2, "D");
      doc.setFillColor(74, 24, 122);
      doc.ellipse(x + size/2, y + size/2, size/2 - 1, size/2 - 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text("IPSI", x + size/2, y + size/2 + 2.5, { align: "center" });
    } catch {
      // ignore
    }
  };

  // Download Single Class Bracket PDF (A4 Landscape)
  const downloadBaganPdf = () => {
    sound.playClick();
    if (currentClassMatches.length === 0) {
      alert(`⚠️ Bagan Pertandingan Belum Terbentuk: Silakan klik 'GENERATE BAGAN OTOMATIS' terlebih dahulu.`);
      return;
    }

    const catName = activeCategoryObj?.name || selectedBaganCategory;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // Draw header logos
    drawLogoPdf(doc, 15, 10, 14);
    drawLogoPdf(doc, 268, 10, 14);

    // Title
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(eventName.toUpperCase(), 148.5, 14, { align: "center" });

    doc.setFontSize(10);
    const subHeader = `KARTU BAGAN PERTANDINGAN RESMI  |  ${venueName.toUpperCase()} - ${eventDates.toUpperCase()}`;
    doc.text(subHeader, 148.5, 19, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text("PENGURUS BESAR IKATAN PENCAK SILAT INDONESIA", 148.5, 23.5, { align: "center" });

    // Double divider
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(15, 27, 282, 27);
    doc.setLineWidth(0.3);
    doc.line(15, 28.2, 282, 28.2);

    // Category Banner
    doc.setFillColor(235, 235, 240);
    doc.rect(15, 31, 267, 7, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    const schemeText = baganSchemeType === "SINGLE_NO_POOL" ? "(SISTEM GUGUR TUNGGAL / SATU SISI)" : "(DUA SISI / POL A & POL B)";
    doc.text(`BAGAN PERTANDINGAN: ${catName.toUpperCase()} - ${selectedBaganGender} ${schemeText}`, 148.5, 36, { align: "center" });

    // Match boxes
    const sortedMatches = [...currentClassMatches].sort((a, b) => {
      const numA = parseInt(a.matchNumber?.toString().replace(/\D/g, "") || "999");
      const numB = parseInt(b.matchNumber?.toString().replace(/\D/g, "") || "999");
      return numA - numB;
    });

    const maxItems = Math.min(sortedMatches.length, 16);
    sortedMatches.slice(0, maxItems).forEach((m, mIdx) => {
      const col = Math.floor(mIdx / 8);
      const row = mIdx % 8;
      const xPos = 18 + col * 133;
      const yPos = 43 + row * 18.5;

      // Card boundary
      doc.setFillColor(252, 252, 255);
      doc.rect(xPos, yPos, 126, 16.5, "F");
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.3);
      doc.rect(xPos, yPos, 126, 16.5, "S");

      // Partai header
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`${(m.matchNumber || `Partai ${mIdx + 1}`).toUpperCase()} • ${(m.stage || "BABAK").toUpperCase()}`, xPos + 3, yPos + 4);

      // Blue slot
      doc.setFillColor(37, 99, 235);
      doc.rect(xPos + 2, yPos + 5.5, 1.5, 4.5, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      doc.text(`[BIRU] ${(m.fighterBlueName || "MENUNGGU").toUpperCase()}`, xPos + 5.5, yPos + 9);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text(m.fighterBlueClub || "-", xPos + 80, yPos + 9);

      // Red slot
      doc.setFillColor(225, 29, 72);
      doc.rect(xPos + 2, yPos + 10.5, 1.5, 4.5, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(225, 29, 72);
      doc.text(`[MERAH] ${(m.fighterRedName || "MENUNGGU").toUpperCase()}`, xPos + 5.5, yPos + 14);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text(m.fighterRedClub || "-", xPos + 80, yPos + 14);
    });

    // Save
    doc.save(`Kartu_Bagan_${catName.replace(/\s+/g, "_")}_${selectedBaganGender}.pdf`);
    showToast("📄 Kartu Bagan PDF berhasil diunduh!");
  };

  // Download All Brackets Booklet PDF
  const downloadSemuaBaganPdf = () => {
    sound.playClick();
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    let pageCount = 0;
    baganCategoryList.forEach(catItem => {
      const catMatches = schedules.filter(
        m => m.categoryClassId === catItem.id && (m.gender || "PUTRA").toUpperCase() === catItem.gender
      );
      if (catMatches.length === 0) return;

      if (pageCount > 0) doc.addPage("a4", "landscape");
      pageCount++;

      drawLogoPdf(doc, 15, 10, 14);
      drawLogoPdf(doc, 268, 10, 14);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text(eventName.toUpperCase(), 148.5, 14, { align: "center" });

      doc.setFontSize(10);
      const subHeader = `KARTU BAGAN PERTANDINGAN RESMI  |  ${venueName.toUpperCase()} - ${eventDates.toUpperCase()}`;
      doc.text(subHeader, 148.5, 19, { align: "center" });

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text("PENGURUS BESAR IKATAN PENCAK SILAT INDONESIA", 148.5, 23.5, { align: "center" });

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.8);
      doc.line(15, 27, 282, 27);
      doc.setLineWidth(0.3);
      doc.line(15, 28.2, 282, 28.2);

      doc.setFillColor(235, 235, 240);
      doc.rect(15, 31, 267, 7, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(`BAGAN PERTANDINGAN: ${catItem.name.toUpperCase()} - ${catItem.gender.toUpperCase()} (${catItem.division.toUpperCase()})`, 148.5, 36, { align: "center" });

      catMatches.slice(0, 16).forEach((m, mIdx) => {
        const col = Math.floor(mIdx / 8);
        const row = mIdx % 8;
        const xPos = 18 + col * 133;
        const yPos = 43 + row * 18.5;

        doc.setFillColor(252, 252, 255);
        doc.rect(xPos, yPos, 126, 16.5, "F");
        doc.setDrawColor(200, 200, 220);
        doc.setLineWidth(0.3);
        doc.rect(xPos, yPos, 126, 16.5, "S");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`${(m.matchNumber || `Partai ${mIdx + 1}`).toUpperCase()} • ${(m.stage || "BABAK").toUpperCase()}`, xPos + 3, yPos + 4);

        doc.setFillColor(37, 99, 235);
        doc.rect(xPos + 2, yPos + 5.5, 1.5, 4.5, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(37, 99, 235);
        doc.text(`[BIRU] ${(m.fighterBlueName || "MENUNGGU").toUpperCase()}`, xPos + 5.5, yPos + 9);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text(m.fighterBlueClub || "-", xPos + 80, yPos + 9);

        doc.setFillColor(225, 29, 72);
        doc.rect(xPos + 2, yPos + 10.5, 1.5, 4.5, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(225, 29, 72);
        doc.text(`[MERAH] ${(m.fighterRedName || "MENUNGGU").toUpperCase()}`, xPos + 5.5, yPos + 14);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text(m.fighterRedClub || "-", xPos + 80, yPos + 14);
      });
    });

    if (pageCount === 0) {
      alert("Belum ada bagan yang terdaftar untuk diunduh.");
      return;
    }

    doc.save(`Buku_Bagan_Turnamen_Lengkap.pdf`);
    showToast(`📚 Buku Dokumen ${pageCount} Bagan PDF berhasil diunduh!`);
  };

  // Convert current athletes to TournamentBracketView format
  const bracketParticipants: BracketParticipant[] = useMemo(() => {
    return currentClassAthletes.map((a, i) => ({
      id: a.id,
      name: a.name,
      club: a.club || a.contingent,
      contingent: a.club || a.contingent,
      gender: a.gender || selectedBaganGender,
      seed: i + 1,
      weight: a.weight,
      categoryClassId: a.categoryClassId
    }));
  }, [currentClassAthletes, selectedBaganGender]);

  // Convert current matches to TournamentBracketView format
  const bracketMatches: BracketMatch[] = useMemo(() => {
    return currentClassMatches.map(m => ({
      id: m.id,
      matchNumber: m.matchNumber,
      stage: m.stage,
      fighterRedName: m.fighterRedName,
      fighterRedClub: m.fighterRedClub,
      fighterBlueName: m.fighterBlueName,
      fighterBlueClub: m.fighterBlueClub,
      status: m.status,
      arena: m.arena || `GELANGGANG ${selectedArena}`,
      gender: m.gender || selectedBaganGender
    }));
  }, [currentClassMatches, selectedArena, selectedBaganGender]);

  // Calculations for COMPACT (A4 Cetak) View
  const compactViewData = useMemo(() => {
    const athleteCount = currentClassAthletes.length;
    let calculatedCapacity = 2;
    if (athleteCount <= 2) calculatedCapacity = 2;
    else if (athleteCount <= 4) calculatedCapacity = 4;
    else if (athleteCount <= 8) calculatedCapacity = 8;
    else if (athleteCount <= 16) calculatedCapacity = 16;
    else if (athleteCount <= 32) calculatedCapacity = 32;
    else calculatedCapacity = 64;

    const matchRoundNumbers = currentClassMatches.map(m => {
      const matchRoundMatch = m.id?.match(/-r(\d+)-/);
      if (matchRoundMatch) return parseInt(matchRoundMatch[1], 10);
      return 1;
    });
    const maxMatchRound = matchRoundNumbers.length > 0 ? Math.max(...matchRoundNumbers) : 1;
    const expectedRounds = Math.max(1, Math.round(Math.log2(calculatedCapacity)));
    const totalRounds = maxMatchRound > 0 ? Math.max(maxMatchRound, expectedRounds) : expectedRounds;
    const reqCapacity = Math.pow(2, totalRounds);

    const getStageTitle = (r: number, totalR: number) => {
      if (r === totalR) return baganSchemeType === "SINGLE_NO_POOL" ? "FINAL" : "GRAND FINAL";
      if (r === totalR - 1) return baganSchemeType === "SINGLE_NO_POOL" ? "SEMIFINAL" : "FINAL POL A/B";
      if (r === totalR - 2) return "PEREMPAT FINAL";
      if (r === totalR - 3) return "16 BESAR (PENYISIHAN)";
      if (r === totalR - 4) return "32 BESAR (PENYISIHAN)";
      return `BABAK ${r}`;
    };

    return { totalRounds, reqCapacity, getStageTitle };
  }, [currentClassAthletes.length, currentClassMatches, baganSchemeType]);

  return (
    <div className="relative w-full font-sans text-slate-100">
      {/* Hidden File Input for Excel Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls"
        className="hidden"
        onChange={handleExcelFileUpload}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-purple-950 border border-purple-500/60 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-bounce text-xs font-semibold">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT SIDEBAR: KELAS TERDAFTAR & TOOLS */}
        <div className="lg:col-span-3 bg-[#0e0720]/90 border border-purple-900/40 rounded-2xl p-4 flex flex-col gap-3.5 shadow-2xl relative min-h-[480px]">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 rounded-t-2xl"></div>

          {/* Sidebar Header */}
          <div className="border-b border-purple-950/80 pb-2.5 flex items-center justify-between">
            <span className="text-xs font-black uppercase text-purple-200 tracking-wider flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-purple-400" />
              KELAS TERDAFTAR
            </span>
            <span className="text-[8.5px] font-mono font-bold bg-purple-950/80 border border-purple-800/50 px-2 py-0.5 rounded text-purple-300">
              {baganCategoryList.length} KELAS
            </span>
          </div>

          {/* Search box for classes */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-purple-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari kelas tanding..."
              value={searchClassQuery}
              onChange={(e) => setSearchClassQuery(e.target.value)}
              className="w-full bg-[#120727] border border-purple-950/80 focus:border-purple-500/60 text-xs text-white pl-8 pr-2.5 py-2 rounded-xl placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {/* 1. SISTEM KATEGORI USIA (MENU SWITCH ON/OFF MODE PEMASALAN / POOL) */}
          <div className="bg-[#120727] border border-purple-900/60 rounded-xl p-2.5 space-y-2 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-mono font-bold uppercase text-purple-300 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                SISTEM KATEGORI USIA
              </span>
              <span className="text-[7.5px] font-mono text-slate-400">
                ON: Pemasalan • OFF: Pool
              </span>
            </div>

            {availableDivisions.length === 0 ? (
              <div className="text-center py-2.5 text-[9px] text-slate-500 italic">
                [ Belum ada divisi dengan atlet terdaftar ]
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {availableDivisions.map((divKey) => {
                  const isPem = !!divisionPemasalanModes[divKey];
                  const divItem = divisionsWithAthletes.find(d => d.division === divKey);
                  return (
                    <div
                      key={divKey}
                      className={`p-2 rounded-lg border flex flex-col gap-1.5 transition-colors ${
                        isPem 
                          ? "bg-[#1f0e38]/90 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.1)]" 
                          : "bg-[#150a2c] border-purple-900/40 hover:border-purple-700/60"
                      }`}
                    >
                      {/* MENU ON / OFF - HANYA FOCUS DI SISTEM KATEGORI USIA */}
                      <div className="flex items-center justify-between">
                        <span className="text-[7px] font-mono font-bold text-slate-400 uppercase">
                          MODE:
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleDivisionMode(divKey);
                          }}
                          className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded cursor-pointer transition-all border ${
                            isPem
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_6px_rgba(245,158,11,0.2)]"
                              : "bg-slate-900/90 text-purple-300 border-purple-800/40 hover:border-purple-600"
                          }`}
                          title={`Klik untuk ubah sistem ${divKey}: ON = Pemasalan (Pool 4 Besar), OFF = Pool (Sistem Gugur).`}
                        >
                          <span className="text-[7.5px] font-mono font-black uppercase">
                            {isPem ? "ON" : "OFF"}
                          </span>
                          <div className={`w-3.5 h-2 rounded-full relative transition-colors ${
                            isPem ? "bg-amber-400" : "bg-slate-600"
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full bg-white absolute top-0.25 transition-transform ${
                              isPem ? "left-1.75" : "left-0.25"
                            }`} />
                          </div>
                        </button>
                      </div>

                      {/* LABEL DIVISI & STATUS SISTEM */}
                      <div className="flex items-center justify-between border-t border-purple-950/70 pt-1">
                        <div className="min-w-0 pr-1">
                          <span className="text-[8px] font-black text-purple-200 tracking-wider uppercase truncate block" title={divKey}>
                            {divKey}
                          </span>
                          {divItem && (
                            <span className="text-[6.5px] text-slate-400 font-mono">
                              {divItem.count} Atlet
                            </span>
                          )}
                        </div>
                        <span className={`text-[6.5px] font-mono font-black uppercase px-1 py-0.2 rounded shrink-0 ${
                          isPem 
                            ? "text-amber-300 bg-amber-950/80 border border-amber-800/40" 
                            : "text-purple-300 bg-purple-950/80 border border-purple-800/40"
                        }`}>
                          {isPem ? "PEMASALAN" : "POOL"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. MENU DIVISI TERPADU (HANYA MEMFILTER DAFTAR KELAS BER-ATLET TERDAFTAR, TANPA SWITCH ON/OFF) */}
          <div className="bg-[#120727] border border-purple-900/60 rounded-xl p-2.5 space-y-2 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-mono font-bold uppercase text-purple-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                MENU DIVISI TERPADU
              </span>
              <span className="text-[7.5px] font-mono text-slate-400">
                Filter Kelas Ber-Atlet
              </span>
            </div>

            {divisionsWithAthletes.length === 0 ? (
              <div className="text-center py-2 text-[9px] text-slate-500 italic">
                [ Belum ada divisi dengan atlet terdaftar ]
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedDivisionFilter("ALL")}
                  className={`px-2 py-1 rounded-lg text-[8px] font-mono font-bold uppercase transition-all border ${
                    selectedDivisionFilter === "ALL"
                      ? "bg-purple-700 border-purple-400 text-white shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                      : "bg-[#180d30] border-purple-900/50 text-slate-400 hover:text-white hover:border-purple-700"
                  }`}
                >
                  SEMUA ({baganCategoryList.length})
                </button>
                {divisionsWithAthletes.map((item) => {
                  const isSelected = selectedDivisionFilter === item.division;
                  return (
                    <button
                      key={item.division}
                      type="button"
                      onClick={() => setSelectedDivisionFilter(item.division)}
                      className={`px-2 py-1 rounded-lg text-[8px] font-mono font-bold uppercase transition-all border flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-cyan-600/90 border-cyan-400 text-white shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                          : "bg-[#180d30] border-purple-900/50 text-slate-400 hover:text-white hover:border-cyan-600/50"
                      }`}
                    >
                      <span>{item.division}</span>
                      <span className={`px-1 py-0.2 rounded text-[7px] ${
                        isSelected ? "bg-cyan-950 text-cyan-200" : "bg-purple-950/80 text-purple-300"
                      }`}>
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. DAFTAR KELAS TERDAFTAR (HANYA KELAS BER-ATLET TERDAFTAR) */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[38vh] pr-1 scrollbar-thin scrollbar-thumb-purple-950">
            {filteredCategoryList.length === 0 ? (
              <div className="text-center py-8 italic text-[10px] text-slate-500 uppercase tracking-widest bg-[#120727]/40 rounded-xl border border-purple-950/60 p-3">
                [ Tidak ada kelas dengan atlet terdaftar ]
              </div>
            ) : (
              filteredCategoryList.map((catItem) => {
                const isActive = selectedBaganCategory === catItem.id && selectedBaganGender === catItem.gender;
                const isDivPemasalan = isDivisionPemasalan(catItem.division);

                return (
                  <div
                    key={`${catItem.id}_${catItem.gender}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      sound.playClick();
                      setSelectedBaganCategory(catItem.id);
                      setSelectedBaganGender(catItem.gender as any);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        sound.playClick();
                        setSelectedBaganCategory(catItem.id);
                        setSelectedBaganGender(catItem.gender as any);
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer select-none ${
                      isActive
                        ? "bg-[#581c87] border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                        : "bg-[#120727] border-purple-950/60 text-slate-400 hover:text-white hover:border-purple-800/40"
                    }`}
                  >
                    <div className="flex flex-col text-left min-w-0 flex-1 pr-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black tracking-wider uppercase truncate">
                          {catItem.name}
                        </span>
                        {catItem.count > 0 && (
                          <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                            isActive ? "bg-purple-900 text-amber-300" : "bg-purple-950/80 text-purple-300"
                          }`}>
                            {catItem.count} Atlet
                          </span>
                        )}
                      </div>

                      {/* INFORMASI DIVISI & STATUS SISTEM - TANPA SWITCH ON/OFF */}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider block ${
                          isActive ? "text-purple-200" : "text-purple-400"
                        }`}>
                          DIVISI: {catItem.division} • {catItem.gender}
                        </span>
                        <span className={`text-[6.5px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                          isDivPemasalan ? "bg-amber-950/80 text-amber-300 border border-amber-800/40" : "bg-purple-950/80 text-purple-300 border border-purple-800/40"
                        }`}>
                          {isDivPemasalan ? "PEMASALAN" : "POOL"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? "text-purple-200 translate-x-0.5" : "text-purple-600"}`} />
                  </div>
                );
              })
            )}
          </div>

          {/* ACTION TOOLS & EXCEL EXPORT */}
          <div className="flex flex-col gap-2.5 mt-auto pt-3 border-t border-purple-950/80">
            <span className="text-[9px] font-mono font-black text-purple-300 uppercase tracking-wider">
              IMPOR / EKSPOR EXCEL BAGAN
            </span>

            <div className={`grid ${currentUser && !isGuestMode ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
              <button
                onClick={downloadBaganTemplateExcel}
                className="flex items-center justify-center gap-1 bg-[#170c32] hover:bg-purple-900/40 text-purple-200 hover:text-white border border-purple-800/50 py-2.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                title="Unduh Template Excel Format Bagan Tanding"
              >
                <Download className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>TEMPLATE EXCEL</span>
              </button>

              {currentUser && !isGuestMode && (
                <button
                  onClick={triggerFileImport}
                  className="flex items-center justify-center gap-1 bg-[#170c32] hover:bg-purple-900/40 text-purple-200 hover:text-white border border-purple-800/50 py-2.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                  title="Impor Data Atlet/Bagan dari Excel"
                >
                  <Upload className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>IMPOR EXCEL</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportBaganToExcel}
                className="flex items-center justify-center gap-1 bg-[#170c32] hover:bg-purple-900/40 text-purple-200 hover:text-white border border-purple-800/50 py-2.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                title="Ekspor Bagan Kelas Aktif ke Format Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>EKSPOR EXCEL</span>
              </button>

              <button
                onClick={downloadBaganPdf}
                className="flex items-center justify-center gap-1 bg-[#170c32] hover:bg-purple-900/40 text-[#facc15] hover:text-yellow-300 border border-purple-800/50 py-2.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                title="Unduh Kartu Bagan Kelas Ini (A4 Landscape PDF)"
              >
                <FileText className="w-3.5 h-3.5 text-[#facc15] shrink-0" />
                <span>UNDUH PDF</span>
              </button>
            </div>

            <button
              onClick={downloadSemuaBaganPdf}
              className="w-full bg-[#150a2e] hover:bg-[#220f49] border border-purple-800/60 text-purple-200 hover:text-white rounded-xl py-2.5 text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
              title="Unduh Semua Bagan Kelas ke Dalam Satu Dokumen PDF Lengkap"
            >
              <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>UNDUH SEMUA BAGAN PDF</span>
            </button>

            {/* VIEW ENGINE TOGGLE: PRO INTERACTIVE VS A4 CETAK */}
            <div className="flex items-center bg-[#110725] border border-purple-900/60 rounded-xl p-1 gap-1 select-none shadow-inner w-full">
              <button
                onClick={() => {
                  sound.playClick();
                  setBaganViewEngine("INTERACTIVE");
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  baganViewEngine === "INTERACTIVE"
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                    : "text-amber-300 hover:text-amber-100"
                }`}
              >
                <Trophy className="w-3.5 h-3.5 shrink-0" />
                <span>BAGAN PRO</span>
              </button>
              <button
                onClick={() => {
                  sound.playClick();
                  setBaganViewEngine("COMPACT");
                }}
                className={`flex-1 flex items-center justify-center py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  baganViewEngine === "COMPACT"
                    ? "bg-[#9333ea] text-white shadow-[0_0_12px_rgba(147,51,234,0.6)]"
                    : "text-purple-400 hover:text-purple-200"
                }`}
              >
                <span>A4 CETAK</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT MAIN PANEL: VISUAL BRACKET VIEWER */}
        <div className="lg:col-span-9 bg-[#0b0c16]/95 border border-purple-950/60 rounded-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xl relative min-h-[520px]">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between border-b border-purple-950 pb-3 gap-3 flex-wrap xl:flex-nowrap">
            <div className="flex flex-col gap-0.5 min-w-0 shrink-0">
              <span className="text-xs sm:text-sm font-black uppercase text-[#facc15] tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                <Trophy className="w-4 h-4 text-[#facc15] shrink-0" />
                VISUAL BAGAN: {activeCategoryObj?.name || "KELAS TANDING"} {activeCategoryObj?.division || "DEWASA"} {selectedBaganGender}
              </span>
              <span className="text-[8.5px] sm:text-[9px] font-mono font-bold uppercase tracking-widest whitespace-nowrap flex items-center gap-1.5">
                {isCurrentPemasalan ? (
                  <span className="text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    MODE PEMASALAN AKTIF • FORMAT 4 BESAR (SF1, SF2, FINAL & MEDALI JUARA 3 BERSAMA)
                  </span>
                ) : (
                  <span className="text-purple-400/90">
                    BRAKET TANDING SISTEM GUGUR POOL PRESTASI (BAGAN BERDASARKAN KAPASITAS)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-nowrap overflow-x-auto scrollbar-none py-0.5 ml-auto">
              {/* SCHEME PILL TOGGLE OR PEMASALAN BADGE */}
              {isCurrentPemasalan ? (
                <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/50 px-3 py-1.5 rounded-xl shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[9px] font-mono font-black text-amber-300 uppercase tracking-wider">
                    SISTEM PEMASALAN (MAX 4 ATLET)
                  </span>
                </div>
              ) : (
                <div className="flex items-center bg-[#110725] p-1 rounded-xl border border-purple-900/60 shadow-inner">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setBaganSchemeType("DOUBLE_POOL");
                    }}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      baganSchemeType === "DOUBLE_POOL"
                        ? "bg-[#9333ea] text-white shadow-[0_0_12px_rgba(147,51,234,0.6)]"
                        : "text-purple-400 hover:text-purple-200"
                    }`}
                  >
                    DUA SISI (NASIONAL)
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setBaganSchemeType("SINGLE_NO_POOL");
                    }}
                    className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      baganSchemeType === "SINGLE_NO_POOL"
                        ? "bg-[#9333ea] text-white shadow-[0_0_12px_rgba(147,51,234,0.6)]"
                        : "text-purple-400 hover:text-purple-200"
                    }`}
                  >
                    SATU SISI (KLASIK)
                  </button>
                </div>
              )}

              {/* RESUFLE UNDIAN & KOSONGKAN KELAS (Hanya untuk pengguna login / Panitia) */}
              {currentUser && !isGuestMode && (
                <>
                  <button
                    onClick={handleKocakUndian}
                    className="flex items-center gap-1.5 bg-[#1c0d38] hover:bg-[#2c1556] text-purple-200 hover:text-white border border-purple-700/60 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md shrink-0 whitespace-nowrap"
                    title="Resufle / Acak ulang undian pertemuan atlet secara adil"
                  >
                    <Shuffle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>RESUFLE</span>
                  </button>

                  <button
                    onClick={handleKosongkanKelas}
                    className="flex items-center gap-1.5 bg-[#240815] hover:bg-[#380e22] text-rose-400 hover:text-rose-200 border border-rose-900/70 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md shrink-0 whitespace-nowrap"
                    title="Kosongkan seluruh data atlit dan jadwal pada kelas ini"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>KOSONGKAN KELAS</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* BRACKET CANVAS VIEWPORT */}
          <div className="flex-grow overflow-x-auto overflow-y-auto min-h-[480px] max-h-[calc(100vh-230px)] flex flex-col items-center justify-center bg-[#070314]/80 rounded-2xl border border-purple-950/40 p-3 sm:p-4 scrollbar-thin scrollbar-thumb-purple-950 relative">
            
            {/* POOL TABS UNTUK MODE PEMASALAN */}
            {isCurrentPemasalan && pemasalanPools.length > 1 && (
              <div className="flex items-center gap-1.5 p-1 bg-[#120727] rounded-xl border border-purple-900/60 mb-3 overflow-x-auto max-w-full justify-center shrink-0 shadow-md">
                {pemasalanPools.map((p) => (
                  <button
                    key={p.poolNumber}
                    onClick={() => {
                      sound.playClick();
                      setActivePemasalanPoolIndex(p.poolNumber);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      activePemasalanPoolIndex === p.poolNumber
                        ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)] font-black"
                        : "text-purple-300 hover:text-white hover:bg-purple-900/40"
                    }`}
                  >
                    {p.poolTitle} ({p.athletes.length} Atlet)
                  </button>
                ))}
              </div>
            )}

            {currentClassMatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24 text-center my-auto">
                <Trophy className="w-16 h-16 text-purple-600/40" />
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                  {isCurrentPemasalan
                    ? "BELUM ADA DATA BAGAN PEMASALAN UNTUK KELAS INI."
                    : "BELUM ADA DATA BAGAN TANDING UNTUK KELAS INI."}
                </span>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  {isCurrentPemasalan
                    ? `Mode Pemasalan aktif (${activeCategoryObj?.division || "KATEGORI INI"}): Tiap pool dibatasi maksimal 4 atlet (Semifinal 1, Semifinal 2, Final Medali Emas & Perak, serta Juara 3 Bersama).`
                    : "Kapasitas bagan sistem gugur akan dihitung secara otomatis berdasarkan jumlah pesilat yang terdaftar."}
                </p>

                {(!currentUser || isGuestMode) ? (
                  <div className="bg-slate-900/90 border border-purple-900/50 rounded-2xl p-4 text-center max-w-md shadow-lg">
                    <p className="text-xs font-mono font-bold text-slate-200">
                      Bagan pertandingan belum tersedia karena belum ada atlet yang didaftarkan pada kelas ini.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Jadwal partai dan drawing bagan resmi akan otomatis ditampilkan setelah atlet didaftarkan oleh panitia event.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAutoGenerateBagan()}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(147,51,234,0.4)] border-none cursor-pointer flex items-center gap-2 active:scale-95 transition-all"
                  >
                    <Award className="w-4 h-4 text-amber-300" />
                    <span>
                      {isCurrentPemasalan ? "GENERATE BAGAN PEMASALAN OTOMATIS" : "GENERATE BAGAN OTOMATIS"}
                    </span>
                  </button>
                )}
              </div>
            ) : isCurrentPemasalan && baganViewEngine === "INTERACTIVE" ? (
              /* INTERACTIVE PEMASALAN TOURNAMENT ARENA */
              <div className="w-full max-w-5xl flex flex-col gap-4 py-2">
                {(() => {
                  const currentPool = pemasalanPools.find(p => p.poolNumber === activePemasalanPoolIndex) || pemasalanPools[0] || {
                    poolNumber: 1,
                    poolTitle: "POOL 1",
                    athletes: [],
                    matches: []
                  };

                  const poolMatches = currentPool.matches || [];
                  const sfMatches = poolMatches.filter(m => m.stage?.toUpperCase().includes("SEMIFINAL"));
                  const finalMatch = poolMatches.find(m => m.stage?.toUpperCase().includes("FINAL"));

                  // Podium calculations
                  const goldWinner = finalMatch?.winner === "RED" 
                    ? { name: finalMatch.fighterRedName, club: finalMatch.fighterRedClub }
                    : finalMatch?.winner === "BLUE"
                    ? { name: finalMatch.fighterBlueName, club: finalMatch.fighterBlueClub }
                    : null;

                  const silverWinner = finalMatch?.winner === "RED"
                    ? { name: finalMatch.fighterBlueName, club: finalMatch.fighterBlueClub }
                    : finalMatch?.winner === "BLUE"
                    ? { name: finalMatch.fighterRedName, club: finalMatch.fighterRedClub }
                    : null;

                  const bronze1 = sfMatches[0]?.winner === "RED"
                    ? { name: sfMatches[0].fighterBlueName, club: sfMatches[0].fighterBlueClub }
                    : sfMatches[0]?.winner === "BLUE"
                    ? { name: sfMatches[0].fighterRedName, club: sfMatches[0].fighterRedClub }
                    : null;

                  const bronze2 = sfMatches[1]?.winner === "RED"
                    ? { name: sfMatches[1].fighterBlueName, club: sfMatches[1].fighterBlueClub }
                    : sfMatches[1]?.winner === "BLUE"
                    ? { name: sfMatches[1].fighterRedName, club: sfMatches[1].fighterRedClub }
                    : null;

                  return (
                    <div className="flex flex-col gap-4 w-full">
                      {/* Arena Header */}
                      <div className="bg-gradient-to-r from-[#170a36] via-[#240e4f] to-[#170a36] border border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-black">
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                              <span>{currentPool.poolTitle}</span>
                              <span className="text-purple-300">•</span>
                              <span className="text-white">{activeCategoryObj?.name || "KELAS TANDING"}</span>
                              <span className="text-purple-300">•</span>
                              <span className="text-amber-400">{selectedBaganGender}</span>
                            </div>
                            <span className="text-[9px] font-mono text-purple-300 uppercase">
                              FORMAT 4 BESAR PEMASALAN (SEMIFINAL 1, SEMIFINAL 2, FINAL & JUARA 3 BERSAMA)
                            </span>
                          </div>
                        </div>

                        <span className="text-[9.5px] font-mono font-bold bg-[#110725] text-purple-300 px-3 py-1.5 rounded-xl border border-purple-800/60">
                          {currentPool.athletes.length} PESILAT
                        </span>
                      </div>

                      {/* Tournament Grid (Semifinals -> Final -> Podium) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                        {/* COLUMN 1: SEMIFINALS */}
                        <div className="bg-[#120727]/90 border border-purple-900/60 rounded-2xl p-3.5 flex flex-col gap-3">
                          <div className="bg-purple-950/80 text-purple-200 border border-purple-800/60 rounded-xl py-1.5 px-3 text-center text-[9.5px] font-black uppercase tracking-wider shadow">
                            BABAK SEMIFINAL (2 PARTAI)
                          </div>

                          <div className="flex flex-col gap-3 justify-around flex-grow">
                            {sfMatches.length === 0 ? (
                              <div className="text-center py-8 text-[10px] text-slate-500 italic">
                                Belum ada jadwal semifinal pada pool ini
                              </div>
                            ) : (
                              sfMatches.map((sf, idx) => {
                                const isFinished = sf.status === "SELESAI";
                                const isOngoing = sf.status === "BERLANGSUNG";
                                return (
                                  <div
                                    key={sf.id}
                                    onClick={() => {
                                      if (currentUser && onActivateMatch) onActivateMatch(sf);
                                    }}
                                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                      isOngoing
                                        ? "bg-[#27134d] border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                        : isFinished
                                        ? "bg-[#180b33] border-emerald-500/40"
                                        : "bg-[#14082c] border-purple-950 hover:border-purple-700/60"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-purple-950/80">
                                      <span className="text-[8px] font-mono font-bold text-amber-300 uppercase">
                                        {sf.matchNumber || `Partai SF ${idx + 1}`}
                                      </span>
                                      <span className={`text-[7px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                                        isOngoing ? "bg-amber-500 text-slate-950 animate-pulse" : isFinished ? "bg-emerald-950 text-emerald-300" : "bg-purple-950 text-purple-400"
                                      }`}>
                                        {sf.status || "BELUM"}
                                      </span>
                                    </div>

                                    {/* Sudut Biru */}
                                    <div className={`flex items-center justify-between p-1.5 rounded-lg mb-1 ${
                                      sf.winner === "BLUE" ? "bg-blue-600/30 border border-blue-500" : "bg-blue-950/40"
                                    }`}>
                                      <div className="min-w-0 pr-1">
                                        <div className="text-[8.5px] font-black text-blue-200 truncate uppercase">
                                          {sf.fighterBlueName || "SUDUT BIRU"}
                                        </div>
                                        <div className="text-[7px] text-blue-400 font-mono truncate uppercase">
                                          {sf.fighterBlueClub || "-"}
                                        </div>
                                      </div>
                                      {sf.winner === "BLUE" && (
                                        <span className="text-[7.5px] font-black bg-blue-500 text-white px-1.5 py-0.2 rounded shrink-0">MENANG</span>
                                      )}
                                    </div>

                                    {/* Sudut Merah */}
                                    <div className={`flex items-center justify-between p-1.5 rounded-lg ${
                                      sf.winner === "RED" ? "bg-red-600/30 border border-red-500" : "bg-red-950/40"
                                    }`}>
                                      <div className="min-w-0 pr-1">
                                        <div className="text-[8.5px] font-black text-red-200 truncate uppercase">
                                          {sf.fighterRedName || "SUDUT MERAH"}
                                        </div>
                                        <div className="text-[7px] text-red-400 font-mono truncate uppercase">
                                          {sf.fighterRedClub || "-"}
                                        </div>
                                      </div>
                                      {sf.winner === "RED" && (
                                        <span className="text-[7.5px] font-black bg-red-500 text-white px-1.5 py-0.2 rounded shrink-0">MENANG</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* COLUMN 2: FINAL EMAS & PERAK */}
                        <div className="bg-[#120727]/90 border border-amber-900/40 rounded-2xl p-3.5 flex flex-col gap-3">
                          <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 rounded-xl py-1.5 px-3 text-center text-[9.5px] font-black uppercase tracking-wider shadow">
                            BABAK FINAL (MEDALI EMAS & PERAK)
                          </div>

                          <div className="flex flex-col justify-center flex-grow">
                            {finalMatch ? (
                              <div
                                onClick={() => {
                                  if (currentUser && onActivateMatch) onActivateMatch(finalMatch);
                                }}
                                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                                  finalMatch.status === "BERLANGSUNG"
                                    ? "bg-[#2d1704] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                                    : finalMatch.status === "SELESAI"
                                    ? "bg-[#180b33] border-emerald-500/50"
                                    : "bg-[#170a2f] border-amber-500/30 hover:border-amber-400/60"
                                }`}
                              >
                                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-purple-950">
                                  <span className="text-[8.5px] font-mono font-black text-[#facc15] uppercase">
                                    {finalMatch.matchNumber || "Partai Final"}
                                  </span>
                                  <span className={`text-[7.5px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                                    finalMatch.status === "BERLANGSUNG" ? "bg-amber-500 text-slate-950 animate-pulse" : finalMatch.status === "SELESAI" ? "bg-emerald-950 text-emerald-300" : "bg-purple-950 text-purple-400"
                                  }`}>
                                    {finalMatch.status || "BELUM"}
                                  </span>
                                </div>

                                {/* Sudut Biru */}
                                <div className={`flex items-center justify-between p-2 rounded-lg mb-1.5 ${
                                  finalMatch.winner === "BLUE" ? "bg-blue-600/30 border border-blue-500" : "bg-blue-950/40"
                                }`}>
                                  <div className="min-w-0 pr-1">
                                    <div className="text-[9px] font-black text-blue-200 truncate uppercase">
                                      {finalMatch.fighterBlueName || "PEMENANG SF 1"}
                                    </div>
                                    <div className="text-[7.5px] text-blue-400 font-mono truncate uppercase">
                                      {finalMatch.fighterBlueClub || "-"}
                                    </div>
                                  </div>
                                  {finalMatch.winner === "BLUE" && (
                                    <span className="text-[8px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded shrink-0 shadow">🥇 JUARA 1</span>
                                  )}
                                </div>

                                {/* Sudut Merah */}
                                <div className={`flex items-center justify-between p-2 rounded-lg ${
                                  finalMatch.winner === "RED" ? "bg-red-600/30 border border-red-500" : "bg-red-950/40"
                                }`}>
                                  <div className="min-w-0 pr-1">
                                    <div className="text-[9px] font-black text-red-200 truncate uppercase">
                                      {finalMatch.fighterRedName || "PEMENANG SF 2"}
                                    </div>
                                    <div className="text-[7.5px] text-red-400 font-mono truncate uppercase">
                                      {finalMatch.fighterRedClub || "-"}
                                    </div>
                                  </div>
                                  {finalMatch.winner === "RED" && (
                                    <span className="text-[8px] font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded shrink-0 shadow">🥇 JUARA 1</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-[10px] text-slate-500 italic">
                                Belum ada partai final
                              </div>
                            )}
                          </div>
                        </div>

                        {/* COLUMN 3: PODIUM RESMI PEMASALAN */}
                        <div className="bg-[#120727]/90 border border-purple-900/60 rounded-2xl p-3.5 flex flex-col gap-2.5">
                          <div className="bg-purple-950/80 text-purple-200 border border-purple-800/60 rounded-xl py-1.5 px-3 text-center text-[9.5px] font-black uppercase tracking-wider shadow">
                            PODIUM HASIL MEDALI {currentPool.poolTitle}
                          </div>

                          <div className="flex flex-col gap-2 justify-around flex-grow">
                            {/* EMAS */}
                            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/50 flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shrink-0 shadow">
                                🥇
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[7.5px] font-mono font-bold text-amber-300 uppercase">JUARA 1 (MEDALI EMAS)</div>
                                <div className="text-[9px] font-black text-white truncate uppercase">
                                  {goldWinner ? goldWinner.name : "MENUNGGU FINAL"}
                                </div>
                                <div className="text-[7px] text-slate-400 font-mono truncate uppercase">
                                  {goldWinner ? goldWinner.club : "-"}
                                </div>
                              </div>
                            </div>

                            {/* PERAK */}
                            <div className="p-2 rounded-xl bg-slate-300/10 border border-slate-400/40 flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-slate-300 text-slate-950 font-black flex items-center justify-center text-xs shrink-0 shadow">
                                🥈
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[7.5px] font-mono font-bold text-slate-300 uppercase">JUARA 2 (MEDALI PERAK)</div>
                                <div className="text-[9px] font-black text-white truncate uppercase">
                                  {silverWinner ? silverWinner.name : "MENUNGGU FINAL"}
                                </div>
                                <div className="text-[7px] text-slate-400 font-mono truncate uppercase">
                                  {silverWinner ? silverWinner.club : "-"}
                                </div>
                              </div>
                            </div>

                            {/* PERUNGGU 1 */}
                            <div className="p-2 rounded-xl bg-amber-700/15 border border-amber-700/40 flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-amber-700 text-white font-black flex items-center justify-center text-xs shrink-0 shadow">
                                🥉
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[7.5px] font-mono font-bold text-amber-400 uppercase">JUARA 3 BERSAMA (PERUNGGU)</div>
                                <div className="text-[9px] font-black text-white truncate uppercase">
                                  {bronze1 ? bronze1.name : (sfMatches[0] ? "KALAH SEMIFINAL 1" : "-")}
                                </div>
                                <div className="text-[7px] text-slate-400 font-mono truncate uppercase">
                                  {bronze1 ? bronze1.club : "-"}
                                </div>
                              </div>
                            </div>

                            {/* PERUNGGU 2 */}
                            <div className="p-2 rounded-xl bg-amber-700/15 border border-amber-700/40 flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-amber-700 text-white font-black flex items-center justify-center text-xs shrink-0 shadow">
                                🥉
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[7.5px] font-mono font-bold text-amber-400 uppercase">JUARA 3 BERSAMA (PERUNGGU)</div>
                                <div className="text-[9px] font-black text-white truncate uppercase">
                                  {bronze2 ? bronze2.name : (sfMatches[1] ? "KALAH SEMIFINAL 2" : "-")}
                                </div>
                                <div className="text-[7px] text-slate-400 font-mono truncate uppercase">
                                  {bronze2 ? bronze2.club : "-"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : baganViewEngine === "INTERACTIVE" ? (
              <TournamentBracketView
                participants={bracketParticipants}
                matches={bracketMatches}
                categoryName={activeCategoryObj?.name || "Kategori Tanding"}
                categoryClassId={selectedBaganCategory}
                gender={selectedBaganGender}
                poolScheme={baganSchemeType}
                arenaName={`GELANGGANG ${selectedArena}`}
                className="w-full min-h-[640px] border-none shadow-none bg-transparent"
                onSelectMatch={currentUser && onActivateMatch ? onActivateMatch : undefined}
              />
            ) : (
              /* COMPACT / A4 CETAK VIEW (Official Diagram Tree) */
              <div className="w-full h-full flex flex-col items-center">
                {/* Zoom Controls for Compact View */}
                <div className="flex items-center gap-2 bg-[#120727] border border-purple-900/60 rounded-xl px-3 py-1.5 mb-3 self-end shadow-md">
                  <span className="text-[9px] font-mono text-slate-400 uppercase font-bold">Skala Zoom:</span>
                  <button
                    onClick={() => setBaganScale(prev => Math.max(0.6, prev - 0.1))}
                    className="p-1 rounded bg-[#1f0b3d] hover:bg-purple-800 text-purple-300 cursor-pointer"
                    title="Perkecil"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono font-bold text-white min-w-[36px] text-center">
                    {Math.round(baganScale * 100)}%
                  </span>
                  <button
                    onClick={() => setBaganScale(prev => Math.min(1.6, prev + 0.1))}
                    className="p-1 rounded bg-[#1f0b3d] hover:bg-purple-800 text-purple-300 cursor-pointer"
                    title="Perbesar"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setBaganScale(1.0)}
                    className="p-1 rounded bg-[#1f0b3d] hover:bg-purple-800 text-purple-300 cursor-pointer ml-1"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="w-full overflow-auto flex justify-center pb-8">
                  <div
                    style={{
                      transform: `scale(${baganScale})`,
                      transformOrigin: "top center",
                      transition: "transform 0.15s ease-out"
                    }}
                    className="flex items-stretch justify-center p-2 min-w-[850px] shrink-0"
                  >
                    {Array.from({ length: compactViewData.totalRounds }).map((_, rIdx) => {
                      const roundNum = rIdx + 1;
                      const matchesInThisRound = compactViewData.reqCapacity / Math.pow(2, roundNum);
                      const nextMatchesCount = compactViewData.reqCapacity / Math.pow(2, roundNum + 1);
                      const stageTitle = compactViewData.getStageTitle(roundNum, compactViewData.totalRounds);

                      return (
                        <React.Fragment key={roundNum}>
                          {/* Round Matches Column */}
                          <div className="flex flex-col gap-4 items-center min-w-[170px] max-w-[185px]">
                            {/* Solid Header Badge */}
                            <div className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[10px] uppercase py-2 px-3 rounded-xl text-center tracking-wider shadow-md select-none">
                              {stageTitle}
                            </div>

                            {/* Match cards in this round */}
                            <div className="flex flex-col justify-around h-[680px] w-full py-2">
                              {Array.from({ length: matchesInThisRound }).map((_, mIdx) => {
                                const m = currentClassMatches.find(x =>
                                  x.id === `m-${selectedBaganCategory}-${selectedBaganGender}-r${roundNum}-${mIdx}` ||
                                  (x.id?.includes(`-r${roundNum}-${mIdx}`) && x.categoryClassId === selectedBaganCategory)
                                );

                                let fighterTopName = "-";
                                let fighterTopClub = "-";
                                let fighterBottomName = "-";
                                let fighterBottomClub = "-";
                                let matchNumDisplay = "PARTAI -";

                                if (m) {
                                  const rawNum = m.matchNumber ? m.matchNumber.toString().replace(/Partai\s*/i, "").trim() : "";
                                  matchNumDisplay = rawNum ? `PARTAI ${rawNum}` : (m.stage ? m.stage.toUpperCase() : "PARTAI -");

                                  if (m.fighterBlueId?.startsWith("winner-")) {
                                    const refM = currentClassMatches.find(x => x.id === m.fighterBlueId.replace("winner-", ""));
                                    fighterTopName = refM?.matchNumber ? `PEMENANG ${refM.matchNumber.replace(/Partai/i, "PTY").toUpperCase()}` : "PEMENANG";
                                  } else if (m.fighterBlueId === "BYE" || !m.fighterBlueId) {
                                    fighterTopName = "-";
                                  } else {
                                    const p = participants.find(part => part.id === m.fighterBlueId);
                                    fighterTopName = (p?.name || m.fighterBlueName || "-").toUpperCase();
                                    fighterTopClub = (p?.club || m.fighterBlueClub || "-").toUpperCase();
                                  }

                                  if (m.fighterRedId?.startsWith("winner-")) {
                                    const refM = currentClassMatches.find(x => x.id === m.fighterRedId.replace("winner-", ""));
                                    fighterBottomName = refM?.matchNumber ? `PEMENANG ${refM.matchNumber.replace(/Partai/i, "PTY").toUpperCase()}` : "PEMENANG";
                                  } else if (m.fighterRedId === "BYE" || !m.fighterRedId) {
                                    fighterBottomName = "-";
                                  } else {
                                    const p = participants.find(part => part.id === m.fighterRedId);
                                    fighterBottomName = (p?.name || m.fighterRedName || "-").toUpperCase();
                                    fighterBottomClub = (p?.club || m.fighterRedClub || "-").toUpperCase();
                                  }
                                }

                                return (
                                  <div
                                    key={mIdx}
                                    onClick={() => {
                                      if (m && currentUser && onActivateMatch) {
                                        onActivateMatch(m);
                                      }
                                    }}
                                    className={`w-full relative my-auto group select-none transition-all ${
                                      currentUser ? "cursor-pointer" : ""
                                    }`}
                                  >
                                    {/* Floating match badge */}
                                    <div className="absolute top-0 left-2.5 -translate-y-1/2 z-20 pointer-events-none">
                                      <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#05091a] border border-[#2d4285] text-[7.5px] font-mono font-black text-slate-200 tracking-wider shadow-md">
                                        {matchNumDisplay}
                                      </div>
                                    </div>

                                    {/* Card container */}
                                    <div className="w-full bg-[#060a1d] border border-[#1b2854] group-hover:border-[#3854a8] rounded-xl overflow-hidden shadow-lg transition-all flex flex-col relative">
                                      {/* Top Fighter (Blue Corner) */}
                                      <div className="flex items-stretch justify-between min-h-[30px] px-2.5 pt-2 pb-1">
                                        <div className="flex flex-col justify-center min-w-0 flex-1 pr-1.5">
                                          <span className="text-[10px] font-black text-white uppercase tracking-wide truncate leading-tight">
                                            {fighterTopName}
                                          </span>
                                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider truncate leading-tight mt-0.5">
                                            {fighterTopClub}
                                          </span>
                                        </div>
                                        <div className="w-1.5 bg-[#2563eb] rounded-tr-md rounded-br-sm self-stretch shrink-0" />
                                      </div>

                                      <div className="h-[1px] bg-[#1e293b] w-full" />

                                      {/* Bottom Fighter (Red Corner) */}
                                      <div className="flex items-stretch justify-between min-h-[30px] px-2.5 pt-1 pb-2">
                                        <div className="flex flex-col justify-center min-w-0 flex-1 pr-1.5">
                                          <span className="text-[10px] font-black text-white uppercase tracking-wide truncate leading-tight">
                                            {fighterBottomName}
                                          </span>
                                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider truncate leading-tight mt-0.5">
                                            {fighterBottomClub}
                                          </span>
                                        </div>
                                        <div className="w-1.5 bg-[#dc2626] rounded-br-md rounded-tr-sm self-stretch shrink-0" />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Connecting lines between rounds */}
                          {roundNum < compactViewData.totalRounds && (
                            <div className="flex flex-col gap-4 items-center w-8 shrink-0 select-none">
                              <div className="w-full py-2 px-3 opacity-0 text-[10px] leading-tight select-none pointer-events-none">
                                &nbsp;
                              </div>
                              <div className="flex flex-col justify-around h-[680px] w-full py-2 relative">
                                {Array.from({ length: nextMatchesCount }).map((_, pairIdx) => (
                                  <div key={pairIdx} className="flex-1 flex items-center relative">
                                    <div className="absolute top-[25%] left-0 right-1/2 h-[25%] border-r-2 border-t-2 border-[#d97706]" />
                                    <div className="absolute bottom-[25%] left-0 right-1/2 h-[25%] border-r-2 border-b-2 border-[#d97706]" />
                                    <div className="absolute top-1/2 left-1/2 right-0 h-0 border-t-2 border-[#d97706]" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
