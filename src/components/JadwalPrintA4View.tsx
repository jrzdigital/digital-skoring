import React, { useState, useMemo, useEffect } from "react";
import { 
  Printer, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  Settings,
  X,
  CheckSquare,
  Square
} from "lucide-react";
import { sound } from "../utils/sound";
import { jsPDF } from "jspdf";
import { getParameterPertandinganConfig, drawPdfLogo, preloadLogoForPdf } from "../utils/pdfKopHelper";

export interface JadwalPrintA4Props {
  schedules: any[];
  categories: any[];
  participants: any[];
  eventName?: string;
  tempatPelaksanaan?: string;
  waktuPelaksanaan?: string;
  tanggalHari?: string;
  namaKetuaPertandingan?: string;
  namaSekretarisPertandingan?: string;
  selectedGelanggang?: string;
  onBackToTable?: () => void;
  onUpdateSchedules?: (updatedSchedules: any[]) => void;
}

export function JadwalPrintA4View({
  schedules,
  categories,
  participants,
  eventName: initialEventName,
  tempatPelaksanaan: initialTempat,
  waktuPelaksanaan: initialWaktu,
  tanggalHari: initialTanggal,
  namaKetuaPertandingan: initialKetua,
  namaSekretarisPertandingan: initialSekretaris,
  selectedGelanggang: initialGelanggang = "ALL",
  onBackToTable,
  onUpdateSchedules
}: JadwalPrintA4Props) {
  // Settings state for Kop & Signatures (synchronized with Menu Parameter Pertandingan)
  const initialCfg = getParameterPertandinganConfig({
    eventName: initialEventName,
    tempatPelaksanaan: initialTempat,
    waktuPelaksanaan: initialWaktu,
    tanggalCetakDokumen: initialTanggal,
    namaKetuaPertandingan: initialKetua,
    namaSekretarisPertandingan: initialSekretaris,
  });

  const [logoLeft, setLogoLeft] = useState(() => initialCfg.logoLeft);
  const [logoRight, setLogoRight] = useState(() => initialCfg.logoRight);
  const [eventName, setEventName] = useState(() => initialCfg.eventName);
  const [tempat, setTempat] = useState(() => initialCfg.tempatPelaksanaan);
  const [waktu, setWaktu] = useState(() => initialCfg.waktuPelaksanaan);
  const [kotaDibuat, setKotaDibuat] = useState(() => initialCfg.namaDaerahCetak);
  const [tanggalHari, setTanggalHari] = useState(() => initialCfg.tanggalCetakDokumen);
  const [ketua, setKetua] = useState(() => initialCfg.namaKetuaPertandingan);
  const [sekretaris, setSekretaris] = useState(() => initialCfg.namaSekretarisPertandingan);

  useEffect(() => {
    const syncFromParams = () => {
      const cfg = getParameterPertandinganConfig();
      setLogoLeft(cfg.logoLeft);
      setLogoRight(cfg.logoRight);
      setEventName(cfg.eventName);
      setTempat(cfg.tempatPelaksanaan);
      setWaktu(cfg.waktuPelaksanaan);
      setKotaDibuat(cfg.namaDaerahCetak);
      setTanggalHari(cfg.tanggalCetakDokumen);
      setKetua(cfg.namaKetuaPertandingan);
      setSekretaris(cfg.namaSekretarisPertandingan);
      if (cfg.logoLeft) preloadLogoForPdf(cfg.logoLeft);
      if (cfg.logoRight) preloadLogoForPdf(cfg.logoRight);
    };
    syncFromParams();
    window.addEventListener("jrz_parameters_updated", syncFromParams);
    window.addEventListener("storage", syncFromParams);
    return () => {
      window.removeEventListener("jrz_parameters_updated", syncFromParams);
      window.removeEventListener("storage", syncFromParams);
    };
  }, []);

  // Checkbox state: whether printed/downloaded document uses Ketua Panitia & Sekretaris signatures
  const [useSignatures, setUseSignatures] = useState<boolean>(() => {
    const saved = localStorage.getItem("jrz_print_use_signatures");
    return saved !== null ? saved === "true" : true;
  });

  // Local map of final scores input in the 2 REMARK columns: { [matchId]: { blue: string, red: string } }
  const [remarkScores, setRemarkScores] = useState<Record<string, { blue: string; red: string }>>(() => {
    try {
      const saved = localStorage.getItem("jrz_remark_scores");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [filterGelanggang, setFilterGelanggang] = useState(initialGelanggang);
  const [filterStage, setFilterStage] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomScale, setZoomScale] = useState(1);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const toggleUseSignatures = () => {
    sound.playClick();
    setUseSignatures(prev => {
      const next = !prev;
      localStorage.setItem("jrz_print_use_signatures", String(next));
      return next;
    });
  };

  // Get final score for a corner in Remark (2 columns: Blue & Red)
  const getRemarkScore = (match: any, corner: "BLUE" | "RED"): string => {
    const mId = String(match.id || match.matchNumber || "");
    const localEntry = remarkScores[mId];
    if (localEntry) {
      const val = corner === "BLUE" ? localEntry.blue : localEntry.red;
      if (val !== undefined) return val;
    }
    if (corner === "BLUE" && match.remarkScoreBlue !== undefined && match.remarkScoreBlue !== "") {
      return String(match.remarkScoreBlue);
    }
    if (corner === "RED" && match.remarkScoreRed !== undefined && match.remarkScoreRed !== "") {
      return String(match.remarkScoreRed);
    }
    if (match.status === "SELESAI") {
      if (corner === "BLUE" && match.scoreBlue !== undefined && match.scoreBlue !== null) {
        return String(match.scoreBlue);
      }
      if (corner === "RED" && match.scoreRed !== undefined && match.scoreRed !== null) {
        return String(match.scoreRed);
      }
    }
    return "";
  };

  const handleChangeRemarkScore = (match: any, corner: "BLUE" | "RED", value: string) => {
    const mId = String(match.id || match.matchNumber || "");
    const currentBlue = getRemarkScore(match, "BLUE");
    const currentRed = getRemarkScore(match, "RED");
    const nextEntry = {
      blue: corner === "BLUE" ? value : currentBlue,
      red: corner === "RED" ? value : currentRed
    };
    const nextMap = {
      ...remarkScores,
      [mId]: nextEntry
    };
    setRemarkScores(nextMap);
    try {
      localStorage.setItem("jrz_remark_scores", JSON.stringify(nextMap));
    } catch {}

    if (onUpdateSchedules && match.id) {
      const numVal = value.trim() !== "" && !isNaN(Number(value)) ? Number(value) : undefined;
      const updated = schedules.map(s => {
        if (s.id === match.id) {
          return {
            ...s,
            remarkScoreBlue: nextEntry.blue,
            remarkScoreRed: nextEntry.red,
            ...(corner === "BLUE" && numVal !== undefined ? { scoreBlue: numVal } : {}),
            ...(corner === "RED" && numVal !== undefined ? { scoreRed: numVal } : {})
          };
        }
        return s;
      });
      onUpdateSchedules(updated);
    }
  };

  // Available arenas
  const availableArenas = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach(s => {
      const arena = (s.arena || "GELANGGANG A").trim().toUpperCase();
      set.add(arena);
    });
    return Array.from(set).sort();
  }, [schedules]);

  // Filtered and sorted matches
  const sortedMatches = useMemo(() => {
    const filtered = schedules.filter(m => {
      if (filterGelanggang !== "ALL") {
        const arenaMatch = (m.arena || "GELANGGANG A").trim().toUpperCase();
        const arenaTarget = filterGelanggang.trim().toUpperCase();
        if (arenaMatch !== arenaTarget && !arenaMatch.includes(arenaTarget) && !arenaTarget.includes(arenaMatch)) {
          return false;
        }
      }
      if (filterStage !== "ALL") {
        const stageName = (m.stage || "").toUpperCase();
        if (filterStage === "PENYISIHAN" && !stageName.includes("PENYISIHAN")) return false;
        if (filterStage === "PEREMPAT FINAL" && !stageName.includes("PEREMPAT")) return false;
        if (filterStage === "SEMIFINAL" && !stageName.includes("SEMIFINAL") && !stageName.includes("POL")) return false;
        if (filterStage === "FINAL" && !stageName.includes("FINAL")) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      const numA = parseInt(String(a.matchNumber || "").replace(/\D/g, "") || "99999");
      const numB = parseInt(String(b.matchNumber || "").replace(/\D/g, "") || "99999");
      return numA - numB;
    });
  }, [schedules, filterGelanggang, filterStage]);

  const MATCHES_PER_PAGE = 14;
  const totalPages = Math.max(1, Math.ceil(sortedMatches.length / MATCHES_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const startIdx = (activePage - 1) * MATCHES_PER_PAGE;
  const pageMatches = sortedMatches.slice(startIdx, startIdx + MATCHES_PER_PAGE);

  const getAthleteName = (idOrName?: string) => {
    if (!idOrName) return "-";
    const found = participants.find(p => p.id === idOrName);
    return found ? found.name : idOrName;
  };

  const getAthleteClub = (idOrClub?: string, idOrName?: string) => {
    if (idOrName) {
      const found = participants.find(p => p.id === idOrName);
      if (found && found.club) return found.club;
    }
    return idOrClub || "-";
  };

  const getClassDisplay = (match: any) => {
    if (match.classCategory) return match.classCategory;
    const cat = categories.find(c => c.id === match.categoryClassId);
    if (cat) return `${cat.name} (${match.gender || "PUTRA"})`;
    return match.categoryClassId || "TANDING";
  };

  // Browser Print trigger
  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  // jsPDF Direct Download
  const handleDownloadPdf = () => {
    sound.playClick();
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pages = Math.ceil(sortedMatches.length / MATCHES_PER_PAGE) || 1;

      for (let pNum = 1; pNum <= pages; pNum++) {
        if (pNum > 1) doc.addPage();

        // 1. Draw Left & Right Logos from Menu Parameter Pertandingan
        drawPdfLogo(doc, logoLeft, 20, 10, 15);
        drawPdfLogo(doc, logoRight, 175, 10, 15);

        // Header Title & 2. Judul Event from Menu Parameter Pertandingan
        let textCursorY = 13;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.text("JADWAL PERTANDINGAN", 105, textCursorY, { align: "center" });
        textCursorY += 5;

        doc.setFontSize(10);
        const wrappedEvent = doc.splitTextToSize((eventName || "KEJUARAAN PENCAK SILAT").toUpperCase(), 134);
        wrappedEvent.forEach((line: string) => {
          doc.text(line, 105, textCursorY, { align: "center" });
          textCursorY += 4.5;
        });

        // 3. Alamat (Tempat Pelaksanaan) serta Tanggal (Waktu Pelaksanaan) dari Menu Parameter Pertandingan
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(50, 60, 75);
        const sub = `PENCAK SILAT TANDING  |  ${(tempat || "TEMPAT PELAKSANAAN").toUpperCase()} - ${(waktu || "WAKTU PELAKSANAAN").toUpperCase()}`;
        const wrappedSub = doc.splitTextToSize(sub, 134);
        wrappedSub.forEach((line: string) => {
          doc.text(line, 105, textCursorY, { align: "center" });
          textCursorY += 4.5;
        });

        // Double separator lines
        const lineY = textCursorY - 1.5;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(1);
        doc.line(20, lineY, 190, lineY);
        doc.setLineWidth(0.2);
        doc.line(20, lineY + 1.2, 190, lineY + 1.2);

        // 3 Info Boxes
        const boxY = lineY + 3.5;
        // Box 1
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.setFillColor(255, 255, 255);
        doc.rect(20, boxY, 50, 10, "FD");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(0, 0, 0);
        doc.text(tanggalHari.toUpperCase(), 45, boxY + 6.2, { align: "center" });

        // Box 2 (Blue Tint)
        doc.setFillColor(224, 242, 254);
        doc.rect(70, boxY, 70, 10, "FD");
        doc.setFontSize(9.5);
        const arenaText = filterGelanggang !== "ALL" ? filterGelanggang.toUpperCase() : "SEMUA GELANGGANG";
        doc.text(arenaText, 105, boxY + 6.2, { align: "center" });

        // Box 3
        doc.setFillColor(255, 255, 255);
        doc.rect(140, boxY, 50, 10, "FD");
        doc.setFontSize(8.5);
        doc.text(waktu.toUpperCase(), 165, boxY + 6.2, { align: "center" });

        // Table Header (with REMARK split into 2 sub-columns for final scores of Blue & Red corners)
        const headerY = boxY + 13.5;
        const headerH = 9;
        const startRowsY = headerY + headerH;

        doc.setFillColor(74, 24, 122);
        doc.rect(20, headerY, 60, headerH, "F");
        doc.setFillColor(29, 78, 216);
        doc.rect(80, headerY, 45, headerH, "F");
        doc.setFillColor(220, 38, 38);
        doc.rect(125, headerY, 45, headerH, "F");

        // REMARK top header (X=170..190, top half)
        doc.setFillColor(74, 24, 122);
        doc.rect(170, headerY, 20, 4.8, "F");
        // REMARK 2 sub-columns (Biru: 170..180, Merah: 180..190, bottom half)
        doc.setFillColor(29, 78, 216);
        doc.rect(170, headerY + 4.8, 10, 4.2, "F");
        doc.setFillColor(220, 38, 38);
        doc.rect(180, headerY + 4.8, 10, 4.2, "F");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text("NO", 25, headerY + 5.8, { align: "center" });
        doc.text("PARTAI", 37.5, headerY + 5.8, { align: "center" });
        doc.text("KELAS", 62.5, headerY + 5.8, { align: "center" });
        doc.text("BIRU", 102.5, headerY + 5.8, { align: "center" });
        doc.text("MERAH", 147.5, headerY + 5.8, { align: "center" });

        doc.setFontSize(6.8);
        doc.text("REMARK", 180, headerY + 3.4, { align: "center" });
        doc.setFontSize(5.5);
        doc.text("BIRU", 175, headerY + 7.8, { align: "center" });
        doc.text("MERAH", 185, headerY + 7.8, { align: "center" });

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.line(20, headerY, 190, headerY);
        doc.line(20, headerY + headerH, 190, headerY + headerH);
        doc.line(20, headerY, 20, headerY + headerH);
        doc.line(30, headerY, 30, headerY + headerH);
        doc.line(45, headerY, 45, headerY + headerH);
        doc.line(80, headerY, 80, headerY + headerH);
        doc.line(125, headerY, 125, headerY + headerH);
        doc.line(170, headerY, 170, headerY + headerH);
        doc.line(190, headerY, 190, headerY + headerH);
        // Sub-divider lines inside REMARK header
        doc.line(170, headerY + 4.8, 190, headerY + 4.8);
        doc.line(180, headerY + 4.8, 180, headerY + headerH);

        const pStart = (pNum - 1) * MATCHES_PER_PAGE;
        const pItems = sortedMatches.slice(pStart, pStart + MATCHES_PER_PAGE);

        pItems.forEach((m, rIdx) => {
          const rowY = startRowsY + (rIdx * 12);
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.3);
          doc.line(20, rowY + 12, 190, rowY + 12);
          
          doc.line(20, rowY, 20, rowY + 12);
          doc.line(30, rowY, 30, rowY + 12);
          doc.line(45, rowY, 45, rowY + 12);
          doc.line(80, rowY, 80, rowY + 12);
          doc.line(125, rowY, 125, rowY + 12);
          doc.line(170, rowY, 170, rowY + 12);
          // Center divider line inside REMARK creating 2 columns for final scores
          doc.line(180, rowY, 180, rowY + 12);
          doc.line(190, rowY, 190, rowY + 12);

          const globalNum = pStart + rIdx + 1;
          const matchNum = String(m.matchNumber || globalNum).replace(/\D/g, "") || String(globalNum);
          const bName = getAthleteName(m.fighterBlueName || m.fighterBlueId);
          const bClub = getAthleteClub(m.fighterBlueClub, m.fighterBlueId);
          const rName = getAthleteName(m.fighterRedName || m.fighterRedId);
          const rClub = getAthleteClub(m.fighterRedClub, m.fighterRedId);
          const stageStr = (m.stage || "PENYISIHAN").toUpperCase();
          const clsText = getClassDisplay(m);

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(0, 0, 0);
          doc.text(String(globalNum), 25, rowY + 7, { align: "center" });

          doc.setFontSize(13);
          doc.text(matchNum, 37.5, rowY + 7.5, { align: "center" });

          doc.setFontSize(8);
          doc.text(clsText.slice(0, 22), 62.5, rowY + 4.5, { align: "center" });
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(80, 80, 80);
          doc.text(stageStr, 62.5, rowY + 9, { align: "center" });

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(29, 78, 216);
          doc.text(bName.slice(0, 22), 102.5, rowY + 5, { align: "center" });
          doc.setFontSize(7);
          doc.setTextColor(70, 80, 95);
          doc.text(bClub.slice(0, 22), 102.5, rowY + 9, { align: "center" });

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(220, 38, 38);
          doc.text(rName.slice(0, 22), 147.5, rowY + 5, { align: "center" });
          doc.setFontSize(7);
          doc.setTextColor(70, 80, 95);
          doc.text(rClub.slice(0, 22), 147.5, rowY + 9, { align: "center" });

          // REMARK 2 columns: Final Score Sudut Biru (left: X=175) & Final Score Sudut Merah (right: X=185)
          const blueFinalScore = getRemarkScore(m, "BLUE");
          const redFinalScore = getRemarkScore(m, "RED");

          if (blueFinalScore !== "") {
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(29, 78, 216);
            doc.text(String(blueFinalScore), 175, rowY + 7.3, { align: "center" });
          }

          if (redFinalScore !== "") {
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(220, 38, 38);
            doc.text(String(redFinalScore), 185, rowY + 7.3, { align: "center" });
          }
        });

        if (pNum === pages) {
          const lastY = startRowsY + (pItems.length * 12);
          const memoY = lastY + 5;
          if (memoY < 240) {
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(0, 0, 0);
            doc.text("Catatan untuk Official Tim :", 20, memoY);
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(7);
            doc.text("1. Dimohon meneliti secara cermat jadwal pertandingan diatas! Jika terdapat kesalahan, laporkan ke sekretariat.", 20, memoY + 4);
          }

          // Only render TTD Ketua Pertandingan & Sekretaris if checkbox is checked
          if (useSignatures) {
            const sigY = Math.min(lastY + 18, 245);
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(0, 0, 0);

            // 4. Tanda tangan Ketua Pertandingan
            doc.text("Mengetahui,", 50, sigY, { align: "center" });
            doc.setFont("Helvetica", "bold");
            doc.text("Ketua Pertandingan,", 50, sigY + 4.5, { align: "center" });
            doc.line(25, sigY + 22, 75, sigY + 22);
            if (ketua && ketua.trim()) {
              doc.text(ketua.trim().toUpperCase(), 50, sigY + 26, { align: "center" });
            } else {
              doc.setFont("Helvetica", "normal");
              doc.text("(......................................................)", 50, sigY + 26, { align: "center" });
            }

            // 5. Tanggal dan tempat dibuat & 4. Tanda tangan Sekretaris Pertandingan
            doc.setFont("Helvetica", "normal");
            const placeStr = (kotaDibuat || "IDI RAYEUK").trim().toUpperCase();
            const dateStr = (tanggalHari || "01 JULI 2026").trim().toUpperCase();
            doc.text(`${placeStr}, ${dateStr}`, 160, sigY, { align: "center" });
            doc.setFont("Helvetica", "bold");
            doc.text("Sekretaris Pertandingan,", 160, sigY + 4.5, { align: "center" });
            doc.line(135, sigY + 22, 185, sigY + 22);
            if (sekretaris && sekretaris.trim()) {
              doc.text(sekretaris.trim().toUpperCase(), 160, sigY + 26, { align: "center" });
            } else {
              doc.setFont("Helvetica", "normal");
              doc.text("(......................................................)", 160, sigY + 26, { align: "center" });
            }
          }
        }
      }

      doc.save(`Jadwal_Pertandingan_A4_${Date.now()}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* TOOLBAR CONTROLS */}
      <div className="bg-[#0e0720]/95 border border-purple-900/50 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Gelanggang selector */}
          <div className="flex items-center gap-1.5 bg-[#150a2b] border border-purple-800/40 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-mono font-bold text-sky-400 uppercase">ARENA:</span>
            <select
              value={filterGelanggang}
              onChange={(e) => {
                sound.playClick();
                setFilterGelanggang(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-sky-300 text-xs font-black uppercase outline-none cursor-pointer border-none"
            >
              <option value="ALL" className="bg-[#120727] text-white">SEMUA GELANGGANG</option>
              {availableArenas.map(a => (
                <option key={a} value={a} className="bg-[#120727] text-sky-300">{a}</option>
              ))}
            </select>
          </div>

          {/* Stage selector */}
          <div className="flex items-center gap-1.5 bg-[#150a2b] border border-purple-800/40 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">BABAK:</span>
            <select
              value={filterStage}
              onChange={(e) => {
                sound.playClick();
                setFilterStage(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-amber-300 text-xs font-black uppercase outline-none cursor-pointer border-none"
            >
              <option value="ALL" className="bg-[#120727] text-white">SEMUA BABAK</option>
              <option value="PENYISIHAN" className="bg-[#120727] text-white">PENYISIHAN</option>
              <option value="PEREMPAT FINAL" className="bg-[#120727] text-white">PEREMPAT FINAL</option>
              <option value="SEMIFINAL" className="bg-[#120727] text-white">SEMIFINAL</option>
              <option value="FINAL" className="bg-[#120727] text-white">FINAL</option>
            </select>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[#150a2b] border border-purple-800/40 px-2 py-1 rounded-xl">
            <button
              onClick={() => setZoomScale(z => Math.max(0.65, z - 0.1))}
              className="p-1 rounded text-purple-300 hover:text-white cursor-pointer"
              title="Perkecil Tampilan"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-black text-purple-200 px-1">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale(z => Math.min(1.4, z + 0.1))}
              className="p-1 rounded text-purple-300 hover:text-white cursor-pointer"
              title="Perbesar Tampilan"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomScale(1)}
              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-950 text-purple-300 hover:text-white cursor-pointer ml-1"
            >
              100%
            </button>
          </div>

          {/* Checkbox: Gunakan TTD Ketua Panitia & Sekretaris */}
          <label
            onClick={toggleUseSignatures}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer select-none transition-all ${
              useSignatures
                ? "bg-emerald-950/60 border-emerald-500/50 text-emerald-300 shadow-sm"
                : "bg-[#150a2b] border-purple-800/40 text-slate-400 hover:text-slate-200"
            }`}
            title="Centang jika dokumen yang dicetak akan menggunakan TTD Ketua Panitia dan Sekretaris"
          >
            {useSignatures ? (
              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-slate-500 shrink-0" />
            )}
            <span className="text-[10.5px] uppercase tracking-wider font-black">
              TTD Ketua Panitia & Sekretaris
            </span>
          </label>
        </div>

        {/* Actions: Page nav + Icon-only buttons for Pengaturan (gear), Print A4 (printer), Unduh PDF (download) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pagination */}
          <div className="flex items-center gap-1 bg-[#150a2b] border border-purple-800/40 px-2 py-1 rounded-xl">
            <button
              disabled={activePage <= 1}
              onClick={() => { sound.playClick(); setCurrentPage(p => Math.max(1, p - 1)); }}
              className="p-1 rounded text-purple-300 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-200 px-1.5">
              Halaman {activePage} / {totalPages}
            </span>
            <button
              disabled={activePage >= totalPages}
              onClick={() => { sound.playClick(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
              className="p-1 rounded text-purple-300 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Pengaturan Button (Icon Only - Lingkaran Bergerigi) */}
          <button
            type="button"
            onClick={() => { sound.playClick(); setShowConfigModal(true); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-purple-900/60 hover:bg-purple-800 text-purple-200 hover:text-white border border-purple-700/50 transition-all shadow-md active:scale-95 cursor-pointer"
            title="Pengaturan Kop & Pengesahan Dokumen"
            aria-label="Pengaturan"
          >
            <Settings className="w-4 h-4 text-purple-300" />
          </button>

          {/* Print A4 Button (Icon Only - Printer) */}
          <button
            type="button"
            onClick={handlePrint}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 transition-all shadow-md active:scale-95 cursor-pointer border-none"
            title="Print A4"
            aria-label="Print A4"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Unduh PDF Button (Icon Only - Download) */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all shadow-md active:scale-95 cursor-pointer border-none"
            title="Unduh PDF"
            aria-label="Unduh PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* A4 PRINT PREVIEW CANVAS WRAPPER */}
      <div className="overflow-x-auto flex justify-center py-4 px-2 bg-[#06030e]/80 border border-purple-950/60 rounded-3xl min-h-[800px]">
        <div 
          style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
          className="transition-transform duration-150"
        >
          {/* THE AUTHENTIC A4 SHEET (210mm x 297mm proportional) */}
          <div className="a4-print-page w-[210mm] min-h-[297mm] bg-white text-black shadow-2xl p-8 sm:p-10 flex flex-col justify-between select-text relative font-sans box-border">
            
            {/* TOP KOP SURAT */}
            <div>
              <div className="relative flex items-center justify-between pb-3">
                {/* 1. Left Logo from Menu Parameter Pertandingan */}
                {logoLeft ? (
                  <img
                    src={logoLeft}
                    alt="Logo Kiri"
                    className="w-14 h-14 object-contain shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-purple-950 bg-gradient-to-br from-purple-900 to-indigo-950 flex flex-col items-center justify-center text-white shrink-0 shadow-sm">
                    <span className="text-[11px] font-black tracking-tighter">IPSI</span>
                    <span className="text-[6px] font-mono tracking-widest text-amber-300">INDONESIA</span>
                  </div>
                )}

                {/* 2. Judul Event & 3. Tempat & Waktu Pelaksanaan from Menu Parameter Pertandingan */}
                <div className="flex flex-col items-center text-center px-4 flex-grow">
                  <h1 className="text-base sm:text-lg font-black tracking-wider uppercase text-black m-0 leading-tight">
                    JADWAL PERTANDINGAN
                  </h1>
                  <h2 className="text-xs sm:text-sm font-black uppercase text-slate-800 m-0 mt-0.5 leading-snug max-w-md">
                    {eventName}
                  </h2>
                  <p className="text-[9.5px] font-semibold text-slate-600 m-0 mt-0.5 uppercase tracking-wide">
                    PENCAK SILAT TANDING &nbsp;|&nbsp; {tempat} &ndash; {waktu}
                  </p>
                </div>

                {/* 1. Right Logo from Menu Parameter Pertandingan */}
                {logoRight ? (
                  <img
                    src={logoRight}
                    alt="Logo Kanan"
                    className="w-14 h-14 object-contain shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-purple-950 bg-gradient-to-br from-amber-600 to-yellow-500 flex flex-col items-center justify-center text-slate-950 shrink-0 shadow-sm">
                    <span className="text-[10px] font-black tracking-tighter">IPSI</span>
                    <span className="text-[6px] font-mono font-bold tracking-widest">RESMI</span>
                  </div>
                )}
              </div>

              {/* Double Horizontal Rule */}
              <div className="flex flex-col gap-0.5 mb-3">
                <div className="w-full h-[2.5px] bg-black"></div>
                <div className="w-full h-[0.8px] bg-black"></div>
              </div>

              {/* 3 Box Info Header */}
              <div className="grid grid-cols-12 border border-black mb-3 text-center font-bold">
                {/* Box 1: Hari / Tanggal */}
                <div className="col-span-3 py-1.5 px-2 border-r border-black flex items-center justify-center text-[10px] uppercase font-bold text-black">
                  {tanggalHari}
                </div>
                {/* Box 2: Gelanggang (Sky Blue Tint) */}
                <div className="col-span-6 py-1.5 px-2 border-r border-black bg-sky-100 flex items-center justify-center text-xs uppercase font-black text-black">
                  {filterGelanggang !== "ALL" ? filterGelanggang : "SEMUA GELANGGANG"}
                </div>
                {/* Box 3: Waktu / Sesi */}
                <div className="col-span-3 py-1.5 px-2 flex items-center justify-center text-[10px] uppercase font-bold text-black">
                  {waktu}
                </div>
              </div>

              {/* THE MATCHES TABLE (REMARK has 2 sub-columns inside for Final Score of both corners) */}
              <table className="w-full border-collapse border border-black text-left">
                <thead>
                  <tr className="text-white text-[9px] font-black tracking-wider uppercase">
                    <th rowSpan={2} className="border border-black bg-[#4a187a] py-1.5 px-1 text-center w-[6%] align-middle">NO</th>
                    <th rowSpan={2} className="border border-black bg-[#4a187a] py-1.5 px-1 text-center w-[9%] align-middle">PARTAI</th>
                    <th rowSpan={2} className="border border-black bg-[#4a187a] py-1.5 px-2 text-center w-[21%] align-middle">KELAS</th>
                    <th rowSpan={2} className="border border-black bg-[#1d4ed8] py-1.5 px-2 text-center w-[25%] align-middle">BIRU</th>
                    <th rowSpan={2} className="border border-black bg-[#dc2626] py-1.5 px-2 text-center w-[25%] align-middle">MERAH</th>
                    <th colSpan={2} className="border border-black bg-[#4a187a] py-1 px-1 text-center w-[14%]">REMARK</th>
                  </tr>
                  <tr className="text-white text-[7.5px] font-black tracking-wider uppercase">
                    <th className="border border-black bg-[#1d4ed8] py-0.5 px-1 text-center w-[7%]" title="Skor Akhir Sudut Biru">BIRU</th>
                    <th className="border border-black bg-[#dc2626] py-0.5 px-1 text-center w-[7%]" title="Skor Akhir Sudut Merah">MERAH</th>
                  </tr>
                </thead>
                <tbody className="text-[9.5px]">
                  {pageMatches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center italic text-slate-500 border border-black text-xs">
                        [ Tidak ada jadwal pertandingan untuk halaman atau filter ini ]
                      </td>
                    </tr>
                  ) : (
                    pageMatches.map((m, idx) => {
                      const globalNum = startIdx + idx + 1;
                      const matchNum = String(m.matchNumber || globalNum).replace(/\D/g, "") || String(globalNum);
                      const bName = getAthleteName(m.fighterBlueName || m.fighterBlueId);
                      const bClub = getAthleteClub(m.fighterBlueClub, m.fighterBlueId);
                      const rName = getAthleteName(m.fighterRedName || m.fighterRedId);
                      const rClub = getAthleteClub(m.fighterRedClub, m.fighterRedId);
                      const clsText = getClassDisplay(m);
                      const stageText = (m.stage || "PENYISIHAN").toUpperCase();
                      const scoreBlueVal = getRemarkScore(m, "BLUE");
                      const scoreRedVal = getRemarkScore(m, "RED");

                      return (
                        <tr key={m.id || idx} className="border-b border-black">
                          <td className="border-r border-black p-1 text-center font-bold text-slate-900">
                            {globalNum}
                          </td>
                          <td className="border-r border-black p-1 text-center font-black text-sm font-mono text-black">
                            {matchNum}
                          </td>
                          <td className="border-r border-black p-1 text-center leading-tight">
                            <span className="font-bold text-black uppercase block text-[8.5px]">
                              {clsText}
                            </span>
                            <span className="text-[7.5px] font-semibold text-slate-600 uppercase block">
                              {stageText}
                            </span>
                          </td>
                          {/* Sudut Biru */}
                          <td className="border-r border-black p-1.5 text-center leading-tight">
                            <span className="font-black text-[#1d4ed8] uppercase block text-[9px]">
                              {bName}
                            </span>
                            <span className="text-[7.5px] font-bold text-slate-600 uppercase block">
                              {bClub}
                            </span>
                          </td>
                          {/* Sudut Merah */}
                          <td className="border-r border-black p-1.5 text-center leading-tight">
                            <span className="font-black text-[#dc2626] uppercase block text-[9px]">
                              {rName}
                            </span>
                            <span className="text-[7.5px] font-bold text-slate-600 uppercase block">
                              {rClub}
                            </span>
                          </td>
                          {/* Remark Col 1: Skor Akhir Sudut Biru */}
                          <td className="border-r border-black p-0.5 text-center align-middle bg-blue-50/30">
                            <input
                              type="text"
                              value={scoreBlueVal}
                              onChange={(e) => handleChangeRemarkScore(m, "BLUE", e.target.value)}
                              placeholder=""
                              title="Input Skor Akhir Sudut Biru"
                              className="w-full h-7 text-center font-mono font-black text-[11px] text-[#1d4ed8] bg-transparent border border-transparent hover:border-blue-300 focus:border-blue-600 focus:bg-white outline-none rounded px-0.5"
                            />
                          </td>
                          {/* Remark Col 2: Skor Akhir Sudut Merah */}
                          <td className="p-0.5 text-center align-middle bg-red-50/30">
                            <input
                              type="text"
                              value={scoreRedVal}
                              onChange={(e) => handleChangeRemarkScore(m, "RED", e.target.value)}
                              placeholder=""
                              title="Input Skor Akhir Sudut Merah"
                              className="w-full h-7 text-center font-mono font-black text-[11px] text-[#dc2626] bg-transparent border border-transparent hover:border-red-300 focus:border-red-600 focus:bg-white outline-none rounded px-0.5"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* BOTTOM OFFICIAL BLOCK: CATATAN & LEMBAR PENGESAHAN */}
            <div className="mt-4 pt-2">
              {/* Catatan untuk Official */}
              <div className="border border-slate-400 p-2 rounded mb-4 text-left text-[8px] text-slate-800 bg-slate-50">
                <span className="font-bold block uppercase mb-0.5">Catatan untuk Official Tim :</span>
                <p className="m-0 leading-relaxed font-medium">
                  1. Dimohon meneliti secara cermat jadwal pertandingan diatas! Jika terdapat kesalahan nama atlet atau kelas, segera laporkan ke sekretariat pertandingan.<br />
                  2. Pesilat wajib hadir di ruang pemanasan 30 menit sebelum partai dimulai sesuai jadwal yang tertera.
                </p>
              </div>

              {/* Tanda Tangan / Pengesahan (Ditampilkan sesuai centang TTD Ketua Pertandingan & Sekretaris) */}
              {useSignatures && (
                <div className="grid grid-cols-2 text-center text-[9px] text-black">
                  {/* Left: Ketua Pertandingan */}
                  <div className="flex flex-col items-center">
                    <span className="font-medium">Mengetahui,</span>
                    <span className="font-bold uppercase mt-0.5">Ketua Pertandingan,</span>
                    <div className="h-16"></div>
                    <span className="font-bold uppercase underline underline-offset-4 tracking-wider">
                      {ketua || "(......................................................)"}
                    </span>
                  </div>

                  {/* Right: Sekretaris Pertandingan + Kota/Tempat Dibuat & Tanggal Dibuat */}
                  <div className="flex flex-col items-center">
                    <span className="font-medium">{(kotaDibuat || "IDI RAYEUK").toUpperCase()}, {(tanggalHari || "01 JULI 2026").toUpperCase()}</span>
                    <span className="font-bold uppercase mt-0.5">Sekretaris Pertandingan,</span>
                    <div className="h-16"></div>
                    <span className="font-bold uppercase underline underline-offset-4 tracking-wider">
                      {sekretaris || "(......................................................)"}
                    </span>
                  </div>
                </div>
              )}

              {/* Page Numbering Footer */}
              <div className="flex items-center justify-between text-[7.5px] font-mono text-slate-500 pt-3 border-t border-slate-300 mt-3">
                <span>DIGITAL SCORING PENCAK SILAT INDONESIA &copy; PB IPSI OFFICIAL</span>
                <span>Halaman {activePage} dari {totalPages}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MODAL CONFIG KOP & TANDA TANGAN */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0720] border-2 border-purple-600/60 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative text-slate-100">
            <button
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-sans font-black text-sm uppercase tracking-wider text-amber-300 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              PENGATURAN KOP & PENGESAHAN DOKUMEN A4
            </h3>

            <div className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-[10px] font-black uppercase text-purple-300/80 mb-1 block">
                  Nama Event Kejuaraan:
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEventName(val);
                    localStorage.setItem("jrz_event_name", val);
                    localStorage.setItem("sekretaris_eventName", val);
                  }}
                  className="w-full bg-[#150a2b] border border-purple-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-purple-300/80 mb-1 block">
                    Tempat Pelaksanaan:
                  </label>
                  <input
                    type="text"
                    value={tempat}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTempat(val);
                      localStorage.setItem("jrz_tempat_pelaksanaan", val);
                      localStorage.setItem("sekretaris_tempatPelaksanaan", val);
                    }}
                    className="w-full bg-[#150a2b] border border-purple-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-purple-300/80 mb-1 block">
                    Waktu Pelaksanaan:
                  </label>
                  <input
                    type="text"
                    value={waktu}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWaktu(val);
                      localStorage.setItem("jrz_waktu_pelaksanaan", val);
                      localStorage.setItem("sekretaris_waktuPelaksanaan", val);
                    }}
                    className="w-full bg-[#150a2b] border border-purple-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-purple-300/80 mb-1 block">
                    Kota / Tempat Dibuat:
                  </label>
                  <input
                    type="text"
                    value={kotaDibuat}
                    onChange={(e) => {
                      const val = e.target.value;
                      setKotaDibuat(val);
                      localStorage.setItem("sekretaris_namaDaerahCetak", val);
                      localStorage.setItem("jrz_nama_daerah_cetak", val);
                    }}
                    className="w-full bg-[#150a2b] border border-purple-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-purple-300/80 mb-1 block">
                    Tanggal Dibuat:
                  </label>
                  <input
                    type="text"
                    value={tanggalHari}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTanggalHari(val);
                      localStorage.setItem("sekretaris_tanggalCetakDokumen", val);
                      localStorage.setItem("jrz_tanggal_cetak_dokumen", val);
                      localStorage.setItem("jrz_tanggal_hari", val);
                    }}
                    className="w-full bg-[#150a2b] border border-purple-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-purple-300/80 mb-1 block">
                    Ketua Pertandingan:
                  </label>
                  <input
                    type="text"
                    value={ketua}
                    onChange={(e) => {
                      const val = e.target.value;
                      setKetua(val);
                      localStorage.setItem("jrz_nama_ketua_pertandingan", val);
                      localStorage.setItem("sekretaris_namaKetuaPertandingan", val);
                    }}
                    className="w-full bg-[#150a2b] border border-purple-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-purple-300/80 mb-1 block">
                    Sekretaris Pertandingan:
                  </label>
                  <input
                    type="text"
                    value={sekretaris}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSekretaris(val);
                      localStorage.setItem("jrz_nama_sekretaris_pertandingan", val);
                      localStorage.setItem("sekretaris_namaSekretarisPertandingan", val);
                    }}
                    className="w-full bg-[#150a2b] border border-purple-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Opsi Centang TTD Ketua Panitia & Sekretaris */}
              <div
                onClick={toggleUseSignatures}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#150a2b] border border-purple-800/70 cursor-pointer select-none mt-1"
              >
                {useSignatures ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span className="text-xs font-bold text-slate-200">
                  Gunakan TTD Ketua Panitia dan Sekretaris pada dokumen cetak / PDF
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Selesai & Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
