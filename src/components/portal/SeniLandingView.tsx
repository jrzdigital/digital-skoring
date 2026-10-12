import React from "react";
import { Award, Crown, Users, Tv, ChevronRight, Save, Flame, ArrowLeft } from "lucide-react";
import { SeniPerformanceState } from "../../types/portal";
import { sound } from "../../utils/sound";

interface SeniLandingViewProps {
  selectedArena: string;
  performance: SeniPerformanceState;
  onSelectRole: (role: "DEWAN" | "JURY" | "MONITOR") => void;
  onSaveToFirebase: () => void;
  onBackToHome?: () => void;
}

export const SeniLandingView: React.FC<SeniLandingViewProps> = ({
  selectedArena,
  performance,
  onSelectRole,
  onSaveToFirebase,
  onBackToHome
}) => {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
      {/* TOP NAVIGATION BAR WITH BACK TO BERANDA */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            if (onBackToHome) onBackToHome();
            else window.dispatchEvent(new CustomEvent("jrz_navigate_tab", { detail: "BERANDA" }));
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-mono font-bold transition-all shadow-md cursor-pointer group"
          title="Kembali ke Beranda Utama JRZ SCORE"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke Beranda</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">Mode:</span>
          <span className="px-2.5 py-0.5 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800/80 text-[10px] font-bold font-mono">
            DIGITAL SKORING SENI
          </span>
        </div>
      </div>

      {/* HEADER HERO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0d1838] via-[#09132c] to-[#0d1838] p-5 sm:p-6 rounded-3xl border border-blue-900/50 shadow-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              LANDING PANEL DIGITAL SKORING SENI
            </span>
            <span className="text-xs text-amber-300 font-mono font-bold">Gelanggang {selectedArena}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2.5">
            <Award className="w-6 h-6 text-amber-400" />
            Sistem Penjurian Seni IPSI (TGR & Solo Kreatif)
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Pilih modul peran untuk memulai penilaian seni silat resmi PERSILAT / IPSI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSaveToFirebase}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-950/50 cursor-pointer active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Nilai</span>
          </button>
        </div>
      </div>

      {/* ACTIVE MATCH PREVIEW BADGE */}
      <div className="bg-slate-900/80 border border-blue-900/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
              Partai Seni Aktif Saat Ini
            </div>
            <div className="text-sm sm:text-base font-black text-white font-mono uppercase">
              {performance.matchNumber} • {performance.athleteName} ({performance.contingent})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <div className="text-slate-400 text-[10px]">Kategori & Timer:</div>
            <div className="text-emerald-400 font-bold">{performance.category} • {formatTime(performance.elapsedSeconds)}</div>
          </div>
          <div className="text-right border-l border-slate-700 pl-4">
            <div className="text-slate-400 text-[10px]">Skor Terkini:</div>
            <div className="text-amber-400 font-black text-base">{performance.finalScore.toFixed(3)}</div>
          </div>
        </div>
      </div>

      {/* 3 ROLE ENTRY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CARD 1: DEWAN & SEKRETARIS */}
        <div 
          onClick={() => {
            sound.playClick();
            onSelectRole("DEWAN");
          }}
          className="group bg-gradient-to-b from-[#0e1b3d] to-[#071026] hover:from-[#132350] hover:to-[#0b1735] border-2 border-blue-600/40 hover:border-amber-400/80 rounded-3xl p-6 shadow-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-400/30">
                KONTROL & PENGESAHAN
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-tight mt-2 group-hover:text-amber-300 transition-colors">
                Panel Dewan & Sekretaris Seni
              </h3>
              <p className="text-xs text-slate-300 font-mono mt-2 leading-relaxed">
                Pengatur waktu stopwatch 3 menit resmi, input penalti dewan (keluar gelanggang, pakaian, senjata jatuh, deviasi waktu), rekap 5 juri, dan pengesahan hasil akhir.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-400 group-hover:text-amber-300 transition-colors">
              Masuk Panel Dewan Seni
            </span>
            <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 2: JURI SENI (1 - 5) */}
        <div 
          onClick={() => {
            sound.playClick();
            onSelectRole("JURY");
          }}
          className="group bg-gradient-to-b from-[#0e1b3d] to-[#071026] hover:from-[#132350] hover:to-[#0b1735] border-2 border-blue-600/40 hover:border-cyan-400/80 rounded-3xl p-6 shadow-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                PENILAIAN PERSILAT
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-tight mt-2 group-hover:text-cyan-300 transition-colors">
                Panel Juri Seni (Juri 1 - 5)
              </h3>
              <p className="text-xs text-slate-300 font-mono mt-2 leading-relaxed">
                Panel digital 5 juri penilai seni IPSI. Input Nilai Kebenaran Gerak Jurus Baku (0.00 - 9.90) dan Nilai Kemantapan, Penghayatan & Stamina (0.00 - 0.20) secara real-time.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
              Masuk Panel Juri Seni
            </span>
            <ChevronRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 3: MONITOR TV SCOREBOARD */}
        <div 
          onClick={() => {
            sound.playClick();
            onSelectRole("MONITOR");
          }}
          className="group bg-gradient-to-b from-[#0e1b3d] to-[#071026] hover:from-[#132350] hover:to-[#0b1735] border-2 border-blue-600/40 hover:border-emerald-400/80 rounded-3xl p-6 shadow-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                LAYAR DISPLAY TV
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-tight mt-2 group-hover:text-emerald-300 transition-colors">
                Layar Monitor Scoreboard Seni
              </h3>
              <p className="text-xs text-slate-300 font-mono mt-2 leading-relaxed">
                Display layar monitor TV resolusi besar untuk penonton, official kontingen, dan tribun penonton. Menampilkan waktu, skor akhir median, dan matriks 5 juri.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors">
              Buka Layar Monitor Seni
            </span>
            <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
