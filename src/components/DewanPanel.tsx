/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { MatchState, MatchStatus, MatchLog } from "../types";
import { DigitalTimer } from "./DigitalTimer";
import { rtdbScoringEngine } from "../services/rtdbScoringEngine";
const defaultLogo = "/jrzscoreutama.png";
import { 
  Play, 
  Pause, 
  ChevronRight, 
  RefreshCw, 
  Settings, 
  ShieldAlert, 
  Award, 
  FileText, 
  CheckCircle2, 
  Hand, 
  Users, 
  UserSquare2, 
  Ban, 
  Shield, 
  Volume2,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Lock,
  AlertTriangle,
  Battery,
  BatteryCharging,
  Download,
  AlertCircle,
  X,
  Check,
  Delete
} from "lucide-react";

export function DeviceBatteryIndicator() {
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    let batteryObj: any = null;

    const handleLevelChange = () => {
      if (batteryObj && active) {
        setBatteryLevel(Math.round(batteryObj.level * 100));
      }
    };

    const handleChargingChange = () => {
      if (batteryObj && active) {
        setIsCharging(batteryObj.charging);
      }
    };

    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        if (!active) return;
        batteryObj = battery;
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);

        battery.addEventListener("levelchange", handleLevelChange);
        battery.addEventListener("chargingchange", handleChargingChange);
      }).catch((err: any) => {
        console.warn("Battery API error:", err);
        if (active) {
          setBatteryLevel(98);
          setIsCharging(false);
        }
      });
    } else {
      // Fallback
      setBatteryLevel(98);
      setIsCharging(false);
    }

    return () => {
      active = false;
      if (batteryObj) {
        batteryObj.removeEventListener("levelchange", handleLevelChange);
        batteryObj.removeEventListener("chargingchange", handleChargingChange);
      }
    };
  }, []);

  if (batteryLevel === null) return null;

  return (
    <div className="flex items-center gap-1.5 bg-[#0e0626] border border-indigo-500/15 px-2 py-1 rounded-lg text-slate-300 font-mono text-[10px] md:text-[11px] font-black shadow-inner" title={isCharging ? "Mengisi Daya" : "Level Baterai"}>
      {isCharging ? (
        <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
      ) : (
        <Battery className={`w-3.5 h-3.5 ${batteryLevel <= 20 ? "text-rose-500 animate-bounce" : batteryLevel <= 50 ? "text-amber-400" : "text-emerald-400"}`} />
      )}
      <span>{batteryLevel}%</span>
    </div>
  );
}

interface DewanPanelProps {
  state: MatchState;
  onTimerCommand: (command: "START" | "PAUSE" | "ADD_10" | "SUB_10") => void;
  onRoundAction: (action: "NEXT" | "SET" | "FINISH", targetRound?: number) => void;
  onDewanAction: (actionData: { command: "DROP" | "LOCK" | "PENALTY" | "OVERRIDE" | "CANCEL_DROP" | "DECLARE_VICTORY"; fighter: "RED" | "BLUE"; penaltyType?: string; overridePoints?: number }) => void;
  onUpdateMetadata: (data: Partial<MatchState>) => void;
  onResetMatch: () => void;
  onStartVerification?: (type: "JATUHAN" | "PELANGGARAN", corner?: "RED" | "BLUE", reason?: string) => void;
  onResetVerification?: () => void;
  onApplyVerification?: (decision?: "MERAH" | "BIRU" | "TIDAK SAH") => void;
  onBack?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

// Inline Web Audio synth helper for click sound effects
function playClickSound(freq = 880, duration = 0.06) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Suppress Web Audio errors if gesture bound
  }
}

// IPSI Regulation Custom Solid SVG Penalty Gestures
function IconBinaan1({ className, active }: { className?: string; active?: boolean }) {
  return (
    <img 
      src={active ? "/binaan1_orange.png" : "/binaan1.png"} 
      alt="Binaan 1" 
      className={`${className} object-contain`} 
      referrerPolicy="no-referrer"
    />
  );
}

function IconBinaan2({ className, active }: { className?: string; active?: boolean }) {
  return (
    <img 
      src={active ? "/binaan2_orange.png" : "/binaan2.png"} 
      alt="Binaan 2" 
      className={`${className} object-contain`} 
      referrerPolicy="no-referrer"
    />
  );
}

function IconTeguran1({ className, active }: { className?: string; active?: boolean }) {
  return (
    <img 
      src={active ? "/teguran1_yellow.png" : "/teguran1.png"} 
      alt="Teguran 1" 
      className={`${className} object-contain`} 
      referrerPolicy="no-referrer"
    />
  );
}

function IconTeguran2({ className, active }: { className?: string; active?: boolean }) {
  return (
    <img 
      src={active ? "/teguran2_yellow.png" : "/teguran2.png"} 
      alt="Teguran 2" 
      className={`${className} object-contain`} 
      referrerPolicy="no-referrer"
    />
  );
}

function IconPeringatan1({ className, active }: { className?: string; active?: boolean }) {
  return (
    <img 
      src={active ? "/peringatan1_red.png" : "/peringatan1.png"} 
      alt="Peringatan 1" 
      className={`${className} object-contain`} 
      referrerPolicy="no-referrer"
    />
  );
}

function IconPeringatan2({ className, active }: { className?: string; active?: boolean }) {
  return (
    <img 
      src={active ? "/peringatan2_red.png" : "/peringatan2.png"} 
      alt="Peringatan 2" 
      className={`${className} object-contain`} 
      referrerPolicy="no-referrer"
    />
  );
}

// Custom High-Fidelity component for the JRZ Score Dewan Logo matching the design
function DiscorsLogo() {
  return (
    <div 
      className="flex flex-col items-center justify-center select-none py-1 w-full cursor-pointer group" 
      id="discors-logo-component"
      onClick={() => {
        window.dispatchEvent(new CustomEvent("jrz_navigate_tab", { detail: "BERANDA" }));
      }}
      title="Kembali ke Beranda JRZ SCORE"
    >
      <img
        src="/jrzscoreutama.png"
        alt="Logo JRZ Score Dewan"
        className="w-auto h-20 sm:h-24 md:h-28 max-h-28 max-w-[92%] object-contain filter drop-shadow-[0_0_22px_rgba(255,255,255,0.35)] transition-all duration-300 transform group-hover:scale-105 active:scale-95"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

// Animated score display with dynamic glow and point flash effects for Dewan Panel (Arena LED Modern)
function DewanScoreDisplay({ score, color }: { score: number; color: "BLUE" | "RED" }) {
  const prevScoreRef = React.useRef(score);
  const [pointDelta, setPointDelta] = useState<number | null>(null);
  const [isGlowing, setIsGlowing] = useState(false);
  const [animTrigger, setAnimTrigger] = useState(0);

  useEffect(() => {
    const prev = prevScoreRef.current;
    if (score > prev) {
      const diff = score - prev;
      setPointDelta(diff);
      setIsGlowing(true);
      setAnimTrigger((t) => t + 1);

      const timer = setTimeout(() => {
        setIsGlowing(false);
        setPointDelta(null);
      }, 1000);

      prevScoreRef.current = score;
      return () => clearTimeout(timer);
    } else {
      prevScoreRef.current = score;
    }
  }, [score]);

  return (
    <div className="relative flex flex-col justify-center items-center text-center py-1 select-none w-full">
      {isGlowing && (
        <div
          key={`dewan-flare-${animTrigger}`}
          className={`absolute w-36 h-36 rounded-full pointer-events-none filter blur-xl transition-all duration-700 animate-ping opacity-75 ${
            color === "BLUE"
              ? "bg-cyan-400 shadow-[0_0_40px_rgba(6,182,212,0.8)]"
              : "bg-amber-300 shadow-[0_0_40px_rgba(251,191,36,0.8)]"
          }`}
        />
      )}

      {pointDelta !== null && (
        <div
          key={`dewan-delta-${animTrigger}`}
          className={`absolute -top-3 font-sans font-black text-sm md:text-base tracking-wider pointer-events-none px-3 py-0.5 rounded-full z-20 shadow-xl border animate-bounce transition-all ${
            color === "BLUE"
              ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 border-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.9)]"
              : "bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-950 border-yellow-200 shadow-[0_0_20px_rgba(251,191,36,0.9)]"
          }`}
        >
          +{pointDelta}
        </div>
      )}

      <span
        key={`dewan-score-${score}`}
        className={`text-6xl md:text-7xl lg:text-8xl font-digital font-black leading-none tracking-tighter z-10 transition-all duration-200 transform ${
          isGlowing ? "scale-110" : "scale-100"
        } ${
          color === "BLUE"
            ? isGlowing
              ? "text-cyan-300 drop-shadow-[0_0_25px_rgba(6,182,212,1)] drop-shadow-[0_0_50px_rgba(37,99,235,0.9)]"
              : "text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.85)] drop-shadow-[0_0_35px_rgba(37,99,235,0.5)]"
            : isGlowing
            ? "text-amber-300 drop-shadow-[0_0_25px_rgba(251,191,36,1)] drop-shadow-[0_0_50px_rgba(239,68,68,0.9)]"
            : "text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.85)] drop-shadow-[0_0_35px_rgba(239,68,68,0.5)]"
        }`}
      >
        {score}
      </span>
    </div>
  );
}

export function DewanPanel({
  state,
  onTimerCommand,
  onRoundAction,
  onDewanAction,
  onUpdateMetadata,
  onResetMatch,
  onStartVerification,
  onResetVerification,
  onApplyVerification,
  onBack,
  onToggleFullscreen,
  isFullscreen
}: DewanPanelProps) {
  // Local state for editing metadata
  const [isEditing, setIsEditing] = useState(false);
  const [eventName, setEventName] = useState(state.eventName || "PAKU BANTEN CHAMPIONSHIP");
  const [fighterRedName, setFighterRedName] = useState(state.fighterRedName);
  const [fighterRedClub, setFighterRedClub] = useState(state.fighterRedClub);
  const [fighterBlueName, setFighterBlueName] = useState(state.fighterBlueName);
  const [fighterBlueClub, setFighterBlueClub] = useState(state.fighterBlueClub);
  const [classCategory, setClassCategory] = useState(state.classCategory);
  const [matchNumber, setMatchNumber] = useState(state.matchNumber);
  const [roundDuration, setRoundDuration] = useState(state.roundDuration);

  const [controlsVisible, setControlsVisible] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
    };
  }, []);

  // Victory declaration custom states for cyan button "TEKNIK-MUTLAK-WMP-UD"
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [selectedVictoryType, setSelectedVictoryType] = useState<"TEKNIK" | "MUTLAK" | "DISKUALIFIKASI" | "WO" | "TIDAK_DAPAT_MELANJUTKAN" | null>(null);
  const [victoryWinner, setVictoryWinner] = useState<"BLUE" | "RED" | null>(null);

  // Mode Cek Nilai ("FINAL_ROUND" | "INTERMISSION" | null)
  const [checkingScoresMode, setCheckingScoresMode] = useState<"FINAL_ROUND" | "INTERMISSION" | null>(null);

  // Auto reset checkingScoresMode when match starts running again or round changes
  useEffect(() => {
    if (state.status === MatchStatus.RUNNING) {
      setCheckingScoresMode(null);
    }
  }, [state.status, state.activeRound, state.matchNumber]);

  // Round status logic
  const totalRounds = state.roundCount || 3;
  const isFinalRound = state.activeRound >= totalRounds;
  const isFinalRoundOver = (state.status === MatchStatus.FINISHED) || (isFinalRound && (state.timeLeft <= 0 || (state.status === MatchStatus.PAUSED && state.timeLeft === 0)));
  const isIntermission = Boolean(state.showRoundOverPopup) && state.status !== MatchStatus.RUNNING && !isFinalRoundOver;

  // Leader / Winner calculation for direct announcement
  const computedLeader = useMemo(() => {
    // 1. Disqualification check
    if (state.redPenalties?.disqualified && !state.bluePenalties?.disqualified) {
      return { winner: "BLUE" as const, method: "DISKUALIFIKASI LAWAN (SUDUT MERAH)" };
    }
    if (state.bluePenalties?.disqualified && !state.redPenalties?.disqualified) {
      return { winner: "RED" as const, method: "DISKUALIFIKASI LAWAN (SUDUT BIRU)" };
    }
    // 2. Winner method already recorded in state
    if (state.winnerColor) {
      return {
        winner: state.winnerColor as "RED" | "BLUE",
        method: state.winnerMethod || (state.scoreRed !== state.scoreBlue ? "MENANG ANGKA / MUTLAK" : "KEPUTUSAN DEWAN")
      };
    }
    // 3. By scores
    if (state.scoreRed > state.scoreBlue) {
      const diff = state.scoreRed - state.scoreBlue;
      const method = diff >= 30 ? "MENANG SELISIH 30 ANGKA (WMP)" : "MENANG ANGKA / MUTLAK";
      return { winner: "RED" as const, method };
    }
    if (state.scoreBlue > state.scoreRed) {
      const diff = state.scoreBlue - state.scoreRed;
      const method = diff >= 30 ? "MENANG SELISIH 30 ANGKA (WMP)" : "MENANG ANGKA / MUTLAK";
      return { winner: "BLUE" as const, method };
    }
    // 4. Tie: Fewest penalty points
    let redPenPoints = 0;
    if (state.redPenalties?.teguran1) redPenPoints += 1;
    if (state.redPenalties?.teguran2) redPenPoints += 2;
    if (state.redPenalties?.peringatan1) redPenPoints += 5;
    if (state.redPenalties?.peringatan2) redPenPoints += 10;
    redPenPoints += state.redStats?.pastPenaltiesDeductions || 0;

    let bluePenPoints = 0;
    if (state.bluePenalties?.teguran1) bluePenPoints += 1;
    if (state.bluePenalties?.teguran2) bluePenPoints += 2;
    if (state.bluePenalties?.peringatan1) bluePenPoints += 5;
    if (state.bluePenalties?.peringatan2) bluePenPoints += 10;
    bluePenPoints += state.blueStats?.pastPenaltiesDeductions || 0;

    if (redPenPoints < bluePenPoints) {
      return { winner: "RED" as const, method: "NILAI SERI - LEBIH SEDIKIT HUKUMAN" };
    }
    if (bluePenPoints < redPenPoints) {
      return { winner: "BLUE" as const, method: "NILAI SERI - LEBIH SEDIKIT HUKUMAN" };
    }
    return { winner: "RED" as const, method: "KEPUTUSAN DEWAN / TIE-BREAKER" };
  }, [state.redPenalties, state.bluePenalties, state.winnerColor, state.winnerMethod, state.scoreRed, state.scoreBlue, state.redStats, state.blueStats]);

  const handleDirectAnnounceWinner = () => {
    playClickSound(1200, 0.2);
    onDewanAction({
      command: "DECLARE_VICTORY",
      fighter: computedLeader.winner,
      penaltyType: computedLeader.method
    });
    setCheckingScoresMode(null);
  };

  const getVictoryTypeLabel = (type: "TEKNIK" | "MUTLAK" | "DISKUALIFIKASI" | "WO" | "TIDAK_DAPAT_MELANJUTKAN" | null) => {
    switch (type) {
      case "TEKNIK": return "Menang Teknik";
      case "MUTLAK": return "Menang Mutlak";
      case "DISKUALIFIKASI": return "Menang Diskualifikasi";
      case "WO": return "Menang WO (Walk Over)";
      case "TIDAK_DAPAT_MELANJUTKAN": return "Menang Karena Lawan Tidak Dapat Melanjutkan";
      default: return "";
    }
  };

  // Trigger floating controls on mouse movement in top-right corner when in fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(false);
      return;
    }

    let timer: NodeJS.Timeout;
    const handleMouseMove = (e: MouseEvent) => {
      // Top-right corner: within 250px from right edge and 150px from top
      const isTopRight = e.clientX > window.innerWidth - 250 && e.clientY < 150;
      if (isTopRight) {
        setControlsVisible(true);
        clearTimeout(timer);
        timer = setTimeout(() => {
          setControlsVisible(false);
        }, 4000);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const isTopRight = touch.clientX > window.innerWidth - 250 && touch.clientY < 150;
        if (isTopRight) {
          setControlsVisible(true);
          clearTimeout(timer);
          timer = setTimeout(() => {
            setControlsVisible(false);
          }, 4000);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouchStart);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchStart);
      clearTimeout(timer);
    };
  }, [isFullscreen]);

  // Manual point adjustments local state
  const [overrideRed, setOverrideRed] = useState(0);
  const [overrideBlue, setOverrideBlue] = useState(0);
  const [pendingDisqualify, setPendingDisqualify] = useState<"RED" | "BLUE" | null>(null);
  const [showVarBlue, setShowVarBlue] = useState(false);
  const [showVarRed, setShowVarRed] = useState(false);
  const [selectedVarBlueType, setSelectedVarBlueType] = useState<"JATUHAN" | "PELANGGARAN" | null>(null);
  const [selectedVarRedType, setSelectedVarRedType] = useState<"JATUHAN" | "PELANGGARAN" | null>(null);

  // IPSI 2026 Verification Prompt States
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [promptType, setPromptType] = useState<"JATUHAN" | "PELANGGARAN">("JATUHAN");
  const [promptCorner, setPromptCorner] = useState<"RED" | "BLUE">("RED");
  const [promptReason, setPromptReason] = useState<string>("Bantingan Murni Sah (Tanpa Pelanggaran)");
  const [customReason, setCustomReason] = useState<string>("");

  const openVerificationPrompt = (corner: "RED" | "BLUE", defaultType: "JATUHAN" | "PELANGGARAN" = "JATUHAN") => {
    playClickSound(1000, 0.15);
    setPromptCorner(corner);
    setPromptType(defaultType);
    setPromptReason(defaultType === "JATUHAN" ? "Bantingan Murni Sah (Tanpa Pelanggaran)" : "Pukulan / Tendangan Mengarah Kepala / Leher");
    setCustomReason("");
    setShowVerificationPrompt(true);
  };

  const handleSaveSettings = () => {
    playClickSound(1000, 0.1);
    onUpdateMetadata({
      eventName,
      fighterRedName,
      fighterRedClub,
      fighterBlueName,
      fighterBlueClub,
      classCategory,
      matchNumber,
      roundDuration: Number(roundDuration)
    });
    setIsEditing(false);
  };

  const handleApplyOverride = (fighter: "RED" | "BLUE") => {
    playClickSound(750, 0.08);
    const points = fighter === "RED" ? overrideRed : overrideBlue;
    if (points !== 0) {
      onDewanAction({ command: "OVERRIDE", fighter, overridePoints: points });
      if (fighter === "RED") setOverrideRed(0);
      else setOverrideBlue(0);
    }
  };

  const handleDownloadMatchRecapPDF = () => {
    playClickSound(1200, 0.08);
    let winner = "BELUM SELESAI / DRAW";
    let winnerSubtext = "";
    if (state.redPenalties.disqualified) {
      winner = `SUDUT BIRU (${state.fighterBlueName || "PESILAT BIRU"})`;
      winnerSubtext = "MENANG DISKUALIFIKASI LAWAN (SUDUT MERAH)";
    } else if (state.bluePenalties.disqualified) {
      winner = `SUDUT MERAH (${state.fighterRedName || "PESILAT MERAH"})`;
      winnerSubtext = "MENANG DISKUALIFIKASI LAWAN (SUDUT BIRU)";
    } else if (state.status === MatchStatus.FINISHED) {
      if (state.scoreRed > state.scoreBlue) {
        winner = `SUDUT MERAH (${state.fighterRedName || "PESILAT MERAH"})`;
        winnerSubtext = "MENANG MUTLAK / UNGGUL SKOR";
      } else if (state.scoreBlue > state.scoreRed) {
        winner = `SUDUT BIRU (${state.fighterBlueName || "PESILAT BIRU"})`;
        winnerSubtext = "MENANG MUTLAK / UNGGUL SKOR";
      } else {
        winner = "SERI / DRAW";
      }
    } else {
      if (state.scoreRed > state.scoreBlue) {
        winner = `SUDUT MERAH (${state.fighterRedName || "PESILAT MERAH"})`;
        winnerSubtext = "SKOR SEMENTARA (PERTANDINGAN BELUM SELESAI)";
      } else if (state.scoreBlue > state.scoreRed) {
        winner = `SUDUT BIRU (${state.fighterBlueName || "PESILAT BIRU"})`;
        winnerSubtext = "SKOR SEMENTARA (PERTANDINGAN BELUM SELESAI)";
      } else {
        winner = "SERI SEMENTARA";
        winnerSubtext = "PERTANDINGAN BELUM SELESAI";
      }
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup terblokir! Silakan izinkan popup untuk mengunduh PDF rekap.");
      return;
    }

    // Build the jury score matrices HTML
    let juryScoresHtml = "";
    for (let j = 1; j <= 3; j++) {
      const jScores = state.juryScores?.[j] || {};
      juryScoresHtml += `<tr><td rowspan="${state.roundCount || 3}" style="font-weight:bold; vertical-align:middle; text-align:center; background-color:#f8fafc;">JURI ${j}</td>`;
      for (let r = 1; r <= (state.roundCount || 3); r++) {
        const rScores = jScores[r] || { red: 0, blue: 0 };
        if (r > 1) juryScoresHtml += `<tr>`;
        juryScoresHtml += `
          <td style="text-align:center;">BABAK ${r}</td>
          <td style="text-align:center; font-weight:bold; color:#dc2626;">${rScores.red}</td>
          <td style="text-align:center; font-weight:bold; color:#2563eb;">${rScores.blue}</td>
        </tr>`;
      }
    }

    // Build match logs HTML
    let logsHtml = "";
    const logList = state.logs || [];
    if (logList.length === 0) {
      logsHtml = `<tr><td colspan="6" style="text-align:center; font-style:italic; color:#64748b;">Belum ada log tanding tercatat</td></tr>`;
    } else {
      logList.forEach(log => {
        const dateStr = new Date(log.timestamp).toLocaleTimeString("id-ID");
        const fighterClass = log.fighter === "RED" ? "color:#dc2626; font-weight:bold;" : "color:#2563eb; font-weight:bold;";
        logsHtml += `
          <tr>
            <td style="font-family:monospace; text-align:center;">${dateStr}</td>
            <td style="text-align:center;">Babak ${log.round}</td>
            <td style="${fighterClass}">${log.fighter === "RED" ? "MERAH" : "BIRU"}</td>
            <td>${log.description}</td>
            <td style="text-align:center; font-weight:bold;">${log.points > 0 ? "+" + log.points : log.points}</td>
            <td>${log.source}</td>
          </tr>
        `;
      });
    }

    const eventLogoLeft = state.logoLeft || "/logo_panel_dewan.svg"; // Custom Silat Logo default fallback

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>REKAPITULASI_PERTANDINGAN_${(state.matchNumber || "PARTAI").replace(/\s+/g, "_")}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            background-color: #ffffff;
            margin: 0;
            padding: 30px;
            font-size: 11px;
            line-height: 1.4;
          }
          .no-print-btn {
            background-color: #008000;
            color: white;
            border: none;
            padding: 10px 18px;
            font-size: 12px;
            font-weight: 700;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 20px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .no-print-btn:hover {
            background-color: #008000;
          }
          .header-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px double #000000;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .header-logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }
          .header-text {
            text-align: center;
            flex-grow: 1;
            padding: 0 15px;
          }
          .header-text h1 {
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
            margin: 0 0 4px 0;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .header-text h2 {
            font-size: 11px;
            font-weight: 600;
            margin: 0;
            color: #475569;
            text-transform: uppercase;
          }
          .header-text p {
            font-size: 9px;
            color: #64748b;
            margin: 3px 0 0 0;
          }
          h3 {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            border-left: 3px solid #f59e0b;
            padding-left: 8px;
            margin: 25px 0 10px 0;
            color: #0f172a;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .info-table td {
            padding: 5px 8px;
            border: none;
          }
          .info-table td.label {
            font-weight: 600;
            color: #475569;
            width: 25%;
          }
          .info-table td.value {
            font-weight: 500;
            color: #0f172a;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          table.data-table th, table.data-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 10px;
            text-align: left;
          }
          table.data-table th {
            background-color: #f8fafc;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            font-size: 9px;
          }
          .winner-banner {
            border: 2px solid #008000;
            background-color: #f0fdf4;
            border-radius: 12px;
            padding: 12px 20px;
            text-align: center;
            margin: 15px 0;
          }
          .winner-banner .title {
            font-size: 9px;
            font-weight: 800;
            color: #008000;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 2px;
          }
          .winner-banner .name {
            font-size: 15px;
            font-weight: 800;
            color: #065f46;
            text-transform: uppercase;
          }
          .winner-banner .subtext {
            font-size: 9px;
            color: #008000;
            font-weight: 500;
            margin-top: 2px;
          }
          .signatures-container {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            text-align: center;
            page-break-inside: avoid;
          }
          .sig-box {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 120px;
          }
          .sig-box .title {
            font-weight: 600;
            color: #475569;
          }
          .sig-box .name-line {
            border-bottom: 1px solid #475569;
            width: 80%;
            margin: 0 auto;
            margin-bottom: 2px;
          }
          .sig-box .sub {
            font-size: 9px;
            color: #64748b;
          }

          @media print {
            .no-print {
              display: none !important;
            }
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align:right;">
          <button class="no-print-btn" onclick="window.print()">
            <svg style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.5" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
            Cetak / Simpan PDF Laporan
          </button>
        </div>

        <div class="header-container">
          <img class="header-logo" src="${eventLogoLeft}" alt="Logo IPSI" referrerPolicy="no-referrer" />
          <div class="header-text">
            <h1>Ikatan Pencak Silat Indonesia</h1>
            <h2>DIGITAL MATCH RECAPITULATION & REPORT</h2>
            <p>Sistem Informasi Skoring IPSI Digital • Laporan Akhir Pertandingan Resmi</p>
          </div>
          <div style="width:70px;height:70px;display:flex;align-items:center;justify-content:center;">
            <svg style="width:40px;height:40px;color:#f59e0b;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
        </div>

        <div class="winner-banner">
          <div class="title">PEMENANG PERTANDINGAN</div>
          <div class="name">${winner}</div>
          <div class="subtext">${winnerSubtext}</div>
        </div>

        <h3>1. DATA UMUM PARTAI</h3>
        <table class="info-table">
          <tr>
            <td class="label">Nama Kejuaraan / Event:</td>
            <td class="value">${state.eventName || "-"}</td>
            <td class="label">Tanggal & Waktu Cetak:</td>
            <td class="value">${new Date().toLocaleString("id-ID")} WIB</td>
          </tr>
          <tr>
            <td class="label">Nomor Partai:</td>
            <td class="value" style="font-weight: 800; color: #f59e0b;">${state.matchNumber || "-"}</td>
            <td class="label">Kategori / Kelas:</td>
            <td class="value">${state.classCategory || "-"}</td>
          </tr>
          <tr>
            <td class="label">Gender / Jenis Kelompok:</td>
            <td class="value">${state.gender || "PUTRA / PUTRI"}</td>
            <td class="label">Tahap Kejuaraan:</td>
            <td class="value">${state.stage || "PENYISIHAN"}</td>
          </tr>
          <tr>
            <td class="label">Jumlah Babak Maksimal:</td>
            <td class="value">${state.roundCount || 3} Babak</td>
            <td class="label">Status Pertandingan:</td>
            <td class="value" style="font-weight: bold;">${state.status}</td>
          </tr>
        </table>

        <div class="grid-2">
          <div>
            <h3>2. ATLET SUDUT MERAH (RED)</h3>
            <table class="data-table">
              <tr>
                <th style="width:40%;">Nama Atlet</th>
                <td style="font-weight:700; color:#dc2626;">${state.fighterRedName || "PESILAT MERAH"}</td>
              </tr>
              <tr>
                <th>Kontingen/Club</th>
                <td>${state.fighterRedClub || "KONTINGEN MERAH"}</td>
              </tr>
              <tr>
                <th>Skor Akhir</th>
                <td style="font-size:16px; font-weight:800; color:#dc2626;">${state.scoreRed}</td>
              </tr>
              <tr>
                <th>Status Diskualifikasi</th>
                <td>${state.redPenalties.disqualified ? "<span style='color:red;font-weight:bold;'>YA (DISKUALIFIKASI)</span>" : "TIDAK"}</td>
              </tr>
            </table>
          </div>
          <div>
            <h3>3. ATLET SUDUT BIRU (BLUE)</h3>
            <table class="data-table">
              <tr>
                <th style="width:40%;">Nama Atlet</th>
                <td style="font-weight:700; color:#2563eb;">${state.fighterBlueName || "PESILAT BIRU"}</td>
              </tr>
              <tr>
                <th>Kontingen/Club</th>
                <td>${state.fighterBlueClub || "KONTINGEN BIRU"}</td>
              </tr>
              <tr>
                <th>Skor Akhir</th>
                <td style="font-size:16px; font-weight:800; color:#2563eb;">${state.scoreBlue}</td>
              </tr>
              <tr>
                <th>Status Diskualifikasi</th>
                <td>${state.bluePenalties.disqualified ? "<span style='color:red;font-weight:bold;'>YA (DISKUALIFIKASI)</span>" : "TIDAK"}</td>
              </tr>
            </table>
          </div>
        </div>

        <h3>4. STATISTIK PEROLEHAN POIN</h3>
        <table class="data-table" style="text-align: center;">
          <thead>
            <tr>
              <th>Sudut</th>
              <th style="text-align:center;">Pukulan (+1)</th>
              <th style="text-align:center;">Tendangan (+2)</th>
              <th style="text-align:center;">Jatuhan (+3)</th>
              <th style="text-align:center;">Koreksi Ketua</th>
              <th style="text-align:center;">Teguran (Minus)</th>
              <th style="text-align:center;">SKOR AKHIR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:700; color:#dc2626; text-align:left;">MERAH</td>
              <td style="text-align:center;">${state.redStats?.punches || 0}</td>
              <td style="text-align:center;">${state.redStats?.kicks || 0}</td>
              <td style="text-align:center;">${state.redStats?.drops || 0}</td>
              <td style="text-align:center;">${state.redStats?.overrides || 0}</td>
              <td style="text-align:center; color:red;">${state.redStats?.warnings || 0}</td>
              <td style="font-weight:800; color:#dc2626; font-size:13px; text-align:center;">${state.scoreRed}</td>
            </tr>
            <tr>
              <td style="font-weight:700; color:#2563eb; text-align:left;">BIRU</td>
              <td style="text-align:center;">${state.blueStats?.punches || 0}</td>
              <td style="text-align:center;">${state.blueStats?.kicks || 0}</td>
              <td style="text-align:center;">${state.blueStats?.drops || 0}</td>
              <td style="text-align:center;">${state.blueStats?.overrides || 0}</td>
              <td style="text-align:center; color:red;">${state.blueStats?.warnings || 0}</td>
              <td style="font-weight:800; color:#2563eb; font-size:13px; text-align:center;">${state.scoreBlue}</td>
            </tr>
          </tbody>
        </table>

        <h3>5. REKAP PENILAIAN JURI (ROUND-BY-ROUND CONSENSUS)</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th style="text-align:center; width:30%;">JURI</th>
              <th style="text-align:center; width:20%;">BABAK</th>
              <th style="text-align:center; color:#dc2626; width:25%;">SKOR MERAH</th>
              <th style="text-align:center; color:#2563eb; width:25%;">SKOR BIRU</th>
            </tr>
          </thead>
          <tbody>
            ${juryScoresHtml}
          </tbody>
        </table>

        <div style="page-break-before: always;"></div>

        <h3>6. JALANNYA PERTANDINGAN (LOG EVENT RESMI)</h3>
        <table class="data-table log-table">
          <thead>
            <tr>
              <th style="text-align:center; width:15%;">Waktu</th>
              <th style="text-align:center; width:10%;">Babak</th>
              <th style="text-align:center; width:15%;">Sudut</th>
              <th>Keterangan / Aktivitas</th>
              <th style="text-align:center; width:10%;">Skor</th>
              <th style="text-align:center; width:20%;">Otoritas Pemutus</th>
            </tr>
          </thead>
          <tbody>
            ${logsHtml}
          </tbody>
        </table>

        <div class="signatures-container">
          <div class="sig-box">
            <div class="title">Ketua Pertandingan (Dewan Juri)</div>
            <div style="display:flex; flex-direction:column; align-items:center;">
              <div class="name-line"></div>
              <div class="sub">Tanda Tangan & Nama Terang</div>
            </div>
          </div>
          <div class="sig-box">
            <div class="title">Wasit</div>
            <div style="display:flex; flex-direction:column; align-items:center;">
              <div class="name-line"></div>
              <div class="sub">Tanda Tangan & Nama Terang</div>
            </div>
          </div>
          <div class="sig-box">
            <div class="title">Sekretaris Pertandingan</div>
            <div style="display:flex; flex-direction:column; align-items:center;">
              <div class="name-line"></div>
              <div class="sub">Tanda Tangan & Nama Terang</div>
            </div>
          </div>
        </div>



        <script>
          window.focus();
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const executeAction = (actionFn: () => void, soundFreq = 880) => {
    playClickSound(soundFreq, 0.06);
    actionFn();
  };

  const handleJuryBackspace = async (jNum: number) => {
    playClickSound(620, 0.08);
    try {
      const updated = await rtdbScoringEngine.handleJuryUndo(state, jNum);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("force_match_sync", { detail: updated }));
      }
      fetch("/api/match-state/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: updated })
      }).catch(() => {});
    } catch {
      fetch("/api/jury/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ juryId: jNum })
      }).catch(() => {});
    }
  };

  const getJuryInputsForRound = (color: "BLUE" | "RED", roundNum: number, jId: number) => {
    return (state.logs || []).filter(log => {
      if (log.fighter !== color || log.round !== roundNum) return false;
      if (log.type !== "PUNCH" && log.type !== "KICK") return false;
      if (log.uncounted) {
        return log.source === `Juri ${jId}`;
      } else {
        return log.juryIds && log.juryIds.includes(jId);
      }
    });
  };

  const renderLogBadges = (logs: MatchLog[], isBlue: boolean) => {
    if (logs.length === 0) return <span className="text-slate-600 font-mono text-[9px]">-</span>;
    return (
      <div className="flex flex-wrap justify-center gap-0.5 max-h-[36px] overflow-y-auto">
        {logs.map((log) => {
          const pointsStr = log.points > 0 ? `+${log.points}` : `${log.points}`;
          if (log.uncounted) {
            return (
              <span 
                key={log.id} 
                className="px-0.5 py-px rounded text-[8px] md:text-[8.5px] font-medium line-through bg-slate-950 text-slate-600 border border-slate-900/60 opacity-50"
                title="Batal"
              >
                {pointsStr}
              </span>
            );
          } else {
            return (
              <span 
                key={log.id} 
                className={`px-0.5 py-px rounded text-[8.5px] font-black border ${
                  isBlue 
                    ? "text-blue-400 bg-blue-950/80 border-blue-500/20 shadow-[0_0_4px_rgba(59,130,246,0.15)]" 
                    : "text-red-400 bg-red-950/80 border-red-500/20 shadow-[0_0_4px_rgba(239,68,68,0.15)]"
                }`}
              >
                {pointsStr}
              </span>
            );
          }
        })}
      </div>
    );
  };

  const renderDewanBadges = (logs: MatchLog[]) => {
    if (logs.length === 0) return <span className="text-slate-600 font-mono text-[9px]">-</span>;
    return (
      <div className="flex flex-wrap justify-center gap-0.5 max-h-[36px] overflow-y-auto">
        {logs.map((log) => {
          const pointsStr = log.points > 0 ? `+${log.points}` : `${log.points}`;
          if (log.uncounted) {
            return (
              <span 
                key={log.id} 
                className="px-0.5 py-px rounded text-[8px] md:text-[8.5px] font-medium line-through bg-slate-950 text-slate-600 border border-slate-900/60 opacity-50"
                title="Batal"
              >
                {pointsStr}
              </span>
            );
          } else {
            const isNegative = log.points < 0;
            return (
              <span 
                key={log.id} 
                className={`px-0.5 py-px rounded text-[8.5px] font-black border ${
                  isNegative
                    ? "bg-red-950/80 text-red-400 border-red-500/20 shadow-[0_0_4px_rgba(239,68,68,0.15)]"
                    : "bg-emerald-950 text-emerald-400 border-emerald-500/20 shadow-[0_0_4px_rgba(0, 128, 0,0.15)]"
                }`}
              >
                {pointsStr}
              </span>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div 
      className={`border text-slate-100 font-sans flex flex-col min-h-screen w-full relative bg-[#030718] bg-[radial-gradient(ellipse_at_center,_#0a1845_0%,_#040a20_60%,_#02040e_100%)] ${
        isNativeFullscreen
          ? "fixed inset-0 z-40 w-screen h-screen p-3 md:p-5 rounded-none border-none shadow-none overflow-y-auto"
          : "w-full border-blue-500/40 rounded-2xl shadow-[0_0_50px_rgba(37,99,235,0.25)] p-2.5 sm:p-4 my-2 overflow-y-auto"
      }`} 
      id="dewan-panel-root"
    >
      {/* Subtle Background Watermark */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.04] select-none bg-center bg-no-repeat bg-contain z-0" 
        style={{ backgroundImage: "url('/jrzscoreutama.png')", backgroundSize: "min(40vw, 40vh)" }}
      />

      {/* BANNER POP UP BABAK TERAKHIR SELESAI (BABAK 3 DARI 3 ATAU BABAK 2 DARI 2) */}
      {isFinalRoundOver && checkingScoresMode !== "FINAL_ROUND" && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-center items-center p-4 text-center animate-fade-in font-sans">
          <div className="w-full max-w-xl bg-gradient-to-br from-[#120526] via-[#090317] to-purple-950/95 border-2 border-purple-500/60 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(168,85,247,0.4)] flex flex-col items-center gap-3.5 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-500 via-amber-400 to-cyan-400 animate-pulse" />
            
            <div className="text-amber-400 animate-bounce bg-amber-500/15 p-3.5 rounded-full border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <Award className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
                WAKTU BABAK TERAKHIR SELESAI
              </h2>
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest mt-1">
                BABAK {state.activeRound} DARI {totalRounds} BABAK • PARTAI {state.matchNumber || "1"}
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-300 leading-relaxed max-w-md">
              Waktu babak terakhir telah selesai dijalankan. Silakan periksa nilai perolehan peserta atau langsung umumkan pemenang pertandingan.
            </p>

            {/* Rekap Nilai Sudut Merah vs Biru */}
            <div className="w-full grid grid-cols-2 gap-3 my-1">
              {/* Sudut Biru */}
              <div className="bg-[#050e2d]/85 border border-blue-500/40 rounded-2xl p-3 flex flex-col items-center shadow-inner">
                <span className="text-[9.5px] font-black text-cyan-400 uppercase tracking-widest">SUDUT BIRU</span>
                <span className="text-xs sm:text-sm font-black text-white truncate max-w-full uppercase mt-0.5">
                  {state.fighterBlueName || "PESILAT BIRU"}
                </span>
                <span className="text-[9px] text-slate-400 truncate max-w-full uppercase">
                  {state.fighterBlueClub || "KONTINGEN BIRU"}
                </span>
                <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono mt-1">
                  {state.scoreBlue}
                </div>
              </div>

              {/* Sudut Merah */}
              <div className="bg-[#2a060d]/85 border border-rose-500/40 rounded-2xl p-3 flex flex-col items-center shadow-inner">
                <span className="text-[9.5px] font-black text-rose-400 uppercase tracking-widest">SUDUT MERAH</span>
                <span className="text-xs sm:text-sm font-black text-white truncate max-w-full uppercase mt-0.5">
                  {state.fighterRedName || "PESILAT MERAH"}
                </span>
                <span className="text-[9px] text-slate-400 truncate max-w-full uppercase">
                  {state.fighterRedClub || "KONTINGEN MERAH"}
                </span>
                <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono mt-1">
                  {state.scoreRed}
                </div>
              </div>
            </div>

            {/* Status Pemenang Resmi atau Kandidat Pemenang */}
            {state.winnerColor && state.winnerPublished ? (
              <div className={`w-full px-4 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider ${
                state.winnerColor === "RED"
                  ? "bg-rose-950/80 border-rose-500/50 text-rose-300"
                  : "bg-blue-950/80 border-blue-500/50 text-blue-300"
              }`}>
                🏆 PEMENANG RESMI: SUDUT {state.winnerColor === "RED" ? "MERAH" : "BIRU"} ({state.winnerColor === "RED" ? state.fighterRedName : state.fighterBlueName})
                <div className="text-[10px] font-mono font-medium opacity-90 mt-0.5">
                  Keputusan: {state.winnerMethod || "MENANG ANGKA / MUTLAK"}
                </div>
              </div>
            ) : (
              <div className="w-full px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-[11px] font-semibold flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span>
                  Kandidat Pemenang: Sudut {computedLeader.winner === "RED" ? "Merah" : "Biru"} ({computedLeader.winner === "RED" ? state.fighterRedName : state.fighterBlueName}) • {computedLeader.method}
                </span>
              </div>
            )}

            {/* Tombol Aksi: CEK NILAI dan UMUMKAN PEMENANG */}
            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => {
                  playClickSound(1000, 0.1);
                  setCheckingScoresMode("FINAL_ROUND");
                }}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black font-sans text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                <span>CEK NILAI</span>
              </button>

              <button
                type="button"
                onClick={handleDirectAnnounceWinner}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black font-sans text-xs uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.5)] cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 animate-pulse"
              >
                <Award className="w-4 h-4" />
                <span>UMUMKAN PEMENANG</span>
              </button>
            </div>

            {/* Tombol Unduh Berita Acara PDF jika pemenang sudah ditentukan */}
            {state.winnerColor && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={handleDownloadMatchRecapPDF}
                  className="px-4 py-2 bg-purple-900/60 hover:bg-purple-800/80 border border-purple-500/40 text-purple-200 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Berita Acara PDF
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DEWAN ROUND OVER INTERMISSION OVERLAY (ANTAR BABAK 1 KE 2 ATAU 2 KE 3) */}
      {isIntermission && checkingScoresMode !== "INTERMISSION" && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-center items-center p-4 text-center animate-fade-in font-sans">
          <div className="w-full max-w-md bg-gradient-to-br from-[#1c1204] via-[#0b0802] to-[#040c26] border-2 border-amber-400/60 rounded-3xl p-6 shadow-[0_0_40px_rgba(245,158,11,0.35)] flex flex-col items-center gap-3 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse" />
            <div className="text-amber-400 animate-bounce bg-amber-500/15 p-3 rounded-full border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">
              WAKTU BABAK {state.activeRound} SELESAI
            </h2>
            <p className="text-xs font-semibold text-amber-200/90 leading-relaxed max-w-sm">
              Jeda istirahat antar babak sedang berlangsung. Sekretaris Pertandingan sedang menyiapkan transisi ke Babak {state.activeRound + 1}.
            </p>
            <div className="flex items-center gap-1.5 mt-1 px-3 py-1 bg-amber-950/60 border border-amber-500/30 text-amber-300 rounded-lg text-[10px] font-bold font-mono">
              <span>MENUNGGU ABA-ABA TRANSISI SEKRETARIS</span>
            </div>

            {/* TOMBOL CEK NILAI DI MENU POP UP ANTAR BABAK */}
            <div className="mt-3 w-full max-w-xs">
              <button
                type="button"
                onClick={() => {
                  playClickSound(1000, 0.1);
                  setCheckingScoresMode("INTERMISSION");
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black font-sans text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-slate-950" />
                <span>CEK NILAI</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEWAN PANEL LOCKED OVERLAY */}
      {state.dewanPanelLocked && !state.showRoundOverPopup && !isFinalRoundOver && !checkingScoresMode && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col justify-center items-center p-4 z-50 text-center animate-fade-in animate-duration-150">
          <div className="w-full max-w-[340px] bg-gradient-to-br from-blue-950 via-[#0e0728] to-purple-950/95 border-2 border-purple-500/50 rounded-2xl p-6 shadow-[0_0_35px_rgba(168,85,247,0.4)] flex flex-col items-center gap-3.5">
            <div className="text-red-500 animate-[pulse_1s_infinite] bg-red-500/10 p-3 rounded-full border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <AlertTriangle className="w-10 h-10 fill-red-500/10 text-red-500 stroke-[2.5]" />
            </div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">
              PANEL DEWAN TERKUNCI
            </h2>
            <p className="text-[11px] font-semibold text-slate-300 leading-relaxed max-w-[280px]">
              Pertandingan belum dimulai atau telah dibatalkan. Silakan minta Sekretaris untuk mengaktifkan status "Mulai Pertandingan" agar juri dapat memberikan penilaian.
            </p>

            <div className="flex items-center gap-1.5 mt-1 px-3 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg text-[9px] font-bold font-mono">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-[pulse_1s_infinite]"></div>
              <span>MENUNGGU AKTIVASI SEKRETARIS</span>
            </div>
          </div>
        </div>
      )}

      
      {/* HEADER INFORMASI EVENT & PARTAI (SESUAI GAMBAR PANEL DEWAN.JPG) */}
      <div className="w-full text-center mb-3 pt-1 shrink-0 relative flex flex-col items-center justify-center select-none" id="dewan-top-header">
        <h1 className="text-white font-sans font-black text-xl sm:text-2xl md:text-3xl tracking-wider uppercase drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
          {state.eventName || "PAKU BANTEN CHAMPIONSHIP"}
        </h1>
        <div className="text-amber-400 font-sans font-bold text-xs sm:text-sm tracking-wider uppercase mt-1 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]">
          {state.matchNumber || "1"} • {state.classCategory || "TANDING KELAS A PUTRA (55KG - 60KG)"}
        </div>
      </div>

      {/* TAMPILAN 3 KOLOM SEPERTI SEDIAKALA (SESUAI GAMBAR REFERENSI PANEL DEWAN.JPG) */}
      <div className="grid grid-cols-12 gap-3 w-full max-w-[1920px] mx-auto items-start min-h-0 flex-grow" id="dewan-3col-dashboard">
        
        {/* KOLOM 1: SUDUT BIRU (KIRI - 5 COLS) */}
        <div className="col-span-5 flex flex-col gap-3 min-w-0" id="dewan-col-blue">
          {/* KARTU UTAMA SUDUT BIRU */}
          <div className="bg-[#050b24] border-2 border-blue-600 rounded-2xl p-3 sm:p-4 shadow-[0_0_25px_rgba(37,99,235,0.25)] relative overflow-hidden flex flex-col justify-between" id="blue-corner-card">
            {/* Watermark BIRU */}
            <div className="absolute top-10 left-6 text-7xl md:text-8xl font-sans font-black uppercase text-blue-500/10 pointer-events-none select-none">
              BIRU
            </div>

            <div className="relative z-10 w-full flex flex-col">
              {/* Header Nama Pesilat & Sudut */}
              <div className="flex justify-between items-center pb-2 border-b border-blue-500/30">
                <div className="text-left min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg md:text-xl font-sans font-black text-white uppercase tracking-tight truncate drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                    {state.fighterBlueName || "BUDI PRASETYO"}
                  </h3>
                  <span className="text-xs font-bold font-sans uppercase text-cyan-400 block truncate">
                    {state.fighterBlueClub || "DKI JAKARTA"}
                  </span>
                </div>
                <span className="bg-blue-600 text-white font-black text-[10px] md:text-xs px-3 py-1 rounded uppercase tracking-wider shrink-0 shadow-md">
                  SUDUT BIRU
                </span>
              </div>

              {/* Skor Nilai Raksasa di Tengah */}
              <div className="my-3 py-1 flex items-center justify-center select-none" id="blue-score-display">
                <div className="text-7xl md:text-8xl font-black font-sans text-white text-center drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                  {state.scoreBlue}
                </div>
              </div>

              {/* Grid Tombol 3x3 (Binaan, Jatuhan, Teguran, Peringatan, Diskualifikasi) */}
              <div className="grid grid-cols-3 gap-2 w-full my-1.5" id="blue-buttons-grid">
                {/* Baris 1: Binaan 1, Binaan 2, Jatuhan +3 */}
                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "PENALTY", fighter: "BLUE", penaltyType: "BINAAN_1" }), 600)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.bluePenalties.binaan1
                      ? "bg-[#f97316] hover:bg-[#ea580c] text-white ring-2 ring-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.6)] animate-pulse"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Binaan 1 Sudut Biru"
                >
                  <IconBinaan1 
                    active={state.bluePenalties.binaan1} 
                    className={`w-5 h-5 md:w-6 md:h-6 object-contain pointer-events-none transition-all ${
                      state.bluePenalties.binaan1 ? "opacity-100 filter drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]" : "opacity-40 grayscale"
                    }`} 
                  />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.bluePenalties.binaan1 ? "text-white" : "text-slate-300"
                  }`}>BINAAN 1</span>
                </button>

                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "PENALTY", fighter: "BLUE", penaltyType: "BINAAN_2" }), 610)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.bluePenalties.binaan2
                      ? "bg-[#f97316] hover:bg-[#ea580c] text-white ring-2 ring-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.6)] animate-pulse"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Binaan 2 Sudut Biru"
                >
                  <IconBinaan2 
                    active={state.bluePenalties.binaan2} 
                    className={`w-5 h-5 md:w-6 md:h-6 object-contain pointer-events-none transition-all ${
                      state.bluePenalties.binaan2 ? "opacity-100 filter drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]" : "opacity-40 grayscale"
                    }`} 
                  />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.bluePenalties.binaan2 ? "text-white" : "text-slate-300"
                  }`}>BINAAN 2</span>
                </button>

                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "DROP", fighter: "BLUE" }), 900)}
                  className="bg-[#059669] hover:bg-[#047857] text-white font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow border border-emerald-400 transition-all"
                  title="Jatuhan Sah Sudut Biru (+3 Poin)"
                >
                  <img src="/Jatuhanbiru.png" className="w-6 h-6 md:w-7 md:h-7 object-contain rounded pointer-events-none" alt="Jatuhan +3" />
                  <span className="text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none">JATUHAN +3</span>
                </button>

                {/* Baris 2: Teguran 1, Teguran 2, Jat. Batal */}
                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "PENALTY", fighter: "BLUE", penaltyType: "TEGURAN_1" }), 500)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.bluePenalties.teguran1
                      ? "bg-[#facc15] hover:bg-[#eab308] text-slate-950 ring-2 ring-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Teguran 1 Sudut Biru (-1 Poin)"
                >
                  <IconTeguran1 
                    active={state.bluePenalties.teguran1} 
                    className={`w-5 h-5 md:w-6 md:h-6 object-contain pointer-events-none transition-all ${
                      state.bluePenalties.teguran1 ? "opacity-100 filter drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" : "opacity-40 grayscale"
                    }`} 
                  />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.bluePenalties.teguran1 ? "text-slate-950" : "text-slate-300"
                  }`}>TEGURAN 1</span>
                </button>

                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "PENALTY", fighter: "BLUE", penaltyType: "TEGURAN_2" }), 480)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.bluePenalties.teguran2
                      ? "bg-[#facc15] hover:bg-[#eab308] text-slate-950 ring-2 ring-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Teguran 2 Sudut Biru (-2 Poin)"
                >
                  <IconTeguran2 
                    active={state.bluePenalties.teguran2} 
                    className={`w-5 h-5 md:w-6 md:h-6 object-contain pointer-events-none transition-all ${
                      state.bluePenalties.teguran2 ? "opacity-100 filter drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" : "opacity-40 grayscale"
                    }`} 
                  />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.bluePenalties.teguran2 ? "text-slate-950" : "text-slate-300"
                  }`}>TEGURAN 2</span>
                </button>

                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "CANCEL_DROP", fighter: "BLUE" }), 700)}
                  className="bg-[#92400e] hover:bg-[#78350f] text-white font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow border border-amber-600 transition-all"
                  title="Batalkan Jatuhan Sudut Biru (-3 Poin)"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 pointer-events-none text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  <span className="text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none">JAT. BATAL</span>
                </button>

                {/* Baris 3: Peringatan 1, Peringatan 2, Diskualifikasi */}
                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "PENALTY", fighter: "BLUE", penaltyType: "PERINGATAN_1" }), 400)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.bluePenalties.peringatan1
                      ? "bg-[#ef4444] hover:bg-[#dc2626] text-white ring-2 ring-red-200 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Peringatan 1 Sudut Biru (-5 Poin)"
                >
                  <IconPeringatan1 
                    active={state.bluePenalties.peringatan1} 
                    className={`w-5 h-5 md:w-6 md:h-6 object-contain pointer-events-none transition-all ${
                      state.bluePenalties.peringatan1 ? "opacity-100 filter drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" : "opacity-40 grayscale"
                    }`} 
                  />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.bluePenalties.peringatan1 ? "text-white" : "text-slate-300"
                  }`}>PERINGATAN 1</span>
                </button>

                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "PENALTY", fighter: "BLUE", penaltyType: "PERINGATAN_2" }), 380)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.bluePenalties.peringatan2
                      ? "bg-[#ef4444] hover:bg-[#dc2626] text-white ring-2 ring-red-200 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Peringatan 2 Sudut Biru (-10 Poin)"
                >
                  <IconPeringatan2 
                    active={state.bluePenalties.peringatan2} 
                    className={`w-5 h-5 md:w-6 md:h-6 object-contain pointer-events-none transition-all ${
                      state.bluePenalties.peringatan2 ? "opacity-100 filter drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" : "opacity-40 grayscale"
                    }`} 
                  />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.bluePenalties.peringatan2 ? "text-white" : "text-slate-300"
                  }`}>PERINGATAN 2</span>
                </button>

                <button
                  onClick={() => executeAction(() => setPendingDisqualify("BLUE"), 200)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.bluePenalties.disqualified
                      ? "bg-[#831843] hover:bg-[#9d174d] text-white border border-pink-500 ring-2 ring-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.6)] animate-bounce"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Diskualifikasi Sudut Biru"
                >
                  <Ban className={`w-5 h-5 md:w-6 md:h-6 pointer-events-none transition-all ${
                    state.bluePenalties.disqualified ? "text-white" : "text-slate-400"
                  }`} />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.bluePenalties.disqualified ? "text-white" : "text-slate-300"
                  }`}>DISKUALIFIKASI</span>
                </button>
              </div>
            </div>
          </div>

          {/* LOG NILAI MASUK (BIRU) */}
          <div className="bg-[#060c28] border border-blue-900/80 rounded-xl p-2.5 shadow-inner" id="blue-log-box">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-wider mb-1.5">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>LOG NILAI MASUK (BIRU)</span>
            </div>
            <div className="bg-[#020410]/98 border border-blue-900/50 rounded-lg overflow-x-auto shadow-inner">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b border-blue-800/40 bg-blue-950/60 text-[8px] sm:text-[9px] text-[#c084fc] font-black uppercase tracking-wider font-mono">
                    <th className="py-1.5 px-1 text-center w-[12%] border-r border-[#1e1b4b]">RD</th>
                    <th className="py-1.5 px-1 text-center w-[22%] border-r border-[#1e1b4b]">J1</th>
                    <th className="py-1.5 px-1 text-center w-[22%] border-r border-[#1e1b4b]">J2</th>
                    <th className="py-1.5 px-1 text-center w-[22%] border-r border-[#1e1b4b]">J3</th>
                    <th className="py-1.5 px-1 text-center w-[22%] font-black text-emerald-400">DWN</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((roundNum) => {
                    const j1Logs = getJuryInputsForRound("BLUE", roundNum, 1);
                    const j2Logs = getJuryInputsForRound("BLUE", roundNum, 2);
                    const j3Logs = getJuryInputsForRound("BLUE", roundNum, 3);
                    const dewanLogs = (state.logs || []).filter(
                      log => log.fighter === "BLUE" && 
                             log.round === roundNum && 
                             (
                               log.type === "DROP" || 
                               log.type === "LOCK" || 
                               (log.type === "PENALTY" && log.points !== 0) ||
                               (log.source && (log.source.includes("Dewan") || log.source.includes("Ketua Pertandingan")))
                             )
                     );
                    return (
                      <tr key={roundNum} className="border-b border-[#0a1236] text-[8px] sm:text-[9px] font-mono text-center text-slate-300">
                        <td className="py-1 px-1 font-bold bg-[#050c26] text-cyan-300 border-r border-[#0a1236]">Rd {roundNum}</td>
                        <td className="py-1 px-1 border-r border-[#0a1236]">
                          {renderLogBadges(j1Logs, true)}
                        </td>
                        <td className="py-1 px-1 border-r border-[#0a1236]">
                          {renderLogBadges(j2Logs, true)}
                        </td>
                        <td className="py-1 px-1 border-r border-[#0a1236]">
                          {renderLogBadges(j3Logs, true)}
                        </td>
                        <td className="py-1 px-1">
                          {renderDewanBadges(dewanLogs)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* KOLOM 2: CENTER CONSOLE (TENGAH - 2 COLS) */}
        <div className="col-span-2 flex flex-col gap-2 min-w-0" id="dewan-col-center">
          <div className="bg-[#04081c] border-2 border-indigo-500/60 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_25px_rgba(99,102,241,0.25)] flex flex-col items-center justify-between" id="center-console-card">
            
            {/* Indikator Babak */}
            <span className="text-amber-400 font-black font-sans text-xs md:text-sm tracking-widest uppercase mb-0.5 select-none animate-pulse">
              BABAK {state.activeRound}
            </span>

            {/* Jam Digital Timer Raksasa */}
            <div className="font-digital font-black text-4xl sm:text-5xl md:text-6xl text-white tracking-normal leading-none my-1 select-none flex items-center justify-center drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" id="dewan-center-timer">
              <span>{String(Math.floor((state.timeLeft || 0) / 60)).padStart(2, "0")}</span>
              <span className="text-white">:</span>
              <span>{String((state.timeLeft || 0) % 60).padStart(2, "0")}</span>
            </div>

            {/* Subtitle MONITOR JURI */}
            <span className="text-cyan-400 font-sans font-black text-[10.5px] md:text-[11px] tracking-widest uppercase mt-2 mb-1 select-none">
              MONITOR JURI
            </span>

            {/* Kotak Monitoring 3 Juri */}
            <div className="w-full flex flex-col gap-1.5" id="jury-monitoring-list">
              {[1, 2, 3].map((jNum) => {
                const bPunches = (state.logs || []).filter(l => l.fighter === "BLUE" && l.round === state.activeRound && l.type === "PUNCH" && (l.uncounted ? l.source === `Juri ${jNum}` : (l.juryIds && l.juryIds.includes(jNum)))).length;
                const rPunches = (state.logs || []).filter(l => l.fighter === "RED" && l.round === state.activeRound && l.type === "PUNCH" && (l.uncounted ? l.source === `Juri ${jNum}` : (l.juryIds && l.juryIds.includes(jNum)))).length;
                const bKicks = (state.logs || []).filter(l => l.fighter === "BLUE" && l.round === state.activeRound && l.type === "KICK" && (l.uncounted ? l.source === `Juri ${jNum}` : (l.juryIds && l.juryIds.includes(jNum)))).length;
                const rKicks = (state.logs || []).filter(l => l.fighter === "RED" && l.round === state.activeRound && l.type === "KICK" && (l.uncounted ? l.source === `Juri ${jNum}` : (l.juryIds && l.juryIds.includes(jNum)))).length;
                const hasJuryLogs = (state.logs || []).some(
                  l =>
                    (l.type === "PUNCH" || l.type === "KICK") &&
                    (l.uncounted ? l.source === `Juri ${jNum}` : Boolean(l.juryIds && l.juryIds.includes(jNum)))
                );

                return (
                  <div key={jNum} className="bg-[#030617] border border-indigo-950/80 rounded-lg p-1.5 w-full flex flex-col items-center select-none shadow-sm">
                    <span className="text-cyan-400 font-sans font-black text-[10px] tracking-wider uppercase mb-0.5">
                      JURI {jNum}
                    </span>
                    <div className="font-mono text-[10.5px] font-bold w-full flex flex-col items-center gap-0.5">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-cyan-400">P: {bPunches}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-rose-400">{rPunches} : P</span>
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-cyan-400">K: {bKicks}</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-rose-400">{rKicks} : K</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleJuryBackspace(jNum)}
                        className={`mt-1 w-full py-1 px-1.5 rounded-md font-sans font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-all ${
                          hasJuryLogs
                            ? "bg-rose-950/85 hover:bg-rose-800 text-rose-200 hover:text-white border border-rose-500/60 shadow-[0_0_8px_rgba(244,63,94,0.25)]"
                            : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/70"
                        }`}
                        title={`Hapus log nilai terakhir Juri ${jNum} (Backspace)`}
                      >
                        <Delete className="w-3 h-3 shrink-0" />
                        <span>BACKSPACE</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tombol TEKNIK-MUTLAK-WMP-UD */}
            <button
              onClick={() => {
                playClickSound(1100, 0.12);
                setShowVictoryModal(true);
                setVictoryWinner(null);
                setSelectedVictoryType(null);
              }}
              className="w-full bg-[#06b6d4] hover:bg-[#0891b2] text-slate-950 font-black font-sans text-[10px] md:text-[11px] uppercase tracking-wider py-2 px-2 rounded-lg text-center cursor-pointer active:scale-95 shadow-md mt-2 transition-all leading-tight"
              title="Deklarasi Kemenangan Teknik, Mutlak, WMP, atau UD"
            >
              TEKNIK-MUTLAK-WMP-UD
            </button>

            {/* Logo Shield Pencak Silat di Tengah */}
            <div className="my-2 flex justify-center items-center">
              <img
                src="/Newlogodisco.png"
                alt="Digital Scoring Pencak Silat"
                className="w-14 h-14 md:w-16 md:h-16 object-contain pointer-events-none filter drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                onError={(e) => {
                  e.currentTarget.src = "/logo_satriaapp.png";
                }}
              />
            </div>

            {/* Bagian VERIFIKASI DEWAN */}
            <div className="w-full flex flex-col items-center mt-1 gap-2">
              {/* VERIFIKASI JATUHAN */}
              <button
                type="button"
                onClick={() => openVerificationPrompt(promptCorner, "JATUHAN")}
                className="w-full bg-[#120f38] hover:bg-[#1a164d] border border-indigo-500/70 rounded-xl py-2.5 px-2 flex items-center justify-center shadow-md cursor-pointer active:scale-95 transition-all"
                title="Verifikasi Jatuhan"
              >
                <span className="text-amber-300 font-black font-sans text-[10px] md:text-[10.5px] uppercase tracking-wider text-center">
                  VERIFIKASI JATUHAN
                </span>
              </button>

              {/* VERIFIKASI PELANGGARAN */}
              <button
                type="button"
                onClick={() => openVerificationPrompt(promptCorner, "PELANGGARAN")}
                className="w-full bg-[#1e0a1a] hover:bg-[#2b0f26] border border-rose-500/70 rounded-xl py-2.5 px-2 flex items-center justify-center shadow-md cursor-pointer active:scale-95 transition-all"
                title="Verifikasi Pelanggaran"
              >
                <span className="text-rose-300 font-black font-sans text-[10px] md:text-[10.5px] uppercase tracking-wider text-center">
                  VERIFIKASI PELANGGARAN
                </span>
              </button>
            </div>

          </div>
        </div>

        {/* KOLOM 3: SUDUT MERAH (KANAN - 5 COLS) */}
        <div className="col-span-5 flex flex-col gap-3 min-w-0" id="dewan-col-red">
          {/* KARTU UTAMA SUDUT MERAH */}
          <div className="bg-[#1a0507] border-2 border-red-600 rounded-2xl p-3 sm:p-4 shadow-[0_0_25px_rgba(239,68,68,0.25)] relative overflow-hidden flex flex-col justify-between" id="red-corner-card">
            {/* Watermark MERAH */}
            <div className="absolute top-10 right-6 text-7xl md:text-8xl font-sans font-black uppercase text-red-500/10 pointer-events-none select-none">
              MERAH
            </div>

            <div className="relative z-10 w-full flex flex-col">
              {/* Header Nama Pesilat & Sudut */}
              <div className="flex justify-between items-center pb-2 border-b border-red-500/30">
                <div className="text-left min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg md:text-xl font-sans font-black text-white uppercase tracking-tight truncate drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                    {state.fighterRedName || "ANDI SANTOSO"}
                  </h3>
                  <span className="text-xs font-bold font-sans uppercase text-red-300 block truncate">
                    {state.fighterRedClub || "JAWA TENGAH"}
                  </span>
                </div>
                <span className="bg-red-600 text-white font-black text-[10px] md:text-xs px-3 py-1 rounded uppercase tracking-wider shrink-0 shadow-md">
                  SUDUT MERAH
                </span>
              </div>

              {/* Skor Nilai Raksasa di Tengah */}
              <div className="my-3 py-1 flex items-center justify-center select-none" id="red-score-display">
                <div className="text-7xl md:text-8xl font-black font-sans text-white text-center drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]">
                  {state.scoreRed}
                </div>
              </div>

              {/* Grid Tombol 3x3 (Binaan, Jatuhan, Teguran, Peringatan, Diskualifikasi) */}
              <div className="grid grid-cols-3 gap-2 w-full my-1.5" id="red-buttons-grid">
                {/* Baris 1: Binaan 1, Binaan 2, Jatuhan +3 */}
                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "PENALTY", fighter: "RED", penaltyType: "BINAAN_1" }), 600)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.redPenalties.binaan1
                      ? "bg-[#f97316] hover:bg-[#ea580c] text-white ring-2 ring-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.6)] animate-pulse"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Binaan 1 Sudut Merah"
                >
                  <IconBinaan1 
                    active={state.redPenalties.binaan1} 
                    className={`w-5 h-5 md:w-6 md:h-6 object-contain pointer-events-none transition-all ${
                      state.redPenalties.binaan1 ? "opacity-100 filter drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]" : "opacity-40 grayscale"
                    }`} 
                  />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.redPenalties.binaan1 ? "text-white" : "text-slate-300"
                  }`}>BINAAN 1</span>
                </button>

                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "PENALTY", fighter: "RED", penaltyType: "BINAAN_2" }), 610)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.redPenalties.binaan2
                      ? "bg-[#f97316] hover:bg-[#ea580c] text-white ring-2 ring-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.6)] animate-pulse"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Binaan 2 Sudut Merah"
                >
                  <IconBinaan2 
                    active={state.redPenalties.binaan2} 
                    className={`w-5 h-5 md:w-6 md:h-6 object-contain pointer-events-none transition-all ${
                      state.redPenalties.binaan2 ? "opacity-100 filter drop-shadow-[0_0_6px_rgba(249,115,22,0.8)]" : "opacity-40 grayscale"
                    }`} 
                  />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.redPenalties.binaan2 ? "text-white" : "text-slate-300"
                  }`}>BINAAN 2</span>
                </button>

                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "DROP", fighter: "RED" }), 900)}
                  className="bg-[#059669] hover:bg-[#047857] text-white font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow border border-emerald-400 transition-all"
                  title="Jatuhan Sah Sudut Merah (+3 Poin)"
                >
                  <img src="/jatuhanmerah.png" className="w-6 h-6 md:w-7 md:h-7 object-contain rounded pointer-events-none" alt="Jatuhan +3" />
                  <span className="text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none">JATUHAN +3</span>
                </button>

                {/* Baris 2: Teguran 1, Teguran 2, Jat. Batal */}
                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "PENALTY", fighter: "RED", penaltyType: "TEGURAN_1" }), 500)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.redPenalties.teguran1
                      ? "bg-[#facc15] hover:bg-[#eab308] text-slate-950 ring-2 ring-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Teguran 1 Sudut Merah (-1 Poin)"
                >
                  <IconTeguran1 
                    active={state.redPenalties.teguran1} 
                    className={`w-5 h-5 md:w-6 md:h-6 object-contain pointer-events-none transition-all ${
                      state.redPenalties.teguran1 ? "opacity-100 filter drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" : "opacity-40 grayscale"
                    }`} 
                  />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.redPenalties.teguran1 ? "text-slate-950" : "text-slate-300"
                  }`}>TEGURAN 1</span>
                </button>

                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "PENALTY", fighter: "RED", penaltyType: "TEGURAN_2" }), 480)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.redPenalties.teguran2
                      ? "bg-[#facc15] hover:bg-[#eab308] text-slate-950 ring-2 ring-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Teguran 2 Sudut Merah (-2 Poin)"
                >
                  <IconTeguran2 
                    active={state.redPenalties.teguran2} 
                    className={`w-5 h-5 md:w-6 md:h-6 object-contain pointer-events-none transition-all ${
                      state.redPenalties.teguran2 ? "opacity-100 filter drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" : "opacity-40 grayscale"
                    }`} 
                  />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.redPenalties.teguran2 ? "text-slate-950" : "text-slate-300"
                  }`}>TEGURAN 2</span>
                </button>

                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "CANCEL_DROP", fighter: "RED" }), 700)}
                  className="bg-[#92400e] hover:bg-[#78350f] text-white font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow border border-amber-600 transition-all"
                  title="Batalkan Jatuhan Sudut Merah (-3 Poin)"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6 pointer-events-none text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  <span className="text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none">JAT. BATAL</span>
                </button>

                {/* Baris 3: Peringatan 1, Peringatan 2, Diskualifikasi */}
                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "PENALTY", fighter: "RED", penaltyType: "PERINGATAN_1" }), 400)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.redPenalties.peringatan1
                      ? "bg-[#ef4444] hover:bg-[#dc2626] text-white ring-2 ring-red-200 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Peringatan 1 Sudut Merah (-5 Poin)"
                >
                  <IconPeringatan1 
                    active={state.redPenalties.peringatan1} 
                    className={`w-5 h-5 md:w-6 md:h-6 object-contain pointer-events-none transition-all ${
                      state.redPenalties.peringatan1 ? "opacity-100 filter drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" : "opacity-40 grayscale"
                    }`} 
                  />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.redPenalties.peringatan1 ? "text-white" : "text-slate-300"
                  }`}>PERINGATAN 1</span>
                </button>

                <button
                  onClick={() => executeAction(() => onDewanAction({ command: "PENALTY", fighter: "RED", penaltyType: "PERINGATAN_2" }), 380)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.redPenalties.peringatan2
                      ? "bg-[#ef4444] hover:bg-[#dc2626] text-white ring-2 ring-red-200 shadow-[0_0_15px_rgba(239,68,68,0.6)] animate-pulse"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Peringatan 2 Sudut Merah (-10 Poin)"
                >
                  <IconPeringatan2 
                    active={state.redPenalties.peringatan2} 
                    className={`w-5 h-5 md:w-6 md:h-6 object-contain pointer-events-none transition-all ${
                      state.redPenalties.peringatan2 ? "opacity-100 filter drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" : "opacity-40 grayscale"
                    }`} 
                  />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.redPenalties.peringatan2 ? "text-white" : "text-slate-300"
                  }`}>PERINGATAN 2</span>
                </button>

                <button
                  onClick={() => executeAction(() => setPendingDisqualify("RED"), 200)}
                  className={`font-black rounded-xl p-2 md:p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow transition-all ${
                    state.redPenalties.disqualified
                      ? "bg-[#831843] hover:bg-[#9d174d] text-white border border-pink-500 ring-2 ring-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.6)] animate-bounce"
                      : "bg-slate-700/80 hover:bg-slate-600/90 text-slate-300 border border-slate-600/60"
                  }`}
                  title="Diskualifikasi Sudut Merah"
                >
                  <Ban className={`w-5 h-5 md:w-6 md:h-6 pointer-events-none transition-all ${
                    state.redPenalties.disqualified ? "text-white" : "text-slate-400"
                  }`} />
                  <span className={`text-[9.5px] md:text-[11px] font-black uppercase text-center leading-none ${
                    state.redPenalties.disqualified ? "text-white" : "text-slate-300"
                  }`}>DISKUALIFIKASI</span>
                </button>
              </div>
            </div>
          </div>

          {/* LOG NILAI MASUK (MERAH) */}
          <div className="bg-[#1a0507] border border-red-900/80 rounded-xl p-2.5 shadow-inner" id="red-log-box">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-black uppercase tracking-wider mb-1.5">
              <FileText className="w-4 h-4 text-rose-400" />
              <span>LOG NILAI MASUK (MERAH)</span>
            </div>
            <div className="bg-[#0f0101]/98 border border-red-900/50 rounded-lg overflow-x-auto shadow-inner">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="border-b border-red-800/40 bg-red-950/60 text-[8px] sm:text-[9px] text-[#c084fc] font-black uppercase tracking-wider font-mono">
                    <th className="py-1.5 px-1 text-center w-[12%] border-r border-[#1e1b4b]">RD</th>
                    <th className="py-1.5 px-1 text-center w-[22%] border-r border-[#1e1b4b]">J1</th>
                    <th className="py-1.5 px-1 text-center w-[22%] border-r border-[#1e1b4b]">J2</th>
                    <th className="py-1.5 px-1 text-center w-[22%] border-r border-[#1e1b4b]">J3</th>
                    <th className="py-1.5 px-1 text-center w-[22%] font-black text-emerald-400">DWN</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((roundNum) => {
                    const j1Logs = getJuryInputsForRound("RED", roundNum, 1);
                    const j2Logs = getJuryInputsForRound("RED", roundNum, 2);
                    const j3Logs = getJuryInputsForRound("RED", roundNum, 3);
                    const dewanLogs = (state.logs || []).filter(
                      log => log.fighter === "RED" && 
                             log.round === roundNum && 
                             (
                               log.type === "DROP" || 
                               log.type === "LOCK" || 
                               (log.type === "PENALTY" && log.points !== 0) ||
                               (log.source && (log.source.includes("Dewan") || log.source.includes("Ketua Pertandingan")))
                             )
                     );
                    return (
                      <tr key={roundNum} className="border-b border-[#260505] text-[8px] sm:text-[9px] font-mono text-center text-slate-300">
                        <td className="py-1 px-1 font-bold bg-[#1a0404] text-rose-300 border-r border-[#260505]">Rd {roundNum}</td>
                        <td className="py-1 px-1 border-r border-[#260505]">
                          {renderLogBadges(j1Logs, false)}
                        </td>
                        <td className="py-1 px-1 border-r border-[#260505]">
                          {renderLogBadges(j2Logs, false)}
                        </td>
                        <td className="py-1 px-1 border-r border-[#260505]">
                          {renderLogBadges(j3Logs, false)}
                        </td>
                        <td className="py-1 px-1">
                          {renderDewanBadges(dewanLogs)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* FOOTER SHORTCUT BAR SAAT DEWAN MEMILIH "CEK NILAI" */}
      {checkingScoresMode !== null && (
        <div 
          id="dewan-footer-shortcut-bar"
          className="sticky bottom-0 left-0 right-0 z-40 mt-4 p-3 sm:p-3.5 bg-gradient-to-r from-[#071330]/95 via-[#0c1c48]/95 to-[#071330]/95 border-t-2 border-amber-400 backdrop-blur-md shadow-[0_-5px_25px_rgba(245,158,11,0.35)] rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in font-sans"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)] shrink-0">
              <FileText className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-sans font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                <span>MODE CEK NILAI AKTIF</span>
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-amber-400 text-slate-950 rounded">
                  {checkingScoresMode === "FINAL_ROUND" ? "AKHIR PERTANDINGAN" : `ANTAR BABAK (BABAK ${state.activeRound})`}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300 font-sans">
                Dewan sedang melakukan penilaian / peninjauan. Tekan tombol <span className="text-amber-300 font-bold">KEMBALI</span> untuk kembali ke Banner Pop Up.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            {checkingScoresMode === "FINAL_ROUND" && (
              <button
                type="button"
                onClick={handleDirectAnnounceWinner}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-sans font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span>UMUMKAN PEMENANG</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playClickSound(800, 0.1);
                setCheckingScoresMode(null);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-sans font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)] cursor-pointer active:scale-95 transition-all flex items-center gap-2 animate-pulse"
            >
              <ArrowLeft className="w-4 h-4 stroke-[3]" />
              <span>KEMBALI</span>
            </button>
          </div>
        </div>
      )}

      {/* DISKUALIFIKASI POPUP NOTIFICATIONS */}
      {state.redPenalties.disqualified && (
        <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-md flex flex-col justify-center items-center p-6 z-50 border-4 border-red-500 text-center animate-fade-in font-sans">
          <div className="w-20 h-20 bg-red-600/10 border-2 border-red-500 text-red-500 flex items-center justify-center rounded-full mb-4 animate-bounce shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <Ban className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-red-500 uppercase tracking-widest leading-none drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]">
            SUDUT MERAH DISKUALIFIKASI!
          </h1>
          <p className="text-sm font-semibold max-w-md text-slate-300 mt-2">
            Pesilat <span className="text-red-450 font-bold underline text-red-400">{state.fighterRedName || "PESILAT MERAH"}</span> telah dinyatakan DISKUALIFIKASI dari pertandingan.
          </p>
          
          {/* WINNER ANNOUNCEMENT FOR OPPONENT */}
          <div className="mt-6 p-5 bg-blue-950/80 border-2 border-blue-500 rounded-2xl animate-pulse w-full max-w-md shadow-2xl shadow-blue-500/20 text-center">
            <span className="text-[10px] tracking-widest uppercase font-mono text-blue-400 block font-black">★ PEMENANG PERTANDINGAN (LAWAN) ★</span>
            <h2 className="text-xl font-black text-white uppercase tracking-tight mt-1 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
              {state.fighterBlueName || "PESILAT SUDUT BIRU"}
            </h2>
            <p className="text-xs text-blue-300 uppercase tracking-wider font-semibold mt-0.5">
              {state.fighterBlueClub || "KONTINGEN BIRU"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 max-w-md w-full justify-center">
            <button
              onClick={() => {
                playClickSound(500, 0.08);
                onDewanAction({ command: "PENALTY", fighter: "RED", penaltyType: "DISQUALIFIED" });
              }}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-slate-850 hover:bg-slate-800 border border-slate-700 hover:border-red-500 text-slate-300 cursor-pointer text-center"
            >
              Batalkan Diskualifikasi
            </button>
            <button
              onClick={() => {
                playClickSound(300, 0.15);
                setPendingDisqualify(null);
                onResetMatch();
              }}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-900 text-slate-400 hover:text-red-400 cursor-pointer text-center"
            >
              Atur Ulang Match
            </button>
          </div>
        </div>
      )}

      {state.bluePenalties.disqualified && (
        <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-md flex flex-col justify-center items-center p-6 z-50 border-4 border-blue-500 text-center animate-fade-in font-sans">
          <div className="w-20 h-20 bg-red-600/10 border-2 border-red-500 text-red-500 flex items-center justify-center rounded-full mb-4 animate-bounce shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <Ban className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-red-500 uppercase tracking-widest leading-none drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]">
            SUDUT BIRU DISKUALIFIKASI!
          </h1>
          <p className="text-sm font-semibold max-w-md text-slate-300 mt-2">
            Pesilat <span className="text-blue-450 font-bold underline text-blue-400">{state.fighterBlueName || "PESILAT BIRU"}</span> telah dinyatakan DISKUALIFIKASI dari pertandingan.
          </p>
          
          {/* WINNER ANNOUNCEMENT FOR OPPONENT */}
          <div className="mt-6 p-5 bg-red-950/80 border-2 border-red-500 rounded-2xl animate-pulse w-full max-w-md shadow-2xl shadow-red-500/20 text-center">
            <span className="text-[10px] tracking-widest uppercase font-mono text-red-400 block font-black">★ PEMENANG PERTANDINGAN (LAWAN) ★</span>
            <h2 className="text-xl font-black text-white uppercase tracking-tight mt-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
              {state.fighterRedName || "PESILAT SUDUT MERAH"}
            </h2>
            <p className="text-xs text-red-300 uppercase tracking-wider font-semibold mt-0.5">
              {state.fighterRedClub || "KONTINGEN MERAH"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8 max-w-md w-full justify-center">
            <button
              onClick={() => {
                playClickSound(500, 0.08);
                onDewanAction({ command: "PENALTY", fighter: "BLUE", penaltyType: "DISQUALIFIED" });
              }}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-slate-850 hover:bg-slate-800 border border-slate-700 hover:border-red-500 text-slate-300 cursor-pointer text-center"
            >
              Batalkan Diskualifikasi
            </button>
            <button
              onClick={() => {
                playClickSound(300, 0.15);
                setPendingDisqualify(null);
                onResetMatch();
              }}
              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-slate-900 hover:bg-red-950/40 border border-slate-800 hover:border-red-900 text-slate-400 hover:text-red-400 cursor-pointer text-center"
            >
              Atur Ulang Match
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE VERIFICATION LIVE OVERLAY */}
      {state.verification && state.verification.active && (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md flex flex-col justify-center items-center p-4 z-50 text-center animate-fade-in font-sans overflow-hidden">
          {/* Animated Purple, Blue, and Yellow Ambient Background Glows */}
          <div className="absolute top-1/4 left-1/4 w-60 h-60 rounded-full bg-purple-600/10 blur-[80px] pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-60 h-60 rounded-full bg-blue-600/10 blur-[80px] pointer-events-none translate-x-1/2 translate-y-1/2 animate-pulse [animation-delay:1s]" />
          <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full bg-yellow-500/5 blur-[70px] pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-pulse [animation-delay:2s]" />

          {/* Small, beautifully stylized overlay card (max-w-[340px]) to match Dewan Lock Screen layout */}
          <div className="w-full max-w-[340px] bg-gradient-to-br from-[#0a0a20] via-[#0d0922] to-[#1e1409]/95 border-2 border-purple-500/40 rounded-2xl p-5 shadow-[0_0_30px_rgba(168,85,247,0.35)] flex flex-col items-center gap-3 relative overflow-hidden">
            {/* High-fidelity Purple, Blue, and Yellow top gradient bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-600 via-blue-500 to-yellow-400" />
            
            {/* Shield Icon inside high-fidelity gradient circle */}
            <div className="text-white animate-[bounce_2s_infinite] bg-gradient-to-r from-purple-600 via-blue-500 to-yellow-400 p-2.5 rounded-full border border-white/20 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Shield className="w-7 h-7" />
            </div>

            <h2 className="text-sm md:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-yellow-400 uppercase tracking-wider leading-none">
              SESI VERIFIKASI DEWAN AKTIF
            </h2>

            <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-yellow-300 bg-gradient-to-r from-purple-950/80 via-blue-950/80 to-yellow-950/60 border border-purple-500/20 rounded-full px-3 py-1.5 shadow-sm">
              KATEGORI: {state.verification.type}
            </p>

            <p className="text-[10px] font-semibold text-slate-300 leading-relaxed opacity-90 max-w-[280px]">
              Menunggu masukan voting real-time dari Juri 1, Juri 2, dan Juri 3.
            </p>

            <div className="w-full p-3 bg-slate-950/80 border border-slate-900 rounded-xl shadow-inner relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-purple-500 via-blue-500 to-yellow-400 opacity-60" />
              
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-900/60">
                <span className="text-[8px] tracking-widest uppercase font-mono text-purple-300 font-bold">MONITOR JURI</span>
                <span className="text-[8px] font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-yellow-400 animate-pulse">
                  SYNCED
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 my-1.5 font-mono">
                {[1, 2, 3].map((jId) => {
                  const jVote = state.verification?.votes?.[jId];
                  const hasVoted = !!jVote;
                  return (
                    <div 
                      key={jId} 
                      className={`relative rounded-lg p-2 flex flex-col items-center justify-center border transition-all duration-300 ${
                        hasVoted 
                          ? jVote === "MERAH"
                            ? "bg-red-950/40 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                            : jVote === "BIRU"
                              ? "bg-blue-950/40 border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.15)]"
                              : "bg-slate-800 border-slate-700"
                          : "bg-slate-950/60 border-slate-900/80 animate-pulse"
                      }`}
                    >
                      <span className="text-[8px] text-slate-400 font-bold">Juri {jId}</span>
                      
                      <div className="h-5 flex items-center justify-center mt-1 w-full">
                        {hasVoted ? (
                          <div className={`text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded-md w-full text-center ${
                            jVote === "MERAH" 
                              ? "bg-red-600 text-white shadow-sm text-nowrap" 
                              : jVote === "BIRU" 
                                ? "bg-blue-600 text-white shadow-sm text-nowrap" 
                                : "bg-slate-700 text-slate-300"
                          }`}>
                            {jVote === "TIDAK SAH" ? "BATAL" : jVote}
                          </div>
                        ) : (
                          <span className="text-[7.5px] font-mono text-amber-500/80 animate-pulse">WAIT...</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[8px] font-mono text-slate-400">
                Total: <span className="font-bold text-white">{Object.values(state.verification?.votes || {}).filter(v => v !== null).length} / 3</span> Juri Voted
              </div>
            </div>

            <button
              onClick={() => {
                playClickSound(300, 0.15);
                if (onResetVerification) onResetVerification();
              }}
              className="mt-1 w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-850 hover:bg-red-950/20 shadow-md border border-slate-800 hover:border-red-900/40 text-slate-300 hover:text-red-400 text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 cursor-pointer"
            >
              Batalkan Sesi Verifikasi
            </button>
          </div>
        </div>
      )}

      {/* VERIFICATION COMPLETION OVERLAY NOTIFICATION */}
      {state.verification && !state.verification.active && state.verification.result && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col justify-center items-center p-6 z-50 border-4 border-amber-500 text-center animate-fade-in font-sans">
          <div className="text-green-500 mb-4 bg-green-500/10 p-4 rounded-full border border-green-500/25">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider leading-none">
            NOTIFIKASI VERIFIKASI DEWAN
          </h1>
          <p className="text-sm font-semibold max-w-md text-amber-200 mt-2">
            Jenis Kejadian: <span className="underline font-bold text-white">{state.verification.type}</span>
          </p>

          <div className="mt-6 p-5 bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-lg">
            <span className="text-[10px] tracking-widest uppercase font-mono text-slate-400 block font-bold">REKAP VOTING (J1, J2, J3)</span>
            <div className="grid grid-cols-3 gap-2 my-2 font-mono text-xs">
              <div className="bg-slate-950 py-1.5 px-1 rounded">Juri 1: <span className={state.verification.votes[1] === "MERAH" ? "text-red-500 font-bold" : state.verification.votes[1] === "BIRU" ? "text-blue-500 font-bold" : "text-slate-400"}>{state.verification.votes[1]}</span></div>
              <div className="bg-slate-950 py-1.5 px-1 rounded">Juri 2: <span className={state.verification.votes[2] === "MERAH" ? "text-red-500 font-bold" : state.verification.votes[2] === "BIRU" ? "text-blue-500 font-bold" : "text-slate-400"}>{state.verification.votes[2]}</span></div>
              <div className="bg-slate-950 py-1.5 px-1 rounded">Juri 3: <span className={state.verification.votes[3] === "MERAH" ? "text-red-500 font-bold" : state.verification.votes[3] === "BIRU" ? "text-blue-500 font-bold" : "text-slate-400"}>{state.verification.votes[3]}</span></div>
            </div>

            <div className={`mt-4 p-3 rounded-xl border font-bold text-sm ${
              state.verification.result === "TIDAK SAH" ? "bg-slate-950 border-slate-800 text-slate-400" : state.verification.result === "MERAH" ? "bg-red-950/40 border-red-900/50 text-red-500" : "bg-blue-950/40 border-blue-900/50 text-blue-500"
            }`}>
              {state.verification.result === "TIDAK SAH" ? (
                <span className="uppercase text-red-500 font-black">TIDAK SAH</span>
              ) : (
                <span className="uppercase font-black">{state.verification.type} SAH ({state.verification.result === "MERAH" ? "SUDUT MERAH" : "SUDUT BIRU"})</span>
              )}
            </div>
          </div>

          <button
            onClick={() => executeAction(() => onResetVerification && onResetVerification(), 400)}
            className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs px-5 py-2.5 rounded-lg transition-all active:scale-95 cursor-pointer"
          >
            Selesai & Bersihkan Verifikasi
          </button>
        </div>
      )}

      {/* MATCH EVENT LOGS */}
      {/* Moved locally under corners as requested */}

      {/* CUSTOM DISKUALIFIKASI CONFIRMATION MODAL */}
      {pendingDisqualify && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center relative overflow-hidden animate-scale-in">
            <div className="absolute top-0 inset-x-0 h-1 bg-red-500" />
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-3 text-red-500">
              <Ban className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white uppercase tracking-tight mb-1">
              Diskualifikasi Sudut {pendingDisqualify === "RED" ? "Merah" : "Biru"}?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Apakah Anda yakin ingin menyatakan sanksi 
              <span className="text-red-500 font-extrabold uppercase"> Diskualifikasi </span> 
              untuk <span className="font-bold underline text-white">{pendingDisqualify === "RED" ? state.fighterRedName || "PESILAT MERAH" : state.fighterBlueName || "PESILAT BIRU"}</span>? 
              <br />
              <span className="text-amber-400 font-bold mt-1.5 block">
                Tindakan ini mutlak dan langsung memenangkan pesilat sudut lawan ({pendingDisqualify === "RED" ? "Sudut Biru" : "Sudut Merah"}).
              </span>
            </p>
            <div className="flex gap-2 justify-center font-sans">
              <button
                onClick={() => {
                  playClickSound(500, 0.08);
                  setPendingDisqualify(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-semibold hover:text-white transition-all active:scale-95 cursor-pointer flex-1"
              >
                Kembali
              </button>
              <button
                onClick={() => {
                  playClickSound(950, 0.15);
                  onDewanAction({ command: "PENALTY", fighter: pendingDisqualify, penaltyType: "DISQUALIFIED" });
                  setPendingDisqualify(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold transition-all active:scale-95 cursor-pointer flex-1 shadow-[0_0_10px_rgba(239,68,68,0.35)]"
              >
                YA, DISKUALIFIKASI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CEK VAR BLUE MODAL (ARENA LED MODERN) */}
      {showVarBlue && (
        <div className="fixed inset-0 z-[100] bg-[#020512]/95 backdrop-blur-2xl flex items-center justify-center p-4">
          {selectedVarBlueType === null ? (
            <div className="bg-gradient-to-b from-[#081538] to-[#020614] border-2 border-cyan-500/50 rounded-[28px] p-6 max-w-sm w-full shadow-[0_0_60px_rgba(6,182,212,0.4)] text-center relative overflow-hidden animate-scale-in font-sans">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 animate-pulse" />
              <div className="w-12 h-12 rounded-full bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center mx-auto mb-3 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                <Shield className="w-6 h-6 animate-pulse" />
              </div>
              
              <div className="flex flex-col gap-0.5 mb-5">
                <h3 className="text-sm font-sans font-black text-white tracking-widest uppercase">PILIH KASUS CEK VAR</h3>
                <span className="text-xs font-sans font-black text-cyan-400 uppercase tracking-widest">SUDUT BIRU</span>
              </div>

              <div className="flex gap-2.5 w-full mb-4">
                <button
                  onClick={() => {
                    playClickSound(1000, 0.1);
                    setSelectedVarBlueType("JATUHAN");
                  }}
                  className="flex-grow bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-sans font-black text-[11px] tracking-wider uppercase py-3 px-2 rounded-xl transition-all border-none shadow-[0_0_15px_rgba(245,158,11,0.4)] cursor-pointer text-center active:scale-95"
                >
                  VAR JATUHAN
                </button>
                <button
                  onClick={() => {
                    playClickSound(1000, 0.1);
                    setSelectedVarBlueType("PELANGGARAN");
                  }}
                  className="flex-grow bg-[#091535] border border-cyan-500/40 hover:bg-blue-900/40 text-cyan-300 font-sans font-black text-[11px] tracking-wider uppercase py-3 px-2 rounded-xl transition-all shadow-md cursor-pointer text-center active:scale-95"
                >
                  VAR PELANGGARAN
                </button>
              </div>

              <button
                onClick={() => {
                  playClickSound(700, 0.1);
                  setShowVarBlue(false);
                }}
                className="text-[10px] font-mono font-extrabold text-slate-400 hover:text-white underline cursor-pointer border-none bg-transparent py-1.5 uppercase tracking-wider transition-colors"
              >
                BATAL / TUTUP
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-b from-[#081538] to-[#020614] border-2 border-cyan-500/50 rounded-[28px] p-8 max-w-[420px] w-full shadow-[0_0_60px_rgba(6,182,212,0.4)] text-center relative overflow-hidden animate-scale-in font-sans">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 animate-pulse" />
              <div className="text-center mb-5">
                <h4 className="text-[16px] font-sans font-black text-white uppercase tracking-wider leading-none">
                  VERIFIKASI VAR AKTIF
                </h4>
                <p className="text-[13px] font-sans font-black text-cyan-400 uppercase tracking-widest mt-1.5">
                  SUDUT BIRU
                </p>
                <p className="text-[9.5px] font-mono font-extrabold bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 px-3 py-1 rounded-full inline-block mt-2.5 uppercase tracking-wider shadow-inner">
                  KASUS: {selectedVarBlueType === "JATUHAN" ? "JATUHAN (+3)" : "PELANGGARAN"}
                </p>
              </div>

              <p className="text-[11px] font-sans text-slate-300 leading-relaxed text-center px-2 font-normal opacity-90 max-w-full mb-6">
                Silakan tinjau rekaman video (VAR). Tentukan keputusan keabsahan hasil VAR dari sudut ini:
              </p>

              <div className="flex gap-3 w-full mt-2 mb-4">
                <button
                  onClick={() => {
                    executeAction(() => {
                      if (selectedVarBlueType === "JATUHAN") {
                        onDewanAction({ command: "DROP", fighter: "BLUE" });
                      } else {
                        onDewanAction({ command: "OVERRIDE", fighter: "BLUE", overridePoints: 0 });
                      }
                      onStartVerification?.(selectedVarBlueType, "BLUE");
                      setShowVarBlue(false);
                      setSelectedVarBlueType(null);
                    }, 1150);
                  }}
                  className="flex-grow bg-[#008000] hover:bg-emerald-400 text-white font-sans font-black text-[13px] tracking-wider uppercase py-4 px-6 rounded-2xl transition-all border-none shadow-[0_0_20px_rgba(0, 128, 0,0.5)] cursor-pointer text-center hover:scale-102 active:scale-96"
                >
                  SAH
                </button>
                <button
                  onClick={() => {
                    executeAction(() => {
                      onDewanAction({ command: "OVERRIDE", fighter: "BLUE", overridePoints: 0 });
                      onStartVerification?.(selectedVarBlueType, "BLUE");
                      setShowVarBlue(false);
                      setSelectedVarBlueType(null);
                    }, 400);
                  }}
                  className="flex-grow bg-[#18040a] border-2 border-rose-500/50 hover:bg-red-950/40 text-rose-300 font-sans font-black text-[13px] tracking-wider uppercase py-4 px-6 rounded-2xl transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] cursor-pointer text-center hover:scale-102 active:scale-96"
                >
                  TIDAK SAH
                </button>
              </div>

              <button
                onClick={() => {
                  playClickSound(700, 0.1);
                  setShowVarBlue(false);
                  setSelectedVarBlueType(null);
                }}
                className="text-[10px] font-mono font-extrabold text-slate-400 hover:text-white underline cursor-pointer border-none bg-transparent py-1 uppercase tracking-widest transition-colors block mx-auto mt-2"
              >
                BATAL / TUTUP
              </button>
            </div>
          )}
        </div>
      )}

      {/* 1. PROMPT MENU VERIFIKASI DEWAN (IPSI 2026) */}
      {showVerificationPrompt && (
        <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-gradient-to-b from-[#0c1838] via-[#050b1d] to-[#02050f] border-2 border-amber-400/70 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-[0_0_60px_rgba(245,158,11,0.4)] relative text-left font-sans">
            {/* Top IPSI Gold Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-t-3xl shadow-[0_0_15px_#f59e0b]" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-400/25 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <Shield className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-sans font-black text-white uppercase tracking-wider leading-none">
                    PROMPT VERIFIKASI DEWAN
                  </h3>
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-400/90 uppercase tracking-widest block mt-1">
                    STANDAR PB IPSI & PERSILAT 2026
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVerificationPrompt(false)}
                className="p-1.5 rounded-full hover:bg-slate-800/60 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Pilih Sudut Pesilat */}
            <div className="mb-4">
              <label className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <span>1. PILIH SUDUT PESILAT (YANG DITINJAU)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPromptCorner("BLUE")}
                  className={`p-3 rounded-2xl border-2 font-sans font-bold flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-98 ${
                    promptCorner === "BLUE"
                      ? "bg-gradient-to-br from-blue-700 to-blue-900 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-102"
                      : "bg-[#061230] border-blue-900/50 text-blue-300 hover:border-blue-600/60"
                  }`}
                >
                  <span className="text-[9px] font-mono tracking-widest uppercase">SUDUT BIRU</span>
                  <span className="text-xs sm:text-sm font-black truncate max-w-full">
                    {state.fighterBlueName || "PESILAT BIRU"}
                  </span>
                  <span className="text-[8.5px] opacity-80 truncate max-w-full">
                    {state.fighterBlueClub || "KONTINGEN BIRU"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPromptCorner("RED")}
                  className={`p-3 rounded-2xl border-2 font-sans font-bold flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-98 ${
                    promptCorner === "RED"
                      ? "bg-gradient-to-br from-red-700 to-red-900 border-rose-400 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] scale-102"
                      : "bg-[#20060d] border-red-900/50 text-red-300 hover:border-red-600/60"
                  }`}
                >
                  <span className="text-[9px] font-mono tracking-widest uppercase">SUDUT MERAH</span>
                  <span className="text-xs sm:text-sm font-black truncate max-w-full">
                    {state.fighterRedName || "PESILAT MERAH"}
                  </span>
                  <span className="text-[8.5px] opacity-80 truncate max-w-full">
                    {state.fighterRedClub || "KONTINGEN MERAH"}
                  </span>
                </button>
              </div>
            </div>

            {/* Step 2: Pilih Kategori Verifikasi */}
            <div className="mb-4">
              <label className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <span>2. KATEGORI TINJAUAN REKAMAN / VAR</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPromptType("JATUHAN");
                    setPromptReason("Bantingan Murni Sah (Tanpa Pelanggaran)");
                  }}
                  className={`p-3 rounded-2xl border-2 font-sans font-black flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-98 ${
                    promptType === "JATUHAN"
                      ? "bg-gradient-to-br from-amber-500 to-yellow-600 border-yellow-200 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                      : "bg-[#161208] border-amber-900/50 text-amber-400/80 hover:border-amber-700"
                  }`}
                >
                  <span className="text-xs sm:text-sm tracking-wider uppercase">VERIFIKASI JATUHAN</span>
                  <span className="text-[9px] font-mono font-bold opacity-90">+3 POIN JATUHAN JIKA SAH</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPromptType("PELANGGARAN");
                    setPromptReason("Pukulan / Tendangan Mengarah Kepala / Leher");
                  }}
                  className={`p-3 rounded-2xl border-2 font-sans font-black flex flex-col items-center gap-1 transition-all cursor-pointer active:scale-98 ${
                    promptType === "PELANGGARAN"
                      ? "bg-gradient-to-br from-rose-600 to-red-700 border-rose-300 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)]"
                      : "bg-[#1f0910] border-rose-900/50 text-rose-300/80 hover:border-rose-700"
                  }`}
                >
                  <span className="text-xs sm:text-sm tracking-wider uppercase">VERIFIKASI PELANGGARAN</span>
                  <span className="text-[9px] font-mono font-bold opacity-90">HUKUMAN / SANKSI WASIT</span>
                </button>
              </div>
            </div>

            {/* Step 3: Alasan & Kasus Presets (IPSI 2026) */}
            <div className="mb-4">
              <label className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                <span>3. DETAIL ALASAN / KASUS TINJAUAN (IPSI 2026)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {(promptType === "JATUHAN" ? [
                  "Bantingan Murni Sah (Tanpa Pelanggaran)",
                  "Sapuan / Guntingan Rebah Bersih",
                  "Tangkapan & Serangan Balik 1 Langkah Sah",
                  "Jatuhan Bersama: Sudut Ini Berada di Atas Sah",
                  "Serangan Balik (Counter Attack) Merebahkan Lawan",
                  "Kuncian Sah Merebahkan Lawan (5 Detik)"
                ] : [
                  "Pukulan / Tendangan Mengarah Kepala / Leher",
                  "Menyerang Lawan Saat Posisi Rebah / Jatuh",
                  "Menyerang Setelah Wasit Mengucap 'TI' / 'BERHENTI'",
                  "Keluar Garis Batas Gelanggang (Keluar Arena)",
                  "Menyerang Area Terlarang (Kemaluan / Tulang Belakang)",
                  "Menahan / Menarik Baju Lawan Melebihi Toleransi"
                ]).map((reasonOption) => {
                  const isSelected = promptReason === reasonOption && !customReason;
                  return (
                    <button
                      key={reasonOption}
                      type="button"
                      onClick={() => {
                        setPromptReason(reasonOption);
                        setCustomReason("");
                      }}
                      className={`px-3 py-2 rounded-xl text-left text-[10px] sm:text-[11px] font-sans transition-all border cursor-pointer leading-tight flex items-center gap-2 ${
                        isSelected
                          ? "bg-amber-400 text-slate-950 font-black border-amber-200 shadow-md"
                          : "bg-[#07132e] text-slate-300 border-indigo-900/50 hover:bg-[#0c1f4a] hover:text-white"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-slate-950" : "bg-slate-600"}`} />
                      <span className="flex-1">{reasonOption}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom input note */}
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Atau ketik catatan kasus khusus verifikasi lainnya..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full bg-[#040a1c] border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Regulation notice */}
            <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-2xl mb-4 text-[10px] sm:text-[11px] text-amber-200/90 leading-relaxed font-sans flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block mb-0.5 uppercase tracking-wide">
                  Regulasi Konsensus PB IPSI 2026:
                </span>
                Sesi verifikasi akan langsung muncul di Layar Juri 1, 2, 3 dan Layar Utama Penonton. Keputusan sah membutuhkan suara mayoritas minimal 2 dari 3 Juri.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  playClickSound(1200, 0.2);
                  const finalReason = customReason.trim() || promptReason;
                  if (onStartVerification) {
                    onStartVerification(promptType, promptCorner, finalReason);
                  }
                  setShowVerificationPrompt(false);
                }}
                className="flex-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-sans font-black text-xs sm:text-sm py-3.5 px-4 rounded-2xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.6)] cursor-pointer active:scale-98 uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>MULAI VERIFIKASI RESMI (IPSI 2026)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowVerificationPrompt(false)}
                className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors border border-slate-800 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. LIVE SESSION MONITOR VERIFIKASI DEWAN (IPSI 2026) */}
      {state.verification && state.verification.active && (
        <div className="fixed inset-0 z-[130] bg-[#020512]/95 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-gradient-to-b from-[#0e1d44] via-[#06102c] to-[#020514] border-2 border-cyan-400/80 rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-[0_0_70px_rgba(6,182,212,0.5)] relative text-center font-sans">
            {/* Top Accent Strip */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-amber-400 to-blue-500 rounded-t-3xl shadow-[0_0_20px_#06b6d4]" />

            {/* Header info */}
            <div className="flex flex-col items-center gap-1.5 mb-4 pb-3 border-b border-cyan-500/25">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 font-mono text-[10px] font-black uppercase tracking-widest shadow-inner">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                SESI MONITOR VERIFIKASI DEWAN AKTIF • IPSI 2026
              </div>

              <h2 className="text-lg sm:text-2xl font-sans font-black text-white tracking-wider uppercase mt-1">
                KONSENSUS JURI: {state.verification.type}
              </h2>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-1 text-xs">
                <span className={`px-3 py-0.5 rounded-full font-black uppercase tracking-wider ${
                  state.verification.corner === "RED"
                    ? "bg-red-600 text-white border border-rose-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    : "bg-blue-600 text-white border border-cyan-300 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                }`}>
                  SUDUT {state.verification.corner === "RED" ? "MERAH" : "BIRU"} (
                  {state.verification.corner === "RED" ? state.fighterRedName : state.fighterBlueName}
                  )
                </span>
              </div>

              {state.verification.reason && (
                <div className="mt-2 text-xs font-medium text-slate-300 bg-[#030a1c] border border-cyan-500/30 px-3.5 py-1.5 rounded-xl max-w-lg">
                  <span className="text-amber-400 font-mono font-bold mr-1.5 uppercase tracking-wide">Kasus:</span>
                  "{state.verification.reason}"
                </div>
              )}
            </div>

            {/* LIVE JURY VOTES GRID (Juri 1, Juri 2, Juri 3) */}
            <div className="mb-5">
              <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-widest block mb-2 text-center">
                STATUS SUARA 3 JURI SECARA WAKTU NYATA (REAL-TIME)
              </span>
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                {[1, 2, 3].map((jId) => {
                  const vote = state.verification?.votes?.[jId];
                  const hasVoted = !!vote;
                  return (
                    <div
                      key={jId}
                      className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-between gap-2 transition-all duration-200 ${
                        vote === "MERAH"
                          ? "bg-gradient-to-b from-red-950/90 to-[#260307] border-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] scale-102"
                          : vote === "BIRU"
                          ? "bg-gradient-to-b from-blue-950/90 to-[#040e28] border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] scale-102"
                          : vote === "TIDAK SAH"
                          ? "bg-gradient-to-b from-slate-900 to-slate-950 border-amber-400/80 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] scale-102"
                          : "bg-[#030919]/90 border-indigo-900/60 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-400 uppercase">
                          GAWAI JURI {jId}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${hasVoted ? "bg-emerald-400 shadow-[0_0_8px_#008000]" : "bg-amber-400 animate-pulse"}`} />
                      </div>

                      <div className="py-1">
                        {hasVoted ? (
                          <div className="font-sans font-black text-sm sm:text-base tracking-wider uppercase">
                            {vote === "MERAH" ? "🔴 SAH MERAH" : vote === "BIRU" ? "🔵 SAH BIRU" : "✖️ TIDAK SAH"}
                          </div>
                        ) : (
                          <div className="text-[10px] sm:text-xs font-mono text-amber-300/80 italic animate-pulse">
                            Menunggu Suara...
                          </div>
                        )}
                      </div>

                      <span className="text-[8px] font-mono opacity-75 uppercase">
                        {hasVoted ? "Tercatat di Server" : "Belum Memilih"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CONSENSUS BANNER COMPUTATION */}
            {(() => {
              const votes = state.verification?.votes || {};
              const list = [votes[1], votes[2], votes[3]].filter(Boolean);
              const countMerah = list.filter((v) => v === "MERAH").length;
              const countBiru = list.filter((v) => v === "BIRU").length;
              const countTidakSah = list.filter((v) => v === "TIDAK SAH").length;

              let consensus: "MERAH" | "BIRU" | "TIDAK SAH" | null = null;
              let consensusCount = 0;
              if (countMerah >= 2) {
                consensus = "MERAH";
                consensusCount = countMerah;
              } else if (countBiru >= 2) {
                consensus = "BIRU";
                consensusCount = countBiru;
              } else if (countTidakSah >= 2) {
                consensus = "TIDAK SAH";
                consensusCount = countTidakSah;
              }

              return (
                <div className="mb-5">
                  {consensus ? (
                    <div className="p-3.5 bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-emerald-950/80 border-2 border-emerald-400/80 rounded-2xl text-white shadow-[0_0_25px_rgba(0, 128, 0,0.5)]">
                      <span className="text-[10px] font-mono font-black text-emerald-300 uppercase tracking-widest block mb-0.5">
                        ✅ KONSENSUS ATURAN IPSI 2026 TERCAPAI
                      </span>
                      <span className="text-sm sm:text-base font-sans font-black tracking-wider uppercase">
                        HASIL MAYORITAS: {consensus === "MERAH" ? "SAH SUDUT MERAH" : consensus === "BIRU" ? "SAH SUDUT BIRU" : "TIDAK SAH"} ({consensusCount}/3 JURI)
                      </span>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-[#040d24] border border-cyan-500/30 rounded-2xl text-slate-300">
                      <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-widest block mb-0.5">
                        MENUNGGU MINIMAL 2 SUARA SEPADAN (IPSI 2026)
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {list.length} dari 3 Juri telah memberikan keputusan verifikasi.
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* SAHKAN BUTTON */}
              <button
                type="button"
                onClick={() => {
                  playClickSound(1200, 0.2);
                  const targetCorner = state.verification?.corner || "RED";
                  const decision = targetCorner === "RED" ? "MERAH" : "BIRU";
                  if (onApplyVerification) {
                    onApplyVerification(decision);
                  } else {
                    if (state.verification?.type === "JATUHAN") {
                      onDewanAction({ command: "DROP", fighter: targetCorner });
                    }
                    if (onResetVerification) onResetVerification();
                  }
                }}
                className="flex-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:to-teal-400 text-white font-sans font-black text-xs sm:text-sm py-3.5 px-4 rounded-2xl transition-all shadow-[0_0_25px_rgba(0, 128, 0,0.5)] cursor-pointer active:scale-98 uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>SAHKAN KEPUTUSAN ({state.verification.corner === "RED" ? "MERAH" : "BIRU"})</span>
              </button>

              {/* TIDAK SAH BUTTON */}
              <button
                type="button"
                onClick={() => {
                  playClickSound(900, 0.15);
                  if (onApplyVerification) {
                    onApplyVerification("TIDAK SAH");
                  } else {
                    if (onResetVerification) onResetVerification();
                  }
                }}
                className="flex-1 bg-gradient-to-r from-rose-800 to-red-900 hover:from-rose-700 hover:to-red-800 text-rose-100 font-sans font-black text-xs sm:text-sm py-3.5 px-4 rounded-2xl transition-all border border-rose-500/50 shadow-md cursor-pointer active:scale-98 uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                <span>TETAPKAN TIDAK SAH</span>
              </button>

              {/* BATALKAN / TUTUP BUTTON */}
              <button
                type="button"
                onClick={() => {
                  playClickSound(700, 0.1);
                  if (onResetVerification) onResetVerification();
                }}
                className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors border border-slate-800 cursor-pointer"
              >
                Tutup Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DEKLARASI KEMENANGAN (ARENA LED MODERN) */}
      {showVictoryModal && (
        <div className="fixed inset-0 z-[100] bg-[#020512]/95 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#0a1538] to-[#020512] border-2 border-cyan-500/50 rounded-[28px] p-6 max-w-2xl w-full shadow-[0_0_60px_rgba(6,182,212,0.4)] text-center relative overflow-hidden animate-scale-in font-sans">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 animate-pulse" />
            
            <div className="text-center mb-5">
              <h3 className="text-base font-sans font-black text-white uppercase tracking-widest leading-none flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" /> DEKLARASI KEPUTUSAN KEMENANGAN
              </h3>
              <p className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest mt-1.5">
                PANEL KETUA / DEWAN PERTANDINGAN IPSI
              </p>
            </div>

            {/* LANGKAH 1: PILIH PEMENANG */}
            <div className="text-left mb-4">
              <span className="text-[10.5px] font-sans font-black text-slate-300 uppercase tracking-widest block mb-2 text-center">
                LANGKAH 1: PILIH PEMENANG (SUDUT)
              </span>
              <div className="grid grid-cols-2 gap-4">
                {/* BIRU WINNER BUTTON */}
                <button
                  onClick={() => {
                    playClickSound(1000, 0.12);
                    setVictoryWinner("BLUE");
                  }}
                  className={`border-2 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    victoryWinner === "BLUE"
                      ? "bg-blue-600 border-cyan-300 text-white shadow-[0_0_30px_rgba(6,182,212,0.6)] scale-102"
                      : "bg-[#061230] border-blue-900/60 text-blue-300 hover:border-blue-700"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${victoryWinner === "BLUE" ? "bg-white animate-pulse border-cyan-300 shadow-[0_0_8px_rgba(255,255,255,1)]" : "bg-blue-950 border-blue-900"} border`} />
                  <span className={`text-sm font-sans font-black tracking-widest uppercase ${victoryWinner === "BLUE" ? "text-white font-black" : "text-blue-400 font-bold"}`}>
                    SUDUT BIRU
                  </span>
                  <span className={`text-[10px] font-bold max-w-full truncate ${victoryWinner === "BLUE" ? "text-cyan-100" : "text-blue-300"}`}>
                    {state.fighterBlueName || "PESILAT BIRU"}
                  </span>
                </button>

                {/* MERAH WINNER BUTTON */}
                <button
                  onClick={() => {
                    playClickSound(1000, 0.12);
                    setVictoryWinner("RED");
                  }}
                  className={`border-2 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                    victoryWinner === "RED"
                      ? "bg-red-600 border-rose-300 text-white shadow-[0_0_30px_rgba(244,63,94,0.6)] scale-102"
                      : "bg-[#20060d] border-red-900/60 text-red-300 hover:border-red-700"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full ${victoryWinner === "RED" ? "bg-white animate-pulse border-rose-300 shadow-[0_0_8px_rgba(255,255,255,1)]" : "bg-red-950 border-red-900"} border`} />
                  <span className={`text-sm font-sans font-black tracking-widest uppercase ${victoryWinner === "RED" ? "text-white font-black" : "text-red-400 font-bold"}`}>
                    SUDUT MERAH
                  </span>
                  <span className={`text-[10px] font-bold max-w-full truncate ${victoryWinner === "RED" ? "text-rose-100" : "text-red-300"}`}>
                    {state.fighterRedName || "PESILAT MERAH"}
                  </span>
                </button>
              </div>
            </div>

            {/* LANGKAH 2: PILIH METODE KEMENANGAN */}
            <div className="text-left mb-6">
              <span className="text-[10.5px] font-sans font-black text-slate-300 uppercase tracking-widest block mb-1 text-center">
                LANGKAH 2: PILIH METODE KEMENANGAN KELAS TANDING
              </span>
              
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {[
                  {
                    id: "TEKNIK",
                    title: "1. Menang Teknik",
                    desc: "Keputusan yang diberikan wasit ketika lawan menyerah karena tidak mampu melanjutkan pertandingan atau karena jelas terlihat kalah teknik."
                  },
                  {
                    id: "MUTLAK",
                    title: "2. Menang Mutlak",
                    desc: "Terjadi apabila pertandingan dihentikan oleh wasit karena salah satu pesilat jatuh dan tidak dapat bangun lagi dalam hitungan ke-10 atau terkena pukulan/tendangan sah yang telak."
                  },
                  {
                    id: "DISKUALIFIKASI",
                    title: "3. Menang Diskualifikasi",
                    desc: "Diberikan apabila lawan mendapatkan Peringatan III, melakukan pelanggaran berat, atau melakukan pelanggaran yang mencederakan lawan sehingga tidak bisa melanjutkan pertandingan atas keputusan dokter."
                  },
                  {
                    id: "WO",
                    title: "4. Menang WO (Walk Over)",
                    desc: "Diberikan kepada seorang pesilat karena lawannya tidak hadir di gelanggang pertandingan atau menolak bertanding meskipun sudah dipanggil."
                  },
                  {
                    id: "TIDAK_DAPAT_MELANJUTKAN",
                    title: "5. Menang Karena Lawan Tidak Dapat Melanjutkan",
                    desc: "Terjadi jika dokter pertandingan memutuskan lawan tidak boleh melanjutkan laga, biasanya karena cedera akibat serangan yang sah."
                  }
                ].map((type) => {
                  const isSelected = selectedVictoryType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        playClickSound(950, 0.08);
                        setSelectedVictoryType(type.id as any);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-cyan-950/80 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] text-white"
                          : "bg-[#060c20]/80 border-blue-950/80 text-slate-400 hover:bg-[#091535] hover:border-cyan-500/40 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${isSelected ? "border-cyan-400 bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,1)]" : "border-slate-600 bg-transparent"}`}>
                          {isSelected && <span className="w-1 h-1 rounded-full bg-slate-950" />}
                        </span>
                        <span className="text-[11.5px] font-sans font-black tracking-wide uppercase text-white">
                          {type.title}
                        </span>
                      </div>
                      <p className="text-[10px] font-sans text-slate-400 pl-5 leading-normal">
                        {type.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TOMBOL AKSI */}
            <div className="flex gap-3">
              <button
                disabled={!victoryWinner || !selectedVictoryType}
                onClick={() => {
                  executeAction(() => {
                    if (victoryWinner && selectedVictoryType) {
                      const finalMethodLabel = getVictoryTypeLabel(selectedVictoryType);
                      onDewanAction({
                        command: "DECLARE_VICTORY",
                        fighter: victoryWinner,
                        penaltyType: finalMethodLabel
                      });
                      setShowVictoryModal(false);
                      setSelectedVictoryType(null);
                      setVictoryWinner(null);
                    }
                  }, 1200);
                }}
                className={`flex-grow font-sans font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-2xl transition duration-150 border-none shadow-lg text-center ${
                  victoryWinner && selectedVictoryType
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 cursor-pointer hover:scale-101 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                    : "bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800"
                }`}
              >
                KONFIRMASI & DEKLARASI PEMENANG
              </button>
              
              <button
                onClick={() => {
                  playClickSound(700, 0.1);
                  setShowVictoryModal(false);
                  setSelectedVictoryType(null);
                  setVictoryWinner(null);
                }}
                className="bg-[#1a080d] hover:bg-red-950/50 border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white font-sans font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-2xl transition-all shadow-[0_0_15px_rgba(244,63,94,0.2)] cursor-pointer text-center active:scale-95"
              >
                BATAL / TUTUP
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
