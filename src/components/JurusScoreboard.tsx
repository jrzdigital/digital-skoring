import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Award, 
  AlertTriangle, 
  Sparkles, 
  ChevronRight, 
  Check, 
  Calculator, 
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import { JurusMatchState, JurusSubCategory, JurusJudgeScore } from '../types/scoring';
import { JURUS_BAKU_TUNGGAL, JURUS_GANDA_INFO, JURUS_REGU_INFO, JURUS_SOLO_KREATIF_INFO } from '../data/jurusBaku';
import { soundManager } from '../utils/audio';

interface JurusScoreboardProps {
  jurusState: JurusMatchState;
  onUpdateJurusState: (newState: JurusMatchState) => void;
}

export const JurusScoreboard: React.FC<JurusScoreboardProps> = ({
  jurusState,
  onUpdateJurusState,
}) => {
  const [selectedJudgeTab, setSelectedJudgeTab] = useState<number>(1);

  // Timer loop
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (jurusState.isTimerRunning) {
      interval = setInterval(() => {
        const nextElapsed = jurusState.elapsedSeconds + 1;
        // Calculate auto time penalty if standard 180s
        let autoTimePenalty = 0;
        const target = jurusState.targetDurationSeconds;
        const diff = Math.abs(nextElapsed - target);
        
        if (nextElapsed > target || (jurusState.isFinished && diff > 0)) {
          if (diff >= 1 && diff <= 5) autoTimePenalty = 0.05;
          else if (diff >= 6 && diff <= 10) autoTimePenalty = 0.10;
          else if (diff >= 11 && diff <= 15) autoTimePenalty = 0.15;
          else if (diff > 15) autoTimePenalty = 0.20;
        }

        const updated = {
          ...jurusState,
          elapsedSeconds: nextElapsed,
          timePenalty: autoTimePenalty,
        };
        const calculated = recalculateFinalScore(updated);
        onUpdateJurusState(calculated);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jurusState.isTimerRunning, jurusState.elapsedSeconds, jurusState.isFinished]);

  // Recalculate Final Score using IPSI 2026 / PERSILAT standard:
  // 5 judges -> drop lowest and highest, average the 3 middle, then minus all penalties
  const recalculateFinalScore = (state: JurusMatchState): JurusMatchState => {
    const totalPenalties = 
      state.timePenalty + 
      state.senjataJatuhPenalty + 
      state.keluarGelanggangPenalty + 
      state.pakaianPenalty;

    const judgeTotals = state.judges.map(j => {
      const jTotal = Math.max(0, j.kebenaran + j.kemantapan);
      return { ...j, total: Number(jTotal.toFixed(3)) };
    });

    const sortedScores = judgeTotals.map(j => j.total).sort((a, b) => a - b);
    
    // Drop lowest (index 0) and highest (index 4) if 5 judges
    let medianSum = 0;
    let countedJudges = 0;

    if (sortedScores.length >= 5) {
      const middleScores = sortedScores.slice(1, -1); // indexes 1, 2, 3
      medianSum = middleScores.reduce((acc, v) => acc + v, 0);
      countedJudges = middleScores.length;
    } else {
      medianSum = sortedScores.reduce((acc, v) => acc + v, 0);
      countedJudges = sortedScores.length || 1;
    }

    const rawAverage = medianSum / countedJudges;
    const finalScore = Math.max(0, Number((rawAverage - totalPenalties).toFixed(3)));

    return {
      ...state,
      judges: judgeTotals,
      finalScore,
      medianScore: Number(rawAverage.toFixed(3)),
    };
  };

  const handleToggleTimer = () => {
    if (!jurusState.isTimerRunning) {
      soundManager.playGong();
    } else {
      soundManager.playWhistle();
    }
    const updated = {
      ...jurusState,
      isTimerRunning: !jurusState.isTimerRunning,
    };
    onUpdateJurusState(recalculateFinalScore(updated));
  };

  const handleResetTimer = () => {
    const updated = {
      ...jurusState,
      elapsedSeconds: 0,
      isTimerRunning: false,
      timePenalty: 0,
    };
    onUpdateJurusState(recalculateFinalScore(updated));
  };

  // Add mistake click for active judge (-0.01)
  const handleAddMistake = (judgeId: number) => {
    soundManager.playPenalty();
    const updatedJudges = jurusState.judges.map(j => {
      if (j.judgeId === judgeId) {
        const nextMistakes = j.kesalahanCount + 1;
        const nextKebenaran = Math.max(0, Number((9.90 - (nextMistakes * 0.01)).toFixed(2)));
        return {
          ...j,
          kesalahanCount: nextMistakes,
          kebenaran: nextKebenaran,
        };
      }
      return j;
    });

    const updated = {
      ...jurusState,
      judges: updatedJudges,
    };
    onUpdateJurusState(recalculateFinalScore(updated));
  };

  const handleUndoMistake = (judgeId: number) => {
    const updatedJudges = jurusState.judges.map(j => {
      if (j.judgeId === judgeId && j.kesalahanCount > 0) {
        const nextMistakes = j.kesalahanCount - 1;
        const nextKebenaran = Number((9.90 - (nextMistakes * 0.01)).toFixed(2));
        return {
          ...j,
          kesalahanCount: nextMistakes,
          kebenaran: nextKebenaran,
        };
      }
      return j;
    });

    const updated = {
      ...jurusState,
      judges: updatedJudges,
    };
    onUpdateJurusState(recalculateFinalScore(updated));
  };

  const handleKemantapanChange = (judgeId: number, value: number) => {
    const updatedJudges = jurusState.judges.map(j => {
      if (j.judgeId === judgeId) {
        return {
          ...j,
          kemantapan: Number(value.toFixed(2)),
        };
      }
      return j;
    });

    const updated = {
      ...jurusState,
      judges: updatedJudges,
    };
    onUpdateJurusState(recalculateFinalScore(updated));
  };

  // Automated 5-judge score simulator (Fitur Otomatis Nilai Juri Seni)
  const handleAutoGenerateJudgeScores = () => {
    soundManager.playGong();
    // Simulate 5 realistic scores around 9.85 - 9.94
    const baseKebenaranRange = [9.88, 9.89, 9.90, 9.87, 9.89];
    const kemantapanRange = [0.03, 0.04, 0.03, 0.04, 0.02];

    const updatedJudges = jurusState.judges.map((j, idx) => {
      const baseKeb = baseKebenaranRange[idx] ?? 9.89;
      const mistakes = Math.round((9.90 - baseKeb) / 0.01);
      const keman = kemantapanRange[idx] ?? 0.03;
      return {
        ...j,
        kesalahanCount: mistakes,
        kebenaran: baseKeb,
        kemantapan: keman,
        total: Number((baseKeb + keman).toFixed(3)),
      };
    });

    const updated = {
      ...jurusState,
      judges: updatedJudges,
      isFinished: true,
    };
    onUpdateJurusState(recalculateFinalScore(updated));
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentCategoryInfo = 
    jurusState.subCategory === 'tunggal' ? JURUS_BAKU_TUNGGAL :
    jurusState.subCategory === 'ganda' ? JURUS_GANDA_INFO :
    jurusState.subCategory === 'regu' ? JURUS_REGU_INFO : JURUS_SOLO_KREATIF_INFO;

  const currentActiveJudge = jurusState.judges.find(j => j.judgeId === selectedJudgeTab) || jurusState.judges[0];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-4 md:p-6 text-slate-100">
      {/* Category & Competitor Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                {jurusState.arena} • {jurusState.matchNumber}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Kategori {jurusState.subCategory.toUpperCase()} IPSI 2026
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {jurusState.competitor.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Kontingen: <span className="text-slate-200 font-semibold">{jurusState.competitor.contingent}</span>
              <span className="mx-2 text-slate-600">/</span>
              {currentCategoryInfo.name}
            </p>
          </div>

          {/* Subcategory switcher */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start md:self-auto">
            {(['tunggal', 'ganda', 'regu', 'solo_kreatif'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  const updated = {
                    ...jurusState,
                    subCategory: cat,
                  };
                  onUpdateJurusState(recalculateFinalScore(updated));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                  jurusState.subCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Big Metrics Grid: Timer & Official Final Score */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          {/* Main Official Final Score */}
          <div className="md:col-span-2 bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                SKOR AKHIR RESMI IPSI / PERSILAT
              </span>
              <div className="text-5xl font-black font-mono tracking-tight text-white mt-1 tabular-nums">
                {jurusState.finalScore.toFixed(3)}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">
                Rata-rata 3 Juri Median: <span className="text-slate-200 font-mono">{jurusState.medianScore.toFixed(3)}</span>
                {' · '}Total Hukuman: <span className="text-red-400 font-mono">
                  -{(jurusState.timePenalty + jurusState.senjataJatuhPenalty + jurusState.keluarGelanggangPenalty + jurusState.pakaianPenalty).toFixed(2)}
                </span>
              </span>
            </div>
            <Award className="w-16 h-16 text-amber-400/50" />
          </div>

          {/* Stopwatch Timer */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 uppercase">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Waktu Tampil
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Target: {formatTimer(jurusState.targetDurationSeconds)}
              </span>
            </div>
            
            <div className={`text-4xl font-extrabold font-mono tracking-wider my-2 tabular-nums ${
              jurusState.isTimerRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-100'
            }`}>
              {formatTimer(jurusState.elapsedSeconds)}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleTimer}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  jurusState.isTimerRunning
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {jurusState.isTimerRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Jeda
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Mulai Waktu
                  </>
                )}
              </button>
              <button
                onClick={handleResetTimer}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                title="Reset Stopwatch"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Time Penalty Status */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">
              Pengurangan Waktu Otomatis
            </span>
            <div className="my-2">
              <span className={`text-3xl font-extrabold font-mono tabular-nums ${
                jurusState.timePenalty > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                -{jurusState.timePenalty.toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                {jurusState.timePenalty === 0 ? 'Waktu Sesuai Toleransi' : 'Deviasi Waktu Terdeteksi'}
              </span>
            </div>
            <button
              onClick={handleAutoGenerateJudgeScores}
              className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-amber-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Simulasi Nilai 5 Juri
            </button>
          </div>
        </div>
      </div>

      {/* 5 Judges Matrix Overview Table (IPSI Official System) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Matriks Penilaian 5 Dewan Juri (Sistem Median IPSI 2026)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Nilai Tertinggi & Terendah dicoret otomatis
          </span>
        </div>

        {/* Responsive Judge Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 rounded-l-lg">Dewan Juri</th>
                <th className="py-3 px-4">Kebenaran (Maks 9.90)</th>
                <th className="py-3 px-4">Salah Gerak (-0.01)</th>
                <th className="py-3 px-4">Kemantapan (0.01 - 0.10)</th>
                <th className="py-3 px-4">Total Juri</th>
                <th className="py-3 px-4 text-right rounded-r-lg">Status Eliminasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-xs">
              {(() => {
                const sorted = [...jurusState.judges].map(j => j.total).sort((a, b) => a - b);
                const minVal = sorted[0];
                const maxVal = sorted[sorted.length - 1];

                return jurusState.judges.map((j) => {
                  const isMin = j.total === minVal;
                  const isMax = j.total === maxVal;
                  const isDropped = (isMin || isMax) && jurusState.judges.length >= 5;

                  return (
                    <tr 
                      key={j.judgeId}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        selectedJudgeTab === j.judgeId ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-sans font-bold text-slate-200">
                        {j.judgeName}
                      </td>
                      <td className="py-3 px-4 text-emerald-400">
                        {j.kebenaran.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-red-400">
                        {j.kesalahanCount}x (-{(j.kesalahanCount * 0.01).toFixed(2)})
                      </td>
                      <td className="py-3 px-4 text-amber-400">
                        +{j.kemantapan.toFixed(2)}
                      </td>
                      <td className={`py-3 px-4 font-bold text-base ${isDropped ? 'line-through text-slate-500' : 'text-white'}`}>
                        {j.total.toFixed(3)}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        {isDropped ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/40">
                            {isMax ? 'Dicoret (Tertinggi)' : 'Dicoret (Terendah)'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                            Dihitung Rata-rata
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Scoring Input for Selected Judge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Judge Input Keypad (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">
                Input Penjurian Gerak ({currentActiveJudge.judgeName})
              </h3>
              <p className="text-xs text-slate-400">
                Pilih juri di bawah untuk memasukkan pengurangan kebenaran dan nilai kemantapan
              </p>
            </div>

            {/* Judge Switcher Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {jurusState.judges.map((j) => (
                <button
                  key={j.judgeId}
                  onClick={() => setSelectedJudgeTab(j.judgeId)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedJudgeTab === j.judgeId
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Juri {j.judgeId}
                </button>
              ))}
            </div>
          </div>

          {/* Kebenaran Gerak Clicker */}
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase block">
                  Nilai Kebenaran Gerak Baku (Maks 9.90)
                </span>
                <span className="text-xs text-slate-500">
                  Setiap kesalahan gerak, arah, atau urutan dikurangi 0.01
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black font-mono text-emerald-400 tabular-nums">
                  {currentActiveJudge.kebenaran.toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  ({currentActiveJudge.kesalahanCount} kesalahan terdaftar)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleAddMistake(currentActiveJudge.judgeId)}
                className="py-3 px-4 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 border border-red-400/40"
              >
                <AlertTriangle className="w-4 h-4" />
                Catat Salah Gerak (-0.01)
              </button>
              <button
                onClick={() => handleUndoMistake(currentActiveJudge.judgeId)}
                disabled={currentActiveJudge.kesalahanCount === 0}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-slate-200 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                Batal Salah Gerak (+0.01)
              </button>
            </div>
          </div>

          {/* Kemantapan / Soul / Harmony Slider */}
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase block">
                  Nilai Kemantapan, Power & Harmoni (Rentang: 0.01 - 0.10)
                </span>
                <span className="text-xs text-slate-500">
                  Penghayatan jurus, kelenturan, tenaga, dan kekompakan
                </span>
              </div>
              <span className="text-2xl font-black font-mono text-amber-400 tabular-nums">
                +{currentActiveJudge.kemantapan.toFixed(2)}
              </span>
            </div>

            <input
              type="range"
              min="0.01"
              max="0.10"
              step="0.01"
              value={currentActiveJudge.kemantapan}
              onChange={(e) => handleKemantapanChange(currentActiveJudge.judgeId, parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>0.01 (Cukup)</span>
              <span>0.05 (Baik)</span>
              <span>0.10 (Istimewa)</span>
            </div>
          </div>
        </div>

        {/* Deductions & External Penalties (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">
              Hukuman Non-Gerak IPSI
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Pengurangan nilai di luar kesalahan gerak
            </p>

            <div className="space-y-3">
              {/* Senjata Jatuh */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Senjata Jatuh (-0.10)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Golok atau toya terlepas dari genggaman
                  </span>
                </div>
                <button
                  onClick={() => {
                    soundManager.playPenalty();
                    const nextVal = jurusState.senjataJatuhPenalty === 0 ? 0.10 : 0;
                    const updated = { ...jurusState, senjataJatuhPenalty: nextVal };
                    onUpdateJurusState(recalculateFinalScore(updated));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    jurusState.senjataJatuhPenalty > 0
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {jurusState.senjataJatuhPenalty > 0 ? '-0.10 Aktif' : 'Terapkan'}
                </button>
              </div>

              {/* Keluar Garis Gelanggang */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Keluar Gelanggang (-0.05)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Kaki keluar area 10x10 meter
                  </span>
                </div>
                <button
                  onClick={() => {
                    soundManager.playPenalty();
                    const nextVal = jurusState.keluarGelanggangPenalty === 0 ? 0.05 : 0;
                    const updated = { ...jurusState, keluarGelanggangPenalty: nextVal };
                    onUpdateJurusState(recalculateFinalScore(updated));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    jurusState.keluarGelanggangPenalty > 0
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {jurusState.keluarGelanggangPenalty > 0 ? '-0.05 Aktif' : 'Terapkan'}
                </button>
              </div>

              {/* Pakaian / Aksesori Jatuh */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Pakaian / Aksesoris Terlepas (-0.05)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Sampur, ikatan kepala atau sabuk terlepas
                  </span>
                </div>
                <button
                  onClick={() => {
                    soundManager.playPenalty();
                    const nextVal = jurusState.pakaianPenalty === 0 ? 0.05 : 0;
                    const updated = { ...jurusState, pakaianPenalty: nextVal };
                    onUpdateJurusState(recalculateFinalScore(updated));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    jurusState.pakaianPenalty > 0
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {jurusState.pakaianPenalty > 0 ? '-0.05 Aktif' : 'Terapkan'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
            💡 <strong className="text-amber-300">Aturan IPSI 2026:</strong> Toleransi waktu adalah tepat 3 menit. Setiap selisih per 5 detik mengurangi 0.05 poin secara otomatis.
          </div>
        </div>
      </div>
    </div>
  );
};
