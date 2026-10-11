import React, { useState, useEffect, useRef } from "react";
import { Maximize2, Minimize2, ArrowLeft } from "lucide-react";

interface FullScreenOverlayProps {
  onBack?: () => void;
  showBack?: boolean;
  backLabel?: string;
  backTitle?: string;
  isFullscreenProp?: boolean;
  onToggleFullscreen?: () => void;
}

export function FullScreenOverlay({ 
  onBack, 
  showBack = true,
  backLabel = "KEMBALI",
  backTitle = "Kembali ke Menu Utama",
  isFullscreenProp,
  onToggleFullscreen
}: FullScreenOverlayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const effectiveIsFullscreen = Boolean(isFullscreenProp ?? isFullscreen);

  // Sound generator helper
  const playOverlaySound = (freq = 800, duration = 0.05) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignored
    }
  };

  // Show briefly on initial mount for 3.5 seconds so user knows controls exist
  useEffect(() => {
    setIsVisible(true);
    const initialTimer = setTimeout(() => {
      setIsVisible(false);
    }, 3500);
    return () => clearTimeout(initialTimer);
  }, []);

  // 1. Detect precision mouse coordinates for corner activation (Sudut Kanan Atas)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Sensitive zone: 320px from right edge and 150px from top edge
      const thresholdX = window.innerWidth - 320;
      const thresholdY = 150;

      if (e.clientX >= thresholdX && e.clientY <= thresholdY) {
        if (!isVisible) {
          setIsVisible(true);
          playOverlaySound(880, 0.04);
        }
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      } else {
        // Auto-hide when mouse leaves the top-right corner after 2 seconds
        if (isVisible && !hoverTimeoutRef.current) {
          hoverTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
          }, 2000);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [isVisible]);

  // Keep visible while interacting inside container
  const handleMouseEnterContainer = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsVisible(true);
  };

  const handleMouseLeaveContainer = () => {
    if (!hoverTimeoutRef.current) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 1500);
    }
  };

  // 2. State Sync with Real Browser Native Fullscreen Events
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);

    // Initial check
    setIsFullscreen(!!document.fullscreenElement);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("mozfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
    };
  }, []);

  // 3. Native Fullscreen Toggle function
  const toggleNativeFullscreen = async () => {
    playOverlaySound(1050, 0.08);
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    try {
      if (!document.fullscreenElement) {
        const root = document.documentElement;
        if (root.requestFullscreen) {
          await root.requestFullscreen();
        } else if ((root as any).webkitRequestFullscreen) {
          await (root as any).webkitRequestFullscreen();
        } else if ((root as any).msRequestFullscreen) {
          await (root as any).msRequestFullscreen();
        } else {
          setIsFullscreen(prev => !prev);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle error", err);
      setIsFullscreen(prev => !prev);
    }
  };

  return (
    <>
      {/* Visual Corner Indicator / Touch Hotspot in Top-Right Corner */}
      <div 
        onClick={() => {
          setIsVisible((prev) => !prev);
          playOverlaySound(900, 0.04);
        }}
        onMouseEnter={() => {
          setIsVisible(true);
          playOverlaySound(900, 0.04);
        }}
        className="fixed top-0 right-0 w-10 h-10 z-[99990] cursor-pointer flex items-start justify-end p-1.5 group"
        title="Arahkan kursor atau klik di sini untuk Fullscreen & Kembali"
      >
        <div 
          className="w-2.5 h-2.5 rounded-bl-full bg-cyan-400/40 group-hover:bg-cyan-300 group-hover:scale-125 transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.6)] animate-pulse"
        />
      </div>

      {isVisible && (
        <div
          onMouseEnter={handleMouseEnterContainer}
          onMouseLeave={handleMouseLeaveContainer}
          className="fixed top-2 right-2 sm:top-2.5 sm:right-2.5 z-[99999] select-none font-sans transition-all duration-300 transform opacity-100 translate-y-0 scale-100"
          id="arena-floating-nav-overlay"
        >
          {/* Compact Floating Launcher Pod */}
          <div className="flex items-center gap-1.5 bg-[#04081c]/95 border border-cyan-500/50 p-1 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.35)] backdrop-blur-xl transition-all hover:border-cyan-400">
            
            {/* Native Fullscreen Button */}
            <button
              type="button"
              onClick={toggleNativeFullscreen}
              className="px-2 py-1 rounded-lg bg-blue-950/80 border border-cyan-500/40 hover:border-cyan-300 text-cyan-300 hover:text-white transition-all duration-150 active:scale-95 cursor-pointer shadow-sm flex items-center justify-center gap-1 hover:bg-blue-900/70"
              title={effectiveIsFullscreen ? "Keluar Layar Penuh" : "Masuk Layar Penuh"}
            >
              {effectiveIsFullscreen ? (
                <Minimize2 className="w-3 h-3 text-cyan-300 animate-pulse shrink-0" />
              ) : (
                <Maximize2 className="w-3 h-3 text-cyan-300 shrink-0" />
              )}
              <span className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider">
                {effectiveIsFullscreen ? "NORMAL" : "LAYAR PENUH"}
              </span>
            </button>

            {/* Unified Back to Main Menu Button */}
            {showBack && onBack && (
              <button
                type="button"
                onClick={() => {
                  playOverlaySound(700, 0.1);
                  onBack();
                }}
                className="px-2 py-1 rounded-lg bg-[#1d0a10] border border-rose-500/40 hover:border-rose-400 text-rose-300 hover:text-white hover:bg-red-950/70 transition-all duration-150 active:scale-95 cursor-pointer shadow-sm flex items-center justify-center gap-1"
                title={backTitle}
              >
                <ArrowLeft className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider text-amber-300">
                  {backLabel}
                </span>
              </button>
            )}

          </div>
        </div>
      )}
    </>
  );
}
