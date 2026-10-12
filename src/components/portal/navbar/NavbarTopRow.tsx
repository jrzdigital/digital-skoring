import React, { useState, useRef, useEffect } from "react";
import { 
  Maximize2, 
  Minimize2, 
  Menu, 
  X, 
  ChevronDown, 
  Search, 
  HelpCircle, 
  Bell, 
  User, 
  Sun, 
  Moon,
  ShieldCheck, 
  LogOut, 
  LogIn,
  Check, 
  Home, 
  FileText, 
  Swords, 
  Tv, 
  Phone, 
  GitBranch, 
  Calendar, 
  Scale, 
  Users, 
  Medal, 
  Play 
} from "lucide-react";
import { PortalTab, AdminSubTab } from "../../../types/portal";
import { sound } from "../../../utils/sound";
import { UserAccount } from "../../../types";

interface NavbarTopRowProps {
  currentUser?: UserAccount | null;
  activeTab: PortalTab;
  isMonitorActive: boolean;
  subTitle?: string;
  selectedArena: string;
  onArenaChange: (arena: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onSelectTab: (tab: PortalTab) => void;
  onSelectAdminSubTab: (subTab: AdminSubTab) => void;
  onOpenMatchSelector: () => void;
  onOpenSignModal?: (notice?: string, isRestricted?: boolean) => void;
  onLogout?: () => void;
  firebaseConnected?: boolean;
  theme?: "light" | "dark";
  toggleTheme?: () => void;
  effectiveTheme?: "light" | "dark";
}

export function NavbarTopRow({
  currentUser,
  activeTab,
  isMonitorActive,
  subTitle,
  selectedArena,
  onArenaChange,
  isFullscreen,
  onToggleFullscreen,
  mobileMenuOpen,
  setMobileMenuOpen,
  onSelectTab,
  onSelectAdminSubTab,
  onOpenMatchSelector,
  onOpenSignModal,
  onLogout,
  firebaseConnected = true,
  theme = "dark",
  toggleTheme = () => {},
  effectiveTheme = "dark"
}: NavbarTopRowProps) {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [arenaDropdownOpen, setArenaDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const arenaDropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationOpen(false);
      }
      if (arenaDropdownRef.current && !arenaDropdownRef.current.contains(target)) {
        setArenaDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
      if (e.key === "Escape") {
        setSearchFocused(false);
        setUserDropdownOpen(false);
        setNotificationOpen(false);
        setArenaDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Searchable Items Palette
  const searchableNavItems = [
    { title: "Beranda Utama", category: "Navigasi", icon: Home, action: () => onSelectTab("BERANDA") },
    { title: "Bagan & Jadwal Pertandingan", category: "Jadwal", icon: GitBranch, action: () => onSelectAdminSubTab("BAGAN") },
    { title: "Data Atlet & Kontingen", category: "Administrasi", icon: Users, action: () => onSelectAdminSubTab("ATLET") },
    { title: "Timbang Badan Atlet (Weigh-in)", category: "Administrasi", icon: Scale, action: () => onSelectAdminSubTab("TIMBANG") },
    { title: "Bagan Pertandingan", category: "Administrasi", icon: GitBranch, action: () => onSelectAdminSubTab("BAGAN") },
    { title: "Jadwal Pertandingan Gelanggang", category: "Administrasi", icon: Calendar, action: () => onSelectAdminSubTab("JADWAL") },
    { title: "Klasemen Perolehan Medali", category: "Administrasi", icon: Medal, action: () => onSelectAdminSubTab("MEDALI") },
    { title: "Pilih & Aktifkan Partai (Live)", category: "Administrasi", icon: Play, action: onOpenMatchSelector },
    { title: "Digital Skoring Kategori Tanding", category: "Skoring", icon: Swords, action: () => onSelectTab("TANDING") },
    { title: "Digital Skoring Kategori Seni", category: "Skoring", icon: Medal, action: () => onSelectTab("SENI") },
    { title: "Monitor Penonton Tanding", category: "Monitor", icon: Tv, action: () => onSelectTab("MONITOR_TANDING") },
    { title: "Monitor Penonton Seni", category: "Monitor", icon: Tv, action: () => onSelectTab("MONITOR_SENI") },
    { title: "Kontak Person & Helpdesk", category: "Bantuan", icon: Phone, action: () => onSelectTab("KONTAK") },
    ...(currentUser?.role === "superadmin" || currentUser?.role === "admin"
      ? [{ title: "Panel Administrasi Superadmin", category: "Admin", icon: ShieldCheck, action: () => onSelectTab("ADMIN_PANEL") }]
      : [])
  ];

  const searchResults = searchQuery.trim() === ""
    ? searchableNavItems.slice(0, 6)
    : searchableNavItems.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <div className="h-14 sm:h-16 px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 select-none">
      
      {/* 1. BRANDING & LOGO */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onSelectTab("BERANDA")}
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group text-left border-none bg-transparent p-0 focus:outline-none"
          title="Kembali ke Beranda JRZ SCORE"
          id="btn-header-branding"
        >
          {/* Logo JRZ SCORE (Menggantikan Logo IPSI, tanpa logo ganda) */}
          <img 
            src="/jrzscoreutama.png" 
            alt="Logo JRZ SCORE" 
            className="h-7 sm:h-8 w-auto max-w-[36px] sm:max-w-[40px] object-contain shrink-0 filter drop-shadow-md group-hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />

          {/* Dual-tone Brand Typography matching 'djp CORETAX' in reference */}
          <div className="flex items-center gap-1 shrink-0 ml-0.5">
            <span className={`font-sans font-black text-sm sm:text-base lg:text-lg tracking-tight leading-none ${
              effectiveTheme === "light" ? "text-slate-900" : "text-white"
            }`}>
              JRZ
            </span>
            <span className="font-sans font-black text-sm sm:text-base lg:text-lg tracking-tight text-amber-500 leading-none">
              SCORE
            </span>
            <span className={`hidden md:inline-block px-1.5 py-0.2 text-[8.5px] font-mono font-bold rounded border ml-1 ${
              isMonitorActive 
                ? "bg-rose-950/70 text-rose-300 border-rose-800/60" 
                : effectiveTheme === "light"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-blue-950/70 text-blue-300 border-blue-800/60"
            }`}>
              {isMonitorActive ? "MONITOR" : "IPSI"}
            </span>
          </div>
        </button>
      </div>

      {/* 2. SEARCH BAR (CENTER) */}
      <div className="relative flex-1 max-w-md hidden md:block" ref={searchContainerRef}>
        <div className="relative flex items-center">
          <Search className={`w-4 h-4 absolute left-3 pointer-events-none ${effectiveTheme === "light" ? "text-slate-400" : "text-slate-400"}`} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Cari layanan, jadwal, atlet..."
            className={`w-full text-xs pl-9 pr-16 py-2 rounded-xl border transition-all outline-none ${
              effectiveTheme === "light"
                ? "bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-slate-800 placeholder-slate-400 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                : "bg-slate-900/80 hover:bg-slate-900 focus:bg-[#0c1630] text-slate-100 placeholder-slate-400 border-slate-700/70 hover:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            }`}
            id="input-navbar-search"
          />
          <div className="absolute right-2.5 flex items-center gap-0.5 pointer-events-none">
            <kbd className={`px-1.5 py-0.5 text-[9.5px] font-mono font-bold rounded border leading-none ${
              effectiveTheme === "light"
                ? "text-slate-600 bg-white border-slate-300"
                : "text-slate-300 bg-slate-800 border-slate-700"
            }`}>
              Ctrl
            </kbd>
            <kbd className={`px-1.5 py-0.5 text-[9.5px] font-mono font-bold rounded border leading-none ${
              effectiveTheme === "light"
                ? "text-slate-600 bg-white border-slate-300"
                : "text-slate-300 bg-slate-800 border-slate-700"
            }`}>
              K
            </kbd>
          </div>
        </div>

        {/* Search Results Dropdown Popover */}
        {searchFocused && (
          <div className={`absolute left-0 top-full mt-1.5 w-full rounded-2xl border shadow-2xl p-2 z-50 animate-fadeIn ${
            effectiveTheme === "light"
              ? "bg-white/98 backdrop-blur-xl border-slate-200 text-slate-800"
              : "bg-[#0c1630]/98 backdrop-blur-xl border-blue-900/60 text-slate-200"
          }`}>
            <div className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-between border-b mb-1 ${
              effectiveTheme === "light" ? "text-slate-500 border-slate-200" : "text-slate-400 border-slate-800"
            }`}>
              <span>{searchQuery ? "Hasil Pencarian:" : "Navigasi Cepat:"}</span>
              <span className="text-[9px] text-blue-500 font-sans font-medium">{searchResults.length} opsi</span>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-0.5">
              {searchResults.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  Tidak ada menu yang sesuai dengan "{searchQuery}"
                </div>
              ) : (
                searchResults.map((item, idx) => {
                  const ItemIcon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        sound.playClick();
                        item.action();
                        setSearchFocused(false);
                        setSearchQuery("");
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-colors text-left cursor-pointer group ${
                        effectiveTheme === "light"
                          ? "hover:bg-blue-50 text-slate-700 hover:text-blue-700"
                          : "hover:bg-blue-950/60 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-blue-950/80 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <ItemIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-200 group-hover:text-blue-300 truncate">{item.title}</div>
                          <div className="text-[10px] text-slate-400">{item.category}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-blue-400 shrink-0">↵</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. RIGHT UTILITY CONTROLS */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        
        {/* HELP / CONTACT ICON BUTTON */}
        <button
          onClick={() => {
            sound.playClick();
            onSelectTab("KONTAK");
          }}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            effectiveTheme === "light"
              ? "text-slate-600 hover:text-blue-600 hover:bg-slate-100"
              : "text-slate-300 hover:text-blue-400 hover:bg-slate-800/60"
          }`}
          title="Pusat Bantuan & Kontak Person"
          aria-label="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* THEME TOGGLE BUTTON (SUN / MOON) */}
        <button
          onClick={() => {
            sound.playClick();
            toggleTheme();
          }}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            effectiveTheme === "light"
              ? "text-amber-600 hover:text-amber-700 hover:bg-amber-100/70 border border-amber-200"
              : "text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 border border-amber-800/40"
          }`}
          title={theme === "dark" ? "Ubah ke Mode Siang (Light Mode)" : "Ubah ke Mode Malam (Dark Mode)"}
          aria-label="Toggle Theme"
          id="btn-navbar-theme-toggle"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-amber-600" />
          )}
        </button>

        {/* NOTIFICATION BELL WITH POPUP */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              sound.playClick();
              setNotificationOpen(!notificationOpen);
            }}
            className={`p-2 rounded-xl transition-colors relative cursor-pointer ${
              effectiveTheme === "light"
                ? "text-slate-600 hover:text-blue-600 hover:bg-slate-100"
                : "text-slate-300 hover:text-blue-400 hover:bg-slate-800/60"
            }`}
            title="Notifikasi Sistem"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border border-slate-900"></span>
          </button>

          {notificationOpen && (
            <div className={`absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl p-3 z-50 animate-fadeIn ${
              effectiveTheme === "light"
                ? "bg-white/98 backdrop-blur-xl border-slate-200 text-slate-800"
                : "bg-[#0c1630]/98 backdrop-blur-xl border-blue-900/60 text-slate-200"
            }`}>
              <div className={`flex items-center justify-between pb-2 border-b ${
                effectiveTheme === "light" ? "border-slate-200 text-slate-800" : "border-slate-800 text-slate-100"
              }`}>
                <span className="text-xs font-bold">Notifikasi Sistem</span>
                <span className="text-[10px] font-mono text-emerald-500 font-bold">ONLINE</span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className={`p-2 rounded-xl border ${
                  effectiveTheme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/80 border-slate-800"
                }`}>
                  <div className={`font-bold ${effectiveTheme === "light" ? "text-slate-800" : "text-slate-200"}`}>
                    Koneksi Database
                  </div>
                  <div className={`text-[11px] ${effectiveTheme === "light" ? "text-slate-500" : "text-slate-400"}`}>
                    {firebaseConnected ? "🟢 Terhubung ke Firebase RTDB" : "🟡 Berjalan dalam Mode Offline/Lokal"}
                  </div>
                </div>
                <div className={`p-2 rounded-xl border ${
                  effectiveTheme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/80 border-slate-800"
                }`}>
                  <div className={`font-bold ${effectiveTheme === "light" ? "text-slate-800" : "text-slate-200"}`}>
                    Gelanggang Aktif
                  </div>
                  <div className={`text-[11px] ${effectiveTheme === "light" ? "text-slate-500" : "text-slate-400"}`}>
                    Sedang memantau Gelanggang {selectedArena}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FLAG & ARENA SELECTOR DROPDOWN MATCHING 'ID' PILL */}
        <div className="relative hidden sm:block" ref={arenaDropdownRef}>
          <button
            onClick={() => {
              sound.playClick();
              setArenaDropdownOpen(!arenaDropdownOpen);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
              effectiveTheme === "light"
                ? "border-slate-300 hover:border-slate-400 bg-slate-100 hover:bg-slate-200/70 text-slate-800"
                : "border-slate-700/70 hover:border-slate-600 bg-slate-900/70 hover:bg-slate-800 text-slate-200"
            }`}
            title="Pilih Gelanggang Aktif"
            id="btn-arena-selector"
          >
            <span className="text-base leading-none">🇮🇩</span>
            <span>Gelanggang {selectedArena}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${arenaDropdownOpen ? "rotate-180 text-blue-500" : "text-slate-400"}`} />
          </button>

          {arenaDropdownOpen && (
            <div className={`absolute right-0 top-full mt-1.5 w-44 rounded-2xl border shadow-2xl p-1.5 z-50 animate-fadeIn ${
              effectiveTheme === "light"
                ? "bg-white/98 backdrop-blur-xl border-slate-200 text-slate-800"
                : "bg-[#0c1630]/98 backdrop-blur-xl border-blue-900/60 text-slate-200"
            }`}>
              <div className={`px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider ${
                effectiveTheme === "light" ? "text-slate-500" : "text-slate-400"
              }`}>
                Pilih Gelanggang:
              </div>
              {["A", "B", "C"].map((arena) => (
                <button
                  key={arena}
                  onClick={() => {
                    sound.playClick();
                    onArenaChange(arena);
                    setArenaDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    selectedArena === arena 
                      ? effectiveTheme === "light"
                        ? "bg-blue-50 text-blue-700 font-extrabold border border-blue-200"
                        : "bg-blue-950/70 text-blue-300 font-extrabold border border-blue-800/50" 
                      : effectiveTheme === "light"
                        ? "text-slate-700 hover:bg-slate-100"
                        : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🏟️</span>
                    <span>Gelanggang {arena}</span>
                  </div>
                  {selectedArena === arena && <Check className="w-3.5 h-3.5 text-blue-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* USER PROFILE PILL OR SIGN BUTTON */}
        <div className="relative" ref={userDropdownRef}>
          {currentUser ? (
            /* KETIKA ADA YANG LOGIN: TAMPILKAN FOTO PROFIL DAN NAMA PENGGUNA */
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setUserDropdownOpen(!userDropdownOpen);
              }}
              className={`flex items-center gap-2 px-2 sm:px-2.5 py-1 rounded-xl border transition-all cursor-pointer shadow-xs group focus:outline-none ${
                effectiveTheme === "light"
                  ? "border-slate-300 hover:border-slate-400 bg-slate-100 hover:bg-slate-200/70 text-slate-800"
                  : "border-slate-700/70 hover:border-slate-600 bg-slate-900/70 hover:bg-slate-800 text-slate-200"
              }`}
              title={`Akun: ${currentUser.fullName} (${currentUser.role})`}
              id="btn-user-account-pill"
            >
              {/* Foto Profil Pengguna */}
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-amber-500/60 shadow-xs flex items-center justify-center bg-slate-800">
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

              {/* Nama Pengguna */}
              <div className="flex flex-col text-left leading-tight min-w-0">
                <span className={`text-[11px] sm:text-xs font-bold tracking-tight uppercase truncate max-w-[85px] sm:max-w-[130px] transition-colors ${
                  effectiveTheme === "light"
                    ? "text-slate-900 group-hover:text-blue-600"
                    : "text-slate-100 group-hover:text-amber-400"
                }`}>
                  {currentUser.fullName}
                </span>
                <span className={`text-[9px] font-mono font-medium truncate max-w-[85px] sm:max-w-[130px] uppercase ${
                  effectiveTheme === "light" ? "text-slate-500" : "text-amber-400/80"
                }`}>
                  {currentUser.role}
                </span>
              </div>

              {/* Chevron Down */}
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userDropdownOpen ? "rotate-180 text-blue-500" : ""}`} />
            </button>
          ) : (
            /* KETIKA TIDAK ADA PENGGUNA YANG SIGN: TAMPILKAN TULISAN "Sign" DENGAN WARNA MERAH */
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                if (onOpenSignModal) onOpenSignModal();
              }}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white border border-rose-500 shadow-rose-950/40 active:scale-95 focus:outline-none"
              title="Masuk Akun (Sign In)"
              id="btn-navbar-sign"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign</span>
            </button>
          )}

          {/* User Dropdown Menu (Hanya ketika login) */}
          {currentUser && userDropdownOpen && (
            <div className={`absolute right-0 top-full mt-1.5 w-64 rounded-2xl border shadow-2xl p-2.5 z-50 animate-fadeIn ${
              effectiveTheme === "light"
                ? "bg-white/98 backdrop-blur-xl border-slate-200 text-slate-800"
                : "bg-[#0c1630]/98 backdrop-blur-xl border-blue-900/60 text-slate-200"
            }`}>
              <div className={`p-2.5 rounded-xl border mb-2 ${
                effectiveTheme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-900/80 border-slate-800"
              }`}>
                <div className={`text-xs font-bold truncate ${effectiveTheme === "light" ? "text-slate-900" : "text-white"}`}>
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">
                  {currentUser.role} • {currentUser.username}
                </div>
              </div>

              <div className="space-y-1">
                {currentUser?.role === "superadmin" && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onSelectTab("ADMIN_PANEL");
                      setUserDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition-colors text-left cursor-pointer ${
                      effectiveTheme === "light"
                        ? "text-amber-700 hover:bg-amber-50"
                        : "text-amber-400 hover:bg-amber-950/40"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span>Panel Administrasi Superadmin</span>
                  </button>
                )}

                {currentUser && currentUser.role !== "superadmin" && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onSelectTab("ADMIN_PANEL");
                      setUserDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition-colors text-left cursor-pointer ${
                      effectiveTheme === "light"
                        ? "text-blue-700 hover:bg-blue-50"
                        : "text-blue-400 hover:bg-blue-950/40"
                    }`}
                  >
                    <User className="w-4 h-4 text-blue-500" />
                    <span>Data Profil Pengguna</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    sound.playClick();
                    onOpenMatchSelector();
                    setUserDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition-colors text-left cursor-pointer ${
                    effectiveTheme === "light"
                      ? "text-blue-700 hover:bg-blue-50"
                      : "text-blue-400 hover:bg-blue-950/40"
                  }`}
                >
                  <Play className="w-4 h-4 text-blue-500" />
                  <span>Pilih & Aktifkan Partai (Live)</span>
                </button>

                <div className={`border-t my-1 ${effectiveTheme === "light" ? "border-slate-200" : "border-slate-800"}`}></div>

                {currentUser ? (
                  <button
                    onClick={() => {
                      sound.playClick();
                      if (onLogout) onLogout();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Keluar (Sign Out)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      sound.playClick();
                      if (onOpenSignModal) onOpenSignModal();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-sm"
                  >
                    <span>Masuk Akun (Sign In)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FULLSCREEN TOGGLE (4 DIAGONAL ARROWS ICON MATCHING REFERENCE) */}
        <button
          onClick={() => {
            sound.playClick();
            onToggleFullscreen();
          }}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            effectiveTheme === "light"
              ? "text-slate-600 hover:text-blue-600 hover:bg-slate-100"
              : "text-slate-300 hover:text-blue-400 hover:bg-slate-800/60"
          }`}
          title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh (Fullscreen)"}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-amber-500" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>

        {/* MOBILE MENU TOGGLE BUTTON */}
        <button
          onClick={() => {
            sound.playClick();
            setMobileMenuOpen(!mobileMenuOpen);
          }}
          className={`md:hidden p-2 rounded-xl transition-colors cursor-pointer ${
            effectiveTheme === "light"
              ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              : "text-slate-300 hover:text-white hover:bg-slate-800/60"
          }`}
          aria-label="Buka Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

      </div>

    </div>
  );
}
