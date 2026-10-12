import React from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { Corner, AttackType } from '../../types/silat';
import { PanelTopNav } from '../shared/PanelTopNav';
import { UserCheck, Shield, Zap, Lock, Video, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const JuriInputView: React.FC = () => {
  const {
    currentRole,
    setCurrentRole,
    matchInfo,
    matchStatus,
    currentRound,
    timerSeconds,
    recordJudgeVote,
    judgePendingVotes,
    isJudgesLocked,
    varSession,
    submitJudgeVarVote,
  } = useSilatMatch();

  // Determine current judge ID (1, 2, or 3) from currentRole
  const judgeId = currentRole === 'JURI_1' ? 1 : currentRole === 'JURI_2' ? 2 : currentRole === 'JURI_3' ? 3 : 1;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Check if this judge has an active pending vote
  const myPendingVotes = judgePendingVotes.filter((v) => v.judgeId === judgeId);

  const isPending = (corner: Corner, attackType: AttackType) => {
    return myPendingVotes.some((v) => v.corner === corner && v.attackType === attackType);
  };

  // If VAR session is active, show the full touch VAR voting interface
  if (varSession && varSession.active) {
    const myVote = varSession.votes[judgeId];

    return (
      <main
        id="juri-var-voting-screen"
        className="max-w-4xl mx-auto p-3 sm:p-6 text-white flex flex-col justify-between min-h-[85vh] select-none space-y-4"
      >
        <PanelTopNav
          currentPanelRole={currentRole}
          title={`SESI VAR — JURI ${judgeId}`}
          subtitle="Verifikasi Jatuhan / Pelanggaran"
          badgeColor="amber"
        />

        {/* Top Info */}
        <header className="bg-zinc-900 border-2 border-amber-500 rounded-3xl p-5 text-center shadow-xl">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-widest mb-2">
            <Video className="w-4 h-4 text-amber-400 animate-pulse" />
            SESI VERIFIKASI VAR — JURI {judgeId}
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display uppercase tracking-wide">
            {varSession.type === 'JATUHAN' ? 'VERIFIKASI JATUHAN' : 'VERIFIKASI PELANGGARAN'}
          </h2>
          <p className="text-sm text-zinc-300 mt-1">{varSession.reason}</p>
        </header>

        {/* Voting Options */}
        <div className="my-6 space-y-4">
          <div className="text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
            Tekan Pilihan Anda:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Sudut Biru */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => submitJudgeVarVote(judgeId, 'BLUE')}
              className={`p-8 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                myVote === 'BLUE'
                  ? 'bg-blue-600 border-white ring-4 ring-blue-400 shadow-2xl scale-105'
                  : 'bg-blue-950/80 border-blue-600/80 hover:bg-blue-900'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-blue-300" />
              </div>
              <span className="text-xl sm:text-2xl font-black font-display tracking-wider uppercase">
                SUDUT BIRU
              </span>
              <span className="text-xs text-blue-200 truncate max-w-full">
                {matchInfo.blueAthlete.name}
              </span>
              {myVote === 'BLUE' && (
                <span className="px-3 py-1 rounded-full bg-white text-blue-950 text-xs font-black">
                  PILIHAN ANDA
                </span>
              )}
            </motion.button>

            {/* Sudut Merah */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => submitJudgeVarVote(judgeId, 'RED')}
              className={`p-8 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                myVote === 'RED'
                  ? 'bg-red-600 border-white ring-4 ring-red-400 shadow-2xl scale-105'
                  : 'bg-red-950/80 border-red-600/80 hover:bg-red-900'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-red-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-red-300" />
              </div>
              <span className="text-xl sm:text-2xl font-black font-display tracking-wider uppercase">
                SUDUT MERAH
              </span>
              <span className="text-xs text-red-200 truncate max-w-full">
                {matchInfo.redAthlete.name}
              </span>
              {myVote === 'RED' && (
                <span className="px-3 py-1 rounded-full bg-white text-red-950 text-xs font-black">
                  PILIHAN ANDA
                </span>
              )}
            </motion.button>

            {/* Tidak Sah */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => submitJudgeVarVote(judgeId, 'INVALID')}
              className={`p-8 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                myVote === 'INVALID'
                  ? 'bg-zinc-700 border-white ring-4 ring-zinc-400 shadow-2xl scale-105'
                  : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-zinc-400" />
              </div>
              <span className="text-xl sm:text-2xl font-black font-display tracking-wider uppercase text-zinc-200">
                TIDAK SAH
              </span>
              <span className="text-xs text-zinc-400">Teknik Tidak Sah / Gugur</span>
              {myVote === 'INVALID' && (
                <span className="px-3 py-1 rounded-full bg-white text-zinc-950 text-xs font-black">
                  PILIHAN ANDA
                </span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Footer status */}
        <footer className="text-center text-xs text-zinc-400">
          Suara Anda terkirim otomatis ke layar Dewan Juri.
        </footer>
      </main>
    );
  }

  return (
    <main
      id="juri-scoring-input-panel"
      className="max-w-6xl mx-auto p-3 sm:p-6 text-white flex flex-col justify-between min-h-[88vh] select-none font-sans space-y-4"
    >
      {/* Universal Top Navigation: Kembali & Full Screen & Offline Status */}
      <PanelTopNav
        currentPanelRole={currentRole}
        title={`PANEL JURI ${judgeId}`}
        subtitle="Tombol Input Pukulan & Tendangan Sudut Biru / Merah"
        badgeColor="emerald"
      />

      {/* Top Header: Judge Switcher & Arena Match Header */}
      <header className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Judge selector tabs */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-400 uppercase mr-1">Posisi Juri:</span>
          {([1, 2, 3] as const).map((id) => (
            <button
              key={id}
              onClick={() => setCurrentRole(`JURI_${id}` as const)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all border ${
                judgeId === id
                  ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              JURI {id}
            </button>
          ))}
        </div>

        {/* Active Timer & Round Pill */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] font-bold text-zinc-400 uppercase block">BABAK PERTANDINGAN</span>
            <span className="text-sm font-black text-amber-400 font-display">BABAK {currentRound}</span>
          </div>
          <div
            className={`px-5 py-1.5 rounded-2xl border font-digital font-black text-2xl tracking-wider ${
              matchStatus === 'RUNNING'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 animate-pulse'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
            }`}
          >
            {formatTimer(timerSeconds)}
          </div>
        </div>
      </header>

      {/* Lock alert if disabled */}
      {(isJudgesLocked || matchStatus !== 'RUNNING') && (
        <div className="my-2 bg-amber-950/80 border border-amber-500/80 rounded-2xl p-3 text-center text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          {isJudgesLocked
            ? 'Panel Juri sedang DIKUNCI oleh Dewan Juri.'
            : 'Pertandingan sedang dijeda / belum dimulai.'}
        </div>
      )}

      {/* SYMMETRICAL TOUCH INPUT AREA: LEFT (BLUE) | RIGHT (RED) */}
      <section
        id="juri-touch-pad-grid"
        className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 my-4 flex-1 items-stretch"
      >
        {/* SUDUT BIRU BUTTONS (LEFT) */}
        <div
          id="juri-blue-touch-area"
          className="flex flex-col justify-between p-5 sm:p-7 rounded-3xl border-2 border-blue-600 bg-gradient-to-b from-blue-900/90 via-blue-950/90 to-zinc-950 shadow-2xl glow-blue"
        >
          {/* Athlete Info */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-blue-600/70 border border-blue-400 text-white font-black text-xs uppercase tracking-widest">
                SUDUT BIRU
              </span>
              <span className="text-xs text-blue-300">{matchInfo.blueAthlete.contingent}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase font-display mt-2 truncate">
              {matchInfo.blueAthlete.name}
            </h2>
          </div>

          {/* Big Tactile Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto">
            {/* PUKULAN (+1) */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              id={`btn-juri-${judgeId}-blue-pukulan`}
              disabled={isJudgesLocked || matchStatus !== 'RUNNING'}
              onClick={() => recordJudgeVote(judgeId, 'BLUE', 'PUKULAN')}
              className={`p-6 sm:p-8 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all shadow-xl ${
                isPending('BLUE', 'PUKULAN')
                  ? 'bg-blue-400 text-blue-950 border-white ring-4 ring-blue-300 shadow-blue-400/80 scale-105'
                  : 'bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-400 text-white disabled:opacity-50'
              }`}
            >
              <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              <span className="text-xl sm:text-2xl font-black font-display uppercase tracking-wider">
                PUKULAN
              </span>
              <span className="px-3 py-0.5 rounded-full bg-blue-950/80 text-blue-200 text-xs font-mono font-black border border-blue-400/40">
                +1 POIN
              </span>
              {isPending('BLUE', 'PUKULAN') && (
                <span className="text-[10px] font-black text-blue-950 uppercase tracking-widest animate-pulse mt-1">
                  MENUNGGU KONSENSUS...
                </span>
              )}
            </motion.button>

            {/* TENDANGAN (+2) */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              id={`btn-juri-${judgeId}-blue-tendangan`}
              disabled={isJudgesLocked || matchStatus !== 'RUNNING'}
              onClick={() => recordJudgeVote(judgeId, 'BLUE', 'TENDANGAN')}
              className={`p-6 sm:p-8 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all shadow-xl ${
                isPending('BLUE', 'TENDANGAN')
                  ? 'bg-blue-400 text-blue-950 border-white ring-4 ring-blue-300 shadow-blue-400/80 scale-105'
                  : 'bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-400 text-white disabled:opacity-50'
              }`}
            >
              <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              <span className="text-xl sm:text-2xl font-black font-display uppercase tracking-wider">
                TENDANGAN
              </span>
              <span className="px-3 py-0.5 rounded-full bg-blue-950/80 text-blue-200 text-xs font-mono font-black border border-blue-400/40">
                +2 POIN
              </span>
              {isPending('BLUE', 'TENDANGAN') && (
                <span className="text-[10px] font-black text-blue-950 uppercase tracking-widest animate-pulse mt-1">
                  MENUNGGU KONSENSUS...
                </span>
              )}
            </motion.button>
          </div>

          <div className="mt-4 text-[11px] text-blue-300/80 text-center">
            Poin disahkan otomatis jika minimal 2 dari 3 juri menekan tombol yang sama dalam 2 detik.
          </div>
        </div>

        {/* SUDUT MERAH BUTTONS (RIGHT) */}
        <div
          id="juri-red-touch-area"
          className="flex flex-col justify-between p-5 sm:p-7 rounded-3xl border-2 border-red-600 bg-gradient-to-b from-red-900/90 via-red-950/90 to-zinc-950 shadow-2xl glow-red"
        >
          {/* Athlete Info */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-300">{matchInfo.redAthlete.contingent}</span>
              <span className="px-3 py-1 rounded-full bg-red-600/70 border border-red-400 text-white font-black text-xs uppercase tracking-widest">
                SUDUT MERAH
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase font-display mt-2 truncate text-right">
              {matchInfo.redAthlete.name}
            </h2>
          </div>

          {/* Big Tactile Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto">
            {/* PUKULAN (+1) */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              id={`btn-juri-${judgeId}-red-pukulan`}
              disabled={isJudgesLocked || matchStatus !== 'RUNNING'}
              onClick={() => recordJudgeVote(judgeId, 'RED', 'PUKULAN')}
              className={`p-6 sm:p-8 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all shadow-xl ${
                isPending('RED', 'PUKULAN')
                  ? 'bg-red-400 text-red-950 border-white ring-4 ring-red-300 shadow-red-400/80 scale-105'
                  : 'bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border-red-400 text-white disabled:opacity-50'
              }`}
            >
              <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              <span className="text-xl sm:text-2xl font-black font-display uppercase tracking-wider">
                PUKULAN
              </span>
              <span className="px-3 py-0.5 rounded-full bg-red-950/80 text-red-200 text-xs font-mono font-black border border-red-400/40">
                +1 POIN
              </span>
              {isPending('RED', 'PUKULAN') && (
                <span className="text-[10px] font-black text-red-950 uppercase tracking-widest animate-pulse mt-1">
                  MENUNGGU KONSENSUS...
                </span>
              )}
            </motion.button>

            {/* TENDANGAN (+2) */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              id={`btn-juri-${judgeId}-red-tendangan`}
              disabled={isJudgesLocked || matchStatus !== 'RUNNING'}
              onClick={() => recordJudgeVote(judgeId, 'RED', 'TENDANGAN')}
              className={`p-6 sm:p-8 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all shadow-xl ${
                isPending('RED', 'TENDANGAN')
                  ? 'bg-red-400 text-red-950 border-white ring-4 ring-red-300 shadow-red-400/80 scale-105'
                  : 'bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border-red-400 text-white disabled:opacity-50'
              }`}
            >
              <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              <span className="text-xl sm:text-2xl font-black font-display uppercase tracking-wider">
                TENDANGAN
              </span>
              <span className="px-3 py-0.5 rounded-full bg-red-950/80 text-red-200 text-xs font-mono font-black border border-red-400/40">
                +2 POIN
              </span>
              {isPending('RED', 'TENDANGAN') && (
                <span className="text-[10px] font-black text-red-950 uppercase tracking-widest animate-pulse mt-1">
                  MENUNGGU KONSENSUS...
                </span>
              )}
            </motion.button>
          </div>

          <div className="mt-4 text-[11px] text-red-300/80 text-center">
            Poin disahkan otomatis jika minimal 2 dari 3 juri menekan tombol yang sama dalam 2 detik.
          </div>
        </div>
      </section>

      {/* Bottom Status bar */}
      <footer className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 text-center text-xs text-zinc-400 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          Terminal Aktif: <strong className="text-white">JURI {judgeId}</strong>
        </span>
        <span className="text-[11px] text-zinc-500">
          Standar Peraturan Tanding PERSILAT 2022/2024 (2 of 3 Consensus Engine)
        </span>
      </footer>
    </main>
  );
};
