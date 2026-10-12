export type Corner = 'BLUE' | 'RED';

export type UserRole = 
  | 'LANDING'
  | 'SCOREBOARD' 
  | 'DEWAN' 
  | 'JURI_1' 
  | 'JURI_2' 
  | 'JURI_3' 
  | 'SEKRETARIS';

export type RoundNumber = 1 | 2 | 3;

export type MatchStatus = 
  | 'NOT_STARTED' 
  | 'RUNNING' 
  | 'PAUSED' 
  | 'ROUND_FINISHED' 
  | 'MATCH_FINISHED';

export type AttackType = 'PUKULAN' | 'TENDANGAN';

export type DecisionType = 
  | 'MENANG_ANGKA' 
  | 'MENANG_MUTLAK' 
  | 'MENANG_DISKUALIFIKASI' 
  | 'MENANG_WMP' // Wasit Menghentikan Pertandingan
  | 'MENANG_TEKNIK';

export interface RoundScore {
  pukulan: number;      // +1 each
  tendangan: number;    // +2 each
  jatuhan: number;      // +3 each
  binaan: number;       // 0, 1, 2 (verbal warning, 0 pts)
  teguran1: boolean;    // -1 pt
  teguran2: boolean;    // -2 pts
  peringatan1: boolean; // -5 pts
  peringatan2: boolean; // -10 pts
  peringatan3: boolean; // DQ
  keluarGelanggang: number; // -1 pt each
}

export interface CornerScores {
  round1: RoundScore;
  round2: RoundScore;
  round3: RoundScore;
}

export interface Athlete {
  id: string;
  name: string;
  contingent: string;
  avatarColor?: string;
  weightClass?: string;
  category?: string;
}

export interface RegisteredAthlete {
  id: string;
  name: string;
  contingent: string;
  categoryClass: string;
  ageGroup: string;
  gender: 'PUTRA' | 'PUTRI';
  createdAt?: number;
}

export interface MatchInfo {
  id: string;
  partaiNumber: string;
  tournamentName: string;
  arena: string;
  venue?: string;
  eventDate?: string;
  logoLeft?: string;
  logoRight?: string;
  categoryClass: string;
  classNumber?: string;
  ageGroup: string;
  gender: 'PUTRA' | 'PUTRI';
  roundPhase: string;
  blueAthlete: Athlete;
  redAthlete: Athlete;
  roundDurationSeconds: number;
}

export interface JudgeVote {
  judgeId: 1 | 2 | 3;
  corner: Corner;
  attackType: AttackType;
  timestamp: number;
}

export interface VarSession {
  active: boolean;
  type: 'JATUHAN' | 'PELANGGARAN';
  targetCorner: Corner | null;
  reason: string;
  timestamp: number;
  votes: {
    1?: 'BLUE' | 'RED' | 'INVALID';
    2?: 'BLUE' | 'RED' | 'INVALID';
    3?: 'BLUE' | 'RED' | 'INVALID';
  };
  status: 'PENDING' | 'RESOLVED' | 'CANCELLED';
  resultWinner?: 'BLUE' | 'RED' | 'INVALID';
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  clockTime: string;
  round: RoundNumber;
  matchTimerFormatted: string;
  actor: string;
  corner?: Corner;
  action: string;
  pointChange?: number;
  description: string;
}

export interface MatchHistoryItem {
  id: string;
  date: string;
  matchInfo: MatchInfo;
  blueTotalScore: number;
  redTotalScore: number;
  winner: Corner | 'DRAW';
  decisionType: DecisionType;
  durationMinutes: number;
  logs: ActivityLog[];
  scores: {
    blue: CornerScores;
    red: CornerScores;
  };
}

export interface TournamentMatch {
  id: string;
  partaiNumber: string;
  roundPhase: 'PENYISIHAN' | 'PEREMPAT_FINAL' | 'SEMIFINAL' | 'FINAL';
  categoryClass: string;
  ageGroup: string;
  gender: 'PUTRA' | 'PUTRI';
  blueAthlete: Athlete;
  redAthlete: Athlete;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  winnerCorner?: Corner;
  blueScore?: number;
  redScore?: number;
  nextMatchId?: string;
  bracketPosition?: number;
}
