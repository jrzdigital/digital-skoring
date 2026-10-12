import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Flame, 
  Award, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  Bot, 
  History,
  TrendingUp,
  Maximize2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TandingMatchState, CornerColor, ScoreAction, VictoryType } from '../types/scoring';
import { soundManager } from '../utils/audio';

interface TandingScoreboardProps {
  match: TandingMatchState;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onNextRound: () => void;
  onPrevRound: () => void;
  onOpenAutoScoringModal: () => void;
  onDeclareWinner: (winner: CornerColor, winType: VictoryType) => void;
  onClearWinner: () => void;
  isBigScreenMode?: boolean;
}

export const TandingScoreboard: React.FC<TandingScoreboardProps> = ({
  match,
  onToggleTimer,
  onResetTimer,
  onNextRound,
  onPrevRound,
  onOpenAutoScoringModal,
  onDeclareWinner,
  onClearWinner,
  isBigScreenMode = false,
}) => {
  const [selectedWinType, setSelectedWinType] = useState<VictoryType>('angka');
  const [showDeclareModal, setShowDeclareModal] = useState(false);

  // Compute total points
  const calculateTotal = (scores: typeof match.redScores, penalties: typeof match.redPenalties) => {
    const rawPoints = scores.reduce((acc, curr) => acc + curr.total, 0);
    const penaltyPoints = (penalties.teguran === 1 ? -1 : penalties.teguran >= 2 ? -3 : 0) +
      (penalties.peringatan === 1 ? -5 : penalties.peringatan >= 2 ? -15 : 0);
    return Math.max(0, rawPoints + penaltyPoints);
  };

  const redTotal = calculateTotal(match.redScores, match.redPenalties);
  const blueTotal = calculateTotal(match.blueScores, match.bluePenalties);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCelebrateWinner = (winner: CornerColor, winType: VictoryType) => {
    onDeclareWinner(winner, winType);
    setShowDeclareModal(false);
    soundManager.playGong();

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: winner === 'merah' ? ['#ef4444', '#dc2626', '#f87171'] : ['#3b82f6', '#2563eb', '#60a5fa'],
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className={`flex flex-col gap-6 text-slate-100 ${isBigScreenMode ? 'p-2 md:p-4 max-w-full' : 'max-w-7xl mx-auto p-4 md:p-6'}`}>
      {/* Tournament Match Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold text-sm tracking-wider">
            {match.arena}
          </div>
          <div className="text-sm font-semibold text-slate-300">
            <span className="text-white font-bold">{match.matchNumber}</span>
            <span className="text-slate-600 mx-2">|</span>
            <span>{match.weightClass}</span>
            <span className="text-slate-600 mx-2">|</span>
            <span className="text-slate-400">{match.gender} • {match.ageGroup}</span>
          </div>
        </div>

        {/* Round Switcher and Quick Assistant Trigger */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[1, 2, 3].map((r) => (
              <button
                key={r}
                onClick={() => {
                  if (r > match.currentRound) onNextRound();
                  else if (r < match.currentRound) onPrevRound();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  match.currentRound === r
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Babak {r}
              </button>
            ))}
          </div>

          {!isBigScreenMode && (
            <button
              onClick={onOpenAutoScoringModal}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 font-bold text-xs transition-all shadow-sm"
              title="Buka Fitur Input Otomatis Nilai Wasit"
            >
              <Bot className="w-4 h-4" />
              <span>Input Otomatis Wasit</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Arena Display: Red Corner - Arena Clock - Blue Corner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* SUDUT MERAH (COL 5) */}
        <div className="lg:col-span-5 flex flex-col bg-gradient-to-b from-red-950/30 via-slate-900 to-slate-950 border-2 border-red-600/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 to-red-700"></div>

          {/* Competitor Profile */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2.5 py-0.5 rounded bg-red-600 text-white uppercase tracking-wider">
                  SUDUT MERAH
                </span>
                {match.winner === 'merah' && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950 flex items-center gap-1">
                    <Award className="w-3 h-3" /> PEMENANG
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-2 tracking-tight">
                {match.redCorner.name}
              </h2>
              <p className="text-sm font-semibold text-red-300/80 mt-0.5">
                {match.redCorner.contingent}
              </p>
            </div>
          </div>

          {/* Huge Main Score Display */}
          <div className="my-6 flex items-center justify-center">
            <div className="relative">
              <span className="text-8xl md:text-9xl font-black font-mono tracking-tighter text-red-500 drop-shadow-[0_4px_30px_rgba(239,68,68,0.4)] tabular-nums">
                {redTotal}
              </span>
            </div>
          </div>

          {/* Round Score Breakdown Bar */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-red-500/20 text-center">
            {match.redScores.map((score, idx) => (
              <div key={idx} className={`p-1.5 rounded-lg ${match.currentRound === idx + 1 ? 'bg-red-500/10 border border-red-500/30' : ''}`}>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Babak {idx + 1}</span>
                <span className="text-lg font-bold font-mono text-white tabular-nums">{score.total}</span>
              </div>
            ))}
          </div>

          {/* Strike details breakdown */}
          <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Pukulan (1)</span>
              <span className="font-bold text-red-400 font-mono">
                {match.redScores[match.currentRound - 1]?.pukulan || 0}
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Tendangan (2)</span>
              <span className="font-bold text-red-400 font-mono">
                {match.redScores[match.currentRound - 1]?.tendangan || 0}
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Jatuhan (3)</span>
              <span className="font-bold text-red-400 font-mono">
                {match.redScores[match.currentRound - 1]?.jatuhan || 0}
              </span>
            </div>
          </div>

          {/* Penalties Row */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-red-500/20 text-xs">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Hukuman:</span>
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                match.redPenalties.teguran >= 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'
              }`}>
                T1 (-1)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                match.redPenalties.teguran >= 2 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                T2 (-2)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                match.redPenalties.peringatan >= 1 ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                P1 (-5)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                match.redPenalties.peringatan >= 2 ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                P2 (-10)
              </span>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: TIMER & MATCH STATUS (COL 2) */}
        <div className="lg:col-span-2 flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-center">
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
              BABAK {match.currentRound}
            </div>

            {/* Huge Arena Countdown Clock */}
            <div className="my-4">
              <span className={`text-5xl md:text-6xl font-black font-mono tracking-tight tabular-nums block ${
                match.isTimerRunning ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {formatTimer(match.remainingSeconds)}
              </span>
              <span className={`text-xs font-bold uppercase tracking-widest mt-1 block ${
                match.status === 'berlangsung' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
              }`}>
                {match.status}
              </span>
            </div>
          </div>

          {/* Quick Timer Controls for Arena Display */}
          <div className="space-y-2 py-2">
            <button
              onClick={onToggleTimer}
              className={`w-full py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                match.isTimerRunning
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {match.isTimerRunning ? (
                <>
                  <Pause className="w-4 h-4" /> JEDA WAKTU
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> MULAI BABAK
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onResetTimer}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                title="Reset Babak ke 02:00"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                onClick={() => soundManager.playGong()}
                className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                title="Bunyikan Gong Arena"
              >
                <Volume2 className="w-3.5 h-3.5" /> Gong
              </button>
            </div>
          </div>

          {/* Declare Winner Button */}
          <div className="pt-2 border-t border-slate-800">
            {match.winner ? (
              <button
                onClick={onClearWinner}
                className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Reset Status Pemenang
              </button>
            ) : (
              <button
                onClick={() => setShowDeclareModal(true)}
                className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5" />
                Tentukan Pemenang
              </button>
            )}
          </div>
        </div>

        {/* SUDUT BIRU (COL 5) */}
        <div className="lg:col-span-5 flex flex-col bg-gradient-to-b from-blue-950/30 via-slate-900 to-slate-950 border-2 border-blue-600/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-blue-700"></div>

          {/* Competitor Profile */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2.5 py-0.5 rounded bg-blue-600 text-white uppercase tracking-wider">
                  SUDUT BIRU
                </span>
                {match.winner === 'biru' && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-400 text-slate-950 flex items-center gap-1">
                    <Award className="w-3 h-3" /> PEMENANG
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white mt-2 tracking-tight">
                {match.blueCorner.name}
              </h2>
              <p className="text-sm font-semibold text-blue-300/80 mt-0.5">
                {match.blueCorner.contingent}
              </p>
            </div>
          </div>

          {/* Huge Main Score Display */}
          <div className="my-6 flex items-center justify-center">
            <div className="relative">
              <span className="text-8xl md:text-9xl font-black font-mono tracking-tighter text-blue-500 drop-shadow-[0_4px_30px_rgba(59,130,246,0.4)] tabular-nums">
                {blueTotal}
              </span>
            </div>
          </div>

          {/* Round Score Breakdown Bar */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-blue-500/20 text-center">
            {match.blueScores.map((score, idx) => (
              <div key={idx} className={`p-1.5 rounded-lg ${match.currentRound === idx + 1 ? 'bg-blue-500/10 border border-blue-500/30' : ''}`}>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Babak {idx + 1}</span>
                <span className="text-lg font-bold font-mono text-white tabular-nums">{score.total}</span>
              </div>
            ))}
          </div>

          {/* Strike details breakdown */}
          <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Pukulan (1)</span>
              <span className="font-bold text-blue-400 font-mono">
                {match.blueScores[match.currentRound - 1]?.pukulan || 0}
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Tendangan (2)</span>
              <span className="font-bold text-blue-400 font-mono">
                {match.blueScores[match.currentRound - 1]?.tendangan || 0}
              </span>
            </div>
            <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Jatuhan (3)</span>
              <span className="font-bold text-blue-400 font-mono">
                {match.blueScores[match.currentRound - 1]?.jatuhan || 0}
              </span>
            </div>
          </div>

          {/* Penalties Row */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-blue-500/20 text-xs">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">Hukuman:</span>
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                match.bluePenalties.teguran >= 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'
              }`}>
                T1 (-1)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                match.bluePenalties.teguran >= 2 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                T2 (-2)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                match.bluePenalties.peringatan >= 1 ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                P1 (-5)
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                match.bluePenalties.peringatan >= 2 ? 'bg-red-700 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                P2 (-10)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* JUROR CONSENSUS REAL-TIME INDICATOR LIGHTS (3 or 5 Jurors) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Lampu Status Dewan Juri Wasit (Konsensus Real-Time IPSI 2026)
          </span>
          <span className="text-[11px] text-slate-500">
            Poin sah saat mayoritas juri memencet tombol serentak
          </span>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].slice(0, match.judgeCount).map((jId) => {
            // Find recent active vote from this judge in last 2 seconds
            const recentVote = match.activeVotes.find(v => v.judgeId === jId && Date.now() - v.timestamp < 1800);
            return (
              <div 
                key={jId}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 ${
                  recentVote?.corner === 'merah'
                    ? 'bg-red-950/50 border-red-500 text-red-400 shadow-lg shadow-red-900/30'
                    : recentVote?.corner === 'biru'
                    ? 'bg-blue-950/50 border-blue-500 text-blue-400 shadow-lg shadow-blue-900/30'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    recentVote?.corner === 'merah'
                      ? 'bg-red-500 animate-ping'
                      : recentVote?.corner === 'biru'
                      ? 'bg-blue-500 animate-ping'
                      : 'bg-slate-700'
                  }`} />
                  <span className="text-xs font-bold text-slate-200">JURI {jId}</span>
                </div>
                <span className="text-[11px] font-semibold uppercase">
                  {recentVote ? `${recentVote.actionType} (${recentVote.corner})` : 'Standby'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Tentukan Pemenang */}
      {showDeclareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                Deklarasi Pemenang Pertandingan
              </h3>
              <button
                onClick={() => setShowDeclareModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1.5">
                Jenis Kemenangan (Sesuai Peraturan IPSI / PERSILAT)
              </label>
              <select
                value={selectedWinType}
                onChange={(e) => setSelectedWinType(e.target.value as VictoryType)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="angka">Menang Angka (Selisih Poin)</option>
                <option value="mutlak">Menang Mutlak (KO / Selisih Telak)</option>
                <option value="wmp">Menang WMP (Wasit Menghentikan Pertandingan)</option>
                <option value="teknik">Menang Teknik (Cedera Sah Lawan)</option>
                <option value="diskualifikasi">Menang Diskualifikasi Lawan (DQ)</option>
                <option value="undur_diri">Menang Undur Diri (Walkover / WO)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleCelebrateWinner('merah', selectedWinType)}
                className="py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 shadow-lg shadow-red-900/30"
              >
                <span>Menangkan MERAH</span>
                <span className="text-[11px] opacity-80">{match.redCorner.name}</span>
              </button>
              <button
                onClick={() => handleCelebrateWinner('biru', selectedWinType)}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 shadow-lg shadow-blue-900/30"
              >
                <span>Menangkan BIRU</span>
                <span className="text-[11px] opacity-80">{match.blueCorner.name}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
