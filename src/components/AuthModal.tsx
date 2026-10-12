import React, { useState } from 'react';
import { UserAccount, SchoolProfile } from '../types';
import { StorageService } from '../utils/storage';
import {
  User,
  LogIn,
  UserPlus,
  Building2,
  ShieldCheck,
  LogOut,
  Key,
  Phone,
  Mail,
  MapPin,
  Check,
  Flame,
  ArrowRight,
  X,
  Sparkles,
  School,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onUserChanged: (newUser: UserAccount) => void;
  profile: SchoolProfile;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  profile,
}) => {
  const [activeTab, setActiveTab] = useState<'switch' | 'login' | 'register'>('switch');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register form state
  const [regForm, setRegForm] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    role: 'pelatih' as 'pelatih' | 'pembina' | 'admin' | 'asisten',
    trainingLocation: '',
    extracurricularName: '',
    organizationBranch: '',
    city: '',
  });

  if (!isOpen) return null;

  const usersList = StorageService.getUsers();

  const handleQuickSwitch = (targetUser: UserAccount) => {
    setErrorMsg(null);
    StorageService.setCurrentUser(targetUser);
    onUserChanged(targetUser);
    setSuccessMsg(`Berhasil beralih ke akun ${targetUser.name} (${targetUser.trainingLocation})`);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 700);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = StorageService.login(loginIdentifier, loginPassword);
    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Gagal masuk akun. Periksa username atau kata sandi.');
      return;
    }

    onUserChanged(res.user);
    setSuccessMsg(`Selamat datang kembali, ${res.user.name}!`);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 800);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regForm.name.trim()) {
      setErrorMsg('Nama lengkap pelatih/penanggung jawab wajib diisi.');
      return;
    }
    if (!regForm.trainingLocation.trim()) {
      setErrorMsg('Nama tempat latihan / sekolah wajib diisi.');
      return;
    }
    if (!regForm.username.trim() || regForm.username.trim().length < 3) {
      setErrorMsg('Username minimal 3 karakter.');
      return;
    }

    const res = StorageService.register({
      username: regForm.username,
      password: regForm.password || 'password123',
      name: regForm.name,
      email: regForm.email || `${regForm.username}@silat.sch.id`,
      phone: regForm.phone,
      role: regForm.role,
      trainingLocation: regForm.trainingLocation,
      extracurricularName: regForm.extracurricularName || 'Ekstrakurikuler Pencak Silat',
      organizationBranch: regForm.organizationBranch || 'Ikatan Pencak Silat Indonesia (IPSI)',
      city: regForm.city || 'Jakarta',
    });

    if (!res.success || !res.user) {
      setErrorMsg(res.error || 'Gagal mendaftarkan akun baru.');
      return;
    }

    onUserChanged(res.user);
    setSuccessMsg(`Akun untuk "${res.user.trainingLocation}" berhasil dibuat! Database tempat latihan Anda telah siap.`);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 1000);
  };

  const handleFillDemo = (username: string, pass: string) => {
    setLoginIdentifier(username);
    setLoginPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto text-zinc-100">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-zinc-950 via-red-950/50 to-zinc-950 border-b border-red-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-900/40 border border-red-700/60 flex items-center justify-center text-red-400 shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Manajemen Akun & Tempat Latihan
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-red-950 text-red-300 border border-red-800">
                  Multi-User
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Akses tersendiri untuk tiap pelatih di tempat latihannya masing-masing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active User Banner */}
        <div className="px-6 py-3 bg-zinc-950/80 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-950 border border-red-700 flex items-center justify-center text-red-300 font-bold text-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{currentUser.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-amber-300 border border-zinc-700 font-mono capitalize">
                  {currentUser.role}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                <Building2 className="w-3 h-3 text-red-400" />
                <span className="font-semibold text-zinc-300">{currentUser.trainingLocation}</span>
                {currentUser.city && <span>• {currentUser.city}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-950/40 border border-green-800/50 px-2.5 py-1 rounded-lg font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Sedang Aktif</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-6 pt-3 gap-2">
          <button
            onClick={() => {
              setActiveTab('switch');
              setErrorMsg(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'switch'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Ganti Akun ({usersList.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'login'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Masuk Akun
          </button>

          <button
            onClick={() => {
              setActiveTab('register');
              setErrorMsg(null);
            }}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'register'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Daftar Tempat Latihan Baru
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto max-h-[68vh] space-y-4">
          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-950/60 border border-green-800/80 rounded-xl text-xs text-green-200 flex items-start gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: SWITCH ACCOUNTS */}
          {activeTab === 'switch' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Daftar Akun & Tempat Latihan Terdaftar</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Pilih akun pelatih di bawah untuk langsung mengelola laporan dan siswa di tempat latihan tersebut.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('register')}
                  className="text-xs bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-700/60 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Tambah Akun
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {usersList.map((user) => {
                  const isActive = user.id === currentUser.id;
                  const userLogs = StorageService.getTrainingLogs(user.id);
                  const userStudents = StorageService.getStudents(user.id);

                  return (
                    <div
                      key={user.id}
                      onClick={() => !isActive && handleQuickSwitch(user)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                        isActive
                          ? 'bg-red-950/30 border-red-600/80 shadow-lg shadow-red-950/30 ring-1 ring-red-500/40'
                          : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isActive
                              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}>
                            <Flame className="w-5 h-5" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-white">{user.name}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize">
                                {user.role}
                              </span>
                              {isActive && (
                                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-green-900/80 text-green-300 border border-green-700">
                                  Aktif
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-red-300 font-semibold mt-1">
                              <School className="w-3.5 h-3.5" />
                              <span>{user.trainingLocation}</span>
                            </div>

                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              {user.extracurricularName} • {user.city || 'Indonesia'}
                            </p>

                            <div className="flex items-center gap-3 mt-2.5 text-[11px] text-zinc-500">
                              <span>Username: <strong className="text-zinc-400">{user.username}</strong></span>
                              <span>•</span>
                              <span><strong className="text-zinc-300">{userLogs.length}</strong> Latihan</span>
                              <span>•</span>
                              <span><strong className="text-zinc-300">{userStudents.length}</strong> Atlet</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-950/60 border border-green-800 px-2.5 py-1 rounded-lg">
                              <Check className="w-3.5 h-3.5" /> Digunakan
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="text-xs bg-zinc-800 hover:bg-red-600 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg font-bold border border-zinc-700 hover:border-red-500 transition-all flex items-center gap-1"
                            >
                              Pilih Akun <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-200">Isolasi Data Terjamin:</strong> Saat Anda berganti akun, seluruh data log latihan, daftar absensi atlet, nomor kontak, serta format KOP surat dan tanda tangan akan otomatis berganti sesuai sekolah/tempat latihan akun tersebut.
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOGIN */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Masuk ke Akun Pelatih</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Masukkan username atau email terdaftar dan kata sandi Anda.
                </p>
              </div>

              {/* Quick test autofill buttons */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Akses Cepat Akun Contoh:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleFillDemo('pelatih1', 'password123')}
                    className="text-xs px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-colors"
                  >
                    🥋 Pelatih 1 (SMK 1)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillDemo('pelatih2', 'password123')}
                    className="text-xs px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-colors"
                  >
                    🥋 Pelatih 2 (SMA 5)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillDemo('pelatih3', 'password123')}
                    className="text-xs px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-colors"
                  >
                    🥋 Pelatih 3 (Padepokan)
                  </button>
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Username atau Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Contoh: pelatih1 atau email@sekolah.sch.id"
                      required
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Untuk akun demo bawaan, kata sandi adalah <code className="text-zinc-300">password123</code>.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold"
                  >
                    Belum punya akun? Buat baru →
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-red-700 to-rose-800 hover:from-red-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950/60 transition-all cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" /> Masuk ke Akun
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: REGISTER NEW ACCOUNT & VENUE */}
          {activeTab === 'register' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Daftarkan Tempat Latihan Baru</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Buat akun untuk sekolah, dojo, padepokan, atau cabang latihan Anda. Seluruh laporan dan data atlet akan tersimpan secara terpisah.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Nama Tempat Latihan */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Nama Tempat Latihan / Sekolah <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <School className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={regForm.trainingLocation}
                        onChange={(e) => setRegForm({ ...regForm, trainingLocation: e.target.value })}
                        placeholder="Contoh: SMA Negeri 3 Surabaya / Padepokan Satria"
                        required
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Nama Ekstrakurikuler */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Nama Ekskul / Perguruan Silat
                    </label>
                    <input
                      type="text"
                      value={regForm.extracurricularName}
                      onChange={(e) => setRegForm({ ...regForm, extracurricularName: e.target.value })}
                      placeholder="Contoh: Pencak Silat Tapak Suci"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  {/* Kota / Cabang */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Kota / Kabupaten
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={regForm.city}
                        onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                        placeholder="Contoh: Surabaya / Jakarta Selatan"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Nama Lengkap Pelatih */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Nama Lengkap Pelatih / Pembina <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={regForm.name}
                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                        placeholder="Contoh: Hendra Setiawan, S.Pd."
                        required
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Peran */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Peran / Jabatan
                    </label>
                    <select
                      value={regForm.role}
                      onChange={(e) => setRegForm({ ...regForm, role: e.target.value as any })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                    >
                      <option value="pelatih">Pelatih Utama</option>
                      <option value="pembina">Pembina Ekstrakurikuler</option>
                      <option value="asisten">Asisten Pelatih</option>
                      <option value="admin">Admin Lembaga / Sekolah</option>
                    </select>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Username Akun <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={regForm.username}
                      onChange={(e) => setRegForm({ ...regForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      placeholder="Contoh: pelatih_hendra"
                      required
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors font-mono"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Kata Sandi
                    </label>
                    <input
                      type="password"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      placeholder="Minimal 6 karakter"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      No. WhatsApp / HP
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={regForm.phone}
                        onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                        placeholder="Contoh: 0812-3456-7890"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        placeholder="pelatih@sekolah.sch.id"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab('switch')}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Batal & Kembali
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-red-950/60 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" /> Daftarkan & Masuk Sekarang
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-500 flex flex-wrap items-center justify-between gap-2">
          <span>Sistem Multi-Pengguna SilatPro • Data tersimpan aman di perangkat secara offline</span>
          <span className="font-mono text-zinc-400">ID Aktif: {currentUser.id}</span>
        </div>
      </div>
    </div>
  );
};
