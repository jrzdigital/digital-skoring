/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MatchState, MatchStatus, FighterColor, ActionType, MatchLog } from "../types";
import { normalizeMatchState } from "./defaultMatchState";
import { sound } from "./sound";
import { autoSaveVault } from "./offlineAutoSaveVault";

export interface JuryPressRecord {
  id: string;
  juryId: number;
  fighter: FighterColor;
  action: ActionType;
  timestamp: number;
  consumed: boolean;
}

// Generate unique client tab ID
export const CLIENT_TAB_ID = "tab_" + Math.random().toString(36).substring(2, 9);

const IDB_NAME = "jrz_offline_scoring_idb_v1";
const IDB_STORE = "match_states";

function saveStateToIndexedDB(key: string, state: MatchState) {
  if (typeof window === "undefined" || !window.indexedDB) return;
  try {
    const req = window.indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => {
      try {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(state, key);
      } catch {
        // ignore
      }
    };
  } catch {
    // ignore
  }
}

export function getTotalScoredActions(state: MatchState | null | undefined): number {
  if (!state) return 0;
  const redTech =
    (Number(state.redStats?.punches) || 0) +
    (Number(state.redStats?.kicks) || 0) +
    (Number(state.redStats?.drops) || 0) +
    (Number(state.redStats?.locks) || 0) +
    Math.abs(Number(state.redStats?.overrides) || 0);
  const blueTech =
    (Number(state.blueStats?.punches) || 0) +
    (Number(state.blueStats?.kicks) || 0) +
    (Number(state.blueStats?.drops) || 0) +
    (Number(state.blueStats?.locks) || 0) +
    Math.abs(Number(state.blueStats?.overrides) || 0);

  let penCount =
    (Number(state.redStats?.pastPenaltiesDeductions) || 0) +
    (Number(state.blueStats?.pastPenaltiesDeductions) || 0);

  const rp = state.redPenalties;
  if (rp) {
    if (rp.binaan1) penCount++;
    if (rp.binaan2) penCount++;
    if (rp.teguran1) penCount++;
    if (rp.teguran2) penCount++;
    if (rp.peringatan1) penCount++;
    if (rp.peringatan2) penCount++;
    if (rp.disqualified) penCount += 5;
  }
  const bp = state.bluePenalties;
  if (bp) {
    if (bp.binaan1) penCount++;
    if (bp.binaan2) penCount++;
    if (bp.teguran1) penCount++;
    if (bp.teguran2) penCount++;
    if (bp.peringatan1) penCount++;
    if (bp.peringatan2) penCount++;
    if (bp.disqualified) penCount += 5;
  }

  return redTech + blueTech + penCount;
}

class OfflineScoringEngine {
  private channel: BroadcastChannel | null = null;
  private juryPressHistory: JuryPressRecord[] = [];
  private stateListeners: ((state: MatchState, isFromRemote: boolean) => void)[] = [];

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel("ipsi_scoring_realtime_channel");
        this.channel.onmessage = (event) => {
          if (!event || !event.data) return;
          const { type, state, sourceId } = event.data;
          if (sourceId === CLIENT_TAB_ID) return; // ignore self

          if ((type === "STATE_UPDATE" || type === "JURY_PULSE") && state) {
            const normalized = normalizeMatchState(state);
            if (Array.isArray(normalized.juryPressHistory)) {
              this.mergeJuryPressHistory(normalized.juryPressHistory);
            }
            this.notifyListeners(normalized, true);
          }
        };
      } catch (err) {
        console.warn("BroadcastChannel initialization fallback:", err);
      }
    }

    // Fallback cross-tab sync using storage event
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (
          (e.key === "ipsi_match_state" ||
            e.key === "jrz_silat_match_state" ||
            (e.key && e.key.startsWith("jrz_silat_match_state_"))) &&
          e.newValue
        ) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed && parsed.id) {
              const normalized = normalizeMatchState(parsed);
              if (Array.isArray(normalized.juryPressHistory)) {
                this.mergeJuryPressHistory(normalized.juryPressHistory);
              }
              this.notifyListeners(normalized, true);
            }
          } catch {
            // Ignore parse error
          }
        }
      });
    }
  }

  private lastOfflinePressByJury: Record<string, number> = {};
  private lastConsensusScoreByCombo: Record<string, number> = {};
  private offlineAutoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleOfflineAutoAdvance(finishedMatchId: string) {
    if (this.offlineAutoAdvanceTimer) {
      clearTimeout(this.offlineAutoAdvanceTimer);
      this.offlineAutoAdvanceTimer = null;
    }
    this.offlineAutoAdvanceTimer = setTimeout(() => {
      try {
        const current = this.getState();
        if (current && current.status === MatchStatus.FINISHED && current.id === finishedMatchId) {
          this.processOfflineNextMatch(current);
        }
      } catch {
        // ignore
      }
    }, 10000);
  }

  private mergeJuryPressHistory(incoming: JuryPressRecord[], now = Date.now()): JuryPressRecord[] {
    const list: JuryPressRecord[] = [];
    const addRecord = (rec: JuryPressRecord) => {
      if (!rec || !rec.id || typeof rec.timestamp !== "number") return;
      if (now - rec.timestamp > 5000) return; // keep recent 5s window (including consumed records!)
      const existingIdx = list.findIndex(
        (item) =>
          item.id === rec.id ||
          (item.juryId === rec.juryId &&
            item.fighter === rec.fighter &&
            item.action === rec.action &&
            Math.abs(item.timestamp - rec.timestamp) <= 400)
      );
      if (existingIdx === -1) {
        list.push({ ...rec });
      } else {
        const existing = list[existingIdx];
        list[existingIdx] = {
          ...existing,
          ...rec,
          timestamp: Math.max(existing.timestamp, rec.timestamp),
          consumed: Boolean(existing.consumed || rec.consumed)
        };
      }
    };

    this.juryPressHistory.forEach(addRecord);

    if (typeof window !== "undefined") {
      try {
        const savedRaw = window.localStorage.getItem("ipsi_jury_press_history");
        if (savedRaw) {
          const parsed = JSON.parse(savedRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach(addRecord);
          }
        }
      } catch {
        // ignore
      }
    }

    (incoming || []).forEach(addRecord);

    const merged = list.sort((a, b) => a.timestamp - b.timestamp);
    this.juryPressHistory = merged;

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("ipsi_jury_press_history", JSON.stringify(merged));
      } catch {
        // ignore
      }
    }

    return merged;
  }

  public stampStateMutation(state: MatchState, prevState?: MatchState): MatchState {
    const now = Date.now();
    const prevTime = Number(prevState?.lastUpdatedAt || state.lastUpdatedAt) || 0;
    const prevVersion = Number(prevState?.stateVersion || state.stateVersion) || 0;
    state.lastUpdatedAt = Math.max(now, prevTime + 1);
    state.stateVersion = prevVersion + 1;
    return state;
  }

  public subscribe(listener: (state: MatchState, isFromRemote: boolean) => void) {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(state: MatchState, isFromRemote: boolean) {
    this.stateListeners.forEach((l) => {
      try {
        l(state, isFromRemote);
      } catch (e) {
        console.error("Error in state subscriber:", e);
      }
    });
  }

  public broadcast(state: MatchState, isPulse: boolean = false) {
    if (!state) return;
    if (!state.lastUpdatedAt) {
      state.lastUpdatedAt = Date.now();
    }
    if (!state.stateVersion) {
      state.stateVersion = 1;
    }

    // 1. Save to local storage, session storage & IndexedDB Auto-Save Vault for crash/refresh protection
    if (typeof window !== "undefined") {
      try {
        const arena = (state.arena || window.localStorage.getItem("ipsi_active_arena") || "A").toUpperCase();
        autoSaveVault.saveMatchState(
          state,
          arena,
          isPulse ? "JURY_PULSE" : "SCORING_UPDATE",
          !isPulse
        );
        saveStateToIndexedDB(`active_match_${arena}`, state);

        // Also broadcast on arena-specific channel
        try {
          const arenaChannel = new BroadcastChannel(`jrz_match_sync_${arena}`);
          arenaChannel.postMessage(state);
          arenaChannel.close();
        } catch {
          // ignore
        }
      } catch (e) {
        console.warn("Gagal simpan ke localStorage:", e);
      }
    }

    // 2. Broadcast across tabs instantly via BroadcastChannel (0-1ms latency)
    this.inMemoryState = state;
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: isPulse ? "JURY_PULSE" : "STATE_UPDATE",
          state,
          sourceId: CLIENT_TAB_ID,
          timestamp: Date.now()
        });
      } catch (e) {
        console.warn("Gagal broadcast via channel:", e);
      }
    }
  }

  private inMemoryState: MatchState | null = null;

  public setState(state: MatchState) {
    if (state) {
      this.inMemoryState = state;
    }
  }

  public getState(): MatchState | null {
    if (this.inMemoryState) {
      return this.inMemoryState;
    }
    if (typeof window !== "undefined") {
      try {
        const recovered = autoSaveVault.recoverSyncFromWebStorage();
        if (recovered) {
          this.inMemoryState = recovered;
          return recovered;
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  /**
   * Smart Conflict-Free State Reconciliation for Seamless Offline <-> Online Transitions
   * Guarantees that switching from Offline -> Online (or Weak -> Online) NEVER interrupts an ongoing match,
   * never rolls back offline-scored points/penalties, and never jumps the running countdown timer backwards.
   */
  public reconcileMatchStates(
    localState: MatchState | null | undefined,
    remoteState: MatchState | null | undefined,
    hasPendingOfflineChanges: boolean = false
  ): { merged: MatchState; localIsNewer: boolean } {
    if (!localState && !remoteState) {
      return { merged: normalizeMatchState(null), localIsNewer: false };
    }
    if (!localState) {
      return { merged: normalizeMatchState(remoteState), localIsNewer: false };
    }
    if (!remoteState) {
      return { merged: normalizeMatchState(localState), localIsNewer: true };
    }

    const local = normalizeMatchState(localState);
    const remote = normalizeMatchState(remoteState);
    const now = Date.now();

    const localUpdated = Number(local.lastUpdatedAt) || 0;
    const remoteUpdated = Number(remote.lastUpdatedAt) || 0;
    const localActions = getTotalScoredActions(local);
    const remoteActions = getTotalScoredActions(remote);

    // Merge activeJuryPresses from both states (keep newest non-expired press per jury 1, 2, 3)
    const mergedPresses: MatchState["activeJuryPresses"] = { 1: null, 2: null, 3: null };
    [1, 2, 3].forEach((jId) => {
      const lp = local.activeJuryPresses?.[jId];
      const rp = remote.activeJuryPresses?.[jId];
      const lpValid = lp && lp.pressedAt && now - lp.pressedAt <= 1600;
      const rpValid = rp && rp.pressedAt && now - rp.pressedAt <= 1600;
      if (lpValid && rpValid) {
        mergedPresses[jId] = lp!.pressedAt >= rp!.pressedAt ? lp! : rp!;
      } else if (lpValid) {
        mergedPresses[jId] = lp!;
      } else if (rpValid) {
        mergedPresses[jId] = rp!;
      } else {
        mergedPresses[jId] = null;
      }
    });

    // Merge juryPressHistory from both states
    const mergedHistory = this.mergeJuryPressHistory(
      [...(local.juryPressHistory || []), ...(remote.juryPressHistory || [])],
      now
    );

    // CASE 1: Different Match IDs
    if (local.id !== remote.id) {
      const isLocalOngoing =
        local.status === MatchStatus.RUNNING ||
        local.status === MatchStatus.PAUSED ||
        local.status === MatchStatus.ROUND_BREAK ||
        localActions > 0 ||
        local.timeLeft < (local.roundDuration || 120);

      const isRemoteDefaultEmpty =
        (remote.id === "match-1" || remote.id === "match-none") &&
        remoteActions === 0 &&
        remote.status === MatchStatus.IDLE &&
        remoteUpdated === 0;

      // Protect ongoing offline match from being overwritten by a stale/default cloud match on reconnect
      if (isLocalOngoing && (isRemoteDefaultEmpty || (hasPendingOfflineChanges && localUpdated >= remoteUpdated))) {
        const kept = {
          ...local,
          activeJuryPresses: mergedPresses,
          juryPressHistory: mergedHistory
        };
        return { merged: kept, localIsNewer: true };
      }

      if (localUpdated > 0 && remoteUpdated > 0 && localUpdated > remoteUpdated + 2000 && hasPendingOfflineChanges) {
        const kept = {
          ...local,
          activeJuryPresses: mergedPresses,
          juryPressHistory: mergedHistory
        };
        return { merged: kept, localIsNewer: true };
      }

      return {
        merged: {
          ...remote,
          activeJuryPresses: mergedPresses,
          juryPressHistory: mergedHistory
        },
        localIsNewer: false
      };
    }

    // CASE 2: Same Match ID (local.id === remote.id)
    // Check if remote is an explicit intentional match reset (new stateVersion and fresh IDLE at round 1)
    const isIntentionalRemoteReset =
      remote.status === MatchStatus.IDLE &&
      remote.activeRound === 1 &&
      remoteActions === 0 &&
      remote.timeLeft === (remote.roundDuration || 120) &&
      remoteUpdated > localUpdated + 1000 &&
      !hasPendingOfflineChanges;

    if (isIntentionalRemoteReset) {
      return {
        merged: {
          ...remote,
          activeJuryPresses: mergedPresses,
          juryPressHistory: mergedHistory
        },
        localIsNewer: false
      };
    }

    // 2. Same Match ID (local.id === remote.id):
    // Only prefer local state if we explicitly have pending offline changes while disconnected.
    // Otherwise, remote state from the live server is authoritative (preventing timer stops & panel re-locks).
    if (hasPendingOfflineChanges && localUpdated > remoteUpdated + 1500 && localActions >= remoteActions) {
      return {
        merged: {
          ...local,
          activeJuryPresses: mergedPresses,
          juryPressHistory: mergedHistory
        },
        localIsNewer: true
      };
    }

    // Otherwise, remote state is accepted, with smooth running timer protection so the clock never jumps backwards
    let reconciledTimeLeft = remote.timeLeft;
    if (local.status === MatchStatus.RUNNING && remote.status === MatchStatus.RUNNING) {
      const timeDiff = Math.abs(local.timeLeft - remote.timeLeft);
      if (timeDiff <= 1) {
        reconciledTimeLeft = local.timeLeft;
      }
    }

    const candidateMerged: MatchState = {
      ...remote,
      timeLeft: reconciledTimeLeft,
      activeJuryPresses: mergedPresses,
      juryPressHistory: mergedHistory
    };

    return {
      merged: candidateMerged,
      localIsNewer: false
    };
  }

  // Pure Client-Side Jury Consensus Evaluation (IPSI 2026 & PERSILAT: >= 2 Juries within max 2.0s / 2000ms)
  public evaluateAndApplyConsensus(
    state: MatchState,
    now = Date.now()
  ): { state: MatchState; scored: boolean } {
    if (!state || state.status !== MatchStatus.RUNNING) {
      return { state, scored: false };
    }

    const CONSENSUS_WINDOW_MS = 2000; // Toleransi waktu konsensus resmi: max 2 detik (2000 ms)
    let hasScored = false;

    if (!state.activeJuryPresses) {
      state.activeJuryPresses = { 1: null, 2: null, 3: null };
    }

    const history = this.mergeJuryPressHistory(state.juryPressHistory || [], now);

    // Synthesize unconsumed presses from activeJuryPresses ONLY if not already consumed, not in history, and not already in a counted consensus log
    [1, 2, 3].forEach((jId) => {
      const p = state.activeJuryPresses?.[jId] as any;
      if (p && !p.consumed && p.pressedAt && (now - p.pressedAt) <= CONSENSUS_WINDOW_MS) {
        const alreadyInHistory = history.some(
          (h) => h.juryId === jId && h.fighter === p.fighter && h.action === p.action && Math.abs(h.timestamp - p.pressedAt) <= 800
        );
        const alreadyInCountedLog = (state.logs || []).some(
          (l) =>
            !l.uncounted &&
            l.round === state.activeRound &&
            l.fighter === p.fighter &&
            l.type === p.action &&
            Math.abs(l.timestamp - p.pressedAt) <= CONSENSUS_WINDOW_MS &&
            l.juryIds?.includes(jId)
        );
        if (!alreadyInHistory && !alreadyInCountedLog) {
          history.push({
            id: `press_${jId}_${p.pressedAt}`,
            juryId: jId,
            fighter: p.fighter,
            action: p.action,
            timestamp: p.pressedAt,
            consumed: false
          });
        }
      }
    });

    const combos: { fighter: FighterColor; action: ActionType }[] = [
      { fighter: "RED", action: "PUNCH" },
      { fighter: "RED", action: "KICK" },
      { fighter: "BLUE", action: "PUNCH" },
      { fighter: "BLUE", action: "KICK" }
    ];

    for (const combo of combos) {
      const pointValue = combo.action === "PUNCH" ? 1 : 2;
      const comboKey = `${state.id}_${state.activeRound}_${combo.fighter}_${combo.action}`;

      // Check rapid 3rd jury join to an existing consensus log from within 2 seconds
      const recentConsensusLog = state.logs?.find(
        (log) =>
          !log.uncounted &&
          log.round === state.activeRound &&
          log.fighter === combo.fighter &&
          log.type === combo.action &&
          (now - log.timestamp) <= CONSENSUS_WINDOW_MS &&
          log.juryIds &&
          log.juryIds.length >= 2 &&
          log.juryIds.length < 3
      );

      if (recentConsensusLog && recentConsensusLog.juryIds) {
        const unconsumedThird = history.find(
          (p) =>
            !p.consumed &&
            p.fighter === combo.fighter &&
            p.action === combo.action &&
            (now - p.timestamp) <= CONSENSUS_WINDOW_MS &&
            !recentConsensusLog.juryIds!.includes(p.juryId)
        );

        if (unconsumedThird) {
          unconsumedThird.consumed = true;
          if (state.activeJuryPresses?.[unconsumedThird.juryId]) {
            (state.activeJuryPresses[unconsumedThird.juryId] as any).consumed = true;
          }
          recentConsensusLog.juryIds.push(unconsumedThird.juryId);
          recentConsensusLog.juryIds = Array.from(new Set(recentConsensusLog.juryIds)).sort();
          recentConsensusLog.source = `Konsensus Juri (J${recentConsensusLog.juryIds.join(", J")})`;
          recentConsensusLog.description = `NILAI MASUK: Juri ${recentConsensusLog.juryIds.join(" & ")} setuju +${pointValue} Poin ${combo.action === "PUNCH" ? "Pukulan" : "Tendangan"} ${combo.fighter === "RED" ? "Merah" : "Biru"}!`;

          if (!state.juryScores) state.juryScores = { 1: {}, 2: {}, 3: {} };
          if (!state.juryScores[unconsumedThird.juryId]) state.juryScores[unconsumedThird.juryId] = {};
          if (!state.juryScores[unconsumedThird.juryId][state.activeRound]) {
            state.juryScores[unconsumedThird.juryId][state.activeRound] = { red: 0, blue: 0 };
          }
          if (combo.fighter === "RED") {
            state.juryScores[unconsumedThird.juryId][state.activeRound].red += pointValue;
          } else {
            state.juryScores[unconsumedThird.juryId][state.activeRound].blue += pointValue;
          }
          hasScored = true;
        }
      }

      // Check for new consensus (>= 2 juries with distinct jury IDs within 2000ms of each other)
      const matching = history.filter(
        (p) => !p.consumed && p.fighter === combo.fighter && p.action === combo.action && (now - p.timestamp) <= CONSENSUS_WINDOW_MS
      );

      // Group by juryId (take latest press per jury)
      const byJury = new Map<number, JuryPressRecord>();
      matching.forEach((p) => {
        const cur = byJury.get(p.juryId);
        if (!cur || p.timestamp > cur.timestamp) {
          byJury.set(p.juryId, p);
        }
      });

      const distinct = Array.from(byJury.values());
      if (distinct.length >= 2) {
        const tList = distinct.map((p) => p.timestamp);
        const minT = Math.min(...tList);
        const maxT = Math.max(...tList);

        if (maxT - minT <= CONSENSUS_WINDOW_MS) {
          // Guard against duplicate consensus scoring within 550ms for the same combo (both in-memory and in state.logs)
          const lastScoredAt = this.lastConsensusScoreByCombo[comboKey] || 0;
          const alreadyLoggedRecently = (state.logs || []).some(
            (log) =>
              !log.uncounted &&
              log.round === state.activeRound &&
              log.fighter === combo.fighter &&
              log.type === combo.action &&
              Math.abs(now - log.timestamp) < 550
          );
          if (now - lastScoredAt < 550 || alreadyLoggedRecently) {
            matching.forEach((p) => {
              p.consumed = true;
              if (state.activeJuryPresses?.[p.juryId]) {
                (state.activeJuryPresses[p.juryId] as any).consumed = true;
              }
            });
            continue;
          }
          this.lastConsensusScoreByCombo[comboKey] = now;

          // Consensus achieved! (2 or 3 juries within <= 2.0s) — mark ALL matching unconsumed presses as consumed
          matching.forEach((p) => {
            p.consumed = true;
            if (state.activeJuryPresses?.[p.juryId]) {
              (state.activeJuryPresses[p.juryId] as any).consumed = true;
            }
          });
          const juryIdsInvolved = distinct.map((p) => p.juryId).sort();
          const pressIdsToRemove = matching.map((p) => p.id);

          state.logs = state.logs.filter((log) => {
            if (log.pressId && pressIdsToRemove.includes(log.pressId)) return false;
            if (
              log.uncounted &&
              log.round === state.activeRound &&
              log.fighter === combo.fighter &&
              log.type === combo.action &&
              (now - log.timestamp) <= CONSENSUS_WINDOW_MS &&
              juryIdsInvolved.some((jId) => log.source === `Juri ${jId}`)
            ) {
              return false;
            }
            return true;
          });

          if (combo.fighter === "RED") {
            if (combo.action === "PUNCH") state.redStats.punches++;
            else state.redStats.kicks++;
          } else {
            if (combo.action === "PUNCH") state.blueStats.punches++;
            else state.blueStats.kicks++;
          }
          this.recalculateScores(state);

          if (!state.juryScores) state.juryScores = { 1: {}, 2: {}, 3: {} };
          juryIdsInvolved.forEach((jId) => {
            if (!state.juryScores[jId]) state.juryScores[jId] = {};
            if (!state.juryScores[jId][state.activeRound]) {
              state.juryScores[jId][state.activeRound] = { red: 0, blue: 0 };
            }
            if (combo.fighter === "RED") {
              state.juryScores[jId][state.activeRound].red += pointValue;
            } else {
              state.juryScores[jId][state.activeRound].blue += pointValue;
            }
          });

          if (state.losingCornerColor === combo.fighter) {
            state.losingCornerNoScoreDuration = 0;
          }

          const logId = Math.random().toString(36).substring(7);
          state.logs.unshift({
            id: logId,
            timestamp: now,
            round: state.activeRound,
            fighter: combo.fighter,
            description: `NILAI MASUK: Juri ${juryIdsInvolved.join(" & ")} setuju +${pointValue} Poin ${combo.action === "PUNCH" ? "Pukulan" : "Tendangan"} ${combo.fighter === "RED" ? "Merah" : "Biru"} (Konsensus <=2 Detik)!`,
            points: pointValue,
            source: `Konsensus Juri (J${juryIdsInvolved.join(", J")})`,
            type: combo.action,
            uncounted: false,
            juryIds: juryIdsInvolved
          });

          this.recalculateScores(state);
          sound.playScore();
          hasScored = true;
        }
      }
    }

    // CRITICAL: Keep consumed records in juryPressHistory for 5000ms so they are NEVER re-synthesized from activeJuryPresses!
    state.juryPressHistory = history.filter((p) => (now - p.timestamp) <= 5000);
    this.juryPressHistory = [...state.juryPressHistory];

    return { state, scored: hasScored };
  }

  // Pure Client-Side Scoring Calculation (Peraturan Pertandingan PB IPSI 2026 & PERSILAT) for Offline & Hybrid Mode
  public processOfflineJuryPress(
    currentState: MatchState,
    juryId: number,
    fighter: FighterColor,
    action: ActionType
  ): MatchState {
    const now = Date.now();
    const debounceKey = `${juryId}_${fighter}_${action}`;
    const anyKey = `${juryId}_ANY`;
    if (now - (this.lastOfflinePressByJury[debounceKey] || 0) < 350) {
      return currentState;
    }
    if (now - (this.lastOfflinePressByJury[anyKey] || 0) < 200) {
      return currentState;
    }
    this.lastOfflinePressByJury[debounceKey] = now;
    this.lastOfflinePressByJury[anyKey] = now;

    const newState: MatchState = JSON.parse(JSON.stringify(currentState));
    const CONSENSUS_WINDOW_MS = 2000; // Toleransi waktu sinkronisasi konsensus juri: max 2 detik (2000 ms)

    // Set visual indicator on scoreboard
    if (!newState.activeJuryPresses) {
      newState.activeJuryPresses = { 1: null, 2: null, 3: null };
    }
    newState.activeJuryPresses[juryId] = {
      fighter,
      action,
      pressedAt: now,
      consumed: false
    } as any;

    // Schedule cleanup of visual indicator after 2 seconds in offline mode without bumping stateVersion
    setTimeout(() => {
      if (typeof window !== "undefined") {
        try {
          const current = this.getState();
          if (current?.activeJuryPresses?.[juryId]?.pressedAt === now) {
            current.activeJuryPresses[juryId] = null;
            this.notifyListeners(current, false);
          }
        } catch {
          // ignore
        }
      }
    }, 2000);

    if (newState.status !== MatchStatus.RUNNING) {
      // Test / standby press when match is not running
      const logId = Math.random().toString(36).substring(7);
      newState.logs.unshift({
        id: logId,
        timestamp: now,
        round: newState.activeRound,
        fighter,
        description: `UJI COBA GAWAI: Juri ${juryId} menekan ${action === "PUNCH" ? "Pukulan" : "Tendangan"} ${fighter === "RED" ? "Merah" : "Biru"} (Status: ${newState.status})`,
        points: action === "PUNCH" ? 1 : 2,
        source: `Juri ${juryId}`,
        type: action,
        uncounted: true
      });
      sound.playScore();
      this.stampStateMutation(newState, currentState);
      this.broadcast(newState);
      return newState;
    }

    // Merge shared juryPressHistory across tabs/devices/state
    const combinedHistory = this.mergeJuryPressHistory(newState.juryPressHistory || [], now);

    // Also synthesize any unconsumed presses from activeJuryPresses (<= 2000ms)
    [1, 2, 3].forEach((otherJuryId) => {
      if (otherJuryId === juryId) return;
      const activePress = newState.activeJuryPresses?.[otherJuryId] as any;
      if (
        activePress &&
        !activePress.consumed &&
        activePress.fighter === fighter &&
        activePress.action === action &&
        (now - activePress.pressedAt) <= CONSENSUS_WINDOW_MS
      ) {
        const alreadyInHistory = combinedHistory.some(
          (p) =>
            p.juryId === otherJuryId &&
            p.fighter === fighter &&
            p.action === action &&
            Math.abs(p.timestamp - activePress.pressedAt) <= 800
        );
        const alreadyInCountedLog = (newState.logs || []).some(
          (l) =>
            !l.uncounted &&
            l.round === newState.activeRound &&
            l.fighter === fighter &&
            l.type === action &&
            Math.abs(l.timestamp - activePress.pressedAt) <= CONSENSUS_WINDOW_MS &&
            l.juryIds?.includes(otherJuryId)
        );
        if (!alreadyInHistory && !alreadyInCountedLog) {
          combinedHistory.push({
            id: `synth_${otherJuryId}_${activePress.pressedAt}`,
            juryId: otherJuryId,
            fighter,
            action,
            timestamp: activePress.pressedAt,
            consumed: false
          });
        }
      }
    });

    const currentPressId = `press_${juryId}_${now}`;
    const currentPress: JuryPressRecord = {
      id: currentPressId,
      juryId,
      fighter,
      action,
      timestamp: now,
      consumed: false
    };
    combinedHistory.push(currentPress);
    newState.juryPressHistory = combinedHistory;

    // Run consensus evaluation with max 2 detik tolerance
    const { state: evaluatedState, scored } = this.evaluateAndApplyConsensus(newState, now);

    if (!scored) {
      // Lebih dari 2 detik atau baru 1 juri menekan: belum bertambah poin, tunggu konsensus juri lain (< 2 detik)
      const pointValue = action === "PUNCH" ? 1 : 2;
      const logId = Math.random().toString(36).substring(7);
      evaluatedState.logs.unshift({
        id: logId,
        timestamp: now,
        round: evaluatedState.activeRound,
        fighter,
        description: `PERCOBAAN POIN: Juri ${juryId} menekan ${action === "PUNCH" ? "Pukulan" : "Tendangan"} ${fighter === "RED" ? "Merah" : "Biru"} (Menunggu Konsensus <= 2 Detik)`,
        points: pointValue,
        source: `Juri ${juryId}`,
        type: action,
        uncounted: true,
        pressId: currentPressId
      });
    }

    evaluatedState.juryPressHistory = this.mergeJuryPressHistory(evaluatedState.juryPressHistory || [], now);
    this.stampStateMutation(evaluatedState, currentState);
    this.broadcast(evaluatedState);
    return evaluatedState;
  }

  // Pure Client-Side Jury Undo Handler (Works 100% Offline & Online)
  public processOfflineJuryUndo(
    currentState: MatchState,
    juryId: number,
    fighter?: FighterColor
  ): MatchState {
    const newState: MatchState = JSON.parse(JSON.stringify(currentState));
    const jId = Number(juryId);
    const r = newState.activeRound;
    const now = Date.now();

    const logIndex = (newState.logs || []).findIndex(
      (log) =>
        log.round === r &&
        (!fighter || log.fighter === fighter) &&
        (log.source === `Juri ${jId}` || (log.juryIds && log.juryIds.includes(jId)))
    );

    if (logIndex !== -1) {
      const log = newState.logs[logIndex];
      const targetFighter: FighterColor = log.fighter;
      const fLabel = targetFighter === "RED" ? "Merah" : "Biru";
      const pointValue = log.points;

      if (!log.uncounted && log.juryIds && log.juryIds.includes(jId)) {
        log.juryIds.forEach((id) => {
          if (newState.juryScores?.[id]?.[r]) {
            if (targetFighter === "RED") {
              newState.juryScores[id][r].red = Math.max(0, newState.juryScores[id][r].red - pointValue);
            } else {
              newState.juryScores[id][r].blue = Math.max(0, newState.juryScores[id][r].blue - pointValue);
            }
          }
        });

        if (targetFighter === "RED") {
          if (log.type === "PUNCH") {
            newState.redStats.punches = Math.max(0, (newState.redStats.punches || 0) - 1);
          } else {
            newState.redStats.kicks = Math.max(0, (newState.redStats.kicks || 0) - 1);
          }
        } else {
          if (log.type === "PUNCH") {
            newState.blueStats.punches = Math.max(0, (newState.blueStats.punches || 0) - 1);
          } else {
            newState.blueStats.kicks = Math.max(0, (newState.blueStats.kicks || 0) - 1);
          }
        }

        newState.logs.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: now,
          round: r,
          fighter: targetFighter,
          description: `BATAL POIN: Poin ${log.type === "PUNCH" ? "Pukulan" : "Tendangan"} ${fLabel} dibatalkan oleh Juri ${jId}.`,
          points: -pointValue,
          source: `Juri ${jId}`,
          type: "SYSTEM"
        });
      }

      const finalLogIndex = newState.logs.findIndex(
        (l, idx) => idx >= (!log.uncounted && log.juryIds && log.juryIds.includes(jId) ? 1 : 0) && l.id === log.id
      );
      if (finalLogIndex !== -1) {
        newState.logs.splice(finalLogIndex, 1);
      }

      this.recalculateScores(newState);
      this.stampStateMutation(newState, currentState);
      this.broadcast(newState);
    }

    return newState;
  }

  // WMP Point Threshold Getter (30 points for Remaja/Dewasa, 20 points for Usia Dini/Pra-Remaja)
  public getWmpPointThreshold(state?: Partial<MatchState> | null): 20 | 30 {
    if (!state) return 30;
    if (Number(state.wmpThreshold) === 20) return 20;
    if (Number(state.wmpThreshold) === 30) return 30;
    const combined = `${state.division || ""} ${state.classCategory || ""}`.toUpperCase();
    const isUsiaDiniOrPraRemaja =
      combined.includes("USIA DINI") ||
      combined.includes("USIADINI") ||
      combined.includes("PRA REMAJA") ||
      combined.includes("PRA-REMAJA") ||
      combined.includes("PRAREMAJA");
    return isUsiaDiniOrPraRemaja ? 20 : 30;
  }

  // Compile Jury Press Statistics for Match Recap & Archive
  public compileJuryPressStats(logs: MatchLog[]) {
    const stats = {
      juri1: { redPunch: 0, redKick: 0, bluePunch: 0, blueKick: 0, total: 0 },
      juri2: { redPunch: 0, redKick: 0, bluePunch: 0, blueKick: 0, total: 0 },
      juri3: { redPunch: 0, redKick: 0, bluePunch: 0, blueKick: 0, total: 0 },
      totalBluePunches: 0,
      totalBlueKicks: 0,
      totalRedPunches: 0,
      totalRedKicks: 0,
      totalPresses: 0
    };

    (logs || []).forEach((log) => {
      const juryList: number[] = [];
      if (!log.uncounted && log.juryIds && Array.isArray(log.juryIds)) {
        juryList.push(...log.juryIds);
      } else if (log.uncounted && log.source && log.source.startsWith("Juri ")) {
        const jNum = parseInt(log.source.replace("Juri ", ""), 10);
        if (!isNaN(jNum)) juryList.push(jNum);
      }

      juryList.forEach((jId) => {
        const target = jId === 1 ? stats.juri1 : jId === 2 ? stats.juri2 : jId === 3 ? stats.juri3 : null;
        if (!target) return;

        if (log.fighter === "BLUE") {
          if (log.type === "PUNCH") {
            target.bluePunch++;
            stats.totalBluePunches++;
          } else if (log.type === "KICK") {
            target.blueKick++;
            stats.totalBlueKicks++;
          }
        } else if (log.fighter === "RED") {
          if (log.type === "PUNCH") {
            target.redPunch++;
            stats.totalRedPunches++;
          } else if (log.type === "KICK") {
            target.redKick++;
            stats.totalRedKicks++;
          }
        }
        target.total++;
        stats.totalPresses++;
      });
    });

    return stats;
  }

  private normalizePartaiNum(val: any): string {
    if (val === undefined || val === null) return "";
    const str = String(val).trim();
    const digits = str.replace(/\D/g, "");
    if (digits.length > 0) return String(parseInt(digits, 10));
    return str.toUpperCase();
  }

  // Archive Finished Match to Cached Local Schedules & Archived Matches (for 100% offline schedule, bracket & history progression)
  public archiveFinishedMatchOffline(state: MatchState) {
    if (typeof window === "undefined" || !state) return;
    const determinedWinnerColor =
      state.winnerColor ||
      (state.redPenalties?.disqualified ? "BLUE" : state.bluePenalties?.disqualified ? "RED" : state.scoreRed > state.scoreBlue ? "RED" : state.scoreBlue > state.scoreRed ? "BLUE" : null);
    if (!determinedWinnerColor) return;

    try {
      const winSide = determinedWinnerColor === "RED" ? "MERAH" : "BIRU";
      const actualId = state.id.startsWith("match-") ? state.id.replace("match-", "") : state.id;
      const normPartai = this.normalizePartaiNum(state.matchNumber || "1");
      const compiledJuryStats = state.juryPressStats || this.compileJuryPressStats(state.logs);

      let schedules: any[] = [];
      try {
        const cachedRaw = window.localStorage.getItem("jrz_cached_schedules");
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (Array.isArray(parsed)) schedules = parsed;
        }
      } catch {}

      const currentIdx = schedules.findIndex(
        (m: any) =>
          m.id === actualId ||
          m.id === state.id ||
          (normPartai !== "" && this.normalizePartaiNum(m.matchNumber) === normPartai)
      );

      const archiveRecord: any = {
        id: currentIdx !== -1 ? schedules[currentIdx].id : (actualId || `m-${normPartai || Date.now()}`),
        matchNumber: state.matchNumber || (currentIdx !== -1 ? schedules[currentIdx].matchNumber : "1"),
        stage: state.stage || (currentIdx !== -1 ? schedules[currentIdx].stage : "PENYISIHAN"),
        classCategory: state.classCategory || (currentIdx !== -1 ? schedules[currentIdx].classCategory : "TANDING"),
        division: state.division || (currentIdx !== -1 ? schedules[currentIdx].division : "DEWASA"),
        gender: state.gender || (currentIdx !== -1 ? schedules[currentIdx].gender : "PUTRA"),
        arena: state.arena || (currentIdx !== -1 ? schedules[currentIdx].arena : "GELANGGANG A"),
        fighterRedName: state.fighterRedName || "PESILAT MERAH",
        fighterRedClub: state.fighterRedClub || "KONTINGEN MERAH",
        fighterBlueName: state.fighterBlueName || "PESILAT BIRU",
        fighterBlueClub: state.fighterBlueClub || "KONTINGEN BIRU",
        scoreRed: state.scoreRed ?? 0,
        scoreBlue: state.scoreBlue ?? 0,
        winner: winSide,
        winnerColor: determinedWinnerColor,
        winnerMethod: state.winnerMethod || "MENANG ANGKA / MUTLAK",
        status: "SELESAI",
        redStats: state.redStats ? { ...state.redStats } : undefined,
        blueStats: state.blueStats ? { ...state.blueStats } : undefined,
        redPenalties: state.redPenalties ? { ...state.redPenalties } : undefined,
        bluePenalties: state.bluePenalties ? { ...state.bluePenalties } : undefined,
        roundCount: state.roundCount || 3,
        roundDuration: state.roundDuration || 120,
        logs: Array.isArray(state.logs) ? [...state.logs] : [],
        juryPressStats: compiledJuryStats,
        completedAt: Date.now()
      };

      if (currentIdx !== -1) {
        schedules[currentIdx] = {
          ...schedules[currentIdx],
          ...archiveRecord,
          id: schedules[currentIdx].id,
          matchNumber: schedules[currentIdx].matchNumber || archiveRecord.matchNumber
        };

        const matchObj = schedules[currentIdx];
        const winId = winSide === "MERAH" ? matchObj.fighterRedId : matchObj.fighterBlueId;
        const winName =
          winSide === "MERAH"
            ? matchObj.fighterRedName || state.fighterRedName
            : matchObj.fighterBlueName || state.fighterBlueName;
        const winClub =
          winSide === "MERAH"
            ? matchObj.fighterRedClub || state.fighterRedClub
            : matchObj.fighterBlueClub || state.fighterBlueClub;

        if (winId) {
          const matchIdClean = String(matchObj.id || "").replace(/^match-/, "");
          const actualIdClean = String(actualId || "").replace(/^match-/, "");
          const matchKeys = new Set([
            `winner-${matchIdClean}`,
            `winner-${actualIdClean}`,
            `winner-${matchObj.id}`,
            `winner-${actualId}`,
            `winner-match-${matchIdClean}`,
            `winner-match-${actualIdClean}`
          ]);

          schedules.forEach((m: any) => {
            if (m.fighterRedId && matchKeys.has(m.fighterRedId)) {
              m.fighterRedId = winId;
              if (winName) m.fighterRedName = winName;
              if (winClub) m.fighterRedClub = winClub;
            }
            if (m.fighterBlueId && matchKeys.has(m.fighterBlueId)) {
              m.fighterBlueId = winId;
              if (winName) m.fighterBlueName = winName;
              if (winClub) m.fighterBlueClub = winClub;
            }
          });
        }
      } else {
        schedules.push(archiveRecord);
      }

      window.localStorage.setItem("jrz_cached_schedules", JSON.stringify(schedules));
      autoSaveVault.mirrorKeyToIndexedDB("jrz_cached_schedules", schedules);

      // Also persist into dedicated jrz_archived_matches list for Histori Hasil Tanding
      let archivedList: any[] = [];
      try {
        const rawArch = window.localStorage.getItem("jrz_archived_matches");
        if (rawArch) {
          const parsedArch = JSON.parse(rawArch);
          if (Array.isArray(parsedArch)) archivedList = parsedArch;
        }
      } catch {}

      const archIdx = archivedList.findIndex(
        (a: any) =>
          a.id === archiveRecord.id ||
          (normPartai !== "" && this.normalizePartaiNum(a.matchNumber) === normPartai)
      );
      if (archIdx !== -1) {
        archivedList[archIdx] = { ...archivedList[archIdx], ...archiveRecord };
      } else {
        archivedList.unshift(archiveRecord);
      }
      window.localStorage.setItem("jrz_archived_matches", JSON.stringify(archivedList));
      autoSaveVault.mirrorKeyToIndexedDB("jrz_archived_matches", archivedList);

      window.dispatchEvent(new Event("jrz_schedules_updated"));
      this.scheduleOfflineAutoAdvance(state.id);
    } catch {
      // ignore
    }
  }

  // Pure Client-Side 1-Second Timer Tick (Includes 30-point gap rule in Round 2, Jury Indicator Cleanup, Round End, & Tie-Breaker)
  public processOfflineTimerTick(currentState: MatchState): MatchState {
    if (!currentState || currentState.status !== MatchStatus.RUNNING || currentState.timeLeft <= 0) {
      return currentState;
    }

    const nextState: MatchState = JSON.parse(JSON.stringify(currentState));
    const now = Date.now();
    nextState.timeLeft = Math.max(0, nextState.timeLeft - 1);

    // Clean up expired visual jury press indicators (> 2000ms)
    if (nextState.activeJuryPresses) {
      [1, 2, 3].forEach((jId) => {
        const press = nextState.activeJuryPresses?.[jId];
        if (press && now - press.pressedAt > 2000) {
          nextState.activeJuryPresses[jId] = null;
        }
      });
    }

    // Evaluate jury consensus if any presses arrived across network snapshots
    this.evaluateAndApplyConsensus(nextState, now);

    // Check IPSI 2026 30-point gap rule in Round 2 for Remaja/Dewasa while time > 0
    if (nextState.timeLeft > 0) {
      const isRemajaOrDewasa =
        nextState.division?.toUpperCase() === "REMAJA" ||
        nextState.division?.toUpperCase() === "DEWASA" ||
        nextState.classCategory?.toUpperCase().includes("REMAJA") ||
        nextState.classCategory?.toUpperCase().includes("DEWASA");

      if (nextState.activeRound === 2 && isRemajaOrDewasa) {
        const scoreDiff = Math.abs(nextState.scoreRed - nextState.scoreBlue);
        if (scoreDiff >= 30) {
          const currentLosingColor = nextState.scoreRed > nextState.scoreBlue ? "BLUE" : "RED";
          const currentLosingScore = currentLosingColor === "BLUE" ? nextState.scoreBlue : nextState.scoreRed;

          if (nextState.losingCornerColor === currentLosingColor) {
            if (currentLosingScore > (nextState.lastLosingScore ?? currentLosingScore)) {
              nextState.losingCornerNoScoreDuration = 0;
              nextState.lastLosingScore = currentLosingScore;
            } else {
              nextState.losingCornerNoScoreDuration = (nextState.losingCornerNoScoreDuration || 0) + 1;
              nextState.lastLosingScore = currentLosingScore;
            }
          } else {
            nextState.losingCornerColor = currentLosingColor;
            nextState.lastLosingScore = currentLosingScore;
            nextState.losingCornerNoScoreDuration = 0;
          }

          if ((nextState.losingCornerNoScoreDuration || 0) >= 60) {
            const winnerColor = currentLosingColor === "BLUE" ? "RED" : "BLUE";
            const winnerName = winnerColor === "RED" ? nextState.fighterRedName : nextState.fighterBlueName;

            nextState.status = MatchStatus.FINISHED;
            nextState.winnerColor = winnerColor;
            nextState.winnerMethod = "MENANG MUTLAK (SELISIH 30 POIN & 1 MENIT TANPA BALASAN)";
            nextState.winnerPublished = true;
            nextState.dewanPanelLocked = true;
            nextState.juryPanelLocked = true;
            nextState.juryPressStats = this.compileJuryPressStats(nextState.logs);

            nextState.logs.unshift({
              id: Math.random().toString(36).substring(7),
              timestamp: now,
              round: nextState.activeRound,
              fighter: winnerColor,
              description: `KEMENANGAN MUTLAK! ${winnerName} menang karena selisih skor >= 30 poin di babak kedua dan selama 1 menit tidak ada penambahan nilai dari sudut ${currentLosingColor === "BLUE" ? "Biru" : "Merah"}.`,
              points: 0,
              source: "Sistem",
              type: "SYSTEM"
            });

            sound.playBuzzer();
            this.archiveFinishedMatchOffline(nextState);
            this.stampStateMutation(nextState, currentState);
            this.broadcast(nextState);
            return nextState;
          }
        } else {
          nextState.losingCornerColor = null;
          nextState.lastLosingScore = undefined;
          nextState.losingCornerNoScoreDuration = 0;
        }
      } else {
        nextState.losingCornerColor = null;
        nextState.lastLosingScore = undefined;
        nextState.losingCornerNoScoreDuration = 0;
      }

      this.stampStateMutation(nextState, currentState);
      this.broadcast(nextState, true);
      return nextState;
    }

    // Time reached 00:00 -> Round End or Match Finish!
    sound.playBuzzer();
    const roundCount = nextState.roundCount || 3;
    const isFinalRound = nextState.activeRound >= roundCount;

    if (!isFinalRound) {
      nextState.timeLeft = 0;
      nextState.status = MatchStatus.PAUSED;
      nextState.showRoundOverPopup = true;
      nextState.secretarySignalNextRound = true;
      nextState.dewanPanelLocked = true;
      this.endRoundPenalties(nextState);
      this.recalculateScores(nextState);

      nextState.logs = [
        {
          id: "round-over-" + now,
          timestamp: now,
          round: currentState.activeRound,
          fighter: "RED",
          description: `Waktu Babak ${currentState.activeRound} Selesai (00:00). Jeda Antar Babak aktif.`,
          points: 0,
          source: "Sistem",
          type: "SYSTEM"
        },
        ...(nextState.logs || [])
      ];

      this.stampStateMutation(nextState, currentState);
      this.broadcast(nextState);
      return nextState;
    } else {
      nextState.timeLeft = 0;
      nextState.status = MatchStatus.FINISHED;
      nextState.showRoundOverPopup = false;
      nextState.secretarySignalNextRound = false;
      nextState.dewanPanelLocked = true;
      nextState.juryPanelLocked = true;
      this.recalculateScores(nextState);

      const winnerResult = this.determineMatchTieBreaker(nextState);
      if (winnerResult.tieExtended) {
        nextState.isTieExtendedPossible = true;
        nextState.winnerColor = null;
        nextState.winnerMethod = "DRAW / SERI (POIN AKHIR SAMA)";
      } else {
        nextState.isTieExtendedPossible = false;
        nextState.winnerColor = winnerResult.winner;
        nextState.winnerMethod = winnerResult.method;
      }
      nextState.winnerPublished = !winnerResult.tieExtended;
      nextState.juryPressStats = this.compileJuryPressStats(nextState.logs);

      const winFighterName =
        winnerResult.winner === "RED" ? nextState.fighterRedName : nextState.fighterBlueName;

      nextState.logs = [
        {
          id: "match-finish-" + now,
          timestamp: now,
          round: currentState.activeRound,
          fighter: (winnerResult.winner as FighterColor) || "RED",
          description: winnerResult.tieExtended
            ? "PERTANDINGAN SELESAI SEMENTARA! Hasil Seri di Akhir Babak 3. Memerlukan Babak Tambahan."
            : `PERTANDINGAN SELESAI! PEMENANG RESMI: ${winFighterName} (${winnerResult.method})`,
          points: 0,
          source: "Sistem Keputusan",
          type: "SYSTEM"
        },
        ...(nextState.logs || [])
      ];

      if (!winnerResult.tieExtended) {
        this.archiveFinishedMatchOffline(nextState);
      }
      this.stampStateMutation(nextState, currentState);
      this.broadcast(nextState);
      return nextState;
    }
  }

  // Recalculates total score for both fighters based on stats and penalties under Peraturan Pertandingan PB IPSI 2026 & PERSILAT
  public recalculateScores(state: MatchState) {
    const redPositive =
      (state.redStats?.punches || 0) * 1 +
      (state.redStats?.kicks || 0) * 2 +
      (state.redStats?.drops || 0) * 3 +
      (state.redStats?.locks || 0) * 3 +
      (state.redStats?.overrides || 0);

    let redPenaltyDeductions = state.redStats?.pastPenaltiesDeductions || 0;
    if (state.redPenalties?.teguran1) redPenaltyDeductions += 1;
    if (state.redPenalties?.teguran2) redPenaltyDeductions += 2;
    if (state.redPenalties?.peringatan1) redPenaltyDeductions += 5;
    if (state.redPenalties?.peringatan2) redPenaltyDeductions += 10;

    if (!state.redStats) {
      state.redStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
    }
    state.redStats.warnings = redPenaltyDeductions;
    state.scoreRed = redPositive - redPenaltyDeductions;

    const bluePositive =
      (state.blueStats?.punches || 0) * 1 +
      (state.blueStats?.kicks || 0) * 2 +
      (state.blueStats?.drops || 0) * 3 +
      (state.blueStats?.locks || 0) * 3 +
      (state.blueStats?.overrides || 0);

    let bluePenaltyDeductions = state.blueStats?.pastPenaltiesDeductions || 0;
    if (state.bluePenalties?.teguran1) bluePenaltyDeductions += 1;
    if (state.bluePenalties?.teguran2) bluePenaltyDeductions += 2;
    if (state.bluePenalties?.peringatan1) bluePenaltyDeductions += 5;
    if (state.bluePenalties?.peringatan2) bluePenaltyDeductions += 10;

    if (!state.blueStats) {
      state.blueStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
    }
    state.blueStats.warnings = bluePenaltyDeductions;
    state.scoreBlue = bluePositive - bluePenaltyDeductions;
  }

  // Resets round-specific infractions and archives teguran deductions into pastPenaltiesDeductions
  public endRoundPenalties(state: MatchState) {
    if (!state.redStats) state.redStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
    if (!state.blueStats) state.blueStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
    if (!state.redPenalties) state.redPenalties = { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false };
    if (!state.bluePenalties) state.bluePenalties = { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false };

    const redRoundDeduction = (state.redPenalties.teguran1 ? 1 : 0) + (state.redPenalties.teguran2 ? 2 : 0);
    const blueRoundDeduction = (state.bluePenalties.teguran1 ? 1 : 0) + (state.bluePenalties.teguran2 ? 2 : 0);

    state.redStats.pastPenaltiesDeductions = (state.redStats.pastPenaltiesDeductions || 0) + redRoundDeduction;
    state.blueStats.pastPenaltiesDeductions = (state.blueStats.pastPenaltiesDeductions || 0) + blueRoundDeduction;

    state.redPenalties.binaan1 = false;
    state.redPenalties.binaan2 = false;
    state.redPenalties.teguran1 = false;
    state.redPenalties.teguran2 = false;

    state.bluePenalties.binaan1 = false;
    state.bluePenalties.binaan2 = false;
    state.bluePenalties.teguran1 = false;
    state.bluePenalties.teguran2 = false;
  }

  // Evaluates official PB IPSI 2026 & PERSILAT tie-breaking hierarchy to determine official match winner
  public determineMatchTieBreaker(state: MatchState): { winner: "RED" | "BLUE"; method: string; tieExtended: boolean } {
    // 1. Disqualification check
    if (state.redPenalties?.disqualified && !state.bluePenalties?.disqualified) {
      return { winner: "BLUE", method: "DISKUALIFIKASI LAWAN (SUDUT MERAH)", tieExtended: false };
    }
    if (state.bluePenalties?.disqualified && !state.redPenalties?.disqualified) {
      return { winner: "RED", method: "DISKUALIFIKASI LAWAN (SUDUT BIRU)", tieExtended: false };
    }

    this.recalculateScores(state);

    // 2. Score advantage
    if (state.scoreRed > state.scoreBlue) {
      return { winner: "RED", method: "KEUNGGULAN SKOR (MENANG ANGKA)", tieExtended: false };
    }
    if (state.scoreBlue > state.scoreRed) {
      return { winner: "BLUE", method: "KEUNGGULAN SKOR (MENANG ANGKA)", tieExtended: false };
    }

    // 3. Draw: Fewest penalty points
    let redPenPoints = 0;
    if (state.redPenalties?.teguran1) redPenPoints += 1;
    if (state.redPenalties?.teguran2) redPenPoints += 2;
    if (state.redPenalties?.peringatan1) redPenPoints += 5;
    if (state.redPenalties?.peringatan2) redPenPoints += 10;
    redPenPoints += state.redStats?.pastPenaltiesDeductions || 0;

    let bluePenPoints = 0;
    if (state.bluePenalties?.teguran1) bluePenPoints += 1;
    if (state.bluePenalties?.teguran2) bluePenPoints += 2;
    if (state.bluePenalties?.peringatan1) bluePenPoints += 5;
    if (state.bluePenalties?.peringatan2) bluePenPoints += 10;
    bluePenPoints += state.blueStats?.pastPenaltiesDeductions || 0;

    if (redPenPoints < bluePenPoints) {
      return { winner: "RED", method: "NILAI SERI - LEBIH SEDIKIT HUKUMAN (PENALTI)", tieExtended: false };
    }
    if (bluePenPoints < redPenPoints) {
      return { winner: "BLUE", method: "NILAI SERI - LEBIH SEDIKIT HUKUMAN (PENALTI)", tieExtended: false };
    }

    // 4. Teknik Prestasi: Jatuhan (3) + Kuncian (3)
    const red3 = (state.redStats?.drops || 0) + (state.redStats?.locks || 0);
    const blue3 = (state.blueStats?.drops || 0) + (state.blueStats?.locks || 0);
    if (red3 !== blue3) {
      return {
        winner: red3 > blue3 ? "RED" : "BLUE",
        method: "NILAI SERI & HUKUMAN SAMA - PRESTASI TEKNIK JATUHAN/KUNCIAN DOMINAN",
        tieExtended: false
      };
    }

    // 5. Teknik Prestasi: Tendangan (2)
    const red2 = state.redStats?.kicks || 0;
    const blue2 = state.blueStats?.kicks || 0;
    if (red2 !== blue2) {
      return {
        winner: red2 > blue2 ? "RED" : "BLUE",
        method: "NILAI SERI & HUKUMAN SAMA - PRESTASI TEKNIK TENDANGAN DOMINAN",
        tieExtended: false
      };
    }

    // 6. Teknik Prestasi: Pukulan (1)
    const red1 = state.redStats?.punches || 0;
    const blue1 = state.blueStats?.punches || 0;
    if (red1 !== blue1) {
      return {
        winner: red1 > blue1 ? "RED" : "BLUE",
        method: "NILAI SERI & HUKUMAN SAMA - PRESTASI TEKNIK PUKULAN DOMINAN",
        tieExtended: false
      };
    }

    // 7. Babak Tambahan (Overtime jika belum babak 4)
    if ((state.activeRound || 3) < 4) {
      return { winner: "RED", method: "TIE_EXTENSION", tieExtended: true };
    }

    // 8. Undian Lotere (Jika babak 4 tetap seri)
    const lotere = Math.random() < 0.5 ? "RED" : "BLUE";
    return {
      winner: lotere,
      method: "NILAI SERI SEMPURNA DI BABAK 4 - KEPUTUSAN UNDIAN (LOTERE) RESMI",
      tieExtended: false
    };
  }

  // Offline Dewan Action Handler
  public processOfflineDewanAction(
    currentState: MatchState,
    actionData: {
      command: "DROP" | "LOCK" | "PENALTY" | "OVERRIDE" | "CANCEL_DROP" | "RESET_ROUND_PENALTIES" | "DECLARE_VICTORY";
      fighter: "RED" | "BLUE";
      penaltyType?: string;
      overridePoints?: number;
    }
  ): MatchState {
    const newState: MatchState = JSON.parse(JSON.stringify(currentState));
    const now = Date.now();
    const { command, fighter, penaltyType, overridePoints } = actionData;
    const fLabel = fighter === "RED" ? "MERAH" : "BIRU";

    if (command === "DROP") {
      if (fighter === "RED") {
        newState.redStats.drops = (newState.redStats.drops || 0) + 1;
      } else {
        newState.blueStats.drops = (newState.blueStats.drops || 0) + 1;
      }
      if (newState.losingCornerColor === fighter) {
        newState.losingCornerNoScoreDuration = 0;
      }
      newState.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: newState.activeRound,
        fighter,
        description: `JATUHAN SAH (+3 Poin) untuk sudut ${fLabel} disahkan oleh Dewan.`,
        points: 3,
        source: "Dewan Pertandingan",
        type: "DROP"
      });
      sound.playGong();
    } else if (command === "CANCEL_DROP") {
      let cancelled = false;
      if (fighter === "RED" && (newState.redStats.drops || 0) > 0) {
        newState.redStats.drops--;
        cancelled = true;
      } else if (fighter === "BLUE" && (newState.blueStats.drops || 0) > 0) {
        newState.blueStats.drops--;
        cancelled = true;
      }
      if (cancelled) {
        newState.logs.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: now,
          round: newState.activeRound,
          fighter,
          description: `BATAL JATUHAN (-3 Poin) untuk sudut ${fLabel} oleh Dewan.`,
          points: -3,
          source: "Dewan Pertandingan",
          type: "DROP"
        });
      }
    } else if (command === "LOCK") {
      if (fighter === "RED") {
        newState.redStats.locks = (newState.redStats.locks || 0) + 1;
      } else {
        newState.blueStats.locks = (newState.blueStats.locks || 0) + 1;
      }
      if (newState.losingCornerColor === fighter) {
        newState.losingCornerNoScoreDuration = 0;
      }
      newState.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: newState.activeRound,
        fighter,
        description: `KUNCIAN SAH (+3 Poin) untuk sudut ${fLabel} disahkan oleh Dewan.`,
        points: 3,
        source: "Dewan Pertandingan",
        type: "LOCK"
      });
      sound.playGong();
    } else if (command === "OVERRIDE" && typeof overridePoints === "number") {
      if (fighter === "RED") {
        newState.redStats.overrides = (newState.redStats.overrides || 0) + overridePoints;
      } else {
        newState.blueStats.overrides = (newState.blueStats.overrides || 0) + overridePoints;
      }
      newState.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: newState.activeRound,
        fighter,
        description: `KOREKSI NILAI DEWAN (${overridePoints >= 0 ? "+" : ""}${overridePoints} Poin) sudut ${fLabel}.`,
        points: overridePoints,
        source: "Dewan Pertandingan",
        type: "SYSTEM"
      });
    } else if (command === "PENALTY" && penaltyType) {
      const penTarget = fighter === "RED" ? newState.redPenalties : newState.bluePenalties;
      const cleanType = penaltyType.toLowerCase().replace(/[^a-z0-9]/g, "");
      let penaltyLabel = penaltyType;
      let pointsDeduction = 0;

      if (cleanType === "binaan1") {
        penTarget.binaan1 = !penTarget.binaan1;
        penaltyLabel = "Binaan 1";
      } else if (cleanType === "binaan2") {
        penTarget.binaan2 = !penTarget.binaan2;
        penaltyLabel = "Binaan 2";
      } else if (cleanType === "teguran1") {
        penTarget.teguran1 = !penTarget.teguran1;
        pointsDeduction = penTarget.teguran1 ? -1 : 0;
        penaltyLabel = "Teguran 1 (-1 Poin)";
      } else if (cleanType === "teguran2") {
        penTarget.teguran2 = !penTarget.teguran2;
        pointsDeduction = penTarget.teguran2 ? -2 : 0;
        penaltyLabel = "Teguran 2 (-2 Poin)";
      } else if (cleanType === "peringatan1") {
        penTarget.peringatan1 = !penTarget.peringatan1;
        pointsDeduction = penTarget.peringatan1 ? -5 : 0;
        penaltyLabel = "Peringatan 1 (-5 Poin)";
      } else if (cleanType === "peringatan2") {
        penTarget.peringatan2 = !penTarget.peringatan2;
        pointsDeduction = penTarget.peringatan2 ? -10 : 0;
        penaltyLabel = "Peringatan 2 (-10 Poin)";
      } else if (cleanType === "disqualified" || cleanType === "diskualifikasi") {
        penTarget.disqualified = !penTarget.disqualified;
        penaltyLabel = "Diskualifikasi";
        if (penTarget.disqualified) {
          newState.status = MatchStatus.FINISHED;
          newState.winnerPublished = true;
          newState.winnerColor = fighter === "RED" ? "BLUE" : "RED";
          newState.winnerMethod = "DISKUALIFIKASI";
          this.archiveFinishedMatchOffline(newState);
        }
      }

      const isActive =
        cleanType === "disqualified" || cleanType === "diskualifikasi"
          ? penTarget.disqualified
          : (penTarget as any)[cleanType];

      newState.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: newState.activeRound,
        fighter,
        description: `HUKUMAN: ${penaltyLabel} ${isActive ? "DIBERIKAN" : "DIBATALKAN"} untuk sudut ${fLabel}!`,
        points: pointsDeduction,
        source: "Dewan Pertandingan",
        type: "PENALTY"
      });
      sound.playBuzzer();
    } else if (command === "DECLARE_VICTORY") {
      const fWinnerName = fighter === "RED" ? newState.fighterRedName : newState.fighterBlueName;
      newState.status = MatchStatus.FINISHED;
      newState.winnerPublished = true;
      newState.winnerColor = fighter;
      newState.winnerMethod = penaltyType || "MENANG MUTLAK";
      newState.dewanPanelLocked = true;
      newState.juryPanelLocked = true;
      newState.juryPressStats = this.compileJuryPressStats(newState.logs);

      newState.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: newState.activeRound,
        fighter: fighter,
        description: `PERTANDINGAN SELESAI! PEMENANG RESMI: ${fWinnerName || "PESILAT"} Sudut ${fLabel} (${newState.winnerMethod})`,
        points: 0,
        source: "Dewan Pertandingan",
        type: "SYSTEM"
      });
      this.archiveFinishedMatchOffline(newState);
      sound.playGong();
    } else if (command === "RESET_ROUND_PENALTIES") {
      this.endRoundPenalties(newState);
      newState.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: newState.activeRound,
        fighter: "RED",
        description: `HUKUMAN DIARSIPKAN (IPSI 2026): Teguran babak ini diarsipkan ke akumulasi pengurangan poin.`,
        points: 0,
        source: "Sekretaris Pertandingan",
        type: "SYSTEM"
      });
      sound.playBuzzer();
    }

    this.recalculateScores(newState);
    this.stampStateMutation(newState, currentState);
    this.broadcast(newState);
    return newState;
  }

  // Offline Timer Command Handler
  public processOfflineTimerCommand(
    currentState: MatchState,
    command: "START" | "PAUSE" | "ADD_10" | "SUB_10" | "RESET"
  ): MatchState {
    const newState: MatchState = JSON.parse(JSON.stringify(currentState));

    if (command === "START") {
      if (!newState.timeLeft || newState.timeLeft <= 0) {
        newState.timeLeft = newState.roundDuration || 120;
      }
      newState.status = MatchStatus.RUNNING;
      newState.showNextMatchPopup = false;
      newState.showRoundOverPopup = false;
      newState.juryPanelLocked = false;
      newState.dewanPanelLocked = false;
      newState.winnerPublished = false;
      newState.winnerColor = null;
      newState.winnerMethod = undefined;
      newState.isTieExtendedPossible = false;
      if (newState.redPenalties) newState.redPenalties.disqualified = false;
      if (newState.bluePenalties) newState.bluePenalties.disqualified = false;
      sound.playGong();
    } else if (command === "PAUSE") {
      newState.status = MatchStatus.PAUSED;
      sound.playBuzzer();
    } else if (command === "ADD_10") {
      newState.timeLeft = Math.min(newState.roundDuration || 120, (newState.timeLeft || 0) + 10);
    } else if (command === "SUB_10") {
      newState.timeLeft = Math.max(0, (newState.timeLeft || 0) - 10);
    } else if (command === "RESET") {
      newState.status = MatchStatus.IDLE;
      newState.timeLeft = newState.roundDuration || 120;
      newState.showRoundOverPopup = false;
      newState.showNextMatchPopup = true;
      newState.winnerPublished = false;
      newState.winnerColor = null;
      newState.winnerMethod = undefined;
      newState.isTieExtendedPossible = false;
    }

    this.stampStateMutation(newState, currentState);
    this.broadcast(newState);
    return newState;
  }

  // Offline Advance to Next Match
  public processOfflineNextMatch(currentState: MatchState, nextData?: Partial<MatchState>): MatchState {
    if (this.offlineAutoAdvanceTimer) {
      clearTimeout(this.offlineAutoAdvanceTimer);
      this.offlineAutoAdvanceTimer = null;
    }
    // Archive current finished match first before advancing
    this.archiveFinishedMatchOffline(currentState);
    if (this.offlineAutoAdvanceTimer) {
      clearTimeout(this.offlineAutoAdvanceTimer);
      this.offlineAutoAdvanceTimer = null;
    }

    const curMatchNumStr = String(currentState.matchNumber || "1");
    const numMatch = curMatchNumStr.match(/\d+/);
    const curNum = numMatch ? parseInt(numMatch[0], 10) : 1;
    const nextNum = curNum + 1;
    const nextPartaiLabel = String(nextNum);

    let autoFighterRed = nextData?.fighterRedName;
    let autoFighterBlue = nextData?.fighterBlueName;
    let autoClubRed = nextData?.fighterRedClub;
    let autoClubBlue = nextData?.fighterBlueClub;
    let autoCategory = nextData?.classCategory;
    let autoStage = nextData?.stage;
    let autoGender = nextData?.gender;
    let autoMatchId = nextData?.id;
    let autoMatchNumber = nextData?.matchNumber || nextPartaiLabel;

    if (typeof window !== "undefined") {
      try {
        const cachedRaw = localStorage.getItem("jrz_cached_schedules");
        const cachedPRaw = localStorage.getItem("jrz_cached_participants");
        const participantsList = cachedPRaw ? JSON.parse(cachedPRaw) : [];
        const findParticipant = (id?: string) =>
          Array.isArray(participantsList) && id ? participantsList.find((p: any) => p.id === id) : null;

        if (cachedRaw) {
          const schedules = JSON.parse(cachedRaw);
          if (Array.isArray(schedules) && schedules.length > 0) {
            const normCur = this.normalizePartaiNum(currentState.matchNumber);
            const currentIdx = schedules.findIndex(
              (s) =>
                (normCur !== "" && this.normalizePartaiNum(s.matchNumber) === normCur) ||
                s.id === currentState.id ||
                "match-" + s.id === currentState.id
            );
            const nextScheduled =
              schedules.find((s, idx) => idx > currentIdx && s.status !== "SELESAI") ||
              schedules.find((s) => this.normalizePartaiNum(s.matchNumber) === String(nextNum) && s.status !== "SELESAI") ||
              schedules.find((s) => s.status === "BELUM");

            if (nextScheduled) {
              const pRed = findParticipant(nextScheduled.fighterRedId);
              const pBlue = findParticipant(nextScheduled.fighterBlueId);
              autoMatchId = "match-" + (nextScheduled.id || nextNum);
              autoMatchNumber = String(nextScheduled.matchNumber || nextNum);
              autoFighterRed = autoFighterRed || nextScheduled.fighterRedName || pRed?.name;
              autoFighterBlue = autoFighterBlue || nextScheduled.fighterBlueName || pBlue?.name;
              autoClubRed = autoClubRed || nextScheduled.fighterRedClub || pRed?.club || pRed?.contingent;
              autoClubBlue = autoClubBlue || nextScheduled.fighterBlueClub || pBlue?.club || pBlue?.contingent;
              autoCategory = autoCategory || nextScheduled.classCategory || nextScheduled.categoryName;
              autoStage = autoStage || nextScheduled.stage;
              autoGender = autoGender || nextScheduled.gender;
            }
          }
        }
      } catch {
        // ignore cached schedule parse error
      }
    }

    const newState: MatchState = {
      ...currentState,
      ...nextData,
      id: autoMatchId || `match-${nextNum}-${Date.now()}`,
      matchNumber: autoMatchNumber,
      stage: autoStage || currentState.stage || "PENYISIHAN",
      gender: autoGender || currentState.gender || "PUTRA",
      fighterRedName: autoFighterRed || "PESILAT MERAH",
      fighterBlueName: autoFighterBlue || "PESILAT BIRU",
      fighterRedClub: autoClubRed || "KONTINGEN MERAH",
      fighterBlueClub: autoClubBlue || "KONTINGEN BIRU",
      classCategory: autoCategory || currentState.classCategory || "TANDING KELAS A PUTRA",
      status: MatchStatus.IDLE,
      roundCount: nextData?.roundCount || 3,
      activeRound: 1,
      timeLeft: nextData?.roundDuration || currentState.roundDuration || 120,
      scoreRed: 0,
      scoreBlue: 0,
      redStats: { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 },
      blueStats: { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 },
      redPenalties: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false },
      bluePenalties: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false },
      activeJuryPresses: { 1: null, 2: null, 3: null },
      juryPressHistory: [],
      juryScores: {
        1: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } },
        2: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } },
        3: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } }
      },
      verification: undefined,
      showRoundOverPopup: false,
      showNextMatchPopup: true,
      secretarySignalNextRound: false,
      juryPanelLocked: true,
      dewanPanelLocked: true,
      winnerPublished: false,
      winnerColor: null,
      winnerMethod: undefined,
      isTieExtendedPossible: false,
      losingCornerNoScoreDuration: 0,
      losingCornerColor: null,
      lastLosingScore: undefined,
      logs: [
        {
          id: "next-" + Date.now(),
          timestamp: Date.now(),
          round: 1,
          fighter: "RED",
          description: `OTOMATIS BERALIH: ${autoMatchNumber} (${autoCategory || "Tanding"}) siap dimulai.`,
          points: 0,
          source: "Sistem Otomatisasi",
          type: "SYSTEM"
        }
      ]
    };

    this.juryPressHistory = [];
    this.stampStateMutation(newState, currentState);
    this.broadcast(newState);
    return newState;
  }

  // Offline Round Action Handler
  public processOfflineRoundAction(
    currentState: MatchState,
    roundAction: "NEXT" | "SET" | "FINISH",
    targetRound?: number
  ): MatchState {
    const newState: MatchState = JSON.parse(JSON.stringify(currentState));

    if (roundAction === "NEXT") {
      if (newState.activeRound < (newState.roundCount || 3)) {
        this.endRoundPenalties(newState);
        newState.activeRound++;
        newState.timeLeft = newState.roundDuration || 120;
        newState.status = MatchStatus.IDLE;
        newState.secretarySignalNextRound = false;
        newState.showRoundOverPopup = false;
        this.recalculateScores(newState);
        sound.playGong();
      }
    } else if (roundAction === "SET" && typeof targetRound === "number") {
      if (targetRound !== newState.activeRound) {
        this.endRoundPenalties(newState);
      }
      newState.activeRound = targetRound;
      newState.timeLeft = newState.roundDuration || 120;
      newState.status = MatchStatus.IDLE;
      newState.secretarySignalNextRound = false;
      newState.showRoundOverPopup = false;
      this.recalculateScores(newState);
    } else if (roundAction === "FINISH") {
      newState.status = MatchStatus.FINISHED;
      this.recalculateScores(newState);
      const winnerResult = this.determineMatchTieBreaker(newState);
      if (winnerResult.tieExtended) {
        newState.isTieExtendedPossible = true;
        newState.winnerColor = null;
        newState.winnerMethod = "DRAW / SERI (POIN AKHIR SAMA)";
      } else {
        newState.isTieExtendedPossible = false;
        newState.winnerColor = winnerResult.winner;
        newState.winnerMethod = winnerResult.method;
      }
      newState.winnerPublished = !winnerResult.tieExtended;
      newState.dewanPanelLocked = true;
      newState.juryPanelLocked = true;
      newState.showRoundOverPopup = false;
      newState.secretarySignalNextRound = false;
      newState.juryPressStats = this.compileJuryPressStats(newState.logs);
      if (!winnerResult.tieExtended) {
        this.archiveFinishedMatchOffline(newState);
      }
      sound.playBuzzer();
    }

    this.stampStateMutation(newState, currentState);
    this.broadcast(newState);
    return newState;
  }

  // Offline Verification Handler
  public processOfflineVerificationStart(
    currentState: MatchState,
    type: "JATUHAN" | "PELANGGARAN",
    corner?: "RED" | "BLUE" | null,
    reason?: string
  ): MatchState {
    const newState: MatchState = JSON.parse(JSON.stringify(currentState));
    newState.verification = {
      active: true,
      type,
      corner: corner || null,
      reason: reason || "",
      timestamp: Date.now(),
      votes: { 1: null, 2: null, 3: null },
      result: null,
      applied: false
    };
    newState.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      round: newState.activeRound,
      fighter: corner || "RED",
      description: `DEWAN MEMINTA VERIFIKASI: 【${type}】${corner ? ` Sudut ${corner === "RED" ? "Merah" : "Biru"}` : ""}. Menunggu keputusan J1, J2, J3.`,
      points: 0,
      source: "Dewan Pertandingan",
      type: "SYSTEM"
    });
    sound.playBell();
    this.stampStateMutation(newState, currentState);
    this.broadcast(newState);
    return newState;
  }

  public processOfflineVerificationVote(
    currentState: MatchState,
    juryId: number,
    vote: "MERAH" | "BIRU" | "TIDAK SAH"
  ): MatchState {
    const newState: MatchState = JSON.parse(JSON.stringify(currentState));
    if (!newState.verification || !newState.verification.active) return newState;

    newState.verification.votes[juryId] = vote;
    const votes = newState.verification.votes;
    const votedValues = [votes[1], votes[2], votes[3]].filter(Boolean);

    // Calculate majority consensus (2 out of 3 votes)
    let consensus: "MERAH" | "BIRU" | "TIDAK SAH" | null = null;
    const countRed = votedValues.filter((v) => v === "MERAH").length;
    const countBlue = votedValues.filter((v) => v === "BIRU").length;
    const countInvalid = votedValues.filter((v) => v === "TIDAK SAH").length;

    if (countRed >= 2) consensus = "MERAH";
    else if (countBlue >= 2) consensus = "BIRU";
    else if (countInvalid >= 2) consensus = "TIDAK SAH";
    else if (votedValues.length === 3) {
      consensus = "TIDAK SAH";
    }

    if (consensus) {
      newState.verification.result = consensus;
    }

    sound.playClick();
    this.stampStateMutation(newState, currentState);
    this.broadcast(newState);
    return newState;
  }

  public processOfflineVerificationApply(
    currentState: MatchState,
    manualResult?: "MERAH" | "BIRU" | "TIDAK SAH"
  ): MatchState {
    const newState: MatchState = JSON.parse(JSON.stringify(currentState));
    if (!newState.verification) return newState;

    const finalResult = manualResult || newState.verification.result || "TIDAK SAH";
    const type = newState.verification.type;
    newState.verification.result = finalResult;
    newState.verification.active = false;
    newState.verification.applied = true;

    if (type === "JATUHAN" && finalResult !== "TIDAK SAH") {
      if (finalResult === "MERAH") {
        newState.redStats.drops = (newState.redStats.drops || 0) + 1;
      } else {
        newState.blueStats.drops = (newState.blueStats.drops || 0) + 1;
      }
      newState.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        round: newState.activeRound,
        fighter: finalResult === "MERAH" ? "RED" : "BLUE",
        description: `VERIFIKASI RESMI: JATUHAN SAH (+3 Poin) untuk Sudut ${finalResult === "MERAH" ? "Merah" : "Biru"}!`,
        points: 3,
        source: "Verifikasi Dewan (VAR)",
        type: "DROP"
      });
      sound.playGong();
      this.recalculateScores(newState);
    } else if (type === "PELANGGARAN") {
      newState.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        round: newState.activeRound,
        fighter: finalResult === "MERAH" ? "RED" : "BLUE",
        description: `VERIFIKASI RESMI: KEPUTUSAN PELANGGARAN adalah 【${finalResult === "TIDAK SAH" ? "TIDAK SAH / BERSIH" : `PELANGGARAN SAH untuk Sudut ${finalResult}`}】!`,
        points: 0,
        source: "Verifikasi Dewan (VAR)",
        type: "PENALTY"
      });
      sound.playBuzzer();
    } else {
      newState.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        round: newState.activeRound,
        fighter: "RED",
        description: `VERIFIKASI RESMI: KEPUTUSAN 【TIDAK SAH】! Tidak ada penambahan poin.`,
        points: 0,
        source: "Verifikasi Dewan (VAR)",
        type: "SYSTEM"
      });
    }

    this.stampStateMutation(newState, currentState);
    this.broadcast(newState);
    return newState;
  }

  public processOfflineVerificationReset(currentState: MatchState): MatchState {
    const newState: MatchState = JSON.parse(JSON.stringify(currentState));
    newState.verification = undefined;
    this.stampStateMutation(newState, currentState);
    this.broadcast(newState);
    return newState;
  }
}

export const offlineEngine = new OfflineScoringEngine();
