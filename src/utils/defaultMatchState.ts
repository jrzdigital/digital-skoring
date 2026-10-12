/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MatchState, MatchStatus, MatchLog } from "../types";

export function createDefaultMatchState(): MatchState {
  return {
    id: "match-1",
    eventName: "KEJUARAAN PENCAK SILAT NASIONAL",
    fighterRedName: "SUDUT MERAH",
    fighterRedClub: "KONTINGEN MERAH",
    fighterBlueName: "SUDUT BIRU",
    fighterBlueClub: "KONTINGEN BIRU",
    classCategory: "Tanding Kelas C Putra (55Kg - 60Kg)",
    matchNumber: "Partai 01",
    roundCount: 3,
    activeRound: 1,
    roundDuration: 120,
    timeLeft: 120,
    status: MatchStatus.IDLE,
    timerEndAt: null,
    timerStartedAt: null,
    wmpThreshold: 30,
    scoreRed: 0,
    scoreBlue: 0,
    redStats: {
      punches: 0,
      kicks: 0,
      drops: 0,
      locks: 0,
      warnings: 0,
      overrides: 0,
      pastPenaltiesDeductions: 0
    },
    blueStats: {
      punches: 0,
      kicks: 0,
      drops: 0,
      locks: 0,
      warnings: 0,
      overrides: 0,
      pastPenaltiesDeductions: 0
    },
    redPenalties: {
      binaan1: false,
      binaan2: false,
      teguran1: false,
      teguran2: false,
      peringatan1: false,
      peringatan2: false,
      disqualified: false
    },
    bluePenalties: {
      binaan1: false,
      binaan2: false,
      teguran1: false,
      teguran2: false,
      peringatan1: false,
      peringatan2: false,
      disqualified: false
    },
    activeJuryPresses: {
      1: null,
      2: null,
      3: null
    },
    juryScores: {
      1: {
        1: { red: 0, blue: 0 },
        2: { red: 0, blue: 0 },
        3: { red: 0, blue: 0 }
      },
      2: {
        1: { red: 0, blue: 0 },
        2: { red: 0, blue: 0 },
        3: { red: 0, blue: 0 }
      },
      3: {
        1: { red: 0, blue: 0 },
        2: { red: 0, blue: 0 },
        3: { red: 0, blue: 0 }
      }
    },
    verification: undefined,
    showRoundOverPopup: false,
    showNextMatchPopup: true,
    secretarySignalNextRound: false,
    juryPanelLocked: false,
    dewanPanelLocked: false,
    logoLeft: "",
    logoRight: "",
    gender: "PUTRA",
    stage: "PENYISIHAN",
    projectionMode: false,
    division: "DEWASA",
    losingCornerNoScoreDuration: 0,
    losingCornerColor: null,
    lastLosingScore: undefined,
    logs: [
      {
        id: "init",
        timestamp: Date.now(),
        round: 1,
        fighter: "RED",
        description: "Sistem Digital Scoreboard siap digunakan. Selamat bertanding!",
        points: 0,
        source: "Sistem",
        type: "SYSTEM"
      }
    ]
  };
}

/**
 * Normalizes any match state loaded from Firebase RTDB, localStorage, or server SSE
 * Ensures missing properties, null values, or object-represented arrays are converted to valid structures.
 */
export function normalizeMatchState(raw: any): MatchState {
  if (!raw || typeof raw !== "object") {
    return createDefaultMatchState();
  }
  const def = createDefaultMatchState();

  // Normalize logs - Firebase RTDB may convert arrays into objects or omit empty arrays
  let logs: MatchLog[] = def.logs;
  if (Array.isArray(raw.logs)) {
    logs = (raw.logs as any[]).filter((item: any) => item && typeof item === "object") as MatchLog[];
  } else if (raw.logs && typeof raw.logs === "object") {
    logs = Object.values(raw.logs).filter((item: any) => item && typeof item === "object") as MatchLog[];
  }
  if (logs.length === 0) {
    logs = def.logs;
  }

  // Normalize stats
  const redStats = {
    punches: Number(raw.redStats?.punches) || 0,
    kicks: Number(raw.redStats?.kicks) || 0,
    drops: Number(raw.redStats?.drops) || 0,
    locks: Number(raw.redStats?.locks) || 0,
    warnings: Number(raw.redStats?.warnings) || 0,
    overrides: Number(raw.redStats?.overrides) || 0,
    pastPenaltiesDeductions: Number(raw.redStats?.pastPenaltiesDeductions) || 0
  };

  const blueStats = {
    punches: Number(raw.blueStats?.punches) || 0,
    kicks: Number(raw.blueStats?.kicks) || 0,
    drops: Number(raw.blueStats?.drops) || 0,
    locks: Number(raw.blueStats?.locks) || 0,
    warnings: Number(raw.blueStats?.warnings) || 0,
    overrides: Number(raw.blueStats?.overrides) || 0,
    pastPenaltiesDeductions: Number(raw.blueStats?.pastPenaltiesDeductions) || 0
  };

  // Normalize penalties
  const redPenalties = {
    binaan1: Boolean(raw.redPenalties?.binaan1),
    binaan2: Boolean(raw.redPenalties?.binaan2),
    teguran1: Boolean(raw.redPenalties?.teguran1),
    teguran2: Boolean(raw.redPenalties?.teguran2),
    peringatan1: Boolean(raw.redPenalties?.peringatan1),
    peringatan2: Boolean(raw.redPenalties?.peringatan2),
    disqualified: Boolean(raw.redPenalties?.disqualified)
  };

  const bluePenalties = {
    binaan1: Boolean(raw.bluePenalties?.binaan1),
    binaan2: Boolean(raw.bluePenalties?.binaan2),
    teguran1: Boolean(raw.bluePenalties?.teguran1),
    teguran2: Boolean(raw.bluePenalties?.teguran2),
    peringatan1: Boolean(raw.bluePenalties?.peringatan1),
    peringatan2: Boolean(raw.bluePenalties?.peringatan2),
    disqualified: Boolean(raw.bluePenalties?.disqualified)
  };

  // Normalize jury scores (Firebase RTDB can serialize nested numeric objects as arrays)
  const rawJuryScores = raw.juryScores;
  const getJuryRoundScore = (j: number, r: number, color: "red" | "blue"): number => {
    if (!rawJuryScores) return 0;
    const jObj = rawJuryScores[j] ?? rawJuryScores[String(j)];
    if (!jObj) return 0;
    const rObj = jObj[r] ?? jObj[String(r)];
    return Number(rObj?.[color]) || 0;
  };

  const juryScores = {
    1: {
      1: { red: getJuryRoundScore(1, 1, "red"), blue: getJuryRoundScore(1, 1, "blue") },
      2: { red: getJuryRoundScore(1, 2, "red"), blue: getJuryRoundScore(1, 2, "blue") },
      3: { red: getJuryRoundScore(1, 3, "red"), blue: getJuryRoundScore(1, 3, "blue") }
    },
    2: {
      1: { red: getJuryRoundScore(2, 1, "red"), blue: getJuryRoundScore(2, 1, "blue") },
      2: { red: getJuryRoundScore(2, 2, "red"), blue: getJuryRoundScore(2, 2, "blue") },
      3: { red: getJuryRoundScore(2, 3, "red"), blue: getJuryRoundScore(2, 3, "blue") }
    },
    3: {
      1: { red: getJuryRoundScore(3, 1, "red"), blue: getJuryRoundScore(3, 1, "blue") },
      2: { red: getJuryRoundScore(3, 2, "red"), blue: getJuryRoundScore(3, 2, "blue") },
      3: { red: getJuryRoundScore(3, 3, "red"), blue: getJuryRoundScore(3, 3, "blue") }
    }
  };

  // Normalize active jury presses (support both object and array from Firebase RTDB)
  const rawPresses = raw.activeJuryPresses;
  const activeJuryPresses = {
    1: (rawPresses && (rawPresses[1] ?? rawPresses["1"])) || null,
    2: (rawPresses && (rawPresses[2] ?? rawPresses["2"])) || null,
    3: (rawPresses && (rawPresses[3] ?? rawPresses["3"])) || null
  };

  // Normalize verification
  let verification = undefined;
  if (raw.verification && typeof raw.verification === "object" && raw.verification.active) {
    const rawVotes = raw.verification.votes;
    verification = {
      active: true,
      type: raw.verification.type || "JATUHAN",
      corner: raw.verification.corner || null,
      reason: raw.verification.reason || "",
      timestamp: Number(raw.verification.timestamp) || Date.now(),
      votes: {
        1: (rawVotes && (rawVotes[1] ?? rawVotes["1"])) || null,
        2: (rawVotes && (rawVotes[2] ?? rawVotes["2"])) || null,
        3: (rawVotes && (rawVotes[3] ?? rawVotes["3"])) || null
      },
      result: raw.verification.result || null
    };
  }

  // Normalize recent juryPressHistory (keep recent records within 5 seconds for cross-tab/device consensus)
  let juryPressHistory: {
    id: string;
    juryId: number;
    fighter: "RED" | "BLUE";
    action: "PUNCH" | "KICK";
    timestamp: number;
    consumed: boolean;
  }[] = [];
  const now = Date.now();
  if (Array.isArray(raw.juryPressHistory)) {
    juryPressHistory = raw.juryPressHistory.filter(
      (p: any) => p && typeof p === "object" && typeof p.timestamp === "number" && (now - p.timestamp) <= 5000
    );
  } else if (raw.juryPressHistory && typeof raw.juryPressHistory === "object") {
    juryPressHistory = Object.values(raw.juryPressHistory).filter(
      (p: any) => p && typeof p === "object" && typeof p.timestamp === "number" && (now - p.timestamp) <= 5000
    ) as any[];
  }

  return {
    ...def,
    ...raw,
    id: raw.id || def.id,
    eventName: raw.eventName !== undefined ? raw.eventName : def.eventName,
    fighterRedName: raw.fighterRedName !== undefined ? raw.fighterRedName : def.fighterRedName,
    fighterRedClub: raw.fighterRedClub !== undefined ? raw.fighterRedClub : def.fighterRedClub,
    fighterBlueName: raw.fighterBlueName !== undefined ? raw.fighterBlueName : def.fighterBlueName,
    fighterBlueClub: raw.fighterBlueClub !== undefined ? raw.fighterBlueClub : def.fighterBlueClub,
    classCategory: raw.classCategory !== undefined ? raw.classCategory : def.classCategory,
    matchNumber: raw.matchNumber !== undefined ? raw.matchNumber : def.matchNumber,
    roundCount: Number(raw.roundCount) || 3,
    activeRound: Number(raw.activeRound) || 1,
    roundDuration: Number(raw.roundDuration) || 120,
    timeLeft: typeof raw.timeLeft === "number" && !isNaN(raw.timeLeft) ? raw.timeLeft : (Number(raw.roundDuration) || 120),
    status: raw.status || MatchStatus.IDLE,
    scoreRed: Number(raw.scoreRed) || 0,
    scoreBlue: Number(raw.scoreBlue) || 0,
    secretarySignalNextRound: Boolean(raw.secretarySignalNextRound),
    showRoundOverPopup: Boolean(raw.showRoundOverPopup),
    showNextMatchPopup: raw.showNextMatchPopup !== undefined ? Boolean(raw.showNextMatchPopup) : (raw.status === MatchStatus.IDLE),
    winnerPublished: Boolean(raw.winnerPublished),
    winnerColor: raw.winnerColor !== undefined ? raw.winnerColor : (def.winnerColor || null),
    winnerMethod: raw.winnerMethod !== undefined ? raw.winnerMethod : (def.winnerMethod || null),
    isTieExtendedPossible: Boolean(raw.isTieExtendedPossible),
    dewanPanelLocked: raw.dewanPanelLocked !== undefined ? Boolean(raw.dewanPanelLocked) : false,
    juryPanelLocked: raw.juryPanelLocked !== undefined ? Boolean(raw.juryPanelLocked) : false,
    lastUpdatedAt: Number(raw.lastUpdatedAt) || 0,
    stateVersion: Number(raw.stateVersion) || 0,
    timerEndAt: raw.timerEndAt !== undefined ? raw.timerEndAt : null,
    timerStartedAt: raw.timerStartedAt !== undefined ? raw.timerStartedAt : null,
    wmpThreshold: raw.wmpThreshold !== undefined ? Number(raw.wmpThreshold) : (def.wmpThreshold || 30),
    juryPressHistory,
    redStats,
    blueStats,
    redPenalties,
    bluePenalties,
    activeJuryPresses,
    juryScores,
    verification,
    logs
  };
}

// Server/client synchronized timestamp helper
let serverTimeOffset = 0;

export function setServerTimeOffset(offsetMs: number): void {
  if (typeof offsetMs === "number" && !isNaN(offsetMs)) {
    serverTimeOffset = offsetMs;
  }
}

export function getServerTimeOffset(): number {
  return serverTimeOffset;
}

export function getSyncedNow(): number {
  return Date.now() + serverTimeOffset;
}

// Live remaining timer calculator
export function computeLiveTimeLeft(state: { status?: string; timerEndAt?: number | null; timeLeft?: number; roundDuration?: number } | null | undefined): number {
  if (!state) return 0;
  if (state.status === "RUNNING" && typeof state.timerEndAt === "number" && state.timerEndAt > 0) {
    return Math.max(0, Math.ceil((state.timerEndAt - getSyncedNow()) / 1000));
  }
  return typeof state.timeLeft === "number" ? state.timeLeft : (state.roundDuration || 120);
}
