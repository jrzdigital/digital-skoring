import React, { useState, useRef, useEffect } from "react";
import { 
  Maximize2, 
  Minimize2, 
  Menu, 
  X, 
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Play,
  FileText,
  Lock,
  Users,
  Scale,
  GitBranch,
  Calendar,
  Medal,
  Search,
  HelpCircle,
  Bell,
  User,
  Sun,
  Tv,
  Swords,
  ShieldCheck,
  Home,
  Phone,
  LogOut,
  Check
} from "lucide-react";
import { PortalTab, AdminSubTab } from "../../types/portal";
import { sound } from "../../utils/sound";
import { MatchStatus, UserAccount } from "../../types";
import { rtdbScoringEngine } from "../../services/rtdbScoringEngine";
import { offlineEngine } from "../../utils/offlineEngine";
import { NavbarTopRow } from "./navbar/NavbarTopRow";
import { NavbarMenuRow } from "./navbar/NavbarMenuRow";
import { NavbarMobileDrawer } from "./navbar/NavbarMobileDrawer";

interface PortalNavbarProps {
  activeTab: PortalTab;
  onTabChange: (tab: PortalTab, subTab?: AdminSubTab) => void;
  selectedArena: string;
  onArenaChange: (arena: string) => void;
  firebaseConnected: boolean;
  onOpenFirebaseModal?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  subTitle?: string;
  adminSubTab?: AdminSubTab;
  onAdminSubTabChange?: (subTab: AdminSubTab) => void;
  currentUser?: UserAccount | null;
  onOpenSignModal?: (notice?: string, isRestricted?: boolean) => void;
  onLogout?: () => void;
  theme?: "light" | "dark";
  toggleTheme?: () => void;
  effectiveTheme?: "light" | "dark";
}

export function PortalNavbar({
  activeTab,
  onTabChange,
  selectedArena,
  onArenaChange,
  firebaseConnected,
  onOpenFirebaseModal,
  isFullscreen,
  onToggleFullscreen,
  subTitle,
  adminSubTab = "ATLET",
  onAdminSubTabChange,
  currentUser,
  onOpenSignModal,
  onLogout,
  theme = "dark",
  toggleTheme = () => {},
  effectiveTheme = "dark"
}: PortalNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [arenaDropdownOpen, setArenaDropdownOpen] = useState(false);
  const [showMatchSelectorModal, setShowMatchSelectorModal] = useState(false);
  
  // Dynamic Tournament Matches Schedules State
  const [schedules, setSchedules] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("jrz_cached_schedules");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [athletes, setAthletes] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("jrz_portal_athletes");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const reloadMatches = () => {
    try {
      const savedSch = localStorage.getItem("jrz_cached_schedules");
      if (savedSch) setSchedules(JSON.parse(savedSch));
      const savedAtl = localStorage.getItem("jrz_portal_athletes");
      if (savedAtl) setAthletes(JSON.parse(savedAtl));
    } catch (e) {}
    fetch("/api/matches-schedule")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setSchedules(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    reloadMatches();
    const handleSync = () => reloadMatches();
    window.addEventListener("jrz_schedules_updated", handleSync);
    window.addEventListener("jrz_athletes_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("jrz_schedules_updated", handleSync);
      window.removeEventListener("jrz_athletes_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const availableMatches = React.useMemo(() => {
    if (schedules && schedules.length > 0) {
      return schedules.map((m, idx) => ({
        id: m.id || `sched-${idx}`,
        partai: m.matchNumber || `Partai ${idx + 1 < 10 ? "0" + (idx + 1) : idx + 1}`,
        matchNumber: m.matchNumber || `Partai ${idx + 1 < 10 ? "0" + (idx + 1) : idx + 1}`,
        kelas: m.classCategory || "Tanding Bebas",
        stage: m.stage || "PENYISIHAN",
        red: m.fighterRedName || "PESILAT MERAH",
        redClub: m.fighterRedClub || "KONTINGEN MERAH",
        blue: m.fighterBlueName || "PESILAT BIRU",
        blueClub: m.fighterBlueClub || "KONTINGEN BIRU",
        status: m.status || "BELUM",
        arena: m.arena || selectedArena,
        gender: m.gender || "PUTRA",
        categoryType: m.categoryType || (m.classCategory?.toUpperCase().includes("SENI") ? "SENI" : "TANDING")
      }));
    }

    const tanding = athletes.filter(a => a.category === "TANDING");
    const list: any[] = [];
    for (let i = 0; i < tanding.length; i += 2) {
      const red = tanding[i];
      const blue = tanding[i + 1];
      const pNum = Math.floor(i / 2) + 1;
      list.push({
        id: `match-pair-${red.id}`,
        partai: `Partai ${pNum < 10 ? "0" + pNum : pNum}`,
        matchNumber: `Partai ${pNum < 10 ? "0" + pNum : pNum}`,
        kelas: red.classCategory || "Tanding Kelas A Putra",
        stage: "PENYISIHAN",
        red: red.name,
        redClub: red.contingent,
        blue: blue ? blue.name : "MENUNGGU LAWAN",
        blueClub: blue ? blue.contingent : "-",
        status: "BELUM",
        arena: red.arena || selectedArena,
        gender: red.gender,
        categoryType: "TANDING"
      });
    }

    const seni = athletes.filter(a => a.category === "SENI");
    seni.forEach((s, idx) => {
      const pNum = list.length + 1;
      list.push({
        id: `match-seni-${s.id}`,
        partai: `Partai ${pNum < 10 ? "0" + pNum : pNum} (Seni)`,
        matchNumber: `Partai ${pNum < 10 ? "0" + pNum : pNum} (Seni)`,
        kelas: `${s.classCategory || "Seni Tunggal"} (${s.gender})`,
        stage: "PENYISIHAN",
        red: s.name,
        redClub: s.contingent,
        blue: "-",
        blueClub: "-",
        status: "BELUM",
        arena: s.arena || selectedArena,
        gender: s.gender,
        categoryType: "SENI"
      });
    });

    return list;
  }, [schedules, athletes, selectedArena]);

  const handleActivateMatch = (match: any) => {
    sound.playClick();
    const isSeni = (match.categoryType === "SENI") || 
      (match.kelas && match.kelas.toUpperCase().includes("SENI")) || 
      (match.partai && match.partai.toUpperCase().includes("SENI"));

    if (isSeni) {
      const newSeniState = {
        id: "seni-" + (match.id || Date.now()),
        matchNumber: match.partai || match.matchNumber || "Partai Seni",
        pool: "Pool Utama",
        arena: match.arena || selectedArena,
        category: match.category || "TUNGGAL",
        ageDivision: match.ageDivision || "DEWASA",
        gender: match.gender || "PUTRA",
        athleteName: match.red || match.fighterRedName || "PESILAT SENI",
        contingent: match.redClub || match.fighterRedClub || "KONTINGEN",
        targetDurationSeconds: 180,
        elapsedSeconds: 0,
        timerStatus: "IDLE",
        juryScores: {
          1: { juryId: 1, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
          2: { juryId: 2, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
          3: { juryId: 3, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
          4: { juryId: 4, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true },
          5: { juryId: 5, kebenaranScore: 9.80, kemantapanScore: 0.10, totalScore: 9.90, confirmed: true }
        },
        penalties: { boundaryViolationCount: 0, costumeViolation: false, weaponDropViolation: false, timeDeviationSeconds: 0, manualDeduction: 0, totalPenaltyDeduction: 0 },
        medianScore: 9.90,
        finalScore: 9.90,
        status: "BELUM_TAMPIL"
      };
      try {
        localStorage.setItem("jrz_portal_seni_state", JSON.stringify(newSeniState));
        window.dispatchEvent(new CustomEvent("jrz_portal_seni_updated", { detail: newSeniState }));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {}
      onTabChange("SENI");
    } else {
      // TANDING
      const tandingPayload = {
        id: "match-" + (match.id || Date.now()),
        matchNumber: match.partai || match.matchNumber || "Partai -",
        fighterRedName: match.red || match.fighterRedName || "PESILAT MERAH",
        fighterRedClub: match.redClub || match.fighterRedClub || "CONTINGENT MERAH",
        fighterBlueName: match.blue || match.fighterBlueName || "PESILAT BIRU",
        fighterBlueClub: match.blueClub || match.fighterBlueClub || "CONTINGENT BIRU",
        classCategory: match.kelas || match.classCategory || "Tanding Bebas",
        gender: match.gender || "PUTRA",
        stage: match.stage || "PENYISIHAN",
        arena: match.arena || selectedArena,
        status: MatchStatus.IDLE,
        activeRound: 1,
        timeLeft: 120,
        roundDuration: 120,
        roundCount: 3,
        scoreRed: 0,
        scoreBlue: 0
      };

      try {
        window.dispatchEvent(new CustomEvent("jrz_activate_match", { detail: tandingPayload }));
        offlineEngine.broadcast(tandingPayload as any);
        rtdbScoringEngine.handleResetMatch(tandingPayload as any).catch(() => {});
        if (match.id) {
          fetch("/api/matches-schedule/load", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId: match.id })
          }).catch(() => {});
        }
        fetch("/api/match-state/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: tandingPayload })
        }).catch(() => {});
      } catch (e) {}

      onTabChange("TANDING");
    }
    setShowMatchSelectorModal(false);
    setAdministrasiDropdownOpen(false);
    setMobileMenuOpen(false);
  };
  
  // Dropdown states
  const [administrasiDropdownOpen, setAdministrasiDropdownOpen] = useState(false);
  const [skoringDropdownOpen, setSkoringDropdownOpen] = useState(false);
  const [monitorDropdownOpen, setMonitorDropdownOpen] = useState(false);

  // Mobile accordion states
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);
  const [mobileSkoringOpen, setMobileSkoringOpen] = useState(false);
  const [mobileMonitorOpen, setMobileMonitorOpen] = useState(false);

  // Refs for click outside
  const adminDropdownRef = useRef<HTMLDivElement>(null);
  const skoringDropdownRef = useRef<HTMLDivElement>(null);
  const monitorDropdownRef = useRef<HTMLDivElement>(null);

  // Hover Debounce Timeouts (200ms grace period)
  const adminHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skoringHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const monitorHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Administrasi Hover Handlers
  const handleMouseEnterAdmin = () => {
    if (adminHoverTimeoutRef.current) {
      clearTimeout(adminHoverTimeoutRef.current);
      adminHoverTimeoutRef.current = null;
    }
    setAdministrasiDropdownOpen(true);
  };

  const handleMouseLeaveAdmin = () => {
    if (adminHoverTimeoutRef.current) {
      clearTimeout(adminHoverTimeoutRef.current);
    }
    adminHoverTimeoutRef.current = setTimeout(() => {
      setAdministrasiDropdownOpen(false);
    }, 200);
  };

  // 2. Digital Skoring Hover Handlers
  const handleMouseEnterSkoring = () => {
    if (skoringHoverTimeoutRef.current) {
      clearTimeout(skoringHoverTimeoutRef.current);
      skoringHoverTimeoutRef.current = null;
    }
    setSkoringDropdownOpen(true);
  };

  const handleMouseLeaveSkoring = () => {
    if (skoringHoverTimeoutRef.current) {
      clearTimeout(skoringHoverTimeoutRef.current);
    }
    skoringHoverTimeoutRef.current = setTimeout(() => {
      setSkoringDropdownOpen(false);
    }, 200);
  };

  // 3. Monitor Hover Handlers
  const handleMouseEnterMonitor = () => {
    if (monitorHoverTimeoutRef.current) {
      clearTimeout(monitorHoverTimeoutRef.current);
      monitorHoverTimeoutRef.current = null;
    }
    setMonitorDropdownOpen(true);
  };

  const handleMouseLeaveMonitor = () => {
    if (monitorHoverTimeoutRef.current) {
      clearTimeout(monitorHoverTimeoutRef.current);
    }
    monitorHoverTimeoutRef.current = setTimeout(() => {
      setMonitorDropdownOpen(false);
    }, 200);
  };

  // Close dropdowns when clicking outside or unmounting
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(target)) {
        setAdministrasiDropdownOpen(false);
      }
      if (skoringDropdownRef.current && !skoringDropdownRef.current.contains(target)) {
        setSkoringDropdownOpen(false);
      }
      if (monitorDropdownRef.current && !monitorDropdownRef.current.contains(target)) {
        setMonitorDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (adminHoverTimeoutRef.current) clearTimeout(adminHoverTimeoutRef.current);
      if (skoringHoverTimeoutRef.current) clearTimeout(skoringHoverTimeoutRef.current);
      if (monitorHoverTimeoutRef.current) clearTimeout(monitorHoverTimeoutRef.current);
    };
  }, []);

  const handleSelectTab = (tab: PortalTab) => {
    if (adminHoverTimeoutRef.current) clearTimeout(adminHoverTimeoutRef.current);
    if (skoringHoverTimeoutRef.current) clearTimeout(skoringHoverTimeoutRef.current);
    if (monitorHoverTimeoutRef.current) clearTimeout(monitorHoverTimeoutRef.current);
    sound.playClick();

    // User requirement: Jika belum login, akses hanya bisa memantau dan tidak bisa masuk skoring digital
    if ((tab === "TANDING" || tab === "SENI") && !currentUser) {
      setMobileMenuOpen(false);
      setAdministrasiDropdownOpen(false);
      setSkoringDropdownOpen(false);
      setMonitorDropdownOpen(false);
      if (onOpenSignModal) {
        onOpenSignModal(
          "Akses Sistem Digital Skoring Terbatas! Pengguna tanpa akun hanya dapat memantau melalui menu Monitor Pertandingan atau melihat Bagan & Jadwal. Silakan Masuk (Login) dengan akun yang telah didaftarkan.",
          true
        );
      }
      return;
    }

    onTabChange(tab);
    setMobileMenuOpen(false);
    setAdministrasiDropdownOpen(false);
    setSkoringDropdownOpen(false);
    setMonitorDropdownOpen(false);
  };

  const handleSelectAdminSubTab = (subTab: AdminSubTab) => {
    if (adminHoverTimeoutRef.current) clearTimeout(adminHoverTimeoutRef.current);
    sound.playClick();
    if (onAdminSubTabChange) {
      onAdminSubTabChange(subTab);
    }
    onTabChange("ADMINISTRASI", subTab);
    setMobileMenuOpen(false);
    setAdministrasiDropdownOpen(false);
  };

  const isSkoringActive = activeTab === "TANDING" || activeTab === "SENI";
  const isMonitorActive = activeTab === "MONITOR_TANDING" || activeTab === "MONITOR_SENI";
  const isAdministrasiActive = activeTab === "ADMINISTRASI";

  return (
    <header className={`sticky top-0 z-50 w-full backdrop-blur-md select-none transition-all ${
      effectiveTheme === "light"
        ? "bg-white/95 border-b border-slate-200 shadow-sm text-slate-800"
        : "bg-[#070d1e]/95 border-b border-blue-900/50 shadow-2xl text-slate-100"
    }`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        {/* TOP ROW: BRANDING, SEARCH BAR, PROFILE, UTILITIES */}
        <NavbarTopRow
          currentUser={currentUser}
          activeTab={activeTab}
          isMonitorActive={isMonitorActive}
          subTitle={subTitle}
          selectedArena={selectedArena}
          onArenaChange={onArenaChange}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          onSelectTab={handleSelectTab}
          onSelectAdminSubTab={handleSelectAdminSubTab}
          onOpenMatchSelector={() => {
            sound.playClick();
            setShowMatchSelectorModal(true);
          }}
          onOpenSignModal={onOpenSignModal}
          onLogout={onLogout}
          firebaseConnected={firebaseConnected}
          theme={theme}
          toggleTheme={toggleTheme}
          effectiveTheme={effectiveTheme}
        />

        {/* BOTTOM ROW: HORIZONTAL NAV MENUS MATCHING REFERENCE */}
        <div className="hidden md:block">
          <NavbarMenuRow
            activeTab={activeTab}
            adminSubTab={adminSubTab}
            isMonitorActive={isMonitorActive}
            currentUser={currentUser}
            administrasiDropdownOpen={administrasiDropdownOpen}
            skoringDropdownOpen={skoringDropdownOpen}
            monitorDropdownOpen={monitorDropdownOpen}
            onMouseEnterAdmin={handleMouseEnterAdmin}
            onMouseLeaveAdmin={handleMouseLeaveAdmin}
            onToggleAdmin={() => {
              sound.playClick();
              setAdministrasiDropdownOpen(!administrasiDropdownOpen);
            }}
            onMouseEnterSkoring={handleMouseEnterSkoring}
            onMouseLeaveSkoring={handleMouseLeaveSkoring}
            onToggleSkoring={() => {
              sound.playClick();
              setSkoringDropdownOpen(!skoringDropdownOpen);
            }}
            onMouseEnterMonitor={handleMouseEnterMonitor}
            onMouseLeaveMonitor={handleMouseLeaveMonitor}
            onToggleMonitor={() => {
              sound.playClick();
              setMonitorDropdownOpen(!monitorDropdownOpen);
            }}
            adminDropdownRef={adminDropdownRef}
            skoringDropdownRef={skoringDropdownRef}
            monitorDropdownRef={monitorDropdownRef}
            onSelectTab={handleSelectTab}
            onSelectAdminSubTab={handleSelectAdminSubTab}
            onOpenMatchSelector={() => {
              sound.playClick();
              setShowMatchSelectorModal(true);
            }}
            onOpenSignModal={onOpenSignModal}
            theme={theme}
            toggleTheme={toggleTheme}
            effectiveTheme={effectiveTheme}
          />
        </div>

        {/* MOBILE MENU DRAWER */}
        {mobileMenuOpen && (
          <NavbarMobileDrawer
            activeTab={activeTab}
            adminSubTab={adminSubTab}
            isMonitorActive={isMonitorActive}
            currentUser={currentUser}
            onSelectTab={handleSelectTab}
            onSelectAdminSubTab={handleSelectAdminSubTab}
            onOpenMatchSelector={() => {
              sound.playClick();
              setShowMatchSelectorModal(true);
            }}
            onOpenSignModal={onOpenSignModal}
            onLogout={onLogout}
            onClose={() => setMobileMenuOpen(false)}
            theme={theme}
            toggleTheme={toggleTheme}
            effectiveTheme={effectiveTheme}
          />
        )}
      </div>

      {/* MODAL DIALOG: PILIH & AKTIFKAN PARTAI PERTANDINGAN (REAL-TIME SYNC) */}
      {showMatchSelectorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b1426] border border-blue-500/50 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-left">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-blue-900/50 bg-blue-950/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/30">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <span>Pilih & Aktifkan Partai Pertandingan</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-400 text-[10px] font-mono">
                      Real-Time Sync
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Aktifkan langsung ke seluruh panel (Sekretaris, Dewan, Juri, Monitor) sesuai pilihan partai
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMatchSelectorModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Match List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {availableMatches.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-medium">Belum ada partai pertandingan yang tersedia.</p>
                  <p className="text-xs text-slate-500 mt-1">Daftarkan atlet di Administrasi untuk membentuk partai pertandingan secara otomatis.</p>
                </div>
              ) : (
                availableMatches.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-blue-900/50 hover:border-blue-500/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/30">
                          {m.partai}
                        </span>
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase border ${
                          m.categoryType === "SENI" 
                            ? "bg-purple-950/60 text-purple-300 border-purple-800" 
                            : "bg-blue-950/60 text-cyan-300 border-blue-800"
                        }`}>
                          {m.categoryType || "TANDING"}
                        </span>
                        <span className="text-[11px] text-slate-300 font-medium truncate">
                          {m.kelas}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-cyan-400">
                          Gelanggang {m.arena || selectedArena}
                        </span>
                      </div>

                      {/* Opponents matchup */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-blue-950/30 border-l-2 border-blue-500 px-2 py-1 rounded-r">
                          <div className="text-[9px] text-blue-400 font-bold uppercase font-mono">SUDUT BIRU</div>
                          <div className="font-bold text-white truncate">{m.blue}</div>
                          <div className="text-[9px] text-slate-400 truncate">{m.blueClub}</div>
                        </div>
                        <div className="bg-red-950/30 border-l-2 border-red-500 px-2 py-1 rounded-r">
                          <div className="text-[9px] text-red-400 font-bold uppercase font-mono">SUDUT MERAH</div>
                          <div className="font-bold text-white truncate">{m.red}</div>
                          <div className="text-[9px] text-slate-400 truncate">{m.redClub}</div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleActivateMatch(m)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 shrink-0 cursor-pointer active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Aktifkan Sekarang →</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-blue-900/40 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">Total {availableMatches.length} partai terdaftar</span>
              <button
                onClick={() => setShowMatchSelectorModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
