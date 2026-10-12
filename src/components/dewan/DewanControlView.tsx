import React, { useState } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { PanelTopNav } from '../shared/PanelTopNav';
import { VarDewanModal } from './VarDewanModal';
import { DecisionModal } from './DecisionModal';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  ShieldAlert,
  Flame,
  Undo2,
  Lock,
  Unlock,
  Video,
  Trophy,
  Activity,
  AlertTriangle,
  ChevronRight,
  Shield,
} from 'lucide-react';

export const DewanControlView: React.FC = () => {
  const {
    matchInfo,
    matchStatus,
    currentRound,
    timerSeconds,
    roundDurationSeconds,
    startTimer,
    pauseTimer,
    resetTimer,
    setRoundDuration,
    setRound,
    nextRound,
    blueScores,
    redScores,
    blueTotalScore,
    redTotalScore,
    addJatuhan,
    removeJatuhan,
    setBinaan,
    toggleTeguran,
    togglePeringatan,
    adjustKeluarGelanggang,
    undoLastAction,
    isJudgesLocked,
    setIsJudgesLocked,
    activityLogs,
    gapRuleTriggered,
  } = useSilatMatch();

  const [isVarModalOpen, setIsVarModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const durations = [
    { label: '1 Menit', seconds: 60 },
    { label: '1.5 Menit', seconds: 90 },
    { label: '2 Menit', seconds: 120 },
    { label: '3 Menit', seconds: 180 },
  ];

  const currentBlueScore = blueScores[`round${currentRound}` as keyof typeof blueScores];
  const currentRedScore = redScores[`round${currentRound}` as keyof typeof redScores];

  return (
    <main
      id="dewan-control-panel"
      className="max-w-7xl mx-auto p-3 sm:p-6 text-zinc-100 font-sans space-y-4 sm:space-y-6"
    >
      {/* Universal Top Navigation: Kembali & Full Screen & Offline Badge */}
      <PanelTopNav
        currentPanelRole="DEWAN"
        title="PANEL DEWAN JURI"
        subtitle="Kendali Pengatur Waktu, Verifikasi VAR, dan Keputusan Pertandingan"
        badgeColor="amber"
      />

      {/* Top Banner: Arena Info & Quick Action Header */}
      <header className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black tracking-widest text-amber-400 uppercase mb-1">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            PANEL KETUA PERTANDINGAN & DEWAN JURI
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-wide">
            {matchInfo.tournamentName}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {matchInfo.arena} • {matchInfo.partaiNumber} • {matchInfo.categoryClass} ({matchInfo.ageGroup} {matchInfo.gender})
          </p>
        </div>

        {/* Action Header Buttons: Undo, Lock, VAR, Declare Winner */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
          <button
            id="btn-dewan-undo"
            onClick={undoLastAction}
            title="Batalkan (Undo) aksi skor atau sanksi terakhir"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
          >
            <Undo2 className="w-4 h-4 text-amber-400" />
            Undo Koreksi
          </button>

          <button
            id="btn-dewan-lock-judges"
            onClick={() => setIsJudgesLocked(!isJudgesLocked)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              isJudgesLocked
                ? 'bg-amber-950/90 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
            }`}
          >
            {isJudgesLocked ? (
              <>
                <Lock className="w-4 h-4 text-amber-400" /> Juri Terkunci
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4 text-emerald-400" /> Juri Aktif
              </>
            )}
          </button>

          <button
            id="btn-dewan-open-var"
            onClick={() => setIsVarModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-amber-500/20"
          >
            <Video className="w-4 h-4" />
            Verifikasi VAR
          </button>

          <button
            id="btn-dewan-declare-winner"
            onClick={() => setIsDecisionModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-900/40"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            Tetapkan Pemenang
          </button>
        </div>
      </header>

      {/* GAP RULE WARNING IF ACTIVE */}
      {gapRuleTriggered && (
        <div className="bg-red-950/90 border-2 border-red-500 rounded-2xl p-4 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <Flame className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="text-sm font-black text-white uppercase">
                GAP RULE (+30 POIN) SEDANG AKTIF!
              </h3>
              <p className="text-xs text-red-200">
                Selisih skor saat ini: {Math.abs(blueTotalScore - redTotalScore)} Poin. Pertandingan dapat dihentikan demi keselamatan atlet.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDecisionModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase"
          >
            Sahkan Menang Teknik
          </button>
        </div>
      )}

      {/* SECTION 1: MASTER TIMER & ROUND CONTROLLER */}
      <section
        id="dewan-timer-controller"
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
          <span className="text-xs font-black tracking-wider text-amber-400 uppercase flex items-center gap-2">
            <Clock className="w-4 h-4" />
            KONTROL WAKTU & BABAK PERTANDINGAN
          </span>
          <span className="text-xs font-bold text-zinc-400">
            STATUS: <span className="text-white uppercase">{matchStatus}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Big Time Display & Play/Pause/Reset */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
            <div
              id="dewan-timer-display"
              className={`font-digital font-black text-6xl sm:text-7xl tracking-wider ${
                matchStatus === 'RUNNING' ? 'text-emerald-400 text-glow-green' : 'text-amber-400'
              }`}
            >
              {formatTimer(timerSeconds)}
            </div>

            {/* Main Timer Buttons */}
            <div className="grid grid-cols-3 gap-2 w-full mt-4">
              <button
                id="btn-dewan-start-timer"
                onClick={startTimer}
                disabled={matchStatus === 'RUNNING'}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs uppercase transition-all shadow-md shadow-emerald-950"
              >
                <Play className="w-4 h-4 fill-current" /> Mulai
              </button>

              <button
                id="btn-dewan-pause-timer"
                onClick={pauseTimer}
                disabled={matchStatus !== 'RUNNING'}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-black text-xs uppercase transition-all shadow-md shadow-amber-950"
              >
                <Pause className="w-4 h-4 fill-current" /> Jeda
              </button>

              <button
                id="btn-dewan-reset-timer"
                onClick={resetTimer}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase transition-all"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>
          </div>

          {/* Round Selector & Quick Duration Picker */}
          <div className="md:col-span-7 space-y-4">
            {/* Round Switcher */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
                Pilih Babak Pertandingan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map((r) => (
                  <button
                    key={r}
                    id={`btn-dewan-round-${r}`}
                    onClick={() => setRound(r)}
                    className={`py-3 rounded-xl font-black text-sm uppercase transition-all border ${
                      currentRound === r
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg ring-2 ring-amber-400/40'
                        : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                    }`}
                  >
                    BABAK {r} {currentRound === r && '★'}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration selector */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
                Pengaturan Durasi Babak
              </label>
              <div className="grid grid-cols-4 gap-2">
                {durations.map((d) => (
                  <button
                    key={d.seconds}
                    onClick={() => setRoundDuration(d.seconds)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      roundDurationSeconds === d.seconds
                        ? 'bg-zinc-800 text-amber-400 border-amber-500/80 ring-1 ring-amber-500/40'
                        : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: JATUHAN & HUKUMAN CONTROLLER (BLUE VS RED) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SUDUT BIRU CONTROLLER */}
        <div
          id="dewan-blue-corner-controls"
          className="bg-zinc-900 border-2 border-blue-600/80 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4 border-b border-blue-900/60 pb-3">
            <div>
              <span className="text-[10px] font-black text-blue-400 tracking-wider uppercase">
                SUDUT BIRU
              </span>
              <h3 className="text-lg font-black text-white truncate font-display">
                {matchInfo.blueAthlete.name}
              </h3>
              <p className="text-xs text-blue-300/80">{matchInfo.blueAthlete.contingent}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 uppercase">TOTAL SKOR</span>
              <div className="text-3xl font-digital font-black text-blue-400">{blueTotalScore}</div>
            </div>
          </div>

          {/* EKSEKUSI JATUHAN SAH */}
          <div className="mb-5">
            <span className="block text-xs font-black text-blue-300 uppercase mb-2">
              Eksekusi Nilai Jatuhan Wasit (+3 Poin)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-dewan-add-jatuhan-blue"
                onClick={() => addJatuhan('BLUE')}
                className="py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm uppercase tracking-wide transition-all shadow-lg shadow-blue-950"
              >
                + JATUHAN BIRU (+3)
              </button>
              <button
                id="btn-dewan-remove-jatuhan-blue"
                onClick={() => removeJatuhan('BLUE')}
                className="py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold uppercase transition-colors"
              >
                - Koreksi Jatuhan (-3)
              </button>
            </div>
          </div>

          {/* SANKSI & HUKUMAN SUDUT BIRU */}
          <div className="space-y-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4">
            <span className="block text-xs font-black text-zinc-400 uppercase">
              Sanksi & Hukuman Babak {currentRound}
            </span>

            {/* Binaan (1, 2) */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase mb-1">
                Binaan (0 Poin)
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setBinaan('BLUE', lvl)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                      currentBlueScore.binaan === lvl
                        ? 'bg-amber-600 text-white border-amber-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {lvl === 0 ? 'Bersih (0)' : `Binaan ${lvl}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Teguran (1 = -1, 2 = -2) */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase mb-1">
                Teguran
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => toggleTeguran('BLUE', 1)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    currentBlueScore.teguran1
                      ? 'bg-red-600 text-white border-red-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Teguran 1 (-1 Poin)
                </button>
                <button
                  onClick={() => toggleTeguran('BLUE', 2)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    currentBlueScore.teguran2
                      ? 'bg-red-600 text-white border-red-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Teguran 2 (-2 Poin)
                </button>
              </div>
            </div>

            {/* Peringatan (1 = -5, 2 = -10, 3 = DQ) */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase mb-1">
                Peringatan
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => togglePeringatan('BLUE', 1)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    currentBlueScore.peringatan1
                      ? 'bg-red-600 text-white border-red-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  P1 (-5 Poin)
                </button>
                <button
                  onClick={() => togglePeringatan('BLUE', 2)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    currentBlueScore.peringatan2
                      ? 'bg-red-600 text-white border-red-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  P2 (-10 Poin)
                </button>
                <button
                  onClick={() => togglePeringatan('BLUE', 3)}
                  className="py-2 rounded-lg text-xs font-bold bg-red-950 border border-red-700 text-red-300 hover:bg-red-900 transition-colors"
                >
                  P3 (Diskualifikasi)
                </button>
              </div>
            </div>

            {/* Keluar Gelanggang (-1 each) */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase mb-1">
                <span>Keluar Gelanggang (-1 Poin)</span>
                <span className="text-amber-400 font-mono">
                  Total: {currentBlueScore.keluarGelanggang}x
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => adjustKeluarGelanggang('BLUE', 1)}
                  className="py-2 rounded-lg bg-orange-950 hover:bg-orange-900 border border-orange-700 text-orange-300 font-bold text-xs"
                >
                  + Keluar Gelanggang (-1)
                </button>
                <button
                  onClick={() => adjustKeluarGelanggang('BLUE', -1)}
                  disabled={currentBlueScore.keluarGelanggang === 0}
                  className="py-2 rounded-lg bg-zinc-900 disabled:opacity-40 border border-zinc-800 text-zinc-400 text-xs font-semibold"
                >
                  - Koreksi Keluar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SUDUT MERAH CONTROLLER */}
        <div
          id="dewan-red-corner-controls"
          className="bg-zinc-900 border-2 border-red-600/80 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4 border-b border-red-900/60 pb-3">
            <div>
              <span className="text-[10px] font-black text-red-400 tracking-wider uppercase">
                SUDUT MERAH
              </span>
              <h3 className="text-lg font-black text-white truncate font-display">
                {matchInfo.redAthlete.name}
              </h3>
              <p className="text-xs text-red-300/80">{matchInfo.redAthlete.contingent}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 uppercase">TOTAL SKOR</span>
              <div className="text-3xl font-digital font-black text-red-400">{redTotalScore}</div>
            </div>
          </div>

          {/* EKSEKUSI JATUHAN SAH */}
          <div className="mb-5">
            <span className="block text-xs font-black text-red-300 uppercase mb-2">
              Eksekusi Nilai Jatuhan Wasit (+3 Poin)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-dewan-add-jatuhan-red"
                onClick={() => addJatuhan('RED')}
                className="py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs sm:text-sm uppercase tracking-wide transition-all shadow-lg shadow-red-950"
              >
                + JATUHAN MERAH (+3)
              </button>
              <button
                id="btn-dewan-remove-jatuhan-red"
                onClick={() => removeJatuhan('RED')}
                className="py-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold uppercase transition-colors"
              >
                - Koreksi Jatuhan (-3)
              </button>
            </div>
          </div>

          {/* SANKSI & HUKUMAN SUDUT MERAH */}
          <div className="space-y-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4">
            <span className="block text-xs font-black text-zinc-400 uppercase">
              Sanksi & Hukuman Babak {currentRound}
            </span>

            {/* Binaan (1, 2) */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase mb-1">
                Binaan (0 Poin)
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setBinaan('RED', lvl)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                      currentRedScore.binaan === lvl
                        ? 'bg-amber-600 text-white border-amber-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {lvl === 0 ? 'Bersih (0)' : `Binaan ${lvl}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Teguran (1 = -1, 2 = -2) */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase mb-1">
                Teguran
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => toggleTeguran('RED', 1)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    currentRedScore.teguran1
                      ? 'bg-red-600 text-white border-red-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Teguran 1 (-1 Poin)
                </button>
                <button
                  onClick={() => toggleTeguran('RED', 2)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    currentRedScore.teguran2
                      ? 'bg-red-600 text-white border-red-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  Teguran 2 (-2 Poin)
                </button>
              </div>
            </div>

            {/* Peringatan (1 = -5, 2 = -10, 3 = DQ) */}
            <div>
              <div className="text-[11px] font-bold text-zinc-400 uppercase mb-1">
                Peringatan
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => togglePeringatan('RED', 1)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    currentRedScore.peringatan1
                      ? 'bg-red-600 text-white border-red-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  P1 (-5 Poin)
                </button>
                <button
                  onClick={() => togglePeringatan('RED', 2)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    currentRedScore.peringatan2
                      ? 'bg-red-600 text-white border-red-400 shadow-md'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  }`}
                >
                  P2 (-10 Poin)
                </button>
                <button
                  onClick={() => togglePeringatan('RED', 3)}
                  className="py-2 rounded-lg text-xs font-bold bg-red-950 border border-red-700 text-red-300 hover:bg-red-900 transition-colors"
                >
                  P3 (Diskualifikasi)
                </button>
              </div>
            </div>

            {/* Keluar Gelanggang (-1 each) */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase mb-1">
                <span>Keluar Gelanggang (-1 Poin)</span>
                <span className="text-amber-400 font-mono">
                  Total: {currentRedScore.keluarGelanggang}x
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => adjustKeluarGelanggang('RED', 1)}
                  className="py-2 rounded-lg bg-orange-950 hover:bg-orange-900 border border-orange-700 text-orange-300 font-bold text-xs"
                >
                  + Keluar Gelanggang (-1)
                </button>
                <button
                  onClick={() => adjustKeluarGelanggang('RED', -1)}
                  disabled={currentRedScore.keluarGelanggang === 0}
                  className="py-2 rounded-lg bg-zinc-900 disabled:opacity-40 border border-zinc-800 text-zinc-400 text-xs font-semibold"
                >
                  - Koreksi Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: REAL-TIME MATCH ACTIVITY AUDIT LOG */}
      <section
        id="dewan-activity-log-table"
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-black tracking-wider text-amber-400 uppercase">
            <Activity className="w-4 h-4" />
            LOG KRONOLOGIS AKTIVITAS & KEPUTUSAN WASIT / JURI
          </div>
          <span className="text-xs text-zinc-400">Total: {activityLogs.length} Entri</span>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {activityLogs.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs italic">
              Belum ada aktivitas terekam. Pertandingan siap dimulai.
            </div>
          ) : (
            activityLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between gap-3 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs"
              >
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono text-[11px] text-zinc-400">{log.clockTime}</span>
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                    R{log.round} [{log.matchTimerFormatted}]
                  </span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      log.actor.includes('JURI')
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : log.actor.includes('DEWAN')
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {log.actor}
                  </span>
                </div>

                <div className="flex-1 px-2">
                  <span
                    className={`font-extrabold mr-2 ${
                      log.corner === 'BLUE'
                        ? 'text-blue-400'
                        : log.corner === 'RED'
                        ? 'text-red-400'
                        : 'text-zinc-200'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="text-zinc-400">{log.description}</span>
                </div>

                {log.pointChange !== undefined && (
                  <span
                    className={`font-mono font-bold text-xs flex-shrink-0 ${
                      log.pointChange > 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {log.pointChange > 0 ? `+${log.pointChange}` : log.pointChange}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* VAR & Decision Modals */}
      <VarDewanModal isOpen={isVarModalOpen} onClose={() => setIsVarModalOpen(false)} />
      <DecisionModal isOpen={isDecisionModalOpen} onClose={() => setIsDecisionModalOpen(false)} />
    </main>
  );
};
