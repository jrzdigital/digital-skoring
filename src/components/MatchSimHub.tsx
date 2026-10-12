/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { MatchState, FighterColor, ActionType, MatchStatus, AuthSession } from "../types";
import { sound } from "../utils/sound";
import { offlineEngine } from "../utils/offlineEngine";
import { autoSaveVault } from "../utils/offlineAutoSaveVault";
import { createDefaultMatchState, normalizeMatchState, getSyncedNow, computeLiveTimeLeft } from "../utils/defaultMatchState";

// Dynamic code-splitting for heavy match panels to enable near-instant initial landing page loading
const ScoreboardView2 = React.lazy(() => import("./ScoreboardView2").then(m => ({ default: m.ScoreboardView2 })));
const DewanPanel = React.lazy(() => import("./DewanPanel").then(m => ({ default: m.DewanPanel })));
const JuryPanel = React.lazy(() => import("./JuryPanel").then(m => ({ default: m.JuryPanel })));
const SekretarisPanel = React.lazy(() => import("./SekretarisPanel").then(m => ({ default: m.SekretarisPanel })));
const OperatorPanel = React.lazy(() => import("./OperatorPanel").then(m => ({ default: m.OperatorPanel })));
const LaporanPanel = React.lazy(() => import("./LaporanPanel").then(m => ({ default: m.LaporanPanel })));

import iconTimer from "../assets/images/icon_timer.png";
import iconLaporan from "../assets/images/icon_laporan.png";
import { FullScreenOverlay } from "./FullScreenOverlay";
import { PasswordAuthModal, REQUIRED_SYSTEM_PASSWORD } from "./PasswordAuthModal";
import { 
  Activity, 
  ShieldAlert, 
  Monitor, 
  UserCheck, 
  Play, 
  HelpCircle, 
  HardDrive, 
  Wifi,
  FileSpreadsheet,
  Award,
  Users,
  ChevronRight,
  ArrowLeft,
  Maximize2,
  Minimize2,
  User,
  Shield,
  RefreshCw,
  Archive,
  AlertTriangle,
  RotateCcw,
  X,
  Unlock,
  Lock,
  PhoneCall,
  MessageCircle,
  LogOut,
  ShieldCheck,
  ExternalLink,
  Tv,
  CheckCircle2,
  Database,
  Calendar,
  Clock,
  Trophy,
  FileText,
  Shuffle,
  Sparkles,
  Layers,
  Timer,
  Settings,
  Volume2,
  Sun,
  Moon
} from "lucide-react";
import { rtdbScoringEngine } from "../services/rtdbScoringEngine";
import { saveMatchStateToFirebase, getActiveArena, setActiveArena, hasPendingCloudSync } from "../services/firebase";

// Web Audio sound trigger helper
function playAppSound(freq = 600, duration = 0.1) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Suppress audio failure
  }
}

export type AppMode = 
  | "LANDING" 
  | "SIMULATOR" 
  | "SCOREBOARD" 
  | "DEWAN" 
  | "JURY1" 
  | "JURY2" 
  | "JURY3" 
  | "SEKRETARIS"
  | "OPERATOR"
  | "JADWAL"
  | "LOTING"
  | "LAPORAN"
  | "BRACKET";

// Helper to read initial mode from URL search parameters or saved UI session on unexpected refresh
function getInitialAppMode(): AppMode {
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const rawMode = (params.get("mode") || params.get("role") || params.get("panel") || "").toUpperCase();
      if (rawMode === "JURY1" || rawMode === "JURI1") return "JURY1";
      if (rawMode === "JURY2" || rawMode === "JURI2") return "JURY2";
      if (rawMode === "JURY3" || rawMode === "JURI3") return "JURY3";
      if (rawMode === "SCOREBOARD" || rawMode === "MONITOR" || rawMode === "SKOR") return "SCOREBOARD";
      if (rawMode === "DEWAN" || rawMode === "KETUA") return "DEWAN";
      if (rawMode === "SEKRETARIS" || rawMode === "SECRETARY") return "SEKRETARIS";
      if (rawMode === "OPERATOR" || rawMode === "TIMER") return "OPERATOR";
      if (rawMode === "JADWAL" || rawMode === "SCHEDULE") return "JADWAL";
      if (rawMode === "LOTING" || rawMode === "DRAW") return "LOTING";
      if (rawMode === "LAPORAN" || rawMode === "REPORT") return "LAPORAN";
      if (rawMode === "BRACKET" || rawMode === "BAGAN") return "BRACKET";
      if (rawMode === "SIMULATOR") return "SIMULATOR";

      // Selalu mulai di landing page ketika aplikasi dibuka / server dijalankan ulang tanpa query params
      try {
        window.localStorage.removeItem("ipsi_ui_session");
        window.sessionStorage?.removeItem("ipsi_ui_session");
      } catch {}
    } catch (e) {
      console.warn("Gagal membaca query params mode:", e);
    }
  }
  return "LANDING";
}

// Lightweight arena-styled suspense fallback
function PanelLoadingFallback() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center min-h-[50vh] text-slate-300 p-6">
      <div className="w-9 h-9 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(6,182,212,0.4)]" />
      <span className="text-xs font-mono font-bold tracking-widest uppercase text-cyan-300">
        Memuat Panel Pertandingan...
      </span>
    </div>
  );
}

interface MatchSimHubProps {
  initialMode?: AppMode;
  onModeChange?: (mode: AppMode) => void;
  isMonitorOnly?: boolean;
  onBackToHome?: () => void;
}

export function MatchSimHub({ initialMode, onModeChange, isMonitorOnly = false, onBackToHome }: MatchSimHubProps = {}) {
  const [matchState, setMatchState] = useState<MatchState>(() => {
    if (typeof window !== "undefined") {
      const recovered = autoSaveVault.recoverSyncFromWebStorage();
      if (recovered && recovered.id) {
        return recovered;
      }
      const saved = window.localStorage.getItem("ipsi_match_state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id) {
            return normalizeMatchState(parsed);
          }
        } catch (e) {
          console.error("Gagal mengurai saved match state dari LocalStorage:", e);
        }
      }
    }
    return createDefaultMatchState();
  });
  const matchStateRef = useRef<MatchState>(matchState);
  matchStateRef.current = matchState;
  const lastSavedScoresRef = useRef<{ id: string; activeRound: number; scoreRed: number; scoreBlue: number } | null>(null);
  
  // Set default mode based on prop, URL param, or default to LANDING
  const [appMode, setAppMode] = useState<AppMode>(() => initialMode || getInitialAppMode());

  useEffect(() => {
    if (initialMode) {
      setAppMode(initialMode);
      setSuperAdminView("APP");
    }
  }, [initialMode]);

  useEffect(() => {
    if (onModeChange) {
      onModeChange(appMode);
    }
  }, [appMode, onModeChange]);
  const [fullscreenMode, setFullscreenMode] = useState<string | null>(null);
  const [nativeFs, setNativeFs] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncCount, setSyncCount] = useState<number>(0);
  const [showJuryModal, setShowJuryModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [showRefreshMenu, setShowRefreshMenu] = useState<boolean>(false);
  const [isSseActive, setIsSseActive] = useState<boolean>(false);
  const [isSekretarisSubScreen, setIsSekretarisSubScreen] = useState<boolean>(false);
  const [activeArena, setActiveArenaState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const a = params.get("arena") || params.get("gelanggang");
      if (a) return a.toUpperCase();
      return getActiveArena();
    }
    return "A";
  });

  useEffect(() => {
    rtdbScoringEngine.switchArena(activeArena);
    setActiveArena(activeArena);
    autoSaveVault.saveUiSession({ appMode, arena: activeArena });

    // Deep recovery from IndexedDB Auto-Save Vault on boot / arena switch
    autoSaveVault.recoverFromIndexedDB(activeArena).then(({ state: idbState, wasRecoveredFromIdb }) => {
      if (wasRecoveredFromIdb && idbState && idbState.id) {
        setMatchState((prev) => {
          const { merged } = offlineEngine.reconcileMatchStates(idbState, prev, false);
          return merged;
        });
      }
    });
  }, [activeArena]);

  useEffect(() => {
    autoSaveVault.saveUiSession({ appMode, arena: activeArena });
  }, [appMode, activeArena]);

  // Prefetch match panels in background after landing page has mounted for zero-latency navigation
  useEffect(() => {
    if (appMode === "LANDING") {
      const timer = setTimeout(() => {
        import("./DewanPanel");
        import("./OperatorPanel");
        import("./JuryPanel");
        import("./ScoreboardView2");
        import("./SekretarisPanel");
        import("./LaporanPanel");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [appMode]);

  // Theme Mode: LED Arena (Dark) vs White High-Contrast Mode
  const [themeMode, setThemeMode] = useState<"LED_ARENA" | "LIGHT_CONTRAST">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("jrz_theme_mode");
      if (saved === "LIGHT_CONTRAST") return "LIGHT_CONTRAST";
    }
    return "LED_ARENA";
  });

  const handleSetTheme = (mode: "LED_ARENA" | "LIGHT_CONTRAST") => {
    setThemeMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("jrz_theme_mode", mode);
      window.dispatchEvent(new Event("jrz_theme_changed"));
    }
  };

  useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem("jrz_theme_mode");
      setThemeMode(saved === "LIGHT_CONTRAST" ? "LIGHT_CONTRAST" : "LED_ARENA");
    };
    window.addEventListener("jrz_theme_changed", handleThemeChange);
    return () => window.removeEventListener("jrz_theme_changed", handleThemeChange);
  }, []);

  // Sistem Login Password '211096': Akses aplikasi setelah ditutup & saat membuka tiap panel
  const [isAppAuthenticated, setIsAppAuthenticated] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("jrz_app_authenticated") === REQUIRED_SYSTEM_PASSWORD;
    }
    return false;
  });
  const [pendingPanelMode, setPendingPanelMode] = useState<AppMode | null>(null);

  // Sinkronkan matchState aktif ke rtdbScoringEngine dan dengarkan evaluasi konsensus juri secara langsung
  useEffect(() => {
    if (matchState) {
      rtdbScoringEngine.setCurrentMatchState(matchState);
    }
  }, [matchState]);

  useEffect(() => {
    const unsub = rtdbScoringEngine.subscribeMatchStateUpdates((updatedState) => {
      if (updatedState) {
        setMatchState(updatedState);
      }
    });
    return () => unsub();
  }, []);

  // Default guest session when not signed in yet
  const DEFAULT_ACTIVE_USER: AuthSession["user"] = {
    id: "usr_operator_active",
    username: "operator",
    fullName: "Operator Gelanggang (Tanding)",
    role: "admin",
    status: "APPROVED",
    organization: "PB IPSI"
  };

  // Authentication State - reads from unified global SSO (ipsi_auth_user)
  const [currentUser, setCurrentUser] = useState<AuthSession["user"]>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("ipsi_auth_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.username) {
            return parsed;
          }
        } catch (e) {
          console.error("Gagal mengurai saved auth user:", e);
        }
      }
    }
    return DEFAULT_ACTIVE_USER;
  });

  // Sync with global SSO updates
  useEffect(() => {
    const handleUserSync = () => {
      try {
        const saved = window.localStorage.getItem("ipsi_auth_user");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.username) {
            setCurrentUser(parsed);
          }
        }
      } catch (e) {}
    };

    window.addEventListener("storage", handleUserSync);
    window.addEventListener("ipsi_auth_user_changed", handleUserSync);
    return () => {
      window.removeEventListener("storage", handleUserSync);
      window.removeEventListener("ipsi_auth_user_changed", handleUserSync);
    };
  }, []);

  const [superAdminView, setSuperAdminView] = useState<"DASHBOARD" | "APP">("APP");

  const handleLoginSuccess = (user: AuthSession["user"]) => {
    setCurrentUser(user);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ipsi_auth_user", JSON.stringify(user));
      window.dispatchEvent(new Event("ipsi_auth_user_changed"));
    }
    setSuperAdminView("APP");
    setAppMode(getInitialAppMode());
  };

  const handleLogout = () => {
    sound.playBuzzer();
    setCurrentUser(DEFAULT_ACTIVE_USER);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ipsi_auth_user");
      window.dispatchEvent(new Event("ipsi_auth_user_changed"));
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("mode");
        url.searchParams.delete("panel");
        url.searchParams.delete("role");
        window.history.replaceState({}, document.title, url.toString());
      } catch (e) {
        // Ignore
      }
    }
    setAppMode("LANDING");
    sound.playBuzzer();
    setCurrentUser(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ipsi_auth_user");
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("mode");
        url.searchParams.delete("panel");
        url.searchParams.delete("role");
        window.history.replaceState({}, document.title, url.toString());
      } catch (e) {
        // Ignore
      }
    }
    setAppMode("LANDING");
    setSuperAdminView("DASHBOARD");
  };

  // Gong sound effect triggers for starting and ending each round
  const prevStatusRef = useRef<MatchStatus | null>(null);
  const prevTimeLeftRef = useRef<number | null>(null);

  useEffect(() => {
    if (!matchState) return;
    
    const prevStatus = prevStatusRef.current;
    const prevTimeLeft = prevTimeLeftRef.current;
    const roundDur = matchState.roundDuration || 120;

    // 1. Play gong on START (Babak 1,2,3 Dimulai): transitioned to RUNNING from non-RUNNING (bukan saat resume dari jeda/PAUSED di tengah babak)
    const isResuming =
      prevStatus === MatchStatus.PAUSED &&
      prevTimeLeft !== null &&
      prevTimeLeft > 0 &&
      prevTimeLeft < roundDur;
    if (matchState.status === MatchStatus.RUNNING && prevStatus !== MatchStatus.RUNNING && prevStatus !== null && !isResuming) {
      sound.playGong();
    }

    // 2. Play gong on END (Babak 1,2,3 Selesai): transitioned to timeLeft === 0 from timeLeft > 0
    if (matchState.timeLeft === 0 && prevTimeLeft !== null && prevTimeLeft > 0) {
      sound.playGong();
    }

    prevStatusRef.current = matchState.status;
    prevTimeLeftRef.current = matchState.timeLeft;
  }, [matchState]);

  // Autosave matchState to LocalStorage, SessionStorage & IndexedDB Auto-Save Vault on any change
  useEffect(() => {
    if (matchState && matchState.id) {
      try {
        autoSaveVault.saveMatchState(matchState, activeArena, "STATE_AUTO_SAVE");
      } catch (err) {
        console.error("Gagal melakukan autosave ke Vault:", err);
      }
    }
  }, [matchState, activeArena]);

  // Emergency auto-save trap before unexpected browser refresh / tab close / visibility change
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleEmergencyFlush = () => {
      const current = matchStateRef.current;
      if (current && current.id) {
        autoSaveVault.saveMatchState(current, activeArena, "EMERGENCY_REFRESH_GUARD", true);
      }
    };
    window.addEventListener("beforeunload", handleEmergencyFlush);
    window.addEventListener("pagehide", handleEmergencyFlush);
    const handleVis = () => {
      if (document.visibilityState === "hidden") {
        handleEmergencyFlush();
      }
    };
    document.addEventListener("visibilitychange", handleVis);
    return () => {
      window.removeEventListener("beforeunload", handleEmergencyFlush);
      window.removeEventListener("pagehide", handleEmergencyFlush);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, [activeArena]);

  // Disable overflow on body when fullscreen is active (except SEKRETARIS which requires scrolling)
  useEffect(() => {
    const handleFsNotify = () => {
      const isFsActive = !!document.fullscreenElement;
      setNativeFs(isFsActive);
      if (isFsActive && appMode !== "SEKRETARIS") {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };

    document.addEventListener("fullscreenchange", handleFsNotify);
    document.addEventListener("webkitfullscreenchange", handleFsNotify);
    document.addEventListener("mozfullscreenchange", handleFsNotify);
    document.addEventListener("MSFullscreenChange", handleFsNotify);

    // Run initial state check
    handleFsNotify();

    return () => {
      document.removeEventListener("fullscreenchange", handleFsNotify);
      document.removeEventListener("webkitfullscreenchange", handleFsNotify);
      document.removeEventListener("mozfullscreenchange", handleFsNotify);
      document.removeEventListener("MSFullscreenChange", handleFsNotify);
      document.body.style.overflow = "";
    };
  }, [appMode]);

  // Auto-caching live match state and round scores locally in root component to prevent loss on refresh
  useEffect(() => {
    const handleExternalActivate = (event: Event) => {
      const customEvt = event as CustomEvent;
      if (customEvt.detail) {
        handleResetMatch(customEvt.detail);
      }
    };
    window.addEventListener("jrz_activate_match", handleExternalActivate);
    return () => {
      window.removeEventListener("jrz_activate_match", handleExternalActivate);
    };
  }, []);

  useEffect(() => {
    if (matchState && matchState.id) {
      const { id, activeRound, scoreRed, scoreBlue } = matchState;
      if (
        lastSavedScoresRef.current &&
        lastSavedScoresRef.current.id === id &&
        lastSavedScoresRef.current.activeRound === activeRound &&
        lastSavedScoresRef.current.scoreRed === scoreRed &&
        lastSavedScoresRef.current.scoreBlue === scoreBlue
      ) {
        return; // Skip saving to localStorage if round scores are exactly the same!
      }
      try {
        const key = `ipsi_round_scores_history_${id}`;
        const existing = localStorage.getItem(key);
        const history = existing ? JSON.parse(existing) : {};
        
        history[activeRound] = {
          round: activeRound,
          scoreRed: scoreRed,
          scoreBlue: scoreBlue,
          timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(history));
        lastSavedScoresRef.current = { id, activeRound, scoreRed, scoreBlue };
      } catch (e) {
        console.error("Gagal caching local storage di level root", e);
      }
    }
  }, [matchState]);

  // Local high-performance clock tick interpolation & autonomous offline timer engine (anchored to timerEndAt for 0ms drift across refreshed panels)
  useEffect(() => {
    if (!currentUser || !matchState || matchState.status !== "RUNNING") {
      return;
    }

    const timer = setInterval(() => {
      setMatchState(prev => {
        if (!prev || prev.status !== "RUNNING") {
          return prev;
        }

        const now = getSyncedNow();
        const arenaKey = (prev.arena || activeArena || "A").toUpperCase();

        // Ensure timerEndAt is anchored if missing on a running state
        if (typeof prev.timerEndAt !== "number" || prev.timerEndAt <= 0) {
          const baseTime = prev.timeLeft > 0 ? prev.timeLeft : (prev.roundDuration || 120);
          const anchored: MatchState = {
            ...prev,
            timeLeft: baseTime,
            timerStartedAt: now,
            timerEndAt: now + baseTime * 1000
          };
          offlineEngine.setState(anchored);
          return anchored;
        }

        const nextTime = Math.max(0, Math.ceil((prev.timerEndAt - now) / 1000));

        // Only update state when the integer second actually changes (or reaches 0)
        if (nextTime === prev.timeLeft && nextTime > 0) {
          return prev;
        }

        const tickStorageKey = `ipsi_last_timer_tick_${arenaKey}`;
        let shouldPersistTick = false;
        try {
          const lastTick = Number(window.localStorage.getItem(tickStorageKey)) || 0;
          if (now - lastTick >= 800 || nextTime <= 0) {
            shouldPersistTick = true;
            window.localStorage.setItem(tickStorageKey, String(now));
          }
        } catch {
          shouldPersistTick = true;
        }

        if (nextTime <= 0) {
          const tickedEndState = offlineEngine.processOfflineTimerTick(prev);
          const isController = appMode === "DEWAN" || appMode === "OPERATOR" || appMode === "SEKRETARIS";
          if (isController || !isSseActive) {
            saveMatchStateToFirebase(tickedEndState, arenaKey).catch(() => {});
          }
          if (tickedEndState.status === MatchStatus.FINISHED) {
            fetch("/api/match-state/round", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ roundAction: "FINISH" })
            }).catch(() => {});
          } else {
            fetch("/api/match-state/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                timeLeft: 0,
                status: MatchStatus.PAUSED,
                showRoundOverPopup: true,
                secretarySignalNextRound: true,
                dewanPanelLocked: true
              })
            }).catch(() => {});
          }
          return tickedEndState;
        }

        const updatedRunning: MatchState = {
          ...prev,
          timeLeft: nextTime
        };

        if (shouldPersistTick) {
          offlineEngine.setState(updatedRunning);
        }

        return updatedRunning;
      });
    }, 200);

    return () => clearInterval(timer);
  }, [currentUser, isSseActive, activeArena, matchState?.status, matchState?.activeRound]);

  // 1. Cross-tab real-time offline synchronization via BroadcastChannel
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = offlineEngine.subscribe((remoteState) => {
      setMatchState(prev => {
        if (!prev) return remoteState;
        if (remoteState.status === "RUNNING") {
          const effectiveEndAt =
            typeof remoteState.timerEndAt === "number" && remoteState.timerEndAt > 0
              ? remoteState.timerEndAt
              : prev.status === "RUNNING" &&
                prev.activeRound === remoteState.activeRound &&
                typeof prev.timerEndAt === "number" &&
                prev.timerEndAt > 0
              ? prev.timerEndAt
              : null;
          if (effectiveEndAt) {
            return {
              ...remoteState,
              timerEndAt: effectiveEndAt,
              timerStartedAt: remoteState.timerStartedAt || prev.timerStartedAt || getSyncedNow(),
              timeLeft: Math.max(0, Math.ceil((effectiveEndAt - getSyncedNow()) / 1000))
            };
          }
        }
        return remoteState;
      });
      setSyncCount(prev => prev + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  // Subscribe to Firebase Realtime Database active match state
  useEffect(() => {
    if (!currentUser) return;
    const unsubMatch = rtdbScoringEngine.listenToActiveMatch((remoteState) => {
      setMatchState(prev => {
        if (!prev) return remoteState;
        if (remoteState.status === "RUNNING") {
          const effectiveEndAt =
            typeof remoteState.timerEndAt === "number" && remoteState.timerEndAt > 0
              ? remoteState.timerEndAt
              : prev.status === "RUNNING" &&
                prev.activeRound === remoteState.activeRound &&
                typeof prev.timerEndAt === "number" &&
                prev.timerEndAt > 0
              ? prev.timerEndAt
              : null;
          if (effectiveEndAt) {
            return {
              ...remoteState,
              timerEndAt: effectiveEndAt,
              timerStartedAt: remoteState.timerStartedAt || prev.timerStartedAt || getSyncedNow(),
              timeLeft: Math.max(0, Math.ceil((effectiveEndAt - getSyncedNow()) / 1000))
            };
          }
        }
        return remoteState;
      });
      setErrorMsg(null);
      setSyncCount(prev => prev + 1);
    });

    return () => {
      unsubMatch();
    };
  }, [currentUser, activeArena]);

  // Force local and tab sync listener
  useEffect(() => {
    const handleForceSync = (e: any) => {
      if (e.detail) {
        setMatchState(normalizeMatchState(e.detail));
      }
    };
    window.addEventListener("force_match_sync", handleForceSync);
    return () => window.removeEventListener("force_match_sync", handleForceSync);
  }, []);

  // Register device presence in Firebase RTDB based on active appMode
  useEffect(() => {
    if (!currentUser) return;
    const roleKey = appMode === "LANDING" 
      ? `user-${currentUser.username}` 
      : appMode.toLowerCase();
    rtdbScoringEngine.initDevice(roleKey, `${currentUser.fullName} (${appMode})`);
  }, [currentUser, appMode]);

  // Ensure matchState is never stuck in null state
  useEffect(() => {
    if (!matchState) {
      setMatchState(createDefaultMatchState());
    }
  }, [matchState]);

  // Otomatisasi: Ketika partai 1 (atau partai manapun) telah selesai (status FINISHED),
  // tunggu durasi selebrasi (10 detik), lalu secara otomatis alihkan data pada semua panel
  // untuk persiapan pertandingan partai selanjutnya, disinkronkan ke Firebase & Server.
  useEffect(() => {
    if (!currentUser || !matchState || matchState.status !== MatchStatus.FINISHED) return;

    const finishedMatchId = matchState.id;
    const celebrationDurationMs = 10000;

    const autoAdvanceTimer = setTimeout(async () => {
      // Pastikan masih di partai yang sama dan status masih FINISHED (belum dialihkan oleh panel lain)
      if (matchState?.id === finishedMatchId && matchState?.status === MatchStatus.FINISHED) {
        console.log("OTOMATIS BERALIH: Durasi selebrasi selesai. Mengalihkan semua panel ke partai selanjutnya...");

        try {
          // 1. Prioritaskan alihkan melalui server backend jika online
          const res = await fetch("/api/match-state/next-match", { method: "POST" });
          if (res.ok) {
            const nextServerState = await res.json();
            if (nextServerState && nextServerState.id) {
              setMatchState(nextServerState);
              offlineEngine.broadcast(nextServerState);
              await saveMatchStateToFirebase(nextServerState, rtdbScoringEngine.getStatus().arena);
              return;
            }
          }
        } catch (e) {
          // Mode offline / Firebase-only
        }

        // 2. Fallback melalui engine Firebase Realtime Database
        try {
          const nextState = await rtdbScoringEngine.handleNextMatch(matchState);
          setMatchState(nextState);
        } catch (err) {
          console.error("Gagal auto-advance partai di Firebase RTDB:", err);
        }
      }
    }, celebrationDurationMs);

    return () => clearTimeout(autoAdvanceTimer);
  }, [currentUser, matchState?.id, matchState?.status]);

  // Synchronize state from Express backend with Server-Sent Events (SSE) for sub-ms real-time latency
  useEffect(() => {
    if (!currentUser) return;

    // In static cloud mode (GitHub Pages, Firebase Hosting), the app runs directly
    // against Firebase Realtime Database and LocalStorage/BroadcastChannel without an Express server.
    // Bypassing SSE and /api/ polling completely eliminates slow startup network timeouts and 404/HTML parse errors.
    const isStaticHosting = typeof window !== "undefined" && (
      window.location.hostname.includes("github.io") ||
      window.location.hostname.includes("web.app") ||
      window.location.hostname.includes("firebaseapp.com") ||
      (window as any).__JRZ_INDEX_MODE__ === "FIREBASE_GITHUB_SYNC"
    );

    if (isStaticHosting) {
      return;
    }

    let active = true;
    let eventSource: EventSource | null = null;
    let pollTimeout: NodeJS.Timeout | null = null;
    let isPollingScheduled = false;

    // High-performance clock dead-reckoning & conflict-free offline/online state merger
    const applyServerState = (data: any) => {
      if (!active || !data) return;
      const arenaKey = rtdbScoringEngine.getStatus().arena || "A";
      const localCached = offlineEngine.getState();
      const { merged, localIsNewer } = offlineEngine.reconcileMatchStates(
        localCached,
        data,
        hasPendingCloudSync(arenaKey)
      );

      // If local state has newer offline scoring/timer progress than the server snapshot on reconnect,
      // push our newer local state back up to the server so it never overwrites ongoing offline scoring!
      if (localIsNewer && merged && merged.id && merged.id !== "match-none") {
        setMatchState(merged);
        offlineEngine.broadcast(merged);
        saveMatchStateToFirebase(merged, arenaKey).catch(() => {});
        fetch("/api/match-state/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: merged })
        }).catch(() => {});
        return;
      }

      setMatchState(prev => {
        if (!prev) return merged;
        if (merged.status === "RUNNING") {
          const effectiveEndAt =
            typeof merged.timerEndAt === "number" && merged.timerEndAt > 0
              ? merged.timerEndAt
              : prev.status === "RUNNING" &&
                prev.activeRound === merged.activeRound &&
                typeof prev.timerEndAt === "number" &&
                prev.timerEndAt > 0
              ? prev.timerEndAt
              : null;
          if (effectiveEndAt) {
            return {
              ...merged,
              timerEndAt: effectiveEndAt,
              timerStartedAt: merged.timerStartedAt || prev.timerStartedAt || getSyncedNow(),
              timeLeft: Math.max(0, Math.ceil((effectiveEndAt - getSyncedNow()) / 1000))
            };
          }
        }
        return merged;
      });
      setErrorMsg(null);
      setSyncCount(prev => prev + 1);
      // Update local in-memory state without triggering a cross-tab BroadcastChannel echo storm on every SSE tick
      offlineEngine.setState(merged);
    };

    const fetchState = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800);
        const res = await fetch("/api/match-state", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error("Gagal mengambil status server");
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Bukan respons JSON server");
        }
        const data = await res.json();

        // Reconcile server state vs local state (handles both empty server restarts AND offline-to-online reconnections)
        applyServerState(data);
      } catch (err: any) {
        if (active) {
          // Offline mode active - fallback seamlessly to local storage & P2P BroadcastChannel
          setIsSseActive(false);
        }
      }
    };

    // Lightweight, congestion-free recursive timeout polling
    const schedulePoll = () => {
      if (!active || isPollingScheduled) return;
      isPollingScheduled = true;
      pollTimeout = setTimeout(async () => {
        isPollingScheduled = false;
        await fetchState();
        if (active && (!eventSource || eventSource.readyState === EventSource.CLOSED)) {
          schedulePoll();
        }
      }, 1000); // Polling dynamically scheduled 1s after the previous one finishes
    };

    const connectSSE = () => {
      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource("/api/match-state/stream");

      eventSource.onopen = () => {
        if (active) {
          setIsSseActive(true);
          setErrorMsg(null);
        }
        if (pollTimeout) {
          clearTimeout(pollTimeout);
          pollTimeout = null;
        }
        isPollingScheduled = false;
      };

      eventSource.onmessage = (event) => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data);
          applyServerState(data);
        } catch (e) {
          console.error("Gagal parse update real-time SSE", e);
        }
      };

      eventSource.onerror = (err) => {
        if (!active) return;
        setIsSseActive(false);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        // Schedule lightweight fallback polling
        schedulePoll();
      };
    };

    // 1. Fetch initial state
    fetchState();

    // 2. Start Real-time Stream
    connectSSE();

    // 3. Keep-alive connection check
    const keepAlive = setInterval(() => {
      if (active && (!eventSource || eventSource.readyState === EventSource.CLOSED)) {
        connectSSE();
      }
    }, 4000);

    return () => {
      active = false;
      if (eventSource) {
        eventSource.close();
      }
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
      clearInterval(keepAlive);
    };
  }, [currentUser]);

  // API & Offline & Firebase RTDB Call helper functions
  const handleTimerCommand = async (command: "START" | "PAUSE" | "ADD_10" | "SUB_10" | "RESET") => {
    if (!matchState) return;
    if (command === "RESET") {
      const resetDuration = matchState.roundDuration || 120;
      const updated = await rtdbScoringEngine.handleUpdateMetadata(matchState, {
        timeLeft: resetDuration,
        status: MatchStatus.IDLE
      });
      setMatchState(updated);
      try {
        fetch("/api/match-state/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timeLeft: resetDuration, status: MatchStatus.IDLE })
        }).catch(() => {});
      } catch (err) {}
      return;
    }
    const updated = await rtdbScoringEngine.handleTimerCommand(matchState, command);
    setMatchState(updated);
    try {
      fetch("/api/match-state/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          timeLeft: updated.timeLeft,
          timerEndAt: updated.timerEndAt ?? null,
          timerStartedAt: updated.timerStartedAt ?? null
        })
      }).catch(() => {});
    } catch (err) {}
  };

  const handleRoundAction = async (roundAction: "NEXT" | "SET" | "FINISH", targetRound?: number) => {
    if (!matchState) return;
    const updated = await rtdbScoringEngine.handleRoundAction(matchState, roundAction, targetRound);
    setMatchState(updated);
    try {
      fetch("/api/match-state/round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundAction, targetRound })
      }).catch(() => {});
    } catch (err) {}
  };

  const handleDewanAction = async (actionData: { command: "DROP" | "LOCK" | "PENALTY" | "OVERRIDE" | "CANCEL_DROP" | "RESET_ROUND_PENALTIES" | "DECLARE_VICTORY"; fighter: "RED" | "BLUE"; penaltyType?: string; overridePoints?: number }) => {
    if (!matchState) return;
    const updated = await rtdbScoringEngine.handleDewanAction(matchState, actionData);
    setMatchState(updated);
    try {
      fetch("/api/dewan/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actionData)
      }).catch(() => {});
    } catch (err) {}
  };

  const handleUpdateMetadata = async (data: Partial<MatchState>) => {
    if (!matchState) return;
    const updated = await rtdbScoringEngine.handleMetadataUpdate(matchState, data);
    setMatchState(updated);
    try {
      fetch("/api/match-state/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).catch(() => {});
    } catch (err) {}
  };

  const handleStartVerification = async (type: "JATUHAN" | "PELANGGARAN", corner?: "RED" | "BLUE" | null, reason?: string) => {
    if (!matchState) return;
    const updated = await rtdbScoringEngine.handleVerificationStart(matchState, type, corner, reason);
    setMatchState(updated);
    try {
      fetch("/api/match-state/verify/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, corner, reason })
      }).catch(() => {});
    } catch (err) {}
  };

  const handleApplyVerification = async (decision?: "MERAH" | "BIRU" | "TIDAK SAH") => {
    if (!matchState) return;
    const updated = await rtdbScoringEngine.handleVerificationApply(matchState, decision);
    setMatchState(updated);
    try {
      fetch("/api/match-state/verify/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      }).catch(() => {});
    } catch (err) {}
  };

  const handleJuryVote = async (juryId: number, vote: "MERAH" | "BIRU" | "TIDAK SAH") => {
    if (!matchState) return;
    const updated = await rtdbScoringEngine.handleVerificationVote(matchState, juryId, vote);
    setMatchState(updated);
    try {
      fetch("/api/match-state/verify/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ juryId, vote })
      }).catch(() => {});
    } catch (err) {}
  };

  const handleResetVerification = async () => {
    if (!matchState) return;
    const updated = await rtdbScoringEngine.handleVerificationReset(matchState);
    setMatchState(updated);
    try {
      fetch("/api/match-state/verify/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }).catch(() => {});
    } catch (err) {}
  };

  const lastHubJuryPressRef = useRef<Record<string, number>>({});

  const handleJuryPress = async (juryId: number, fighter: FighterColor, action: ActionType) => {
    if (!matchState) return;
    const now = Date.now();
    const comboKey = `${juryId}_${fighter}_${action}`;
    const anyKey = `${juryId}_ANY`;
    if (now - (lastHubJuryPressRef.current[comboKey] || 0) < 450) return;
    if (now - (lastHubJuryPressRef.current[anyKey] || 0) < 220) return;
    lastHubJuryPressRef.current[comboKey] = now;
    lastHubJuryPressRef.current[anyKey] = now;

    const pressId = `press_${juryId}_${now}`;

    // 1. Eksekusi lokal & sinkronisasi Firebase Realtime Database INSTAN 0ms (Menjamin konsensus juri real-time di mode Firebase & GitHub)
    const updated = await rtdbScoringEngine.handleJuryPress(matchState, juryId, fighter, action);
    setMatchState(updated);
    offlineEngine.setState(updated);

    // 2. Kirim ke backend Express / Node jika ada secara asinkron tanpa menahan proses konsensus / UI
    fetch("/api/jury/press", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ juryId, fighter, action, pressId, timestamp: now })
    })
      .then(async (res) => {
        if (res.ok) {
          const ct = res.headers.get("content-type");
          if (ct && ct.includes("application/json")) {
            const serverState = await res.json();
            if (serverState && serverState.id) {
              const normalized = normalizeMatchState(serverState);
              const { merged } = offlineEngine.reconcileMatchStates(offlineEngine.getState(), normalized);
              setMatchState(merged);
              offlineEngine.setState(merged);
            }
          }
        }
      })
      .catch(() => {
        // Mode Firebase murni / GitHub Pages tanpa server lokal
      });

    // Auto clear visual indicator from local React state after 2.0s
    const pressTime = updated.activeJuryPresses?.[juryId]?.pressedAt;
    setTimeout(() => {
      setMatchState(prev => {
        if (prev?.activeJuryPresses?.[juryId]?.pressedAt === pressTime) {
          return {
            ...prev,
            activeJuryPresses: {
              ...prev.activeJuryPresses,
              [juryId]: null
            }
          };
        }
        return prev;
      });
    }, 2000);
  };

  const handleResetMatch = async (customPayload?: Partial<MatchState>) => {
    const payload = {
      id: customPayload?.id || "match-" + Date.now(),
      eventName: customPayload?.eventName || matchState?.eventName || "KEJUARAAN PENCAK SILAT NASIONAL",
      fighterRedName: customPayload?.fighterRedName || matchState?.fighterRedName || "PESILAT MERAH",
      fighterRedClub: customPayload?.fighterRedClub || matchState?.fighterRedClub || "CONTINGENT MERAH",
      fighterBlueName: customPayload?.fighterBlueName || matchState?.fighterBlueName || "PESILAT BIRU",
      fighterBlueClub: customPayload?.fighterBlueClub || matchState?.fighterBlueClub || "CONTINGENT BIRU",
      classCategory: customPayload?.classCategory || matchState?.classCategory || "Tanding Bebas",
      matchNumber: customPayload?.matchNumber || matchState?.matchNumber || "Partai -",
      roundCount: customPayload?.roundCount || matchState?.roundCount || 3,
      roundDuration: customPayload?.roundDuration || matchState?.roundDuration || 120,
      logoLeft: customPayload?.logoLeft || matchState?.logoLeft || "",
      logoRight: customPayload?.logoRight || matchState?.logoRight || "",
      gender: customPayload?.gender || matchState?.gender || "PUTRA",
      stage: customPayload?.stage || matchState?.stage || "PENYISIHAN",
      division: customPayload?.division || matchState?.division || "DEWASA",
      wmpThreshold: customPayload?.wmpThreshold || matchState?.wmpThreshold || 30
    };

    const resetState: MatchState = {
      ...(matchState || ({} as MatchState)),
      ...payload,
      status: MatchStatus.IDLE,
      activeRound: 1,
      timeLeft: payload.roundDuration || 120,
      scoreRed: 0,
      scoreBlue: 0,
      redStats: { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 },
      blueStats: { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 },
      redPenalties: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false },
      bluePenalties: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false },
      activeJuryPresses: { 1: null, 2: null, 3: null },
      juryScores: {
        1: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } },
        2: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } },
        3: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } }
      },
      verification: undefined,
      showRoundOverPopup: false,
      secretarySignalNextRound: false,
      juryPanelLocked: true,
      dewanPanelLocked: true,
      winnerPublished: false,
      winnerColor: null,
      winnerMethod: undefined,
      logs: [
        {
          id: "reset-" + Date.now(),
          timestamp: Date.now(),
          round: 1,
          fighter: "RED",
          description: `Partai ${payload.matchNumber} (${payload.classCategory}) diaktifkan. Layar Juri & Dewan bersiap tanding.`,
          points: 0,
          source: "Sistem",
          type: "SYSTEM"
        }
      ]
    };

    const updated = await rtdbScoringEngine.handleResetMatch(resetState);
    setMatchState(updated);
    offlineEngine.broadcast(updated);

    try {
      fetch("/api/match-state/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: resetState })
      }).catch(() => {});
    } catch (err) {}
  };

  // Fungsi Reset Menyeluruh: Membersihkan seluruh data pertandingan & mempersiapkan aplikasi 100% bersih
  const handleCompleteReset = async (archiveFirst: boolean = false) => {
    sound.playClick();
    const arenaKey = (matchState?.arena || activeArena || "A").toUpperCase();

    // 1. Jika pengguna memilih 'Arsipkan data', simpan snapshot pertandingan ini ke arsip terlebih dahulu
    if (archiveFirst && matchState && matchState.id) {
      try {
        const archiveItem = {
          ...matchState,
          archivedAt: Date.now(),
          archivedDate: new Date().toLocaleString("id-ID")
        };
        const curArchiveRaw = window.localStorage.getItem("ipsi_finished_matches_archive");
        const archiveList = curArchiveRaw ? JSON.parse(curArchiveRaw) : [];
        archiveList.unshift(archiveItem);
        window.localStorage.setItem("ipsi_finished_matches_archive", JSON.stringify(archiveList));
        autoSaveVault.mirrorKeyToIndexedDB("ipsi_finished_matches_archive", archiveList);
        if (matchState.winnerColor) {
          offlineEngine.archiveFinishedMatchOffline(matchState);
        }
      } catch (e) {
        console.warn("Gagal mengarsipkan data pertandingan:", e);
      }
    }

    // 2. Format state baru yang 100% bersih dari seluruh sisa pertandingan sebelumnya
    const cleanDuration = matchState?.roundDuration || 120;
    const cleanState: MatchState = {
      id: "match-" + Date.now(),
      eventName: matchState?.eventName || "KEJUARAAN PENCAK SILAT NASIONAL",
      fighterRedName: "PESILAT MERAH",
      fighterRedClub: "SUDUT MERAH",
      fighterBlueName: "PESILAT BIRU",
      fighterBlueClub: "SUDUT BIRU",
      classCategory: matchState?.classCategory || "Tanding Bebas",
      matchNumber: "1",
      roundCount: 3,
      roundDuration: cleanDuration,
      timeLeft: cleanDuration,
      status: MatchStatus.IDLE,
      activeRound: 1,
      scoreRed: 0,
      scoreBlue: 0,
      redStats: { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 },
      blueStats: { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 },
      redPenalties: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false },
      bluePenalties: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false },
      activeJuryPresses: { 1: null, 2: null, 3: null },
      juryScores: {
        1: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } },
        2: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } },
        3: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } }
      },
      juryPressHistory: [],
      verification: undefined,
      showRoundOverPopup: false,
      secretarySignalNextRound: false,
      juryPanelLocked: true,
      dewanPanelLocked: true,
      winnerPublished: false,
      winnerColor: null,
      winnerMethod: undefined,
      isTieExtendedPossible: false,
      losingCornerColor: null,
      losingCornerNoScoreDuration: 0,
      lastLosingScore: null,
      showNextMatchPopup: false,
      gender: matchState?.gender || "PUTRA",
      stage: "PENYISIHAN",
      division: matchState?.division || "DEWASA",
      wmpThreshold: matchState?.wmpThreshold || 30,
      arena: arenaKey,
      logs: [
        {
          id: "reset-" + Date.now(),
          timestamp: Date.now(),
          round: 1,
          fighter: "RED",
          description: "Partai 1 diaktifkan. Seluruh data pertandingan telah direset bersih. Layar Juri & Dewan bersiap tanding.",
          points: 0,
          source: "Sistem",
          type: "SYSTEM"
        }
      ]
    };

    // 3. Simpan state bersih ke LocalStorage & AutoSave Vault
    if (typeof window !== "undefined") {
      try {
        const raw = JSON.stringify(cleanState);
        window.localStorage.setItem("ipsi_match_state", raw);
        window.localStorage.setItem("jrz_silat_match_state", raw);
        window.localStorage.setItem(`jrz_silat_match_state_${arenaKey}`, raw);
        autoSaveVault.saveMatchState(cleanState, arenaKey, "COMPLETE_RESET", true);
      } catch (e) {}
    }

    // 4. Update Engine & Broadcast ke seluruh perangkat
    offlineEngine.setState(cleanState);
    offlineEngine.broadcast(cleanState);
    rtdbScoringEngine.setCurrentMatchState(cleanState);
    await rtdbScoringEngine.handleResetMatch(cleanState);
    setMatchState(cleanState);

    // 5. Sync ke Backend Server
    try {
      fetch("/api/match-state/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: cleanState })
      }).catch(() => {});
    } catch (e) {}

    // 6. Tutup modal konfirmasi reset & modal pengaturan
    setShowResetConfirmModal(false);
    setShowSettingsModal(false);
    sound.playGong();
  };

  const toggleFullscreen = (modeName: string) => {
    playAppSound(800, 0.08);
    const isCurrentlyFs = fullscreenMode === modeName || Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
    if (isCurrentlyFs) {
      setFullscreenMode(null);
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        try {
          (document as any).webkitExitFullscreen();
        } catch {}
      }
      if (window.screen && window.screen.orientation && (window.screen.orientation as any).unlock) {
        try {
          (window.screen.orientation as any).unlock();
        } catch (e) {
          console.warn("Screen orientation unlock failed:", e);
        }
      }
    } else {
      setFullscreenMode(modeName);
      // Attempt standard requestFullscreen
      const elem = document.documentElement;
      if (elem) {
        const reqFs = elem.requestFullscreen || (elem as any).webkitRequestFullscreen;
        if (reqFs) {
          reqFs.call(elem).then(() => {
            if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
              (window.screen.orientation as any).lock("landscape").catch((err: any) => {
                console.warn("Screen orientation lock to landscape failed:", err);
              });
            }
          }).catch((err: any) => {
            console.warn("Element HTML5 Fullscreen request blocked. Using CSS simulation backdrop.", err);
            if (window.screen && window.screen.orientation && (window.screen.orientation as any).lock) {
              (window.screen.orientation as any).lock("landscape").catch(() => {});
            }
          });
        }
      }
    }
  };

  const getPanelDisplayName = (mode: AppMode): string => {
    switch (mode) {
      case "DEWAN": return "Panel Ketua Pertandingan / Dewan";
      case "SEKRETARIS": return "Panel Sekretaris Pertandingan";
      case "OPERATOR": return "Panel Operator Timer & Skor";
      case "JURY1": return "Panel Juri 1";
      case "JURY2": return "Panel Juri 2";
      case "JURY3": return "Panel Juri 3";
      case "SCOREBOARD": return "Layar Utama Arena (Scoreboard Monitor)";
      case "JADWAL": return "Panel Jadwal Pertandingan";
      case "LOTING": return "Panel Loting & Bagan";
      case "LAPORAN": return "Panel Laporan & Rekap Nilai";
      case "BRACKET": return "Panel Bagan Turnamen";
      case "SIMULATOR": return "Panel Simulator Terpadu";
      default: return "Panel Pertandingan";
    }
  };

  const executeModeSwitch = (mode: typeof appMode) => {
    playAppSound(500, 0.08);
    setAppMode(mode);
    setFullscreenMode(null); // Reset when moving
    setIsSekretarisSubScreen(false);
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (mode === "LANDING") {
          url.searchParams.delete("mode");
          url.searchParams.delete("panel");
          url.searchParams.delete("role");
        } else {
          url.searchParams.set("mode", mode);
        }
        window.history.replaceState({}, document.title, url.toString());
      } catch (e) {
        // Ignore
      }
    }
  };

  const handleModeSwitch = (mode: typeof appMode) => {
    if (mode === "LANDING") {
      executeModeSwitch("LANDING");
      return;
    }
    // Verifikasi password '211096' saat akan membuka tiap panel
    setPendingPanelMode(mode);
  };

  if (!matchState) {
    return (
      <div className="min-h-screen bg-[#0c041f] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <Activity className="w-12 h-12 text-amber-500 animate-spin mb-4" />
        <h2 className="font-sans font-bold text-lg">Inisialisasi Sistem Digital Scoreboard...</h2>
        <p className="text-sm text-slate-400 mt-2">Menyiapkan panel pertandingan...</p>
        <button
          onClick={() => setMatchState(createDefaultMatchState())}
          className="mt-4 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg flex items-center gap-2"
        >
          <Play className="w-4 h-4" /> Masuk ke Pertandingan Sekarang
        </button>
        {errorMsg && (
          <div className="mt-4 p-3 bg-red-955/50 border border-purple-900/60 rounded-xl text-purple-200 text-xs max-w-md">
            {errorMsg}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      themeMode === "LIGHT_CONTRAST" ? "bg-white text-slate-900" : "bg-[#0c041f] text-slate-100"
    } flex flex-col justify-between ${
      fullscreenMode || isMonitorOnly || appMode.startsWith("JURY")
        ? fullscreenMode === "SEKRETARIS"
          ? themeMode === "LIGHT_CONTRAST"
            ? "w-full min-h-screen bg-white relative z-50 text-slate-900"
            : "w-full min-h-screen bg-[#060211] relative z-50"
          : "h-screen w-screen overflow-hidden fixed inset-0 z-50"
        : ""
    }`} id="sim-hub-root">
      
      {/* UNIFIED AUTO-HIDING FULLSCREEN & KEMBALI OVERLAY (ACTIVE IN TOP-RIGHT CORNER) */}
      {!(
        (appMode === "SEKRETARIS" && isSekretarisSubScreen) ||
        appMode === "OPERATOR" ||
        appMode === "JADWAL" ||
        appMode === "LOTING" ||
        appMode === "BRACKET" ||
        appMode === "LAPORAN" ||
        appMode === "JURY1" ||
        appMode === "JURY2" ||
        appMode === "JURY3"
      ) && (
        <FullScreenOverlay 
          onBack={
            isMonitorOnly
              ? () => {
                  sound.playClick();
                  if (onBackToHome) {
                    onBackToHome();
                  } else {
                    window.dispatchEvent(new CustomEvent("jrz_navigate_tab", { detail: "BERANDA" }));
                  }
                }
              : appMode !== "LANDING"
                ? () => handleModeSwitch("LANDING")
                : undefined
          } 
          showBack={Boolean(isMonitorOnly || appMode !== "LANDING")}
          backTitle={isMonitorOnly ? "Kembali ke Beranda JRZ SCORE" : "Kembali ke Pemilihan Peran Tanding"}
          backLabel={isMonitorOnly ? "KEMBALI KE BERANDA" : "KEMBALI"}
          isFullscreenProp={Boolean(fullscreenMode || nativeFs)}
          onToggleFullscreen={() => toggleFullscreen(appMode)}
        />
      )}

      {/* 1. LANDING PAGE ROLE MENU SELECTION */}
      {appMode === "LANDING" && (
        <div 
          className="flex-grow flex flex-col justify-between items-center w-full font-sans select-none min-h-screen relative overflow-x-hidden p-3 sm:p-5 md:p-6 animate-fadeIn" 
          id="landing-page-container"
          style={{
            background: themeMode === "LIGHT_CONTRAST"
              ? "#ffffff"
              : "radial-gradient(ellipse at 50% 30%, #0c1842 0%, #040817 60%, #02040b 100%)"
          }}
        >
          {/* Full Screen Watermark Background: IMG_4754.JPG.jpeg */}
          <div 
            className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden" 
            aria-hidden="true"
          >
            <img 
              src="/IMG_4754.JPG.jpeg" 
              alt="Watermark Latar Belakang" 
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover object-center contrast-125 transition-opacity duration-300 ${
                themeMode === "LIGHT_CONTRAST" ? "opacity-[0.06] brightness-105" : "opacity-25 sm:opacity-30 brightness-95"
              }`} 
            />
            {/* Dark/Light vignette & gradient overlay for contrast and sleek arena aesthetic */}
            <div className={`absolute inset-0 transition-colors duration-300 ${
              themeMode === "LIGHT_CONTRAST"
                ? "bg-gradient-to-b from-white/95 via-white/98 to-slate-50"
                : "bg-gradient-to-b from-[#0c1842]/75 via-[#040817]/80 to-[#02040b]/92"
            }`} />
          </div>

          {/* TOMBOL MENU PENGATURAN BAGIAN KIRI ATAS LANDING PAGE (ICON GERIGI TANPA GRID/BOX) */}
          <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-30">
            <button
              onClick={() => {
                playAppSound(650, 0.08);
                setShowSettingsModal(true);
              }}
              className="group p-2 text-slate-400 hover:text-cyan-300 transition-all duration-300 cursor-pointer flex items-center justify-center active:scale-95 hover:drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]"
              id="landing-settings-btn"
              title="Pengaturan Aplikasi"
              aria-label="Pengaturan"
            >
              <Settings className="w-6 h-6 sm:w-7 sm:h-7 group-hover:rotate-90 transition-transform duration-500 text-slate-300 group-hover:text-cyan-300" />
            </button>
          </div>

          {/* MAIN HERO & CENTERED BENTO-STYLE GRID */}
          <main className="flex-grow flex flex-col items-center justify-center py-2 sm:py-4 px-3 max-w-7xl mx-auto w-full z-10 my-auto animate-fadeIn">
            
            {/* MAIN LOGO UTAMA WITH ARENA LED GLOW */}
            <div className="flex flex-col justify-center items-center select-none w-full max-w-2xl px-2 py-0 mb-4 sm:mb-6">
              <div
                className="flex flex-col items-center bg-transparent border-none p-0 select-none group"
                id="matchsim-logo-header"
              >
                <img 
                  src="/jrzscoreutama.png" 
                  alt="JRZ Score Logo" 
                  loading="eager"
                  decoding="async"
                  className="max-h-32 sm:max-h-40 md:max-h-48 lg:max-h-54 w-auto max-w-full object-contain filter drop-shadow-[0_0_40px_rgba(59,130,246,0.65)] transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith("/logo_panel_dewan.svg")) {
                      target.src = "/logo_panel_dewan.svg";
                    }
                  }}
                />
              </div>
            </div>

            {/* DAFTAR PANEL MENU PERTANDINGAN (6 PANEL DENGAN GRID BINGKAI / KOTAK) */}
            <div className={`w-full max-w-6xl mb-3 sm:mb-4 p-3 sm:p-4 md:p-5 border transition-all duration-300 ${
              themeMode === "LIGHT_CONTRAST"
                ? "bg-slate-100/80 border-slate-300 shadow-sm"
                : "bg-[#050c1f]/65 border-blue-500/25 shadow-[0_0_40px_rgba(15,23,42,0.75)] backdrop-blur-sm"
            }`}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-5 w-full">
                
                {/* 1. DEWAN */}
                <div 
                  onClick={() => handleModeSwitch("DEWAN")}
                  className={`group relative p-3 sm:p-4 rounded-none flex flex-col items-center justify-between text-center cursor-pointer transition-all duration-300 hover:-translate-y-1.5 select-none border ${
                    themeMode === "LIGHT_CONTRAST"
                      ? "bg-white hover:bg-blue-50/70 border-slate-300 hover:border-blue-600 shadow-sm hover:shadow-md"
                      : "bg-gradient-to-b from-[#0b1736]/90 via-[#071026]/95 to-[#050b1b]/95 border-blue-500/35 hover:border-cyan-400 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(59,130,246,0.45)] backdrop-blur-md"
                  }`}
                  id="landing-card-dewan"
                  title="Masuk ke Panel Dewan (Ketua Pertandingan)"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 opacity-75 group-hover:opacity-100 transition-opacity" />
                  <div className="my-2 sm:my-3 flex items-center justify-center">
                    <img 
                      src="/ketuadewan.png" 
                      alt="Dewan" 
                      loading="lazy"
                      decoding="async"
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 object-contain rounded-none group-hover:scale-110 filter drop-shadow-[0_0_15px_rgba(37,99,235,0.7)] group-hover:drop-shadow-[0_0_25px_rgba(59,130,246,0.95)] transition-all duration-300 z-10" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className={`w-full pt-2.5 mt-1 border-t flex flex-col items-center ${
                    themeMode === "LIGHT_CONTRAST" ? "border-slate-200" : "border-blue-500/20 group-hover:border-cyan-400/40"
                  }`}>
                    <span className={`font-sans font-black text-xs sm:text-sm tracking-wider uppercase transition-colors ${
                      themeMode === "LIGHT_CONTRAST" ? "text-slate-900 group-hover:text-blue-700" : "text-white group-hover:text-cyan-300"
                    }`}>
                      KETUA DEWAN
                    </span>
                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                      themeMode === "LIGHT_CONTRAST" ? "text-blue-700/80" : "text-blue-300/75"
                    }`}>
                      KONTROL & VERIFIKASI
                    </span>
                  </div>
                </div>

                {/* 2. TIMER PERTANDINGAN (OPERATOR) */}
                <div 
                  onClick={() => handleModeSwitch("OPERATOR")}
                  className={`group relative p-3 sm:p-4 rounded-none flex flex-col items-center justify-between text-center cursor-pointer transition-all duration-300 hover:-translate-y-1.5 select-none border ${
                    themeMode === "LIGHT_CONTRAST"
                      ? "bg-white hover:bg-emerald-50/70 border-slate-300 hover:border-emerald-600 shadow-sm hover:shadow-md"
                      : "bg-gradient-to-b from-[#0b1736]/90 via-[#071026]/95 to-[#050b1b]/95 border-emerald-500/35 hover:border-emerald-400 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(16,185,129,0.45)] backdrop-blur-md"
                  }`}
                  id="landing-card-timer"
                  title="Masuk ke Panel Timer Pertandingan (Kontrol Waktu, Ronde & Ritme Tanding)"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600 opacity-75 group-hover:opacity-100 transition-opacity" />
                  <div className="my-2 sm:my-3 flex items-center justify-center">
                    <img 
                      src={iconTimer} 
                      alt="Timer Pertandingan" 
                      loading="lazy"
                      decoding="async"
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 object-contain rounded-none group-hover:scale-110 filter drop-shadow-[0_0_15px_rgba(0,128,0,0.6)] group-hover:drop-shadow-[0_0_25px_rgba(52,211,153,0.95)] transition-all duration-300 z-10" 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement?.querySelector('.icon-fallback') as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="icon-fallback hidden w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 rounded-none bg-emerald-500/10 border border-emerald-400/40 items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(0,128,0,0.35)]">
                      <Timer className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-300" />
                    </div>
                  </div>
                  <div className={`w-full pt-2.5 mt-1 border-t flex flex-col items-center ${
                    themeMode === "LIGHT_CONTRAST" ? "border-slate-200" : "border-emerald-500/20 group-hover:border-emerald-400/40"
                  }`}>
                    <span className={`font-sans font-black text-xs sm:text-sm tracking-wider uppercase transition-colors ${
                      themeMode === "LIGHT_CONTRAST" ? "text-slate-900 group-hover:text-emerald-700" : "text-white group-hover:text-emerald-300"
                    }`}>
                      TIMER PERTANDINGAN
                    </span>
                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                      themeMode === "LIGHT_CONTRAST" ? "text-emerald-700/80" : "text-emerald-300/75"
                    }`}>
                      RITME & WAKTU TANDING
                    </span>
                  </div>
                </div>

                {/* 3. SEKRETARIS */}
                <div 
                  onClick={() => handleModeSwitch("SEKRETARIS")}
                  className={`group relative p-3 sm:p-4 rounded-none flex flex-col items-center justify-between text-center cursor-pointer transition-all duration-300 hover:-translate-y-1.5 select-none border ${
                    themeMode === "LIGHT_CONTRAST"
                      ? "bg-white hover:bg-purple-50/70 border-slate-300 hover:border-purple-600 shadow-sm hover:shadow-md"
                      : "bg-gradient-to-b from-[#0b1736]/90 via-[#071026]/95 to-[#050b1b]/95 border-purple-500/35 hover:border-purple-400 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(168,85,247,0.45)] backdrop-blur-md"
                  }`}
                  id="landing-card-sekretaris"
                  title="Masuk ke Panel Sekretaris Pertandingan"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-600 via-fuchsia-400 to-purple-600 opacity-75 group-hover:opacity-100 transition-opacity" />
                  <div className="my-2 sm:my-3 flex items-center justify-center">
                    <img 
                      src="/iconsekretaris.png" 
                      alt="Sekretaris" 
                      loading="lazy"
                      decoding="async"
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 object-contain rounded-none group-hover:scale-110 filter drop-shadow-[0_0_15px_rgba(147,51,234,0.7)] group-hover:drop-shadow-[0_0_25px_rgba(168,85,247,0.95)] transition-all duration-300 z-10" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className={`w-full pt-2.5 mt-1 border-t flex flex-col items-center ${
                    themeMode === "LIGHT_CONTRAST" ? "border-slate-200" : "border-purple-500/20 group-hover:border-purple-400/40"
                  }`}>
                    <span className={`font-sans font-black text-xs sm:text-sm tracking-wider uppercase transition-colors ${
                      themeMode === "LIGHT_CONTRAST" ? "text-slate-900 group-hover:text-purple-700" : "text-white group-hover:text-purple-300"
                    }`}>
                      SEKRETARIS
                    </span>
                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                      themeMode === "LIGHT_CONTRAST" ? "text-purple-700/80" : "text-purple-300/75"
                    }`}>
                      MEJA PERTANDINGAN
                    </span>
                  </div>
                </div>

                {/* 4. JURI */}
                <div 
                  onClick={() => setShowJuryModal(true)}
                  className={`group relative p-3 sm:p-4 rounded-none flex flex-col items-center justify-between text-center cursor-pointer transition-all duration-300 hover:-translate-y-1.5 select-none border ${
                    themeMode === "LIGHT_CONTRAST"
                      ? "bg-white hover:bg-amber-50/70 border-slate-300 hover:border-amber-600 shadow-sm hover:shadow-md"
                      : "bg-gradient-to-b from-[#0b1736]/90 via-[#071026]/95 to-[#050b1b]/95 border-amber-500/35 hover:border-amber-400 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(245,158,11,0.45)] backdrop-blur-md"
                  }`}
                  id="landing-card-juri"
                  title="Masuk ke Panel Juri (1 - 3)"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 opacity-75 group-hover:opacity-100 transition-opacity" />
                  <div className="my-2 sm:my-3 flex items-center justify-center">
                    <img 
                      src="/juri.png" 
                      alt="Juri" 
                      loading="lazy"
                      decoding="async"
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 object-contain rounded-none group-hover:scale-110 filter drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] group-hover:drop-shadow-[0_0_25px_rgba(251,191,36,0.95)] transition-all duration-300 z-10" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className={`w-full pt-2.5 mt-1 border-t flex flex-col items-center ${
                    themeMode === "LIGHT_CONTRAST" ? "border-slate-200" : "border-amber-500/20 group-hover:border-amber-400/40"
                  }`}>
                    <span className={`font-sans font-black text-xs sm:text-sm tracking-wider uppercase transition-colors ${
                      themeMode === "LIGHT_CONTRAST" ? "text-slate-900 group-hover:text-amber-700" : "text-white group-hover:text-amber-300"
                    }`}>
                      PANEL JURI
                    </span>
                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                      themeMode === "LIGHT_CONTRAST" ? "text-amber-700/80" : "text-amber-300/75"
                    }`}>
                      GAWAI PENEKANAN POIN
                    </span>
                  </div>
                </div>

                {/* 5. MONITOR ARENA LED */}
                <div 
                  onClick={() => handleModeSwitch("SCOREBOARD")}
                  className={`group relative p-3 sm:p-4 rounded-none flex flex-col items-center justify-between text-center cursor-pointer transition-all duration-300 hover:-translate-y-1.5 select-none border ${
                    themeMode === "LIGHT_CONTRAST"
                      ? "bg-white hover:bg-rose-50/70 border-slate-300 hover:border-rose-600 shadow-sm hover:shadow-md"
                      : "bg-gradient-to-b from-[#0b1736]/90 via-[#071026]/95 to-[#050b1b]/95 border-rose-500/35 hover:border-rose-400 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(244,63,94,0.45)] backdrop-blur-md"
                  }`}
                  id="landing-card-monitor"
                  title="Buka Layar Monitor Skor (Arena LED)"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-600 via-pink-400 to-rose-600 opacity-75 group-hover:opacity-100 transition-opacity" />
                  <div className="my-2 sm:my-3 flex items-center justify-center">
                    <img 
                      src="/iconmonitor.png" 
                      alt="Monitor" 
                      loading="lazy"
                      decoding="async"
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 object-contain rounded-none group-hover:scale-110 filter drop-shadow-[0_0_15px_rgba(225,29,72,0.7)] group-hover:drop-shadow-[0_0_25px_rgba(244,63,94,0.95)] transition-all duration-300 z-10" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className={`w-full pt-2.5 mt-1 border-t flex flex-col items-center ${
                    themeMode === "LIGHT_CONTRAST" ? "border-slate-200" : "border-rose-500/20 group-hover:border-rose-400/40"
                  }`}>
                    <span className={`font-sans font-black text-xs sm:text-sm tracking-wider uppercase transition-colors ${
                      themeMode === "LIGHT_CONTRAST" ? "text-slate-900 group-hover:text-rose-700" : "text-white group-hover:text-rose-300"
                    }`}>
                      MONITOR ARENA
                    </span>
                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                      themeMode === "LIGHT_CONTRAST" ? "text-rose-700/80" : "text-rose-300/75"
                    }`}>
                      DISPLAY SKOR LAYAR LED
                    </span>
                  </div>
                </div>

                {/* 6. LAPORAN */}
                <div 
                  onClick={() => handleModeSwitch("LAPORAN")}
                  className={`group relative p-3 sm:p-4 rounded-none flex flex-col items-center justify-between text-center cursor-pointer transition-all duration-300 hover:-translate-y-1.5 select-none border ${
                    themeMode === "LIGHT_CONTRAST"
                      ? "bg-white hover:bg-amber-50/70 border-slate-300 hover:border-amber-600 shadow-sm hover:shadow-md"
                      : "bg-gradient-to-b from-[#0b1736]/90 via-[#071026]/95 to-[#050b1b]/95 border-amber-500/35 hover:border-amber-400 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(245,158,11,0.45)] backdrop-blur-md"
                  }`}
                  id="landing-card-laporan"
                  title="Menu Laporan PDF Hasil Pertandingan & Klasemen Medali"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-600 via-orange-400 to-amber-600 opacity-75 group-hover:opacity-100 transition-opacity" />
                  <div className="my-2 sm:my-3 flex items-center justify-center">
                    <img 
                      src={iconLaporan} 
                      alt="Laporan" 
                      loading="lazy"
                      decoding="async"
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 object-contain rounded-none group-hover:scale-110 filter drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] group-hover:drop-shadow-[0_0_25px_rgba(251,191,36,0.95)] transition-all duration-300 z-10" 
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes("iconlaporan.png")) {
                          target.src = "/iconlaporan.png";
                        } else {
                          target.style.display = 'none';
                          const fallback = target.parentElement?.querySelector('.icon-fallback') as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }
                      }}
                    />
                    <div className="icon-fallback hidden w-20 h-20 sm:w-24 sm:h-24 md:w-26 md:h-26 rounded-none bg-amber-500/10 border border-amber-400/40 items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
                      <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-amber-300" />
                    </div>
                  </div>
                  <div className={`w-full pt-2.5 mt-1 border-t flex flex-col items-center ${
                    themeMode === "LIGHT_CONTRAST" ? "border-slate-200" : "border-amber-500/20 group-hover:border-amber-400/40"
                  }`}>
                    <span className={`font-sans font-black text-xs sm:text-sm tracking-wider uppercase transition-colors ${
                      themeMode === "LIGHT_CONTRAST" ? "text-slate-900 group-hover:text-amber-700" : "text-white group-hover:text-amber-300"
                    }`}>
                      LAPORAN
                    </span>
                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mt-0.5 line-clamp-1 ${
                      themeMode === "LIGHT_CONTRAST" ? "text-amber-700/80" : "text-amber-300/75"
                    }`}>
                      LAPORAN PDF HASIL
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* DEVELOPED BY ATTRIBUTION */}
            <div className="w-full text-center mt-2 mb-4 select-none" id="landing-developer-attribution">
              <span className={`text-xs sm:text-sm font-semibold tracking-wide font-mono transition-colors ${
                themeMode === "LIGHT_CONTRAST"
                  ? "text-slate-600"
                  : "text-slate-300"
              }`}>
                developed by : Jaka Oktorian
              </span>
            </div>

          </main>

          {/* JURI GAWAI SELECTION OVERLAY MODAL */}
          {showJuryModal && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-55 animate-fadeIn">
              <div className="bg-[#0b1329] border-2 border-blue-500/50 rounded-none p-6 sm:p-8 max-w-sm w-full text-center relative shadow-[0_0_60px_rgba(37,99,235,0.4)]">
                
                <button 
                  onClick={() => setShowJuryModal(false)}
                  className="absolute top-4 right-4 p-1.5 rounded-none hover:bg-blue-950/60 text-blue-300 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="w-16 h-16 rounded-none border-2 border-amber-400 bg-amber-500/10 flex items-center justify-center text-amber-400 mx-auto mb-3 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  <User className="w-7 h-7" />
                </div>

                <h3 className="font-sans font-black text-base tracking-widest text-white uppercase mb-1">
                  PILIH GAWAI JURI
                </h3>
                <p className="text-[10px] text-cyan-300/80 mb-5 font-mono uppercase tracking-wider">
                  Coincidence Consensus System
                </p>

                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      setShowJuryModal(false);
                      handleModeSwitch("JURY1");
                    }}
                    className="w-full bg-[#112048] hover:bg-[#18306d] border border-blue-500/40 text-slate-100 hover:text-white transition-all py-3 px-4 rounded-none font-black text-xs uppercase tracking-wider active:scale-95 cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  >
                    Juri 1 (Gawai Depan)
                  </button>
                  <button
                    onClick={() => {
                      setShowJuryModal(false);
                      handleModeSwitch("JURY2");
                    }}
                    className="w-full bg-[#112048] hover:bg-[#18306d] border border-blue-500/40 text-slate-100 hover:text-white transition-all py-3 px-4 rounded-none font-black text-xs uppercase tracking-wider active:scale-95 cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  >
                    Juri 2 (Gawai Kanan)
                  </button>
                  <button
                    onClick={() => {
                      setShowJuryModal(false);
                      handleModeSwitch("JURY3");
                    }}
                    className="w-full bg-[#112048] hover:bg-[#18306d] border border-blue-500/40 text-slate-100 hover:text-white transition-all py-3 px-4 rounded-none font-black text-xs uppercase tracking-wider active:scale-95 cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  >
                    Juri 3 (Gawai Kiri)
                  </button>
                </div>

                <div className="mt-5 text-[9.5px] text-cyan-400/60 font-mono tracking-widest">
                  IPSI TANDINGAN v3.2.0 • ARENA LED
                </div>
              </div>
            </div>
          )}

          {/* MODAL PENGATURAN APLIKASI (DIBUKA DARI ICON GERIGI KIRI ATAS) */}
          {showSettingsModal && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-55 animate-fadeIn">
              <div className={`${
                themeMode === "LIGHT_CONTRAST"
                  ? "bg-white border-2 border-slate-700 text-slate-900 shadow-2xl"
                  : "bg-[#0b1329] border-2 border-cyan-500/60 text-slate-100 shadow-[0_0_60px_rgba(6,182,212,0.35)]"
              } rounded-none p-5 sm:p-6 max-w-lg w-full relative max-h-[90vh] overflow-y-auto`}>
                
                {/* Header Modal */}
                <div className={`flex items-center justify-between pb-3 mb-4 border-b ${
                  themeMode === "LIGHT_CONTRAST" ? "border-slate-300" : "border-slate-800"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-none border border-cyan-400/50 bg-cyan-500/10 flex items-center justify-center text-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                      <Settings className="w-5 h-5 text-cyan-500 animate-spin" style={{ animationDuration: "12s" }} />
                    </div>
                    <div>
                      <h3 className={`font-sans font-black text-sm sm:text-base tracking-wider uppercase ${
                        themeMode === "LIGHT_CONTRAST" ? "text-slate-900" : "text-white"
                      }`}>
                        PENGATURAN APLIKASI
                      </h3>
                      <p className={`text-[10px] font-mono uppercase tracking-wider ${
                        themeMode === "LIGHT_CONTRAST" ? "text-cyan-700 font-bold" : "text-cyan-300/70"
                      }`}>
                        JRZ SCORE DIGITAL SCORING TANDING (IPSI 2026)
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSettingsModal(false)}
                    className={`p-1.5 rounded-none transition-all cursor-pointer ${
                      themeMode === "LIGHT_CONTRAST" ? "hover:bg-slate-200 text-slate-600 hover:text-slate-900" : "hover:bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                    title="Tutup"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs">
                  {/* PILIHAN TEMA TAMPILAN: 1. MODE LED ARENA & 2. MODE WARNA PUTIH DAN BERKONTRAS TINGGI */}
                  <div className={`${
                    themeMode === "LIGHT_CONTRAST" ? "bg-slate-50 border-slate-300" : "bg-[#070e22] border-slate-800"
                  } border p-3 rounded-none space-y-2.5`}>
                    <div className="flex items-center justify-between">
                      <label className="text-[10.5px] font-mono font-bold uppercase text-amber-500 flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        PILIHAN TEMA TAMPILAN:
                      </label>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-none border ${
                        themeMode === "LIGHT_CONTRAST"
                          ? "bg-amber-500/20 text-amber-700 border-amber-500/50"
                          : "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                      }`}>
                        {themeMode === "LIGHT_CONTRAST" ? "MODE PUTIH AKTIF" : "MODE LED ARENA AKTIF"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Pilihan 1: Mode Led arena */}
                      <button
                        type="button"
                        onClick={() => {
                          playAppSound(650, 0.05);
                          handleSetTheme("LED_ARENA");
                        }}
                        className={`p-2.5 rounded-none border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          themeMode === "LED_ARENA"
                            ? "bg-gradient-to-br from-[#0c1c44] to-[#060e22] border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400/60"
                            : themeMode === "LIGHT_CONTRAST"
                              ? "bg-white border-slate-300 hover:border-slate-500 text-slate-700"
                              : "bg-[#09132c]/80 border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`font-sans font-black text-xs uppercase tracking-wider ${
                            themeMode === "LED_ARENA" ? "text-cyan-300" : themeMode === "LIGHT_CONTRAST" ? "text-slate-800" : "text-slate-300"
                          }`}>
                            1. Mode LED Arena
                          </span>
                          <Moon className={`w-4 h-4 ${themeMode === "LED_ARENA" ? "text-cyan-300" : "text-slate-400"}`} />
                        </div>
                        <span className={`text-[9px] leading-tight ${themeMode === "LIGHT_CONTRAST" ? "text-slate-600" : "text-slate-400"}`}>
                          Tema Gelap Cyber Arena dengan efek neon glow LED standar gelanggang malam hari.
                        </span>
                      </button>

                      {/* Pilihan 2: Mode tampilan warna putih dan berkontras tinggi */}
                      <button
                        type="button"
                        onClick={() => {
                          playAppSound(650, 0.05);
                          handleSetTheme("LIGHT_CONTRAST");
                        }}
                        className={`p-2.5 rounded-none border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          themeMode === "LIGHT_CONTRAST"
                            ? "bg-gradient-to-br from-white to-amber-50/50 border-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-2 ring-amber-500 text-slate-900"
                            : "bg-[#09132c]/80 border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`font-sans font-black text-xs uppercase tracking-wider ${
                            themeMode === "LIGHT_CONTRAST" ? "text-amber-700 font-black" : "text-slate-300"
                          }`}>
                            2. Mode Warna Putih & Kontras Tinggi
                          </span>
                          <Sun className={`w-4 h-4 ${themeMode === "LIGHT_CONTRAST" ? "text-amber-600" : "text-slate-400"}`} />
                        </div>
                        <span className={`text-[9px] leading-tight ${
                          themeMode === "LIGHT_CONTRAST" ? "text-slate-700" : "text-slate-400"
                        }`}>
                          Mode tampilan warna putih dan ber-kontras tinggi, disesuaikan pada tiap panel agar optimal dengan tema background putih.
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 1. GELANGGANG / ARENA SELECTION */}
                  <div className={`${
                    themeMode === "LIGHT_CONTRAST" ? "bg-slate-50 border-slate-300" : "bg-[#070e22] border-slate-800"
                  } border p-3 rounded-none space-y-2`}>
                    <label className="text-[10px] font-mono font-bold uppercase text-cyan-500 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-500" />
                      PILIHAN GELANGGANG AKTIF:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {["A", "B", "C", "D"].map((arenaKey) => (
                        <button
                          key={arenaKey}
                          onClick={() => {
                            playAppSound(600, 0.05);
                            setActiveArenaState(arenaKey);
                            rtdbScoringEngine.switchArena(arenaKey);
                            setActiveArena(arenaKey);
                          }}
                          className={`py-2 px-2.5 rounded-none font-black text-xs uppercase tracking-wider transition-all cursor-pointer border ${
                            activeArena === arenaKey
                              ? "bg-cyan-600 text-white border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-[1.02]"
                              : themeMode === "LIGHT_CONTRAST"
                                ? "bg-white text-slate-800 border-slate-300 hover:border-cyan-500"
                                : "bg-[#0b1633] text-slate-300 border-slate-700 hover:border-cyan-500 hover:text-white"
                          }`}
                        >
                          GEL. {arenaKey}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. DURASI STANDAR RONDE */}
                  <div className={`${
                    themeMode === "LIGHT_CONTRAST" ? "bg-slate-50 border-slate-300" : "bg-[#070e22] border-slate-800"
                  } border p-3 rounded-none space-y-2`}>
                    <label className="text-[10px] font-mono font-bold uppercase text-emerald-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      DURASI WAKTU TANDING (PER RONDE):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "1 MENIT (60s)", val: 60 },
                        { label: "1.5 MENIT (90s)", val: 90 },
                        { label: "2 MENIT (120s)", val: 120 }
                      ].map((d) => (
                        <button
                          key={d.val}
                          onClick={() => {
                            playAppSound(600, 0.05);
                            handleUpdateMetadata({
                              roundDuration: d.val,
                              timeLeft: matchState.status === MatchStatus.IDLE ? d.val : matchState.timeLeft
                            });
                          }}
                          className={`py-2 px-1.5 rounded-none font-bold text-[10px] sm:text-[10.5px] uppercase tracking-wider transition-all cursor-pointer border text-center ${
                            matchState.roundDuration === d.val
                              ? "bg-emerald-600 text-white border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                              : themeMode === "LIGHT_CONTRAST"
                                ? "bg-white text-slate-800 border-slate-300 hover:border-emerald-500"
                                : "bg-[#0b1633] text-slate-300 border-slate-700 hover:border-emerald-500 hover:text-white"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2B. KONFIGURASI LOGIKA ATURAN WMP (REMJA/DEWASA 30 POIN vs USIA DINI/PRA-REMAJA 20 POIN) */}
                  {(() => {
                    const currentWmpThreshold = offlineEngine.getWmpPointThreshold(matchState);
                    const isUsiaDiniMode = currentWmpThreshold === 20;
                    const applyWmpMode = (targetThreshold: 20 | 30) => {
                      playAppSound(650, 0.06);
                      const curDiv = (matchState.division || "").toUpperCase();
                      const nextDivision =
                        targetThreshold === 20
                          ? curDiv.includes("PRA")
                            ? "PRA-REMAJA"
                            : "USIA DINI"
                          : curDiv === "REMAJA"
                          ? "REMAJA"
                          : "DEWASA";
                      handleUpdateMetadata({
                        wmpThreshold: targetThreshold,
                        division: nextDivision
                      });
                    };

                    return (
                      <div className={`${
                        themeMode === "LIGHT_CONTRAST" ? "bg-slate-50 border-slate-300" : "bg-[#070e22] border-slate-800"
                      } border p-3 rounded-none space-y-2.5`} id="settings-wmp-rule-config">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-[10px] font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            LOGIKA ATURAN MENANG WMP (BABAK II & III • 60 DETIK):
                          </label>
                          <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-none border ${
                            isUsiaDiniMode
                              ? "bg-amber-500/20 text-amber-300 border-amber-400/60"
                              : "bg-cyan-500/20 text-cyan-300 border-cyan-400/60"
                          }`}>
                            BATAS: {currentWmpThreshold} POIN
                          </span>
                        </div>

                        {/* Dropdown Selector */}
                        <select
                          id="settings-wmp-threshold-select"
                          value={currentWmpThreshold}
                          onChange={(e) => applyWmpMode(Number(e.target.value) === 20 ? 20 : 30)}
                          className={`w-full px-2.5 py-2 text-xs font-sans font-black uppercase tracking-wider border focus:outline-none cursor-pointer ${
                            themeMode === "LIGHT_CONTRAST"
                              ? "bg-white border-slate-400 text-slate-900"
                              : "bg-[#030818] border-cyan-500/50 text-white"
                          }`}
                        >
                          <option value={30}>REMAJA / DEWASA — SELISIH 30 POIN (60 DETIK)</option>
                          <option value={20}>USIA DINI / PRA-REMAJA — SELISIH 20 POIN (60 DETIK)</option>
                        </select>

                        {/* Quick Toggle Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => applyWmpMode(30)}
                            className={`p-2 rounded-none border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                              !isUsiaDiniMode
                                ? "bg-gradient-to-br from-cyan-950 to-blue-950 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                                : themeMode === "LIGHT_CONTRAST"
                                  ? "bg-white border-slate-300 text-slate-700 hover:border-cyan-500"
                                  : "bg-[#0b1633] border-slate-700 text-slate-400 hover:border-cyan-500/60 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-sans font-black text-[10.5px] uppercase tracking-wider text-cyan-300">
                                Remaja / Dewasa
                              </span>
                              <span className="text-[9px] font-mono font-black px-1.5 py-0.5 bg-cyan-500/20 border border-cyan-400/50 text-cyan-200">
                                30 POIN
                              </span>
                            </div>
                            <span className="text-[8.5px] leading-tight text-slate-400">
                              Selisih ≥ 30 poin di Babak II/III selama 60 detik (Menang WMP).
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => applyWmpMode(20)}
                            className={`p-2 rounded-none border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                              isUsiaDiniMode
                                ? "bg-gradient-to-br from-amber-950 to-orange-950 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                                : themeMode === "LIGHT_CONTRAST"
                                  ? "bg-white border-slate-300 text-slate-700 hover:border-amber-500"
                                  : "bg-[#0b1633] border-slate-700 text-slate-400 hover:border-amber-500/60 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="font-sans font-black text-[10.5px] uppercase tracking-wider text-amber-300">
                                Usia Dini / Pra-Remaja
                              </span>
                              <span className="text-[9px] font-mono font-black px-1.5 py-0.5 bg-amber-500/20 border border-amber-400/50 text-amber-200">
                                20 POIN
                              </span>
                            </div>
                            <span className="text-[8.5px] leading-tight text-slate-400">
                              Selisih ≥ 20 poin di Babak II/III selama 60 detik (Menang WMP).
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. UJI SUARA & AUDIO ARENA */}
                  <div className={`${
                    themeMode === "LIGHT_CONTRAST" ? "bg-slate-50 border-slate-300" : "bg-[#070e22] border-slate-800"
                  } border p-3 rounded-none space-y-2`}>
                    <label className="text-[10px] font-mono font-bold uppercase text-amber-600 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                      UJI SUARA BELL & GONG ARENA:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => sound.playGong()}
                        className="py-2 px-3 rounded-none bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 text-amber-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                        TES GONG
                      </button>
                      <button
                        onClick={() => sound.playBuzzer()}
                        className="py-2 px-3 rounded-none bg-rose-950/80 hover:bg-rose-900 border border-rose-600/60 text-rose-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                        TES BUZZER
                      </button>
                    </div>
                  </div>

                  {/* 4. LAYAR PENUH (FULLSCREEN) */}
                  <div className={`${
                    themeMode === "LIGHT_CONTRAST" ? "bg-slate-50 border-slate-300" : "bg-[#070e22] border-slate-800"
                  } border p-3 rounded-none flex items-center justify-between`}>
                    <div>
                      <span className={`font-bold block text-xs uppercase tracking-wider ${
                        themeMode === "LIGHT_CONTRAST" ? "text-slate-800" : "text-slate-200"
                      }`}>
                        MODE LAYAR PENUH (FULLSCREEN)
                      </span>
                      <span className={`text-[10px] ${themeMode === "LIGHT_CONTRAST" ? "text-slate-500" : "text-slate-400"}`}>
                        Maksimalkan tampilan layar penuh
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        toggleFullscreen("LANDING");
                      }}
                      className="py-1.5 px-3 rounded-none bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-400/60 text-indigo-200 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      FULLSCREEN
                    </button>
                  </div>

                  {/* 5. RESET DATA PERTANDINGAN */}
                  <div className={`${
                    themeMode === "LIGHT_CONTRAST" ? "bg-slate-50 border-slate-300" : "bg-[#070e22] border-slate-800"
                  } border p-3 rounded-none flex items-center justify-between`}>
                    <div>
                      <span className="font-bold text-rose-600 block text-xs uppercase tracking-wider">
                        RESET PERTANDINGAN
                      </span>
                      <span className={`text-[10px] ${themeMode === "LIGHT_CONTRAST" ? "text-slate-500" : "text-slate-400"}`}>
                        Bersihkan seluruh data & persiapkan partai baru
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowResetConfirmModal(true);
                      }}
                      className="py-1.5 px-3 rounded-none bg-red-955/60 hover:bg-red-800 border border-red-600/60 text-red-200 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      RESET
                    </button>
                  </div>

                </div>

                {/* Footer Modal */}
                <div className={`mt-4 pt-3 border-t flex items-center justify-between ${
                  themeMode === "LIGHT_CONTRAST" ? "border-slate-300" : "border-slate-800"
                }`}>
                  <span className={`text-[9.5px] font-mono uppercase tracking-widest ${
                    themeMode === "LIGHT_CONTRAST" ? "text-slate-600" : "text-slate-400"
                  }`}>
                    IPSI 2026 STANDAR • v3.2.0
                  </span>
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className={`py-1.5 px-4 rounded-none font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      themeMode === "LIGHT_CONTRAST"
                        ? "bg-slate-900 hover:bg-slate-800 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-white"
                    }`}
                  >
                    TUTUP
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* FLOATING ACTION ICONS (CORNER BOTTOM-RIGHT) REMOVED PER USER REQUEST */}

        </div>
      )}

      {/* 2. DYNAMIC SINGLE CONTAINER RENDERINGS BASED ON SELECTED ROLE */}
      <React.Suspense fallback={<PanelLoadingFallback />}>
        {appMode !== "LANDING" && appMode !== "SIMULATOR" && (
          <div className={`flex-grow flex flex-col justify-center select-none ${
          nativeFs || isMonitorOnly || fullscreenMode || appMode.startsWith("JURY")
            ? "p-0 w-screen h-screen max-w-none overflow-hidden fixed inset-0 z-50" 
            : appMode === "DEWAN"
              ? "p-2 sm:p-4 w-full animate-fadeIn"
              : "p-4 max-w-7xl mx-auto w-full animate-fadeIn"
        }`}>
          
          {/* Render individual mode widgets with complete callbacks */}
          {appMode === "SCOREBOARD" && (
            <ScoreboardView2 
              state={matchState} 
              onBack={() => handleModeSwitch("LANDING")}
              isMonitorMode={isMonitorOnly}
            />
          )}

          {appMode === "DEWAN" && (
            <DewanPanel 
              state={matchState}
              onTimerCommand={handleTimerCommand}
              onRoundAction={handleRoundAction}
              onDewanAction={handleDewanAction}
              onUpdateMetadata={handleUpdateMetadata}
              onResetMatch={handleResetMatch}
              onStartVerification={handleStartVerification}
              onResetVerification={handleResetVerification}
              onApplyVerification={handleApplyVerification}
              onBack={() => handleModeSwitch("LANDING")}
              onToggleFullscreen={() => toggleFullscreen("DEWAN")}
              isFullscreen={fullscreenMode === "DEWAN"}
            />
          )}

          {appMode === "SEKRETARIS" && (
            <SekretarisPanel
              state={matchState}
              onUpdateMetadata={handleUpdateMetadata}
              onResetMatch={handleResetMatch}
              onTimerCommand={handleTimerCommand}
              onRoundAction={handleRoundAction}
              onDewanAction={handleDewanAction}
              onBack={() => handleModeSwitch("LANDING")}
              onToggleFullscreen={() => toggleFullscreen("SEKRETARIS")}
              isFullscreen={fullscreenMode === "SEKRETARIS"}
              onSubScreenChange={setIsSekretarisSubScreen}
              onOpenOperatorPanel={() => handleModeSwitch("OPERATOR")}
            />
          )}

          {(appMode === "JURY1" || appMode === "JURY2" || appMode === "JURY3") && (
            <JuryPanel 
              state={matchState} 
              onJuryPress={handleJuryPress} 
              onJuryVote={handleJuryVote} 
              defaultJuryId={
                appMode === "JURY1" ? 1 : appMode === "JURY2" ? 2 : 3
              } 
              onBack={() => handleModeSwitch("LANDING")}
              onToggleFullscreen={() => toggleFullscreen(appMode)}
              isFullscreen={fullscreenMode === appMode}
              hideJurySelector={true}
            />
          )}

          {appMode === "OPERATOR" && (
            <OperatorPanel
              matchState={matchState}
              onTimerCommand={handleTimerCommand}
              onRoundAction={handleRoundAction}
              onUpdateMetadata={handleUpdateMetadata}
              onResetMatch={handleResetMatch}
              onBack={() => handleModeSwitch("LANDING")}
              onToggleFullscreen={() => toggleFullscreen("OPERATOR")}
              isFullscreen={Boolean(fullscreenMode === "OPERATOR" || nativeFs)}
            />
          )}

          {appMode === "JADWAL" && (
            <SekretarisPanel
              initialTab="KONTROL"
              state={matchState}
              onUpdateMetadata={handleUpdateMetadata}
              onResetMatch={handleResetMatch}
              onTimerCommand={handleTimerCommand}
              onRoundAction={handleRoundAction}
              onDewanAction={handleDewanAction}
              onBack={() => handleModeSwitch("LANDING")}
              onToggleFullscreen={() => toggleFullscreen("SEKRETARIS")}
              isFullscreen={fullscreenMode === "SEKRETARIS"}
              onSubScreenChange={setIsSekretarisSubScreen}
              onOpenOperatorPanel={() => handleModeSwitch("OPERATOR")}
            />
          )}

          {appMode === "LOTING" && (
            <SekretarisPanel
              initialTab="LOTING"
              state={matchState}
              onUpdateMetadata={handleUpdateMetadata}
              onResetMatch={handleResetMatch}
              onTimerCommand={handleTimerCommand}
              onRoundAction={handleRoundAction}
              onDewanAction={handleDewanAction}
              onBack={() => handleModeSwitch("LANDING")}
              onToggleFullscreen={() => toggleFullscreen("SEKRETARIS")}
              isFullscreen={fullscreenMode === "SEKRETARIS"}
              onSubScreenChange={setIsSekretarisSubScreen}
              onOpenOperatorPanel={() => handleModeSwitch("OPERATOR")}
            />
          )}

          {appMode === "LAPORAN" && (
            <LaporanPanel
              currentMatchState={matchState}
              onBack={() => handleModeSwitch("LANDING")}
            />
          )}

          {appMode === "BRACKET" && (
            <SekretarisPanel
              initialTab="BAGAN"
              state={matchState}
              onUpdateMetadata={handleUpdateMetadata}
              onResetMatch={handleResetMatch}
              onTimerCommand={handleTimerCommand}
              onRoundAction={handleRoundAction}
              onDewanAction={handleDewanAction}
              onBack={() => handleModeSwitch("LANDING")}
              onToggleFullscreen={() => toggleFullscreen("SEKRETARIS")}
              isFullscreen={fullscreenMode === "SEKRETARIS"}
              onSubScreenChange={setIsSekretarisSubScreen}
              onOpenOperatorPanel={() => handleModeSwitch("OPERATOR")}
            />
          )}
        </div>
      )}

      {/* 3. SIMULATOR TERPADU VIEW (DEMO CONSOLE) */}
      {appMode === "SIMULATOR" && (
        <div className="flex-grow p-3 md:p-6 space-y-6 animate-fadeIn">
          
          {/* Top Mode Navigator within Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row justify-between items-center gap-4 shadow-xl">
            <div className="text-center lg:text-left">
              <h1 className="font-sans font-black text-lg md:text-xl text-white tracking-tight flex items-center justify-center lg:justify-start gap-2 uppercase">
                🏆 PENCAK SILAT SIMULATOR <span className="bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded text-[10px] font-black leading-none font-mono tracking-widest align-middle">IPSI-2026</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Mode demonstrasi pengoperasian seluruh panel perangkat silat standar regulasi Peraturan IPSI 2026 & PERSILAT di satu layar komputer.
              </p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-2">
              <button
                onClick={() => handleModeSwitch("LANDING")}
                className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold transition-all text-xs active:scale-95 cursor-pointer flex items-center gap-1"
                id="simulator-to-landing-btn"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-500" />
                <span>Landing Page</span>
              </button>
              
              <div className="w-[1.5px] h-6 bg-slate-800" />

              <span className="text-[10.5px] font-mono font-bold text-amber-500 uppercase tracking-wider block mr-1">Buka Panel:</span>
              <button onClick={() => handleModeSwitch("SCOREBOARD")} className="px-3 py-1.5 rounded-xl font-sans text-xs font-bold transition-all border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200">Layar Utama</button>
              <button onClick={() => handleModeSwitch("DEWAN")} className="px-3 py-1.5 rounded-xl font-sans text-xs font-bold transition-all border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200">Ketua/Dewan</button>
              <button onClick={() => handleModeSwitch("JURY1")} className="px-3 py-1.5 rounded-xl font-sans text-xs font-bold transition-all border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200">Juri 1</button>
            </div>

            <div className={`flex items-center gap-2 text-xs font-mono font-semibold px-3 py-1.5 rounded-xl border ${
              isSseActive 
                ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/30" 
                : "text-amber-400 bg-amber-950/40 border-amber-800/30 font-bold"
            }`}>
              <Wifi className={`w-3.5 h-3.5 ${isSseActive ? "animate-pulse" : ""}`} />
              <span>
                {isSseActive 
                  ? `REAL-TIME IPSI 2026 ⚡ (#${syncCount})` 
                  : `POLLING FAILSAFE 🔄 (#${syncCount})`}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Scoreboard arena */}
            <div>
              <div className="mb-2 pl-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-indigo-400">
                <Monitor className="w-4 h-4" /> PENONTON / SCREEN UTAMA ARENA (SCOREBOARD - ARENA LED)
              </div>
              <ScoreboardView2 state={matchState} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Dewan Panel */}
              <div className="lg:col-span-7">
                <div className="mb-2 pl-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-indigo-400">
                  <UserCheck className="w-4 h-4" /> PANEL ADMINISTRATOR / KETUA PERTANDINGAN
                </div>
                <DewanPanel 
                  state={matchState}
                  onTimerCommand={handleTimerCommand}
                  onRoundAction={handleRoundAction}
                  onDewanAction={handleDewanAction}
                  onUpdateMetadata={handleUpdateMetadata}
                  onResetMatch={handleResetMatch}
                  onStartVerification={handleStartVerification}
                  onResetVerification={handleResetVerification}
                  onApplyVerification={handleApplyVerification}
                />
              </div>

              {/* 3 Sim-Juries container */}
              <div className="lg:col-span-5 space-y-4">
                <div className="mb-2 pl-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-indigo-400">
                  <HelpCircle className="w-4 h-4" /> KONTROL DARING (DIPENCET BERSAMAAN UNTUK KONSENSUS)
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-950/25 border border-indigo-800/40 rounded-2xl text-xs text-indigo-300 leading-relaxed font-sans">
                    <span className="font-bold uppercase text-amber-400 block mb-1">💡 Uji Coba Aturan Konsensus IPSI 2026 & PERSILAT:</span>
                    1. Pastikan status pertandingan adalah <span className="font-bold bg-emerald-600 text-white px-1 rounded uppercase text-[9.5px]">TANDING (WALK)</span> dengan memencet **START** di panel Dewan.<br />
                    2. Coba klik tombol **TENDANGAN** Merah di **Juri 1**.<br />
                    3. Kemudian, dalam rentang waktu toleransi (max 2.0 detik), klik tombol **TENDANGAN** Merah di **Juri 2** atau **Juri 3**!<br />
                    4. Skor Sudut Merah akan langsung bertambah **+2** karena disetujui secara konsensus mayoritas (2 dari 3 juri), dan riwayat tercatat secara real-time!
                  </div>
                  
                  <div className="border border-slate-850 rounded-2xl overflow-hidden bg-slate-900/60 p-4 space-y-6">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800/50">Simulasi Gawai Juri 1</span>
                      <div className="mt-2 text-slate-100">
                        <JuryPanel state={matchState} onJuryPress={handleJuryPress} onJuryVote={handleJuryVote} defaultJuryId={1} hideJurySelector={true} />
                      </div>
                    </div>
                    <div className="border-t border-slate-800 pl-1" />
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800/50">Simulasi Gawai Juri 2</span>
                      <div className="mt-2 text-slate-100">
                        <JuryPanel state={matchState} onJuryPress={handleJuryPress} onJuryVote={handleJuryVote} defaultJuryId={2} hideJurySelector={true} disableKeyboardShortcuts={true} />
                      </div>
                    </div>
                    <div className="border-t border-slate-800 pl-1" />
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800/50">Simulasi Gawai Juri 3</span>
                      <div className="mt-2 text-slate-100">
                        <JuryPanel state={matchState} onJuryPress={handleJuryPress} onJuryVote={handleJuryVote} defaultJuryId={3} hideJurySelector={true} disableKeyboardShortcuts={true} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </React.Suspense>

      {/* GENERAL WEB INSTRUCTIONS ACCORDING TO USER'S LARAGON SETUP (SIMULATOR ONLY) */}
      {appMode === "SIMULATOR" && !fullscreenMode && (
        <footer className="py-4 md:py-6 px-6 bg-slate-900/45 border-t border-slate-850 flex flex-col md:flex-row justify-between items-center text-[10.5px] text-slate-500 font-mono gap-3 shrink-0">
          <div>
            <span>© 2026 IPSI DIGITAL PERATURAN TERBARU • LARAGON CONNECTED DESIGN</span>
          </div>
          <div className="flex items-center gap-3">
            <span>DIGITAL SCORING SYSTEM</span>
          </div>
        </footer>
      )}

      {/* FOOTER */}

      {/* DIALOG KONFIRMASI RESET DATA PERTANDINGAN: Reset semua, arsipkan data, batal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0a1128] border-2 border-rose-500/70 rounded-2xl p-6 shadow-[0_0_60px_rgba(244,63,94,0.35)] flex flex-col text-left">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowResetConfirmModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-500/60 flex items-center justify-center shadow-lg shadow-rose-950/50 shrink-0">
                <RotateCcw className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
                  PENGATURAN GELANGGANG
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-wide">
                  RESET DATA PERTANDINGAN
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Pilih tindakan reset data pertandingan. Seluruh skor, poin juri, hukuman, dan riwayat pertandingan akan dibersihkan untuk mempersiapkan aplikasi benar-benar bersih dari data pertandingan sebelumnya.
            </p>

            {/* 3 Opsi: Reset semua, arsipkan data, batal */}
            <div className="space-y-2.5">
              {/* OPSI 1: Reset semua */}
              <button
                type="button"
                onClick={() => handleCompleteReset(false)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-500 active:scale-98 text-white font-black text-xs uppercase tracking-wider flex items-center justify-between border border-rose-400/60 shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4 text-white group-hover:rotate-180 transition-transform duration-300" />
                  <div className="text-left">
                    <span className="block font-black text-xs">Reset semua</span>
                    <span className="block text-[10px] text-rose-200 font-normal font-sans">
                      Bersihkan seluruh data pertandingan langsung tanpa arsip
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-200" />
              </button>

              {/* OPSI 2: Arsipkan data */}
              <button
                type="button"
                onClick={() => handleCompleteReset(true)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 active:scale-98 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-between border border-amber-300/80 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Archive className="w-4 h-4 text-slate-950" />
                  <div className="text-left">
                    <span className="block font-black text-xs">Arsipkan data</span>
                    <span className="block text-[10px] text-slate-900 font-normal font-sans">
                      Simpan data partai ini ke riwayat arsip, lalu reset bersih
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-950" />
              </button>

              {/* OPSI 3: Batal */}
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Batal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. SISTEM LOGIN AKSES APLIKASI PERTAMA KALI / SETELAH APLIKASI DITUTUP (PASSWORD ONLY: 211096) */}
      <PasswordAuthModal
        type="APP_ACCESS"
        isOpen={!isAppAuthenticated}
        onSuccess={() => {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("jrz_app_authenticated", REQUIRED_SYSTEM_PASSWORD);
          }
          setIsAppAuthenticated(true);
        }}
      />

      {/* 2. SISTEM LOGIN VERIFIKASI SAAT AKAN MEMBUKA TIAP PANEL (PASSWORD ONLY: 211096) */}
      <PasswordAuthModal
        type="PANEL_ACCESS"
        panelName={pendingPanelMode ? getPanelDisplayName(pendingPanelMode) : "Panel"}
        isOpen={pendingPanelMode !== null}
        onSuccess={() => {
          const target = pendingPanelMode;
          setPendingPanelMode(null);
          if (target) {
            executeModeSwitch(target);
          }
        }}
        onCancel={() => {
          setPendingPanelMode(null);
        }}
      />
    </div>
  );
}
