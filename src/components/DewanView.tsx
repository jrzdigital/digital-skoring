import React, { useState } from "react";
import { AppState, Match, CompetitorPerformance } from "../types";
import { Check, ShieldAlert, Award, AlertTriangle, ToggleLeft, ToggleRight, XCircle, Trash2, Edit3, Lock, CheckSquare } from "lucide-react";

interface DewanViewProps {
  appState: AppState;
  onDispatchAction: (type: string, payload: any) => void;
}

export default function DewanView({ appState, onDispatchAction }: DewanViewProps) {
  const { matches, activeMatchId, juryCount } = appState;
  const activeMatch = matches.find(m => m.id === activeMatchId);

  const [activeSubTab, setActiveSubTab] = useState<"scores" | "penalties">("scores");
  const [tempDeduction, setTempDeduction] = useState<string>("0");

  if (!activeMatch) {
    return (
      <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10 text-gray-400">
        Belum ada partai aktif yang dipilih. Silakan atur jadwal pertandingan di Sekretariat.
      </div>
    );
  }

  // General helper to compute detailed judge statistics including high/low discards
  const computeDetailedScores = (competitor: CompetitorPerformance) => {
    const list: Array<{ judgeIndex: number; totalScore: number; discarded: 'LOW' | 'HIGH' | 'NONE' }> = [];
    
    // Read scores up to current juryCount limit
    for (let i = 1; i <= juryCount; i++) {
      const s = competitor.judgesScores[i];
      if (s) {
        // Calculate total score for this judge based on categories
        const isTunggalRegu = activeMatch.kategori === "Tunggal" || activeMatch.kategori === "Regu";
        const sum = isTunggalRegu 
          ? (s.kebenaran + s.kemantapan)
          : (s.teknik + s.harmonisasi + s.penjiwaan);
        
        list.push({
          judgeIndex: i,
          totalScore: parseFloat(sum.toFixed(2)),
          discarded: "NONE"
        });
      }
    }

    if (list.length === 0) {
      return {
        judgesList: [],
        sumRemaining: 0,
        finalScore: 0,
        median: 0,
        stdDev: 0,
        validCount: 0
      };
    }

    // Sort to determine lowest/highest discards
    const sorted = [...list].sort((a, b) => a.totalScore - b.totalScore);
    
    let bottomCount = 0;
    let topCount = 0;

    if (juryCount >= 10) {
      bottomCount = 3;
      topCount = 3;
    } else if (juryCount >= 8) {
      bottomCount = 2;
      topCount = 2;
    } else if (juryCount >= 5) {
      bottomCount = 1;
      topCount = 1;
    } else if (juryCount >= 4) {
      bottomCount = 1;
      topCount = 1;
    }

    // Mark discarded lowest
    for (let i = 0; i < bottomCount; i++) {
      if (sorted[i]) {
        const originalItem = list.find(item => item.judgeIndex === sorted[i].judgeIndex);
        if (originalItem) originalItem.discarded = "LOW";
      }
    }

    // Mark discarded highest
    for (let i = 0; i < topCount; i++) {
      const idx = sorted.length - 1 - i;
      if (sorted[idx]) {
        const originalItem = list.find(item => item.judgeIndex === sorted[idx].judgeIndex);
        if (originalItem) originalItem.discarded = "HIGH";
      }
    }

    // Sum up remaining scores
    const remaining = list.filter(item => item.discarded === "NONE");
    const sumRemaining = remaining.reduce((sum, item) => sum + item.totalScore, 0);
    const finalScore = Math.max(0, sumRemaining - competitor.wrongMovesDeduction);

    // Median of ALL scores
    const allSortedScores = sorted.map(i => i.totalScore);
    const midIdx = Math.floor(allSortedScores.length / 2);
    const median = allSortedScores.length % 2 !== 0 
      ? allSortedScores[midIdx]
      : (allSortedScores[midIdx - 1] + allSortedScores[midIdx]) / 2;

    // Standard deviation of ALL scores
    const mean = allSortedScores.reduce((a, b) => a + b, 0) / allSortedScores.length;
    const squaredDiffs = allSortedScores.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / allSortedScores.length;
    const stdDev = Math.sqrt(variance);

    return {
      judgesList: list,
      sumRemaining,
      finalScore,
      median,
      stdDev,
      validCount: remaining.length
    };
  };

  const redScores = computeDetailedScores(activeMatch.sudutMerah);
  const blueScores = computeDetailedScores(activeMatch.sudutBiru);

  const handleApproveScore = (sudut: 'Merah' | 'Biru', currentApproved: boolean) => {
    onDispatchAction("APPROVE_SCORE", {
      matchId: activeMatch.id,
      sudut,
      approved: !currentApproved
    });
  };

  const handleDisqualify = (sudut: 'Merah' | 'Biru', currentDisqualified: boolean) => {
    const confirmDisq = window.confirm(`Apakah Anda yakin ingin mengubah status diskualifikasi Sudut ${sudut}?`);
    if (confirmDisq) {
      onDispatchAction("DISQUALIFY_COMPETITOR", {
        matchId: activeMatch.id,
        sudut,
        disqualified: !currentDisqualified
      });
    }
  };

  const handleApplyDeduction = (sudut: 'Merah' | 'Biru') => {
    const value = parseFloat(tempDeduction);
    if (isNaN(value) || value < 0) {
      alert("Format pengurangan nilai tidak valid!");
      return;
    }
    onDispatchAction("UPDATE_COMPETITOR_DEDUCTION", {
      matchId: activeMatch.id,
      sudut,
      deduction: value
    });
    alert(`Deduction Dewan sebesar -${value.toFixed(2)} berhasil diterapkan untuk Sudut ${sudut}!`);
  };

  const handleSetWinner = (winner: 'Merah' | 'Biru' | null) => {
    onDispatchAction("UPDATE_MATCH_STATUS", {
      matchId: activeMatch.id,
      status: winner ? "Completed" : "Playing",
      winner
    });
  };

  return (
    <div className="space-y-6">
      {/* Active Match Overview Header */}
      <div className="bg-gradient-to-r from-purple-950/40 to-blue-950/40 p-5 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-purple-400 font-extrabold uppercase tracking-widest bg-purple-900/20 px-2.5 py-1 rounded">
            PARTAI AKTIF &bull; {activeMatch.kategori}
          </span>
          <h2 className="text-xl font-display font-bold text-white mt-2">
            {activeMatch.sudutMerah.athlete?.nama || "TBD"} vs {activeMatch.sudutBiru.athlete?.nama || "TBD"}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Golongan: {activeMatch.usia} | Jenis Kelamin: {activeMatch.gender} | Jumlah Juri Aktif: {juryCount}
          </p>
        </div>

        {/* Master Match Winner & Approval Control */}
        <div className="flex items-center gap-2 bg-black/40 p-3 rounded-lg border border-white/5">
          <span className="text-xs font-bold text-gray-400 block mr-2">Pemenang Partai:</span>
          <button
            onClick={() => handleSetWinner(activeMatch.winner === "Merah" ? null : "Merah")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeMatch.winner === "Merah" 
                ? "bg-red-600 text-white glow-red" 
                : "bg-white/5 hover:bg-white/10 text-gray-300"
            }`}
          >
            SUDUT MERAH
          </button>
          <button
            onClick={() => handleSetWinner(activeMatch.winner === "Biru" ? null : "Biru")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
              activeMatch.winner === "Biru" 
                ? "bg-blue-600 text-white glow-blue" 
                : "bg-white/5 hover:bg-white/10 text-gray-300"
            }`}
          >
            SUDUT BIRU
          </button>
        </div>
      </div>

      {/* Selector Sub Tabs */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveSubTab("scores")}
          className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
            activeSubTab === "scores" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Rekap Skor Juri
        </button>
        <button
          onClick={() => setActiveSubTab("penalties")}
          className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
            activeSubTab === "penalties" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          Hukuman Dewan & Diskualifikasi
        </button>
      </div>

      {/* Main Content Area */}
      {activeSubTab === "scores" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* SUDUT MERAH (LEFT SIDE) */}
          <div className="glass-panel rounded-xl border border-red-500/10 p-5 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-600 rounded-full glow-red"></span>
                <h3 className="font-display font-extrabold text-base text-red-400">SUDUT MERAH</h3>
              </div>
              <span className="text-sm font-semibold text-white bg-red-950/40 px-2 py-0.5 rounded">
                {activeMatch.sudutMerah.athlete?.kontingen}
              </span>
            </div>

            <div className="bg-black/20 p-4 rounded-xl space-y-3">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Nama Pesilat:</span>
                <span className="font-bold text-white">{activeMatch.sudutMerah.athlete?.nama}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Total Juri Terbaca:</span>
                <span className="font-bold text-white">{redScores.judgesList.length} / {juryCount}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Rumus Discard IPSI:</span>
                <span className="font-bold text-yellow-400">
                  {juryCount >= 10 ? "Buang 3 Tertinggi & 3 Terendah" : juryCount >= 5 ? "Buang 1 Tertinggi & 1 Terendah" : "Rata-rata Utuh"}
                </span>
              </div>
            </div>

            {/* Detailed Judges Table for Merah */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 uppercase font-bold bg-white/5 font-mono">
                    <th className="p-2">Juri</th>
                    <th className="p-2 text-center">Rincian Nilai</th>
                    <th className="p-2 text-right">Total Juri</th>
                    <th className="p-2 text-center">Status Discard</th>
                  </tr>
                </thead>
                <tbody>
                  {redScores.judgesList.map((j) => {
                    const originalScoreObj = activeMatch.sudutMerah.judgesScores[j.judgeIndex];
                    const isTunggalRegu = activeMatch.kategori === "Tunggal" || activeMatch.kategori === "Regu";
                    
                    return (
                      <tr 
                        key={j.judgeIndex} 
                        className={`border-b border-white/5 transition-all ${
                          j.discarded !== "NONE" ? "opacity-35 line-through bg-black/30" : "hover:bg-white/5"
                        }`}
                      >
                        <td className="p-2 font-bold font-mono">JURI {j.judgeIndex}</td>
                        <td className="p-2 text-center text-xxs text-gray-400">
                          {originalScoreObj ? (
                            isTunggalRegu ? (
                              <span>Keb: {originalScoreObj.kebenaran.toFixed(2)} | Mantap: {originalScoreObj.kemantapan.toFixed(2)}</span>
                            ) : (
                              <span>Tek: {originalScoreObj.teknik.toFixed(2)} | Harmoni: {originalScoreObj.harmonisasi.toFixed(2)} | Jiwa: {originalScoreObj.penjiwaan.toFixed(2)}</span>
                            )
                          ) : "Belum Input"}
                        </td>
                        <td className="p-2 text-right font-bold text-white font-mono text-sm">
                          {j.totalScore.toFixed(2)}
                        </td>
                        <td className="p-2 text-center font-bold">
                          {j.discarded === "LOW" && <span className="text-red-500 text-xxs bg-red-500/10 px-1 py-0.5 rounded border border-red-500/20">TERENDAH</span>}
                          {j.discarded === "HIGH" && <span className="text-orange-400 text-xxs bg-orange-500/10 px-1 py-0.5 rounded border border-orange-500/20">TERTINGGI</span>}
                          {j.discarded === "NONE" && <span className="text-green-400 text-xxs bg-green-500/10 px-1 py-0.5 rounded border border-green-500/20">DIHITUNG</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 font-mono text-xxs text-gray-400">
              <div className="bg-black/30 p-2 rounded">
                <span>Median (Q2):</span>
                <span className="block text-sm font-bold text-white mt-1">{redScores.median.toFixed(2)}</span>
              </div>
              <div className="bg-black/30 p-2 rounded">
                <span>Std Deviasi (&sigma;):</span>
                <span className="block text-sm font-bold text-white mt-1">{redScores.stdDev.toFixed(2)}</span>
              </div>
            </div>

            {/* Final calculation box */}
            <div className="bg-gradient-to-r from-red-950/20 to-black/60 p-4 rounded-xl border border-red-900/20 space-y-3">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Jumlah Nilai Juri Terpilih:</span>
                <span className="font-bold text-white font-mono">{redScores.sumRemaining.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-red-400">
                <span>Hukuman / Pengurangan Dewan:</span>
                <span className="font-bold font-mono">-{activeMatch.sudutMerah.wrongMovesDeduction.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-red-900/30">
                <span className="text-sm font-bold text-yellow-400 uppercase tracking-wider font-display">SKOR AKHIR SENI:</span>
                <span className="text-3xl font-mono font-black text-yellow-400 glow-gold">
                  {activeMatch.sudutMerah.isDisqualified ? "DISQUALIFIED" : redScores.finalScore.toFixed(2)}
                </span>
              </div>

              {/* Approve / Lock */}
              <button
                onClick={() => handleApproveScore("Merah", activeMatch.sudutMerah.scoreApproved)}
                className={`w-full py-2 px-4 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMatch.sudutMerah.scoreApproved
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
                id="btn-approve-merah"
              >
                <Lock className="w-3.5 h-3.5" />
                {activeMatch.sudutMerah.scoreApproved ? "BATALKAN SAHKAN SKOR" : "SAHKAN & KUNCI SKOR (PUBLISH)"}
              </button>
            </div>
          </div>

          {/* SUDUT BIRU (RIGHT SIDE) */}
          <div className="glass-panel rounded-xl border border-blue-500/10 p-5 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-600 rounded-full glow-blue"></span>
                <h3 className="font-display font-extrabold text-base text-blue-400">SUDUT BIRU</h3>
              </div>
              <span className="text-sm font-semibold text-white bg-blue-950/40 px-2 py-0.5 rounded">
                {activeMatch.sudutBiru.athlete?.kontingen}
              </span>
            </div>

            <div className="bg-black/20 p-4 rounded-xl space-y-3">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Nama Pesilat:</span>
                <span className="font-bold text-white">{activeMatch.sudutBiru.athlete?.nama}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Total Juri Terbaca:</span>
                <span className="font-bold text-white">{blueScores.judgesList.length} / {juryCount}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Rumus Discard IPSI:</span>
                <span className="font-bold text-yellow-400">
                  {juryCount >= 10 ? "Buang 3 Tertinggi & 3 Terendah" : juryCount >= 5 ? "Buang 1 Tertinggi & 1 Terendah" : "Rata-rata Utuh"}
                </span>
              </div>
            </div>

            {/* Detailed Judges Table for Biru */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 uppercase font-bold bg-white/5 font-mono">
                    <th className="p-2">Juri</th>
                    <th className="p-2 text-center">Rincian Nilai</th>
                    <th className="p-2 text-right">Total Juri</th>
                    <th className="p-2 text-center">Status Discard</th>
                  </tr>
                </thead>
                <tbody>
                  {blueScores.judgesList.map((j) => {
                    const originalScoreObj = activeMatch.sudutBiru.judgesScores[j.judgeIndex];
                    const isTunggalRegu = activeMatch.kategori === "Tunggal" || activeMatch.kategori === "Regu";
                    
                    return (
                      <tr 
                        key={j.judgeIndex} 
                        className={`border-b border-white/5 transition-all ${
                          j.discarded !== "NONE" ? "opacity-35 line-through bg-black/30" : "hover:bg-white/5"
                        }`}
                      >
                        <td className="p-2 font-bold font-mono">JURI {j.judgeIndex}</td>
                        <td className="p-2 text-center text-xxs text-gray-400">
                          {originalScoreObj ? (
                            isTunggalRegu ? (
                              <span>Keb: {originalScoreObj.kebenaran.toFixed(2)} | Mantap: {originalScoreObj.kemantapan.toFixed(2)}</span>
                            ) : (
                              <span>Tek: {originalScoreObj.teknik.toFixed(2)} | Harmoni: {originalScoreObj.harmonisasi.toFixed(2)} | Jiwa: {originalScoreObj.penjiwaan.toFixed(2)}</span>
                            )
                          ) : "Belum Input"}
                        </td>
                        <td className="p-2 text-right font-bold text-white font-mono text-sm">
                          {j.totalScore.toFixed(2)}
                        </td>
                        <td className="p-2 text-center font-bold">
                          {j.discarded === "LOW" && <span className="text-red-500 text-xxs bg-red-500/10 px-1 py-0.5 rounded border border-red-500/20">TERENDAH</span>}
                          {j.discarded === "HIGH" && <span className="text-orange-400 text-xxs bg-orange-500/10 px-1 py-0.5 rounded border border-orange-500/20">TERTINGGI</span>}
                          {j.discarded === "NONE" && <span className="text-green-400 text-xxs bg-green-500/10 px-1 py-0.5 rounded border border-green-500/20">DIHITUNG</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 font-mono text-xxs text-gray-400">
              <div className="bg-black/30 p-2 rounded">
                <span>Median (Q2):</span>
                <span className="block text-sm font-bold text-white mt-1">{blueScores.median.toFixed(2)}</span>
              </div>
              <div className="bg-black/30 p-2 rounded">
                <span>Std Deviasi (&sigma;):</span>
                <span className="block text-sm font-bold text-white mt-1">{blueScores.stdDev.toFixed(2)}</span>
              </div>
            </div>

            {/* Final calculation box */}
            <div className="bg-gradient-to-r from-blue-950/20 to-black/60 p-4 rounded-xl border border-blue-900/20 space-y-3">
              <div className="flex justify-between text-xs text-gray-300">
                <span>Jumlah Nilai Juri Terpilih:</span>
                <span className="font-bold text-white font-mono">{blueScores.sumRemaining.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-red-400">
                <span>Hukuman / Pengurangan Dewan:</span>
                <span className="font-bold font-mono">-{activeMatch.sudutBiru.wrongMovesDeduction.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-blue-900/30">
                <span className="text-sm font-bold text-yellow-400 uppercase tracking-wider font-display">SKOR AKHIR SENI:</span>
                <span className="text-3xl font-mono font-black text-yellow-400 glow-gold">
                  {activeMatch.sudutBiru.isDisqualified ? "DISQUALIFIED" : blueScores.finalScore.toFixed(2)}
                </span>
              </div>

              {/* Approve / Lock */}
              <button
                onClick={() => handleApproveScore("Biru", activeMatch.sudutBiru.scoreApproved)}
                className={`w-full py-2 px-4 rounded font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMatch.sudutBiru.scoreApproved
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
                id="btn-approve-biru"
              >
                <Lock className="w-3.5 h-3.5" />
                {activeMatch.sudutBiru.scoreApproved ? "BATALKAN SAHKAN SKOR" : "SAHKAN & KUNCI SKOR (PUBLISH)"}
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* PENALTIES & DISQUALIFICATION TAB */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          
          {/* Deductions and Penalties Merah */}
          <div className="glass-panel p-5 rounded-xl border border-red-500/10 space-y-4">
            <h3 className="font-display font-bold text-red-400 flex items-center gap-2 pb-2 border-b border-white/5">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Kelola Penalti & Status Sudut Merah
            </h3>

            <div>
              <p className="text-sm font-semibold text-white">{activeMatch.sudutMerah.athlete?.nama}</p>
              <p className="text-xs text-gray-400">{activeMatch.sudutMerah.athlete?.kontingen}</p>
            </div>

            {/* Manual Deduction Input */}
            <div className="space-y-2 bg-black/30 p-4 rounded-lg">
              <label className="block text-xs text-gray-400 font-bold">PENGURANGAN NILAI DEWAN (MANUAL)</label>
              <p className="text-xxs text-gray-500 leading-relaxed mb-2">
                Diberikan untuk pelanggaran disiplin (misal: keluar gelanggang, pakaian tidak rapi, aksesoris terlepas, atau kelebihan/kekurangan waktu).
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Jumlah (e.g. 0.05)"
                  defaultValue={activeMatch.sudutMerah.wrongMovesDeduction}
                  onChange={e => setTempDeduction(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded px-3 py-2 text-sm text-white font-mono w-32 focus:outline-none focus:border-red-500"
                />
                <button
                  onClick={() => handleApplyDeduction("Merah")}
                  className="bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/30 font-bold text-xs px-4 py-2 rounded transition-all cursor-pointer"
                >
                  Terapkan Pengurangan
                </button>
              </div>
              <div className="flex justify-between text-xxs text-gray-400 pt-2 border-t border-white/5">
                <span>Pengurangan Aktif:</span>
                <span className="font-mono text-red-400 font-bold">-{activeMatch.sudutMerah.wrongMovesDeduction.toFixed(2)}</span>
              </div>
            </div>

            {/* Disqualification State Toggle */}
            <div className="flex items-center justify-between p-3 bg-red-950/10 border border-red-500/20 rounded-lg">
              <div>
                <span className="text-xs font-bold text-white block">DISKUALIFIKASI SUDUT MERAH</span>
                <span className="text-xxs text-gray-400">Coret atlet dari partai ini dan beri status diskualifikasi</span>
              </div>
              <button
                onClick={() => handleDisqualify("Merah", activeMatch.sudutMerah.isDisqualified)}
                className={`font-extrabold text-xs px-4 py-2 rounded transition-all cursor-pointer ${
                  activeMatch.sudutMerah.isDisqualified
                    ? "bg-red-600 text-white shadow-lg glow-red"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                {activeMatch.sudutMerah.isDisqualified ? "TER-DISKUALIFIKASI" : "AKTIFKAN DISKUALIFIKASI"}
              </button>
            </div>
          </div>

          {/* Deductions and Penalties Biru */}
          <div className="glass-panel p-5 rounded-xl border border-blue-500/10 space-y-4">
            <h3 className="font-display font-bold text-blue-400 flex items-center gap-2 pb-2 border-b border-white/5">
              <ShieldAlert className="w-5 h-5 text-blue-500" />
              Kelola Penalti & Status Sudut Biru
            </h3>

            <div>
              <p className="text-sm font-semibold text-white">{activeMatch.sudutBiru.athlete?.nama}</p>
              <p className="text-xs text-gray-400">{activeMatch.sudutBiru.athlete?.kontingen}</p>
            </div>

            {/* Manual Deduction Input */}
            <div className="space-y-2 bg-black/30 p-4 rounded-lg">
              <label className="block text-xs text-gray-400 font-bold">PENGURANGAN NILAI DEWAN (MANUAL)</label>
              <p className="text-xxs text-gray-500 leading-relaxed mb-2">
                Diberikan untuk pelanggaran disiplin (misal: keluar gelanggang, pakaian tidak rapi, aksesoris terlepas, atau kelebihan/kekurangan waktu).
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Jumlah (e.g. 0.05)"
                  defaultValue={activeMatch.sudutBiru.wrongMovesDeduction}
                  onChange={e => setTempDeduction(e.target.value)}
                  className="bg-black/60 border border-white/10 rounded px-3 py-2 text-sm text-white font-mono w-32 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => handleApplyDeduction("Biru")}
                  className="bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-500/30 font-bold text-xs px-4 py-2 rounded transition-all cursor-pointer"
                >
                  Terapkan Pengurangan
                </button>
              </div>
              <div className="flex justify-between text-xxs text-gray-400 pt-2 border-t border-white/5">
                <span>Pengurangan Aktif:</span>
                <span className="font-mono text-red-400 font-bold">-{activeMatch.sudutBiru.wrongMovesDeduction.toFixed(2)}</span>
              </div>
            </div>

            {/* Disqualification State Toggle */}
            <div className="flex items-center justify-between p-3 bg-blue-950/10 border border-blue-500/20 rounded-lg">
              <div>
                <span className="text-xs font-bold text-white block">DISKUALIFIKASI SUDUT BIRU</span>
                <span className="text-xxs text-gray-400">Coret atlet dari partai ini dan beri status diskualifikasi</span>
              </div>
              <button
                onClick={() => handleDisqualify("Biru", activeMatch.sudutBiru.isDisqualified)}
                className={`font-extrabold text-xs px-4 py-2 rounded transition-all cursor-pointer ${
                  activeMatch.sudutBiru.isDisqualified
                    ? "bg-red-600 text-white shadow-lg glow-red"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                {activeMatch.sudutBiru.isDisqualified ? "TER-DISKUALIFIKASI" : "AKTIFKAN DISKUALIFIKASI"}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
