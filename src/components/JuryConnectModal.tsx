/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  Smartphone, 
  Wifi, 
  ShieldCheck, 
  Tv, 
  User,
  Globe,
  Radio,
  Flame,
  CheckCircle2
} from "lucide-react";
import { getActiveArena, setActiveArena } from "../services/firebase";

interface JuryConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: "JURI1" | "JURI2" | "JURI3" | "SCOREBOARD" | "DEWAN";
}

export const JuryConnectModal: React.FC<JuryConnectModalProps> = ({
  isOpen,
  onClose,
  initialRole = "JURI1"
}) => {
  const [selectedRole, setSelectedRole] = useState<"JURI1" | "JURI2" | "JURI3" | "SCOREBOARD" | "DEWAN">(initialRole);
  const [arena, setArena] = useState<string>(() => getActiveArena());
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [serverIps, setServerIps] = useState<string[]>([]);
  const [selectedHostType, setSelectedHostType] = useState<"AUTO" | "LOCAL_IP" | "CURRENT">("AUTO");
  const [selectedIp, setSelectedIp] = useState<string>("");

  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    }
  }, [initialRole]);

  // Fetch local server network IPs for offline Wi-Fi pairing
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/server-info")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.ips) && data.ips.length > 0) {
          const nonLocal = data.ips.filter((ip: string) => ip !== "127.0.0.1" && !ip.startsWith("127."));
          if (nonLocal.length > 0) {
            setServerIps(nonLocal);
            setSelectedIp(nonLocal[0]);
          } else {
            setServerIps(data.ips);
            setSelectedIp(data.ips[0]);
          }
        }
      })
      .catch(() => {
        // Fallback when server API unreachable (static Firebase hosting)
      });
  }, [isOpen]);

  // Construct target link based on selected host type & arena
  const getDeviceUrl = (role: string, currentArena: string) => {
    if (typeof window === "undefined") return "";

    let baseOrigin = window.location.origin;

    if (selectedHostType === "LOCAL_IP" && selectedIp) {
      const port = window.location.port ? `:${window.location.port}` : "";
      baseOrigin = `${window.location.protocol}//${selectedIp}${port}`;
    } else {
      baseOrigin = window.location.origin;
    }

    const path = window.location.pathname;
    return `${baseOrigin}${path}?mode=${role}&arena=${currentArena}`;
  };

  const currentUrl = getDeviceUrl(selectedRole, arena);

  // Generate QR Code
  useEffect(() => {
    if (!isOpen || !currentUrl) return;

    let isMounted = true;
    QRCode.toDataURL(currentUrl, {
      width: 260,
      margin: 1.5,
      color: {
        dark: "#030712",
        light: "#ffffff"
      },
      errorCorrectionLevel: "M"
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => {
        console.warn("QR generation failed:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleArenaChange = (newArena: string) => {
    setArena(newArena);
    setActiveArena(newArena);
  };

  const roleLabels = {
    JURI1: { title: "Juri 1 (Gawai Depan)", icon: User, color: "text-red-400", border: "border-red-500/40" },
    JURI2: { title: "Juri 2 (Gawai Kanan)", icon: User, color: "text-blue-400", border: "border-blue-500/40" },
    JURI3: { title: "Juri 3 (Gawai Kiri)", icon: User, color: "text-amber-400", border: "border-amber-500/40" },
    DEWAN: { title: "Ketua Dewan", icon: ShieldCheck, color: "text-purple-400", border: "border-purple-500/40" },
    SCOREBOARD: { title: "Monitor / Layar Skor", icon: Tv, color: "text-emerald-400", border: "border-emerald-500/40" }
  };

  const activeRoleInfo = roleLabels[selectedRole];
  const IconComp = activeRoleInfo.icon;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[9999] animate-fadeIn select-none">
      <div className="bg-[#0b1329] border-2 border-cyan-500/40 rounded-3xl p-4 sm:p-6 max-w-lg w-full text-slate-100 shadow-[0_0_60px_rgba(6,182,212,0.3)] relative overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-cyan-900/40 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 shadow-md">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-sans font-black text-sm sm:text-base tracking-wider uppercase text-white leading-tight">
                Hubungkan Gawai Android Juri
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[10px] font-mono text-emerald-300 font-bold">
                  Sinkronisasi Server Lokal & LAN Real-Time Aktif
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gelanggang & Network Mode Selector */}
        <div className="flex flex-col gap-2 mb-2.5 shrink-0 bg-[#060c1d] border border-cyan-900/30 rounded-xl p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-mono font-bold text-slate-300 uppercase">
              Pilih Gelanggang:
            </span>
            <div className="flex gap-1">
              {["A", "B", "C", "D"].map((a) => (
                <button
                  key={a}
                  onClick={() => handleArenaChange(a)}
                  className={`w-7 h-7 rounded-lg font-mono font-black text-xs transition-all cursor-pointer ${
                    arena === a
                      ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.6)] scale-105"
                      : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Wi-Fi IP / Cloud URL Selector (jika host lokal terdeteksi) */}
          {serverIps.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-cyan-950/80 text-[10px] font-mono">
              <span className="text-slate-400 flex items-center gap-1">
                <Wifi className="w-3 h-3 text-cyan-400" />
                Jaringan Gawai:
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedHostType("AUTO")}
                  className={`px-2 py-0.5 rounded text-[9.5px] font-bold cursor-pointer transition-all ${
                    selectedHostType === "AUTO"
                      ? "bg-cyan-600 text-slate-950 font-black shadow"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                  title="Otomatis pilih alamat jaringan aktif"
                >
                  Otomatis
                </button>
                {serverIps.map((ip) => (
                  <button
                    key={ip}
                    onClick={() => {
                      setSelectedIp(ip);
                      setSelectedHostType("LOCAL_IP");
                    }}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold cursor-pointer transition-all ${
                      selectedHostType === "LOCAL_IP" && selectedIp === ip
                        ? "bg-emerald-600 text-white font-black shadow"
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                    title={`Hubungkan melalui IP Wi-Fi ${ip}`}
                  >
                    Wi-Fi: {ip}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedHostType("CURRENT")}
                  className={`px-2 py-0.5 rounded text-[9.5px] font-bold cursor-pointer transition-all ${
                    selectedHostType === "CURRENT"
                      ? "bg-purple-600 text-white font-black shadow"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                  title="Gunakan Domain / URL Peramban Saat Ini"
                >
                  URL Browser
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Role Tabs */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mb-2.5 shrink-0">
          {(["JURI1", "JURI2", "JURI3", "DEWAN", "SCOREBOARD"] as const).map((r) => {
            const isSelected = selectedRole === r;
            return (
              <button
                key={r}
                onClick={() => setSelectedRole(r)}
                className={`py-1.5 px-1 rounded-xl text-center font-sans font-black text-[10px] sm:text-[11px] uppercase tracking-wider transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-cyan-950 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    : "bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {r === "JURI1" && "Juri 1"}
                {r === "JURI2" && "Juri 2"}
                {r === "JURI3" && "Juri 3"}
                {r === "DEWAN" && "Dewan"}
                {r === "SCOREBOARD" && "Monitor"}
              </button>
            );
          })}
        </div>

        {/* QR Code and Active Role Card */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col items-center justify-center">
          <div className="bg-white p-2.5 rounded-2xl shadow-[0_0_25px_rgba(255,255,255,0.15)] mb-2.5 flex items-center justify-center border-4 border-slate-900">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code Link Juri" className="w-44 h-44 sm:w-48 sm:h-48 object-contain" />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-slate-400 font-mono text-xs">
                Memuat QR...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-black uppercase tracking-wider ${activeRoleInfo.color} flex items-center gap-1.5`}>
              <IconComp className="w-4 h-4" />
              {activeRoleInfo.title} • Gelanggang {arena}
            </span>
          </div>

          {/* Copy URL bar & Direct Test Link */}
          <div className="w-full flex items-center gap-2 bg-[#060c1d] border border-cyan-900/40 rounded-xl p-1.5 pl-3 mb-2.5">
            <span className="text-[9.5px] font-mono text-cyan-300 truncate flex-1 select-all" title={currentUrl}>
              {currentUrl}
            </span>
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg font-mono font-bold text-xs uppercase flex items-center gap-1 transition-all cursor-pointer ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black shadow-md"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Tersalin!" : "Salin"}
            </button>
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-all text-[10px] font-mono font-bold flex items-center gap-1"
              title="Buka panel ini di tab peramban baru untuk uji coba langsung"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Tes Tab Baru</span>
            </a>
          </div>

          {/* Step by step guide */}
          <div className="w-full bg-[#071026] border border-blue-900/30 rounded-xl p-2.5 text-left space-y-1">
            <div className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
              <Wifi className="w-3 h-3 text-amber-400" />
              Petunjuk Menghubungkan Gawai Juri ke Server:
            </div>
            <ol className="text-[9.5px] text-slate-300 space-y-0.5 list-decimal list-inside leading-relaxed">
              <li>
                <strong>Buka Kamera HP Android</strong> atau Google Lens, lalu arahkan langsung ke QR Code di atas.
              </li>
              <li>
                Jika di HP muncul <em>"Panel Juri Terkunci"</em>, tekan tombol <strong>"BUKA KUNCI JURI & DEWAN"</strong> atau tekan <strong>"MULAI WAKTU"</strong> pada panel Timer / Operator ini.
              </li>
              <li>
                Sistem menggunakan <strong>Server Lokal & LAN Real-Time</strong> sehingga nilai dan waktu tersinkronisasi otomatis seketika (sub-detik) tanpa lag.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2.5 pt-2.5 border-t border-cyan-900/30 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Sistem Sinkronisasi Server Lokal & LAN Real-Time Aktif</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
