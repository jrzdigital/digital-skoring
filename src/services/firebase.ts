/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hybrid Firebase Realtime Database & Local Real-Time Storage Engine
 * Menyediakan penyimpanan dan sinkronisasi real-time menggunakan Firebase Realtime Database
 * yang dipadukan dengan LocalStorage, IndexedDB Auto-Save Vault, dan BroadcastChannel P2P.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getDatabase,
  ref as fbRef,
  onValue as fbOnValue,
  get as fbGet,
  set as fbSet,
  update as fbUpdate,
  off as fbOff,
  onDisconnect as fbOnDisconnect,
  serverTimestamp as fbServerTimestamp
} from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { MatchState, MatchStatus, UserAccount, FighterColor, ActionType } from "../types";
import { normalizeMatchState, setServerTimeOffset, getSyncedNow } from "../utils/defaultMatchState";
import { offlineEngine } from "../utils/offlineEngine";
import { autoSaveVault } from "../utils/offlineAutoSaveVault";

const globalWindowConfig: Record<string, string> =
  typeof window !== "undefined" && ((window as any).__JRZ_FIREBASE_CONFIG__ || (window as any).firebaseConfig)
    ? (window as any).__JRZ_FIREBASE_CONFIG__ || (window as any).firebaseConfig
    : {};

export const firebaseConfig = {
  apiKey:
    globalWindowConfig.apiKey ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_FIREBASE_API_KEY) ||
    "AIzaSyDoTaTgw5dqhDkZocgpc7rJ68Ewopr4yHs",
  authDomain:
    globalWindowConfig.authDomain ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN) ||
    "jrz-score.firebaseapp.com",
  databaseURL:
    globalWindowConfig.databaseURL ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_FIREBASE_DATABASE_URL) ||
    "https://jrz-score-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:
    globalWindowConfig.projectId ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID) ||
    "jrz-score",
  storageBucket:
    globalWindowConfig.storageBucket ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET) ||
    "jrz-score.firebasestorage.app",
  messagingSenderId:
    globalWindowConfig.messagingSenderId ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID) ||
    "815167875593",
  appId:
    globalWindowConfig.appId ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_FIREBASE_APP_ID) ||
    "1:815167875593:web:e954759fe7d675c5ab26d8",
  measurementId:
    globalWindowConfig.measurementId ||
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID) ||
    "G-J2QTD6JSW8"
};

let appInstance: any = null;
let dbInstance: any = null;
let authInstance: any = null;
let googleProviderInstance: any = null;

try {
  appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  dbInstance = getDatabase(appInstance);
  authInstance = getAuth(appInstance);
  googleProviderInstance = new GoogleAuthProvider();
  if (dbInstance && typeof window !== "undefined") {
    try {
      fbOnValue(fbRef(dbInstance, ".info/serverTimeOffset"), (snap) => {
        const offset = Number(snap.val());
        if (!isNaN(offset)) {
          setServerTimeOffset(offset);
        }
      });
    } catch {}
  }
} catch (err) {
  console.warn("[Firebase] Inisialisasi fallback offline:", err);
}

export const app = appInstance;
export const db = dbInstance;
export const auth = authInstance;
export const googleProvider = googleProviderInstance;

let isRealtimeConnected = false;
let isFlushingPendingSync = false;

function withFirebaseTimeout<T>(promise: Promise<T>, timeoutMs = 6000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("FIREBASE_TIMEOUT"));
    }, timeoutMs);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function setPendingCloudSync(arena: string, isPending: boolean) {
  if (typeof window === "undefined") return;
  try {
    const key = `ipsi_pending_cloud_sync_${arena.toUpperCase()}`;
    if (isPending) {
      window.localStorage.setItem(key, String(Date.now()));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {}
}

export function hasPendingCloudSync(arena = getActiveArena()): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!window.localStorage.getItem(`ipsi_pending_cloud_sync_${arena.toUpperCase()}`);
  } catch {
    return false;
  }
}

function queuePendingRtdbPath(path: string, value: any) {
  if (typeof window === "undefined" || !path) return;
  try {
    const raw = window.localStorage.getItem("ipsi_pending_rtdb_paths");
    const map = raw ? JSON.parse(raw) : {};
    map[path] = { value, updatedAt: Date.now() };
    window.localStorage.setItem("ipsi_pending_rtdb_paths", JSON.stringify(map));
  } catch {}
}

function clearPendingRtdbPath(path: string) {
  if (typeof window === "undefined" || !path) return;
  try {
    const raw = window.localStorage.getItem("ipsi_pending_rtdb_paths");
    if (!raw) return;
    const map = JSON.parse(raw);
    if (path in map) {
      delete map[path];
      window.localStorage.setItem("ipsi_pending_rtdb_paths", JSON.stringify(map));
    }
  } catch {}
}

export async function flushPendingCloudSync(): Promise<void> {
  if (typeof window === "undefined" || !db || isFlushingPendingSync) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  isFlushingPendingSync = true;
  try {
    const arenas = ["A", "B", "C", "D"];
    for (const arena of arenas) {
      if (hasPendingCloudSync(arena)) {
        const raw =
          window.localStorage.getItem(`jrz_silat_match_state_${arena}`) ||
          (arena === "A" ? window.localStorage.getItem("jrz_silat_match_state") : null);
        if (raw) {
          try {
            const parsed = normalizeMatchState(JSON.parse(raw));
            const clean = sanitizeForFirebase(parsed);
            const arenaRef = fbRef(db, `arenas/${arena}/activeMatch`);
            await withFirebaseTimeout(fbSet(arenaRef, clean), 3000);
            if (arena === "A") {
              const rootRef = fbRef(db, "activeMatch");
              fbSet(rootRef, clean).catch(() => {});
            }
            setPendingCloudSync(arena, false);
          } catch {}
        } else {
          setPendingCloudSync(arena, false);
        }
      }
    }

    const pendingRaw = window.localStorage.getItem("ipsi_pending_rtdb_paths");
    if (pendingRaw) {
      const pendingMap = JSON.parse(pendingRaw);
      for (const [path, entry] of Object.entries<any>(pendingMap)) {
        try {
          const pathRef = fbRef(db, path);
          await withFirebaseTimeout(fbSet(pathRef, sanitizeForFirebase(entry.value)), 2500);
          clearPendingRtdbPath(path);
        } catch {}
      }
    }
  } catch {} finally {
    isFlushingPendingSync = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushPendingCloudSync();
  });
}

// Helper to extract clean path from a Firebase or hybrid reference
function extractRefPath(reference: any): string {
  if (!reference) return "";
  if (typeof reference === "string") {
    return reference.replace(/^\/+|\/+$/g, "");
  }
  if (typeof reference.path === "string" && reference.path) {
    return reference.path.replace(/^\/+|\/+$/g, "");
  }
  if (typeof reference._path?.pieces_ !== "undefined" && Array.isArray(reference._path.pieces_)) {
    return reference._path.pieces_.join("/");
  }
  if (typeof reference.toString === "function" && reference.root) {
    try {
      const fullUrl = reference.toString();
      const rootUrl = reference.root.toString();
      if (fullUrl.startsWith(rootUrl)) {
        return decodeURIComponent(fullUrl.slice(rootUrl.length)).replace(/^\/+|\/+$/g, "");
      }
    } catch {}
  }
  return reference.key || "";
}

function getNativeFbRef(reference: any): any {
  if (!db) return null;
  if (reference && reference._fbRef) return reference._fbRef;
  const path = extractRefPath(reference);
  if (!path) return null;
  try {
    return fbRef(db, path);
  } catch {
    return null;
  }
}

export function off(reference?: any, eventType?: string, callback?: any): void {
  const nativeRef = getNativeFbRef(reference);
  if (nativeRef) {
    try {
      fbOff(nativeRef, eventType as any, callback);
    } catch {}
  }
}

export function onDisconnect(reference?: any) {
  const nativeRef = getNativeFbRef(reference);
  if (nativeRef) {
    try {
      return fbOnDisconnect(nativeRef);
    } catch {}
  }
  return {
    update: async (_values: any) => {},
    set: async (_value: any) => {},
    remove: async () => {},
    cancel: async () => {}
  };
}

export function serverTimestamp(): any {
  try {
    return fbServerTimestamp();
  } catch {
    return Date.now();
  }
}

// Helper to update parent cached object in localStorage & IndexedDB when a child path is updated
function syncLocalHierarchyCache(path: string, value: any, isMerge = false) {
  if (typeof window === "undefined" || !path) return;
  try {
    const storageKey = `rtdb_${path}`;
    if (isMerge && value && typeof value === "object" && !Array.isArray(value)) {
      const existingRaw = window.localStorage.getItem(storageKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const merged = { ...existing, ...value };
      window.localStorage.setItem(storageKey, JSON.stringify(merged));
      autoSaveVault.mirrorKeyToIndexedDB(storageKey, merged);
    } else {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
      autoSaveVault.mirrorKeyToIndexedDB(storageKey, value);
    }

    // Check if a parent path is also cached (e.g., arenas/A/schedule)
    const parts = path.split("/");
    for (let i = parts.length - 1; i >= 1; i--) {
      const parentPath = parts.slice(0, i).join("/");
      const parentKey = `rtdb_${parentPath}`;
      const parentRaw = window.localStorage.getItem(parentKey);
      if (parentRaw) {
        try {
          const parentObj = JSON.parse(parentRaw);
          if (parentObj && typeof parentObj === "object") {
            const subParts = parts.slice(i);
            let cursor = parentObj;
            for (let j = 0; j < subParts.length - 1; j++) {
              const seg = subParts[j];
              if (!cursor[seg] || typeof cursor[seg] !== "object") {
                cursor[seg] = {};
              }
              cursor = cursor[seg];
            }
            const leafSeg = subParts[subParts.length - 1];
            if (isMerge && cursor[leafSeg] && typeof cursor[leafSeg] === "object" && typeof value === "object") {
              cursor[leafSeg] = { ...cursor[leafSeg], ...value };
            } else {
              cursor[leafSeg] = value;
            }
            window.localStorage.setItem(parentKey, JSON.stringify(parentObj));
            autoSaveVault.mirrorKeyToIndexedDB(parentKey, parentObj);
          }
        } catch {}
      }
    }

    // Broadcast to other tabs via BroadcastChannel
    try {
      const bus = new BroadcastChannel("ipsi_rtdb_local_bus");
      bus.postMessage({ path, timestamp: Date.now() });
      bus.close();
    } catch {}
  } catch {}
}

// Read cached value or composite sub-paths from localStorage
function readLocalRtdbCache(path: string): { exists: boolean; val: any } {
  if (typeof window === "undefined" || !path) return { exists: false, val: null };
  try {
    const raw = window.localStorage.getItem(`rtdb_${path}`);
    let baseObj: any = raw !== null ? JSON.parse(raw) : undefined;

    // Also merge any newer child sub-keys stored under rtdb_${path}/...
    const prefix = `rtdb_${path}/`;
    let foundSub = false;
    const composite: Record<string, any> =
      baseObj && typeof baseObj === "object" && !Array.isArray(baseObj) ? { ...baseObj } : {};

    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const relPath = k.slice(prefix.length);
        const itemRaw = window.localStorage.getItem(k);
        if (itemRaw !== null) {
          try {
            const parsedItem = JSON.parse(itemRaw);
            const segs = relPath.split("/");
            let cursor = composite;
            for (let s = 0; s < segs.length - 1; s++) {
              const seg = segs[s];
              if (!cursor[seg] || typeof cursor[seg] !== "object") {
                cursor[seg] = {};
              } else {
                cursor[seg] = { ...cursor[seg] };
              }
              cursor = cursor[seg];
            }
            cursor[segs[segs.length - 1]] = parsedItem;
            foundSub = true;
          } catch {}
        }
      }
    }

    if (foundSub) {
      return { exists: true, val: composite };
    }
    if (baseObj !== undefined && baseObj !== null) {
      return { exists: true, val: baseObj };
    }
  } catch {}
  return { exists: false, val: null };
}

// Reference Helper (Hybrid Firebase RTDB + Local Path)
export function ref(database: any, path: string): any {
  const cleanPath = (path || "").replace(/^\/+|\/+$/g, "");
  const targetDb = database || db;
  let nativeRef: any = null;
  if (targetDb && cleanPath) {
    try {
      nativeRef = fbRef(targetDb, cleanPath);
    } catch {}
  }
  return {
    path: cleanPath,
    key: cleanPath.split("/").pop() || "",
    _fbRef: nativeRef
  };
}

// Hybrid real-time listener (Firebase Realtime Database + BroadcastChannel + LocalStorage)
export function onValue(
  reference: any,
  callback: (snapshot: any) => void,
  cancelCallbackOrOptions?: any
): () => void {
  const path = extractRefPath(reference);

  if (path === ".info/connected" || path.endsWith(".info/connected")) {
    if (db) {
      try {
        const connRef = fbRef(db, ".info/connected");
        return fbOnValue(
          connRef,
          (snap) => callback(snap),
          typeof cancelCallbackOrOptions === "function" ? cancelCallbackOrOptions : undefined
        );
      } catch {}
    }
    callback({
      exists: () => true,
      val: () => true,
      key: "connected"
    });
    return () => {};
  }

  let lastSerialized = "";
  const emitLocalIfChanged = () => {
    const cached = readLocalRtdbCache(path);
    if (cached.exists) {
      const serialized = JSON.stringify(cached.val);
      if (serialized !== lastSerialized) {
        lastSerialized = serialized;
        callback({
          exists: () => true,
          val: () => cached.val,
          key: reference?.key || path.split("/").pop() || null
        });
      }
    } else if (lastSerialized === "") {
      lastSerialized = "null";
      callback({
        exists: () => false,
        val: () => null,
        key: reference?.key || path.split("/").pop() || null
      });
    }
  };

  emitLocalIfChanged();

  let unsubFb: (() => void) | null = null;
  const nativeRef = getNativeFbRef(reference);
  if (nativeRef) {
    try {
      unsubFb = fbOnValue(
        nativeRef,
        (snap) => {
          if (snap.exists()) {
            const val = snap.val();
            const serialized = JSON.stringify(val);
            if (serialized !== lastSerialized) {
              lastSerialized = serialized;
              syncLocalHierarchyCache(path, val, false);
              callback(snap);
            }
          } else if (lastSerialized !== "null") {
            const cached = readLocalRtdbCache(path);
            if (!cached.exists) {
              lastSerialized = "null";
              callback(snap);
            }
          }
        },
        (err) => {
          if (typeof cancelCallbackOrOptions === "function") {
            try {
              cancelCallbackOrOptions(err);
            } catch {}
          }
        }
      );
    } catch {}
  }

  let bus: BroadcastChannel | null = null;
  if (typeof window !== "undefined") {
    try {
      bus = new BroadcastChannel("ipsi_rtdb_local_bus");
      bus.onmessage = (ev) => {
        const changedPath: string = ev.data?.path || "";
        if (
          changedPath === path ||
          changedPath.startsWith(`${path}/`) ||
          path.startsWith(`${changedPath}/`)
        ) {
          emitLocalIfChanged();
        }
      };
    } catch {}
  }

  const handleStorage = (ev: StorageEvent) => {
    if (!ev.key || ev.key === `rtdb_${path}` || ev.key.startsWith(`rtdb_${path}/`)) {
      emitLocalIfChanged();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    if (unsubFb) {
      try {
        unsubFb();
      } catch {}
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
    if (bus) bus.close();
  };
}

// Get value from Firebase Realtime Database with LocalStorage fallback
export async function get(reference: any): Promise<{ exists: () => boolean; val: () => any; key?: string | null }> {
  const path = extractRefPath(reference);
  const nativeRef = getNativeFbRef(reference);
  const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;

  if (nativeRef && isOnline) {
    try {
      const snap = await withFirebaseTimeout(fbGet(nativeRef), 2000);
      if (snap.exists()) {
        const val = snap.val();
        syncLocalHierarchyCache(path, val, false);
        return snap;
      }
    } catch {}
  }

  const cached = readLocalRtdbCache(path);
  if (cached.exists) {
    return {
      exists: () => true,
      val: () => cached.val,
      key: reference?.key || null
    };
  }
  return { exists: () => false, val: () => null, key: reference?.key || null };
}

// Set value to Firebase Realtime Database, LocalStorage & BroadcastChannel
export async function set(reference: any, value: any): Promise<void> {
  const path = extractRefPath(reference);
  const cleanValue = sanitizeForFirebase(value);
  syncLocalHierarchyCache(path, cleanValue, false);

  const nativeRef = getNativeFbRef(reference);
  const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
  if (nativeRef && isOnline) {
    try {
      await withFirebaseTimeout(fbSet(nativeRef, cleanValue), 2500);
      clearPendingRtdbPath(path);
      return;
    } catch {
      queuePendingRtdbPath(path, cleanValue);
    }
  } else if (path) {
    queuePendingRtdbPath(path, cleanValue);
  }
}

// Update value in Firebase Realtime Database, LocalStorage & BroadcastChannel
export async function update(reference: any, values: Record<string, any>): Promise<void> {
  const path = extractRefPath(reference);
  const cleanValues = sanitizeForFirebase(values);
  syncLocalHierarchyCache(path, cleanValues, true);

  const nativeRef = getNativeFbRef(reference);
  const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
  if (nativeRef && isOnline && cleanValues && typeof cleanValues === "object") {
    try {
      await withFirebaseTimeout(fbUpdate(nativeRef, cleanValues), 2500);
      return;
    } catch {
      const cached = readLocalRtdbCache(path);
      if (cached.exists) {
        queuePendingRtdbPath(path, cached.val);
      }
    }
  } else if (path) {
    const cached = readLocalRtdbCache(path);
    if (cached.exists) {
      queuePendingRtdbPath(path, cached.val);
    }
  }
}

// Current Arena / Gelanggang identifier (default: "A")
const ARENA_STORAGE_KEY = "ipsi_active_arena";
export function getActiveArena(): string {
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    const arenaFromUrl = urlParams.get("arena") || urlParams.get("gelanggang");
    if (arenaFromUrl) {
      const normalized = arenaFromUrl.toUpperCase();
      window.localStorage.setItem(ARENA_STORAGE_KEY, normalized);
      return normalized;
    }
    const saved = window.localStorage.getItem(ARENA_STORAGE_KEY);
    if (saved) return saved;
  }
  return "A";
}

export function setActiveArena(arena: string): void {
  const normalized = (arena || "A").toUpperCase();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ARENA_STORAGE_KEY, normalized);
  }
}

// Firebase Realtime Database Connection Status Listener
export function subscribeToConnectionStatus(callback: (connected: boolean, lastPing?: number) => void): () => void {
  if (typeof window === "undefined") {
    callback(false, Date.now());
    return () => {};
  }

  let fbConnected = false;
  const emit = () => {
    const online = (typeof navigator === "undefined" || navigator.onLine !== false) && fbConnected;
    const prev = isRealtimeConnected;
    isRealtimeConnected = online;
    callback(online, Date.now());
    if (!prev && online) {
      flushPendingCloudSync();
    }
  };

  const handleOnline = () => emit();
  const handleOffline = () => {
    isRealtimeConnected = false;
    callback(false, Date.now());
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  let unsubFb: (() => void) | null = null;
  if (db) {
    try {
      const connRef = fbRef(db, ".info/connected");
      unsubFb = fbOnValue(
        connRef,
        (snap) => {
          fbConnected = snap.val() === true;
          emit();
        },
        () => {
          fbConnected = false;
          emit();
        }
      );
    } catch {
      fbConnected = false;
      emit();
    }
  } else {
    fbConnected = false;
    emit();
  }

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    if (unsubFb) unsubFb();
  };
}

// Subscribe to Live Active Match from Firebase Realtime Database, LocalStorage, IndexedDB Vault & BroadcastChannel
export function subscribeToActiveMatch(
  callback: (matchState: MatchState | null) => void,
  arena = getActiveArena()
): () => void {
  if (typeof window === "undefined") return () => {};

  const readLocalMatch = (): MatchState | null => {
    try {
      const recovered = autoSaveVault.recoverSyncFromWebStorage(arena);
      if (recovered) return recovered;
    } catch {}
    return null;
  };

  const initialLocal = readLocalMatch();
  if (initialLocal) {
    callback(initialLocal);
  }
  autoSaveVault.recoverFromIndexedDB(arena).then(({ state: idbState, wasRecoveredFromIdb }) => {
    if (wasRecoveredFromIdb && idbState) {
      callback(idbState);
    }
  });

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(`jrz_match_sync_${arena}`);
    channel.onmessage = (ev) => {
      if (ev.data) {
        callback(normalizeMatchState(ev.data));
      }
    };
  } catch {}

  const handleStorage = (ev: StorageEvent) => {
    if (
      !ev.key ||
      ev.key === `jrz_silat_match_state_${arena}` ||
      ev.key === "jrz_silat_match_state" ||
      ev.key === "ipsi_match_state"
    ) {
      const latestLocal = readLocalMatch();
      if (latestLocal) {
        callback(latestLocal);
      }
    }
  };
  window.addEventListener("storage", handleStorage);

  let unsubRtdb: (() => void) | null = null;
  if (db) {
    try {
      const arenaMatchRef = fbRef(db, `arenas/${arena}/activeMatch`);
      unsubRtdb = fbOnValue(
        arenaMatchRef,
        (snap) => {
          if (snap.exists()) {
            const remoteNormalized = normalizeMatchState(snap.val());
            const localCurrent = readLocalMatch();
            const pending = hasPendingCloudSync(arena);
            const { merged, localIsNewer } = offlineEngine.reconcileMatchStates(
              localCurrent,
              remoteNormalized,
              pending
            );

            try {
              const rawMerged = JSON.stringify(merged);
              window.localStorage.setItem(`jrz_silat_match_state_${arena}`, rawMerged);
              window.localStorage.setItem("jrz_silat_match_state", rawMerged);
              window.localStorage.setItem("ipsi_match_state", rawMerged);
            } catch {}

            const localActions = (localCurrent?.redStats?.punches || 0) + (localCurrent?.redStats?.kicks || 0) +
              (localCurrent?.blueStats?.punches || 0) + (localCurrent?.blueStats?.kicks || 0);
            const remoteActions = (remoteNormalized?.redStats?.punches || 0) + (remoteNormalized?.redStats?.kicks || 0) +
              (remoteNormalized?.blueStats?.punches || 0) + (remoteNormalized?.blueStats?.kicks || 0);

            if (localIsNewer && pending && localActions >= remoteActions && (localCurrent?.lastUpdatedAt || 0) > (remoteNormalized?.lastUpdatedAt || 0) + 1500) {
              const cleanMerged = sanitizeForFirebase(merged);
              withFirebaseTimeout(fbSet(arenaMatchRef, cleanMerged), 5000)
                .then(() => setPendingCloudSync(arena, false))
                .catch(() => setPendingCloudSync(arena, true));
              if (arena === "A") {
                const rootMatchRef = fbRef(db, "activeMatch");
                fbSet(rootMatchRef, cleanMerged).catch(() => {});
              }
            } else if (remoteActions >= localActions) {
              setPendingCloudSync(arena, false);
            }

            callback(merged);
          } else if (arena === "A") {
            const rootMatchRef = fbRef(db, "activeMatch");
            withFirebaseTimeout(fbGet(rootMatchRef), 1500)
              .then((rootSnap) => {
                if (rootSnap.exists()) {
                  const remoteNormalized = normalizeMatchState(rootSnap.val());
                  const localCurrent = readLocalMatch();
                  const { merged } = offlineEngine.reconcileMatchStates(
                    localCurrent,
                    remoteNormalized,
                    hasPendingCloudSync(arena)
                  );
                  callback(merged);
                }
              })
              .catch(() => {});
          }
        },
        () => {}
      );
    } catch {}
  }

  return () => {
    window.removeEventListener("storage", handleStorage);
    if (channel) channel.close();
    if (unsubRtdb) unsubRtdb();
  };
}

// Helper to safely strip undefined values
export function sanitizeForFirebase<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  try {
    return JSON.parse(
      JSON.stringify(data, (_key, value) => {
        if (value === undefined) return null;
        return value;
      })
    );
  } catch {
    return data;
  }
}

// Save match state to Firebase Realtime Database, LocalStorage, SessionStorage, IndexedDB Auto-Save Vault & BroadcastChannel
export async function saveMatchStateToFirebase(
  matchState: MatchState,
  arena = getActiveArena()
): Promise<void> {
  if (typeof window === "undefined") return;

  const normalized = normalizeMatchState(matchState);
  if (!normalized.lastUpdatedAt) {
    normalized.lastUpdatedAt = Date.now();
  }
  const cleanPayload = sanitizeForFirebase(normalized);
  const raw = JSON.stringify(cleanPayload);

  try {
    autoSaveVault.saveMatchState(cleanPayload, arena, "FIREBASE_SAVE");
    window.localStorage.setItem(`jrz_silat_match_state_${arena}`, raw);
    window.localStorage.setItem("jrz_silat_match_state", raw);
    window.localStorage.setItem("ipsi_match_state", raw);

    const channel = new BroadcastChannel(`jrz_match_sync_${arena}`);
    channel.postMessage(cleanPayload);
    channel.close();
  } catch {}

  const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
  if (db && isOnline) {
    try {
      const arenaMatchRef = fbRef(db, `arenas/${arena}/activeMatch`);
      await withFirebaseTimeout(fbSet(arenaMatchRef, cleanPayload), 1500);
      setPendingCloudSync(arena, false);
      if (arena === "A") {
        const rootMatchRef = fbRef(db, "activeMatch");
        fbSet(rootMatchRef, cleanPayload).catch(() => {});
      }
    } catch {
      setPendingCloudSync(arena, true);
    }
  } else {
    setPendingCloudSync(arena, true);
  }
}

// Update partial match state in Firebase Realtime Database & locally
export async function updateMatchStateInFirebase(
  updates: Partial<MatchState>,
  arena = getActiveArena()
): Promise<void> {
  if (typeof window === "undefined") return;

  const stampedUpdates = {
    ...updates,
    lastUpdatedAt: updates.lastUpdatedAt || Date.now()
  };
  const cleanUpdates = sanitizeForFirebase(stampedUpdates);

  try {
    const saved =
      window.localStorage.getItem(`jrz_silat_match_state_${arena}`) ||
      window.localStorage.getItem("jrz_silat_match_state");
    const current = saved ? JSON.parse(saved) : {};
    const updated = {
      ...current,
      ...cleanUpdates,
      stateVersion: (Number(current.stateVersion) || 0) + 1
    };
    await saveMatchStateToFirebase(updated, arena);
  } catch {}
}

// Push an atomic jury press to Firebase Realtime Database & local BroadcastChannel
export async function pushJuryPressToFirebase(
  juryId: number,
  fighter: FighterColor,
  action: ActionType,
  pressedAt = getSyncedNow(),
  arena = getActiveArena()
): Promise<void> {
  if (typeof window === "undefined") return;

  const pressData = {
    juryId,
    fighter,
    action,
    pressedAt
  };

  try {
    const channel = new BroadcastChannel(`jrz_jury_press_${arena}`);
    channel.postMessage(pressData);
    channel.close();
  } catch {}

  const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
  if (db && (isRealtimeConnected || isOnline)) {
    try {
      const pressRef = fbRef(db, `arenas/${arena}/activeJuryPresses/${juryId}`);
      fbSet(pressRef, pressData).catch(() => {});
      if (arena === "A") {
        const rootPressRef = fbRef(db, `activeJuryPresses/${juryId}`);
        fbSet(rootPressRef, pressData).catch(() => {});
      }
      setTimeout(async () => {
        try {
          if (db) {
            const snap = await fbGet(pressRef);
            if (snap.exists() && snap.val()?.pressedAt === pressedAt) {
              await fbSet(pressRef, null);
              if (arena === "A") {
                const rootPressRef = fbRef(db, `activeJuryPresses/${juryId}`);
                await fbSet(rootPressRef, null);
              }
            }
          }
        } catch {}
      }, 2500);
    } catch {}
  }
}

// Subscribe to atomic jury presses via Firebase Realtime Database & local BroadcastChannel
export function subscribeToJuryPresses(
  callback: (presses: Record<number, { fighter: FighterColor; action: ActionType; pressedAt: number } | null>) => void,
  arena = getActiveArena()
): () => void {
  if (typeof window === "undefined") return () => {};

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(`jrz_jury_press_${arena}`);
    channel.onmessage = (ev) => {
      if (ev.data && ev.data.juryId) {
        callback({
          [ev.data.juryId]: {
            fighter: ev.data.fighter,
            action: ev.data.action,
            pressedAt: ev.data.pressedAt || getSyncedNow()
          }
        });
      }
    };
  } catch {}

  let unsubRtdb: (() => void) | null = null;
  if (db) {
    try {
      const pressesRef = fbRef(db, `arenas/${arena}/activeJuryPresses`);
      unsubRtdb = fbOnValue(pressesRef, (snap) => {
        if (snap.exists()) {
          callback(snap.val());
        } else {
          callback({});
        }
      });
    } catch {}
  }

  return () => {
    if (channel) channel.close();
    if (unsubRtdb) unsubRtdb();
  };
}

// Register device presence in Firebase Realtime Database & locally
export function registerDevicePresence(
  deviceId: string,
  roleName: string,
  arena = getActiveArena()
): () => void {
  if (typeof window === "undefined") return () => {};

  const updateLocalPresence = (active: boolean) => {
    try {
      const key = `ipsi_presence_${arena}`;
      const raw = window.localStorage.getItem(key);
      const map = raw ? JSON.parse(raw) : {};
      map[deviceId] = {
        active,
        role: roleName,
        ip: isRealtimeConnected ? "Firebase RTDB" : "Lokal",
        lastSeen: Date.now()
      };
      window.localStorage.setItem(key, JSON.stringify(map));
    } catch {}
  };

  updateLocalPresence(true);

  let unsubConn: (() => void) | null = null;
  let presenceRef: any = null;
  if (db) {
    try {
      presenceRef = fbRef(db, `arenas/${arena}/presence/${deviceId}`);
      const connRef = fbRef(db, ".info/connected");
      unsubConn = fbOnValue(connRef, (snap) => {
        if (snap.val() === true) {
          fbSet(presenceRef, {
            active: true,
            role: roleName,
            lastSeen: Date.now(),
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : ""
          }).catch(() => {});
          try {
            fbOnDisconnect(presenceRef).update({
              active: false,
              lastSeen: Date.now()
            });
          } catch {}
        }
      });
    } catch {}
  }

  const intervalId = setInterval(() => {
    updateLocalPresence(true);
    if (presenceRef && isRealtimeConnected) {
      try {
        fbUpdate(presenceRef, {
          active: true,
          role: roleName,
          lastSeen: Date.now()
        }).catch(() => {});
      } catch {}
    }
  }, 15000);

  return () => {
    if (unsubConn) unsubConn();
    clearInterval(intervalId);
    updateLocalPresence(false);
    if (presenceRef && isRealtimeConnected) {
      try {
        fbUpdate(presenceRef, {
          active: false,
          lastSeen: Date.now()
        }).catch(() => {});
      } catch {}
    }
  };
}

// Subscribe to device presence in Firebase Realtime Database & locally
export function subscribeToDevicePresence(
  callback: (devices: { [key: string]: { active: boolean; ip?: string; lastSeen: number } }) => void,
  arena = getActiveArena()
): () => void {
  if (typeof window === "undefined") {
    callback({});
    return () => {};
  }

  let remoteDevices: Record<string, any> = {};
  const emitMergedPresence = () => {
    try {
      const raw = window.localStorage.getItem(`ipsi_presence_${arena}`);
      const localMap = raw ? JSON.parse(raw) : {};
      callback({ ...localMap, ...remoteDevices });
    } catch {
      callback({ ...remoteDevices });
    }
  };

  emitMergedPresence();

  let unsubRtdb: (() => void) | null = null;
  if (db) {
    try {
      const presenceRef = fbRef(db, `arenas/${arena}/presence`);
      unsubRtdb = fbOnValue(
        presenceRef,
        (snap) => {
          remoteDevices = snap.exists() ? snap.val() || {} : {};
          emitMergedPresence();
        },
        () => {
          emitMergedPresence();
        }
      );
    } catch {}
  }

  const handleStorage = (ev: StorageEvent) => {
    if (!ev.key || ev.key === `ipsi_presence_${arena}`) {
      emitMergedPresence();
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    if (unsubRtdb) unsubRtdb();
  };
}

// Tournament Schedule helpers (Firebase Realtime Database + LocalStorage)
export function subscribeToSchedule(
  callback: (schedule: any[]) => void,
  arena = getActiveArena()
): () => void {
  if (typeof window === "undefined") return () => {};

  const readLocalSchedule = () => {
    try {
      const saved = window.localStorage.getItem(`ipsi_schedule_${arena}`);
      if (saved) {
        callback(JSON.parse(saved));
      }
    } catch {}
  };

  readLocalSchedule();

  let unsubRtdb: (() => void) | null = null;
  if (db) {
    try {
      const schedRef = fbRef(db, `arenas/${arena}/schedule`);
      unsubRtdb = fbOnValue(schedRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          const list = Array.isArray(val) ? val : Object.values(val || {});
          try {
            window.localStorage.setItem(`ipsi_schedule_${arena}`, JSON.stringify(list));
            autoSaveVault.mirrorKeyToIndexedDB(`ipsi_schedule_${arena}`, list);
          } catch {}
          callback(list);
        }
      });
    } catch {}
  }

  const handleStorage = (ev: StorageEvent) => {
    if (!ev.key || ev.key === `ipsi_schedule_${arena}`) {
      readLocalSchedule();
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    if (unsubRtdb) unsubRtdb();
  };
}

export async function saveScheduleToFirebase(
  scheduleList: any[],
  arena = getActiveArena()
): Promise<void> {
  if (typeof window === "undefined") return;

  const cleanList = sanitizeForFirebase(scheduleList);
  try {
    window.localStorage.setItem(`ipsi_schedule_${arena}`, JSON.stringify(cleanList));
    autoSaveVault.mirrorKeyToIndexedDB(`ipsi_schedule_${arena}`, cleanList);
  } catch {}

  if (db) {
    try {
      const schedRef = fbRef(db, `arenas/${arena}/schedule`);
      await withFirebaseTimeout(fbSet(schedRef, cleanList), 2500);
      if (arena === "A") {
        const rootSchedRef = fbRef(db, "schedule");
        fbSet(rootSchedRef, cleanList).catch(() => {});
      }
    } catch {
      queuePendingRtdbPath(`arenas/${arena}/schedule`, cleanList);
    }
  }
}

// Users Management (Firebase Realtime Database + LocalStorage)
export function subscribeToUsers(callback: (users: UserAccount[]) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const readUsers = () => {
    try {
      const saved = window.localStorage.getItem("ipsi_registered_users");
      if (saved) {
        callback(JSON.parse(saved));
      }
    } catch {}
  };

  readUsers();

  let unsubRtdb: (() => void) | null = null;
  if (db) {
    try {
      const usersRef = fbRef(db, "users");
      unsubRtdb = fbOnValue(usersRef, (snap) => {
        if (snap.exists()) {
          const val = snap.val();
          const list: UserAccount[] = Array.isArray(val) ? val : Object.values(val || {});
          try {
            window.localStorage.setItem("ipsi_registered_users", JSON.stringify(list));
          } catch {}
          callback(list);
        }
      });
    } catch {}
  }

  const handleStorage = (ev: StorageEvent) => {
    if (!ev.key || ev.key === "ipsi_registered_users") {
      readUsers();
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    if (unsubRtdb) unsubRtdb();
  };
}

export async function saveUserToFirebase(user: UserAccount): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const saved = window.localStorage.getItem("ipsi_registered_users");
    const list: UserAccount[] = saved ? JSON.parse(saved) : [];
    const index = list.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      list[index] = user;
    } else {
      list.push(user);
    }
    window.localStorage.setItem("ipsi_registered_users", JSON.stringify(list));
  } catch {}

  if (db && user?.id) {
    try {
      const userRef = fbRef(db, `users/${user.id}`);
      await withFirebaseTimeout(fbSet(userRef, sanitizeForFirebase(user)), 2500);
    } catch {
      queuePendingRtdbPath(`users/${user.id}`, sanitizeForFirebase(user));
    }
  }
}

export async function updateUserInFirebase(userId: string, partial: Partial<UserAccount>): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const saved = window.localStorage.getItem("ipsi_registered_users");
    const list: UserAccount[] = saved ? JSON.parse(saved) : [];
    const index = list.findIndex((u) => u.id === userId);
    if (index >= 0) {
      list[index] = { ...list[index], ...partial };
      window.localStorage.setItem("ipsi_registered_users", JSON.stringify(list));
    }
  } catch {}

  if (db && userId) {
    try {
      const userRef = fbRef(db, `users/${userId}`);
      await withFirebaseTimeout(fbUpdate(userRef, sanitizeForFirebase(partial) as any), 2500);
    } catch {}
  }
}

export function isMatchOngoing(match: any): boolean {
  if (!match) return false;
  const ongoingStatuses: (string | MatchStatus)[] = [
    MatchStatus.RUNNING,
    MatchStatus.PAUSED,
    MatchStatus.ROUND_BREAK,
    "RUNNING",
    "PAUSED",
    "ROUND_BREAK"
  ];
  if (ongoingStatuses.includes(match.status)) {
    return true;
  }
  if (match.timerStatus === "RUNNING" || match.timerStatus === "PAUSED") {
    return true;
  }
  return false;
}

export function subscribeToAllArenasMatches(
  callback: (arenasMap: Record<string, MatchState | null>) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const arenas = ["A", "B", "C", "D"];
  const remoteMap: Record<string, MatchState | null> = {};

  const readLocal = () => {
    const result: Record<string, MatchState | null> = {};
    arenas.forEach((arena) => {
      if (remoteMap[arena]) {
        result[arena] = remoteMap[arena];
        return;
      }
      try {
        const raw = window.localStorage.getItem(`jrz_silat_match_state_${arena}`);
        if (raw) {
          result[arena] = normalizeMatchState(JSON.parse(raw));
        } else if (arena === "A") {
          const defaultRaw = window.localStorage.getItem("jrz_silat_match_state");
          result[arena] = defaultRaw ? normalizeMatchState(JSON.parse(defaultRaw)) : null;
        } else {
          result[arena] = null;
        }
      } catch {
        result[arena] = null;
      }
    });
    return result;
  };

  callback(readLocal());

  let unsubRtdb: (() => void) | null = null;
  if (db) {
    try {
      const arenasRef = fbRef(db, "arenas");
      unsubRtdb = fbOnValue(arenasRef, (snap) => {
        if (snap.exists()) {
          const data = snap.val() || {};
          arenas.forEach((arena) => {
            if (data[arena]?.activeMatch) {
              remoteMap[arena] = normalizeMatchState(data[arena].activeMatch);
            }
          });
          callback(readLocal());
        }
      });
    } catch {}
  }

  const handleStorage = () => {
    callback(readLocal());
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    if (unsubRtdb) unsubRtdb();
  };
}

// Automatic Real-Time Application Storage Bridge (localStorage <-> Firebase RTDB /appStorage)
function sanitizeStorageKeyForRtdb(key: string): string {
  return key.replace(/[.#$/[\]]/g, "_");
}

function shouldSyncStorageKeyToRtdb(key: string): boolean {
  if (!key) return false;
  if (
    key.startsWith("ipsi_last_timer_tick_") ||
    key.startsWith("ipsi_pending_") ||
    key === "ipsi_ui_session"
  ) {
    return false;
  }
  return (
    key.startsWith("jrz_") ||
    key.startsWith("ipsi_") ||
    key.startsWith("sekretaris_") ||
    key === "registered_athletes" ||
    key === "match_schedules"
  );
}

// Sinkronisasi eksplisit jadwal & peserta turnamen ke Firebase Realtime Database
export async function syncTournamentToFirebase(
  schedules: any[],
  participants?: any[],
  categories?: any[]
): Promise<void> {
  if (typeof window === "undefined" || !db) return;
  try {
    const cleanMatches = sanitizeForFirebase(schedules || []);
    const cleanParticipants = sanitizeForFirebase(participants || []);
    const cleanCategories = sanitizeForFirebase(categories || []);

    // 1. Simpan ke path arenas/A/schedule dan root schedule
    const schedRefA = fbRef(db, "arenas/A/schedule");
    const rootSchedRef = fbRef(db, "schedule");
    await Promise.allSettled([
      fbSet(schedRefA, cleanMatches),
      fbSet(rootSchedRef, cleanMatches)
    ]);

    // 2. Simpan juga jika ada partai Gelanggang B, C, D
    const arenasFound = new Set<string>();
    (schedules || []).forEach((m: any) => {
      if (m && m.arena && typeof m.arena === "string") {
        const aCode = m.arena.replace(/[^A-Za-z0-9]/g, "").slice(-1).toUpperCase();
        if (aCode && aCode !== "A") arenasFound.add(aCode);
      }
    });
    for (const aCode of arenasFound) {
      const arenaMatches = (schedules || []).filter((m: any) => {
        const c = String(m?.arena || "").replace(/[^A-Za-z0-9]/g, "").slice(-1).toUpperCase();
        return c === aCode;
      });
      fbSet(fbRef(db, `arenas/${aCode}/schedule`), sanitizeForFirebase(arenaMatches)).catch(() => {});
    }

    // 3. Simpan ringkasan turnamen untuk akses cepat multi-device
    fbSet(fbRef(db, "tournamentData"), {
      updatedAt: Date.now(),
      matchesCount: (schedules || []).length,
      participantsCount: (participants || []).length,
      categoriesCount: (categories || []).length,
      participants: cleanParticipants,
      categories: cleanCategories
    }).catch(() => {});
  } catch (err) {
    console.warn("[Firebase] syncTournamentToFirebase error:", err);
  }
}

function initRealtimeAppStorageBridge() {
  if (typeof window === "undefined" || !db) return;
  if ((window as any).__jrzRtdbStorageBridgeInitialized) return;
  (window as any).__jrzRtdbStorageBridgeInitialized = true;

  let isApplyingRemoteStorage = false;
  const origSetItem = window.localStorage.setItem.bind(window.localStorage);
  const origRemoveItem = window.localStorage.removeItem.bind(window.localStorage);

  window.localStorage.setItem = function (key: string, value: string) {
    origSetItem(key, value);
    if (isApplyingRemoteStorage || !shouldSyncStorageKeyToRtdb(key)) return;
    try {
      const safeKey = sanitizeStorageKeyForRtdb(key);
      const itemRef = fbRef(db, `appStorage/${safeKey}`);
      fbSet(itemRef, {
        key,
        value,
        updatedAt: Date.now()
      }).catch(() => {});
    } catch {}
  };

  window.localStorage.removeItem = function (key: string) {
    origRemoveItem(key);
    if (isApplyingRemoteStorage || !shouldSyncStorageKeyToRtdb(key)) return;
    try {
      const safeKey = sanitizeStorageKeyForRtdb(key);
      const itemRef = fbRef(db, `appStorage/${safeKey}`);
      fbSet(itemRef, null).catch(() => {});
    } catch {}
  };

  try {
    const appStorageRef = fbRef(db, "appStorage");
    fbOnValue(appStorageRef, (snap) => {
      if (!snap.exists()) return;
      const entries = snap.val() || {};
      isApplyingRemoteStorage = true;
      try {
        Object.values<any>(entries).forEach((entry) => {
          if (entry && typeof entry.key === "string" && typeof entry.value === "string") {
            if (!shouldSyncStorageKeyToRtdb(entry.key)) return;
            const currentVal = window.localStorage.getItem(entry.key);
            if (currentVal !== entry.value) {
              origSetItem(entry.key, entry.value);
              try {
                autoSaveVault.mirrorKeyToIndexedDB(entry.key, JSON.parse(entry.value));
              } catch {
                autoSaveVault.mirrorKeyToIndexedDB(entry.key, entry.value);
              }
              try {
                window.dispatchEvent(
                  new StorageEvent("storage", {
                    key: entry.key,
                    newValue: entry.value,
                    oldValue: currentVal
                  })
                );
                // Dispatch custom events untuk update reaktif instan di seluruh layar
                if (entry.key === "jrz_cached_schedules" || entry.key === "match_schedules") {
                  try {
                    const parsed = JSON.parse(entry.value);
                    window.dispatchEvent(new CustomEvent("jrz_schedules_updated", { detail: parsed }));
                  } catch {}
                }
                if (entry.key === "jrz_cached_participants" || entry.key === "registered_athletes") {
                  try {
                    const parsed = JSON.parse(entry.value);
                    window.dispatchEvent(new CustomEvent("jrz_athletes_updated", { detail: { participants: parsed } }));
                  } catch {}
                }
              } catch {}
            }
          }
        });
      } finally {
        isApplyingRemoteStorage = false;
      }
    });
  } catch {}
}

if (typeof window !== "undefined") {
  if (typeof (window as any).requestIdleCallback === "function") {
    (window as any).requestIdleCallback(() => initRealtimeAppStorageBridge());
  } else {
    setTimeout(initRealtimeAppStorageBridge, 200);
  }
}
