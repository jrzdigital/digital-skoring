/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Tv, Laptop, Shield, User, Activity, HardDrive } from "lucide-react";
import { rtdbScoringEngine, FirebaseSyncStatus } from "../services/rtdbScoringEngine";
import { autoSaveVault, AutoSaveVaultStatus } from "../utils/offlineAutoSaveVault";

interface DeviceStatus {
  active: boolean;
  ip: string;
  lastSeen: number;
}

interface ConnectionStatusIndicatorProps {
  deviceId: "monitor" | "sekretaris" | "dewan" | "juri1" | "juri2" | "juri3";
  deviceConnections?: {
    [key: string]: DeviceStatus;
  };
  compact?: boolean;
}

export function ConnectionStatusIndicator({
  deviceId,
  deviceConnections = {},
  compact = false
}: ConnectionStatusIndicatorProps) {
  const [localConnected, setLocalConnected] = useState<boolean>(true);
  const [browserOnline, setBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine !== false : true
  );
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseSyncStatus>(() => rtdbScoringEngine.getStatus());
  const [vaultStatus, setVaultStatus] = useState<AutoSaveVaultStatus>(() => autoSaveVault.getStatus());

  // Listen to Auto-Save Vault status (IndexedDB + LocalStorage + SessionStorage)
  useEffect(() => {
    const unsubVault = autoSaveVault.subscribeStatus(setVaultStatus);
    return () => unsubVault();
  }, []);

  // Listen to browser online/offline events automatically
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Register device presence in Firebase RTDB & listen to status
  useEffect(() => {
    rtdbScoringEngine.initDevice(deviceId, deviceId.toUpperCase());
    const unsub = rtdbScoringEngine.subscribeStatus((status) => {
      setFirebaseStatus(status);
      if (status.connected) {
        setLocalConnected(true);
      }
    });
    return () => unsub();
  }, [deviceId]);

  // Background ping loop for the current device (non-blocking with fast timeout)
  useEffect(() => {
    const sendPing = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch("/api/device/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          setLocalConnected(true);
        } else if (!firebaseStatus.connected) {
          setLocalConnected(false);
        }
      } catch {
        if (!firebaseStatus.connected) {
          setLocalConnected(false);
        }
      }
    };

    sendPing();
    const interval = setInterval(sendPing, 4000);
    return () => clearInterval(interval);
  }, [deviceId, firebaseStatus.connected]);

  // Merge local device connections with Firebase RTDB presence
  const rtdbDevices = rtdbScoringEngine.getActiveDevices();
  const mergedConnections: { [key: string]: DeviceStatus } = { ...deviceConnections };
  Object.keys(rtdbDevices).forEach((key) => {
    if (rtdbDevices[key] && rtdbDevices[key].active) {
      mergedConnections[key] = {
        active: true,
        ip: rtdbDevices[key].ip || "Lokal",
        lastSeen: rtdbDevices[key].lastSeen || Date.now()
      };
    }
  });

  // Devices mapping
  const deviceList = [
    { key: "sekretaris", label: "Sekretaris", icon: Laptop, color: "text-purple-400" },
    { key: "monitor", label: "Monitor", icon: Tv, color: "text-emerald-400" },
    { key: "dewan", label: "Dewan", icon: Shield, color: "text-amber-400" },
    { key: "juri1", label: "Juri 1", icon: User, color: "text-red-400" },
    { key: "juri2", label: "Juri 2", icon: User, color: "text-blue-400" },
    { key: "juri3", label: "Juri 3", icon: User, color: "text-pink-400" }
  ];

  const isCloudOnline = browserOnline && firebaseStatus.connected;
  const isLanHybrid = !isCloudOnline && localConnected;

  if (compact) {
    const activeCount = Object.values(mergedConnections).filter((d) => d.active).length;
    const totalCount = deviceList.length;

    return (
      <div
        id={`sync-compact-${deviceId}`}
        className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur border border-purple-900/30 rounded-full text-xs"
        title={
          isCloudOnline
            ? "Online: Server Lokal & Real-Time Aktif"
            : isLanHybrid
              ? "Mode Hibrida Otomatis: Penilaian Real-Time LAN/Lokal Aktif"
              : "Mode Offline Otomatis: Penilaian Real-Time P2P Aktif"
        }
      >
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isCloudOnline ? "bg-emerald-400" : "bg-amber-400"
            }`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isCloudOnline ? "bg-emerald-500" : "bg-amber-500"
            }`}
          ></span>
        </span>
        <span className="font-mono text-[10px] text-slate-300 flex items-center gap-1.5">
          {isCloudOnline ? (
            <>
              Online: <span className="text-emerald-400 font-bold">{Math.max(1, activeCount)}</span>/{totalCount}
            </>
          ) : (
            <>
              <span className="text-amber-400 font-bold">Offline RT</span> ({Math.max(1, activeCount)}/{totalCount})
            </>
          )}
          <span className="text-cyan-400/90 flex items-center gap-0.5 border-l border-slate-700/80 pl-1.5" title="Auto-Save Cadangan Keamanan IndexedDB & LocalStorage Aktif">
            <HardDrive className="w-2.5 h-2.5 text-cyan-400" />
            <span className="text-[9px] font-bold">IDB</span>
          </span>
        </span>
      </div>
    );
  }

  return (
    <div
      id={`sync-panel-${deviceId}`}
      className="p-4 bg-slate-950/80 backdrop-blur-md border border-purple-500/20 rounded-xl shadow-xl max-w-4xl mx-auto w-full"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-900/40 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-950/40 rounded-lg border border-purple-500/20">
            <Activity className="w-4 h-4 text-[#facc15] animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-sans font-black tracking-tight text-slate-200 uppercase leading-none">
              Status Sinkronisasi Perangkat & Nilai Real-Time
            </h4>
            <span className="text-[10px] font-mono text-slate-400">
              Mode Sistem:{" "}
              <span className={isCloudOnline ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                {isCloudOnline
                  ? "Server Lokal & LAN Real-Time Aktif"
                  : isLanHybrid
                    ? "Real-Time LAN & Lokal Aktif"
                    : "Mode Offline • Penilaian Real-Time Lokal Aktif"}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1.5 bg-cyan-950/30 border border-cyan-500/30 px-2.5 py-1 rounded-lg"
            title="Cadangan otomatis ke IndexedDB, LocalStorage & SessionStorage untuk pemulihan instan saat refresh tak terduga"
          >
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300">
              {vaultStatus.idbHealthy ? "Auto-Save IDB & Lokal Aktif" : "Auto-Save Lokal Aktif"} (v{vaultStatus.stateVersion || 1})
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-lg ${
              isCloudOnline
                ? "bg-emerald-950/30 border-emerald-500/20"
                : "bg-amber-950/30 border-amber-500/30"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isCloudOnline ? "bg-emerald-400" : "bg-amber-400"
                }`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isCloudOnline ? "bg-emerald-500" : "bg-amber-500"
                }`}
              ></span>
            </span>
            <span
              className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                isCloudOnline ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {isCloudOnline
                ? "Cloud & Lokal Aktif"
                : firebaseStatus.pendingSync
                  ? "Offline Real-Time (Antrean Auto-Sync)"
                  : "Offline Real-Time Aktif"}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {deviceList.map((dev) => {
          const status = mergedConnections[dev.key] || { active: false, ip: "-", lastSeen: 0 };
          const isCurrent = dev.key === deviceId;
          const isActive = status.active || isCurrent;
          const IconComponent = dev.icon;

          return (
            <div
              key={dev.key}
              className={`relative p-2.5 rounded-lg border flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] ${
                isCurrent
                  ? "bg-purple-950/30 border-purple-500/50 shadow-purple-500/5 shadow-inner"
                  : isActive
                    ? "bg-slate-900/40 border-slate-800"
                    : "bg-slate-900/10 border-slate-950/60 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className={`p-1 rounded bg-slate-950/60 border border-slate-800 ${dev.color}`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center">
                  <span className="relative flex h-2 w-2">
                    {isActive ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </>
                    ) : (
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-700"></span>
                    )}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-sans font-black text-slate-100 uppercase tracking-tight">
                    {dev.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[8px] bg-[#facc15]/20 text-[#facc15] px-1 rounded-sm font-mono font-bold">
                      ANDA
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[9px] font-mono text-slate-400 truncate max-w-[80px]" title={status.ip}>
                    {isCurrent ? "Lokal" : status.ip === "::1" ? "127.0.0.1" : status.ip}
                  </span>
                  <span
                    className={`text-[8px] font-mono font-bold uppercase tracking-wide ${
                      isActive ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {isActive ? "Aktif" : "Standby"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
