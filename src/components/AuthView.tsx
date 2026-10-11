/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  UserPlus, 
  LogIn, 
  Building2, 
  Phone, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Shield,
  KeyRound,
  ArrowRight,
  HelpCircle,
  X,
  MessageCircle,
  Send,
  Laptop,
  Server,
  Unlock,
  Network
} from "lucide-react";
import { sound } from "../utils/sound";
import { AuthSession } from "../types";
import { authService } from "../services/authService";

interface AuthViewProps {
  onLoginSuccess: (user: AuthSession["user"]) => void;
}

export function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showIpUnlockModal, setShowIpUnlockModal] = useState(false);

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // IP Lock and Mismatch detection
  const [ipMismatchInfo, setIpMismatchInfo] = useState<{
    ipMismatch: boolean;
    boundIp: string;
    currentIp: string;
    username: string;
    userId?: string;
    fullName?: string;
  } | null>(null);

  // IP Unlock Request state
  const [ipUnlockUsername, setIpUnlockUsername] = useState("");
  const [ipUnlockRequestedIp, setIpUnlockRequestedIp] = useState("");
  const [ipUnlockReason, setIpUnlockReason] = useState("");
  const [ipUnlockContact, setIpUnlockContact] = useState("");
  const [ipUnlockSent, setIpUnlockSent] = useState(false);
  const [ipUnlockResponseMessage, setIpUnlockResponseMessage] = useState("");

  // Register form state
  const [regFullName, setRegFullName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regOrganization, setRegOrganization] = useState("");
  const [regContact, setRegContact] = useState("");

  // Forgot password form state
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotContact, setForgotContact] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotResponseMessage, setForgotResponseMessage] = useState("");

  // Direct Reset with Token modal state
  const [showNewPasswordModal, setShowNewPasswordModal] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [tokenUserInfo, setTokenUserInfo] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newConfirmPassword, setNewConfirmPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);
  const [showNewConfirmPass, setShowNewConfirmPass] = useState(false);
  const [tokenVerifying, setTokenVerifying] = useState(false);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Check URL query parameters for reset token on mount
  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      const action = urlParams.get("action");
      if (token && (action === "reset-password" || token.startsWith("rst_"))) {
        setResetToken(token);
        verifyTokenOnLoad(token);
      }
    } catch (e) {
      console.error("Error reading URL parameters:", e);
    }
  }, []);

  const openIpUnlockModal = async (defaultUser?: string) => {
    sound.playClick();
    setIpUnlockSent(false);
    setIpUnlockUsername(defaultUser || ipMismatchInfo?.username || loginUsername || "");
    setIpUnlockReason("Pindah perangkat / IP server gelanggang baru");
    setShowIpUnlockModal(true);
    try {
      const res = await fetch("/api/auth/client-ip");
      const data = await res.json();
      if (data && data.ip) {
        setIpUnlockRequestedIp(data.ip);
      }
    } catch (e) {
      if (ipMismatchInfo?.currentIp) {
        setIpUnlockRequestedIp(ipMismatchInfo.currentIp);
      }
    }
  };

  const handleIpUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setErrorMessage("");
    setSuccessMessage("");

    if (!ipUnlockUsername.trim()) {
      sound.playBuzzer();
      setErrorMessage("Username akun wajib diisi!");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/ip-unlock-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: ipUnlockUsername.trim(),
          requestedIp: ipUnlockRequestedIp.trim() || undefined,
          reason: ipUnlockReason.trim() || "Pindah perangkat operator gelanggang",
          emailOrPhone: ipUnlockContact.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBell();
        setIpUnlockSent(true);
        setIpUnlockResponseMessage(data.message || "Permohonan izin buka kunci IP berhasil dikirim ke Super Admin!");
      } else {
        sound.playBuzzer();
        setErrorMessage(data.error || "Gagal mengajukan izin buka kunci IP.");
      }
    } catch (err) {
      sound.playBuzzer();
      setErrorMessage("Gagal terhubung ke server backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTokenOnLoad = async (token: string) => {
    setTokenVerifying(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setTokenUserInfo(data.user);
        setShowNewPasswordModal(true);
        sound.playBell();
      } else {
        sound.playBuzzer();
        setErrorMessage(data.error || "Token reset kata sandi tidak valid atau telah kedaluwarsa.");
      }
    } catch (err) {
      setErrorMessage("Gagal memverifikasi token reset kata sandi.");
    } finally {
      setTokenVerifying(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setErrorMessage("");
    setSuccessMessage("");

    if (!forgotUsername.trim()) {
      sound.playBuzzer();
      setErrorMessage("Masukkan username akun yang terdaftar!");
      return;
    }
    if (!forgotContact.trim()) {
      sound.playBuzzer();
      setErrorMessage("Masukkan no. WhatsApp atau email untuk menerima link reset kata sandi!");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: forgotUsername.trim(),
          emailOrPhone: forgotContact.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBell();
        setForgotSent(true);
        setForgotResponseMessage(data.message || "Permohonan reset kata sandi berhasil dikirim ke Super Admin!");
      } else {
        sound.playBuzzer();
        setErrorMessage(data.error || "Gagal mengajukan reset kata sandi. Periksa kembali username Anda.");
      }
    } catch (err) {
      sound.playBuzzer();
      setErrorMessage("Gagal terhubung ke server backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setErrorMessage("");
    setSuccessMessage("");

    if (!newPassword || newPassword.length < 4) {
      sound.playBuzzer();
      setErrorMessage("Kata sandi baru minimal harus 4 karakter!");
      return;
    }
    if (newPassword !== newConfirmPassword) {
      sound.playBuzzer();
      setErrorMessage("Konfirmasi kata sandi baru tidak cocok!");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password-with-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken.trim(),
          newPassword: newPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBell();
        setShowNewPasswordModal(false);
        setShowForgotPasswordModal(false);
        setSuccessMessage(data.message || "Kata sandi baru berhasil disimpan! Silakan login dengan kata sandi baru.");
        if (data.username) {
          setLoginUsername(data.username);
        }
        setLoginPassword("");
        setNewPassword("");
        setNewConfirmPassword("");
        setResetToken("");
        setTokenUserInfo(null);
        // Clean URL query parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        sound.playBuzzer();
        setErrorMessage(data.error || "Gagal menyimpan kata sandi baru.");
      }
    } catch (err) {
      sound.playBuzzer();
      setErrorMessage("Gagal terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setErrorMessage("");
    setSuccessMessage("");
    setIpMismatchInfo(null);
    setIsLoading(true);

    try {
      const data = await authService.login(loginUsername, loginPassword);
      if (data.success && data.user) {
        sound.playBell();
        onLoginSuccess(data.user);
      } else {
        sound.playBuzzer();
        if (data && data.ipMismatch) {
          setIpMismatchInfo({
            ipMismatch: true,
            boundIp: data.boundIp,
            currentIp: data.currentIp,
            username: data.username || loginUsername,
            userId: data.userId,
            fullName: data.fullName
          });
          setIpUnlockUsername(data.username || loginUsername);
          setIpUnlockRequestedIp(data.currentIp);
        }
        setErrorMessage(data.error || "Gagal masuk ke sistem. Periksa kembali username dan kata sandi Anda.");
      }
    } catch (err) {
      sound.playBuzzer();
      setErrorMessage("Terjadi kendala saat memproses login. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setErrorMessage("");
    setSuccessMessage("");

    if (!regFullName.trim()) {
      sound.playBuzzer();
      setErrorMessage("Nama Lengkap wajib diisi!");
      return;
    }
    if (!regUsername.trim() || regUsername.trim().length < 3) {
      sound.playBuzzer();
      setErrorMessage("Username minimal harus 3 karakter!");
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      sound.playBuzzer();
      setErrorMessage("Kata sandi minimal harus 4 karakter!");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      sound.playBuzzer();
      setErrorMessage("Konfirmasi kata sandi tidak cocok!");
      return;
    }

    setIsLoading(true);

    try {
      const data = await authService.register({
        fullName: regFullName,
        username: regUsername,
        password: regPassword,
        organization: regOrganization,
        emailOrPhone: regContact,
        role: "admin"
      });

      if (data.success) {
        sound.playBell();
        setSuccessMessage(data.message || "Pendaftaran berhasil! Akun Anda aktif dan dapat langsung digunakan.");
        setShowRegisterModal(false);
        // Pre-fill username for convenience
        setLoginUsername(regUsername);
        setLoginPassword("");
        // Reset registration fields
        setRegFullName("");
        setRegUsername("");
        setRegPassword("");
        setRegConfirmPassword("");
        setRegOrganization("");
        setRegContact("");
      } else {
        sound.playBuzzer();
        setErrorMessage(data.error || "Gagal mendaftarkan akun baru.");
      }
    } catch (err) {
      sound.playBuzzer();
      setErrorMessage("Terjadi kendala saat mendaftarkan akun baru.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060212] via-[#0d0524] to-[#060212] text-slate-100 flex flex-col justify-between items-center px-4 py-6 select-none relative overflow-x-hidden font-sans">
      
      {/* Background Glow Watermark */}
      <div 
        className="fixed inset-0 opacity-[0.035] pointer-events-none bg-center bg-no-repeat bg-contain z-0"
        style={{ backgroundImage: "url('/jrzscoreutama.png')", backgroundSize: "min(60vw, 60vh)" }}
      />

      {/* Subtle Top Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 max-w-2xl h-36 bg-purple-600/10 blur-[90px] rounded-full pointer-events-none" />

      {/* TOP BRANDING & LOGO */}
      <header className="w-full max-w-md flex flex-col items-center justify-center z-10 pt-2 pb-3">
        <button
          type="button"
          onClick={() => {
            sound.playClick();
            window.dispatchEvent(new CustomEvent("jrz_navigate_tab", { detail: "BERANDA" }));
          }}
          className="relative group cursor-pointer bg-transparent border-none p-0 flex flex-col items-center focus:outline-none"
          title="Klik logo JRZ SCORE untuk kembali ke Beranda"
          id="btn-auth-logo-beranda"
        >
          <img 
            src="/jrzscoreutama.png" 
            alt="JRZ Score Logo" 
            className="max-h-24 sm:max-h-28 md:max-h-32 w-auto object-contain filter drop-shadow-[0_0_25px_rgba(123,44,255,0.5)] transition-transform duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <p className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.25em] text-purple-300/70 font-semibold mt-2 text-center group-hover:text-purple-200 transition-colors">
            JRZ SCORE • DIGITAL SCORING SYSTEM • IPSI
          </p>
        </button>
      </header>

      {/* MAIN AUTH CARD */}
      <main className="w-full max-w-md bg-[#0c051f]/90 border border-purple-500/25 rounded-3xl p-6 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(124,58,237,0.15)] backdrop-blur-xl z-10 my-auto">
        
        {/* FEEDBACK ALERTS */}
        {ipMismatchInfo && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-amber-950/70 via-[#1e0e02] to-amber-950/80 border-2 border-amber-500/70 text-amber-200 text-xs shadow-xl animate-scaleIn">
            <div className="flex items-start gap-2.5 mb-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
                <Network className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h4 className="font-extrabold text-amber-300 uppercase tracking-wide">
                  Akses Ditolak: Perangkat / IP Berbeda
                </h4>
                <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed">
                  Akun <strong>@{ipMismatchInfo.username}</strong> telah terkunci khusus untuk 1 alamat IP. Anda sedang login dari perangkat/server yang berbeda.
                </p>
              </div>
            </div>

            <div className="bg-[#0b031b]/90 border border-amber-500/30 rounded-xl p-2.5 mb-3 font-mono text-[10.5px] space-y-1.5">
              <div className="flex justify-between items-center text-purple-300">
                <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-amber-400" /> IP Terkunci Akun:</span>
                <span className="text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">{ipMismatchInfo.boundIp}</span>
              </div>
              <div className="flex justify-between items-center text-purple-300">
                <span className="flex items-center gap-1"><Laptop className="w-3 h-3 text-rose-400" /> IP Perangkat Saat Ini:</span>
                <span className="text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">{ipMismatchInfo.currentIp}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openIpUnlockModal(ipMismatchInfo.username)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/60 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Minta Buka Izin IP ke Super Admin</span>
            </button>
          </div>
        )}

        {!ipMismatchInfo && errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1.5 font-mono">
              Username / ID Pengguna
            </label>
            <div className="relative">
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Masukkan username akun..."
                className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-4 py-3 pl-10 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all font-sans"
                required
                autoFocus
              />
              <User className="w-4 h-4 text-purple-400/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1.5 font-mono">
              Kata Sandi (Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Masukkan kata sandi..."
                className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-4 py-3 pl-10 pr-10 text-white placeholder-purple-300/30 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all font-sans"
                required
              />
              <Lock className="w-4 h-4 text-purple-400/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-purple-400/60 hover:text-purple-300 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* PRIMARY SUBMIT BUTTON: "MASUK" */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] text-white font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40 border border-purple-400/40 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Masuk</span>
              </>
            )}
          </button>

          {/* GRID MENU AKSI: DAFTAR AKUN, LUPA SANDI, GANTI PERANGKAT / IZIN IP */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            {/* 1. Tombol Daftar Akun Baru */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setShowRegisterModal(true);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="py-2.5 px-3 rounded-xl bg-[#170a38]/90 hover:bg-[#230f55] border border-purple-500/30 hover:border-purple-400/60 text-purple-200 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md"
            >
              <UserPlus className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              <span className="truncate">Daftar Akun</span>
            </button>

            {/* 2. Tombol Lupa Sandi */}
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setShowForgotPasswordModal(true);
                setForgotSent(false);
                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="py-2.5 px-3 rounded-xl bg-[#170a38]/90 hover:bg-[#230f55] border border-amber-500/30 hover:border-amber-400/60 text-amber-200 hover:text-amber-100 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Lupa Sandi</span>
            </button>

            {/* 3. Grid Card Penuh: Ganti Perangkat / Minta Buka Izin IP Akun */}
            <button
              type="button"
              onClick={() => openIpUnlockModal()}
              className="col-span-2 py-3 px-3.5 rounded-xl bg-gradient-to-r from-[#170a38]/90 via-[#0e203a]/85 to-[#170a38]/90 hover:from-[#220e50] hover:via-[#132c52] hover:to-[#220e50] border border-cyan-500/40 hover:border-cyan-400/70 text-cyan-200 hover:text-cyan-100 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-md group"
            >
              <Network className="w-4 h-4 text-cyan-400 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="truncate">Ganti Perangkat / Minta Buka Izin IP Akun</span>
            </button>
          </div>
        </form>

      </main>

      {/* MODAL 1: DAFTAR AKUN BARU */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0d0524] border border-purple-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative max-h-[90vh] overflow-y-auto animate-scaleIn">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-purple-900/50 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Pendaftaran Akun Baru
                  </h3>
                  <p className="text-[10.5px] text-purple-300/60 font-mono">
                    IPSI Digital Scoring System
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="w-8 h-8 rounded-xl bg-purple-950/60 hover:bg-rose-950/60 border border-purple-800/40 hover:border-rose-500/40 text-purple-300 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notice */}
            <div className="bg-purple-950/40 border border-purple-500/25 rounded-xl p-3 text-[11px] text-purple-200/90 leading-relaxed mb-4">
              <span className="font-bold text-amber-300">ℹ️ Alur Aktivasi:</span> Pendaftaran akun baru memerlukan <strong>verifikasi dan persetujuan dari Super Admin</strong> sebelum akun dapat digunakan untuk masuk ke sistem.
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="cth: Ahmad Fauzi, S.Pd"
                    className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3.5 py-2.5 pl-9 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-purple-400 transition-all font-sans"
                    required
                    autoFocus
                  />
                  <User className="w-3.5 h-3.5 text-purple-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                    Username
                  </label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="cth: fauzi_ipsi"
                    className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3 py-2.5 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-purple-400 transition-all font-sans"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                    No. HP / WhatsApp
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regContact}
                      onChange={(e) => setRegContact(e.target.value)}
                      placeholder="08123456789"
                      className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3 py-2.5 pl-8 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-purple-400 transition-all font-sans"
                    />
                    <Phone className="w-3 h-3 text-purple-400/60 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                  Instansi / Pengcab / Kontingen
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={regOrganization}
                    onChange={(e) => setRegOrganization(e.target.value)}
                    placeholder="cth: Pengkab IPSI Banyumas / Kontingen Jawa Tengah"
                    className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3.5 py-2.5 pl-9 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-purple-400 transition-all font-sans"
                  />
                  <Building2 className="w-3.5 h-3.5 text-purple-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 4 karakter"
                      className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3 py-2.5 pr-8 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-purple-400 transition-all font-sans"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400/60 hover:text-purple-300 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                    Konfirmasi Sandi
                  </label>
                  <div className="relative">
                    <input
                      type={showRegConfirmPassword ? "text" : "password"}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Ulangi sandi"
                      className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3 py-2.5 pr-8 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-purple-400 transition-all font-sans"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400/60 hover:text-purple-300 cursor-pointer"
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/40 text-purple-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 border border-emerald-400/40 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mendaftarkan...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Kirim Pendaftaran</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: LUPA SANDI */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0d0524] border border-amber-500/40 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative animate-scaleIn">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-purple-900/50 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Lupa Kata Sandi
                  </h3>
                  <p className="text-[10.5px] text-amber-300/70 font-mono">
                    Reset & Pemulihan Akun
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(false)}
                className="w-8 h-8 rounded-xl bg-purple-950/60 hover:bg-rose-950/60 border border-purple-800/40 hover:border-rose-500/40 text-purple-300 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSent ? (
              <div className="text-center py-4 space-y-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wide">Permohonan Berhasil Dikirim</h4>
                  <p className="text-xs text-purple-200/80 mt-1.5 leading-relaxed">
                    {forgotResponseMessage || `Permintaan reset sandi untuk akun "${forgotUsername}" telah dicatat. Super Admin akan memverifikasi dan mengirimkan tautan reset kata sandi baru ke kontak Anda.`}
                  </p>
                </div>

                <div className="bg-[#170a38] border border-amber-500/30 rounded-2xl p-3.5 text-left text-xs space-y-2">
                  <div className="flex items-center justify-between text-purple-300">
                    <span>Username:</span>
                    <strong className="text-amber-300 font-mono">@{forgotUsername}</strong>
                  </div>
                  <div className="flex items-center justify-between text-purple-300">
                    <span>Kontak WhatsApp/Email:</span>
                    <strong className="text-emerald-300 font-mono">{forgotContact}</strong>
                  </div>
                </div>

                <a
                  href={`https://wa.me/6281379876424?text=${encodeURIComponent(`Halo Super Admin JRZ Score IPSI, saya ingin mengajukan verifikasi reset kata sandi untuk akun username: ${forgotUsername}. Nomor/Kontak saya: ${forgotContact}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim Notifikasi via WhatsApp</span>
                </a>

                <div className="pt-2 border-t border-purple-900/40 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotSent(false);
                      setShowForgotPasswordModal(false);
                    }}
                    className="w-full py-2.5 text-xs text-purple-300/70 hover:text-purple-200 cursor-pointer font-mono"
                  >
                    Kembali ke Halaman Masuk
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200/90 leading-relaxed">
                  <p className="font-semibold text-amber-300 mb-1">🔐 Prosedur Reset Kata Sandi:</p>
                  1. Masukkan <strong>Username</strong> akun Anda.<br />
                  2. Masukkan <strong>No. WhatsApp atau Email</strong> terdaftar.<br />
                  3. Super Admin akan memverifikasi permohonan dan menerbitkan tautan/token reset untuk membuat kata sandi baru.
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                    Username Akun Anda <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={forgotUsername}
                      onChange={(e) => setForgotUsername(e.target.value)}
                      placeholder="Masukkan username yang terdaftar..."
                      className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3.5 py-2.5 pl-9 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-amber-400 transition-all font-sans"
                      required
                      autoFocus
                    />
                    <User className="w-3.5 h-3.5 text-purple-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                    No. WhatsApp atau Email Terdaftar <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={forgotContact}
                      onChange={(e) => setForgotContact(e.target.value)}
                      placeholder="cth: 08123456789 atau nama@email.com"
                      className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3.5 py-2.5 pl-9 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-amber-400 transition-all font-sans"
                      required
                    />
                    <Phone className="w-3.5 h-3.5 text-purple-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/40 text-purple-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 border border-amber-400/40 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                        <span>Mengirim Permohonan...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-slate-950" />
                        <span>Kirim Permohonan Reset</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 border-t border-purple-900/40 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      const token = prompt("Masukkan Token Reset Kata Sandi yang diberikan Super Admin (format rst_...):");
                      if (token && token.trim()) {
                        setResetToken(token.trim());
                        verifyTokenOnLoad(token.trim());
                      }
                    }}
                    className="text-amber-400 hover:text-amber-300 hover:underline cursor-pointer font-bold"
                  >
                    Sudah Punya Token Reset?
                  </button>
                  <a
                    href="https://wa.me/6281379876424?text=Halo%20Super%20Admin%20JRZ%20Score%20IPSI,%20saya%20butuh%20bantuan%20reset%20kata%20sandi%20akun."
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1 font-bold"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>WhatsApp Admin</span>
                  </a>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL 3: BUAT KATA SANDI BARU (VERIFIED TOKEN) */}
      {showNewPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0d0524] border border-emerald-500/50 rounded-3xl p-6 sm:p-7 shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative animate-scaleIn">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-purple-900/50 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Buat Kata Sandi Baru
                  </h3>
                  <p className="text-[10.5px] text-emerald-300/80 font-mono">
                    Token Terverifikasi oleh Super Admin
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowNewPasswordModal(false)}
                className="w-8 h-8 rounded-xl bg-purple-950/60 hover:bg-rose-950/60 border border-purple-800/40 hover:border-rose-500/40 text-purple-300 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Account Badge */}
            {tokenUserInfo && (
              <div className="bg-[#170a38] border border-emerald-500/30 rounded-2xl p-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white uppercase">{tokenUserInfo.fullName}</div>
                    <div className="text-[10.5px] text-emerald-400 font-mono">@{tokenUserInfo.username}</div>
                  </div>
                </div>
                <span className="text-[9.5px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full uppercase border border-emerald-500/30">
                  {tokenUserInfo.role}
                </span>
              </div>
            )}

            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                  Kata Sandi Baru <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter..."
                    className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3.5 py-2.5 pr-9 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-emerald-400 transition-all font-sans"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400/60 hover:text-purple-300 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                  Konfirmasi Kata Sandi Baru <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewConfirmPass ? "text" : "password"}
                    value={newConfirmPassword}
                    onChange={(e) => setNewConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi baru..."
                    className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3.5 py-2.5 pr-9 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-emerald-400 transition-all font-sans"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewConfirmPass(!showNewConfirmPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400/60 hover:text-purple-300 cursor-pointer"
                  >
                    {showNewConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPasswordModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/40 text-purple-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 border border-emerald-400/40 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan Sandi Baru...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan Kata Sandi Baru</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL 4: IZIN BUKA KUNCI IP / GANTI PERANGKAT */}
      {showIpUnlockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#0d0524] border border-amber-500/50 rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative max-h-[90vh] overflow-y-auto animate-scaleIn">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-purple-900/50 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Izin Buka Kunci IP
                  </h3>
                  <p className="text-[10.5px] text-amber-300/70 font-mono">
                    Pergantian Perangkat / Server Gelanggang
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIpUnlockModal(false)}
                className="w-8 h-8 rounded-xl bg-purple-950/60 hover:bg-rose-950/60 border border-purple-800/40 hover:border-rose-500/40 text-purple-300 hover:text-rose-300 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {ipUnlockSent ? (
              <div className="text-center py-4 space-y-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wide">Permohonan Izin IP Terkirim</h4>
                  <p className="text-xs text-purple-200/80 mt-1.5 leading-relaxed">
                    {ipUnlockResponseMessage || `Permintaan perubahan IP perangkat untuk akun "${ipUnlockUsername}" berhasil dicatat. Super Admin akan memverifikasi permohonan ini.`}
                  </p>
                </div>

                <div className="bg-[#170a38] border border-amber-500/30 rounded-2xl p-3.5 text-left text-xs space-y-2 font-mono">
                  <div className="flex items-center justify-between text-purple-300">
                    <span>Username:</span>
                    <strong className="text-amber-300">@{ipUnlockUsername}</strong>
                  </div>
                  <div className="flex items-center justify-between text-purple-300">
                    <span>IP Baru Diminta:</span>
                    <strong className="text-emerald-400">{ipUnlockRequestedIp || "Terdeteksi Otomatis"}</strong>
                  </div>
                  {ipUnlockContact && (
                    <div className="flex items-center justify-between text-purple-300">
                      <span>Kontak:</span>
                      <strong className="text-slate-200">{ipUnlockContact}</strong>
                    </div>
                  )}
                </div>

                <a
                  href={`https://wa.me/6281379876424?text=${encodeURIComponent(`Halo Super Admin JRZ Score IPSI, saya mengajukan permohonan izin pembukaan kunci IP / ganti perangkat untuk akun username: ${ipUnlockUsername}. IP baru saya: ${ipUnlockRequestedIp || 'IP Server Baru'}. Alasan: ${ipUnlockReason || 'Pindah server operator gelanggang'}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Konfirmasi Cepat via WhatsApp Super Admin</span>
                </a>

                <div className="pt-2 border-t border-purple-900/40">
                  <button
                    type="button"
                    onClick={() => {
                      setIpUnlockSent(false);
                      setShowIpUnlockModal(false);
                      setIpMismatchInfo(null);
                    }}
                    className="w-full py-2.5 text-xs text-purple-300/70 hover:text-purple-200 cursor-pointer font-mono"
                  >
                    Kembali ke Halaman Masuk
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleIpUnlockSubmit} className="space-y-4">
                <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200/90 leading-relaxed space-y-1">
                  <p className="font-semibold text-amber-300 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Keamanan IP Address 1-Perangkat:
                  </p>
                  <p>
                    Setiap akun operator diikat secara khusus ke IP perangkat server gelanggang. Jika perangkat atau jaringan berubah, ajukan permohonan agar Super Admin mengizinkan IP baru.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                    Username Akun Anda <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={ipUnlockUsername}
                      onChange={(e) => setIpUnlockUsername(e.target.value)}
                      placeholder="Masukkan username akun yang terkunci..."
                      className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3.5 py-2.5 pl-9 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-amber-400 transition-all font-sans"
                      required
                      autoFocus
                    />
                    <User className="w-3.5 h-3.5 text-purple-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                    IP Address Perangkat Saat Ini
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={ipUnlockRequestedIp}
                      onChange={(e) => setIpUnlockRequestedIp(e.target.value)}
                      placeholder="cth: 127.0.0.1 atau 192.168.1.50"
                      className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3.5 py-2.5 pl-9 font-mono text-emerald-300 text-xs focus:outline-none focus:border-amber-400 transition-all"
                    />
                    <Laptop className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-purple-300/50 mt-1 font-mono">
                    * Terdeteksi otomatis dari jaringan browser Anda
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                    Alasan Pergantian Perangkat / IP
                  </label>
                  <input
                    type="text"
                    value={ipUnlockReason}
                    onChange={(e) => setIpUnlockReason(e.target.value)}
                    placeholder="cth: Pindah laptop operator Gelanggang A / Ganti Router WiFi"
                    className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3.5 py-2.5 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-amber-400 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase tracking-wider mb-1 font-mono">
                    No. WhatsApp / Kontak
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={ipUnlockContact}
                      onChange={(e) => setIpUnlockContact(e.target.value)}
                      placeholder="08123456789 (opsional)"
                      className="w-full bg-[#13072d] border border-purple-500/30 rounded-xl px-3.5 py-2.5 pl-9 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-amber-400 transition-all font-sans"
                    />
                    <Phone className="w-3.5 h-3.5 text-purple-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowIpUnlockModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl bg-purple-950/50 hover:bg-purple-900/60 border border-purple-800/40 text-purple-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 border border-amber-400/40 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                        <span>Mengirim Permohonan...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-slate-950" />
                        <span>Kirim Permohonan Izin IP</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 border-t border-purple-900/40 flex items-center justify-center text-[11px]">
                  <a
                    href="https://wa.me/6281379876424?text=Halo%20Super%20Admin%20JRZ%20Score%20IPSI,%20saya%20butuh%20izin%20pembukaan%20kunci%20IP%20perangkat."
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 hover:underline inline-flex items-center gap-1 font-bold"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Hubungi Super Admin via WhatsApp</span>
                  </a>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full max-w-md text-center text-[10px] text-purple-300/50 font-mono mt-4 z-10">
        IPSI Digitial Scoring System - Jaka Oktorian
      </footer>
    </div>
  );
}
