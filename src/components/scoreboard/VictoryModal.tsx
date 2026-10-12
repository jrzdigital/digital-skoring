import React, { useEffect } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import confetti from 'canvas-confetti';
import { Trophy, Award, CheckCircle, RefreshCw, X, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IpsiLogo } from '../shared/IpsiLogo';

export const VictoryModal: React.FC = () => {
  const {
    winnerAnnouncement,
    closeWinnerModal,
    matchInfo,
    blueTotalScore,
    redTotalScore,
    resetMatchForNextParty,
    blueScores,
    redScores,
    calculateRoundScore,
  } = useSilatMatch();

  useEffect(() => {
    if (winnerAnnouncement && winnerAnnouncement.isOpen) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: winnerAnnouncement.winner === 'BLUE' ? ['#2563eb', '#60a5fa', '#93c5fd', '#fbbf24'] : ['#dc2626', '#f87171', '#fca5a5', '#fbbf24'],
        });
      } catch {
        // Confetti fallback
      }
    }
  }, [winnerAnnouncement]);

  if (!winnerAnnouncement || !winnerAnnouncement.isOpen) return null;

  const winnerCorner = winnerAnnouncement.winner;
  const isBlueWinner = winnerCorner === 'BLUE';
  const isRedWinner = winnerCorner === 'RED';
  const isDraw = winnerCorner === 'DRAW';

  const winningAthlete = isBlueWinner
    ? matchInfo.blueAthlete
    : isRedWinner
    ? matchInfo.redAthlete
    : null;

  const decisionLabel = {
    MENANG_ANGKA: 'MENANG ANGKA',
    MENANG_MUTLAK: 'MENANG MUTLAK',
    MENANG_DISKUALIFIKASI: 'MENANG DISKUALIFIKASI (DISKUALIFIKASI LAWAN)',
    MENANG_WMP: 'MENANG W.M.P (WASIT MENGHENTIKAN PERTANDINGAN)',
    MENANG_TEKNIK: 'MENANG TEKNIK',
  }[winnerAnnouncement.decisionType] || winnerAnnouncement.decisionType;

  // Breakdown statistics
  const blueStats = {
    pukulan: blueScores.round1.pukulan + blueScores.round2.pukulan + blueScores.round3.pukulan,
    tendangan: blueScores.round1.tendangan + blueScores.round2.tendangan + blueScores.round3.tendangan,
    jatuhan: blueScores.round1.jatuhan + blueScores.round2.jatuhan + blueScores.round3.jatuhan,
  };

  const redStats = {
    pukulan: redScores.round1.pukulan + redScores.round2.pukulan + redScores.round3.pukulan,
    tendangan: redScores.round1.tendangan + redScores.round2.tendangan + redScores.round3.tendangan,
    jatuhan: redScores.round1.jatuhan + redScores.round2.jatuhan + redScores.round3.jatuhan,
  };

  return (
    <AnimatePresence>
      <motion.div
        id="victory-celebration-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className={`w-full max-w-3xl rounded-3xl p-6 sm:p-10 shadow-2xl border-2 relative overflow-hidden text-center ${
            isBlueWinner
              ? 'bg-gradient-to-b from-blue-950/95 via-zinc-950 to-zinc-950 border-blue-500 glow-blue'
              : isRedWinner
              ? 'bg-gradient-to-b from-red-950/95 via-zinc-950 to-zinc-950 border-red-500 glow-red'
              : 'bg-zinc-900 border-amber-500 glow-gold'
          }`}
        >
          {/* Close button */}
          <button
            onClick={closeWinnerModal}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Trophy & Badge */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-lg glow-gold">
                <Trophy className="w-10 h-10" />
              </div>
              <div className="absolute -bottom-1 -right-1">
                <IpsiLogo size={28} />
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold text-xs tracking-widest uppercase mb-3">
            <Award className="w-4 h-4 text-amber-400" />
            KEPUTUSAN RESMI DEWAN JURI
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-zinc-300 uppercase tracking-wider font-display mb-1">
            PEMENANG PERTANDINGAN
          </h2>

          {/* Winner Name Banner */}
          <div className="my-4 p-5 rounded-2xl bg-zinc-900/90 border border-zinc-700/80">
            <div className="text-xs font-black tracking-widest uppercase mb-1">
              {isBlueWinner ? (
                <span className="text-blue-400">SUDUT BIRU</span>
              ) : isRedWinner ? (
                <span className="text-red-400">SUDUT MERAH</span>
              ) : (
                <span className="text-amber-400">HASIL SERI / DRAW</span>
              )}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white font-display uppercase tracking-wide">
              {winningAthlete ? winningAthlete.name : 'HASIL SEIMBANG'}
            </h1>
            {winningAthlete && (
              <p className="text-sm sm:text-base font-semibold text-zinc-300 mt-1">
                KONTINGEN: <span className="text-amber-400 font-bold">{winningAthlete.contingent}</span>
              </p>
            )}
          </div>

          {/* Decision badge */}
          <div className="inline-block px-5 py-2 rounded-xl bg-zinc-800/90 border border-zinc-600 text-sm sm:text-base font-black text-amber-300 uppercase tracking-wider mb-6">
            {decisionLabel}
          </div>

          {/* Final Score Comparison */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div
              className={`p-4 rounded-2xl border text-center ${
                isBlueWinner
                  ? 'bg-blue-950/80 border-blue-400 ring-2 ring-blue-500/40'
                  : 'bg-zinc-900/80 border-zinc-800 opacity-80'
              }`}
            >
              <div className="text-xs font-extrabold text-blue-400 uppercase">SUDUT BIRU</div>
              <div className="text-xs text-zinc-300 font-semibold truncate mb-1">{matchInfo.blueAthlete.name}</div>
              <div className="text-4xl sm:text-5xl font-digital font-black text-blue-400 tracking-wider">
                {blueTotalScore}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Pukulan: {blueStats.pukulan} | Tendangan: {blueStats.tendangan} | Jatuhan: {blueStats.jatuhan}
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border text-center ${
                isRedWinner
                  ? 'bg-red-950/80 border-red-400 ring-2 ring-red-500/40'
                  : 'bg-zinc-900/80 border-zinc-800 opacity-80'
              }`}
            >
              <div className="text-xs font-extrabold text-red-400 uppercase">SUDUT MERAH</div>
              <div className="text-xs text-zinc-300 font-semibold truncate mb-1">{matchInfo.redAthlete.name}</div>
              <div className="text-4xl sm:text-5xl font-digital font-black text-red-400 tracking-wider">
                {redTotalScore}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Pukulan: {redStats.pukulan} | Tendangan: {redStats.tendangan} | Jatuhan: {redStats.jatuhan}
              </div>
            </div>
          </div>

          {/* Match metadata footer */}
          <div className="text-xs text-zinc-400 mb-6">
            {matchInfo.tournamentName} • {matchInfo.arena} • {matchInfo.categoryClass} • {matchInfo.roundPhase}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              id="btn-close-victory-modal"
              onClick={closeWinnerModal}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors border border-zinc-700"
            >
              Tutup & Tinjau Rekapitulasi
            </button>
            <button
              id="btn-next-match-reset"
              onClick={resetMatchForNextParty}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm transition-all shadow-lg shadow-emerald-900/40"
            >
              <RefreshCw className="w-4 h-4" />
              Simpan & Siapkan Partai Berikutnya
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
