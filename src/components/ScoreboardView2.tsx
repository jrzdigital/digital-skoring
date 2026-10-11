/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { MatchState, MatchStatus } from "../types";
import { Shield, CheckCircle2, Lock, Clock, Activity, User, Trophy, Crown, Award, Sparkles, Eye, EyeOff, Swords, Flame, Zap, Calendar, ArrowRight } from "lucide-react";
import { sound } from "../utils/sound";
import { offlineEngine } from "../utils/offlineEngine";

interface ScoreboardView2Props {
  state: MatchState;
  onBack?: () => void;
  isMonitorMode?: boolean;
}

export function ScoreboardView2({ state, onBack, isMonitorMode = false }: ScoreboardView2Props) {
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [localVerificationResult, setLocalVerificationResult] = useState<MatchState["verification"] | null>(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  const [hideWinnerOverlay, setHideWinnerOverlay] = useState(false);
  const [hideNextMatchOverlay, setHideNextMatchOverlay] = useState(false);
  const prevVerificationActiveRef = useRef(false);
  const prevMatchIdRef = useRef(state.id);
  const prevStatusRef = useRef<MatchStatus | null>(null);
  const prevTimeLeftRef = useRef<number | null>(null);

  // Reset overlays if match ID changes or returns to IDLE state
  useEffect(() => {
    if (prevMatchIdRef.current !== state.id || state.status === MatchStatus.IDLE) {
      prevMatchIdRef.current = state.id;
      setHideWinnerOverlay(false);
      setHideNextMatchOverlay(false);
    }
  }, [state.id, state.matchNumber, state.status]);

  // Track native fullscreen
  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Sound cues on round start & round end (IPSI 2026)
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const prevTimeLeft = prevTimeLeftRef.current;
    const roundDur = state.roundDuration || 120;

    // 1. Babak 1,2,3 dimulai: Bunyikan gong saat mulai babak (bukan saat resume/lanjutkan dari PAUSED di tengah babak)
    const isResuming =
      prevStatus === MatchStatus.PAUSED &&
      prevTimeLeft !== null &&
      prevTimeLeft > 0 &&
      prevTimeLeft < roundDur;
    if (state.status === MatchStatus.RUNNING && prevStatus !== MatchStatus.RUNNING && prevStatus !== null && !isResuming) {
      sound.playGong();
    }

    // 2. Babak 1,2,3 selesai: Bunyikan gong saat waktu babak selesai (timeLeft reaches 0)
    if (state.timeLeft === 0 && prevTimeLeft !== null && prevTimeLeft > 0) {
      sound.playGong();
    }

    prevStatusRef.current = state.status;
    prevTimeLeftRef.current = state.timeLeft;
  }, [state.status, state.timeLeft, state.roundDuration]);

  // Verification result modal triggers
  useEffect(() => {
    const wasActive = prevVerificationActiveRef.current;
    const isNowActive = !!state.verification?.active;

    if (wasActive && !isNowActive && state.verification?.result) {
      setLocalVerificationResult(state.verification);
      setShowResultOverlay(true);
      setCountdownSeconds(5);
      sound.playClick();

      const timer = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setShowResultOverlay(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
    prevVerificationActiveRef.current = isNowActive;
  }, [state.verification?.active, state.verification?.result]);

  // Formatted timer calculation (Minutes : Seconds : Milliseconds/Hundredths)
  const minutesStr = Math.floor(state.timeLeft / 60).toString().padStart(2, "0");
  const secondsStr = (state.timeLeft % 60).toString().padStart(2, "0");
  
  // Running fractional seconds effect for true sports LED timer look
  const [centiSeconds, setCentiSeconds] = useState("00");
  useEffect(() => {
    if (state.status !== MatchStatus.RUNNING || state.timeLeft <= 0) {
      setCentiSeconds("00");
      return;
    }
    const interval = setInterval(() => {
      const ms = Math.floor((Date.now() % 1000) / 10);
      setCentiSeconds(ms.toString().padStart(2, "0"));
    }, 45);
    return () => clearInterval(interval);
  }, [state.status, state.timeLeft]);

  // Metadata headers
  const partaiNum = state.matchNumber 
    ? (state.matchNumber.match(/\d+/) ? state.matchNumber.match(/\d+/)?.[0] : state.matchNumber).padStart(2, "0") 
    : "01";
  const divisionLabel = state.division ? state.division.toUpperCase() : "DEWASA";
  const classLabel = state.classCategory ? state.classCategory.toUpperCase().replace("TANDING KELAS", "").replace("KELAS", "").trim() : "KELAS A (30-33 KG)";
  const stageLabel = state.stage ? state.stage.toUpperCase() : "FINAL";
  const genderLabel = state.gender === "PUTRI" ? "PUTRI" : "PUTRA";
  const eventName = state.eventName || "KEJUARAAN NASIONAL PENCAK SILAT 2026";
  const arenaName = (state as any).arena || "GELANGGANG 1";

  // Winner calculation and method determination for visual overlay
  // Pertandingan HANYA dianggap berakhir jika status FINISHED dan keputusan pemenang sah/diumumkan.
  // JANGAN PERNAH menampilkan visual pemenang jika pertandingan sedang berjalan (RUNNING) atau belum dimulai (IDLE).
  const isMatchOver = state.status === MatchStatus.FINISHED && 
    (Boolean(state.winnerPublished) || Boolean(state.winnerColor) || Boolean(state.redPenalties?.disqualified) || Boolean(state.bluePenalties?.disqualified));

  // Up Next Match popup overlay condition:
  // Muncul ketika pertandingan belum dimulai (IDLE / showNextMatchPopup) dan belum RUNNING.
  // Otomatis hilang dan masuk ke halaman skor utama saat sekretaris menekan mulai timer (RUNNING).
  const isNextMatchEligible = (Boolean(state.showNextMatchPopup) || state.status === MatchStatus.IDLE) && 
    state.status !== MatchStatus.RUNNING && 
    !isMatchOver;
  const isNextMatchActive = isNextMatchEligible && !hideNextMatchOverlay;

  const determinedWinnerColor = useMemo((): "RED" | "BLUE" | null => {
    if (!isMatchOver) return null;
    if (state.winnerColor) return state.winnerColor;
    if (state.redPenalties?.disqualified && !state.bluePenalties?.disqualified) return "BLUE";
    if (state.bluePenalties?.disqualified && !state.redPenalties?.disqualified) return "RED";
    if (state.status === MatchStatus.FINISHED || state.winnerPublished) {
      if (state.scoreRed > state.scoreBlue) return "RED";
      if (state.scoreBlue > state.scoreRed) return "BLUE";
    }
    return null;
  }, [isMatchOver, state.winnerColor, state.redPenalties?.disqualified, state.bluePenalties?.disqualified, state.status, state.winnerPublished, state.scoreRed, state.scoreBlue]);

  const winnerName = determinedWinnerColor === "RED" 
    ? (state.fighterRedName || "PESILAT MERAH") 
    : (state.fighterBlueName || "PESILAT BIRU");

  const winnerClub = determinedWinnerColor === "RED" 
    ? (state.fighterRedClub || "SUDUT MERAH") 
    : (state.fighterBlueClub || "SUDUT BIRU");

  const determinedVictoryMethod = useMemo(() => {
    if (!isMatchOver) return "";
    if (state.winnerMethod && state.winnerMethod.trim() !== "") {
      if (state.winnerMethod.toUpperCase().includes("DISKUALIFIKASI")) {
        // HANYA tampilkan diskualifikasi jika memang salah satu sudut didiskualifikasi secara resmi oleh Dewan
        if (state.redPenalties?.disqualified) return "MENANG DISKUALIFIKASI (SUDUT MERAH DISKUALIFIKASI)";
        if (state.bluePenalties?.disqualified) return "MENANG DISKUALIFIKASI (SUDUT BIRU DISKUALIFIKASI)";
        // Jika dewan tidak menekan tombol diskualifikasi, kembalikan ke kemenangan mutlak / angka
        return Math.abs(state.scoreRed - state.scoreBlue) >= 30 ? "MENANG SELISIH 30 ANGKA" : "MENANG ANGKA / MUTLAK";
      }
      return state.winnerMethod.toUpperCase();
    }
    if (state.redPenalties?.disqualified) {
      return "MENANG DISKUALIFIKASI (SUDUT MERAH DISKUALIFIKASI)";
    }
    if (state.bluePenalties?.disqualified) {
      return "MENANG DISKUALIFIKASI (SUDUT BIRU DISKUALIFIKASI)";
    }
    if (Math.abs(state.scoreRed - state.scoreBlue) >= 30) {
      return "MENANG SELISIH 30 ANGKA";
    }
    return "MENANG ANGKA / MUTLAK";
  }, [isMatchOver, state.winnerMethod, state.winnerColor, state.redPenalties?.disqualified, state.bluePenalties?.disqualified, state.scoreRed, state.scoreBlue]);

  // Jatuhan Sah Counter (Per sudut, disahkan secara resmi oleh Dewan Pertandingan)
  const blueDropsCount = useMemo(() => {
    if (typeof state.blueStats?.drops === "number") {
      return Math.max(0, state.blueStats.drops);
    }
    const add = state.logs?.filter(l => l.fighter === "BLUE" && l.type === "DROP" && (l.points ?? 0) > 0).length || 0;
    const sub = state.logs?.filter(l => l.fighter === "BLUE" && l.type === "DROP" && (l.points ?? 0) < 0).length || 0;
    return Math.max(0, add - sub);
  }, [state.blueStats?.drops, state.logs]);

  const redDropsCount = useMemo(() => {
    if (typeof state.redStats?.drops === "number") {
      return Math.max(0, state.redStats.drops);
    }
    const add = state.logs?.filter(l => l.fighter === "RED" && l.type === "DROP" && (l.points ?? 0) > 0).length || 0;
    const sub = state.logs?.filter(l => l.fighter === "RED" && l.type === "DROP" && (l.points ?? 0) < 0).length || 0;
    return Math.max(0, add - sub);
  }, [state.redStats?.drops, state.logs]);

  // Check jury presses with smooth, guaranteed 1500ms retention per jury
  const [activeSignals, setActiveSignals] = useState<Record<number, { fighter: "BLUE" | "RED"; action: "PUNCH" | "KICK"; expireAt: number; id: string } | null>>({
    1: null,
    2: null,
    3: null
  });

  // Track the timestamp of the last processed press for each jury to prevent re-triggering on state updates
  const lastProcessedPressTimeRef = useRef<Record<number, number>>({
    1: 0,
    2: 0,
    3: 0
  });

  // Track state.activeJuryPresses changes from server or parent
  useEffect(() => {
    if (!state.activeJuryPresses) return;
    const now = Date.now();
    let changed = false;

    setActiveSignals((prev) => {
      const next = { ...prev };
      [1, 2, 3].forEach((jId) => {
        const p = state.activeJuryPresses?.[jId];
        if (p) {
          const pressTime = p.pressedAt || now;
          // Only trigger if this is a fresh press that has not been handled yet, and is less than 2 seconds old
          if (pressTime > (lastProcessedPressTimeRef.current[jId] || 0) && (now - pressTime) < 2000) {
            lastProcessedPressTimeRef.current[jId] = pressTime;
            next[jId] = {
              fighter: p.fighter,
              action: p.action,
              expireAt: now + 2000,
              id: Math.random().toString(36).substring(7)
            };
            changed = true;
          }
        } else {
          if (next[jId] !== null) {
            next[jId] = null;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [state.activeJuryPresses]);

  // Subscribe directly to offline engine for 0ms cross-tab real-time sync
  useEffect(() => {
    const unsub = offlineEngine.subscribe((remoteState) => {
      if (remoteState.activeJuryPresses) {
        const now = Date.now();
        setActiveSignals((prev) => {
          let updated = false;
          const next = { ...prev };
          [1, 2, 3].forEach((jId) => {
            const p = remoteState.activeJuryPresses?.[jId];
            if (p) {
              const pressTime = p.pressedAt || now;
              if (pressTime > (lastProcessedPressTimeRef.current[jId] || 0) && (now - pressTime) < 2000) {
                lastProcessedPressTimeRef.current[jId] = pressTime;
                next[jId] = {
                  fighter: p.fighter,
                  action: p.action,
                  expireAt: now + 1500,
                  id: Math.random().toString(36).substring(7)
                };
                updated = true;
              }
            } else {
              if (next[jId] !== null) {
                next[jId] = null;
                updated = true;
              }
            }
          });
          return updated ? next : prev;
        });
      }
    });
    return unsub;
  }, []);

  // Timer ticker to clear expired signals smoothly
  const [pulseTick, setPulseTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      let hasActive = false;
      setActiveSignals((prev) => {
        let changed = false;
        const next = { ...prev };
        [1, 2, 3].forEach((jId) => {
          const s = next[jId];
          if (s) {
            if (s.expireAt <= now) {
              next[jId] = null;
              changed = true;
            } else {
              hasActive = true;
            }
          }
        });
        return changed ? next : prev;
      });
      if (hasActive) {
        setPulseTick((t) => (t + 1) % 1000);
      }
    }, 40);

    return () => clearInterval(timer);
  }, []);

  const getJuryPressState = (juryId: number, color: "BLUE" | "RED", action: "PUNCH" | "KICK") => {
    const now = Date.now();
    const sig = activeSignals[juryId];
    if (sig && sig.expireAt > now && sig.fighter === color && sig.action === action) {
      return true;
    }
    const propPress = state.activeJuryPresses?.[juryId];
    if (
      propPress &&
      propPress.pressedAt &&
      (now - propPress.pressedAt) <= 2000 &&
      propPress.fighter === color &&
      propPress.action === action
    ) {
      return true;
    }
    return false;
  };

  const isAnyPunchActive = [1, 2, 3].some(jId => getJuryPressState(jId, "BLUE", "PUNCH") || getJuryPressState(jId, "RED", "PUNCH"));
  const isAnyKickActive = [1, 2, 3].some(jId => getJuryPressState(jId, "BLUE", "KICK") || getJuryPressState(jId, "RED", "KICK"));

  // Host URL for top hint
  const currentHost = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div 
      className={`bg-[#030614] text-white select-none overflow-hidden flex flex-col justify-between relative font-sans w-full h-full ${
        isNativeFullscreen || isMonitorMode
          ? "fixed inset-0 z-40 w-screen h-screen p-1.5 sm:p-2.5 md:p-3"
          : "w-full max-w-7xl mx-auto rounded-[20px] p-2 sm:p-3 md:p-4 shadow-[0_0_60px_rgba(0,30,120,0.6)] border-2 border-blue-900/60"
      }`} 
      id="scoreboard-monitor2-root"
      style={{
        height: isNativeFullscreen || isMonitorMode ? "100vh" : "100%",
        maxHeight: isNativeFullscreen || isMonitorMode ? "100vh" : "100%",
        minHeight: isNativeFullscreen || isMonitorMode ? "100vh" : "auto",
        background: "radial-gradient(ellipse at 50% 30%, #0a1844 0%, #030612 100%)"
      }}
    >
      {/* 1. TOP HEADER SECTION (ARENA LED MODERN HEADER) */}
      <header className="relative w-full flex items-center justify-between gap-2 px-1 sm:px-2 py-0.5 sm:py-1 shrink-0">
        {/* Left Corner Logo: logomonitor1.png */}
        <div className="w-12 sm:w-16 md:w-20 lg:w-24 h-10 sm:h-12 md:h-14 lg:h-16 flex items-center justify-center shrink-0">
          <img 
            src="/logomonitor1.png" 
            alt="Logo Kiri" 
            className="max-h-full max-w-full object-contain filter drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = "/jrzscoreutama.png";
            }}
          />
        </div>

        {/* Center Blue Curved Header Capsule with Category (Dewasa), Partai, Stage & Arena */}
        <div className="flex-grow flex flex-col items-center justify-center max-w-3xl mx-auto px-2">
          <div className="bg-gradient-to-r from-[#122b68] via-[#1d4ed8] to-[#122b68] border-2 border-cyan-400/50 rounded-full px-4 sm:px-8 py-1 sm:py-1.5 shadow-[0_0_30px_rgba(29,78,216,0.6)] text-center w-full">
            <h1 className="text-white font-sans font-black text-xs sm:text-sm md:text-base lg:text-lg tracking-widest uppercase leading-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {eventName}
            </h1>
            <div className="text-cyan-200 font-sans font-extrabold text-[9px] sm:text-[10px] md:text-xs tracking-wider uppercase mt-0.5 truncate drop-shadow">
              PARTAI {partaiNum} | {divisionLabel} | {classLabel} - {genderLabel} | {stageLabel} | {arenaName}
            </div>
          </div>
        </div>

        {/* Right Corner Logo: logomonitor2.png */}
        <div className="w-12 sm:w-16 md:w-20 lg:w-24 h-10 sm:h-12 md:h-14 lg:h-16 flex items-center justify-center shrink-0">
          <img 
            src="/logomonitor2.png" 
            alt="Logo Kanan" 
            className="max-h-full max-w-full object-contain filter drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = "/jrzscoreutama.png";
            }}
          />
        </div>
      </header>

      {/* 2. FIGHTER BANNERS & CENTER TIMER ROW */}
      <section className="grid grid-cols-12 gap-2 sm:gap-3 items-end px-1 sm:px-2 shrink-0 mt-0.5 sm:mt-1">
        {/* SUDUT BIRU: LABEL KONTINGEN & NAMA PESILAT (COL-SPAN 4) */}
        <div className="col-span-4 flex flex-col items-start min-w-0">
          {/* Sleek Blue Contingent Tag */}
          <div className="bg-gradient-to-r from-blue-700 to-cyan-600 border-t border-x border-cyan-400/80 text-white font-sans font-black text-[10px] sm:text-xs md:text-sm px-3.5 sm:px-5 py-0.5 rounded-t-xl uppercase tracking-widest shadow-md truncate max-w-full">
            {state.fighterBlueClub || "SUDUT BIRU"}
          </div>
          {/* Blue Fighter Name Bar with Silhouette Avatar */}
          <div className="w-full bg-gradient-to-r from-[#0284c7] to-[#0369a1] border-2 border-cyan-400/50 rounded-r-xl rounded-b-xl p-1 sm:p-1.5 flex items-center gap-2 shadow-[0_0_25px_rgba(2,132,199,0.4)]">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg bg-[#075985] border border-cyan-300/50 flex items-center justify-center text-cyan-200 shrink-0 shadow-inner">
              <User className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            </div>
            <div className="flex-grow min-w-0 pr-1">
              <div className="font-sans font-black text-sm sm:text-base md:text-xl lg:text-2xl text-white uppercase tracking-wider truncate leading-tight drop-shadow-md">
                {state.fighterBlueName || "NARJI"}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER: DIGITAL TIMER CONTAINER (COL-SPAN 4) - PROPORTIONALLY POSITIONED & BALANCED */}
        <div className="col-span-4 flex flex-col justify-end items-center min-w-0 h-full">
          <div className="w-full bg-[#020512] border-2 border-cyan-500/50 rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.9)] relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            {/* 7-Segment Digital Clock Display (Yellow LED) */}
            <div className="flex items-center justify-center font-mono font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl text-[#facc15] tracking-wider drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] select-none">
              <span>{minutesStr}</span>
              <span className={`px-0.5 ${state.status === MatchStatus.RUNNING && (Math.floor(Date.now() / 500) % 2 === 0) ? "opacity-30" : "opacity-100"}`}>:</span>
              <span>{secondsStr}</span>
              <span className="px-0.5 opacity-60 text-xs sm:text-sm md:text-base">:</span>
              <span className="text-xs sm:text-sm md:text-base opacity-80">{centiSeconds}</span>
            </div>
          </div>
        </div>

        {/* SUDUT MERAH: LABEL KONTINGEN & NAMA PESILAT (COL-SPAN 4) */}
        <div className="col-span-4 flex flex-col items-end min-w-0">
          {/* Sleek Red Contingent Tag */}
          <div className="bg-gradient-to-r from-rose-600 to-red-700 border-t border-x border-rose-400/80 text-white font-sans font-black text-[10px] sm:text-xs md:text-sm px-3.5 sm:px-5 py-0.5 rounded-t-xl uppercase tracking-widest shadow-md truncate max-w-full">
            {state.fighterRedClub || "SUDUT MERAH"}
          </div>
          {/* Red Fighter Name Bar with Silhouette Avatar */}
          <div className="w-full bg-gradient-to-r from-[#b91c1c] to-[#dc2626] border-2 border-rose-400/50 rounded-l-xl rounded-b-xl p-1 sm:p-1.5 flex items-center justify-between gap-2 shadow-[0_0_25px_rgba(220,38,38,0.4)] flex-row-reverse">
            <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg bg-[#991b1b] border border-rose-300/50 flex items-center justify-center text-rose-200 shrink-0 shadow-inner">
              <User className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            </div>
            <div className="flex-grow min-w-0 pl-1 text-right">
              <div className="font-sans font-black text-sm sm:text-base md:text-xl lg:text-2xl text-white uppercase tracking-wider truncate leading-tight drop-shadow-md">
                {state.fighterRedName || "WENDY"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN SCORE ARENA (5 COLUMNS: BLUE PENALTIES 2x3, BLUE SCORE, ROUND INDICATOR, RED SCORE, RED PENALTIES 2x3) */}
      <main className="grid grid-cols-12 gap-2 sm:gap-3 flex-grow my-1.5 sm:my-2 items-stretch min-h-0 px-1 sm:px-2">
        
        {/* COLUMN 1 & 2: BLUE CORNER (PENALTY 2x3 GRID + GIANT BLUE SCORE) - COL-SPAN 5 */}
        <div className="col-span-5 grid grid-cols-12 gap-2 sm:gap-2.5 h-full items-stretch min-h-0">
          
          {/* Left Penalty Grid: 2 Columns x 3 Rows (Col-Span 4) */}
          <div className="col-span-4 bg-[#03091e] border-2 border-blue-900/80 rounded-2xl p-1 sm:p-1.5 shadow-[0_0_20px_rgba(3,9,30,0.8)] flex flex-col justify-between min-h-0">
            
            {/* JATUHAN SAH BADGE (DI ATAS MENU AKSI HUKUMAN BINAAN 1 DAN 2) */}
            <div 
              id="monitor-blue-jatuhan-count"
              className={`w-full py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all select-none shadow-sm shrink-0 mb-1 sm:mb-1.5 ${
                blueDropsCount > 0
                  ? "bg-gradient-to-r from-[#071e4a] via-[#0c3175] to-[#071e4a] border-cyan-400/90 shadow-[0_0_15px_rgba(6,182,212,0.45)]"
                  : "bg-[#06122c] border-blue-900/60"
              }`}
              title={`Jumlah Jatuhan Sah Sudut Biru: ${blueDropsCount}X`}
            >
              <span className="text-[10px] xs:text-[11px] sm:text-xs md:text-[12.5px] lg:text-sm font-sans font-black tracking-wider uppercase text-slate-200 flex items-center justify-center gap-1">
                <span className="text-slate-300">jatuhan :</span>
                <span className={`font-mono font-black text-xs sm:text-sm md:text-base ${
                  blueDropsCount > 0 ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]" : "text-slate-400"
                }`}>
                  {blueDropsCount}X
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 grid-rows-3 gap-1 sm:gap-1.5 flex-1 w-full min-h-0">
              
              {/* Row 1, Col 1: BINAAN 1 (ORANGE) */}
              <div 
                className={`rounded-xl border flex items-center justify-center p-0.5 sm:p-1 transition-all overflow-hidden ${
                  state.bluePenalties.binaan1
                    ? "border-orange-500/80 bg-orange-950/50 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                    : "border-blue-900/60 bg-[#061028]"
                }`}
                title="Binaan 1"
              >
                <img 
                  src={state.bluePenalties.binaan1 ? "/binaan1_orange.png" : "/binaan1.png"} 
                  alt="B1" 
                  className={`max-h-full max-w-full object-contain transition-all duration-200 ${
                    state.bluePenalties.binaan1 
                      ? "opacity-100 filter drop-shadow-[0_0_16px_rgba(249,115,22,1)] scale-110 brightness-110" 
                      : "opacity-20 grayscale brightness-50 contrast-50"
                  }`} 
                  referrerPolicy="no-referrer" 
                />
              </div>

              {/* Row 1, Col 2: BINAAN 2 (ORANGE) */}
              <div 
                className={`rounded-xl border flex items-center justify-center p-0.5 sm:p-1 transition-all overflow-hidden ${
                  state.bluePenalties.binaan2
                    ? "border-orange-500/80 bg-orange-950/50 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                    : "border-blue-900/60 bg-[#061028]"
                }`}
                title="Binaan 2"
              >
                <img 
                  src={state.bluePenalties.binaan2 ? "/binaan2_orange.png" : "/binaan2.png"} 
                  alt="B2" 
                  className={`max-h-full max-w-full object-contain transition-all duration-200 ${
                    state.bluePenalties.binaan2 
                      ? "opacity-100 filter drop-shadow-[0_0_16px_rgba(249,115,22,1)] scale-110 brightness-110" 
                      : "opacity-20 grayscale brightness-50 contrast-50"
                  }`} 
                  referrerPolicy="no-referrer" 
                />
              </div>

              {/* Row 2, Col 1: TEGURAN 1 (KUNING) */}
              <div 
                className={`rounded-xl border flex items-center justify-center p-0.5 sm:p-1 transition-all overflow-hidden ${
                  state.bluePenalties.teguran1
                    ? "border-yellow-400/80 bg-yellow-950/50 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                    : "border-blue-900/60 bg-[#061028]"
                }`}
                title="Teguran 1 (-1 Poin)"
              >
                <img 
                  src={state.bluePenalties.teguran1 ? "/teguran1_yellow.png" : "/teguran1.png"} 
                  alt="T1" 
                  className={`max-h-full max-w-full object-contain transition-all duration-200 ${
                    state.bluePenalties.teguran1 
                      ? "opacity-100 filter drop-shadow-[0_0_16px_rgba(250,204,21,1)] scale-110 brightness-115" 
                      : "opacity-20 grayscale brightness-50 contrast-50"
                  }`} 
                  referrerPolicy="no-referrer" 
                />
              </div>

              {/* Row 2, Col 2: TEGURAN 2 (KUNING) */}
              <div 
                className={`rounded-xl border flex items-center justify-center p-0.5 sm:p-1 transition-all overflow-hidden ${
                  state.bluePenalties.teguran2
                    ? "border-yellow-400/80 bg-yellow-950/50 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                    : "border-blue-900/60 bg-[#061028]"
                }`}
                title="Teguran 2 (-2 Poin)"
              >
                <img 
                  src={state.bluePenalties.teguran2 ? "/teguran2_yellow.png" : "/teguran2.png"} 
                  alt="T2" 
                  className={`max-h-full max-w-full object-contain transition-all duration-200 ${
                    state.bluePenalties.teguran2 
                      ? "opacity-100 filter drop-shadow-[0_0_16px_rgba(250,204,21,1)] scale-110 brightness-115" 
                      : "opacity-20 grayscale brightness-50 contrast-50"
                  }`} 
                  referrerPolicy="no-referrer" 
                />
              </div>

              {/* Row 3, Col 1: PERINGATAN 1 (MERAH BERKEDIP) */}
              <div 
                className={`rounded-xl border flex items-center justify-center p-0.5 sm:p-1 transition-all overflow-hidden ${
                  state.bluePenalties.peringatan1
                    ? "border-red-500/80 bg-red-950/60 shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                    : "border-blue-900/60 bg-[#061028]"
                }`}
                title="Peringatan 1 (-5 Poin)"
              >
                <img 
                  src={state.bluePenalties.peringatan1 ? "/peringatan1_red.png" : "/peringatan1.png"} 
                  alt="P1" 
                  className={`max-h-full max-w-full object-contain transition-all duration-200 ${
                    state.bluePenalties.peringatan1 
                      ? "opacity-100 filter drop-shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse scale-110 brightness-110" 
                      : "opacity-20 grayscale brightness-50 contrast-50"
                  }`} 
                  referrerPolicy="no-referrer" 
                />
              </div>

              {/* Row 3, Col 2: PERINGATAN 2 (MERAH BERKEDIP) */}
              <div 
                className={`rounded-xl border flex items-center justify-center p-0.5 sm:p-1 transition-all overflow-hidden ${
                  state.bluePenalties.peringatan2
                    ? "border-red-500/80 bg-red-950/60 shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                    : "border-blue-900/60 bg-[#061028]"
                }`}
                title="Peringatan 2 (-10 Poin)"
              >
                <img 
                  src={state.bluePenalties.peringatan2 ? "/peringatan2_red.png" : "/peringatan2.png"} 
                  alt="P2" 
                  className={`max-h-full max-w-full object-contain transition-all duration-200 ${
                    state.bluePenalties.peringatan2 
                      ? "opacity-100 filter drop-shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse scale-110 brightness-110" 
                      : "opacity-20 grayscale brightness-50 contrast-50"
                  }`} 
                  referrerPolicy="no-referrer" 
                />
              </div>

            </div>
          </div>

          {/* Giant Blue Score Box (Col-Span 8) */}
          <div className="col-span-8 bg-gradient-to-b from-[#1da1f2] via-[#0284c7] to-[#0369a1] border-[3px] border-cyan-300 rounded-2xl p-1.5 sm:p-2.5 flex items-center justify-center relative overflow-hidden shadow-[0_0_40px_rgba(2,132,199,0.55)] min-h-0">
            <span className="font-sans font-black text-5xl sm:text-6xl md:text-7xl lg:text-[7.5rem] xl:text-[9.5rem] 2xl:text-[11rem] text-white select-none drop-shadow-[0_6px_25px_rgba(0,0,0,0.6)] leading-none tracking-tight">
              {state.scoreBlue}
            </span>
          </div>

        </div>

        {/* COLUMN 3: CENTER VERTICAL ROUND INDICATOR & LOGOS (COL-SPAN 2) */}
        <div className="col-span-2 bg-[#050b1e]/90 border-2 border-blue-900/80 rounded-2xl p-1 sm:p-1.5 flex flex-col justify-between items-center shadow-inner relative overflow-hidden h-full min-h-0">
          
          {/* Top Logo (Logo IPSI / Logo Kiri) */}
          <div className="w-full flex-1 flex items-center justify-center py-0.5 px-1 min-h-0">
            <img 
              src={state.logoLeft || "/logomonitor1.png"} 
              alt="Logo IPSI" 
              className="max-h-full w-auto max-w-full object-contain filter drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] brightness-110" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "/jrzscoreutama.png";
              }}
            />
          </div>

          {/* Center Round Stack & Header */}
          <div className="flex flex-col items-center w-full my-auto px-0.5 sm:px-1 py-0.5 shrink-0">
            <div className="text-cyan-300 font-sans font-black text-[9px] sm:text-xs md:text-sm uppercase tracking-widest text-center mb-0.5 sm:mb-1 drop-shadow">
              ROUND
            </div>

            {/* Round Stack 1, 2, 3 */}
            <div className="flex flex-col gap-1 sm:gap-1.5 w-full">
              {[1, 2, 3].map((rnd) => {
                const isActive = rnd === state.activeRound;
                return (
                  <div 
                    key={`m2-round-${rnd}`}
                    className={`w-full py-0.5 sm:py-1 md:py-1.5 rounded-lg sm:rounded-xl flex items-center justify-center font-sans font-black text-xs sm:text-sm md:text-base lg:text-lg transition-all duration-300 ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-[0_0_20px_rgba(0, 128, 0,0.8)] border-2 border-emerald-300 scale-105"
                        : "bg-[#0b1432] text-slate-500 border border-blue-950/80 opacity-60"
                    }`}
                  >
                    {rnd}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Logo (Logo Event / Logo Kanan) */}
          <div className="w-full flex-1 flex items-center justify-center py-0.5 px-1 min-h-0">
            <img 
              src={state.logoRight || "/logomonitor2.png"} 
              alt="Logo Event" 
              className="max-h-full w-auto max-w-full object-contain filter drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] brightness-110" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "/jrzscoreutama.png";
              }}
            />
          </div>

        </div>

        {/* COLUMN 4 & 5: RED CORNER (GIANT RED SCORE + PENALTY 2x3 GRID) - COL-SPAN 5 */}
        <div className="col-span-5 grid grid-cols-12 gap-2 sm:gap-2.5 h-full items-stretch min-h-0">
          
          {/* Giant Red Score Box (Col-Span 8) */}
          <div className="col-span-8 bg-gradient-to-b from-[#f43f5e] via-[#dc2626] to-[#991b1b] border-[3px] border-rose-300 rounded-2xl p-1.5 sm:p-2.5 flex items-center justify-center relative overflow-hidden shadow-[0_0_40px_rgba(220,38,38,0.55)] min-h-0">
            <span className="font-sans font-black text-5xl sm:text-6xl md:text-7xl lg:text-[7.5rem] xl:text-[9.5rem] 2xl:text-[11rem] text-white select-none drop-shadow-[0_6px_25px_rgba(0,0,0,0.6)] leading-none tracking-tight">
              {state.scoreRed}
            </span>
          </div>

          {/* Right Penalty Grid: 2 Columns x 3 Rows (Col-Span 4) */}
          <div className="col-span-4 bg-[#1f040a] border-2 border-red-900/80 rounded-2xl p-1 sm:p-1.5 shadow-[0_0_20px_rgba(31,4,10,0.8)] flex flex-col justify-between min-h-0">
            
            {/* JATUHAN SAH BADGE (DI ATAS MENU AKSI HUKUMAN BINAAN 1 DAN 2) */}
            <div 
              id="monitor-red-jatuhan-count"
              className={`w-full py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all select-none shadow-sm shrink-0 mb-1 sm:mb-1.5 ${
                redDropsCount > 0
                  ? "bg-gradient-to-r from-[#3d0a14] via-[#590e1e] to-[#3d0a14] border-rose-400/90 shadow-[0_0_15px_rgba(244,63,94,0.45)]"
                  : "bg-[#1d080e] border-red-900/60"
              }`}
              title={`Jumlah Jatuhan Sah Sudut Merah: ${redDropsCount}X`}
            >
              <span className="text-[10px] xs:text-[11px] sm:text-xs md:text-[12.5px] lg:text-sm font-sans font-black tracking-wider uppercase text-slate-200 flex items-center justify-center gap-1">
                <span className="text-slate-300">jatuhan :</span>
                <span className={`font-mono font-black text-xs sm:text-sm md:text-base ${
                  redDropsCount > 0 ? "text-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]" : "text-slate-400"
                }`}>
                  {redDropsCount}X
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 grid-rows-3 gap-1 sm:gap-1.5 flex-1 w-full min-h-0">
              
              {/* Row 1, Col 1: BINAAN 1 (ORANGE) */}
              <div 
                className={`rounded-xl border flex items-center justify-center p-0.5 sm:p-1 transition-all overflow-hidden ${
                  state.redPenalties.binaan1
                    ? "border-orange-500/80 bg-orange-950/50 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                    : "border-red-900/60 bg-[#1c060c]"
                }`}
                title="Binaan 1"
              >
                <img 
                  src={state.redPenalties.binaan1 ? "/binaan1_orange.png" : "/binaan1.png"} 
                  alt="B1" 
                  className={`max-h-full max-w-full object-contain transition-all duration-200 ${
                    state.redPenalties.binaan1 
                      ? "opacity-100 filter drop-shadow-[0_0_16px_rgba(249,115,22,1)] scale-110 brightness-110" 
                      : "opacity-20 grayscale brightness-50 contrast-50"
                  }`} 
                  referrerPolicy="no-referrer" 
                />
              </div>

              {/* Row 1, Col 2: BINAAN 2 (ORANGE) */}
              <div 
                className={`rounded-xl border flex items-center justify-center p-0.5 sm:p-1 transition-all overflow-hidden ${
                  state.redPenalties.binaan2
                    ? "border-orange-500/80 bg-orange-950/50 shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                    : "border-red-900/60 bg-[#1c060c]"
                }`}
                title="Binaan 2"
              >
                <img 
                  src={state.redPenalties.binaan2 ? "/binaan2_orange.png" : "/binaan2.png"} 
                  alt="B2" 
                  className={`max-h-full max-w-full object-contain transition-all duration-200 ${
                    state.redPenalties.binaan2 
                      ? "opacity-100 filter drop-shadow-[0_0_16px_rgba(249,115,22,1)] scale-110 brightness-110" 
                      : "opacity-20 grayscale brightness-50 contrast-50"
                  }`} 
                  referrerPolicy="no-referrer" 
                />
              </div>

              {/* Row 2, Col 1: TEGURAN 1 (KUNING) */}
              <div 
                className={`rounded-xl border flex items-center justify-center p-0.5 sm:p-1 transition-all overflow-hidden ${
                  state.redPenalties.teguran1
                    ? "border-yellow-400/80 bg-yellow-950/50 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                    : "border-red-900/60 bg-[#1c060c]"
                }`}
                title="Teguran 1 (-1 Poin)"
              >
                <img 
                  src={state.redPenalties.teguran1 ? "/teguran1_yellow.png" : "/teguran1.png"} 
                  alt="T1" 
                  className={`max-h-full max-w-full object-contain transition-all duration-200 ${
                    state.redPenalties.teguran1 
                      ? "opacity-100 filter drop-shadow-[0_0_16px_rgba(250,204,21,1)] scale-110 brightness-115" 
                      : "opacity-20 grayscale brightness-50 contrast-50"
                  }`} 
                  referrerPolicy="no-referrer" 
                />
              </div>

              {/* Row 2, Col 2: TEGURAN 2 (KUNING) */}
              <div 
                className={`rounded-xl border flex items-center justify-center p-0.5 sm:p-1 transition-all overflow-hidden ${
                  state.redPenalties.teguran2
                    ? "border-yellow-400/80 bg-yellow-950/50 shadow-[0_0_15px_rgba(250,204,21,0.5)]"
                    : "border-red-900/60 bg-[#1c060c]"
                }`}
                title="Teguran 2 (-2 Poin)"
              >
                <img 
                  src={state.redPenalties.teguran2 ? "/teguran2_yellow.png" : "/teguran2.png"} 
                  alt="T2" 
                  className={`max-h-full max-w-full object-contain transition-all duration-200 ${
                    state.redPenalties.teguran2 
                      ? "opacity-100 filter drop-shadow-[0_0_16px_rgba(250,204,21,1)] scale-110 brightness-115" 
                      : "opacity-20 grayscale brightness-50 contrast-50"
                  }`} 
                  referrerPolicy="no-referrer" 
                />
              </div>

              {/* Row 3, Col 1: PERINGATAN 1 (MERAH BERKEDIP) */}
              <div 
                className={`rounded-xl border flex items-center justify-center p-0.5 sm:p-1 transition-all overflow-hidden ${
                  state.redPenalties.peringatan1
                    ? "border-red-500/80 bg-red-950/60 shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                    : "border-red-900/60 bg-[#1c060c]"
                }`}
                title="Peringatan 1 (-5 Poin)"
              >
                <img 
                  src={state.redPenalties.peringatan1 ? "/peringatan1_red.png" : "/peringatan1.png"} 
                  alt="P1" 
                  className={`max-h-full max-w-full object-contain transition-all duration-200 ${
                    state.redPenalties.peringatan1 
                      ? "opacity-100 filter drop-shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse scale-110 brightness-110" 
                      : "opacity-20 grayscale brightness-50 contrast-50"
                  }`} 
                  referrerPolicy="no-referrer" 
                />
              </div>

              {/* Row 3, Col 2: PERINGATAN 2 (MERAH BERKEDIP) */}
              <div 
                className={`rounded-xl border flex items-center justify-center p-0.5 sm:p-1 transition-all overflow-hidden ${
                  state.redPenalties.peringatan2
                    ? "border-red-500/80 bg-red-950/60 shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                    : "border-red-900/60 bg-[#1c060c]"
                }`}
                title="Peringatan 2 (-10 Poin)"
              >
                <img 
                  src={state.redPenalties.peringatan2 ? "/peringatan2_red.png" : "/peringatan2.png"} 
                  alt="P2" 
                  className={`max-h-full max-w-full object-contain transition-all duration-200 ${
                    state.redPenalties.peringatan2 
                      ? "opacity-100 filter drop-shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse scale-110 brightness-110" 
                      : "opacity-20 grayscale brightness-50 contrast-50"
                  }`} 
                  referrerPolicy="no-referrer" 
                />
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* 4. BOTTOM JURY MATRIX TABLE (PUNCH ROW & KICK ROW WITH CENTER ICONS) */}
      <section className="bg-[#020512]/95 border-2 border-blue-900/70 rounded-xl p-1 sm:p-1.5 shrink-0 px-1 sm:px-2 shadow-xl">
        <div className="grid grid-cols-12 gap-1 sm:gap-2 items-center">
          
          {/* LEFT: BLUE JURY 1, 2, 3 (COL-SPAN 5) */}
          <div className="col-span-5 grid grid-rows-2 gap-1">
            {/* Punch Row (J1, J2, J3) */}
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3].map((jId) => {
                const isPressed = getJuryPressState(jId, "BLUE", "PUNCH");
                return (
                  <div 
                    key={`m2-bj-punch-${jId}`}
                    className={`h-7 sm:h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs sm:text-sm transition-all duration-150 border ${
                      isPressed 
                        ? "bg-[#0284c7] text-white border-2 border-white shadow-[0_0_18px_rgba(2,132,199,1)] scale-105 ring-2 ring-cyan-300 animate-pulse" 
                        : "bg-[#08122c] text-blue-300/40 border-blue-950/60"
                    }`}
                  >
                    J{jId}
                  </div>
                );
              })}
            </div>
            {/* Kick Row (J1, J2, J3) */}
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3].map((jId) => {
                const isPressed = getJuryPressState(jId, "BLUE", "KICK");
                return (
                  <div 
                    key={`m2-bj-kick-${jId}`}
                    className={`h-7 sm:h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs sm:text-sm transition-all duration-150 border ${
                      isPressed 
                        ? "bg-[#0284c7] text-white border-2 border-white shadow-[0_0_18px_rgba(2,132,199,1)] scale-105 ring-2 ring-cyan-300 animate-pulse" 
                        : "bg-[#08122c] text-blue-300/40 border-blue-950/60"
                    }`}
                  >
                    J{jId}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENTER: TECHNIQUE ICONS (PUKULAN / TENDANGAN) (COL-SPAN 2) */}
          <div className="col-span-2 grid grid-rows-2 gap-1">
            {/* Punch Glove Icon */}
            <div className={`h-7 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
              isAnyPunchActive
                ? "bg-amber-500/30 border-2 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.8)] scale-105"
                : "bg-[#0a1538] border border-cyan-500/30 text-cyan-200"
            }`}>
              <img 
                src="/Punch.png" 
                alt="Punch" 
                className={`h-5 sm:h-6 object-contain filter invert transition-all duration-150 ${isAnyPunchActive ? "brightness-200 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,1)]" : "brightness-150"}`} 
                referrerPolicy="no-referrer" 
              />
            </div>
            {/* Kick Foot Icon */}
            <div className={`h-7 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
              isAnyKickActive
                ? "bg-amber-500/30 border-2 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.8)] scale-105"
                : "bg-[#0a1538] border border-cyan-500/30 text-cyan-200"
            }`}>
              <img 
                src="/Kick.png" 
                alt="Kick" 
                className={`h-5 sm:h-6 object-contain filter invert transition-all duration-150 ${isAnyKickActive ? "brightness-200 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,1)]" : "brightness-150"}`} 
                referrerPolicy="no-referrer" 
              />
            </div>
          </div>

          {/* RIGHT: RED JURY 1, 2, 3 (COL-SPAN 5) */}
          <div className="col-span-5 grid grid-rows-2 gap-1">
            {/* Punch Row (J1, J2, J3) */}
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3].map((jId) => {
                const isPressed = getJuryPressState(jId, "RED", "PUNCH");
                return (
                  <div 
                    key={`m2-rj-punch-${jId}`}
                    className={`h-7 sm:h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs sm:text-sm transition-all duration-150 border ${
                      isPressed 
                        ? "bg-[#dc2626] text-white border-2 border-white shadow-[0_0_18px_rgba(220,38,38,1)] scale-105 ring-2 ring-rose-300 animate-pulse" 
                        : "bg-[#24080e] text-rose-300/40 border-red-950/60"
                    }`}
                  >
                    J{jId}
                  </div>
                );
              })}
            </div>
            {/* Kick Row (J1, J2, J3) */}
            <div className="grid grid-cols-3 gap-1">
              {[1, 2, 3].map((jId) => {
                const isPressed = getJuryPressState(jId, "RED", "KICK");
                return (
                  <div 
                    key={`m2-rj-kick-${jId}`}
                    className={`h-7 sm:h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs sm:text-sm transition-all duration-150 border ${
                      isPressed 
                        ? "bg-[#dc2626] text-white border-2 border-white shadow-[0_0_18px_rgba(220,38,38,1)] scale-105 ring-2 ring-rose-300 animate-pulse" 
                        : "bg-[#24080e] text-rose-300/40 border-red-950/60"
                    }`}
                  >
                    J{jId}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* VERIFICATION OVERLAY IF TRIGGERED (ARENA LED MODERN - IPSI 2026) */}
      {state.verification && state.verification.active && (
        <div
          className="absolute inset-0 bg-[#02040d]/96 backdrop-blur-2xl flex flex-col justify-center items-center p-4 sm:p-6 z-50 text-center font-sans transition-opacity duration-300 animate-in fade-in select-none"
        >
          <div className="w-full max-w-2xl bg-gradient-to-b from-[#0a1844] via-[#040e2d] to-[#020514] border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.5)] flex flex-col items-center gap-3 relative overflow-hidden">
            {/* Top Gold Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse shadow-[0_0_15px_#f59e0b]" />

            <div className="p-3.5 sm:p-4 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.6)] animate-bounce">
              <Shield className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-400/50 text-amber-300 font-mono text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-inner">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              PROSES VERIFIKASI DEWAN AKTIF • REGULASI IPSI 2026
            </div>

            <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-wider">
              VERIFIKASI: {state.verification.type}
            </h2>

            {/* Corner Info */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-0.5">
              <span className={`px-4 py-1 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider ${
                state.verification.corner === "RED"
                  ? "bg-red-600 text-white border border-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.6)]"
                  : "bg-blue-600 text-white border border-cyan-300 shadow-[0_0_15px_rgba(37,99,235,0.6)]"
              }`}>
                SUDUT DITINJAU: {state.verification.corner === "RED" ? "MERAH" : "BIRU"} (
                {state.verification.corner === "RED" ? state.fighterRedName : state.fighterBlueName}
                )
              </span>
            </div>

            {state.verification.reason && (
              <div className="text-xs sm:text-sm text-slate-300 bg-[#03091e] border border-indigo-500/40 px-4 py-1.5 rounded-xl max-w-lg shadow-inner">
                <span className="text-amber-400 font-mono font-bold mr-1.5 uppercase">Kasus:</span>
                "{state.verification.reason}"
              </div>
            )}

            {/* Live Jury Votes status */}
            <div className="w-full mt-2">
              <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-widest block mb-2">
                RESPON KONSENSUS 3 JURI:
              </span>
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {[1, 2, 3].map((jId) => {
                  const vote = state.verification?.votes?.[jId];
                  const hasVoted = !!vote;
                  return (
                    <div 
                      key={`m2-vj-${jId}`}
                      className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center transition-all duration-200 ${
                        hasVoted 
                          ? vote === "MERAH"
                            ? "bg-red-950/80 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                            : vote === "BIRU"
                            ? "bg-blue-950/80 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                            : "bg-slate-900 border-amber-400 text-amber-300 shadow-md"
                          : "bg-[#030818] border-indigo-950/80 text-slate-500 animate-pulse"
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-black uppercase">JURI {jId}</span>
                      <span className="text-[10px] sm:text-xs mt-1 font-mono font-bold">
                        {hasVoted ? (vote === "MERAH" ? "🔴 MERAH" : vote === "BIRU" ? "🔵 BIRU" : "⚪ TIDAK SAH") : "⏳ Menunggu..."}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live consensus calculation */}
            {(() => {
              const votes = state.verification?.votes || {};
              const list = [votes[1], votes[2], votes[3]].filter(Boolean);
              const countMerah = list.filter((v) => v === "MERAH").length;
              const countBiru = list.filter((v) => v === "BIRU").length;
              const countTidakSah = list.filter((v) => v === "TIDAK SAH").length;
              const isConsensus = countMerah >= 2 || countBiru >= 2 || countTidakSah >= 2;

              return (
                <div className="mt-2 w-full">
                  {isConsensus ? (
                    <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-400 text-emerald-300 font-mono text-xs font-black uppercase tracking-wider animate-pulse shadow-[0_0_20px_rgba(0, 128, 0,0.4)]">
                      ✅ MAYORITAS TERCAPAI • MENUNGGU PENGESAHAN DEWAN
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-[#030a1c] border border-cyan-500/30 text-slate-400 font-mono text-[11px]">
                      {list.length}/3 Suara Juri Masuk (Diperlukan minimal 2 suara sepadan)
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* VERIFICATION RESULT OVERLAY (5 SECOND BROADCAST FOR AUDIENCE) */}
      {showResultOverlay && localVerificationResult && !state.verification?.active && (
        <div
          className="absolute inset-0 bg-[#02040d]/96 backdrop-blur-2xl flex flex-col justify-center items-center p-4 sm:p-6 z-50 text-center font-sans transition-opacity duration-300 animate-in fade-in select-none"
        >
          <div className="w-full max-w-xl bg-gradient-to-b from-[#0c2356] via-[#051336] to-[#020614] border-2 border-emerald-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(0, 128, 0,0.5)] flex flex-col items-center gap-3 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 animate-pulse shadow-[0_0_15px_#008000]" />

            <div className="p-3.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400 shadow-[0_0_25px_rgba(0, 128, 0,0.6)] animate-bounce">
              <Award className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <h3 className="text-sm sm:text-base font-mono font-black text-amber-300 uppercase tracking-widest">
              KEPUTUSAN RESMI DEWAN PERTANDINGAN (IPSI 2026)
            </h3>

            <div className={`p-4 rounded-2xl border-2 w-full text-center my-1 ${
              localVerificationResult.result === "MERAH"
                ? "bg-red-950/80 border-rose-400 text-white shadow-[0_0_30px_rgba(244,63,94,0.6)]"
                : localVerificationResult.result === "BIRU"
                ? "bg-blue-950/80 border-cyan-400 text-white shadow-[0_0_30px_rgba(6,182,212,0.6)]"
                : "bg-slate-900 border-amber-400 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.4)]"
            }`}>
              <div className="text-xs font-mono font-bold opacity-80 uppercase tracking-wider mb-1">
                HASIL KEPUTUSAN KONSENSUS:
              </div>
              <div className="text-xl sm:text-2xl font-black uppercase tracking-wider">
                {localVerificationResult.result === "MERAH"
                  ? `🔴 SAH SUDUT MERAH ${localVerificationResult.type === "JATUHAN" ? "(+3 POIN)" : ""}`
                  : localVerificationResult.result === "BIRU"
                  ? `🔵 SAH SUDUT BIRU ${localVerificationResult.type === "JATUHAN" ? "(+3 POIN)" : ""}`
                  : "⚪ TIDAK SAH (DIBATALKAN)"}
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              Layar akan kembali ke papan skor dalam <span className="text-amber-300 font-bold">{countdownSeconds}</span> detik...
            </div>
          </div>
        </div>
      )}

      {/* 4.5 ARENA INTERMISSION (JEDA ANTAR BABAK) OVERLAY */}
      {state.showRoundOverPopup && state.status !== MatchStatus.RUNNING && !isMatchOver && (
        <div
          className="absolute inset-0 z-45 bg-[#020514]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 select-none font-sans transition-all duration-300 animate-in fade-in"
        >
          <div className="w-full max-w-2xl bg-gradient-to-b from-[#1c1204] via-[#0b0802] to-[#040c26] border-2 border-amber-400/80 rounded-3xl p-8 shadow-[0_0_80px_rgba(245,158,11,0.4)] flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse" />
            
            <div className="p-4 rounded-full bg-amber-500/20 text-amber-400 border border-amber-400/50 shadow-[0_0_25px_rgba(245,158,11,0.5)] animate-bounce mb-3">
              <Clock className="w-12 h-12" />
            </div>

            <div className="text-amber-300 font-mono text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 mb-2">
              JEDA ISTIRAHAT ANTAR BABAK
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-wider">
              WAKTU BABAK {state.activeRound} SELESAI
            </h2>

            <p className="text-xs sm:text-sm font-semibold text-amber-100/90 mt-2 max-w-lg leading-relaxed">
              Babak {state.activeRound} telah tuntas. Para pesilat dipersilakan menuju sudut masing-masing untuk istirahat dan evaluasi pelatih.
            </p>

            <div className="mt-5 flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold shadow-inner">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span>MENUNGGU PERSIAPAN BABAK {state.activeRound + 1} DARI SEKRETARIS PERTANDINGAN</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. ARENA LED WINNER CELEBRATION OVERLAY */}
      {isMatchOver && determinedWinnerColor && !hideWinnerOverlay && (
        <div
          className="absolute inset-0 z-50 bg-[#020514]/95 backdrop-blur-2xl flex flex-col items-center justify-between p-3 sm:p-5 md:p-6 select-none overflow-hidden font-sans border-4 border-yellow-400/80 rounded-[20px] shadow-[0_0_100px_rgba(234,179,8,0.5)] transition-all duration-300 animate-in fade-in"
          style={{
            background: determinedWinnerColor === "RED"
              ? "radial-gradient(ellipse at 50% 30%, #450a0a 0%, #1c0407 50%, #03040c 100%)"
              : "radial-gradient(ellipse at 50% 30%, #082f49 0%, #0c1c38 50%, #03040c 100%)"
          }}
        >
            {/* Ambient Top Glow */}
            <div className="absolute -top-32 inset-x-0 h-72 bg-gradient-to-b from-yellow-400/20 via-cyan-400/10 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-500 animate-pulse" />

            {/* Top Match Metadata Bar */}
            <div className="w-full flex items-center justify-between gap-2 px-2 z-10 shrink-0">
              <div className="w-12 sm:w-16 h-10 sm:h-12 flex items-center justify-center shrink-0">
                <img 
                  src="/logomonitor1.png" 
                  alt="Logo" 
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.src = "/jrzscoreutama.png"; }}
                />
              </div>

              <div className="bg-gradient-to-r from-[#122b68] via-[#1d4ed8] to-[#122b68] border-2 border-cyan-400/60 rounded-full px-4 sm:px-8 py-1 shadow-[0_0_25px_rgba(29,78,216,0.6)] text-center max-w-2xl truncate">
                <div className="text-white font-black text-xs sm:text-sm tracking-widest uppercase truncate">
                  {eventName}
                </div>
                <div className="text-cyan-200 font-extrabold text-[9px] sm:text-xs tracking-wider uppercase truncate">
                  PARTAI {partaiNum} | {divisionLabel} | {classLabel} - {genderLabel} | {stageLabel} | {arenaName}
                </div>
              </div>

              <div className="w-12 sm:w-16 h-10 sm:h-12 flex items-center justify-center shrink-0">
                <img 
                  src="/logomonitor2.png" 
                  alt="Logo" 
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.src = "/jrzscoreutama.png"; }}
                />
              </div>
            </div>

            {/* Center Winner Presentation Arena */}
            <div className="my-auto flex flex-col items-center justify-center text-center max-w-4xl w-full px-4 z-10">
              {/* Golden Trophy Icon */}
              <div className="relative mb-2 sm:mb-3">
                <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-2xl animate-pulse" />
                <div className="relative p-3.5 sm:p-5 rounded-full bg-gradient-to-b from-yellow-400 via-amber-500 to-yellow-600 border-2 border-yellow-200 text-[#0f172a] shadow-[0_0_50px_rgba(250,204,21,0.8)] flex items-center justify-center">
                  <Trophy className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 text-yellow-950 fill-yellow-950 drop-shadow-md animate-bounce" />
                </div>
              </div>

              {/* Title Header */}
              <div className="flex items-center gap-2 text-yellow-400 font-black text-xs sm:text-sm md:text-base tracking-[0.25em] uppercase drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]">
                <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
                <span>PEMENANG PERTANDINGAN</span>
                <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
              </div>

              {/* Corner Badge (SUDUT BIRU / SUDUT MERAH) */}
              <div className="mt-2 mb-2 sm:mb-3">
                {determinedWinnerColor === "BLUE" ? (
                  <div className="inline-flex items-center gap-2 px-6 sm:px-8 py-1.5 rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white font-black text-sm sm:text-base md:text-lg tracking-widest uppercase border-2 border-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.8)]">
                    <Crown className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                    <span>SUDUT BIRU</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-6 sm:px-8 py-1.5 rounded-full bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 text-white font-black text-sm sm:text-base md:text-lg tracking-widest uppercase border-2 border-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.8)]">
                    <Crown className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                    <span>SUDUT MERAH</span>
                  </div>
                )}
              </div>

              {/* Athlete Winner Name */}
              <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-wider leading-tight drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)] max-w-3xl truncate">
                {winnerName}
              </h2>

              {/* Winner Contingent / Club */}
              <div className="text-sm sm:text-base md:text-2xl font-extrabold text-cyan-200 uppercase tracking-widest mt-1 drop-shadow-md">
                {winnerClub}
              </div>

              {/* METODE KEMENANGAN (GOLDEN LED CAPSULE) */}
              <div className="mt-3 sm:mt-4 flex flex-col items-center">
                <div className="text-[10px] sm:text-xs font-bold text-yellow-200/80 tracking-widest uppercase mb-1">
                  KEPUTUSAN & METODE KEMENANGAN
                </div>
                <div className="px-5 sm:px-8 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-yellow-950/90 via-amber-900/90 to-yellow-950/90 border-2 border-yellow-400 text-yellow-300 font-black text-sm sm:text-base md:text-xl lg:text-2xl tracking-widest uppercase shadow-[0_0_35px_rgba(250,204,21,0.7)] text-center animate-pulse">
                  🏆 {determinedVictoryMethod}
                </div>
              </div>

              {/* Final Score Breakdown */}
              <div className="mt-3 sm:mt-4 flex items-center justify-center gap-3 sm:gap-6 bg-[#020512]/90 border border-slate-700/80 rounded-2xl px-4 sm:px-6 py-1.5 sm:py-2 shadow-inner">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-black text-cyan-400">BIRU:</span>
                  <span className="font-mono font-black text-base sm:text-xl md:text-2xl text-cyan-300">{state.scoreBlue}</span>
                </div>
                <div className="text-slate-600 font-bold">|</div>
                <div className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                  SKOR AKHIR
                </div>
                <div className="text-slate-600 font-bold">|</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-base sm:text-xl md:text-2xl text-rose-300">{state.scoreRed}</span>
                  <span className="text-[10px] sm:text-xs font-black text-rose-400">:MERAH</span>
                </div>
              </div>
            </div>

            {/* Bottom Controls / Toggle */}
            <div className="w-full flex items-center justify-between px-2 pt-1 z-10 shrink-0">
              <div className="text-[9px] sm:text-xs text-slate-400 font-mono tracking-wider">
                SISTEM SKOR DIGITAL PENCAK SILAT INDONESIA
              </div>
              <button
                type="button"
                onClick={() => setHideWinnerOverlay(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Lihat Matriks Skor</span>
              </button>
            </div>
          </div>
        )}

      {/* Mini Reopen Winner Button if dismissed */}
      {isMatchOver && determinedWinnerColor && hideWinnerOverlay && (
        <button
          type="button"
          onClick={() => setHideWinnerOverlay(false)}
          className="fixed bottom-4 right-4 z-40 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:to-amber-300 text-slate-950 font-sans font-black text-xs sm:text-sm px-4 py-2 rounded-xl shadow-[0_0_25px_rgba(250,204,21,0.8)] border-2 border-yellow-200 flex items-center gap-2 transition-all active:scale-95 animate-bounce cursor-pointer"
        >
          <Trophy className="w-4 h-4 fill-slate-950 text-slate-950" />
          <span>Tampilkan Visual Pemenang</span>
        </button>
      )}

      {/* 6. PARTAI YANG AKAN BERTANDING SELANJUTNYA (UP NEXT MATCH POP-UP OVERLAY) */}
      {isNextMatchActive && (
        <div
          className="absolute inset-0 z-50 bg-[#020514]/95 backdrop-blur-2xl flex flex-col items-center justify-between p-3 sm:p-5 md:p-6 select-none overflow-hidden font-sans border-4 border-cyan-400/80 rounded-[20px] shadow-[0_0_100px_rgba(6,182,212,0.45)] transition-all duration-300 animate-in fade-in"
          style={{
            background: "radial-gradient(ellipse at 50% 25%, #08244c 0%, #061530 45%, #020512 100%)"
          }}
        >
            {/* Ambient Top Glow */}
            <div className="absolute -top-32 inset-x-0 h-72 bg-gradient-to-b from-cyan-400/25 via-blue-500/10 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-500 via-yellow-400 to-cyan-500 animate-pulse" />

            {/* Top Match Metadata Bar */}
            <div className="w-full flex items-center justify-between gap-2 px-2 z-10 shrink-0">
              <div className="w-12 sm:w-16 h-10 sm:h-12 flex items-center justify-center shrink-0">
                <img 
                  src="/logomonitor1.png" 
                  alt="Logo" 
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.src = "/jrzscoreutama.png"; }}
                />
              </div>

              <div className="bg-gradient-to-r from-[#0c2356] via-[#1d4ed8] to-[#0c2356] border-2 border-cyan-400/70 rounded-full px-4 sm:px-8 py-1 shadow-[0_0_25px_rgba(29,78,216,0.6)] text-center max-w-2xl truncate">
                <div className="text-white font-black text-xs sm:text-sm tracking-widest uppercase truncate">
                  {eventName}
                </div>
                <div className="text-cyan-200 font-extrabold text-[9px] sm:text-xs tracking-wider uppercase truncate">
                  {arenaName} | {divisionLabel} | {classLabel} - {genderLabel} | {stageLabel}
                </div>
              </div>

              <div className="w-12 sm:w-16 h-10 sm:h-12 flex items-center justify-center shrink-0">
                <img 
                  src="/logomonitor2.png" 
                  alt="Logo" 
                  className="max-h-full max-w-full object-contain filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.src = "/jrzscoreutama.png"; }}
                />
              </div>
            </div>

            {/* Center Content: Big Up Next Presentation Arena */}
            <div className="my-auto flex flex-col items-center justify-center text-center max-w-5xl w-full px-2 sm:px-4 z-10">
              {/* Header Badge */}
              <div className="inline-flex items-center gap-2 px-5 sm:px-7 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm md:text-base tracking-[0.2em] uppercase border-2 border-yellow-200 shadow-[0_0_30px_rgba(250,204,21,0.7)] animate-pulse mb-3 sm:mb-4">
                <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 fill-slate-950" />
                <span>PARTAI YANG AKAN BERTANDING SELANJUTNYA</span>
                <Swords className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 fill-slate-950" />
              </div>

              {/* Big Partai Number Header */}
              <div className="text-2xl sm:text-3xl md:text-5xl font-black text-white uppercase tracking-wider leading-none drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)] mb-4 sm:mb-6 flex items-center justify-center gap-3">
                <span className="text-cyan-400">PARTAI</span>
                <span className="text-[#facc15] font-mono">{partaiNum}</span>
              </div>

              {/* Fighter VS Matchup Arena Card Grid */}
              <div className="w-full grid grid-cols-1 md:grid-cols-11 gap-3 sm:gap-4 items-center">
                {/* SUDUT BIRU CARD (Col 5) */}
                <div className="md:col-span-5 bg-gradient-to-b from-[#034475]/90 to-[#021c3b]/95 border-2 border-cyan-400/80 rounded-2xl p-3 sm:p-5 flex flex-col items-center text-center shadow-[0_0_35px_rgba(2,132,199,0.45)] relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500" />
                  <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-[10px] sm:text-xs tracking-widest uppercase border border-cyan-300 shadow-md mb-2 sm:mb-3">
                    <Shield className="w-3.5 h-3.5 fill-cyan-200 text-cyan-200" />
                    <span>SUDUT BIRU</span>
                  </div>

                  <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl bg-[#06335a] border-2 border-cyan-300/60 flex items-center justify-center text-cyan-200 shadow-inner mb-2 sm:mb-3">
                    <User className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />
                  </div>

                  <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white uppercase tracking-wider leading-tight drop-shadow-md max-w-full truncate px-1">
                    {state.fighterBlueName || "PESILAT BIRU"}
                  </h3>

                  <div className="mt-1 sm:mt-1.5 text-xs sm:text-sm md:text-base font-extrabold text-cyan-300 uppercase tracking-widest bg-[#021327]/80 border border-cyan-500/40 rounded-xl px-3 sm:px-4 py-1 truncate max-w-full">
                    {state.fighterBlueClub || "KONTINGEN BIRU"}
                  </div>
                </div>

                {/* VS BADGE (Col 1) */}
                <div className="md:col-span-1 flex flex-col items-center justify-center my-1 md:my-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 border-2 border-yellow-200 flex items-center justify-center font-black text-slate-950 font-sans text-sm sm:text-base shadow-[0_0_30px_rgba(250,204,21,0.9)] animate-pulse">
                    VS
                  </div>
                  <span className="text-[9px] font-mono font-bold text-yellow-300 uppercase tracking-widest mt-1 hidden md:block">
                    TANDING
                  </span>
                </div>

                {/* SUDUT MERAH CARD (Col 5) */}
                <div className="md:col-span-5 bg-gradient-to-b from-[#6b0f1a]/90 to-[#2e050b]/95 border-2 border-rose-400/80 rounded-2xl p-3 sm:p-5 flex flex-col items-center text-center shadow-[0_0_35px_rgba(220,38,38,0.45)] relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-rose-400" />
                  <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-gradient-to-r from-rose-600 to-red-600 text-white font-black text-[10px] sm:text-xs tracking-widest uppercase border border-rose-300 shadow-md mb-2 sm:mb-3">
                    <Shield className="w-3.5 h-3.5 fill-rose-200 text-rose-200" />
                    <span>SUDUT MERAH</span>
                  </div>

                  <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl bg-[#4a0812] border-2 border-rose-300/60 flex items-center justify-center text-rose-200 shadow-inner mb-2 sm:mb-3">
                    <User className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />
                  </div>

                  <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white uppercase tracking-wider leading-tight drop-shadow-md max-w-full truncate px-1">
                    {state.fighterRedName || "PESILAT MERAH"}
                  </h3>

                  <div className="mt-1 sm:mt-1.5 text-xs sm:text-sm md:text-base font-extrabold text-rose-300 uppercase tracking-widest bg-[#200307]/80 border border-rose-500/40 rounded-xl px-3 sm:px-4 py-1 truncate max-w-full">
                    {state.fighterRedClub || "KONTINGEN MERAH"}
                  </div>
                </div>
              </div>

              {/* Waiting for Secretary Start Status Indicator */}
              <div className="mt-4 sm:mt-6 inline-flex items-center gap-2 bg-[#020512]/90 border border-yellow-500/50 rounded-2xl px-5 sm:px-7 py-2 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[11px] sm:text-xs md:text-sm font-sans font-black uppercase tracking-wider text-[#facc15]">
                  Menunggu Dimulai Oleh Sekretaris Pertandingan...
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 hidden sm:inline">
                  (Otomatis tertutup saat tombol Mulai ditekan)
                </span>
              </div>
            </div>

            {/* Bottom Controls / Toggle */}
            <div className="w-full flex items-center justify-between px-2 pt-1 z-10 shrink-0">
              <div className="text-[9px] sm:text-xs text-slate-400 font-mono tracking-wider">
                SISTEM SKOR DIGITAL PENCAK SILAT INDONESIA
              </div>
              <button
                type="button"
                onClick={() => setHideNextMatchOverlay(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Lihat Matriks Skor</span>
              </button>
            </div>
          </div>
        )}

      {/* Mini Reopen Next Match Button if dismissed */}
      {isNextMatchEligible && hideNextMatchOverlay && (
        <button
          type="button"
          onClick={() => setHideNextMatchOverlay(false)}
          className="fixed bottom-4 left-4 z-40 bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 hover:from-cyan-500 hover:to-blue-500 text-white font-sans font-black text-xs sm:text-sm px-4 py-2 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.8)] border-2 border-cyan-300 flex items-center gap-2 transition-all active:scale-95 animate-bounce cursor-pointer"
        >
          <Swords className="w-4 h-4 fill-white text-white" />
          <span>Tampilkan Info Partai Selanjutnya</span>
        </button>
      )}
    </div>
  );
}
