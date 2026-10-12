import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Play, 
  Pause, 
  Flame, 
  CheckCircle2, 
  Keyboard, 
  Volume2, 
  Zap, 
  Sparkles,
  Sliders
} from 'lucide-react';
import { CornerColor, TandingMatchState } from '../types/scoring';
import { soundManager } from '../utils/audio';

interface AutoScoringAssistantProps {
  match: TandingMatchState;
  onAutoScoreAction: (corner: CornerColor, actionType: 'pukulan' | 'tendangan' | 'jatuhan', judgesConfirmed: number[]) => void;
  onPenaltyAction: (corner: CornerColor, penaltyType: 'teguran1' | 'teguran2' | 'peringatan1') => void;
  onToggleTimer: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AutoScoringAssistant: React.FC<AutoScoringAssistantProps> = ({
  match,
  onAutoScoreAction,
  onPenaltyAction,
  onToggleTimer,
  isOpen,
  onClose,
}) => {
  // Automated Referee AI Bot state
  const [isBotActive, setIsBotActive] = useState(false);
  const [combatIntensity, setCombatIntensity] = useState<'santai' | 'normal' | 'intensif'>('normal');
  const [bias, setBias] = useState<'imbang' | 'merah' | 'biru'>('imbang');
  const [autoConsensusDelay, setAutoConsensusDelay] = useState<number>(300); // ms delay between judges
  const [showHotkeys, setShowHotkeys] = useState(false);
  
  const botTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-Pilot fight simulation engine
  useEffect(() => {
    if (!isBotActive || !match.isTimerRunning || match.status !== 'berlangsung') {
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current);
        botTimerRef.current = null;
      }
      return;
    }

    const intervalBase = combatIntensity === 'intensif' ? 5000 : combatIntensity === 'normal' ? 9000 : 15000;
    // Add jitter
    const randomJitter = (Math.random() - 0.5) * 4000;
    const nextInterval = Math.max(3000, intervalBase + randomJitter);

    botTimerRef.current = setTimeout(() => {
      // Determine corner
      let corner: CornerColor = Math.random() > 0.5 ? 'merah' : 'biru';
      if (bias === 'merah') {
        corner = Math.random() > 0.3 ? 'merah' : 'biru';
      } else if (bias === 'biru') {
        corner = Math.random() > 0.3 ? 'biru' : 'merah';
      }

      // Determine attack action based on realistic Pencak Silat frequencies
      // Pukulan 55%, Tendangan 35%, Jatuhan 10%
      const rand = Math.random();
      let action: 'pukulan' | 'tendangan' | 'jatuhan' = 'pukulan';
      if (rand > 0.90) {
        action = 'jatuhan';
      } else if (rand > 0.55) {
        action = 'tendangan';
      }

      // Pick 2 or 3 concurring judges
      const judges = match.judgeCount === 5 
        ? [1, 2, 4] 
        : [1, 2];

      onAutoScoreAction(corner, action, judges);
    }, nextInterval);

    return () => {
      if (botTimerRef.current) {
        clearTimeout(botTimerRef.current);
      }
    };
  }, [isBotActive, match.isTimerRunning, match.status, combatIntensity, bias, match.judgeCount, onAutoScoreAction]);

  // Global hotkeys listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if inside an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      // Timer Spacebar
      if (e.code === 'Space') {
        e.preventDefault();
        onToggleTimer();
        return;
      }

      // Gong 'g'
      if (key === 'g') {
        soundManager.playGong();
        return;
      }
      // Whistle 'h'
      if (key === 'h') {
        soundManager.playWhistle();
        return;
      }

      // SUDUT MERAH HOTKEYS
      if (key === 'q') {
        // Pukulan Merah
        onAutoScoreAction('merah', 'pukulan', [1, 2, 3]);
      } else if (key === 'w') {
        // Tendangan Merah
        onAutoScoreAction('merah', 'tendangan', [1, 2, 3]);
      } else if (key === 'e') {
        // Jatuhan Merah
        onAutoScoreAction('merah', 'jatuhan', [1, 2, 3]);
      } else if (key === 'r') {
        // Teguran Merah
        onPenaltyAction('merah', 'teguran1');
      }

      // SUDUT BIRU HOTKEYS
      if (key === 'u') {
        // Pukulan Biru
        onAutoScoreAction('biru', 'pukulan', [1, 2, 3]);
      } else if (key === 'i') {
        // Tendangan Biru
        onAutoScoreAction('biru', 'tendangan', [1, 2, 3]);
      } else if (key === 'o') {
        // Jatuhan Biru
        onAutoScoreAction('biru', 'jatuhan', [1, 2, 3]);
      } else if (key === 'p') {
        // Teguran Biru
        onPenaltyAction('biru', 'teguran1');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleTimer, onAutoScoreAction, onPenaltyAction]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Asisten Input Otomatis Nilai Wasit
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  IPSI 2026 Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Simulasi cerdas konsensus wasit juri, auto-scoring cepat, dan shortcut arena
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Auto-Pilot / Simulator Pertandingan Otomatis */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-slate-200">
                  Simulator Wasit Otomatis (Auto-Pilot Pertarungan)
                </span>
              </div>
              <button
                onClick={() => setIsBotActive(!isBotActive)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isBotActive
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isBotActive ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Auto-Pilot Aktif
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Aktifkan Auto-Pilot
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mensimulasikan aksi pertarungan real-time dan input wasit juri secara otomatis sesuai tempo pertandingan untuk gladi bersih, demonstrasi, atau pengujian layar gelanggang.
            </p>

            {/* Intensity & Bias Controls */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-900">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-2">
                  Intensitas Serangan
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg">
                  {(['santai', 'normal', 'intensif'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setCombatIntensity(lvl)}
                      className={`text-[11px] font-medium py-1 rounded transition-colors capitalize ${
                        combatIntensity === lvl
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-2">
                  Kecenderungan Skor
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg">
                  {(['merah', 'imbang', 'biru'] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setBias(b)}
                      className={`text-[11px] font-medium py-1 rounded transition-colors capitalize ${
                        bias === b
                          ? b === 'merah'
                            ? 'bg-red-500 text-white font-bold'
                            : b === 'biru'
                            ? 'bg-blue-500 text-white font-bold'
                            : 'bg-slate-700 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Input Konsensus Cepat 1-Klik (One-Click Auto-Consensus) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Input Otomatis Konsensus Juri (1-Klik Tanpa Delay)
              </span>
              <span className="text-[11px] text-slate-500">
                Otomatis memvalidasi mayoritas juri
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Sudut Merah Quick Triggers */}
              <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-400 uppercase">
                    Sudut Merah
                  </span>
                  <span className="text-[10px] text-red-400/80 font-mono">
                    Hotkeys: Q, W, E
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => onAutoScoreAction('merah', 'pukulan', [1, 2, 3])}
                    className="py-2.5 px-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-md flex flex-col items-center gap-1"
                  >
                    <span>Pukulan</span>
                    <span className="text-[10px] opacity-80">+1 Poin</span>
                  </button>
                  <button
                    onClick={() => onAutoScoreAction('merah', 'tendangan', [1, 2, 3])}
                    className="py-2.5 px-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-md flex flex-col items-center gap-1"
                  >
                    <span>Tendangan</span>
                    <span className="text-[10px] opacity-80">+2 Poin</span>
                  </button>
                  <button
                    onClick={() => onAutoScoreAction('merah', 'jatuhan', [1, 2, 3])}
                    className="py-2.5 px-2 bg-red-700 hover:bg-red-600 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-md flex flex-col items-center gap-1"
                  >
                    <span>Jatuhan Sah</span>
                    <span className="text-[10px] opacity-80">+3 Poin</span>
                  </button>
                </div>
              </div>

              {/* Sudut Biru Quick Triggers */}
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 uppercase">
                    Sudut Biru
                  </span>
                  <span className="text-[10px] text-blue-400/80 font-mono">
                    Hotkeys: U, I, O
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => onAutoScoreAction('biru', 'pukulan', [1, 2, 3])}
                    className="py-2.5 px-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-md flex flex-col items-center gap-1"
                  >
                    <span>Pukulan</span>
                    <span className="text-[10px] opacity-80">+1 Poin</span>
                  </button>
                  <button
                    onClick={() => onAutoScoreAction('biru', 'tendangan', [1, 2, 3])}
                    className="py-2.5 px-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-md flex flex-col items-center gap-1"
                  >
                    <span>Tendangan</span>
                    <span className="text-[10px] opacity-80">+2 Poin</span>
                  </button>
                  <button
                    onClick={() => onAutoScoreAction('biru', 'jatuhan', [1, 2, 3])}
                    className="py-2.5 px-2 bg-blue-700 hover:bg-blue-600 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-md flex flex-col items-center gap-1"
                  >
                    <span>Jatuhan Sah</span>
                    <span className="text-[10px] opacity-80">+3 Poin</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Keyboard Shortcuts Cheatsheet */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-amber-400" />
                Pintasan Keyboard Pertandingan (Live Hotkeys)
              </span>
              <span className="text-[10px] text-slate-500">
                Bisa ditekan kapan saja di layar
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 text-slate-400">
                <div className="flex items-center justify-between py-0.5 border-b border-slate-900">
                  <span>Mulai / Jeda Waktu</span>
                  <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded font-mono text-[10px]">Spacebar</kbd>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-slate-900">
                  <span>Bunyi Gong Babak</span>
                  <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded font-mono text-[10px]">G</kbd>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span>Peluit Wasit</span>
                  <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded font-mono text-[10px]">H</kbd>
                </div>
              </div>
              <div className="space-y-1.5 text-slate-400">
                <div className="flex items-center justify-between py-0.5 border-b border-slate-900">
                  <span>Pukulan/Tendangan/Jatuhan Merah</span>
                  <kbd className="px-2 py-0.5 bg-red-900/60 text-red-200 rounded font-mono text-[10px]">Q / W / E</kbd>
                </div>
                <div className="flex items-center justify-between py-0.5 border-b border-slate-900">
                  <span>Pukulan/Tendangan/Jatuhan Biru</span>
                  <kbd className="px-2 py-0.5 bg-blue-900/60 text-blue-200 rounded font-mono text-[10px]">U / I / O</kbd>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span>Teguran (-1 Poin) Merah / Biru</span>
                  <kbd className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded font-mono text-[10px]">R / P</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Real-time consensus verification siap</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
