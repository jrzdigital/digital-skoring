import React from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { Video, ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const VarOverlay: React.FC = () => {
  const { varSession, matchInfo } = useSilatMatch();

  if (!varSession || !varSession.active) return null;

  const judges = [1, 2, 3] as const;

  const getVoteBadge = (vote?: 'BLUE' | 'RED' | 'INVALID') => {
    if (!vote) {
      return (
        <span className="flex items-center gap-1 text-zinc-400 animate-pulse text-sm font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          Menunggu Input Juri...
        </span>
      );
    }
    if (vote === 'BLUE') {
      return (
        <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600/90 text-white font-extrabold text-base border border-blue-400 shadow-lg shadow-blue-500/30">
          <CheckCircle2 className="w-4 h-4" /> SUDUT BIRU
        </span>
      );
    }
    if (vote === 'RED') {
      return (
        <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600/90 text-white font-extrabold text-base border border-red-400 shadow-lg shadow-red-500/30">
          <CheckCircle2 className="w-4 h-4" /> SUDUT MERAH
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-zinc-700 text-zinc-200 font-extrabold text-base border border-zinc-500">
        <XCircle className="w-4 h-4 text-zinc-400" /> TIDAK SAH
      </span>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        id="var-fullscreen-overlay"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8"
      >
        <div className="w-full max-w-4xl bg-zinc-900/95 border-2 border-amber-500/80 rounded-3xl p-6 sm:p-10 shadow-2xl glow-gold relative overflow-hidden">
          {/* Top glowing banner */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 animate-pulse" />

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-amber-500/20 border border-amber-500 text-amber-300 text-sm sm:text-base font-black tracking-widest uppercase mb-3">
              <Video className="w-5 h-5 text-amber-400 animate-pulse" />
              VAR / SESI VERIFIKASI DEWAN JURI
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white font-display uppercase tracking-wide">
              VERIFIKASI {varSession.type === 'JATUHAN' ? 'JATUHAN SAH' : 'PELANGGARAN WASIT'}
            </h2>
            <p className="text-zinc-300 text-sm sm:text-base mt-2 max-w-xl">
              {varSession.reason || 'Dewan Juri meminta konfirmasi live voting dari 3 Juri Sudut.'}
            </p>
          </div>

          {/* Athletes reference banner */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/80 to-blue-900/40 border border-blue-500/50 text-center">
              <span className="text-xs font-black text-blue-400 tracking-wider uppercase">SUDUT BIRU</span>
              <h3 className="text-lg font-black text-white truncate mt-1">{matchInfo.blueAthlete.name}</h3>
              <p className="text-xs text-blue-200/80">{matchInfo.blueAthlete.contingent}</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-red-950/80 to-red-900/40 border border-red-500/50 text-center">
              <span className="text-xs font-black text-red-400 tracking-wider uppercase">SUDUT MERAH</span>
              <h3 className="text-lg font-black text-white truncate mt-1">{matchInfo.redAthlete.name}</h3>
              <p className="text-xs text-red-200/80">{matchInfo.redAthlete.contingent}</p>
            </div>
          </div>

          {/* 3 Judges Live Voting Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {judges.map((judgeId) => {
              const vote = varSession.votes[judgeId];
              return (
                <div
                  key={judgeId}
                  id={`var-judge-card-${judgeId}`}
                  className="flex flex-col items-center justify-between p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-inner min-h-[140px]"
                >
                  <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-3">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    JURI {judgeId}
                  </div>
                  <div className="my-auto">{getVoteBadge(vote)}</div>
                  <span className="text-[10px] text-zinc-500 mt-2">
                    {vote ? 'Pilihan tersimpan' : 'Menunggu respon...'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs text-center border-t border-zinc-800/80 pt-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Keputusan mutlak disahkan berdasarkan suara mayoritas juri dan ketetapan Dewan Juri.
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
