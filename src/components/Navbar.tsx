import React, { useState } from 'react';
import { SchoolProfile, NotificationItem, UserAccount } from '../types';
import { SettingsTabType } from './SettingsModal';
import {
  LayoutDashboard,
  FileText,
  Users,
  Bell,
  Sun,
  Moon,
  Lock,
  UserCheck,
  Download,
  Calendar,
  Flame,
  Laptop,
  Home,
  Award,
  Settings,
  ArrowLeft,
  User,
  ShieldCheck,
  ScanLine,
  Maximize,
  Minimize,
  LogOut,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: SchoolProfile;
  currentUser: UserAccount;
  onOpenAuthModal: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onOpenPdfModal: () => void;
  onOpenSettingsModal: (tab?: SettingsTabType) => void;
  onOpenReminderModal: () => void;
  onOpenQRScanner?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenSuperAdmin?: () => void;
  onLogout?: () => void;
  pendingUsersCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  currentUser,
  onOpenAuthModal,
  theme,
  onToggleTheme,
  notifications,
  onMarkNotificationRead,
  onOpenPdfModal,
  onOpenSettingsModal,
  onOpenReminderModal,
  onOpenQRScanner,
  onToggleFullscreen,
  isFullscreen = false,
  onOpenSuperAdmin,
  onLogout,
  pendingUsersCount = 0,
}) => {
  const [showNotifs, setShowNotifs] = useState<boolean>(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header 
      className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-red-900/40 shadow-2xl transition-all"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Brand */}
          <div
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
            title="Buka Beranda / Landing Page"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-zinc-900 border border-red-800/60 flex items-center justify-center text-red-500 shadow-md shadow-red-950/40 group-hover:scale-105 transition-transform">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <h1 className="text-base sm:text-lg font-bold tracking-tighter text-red-600 leading-none">
                  SILAT<span className="text-white">PRO</span>
                </h1>
                <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded font-bold uppercase tracking-widest bg-red-950 text-red-400 border border-red-900/60 font-mono">
                  SISTEM PELATIH
                </span>
              </div>
              <p className="hidden sm:block text-[10px] uppercase tracking-widest text-zinc-500 truncate max-w-[220px] mt-0.5 group-hover:text-zinc-400 transition-colors">
                {profile.schoolName || "Ekstrakurikuler Silat"}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('landing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                activeTab === 'landing'
                  ? 'bg-red-900/30 text-red-400 border border-red-800/50 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              Beranda
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-red-900/30 text-red-400 border border-red-800/50 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                activeTab === 'logs'
                  ? 'bg-red-900/30 text-red-400 border border-red-800/50 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Laporan
            </button>

            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                activeTab === 'attendance' || activeTab === 'students'
                  ? 'bg-red-900/30 text-red-400 border border-red-800/50 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Siswa
            </button>

            <button
              onClick={() => setActiveTab('progress')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                activeTab === 'progress'
                  ? 'bg-red-900/30 text-red-400 border border-red-800/50 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Sabuk
            </button>
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center space-x-2">
            {/* Live Security Sync Pulse Tag */}
            <div className="hidden xl:flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-zinc-900/60 border border-zinc-800">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">DATA TERENKRIPSI</span>
            </div>

            {/* SuperAdmin Quick Access Button */}
            {currentUser.role === 'superadmin' && onOpenSuperAdmin && (
              <button
                onClick={onOpenSuperAdmin}
                className="hidden md:flex bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/80 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all items-center gap-1.5 shadow-md shadow-amber-950/60 active:scale-95 cursor-pointer relative"
                title="Buka Dashboard Verifikasi & Manajemen Akun Superadmin"
              >
                <ShieldCheck className="w-4 h-4 text-amber-100" />
                <span className="text-[11px]">Superadmin</span>
                {pendingUsersCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                    {pendingUsersCount}
                  </span>
                )}
              </button>
            )}

            {/* User Account Profile Button */}
            <button
              onClick={() => onOpenSettingsModal('account')}
              className="bg-zinc-900/90 hover:bg-zinc-850 text-zinc-100 border border-zinc-700/80 hover:border-red-600/70 text-xs px-2 sm:px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 sm:gap-2 shadow-sm active:scale-95 cursor-pointer max-w-[130px] sm:max-w-[220px]"
              title={`Akun: ${currentUser.name}. Klik untuk melihat identitas akun, edit nama, atau ganti foto profil.`}
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-red-950 border border-red-700 flex items-center justify-center text-red-300 font-bold text-[10px] shrink-0">
                {currentUser.avatar || currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatar || currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentUser.name.charAt(0)
                )}
              </div>
              <div className="text-left truncate hidden sm:block">
                <div className="text-[11px] font-bold text-zinc-200 leading-tight truncate">
                  {currentUser.name.split(',')[0]}
                </div>
                <div className="text-[9px] text-red-400 font-medium truncate">
                  {currentUser.trainingLocation}
                </div>
              </div>
              <span className="sm:hidden text-[11px] font-bold text-zinc-200">Akun</span>
            </button>

            {/* Direct KOP & TTD Edit Button (Hidden on Mobile, available on Mobile Tab Bar) */}
            <button
              onClick={() => onOpenSettingsModal('kop')}
              className="hidden md:flex bg-purple-950/80 hover:bg-purple-900/90 text-purple-200 hover:text-white border border-purple-700/60 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              title="Edit & Sesuaikan KOP Laporan, No. Telp, Email, dan Tanda Tangan Sekolah"
            >
              <UserCheck className="w-3.5 h-3.5 text-yellow-400" />
              <span className="font-bold text-[11px]">KOP & TTD</span>
            </button>

            {/* Menu Pasang / Install PWA Desktop / Mobile */}
            <button
              onClick={() => onOpenSettingsModal('install')}
              className="hidden lg:flex bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white border border-red-500/70 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all items-center gap-1.5 shadow-md shadow-red-950/60 active:scale-95 cursor-pointer"
              title="Pasang / Install Aplikasi di PC atau Ponsel (PWA Offline Ready)"
            >
              <Download className="w-3.5 h-3.5 text-yellow-300 animate-bounce-subtle" />
              <span className="font-extrabold text-[11px]">Pasang</span>
            </button>

            {/* Menu Setting Utama (Hidden on Mobile, available on Mobile Tab Bar) */}
            <button
              onClick={() => onOpenSettingsModal()}
              className="hidden md:flex bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 hover:border-purple-600/60 text-xs px-2.5 sm:px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              title="Buka Pengaturan Sistem Lengkap"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px]">Setting</span>
            </button>

            {/* Jadwal & Alarm Pengingat */}
            <button
              onClick={onOpenReminderModal}
              className="hidden sm:flex w-9 h-9 border border-zinc-800 rounded-lg items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              title="Jadwal Latihan & Notifikasi Alarm"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
            </button>

            {/* Notifications Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="w-9 h-9 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors relative"
                title="Notifikasi Real-Time"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-zinc-950">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-red-500" />
                      Pemberitahuan
                    </span>
                    <span className="text-[10px] text-red-400 font-mono">
                      {unreadCount} BARU
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-zinc-500">Tidak ada notifikasi.</div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => onMarkNotificationRead(n.id)}
                          className={`p-3 text-xs hover:bg-zinc-900/60 cursor-pointer transition-colors ${
                            !n.read ? 'bg-red-950/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-zinc-200 text-[11px]">{n.title}</span>
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                          </div>
                          <p className="text-zinc-400 text-[11px] leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-zinc-600 mt-1 block font-mono">
                            {new Date(n.timestamp).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dark / Light Toggle (Hidden on Mobile, available in Settings) */}
            <button
              onClick={onToggleTheme}
              className="hidden md:flex w-9 h-9 border border-zinc-800 rounded-lg items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-red-400" />}
            </button>

            {/* Scan QR Button */}
            {onOpenQRScanner && (
              <button
                onClick={onOpenQRScanner}
                className="w-9 h-9 border border-yellow-700/60 bg-yellow-950/40 hover:bg-yellow-900/60 rounded-lg flex items-center justify-center text-yellow-400 hover:text-yellow-300 transition-colors shadow-sm"
                title="Scan QR Barcode Absensi Atlet"
              >
                <ScanLine className="w-4 h-4" />
              </button>
            )}

            {/* Fullscreen Button */}
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="hidden sm:flex w-9 h-9 border border-zinc-800 rounded-lg items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
                title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            )}

            {/* Logout Button (Desktop View, on Mobile it's inside Settings) */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="hidden sm:flex w-9 h-9 border border-red-800/80 bg-red-950/40 hover:bg-red-900/60 rounded-lg items-center justify-center text-red-400 hover:text-red-200 transition-colors shadow-sm"
                title="Keluar / Logout Akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Bar - Clean, Streamlined, No Overflow */}
        <div className="flex lg:hidden items-center justify-start sm:justify-around py-1.5 px-1 border-t border-zinc-800/80 text-xs overflow-x-auto no-scrollbar gap-1">
          {currentUser.role === 'superadmin' && onOpenSuperAdmin && (
            <button
              onClick={onOpenSuperAdmin}
              className="flex items-center gap-1 py-1 px-2 rounded-lg font-bold uppercase tracking-wider text-[10px] shrink-0 text-amber-300 bg-amber-950/60 border border-amber-800/60"
              title="Dashboard Superadmin"
            >
              <ShieldCheck className="w-3 h-3 text-amber-300" />
              Superadmin
              {pendingUsersCount > 0 && (
                <span className="bg-red-600 text-white text-[9px] px-1 rounded-full font-bold">
                  {pendingUsersCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('landing')}
            className={`flex items-center gap-1 py-1 px-2 rounded-lg font-semibold uppercase tracking-wider text-[10px] shrink-0 ${
              activeTab === 'landing' ? 'bg-red-900/30 text-red-400 border border-red-800/40' : 'text-zinc-400'
            }`}
          >
            <Home className="w-3 h-3" />
            Beranda
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1 py-1 px-2 rounded-lg font-semibold uppercase tracking-wider text-[10px] shrink-0 ${
              activeTab === 'dashboard' ? 'bg-red-900/30 text-red-400 border border-red-800/40' : 'text-zinc-400'
            }`}
          >
            <LayoutDashboard className="w-3 h-3" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1 py-1 px-2 rounded-lg font-semibold uppercase tracking-wider text-[10px] shrink-0 ${
              activeTab === 'logs' ? 'bg-red-900/30 text-red-400 border border-red-800/40' : 'text-zinc-400'
            }`}
          >
            <FileText className="w-3 h-3" />
            Laporan
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-1 py-1 px-2 rounded-lg font-semibold uppercase tracking-wider text-[10px] shrink-0 ${
              activeTab === 'attendance' || activeTab === 'students' ? 'bg-red-900/30 text-red-400 border border-red-800/40' : 'text-zinc-400'
            }`}
          >
            <Users className="w-3 h-3" />
            Siswa
          </button>
          <button
            onClick={() => onOpenSettingsModal('kop')}
            className="flex items-center gap-1 py-1 px-2 rounded-lg font-bold uppercase tracking-wider text-[10px] shrink-0 text-yellow-400 hover:text-white bg-purple-950/60 border border-purple-800/60"
          >
            <UserCheck className="w-3 h-3 text-yellow-400" />
            KOP & TTD
          </button>
          <button
            onClick={() => onOpenSettingsModal('account')}
            className="flex items-center gap-1 py-1 px-2 rounded-lg font-bold uppercase tracking-wider text-[10px] shrink-0 text-red-400 hover:text-white bg-red-950/50 border border-red-800/50"
            title="Profil & Identitas Akun"
          >
            <User className="w-3 h-3 text-red-400" />
            Akun
          </button>
          <button
            onClick={() => onOpenSettingsModal()}
            className="flex items-center gap-1 py-1 px-2 rounded-lg font-semibold uppercase tracking-wider text-[10px] shrink-0 text-zinc-400 hover:text-white"
          >
            <Settings className="w-3 h-3" />
            Setting
          </button>
        </div>
      </div>
    </header>
  );
};
