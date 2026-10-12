/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldAlert, UserPlus, HelpCircle, ArrowLeft, User, CheckCircle, Shield } from "lucide-react";
import { sound } from "../utils/sound";

interface LoginModalProps {
  correctPassword?: string;
  onLoginSuccess: (role: "admin" | "juri", username: string) => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
  isAdminLogin?: boolean;
}

export function LoginModal({
  onLoginSuccess,
  onCancel,
  title = "SISTEM KEAMANAN LIVE DIGITAL SCORING",
  subtitle = "Otentikasi kredensial IPSI untuk mengoperasikan scoring dan panel juri",
  isAdminLogin = false
}: LoginModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [showPass, setShowPass] = useState(false);
  
  // Login form values
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register form values
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<"admin" | "juri">("juri");
  const [regQuestion, setRegQuestion] = useState("Siapa nama sekolah atau perguruan silat pertama Anda?");
  const [regAnswer, setRegAnswer] = useState("");
  
  // Forgot password values
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Error / Success feedback
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [loading, setLoading] = useState(false);

  // Sound shortcuts
  const playClick = () => sound.playClick();
  const playBuzzer = () => sound.playBuzzer();
  const playBell = () => sound.playBell();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setErrorText("");
    setSuccessText("");
    setLoading(true);

    if (isAdminLogin) {
      // Simulate real delay for visual polish
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (loginUsername === "jakaoktorian2@gmail.com" && loginPassword === "Abuyaku21*") {
        playBell();
        onLoginSuccess("admin", loginUsername);
      } else {
        playBuzzer();
        setErrorText("Username atau Kata sandi Administrator salah!");
      }
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playBell();
        onLoginSuccess(data.role as "admin" | "juri", data.username);
      } else {
        playBuzzer();
        setErrorText(data.error || "Otentikasi gagal!");
      }
    } catch (err) {
      playBuzzer();
      setErrorText("Terjadi masalah koneksi ke server!");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setErrorText("");
    setSuccessText("");
    setLoading(true);

    if (regUsername.trim().length < 3) {
      playBuzzer();
      setErrorText("Username minimal harus 3 karakter!");
      setLoading(false);
      return;
    }
    if (regPassword.length < 4) {
      playBuzzer();
      setErrorText("Sandi minimal harus 4 karakter!");
      setLoading(false);
      return;
    }
    if (!regAnswer.trim()) {
      playBuzzer();
      setErrorText("Jawaban pertanyaan keamanan tidak boleh kosong!");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          role: regRole,
          question: regQuestion,
          answer: regAnswer,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playBell();
        setSuccessText("Akun berhasil didaftarkan di database! Silakan masuk.");
        setLoginUsername(regUsername); // prefill username
        setLoginPassword(regPassword); // prefill password
        // Reset reg states
        setRegUsername("");
        setRegPassword("");
        setRegAnswer("");
        // Return to login screen
        setMode("login");
      } else {
        playBuzzer();
        setErrorText(data.error || "Gagal membuat akun baru.");
      }
    } catch (err) {
      playBuzzer();
      setErrorText("Koneksi gagal saat mendaftarkan akun!");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setErrorText("");
    setSuccessText("");
    setLoading(true);

    if (!forgotUsername.trim()) {
      playBuzzer();
      setErrorText("Masukkan username akun Anda!");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/forgot-password/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: forgotUsername }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSecurityQuestion(data.question);
        setForgotStep(2);
      } else {
        playBuzzer();
        setErrorText(data.error || "Username tidak valid.");
      }
    } catch (err) {
      playBuzzer();
      setErrorText("Kesalahan saat menghubungi server database.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setErrorText("");
    setSuccessText("");
    setLoading(true);

    if (!securityAnswer.trim()) {
      playBuzzer();
      setErrorText("Berikan jawaban Anda!");
      setLoading(false);
      return;
    }
    if (newPassword.length < 4) {
      playBuzzer();
      setErrorText("Sandi baru sekurangnya 4 karakter!");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: forgotUsername,
          answer: securityAnswer,
          newPassword: newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playBell();
        setSuccessText("Sandi akun baru berhasil di-reset! Silakan login.");
        setLoginUsername(forgotUsername);
        setLoginPassword("");
        // Reset recovery states
        setForgotUsername("");
        setSecurityAnswer("");
        setNewPassword("");
        setForgotStep(1);
        setMode("login");
      } else {
        playBuzzer();
        setErrorText(data.error || "Reset password ditolak.");
      }
    } catch (err) {
      playBuzzer();
      setErrorText("Kesalahan otentikasi server saat mereset.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: "login" | "register" | "forgot") => {
    playClick();
    setErrorText("");
    setSuccessText("");
    setMode(newMode);
    setForgotStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-hitam/80 backdrop-blur-md">
      <div 
        id="login_card"
        className="w-full max-w-md p-8 border rounded-2xl bg-gradient-to-b from-[#0e0728]/95 via-[#05010F]/95 to-[#05010F]/95 border-ungu-neon/35 shadow-[0_0_40px_rgba(123,44,255,0.2)] text-white relative overflow-hidden transition-all duration-300"
      >
        {/* Upper Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-biru-neon via-ungu-neon to-merah-neon" />
        
        {/* Background silhouette */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] pointer-events-none transform translate-x-8 -translate-y-8 select-none">
          <svg viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 15 L20 45 L40 45 L30 75 L70 40 L50 40 Z" />
          </svg>
        </div>

        {/* 1. REGISTER SCREEN */}
        {mode === "register" && (
          <div>
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="p-3 mb-3.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                <UserPlus className="w-7 h-7 text-purple-400" />
              </div>
              <h2 className="text-lg font-black tracking-widest text-purple-200 uppercase font-orbitron">
                BUAT AKUN BARU
              </h2>
              <p className="mt-1 text-[11px] text-slate-400 font-sans max-w-xs">
                Daftarkan akun admin aplikasi atau wasit juri baru ke dalam database lokal sistem secara permanen
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-[10px] font-bold tracking-wider text-purple-300 uppercase font-sans">
                  Username Akun Jelas
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-purple-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Contoh: wasit_kamal"
                    className="w-full pl-10 pr-4 py-2.5 text-xs text-white border rounded-xl bg-slate-950/80 border-purple-500/25 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-[10px] font-bold tracking-wider text-purple-300 uppercase font-sans">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-purple-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Sandi minimal 4 huruf"
                    className="w-full pl-10 pr-10 py-2.5 text-xs text-white border rounded-xl bg-slate-950/80 border-purple-500/25 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => { playClick(); setShowPass(!showPass); }}
                    className="absolute text-slate-450 right-3 top-3 hover:text-white transition-all"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-[10px] font-bold tracking-wider text-purple-300 uppercase font-sans">
                  Pilih Level Hak Akses (Role)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { playClick(); setRegRole("juri"); }}
                    className={`py-2 text-[11px] font-bold uppercase rounded-xl border transition-all ${
                      regRole === "juri"
                        ? "bg-purple-600/30 border-purple-500 text-purple-100 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                        : "bg-slate-950 border-purple-500/10 text-slate-400"
                    }`}
                  >
                    WASIT JURI
                  </button>
                  <button
                    type="button"
                    onClick={() => { playClick(); setRegRole("admin"); }}
                    className={`py-2 text-[11px] font-bold uppercase rounded-xl border transition-all ${
                      regRole === "admin"
                        ? "bg-amber-600/30 border-amber-500 text-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                        : "bg-slate-950 border-purple-500/10 text-slate-400"
                    }`}
                  >
                    ADMIN UTAMA
                  </button>
                </div>
              </div>

              <div className="pt-1.5">
                <label className="block mb-1 text-[10px] font-bold tracking-wider text-slate-450 uppercase font-sans">
                  Pertanyaan Keamanan (Pemulihan Sandi)
                </label>
                <select
                  value={regQuestion}
                  onChange={(e) => setRegQuestion(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-white border rounded-xl bg-slate-950 border-purple-500/25 focus:outline-none focus:border-purple-400 mb-2 font-sans"
                >
                  <option value="Siapa nama sekolah atau perguruan silat pertama Anda?">Siapa nama perguruan silat pertama Anda?</option>
                  <option value="Apa nama kota tempat turnamen IPSI paling mengesankan Anda?">Apa nama kota turnamen silat Anda?</option>
                  <option value="Siapa nama tokoh pahlawan bela diri idola Anda?">Siapa nama pahlawan bela diri idola Anda?</option>
                </select>
                
                <input
                  type="text"
                  required
                  value={regAnswer}
                  onChange={(e) => setRegAnswer(e.target.value)}
                  placeholder="Jawaban Rahasia Anda"
                  className="w-full px-4 py-2 text-xs text-white border rounded-xl bg-slate-950 border-purple-500/25 focus:border-purple-400 focus:outline-none transition-all font-sans"
                />
              </div>

              {errorText && (
                <div className="flex items-center gap-2 p-2.5 text-xs border rounded-lg bg-red-500/10 border-red-500/30 text-red-400">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span className="font-sans leading-tight">{errorText}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="px-4 py-2.5 text-xs font-bold uppercase rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 text-xs font-black tracking-wider rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.25)] flex items-center justify-center cursor-pointer"
                >
                  {loading ? "Mendaftarkan..." : "DAFTARKAN AKUN"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2. FORGOT PASSWORD SCREEN */}
        {mode === "forgot" && (
          <div>
            <div className="flex flex-col items-center mb-5 text-center">
              <div className="p-3 mb-3.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <HelpCircle className="w-7 h-7 text-amber-400 animate-pulse" />
              </div>
              <h2 className="text-lg font-black tracking-widest text-amber-400 uppercase font-orbitron">
                LUPA KATA SANDI
              </h2>
              <p className="mt-1 text-[11px] text-slate-400 font-sans max-w-xs">
                Jawab pertanyaan otentikasi di database terintegrasi untuk dapat memperbarui kata sandi baru secara aman
              </p>
            </div>

            {forgotStep === 1 ? (
              // Step 1: Input username
              <form onSubmit={handleForgotStep1} className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-[10px] font-bold tracking-wider text-amber-300 uppercase font-sans">
                    Username Tersimpan
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-amber-400/80">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={forgotUsername}
                      onChange={(e) => setForgotUsername(e.target.value)}
                      placeholder="Masukkan nama pengguna terdaftar"
                      className="w-full pl-10 pr-4 py-2.5 text-xs text-white border rounded-xl bg-slate-950/85 border-amber-500/20 focus:border-amber-400 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {errorText && (
                  <div className="flex items-center gap-2 p-2.5 text-xs border rounded-lg bg-red-500/10 border-red-500/30 text-red-450">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span className="font-sans font-medium">{errorText}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="px-4 py-2.5 text-xs font-bold uppercase rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 text-xs font-bold tracking-wider uppercase rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 transition-all duration-150 font-orbitron shadow-[0_0_15px_rgba(245,158,11,0.25)] cursor-pointer"
                  >
                    {loading ? "Memverifikasi..." : "CARI PERTANYAAN"}
                  </button>
                </div>
              </form>
            ) : (
              // Step 2: Answer question & define password
              <form onSubmit={handleForgotStep2} className="space-y-4">
                <div className="p-3 border border-amber-500/20 bg-amber-950/15 rounded-xl">
                  <span className="block text-[9px] font-black tracking-wider text-amber-400/80 font-orbitron mb-1">
                    PERTANYAAN AMAN ANDA:
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">{securityQuestion}</p>
                </div>

                <div>
                  <label className="block mb-1.5 text-[10px] font-bold tracking-wider text-amber-300 uppercase font-sans">
                    Jawaban Keamanan Rahasia
                  </label>
                  <input
                    type="text"
                    required
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Masukkan jawaban Anda saat register"
                    className="w-full px-4 py-2.5 text-xs text-white border rounded-xl bg-slate-950/80 border-amber-500/25 focus:border-amber-400 focus:outline-none transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block mb-1.5 text-[10px] font-bold tracking-wider text-purple-300 uppercase font-sans">
                    Kata Sandi Baru Akun
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-purple-400">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showPass ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan kata sandi baru (minimal 4 huruf)"
                      className="w-full pl-10 pr-10 py-2.5 text-xs text-white border rounded-xl bg-slate-950/80 border-purple-500/25 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => { playClick(); setShowPass(!showPass); }}
                      className="absolute text-slate-400 right-3 top-3 hover:text-white transition-all"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {errorText && (
                  <div className="flex items-center gap-2 p-2.5 text-xs border rounded-lg bg-red-500/10 border-red-500/30 text-red-400">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span className="font-sans text-xs">{errorText}</span>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => { playClick(); setForgotStep(1); }}
                    className="px-4 py-2.5 text-xs font-bold uppercase rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 text-xs font-black tracking-wider uppercase rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] cursor-pointer"
                  >
                    {loading ? "Memproses..." : "ATUR ULANG SANDI"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 3. ORDINARY LOGIN SCREEN (STANDARD VIEW) */}
        {mode === "login" && (
          <div>
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="p-3 mb-4 rounded-full bg-purple-500/10 border border-purple-500/30 alert-glow flex items-center justify-center">
                {isAdminLogin ? (
                  <img src="/keygen.ico" className="w-10 h-10 object-contain" alt="Admin Icon" referrerPolicy="no-referrer" />
                ) : (
                  <Lock className="w-8 h-8 text-purple-400" />
                )}
              </div>
              <h2 className="text-xl font-black tracking-wider text-purple-300 font-sans leading-none">{title}</h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed font-sans">{subtitle}</p>
            </div>

            {successText && (
              <div className="flex items-center gap-2.5 p-3 text-xs mb-3.5 border rounded-lg bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-sans">
                <CheckCircle className="w-4.5 h-4.5 flex-shrink-0 text-emerald-400" />
                <span>{successText}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block mb-1.5 text-[10px] font-bold tracking-wider text-purple-300 uppercase font-sans">
                  {isAdminLogin ? "Email Administrator Utama" : "Username Terdaftar"}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-purple-400/80">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder={isAdminLogin ? "Masukkan email admin" : "Masukkan username atau 'admin'"}
                    className="w-full pl-10 pr-4 py-2.5 text-xs text-white border rounded-xl bg-slate-950/60 border-purple-500/20 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-[10px] font-bold tracking-wider text-purple-300 uppercase font-sans">
                  Kata Sandi Kunci
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-purple-400/80">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setErrorText("");
                    }}
                    placeholder={isAdminLogin ? "Masukkan kata sandi admin" : "Masukkan kata sandi kunci"}
                    className="w-full pl-10 pr-10 py-2.5 text-xs text-white border rounded-xl bg-slate-950/60 border-purple-500/20 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 focus:outline-none transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setShowPass(!showPass);
                    }}
                    className="absolute text-slate-400 right-3 top-3 hover:text-white transition-all duration-200"
                  >
                    {showPass ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {errorText && (
                <div className="flex items-center gap-2.5 p-2.5 text-xs border rounded-lg bg-red-500/10 border-red-500/30 text-red-400 font-sans">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorText}</span>
                </div>
              )}

              {/* Recovery and Registration Helper Grid Link */}
              {!isAdminLogin && (
                <div className="flex items-center justify-between text-[11px] text-purple-400 font-bold px-1 font-sans">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="hover:text-amber-400 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Lupa Sandi?
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="hover:text-emerald-400 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Buat Akun Baru
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    onCancel();
                  }}
                  className="flex-1 py-2.5 text-xs font-bold tracking-wide border rounded-xl border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-350 hover:text-white transition-all duration-200 cursor-pointer uppercase font-orbitron"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 text-xs font-extrabold tracking-wider rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-purple-500/20 text-white transition-all duration-200 cursor-pointer uppercase font-orbitron flex items-center justify-center gap-1.5"
                >
                  {isAdminLogin ? (
                    <img src="/keygen.ico" className="w-4 h-4 object-contain" alt="Admin Icon" referrerPolicy="no-referrer" />
                  ) : (
                    <Shield className="w-3.5 h-3.5" />
                  )}
                  <span>{loading ? "Memproses..." : "Masuk Sistem"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
