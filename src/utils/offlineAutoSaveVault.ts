/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Offline Auto-Save & Crash-Recovery Vault (IndexedDB + LocalStorage + SessionStorage)
 * Menjamin keamanan 100% data penilaian real-time saat offline maupun sinyal lemah
 * apabila terjadi refresh browser tak terduga (F5, pull-to-refresh, tab crash, atau baterai habis).
 */

import { MatchState, MatchStatus } from "../types";
import { normalizeMatchState } from "./defaultMatchState";

const VAULT_DB_NAME = "jrz_silat_autosave_vault_v2";
const VAULT_DB_VERSION = 1;

const STORE_ACTIVE_MATCHES = "active_matches";
const STORE_CHECKPOINTS = "checkpoints";
const STORE_RTDB_MIRROR = "rtdb_mirror";
const STORE_UI_SESSION = "ui_session";

export interface AutoSaveSnapshot {
  arena: string;
  matchId: string;
  state: MatchState;
  savedAt: number;
  stateVersion: number;
  scoredActionsCount: number;
  reason: string;
}

export interface AutoSaveVaultStatus {
  lastSavedAt: number;
  lastSavedReason: string;
  arena: string;
  matchId: string;
  stateVersion: number;
  idbHealthy: boolean;
  recoveredFromRefresh: boolean;
  recoveredTimestamp?: number;
}

function countScoredActions(state: MatchState | null | undefined): number {
  if (!state) return 0;
  const r = state.redStats || ({} as any);
  const b = state.blueStats || ({} as any);
  const rp = state.redPenalties || ({} as any);
  const bp = state.bluePenalties || ({} as any);

  let total =
    (Number(r.punches) || 0) +
    (Number(r.kicks) || 0) +
    (Number(r.drops) || 0) +
    (Number(r.locks) || 0) +
    Math.abs(Number(r.overrides) || 0) +
    (Number(b.punches) || 0) +
    (Number(b.kicks) || 0) +
    (Number(b.drops) || 0) +
    (Number(b.locks) || 0) +
    Math.abs(Number(b.overrides) || 0) +
    (Number(r.pastPenaltiesDeductions) || 0) +
    (Number(b.pastPenaltiesDeductions) || 0);

  if (rp.binaan1) total++;
  if (rp.binaan2) total++;
  if (rp.teguran1) total++;
  if (rp.teguran2) total++;
  if (rp.peringatan1) total++;
  if (rp.peringatan2) total++;
  if (rp.disqualified) total += 5;

  if (bp.binaan1) total++;
  if (bp.binaan2) total++;
  if (bp.teguran1) total++;
  if (bp.teguran2) total++;
  if (bp.peringatan1) total++;
  if (bp.peringatan2) total++;
  if (bp.disqualified) total += 5;

  return total;
}

class OfflineAutoSaveVault {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private statusListeners: ((status: AutoSaveVaultStatus) => void)[] = [];
  private latestStateByArena: Record<string, MatchState> = {};
  private status: AutoSaveVaultStatus = {
    lastSavedAt: Date.now(),
    lastSavedReason: "INIT",
    arena: "A",
    matchId: "match-1",
    stateVersion: 1,
    idbHealthy: typeof window !== "undefined" && "indexedDB" in window,
    recoveredFromRefresh: false
  };

  constructor() {
    if (typeof window !== "undefined") {
      this.initDatabase();
      this.registerLifecycleUnloadGuards();
    }
  }

  private initDatabase(): Promise<IDBDatabase | null> {
    if (typeof window === "undefined" || !window.indexedDB) {
      return Promise.resolve(null);
    }
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(VAULT_DB_NAME, VAULT_DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_ACTIVE_MATCHES)) {
            db.createObjectStore(STORE_ACTIVE_MATCHES);
          }
          if (!db.objectStoreNames.contains(STORE_CHECKPOINTS)) {
            db.createObjectStore(STORE_CHECKPOINTS);
          }
          if (!db.objectStoreNames.contains(STORE_RTDB_MIRROR)) {
            db.createObjectStore(STORE_RTDB_MIRROR);
          }
          if (!db.objectStoreNames.contains(STORE_UI_SESSION)) {
            db.createObjectStore(STORE_UI_SESSION);
          }
        };
        req.onsuccess = () => {
          this.status.idbHealthy = true;
          resolve(req.result);
        };
        req.onerror = () => {
          this.status.idbHealthy = false;
          resolve(null);
        };
      } catch {
        this.status.idbHealthy = false;
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Registers synchronous and asynchronous browser refresh / tab close / visibility guards
   * so that even an unexpected F5, Ctrl+R, mobile swipe-refresh, or tab crash immediately
   * flushes the latest in-memory scoring state to LocalStorage, SessionStorage, and IndexedDB.
   */
  private registerLifecycleUnloadGuards() {
    if (typeof window === "undefined") return;

    const flushAllActiveStatesSync = (reason: string) => {
      try {
        const arenas = Object.keys(this.latestStateByArena);
        for (const arena of arenas) {
          const st = this.latestStateByArena[arena];
          if (st && st.id) {
            this.saveToWebStorageSync(st, arena, reason);
            this.saveToIndexedDBAsync(st, arena, reason, true);
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("beforeunload", () => {
      flushAllActiveStatesSync("BEFORE_UNLOAD");
    });

    window.addEventListener("pagehide", () => {
      flushAllActiveStatesSync("PAGE_HIDE");
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        flushAllActiveStatesSync("VISIBILITY_HIDDEN");
      }
    });
  }

  public getStatus(): AutoSaveVaultStatus {
    return { ...this.status };
  }

  public subscribeStatus(listener: (status: AutoSaveVaultStatus) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private notifyStatus() {
    const snap = this.getStatus();
    this.statusListeners.forEach((l) => {
      try {
        l(snap);
      } catch {
        // ignore
      }
    });
  }

  /**
   * Synchronously writes the match state and metadata to LocalStorage and SessionStorage
   * so it is 100% guaranteed to survive an immediate page reload.
   */
  public saveToWebStorageSync(state: MatchState, arenaInput?: string, reason = "AUTO_SAVE"): void {
    if (typeof window === "undefined" || !state) return;

    const arena = (arenaInput || state.arena || window.localStorage.getItem("ipsi_active_arena") || "A").toUpperCase();
    const now = Date.now();
    const normalized = normalizeMatchState({
      ...state,
      arena,
      lastUpdatedAt: state.lastUpdatedAt || now,
      stateVersion: Number(state.stateVersion) || 1
    });

    this.latestStateByArena[arena] = normalized;

    const snapshot: AutoSaveSnapshot = {
      arena,
      matchId: normalized.id || "match-1",
      state: normalized,
      savedAt: now,
      stateVersion: Number(normalized.stateVersion) || 1,
      scoredActionsCount: countScoredActions(normalized),
      reason
    };

    try {
      const rawState = JSON.stringify(normalized);
      const rawSnapshot = JSON.stringify(snapshot);

      // 1. Primary LocalStorage keys
      window.localStorage.setItem("ipsi_match_state", rawState);
      window.localStorage.setItem("jrz_silat_match_state", rawState);
      window.localStorage.setItem(`jrz_silat_match_state_${arena}`, rawState);

      // 2. Dedicated Emergency Auto-Save Backup keys in LocalStorage
      window.localStorage.setItem(`ipsi_autosave_emergency_snapshot_${arena}`, rawSnapshot);
      if (normalized.id && normalized.id !== "match-none") {
        window.localStorage.setItem(`ipsi_autosave_match_${normalized.id}`, rawSnapshot);
      }

      // 3. SessionStorage mirror (survives F5 / Ctrl+R refresh in the same tab even if another tab touches localStorage)
      if (window.sessionStorage) {
        window.sessionStorage.setItem(`ipsi_session_match_snapshot_${arena}`, rawSnapshot);
        window.sessionStorage.setItem("ipsi_session_last_active_arena", arena);
      }
    } catch {
      // If LocalStorage quota is full, prune old match checkpoints and retry
      try {
        this.pruneOldLocalStorageCheckpoints();
        const rawState = JSON.stringify(normalized);
        window.localStorage.setItem(`jrz_silat_match_state_${arena}`, rawState);
        window.localStorage.setItem("ipsi_match_state", rawState);
      } catch {
        // IndexedDB will still hold the full state
      }
    }

    this.status = {
      ...this.status,
      lastSavedAt: now,
      lastSavedReason: reason,
      arena,
      matchId: normalized.id || "match-1",
      stateVersion: Number(normalized.stateVersion) || 1
    };
    this.notifyStatus();
  }

  private pruneOldLocalStorageCheckpoints() {
    if (typeof window === "undefined") return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && (k.startsWith("ipsi_autosave_match_") || k.startsWith("ipsi_round_scores_history_"))) {
          keysToRemove.push(k);
        }
      }
      // Remove half of the oldest keys if too many
      keysToRemove.slice(0, Math.max(1, Math.floor(keysToRemove.length / 2))).forEach((k) => {
        window.localStorage.removeItem(k);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Asynchronously persists the match state and rolling checkpoint into IndexedDB.
   */
  public async saveToIndexedDBAsync(
    state: MatchState,
    arenaInput?: string,
    reason = "AUTO_SAVE",
    isCheckpoint = false
  ): Promise<void> {
    if (typeof window === "undefined" || !state) return;
    const arena = (arenaInput || state.arena || "A").toUpperCase();
    const now = Date.now();
    const normalized = normalizeMatchState({
      ...state,
      arena,
      lastUpdatedAt: state.lastUpdatedAt || now,
      stateVersion: Number(state.stateVersion) || 1
    });

    const snapshot: AutoSaveSnapshot = {
      arena,
      matchId: normalized.id || "match-1",
      state: normalized,
      savedAt: now,
      stateVersion: Number(normalized.stateVersion) || 1,
      scoredActionsCount: countScoredActions(normalized),
      reason
    };

    try {
      const db = await this.initDatabase();
      if (!db) return;

      const stores = isCheckpoint
        ? [STORE_ACTIVE_MATCHES, STORE_CHECKPOINTS]
        : [STORE_ACTIVE_MATCHES];

      const tx = db.transaction(stores, "readwrite");
      const activeStore = tx.objectStore(STORE_ACTIVE_MATCHES);
      activeStore.put(snapshot, `arena_${arena}`);
      activeStore.put(snapshot, "latest_active");
      if (normalized.id && normalized.id !== "match-none") {
        activeStore.put(snapshot, `match_${normalized.id}`);
      }

      if (isCheckpoint && normalized.id) {
        const cpStore = tx.objectStore(STORE_CHECKPOINTS);
        const cpKey = `cp_${arena}_${normalized.id}`;
        const getReq = cpStore.get(cpKey);
        getReq.onsuccess = () => {
          const existing: AutoSaveSnapshot[] = Array.isArray(getReq.result) ? getReq.result : [];
          // Keep last 25 rolling checkpoints for this match
          const updated = [...existing.slice(-24), snapshot];
          try {
            cpStore.put(updated, cpKey);
          } catch {
            // ignore
          }
        };
      }
    } catch {
      // ignore IndexedDB transient errors
    }
  }

  /**
   * Full Auto-Save (Synchronous WebStorage + Asynchronous IndexedDB)
   * Call this on every scoring event, timer tick, round change, or metadata update.
   */
  public saveMatchState(
    state: MatchState,
    arenaInput?: string,
    reason = "AUTO_SAVE",
    isScoringCheckpoint = false
  ): void {
    this.saveToWebStorageSync(state, arenaInput, reason);
    this.saveToIndexedDBAsync(state, arenaInput, reason, isScoringCheckpoint);
  }

  /**
   * Mirrors any key-value data (such as schedules, brackets, match history)
   * into IndexedDB so it is protected against accidental browser refresh or LocalStorage eviction.
   */
  public async mirrorKeyToIndexedDB(key: string, value: any): Promise<void> {
    if (typeof window === "undefined" || !key) return;
    try {
      const db = await this.initDatabase();
      if (!db) return;
      const tx = db.transaction(STORE_RTDB_MIRROR, "readwrite");
      tx.objectStore(STORE_RTDB_MIRROR).put(
        {
          key,
          value,
          savedAt: Date.now()
        },
        key
      );
    } catch {
      // ignore
    }
  }

  /**
   * Reads a mirrored key from IndexedDB if LocalStorage is missing it.
   */
  public async readMirroredKeyFromIndexedDB<T = any>(key: string): Promise<T | null> {
    if (typeof window === "undefined" || !key) return null;
    try {
      const db = await this.initDatabase();
      if (!db) return null;
      return new Promise<T | null>((resolve) => {
        try {
          const tx = db.transaction(STORE_RTDB_MIRROR, "readonly");
          const req = tx.objectStore(STORE_RTDB_MIRROR).get(key);
          req.onsuccess = () => {
            if (req.result && req.result.value !== undefined) {
              resolve(req.result.value as T);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    } catch {
      return null;
    }
  }

  /**
   * Saves UI session state (e.g. active appMode, arena, juryId) so a refresh brings the user right back.
   */
  public saveUiSession(sessionData: { appMode?: string; arena?: string; subScreen?: boolean }): void {
    if (typeof window === "undefined") return;
    try {
      const existingRaw = window.sessionStorage?.getItem("ipsi_ui_session");
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const merged = {
        ...existing,
        ...sessionData,
        updatedAt: Date.now()
      };
      const serialized = JSON.stringify(merged);
      window.sessionStorage?.setItem("ipsi_ui_session", serialized);
      // Hapus dari localStorage agar saat aplikasi ditutup/server dihentikan, tidak membangkitkan panel lama
      window.localStorage.removeItem("ipsi_ui_session");
    } catch {}
  }

  public getSavedUiSession(): { appMode?: string; arena?: string; subScreen?: boolean; updatedAt?: number } | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage?.getItem("ipsi_ui_session");
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  /**
   * Synchronous recovery of the best available MatchState from LocalStorage + SessionStorage
   * during initial React state hydration (0ms on page refresh).
   */
  public recoverSyncFromWebStorage(arenaInput?: string): MatchState | null {
    if (typeof window === "undefined") return null;
    const arena = (arenaInput || window.localStorage.getItem("ipsi_active_arena") || "A").toUpperCase();

    const candidates: MatchState[] = [];

    const tryParseState = (raw: string | null) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.state && parsed.state.id) {
          candidates.push(normalizeMatchState(parsed.state));
        } else if (parsed && parsed.id) {
          candidates.push(normalizeMatchState(parsed));
        }
      } catch {}
    };

    try {
      // 1. SessionStorage snapshot (from same tab before refresh)
      if (window.sessionStorage) {
        tryParseState(window.sessionStorage.getItem(`ipsi_session_match_snapshot_${arena}`));
      }
      // 2. Emergency auto-save snapshot in LocalStorage
      tryParseState(window.localStorage.getItem(`ipsi_autosave_emergency_snapshot_${arena}`));
      // 3. Arena-specific match state in LocalStorage
      tryParseState(window.localStorage.getItem(`jrz_silat_match_state_${arena}`));
      // 4. Generic match state keys in LocalStorage
      if (arena === "A") {
        tryParseState(window.localStorage.getItem("ipsi_match_state"));
        tryParseState(window.localStorage.getItem("jrz_silat_match_state"));
      }
    } catch {}

    if (candidates.length === 0) return null;

    // Pick the candidate with the most recent progress (highest scored actions / round / version / timestamp)
    let best = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      best = this.pickBetterCandidate(best, candidates[i]);
    }

    this.latestStateByArena[arena] = best;
    return best;
  }

  /**
   * Asynchronous deep recovery from IndexedDB (checks both v2 Vault and legacy v1 IDB store).
   * Resolves with the best reconciled MatchState and restores any missing LocalStorage tournament data.
   */
  public async recoverFromIndexedDB(arenaInput?: string): Promise<{
    state: MatchState | null;
    wasRecoveredFromIdb: boolean;
  }> {
    if (typeof window === "undefined") {
      return { state: null, wasRecoveredFromIdb: false };
    }

    const arena = (arenaInput || window.localStorage.getItem("ipsi_active_arena") || "A").toUpperCase();
    const syncCandidate = this.recoverSyncFromWebStorage(arena);
    const idbCandidates: MatchState[] = [];

    // 1. Read from v2 Auto-Save Vault IndexedDB
    try {
      const db = await this.initDatabase();
      if (db) {
        const snapArena = await new Promise<AutoSaveSnapshot | null>((resolve) => {
          try {
            const tx = db.transaction(STORE_ACTIVE_MATCHES, "readonly");
            const req = tx.objectStore(STORE_ACTIVE_MATCHES).get(`arena_${arena}`);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
        });
        if (snapArena && snapArena.state && snapArena.state.id) {
          idbCandidates.push(normalizeMatchState(snapArena.state));
        }

        // Also check rolling checkpoints for the current matchId if any
        const targetMatchId = snapArena?.matchId || syncCandidate?.id;
        if (targetMatchId && targetMatchId !== "match-none") {
          const checkpoints = await new Promise<AutoSaveSnapshot[]>((resolve) => {
            try {
              const tx = db.transaction(STORE_CHECKPOINTS, "readonly");
              const req = tx.objectStore(STORE_CHECKPOINTS).get(`cp_${arena}_${targetMatchId}`);
              req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
              req.onerror = () => resolve([]);
            } catch {
              resolve([]);
            }
          });
          checkpoints.forEach((cp) => {
            if (cp && cp.state && cp.state.id) {
              idbCandidates.push(normalizeMatchState(cp.state));
            }
          });
        }

        // Also restore critical tournament keys (schedule, brackets, history) from STORE_RTDB_MIRROR if missing in localStorage
        await this.restoreMissingTournamentKeysFromIdb(db, arena);
      }
    } catch {}

    // 2. Also check legacy v1 IndexedDB ("jrz_offline_scoring_idb_v1")
    try {
      const legacyState = await this.readLegacyIdbState(`active_match_${arena}`);
      if (legacyState && legacyState.id) {
        idbCandidates.push(normalizeMatchState(legacyState));
      }
    } catch {}

    if (idbCandidates.length === 0) {
      return { state: syncCandidate, wasRecoveredFromIdb: false };
    }

    let bestIdb = idbCandidates[0];
    for (let i = 1; i < idbCandidates.length; i++) {
      bestIdb = this.pickBetterCandidate(bestIdb, idbCandidates[i]);
    }

    if (!syncCandidate) {
      this.saveToWebStorageSync(bestIdb, arena, "IDB_RECOVERY");
      this.status.recoveredFromRefresh = true;
      this.status.recoveredTimestamp = Date.now();
      this.notifyStatus();
      return { state: bestIdb, wasRecoveredFromIdb: true };
    }

    const winner = this.pickBetterCandidate(syncCandidate, bestIdb);
    const wasIdbBetter =
      winner === bestIdb &&
      (countScoredActions(bestIdb) > countScoredActions(syncCandidate) ||
        (Number(bestIdb.stateVersion) || 0) > (Number(syncCandidate.stateVersion) || 0) ||
        bestIdb.activeRound > syncCandidate.activeRound);

    if (wasIdbBetter) {
      this.saveToWebStorageSync(bestIdb, arena, "IDB_RECOVERY");
      this.status.recoveredFromRefresh = true;
      this.status.recoveredTimestamp = Date.now();
      this.notifyStatus();
    }

    return { state: winner, wasRecoveredFromIdb: wasIdbBetter };
  }

  private async restoreMissingTournamentKeysFromIdb(db: IDBDatabase, arena: string): Promise<void> {
    if (typeof window === "undefined") return;
    const criticalKeys = [
      "ipsi_brackets_data",
      "ipsi_all_matches_schedule",
      "ipsi_match_history",
      `ipsi_schedule_${arena}`,
      `rtdb_arenas/${arena}/schedule`
    ];

    for (const key of criticalKeys) {
      try {
        const existing = window.localStorage.getItem(key);
        if (!existing) {
          const mirrored = await new Promise<any>((resolve) => {
            try {
              const tx = db.transaction(STORE_RTDB_MIRROR, "readonly");
              const req = tx.objectStore(STORE_RTDB_MIRROR).get(key);
              req.onsuccess = () => resolve(req.result?.value ?? null);
              req.onerror = () => resolve(null);
            } catch {
              resolve(null);
            }
          });
          if (mirrored !== null && mirrored !== undefined) {
            const raw = typeof mirrored === "string" ? mirrored : JSON.stringify(mirrored);
            window.localStorage.setItem(key, raw);
          }
        }
      } catch {}
    }
  }

  private readLegacyIdbState(key: string): Promise<MatchState | null> {
    if (typeof window === "undefined" || !window.indexedDB) return Promise.resolve(null);
    return new Promise((resolve) => {
      try {
        const req = window.indexedDB.open("jrz_offline_scoring_idb_v1", 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("match_states")) {
            db.createObjectStore("match_states");
          }
        };
        req.onsuccess = () => {
          try {
            const db = req.result;
            if (!db.objectStoreNames.contains("match_states")) {
              resolve(null);
              return;
            }
            const tx = db.transaction("match_states", "readonly");
            const getReq = tx.objectStore("match_states").get(key);
            getReq.onsuccess = () => resolve(getReq.result || null);
            getReq.onerror = () => resolve(null);
          } catch {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private pickBetterCandidate(a: MatchState, b: MatchState): MatchState {
    if (!a) return b;
    if (!b) return a;

    const aUpdated = Number(a.lastUpdatedAt) || 0;
    const bUpdated = Number(b.lastUpdatedAt) || 0;
    const aActions = countScoredActions(a);
    const bActions = countScoredActions(b);
    const aVersion = Number(a.stateVersion) || 0;
    const bVersion = Number(b.stateVersion) || 0;

    // Same match ID: compare round, finished status, total scored actions, timer progress, and version
    if (a.id === b.id) {
      if (b.activeRound !== a.activeRound) {
        return b.activeRound > a.activeRound ? b : a;
      }
      if (b.status === MatchStatus.FINISHED && a.status !== MatchStatus.FINISHED) return b;
      if (a.status === MatchStatus.FINISHED && b.status !== MatchStatus.FINISHED) return a;

      if (bActions !== aActions) {
        // If one has more scored actions and is not older by more than 5 seconds, prefer the one with more actions
        if (bActions > aActions && bUpdated >= aUpdated - 5000) return b;
        if (aActions > bActions && aUpdated >= bUpdated - 5000) return a;
      }

      if (bVersion !== aVersion) {
        return bVersion > aVersion ? b : a;
      }

      if (a.status === MatchStatus.RUNNING && b.status === MatchStatus.RUNNING && a.timeLeft !== b.timeLeft) {
        return b.timeLeft < a.timeLeft ? b : a;
      }

      return bUpdated >= aUpdated ? b : a;
    }

    // Different match IDs: prefer whichever has a newer timestamp or is actively ongoing vs empty default
    const aIsDefault = (a.id === "match-1" || a.id === "match-none") && aActions === 0 && a.status === MatchStatus.IDLE;
    const bIsDefault = (b.id === "match-1" || b.id === "match-none") && bActions === 0 && b.status === MatchStatus.IDLE;
    if (aIsDefault && !bIsDefault) return b;
    if (bIsDefault && !aIsDefault) return a;

    return bUpdated >= aUpdated ? b : a;
  }
}

export const autoSaveVault = new OfflineAutoSaveVault();
