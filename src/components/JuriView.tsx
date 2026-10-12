import React, { useState, useEffect } from "react";
import { AppState, Match, JudgeScore } from "../types";
import { CheckCircle, AlertTriangle, Play, HelpCircle, Shield, RefreshCw } from "lucide-react";

interface JuriViewProps {
  appState: AppState;
  onDispatchAction: (type: string, payload: any) => void;
}

export default function JuriView({ appState, onDispatchAction }: JuriViewProps) {
  // Judge index selection (1 - 10)
  const [judgeIdx, setJudgeIdx] = useState<number>(1);
  const { matches, activeMatchId, activeSudut } = appState;
  
  const activeMatch = matches.find(m => m.id === activeMatchId);
  const activeCompetitor = activeMatch 
    ? (activeSudut === "Merah" ? activeMatch.sudutMerah : activeMatch.sudutBiru)
    : null;

  // Retrieve score from state for this judge
  const judgeScore: JudgeScore | undefined = activeCompetitor?.judgesScores[judgeIdx];

  // Locally track state for instant UI update before server sync if desired
  const isReady = judgeScore?.isReady || false;

  const updateScoreField = (field: keyof JudgeScore, delta: number, min: number = 0, max: number = 10) => {
    if (!judgeScore) return;
    const currentVal = (judgeScore[field] as number) || 0;
    const newVal = Math.max(min, Math.min(max, parseFloat((currentVal + delta).toFixed(2))));
    
    onDispatchAction("UPDATE_JUDGE_SCORE", {
      judgeIndex: judgeIdx,
      score: { [field]: newVal }
    });
  };

  const handleWrongMove = () => {
    if (!judgeScore) return;
    // Standard TGR rules: a wrong move results in -0.01 deduction from Nilai Kebenaran
    const currentKebenaran = judgeScore.kebenaran || 0;
    const newKebenaran = Math.max(0, parseFloat((currentKebenaran - 0.01).toFixed(2)));
    const newWrongMoves = (judgeScore.wrongMoves || 0) + 1;

    onDispatchAction("UPDATE_JUDGE_SCORE", {
      judgeIndex: judgeIdx,
      score: { 
        kebenaran: newKebenaran,
        wrongMoves: newWrongMoves
      }
    });
  };

  const toggleReady = () => {
    if (!judgeScore) return;
    onDispatchAction("SET_JUDGE_READY", {
      judgeIndex: judgeIdx,
      isReady: !isReady
    });
  };

  return (
    <div className="space-y-6">
      {/* Selector Juri */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
        <div>
          <h3 className="text-sm font-semibold text-gray-400">PILIH IDENTITAS JURI</h3>
          <p className="text-xxs text-gray-500">Gunakan dropdown untuk mensimulasikan juri yang berbeda</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-bold text-white">Juri Tugas:</label>
          <select
            value={judgeIdx}
            onChange={(e) => setJudgeIdx(parseInt(e.target.value))}
            className="bg-black/60 border border-purple-500/30 rounded px-4 py-2 font-mono text-sm text-purple-400 font-bold focus:outline-none focus:border-purple-500"
            id="select-judge-index"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(idx => (
              <option key={idx} value={idx}>JURI {idx}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Scoring Pad */}
      {!activeMatch ? (
        <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10 text-gray-400">
          Belum ada partai aktif yang dipilih oleh Sekretaris.
        </div>
      ) : !activeSudut ? (
        <div className="text-center py-20 bg-white/5 rounded-xl border border-white/10 text-gray-400">
          <p className="font-display text-lg font-bold text-white mb-2">MENUNGGU SUDUT AKTIF</p>
          <p className="text-sm text-gray-500">Sekretaris belum mengaktifkan penilaian Sudut Merah atau Sudut Biru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Athlete Info Card */}
          <div className="lg:col-span-4 space-y-4">
            <div className={`glass-panel p-5 rounded-xl border relative overflow-hidden transition-all ${
              activeSudut === "Merah" 
                ? "border-red-500/30 glow-red bg-red-950/10" 
                : "border-blue-500/30 glow-blue bg-blue-950/10"
            }`}>
              <div className="absolute top-3 right-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  activeSudut === "Merah" ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                }`}>
                  Sudut {activeSudut}
                </span>
              </div>

              <div className="space-y-4 text-left">
                <div>
                  <span className="text-xxs text-gray-400 uppercase tracking-widest font-mono">Partai {activeMatch.noPartai} &bull; {activeMatch.kategori}</span>
                  <h2 className="text-2xl font-display font-extrabold text-white mt-1">
                    {activeCompetitor?.athlete?.nama || "TBD"}
                  </h2>
                  <p className="text-sm text-gray-300 font-semibold">{activeCompetitor?.athlete?.kontingen || "-"}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-gray-400 block">Golongan</span>
                    <span className="text-white font-bold">{activeMatch.usia}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Jenis Kelamin</span>
                    <span className="text-white font-bold">{activeMatch.gender}</span>
                  </div>
                </div>

                {/* Judge Status Box */}
                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={toggleReady}
                    className={`w-full py-4 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                      isReady
                        ? "bg-green-600 hover:bg-green-700 text-white glow-green"
                        : "bg-yellow-500 hover:bg-yellow-600 text-black glow-gold"
                    }`}
                    id="btn-judge-ready"
                  >
                    {isReady ? (
                      <>
                        <CheckCircle className="w-5 h-5 fill-current" />
                        ANDA SELESAI / READY
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        SIAP MENILAI (CONFIRM READY)
                      </>
                    )}
                  </button>
                  <p className="text-xxs text-center text-gray-400 mt-2">
                    {isReady ? "Klik kembali untuk mengubah status" : "Harap tekan READY sebelum pertandingan dimulai"}
                  </p>
                </div>
              </div>
            </div>

            {/* Rules quick-sheet */}
            <div className="glass-panel p-4 rounded-xl border border-white/5 text-xs text-left space-y-2">
              <p className="font-bold text-purple-400 flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Regulasi IPSI Seni
              </p>
              {activeMatch.kategori === "Tunggal" || activeMatch.kategori === "Regu" ? (
                <ul className="list-disc pl-4 text-gray-400 space-y-1">
                  <li><strong>Kebenaran Gerak</strong>: Maksimum 9.90. Gunakan tombol tuning untuk mengoreksi gerakan jurus wajib.</li>
                  <li><strong>Wrong Move</strong>: Mengurangi nilai kebenaran sebesar 0.01 per kesalahan secara instan.</li>
                  <li><strong>Kemantapan</strong>: Kisaran nilai 5.00 s/d 10.00 untuk stamina, power, dan ketepatan irama.</li>
                </ul>
              ) : (
                <ul className="list-disc pl-4 text-gray-400 space-y-1">
                  <li><strong>Teknik Serang Bela</strong>: Nilai 5.00 - 10.00 untuk efektivitas, kelancaran, dan estetika kuncian/serangan.</li>
                  <li><strong>Kemantapan/Harmoni</strong>: Nilai 5.00 - 10.00 untuk sinkronisasi gerakan antar pesilat.</li>
                  <li><strong>Penjiwaan</strong>: Nilai 5.00 - 10.00 untuk ekspresi, penghayatan, dan keserasian koreografi.</li>
                </ul>
              )}
            </div>
          </div>

          {/* Scoring Controls */}
          <div className="lg:col-span-8 glass-panel p-6 rounded-xl border border-white/10 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <h3 className="font-display font-extrabold text-lg text-white">
                LEMBAR PENILAIAN JURI {judgeIdx}
              </h3>
              <span className="text-xxs text-gray-400 uppercase font-mono">IPSI Seni/TGR System</span>
            </div>

            {judgeScore ? (
              <div className="space-y-8">
                {/* Check category to render specific inputs */}
                {activeMatch.kategori === "Tunggal" || activeMatch.kategori === "Regu" ? (
                  <>
                    {/* TUNGGAL / REGU INPUTS */}
                    {/* 1. Nilai Kebenaran (starts at 9.90, max 9.90) */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <h4 className="text-base font-bold text-white">1. Nilai Kebenaran Gerak</h4>
                          <p className="text-xs text-gray-400">Jurus Wajib IPSI (Batas: 0.00 - 9.90)</p>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-mono font-extrabold text-yellow-400">
                            {judgeScore.kebenaran.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Tuning keys */}
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => updateScoreField("kebenaran", -0.10, 0, 9.90)}
                          className="bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          -0.10
                        </button>
                        <button
                          onClick={() => updateScoreField("kebenaran", -0.01, 0, 9.90)}
                          className="bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          -0.01
                        </button>
                        <button
                          onClick={() => updateScoreField("kebenaran", 0.01, 0, 9.90)}
                          className="bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          +0.01
                        </button>
                        <button
                          onClick={() => updateScoreField("kebenaran", 0.10, 0, 9.90)}
                          className="bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          +0.10
                        </button>
                      </div>

                      {/* Quick Wrong Move Button */}
                      <button
                        onClick={handleWrongMove}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm py-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer glow-red"
                        id="btn-wrong-move"
                      >
                        <AlertTriangle className="w-5 h-5 fill-current text-white animate-bounce" />
                        SALAH GERAKAN (WRONG MOVE &bull; -0.01)
                      </button>
                      <div className="flex justify-between text-xxs text-gray-500 font-mono">
                        <span>Total Kesalahan Dicatat: {judgeScore.wrongMoves || 0}</span>
                        <span>Klik tombol merah di atas pada setiap kesalahan gerak</span>
                      </div>
                    </div>

                    {/* 2. Nilai Kemantapan (5.00 - 10.00) */}
                    <div className="space-y-3 pt-6 border-t border-white/5">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <h4 className="text-base font-bold text-white">2. Nilai Kemantapan / Stamina</h4>
                          <p className="text-xs text-gray-400">Power, Ketegasan, Irama Gerak (Batas: 5.00 - 10.00)</p>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-mono font-extrabold text-yellow-400">
                            {judgeScore.kemantapan.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => updateScoreField("kemantapan", -0.10, 5.00, 10.00)}
                          className="bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          -0.10
                        </button>
                        <button
                          onClick={() => updateScoreField("kemantapan", -0.01, 5.00, 10.00)}
                          className="bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          -0.01
                        </button>
                        <button
                          onClick={() => updateScoreField("kemantapan", 0.01, 5.00, 10.00)}
                          className="bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          +0.01
                        </button>
                        <button
                          onClick={() => updateScoreField("kemantapan", 0.10, 5.00, 10.00)}
                          className="bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          +0.10
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* GANDA / SOLO CREATIVE INPUTS */}
                    {/* 1. Teknik Serang Bela (5.00 - 10.00) */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <h4 className="text-base font-bold text-white">1. Nilai Teknik Serang Bela</h4>
                          <p className="text-xs text-gray-400">Efektivitas, estetika kuncian, ketepatan sasaran</p>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-mono font-extrabold text-yellow-400">
                            {judgeScore.teknik.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => updateScoreField("teknik", -0.10, 5.00, 10.00)}
                          className="bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          -0.10
                        </button>
                        <button
                          onClick={() => updateScoreField("teknik", -0.01, 5.00, 10.00)}
                          className="bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          -0.01
                        </button>
                        <button
                          onClick={() => updateScoreField("teknik", 0.01, 5.00, 10.00)}
                          className="bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          +0.01
                        </button>
                        <button
                          onClick={() => updateScoreField("teknik", 0.10, 5.00, 10.00)}
                          className="bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          +0.10
                        </button>
                      </div>
                    </div>

                    {/* 2. Kemantapan / Harmonisasi (5.00 - 10.00) */}
                    <div className="space-y-3 pt-6 border-t border-white/5">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <h4 className="text-base font-bold text-white">2. Nilai Kemantapan & Harmonisasi</h4>
                          <p className="text-xs text-gray-400">Kompak, stamina, keselarasan gerak berpasangan</p>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-mono font-extrabold text-yellow-400">
                            {judgeScore.harmonisasi.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => updateScoreField("harmonisasi", -0.10, 5.00, 10.00)}
                          className="bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          -0.10
                        </button>
                        <button
                          onClick={() => updateScoreField("harmonisasi", -0.01, 5.00, 10.00)}
                          className="bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          -0.01
                        </button>
                        <button
                          onClick={() => updateScoreField("harmonisasi", 0.01, 5.00, 10.00)}
                          className="bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          +0.01
                        </button>
                        <button
                          onClick={() => updateScoreField("harmonisasi", 0.10, 5.00, 10.00)}
                          className="bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          +0.10
                        </button>
                      </div>
                    </div>

                    {/* 3. Penjiwaan (5.00 - 10.00) */}
                    <div className="space-y-3 pt-6 border-t border-white/5">
                      <div className="flex justify-between items-baseline">
                        <div>
                          <h4 className="text-base font-bold text-white">3. Nilai Penjiwaan / Penghayatan</h4>
                          <p className="text-xs text-gray-400">Ekspresi wajah, penghayatan makna gerakan drama</p>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-mono font-extrabold text-yellow-400">
                            {judgeScore.penjiwaan.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => updateScoreField("penjiwaan", -0.10, 5.00, 10.00)}
                          className="bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          -0.10
                        </button>
                        <button
                          onClick={() => updateScoreField("penjiwaan", -0.01, 5.00, 10.00)}
                          className="bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          -0.01
                        </button>
                        <button
                          onClick={() => updateScoreField("penjiwaan", 0.01, 5.00, 10.00)}
                          className="bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          +0.01
                        </button>
                        <button
                          onClick={() => updateScoreField("penjiwaan", 0.10, 5.00, 10.00)}
                          className="bg-blue-950/40 hover:bg-blue-900/50 text-blue-400 border border-blue-500/20 py-3 rounded-lg font-mono font-bold text-sm cursor-pointer"
                        >
                          +0.10
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Live Judge Summary Score */}
                <div className="pt-6 border-t border-white/10 bg-black/40 p-4 rounded-xl flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-xs text-gray-400 uppercase font-mono">LIVE TOTAL SKOR JURI {judgeIdx}</p>
                    <p className="text-xxs text-gray-500 italic mt-0.5">Penilaian disinkronkan secara real-time</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-mono font-extrabold text-green-400">
                      {((judgeScore.kebenaran || 0) + (judgeScore.kemantapan || 0) + (judgeScore.teknik || 0) + (judgeScore.harmonisasi || 0) + (judgeScore.penjiwaan || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                Data juri tidak ditemukan atau format juri tidak sinkron.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
