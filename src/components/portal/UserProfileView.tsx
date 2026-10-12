import React, { useState } from "react";
import { 
  User, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Mail, 
  Phone, 
  Building, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Save, 
  X, 
  LogOut, 
  Swords, 
  Medal, 
  Tv, 
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Check,
  AlertCircle
} from "lucide-react";
import { UserAccount, UserRole } from "../../types";
import { PortalTab } from "../../types/portal";
import { authService } from "../../services/authService";
import { sound } from "../../utils/sound";

interface UserProfileViewProps {
  currentUser: UserAccount;
  onUpdateProfile: (updated: UserAccount) => void;
  onLogout: () => void;
  onNavigateTab: (tab: PortalTab) => void;
  effectiveTheme?: "light" | "dark";
}

export function UserProfileView({
  currentUser,
  onUpdateProfile,
  onLogout,
  onNavigateTab,
  effectiveTheme = "dark"
}: UserProfileViewProps) {
  // Modal Edit Profil State
  const [showEditModal, setShowEditModal] = useState(false);
  const [fullName, setFullName] = useState(currentUser.fullName || "");
  const [organization, setOrganization] = useState(currentUser.organization || "");
  const [emailOrPhone, setEmailOrPhone] = useState(currentUser.emailOrPhone || "");
  const [city, setCity] = useState(currentUser.city || "");
  const [trainingLocation, setTrainingLocation] = useState(currentUser.trainingLocation || "");
  
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  const formatTimestamp = (ts?: number | string) => {
    if (!ts) return "Tidak tercatat";
    const date = typeof ts === "number" ? new Date(ts) : new Date(Number(ts) || ts);
    if (isNaN(date.getTime())) return "Tidak tercatat";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }) + " WIB";
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "superadmin":
        return "Super Administrator";
      case "admin":
        return "Administrator Gelanggang / Operator";
      case "dewan":
        return "Dewan Pertandingan";
      case "juri":
        return "Juri Pertandingan Silat";
      case "pelatih":
        return "Pelatih / Official Kontingen";
      case "atlet":
        return "Atlet Pencak Silat";
      case "pembina":
        return "Pembina / Penasihat Kontingen";
      case "asisten":
        return "Asisten Gelanggang";
      default:
        return "Pengguna Terdaftar";
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "superadmin":
        return "bg-amber-500/20 text-amber-300 border-amber-500/50";
      case "admin":
        return "bg-blue-500/20 text-blue-300 border-blue-500/50";
      case "dewan":
        return "bg-purple-500/20 text-purple-300 border-purple-500/50";
      case "juri":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
      case "pelatih":
        return "bg-orange-500/20 text-orange-300 border-orange-500/50";
      case "atlet":
        return "bg-rose-500/20 text-rose-300 border-rose-500/50";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/50";
    }
  };

  const handleOpenEdit = () => {
    sound.playClick();
    setFullName(currentUser.fullName || "");
    setOrganization(currentUser.organization || "");
    setEmailOrPhone(currentUser.emailOrPhone || "");
    setCity(currentUser.city || "");
    setTrainingLocation(currentUser.trainingLocation || "");
    setNewPassword("");
    setConfirmPassword("");
    setErrorToast("");
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorToast("Nama lengkap wajib diisi!");
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorToast("Kata sandi baru minimal 6 karakter!");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorToast("Konfirmasi kata sandi tidak cocok!");
        return;
      }
    }

    sound.playClick();
    setSaving(true);
    setErrorToast("");

    try {
      const updatePayload: Partial<UserAccount> & { id: string } = {
        id: currentUser.id,
        fullName: fullName.trim(),
        organization: organization.trim(),
        emailOrPhone: emailOrPhone.trim(),
        city: city.trim(),
        trainingLocation: trainingLocation.trim(),
        ...(newPassword ? { password: newPassword } : {})
      };

      await authService.updateUser(updatePayload);

      const updatedUser: UserAccount = {
        ...currentUser,
        fullName: fullName.trim(),
        organization: organization.trim(),
        emailOrPhone: emailOrPhone.trim(),
        city: city.trim(),
        trainingLocation: trainingLocation.trim(),
        ...(newPassword ? { password: newPassword } : {})
      };

      authService.saveSession(updatedUser);
      onUpdateProfile(updatedUser);

      sound.playVictory();
      setSuccessToast("Data profil berhasil diperbarui!");
      setShowEditModal(false);
      setTimeout(() => setSuccessToast(""), 4000);
    } catch (err: any) {
      setErrorToast(err?.message || "Gagal memperbarui data profil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-[85vh] py-6 sm:py-10 px-4 sm:px-8 max-w-6xl mx-auto w-full font-sans animate-fadeIn ${
      effectiveTheme === "light" ? "text-slate-800" : "text-slate-100"
    }`}>
      
      {/* 1. NOTIFIKASI AKSES DIBATASI (PANEL ADMIN KHUSUS SUPERADMIN) */}
      <div className={`mb-6 p-4 sm:p-5 rounded-2xl border shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        effectiveTheme === "light"
          ? "bg-amber-50/90 border-amber-300 text-amber-900"
          : "bg-amber-950/40 border-amber-500/40 text-amber-200"
      }`}>
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shrink-0 mt-0.5 shadow-md">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base tracking-wide">
              Akses Panel Admin Khusus Super Admin
            </h3>
            <p className="text-xs sm:text-sm opacity-90 mt-0.5 leading-relaxed">
              Sesuai otorisasi sistem, modul manajemen master dan panel admin aplikasi hanya dapat diakses oleh <strong className="font-bold">Super Admin</strong>. Halaman ini telah dialihkan untuk menampilkan <strong className="font-bold">Data Profil Pengguna</strong> dan pengaturan akun Anda.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40">
            Peran: {currentUser.role.toUpperCase()}
          </span>
        </div>
      </div>

      {/* SUCCESS TOAST ALERT */}
      {successToast && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-sm font-bold flex items-center gap-3 animate-fadeIn shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* 2. HERO PROFILE CARD */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl mb-8 relative overflow-hidden ${
        effectiveTheme === "light"
          ? "bg-white border-slate-200 shadow-slate-200/50"
          : "bg-[#0b1329] border-blue-900/60 shadow-blue-950/50"
      }`}>
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Avatar with Ring */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-amber-500 p-0.5 shadow-xl flex items-center justify-center">
                <div className={`w-full h-full rounded-[14px] flex items-center justify-center ${
                  effectiveTheme === "light" ? "bg-slate-100" : "bg-[#091124]"
                }`}>
                  <User className="w-10 h-10 sm:w-12 sm:h-12 text-blue-500" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-white shadow-md" title="Akun Aktif">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            {/* Name & Role */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${
                  effectiveTheme === "light" ? "text-slate-900" : "text-white"
                }`}>
                  {currentUser.fullName}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getRoleBadgeColor(currentUser.role)}`}>
                  {getRoleLabel(currentUser.role)}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-xs opacity-75">
                <span className="font-mono font-bold">@{currentUser.username}</span>
                <span>&bull;</span>
                <span>ID: <code className="font-mono">{currentUser.id}</code></span>
                <span>&bull;</span>
                <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Status: {currentUser.status || "APPROVED"}
                </span>
              </div>

              {currentUser.organization && (
                <div className="mt-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
                  <Building className="w-4 h-4 shrink-0" />
                  <span>{currentUser.organization}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap self-stretch md:self-center justify-end">
            <button
              onClick={handleOpenEdit}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm ${
                effectiveTheme === "light"
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Data Profil</span>
            </button>

            <button
              onClick={() => {
                sound.playBuzzer();
                onLogout();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                effectiveTheme === "light"
                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                  : "bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border-rose-800/60"
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar (Log Out)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. BENTO GRID OF PROFILE DETAILS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Card 1: Data Identitas & Login */}
        <div className={`p-6 rounded-2xl border shadow-md flex flex-col justify-between ${
          effectiveTheme === "light"
            ? "bg-white border-slate-200"
            : "bg-[#0b1329] border-blue-900/40"
        }`}>
          <div>
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/40">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <UserCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider">Identitas & Akun</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-mono">Nama Lengkap</span>
                <span className="font-bold text-sm">{currentUser.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-mono">Username Akun</span>
                <span className="font-mono font-bold">{currentUser.username}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-mono">Tingkat Hak Akses</span>
                <span className="font-bold">{getRoleLabel(currentUser.role)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-mono">Status Verifikasi</span>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-500 dark:text-emerald-400">
                  {currentUser.status === "APPROVED" ? "Terverifikasi / Aktif" : currentUser.status}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/30 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Terdaftar: {formatTimestamp(currentUser.createdAt)}</span>
          </div>
        </div>

        {/* Card 2: Kontak & Afiliasi */}
        <div className={`p-6 rounded-2xl border shadow-md flex flex-col justify-between ${
          effectiveTheme === "light"
            ? "bg-white border-slate-200"
            : "bg-[#0b1329] border-blue-900/40"
        }`}>
          <div>
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/40">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                <Building className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider">Kontingen & Penugasan</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-mono">Organisasi / Perguruan / Kontingen</span>
                <span className="font-bold">{currentUser.organization || "Pengurus Besar IPSI"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-mono">Kota / Wilayah Asal</span>
                <span className="font-semibold">{currentUser.city || "Jakarta, Indonesia"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-mono">Gelanggang Tugas / Latihan</span>
                <span className="font-semibold">{currentUser.trainingLocation || "Gelanggang A / B (Utama)"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-mono">Kontak / Email / WhatsApp</span>
                <span className="font-mono font-semibold">{currentUser.emailOrPhone || "-"}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/30 text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Diverifikasi oleh: {currentUser.approvedBy || "Administrator PB IPSI"}</span>
          </div>
        </div>

        {/* Card 3: Keamanan & Sesi */}
        <div className={`p-6 rounded-2xl border shadow-md flex flex-col justify-between ${
          effectiveTheme === "light"
            ? "bg-white border-slate-200"
            : "bg-[#0b1329] border-blue-900/40"
        }`}>
          <div>
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/40">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Key className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider">Keamanan Akun</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-mono">Keamanan Kata Sandi</span>
                <span className="font-mono text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Tersimpan Terenkripsi
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-mono">Kunci Jaringan (IP Lock)</span>
                <span className="font-bold">
                  {currentUser.ipLockEnabled ? "Aktif (Terkunci)" : "Nonaktif (Fleksibel Multi-Device)"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-mono">Alamat IP Terikat</span>
                <span className="font-mono">{currentUser.boundIp || "Bebas dari semua jaringan"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] uppercase font-mono">Sesi Login Aktif</span>
                <span className="text-emerald-500 font-bold">Terhubung Aman</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/30 flex items-center justify-between">
            <button
              onClick={handleOpenEdit}
              className="text-[11px] font-bold text-blue-500 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Ganti Kata Sandi</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MODUL PERTANDINGAN YANG DAPAT DIAKSES PENGGUNA */}
      <div className={`p-6 rounded-2xl border shadow-md ${
        effectiveTheme === "light"
          ? "bg-white border-slate-200"
          : "bg-[#0b1329] border-blue-900/40"
      }`}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/40">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider">Akses Fitur Pertandingan</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Menu dan fitur yang dapat Anda gunakan dalam kejuaraan ini:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Tanding */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigateTab("TANDING");
            }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer group ${
              effectiveTheme === "light"
                ? "bg-rose-50/50 hover:bg-rose-50 border-rose-200 text-rose-950"
                : "bg-rose-950/30 hover:bg-rose-950/50 border-rose-900/50 text-rose-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Swords className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-600 dark:text-rose-300 px-1.5 py-0.5 rounded">LIVE</span>
            </div>
            <div className="font-bold text-xs uppercase tracking-wide">Digital Skoring Tanding</div>
            <div className="text-[11px] opacity-75 mt-1">Skor sudut merah & biru resmi IPSI</div>
          </button>

          {/* Seni */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigateTab("SENI");
            }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer group ${
              effectiveTheme === "light"
                ? "bg-amber-50/50 hover:bg-amber-50 border-amber-200 text-amber-950"
                : "bg-amber-950/30 hover:bg-amber-950/50 border-amber-900/50 text-amber-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Medal className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 px-1.5 py-0.5 rounded">TGR</span>
            </div>
            <div className="font-bold text-xs uppercase tracking-wide">Digital Skoring Seni</div>
            <div className="text-[11px] opacity-75 mt-1">Tunggal, Ganda, Regu & Solo Kreatif</div>
          </button>

          {/* Administrasi */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigateTab("ADMINISTRASI");
            }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer group ${
              effectiveTheme === "light"
                ? "bg-blue-50/50 hover:bg-blue-50 border-blue-200 text-blue-950"
                : "bg-blue-950/30 hover:bg-blue-950/50 border-blue-900/50 text-blue-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Building className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono font-bold bg-blue-500/20 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded">BAGAN</span>
            </div>
            <div className="font-bold text-xs uppercase tracking-wide">Bagan & Jadwal Pertandingan</div>
            <div className="text-[11px] opacity-75 mt-1">Data atlet, timbang badan & medali</div>
          </button>

          {/* Monitor Penonton */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigateTab("MONITOR_TANDING");
            }}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer group ${
              effectiveTheme === "light"
                ? "bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200 text-emerald-950"
                : "bg-emerald-950/30 hover:bg-emerald-950/50 border-emerald-900/50 text-emerald-200"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Tv className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded">BEBAS</span>
            </div>
            <div className="font-bold text-xs uppercase tracking-wide">Monitor Penonton Layar Penuh</div>
            <div className="text-[11px] opacity-75 mt-1">Papan skor live untuk proyektor/TV</div>
          </button>
        </div>
      </div>

      {/* 5. MODAL EDIT PROFIL & GANTI KATA SANDI */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 sm:p-8 relative overflow-hidden max-h-[90vh] overflow-y-auto ${
            effectiveTheme === "light"
              ? "bg-white border-slate-200 text-slate-900"
              : "bg-[#0b1329] border-blue-900/60 text-slate-100"
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/40 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500 text-white">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg">Edit Profil Pengguna</h3>
                  <p className="text-xs text-slate-400">Perbarui informasi identitas dan kata sandi akun Anda</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorToast && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorToast}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Masukkan nama lengkap"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${
                    effectiveTheme === "light"
                      ? "bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900"
                      : "bg-slate-900 border-slate-700 focus:border-blue-400 text-white"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                  Organisasi / Kontingen / Perguruan Silat
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Contoh: Tapak Suci, PSHT, Panitia Gelanggang A"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${
                    effectiveTheme === "light"
                      ? "bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900"
                      : "bg-slate-900 border-slate-700 focus:border-blue-400 text-white"
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                    Kontak / Email / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="08123456789 atau email"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${
                      effectiveTheme === "light"
                        ? "bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900"
                        : "bg-slate-900 border-slate-700 focus:border-blue-400 text-white"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                    Kota / Wilayah Asal
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Jakarta Timur, Bandung"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${
                      effectiveTheme === "light"
                        ? "bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900"
                        : "bg-slate-900 border-slate-700 focus:border-blue-400 text-white"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
                  Gelanggang Tugas / Tempat Latihan
                </label>
                <input
                  type="text"
                  value={trainingLocation}
                  onChange={(e) => setTrainingLocation(e.target.value)}
                  placeholder="Contoh: Gelanggang A (Utama)"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${
                    effectiveTheme === "light"
                      ? "bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900"
                      : "bg-slate-900 border-slate-700 focus:border-blue-400 text-white"
                  }`}
                />
              </div>

              {/* Password change section */}
              <div className="pt-3 border-t border-slate-700/40">
                <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-amber-500">
                  <Key className="w-3.5 h-3.5" />
                  <span>Ubah Kata Sandi (Kosongkan jika tidak ingin diubah)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Kata Sandi Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className={`w-full px-4 pr-9 py-2 rounded-xl border text-sm focus:outline-none ${
                          effectiveTheme === "light"
                            ? "bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900"
                            : "bg-slate-900 border-slate-700 focus:border-blue-400 text-white"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Konfirmasi Sandi Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi sandi baru"
                        className={`w-full px-4 pr-9 py-2 rounded-xl border text-sm focus:outline-none ${
                          effectiveTheme === "light"
                            ? "bg-slate-50 border-slate-300 focus:border-blue-500 text-slate-900"
                            : "bg-slate-900 border-slate-700 focus:border-blue-400 text-white"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/40 mt-5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                    effectiveTheme === "light"
                      ? "border-slate-300 hover:bg-slate-100 text-slate-700"
                      : "border-slate-700 hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
