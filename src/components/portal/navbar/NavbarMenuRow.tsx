import React, { useRef } from "react";
import { PortalTab, AdminSubTab } from "../../../types/portal";
import { sound } from "../../../utils/sound";
import { UserAccount } from "../../../types";

interface NavbarMenuRowProps {
  activeTab: PortalTab;
  adminSubTab: AdminSubTab;
  isMonitorActive: boolean;
  currentUser?: UserAccount | null;
  administrasiDropdownOpen: boolean;
  skoringDropdownOpen: boolean;
  monitorDropdownOpen: boolean;
  onMouseEnterAdmin: () => void;
  onMouseLeaveAdmin: () => void;
  onToggleAdmin: () => void;
  onMouseEnterSkoring: () => void;
  onMouseLeaveSkoring: () => void;
  onToggleSkoring: () => void;
  onMouseEnterMonitor: () => void;
  onMouseLeaveMonitor: () => void;
  onToggleMonitor: () => void;
  adminDropdownRef: React.RefObject<HTMLDivElement>;
  skoringDropdownRef: React.RefObject<HTMLDivElement>;
  monitorDropdownRef: React.RefObject<HTMLDivElement>;
  onSelectTab: (tab: PortalTab) => void;
  onSelectAdminSubTab: (subTab: AdminSubTab) => void;
  onOpenMatchSelector: () => void;
  onOpenSignModal?: (notice?: string, isRestricted?: boolean) => void;
  theme?: "light" | "dark";
  toggleTheme?: () => void;
  effectiveTheme?: "light" | "dark";
}

export function NavbarMenuRow({
  activeTab,
  adminSubTab,
  isMonitorActive,
  currentUser,
  administrasiDropdownOpen,
  skoringDropdownOpen,
  monitorDropdownOpen,
  onMouseEnterAdmin,
  onMouseLeaveAdmin,
  onToggleAdmin,
  onMouseEnterSkoring,
  onMouseLeaveSkoring,
  onToggleSkoring,
  onMouseEnterMonitor,
  onMouseLeaveMonitor,
  onToggleMonitor,
  adminDropdownRef,
  skoringDropdownRef,
  monitorDropdownRef,
  onSelectTab,
  onSelectAdminSubTab,
  onOpenMatchSelector,
  onOpenSignModal,
  theme = "dark",
  toggleTheme = () => {},
  effectiveTheme = "dark"
}: NavbarMenuRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isAdministrasiActive = activeTab === "ADMINISTRASI";
  const isSkoringActive = activeTab === "TANDING" || activeTab === "SENI";

  return (
    <div className={`border-t px-3 sm:px-4 py-1.5 flex items-center justify-between gap-1.5 select-none relative bg-transparent z-40 overflow-visible ${
      effectiveTheme === "light" ? "border-slate-200" : "border-blue-900/40"
    }`}>
      
      {/* HORIZONTAL MENU ROW */}
      <div 
        ref={scrollContainerRef}
        className="flex items-center gap-1 sm:gap-1.5 overflow-visible flex-1 min-w-0 py-0.5"
      >
        {isMonitorActive ? (
          /* MONITOR ACTIVE MENUS */
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectTab("MONITOR_TANDING")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "MONITOR_TANDING"
                  ? "bg-rose-950/70 text-rose-300 font-black border border-rose-800/80 shadow-xs"
                  : "text-slate-300 hover:text-rose-400 hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <span>Monitor Tanding</span>
              <span className="px-1 py-0.2 text-[8px] font-black bg-rose-600 text-white rounded">LIVE</span>
            </button>

            <button
              onClick={() => onSelectTab("MONITOR_SENI")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "MONITOR_SENI"
                  ? "bg-amber-950/70 text-amber-300 font-black border border-amber-800/80 shadow-xs"
                  : "text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <span>Monitor Seni</span>
              <span className="px-1 py-0.2 text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">TGR</span>
            </button>

            <button
              onClick={() => onSelectTab("BERANDA")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-blue-400 hover:bg-slate-800/50 transition-all cursor-pointer whitespace-nowrap border border-transparent"
            >
              <span>Kembali ke Beranda</span>
            </button>
          </div>
        ) : (
          /* STANDARD NAVBAR MENUS - CLEAN TEXT ONLY WITHOUT ICONS */
          <>
            {/* 1. BERANDA */}
            <button
              onClick={() => onSelectTab("BERANDA")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "BERANDA"
                  ? effectiveTheme === "light"
                    ? "bg-blue-50 text-blue-700 font-extrabold border border-blue-200 shadow-xs"
                    : "bg-blue-950/70 text-blue-300 font-extrabold border border-blue-800/80 shadow-xs"
                  : effectiveTheme === "light"
                    ? "text-slate-600 hover:text-blue-600 hover:bg-slate-100 border border-transparent"
                    : "text-slate-300 hover:text-blue-400 hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <span>Beranda</span>
            </button>

            {/* 2. ADMINISTRASI WITH DROPDOWN */}
            <div
              className="relative"
              ref={adminDropdownRef}
              onMouseEnter={onMouseEnterAdmin}
              onMouseLeave={onMouseLeaveAdmin}
            >
              <button
                onClick={onToggleAdmin}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isAdministrasiActive
                    ? effectiveTheme === "light"
                      ? "bg-indigo-50 text-indigo-700 font-extrabold border border-indigo-200 shadow-xs"
                      : "bg-indigo-950/70 text-indigo-300 font-extrabold border border-indigo-800/80 shadow-xs"
                    : effectiveTheme === "light"
                      ? "text-slate-600 hover:text-indigo-600 hover:bg-slate-100 border border-transparent"
                      : "text-slate-300 hover:text-indigo-400 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <span>Administrasi</span>
                <span className={`text-[10px] ml-0.5 transition-transform duration-200 ${
                  administrasiDropdownOpen 
                    ? effectiveTheme === "light" ? "rotate-180 text-indigo-600" : "rotate-180 text-indigo-400" 
                    : "text-slate-400"
                }`}>▾</span>
              </button>

              {/* ADMINISTRASI DROPDOWN POPOVER */}
              {administrasiDropdownOpen && (
                <div 
                  className="absolute left-0 top-full pt-1.5 w-72 sm:w-80 min-w-[280px] z-50 animate-fadeIn max-h-none overflow-visible"
                  onMouseEnter={onMouseEnterAdmin}
                  onMouseLeave={onMouseLeaveAdmin}
                >
                  <div className={`rounded-2xl backdrop-blur-xl border shadow-2xl p-2 max-h-none overflow-visible ${
                    effectiveTheme === "light"
                      ? "bg-white/98 border-slate-200 text-slate-800"
                      : "bg-[#0c1630]/98 border-blue-900/60 text-slate-200"
                  }`}>
                    <div className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider border-b mb-1 flex items-center justify-between ${
                      effectiveTheme === "light" ? "text-slate-500 border-slate-200" : "text-slate-400 border-slate-800"
                    }`}>
                      <span>Manajemen Turnamen:</span>
                      <span className={`text-[9px] font-sans font-bold ${effectiveTheme === "light" ? "text-indigo-600" : "text-indigo-400"}`}>Bagan & Jadwal</span>
                    </div>

                    {/* Submenu 1: Bagan Pertandingan */}
                    <button
                      onClick={() => onSelectAdminSubTab("BAGAN")}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                        isAdministrasiActive && adminSubTab === "BAGAN"
                          ? effectiveTheme === "light"
                            ? "bg-purple-50 text-purple-700 font-bold border border-purple-200"
                            : "bg-purple-950/70 text-purple-300 font-bold border border-purple-800/50"
                          : effectiveTheme === "light"
                            ? "hover:bg-slate-100 text-slate-700"
                            : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div>
                        <div className={`text-xs font-bold ${effectiveTheme === "light" ? "text-slate-900" : "text-slate-100"}`}>Bagan Pertandingan</div>
                        <p className={`text-[10px] ${effectiveTheme === "light" ? "text-slate-500" : "text-slate-400"}`}>Skema bagan eliminasi turnamen</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                        effectiveTheme === "light" ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-purple-950 text-purple-300 border border-purple-800"
                      }`}>BAGAN</span>
                    </button>

                    {/* Submenu 2: Jadwal Pertandingan */}
                    <button
                      onClick={() => onSelectAdminSubTab("JADWAL")}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between mt-0.5 ${
                        isAdministrasiActive && adminSubTab === "JADWAL"
                          ? effectiveTheme === "light"
                            ? "bg-amber-50 text-amber-800 font-bold border border-amber-200"
                            : "bg-amber-950/70 text-amber-300 font-bold border border-amber-800/50"
                          : effectiveTheme === "light"
                            ? "hover:bg-slate-100 text-slate-700"
                            : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div>
                        <div className={`text-xs font-bold ${effectiveTheme === "light" ? "text-slate-900" : "text-slate-100"}`}>Jadwal Pertandingan</div>
                        <p className={`text-[10px] ${effectiveTheme === "light" ? "text-slate-500" : "text-slate-400"}`}>Susunan partai gelanggang & PDF</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                        effectiveTheme === "light" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}>JADWAL</span>
                    </button>

                    <div className={`border-t my-1 ${effectiveTheme === "light" ? "border-slate-200" : "border-slate-800"}`}></div>

                    {/* Submenu 3: Atlet */}
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          if (onOpenSignModal) {
                            onOpenSignModal("Akses Modul Terbatas! Menu ini hanya dapat diakses oleh Panitia yang telah terdaftar.", true);
                          }
                          return;
                        }
                        onSelectAdminSubTab("ATLET");
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                        isAdministrasiActive && adminSubTab === "ATLET"
                          ? effectiveTheme === "light"
                            ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200"
                            : "bg-indigo-950/70 text-indigo-300 font-bold border border-indigo-800/50"
                          : effectiveTheme === "light"
                            ? "hover:bg-slate-100 text-slate-700"
                            : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div>
                        <div className={`text-xs font-bold ${effectiveTheme === "light" ? "text-slate-900" : "text-slate-100"}`}>Data Atlet & Kontingen</div>
                        <p className={`text-[10px] ${effectiveTheme === "light" ? "text-slate-500" : "text-slate-400"}`}>Pendaftaran & verifikasi pesilat</p>
                      </div>
                      {!currentUser && <span className="text-[10px] text-amber-500 font-bold">Kunci</span>}
                    </button>

                    {/* Submenu 4: Timbang */}
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          if (onOpenSignModal) {
                            onOpenSignModal("Akses Modul Terbatas! Menu ini hanya dapat diakses oleh Panitia yang telah terdaftar.", true);
                          }
                          return;
                        }
                        onSelectAdminSubTab("TIMBANG");
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between mt-0.5 ${
                        isAdministrasiActive && adminSubTab === "TIMBANG"
                          ? effectiveTheme === "light"
                            ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                            : "bg-indigo-950/70 text-indigo-300 font-bold border border-indigo-800/50"
                          : effectiveTheme === "light"
                            ? "hover:bg-slate-100 text-slate-700"
                            : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div>
                        <div className={`text-xs font-bold ${effectiveTheme === "light" ? "text-slate-900" : "text-slate-100"}`}>Timbang Badan</div>
                        <p className={`text-[10px] ${effectiveTheme === "light" ? "text-slate-500" : "text-slate-400"}`}>Uji berat badan atlet & status lolos</p>
                      </div>
                      {!currentUser && <span className="text-[10px] text-amber-500 font-bold">Kunci</span>}
                    </button>

                    {/* Submenu 5: Medali */}
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          if (onOpenSignModal) {
                            onOpenSignModal("Akses Modul Terbatas! Menu ini hanya dapat diakses oleh Panitia yang telah terdaftar.", true);
                          }
                          return;
                        }
                        onSelectAdminSubTab("MEDALI");
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between mt-0.5 ${
                        isAdministrasiActive && adminSubTab === "MEDALI"
                          ? effectiveTheme === "light"
                            ? "bg-yellow-50 text-yellow-800 font-bold border border-yellow-200"
                            : "bg-indigo-950/70 text-indigo-300 font-bold border border-indigo-800/50"
                          : effectiveTheme === "light"
                            ? "hover:bg-slate-100 text-slate-700"
                            : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div>
                        <div className={`text-xs font-bold ${effectiveTheme === "light" ? "text-slate-900" : "text-slate-100"}`}>Klasemen Medali Kontingen</div>
                        <p className={`text-[10px] ${effectiveTheme === "light" ? "text-slate-500" : "text-slate-400"}`}>Total perolehan emas, perak, perunggu</p>
                      </div>
                      {!currentUser && <span className="text-[10px] text-amber-500 font-bold">Kunci</span>}
                    </button>

                    <div className={`border-t my-1 ${effectiveTheme === "light" ? "border-slate-200" : "border-slate-800"}`}></div>

                    {/* Submenu 6: Pilih & Aktifkan Partai (Live) */}
                    <button
                      onClick={() => {
                        if (!currentUser) {
                          if (onOpenSignModal) {
                            onOpenSignModal("Akses Modul Terbatas! Menu ini hanya dapat diakses oleh Panitia yang telah terdaftar.", true);
                          }
                          return;
                        }
                        onOpenMatchSelector();
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between border ${
                        effectiveTheme === "light"
                          ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                          : "bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border-rose-800/50"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-rose-600 dark:text-rose-300">Pilih & Aktifkan Partai</div>
                        <p className={`text-[10px] ${effectiveTheme === "light" ? "text-rose-500" : "text-rose-400/80"}`}>Real-time sync ke seluruh panel</p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-mono text-[8px] font-bold">LIVE</span>
                    </button>

                  </div>
                </div>
              )}
            </div>

            {/* 4. DIGITAL SKORING WITH DROPDOWN */}
            <div
              className="relative"
              ref={skoringDropdownRef}
              onMouseEnter={onMouseEnterSkoring}
              onMouseLeave={onMouseLeaveSkoring}
            >
              <button
                onClick={onToggleSkoring}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSkoringActive
                    ? effectiveTheme === "light"
                      ? "bg-rose-50 text-rose-700 font-extrabold border border-rose-200 shadow-xs"
                      : "bg-rose-950/70 text-rose-300 font-extrabold border border-rose-800/80 shadow-xs"
                    : effectiveTheme === "light"
                      ? "text-slate-600 hover:text-rose-600 hover:bg-slate-100 border border-transparent"
                      : "text-slate-300 hover:text-rose-400 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <span>Digital Skoring</span>
                <span className={`text-[10px] ml-0.5 transition-transform duration-200 ${
                  skoringDropdownOpen 
                    ? effectiveTheme === "light" ? "rotate-180 text-rose-600" : "rotate-180 text-rose-400" 
                    : "text-slate-400"
                }`}>▾</span>
              </button>

              {/* SKORING DROPDOWN POPOVER */}
              {skoringDropdownOpen && (
                <div 
                  className="absolute left-0 top-full pt-1.5 w-64 z-50 animate-fadeIn max-h-none overflow-visible"
                  onMouseEnter={onMouseEnterSkoring}
                  onMouseLeave={onMouseLeaveSkoring}
                >
                  <div className={`rounded-2xl backdrop-blur-xl border shadow-2xl p-2 ${
                    effectiveTheme === "light"
                      ? "bg-white/98 border-slate-200 text-slate-800"
                      : "bg-[#0c1630]/98 border-blue-900/60 text-slate-200"
                  }`}>
                    <div className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider border-b mb-1 flex items-center justify-between ${
                      effectiveTheme === "light" ? "text-slate-500 border-slate-200" : "text-slate-400 border-slate-800"
                    }`}>
                      <span>Akses Skoring:</span>
                      <span className="text-[9px] text-rose-500 font-sans font-bold">Official Only</span>
                    </div>

                    <button
                      onClick={() => onSelectTab("TANDING")}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                        activeTab === "TANDING"
                          ? effectiveTheme === "light"
                            ? "bg-rose-50 text-rose-700 font-bold border border-rose-200"
                            : "bg-rose-950/70 text-rose-300 font-bold border border-rose-800/50"
                          : effectiveTheme === "light"
                            ? "hover:bg-slate-100 text-slate-700"
                            : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-xs ${effectiveTheme === "light" ? "text-slate-900" : "text-slate-100"}`}>Kategori Tanding</span>
                          <span className="px-1.5 py-0.2 text-[8px] font-black bg-rose-600 text-white rounded">LIVE</span>
                        </div>
                        <p className={`text-[10px] ${effectiveTheme === "light" ? "text-slate-500" : "text-slate-400"}`}>Pertarungan tanding sudut merah/biru</p>
                      </div>
                    </button>

                    <button
                      onClick={() => onSelectTab("SENI")}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between mt-1 ${
                        activeTab === "SENI"
                          ? effectiveTheme === "light"
                            ? "bg-amber-50 text-amber-800 font-bold border border-amber-200"
                            : "bg-amber-950/70 text-amber-300 font-bold border border-amber-800/50"
                          : effectiveTheme === "light"
                            ? "hover:bg-slate-100 text-slate-700"
                            : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-xs ${effectiveTheme === "light" ? "text-slate-900" : "text-slate-100"}`}>Kategori Seni</span>
                          <span className="px-1.5 py-0.2 text-[8px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 rounded">TGR</span>
                        </div>
                        <p className={`text-[10px] ${effectiveTheme === "light" ? "text-slate-500" : "text-slate-400"}`}>Tunggal, ganda & regu silat</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. MONITOR WITH DROPDOWN */}
            <div
              className="relative"
              ref={monitorDropdownRef}
              onMouseEnter={onMouseEnterMonitor}
              onMouseLeave={onMouseLeaveMonitor}
            >
              <button
                onClick={onToggleMonitor}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isMonitorActive
                    ? effectiveTheme === "light"
                      ? "bg-amber-50 text-amber-800 font-extrabold border border-amber-200 shadow-xs"
                      : "bg-amber-950/70 text-amber-300 font-extrabold border border-amber-800/80 shadow-xs"
                    : effectiveTheme === "light"
                      ? "text-slate-600 hover:text-amber-600 hover:bg-slate-100 border border-transparent"
                      : "text-slate-300 hover:text-amber-400 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <span>Monitor</span>
                <span className={`text-[10px] ml-0.5 transition-transform duration-200 ${
                  monitorDropdownOpen 
                    ? effectiveTheme === "light" ? "rotate-180 text-amber-600" : "rotate-180 text-amber-400" 
                    : "text-slate-400"
                }`}>▾</span>
              </button>

              {/* MONITOR DROPDOWN POPOVER */}
              {monitorDropdownOpen && (
                <div 
                  className="absolute left-0 top-full pt-1.5 w-64 z-50 animate-fadeIn max-h-none overflow-visible"
                  onMouseEnter={onMouseEnterMonitor}
                  onMouseLeave={onMouseLeaveMonitor}
                >
                  <div className={`rounded-2xl backdrop-blur-xl border shadow-2xl p-2 ${
                    effectiveTheme === "light"
                      ? "bg-white/98 border-slate-200 text-slate-800"
                      : "bg-[#0c1630]/98 border-blue-900/60 text-slate-200"
                  }`}>
                    <div className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider border-b mb-1 flex items-center justify-between ${
                      effectiveTheme === "light" ? "text-slate-500 border-slate-200" : "text-slate-400 border-slate-800"
                    }`}>
                      <span>Layar Monitor:</span>
                      <span className="text-[9px] text-emerald-500 font-sans font-bold">Bebas Akses</span>
                    </div>

                    <button
                      onClick={() => onSelectTab("MONITOR_TANDING")}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between ${
                        (activeTab as string) === "MONITOR_TANDING"
                          ? effectiveTheme === "light"
                            ? "bg-rose-50 text-rose-700 font-bold border border-rose-200"
                            : "bg-rose-950/70 text-rose-300 font-bold border border-rose-800/50"
                          : effectiveTheme === "light"
                            ? "hover:bg-slate-100 text-slate-700"
                            : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-xs ${effectiveTheme === "light" ? "text-slate-900" : "text-slate-100"}`}>Monitor Tanding</span>
                          <span className="px-1.5 py-0.2 text-[8px] font-black bg-rose-600 text-white rounded">LIVE</span>
                        </div>
                        <p className={`text-[10px] ${effectiveTheme === "light" ? "text-slate-500" : "text-slate-400"}`}>Layar penonton tanding</p>
                      </div>
                    </button>

                    <button
                      onClick={() => onSelectTab("MONITOR_SENI")}
                      className={`w-full text-left p-2 rounded-xl transition-all cursor-pointer flex items-center justify-between mt-1 ${
                        (activeTab as string) === "MONITOR_SENI"
                          ? effectiveTheme === "light"
                            ? "bg-amber-50 text-amber-800 font-bold border border-amber-200"
                            : "bg-amber-950/70 text-amber-300 font-bold border border-amber-800/50"
                          : effectiveTheme === "light"
                            ? "hover:bg-slate-100 text-slate-700"
                            : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-xs ${effectiveTheme === "light" ? "text-slate-900" : "text-slate-100"}`}>Monitor Seni</span>
                          <span className="px-1.5 py-0.2 text-[8px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 rounded">TGR</span>
                        </div>
                        <p className={`text-[10px] ${effectiveTheme === "light" ? "text-slate-500" : "text-slate-400"}`}>Layar penonton seni</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 6. KONTAK */}
            <button
              onClick={() => onSelectTab("KONTAK")}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "KONTAK"
                  ? effectiveTheme === "light"
                    ? "bg-teal-50 text-teal-700 font-extrabold border border-teal-200 shadow-xs"
                    : "bg-teal-950/70 text-teal-300 font-extrabold border border-teal-800/80 shadow-xs"
                  : effectiveTheme === "light"
                    ? "text-slate-600 hover:text-teal-600 hover:bg-slate-100 border border-transparent"
                    : "text-slate-300 hover:text-teal-400 hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <span>Kontak</span>
            </button>

            {/* 7. PANEL ADMIN (HANYA DITAMPILKAN KETIKA LOGIN MENGGUNAKAN ID SUPERADMIN) */}
            {currentUser?.role === "superadmin" && (
              <button
                onClick={() => onSelectTab("ADMIN_PANEL")}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "ADMIN_PANEL"
                    ? effectiveTheme === "light"
                      ? "bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 shadow-xs"
                      : "bg-emerald-950/70 text-emerald-300 font-extrabold border border-emerald-800/80 shadow-xs"
                    : effectiveTheme === "light"
                      ? "text-slate-600 hover:text-emerald-600 hover:bg-slate-100 border border-transparent"
                      : "text-slate-300 hover:text-emerald-400 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <span>Panel Admin</span>
              </button>
            )}
          </>
        )}
      </div>

    </div>
  );
}
