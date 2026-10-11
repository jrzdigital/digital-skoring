/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { MatchState, MatchStatus } from "../types";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Minus, 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Bell, 
  FastForward, 
  CheckCircle, 
  AlertTriangle, 
  Radio, 
  Clock, 
  Shield, 
  Award,
  Lock,
  Unlock,
  Megaphone,
  PlusCircle,
  Trophy,
  X,
  RotateCw,
  Sparkles,
  QrCode,
  Settings
} from "lucide-react";
import { sound } from "../utils/sound";
import { JuryConnectModal } from "./JuryConnectModal";
import { WhistleIcon } from "./icons/WhistleIcon";

interface OperatorPanelProps {
  state?: MatchState;
  matchState?: MatchState;
  onTimerCommand: (command: "START" | "PAUSE" | "ADD_10" | "SUB_10" | "RESET") => Promise<void> | void;
  onRoundAction: (action: "NEXT" | "SET" | "FINISH", targetRound?: number) => Promise<void> | void;
  onUpdateMetadata: (data: Partial<MatchState>) => Promise<void> | void;
  onResetMatch?: (customPayload?: Partial<MatchState>) => Promise<void> | void;
  onBack: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

// Interactive 30-Second Inter-Round Break Timer Component
function BreakCountdownTimer({ onFinish }: { onFinish?: () => void }) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isActive, setIsActive] = useState(true);
  const prevBreakTimeRef = useRef<number>(30);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((time) => Math.max(0, time - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, timeLeft > 0]);

  useEffect(() => {
    if (timeLeft === 0 && prevBreakTimeRef.current > 0) {
      setIsActive(false);
      try {
        sound.playWhistle();
      } catch {}
      if (onFinish) onFinish();
    }
    prevBreakTimeRef.current = timeLeft;
  }, [timeLeft, onFinish]);

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / 30) * 100));

  return (
    <div className="bg-[#170a2c] border border-purple-900/60 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs font-mono font-bold text-purple-300">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-amber-300">
          <Clock className={`w-3.5 h-3.5 text-amber-400 ${timeLeft > 0 && isActive ? "animate-spin" : ""}`} />
          {timeLeft > 0 ? "HITUNG MUNDUR JEDA ISTIRAHAT (30 DETIK)" : "🔔 WAKTU ISTIRAHAT 30s SELESAI (PELUIT)"}
        </span>
        <span className={`text-xl sm:text-2xl font-black tabular-nums ${timeLeft === 0 ? "text-rose-400 animate-pulse" : "text-amber-400"}`}>
          {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-purple-950 rounded-full overflow-hidden border border-purple-900/40">
        <div 
          className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-1000 ease-linear rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Controls for break timer */}
      <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsActive(!isActive)}
            className="px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/50 font-bold uppercase transition-all cursor-pointer"
          >
            {isActive ? "⏸️ JEDA" : "▶️ LANJUTKAN"}
          </button>
          <button
            onClick={() => {
              prevBreakTimeRef.current = 30;
              setTimeLeft(30);
              setIsActive(true);
            }}
            className="px-2 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/50 font-bold uppercase transition-all cursor-pointer"
          >
            RESET 30s
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTimeLeft(prev => Math.max(0, prev - 10))}
            className="px-2 py-1 rounded-lg bg-purple-900/40 text-purple-300 border border-purple-800 hover:text-white cursor-pointer"
          >
            -10s
          </button>
          <button
            onClick={() => setTimeLeft(prev => prev + 10)}
            className="px-2 py-1 rounded-lg bg-purple-900/40 text-purple-300 border border-purple-800 hover:text-white cursor-pointer"
          >
            +10s
          </button>
        </div>
      </div>
    </div>
  );
}

export function OperatorPanel({
  state,
  matchState: propMatchState,
  onTimerCommand,
  onRoundAction,
  onUpdateMetadata,
  onResetMatch,
  onBack,
  onToggleFullscreen,
  isFullscreen = false
}: OperatorPanelProps) {
  const matchState = propMatchState || state!;
  const [customMinutes, setCustomMinutes] = useState<number>(2);
  const [customSeconds, setCustomSeconds] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  
  // Modals & Pop-up States
  const [showBreakModal, setShowBreakModal] = useState<boolean>(false);
  const [isBreakDismissed, setIsBreakDismissed] = useState<boolean>(false);
  const [showFinalDecisionModal, setShowFinalDecisionModal] = useState<boolean>(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [showTimerSettingsModal, setShowTimerSettingsModal] = useState<boolean>(false);
  const [wmpFlashDismissed, setWmpFlashDismissed] = useState<boolean>(false);
  const [wmpStrobePhase, setWmpStrobePhase] = useState<boolean>(false);
  
  // Peluit Wasit & Waktu Hitungan Atlet Cedera 10 Detik
  const [whistleActive, setWhistleActive] = useState<boolean>(false);
  const [injuryCountdown, setInjuryCountdown] = useState<number | null>(null);
  const [isInjuryRunning, setIsInjuryRunning] = useState<boolean>(false);
  const [showInjuryModal, setShowInjuryModal] = useState<boolean>(false);
  const [injuryCorner, setInjuryCorner] = useState<"BLUE" | "RED" | "UMUM">("UMUM");
  
  // Async Action Loaders
  const [winnerPublishing, setWinnerPublishing] = useState<boolean>(false);
  const [nextMatchLoading, setNextMatchLoading] = useState<boolean>(false);
  const [addRound4Loading, setAddRound4Loading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile Device & Fullscreen Detection
  const checkIsMobileDevice = () => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const minDim = Math.min(window.innerWidth, window.innerHeight);
    const maxDim = Math.max(window.innerWidth, window.innerHeight);
    const isMobileViewport = minDim <= 540 && maxDim <= 1024;
    return isMobileUA || isMobileViewport || window.innerWidth < 768;
  };

  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(checkIsMobileDevice);

  const [isNativeFs, setIsNativeFs] = useState<boolean>(() => {
    return typeof document !== "undefined" ? Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement) : false;
  });

  const [isSimulatedMobileFs, setIsSimulatedMobileFs] = useState<boolean>(false);
  const [isLandscape, setIsLandscape] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth > window.innerHeight;
  });

  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFs(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    const handleResize = () => {
      setIsMobileDevice(checkIsMobileDevice());
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  const effectiveFullscreen = Boolean(isFullscreen || isNativeFs || isSimulatedMobileFs);
  const isMobileFullscreen = Boolean(isMobileDevice && effectiveFullscreen);

  const handleToggleFullscreenAction = async () => {
    sound.playClick();
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        const root = document.documentElement;
        if (root.requestFullscreen) {
          await root.requestFullscreen();
        } else if ((root as any).webkitRequestFullscreen) {
          await (root as any).webkitRequestFullscreen();
        } else {
          setIsSimulatedMobileFs(true);
        }
      } else {
        setIsSimulatedMobileFs(false);
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch {
      setIsSimulatedMobileFs(prev => !prev);
    }
  };

  // Schedules & Participants lookup
  const [schedules, setSchedules] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);

  const isRunning = matchState.status === MatchStatus.RUNNING;
  const currentRound = matchState.activeRound || 1;
  const totalRounds = matchState.roundCount || 3;
  const timeLeft = matchState.timeLeft ?? 120;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // WMP (Win by Match Points) Rule Threshold & Trigger Calculation
  const activeWmpThreshold: 20 | 30 = useMemo(() => {
    if (Number(matchState.wmpThreshold) === 20) return 20;
    if (Number(matchState.wmpThreshold) === 30) return 30;
    const combined = `${matchState.division || ""} ${matchState.classCategory || ""}`.toUpperCase();
    const isUsiaDiniOrPraRemaja =
      combined.includes("USIA DINI") ||
      combined.includes("USIADINI") ||
      combined.includes("PRA REMAJA") ||
      combined.includes("PRA-REMAJA") ||
      combined.includes("PRAREMAJA");
    return isUsiaDiniOrPraRemaja ? 20 : 30;
  }, [matchState.wmpThreshold, matchState.division, matchState.classCategory]);

  const wmpCategoryLabel = activeWmpThreshold === 20 ? "Usia Dini / Pra-Remaja" : "Remaja / Dewasa";
  const scoreRedVal = matchState.scoreRed ?? 0;
  const scoreBlueVal = matchState.scoreBlue ?? 0;
  const scoreDiff = Math.abs(scoreRedVal - scoreBlueVal);
  const isWmpEligibleRound = currentRound === 2 || currentRound === 3;
  const isWmpGapMet = isWmpEligibleRound && scoreDiff >= activeWmpThreshold && scoreRedVal !== scoreBlueVal;
  const wmpElapsedSeconds = matchState.losingCornerNoScoreDuration || 0;
  const wmpRemainingSeconds = Math.max(0, 60 - wmpElapsedSeconds);
  const wmpLeadingCorner: "RED" | "BLUE" = scoreRedVal >= scoreBlueVal ? "RED" : "BLUE";
  const wmpTrailingCorner: "RED" | "BLUE" = wmpLeadingCorner === "RED" ? "BLUE" : "RED";
  const wmpLeadingName =
    wmpLeadingCorner === "RED"
      ? matchState.fighterRedName || "PESILAT MERAH"
      : matchState.fighterBlueName || "PESILAT BIRU";

  const isWmpTriggered = useMemo(() => {
    const methodUpper = (matchState.winnerMethod || "").toUpperCase();
    const finishedByWmp =
      matchState.status === MatchStatus.FINISHED &&
      (methodUpper.includes("WMP") || methodUpper.includes("SELISIH 30") || methodUpper.includes("SELISIH 20"));
    return finishedByWmp || (isWmpGapMet && wmpElapsedSeconds >= 60);
  }, [matchState.status, matchState.winnerMethod, isWmpGapMet, wmpElapsedSeconds]);

  const isWmpConditionActive = isWmpGapMet || isWmpTriggered;

  // Toggle / Switch WMP Rule Mode ('Remaja/Dewasa' 30 pts vs 'Usia Dini/Pra-Remaja' 20 pts)
  const handleSelectWmpRuleMode = async (threshold: 20 | 30) => {
    playSoundEffect("CLICK");
    const curDiv = (matchState.division || "").toUpperCase();
    const nextDivision =
      threshold === 20
        ? curDiv.includes("PRA")
          ? "PRA-REMAJA"
          : "USIA DINI"
        : curDiv === "REMAJA"
        ? "REMAJA"
        : "DEWASA";
    await onUpdateMetadata({
      wmpThreshold: threshold,
      division: nextDivision
    });
    notifyToast(
      threshold === 20
        ? "⚙️ Logika WMP diubah ke Usia Dini / Pra-Remaja (Batas Selisih 20 Poin • 60 Detik)"
        : "⚙️ Logika WMP diubah ke Remaja / Dewasa (Batas Selisih 30 Poin • 60 Detik)"
    );
  };

  // Manual / Referee Stop Match for WMP Victory
  const handleTriggerManualWmpStop = async () => {
    playSoundEffect("STOP");
    const winnerCorner = scoreRedVal >= scoreBlueVal ? "RED" : "BLUE";
    const winnerName = winnerCorner === "RED" ? matchState.fighterRedName || "PESILAT MERAH" : matchState.fighterBlueName || "PESILAT BIRU";
    await onUpdateMetadata({
      status: MatchStatus.FINISHED,
      winnerColor: winnerCorner,
      winnerMethod: `MENANG WMP (SELISIH ${activeWmpThreshold} POIN - ${wmpCategoryLabel.toUpperCase()})`,
      winnerPublished: true,
      juryPanelLocked: true,
      dewanPanelLocked: true
    });
    setWmpFlashDismissed(false);
    notifyToast(`🚨 PERTANDINGAN DIHENTIKAN WASIT! ${winnerName} Dinyatakan Pemenang (Menang WMP)!`);
  };

  // High-visibility strobe flash interval when WMP condition is active or triggered
  const prevWmpConditionRef = useRef<boolean>(false);
  const prevWmpTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    if (isWmpConditionActive && !prevWmpConditionRef.current) {
      setWmpFlashDismissed(false);
      playSoundEffect("WARN");
    }
    if (isWmpTriggered && !prevWmpTriggeredRef.current) {
      setWmpFlashDismissed(false);
      playSoundEffect("STOP");
    }
    prevWmpConditionRef.current = isWmpConditionActive;
    prevWmpTriggeredRef.current = isWmpTriggered;
  }, [isWmpConditionActive, isWmpTriggered]);

  useEffect(() => {
    if (!isWmpConditionActive || wmpFlashDismissed) {
      setWmpStrobePhase(false);
      return;
    }
    const intervalMs = isWmpTriggered || wmpRemainingSeconds <= 15 ? 380 : 650;
    const strobe = setInterval(() => {
      setWmpStrobePhase((prev) => !prev);
    }, intervalMs);
    return () => clearInterval(strobe);
  }, [isWmpConditionActive, isWmpTriggered, wmpRemainingSeconds, wmpFlashDismissed]);

  // Toast notification helper
  const notifyToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fetch schedules & participants on mount
  useEffect(() => {
    const loadScheduleData = async () => {
      try {
        const [sRes, pRes] = await Promise.allSettled([
          fetch("/api/matches-schedule"),
          fetch("/api/participants")
        ]);
        if (sRes.status === "fulfilled" && sRes.value.ok) {
          const sData = await sRes.value.json();
          setSchedules(sData);
        } else {
          try {
            const cached = localStorage.getItem("jrz_cached_schedules");
            if (cached) setSchedules(JSON.parse(cached));
          } catch {}
        }
        if (pRes.status === "fulfilled" && pRes.value.ok) {
          const pData = await pRes.value.json();
          setParticipants(pData);
        } else {
          try {
            const cachedP = localStorage.getItem("jrz_cached_participants");
            if (cachedP) setParticipants(JSON.parse(cachedP));
          } catch {}
        }
      } catch {
        // Fallback to local storage
        try {
          const cached = localStorage.getItem("jrz_cached_schedules");
          if (cached) setSchedules(JSON.parse(cached));
          const cachedP = localStorage.getItem("jrz_cached_participants");
          if (cachedP) setParticipants(JSON.parse(cachedP));
        } catch {}
      }
    };
    loadScheduleData();
  }, []);

  // Auto-detect inter-round break signal from engine
  useEffect(() => {
    if (matchState.secretarySignalNextRound && matchState.status !== MatchStatus.FINISHED && !isBreakDismissed) {
      setShowBreakModal(true);
    }
  }, [matchState.secretarySignalNextRound, matchState.status, isBreakDismissed]);

  // Auto-detect finished match for Final Decision modal (unless WMP flash banner is actively alerting referee on the timer panel)
  useEffect(() => {
    if (matchState.status === MatchStatus.FINISHED && !isWmpTriggered) {
      setShowFinalDecisionModal(true);
      setShowBreakModal(false);
    } else if (matchState.status === MatchStatus.FINISHED && isWmpTriggered) {
      setShowBreakModal(false);
    }
  }, [matchState.status, isWmpTriggered]);

  // Upcoming Match calculation
  const upcomingMatch = useMemo(() => {
    if (!schedules || schedules.length === 0) return null;
    const currentPartai = String(matchState.matchNumber || "1").replace(/[^0-9]/g, "");
    const curIdx = schedules.findIndex(m => {
      const pNum = String(m.matchNumber || "").replace(/[^0-9]/g, "");
      return pNum === currentPartai || m.id === matchState.id?.replace("match-", "");
    });
    
    if (curIdx >= 0) {
      return schedules.find((m, idx) => idx > curIdx && m.status !== "SELESAI") || schedules[curIdx + 1] || null;
    }
    return schedules.find(m => m.status === "BELUM") || null;
  }, [schedules, matchState.matchNumber, matchState.id]);

  const upcomingRed = useMemo(() => {
    if (!upcomingMatch) return null;
    return participants.find(p => p.id === upcomingMatch.fighterRedId);
  }, [upcomingMatch, participants]);

  const upcomingBlue = useMemo(() => {
    if (!upcomingMatch) return null;
    return participants.find(p => p.id === upcomingMatch.fighterBlueId);
  }, [upcomingMatch, participants]);

  // Audio helper with mute check
  const playSoundEffect = (type: "START" | "STOP" | "WARN" | "CLICK") => {
    if (isAudioMuted) return;
    try {
      if (type === "START") {
        sound.playGong();
      } else if (type === "STOP") {
        sound.playBuzzer();
      } else if (type === "WARN") {
        sound.playBell();
      } else {
        sound.playClick();
      }
    } catch {
      // fallback
    }
  };

  // Sound gong otomatis ketika babak 1, 2, 3 selesai (timeLeft mencapai 0)
  const prevRoundTimeLeftRef = useRef<number>(timeLeft);
  useEffect(() => {
    if (timeLeft === 0 && prevRoundTimeLeftRef.current > 0) {
      playSoundEffect("START");
    }
    prevRoundTimeLeftRef.current = timeLeft;
  }, [timeLeft, isAudioMuted]);

  // Timer actions
  const handleStartTimer = () => {
    // Sound gong hanya berbunyi saat babak 1,2,3 dimulai (bukan saat resume/lanjutkan dari jeda/pause di tengah babak)
    const roundDur = matchState.roundDuration || 120;
    const isResuming = matchState.status === MatchStatus.PAUSED && timeLeft > 0 && timeLeft < roundDur;
    if (!isResuming) {
      playSoundEffect("START");
    }
    onTimerCommand("START");
  };

  const handlePauseTimer = () => {
    // Sound dihilangkan saat jeda/pause
    onTimerCommand("PAUSE");
  };

  const handleResetTimer = () => {
    playSoundEffect("CLICK");
    onTimerCommand("RESET");
    notifyToast("Timer babak berhasil direset!");
  };

  const handleAdd10 = () => {
    playSoundEffect("CLICK");
    onTimerCommand("ADD_10");
  };

  const handleSub10 = () => {
    playSoundEffect("CLICK");
    onTimerCommand("SUB_10");
  };

  const handleSetCustomTime = (min?: number, sec?: number) => {
    playSoundEffect("CLICK");
    const m = min !== undefined ? min : customMinutes;
    const s = sec !== undefined ? sec : customSeconds;
    const totalSecs = m * 60 + s;
    if (totalSecs > 0) {
      onUpdateMetadata({ timeLeft: totalSecs, roundDuration: totalSecs });
      notifyToast(`Durasi babak diatur ke ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }
  };

  // Handler untuk peluit memanggil wasit (hanya icon di UI)
  const handleBlowWhistle = () => {
    sound.playWhistle();
    setWhistleActive(true);
    notifyToast("Peluit dibunyikan untuk memanggil wasit!");
    setTimeout(() => {
      setWhistleActive(false);
    }, 1200);
  };

  // Handler mulai hitungan atlet cedera 10s (IPSI 2026)
  const handleStartInjuryCount = (corner: "BLUE" | "RED" | "UMUM" = injuryCorner) => {
    // Otomatis pause timer utama tanding jika sedang berjalan
    if (isRunning) {
      handlePauseTimer();
    }
    setInjuryCorner(corner);
    setInjuryCountdown(10);
    setIsInjuryRunning(true);
    setShowInjuryModal(true);
    // Gong berbunyi otomatis pada detik awal (10)
    sound.playGong();
    notifyToast("Hitungan atlet cedera 10 detik dimulai (Gong otomatis tiap detik)");
  };

  const handlePauseResumeInjuryCount = () => {
    if (isInjuryRunning) {
      setIsInjuryRunning(false);
      sound.playClick();
    } else {
      if (injuryCountdown === null || injuryCountdown <= 0) {
        handleStartInjuryCount(injuryCorner);
      } else {
        setIsInjuryRunning(true);
        sound.playGong();
      }
    }
  };

  const handleResetInjuryCount = () => {
    sound.playClick();
    setInjuryCountdown(10);
    setIsInjuryRunning(false);
  };

  const handleCloseInjuryModal = () => {
    sound.playClick();
    setIsInjuryRunning(false);
    setShowInjuryModal(false);
  };

  // Effect hitungan atlet cedera 10 detik dengan sound gong otomatis di tiap detiknya
  useEffect(() => {
    if (!isInjuryRunning || injuryCountdown === null) return;

    if (injuryCountdown <= 0) {
      setIsInjuryRunning(false);
      notifyToast("Hitungan 10 detik atlet cedera selesai!");
      return;
    }

    const timer = setInterval(() => {
      setInjuryCountdown((prev) => {
        if (prev === null || prev <= 1) {
          // Detik terakhir (0s): gong penutup
          sound.playGong();
          return 0;
        }
        // Tiap detik berkurang, bunyikan sound gong secara otomatis
        sound.playGong();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isInjuryRunning, injuryCountdown]);

  const handleSelectRound = (roundNum: number) => {
    playSoundEffect("CLICK");
    onRoundAction("SET", roundNum);
    setIsBreakDismissed(false);
  };

  const handleNextRound = () => {
    playSoundEffect("CLICK");
    onRoundAction("NEXT");
    setIsBreakDismissed(false);
    setShowBreakModal(false);
  };

  const handleFinishMatch = () => {
    playSoundEffect("STOP");
    onRoundAction("FINISH");
    setShowFinalDecisionModal(true);
  };

  // Toggle Panel Locks (Juri & Dewan)
  const handleTogglePanelLocks = async () => {
    sound.playClick();
    try {
      const arePanelsLocked = !!(matchState.juryPanelLocked || matchState.dewanPanelLocked);
      const targetLock = !arePanelsLocked;
      const updates: Partial<MatchState> = {
        juryPanelLocked: targetLock,
        dewanPanelLocked: targetLock,
        ...(!targetLock ? { showRoundOverPopup: false, showNextMatchPopup: false } : {})
      };
      await onUpdateMetadata(updates);
      if (targetLock) {
        notifyToast("🔒 PANEL JURI & DEWAN BERHASIL DIKUNCI!");
      } else {
        notifyToast("🔓 PANEL JURI DAN DEWAN SEKARANG TERBUKA!");
      }
    } catch (err) {
      console.error("Gagal mengubah status kunci panel:", err);
    }
  };

  // Winner calculation
  const winnerDetails = useMemo(() => {
    const scoreRed = matchState.scoreRed ?? 0;
    const scoreBlue = matchState.scoreBlue ?? 0;
    
    let winnerCorner: "RED" | "BLUE" | "TIE" = "TIE";
    if (matchState.winnerColor === "RED") {
      winnerCorner = "RED";
    } else if (matchState.winnerColor === "BLUE") {
      winnerCorner = "BLUE";
    } else if (scoreRed > scoreBlue) {
      winnerCorner = "RED";
    } else if (scoreBlue > scoreRed) {
      winnerCorner = "BLUE";
    } else {
      winnerCorner = "TIE";
    }

    const isTie = winnerCorner === "TIE" || !!matchState.isTieExtendedPossible;
    const method = matchState.winnerMethod || (isTie ? "DRAW / POIN SAMA" : "MENANG ANGKA MUTLAK");

    return { winnerCorner, isTie, method, scoreRed, scoreBlue };
  }, [matchState.winnerColor, matchState.winnerMethod, matchState.isTieExtendedPossible, matchState.scoreRed, matchState.scoreBlue]);

  // Publish Winner announcement to all monitors & jury panels
  const handlePublishWinner = async () => {
    try {
      setWinnerPublishing(true);
      sound.playGong();
      await onUpdateMetadata({ winnerPublished: true });
      notifyToast("📢 Pemenang resmi berhasil diumumkan ke Layar Monitor & Seluruh Panel!");
      fetch("/api/match-state/publish-winner", { method: "POST" }).catch(() => {});
    } catch (err) {
      console.error("Gagal mengumumkan pemenang:", err);
    } finally {
      setWinnerPublishing(false);
    }
  };

  // Add Round 4 (Overtime Babak Tambahan)
  const handleAddRound4 = async () => {
    sound.playClick();
    setAddRound4Loading(true);
    try {
      const res = await fetch("/api/match-state/add-round-4", { method: "POST" }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.id) {
          await onUpdateMetadata(data);
        }
      } else {
        await onUpdateMetadata({
          roundCount: 4,
          activeRound: 4,
          timeLeft: matchState.roundDuration || 120,
          status: MatchStatus.IDLE,
          showRoundOverPopup: false,
          secretarySignalNextRound: false,
          isTieExtendedPossible: false
        });
      }
      setShowFinalDecisionModal(false);
      notifyToast("Babak 4 (Tambahan / Overtime) berhasil diaktifkan!");
    } catch (err) {
      console.error("Gagal menambah babak ke-4:", err);
    } finally {
      setAddRound4Loading(false);
    }
  };

  // Advance to next match & archive finished match
  const handleNextMatch = async () => {
    setNextMatchLoading(true);
    try {
      sound.playClick();
      const curMatchNum = String(matchState.matchNumber || "1").replace(/[^0-9]/g, "");
      const curMatchInt = parseInt(curMatchNum) || 1;

      const res = await fetch("/api/match-state/next-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentMatchNumber: curMatchInt })
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        if (data && data.state) {
          await onUpdateMetadata(data.state);
        }
      } else if (upcomingMatch) {
        await onUpdateMetadata({
          matchNumber: String(upcomingMatch.matchNumber || curMatchInt + 1),
          classCategory: upcomingMatch.categoryName || upcomingMatch.categoryClass || matchState.classCategory || "KELAS C",
          stage: upcomingMatch.stage || "PENYISIHAN",
          fighterBlueName: upcomingBlue ? upcomingBlue.name : (upcomingMatch.fighterBlueName || "PESILAT BIRU"),
          fighterBlueClub: upcomingBlue ? upcomingBlue.club : (upcomingMatch.fighterBlueClub || "KONTINGEN BIRU"),
          fighterRedName: upcomingRed ? upcomingRed.name : (upcomingMatch.fighterRedName || "PESILAT MERAH"),
          fighterRedClub: upcomingRed ? upcomingRed.club : (upcomingMatch.fighterRedClub || "KONTINGEN MERAH"),
          scoreBlue: 0,
          scoreRed: 0,
          activeRound: 1,
          timeLeft: matchState.roundDuration || 120,
          status: MatchStatus.IDLE,
          winnerPublished: false,
          winnerColor: null,
          winnerMethod: null,
          secretarySignalNextRound: false,
          showRoundOverPopup: false,
          juryPanelLocked: false,
          dewanPanelLocked: false
        });
      } else {
        await onUpdateMetadata({
          matchNumber: String(curMatchInt + 1),
          scoreBlue: 0,
          scoreRed: 0,
          activeRound: 1,
          timeLeft: matchState.roundDuration || 120,
          status: MatchStatus.IDLE,
          winnerPublished: false,
          winnerColor: null,
          winnerMethod: null,
          secretarySignalNextRound: false,
          showRoundOverPopup: false,
          juryPanelLocked: false,
          dewanPanelLocked: false
        });
      }
      setShowFinalDecisionModal(false);
      notifyToast("Partai berikutnya berhasil dimuat ke arena!");
    } catch (err) {
      console.error("Gagal berpindah ke partai selanjutnya:", err);
    } finally {
      setNextMatchLoading(false);
    }
  };

  // Reset match handler
  const handleConfirmReset = async () => {
    sound.playClick();
    setShowResetConfirmModal(false);
    try {
      if (onResetMatch) {
        await onResetMatch();
      } else {
        await onTimerCommand("RESET");
        await onRoundAction("SET", 1);
        await onUpdateMetadata({
          scoreBlue: 0,
          scoreRed: 0,
          activeRound: 1,
          timeLeft: matchState.roundDuration || 120,
          status: MatchStatus.IDLE,
          winnerPublished: false,
          winnerColor: null,
          winnerMethod: null,
          secretarySignalNextRound: false,
          showRoundOverPopup: false,
          juryPanelLocked: false,
          dewanPanelLocked: false
        });
      }
      notifyToast("Pertandingan & Timer berhasil direset!");
    } catch (err) {
      console.error("Gagal mereset pertandingan:", err);
    }
  };

  // Keyboard shortcut listener for fast operator access
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (isRunning) {
          handlePauseTimer();
        } else {
          handleStartTimer();
        }
      } else if (e.code === "KeyR" && e.ctrlKey) {
        e.preventDefault();
        handleResetTimer();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleAdd10();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        handleSub10();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning]);

  return (
    <div className="min-h-screen bg-[#040817] text-slate-100 flex flex-col font-sans select-none relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d204a_1px,transparent_1px),linear-gradient(to_bottom,#0d204a_1px,transparent_1px)] bg-[size:48px_48px] opacity-15 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-blue-600/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a]/95 border-2 border-cyan-400 text-cyan-200 px-5 py-2.5 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.4)] text-xs sm:text-sm font-bold font-sans animate-bounce flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TAMPILAN MODE FULL SCREEN PADA PERANGKAT MOBILE (ANDROID / IOS)       */}
      {/* Seluruh menu pada mode PC diperkecil secara proporsional agar muat utuh  */}
      {/* di dalam tampilan layar penuh perangkat mobile tanpa perlu menggunakan PC */}
      {/* ========================================================================= */}
      {isMobileFullscreen ? (
        <div
          className="fixed inset-0 z-40 bg-[#040817] text-slate-100 flex flex-col font-sans select-none overflow-hidden h-[100dvh] w-screen justify-between"
          id="mobile-fullscreen-timer-root"
        >
          {/* TOP BAR CONTRACT (VERSI KOMPAK MOBILE DARI MODE PC - MENU LENGKET / STICKY) */}
          <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between px-2 py-1 bg-[#070e24]/95 backdrop-blur-md border-b border-cyan-500/25 shadow-md gap-1 shrink-0">
            {/* Brand Title & Whistle */}
            <div className="flex items-center gap-1 min-w-0">
              <button
                onClick={onBack}
                className="px-1.5 py-0.5 rounded-lg bg-[#1d0a10] border border-rose-500/50 text-amber-300 hover:text-white hover:bg-red-950/80 transition-all cursor-pointer active:scale-95 shrink-0 flex items-center gap-1"
                title="Kembali ke Beranda"
                aria-label="Kembali"
              >
                <ArrowLeft className="w-3 h-3 text-amber-400" />
                <span className="text-[7.5px] font-mono font-black uppercase">KEMBALI</span>
              </button>
              <span className="font-sans font-black text-[10px] sm:text-xs tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 uppercase truncate">
                TIMER PERTANDINGAN
              </span>
              <span className="hidden min-[460px]:inline-block px-1.5 py-0.5 rounded text-[7.5px] font-mono font-black bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 truncate">
                KONTROL UTAMA JALANNYA TANDING
              </span>

              {/* Menu Peluit untuk Memanggil Wasit */}
              <button
                type="button"
                onClick={handleBlowWhistle}
                className={`p-1 rounded-lg transition-all cursor-pointer border flex items-center justify-center active:scale-95 shrink-0 ${
                  whistleActive
                    ? "bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.85)] animate-pulse"
                    : "bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 border-amber-500/50"
                }`}
                title="Panggil Wasit (Peluit)"
                aria-label="Panggil Wasit (Peluit)"
              >
                <WhistleIcon className="w-3 h-3 text-amber-300" />
              </button>
            </div>

            {/* Live Match Context & Fullscreen Toggle (Kompak & Lengket) */}
            <div className="flex items-center gap-1 text-[8px] sm:text-[9px] shrink-0">
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-slate-300 font-mono">
                <span className="text-slate-500">GEL:</span>
                <span className="font-black text-amber-400">{matchState.arena || "A"}</span>
              </div>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-slate-300 font-mono">
                <span className="text-slate-500">PARTAI:</span>
                <span className="font-black text-cyan-400">{matchState.matchNumber || "1"}</span>
              </div>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-slate-300 font-mono max-w-[90px] truncate">
                <span className="text-slate-500">KLS:</span>
                <span className="font-black text-slate-200 truncate">{matchState.classCategory || "TANDING"}</span>
              </div>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/60 text-slate-300 font-mono">
                <span className="text-slate-500">BABAK:</span>
                <span className="font-black text-emerald-400">B{currentRound}/{totalRounds}</span>
              </div>

              {/* Tombol Full Screen / Normal Lengket di Header */}
              <button
                onClick={handleToggleFullscreenAction}
                className="px-1.5 py-0.5 rounded-lg bg-blue-950/90 border border-cyan-500/50 text-cyan-300 hover:text-white transition-all cursor-pointer flex items-center gap-0.5 active:scale-95"
                title="Keluar Layar Penuh"
                aria-label="Keluar Layar Penuh"
              >
                <Minimize2 className="w-3 h-3 text-cyan-300" />
                <span className="text-[7.5px] font-mono font-black uppercase">NORMAL</span>
              </button>
            </div>
          </header>

          {/* MAIN CONSOLE CONTAINER (VERSI KOMPAK MOBILE DARI MODE PC) */}
          <main className={`relative z-10 flex-1 min-h-0 w-full mx-auto flex flex-col justify-between overflow-hidden ${
            isLandscape ? "p-1.5 gap-1" : "p-2 gap-1.5"
          }`}>
            {/* ROW 1: FIGHTER CONTEXT (BLUE VS RED WITH SCORES - DIPERKECIL) */}
            <div className="grid grid-cols-2 gap-1.5 shrink-0">
              {/* Blue Corner Card */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-950/80 via-blue-900/40 to-slate-900/70 border border-blue-500/50 px-2 py-1 flex items-center justify-between shadow-[0_0_12px_rgba(37,99,235,0.2)]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-xs shadow-[0_0_8px_rgba(37,99,235,0.8)] shrink-0">
                    B
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[7px] font-mono font-black text-blue-400 uppercase tracking-wider leading-none">
                      SUDUT BIRU
                    </span>
                    <span className="font-black text-[10px] sm:text-xs text-white truncate leading-tight">
                      {matchState.fighterBlueName || "SUDUT BIRU"}
                    </span>
                    <span className="text-[8px] text-blue-300/80 truncate font-mono leading-none">
                      {matchState.fighterBlueClub || "KONTINGEN BIRU"}
                    </span>
                  </div>
                </div>
                <div className="text-right pl-1.5 shrink-0">
                  <span className="text-[6.5px] text-blue-300 font-bold block leading-none">TOTAL SKOR</span>
                  <span className="text-lg sm:text-xl font-black font-mono tabular-nums text-blue-400 leading-tight drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">
                    {matchState.scoreBlue ?? 0}
                  </span>
                </div>
              </div>

              {/* Red Corner Card */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900/70 via-red-900/40 to-red-950/80 border border-red-500/50 px-2 py-1 flex items-center justify-between shadow-[0_0_12px_rgba(220,38,38,0.2)]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-xs shadow-[0_0_8px_rgba(220,38,38,0.8)] shrink-0">
                    M
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[7px] font-mono font-black text-red-400 uppercase tracking-wider leading-none">
                      SUDUT MERAH
                    </span>
                    <span className="font-black text-[10px] sm:text-xs text-white truncate leading-tight">
                      {matchState.fighterRedName || "SUDUT MERAH"}
                    </span>
                    <span className="text-[8px] text-red-300/80 truncate font-mono leading-none">
                      {matchState.fighterRedClub || "KONTINGEN MERAH"}
                    </span>
                  </div>
                </div>
                <div className="text-right pl-1.5 shrink-0">
                  <span className="text-[6.5px] text-red-300 font-bold block leading-none">TOTAL SKOR</span>
                  <span className="text-lg sm:text-xl font-black font-mono tabular-nums text-red-400 leading-tight drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]">
                    {matchState.scoreRed ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* ROW 2: KONTROL UTAMA JALANNYA TANDING - ARENA LED CONSOLE (DIPERKECIL UNTUK MOBILE) */}
            <section className={`relative flex-1 min-h-0 rounded-2xl bg-[#07112a]/95 border flex flex-col justify-between overflow-hidden transition-all duration-200 ${
              isLandscape ? "p-1.5 gap-1" : "p-2 gap-1.5"
            } ${
              isWmpConditionActive && !wmpFlashDismissed
                ? wmpStrobePhase
                  ? "border-amber-300 ring-4 ring-rose-500/90 shadow-[0_0_45px_rgba(244,63,94,0.85)] bg-[#1f0614]/95"
                  : "border-cyan-300 ring-2 ring-amber-400/90 shadow-[0_0_35px_rgba(245,158,11,0.75)] bg-[#0c1433]/95"
                : "border-blue-500/50 shadow-[0_0_25px_rgba(37,99,235,0.25)]"
            }`}>
              {/* TOP CONTROLS BAR: STATUS LAGA, PANEL LOCKS, WMP RULE SELECTOR & RESET BUTTON */}
              <div className="flex flex-wrap items-center justify-between gap-1 pb-1 border-b border-blue-950/80 shrink-0">
                {/* Status Laga, Lock & WMP Rule Mode Dropdown */}
                <div className="flex flex-wrap items-center gap-1 min-w-0">
                  <div className="bg-[#030716] border border-blue-900/60 px-1.5 py-0.5 rounded-lg flex items-center gap-1 min-w-0">
                    <span className="text-[7px] text-cyan-300/60 uppercase font-black hidden min-[380px]:inline">STATUS:</span>
                    <span className="text-[8px] sm:text-[9px] uppercase font-black flex items-center gap-1 font-mono text-[#facc15] truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRunning ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
                      {isRunning ? "LAGA JALAN / AKTIF" : matchState.status === MatchStatus.FINISHED ? "LAGA SELESAI" : "LAGA DIKUNCI / JEDA"}
                    </span>
                  </div>

                  <div className={`px-1.5 py-0.5 rounded-lg text-[7.5px] font-black uppercase font-mono border shrink-0 ${
                    (!matchState.juryPanelLocked && !matchState.dewanPanelLocked)
                      ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40"
                      : "bg-rose-950/80 text-rose-400 border-rose-500/40"
                  }`}>
                    {(!matchState.juryPanelLocked && !matchState.dewanPanelLocked) ? "UNLOCKED" : "LOCKED"}
                  </div>

                  {/* Dropdown Pilihan Aturan WMP (Remaja/Dewasa 30P vs Usia Dini/Pra-Remaja 20P) */}
                  <div className="flex items-center gap-0.5 bg-[#030716] border border-cyan-500/50 rounded-lg px-1 py-0.5 shrink-0">
                    <span className="text-[7px] font-mono font-black text-amber-400 uppercase">WMP:</span>
                    <select
                      aria-label="Pilih Kategori Aturan WMP"
                      value={activeWmpThreshold}
                      onChange={(e) => handleSelectWmpRuleMode(Number(e.target.value) === 20 ? 20 : 30)}
                      className="bg-transparent text-[7.5px] sm:text-[8.5px] font-mono font-black text-cyan-300 uppercase focus:outline-none cursor-pointer"
                    >
                      <option value={30} className="bg-[#040817] text-cyan-300">REMAJA/DEWASA (30P)</option>
                      <option value={20} className="bg-[#040817] text-amber-300">USIA DINI/PRA (20P)</option>
                    </select>
                  </div>
                </div>

                {/* Quick Actions: Settings WMP, Peluit Wasit, Toggle Lock, QR Juri & Reset */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setShowTimerSettingsModal(true);
                    }}
                    className="py-1 px-1.5 rounded-lg bg-indigo-950/90 border border-indigo-400/50 text-indigo-300 hover:text-white flex items-center gap-0.5 text-[7.5px] font-mono font-black uppercase cursor-pointer active:scale-95"
                    title="Pengaturan Logika WMP & Durasi Timer"
                  >
                    <Settings className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                    <span className="hidden min-[420px]:inline">WMP ({activeWmpThreshold}P)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBlowWhistle}
                    className={`py-1 px-1.5 rounded-lg transition-all cursor-pointer border flex items-center justify-center active:scale-95 ${
                      whistleActive
                        ? "bg-amber-400 text-slate-950 border-amber-200 animate-pulse"
                        : "bg-gradient-to-r from-amber-950/80 via-[#2f1903] to-yellow-950/80 text-amber-400 border-amber-500/50"
                    }`}
                    title="Panggil Wasit (Peluit)"
                  >
                    <WhistleIcon className="w-3 h-3 text-amber-300" />
                  </button>

                  <button
                    onClick={handleTogglePanelLocks}
                    className={`py-1 px-2 rounded-lg font-sans font-black text-[8px] sm:text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border active:scale-95 ${
                      (matchState.juryPanelLocked || matchState.dewanPanelLocked)
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/60"
                        : "bg-gradient-to-r from-amber-700 to-orange-700 text-white border-amber-400/60"
                    }`}
                  >
                    {(matchState.juryPanelLocked || matchState.dewanPanelLocked) ? (
                      <>
                        <Unlock className="w-2.5 h-2.5 shrink-0" />
                        <span>BUKA KUNCI JURI & DEWAN</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-2.5 h-2.5 shrink-0" />
                        <span>KUNCI PANEL JURI & DEWAN</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setShowConnectModal(true);
                    }}
                    className="py-1 px-2 rounded-lg font-sans font-black text-[8px] sm:text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border bg-gradient-to-r from-cyan-950 via-[#0a1e3f] to-blue-950 text-cyan-300 border-cyan-500/50 active:scale-95"
                    title="Hubungkan Gawai Juri"
                  >
                    <QrCode className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                    <span>QR JURI</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setShowResetConfirmModal(true);
                    }}
                    className="bg-gradient-to-r from-[#2a0e1c] to-[#1e0712] active:scale-95 text-rose-300 py-1 px-2 border border-rose-600/40 rounded-lg font-sans font-black text-[8px] sm:text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                    <span>RESET</span>
                  </button>
                </div>
              </div>

              {/* ACTIVE ALERTS: BREAK NOTIFICATION OR FINAL DECISION BANNER (KOMPAK) */}
              {matchState.secretarySignalNextRound && currentRound < totalRounds && (
                <div className="px-2 py-1 bg-amber-500/20 border border-amber-500/60 rounded-xl text-amber-200 flex items-center justify-between gap-1.5 shrink-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping shrink-0" />
                    <span className="text-[8.5px] font-black uppercase text-amber-300 truncate">
                      Babak {currentRound} Selesai! Jeda Istirahat Aktif
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setShowBreakModal(true)}
                      className="py-0.5 px-2 bg-purple-900/90 text-purple-200 border border-purple-500/40 font-black text-[8px] rounded-lg uppercase cursor-pointer"
                    >
                      ⏱️ Menu Jeda
                    </button>
                    <button
                      onClick={handleNextRound}
                      className="py-0.5 px-2 bg-amber-500 text-slate-950 font-black text-[8px] rounded-lg uppercase cursor-pointer"
                    >
                      Babak {currentRound + 1} ➔
                    </button>
                  </div>
                </div>
              )}

              {matchState.status === MatchStatus.FINISHED && (
                <div className="px-2 py-1 bg-purple-950/80 border border-purple-500/60 rounded-xl text-purple-200 flex items-center justify-between gap-1.5 shrink-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[8.5px] font-black uppercase text-amber-300 truncate">
                      Pertandingan Telah Selesai!
                    </span>
                  </div>
                  <button
                    onClick={() => setShowFinalDecisionModal(true)}
                    className="py-0.5 px-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-[8px] rounded-lg uppercase cursor-pointer shrink-0"
                  >
                    🏆 Keputusan Final & Pemenang
                  </button>
                </div>
              )}

              {/* GIANT ARENA LED CLOCK DISPLAY (DIPERKECIL PROPORSIONAL UNTUK MOBILE) */}
              <div className={`bg-[#020512] border rounded-xl flex flex-col items-center justify-center relative shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] flex-1 min-h-0 transition-all duration-200 ${
                isLandscape ? "py-1 px-2" : "py-2 px-3"
              } ${
                isWmpConditionActive && !wmpFlashDismissed
                  ? wmpStrobePhase
                    ? "border-rose-400 bg-gradient-to-b from-rose-950/80 via-[#1f0410] to-amber-950/80 shadow-[0_0_30px_rgba(244,63,94,0.8)]"
                    : "border-amber-300 bg-gradient-to-b from-amber-950/60 via-[#04091e] to-cyan-950/60 shadow-[0_0_25px_rgba(250,204,21,0.75)]"
                  : "border-blue-950/90"
              }`}>
                <div
                  className={`font-mono font-black tracking-wider leading-none select-none drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] ${
                    isLandscape ? "text-4xl sm:text-5xl" : "text-5xl sm:text-6xl"
                  } ${
                    isWmpTriggered
                      ? wmpStrobePhase
                        ? "text-amber-300 scale-105"
                        : "text-rose-400"
                      : isRunning
                      ? "text-[#facc15]"
                      : timeLeft <= 10 && timeLeft > 0
                      ? "text-rose-400 animate-pulse"
                      : "text-[#facc15]"
                  }`}
                >
                  {formattedTime}
                </div>

                {/* WMP VISUAL NOTIFICATION & FLASH BANNER (MOBILE FULLSCREEN) */}
                {isWmpTriggered ? (
                  <div
                    id="mobile-wmp-triggered-banner"
                    className={`mt-1 w-full max-w-lg rounded-xl px-2.5 py-1.5 border-2 transition-all duration-150 text-center ${
                      wmpStrobePhase
                        ? "bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 border-white text-slate-950 shadow-[0_0_25px_rgba(244,63,94,0.95)]"
                        : "bg-gradient-to-r from-amber-950 via-red-950 to-amber-950 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.85)]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 text-[8.5px] sm:text-[9.5px] font-sans font-black uppercase tracking-wider leading-none">
                      <span>🚨 STOP PERTANDINGAN! MENANG WMP ({activeWmpThreshold} POIN) 🚨</span>
                    </div>
                    <p className={`text-[7.5px] sm:text-[8.5px] font-mono font-bold leading-tight mt-0.5 truncate ${
                      wmpStrobePhase ? "text-slate-950" : "text-yellow-200"
                    }`}>
                      WASIT HENTIKAN LAGA • PEMENANG: {wmpLeadingName} (SUDUT {wmpLeadingCorner === "RED" ? "MERAH" : "BIRU"})
                    </p>
                    <div className="mt-1 flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowFinalDecisionModal(true)}
                        className="px-2 py-0.5 rounded bg-slate-950 text-amber-300 border border-amber-400 text-[7.5px] font-black uppercase cursor-pointer"
                      >
                        🏆 KEPUTUSAN FINAL
                      </button>
                      <button
                        type="button"
                        onClick={handleBlowWhistle}
                        className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[7.5px] font-black uppercase cursor-pointer"
                      >
                        🔔 PELUIT STOP
                      </button>
                    </div>
                  </div>
                ) : isWmpGapMet ? (
                  <div
                    id="mobile-wmp-countdown-banner"
                    className={`mt-1 w-full max-w-lg rounded-xl px-2.5 py-1 border-2 transition-all duration-200 text-center ${
                      wmpStrobePhase
                        ? "bg-red-950/95 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.8)]"
                        : "bg-[#1a0510]/95 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[7.5px] sm:text-[8.5px] font-mono font-black text-amber-300 uppercase">
                      <span>⚡ WMP {wmpCategoryLabel.toUpperCase()} (≥{activeWmpThreshold}P):</span>
                      <span className="text-white bg-rose-600 px-1.5 py-0.2 rounded">
                        TERSISA {wmpRemainingSeconds} DETIK
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden my-0.5 border border-rose-500/40">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, (wmpElapsedSeconds / 60) * 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-[7px] font-mono text-rose-200 truncate">
                        Sudut {wmpLeadingCorner === "RED" ? "Merah" : "Biru"} unggul {scoreDiff} poin (Babak {currentRound === 2 ? "II" : "III"})
                      </span>
                      <button
                        type="button"
                        onClick={handleTriggerManualWmpStop}
                        className="px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-[7px] uppercase cursor-pointer shrink-0"
                      >
                        🛑 STOP & SAHKAN WMP
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Live Indicator Hitungan Atlet Cedera 10s */}
                {injuryCountdown !== null && (
                  <div
                    onClick={() => setShowInjuryModal(true)}
                    className="mt-1 w-full max-w-md bg-gradient-to-r from-amber-950/95 via-orange-950/90 to-red-950/95 border border-amber-400 rounded-xl px-2 py-1 flex items-center justify-between gap-2 cursor-pointer animate-pulse"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black font-mono text-xs border shrink-0 ${
                        injuryCountdown === 0 ? "bg-red-600 text-white border-red-300" : "bg-amber-500 text-slate-950 border-amber-300"
                      }`}>
                        {injuryCountdown}
                      </div>
                      <span className="text-[8px] font-sans font-black text-amber-300 uppercase truncate">
                        CEDERA 10S • {isInjuryRunning ? "BERJALAN" : injuryCountdown === 0 ? "SELESAI" : "JEDA"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePauseResumeInjuryCount();
                        }}
                        className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[8px] uppercase cursor-pointer"
                      >
                        {isInjuryRunning ? "JEDA" : "LANJUT"}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetInjuryCount();
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-[8px] uppercase cursor-pointer"
                      >
                        RESET
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* QUICK TIME ADJUSTMENTS (+10s, -10s, Reset & Atlet Cedera 10s - DIPERKECIL) */}
              <div className="grid grid-cols-4 gap-1 shrink-0">
                <button
                  onClick={handleSub10}
                  disabled={timeLeft <= 10}
                  className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[8.5px] sm:text-[9.5px] font-bold transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Minus className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">-10 DETIK</span>
                </button>

                <button
                  onClick={handleAdd10}
                  className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[8.5px] sm:text-[9.5px] font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">+10 DETIK</span>
                </button>

                <button
                  onClick={handleResetTimer}
                  className="flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[8.5px] sm:text-[9.5px] font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">RESET WAKTU</span>
                </button>

                <button
                  onClick={() => {
                    if (injuryCountdown === null || injuryCountdown === 0) {
                      handleStartInjuryCount("UMUM");
                    } else {
                      setShowInjuryModal(true);
                    }
                  }}
                  className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border text-[8.5px] sm:text-[9.5px] font-bold transition-all active:scale-95 cursor-pointer ${
                    isInjuryRunning
                      ? "bg-rose-950/90 text-rose-300 border-rose-500 animate-pulse"
                      : injuryCountdown !== null && injuryCountdown > 0
                      ? "bg-amber-950 text-amber-300 border-amber-500"
                      : "bg-gradient-to-r from-amber-950/80 to-[#2c1305] border-amber-500/50 text-amber-300"
                  }`}
                >
                  <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  <span className="truncate">
                    {injuryCountdown !== null ? `CEDERA: ${injuryCountdown}S` : "CEDERA (10S)"}
                  </span>
                </button>
              </div>

              {/* PRIMARY RUN CONTROL & PILIHAN BABAK PERTANDINGAN (STRUKTUR PC DIPERKECIL) */}
              <div className={`grid gap-1.5 items-stretch w-full shrink-0 ${
                isLandscape ? "grid-cols-12" : "grid-cols-1"
              }`}>
                {/* GIANT START / PAUSE BUTTON */}
                <div className={isLandscape ? "col-span-7 flex" : "flex"}>
                  <button
                    onClick={isRunning ? handlePauseTimer : handleStartTimer}
                    className={`w-full rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border-2 active:scale-98 shadow-lg ${
                      isLandscape ? "py-2 px-3 text-sm sm:text-base" : "py-2.5 px-4 text-base sm:text-lg"
                    } ${
                      isRunning
                        ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 border-yellow-300 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                        : matchState.status === MatchStatus.IDLE
                        ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 border-emerald-300 shadow-[0_0_20px_rgba(0,128,0,0.5)]"
                        : "bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 text-slate-950 border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.5)]"
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-5 h-5 fill-slate-950 shrink-0" />
                        <div className="flex flex-col items-center leading-tight">
                          <span>JEDA / PAUSE</span>
                          <span className="text-[8px] font-mono font-bold text-slate-900 opacity-80">(BABAK {currentRound})</span>
                        </div>
                      </>
                    ) : matchState.status === MatchStatus.IDLE ? (
                      <>
                        <Play className="w-5 h-5 fill-slate-950 shrink-0" />
                        <div className="flex flex-col items-center leading-tight">
                          <span>MULAI BABAK {currentRound}</span>
                          <span className="text-[8px] font-mono font-bold text-slate-900 opacity-80">(KETUK UNTUK MULAI)</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-slate-950 shrink-0" />
                        <div className="flex flex-col items-center leading-tight">
                          <span>LANJUTKAN / RESUME</span>
                          <span className="text-[8px] font-mono font-bold text-slate-900 opacity-80">(BABAK {currentRound})</span>
                        </div>
                      </>
                    )}
                  </button>
                </div>

                {/* PILIHAN BABAK PERTANDINGAN CONTAINER */}
                <div className={`${
                  isLandscape ? "col-span-5" : ""
                } bg-[#03081a]/95 border border-blue-900/60 rounded-xl p-1.5 flex flex-col justify-between gap-1 shadow-md`}>
                  <div className="flex items-center justify-between pb-0.5 border-b border-blue-950">
                    <span className="text-[8.5px] font-sans font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5 text-cyan-400" />
                      PILIHAN BABAK PERTANDINGAN
                    </span>
                    <span className="text-[8px] font-mono font-bold text-cyan-400 bg-cyan-950/90 px-1.5 py-0.2 rounded border border-cyan-500/40">
                      BABAK {currentRound} DARI {totalRounds}
                    </span>
                  </div>

                  {/* Segmented Round Choice Buttons */}
                  <div className="grid grid-cols-3 gap-1">
                    {[1, 2, 3].map((rNum) => {
                      const isCurrent = currentRound === rNum;
                      return (
                        <button
                          key={rNum}
                          onClick={() => handleSelectRound(rNum)}
                          className={`py-1 px-1.5 rounded-lg font-mono font-black transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                            isCurrent
                              ? "bg-gradient-to-b from-cyan-500 to-blue-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)] border-cyan-300"
                              : "bg-slate-800/90 text-slate-300 border-slate-700"
                          }`}
                        >
                          <span className="text-[7px] text-cyan-200/80 uppercase font-sans">RONDE</span>
                          <span className="text-xs font-black leading-none">B{rNum}</span>
                          {isCurrent && (
                            <span className="text-[6.5px] font-sans font-bold bg-white text-blue-950 px-1 rounded leading-none">
                              AKTIF
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      ) : (
        /* --- 2. TAMPILAN MODE STANDAR / PC (TIDAK BERUBAH) --- */
        <>
          {/* TOP BAR CONTRACT (STICKY / LENGKET PADA TAMPILAN PANEL TIMER) */}
          <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between px-3 sm:px-6 py-2.5 bg-[#070e24]/95 backdrop-blur-md border-b border-cyan-500/25 shadow-lg gap-2">
            {/* Brand Title */}
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="px-2.5 py-1.5 rounded-xl bg-[#1d0a10] border border-rose-500/50 hover:border-rose-400 text-amber-300 hover:text-white hover:bg-red-950/70 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm mr-0.5"
                title="Kembali ke Beranda"
                aria-label="Kembali"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider">KEMBALI</span>
              </button>
              <span className="font-sans font-black text-sm sm:text-base tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 uppercase">
                TIMER PERTANDINGAN
              </span>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-black bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                KONTROL UTAMA JALANNYA TANDING
              </span>

              {/* Menu Peluit untuk Memanggil Wasit (Hanya Tampilkan Icon) */}
              <button
                type="button"
                onClick={handleBlowWhistle}
                className={`p-1.5 sm:px-2 rounded-xl transition-all cursor-pointer border flex items-center justify-center active:scale-95 ${
                  whistleActive
                    ? "bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.85)] scale-110 animate-pulse"
                    : "bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                }`}
                title="Panggil Wasit (Peluit)"
                aria-label="Panggil Wasit (Peluit)"
              >
                <WhistleIcon className="w-4 h-4 text-amber-300" />
              </button>
            </div>

            {/* Live Match Context & Fullscreen Toggle (Lengket di Header) */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-300 font-mono">
                <span className="text-slate-500">GELANGGANG:</span>
                <span className="font-black text-amber-400">{matchState.arena || "A"}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-300 font-mono">
                <span className="text-slate-500">PARTAI:</span>
                <span className="font-black text-cyan-400">{matchState.matchNumber || "1"}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-300 font-mono">
                <span className="text-slate-500">KELAS:</span>
                <span className="font-black text-slate-200">{matchState.classCategory || "TANDING"}</span>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-300 font-mono">
                <span className="text-slate-500">BABAK:</span>
                <span className="font-black text-emerald-400">B{currentRound} / {totalRounds}</span>
              </div>

              {/* Tombol Full Screen Lengket pada Header Panel Timer */}
              <button
                onClick={handleToggleFullscreenAction}
                className="px-2.5 py-1.5 rounded-xl bg-blue-950/90 hover:bg-blue-900/80 border border-cyan-500/50 hover:border-cyan-300 text-cyan-300 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 shadow-sm"
                title={effectiveFullscreen ? "Keluar Layar Penuh" : "Layar Penuh (Fullscreen)"}
                aria-label="Layar Penuh"
              >
                {effectiveFullscreen ? <Minimize2 className="w-3.5 h-3.5 shrink-0" /> : <Maximize2 className="w-3.5 h-3.5 shrink-0" />}
                <span className="text-[10px] sm:text-xs font-mono font-black uppercase tracking-wider">
                  {effectiveFullscreen ? "NORMAL" : "FULL SCREEN"}
                </span>
              </button>
            </div>
          </header>

      {/* MAIN CONSOLE CONTAINER */}
      <main className="relative z-10 flex-grow max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-3.5 sm:gap-5 justify-between">
        
        {/* ROW 1: FIGHTER CONTEXT (BLUE VS RED WITH SCORES) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Blue Corner Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/80 via-blue-900/40 to-slate-900/70 border-2 border-blue-500/50 p-3 sm:p-4 flex items-center justify-between shadow-[0_0_25px_rgba(37,99,235,0.25)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base sm:text-lg shadow-[0_0_15px_rgba(37,99,235,0.8)] shrink-0">
                B
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-mono font-black text-blue-400 uppercase tracking-widest">
                  SUDUT BIRU
                </span>
                <span className="font-black text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-xs">
                  {matchState.fighterBlueName || "SUDUT BIRU"}
                </span>
                <span className="text-xs text-blue-300/80 truncate max-w-[200px] sm:max-w-xs font-mono">
                  {matchState.fighterBlueClub || "KONTINGEN BIRU"}
                </span>
              </div>
            </div>
            <div className="text-right pl-3 shrink-0">
              <span className="text-[10px] text-blue-300 font-bold block">TOTAL SKOR</span>
              <span className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-blue-400 drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]">
                {matchState.scoreBlue ?? 0}
              </span>
            </div>
          </div>

          {/* Red Corner Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900/70 via-red-900/40 to-red-950/80 border-2 border-red-500/50 p-3 sm:p-4 flex items-center justify-between shadow-[0_0_25px_rgba(220,38,38,0.25)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-600 flex items-center justify-center font-black text-white text-base sm:text-lg shadow-[0_0_15px_rgba(220,38,38,0.8)] shrink-0">
                M
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-mono font-black text-red-400 uppercase tracking-widest">
                  SUDUT MERAH
                </span>
                <span className="font-black text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-xs">
                  {matchState.fighterRedName || "SUDUT MERAH"}
                </span>
                <span className="text-xs text-red-300/80 truncate max-w-[200px] sm:max-w-xs font-mono">
                  {matchState.fighterRedClub || "KONTINGEN MERAH"}
                </span>
              </div>
            </div>
            <div className="text-right pl-3 shrink-0">
              <span className="text-[10px] text-red-300 font-bold block">TOTAL SKOR</span>
              <span className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]">
                {matchState.scoreRed ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* ROW 2: KONTROL UTAMA JALANNYA TANDING - ARENA LED CONSOLE */}
        <section className={`relative rounded-3xl bg-[#07112a]/95 border-2 p-4 sm:p-6 flex flex-col gap-3.5 sm:gap-4 overflow-hidden transition-all duration-200 ${
          isWmpConditionActive && !wmpFlashDismissed
            ? wmpStrobePhase
              ? "border-amber-300 ring-4 ring-rose-500/90 shadow-[0_0_65px_rgba(244,63,94,0.85)] bg-[#1f0614]/95"
              : "border-cyan-300 ring-2 ring-amber-400/90 shadow-[0_0_50px_rgba(245,158,11,0.75)] bg-[#0c1433]/95"
            : "border-blue-500/50 shadow-[0_0_40px_rgba(37,99,235,0.25)]"
        }`}>
          
          {/* TOP CONTROLS BAR: STATUS LAGA, PANEL LOCKS, WMP RULE SELECTOR & RESET BUTTON */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-blue-950/80">
            {/* Status Laga, Lock & WMP Rule Dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-[#030716] border border-blue-900/60 px-3 py-1 rounded-xl flex items-center gap-2">
                <span className="text-[9px] text-cyan-300/60 uppercase font-black">STATUS LAGA:</span>
                <span className="text-xs uppercase font-black flex items-center gap-1.5 font-mono text-[#facc15]">
                  <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-400 animate-ping" : "bg-amber-400"}`} />
                  {isRunning ? "● LAGA JALAN / AKTIF" : matchState.status === MatchStatus.FINISHED ? "● PERTANDINGAN SELESAI" : "● LAGA DIKUNCI / JEDA"}
                </span>
              </div>

              <div className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase font-mono border ${
                (!matchState.juryPanelLocked && !matchState.dewanPanelLocked)
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(0, 128, 0,0.2)]" 
                  : "bg-rose-950/80 text-rose-400 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]"
              }`}>
                {(!matchState.juryPanelLocked && !matchState.dewanPanelLocked) ? "PANEL UNLOCKED" : "PANEL LOCKED"}
              </div>

              {/* Konfigurasi Cepat Aturan WMP (Dropdown & Toggle di Panel Timer) */}
              <div className="flex items-center gap-1.5 bg-[#030716] border border-cyan-500/50 px-2.5 py-1 rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.2)]" id="operator-wmp-rule-selector">
                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[9px] font-mono font-black text-cyan-300/80 uppercase">LOGIKA WMP:</span>
                <select
                  id="operator-wmp-threshold-dropdown"
                  aria-label="Pilih Kategori Logika WMP"
                  value={activeWmpThreshold}
                  onChange={(e) => handleSelectWmpRuleMode(Number(e.target.value) === 20 ? 20 : 30)}
                  className="bg-[#081538] border border-cyan-400/50 rounded-lg px-2 py-0.5 text-[10px] font-mono font-black text-amber-300 uppercase focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value={30}>REMAJA / DEWASA (SELISIH 30 POIN)</option>
                  <option value={20}>USIA DINI / PRA-REMAJA (SELISIH 20 POIN)</option>
                </select>
              </div>
            </div>

            {/* Quick Actions: Pengaturan WMP, Peluit Wasit, Toggle Lock & Reset */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tombol Pengaturan Logika WMP & Timer */}
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setShowTimerSettingsModal(true);
                }}
                id="operator-open-wmp-settings-btn"
                className="py-1.5 px-3 rounded-xl font-sans font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border bg-gradient-to-r from-indigo-950 via-[#0e1b42] to-cyan-950 hover:from-indigo-900 hover:to-cyan-900 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
                title="Buka Pengaturan Logika WMP (Remaja/Dewasa 30 Poin vs Usia Dini/Pra-Remaja 20 Poin) & Timer"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>PENGATURAN WMP ({activeWmpThreshold}P)</span>
              </button>

              {/* Menu Peluit untuk memanggil wasit (hanya tampilkan icon) */}
              <button
                type="button"
                onClick={handleBlowWhistle}
                className={`py-1.5 px-2.5 rounded-xl transition-all cursor-pointer border flex items-center justify-center active:scale-95 ${
                  whistleActive
                    ? "bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.85)] scale-105 animate-pulse"
                    : "bg-gradient-to-r from-amber-950/80 via-[#2f1903] to-yellow-950/80 hover:from-amber-900 hover:to-yellow-900 text-amber-400 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                }`}
                title="Panggil Wasit (Peluit)"
                aria-label="Panggil Wasit (Peluit)"
              >
                <WhistleIcon className="w-4 h-4 text-amber-300" />
              </button>

              <button
                onClick={handleTogglePanelLocks}
                className={`py-1.5 px-3 rounded-xl font-sans font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                  (matchState.juryPanelLocked || matchState.dewanPanelLocked)
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-400/60 shadow-[0_0_15px_rgba(0, 128, 0,0.4)]"
                    : "bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 text-white border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                }`}
              >
                {(matchState.juryPanelLocked || matchState.dewanPanelLocked) ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>BUKA KUNCI JURI & DEWAN</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>KUNCI PANEL JURI & DEWAN</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setShowConnectModal(true);
                }}
                className="py-1.5 px-3 rounded-xl font-sans font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border bg-gradient-to-r from-cyan-950 via-[#0a1e3f] to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95"
                title="Buka QR Code dan Tautan Langsung Gawai Juri 1, 2, 3 untuk Android"
              >
                <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">HUBUNGKAN GAWAI JURI</span>
                <span className="md:hidden">QR JURI</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setShowResetConfirmModal(true);
                }}
                className="bg-gradient-to-r from-[#2a0e1c] to-[#1e0712] hover:bg-rose-950 active:scale-95 text-rose-300 py-1.5 px-3 border border-rose-600/40 hover:border-rose-500 rounded-xl font-sans font-black text-xs uppercase tracking-wider flex items-center gap-1.5 hover:shadow-[0_0_12px_rgba(244,63,94,0.3)] transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>RESET PERTANDINGAN</span>
              </button>
            </div>
          </div>

          {/* ACTIVE ALERTS: BREAK NOTIFICATION OR FINAL DECISION BANNER */}
          {matchState.secretarySignalNextRound && currentRound < totalRounds && (
            <div className="p-3 bg-amber-500/20 border-2 border-amber-500/60 rounded-2xl text-amber-200 text-center animate-pulse flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <div className="flex items-center gap-2 text-left">
                <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping shrink-0" />
                <div>
                  <div className="text-xs sm:text-sm font-black uppercase text-amber-400 tracking-wider">
                    Sinyal: Babak {currentRound} Selesai (Waktu Babak Habis)!
                  </div>
                  <div className="text-[10px] sm:text-xs text-amber-300/80">
                    Jeda istirahat antar babak aktif. Buka menu jeda untuk sinkronisasi panel juri & dewan.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowBreakModal(true)}
                  className="py-1.5 px-3 bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-500/40 font-black text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow"
                >
                  ⏱️ Menu Jeda Antar Babak
                </button>
                <button
                  onClick={handleNextRound}
                  className="py-1.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Mulai Babak {currentRound + 1} ➔
                </button>
              </div>
            </div>
          )}

          {matchState.status === MatchStatus.FINISHED && (
            <div className="p-3 bg-purple-950/70 border-2 border-purple-500/60 rounded-2xl text-purple-200 text-center animate-pulse flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-[0_0_25px_rgba(168,85,247,0.3)]">
              <div className="flex items-center gap-2 text-left">
                <Award className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs sm:text-sm font-black uppercase text-amber-400 tracking-wider">
                    Pertandingan Telah Selesai!
                  </div>
                  <div className="text-[10px] sm:text-xs text-purple-200/90">
                    Skor akhir telah dihitung. Buka menu keputusan final untuk mengumumkan pemenang secara resmi.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowFinalDecisionModal(true)}
                className="py-1.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                🏆 Buka Menu Keputusan Final & Pemenang
              </button>
            </div>
          )}

          {/* GIANT ARENA LED CLOCK DISPLAY */}
          <div className={`bg-[#020512] border-2 py-3 sm:py-5 px-4 rounded-2xl flex flex-col items-center justify-center gap-1 relative shadow-[inset_0_0_30px_rgba(0,0,0,0.9)] transition-all duration-200 ${
            isWmpConditionActive && !wmpFlashDismissed
              ? wmpStrobePhase
                ? "border-rose-400 bg-gradient-to-b from-rose-950/85 via-[#220412] to-amber-950/85 shadow-[0_0_45px_rgba(244,63,94,0.85)]"
                : "border-amber-300 bg-gradient-to-b from-amber-950/65 via-[#050b24] to-cyan-950/65 shadow-[0_0_35px_rgba(250,204,21,0.8)]"
              : "border-blue-950/90"
          }`} id="operator-led-clock-box">
            <div 
              className={`font-mono font-black tracking-wider text-6xl sm:text-8xl md:text-9xl leading-none select-none drop-shadow-[0_0_30px_rgba(250,204,21,0.5)] transition-transform duration-150 ${
                isWmpTriggered
                  ? wmpStrobePhase
                    ? "text-amber-300 scale-105"
                    : "text-rose-400"
                  : isRunning
                  ? "text-[#facc15]"
                  : timeLeft <= 10 && timeLeft > 0
                  ? "text-rose-400 animate-pulse"
                  : "text-[#facc15]"
              }`}
            >
              {formattedTime}
            </div>

            {/* WMP (WIN BY MATCH POINTS) VISUAL NOTIFICATION & FLASH EFFECT BANNER */}
            {isWmpTriggered ? (
              <div
                id="wmp-triggered-flash-banner"
                className={`mt-3 w-full max-w-3xl rounded-2xl p-3.5 sm:p-4 border-2 transition-all duration-150 text-center ${
                  wmpStrobePhase
                    ? "bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 border-white text-slate-950 shadow-[0_0_45px_rgba(244,63,94,0.95)] scale-[1.01]"
                    : "bg-gradient-to-r from-amber-950 via-red-950 to-amber-950 border-amber-300 text-white shadow-[0_0_35px_rgba(245,158,11,0.85)]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-widest border ${
                    wmpStrobePhase
                      ? "bg-slate-950 text-amber-300 border-amber-300"
                      : "bg-rose-600 text-white border-rose-300"
                  }`}>
                    🚨 KONDISI MENANG WMP TERCAPAI
                  </span>
                  <span className={`text-xs sm:text-base font-sans font-black uppercase tracking-wider ${
                    wmpStrobePhase ? "text-slate-950" : "text-amber-300"
                  }`}>
                    WASIT HENTIKAN PERTANDINGAN SEKARANG!
                  </span>
                </div>

                <p className={`text-xs sm:text-sm font-sans font-extrabold uppercase tracking-wide mt-1.5 ${
                  wmpStrobePhase ? "text-slate-950" : "text-white"
                }`}>
                  🏆 PEMENANG WMP: {wmpLeadingName} (SUDUT {wmpLeadingCorner === "RED" ? "MERAH" : "BIRU"}) • SKOR {scoreBlueVal} - {scoreRedVal} (SELISIH {scoreDiff} POIN)
                </p>

                <p className={`text-[10px] sm:text-xs font-mono font-bold mt-0.5 ${
                  wmpStrobePhase ? "text-slate-900" : "text-cyan-200"
                }`}>
                  Aturan WMP {wmpCategoryLabel} (Selisih ≥ {activeWmpThreshold} Poin di Babak {currentRound === 2 ? "II" : "III"} Selama 60 Detik Terpenuhi)
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFinalDecisionModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-300 border border-amber-400 font-sans font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg active:scale-95"
                  >
                    🏆 Buka Keputusan Final & Pemenang
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playGong();
                      handleBlowWhistle();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 border border-white font-sans font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg active:scale-95"
                  >
                    🔔 Bunyikan Gong & Peluit Stop
                  </button>
                  <button
                    type="button"
                    onClick={() => setWmpFlashDismissed((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-600 font-mono font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                  >
                    {wmpFlashDismissed ? "⚡ Aktifkan Flash" : "✕ Matikan Efek Flash"}
                  </button>
                </div>
              </div>
            ) : isWmpGapMet ? (
              <div
                id="wmp-countdown-flash-banner"
                className={`mt-3 w-full max-w-2xl rounded-2xl p-3 sm:p-3.5 border-2 transition-all duration-200 text-center ${
                  wmpStrobePhase
                    ? "bg-gradient-to-r from-red-950/95 via-amber-950/90 to-red-950/95 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.85)]"
                    : "bg-gradient-to-r from-[#240512]/95 via-[#120422]/95 to-[#240512]/95 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.65)]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-[10px] sm:text-xs font-sans font-black text-amber-300 uppercase tracking-wider">
                      ⚠️ PERINGATAN WMP AKTIF ({wmpCategoryLabel.toUpperCase()} • SELISIH ≥ {activeWmpThreshold} POIN DI BABAK {currentRound === 2 ? "II" : "III"})
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-600 border border-rose-300 text-white font-mono font-black text-xs animate-pulse">
                    HITUNG MUNDUR: {wmpRemainingSeconds} DETIK
                  </span>
                </div>

                {/* Progress Bar 60 Detik WMP */}
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden my-2 border border-rose-500/50">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, (wmpElapsedSeconds / 60) * 100)}%` }}
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-left">
                  <p className="text-[10px] sm:text-xs font-mono font-bold text-slate-200 leading-snug">
                    Sudut <span className="text-amber-300 font-black">{wmpLeadingCorner === "RED" ? "MERAH" : "BIRU"} ({wmpLeadingName})</span> unggul <span className="text-white font-black">{scoreDiff} poin</span>. Jika bertahan selama 60 detik ({wmpElapsedSeconds}/60s), Wasit menghentikan laga (<span className="text-amber-300 font-black">Menang WMP</span>).
                  </p>
                  <button
                    type="button"
                    onClick={handleTriggerManualWmpStop}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-sans font-black text-[10px] sm:text-xs uppercase tracking-wider cursor-pointer shrink-0 shadow-[0_0_15px_rgba(250,204,21,0.6)] active:scale-95"
                  >
                    🛑 Hentikan & Sahkan WMP Sekarang
                  </button>
                </div>
              </div>
            ) : null}

            {/* Live Indicator Hitungan Atlet Cedera 10s */}
            {injuryCountdown !== null && (
              <div 
                onClick={() => setShowInjuryModal(true)}
                className="mt-3 w-full max-w-lg bg-gradient-to-r from-amber-950/95 via-orange-950/90 to-red-950/95 border-2 border-amber-400 rounded-2xl p-3 shadow-[0_0_25px_rgba(245,158,11,0.6)] flex items-center justify-between gap-3 cursor-pointer animate-pulse transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black font-mono text-xl shadow-lg border ${
                    injuryCountdown === 0 
                      ? "bg-red-600 text-white border-red-300 animate-bounce" 
                      : "bg-amber-500 text-slate-950 border-amber-300"
                  }`}>
                    {injuryCountdown}
                  </div>
                  <div className="text-left">
                    <span className="text-[11px] font-sans font-black text-amber-300 uppercase block tracking-wider">
                      HITUNGAN ATLET CEDERA 10 DETIK • {isInjuryRunning ? "BERJALAN" : injuryCountdown === 0 ? "SELESAI" : "JEDA"}
                    </span>
                    <span className="text-[9.5px] font-mono text-amber-200/90 flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                      Gong otomatis tiap detik ({injuryCorner === "BLUE" ? "Sudut Biru" : injuryCorner === "RED" ? "Sudut Merah" : "Umum"})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePauseResumeInjuryCount();
                    }}
                    className="p-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase font-sans cursor-pointer transition-all active:scale-95"
                  >
                    {isInjuryRunning ? "JEDA" : "LANJUT"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResetInjuryCount();
                    }}
                    className="p-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] uppercase font-sans cursor-pointer transition-all active:scale-95"
                  >
                    RESET
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* QUICK TIME ADJUSTMENTS (+10s, -10s, Reset & Atlet Cedera 10s) */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={handleSub10}
              disabled={timeLeft <= 10}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-md"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>-10 DETIK</span>
            </button>

            <button
              onClick={handleAdd10}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+10 DETIK</span>
            </button>

            <button
              onClick={handleResetTimer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET WAKTU BABAK</span>
            </button>

            {/* Tombol Waktu Hitungan Atlet Cedera 10 Detik */}
            <button
              onClick={() => {
                if (injuryCountdown === null || injuryCountdown === 0) {
                  handleStartInjuryCount("UMUM");
                } else {
                  setShowInjuryModal(true);
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md ${
                isInjuryRunning
                  ? "bg-rose-950/90 text-rose-300 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse"
                  : injuryCountdown !== null && injuryCountdown > 0
                  ? "bg-amber-950 text-amber-300 border-amber-500"
                  : "bg-gradient-to-r from-amber-950/80 to-[#2c1305] hover:bg-amber-900/80 border-amber-500/50 text-amber-300"
              }`}
              title="Waktu Hitungan Atlet Cedera 10 Detik (IPSI) - Gong Otomatis Tiap Detik"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {injuryCountdown !== null ? `CEDERA: ${injuryCountdown}S` : "ATLET CEDERA (10S)"}
              </span>
            </button>
          </div>

          {/* PRIMARY RUN CONTROL & PILIHAN BABAK PERTANDINGAN */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch w-full">
            {/* GIANT START / PAUSE BUTTON */}
            <div className="lg:col-span-7 flex">
              <button
                onClick={isRunning ? handlePauseTimer : handleStartTimer}
                className={`w-full py-4 sm:py-5 px-6 rounded-2xl font-black text-lg sm:text-xl md:text-2xl uppercase tracking-wider flex items-center justify-center gap-3 transition-all cursor-pointer border-2 active:scale-98 shadow-xl ${
                  isRunning
                    ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 border-yellow-300 shadow-[0_0_35px_rgba(245,158,11,0.6)]"
                    : matchState.status === MatchStatus.IDLE
                    ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 border-emerald-300 shadow-[0_0_35px_rgba(0, 128, 0,0.6)]"
                    : "bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 hover:from-teal-400 hover:to-cyan-400 text-slate-950 border-cyan-300 shadow-[0_0_35px_rgba(6,182,212,0.6)]"
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-slate-950 shrink-0" />
                    <div className="flex flex-col items-center">
                      <span>JEDA / PAUSE</span>
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-900 opacity-80">(SPASI)</span>
                    </div>
                  </>
                ) : matchState.status === MatchStatus.IDLE ? (
                  <>
                    <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-slate-950 shrink-0" />
                    <div className="flex flex-col items-center">
                      <span>MULAI BABAK {currentRound}</span>
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-900 opacity-80">(SPASI)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-slate-950 shrink-0" />
                    <div className="flex flex-col items-center">
                      <span>LANJUTKAN / RESUME</span>
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-900 opacity-80">(SPASI)</span>
                    </div>
                  </>
                )}
              </button>
            </div>

            {/* PILIHAN BABAK PERTANDINGAN CONTAINER */}
            <div className="lg:col-span-5 bg-[#03081a]/95 border-2 border-blue-900/60 rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between gap-2.5 shadow-lg">
              <div className="flex items-center justify-between pb-1.5 border-b border-blue-950">
                <span className="text-[11px] sm:text-xs font-sans font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  PILIHAN BABAK PERTANDINGAN
                </span>
                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-500/40">
                  BABAK {currentRound} DARI {totalRounds}
                </span>
              </div>

              {/* Segmented Round Choice Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((rNum) => {
                  const isCurrent = currentRound === rNum;
                  return (
                    <button
                      key={rNum}
                      onClick={() => handleSelectRound(rNum)}
                      className={`py-2 px-2 rounded-xl font-mono font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                        isCurrent
                          ? "bg-gradient-to-b from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)] border-cyan-300 scale-102"
                          : "bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <span className="text-[8px] text-cyan-200/80 uppercase font-sans tracking-wider">RONDE</span>
                      <span className="text-base sm:text-lg font-black leading-tight">B{rNum}</span>
                      {isCurrent && (
                        <span className="text-[7.5px] font-sans font-bold bg-white text-blue-950 px-1.5 py-0.2 rounded leading-none mt-0.5 shadow-sm">
                          AKTIF
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </section>

      </main>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: POP-UP TRANSISI ANTAR BABAK (JEDA ISTIRAHAT & KONFIRMASI)        */}
      {/* ========================================================================= */}
      {showBreakModal && (
        <div className="fixed inset-0 z-50 bg-[#060212]/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0d0724] border-2 border-purple-900/70 rounded-3xl w-full max-w-5xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col p-5 sm:p-8 relative text-slate-100 font-sans">
            
            {/* Close Button Top Right */}
            <button
              onClick={() => {
                setShowBreakModal(false);
                setIsBreakDismissed(true);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-purple-950/60 border border-purple-900/60 text-purple-300 hover:text-white hover:border-purple-300 transition-all flex items-center justify-center cursor-pointer font-bold text-sm active:scale-90"
              title="Tutup Menu Jeda"
            >
              ✕
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_auto_0.9fr] gap-5 lg:gap-8 items-stretch">
              
              {/* LEFT COLUMN: Babak Selesai Details & Countdown */}
              <div className="flex flex-col gap-3.5 text-left">
                <div>
                  <div className="w-12 h-12 bg-purple-950/60 border border-purple-500/40 rounded-full flex items-center justify-center text-purple-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  
                  <h2 className="font-sans font-black text-2xl sm:text-3xl text-white uppercase tracking-tight leading-tight mt-3">
                    BABAK {currentRound} SELESAI
                  </h2>
                  <div className="font-mono text-[9px] uppercase font-bold text-slate-400 mt-0.5 tracking-[0.25em]">
                    WAKTU MATCH HABIS • JEDA ISTIRAHAT
                  </div>
                </div>

                {/* Countdown Timer Jeda Antar Babak */}
                <BreakCountdownTimer />

                {/* Rekomendasi Transisi */}
                <div className="bg-[#1b0a2b] border border-purple-900/50 rounded-xl p-3 flex flex-col gap-1 mt-1 text-left">
                  <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest leading-none">
                    REKOMENDASI TRANSISI
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-bold mt-1">
                    Pastikan kedua pesilat telah siap di sudut masing-masing dan dewan juri siap sebelum memulai babak berikutnya.
                  </p>
                </div>

                {/* Upcoming Match Preview if available */}
                {upcomingMatch && (
                  <div className="bg-[#110521] border border-purple-950 rounded-xl p-3 flex flex-col gap-2 mt-1">
                    <div className="flex justify-between items-center text-[10px] uppercase font-black">
                      <span className="text-[#38bdf8] flex items-center gap-1">
                        ⏭️ PARTAI SELANJUTNYA (UPCOMING)
                      </span>
                      <span className="text-amber-400 font-bold tracking-widest font-mono">
                        PARTAI {upcomingMatch.matchNumber}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-950/40 border border-blue-900/30 rounded-lg p-2 flex flex-col">
                        <span className="text-[8px] font-bold text-blue-400 uppercase">Sudut Biru</span>
                        <span className="font-black text-white truncate">{upcomingBlue?.name || upcomingMatch.fighterBlueName || "PESILAT BIRU"}</span>
                        <span className="text-[9px] font-mono text-blue-300/60 truncate">{upcomingBlue?.club || upcomingMatch.fighterBlueClub || "KONTINGEN"}</span>
                      </div>
                      <div className="bg-red-950/40 border border-red-900/30 rounded-lg p-2 flex flex-col">
                        <span className="text-[8px] font-bold text-red-400 uppercase">Sudut Merah</span>
                        <span className="font-black text-white truncate">{upcomingRed?.name || upcomingMatch.fighterRedName || "PESILAT MERAH"}</span>
                        <span className="text-[9px] font-mono text-red-300/60 truncate">{upcomingRed?.club || upcomingMatch.fighterRedClub || "KONTINGEN"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* VERTICAL SEPARATOR */}
              <div className="hidden lg:block w-[1px] bg-purple-900/30 self-stretch mx-1" />

              {/* RIGHT COLUMN: Active Scores, Jury Sync Controls, Advance Confirmation */}
              <div className="flex flex-col gap-3.5 justify-between">
                
                {/* Active Match Scores */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Blue Corner Score */}
                  <div className="bg-gradient-to-br from-blue-950/70 to-blue-900/30 border border-blue-500/40 rounded-2xl p-3.5 flex justify-between items-center shadow-lg shadow-blue-950/30">
                    <div className="flex flex-col text-left">
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">SUDUT BIRU</span>
                      <span className="text-xs sm:text-sm font-black text-white mt-0.5 uppercase truncate max-w-[110px]">
                        {matchState.fighterBlueName || "Pesilat Biru"}
                      </span>
                      <span className="text-[9px] font-medium text-blue-300/60 uppercase">Total Skor</span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-mono font-black text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)] tabular-nums">
                      {matchState.scoreBlue ?? 0}
                    </div>
                  </div>

                  {/* Red Corner Score */}
                  <div className="bg-gradient-to-br from-red-950/70 to-red-900/30 border border-red-500/40 rounded-2xl p-3.5 flex justify-between items-center shadow-lg shadow-red-950/30">
                    <div className="flex flex-col text-left">
                      <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">SUDUT MERAH</span>
                      <span className="text-xs sm:text-sm font-black text-white mt-0.5 uppercase truncate max-w-[110px]">
                        {matchState.fighterRedName || "Pesilat Merah"}
                      </span>
                      <span className="text-[9px] font-medium text-red-300/60 uppercase">Total Skor</span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-mono font-black text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)] tabular-nums">
                      {matchState.scoreRed ?? 0}
                    </div>
                  </div>
                </div>

                {/* Jury Sync Lock Box */}
                <div className="bg-[#180824] border border-purple-900/40 rounded-2xl p-3.5 text-center">
                  <div className="text-amber-400 text-[9.5px] font-black tracking-widest uppercase flex items-center justify-center gap-1.5 mb-2.5">
                    <span>🔒</span> MONITOR JURI SINKRON
                  </div>
                  
                  <button
                    onClick={handleTogglePanelLocks}
                    className={`w-full py-3 px-4 rounded-xl font-black tracking-widest text-xs uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border-none active:scale-95 ${
                      matchState.juryPanelLocked 
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_0_15px_rgba(0, 128, 0,0.3)]" 
                        : "bg-[#e21b70] hover:bg-[#c9125f] text-white shadow-[0_0_20px_rgba(226,27,112,0.35)]"
                    }`}
                  >
                    {matchState.juryPanelLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {matchState.juryPanelLocked ? "BUKA PANEL JURI & DEWAN" : "KUNCI PANEL JURI & DEWAN"}
                  </button>

                  <span className="text-[8.5px] uppercase font-bold text-slate-400/80 tracking-normal block mt-2 leading-normal">
                    *Panel Juri dapat dikunci sementara selama istirahat agar tidak terjadi input tak disengaja.
                  </span>
                </div>

                {/* Advance Confirmation Box */}
                <div className="bg-[#160424] border border-purple-950/60 rounded-2xl p-3.5 text-center flex flex-col gap-1">
                  <div className="text-amber-500 text-[10px] font-black tracking-widest uppercase">
                    KONFIRMASI TRANSISI BABAK
                  </div>
                  
                  <div className="text-slate-200 mt-0.5 text-xs font-bold leading-normal">
                    Lanjutkan pertandingan ke <span className="bg-[#008000] text-white px-2 py-0.5 rounded font-black text-xs font-mono mx-1">BABAK {currentRound + 1}</span>?
                  </div>

                  <p className="text-[9px] text-slate-400 leading-normal max-w-sm mx-auto mt-0.5 font-medium">
                    Seluruh panel juri, dewan, dan monitor arena akan disinkronkan otomatis.
                  </p>
                </div>

                {/* Bottom Decision Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => {
                      setShowBreakModal(false);
                      setIsBreakDismissed(true);
                    }}
                    className="bg-transparent hover:bg-slate-900 border border-slate-700 text-slate-300 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer active:scale-95 transition-all"
                  >
                    TUTUP
                  </button>

                  <button
                    onClick={handleNextRound}
                    className="bg-[#008000] hover:bg-[#008000] text-white py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer active:scale-95 transition-all border-none shadow-lg shadow-emerald-900/40"
                  >
                    MULAI BABAK {currentRound + 1} ➔
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: POP-UP KEPUTUSAN FINAL & PENGUMUMAN PEMENANG                     */}
      {/* ========================================================================= */}
      {showFinalDecisionModal && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0b0318]/95 border-2 border-purple-500/50 rounded-[28px] w-full max-w-lg shadow-[0_0_50px_rgba(147,51,234,0.4)] flex flex-col p-5 sm:p-7 relative overflow-hidden text-center">
            
            {/* Ambient glows */}
            <div className="absolute -top-20 -left-20 w-44 h-44 bg-purple-600/15 blur-[60px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-amber-600/15 blur-[60px] rounded-full pointer-events-none" />

            {/* Award Icon & Header */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 mb-3 animate-bounce">
                <Trophy className="w-8 h-8" />
              </div>
              
              <span className="text-[10px] tracking-[0.25em] font-black text-purple-400 uppercase font-sans">
                TIMER PERTANDINGAN • KEPUTUSAN FINAL
              </span>
              <h2 className="text-xl sm:text-2xl font-sans font-black tracking-wider text-slate-50 mt-1 uppercase">
                PERTANDINGAN TELAH SELESAI
              </h2>
            </div>

            {/* Winner Container */}
            <div className="mt-4 bg-purple-950/25 border border-purple-900/50 p-4 rounded-2xl flex flex-col items-center justify-center">
              {winnerDetails.isTie ? (
                <div className="flex flex-col items-center w-full">
                  <span className="text-amber-400 text-xs sm:text-sm font-black uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    DRAW / SERI (POIN SAMA KUAT)
                  </span>
                  <p className="text-xs text-slate-300 mt-2 font-medium max-w-xs leading-relaxed">
                    Kedua atlet memiliki poin akhir yang seimbang ({winnerDetails.scoreRed} - {winnerDetails.scoreBlue}).
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full">
                  <span className="text-[10px] tracking-widest font-black text-purple-400 uppercase">
                    PEMENANG RESMI
                  </span>
                  
                  {winnerDetails.winnerCorner === "RED" ? (
                    <div className="mt-2 bg-[#290a16] border border-rose-950 px-4 py-2.5 rounded-2xl text-rose-300 w-full animate-pulse">
                      <div className="flex items-center justify-center gap-2 mb-0.5">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_red]" />
                        <span className="text-[10px] font-black tracking-widest text-red-400 uppercase font-mono">SUDUT MERAH</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-red-200 uppercase leading-tight font-sans">
                        {matchState.fighterRedName || "PESILAT MERAH"}
                      </h3>
                      <p className="text-[10px] font-bold text-red-300/60 uppercase tracking-widest font-mono mt-0.5">
                        {matchState.fighterRedClub || "KONTINGEN MERAH"}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 bg-[#05112e] border border-blue-950 px-4 py-2.5 rounded-2xl text-blue-300 w-full animate-pulse">
                      <div className="flex items-center justify-center gap-2 mb-0.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                        <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase font-mono">SUDUT BIRU</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-blue-200 uppercase leading-tight font-sans">
                        {matchState.fighterBlueName || "PESILAT BIRU"}
                      </h3>
                      <p className="text-[10px] font-bold text-blue-300/60 uppercase tracking-widest font-mono mt-0.5">
                        {matchState.fighterBlueClub || "KONTINGEN BIRU"}
                      </p>
                    </div>
                  )}

                  <span className="text-[9px] font-black uppercase text-[#ca8a04] bg-amber-500/10 px-3 py-1 rounded-md border border-amber-500/20 mt-2.5 font-mono tracking-wider">
                    METODE: {winnerDetails.method}
                  </span>
                </div>
              )}
            </div>

            {/* Overtime Babak 4 if Tie */}
            {winnerDetails.isTie && (
              <div className="mt-3 bg-[#1b1c11]/80 border border-amber-500/30 p-3.5 rounded-2xl flex flex-col justify-center text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1">
                  <Play className="w-3.5 h-3.5 fill-amber-400 stroke-none animate-pulse" />
                  OVERTIME / BABAK TAMBAHAN
                </span>
                <p className="text-[10px] text-amber-200/80 mt-1 leading-relaxed font-semibold">
                  Silakan tekan tombol di bawah untuk menambah 1 Babak Tambahan (Overtime Babak 4).
                </p>
                <button
                  disabled={addRound4Loading}
                  onClick={handleAddRound4}
                  className="mt-2.5 w-full bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-slate-950 font-sans font-black text-xs uppercase tracking-widest py-2.5 px-4 rounded-xl shadow-lg transition-all cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  {addRound4Loading ? "PROSES..." : "LANJUT BABAK 4 (BABAK TAMBAHAN)"}
                </button>
              </div>
            )}

            {/* PUBLISH WINNER BUTTON */}
            {!winnerDetails.isTie && (
              <div className="mt-3.5 border-t border-purple-950/60 pt-3.5 flex flex-col">
                <span className="text-[10px] font-black uppercase text-purple-400 flex items-center justify-center gap-1 tracking-widest">
                  <Megaphone className="w-3.5 h-3.5" />
                  PUBLISH HASIL PERTANDINGAN KE ARENA
                </span>
                
                <button
                  disabled={winnerPublishing || matchState.winnerPublished}
                  onClick={handlePublishWinner}
                  className={`mt-2 w-full font-sans font-black text-xs uppercase tracking-widest py-3.5 px-4 rounded-xl transition-all duration-300 cursor-pointer border-none flex items-center justify-center gap-2 ${
                    matchState.winnerPublished
                      ? "bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 cursor-default"
                      : "bg-gradient-to-r from-[#9333ea] to-[#a855f7] hover:from-[#a855f7] hover:to-[#c084fc] text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.6)]"
                  }`}
                >
                  <Award className="w-4 h-4" />
                  {matchState.winnerPublished ? "PEMENANG TELAH DIUMUMKAN KE ARENA" : (winnerPublishing ? "PROSES PENGUMUMAN..." : "📢 UMUMKAN PEMENANG")}
                </button>
                <span className="text-[9px] italic text-slate-400 mt-1 block">
                  *Pemenang akan disiarkan ke Layar Monitor LED Arena & Panel Juri.
                </span>
              </div>
            )}

            {/* GRAND FOOTER ACTION: GOTO NEXT MATCH */}
            <button
              disabled={nextMatchLoading}
              onClick={handleNextMatch}
              className="mt-4 w-full bg-gradient-to-r from-purple-600 via-orange-500 to-amber-500 hover:from-purple-500 hover:via-orange-400 hover:to-amber-400 active:scale-95 disabled:opacity-50 text-slate-950 font-sans font-black text-xs uppercase tracking-widest py-3.5 px-4 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-all cursor-pointer border-none flex items-center justify-center gap-2"
            >
              <FastForward className="w-4 h-4 fill-slate-950 stroke-none" />
              {nextMatchLoading ? "MEMPROSES PARTAI..." : "LANJUTKAN PARTAI SELANJUTNYA (ARSIPKAN)"}
            </button>

            {/* Close button */}
            <button
              onClick={() => setShowFinalDecisionModal(false)}
              className="mt-3 text-[11px] font-sans font-black uppercase text-purple-400 hover:text-purple-300 cursor-pointer bg-transparent border-none outline-none underline text-center"
            >
              TUTUP & TINJAU KEMBALI SKOR
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: POP-UP KONFIRMASI RESET PERTANDINGAN                            */}
      {/* ========================================================================= */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f172a] border-2 border-rose-500/60 rounded-3xl w-full max-w-md p-6 text-center shadow-[0_0_40px_rgba(244,63,94,0.4)] flex flex-col items-center">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 mb-3 animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-sans font-black uppercase text-white tracking-wide">
              KONFIRMASI RESET PERTANDINGAN
            </h3>
            
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Apakah Anda yakin ingin mereset skor, babak, dan timer pertandingan partai ini kembali ke awal? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full mt-5">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-black uppercase tracking-wider cursor-pointer transition-all"
              >
                BATAL
              </button>
              <button
                onClick={handleConfirmReset}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer transition-all border-none shadow-lg shadow-rose-900/50"
              >
                YA, RESET SEMUA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HUBUNGKAN GAWAI JURI / QR CODE ANDROID */}
      <JuryConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        initialRole="JURI1"
      />

      {/* ========================================================================= */}
      {/* MODAL 4: HITUNGAN WAKTU ATLET CEDERA 10 DETIK (IPSI 2026)                 */}
      {/* ========================================================================= */}
      {showInjuryModal && (
        <div className="fixed inset-0 z-50 bg-[#020512]/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-gradient-to-b from-[#1a081a] via-[#100416] to-[#05010a] border-2 border-amber-500/70 rounded-3xl w-full max-w-lg p-5 sm:p-7 text-center shadow-[0_0_60px_rgba(245,158,11,0.4)] flex flex-col items-center relative overflow-hidden font-sans">
            {/* Top Amber Glowing Accent */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-red-500 shadow-[0_0_15px_#f59e0b]" />

            {/* Close Button Top Right */}
            <button
              onClick={handleCloseInjuryModal}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-400 transition-all flex items-center justify-center cursor-pointer font-bold text-sm active:scale-90"
              title="Tutup Menu Hitungan Cedera"
            >
              ✕
            </button>

            {/* Header Icon & Title */}
            <div className="w-14 h-14 bg-amber-500/15 border-2 border-amber-500/50 rounded-2xl flex items-center justify-center text-amber-400 mb-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>

            <span className="text-[10px] tracking-[0.25em] font-black text-amber-400 uppercase font-mono">
              REGULASI PB IPSI & PERSILAT 2026
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide mt-1">
              HITUNGAN ATLET CEDERA (10 DETIK)
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-md leading-relaxed">
              Tiap detiknya hitungan angka berkurang otomatis dibarengi dengan dentang sound gong resmi.
            </p>

            {/* Pilihan Sudut yang Cedera */}
            <div className="w-full mt-4 bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2 font-mono">
                PILIH SUDUT ATLET YANG CEDERA:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setInjuryCorner("BLUE")}
                  className={`py-2 px-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer border truncate ${
                    injuryCorner === "BLUE"
                      ? "bg-blue-600 text-white border-cyan-300 shadow-[0_0_15px_rgba(37,99,235,0.7)] scale-102"
                      : "bg-blue-950/50 text-blue-300/80 border-blue-900/50 hover:bg-blue-900/50"
                  }`}
                >
                  🔵 {matchState.fighterBlueName ? matchState.fighterBlueName.slice(0, 12) : "SUDUT BIRU"}
                </button>
                <button
                  type="button"
                  onClick={() => setInjuryCorner("RED")}
                  className={`py-2 px-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer border truncate ${
                    injuryCorner === "RED"
                      ? "bg-red-600 text-white border-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.7)] scale-102"
                      : "bg-red-950/50 text-red-300/80 border-red-900/50 hover:bg-red-900/50"
                  }`}
                >
                  🔴 {matchState.fighterRedName ? matchState.fighterRedName.slice(0, 12) : "SUDUT MERAH"}
                </button>
                <button
                  type="button"
                  onClick={() => setInjuryCorner("UMUM")}
                  className={`py-2 px-1.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer border truncate ${
                    injuryCorner === "UMUM"
                      ? "bg-amber-500 text-slate-950 border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.7)] scale-102"
                      : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  ⚪ UMUM / WASIT
                </button>
              </div>
            </div>

            {/* GIANT LED COUNTDOWN DISPLAY */}
            <div className="my-5 w-full bg-[#030107] border-2 border-amber-500/60 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center relative shadow-[inset_0_0_40px_rgba(0,0,0,0.9)]">
              <div 
                className={`font-mono font-black text-8xl sm:text-9xl leading-none select-none transition-all tabular-nums ${
                  injuryCountdown === 0
                    ? "text-rose-500 drop-shadow-[0_0_35px_rgba(239,68,68,0.9)] animate-bounce"
                    : injuryCountdown !== null && injuryCountdown <= 3
                    ? "text-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)] scale-105"
                    : "text-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]"
                }`}
              >
                {injuryCountdown !== null ? injuryCountdown : 10}
              </div>

              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[11px] font-sans font-black uppercase tracking-widest text-amber-300">
                  {injuryCountdown === 0 
                    ? "⚠️ HITUNGAN 10 DETIK SELESAI • WASIT/DOKTER MEMERIKSA" 
                    : isInjuryRunning 
                    ? "🔔 SOUND GONG OTOMATIS BERBUNYI TIAP DETIK" 
                    : "⏸️ HITUNGAN SEDANG DIJEDA"}
                </span>
              </div>
            </div>

            {/* CONTROLS (MULAI / JEDA, RESET, BATAL) */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                type="button"
                onClick={handlePauseResumeInjuryCount}
                className={`py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer border-none shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                  isInjuryRunning
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-950/50"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50"
                }`}
              >
                {isInjuryRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-slate-950" />
                    <span>JEDA (PAUSE)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>{injuryCountdown === null || injuryCountdown === 0 ? "MULAI 10 DETIK" : "LANJUTKAN HITUNGAN"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetInjuryCount}
                className="py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shadow"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>RESET KE 10S</span>
              </button>
            </div>

            {/* Tutup & Lanjutkan Pertandingan Button */}
            <button
              type="button"
              onClick={handleCloseInjuryModal}
              className="mt-3.5 w-full py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer bg-transparent border-none outline-none transition-colors"
            >
              ✕ TUTUP PANEL HITUNGAN CEDERA
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PENGATURAN LOGIKA ATURAN WMP & KONFIGURASI TIMER PERTANDINGAN    */}
      {/* ========================================================================= */}
      {showTimerSettingsModal && (
        <div className="fixed inset-0 z-50 bg-[#020512]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-gradient-to-b from-[#0b1536] via-[#070e24] to-[#030714] border-2 border-cyan-400/70 rounded-3xl w-full max-w-lg p-5 sm:p-7 text-left shadow-[0_0_60px_rgba(6,182,212,0.4)] flex flex-col gap-4 relative overflow-hidden font-sans">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-amber-400 to-emerald-400" />

            <div className="flex items-center justify-between border-b border-blue-900/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                  <Settings className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider leading-none">
                    PENGATURAN ATURAN WMP & TIMER
                  </h3>
                  <p className="text-[10px] font-mono font-bold text-cyan-300/80 uppercase tracking-widest mt-1">
                    KONFIGURASI BATAS SELISIH POIN WMP (BABAK II & III)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTimerSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Pilihan Dropdown Kategori Aturan WMP */}
            <div className="bg-[#040a1c] border border-blue-900/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-sans font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  PILIH KATEGORI LOGIKA ATURAN WMP:
                </label>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-cyan-950 text-cyan-300 border border-cyan-500/50">
                  AKTIF: {activeWmpThreshold} POIN
                </span>
              </div>

              <select
                value={activeWmpThreshold}
                onChange={(e) => handleSelectWmpRuleMode(Number(e.target.value) === 20 ? 20 : 30)}
                className="w-full bg-[#081330] border-2 border-cyan-500/60 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-sans font-black text-white uppercase tracking-wider cursor-pointer focus:outline-none"
              >
                <option value={30}>REMAJA / DEWASA — BATAS SELISIH 30 POIN (60 DETIK)</option>
                <option value={20}>USIA DINI / PRA-REMAJA — BATAS SELISIH 20 POIN (60 DETIK)</option>
              </select>

              {/* Toggle Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectWmpRuleMode(30)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    activeWmpThreshold === 30
                      ? "bg-gradient-to-br from-cyan-950 to-blue-950 border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.45)]"
                      : "bg-[#071026] border-slate-800 text-slate-400 hover:border-cyan-500/50 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-sans font-black text-xs uppercase text-cyan-300">
                      Remaja / Dewasa
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/50 text-[10px] font-mono font-black text-cyan-200">
                      30 POIN
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Selisih nilai mencapai <strong>30 poin</strong> antara sudut merah & biru pada Babak II atau III selama 1 menit (60s) ➔ <strong>Menang WMP</strong>.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectWmpRuleMode(20)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    activeWmpThreshold === 20
                      ? "bg-gradient-to-br from-amber-950 to-orange-950 border-amber-400 text-white shadow-[0_0_20px_rgba(245,158,11,0.45)]"
                      : "bg-[#071026] border-slate-800 text-slate-400 hover:border-amber-500/50 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-sans font-black text-xs uppercase text-amber-300">
                      Usia Dini / Pra-Remaja
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono font-black text-amber-200">
                      20 POIN
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed">
                    Selisih nilai mencapai <strong>20 poin</strong> antara sudut merah & biru pada Babak II atau III selama 1 menit (60s) ➔ <strong>Menang WMP</strong>.
                  </p>
                </button>
              </div>
            </div>

            {/* Pengaturan Cepat Durasi Babak */}
            <div className="bg-[#040a1c] border border-blue-900/80 rounded-2xl p-4 space-y-2.5">
              <label className="text-xs font-sans font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                DURASI WAKTU PER BABAK:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "01:00", min: 1, sec: 0, total: 60 },
                  { label: "01:30", min: 1, sec: 30, total: 90 },
                  { label: "02:00", min: 2, sec: 0, total: 120 },
                  { label: "03:00", min: 3, sec: 0, total: 180 }
                ].map((preset) => (
                  <button
                    key={preset.total}
                    type="button"
                    onClick={() => handleSetCustomTime(preset.min, preset.sec)}
                    className={`py-2 px-2 rounded-xl font-mono font-black text-xs uppercase cursor-pointer border transition-all ${
                      (matchState.roundDuration || 120) === preset.total
                        ? "bg-emerald-600 text-white border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                        : "bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-500"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTimerSettingsModal(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-sans font-black text-xs uppercase tracking-widest cursor-pointer shadow-lg active:scale-98"
            >
              SIMPAN & TUTUP PENGATURAN
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
