import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Users, 
  Scale, 
  GitBranch, 
  Calendar, 
  Medal, 
  Search, 
  Plus, 
  Filter, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Check, 
  X, 
  FileSpreadsheet, 
  Printer, 
  RefreshCw,
  Trophy,
  ShieldAlert,
  UserCheck,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  MapPin,
  Building,
  Award,
  Play,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Lock,
  Info,
  FileText,
  Layers
} from "lucide-react";
import { jsPDF } from "jspdf";
import { 
  AthleteRecord, 
  ContingentMedal,
  AthleteAgeCategory,
  SeniSubCategory,
  MedalClassificationType
} from "../../types/portal";
import { 
  SILAT_AGE_DIVISIONS, 
  SILAT_SENI_CATEGORIES, 
  SILAT_REGIONS, 
  SILAT_PERGURUAN, 
  SILAT_TANDING_CLASSES,
  SILAT_AVATAR_PRESETS
} from "../../utils/silatStandards";
import { TournamentBracketView, BracketParticipant, BracketMatch } from "../TournamentBracketView";
import { BaganTandingView } from "./BaganTandingView";
import { sound } from "../../utils/sound";
import * as XLSX from "xlsx";
import { MatchStatus } from "../../types";
import { rtdbScoringEngine } from "../../services/rtdbScoringEngine";
import { offlineEngine } from "../../utils/offlineEngine";
import { autoSyncAndGenerateAllBrackets } from "../../utils/baganGenerator";

interface AdministrasiPageProps {
  onNavigateToMatch?: (matchId: string, matchData?: any) => void;
  onNavigateToCategory?: (category: "TANDING" | "SENI", matchData?: any) => void;
  selectedArena: string;
  initialSubTab?: "ATLET" | "TIMBANG" | "BAGAN" | "JADWAL" | "MEDALI";
  onSubTabChange?: (subTab: "ATLET" | "TIMBANG" | "BAGAN" | "JADWAL" | "MEDALI") => void;
  currentUser?: any;
  onOpenSignModal?: (message?: string, isWarning?: boolean) => void;
}

export function AdministrasiPage({ 
  onNavigateToMatch, 
  onNavigateToCategory,
  selectedArena,
  initialSubTab,
  onSubTabChange,
  currentUser,
  onOpenSignModal
}: AdministrasiPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<"ATLET" | "TIMBANG" | "BAGAN" | "JADWAL" | "MEDALI">(() => {
    if (!currentUser) {
      return (initialSubTab === "JADWAL") ? "JADWAL" : "BAGAN";
    }
    return initialSubTab || "ATLET";
  });

  const [guestViewTab, setGuestViewTab] = useState<"JADWAL" | "BAGAN" | "SEMUA">(
    initialSubTab === "JADWAL" ? "JADWAL" : initialSubTab === "BAGAN" ? "BAGAN" : "SEMUA"
  );

  useEffect(() => {
    if (initialSubTab === "JADWAL") setGuestViewTab("JADWAL");
    else if (initialSubTab === "BAGAN") setGuestViewTab("BAGAN");
  }, [initialSubTab]);

  // Auto-sync bagan secara otomatis jika ada atlet yang terdaftar
  useEffect(() => {
    try {
      const savedSch = localStorage.getItem("jrz_cached_schedules");
      const savedAthletes = localStorage.getItem("jrz_portal_athletes");
      const schList = savedSch ? JSON.parse(savedSch) : [];
      const athList = savedAthletes ? JSON.parse(savedAthletes) : [];
      if (athList.length > 0 && schList.length === 0) {
        autoSyncAndGenerateAllBrackets(selectedArena).catch(console.warn);
      }
    } catch (e) {}
  }, [selectedArena]);

  useEffect(() => {
    if (!currentUser && activeSubTab !== "BAGAN" && activeSubTab !== "JADWAL") {
      setActiveSubTab("BAGAN");
      if (onSubTabChange) {
        onSubTabChange("BAGAN");
      }
    }
  }, [currentUser, activeSubTab, onSubTabChange]);

  useEffect(() => {
    if (!currentUser && initialSubTab !== "BAGAN" && initialSubTab !== "JADWAL") {
      setActiveSubTab("BAGAN");
      return;
    }
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab, currentUser]);

  // Smooth scroll for non-signed users when choosing Bagan or Jadwal
  useEffect(() => {
    if (!currentUser) {
      const targetId = initialSubTab === "BAGAN" ? "bagan-pertandingan" : "jadwal-pertandingan";
      const timer = setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialSubTab, currentUser]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContingent, setSelectedContingent] = useState("ALL");
  const [selectedGender, setSelectedGender] = useState<"ALL" | "PUTRA" | "PUTRI">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | "TANDING" | "SENI">("ALL");
  const [selectedClassFilter, setSelectedClassFilter] = useState("ALL");

  // State Delete Atlet & Bersihkan Semua
  const [athleteToDelete, setAthleteToDelete] = useState<AthleteRecord | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Klasemen Medali Classification: KONTINGEN | WILAYAH | PERGURUAN
  const [medalClassification, setMedalClassification] = useState<MedalClassificationType>("KONTINGEN");

  // Athlete Records State
  const [athletes, setAthletes] = useState<AthleteRecord[]>(() => {
    const saved = localStorage.getItem("jrz_portal_athletes");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [
      {
        id: "atl-1",
        name: "MUHAMMAD RIZKY FIRMANSYAH",
        contingent: "KONTINGEN JAWA BARAT",
        region: "Jawa Barat",
        schoolOrClub: "Tapak Suci Putera Muhammadiyah",
        ageCategory: "DEWASA",
        gender: "PUTRA",
        category: "TANDING",
        classCategory: "Tanding Kelas A (45 - 50 kg) Putra (Dewasa)",
        weightTarget: 48.5,
        actualWeight: 48.2,
        weighInStatus: "SAH",
        verifiedDocuments: true,
        arena: "A",
        phone: "0812-8899-1001",
        photoUrl: SILAT_AVATAR_PRESETS.PUTRA,
        nik: "32710219980001"
      },
      {
        id: "atl-2",
        name: "BAGAS PRASETYA NUGRAHA",
        contingent: "KONTINGEN JAWA TIMUR",
        region: "Jawa Timur",
        schoolOrClub: "Persaudaraan Setia Hati Terate (PSHT)",
        ageCategory: "DEWASA",
        gender: "PUTRA",
        category: "TANDING",
        classCategory: "Tanding Kelas A (45 - 50 kg) Putra (Dewasa)",
        weightTarget: 49.0,
        actualWeight: 48.9,
        weighInStatus: "SAH",
        verifiedDocuments: true,
        arena: "A",
        phone: "0813-2234-9988",
        photoUrl: SILAT_AVATAR_PRESETS.PUTRA,
        nik: "35780219970002"
      },
      {
        id: "atl-3",
        name: "DIMAS SATRIA PAMUNGKAS",
        contingent: "KONTINGEN DKI JAKARTA",
        region: "DKI Jakarta",
        schoolOrClub: "PPS Betako Merpati Putih",
        ageCategory: "DEWASA",
        gender: "PUTRA",
        category: "TANDING",
        classCategory: "Tanding Kelas B (50 - 55 kg) Putra (Dewasa)",
        weightTarget: 53.5,
        actualWeight: 53.4,
        weighInStatus: "SAH",
        verifiedDocuments: true,
        arena: "A",
        phone: "0811-9876-5432",
        photoUrl: SILAT_AVATAR_PRESETS.PUTRA,
        nik: "31740219990003"
      },
      {
        id: "atl-4",
        name: "AHMAD FAUZI AL-KAUTSAR",
        contingent: "KONTINGEN JAWA TENGAH",
        region: "Jawa Tengah",
        schoolOrClub: "Pencak Silat Nahdlatul Ulama Pagar Nusa",
        ageCategory: "DEWASA",
        gender: "PUTRA",
        category: "TANDING",
        classCategory: "Tanding Kelas B (50 - 55 kg) Putra (Dewasa)",
        weightTarget: 54.0,
        actualWeight: 54.2,
        weighInStatus: "SAH",
        verifiedDocuments: true,
        arena: "B",
        phone: "0857-1122-3344",
        photoUrl: SILAT_AVATAR_PRESETS.PUTRA,
        nik: "33740219990004"
      },
      {
        id: "atl-5",
        name: "SITI NUR HALIZA",
        contingent: "KONTINGEN DI YOGYAKARTA",
        region: "DI Yogyakarta",
        schoolOrClub: "Keluarga Silat Nasional Indonesia Perisai Diri",
        ageCategory: "DEWASA",
        gender: "PUTRI",
        category: "TANDING",
        classCategory: "Tanding Kelas A (45 - 50 kg) Putri (Dewasa)",
        weightTarget: 47.0,
        actualWeight: 46.8,
        weighInStatus: "SAH",
        verifiedDocuments: true,
        arena: "B",
        phone: "0821-4567-8901",
        photoUrl: SILAT_AVATAR_PRESETS.PUTRI,
        nik: "34710220010005"
      },
      {
        id: "atl-6",
        name: "DEWI RATNASARI",
        contingent: "KONTINGEN BALI",
        region: "Bali",
        schoolOrClub: "Bima Suci",
        ageCategory: "DEWASA",
        gender: "PUTRI",
        category: "TANDING",
        classCategory: "Tanding Kelas A (45 - 50 kg) Putri (Dewasa)",
        weightTarget: 48.0,
        actualWeight: 49.3,
        weighInStatus: "OVERWEIGHT",
        verifiedDocuments: false,
        arena: "B",
        phone: "0878-9900-1122",
        photoUrl: SILAT_AVATAR_PRESETS.PUTRI,
        nik: "51710220010006"
      },
      {
        id: "atl-7",
        name: "ARYA KUSUMA WIJAYA",
        contingent: "KONTINGEN JAWA BARAT",
        region: "Jawa Barat",
        schoolOrClub: "Tapak Suci Putera Muhammadiyah",
        ageCategory: "DEWASA",
        gender: "PUTRA",
        category: "SENI",
        seniSubCategory: "TUNGGAL_BAKU",
        classCategory: "Seni Tunggal Baku Putra (Dewasa)",
        weightTarget: 60.0,
        actualWeight: 59.5,
        weighInStatus: "SAH",
        verifiedDocuments: true,
        arena: "A",
        phone: "0812-7788-9900",
        photoUrl: SILAT_AVATAR_PRESETS.PUTRA,
        nik: "32710219980007"
      },
      {
        id: "atl-8",
        name: "LUTHFI HAKIM & TIM REGU",
        contingent: "KONTINGEN BANTEN",
        region: "Banten",
        schoolOrClub: "IKSPI Kera Sakti",
        ageCategory: "DEWASA",
        gender: "PUTRA",
        category: "SENI",
        seniSubCategory: "REGU",
        classCategory: "Seni Regu Putra (Dewasa)",
        weightTarget: 65.0,
        actualWeight: 64.8,
        weighInStatus: "SAH",
        verifiedDocuments: true,
        arena: "A",
        phone: "0819-0011-2233",
        photoUrl: SILAT_AVATAR_PRESETS.PUTRA,
        nik: "36710219970008"
      }
    ];
  });

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("jrz_portal_athletes", JSON.stringify(athletes));
    } catch (e) { /* ignore */ }
  }, [athletes]);

  // Dynamic Tournament Matches Schedules State
  const [schedules, setSchedules] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("jrz_cached_schedules");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const fetchSchedules = async () => {
    try {
      const res = await fetch("/api/matches-schedule");
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
        try { localStorage.setItem("jrz_cached_schedules", JSON.stringify(data)); } catch (e) {}
      }
    } catch (e) {
      // offline fallback
    }
  };

  useEffect(() => {
    fetchSchedules();
    const handleSync = () => {
      fetchSchedules();
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

  // Schedule PDF Download Overlay States (Identik dengan Kontrol Partai Kategori Tanding Panel Sekretaris)
  const [showScheduleDownloadOverlay, setShowScheduleDownloadOverlay] = useState(false);
  const [overlaySelectedStage, setOverlaySelectedStage] = useState<string>("ALL");
  const [overlaySelectedGelanggang, setOverlaySelectedGelanggang] = useState<string>("ALL");

  // Modal Add Athlete State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAthleteName, setNewAthleteName] = useState("");
  const [newNik, setNewNik] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState<string>("");
  
  // Wilayah, Perguruan & Kontingen
  const [newRegion, setNewRegion] = useState(SILAT_REGIONS[0]); // Jawa Barat
  const [newPerguruan, setNewPerguruan] = useState(SILAT_PERGURUAN[0]); // Tapak Suci
  const [newContingent, setNewContingent] = useState("KONTINGEN JAWA BARAT");
  
  // Kategori, Usia, Gender
  const [newAgeCategory, setNewAgeCategory] = useState<AthleteAgeCategory>("DEWASA");
  const [newGender, setNewGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [newCategory, setNewCategory] = useState<"TANDING" | "SENI">("TANDING");
  
  // Jika TANDING: class selection dropdown (A, B, C, D, ...)
  const [selectedTandingCode, setSelectedTandingCode] = useState("A");
  
  // Jika SENI: sub-kategori seni (Tunggal Baku, Tunggal Bebas, Ganda, Regu)
  const [selectedSeniSub, setSelectedSeniSub] = useState<SeniSubCategory>("TUNGGAL_BAKU");

  const [newWeightTarget, setNewWeightTarget] = useState("48.0");
  const [newPhone, setNewPhone] = useState("");
  const [newVerifiedDocs, setNewVerifiedDocs] = useState(true);
  const [selectedModalArena, setSelectedModalArena] = useState("A");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available Tanding Classes based on Age Category
  const currentAvailableTandingClasses = useMemo(() => {
    return SILAT_TANDING_CLASSES[newAgeCategory] || SILAT_TANDING_CLASSES.DEWASA;
  }, [newAgeCategory]);

  // Update target weight when class or age changes
  useEffect(() => {
    if (newCategory === "TANDING") {
      const found = currentAvailableTandingClasses.find(c => c.code === selectedTandingCode) || currentAvailableTandingClasses[0];
      if (found) {
        setNewWeightTarget(String(found.targetDefault));
      }
    }
  }, [newAgeCategory, selectedTandingCode, newCategory, currentAvailableTandingClasses]);

  // Auto sync contingent suggestion when region changes if default prefix
  const handleRegionChange = (reg: string) => {
    setNewRegion(reg);
    if (!newContingent || newContingent.startsWith("KONTINGEN ")) {
      setNewContingent(`KONTINGEN ${reg.toUpperCase()}`);
    }
  };

  // Formatted Class Category Label
  const computedClassCategory = useMemo(() => {
    const ageObj = SILAT_AGE_DIVISIONS.find(d => d.key === newAgeCategory);
    const ageLabel = ageObj ? ageObj.label : "Dewasa";
    const genderLabel = newGender === "PUTRA" ? "Putra" : "Putri";
    
    if (newCategory === "TANDING") {
      const found = currentAvailableTandingClasses.find(c => c.code === selectedTandingCode) || currentAvailableTandingClasses[0];
      return `Tanding ${found.name} ${genderLabel} (${ageLabel})`;
    } else {
      const foundSeni = SILAT_SENI_CATEGORIES.find(s => s.key === selectedSeniSub) || SILAT_SENI_CATEGORIES[0];
      return `Seni ${foundSeni.label} ${genderLabel} (${ageLabel})`;
    }
  }, [newCategory, newAgeCategory, newGender, selectedTandingCode, selectedSeniSub, currentAvailableTandingClasses]);

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran foto maksimal 2MB!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setNewPhotoUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Contingents list for dropdown
  const contingentList = useMemo(() => {
    const setC = new Set<string>();
    athletes.forEach(a => setC.add(a.contingent));
    return Array.from(setC);
  }, [athletes]);

  // Filtered Athletes
  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => {
      const matchSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.contingent.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (a.region && a.region.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (a.schoolOrClub && a.schoolOrClub.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          a.classCategory.toLowerCase().includes(searchQuery.toLowerCase());
      const matchContingent = selectedContingent === "ALL" || a.contingent === selectedContingent;
      const matchGender = selectedGender === "ALL" || a.gender === selectedGender;
      const matchCategory = selectedCategory === "ALL" || a.category === selectedCategory;
      return matchSearch && matchContingent && matchGender && matchCategory;
    });
  }, [athletes, searchQuery, selectedContingent, selectedGender, selectedCategory]);

  // Dynamic Medal Standings based on medalClassification (KONTINGEN | WILAYAH | PERGURUAN)
  const dynamicMedalStandings = useMemo(() => {
    if (medalClassification === "WILAYAH") {
      const regionMap: Record<string, { gold: number; silver: number; bronze: number; athletes: number }> = {
        "Jawa Barat": { gold: 6, silver: 3, bronze: 2, athletes: 0 },
        "Jawa Timur": { gold: 4, silver: 4, bronze: 3, athletes: 0 },
        "DKI Jakarta": { gold: 3, silver: 5, bronze: 4, athletes: 0 },
        "Jawa Tengah": { gold: 3, silver: 3, bronze: 5, athletes: 0 },
        "Bali": { gold: 2, silver: 2, bronze: 3, athletes: 0 },
        "DI Yogyakarta": { gold: 1, silver: 2, bronze: 4, athletes: 0 },
        "Banten": { gold: 1, silver: 1, bronze: 2, athletes: 0 },
        "Sumatera Utara": { gold: 0, silver: 1, bronze: 2, athletes: 0 }
      };
      athletes.forEach(a => {
        const reg = a.region || "Jawa Barat";
        if (!regionMap[reg]) {
          regionMap[reg] = { gold: 0, silver: 0, bronze: 0, athletes: 0 };
        }
        regionMap[reg].athletes += 1;
      });
      return Object.entries(regionMap)
        .map(([name, data]) => {
          const totalPoints = data.gold * 5 + data.silver * 3 + data.bronze * 1;
          return {
            contingent: name,
            region: name,
            gold: data.gold,
            silver: data.silver,
            bronze: data.bronze,
            totalPoints,
            totalAthletes: data.athletes || 1
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints || b.gold - a.gold);
    } else if (medalClassification === "PERGURUAN") {
      const perguruanMap: Record<string, { gold: number; silver: number; bronze: number; athletes: number }> = {
        "Tapak Suci Putera Muhammadiyah": { gold: 5, silver: 3, bronze: 2, athletes: 0 },
        "Persaudaraan Setia Hati Terate (PSHT)": { gold: 4, silver: 4, bronze: 3, athletes: 0 },
        "PPS Betako Merpati Putih": { gold: 3, silver: 3, bronze: 3, athletes: 0 },
        "Keluarga Silat Nasional Indonesia Perisai Diri": { gold: 2, silver: 3, bronze: 4, athletes: 0 },
        "Pencak Silat Nahdlatul Ulama Pagar Nusa": { gold: 2, silver: 2, bronze: 3, athletes: 0 },
        "IKSPI Kera Sakti": { gold: 1, silver: 2, bronze: 3, athletes: 0 },
        "Satria Muda Indonesia (SMI)": { gold: 1, silver: 1, bronze: 2, athletes: 0 },
        "Persinas ASAD": { gold: 0, silver: 2, bronze: 1, athletes: 0 }
      };
      athletes.forEach(a => {
        const perg = a.schoolOrClub || "Tapak Suci Putera Muhammadiyah";
        if (!perguruanMap[perg]) {
          perguruanMap[perg] = { gold: 0, silver: 0, bronze: 0, athletes: 0 };
        }
        perguruanMap[perg].athletes += 1;
      });
      return Object.entries(perguruanMap)
        .map(([name, data]) => {
          const totalPoints = data.gold * 5 + data.silver * 3 + data.bronze * 1;
          return {
            contingent: name,
            schoolOrClub: name,
            gold: data.gold,
            silver: data.silver,
            bronze: data.bronze,
            totalPoints,
            totalAthletes: data.athletes || 1
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints || b.gold - a.gold);
    } else {
      // Default: KONTINGEN
      const contingentMap: Record<string, { gold: number; silver: number; bronze: number; athletes: number }> = {
        "KONTINGEN JAWA BARAT": { gold: 4, silver: 2, bronze: 1, athletes: 0 },
        "KONTINGEN JAWA TIMUR": { gold: 3, silver: 3, bronze: 2, athletes: 0 },
        "KONTINGEN DKI JAKARTA": { gold: 2, silver: 4, bronze: 3, athletes: 0 },
        "KONTINGEN JAWA TENGAH": { gold: 2, silver: 2, bronze: 4, athletes: 0 },
        "KONTINGEN BALI": { gold: 1, silver: 2, bronze: 2, athletes: 0 },
        "KONTINGEN DI YOGYAKARTA": { gold: 1, silver: 1, bronze: 3, athletes: 0 },
        "KONTINGEN BANTEN": { gold: 0, silver: 1, bronze: 2, athletes: 0 }
      };
      athletes.forEach(a => {
        const cont = a.contingent.toUpperCase();
        if (!contingentMap[cont]) {
          contingentMap[cont] = { gold: 0, silver: 0, bronze: 0, athletes: 0 };
        }
        contingentMap[cont].athletes += 1;
      });
      return Object.entries(contingentMap)
        .map(([name, data]) => {
          const totalPoints = data.gold * 5 + data.silver * 3 + data.bronze * 1;
          return {
            contingent: name,
            gold: data.gold,
            silver: data.silver,
            bronze: data.bronze,
            totalPoints,
            totalAthletes: data.athletes || 1
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints || b.gold - a.gold);
    }
  }, [athletes, medalClassification]);

  // Handle Add Athlete Form Submit with National Standard Fields and Real-time Sync
  const handleAddAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAthleteName.trim()) {
      alert("Harap isi Nama Lengkap Atlet!");
      return;
    }
    if (!newContingent.trim()) {
      alert("Harap isi Nama Kontingen!");
      return;
    }
    sound.playClick();

    const photo = newPhotoUrl || (newGender === "PUTRA" ? SILAT_AVATAR_PRESETS.PUTRA : SILAT_AVATAR_PRESETS.PUTRI);

    const newRecord: AthleteRecord = {
      id: "atl-" + Date.now(),
      name: newAthleteName.trim().toUpperCase(),
      contingent: newContingent.trim().toUpperCase(),
      region: newRegion,
      schoolOrClub: newPerguruan,
      ageCategory: newAgeCategory,
      gender: newGender,
      category: newCategory,
      seniSubCategory: newCategory === "SENI" ? selectedSeniSub : undefined,
      classCategory: computedClassCategory,
      weightTarget: parseFloat(newWeightTarget) || 50,
      weighInStatus: "BELUM_TIMBANG",
      verifiedDocuments: newVerifiedDocs,
      arena: selectedModalArena,
      phone: newPhone.trim() || undefined,
      photoUrl: photo,
      nik: newNik.trim() || undefined,
      birthDate: newBirthDate || undefined
    };

    const updatedAthletes = [newRecord, ...athletes];
    setAthletes(updatedAthletes);

    // Save to LocalStorage and trigger events for real-time synchronization
    try {
      localStorage.setItem("jrz_portal_athletes", JSON.stringify(updatedAthletes));
      window.dispatchEvent(new CustomEvent("jrz_athletes_updated", { detail: newRecord }));
      window.dispatchEvent(new Event("storage"));
    } catch (err) {
      // ignore
    }

    // Real-time synchronization to digital scoring category & backend schedule
    if (newCategory === "SENI") {
      try {
        const existingSeniRaw = localStorage.getItem("jrz_seni_queue");
        let seniQueue = [];
        if (existingSeniRaw) {
          try { seniQueue = JSON.parse(existingSeniRaw); } catch (e) {}
        }
        seniQueue.unshift({
          athleteId: newRecord.id,
          name: newRecord.name,
          contingent: newRecord.contingent,
          category: selectedSeniSub === "TUNGGAL_BAKU" ? "TUNGGAL" :
                    selectedSeniSub === "TUNGGAL_BEBAS" ? "SOLO_KREATIF" :
                    selectedSeniSub === "GANDA" ? "GANDA" : "REGU",
          gender: newGender,
          ageDivision: newAgeCategory,
          photoUrl: photo
        });
        localStorage.setItem("jrz_seni_queue", JSON.stringify(seniQueue));
        window.dispatchEvent(new CustomEvent("jrz_seni_queue_updated", { detail: seniQueue }));
      } catch (e) {}
    } else {
      // TANDING: append to match queue and trigger backend schedule sync
      try {
        const existingTandingRaw = localStorage.getItem("jrz_tanding_queue");
        let tandingQueue = [];
        if (existingTandingRaw) {
          try { tandingQueue = JSON.parse(existingTandingRaw); } catch (e) {}
        }
        tandingQueue.unshift(newRecord);
        localStorage.setItem("jrz_tanding_queue", JSON.stringify(tandingQueue));
      } catch (e) {}

      // Backend API registration & automatic match pairing
      fetch("/api/athletes/sync-one", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlete: newRecord })
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.matchesSchedule) {
            setSchedules(data.matchesSchedule);
            try {
              localStorage.setItem("jrz_cached_schedules", JSON.stringify(data.matchesSchedule));
              localStorage.setItem("jrz_cached_participants", JSON.stringify(data.participants));
            } catch (e) {}
            window.dispatchEvent(new CustomEvent("jrz_schedules_updated", { detail: data.matchesSchedule }));
          }
        })
        .catch(err => console.warn("Sync server error, fallback local:", err));

      // Local schedule pairing fallback
      try {
        let currentSchedules: any[] = [];
        const savedSch = localStorage.getItem("jrz_cached_schedules");
        if (savedSch) currentSchedules = JSON.parse(savedSch);

        let slot = currentSchedules.find(m => 
          m.gender === newRecord.gender && 
          m.status === "BELUM" &&
          (!m.fighterBlueId || m.fighterBlueId === "KOSONG" || m.fighterBlueId.startsWith("placeholder-")) &&
          m.fighterRedId !== newRecord.id
        );

        if (slot) {
          slot.fighterBlueId = newRecord.id;
          slot.fighterBlueName = newRecord.name;
          slot.fighterBlueClub = newRecord.contingent;
        } else {
          const nextPartai = currentSchedules.length + 1;
          const newMatch = {
            id: "m-" + Date.now(),
            matchNumber: `Partai ${nextPartai < 10 ? "0" + nextPartai : nextPartai}`,
            stage: "PENYISIHAN",
            fighterRedId: newRecord.id,
            fighterRedName: newRecord.name,
            fighterRedClub: newRecord.contingent,
            fighterBlueId: "KOSONG",
            fighterBlueName: "MENUNGGU LAWAN",
            fighterBlueClub: "-",
            arena: selectedModalArena || "Gelanggang A",
            gender: newRecord.gender,
            status: "BELUM",
            classCategory: computedClassCategory
          };
          currentSchedules.push(newMatch);
        }
        setSchedules([...currentSchedules]);
        localStorage.setItem("jrz_cached_schedules", JSON.stringify(currentSchedules));
        window.dispatchEvent(new CustomEvent("jrz_schedules_updated", { detail: currentSchedules }));
      } catch (e) {}
    }

    // Auto-sync & generate bracket automatically when new athlete registered
    if (newCategory === "TANDING") {
      autoSyncAndGenerateAllBrackets(selectedModalArena || selectedArena).catch(console.warn);
    }

    setShowAddModal(false);
    setNewAthleteName("");
    setNewNik("");
    setNewBirthDate("");
    setNewPhotoUrl("");
    setNewPhone("");
  };

  // Handle Delete Single Athlete
  const handleDeleteAthleteConfirm = async (athlete: AthleteRecord) => {
    sound.playClick();
    const athleteId = athlete.id;
    const athleteName = athlete.name;

    // 1. Update local athletes state
    const updated = athletes.filter(a => a.id !== athleteId);
    setAthletes(updated);
    try {
      localStorage.setItem("jrz_portal_athletes", JSON.stringify(updated));
    } catch (e) {}

    // 2. Update local schedules
    const updatedSchedules = schedules.filter(m => {
      if (m.fighterRedId === athleteId && (!m.fighterBlueId || m.fighterBlueId === "KOSONG" || m.fighterBlueId.startsWith("placeholder-"))) return false;
      if (m.fighterBlueId === athleteId && (!m.fighterRedId || m.fighterRedId === "KOSONG" || m.fighterRedId.startsWith("placeholder-"))) return false;
      if (m.fighterRedId === athleteId) {
        m.fighterRedId = "KOSONG";
        m.fighterRedName = "MENUNGGU LAWAN";
        m.fighterRedClub = "-";
      }
      if (m.fighterBlueId === athleteId) {
        m.fighterBlueId = "KOSONG";
        m.fighterBlueName = "MENUNGGU LAWAN";
        m.fighterBlueClub = "-";
      }
      return true;
    });
    setSchedules(updatedSchedules);
    try {
      localStorage.setItem("jrz_cached_schedules", JSON.stringify(updatedSchedules));
    } catch (e) {}

    // 3. Clean up queues
    try {
      const seniQRaw = localStorage.getItem("jrz_seni_queue");
      if (seniQRaw) {
        const sq = JSON.parse(seniQRaw).filter((s: any) => s.athleteId !== athleteId && s.name !== athleteName);
        localStorage.setItem("jrz_seni_queue", JSON.stringify(sq));
        window.dispatchEvent(new CustomEvent("jrz_seni_queue_updated", { detail: sq }));
      }
    } catch (e) {}

    // 4. Dispatch events to all open scoring panels
    window.dispatchEvent(new CustomEvent("jrz_athletes_updated", { detail: { deletedId: athleteId } }));
    window.dispatchEvent(new CustomEvent("jrz_schedules_updated", { detail: updatedSchedules }));
    window.dispatchEvent(new Event("storage"));

    // 5. Send delete request to backend
    try {
      await fetch(`/api/athletes/${athleteId}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Server delete fallback:", err);
    }

    if (athlete.category === "TANDING") {
      autoSyncAndGenerateAllBrackets(selectedArena).catch(console.warn);
    }

    setAthleteToDelete(null);
    showToast(`✅ Data atlet ${athleteName} berhasil dihapus.`);
  };

  // Handle Clear All Athletes
  const handleClearAllAthletesConfirm = async () => {
    sound.playClick();
    const count = athletes.length;

    // 1. Clear local state
    setAthletes([]);
    setSchedules([]);

    // 2. Clear local storage
    try {
      localStorage.setItem("jrz_portal_athletes", JSON.stringify([]));
      localStorage.setItem("registered_athletes", JSON.stringify([]));
      localStorage.setItem("jrz_cached_schedules", JSON.stringify([]));
      localStorage.setItem("jrz_cached_participants", JSON.stringify([]));
      localStorage.setItem("jrz_seni_queue", JSON.stringify([]));
      localStorage.setItem("jrz_tanding_queue", JSON.stringify([]));
    } catch (e) {}

    // 3. Broadcast to all open scoring panels
    window.dispatchEvent(new CustomEvent("jrz_athletes_updated", { detail: [] }));
    window.dispatchEvent(new CustomEvent("jrz_schedules_updated", { detail: [] }));
    window.dispatchEvent(new CustomEvent("jrz_seni_queue_updated", { detail: [] }));
    window.dispatchEvent(new Event("storage"));

    // 4. Send clear-all request to backend
    try {
      await fetch("/api/athletes/clear-all", { method: "POST" });
    } catch (err) {
      console.warn("Server clear all fallback:", err);
    }

    setShowClearAllModal(false);
    showToast(`✅ Seluruh ${count} data atlet & jadwal partai berhasil dibersihkan.`);
  };

  // Direct launcher from table to Digital Scoring (Tanding or Seni)
  const handleLaunchScoring = (athlete: AthleteRecord) => {
    sound.playClick();
    if (athlete.category === "SENI") {
      try {
        const seniCategoryMapped = 
          athlete.seniSubCategory === "TUNGGAL_BAKU" ? "TUNGGAL" :
          athlete.seniSubCategory === "TUNGGAL_BEBAS" ? "SOLO_KREATIF" :
          athlete.seniSubCategory === "GANDA" ? "GANDA" :
          athlete.seniSubCategory === "REGU" ? "REGU" : "TUNGGAL";

        const newSeniState = {
          id: "seni-" + athlete.id,
          matchNumber: "Partai Seni - " + athlete.name.slice(0, 10),
          pool: "Pool Utama",
          arena: athlete.arena || selectedArena,
          category: seniCategoryMapped,
          ageDivision: athlete.ageCategory || "DEWASA",
          gender: athlete.gender,
          athleteName: athlete.name,
          contingent: athlete.contingent,
          photoUrl: athlete.photoUrl,
          targetDurationSeconds: 180,
          elapsedSeconds: 0,
          timerStatus: "IDLE",
          juryScores: {
            1: { juryId: 1, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
            2: { juryId: 2, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
            3: { juryId: 3, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
            4: { juryId: 4, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
            5: { juryId: 5, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true }
          },
          penalties: {
            boundaryViolationCount: 0,
            costumeViolation: false,
            weaponDropViolation: false,
            timeDeviationSeconds: 0,
            manualDeduction: 0,
            totalPenaltyDeduction: 0
          },
          medianScore: 9.90,
          finalScore: 9.90,
          status: "BELUM_TAMPIL"
        };
        localStorage.setItem("jrz_portal_seni_state", JSON.stringify(newSeniState));
        window.dispatchEvent(new CustomEvent("jrz_portal_seni_updated", { detail: newSeniState }));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {}

      if (onNavigateToCategory) {
        onNavigateToCategory("SENI");
      } else if (onNavigateToMatch) {
        onNavigateToMatch("SENI");
      }
    } else {
      // TANDING: Broadcast to all panels (Sekretaris, Dewan, Juri, Monitor)
      try {
        const tandingPayload = {
          id: "match-" + athlete.id,
          matchNumber: "Partai - " + athlete.name.slice(0, 10),
          fighterRedName: athlete.name,
          fighterRedClub: athlete.contingent,
          fighterBlueName: "MENUNGGU LAWAN",
          fighterBlueClub: "-",
          classCategory: athlete.classCategory,
          arena: athlete.arena || selectedArena,
          gender: athlete.gender,
          stage: "PENYISIHAN",
          status: MatchStatus.IDLE,
          activeRound: 1,
          timeLeft: 120,
          roundDuration: 120,
          roundCount: 3,
          scoreRed: 0,
          scoreBlue: 0
        };
        window.dispatchEvent(new CustomEvent("jrz_activate_match", { detail: tandingPayload }));
        offlineEngine.broadcast(tandingPayload as any);
        rtdbScoringEngine.handleResetMatch(tandingPayload as any).catch(() => {});
        fetch("/api/match-state/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: tandingPayload })
        }).catch(() => {});
      } catch (e) {}

      if (onNavigateToCategory) {
        onNavigateToCategory("TANDING");
      } else if (onNavigateToMatch) {
        onNavigateToMatch("TANDING");
      }
    }
  };

  // Schedule match launcher that broadcasts to all scoring panels
  const handleActivateScheduleMatch = async (matchItem: any) => {
    if (!currentUser) {
      if (onOpenSignModal) {
        onOpenSignModal(
          "Akses Digital Skoring Terbatas! Pengguna tanpa akun hanya dapat melihat jadwal dan memantau melalui menu Monitor Pertandingan.",
          true
        );
      }
      return;
    }
    sound.playClick();
    const isSeni = (matchItem.categoryType === "SENI") || 
      (matchItem.kelas && matchItem.kelas.toUpperCase().includes("SENI")) ||
      (matchItem.partai && matchItem.partai.toUpperCase().includes("SENI"));

    if (isSeni) {
      const newSeniState = {
        id: "seni-" + (matchItem.id || Date.now()),
        matchNumber: matchItem.partai || matchItem.matchNumber || "Partai Seni",
        pool: "Pool Utama",
        arena: matchItem.arena || selectedArena,
        category: matchItem.category || "TUNGGAL",
        ageDivision: matchItem.ageDivision || "DEWASA",
        gender: matchItem.gender || "PUTRA",
        athleteName: matchItem.red || "PESILAT SENI",
        contingent: matchItem.redClub || "KONTINGEN",
        targetDurationSeconds: 180,
        elapsedSeconds: 0,
        timerStatus: "IDLE",
        juryScores: {
          1: { juryId: 1, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
          2: { juryId: 2, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
          3: { juryId: 3, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
          4: { juryId: 4, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
          5: { juryId: 5, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true }
        },
        penalties: { boundaryViolationCount: 0, costumeViolation: false, weaponDropViolation: false, timeDeviationSeconds: 0, manualDeduction: 0, totalPenaltyDeduction: 0 },
        medianScore: 9.90,
        finalScore: 9.90,
        status: "BELUM_TAMPIL"
      };
      try {
        localStorage.setItem("jrz_portal_seni_state", JSON.stringify(newSeniState));
        window.dispatchEvent(new CustomEvent("jrz_portal_seni_updated", { detail: newSeniState }));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {}

      if (onNavigateToCategory) onNavigateToCategory("SENI", newSeniState);
      else if (onNavigateToMatch) onNavigateToMatch(matchItem.partai || "SENI");
    } else {
      // TANDING
      const tandingPayload = {
        id: "match-" + (matchItem.id || Date.now()),
        matchNumber: matchItem.partai || matchItem.matchNumber || "Partai -",
        fighterRedName: matchItem.red || "PESILAT MERAH",
        fighterRedClub: matchItem.redClub || "CONTINGENT MERAH",
        fighterBlueName: matchItem.blue || "PESILAT BIRU",
        fighterBlueClub: matchItem.blueClub || "CONTINGENT BIRU",
        classCategory: matchItem.kelas || "Tanding Bebas",
        gender: matchItem.gender || "PUTRA",
        stage: matchItem.stage || "PENYISIHAN",
        arena: matchItem.arena || selectedArena,
        status: MatchStatus.IDLE,
        activeRound: 1,
        timeLeft: 120,
        roundDuration: 120,
        roundCount: 3,
        scoreRed: 0,
        scoreBlue: 0
      };

      try {
        window.dispatchEvent(new CustomEvent("jrz_activate_match", { detail: tandingPayload }));
        offlineEngine.broadcast(tandingPayload as any);
        rtdbScoringEngine.handleResetMatch(tandingPayload as any).catch(() => {});
        if (matchItem.id) {
          fetch("/api/matches-schedule/load", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId: matchItem.id })
          }).catch(() => {});
        }
        fetch("/api/match-state/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: tandingPayload })
        }).catch(() => {});
      } catch (e) {}

      if (onNavigateToCategory) onNavigateToCategory("TANDING", tandingPayload);
      else if (onNavigateToMatch) onNavigateToMatch(matchItem.partai || "TANDING");
    }
  };

  // Prepared Dynamic Schedule List
  const displayedScheduleMatches = useMemo(() => {
    if (schedules && schedules.length > 0) {
      return schedules.map((m, idx) => ({
        id: m.id || `sched-${idx}`,
        partai: m.matchNumber || `Partai ${idx + 1 < 10 ? "0" + (idx + 1) : idx + 1}`,
        matchNumber: m.matchNumber || `Partai ${idx + 1 < 10 ? "0" + (idx + 1) : idx + 1}`,
        kelas: m.classCategory || "Tanding Bebas",
        stage: m.stage || "PENYISIHAN",
        red: m.fighterRedName || "PESILAT MERAH",
        redClub: m.fighterRedClub || "KONTINGEN MERAH",
        blue: m.fighterBlueName || "PESILAT BIRU",
        blueClub: m.fighterBlueClub || "KONTINGEN BIRU",
        status: m.status || "BELUM",
        skor: m.status === "SELESAI" ? "Selesai" : m.status === "SEDANG" ? "Live" : "0 - 0",
        arena: m.arena || selectedArena,
        gender: m.gender || "PUTRA",
        categoryType: m.categoryType || (m.classCategory?.toUpperCase().includes("SENI") ? "SENI" : "TANDING")
      }));
    }

    // Dynamic pairing from athletes if no schedules exist yet
    const tandingAthletes = athletes.filter(a => a.category === "TANDING");
    const dynamicList: any[] = [];
    for (let i = 0; i < tandingAthletes.length; i += 2) {
      const red = tandingAthletes[i];
      const blue = tandingAthletes[i + 1];
      const partaiNum = Math.floor(i / 2) + 1;
      dynamicList.push({
        id: `match-pair-${red.id}`,
        partai: `Partai ${partaiNum < 10 ? "0" + partaiNum : partaiNum}`,
        matchNumber: `Partai ${partaiNum < 10 ? "0" + partaiNum : partaiNum}`,
        kelas: red.classCategory || "Tanding Kelas A Putra",
        stage: "PENYISIHAN",
        red: red.name,
        redClub: red.contingent,
        blue: blue ? blue.name : "MENUNGGU LAWAN",
        blueClub: blue ? blue.contingent : "-",
        status: "BELUM",
        skor: "0 - 0",
        arena: red.arena || selectedArena,
        gender: red.gender,
        categoryType: "TANDING"
      });
    }

    // Also append Seni athletes
    const seniAthletes = athletes.filter(a => a.category === "SENI");
    seniAthletes.forEach((s, idx) => {
      const pNum = dynamicList.length + 1;
      dynamicList.push({
        id: `match-seni-${s.id}`,
        partai: `Partai ${pNum < 10 ? "0" + pNum : pNum} (Seni)`,
        matchNumber: `Partai ${pNum < 10 ? "0" + pNum : pNum} (Seni)`,
        kelas: `${s.classCategory || "Seni Tunggal"} (${s.gender})`,
        stage: "PENYISIHAN",
        red: s.name,
        redClub: s.contingent,
        blue: "-",
        blueClub: "-",
        status: "BELUM",
        skor: "-",
        arena: s.arena || selectedArena,
        gender: s.gender,
        categoryType: "SENI"
      });
    });

    return dynamicList;
  }, [schedules, athletes, selectedArena]);

  // List Gelanggang Tersedia untuk Filter Cetak Jadwal
  const availableGelanggangList = useMemo(() => {
    const arenaSet = new Set<string>();
    arenaSet.add("GELANGGANG A");
    arenaSet.add("GELANGGANG B");
    if (selectedArena) {
      const clean = selectedArena.trim().toUpperCase();
      const norm = clean.startsWith("GELANGGANG") ? clean : `GELANGGANG ${clean}`;
      arenaSet.add(norm);
    }
    schedules.forEach(m => {
      if (m.arena) {
        const clean = m.arena.trim().toUpperCase();
        const norm = clean.startsWith("GELANGGANG") ? clean : `GELANGGANG ${clean}`;
        arenaSet.add(norm);
      }
    });
    athletes.forEach(a => {
      if (a.arena) {
        const clean = a.arena.trim().toUpperCase();
        const norm = clean.startsWith("GELANGGANG") ? clean : `GELANGGANG ${clean}`;
        arenaSet.add(norm);
      }
    });
    return Array.from(arenaSet).sort();
  }, [schedules, athletes, selectedArena]);

  // Vector / Image draw logo helper for PDF exports with high redundancy fail-safes
  const drawLogoPdf = (doc: any, logoStr: string, x: number, y: number, size: number) => {
    try {
      if (logoStr && logoStr.startsWith("data:image")) {
        doc.addImage(logoStr, "PNG", x, y, size, size);
      } else {
        doc.setDrawColor(74, 24, 122);
        doc.setLineWidth(0.5);
        doc.ellipse(x + size / 2, y + size / 2, size / 2, size / 2, "D");
        doc.setFillColor(74, 24, 122);
        doc.ellipse(x + size / 2, y + size / 2, size / 2 - 1, size / 2 - 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.text("IPSI", x + size / 2, y + size / 2 + 2.5, { align: "center" });
      }
    } catch (err) {
      console.warn("Could not draw logo in PDF:", err);
    }
  };

  // Official Lembar Pengesahan Signatures for Match Schedule PDF
  const drawScheduleSignatures = (doc: any, sigY: number) => {
    const namaKetuaPertandingan = localStorage.getItem("sekretaris_namaKetuaPertandingan") || "";
    const namaSekretarisPertandingan = localStorage.getItem("sekretaris_namaSekretarisPertandingan") || "";
    const tanggalCetakDokumen = localStorage.getItem("sekretaris_tanggalCetakDokumen") || "01 JULI 2026";
    const namaDaerahCetak = localStorage.getItem("sekretaris_namaDaerahCetak") || "IDI RAYEUK";

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
    doc.text(`${namaDaerahCetak.toUpperCase()}, ${tanggalCetakDokumen.toUpperCase()}`, 160, sigY, { align: "center" });
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

  // Helper untuk formatting kode kelas singkat (Contoh: A PA, B PI, C PA)
  const getShortClassCode = (classCategory?: string, genderVal?: string) => {
    const nameStr = classCategory || "KELAS A";
    const matched = nameStr.match(/Kelas\s+([A-Za-z0-9\-\+]+)/i);
    let letter = matched && matched[1] ? matched[1].toUpperCase() : nameStr.replace(/Kelas/i, "").trim().toUpperCase();
    if (!letter || letter.length > 8) {
      letter = letter.substring(0, 7);
    }
    const isPutri = genderVal && (genderVal.toUpperCase() === "PUTRI" || genderVal.toUpperCase() === "PI");
    const suffix = isPutri ? "PI" : "PA";
    return `${letter} ${suffix}`;
  };

  const getParticipantName = (pId: string | null, fallbackName?: string) => {
    if (fallbackName && fallbackName !== "PESILAT BIRU" && fallbackName !== "PESILAT MERAH" && fallbackName !== "MENUNGGU LAWAN") {
      return fallbackName.toUpperCase();
    }
    if (!pId) return fallbackName || "-";
    if (pId === "BYE") return "BYE";
    if (pId === "KOSONG") return "KOSONG";
    if (pId.startsWith("winner-")) {
      const matchId = pId.replace(/^winner-(match-)?/, "");
      return `PEMENANG PARTAI ${matchId}`;
    }
    const foundAth = athletes.find(a => a.id === pId);
    if (foundAth) return foundAth.name.toUpperCase();
    return fallbackName ? fallbackName.toUpperCase() : pId;
  };

  const getParticipantClub = (pId: string | null, fallbackClub?: string) => {
    if (fallbackClub && fallbackClub !== "KONTINGEN BIRU" && fallbackClub !== "KONTINGEN MERAH" && fallbackClub !== "-") {
      return fallbackClub.toUpperCase();
    }
    if (!pId || pId === "BYE" || pId === "KOSONG") return "-";
    const foundAth = athletes.find(a => a.id === pId);
    if (foundAth) return (foundAth.contingent || (foundAth as any).school || "-").toUpperCase();
    return fallbackClub || "-";
  };

  // Core generator for double-outlined high resemblance POPDA official match schedules PDF print with per-arena filter
  // Persis seperti generator pada Kontrol Partai Kategori Tanding di SekretarisPanel
  const executeDownloadSchedulePdf = (targetStage: string = "ALL", targetGelanggang: string = "ALL") => {
    sound.playClick();

    const sourceList = (schedules && schedules.length > 0) ? schedules : displayedScheduleMatches;

    const filteredMatches = sourceList.filter(m => {
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
        const normMatch = arenaMatch.startsWith("GELANGGANG") ? arenaMatch : `GELANGGANG ${arenaMatch}`;
        const normTarget = arenaTarget.startsWith("GELANGGANG") ? arenaTarget : `GELANGGANG ${arenaTarget}`;
        if (normMatch !== normTarget && !normMatch.includes(normTarget) && !normTarget.includes(normMatch)) {
          return false;
        }
      }

      return true;
    });

    // Valid matches check
    const validMatches = filteredMatches.filter(m => {
      if (m.matchNumber || m.partai) return true;
      if (!m.fighterBlueId && !m.fighterRedId && !m.red && !m.blue) return false;
      return true;
    });

    // Sort sequentially by Match Number / Partai numerically
    const sortedMatches = [...validMatches].sort((a, b) => {
      const getNum = (m: any) => {
        const raw = m.matchNumber || m.partai || "";
        const val = parseInt(raw.toString().replace(/\D/g, "") || "");
        return isNaN(val) ? 999999 : val;
      };
      
      const numA = getNum(a);
      const numB = getNum(b);
      if (numA !== numB) return numA - numB;

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

    const eventName = localStorage.getItem("jrz_event_name") || "PEKAN OLAHRAGA PELAJAR DAERAH (POPDA) XVII";
    const tempatPelaksanaan = localStorage.getItem("sekretaris_tempatPelaksanaan") || localStorage.getItem("sekretaris_namaDaerahCetak") || "IDI RAYEUK";
    const waktuPelaksanaan = localStorage.getItem("sekretaris_waktuPelaksanaan") || localStorage.getItem("sekretaris_tanggalCetakDokumen") || "07 S.D 12 JULI 2026";
    const namaDaerahCetak = localStorage.getItem("sekretaris_namaDaerahCetak") || "IDI RAYEUK";
    const tanggalCetakDokumen = localStorage.getItem("sekretaris_tanggalCetakDokumen") || "01 JULI 2026";
    const logoLeftLocal = localStorage.getItem("sekretaris_logoLeftLocal") || "/logo_panel_dewan.svg";
    const logoRightLocal = localStorage.getItem("sekretaris_logoRightLocal") || "/logo_panel_dewan.svg";

    // Exactly 14 matches fits perfectly per page on standard A4 portrait layout
    const MATCHES_PER_PAGE = 14;
    const totalPages = Math.ceil(sortedMatches.length / MATCHES_PER_PAGE) || 1;

    for (let pNum = 1; pNum <= totalPages; pNum++) {
      if (pNum > 1) {
        doc.addPage();
      }

      // Draw custom margins: top=10, left=20, right=20, bottom=10
      drawLogoPdf(doc, logoLeftLocal, 20, 10, 15);
      drawLogoPdf(doc, logoRightLocal, 175, 10, 15);

      let textCursorY = 13;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      doc.text("JADWAL PERTANDINGAN", 105, textCursorY, { align: "center" });
      textCursorY += 5;

      // Event Name
      doc.setFontSize(10);
      const chosenEventName = eventName || "KEJUARAAN PENCAK SILAT";
      const wrappedEventName = doc.splitTextToSize(chosenEventName.toUpperCase(), 134);
      wrappedEventName.forEach((line: string) => {
        doc.text(line, 105, textCursorY, { align: "center" });
        textCursorY += 4.5;
      });

      // Cabang Olahraga & Tempat/Waktu
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 60, 75);
      const chosenCabang = "PENCAK SILAT TANDING";
      const mergedTempat = tempatPelaksanaan || namaDaerahCetak || "TEMPAT PELAKSANAAN";
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

      // Three Block Info Labels: width = 170 (50, 70, 50)
      const boxY = lineY + 3.5;
      
      // Box 1 (Tanggal/Hari): X=20 to 70
      const chosenTanggalHari = tanggalCetakDokumen || "HARI / TANGGAL";
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
        : "SEMUA GELANGGANG";
      doc.setFillColor(224, 242, 254);
      doc.rect(70, boxY, 70, 10, "FD");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(0, 0, 0);
      doc.text(chosenGelanggang.toUpperCase(), 105, boxY + 6.2, { align: "center" });

      // Box 3 (Waktu/Sesi): X=140 to 190
      const chosenWaktuSesi = waktuPelaksanaan || "08:00 WIB - SELESAI";
      doc.setFillColor(255, 255, 255);
      doc.rect(140, boxY, 50, 10, "FD");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(chosenWaktuSesi.toUpperCase(), 165, boxY + 6.2, { align: "center" });

      // Table Header at headerY, Height=8
      const headerY = boxY + 13.5;
      const startRowsY = headerY + 8;

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
          const rawMatchNum = match.matchNumber || match.partai || globalNum.toString();
          const matchNum = rawMatchNum.toString().replace(/\D/g, "") || globalNum.toString();

          const classCategory = match.classCategory || match.kelas || match.categoryClassId || "Kelas A";
          const classCode = getShortClassCode(classCategory, match.gender).replace(/\s+/, " / ");
          
          let division = "REMAJA";
          const classUpper = (classCategory || "").toUpperCase();
          if (classUpper.includes("USIA DINI")) division = "USIA DINI";
          else if (classUpper.includes("PRA REMAJA")) division = "PRA REMAJA";
          else if (classUpper.includes("DEWASA")) division = "DEWASA";

          const stageStr = match.stage ? match.stage.toUpperCase() : "PENYISIHAN";

          const blueName = getParticipantName(match.fighterBlueId, match.blue || match.fighterBlueName);
          const blueClub = getParticipantClub(match.fighterBlueId, match.blueClub || match.fighterBlueClub);

          const redName = getParticipantName(match.fighterRedId, match.red || match.fighterRedName);
          const redClub = getParticipantClub(match.fighterRedId, match.redClub || match.fighterRedClub);

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
          const rawArena = match.arena || "GEL A";
          const cleanArena = (rawArena.startsWith("GELANGGANG") ? rawArena : `GELANGGANG ${rawArena}`).replace("GELANGGANG ", "GEL. ");
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
        
        if (lastRowY + 45 > 285) {
          doc.addPage();
          drawLogoPdf(doc, logoLeftLocal, 20, 10, 15);
          drawLogoPdf(doc, logoRightLocal, 175, 10, 15);
          
          let sigHeaderY = 15;
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(10);
          doc.text("LEMBAR PENGESAHAN JADWAL PERTANDINGAN", 105, sigHeaderY, { align: "center" });
          doc.line(20, sigHeaderY + 5, 190, sigHeaderY + 5);
          
          const finalSigY = 45;
          drawScheduleSignatures(doc, finalSigY);
        } else {
          drawScheduleSignatures(doc, sigY);
        }
      }
    }

    const cleanGelanggangStr = targetGelanggang === "ALL" ? "Semua_Gelanggang" : targetGelanggang.replace(/\s+/g, "_");
    const cleanStageStr = targetStage.replace(/\s+/g, "_");
    doc.save(`Jadwal_Pertandingan_${cleanGelanggangStr}_${cleanStageStr}.pdf`);
    showToast(`📥 Jadwal Pertandingan (${cleanGelanggangStr} - ${cleanStageStr}) PDF berhasil diunduh!`);
  };

  const downloadAllGelanggangSeparately = async (targetStage: string = "ALL") => {
    sound.playClick();
    const activeArenas = availableGelanggangList.filter(g => 
      (schedules.length > 0 ? schedules : displayedScheduleMatches).some(m => {
        const mArena = (m.arena || "GELANGGANG A").trim().toUpperCase();
        const norm = mArena.startsWith("GELANGGANG") ? mArena : `GELANGGANG ${mArena}`;
        return norm === g;
      })
    );
    const targetArenas = activeArenas.length > 0 ? activeArenas : ["GELANGGANG A", "GELANGGANG B"];
    showToast(`⏳ Menyiapkan unduhan terpisah untuk ${targetArenas.length} gelanggang...`);
    for (let i = 0; i < targetArenas.length; i++) {
      const g = targetArenas[i];
      executeDownloadSchedulePdf(targetStage, g);
      await new Promise(r => setTimeout(r, 450));
    }
    showToast(`✅ Selesai mengunduh ${targetArenas.length} file PDF jadwal per gelanggang!`);
  };

  const handleOpenScheduleDownloadOverlay = () => {
    sound.playClick();
    setOverlaySelectedStage("ALL");
    setOverlaySelectedGelanggang("ALL");
    setShowScheduleDownloadOverlay(true);
  };

  // Handle Weigh-in update
  const handleUpdateWeighIn = (id: string, actualWeightStr: string) => {
    const weight = parseFloat(actualWeightStr);
    setAthletes(prev => prev.map(a => {
      if (a.id !== id) return a;
      if (isNaN(weight) || weight <= 0) {
        return { ...a, actualWeight: undefined, weighInStatus: "BELUM_TIMBANG" };
      }
      // Tolerate +- 0.5kg according to class
      let status: AthleteRecord["weighInStatus"] = "SAH";
      if (weight > a.weightTarget + 0.5) status = "OVERWEIGHT";
      else if (weight < a.weightTarget - 5.0) status = "UNDERWEIGHT";
      return { ...a, actualWeight: weight, weighInStatus: status };
    }));
  };

  // Toggle Verification Document
  const handleToggleDocVerification = (id: string) => {
    sound.playClick();
    setAthletes(prev => prev.map(a => {
      if (a.id === id) return { ...a, verifiedDocuments: !a.verifiedDocuments };
      return a;
    }));
  };

  // Export Athletes to Excel
  const handleExportExcel = () => {
    sound.playClick();
    const exportData = filteredAthletes.map((a, idx) => ({
      No: idx + 1,
      "Nama Atlet": a.name,
      Kontingen: a.contingent,
      Gender: a.gender,
      Kategori: a.category,
      "Kelas Pertandingan": a.classCategory,
      "Target BB (Kg)": a.weightTarget,
      "Timbang Aktual (Kg)": a.actualWeight || "-",
      "Status Timbang": a.weighInStatus,
      "Verifikasi Berkas": a.verifiedDocuments ? "LENGKAP" : "BELUM LENGKAP",
      Gelanggang: a.arena || "-",
      "No. Kontak": a.phone || "-"
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Atlet");
    XLSX.writeFile(workbook, `Data_Atlet_EventSilat_${Date.now()}.xlsx`);
  };

  // Dynamic Available Classes for Bracket filtering based on registered athletes
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    athletes.filter(a => a.category === "TANDING").forEach(a => {
      if (a.classCategory) set.add(a.classCategory);
    });
    return Array.from(set);
  }, [athletes]);

  // Transform athletes to Bracket format
  const bracketParticipants: BracketParticipant[] = useMemo(() => {
    let list = athletes.filter(a => a.category === "TANDING");
    if (selectedClassFilter && selectedClassFilter !== "ALL") {
      list = list.filter(a => a.classCategory === selectedClassFilter);
    }
    return list.map((a, i) => ({
      id: a.id,
      name: a.name,
      club: a.contingent,
      contingent: a.contingent,
      gender: a.gender,
      seed: i + 1,
      weight: a.actualWeight || a.weightTarget,
      categoryClassId: a.classCategory
    }));
  }, [athletes, selectedClassFilter]);

  // Transform schedule matches to Bracket Matches
  const bracketMatches: BracketMatch[] = useMemo(() => {
    return displayedScheduleMatches
      .filter(m => {
        if (m.categoryType === "SENI") return false;
        if (selectedClassFilter && selectedClassFilter !== "ALL") {
          return m.kelas === selectedClassFilter;
        }
        return true;
      })
      .map(m => ({
        id: m.id,
        matchNumber: m.partai,
        stage: m.stage,
        fighterRedName: m.red,
        fighterRedClub: m.redClub,
        fighterBlueName: m.blue,
        fighterBlueClub: m.blueClub,
        status: m.status,
        arena: m.arena,
        gender: m.gender
      }));
  }, [displayedScheduleMatches, selectedClassFilter]);

  // Dedicated View for Non-Signed-In Users (Hanya menampilkan Jadwal dan Bagan tanpa menu apapun)
  if (!currentUser) {
    return (
      <div className="w-full min-h-[calc(100vh-4rem)] bg-[#070d1e] text-slate-100 p-3 sm:p-6 space-y-6 animate-fadeIn max-w-7xl mx-auto">
        {/* HEADER: KONTROL TAMPILAN BAGAN & JADWAL UNTUK PENGUNJUNG */}
        <div className="bg-[#0b1638] p-4 sm:p-5 rounded-2xl border border-blue-900/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/30 text-[10px] font-mono font-bold uppercase">
                Portal Publik
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                Gelanggang {selectedArena}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5 flex items-center gap-2.5">
              <span>Bagan & Jadwal Pertandingan</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Menampilkan jadwal partai pertandingan dan bagan bagan resmi yang telah disusun oleh panitia.
            </p>
          </div>

          {/* TAB SWITCHER KHUSUS PENGUNJUNG */}
          <div className="flex items-center gap-1.5 bg-[#070e24] p-1.5 rounded-xl border border-blue-900/50 self-start md:self-auto shrink-0">
            <button
              onClick={() => {
                sound.playClick();
                setGuestViewTab("JADWAL");
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                guestViewTab === "JADWAL"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Jadwal</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setGuestViewTab("BAGAN");
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                guestViewTab === "BAGAN"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-purple-300" />
              <span>Bagan</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setGuestViewTab("SEMUA");
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                guestViewTab === "SEMUA"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <span>Semua</span>
            </button>
          </div>
        </div>

        {/* 1. JADWAL PERTANDINGAN RESMI */}
        {(guestViewTab === "JADWAL" || guestViewTab === "SEMUA") && (
          <section id="jadwal-pertandingan" className="space-y-4 scroll-mt-20">
            <div className="bg-[#0a1329] p-4 rounded-2xl border border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-white uppercase flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Jadwal Partai Pertandingan ({displayedScheduleMatches.length} Partai)
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Susunan partai pertandingan resmi pada {selectedArena}.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                <span className="px-2.5 py-1 rounded-lg bg-blue-950/80 text-cyan-300 border border-blue-800 text-[10px] font-mono font-bold">
                  Gelanggang {selectedArena}
                </span>
                <button
                  type="button"
                  onClick={handleOpenScheduleDownloadOverlay}
                  className="flex items-center justify-center gap-1.5 bg-[#150a2b] hover:bg-purple-900/40 text-amber-300 border border-purple-800/40 py-1 px-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md"
                  title="Unduh Lembar Jadwal Pertandingan PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Unduh PDF</span>
                </button>
              </div>
            </div>

            {displayedScheduleMatches.length === 0 ? (
              <div className="text-center py-12 px-4 bg-[#09122a] border border-blue-900/50 rounded-2xl shadow-lg">
                <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-bold text-white uppercase font-mono">Belum Ada Jadwal Pertandingan</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Jadwal partai pertandingan resmi belum dibuat atau dipublikasikan oleh panitia event. Silakan pantau secara berkala.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedScheduleMatches.map((match, i) => (
                  <div 
                    key={match.id || i}
                    className="bg-[#0b1638] border border-blue-900/50 rounded-2xl p-4 shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-black text-amber-400 font-mono text-sm uppercase">{match.partai}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-950/80 text-cyan-300 border border-blue-700 font-mono">
                            {match.arena || selectedArena}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                            match.status === "SELESAI" ? "bg-blue-950 text-cyan-300 border border-cyan-800" :
                            match.status === "SEDANG" ? "bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse" :
                            "bg-slate-900 text-slate-400 border border-slate-700"
                          }`}>
                            {match.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-slate-300 font-medium mb-3 flex items-center justify-between">
                        <span>{match.kelas}</span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{match.stage}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-3">
                        <div className="border-l-3 border-blue-500 pl-2">
                          <div className="text-[10px] text-blue-400 font-mono font-bold uppercase">SUDUT BIRU</div>
                          <div className="font-bold text-white text-xs truncate">{match.blue}</div>
                          <div className="text-[9px] text-slate-400 truncate">{match.blueClub}</div>
                        </div>
                        <div className="border-l-3 border-red-500 pl-2">
                          <div className="text-[10px] text-red-400 font-mono font-bold uppercase">SUDUT MERAH</div>
                          <div className="font-bold text-white text-xs truncate">{match.red}</div>
                          <div className="text-[9px] text-slate-400 truncate">{match.redClub}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-blue-900/30">
                      <div className="text-xs font-mono font-bold text-cyan-300">
                        Status: {match.skor}
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-400">
                        Partai Resmi
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 2. BAGAN PERTANDINGAN RESMI */}
        {(guestViewTab === "BAGAN" || guestViewTab === "SEMUA") && (
          <section id="bagan-pertandingan" className="space-y-4 scroll-mt-20 pt-2">
            <BaganTandingView
              currentUser={currentUser}
              onOpenSignModal={onOpenSignModal}
              onActivateMatch={undefined}
              selectedArena={selectedArena}
              eventName="PEKAN OLAHRAGA PELAJAR DAERAH (POPDA) XVII"
              venueName="IDI RAYEUK"
              eventDates="07 S.D 12 JULI 2026"
              isGuestMode={true}
            />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#070d1e] text-slate-100 p-3 sm:p-6 space-y-6 animate-fadeIn">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0d1838] via-[#09132c] to-[#0d1838] p-4 sm:p-6 rounded-2xl border border-blue-900/50 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
              {activeSubTab === "ATLET" && "MODUL DATA ATLET & KONTINGEN"}
              {activeSubTab === "TIMBANG" && "MODUL TIMBANG BADAN (WEIGH-IN)"}
              {activeSubTab === "BAGAN" && "MODUL BAGAN PERTANDINGAN (BRACKET)"}
              {activeSubTab === "JADWAL" && "MODUL JADWAL PERTANDINGAN"}
              {activeSubTab === "MEDALI" && "MODUL KLASEMEN MEDALI KONTINGEN"}
            </span>
            <span className="text-xs text-slate-400 font-mono">Gelanggang {selectedArena}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2.5">
            {activeSubTab === "ATLET" && (
              <>
                <Users className="w-6 h-6 text-amber-400" />
                Data Atlet & Kontingen
              </>
            )}
            {activeSubTab === "TIMBANG" && (
              <>
                <Scale className="w-6 h-6 text-amber-400" />
                Timbang Badan (Weigh-In)
              </>
            )}
            {activeSubTab === "BAGAN" && (
              <>
                <GitBranch className="w-6 h-6 text-amber-400" />
                Bagan Pertandingan
              </>
            )}
            {activeSubTab === "JADWAL" && (
              <>
                <Calendar className="w-6 h-6 text-amber-400" />
                Jadwal Pertandingan
              </>
            )}
            {activeSubTab === "MEDALI" && (
              <>
                <Medal className="w-6 h-6 text-amber-400" />
                Klasemen Medali Kontingen
              </>
            )}
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            {activeSubTab === "ATLET" && `Database berkas registrasi atlet, verifikasi kontingen, dan pengelolaan peserta (${athletes.length} Atlet Terdaftar).`}
            {activeSubTab === "TIMBANG" && "Pemeriksaan berat badan aktual atlet untuk menentukan kelayakan bertanding (Sah / Diskualifikasi)."}
            {activeSubTab === "BAGAN" && (!currentUser 
              ? "Bagan pertandingan drawing sistem gugur resmi yang telah dibuat dan disusun oleh panitia event." 
              : "Visualisasi bagan drawing pertandingan sistem gugur otomatis."
            )}
            {activeSubTab === "JADWAL" && (!currentUser 
              ? `Susunan partai pertandingan resmi pada Gelanggang ${selectedArena} yang telah dibuat oleh panitia event.` 
              : `Susunan partai pertandingan silat dan alokasi partai pada Gelanggang ${selectedArena}.`
            )}
            {activeSubTab === "MEDALI" && "Rekapitulasi perolehan medali emas, perak, dan perunggu seluruh kontingen."}
          </p>
        </div>

        {activeSubTab === "ATLET" && currentUser && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setShowAddModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Atlet</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-cyan-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Ekspor</span> Excel
            </button>

            {athletes.length > 0 && (
              <button
                onClick={() => {
                  sound.playClick();
                  setShowClearAllModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-rose-950/50 cursor-pointer active:scale-95 transition-all"
                title="Hapus dan bersihkan semua data atlet yang telah didaftarkan"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Bersihkan Semua ({athletes.length})</span>
              </button>
            )}
          </div>
        )}

        {activeSubTab === "JADWAL" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenScheduleDownloadOverlay}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-purple-950/40 cursor-pointer active:scale-95 transition-all border border-purple-400/40"
              title="Unduh Lembar Jadwal Pertandingan PDF Resmi"
            >
              <Printer className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Unduh PDF Jadwal</span>
            </button>
          </div>
        )}
      </div>

      {/* 1. SUB-TAB: DATA ATLET & KONTINGEN */}
      {activeSubTab === "ATLET" && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* SEARCH & FILTERS BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-[#0a1329] p-3.5 rounded-xl border border-blue-900/40 shadow-md">
            
            {/* SEARCH */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari atlet, kontingen, kelas..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* FILTER KONTINGEN */}
            <div>
              <select
                value={selectedContingent}
                onChange={(e) => setSelectedContingent(e.target.value)}
                className="w-full py-2 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="ALL">Semua Kontingen</option>
                {contingentList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* FILTER GENDER */}
            <div>
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value as any)}
                className="w-full py-2 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="ALL">Semua Gender</option>
                <option value="PUTRA">Putra</option>
                <option value="PUTRI">Putri</option>
              </select>
            </div>

            {/* FILTER KATEGORI */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as any)}
                className="w-full py-2 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="TANDING">Tanding</option>
                <option value="SENI">Seni (TGR/Solo)</option>
              </select>
            </div>

          </div>

          {/* TABLE ATHLETES */}
          <div className="bg-[#0a1329] border border-blue-900/40 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0f1c3f] text-cyan-300 uppercase font-mono font-bold tracking-wider border-b border-blue-900/50">
                  <tr>
                    <th className="py-3 px-3 text-center">No</th>
                    <th className="py-3 px-3">Pesilat</th>
                    <th className="py-3 px-3">Kontingen & Perguruan</th>
                    <th className="py-3 px-3">Kategori & Kelas</th>
                    <th className="py-3 px-3 text-center">Timbang Badan</th>
                    <th className="py-3 px-3 text-center">Status Berkas</th>
                    <th className="py-3 px-3 text-center">Gelanggang</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/30 font-sans">
                  {filteredAthletes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-mono text-xs">
                        <Users className="w-9 h-9 text-slate-600 mx-auto mb-2 opacity-50" />
                        <p className="text-white font-bold mb-1 text-sm">
                          {athletes.length === 0 ? "Belum Ada Data Atlet Terdaftar" : "Tidak Ada Atlet yang Sesuai Filter"}
                        </p>
                        <p className="text-slate-400 text-[11px] max-w-sm mx-auto mb-3">
                          {athletes.length === 0 
                            ? "Database atlet saat ini kosong. Daftarkan atlet baru untuk otomatis membentuk bagan & jadwal pertandingan." 
                            : "Coba ubah kata kunci pencarian atau reset filter kontingen / kategori di atas."}
                        </p>
                        {athletes.length === 0 && (
                          <button
                            onClick={() => {
                              sound.playClick();
                              setShowAddModal(true);
                            }}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Tambah Atlet Baru</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredAthletes.map((athlete, idx) => (
                      <tr key={athlete.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden border border-blue-500/30 bg-slate-950 flex-shrink-0 shadow-inner">
                              <img 
                                src={athlete.photoUrl || (athlete.gender === "PUTRA" ? SILAT_AVATAR_PRESETS.PUTRA : SILAT_AVATAR_PRESETS.PUTRI)} 
                                alt={athlete.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div>
                              <div className="font-black text-white text-xs">{athlete.name}</div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                <span>{athlete.gender}</span>
                                {athlete.nik && <span>• NIK: {athlete.nik}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-amber-300">{athlete.contingent}</div>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            {athlete.region && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-950 text-cyan-300 border border-blue-800">
                                📍 {athlete.region}
                              </span>
                            )}
                            {athlete.schoolOrClub && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                                🥋 {athlete.schoolOrClub}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              athlete.category === "TANDING" 
                                ? "bg-red-500/20 text-red-300 border border-red-500/40" 
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            }`}>
                              {athlete.category}
                            </span>
                            <span className="text-slate-300 font-medium">{athlete.classCategory}</span>
                          </div>
                          {athlete.ageCategory && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Usia: {athlete.ageCategory}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            athlete.weighInStatus === "SAH" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                            athlete.weighInStatus === "OVERWEIGHT" ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" :
                            "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          }`}>
                            {athlete.actualWeight ? `${athlete.actualWeight} Kg (${athlete.weighInStatus})` : "Belum Timbang"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleToggleDocVerification(athlete.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              athlete.verifiedDocuments
                                ? "bg-emerald-600/30 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-600/50"
                                : "bg-rose-600/30 text-rose-300 border border-rose-400/40 hover:bg-rose-600/50"
                            }`}
                          >
                            {athlete.verifiedDocuments ? "✓ LENGKAP" : "✗ PENDING"}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-cyan-300">
                          Arena {athlete.arena || selectedArena}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleLaunchScoring(athlete)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow active:scale-95"
                              title={`Buka skoring untuk ${athlete.name} (${athlete.category})`}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Skoring</span>
                            </button>
                            <button
                              onClick={() => {
                                sound.playClick();
                                setAthleteToDelete(athlete);
                              }}
                              className="p-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800/60 text-rose-300 hover:text-white transition-all cursor-pointer shadow active:scale-95"
                              title={`Hapus data atlet ${athlete.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 2. SUB-TAB: TIMBANG BADAN (WEIGH-IN) */}
      {activeSubTab === "TIMBANG" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-[#0a1329] p-4 rounded-xl border border-blue-900/40 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white uppercase flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                Sesi Timbang Badan Resmi Kejuaraan
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Input berat badan atlet langsung saat penimbangan resmi untuk validasi kelayakan bertanding di kelasnya.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-cyan-400">Toleransi Berat: ±0.5 Kg</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {athletes.filter(a => a.category === "TANDING").map((athlete) => (
              <div 
                key={athlete.id}
                className="bg-[#0b1638] border border-blue-900/50 hover:border-blue-500/50 rounded-2xl p-4 shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-black text-white text-sm">{athlete.name}</h3>
                    <div className="text-xs text-amber-400 font-bold">{athlete.contingent}</div>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-950 text-cyan-300 px-2 py-0.5 rounded border border-blue-800">
                    {athlete.gender}
                  </span>
                </div>

                <div className="text-xs text-slate-300 mb-3 font-medium">
                  {athlete.classCategory}
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Target Berat:</span>
                    <span className="text-white font-bold">{athlete.weightTarget} Kg</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400 font-mono">Timbang Aktual:</label>
                    <input
                      type="number"
                      step="0.1"
                      defaultValue={athlete.actualWeight || ""}
                      placeholder="Contoh: 48.5"
                      onBlur={(e) => handleUpdateWeighIn(athlete.id, e.target.value)}
                      className="w-24 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono font-bold text-center focus:border-amber-400 focus:outline-none"
                    />
                    <span className="text-xs font-mono text-slate-400">Kg</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded text-xs font-black uppercase font-mono tracking-wider ${
                    athlete.weighInStatus === "SAH" ? "bg-emerald-600 text-white" :
                    athlete.weighInStatus === "OVERWEIGHT" ? "bg-rose-600 text-white" :
                    "bg-amber-600 text-white"
                  }`}>
                    {athlete.weighInStatus}
                  </span>
                  
                  <span className="text-[11px] font-mono text-slate-400">
                    {athlete.actualWeight ? `Selisih: ${(athlete.actualWeight - athlete.weightTarget).toFixed(1)} Kg` : "Belum diukur"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. SUB-TAB: BAGAN PERTANDINGAN (BRACKET) */}
      {activeSubTab === "BAGAN" && (
        <div className="space-y-4 animate-fadeIn">
          <BaganTandingView
            currentUser={currentUser}
            onOpenSignModal={onOpenSignModal}
            onActivateMatch={(match) => handleActivateScheduleMatch(match)}
            selectedArena={selectedArena}
            eventName="PEKAN OLAHRAGA PELAJAR DAERAH (POPDA) XVII"
            venueName="IDI RAYEUK"
            eventDates="07 S.D 12 JULI 2026"
            isGuestMode={false}
          />
        </div>
      )}

      {/* 4. SUB-TAB: JADWAL PERTANDINGAN */}
      {activeSubTab === "JADWAL" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-[#0a1329] p-4 rounded-xl border border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white uppercase flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                Jadwal Partai Pertandingan Gelanggang {selectedArena}
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {!currentUser
                  ? "Susunan nomor partai pertandingan resmi hari ini yang diselenggarakan oleh panitia event."
                  : "Susunan nomor partai hari ini. Klik 'Aktifkan & Buka Skoring' untuk langsung mengoperasikan penilaian live ke semua panel digital."}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <button
                onClick={() => {
                  sound.playClick();
                  fetchSchedules();
                  showToast("🔄 Jadwal pertandingan diperbarui.");
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-blue-500/30 text-cyan-300 text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                title="Sinkronkan Jadwal"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sinkronkan Jadwal</span>
              </button>

              <button
                type="button"
                onClick={handleOpenScheduleDownloadOverlay}
                className="flex items-center justify-center gap-1.5 bg-[#150a2b] hover:bg-purple-900/40 text-amber-300 border border-purple-800/40 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md"
                title="Unduh Lembar Jadwal Pertandingan PDF"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Unduh PDF</span>
              </button>
            </div>
          </div>

          {displayedScheduleMatches.length === 0 ? (
            <div className="text-center py-16 px-4 bg-[#09122a] border border-blue-900/50 rounded-2xl shadow-xl">
              <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-black text-white uppercase font-mono">Belum Ada Jadwal Pertandingan</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
                {!currentUser
                  ? "Jadwal partai pertandingan resmi belum dibuat atau dipublikasikan oleh panitia event untuk Gelanggang ini. Silakan pantau secara berkala."
                  : "Sistem otomatis membuatkan susunan partai pertandingan ketika atlet didaftarkan. Daftarkan atlet sekarang untuk membuat jadwal pertandingan otomatis."}
              </p>
              {currentUser && (
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Atlet Baru</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedScheduleMatches.map((match, i) => (
                <div 
                  key={match.id || i}
                  className="bg-[#0b1638] border border-blue-900/50 rounded-2xl p-4 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-amber-400 font-mono text-sm uppercase">{match.partai}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-950/80 text-cyan-300 border border-blue-700 font-mono">
                          {match.arena || selectedArena}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono ${
                          match.status === "SELESAI" ? "bg-blue-950 text-cyan-300 border border-cyan-800" :
                          match.status === "SEDANG" ? "bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse" :
                          "bg-slate-900 text-slate-400 border border-slate-700"
                        }`}>
                          {match.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-slate-300 font-medium mb-3 flex items-center justify-between">
                      <span>{match.kelas}</span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{match.stage}</span>
                    </div>

                    {/* CORNERS MATCHUP */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-3">
                      <div className="border-l-3 border-blue-500 pl-2">
                        <div className="text-[10px] text-blue-400 font-mono font-bold uppercase">SUDUT BIRU</div>
                        <div className="font-bold text-white text-xs truncate">{match.blue}</div>
                        <div className="text-[9px] text-slate-400 truncate">{match.blueClub}</div>
                      </div>
                      <div className="border-l-3 border-red-500 pl-2">
                        <div className="text-[10px] text-red-400 font-mono font-bold uppercase">SUDUT MERAH</div>
                        <div className="font-bold text-white text-xs truncate">{match.red}</div>
                        <div className="text-[9px] text-slate-400 truncate">{match.redClub}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-blue-900/30">
                    <div className="text-xs font-mono font-bold text-cyan-300">
                      Status: {match.skor}
                    </div>
                    {currentUser ? (
                      <button
                        onClick={() => handleActivateScheduleMatch(match)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/30"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Aktifkan & Buka Skoring →</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-400">
                        Partai Resmi
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. SUB-TAB: KLASEMEN MEDALI KONTINGEN */}
      {activeSubTab === "MEDALI" && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* CLASSIFICATION SELECTOR PILLS */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#0a1329] p-3.5 rounded-2xl border border-blue-900/40 shadow-md">
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase font-bold">
                Kategori Klasifikasi Klasemen Medali:
              </div>
              <div className="text-[11px] text-slate-500">
                Pilih dasar pemeringkatan perolehan medali turnamen (Emas × 5, Perak × 3, Perunggu × 1).
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  sound.playClick();
                  setMedalClassification("KONTINGEN");
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  medalClassification === "KONTINGEN"
                    ? "bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                    : "bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800"
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Kontingen</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setMedalClassification("WILAYAH");
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  medalClassification === "WILAYAH"
                    ? "bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20"
                    : "bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Asal Wilayah / Daerah</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setMedalClassification("PERGURUAN");
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  medalClassification === "PERGURUAN"
                    ? "bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20"
                    : "bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Perguruan Silat</span>
              </button>
            </div>
          </div>
          
          {/* PODIUM CARDS FOR TOP 3 */}
          {dynamicMedalStandings.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* JUARA 2 */}
              <div className="bg-[#0b1638] border border-slate-700/60 rounded-2xl p-4 text-center order-2 md:order-1 shadow-lg">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-300/20 text-slate-300 font-black text-xl flex items-center justify-center border border-slate-400/40 mb-2">
                  🥈
                </div>
                <div className="text-xs font-mono text-slate-400 uppercase">PERINGKAT 2</div>
                <div className="font-black text-white text-base mt-1">{dynamicMedalStandings[1].contingent}</div>
                <div className="flex justify-center gap-3 mt-3 text-xs font-mono">
                  <span className="text-amber-400 font-bold">{dynamicMedalStandings[1].gold} 🥇</span>
                  <span className="text-slate-300 font-bold">{dynamicMedalStandings[1].silver} 🥈</span>
                  <span className="text-amber-600 font-bold">{dynamicMedalStandings[1].bronze} 🥉</span>
                </div>
                <div className="mt-2 text-[11px] font-mono text-cyan-300">
                  Total Poin: {dynamicMedalStandings[1].totalPoints} Pts
                </div>
              </div>

              {/* JUARA 1 */}
              <div className="bg-gradient-to-b from-[#192754] to-[#0d1633] border-2 border-amber-400/60 rounded-2xl p-5 text-center order-1 md:order-2 shadow-2xl relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-widest shadow-md">
                  PEMUNCAK KLASEMEN
                </div>
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 text-amber-400 font-black text-3xl flex items-center justify-center border border-amber-400/60 mb-2 mt-1">
                  🏆
                </div>
                <div className="text-xs font-mono text-amber-300 uppercase font-black">
                  {medalClassification === "WILAYAH" ? "WILAYAH TERBAIK 1" : medalClassification === "PERGURUAN" ? "PERGURUAN TERBAIK 1" : "JUARA UMUM 1"}
                </div>
                <div className="font-black text-white text-lg mt-1">{dynamicMedalStandings[0].contingent}</div>
                <div className="flex justify-center gap-4 mt-3 text-sm font-mono">
                  <span className="text-amber-400 font-black">{dynamicMedalStandings[0].gold} 🥇</span>
                  <span className="text-slate-300 font-black">{dynamicMedalStandings[0].silver} 🥈</span>
                  <span className="text-amber-600 font-black">{dynamicMedalStandings[0].bronze} 🥉</span>
                </div>
                <div className="mt-2 text-xs font-mono text-cyan-300 font-bold">
                  Total Poin: {dynamicMedalStandings[0].totalPoints} Pts • {dynamicMedalStandings[0].totalAthletes} Atlet
                </div>
              </div>

              {/* JUARA 3 */}
              <div className="bg-[#0b1638] border border-amber-800/60 rounded-2xl p-4 text-center order-3 shadow-lg">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-700/20 text-amber-600 font-black text-xl flex items-center justify-center border border-amber-700/40 mb-2">
                  🥉
                </div>
                <div className="text-xs font-mono text-slate-400 uppercase">PERINGKAT 3</div>
                <div className="font-black text-white text-base mt-1">{dynamicMedalStandings[2].contingent}</div>
                <div className="flex justify-center gap-3 mt-3 text-xs font-mono">
                  <span className="text-amber-400 font-bold">{dynamicMedalStandings[2].gold} 🥇</span>
                  <span className="text-slate-300 font-bold">{dynamicMedalStandings[2].silver} 🥈</span>
                  <span className="text-amber-600 font-bold">{dynamicMedalStandings[2].bronze} 🥉</span>
                </div>
                <div className="mt-2 text-[11px] font-mono text-cyan-300">
                  Total Poin: {dynamicMedalStandings[2].totalPoints} Pts
                </div>
              </div>
            </div>
          )}

          {/* FULL MEDAL TABLE */}
          <div className="bg-[#0a1329] border border-blue-900/40 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0f1c3f] text-cyan-300 uppercase font-mono font-bold tracking-wider border-b border-blue-900/50">
                  <tr>
                    <th className="py-3 px-4">Peringkat</th>
                    <th className="py-3 px-4">
                      {medalClassification === "WILAYAH" && "Asal Wilayah / Provinsi"}
                      {medalClassification === "PERGURUAN" && "Perguruan Silat"}
                      {medalClassification === "KONTINGEN" && "Nama Kontingen"}
                    </th>
                    <th className="py-3 px-4 text-center">Emas 🥇</th>
                    <th className="py-3 px-4 text-center">Perak 🥈</th>
                    <th className="py-3 px-4 text-center">Perunggu 🥉</th>
                    <th className="py-3 px-4 text-center">Total Medali</th>
                    <th className="py-3 px-4 text-center">Total Atlet</th>
                    <th className="py-3 px-4 text-center">Total Poin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-900/30 font-sans">
                  {dynamicMedalStandings.map((standing, idx) => (
                    <tr key={standing.contingent} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 text-slate-400 font-mono font-bold">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-4 font-black text-white">
                        {standing.contingent}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-amber-400 text-sm">
                        {standing.gold}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-300 text-sm">
                        {standing.silver}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-600 text-sm">
                        {standing.bronze}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-white">
                        {standing.gold + standing.silver + standing.bronze}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-300">
                        {standing.totalAthletes}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-cyan-300 text-sm">
                        {standing.totalPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL: DAFTARKAN ATLET BARU (STANDAR EVENT NASIONAL IPSI) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#0a1329] border border-blue-500/40 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl animate-fadeIn space-y-5 my-6">
            
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-blue-900/40 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-black uppercase tracking-wider">
                    REGISTRASI RESMI EVENT NASIONAL
                  </span>
                  <span className="text-xs font-mono text-slate-400">IPSI / PERSILAT</span>
                </div>
                <h3 className="text-lg font-black text-white uppercase flex items-center gap-2 mt-1">
                  <Plus className="w-5 h-5 text-amber-400" />
                  Daftarkan Atlet Baru
                </h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAthlete} className="space-y-4 text-xs">
              
              {/* SECTION 1: PASFOTO ATLET & IDENTITAS UTAMA */}
              <div className="bg-[#0d1b3d] p-4 rounded-2xl border border-blue-900/50 flex flex-col sm:flex-row gap-4 items-center">
                {/* PHOTO PREVIEW & UPLOAD */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-amber-400/80 bg-slate-950 shadow-xl relative group">
                    <img 
                      src={newPhotoUrl || (newGender === "PUTRA" ? SILAT_AVATAR_PRESETS.PUTRA : SILAT_AVATAR_PRESETS.PUTRI)}
                      alt="Pasfoto Atlet"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-cyan-300 cursor-pointer transition-opacity"
                    >
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[9px] font-bold uppercase">Ganti Foto</span>
                    </div>
                  </div>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  <div className="flex flex-col gap-1 w-full">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-cyan-300 font-bold text-[10px] uppercase cursor-pointer text-center"
                    >
                      Unggah Pasfoto
                    </button>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setNewPhotoUrl(SILAT_AVATAR_PRESETS.PUTRA)}
                        className="flex-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[9px] font-mono text-slate-300 border border-slate-700 cursor-pointer"
                        title="Gunakan avatar pesilat putra"
                      >
                        Siluet ♂
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewPhotoUrl(SILAT_AVATAR_PRESETS.PUTRI)}
                        className="flex-1 px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[9px] font-mono text-slate-300 border border-slate-700 cursor-pointer"
                        title="Gunakan avatar pesilat putri"
                      >
                        Siluet ♀
                      </button>
                    </div>
                  </div>
                </div>

                {/* NAMA LENGKAP & IDENTITAS */}
                <div className="flex-grow space-y-3 w-full">
                  <div>
                    <label className="block text-slate-300 mb-1 font-mono font-bold uppercase">
                      Nama Lengkap Pesilat: <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newAthleteName}
                      onChange={(e) => setNewAthleteName(e.target.value.toUpperCase())}
                      placeholder="CONTOH: BAGAS SATRIA NUGRAHA"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold uppercase focus:border-amber-400 focus:outline-none tracking-wide"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-slate-400 mb-1 font-mono text-[10px] uppercase">
                        NIK / No. Registrasi Pesilat:
                      </label>
                      <input
                        type="text"
                        value={newNik}
                        onChange={(e) => setNewNik(e.target.value)}
                        placeholder="16 Digit NIK KTP / Kartu Atlet"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-mono text-[10px] uppercase">
                        Jenis Kelamin:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNewGender("PUTRA")}
                          className={`py-1.5 px-2 rounded-xl font-bold uppercase text-[10px] transition-all cursor-pointer border ${
                            newGender === "PUTRA"
                              ? "bg-blue-600 text-white border-blue-400 shadow-md font-black"
                              : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                          }`}
                        >
                          PUTRA ♂
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewGender("PUTRI")}
                          className={`py-1.5 px-2 rounded-xl font-bold uppercase text-[10px] transition-all cursor-pointer border ${
                            newGender === "PUTRI"
                              ? "bg-pink-600 text-white border-pink-400 shadow-md font-black"
                              : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                          }`}
                        >
                          PUTRI ♀
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: ASAL DAERAH / WILAYAH, PERGURUAN & KONTINGEN */}
              <div className="bg-[#0b1638] p-4 rounded-2xl border border-blue-900/50 space-y-3">
                <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Asal Daerah Wilayah, Perguruan & Kontingen
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* ASAL DAERAH / PROVINSI */}
                  <div>
                    <label className="block text-slate-400 mb-1 font-mono text-[10px] uppercase">
                      Asal Daerah / Wilayah: <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newRegion}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      placeholder="Ketik asal daerah / wilayah (misal: Jawa Barat, DKI Jakarta)"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>

                  {/* PERGURUAN SILAT */}
                  <div>
                    <label className="block text-slate-400 mb-1 font-mono text-[10px] uppercase">
                      Perguruan Silat:
                    </label>
                    <input
                      type="text"
                      value={newPerguruan}
                      onChange={(e) => setNewPerguruan(e.target.value)}
                      placeholder="Ketik perguruan silat (misal: Tapak Suci, PSHT, Perisai Diri)"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* NAMA KONTINGEN */}
                <div>
                  <label className="block text-slate-400 mb-1 font-mono text-[10px] uppercase">
                    Nama Kontingen Resmi: <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newContingent}
                    onChange={(e) => setNewContingent(e.target.value.toUpperCase())}
                    placeholder="Contoh: KONTINGEN JAWA BARAT"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 font-bold uppercase focus:border-amber-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* SECTION 3: KATEGORI PERTANDINGAN, USIA & KELAS */}
              <div className="bg-[#0b1638] p-4 rounded-2xl border border-blue-900/50 space-y-3">
                <div className="text-[11px] font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Kategori Perlombaan, Divisi Usia & Kelas Pertandingan
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* KATEGORI USIA */}
                  <div>
                    <label className="block text-slate-400 mb-1 font-mono text-[10px] uppercase">
                      Kategori Usia: <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={newAgeCategory}
                      onChange={(e) => setNewAgeCategory(e.target.value as AthleteAgeCategory)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-amber-400 focus:outline-none"
                    >
                      {SILAT_AGE_DIVISIONS.map((div) => (
                        <option key={div.key} value={div.key}>
                          {div.label} ({div.range})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* KATEGORI UTAMA: TANDING VS SENI */}
                  <div>
                    <label className="block text-slate-400 mb-1 font-mono text-[10px] uppercase">
                      Kategori Perlombaan: <span className="text-rose-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewCategory("TANDING")}
                        className={`py-2 px-3 rounded-xl font-black uppercase text-xs transition-all cursor-pointer border ${
                          newCategory === "TANDING"
                            ? "bg-red-600 text-white border-red-400 shadow-md shadow-red-900/30"
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        🥋 TANDING
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCategory("SENI")}
                        className={`py-2 px-3 rounded-xl font-black uppercase text-xs transition-all cursor-pointer border ${
                          newCategory === "SENI"
                            ? "bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/30"
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        🎭 SENI (TGR)
                      </button>
                    </div>
                  </div>
                </div>

                {/* JIKA KATEGORI TANDING: PILIHAN KELAS PERTANDINGAN (DROPDOWN TANPA MENGETIK) */}
                {newCategory === "TANDING" && (
                  <div className="bg-red-950/20 border border-red-900/40 p-3 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-red-300 font-mono text-[10px] uppercase font-bold">
                        Pilih Kelas Tanding (Standar IPSI): <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Disesuaikan otomatis dengan Divisi Usia {newAgeCategory}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <select
                          value={selectedTandingCode}
                          onChange={(e) => setSelectedTandingCode(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-red-500/40 rounded-xl text-white font-bold font-mono focus:border-red-400 focus:outline-none"
                        >
                          {currentAvailableTandingClasses.map((cls) => (
                            <option key={cls.code} value={cls.code}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 text-[10px] font-mono">Target BB:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={newWeightTarget}
                            onChange={(e) => setNewWeightTarget(e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-amber-300 font-mono font-bold text-center focus:outline-none focus:border-amber-400"
                          />
                          <span className="text-slate-400 text-[10px] font-mono">Kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* JIKA KATEGORI SENI: PILIHAN SUB-KATEGORI SENI (TUNGGAL BAKU, TUNGGAL BEBAS, GANDA, REGU) */}
                {newCategory === "SENI" && (
                  <div className="bg-emerald-950/20 border border-emerald-900/40 p-3 rounded-xl space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="block text-emerald-300 font-mono text-[10px] uppercase font-bold">
                        Pilihan Kategori Seni Silat: <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Format Penilaian 5 Juri PERSILAT
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {SILAT_SENI_CATEGORIES.map((seni) => (
                        <button
                          key={seni.key}
                          type="button"
                          onClick={() => setSelectedSeniSub(seni.key)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedSeniSub === seni.key
                              ? "bg-emerald-600/30 border-emerald-400 text-white shadow-lg"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white"
                          }`}
                        >
                          <div className="font-black text-xs uppercase">{seni.label}</div>
                          <div className="text-[9px] text-slate-400 leading-tight mt-1 line-clamp-2">
                            {seni.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* LIVE PREVIEW KELAS YANG AKAN TERCANTUM */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    Format Label Kelas:
                  </span>
                  <span className="text-xs font-mono font-black text-cyan-300">
                    {computedClassCategory}
                  </span>
                </div>
              </div>

              {/* SECTION 4: GELANGGANG, KONTAK & VERIFIKASI BERKAS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0d1b3d] p-3.5 rounded-2xl border border-blue-900/40">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono text-[10px] uppercase">
                    Alokasi Gelanggang:
                  </label>
                  <select
                    value={selectedModalArena}
                    onChange={(e) => setSelectedModalArena(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-400"
                  >
                    <option value="A">Gelanggang A</option>
                    <option value="B">Gelanggang B</option>
                    <option value="C">Gelanggang C</option>
                    <option value="D">Gelanggang D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-mono text-[10px] uppercase">
                    Nomor WhatsApp / HP:
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0812..."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="flex items-center sm:pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newVerifiedDocs}
                      onChange={(e) => setNewVerifiedDocs(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-300 font-medium">
                      Berkas Lengkap (KTP, Medis, Mandat)
                    </span>
                  </label>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-blue-900/40">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-950/50 flex items-center gap-2 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan & Daftarkan Atlet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS ATLET TUNGGAL */}
      {athleteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b1638] border border-rose-600/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase">Hapus Data Atlet</h3>
                <p className="text-xs text-rose-300 font-mono">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-blue-500/30 bg-slate-900 flex-shrink-0">
                  <img 
                    src={athleteToDelete.photoUrl || (athleteToDelete.gender === "PUTRA" ? SILAT_AVATAR_PRESETS.PUTRA : SILAT_AVATAR_PRESETS.PUTRI)} 
                    alt={athleteToDelete.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{athleteToDelete.name}</div>
                  <div className="text-xs text-amber-300 font-mono">{athleteToDelete.contingent}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Kategori: <strong className="text-slate-200">{athleteToDelete.category}</strong></span>
                <span>Kelas: <strong className="text-cyan-300">{athleteToDelete.classCategory}</strong></span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus data atlet ini? Bagan drawing pertandingan dan jadwal partai yang terkait akan otomatis disesuaikan dan disinkronkan ke seluruh panel digital skoring.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAthleteToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (athleteToDelete) {
                    handleDeleteAthleteConfirm(athleteToDelete);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-rose-950/50 flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Atlet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI BERSIHKAN SEMUA DATA ATLET */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0b1638] border-2 border-rose-600/70 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-7 h-7 text-rose-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-400 uppercase">Bersihkan Semua Data Atlet</h3>
                <p className="text-xs text-slate-300 font-mono">Reset Total Database Atlet & Jadwal</p>
              </div>
            </div>

            <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-3.5 text-xs text-rose-200 leading-relaxed font-mono">
              ⚠️ <strong>PERINGATAN KRUSIAL:</strong> Tindakan ini akan menghapus <strong>{athletes.length} atlet</strong> yang telah terdaftar, mengosongkan seluruh bagan pertandingan, serta mereset jadwal partai di semua panel penilaian digital (Wasit Juri, Dewan, dan Sekretaris).
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Gunakan fitur ini jika ingin memulai turnamen baru dari awal atau membersihkan data registrasi dummy/latihan. Pastikan Anda telah melakukan ekspor data (Excel/CSV) jika masih memerlukan arsip.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAllAthletesConfirm}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-rose-950/60 flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Bersihkan Semua ({athletes.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY PILIHAN JADWAL UNTUK DIUNDUH (IDENTIK DENGAN PANEL SEKRETARIS) */}
      {showScheduleDownloadOverlay && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#110724] border-2 border-purple-500/30 rounded-2xl w-full max-w-lg shadow-[0_20px_60px_rgba(93,30,196,0.45)] flex flex-col overflow-hidden animate-fadeIn">
            
            <div className="bg-gradient-to-r from-purple-950/80 to-indigo-950/80 px-6 py-5 border-b border-purple-900/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#facc15]/10 p-2.5 rounded-xl border border-[#facc15]/20 shrink-0">
                  <Printer className="w-5 h-5 text-[#facc15] animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sans font-black text-sm uppercase tracking-wider text-[#f8fafc]">
                    Cetak Jadwal Pertandingan
                  </h3>
                  <p className="text-[10px] text-purple-300/60 font-medium font-sans">
                    Pilih babak (tahapan) yang ingin diekspor ke PDF resmi
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setShowScheduleDownloadOverlay(false);
                }}
                className="w-8 h-8 rounded-lg bg-purple-950/40 border border-purple-500/20 hover:border-purple-400 text-purple-400 hover:text-white flex items-center justify-center cursor-pointer transition-all font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <span className="text-[9.5px] font-black text-[#facc15] uppercase tracking-widest leading-none font-sans">
                📍 PILIHAN BABAK PERTANDINGAN
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { value: "ALL", label: "SEMUA TAHAPAN", desc: "Seluruh babak lengkap" },
                  { value: "PENYISIHAN", label: "BABAK PENYISIHAN", desc: "Hanya babak kualifikasi awal" },
                  { value: "PEREMPAT FINAL", label: "PEREMPAT FINAL", desc: "Fase 8 besar pesilat" },
                  { value: "SEMIFINAL", label: "BABAK SEMIFINAL", desc: "Fase 4 besar perebutan final" },
                  { value: "FINAL", label: "GRAND FINAL", desc: "Pertandingan perebutan Juara 1" }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      sound.playClick();
                      setOverlaySelectedStage(opt.value);
                    }}
                    className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col gap-1 ${
                      overlaySelectedStage === opt.value
                        ? "bg-[#31185a] border-amber-500 shadow-[0_0_15px_rgba(250,204,21,0.15)]"
                        : "bg-[#161029] border-purple-900/30 hover:border-purple-600 hover:bg-[#20153c]"
                    }`}
                  >
                    <span className={`text-[11.5px] font-black leading-none font-sans ${overlaySelectedStage === opt.value ? 'text-amber-400' : 'text-slate-100'}`}>
                      {opt.label}
                    </span>
                    <span className="text-[9px] text-slate-400/80 font-bold font-sans block leading-none">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>

              {/* GELANGGANG / ARENA FILTER SELECTION */}
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black text-sky-400 uppercase tracking-widest leading-none font-sans">
                    🏟️ PILIHAN JADWAL PER GELANGGANG
                  </span>
                  <span className="text-[9px] text-purple-300/70 font-mono font-bold">
                    {availableGelanggangList.length} GELANGGANG TERSEDIA
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setOverlaySelectedGelanggang("ALL");
                    }}
                    className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      overlaySelectedGelanggang === "ALL"
                        ? "bg-sky-950/80 border-sky-400 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.25)]"
                        : "bg-[#161029] border-purple-900/30 hover:border-purple-600 text-slate-300"
                    }`}
                  >
                    <span className="text-[11px] font-black leading-none font-sans">SEMUA GELANGGANG</span>
                    <span className="text-[8.5px] text-slate-400 font-medium">Gabungan seluruh partai</span>
                  </button>

                  {availableGelanggangList.map((g) => {
                    const count = (schedules.length > 0 ? schedules : displayedScheduleMatches).filter(m => {
                      const arenaMatch = (m.arena || "GELANGGANG A").trim().toUpperCase();
                      const norm = arenaMatch.startsWith("GELANGGANG") ? arenaMatch : `GELANGGANG ${arenaMatch}`;
                      return norm === g;
                    }).length;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setOverlaySelectedGelanggang(g);
                        }}
                        className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          overlaySelectedGelanggang === g
                            ? "bg-sky-950/80 border-sky-400 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.25)]"
                            : "bg-[#161029] border-purple-900/30 hover:border-purple-600 text-slate-300"
                        }`}
                      >
                        <span className="text-[11px] font-black leading-none font-sans">{g}</span>
                        <span className="text-[8.5px] text-sky-400 font-mono font-bold">{count} Partai</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AUTO-RESOLUTION CONFIRMATION BANNER */}
              <div className="bg-[#1a1233] border border-emerald-950/30 p-3.5 rounded-xl flex items-start gap-2.5 mt-1 select-none">
                <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 text-emerald-400 shrink-0">
                  <span className="text-xs">🔄</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black tracking-widest text-[#10b981] uppercase leading-none font-sans">
                    GENERASI LANJUTAN OTOMATIS AKTIF
                  </span>
                  <p className="text-[9.5px] text-slate-400 font-bold font-sans mt-1.5 leading-normal">
                    Pemenang babak penyisihan & semifinal secara otomatis diteruskan ke babak berikutnya & Grand Final di dalam PDF & sistem pertandingan multi-gelanggang.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-purple-950/20 border-t border-purple-900/10 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowScheduleDownloadOverlay(false);
                  downloadAllGelanggangSeparately(overlaySelectedStage);
                }}
                className="px-3.5 py-2 bg-sky-950/70 hover:bg-sky-900/80 text-sky-300 border border-sky-600/40 rounded-xl text-[9.5px] uppercase font-black tracking-wider flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-all"
                title="Unduh berkas PDF terpisah untuk tiap-tiap gelanggang secara berurutan"
              >
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Unduh Semua Per Gelanggang</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowScheduleDownloadOverlay(false);
                  }}
                  className="px-3.5 py-2 hover:underline text-slate-300 font-black text-[10px] uppercase tracking-wider cursor-pointer bg-transparent border-none outline-none"
                >
                  Batal
                </button>

                <button
                  onClick={() => {
                    setShowScheduleDownloadOverlay(false);
                    executeDownloadSchedulePdf(overlaySelectedStage, overlaySelectedGelanggang);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[10.5px] uppercase font-black tracking-widest flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all duration-150 border-none font-sans"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>MULAI UNDUH PDF {overlaySelectedGelanggang !== "ALL" ? `(${overlaySelectedGelanggang})` : ""}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION NOTIFIKASI SINKRONISASI */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#091533] border border-blue-500/50 text-white text-xs font-mono py-2.5 px-4 rounded-xl shadow-2xl flex items-center gap-2 animate-slideUp">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}
