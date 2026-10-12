/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { MatchState, MatchStatus } from "../types";
import { Award, ArrowLeft, Maximize2, Minimize2, Shield, CheckCircle2, Lock, Clock, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { sound } from "../utils/sound";

const defaultLogo = "/jrzscoreutama.png";

// Memoized SparklingStar Sub-component to prevent Math.random evaluations on every timer or score change
const SparklingStar = React.memo(({ sIdx }: { sIdx: number }) => {
  const style = useMemo(() => {
    const xStart = Math.random() * 80 + 10;
    const duration = Math.random() * 2 + 1.5;
    const delay = Math.random() * 1.5;
    const size = Math.random() * 6 + 3;
    return { xStart, duration, delay, size };
  }, [sIdx]);

  return (
    <motion.div
      initial={{ y: "110%", x: `${style.xStart}%`, opacity: 0, scale: 0 }}
      animate={{
        y: ["110%", "-10%"],
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 0.5, 0],
      }}
      transition={{
        duration: style.duration,
        repeat: Infinity,
        delay: style.delay,
        ease: "easeOut",
      }}
      className="absolute bg-amber-400 rounded-full"
      style={{
        width: style.size,
        height: style.size,
        filter: "drop-shadow(0 0 5px #fbbf24)",
      }}
    />
  );
});

// Memoized ConfettiPiece Sub-component to offload calculations from render loops
const ConfettiPiece = React.memo(({ sIdx }: { sIdx: number }) => {
  const style = useMemo(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 280 + 100;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance;
    const duration = Math.random() * 2 + 2;
    const delay = Math.random() * 1.5;
    const size = Math.random() * 12 + 5;
    const rotate = Math.random() * 720 - 360;
    const isStar = sIdx % 4 === 0;
    return { destX, destY, duration, delay, size, rotate, isStar };
  }, [sIdx]);

  return (
    <motion.div
      initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
      animate={{
        x: [0, style.destX],
        y: [0, style.destY],
        scale: [0, 1, 0.8, 0],
        opacity: [0, 1, 1, 0],
        rotate: [0, style.rotate],
      }}
      transition={{
        duration: style.duration,
        repeat: Infinity,
        delay: style.delay,
        ease: "easeOut",
      }}
      className="absolute flex items-center justify-center font-bold font-mono"
      style={{
        width: style.size,
        height: style.size,
        color: "#fbbf24",
        background: style.isStar ? "transparent" : sIdx % 3 === 0 
          ? "radial-gradient(circle, #fde047 0%, #ca8a04 100%)" 
          : "radial-gradient(circle, #ffffff 0%, #eab308 100%)",
        borderRadius: style.isStar ? "0%" : "50%",
        filter: "drop-shadow(0 0 8px rgba(250, 204, 21, 0.9))",
      }}
    >
      {style.isStar && "★"}
    </motion.div>
  );
});

// Memoized GlowingParticle Sub-component for performance-critical UI states
export const GlowingParticle = React.memo(({ color }: { color: "RED" | "BLUE" | "GRADIENT" }) => {
  const style = useMemo(() => {
    const colors = ["#a855f7", "#3b82f6", "#eab308"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return {
      width: `${Math.random() * 20 + 8}px`,
      height: `${Math.random() * 20 + 8}px`,
      top: `${Math.random() * 80 + 10}%`,
      left: `${Math.random() * 80 + 10}%`,
      backgroundColor: color === "GRADIENT" ? randomColor : (color === "RED" ? "#ef4444" : "#3b82f6"),
      animationDuration: `${Math.random() * 4 + 2}s`,
      animationDelay: `${Math.random() * 2}s`
    };
  }, [color]);

  return (
    <div 
      className="absolute rounded-full animate-ping" 
      style={{
        width: style.width,
        height: style.height,
        top: style.top,
        left: style.left,
        backgroundColor: style.backgroundColor,
        animationDuration: style.animationDuration,
        animationDelay: style.animationDelay
      }}
    />
  );
});

// High-Fidelity Animated digit score manager with dynamic glow & point flash effects
function PSTScoreGroup({ score, color, isNativeFullscreen }: { score: number; color: "BLUE" | "RED"; isNativeFullscreen?: boolean }) {
  const textColor = color === "BLUE" ? "text-[#2D7DFF]" : "text-[#FF2B45]";
  const prevScoreRef = useRef(score);
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
      }, 1200);

      prevScoreRef.current = score;
      return () => clearTimeout(timer);
    } else {
      prevScoreRef.current = score;
    }
  }, [score]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full z-10">
      {/* Dynamic Radial Ambient Light Flare Burst */}
      <AnimatePresence>
        {isGlowing && (
          <motion.div
            key={`flare-${animTrigger}`}
            initial={{ scale: 0.3, opacity: 0.95 }}
            animate={{ scale: [0.3, 1.5, 1.8], opacity: [0.95, 0.6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className={`absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full pointer-events-none filter blur-xl ${
              color === "BLUE"
                ? "bg-radial from-cyan-400 via-blue-600/70 to-transparent"
                : "bg-radial from-yellow-300 via-red-600/70 to-transparent"
            }`}
          />
        )}
      </AnimatePresence>

      {/* Shockwave expanding ring */}
      <AnimatePresence>
        {isGlowing && (
          <motion.div
            key={`shockwave-${animTrigger}`}
            initial={{ scale: 0.4, opacity: 0.9 }}
            animate={{ scale: 2.1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className={`absolute w-36 h-36 sm:w-48 sm:h-48 rounded-full pointer-events-none border-2 ${
              color === "BLUE"
                ? "border-cyan-300 shadow-[0_0_35px_rgba(56,189,248,0.9)]"
                : "border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.9)]"
            }`}
          />
        )}
      </AnimatePresence>

      {/* Floating Point Delta Popup Badge (+1, +2, +3) */}
      <AnimatePresence>
        {pointDelta !== null && (
          <motion.div
            key={`delta-${animTrigger}`}
            initial={{ opacity: 0, y: 15, scale: 0.5 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [-5, -45, -60],
              scale: [0.5, 1.25, 1, 0.9],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
            className={`absolute -top-4 sm:-top-6 font-sans font-black text-xl sm:text-2xl md:text-3xl tracking-wider pointer-events-none px-3.5 py-0.5 rounded-full z-30 flex items-center gap-1 ${
              color === "BLUE"
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.9)] border border-cyan-200"
                : "bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-[0_0_25px_rgba(245,158,11,0.9)] border border-amber-200"
            }`}
          >
            <span>+{pointDelta}</span>
            <span className="text-xs sm:text-sm font-sans font-bold uppercase tracking-normal opacity-90">PTS</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Digital Score Digit */}
      <motion.div
        key={`score-num-${score}`}
        initial={isGlowing ? { scale: 0.85 } : false}
        animate={{
          scale: isGlowing ? [1, 1.28, 0.94, 1.06, 1] : 1,
        }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className={`font-digital select-none tracking-normal leading-none transition-all duration-300 ${
          isNativeFullscreen
            ? "text-[4.5rem] sm:text-[5.5rem] md:text-[6.5rem] lg:text-[7.5rem] xl:text-[9rem]"
            : "text-[4.2rem] sm:text-[5.2rem] md:text-[6.2rem] lg:text-[7.2rem] xl:text-[8.5rem]"
        } ${textColor} z-10 flex items-center justify-center ${
          isGlowing
            ? color === "BLUE"
              ? "drop-shadow-[0_0_35px_rgba(45,125,255,1)] drop-shadow-[0_0_70px_rgba(56,189,248,0.9)] brightness-125"
              : "drop-shadow-[0_0_35px_rgba(255,43,69,1)] drop-shadow-[0_0_70px_rgba(251,191,36,0.9)] brightness-125"
            : color === "BLUE"
            ? "drop-shadow-[0_0_16px_rgba(45,125,255,0.45)]"
            : "drop-shadow-[0_0_16px_rgba(255,43,69,0.45)]"
        }`}
      >
        {score}
      </motion.div>
    </div>
  );
}

interface AutoFitTextProps {
  text: string;
  className?: string;
  maxFontSize?: number;
  minFontSize?: number;
}

const AutoFitText = React.memo(({ text, className, maxFontSize = 60, minFontSize = 10 }: AutoFitTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const adjustFontSize = () => {
      const container = containerRef.current;
      const textEl = textRef.current;
      if (!container || !textEl) return;

      // Start with max font size
      let currentSize = maxFontSize;
      textEl.style.fontSize = `${currentSize}px`;

      // Set maxAllowedWidth with some safe padding so text doesn't hit container boundary
      const maxAllowedWidth = container.clientWidth - 16;
      if (maxAllowedWidth <= 0) return;

      // Shrink font size dynamically until text fits container width
      while (textEl.offsetWidth > maxAllowedWidth && currentSize > minFontSize) {
        currentSize -= 0.5;
        textEl.style.fontSize = `${currentSize}px`;
      }
    };

    // Run adjustment immediately
    adjustFontSize();

    // Use ResizeObserver for reliable container resizing updates
    let frameId: number | null = null;
    const observer = new ResizeObserver(() => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        adjustFontSize();
      });
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [text, maxFontSize, minFontSize]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden whitespace-nowrap flex justify-center items-center">
      <h1 
        ref={textRef} 
        className={`${className} inline-block whitespace-nowrap leading-none`} 
        style={{ fontSize: `${maxFontSize}px` }}
      >
        {text}
      </h1>
    </div>
  );
});

interface ScoreboardViewProps {
  state: MatchState;
  onBack?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export function ScoreboardView({ state, onBack, onToggleFullscreen, isFullscreen }: ScoreboardViewProps) {
  const [controlsVisible, setControlsVisible] = useState(false);
  const [dismissUpcomingShow, setDismissUpcomingShow] = useState(false);
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

  // Automatically reset dismissal whenever a new match is loaded
  useEffect(() => {
    if (state?.id) {
      setDismissUpcomingShow(false);
    }
  }, [state?.id]);

  const [localVerificationResult, setLocalVerificationResult] = useState<any>(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(6);

  // Sync state verification results dynamically
  useEffect(() => {
    if (state.verification) {
      if (state.verification.active) {
        // Active verification resets any local countdown and completed states
        setShowResultOverlay(false);
        setLocalVerificationResult(null);
        setCountdownSeconds(6);
      } else if (state.verification.result) {
        // A complete result is available!
        setLocalVerificationResult(state.verification);
        setShowResultOverlay(true);
        setCountdownSeconds(6);

        // Countdown timer for visualization
        const interval = setInterval(() => {
          setCountdownSeconds((prev) => (prev > 1 ? prev - 1 : 1));
        }, 1000);

        // Close after 6 seconds to automatically return back to match monitor screen
        const timer = setTimeout(() => {
          setShowResultOverlay(false);
        }, 6000);

        return () => {
          clearInterval(interval);
          clearTimeout(timer);
        };
      }
    } else {
      // Sesi verifikasi reset
      setShowResultOverlay(false);
      setLocalVerificationResult(null);
      setCountdownSeconds(6);
    }
  }, [state.verification]);

  // Trigger floating controls on mouse movement or tap
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleActivity = () => {
      setControlsVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => {
        setControlsVisible(false);
      }, 3500);
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    handleActivity();

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      clearTimeout(timer);
    };
  }, []);

  const renderGoldSparkles = (active: boolean) => {
    if (!active || state.status === MatchStatus.FINISHED) return null;
    const isMatchRunningOrPaused = state.status === MatchStatus.RUNNING || state.status === MatchStatus.PAUSED;
    if (!isMatchRunningOrPaused) return null;

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[20px] z-0">
        <div className="absolute inset-0 border-[3px] border-amber-400 animate-pulse shadow-[0_0_25px_rgba(251,191,36,0.5)] rounded-[20px]" />
        {[...Array(12)].map((_, sIdx) => (
          <SparklingStar key={`sparkle-${sIdx}`} sIdx={sIdx} />
        ))}
      </div>
    );
  };

  const renderWinnerGoldConfetti = () => {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {[...Array(40)].map((_, sIdx) => (
          <ConfettiPiece key={`winner-confetti-${sIdx}`} sIdx={sIdx} />
        ))}
      </div>
    );
  };

  const getWinnerInfo = () => {
    const rawRedName = state.fighterRedName?.trim();
    const rawBlueName = state.fighterBlueName?.trim();
    const rawRedClub = state.fighterRedClub?.trim();
    const rawBlueClub = state.fighterBlueClub?.trim();

    const redName = rawRedName || "PESILAT MERAH";
    const blueName = rawBlueName || "PESILAT BIRU";
    const redClub = rawRedClub || "KONTINGEN MERAH";
    const blueClub = rawBlueClub || "KONTINGEN BIRU";

    if (state.redPenalties.disqualified) {
      return { color: "BLUE", name: blueName, club: blueClub, score: state.scoreBlue, opponentScore: state.scoreRed, method: "DISKUALIFIKASI LAWAN" };
    }
    if (state.bluePenalties.disqualified) {
      return { color: "RED", name: redName, club: redClub, score: state.scoreRed, opponentScore: state.scoreBlue, method: "DISKUALIFIKASI LAWAN" };
    }

    if (state.winnerColor) {
      const isRed = state.winnerColor === "RED";
      const method = state.winnerMethod || "KEPUTUSAN PANEL DEWAN";
      if (isRed) {
        return { color: "RED", name: redName, club: redClub, score: state.scoreRed, opponentScore: state.scoreBlue, method };
      } else {
        return { color: "BLUE", name: blueName, club: blueClub, score: state.scoreBlue, opponentScore: state.scoreRed, method };
      }
    }

    const victoryLog = state.logs?.find(l => l.description.includes("PEMENANG RESMI:"));
    if (victoryLog) {
      const isRed = (rawRedName && victoryLog.description.includes(rawRedName)) || victoryLog.fighter === "RED";
      const methodMatch = victoryLog.description.match(/\(([^)]+)\)/);
      const method = methodMatch ? methodMatch[1] : "KEPUTUSAN PANEL DEWAN";
      if (isRed) {
        return { color: "RED", name: redName, club: redClub, score: state.scoreRed, opponentScore: state.scoreBlue, method };
      } else {
        return { color: "BLUE", name: blueName, club: blueClub, score: state.scoreBlue, opponentScore: state.scoreRed, method };
      }
    }

    if (state.scoreRed > state.scoreBlue) {
      return { color: "RED", name: redName, club: redClub, score: state.scoreRed, opponentScore: state.scoreBlue, method: "KEUNGGULAN SKOR" };
    }
    if (state.scoreBlue > state.scoreRed) {
      return { color: "BLUE", name: blueName, club: blueClub, score: state.scoreBlue, opponentScore: state.scoreRed, method: "KEUNGGULAN SKOR" };
    }
    return null;
  };

  const winnerInfo = state.status === MatchStatus.FINISHED ? getWinnerInfo() : null;

  const blueIsLeading = state.scoreBlue > state.scoreRed;
  const redIsLeading = state.scoreRed > state.scoreBlue;

  // Extract variables for 100% accurate top header information
  const partaiNum = state.matchNumber ? (state.matchNumber.match(/\d+/) ? state.matchNumber.match(/\d+/)?.[0] : state.matchNumber).padStart(2, "0") : "01";
  const classLabel = state.classCategory ? state.classCategory.toUpperCase().replace("TANDING KELAS", "").replace("KELAS", "").trim() : "A (PUTRA)";
  const stageLabel = state.stage ? state.stage.toUpperCase() : "PENYISIHAN";
  const usiaLabel = state.classCategory && state.classCategory.toUpperCase().includes("REMAJA") ? "REMAJA" : "REMAJA";

  const minutesStr = Math.floor(state.timeLeft / 60).toString().padStart(2, "0");
  const secondsStr = (state.timeLeft % 60).toString().padStart(2, "0");

  return (
    <div 
      className={`bg-[#05010F] text-white select-none overflow-hidden flex flex-col justify-between relative ${
        isNativeFullscreen
          ? "fixed inset-0 z-40 w-screen h-screen p-3 md:p-4 rounded-none border-none shadow-none"
          : "w-full max-w-7xl mx-auto rounded-[24px] p-3.5 md:p-5 shadow-[0_0_50px_rgba(123,44,255,0.12)] border-2 border-indigo-950"
      }`} 
      id="scoreboard-root"
      style={{
        height: isNativeFullscreen ? "100vh" : "560px",
        maxHeight: isNativeFullscreen ? "100vh" : "calc(100vh - 140px)",
        minHeight: isNativeFullscreen ? "100vh" : "510px",
        backgroundImage: "radial-gradient(ellipse at center, rgba(30, 20, 60, 0.25) 0%, rgba(5, 1, 15, 0) 80%)"
      }}
    >
      {/* CSS STYLING FOR DYNAMIC ROTATING LEADER BORDERS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rotate-light-beam-gold {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shrink-timeline {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-shrink-timeline {
          animation: shrink-timeline 6s linear forwards;
        }
        .glowing-border-gold-active {
          position: relative;
          z-index: 1;
          overflow: hidden;
        }
        .glowing-border-gold-active::before {
          content: '';
          position: absolute;
          width: 300%;
          height: 300%;
          background: conic-gradient(from 0deg, transparent 30%, #fbbf24 40%, #fef08a 50%, #eab308 60%, transparent 70%);
          animation: rotate-light-beam-gold 4s linear infinite;
          top: -100%;
          left: -100%;
          z-index: -2;
          pointer-events: none;
        }
      `}} />



      {/* HEADER SECTION (100% ACCURATE TO THE SCREENSHOT) */}
      <header className="relative w-full text-center py-2 border-b border-[#110729] bg-[#05010F] select-none shrink-0 min-h-[80px] sm:min-h-[100px] md:min-h-[120px] flex flex-col justify-center">
        
        {/* Left corner logo: logomonitor1.png */}
        <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center justify-center py-1 pl-0">
          <img 
            src="/logomonitor1.png" 
            alt="Logo Kiri" 
            className="h-full w-auto object-contain drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // fallback if not uploaded yet
              e.currentTarget.style.opacity = '0.3';
            }}
          />
        </div>

        {/* Right corner logo: logomonitor2.png */}
        <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center justify-center py-1 pr-0">
          <img 
            src="/logomonitor2.png" 
            alt="Logo Kanan" 
            className="h-full w-auto object-contain drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // fallback if not uploaded yet
              e.currentTarget.style.opacity = '0.3';
            }}
          />
        </div>

        {/* Center texts */}
        <div className="px-24 sm:px-32 md:px-40 lg:px-48 xl:px-52 w-full">
          <h3 className="text-orange-500 font-sans uppercase font-extrabold text-[10px] sm:text-[11px] tracking-[0.3em]">
            IKATAN PENCAK SILAT INDONESIA
          </h3>
          
          <div className="mt-2 px-4 md:px-8 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            <AutoFitText 
              text={state.eventName || "PAKU BANTEN CHAMPIONSHIP"} 
              className="text-gradient-custom-title font-sans uppercase font-black tracking-widest"
              maxFontSize={60}
              minFontSize={12}
            />
          </div>

          <div className="flex justify-center items-center gap-1.5 mt-2 bg-[#05010F] text-xs sm:text-[13px] md:text-sm font-semibold text-[#a4a4fe] tracking-wide">
            <span className="opacity-80">Partai:</span> <span className="text-white font-extrabold mr-2">{partaiNum}</span>
            <span className="text-purple-900/60 font-bold">|</span>
            <span className="opacity-80">Kelas:</span> <span className="text-white font-extrabold mr-2">{classLabel}</span>
            <span className="text-purple-900/60 font-bold">|</span>
            <span className="opacity-80">Usia:</span> <span className="text-white font-extrabold mr-2">{usiaLabel}</span>
            <span className="text-purple-900/60 font-bold">|</span>
            <span className="opacity-80">Tahap:</span> <span className="text-white font-extrabold">{stageLabel}</span>
          </div>
        </div>
      </header>

      {/* 30-POINT GAP RULE ACTIVE WARNING BANNER */}
      {state.losingCornerColor && (state.losingCornerNoScoreDuration || 0) > 0 && (
        <div className="bg-gradient-to-r from-red-600/25 via-purple-600/35 to-blue-600/25 border-y border-purple-500/40 py-2.5 text-center relative overflow-hidden shrink-0 animate-pulse mt-3 rounded-xl">
          <div className="absolute inset-0 bg-purple-500/10 blur-md pointer-events-none" />
          <span className="text-[10px] md:text-xs font-sans font-black tracking-[0.12em] text-yellow-300 uppercase block px-4">
            ⚠️ SELISIH 30 POIN DI BABAK 2: JIKA SUDUT {state.losingCornerColor === "RED" ? "MERAH" : "BIRU"} TIDAK MENDAPAT NILAI DALAM {60 - (state.losingCornerNoScoreDuration || 0)} DETIK, MAKA SUDUT {state.losingCornerColor === "RED" ? "BIRU" : "MERAH"} MENANG MUTLAK!
          </span>
        </div>
      )}

      {/* CORE Scoreboard Divisions matching grid exactly */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 mt-4 flex-grow items-stretch min-h-0 select-none overflow-hidden">
        {/* LEFT COLUMN: BLUE CORNER (SUDUT BIRU) - col-span-4 */}
        <div className={`col-span-1 lg:col-span-4 flex flex-col justify-between border rounded-[20px] p-2.5 sm:p-3 relative overflow-hidden h-full min-h-0 transition-all duration-300 ${
          blueIsLeading && state.status !== MatchStatus.FINISHED && (state.status === MatchStatus.RUNNING || state.status === MatchStatus.PAUSED)
            ? "border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.35)] bg-[#0a051d]"
            : "border-[#1b1c55]/30 bg-[#060317]"
        }`}>
          
          {blueIsLeading && renderGoldSparkles(true)}
          
          {/* Faint watermarked background removed as requested */}

          <div className="flex items-center justify-between z-10 relative">
            <span className="text-[#2D7DFF] font-sans italic font-black text-2xl sm:text-3xl tracking-wider select-none uppercase drop-shadow-[0_0_12px_rgba(45,125,255,0.4)]">
              BIRU
            </span>
            {state.bluePenalties.disqualified && (
              <span className="px-2 py-0.5 rounded bg-red-600 text-white font-sans font-black text-xs uppercase animate-pulse">
                DISQ
              </span>
            )}
          </div>

          <div className="flex-grow flex items-center justify-center z-10 relative py-0.5 md:py-1">
            <PSTScoreGroup score={state.scoreBlue} color="BLUE" isNativeFullscreen={isNativeFullscreen} />
          </div>

          {/* Blue Athlete Details Banner */}
          <div className="w-full bg-[#0b40af] border border-blue-500/30 rounded-lg p-2 text-left shrink-0 z-10 shadow-lg">
            <div className="text-[16px] sm:text-[18px] md:text-xl font-black italic tracking-wide text-white uppercase truncate leading-none">
              {state.fighterBlueName || "BUDI RAHARJO"}
            </div>
            <div className="text-[10px] font-bold italic tracking-wider text-blue-200 uppercase mt-0.5 truncate">
              {state.fighterBlueClub || "JAWA BARAT"}
            </div>
          </div>

          {/* Penalties Grid row below Name banner */}
          <div className="w-full bg-[#0c051f]/50 border border-indigo-950/40 rounded-xl p-1.5 sm:p-2 mt-1.5 sm:mt-2 shrink-0 z-10">
            <div className="grid grid-cols-6 gap-1.5 w-full">
              {/* BINAAN 1 */}
              <div className={`h-8 sm:h-9 rounded-lg flex items-center justify-center border transition-all ${state.bluePenalties.binaan1 ? "bg-amber-400 border-white shadow-md scale-105" : "bg-neutral-900/10 border-neutral-850"}`}>
                <img src="/binaan1.png" alt="B1" className={`h-5 sm:h-6 object-contain ${state.bluePenalties.binaan1 ? "opacity-100" : "opacity-25 grayscale"}`} referrerPolicy="no-referrer" />
              </div>
              {/* BINAAN 2 */}
              <div className={`h-8 sm:h-9 rounded-lg flex items-center justify-center border transition-all ${state.bluePenalties.binaan2 ? "bg-amber-400 border-white shadow-md scale-105" : "bg-neutral-900/10 border-neutral-850"}`}>
                <img src="/binaan2.png" alt="B2" className={`h-5 sm:h-6 object-contain ${state.bluePenalties.binaan2 ? "opacity-100" : "opacity-25 grayscale"}`} referrerPolicy="no-referrer" />
              </div>
              {/* TEGURAN 1 */}
              <div className={`h-8 sm:h-9 rounded-lg flex items-center justify-center border transition-all ${state.bluePenalties.teguran1 ? "bg-orange-500 border-white shadow-md scale-105" : "bg-neutral-900/10 border-neutral-850"}`}>
                <img src="/teguran1.png" alt="T1" className={`h-5 sm:h-6 object-contain ${state.bluePenalties.teguran1 ? "opacity-100" : "opacity-25 grayscale"}`} referrerPolicy="no-referrer" />
              </div>
              {/* TEGURAN 2 */}
              <div className={`h-8 sm:h-9 rounded-lg flex items-center justify-center border transition-all ${state.bluePenalties.teguran2 ? "bg-orange-500 border-white shadow-md scale-105" : "bg-neutral-900/10 border-neutral-850"}`}>
                <img src="/teguran2.png" alt="T2" className={`h-5 sm:h-6 object-contain ${state.bluePenalties.teguran2 ? "opacity-100" : "opacity-25 grayscale"}`} referrerPolicy="no-referrer" />
              </div>
              {/* PERINGATAN 1 */}
              <div className={`h-8 sm:h-9 rounded-lg flex items-center justify-center border transition-all ${state.bluePenalties.peringatan1 ? "bg-red-700 border-white shadow-md scale-105" : "bg-neutral-900/10 border-neutral-850"}`}>
                <img src="/peringatan1.png" alt="P1" className={`h-5 sm:h-6 object-contain ${state.bluePenalties.peringatan1 ? "opacity-100" : "opacity-25 grayscale"}`} referrerPolicy="no-referrer" />
              </div>
              {/* PERINGATAN 2 */}
              <div className={`h-8 sm:h-9 rounded-lg flex items-center justify-center border transition-all ${state.bluePenalties.peringatan2 ? "bg-red-700 border-white shadow-md scale-105" : "bg-neutral-900/10 border-neutral-850"}`}>
                <img src="/peringatan2.png" alt="P2" className={`h-5 sm:h-6 object-contain ${state.bluePenalties.peringatan2 ? "opacity-100" : "opacity-25 grayscale"}`} referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>

          {/* Juries indicators: JURI 3, JURI 2, JURI 1 */}
          <div className="grid grid-cols-3 gap-1.5 mt-2 shrink-0 z-10 w-full mb-0.5">
            {[3, 2, 1].map((jNumber) => {
              const press = state?.activeJuryPresses?.[jNumber] || null;
              const isBluePunch = !!(press && press.fighter === "BLUE" && press.action === "PUNCH");
              const isBlueKick = !!(press && press.fighter === "BLUE" && press.action === "KICK");
              return (
                <div key={`monitor-bj-${jNumber}`} className="bg-[#0a0518]/60 border border-indigo-950/60 rounded-xl p-1 text-center flex flex-col justify-between items-center">
                  <p className="text-[8.5px] font-extrabold text-neutral-500 font-sans tracking-wide uppercase">JURI {jNumber}</p>
                  <div className="grid grid-cols-2 gap-1 mt-1 w-full">
                    <div 
                      className={`h-[34px] sm:h-[40px] rounded-lg flex items-center justify-center border font-sans font-black tracking-wider transition-all duration-150 ${
                        isBluePunch 
                          ? "bg-[#2D7DFF] border-white text-white scale-110 shadow-[0_0_14px_rgba(45,125,255,0.95)]" 
                          : "bg-neutral-855/10 border-neutral-850/80 text-neutral-500"
                      }`}
                    >
                      <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider select-none">
                        Puch
                      </span>
                    </div>
                    <div 
                      className={`h-[34px] sm:h-[40px] rounded-lg flex items-center justify-center border font-sans font-black tracking-wider transition-all duration-150 ${
                        isBlueKick 
                          ? "bg-[#2D7DFF] border-white text-white scale-110 shadow-[0_0_14px_rgba(45,125,255,0.95)]" 
                          : "bg-neutral-855/10 border-neutral-850/80 text-neutral-500"
                      }`}
                    >
                      <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider select-none">
                        Kick
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
        {/* CENTER COLUMN: TIMER & ROUND SELECTIONS - col-span-2 */}
        <div className="col-span-1 lg:col-span-2 flex flex-col justify-between items-center bg-[#070217]/50 border border-purple-950/40 rounded-[20px] p-2.5 sm:p-3 select-none relative overflow-hidden h-full min-h-0">
          
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.035] select-none bg-center bg-no-repeat bg-contain" 
            style={{ backgroundImage: "url('/jrzscorewatermak.png')", backgroundSize: "75%" }}
          />

          {/* Top Custom/Default Logo Icon - Positioned in the center of the top space */}
          <div className="z-10 w-full flex-1 flex items-center justify-center px-1">
            <img 
               src={state.logoLeft || defaultLogo} 
               alt="Logo Atas" 
               className="max-w-[110px] max-h-[75px] sm:max-h-[90px] object-contain filter brightness-110" 
               referrerPolicy="no-referrer"
            />
          </div>

          {/* Grouped Timer & Round List Centered Container */}
          <div className="flex-initial flex flex-col justify-center items-center w-full z-10 relative py-2">
            
            {/* Chronograph Clock */}
            <div className="w-full flex flex-col items-center justify-center text-center">
              <h4 className="text-[#a855f7] font-semibold text-[9px] md:text-xs tracking-[0.25em] font-sans">TIMER</h4>
              
              <div className={`font-digital select-none tracking-normal flex items-center justify-center gap-0.5 leading-none ${
                state.status === MatchStatus.RUNNING
                  ? "text-[#FFB800] drop-shadow-[0_0_20px_rgba(255,184,0,0.55)]" 
                  : state.timeLeft === 0 
                  ? "text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.55)] animate-pulse" 
                  : "text-[#FFB800] drop-shadow-[0_0_20px_rgba(255,184,0,0.4)]"
              } text-[28px] sm:text-4xl md:text-4xl lg:text-[50px] whitespace-nowrap flex-nowrap mt-0.5`}>
                <span>{minutesStr}</span>
                <span className={`${state.status === MatchStatus.RUNNING && (Math.floor(Date.now() / 1000) % 2 === 0) ? "opacity-30" : "opacity-100"}`}>:</span>
                <span>{secondsStr}</span>
              </div>

              <h4 className="text-neutral-400 font-semibold text-[9px] md:text-[10px] tracking-[0.2em] font-sans mt-2">BABAK AKTIF</h4>
            </div>

            {/* Vertical Round List exactly matching the active, upcoming, and finished capsule designs */}
            <div className="w-full select-none mt-2 flex flex-col items-center">
              <div className="flex flex-col gap-1.5 w-full max-w-[140px] mx-auto">
                {[1, 2, 3].map((rndIdx) => {
                  const isActive = rndIdx === state.activeRound;
                  const isUpcoming = rndIdx > state.activeRound;
                  const isFinished = rndIdx < state.activeRound;

                  let roundStyle = "";
                  if (isActive) {
                    roundStyle = "bg-gradient-to-r from-emerald-600 to-green-600 border border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)] font-black";
                  } else if (isUpcoming) {
                    roundStyle = "bg-red-950/65 border border-red-900/50 text-red-400 font-bold";
                  } else {
                    // isFinished
                    roundStyle = "bg-[#060310]/80 border border-purple-950/30 text-neutral-600 font-normal";
                  }

                  return (
                    <div 
                      key={`round-capsule-${rndIdx}`} 
                      className={`flex items-center justify-center py-1.5 px-3 rounded-lg font-sans font-extrabold text-[10px] uppercase tracking-wider transition-all duration-300 ${roundStyle}`}
                    >
                      BABAK {rndIdx}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Bottom Custom/Default Logo Icon - Positioned in the center of the bottom space */}
          <div className="z-10 w-full flex-1 flex items-center justify-center px-1">
            <img 
               src={state.logoRight || defaultLogo} 
               alt="Logo Bawah" 
               className="max-w-[110px] max-h-[75px] sm:max-h-[90px] object-contain filter brightness-110" 
               referrerPolicy="no-referrer"
            />
          </div>

        </div>

        {/* RIGHT COLUMN: RED CORNER (SUDUT MERAH) - col-span-4 */}
        <div className={`col-span-1 lg:col-span-4 flex flex-col justify-between border rounded-[20px] p-2.5 sm:p-3 relative overflow-hidden h-full min-h-0 transition-all duration-300 ${
          redIsLeading && state.status !== MatchStatus.FINISHED && (state.status === MatchStatus.RUNNING || state.status === MatchStatus.PAUSED)
            ? "border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.35)] bg-[#21050a]"
            : "border-[#551b1c]/30 bg-[#170308]"
        }`}>
          
          {redIsLeading && renderGoldSparkles(true)}
          
          {/* Faint watermarked background removed as requested */}

          <div className="flex items-center justify-between z-10 relative flex-row-reverse">
            <span className="text-[#FF2B45] font-sans italic font-black text-2xl sm:text-3xl tracking-wider select-none uppercase drop-shadow-[0_0_12px_rgba(255,43,69,0.4)]">
              MERAH
            </span>
            {state.redPenalties.disqualified && (
              <span className="px-2 py-0.5 rounded bg-red-600 text-white font-sans font-black text-xs uppercase animate-pulse font-bold font-bold">
                DISQ
              </span>
            )}
          </div>

          <div className="flex-grow flex items-center justify-center z-10 relative py-0.5 md:py-1">
            <PSTScoreGroup score={state.scoreRed} color="RED" isNativeFullscreen={isNativeFullscreen} />
          </div>

          {/* Red Athlete Details Banner */}
          <div className="w-full bg-[#a50f0f] border border-red-500/30 rounded-lg p-2 text-right shrink-0 z-10 shadow-lg">
            <div className="text-[16px] sm:text-[18px] md:text-xl font-black italic tracking-wide text-white uppercase truncate leading-none">
              {state.fighterRedName || "ALDI SETIAWAN"}
            </div>
            <div className="text-[10px] font-bold italic tracking-wider text-red-200 uppercase mt-0.5 truncate border-none">
              {state.fighterRedClub || "DKI JAKARTA"}
            </div>
          </div>

          {/* Penalties Grid row below Name banner */}
          <div className="w-full bg-[#1f050c]/50 border border-amber-950/30 rounded-xl p-1.5 sm:p-2 mt-1.5 sm:mt-2 shrink-0 z-10">
            <div className="grid grid-cols-6 gap-1.5 w-full">
              {/* BINAAN 1 */}
              <div className={`h-8 sm:h-9 rounded-lg flex items-center justify-center border transition-all ${state.redPenalties.binaan1 ? "bg-amber-400 border-white shadow-md scale-105" : "bg-neutral-900/10 border-neutral-850"}`}>
                <img src="/binaan1.png" alt="B1" className={`h-5 sm:h-6 object-contain ${state.redPenalties.binaan1 ? "opacity-100" : "opacity-25 grayscale"}`} referrerPolicy="no-referrer" />
              </div>
              {/* BINAAN 2 */}
              <div className={`h-8 sm:h-9 rounded-lg flex items-center justify-center border transition-all ${state.redPenalties.binaan2 ? "bg-amber-400 border-white shadow-md scale-105" : "bg-neutral-900/10 border-neutral-850"}`}>
                <img src="/binaan2.png" alt="B2" className={`h-5 sm:h-6 object-contain ${state.redPenalties.binaan2 ? "opacity-100" : "opacity-25 grayscale"}`} referrerPolicy="no-referrer" />
              </div>
              {/* TEGURAN 1 */}
              <div className={`h-8 sm:h-9 rounded-lg flex items-center justify-center border transition-all ${state.redPenalties.teguran1 ? "bg-orange-500 border-white shadow-md scale-105" : "bg-neutral-900/10 border-neutral-850"}`}>
                <img src="/teguran1.png" alt="T1" className={`h-5 sm:h-6 object-contain ${state.redPenalties.teguran1 ? "opacity-100" : "opacity-25 grayscale"}`} referrerPolicy="no-referrer" />
              </div>
              {/* TEGURAN 2 */}
              <div className={`h-8 sm:h-9 rounded-lg flex items-center justify-center border transition-all ${state.redPenalties.teguran2 ? "bg-orange-500 border-white shadow-md scale-105" : "bg-neutral-900/10 border-neutral-850"}`}>
                <img src="/teguran2.png" alt="T2" className={`h-5 sm:h-6 object-contain ${state.redPenalties.teguran2 ? "opacity-100" : "opacity-25 grayscale"}`} referrerPolicy="no-referrer" />
              </div>
              {/* PERINGATAN 1 */}
              <div className={`h-8 sm:h-9 rounded-lg flex items-center justify-center border transition-all ${state.redPenalties.peringatan1 ? "bg-red-700 border-white shadow-md scale-105" : "bg-neutral-900/10 border-neutral-850"}`}>
                <img src="/peringatan1.png" alt="P1" className={`h-5 sm:h-6 object-contain ${state.redPenalties.peringatan1 ? "opacity-100" : "opacity-25 grayscale"}`} referrerPolicy="no-referrer" />
              </div>
              {/* PERINGATAN 2 */}
              <div className={`h-8 sm:h-9 rounded-lg flex items-center justify-center border transition-all ${state.redPenalties.peringatan2 ? "bg-red-700 border-white shadow-md scale-105" : "bg-neutral-900/10 border-neutral-850"}`}>
                <img src="/peringatan2.png" alt="P2" className={`h-5 sm:h-6 object-contain ${state.redPenalties.peringatan2 ? "opacity-100" : "opacity-25 grayscale"}`} referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>

          {/* Juries indicators: JURI 1, JURI 2, JURI 3 (swapped nicely) */}
          <div className="grid grid-cols-3 gap-1.5 mt-2 shrink-0 z-10 w-full mb-0.5">
            {[1, 2, 3].map((jNumber) => {
              const press = state?.activeJuryPresses?.[jNumber] || null;
              const isRedPunch = !!(press && press.fighter === "RED" && press.action === "PUNCH");
              const isRedKick = !!(press && press.fighter === "RED" && press.action === "KICK");
              return (
                <div key={`monitor-rj-${jNumber}`} className="bg-[#120306]/60 border border-rose-955/40 rounded-xl p-1 text-center flex flex-col justify-between items-center">
                  <p className="text-[8.5px] font-extrabold text-neutral-500 font-sans tracking-wide uppercase">JURI {jNumber}</p>
                  <div className="grid grid-cols-2 gap-1 mt-1 w-full">
                    <div 
                      className={`h-[34px] sm:h-[40px] rounded-lg flex items-center justify-center border font-sans font-black tracking-wider transition-all duration-150 ${
                        isRedPunch 
                          ? "bg-[#FF2B45] border-white text-white scale-110 shadow-[0_0_14px_rgba(255,43,69,0.95)]" 
                          : "bg-neutral-855/10 border-neutral-850/80 text-neutral-500"
                      }`}
                    >
                      <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider select-none">
                        Puch
                      </span>
                    </div>
                    <div 
                      className={`h-[34px] sm:h-[40px] rounded-lg flex items-center justify-center border font-sans font-black tracking-wider transition-all duration-150 ${
                        isRedKick 
                          ? "bg-[#FF2B45] border-white text-white scale-110 shadow-[0_0_14px_rgba(255,43,69,0.95)]" 
                          : "bg-neutral-855/10 border-neutral-850/80 text-neutral-500"
                      }`}
                    >
                      <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider select-none">
                        Kick
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* RESTORE FLOATING BUTTON FOR UPCOMING INFO (IF DISMISSED DURING IDLE MODE) */}
      {state.status === MatchStatus.IDLE && dismissUpcomingShow && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 animate-pulse">
          <button 
            onClick={() => setDismissUpcomingShow(false)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-400 text-white font-sans font-black text-[11px] uppercase px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] transition duration-150 cursor-pointer select-none flex items-center gap-2 outline-none"
          >
            📋 TAMPILKAN KETERANGAN PARTAI SELANJUTNYA
          </button>
        </div>
      )}

      {/* UPCOMING MATCH (PARTAI SELANJUTNYA) POPUP MONITOR SCREEN */}
      <AnimatePresence>
        {state.status === MatchStatus.IDLE && !dismissUpcomingShow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#04010a]/98 backdrop-blur-xl flex flex-col justify-between items-center p-6 md:p-8 z-40 select-none overflow-hidden"
          >
            {/* Ambient Red/Blue/Purple Glow */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[150px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Header IPSI */}
            <header className="relative w-full text-center py-2 shrink-0 z-10 flex flex-col items-center justify-center min-h-[80px] sm:min-h-[100px] md:min-h-[120px]">
              {/* Left corner logo: logomonitor1.png */}
              <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center justify-center py-1 pl-0">
                <img 
                  src="/logomonitor1.png" 
                  alt="Logo Kiri" 
                  className="h-full w-auto object-contain drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.opacity = '0.3';
                  }}
                />
              </div>

              {/* Right corner logo: logomonitor2.png */}
              <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center justify-center py-1 pr-0">
                <img 
                  src="/logomonitor2.png" 
                  alt="Logo Kanan" 
                  className="h-full w-auto object-contain drop-shadow-[0_2px_14px_rgba(0,0,0,0.9)]"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.opacity = '0.3';
                  }}
                />
              </div>

              <div className="px-24 sm:px-32 md:px-40 w-full">
                <span className="text-orange-500 font-sans uppercase font-extrabold text-[10px] sm:text-[11px] tracking-[0.3em] block mb-1 animate-pulse">
                  IKATAN PENCAK SILAT INDONESIA
                </span>
                <div className="mt-1 drop-shadow-md">
                  <AutoFitText 
                    text={state.eventName || "PAKU BANTEN CHAMPIONSHIP"} 
                    className="text-gradient-custom-title font-sans uppercase font-black tracking-widest"
                    maxFontSize={48}
                    minFontSize={12}
                  />
                </div>
                <div className="h-[1px] w-48 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent mt-2 mx-auto" />
              </div>
            </header>

            {/* Main Presentation Body */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-11 gap-6 items-center my-auto z-10">
              
              {/* Left Wing: Blue Corner */}
              <motion.div
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 80, delay: 0.1 }}
                className="col-span-12 md:col-span-11 xl:col-span-5 bg-gradient-to-br from-blue-950/45 via-[#060317] to-[#04010f] border-2 border-blue-600/40 rounded-[28px] p-6 text-center shadow-[0_0_40px_rgba(45,125,255,0.15)] relative overflow-hidden"
              >
                {/* corner highlight */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500" />
                <span className="inline-block px-4 py-1 rounded-full bg-blue-600/40 text-[10px] font-black uppercase text-blue-400 tracking-widest border border-blue-500/20">
                  🔵 SUDUT BIRU / BLUE CORNER
                </span>
                
                <h2 className="text-3xl md:text-4xl xl:text-5xl font-sans font-black text-white uppercase tracking-tight mt-6 line-clamp-2 min-h-[90px] flex items-center justify-center select-text leading-tight drop-shadow-[0_2px_10px_rgba(45,125,255,0.25)]">
                  {state.fighterBlueName || "PESILAT BIRU"}
                </h2>

                <p className="text-sm md:text-base text-blue-300 font-bold tracking-wider mt-4 uppercase truncate">
                  {state.fighterBlueClub || "CONTINGENT BIRU"}
                </p>

                {/* decorative micro detail */}
                <div className="mt-6 flex justify-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30" />
                  <div className="w-8 h-1 rounded-full bg-blue-500/20" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30" />
                </div>
              </motion.div>

              {/* Central Divider: VS Emblem */}
              <div className="col-span-12 md:col-span-11 xl:col-span-1 flex flex-col items-center justify-center my-4 md:my-0">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 8, delay: 0.3 }}
                  className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-b from-amber-400 to-yellow-600 border-2 border-yellow-300 shadow-[0_0_30px_rgba(245,158,11,0.4)]"
                >
                  <span className="font-sans font-black text-2xl text-slate-950 italic leading-none select-none">
                    VS
                  </span>
                </motion.div>
                <div className="h-10 w-[2px] bg-gradient-to-b from-purple-500/40 to-transparent hidden xl:block mt-3" />
              </div>

              {/* Right Wing: Red Corner */}
              <motion.div
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 80, delay: 0.1 }}
                className="col-span-12 md:col-span-11 xl:col-span-5 bg-gradient-to-br from-red-950/45 via-[#170308] to-[#0f0105] border-2 border-red-600/40 rounded-[28px] p-6 text-center shadow-[0_0_40px_rgba(239,68,68,0.15)] relative overflow-hidden"
              >
                {/* corner highlight */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />
                <span className="inline-block px-4 py-1 rounded-full bg-red-650/40 text-[10px] font-black uppercase text-red-400 tracking-widest border border-red-500/20">
                  🔴 SUDUT MERAH / RED CORNER
                </span>

                <h2 className="text-3xl md:text-4xl xl:text-5xl font-sans font-black text-white uppercase tracking-tight mt-6 line-clamp-2 min-h-[90px] flex items-center justify-center select-text leading-tight drop-shadow-[0_2px_10px_rgba(239,68,68,0.25)]">
                  {state.fighterRedName || "PESILAT MERAH"}
                </h2>

                <p className="text-sm md:text-base text-red-300 font-bold tracking-wider mt-4 uppercase truncate">
                  {state.fighterRedClub || "CONTINGENT MERAH"}
                </p>

                {/* decorative micro detail */}
                <div className="mt-6 flex justify-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/30" />
                  <div className="w-8 h-1 rounded-full bg-red-500/20" />
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/30" />
                </div>
              </motion.div>

            </div>

            {/* Bottom Metadata & Status banner */}
            <div className="w-full flex flex-col items-center gap-4 shrink-0 mt-6 z-10 max-w-3xl">
              
              {/* Combined badge details block */}
              <div className="bg-[#110729]/80 border border-purple-500/20 rounded-2xl px-6 py-4 w-full flex flex-col sm:flex-row items-center justify-around gap-4 text-center sm:text-left">
                
                <div className="flex flex-col">
                  <span className="text-[9px] font-sans font-black uppercase tracking-wider text-purple-400">PARTAI UTAMA</span>
                  <strong className="text-[20px] font-sans font-black text-slate-100 uppercase tracking-tight">
                    PARTAI {partaiNum}
                  </strong>
                </div>

                <div className="h-6 w-[1.5px] bg-purple-950/80 hidden sm:block" />

                <div className="flex flex-col">
                  <span className="text-[9px] font-sans font-black uppercase tracking-wider text-purple-400">KELAS TANDING</span>
                  <strong className="text-[14px] font-sans font-black text-slate-200 uppercase tracking-tight truncate max-w-[280px]">
                    {classLabel}
                  </strong>
                </div>

                <div className="h-6 w-[1.5px] bg-purple-950/80 hidden sm:block" />

                <div className="flex flex-col">
                  <span className="text-[9px] font-sans font-black uppercase tracking-wider text-purple-400">BABAK PERTANDINGAN</span>
                  <strong className="text-[14px] font-sans font-black text-slate-200 uppercase tracking-tight">
                    {stageLabel}
                  </strong>
                </div>

              </div>

              {/* Status footer with custom pulse */}
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/25 px-5 py-2.5 rounded-full animate-bounce">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping inline-block" />
                <span className="text-[10px] text-yellow-300 font-sans font-black uppercase tracking-[0.15em] leading-none text-center">
                  SIAP BERKOMPETISI - MENUNGGU SIGNAL SEKRETARIS & DEWAN KETUA
                </span>
              </div>

              {/* Option to look at scoreboard in background if wanted */}
              <button
                onClick={() => setDismissUpcomingShow(true)}
                className="mt-2 text-[10px] font-sans font-black uppercase border-none bg-purple-950/30 hover:bg-purple-900/50 text-purple-300 hover:text-white px-4 py-2 rounded-xl transition duration-150 cursor-pointer flex items-center gap-1 select-none outline-none"
              >
                Tinjau Papan Skor (Scoreboard) ➡️
              </button>

            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* WINNER CHAMPION CELEBRATION POPUP SCREEN */}
      <AnimatePresence>
        {state.status === MatchStatus.FINISHED && state.winnerPublished && winnerInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#06010F]/95 backdrop-blur-md flex flex-col justify-center items-center p-6 z-50 text-center select-none overflow-hidden"
          >
            {/* Pulsing Outer Radial Glow */}
            <div className="absolute -inset-10 opacity-40 blur-[100px] rounded-full pointer-events-none transition-all duration-1000 bg-gradient-to-r from-purple-700 via-blue-600 to-yellow-500 animate-pulse" />

            {/* Glowing Particles Background Simulation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
              {[...Array(12)].map((_, i) => (
                <GlowingParticle key={i} color="GRADIENT" />
              ))}
            </div>

            {/* Main Celebratory Card Container */}
            <motion.div 
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 100 }}
              className="relative bg-[#0d0722]/95 border-2 rounded-[32px] p-8 max-w-2xl w-full flex flex-col items-center justify-between text-center overflow-hidden shadow-[0_0_60px_rgba(168,85,247,0.35)] border-purple-500/40"
            >
              {/* Corner Colors Banner */}
              <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-blue-600 via-purple-600 to-red-600" />

              {/* Glowing Victory Crest */}
              <div className="relative mt-2">
                <div className="absolute inset-0 bg-yellow-500/25 blur-xl rounded-full scale-150 animate-pulse" />
                <div className="relative bg-gradient-to-b from-amber-400 to-yellow-600 p-5 rounded-full border-2 border-yellow-300 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                  <Award className="w-12 h-12 text-slate-950 animate-bounce" />
                </div>
              </div>

              {/* Title Header */}
              <div className="mt-4 space-y-1">
                <span className="text-xs tracking-[0.2em] font-mono text-amber-400 font-extrabold uppercase animate-pulse">SELAMAT KEPADA PEMENANG!</span>
                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mt-1">
                  PERTANDINGAN SELESAI
                </h2>
                <div className="h-0.5 w-24 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mt-2" />
              </div>

              {/* Winner Information */}
              <div className="mt-6 flex flex-col items-center">
                <span className={`text-xs tracking-widest font-mono font-black uppercase px-4 py-1 rounded-full border ${
                  winnerInfo.color === "RED" 
                    ? "bg-red-950/50 text-red-400 border-red-500/30" 
                    : "bg-blue-950/50 text-blue-400 border-blue-500/30"
                }`}>
                  {winnerInfo.color === "RED" ? "🔴 SUDUT MERAH" : "🔵 SUDUT BIRU"}
                </span>
                
                <div className="relative mt-4 w-full flex justify-center">
                  {renderWinnerGoldConfetti()}
                  <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 uppercase tracking-tight text-center line-clamp-2 max-w-lg leading-tight select-text drop-shadow-[0_4px_20px_rgba(245,158,11,0.45)] pb-1 z-10">
                    {winnerInfo.name}
                  </h1>
                </div>
                
                <p className="text-sm md:text-base text-slate-400 uppercase tracking-widest font-semibold mt-1">
                  {winnerInfo.club}
                </p>
              </div>

              {/* Comparison Stats & Scores: Blue on Left, Red on Right */}
              <div className="mt-7 w-full max-w-lg bg-[#05010f]/85 rounded-2xl border border-slate-800/80 p-4 grid grid-cols-3 gap-3 items-center">
                {/* SUDUT BIRU (KIRI) */}
                <div className="text-center bg-blue-950/25 border border-blue-500/20 p-2.5 rounded-xl flex flex-col items-center justify-center shadow-sm">
                  <p className="text-[9px] font-mono text-blue-400 uppercase font-black tracking-wide leading-none mb-1">BLUE CORNER</p>
                  <strong className={`text-2xl font-mono leading-none ${winnerInfo.color === "BLUE" ? "text-blue-500 font-black" : "text-slate-400 font-bold"}`}>
                    {winnerInfo.color === "BLUE" ? winnerInfo.score : winnerInfo.opponentScore}
                  </strong>
                  <span className="text-[8px] text-blue-300/80 font-sans font-extrabold uppercase tracking-wide truncate max-w-[120px] mt-1.5 block">
                    {state.fighterBlueName || "SUDUT BIRU"}
                  </span>
                </div>

                {/* METHOD (TENGAH) */}
                <div className="text-center font-mono border-x border-slate-800/80 px-2 flex flex-col items-center justify-center">
                  <span className="text-[8px] text-amber-500 font-mono font-bold block leading-none">METHOD</span>
                  <span className="text-[10px] font-black text-white block mt-1.5 tracking-wider leading-none uppercase truncate max-w-[95px]">{winnerInfo.method}</span>
                </div>

                {/* SUDUT MERAH (KANAN) */}
                <div className="text-center bg-red-950/25 border border-red-500/20 p-2.5 rounded-xl flex flex-col items-center justify-center shadow-sm">
                  <p className="text-[9px] font-mono text-red-500 uppercase font-black tracking-wide leading-none mb-1">RED CORNER</p>
                  <strong className={`text-2xl font-mono leading-none ${winnerInfo.color === "RED" ? "text-red-500 font-black" : "text-slate-400 font-bold"}`}>
                    {winnerInfo.color === "RED" ? winnerInfo.score : winnerInfo.opponentScore}
                  </strong>
                  <span className="text-[8px] text-red-300/80 font-sans font-extrabold uppercase tracking-wide truncate max-w-[120px] mt-1.5 block">
                    {state.fighterRedName || "SUDUT MERAH"}
                  </span>
                </div>
              </div>

              {/* Footer text */}
              <div className="mt-5 text-[8.5px] font-mono text-slate-500 uppercase tracking-wider">
                PANEL RECORD SINKRONISASI IPSI UTAMA • 3 BABAK RESMI DISKUALIFIKASI AMAN
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. ACTIVE REAL-TIME VERIFICATION MONITOR MONITORING OVERLAY */}
      <AnimatePresence>
        {state.verification && state.verification.active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/98 backdrop-blur-xl flex flex-col justify-center items-center p-6 z-50 text-center animate-fade-in font-sans overflow-hidden"
          >
            {/* Ambient Animated Purple, Blue, and Yellow Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600/15 blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/15 blur-[120px] pointer-events-none translate-x-1/2 translate-y-1/2 animate-pulse [animation-delay:1s]" />
            <div className="absolute top-1/2 left-1/2 w-80 h-80 rounded-full bg-yellow-500/10 blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-pulse [animation-delay:2s]" />

            {/* Glowing High-Definition Gradient Border strips */}
            <div className="absolute top-0 inset-x-0 h-[6px] bg-gradient-to-r from-purple-600 via-blue-500 to-yellow-400" />
            <div className="absolute bottom-0 inset-x-0 h-[6px] bg-gradient-to-r from-yellow-400 via-blue-500 to-purple-600" />
            <div className="absolute left-0 inset-y-0 w-[6px] bg-gradient-to-b from-purple-600 via-blue-500 to-yellow-400" />
            <div className="absolute right-0 inset-y-0 w-[6px] bg-gradient-to-b from-purple-600 via-blue-500 to-yellow-400" />

            <div className="w-full max-w-2xl bg-gradient-to-br from-[#0a0a20]/95 via-[#0c0926]/95 to-[#1c1209]/95 border-2 border-purple-500/35 rounded-[32px] p-8 md:p-10 shadow-[0_0_50px_rgba(168,85,247,0.4)] flex flex-col items-center gap-5 relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-600 via-blue-500 to-yellow-400" />

              {/* Glowing Shield Ring */}
              <div className="text-white animate-[bounce_2.2s_infinite] bg-gradient-to-r from-purple-600 via-blue-500 to-yellow-400 p-4 rounded-full border border-white/20 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                <Shield className="w-16 h-16" />
              </div>

              <div className="flex flex-col gap-1 items-center">
                <span className="text-[11px] font-mono font-black tracking-[0.4em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-yellow-400 uppercase">
                  SISTEM REPLIKA JUDICIAL
                </span>
                <h1 className="text-2xl md:text-4xl font-sans font-black text-white uppercase tracking-wider leading-none">
                  PROSES VERIFIKASI DEWAN
                </h1>
              </div>

              <div className="text-xs font-mono font-bold uppercase tracking-widest text-yellow-300 bg-gradient-to-r from-purple-950/80 via-blue-950/80 to-yellow-950/85 border border-purple-500/30 rounded-full px-5 py-2 shadow-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping inline-block" />
                KATEGORI: {state.verification.type}
              </div>

              <p className="text-sm md:text-base font-semibold max-w-xl text-slate-300 leading-relaxed opacity-95">
                Sesi verifikasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-yellow-400 font-bold">{state.verification.type}</span> sedang aktif. Menunggu masukan keputusan real-time dari Juri 1, Juri 2, dan Juri 3.
              </p>

              {/* Juries Real-Time Grid */}
              <div className="w-full mt-2 p-5 bg-slate-955/90 border border-slate-900 rounded-2xl shadow-inner relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-purple-500 via-blue-500 to-yellow-400 opacity-50" />
                
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900/60">
                  <div className="flex items-center gap-1.5 text-xs tracking-widest uppercase font-mono text-purple-300 font-black">
                    <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                    MONITORING SINYAL JURI
                  </div>
                  <span className="text-[9px] font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-yellow-400 animate-pulse bg-purple-500/10 px-2 py-0.5 rounded">
                    LIVE RECEPTIVE
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 my-2 font-mono">
                  {[1, 2, 3].map((jId) => {
                    const jVote = state.verification?.votes?.[jId];
                    const hasVoted = !!jVote;
                    return (
                      <div 
                        key={`public-vj-${jId}`} 
                        className={`relative rounded-xl p-4 flex flex-col items-center justify-center border-2 transition-all duration-300 ${
                          hasVoted 
                            ? "bg-purple-950/20 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)] scale-102"
                            : "bg-slate-950 border-slate-905 animate-pulse"
                        }`}
                      >
                        <span className="text-xs text-slate-400 font-bold">JURI {jId}</span>
                        
                        <div className="h-10 flex items-center justify-center mt-3 w-full">
                          {hasVoted ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] font-mono font-bold text-purple-300 uppercase tracking-widest font-black animate-pulse flex items-center gap-1">
                                <Lock className="w-3 h-3 text-purple-400" /> SUARA MASUK
                              </span>
                              <span className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">DECISION BLOCKED</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[9px] font-mono font-extrabold text-amber-500 uppercase tracking-widest animate-pulse">Waiting...</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[10px] font-mono text-slate-400 mt-2">
                  Antisipasi: <span className="font-bold text-white">{Object.values(state.verification?.votes || {}).filter(v => v !== null).length} / 3</span> juri telah mengirimkan sinyal suara
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. VERIFICATION COMPLETED OVERLAY NOTIFICATION */}
      <AnimatePresence>
        {showResultOverlay && localVerificationResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/98 backdrop-blur-xl flex flex-col justify-center items-center p-6 z-50 text-center animate-fade-in font-sans overflow-hidden"
          >
            {/* Ambient Animated Background Glows depending on final outcome */}
            {localVerificationResult.result === "MERAH" && (
              <>
                <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full bg-red-650/15 blur-[130px] pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                <div className="absolute inset-0 border-4 border-red-500/60 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.25)] pointer-events-none" />
              </>
            )}
            {localVerificationResult.result === "BIRU" && (
              <>
                <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full bg-blue-650/15 blur-[130px] pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                <div className="absolute inset-0 border-4 border-blue-500/60 animate-pulse shadow-[0_0_30px_rgba(59,130,246,0.25)] pointer-events-none" />
              </>
            )}
            {localVerificationResult.result === "TIDAK SAH" && (
              <>
                <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full bg-slate-600/10 blur-[130px] pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                <div className="absolute inset-0 border-4 border-slate-700/60 animate-pulse shadow-[0_0_20px_rgba(100,116,139,0.15)] pointer-events-none" />
              </>
            )}

            <div className="w-full max-w-2xl bg-gradient-to-br from-[#050212]/98 via-[#0b0821]/98 to-[#130707]/98 border-2 border-slate-800/80 rounded-[32px] p-8 md:p-10 shadow-2xl flex flex-col items-center gap-5 relative overflow-hidden backdrop-blur-md">
              {/* Glowing High-Definition Gradient Bar at top */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-600 via-blue-500 to-yellow-400" />

              {/* Large check circle */}
              <div className="text-emerald-400 bg-emerald-500/10 p-4 rounded-full border border-emerald-500/25 shadow-[0_0_20px_rgba(10,185,129,0.2)]">
                <CheckCircle2 className="w-16 h-16" />
              </div>

              <div className="flex flex-col gap-1 items-center">
                <span className="text-[11px] font-mono tracking-[0.3em] uppercase text-slate-400 font-extrabold">
                  KEPUTUSAN PANEL VERIFIKASI SELESAI
                </span>
                <h1 className="text-2xl md:text-3xl font-sans font-black text-white uppercase tracking-wider leading-none">
                  HASIL RESMI DEWAN
                </h1>
              </div>

              <p className="text-xs font-semibold text-amber-200 mt-1 uppercase tracking-wider">
                Kejadian Diproses: <span className="underline font-bold text-white tracking-widest">{localVerificationResult.type}</span>
              </p>

              {/* Big, beautiful decision banner */}
              <div className={`w-full py-5 px-6 rounded-2xl border-2 text-center shadow-lg transition-all duration-300 mt-2 ${
                localVerificationResult.result === "MERAH"
                  ? "bg-gradient-to-r from-red-950/60 to-red-900/40 border-red-500 text-red-500 shadow-[0_0_25px_rgba(239,68,68,0.3)]"
                  : localVerificationResult.result === "BIRU"
                    ? "bg-gradient-to-r from-blue-950/60 to-blue-900/40 border-blue-500 text-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.3)]"
                    : "bg-gradient-to-r from-slate-900 to-slate-850/80 border-slate-700 text-slate-400"
              }`}>
                {localVerificationResult.result === "TIDAK SAH" ? (
                  <span className="text-2xl md:text-3xl font-black tracking-widest block font-sans uppercase">
                    🚫 TIDAK SAH (BATAL)
                  </span>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="text-2xl md:text-3xl font-black tracking-wider block font-sans uppercase">
                      ✅ {localVerificationResult.type} SAH
                    </span>
                    <span className="text-lg md:text-xl font-bold tracking-widest block italic uppercase mt-1">
                      KEMENANGAN: {localVerificationResult.result === "MERAH" ? "SUDUT MERAH" : "SUDUT BIRU"}
                    </span>
                  </div>
                )}
              </div>

              {/* Juries Votes Details Tally Receipt */}
              <div className="w-full mt-2 p-5 bg-slate-950 border border-slate-900 rounded-2xl">
                <div className="text-[10px] tracking-widest uppercase font-mono text-slate-400 block font-bold mb-3">RECIPROCAL JURIES DECISION RECEIPTS</div>
                
                <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                  {[1, 2, 3].map((jId) => {
                    const voteColor = localVerificationResult.votes?.[jId];
                    return (
                      <div key={`pub-receipt-${jId}`} className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col items-center">
                        <span className="text-[10px] text-slate-500 font-bold mb-2">JURI {jId}</span>
                        <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded w-full text-center ${
                          voteColor === "MERAH" 
                            ? "bg-red-650/40 text-red-500 border border-red-500/30" 
                            : voteColor === "BIRU" 
                              ? "bg-blue-650/40 text-blue-500 border border-blue-500/30" 
                              : "bg-slate-850 text-slate-350 border border-slate-700/60"
                        }`}>
                          {voteColor === "TIDAK SAH" ? "BATAL" : voteColor}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Beautiful, professional auto-return countdown with progressive shrinking timeline bar */}
              <div className="w-full mt-4 flex flex-col gap-1.5 items-center relative overflow-hidden p-2">
                <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">
                  <Clock className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                  KEMBALI KE MONITOR PERTANDINGAN DALAM <span className="text-yellow-400 font-black text-xs px-1">{countdownSeconds}</span> DETIK
                </div>
                <div className="w-full h-1 bg-slate-900 rounded-full relative overflow-hidden mt-1">
                  <div className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-yellow-400 animate-shrink-timeline" />
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
