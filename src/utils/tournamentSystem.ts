// Types and utilities for Tournament Competition Systems in Pencak Silat

export type TournamentSystemType = "GUGUR" | "POOL" | "PEMASALAN";

export interface TournamentAthlete {
  id: string;
  name: string;
  contingent: string;
  kelas: string;
  usia: string;
  gender: "PUTRA" | "PUTRI";
  gelanggang?: string;
  sistemTanding?: TournamentSystemType;
  tahap?: string;
  poolName?: string;
  score?: number;
  timeSeconds?: number;
  standingRank?: number;
}

export interface KnockoutMatch {
  id: string;
  matchNumber?: string;
  roundName: string; // "PENYISIHAN" | "PEREMPATFINAL" | "SEMIFINAL" | "FINAL"
  roundIndex: number; // 0, 1, 2, 3...
  matchIndexInRound: number;
  athleteBlue?: TournamentAthlete | null;
  athleteRed?: TournamentAthlete | null;
  scoreBlue?: number | string;
  scoreRed?: number | string;
  winner?: any;
  status: string;
  nextMatchId?: string;
  nextMatchRole?: "blue" | "red";
  categoryKey?: string;
  stage?: string;
  partaiNumber?: string | number;
  p1?: TournamentAthlete | null;
  p2?: TournamentAthlete | null;
}

export interface PoolStandingRow {
  athlete: TournamentAthlete;
  played: number;
  scoreTotal: number;
  score?: number;
  timeAverage: string;
  rank: number;
  status: "LOLOS_PLAYOFF" | "RUNNER_UP" | "PESERTA";
}

export interface PoolGroup {
  name: string; // "POOL A", "POOL B", etc.
  athletes: TournamentAthlete[];
  mode: "RANKING" | "KNOCKOUT_INTERNAL"; // Setengah kompetisi vs Gugur internal
  standings: PoolStandingRow[];
  internalMatches: KnockoutMatch[];
  matches?: KnockoutMatch[];
  winner?: TournamentAthlete | null;
  runnerUp?: TournamentAthlete | null;
}

export interface PemasalanBracket {
  id: string;
  name: string; // "BAGAN PEMASALAN 1 (KELAS A REMAJA PUTRA)", etc.
  poolIndex?: number;
  athletes: TournamentAthlete[]; // Maximum 4 athletes
  semifinal1: KnockoutMatch;
  semifinal2: KnockoutMatch;
  finalMatch: KnockoutMatch;
  sf1: KnockoutMatch;
  sf2: KnockoutMatch;
  final: KnockoutMatch;
  juara1?: TournamentAthlete | null; // Medali Emas
  juara2?: TournamentAthlete | null; // Medali Perak
  juara3BersamaA?: TournamentAthlete | null; // Medali Perunggu 1 (Kalah SF1)
  juara3BersamaB?: TournamentAthlete | null; // Medali Perunggu 2 (Kalah SF2)
}

/**
 * Generate Single Elimination (Sistem Gugur Tunggal) Brackets
 */
export function generateSingleEliminationBrackets(athletes: TournamentAthlete[], categoryKey: string = "TUNGGAL"): KnockoutMatch[] {
  if (!athletes || athletes.length === 0) return [];

  const count = athletes.length;
  // Determine power of two size (2, 4, 8, 16, 32)
  let bracketSize = 2;
  while (bracketSize < count) {
    bracketSize *= 2;
  }
  bracketSize = Math.max(bracketSize, 4);

  const totalRounds = Math.log2(bracketSize);
  const roundNames: string[] = [];
  for (let r = 0; r < totalRounds; r++) {
    const remainingMatches = bracketSize / Math.pow(2, r + 1);
    if (remainingMatches === 1) roundNames.push("FINAL");
    else if (remainingMatches === 2) roundNames.push("SEMIFINAL");
    else if (remainingMatches === 4) roundNames.push("PEREMPATFINAL");
    else roundNames.push(`BABAK ${remainingMatches * 2} BESAR`);
  }

  const matches: KnockoutMatch[] = [];
  let matchCounter = 1;

  // Build rounds from first round to final
  let matchMap: { [key: string]: KnockoutMatch } = {};

  // First Round matches
  const firstRoundMatchesCount = bracketSize / 2;
  const firstRoundMatches: KnockoutMatch[] = [];

  for (let m = 0; m < firstRoundMatchesCount; m++) {
    const blueAth = athletes[m * 2] || null;
    const redAth = athletes[m * 2 + 1] || null;
    const pNum = matchCounter++;

    const match: KnockoutMatch = {
      id: `GUGUR_${categoryKey}_R0_M${m + 1}`,
      matchNumber: `P${pNum}`,
      partaiNumber: pNum,
      roundName: roundNames[0],
      stage: roundNames[0],
      roundIndex: 0,
      matchIndexInRound: m,
      athleteBlue: blueAth,
      athleteRed: redAth,
      p1: blueAth,
      p2: redAth,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
      categoryKey,
    };
    firstRoundMatches.push(match);
    matches.push(match);
    matchMap[`0_${m}`] = match;
  }

  // Subsequent rounds
  for (let r = 1; r < totalRounds; r++) {
    const roundMatchesCount = bracketSize / Math.pow(2, r + 1);
    for (let m = 0; m < roundMatchesCount; m++) {
      const pNum = matchCounter++;
      const match: KnockoutMatch = {
        id: `GUGUR_${categoryKey}_R${r}_M${m + 1}`,
        matchNumber: `P${pNum}`,
        partaiNumber: pNum,
        roundName: roundNames[r],
        stage: roundNames[r],
        roundIndex: r,
        matchIndexInRound: m,
        athleteBlue: null,
        athleteRed: null,
        p1: null,
        p2: null,
        scoreBlue: "-",
        scoreRed: "-",
        winner: null,
        status: "BELUM MULAI",
        categoryKey,
      };
      matches.push(match);
      matchMap[`${r}_${m}`] = match;

      // Link previous round parents to this match
      const prevBlueParent = matchMap[`${r - 1}_${m * 2}`];
      const prevRedParent = matchMap[`${r - 1}_${m * 2 + 1}`];
      if (prevBlueParent) {
        prevBlueParent.nextMatchId = match.id;
        prevBlueParent.nextMatchRole = "blue";
      }
      if (prevRedParent) {
        prevRedParent.nextMatchRole = "red";
        prevRedParent.nextMatchId = match.id;
      }
    }
  }

  return matches;
}

/**
 * Generate Pool Group System (Sistem Pool)
 */
export function generatePoolGroups(
  athletes: TournamentAthlete[],
  categoryOrPoolCount: string | number = 2,
  poolCountOrMode: number | ("RANKING" | "KNOCKOUT_INTERNAL") = 2,
  modeOpt?: "RANKING" | "KNOCKOUT_INTERNAL"
): { pools: PoolGroup[]; playoffMatches: KnockoutMatch[] } {
  let poolCount = 2;
  let mode: "RANKING" | "KNOCKOUT_INTERNAL" = "RANKING";

  if (typeof categoryOrPoolCount === "number") {
    poolCount = categoryOrPoolCount;
    if (typeof poolCountOrMode === "string") {
      mode = poolCountOrMode;
    }
  } else {
    if (typeof poolCountOrMode === "number") {
      poolCount = poolCountOrMode;
    }
    if (modeOpt) {
      mode = modeOpt;
    }
  }

  const pools: PoolGroup[] = [];
  const poolLetters = ["A", "B", "C", "D", "E", "F"];

  const actualPoolCount = Math.min(Math.max(poolCount, 2), poolLetters.length);
  for (let i = 0; i < actualPoolCount; i++) {
    pools.push({
      name: `POOL ${poolLetters[i]}`,
      athletes: [],
      mode,
      standings: [],
      internalMatches: [],
    });
  }

  // Distribute athletes into pools sequentially/snake
  athletes.forEach((ath, idx) => {
    const pIdx = idx % actualPoolCount;
    pools[pIdx].athletes.push({
      ...ath,
      poolName: pools[pIdx].name,
      score: ath.score || 9.85 - (idx * 0.03), // Initial seed baseline score
    });
  });

  // Calculate standings or internal matches for each pool
  pools.forEach((pool, pIdx) => {
    const rawRows: PoolStandingRow[] = pool.athletes.map((ath, aIdx) => {
      const status: "LOLOS_PLAYOFF" | "RUNNER_UP" | "PESERTA" = aIdx === 0 ? "LOLOS_PLAYOFF" : aIdx === 1 ? "RUNNER_UP" : "PESERTA";
      const sc = ath.score || Number((9.85 - (aIdx * 0.04)).toFixed(2));
      return {
        athlete: ath,
        played: 1,
        scoreTotal: sc,
        score: sc,
        timeAverage: "02:58",
        rank: aIdx + 1,
        status,
      };
    }).sort((a, b) => b.scoreTotal - a.scoreTotal);

    // Update ranks after sort
    rawRows.forEach((st, sIdx) => {
      st.rank = sIdx + 1;
      st.status = sIdx === 0 ? "LOLOS_PLAYOFF" : sIdx === 1 ? "RUNNER_UP" : "PESERTA";
    });

    pool.standings = rawRows;
    pool.winner = pool.standings[0]?.athlete || pool.athletes[0] || null;
    pool.runnerUp = pool.standings[1]?.athlete || pool.athletes[1] || null;

    if (mode === "KNOCKOUT_INTERNAL") {
      pool.internalMatches = generateSingleEliminationBrackets(pool.athletes, `POOL_${pIdx}`);
      pool.matches = pool.internalMatches;
    } else {
      pool.matches = pool.internalMatches || [];
    }
  });

  // Babak Utama / Playoff Knockout Antar Juara Pool
  const playoffMatches: KnockoutMatch[] = [];
  if (pools.length === 2) {
    // Grand Final Antar Juara Pool A & Juara Pool B + Perebutan Juara 3 (Runner Up A vs Runner Up B)
    playoffMatches.push({
      id: "PLAYOFF_SEMIFINAL_1",
      matchNumber: "PTY-PLAYOFF 1",
      partaiNumber: "PLAYOFF 1",
      roundName: "SEMIFINAL PLAYOFF (POOL A)",
      stage: "SEMIFINAL PLAYOFF (POOL A)",
      roundIndex: 0,
      matchIndexInRound: 0,
      athleteBlue: pools[0].winner || null,
      athleteRed: pools[1].runnerUp || null,
      p1: pools[0].winner || null,
      p2: pools[1].runnerUp || null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    });

    playoffMatches.push({
      id: "PLAYOFF_SEMIFINAL_2",
      matchNumber: "PTY-PLAYOFF 2",
      partaiNumber: "PLAYOFF 2",
      roundName: "SEMIFINAL PLAYOFF (POOL B)",
      stage: "SEMIFINAL PLAYOFF (POOL B)",
      roundIndex: 0,
      matchIndexInRound: 1,
      athleteBlue: pools[1].winner || null,
      athleteRed: pools[0].runnerUp || null,
      p1: pools[1].winner || null,
      p2: pools[0].runnerUp || null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    });

    playoffMatches.push({
      id: "PLAYOFF_FINAL",
      matchNumber: "PTY-GRAND FINAL",
      partaiNumber: "GRAND FINAL",
      roundName: "GRAND FINAL MEDALI EMAS",
      stage: "GRAND FINAL MEDALI EMAS",
      roundIndex: 1,
      matchIndexInRound: 0,
      athleteBlue: null,
      athleteRed: null,
      p1: null,
      p2: null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    });
  } else if (pools.length >= 3) {
    // Top 4 Knockout
    playoffMatches.push({
      id: "PLAYOFF_SF_1",
      matchNumber: "PTY-PLAYOFF SF 1",
      partaiNumber: "PLAYOFF SF 1",
      roundName: "SEMIFINAL JUARA POOL",
      stage: "SEMIFINAL JUARA POOL",
      roundIndex: 0,
      matchIndexInRound: 0,
      athleteBlue: pools[0].winner || null,
      athleteRed: pools[1].winner || null,
      p1: pools[0].winner || null,
      p2: pools[1].winner || null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    });
    playoffMatches.push({
      id: "PLAYOFF_SF_2",
      matchNumber: "PTY-PLAYOFF SF 2",
      partaiNumber: "PLAYOFF SF 2",
      roundName: "SEMIFINAL JUARA POOL",
      stage: "SEMIFINAL JUARA POOL",
      roundIndex: 0,
      matchIndexInRound: 1,
      athleteBlue: pools[2].winner || null,
      athleteRed: pools[3]?.winner || pools[0].runnerUp || null,
      p1: pools[2].winner || null,
      p2: pools[3]?.winner || pools[0].runnerUp || null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    });
    playoffMatches.push({
      id: "PLAYOFF_FINAL",
      matchNumber: "PTY-GRAND FINAL",
      partaiNumber: "GRAND FINAL",
      roundName: "GRAND FINAL MEDALI EMAS",
      stage: "GRAND FINAL MEDALI EMAS",
      roundIndex: 1,
      matchIndexInRound: 0,
      athleteBlue: null,
      athleteRed: null,
      p1: null,
      p2: null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    });
  }

  return { pools, playoffMatches };
}

/**
 * Generate Sistem Pemasalan (Championship / Maksimal 4 Atlet per Bagan)
 * Mekanisme: 1 bagan dibatasi max 4 atlet setara.
 * Semifinal 1 (A1 vs A2), Semifinal 2 (A3 vs A4).
 * Pemenang bertemu di Final (Emas & Perak).
 * Yang kalah di Semifinal otomatis Juara 3 Bersama (Medali Perunggu Bersama).
 */
export function generatePemasalanBrackets(athletes: TournamentAthlete[], categoryName: string = "TUNGGAL"): PemasalanBracket[] {
  if (!athletes || athletes.length === 0) return [];

  const brackets: PemasalanBracket[] = [];
  const chunkSize = 4;

  for (let i = 0; i < athletes.length; i += chunkSize) {
    const chunk = athletes.slice(i, i + chunkSize);
    const bracketNum = Math.floor(i / chunkSize) + 1;
    const bracketId = `PEMASALAN_BAGAN_${bracketNum}`;

    const ath1 = chunk[0] || null;
    const ath2 = chunk[1] || null;
    const ath3 = chunk[2] || null;
    const ath4 = chunk[3] || null;

    const sf1: KnockoutMatch = {
      id: `${bracketId}_SF1`,
      matchNumber: `PTY ${bracketNum}.1`,
      partaiNumber: `${bracketNum}.1`,
      roundName: "SEMIFINAL 1",
      stage: "SEMIFINAL 1",
      roundIndex: 0,
      matchIndexInRound: 0,
      athleteBlue: ath1,
      athleteRed: ath2,
      p1: ath1,
      p2: ath2,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
      nextMatchId: `${bracketId}_FINAL`,
      nextMatchRole: "blue",
    };

    const sf2: KnockoutMatch = {
      id: `${bracketId}_SF2`,
      matchNumber: `PTY ${bracketNum}.2`,
      partaiNumber: `${bracketNum}.2`,
      roundName: "SEMIFINAL 2",
      stage: "SEMIFINAL 2",
      roundIndex: 0,
      matchIndexInRound: 1,
      athleteBlue: ath3,
      athleteRed: ath4,
      p1: ath3,
      p2: ath4,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
      nextMatchId: `${bracketId}_FINAL`,
      nextMatchRole: "red",
    };

    const finalMatch: KnockoutMatch = {
      id: `${bracketId}_FINAL`,
      matchNumber: `PTY ${bracketNum}.FINAL`,
      partaiNumber: `${bracketNum}.FINAL`,
      roundName: "FINAL EMAS & PERAK",
      stage: "FINAL EMAS & PERAK",
      roundIndex: 1,
      matchIndexInRound: 0,
      athleteBlue: null,
      athleteRed: null,
      p1: null,
      p2: null,
      scoreBlue: "-",
      scoreRed: "-",
      winner: null,
      status: "BELUM MULAI",
    };

    brackets.push({
      id: bracketId,
      name: `BAGAN PEMASALAN ${bracketNum} - ${categoryName}`,
      poolIndex: bracketNum,
      athletes: chunk,
      semifinal1: sf1,
      semifinal2: sf2,
      finalMatch,
      sf1,
      sf2,
      final: finalMatch,
      juara1: null,
      juara2: null,
      juara3BersamaA: null,
      juara3BersamaB: null,
    });
  }

  return brackets;
}

/**
 * Handle match outcome updates and calculate downstream winners, finals, and medals
 */
export function updatePemasalanOutcome(
  bracket: PemasalanBracket,
  matchKeyOrId: "sf1" | "sf2" | "final" | string,
  winnerCorner: "blue" | "red" | "p1" | "p2",
  scoreBlue: number = 9.85,
  scoreRed: number = 9.80
): PemasalanBracket {
  const updated = { ...bracket };
  const winnerRole: "blue" | "red" = winnerCorner === "p1" || winnerCorner === "blue" ? "blue" : "red";

  if (matchKeyOrId === "sf1" || matchKeyOrId === updated.semifinal1.id) {
    const currentSf1 = updated.sf1 || updated.semifinal1;
    const updatedSf1 = {
      ...currentSf1,
      winner: winnerRole,
      scoreBlue,
      scoreRed,
      status: "SELESAI" as const,
    };
    updated.semifinal1 = updatedSf1;
    updated.sf1 = updatedSf1;

    const winnerAth = winnerRole === "blue" ? updatedSf1.athleteBlue : updatedSf1.athleteRed;
    const loserAth = winnerRole === "blue" ? updatedSf1.athleteRed : updatedSf1.athleteBlue;

    const currentFinal = updated.final || updated.finalMatch;
    const updatedFinal = {
      ...currentFinal,
      athleteBlue: winnerAth || null,
      p1: winnerAth || null,
    };
    updated.finalMatch = updatedFinal;
    updated.final = updatedFinal;
    // Semifinal 1 loser automatically becomes Juara 3 Bersama A (Medali Perunggu)
    updated.juara3BersamaA = loserAth || null;
  } else if (matchKeyOrId === "sf2" || matchKeyOrId === updated.semifinal2.id) {
    const currentSf2 = updated.sf2 || updated.semifinal2;
    const updatedSf2 = {
      ...currentSf2,
      winner: winnerRole,
      scoreBlue,
      scoreRed,
      status: "SELESAI" as const,
    };
    updated.semifinal2 = updatedSf2;
    updated.sf2 = updatedSf2;

    const winnerAth = winnerRole === "blue" ? updatedSf2.athleteBlue : updatedSf2.athleteRed;
    const loserAth = winnerRole === "blue" ? updatedSf2.athleteRed : updatedSf2.athleteBlue;

    const currentFinal = updated.final || updated.finalMatch;
    const updatedFinal = {
      ...currentFinal,
      athleteRed: winnerAth || null,
      p2: winnerAth || null,
    };
    updated.finalMatch = updatedFinal;
    updated.final = updatedFinal;
    // Semifinal 2 loser automatically becomes Juara 3 Bersama B (Medali Perunggu)
    updated.juara3BersamaB = loserAth || null;
  } else if (matchKeyOrId === "final" || matchKeyOrId === updated.finalMatch.id) {
    const currentFinal = updated.final || updated.finalMatch;
    const updatedFinal = {
      ...currentFinal,
      winner: winnerRole,
      scoreBlue,
      scoreRed,
      status: "SELESAI" as const,
    };
    updated.finalMatch = updatedFinal;
    updated.final = updatedFinal;

    const winnerAth = winnerRole === "blue" ? updatedFinal.athleteBlue : updatedFinal.athleteRed;
    const loserAth = winnerRole === "blue" ? updatedFinal.athleteRed : updatedFinal.athleteBlue;

    updated.juara1 = winnerAth || null; // Emas
    updated.juara2 = loserAth || null;  // Perak
  }

  return updated;
}
