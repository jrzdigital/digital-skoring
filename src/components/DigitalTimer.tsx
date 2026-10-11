import React, { useEffect, useState } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Minus, 
  Clock, 
  AlertCircle, 
  Volume2, 
  VolumeX 
} from "lucide-react";
import { MatchState, MatchStatus } from "../types";

interface DigitalTimerProps {
  state: MatchState;
  onTimerCommand?: (command: "START" | "PAUSE" | "ADD_10" | "SUB_10") => void;
  onResetMatch?: () => void;
  readOnly?: boolean;
  size?: "normal" | "large";
}

export function DigitalTimer({ state, onTimerCommand, onResetMatch, readOnly = false, size = "normal" }: DigitalTimerProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pulse, setPulse] = useState(false);

  // Trigger buzzer sound when timeLeft hits 0
  useEffect(() => {
    if (state.timeLeft === 0 && state.status === MatchStatus.PAUSED) {
      playBuzzerSound();
    }
    
    // Toggle pulse effect when running
    if (state.status === MatchStatus.RUNNING) {
      const interval = setInterval(() => {
        setPulse(p => !p);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setPulse(false);
    }
  }, [state.timeLeft, state.status]);

  // Synthesis of IPSI Ring Bell / Gong sound
  const playTone = (freq: number, duration: number, type: OscillatorType = "sine") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context block bypass
    }
  };

  const playBuzzerSound = () => {
    // Elegant dual-tone long buzzer (IPSI round end)
    playTone(320, 1.2, "sawtooth");
    setTimeout(() => playTone(300, 0.8, "sawtooth"), 150);
  };

  const handleStart = () => {
    playTone(587.33, 0.25); // D5 musical chime
    if (onTimerCommand) onTimerCommand("START");
  };

  const handlePause = () => {
    playTone(440, 0.2); // A4 clean pause tone
    if (onTimerCommand) onTimerCommand("PAUSE");
  };

  const handleAdjust = (command: "ADD_10" | "SUB_10") => {
    playTone(880, 0.08); // high tick chime
    if (onTimerCommand) onTimerCommand(command);
  };

  const formatMinutesAndSeconds = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return {
      minutesStr: minutes.toString().padStart(2, "0"),
      secondsStr: seconds.toString().padStart(2, "0")
    };
  };

  const { minutesStr, secondsStr } = formatMinutesAndSeconds(state.timeLeft);

  // Calculate percentage for progress dial/line
  const percentage = state.roundDuration > 0 
    ? (state.timeLeft / state.roundDuration) * 100 
    : 0;

  // Custom styling elements based on match state
  const isRunning = state.status === MatchStatus.RUNNING;
  const isFinished = state.timeLeft === 0 && state.status !== MatchStatus.RUNNING;

  if (readOnly) {
    return (
      <div 
        className="flex items-center justify-center w-full h-full select-none"
        id="digital-timer-component-root-readonly"
      >
        {/* LED Timer digits with responsive size to sit centered on all screens */}
        <div 
          className="font-digital select-none tracking-normal flex items-center justify-center gap-0.5 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.45)] text-[2.5rem] sm:text-[3rem] md:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem] leading-none"
          id="digital-timer-clockface-readonly"
        >
          <span>{minutesStr}</span>
          <span className={`transition-opacity duration-300 ${pulse ? "opacity-30" : "opacity-100"}`}>:</span>
          <span>{secondsStr}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${
        readOnly 
          ? "bg-transparent p-0" 
          : "bg-slate-950 p-5 border border-slate-800 rounded-2xl shadow-2xl"
      } flex flex-col items-center justify-between relative overflow-hidden w-full`}
      id="digital-timer-component-root"
    >
      {/* Background Matrix/Grid Styling for modern tech feel */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent opacity-40 pointer-events-none" />

      {/* TOP HEADER: REMOVED as requested */}

      {/* CENTER GLOWING LCD DISPLAYS */}
      <div className={`relative flex flex-col items-center justify-center bg-slate-950/90 border border-slate-900/80 rounded-xl w-full text-center shadow-inner z-10 ${
        size === "large" ? "my-2 py-6 px-5" : "my-1 py-2 px-3"
      }`}>
        
        {/* LED Timer digits */}
        <div 
          className={`font-digital select-none tracking-normal flex items-center justify-center gap-0.5 ${
            isRunning 
              ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]" 
              : isFinished 
              ? "text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse" 
              : "text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
          }`}
          style={{ fontSize: size === "large" ? "4.5rem" : "1.75rem", lineHeight: size === "large" ? "4.5rem" : "1.75rem" }}
          id="digital-timer-clockface"
        >
          <span>{minutesStr}</span>
          <span className={`transition-opacity duration-300 ${pulse ? "opacity-30" : "opacity-100"}`}>:</span>
          <span>{secondsStr}</span>
        </div>

        {/* Round active standard indicator */}
        <div className={size === "large" ? "mt-4 flex items-center justify-center" : "mt-1 flex items-center justify-center"}>
          <div className={
            size === "large"
              ? "bg-amber-500/15 border-2 border-amber-500/35 px-6 py-2 rounded-2xl text-amber-400 text-lg md:text-xl font-black font-sans uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse"
              : "bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full text-amber-400 text-[10px] font-extrabold font-sans"
          }>
            Babak {state.activeRound}
          </div>
        </div>
      </div>

      {/* TIMER PLAY/PAUSE/ADJUST CONTROLS */}
      {!readOnly && (
        <div className="w-full grid grid-cols-1 gap-3.5 mt-4 z-10 shrink-0">
          
          {/* Main large play/pause button */}
          <div className="flex items-center gap-2.5">
            {isRunning ? (
              <button
                onClick={handlePause}
                className="flex-grow bg-amber-50 border border-amber-300 text-slate-950 font-sans font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:bg-white active:scale-95 text-xs text-center shadow-[0_4px_12px_rgba(245,158,11,0.2)] cursor-pointer uppercase font-black"
                id="timer-control-btn-pause"
              >
                <Pause className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>JEDA (PAUSE)</span>
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={state.status === MatchStatus.FINISHED}
                className="flex-grow bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 text-slate-950 font-sans font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 text-xs text-center shadow-[0_4px_12px_rgba(0, 128, 0,0.25)] cursor-pointer uppercase font-black"
                id="timer-control-btn-start"
              >
                <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                <span>MULAI (START)</span>
              </button>
            )}
          </div>

          {/* Row of Time adjustments and Reset */}
          <div className="grid grid-cols-3 gap-2">
            
            <button 
              onClick={() => handleAdjust("SUB_10")}
              className="text-[10px] py-1.5 font-mono bg-slate-900 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-850 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
              title="Keluar 10 detik"
              id="timer-adjust-sub"
            >
              <Minus className="w-3 h-3 text-red-500" />
              <span>-10s</span>
            </button>
            
            <button 
              onClick={() => handleAdjust("ADD_10")}
              className="text-[10px] py-1.5 font-mono bg-slate-900 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-850 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
              title="Tambak 10 detik"
              id="timer-adjust-add"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>+10s</span>
            </button>

            <button
              onClick={() => {
                playTone(220, 0.4); // alarm warning tone
                if (confirm("🚨 SET ULANG PARTAI? Semua poin babak, pelanggaran & log tanding pada partai saat ini akan dibersihkan permanen!")) {
                  if (onResetMatch) onResetMatch();
                }
              }}
              className="text-[10px] py-1.5 font-mono bg-red-950/40 border border-red-900/30 text-red-400 hover:bg-red-950/80 hover:text-red-300 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
              title="Reset Partai"
              id="timer-reset-match-btn"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>

          </div>

        </div>
      )}

    </div>
  );
}
