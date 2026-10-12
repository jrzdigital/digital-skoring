import React, { useState, useEffect } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { IpsiLogo, PersilatLogo } from '../shared/IpsiLogo';
import { VarOverlay } from './VarOverlay';
import { VictoryModal } from './VictoryModal';
import { toggleFullscreen, isFullscreenActive } from '../../utils/fullscreen';
import {
  Maximize2,
  Minimize2,
  Flame,
  Shield,
  Activity,
  AlertCircle,
  Award,
  Zap,
  ArrowLeft,
  Tv,
  CheckCircle2,
} from 'lucide-react';

export const ScoreboardView: React.FC = () => {
  const {
    setCurrentRole,
    matchInfo,
    matchStatus,
    currentRound,
    timerSeconds,
    roundDurationSeconds,
    blueScores,
    redScores,
    blueTotalScore,
    redTotalScore,
    calculateRoundScore,
    activeConsensusLamps,
    gapRuleTriggered,
  } = useSilatMatch();

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isFullscreenActive());
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    const active = await toggleFullscreen();
    setIsFullscreen(active);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Timer percentage for progress bar
  const timerPercentage = Math.min(100, Math.max(0, (timerSeconds / roundDurationSeconds) * 100));

  const rounds = [1, 2, 3] as const;

  const currentBlueRoundScore = blueScores[`round${currentRound}` as keyof typeof blueScores];
  const currentRedRoundScore = redScores[`round${currentRound}` as keyof typeof redScores];

  return (
    <main
      id="scoreboard-arena-display"
      className="relative min-h-screen bg-zinc-950 text-white flex flex-col justify-between p-3 sm:p-6 select-none overflow-x-hidden font-sans"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-0 w-1/3 h-96 bg-blue-900/15 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-0 right-0 w-1/3 h-96 bg-red-900/15 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

      {/* TOP NAVIGATION CONTROLS (KEMBALI & FULLSCREEN & OFFLINE BADGE) */}
      <div className="relative z-20 w-full max-w-7xl mx-auto flex items-center justify-between gap-3 mb-2 px-1">
        <button
          id="btn-scoreboard-kembali"
          onClick={() => setCurrentRole('LANDING')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 hover:text-white text-xs font-bold transition-all shadow-md group cursor-pointer"
          title="Kembali ke Beranda"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
          <span className="font-extrabold tracking-wide">KEMBALI KE BERANDA</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-[11px] font-bold text-emerald-400 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">100% OFFLINE REALTIME</span>
          </div>

          <button
            id="btn-scoreboard-fullscreen-top"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Keluar Fullscreen (ESC / F11)' : 'Layar Penuh TV Arena (F11 / Fullscreen)'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border shadow-sm ${
              isFullscreen
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-gradient-to-r from-blue-900/80 to-cyan-900/80 hover:from-blue-800 hover:to-cyan-800 border-cyan-500/50 text-cyan-200'
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>KELUAR FULLSCREEN</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>FULL SCREEN</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* TOP TOURNAMENT HEADER BAR */}
      <header
        id="scoreboard-top-header"
        className="relative z-10 w-full max-w-7xl mx-auto bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-3 sm:p-4 shadow-2xl backdrop-blur-md mb-4"
      >
        <div className="flex items-center justify-between gap-2 sm:gap-6">
          {/* Left IPSI Logo / Custom Left Logo & Gelanggang */}
          <div className="flex items-center gap-3">
            {matchInfo.logoLeft ? (
              <img
                src={matchInfo.logoLeft}
                alt="Logo Kiri"
                className="w-12 h-12 object-contain rounded-xl bg-zinc-950/60 p-1 border border-zinc-800"
              />
            ) : (
              <IpsiLogo size={52} />
            )}
            <div className="hidden sm:block">
              <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase">
                GELANGGANG PERTANDINGAN
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-wider">
                {matchInfo.arena}
              </h2>
            </div>
          </div>

          {/* Center Tournament & Class Info */}
          <div className="flex-1 text-center px-2">
            <h1 className="text-xs sm:text-sm md:text-base font-black tracking-widest text-amber-300 uppercase truncate">
              {matchInfo.tournamentName}
            </h1>
            <div className="inline-flex items-center gap-2 mt-1 px-4 py-1 rounded-full bg-zinc-950/80 border border-zinc-700/60 shadow-inner">
              <span className="text-xs sm:text-sm font-extrabold text-white uppercase font-display">
                {matchInfo.categoryClass}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-xs sm:text-sm font-extrabold text-amber-400 uppercase">
                {matchInfo.ageGroup} {matchInfo.gender}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-xs sm:text-sm font-black text-emerald-400 uppercase tracking-wider">
                {matchInfo.roundPhase}
              </span>
            </div>
          </div>

          {/* Right Partai & Persilat Logo / Custom Right Logo + Fullscreen Toggle */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[11px] font-black tracking-widest text-zinc-400 uppercase">
                NOMOR PERTANDINGAN
              </span>
              <h2 className="text-xl sm:text-2xl font-mono font-black text-amber-400">
                {matchInfo.partaiNumber}
              </h2>
            </div>
            {matchInfo.logoRight ? (
              <img
                src={matchInfo.logoRight}
                alt="Logo Kanan"
                className="w-12 h-12 object-contain rounded-xl bg-zinc-950/60 p-1 border border-zinc-800"
              />
            ) : (
              <PersilatLogo size={52} />
            )}
            <button
              id="btn-scoreboard-fullscreen"
              onClick={handleToggleFullscreen}
              title="Layar Penuh (F11 / Fullscreen)"
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors ml-1"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* GAP RULE EMERGENCY BANNER */}
      {gapRuleTriggered && (
        <div
          id="gap-rule-scoreboard-alert"
          className="relative z-20 w-full max-w-7xl mx-auto mb-4 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 p-1 rounded-2xl shadow-2xl animate-pulse"
        >
          <div className="bg-zinc-950/90 rounded-xl py-3 px-6 flex items-center justify-center gap-4 text-center">
            <Flame className="w-7 h-7 text-red-500 animate-bounce" />
            <div>
              <span className="text-xs font-black tracking-widest uppercase text-amber-400">
                ATURAN KEMENANGAN SELISIH ANGKA (GAP RULE AKTIF)
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider font-display">
                SELISIH POIN TELAK &gt;= 30 ANGKA — PERTANDINGAN DIHENTIKAN SEMENTARA
              </h3>
            </div>
            <Flame className="w-7 h-7 text-red-500 animate-bounce" />
          </div>
        </div>
      )}

      {/* MAIN SCOREBOARD SECTION: BLUE | CENTER TIMER & ROUND | RED */}
      <section
        id="scoreboard-main-grid"
        className="relative z-10 w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch mb-4"
      >
        {/* SUDUT BIRU (BLUE CORNER) CARD */}
        <div
          id="card-sudut-biru"
          className="lg:col-span-5 flex flex-col justify-between rounded-3xl p-5 sm:p-7 border-2 border-blue-500/80 bg-gradient-to-b from-blue-900/90 via-blue-950/90 to-zinc-950 shadow-2xl glow-blue relative overflow-hidden"
        >
          {/* Header Corner Badge & Athlete Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/60 border border-blue-400/80 text-blue-100 text-xs font-black tracking-widest uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-ping" />
                SUDUT BIRU / BLUE CORNER
              </div>
              <span className="text-xs font-bold text-blue-300/80">{matchInfo.blueAthlete.weightClass || '58.4 kg'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase font-display tracking-wide leading-tight line-clamp-2">
              {matchInfo.blueAthlete.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-3 py-0.5 rounded-md bg-blue-950/80 border border-blue-400/40 text-blue-300 font-bold text-xs uppercase tracking-wider">
                {matchInfo.blueAthlete.contingent}
              </span>
            </div>
          </div>

          {/* Massive Giant Score Display */}
          <div className="my-6 text-center">
            <div
              id="score-display-blue"
              className="font-digital font-black text-7xl sm:text-8xl lg:text-9xl text-blue-400 text-glow-blue tracking-tighter leading-none"
            >
              {blueTotalScore}
            </div>
            <span className="text-[11px] font-bold tracking-widest text-blue-300/70 uppercase">
              TOTAL POIN AKUMULASI
            </span>
          </div>

          {/* Real-time Penalty Badges for Blue */}
          <div className="bg-zinc-950/60 border border-blue-900/60 rounded-2xl p-3 mb-4">
            <div className="text-[10px] font-black text-blue-300 tracking-wider uppercase mb-2 flex items-center justify-between">
              <span>HUKUMAN & BINAAN (BABAK {currentRound})</span>
              <Shield className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
              {/* Binaan */}
              <div
                className={`py-1 rounded border font-bold ${
                  currentBlueRoundScore.binaan > 0
                    ? 'bg-amber-900/60 border-amber-500 text-amber-300'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
                }`}
                title="Binaan Wasit"
              >
                BIN {currentBlueRoundScore.binaan}
              </div>
              {/* Teguran 1 */}
              <div
                className={`py-1 rounded border font-bold ${
                  currentBlueRoundScore.teguran1
                    ? 'bg-red-900/80 border-red-500 text-red-300'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
                }`}
                title="Teguran 1 (-1 Poin)"
              >
                T1 (-1)
              </div>
              {/* Teguran 2 */}
              <div
                className={`py-1 rounded border font-bold ${
                  currentBlueRoundScore.teguran2
                    ? 'bg-red-900/80 border-red-500 text-red-300'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
                }`}
                title="Teguran 2 (-2 Poin)"
              >
                T2 (-2)
              </div>
              {/* Peringatan 1 */}
              <div
                className={`py-1 rounded border font-bold ${
                  currentBlueRoundScore.peringatan1
                    ? 'bg-red-600 border-red-300 text-white'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
                }`}
                title="Peringatan 1 (-5 Poin)"
              >
                P1 (-5)
              </div>
              {/* Keluar Gelanggang */}
              <div
                className={`py-1 rounded border font-bold ${
                  currentBlueRoundScore.keluarGelanggang > 0
                    ? 'bg-orange-900/80 border-orange-500 text-orange-300'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
                }`}
                title="Keluar Gelanggang (-1 tiap kejadian)"
              >
                KG: {currentBlueRoundScore.keluarGelanggang}
              </div>
            </div>
          </div>

          {/* 3-Juri Consensus Lamps for Blue Corner */}
          <div className="bg-blue-950/70 border border-blue-600/40 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-xs font-black tracking-wider text-blue-300 uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              LAMPU KONSENSUS JURI
            </span>
            <div className="flex items-center gap-3">
              {[1, 2, 3].map((judgeNum) => {
                const isLit = activeConsensusLamps.blue[judgeNum as 1 | 2 | 3];
                return (
                  <div key={judgeNum} className="flex flex-col items-center">
                    <div
                      id={`lamp-blue-juri-${judgeNum}`}
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs transition-all duration-150 ${
                        isLit
                          ? 'bg-blue-400 text-blue-950 ring-4 ring-blue-300/80 shadow-lg shadow-blue-400/80 scale-110'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {judgeNum}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-400 mt-1">J{judgeNum}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: TIMER, ACTIVE ROUND & STATUS */}
        <div
          id="scoreboard-center-column"
          className="lg:col-span-2 flex flex-col justify-between items-center gap-4 bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-md"
        >
          {/* Round Badge */}
          <div className="w-full flex flex-col items-center">
            <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-950 font-black text-sm sm:text-base tracking-widest uppercase font-display shadow-lg shadow-amber-500/20">
              BABAK {currentRound}
            </div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
              DARI 3 BABAK RESMI
            </span>
          </div>

          {/* Giant Digital Center Timer */}
          <div className="w-full text-center flex flex-col items-center justify-center my-auto">
            <div
              id="scoreboard-digital-timer"
              className={`font-digital font-black text-5xl sm:text-6xl md:text-7xl tracking-wider ${
                matchStatus === 'RUNNING'
                  ? 'text-amber-400 text-glow-gold'
                  : matchStatus === 'PAUSED'
                  ? 'text-red-500 text-glow-red'
                  : 'text-zinc-500'
              }`}
            >
              {formatTimer(timerSeconds)}
            </div>

            {/* Timer Progress Bar */}
            <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-800 mt-3 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  matchStatus === 'RUNNING' ? 'bg-amber-400' : 'bg-zinc-600'
                }`}
                style={{ width: `${timerPercentage}%` }}
              />
            </div>

            {/* Match Status Badge */}
            <div className="mt-3">
              {matchStatus === 'RUNNING' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500 text-emerald-400 text-xs font-black tracking-widest uppercase animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  BERLANGSUNG
                </span>
              )}
              {matchStatus === 'PAUSED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/90 border border-red-500 text-red-400 text-xs font-black tracking-widest uppercase">
                  <AlertCircle className="w-3.5 h-3.5" />
                  JEDA / TIME-OUT
                </span>
              )}
              {matchStatus === 'NOT_STARTED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold tracking-widest uppercase">
                  SIAP BERTANDING
                </span>
              )}
              {matchStatus === 'ROUND_FINISHED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500 text-amber-400 text-xs font-black tracking-widest uppercase">
                  BABAK SELESAI
                </span>
              )}
              {matchStatus === 'MATCH_FINISHED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/90 border border-purple-500 text-purple-300 text-xs font-black tracking-widest uppercase">
                  <Award className="w-3.5 h-3.5" />
                  PERTANDINGAN SELESAI
                </span>
              )}
            </div>
          </div>

          {/* Quick Round Indicators */}
          <div className="w-full flex items-center justify-center gap-2 border-t border-zinc-800 pt-3">
            {rounds.map((r) => (
              <div
                key={r}
                className={`flex-1 py-1 text-center rounded-lg text-xs font-black uppercase ${
                  currentRound === r
                    ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                    : currentRound > r
                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    : 'bg-zinc-950/50 text-zinc-600 border border-zinc-800/50'
                }`}
              >
                R{r}
              </div>
            ))}
          </div>
        </div>

        {/* SUDUT MERAH (RED CORNER) CARD */}
        <div
          id="card-sudut-merah"
          className="lg:col-span-5 flex flex-col justify-between rounded-3xl p-5 sm:p-7 border-2 border-red-500/80 bg-gradient-to-b from-red-900/90 via-red-950/90 to-zinc-950 shadow-2xl glow-red relative overflow-hidden"
        >
          {/* Header Corner Badge & Athlete Name */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-red-300/80">{matchInfo.redAthlete.weightClass || '59.1 kg'}</span>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/60 border border-red-400/80 text-red-100 text-xs font-black tracking-widest uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-red-300 animate-ping" />
                SUDUT MERAH / RED CORNER
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase font-display tracking-wide leading-tight line-clamp-2 text-right">
              {matchInfo.redAthlete.name}
            </h2>
            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="px-3 py-0.5 rounded-md bg-red-950/80 border border-red-400/40 text-red-300 font-bold text-xs uppercase tracking-wider">
                {matchInfo.redAthlete.contingent}
              </span>
            </div>
          </div>

          {/* Massive Giant Score Display */}
          <div className="my-6 text-center">
            <div
              id="score-display-red"
              className="font-digital font-black text-7xl sm:text-8xl lg:text-9xl text-red-400 text-glow-red tracking-tighter leading-none"
            >
              {redTotalScore}
            </div>
            <span className="text-[11px] font-bold tracking-widest text-red-300/70 uppercase">
              TOTAL POIN AKUMULASI
            </span>
          </div>

          {/* Real-time Penalty Badges for Red */}
          <div className="bg-zinc-950/60 border border-red-900/60 rounded-2xl p-3 mb-4">
            <div className="text-[10px] font-black text-red-300 tracking-wider uppercase mb-2 flex items-center justify-between">
              <span>HUKUMAN & BINAAN (BABAK {currentRound})</span>
              <Shield className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
              {/* Binaan */}
              <div
                className={`py-1 rounded border font-bold ${
                  currentRedRoundScore.binaan > 0
                    ? 'bg-amber-900/60 border-amber-500 text-amber-300'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
                }`}
                title="Binaan Wasit"
              >
                BIN {currentRedRoundScore.binaan}
              </div>
              {/* Teguran 1 */}
              <div
                className={`py-1 rounded border font-bold ${
                  currentRedRoundScore.teguran1
                    ? 'bg-red-900/80 border-red-500 text-red-300'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
                }`}
                title="Teguran 1 (-1 Poin)"
              >
                T1 (-1)
              </div>
              {/* Teguran 2 */}
              <div
                className={`py-1 rounded border font-bold ${
                  currentRedRoundScore.teguran2
                    ? 'bg-red-900/80 border-red-500 text-red-300'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
                }`}
                title="Teguran 2 (-2 Poin)"
              >
                T2 (-2)
              </div>
              {/* Peringatan 1 */}
              <div
                className={`py-1 rounded border font-bold ${
                  currentRedRoundScore.peringatan1
                    ? 'bg-red-600 border-red-300 text-white'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
                }`}
                title="Peringatan 1 (-5 Poin)"
              >
                P1 (-5)
              </div>
              {/* Keluar Gelanggang */}
              <div
                className={`py-1 rounded border font-bold ${
                  currentRedRoundScore.keluarGelanggang > 0
                    ? 'bg-orange-900/80 border-orange-500 text-orange-300'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
                }`}
                title="Keluar Gelanggang (-1 tiap kejadian)"
              >
                KG: {currentRedRoundScore.keluarGelanggang}
              </div>
            </div>
          </div>

          {/* 3-Juri Consensus Lamps for Red Corner */}
          <div className="bg-red-950/70 border border-red-600/40 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {[1, 2, 3].map((judgeNum) => {
                const isLit = activeConsensusLamps.red[judgeNum as 1 | 2 | 3];
                return (
                  <div key={judgeNum} className="flex flex-col items-center">
                    <div
                      id={`lamp-red-juri-${judgeNum}`}
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs transition-all duration-150 ${
                        isLit
                          ? 'bg-red-400 text-red-950 ring-4 ring-red-300/80 shadow-lg shadow-red-400/80 scale-110'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      }`}
                    >
                      {judgeNum}
                    </div>
                    <span className="text-[9px] font-bold text-zinc-400 mt-1">J{judgeNum}</span>
                  </div>
                );
              })}
            </div>
            <span className="text-xs font-black tracking-wider text-red-300 uppercase flex items-center gap-1.5">
              LAMPU KONSENSUS JURI
              <Zap className="w-3.5 h-3.5 text-red-400" />
            </span>
          </div>
        </div>
      </section>

      {/* BOTTOM SCORE MATRIX BREAKDOWN TABLE (BABAK 1, 2, 3 PEROLEHAN DETAIL) */}
      <footer
        id="scoreboard-breakdown-matrix"
        className="relative z-10 w-full max-w-7xl mx-auto bg-zinc-900/95 border border-zinc-800 rounded-2xl p-3 sm:p-5 shadow-2xl backdrop-blur-md"
      >
        <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-black tracking-wider text-amber-400 uppercase">
            <Activity className="w-4 h-4 text-amber-400" />
            RINCIAN PEROLEHAN NILAI RESMI PER BABAK (PERSILAT STANDARD MATRIX)
          </div>
          <span className="text-[11px] text-zinc-400">
            Pukulan: +1 | Tendangan: +2 | Jatuhan: +3 | Hukuman: Minus Nilai
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rounds.map((rnd) => {
            const bScore = blueScores[`round${rnd}` as keyof typeof blueScores];
            const rScore = redScores[`round${rnd}` as keyof typeof redScores];
            const bBreakdown = calculateRoundScore(bScore);
            const rBreakdown = calculateRoundScore(rScore);
            const isCurrent = currentRound === rnd;

            return (
              <div
                key={rnd}
                className={`rounded-xl p-3 border transition-all ${
                  isCurrent
                    ? 'bg-zinc-950 border-amber-500/80 ring-1 ring-amber-500/50 shadow-lg'
                    : 'bg-zinc-950/60 border-zinc-800'
                }`}
              >
                {/* Round Header */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-black tracking-wider uppercase ${
                      isCurrent ? 'text-amber-400' : 'text-zinc-400'
                    }`}
                  >
                    BABAK {rnd} {isCurrent && '(AKTIF)'}
                  </span>
                  <div className="flex items-center gap-2 text-xs font-digital font-bold">
                    <span className="text-blue-400">{bBreakdown.totalSubtotal}</span>
                    <span className="text-zinc-600">:</span>
                    <span className="text-red-400">{rBreakdown.totalSubtotal}</span>
                  </div>
                </div>

                {/* Score items table */}
                <div className="space-y-1 text-xs">
                  {/* Pukulan */}
                  <div className="flex items-center justify-between text-zinc-400 py-0.5 border-b border-zinc-900">
                    <span className="text-blue-400 font-mono font-bold w-12 text-left">
                      {bScore.pukulan} ({bBreakdown.pukulanPts})
                    </span>
                    <span className="text-zinc-400 text-[11px] uppercase">Pukulan (+1)</span>
                    <span className="text-red-400 font-mono font-bold w-12 text-right">
                      {rScore.pukulan} ({rBreakdown.pukulanPts})
                    </span>
                  </div>

                  {/* Tendangan */}
                  <div className="flex items-center justify-between text-zinc-400 py-0.5 border-b border-zinc-900">
                    <span className="text-blue-400 font-mono font-bold w-12 text-left">
                      {bScore.tendangan} ({bBreakdown.tendanganPts})
                    </span>
                    <span className="text-zinc-400 text-[11px] uppercase">Tendangan (+2)</span>
                    <span className="text-red-400 font-mono font-bold w-12 text-right">
                      {rScore.tendangan} ({rBreakdown.tendanganPts})
                    </span>
                  </div>

                  {/* Jatuhan */}
                  <div className="flex items-center justify-between text-zinc-400 py-0.5 border-b border-zinc-900">
                    <span className="text-blue-400 font-mono font-bold w-12 text-left">
                      {bScore.jatuhan} ({bBreakdown.jatuhanPts})
                    </span>
                    <span className="text-zinc-400 text-[11px] uppercase font-semibold">Jatuhan (+3)</span>
                    <span className="text-red-400 font-mono font-bold w-12 text-right">
                      {rScore.jatuhan} ({rBreakdown.jatuhanPts})
                    </span>
                  </div>

                  {/* Hukuman */}
                  <div className="flex items-center justify-between text-zinc-400 py-0.5 border-b border-zinc-900">
                    <span className="text-red-300 font-mono font-bold w-12 text-left">
                      -{bBreakdown.penaltiesPts}
                    </span>
                    <span className="text-zinc-500 text-[11px] uppercase">Hukuman</span>
                    <span className="text-red-300 font-mono font-bold w-12 text-right">
                      -{rBreakdown.penaltiesPts}
                    </span>
                  </div>

                  {/* Subtotal */}
                  <div className="flex items-center justify-between pt-1 font-bold">
                    <span className="text-blue-400 font-mono font-black text-sm w-12 text-left">
                      {bBreakdown.totalSubtotal}
                    </span>
                    <span className="text-amber-400 text-[11px] uppercase font-black">SUBTOTAL R{rnd}</span>
                    <span className="text-red-400 font-mono font-black text-sm w-12 text-right">
                      {rBreakdown.totalSubtotal}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </footer>

      {/* OVERLAYS & MODALS */}
      <VarOverlay />
      <VictoryModal />
    </main>
  );
};
