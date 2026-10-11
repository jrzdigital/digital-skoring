/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { MatchState, FighterColor, ActionType, MatchStatus } from "../types";
import { 
  Shield, 
  AlertCircle, 
  ArrowLeft, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Maximize2, 
  Minimize2, 
  WifiOff, 
  RefreshCw, 
  Battery, 
  BatteryCharging,
  Target,
  Flame,
  RotateCcw,
  Activity,
  Zap,
  CheckCircle2,
  ListOrdered,
  Award
} from "lucide-react";
import { sound } from "../utils/sound";
import { ConnectionStatusIndicator } from "./ConnectionStatusIndicator";
import { subscribeToConnectionStatus, getActiveArena } from "../services/firebase";
import { rtdbScoringEngine } from "../services/rtdbScoringEngine";

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
    <div className="flex items-center gap-1 bg-[#0e0626] border border-indigo-500/15 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-slate-300 font-mono text-[9px] sm:text-[10px] md:text-[11px] font-black shadow-inner" title={isCharging ? "Mengisi Daya" : "Level Baterai"}>
      {isCharging ? (
        <BatteryCharging className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 animate-pulse" />
      ) : (
        <Battery className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${batteryLevel <= 20 ? "text-rose-500 animate-bounce" : batteryLevel <= 50 ? "text-amber-400" : "text-emerald-400"}`} />
      )}
      <span>{batteryLevel}%</span>
    </div>
  );
}

interface JuryPanelProps {
  state: MatchState;
  onJuryPress: (juryId: number, fighter: FighterColor, action: ActionType) => void;
  onJuryVote?: (juryId: number, vote: "MERAH" | "BIRU" | "TIDAK SAH") => void;
  defaultJuryId?: number;
  onBack?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  hideJurySelector?: boolean;
  disableKeyboardShortcuts?: boolean;
}

export function JuryPanel({ 
  state, 
  onJuryPress, 
  onJuryVote, 
  defaultJuryId = 1,
  onBack,
  onToggleFullscreen,
  isFullscreen,
  hideJurySelector = false,
  disableKeyboardShortcuts = false
}: JuryPanelProps) {
  const [juryId, setJuryId] = useState<number>(defaultJuryId);
  const [lastAction, setLastAction] = useState<{ fighter: FighterColor; action: ActionType; time: number } | null>(null);
  const [pulse, setPulse] = useState<boolean>(false);
  const [isRefreshLocked, setIsRefreshLocked] = useState<boolean>(false);
  const [showNotificationTip, setShowNotificationTip] = useState<boolean>(false);
  const [connectionFailed, setConnectionFailed] = useState<boolean>(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [shakeTrigger, setShakeTrigger] = useState<boolean>(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);

  // Sync native browser fullscreen status
  const [isNativeFs, setIsNativeFs] = useState<boolean>(() => {
    return typeof document !== "undefined" ? Boolean(document.fullscreenElement) : false;
  });

  useEffect(() => {
    const handleFsChange = () => {
      setIsNativeFs(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  const effectiveFullscreen = Boolean(isFullscreen || isNativeFs);

  const handleToggleFullscreenAction = async () => {
    sound.playClick();
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      try {
        if (!document.fullscreenElement) {
          const root = document.documentElement;
          if (root.requestFullscreen) {
            await root.requestFullscreen();
          } else if ((root as any).webkitRequestFullscreen) {
            await (root as any).webkitRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
        }
      } catch (err) {
        console.warn("Fullscreen toggle error:", err);
      }
    }
  };

  // Auto detect viewport resolution & orientation
  const [viewport, setViewport] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 800,
    height: typeof window !== "undefined" ? window.innerHeight : 600,
    isLandscape: typeof window !== "undefined" ? window.innerWidth > window.innerHeight : true,
    isCompact: typeof window !== "undefined" ? (window.innerHeight < 520 || (window.innerWidth > window.innerHeight && window.innerHeight < 580)) : false
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      setViewport({
        width: w,
        height: h,
        isLandscape: w > h,
        isCompact: h < 520 || (w > h && h < 580)
      });
    };

    window.addEventListener("resize", updateDimensions);
    window.addEventListener("orientationchange", updateDimensions);
    updateDimensions();

    return () => {
      window.removeEventListener("resize", updateDimensions);
      window.removeEventListener("orientationchange", updateDimensions);
    };
  }, []);

  // Keep juryId synchronized with defaultJuryId if prop changes
  useEffect(() => {
    setJuryId(defaultJuryId);
  }, [defaultJuryId]);

  // Handle Screen Wake Lock & Orientation Lock on Full Screen
  useEffect(() => {
    let wakeLockSentinel: any = null;

    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
          console.log("[DISCO JURY] Screen Wake Lock acquired successfully.");
        }
      } catch (err) {
        console.warn("[DISCO JURY] Wake Lock request failed:", err);
      }
    };

    const releaseWakeLock = async () => {
      try {
        if (wakeLockSentinel) {
          await wakeLockSentinel.release();
          wakeLockSentinel = null;
          console.log("[DISCO JURY] Screen Wake Lock released.");
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (effectiveFullscreen) {
      requestWakeLock();
      if (window.screen && (window.screen as any).orientation && (window.screen as any).orientation.lock) {
        (window.screen as any).orientation.lock("landscape").catch((e: any) => {
          console.log("Landscape lock request (user gesture requirement):", e);
        });
      }
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
    } else {
      releaseWakeLock();
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.overscrollBehavior = "";
    }

    return () => {
      releaseWakeLock();
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overflow = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, [effectiveFullscreen]);

  // Anti-Refresh / Accidental Reload Protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRefreshLocked || state.status === "RUNNING") {
        e.preventDefault();
        e.returnValue = "Pertandingan sedang berlangsung. Kunci panel aktif untuk mencegah hilangnya koneksi penilaian juri!";
        return e.returnValue;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshLocked && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("touchstart", handleTouchStart, { passive: false });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, [isRefreshLocked, state.status]);

  // Register device presence in Firebase Realtime Database
  useEffect(() => {
    const arena = getActiveArena();
    rtdbScoringEngine.initDevice(`juri${juryId}`, `Juri ${juryId}`);
  }, [juryId]);

  // Subscribe to Firebase Realtime Database connection status
  useEffect(() => {
    const unsub = subscribeToConnectionStatus((connected) => {
      setIsFirebaseConnected(connected);
      if (connected) {
        setConnectionFailed(false);
        setConsecutiveFailures(0);
      }
    });
    return () => unsub();
  }, []);

  // Periodic heartbeat / ping (hybrid: local Express server & Firebase Cloud)
  useEffect(() => {
    let active = true;
    const sendPing = async () => {
      // Automatic seamless connection monitoring (never blocks Jury scoring in offline mode)
      if (isFirebaseConnected || rtdbScoringEngine.getStatus().connected) {
        if (active) {
          setConsecutiveFailures(0);
          setConnectionFailed(false);
        }
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const response = await fetch("/api/jury/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ juryId }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          if (active) {
            setConsecutiveFailures(0);
            setConnectionFailed(false);
          }
        } else {
          throw new Error("HTTP error");
        }
      } catch (err) {
        if (active) {
          // Automatically fall back to real-time Offline Mode without interrupting or locking Jury buttons
          setConnectionFailed(false);
          setConsecutiveFailures(prev => prev + 1);
        }
      }
    };

    sendPing();
    const interval = setInterval(sendPing, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [juryId, isFirebaseConnected]);

  // Anti-double-press / touch bounce guard per button and globally per jury device
  const lastStrikeMapRef = React.useRef<Record<string, number>>({});
  const lastAnyStrikeRef = React.useRef<number>(0);

  // Handle score press with tactile vibration & strict anti-bounce guard
  const handleJuryPress = (fighter: FighterColor, action: ActionType) => {
    if (state.juryPanelLocked || state.status === MatchStatus.FINISHED) return;

    const now = Date.now();
    const key = `${juryId}_${fighter}_${action}`;
    // Prevent accidental multi-fire / touch bounce (500ms for identical button, 250ms across any button)
    if (now - (lastStrikeMapRef.current[key] || 0) < 500) return;
    if (now - lastAnyStrikeRef.current < 250) return;

    lastStrikeMapRef.current[key] = now;
    lastAnyStrikeRef.current = now;
    
    // Tactile haptic feedback on mobile devices
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(40);
    }
    
    sound.playScore();
    onJuryPress(juryId, fighter, action);
    setLastAction({ fighter, action, time: now });
    
    // Visual pulse effect
    setPulse(true);
    setTimeout(() => setPulse(false), 200);
  };

  // Handle undo/backspace (instant 0ms offline & real-time sync + background server notify)
  const handleUndo = async (fighter: FighterColor) => {
    if (state.juryPanelLocked) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([30, 30, 30]);
    }
    sound.playClick();
    setLastAction(prev => (prev && prev.fighter === fighter ? null : prev));

    // 1. Instant local & Firebase RTDB undo (works 100% offline and online)
    try {
      await rtdbScoringEngine.handleJuryUndo(state, juryId, fighter);
    } catch (e) {
      // ignore
    }

    // 2. Non-blocking notify to local server if available
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);
      await fetch("/api/jury/undo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ juryId, fighter }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch {
      // Handled seamlessly by offlineEngine & BroadcastChannel
    }
  };

  // Dedicated keyboard shortcuts (1: Blue Punch, 2: Blue Kick, 9: Red Punch, 0: Red Kick, Backspace: Undo)
  useEffect(() => {
    if (disableKeyboardShortcuts) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (state.juryPanelLocked || state.status === MatchStatus.FINISHED) return;
      const key = e.key.toLowerCase();
      if (key === "1") {
        handleJuryPress("BLUE", "PUNCH");
      } else if (key === "2") {
        handleJuryPress("BLUE", "KICK");
      } else if (key === "9") {
        handleJuryPress("RED", "PUNCH");
      } else if (key === "0") {
        handleJuryPress("RED", "KICK");
      } else if (key === "backspace") {
        if (lastAction) {
          handleUndo(lastAction.fighter);
        } else {
          handleUndo("BLUE");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [juryId, state.status, state.juryPanelLocked, lastAction, disableKeyboardShortcuts]);

  // Calculate Punches & Kicks pressed by this jury in real-time
  // Automatically reset to 0 when match is finished (3 babak selesai / FINISHED status) or new party starts
  // Calculate all jury press stats for Jury 1, 2, and 3
  const getAllJuryStats = () => {
    if (state.status === "FINISHED" && (state.activeRound === 3 || state.activeRound >= (state.roundCount || 3))) {
      return {
        1: { bluePunch: 0, blueKick: 0, redPunch: 0, redKick: 0, total: 0 },
        2: { bluePunch: 0, blueKick: 0, redPunch: 0, redKick: 0, total: 0 },
        3: { bluePunch: 0, blueKick: 0, redPunch: 0, redKick: 0, total: 0 }
      };
    }

    const stats = {
      1: { bluePunch: 0, blueKick: 0, redPunch: 0, redKick: 0, total: 0 },
      2: { bluePunch: 0, blueKick: 0, redPunch: 0, redKick: 0, total: 0 },
      3: { bluePunch: 0, blueKick: 0, redPunch: 0, redKick: 0, total: 0 }
    };

    const seenTimestampsByJuryKey: Record<string, number[]> = {};

    (state.logs || []).forEach(log => {
      if (!log || (log.type !== "PUNCH" && log.type !== "KICK")) return;
      if (log.description && log.description.startsWith("UJI COBA GAWAI")) return;

      const list: number[] = [];
      if (!log.uncounted && log.juryIds && Array.isArray(log.juryIds)) {
        list.push(...log.juryIds);
      } else if (log.uncounted && log.source && log.source.startsWith("Juri ")) {
        const num = parseInt(log.source.replace("Juri ", ""), 10);
        if (!isNaN(num)) list.push(num);
      }

      const uniqueJuries = Array.from(new Set(list));
      const logTime = Number(log.timestamp) || 0;

      uniqueJuries.forEach(jNum => {
        if (jNum === 1 || jNum === 2 || jNum === 3) {
          const dedupKey = `${jNum}_${log.round}_${log.fighter}_${log.type}`;
          const prevTimes = seenTimestampsByJuryKey[dedupKey] || [];
          // Skip if this jury was already counted for the same action within 500ms (or within 2000ms if merging uncounted + consensus)
          if (logTime > 0 && prevTimes.some(t => Math.abs(t - logTime) <= 500)) {
            return;
          }
          prevTimes.push(logTime);
          seenTimestampsByJuryKey[dedupKey] = prevTimes;

          const target = stats[jNum as 1 | 2 | 3];
          if (log.fighter === "BLUE") {
            if (log.type === "PUNCH") target.bluePunch++;
            else if (log.type === "KICK") target.blueKick++;
          } else if (log.fighter === "RED") {
            if (log.type === "PUNCH") target.redPunch++;
            else if (log.type === "KICK") target.redKick++;
          }
          target.total++;
        }
      });
    });

    return stats;
  };

  const allJuryStats = getAllJuryStats();

  const formatTimeLimit = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Parsing metadata safely
  const matchNumClean = state.matchNumber?.replace(/[^0-9]/g, "") || "1";
  const tahapanClean = state.stage || "PENYISIHAN";
  const kelasClean = state.classCategory?.match(/Kelas\s+(\w+)/i)?.[1] || "A";
  const genderClean = state.gender || "PUTRA";
  const usiaClean = state.classCategory?.match(/(Usia|Remaja|Dewasa|Pra-Remaja)/i)?.[0]?.toUpperCase() || "REMAJA";

  const myVote = state.verification?.votes?.[juryId];

  return (
    <div 
      className={`bg-[#03010b] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none w-full max-w-full ${
        effectiveFullscreen 
          ? "fixed inset-0 w-full h-full z-[9999]" 
          : "h-[100dvh] max-h-[100dvh]"
      } ${
        viewport.isCompact ? "p-1.5 sm:p-2" : "p-2 sm:p-2.5 md:p-3"
      } ${
        pulse 
          ? lastAction?.fighter === "BLUE" 
            ? "ring-4 ring-blue-500 shadow-[0_0_50px_rgba(37,99,235,0.6)]" 
            : "ring-4 ring-red-500 shadow-[0_0_50px_rgba(220,38,38,0.6)]" 
          : ""
      }`} 
      style={{ 
        height: "100dvh", 
        maxHeight: "100dvh",
        paddingTop: "max(0.25rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.25rem, env(safe-area-inset-left))",
        paddingRight: "max(0.25rem, env(safe-area-inset-right))"
      }}
      id={`jury-panel-${juryId}`}
    >
      {/* SHAKE STYLE FOR RECONNECT FAIL FEEDBACK */}
      <style>{`
        @keyframes custom-shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
          20%, 40%, 60%, 80% { transform: translateX(6px); }
        }
        .animate-custom-shake {
          animation: custom-shake 0.4s ease-in-out;
        }
      `}</style>
      
      {/* VERIFIKASI OVERLAY POPUP (ARENA LED MODERN - IPSI 2026) */}
      {state.verification && state.verification.active && (
        <div className="absolute inset-0 bg-[#020512]/95 backdrop-blur-2xl flex flex-col justify-center items-center p-3 sm:p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-lg bg-gradient-to-b from-[#0a1844] via-[#040e2d] to-[#020514] border-2 border-amber-400/80 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(245,158,11,0.45)] flex flex-col items-center relative overflow-hidden animate-scale-in font-sans">
            {/* Top Gold Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse shadow-[0_0_15px_#f59e0b]" />

            <div className="text-amber-400 animate-pulse mb-2.5 bg-amber-500/15 p-3 rounded-full border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              <Shield className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-mono text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1.5 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              VERIFIKASI DEWAN BERLANGSUNG • IPSI 2026
            </div>

            <h3 className="text-base sm:text-xl font-black text-white uppercase tracking-wider text-center">
              KONSENSUS JURI {juryId}: {state.verification.type}
            </h3>

            {/* Corner & Fighter Info */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5 mb-2">
              <span className={`px-3 py-1 rounded-full font-black text-xs uppercase tracking-wider ${
                state.verification.corner === "RED"
                  ? "bg-red-600 text-white border border-rose-300 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                  : "bg-blue-600 text-white border border-cyan-300 shadow-[0_0_12px_rgba(37,99,235,0.5)]"
              }`}>
                SUDUT DITINJAU: {state.verification.corner === "RED" ? "MERAH" : "BIRU"} (
                {state.verification.corner === "RED" ? state.fighterRedName : state.fighterBlueName}
                )
              </span>
            </div>

            {state.verification.reason && (
              <div className="text-xs text-slate-300 bg-[#03091e] border border-indigo-500/30 px-3.5 py-1.5 rounded-xl text-center max-w-md mb-3.5">
                <span className="text-amber-400 font-mono font-bold mr-1 uppercase">Kasus:</span>
                "{state.verification.reason}"
              </div>
            )}

            {myVote ? (
              <div className="w-full text-center space-y-3">
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-emerald-900/70 to-emerald-950/90 border-2 border-emerald-400/80 shadow-[0_0_25px_rgba(0, 128, 0,0.45)]">
                  <span className="text-[10px] font-mono font-black text-emerald-300 uppercase tracking-widest block mb-0.5">
                    SUARA ANDA TELAH TERCATAT:
                  </span>
                  <span className="text-base sm:text-lg font-sans font-black text-white uppercase tracking-wider">
                    {myVote === "MERAH" ? "🔴 SAH SUDUT MERAH" : myVote === "BIRU" ? "🔵 SAH SUDUT BIRU" : "⚪ TIDAK SAH (BATAL)"}
                  </span>
                </div>

                <p className="text-[10.5px] text-amber-200/90 font-mono">
                  ⏳ Menunggu suara juri lain & eksekusi putusan dari Dewan Pertandingan.
                </p>

                {/* Allow changing vote */}
                <button
                  type="button"
                  onClick={() => onJuryVote && onJuryVote(juryId, myVote === "MERAH" ? "BIRU" : "MERAH")}
                  className="text-[10px] font-mono text-slate-400 hover:text-white underline cursor-pointer bg-transparent border-none py-1 uppercase tracking-wider"
                >
                  Ubah Keputusan Suara
                </button>
              </div>
            ) : (
              <div className="w-full space-y-2.5">
                <div className="text-center text-[11px] text-amber-300 font-bold tracking-wider uppercase mb-1">
                  PILIH KEPUTUSAN ANDA SEBAGAI JURI {juryId} (MINIMAL 2/3 KONSENSUS):
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => onJuryVote && onJuryVote(juryId, "MERAH")}
                    className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white py-3.5 px-2 rounded-2xl font-black transition-all active:scale-95 text-center shadow-[0_0_20px_rgba(244,63,94,0.4)] text-xs sm:text-sm cursor-pointer uppercase border border-rose-400/60"
                  >
                    SAH MERAH
                  </button>
                  <button
                    onClick={() => onJuryVote && onJuryVote(juryId, "TIDAK SAH")}
                    className="bg-slate-900 hover:bg-slate-800 text-amber-300 py-3.5 px-2 rounded-2xl font-black transition-all active:scale-95 text-center shadow-md text-xs sm:text-sm cursor-pointer uppercase border-2 border-amber-400/60"
                  >
                    TIDAK SAH
                  </button>
                  <button
                    onClick={() => onJuryVote && onJuryVote(juryId, "BIRU")}
                    className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 hover:from-blue-500 hover:to-cyan-500 text-white py-3.5 px-2 rounded-2xl font-black transition-all active:scale-95 text-center shadow-[0_0_20px_rgba(6,182,212,0.4)] text-xs sm:text-sm cursor-pointer uppercase border border-cyan-400/60"
                  >
                    SAH BIRU
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROUND END OVERLAY (ARENA LED MODERN) - Takes priority during break */}
      {state.showRoundOverPopup && state.status !== "RUNNING" && state.status !== MatchStatus.FINISHED && (
        <div className="absolute inset-0 bg-[#020512]/95 backdrop-blur-2xl flex flex-col justify-center items-center p-4 z-55 text-center animate-fade-in">
          <div className="w-full max-w-md bg-gradient-to-b from-[#1c1204] to-[#030614] border-2 border-amber-400/70 rounded-3xl p-6 shadow-[0_0_50px_rgba(245,158,11,0.4)] flex flex-col items-center relative overflow-hidden animate-scale-in">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse" />
            <div className="text-amber-400 animate-bounce mb-3 bg-amber-500/15 p-3.5 rounded-full border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
              WAKTU BABAK HABIS!
            </h2>
            <p className="text-xs sm:text-sm font-semibold max-w-md text-amber-200 mt-1 leading-relaxed">
              Babak {state.activeRound} telah selesai. Pengubahan nilai dinonaktifkan sementara.
            </p>
            <div className="mt-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider">
              Menunggu Transisi Babak dari Sekretaris
            </div>
          </div>
        </div>
      )}

      {/* MATCH FINISHED OVERLAY FOR JURY */}
      {state.status === MatchStatus.FINISHED && (
        <div className="absolute inset-0 bg-[#020512]/95 backdrop-blur-2xl flex flex-col justify-center items-center p-4 z-55 text-center animate-fade-in">
          <div className="w-full max-w-md bg-gradient-to-b from-[#120526] to-[#030614] border-2 border-purple-500/60 rounded-3xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.4)] flex flex-col items-center relative overflow-hidden animate-scale-in">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-500 via-amber-400 to-cyan-400 animate-pulse" />
            <div className="text-amber-400 animate-bounce mb-3 bg-amber-500/15 p-3.5 rounded-full border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <Award className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
              PERTANDINGAN SELESAI
            </h2>
            <p className="text-xs sm:text-sm font-semibold max-w-md text-slate-200 mt-1 leading-relaxed">
              Seluruh babak telah tuntas. Penginputan nilai juri telah ditutup.
            </p>
            {state.winnerColor && (
              <div className={`mt-3 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-wider ${
                state.winnerColor === "RED"
                  ? "bg-rose-950/80 border-rose-500/50 text-rose-300"
                  : "bg-blue-950/80 border-blue-500/50 text-blue-300"
              }`}>
                Pemenang: Sudut {state.winnerColor === "RED" ? "Merah" : "Biru"} ({state.winnerColor === "RED" ? state.fighterRedName : state.fighterBlueName})
              </div>
            )}
          </div>
        </div>
      )}

      {/* JURY PANEL LOCKED OVERLAY (ARENA LED MODERN) */}
      {state.juryPanelLocked && !state.showRoundOverPopup && state.status !== MatchStatus.FINISHED && (
        <div className="absolute inset-0 bg-[#020512]/85 backdrop-blur-2xl flex flex-col justify-center items-center p-3 z-50 text-center animate-fade-in animate-duration-150">
          <div className="w-full max-w-[340px] bg-gradient-to-b from-[#0a1844] via-[#040c26] to-[#020512] border-2 border-cyan-400/50 rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(6,182,212,0.35)] flex flex-col items-center gap-3 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 animate-pulse" />
            <div className="text-amber-400 animate-[pulse_1s_infinite] bg-amber-500/15 p-2.5 sm:p-3 rounded-full border border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 stroke-[2.5]" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
              PANEL JURI TERKUNCI
            </h2>
            <p className="text-[10.5px] sm:text-[11.5px] font-semibold text-slate-300 leading-relaxed max-w-[270px]">
              Pertandingan belum dimulai, sedang dijeda, atau telah selesai. Silakan menunggu Sekretaris/Dewan mengaktifkan timer tanding.
            </p>
            {!effectiveFullscreen && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 text-[9.5px] font-mono text-cyan-300 mt-1">
                  <span className={`w-2 h-2 rounded-full animate-ping ${isFirebaseConnected ? "bg-emerald-400" : "bg-amber-400"}`} />
                  <span>
                    Status Gelanggang: {state.status || "IDLE"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    setConnectionFailed(false);
                    setConsecutiveFailures(0);
                    if (typeof window !== "undefined") {
                      try {
                        const arena = getActiveArena();
                        const saved = window.localStorage.getItem(`jrz_silat_match_state_${arena}`) || window.localStorage.getItem("jrz_silat_match_state");
                        if (saved) {
                          const parsed = JSON.parse(saved);
                          if (parsed && !parsed.juryPanelLocked) {
                            window.dispatchEvent(new StorageEvent("storage", { key: `jrz_silat_match_state_${arena}` }));
                          }
                        }
                      } catch (e) {}
                      fetch("/api/match-state").catch(() => {});
                    }
                  }}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 text-[10px] font-mono font-bold text-cyan-200 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow"
                >
                  <RefreshCw className="w-3 h-3 text-cyan-300" />
                  <span>Cek Sinkronisasi Gelanggang</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 1. TOP HEADER (RATA KIRI: TULISAN JURI & JUDUL EVENT DISUDUT KIRI LAYAR) */}
      <header className="flex flex-row items-center justify-between gap-2 shrink-0 mb-1" id="jury-top-header">
        {/* Left Side: Tulisan Juri 1, 2, 3 dan Judul Event Rata Kiri di Sudut Kiri Layar */}
        <div className="flex items-center gap-2 overflow-hidden min-w-0 text-left">
          <div className="flex items-center gap-1.5 bg-[#12072f] border border-purple-900/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg shadow-md shrink-0">
            <span className="text-xs sm:text-sm font-black uppercase text-purple-400 tracking-wider">
              JURI {juryId}
            </span>
            {!hideJurySelector && (
              <div className="flex bg-[#0b031d] rounded p-0.5 border border-purple-950 ml-1">
                {[1, 2, 3].map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      sound.playClick();
                      setJuryId(id);
                    }}
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 flex items-center justify-center text-[8.5px] sm:text-[9.5px] font-black rounded font-mono cursor-pointer transition-all ${
                      juryId === id ? "bg-purple-600 text-white font-extrabold scale-105" : "text-purple-400/50 hover:text-purple-300"
                    }`}
                  >
                    J{id}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active status indicator badge */}
          {state.status === "RUNNING" && !state.juryPanelLocked ? (
            <div className="hidden sm:flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded-lg text-emerald-300 font-mono text-[9px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>SIAP NILAI</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-lg text-amber-300 font-mono text-[9px] font-bold shrink-0">
              <Lock className="w-2.5 h-2.5 text-amber-400" />
              <span>TERKUNCI</span>
            </div>
          )}

          {/* Judul Event Rata Kiri */}
          <div className="overflow-hidden min-w-0">
            <h1 className="text-xs sm:text-sm md:text-base font-black uppercase text-white tracking-wide truncate drop-shadow-md text-left">
              {state.eventName || "PAKU BANTEN CHAMPIONSHIP"}
            </h1>
          </div>
        </div>

        {/* Right Side: Connection, Battery, Lock, Fullscreen */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
          {/* Connection Status Indicator - Tersembunyi saat fullscreen agar layar penilaian benar-benar bersih */}
          {!effectiveFullscreen && (
            <ConnectionStatusIndicator 
              deviceId={`juri${juryId}` as "juri1" | "juri2" | "juri3"} 
              deviceConnections={state.deviceConnections} 
              compact={true} 
            />
          )}

          {/* Battery Indicator - Tersembunyi saat fullscreen */}
          {!effectiveFullscreen && <DeviceBatteryIndicator />}

          {/* Refresh Lock Button */}
          <button
            onClick={() => {
              sound.playClick();
              setIsRefreshLocked(!isRefreshLocked);
            }}
            className={`flex items-center justify-center p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer active:scale-95 ${
              isRefreshLocked 
                ? "bg-red-950/80 hover:bg-red-900/80 text-red-400 border-red-800 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse" 
                : "bg-[#110729] hover:bg-[#1e0d49] text-purple-400 hover:text-purple-100 border-purple-950/60 shadow-lg"
            }`}
            title={isRefreshLocked ? "Buka Kunci Panel (Refresh Diizinkan)" : "Kunci Panel (Cegah Refresh)"}
            id="jury-refresh-lock-toggle"
          >
            {isRefreshLocked ? (
              <Lock className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-purple-300" />
            )}
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            onClick={handleToggleFullscreenAction}
            className={`flex items-center justify-center p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer active:scale-95 ${
              effectiveFullscreen
                ? "bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-100 border-cyan-800 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                : "bg-[#110729] hover:bg-[#1e0d49] text-purple-400 hover:text-purple-100 border-purple-950/60 shadow-lg"
            }`}
            title={effectiveFullscreen ? "Keluar Layar Penuh" : "Layar Penuh (Fullscreen)"}
            id="jury-fullscreen-toggle"
            aria-label={effectiveFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {effectiveFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-purple-300" />
            )}
          </button>
        </div>
      </header>

      {/* 2. METADATA HORIZONTAL BAR (Compact single line with Yellow Accents, nowrap to prevent height overflow) */}
      <div className="bg-[#0b0420]/75 border border-amber-500/30 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg shrink-0 flex items-center justify-center whitespace-nowrap overflow-x-auto no-scrollbar gap-x-2.5 sm:gap-x-4 md:gap-x-6 mb-1 shadow-inner shadow-amber-950/20 text-[8.5px] sm:text-[9.5px] md:text-[10.5px]">
        <div className="uppercase font-sans tracking-wide flex items-center gap-1">
          <span className="font-extrabold text-amber-400/90">PARTAI:</span>
          <span className="font-black text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">{matchNumClean}</span>
        </div>
        <span className="text-amber-400/40 font-mono select-none">/</span>

        <div className="uppercase font-sans tracking-wide flex items-center gap-1">
          <span className="font-extrabold text-amber-400/90">TAHAPAN:</span>
          <span className="font-black text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">{tahapanClean}</span>
        </div>
        <span className="text-amber-400/40 font-mono select-none">/</span>

        <div className="uppercase font-sans tracking-wide flex items-center gap-1">
          <span className="font-extrabold text-amber-400/90">KELAS:</span>
          <span className="font-black text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">{kelasClean}</span>
        </div>
        <span className="text-amber-400/40 font-mono select-none">/</span>

        <div className="uppercase font-sans tracking-wide flex items-center gap-1">
          <span className="font-extrabold text-amber-400/90">PUTRA/PUTRI:</span>
          <span className="font-black text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">{genderClean}</span>
        </div>
        <span className="text-amber-400/40 font-mono select-none">/</span>

        <div className="uppercase font-sans tracking-wide flex items-center gap-1">
          <span className="font-extrabold text-amber-400/90">USIA:</span>
          <span className="font-black text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">{usiaClean}</span>
        </div>
      </div>

      {/* 3. CORE 3-COLUMN INTERACTIVE GRID: 2:1:2 PROPORTIONAL RATIO (SUDUT BIRU 2 | TENGAH 1 | SUDUT MERAH 2) */}
      <main className="flex-1 min-h-0 grid grid-cols-[2fr_1fr_2fr] gap-2 sm:gap-2.5 md:gap-3 items-stretch mb-0.5 overflow-hidden w-full" id="jury-interactive-grid">
        
        {/* KOLOM KIRI: SUDUT BIRU (2/5 LAYAR) */}
        <section className="bg-[#1e1b4b]/20 border-2 border-blue-500/40 rounded-xl sm:rounded-2xl flex flex-col justify-between items-stretch p-2 sm:p-2.5 md:p-3 transition-all relative overflow-hidden h-full shadow-[0_0_25px_rgba(30,58,138,0.25)]">
          {/* Top blue corner tag */}
          <div className="flex pr-1 justify-start items-center shrink-0 mb-1.5">
            <span className="bg-[#1a56db] text-[10px] sm:text-xs md:text-sm font-black tracking-widest text-white px-2.5 py-0.5 sm:py-1 rounded shadow-md uppercase">
              BIRU
            </span>
            <span className="ml-2 text-[10.5px] sm:text-xs md:text-sm text-slate-200 font-extrabold truncate max-w-[140px] sm:max-w-[200px] uppercase">
              {state.fighterBlueName || "SUDUT BIRU"}
            </span>
          </div>

          {/* Large touch action buttons (PUNCH & KICK) filling whole column */}
          <div className="flex-1 min-h-0 flex flex-col gap-2 sm:gap-3 justify-center items-stretch my-0.5">
            {/* Blue PUNCH button */}
            <button
              onClick={() => handleJuryPress("BLUE", "PUNCH")}
              disabled={state.juryPanelLocked}
              className="flex-1 min-h-0 bg-gradient-to-b from-[#1d4ed8] to-[#1e3a8a] hover:from-[#2563eb] hover:to-[#1e40af] active:from-[#1e3a8a] active:to-[#0f172a] text-white rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer font-sans select-none outline-none border border-blue-400/30 p-2 sm:p-3 active:scale-[0.98] shadow-lg shadow-blue-950/40 group overflow-hidden"
              id="btn-jury-blue-punch"
            >
              <img
                src="/Punch.png"
                alt="Punch"
                className="max-h-[85%] max-w-[85%] object-contain brightness-0 invert pointer-events-none select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-105 group-active:scale-95"
              />
            </button>

            {/* Blue KICK button */}
            <button
              onClick={() => handleJuryPress("BLUE", "KICK")}
              disabled={state.juryPanelLocked}
              className="flex-1 min-h-0 bg-gradient-to-b from-[#1e40af] to-[#172554] hover:from-[#1d4ed8] hover:to-[#1e3a8a] active:from-[#172554] active:to-[#090d16] text-white rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer font-sans select-none outline-none border border-blue-400/30 p-2 sm:p-3 active:scale-[0.98] shadow-lg shadow-blue-950/40 group overflow-hidden"
              id="btn-jury-blue-kick"
            >
              <img
                src="/Kick.png"
                alt="Kick"
                className="max-h-[85%] max-w-[85%] object-contain brightness-0 invert pointer-events-none select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-105 group-active:scale-95"
              />
            </button>
          </div>
        </section>

        {/* KOLOM TENGAH: BABAK AKTIF, TIMER, SINGLE GRID DATA JURI 1-3, & LOGO JRZ SCORE (1/5 LAYAR) */}
        <section className="bg-[#0c051f]/85 border border-purple-800/60 rounded-xl sm:rounded-2xl flex flex-col justify-between items-stretch p-2 sm:p-2.5 transition-all relative overflow-hidden h-full shadow-inner">
          
          {/* Top Group: Babak Aktif, Timer, Penekanan Juri (Rapat dan Rata ke Atas) */}
          <div className="flex flex-col gap-1 sm:gap-1.5 shrink-0">
            {/* Top of Center: Babak Aktif Badge */}
            <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-purple-950 border border-purple-700/60 rounded-lg py-0.5 sm:py-1 px-2 text-center shadow-md">
              <span className="text-[11px] sm:text-xs md:text-sm font-black font-sans uppercase text-purple-200 tracking-wider">
                BABAK {state.activeRound}
              </span>
            </div>

            {/* Middle of Center: Digital Timer */}
            <div className="bg-[#060212] border border-purple-900/70 rounded-xl py-0.5 sm:py-1 px-2 flex flex-col items-center justify-center shadow-inner">
              <span className="text-[7.5px] sm:text-[8.5px] font-sans font-extrabold uppercase text-slate-400 tracking-widest leading-none">
                SISA WAKTU
              </span>
              <span className="text-2xl sm:text-3xl md:text-4xl font-digital font-black text-amber-400 tracking-wider drop-shadow-[0_0_12px_rgba(245,158,11,0.4)] leading-none my-0.5">
                {formatTimeLimit(state.timeLeft)}
              </span>
            </div>

            {/* Menu Jumlah Aksi Yang Ditekan (Punch/Kick) */}
            {(() => {
              const currentStats = allJuryStats[juryId as 1 | 2 | 3] || { bluePunch: 0, blueKick: 0, redPunch: 0, redKick: 0, total: 0 };
              return (
                <div className="flex items-center justify-center gap-2 sm:gap-3 bg-[#080317] border border-purple-900/60 rounded-xl py-1 sm:py-1.5 px-2 font-mono text-[10px] sm:text-xs font-black shadow-inner">
                  <span className="text-blue-400">
                    (B : {currentStats.bluePunch}P / {currentStats.blueKick}T)
                  </span>
                  <span className="text-rose-400">
                    (M : {currentStats.redPunch}P / {currentStats.redKick}T)
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Bottom of Center: LOGO JRZ SCORE - Responsif & Proporsional tanpa overflow */}
          <div 
            onClick={() => {
              window.dispatchEvent(new CustomEvent("jrz_navigate_tab", { detail: "BERANDA" }));
            }}
            className="flex-1 min-h-0 max-h-12 sm:max-h-14 md:max-h-16 flex items-center justify-center py-0.5 overflow-hidden cursor-pointer group shrink-0"
            title="Kembali ke Beranda JRZ SCORE"
          >
            <img 
              src="/jrzscoreutama.png" 
              alt="JRZ SCORE" 
              className="max-h-full max-w-[90%] object-contain drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] select-none transition-transform group-hover:scale-105 active:scale-95"
            />
          </div>
        </section>

        {/* KOLOM KANAN: SUDUT MERAH (2/5 LAYAR) */}
        <section className="bg-[#450a0a]/20 border-2 border-red-500/40 rounded-xl sm:rounded-2xl flex flex-col justify-between items-stretch p-2 sm:p-2.5 md:p-3 transition-all relative overflow-hidden h-full shadow-[0_0_25px_rgba(153,27,27,0.25)]">
          {/* Top red corner tag */}
          <div className="flex justify-end items-center shrink-0 mb-1.5 w-full">
            <span className="mr-2 text-[10.5px] sm:text-xs md:text-sm text-slate-200 font-extrabold truncate max-w-[140px] sm:max-w-[200px] uppercase text-right">
              {state.fighterRedName || "SUDUT MERAH"}
            </span>
            <span className="bg-[#b91c1c] text-[10px] sm:text-xs md:text-sm font-black tracking-widest text-white px-2.5 py-0.5 sm:py-1 rounded shadow-md uppercase">
              MERAH
            </span>
          </div>

          {/* Large touch action buttons (PUNCH & KICK) filling whole column */}
          <div className="flex-1 min-h-0 flex flex-col gap-2 sm:gap-3 justify-center items-stretch my-0.5">
            {/* Red PUNCH button */}
            <button
              onClick={() => handleJuryPress("RED", "PUNCH")}
              disabled={state.juryPanelLocked}
              className="flex-1 min-h-0 bg-gradient-to-b from-[#dc2626] to-[#991b1b] hover:from-[#ef4444] hover:to-[#b91c1c] active:from-[#991b1b] active:to-[#450a0a] text-white rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer font-sans select-none outline-none border border-red-400/30 p-2 sm:p-3 active:scale-[0.98] shadow-lg shadow-red-950/40 group overflow-hidden"
              id="btn-jury-red-punch"
            >
              <img
                src="/Punch.png"
                alt="Punch"
                className="max-h-[85%] max-w-[85%] object-contain brightness-0 invert pointer-events-none select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-105 group-active:scale-95"
              />
            </button>

            {/* Red KICK button */}
            <button
              onClick={() => handleJuryPress("RED", "KICK")}
              disabled={state.juryPanelLocked}
              className="flex-1 min-h-0 bg-gradient-to-b from-[#b91c1c] to-[#7f1d1d] hover:from-[#dc2626] hover:to-[#991b1b] active:from-[#7f1d1d] active:to-[#3b0707] text-white rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer font-sans select-none outline-none border border-red-400/30 p-2 sm:p-3 active:scale-[0.98] shadow-lg shadow-red-950/40 group overflow-hidden"
              id="btn-jury-red-kick"
            >
              <img
                src="/Kick.png"
                alt="Kick"
                className="max-h-[85%] max-w-[85%] object-contain brightness-0 invert pointer-events-none select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-105 group-active:scale-95"
              />
            </button>
          </div>
        </section>

      </main>

    </div>
  );
}
