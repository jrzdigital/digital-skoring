import React, { useState, useMemo, useRef } from "react";
import { 
  Trophy, 
  Search, 
  CheckCircle2, 
  Flame, 
  Users,
  Sparkles,
  Award
} from "lucide-react";

export interface BracketParticipant {
  id: string;
  name: string;
  club?: string;
  contingent?: string;
  gender?: "PUTRA" | "PUTRI" | string;
  categoryClassId?: string;
  seed?: number;
  weight?: number;
}

export interface BracketMatch {
  id: string;
  matchNumber?: string | number;
  categoryClassId?: string;
  stage?: string;
  gender?: "PUTRA" | "PUTRI" | string;
  fighterRedId?: string;
  fighterBlueId?: string;
  fighterRedName?: string;
  fighterRedClub?: string;
  fighterBlueName?: string;
  fighterBlueClub?: string;
  status?: "BELUM" | "SEDANG" | "SELESAI" | "TERDAFTAR" | string;
  winner?: "MERAH" | "BIRU" | null;
  scoreRed?: number;
  scoreBlue?: number;
  arena?: string;
  roundDuration?: number;
  totalRounds?: number;
}

export interface TournamentBracketProps {
  participants: BracketParticipant[];
  matches?: BracketMatch[];
  categoryName?: string;
  categoryClassId?: string;
  gender?: "PUTRA" | "PUTRI";
  poolScheme?: "SINGLE_NO_POOL" | "POOL_AB" | "DOUBLE_POOL" | string;
  arenaName?: string;
  readOnly?: boolean;
  onSelectMatch?: (match: BracketMatch) => void;
  onSelectAthlete?: (athlete: BracketParticipant) => void;
  className?: string;
}

// Clean helper to prevent double "Partai Partai"
export const cleanPartaiText = (val: any, fallback?: any): string => {
  if (!val && val !== 0 && !fallback && fallback !== 0) return "PARTAI -";
  const raw = String(val || fallback || "").trim();
  const cleaned = raw.replace(/^(partai\s*)+/i, "").trim();
  return cleaned ? `PARTAI ${cleaned}` : "PARTAI -";
};

export const TournamentBracketView: React.FC<TournamentBracketProps> = ({
  participants = [],
  matches = [],
  categoryName = "Kategori Pertandingan",
  categoryClassId,
  gender = "PUTRA",
  poolScheme = "DOUBLE_POOL",
  arenaName = "GELANGGANG A",
  onSelectMatch,
  className = ""
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const bracketContainerRef = useRef<HTMLDivElement>(null);

  // Normalize scheme mode
  const isDualSided = poolScheme === "POOL_AB" || poolScheme === "DOUBLE_POOL";

  // Helper to filter out dummy/placeholder athletes
  const isDummyAthlete = (p: BracketParticipant) => {
    if (!p) return true;
    const name = (p.name || "").toUpperCase();
    const club = (p.club || p.contingent || "").toUpperCase();
    const id = (p.id || "").toString();
    if (name.startsWith("PESILAT ") && (club.startsWith("KONTINGEN ") || club === "")) return true;
    if (id.includes("-cat-") || id.startsWith("p-cat-") || id.startsWith("p-manual-dummy")) return true;
    return false;
  };

  // Filter participants for this bracket
  const activeAthletes = useMemo(() => {
    let list = participants;
    if (categoryClassId) {
      list = list.filter(p => p.categoryClassId === categoryClassId);
    }
    if (gender) {
      list = list.filter(p => !p.gender || p.gender === gender);
    }
    const realList = list.filter(p => !isDummyAthlete(p) && p.name && p.name.trim() !== "");
    return realList.length > 0 ? realList : list.filter(p => p.name && p.name.trim() !== "");
  }, [participants, categoryClassId, gender]);

  // Compute power-of-two capacity (2, 4, 8, 16, 32, 64)
  const reqCapacity = useMemo(() => {
    const N = activeAthletes.length;
    if (N <= 2) return 2;
    if (N <= 4) return 4;
    if (N <= 8) return 8;
    if (N <= 16) return 16;
    if (N <= 32) return 32;
    return 64;
  }, [activeAthletes.length]);

  const totalRounds = useMemo(() => {
    return Math.max(1, Math.round(Math.log2(reqCapacity)));
  }, [reqCapacity]);

  // Filter highlighting check
  const isMatchHighlighted = (redName: string, blueName: string, redClub: string, blueClub: string) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    return (
      redName.toLowerCase().includes(q) ||
      blueName.toLowerCase().includes(q) ||
      redClub.toLowerCase().includes(q) ||
      blueClub.toLowerCase().includes(q)
    );
  };

  // Dynamic stage name
  const getStageTitle = (roundNum: number, totalR: number, poolName?: string) => {
    const pPrefix = poolName ? `${poolName} - ` : "";
    if (roundNum === totalR) return "BABAK FINAL";
    if (roundNum === totalR - 1) return `${pPrefix}SEMIFINAL`;
    if (roundNum === totalR - 2) return `${pPrefix}PEREMPAT FINAL`;
    if (roundNum === totalR - 3) return `${pPrefix}16 BESAR`;
    if (roundNum === totalR - 4) return `${pPrefix}32 BESAR`;
    return `${pPrefix}BABAK ${roundNum}`;
  };

  // ---------------------------------------------------------------------------
  // SINGLE-SIDED BRACKET TREE BUILDER (KLASIK)
  // ---------------------------------------------------------------------------
  const singleBracketData = useMemo(() => {
    if (isDualSided && reqCapacity > 2) return null;

    const N = activeAthletes.length;
    const initialSlots: Array<{ type: "athlete" | "empty"; id: string; name: string; club: string } | null> = [];
    const numMatchesRound1 = reqCapacity / 2;
    let numContested = N - (reqCapacity / 2);
    if (numContested < 0) numContested = 0;

    let athIdx = 0;
    for (let idx = 0; idx < numMatchesRound1; idx++) {
      if (idx < numContested) {
        const athRed = activeAthletes[athIdx++];
        const athBlue = activeAthletes[athIdx++];
        initialSlots.push(athRed ? { type: "athlete", id: athRed.id, name: athRed.name, club: athRed.club || athRed.contingent || "-" } : null);
        initialSlots.push(athBlue ? { type: "athlete", id: athBlue.id, name: athBlue.name, club: athBlue.club || athBlue.contingent || "-" } : null);
      } else {
        if (athIdx < activeAthletes.length) {
          const athRed = activeAthletes[athIdx++];
          initialSlots.push({ type: "athlete", id: athRed.id, name: athRed.name, club: athRed.club || athRed.contingent || "-" });
          initialSlots.push(null);
        } else {
          initialSlots.push(null);
          initialSlots.push(null);
        }
      }
    }

    const roundsTree: any[] = [];
    let currentSlots: any[] = [...initialSlots];
    let matchCounter = 1;

    for (let round = 1; round <= totalRounds; round++) {
      const matchesInRound = reqCapacity / Math.pow(2, round);
      const nextRoundSlots: any[] = [];
      const roundMatches: any[] = [];

      for (let idx = 0; idx < matchesInRound; idx++) {
        const left = currentSlots[idx * 2];
        const right = currentSlots[idx * 2 + 1];

        if (left && right) {
          const generatedMatchId = `m-${categoryClassId || "cat"}-${gender}-r${round}-${idx}`;
          const existingMatch = matches.find(m => 
            m.id === generatedMatchId || 
            (m.id?.includes(`-r${round}-${idx}`) && (m.categoryClassId === categoryClassId || !categoryClassId))
          );

          let fRedName = left.type === "athlete" ? left.name : `Winner(${left.matchId})`;
          let fRedClub = left.type === "athlete" ? left.club : "-";
          let fBlueName = right.type === "athlete" ? right.name : `Winner(${right.matchId})`;
          let fBlueClub = right.type === "athlete" ? right.club : "-";

          if (left.type === "winner" && left.resolvedAthlete) {
            fRedName = left.resolvedAthlete.name;
            fRedClub = left.resolvedAthlete.club;
          } else if (left.type === "winner") {
            fRedName = left.matchNumber ? `PEMENANG ${cleanPartaiText(left.matchNumber)}` : "PEMENANG";
          }

          if (right.type === "winner" && right.resolvedAthlete) {
            fBlueName = right.resolvedAthlete.name;
            fBlueClub = right.resolvedAthlete.club;
          } else if (right.type === "winner") {
            fBlueName = right.matchNumber ? `PEMENANG ${cleanPartaiText(right.matchNumber)}` : "PEMENANG";
          }

          const status = existingMatch?.status || "BELUM";
          const winner = existingMatch?.winner || null;
          const isRedWinner = winner === "MERAH";
          const isBlueWinner = winner === "BIRU";
          const isFinished = status === "SELESAI" || winner !== null;

          const matchNumDisplay = cleanPartaiText(existingMatch?.matchNumber, matchCounter);
          matchCounter++;

          let winnerAth: { id: string; name: string; club: string } | null = null;
          if (isRedWinner) {
            winnerAth = {
              id: left.type === "athlete" ? left.id : left.resolvedAthlete?.id || "",
              name: fRedName,
              club: fRedClub
            };
          } else if (isBlueWinner) {
            winnerAth = {
              id: right.type === "athlete" ? right.id : right.resolvedAthlete?.id || "",
              name: fBlueName,
              club: fBlueClub
            };
          }

          const matchObj = {
            matchId: generatedMatchId,
            matchIndex: idx,
            matchNumberDisplay: matchNumDisplay,
            stage: round === totalRounds ? "FINAL" : round === totalRounds - 1 ? `SEMIFINAL ${idx + 1}` : `PENYISIHAN ${idx + 1}`,
            rawMatch: existingMatch,
            red: {
              id: left.type === "athlete" ? left.id : left.matchId,
              name: fRedName,
              club: fRedClub,
              isWinner: isRedWinner,
              isLoser: isFinished && !isRedWinner,
              score: existingMatch?.scoreRed
            },
            blue: {
              id: right.type === "athlete" ? right.id : right.matchId,
              name: fBlueName,
              club: fBlueClub,
              isWinner: isBlueWinner,
              isLoser: isFinished && !isBlueWinner,
              score: existingMatch?.scoreBlue
            },
            status,
            winnerCorner: winner,
            winnerAthlete: winnerAth
          };

          roundMatches.push(matchObj);
          nextRoundSlots.push({
            type: "winner",
            matchId: generatedMatchId,
            matchNumber: matchNumDisplay,
            resolvedAthlete: winnerAth
          });
        } else if (left && !right) {
          roundMatches.push(null);
          nextRoundSlots.push(left);
        } else if (!left && right) {
          roundMatches.push(null);
          nextRoundSlots.push(right);
        } else {
          roundMatches.push(null);
          nextRoundSlots.push(null);
        }
      }

      roundsTree.push({
        roundNum: round,
        stageTitle: getStageTitle(round, totalRounds),
        matches: roundMatches
      });

      currentSlots = nextRoundSlots;
    }

    const finalRound = roundsTree[roundsTree.length - 1];
    const finalMatch = finalRound?.matches?.find((m: any) => m !== null);
    const tournamentChampion = finalMatch?.winnerAthlete || null;

    return {
      roundsTree,
      totalMatches: matchCounter - 1,
      tournamentChampion,
      finalMatch
    };
  }, [isDualSided, activeAthletes, reqCapacity, totalRounds, categoryClassId, gender, matches]);

  // ---------------------------------------------------------------------------
  // DUAL-SIDED (NASIONAL) BRACKET TREE BUILDER: POOL A (LEFT) & POOL B (RIGHT)
  // ---------------------------------------------------------------------------
  const dualBracketData = useMemo(() => {
    if (!isDualSided || reqCapacity <= 2) return null;

    const N = activeAthletes.length;
    const poolCapacity = reqCapacity / 2;
    const poolRounds = Math.max(1, Math.round(Math.log2(poolCapacity)));

    // Split athletes into Pool A and Pool B
    const halfCount = Math.ceil(N / 2);
    const poolAAthletes = activeAthletes.slice(0, halfCount);
    const poolBAthletes = activeAthletes.slice(halfCount);

    let matchCounter = 1;

    // Helper to build a single pool tree
    const buildPoolTree = (poolAthletes: BracketParticipant[], poolTag: "POOL A" | "POOL B", poolPrefix: string) => {
      const pN = poolAthletes.length;
      const initialSlots: Array<{ type: "athlete" | "empty"; id: string; name: string; club: string } | null> = [];
      const numMatchesRound1 = poolCapacity / 2;
      let numContested = pN - (poolCapacity / 2);
      if (numContested < 0) numContested = 0;

      let athIdx = 0;
      for (let idx = 0; idx < numMatchesRound1; idx++) {
        if (idx < numContested) {
          const athRed = poolAthletes[athIdx++];
          const athBlue = poolAthletes[athIdx++];
          initialSlots.push(athRed ? { type: "athlete", id: athRed.id, name: athRed.name, club: athRed.club || athRed.contingent || "-" } : null);
          initialSlots.push(athBlue ? { type: "athlete", id: athBlue.id, name: athBlue.name, club: athBlue.club || athBlue.contingent || "-" } : null);
        } else {
          if (athIdx < poolAthletes.length) {
            const athRed = poolAthletes[athIdx++];
            initialSlots.push({ type: "athlete", id: athRed.id, name: athRed.name, club: athRed.club || athRed.contingent || "-" });
            initialSlots.push(null);
          } else {
            initialSlots.push(null);
            initialSlots.push(null);
          }
        }
      }

      const poolRoundsTree: any[] = [];
      let currentSlots: any[] = [...initialSlots];

      for (let round = 1; round <= poolRounds; round++) {
        const matchesInRound = poolCapacity / Math.pow(2, round);
        const nextRoundSlots: any[] = [];
        const roundMatches: any[] = [];

        for (let idx = 0; idx < matchesInRound; idx++) {
          const left = currentSlots[idx * 2];
          const right = currentSlots[idx * 2 + 1];

          if (left && right) {
            const generatedMatchId = `m-${categoryClassId || "cat"}-${gender}-${poolPrefix}-r${round}-${idx}`;
            const existingMatch = matches.find(m => 
              m.id === generatedMatchId || 
              (m.id?.includes(`-${poolPrefix}-r${round}-${idx}`) && (m.categoryClassId === categoryClassId || !categoryClassId))
            );

            let fRedName = left.type === "athlete" ? left.name : `Winner(${left.matchId})`;
            let fRedClub = left.type === "athlete" ? left.club : "-";
            let fBlueName = right.type === "athlete" ? right.name : `Winner(${right.matchId})`;
            let fBlueClub = right.type === "athlete" ? right.club : "-";

            if (left.type === "winner" && left.resolvedAthlete) {
              fRedName = left.resolvedAthlete.name;
              fRedClub = left.resolvedAthlete.club;
            } else if (left.type === "winner") {
              fRedName = left.matchNumber ? `PEMENANG ${cleanPartaiText(left.matchNumber)}` : "PEMENANG";
            }

            if (right.type === "winner" && right.resolvedAthlete) {
              fBlueName = right.resolvedAthlete.name;
              fBlueClub = right.resolvedAthlete.club;
            } else if (right.type === "winner") {
              fBlueName = right.matchNumber ? `PEMENANG ${cleanPartaiText(right.matchNumber)}` : "PEMENANG";
            }

            const status = existingMatch?.status || "BELUM";
            const winner = existingMatch?.winner || null;
            const isRedWinner = winner === "MERAH";
            const isBlueWinner = winner === "BIRU";
            const isFinished = status === "SELESAI" || winner !== null;

            const matchNumDisplay = cleanPartaiText(existingMatch?.matchNumber, matchCounter);
            matchCounter++;

            let winnerAth: { id: string; name: string; club: string } | null = null;
            if (isRedWinner) {
              winnerAth = {
                id: left.type === "athlete" ? left.id : left.resolvedAthlete?.id || "",
                name: fRedName,
                club: fRedClub
              };
            } else if (isBlueWinner) {
              winnerAth = {
                id: right.type === "athlete" ? right.id : right.resolvedAthlete?.id || "",
                name: fBlueName,
                club: fBlueClub
              };
            }

            const isPoolFinal = round === poolRounds;
            const stageLabel = isPoolFinal 
              ? `SEMIFINAL (${poolTag})` 
              : round === poolRounds - 1 
              ? `PEREMPAT FINAL (${poolTag})` 
              : `PENYISIHAN ${poolTag} (#${idx + 1})`;

            const matchObj = {
              matchId: generatedMatchId,
              matchIndex: idx,
              matchNumberDisplay: matchNumDisplay,
              stage: stageLabel,
              rawMatch: existingMatch,
              red: {
                id: left.type === "athlete" ? left.id : left.matchId,
                name: fRedName,
                club: fRedClub,
                isWinner: isRedWinner,
                isLoser: isFinished && !isRedWinner,
                score: existingMatch?.scoreRed
              },
              blue: {
                id: right.type === "athlete" ? right.id : right.matchId,
                name: fBlueName,
                club: fBlueClub,
                isWinner: isBlueWinner,
                isLoser: isFinished && !isBlueWinner,
                score: existingMatch?.scoreBlue
              },
              status,
              winnerCorner: winner,
              winnerAthlete: winnerAth
            };

            roundMatches.push(matchObj);
            nextRoundSlots.push({
              type: "winner",
              matchId: generatedMatchId,
              matchNumber: matchNumDisplay,
              resolvedAthlete: winnerAth
            });
          } else if (left && !right) {
            roundMatches.push(null);
            nextRoundSlots.push(left);
          } else if (!left && right) {
            roundMatches.push(null);
            nextRoundSlots.push(right);
          } else {
            roundMatches.push(null);
            nextRoundSlots.push(null);
          }
        }

        poolRoundsTree.push({
          roundNum: round,
          stageTitle: getStageTitle(round, poolRounds, poolTag),
          matches: roundMatches
        });

        currentSlots = nextRoundSlots;
      }

      const poolFinalSlot = currentSlots[0];
      let poolChampion: { id: string; name: string; club: string } | null = null;
      if (poolFinalSlot?.type === "athlete") {
        poolChampion = poolFinalSlot;
      } else if (poolFinalSlot?.resolvedAthlete) {
        poolChampion = poolFinalSlot.resolvedAthlete;
      }

      return {
        roundsTree: poolRoundsTree,
        champion: poolChampion,
        finalSlot: poolFinalSlot
      };
    };

    const poolA = buildPoolTree(poolAAthletes, "POOL A", "poolA");
    const poolB = buildPoolTree(poolBAthletes, "POOL B", "poolB");

    // Build Central Grand Final Match
    const finalMatchId = `m-${categoryClassId || "cat"}-${gender}-grandfinal`;
    const existingFinalMatch = matches.find(m => 
      m.id === finalMatchId || 
      (m.stage?.toUpperCase().includes("FINAL") && !m.stage?.toUpperCase().includes("SEMI") && !m.stage?.toUpperCase().includes("PEREMPAT") && (m.categoryClassId === categoryClassId || !categoryClassId))
    );

    const fRedName = poolA.champion ? poolA.champion.name : "JUARA POOL A (MERAH)";
    const fRedClub = poolA.champion ? poolA.champion.club : "-";
    const fBlueName = poolB.champion ? poolB.champion.name : "JUARA POOL B (BIRU)";
    const fBlueClub = poolB.champion ? poolB.champion.club : "-";

    const finalStatus = existingFinalMatch?.status || "BELUM";
    const finalWinner = existingFinalMatch?.winner || null;
    const isRedWinner = finalWinner === "MERAH";
    const isBlueWinner = finalWinner === "BIRU";
    const isFinished = finalStatus === "SELESAI" || finalWinner !== null;

    const finalMatchNumDisplay = cleanPartaiText(existingFinalMatch?.matchNumber, matchCounter);
    matchCounter++;

    let grandChampion: { id: string; name: string; club: string } | null = null;
    if (isRedWinner && poolA.champion) {
      grandChampion = poolA.champion;
    } else if (isBlueWinner && poolB.champion) {
      grandChampion = poolB.champion;
    }

    const grandFinalMatch = {
      matchId: finalMatchId,
      matchIndex: 0,
      matchNumberDisplay: finalMatchNumDisplay,
      stage: "GRAND FINAL NASIONAL",
      rawMatch: existingFinalMatch,
      red: {
        id: poolA.champion?.id || "poolA-winner",
        name: fRedName,
        club: fRedClub,
        isWinner: isRedWinner,
        isLoser: isFinished && !isRedWinner,
        score: existingFinalMatch?.scoreRed
      },
      blue: {
        id: poolB.champion?.id || "poolB-winner",
        name: fBlueName,
        club: fBlueClub,
        isWinner: isBlueWinner,
        isLoser: isFinished && !isBlueWinner,
        score: existingFinalMatch?.scoreBlue
      },
      status: finalStatus,
      winnerCorner: finalWinner,
      winnerAthlete: grandChampion
    };

    return {
      poolA,
      poolB,
      grandFinalMatch,
      grandChampion,
      totalMatches: matchCounter - 1,
      poolCapacity,
      poolRounds
    };
  }, [isDualSided, activeAthletes, reqCapacity, categoryClassId, gender, matches]);

  // Match Card Renderer Component
  const renderMatchCard = (matchItem: any, isFinal: boolean = false) => {
    if (!matchItem) return null;

    const highlighted = isMatchHighlighted(
      matchItem.red.name,
      matchItem.blue.name,
      matchItem.red.club,
      matchItem.blue.club
    );

    return (
      <div
        key={matchItem.matchId}
        onClick={() => {
          if (matchItem.rawMatch && onSelectMatch) {
            onSelectMatch(matchItem.rawMatch);
          }
        }}
        className={`w-full relative my-auto group select-none transition-all cursor-pointer ${
          highlighted ? "ring-2 ring-yellow-400 scale-[1.02]" : ""
        } ${isFinal ? "max-w-[260px]" : "max-w-[210px]"}`}
      >
        {/* Floating Tag */}
        <div className="absolute top-0 left-2 -translate-y-1/2 z-20 pointer-events-none flex items-center gap-1">
          <div className="inline-flex items-center px-1.5 py-0.5 rounded-none bg-[#05091a] border border-[#2d4285] text-[7.5px] font-mono font-black text-amber-300 tracking-wider shadow-md">
            {matchItem.matchNumberDisplay}
          </div>

          {matchItem.status === "SEDANG" && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-none bg-red-600/90 text-[6.5px] font-bold text-white uppercase animate-pulse">
              <Flame className="w-2 h-2" /> LIVE
            </span>
          )}

          {matchItem.status === "SELESAI" && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-none bg-emerald-600/80 text-[6.5px] font-bold text-white uppercase">
              <CheckCircle2 className="w-2 h-2" /> SELESAI
            </span>
          )}
        </div>

        {/* Main Card */}
        <div className={`w-full bg-[#070c22] border ${
          isFinal
            ? "border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
            : matchItem.status === "SEDANG" 
            ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
            : matchItem.status === "SELESAI"
            ? "border-emerald-700/60"
            : "border-[#1b2854] hover:border-[#3854a8]"
        } rounded-none overflow-hidden shadow-lg transition-all flex flex-col relative`}>
          
          {/* Blue Corner */}
          <div className={`flex items-stretch justify-between min-h-[30px] px-2 pt-2 pb-1 ${
            matchItem.blue.isWinner ? "bg-blue-950/40" : matchItem.blue.isLoser ? "opacity-40" : ""
          }`}>
            <div className="flex flex-col justify-center min-w-0 flex-1 pr-1">
              <div className="flex items-center gap-1">
                <span className="text-[9.5px] font-black text-white uppercase tracking-wide truncate leading-tight">
                  {matchItem.blue.name}
                </span>
                {matchItem.blue.isWinner && (
                  <Trophy className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                )}
              </div>
              <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider truncate leading-tight mt-0.5">
                {matchItem.blue.club}
              </span>
            </div>

            {matchItem.blue.score !== undefined && (
              <div className="flex items-center justify-center px-1 text-[11px] font-mono font-black text-blue-300">
                {matchItem.blue.score}
              </div>
            )}
            <div className="w-1.5 bg-[#2563eb] rounded-none self-stretch shrink-0" />
          </div>

          <div className="h-[1px] bg-[#1e293b] w-full" />

          {/* Red Corner */}
          <div className={`flex items-stretch justify-between min-h-[30px] px-2 pt-1 pb-2 ${
            matchItem.red.isWinner ? "bg-red-950/40" : matchItem.red.isLoser ? "opacity-40" : ""
          }`}>
            <div className="flex flex-col justify-center min-w-0 flex-1 pr-1">
              <div className="flex items-center gap-1">
                <span className="text-[9.5px] font-black text-white uppercase tracking-wide truncate leading-tight">
                  {matchItem.red.name}
                </span>
                {matchItem.red.isWinner && (
                  <Trophy className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                )}
              </div>
              <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider truncate leading-tight mt-0.5">
                {matchItem.red.club}
              </span>
            </div>

            {matchItem.red.score !== undefined && (
              <div className="flex items-center justify-center px-1 text-[11px] font-mono font-black text-red-300">
                {matchItem.red.score}
              </div>
            )}
            <div className="w-1.5 bg-[#dc2626] rounded-none self-stretch shrink-0" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-[#050714] text-slate-100 rounded-none border border-indigo-900/40 shadow-2xl overflow-hidden ${className}`}>
      
      {/* TOP HEADER TOOLBAR */}
      <div className="bg-gradient-to-r from-[#0c0f2b] via-[#111638] to-[#0c0f2b] border-b border-indigo-800/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Title & Metadata */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gradient-to-tr from-amber-600 to-yellow-400 rounded-none shadow-md text-slate-950 font-black">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-wide text-white uppercase font-sans">
                {categoryName}
              </h2>
              <span className={`px-1.5 py-0.5 text-[9px] font-black rounded-none uppercase tracking-wider ${
                gender === "PUTRA" ? "bg-blue-600/30 text-blue-300 border border-blue-500/40" : "bg-pink-600/30 text-pink-300 border border-pink-500/40"
              }`}>
                {gender}
              </span>
              <span className="px-1.5 py-0.5 text-[8.5px] font-mono font-bold bg-amber-500/20 text-amber-300 rounded-none border border-amber-500/30">
                {isDualSided ? "SISTEM 2 SISI (POL A & B)" : "SISTEM 1 SISI (KLASIK)"}
              </span>
            </div>
            <p className="text-[11px] text-indigo-300/70 flex items-center gap-2 mt-0.5">
              <span>{activeAthletes.length} Atlet Terdaftar</span>
              <span>•</span>
              <span>Kapasitas: {reqCapacity} ({totalRounds} Babak)</span>
            </p>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari atlet / kontingen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-6 py-1 bg-[#070b20] border border-indigo-800/50 rounded-none text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-48 sm:w-60 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* MAIN BRACKET VIEW CONTAINER - PROPORTIONALLY DESIGNED TO FIT SCREEN */}
      <div 
        ref={bracketContainerRef}
        className="relative flex-1 w-full overflow-x-auto overflow-y-auto bg-[#040612] min-h-[420px] max-h-[620px] p-3 sm:p-4 flex flex-col justify-center select-none"
      >
        {activeAthletes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center my-auto">
            <div className="w-14 h-14 rounded-full bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center mb-3 text-indigo-400">
              <Users className="w-7 h-7 opacity-60" />
            </div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Belum Ada Atlet Terdaftar
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
              Tambahkan atlet pada kelas ini melalui form registrasi atau spreadsheet untuk mengaktifkan bagan turnamen.
            </p>
          </div>
        ) : isDualSided && dualBracketData ? (
          /* =================================================================== */
          /* DUA SISI (NASIONAL / POOL A & POOL B) SYSTEM LAYOUT */
          /* =================================================================== */
          <div className="w-full flex items-center justify-center gap-3 overflow-x-auto py-2 px-1">
            
            {/* POOL A (LEFT SIDE - LEFT TO RIGHT PROGRESSION) */}
            <div className="flex items-stretch gap-2 shrink-0">
              {dualBracketData.poolA.roundsTree.map((roundObj: any) => {
                const roundNum = roundObj.roundNum;
                const matchesInRound = dualBracketData.poolCapacity / Math.pow(2, roundNum);
                return (
                  <div key={`poolA-r${roundNum}`} className="flex flex-col gap-2 items-center min-w-[190px] max-w-[210px]">
                    <div className="w-full bg-gradient-to-r from-red-700 via-rose-600 to-amber-600 text-white font-black text-[10px] uppercase py-1 px-2 rounded-lg text-center tracking-wider shadow border border-red-400/30">
                      {roundObj.stageTitle}
                    </div>
                    <div className="flex flex-col justify-around h-[480px] w-full py-1">
                      {Array.from({ length: matchesInRound }).map((_, mIdx) => {
                        const matchItem = roundObj.matches[mIdx];
                        if (!matchItem) {
                          return (
                            <div key={mIdx} className="w-full h-12 border border-dashed border-red-900/30 rounded-lg my-auto flex items-center justify-center opacity-40">
                              <span className="text-[8px] font-mono text-slate-500">BYE / LOLOS</span>
                            </div>
                          );
                        }
                        return renderMatchCard(matchItem);
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CENTER COLUMN: GRAND FINAL NASIONAL & PODIUM JUARA 1 */}
            <div className="flex flex-col items-center justify-center gap-3 px-3 py-2 min-w-[270px] shrink-0 z-10">
              
              {/* GRAND CHAMPION PODIUM */}
              <div className="w-full p-3 bg-gradient-to-b from-amber-950/70 via-[#130d2b] to-[#0a0518] border-2 border-amber-400 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.3)] flex flex-col items-center text-center">
                <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[9px] font-black tracking-widest uppercase font-mono">
                    PODIUM JUARA 1 (EMAS)
                  </span>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>

                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center mb-1 shadow-lg font-black">
                  <Trophy className="w-5 h-5" />
                </div>

                <h4 className="text-xs font-black text-white uppercase truncate max-w-[230px]">
                  {dualBracketData.grandChampion?.name || "MENUNGGU HASIL FINAL"}
                </h4>
                <p className="text-[8.5px] font-bold text-amber-400/90 uppercase truncate max-w-[230px] mt-0.5">
                  {dualBracketData.grandChampion?.club || "KONTINGEN JUARA"}
                </p>
              </div>

              {/* GRAND FINAL MATCH HEADER */}
              <div className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-[11px] uppercase py-1.5 px-3 rounded-xl text-center tracking-wider shadow-lg border border-amber-300">
                🏆 BABAK GRAND FINAL (NASIONAL)
              </div>

              {/* GRAND FINAL MATCH CARD */}
              <div className="w-full flex justify-center">
                {renderMatchCard(dualBracketData.grandFinalMatch, true)}
              </div>
            </div>

            {/* POOL B (RIGHT SIDE - RIGHT TO LEFT PROGRESSION) */}
            <div className="flex items-stretch gap-2 shrink-0">
              {dualBracketData.poolB.roundsTree.slice().reverse().map((roundObj: any) => {
                const roundNum = roundObj.roundNum;
                const matchesInRound = dualBracketData.poolCapacity / Math.pow(2, roundNum);
                return (
                  <div key={`poolB-r${roundNum}`} className="flex flex-col gap-2 items-center min-w-[190px] max-w-[210px]">
                    <div className="w-full bg-gradient-to-r from-blue-700 via-indigo-600 to-cyan-600 text-white font-black text-[10px] uppercase py-1 px-2 rounded-lg text-center tracking-wider shadow border border-blue-400/30">
                      {roundObj.stageTitle}
                    </div>
                    <div className="flex flex-col justify-around h-[480px] w-full py-1">
                      {Array.from({ length: matchesInRound }).map((_, mIdx) => {
                        const matchItem = roundObj.matches[mIdx];
                        if (!matchItem) {
                          return (
                            <div key={mIdx} className="w-full h-12 border border-dashed border-blue-900/30 rounded-lg my-auto flex items-center justify-center opacity-40">
                              <span className="text-[8px] font-mono text-slate-500">BYE / LOLOS</span>
                            </div>
                          );
                        }
                        return renderMatchCard(matchItem);
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : singleBracketData ? (
          /* =================================================================== */
          /* SINGLE-SIDED (KLASIK) SYSTEM LAYOUT */
          /* =================================================================== */
          <div className="w-full flex items-stretch justify-center gap-3 overflow-x-auto py-2 px-1">
            {singleBracketData.roundsTree.map((roundObj: any) => {
              const roundNum = roundObj.roundNum;
              const matchesInThisRound = reqCapacity / Math.pow(2, roundNum);

              return (
                <div key={roundNum} className="flex flex-col gap-2 items-center min-w-[190px] max-w-[210px] shrink-0">
                  <div className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-[10px] uppercase py-1 px-2 rounded-lg text-center tracking-wider shadow border border-amber-300/40">
                    {roundObj.stageTitle}
                  </div>

                  <div className="flex flex-col justify-around h-[480px] w-full py-1">
                    {Array.from({ length: matchesInThisRound }).map((_, mIdx) => {
                      const matchItem = roundObj.matches[mIdx];
                      if (!matchItem) {
                        return (
                          <div key={mIdx} className="w-full h-12 border border-dashed border-indigo-900/30 rounded-none my-auto flex items-center justify-center opacity-30">
                            <span className="text-[8px] font-mono text-slate-600">BYE / LOLOS</span>
                          </div>
                        );
                      }
                      return renderMatchCard(matchItem, roundNum === totalRounds);
                    })}
                  </div>
                </div>
              );
            })}

            {/* PODIUM CHAMPION FOR SINGLE-SIDED */}
            {singleBracketData.tournamentChampion && (
              <div className="flex flex-col gap-2 items-center min-w-[200px] justify-center shrink-0">
                <div className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-black text-[10px] uppercase py-1 px-2 rounded-none text-center tracking-wider shadow border border-yellow-300">
                  🏆 JUARA 1 (CHAMPION)
                </div>
                <div className="w-full p-3 bg-gradient-to-b from-amber-950/60 to-[#0c0d24] border-2 border-amber-400 rounded-none shadow-lg flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center mb-1 shadow-md">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-black text-white uppercase">
                    {singleBracketData.tournamentChampion.name}
                  </h4>
                  <p className="text-[8.5px] font-bold text-amber-400/80 uppercase mt-0.5">
                    {singleBracketData.tournamentChampion.club}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* FOOTER BAR: SUMMARY & LEGEND */}
      <div className="bg-[#070a22] border-t border-indigo-900/40 px-4 py-2 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
        <div className="flex items-center flex-wrap gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-none bg-[#2563eb]" />
            <span>Sudut Biru</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-none bg-[#dc2626]" />
            <span>Sudut Merah</span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>Pemenang</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1 py-0.2 rounded-none bg-red-600 text-[8px] font-bold text-white uppercase">LIVE</span>
            <span>Sedang Tanding</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-300 font-mono text-[10px]">
          <span>Arena: <strong className="text-amber-400">{arenaName}</strong></span>
          <span>•</span>
          <span>Status: <strong className="text-emerald-400">Aktif</strong></span>
        </div>
      </div>
    </div>
  );
};
