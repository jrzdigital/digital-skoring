/**
 * Simplified Sign In & Sign Up Modal
 */

import React, { useState } from "react";
import { 
  X, 
  Eye, 
  EyeOff, 
  KeyRound, 
  ShieldCheck, 
  ArrowLeft, 
  MessageSquare, 
  Check, 
  Copy,
  AlertCircle,
  ExternalLink,
  Send
} from "lucide-react";
import { UserAccount } from "../../types";
import { authService } from "../../services/authService";
import { 
  otpService, 
  OtpRecord, 
  formatOtpWhatsAppMessage, 
  getWhatsAppUrlForSuperadmin, 
  sendWhatsAppNotificationToSuperadmin,
  getSuperAdminWaNumber
} from "../../services/otpService";
import { sound } from "../../utils/sound";

interface SignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserAccount) => void;
  initialTab?: "SIGNIN" | "SIGNUP";
  restrictedPrompt?: boolean;
  customNotice?: string;
  onGoToMonitor?: () => void;
}

export function SignModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess,
  initialTab = "SIGNIN"
}: SignModalProps) {
  const [activeMode, setActiveMode] = useState<"SIGNIN" | "SIGNUP" | "OTP_VERIFY">(initialTab);

  // Sign In States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Direct Gmail Input State (fallback if popup blocked)
  const [gmailInput, setGmailInput] = useState("");
  const [showGmailInput, setShowGmailInput] = useState(false);

  // Sign Up States
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  // OTP Verification States
  const [pendingOtpIdentifier, setPendingOtpIdentifier] = useState("");
  const [pendingType, setPendingType] = useState<"SIGNUP" | "GMAIL_LOGIN">("SIGNUP");
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [currentOtpRecord, setCurrentOtpRecord] = useState<OtpRecord | null>(null);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [generatedOtpCode, setGeneratedOtpCode] = useState("");
  const [autoSentWa, setAutoSentWa] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  // Handle Google / Gmail Auto Sign In -> Next Step: Enter OTP from Superadmin
  const handleGoogleSignIn = async () => {
    sound.playClick();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await authService.signInWithGoogle();
      if (res.success && res.user) {
        const identifier = res.user.emailOrPhone || res.user.username;
        const otpRecord = await otpService.createOtp(identifier, "GMAIL_LOGIN", {
          user: res.user,
          email: res.user.emailOrPhone,
          fullName: res.user.fullName
        });

        setCurrentOtpRecord(otpRecord);
        setGeneratedOtpCode(otpRecord.code);
        setPendingOtpIdentifier(identifier);
        setPendingType("GMAIL_LOGIN");
        setPendingPayload({ user: res.user, fullName: res.user.fullName });
        setEnteredOtp("");
        setActiveMode("OTP_VERIFY");

        // Otomatis kirim pesan notifikasi lengkap ke WhatsApp Super Admin
        const sent = sendWhatsAppNotificationToSuperadmin(otpRecord);
        setAutoSentWa(sent);
        sound.playVictory();
        setSuccessMessage("Akun Google terverifikasi! Sistem otomatis mengirimkan pesan permohonan ke WhatsApp Superadmin.");
      } else {
        setShowGmailInput(true);
        setErrorMessage(res.error || "Gagal membuka akun Google. Silakan masukkan alamat Gmail.");
      }
    } catch (err: any) {
      setShowGmailInput(true);
      setErrorMessage("Gagal masuk dengan Google. Silakan masukkan email Gmail.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Direct Gmail Submission -> Next Step: Enter OTP from Superadmin
  const handleDirectGmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailInput.trim() || !gmailInput.includes("@")) {
      setErrorMessage("Masukkan alamat email Gmail yang valid!");
      return;
    }

    sound.playClick();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await authService.signInWithGmail(gmailInput.trim());
      if (res.success && res.user) {
        const identifier = res.user.emailOrPhone || res.user.username;
        const otpRecord = await otpService.createOtp(identifier, "GMAIL_LOGIN", {
          user: res.user,
          email: res.user.emailOrPhone,
          fullName: res.user.fullName
        });

        setCurrentOtpRecord(otpRecord);
        setGeneratedOtpCode(otpRecord.code);
        setPendingOtpIdentifier(identifier);
        setPendingType("GMAIL_LOGIN");
        setPendingPayload({ user: res.user, fullName: res.user.fullName });
        setEnteredOtp("");
        setActiveMode("OTP_VERIFY");

        // Otomatis kirim pesan notifikasi lengkap ke WhatsApp Super Admin
        const sent = sendWhatsAppNotificationToSuperadmin(otpRecord);
        setAutoSentWa(sent);
        sound.playVictory();
        setSuccessMessage("Akun Gmail terdaftar! Sistem otomatis mengirimkan pesan permohonan ke WhatsApp Superadmin.");
      } else {
        setErrorMessage(res.error || "Gagal masuk dengan Gmail.");
      }
    } catch (err: any) {
      setErrorMessage("Terjadi kendala saat memproses Gmail.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Username & Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage("Harap masukkan username dan password!");
      return;
    }

    sound.playClick();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const cleanUser = username.trim();
      const cleanPass = password.trim();
      let loggedUser: UserAccount | null = null;

      // Direct credential check for superadmin / admin
      if (
        (cleanUser.toLowerCase() === "jakaoktorian" && cleanPass === "Abuyaku21*") ||
        (cleanUser.toLowerCase() === "admin" && cleanPass === "admin123")
      ) {
        const isJaka = cleanUser.toLowerCase() === "jakaoktorian";
        loggedUser = {
          id: isJaka ? "usr_superadmin" : "usr_admin",
          username: isJaka ? "jakaoktorian" : "admin",
          fullName: isJaka ? "Jaka Oktorian" : "Administrator",
          role: isJaka ? "superadmin" : "admin",
          status: "APPROVED",
          organization: isJaka ? "Pengurus Besar IPSI" : "Panitia",
          emailOrPhone: isJaka ? "jakaoktorian2@gmail.com" : "admin@ipsi.id",
          createdAt: Date.now(),
          approvedAt: Date.now(),
          approvedBy: "System"
        };
        authService.saveUserToStorage(loggedUser);
      } else {
        const res = await authService.login(cleanUser, cleanPass);
        if (res.success && res.user) {
          loggedUser = res.user as UserAccount;
          authService.saveUserToStorage(loggedUser);
        } else {
          setErrorMessage(res.error || "Username atau password salah!");
          setIsLoading(false);
          return;
        }
      }

      if (loggedUser) {
        sound.playVictory();
        setSuccessMessage("Berhasil masuk!");
        setTimeout(() => {
          onLoginSuccess(loggedUser!);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setErrorMessage("Gagal menghubungkan ke sistem login.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Simple Sign Up -> Next Step: Enter OTP from Superadmin
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword) {
      setErrorMessage("Harap lengkapi username dan password!");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage("Konfirmasi password tidak cocok!");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage("Password minimal 6 karakter!");
      return;
    }

    sound.playClick();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const cleanUser = regUsername.trim().toLowerCase().replace(/\s+/g, "_");

      // Check if username already exists
      const allUsers = await authService.getAllUsers();
      const existing = allUsers.find(u => u.username.toLowerCase() === cleanUser);
      if (existing) {
        setErrorMessage("Username sudah terdaftar! Silakan gunakan username lain.");
        setIsLoading(false);
        return;
      }

      // Generate OTP record
      const otpRecord = await otpService.createOtp(cleanUser, "SIGNUP", {
        username: cleanUser,
        password: regPassword,
        fullName: regUsername.trim()
      });

      setCurrentOtpRecord(otpRecord);
      setGeneratedOtpCode(otpRecord.code);
      setPendingOtpIdentifier(cleanUser);
      setPendingType("SIGNUP");
      setPendingPayload({
        fullName: regUsername.trim(),
        username: cleanUser,
        password: regPassword
      });
      setEnteredOtp("");
      setActiveMode("OTP_VERIFY");

      // Otomatis kirim pesan notifikasi lengkap ke WhatsApp Super Admin
      const sent = sendWhatsAppNotificationToSuperadmin(otpRecord);
      setAutoSentWa(sent);
      sound.playVictory();
      setSuccessMessage("Data akun tersimpan! Sistem otomatis mengirimkan notifikasi ke WhatsApp Superadmin.");
    } catch (err: any) {
      setErrorMessage("Terjadi kendala saat memproses pendaftaran.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Verification Submission
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = enteredOtp.trim();
    if (!cleanOtp) {
      setErrorMessage("Harap masukkan 6 digit kode OTP!");
      return;
    }

    sound.playClick();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const verifyRes = await otpService.verifyOtp(pendingOtpIdentifier, cleanOtp);
      if (!verifyRes.valid) {
        sound.playError();
        setErrorMessage(verifyRes.error || "Kode OTP salah atau tidak cocok!");
        setIsLoading(false);
        return;
      }

      // Verified! Complete registration or Gmail login
      if (pendingType === "SIGNUP" && pendingPayload) {
        const regRes = await authService.register({
          fullName: pendingPayload.fullName || pendingPayload.username,
          username: pendingPayload.username,
          password: pendingPayload.password,
          organization: "IPSI"
        });

        if (regRes.success && regRes.user) {
          sound.playVictory();
          setSuccessMessage("Verifikasi OTP berhasil! Akun Anda aktif.");
          setTimeout(() => {
            onLoginSuccess(regRes.user as UserAccount);
            onClose();
          }, 600);
        } else {
          setErrorMessage(regRes.error || "Gagal menyimpan akun.");
        }
      } else if (pendingType === "GMAIL_LOGIN" && pendingPayload?.user) {
        authService.saveUserToStorage(pendingPayload.user);
        sound.playVictory();
        setSuccessMessage("Verifikasi OTP berhasil! Selamat datang.");
        setTimeout(() => {
          onLoginSuccess(pendingPayload.user);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage("Terjadi kendala verifikasi kode OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-sm bg-[#0c142b] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Title & Close Button */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            {activeMode === "OTP_VERIFY" && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveMode(pendingType === "GMAIL_LOGIN" ? "SIGNIN" : "SIGNUP");
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Kembali"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-base font-bold text-white tracking-wide">
              {activeMode === "OTP_VERIFY" 
                ? "Verifikasi Kode OTP" 
                : activeMode === "SIGNIN" 
                  ? "Sign In" 
                  : "Sign Up"}
            </h2>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Messages */}
        {errorMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs font-semibold">
            {successMessage}
          </div>
        )}

        {activeMode === "OTP_VERIFY" ? (
          /* OTP Verification Mode with Automated Superadmin WhatsApp Notification */
          <div className="space-y-4">
            {/* Auto WhatsApp Notification Delivery Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 shadow-lg">
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    Pesan Otomatis ke WA Superadmin
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  WA: 0813-7987-6424
                </span>
              </div>

              {/* Rincian Permohonan Sesuai Permintaan */}
              {(() => {
                const activeRecord: OtpRecord = (currentOtpRecord || {
                  id: `otp_${Date.now()}_${pendingOtpIdentifier}`,
                  identifier: pendingOtpIdentifier,
                  code: generatedOtpCode || "------",
                  type: pendingType,
                  payload: pendingPayload,
                  createdAt: Date.now(),
                  expiresAt: Date.now() + 86400000,
                  status: "PENDING"
                }) as unknown as OtpRecord;

                const applicantName = activeRecord.payload?.fullName || pendingOtpIdentifier;
                const actionName =
                  pendingType === "GMAIL_LOGIN"
                    ? "Login Otomatis Gmail / Google"
                    : "Sign Up (Pendaftaran Akun Baru)";

                const dateObj = new Date(activeRecord.createdAt);
                const timeStr = dateObj.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit"
                });
                const dateStr = dateObj.toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                });

                const waUrl = getWhatsAppUrlForSuperadmin(activeRecord);
                const fullMsg = formatOtpWhatsAppMessage(activeRecord);

                return (
                  <div className="space-y-2.5">
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-slate-400 shrink-0">Akun Pemohon:</span>
                        <span className="font-bold text-white text-right break-all">
                          {applicantName} <span className="text-slate-400 font-mono text-[10px]">({pendingOtpIdentifier})</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 shrink-0">Jenis Aksi:</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {actionName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 shrink-0">Kode 6-Digit OTP:</span>
                        <span className="font-mono text-amber-300 font-extrabold text-sm tracking-widest bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/40">
                          {activeRecord.code}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 shrink-0">Waktu Pengajuan:</span>
                        <span className="text-slate-300 font-mono text-[10px]">
                          {dateStr}, {timeStr} WIB
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-emerald-200/90 leading-tight">
                      Sistem telah otomatis mengarahkan pengiriman rincian di atas ke WhatsApp Superadmin (<strong>Jaka Oktorian</strong>).
                    </p>

                    {/* WhatsApp Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => sound.playClick()}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-md active:scale-98 text-center"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim / Buka WA</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          navigator.clipboard.writeText(fullMsg);
                          setCopiedMessage(true);
                          setTimeout(() => setCopiedMessage(false), 2000);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-[11px] transition-all cursor-pointer text-center"
                      >
                        {copiedMessage ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Salin Teks Pesan</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* OTP Input Form */}
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
                  Ketik 6 Digit Kode OTP Untuk Menyelesaikan Akses
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  required
                  className="w-full text-center text-2xl font-mono tracking-[0.4em] font-bold py-3 rounded-xl bg-slate-900 border-2 border-slate-700 focus:border-amber-400 text-amber-300 placeholder:text-slate-600 focus:outline-none transition-colors shadow-inner"
                />
                <p className="text-[10px] text-slate-400 text-center mt-1">
                  Masukkan 6 digit angka yang disetujui Superadmin
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || enteredOtp.trim().length < 6}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white font-bold text-sm tracking-wide transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? "Memverifikasi..." : "Verifikasi & Masuk Sekarang"}
              </button>
            </form>

            {/* Back to Sign In */}
            <div className="pt-2 text-center border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveMode("SIGNIN");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Batal & Kembali ke Menu Sign</span>
              </button>
            </div>
          </div>
        ) : activeMode === "SIGNIN" ? (
          <>
            {/* Form Username & Password */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 text-white text-sm placeholder:text-slate-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    required
                    className="w-full px-3.5 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 text-white text-sm placeholder:text-slate-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Tombol Masuk */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm tracking-wide transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? "Memproses..." : "Masuk"}
              </button>
            </form>

            {/* Menu Masuk Otomatis dengan Email Google / Gmail */}
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk otomatis dengan Google / Gmail</span>
              </button>

              {/* Direct Gmail Input (Fallback jika popup diblokir peramban) */}
              {showGmailInput && (
                <form onSubmit={handleDirectGmailSubmit} className="flex gap-2 pt-1">
                  <input
                    type="email"
                    value={gmailInput}
                    onChange={(e) => setGmailInput(e.target.value)}
                    placeholder="email@gmail.com"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
                  >
                    Masuk
                  </button>
                </form>
              )}
            </div>

            {/* Menu Sign Up di bagian bawah */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveMode("SIGNUP");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Belum punya akun? <span className="font-bold text-blue-400 hover:underline">Sign Up</span>
              </button>
            </div>
          </>
        ) : (
          /* Sign Up Mode */
          <>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Masukkan username"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 text-white text-sm placeholder:text-slate-500 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? "text" : "password"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="w-full px-3.5 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 text-white text-sm placeholder:text-slate-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Konfirmasi Password
                </label>
                <input
                  type={showRegPassword ? "text" : "password"}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-blue-500 text-white text-sm placeholder:text-slate-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Tombol Sign Up */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm tracking-wide transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? "Memproses..." : "Sign Up"}
              </button>
            </form>

            {/* Kembali ke Sign In */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveMode("SIGNIN");
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Sudah punya akun? <span className="font-bold text-blue-400 hover:underline">Sign In</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

