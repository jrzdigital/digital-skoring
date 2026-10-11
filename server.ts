/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";

const _currentDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : typeof import.meta !== "undefined" && import.meta.url
    ? path.dirname(fileURLToPath(import.meta.url))
    : process.cwd();

import { MatchState, MatchStatus, MatchLog, FighterColor, ActionType, ScoreDetail } from "./src/types.ts";
import {
  loginUser,
  registerUser,
  getAllUsers,
  approveUser,
  rejectUser,
  createUserByAdmin,
  updateUserByAdmin,
  resetPasswordByAdmin,
  deleteUserByAdmin,
  getActivityLogs,
  createPasswordResetRequest,
  getPasswordResetRequests,
  approvePasswordResetRequest,
  rejectPasswordResetRequest,
  verifyResetToken,
  resetPasswordWithToken,
  createIpUnlockRequest,
  getIpUnlockRequests,
  approveIpUnlockRequest,
  rejectIpUnlockRequest,
  resetUserBoundIp,
  updateUserBoundIp,
  toggleUserIpLock
} from "./userManager.ts";

function getRequestIp(req: any): string {
  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip || "127.0.0.1";
  if (Array.isArray(ip)) {
    ip = ip[0];
  }
  if (typeof ip === "string" && ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }
  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    ip = "127.0.0.1";
  }
  return ip;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

function resolveServerDataFile(fileName: string): string {
  if (process.env.JRZ_DATA_DIR) {
    try {
      if (!fs.existsSync(process.env.JRZ_DATA_DIR)) {
        fs.mkdirSync(process.env.JRZ_DATA_DIR, { recursive: true });
      }
      return path.join(process.env.JRZ_DATA_DIR, fileName);
    } catch (e) {
      // fallback below
    }
  }
  const localPath = path.resolve("./", fileName);
  try {
    fs.accessSync(path.dirname(localPath), fs.constants.W_OK);
    return localPath;
  } catch (e) {
    const fallbackDir = path.join(os.homedir(), ".jrz-score-ipsi");
    try {
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      return path.join(fallbackDir, fileName);
    } catch (err) {
      return localPath;
    }
  }
}

const ACTIVE_MATCH_FILE = resolveServerDataFile("activeMatch.json");

// Enable CORS for iframe preview and network devices
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// SSE Clients array for real-time push synchronization
let sseClients: any[] = [];

// Send periodic heartbeat pings (every 10 seconds) to prevent routers from killing idle connections
setInterval(() => {
  sseClients.forEach(res => {
    try {
      res.write(": keepalive\n\n");
    } catch (e) {
      // client dropped
    }
  });
}, 10000);

interface JuryPing {
  ip: string;
  lastSeen: number;
}
const juryPings: { [juryId: number]: JuryPing } = {};

interface DevicePing {
  ip: string;
  lastSeen: number;
}
const devicePings: { [deviceId: string]: DevicePing } = {};

function updateJuryConnections() {
  const now = Date.now();
  activeMatch.juryConnections = {
    1: { active: (juryPings[1] && now - juryPings[1].lastSeen < 6000) || (devicePings["juri1"] && now - devicePings["juri1"].lastSeen < 6000) || false, ip: juryPings[1]?.ip || devicePings["juri1"]?.ip || "-", lastSeen: juryPings[1]?.lastSeen || devicePings["juri1"]?.lastSeen || 0 },
    2: { active: (juryPings[2] && now - juryPings[2].lastSeen < 6000) || (devicePings["juri2"] && now - devicePings["juri2"].lastSeen < 6000) || false, ip: juryPings[2]?.ip || devicePings["juri2"]?.ip || "-", lastSeen: juryPings[2]?.lastSeen || devicePings["juri2"]?.lastSeen || 0 },
    3: { active: (juryPings[3] && now - juryPings[3].lastSeen < 6000) || (devicePings["juri3"] && now - devicePings["juri3"].lastSeen < 6000) || false, ip: juryPings[3]?.ip || devicePings["juri3"]?.ip || "-", lastSeen: juryPings[3]?.lastSeen || devicePings["juri3"]?.lastSeen || 0 }
  };

  activeMatch.deviceConnections = {
    monitor: {
      active: (devicePings["monitor"] && now - devicePings["monitor"].lastSeen < 6000) || false,
      ip: devicePings["monitor"]?.ip || "-",
      lastSeen: devicePings["monitor"]?.lastSeen || 0
    },
    sekretaris: {
      active: (devicePings["sekretaris"] && now - devicePings["sekretaris"].lastSeen < 6000) || false,
      ip: devicePings["sekretaris"]?.ip || "-",
      lastSeen: devicePings["sekretaris"]?.lastSeen || 0
    },
    dewan: {
      active: (devicePings["dewan"] && now - devicePings["dewan"].lastSeen < 6000) || false,
      ip: devicePings["dewan"]?.ip || "-",
      lastSeen: devicePings["dewan"]?.lastSeen || 0
    },
    juri1: {
      active: (devicePings["juri1"] && now - devicePings["juri1"].lastSeen < 6000) || (juryPings[1] && now - juryPings[1].lastSeen < 6000) || false,
      ip: devicePings["juri1"]?.ip || juryPings[1]?.ip || "-",
      lastSeen: devicePings["juri1"]?.lastSeen || juryPings[1]?.lastSeen || 0
    },
    juri2: {
      active: (devicePings["juri2"] && now - devicePings["juri2"].lastSeen < 6000) || (juryPings[2] && now - juryPings[2].lastSeen < 6000) || false,
      ip: devicePings["juri2"]?.ip || juryPings[2]?.ip || "-",
      lastSeen: devicePings["juri2"]?.lastSeen || juryPings[2]?.lastSeen || 0
    },
    juri3: {
      active: (devicePings["juri3"] && now - devicePings["juri3"].lastSeen < 6000) || (juryPings[3] && now - juryPings[3].lastSeen < 6000) || false,
      ip: devicePings["juri3"]?.ip || juryPings[3]?.ip || "-",
      lastSeen: devicePings["juri3"]?.lastSeen || juryPings[3]?.lastSeen || 0
    }
  };
}

// Helper to broadcast state changes instantly to all connected panels
function broadcastState() {
  updateJuryConnections();
  const now = Date.now();
  activeMatch.lastUpdatedAt = now;
  activeMatch.stateVersion = (Number(activeMatch.stateVersion) || 0) + 1;
  if (activeMatch.status === MatchStatus.RUNNING) {
    if (!activeMatch.timerEndAt || activeMatch.timerEndAt <= 0) {
      activeMatch.timerStartedAt = now;
      activeMatch.timerEndAt = now + (activeMatch.timeLeft || activeMatch.roundDuration || 120) * 1000;
    } else {
      activeMatch.timeLeft = Math.max(0, Math.ceil((activeMatch.timerEndAt - now) / 1000));
    }
  } else {
    activeMatch.timerEndAt = null;
    activeMatch.timerStartedAt = null;
  }
  const data = JSON.stringify(activeMatch);
  
  // Persist current state to activeMatch.json for recovery on server restarts
  try {
    fs.writeFileSync(ACTIVE_MATCH_FILE, data, "utf8");
  } catch (err) {
    console.error("[AUTOSAVE] Gagal menyimpan status pertandingan ke file:", err);
  }

  sseClients.forEach(res => {
    try {
      res.write(`data: ${data}\n\n`);
    } catch (e) {
      // client dropped
    }
  });
}

// Middleware to automatically broadcast activeMatch updates via SSE
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (this: any, body: any) {
    const result = originalJson.call(this, body);
    if (
      req.method === "POST" && 
      req.path !== "/api/jury/ping" &&
      req.path !== "/api/device/ping" &&
      (req.path.startsWith("/api/match-state") || 
       req.path.startsWith("/api/jury") || 
       req.path.startsWith("/api/dewan") || 
       req.path === "/api/matches-schedule/load")
    ) {
      broadcastState();
    }
    return result;
  };
  next();
});

// Main active match state in-memory database
let activeMatch: MatchState = {
  id: "match-1",
  eventName: "",
  fighterRedName: "",
  fighterRedClub: "",
  fighterBlueName: "",
  fighterBlueClub: "",
  classCategory: "",
  matchNumber: "",
  roundCount: 3,
  activeRound: 1,
  roundDuration: 120, // seconds
  timeLeft: 120,
  status: MatchStatus.IDLE,
  scoreRed: 0,
  scoreBlue: 0,
  redStats: { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 },
  blueStats: { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 },
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
  secretarySignalNextRound: false,
  juryPanelLocked: true,
  dewanPanelLocked: true,
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
      description: "Pertandingan diinisialisasi. Selamat bertanding!",
      points: 0,
      source: "Sistem",
      type: "SYSTEM"
    }
  ]
};

// Internal list to track history of individual jury inputs to calculate consensus
interface JuryPressHistory {
  id: string;
  juryId: number;
  fighter: FighterColor;
  action: ActionType;
  timestamp: number;
  consumed: boolean;
}

let juryPressHistory: JuryPressHistory[] = [];
let autoAdvanceTimer: NodeJS.Timeout | null = null;

// Recalculates total score for both fighters based on stats and penalties under IPSI 2022 rules
function recalculateScores() {
  // Pukulan = 1 * count
  // Tendangan = 2 * count
  // Jatuhan = 3 * count
  // Kuncian = 3 * count
  
  // Calculate Red Positive
  const redPositive = 
    (activeMatch.redStats.punches * 1) + 
    (activeMatch.redStats.kicks * 2) + 
    (activeMatch.redStats.drops * 3) + 
    (activeMatch.redStats.locks * 3) +
    (activeMatch.redStats.overrides || 0);
  
  // Red Warnings and Penalties
  // Teguran 1 = -1
  // Teguran 2 = -2
  // Peringatan 1 = -5
  // Peringatan 2 = -10
  let redPenaltyDeductions = activeMatch.redStats.pastPenaltiesDeductions || 0;
  if (activeMatch.redPenalties.teguran1) redPenaltyDeductions += 1;
  if (activeMatch.redPenalties.teguran2) redPenaltyDeductions += 2;
  if (activeMatch.redPenalties.peringatan1) redPenaltyDeductions += 5;
  if (activeMatch.redPenalties.peringatan2) redPenaltyDeductions += 10;
  
  activeMatch.redStats.warnings = redPenaltyDeductions;
  activeMatch.scoreRed = redPositive - redPenaltyDeductions;

  // Calculate Blue Positive
  const bluePositive = 
    (activeMatch.blueStats.punches * 1) + 
    (activeMatch.blueStats.kicks * 2) + 
    (activeMatch.blueStats.drops * 3) + 
    (activeMatch.blueStats.locks * 3) +
    (activeMatch.blueStats.overrides || 0);
    
  let bluePenaltyDeductions = activeMatch.blueStats.pastPenaltiesDeductions || 0;
  if (activeMatch.bluePenalties.teguran1) bluePenaltyDeductions += 1;
  if (activeMatch.bluePenalties.teguran2) bluePenaltyDeductions += 2;
  if (activeMatch.bluePenalties.peringatan1) bluePenaltyDeductions += 5;
  if (activeMatch.bluePenalties.peringatan2) bluePenaltyDeductions += 10;
  
  activeMatch.blueStats.warnings = bluePenaltyDeductions;
  activeMatch.scoreBlue = bluePositive - bluePenaltyDeductions;

  // Immediately evaluate WMP point gap tracking on score changes in Babak II or III
  if (activeMatch.activeRound === 2 || activeMatch.activeRound === 3) {
    const wmpThreshold = getWmpPointThreshold(activeMatch);
    const scoreDiff = Math.abs(activeMatch.scoreRed - activeMatch.scoreBlue);
    if (scoreDiff >= wmpThreshold) {
      const currentLosingColor = activeMatch.scoreRed > activeMatch.scoreBlue ? "BLUE" : "RED";
      const currentLosingScore = currentLosingColor === "BLUE" ? activeMatch.scoreBlue : activeMatch.scoreRed;
      if (activeMatch.losingCornerColor !== currentLosingColor) {
        activeMatch.losingCornerColor = currentLosingColor;
        activeMatch.lastLosingScore = currentLosingScore;
        activeMatch.losingCornerNoScoreDuration = 0;
      } else {
        activeMatch.lastLosingScore = currentLosingScore;
      }
    } else {
      activeMatch.losingCornerColor = null;
      activeMatch.lastLosingScore = undefined;
      activeMatch.losingCornerNoScoreDuration = 0;
    }
  } else {
    activeMatch.losingCornerColor = null;
    activeMatch.lastLosingScore = undefined;
    activeMatch.losingCornerNoScoreDuration = 0;
  }
}

function getWmpPointThreshold(match: MatchState): number {
  if (Number(match.wmpThreshold) === 20) return 20;
  if (Number(match.wmpThreshold) === 30) return 30;
  const combined = `${match.division || ""} ${match.classCategory || ""}`.toUpperCase();
  const isUsiaDiniOrPraRemaja =
    combined.includes("USIA DINI") ||
    combined.includes("USIADINI") ||
    combined.includes("PRA REMAJA") ||
    combined.includes("PRA-REMAJA") ||
    combined.includes("PRAREMAJA");
  return isUsiaDiniOrPraRemaja ? 20 : 30;
}

function endCurrentRoundPenalties() {
  const redRoundDeduction = (activeMatch.redPenalties.teguran1 ? 1 : 0) + (activeMatch.redPenalties.teguran2 ? 2 : 0);
  const blueRoundDeduction = (activeMatch.bluePenalties.teguran1 ? 1 : 0) + (activeMatch.bluePenalties.teguran2 ? 2 : 0);

  activeMatch.redStats.pastPenaltiesDeductions = (activeMatch.redStats.pastPenaltiesDeductions || 0) + redRoundDeduction;
  activeMatch.blueStats.pastPenaltiesDeductions = (activeMatch.blueStats.pastPenaltiesDeductions || 0) + blueRoundDeduction;

  // Reset infractions for current round except warnings and disqualified
  activeMatch.redPenalties.binaan1 = false;
  activeMatch.redPenalties.binaan2 = false;
  activeMatch.redPenalties.teguran1 = false;
  activeMatch.redPenalties.teguran2 = false;

  activeMatch.bluePenalties.binaan1 = false;
  activeMatch.bluePenalties.binaan2 = false;
  activeMatch.bluePenalties.teguran1 = false;
  activeMatch.bluePenalties.teguran2 = false;

  recalculateScores();
}

// =========================================================================
// TIE-BREAKER RULE DETERMINATOR & AUTOMATIC PARTY SCHEDULER ADVANCEMENT
// =========================================================================

function runMatchTieBreaker(): { winner: "RED" | "BLUE"; method: string; tieExtended: boolean } {
  // Disqualified check
  if (activeMatch.redPenalties.disqualified && !activeMatch.bluePenalties.disqualified) {
    return { winner: "BLUE", method: "DISKUALIFIKASI LAWAN", tieExtended: false };
  }
  if (activeMatch.bluePenalties.disqualified && !activeMatch.redPenalties.disqualified) {
    return { winner: "RED", method: "DISKUALIFIKASI LAWAN", tieExtended: false };
  }

  // Recalculate to make absolutely sure they are correct
  recalculateScores();

  if (activeMatch.scoreRed > activeMatch.scoreBlue) {
    return { winner: "RED", method: "KEUNGGULAN SKOR", tieExtended: false };
  }
  if (activeMatch.scoreBlue > activeMatch.scoreRed) {
    return { winner: "BLUE", method: "KEUNGGULAN SKOR", tieExtended: false };
  }

  // Draw situation: KETENTUAN 1: Sedikitnya Nilai Hukuman (Penalti) Sesuai IPSI 2026
  let redPenPoints = (activeMatch.redStats?.pastPenaltiesDeductions || 0);
  if (activeMatch.redPenalties.teguran1) redPenPoints += 1;
  if (activeMatch.redPenalties.teguran2) redPenPoints += 2;
  if (activeMatch.redPenalties.peringatan1) redPenPoints += 5;
  if (activeMatch.redPenalties.peringatan2) redPenPoints += 10;

  let bluePenPoints = (activeMatch.blueStats?.pastPenaltiesDeductions || 0);
  if (activeMatch.bluePenalties.teguran1) bluePenPoints += 1;
  if (activeMatch.bluePenalties.teguran2) bluePenPoints += 2;
  if (activeMatch.bluePenalties.peringatan1) bluePenPoints += 5;
  if (activeMatch.bluePenalties.peringatan2) bluePenPoints += 10;

  if (redPenPoints < bluePenPoints) {
    return { winner: "RED", method: "NILAI SERI - LEBIH SEDIKIT HUKUMAN (PENALTI)", tieExtended: false };
  }
  if (bluePenPoints < redPenPoints) {
    return { winner: "BLUE", method: "NILAI SERI - LEBIH SEDIKIT HUKUMAN (PENALTI)", tieExtended: false };
  }

  // KETENTUAN 2: Nilai Prestasi Teknik
  // Drops (3) + Locks (3)
  const red3 = (activeMatch.redStats.drops || 0) + (activeMatch.redStats.locks || 0);
  const blue3 = (activeMatch.blueStats.drops || 0) + (activeMatch.blueStats.locks || 0);
  if (red3 !== blue3) {
    return { 
      winner: red3 > blue3 ? "RED" : "BLUE", 
      method: "NILAI SERI & HUKUMAN SAMA - PRESTASI TEKNIK JATUHAN/KUNCIAN DOMINAN", 
      tieExtended: false 
    };
  }

  // Kicks (2)
  const red2 = activeMatch.redStats.kicks || 0;
  const blue2 = activeMatch.blueStats.kicks || 0;
  if (red2 !== blue2) {
    return { 
      winner: red2 > blue2 ? "RED" : "BLUE", 
      method: "NILAI SERI & HUKUMAN SAMA - PRESTASI TEKNIK TENDANGAN DOMINAN", 
      tieExtended: false 
    };
  }

  // Punches (1)
  const red1 = activeMatch.redStats.punches || 0;
  const blue1 = activeMatch.blueStats.punches || 0;
  if (red1 !== blue1) {
    return { 
      winner: red1 > blue1 ? "RED" : "BLUE", 
      method: "NILAI SERI & HUKUMAN SAMA - PRESTASI TEKNIK PUKULAN DOMINAN", 
      tieExtended: false 
    };
  }

  // KETENTUAN 3: Penambahan babak ke 4 (jika belum berada di babak 4)
  if (activeMatch.activeRound < 4) {
    return { winner: "RED", method: "TIE_EXTENSION", tieExtended: true };
  }

  // KETENTUAN 4: Undian (Lotere)
  const lotere = Math.random() < 0.5 ? "RED" : "BLUE";
  return { 
    winner: lotere, 
    method: "NILAI SERI SEMPURNA DI BABAK 4 - KEPUTUSAN UNDIAN (LOTERE) RESMI", 
    tieExtended: false 
  };
}

export function compileJuryPressStats(logs: MatchLog[]) {
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

  const seenTimestampsByJuryKey: Record<string, number[]> = {};

  (logs || []).forEach(log => {
    if (!log || (log.type !== "PUNCH" && log.type !== "KICK")) return;
    if (log.description && log.description.startsWith("UJI COBA GAWAI")) return;

    const juryList: number[] = [];
    if (!log.uncounted && log.juryIds && Array.isArray(log.juryIds)) {
      juryList.push(...log.juryIds);
    } else if (log.uncounted && log.source && log.source.startsWith("Juri ")) {
      const jNum = parseInt(log.source.replace("Juri ", ""), 10);
      if (!isNaN(jNum)) juryList.push(jNum);
    }

    const uniqueJuries = Array.from(new Set(juryList));
    const logTime = Number(log.timestamp) || 0;

    uniqueJuries.forEach(jId => {
      const target = jId === 1 ? stats.juri1 : jId === 2 ? stats.juri2 : jId === 3 ? stats.juri3 : null;
      if (!target) return;

      const dedupKey = `${jId}_${log.round}_${log.fighter}_${log.type}`;
      const prevTimes = seenTimestampsByJuryKey[dedupKey] || [];
      if (logTime > 0 && prevTimes.some(t => Math.abs(t - logTime) <= 500)) {
        return;
      }
      prevTimes.push(logTime);
      seenTimestampsByJuryKey[dedupKey] = prevTimes;

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

function normalizePartaiNumServer(val: any): string {
  if (val === undefined || val === null) return "";
  const str = String(val).trim();
  const digits = str.replace(/\D/g, "");
  if (digits.length > 0) return String(parseInt(digits, 10));
  return str.toUpperCase();
}

function archiveActiveMatchToSchedule(winnerSideParam?: "MERAH" | "BIRU") {
  const actualId = activeMatch.id.startsWith("match-") ? activeMatch.id.replace("match-", "") : activeMatch.id;
  const normCurrent = normalizePartaiNumServer(activeMatch.matchNumber);
  const currentIdx = matchesSchedule.findIndex(
    m =>
      m.id === actualId ||
      m.id === activeMatch.id ||
      m.matchNumber === activeMatch.matchNumber ||
      (normCurrent !== "" && normalizePartaiNumServer(m.matchNumber) === normCurrent)
  );

  const winnerSide = winnerSideParam || (
    activeMatch.winnerColor === "RED"
      ? "MERAH"
      : activeMatch.winnerColor === "BLUE"
      ? "BIRU"
      : activeMatch.scoreRed > activeMatch.scoreBlue
      ? "MERAH"
      : activeMatch.scoreBlue > activeMatch.scoreRed
      ? "BIRU"
      : undefined
  );

  const juryStats = compileJuryPressStats(activeMatch.logs);
  activeMatch.juryPressStats = juryStats;

  if (currentIdx !== -1) {
    matchesSchedule[currentIdx].status = "SELESAI" as any;
    if (winnerSide) {
      matchesSchedule[currentIdx].winner = winnerSide;
    }
    matchesSchedule[currentIdx].scoreRed = activeMatch.scoreRed;
    matchesSchedule[currentIdx].scoreBlue = activeMatch.scoreBlue;
    matchesSchedule[currentIdx].redStats = activeMatch.redStats ? { ...activeMatch.redStats } : undefined;
    matchesSchedule[currentIdx].blueStats = activeMatch.blueStats ? { ...activeMatch.blueStats } : undefined;
    matchesSchedule[currentIdx].fighterRedName = activeMatch.fighterRedName;
    matchesSchedule[currentIdx].fighterBlueName = activeMatch.fighterBlueName;
    matchesSchedule[currentIdx].fighterRedClub = activeMatch.fighterRedClub;
    matchesSchedule[currentIdx].fighterBlueClub = activeMatch.fighterBlueClub;
    matchesSchedule[currentIdx].classCategory = activeMatch.classCategory;
    matchesSchedule[currentIdx].juryPressStats = { ...juryStats };
    matchesSchedule[currentIdx].logs = activeMatch.logs ? JSON.parse(JSON.stringify(activeMatch.logs)) : [];

    if (winnerSide) {
      const matchObj = matchesSchedule[currentIdx];
      const winId = winnerSide === "MERAH" ? matchObj.fighterRedId : matchObj.fighterBlueId;
      const winName = winnerSide === "MERAH" ? (matchObj.fighterRedName || activeMatch.fighterRedName) : (matchObj.fighterBlueName || activeMatch.fighterBlueName);
      const winClub = winnerSide === "MERAH" ? (matchObj.fighterRedClub || activeMatch.fighterRedClub) : (matchObj.fighterBlueClub || activeMatch.fighterBlueClub);
      propagateWinnerAcrossSchedules(matchObj.id, actualId, winId, winName, winClub, matchObj.categoryClassId, matchObj.gender);
    }
  } else {
    matchesSchedule.push({
      id: actualId || "archived-" + Date.now(),
      matchNumber: activeMatch.matchNumber || "Partai 1",
      stage: (activeMatch.stage as any) || "PENYISIHAN",
      gender: (activeMatch.gender as any) || "PUTRA",
      status: "SELESAI" as any,
      winner: winnerSide,
      scoreRed: activeMatch.scoreRed,
      scoreBlue: activeMatch.scoreBlue,
      redStats: activeMatch.redStats ? { ...activeMatch.redStats } : undefined,
      blueStats: activeMatch.blueStats ? { ...activeMatch.blueStats } : undefined,
      fighterRedName: activeMatch.fighterRedName,
      fighterBlueName: activeMatch.fighterBlueName,
      fighterRedClub: activeMatch.fighterRedClub,
      fighterBlueClub: activeMatch.fighterBlueClub,
      classCategory: activeMatch.classCategory,
      division: activeMatch.division || "DEWASA",
      juryPressStats: { ...juryStats },
      logs: activeMatch.logs ? JSON.parse(JSON.stringify(activeMatch.logs)) : []
    });
  }
}

function processMatchFinish() {
  const winnerResult = runMatchTieBreaker();

  activeMatch.status = MatchStatus.FINISHED;
  activeMatch.winnerPublished = !winnerResult.tieExtended;
  activeMatch.showRoundOverPopup = false;
  activeMatch.juryPressStats = compileJuryPressStats(activeMatch.logs);

  if (winnerResult.tieExtended) {
    activeMatch.isTieExtendedPossible = true;
    activeMatch.winnerColor = null;
    activeMatch.winnerMethod = "DRAW / SERI (POIN AKHIR SAMA)";
    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      round: activeMatch.activeRound,
      fighter: "RED",
      description: "PERTANDINGAN SELESAI SEMENTARA! Hasil Seri/Sama Kuat di Akhir Babak 3. Memerlukan Babak Tambahan.",
      points: 0,
      source: "Sistem Keputusan",
      type: "SYSTEM"
    });
  } else {
    activeMatch.isTieExtendedPossible = false;
    activeMatch.winnerColor = winnerResult.winner;
    activeMatch.winnerMethod = winnerResult.method;

    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      round: activeMatch.activeRound,
      fighter: winnerResult.winner,
      description: `PERTANDINGAN SELESAI! PEMENANG RESMI: ${
        winnerResult.winner === "RED" ? activeMatch.fighterRedName : activeMatch.fighterBlueName
      } (${winnerResult.method})`,
      points: 0,
      source: "Dewan Pertandingan",
      type: "SYSTEM"
    });

    // Archive finished match and propagate winner into matchesSchedule
    archiveActiveMatchToSchedule(winnerResult.winner === "RED" ? "MERAH" : "BIRU");

    // Auto-advance: Otomatis alihkan ke persiapan partai selanjutnya setelah 5 detik masa pengumuman pemenang
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
    autoAdvanceTimer = setTimeout(() => {
      if (activeMatch.status === MatchStatus.FINISHED) {
        console.log("OTOMATIS BERALIH: Menampilkan persiapan untuk partai selanjutnya...");
        loadNextMatch();
        broadcastState();
      }
    }, 5000);
  }

  broadcastState();
}

function propagateWinnerAcrossSchedules(
  matchId: string, 
  actualId: string, 
  winnerId: string | undefined, 
  winnerName: string | undefined, 
  winnerClub: string | undefined, 
  categoryClassId?: string, 
  gender?: string
) {
  if (!winnerId) return;
  const matchIdClean = matchId ? matchId.replace(/^match-/, "") : "";
  const actualIdClean = actualId ? actualId.replace(/^match-/, "") : "";

  const matchKeys = new Set([
    `winner-${matchIdClean}`,
    `winner-${actualIdClean}`,
    `winner-${matchId}`,
    `winner-${actualId}`,
    `winner-match-${matchIdClean}`,
    `winner-match-${actualIdClean}`
  ]);

  matchesSchedule.forEach(m => {
    // 1. Direct winner-{matchId} referencing across any arena/gelanggang
    if (m.fighterRedId && matchKeys.has(m.fighterRedId)) {
      m.fighterRedId = winnerId;
      if (winnerName) m.fighterRedName = winnerName;
      if (winnerClub) m.fighterRedClub = winnerClub;
    }
    if (m.fighterBlueId && matchKeys.has(m.fighterBlueId)) {
      m.fighterBlueId = winnerId;
      if (winnerName) m.fighterBlueName = winnerName;
      if (winnerClub) m.fighterBlueClub = winnerClub;
    }

    // 2. Pool A & Pool B Finals auto-feeding Grand Final
    if (categoryClassId && gender && m.categoryClassId === categoryClassId && m.gender === gender) {
      if (m.id && m.id.includes("-grand-f-")) {
        if (matchId.includes("-pa-f-") || actualId.includes("-pa-f-")) {
          m.fighterRedId = winnerId;
          if (winnerName) m.fighterRedName = winnerName;
          if (winnerClub) m.fighterRedClub = winnerClub;
        }
        if (matchId.includes("-pb-f-") || actualId.includes("-pb-f-")) {
          m.fighterBlueId = winnerId;
          if (winnerName) m.fighterBlueName = winnerName;
          if (winnerClub) m.fighterBlueClub = winnerClub;
        }
      }
    }
  });
}

function loadNextMatch() {
  const actualId = activeMatch.id.startsWith("match-") ? activeMatch.id.replace("match-", "") : activeMatch.id;
  const normCurrent = normalizePartaiNumServer(activeMatch.matchNumber);
  const currentIdx = matchesSchedule.findIndex(
    m =>
      m.id === actualId ||
      m.id === activeMatch.id ||
      m.matchNumber === activeMatch.matchNumber ||
      (normCurrent !== "" && normalizePartaiNumServer(m.matchNumber) === normCurrent)
  );
  
  // Find next match that has not finished yet (status !== "SELESAI")
  const nextMatch =
    matchesSchedule.find((m, idx) => idx > currentIdx && m.status !== "SELESAI") ||
    matchesSchedule.find(m => m.status !== "SELESAI" && m.id !== actualId);
  if (nextMatch) {
    const match = nextMatch;
    const pRed = participants.find(p => p.id === match.fighterRedId);
    const pBlue = participants.find(p => p.id === match.fighterBlueId);
    const cat = categories.find(c => c.id === match.categoryClassId);

    // Load into activeMatch state
    activeMatch.id = "match-" + match.id;
    activeMatch.matchNumber = match.matchNumber;
    activeMatch.stage = match.stage as any;
    activeMatch.gender = match.gender as any;
    activeMatch.status = MatchStatus.IDLE;
    activeMatch.roundCount = 3; // Reset default round count to 3 for the new match!
    activeMatch.activeRound = 1;
    activeMatch.timeLeft = activeMatch.roundDuration;
    if (match.arena) {
      activeMatch.arena = match.arena;
    }

    if (pRed) {
      activeMatch.fighterRedName = pRed.name;
      activeMatch.fighterRedClub = pRed.club;
    } else if (match.fighterRedName && match.fighterRedName !== "PESILAT MERAH") {
      activeMatch.fighterRedName = match.fighterRedName;
      activeMatch.fighterRedClub = match.fighterRedClub || "CONTINGENT MERAH";
    } else {
      activeMatch.fighterRedName = "PESILAT MERAH";
      activeMatch.fighterRedClub = "CONTINGENT MERAH";
    }

    if (pBlue) {
      activeMatch.fighterBlueName = pBlue.name;
      activeMatch.fighterBlueClub = pBlue.club;
    } else if (match.fighterBlueName && match.fighterBlueName !== "PESILAT BIRU") {
      activeMatch.fighterBlueName = match.fighterBlueName;
      activeMatch.fighterBlueClub = match.fighterBlueClub || "CONTINGENT BIRU";
    } else {
      activeMatch.fighterBlueName = "PESILAT BIRU";
      activeMatch.fighterBlueClub = "CONTINGENT BIRU";
    }

    if (cat) {
      activeMatch.classCategory = `Tanding ${cat.name} ${match.gender === "PUTRI" ? "Putri" : "Putra"} (${cat.minWeight}Kg - ${cat.maxWeight}Kg)`;
      activeMatch.division = cat.division || "DEWASA";
    } else {
      activeMatch.classCategory = "Tanding Bebas";
      activeMatch.division = "DEWASA";
    }
    // Reset special 30-point gap tracking variables
    activeMatch.losingCornerNoScoreDuration = 0;
    activeMatch.losingCornerColor = null;
    activeMatch.lastLosingScore = undefined;

    // Reset scores & stats
    activeMatch.scoreRed = 0;
    activeMatch.scoreBlue = 0;
    activeMatch.redStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
    activeMatch.blueStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
    activeMatch.redPenalties = { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false };
    activeMatch.bluePenalties = { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false };
    activeMatch.activeJuryPresses = { 1: null, 2: null, 3: null };
    activeMatch.juryScores = {
      1: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } },
      2: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } },
      3: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } }
    };
    activeMatch.verification = undefined;
    activeMatch.showRoundOverPopup = false;
    activeMatch.showNextMatchPopup = true;
    activeMatch.secretarySignalNextRound = false;
    activeMatch.juryPanelLocked = true;
    activeMatch.dewanPanelLocked = true;
    activeMatch.winnerPublished = false;
    activeMatch.winnerColor = null;
    activeMatch.winnerMethod = undefined;
    activeMatch.isTieExtendedPossible = false;
    juryPressHistory = [];
    activeMatch.logs = [
      {
        id: "active-" + Date.now(),
        timestamp: Date.now(),
        round: 1,
        fighter: "RED",
        description: `OTOMATIS BERALIH: Partai ${match.matchNumber} (${activeMatch.classCategory}) diaktifkan otomatis dari jadwal.`,
        points: 0,
        source: "Sistem Otomatisasi",
        type: "SYSTEM"
      }
    ];

    nextMatch.status = "SEDANG" as any;
    broadcastState();
  } else {
    // If no further match in schedule, increment partai number for continuous standalone operation
    const curMatchNumStr = String(activeMatch.matchNumber || "Partai 1");
    const numMatch = curMatchNumStr.match(/\d+/);
    const nextNum = numMatch ? parseInt(numMatch[0], 10) + 1 : 2;
    const nextPartaiLabel = `Partai ${nextNum}`;

    activeMatch.id = "match-" + Date.now();
    activeMatch.matchNumber = nextPartaiLabel;
    activeMatch.status = MatchStatus.IDLE;
    activeMatch.roundCount = 3;
    activeMatch.activeRound = 1;
    activeMatch.timeLeft = activeMatch.roundDuration || 120;
    activeMatch.scoreRed = 0;
    activeMatch.scoreBlue = 0;
    activeMatch.redStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
    activeMatch.blueStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
    activeMatch.redPenalties = { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false };
    activeMatch.bluePenalties = { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false };
    activeMatch.activeJuryPresses = { 1: null, 2: null, 3: null };
    activeMatch.juryScores = {
      1: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } },
      2: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } },
      3: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } }
    };
    activeMatch.verification = undefined;
    activeMatch.showRoundOverPopup = false;
    activeMatch.showNextMatchPopup = true;
    activeMatch.secretarySignalNextRound = false;
    activeMatch.juryPanelLocked = true;
    activeMatch.dewanPanelLocked = true;
    activeMatch.winnerPublished = false;
    activeMatch.winnerColor = null;
    activeMatch.winnerMethod = undefined;
    activeMatch.isTieExtendedPossible = false;
    activeMatch.losingCornerNoScoreDuration = 0;
    activeMatch.losingCornerColor = null;
    activeMatch.lastLosingScore = undefined;
    juryPressHistory = [];
    activeMatch.logs = [
      {
        id: "active-" + Date.now(),
        timestamp: Date.now(),
        round: 1,
        fighter: "RED",
        description: `Partai ${nextPartaiLabel} (${activeMatch.classCategory}) siap dimulai.`,
        points: 0,
        source: "Sistem Otomatisasi",
        type: "SYSTEM"
      }
    ];
    broadcastState();
  }
}

// Global server ticker for countdown synchronized across clients
let matchInterval: NodeJS.Timeout | null = null;
function checkRunningTimer() {
  if (activeMatch.status === MatchStatus.RUNNING) {
    if (!activeMatch.timerEndAt || activeMatch.timerEndAt <= 0) {
      const now = Date.now();
      activeMatch.timerStartedAt = now;
      activeMatch.timerEndAt = now + (activeMatch.timeLeft || activeMatch.roundDuration || 120) * 1000;
    }
    if (!matchInterval) {
      matchInterval = setInterval(() => {
        if (activeMatch.status === MatchStatus.RUNNING) {
          if (activeMatch.timeLeft > 0) {
            if (activeMatch.timerEndAt && activeMatch.timerEndAt > 0) {
              activeMatch.timeLeft = Math.max(0, Math.ceil((activeMatch.timerEndAt - Date.now()) / 1000));
            } else {
              activeMatch.timeLeft--;
            }

            // Check IPSI 2026 WMP point gap rule in Round II or III (20 points for Usia Dini/Pra-Remaja, 30 points for Remaja/Dewasa) for 1 minute (60s)
            const wmpThreshold = getWmpPointThreshold(activeMatch);
            if (activeMatch.activeRound === 2 || activeMatch.activeRound === 3) {
              const scoreDiff = Math.abs(activeMatch.scoreRed - activeMatch.scoreBlue);
              if (scoreDiff >= wmpThreshold) {
                const currentLosingColor = activeMatch.scoreRed > activeMatch.scoreBlue ? "BLUE" : "RED";
                const currentLosingScore = currentLosingColor === "BLUE" ? activeMatch.scoreBlue : activeMatch.scoreRed;

                if (activeMatch.losingCornerColor === currentLosingColor) {
                  activeMatch.losingCornerNoScoreDuration = (activeMatch.losingCornerNoScoreDuration || 0) + 1;
                  activeMatch.lastLosingScore = currentLosingScore;
                } else {
                  activeMatch.losingCornerColor = currentLosingColor;
                  activeMatch.lastLosingScore = currentLosingScore;
                  activeMatch.losingCornerNoScoreDuration = 1;
                }

                // If 1 minute (60 seconds) is reached, referee stops match and leading corner wins (Menang WMP)!
                if ((activeMatch.losingCornerNoScoreDuration || 0) >= 60) {
                  const winnerColor = activeMatch.scoreRed > activeMatch.scoreBlue ? "RED" : "BLUE";
                  const winnerName = winnerColor === "RED" ? activeMatch.fighterRedName : activeMatch.fighterBlueName;
                  const categoryLabel = wmpThreshold === 20 ? "Usia Dini / Pra-Remaja" : "Remaja / Dewasa";

                  activeMatch.status = MatchStatus.FINISHED;
                  activeMatch.winnerColor = winnerColor;
                  activeMatch.winnerMethod = `MENANG WMP (SELISIH ${wmpThreshold} POIN SELAMA 60 DETIK)`;
                  activeMatch.winnerPublished = true;
                  activeMatch.dewanPanelLocked = true;
                  activeMatch.juryPanelLocked = true;
                  activeMatch.juryPressStats = compileJuryPressStats(activeMatch.logs);

                  activeMatch.logs.unshift({
                    id: Math.random().toString(36).substring(7),
                    timestamp: Date.now(),
                    round: activeMatch.activeRound,
                    fighter: winnerColor,
                    description: `MENANG WMP! Wasit menghentikan pertandingan pada Babak ${activeMatch.activeRound === 2 ? "II" : "III"} karena selisih nilai mencapai >= ${wmpThreshold} poin (${categoryLabel}) antara sudut Merah dan Biru selama 1 menit (60 S). Pemenang: ${winnerName} (Sudut ${winnerColor === "RED" ? "Merah" : "Biru"}).`,
                    points: 0,
                    source: "Wasit / Sistem WMP",
                    type: "SYSTEM"
                  });

                  // Automatically archive finished match into schedule history
                  archiveActiveMatchToSchedule(winnerColor === "RED" ? "MERAH" : "BIRU");

                  // Clear the running interval
                  if (matchInterval) {
                    clearInterval(matchInterval);
                    matchInterval = null;
                  }

                  if (autoAdvanceTimer) {
                    clearTimeout(autoAdvanceTimer);
                    autoAdvanceTimer = null;
                  }
                  autoAdvanceTimer = setTimeout(() => {
                    if (activeMatch.status === MatchStatus.FINISHED) {
                      console.log("OTOMATIS BERALIH: Durasi selebrasi selesai, memuat partai selanjutnya...");
                      loadNextMatch();
                      broadcastState();
                    }
                  }, 10000);

                  broadcastState();
                  return;
                }
              } else {
                // Score difference less than threshold, reset tracking
                activeMatch.losingCornerColor = null;
                activeMatch.lastLosingScore = undefined;
                activeMatch.losingCornerNoScoreDuration = 0;
              }
            } else {
              // Not round 2 or 3, reset tracking
              activeMatch.losingCornerColor = null;
              activeMatch.lastLosingScore = undefined;
              activeMatch.losingCornerNoScoreDuration = 0;
            }

            // Clean up old visual jury light presses after 2000ms
            const now = Date.now();
            [1, 2, 3].forEach(juryId => {
              const press = activeMatch.activeJuryPresses[juryId];
              if (press && (now - press.pressedAt) > 2000) {
                activeMatch.activeJuryPresses[juryId] = null;
              }
            });

            if (activeMatch.timeLeft > 0) {
              broadcastState();
              return;
            }
          }

          if (activeMatch.timeLeft <= 0) {
            // End of round automatically
            activeMatch.status = MatchStatus.PAUSED;
            activeMatch.showRoundOverPopup = true;
            activeMatch.dewanPanelLocked = true; // Automatically lock dewan panel when round finishes
            activeMatch.logs.unshift({
              id: Math.random().toString(36).substring(7),
              timestamp: Date.now(),
              round: activeMatch.activeRound,
              fighter: "RED",
              description: `WAKTU HABIS! Ronde ${activeMatch.activeRound} Selesai.`,
              points: 0,
              source: "Sistem",
              type: "SYSTEM"
            });
            
            // On round end, automatically reset physical infractions except warnings and notify secretary
            if (activeMatch.activeRound < activeMatch.roundCount) {
              endCurrentRoundPenalties();
              activeMatch.secretarySignalNextRound = true;
            }
            
            // auto process winner and next schedules if final round completed
            if (activeMatch.activeRound === activeMatch.roundCount) {
              processMatchFinish();
            } else {
              broadcastState();
            }

            clearInterval(matchInterval!);
            matchInterval = null;
          }
        } else {
          broadcastState();
          clearInterval(matchInterval!);
          matchInterval = null;
        }
      }, 1000);
    }
  } else {
    if (matchInterval) {
      clearInterval(matchInterval);
      matchInterval = null;
    }
    broadcastState();
  }
}

// Periodic background check to clear visual jury press animations (2000ms retention)
setInterval(() => {
  const now = Date.now();
  let changed = false;
  [1, 2, 3].forEach(jId => {
    const press = activeMatch.activeJuryPresses[jId];
    if (press && (now - press.pressedAt) > 2000) {
      activeMatch.activeJuryPresses[jId] = null;
      changed = true;
    }
  });
  if (changed) {
    broadcastState();
  }
}, 80);

// API Routes definitions
app.get("/api/match-state", (req, res) => {
  updateJuryConnections();
  if (activeMatch.status === MatchStatus.RUNNING && activeMatch.timerEndAt && activeMatch.timerEndAt > 0) {
    activeMatch.timeLeft = Math.max(0, Math.ceil((activeMatch.timerEndAt - Date.now()) / 1000));
  }
  res.json(activeMatch);
});

app.post("/api/jury/ping", (req, res) => {
  const { juryId } = req.body;
  const idValue = Number(juryId);
  if (idValue >= 1 && idValue <= 3) {
    let ip = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1";
    if (ip.includes(",")) {
      ip = ip.split(",")[0].trim();
    }
    if (ip === "::ffff:127.0.0.1" || ip === "::1") {
      ip = "127.0.0.1";
    }
    juryPings[idValue] = {
      ip: ip,
      lastSeen: Date.now()
    };
  }
  res.json({ success: true });
});

app.post("/api/device/ping", (req, res) => {
  const { deviceId } = req.body;
  if (typeof deviceId === "string" && deviceId.trim()) {
    let ip = req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "127.0.0.1";
    if (ip.includes(",")) {
      ip = ip.split(",")[0].trim();
    }
    if (ip === "::ffff:127.0.0.1" || ip === "::1") {
      ip = "127.0.0.1";
    }
    devicePings[deviceId.trim()] = {
      ip: ip,
      lastSeen: Date.now()
    };
    updateJuryConnections();
  }
  res.json({ success: true });
});

// Server info endpoint to get local network IPs
app.get("/api/server-info", (req, res) => {
  const ips: string[] = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  res.json({
    ips: ips.length > 0 ? ips : ["127.0.0.1"],
    port: PORT
  });
});

// Authentication & User Management API Routes
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const ip = getRequestIp(req);
  const result = loginUser(username, password, ip);
  if (!result.success) {
    return res.status(401).json(result);
  }
  res.json(result);
});

app.post("/api/auth/register", (req, res) => {
  const ip = getRequestIp(req);
  const result = registerUser(req.body || {}, ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get("/api/users/list", (req, res) => {
  const users = getAllUsers();
  res.json(users);
});

app.post("/api/users/approve", (req, res) => {
  const { userId, approvedBy } = req.body || {};
  const ip = getRequestIp(req);
  const result = approveUser(userId, approvedBy || "Super Admin", ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post("/api/users/reject", (req, res) => {
  const { userId, rejectedBy } = req.body || {};
  const ip = getRequestIp(req);
  const result = rejectUser(userId, rejectedBy || "Super Admin", ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post("/api/users/create", (req, res) => {
  const { username, password, fullName, role, organization, emailOrPhone, createdBy } = req.body || {};
  const ip = getRequestIp(req);
  const result = createUserByAdmin(
    { username, password, fullName, role, organization, emailOrPhone },
    createdBy || "Super Admin",
    ip
  );
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post("/api/users/update", (req, res) => {
  const { userId, updates, updatedBy } = req.body || {};
  const ip = getRequestIp(req);
  const result = updateUserByAdmin(userId, updates || {}, updatedBy || "Super Admin", ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post("/api/users/reset-password", (req, res) => {
  const { userId, newPassword, resetBy } = req.body || {};
  const ip = getRequestIp(req);
  const result = resetPasswordByAdmin(userId, newPassword, resetBy || "Super Admin", ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.delete("/api/users/:id", (req, res) => {
  const userId = req.params.id;
  const deletedBy = (req.query.deletedBy as string) || "Super Admin";
  const ip = getRequestIp(req);
  const result = deleteUserByAdmin(userId, deletedBy, ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get("/api/users/activity-logs", (req, res) => {
  const logs = getActivityLogs();
  res.json(logs);
});

// Password Reset Workflow Endpoints
app.post("/api/auth/forgot-password-request", (req, res) => {
  const { username, emailOrPhone } = req.body || {};
  const ip = getRequestIp(req);
  const result = createPasswordResetRequest(username, emailOrPhone, ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get("/api/auth/reset-requests", (req, res) => {
  const requests = getPasswordResetRequests();
  res.json(requests);
});

app.post("/api/auth/approve-reset-request", (req, res) => {
  const { requestId, approvedBy } = req.body || {};
  const ip = getRequestIp(req);
  const result = approvePasswordResetRequest(requestId, approvedBy || "Super Admin", ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post("/api/auth/reject-reset-request", (req, res) => {
  const { requestId, rejectedBy } = req.body || {};
  const ip = getRequestIp(req);
  const result = rejectPasswordResetRequest(requestId, rejectedBy || "Super Admin", ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get("/api/auth/verify-reset-token", (req, res) => {
  const token = (req.query.token as string) || "";
  const result = verifyResetToken(token);
  if (!result.valid) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post("/api/auth/reset-password-with-token", (req, res) => {
  const { token, newPassword } = req.body || {};
  const ip = getRequestIp(req);
  const result = resetPasswordWithToken(token, newPassword, ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Client IP & IP Unlock Management API Routes
app.get("/api/auth/client-ip", (req, res) => {
  const ip = getRequestIp(req);
  res.json({ ip });
});

app.post("/api/auth/ip-unlock-request", (req, res) => {
  const { username, requestedIp, reason, emailOrPhone } = req.body || {};
  const ip = getRequestIp(req);
  const result = createIpUnlockRequest(username, requestedIp || ip, reason, emailOrPhone, ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get("/api/auth/ip-unlock-requests", (req, res) => {
  const requests = getIpUnlockRequests();
  res.json(requests);
});

app.post("/api/auth/approve-ip-unlock", (req, res) => {
  const { requestId, approvedBy, actionType } = req.body || {};
  const ip = getRequestIp(req);
  const result = approveIpUnlockRequest(requestId, approvedBy || "Super Admin", actionType || "SET_NEW_IP", ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post("/api/auth/reject-ip-unlock", (req, res) => {
  const { requestId, rejectedBy } = req.body || {};
  const ip = getRequestIp(req);
  const result = rejectIpUnlockRequest(requestId, rejectedBy || "Super Admin", ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post("/api/users/reset-bound-ip", (req, res) => {
  const { userId, resetBy } = req.body || {};
  const ip = getRequestIp(req);
  const result = resetUserBoundIp(userId, resetBy || "Super Admin", ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post("/api/users/update-bound-ip", (req, res) => {
  const { userId, customIp, updatedBy } = req.body || {};
  const ip = getRequestIp(req);
  const result = updateUserBoundIp(userId, customIp, updatedBy || "Super Admin", ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post("/api/users/toggle-ip-lock", (req, res) => {
  const { userId, enabled, updatedBy } = req.body || {};
  const ip = getRequestIp(req);
  const result = toggleUserIpLock(userId, !!enabled, updatedBy || "Super Admin", ip);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});


// SSE endpoint for real-time streaming state
app.get("/api/match-state/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  
  if (activeMatch.status === MatchStatus.RUNNING && activeMatch.timerEndAt && activeMatch.timerEndAt > 0) {
    activeMatch.timeLeft = Math.max(0, Math.ceil((activeMatch.timerEndAt - Date.now()) / 1000));
  }
  // Send current state immediately on connection
  res.write(`data: ${JSON.stringify(activeMatch)}\n\n`);
  
  sseClients.push(res);
  
  req.on("close", () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

// Update metadata (Event name, athletes, etc.)
app.post("/api/match-state/update", (req, res) => {
  const { 
    eventName, 
    fighterRedName, 
    fighterRedClub, 
    fighterBlueName, 
    fighterBlueClub, 
    classCategory, 
    matchNumber, 
    roundCount, 
    roundDuration,
    timeLeft,
    logoLeft,
    logoRight,
    gender,
    stage,
    showRoundOverPopup,
    showNextMatchPopup,
    projectionMode,
    juryPanelLocked,
    dewanPanelLocked,
    secretarySignalNextRound,
    division,
    wmpThreshold,
    status,
    winnerPublished,
    winnerColor,
    winnerMethod,
    isTieExtendedPossible
  } = req.body;

  if (eventName !== undefined) activeMatch.eventName = eventName;
  if (fighterRedName !== undefined) activeMatch.fighterRedName = fighterRedName;
  if (fighterRedClub !== undefined) activeMatch.fighterRedClub = fighterRedClub;
  if (fighterBlueName !== undefined) activeMatch.fighterBlueName = fighterBlueName;
  if (fighterBlueClub !== undefined) activeMatch.fighterBlueClub = fighterBlueClub;
  if (classCategory !== undefined) activeMatch.classCategory = classCategory;
  if (matchNumber !== undefined) activeMatch.matchNumber = matchNumber;
  if (roundCount !== undefined) activeMatch.roundCount = Number(roundCount);
  if (logoLeft !== undefined) activeMatch.logoLeft = logoLeft;
  if (logoRight !== undefined) activeMatch.logoRight = logoRight;
  if (gender !== undefined) activeMatch.gender = gender;
  if (stage !== undefined) activeMatch.stage = stage;
  if (showRoundOverPopup !== undefined) activeMatch.showRoundOverPopup = showRoundOverPopup;
  if (showNextMatchPopup !== undefined) activeMatch.showNextMatchPopup = showNextMatchPopup;
  if (juryPanelLocked === false) {
    activeMatch.showNextMatchPopup = false;
    activeMatch.showRoundOverPopup = false;
    activeMatch.juryPanelLocked = false;
  }
  if (projectionMode !== undefined) activeMatch.projectionMode = projectionMode;
  if (timeLeft !== undefined) activeMatch.timeLeft = Number(timeLeft);
  if (juryPanelLocked !== undefined) activeMatch.juryPanelLocked = !!juryPanelLocked;
  if (dewanPanelLocked !== undefined) activeMatch.dewanPanelLocked = !!dewanPanelLocked;
  if (secretarySignalNextRound !== undefined) activeMatch.secretarySignalNextRound = !!secretarySignalNextRound;
  if (division !== undefined) {
    activeMatch.division = division;
    if (wmpThreshold === undefined) {
      const upperDiv = String(division).toUpperCase();
      activeMatch.wmpThreshold =
        upperDiv.includes("USIA DINI") ||
        upperDiv.includes("USIADINI") ||
        upperDiv.includes("PRA REMAJA") ||
        upperDiv.includes("PRA-REMAJA") ||
        upperDiv.includes("PRAREMAJA")
          ? 20
          : 30;
    }
  }
  if (wmpThreshold !== undefined) {
    activeMatch.wmpThreshold = Number(wmpThreshold) === 20 ? 20 : 30;
  }
  if (winnerPublished !== undefined) activeMatch.winnerPublished = !!winnerPublished;
  if (winnerColor !== undefined) activeMatch.winnerColor = winnerColor;
  if (winnerMethod !== undefined) activeMatch.winnerMethod = winnerMethod;
  if (isTieExtendedPossible !== undefined) activeMatch.isTieExtendedPossible = !!isTieExtendedPossible;
  if (status !== undefined) {
    activeMatch.status = status;
    checkRunningTimer();
  }
  
  if (roundDuration !== undefined) {
    activeMatch.roundDuration = Number(roundDuration);
    if (activeMatch.status === MatchStatus.IDLE) {
      activeMatch.timeLeft = Number(roundDuration);
    }
  }

  recalculateScores();

  activeMatch.logs.unshift({
    id: Math.random().toString(36).substring(7),
    timestamp: Date.now(),
    round: activeMatch.activeRound,
    fighter: "RED",
    description: "Detail data pertandingan diperbarui oleh Sekretaris / Dewan",
    points: 0,
    source: "Sekretaris",
    type: "SYSTEM"
  });

  broadcastState();
  res.json(activeMatch);
});

// Dismiss popup endpoint specifically
app.post("/api/match-state/dismiss-popup", (req, res) => {
  activeMatch.showRoundOverPopup = false;
  broadcastState();
  res.json(activeMatch);
});

// Restore full match state from client autosave
app.post("/api/match-state/restore", (req, res) => {
  const { state } = req.body || {};
  if (state && typeof state === "object") {
    activeMatch = {
      ...activeMatch,
      ...state
    };
    checkRunningTimer();
    broadcastState();
    return res.json({ success: true, activeMatch });
  }
  return res.status(400).json({ error: "State tidak valid" });
});

// Reset match data completely for a clean party
app.post("/api/match-state/reset", (req, res) => {
  activeMatch = {
    id: "match-1",
    eventName: req.body.eventName || "",
    fighterRedName: req.body.fighterRedName || "",
    fighterRedClub: req.body.fighterRedClub || "",
    fighterBlueName: req.body.fighterBlueName || "",
    fighterBlueClub: req.body.fighterBlueClub || "",
    classCategory: req.body.classCategory || "",
    matchNumber: req.body.matchNumber || "",
    roundCount: Number(req.body.roundCount) || 3,
    activeRound: 1,
    roundDuration: Number(req.body.roundDuration) || 120,
    timeLeft: Number(req.body.roundDuration) || 120,
    status: MatchStatus.IDLE,
    scoreRed: 0,
    scoreBlue: 0,
    redStats: { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 },
    blueStats: { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 },
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
    activeJuryPresses: { 1: null, 2: null, 3: null },
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
    secretarySignalNextRound: false,
    juryPanelLocked: true,
    dewanPanelLocked: true,
    logoLeft: req.body.logoLeft || req.body.logoSisiKiri || "",
    logoRight: req.body.logoRight || req.body.logoSisiKanan || "",
    gender: req.body.gender || "PUTRA",
    stage: req.body.stage || "PENYISIHAN",
    projectionMode: false,
    division: req.body.division || "DEWASA",
    losingCornerNoScoreDuration: 0,
    losingCornerColor: null,
    lastLosingScore: undefined,
    winnerPublished: false,
    winnerColor: null,
    winnerMethod: undefined,
    isTieExtendedPossible: false,
    logs: [
      {
        id: "reset-" + Date.now(),
        timestamp: Date.now(),
        round: 1,
        fighter: "RED",
        description: "Pertandingan diatur ulang / mulai baru.",
        points: 0,
        source: "Sistem",
        type: "SYSTEM"
      }
    ]
  };
  juryPressHistory = [];
  checkRunningTimer();
  res.json(activeMatch);
});

// Timer play/pause and time controls
app.post("/api/match-state/timer", (req, res) => {
  const { command, timerEndAt, timerStartedAt, timeLeft } = req.body || {};
  const now = Date.now();
  if (command === "START") {
    if (typeof timeLeft === "number" && timeLeft > 0) {
      activeMatch.timeLeft = timeLeft;
    } else if (!activeMatch.timeLeft || activeMatch.timeLeft <= 0) {
      activeMatch.timeLeft = activeMatch.roundDuration || 120;
    }
    activeMatch.status = MatchStatus.RUNNING;
    activeMatch.timerStartedAt = typeof timerStartedAt === "number" && timerStartedAt > 0 ? timerStartedAt : now;
    activeMatch.timerEndAt =
      typeof timerEndAt === "number" && timerEndAt > 0
        ? timerEndAt
        : now + activeMatch.timeLeft * 1000;
    activeMatch.timeLeft = Math.max(0, Math.ceil((activeMatch.timerEndAt - now) / 1000));
    activeMatch.juryPanelLocked = false; // Automatically unlock!
    activeMatch.dewanPanelLocked = false; // Automatically unlock!
    activeMatch.showRoundOverPopup = false; // Automatically hide round over popup on start
    activeMatch.showNextMatchPopup = false; // Automatically hide next match popup on start
    activeMatch.winnerPublished = false;
    activeMatch.winnerColor = null;
    activeMatch.winnerMethod = undefined;
    activeMatch.isTieExtendedPossible = false;
    // Bersihkan status diskualifikasi lama saat memulai waktu pertandingan
    if (activeMatch.redPenalties) activeMatch.redPenalties.disqualified = false;
    if (activeMatch.bluePenalties) activeMatch.bluePenalties.disqualified = false;
    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: now,
      round: activeMatch.activeRound,
      fighter: "RED",
      description: `WAKTU DIMULAI - Ronde ${activeMatch.activeRound}!`,
      points: 0,
      source: "Sistem",
      type: "SYSTEM"
    });
  } else if (command === "PAUSE") {
    if (typeof timeLeft === "number" && timeLeft >= 0) {
      activeMatch.timeLeft = timeLeft;
    } else if (activeMatch.status === MatchStatus.RUNNING && activeMatch.timerEndAt) {
      activeMatch.timeLeft = Math.max(0, Math.ceil((activeMatch.timerEndAt - now) / 1000));
    }
    activeMatch.status = MatchStatus.PAUSED;
    activeMatch.timerEndAt = null;
    activeMatch.timerStartedAt = null;
    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: now,
      round: activeMatch.activeRound,
      fighter: "RED",
      description: "WAKTU DIHENTIKAN!",
      points: 0,
      source: "Sistem",
      type: "SYSTEM"
    });
  } else if (command === "ADD_10") {
    const baseTime =
      activeMatch.status === MatchStatus.RUNNING && activeMatch.timerEndAt
        ? Math.max(0, Math.ceil((activeMatch.timerEndAt - now) / 1000))
        : activeMatch.timeLeft;
    activeMatch.timeLeft =
      typeof timeLeft === "number" ? timeLeft : Math.min(activeMatch.roundDuration, baseTime + 10);
    if (activeMatch.status === MatchStatus.RUNNING) {
      activeMatch.timerStartedAt = typeof timerStartedAt === "number" && timerStartedAt > 0 ? timerStartedAt : now;
      activeMatch.timerEndAt =
        typeof timerEndAt === "number" && timerEndAt > 0
          ? timerEndAt
          : now + activeMatch.timeLeft * 1000;
    } else {
      activeMatch.timerEndAt = null;
      activeMatch.timerStartedAt = null;
    }
  } else if (command === "SUB_10") {
    const baseTime =
      activeMatch.status === MatchStatus.RUNNING && activeMatch.timerEndAt
        ? Math.max(0, Math.ceil((activeMatch.timerEndAt - now) / 1000))
        : activeMatch.timeLeft;
    activeMatch.timeLeft = typeof timeLeft === "number" ? timeLeft : Math.max(0, baseTime - 10);
    if (activeMatch.status === MatchStatus.RUNNING) {
      activeMatch.timerStartedAt = typeof timerStartedAt === "number" && timerStartedAt > 0 ? timerStartedAt : now;
      activeMatch.timerEndAt =
        typeof timerEndAt === "number" && timerEndAt > 0
          ? timerEndAt
          : now + activeMatch.timeLeft * 1000;
    } else {
      activeMatch.timerEndAt = null;
      activeMatch.timerStartedAt = null;
    }
  }

  checkRunningTimer();
  broadcastState();
  res.json(activeMatch);
});

// Round switching endpoint
app.post("/api/match-state/round", (req, res) => {
  const { roundAction, targetRound } = req.body;
  
  // Clear secretary next round signal
  activeMatch.secretarySignalNextRound = false;
  activeMatch.juryPanelLocked = false; // Automatically unlock!
  activeMatch.showRoundOverPopup = false; // Automatically hide round over popup on round change

  if (roundAction === "NEXT") {
    if (activeMatch.activeRound < activeMatch.roundCount) {
      endCurrentRoundPenalties();
      activeMatch.activeRound++;
      activeMatch.timeLeft = activeMatch.roundDuration;
      activeMatch.status = MatchStatus.IDLE;
      activeMatch.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        round: activeMatch.activeRound,
        fighter: "RED",
        description: `Beralih ke Ronde ${activeMatch.activeRound}. Siap!`,
        points: 0,
        source: "Sistem",
        type: "SYSTEM"
      });
    }
  } else if (roundAction === "SET" && targetRound) {
    const tRound = Number(targetRound);
    if (tRound !== activeMatch.activeRound) {
      endCurrentRoundPenalties();
    }
    activeMatch.activeRound = tRound;
    activeMatch.timeLeft = activeMatch.roundDuration;
    activeMatch.status = MatchStatus.IDLE;
    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      round: activeMatch.activeRound,
      fighter: "RED",
      description: `Babak disetel ke Ronde ${targetRound} oleh Ketua Pertandingan`,
      points: 0,
      source: "Ketua Pertandingan",
      type: "SYSTEM"
    });
  } else if (roundAction === "FINISH") {
    processMatchFinish();
  }

  checkRunningTimer();
  broadcastState();
  res.json(activeMatch);
});

// Secretary: Publish/Announce Winner to visual monitoring panel
app.post("/api/match-state/publish-winner", (req, res) => {
  activeMatch.winnerPublished = true;
  broadcastState();
  res.json(activeMatch);
});

// Secretary: Archive current match and advance to next partai match
app.post("/api/match-state/next-match", (req, res) => {
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }
  const actualId = activeMatch.id.startsWith("match-") ? activeMatch.id.replace("match-", "") : activeMatch.id;
  let currentIdx = matchesSchedule.findIndex(m => m.id === actualId || m.matchNumber === activeMatch.matchNumber);
  
  const winnerSide = activeMatch.winnerColor === "RED" 
    ? "MERAH" 
    : (activeMatch.winnerColor === "BLUE" 
        ? "BIRU" 
        : (activeMatch.scoreRed > activeMatch.scoreBlue ? "MERAH" : (activeMatch.scoreBlue > activeMatch.scoreRed ? "BIRU" : undefined)));

  const juryStats = compileJuryPressStats(activeMatch.logs);
  activeMatch.juryPressStats = juryStats;

  if (currentIdx !== -1) {
    matchesSchedule[currentIdx].status = "SELESAI" as any;
    if (winnerSide) {
      matchesSchedule[currentIdx].winner = winnerSide;
    }
    // Archive final scores, stats and metadata
    matchesSchedule[currentIdx].scoreRed = activeMatch.scoreRed;
    matchesSchedule[currentIdx].scoreBlue = activeMatch.scoreBlue;
    matchesSchedule[currentIdx].redStats = activeMatch.redStats ? { ...activeMatch.redStats } : undefined;
    matchesSchedule[currentIdx].blueStats = activeMatch.blueStats ? { ...activeMatch.blueStats } : undefined;
    matchesSchedule[currentIdx].fighterRedName = activeMatch.fighterRedName;
    matchesSchedule[currentIdx].fighterBlueName = activeMatch.fighterBlueName;
    matchesSchedule[currentIdx].fighterRedClub = activeMatch.fighterRedClub;
    matchesSchedule[currentIdx].fighterBlueClub = activeMatch.fighterBlueClub;
    matchesSchedule[currentIdx].classCategory = activeMatch.classCategory;
    matchesSchedule[currentIdx].juryPressStats = { ...juryStats };
    matchesSchedule[currentIdx].logs = activeMatch.logs ? JSON.parse(JSON.stringify(activeMatch.logs)) : [];

    if (winnerSide) {
      const matchObj = matchesSchedule[currentIdx];
      const winId = winnerSide === "MERAH" ? matchObj.fighterRedId : matchObj.fighterBlueId;
      const winName = winnerSide === "MERAH" ? (matchObj.fighterRedName || activeMatch.fighterRedName) : (matchObj.fighterBlueName || activeMatch.fighterBlueName);
      const winClub = winnerSide === "MERAH" ? (matchObj.fighterRedClub || activeMatch.fighterRedClub) : (matchObj.fighterBlueClub || activeMatch.fighterBlueClub);
      propagateWinnerAcrossSchedules(matchObj.id, actualId, winId, winName, winClub, matchObj.categoryClassId, matchObj.gender);
    }
  } else {
    // Archive standalone / unlisted match into schedule history
    matchesSchedule.push({
      id: actualId || "archived-" + Date.now(),
      matchNumber: activeMatch.matchNumber || "Partai 1",
      stage: (activeMatch.stage as any) || "PENYISIHAN",
      gender: (activeMatch.gender as any) || "PUTRA",
      status: "SELESAI" as any,
      winner: winnerSide,
      scoreRed: activeMatch.scoreRed,
      scoreBlue: activeMatch.scoreBlue,
      redStats: activeMatch.redStats ? { ...activeMatch.redStats } : undefined,
      blueStats: activeMatch.blueStats ? { ...activeMatch.blueStats } : undefined,
      fighterRedName: activeMatch.fighterRedName,
      fighterBlueName: activeMatch.fighterBlueName,
      fighterRedClub: activeMatch.fighterRedClub,
      fighterBlueClub: activeMatch.fighterBlueClub,
      classCategory: activeMatch.classCategory,
      division: activeMatch.division || "DEWASA",
      juryPressStats: { ...juryStats },
      logs: activeMatch.logs ? JSON.parse(JSON.stringify(activeMatch.logs)) : []
    });
  }
  loadNextMatch();
  broadcastState();
  res.json(activeMatch);
});

// Secretary: Transition to Babak 4 (Overtime/Extended) in case of a perfect draw
app.post("/api/match-state/add-round-4", (req, res) => {
  activeMatch.roundCount = 4;
  activeMatch.activeRound = 4;
  activeMatch.timeLeft = activeMatch.roundDuration;
  activeMatch.status = MatchStatus.PAUSED;
  activeMatch.showRoundOverPopup = false;
  activeMatch.winnerPublished = false;
  activeMatch.isTieExtendedPossible = false;
  activeMatch.winnerColor = null;
  activeMatch.winnerMethod = undefined;
  activeMatch.logs.unshift({
    id: Math.random().toString(36).substring(7),
    timestamp: Date.now(),
    round: 4,
    fighter: "RED",
    description: "BABAK TAMBAHAN KE-4 DIMULAI! Nilai Prestasi Teknik & Hukuman Kedua Pesilat Sama Seimbang di Akhir Babak 3.",
    points: 0,
    source: "Sistem Keputusan",
    type: "SYSTEM"
  });
  broadcastState();
  res.json(activeMatch);
});

// Server-side anti-bounce and consensus deduplication maps
const lastServerJuryPressByKey: Record<string, number> = {};
const lastServerConsensusByCombo: Record<string, number> = {};
const seenServerPressIds = new Set<string>();

// Jury button press endpoint with Consensus Logic
app.post("/api/jury/press", (req, res) => {
  const { juryId, fighter, action, pressId } = req.body;
  const jIdNum = Number(juryId);
  const now = Date.now();
  const CONSENSUS_WINDOW_MS = 2000; // Toleransi waktu sinkronisasi konsensus juri: max 2 detik (2000 ms)

  // Strict server-side anti-bounce guard: prevent 1 physical tap from registering multiple times
  if (pressId && typeof pressId === "string") {
    if (seenServerPressIds.has(pressId)) {
      return res.json(activeMatch);
    }
    seenServerPressIds.add(pressId);
    if (seenServerPressIds.size > 500) {
      const first = seenServerPressIds.values().next().value;
      if (first) seenServerPressIds.delete(first);
    }
  }

  const debounceComboKey = `${jIdNum}_${fighter}_${action}`;
  const debounceAnyKey = `${jIdNum}_ANY`;
  if (now - (lastServerJuryPressByKey[debounceComboKey] || 0) < 450) {
    return res.json(activeMatch);
  }
  if (now - (lastServerJuryPressByKey[debounceAnyKey] || 0) < 220) {
    return res.json(activeMatch);
  }
  lastServerJuryPressByKey[debounceComboKey] = now;
  lastServerJuryPressByKey[debounceAnyKey] = now;

  // Show active status indicator instantly on monitor
  activeMatch.activeJuryPresses[jIdNum] = {
    fighter,
    action,
    pressedAt: now,
    consumed: false
  } as any;

  // Schedule auto-clearing visual indicator on backend after 2 seconds
  setTimeout(() => {
    if (activeMatch.activeJuryPresses[jIdNum]?.pressedAt === now) {
      activeMatch.activeJuryPresses[jIdNum] = null;
      broadcastState();
    }
  }, 2000);

  if (activeMatch.status !== MatchStatus.RUNNING) {
    // If not running, record test log so officials can see the remote responds
    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: now,
      round: activeMatch.activeRound,
      fighter,
      description: `UJI COBA GAWAI: Juri ${jIdNum} menekan ${action === "PUNCH" ? "Pukulan" : "Tendangan"} ${fighter === "RED" ? "Merah" : "Biru"} (Status: ${activeMatch.status})`,
      points: action === "PUNCH" ? 1 : 2,
      source: `Juri ${jIdNum}`,
      type: action,
      uncounted: true
    });
    broadcastState();
    return res.json(activeMatch);
  }

  // Clear non-consumed presses older than 2.0 seconds
  juryPressHistory = juryPressHistory.filter(p => !p.consumed && (now - p.timestamp) <= CONSENSUS_WINDOW_MS);

  const currentPress: JuryPressHistory = {
    id: (typeof pressId === "string" && pressId) ? pressId : `press_${jIdNum}_${now}`,
    juryId: jIdNum,
    fighter,
    action,
    timestamp: now,
    consumed: false
  };
  juryPressHistory.push(currentPress);

  const pointValue = action === "PUNCH" ? 1 : 2;

  // Check if there is an active consensus log created recently (within 2 seconds) for the same event
  // where our juryId is not yet included (3-jury rapid join within 2s)
  const recentConsensusLog = activeMatch.logs.find(log => 
    !log.uncounted &&
    log.round === activeMatch.activeRound &&
    log.fighter === fighter &&
    log.type === action &&
    (now - log.timestamp) <= CONSENSUS_WINDOW_MS &&
    log.juryIds &&
    log.juryIds.length >= 2 &&
    log.juryIds.length < 3 &&
    !log.juryIds.includes(jIdNum)
  );

  if (recentConsensusLog && recentConsensusLog.juryIds) {
    // Add current jury to the existing consensus without adding extra points to total score
    recentConsensusLog.juryIds.push(jIdNum);
    recentConsensusLog.juryIds = Array.from(new Set(recentConsensusLog.juryIds)).sort();
    
    // Update labels
    recentConsensusLog.source = `Konsensus Juri (J${recentConsensusLog.juryIds.join(", J")})`;
    recentConsensusLog.description = `NILAI MASUK: Juri ${recentConsensusLog.juryIds.join(" & ")} setuju +${pointValue} Poin ${action === "PUNCH" ? "Pukulan" : "Tendangan"} ${fighter === "RED" ? "Merah" : "Biru"}!`;
    
    // Mark this press as consumed
    currentPress.consumed = true;
    if (activeMatch.activeJuryPresses[jIdNum]) {
      (activeMatch.activeJuryPresses[jIdNum] as any).consumed = true;
    }

    // Apply scores to round-by-round score cards for this jury
    if (!activeMatch.juryScores[jIdNum]) {
      activeMatch.juryScores[jIdNum] = {
        1: { red: 0, blue: 0 },
        2: { red: 0, blue: 0 },
        3: { red: 0, blue: 0 }
      };
    }
    const r = activeMatch.activeRound;
    if (!activeMatch.juryScores[jIdNum][r]) {
      activeMatch.juryScores[jIdNum][r] = { red: 0, blue: 0 };
    }
    if (fighter === "RED") {
      activeMatch.juryScores[jIdNum][r].red += pointValue;
    } else {
      activeMatch.juryScores[jIdNum][r].blue += pointValue;
    }

  } else {
    // Evaluate Consensus (Coincidence within 2.0 seconds / 2000ms of other unconsumed presses from distinct juries)
    const rawMatching = juryPressHistory.filter(p => 
      !p.consumed &&
      p.juryId !== currentPress.juryId &&
      p.fighter === fighter &&
      p.action === action &&
      (now - p.timestamp) <= CONSENSUS_WINDOW_MS
    );

    // Deduplicate matching presses by juryId (latest press per juryId)
    const byJury = new Map<number, JuryPressHistory>();
    rawMatching.forEach(p => {
      const prev = byJury.get(p.juryId);
      if (!prev || p.timestamp > prev.timestamp) {
        byJury.set(p.juryId, p);
      }
    });
    const matchingPresses = Array.from(byJury.values());

    if (matchingPresses.length > 0) {
      const comboCooldownKey = `${activeMatch.id}_${activeMatch.activeRound}_${fighter}_${action}`;
      const alreadyLoggedRecently = activeMatch.logs.some(
        log =>
          !log.uncounted &&
          log.round === activeMatch.activeRound &&
          log.fighter === fighter &&
          log.type === action &&
          Math.abs(now - log.timestamp) < 550
      );
      if (now - (lastServerConsensusByCombo[comboCooldownKey] || 0) < 550 || alreadyLoggedRecently) {
        currentPress.consumed = true;
        if (activeMatch.activeJuryPresses[jIdNum]) {
          (activeMatch.activeJuryPresses[jIdNum] as any).consumed = true;
        }
        rawMatching.forEach(p => {
          p.consumed = true;
          if (activeMatch.activeJuryPresses[p.juryId]) {
            (activeMatch.activeJuryPresses[p.juryId] as any).consumed = true;
          }
        });
        activeMatch.juryPressHistory = juryPressHistory;
        broadcastState();
        return res.json(activeMatch);
      }
      lastServerConsensusByCombo[comboCooldownKey] = now;

      // Consensus is reached within 2.0 seconds between current and matching presses!
      currentPress.consumed = true;
      if (activeMatch.activeJuryPresses[jIdNum]) {
        (activeMatch.activeJuryPresses[jIdNum] as any).consumed = true;
      }
      rawMatching.forEach(p => {
        p.consumed = true;
        if (activeMatch.activeJuryPresses[p.juryId]) {
          (activeMatch.activeJuryPresses[p.juryId] as any).consumed = true;
        }
      });

      const juryIdsInvolved = Array.from(new Set([currentPress.juryId, ...matchingPresses.map(p => p.juryId)])).sort();

      // Remove single uncounted logs for the presses involved in this consensus
      const pressIdsToRemove = [currentPress.id, ...rawMatching.map(p => p.id)];
      activeMatch.logs = activeMatch.logs.filter(log => {
        if (log.pressId && pressIdsToRemove.includes(log.pressId)) return false;
        if (
          log.uncounted &&
          log.round === activeMatch.activeRound &&
          log.fighter === fighter &&
          log.type === action &&
          (now - log.timestamp) <= CONSENSUS_WINDOW_MS &&
          juryIdsInvolved.some(id => log.source === `Juri ${id}`)
        ) {
          return false;
        }
        return true;
      });

      // Apply scores to cumulative stats
      if (fighter === "RED") {
        if (action === "PUNCH") activeMatch.redStats.punches++;
        else activeMatch.redStats.kicks++;
      } else {
        if (action === "PUNCH") activeMatch.blueStats.punches++;
        else activeMatch.blueStats.kicks++;
      }

      // Apply scores specifically to the individual round-by-round jury cards!
      juryIdsInvolved.forEach(id => {
        if (!activeMatch.juryScores[id]) {
          activeMatch.juryScores[id] = {
            1: { red: 0, blue: 0 },
            2: { red: 0, blue: 0 },
            3: { red: 0, blue: 0 }
          };
        }
        const r = activeMatch.activeRound;
        if (!activeMatch.juryScores[id][r]) {
          activeMatch.juryScores[id][r] = { red: 0, blue: 0 };
        }
        if (fighter === "RED") {
          activeMatch.juryScores[id][r].red += pointValue;
        } else {
          activeMatch.juryScores[id][r].blue += pointValue;
        }
      });

      // Record verified match log
      activeMatch.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: activeMatch.activeRound,
        fighter,
        description: `NILAI MASUK: Juri ${juryIdsInvolved.join(" & ")} setuju +${pointValue} Poin ${action === "PUNCH" ? "Pukulan" : "Tendangan"} ${fighter === "RED" ? "Merah" : "Biru"} (Konsensus <=2 Detik)!`,
        points: pointValue,
        source: `Konsensus Juri (J${juryIdsInvolved.join(", J")})`,
        type: action,
        uncounted: false,
        juryIds: juryIdsInvolved
      });

      recalculateScores();
    } else {
      // More than 2.0s or only one jury has pressed: not counted and goes to monitor log as uncounted attempt
      activeMatch.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: activeMatch.activeRound,
        fighter,
        description: `PERCOBAAN POIN: Juri ${jIdNum} menekan ${action === "PUNCH" ? "Pukulan" : "Tendangan"} ${fighter === "RED" ? "Merah" : "Biru"} (Menunggu Konsensus <=2 Detik)`,
        points: pointValue,
        source: `Juri ${jIdNum}`,
        type: action,
        uncounted: true,
        pressId: currentPress.id
      });
    }
  }

  activeMatch.juryPressHistory = juryPressHistory;
  broadcastState();
  res.json(activeMatch);
});

// Jury button backspace/undo endpoint
app.post("/api/jury/undo", (req, res) => {
  const { juryId, fighter } = req.body;
  const jId = Number(juryId);
  const r = activeMatch.activeRound;
  const now = Date.now();

  const isMatchingJuryScoreLog = (log: MatchLog) =>
    (log.type === "PUNCH" || log.type === "KICK") &&
    (!fighter || log.fighter === fighter) &&
    (log.uncounted ? log.source === `Juri ${jId}` : Boolean(log.juryIds && log.juryIds.includes(jId)));

  let logIndex = activeMatch.logs.findIndex(log => log.round === r && isMatchingJuryScoreLog(log));
  if (logIndex === -1) {
    logIndex = activeMatch.logs.findIndex(log => isMatchingJuryScoreLog(log));
  }

  if (activeMatch.activeJuryPresses && activeMatch.activeJuryPresses[jId]) {
    activeMatch.activeJuryPresses[jId] = null;
  }
  juryPressHistory = juryPressHistory.filter(p => p.juryId !== jId);
  activeMatch.juryPressHistory = juryPressHistory;

  if (logIndex !== -1) {
    const log = activeMatch.logs[logIndex];
    const targetFighter = log.fighter;
    const targetRound = log.round;
    const fLabel = targetFighter === "RED" ? "Merah" : "Biru";
    const pointValue = log.points;

    if (!log.uncounted && log.juryIds && log.juryIds.includes(jId)) {
      const remainingJuries = log.juryIds.filter(id => id !== jId);

      if (remainingJuries.length >= 2) {
        if (activeMatch.juryScores[jId] && activeMatch.juryScores[jId][targetRound]) {
          if (targetFighter === "RED") {
            activeMatch.juryScores[jId][targetRound].red = Math.max(0, activeMatch.juryScores[jId][targetRound].red - pointValue);
          } else {
            activeMatch.juryScores[jId][targetRound].blue = Math.max(0, activeMatch.juryScores[jId][targetRound].blue - pointValue);
          }
        }
        log.juryIds = remainingJuries;
        log.source = `Konsensus Juri (J${remainingJuries.join(", J")})`;
        log.description = `NILAI MASUK: Juri ${remainingJuries.join(" & ")} setuju +${pointValue} Poin ${log.type === "PUNCH" ? "Pukulan" : "Tendangan"} ${fLabel} (Konsensus <=2 Detik)!`;
      } else {
        log.juryIds.forEach(id => {
          if (activeMatch.juryScores[id] && activeMatch.juryScores[id][targetRound]) {
            if (targetFighter === "RED") {
              activeMatch.juryScores[id][targetRound].red = Math.max(0, activeMatch.juryScores[id][targetRound].red - pointValue);
            } else {
              activeMatch.juryScores[id][targetRound].blue = Math.max(0, activeMatch.juryScores[id][targetRound].blue - pointValue);
            }
          }
        });

        if (targetFighter === "RED") {
          if (log.type === "PUNCH") {
            activeMatch.redStats.punches = Math.max(0, activeMatch.redStats.punches - 1);
          } else {
            activeMatch.redStats.kicks = Math.max(0, activeMatch.redStats.kicks - 1);
          }
        } else {
          if (log.type === "PUNCH") {
            activeMatch.blueStats.punches = Math.max(0, activeMatch.blueStats.punches - 1);
          } else {
            activeMatch.blueStats.kicks = Math.max(0, activeMatch.blueStats.kicks - 1);
          }
        }

        if (remainingJuries.length === 1) {
          const remId = remainingJuries[0];
          log.uncounted = true;
          log.source = `Juri ${remId}`;
          delete log.juryIds;
          log.description = `PERCOBAAN POIN: Juri ${remId} menekan ${log.type === "PUNCH" ? "Pukulan" : "Tendangan"} ${fLabel} (Menunggu Konsensus <= 2 Detik)`;
        } else {
          activeMatch.logs.splice(logIndex, 1);
        }

        activeMatch.logs.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: now,
          round: targetRound,
          fighter: targetFighter,
          description: `BATAL POIN: Poin ${log.type === "PUNCH" ? "Pukulan" : "Tendangan"} ${fLabel} dibatalkan oleh Juri ${jId}.`,
          points: -pointValue,
          source: `Juri ${jId}`,
          type: "SYSTEM"
        });
      }
    } else {
      activeMatch.logs.splice(logIndex, 1);
    }

    recalculateScores();
    broadcastState();
  }

  res.json(activeMatch);
});

// Dewan / Chairperson Actions (Jatuhan, Kuncian, Penalties, Overrides & Verifikasi)
app.post("/api/dewan/action", (req, res) => {
  const { command, fighter, penaltyType, overridePoints } = req.body;
  const now = Date.now();
  const fLabel = fighter === "RED" ? "Merah" : "Biru";

  if (command === "DROP") {
    // Direct Jatuhan +3 points
    if (fighter === "RED") activeMatch.redStats.drops++;
    else activeMatch.blueStats.drops++;

    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: now,
      round: activeMatch.activeRound,
      fighter,
      description: `SKOR JATUHAN: +3 Poin Jatuhan untuk Pesilat ${fighter === "RED" ? "Merah" : "Biru"}!`,
      points: 3,
      source: "Dewan Pertandingan",
      type: "DROP"
    });
  } 
  
  else if (command === "CANCEL_DROP") {
    if (fighter === "RED") {
      if (activeMatch.redStats.drops > 0) activeMatch.redStats.drops--;
    } else {
      if (activeMatch.blueStats.drops > 0) activeMatch.blueStats.drops--;
    }

    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: now,
      round: activeMatch.activeRound,
      fighter,
      description: `BATAL JATUHAN: -3 Poin Jatuhan dibatalkan untuk Pesilat Sudut ${fLabel}!`,
      points: -3,
      source: "Dewan Pertandingan",
      type: "DROP"
    });
  } 
  
  else if (command === "LOCK") {
    // Direct Kuncian +3 points
    if (fighter === "RED") activeMatch.redStats.locks++;
    else activeMatch.blueStats.locks++;

    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: now,
      round: activeMatch.activeRound,
      fighter,
      description: `SKOR KUNCIAN: +3 Poin Kuncian untuk Pesilat ${fighter === "RED" ? "Merah" : "Biru"}!`,
      points: 3,
      source: "Dewan Pertandingan",
      type: "LOCK"
    });
  } 
  
  else if (command === "PENALTY") {
    const pTarget = fighter === "RED" ? activeMatch.redPenalties : activeMatch.bluePenalties;
    const cleanPenalty = (penaltyType || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    if (cleanPenalty === "binaan1") {
      pTarget.binaan1 = !pTarget.binaan1;
      activeMatch.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: activeMatch.activeRound,
        fighter,
        description: `BINAAN 1 ${pTarget.binaan1 ? "AKTIF" : "DIBATALKAN"} untuk Pesilat Sudut ${fLabel}!`,
        points: 0,
        source: "Dewan Pertandingan",
        type: "PENALTY"
      });
      if (!pTarget.binaan1) {
        const origLog = activeMatch.logs.find(l => 
          l.fighter === fighter && 
          l.round === activeMatch.activeRound && 
          l.type === "PENALTY" && 
          l.description && l.description.includes("BINAAN 1") && 
          l.description.includes("AKTIF") &&
          !l.uncounted
        );
        if (origLog) origLog.uncounted = true;
      }
    } 
    
    else if (cleanPenalty === "binaan2") {
      pTarget.binaan2 = !pTarget.binaan2;
      activeMatch.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: activeMatch.activeRound,
        fighter,
        description: `BINAAN 2 ${pTarget.binaan2 ? "AKTIF" : "DIBATALKAN"} untuk Pesilat Sudut ${fLabel}!`,
        points: 0,
        source: "Dewan Pertandingan",
        type: "PENALTY"
      });
      if (!pTarget.binaan2) {
        const origLog = activeMatch.logs.find(l => 
          l.fighter === fighter && 
          l.round === activeMatch.activeRound && 
          l.type === "PENALTY" && 
          l.description && l.description.includes("BINAAN 2") && 
          l.description.includes("AKTIF") &&
          !l.uncounted
        );
        if (origLog) origLog.uncounted = true;
      }
    } 
    
    else if (cleanPenalty === "teguran1") {
      pTarget.teguran1 = !pTarget.teguran1;
      activeMatch.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: activeMatch.activeRound,
        fighter,
        description: `TEGURAN 1 ${pTarget.teguran1 ? "AKTIF (-1)" : "DIBATALKAN"} untuk Pesilat Sudut ${fLabel}!`,
        points: pTarget.teguran1 ? -1 : 0,
        source: "Dewan Pertandingan",
        type: "PENALTY"
      });
      if (!pTarget.teguran1) {
        const origLog = activeMatch.logs.find(l => 
          l.fighter === fighter && 
          l.round === activeMatch.activeRound && 
          l.type === "PENALTY" && 
          l.description && l.description.includes("TEGURAN 1") && 
          l.description.includes("AKTIF") &&
          !l.uncounted
        );
        if (origLog) origLog.uncounted = true;
      }
    } 
    
    else if (cleanPenalty === "teguran2") {
      pTarget.teguran2 = !pTarget.teguran2;
      activeMatch.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: activeMatch.activeRound,
        fighter,
        description: `TEGURAN 2 ${pTarget.teguran2 ? "AKTIF (-2)" : "DIBATALKAN"} untuk Pesilat Sudut ${fLabel}!`,
        points: pTarget.teguran2 ? -2 : 0,
        source: "Dewan Pertandingan",
        type: "PENALTY"
      });
      if (!pTarget.teguran2) {
        const origLog = activeMatch.logs.find(l => 
          l.fighter === fighter && 
          l.round === activeMatch.activeRound && 
          l.type === "PENALTY" && 
          l.description && l.description.includes("TEGURAN 2") && 
          l.description.includes("AKTIF") &&
          !l.uncounted
        );
        if (origLog) origLog.uncounted = true;
      }
    } 
    
    else if (cleanPenalty === "peringatan1") {
      pTarget.peringatan1 = !pTarget.peringatan1;
      activeMatch.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: activeMatch.activeRound,
        fighter,
        description: `PERINGATAN 1 ${pTarget.peringatan1 ? "AKTIF (-5)" : "DIBATALKAN"} untuk Pesilat Sudut ${fLabel}!`,
        points: pTarget.peringatan1 ? -5 : 0,
        source: "Dewan Pertandingan",
        type: "PENALTY"
      });
      if (!pTarget.peringatan1) {
        const origLog = activeMatch.logs.find(l => 
          l.fighter === fighter && 
          l.round === activeMatch.activeRound && 
          l.type === "PENALTY" && 
          l.description && l.description.includes("PERINGATAN 1") && 
          l.description.includes("AKTIF") &&
          !l.uncounted
        );
        if (origLog) origLog.uncounted = true;
      }
    } 
    
    else if (cleanPenalty === "peringatan2") {
      pTarget.peringatan2 = !pTarget.peringatan2;
      activeMatch.logs.unshift({
        id: Math.random().toString(36).substring(7),
        timestamp: now,
        round: activeMatch.activeRound,
        fighter,
        description: `PERINGATAN 2 ${pTarget.peringatan2 ? "AKTIF (-10)" : "DIBATALKAN"} untuk Pesilat Sudut ${fLabel}!`,
        points: pTarget.peringatan2 ? -10 : 0,
        source: "Dewan Pertandingan",
        type: "PENALTY"
      });
      if (!pTarget.peringatan2) {
        const origLog = activeMatch.logs.find(l => 
          l.fighter === fighter && 
          l.round === activeMatch.activeRound && 
          l.type === "PENALTY" && 
          l.description && l.description.includes("PERINGATAN 2") && 
          l.description.includes("AKTIF") &&
          !l.uncounted
        );
        if (origLog) origLog.uncounted = true;
      }
    } 
    
    else if (cleanPenalty === "disqualified" || cleanPenalty === "diskualifikasi") {
      pTarget.disqualified = !pTarget.disqualified;
      if (pTarget.disqualified) {
        processMatchFinish();
      } else {
        activeMatch.status = MatchStatus.PAUSED;
        activeMatch.logs.unshift({
          id: Math.random().toString(36).substring(7),
          timestamp: now,
          round: activeMatch.activeRound,
          fighter,
          description: `DISKUALIFIKASI DIBATALKAN untuk Pesilat Sudut ${fLabel}!`,
          points: 0,
          source: "Dewan Pertandingan",
          type: "PENALTY"
        });
      }
    }
  } 
  
  else if (command === "OVERRIDE" && overridePoints !== undefined) {
    const val = Number(overridePoints);
    if (fighter === "RED") {
      activeMatch.redStats.overrides = (activeMatch.redStats.overrides || 0) + val;
      activeMatch.scoreRed = activeMatch.scoreRed + val;
    } else {
      activeMatch.blueStats.overrides = (activeMatch.blueStats.overrides || 0) + val;
      activeMatch.scoreBlue = activeMatch.scoreBlue + val;
    }

    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: now,
      round: activeMatch.activeRound,
      fighter,
      description: `KOREKSI NILAI PEMBINA: ${val > 0 ? "+" : ""}${val} nilai Sudut ${fLabel}.`,
      points: val,
      source: "Dewan/Ketua Pertandingan",
      type: "SYSTEM"
    });
  }

  else if (command === "RESET_ROUND_PENALTIES") {
    endCurrentRoundPenalties();
    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: now,
      round: activeMatch.activeRound,
      fighter: "RED",
      description: `HUKUMAN DIARSIPKAN (IPSI 2026): Teguran babak ini diarsipkan ke akumulasi pengurangan poin.`,
      points: 0,
      source: "Sekretaris Pertandingan",
      type: "SYSTEM"
    });
  }
  
  else if (command === "DECLARE_VICTORY") {
    const fWinnerName = fighter === "RED" ? activeMatch.fighterRedName : activeMatch.fighterBlueName;
    activeMatch.status = MatchStatus.FINISHED;
    activeMatch.winnerPublished = true;
    activeMatch.winnerColor = fighter;
    activeMatch.winnerMethod = penaltyType || "Keputusan Dewan";

    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: now,
      round: activeMatch.activeRound,
      fighter: fighter,
      description: `PERTANDINGAN SELESAI! PEMENANG RESMI: ${fWinnerName || "PESILAT"} Sudut ${fLabel} (${activeMatch.winnerMethod})`,
      points: 0,
      source: "Dewan Pertandingan",
      type: "SYSTEM"
    });

    archiveActiveMatchToSchedule(fighter === "RED" ? "MERAH" : "BIRU");

    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }
    autoAdvanceTimer = setTimeout(() => {
      if (activeMatch.status === MatchStatus.FINISHED) {
        console.log("OTOMATIS BERALIH: Durasi selebrasi selesai, memuat partai selanjutnya...");
        loadNextMatch();
        broadcastState();
      }
    }, 10000);
  }

  recalculateScores();
  res.json(activeMatch);
});

// Real-time "Verifikasi" endpoints
app.post("/api/match-state/verify/start", (req, res) => {
  const { type, corner, reason } = req.body; // "JATUHAN" | "PELANGGARAN", corner?: "RED" | "BLUE"
  
  activeMatch.verification = {
    active: true,
    type,
    corner: corner || null,
    reason: reason || "",
    votes: { 1: null, 2: null, 3: null },
    result: null,
    applied: false,
    timestamp: Date.now()
  };

  activeMatch.logs.unshift({
    id: Math.random().toString(36).substring(7),
    timestamp: Date.now(),
    round: activeMatch.activeRound,
    fighter: corner || "RED",
    description: `DEWAN MEMINTA VERIFIKASI: 【${type}】${corner ? ` Sudut ${corner === "RED" ? "Merah" : "Biru"}` : ""}. Menunggu vote J1, J2, J3.`,
    points: 0,
    source: "Dewan Pertandingan",
    type: "SYSTEM"
  });

  broadcastState();
  res.json(activeMatch);
});

app.post("/api/match-state/verify/vote", (req, res) => {
  const { juryId, vote } = req.body; // juryId: 1|2|3, vote: "MERAH" | "BIRU" | "TIDAK SAH"
  
  if (!activeMatch.verification || !activeMatch.verification.active) {
    return res.status(400).json({ error: "Sesi verifikasi tidak sedang aktif!" });
  }

  activeMatch.verification.votes[Number(juryId)] = vote;

  const votedScores = Object.values(activeMatch.verification.votes);
  const totalVotes = votedScores.filter(v => v !== null).length;

  const tallies = { MERAH: 0, BIRU: 0, "TIDAK SAH": 0 };
  votedScores.forEach(v => {
    if (v && tallies[v] !== undefined) tallies[v]++;
  });

  let reachedMajority: "MERAH" | "BIRU" | "TIDAK SAH" | null = null;
  if (tallies.MERAH >= 2) reachedMajority = "MERAH";
  else if (tallies.BIRU >= 2) reachedMajority = "BIRU";
  else if (tallies["TIDAK SAH"] >= 2) reachedMajority = "TIDAK SAH";
  else if (totalVotes === 3) reachedMajority = "TIDAK SAH"; // tie/split

  if (reachedMajority) {
    activeMatch.verification.result = reachedMajority;
  }

  broadcastState();
  res.json(activeMatch);
});

app.post("/api/match-state/verify/apply", (req, res) => {
  const { result } = req.body; // optional manual override from dewan
  if (!activeMatch.verification) {
    return res.status(400).json({ error: "Tidak ada data verifikasi aktif!" });
  }

  const finalDecision = result || activeMatch.verification.result || "TIDAK SAH";
  activeMatch.verification.result = finalDecision;
  activeMatch.verification.active = false;
  activeMatch.verification.applied = true;

  if (activeMatch.verification.type === "JATUHAN" && finalDecision !== "TIDAK SAH") {
    if (finalDecision === "MERAH") {
      activeMatch.redStats.drops++;
    } else {
      activeMatch.blueStats.drops++;
    }
    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      round: activeMatch.activeRound,
      fighter: finalDecision === "MERAH" ? "RED" : "BLUE",
      description: `HASIL VERIFIKASI: JATUHAN SAH untuk Pesilat ${finalDecision === "MERAH" ? "Merah" : "Biru"}! (+3 Poin)`,
      points: 3,
      source: "Sistem Verifikasi Juri",
      type: "DROP"
    });
    recalculateScores();
  } else {
    activeMatch.logs.unshift({
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      round: activeMatch.activeRound,
      fighter: "RED",
      description: `HASIL VERIFIKASI: Keputusan resmi adalah 【${
        finalDecision === "TIDAK SAH" ? "TIDAK SAH" : `${activeMatch.verification.type} SAH untuk ${finalDecision}`
      }】!`,
      points: 0,
      source: "Sistem Verifikasi Juri",
      type: "SYSTEM"
    });
  }

  broadcastState();
  res.json(activeMatch);
});

app.post("/api/match-state/verify/reset", (req, res) => {
  activeMatch.verification = undefined;
  broadcastState();
  res.json(activeMatch);
});

// ==========================================
// IPSI REGISTRATION & MATCH SCHEDULE MODULE
// ==========================================

let categories: any[] = [];

let participants: any[] = [];

interface ScheduleMatch {
  id: string;
  matchNumber: string;
  stage: string;
  categoryClassId?: string;
  fighterRedId?: string;
  fighterBlueId?: string;
  arena?: string;
  gender: string;
  status: "BELUM" | "SEDANG" | "SELESAI";
  winner?: "MERAH" | "BIRU";
  scoreRed?: number;
  scoreBlue?: number;
  redStats?: any;
  blueStats?: any;
  fighterRedName?: string;
  fighterBlueName?: string;
  fighterRedClub?: string;
  fighterBlueClub?: string;
  classCategory?: string;
  division?: string;
  juryPressStats?: any;
  logs?: MatchLog[];
}

let matchesSchedule: ScheduleMatch[] = [];

// -- Categories API
app.get("/api/categories", (req, res) => {
  res.json(categories);
});

app.post("/api/categories", (req, res) => {
  const { id, name, minWeight, maxWeight, division } = req.body;
  if (!name) return res.status(400).json({ error: "Nama kategori tidak boleh kosong" });

  if (id) {
    categories = categories.map(c => c.id === id ? { id, name, minWeight: Number(minWeight), maxWeight: Number(maxWeight), division } : c);
    res.json({ message: "Kategori berhasil diperbarui", categories });
  } else {
    const newCategory = {
      id: "cat-" + Date.now(),
      name,
      minWeight: Number(minWeight) || 0,
      maxWeight: Number(maxWeight) || 100,
      division: division || "Dewasa"
    };
    categories.push(newCategory);
    res.json({ message: "Kategori berhasil ditambahkan", categories });
  }
});

app.delete("/api/categories/:id", (req, res) => {
  categories = categories.filter(c => c.id !== req.params.id);
  res.json({ message: "Kategori berhasil dihapus", categories });
});

// -- Participants API
app.get("/api/participants", (req, res) => {
  res.json(participants);
});

app.post("/api/participants", (req, res) => {
  const { id, name, club, gender, categoryClassId, weight } = req.body;
  if (!name || !club || !categoryClassId) {
    return res.status(400).json({ error: "Kolom nama, kontingen, dan kelas wajib diisi" });
  }

  if (id) {
    participants = participants.map(p => p.id === id ? { id, name: name.toUpperCase(), club: club.toUpperCase(), gender, categoryClassId, weight: Number(weight) || 0 } : p);
    res.json({ message: "Peserta berhasil diperbarui", participants });
  } else {
    const newParticipant = {
      id: "p-" + Date.now(),
      name: name.toUpperCase(),
      club: club.toUpperCase(),
      gender: gender || "PUTRA",
      categoryClassId,
      weight: Number(weight) || 0
    };
    participants.push(newParticipant);
    res.json({ message: "Peserta berhasil ditambahkan", participants });
  }
});

app.delete("/api/participants/:id", (req, res) => {
  participants = participants.filter(p => p.id !== req.params.id);
  res.json({ message: "Peserta berhasil dihapus", participants });
});

// -- Match Schedules API
app.get("/api/matches-schedule", (req, res) => {
  res.json(matchesSchedule);
});

app.post("/api/matches-schedule", (req, res) => {
  const { id, matchNumber, stage, categoryClassId, fighterRedId, fighterBlueId, arena, gender, status } = req.body;
  if (!matchNumber || !categoryClassId || !fighterRedId || !fighterBlueId) {
    return res.status(400).json({ error: "Seluruh kolom partai wajib diisi lengkap!" });
  }

  const payload = {
    id: id || "m-" + Date.now(),
    matchNumber,
    stage: stage || "PENYISIHAN",
    categoryClassId,
    fighterRedId,
    fighterBlueId,
    arena: arena || "Gelanggang A",
    gender: gender || "PUTRA",
    status: status || "BELUM"
  };

  if (id) {
    matchesSchedule = matchesSchedule.map(m => m.id === id ? payload : m);
    res.json({ message: "Jadwal Pertandingan berhasil diperbarui", matchesSchedule });
  } else {
    matchesSchedule.push(payload);
    res.json({ message: "Jadwal Pertandingan berhasil didaftarkan", matchesSchedule });
  }
});

app.delete("/api/matches-schedule/:id", (req, res) => {
  matchesSchedule = matchesSchedule.filter(m => m.id !== req.params.id);
  res.json({ message: "Jadwal Pertandingan berhasil dihapus", matchesSchedule });
});

// -- Real-Time Athlete Registration & Schedule Auto-Generator API
app.post("/api/athletes/sync-one", (req, res) => {
  const { athlete } = req.body;
  if (!athlete || !athlete.name) {
    return res.status(400).json({ error: "Data atlet tidak valid" });
  }

  const athleteName = athlete.name.trim().toUpperCase();
  const athleteClub = (athlete.contingent || athlete.schoolOrClub || "KONTINGEN UMUM").trim().toUpperCase();
  const gender = athlete.gender === "PUTRI" ? "PUTRI" : "PUTRA";
  const category = athlete.category || "TANDING";
  const athleteId = athlete.id || "atl-" + Date.now();

  if (category === "TANDING") {
    // 1. Resolve or create category class
    let categoryName = "Kelas Bebas";
    let minW = 0;
    let maxW = 100;
    const classCat = athlete.classCategory || "";
    const matchClass = classCat.match(/Kelas\s+([A-Za-z0-9]+)/i);
    if (matchClass && matchClass[1]) {
      categoryName = `Kelas ${matchClass[1].toUpperCase()}`;
    } else if (athlete.weightTarget) {
      categoryName = `Kelas ${athlete.weightTarget}kg`;
    }

    const weightMatch = classCat.match(/\((\d+)\s*[-–]\s*(\d+)\s*kg\)/i);
    if (weightMatch) {
      minW = parseInt(weightMatch[1]);
      maxW = parseInt(weightMatch[2]);
    } else if (athlete.weightTarget) {
      minW = Math.max(0, Math.floor(athlete.weightTarget - 2.5));
      maxW = Math.ceil(athlete.weightTarget + 2.5);
    }

    let catClassId = "cat-kelas-a";
    if (athlete.categoryClassId) {
      catClassId = athlete.categoryClassId;
    } else if (matchClass && matchClass[1]) {
      catClassId = `cat-kelas-${matchClass[1].toLowerCase()}`;
    }

    let targetCat = categories.find(c => c.id === catClassId || c.name.toLowerCase() === categoryName.toLowerCase());
    if (!targetCat) {
      targetCat = {
        id: catClassId,
        name: categoryName,
        minWeight: minW,
        maxWeight: maxW,
        division: athlete.ageCategory || "Dewasa"
      };
      categories.push(targetCat);
    } else {
      targetCat.id = catClassId;
    }

    // 2. Register participant
    const existingPIdx = participants.findIndex(p => p.id === athleteId);
    const participantObj = {
      id: athleteId,
      name: athleteName,
      club: athleteClub,
      gender,
      categoryClassId: targetCat.id,
      weight: athlete.weightTarget || athlete.actualWeight || 0
    };

    if (existingPIdx >= 0) {
      participants[existingPIdx] = participantObj;
    } else {
      participants.push(participantObj);
    }

    // 3. Auto-pair or create schedule match
    // Check if there is an existing match waiting for blue corner in the same category & gender
    let matchedSlot = matchesSchedule.find(m => 
      m.categoryClassId === targetCat?.id && 
      m.gender === gender && 
      m.status === "BELUM" &&
      (!m.fighterBlueId || m.fighterBlueId === "KOSONG" || m.fighterBlueId.startsWith("placeholder-")) &&
      m.fighterRedId !== athleteId
    );

    let affectedMatch: ScheduleMatch | null = null;

    if (matchedSlot) {
      matchedSlot.fighterBlueId = athleteId;
      matchedSlot.fighterBlueName = athleteName;
      matchedSlot.fighterBlueClub = athleteClub;
      affectedMatch = matchedSlot;
    } else {
      // Check if athlete is already assigned to a match
      const alreadyInMatch = matchesSchedule.find(m => m.fighterRedId === athleteId || m.fighterBlueId === athleteId);
      if (!alreadyInMatch) {
        const nextPartaiNum = matchesSchedule.length + 1;
        const partaiStr = `Partai ${nextPartaiNum < 10 ? "0" + nextPartaiNum : nextPartaiNum}`;
        const newMatch: ScheduleMatch = {
          id: "m-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
          matchNumber: partaiStr,
          stage: "PENYISIHAN",
          categoryClassId: targetCat.id,
          fighterRedId: athleteId,
          fighterRedName: athleteName,
          fighterRedClub: athleteClub,
          fighterBlueId: "KOSONG",
          fighterBlueName: "MENUNGGU LAWAN",
          fighterBlueClub: "-",
          arena: athlete.arena || "Gelanggang A",
          gender,
          status: "BELUM",
          classCategory: athlete.classCategory || `Tanding ${categoryName} ${gender === "PUTRI" ? "Putri" : "Putra"}`
        };
        matchesSchedule.push(newMatch);
        affectedMatch = newMatch;
      }
    }

    // If activeMatch is empty or placeholder, automatically seed with first real match
    if (matchesSchedule.length === 1 && (activeMatch.id === "match-none" || activeMatch.fighterRedName === "PESILAT MERAH")) {
      loadAndActivateMatch(matchesSchedule[0].id);
    }

    broadcastState();

    return res.json({
      success: true,
      message: `Atlet ${athleteName} berhasil disinkronkan ke Panel Skoring & Jadwal Partai!`,
      participant: participantObj,
      category: targetCat,
      affectedMatch,
      matchesSchedule,
      participants,
      categories
    });
  }

  return res.json({
    success: true,
    athleteId
  });
});

// -- Delete Single Athlete API
app.delete("/api/athletes/:id", (req, res) => {
  const athleteId = req.params.id;
  participants = participants.filter(p => p.id !== athleteId && p.id !== `p-${athleteId}`);

  // Re-evaluate matchesSchedule
  matchesSchedule = matchesSchedule.filter(m => {
    // If match was solely this athlete against empty slot, remove it completely
    if (m.fighterRedId === athleteId && (!m.fighterBlueId || m.fighterBlueId === "KOSONG" || m.fighterBlueId.startsWith("placeholder-"))) {
      return false;
    }
    if (m.fighterBlueId === athleteId && (!m.fighterRedId || m.fighterRedId === "KOSONG" || m.fighterRedId.startsWith("placeholder-"))) {
      return false;
    }

    // If athlete was on red side and blue has a fighter, vacate red side
    if (m.fighterRedId === athleteId) {
      m.fighterRedId = "KOSONG";
      m.fighterRedName = "MENUNGGU LAWAN";
      m.fighterRedClub = "-";
    }

    // If athlete was on blue side, vacate blue side
    if (m.fighterBlueId === athleteId) {
      m.fighterBlueId = "KOSONG";
      m.fighterBlueName = "MENUNGGU LAWAN";
      m.fighterBlueClub = "-";
    }

    return true;
  });

  // Re-number remaining matches
  matchesSchedule.forEach((m, idx) => {
    const num = idx + 1;
    m.matchNumber = `Partai ${num < 10 ? "0" + num : num}`;
  });

  // If activeMatch contains this athlete, reload next match or reset
  if (
    activeMatch.fighterRedName?.toUpperCase().includes(athleteId) || 
    activeMatch.fighterBlueName?.toUpperCase().includes(athleteId) ||
    activeMatch.id === `match-${athleteId}`
  ) {
    if (matchesSchedule.length > 0) {
      loadAndActivateMatch(matchesSchedule[0].id);
    } else {
      activeMatch.id = "match-none";
      activeMatch.fighterRedName = "PESILAT MERAH";
      activeMatch.fighterRedClub = "CONTI MERAH";
      activeMatch.fighterBlueName = "PESILAT BIRU";
      activeMatch.fighterBlueClub = "CONTI BIRU";
      activeMatch.matchNumber = "Partai -";
      activeMatch.scoreRed = 0;
      activeMatch.scoreBlue = 0;
      activeMatch.status = MatchStatus.IDLE;
    }
  }

  broadcastState();

  res.json({
    success: true,
    message: `Atlet ${athleteId} berhasil dihapus dari sistem`,
    participants,
    matchesSchedule
  });
});

// -- Clear All Athletes & Associated Matches API
app.post("/api/athletes/clear-all", (req, res) => {
  participants = [];
  matchesSchedule = [];

  // Reset active match state completely
  activeMatch.id = "match-none";
  activeMatch.fighterRedName = "PESILAT MERAH";
  activeMatch.fighterRedClub = "CONTI MERAH";
  activeMatch.fighterBlueName = "PESILAT BIRU";
  activeMatch.fighterBlueClub = "CONTI BIRU";
  activeMatch.classCategory = "Tanding Kelas Bebas";
  activeMatch.matchNumber = "Partai -";
  activeMatch.scoreRed = 0;
  activeMatch.scoreBlue = 0;
  activeMatch.timeLeft = activeMatch.roundDuration;
  activeMatch.status = MatchStatus.IDLE;
  activeMatch.winnerPublished = false;
  activeMatch.winnerColor = null;
  activeMatch.winnerMethod = undefined;
  activeMatch.logs = [
    {
      id: "clear-" + Date.now(),
      timestamp: Date.now(),
      round: 1,
      fighter: "RED",
      description: "Seluruh database data atlet dan jadwal pertandingan telah dibersihkan secara bersih.",
      points: 0,
      source: "Sistem",
      type: "SYSTEM"
    }
  ];
  activeMatch.redStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
  activeMatch.blueStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
  activeMatch.redPenalties = {
    binaan1: false,
    binaan2: false,
    teguran1: false,
    teguran2: false,
    peringatan1: false,
    peringatan2: false,
    disqualified: false
  };
  activeMatch.bluePenalties = {
    binaan1: false,
    binaan2: false,
    teguran1: false,
    teguran2: false,
    peringatan1: false,
    peringatan2: false,
    disqualified: false
  };

  broadcastState();

  res.json({
    success: true,
    message: "Semua data atlet dan jadwal pertandingan berhasil dibersihkan!",
    participants: [],
    matchesSchedule: []
  });
});

// -- Bulk Tournament Import API (Atomic Save)
app.post("/api/tournament/import-batch", (req, res) => {
  const { newCategories, newParticipants, newMatches } = req.body;
  
  if (Array.isArray(newCategories)) {
    categories = newCategories;
  }
  if (Array.isArray(newParticipants)) {
    participants = newParticipants;
  }
  if (Array.isArray(newMatches)) {
    matchesSchedule = newMatches;
    if (newMatches.length > 0) {
      loadAndActivateMatch(newMatches[0].id);
      broadcastState();
    } else {
      // Reset the active match running state to a clean template since all matches are deleted
      activeMatch.id = "match-none";
      activeMatch.fighterRedName = "PESILAT MERAH";
      activeMatch.fighterRedClub = "CONTI MERAH";
      activeMatch.fighterBlueName = "PESILAT BIRU";
      activeMatch.fighterBlueClub = "CONTI BIRU";
      activeMatch.classCategory = "Tanding Kelas Bebas";
      activeMatch.matchNumber = "Partai -";
      activeMatch.scoreRed = 0;
      activeMatch.scoreBlue = 0;
      activeMatch.timeLeft = activeMatch.roundDuration;
      activeMatch.status = MatchStatus.IDLE;
      activeMatch.logs = [
        {
          id: "reset-" + Date.now(),
          timestamp: Date.now(),
          round: 1,
          fighter: "RED",
          description: "Database turnamen, peserta, dan jadwal resmi telah di-reset bersih.",
          points: 0,
          source: "Sistem",
          type: "SYSTEM"
        }
      ];
      
      activeMatch.redStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
      activeMatch.blueStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
      activeMatch.secretarySignalNextRound = false;
      activeMatch.redPenalties = {
        binaan1: false,
        binaan2: false,
        teguran1: false,
        teguran2: false,
        peringatan1: false,
        peringatan2: false,
        disqualified: false
      };
      activeMatch.bluePenalties = {
        binaan1: false,
        binaan2: false,
        teguran1: false,
        teguran2: false,
        peringatan1: false,
        peringatan2: false,
        disqualified: false
      };
      broadcastState();
    }
  }
  
  res.json({
    message: "Data alur bagan turnamen berhasil disinkronkan ke server secara permanen!",
    categories,
    participants,
    matchesSchedule
  });
});

// -- Complete Tournament Database Reset API
app.post("/api/tournament/reset", (req, res) => {
  participants = [];
  matchesSchedule = [];
  // Keep categories intact during athlete reset so classes are preserved
  
  // Reset the active match running state to a clean template
  activeMatch.id = "match-none";
  activeMatch.fighterRedName = "PESILAT MERAH";
  activeMatch.fighterRedClub = "CONTI MERAH";
  activeMatch.fighterBlueName = "PESILAT BIRU";
  activeMatch.fighterBlueClub = "CONTI BIRU";
  activeMatch.classCategory = "Tanding Kelas Bebas";
  activeMatch.matchNumber = "Partai -";
  activeMatch.scoreRed = 0;
  activeMatch.scoreBlue = 0;
  activeMatch.timeLeft = activeMatch.roundDuration;
  activeMatch.status = MatchStatus.IDLE;
  activeMatch.logs = [
    {
      id: "reset-" + Date.now(),
      timestamp: Date.now(),
      round: 1,
      fighter: "RED",
      description: "Database turnamen, peserta, dan jadwal resmi telah di-reset bersih.",
      points: 0,
      source: "Sistem",
      type: "SYSTEM"
    }
  ];
  
  activeMatch.redStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
  activeMatch.blueStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
  activeMatch.secretarySignalNextRound = false;
  activeMatch.redPenalties = {
    binaan1: false,
    binaan2: false,
    teguran1: false,
    teguran2: false,
    peringatan1: false,
    peringatan2: false,
    disqualified: false
  };
  activeMatch.bluePenalties = {
    binaan1: false,
    binaan2: false,
    teguran1: false,
    teguran2: false,
    peringatan1: false,
    peringatan2: false,
    disqualified: false
  };
  
  broadcastState();
  
  res.json({
    message: "Data turnamen, atlit terdaftar, dan jadwal pertandingan IPSI berhasil di-reset bersih!",
    categories,
    participants,
    matchesSchedule,
    activeMatch
  });
});

// Helper to load and activate a match schedule
function loadAndActivateMatch(matchId: string) {
  const match = matchesSchedule.find(m => m.id === matchId);
  if (!match) return false;

  const pRed = participants.find(p => p.id === match.fighterRedId);
  const pBlue = participants.find(p => p.id === match.fighterBlueId);
  const cat = categories.find(c => c.id === match.categoryClassId);

  // Load into activeMatch state
  activeMatch.id = "match-" + match.id;
  activeMatch.matchNumber = match.matchNumber;
  activeMatch.stage = match.stage as any;
  activeMatch.gender = match.gender as any;
  activeMatch.status = MatchStatus.IDLE;
  activeMatch.activeRound = 1;
  activeMatch.timeLeft = activeMatch.roundDuration;

  if (pRed) {
    activeMatch.fighterRedName = pRed.name;
    activeMatch.fighterRedClub = pRed.club;
  } else if (match.fighterRedName) {
    activeMatch.fighterRedName = match.fighterRedName;
    activeMatch.fighterRedClub = match.fighterRedClub || "CONTINGENT MERAH";
  } else {
    activeMatch.fighterRedName = "PESILAT MERAH";
    activeMatch.fighterRedClub = "CONTINGENT MERAH";
  }

  if (pBlue) {
    activeMatch.fighterBlueName = pBlue.name;
    activeMatch.fighterBlueClub = pBlue.club;
  } else if (match.fighterBlueName) {
    activeMatch.fighterBlueName = match.fighterBlueName;
    activeMatch.fighterBlueClub = match.fighterBlueClub || "CONTINGENT BIRU";
  } else {
    activeMatch.fighterBlueName = "PESILAT BIRU";
    activeMatch.fighterBlueClub = "CONTINGENT BIRU";
  }

  if (match.classCategory) {
    activeMatch.classCategory = match.classCategory;
    activeMatch.division = (cat && cat.division) || "DEWASA";
  } else if (cat) {
    activeMatch.classCategory = `Tanding ${cat.name} ${match.gender === "PUTRI" ? "Putri" : "Putra"} (${cat.minWeight}Kg - ${cat.maxWeight}Kg)`;
    activeMatch.division = cat.division || "DEWASA";
  } else {
    activeMatch.classCategory = "Tanding Bebas";
    activeMatch.division = "DEWASA";
  }

  // Reset special 30-point gap tracking variables
  activeMatch.losingCornerNoScoreDuration = 0;
  activeMatch.losingCornerColor = null;
  activeMatch.lastLosingScore = undefined;

  // Clear score & stats resets for fresh match!
  activeMatch.scoreRed = 0;
  activeMatch.scoreBlue = 0;
  activeMatch.redStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
  activeMatch.blueStats = { punches: 0, kicks: 0, drops: 0, locks: 0, warnings: 0, overrides: 0, pastPenaltiesDeductions: 0 };
  activeMatch.redPenalties = { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false };
  activeMatch.bluePenalties = { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false };
  activeMatch.activeJuryPresses = { 1: null, 2: null, 3: null };
  activeMatch.juryScores = {
    1: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } },
    2: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } },
    3: { 1: { red: 0, blue: 0 }, 2: { red: 0, blue: 0 }, 3: { red: 0, blue: 0 } }
  };
  activeMatch.verification = undefined;
  activeMatch.showRoundOverPopup = false;
  activeMatch.showNextMatchPopup = true;
  activeMatch.secretarySignalNextRound = false;
  activeMatch.winnerPublished = false;
  activeMatch.winnerColor = null;
  activeMatch.winnerMethod = undefined;
  activeMatch.isTieExtendedPossible = false;
  activeMatch.juryPanelLocked = true;
  activeMatch.dewanPanelLocked = true;
  juryPressHistory = [];
  activeMatch.logs = [
    {
      id: "active-" + Date.now(),
      timestamp: Date.now(),
      round: 1,
      fighter: "RED",
      description: `Partai ${match.matchNumber} (${activeMatch.classCategory}) diaktifkan dari database jadwal.`,
      points: 0,
      source: "Database Jadwal",
      type: "SYSTEM"
    }
  ];

  // Update original status inline
  matchesSchedule = matchesSchedule.map(m => m.id === matchId ? { ...m, status: "SEDANG" as any } : m);
  return true;
}

// -- Activate/Load Match to Active State Panel
app.post("/api/matches-schedule/load", (req, res) => {
  const { matchId } = req.body;
  const success = loadAndActivateMatch(matchId);
  if (!success) return res.status(404).json({ error: "Partai pertandingan tidak ditemukan" });
  broadcastState();
  res.json({ message: "Sukses memuat partai pertandingan", activeMatch, matchesSchedule });
});

// Vite middleware flow for full stack reactivity
async function startServer() {
  // Load saved match state on startup to automatically resume previous matches
  try {
    const matchFileToRead = fs.existsSync(ACTIVE_MATCH_FILE)
      ? ACTIVE_MATCH_FILE
      : (fs.existsSync("./activeMatch.json") ? "./activeMatch.json" : "");
    if (matchFileToRead) {
      const savedData = fs.readFileSync(matchFileToRead, "utf8");
      const parsed = JSON.parse(savedData);
      if (parsed && parsed.id) {
        // Sanitize bloated base64 logos from old cache
        if (parsed.logoLeft && typeof parsed.logoLeft === "string" && parsed.logoLeft.length > 500000) {
          parsed.logoLeft = "";
        }
        if (parsed.logoRight && typeof parsed.logoRight === "string" && parsed.logoRight.length > 500000) {
          parsed.logoRight = "";
        }
        if (parsed.status !== MatchStatus.FINISHED) {
          parsed.winnerMethod = undefined;
          parsed.winnerColor = null;
          parsed.winnerPublished = false;
          if (parsed.redPenalties) parsed.redPenalties.disqualified = false;
          if (parsed.bluePenalties) parsed.bluePenalties.disqualified = false;
        }
        activeMatch = parsed;
        console.log(`[RECOVERY] Memulihkan sisa waktu & status pertandingan sebelumnya dari file: Partai ${activeMatch.matchNumber}, Sisa Waktu: ${activeMatch.timeLeft} detik`);
        if (activeMatch.status === MatchStatus.RUNNING) {
          console.log("[RECOVERY] Pertandingan sebelumnya dalam status RUNNING. Otomatis melanjutkan penghitungan waktu!");
          checkRunningTimer();
        }
      }
    }
  } catch (err) {
    console.error("[RECOVERY] Gagal memulihkan status pertandingan sebelumnya dari disk:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    let distPath = process.env.JRZ_DIST_PATH || path.join(process.cwd(), "dist");
    const envDistHtml = process.env.JRZ_DIST_PATH ? path.join(process.env.JRZ_DIST_PATH, "index.html") : "";
    const cwdDistHtml = path.join(process.cwd(), "dist", "index.html");
    const dirDistHtml = path.join(_currentDir, "dist", "index.html");
    const parentDirDistHtml = path.join(_currentDir, "..", "dist", "index.html");
    const localDirHtml = path.join(_currentDir, "index.html");

    if (envDistHtml && fs.existsSync(envDistHtml)) {
      distPath = process.env.JRZ_DIST_PATH!;
    } else if (fs.existsSync(cwdDistHtml)) {
      distPath = path.join(process.cwd(), "dist");
    } else if (fs.existsSync(dirDistHtml)) {
      distPath = path.join(_currentDir, "dist");
    } else if (fs.existsSync(parentDirDistHtml)) {
      distPath = path.join(_currentDir, "..", "dist");
    } else if (fs.existsSync(localDirHtml)) {
      distPath = _currentDir;
    }
    
    console.log(`[DISCO IPSI ENGINE] Serving static client files from production path: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const offlineIndex = path.join(distPath, "index.offline.html");
      const mainIndex = path.join(distPath, "index.html");
      if (fs.existsSync(offlineIndex) && (req.hostname === "localhost" || req.hostname === "127.0.0.1")) {
        res.sendFile(offlineIndex);
      } else {
        res.sendFile(mainIndex);
      }
    });
  }

  const serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pencak Silat IPSI Server is up & running on port ${PORT}`);
  });

  serverInstance.on("error", (err: any) => {
    console.error("[DISCO IPSI ENGINE] Express server encountered an error:", err);
    if (err.code === "EADDRINUSE") {
      console.error(`[DISCO IPSI ENGINE] Port ${PORT} is already in use on 0.0.0.0.`);
    }
  });
}

startServer();
