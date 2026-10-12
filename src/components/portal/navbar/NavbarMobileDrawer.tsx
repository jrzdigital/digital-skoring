import React, { useState } from "react";
import { LogIn } from "lucide-react";
import { PortalTab, AdminSubTab } from "../../../types/portal";
import { sound } from "../../../utils/sound";
import { UserAccount } from "../../../types";

interface NavbarMobileDrawerProps {
  activeTab: PortalTab;
  adminSubTab: AdminSubTab;
  isMonitorActive: boolean;
  currentUser?: UserAccount | null;
  onSelectTab: (tab: PortalTab) => void;
  onSelectAdminSubTab: (subTab: AdminSubTab) => void;
  onOpenMatchSelector: () => void;
  onOpenSignModal?: (notice?: string, isRestricted?: boolean) => void;
  onLogout?: () => void;
  onClose: () => void;
  theme?: "light" | "dark";
  toggleTheme?: () => void;
  effectiveTheme?: "light" | "dark";
}

export function NavbarMobileDrawer({
  activeTab,
  adminSubTab,
  isMonitorActive,
  currentUser,
  onSelectTab,
  onSelectAdminSubTab,
  onOpenMatchSelector,
  onOpenSignModal,
  onLogout,
  onClose,
  theme = "dark",
  toggleTheme = () => {},
  effectiveTheme = "dark"
}: NavbarMobileDrawerProps) {
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);
  const [mobileSkoringOpen, setMobileSkoringOpen] = useState(false);
  const [mobileMonitorOpen, setMobileMonitorOpen] = useState(false);

  const isAdministrasiActive = activeTab === "ADMINISTRASI";
  const isSkoringActive = activeTab === "TANDING" || activeTab === "SENI";

  return (
    <div className={`md:hidden border-t px-4 py-3 space-y-2 animate-fadeIn shadow-2xl max-h-[85vh] overflow-y-auto ${
      effectiveTheme === "light"
        ? "bg-white/98 backdrop-blur-xl border-slate-200 text-slate-800"
        : "bg-[#0c1630]/98 backdrop-blur-xl border-blue-900/50 text-slate-200"
    }`}>
      {isMonitorActive ? (
        <div className="space-y-2 py-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2 py-1 border-b border-slate-800 flex items-center justify-between">
            <span>Pilih Layar Monitor:</span>
            <span className="text-[9px] text-rose-400 font-bold font-mono">OFFICIAL ONLY</span>
          </div>

          <button
            onClick={() => {
              onSelectTab("MONITOR_TANDING");
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "MONITOR_TANDING"
                ? "bg-rose-950/70 text-rose-300 font-black border border-rose-800/80"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <span>Monitor Tanding</span>
            <span className="px-1.5 py-0.2 text-[8px] font-black bg-rose-600 text-white rounded animate-pulse">LIVE</span>
          </button>

          <button
            onClick={() => {
              onSelectTab("MONITOR_SENI");
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "MONITOR_SENI"
                ? "bg-amber-950/70 text-amber-300 font-black border border-amber-800/80"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <span>Monitor Seni</span>
            <span className="px-1.5 py-0.2 text-[8px] font-black bg-amber-400 text-slate-950 rounded">TGR</span>
          </button>

          <button
            onClick={() => {
              onSelectTab("BERANDA");
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 mt-2"
          >
            <span>Kembali ke Beranda</span>
            <span className="px-1.5 py-0.2 text-[8px] font-mono font-bold bg-blue-950/80 text-blue-300 rounded border border-blue-800">JRZ SCORE</span>
          </button>
        </div>
      ) : (
        <>
          {/* Beranda */}
          <button
            onClick={() => {
              onSelectTab("BERANDA");
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "BERANDA"
                ? "bg-blue-950/70 text-blue-300 font-extrabold border border-blue-800/80"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <span>Beranda</span>
          </button>

          {/* Administrasi Accordion */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <button
              onClick={() => setMobileAdminOpen(!mobileAdminOpen)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isAdministrasiActive ? "text-indigo-300 font-extrabold bg-indigo-950/40" : "text-slate-300"
              }`}
            >
              <span>Administrasi</span>
              <span className={`text-[11px] transition-transform ${mobileAdminOpen ? "rotate-180 text-indigo-400" : ""}`}>▾</span>
            </button>

            {mobileAdminOpen && (
              <div className="px-2 pb-2 space-y-1 bg-[#091124] border-t border-slate-800 pt-1">
                {/* 1. Bagan Pertandingan */}
                <button
                  onClick={() => {
                    onSelectAdminSubTab("BAGAN");
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    isAdministrasiActive && adminSubTab === "BAGAN" ? "bg-purple-950/80 text-purple-300 border border-purple-800/80" : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <span>Bagan Pertandingan</span>
                  <span className="px-1 py-0.2 text-[8px] font-mono font-bold bg-purple-950 text-purple-300 rounded border border-purple-800">BAGAN</span>
                </button>

                {/* 2. Jadwal Pertandingan */}
                <button
                  onClick={() => {
                    onSelectAdminSubTab("JADWAL");
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    isAdministrasiActive && adminSubTab === "JADWAL" ? "bg-amber-950/80 text-amber-300 border border-amber-800/80" : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <span>Jadwal Pertandingan</span>
                  <span className="px-1 py-0.2 text-[8px] font-mono font-bold bg-amber-950 text-amber-300 rounded border border-amber-800">JADWAL</span>
                </button>

                <div className="border-t border-slate-800 my-1"></div>

                {/* 3. Data Atlet & Kontingen */}
                <button
                  onClick={() => {
                    if (!currentUser) {
                      onClose();
                      if (onOpenSignModal) {
                        onOpenSignModal("Akses Modul Terbatas! Menu ini hanya dapat diakses oleh Panitia yang telah terdaftar.", true);
                      }
                      return;
                    }
                    onSelectAdminSubTab("ATLET");
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    isAdministrasiActive && adminSubTab === "ATLET" ? "bg-indigo-950/70 text-indigo-300" : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <span>Data Atlet & Kontingen</span>
                  {!currentUser && <span className="text-[10px] text-amber-500 font-bold">Kunci</span>}
                </button>

                {/* 4. Timbang Badan */}
                <button
                  onClick={() => {
                    if (!currentUser) {
                      onClose();
                      if (onOpenSignModal) {
                        onOpenSignModal("Akses Modul Terbatas! Menu ini hanya dapat diakses oleh Panitia yang telah terdaftar.", true);
                      }
                      return;
                    }
                    onSelectAdminSubTab("TIMBANG");
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    isAdministrasiActive && adminSubTab === "TIMBANG" ? "bg-indigo-950/70 text-indigo-300" : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <span>Timbang Badan</span>
                  {!currentUser && <span className="text-[10px] text-amber-500 font-bold">Kunci</span>}
                </button>

                {/* 5. Klasemen Medali Kontingen */}
                <button
                  onClick={() => {
                    if (!currentUser) {
                      onClose();
                      if (onOpenSignModal) {
                        onOpenSignModal("Akses Modul Terbatas! Menu ini hanya dapat diakses oleh Panitia yang telah terdaftar.", true);
                      }
                      return;
                    }
                    onSelectAdminSubTab("MEDALI");
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    isAdministrasiActive && adminSubTab === "MEDALI" ? "bg-indigo-950/70 text-indigo-300" : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <span>Klasemen Medali Kontingen</span>
                  {!currentUser && <span className="text-[10px] text-amber-500 font-bold">Kunci</span>}
                </button>

                <button
                  onClick={() => {
                    if (!currentUser) {
                      onClose();
                      if (onOpenSignModal) {
                        onOpenSignModal("Akses Modul Terbatas! Menu ini hanya dapat diakses oleh Panitia yang telah terdaftar.", true);
                      }
                      return;
                    }
                    onOpenMatchSelector();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 border border-rose-800/50"
                >
                  <span>Pilih & Aktifkan Partai (Live)</span>
                  <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[8px] font-mono font-bold">LIVE</span>
                </button>
              </div>
            )}
          </div>

          {/* Digital Skoring Accordion */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <button
              onClick={() => setMobileSkoringOpen(!mobileSkoringOpen)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isSkoringActive ? "text-rose-300 font-extrabold" : "text-slate-300"
              }`}
            >
              <span>Digital Skoring</span>
              <span className={`text-[11px] transition-transform ${mobileSkoringOpen ? "rotate-180" : ""}`}>▾</span>
            </button>

            {mobileSkoringOpen && (
              <div className="px-2 pb-2 space-y-1 bg-[#091124] border-t border-slate-800 pt-1">
                <button
                  onClick={() => {
                    if (!currentUser) {
                      onClose();
                      if (onOpenSignModal) {
                        onOpenSignModal("Akses Digital Skoring Tanding Terbatas! Silakan Masuk (Login).", true);
                      }
                      return;
                    }
                    onSelectTab("TANDING");
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "TANDING" ? "bg-rose-950/70 text-rose-300" : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <span>Kategori Tanding</span>
                  <span className="px-1.5 py-0.5 text-[8px] font-black bg-rose-600 text-white rounded">LIVE</span>
                </button>

                <button
                  onClick={() => {
                    if (!currentUser) {
                      onClose();
                      if (onOpenSignModal) {
                        onOpenSignModal("Akses Digital Skoring Seni Terbatas! Silakan Masuk (Login).", true);
                      }
                      return;
                    }
                    onSelectTab("SENI");
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "SENI" ? "bg-amber-950/70 text-amber-300" : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <span>Kategori Seni</span>
                  <span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">TGR</span>
                </button>
              </div>
            )}
          </div>

          {/* Monitor Accordion */}
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <button
              onClick={() => setMobileMonitorOpen(!mobileMonitorOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-slate-300"
            >
              <span>Monitor Pertandingan</span>
              <span className={`text-[11px] transition-transform ${mobileMonitorOpen ? "rotate-180" : ""}`}>▾</span>
            </button>

            {mobileMonitorOpen && (
              <div className="px-2 pb-2 space-y-1 bg-[#091124] border-t border-slate-800 pt-1">
                <button
                  onClick={() => {
                    onSelectTab("MONITOR_TANDING");
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    (activeTab as string) === "MONITOR_TANDING" ? "bg-rose-950/70 text-rose-300" : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <span>Kategori Tanding</span>
                  <span className="px-1.5 py-0.5 text-[8px] font-black bg-rose-600 text-white rounded">LIVE</span>
                </button>

                <button
                  onClick={() => {
                    onSelectTab("MONITOR_SENI");
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    (activeTab as string) === "MONITOR_SENI" ? "bg-amber-950/70 text-amber-300" : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <span>Kategori Seni</span>
                  <span className="px-1.5 py-0.2 text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">TGR</span>
                </button>
              </div>
            )}
          </div>

          {/* Kontak Person */}
          <button
            onClick={() => {
              onSelectTab("KONTAK");
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "KONTAK"
                ? "bg-teal-950/70 text-teal-300 font-extrabold border border-teal-800/80"
                : "text-slate-300 hover:bg-slate-800/60"
            }`}
          >
            <span>Kontak Person</span>
          </button>

          {/* Panel Admin (Hanya ketika login sebagai superadmin) */}
          {currentUser?.role === "superadmin" && (
            <button
              onClick={() => {
                onSelectTab("ADMIN_PANEL");
                onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "ADMIN_PANEL"
                  ? "bg-emerald-950/70 text-emerald-300 font-extrabold border border-emerald-800/80"
                  : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              <span>Panel Admin</span>
            </button>
          )}

          {/* User Sign In / Account section */}
          <div className={`pt-2 border-t ${effectiveTheme === "light" ? "border-slate-200" : "border-slate-800"}`}>
            {currentUser ? (
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-amber-500/60 bg-slate-800 flex items-center justify-center">
                      {currentUser.avatar || currentUser.avatarUrl ? (
                        <img 
                          src={currentUser.avatar || currentUser.avatarUrl} 
                          alt={currentUser.fullName} 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white font-black text-xs uppercase">
                          {currentUser.fullName ? currentUser.fullName.charAt(0) : "U"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate">{currentUser.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase truncate">{currentUser.role} &bull; {currentUser.username}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (onLogout) onLogout();
                      onClose();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-950/60 text-rose-300 font-bold text-xs hover:bg-rose-900/60 transition-colors shrink-0"
                  >
                    Keluar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (onOpenSignModal) onOpenSignModal();
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-md border border-rose-500"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
