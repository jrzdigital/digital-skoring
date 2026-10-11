/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum MatchStatus {
  IDLE = "IDLE",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
  ROUND_BREAK = "ROUND_BREAK",
  FINISHED = "FINISHED"
}

export type FighterColor = "RED" | "BLUE";

export type ActionType = "PUNCH" | "KICK";

// Structure of a raw press from a jury
export interface JuryPress {
  id: string;
  juryId: number; // 1, 2, 3
  fighter: FighterColor;
  action: ActionType;
  timestamp: number; // server timestamp
  expiresAt: number;
}

// Structure of a penalty log
export type PenaltyType = "TEGURAN_1" | "TEGURAN_2" | "PERINGATAN_1" | "PERINGATAN_2" | "BINAAN_1" | "BINAAN_2";

export interface ScoreDetail {
  punches: number; // 1 point each
  kicks: number; // 2 points each
  drops: number; // 3 points each
  locks: number; // 3 points each
  warnings: number; // negative points total
  overrides?: number; // manual score adjustments
  pastPenaltiesDeductions?: number; // accumulated penalty deductions from past rounds
}

export interface MatchLog {
  id: string;
  timestamp: number;
  round: number;
  fighter: FighterColor;
  description: string;
  message?: string;
  clockTime?: string;
  points: number; // positive or negative
  source: string; // "Juri Consensus", "Ketua Pertandingan", etc.
  type: "PUNCH" | "KICK" | "DROP" | "LOCK" | "PENALTY" | "SYSTEM" | string;
  uncounted?: boolean;
  pressId?: string;
  juryIds?: number[];
}

export interface VerificationState {
  active: boolean;
  isActive?: boolean;
  category?: string;
  juriVotes?: any;
  consensusResult?: any;
  type: "JATUHAN" | "PELANGGARAN" | null;
  corner?: "RED" | "BLUE" | null;
  reason?: string;
  decidedBy?: string;
  applied?: boolean;
  votes: {
    [juryId: number]: "MERAH" | "BIRU" | "TIDAK SAH" | null;
  };
  result: "MERAH" | "BIRU" | "TIDAK SAH" | null;
  timestamp: number;
}

export interface MatchState {
  id: string;
  eventName: string;
  fighterRedName: string;
  fighterRedClub: string;
  fighterBlueName: string;
  fighterBlueClub: string;
  classCategory: string; // e.g., "Tanding Kelas C Putra (55Kg - 60Kg)"
  matchNumber: string; // e.g., "Partai 04"
  roundCount: number; // e.g. 3
  activeRound: number; // current round
  roundDuration: number; // default 120 seconds (2 mins)
  timeLeft: number; // active timer in seconds
  timerEndAt?: number | null; // epoch timestamp (ms) when running countdown reaches 0
  timerStartedAt?: number | null; // epoch timestamp (ms) when running countdown was started/adjusted
  status: MatchStatus;
  
  // Total Scores
  scoreRed: number;
  scoreBlue: number;

  // Breakdown per corner
  redStats: ScoreDetail;
  blueStats: ScoreDetail;

  // Penalty details
  redPenalties: {
    binaan1: boolean;
    binaan2: boolean;
    teguran1: boolean;
    teguran2: boolean;
    peringatan1: boolean;
    peringatan2: boolean;
    disqualified: boolean;
  };
  bluePenalties: {
    binaan1: boolean;
    binaan2: boolean;
    teguran1: boolean;
    teguran2: boolean;
    peringatan1: boolean;
    peringatan2: boolean;
    disqualified: boolean;
  };

  // Live status of Jury Buttons (for visual LED feedback)
  // Maps jury ID (1, 2, 3) to their active press if any
  activeJuryPresses: {
    [juryId: number]: {
      fighter: FighterColor;
      action: ActionType;
      pressedAt: number;
    } | null;
  };

  // Jury scores entered separate for each round
  juryScores: {
    [juryId: number]: {
      [round: number]: {
        red: number;
        blue: number;
      };
    };
  };

  verification?: VerificationState; getShowRoundOverPopup?: boolean; // alias/helper if needed 
  showRoundOverPopup?: boolean;
  showNextMatchPopup?: boolean; // whether to show next match popup on monitor
  secretarySignalNextRound?: boolean; // signal to secretary panel to continue to the next round
  winnerPublished?: boolean; // whether the secretary has announced (published) the winner
  winnerColor?: "RED" | "BLUE" | null; // the calculated winner color
  winnerMethod?: string; // the calculated tie-break/winner method
  isTieExtendedPossible?: boolean; // whether perfect draw occurred and Babak 4 can be started
  logoLeft?: string;
  logoRight?: string;
  gender?: "PUTRA" | "PUTRI";
  stage?: "PENYISIHAN" | "PEREMPATFINAL" | "SEMIFINAL" | "FINAL";
  arena?: string;
  projectionMode?: boolean;
  juryPanelLocked?: boolean;
  dewanPanelLocked?: boolean;
  division?: string;
  wmpThreshold?: 20 | 30;
  losingCornerNoScoreDuration?: number;
  losingCornerColor?: "RED" | "BLUE" | null;
  lastLosingScore?: number;

  // List of validated and system logs
  logs: MatchLog[];
  juryConnections?: {
    [juryId: number]: {
      active: boolean;
      ip: string;
      lastSeen: number;
    };
  };
  deviceConnections?: {
    [deviceId: string]: {
      active: boolean;
      ip: string;
      lastSeen: number;
    };
  };
  juryPressStats?: {
    juri1?: { redPunch: number; redKick: number; bluePunch: number; blueKick: number; total: number };
    juri2?: { redPunch: number; redKick: number; bluePunch: number; blueKick: number; total: number };
    juri3?: { redPunch: number; redKick: number; bluePunch: number; blueKick: number; total: number };
    totalBluePunches?: number;
    totalBlueKicks?: number;
    totalRedPunches?: number;
    totalRedKicks?: number;
    totalPresses?: number;
  };

  // Additional match summary & presentation fields
  lastUpdatedAt?: number;
  stateVersion?: number;
  juryPressHistory?: {
    id: string;
    juryId: number;
    fighter: FighterColor;
    action: ActionType;
    timestamp: number;
    consumed: boolean;
  }[];
  winner?: "blue" | "red" | "BLUE" | "RED" | string | null;
  tournamentName?: string;
  athleteBlue?: { name?: string; contingent?: string; id?: string };
  athleteRed?: { name?: string; contingent?: string; id?: string };
  scores?: any;
  winnerDecision?: string;
  isPanelsLocked?: boolean;
  isTimerRunning?: boolean;
  timeRemaining?: number;
  gapRuleTracker?: any;
  juriActiveIndicators?: any;
  round?: number;
  maxRound?: number;
  actionLogs?: any[];
  roundScores?: any;
  penalties?: any;
}

export interface ScheduleMatch {
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
  juryPressStats?: {
    juri1?: { redPunch: number; redKick: number; bluePunch: number; blueKick: number; total: number };
    juri2?: { redPunch: number; redKick: number; bluePunch: number; blueKick: number; total: number };
    juri3?: { redPunch: number; redKick: number; bluePunch: number; blueKick: number; total: number };
    totalBluePunches?: number;
    totalBlueKicks?: number;
    totalRedPunches?: number;
    totalRedKicks?: number;
    totalPresses?: number;
  };
  logs?: MatchLog[];
}

export interface Participant {
  id: string;
  name: string;
  club: string;
  gender: "PUTRA" | "PUTRI";
  categoryClassId: string;
  weight?: number;
  arena?: string;
  gelanggang?: string;
}

export type UserRole = "superadmin" | "admin" | "dewan" | "juri" | "atlet" | "pelatih" | "umum" | "pembina" | "asisten";
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  avatarUrl?: string;
  role: UserRole;
  accessTier?: "LIMITED" | "FULL"; // LIMITED: Tanpa pembayaran (Bagan, Jadwal, Monitor). FULL: Dengan pembayaran (Semua fitur terbuka kecuali superadmin)
  status: UserStatus;
  organization?: string;
  emailOrPhone?: string;
  trainingLocation?: string;
  extracurricularName?: string;
  organizationBranch?: string;
  city?: string;
  createdAt: number | string;
  approvedAt?: number | string;
  approvedBy?: string;
  lastLoginAt?: number;
  lastLoginIp?: string;
  boundIp?: string;
  ipLockEnabled?: boolean;
}

/**
 * Helper to check if a user has full access privileges:
 * - Superadmin has full access (+ Super Admin Panel)
 * - User with accessTier === "FULL" has full access to all features (except Super Admin Panel)
 * - Roles admin, dewan, juri have full access
 * - Guest (null) and accessTier === "LIMITED" / role "umum" only have access to Bagan, Jadwal, and Monitor
 */
export function hasFullAccess(user?: UserAccount | null): boolean {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  if (user.accessTier === "FULL") return true;
  if (user.accessTier === "LIMITED") return false;
  if (user.role === "admin" || user.role === "dewan" || user.role === "juri") return true;
  return false;
}

export interface AuthSession {
  user: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
    status: UserStatus;
    organization?: string;
    emailOrPhone?: string;
    boundIp?: string;
    lastLoginIp?: string;
    ipLockEnabled?: boolean;
  };
  token?: string;
}

export type ResetRequestStatus = "PENDING" | "APPROVED" | "USED" | "REJECTED";

export interface PasswordResetRequest {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  emailOrPhone: string;
  status: ResetRequestStatus;
  token?: string;
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
  usedAt?: number;
  expiresAt?: number;
}

export type IpUnlockStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IpUnlockRequest {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  currentBoundIp?: string;
  currentIp?: string;
  previousBoundIp?: string;
  requestedIp: string;
  reason?: string;
  emailOrPhone?: string;
  status: IpUnlockStatus;
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
}

export interface Athlete {
  id: string;
  name?: string;
  nama?: string;
  contingent?: string;
  kontingen?: string;
  club?: string;
  kelas?: string;
  usia?: string;
  gender?: "PUTRA" | "PUTRI" | "Putera" | "Puteri" | string;
  [key: string]: any;
}
