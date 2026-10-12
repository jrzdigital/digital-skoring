import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Corner,
  UserRole,
  RoundNumber,
  MatchStatus,
  AttackType,
  DecisionType,
  CornerScores,
  RoundScore,
  MatchInfo,
  JudgeVote,
  VarSession,
  ActivityLog,
  MatchHistoryItem,
  TournamentMatch,
  RegisteredAthlete,
} from '../types/silat';
import {
  initialMatchInfo,
  createInitialCornerScores,
  defaultRosterList,
  sampleMatchHistory,
  defaultRegisteredAthletes,
  generateMatchesFromAthletes,
} from '../utils/defaultData';
import { sound } from '../utils/audio';

export interface ScoreBreakdown {
  pukulanPts: number;
  tendanganPts: number;
  jatuhanPts: number;
  penaltiesPts: number;
  totalSubtotal: number;
}

export interface SilatMatchContextType {
  // Navigation & Role
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  isMuted: boolean;
  toggleMute: () => void;

  // Match Metadata
  matchInfo: MatchInfo;
  updateMatchInfo: (info: Partial<MatchInfo>) => void;

  // Timer & Round State
  matchStatus: MatchStatus;
  currentRound: RoundNumber;
  timerSeconds: number;
  isTimerRunning: boolean;
  roundDurationSeconds: number;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setRoundDuration: (seconds: number) => void;
  setRound: (round: RoundNumber) => void;
  nextRound: () => void;

  // Scores
  blueScores: CornerScores;
  redScores: CornerScores;
  blueTotalScore: number;
  redTotalScore: number;
  calculateRoundScore: (score: RoundScore) => ScoreBreakdown;

  // Judge Consensus & Lamp State
  judgePendingVotes: JudgeVote[];
  recordJudgeVote: (judgeId: 1 | 2 | 3, corner: Corner, attackType: AttackType) => void;
  activeConsensusLamps: {
    blue: { 1: boolean; 2: boolean; 3: boolean };
    red: { 1: boolean; 2: boolean; 3: boolean };
  };
  isJudgesLocked: boolean;
  setIsJudgesLocked: (locked: boolean) => void;

  // Dewan Controls (Jatuhan, Penalties, Direct Points)
  addJatuhan: (corner: Corner) => void;
  removeJatuhan: (corner: Corner) => void;
  setBinaan: (corner: Corner, level: number) => void;
  toggleTeguran: (corner: Corner, level: 1 | 2) => void;
  togglePeringatan: (corner: Corner, level: 1 | 2 | 3) => void;
  adjustKeluarGelanggang: (corner: Corner, delta: number) => void;
  undoLastAction: () => void;

  // VAR / Verification System
  varSession: VarSession | null;
  startVarSession: (type: 'JATUHAN' | 'PELANGGARAN', targetCorner: Corner | null, reason: string) => void;
  submitJudgeVarVote: (judgeId: 1 | 2 | 3, vote: 'BLUE' | 'RED' | 'INVALID') => void;
  resolveVarSession: (winner: 'BLUE' | 'RED' | 'INVALID') => void;
  cancelVarSession: () => void;

  // Gap Rule & Victory
  gapRuleTriggered: boolean;
  winnerAnnouncement: {
    isOpen: boolean;
    winner: Corner | 'DRAW';
    decisionType: DecisionType;
    reason?: string;
  } | null;
  declareWinner: (winner: Corner | 'DRAW', decisionType: DecisionType, reason?: string) => void;
  closeWinnerModal: () => void;
  resetMatchForNextParty: () => void;

  // Logs & History & Tournament Management
  activityLogs: ActivityLog[];
  addLog: (actor: string, action: string, description: string, corner?: Corner, pointChange?: number) => void;
  matchHistory: MatchHistoryItem[];
  rosterList: TournamentMatch[];
  activeMatchId: string;
  loadMatchFromRoster: (matchId: string) => void;
  updateRosterList: (list: TournamentMatch[]) => void;
  saveCurrentMatchToHistory: () => void;

  // Registered Athletes Roster
  registeredAthletes: RegisteredAthlete[];
  addRegisteredAthlete: (ath: Omit<RegisteredAthlete, 'id' | 'createdAt'>) => RegisteredAthlete;
  updateRegisteredAthlete: (id: string, updated: Partial<RegisteredAthlete>) => void;
  deleteRegisteredAthlete: (id: string) => void;
  setRegisteredAthletes: (list: RegisteredAthlete[]) => void;
  resetRegisteredAthletes: () => void;

  // Offline & Real-Time Sync & Backup
  isOffline: boolean;
  lastSyncTimestamp: number;
  exportStateToJson: () => void;
  importStateFromJson: (jsonStr: string) => boolean;
}

const SilatMatchContext = createContext<SilatMatchContextType | undefined>(undefined);

const BROADCAST_CHANNEL_NAME = 'silat_tanding_sync_v1';
const STORAGE_KEY = 'silat_tanding_state_v1';

export const SilatMatchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialRole = (): UserRole => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role')?.toUpperCase();
      if (
        roleParam === 'LANDING' ||
        roleParam === 'SCOREBOARD' ||
        roleParam === 'DEWAN' ||
        roleParam === 'JURI_1' ||
        roleParam === 'JURI_2' ||
        roleParam === 'JURI_3' ||
        roleParam === 'SEKRETARIS'
      ) {
        return roleParam as UserRole;
      }
    } catch {
      // ignore
    }
    return 'LANDING';
  };

  // Helper to load saved snapshot on init if exists
  const getSavedSnapshot = () => {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch {
      // Ignore
    }
    return null;
  };

  const saved = getSavedSnapshot();

  const [currentRole, setCurrentRole] = useState<UserRole>(getInitialRole);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number>(Date.now());

  const [matchInfo, setMatchInfo] = useState<MatchInfo>(saved?.matchInfo || initialMatchInfo);
  const [matchStatus, setMatchStatus] = useState<MatchStatus>(saved?.matchStatus || 'NOT_STARTED');
  const [currentRound, setCurrentRound] = useState<RoundNumber>(saved?.currentRound || 1);
  const [timerSeconds, setTimerSeconds] = useState<number>(saved?.timerSeconds ?? 120);
  const [roundDurationSeconds, setRoundDurationSecondsState] = useState<number>(
    saved?.roundDurationSeconds ?? 120
  );
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false); // Don't auto-run timer on restore

  const [blueScores, setBlueScores] = useState<CornerScores>(
    saved?.blueScores || createInitialCornerScores
  );
  const [redScores, setRedScores] = useState<CornerScores>(
    saved?.redScores || createInitialCornerScores
  );

  const [judgePendingVotes, setJudgePendingVotes] = useState<JudgeVote[]>(
    saved?.judgePendingVotes || []
  );
  const [activeConsensusLamps, setActiveConsensusLamps] = useState<{
    blue: { 1: boolean; 2: boolean; 3: boolean };
    red: { 1: boolean; 2: boolean; 3: boolean };
  }>({
    blue: { 1: false, 2: false, 3: false },
    red: { 1: false, 2: false, 3: false },
  });
  const [isJudgesLocked, setIsJudgesLocked] = useState<boolean>(saved?.isJudgesLocked || false);

  const [varSession, setVarSession] = useState<VarSession | null>(saved?.varSession || null);
  const [gapRuleTriggered, setGapRuleTriggered] = useState<boolean>(saved?.gapRuleTriggered || false);
  const [winnerAnnouncement, setWinnerAnnouncement] = useState<{
    isOpen: boolean;
    winner: Corner | 'DRAW';
    decisionType: DecisionType;
    reason?: string;
  } | null>(saved?.winnerAnnouncement || null);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(saved?.activityLogs || []);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>(
    saved?.matchHistory || sampleMatchHistory
  );
  const [rosterList, setRosterList] = useState<TournamentMatch[]>(
    saved?.rosterList || defaultRosterList
  );
  const [registeredAthletes, setRegisteredAthletesState] = useState<RegisteredAthlete[]>(
    saved?.registeredAthletes || defaultRegisteredAthletes
  );
  const [activeMatchId, setActiveMatchId] = useState<string>(
    saved?.activeMatchId || (defaultRosterList[0]?.id || 'match-01')
  );

  const addRegisteredAthlete = (athData: Omit<RegisteredAthlete, 'id' | 'createdAt'>) => {
    const newAth: RegisteredAthlete = {
      id: 'ath-reg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: athData.name.toUpperCase().trim(),
      contingent: athData.contingent.toUpperCase().trim(),
      categoryClass: athData.categoryClass,
      ageGroup: athData.ageGroup,
      gender: athData.gender,
      createdAt: Date.now(),
    };
    const nextAthletes = [newAth, ...registeredAthletes];
    setRegisteredAthletesState(nextAthletes);

    // Regenerate matches in roster (powers Bagan Braket and Kontrol Partai)
    const nextMatches = generateMatchesFromAthletes(nextAthletes);
    setRosterList(nextMatches);

    // If current match was empty or using placeholder, load the newly generated match
    if (
      !matchInfo.blueAthlete?.name ||
      matchInfo.blueAthlete.name === '(BELUM ADA ATLIT)' ||
      rosterList.length === 0
    ) {
      if (nextMatches.length > 0) {
        const m = nextMatches[0];
        setActiveMatchId(m.id);
        setMatchInfo((prev) => ({
          ...prev,
          id: m.id,
          partaiNumber: m.partaiNumber.replace(/\D/g, '') || '1',
          categoryClass: m.categoryClass,
          ageGroup: m.ageGroup,
          gender: m.gender,
          roundPhase: m.roundPhase,
          blueAthlete: { ...m.blueAthlete },
          redAthlete: { ...m.redAthlete },
        }));
      }
    }

    addLog('SEKRETARIS', 'REGISTRASI ATLIT', `${newAth.name} (${newAth.contingent}) - ${newAth.categoryClass}`);
    return newAth;
  };

  const updateRegisteredAthlete = (id: string, updated: Partial<RegisteredAthlete>) => {
    const nextAthletes = registeredAthletes.map((a) => (a.id === id ? { ...a, ...updated } : a));
    setRegisteredAthletesState(nextAthletes);

    // Regenerate/update matches in roster and bracket
    const nextMatches = generateMatchesFromAthletes(nextAthletes);
    setRosterList(nextMatches);

    // If this athlete is currently loaded in active match, update matchInfo live
    setMatchInfo((prev) => {
      let isChanged = false;
      const newBlue = { ...prev.blueAthlete };
      const newRed = { ...prev.redAthlete };
      let newCategory = prev.categoryClass;
      let newAge = prev.ageGroup;
      let newGender = prev.gender;

      if (prev.blueAthlete?.id === id) {
        isChanged = true;
        if (updated.name) newBlue.name = updated.name.toUpperCase().trim();
        if (updated.contingent) newBlue.contingent = updated.contingent.toUpperCase().trim();
        if (updated.categoryClass) newCategory = updated.categoryClass;
        if (updated.ageGroup) newAge = updated.ageGroup;
        if (updated.gender) newGender = updated.gender;
      }
      if (prev.redAthlete?.id === id) {
        isChanged = true;
        if (updated.name) newRed.name = updated.name.toUpperCase().trim();
        if (updated.contingent) newRed.contingent = updated.contingent.toUpperCase().trim();
        if (updated.categoryClass) newCategory = updated.categoryClass;
        if (updated.ageGroup) newAge = updated.ageGroup;
        if (updated.gender) newGender = updated.gender;
      }

      if (isChanged) {
        return {
          ...prev,
          categoryClass: newCategory,
          ageGroup: newAge,
          gender: newGender,
          blueAthlete: newBlue,
          redAthlete: newRed,
        };
      }
      return prev;
    });

    addLog('SEKRETARIS', 'PERBARUI DATA ATLIT', `Data pesilat ID ${id} diperbarui.`);
  };

  const deleteRegisteredAthlete = (id: string) => {
    const nextAthletes = registeredAthletes.filter((a) => a.id !== id);
    setRegisteredAthletesState(nextAthletes);

    // Regenerate matches without the deleted athlete (removes from bagan & kontrol partai)
    const nextMatches = generateMatchesFromAthletes(nextAthletes);
    setRosterList(nextMatches);

    // If the active match has this athlete or is now removed:
    const isCurrentBlueDeleted = matchInfo.blueAthlete?.id === id;
    const isCurrentRedDeleted = matchInfo.redAthlete?.id === id;

    if (isCurrentBlueDeleted || isCurrentRedDeleted || !nextMatches.some((m) => m.id === activeMatchId)) {
      if (nextMatches.length > 0) {
        const m = nextMatches[0];
        setActiveMatchId(m.id);
        setMatchInfo((prev) => ({
          ...prev,
          id: m.id,
          partaiNumber: m.partaiNumber.replace(/\D/g, '') || '1',
          categoryClass: m.categoryClass,
          ageGroup: m.ageGroup,
          gender: m.gender,
          roundPhase: m.roundPhase,
          blueAthlete: { ...m.blueAthlete },
          redAthlete: { ...m.redAthlete },
        }));
      } else {
        setActiveMatchId('');
        setMatchInfo((prev) => ({
          ...prev,
          id: 'match-empty',
          partaiNumber: '1',
          blueAthlete: { id: '', name: '(BELUM ADA ATLIT)', contingent: '-' },
          redAthlete: { id: '', name: '(BELUM ADA ATLIT)', contingent: '-' },
        }));
      }
      // Reset match state
      setBlueScores(createInitialCornerScores());
      setRedScores(createInitialCornerScores());
      setCurrentRound(1);
      setTimerSeconds(roundDurationSeconds);
      setIsTimerRunning(false);
      setMatchStatus('NOT_STARTED');
      setWinnerAnnouncement(null);
    }

    addLog('SEKRETARIS', 'HAPUS DATA ATLIT', `Pesilat ID ${id} dihapus.`);
  };

  const setRegisteredAthletes = (list: RegisteredAthlete[]) => {
    setRegisteredAthletesState(list);
    const nextMatches = generateMatchesFromAthletes(list);
    setRosterList(nextMatches);

    if (nextMatches.length > 0) {
      const m = nextMatches[0];
      setActiveMatchId(m.id);
      setMatchInfo((prev) => ({
        ...prev,
        id: m.id,
        partaiNumber: m.partaiNumber.replace(/\D/g, '') || '1',
        categoryClass: m.categoryClass,
        ageGroup: m.ageGroup,
        gender: m.gender,
        roundPhase: m.roundPhase,
        blueAthlete: { ...m.blueAthlete },
        redAthlete: { ...m.redAthlete },
      }));
    } else {
      setActiveMatchId('');
      setMatchInfo((prev) => ({
        ...prev,
        id: 'match-empty',
        partaiNumber: '1',
        blueAthlete: { id: '', name: '(BELUM ADA ATLIT)', contingent: '-' },
        redAthlete: { id: '', name: '(BELUM ADA ATLIT)', contingent: '-' },
      }));
    }
    setBlueScores(createInitialCornerScores());
    setRedScores(createInitialCornerScores());
    setCurrentRound(1);
    setTimerSeconds(roundDurationSeconds);
    setIsTimerRunning(false);
    setMatchStatus('NOT_STARTED');
    setWinnerAnnouncement(null);
  };

  const resetRegisteredAthletes = () => {
    setRegisteredAthletesState([]);
    setRosterList([]);
    setActiveMatchId('');
    setMatchInfo((prev) => ({
      ...prev,
      id: 'match-empty',
      partaiNumber: '1',
      blueAthlete: { id: '', name: '(BELUM ADA ATLIT)', contingent: '-' },
      redAthlete: { id: '', name: '(BELUM ADA ATLIT)', contingent: '-' },
    }));
    setBlueScores(createInitialCornerScores());
    setRedScores(createInitialCornerScores());
    setCurrentRound(1);
    setTimerSeconds(roundDurationSeconds);
    setIsTimerRunning(false);
    setMatchStatus('NOT_STARTED');
    setWinnerAnnouncement(null);
    addLog('SEKRETARIS', 'RESET ATLIT & BAGAN', 'Seluruh data atlet, jadwal bagan, dan partai dikosongkan.');
  };

  // History stack for Undo
  const previousStateStack = useRef<Array<{
    blueScores: CornerScores;
    redScores: CornerScores;
    logs: ActivityLog[];
  }>>([]);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Helper to calculate a round's score breakdown
  const calculateRoundScore = useCallback((score: RoundScore): ScoreBreakdown => {
    const pukulanPts = score.pukulan * 1;
    const tendanganPts = score.tendangan * 2;
    const jatuhanPts = score.jatuhan * 3;

    let penaltiesPts = 0;
    if (score.teguran1) penaltiesPts += 1;
    if (score.teguran2) penaltiesPts += 2;
    if (score.peringatan1) penaltiesPts += 5;
    if (score.peringatan2) penaltiesPts += 10;
    penaltiesPts += score.keluarGelanggang * 1;

    const totalSubtotal = pukulanPts + tendanganPts + jatuhanPts - penaltiesPts;

    return {
      pukulanPts,
      tendanganPts,
      jatuhanPts,
      penaltiesPts,
      totalSubtotal,
    };
  }, []);

  // Compute total scores across all 3 rounds
  const computeTotalScore = useCallback(
    (scores: CornerScores): number => {
      const r1 = calculateRoundScore(scores.round1).totalSubtotal;
      const r2 = calculateRoundScore(scores.round2).totalSubtotal;
      const r3 = calculateRoundScore(scores.round3).totalSubtotal;
      return r1 + r2 + r3;
    },
    [calculateRoundScore]
  );

  const blueTotalScore = computeTotalScore(blueScores);
  const redTotalScore = computeTotalScore(redScores);

  // Helper for logging
  const addLog = useCallback(
    (actor: string, action: string, description: string, corner?: Corner, pointChange?: number) => {
      const now = new Date();
      const clockTime = now.toTimeString().split(' ')[0];
      const mins = Math.floor(timerSeconds / 60);
      const secs = timerSeconds % 60;
      const matchTimerFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      const newLog: ActivityLog = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        timestamp: Date.now(),
        clockTime,
        round: currentRound,
        matchTimerFormatted,
        actor,
        corner,
        action,
        pointChange,
        description,
      };

      setActivityLogs((prev) => [newLog, ...prev.slice(0, 99)]);
    },
    [timerSeconds, currentRound]
  );

  // Push state snapshot to undo stack
  const saveSnapshot = useCallback(() => {
    previousStateStack.current.push({
      blueScores: JSON.parse(JSON.stringify(blueScores)),
      redScores: JSON.parse(JSON.stringify(redScores)),
      logs: [...activityLogs],
    });
    if (previousStateStack.current.length > 20) {
      previousStateStack.current.shift();
    }
  }, [blueScores, redScores, activityLogs]);

  // Check Gap Rule
  useEffect(() => {
    const diff = Math.abs(blueTotalScore - redTotalScore);
    if (diff >= 30 && matchStatus === 'RUNNING' && !gapRuleTriggered) {
      setGapRuleTriggered(true);
      sound.playWarningBeep();
      setIsTimerRunning(false);
      setMatchStatus('PAUSED');
      const leading = blueTotalScore > redTotalScore ? 'SUDUT BIRU' : 'SUDUT MERAH';
      addLog(
        'SYSTEM',
        'GAP RULE AKTIF',
        `Selisih poin >= 30 (+${diff} poin). Pertandingan dihentikan sementara demi keselamatan atlet (${leading} memimpin telak).`
      );
    } else if (diff < 30 && gapRuleTriggered) {
      setGapRuleTriggered(false);
    }
  }, [blueTotalScore, redTotalScore, matchStatus, gapRuleTriggered, addLog]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Broadcast Channel setup + Storage Event for multi-tab / offline sync
  useEffect(() => {
    const applySyncPayload = (payload: any) => {
      if (!payload) return;
      if (payload.matchInfo) setMatchInfo(payload.matchInfo);
      if (payload.matchStatus) setMatchStatus(payload.matchStatus);
      if (payload.currentRound) setCurrentRound(payload.currentRound);
      if (payload.timerSeconds !== undefined) setTimerSeconds(payload.timerSeconds);
      if (payload.roundDurationSeconds !== undefined)
        setRoundDurationSecondsState(payload.roundDurationSeconds);
      if (payload.isTimerRunning !== undefined) setIsTimerRunning(payload.isTimerRunning);
      if (payload.blueScores) setBlueScores(payload.blueScores);
      if (payload.redScores) setRedScores(payload.redScores);
      if (payload.judgePendingVotes) setJudgePendingVotes(payload.judgePendingVotes);
      if (payload.varSession !== undefined) setVarSession(payload.varSession);
      if (payload.gapRuleTriggered !== undefined) setGapRuleTriggered(payload.gapRuleTriggered);
      if (payload.winnerAnnouncement !== undefined) setWinnerAnnouncement(payload.winnerAnnouncement);
      if (payload.activityLogs) setActivityLogs(payload.activityLogs);
      if (payload.isJudgesLocked !== undefined) setIsJudgesLocked(payload.isJudgesLocked);
      if (payload.matchHistory) setMatchHistory(payload.matchHistory);
      if (payload.rosterList) setRosterList(payload.rosterList);
      if (payload.registeredAthletes) setRegisteredAthletesState(payload.registeredAthletes);
      if (payload.activeMatchId) setActiveMatchId(payload.activeMatchId);
      setLastSyncTimestamp(Date.now());
    };

    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannelRef.current = channel;

        channel.onmessage = (event) => {
          const { type, payload } = event.data;
          if (type === 'SYNC_STATE' && payload) {
            applySyncPayload(payload);
          }
        };

        return () => {
          channel.close();
        };
      }
    } catch {
      // BroadcastChannel not available or sandboxed
    }

    // Secondary fallback: storage event listener
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          applySyncPayload(parsed);
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Broadcast and Persist state changes
  const broadcastCurrentState = useCallback(() => {
    const payload = {
      matchInfo,
      matchStatus,
      currentRound,
      timerSeconds,
      roundDurationSeconds,
      isTimerRunning,
      blueScores,
      redScores,
      judgePendingVotes,
      varSession,
      gapRuleTriggered,
      winnerAnnouncement,
      activityLogs,
      isJudgesLocked,
      matchHistory,
      rosterList,
      registeredAthletes,
      activeMatchId,
      timestamp: Date.now(),
    };

    // Save to local storage for durability & offline recovery
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage full or sandboxed
    }

    // Broadcast across tabs
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'SYNC_STATE',
          payload,
        });
      } catch {
        // Ignore
      }
    }
  }, [
    matchInfo,
    matchStatus,
    currentRound,
    timerSeconds,
    roundDurationSeconds,
    isTimerRunning,
    blueScores,
    redScores,
    judgePendingVotes,
    varSession,
    gapRuleTriggered,
    winnerAnnouncement,
    activityLogs,
    isJudgesLocked,
    matchHistory,
    rosterList,
    registeredAthletes,
    activeMatchId,
  ]);

  // Broadcast whenever key states change
  useEffect(() => {
    broadcastCurrentState();
  }, [broadcastCurrentState]);

  // Offline Export state to JSON file
  const exportStateToJson = useCallback(() => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      matchInfo,
      matchStatus,
      currentRound,
      timerSeconds,
      roundDurationSeconds,
      blueScores,
      redScores,
      blueTotalScore,
      redTotalScore,
      activityLogs,
      matchHistory,
      rosterList,
      registeredAthletes,
      activeMatchId,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const filename = `Silat_Backup_${matchInfo.partaiNumber.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }, [
    matchInfo,
    matchStatus,
    currentRound,
    timerSeconds,
    roundDurationSeconds,
    blueScores,
    redScores,
    blueTotalScore,
    redTotalScore,
    activityLogs,
    matchHistory,
    rosterList,
    registeredAthletes,
    activeMatchId,
  ]);

  // Offline Import state from JSON string
  const importStateFromJson = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.matchInfo) setMatchInfo(parsed.matchInfo);
      if (parsed.matchStatus) setMatchStatus(parsed.matchStatus);
      if (parsed.currentRound) setCurrentRound(parsed.currentRound);
      if (parsed.timerSeconds !== undefined) setTimerSeconds(parsed.timerSeconds);
      if (parsed.roundDurationSeconds !== undefined)
        setRoundDurationSecondsState(parsed.roundDurationSeconds);
      if (parsed.blueScores) setBlueScores(parsed.blueScores);
      if (parsed.redScores) setRedScores(parsed.redScores);
      if (parsed.activityLogs) setActivityLogs(parsed.activityLogs);
      if (parsed.matchHistory) setMatchHistory(parsed.matchHistory);
      if (parsed.rosterList) setRosterList(parsed.rosterList);
      if (parsed.registeredAthletes) setRegisteredAthletesState(parsed.registeredAthletes);
      if (parsed.activeMatchId) setActiveMatchId(parsed.activeMatchId);
      setIsTimerRunning(false);
      setGapRuleTriggered(false);
      setWinnerAnnouncement(null);
      setVarSession(null);
      setLastSyncTimestamp(Date.now());
      return true;
    } catch (err) {
      console.error('Failed to import backup JSON:', err);
      return false;
    }
  }, []);

  // Timer Tick Engine
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setMatchStatus('ROUND_FINISHED');
            sound.playArenaBuzzer();
            addLog('TIMER', 'WAKTU HABIS', `Babak ${currentRound} telah selesai.`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds, currentRound, addLog]);

  // Clean up expired judge pending votes (1.8s tolerance window)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setJudgePendingVotes((prev) => {
        const active = prev.filter((v) => now - v.timestamp < 1800);
        
        // Update consensus lamp display
        const lamps = {
          blue: { 1: false, 2: false, 3: false },
          red: { 1: false, 2: false, 3: false },
        };
        active.forEach((vote) => {
          if (vote.corner === 'BLUE') {
            lamps.blue[vote.judgeId] = true;
          } else {
            lamps.red[vote.judgeId] = true;
          }
        });
        setActiveConsensusLamps(lamps);
        return active;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  const toggleMute = () => {
    const nextMute = sound.toggleMute();
    setIsMuted(nextMute);
  };

  const updateMatchInfo = (info: Partial<MatchInfo>) => {
    setMatchInfo((prev) => ({ ...prev, ...info }));
    addLog('SEKRETARIS', 'KONFIGURASI DIUBAH', 'Informasi partai/atlet diperbarui.');
  };

  const startTimer = () => {
    if (isJudgesLocked) setIsJudgesLocked(false);
    setIsTimerRunning(true);
    setMatchStatus('RUNNING');
    sound.playBeep(600, 0.1);
    addLog('DEWAN', 'TIMER DIMULAI', `Pertandingan Babak ${currentRound} berjalan.`);
  };

  const pauseTimer = () => {
    setIsTimerRunning(false);
    setMatchStatus('PAUSED');
    sound.playBeep(450, 0.1);
    addLog('DEWAN', 'TIMER DIJEDA', `Pertandingan Babak ${currentRound} dijeda oleh dewan.`);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(roundDurationSeconds);
    setMatchStatus('NOT_STARTED');
    sound.playBeep(400, 0.15);
    addLog('DEWAN', 'TIMER DIRESET', `Timer Babak ${currentRound} direset ke ${roundDurationSeconds} detik.`);
  };

  const setRoundDuration = (seconds: number) => {
    setRoundDurationSecondsState(seconds);
    if (!isTimerRunning) {
      setTimerSeconds(seconds);
    }
    addLog('DEWAN', 'DURASI DIUBAH', `Durasi babak diatur ke ${seconds} detik.`);
  };

  const setRound = (round: RoundNumber) => {
    setCurrentRound(round);
    setIsTimerRunning(false);
    setTimerSeconds(roundDurationSeconds);
    setMatchStatus('NOT_STARTED');
    sound.playSuccessChime();
    addLog('DEWAN', 'PINDAH BABAK', `Pertandingan beralih ke Babak ${round}.`);
  };

  const nextRound = () => {
    if (currentRound < 3) {
      const nextR = (currentRound + 1) as RoundNumber;
      setRound(nextR);
    } else {
      // Auto finalize match
      setMatchStatus('MATCH_FINISHED');
      addLog('DEWAN', 'PERTANDINGAN SELESAI', 'Seluruh 3 babak telah selesai.');
      sound.playVictoryFanfare();
    }
  };

  // 2 of 3 Consensus Engine for Corner Judges
  const recordJudgeVote = useCallback(
    (judgeId: 1 | 2 | 3, corner: Corner, attackType: AttackType) => {
      if (isJudgesLocked || matchStatus !== 'RUNNING') {
        sound.playWarningBeep();
        return;
      }

      const now = Date.now();
      sound.playBeep(800, 0.08);

      // Check if there is already a matching vote from another judge in the 1.8s window
      const matchingVote = judgePendingVotes.find(
        (v) =>
          v.judgeId !== judgeId &&
          v.corner === corner &&
          v.attackType === attackType &&
          now - v.timestamp < 1800
      );

      if (matchingVote) {
        // Consensus achieved (2 of 3 judges agree)
        saveSnapshot();
        const points = attackType === 'PUKULAN' ? 1 : 2;
        const roundKey = `round${currentRound}` as keyof CornerScores;

        if (corner === 'BLUE') {
          setBlueScores((prev) => ({
            ...prev,
            [roundKey]: {
              ...prev[roundKey],
              pukulan: attackType === 'PUKULAN' ? prev[roundKey].pukulan + 1 : prev[roundKey].pukulan,
              tendangan: attackType === 'TENDANGAN' ? prev[roundKey].tendangan + 1 : prev[roundKey].tendangan,
            },
          }));
        } else {
          setRedScores((prev) => ({
            ...prev,
            [roundKey]: {
              ...prev[roundKey],
              pukulan: attackType === 'PUKULAN' ? prev[roundKey].pukulan + 1 : prev[roundKey].pukulan,
              tendangan: attackType === 'TENDANGAN' ? prev[roundKey].tendangan + 1 : prev[roundKey].tendangan,
            },
          }));
        }

        sound.playSuccessChime();
        addLog(
          `JURI ${matchingVote.judgeId} & JURI ${judgeId}`,
          `${attackType} SAH (+${points})`,
          `Konsensus 2 Juri mengesahkan ${attackType.toLowerCase()} untuk Sudut ${corner === 'BLUE' ? 'Biru' : 'Merah'}.`,
          corner,
          points
        );

        // Remove the matched vote and any duplicate votes from queue
        setJudgePendingVotes((prev) =>
          prev.filter(
            (v) =>
              !(
                (v.judgeId === matchingVote.judgeId || v.judgeId === judgeId) &&
                v.corner === corner &&
                v.attackType === attackType
              )
          )
        );
      } else {
        // Add new pending vote
        const newVote: JudgeVote = { judgeId, corner, attackType, timestamp: now };
        setJudgePendingVotes((prev) => [
          ...prev.filter((v) => !(v.judgeId === judgeId && v.corner === corner && v.attackType === attackType)),
          newVote,
        ]);
      }
    },
    [isJudgesLocked, matchStatus, judgePendingVotes, currentRound, saveSnapshot, addLog]
  );

  // Dewan Jatuhan Controls
  const addJatuhan = (corner: Corner) => {
    saveSnapshot();
    const roundKey = `round${currentRound}` as keyof CornerScores;
    if (corner === 'BLUE') {
      setBlueScores((prev) => ({
        ...prev,
        [roundKey]: { ...prev[roundKey], jatuhan: prev[roundKey].jatuhan + 1 },
      }));
    } else {
      setRedScores((prev) => ({
        ...prev,
        [roundKey]: { ...prev[roundKey], jatuhan: prev[roundKey].jatuhan + 1 },
      }));
    }
    sound.playSuccessChime();
    addLog('DEWAN', 'JATUHAN SAH (+3)', `Dewan Juri mengesahkan nilai Jatuhan untuk Sudut ${corner === 'BLUE' ? 'Biru' : 'Merah'}.`, corner, 3);
  };

  const removeJatuhan = (corner: Corner) => {
    saveSnapshot();
    const roundKey = `round${currentRound}` as keyof CornerScores;
    if (corner === 'BLUE') {
      setBlueScores((prev) => ({
        ...prev,
        [roundKey]: { ...prev[roundKey], jatuhan: Math.max(0, prev[roundKey].jatuhan - 1) },
      }));
    } else {
      setRedScores((prev) => ({
        ...prev,
        [roundKey]: { ...prev[roundKey], jatuhan: Math.max(0, prev[roundKey].jatuhan - 1) },
      }));
    }
    sound.playWarningBeep();
    addLog('DEWAN', 'KOREKSI JATUHAN (-3)', `Dewan Juri membatalkan nilai Jatuhan Sudut ${corner === 'BLUE' ? 'Biru' : 'Merah'}.`, corner, -3);
  };

  // Penalties
  const setBinaan = (corner: Corner, level: number) => {
    saveSnapshot();
    const roundKey = `round${currentRound}` as keyof CornerScores;
    const setter = corner === 'BLUE' ? setBlueScores : setRedScores;
    setter((prev) => ({
      ...prev,
      [roundKey]: { ...prev[roundKey], binaan: level },
    }));
    sound.playWarningBeep();
    addLog('WASIT / DEWAN', `BINAAN ${level}`, `Binaan ${level} diberikan kepada Sudut ${corner === 'BLUE' ? 'Biru' : 'Merah'}. (0 poin)`, corner, 0);
  };

  const toggleTeguran = (corner: Corner, level: 1 | 2) => {
    saveSnapshot();
    const roundKey = `round${currentRound}` as keyof CornerScores;
    const setter = corner === 'BLUE' ? setBlueScores : setRedScores;
    const field = level === 1 ? 'teguran1' : 'teguran2';
    const pointDelta = level === 1 ? -1 : -2;

    setter((prev) => {
      const cur = prev[roundKey][field];
      const nextVal = !cur;
      return {
        ...prev,
        [roundKey]: { ...prev[roundKey], [field]: nextVal },
      };
    });

    sound.playWarningBeep();
    addLog(
      'WASIT / DEWAN',
      `TEGURAN ${level} (${pointDelta})`,
      `Teguran ${level} Sudut ${corner === 'BLUE' ? 'Biru' : 'Merah'} (${pointDelta} poin).`,
      corner,
      pointDelta
    );
  };

  const togglePeringatan = (corner: Corner, level: 1 | 2 | 3) => {
    saveSnapshot();
    const roundKey = `round${currentRound}` as keyof CornerScores;
    const setter = corner === 'BLUE' ? setBlueScores : setRedScores;
    const field = level === 1 ? 'peringatan1' : level === 2 ? 'peringatan2' : 'peringatan3';
    const pointDelta = level === 1 ? -5 : level === 2 ? -10 : 0;

    setter((prev) => {
      const cur = prev[roundKey][field];
      const nextVal = !cur;
      return {
        ...prev,
        [roundKey]: { ...prev[roundKey], [field]: nextVal },
      };
    });

    sound.playWarningBeep();
    if (level === 3) {
      addLog(
        'WASIT / DEWAN',
        'PERINGATAN 3 (DISKUALIFIKASI)',
        `Peringatan 3 / Diskualifikasi untuk Sudut ${corner === 'BLUE' ? 'Biru' : 'Merah'}!`,
        corner
      );
      // Auto declare winner
      const opponent = corner === 'BLUE' ? 'RED' : 'BLUE';
      declareWinner(opponent, 'MENANG_DISKUALIFIKASI', `Diskualifikasi Peringatan 3 untuk Sudut ${corner === 'BLUE' ? 'Biru' : 'Merah'}.`);
    } else {
      addLog(
        'WASIT / DEWAN',
        `PERINGATAN ${level} (${pointDelta})`,
        `Peringatan ${level} Sudut ${corner === 'BLUE' ? 'Biru' : 'Merah'} (${pointDelta} poin).`,
        corner,
        pointDelta
      );
    }
  };

  const adjustKeluarGelanggang = (corner: Corner, delta: number) => {
    saveSnapshot();
    const roundKey = `round${currentRound}` as keyof CornerScores;
    const setter = corner === 'BLUE' ? setBlueScores : setRedScores;

    setter((prev) => {
      const cur = prev[roundKey].keluarGelanggang;
      const nextVal = Math.max(0, cur + delta);
      return {
        ...prev,
        [roundKey]: { ...prev[roundKey], keluarGelanggang: nextVal },
      };
    });

    if (delta > 0) {
      sound.playWarningBeep();
      addLog('WASIT', 'KELUAR GELANGGANG (-1)', `Sudut ${corner === 'BLUE' ? 'Biru' : 'Merah'} keluar dari batas arena gelanggang (-1 poin).`, corner, -1);
    } else {
      addLog('DEWAN', 'KOREKSI KELUAR GELANGGANG', `Koreksi keluar gelanggang Sudut ${corner === 'BLUE' ? 'Biru' : 'Merah'}.`, corner, +1);
    }
  };

  // Undo Last Action
  const undoLastAction = () => {
    if (previousStateStack.current.length > 0) {
      const prev = previousStateStack.current.pop()!;
      setBlueScores(prev.blueScores);
      setRedScores(prev.redScores);
      setActivityLogs(prev.logs);
      sound.playBeep(450, 0.1);
      addLog('DEWAN', 'UNDO AKSI', 'Aksi poin/hukuman terakhir dibatalkan.');
    }
  };

  // VAR System
  const startVarSession = (type: 'JATUHAN' | 'PELANGGARAN', targetCorner: Corner | null, reason: string) => {
    pauseTimer();
    setIsJudgesLocked(false);
    const session: VarSession = {
      active: true,
      type,
      targetCorner,
      reason,
      timestamp: Date.now(),
      votes: {},
      status: 'PENDING',
    };
    setVarSession(session);
    sound.playWarningBeep();
    addLog('DEWAN', `VERIFIKASI VAR (${type})`, `Dewan membuka sesi verifikasi video/voting juri untuk ${reason}.`, targetCorner || undefined);
  };

  const submitJudgeVarVote = (judgeId: 1 | 2 | 3, vote: 'BLUE' | 'RED' | 'INVALID') => {
    if (!varSession || !varSession.active) return;
    sound.playBeep(700, 0.1);
    setVarSession((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        votes: {
          ...prev.votes,
          [judgeId]: vote,
        },
      };
      return updated;
    });
    addLog(`JURI ${judgeId}`, 'VOTE VAR TEREKAM', `Juri ${judgeId} memilih: ${vote === 'BLUE' ? 'SUDUT BIRU' : vote === 'RED' ? 'SUDUT MERAH' : 'TIDAK SAH'}`);
  };

  const resolveVarSession = (winner: 'BLUE' | 'RED' | 'INVALID') => {
    if (!varSession) return;
    const type = varSession.type;

    if (type === 'JATUHAN') {
      if (winner === 'BLUE') {
        addJatuhan('BLUE');
      } else if (winner === 'RED') {
        addJatuhan('RED');
      }
    }

    setVarSession((prev) => (prev ? { ...prev, active: false, status: 'RESOLVED', resultWinner: winner } : null));
    sound.playSuccessChime();
    addLog(
      'DEWAN',
      'HASIL VAR DIRESOLUSI',
      `Hasil verifikasi disahkan: ${winner === 'BLUE' ? 'SUDUT BIRU SAH' : winner === 'RED' ? 'SUDUT MERAH SAH' : 'TIDAK SAH / BATAL'}.`
    );
  };

  const cancelVarSession = () => {
    setVarSession(null);
    sound.playBeep(400, 0.1);
    addLog('DEWAN', 'VAR DIBATALKAN', 'Sesi verifikasi VAR dibatalkan oleh Dewan Juri.');
  };

  // Declare Winner and automatically advance winner to the next round slot in bracket
  const declareWinner = (winner: Corner | 'DRAW', decisionType: DecisionType, reason?: string) => {
    setIsTimerRunning(false);
    setMatchStatus('MATCH_FINISHED');
    setWinnerAnnouncement({
      isOpen: true,
      winner,
      decisionType,
      reason,
    });
    sound.playVictoryFanfare();

    const winnerAthlete = winner === 'BLUE' ? matchInfo.blueAthlete : winner === 'RED' ? matchInfo.redAthlete : null;
    const winnerName = winnerAthlete ? winnerAthlete.name : 'SERI';
    const partaiNumRaw = matchInfo.partaiNumber.replace(/\D/g, '') || matchInfo.partaiNumber;

    addLog('DEWAN', `PEMENANG: ${winnerName}`, `Keputusan: ${decisionType}. ${reason || ''}`);

    // Update rosterList & automatically advance winner to subsequent round slots
    setRosterList((prev) => {
      return prev.map((m) => {
        // 1. Mark current match completed
        if (m.id === activeMatchId || m.partaiNumber.replace(/\D/g, '') === partaiNumRaw) {
          return {
            ...m,
            status: 'COMPLETED',
            blueScore: blueTotalScore,
            redScore: redTotalScore,
            winnerCorner: winner === 'DRAW' ? undefined : winner,
          };
        }

        // 2. If winner exists, replace placeholder in subsequent match slots (e.g. PEMENANG PTY 1)
        if (winnerAthlete && partaiNumRaw) {
          const regexPlaceholder = new RegExp(`(PEMENANG\\s+(PTY|PARTAI)\\s*0*${partaiNumRaw})`, 'i');

          let updatedBlue = m.blueAthlete;
          let updatedRed = m.redAthlete;
          let hasChanged = false;

          if (regexPlaceholder.test(m.blueAthlete.name)) {
            updatedBlue = {
              ...m.blueAthlete,
              id: winnerAthlete.id,
              name: winnerAthlete.name,
              contingent: winnerAthlete.contingent,
            };
            hasChanged = true;
          }

          if (regexPlaceholder.test(m.redAthlete.name)) {
            updatedRed = {
              ...m.redAthlete,
              id: winnerAthlete.id,
              name: winnerAthlete.name,
              contingent: winnerAthlete.contingent,
            };
            hasChanged = true;
          }

          if (hasChanged) {
            return {
              ...m,
              blueAthlete: updatedBlue,
              redAthlete: updatedRed,
            };
          }
        }

        return m;
      });
    });

    // Save to match history immediately
    const historyItem: MatchHistoryItem = {
      id: 'hist-' + Date.now(),
      date: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      matchInfo: { ...matchInfo },
      blueTotalScore,
      redTotalScore,
      winner,
      decisionType,
      durationMinutes: Math.ceil((3 * roundDurationSeconds - timerSeconds) / 60) || 6,
      logs: [...activityLogs],
      scores: {
        blue: JSON.parse(JSON.stringify(blueScores)),
        red: JSON.parse(JSON.stringify(redScores)),
      },
    };

    setMatchHistory((prev) => {
      const filtered = prev.filter(
        (h) => h.matchInfo.partaiNumber.replace(/\D/g, '') !== partaiNumRaw
      );
      return [historyItem, ...filtered];
    });
  };

  const closeWinnerModal = () => {
    setWinnerAnnouncement(null);
  };

  // Save current match to history
  const saveCurrentMatchToHistory = () => {
    let winner: Corner | 'DRAW' = 'DRAW';
    if (blueTotalScore > redTotalScore) winner = 'BLUE';
    else if (redTotalScore > blueTotalScore) winner = 'RED';

    const historyItem: MatchHistoryItem = {
      id: 'hist-' + Date.now(),
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      matchInfo: { ...matchInfo },
      blueTotalScore,
      redTotalScore,
      winner,
      decisionType: winnerAnnouncement?.decisionType || 'MENANG_ANGKA',
      durationMinutes: Math.ceil(((3 * roundDurationSeconds) - timerSeconds) / 60) || 6,
      logs: [...activityLogs],
      scores: {
        blue: JSON.parse(JSON.stringify(blueScores)),
        red: JSON.parse(JSON.stringify(redScores)),
      },
    };

    setMatchHistory((prev) => [historyItem, ...prev]);

    // Update roster match status
    setRosterList((prev) =>
      prev.map((m) =>
        m.id === activeMatchId
          ? {
              ...m,
              status: 'COMPLETED',
              blueScore: blueTotalScore,
              redScore: redTotalScore,
              winnerCorner: winner === 'DRAW' ? undefined : winner,
            }
          : m
      )
    );
  };

  // Reset match for next party
  const resetMatchForNextParty = () => {
    saveCurrentMatchToHistory();
    setBlueScores(createInitialCornerScores());
    setRedScores(createInitialCornerScores());
    setCurrentRound(1);
    setTimerSeconds(roundDurationSeconds);
    setIsTimerRunning(false);
    setMatchStatus('NOT_STARTED');
    setWinnerAnnouncement(null);
    setGapRuleTriggered(false);
    setVarSession(null);
    setJudgePendingVotes([]);
    previousStateStack.current = [];
    addLog('SEKRETARIS', 'PARTAI BARU DIMUAT', 'Papan skor siap untuk partai pertandingan berikutnya.');
  };

  // Load selected match from tournament roster
  const loadMatchFromRoster = (matchId: string) => {
    const found = rosterList.find((m) => m.id === matchId);
    if (!found) return;

    saveSnapshot();
    setActiveMatchId(matchId);
    setMatchInfo((prev) => ({
      ...prev,
      id: found.id,
      partaiNumber: found.partaiNumber,
      categoryClass: found.categoryClass,
      ageGroup: found.ageGroup,
      gender: found.gender,
      roundPhase: found.roundPhase,
      blueAthlete: { ...found.blueAthlete },
      redAthlete: { ...found.redAthlete },
    }));

    setBlueScores(createInitialCornerScores());
    setRedScores(createInitialCornerScores());
    setCurrentRound(1);
    setTimerSeconds(roundDurationSeconds);
    setIsTimerRunning(false);
    setMatchStatus('NOT_STARTED');
    setWinnerAnnouncement(null);
    setGapRuleTriggered(false);

    // Update roster status to IN_PROGRESS
    setRosterList((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: 'IN_PROGRESS' } : m.status === 'IN_PROGRESS' ? { ...m, status: 'SCHEDULED' } : m))
    );

    addLog('SEKRETARIS', 'PARTAI DIMUAT', `${found.partaiNumber}: ${found.blueAthlete.name} vs ${found.redAthlete.name}`);
  };

  const updateRosterList = (list: TournamentMatch[]) => {
    setRosterList(list);
  };

  return (
    <SilatMatchContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        isMuted,
        toggleMute,
        matchInfo,
        updateMatchInfo,
        matchStatus,
        currentRound,
        timerSeconds,
        isTimerRunning,
        roundDurationSeconds,
        startTimer,
        pauseTimer,
        resetTimer,
        setRoundDuration,
        setRound,
        nextRound,
        blueScores,
        redScores,
        blueTotalScore,
        redTotalScore,
        calculateRoundScore,
        judgePendingVotes,
        recordJudgeVote,
        activeConsensusLamps,
        isJudgesLocked,
        setIsJudgesLocked,
        addJatuhan,
        removeJatuhan,
        setBinaan,
        toggleTeguran,
        togglePeringatan,
        adjustKeluarGelanggang,
        undoLastAction,
        varSession,
        startVarSession,
        submitJudgeVarVote,
        resolveVarSession,
        cancelVarSession,
        gapRuleTriggered,
        winnerAnnouncement,
        declareWinner,
        closeWinnerModal,
        resetMatchForNextParty,
        activityLogs,
        addLog,
        matchHistory,
        rosterList,
        activeMatchId,
        loadMatchFromRoster,
        updateRosterList,
        saveCurrentMatchToHistory,
        registeredAthletes,
        addRegisteredAthlete,
        updateRegisteredAthlete,
        deleteRegisteredAthlete,
        setRegisteredAthletes,
        resetRegisteredAthletes,
        isOffline,
        lastSyncTimestamp,
        exportStateToJson,
        importStateFromJson,
      }}
    >
      {children}
    </SilatMatchContext.Provider>
  );
};

export const useSilatMatch = () => {
  const context = useContext(SilatMatchContext);
  if (!context) {
    throw new Error('useSilatMatch must be used within a SilatMatchProvider');
  }
  return context;
};
