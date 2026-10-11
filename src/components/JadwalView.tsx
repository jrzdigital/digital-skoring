/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  Clock, 
  Trophy, 
  RefreshCw, 
  Plus, 
  Printer, 
  Shield, 
  Eye, 
  Layers
} from "lucide-react";
import { sound } from "../utils/sound";
import { MatchState } from "../types";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface JadwalViewProps {
  onBack: () => void;
  onLoadMatchToArena?: (matchData: any) => Promise<void> | void;
  activeMatchState?: MatchState | null;
}

export function JadwalView({
  onBack,
  onLoadMatchToArena,
  activeMatchState
}: JadwalViewProps) {
  // Read cached schedules from localStorage
  const [schedules, setSchedules] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("jrz_cached_schedules");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    
    // Default sample schedules for instant preview if empty
    return [
      {
        id: "partai-1",
        matchNumber: 1,
        arena: "GELANGGANG 1",
        division: "REMAJA",
        categoryClass: "KELAS C",
        gender: "PUTRA",
        stage: "BABAK PENYISIHAN",
        fighterBlueName: "AHMAD FAUZI",
        fighterBlueClub: "PERSINAS ASAD DKI",
        fighterRedName: "BAYU WICAKSONO",
        fighterRedClub: "TAPAK SUCI JATENG",
        status: "SELESAI",
        winner: "BIRU",
        scoreBlue: 24,
        scoreRed: 18
      },
      {
        id: "partai-2",
        matchNumber: 2,
        arena: "GELANGGANG 1",
        division: "REMAJA",
        categoryClass: "KELAS D",
        gender: "PUTRA",
        stage: "BABAK PENYISIHAN",
        fighterBlueName: "DIMAS PRASETYA",
        fighterBlueClub: "PSHT JAWA TIMUR",
        fighterRedName: "RIZKY RAMADHAN",
        fighterRedClub: "MERPATI PUTIH JABAR",
        status: "SEDANG",
        scoreBlue: 12,
        scoreRed: 15
      },
      {
        id: "partai-3",
        matchNumber: 3,
        arena: "GELANGGANG 1",
        division: "DEWASA",
        categoryClass: "KELAS B",
        gender: "PUTRI",
        stage: "PEREMPAT FINAL",
        fighterBlueName: "SITI NURHALIZA",
        fighterBlueClub: "PERISAI DIRI BALI",
        fighterRedName: "DEWI ANGGRAENI",
        fighterRedClub: "KERA SAKTI SUMUT",
        status: "BELUM"
      },
      {
        id: "partai-4",
        matchNumber: 4,
        arena: "GELANGGANG 2",
        division: "DEWASA",
        categoryClass: "KELAS A",
        gender: "PUTRA",
        stage: "SEMI FINAL",
        fighterBlueName: "M. ILHAM",
        fighterBlueClub: "PAGAR NUSA RIAU",
        fighterRedName: "TEGUH ARDIYANTO",
        fighterRedClub: "SATRIA MUDA INDONESIA",
        status: "BELUM"
      }
    ];
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArena, setSelectedArena] = useState("SEMUA");
  const [selectedStatus, setSelectedStatus] = useState("SEMUA");
  const [selectedStage, setSelectedStage] = useState("SEMUA");

  // Save schedules to cache
  const saveSchedules = (data: any[]) => {
    setSchedules(data);
    try {
      localStorage.setItem("jrz_cached_schedules", JSON.stringify(data));
    } catch {}
  };

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((m) => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        (m.fighterBlueName && m.fighterBlueName.toLowerCase().includes(search)) ||
        (m.fighterRedName && m.fighterRedName.toLowerCase().includes(search)) ||
        (m.fighterBlueClub && m.fighterBlueClub.toLowerCase().includes(search)) ||
        (m.fighterRedClub && m.fighterRedClub.toLowerCase().includes(search)) ||
        (m.categoryClass && m.categoryClass.toLowerCase().includes(search)) ||
        String(m.matchNumber).includes(search);

      // Arena filter
      const matchArena =
        selectedArena === "SEMUA" ||
        (m.arena && m.arena.toUpperCase().includes(selectedArena.toUpperCase()));

      // Status filter
      const matchStatus =
        selectedStatus === "SEMUA" ||
        (selectedStatus === "SELESAI" && m.status === "SELESAI") ||
        (selectedStatus === "SEDANG" && m.status === "SEDANG") ||
        (selectedStatus === "BELUM" && (!m.status || m.status === "BELUM"));

      // Stage filter
      const matchStage =
        selectedStage === "SEMUA" ||
        (m.stage && m.stage.toUpperCase().includes(selectedStage.toUpperCase()));

      return matchSearch && matchArena && matchStatus && matchStage;
    });
  }, [schedules, searchTerm, selectedArena, selectedStatus, selectedStage]);

  // Statistics
  const totalMatches = schedules.length;
  const finishedMatches = schedules.filter((s) => s.status === "SELESAI").length;
  const liveMatches = schedules.filter((s) => s.status === "SEDANG").length;
  const pendingMatches = totalMatches - finishedMatches - liveMatches;

  // Export PDF Jadwal
  const exportPdfJadwal = () => {
    sound.playClick();
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("JADWAL PERTANDINGAN PENCAK SILAT RESMI", 148, 15, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Standar Peraturan IPSI 2026 & PERSILAT • Filter: ${selectedArena} • Total: ${filteredSchedules.length} Partai`,
      148,
      22,
      { align: "center" }
    );

    const rows = filteredSchedules.map((item, idx) => [
      item.matchNumber || idx + 1,
      item.arena || "GELANGGANG 1",
      `${item.division || "DEWASA"} - ${item.categoryClass || "KELAS"} (${item.gender || "PUTRA"})`,
      item.stage || "PENYISIHAN",
      `${item.fighterBlueName || "-"} (${item.fighterBlueClub || "-"})`,
      `${item.fighterRedName || "-"} (${item.fighterRedClub || "-"})`,
      item.status === "SELESAI" 
        ? `${item.scoreBlue || 0} - ${item.scoreRed || 0} (${item.winner || "-"})` 
        : item.status === "SEDANG"
          ? "SEDANG TANDING ⚡"
          : "BELUM"
    ]);

    autoTable(doc, {
      startY: 28,
      head: [["NO", "GELANGGANG", "KELAS / GENDER", "BABAK", "SUDUT BIRU", "SUDUT MERAH", "STATUS / SKOR"]],
      body: rows,
      theme: "grid",
      headStyles: {
        fillColor: [12, 24, 66],
        textColor: [255, 255, 255],
        fontSize: 9,
        halign: "center"
      },
      bodyStyles: {
        fontSize: 8.5,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { halign: "center", cellWidth: 28 },
        2: { halign: "center", cellWidth: 40 },
        3: { halign: "center", cellWidth: 35 },
        4: { cellWidth: 65 },
        5: { cellWidth: 65 },
        6: { halign: "center", cellWidth: 32 }
      }
    });

    doc.save(`Jadwal_Pertandingan_${selectedArena}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#040817] text-slate-100 font-sans select-none p-3 sm:p-5 md:p-6 w-full max-w-7xl mx-auto">
      {/* 1. TOP HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-3 bg-[#0a122e]/90 border border-blue-500/30 rounded-2xl p-3 sm:p-4 shadow-[0_0_30px_rgba(29,78,216,0.2)] mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playClick();
              onBack();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Kembali</span>
          </button>

          <div className="w-[1.5px] h-6 bg-slate-800 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-black uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-cyan-400" />
                JADWAL PERTANDINGAN
              </span>
              <span className="text-xs text-slate-400 font-mono hidden md:inline">
                REKAP PARTAI TANDING RESMI
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-white uppercase tracking-wider mt-0.5">
              JADWAL & STATUS PARTAI PERTANDINGAN
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportPdfJadwal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Unduh PDF Jadwal</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </header>

      {/* 2. STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-[#0b1435] border border-blue-500/30 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">TOTAL PARTAI</span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono">{totalMatches}</span>
          </div>
          <Layers className="w-7 h-7 text-cyan-400 opacity-80" />
        </div>

        <div className="bg-[#091f2a] border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-emerald-400/90 uppercase block font-bold">SELESAI</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">{finishedMatches}</span>
          </div>
          <CheckCircle className="w-7 h-7 text-emerald-400 opacity-80" />
        </div>

        <div className="bg-[#241708] border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-amber-400/90 uppercase block font-bold">SEDANG TANDING</span>
            <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono">{liveMatches}</span>
          </div>
          <Play className="w-7 h-7 text-amber-400 opacity-80 animate-pulse" />
        </div>

        <div className="bg-[#1b112c] border border-purple-500/30 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-purple-400/90 uppercase block font-bold">BELUM TANDING</span>
            <span className="text-xl sm:text-2xl font-black text-purple-300 font-mono">{pendingMatches}</span>
          </div>
          <Clock className="w-7 h-7 text-purple-400 opacity-80" />
        </div>
      </div>

      {/* 3. FILTER & SEARCH TOOLBAR */}
      <div className="bg-[#080f26] border border-slate-800 rounded-2xl p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari atlet, kontingen, kelas, atau nomor partai..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#040817] border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Arena Selector */}
          <select
            value={selectedArena}
            onChange={(e) => setSelectedArena(e.target.value)}
            className="bg-[#040817] border border-slate-700 text-cyan-300 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-cyan-400"
          >
            <option value="SEMUA">Semua Gelanggang</option>
            <option value="GELANGGANG 1">Gelanggang 1</option>
            <option value="GELANGGANG 2">Gelanggang 2</option>
            <option value="GELANGGANG 3">Gelanggang 3</option>
          </select>

          {/* Status Selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#040817] border border-slate-700 text-amber-300 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-cyan-400"
          >
            <option value="SEMUA">Semua Status</option>
            <option value="SEDANG">Sedang Tanding</option>
            <option value="BELUM">Belum Tanding</option>
            <option value="SELESAI">Selesai</option>
          </select>

          {/* Stage Selector */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="bg-[#040817] border border-slate-700 text-purple-300 text-xs rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-cyan-400"
          >
            <option value="SEMUA">Semua Babak</option>
            <option value="PENYISIHAN">Penyisihan</option>
            <option value="PEREMPAT FINAL">Perempat Final</option>
            <option value="SEMI FINAL">Semi Final</option>
            <option value="FINAL">Final</option>
          </select>
        </div>
      </div>

      {/* 4. SCHEDULE CARDS LIST */}
      <div className="space-y-3">
        {filteredSchedules.length === 0 ? (
          <div className="bg-[#09122c] border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="font-bold text-sm">Tidak ada jadwal pertandingan yang sesuai filter.</p>
            <p className="text-xs text-slate-500 mt-1">Coba ubah kata kunci pencarian atau reset filter.</p>
          </div>
        ) : (
          filteredSchedules.map((m) => {
            const isFinished = m.status === "SELESAI";
            const isLive = m.status === "SEDANG";

            return (
              <div
                key={m.id}
                className="bg-gradient-to-r from-[#070e24] via-[#091438] to-[#070e24] border border-blue-500/30 hover:border-cyan-400/60 rounded-2xl p-3 sm:p-4 shadow-md transition-all duration-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs font-mono">
                      PARTAI #{m.matchNumber}
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-300">
                      {m.arena || "GELANGGANG 1"}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs font-bold text-slate-300">
                      {m.division || "DEWASA"} {m.categoryClass || "KELAS"} ({m.gender || "PUTRA"})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded">
                      {m.stage || "PENYISIHAN"}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase ${
                      isFinished
                        ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                        : isLive
                          ? "bg-amber-950/80 text-amber-400 border border-amber-500/40 animate-pulse"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}>
                      {isFinished ? "SELESAI 🏆" : isLive ? "SEDANG TANDING ⚡" : "BELUM DIMULAI ⏱️"}
                    </span>
                  </div>
                </div>

                {/* Matchup Layout (Blue vs Red) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Sudut Biru */}
                  <div className="md:col-span-5 bg-[#031533]/80 border border-cyan-500/40 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-black text-cyan-400 uppercase tracking-wider block">
                        SUDUT BIRU
                      </span>
                      <h4 className="text-sm font-black text-white uppercase">{m.fighterBlueName || "PESILAT BIRU"}</h4>
                      <p className="text-xs text-cyan-300/70 font-bold uppercase truncate">{m.fighterBlueClub || "-"}</p>
                    </div>
                    {isFinished && (
                      <span className="text-2xl font-digital font-black text-cyan-400 ml-2">
                        {m.scoreBlue || 0}
                      </span>
                    )}
                  </div>

                  {/* Center VS Indicator */}
                  <div className="md:col-span-2 text-center flex flex-col items-center justify-center">
                    <span className="text-xs font-black text-slate-500 font-mono tracking-widest">VS</span>
                    {isFinished && m.winner && (
                      <span className={`text-[10px] font-mono font-black mt-1 uppercase px-2 py-0.5 rounded ${
                        m.winner === "BIRU" ? "bg-cyan-950 text-cyan-300" : "bg-rose-950 text-rose-300"
                      }`}>
                        PEMENANG: {m.winner}
                      </span>
                    )}
                  </div>

                  {/* Sudut Merah */}
                  <div className="md:col-span-5 bg-[#29030b]/80 border border-rose-500/40 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono font-black text-rose-400 uppercase tracking-wider block">
                        SUDUT MERAH
                      </span>
                      <h4 className="text-sm font-black text-white uppercase">{m.fighterRedName || "PESILAT MERAH"}</h4>
                      <p className="text-xs text-rose-300/70 font-bold uppercase truncate">{m.fighterRedClub || "-"}</p>
                    </div>
                    {isFinished && (
                      <span className="text-2xl font-digital font-black text-rose-400 ml-2">
                        {m.scoreRed || 0}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                {onLoadMatchToArena && (
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex justify-end">
                    <button
                      onClick={() => {
                        sound.playClick();
                        onLoadMatchToArena(m);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Muat ke Gelanggang Ini</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
