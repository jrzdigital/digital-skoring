import React from 'react';
import { Minimize2, Volume2, Award, Clock } from 'lucide-react';
import { TandingMatchState, CornerColor } from '../types/scoring';
import { soundManager } from '../utils/audio';

interface BigScreenStadiumViewProps {
  match: TandingMatchState;
  onExitBigScreen: () => void;
}

export const BigScreenStadiumView: React.FC<BigScreenStadiumViewProps> = ({
  match,
  onExitBigScreen,
}) => {
  const calculateTotal = (scores: typeof match.redScores, penalties: typeof match.redPenalties) => {
    const raw = scores.reduce((acc, curr) => acc + curr.total, 0);
    const penaltyPoints = (penalties.teguran === 1 ? -1 : penalties.teguran >= 2 ? -3 : 0) +
      (penalties.peringatan === 1 ? -5 : penalties.peringatan >= 2 ? -15 : 0);
    return Math.max(0, raw + penaltyPoints);
  };

  const redTotal = calculateTotal(match.redScores, match.redPenalties);
  const blueTotal = calculateTotal(match.blueScores, match.bluePenalties);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8 select-none">
      {/* Stadium Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <span className="text-xl md:text-2xl font-black text-amber-400 tracking-wider">
            {match.arena.toUpperCase()}
          </span>
          <span className="text-slate-600 text-xl">|</span>
          <span className="text-lg md:text-xl font-bold text-white">
            {match.matchNumber} • {match.weightClass}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Sinkronisasi Gelanggang Aktif</span>
          </div>

          <button
            onClick={onExitBigScreen}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Keluar dari Layar Gelanggang"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Stadium Score Arena */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-stretch">
        {/* SUDUT MERAH (COL 5) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-red-950/40 via-slate-900 to-slate-950 border-4 border-red-600 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-2xl relative">
          <div className="flex items-center justify-between">
            <span className="text-sm md:text-base font-black px-4 py-1 rounded bg-red-600 text-white tracking-widest uppercase">
              SUDUT MERAH
            </span>
            {match.winner === 'merah' && (
              <span className="text-sm font-extrabold px-3 py-1 rounded bg-amber-400 text-slate-950 flex items-center gap-1.5 animate-bounce">
                <Award className="w-4 h-4" /> PEMENANG
              </span>
            )}
          </div>

          <div className="my-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {match.redCorner.name}
            </h2>
            <p className="text-lg md:text-xl font-bold text-red-300 mt-1">
              {match.redCorner.contingent}
            </p>
          </div>

          {/* Huge Stadium Digits */}
          <div className="my-auto text-center py-4">
            <span className="text-9xl md:text-[14rem] font-black font-mono tracking-tighter text-red-500 drop-shadow-[0_10px_40px_rgba(239,68,68,0.5)] tabular-nums leading-none">
              {redTotal}
            </span>
          </div>

          {/* Rounds Score Bar */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3 rounded-2xl border border-red-500/30 text-center">
            {match.redScores.map((score, idx) => (
              <div key={idx} className={`p-2 rounded-xl ${match.currentRound === idx + 1 ? 'bg-red-600/20 border border-red-500' : ''}`}>
                <span className="text-xs text-slate-400 block uppercase font-bold">Babak {idx + 1}</span>
                <span className="text-2xl font-black font-mono text-white tabular-nums">{score.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER COLUMN: TIMER & BABAK (COL 2) */}
        <div className="lg:col-span-2 flex flex-col justify-center items-center bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl text-center">
          <div className="px-5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-base md:text-lg uppercase tracking-widest mb-6">
            BABAK {match.currentRound}
          </div>

          <div className="my-6">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">
              SISA WAKTU
            </span>
            <span className={`text-6xl md:text-7xl font-black font-mono tracking-tighter tabular-nums block ${
              match.isTimerRunning ? 'text-emerald-400' : 'text-slate-200'
            }`}>
              {formatTimer(match.remainingSeconds)}
            </span>
            <span className={`text-sm font-black uppercase tracking-widest mt-2 block ${
              match.status === 'berlangsung' ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
            }`}>
              {match.status}
            </span>
          </div>

          {/* Sound cue button */}
          <button
            onClick={() => soundManager.playGong()}
            className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors mt-4"
            title="Bunyikan Gong"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        {/* SUDUT BIRU (COL 5) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 border-4 border-blue-600 rounded-3xl p-6 md:p-8 flex flex-col justify-between shadow-2xl relative">
          <div className="flex items-center justify-between">
            <span className="text-sm md:text-base font-black px-4 py-1 rounded bg-blue-600 text-white tracking-widest uppercase">
              SUDUT BIRU
            </span>
            {match.winner === 'biru' && (
              <span className="text-sm font-extrabold px-3 py-1 rounded bg-amber-400 text-slate-950 flex items-center gap-1.5 animate-bounce">
                <Award className="w-4 h-4" /> PEMENANG
              </span>
            )}
          </div>

          <div className="my-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              {match.blueCorner.name}
            </h2>
            <p className="text-lg md:text-xl font-bold text-blue-300 mt-1">
              {match.blueCorner.contingent}
            </p>
          </div>

          {/* Huge Stadium Digits */}
          <div className="my-auto text-center py-4">
            <span className="text-9xl md:text-[14rem] font-black font-mono tracking-tighter text-blue-500 drop-shadow-[0_10px_40px_rgba(59,130,246,0.5)] tabular-nums leading-none">
              {blueTotal}
            </span>
          </div>

          {/* Rounds Score Bar */}
          <div className="grid grid-cols-3 gap-3 bg-slate-950/80 p-3 rounded-2xl border border-blue-500/30 text-center">
            {match.blueScores.map((score, idx) => (
              <div key={idx} className={`p-2 rounded-xl ${match.currentRound === idx + 1 ? 'bg-blue-600/20 border border-blue-500' : ''}`}>
                <span className="text-xs text-slate-400 block uppercase font-bold">Babak {idx + 1}</span>
                <span className="text-2xl font-black font-mono text-white tabular-nums">{score.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stadium Bottom Bar: Judges Indicator Lights */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          INDIKATOR DEWAN JURI WASIT (IPSI 2026):
        </span>
        <div className="flex items-center gap-4">
          {[1, 2, 3, 4, 5].slice(0, match.judgeCount).map((jId) => {
            const recentVote = match.activeVotes.find(v => v.judgeId === jId && Date.now() - v.timestamp < 1800);
            return (
              <div
                key={jId}
                className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all ${
                  recentVote?.corner === 'merah'
                    ? 'bg-red-600 text-white border-red-400 shadow-lg'
                    : recentVote?.corner === 'biru'
                    ? 'bg-blue-600 text-white border-blue-400 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${
                  recentVote?.corner === 'merah' ? 'bg-white animate-ping' :
                  recentVote?.corner === 'biru' ? 'bg-white animate-ping' : 'bg-slate-700'
                }`} />
                <span className="text-xs font-bold">JURI {jId}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
