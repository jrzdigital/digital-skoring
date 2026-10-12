import React, { useState } from 'react';
import { Shield, Zap, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { CornerColor, TandingMatchState } from '../types/scoring';
import { soundManager } from '../utils/audio';

interface JudgeKeypadViewProps {
  match: TandingMatchState;
  activeJudgeId: number;
  onSelectJudgeId: (judgeId: number) => void;
  onSubmitVote: (judgeId: number, corner: CornerColor, actionType: 'pukulan' | 'tendangan' | 'jatuhan') => void;
}

export const JudgeKeypadView: React.FC<JudgeKeypadViewProps> = ({
  match,
  activeJudgeId,
  onSelectJudgeId,
  onSubmitVote,
}) => {
  const [lastAction, setLastAction] = useState<{
    corner: CornerColor;
    type: string;
    time: number;
  } | null>(null);

  const handleVote = (corner: CornerColor, actionType: 'pukulan' | 'tendangan' | 'jatuhan') => {
    // Vibrate device if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch {
        // ignore
      }
    }

    soundManager.playScoreHit(actionType === 'jatuhan' ? 3 : actionType === 'tendangan' ? 2 : 1);
    onSubmitVote(activeJudgeId, corner, actionType);
    setLastAction({
      corner,
      type: actionType,
      time: Date.now(),
    });

    // Clear feedback state after 1.2s
    setTimeout(() => {
      setLastAction((prev) => (prev && Date.now() - prev.time >= 1000 ? null : prev));
    }, 1200);
  };

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 select-none">
      {/* Top Bar for Judge Terminal */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs">
            TERMINAL JURI {activeJudgeId}
          </div>
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-slate-200">{match.arena}</span>
            <span className="text-slate-500 mx-1.5">/</span>
            <span>{match.matchNumber}</span>
            <span className="text-slate-500 mx-1.5">/</span>
            <span>{match.weightClass}</span>
          </div>
        </div>

        {/* Change Judge ID Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Pilih Juri:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {[1, 2, 3, 4, 5].slice(0, match.judgeCount).map((jId) => (
              <button
                key={jId}
                onClick={() => onSelectJudgeId(jId)}
                className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                  activeJudgeId === jId
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {jId}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Match Status Banner */}
      <div className="grid grid-cols-3 items-center px-4 py-2 bg-slate-950 border-b border-slate-800/80 text-center">
        <div className="text-left">
          <span className="text-[11px] text-slate-500 block uppercase tracking-wider">Babak</span>
          <span className="text-sm font-bold text-amber-400">
            Babak {match.currentRound} / {match.totalRounds}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 block uppercase tracking-wider">Waktu Gelanggang</span>
          <span className={`text-xl font-bold font-mono tabular-nums ${
            match.isTimerRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-400'
          }`}>
            {formatTimer(match.remainingSeconds)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-500 block uppercase tracking-wider">Status</span>
          <span className={`text-xs font-bold uppercase ${
            match.status === 'berlangsung' ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {match.status}
          </span>
        </div>
      </div>

      {/* Active Vote Feedback Notification */}
      {lastAction && (
        <div className={`px-4 py-1.5 text-center text-xs font-bold tracking-wide transition-all ${
          lastAction.corner === 'merah'
            ? 'bg-red-600 text-white animate-pulse'
            : 'bg-blue-600 text-white animate-pulse'
        }`}>
          VOTE TERKIRIM: {lastAction.type.toUpperCase()} SUDUT {lastAction.corner.toUpperCase()}!
        </div>
      )}

      {/* Main Touch Buttons - Split Red vs Blue */}
      <div className="flex-1 grid grid-cols-2 gap-3 p-4">
        {/* LEFT COLUMN: SUDUT MERAH */}
        <div className="flex flex-col bg-red-950/20 border-2 border-red-600/40 rounded-2xl p-4 gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-red-500/20">
            <div>
              <span className="text-xs font-black text-red-500 tracking-wider uppercase block">
                SUDUT MERAH
              </span>
              <h3 className="text-base font-bold text-slate-100 truncate max-w-[180px]">
                {match.redCorner.name}
              </h3>
              <p className="text-xs text-red-300/70 truncate">
                {match.redCorner.contingent}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold text-sm">
              MERAH
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3 justify-center">
            {/* PUKULAN (+1) */}
            <button
              onClick={() => handleVote('merah', 'pukulan')}
              className="flex-1 min-h-[90px] rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-95 text-white font-extrabold text-xl shadow-lg shadow-red-900/40 flex flex-col items-center justify-center gap-1 transition-all border border-red-400/30"
            >
              <span>PUKULAN</span>
              <span className="text-sm font-semibold opacity-90">+1 POIN</span>
            </button>

            {/* TENDANGAN (+2) */}
            <button
              onClick={() => handleVote('merah', 'tendangan')}
              className="flex-1 min-h-[110px] rounded-xl bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 active:scale-95 text-white font-extrabold text-2xl shadow-lg shadow-red-900/40 flex flex-col items-center justify-center gap-1 transition-all border border-red-400/40"
            >
              <span>TENDANGAN</span>
              <span className="text-base font-semibold opacity-90">+2 POIN</span>
            </button>

            {/* JATUHAN (+3) */}
            <button
              onClick={() => handleVote('merah', 'jatuhan')}
              className="flex-1 min-h-[100px] rounded-xl bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 active:scale-95 text-white font-extrabold text-2xl shadow-lg shadow-red-900/50 flex flex-col items-center justify-center gap-1 transition-all border border-red-400/50"
            >
              <span>JATUHAN SAH</span>
              <span className="text-base font-semibold opacity-90">+3 POIN</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: SUDUT BIRU */}
        <div className="flex flex-col bg-blue-950/20 border-2 border-blue-600/40 rounded-2xl p-4 gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-blue-500/20">
            <div>
              <span className="text-xs font-black text-blue-500 tracking-wider uppercase block">
                SUDUT BIRU
              </span>
              <h3 className="text-base font-bold text-slate-100 truncate max-w-[180px]">
                {match.blueCorner.name}
              </h3>
              <p className="text-xs text-blue-300/70 truncate">
                {match.blueCorner.contingent}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-sm">
              BIRU
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-3 justify-center">
            {/* PUKULAN (+1) */}
            <button
              onClick={() => handleVote('biru', 'pukulan')}
              className="flex-1 min-h-[90px] rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-95 text-white font-extrabold text-xl shadow-lg shadow-blue-900/40 flex flex-col items-center justify-center gap-1 transition-all border border-blue-400/30"
            >
              <span>PUKULAN</span>
              <span className="text-sm font-semibold opacity-90">+1 POIN</span>
            </button>

            {/* TENDANGAN (+2) */}
            <button
              onClick={() => handleVote('biru', 'tendangan')}
              className="flex-1 min-h-[110px] rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 active:scale-95 text-white font-extrabold text-2xl shadow-lg shadow-blue-900/40 flex flex-col items-center justify-center gap-1 transition-all border border-blue-400/40"
            >
              <span>TENDANGAN</span>
              <span className="text-base font-semibold opacity-90">+2 POIN</span>
            </button>

            {/* JATUHAN (+3) */}
            <button
              onClick={() => handleVote('biru', 'jatuhan')}
              className="flex-1 min-h-[100px] rounded-xl bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 active:scale-95 text-white font-extrabold text-2xl shadow-lg shadow-blue-900/50 flex flex-col items-center justify-center gap-1 transition-all border border-blue-400/50"
            >
              <span>JATUHAN SAH</span>
              <span className="text-base font-semibold opacity-90">+3 POIN</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Instructions */}
      <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Sistem sinkronisasi real-time IPSI 2026 terhubung</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Toleransi konsensus mayoritas: 1.5 detik
        </div>
      </div>
    </div>
  );
};
