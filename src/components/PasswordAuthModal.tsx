/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Lock, Unlock, Eye, EyeOff, ShieldCheck, AlertCircle, X, ChevronRight, KeyRound } from "lucide-react";
import { sound } from "../utils/sound";

export const REQUIRED_SYSTEM_PASSWORD = "211096";

interface PasswordAuthModalProps {
  type: "APP_ACCESS" | "PANEL_ACCESS";
  panelName?: string;
  isOpen: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function PasswordAuthModal({
  type,
  panelName = "Panel",
  isOpen,
  onSuccess,
  onCancel
}: PasswordAuthModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setErrorMsg("");
      setIsShaking(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, type, panelName]);

  // Otomatis langsung masuk ketika password benar ("211096") tanpa perlu tekan Enter
  const checkAndSubmit = (val: string) => {
    if (val === REQUIRED_SYSTEM_PASSWORD) {
      sound.playClick();
      setErrorMsg("");
      setPassword("");
      onSuccess();
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (password === REQUIRED_SYSTEM_PASSWORD) {
      checkAndSubmit(password);
    }
  }, [password]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkAndSubmit(password)) {
      sound.playBuzzer();
      setErrorMsg("Password salah! Silakan coba lagi.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      if (inputRef.current) {
        inputRef.current.select();
      }
    }
  };

  const handleKeyPress = (num: string) => {
    sound.playClick();
    if (errorMsg) setErrorMsg("");
    if (password.length < 12) {
      const nextVal = password + num;
      setPassword(nextVal);
      checkAndSubmit(nextVal);
    }
  };

  const handleBackspace = () => {
    sound.playClick();
    if (errorMsg) setErrorMsg("");
    setPassword(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    sound.playClick();
    setErrorMsg("");
    setPassword("");
  };

  // Full Screen Gate for App First Access
  if (type === "APP_ACCESS") {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#050914] text-slate-100 flex flex-col items-center justify-center p-4 select-none font-sans overflow-y-auto">
        {/* Subtle background ambient lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className={`relative w-full max-w-md bg-[#0a1128] border-2 border-amber-500/50 rounded-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.25)] flex flex-col items-center text-center transition-transform ${
          isShaking ? "animate-bounce ring-2 ring-rose-500" : ""
        }`}>
          {/* Header Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/30 mb-4 flex items-center justify-center">
            <div className="w-full h-full bg-[#070d1e] rounded-[14px] flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>SISTEM KEAMANAN DIGITAL ARENA</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase mb-1">
            MASUK APLIKASI
          </h2>
          <p className="text-xs text-slate-400 mb-6 font-mono">
            Masukkan password keamanan untuk membuka aplikasi setelah ditutup
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {/* Password input without username */}
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                value={password}
                onChange={(e) => {
                  const val = e.target.value;
                  setPassword(val);
                  if (errorMsg) setErrorMsg("");
                  checkAndSubmit(val);
                }}
                placeholder="Masukkan Password"
                className="w-full bg-[#060b1c] border-2 border-slate-700 focus:border-amber-400 text-center text-2xl sm:text-3xl font-mono font-bold tracking-[0.3em] py-3 px-12 rounded-xl text-white outline-none transition-all placeholder:text-slate-600 placeholder:text-base placeholder:tracking-normal placeholder:font-sans"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* On-screen touch keypad */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(String(num))}
                  className="py-3 bg-[#0c1635] hover:bg-[#142352] active:bg-amber-600 border border-slate-800 hover:border-amber-500/50 rounded-xl text-lg font-mono font-bold text-slate-200 transition-all cursor-pointer active:scale-95 shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-3 bg-[#1e1422] hover:bg-[#301c36] text-rose-300 border border-rose-900/50 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer active:scale-95"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress("0")}
                className="py-3 bg-[#0c1635] hover:bg-[#142352] active:bg-amber-600 border border-slate-800 hover:border-amber-500/50 rounded-xl text-lg font-mono font-bold text-slate-200 transition-all cursor-pointer active:scale-95 shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-3 bg-[#141d33] hover:bg-[#1c2949] text-amber-300 border border-slate-800 rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-95"
              >
                ⌫
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full mt-3 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 active:scale-98 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>BUKA APLIKASI</span>
            </button>
          </form>

          <div className="mt-6 text-[11px] text-slate-500 font-mono">
            IPSI 2026 STANDAR • PERANGKAT SCOREBOARD RESMI
          </div>
        </div>
      </div>
    );
  }

  // Modal Dialog when accessing a specific panel
  return (
    <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans animate-in fade-in duration-200">
      <div className={`relative w-full max-w-sm bg-[#091128] border-2 border-cyan-500/60 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)] flex flex-col items-center text-center transition-transform ${
        isShaking ? "animate-bounce ring-2 ring-rose-500" : ""
      }`}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-400/50 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
          <KeyRound className="w-6 h-6 text-cyan-400" />
        </div>

        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 mb-1">
          OTORISASI PETUGAS GELANGGANG
        </div>

        <h3 className="text-lg font-black text-white uppercase tracking-wide mb-1">
          AKSES {panelName.toUpperCase()}
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Masukkan password untuk membuka panel ini:
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={password}
              onChange={(e) => {
                const val = e.target.value;
                setPassword(val);
                if (errorMsg) setErrorMsg("");
                checkAndSubmit(val);
              }}
              placeholder="Password Panel"
              className="w-full bg-[#050b1d] border border-cyan-500/50 focus:border-cyan-300 text-center text-xl font-mono font-bold tracking-[0.25em] py-2.5 px-10 rounded-xl text-white outline-none transition-all placeholder:text-slate-600 placeholder:text-xs placeholder:tracking-normal placeholder:font-sans"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {errorMsg && (
            <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-500/60 text-rose-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick numpad */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(String(num))}
                className="py-2 bg-[#0c1635] hover:bg-[#142352] active:bg-cyan-600 border border-slate-800 rounded-lg text-base font-mono font-bold text-slate-200 transition-all cursor-pointer active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="py-2 bg-[#1e1422] hover:bg-[#301c36] text-rose-300 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress("0")}
              className="py-2 bg-[#0c1635] hover:bg-[#142352] active:bg-cyan-600 border border-slate-800 rounded-lg text-base font-mono font-bold text-slate-200 transition-all cursor-pointer active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-2 bg-[#141d33] hover:bg-[#1c2949] text-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              ⌫
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                BATAL
              </button>
            )}
            <button
              type="submit"
              className={`py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer ${
                onCancel ? "" : "col-span-2"
              }`}
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>BUKA PANEL</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
