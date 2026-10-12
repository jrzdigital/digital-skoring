import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Award, 
  Play, 
  Pause, 
  RotateCcw, 
  Tv, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  Send, 
  Users, 
  ShieldAlert, 
  Maximize2, 
  ChevronRight,
  Sparkles,
  Flame,
  ArrowLeft,
  Crown,
  LayoutDashboard
} from "lucide-react";
import { SeniPerformanceState, SeniCategory, SeniJuryScore, SeniPenalties } from "../../types/portal";
import { sound } from "../../utils/sound";
import { saveMatchStateToFirebase } from "../../services/firebase";
import { FullScreenOverlay } from "../FullScreenOverlay";
import { SeniLandingView } from "./SeniLandingView";

export type SeniMode = "LANDING" | "DEWAN" | "JURY" | "MONITOR";

interface SkoringSeniPageProps {
  selectedArena: string;
  defaultMonitorMode?: boolean;
  onModeChange?: (mode: SeniMode) => void;
  onBackToHome?: () => void;
}

export function SkoringSeniPage({ 
  selectedArena, 
  defaultMonitorMode = false, 
  onModeChange,
  onBackToHome
}: SkoringSeniPageProps) {
  // Current performance state
  const [performance, setPerformance] = useState<SeniPerformanceState>(() => {
    const saved = localStorage.getItem("jrz_portal_seni_state");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      id: "seni-" + Date.now(),
      matchNumber: "Partai Seni 01",
      pool: "Pool A",
      arena: selectedArena,
      category: "TUNGGAL",
      ageDivision: "DEWASA",
      gender: "PUTRA",
      athleteName: "ARYA KUSUMA WIJAYA",
      contingent: "KONTINGEN JAWA BARAT",
      targetDurationSeconds: 180, // 3 mins standard
      elapsedSeconds: 0,
      timerStatus: "IDLE",
      juryScores: {
        1: { juryId: 1, kebenaranScore: 9.85, kemantapanScore: 0.12, totalScore: 9.97, confirmed: true },
        2: { juryId: 2, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
        3: { juryId: 3, kebenaranScore: 9.82, kemantapanScore: 0.14, totalScore: 9.96, confirmed: true },
        4: { juryId: 4, kebenaranScore: 9.88, kemantapanScore: 0.15, totalScore: 10.03, confirmed: true },
        5: { juryId: 5, kebenaranScore: 9.81, kemantapanScore: 0.11, totalScore: 9.92, confirmed: true }
      },
      penalties: {
        boundaryViolationCount: 0,
        costumeViolation: false,
        weaponDropViolation: false,
        timeDeviationSeconds: 0,
        manualDeduction: 0,
        totalPenaltyDeduction: 0
      },
      medianScore: 9.95,
      finalScore: 9.95,
      status: "IDLE" as any
    };
  });

  const [activeJuryTab, setActiveJuryTab] = useState<number>(1);
  const [seniMode, setSeniMode] = useState<SeniMode>(() => defaultMonitorMode ? "MONITOR" : "LANDING");
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (defaultMonitorMode) {
      setSeniMode("MONITOR");
    }
  }, [defaultMonitorMode]);

  useEffect(() => {
    if (onModeChange) {
      onModeChange(seniMode);
    }
  }, [seniMode, onModeChange]);

  // Listen to cross-window / cross-device updates for realtime monitor
  useEffect(() => {
    const reloadFromStorage = () => {
      try {
        const saved = localStorage.getItem("jrz_portal_seni_state");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id) {
            setPerformance(parsed);
          }
        }
      } catch (err) {}
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "jrz_portal_seni_state" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.id) {
            setPerformance(parsed);
          }
        } catch (err) {}
      }
    };

    const handleCustomSeniUpdate = (e: any) => {
      if (e.detail) {
        setPerformance(e.detail);
      } else {
        reloadFromStorage();
      }
    };

    // Initial check on mount
    reloadFromStorage();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("jrz_portal_seni_updated", handleCustomSeniUpdate);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("jrz_portal_seni_updated", handleCustomSeniUpdate);
    };
  }, []);

  // Autosave to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("jrz_portal_seni_state", JSON.stringify(performance));
    } catch (e) { /* ignore */ }
  }, [performance]);

  // Performance Timer Engine
  useEffect(() => {
    let interval: any = null;
    if (performance.timerStatus === "RUNNING") {
      interval = setInterval(() => {
        setPerformance((prev) => {
          const nextSec = prev.elapsedSeconds + 1;
          
          // Sound chime at 2:50 (170s) & 3:00 (180s)
          if (nextSec === 170) {
            sound.playBell();
          } else if (nextSec === 180) {
            sound.playGong();
          }

          // Calculate time deviation penalty if over target
          let timeDeviationSec = 0;
          if (nextSec < 175) {
            timeDeviationSec = 175 - nextSec;
          } else if (nextSec > 185) {
            timeDeviationSec = nextSec - 185;
          }

          return {
            ...prev,
            elapsedSeconds: nextSec,
            penalties: {
              ...prev.penalties,
              timeDeviationSeconds: timeDeviationSec
            }
          };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [performance.timerStatus]);

  // Recalculate Median & Final Scores
  const calculateFinalScores = (scores: { [juryId: number]: SeniJuryScore }, pen: SeniPenalties) => {
    const rawScores = Object.values(scores).map(s => s.totalScore);
    if (rawScores.length === 0) return { median: 0, final: 0 };

    // IPSI Rule: Sort and drop highest & lowest, average middle 3
    const sorted = [...rawScores].sort((a, b) => a - b);
    let validMedian = sorted[0];
    if (sorted.length >= 5) {
      const middleScores = sorted.slice(1, 4); // Drop min (index 0) and max (index 4)
      const sum = middleScores.reduce((acc, curr) => acc + curr, 0);
      validMedian = parseFloat((sum / 3).toFixed(3));
    } else {
      const sum = sorted.reduce((acc, curr) => acc + curr, 0);
      validMedian = parseFloat((sum / sorted.length).toFixed(3));
    }

    // Penalties deduction calculation:
    // Boundary: 0.05 per violation
    // Costume: 0.05
    // Weapon drop: 0.50
    // Time deviation: 0.05 per 5 sec
    const boundaryDed = pen.boundaryViolationCount * 0.05;
    const costumeDed = pen.costumeViolation ? 0.05 : 0;
    const weaponDed = pen.weaponDropViolation ? 0.50 : 0;
    const timeDed = Math.floor(pen.timeDeviationSeconds / 5) * 0.05;
    const totalDed = parseFloat((boundaryDed + costumeDed + weaponDed + timeDed + pen.manualDeduction).toFixed(3));
    
    const finalScore = parseFloat((validMedian - totalDed).toFixed(3));
    return { median: validMedian, totalPenalty: totalDed, final: finalScore };
  };

  // Timer Handlers
  const handleToggleTimer = () => {
    sound.playClick();
    if (performance.timerStatus === "RUNNING") {
      setPerformance(prev => ({ ...prev, timerStatus: "PAUSED" }));
    } else {
      setPerformance(prev => ({ ...prev, timerStatus: "RUNNING" }));
    }
  };

  const handleResetTimer = () => {
    sound.playClick();
    setPerformance(prev => ({
      ...prev,
      elapsedSeconds: 0,
      timerStatus: "IDLE",
      penalties: { ...prev.penalties, timeDeviationSeconds: 0 }
    }));
  };

  // Update a Jury's Score
  const handleUpdateJuryScore = (juryId: number, kebenaran: number, kemantapan: number) => {
    sound.playClick();
    const total = parseFloat((kebenaran + kemantapan).toFixed(3));
    const nextJuryScores = {
      ...performance.juryScores,
      [juryId]: {
        juryId,
        kebenaranScore: kebenaran,
        kemantapanScore: kemantapan,
        totalScore: total,
        confirmed: true
      }
    };
    const { median, totalPenalty, final } = calculateFinalScores(nextJuryScores, performance.penalties);
    
    setPerformance(prev => ({
      ...prev,
      juryScores: nextJuryScores,
      medianScore: median,
      penalties: { ...prev.penalties, totalPenaltyDeduction: totalPenalty },
      finalScore: final
    }));
  };

  // Update Penalties
  const handlePenaltyChange = (key: keyof SeniPenalties, value: any) => {
    sound.playClick();
    const nextPen = { ...performance.penalties, [key]: value };
    const { median, totalPenalty, final } = calculateFinalScores(performance.juryScores, nextPen);
    setPerformance(prev => ({
      ...prev,
      penalties: { ...nextPen, totalPenaltyDeduction: totalPenalty },
      medianScore: median,
      finalScore: final
    }));
  };

  // Format mm:ss
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Save to Firebase RTDB
  const handleSaveToFirebase = async () => {
    sound.playClick();
    try {
      await saveMatchStateToFirebase({
        ...performance,
        arena: selectedArena,
        eventName: "SENI IPSI " + performance.category,
        classCategory: performance.category + " " + performance.ageDivision,
        matchNumber: performance.matchNumber,
        scoreRed: performance.finalScore,
        scoreBlue: 0,
        status: performance.timerStatus as any
      } as any, selectedArena);
      setNotification("Nilai Seni Berhasil Disinkronkan ke Firebase RTDB!");
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      alert("Gagal sinkronisasi Firebase: " + String(err));
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#070d1e] text-slate-100 p-3 sm:p-6 space-y-6 animate-fadeIn">
      
      {/* TOAST NOTIFICATION */}
      {notification && (
        <div className="bg-emerald-950 border border-emerald-500 text-emerald-300 p-3 rounded-xl text-xs font-mono font-bold flex items-center justify-between shadow-xl animate-fadeIn">
          <span>{notification}</span>
        </div>
      )}

      {/* VIEW 1: LANDING PAGE DIGITAL SKORING SENI */}
      {seniMode === "LANDING" && (
        <>
          <FullScreenOverlay 
            onBack={() => {
              sound.playClick();
              if (onBackToHome) onBackToHome();
              else window.dispatchEvent(new CustomEvent("jrz_navigate_tab", { detail: "BERANDA" }));
            }} 
            showBack={true}
            backTitle="Kembali ke Beranda JRZ SCORE"
            backLabel="BERANDA"
          />
          <SeniLandingView
            selectedArena={selectedArena}
            performance={performance}
            onSelectRole={(role) => {
              if (role === "JURY") {
                setActiveJuryTab(1);
              }
              setSeniMode(role);
            }}
            onSaveToFirebase={handleSaveToFirebase}
            onBackToHome={onBackToHome}
          />
        </>
      )}

      {/* VIEW 2 & 3: OPERATOR / JURY / MONITOR VIEWS */}
      {seniMode !== "LANDING" && (
        <>
          <FullScreenOverlay 
            onBack={
              defaultMonitorMode
                ? () => {
                    sound.playClick();
                    if (onBackToHome) {
                      onBackToHome();
                    } else {
                      window.dispatchEvent(new CustomEvent("jrz_navigate_tab", { detail: "BERANDA" }));
                    }
                  }
                : () => setSeniMode("LANDING")
            } 
            showBack={true}
            backTitle={defaultMonitorMode ? "Kembali ke Beranda JRZ SCORE" : "Kembali ke Pemilihan Peran Seni"}
            backLabel={defaultMonitorMode ? "KEMBALI KE BERANDA" : "KEMBALI"}
          />

          {/* TOP ACTION BAR WHEN IN ACTIVE SCORING / DEWAN / MONITOR PANEL */}
          {!defaultMonitorMode && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0a132c] border border-blue-900/60 p-3.5 sm:p-4 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    sound.playClick();
                    setSeniMode("LANDING");
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  title="Kembali ke Pemilihan Peran Seni"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400" />
                  <span>Pemilihan Peran Seni</span>
                </button>

                <div className="border-l border-slate-700 pl-3">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase block">
                    DIGITAL SKORING SENI • GELANGGANG {selectedArena}
                  </span>
                  <span className="text-sm font-black text-white uppercase">
                    {seniMode === "DEWAN" ? "👑 Panel Dewan & Sekretaris Seni" :
                     seniMode === "JURY" ? `⚖️ Panel Penjurian Seni (Juri ${activeJuryTab})` :
                     "📺 Layar Monitor TV Scoreboard Seni"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    setSeniMode(seniMode === "MONITOR" ? "DEWAN" : "MONITOR");
                  }}
                  className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    seniMode === "MONITOR"
                      ? "bg-amber-500 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-500/30"
                      : "bg-slate-900 text-cyan-300 border-blue-500/40 hover:bg-slate-800"
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>{seniMode === "MONITOR" ? "Mode Penilaian Dewan" : "Layar Monitor TV"}</span>
                </button>

                <button
                  onClick={handleSaveToFirebase}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
              </div>
            </div>
          )}

          {/* MONITOR MODE (FULL TV SCOREBOARD SCREEN FOR SENI) */}
          {seniMode === "MONITOR" ? (
            <div className="bg-gradient-to-b from-[#060c1d] via-[#091433] to-[#040817] border-2 border-amber-400/50 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-fadeIn text-center">
          
          <div className="flex flex-col sm:flex-row items-center justify-between border-b border-blue-900/60 pb-4 gap-4">
            <div className="text-left">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-lg text-xs font-mono font-black tracking-widest uppercase">
                {performance.matchNumber} • {performance.pool}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white uppercase mt-2 tracking-tight">
                {performance.athleteName}
              </h2>
              <div className="text-base sm:text-lg font-bold text-amber-400 mt-0.5">
                {performance.contingent}
              </div>
            </div>

            {/* BIG TIMER DISPLAY */}
            <div className="bg-slate-950/80 px-8 py-4 rounded-2xl border border-blue-500/40 shadow-inner">
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mb-1">
                WAKTU PENAMPILAN (MAX 03:00)
              </div>
              <div className={`font-mono font-black text-4xl sm:text-6xl tracking-wider ${
                performance.elapsedSeconds >= 180 ? "text-rose-500 animate-pulse" :
                performance.elapsedSeconds >= 170 ? "text-amber-400" :
                "text-emerald-400"
              }`}>
                {formatTime(performance.elapsedSeconds)}
              </div>
            </div>
          </div>

          {/* FINAL SCORE MASSIVE DISPLAY */}
          <div className="bg-gradient-to-r from-blue-950/60 via-[#0d1c47] to-blue-950/60 p-8 rounded-3xl border border-blue-400/40 shadow-2xl relative overflow-hidden">
            <div className="text-xs sm:text-sm font-mono text-cyan-300 uppercase tracking-widest font-black">
              SKOR AKHIR RESMI PERSILAT (MEDIAN 3 JURI TENGAH - PENALTI)
            </div>
            <div className="text-6xl sm:text-9xl font-black font-mono tracking-tighter bg-gradient-to-r from-amber-300 via-white to-amber-200 bg-clip-text text-transparent my-2">
              {performance.finalScore.toFixed(3)}
            </div>
            <div className="flex flex-wrap justify-center items-center gap-6 text-xs sm:text-sm font-mono text-slate-300">
              <span>Nilai Tengah (Median): <strong className="text-white">{performance.medianScore.toFixed(3)}</strong></span>
              <span>Total Potongan Hukuman: <strong className="text-rose-400">-{performance.penalties.totalPenaltyDeduction.toFixed(3)}</strong></span>
            </div>
          </div>

          {/* 5 JURIES SCOREBOARD MATRIX */}
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">
              REKAPITULASI 5 JURI PENILAI PERSILAT
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((jId) => {
                const s = performance.juryScores[jId] || { kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90 };
                return (
                  <div key={jId} className="bg-[#0b1638] border border-blue-900/50 rounded-2xl p-3 sm:p-4 text-center">
                    <div className="text-[10px] sm:text-xs font-mono text-amber-400 font-bold uppercase">JURI {jId}</div>
                    <div className="text-lg sm:text-2xl font-black text-white font-mono my-1">
                      {s.totalScore.toFixed(3)}
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-mono text-slate-400">
                      Benar: {s.kebenaranScore} • Mantap: {s.kemantapanScore}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        /* REGULAR OPERATOR / JURY SCORING VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT 2 COLUMNS: MATCH PROFILE, TIMER & JURY ENTRY */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ATHLETE & CATEGORY PROFILE CARD */}
            <div className="bg-[#0a1329] border border-blue-900/50 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* NOMOR PARTAI */}
                <div>
                  <label className="block text-slate-400 text-[10px] font-mono uppercase mb-1">Nomor Partai Seni:</label>
                  <input
                    type="text"
                    value={performance.matchNumber}
                    onChange={(e) => setPerformance({ ...performance, matchNumber: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-amber-400 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* KATEGORI SENI */}
                <div>
                  <label className="block text-slate-400 text-[10px] font-mono uppercase mb-1">Kategori Seni:</label>
                  <select
                    value={performance.category}
                    onChange={(e) => setPerformance({ ...performance, category: e.target.value as SeniCategory })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white font-mono focus:outline-none focus:border-amber-400"
                  >
                    <option value="TUNGGAL">TUNGGAL (Wajib IPSI)</option>
                    <option value="GANDA">GANDA (Bebas / Senjata)</option>
                    <option value="REGU">REGU (Kekompakan)</option>
                    <option value="SOLO_KREATIF">SOLO KREATIF</option>
                  </select>
                </div>

                {/* POOL */}
                <div>
                  <label className="block text-slate-400 text-[10px] font-mono uppercase mb-1">Pool / Babak:</label>
                  <input
                    type="text"
                    value={performance.pool}
                    onChange={(e) => setPerformance({ ...performance, pool: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-cyan-300 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

              </div>

              {/* ATHLETE NAME & CONTINGENT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-900/30">
                <div>
                  <label className="block text-slate-400 text-[10px] font-mono uppercase mb-1">Nama Pesilat / Tim:</label>
                  <input
                    type="text"
                    value={performance.athleteName}
                    onChange={(e) => setPerformance({ ...performance, athleteName: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-black text-white uppercase focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-mono uppercase mb-1">Kontingen / Perguruan:</label>
                  <input
                    type="text"
                    value={performance.contingent}
                    onChange={(e) => setPerformance({ ...performance, contingent: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-bold text-amber-300 uppercase focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* PERFORMANCE TIMER CONTROL */}
            <div className="bg-gradient-to-r from-[#0d193d] to-[#0a132e] border border-blue-500/30 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <Clock className="w-8 h-8 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-xs font-mono text-cyan-300 font-bold uppercase">
                    PENGUKUR WAKTU PENAMPILAN
                  </div>
                  <div className={`text-4xl sm:text-5xl font-mono font-black tracking-widest ${
                    performance.elapsedSeconds >= 180 ? "text-rose-400" :
                    performance.elapsedSeconds >= 170 ? "text-amber-400" :
                    "text-emerald-400"
                  }`}>
                    {formatTime(performance.elapsedSeconds)}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Target Standar: 03:00 (180 Detik)
                  </div>
                </div>
              </div>

              {/* TIMER ACTION BUTTONS */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleTimer}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer active:scale-95 transition-all ${
                    performance.timerStatus === "RUNNING"
                      ? "bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/50"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50"
                  }`}
                >
                  {performance.timerStatus === "RUNNING" ? (
                    <>
                      <Pause className="w-4 h-4" />
                      <span>Jeda Waktu</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Mulai Waktu</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleResetTimer}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                  title="Reset Timer ke 00:00"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* JURY SCORING ENTRY TABS (JURI 1..5) */}
            <div className="bg-[#0a1329] border border-blue-900/50 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-blue-900/40 pb-3">
                <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Pengisian Nilai 5 Juri Persilat
                </h3>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((jId) => (
                    <button
                      key={jId}
                      onClick={() => {
                        sound.playClick();
                        setActiveJuryTab(jId);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-black uppercase transition-all cursor-pointer ${
                        activeJuryTab === jId
                          ? "bg-blue-600 text-white border border-blue-400"
                          : "bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      Juri {jId}
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTIVE JURY INPUT CARD */}
              {(() => {
                const currentScore = performance.juryScores[activeJuryTab] || { kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: false };
                return (
                  <div className="bg-[#0d1a3d] border border-blue-800/60 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-amber-400 uppercase">
                        Formulir Penjurian: JURI {activeJuryTab}
                      </span>
                      <span className="text-xs font-mono text-cyan-300 font-bold">
                        Subtotal: {currentScore.totalScore.toFixed(3)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* UNSUR KEBENARAN GERAK */}
                      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200">1. Kebenaran Jurus & Gerak</label>
                          <span className="text-xs font-mono text-amber-400 font-bold">
                            {currentScore.kebenaranScore}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Ketepatan urutan gerak jurus 1-14 (Skala 0.00 - 9.90)
                        </p>
                        <input
                          type="number"
                          step="0.01"
                          max="10.0"
                          min="0.0"
                          value={currentScore.kebenaranScore}
                          onChange={(e) => handleUpdateJuryScore(activeJuryTab, parseFloat(e.target.value) || 0, currentScore.kemantapanScore)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono font-bold focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      {/* UNSUR KEMANTAPAN & PENGHAYATAN */}
                      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200">2. Kemantapan & Stamina</label>
                          <span className="text-xs font-mono text-cyan-400 font-bold">
                            {currentScore.kemantapanScore}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Penghayatan, ritme, tenaga & harmonisasi gerak (Skala 0.00 - 0.20)
                        </p>
                        <input
                          type="number"
                          step="0.01"
                          max="1.0"
                          min="0.0"
                          value={currentScore.kemantapanScore}
                          onChange={(e) => handleUpdateJuryScore(activeJuryTab, currentScore.kebenaranScore, parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-mono font-bold focus:border-cyan-400 focus:outline-none"
                        />
                      </div>

                    </div>
                  </div>
                );
              })()}

            </div>

          </div>

          {/* RIGHT COLUMN: PENALTIES & OFFICIAL FINAL RECAP */}
          <div className="space-y-6">
            
            {/* OFFICIAL RESULT DISPLAY CARD */}
            <div className="bg-gradient-to-b from-[#0f1d44] via-[#0b1638] to-[#070e24] border-2 border-amber-400/40 rounded-2xl p-5 shadow-2xl text-center space-y-3">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono font-black uppercase tracking-wider">
                HASIL RESMI AKHIR
              </span>
              
              <div className="text-4xl sm:text-5xl font-mono font-black tracking-tight text-white my-1">
                {performance.finalScore.toFixed(3)}
              </div>

              <div className="space-y-1.5 text-xs font-mono text-slate-300 pt-2 border-t border-blue-900/40 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Median 3 Juri:</span>
                  <span className="font-bold text-white">{performance.medianScore.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Potongan Hukuman:</span>
                  <span className="font-bold text-rose-400">-{performance.penalties.totalPenaltyDeduction.toFixed(3)}</span>
                </div>
              </div>
            </div>

            {/* DEWAN JURI PENALTY MATRIX */}
            <div className="bg-[#0a1329] border border-blue-900/50 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-blue-900/40 pb-2">
                <h3 className="text-xs font-black text-rose-400 uppercase flex items-center gap-1.5 font-mono">
                  <ShieldAlert className="w-4 h-4" />
                  Potongan Hukuman (Dewan Seni)
                </h3>
                <span className="text-[10px] font-mono text-slate-400">IPSI PERSILAT</span>
              </div>

              <div className="space-y-3 text-xs">
                
                {/* BOUNDARY VIOLATION */}
                <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div>
                    <div className="font-bold text-white">Keluar Garis Gelanggang</div>
                    <div className="text-[9.5px] text-slate-400 font-mono">(-0.05 per pelanggaran)</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePenaltyChange("boundaryViolationCount", Math.max(0, performance.penalties.boundaryViolationCount - 1))}
                      className="w-6 h-6 rounded bg-slate-800 text-white font-bold flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-amber-300">
                      {performance.penalties.boundaryViolationCount}
                    </span>
                    <button
                      onClick={() => handlePenaltyChange("boundaryViolationCount", performance.penalties.boundaryViolationCount + 1)}
                      className="w-6 h-6 rounded bg-slate-800 text-white font-bold flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* COSTUME VIOLATION */}
                <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div>
                    <div className="font-bold text-white">Atribut / Pakaian Terlepas</div>
                    <div className="text-[9.5px] text-slate-400 font-mono">(-0.05)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={performance.penalties.costumeViolation}
                    onChange={(e) => handlePenaltyChange("costumeViolation", e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* WEAPON DROP VIOLATION */}
                <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div>
                    <div className="font-bold text-white">Senjata Terjatuh</div>
                    <div className="text-[9.5px] text-slate-400 font-mono">(-0.50 per kejadian)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={performance.penalties.weaponDropViolation}
                    onChange={(e) => handlePenaltyChange("weaponDropViolation", e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* TIME DEVIATION */}
                <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div>
                    <div className="font-bold text-white">Deviasi Waktu (&lt;2:55 atau &gt;3:05)</div>
                    <div className="text-[9.5px] text-slate-400 font-mono">Selisih: {performance.penalties.timeDeviationSeconds} dtk</div>
                  </div>
                  <span className="font-mono font-bold text-rose-400">
                    -{ (Math.floor(performance.penalties.timeDeviationSeconds / 5) * 0.05).toFixed(2) }
                  </span>
                </div>

                {/* MANUAL DEDUCTION */}
                <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div>
                    <div className="font-bold text-white">Penalti Manual Lainnya</div>
                    <div className="text-[9.5px] text-slate-400 font-mono">Keputusan Dewan Juri</div>
                  </div>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={performance.penalties.manualDeduction}
                    onChange={(e) => handlePenaltyChange("manualDeduction", parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-xs font-mono font-bold text-white focus:outline-none"
                  />
                </div>

              </div>
            </div>

          </div>

        </div>
      )}
      </>
      )}

    </div>
  );
}
