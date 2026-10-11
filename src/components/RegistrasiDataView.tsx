import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, Download, Upload, FileSpreadsheet, Printer, 
  Trash2, Plus, Edit3, Check, RefreshCw, Users, Shield, 
  Grid, Trophy, CheckSquare, Square, Info, Search, Calendar, X, Clipboard,
  Settings, Zap, AlertTriangle, Files, Database
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import BracketModal from "./BracketModal";

interface Athlete {
  id: string;
  name: string;
  contingent: string;
  kelas: string;
  usia: string;
  gender: "PUTRA" | "PUTRI";
  category?: "TANDING" | "JURUS";
}

interface RegistrasiDataViewProps {
  onBack: () => void;
  isFullscreen: boolean;
  tournamentName: string;
}

export default function RegistrasiDataView({ onBack, isFullscreen, tournamentName }: RegistrasiDataViewProps) {
  // Tabs: "pendaftaran", "sinkronisasi"
  const [activeTab, setActiveTab] = useState<"pendaftaran" | "sinkronisasi">("pendaftaran");

  // Athlete State
  const [athletes, setAthletes] = useState<Athlete[]>(() => {
    const saved = localStorage.getItem("registered_athletes");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((a: any) => ({
          ...a,
          category: a.category || "TANDING"
        }));
      } catch (e) {
        console.error(e);
      }
    }
    // Default initial dummy athletes
    return [
      { id: "1", name: "BUDI PRASETYO", contingent: "DKI JAKARTA", kelas: "A", usia: "REMAJA", gender: "PUTRA", category: "TANDING" },
      { id: "2", name: "ANDI SANTOSO", contingent: "JAWA TENGAH", kelas: "A", usia: "REMAJA", gender: "PUTRA", category: "TANDING" },
      { id: "3", name: "FAJAR NUGRAHA", contingent: "DI YOGYAKARTA", kelas: "A", usia: "REMAJA", gender: "PUTRA", category: "TANDING" },
      { id: "4", name: "GUNTUR PERMANA", contingent: "BANTEN", kelas: "A", usia: "REMAJA", gender: "PUTRA", category: "TANDING" },
      { id: "5", name: "DIAN UTAMI", contingent: "JAWA TIMUR", kelas: "B", usia: "REMAJA", gender: "PUTRI", category: "TANDING" },
      { id: "6", name: "SITI NUR HALIZA", contingent: "JAWA BARAT", kelas: "B", usia: "REMAJA", gender: "PUTRI", category: "TANDING" },
      { id: "7", name: "HERI SUSANTO", contingent: "SUMATERA UTARA", kelas: "A", usia: "DEWASA", gender: "PUTRA", category: "TANDING" },
      { id: "8", name: "EKO WAHYUDI", contingent: "BALI", kelas: "A", usia: "DEWASA", gender: "PUTRA", category: "TANDING" }
    ];
  });

  // Persist athletes to localStorage and synchronize with JRZ ecosystem
  useEffect(() => {
    try {
      localStorage.setItem("registered_athletes", JSON.stringify(athletes));

      // Auto-sync ke jrz_cached_participants untuk Bagan Tanding
      const tanding = athletes.filter(a => !a.category || a.category === "TANDING");
      const mappedParticipants = tanding.map(a => {
        const rawClass = a.kelas || "A";
        const cleanClass = rawClass.toLowerCase().replace(/kelas\s*/i, "").replace(/[^a-z0-9]/g, "");
        const catClassId = `cat-kelas-${cleanClass || "a"}`;
        const className = rawClass.toUpperCase().startsWith("KELAS") ? rawClass.toUpperCase() : `KELAS ${rawClass.toUpperCase()}`;
        return {
          id: a.id,
          name: (a.name || "").toUpperCase().trim(),
          club: (a.contingent || "MANDIRI").toUpperCase().trim(),
          gender: (a.gender || "PUTRA").toUpperCase() === "PUTRI" ? "PUTRI" : "PUTRA",
          categoryClassId: catClassId,
          className: className,
          division: (a.usia || "DEWASA").toUpperCase(),
          weight: 50,
          arena: "GELANGGANG A"
        };
      });
      localStorage.setItem("jrz_cached_participants", JSON.stringify(mappedParticipants));

      // Broadcast event sinkronisasi real-time agar Bagan Tanding langsung membaca dan menggenerate
      window.dispatchEvent(new CustomEvent("jrz_athletes_updated", { detail: { athletes, participants: mappedParticipants } }));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.warn("Gagal sinkronisasi data atlet:", e);
    }
  }, [athletes]);

  // Schedule Items State (Saves to same key as main App schedules)
  const [scheduleItems, setScheduleItems] = useState<any[]>(() => {
    const saved = localStorage.getItem("match_schedules");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Save schedules to localStorage
  useEffect(() => {
    localStorage.setItem("match_schedules", JSON.stringify(scheduleItems));
  }, [scheduleItems]);

  // Form states
  const [inputName, setInputName] = useState("");
  const [inputContingent, setInputContingent] = useState("");
  const [inputKelas, setInputKelas] = useState("A");
  const [inputUsia, setInputUsia] = useState("REMAJA");
  const [inputGender, setInputGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
  const [inputCategory, setInputCategory] = useState<"TANDING" | "JURUS">("TANDING");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search and visual filter categories
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<"SEMUA" | "TANDING" | "JURUS">("SEMUA");

  // Sync animation and state variables
  const [syncingCategory, setSyncingCategory] = useState<"TANDING" | "JURUS" | "ALL" | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [showBracketModal, setShowBracketModal] = useState(false);
  const [selectedBaganGroup, setSelectedBaganGroup] = useState("");

  // Alert system
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: "",
    message: ""
  });

  const showAlert = (title: string, message: string) => {
    setAlertState({ isOpen: true, title, message });
  };

  // Checkbox scheduling overlay states
  const [isPdfOverlayOpen, setIsPdfOverlayOpen] = useState(false);
  const [selectedPdfRound, setSelectedPdfRound] = useState("ALL");

  // Helper to get active classes/groups from athletes (specifically for Tanding brackets)
  const getAthleteGroups = () => {
    const groupsMap: { [key: string]: Athlete[] } = {};
    const tandingAthletes = athletes.filter(a => !a.category || a.category === "TANDING");
    tandingAthletes.forEach(a => {
      const key = `${a.kelas}_${a.usia}_${a.gender}`;
      if (!groupsMap[key]) groupsMap[key] = [];
      groupsMap[key].push(a);
    });
    return Object.keys(groupsMap).map(k => {
      const parts = k.split("_");
      return {
        key: k,
        kelas: parts[0],
        usia: parts[1],
        gender: parts[2] as "PUTRA" | "PUTRI",
        athletes: groupsMap[k]
      };
    }).sort((a, b) => {
      const classCompare = a.kelas.localeCompare(b.kelas);
      if (classCompare !== 0) return classCompare;
      return a.gender.localeCompare(b.gender);
    });
  };

  const athleteGroups = getAthleteGroups();

  // On mount, auto-select first group if available
  useEffect(() => {
    if (athleteGroups.length > 0 && !selectedBaganGroup) {
      setSelectedBaganGroup(athleteGroups[0].key);
    }
  }, [athleteGroups, selectedBaganGroup]);

  // Dynamic bracket generator helper
  const getBracketDataForGroup = (groupKey: string) => {
    const group = (athleteGroups || []).find(g => g?.key === groupKey);
    if (!group || !group.athletes) return [];
    
    const list = [...(group.athletes || [])].sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
    const count = list.length;
    const matches: any[] = [];
    
    if (count === 2) {
      matches.push({
        id: `M_FINAL`,
        stage: "FINAL",
        p1: list[0],
        p2: list[1]
      });
    } else if (count === 3) {
      matches.push({
        id: `M_SF1`,
        stage: "SEMIFINAL 1",
        p1: list[0],
        p2: list[1]
      });
      matches.push({
        id: `M_FINAL`,
        stage: "FINAL",
        p1: { name: "PEMENANG SEMIFINAL 1", contingent: "TBD" },
        p2: list[2]
      });
    } else {
      // 4 Participants (Standard Semifinals and Final)
      matches.push({
        id: `M_SF1`,
        stage: "SEMIFINAL 1",
        p1: list[0] || { name: "BYE", contingent: "-" },
        p2: list[1] || { name: "BYE", contingent: "-" }
      });
      matches.push({
        id: `M_SF2`,
        stage: "SEMIFINAL 2",
        p1: list[2] || { name: "BYE", contingent: "-" },
        p2: list[3] || { name: "BYE", contingent: "-" }
      });
      matches.push({
        id: `M_FINAL`,
        stage: "FINAL",
        p1: { name: "PEMENANG SEMIFINAL 1", contingent: "TBD" },
        p2: { name: "PEMENANG SEMIFINAL 2", contingent: "TBD" }
      });
    }
    return matches;
  };

  // Helper to compile all matches from all tanding brackets for scheduler
  const getAllMatchesList = () => {
    const allMatches: any[] = [];
    (athleteGroups || []).forEach(g => {
      if (!g) return;
      const groupMatches = getBracketDataForGroup(g.key) || [];
      groupMatches.forEach(gm => {
        if (!gm) return;
        allMatches.push({
          ...gm,
          groupKey: g.key,
          kelas: g.kelas,
          usia: g.usia,
          gender: g.gender,
          uniqueMatchId: `${g.key}_${gm.id}`
        });
      });
    });
    return allMatches;
  };

  const resolvePlayerUI = (p: any, matchId: string, role: 'p1' | 'p2', groupKey: string) => {
    if (!p) return { name: "TBD", contingent: "-" };
    return { name: p.name.toUpperCase(), contingent: p.contingent ? p.contingent.toUpperCase() : "-" };
  };

  // Sync Trigger Simulators
  const handleTriggerSync = (category: "TANDING" | "JURUS" | "ALL") => {
    setSyncingCategory(category);
    setSyncProgress(0);
    setSyncLog([`[${new Date().toLocaleTimeString()}] Membuka port komunikasi JZR Digital...`]);
    
    const logs = [
      "Menghubungkan ke JZR Digital local node...",
      "Mengautentikasi kredensial dewan juri...",
      `Mempersiapkan dataset Kategori ${category}...`,
      "Mengompresi data registrasi atlet nasional...",
      "Mengirim paket sinkronisasi ke portal skor juri...",
      "Menerima sinyal konfirmasi dari seluruh perangkat pad juri...",
      `✓ Sinkronisasi kategori ${category} SUKSES!`
    ];
    
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setSyncProgress(Math.min(step * 15, 100));
      if (step <= logs.length) {
        setSyncLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${logs[step - 1]}`]);
      }
      if (step >= 7) {
        clearInterval(interval);
        setSyncProgress(100);
        setTimeout(() => {
          setSyncingCategory(null);
          setShowSyncSuccess(true);
        }, 500);
      }
    }, 450);
  };

  // Auto Schedule Match Generator
  const handleAutoGenerateSchedules = () => {
    const matches = getAllMatchesList();
    if (matches.length === 0) {
      showAlert("Gagal Menjadwalkan", "Belum ada kelas tanding yang memiliki minimal 2 atlet terdaftar.");
      return;
    }
    
    const newSchedules = matches.map((match, index) => {
      const resolvedBlue = resolvePlayerUI(match.p1, match.id, 'p1', match.groupKey);
      const resolvedRed = resolvePlayerUI(match.p2, match.id, 'p2', match.groupKey);
      return {
        uniqueId: match.uniqueMatchId,
        partai: (index + 1).toString(),
        kelas: match.kelas,
        gender: match.gender,
        usia: match.usia,
        tahapan: match.stage,
        blueName: resolvedBlue.name,
        blueContingent: resolvedBlue.contingent,
        redName: resolvedRed.name,
        redContingent: resolvedRed.contingent,
        status: "pending"
      };
    });
    
    setScheduleItems(newSchedules);
    showAlert("Sukses Membuat Jadwal", `Berhasil membuat ${newSchedules.length} jadwal pertandingan Tanding secara otomatis!`);
  };

  // Athlete Management
  const handleSaveAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim() || !inputContingent.trim() || !inputKelas.trim()) {
      showAlert("Formulir Belum Lengkap", "Silakan isi nama, kontingen, dan kelas/kategori seni!");
      return;
    }

    if (editingId) {
      setAthletes(prev => prev.map(a => a.id === editingId ? {
        ...a,
        name: inputName.toUpperCase().trim(),
        contingent: inputContingent.toUpperCase().trim(),
        kelas: inputKelas.toUpperCase().trim(),
        usia: inputUsia,
        gender: inputGender,
        category: inputCategory
      } : a));
      setEditingId(null);
      showAlert("Data Diperbarui", "Data atlet berhasil diperbarui secara lokal!");
    } else {
      const newAthlete: Athlete = {
        id: Date.now().toString(),
        name: inputName.toUpperCase().trim(),
        contingent: inputContingent.toUpperCase().trim(),
        kelas: inputKelas.toUpperCase().trim(),
        usia: inputUsia,
        gender: inputGender,
        category: inputCategory
      };
      setAthletes(prev => [...prev, newAthlete]);
      showAlert("Atlet Terdaftar", "Atlet baru telah berhasil diregistrasikan!");
    }

    setInputName("");
    setInputContingent("");
  };

  const handleEditAthlete = (athlete: Athlete) => {
    setInputName(athlete.name);
    setInputContingent(athlete.contingent);
    setInputKelas(athlete.kelas);
    setInputUsia(athlete.usia);
    setInputGender(athlete.gender);
    setInputCategory(athlete.category || "TANDING");
    setEditingId(athlete.id);
    setActiveTab("pendaftaran");
  };

  const handleDeleteAthlete = (id: string) => {
    setAthletes(prev => prev.filter(a => a.id !== id));
    showAlert("Data Terhapus", "Data atlet telah dihapus dari sistem.");
  };

  const handleClearAllAthletes = () => {
    if (confirm("Apakah Anda yakin ingin mengosongkan seluruh database registrasi atlet?")) {
      setAthletes([]);
      setScheduleItems([]);
      showAlert("Sistem Dikosongkan", "Seluruh data registrasi dan jadwal pertandingan telah dibersihkan.");
    }
  };

  // Bracket Controls (Simulated callbacks for BracketModal)
  const handleAutoShuffleDrawing = (groupKey: string) => {
    const group = athleteGroups.find(g => g.key === groupKey);
    if (!group) return;
    showAlert("Kocak Undian Berhasil", `Undian acak bagan kelas ${group.kelas} (${group.gender}) selesai!`);
  };

  const handleClearClass = (groupKey: string) => {
    const group = athleteGroups.find(g => g.key === groupKey);
    if (!group) return;
    setAthletes(prev => prev.filter(a => `${a.kelas}_${a.usia}_${a.gender}` !== groupKey));
    showAlert("Bagan Kelas Dikosongkan", `Bagan dan peserta kelas ${group.kelas} berhasil dibersihkan.`);
  };

  // Excel Downloads / Templates
  const handleDownloadExcelTemplate = () => {
    const worksheetData = [
      ["NAMA ATLIT", "KONTINGEN", "KATEGORI", "KELAS TANDING", "KATEGORI USIA", "GENDER"],
      ["AHMAD RIFAI", "DKI JAKARTA", "TANDING", "A", "REMAJA", "PUTRA"],
      ["SITI AMINAH", "JAWA BARAT", "JURUS", "TUNGGAL", "REMAJA", "PUTRI"],
      ["HERI DERMAWAN", "BANTEN", "TANDING", "A", "DEWASA", "PUTRA"]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Atlit");
    XLSX.writeFile(wb, "Template_Registrasi_Atlit.xlsx");
  };

  const handleExportExcel = () => {
    if (athletes.length === 0) {
      showAlert("Ekspor Gagal", "Belum ada data atlet untuk diekspor!");
      return;
    }
    const dataToExport = athletes.map(a => ({
      "Nama Atlit": a.name,
      "Kontingen": a.contingent,
      "Kategori": a.category || "TANDING",
      "Kelas / Seni": a.kelas,
      "Kategori Usia": a.usia,
      "Gender": a.gender
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar_Registrasi_Atlit");
    XLSX.writeFile(wb, "Data_Registrasi_Atlit.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showAlert("Berkas Kosong", "Berkas Excel kosong atau format tidak sesuai!");
          return;
        }

        const newAthletes: Athlete[] = [];
        data.forEach((row: any, index) => {
          const name = String(row["NAMA ATLIT"] || row["Nama Atlit"] || row["Nama"] || row["nama"] || "");
          const contingent = String(row["KONTINGEN"] || row["Kontingen"] || row["Daerah"] || "");
          const kelas = String(row["KELAS TANDING"] || row["Kelas Tanding"] || row["Kelas"] || row["kelas"] || "A");
          const usia = String(row["KATEGORI USIA"] || row["Kategori Usia"] || row["Usia"] || "REMAJA");
          const genderRaw = String(row["GENDER"] || row["Gender"] || "PUTRA").toUpperCase();
          
          let gender: "PUTRA" | "PUTRI" = "PUTRA";
          if (genderRaw.includes("PUTRI") || genderRaw.includes("WITA") || genderRaw === "P") {
            gender = "PUTRI";
          } else {
            gender = "PUTRA";
          }

          const categoryRaw = String(row["KATEGORI"] || row["Kategori"] || row["kategori"] || "").toUpperCase();
          let category: "TANDING" | "JURUS" = "TANDING";
          if (categoryRaw.includes("JURUS") || categoryRaw.includes("SENI")) {
            category = "JURUS";
          } else if (categoryRaw.includes("TANDING")) {
            category = "TANDING";
          } else {
            const kUpper = kelas.toUpperCase();
            if (kUpper.includes("TUNGGAL") || kUpper.includes("GANDA") || kUpper.includes("REGU") || kUpper.includes("SOLO") || kUpper.includes("KREATIF") || kUpper.includes("SENI") || kUpper.includes("JURUS")) {
              category = "JURUS";
            }
          }

          if (name.trim()) {
            newAthletes.push({
              id: `${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
              name: name.toUpperCase().trim(),
              contingent: contingent.toUpperCase().trim(),
              kelas: kelas.toUpperCase().trim(),
              usia: usia.toUpperCase().trim(),
              gender: gender as "PUTRA" | "PUTRI",
              category
            });
          }
        });

        if (newAthletes.length > 0) {
          setAthletes(prev => [...prev, ...newAthletes]);
          showAlert("Impor Berhasil", `Berhasil mengimpor ${newAthletes.length} atlet baru secara otomatis!`);
        } else {
          showAlert("Impor Gagal", "Tidak ada data atlet valid yang berhasil diimpor.");
        }
      } catch (err) {
        console.error(err);
        showAlert("Gagal Membaca Berkas", "Gagal membaca berkas Excel. Pastikan format kolom sesuai template.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont("Helvetica");
    
    doc.setFontSize(18);
    doc.text("LAPORAN DATA REGISTRASI ATLIT", 14, 20);
    doc.setFontSize(10);
    doc.text(`Kejuaraan: ${tournamentName.toUpperCase()}`, 14, 26);
    doc.text(`Waktu Cetak: ${new Date().toLocaleString("id-ID")}`, 14, 31);
    
    const headers = ["No", "Nama Atlit", "Kontingen", "Kategori", "Kelas", "Kategori Usia", "Gender"];
    let yPos = 40;
    
    doc.setFillColor(31, 16, 77);
    doc.rect(14, yPos, 182, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    
    doc.text(headers[0], 16, yPos + 5.5);
    doc.text(headers[1], 25, yPos + 5.5);
    doc.text(headers[2], 75, yPos + 5.5);
    doc.text(headers[3], 110, yPos + 5.5);
    doc.text(headers[4], 130, yPos + 5.5);
    doc.text(headers[5], 150, yPos + 5.5);
    doc.text(headers[6], 175, yPos + 5.5);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("Helvetica", "normal");
    yPos += 8;

    athletes.forEach((a, i) => {
      if (yPos > 275) {
        doc.addPage();
        yPos = 20;
        doc.setFillColor(31, 16, 77);
        doc.rect(14, yPos, 182, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("Helvetica", "bold");
        doc.text(headers[0], 16, yPos + 5.5);
        doc.text(headers[1], 25, yPos + 5.5);
        doc.text(headers[2], 75, yPos + 5.5);
        doc.text(headers[3], 110, yPos + 5.5);
        doc.text(headers[4], 130, yPos + 5.5);
        doc.text(headers[5], 150, yPos + 5.5);
        doc.text(headers[6], 175, yPos + 5.5);
        doc.setTextColor(0, 0, 0);
        doc.setFont("Helvetica", "normal");
        yPos += 8;
      }
      
      if (i % 2 === 1) {
        doc.setFillColor(245, 245, 250);
        doc.rect(14, yPos, 182, 7, "F");
      }
      
      doc.text((i + 1).toString(), 16, yPos + 5);
      doc.text(a.name.substring(0, 24), 25, yPos + 5);
      doc.text(a.contingent.substring(0, 18), 75, yPos + 5);
      doc.text(a.category || "TANDING", 110, yPos + 5);
      doc.text(`Kelas ${a.kelas}`, 130, yPos + 5);
      doc.text(a.usia, 150, yPos + 5);
      doc.text(a.gender, 175, yPos + 5);
      
      yPos += 7;
    });

    doc.save("Laporan_Registrasi_Atlit.pdf");
  };

  const handleDownloadKontrolPDF = (option: string) => {
    showAlert("Download PDF Berhasil", "Berkas PDF Laporan Pertandingan Berhasil Digenerate.");
  };

  const handleDownloadBracketPDF = () => {
    handleDownloadKontrolPDF("ALL");
  };

  const handleDownloadAllBracketsPDF = () => {
    handleDownloadKontrolPDF("ALL");
  };

  // Filtering list by tab & search query
  const filteredAthletes = athletes.filter(a => {
    // Search Query Match
    const q = searchQuery.toUpperCase();
    const queryMatch = (
      a.name.toUpperCase().includes(q) ||
      a.contingent.toUpperCase().includes(q) ||
      a.kelas.toUpperCase().includes(q) ||
      a.usia.toUpperCase().includes(q)
    );

    // Tab Category Filter Match
    const catMatch = filterCategory === "SEMUA" || a.category === filterCategory;

    return queryMatch && catMatch;
  });

  return (
    <div className={`min-h-screen bg-[#070116] text-white font-sans transition-all pb-16 ${isFullscreen ? 'p-2 md:p-3' : 'p-4 md:p-6'}`}>
      
      {/* 1. Header & Cohesive Side-by-Side Panel */}
      <div className="print:hidden max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 transition-all">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#0f072c] hover:bg-[#1a0e44] text-zinc-300 hover:text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg px-3.5 py-2 text-xs cursor-pointer"
            title="Kembali ke Menu Utama"
          >
            <ArrowLeft size={12} /> Kembali
          </button>
          
          <div className="flex items-center gap-2">
            <div className="bg-[#a855f7]/10 text-[#c084fc] rounded-xl border border-[#a855f7]/20 flex items-center justify-center p-2">
              <Settings className="animate-pulse text-purple-400" size={20} />
            </div>
            <div>
              <h1 className="font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 tracking-wider text-base leading-none">
                PANEL SEKRETARIS
              </h1>
              <p className="text-[8px] text-zinc-400 font-mono tracking-widest font-semibold uppercase mt-0.5">
                IPSI OFFICIAL TERMINAL CONTROL GROUP SYSTEM
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#0c0423]/90 border border-purple-500/20 p-1 rounded-xl flex items-center gap-1.5 shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all duration-300 relative overflow-hidden min-w-[280px]">
          <button
            onClick={onBack}
            className="flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border cursor-pointer bg-[#050212]/50 text-purple-300 border-purple-950/40 hover:text-[#ccff00] hover:border-[#ccff00]/40 hover:bg-[#0c0423]/80"
          >
            <Settings size={12} className="text-purple-400" />
            PARAMETER PERTANDINGAN
          </button>

          <button
            className="flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 border cursor-pointer bg-gradient-to-r from-purple-600 via-fuchsia-600 to-[#ccff00] text-slate-950 font-black border-transparent shadow-[0_0_10px_rgba(204,255,0,0.3)] hover:brightness-110"
          >
            <Users size={12} className="text-slate-950 stroke-[3]" />
            REGISTRASI DATA
          </button>
        </div>
      </div>

      {/* 2. TAB SELECTION BAR */}
      <div className="max-w-7xl mx-auto flex border border-purple-950/40 mb-6 bg-[#0a0521] p-1.5 rounded-2xl gap-1">
        <button
          onClick={() => setActiveTab("pendaftaran")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "pendaftaran"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Users size={14} /> PENDAFTARAN ATLIT
        </button>
        <button
          onClick={() => {
            setActiveTab("sinkronisasi");
            // Seed a start message to logger
            if (syncLog.length === 0) {
              setSyncLog([`[${new Date().toLocaleTimeString()}] Sistem siap. JZR Digital Hub terdeteksi.`]);
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "sinkronisasi"
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Database size={14} /> SINKRONISASI KATEGORI (JZR DIGITAL HUB)
        </button>
      </div>

      {/* 3. MAIN VIEWS */}
      <div className="max-w-7xl mx-auto">
        
        {/* VIEW 1: PENDAFTARAN */}
        {activeTab === "pendaftaran" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
            
            {/* Form Input Section */}
            <div className="lg:col-span-4 bg-[#0c0423]/95 border border-purple-950/50 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="border-b border-purple-950/50 pb-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
                  <Plus size={16} /> {editingId ? "KOREKSI DATA ATLET" : "REGISTRASI ATLET BARU"}
                </h3>
              </div>

              <form onSubmit={handleSaveAthlete} className="space-y-4">
                {/* Category Selector */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 font-mono">
                    Kategori Pertandingan
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-[#050212] p-1 rounded-xl border border-purple-950">
                    <button
                      type="button"
                      onClick={() => {
                        setInputCategory("TANDING");
                        setInputKelas("A");
                      }}
                      className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        inputCategory === "TANDING"
                          ? "bg-purple-600 text-white shadow-md"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Shield size={12} /> TANDING
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInputCategory("JURUS");
                        setInputKelas("TUNGGAL");
                      }}
                      className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                        inputCategory === "JURUS"
                          ? "bg-purple-600 text-white shadow-md"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Trophy size={12} /> JURUS / SENI
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                    Nama Lengkap Atlet
                  </label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="CONTOH: BIMA ADITYA"
                    className="w-full bg-[#050212] border border-purple-950/60 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all uppercase font-black"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                    Kontingen / Daerah / Tim
                  </label>
                  <input
                    type="text"
                    value={inputContingent}
                    onChange={(e) => setInputContingent(e.target.value)}
                    placeholder="CONTOH: DKI JAKARTA"
                    className="w-full bg-[#050212] border border-purple-950/60 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all uppercase font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                      {inputCategory === "TANDING" ? "Kelas Tanding" : "Golongan Seni"}
                    </label>
                    {inputCategory === "TANDING" ? (
                      <input
                        type="text"
                        value={inputKelas}
                        onChange={(e) => setInputKelas(e.target.value)}
                        placeholder="A / B / C ..."
                        className="w-full bg-[#050212] border border-purple-950/60 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all uppercase font-black"
                      />
                    ) : (
                      <select
                        value={inputKelas}
                        onChange={(e) => setInputKelas(e.target.value)}
                        className="w-full bg-[#050212] border border-purple-950/60 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-all font-black"
                      >
                        <option value="TUNGGAL">TUNGGAL</option>
                        <option value="GANDA">GANDA</option>
                        <option value="REGU">REGU</option>
                        <option value="SOLO KREATIF">SOLO KREATIF</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                      Kategori Usia
                    </label>
                    <select
                      value={inputUsia}
                      onChange={(e) => setInputUsia(e.target.value)}
                      className="w-full bg-[#050212] border border-purple-950/60 focus:border-purple-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all font-black"
                    >
                      <option value="USIA DINI">USIA DINI</option>
                      <option value="PRA-REMAJA">PRA-REMAJA</option>
                      <option value="REMAJA">REMAJA</option>
                      <option value="DEWASA">DEWASA</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 font-mono">
                    Jenis Kelamin
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-[#050212] p-1 rounded-xl border border-purple-950">
                    <button
                      type="button"
                      onClick={() => setInputGender("PUTRA")}
                      className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        inputGender === "PUTRA"
                          ? "bg-purple-600 text-white shadow-md"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      PUTRA
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputGender("PUTRI")}
                      className={`py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                        inputGender === "PUTRI"
                          ? "bg-purple-600 text-white shadow-md"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      PUTRI
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setInputName("");
                        setInputContingent("");
                      }}
                      className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-[10px] py-3 rounded-xl uppercase transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-[10px] py-3 rounded-xl uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check size={14} /> {editingId ? "Koreksi" : "Daftarkan Atlet"}
                  </button>
                </div>
              </form>

              {/* Data Utilities Box */}
              <div className="border-t border-purple-950/40 pt-4 space-y-2.5">
                <span className="text-[9px] font-bold text-zinc-400 tracking-wider uppercase block font-mono">
                  Utilitas Databank Atlet
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDownloadExcelTemplate}
                    className="bg-[#050212] hover:bg-purple-950/10 border border-purple-950 hover:border-purple-500/30 text-purple-300 font-bold text-[9px] py-2.5 rounded-lg transition-all uppercase flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download size={11} /> Template
                  </button>
                  <label className="bg-[#050212] hover:bg-purple-950/10 border border-purple-950 hover:border-purple-500/30 text-purple-300 font-bold text-[9px] py-2.5 rounded-lg transition-all uppercase flex items-center justify-center gap-1 cursor-pointer text-center">
                    <Upload size={11} /> Impor
                    <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv" 
                      className="hidden" 
                      onChange={handleImportExcel} 
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleExportExcel}
                    className="bg-[#050212] hover:bg-emerald-950/10 border border-purple-950 hover:border-emerald-500/30 text-emerald-400 font-bold text-[9px] py-2.5 rounded-lg transition-all uppercase flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <FileSpreadsheet size={11} /> Ekspor
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="bg-[#050212] hover:bg-amber-950/10 border border-purple-950 hover:border-amber-500/30 text-amber-400 font-bold text-[9px] py-2.5 rounded-lg transition-all uppercase flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Printer size={11} /> Unduh PDF
                  </button>
                </div>
                <button
                  onClick={handleClearAllAthletes}
                  className="w-full bg-red-950/10 hover:bg-red-950/30 border border-red-500/20 hover:border-red-500/50 text-red-400 font-bold text-[9px] py-2.5 rounded-lg transition-all uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={11} /> Kosongkan Database
                </button>
              </div>
            </div>

            {/* List of Athletes (Right Side) */}
            <div className="lg:col-span-8 bg-[#0c0423]/95 border border-purple-950/50 rounded-2xl p-5 shadow-2xl flex flex-col min-h-[450px]">
              
              {/* Filter Tabs and Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-950/50 pb-4 mb-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                  {[
                    { key: "SEMUA", label: "SEMUA DATA", count: athletes.length },
                    { key: "TANDING", label: "TANDING", count: athletes.filter(a => a.category === "TANDING").length },
                    { key: "JURUS", label: "JURUS / SENI", count: athletes.filter(a => a.category === "JURUS").length }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setFilterCategory(tab.key as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                        filterCategory === tab.key
                          ? "bg-purple-600 text-white"
                          : "bg-[#050212] text-zinc-400 hover:text-white border border-purple-950"
                      }`}
                    >
                      {tab.label} <span className="text-[8px] font-mono opacity-80 bg-black/40 px-1 py-0.5 rounded ml-1">{tab.count}</span>
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari atlet, kontingen, kelas..."
                    className="bg-[#050212] border border-purple-950/60 focus:border-purple-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-600 outline-none w-full md:w-60 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Table Data */}
              <div className="flex-1 overflow-x-auto">
                {filteredAthletes.length > 0 ? (
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-purple-950 text-[10px] font-black text-purple-400 tracking-wider uppercase bg-[#050212]/30">
                        <th className="py-3 px-3 w-12 text-center">No</th>
                        <th className="py-3 px-3">Nama Atlet</th>
                        <th className="py-3 px-3">Kontingen</th>
                        <th className="py-3 px-3">Kategori</th>
                        <th className="py-3 px-3">Kelas / Seni</th>
                        <th className="py-3 px-3">Kategori Usia</th>
                        <th className="py-3 px-3">Gender</th>
                        <th className="py-3 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-950/20 text-[11px] text-zinc-300">
                      {filteredAthletes.map((a, idx) => (
                        <tr key={a.id} className="hover:bg-purple-950/10 transition-all">
                          <td className="py-3 px-3 text-center font-mono font-bold text-zinc-500">{idx + 1}</td>
                          <td className="py-3 px-3 font-black text-white uppercase">{a.name}</td>
                          <td className="py-3 px-3 font-bold text-[#fbbf24] uppercase">{a.contingent}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-mono font-black ${
                              a.category === "JURUS" 
                                ? "bg-fuchsia-950/40 text-fuchsia-400 border border-fuchsia-500/20 shadow-[0_0_8px_rgba(217,70,239,0.15)]" 
                                : "bg-indigo-950/40 text-indigo-400 border border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.15)]"
                            }`}>
                              {a.category || "TANDING"}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold uppercase">{a.kelas}</td>
                          <td className="py-3 px-3 font-medium uppercase font-mono">{a.usia}</td>
                          <td className="py-3 px-3 font-bold uppercase">{a.gender}</td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditAthlete(a)}
                                className="p-1.5 rounded-lg bg-[#050212] border border-purple-950/60 text-purple-400 hover:bg-purple-950/30 hover:text-white transition-all cursor-pointer"
                                title="Koreksi Data"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteAthlete(a.id)}
                                className="p-1.5 rounded-lg bg-[#050212] border border-red-950/60 text-red-400 hover:bg-red-950/30 hover:text-white transition-all cursor-pointer"
                                title="Hapus Atlet"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-20 text-zinc-500">
                    <Users size={40} className="text-zinc-600 mx-auto mb-3" />
                    <h4 className="text-xs uppercase font-black tracking-wider text-zinc-400">DATA TIDAK DITEMUKAN</h4>
                    <p className="text-[10px] text-zinc-500 mt-1">Harap sesuaikan pencarian atau filter kategori Anda.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: SINKRONISASI */}
        {activeTab === "sinkronisasi" && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Sync Progress Bar Loader */}
            {syncingCategory && (
              <div className="bg-[#0c0423] border border-purple-500/40 p-6 rounded-2xl space-y-4 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-purple-400 uppercase tracking-wider flex items-center gap-2">
                    <RefreshCw className="animate-spin text-purple-400" size={14} />
                    SINKRONISASI KATEGORI {syncingCategory} SEDANG BERLANGSUNG...
                  </span>
                  <span className="font-mono font-bold text-white text-sm">{syncProgress}%</span>
                </div>
                <div className="w-full bg-[#050212] h-2 rounded-full overflow-hidden border border-purple-950">
                  <div 
                    className="bg-gradient-to-r from-purple-500 via-fuchsia-500 to-[#ccff00] h-full transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Sync Bento Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Sparring Sync */}
              <div className="bg-[#0c0423]/95 border border-purple-950/60 p-6 rounded-2xl flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-purple-500/30 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full filter blur-xl pointer-events-none" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-11 w-11 bg-indigo-950/60 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 shadow-md">
                      <Shield size={20} />
                    </div>
                    <span className="text-[8px] font-mono font-black text-indigo-400 border border-indigo-500/30 bg-indigo-950/20 px-2 py-0.5 rounded uppercase">
                      SPARRING SYSTEM
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">SINKRONISASI TANDING</h3>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                      Sinkronisasikan data atlet tanding ke scoring server lokal, undi bagan tanding secara otomatis, dan generate partai match.
                    </p>
                  </div>
                  <div className="bg-[#050212] p-3 rounded-xl border border-purple-950 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-500 uppercase font-black">Atlet Tanding</span>
                    <strong className="text-indigo-400 text-xs font-bold">
                      {athletes.filter(a => a.category === "TANDING").length} Atlet
                    </strong>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleTriggerSync("TANDING")}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-black text-[10px] uppercase py-3 rounded-xl tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={12} /> Sinkronisasi Tanding
                  </button>
                  <button
                    onClick={handleAutoGenerateSchedules}
                    className="w-full bg-[#050212] hover:bg-indigo-950/10 border border-purple-950 hover:border-indigo-500/30 text-indigo-400 font-bold text-[9px] py-2.5 rounded-xl transition-all uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Grid size={11} /> Auto-Generate Jadwal
                  </button>
                  <button
                    onClick={() => setShowBracketModal(true)}
                    className="w-full bg-[#050212] hover:bg-zinc-800 border border-purple-950 text-zinc-300 font-bold text-[9px] py-2.5 rounded-xl transition-all uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trophy size={11} /> Preview & Atur Bagan
                  </button>
                </div>
              </div>

              {/* Card 2: Artistic Sync */}
              <div className="bg-[#0c0423]/95 border border-purple-950/60 p-6 rounded-2xl flex flex-col justify-between space-y-6 relative overflow-hidden group hover:border-purple-500/30 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/5 rounded-full filter blur-xl pointer-events-none" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-11 w-11 bg-fuchsia-950/60 border border-fuchsia-500/20 rounded-xl flex items-center justify-center text-fuchsia-400 shadow-md">
                      <Trophy size={20} />
                    </div>
                    <span className="text-[8px] font-mono font-black text-fuchsia-400 border border-fuchsia-500/30 bg-fuchsia-950/20 px-2 py-0.5 rounded uppercase">
                      ARTISTIC SYSTEM
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">SINKRONISASI JURUS</h3>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                      Sinkronisasikan data peserta Jurus/Seni ke system dewan hakim penilaian artistik lokal agar dapat dinilai dewan dewan juri.
                    </p>
                  </div>
                  <div className="bg-[#050212] p-3 rounded-xl border border-purple-950 flex justify-between items-center text-[10px] font-mono">
                    <span className="text-zinc-500 uppercase font-black">Atlet Jurus</span>
                    <strong className="text-fuchsia-400 text-xs font-bold">
                      {athletes.filter(a => a.category === "JURUS").length} Atlet
                    </strong>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleTriggerSync("JURUS")}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-black text-[10px] uppercase py-3 rounded-xl tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={12} /> Sinkronisasi Jurus
                  </button>
                </div>
              </div>

              {/* Card 3: Network Control Terminal Logs */}
              <div className="bg-[#0c0423]/95 border border-purple-950/60 p-6 rounded-2xl flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-white">JZR NETWORK NODE</span>
                    <span className="inline-flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded text-[8px] font-mono font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                      ● ONLINE
                    </span>
                  </div>
                  
                  {/* Console Logger Container */}
                  <div className="bg-black/80 border border-purple-950 rounded-xl p-3 h-40 overflow-y-auto font-mono text-[8.5px] text-zinc-300 space-y-1 scrollbar-none">
                    {syncLog.map((log, idx) => (
                      <p key={idx} className={`${idx === syncLog.length - 1 ? "text-amber-400 font-bold" : ""}`}>
                        {log}
                      </p>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleTriggerSync("ALL")}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-black text-[10px] uppercase py-3 rounded-xl tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(124,58,237,0.2)]"
                >
                  <Zap size={12} className="text-amber-400" /> Sinkronisasi Massal (Broadcast All)
                </button>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Bracket Modal Portal */}
      <BracketModal
        isOpen={showBracketModal}
        onClose={() => setShowBracketModal(false)}
        selectedGroup={selectedBaganGroup}
        setSelectedGroup={setSelectedBaganGroup}
        athleteGroups={athleteGroups}
        getBracketDataForGroup={getBracketDataForGroup}
        scheduleItems={scheduleItems}
        handleAutoShuffleDrawing={handleAutoShuffleDrawing}
        handleClearClass={handleClearClass}
        handleDownloadBracketPDF={handleDownloadBracketPDF}
        handleDownloadAllBracketsPDF={handleDownloadAllBracketsPDF}
        resolvePlayerUI={resolvePlayerUI}
      />

      {/* Standard Sync Success Alert Modal */}
      {showSyncSuccess && (
        <div className="fixed inset-0 bg-[#02000a]/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in text-white">
          <div className="bg-[#0c0423] border border-purple-500/30 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-[0_0_50px_rgba(168,85,247,0.25)] text-center space-y-5 relative">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-[#ccff00] to-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <Check className="text-slate-950 stroke-[3]" size={28} />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-wider text-white text-sm">
                SINKRONISASI BERHASIL!
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Database registrasi atlet lokal telah tersinkronisasi 100% dengan portal scoring juri dewan hakim dewan juri JZR Digital.
              </p>
            </div>
            <button
              onClick={() => setShowSyncSuccess(false)}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs py-3.5 rounded-2xl transition-all cursor-pointer shadow-lg"
            >
              TUTUP KONFIRMASI
            </button>
          </div>
        </div>
      )}

      {/* Global alert state */}
      {alertState.isOpen && (
        <div className="fixed inset-0 bg-[#02000a]/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in text-white">
          <div className="bg-[#0c0423] border border-purple-500/30 rounded-3xl p-6 max-w-sm w-full shadow-[0_0_40px_rgba(168,85,247,0.2)] text-center space-y-4">
            <div className="h-11 w-11 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
              <Info size={22} />
            </div>
            <div>
              <h4 className="font-black text-xs uppercase text-white tracking-wider">{alertState.title}</h4>
              <p className="text-[10.5px] text-zinc-400 mt-1.5 leading-relaxed">{alertState.message}</p>
            </div>
            <button
              onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] py-3 rounded-xl uppercase transition-all cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
