import React, { useEffect, useRef } from "react";
import { AppState, Match, CompetitorPerformance } from "../types";
import { audioSynth } from "../lib/audio";
import { Trophy, HelpCircle, Activity, Award, BellRing, Volume2, ShieldAlert } from "lucide-react";

interface MonitorViewProps {
  appState: AppState;
  onDispatchAction: (type: string, payload: any) => void;
}

export default function MonitorView({ appState, onDispatchAction }: MonitorViewProps) {
  const { matches, activeMatchId, timer, juryCount, hornActive } = appState;
  const activeMatch = matches.find(m => m.id === activeMatchId);

  const prevTimerRunning = useRef<boolean>(false);
  const prevHornActive = useRef<boolean>(false);

  // Trigger sound notifications based on state changes (bell / horn)
  useEffect(() => {
    // Play countdown warnings or stop sounds
    if (hornActive && !prevHornActive.current) {
      audioSynth.playHorn();
      // Auto-reset horn flag on server after playing
      setTimeout(() => {
        onDispatchAction("TRIGGER_HORN", { active: false });
      }, 1500);
    }
    prevHornActive.current = hornActive;
  }, [hornActive, onDispatchAction]);

  useEffect(() => {
    // Play gong when timer starts running
    if (timer.isRunning && !prevTimerRunning.current) {
      audioSynth.playGong();
    }
    prevTimerRunning.current = timer.isRunning;
  }, [timer.isRunning]);

  // Format millisecond duration into mm:ss.S (minutes, seconds, deciseconds)
  const formatTimer = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const deciseconds = Math.floor((ms % 1000) / 100);
    
    const secStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${minutes}:${secStr}.${deciseconds}`;
  };

  const getJudgeTotalScore = (competitor: CompetitorPerformance, index: number) => {
    const s = competitor.judgesScores[index];
    if (!s) return 0;
    const isTunggalRegu = activeMatch?.kategori === "Tunggal" || activeMatch?.kategori === "Regu";
    return isTunggalRegu 
      ? (s.kebenaran + s.kemantapan)
      : (s.teknik + s.harmonisasi + s.penjiwaan);
  };

  // Helper to compute statistics
  const getStatistics = (competitor: CompetitorPerformance) => {
    const scores: number[] = [];
    for (let i = 1; i <= juryCount; i++) {
      scores.push(getJudgeTotalScore(competitor, i));
    }
    if (scores.length === 0) return { final: 0, discards: {} as Record<number, 'LOW' | 'HIGH' | 'NONE'> };

    const sortedWithIndex = scores.map((score, index) => ({ score, judgeIdx: index + 1 }))
                                 .sort((a, b) => a.score - b.score);
    
    let bottomCount = 0;
    let topCount = 0;

    if (juryCount >= 10) { bottomCount = 3; topCount = 3; }
    else if (juryCount >= 8) { bottomCount = 2; topCount = 2; }
    else if (juryCount >= 5) { bottomCount = 1; topCount = 1; }
    else if (juryCount >= 4) { bottomCount = 1; topCount = 1; }

    const discardsMap: Record<number, 'LOW' | 'HIGH' | 'NONE'> = {};
    for (let i = 1; i <= juryCount; i++) discardsMap[i] = 'NONE';

    for (let i = 0; i < bottomCount; i++) {
      if (sortedWithIndex[i]) discardsMap[sortedWithIndex[i].judgeIdx] = 'LOW';
    }
    for (let i = 0; i < topCount; i++) {
      const idx = sortedWithIndex.length - 1 - i;
      if (sortedWithIndex[idx]) discardsMap[sortedWithIndex[idx].judgeIdx] = 'HIGH';
    }

    const remainingScores = sortedWithIndex.filter(item => discardsMap[item.judgeIdx] === 'NONE').map(i => i.score);
    const sum = remainingScores.reduce((a, b) => a + b, 0);
    const final = Math.max(0, sum - competitor.wrongMovesDeduction);

    return {
      final,
      discards: discardsMap
    };
  };

  const testAudioSound = () => {
    audioSynth.playGong();
  };

  return (
    <div className="space-y-6 text-center">
      {/* Top Banner / Match Details */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 border border-white/10 p-5 rounded-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 pointer-events-none"></div>
        
        <div className="text-left z-10">
          <p className="text-xxs font-mono text-purple-400 font-bold uppercase tracking-widest bg-purple-900/30 px-3 py-1 rounded-full w-fit mb-2">
            Ikatan Pencak Silat Indonesia (IPSI) &bull; Seni
          </p>
          <h2 className="text-xl md:text-2xl font-display font-extrabold text-white">
            {activeMatch ? `PARTAI ${activeMatch.noPartai} - KATEGORI ${activeMatch.kategori.toUpperCase()}` : "MENUNGGU PERTANDINGAN"}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {activeMatch ? `${activeMatch.usia} ${activeMatch.gender} | ${juryCount} JURI BERTUGAS` : "Silakan aktifkan partai di Sekretariat"}
          </p>
        </div>

        {/* Dynamic Timer Display */}
        <div className="mt-4 md:mt-0 z-10 flex flex-col items-center">
          <div className="bg-black/80 px-8 py-3 rounded-2xl border border-purple-500/30 glow-purple min-w-56 text-center">
            <span className="text-4xl md:text-5xl font-mono font-black text-yellow-400 digital-number tracking-widest leading-none">
              {formatTimer(timer.durationMs)}
            </span>
            <span className="text-xxs block text-gray-400 uppercase tracking-widest mt-1 font-semibold">
              {timer.isRunning ? "Waktu Berjalan (TIMER LIVE)" : "TIMER DIAM"}
            </span>
          </div>
          
          <button 
            onClick={testAudioSound} 
            className="flex items-center gap-1 text-xxs text-gray-500 hover:text-purple-400 mt-2 font-semibold transition-all cursor-pointer bg-white/5 px-2 py-1 rounded border border-white/5"
          >
            <Volume2 className="w-3.5 h-3.5" />
            Tes Audio Gong
          </button>
        </div>
      </div>

      {!activeMatch ? (
        <div className="py-24 glass-panel rounded-2xl text-gray-500">
          Belum ada partai kompetisi yang sedang berlangsung.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SUDUT MERAH BOARD */}
          <div className={`glass-panel rounded-3xl p-6 border relative overflow-hidden transition-all duration-300 ${
            activeMatch.sudutMerah.scoreApproved 
              ? "border-red-500/30 bg-red-950/5 glow-red" 
              : "border-white/5 bg-black/40"
          }`}>
            <div className="absolute top-4 left-4 flex gap-1.5 items-center">
              <span className="w-3 h-3 bg-red-600 rounded-full glow-red animate-pulse"></span>
              <span className="text-xxs font-mono font-bold text-red-500 uppercase tracking-widest">SUDUT MERAH</span>
            </div>

            {/* Profile */}
            <div className="pt-6 pb-4 border-b border-white/5 text-left space-y-1">
              <h3 className="text-2xl md:text-3xl font-display font-extrabold text-white">
                {activeMatch.sudutMerah.athlete?.nama || "-"}
              </h3>
              <p className="text-base text-gray-400 font-semibold">{activeMatch.sudutMerah.athlete?.kontingen || "-"}</p>
            </div>

            {/* Live Score Output or Ready Dots */}
            {!activeMatch.sudutMerah.scoreApproved ? (
              <div className="py-10 space-y-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-mono">STATUS KESIAPAN JURI</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {Array.from({ length: juryCount }).map((_, idx) => {
                      const judgeNum = idx + 1;
                      const isJudgeReady = activeMatch.sudutMerah.judgesScores[judgeNum]?.isReady;
                      return (
                        <div 
                          key={judgeNum}
                          className={`flex flex-col items-center p-2 rounded-lg border w-12 transition-all ${
                            isJudgeReady 
                              ? "bg-green-600/20 border-green-500/40 text-green-400" 
                              : "bg-black/40 border-white/5 text-gray-600"
                          }`}
                        >
                          <span className="text-xxs font-mono font-bold">J{judgeNum}</span>
                          <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                            isJudgeReady ? "bg-green-400 glow-green" : "bg-gray-800"
                          }`}></span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-black/30 p-4 rounded-xl border border-white/5 max-w-sm mx-auto">
                  <span className="text-xs text-gray-400 block font-bold">PENILAIAN SEDANG BERLANGSUNG</span>
                  <span className="text-xxs text-gray-500 block mt-1 leading-relaxed">
                    Dewan sedang memverifikasi formulir skor juri. Hasil akhir akan ditampilkan setelah disahkan oleh Dewan.
                  </span>
                </div>
              </div>
            ) : (
              /* GRAND REVEAL APPROVED SCORES */
              <div className="py-6 space-y-6 text-left">
                {activeMatch.sudutMerah.isDisqualified ? (
                  <div className="bg-red-600/20 border-2 border-red-500 text-red-500 text-center py-6 rounded-2xl font-display font-black text-xl flex items-center justify-center gap-2">
                    <ShieldAlert className="w-6 h-6 animate-spin" />
                    DISKUALIFIKASI (DISQUALIFIED)
                  </div>
                ) : (
                  <>
                    {/* Judge Score Strip */}
                    <div>
                      <p className="text-xxs text-gray-400 font-mono uppercase tracking-widest mb-2.5">RINCIAN SKOR DEWAN JURI</p>
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: juryCount }).map((_, idx) => {
                          const jNum = idx + 1;
                          const rawScore = getJudgeTotalScore(activeMatch.sudutMerah, jNum);
                          const { discards } = getStatistics(activeMatch.sudutMerah);
                          const discardStatus = discards[jNum];
                          
                          return (
                            <div 
                              key={jNum}
                              className={`p-2.5 rounded-xl border text-center transition-all ${
                                discardStatus === "LOW" ? "border-red-500/20 bg-red-950/20 opacity-30 line-through" :
                                discardStatus === "HIGH" ? "border-orange-500/20 bg-orange-950/20 opacity-30 line-through" :
                                "border-white/10 bg-black/40 glow-purple"
                              }`}
                            >
                              <p className="text-xxs font-mono text-gray-500 font-bold">JURI {jNum}</p>
                              <p className="text-sm font-mono font-black text-white mt-1">{rawScore.toFixed(2)}</p>
                              {discardStatus !== 'NONE' && (
                                <p className="text-xxs text-gray-400 font-bold tracking-tight scale-90 mt-0.5">
                                  {discardStatus === 'LOW' ? 'LOW' : 'HIGH'}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="bg-black/30 p-4 rounded-xl space-y-2 font-mono text-xs text-gray-400">
                      <div className="flex justify-between">
                        <span>Total Nilai Juri Terpilih:</span>
                        <span className="font-bold text-white">
                          {(getStatistics(activeMatch.sudutMerah).final + activeMatch.sudutMerah.wrongMovesDeduction).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-red-400">
                        <span>Pengurangan Hukuman Dewan:</span>
                        <span className="font-bold">-{activeMatch.sudutMerah.wrongMovesDeduction.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Grand Score Display */}
                    <div className="bg-gradient-to-r from-red-950/20 to-black/40 p-5 rounded-2xl border border-red-500/20 text-center">
                      <p className="text-xs text-yellow-400 font-extrabold uppercase tracking-widest font-display">SKOR AKHIR SAH</p>
                      <p className="text-5xl font-mono font-black text-yellow-400 mt-2 glow-gold">
                        {getStatistics(activeMatch.sudutMerah).final.toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* SUDUT BIRU BOARD */}
          <div className={`glass-panel rounded-3xl p-6 border relative overflow-hidden transition-all duration-300 ${
            activeMatch.sudutBiru.scoreApproved 
              ? "border-blue-500/30 bg-blue-950/5 glow-blue" 
              : "border-white/5 bg-black/40"
          }`}>
            <div className="absolute top-4 left-4 flex gap-1.5 items-center">
              <span className="w-3 h-3 bg-blue-600 rounded-full glow-blue animate-pulse"></span>
              <span className="text-xxs font-mono font-bold text-blue-500 uppercase tracking-widest">SUDUT BIRU</span>
            </div>

            {/* Profile */}
            <div className="pt-6 pb-4 border-b border-white/5 text-left space-y-1">
              <h3 className="text-2xl md:text-3xl font-display font-extrabold text-white">
                {activeMatch.sudutBiru.athlete?.nama || "-"}
              </h3>
              <p className="text-base text-gray-400 font-semibold">{activeMatch.sudutBiru.athlete?.kontingen || "-"}</p>
            </div>

            {/* Live Score Output or Ready Dots */}
            {!activeMatch.sudutBiru.scoreApproved ? (
              <div className="py-10 space-y-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-mono">STATUS KESIAPAN JURI</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {Array.from({ length: juryCount }).map((_, idx) => {
                      const judgeNum = idx + 1;
                      const isJudgeReady = activeMatch.sudutBiru.judgesScores[judgeNum]?.isReady;
                      return (
                        <div 
                          key={judgeNum}
                          className={`flex flex-col items-center p-2 rounded-lg border w-12 transition-all ${
                            isJudgeReady 
                              ? "bg-green-600/20 border-green-500/40 text-green-400" 
                              : "bg-black/40 border-white/5 text-gray-600"
                          }`}
                        >
                          <span className="text-xxs font-mono font-bold">J{judgeNum}</span>
                          <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${
                            isJudgeReady ? "bg-green-400 glow-green" : "bg-gray-800"
                          }`}></span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-black/30 p-4 rounded-xl border border-white/5 max-w-sm mx-auto">
                  <span className="text-xs text-gray-400 block font-bold">PENILAIAN SEDANG BERLANGSUNG</span>
                  <span className="text-xxs text-gray-500 block mt-1 leading-relaxed">
                    Dewan sedang memverifikasi formulir skor juri. Hasil akhir akan ditampilkan setelah disahkan oleh Dewan.
                  </span>
                </div>
              </div>
            ) : (
              /* GRAND REVEAL APPROVED SCORES */
              <div className="py-6 space-y-6 text-left">
                {activeMatch.sudutBiru.isDisqualified ? (
                  <div className="bg-red-600/20 border-2 border-red-500 text-red-500 text-center py-6 rounded-2xl font-display font-black text-xl flex items-center justify-center gap-2">
                    <ShieldAlert className="w-6 h-6 animate-spin" />
                    DISKUALIFIKASI (DISQUALIFIED)
                  </div>
                ) : (
                  <>
                    {/* Judge Score Strip */}
                    <div>
                      <p className="text-xxs text-gray-400 font-mono uppercase tracking-widest mb-2.5">RINCIAN SKOR DEWAN JURI</p>
                      <div className="grid grid-cols-5 gap-2">
                        {Array.from({ length: juryCount }).map((_, idx) => {
                          const jNum = idx + 1;
                          const rawScore = getJudgeTotalScore(activeMatch.sudutBiru, jNum);
                          const { discards } = getStatistics(activeMatch.sudutBiru);
                          const discardStatus = discards[jNum];
                          
                          return (
                            <div 
                              key={jNum}
                              className={`p-2.5 rounded-xl border text-center transition-all ${
                                discardStatus === "LOW" ? "border-red-500/20 bg-red-950/20 opacity-30 line-through" :
                                discardStatus === "HIGH" ? "border-orange-500/20 bg-orange-950/20 opacity-30 line-through" :
                                "border-white/10 bg-black/40 glow-purple"
                              }`}
                            >
                              <p className="text-xxs font-mono text-gray-500 font-bold">JURI {jNum}</p>
                              <p className="text-sm font-mono font-black text-white mt-1">{rawScore.toFixed(2)}</p>
                              {discardStatus !== 'NONE' && (
                                <p className="text-xxs text-gray-400 font-bold tracking-tight scale-90 mt-0.5">
                                  {discardStatus === 'LOW' ? 'LOW' : 'HIGH'}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="bg-black/30 p-4 rounded-xl space-y-2 font-mono text-xs text-gray-400">
                      <div className="flex justify-between">
                        <span>Total Nilai Juri Terpilih:</span>
                        <span className="font-bold text-white">
                          {(getStatistics(activeMatch.sudutBiru).final + activeMatch.sudutBiru.wrongMovesDeduction).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-red-400">
                        <span>Pengurangan Hukuman Dewan:</span>
                        <span className="font-bold">-{activeMatch.sudutBiru.wrongMovesDeduction.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Grand Score Display */}
                    <div className="bg-gradient-to-r from-blue-950/20 to-black/40 p-5 rounded-2xl border border-blue-500/20 text-center">
                      <p className="text-xs text-yellow-400 font-extrabold uppercase tracking-widest font-display">SKOR AKHIR SAH</p>
                      <p className="text-5xl font-mono font-black text-yellow-400 mt-2 glow-gold">
                        {getStatistics(activeMatch.sudutBiru).final.toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Footer Banner */}
      {activeMatch?.winner && (
        <div className="bg-yellow-500 text-black font-display font-black text-lg py-4 rounded-2xl glow-gold flex items-center justify-center gap-2 animate-bounce">
          <Trophy className="w-6 h-6 fill-current" />
          PEMENANG PARTAI INI ADALAH SUDUT {activeMatch.winner.toUpperCase()}: {activeMatch.winner === "Merah" ? activeMatch.sudutMerah.athlete?.nama : activeMatch.sudutBiru.athlete?.nama}
        </div>
      )}
    </div>
  );
}
