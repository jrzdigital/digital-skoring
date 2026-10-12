/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  X, 
  Database, 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  Layers, 
  Server, 
  Radio, 
  Tv, 
  Shield, 
  User, 
  Laptop,
  Check
} from "lucide-react";
import { rtdbScoringEngine, FirebaseSyncStatus } from "../services/rtdbScoringEngine";
import { firebaseConfig, saveMatchStateToFirebase } from "../services/firebase";
import { MatchState } from "../types";

interface FirebaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: MatchState | null;
  onArenaChange?: (newArena: string) => void;
  syncStatus?: FirebaseSyncStatus;
}

export function FirebaseStatusModal({
  isOpen,
  onClose,
  currentState,
  onArenaChange,
  syncStatus: initialSyncStatus
}: FirebaseStatusModalProps) {
  const [syncStatus, setSyncStatus] = useState<FirebaseSyncStatus>(() => initialSyncStatus || rtdbScoringEngine.getStatus());
  const [selectedArena, setSelectedArena] = useState<string>(() => (initialSyncStatus || rtdbScoringEngine.getStatus()).arena || "A");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = rtdbScoringEngine.subscribeStatus((status) => {
      setSyncStatus(status);
      setSelectedArena(status.arena);
    });
    return () => unsub();
  }, [isOpen]);

  useEffect(() => {
    if (initialSyncStatus) {
      setSyncStatus(initialSyncStatus);
      setSelectedArena(initialSyncStatus.arena);
    }
  }, [initialSyncStatus]);

  if (!isOpen) return null;

  const handleSwitchArena = (arena: string) => {
    setSelectedArena(arena);
    rtdbScoringEngine.switchArena(arena);
    if (onArenaChange) {
      onArenaChange(arena);
    }
  };

  const handleForcePushState = async () => {
    if (!currentState) return;
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    try {
      await saveMatchStateToFirebase(currentState, selectedArena);
      setSyncSuccessMsg(`Berhasil sinkronisasi ke Firebase RTDB Gelanggang ${selectedArena}!`);
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } catch (err: any) {
      alert("Gagal sinkron ke Firebase: " + (err?.message || err));
    } finally {
      setIsSyncing(false);
    }
  };

  const copyUrl = (roleKey: string, roleParam: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}?mode=${roleParam}&arena=${selectedArena}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedKey(roleKey);
      setTimeout(() => setCopiedKey(null), 2500);
    });
  };

  const openUrl = (roleParam: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}?mode=${roleParam}&arena=${selectedArena}`;
    window.open(url, "_blank");
  };

  const panels = [
    { key: "scoreboard", label: "Layar Monitor / TV", param: "SCOREBOARD", icon: Tv, color: "text-emerald-400" },
    { key: "dewan", label: "Ketua Dewan", param: "DEWAN", icon: Shield, color: "text-amber-400" },
    { key: "juri1", label: "Juri 1", param: "JURY1", icon: User, color: "text-red-400" },
    { key: "juri2", label: "Juri 2", param: "JURY2", icon: User, color: "text-blue-400" },
    { key: "juri3", label: "Juri 3", param: "JURY3", icon: User, color: "text-pink-400" },
    { key: "sekretaris", label: "Sekretaris Pertandingan", param: "SEKRETARIS", icon: Laptop, color: "text-purple-400" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-950 border border-purple-500/30 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-purple-900/40 flex items-center justify-between bg-[#0e0626]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-black text-slate-100 text-lg uppercase tracking-wider">
                  Firebase Realtime Database
                </h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  JRZ Score
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Sinkronisasi Multi-Perangkat Tanpa Kabel (Cloud Real-Time)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Connection Status Card */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            syncStatus.connected
              ? "bg-emerald-950/20 border-emerald-500/30"
              : "bg-rose-950/20 border-rose-500/30"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                syncStatus.connected ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
              }`}>
                {syncStatus.connected ? <Wifi className="w-6 h-6 animate-pulse" /> : <WifiOff className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black uppercase font-mono ${
                    syncStatus.connected ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {syncStatus.connected ? "Terkoneksi ke Firebase Console" : "Menghubungkan ke Firebase..."}
                  </span>
                  <span className="relative flex h-2 w-2">
                    {syncStatus.connected && (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Proyek: <span className="text-slate-200 font-bold">{firebaseConfig.projectId}</span> | Sinkron: #{syncStatus.syncCount}
                </p>
              </div>
            </div>

            <button
              onClick={handleForcePushState}
              disabled={isSyncing}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-mono text-xs font-bold transition shadow-md"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Menyelaraskan..." : "Sinkronkan Sekarang"}</span>
            </button>
          </div>

          {syncSuccessMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {/* Arena / Gelanggang Selection */}
          <div className="p-4 bg-slate-900/50 border border-purple-500/20 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Pilih Gelanggang (Arena)</span>
              </div>
              <span className="text-[11px] font-mono text-amber-300 font-bold">
                Aktif: Gelanggang {selectedArena}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Memungkinkan beberapa gelanggang bertanding bersamaan dalam satu Firebase Realtime Database tanpa bentrok.
            </p>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {["A", "B", "C", "D"].map((arena) => (
                <button
                  key={arena}
                  onClick={() => handleSwitchArena(arena)}
                  className={`py-2 px-3 rounded-lg font-mono font-black text-xs transition border flex items-center justify-center gap-1.5 ${
                    selectedArena === arena
                      ? "bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/30"
                      : "bg-slate-950/80 text-slate-400 border-slate-800 hover:border-purple-500/50 hover:text-slate-200"
                  }`}
                >
                  <Radio className={`w-3 h-3 ${selectedArena === arena ? "text-amber-300 animate-pulse" : "text-slate-600"}`} />
                  <span>GELANGGANG {arena}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Connect Links for Judge & Panel Devices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tautan Cepat Perangkat (Gelanggang {selectedArena})</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Buka di Tab atau Kirim ke Tablet</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {panels.map((p) => {
                const Icon = p.icon;
                const isCopied = copiedKey === p.key;
                return (
                  <div
                    key={p.key}
                    className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between gap-2 hover:border-purple-500/30 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg bg-slate-950 border border-slate-800 ${p.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-200 truncate">{p.label}</div>
                        <div className="text-[10px] font-mono text-slate-500">?mode={p.param}&arena={selectedArena}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => copyUrl(p.key, p.param)}
                        title="Salin Link"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => openUrl(p.param)}
                        title="Buka di Tab Baru"
                        className="p-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg text-xs transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Firebase Configuration Info Details */}
          <div className="p-3.5 bg-black/50 border border-purple-900/30 rounded-xl space-y-1.5 font-mono text-[11px]">
            <div className="text-slate-400 flex justify-between">
              <span>Database URL:</span>
              <span className="text-cyan-300 truncate max-w-[320px]">{firebaseConfig.databaseURL}</span>
            </div>
            <div className="text-slate-400 flex justify-between">
              <span>Auth Domain:</span>
              <span className="text-slate-200">{firebaseConfig.authDomain}</span>
            </div>
            <div className="text-slate-400 flex justify-between">
              <span>RTDB Path:</span>
              <span className="text-amber-300">/arenas/Gelanggang_{selectedArena}/activeMatch</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-purple-900/40 bg-[#0e0626] flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            Status: {syncStatus.connected ? "🟢 Terhubung ke Firebase RTDB" : "🟡 Offline (P2P Aktif)"}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono text-xs font-bold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
