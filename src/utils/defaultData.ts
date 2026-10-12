import { MatchInfo, RoundScore, CornerScores, TournamentMatch, MatchHistoryItem, RegisteredAthlete } from '../types/silat';

export const defaultRegisteredAthletes: RegisteredAthlete[] = [
  {
    id: 'ath-reg-01',
    name: 'ADI WIJAYA',
    contingent: 'JAWA TENGAH',
    categoryClass: 'KELAS A',
    ageGroup: 'REMAJA',
    gender: 'PUTRA',
    createdAt: Date.now() - 100000,
  },
  {
    id: 'ath-reg-02',
    name: 'BAMBANG PAMUNGKAS',
    contingent: 'JAWA TIMUR',
    categoryClass: 'KELAS A',
    ageGroup: 'REMAJA',
    gender: 'PUTRA',
    createdAt: Date.now() - 90000,
  },
  {
    id: 'ath-reg-03',
    name: 'CITRA LESTARI',
    contingent: 'DKI JAKARTA',
    categoryClass: 'KELAS A',
    ageGroup: 'REMAJA',
    gender: 'PUTRI',
    createdAt: Date.now() - 80000,
  },
  {
    id: 'ath-reg-04',
    name: 'DEWI ANGGRAENI',
    contingent: 'JAWA BARAT',
    categoryClass: 'KELAS A',
    ageGroup: 'REMAJA',
    gender: 'PUTRI',
    createdAt: Date.now() - 70000,
  },
  {
    id: 'ath-reg-05',
    name: 'EKO PRASETYO',
    contingent: 'BALI',
    categoryClass: 'KELAS B',
    ageGroup: 'DEWASA',
    gender: 'PUTRA',
    createdAt: Date.now() - 60000,
  },
  {
    id: 'ath-reg-06',
    name: 'FAJAR SHIDDIQ',
    contingent: 'SUMATERA UTARA',
    categoryClass: 'KELAS B',
    ageGroup: 'DEWASA',
    gender: 'PUTRA',
    createdAt: Date.now() - 50000,
  },
  {
    id: 'ath-reg-07',
    name: 'GILANG RAMADHAN',
    contingent: 'DI YOGYAKARTA',
    categoryClass: 'KELAS C',
    ageGroup: 'DEWASA',
    gender: 'PUTRA',
    createdAt: Date.now() - 40000,
  },
  {
    id: 'ath-reg-08',
    name: 'HAFIDZ AL-FATIH',
    contingent: 'BANTEN',
    categoryClass: 'KELAS C',
    ageGroup: 'DEWASA',
    gender: 'PUTRA',
    createdAt: Date.now() - 30000,
  },
];

export function generateMatchesFromAthletes(athletes: RegisteredAthlete[]): TournamentMatch[] {
  if (!athletes || athletes.length === 0) return [];

  // Group by categoryClass + ageGroup + gender
  const groups: Record<string, RegisteredAthlete[]> = {};
  athletes.forEach((ath) => {
    const key = `${ath.categoryClass || 'KELAS A'}__${ath.ageGroup || 'REMAJA'}__${ath.gender || 'PUTRA'}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(ath);
  });

  const matches: TournamentMatch[] = [];
  let partaiCounter = 1;

  Object.entries(groups).forEach(([groupKey, groupAthletes]) => {
    const [categoryClass, ageGroup, gender] = groupKey.split('__');
    const parsedGender = (gender === 'PUTRI' ? 'PUTRI' : 'PUTRA') as 'PUTRA' | 'PUTRI';
    const total = groupAthletes.length;

    if (total === 1) {
      matches.push({
        id: `match-gen-${groupAthletes[0].id}`,
        partaiNumber: `PARTAI ${String(partaiCounter).padStart(2, '0')}`,
        roundPhase: 'FINAL',
        categoryClass,
        ageGroup,
        gender: parsedGender,
        blueAthlete: {
          id: groupAthletes[0].id,
          name: groupAthletes[0].name,
          contingent: groupAthletes[0].contingent,
          category: `Tanding ${categoryClass} ${ageGroup} ${parsedGender}`,
        },
        redAthlete: {
          id: `ath-bye-${groupAthletes[0].id}`,
          name: '(MENUNGGU LAWAN)',
          contingent: 'BYE',
          category: `Tanding ${categoryClass} ${ageGroup} ${parsedGender}`,
        },
        status: 'SCHEDULED',
        bracketPosition: partaiCounter,
      });
      partaiCounter++;
    } else if (total === 2) {
      matches.push({
        id: `match-gen-${groupAthletes[0].id}-${groupAthletes[1].id}`,
        partaiNumber: `PARTAI ${String(partaiCounter).padStart(2, '0')}`,
        roundPhase: 'FINAL',
        categoryClass,
        ageGroup,
        gender: parsedGender,
        blueAthlete: {
          id: groupAthletes[0].id,
          name: groupAthletes[0].name,
          contingent: groupAthletes[0].contingent,
          category: `Tanding ${categoryClass} ${ageGroup} ${parsedGender}`,
        },
        redAthlete: {
          id: groupAthletes[1].id,
          name: groupAthletes[1].name,
          contingent: groupAthletes[1].contingent,
          category: `Tanding ${categoryClass} ${ageGroup} ${parsedGender}`,
        },
        status: 'SCHEDULED',
        bracketPosition: partaiCounter,
      });
      partaiCounter++;
    } else {
      for (let i = 0; i < total; i += 2) {
        const blue = groupAthletes[i];
        const red = groupAthletes[i + 1];
        let phase: 'PENYISIHAN' | 'PEREMPAT_FINAL' | 'SEMIFINAL' | 'FINAL' = 'PENYISIHAN';
        if (total <= 4) phase = 'SEMIFINAL';
        else if (total <= 8) phase = 'PEREMPAT_FINAL';

        matches.push({
          id: `match-gen-${blue.id}-${red ? red.id : 'bye'}`,
          partaiNumber: `PARTAI ${String(partaiCounter).padStart(2, '0')}`,
          roundPhase: phase,
          categoryClass,
          ageGroup,
          gender: parsedGender,
          blueAthlete: {
            id: blue.id,
            name: blue.name,
            contingent: blue.contingent,
            category: `Tanding ${categoryClass} ${ageGroup} ${parsedGender}`,
          },
          redAthlete: red
            ? {
                id: red.id,
                name: red.name,
                contingent: red.contingent,
                category: `Tanding ${categoryClass} ${ageGroup} ${parsedGender}`,
              }
            : {
                id: `ath-bye-${blue.id}`,
                name: '(MENUNGGU LAWAN)',
                contingent: 'BYE',
                category: `Tanding ${categoryClass} ${ageGroup} ${parsedGender}`,
              },
          status: 'SCHEDULED',
          bracketPosition: partaiCounter,
        });
        partaiCounter++;
      }
    }
  });

  return matches;
}

export const initialRoundScore: RoundScore = {
  pukulan: 0,
  tendangan: 0,
  jatuhan: 0,
  binaan: 0,
  teguran1: false,
  teguran2: false,
  peringatan1: false,
  peringatan2: false,
  peringatan3: false,
  keluarGelanggang: 0,
};

export const createInitialCornerScores = (): CornerScores => ({
  round1: { ...initialRoundScore },
  round2: { ...initialRoundScore },
  round3: { ...initialRoundScore },
});

export const defaultRosterList: TournamentMatch[] = generateMatchesFromAthletes(defaultRegisteredAthletes);

const firstMatch = defaultRosterList[0];

export const initialMatchInfo: MatchInfo = {
  id: firstMatch ? firstMatch.id : 'match-01',
  partaiNumber: firstMatch ? firstMatch.partaiNumber.replace(/\D/g, '') || '1' : '1',
  tournamentName: 'KEJUARAAN PENCAK SILAT INDONESIA 2026',
  arena: 'GELANGGANG A',
  venue: 'PADEPOKAN PENCAK SILAT TMII / JAKARTA',
  eventDate: '24 JUNI 2026',
  logoLeft: '',
  logoRight: '',
  categoryClass: firstMatch ? firstMatch.categoryClass : 'KELAS A',
  classNumber: 'A',
  ageGroup: firstMatch ? firstMatch.ageGroup : 'REMAJA',
  gender: firstMatch ? firstMatch.gender : 'PUTRA',
  roundPhase: firstMatch ? firstMatch.roundPhase : 'FINAL',
  roundDurationSeconds: 120, // 2 minutes
  blueAthlete: firstMatch
    ? { ...firstMatch.blueAthlete }
    : {
        id: 'ath-blue-01',
        name: 'ADI WIJAYA',
        contingent: 'JAWA TENGAH',
        weightClass: '',
        category: 'KELAS A REMAJA PUTRA',
      },
  redAthlete: firstMatch
    ? { ...firstMatch.redAthlete }
    : {
        id: 'ath-red-01',
        name: 'BAMBANG PAMUNGKAS',
        contingent: 'JAWA TIMUR',
        weightClass: '',
        category: 'KELAS A REMAJA PUTRA',
      },
};

export const sampleMatchHistory: MatchHistoryItem[] = [
  {
    id: 'hist-00',
    date: '17 Agu 2026 09:30',
    matchInfo: {
      id: 'match-prev-01',
      partaiNumber: 'PARTAI PREV 01',
      tournamentName: 'KEJUARAAN NASIONAL PENCAK SILAT PIALA MENPORA 2026',
      arena: 'GELANGGANG A',
      categoryClass: 'KELAS B (50 - 55 KG)',
      ageGroup: 'DEWASA',
      gender: 'PUTRA',
      roundPhase: 'PEREMPAT FINAL',
      roundDurationSeconds: 120,
      blueAthlete: {
        id: 'ath-prev-1',
        name: 'IKHLASUL AMAL',
        contingent: 'BANTEN',
      },
      redAthlete: {
        id: 'ath-prev-2',
        name: 'RAFLI ADITYA',
        contingent: 'YOGYAKARTA',
      },
    },
    blueTotalScore: 28,
    redTotalScore: 19,
    winner: 'BLUE',
    decisionType: 'MENANG_ANGKA',
    durationMinutes: 6,
    logs: [],
    scores: {
      blue: {
        round1: { pukulan: 3, tendangan: 2, jatuhan: 1, binaan: 0, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false, keluarGelanggang: 0 },
        round2: { pukulan: 4, tendangan: 3, jatuhan: 0, binaan: 1, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false, keluarGelanggang: 0 },
        round3: { pukulan: 2, tendangan: 2, jatuhan: 1, binaan: 0, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false, keluarGelanggang: 0 },
      },
      red: {
        round1: { pukulan: 2, tendangan: 1, jatuhan: 0, binaan: 0, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false, keluarGelanggang: 1 },
        round2: { pukulan: 3, tendangan: 2, jatuhan: 1, binaan: 0, teguran1: true, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false, keluarGelanggang: 0 },
        round3: { pukulan: 1, tendangan: 1, jatuhan: 0, binaan: 0, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, peringatan3: false, keluarGelanggang: 0 },
      },
    },
  },
];
