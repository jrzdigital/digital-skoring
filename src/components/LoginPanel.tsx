import React, { useState } from 'react';
import { 
  Shield, 
  Lock, 
  User, 
  Key, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  Eye, 
  EyeOff, 
  School, 
  MapPin, 
  Phone, 
  Mail, 
  UserPlus, 
  LogIn, 
  Award,
  Sparkles,
  HelpCircle,
  Check
} from 'lucide-react';
import { UserAccount, UserRole } from '../types';
import { StorageService } from '../utils/storage';

interface LoginPanelProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginPanel: React.FC<LoginPanelProps> = ({ onLoginSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isPendingNotice, setIsPendingNotice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('pelatih');
  const [regTrainingLocation, setRegTrainingLocation] = useState('');
  const [regExtracurricular, setRegExtracurricular] = useState('Ekstrakurikuler Pencak Silat IPSI');
  const [regBranch, setRegBranch] = useState('Pengurus Cabang IPSI');
  const [regCity, setRegCity] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccessNotice, setRegSuccessNotice] = useState<string | null>(null);

  // Forgot password state
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotContact, setForgotContact] = useState('');
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsPendingNotice(false);

    if (!loginIdentifier.trim()) {
      setLoginError('Silakan masukkan username atau email.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Silakan masukkan kata sandi Anda.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = StorageService.login(loginIdentifier, loginPassword);
      setIsLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setLoginError(result.error || 'Gagal masuk ke sistem.');
        if (result.isPending) {
          setIsPendingNotice(true);
        }
      }
    }, 400);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regName.trim()) {
      setRegError('Nama lengkap penanggung jawab wajib diisi.');
      return;
    }
    if (!regUsername.trim() || regUsername.trim().length < 3) {
      setRegError('Username minimal 3 karakter.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setRegError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (!regTrainingLocation.trim()) {
      setRegError('Nama sekolah / tempat latihan / padepokan wajib diisi.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = StorageService.register({
        username: regUsername.trim(),
        password: regPassword,
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        role: regRole,
        trainingLocation: regTrainingLocation.trim(),
        extracurricularName: regExtracurricular.trim(),
        organizationBranch: regBranch.trim(),
        city: regCity.trim() || 'DKI Jakarta',
      });

      setIsLoading(false);

      if (result.success) {
        setRegSuccessNotice(result.message || 'Pendaftaran berhasil dikirim! Menunggu verifikasi Superadmin.');
        // Clear fields
        setRegPassword('');
      } else {
        setRegError(result.error || 'Gagal mendaftar.');
      }
    }, 500);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsername.trim()) {
      setForgotNotice('Mohon isi username akun Anda.');
      return;
    }
    const res = StorageService.requestPasswordReset(forgotUsername, forgotContact);
    setForgotNotice(res.message);
  };

  const fillQuickLogin = (user: string, pass: string) => {
    setLoginIdentifier(user);
    setLoginPassword(pass);
    setLoginError(null);
    setIsPendingNotice(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 font-sans">
      {/* Background aesthetic decorative martial arts elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-10">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-center border-b border-emerald-700/40 relative">
          {/* Logo SatriaApp */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-950/80 border border-emerald-500/40 shadow-2xl p-2 mb-3 relative group">
            <img 
              src="/logo_satriaapp.png" 
              alt="Logo SatriaApp" 
              className="w-full h-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-white uppercase flex items-center justify-center gap-2">
            SatriaApp Silat
          </h1>
          <p className="text-xs text-emerald-200/90 mt-1 font-medium">
            Portal Autentikasi & Manajemen Latihan Terpadu
          </p>

          {/* Security badge notice */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full bg-slate-950/60 border border-emerald-500/30 text-[11px] text-emerald-300">
            <Lock className="w-3.5 h-3.5" />
            <span>Sistem Terproteksi &bull; Wajib Autentikasi Pengguna</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8">
          {/* -------------------- LOGIN TAB -------------------- */}
          {tab === 'login' && (
            <div>
              {/* Informative notice if pending account */}
              {isPendingNotice && (
                <div className="mb-6 p-4 bg-amber-950/60 border border-amber-500/60 rounded-xl text-amber-200 text-xs sm:text-sm flex gap-3 items-start animate-fadeIn">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-amber-300 text-sm font-semibold mb-1">
                      Menunggu Verifikasi Superadmin (Status PENDING)
                    </strong>
                    Akun Anda telah terdaftar namun belum disetujui oleh Super Administrator. Demi keamanan data IPSI, seluruh akun baru wajib diverifikasi terlebih dahulu sebelum dapat mengakses fitur aplikasi.
                  </div>
                </div>
              )}

              {/* General Login Error */}
              {loginError && !isPendingNotice && (
                <div className="mb-6 p-3.5 bg-red-950/60 border border-red-500/60 rounded-xl text-red-200 text-xs sm:text-sm flex gap-3 items-center animate-shake">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Username atau Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="login-username"
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Contoh: jakaoktorian atau pelatih1"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi"
                      className="w-full pl-10 pr-11 py-2.5 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">Pastikan akun Anda sudah terverifikasi.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setForgotNotice(null);
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                  >
                    Lupa sandi?
                  </button>
                </div>

                {/* Tombol Utama Masuk ke Sistem */}
                <button
                  type="submit"
                  id="btn-submit-login"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Masuk ke Sistem</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Menu Daftar Baru serta Bantuan (Tepat di Bawah Tulisan Masuk ke Sistem) */}
              <div className="mt-5 pt-4 border-t border-slate-800/80">
                <div className="grid grid-cols-2 gap-3">
                  {/* Menu Daftar Baru */}
                  <button
                    type="button"
                    id="btn-nav-register"
                    onClick={() => {
                      setTab('register');
                      setRegError(null);
                      setRegSuccessNotice(null);
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-950/70 hover:bg-emerald-950/50 border border-slate-700/80 hover:border-emerald-500/60 text-slate-200 hover:text-emerald-300 text-xs font-semibold transition-all group shadow-sm active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                    <span className="truncate">Daftar Akun Baru</span>
                  </button>

                  {/* Menu Bantuan */}
                  <button
                    type="button"
                    id="btn-nav-help"
                    onClick={() => {
                      setTab('forgot');
                      setForgotNotice(null);
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-950/70 hover:bg-amber-950/50 border border-slate-700/80 hover:border-amber-500/60 text-slate-200 hover:text-amber-300 text-xs font-semibold transition-all group shadow-sm active:scale-95 cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                    <span className="truncate">Pusat Bantuan</span>
                  </button>
                </div>
              </div>

              {/* Demo Accounts Quick-Fill Section */}
              <div className="mt-6 pt-5 border-t border-slate-800/80">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Pilih Akun Uji Coba Cepat:
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
                  {/* Superadmin Button */}
                  <button
                    type="button"
                    id="quick-login-superadmin"
                    onClick={() => fillQuickLogin('jakaoktorian', 'Abuyaku21')}
                    className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-950/30 hover:bg-amber-900/40 text-left transition-colors flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-amber-300 font-bold mb-1">
                      <span>Superadmin</span>
                      <Award className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[10px] text-amber-200/70">Jaka Oktorian (Master Pusat)</p>
                    <span className="text-[10px] font-mono text-amber-400 mt-1 font-bold">jakaoktorian</span>
                  </button>

                  {/* Active Coach Button */}
                  <button
                    type="button"
                    id="quick-login-pelatih"
                    onClick={() => fillQuickLogin('pelatih1', 'password123')}
                    className="p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-left transition-colors flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-emerald-300 font-bold mb-1">
                      <span>Pelatih Aktif</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[10px] text-emerald-200/70">Status: Disetujui (Approved)</p>
                    <span className="text-[10px] font-mono text-slate-400 mt-1">pelatih1</span>
                  </button>

                  {/* Pending Account Button */}
                  <button
                    type="button"
                    id="quick-login-pending"
                    onClick={() => fillQuickLogin('fauzi_pelatih', 'password123')}
                    className="p-2.5 rounded-xl border border-slate-700 bg-slate-950/40 hover:bg-slate-800/60 text-left transition-colors flex flex-col justify-between group cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-slate-300 font-bold mb-1">
                      <span>Akun Menunggu</span>
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <p className="text-[10px] text-slate-400">Status: Menunggu Verifikasi</p>
                    <span className="text-[10px] font-mono text-slate-400 mt-1">fauzi_pelatih</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* -------------------- REGISTER TAB -------------------- */}
          {tab === 'register' && (
            <div>
              {regSuccessNotice ? (
                <div className="p-6 bg-emerald-950/60 border border-emerald-500/60 rounded-2xl text-center animate-fadeIn space-y-4">
                  <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-400/40 rounded-full mx-auto flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Pendaftaran Berhasil Diajukan!</h3>
                    <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed">
                      Akun Anda atas nama <strong>{regName}</strong> ({regUsername}) telah dicatat dalam sistem dengan status <span className="text-amber-400 font-semibold uppercase">PENDING</span>.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 text-xs text-slate-300 text-left space-y-1">
                    <div className="flex items-center gap-2 font-semibold text-emerald-300">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Tahap Berikutnya:
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Super Administrator akan memeriksa dan memverifikasi data perguruan/sekolah Anda di <strong>Dashboard Superadmin</strong> sebelum akun dapat digunakan untuk masuk ke sistem.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setLoginIdentifier(regUsername);
                      setRegSuccessNotice(null);
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <span>Kembali ke Panel Masuk</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <UserPlus className="w-4 h-4" />
                      <span>Pendaftaran Akun Baru</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setTab('login'); setLoginError(null); }}
                      className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Kembali ke Masuk</span>
                    </button>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1">
                    <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200/90 flex gap-2.5 items-center">
                      <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Seluruh pendaftaran baru wajib diverifikasi oleh Superadmin sebelum dapat login.</span>
                    </div>

                  {regError && (
                    <div className="p-3 bg-red-950/60 border border-red-500/60 rounded-xl text-red-200 text-xs flex gap-2.5 items-center">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                        Nama Lengkap & Gelar *
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Contoh: Budi Santoso, S.Pd."
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                        Username Login *
                      </label>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="Contoh: budi_pelatih"
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                        Kata Sandi *
                      </label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                        Peran Akun
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="pelatih">Pelatih Utama</option>
                        <option value="asisten">Asisten Pelatih</option>
                        <option value="pembina">Guru Pembina Silat</option>
                        <option value="admin">Administrator Perguruan</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                        Email Resmi
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="email@sekolah.sch.id"
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                        Nomor HP / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0812-xxxx-xxxx"
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                      Nama Sekolah / Tempat Latihan / Padepokan *
                    </label>
                    <input
                      type="text"
                      value={regTrainingLocation}
                      onChange={(e) => setRegTrainingLocation(e.target.value)}
                      placeholder="Contoh: SMAN 1 JAKARTA atau PADEPOKAN MERPATI PUTIH"
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                        Nama Ekstrakurikuler / Perguruan
                      </label>
                      <input
                        type="text"
                        value={regExtracurricular}
                        onChange={(e) => setRegExtracurricular(e.target.value)}
                        placeholder="Contoh: Silat Satria Muda IPSI"
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                        Kota / Kabupaten
                      </label>
                      <input
                        type="text"
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        placeholder="Contoh: Jakarta Selatan"
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-register"
                    disabled={isLoading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Kirim Permohonan Pendaftaran (Status Pending)</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-4 pt-3.5 border-t border-slate-800/80 text-center">
                  <button
                    type="button"
                    onClick={() => { setTab('login'); setLoginError(null); }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sudah memiliki akun terdaftar? Masuk ke Sistem</span>
                  </button>
                </div>
              </div>
              )}
            </div>
          )}

          {/* -------------------- FORGOT / HELP TAB -------------------- */}
          {tab === 'forgot' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <HelpCircle className="w-4 h-4" />
                  <span>Pusat Bantuan & Lupa Sandi</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setTab('login'); setLoginError(null); }}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Masuk</span>
                </button>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-2">
                <div className="font-semibold text-amber-400 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Bantuan Akses & Reset Kata Sandi
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Jika Anda lupa kata sandi atau akun Anda belum aktif, Anda dapat mengajukan permintaan reset atau menghubungi Super Administrator untuk verifikasi akun langsung.
                </p>
              </div>

              {forgotNotice && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs">
                  {forgotNotice}
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Username Akun Anda
                  </label>
                  <input
                    type="text"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    placeholder="Masukkan username Anda"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                    Nomor WhatsApp / Email Kontak
                  </label>
                  <input
                    type="text"
                    value={forgotContact}
                    onChange={(e) => setForgotContact(e.target.value)}
                    placeholder="Contoh: 0812-xxxx-xxxx"
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Kirim Permintaan Reset ke Superadmin</span>
                </button>
              </form>

              <div className="pt-2 text-center border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => { setTab('login'); setLoginError(null); }}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Kembali ke Halaman Masuk ke Sistem</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-center text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>PB IPSI &bull; Standar Perguruan Nasional</span>
          </div>
          <span className="text-slate-400">Ver. 2026.1</span>
        </div>
      </div>
    </div>
  );
};
