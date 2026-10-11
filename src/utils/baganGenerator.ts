/**
 * baganGenerator.ts
 * Engine Sinkronisasi Otomatis Bagan Pertandingan & Jadwal Partai Pencak Silat
 * Standar Regulasi PB IPSI / PERSILAT (Sistem Gugur Prestasi & Sistem Pemasalan Usia Dini/Pra Remaja)
 */

export interface GeneratorAthlete {
  id: string;
  name: string;
  club?: string;
  contingent?: string;
  kontingen?: string;
  schoolOrClub?: string;
  gender: "PUTRA" | "PUTRI" | string;
  categoryClassId?: string;
  className?: string;
  classCategory?: string;
  division?: string;
  ageCategory?: string;
  weight?: number;
  arena?: string;
}

export interface GeneratedMatch {
  id: string;
  matchNumber: string;
  stage: string;
  categoryClassId: string;
  fighterRedId: string;
  fighterBlueId: string;
  fighterRedName: string;
  fighterRedClub: string;
  fighterBlueName: string;
  fighterBlueClub: string;
  arena: string;
  gender: string;
  status: "BELUM" | "SEDANG" | "SELESAI";
  winner: "RED" | "BLUE" | null;
  roundDuration: number;
  totalRounds: number;
  pemasalanPool?: number;
  isPemasalan?: boolean;
  isRoundRobin?: boolean;
  roundRobinPool?: string; // "POOL UTAMA", "POOL A", "POOL B", "KNOCKOUT"
  roundNumber?: number;
  classCategory?: string;
  skor?: string;
  scoreRed?: number;
  scoreBlue?: number;
}

// Cek apakah data atlet adalah dummy/placeholder
export function isDummyAthlete(p: any): boolean {
  if (!p) return true;
  const name = (p.name || "").toUpperCase().trim();
  const club = (p.club || p.contingent || p.kontingen || "").toUpperCase().trim();
  const id = (p.id || "").toString();
  if (name.startsWith("PESILAT ") && (club.startsWith("KONTINGEN ") || club === "")) return true;
  if (id.includes("-cat-") || id.startsWith("p-cat-") || id.startsWith("p-manual-dummy")) return true;
  return false;
}

export function isDummyAthleteObj(p: any): boolean {
  return isDummyAthlete(p);
}

// Normalisasi divisi usia
export function normalizeDivision(div?: string): string {
  if (!div) return "DEWASA";
  const up = div.toUpperCase().trim();
  if (up.includes("DINI")) return "USIA DINI";
  if (up.includes("PRA")) return "PRA REMAJA";
  if (up.includes("REMAJA")) return "REMAJA";
  if (up.includes("DEWASA")) return "DEWASA";
  if (up.includes("MASTER")) return "MASTER";
  return up;
}

// Normalisasi label kategori usia standar IPSI 2026 ("Usia Dini", "Pra Remaja", "Remaja", "Dewasa", "Master")
export function normalizeAgeCategoryLabel(raw?: string): string {
  if (!raw) return "Remaja";
  const up = raw.toUpperCase().trim();
  if (up.includes("DINI")) return "Usia Dini";
  if (up.includes("PRA")) return "Pra Remaja";
  if (up.includes("REMAJA")) return "Remaja";
  if (up.includes("DEWASA")) return "Dewasa";
  if (up.includes("MASTER")) return "Master";
  return "Remaja";
}
export const normalizeAgeCategory = normalizeAgeCategoryLabel;

// Normalisasi label kelas tanding standar IPSI 2026 ("Under", "Kelas A" .. "Kelas J", "Kelas Bebas")
export function normalizeWeightClassLabel(raw?: string): string {
  if (!raw) return "Kelas A";
  const trimmed = raw.trim();
  const up = trimmed.toUpperCase();
  if (up.includes("UNDER")) return "Under";
  if (up.includes("BEBAS")) return "Kelas Bebas";
  const m = trimmed.match(/(?:kelas\s*)?([a-j])\b/i);
  if (m && m[1]) {
    return `Kelas ${m[1].toUpperCase()}`;
  }
  if (up.startsWith("KELAS ")) {
    const rest = trimmed.replace(/^kelas\s+/i, "").split(/[\s(]/)[0].toUpperCase();
    return `Kelas ${rest}`;
  }
  return trimmed;
}
export const normalizeWeightClass = normalizeWeightClassLabel;

// Canonical Category Class ID yang konsisten di seluruh LotingPanel, BracketPanel, dan JadwalPanel
export function getCanonicalCategoryClassId(ageCategory?: string, weightClass?: string): string {
  const age = normalizeAgeCategoryLabel(ageCategory).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const cls = normalizeWeightClassLabel(weightClass).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `cat-${age || "remaja"}-${cls || "kelas-a"}`;
}

// Normalisasi objek atlet agar memiliki seluruh field standar yang dibutuhkan Loting, Bagan, dan Jadwal
export function normalizeAthleteRecord(raw: any, fallbackIndex: number = 0): any {
  const ageCategory = normalizeAgeCategoryLabel(raw?.ageCategory || raw?.division || raw?.ageDivision || raw?.usia || "Remaja");
  const weightClass = normalizeWeightClassLabel(raw?.weightClass || raw?.className || raw?.classCategory || raw?.kelas || "Kelas A");
  const gender = String(raw?.gender || "PUTRA").toUpperCase().includes("PUTRI") || String(raw?.gender || "").toUpperCase() === "PI" ? "PUTRI" : "PUTRA";
  const name = String(raw?.name || `ATLET ${fallbackIndex + 1}`).trim().toUpperCase();
  const contingent = String(raw?.contingent || raw?.club || raw?.kontingen || "KONTINGEN").trim().toUpperCase();
  const categoryClassId = getCanonicalCategoryClassId(ageCategory, weightClass);
  const seed = typeof raw?.seed === "number" ? raw.seed : (parseInt(String(raw?.seed || "0"), 10) || 0);
  const weight = typeof raw?.weight === "number" ? raw.weight : (parseFloat(String(raw?.weight || "0")) || 0);

  return {
    ...raw,
    id: raw?.id || `atlet-${Date.now()}-${fallbackIndex}`,
    name,
    contingent,
    club: contingent,
    ageCategory,
    division: ageCategory.toUpperCase(),
    gender,
    category: raw?.category || "TANDING",
    weightClass,
    className: weightClass.toUpperCase(),
    categoryClassId,
    weight,
    seed
  };
}

// Deteksi apakah divisi merupakan Mode Pemasalan (Usia Dini & Pra Remaja)
export function isDivisionPemasalanMode(div?: string): boolean {
  const norm = normalizeDivision(div);
  try {
    const raw = localStorage.getItem("jrz_division_pemasalan_modes");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed[norm] === "boolean") return parsed[norm];
    }
  } catch {}
  return norm === "USIA DINI" || norm === "PRA REMAJA";
}

// Kocok undian adil antar kontingen (Fair distribution)
export function fairShuffleTournamentAthletes(athletes: any[]): any[] {
  if (!athletes || athletes.length <= 1) return athletes ? [...athletes] : [];
  const pool = [...athletes];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const clubGroups: Record<string, any[]> = {};
  pool.forEach(ath => {
    const club = (ath.club || ath.contingent || ath.kontingen || "MANDIRI").trim().toUpperCase();
    if (!clubGroups[club]) clubGroups[club] = [];
    clubGroups[club].push(ath);
  });

  const sortedClubs = Object.keys(clubGroups).sort(
    (a, b) => clubGroups[b].length - clubGroups[a].length
  );

  const N = pool.length;
  const half = Math.ceil(N / 2);
  const leftPool: any[] = [];
  const rightPool: any[] = [];

  sortedClubs.forEach(club => {
    const members = clubGroups[club];
    for (let i = members.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [members[i], members[j]] = [members[j], members[i]];
    }
    const startLeft = Math.random() > 0.5;
    members.forEach((m, idx) => {
      const preferLeft = startLeft ? idx % 2 === 0 : idx % 2 === 1;
      if (preferLeft) {
        if (leftPool.length < half) leftPool.push(m);
        else if (rightPool.length < N - half) rightPool.push(m);
        else leftPool.push(m);
      } else {
        if (rightPool.length < N - half) rightPool.push(m);
        else if (leftPool.length < half) leftPool.push(m);
        else rightPool.push(m);
      }
    });
  });

  return [...leftPool, ...rightPool];
}
export const fairShuffleAthletes = fairShuffleTournamentAthletes;

// Membaca seluruh data atlet terdaftar dari semua sumber penyimpanan
export function loadAllRegisteredParticipants(): any[] {
  const result: any[] = [];
  const seenKeys = new Set<string>();

  const addPart = (item: any) => {
    if (!item) return;
    const name = (item.name || "").trim().toUpperCase();
    if (!name || isDummyAthlete(item)) return;

    const club = (item.club || item.contingent || item.kontingen || "MANDIRI").trim().toUpperCase();
    const gender = (item.gender || "PUTRA").toUpperCase().includes("PUTRI") || (item.gender || "").toUpperCase() === "P" ? "PUTRI" : "PUTRA";

    const rawDiv = item.division || item.ageDivision || item.ageCategory || item.usia || "DEWASA";
    const division = normalizeDivision(rawDiv);
    const normDiv = division.toLowerCase().replace(/\s+/g, "-");

    let rawClass = item.className || item.classCategory || item.kelas || "A";
    let catClassId = item.categoryClassId;
    if (!catClassId) {
      const matchLetter = (rawClass || "").match(/kelas\s+([a-z0-9]+)/i);
      const clean = matchLetter ? matchLetter[1].toLowerCase() : (rawClass || "a").toLowerCase().replace(/kelas\s*/i, "").trim().split(/[\s(]/)[0].replace(/[^a-z0-9]/g, "");
      catClassId = `cat-${normDiv}-kelas-${clean || "a"}`;
    } else if (!catClassId.includes(normDiv)) {
      catClassId = `cat-${normDiv}-${catClassId.replace("cat-", "")}`;
    }

    let className = item.className;
    if (!className) {
      const upper = rawClass.toUpperCase().trim();
      className = upper.startsWith("KELAS") ? upper : `KELAS ${upper}`;
    }

    const weight = item.weight || item.actualWeight || item.beratBadan || item.weightTarget || 50;
    const arena = item.arena || "GELANGGANG A";
    const id = item.id || `ath-${name.replace(/\s+/g, "_")}-${catClassId}-${gender}`;

    const key = `${name}___${catClassId}___${division}___${gender}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      result.push({
        id,
        name,
        club,
        gender,
        categoryClassId: catClassId,
        className,
        division,
        weight,
        arena
      });
    }
  };

  try {
    const rawPortal = localStorage.getItem("jrz_portal_athletes");
    if (rawPortal) {
      const parsed = JSON.parse(rawPortal);
      if (Array.isArray(parsed)) parsed.forEach(addPart);
    }
  } catch {}

  try {
    const rawReg = localStorage.getItem("registered_athletes");
    if (rawReg) {
      const parsed = JSON.parse(rawReg);
      if (Array.isArray(parsed)) parsed.forEach(addPart);
    }
  } catch {}

  try {
    const rawCached = localStorage.getItem("jrz_cached_participants");
    if (rawCached) {
      const parsed = JSON.parse(rawCached);
      if (Array.isArray(parsed)) parsed.forEach(addPart);
    }
  } catch {}

  if (result.length === 0) {
    return [
      { id: "atl-1", name: "MUHAMMAD RIZKY FIRMANSYAH", club: "KONTINGEN JAWA BARAT", gender: "PUTRA", categoryClassId: "cat-kelas-a", className: "KELAS A (45 - 50 KG)", division: "DEWASA", weight: 48.2, arena: "GELANGGANG A" },
      { id: "atl-2", name: "BAGAS PRASETYA NUGRAHA", club: "KONTINGEN JAWA TIMUR", gender: "PUTRA", categoryClassId: "cat-kelas-a", className: "KELAS A (45 - 50 KG)", division: "DEWASA", weight: 48.9, arena: "GELANGGANG A" },
      { id: "atl-3", name: "DIMAS SATRIA PAMUNGKAS", club: "KONTINGEN DKI JAKARTA", gender: "PUTRA", categoryClassId: "cat-kelas-b", className: "KELAS B (50 - 55 KG)", division: "DEWASA", weight: 53.4, arena: "GELANGGANG A" },
      { id: "atl-4", name: "AHMAD FAUZI AL-KAUTSAR", club: "KONTINGEN JAWA TENGAH", gender: "PUTRA", categoryClassId: "cat-kelas-b", className: "KELAS B (50 - 55 KG)", division: "DEWASA", weight: 54.2, arena: "GELANGGANG B" },
      { id: "atl-5", name: "SITI NUR HALIZA", club: "KONTINGEN DI YOGYAKARTA", gender: "PUTRI", categoryClassId: "cat-kelas-a", className: "KELAS A (45 - 50 KG)", division: "DEWASA", weight: 46.8, arena: "GELANGGANG B" },
      { id: "atl-6", name: "DEWI RATNASARI", club: "KONTINGEN BALI", gender: "PUTRI", categoryClassId: "cat-kelas-a", className: "KELAS A (45 - 50 KG)", division: "DEWASA", weight: 49.3, arena: "GELANGGANG B" }
    ];
  }

  return result;
}

// Generate Bagan untuk Kategori Kelas Tanding (Pemasalan atau Pool Prestasi)
export function generateMatchesForClass(params: {
  athletes: any[];
  categoryClassId: string;
  categoryName: string;
  division: string;
  gender: string;
  arena?: string;
  startPartaiNumber?: number;
  schemeType?: "DOUBLE_POOL" | "SINGLE_NO_POOL";
}): GeneratedMatch[] {
  const {
    athletes,
    categoryClassId,
    categoryName,
    division,
    gender,
    arena = "Gelanggang A",
    startPartaiNumber = 1,
    schemeType = "DOUBLE_POOL"
  } = params;

  const validAthletes = athletes.filter(a => !isDummyAthlete(a));
  if (validAthletes.length === 0) return [];

  const shuffledAthletes = fairShuffleTournamentAthletes(validAthletes);
  const isPemasalan = isDivisionPemasalanMode(division);
  const cleanArena = arena.toUpperCase().includes("GELANGGANG") ? arena.toUpperCase() : `GELANGGANG ${arena.toUpperCase()}`;

  const generatedMatches: GeneratedMatch[] = [];
  let matchCounter = 0;

  if (isPemasalan) {
    // Mode Pemasalan: maksimal 4 atlet per pool (Semifinal 1, Semifinal 2, Final)
    const chunkSize = 4;
    const totalPools = Math.max(1, Math.ceil(shuffledAthletes.length / chunkSize));

    for (let pIdx = 0; pIdx < totalPools; pIdx++) {
      const chunk = shuffledAthletes.slice(pIdx * chunkSize, (pIdx + 1) * chunkSize);
      const poolNum = pIdx + 1;
      const poolTag = `POOL ${poolNum}`;

      if (chunk.length === 4) {
        const [ath1, ath2, ath3, ath4] = chunk;
        const sf1Id = `m-${categoryClassId}-${gender}-pem-p${poolNum}-sf1`;
        const sf2Id = `m-${categoryClassId}-${gender}-pem-p${poolNum}-sf2`;
        const finalId = `m-${categoryClassId}-${gender}-pem-p${poolNum}-final`;

        const num1 = startPartaiNumber + matchCounter++;
        const num2 = startPartaiNumber + matchCounter++;
        const numFinal = startPartaiNumber + matchCounter++;

        const sf1Match: GeneratedMatch = {
          id: sf1Id,
          matchNumber: `Partai ${num1 < 10 ? "0" + num1 : num1}`,
          stage: `SEMIFINAL 1 (${poolTag})`,
          categoryClassId,
          fighterRedId: ath1.id,
          fighterRedName: ath1.name,
          fighterRedClub: ath1.club || ath1.contingent || "MANDIRI",
          fighterBlueId: ath2.id,
          fighterBlueName: ath2.name,
          fighterBlueClub: ath2.club || ath2.contingent || "MANDIRI",
          arena: cleanArena,
          gender,
          status: "BELUM",
          winner: null,
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3,
          classCategory: `${categoryName} (${division})`
        };

        const sf2Match: GeneratedMatch = {
          id: sf2Id,
          matchNumber: `Partai ${num2 < 10 ? "0" + num2 : num2}`,
          stage: `SEMIFINAL 2 (${poolTag})`,
          categoryClassId,
          fighterRedId: ath3.id,
          fighterRedName: ath3.name,
          fighterRedClub: ath3.club || ath3.contingent || "MANDIRI",
          fighterBlueId: ath4.id,
          fighterBlueName: ath4.name,
          fighterBlueClub: ath4.club || ath4.contingent || "MANDIRI",
          arena: cleanArena,
          gender,
          status: "BELUM",
          winner: null,
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3,
          classCategory: `${categoryName} (${division})`
        };

        const finalMatch: GeneratedMatch = {
          id: finalId,
          matchNumber: `Partai ${numFinal < 10 ? "0" + numFinal : numFinal}`,
          stage: `FINAL EMAS & PERAK (${poolTag})`,
          categoryClassId,
          fighterRedId: `winner-${sf1Id}`,
          fighterRedName: `PEMENANG SF 1 (${poolTag})`,
          fighterRedClub: "-",
          fighterBlueId: `winner-${sf2Id}`,
          fighterBlueName: `PEMENANG SF 2 (${poolTag})`,
          fighterBlueClub: "-",
          arena: cleanArena,
          gender,
          status: "BELUM",
          winner: null,
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3,
          classCategory: `${categoryName} (${division})`
        };

        generatedMatches.push(sf1Match, sf2Match, finalMatch);
      } else if (chunk.length === 3) {
        const [ath1, ath2, ath3] = chunk;
        const sfId = `m-${categoryClassId}-${gender}-pem-p${poolNum}-sf`;
        const finalId = `m-${categoryClassId}-${gender}-pem-p${poolNum}-final`;

        const num1 = startPartaiNumber + matchCounter++;
        const numFinal = startPartaiNumber + matchCounter++;

        const sfMatch: GeneratedMatch = {
          id: sfId,
          matchNumber: `Partai ${num1 < 10 ? "0" + num1 : num1}`,
          stage: `SEMIFINAL (${poolTag})`,
          categoryClassId,
          fighterRedId: ath1.id,
          fighterRedName: ath1.name,
          fighterRedClub: ath1.club || ath1.contingent || "MANDIRI",
          fighterBlueId: ath2.id,
          fighterBlueName: ath2.name,
          fighterBlueClub: ath2.club || ath2.contingent || "MANDIRI",
          arena: cleanArena,
          gender,
          status: "BELUM",
          winner: null,
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3,
          classCategory: `${categoryName} (${division})`
        };

        const finalMatch: GeneratedMatch = {
          id: finalId,
          matchNumber: `Partai ${numFinal < 10 ? "0" + numFinal : numFinal}`,
          stage: `FINAL EMAS & PERAK (${poolTag})`,
          categoryClassId,
          fighterRedId: ath3.id,
          fighterRedName: ath3.name,
          fighterRedClub: ath3.club || ath3.contingent || "MANDIRI",
          fighterBlueId: `winner-${sfId}`,
          fighterBlueName: `PEMENANG SF (${poolTag})`,
          fighterBlueClub: "-",
          arena: cleanArena,
          gender,
          status: "BELUM",
          winner: null,
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3,
          classCategory: `${categoryName} (${division})`
        };

        generatedMatches.push(sfMatch, finalMatch);
      } else if (chunk.length === 2) {
        const [ath1, ath2] = chunk;
        const finalId = `m-${categoryClassId}-${gender}-pem-p${poolNum}-final`;
        const numFinal = startPartaiNumber + matchCounter++;

        const finalMatch: GeneratedMatch = {
          id: finalId,
          matchNumber: `Partai ${numFinal < 10 ? "0" + numFinal : numFinal}`,
          stage: `FINAL EMAS & PERAK (${poolTag})`,
          categoryClassId,
          fighterRedId: ath1.id,
          fighterRedName: ath1.name,
          fighterRedClub: ath1.club || ath1.contingent || "MANDIRI",
          fighterBlueId: ath2.id,
          fighterBlueName: ath2.name,
          fighterBlueClub: ath2.club || ath2.contingent || "MANDIRI",
          arena: cleanArena,
          gender,
          status: "BELUM",
          winner: null,
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3,
          classCategory: `${categoryName} (${division})`
        };

        generatedMatches.push(finalMatch);
      } else if (chunk.length === 1) {
        const ath = chunk[0];
        const numFinal = startPartaiNumber + matchCounter++;
        generatedMatches.push({
          id: `m-${categoryClassId}-${gender}-pem-p${poolNum}-single`,
          matchNumber: `Partai ${numFinal < 10 ? "0" + numFinal : numFinal}`,
          stage: `FINAL TUNGGAL (${poolTag})`,
          categoryClassId,
          fighterRedId: ath.id,
          fighterRedName: ath.name,
          fighterRedClub: ath.club || ath.contingent || "MANDIRI",
          fighterBlueId: "BYE",
          fighterBlueName: "(MENANG BYE)",
          fighterBlueClub: "-",
          arena: cleanArena,
          gender,
          status: "BELUM",
          winner: "RED",
          pemasalanPool: poolNum,
          isPemasalan: true,
          roundDuration: 120,
          totalRounds: 3,
          classCategory: `${categoryName} (${division})`
        });
      }
    }
  } else {
    // Mode OFF: Sistem Pool (Round-Robin / Setengah Kompetisi) sesuai regulasi resmi PERSILAT
    return generateRoundRobinMatchesForClass({
      athletes: shuffledAthletes,
      categoryClassId,
      categoryName,
      division,
      gender,
      arena: cleanArena,
      startPartaiNumber
    });
  }

  return generatedMatches;
}

// Generate Bagan Sistem Pool (Round-Robin / Setengah Kompetisi) Sesuai Regulasi PERSILAT
export function generateRoundRobinMatchesForClass(params: {
  athletes: any[];
  categoryClassId: string;
  categoryName: string;
  division: string;
  gender: string;
  arena?: string;
  startPartaiNumber?: number;
}): GeneratedMatch[] {
  const {
    athletes,
    categoryClassId,
    categoryName,
    division,
    gender,
    arena = "Gelanggang A",
    startPartaiNumber = 1
  } = params;

  const validAthletes = athletes.filter(a => !isDummyAthlete(a));
  if (validAthletes.length === 0) return [];

  const shuffledAthletes = fairShuffleTournamentAthletes(validAthletes);
  const cleanArena = arena.toUpperCase().includes("GELANGGANG") ? arena.toUpperCase() : `GELANGGANG ${arena.toUpperCase()}`;
  const generatedMatches: GeneratedMatch[] = [];
  let matchCounter = 0;

  // Sesuai aturan PERSILAT untuk Sistem Pool (Round-Robin / Setengah Kompetisi):
  // 1. Jika pesilat 1 orang: Menang Bye
  if (shuffledAthletes.length === 1) {
    const ath = shuffledAthletes[0];
    const numFinal = startPartaiNumber + matchCounter++;
    generatedMatches.push({
      id: `m-${categoryClassId}-${gender}-rr-single`,
      matchNumber: `Partai ${numFinal < 10 ? "0" + numFinal : numFinal}`,
      stage: "FINAL POOL (TUNGGAL)",
      categoryClassId,
      fighterRedId: ath.id,
      fighterRedName: ath.name,
      fighterRedClub: ath.club || ath.contingent || "MANDIRI",
      fighterBlueId: "BYE",
      fighterBlueName: "(MENANG BYE)",
      fighterBlueClub: "-",
      arena: cleanArena,
      gender,
      status: "BELUM",
      winner: "RED",
      isRoundRobin: true,
      roundRobinPool: "POOL UTAMA",
      roundNumber: 1,
      roundDuration: 120,
      totalRounds: 3,
      classCategory: `${categoryName} (${division})`
    });
    return generatedMatches;
  }

  // 2. Jika pesilat 2 orang: Langsung 1 partai penentu Juara 1 dan 2
  if (shuffledAthletes.length === 2) {
    const [ath1, ath2] = shuffledAthletes;
    const numFinal = startPartaiNumber + matchCounter++;
    generatedMatches.push({
      id: `m-${categoryClassId}-${gender}-rr-final`,
      matchNumber: `Partai ${numFinal < 10 ? "0" + numFinal : numFinal}`,
      stage: "FINAL POOL (PENENTU JUARA)",
      categoryClassId,
      fighterRedId: ath1.id,
      fighterRedName: ath1.name,
      fighterRedClub: ath1.club || ath1.contingent || "MANDIRI",
      fighterBlueId: ath2.id,
      fighterBlueName: ath2.name,
      fighterBlueClub: ath2.club || ath2.contingent || "MANDIRI",
      arena: cleanArena,
      gender,
      status: "BELUM",
      winner: null,
      isRoundRobin: true,
      roundRobinPool: "POOL UTAMA",
      roundNumber: 1,
      roundDuration: 120,
      totalRounds: 3,
      classCategory: `${categoryName} (${division})`
    });
    return generatedMatches;
  }

  // 3. Jika 3 s.d 5 pesilat: 1 Pool Tunggal / Pool Utama (Round-Robin Murni, semua pesilat saling berhadapan)
  if (shuffledAthletes.length <= 5) {
    const poolAthletes = [...shuffledAthletes];
    const n = poolAthletes.length;
    const teams = [...poolAthletes];
    const hasDummy = n % 2 !== 0;
    if (hasDummy) {
      teams.push({ id: "BYE", name: "BYE", isDummy: true });
    }
    const totalRounds = teams.length - 1;
    const half = teams.length / 2;

    for (let r = 0; r < totalRounds; r++) {
      const roundNum = r + 1;
      for (let i = 0; i < half; i++) {
        const t1 = teams[i];
        const t2 = teams[teams.length - 1 - i];

        if (t1.id !== "BYE" && t2.id !== "BYE") {
          const numPartai = startPartaiNumber + matchCounter++;
          const matchId = `m-${categoryClassId}-${gender}-rr-r${roundNum}-m${i + 1}`;
          generatedMatches.push({
            id: matchId,
            matchNumber: `Partai ${numPartai < 10 ? "0" + numPartai : numPartai}`,
            stage: `POOL UTAMA (RONDE ${roundNum})`,
            categoryClassId,
            fighterRedId: t1.id,
            fighterRedName: t1.name,
            fighterRedClub: t1.club || t1.contingent || "MANDIRI",
            fighterBlueId: t2.id,
            fighterBlueName: t2.name,
            fighterBlueClub: t2.club || t2.contingent || "MANDIRI",
            arena: cleanArena,
            gender,
            status: "BELUM",
            winner: null,
            isRoundRobin: true,
            roundRobinPool: "POOL UTAMA",
            roundNumber: roundNum,
            roundDuration: 120,
            totalRounds: 3,
            classCategory: `${categoryName} (${division})`
          });
        }
      }
      teams.splice(1, 0, teams.pop()!);
    }
    return generatedMatches;
  }

  // 4. Jika pesilat >= 6 orang: Sesuai aturan PERSILAT, dibagi ke dalam POOL A dan POOL B
  // Dilanjutkan dengan Babak Semifinal Silang (Juara Pool A vs Runner-up Pool B, Juara Pool B vs Runner-up Pool A) dan Grand Final
  const halfCount = Math.ceil(shuffledAthletes.length / 2);
  const poolA = shuffledAthletes.slice(0, halfCount);
  const poolB = shuffledAthletes.slice(halfCount);

  const generateSubPool = (subAthletes: any[], poolName: string) => {
    const teams = [...subAthletes];
    const hasDummy = teams.length % 2 !== 0;
    if (hasDummy) {
      teams.push({ id: "BYE", name: "BYE", isDummy: true });
    }
    const totalRounds = teams.length - 1;
    const half = teams.length / 2;

    for (let r = 0; r < totalRounds; r++) {
      const roundNum = r + 1;
      for (let i = 0; i < half; i++) {
        const t1 = teams[i];
        const t2 = teams[teams.length - 1 - i];

        if (t1.id !== "BYE" && t2.id !== "BYE") {
          const numPartai = startPartaiNumber + matchCounter++;
          const matchId = `m-${categoryClassId}-${gender}-rr-${poolName.toLowerCase().replace(/\s+/g, "")}-r${roundNum}-m${i + 1}`;
          generatedMatches.push({
            id: matchId,
            matchNumber: `Partai ${numPartai < 10 ? "0" + numPartai : numPartai}`,
            stage: `${poolName} (RONDE ${roundNum})`,
            categoryClassId,
            fighterRedId: t1.id,
            fighterRedName: t1.name,
            fighterRedClub: t1.club || t1.contingent || "MANDIRI",
            fighterBlueId: t2.id,
            fighterBlueName: t2.name,
            fighterBlueClub: t2.club || t2.contingent || "MANDIRI",
            arena: cleanArena,
            gender,
            status: "BELUM",
            winner: null,
            isRoundRobin: true,
            roundRobinPool: poolName,
            roundNumber: roundNum,
            roundDuration: 120,
            totalRounds: 3,
            classCategory: `${categoryName} (${division})`
          });
        }
      }
      teams.splice(1, 0, teams.pop()!);
    }
  };

  generateSubPool(poolA, "POOL A");
  generateSubPool(poolB, "POOL B");

  // Babak Lanjutan Silang PERSILAT:
  // Semifinal Silang 1: Juara Pool A vs Runner-up Pool B
  const sfSilang1Id = `m-${categoryClassId}-${gender}-rr-sf-silang1`;
  const numSf1 = startPartaiNumber + matchCounter++;
  generatedMatches.push({
    id: sfSilang1Id,
    matchNumber: `Partai ${numSf1 < 10 ? "0" + numSf1 : numSf1}`,
    stage: "SEMIFINAL SILANG 1 (JUARA POOL A VS RUNNER-UP POOL B)",
    categoryClassId,
    fighterRedId: `winner-poolA`,
    fighterRedName: "JUARA POOL A",
    fighterRedClub: "-",
    fighterBlueId: `runnerup-poolB`,
    fighterBlueName: "RUNNER-UP POOL B",
    fighterBlueClub: "-",
    arena: cleanArena,
    gender,
    status: "BELUM",
    winner: null,
    isRoundRobin: true,
    roundRobinPool: "KNOCKOUT",
    roundNumber: 99,
    roundDuration: 120,
    totalRounds: 3,
    classCategory: `${categoryName} (${division})`
  });

  // Semifinal Silang 2: Juara Pool B vs Runner-up Pool A
  const sfSilang2Id = `m-${categoryClassId}-${gender}-rr-sf-silang2`;
  const numSf2 = startPartaiNumber + matchCounter++;
  generatedMatches.push({
    id: sfSilang2Id,
    matchNumber: `Partai ${numSf2 < 10 ? "0" + numSf2 : numSf2}`,
    stage: "SEMIFINAL SILANG 2 (JUARA POOL B VS RUNNER-UP POOL A)",
    categoryClassId,
    fighterRedId: `winner-poolB`,
    fighterRedName: "JUARA POOL B",
    fighterRedClub: "-",
    fighterBlueId: `runnerup-poolA`,
    fighterBlueName: "RUNNER-UP POOL A",
    fighterBlueClub: "-",
    arena: cleanArena,
    gender,
    status: "BELUM",
    winner: null,
    isRoundRobin: true,
    roundRobinPool: "KNOCKOUT",
    roundNumber: 99,
    roundDuration: 120,
    totalRounds: 3,
    classCategory: `${categoryName} (${division})`
  });

  // Grand Final: Pemenang SF 1 vs Pemenang SF 2
  const grandFinalId = `m-${categoryClassId}-${gender}-rr-grand-final`;
  const numFinal = startPartaiNumber + matchCounter++;
  generatedMatches.push({
    id: grandFinalId,
    matchNumber: `Partai ${numFinal < 10 ? "0" + numFinal : numFinal}`,
    stage: "GRAND FINAL SISTEM POOL PERSILAT (EMAS & PERAK)",
    categoryClassId,
    fighterRedId: `winner-${sfSilang1Id}`,
    fighterRedName: "PEMENANG SF SILANG 1",
    fighterRedClub: "-",
    fighterBlueId: `winner-${sfSilang2Id}`,
    fighterBlueName: "PEMENANG SF SILANG 2",
    fighterBlueClub: "-",
    arena: cleanArena,
    gender,
    status: "BELUM",
    winner: null,
    isRoundRobin: true,
    roundRobinPool: "KNOCKOUT",
    roundNumber: 100,
    roundDuration: 120,
    totalRounds: 3,
    classCategory: `${categoryName} (${division})`
  });

  return generatedMatches;
}

// Interface Klasemen Sistem Pool PERSILAT
export interface RoundRobinStandingRow {
  rank: number;
  athleteId: string;
  name: string;
  club: string;
  played: number;
  won: number;
  lost: number;
  draw: number;
  points: number; // 3 poin per kemenangan sesuai PERSILAT
  scoreFor: number;
  scoreAgainst: number;
  scoreDiff: number;
  statusBadge: string;
}

// Hitung Klasemen Pool Resmi Berdasarkan Regulasi PERSILAT
export function calculateRoundRobinStandings(
  athletes: any[],
  matches: GeneratedMatch[],
  targetPool?: string
): RoundRobinStandingRow[] {
  const statsMap = new Map<string, {
    athlete: any;
    played: number;
    won: number;
    lost: number;
    draw: number;
    points: number;
    scoreFor: number;
    scoreAgainst: number;
  }>();

  athletes.forEach(ath => {
    if (!ath || !ath.id || ath.id === "BYE" || isDummyAthlete(ath)) return;
    statsMap.set(ath.id, {
      athlete: ath,
      played: 0,
      won: 0,
      lost: 0,
      draw: 0,
      points: 0,
      scoreFor: 0,
      scoreAgainst: 0
    });
  });

  const h2h: Record<string, Record<string, string>> = {};

  matches.forEach(m => {
    if (targetPool && m.roundRobinPool && m.roundRobinPool !== targetPool) return;
    if (m.roundRobinPool === "KNOCKOUT") return;

    const redId = m.fighterRedId;
    const blueId = m.fighterBlueId;

    if (!statsMap.has(redId) || !statsMap.has(blueId)) return;

    let sRed = typeof m.scoreRed === "number" ? m.scoreRed : 0;
    let sBlue = typeof m.scoreBlue === "number" ? m.scoreBlue : 0;

    if (m.skor && m.skor.includes("-")) {
      const parts = m.skor.split("-").map(s => parseInt(s.trim(), 10));
      if (!isNaN(parts[0]) && !isNaN(parts[1])) {
        sRed = parts[0];
        sBlue = parts[1];
      }
    }

    if (m.status === "SELESAI" && m.winner) {
      const redStats = statsMap.get(redId)!;
      const blueStats = statsMap.get(blueId)!;

      redStats.played += 1;
      blueStats.played += 1;

      redStats.scoreFor += sRed;
      redStats.scoreAgainst += sBlue;
      blueStats.scoreFor += sBlue;
      blueStats.scoreAgainst += sRed;

      if (!h2h[redId]) h2h[redId] = {};
      if (!h2h[blueId]) h2h[blueId] = {};

      if (m.winner === "RED") {
        redStats.won += 1;
        redStats.points += 3;
        blueStats.lost += 1;
        h2h[redId][blueId] = redId;
        h2h[blueId][redId] = redId;
      } else if (m.winner === "BLUE") {
        blueStats.won += 1;
        blueStats.points += 3;
        redStats.lost += 1;
        h2h[redId][blueId] = blueId;
        h2h[blueId][redId] = blueId;
      }
    }
  });

  const rows: RoundRobinStandingRow[] = Array.from(statsMap.values()).map(({ athlete, played, won, lost, draw, points, scoreFor, scoreAgainst }) => ({
    rank: 1,
    athleteId: athlete.id,
    name: athlete.name,
    club: athlete.club || athlete.contingent || "MANDIRI",
    played,
    won,
    lost,
    draw,
    points,
    scoreFor,
    scoreAgainst,
    scoreDiff: scoreFor - scoreAgainst,
    statusBadge: "PESERTA"
  }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (h2h[a.athleteId] && h2h[a.athleteId][b.athleteId]) {
      const winner = h2h[a.athleteId][b.athleteId];
      if (winner === a.athleteId) return -1;
      if (winner === b.athleteId) return 1;
    }
    if (b.scoreDiff !== a.scoreDiff) return b.scoreDiff - a.scoreDiff;
    if (b.scoreFor !== a.scoreFor) return b.scoreFor - a.scoreFor;
    return a.name.localeCompare(b.name);
  });

  rows.forEach((row, idx) => {
    row.rank = idx + 1;
    if (idx === 0) row.statusBadge = "🥇 JUARA 1 (EMAS)";
    else if (idx === 1) row.statusBadge = "🥈 JUARA 2 (PERAK)";
    else if (idx === 2) row.statusBadge = "🥉 JUARA 3 (PERUNGGU)";
    else if (idx === 3) row.statusBadge = "🥉 JUARA 3 (PERUNGGU)";
    else row.statusBadge = "PESERTA";
  });

  return rows;
}

// Opsi generator bagan sistem gugur kapasitas 2, 4, 8, 16, 32, 64 (Knockout Prestasi)
export function generateKnockoutMatchesForClass(params: {
  athletes: any[];
  categoryClassId: string;
  categoryName: string;
  division: string;
  gender: string;
  arena?: string;
  startPartaiNumber?: number;
  schemeType?: "DOUBLE_POOL" | "SINGLE_NO_POOL";
}): GeneratedMatch[] {
  const {
    athletes,
    categoryClassId,
    categoryName,
    division,
    gender,
    arena = "Gelanggang A",
    startPartaiNumber = 1,
    schemeType = "DOUBLE_POOL"
  } = params;

  const validAthletes = athletes.filter(a => !isDummyAthlete(a));
  if (validAthletes.length === 0) return [];

  const shuffledAthletes = fairShuffleTournamentAthletes(validAthletes);
  const cleanArena = arena.toUpperCase().includes("GELANGGANG") ? arena.toUpperCase() : `GELANGGANG ${arena.toUpperCase()}`;
  const generatedMatches: GeneratedMatch[] = [];
  let matchCounter = 0;
    const len = shuffledAthletes.length;
    let reqCapacity = 2;
    if (len <= 2) reqCapacity = 2;
    else if (len <= 4) reqCapacity = 4;
    else if (len <= 8) reqCapacity = 8;
    else if (len <= 16) reqCapacity = 16;
    else if (len <= 32) reqCapacity = 32;
    else reqCapacity = 64;

    const totalRounds = Math.max(1, Math.round(Math.log2(reqCapacity)));
    const isSingle = schemeType === "SINGLE_NO_POOL";

    const getDynamicStageName = (cap: number, roundNum: number, idx: number) => {
      const matchesInRound = cap / Math.pow(2, roundNum);
      if (roundNum === totalRounds) return isSingle ? "FINAL" : "GRAND FINAL";
      if (roundNum === totalRounds - 1) {
        if (idx < matchesInRound / 2) return isSingle ? "SEMIFINAL 1" : "FINAL POOL A";
        return isSingle ? "SEMIFINAL 2" : "FINAL POOL B";
      }
      if (roundNum === totalRounds - 2) {
        if (idx < matchesInRound / 2) return isSingle ? `PEREMPAT FINAL L${idx + 1}` : `SEMIFINAL A${idx + 1}`;
        const rightIdx = idx - (matchesInRound / 2);
        return isSingle ? `PEREMPAT FINAL R${rightIdx + 1}` : `SEMIFINAL B${rightIdx + 1}`;
      }
      if (idx < matchesInRound / 2) return isSingle ? `PENYISIHAN L${idx + 1}` : `PEREMPAT FINAL A${idx + 1}`;
      const rightIdx = idx - (matchesInRound / 2);
      return isSingle ? `PENYISIHAN R${rightIdx + 1}` : `PEREMPAT FINAL B${rightIdx + 1}`;
    };

    const initialSlots: any[] = [];
    const numMatchesRound1 = reqCapacity / 2;

    const isDual = schemeType === "DOUBLE_POOL" && reqCapacity > 2;
    if (isDual) {
      const halfCount = Math.ceil(shuffledAthletes.length / 2);
      const poolAAthletes = shuffledAthletes.slice(0, halfCount);
      const poolBAthletes = shuffledAthletes.slice(halfCount);
      const poolMatchesRound1 = numMatchesRound1 / 2;
      const poolCapacity = reqCapacity / 2;

      const fillPoolSlots = (pAthletes: any[]) => {
        const slots: any[] = [];
        const pN = pAthletes.length;
        let numContested = pN - (poolCapacity / 2);
        if (numContested < 0) numContested = 0;

        let aIdx = 0;
        for (let m = 0; m < poolMatchesRound1; m++) {
          if (m < numContested) {
            const athRed = pAthletes[aIdx++];
            const athBlue = pAthletes[aIdx++];
            slots.push(athRed ? { type: "athlete", id: athRed.id } : null);
            slots.push(athBlue ? { type: "athlete", id: athBlue.id } : null);
          } else {
            if (aIdx < pAthletes.length) {
              const athRed = pAthletes[aIdx++];
              slots.push({ type: "athlete", id: athRed.id });
              slots.push(null);
            } else {
              slots.push(null);
              slots.push(null);
            }
          }
        }
        return slots;
      };

      initialSlots.push(...fillPoolSlots(poolAAthletes), ...fillPoolSlots(poolBAthletes));
    } else {
      let numContestedMatches = len - (reqCapacity / 2);
      if (numContestedMatches < 0) numContestedMatches = 0;

      let athleteIdx = 0;
      for (let idx = 0; idx < numMatchesRound1; idx++) {
        if (idx < numContestedMatches) {
          const athRed = shuffledAthletes[athleteIdx++];
          const athBlue = shuffledAthletes[athleteIdx++];
          initialSlots.push(athRed ? { type: "athlete", id: athRed.id } : null);
          initialSlots.push(athBlue ? { type: "athlete", id: athBlue.id } : null);
        } else {
          if (athleteIdx < shuffledAthletes.length) {
            const athRed = shuffledAthletes[athleteIdx++];
            initialSlots.push({ type: "athlete", id: athRed.id });
            initialSlots.push(null);
          } else {
            initialSlots.push(null);
            initialSlots.push(null);
          }
        }
      }
    }

    let currentSlots = [...initialSlots];

    for (let round = 1; round <= totalRounds; round++) {
      const matchesInRound = reqCapacity / Math.pow(2, round);
      const nextRoundSlots: any[] = [];

      for (let idx = 0; idx < matchesInRound; idx++) {
        const left = currentSlots[idx * 2];
        const right = currentSlots[idx * 2 + 1];

        if (left && right) {
          const fRedId = left.type === "athlete" ? left.id : `winner-${left.matchId}`;
          const fBlueId = right.type === "athlete" ? right.id : `winner-${right.matchId}`;

          let cachedRedName = "";
          let cachedRedClub = "";
          let cachedBlueName = "";
          let cachedBlueClub = "";

          if (fRedId.startsWith("winner-")) {
            const prevMatch = generatedMatches.find(x => x.id === left.matchId);
            cachedRedName = prevMatch?.matchNumber ? `PEMENANG ${prevMatch.matchNumber.toUpperCase()}` : "PEMENANG";
          } else if (fRedId) {
            const p = shuffledAthletes.find(part => part.id === fRedId);
            if (p) {
              cachedRedName = p.name;
              cachedRedClub = p.club || p.contingent || "MANDIRI";
            }
          }

          if (fBlueId.startsWith("winner-")) {
            const prevMatch = generatedMatches.find(x => x.id === right.matchId);
            cachedBlueName = prevMatch?.matchNumber ? `PEMENANG ${prevMatch.matchNumber.toUpperCase()}` : "PEMENANG";
          } else if (fBlueId) {
            const p = shuffledAthletes.find(part => part.id === fBlueId);
            if (p) {
              cachedBlueName = p.name;
              cachedBlueClub = p.club || p.contingent || "MANDIRI";
            }
          }

          const baseStage = getDynamicStageName(reqCapacity, round, idx);
          const mId = `m-${categoryClassId}-${gender}-r${round}-${idx}`;
          const partaiNum = startPartaiNumber + matchCounter++;
          const matchNumberVal = `Partai ${partaiNum < 10 ? "0" + partaiNum : partaiNum}`;

          const mObj: GeneratedMatch = {
            id: mId,
            matchNumber: matchNumberVal,
            stage: baseStage,
            categoryClassId,
            fighterRedId: fRedId,
            fighterBlueId: fBlueId,
            fighterRedName: cachedRedName,
            fighterRedClub: cachedRedClub,
            fighterBlueName: cachedBlueName,
            fighterBlueClub: cachedBlueClub,
            arena: cleanArena,
            gender,
            status: "BELUM",
            winner: null,
            roundDuration: 120,
            totalRounds: 3,
            classCategory: `${categoryName} (${division})`
          };

          generatedMatches.push(mObj);
          nextRoundSlots.push({ type: "winner", matchId: mId });
        } else if (left && !right) {
          nextRoundSlots.push(left);
        } else if (!left && right) {
          nextRoundSlots.push(right);
        } else {
          nextRoundSlots.push(null);
        }
      }
      currentSlots = nextRoundSlots;
    }

    return generatedMatches;
  }

// Helper: ambil konfigurasi metode per kategori usia dari localStorage
export function getCategoryMethodsFromStorage(): Record<string, "PRESTASI" | "PEMASALAN"> {
  const defaults: Record<string, "PRESTASI" | "PEMASALAN"> = {
    "Usia Dini": "PEMASALAN",
    "Pra Remaja": "PEMASALAN",
    "Remaja": "PRESTASI",
    "Dewasa": "PRESTASI",
    "Master": "PRESTASI"
  };
  try {
    const raw = localStorage.getItem("jrz_category_methods");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...defaults, ...parsed };
      }
    }
  } catch {}
  return defaults;
}

export function getCategoryPemasalanSchemesFromStorage(): Record<string, "SEMIFINAL" | "FINAL"> {
  const defaults: Record<string, "SEMIFINAL" | "FINAL"> = {
    "Usia Dini": "SEMIFINAL",
    "Pra Remaja": "SEMIFINAL",
    "Remaja": "SEMIFINAL",
    "Dewasa": "SEMIFINAL",
    "Master": "SEMIFINAL"
  };
  try {
    const raw = localStorage.getItem("jrz_category_pemasalan_schemes");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...defaults, ...parsed };
      }
    }
  } catch {}
  return defaults;
}

export function getCategoryPrestasiSchemesFromStorage(): Record<string, string> {
  const defaults: Record<string, string> = {
    "Usia Dini": "SINGLE_NO_POOL",
    "Pra Remaja": "SINGLE_NO_POOL",
    "Remaja": "SINGLE_NO_POOL",
    "Dewasa": "SINGLE_NO_POOL",
    "Master": "SINGLE_NO_POOL"
  };
  try {
    const raw = localStorage.getItem("jrz_category_prestasi_schemes");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...defaults, ...parsed };
      }
    }
  } catch {}
  return defaults;
}

// Engine terpadu pembangun Bagan & Jadwal dari daftar atlet yang diinput & diloting
export function buildAutoSchedulesAndCategories(
  rawParticipants: any[],
  existingSchedulesInput?: any[],
  preferredArena: string = "GELANGGANG A",
  options?: { ignoreManualOverrides?: boolean; resetCategoryClassId?: string; resetGender?: string }
): {
  participants: any[];
  categories: any[];
  matches: any[];
} {
  const normalizedParticipants = (rawParticipants || [])
    .filter(p => p && p.name && String(p.name).trim() !== "" && !isDummyAthlete(p))
    .map((p, idx) => normalizeAthleteRecord(p, idx));

  let existingSchedules: any[] = existingSchedulesInput || [];
  if (!existingSchedulesInput) {
    try {
      const raw = localStorage.getItem("jrz_cached_schedules");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) existingSchedules = parsed;
      }
    } catch {}
  }

  const categoryMethods = getCategoryMethodsFromStorage();
  const pemasalanSchemes = getCategoryPemasalanSchemesFromStorage();
  const prestasiSchemes = getCategoryPrestasiSchemesFromStorage();

  const cleanArena = preferredArena.toUpperCase().includes("GELANGGANG")
    ? preferredArena.toUpperCase()
    : `GELANGGANG ${preferredArena.toUpperCase()}`;

  // Kelompokkan atlet berdasarkan (categoryClassId, ageCategory, weightClass, gender)
  const groups = new Map<string, {
    categoryClassId: string;
    ageCategory: string;
    division: string;
    weightClass: string;
    gender: "PUTRA" | "PUTRI";
    athletes: any[];
  }>();

  normalizedParticipants.forEach((p) => {
    const key = `${p.categoryClassId}___${p.gender}`;
    if (!groups.has(key)) {
      groups.set(key, {
        categoryClassId: p.categoryClassId,
        ageCategory: p.ageCategory,
        division: p.division,
        weightClass: p.weightClass,
        gender: p.gender,
        athletes: []
      });
    }
    groups.get(key)!.athletes.push(p);
  });

  // Bangun daftar kategori aktif
  const categoriesMap = new Map<string, any>();
  normalizedParticipants.forEach((p) => {
    if (!categoriesMap.has(p.categoryClassId)) {
      categoriesMap.set(p.categoryClassId, {
        id: p.categoryClassId,
        name: `${p.weightClass} (${p.ageCategory})`,
        ageCategory: p.ageCategory,
        weightClass: p.weightClass,
        division: p.division,
        minWeight: p.weight ? Math.max(0, Math.floor(p.weight) - 2) : 40,
        maxWeight: p.weight ? Math.floor(p.weight) + 3 : 60
      });
    }
  });
  const categoriesList = Array.from(categoriesMap.values());

  const allMatches: any[] = [];
  let nextMatchNumber = 1;

  // Helper untuk memelihara skor/pemenang serta perubahan manual partai jika sudah diedit pengguna
  const applyExistingResult = (matchObj: any) => {
    const existing = existingSchedules.find(ex =>
      ex.id === matchObj.id ||
      (ex.categoryClassId === matchObj.categoryClassId &&
        ex.gender === matchObj.gender &&
        ex.stage === matchObj.stage &&
        ex.fighterBlueName === matchObj.fighterBlueName &&
        ex.fighterRedName === matchObj.fighterRedName)
    );
    if (!existing) return matchObj;

    const isResetTarget =
      options?.ignoreManualOverrides &&
      (!options.resetCategoryClassId ||
        (existing.categoryClassId === options.resetCategoryClassId &&
          (!options.resetGender || existing.gender === options.resetGender)));

    if (existing.isManualModified && !isResetTarget) {
      return {
        ...matchObj,
        matchNumber: existing.matchNumber ?? matchObj.matchNumber,
        arena: existing.arena || matchObj.arena,
        stage: existing.stage || matchObj.stage,
        categoryClassId: existing.categoryClassId || matchObj.categoryClassId,
        ageCategory: existing.ageCategory || matchObj.ageCategory,
        division: existing.division || matchObj.division,
        weightClass: existing.weightClass || matchObj.weightClass,
        classCategory: existing.classCategory || matchObj.classCategory,
        gender: existing.gender || matchObj.gender,
        fighterBlueId: existing.fighterBlueId ?? matchObj.fighterBlueId,
        fighterBlueName: existing.fighterBlueName ?? matchObj.fighterBlueName,
        fighterBlueClub: existing.fighterBlueClub ?? matchObj.fighterBlueClub,
        fighterRedId: existing.fighterRedId ?? matchObj.fighterRedId,
        fighterRedName: existing.fighterRedName ?? matchObj.fighterRedName,
        fighterRedClub: existing.fighterRedClub ?? matchObj.fighterRedClub,
        status: existing.status || matchObj.status,
        winner: existing.winner ?? matchObj.winner,
        scoreBlue: existing.scoreBlue ?? matchObj.scoreBlue,
        scoreRed: existing.scoreRed ?? matchObj.scoreRed,
        isManualModified: true
      };
    }

    if (existing.status === "SELESAI" || existing.status === "SEDANG" || existing.winner) {
      matchObj.status = existing.status;
      matchObj.winner = existing.winner;
      matchObj.scoreBlue = existing.scoreBlue ?? matchObj.scoreBlue;
      matchObj.scoreRed = existing.scoreRed ?? matchObj.scoreRed;
      if (existing.arena) matchObj.arena = existing.arena;
    }
    return matchObj;
  };

  groups.forEach((grp) => {
    // Urutkan atlet berdasarkan nomor undian (seed) hasil loting
    const sorted = [...grp.athletes].sort((a, b) => {
      const sA = a.seed && a.seed > 0 ? a.seed : 9999;
      const sB = b.seed && b.seed > 0 ? b.seed : 9999;
      return sA - sB;
    });

    if (sorted.length === 0) return;

    const method = categoryMethods[grp.ageCategory] || "PRESTASI";
    const pScheme = pemasalanSchemes[grp.ageCategory] || "SEMIFINAL";
    const prScheme = prestasiSchemes[grp.ageCategory] || "SINGLE_NO_POOL";
    const classCategory = `Tanding ${grp.ageCategory} ${grp.weightClass} ${grp.gender}`;

    if (method === "PEMASALAN") {
      if (pScheme === "SEMIFINAL") {
        // PEMASALAN: SEMIFINAL (4 Bagan per Pool)
        const poolSize = 4;
        const totalPools = Math.max(1, Math.ceil(sorted.length / poolSize));

        for (let pIdx = 0; pIdx < totalPools; pIdx++) {
          const poolLetter = String.fromCharCode(65 + pIdx);
          const poolName = `Pool ${poolLetter}`;
          const poolAthletes = sorted.slice(pIdx * poolSize, (pIdx + 1) * poolSize);

          if (poolAthletes.length === 1) {
            const p1 = poolAthletes[0];
            const mNo = nextMatchNumber++;
            allMatches.push(applyExistingResult({
              id: `m-${grp.categoryClassId}-${grp.gender}-pem-${poolLetter}-fn`,
              matchNumber: String(mNo),
              arena: cleanArena,
              stage: `Final (${poolName})`,
              competitionMethod: "PEMASALAN",
              pemasalanScheme: "SEMIFINAL",
              poolName,
              categoryClassId: grp.categoryClassId,
              ageCategory: grp.ageCategory,
              division: grp.division,
              weightClass: grp.weightClass,
              classCategory,
              gender: grp.gender,
              fighterBlueId: p1.id,
              fighterBlueName: p1.name,
              fighterBlueClub: p1.contingent,
              fighterRedId: "BYE",
              fighterRedName: "BYE",
              fighterRedClub: "-",
              scoreBlue: 0,
              scoreRed: 0,
              winner: "BIRU",
              status: "SELESAI",
              roundDuration: 120,
              totalRounds: 3
            }));
          } else if (poolAthletes.length === 2) {
            const [p1, p2] = poolAthletes;
            const mNo = nextMatchNumber++;
            allMatches.push(applyExistingResult({
              id: `m-${grp.categoryClassId}-${grp.gender}-pem-${poolLetter}-fn`,
              matchNumber: String(mNo),
              arena: cleanArena,
              stage: `Final (${poolName})`,
              competitionMethod: "PEMASALAN",
              pemasalanScheme: "SEMIFINAL",
              poolName,
              categoryClassId: grp.categoryClassId,
              ageCategory: grp.ageCategory,
              division: grp.division,
              weightClass: grp.weightClass,
              classCategory,
              gender: grp.gender,
              fighterBlueId: p1.id,
              fighterBlueName: p1.name,
              fighterBlueClub: p1.contingent,
              fighterRedId: p2.id,
              fighterRedName: p2.name,
              fighterRedClub: p2.contingent,
              scoreBlue: 0,
              scoreRed: 0,
              winner: null,
              status: "BELUM",
              roundDuration: 120,
              totalRounds: 3
            }));
          } else {
            // 3 atau 4 atlet di pool ini (Regulasi Resmi IPSI 2026 & PERSILAT)
            // Terdapat 2 partai pada saat semifinal:
            // Partai 1: Semifinal 1 (Pesilat 1 vs Pesilat 2)
            // Partai 2: Semifinal 2 (Pesilat 3 vs Pesilat 4)
            // Partai ke-3: Final (Menunggu hasil kemenangan dari 2 partai sebelumnya)
            const [p1, p2, p3, p4] = poolAthletes;
            const sf1No = nextMatchNumber++;
            const sf1Match = applyExistingResult({
              id: `m-${grp.categoryClassId}-${grp.gender}-pem-${poolLetter}-sf1`,
              matchNumber: String(sf1No),
              arena: cleanArena,
              stage: `Partai 1: Semi Final 1 (${poolName})`,
              competitionMethod: "PEMASALAN",
              pemasalanScheme: "SEMIFINAL",
              poolName,
              categoryClassId: grp.categoryClassId,
              ageCategory: grp.ageCategory,
              division: grp.division,
              weightClass: grp.weightClass,
              classCategory,
              gender: grp.gender,
              fighterBlueId: p1.id,
              fighterBlueName: p1.name,
              fighterBlueClub: p1.contingent,
              fighterRedId: p2 ? p2.id : "BYE",
              fighterRedName: p2 ? p2.name : "BYE",
              fighterRedClub: p2 ? p2.contingent : "-",
              scoreBlue: 0,
              scoreRed: 0,
              winner: p2 ? null : "BIRU",
              status: p2 ? "BELUM" : "SELESAI",
              roundDuration: 120,
              totalRounds: 3
            });
            allMatches.push(sf1Match);

            const sf2No = nextMatchNumber++;
            const sf2Match = applyExistingResult({
              id: `m-${grp.categoryClassId}-${grp.gender}-pem-${poolLetter}-sf2`,
              matchNumber: String(sf2No),
              arena: cleanArena,
              stage: `Partai 2: Semi Final 2 (${poolName})`,
              competitionMethod: "PEMASALAN",
              pemasalanScheme: "SEMIFINAL",
              poolName,
              categoryClassId: grp.categoryClassId,
              ageCategory: grp.ageCategory,
              division: grp.division,
              weightClass: grp.weightClass,
              classCategory,
              gender: grp.gender,
              fighterBlueId: p3.id,
              fighterBlueName: p3.name,
              fighterBlueClub: p3.contingent,
              fighterRedId: p4 ? p4.id : "BYE",
              fighterRedName: p4 ? p4.name : "BYE",
              fighterRedClub: p4 ? p4.contingent : "-",
              scoreBlue: 0,
              scoreRed: 0,
              winner: p4 ? null : "BIRU",
              status: p4 ? "BELUM" : "SELESAI",
              roundDuration: 120,
              totalRounds: 3
            });
            allMatches.push(sf2Match);

            const fnNo = nextMatchNumber++;
            const resolvedBlueName = sf1Match.winner === "BIRU"
              ? sf1Match.fighterBlueName
              : sf1Match.winner === "MERAH"
                ? sf1Match.fighterRedName
                : `Pemenang Partai ${sf1No} (Menunggu Hasil)`;
            const resolvedBlueClub = sf1Match.winner === "BIRU"
              ? sf1Match.fighterBlueClub
              : sf1Match.winner === "MERAH"
                ? sf1Match.fighterRedClub
                : poolName;

            const resolvedRedName = sf2Match.winner === "BIRU"
              ? sf2Match.fighterBlueName
              : sf2Match.winner === "MERAH"
                ? sf2Match.fighterRedName
                : p4
                  ? `Pemenang Partai ${sf2No} (Menunggu Hasil)`
                  : p3.name;
            const resolvedRedClub = sf2Match.winner === "BIRU"
              ? sf2Match.fighterBlueClub
              : sf2Match.winner === "MERAH"
                ? sf2Match.fighterRedClub
                : p4
                  ? poolName
                  : p3.contingent;

            allMatches.push(applyExistingResult({
              id: `m-${grp.categoryClassId}-${grp.gender}-pem-${poolLetter}-fn`,
              matchNumber: String(fnNo),
              arena: cleanArena,
              stage: `Partai 3: Final (${poolName})`,
              competitionMethod: "PEMASALAN",
              pemasalanScheme: "SEMIFINAL",
              poolName,
              categoryClassId: grp.categoryClassId,
              ageCategory: grp.ageCategory,
              division: grp.division,
              weightClass: grp.weightClass,
              classCategory,
              gender: grp.gender,
              fighterBlueId: `winner-${sf1Match.id}`,
              fighterBlueName: resolvedBlueName,
              fighterBlueClub: resolvedBlueClub,
              fighterRedId: p4 ? `winner-${sf2Match.id}` : p3.id,
              fighterRedName: resolvedRedName,
              fighterRedClub: resolvedRedClub,
              scoreBlue: 0,
              scoreRed: 0,
              winner: null,
              status: "BELUM",
              roundDuration: 120,
              totalRounds: 3
            }));
          }
        }
      } else {
        // PEMASALAN: FINAL (2 Bagan per Pool)
        const poolSize = 2;
        const totalPools = Math.max(1, Math.ceil(sorted.length / poolSize));

        for (let pIdx = 0; pIdx < totalPools; pIdx++) {
          const poolLetter = String.fromCharCode(65 + pIdx);
          const poolName = `Pool ${poolLetter}`;
          const p1 = sorted[pIdx * 2];
          const p2 = sorted[pIdx * 2 + 1];
          const mNo = nextMatchNumber++;

          allMatches.push(applyExistingResult({
            id: `m-${grp.categoryClassId}-${grp.gender}-pem-${poolLetter}-fn`,
            matchNumber: String(mNo),
            arena: cleanArena,
            stage: `Final (${poolName})`,
            competitionMethod: "PEMASALAN",
            pemasalanScheme: "FINAL",
            poolName,
            categoryClassId: grp.categoryClassId,
            ageCategory: grp.ageCategory,
            division: grp.division,
            weightClass: grp.weightClass,
            classCategory,
            gender: grp.gender,
            fighterBlueId: p1.id,
            fighterBlueName: p1.name,
            fighterBlueClub: p1.contingent,
            fighterRedId: p2 ? p2.id : "BYE",
            fighterRedName: p2 ? p2.name : "BYE",
            fighterRedClub: p2 ? p2.contingent : "-",
            scoreBlue: 0,
            scoreRed: 0,
            winner: p2 ? null : "BIRU",
            status: p2 ? "BELUM" : "SELESAI",
            roundDuration: 120,
            totalRounds: 3
          }));
        }
      }
    } else {
      // PRESTASI (Sistem Gugur Knockout - Sinkron dengan TournamentBracketView)
      const N = sorted.length;
      if (N === 1) {
        const p1 = sorted[0];
        const mNo = nextMatchNumber++;
        allMatches.push(applyExistingResult({
          id: `m-${grp.categoryClassId}-${grp.gender}-r1-0`,
          matchNumber: String(mNo),
          arena: cleanArena,
          stage: "Final",
          competitionMethod: "PRESTASI",
          categoryClassId: grp.categoryClassId,
          ageCategory: grp.ageCategory,
          division: grp.division,
          weightClass: grp.weightClass,
          classCategory,
          gender: grp.gender,
          fighterBlueId: p1.id,
          fighterBlueName: p1.name,
          fighterBlueClub: p1.contingent,
          fighterRedId: "BYE",
          fighterRedName: "BYE",
          fighterRedClub: "-",
          scoreBlue: 0,
          scoreRed: 0,
          winner: "BIRU",
          status: "SELESAI",
          roundDuration: 120,
          totalRounds: 3
        }));
        return;
      }

      const reqCapacity = N <= 2 ? 2 : N <= 4 ? 4 : N <= 8 ? 8 : N <= 16 ? 16 : N <= 32 ? 32 : 64;
      const isDualSided = (prScheme === "POOL_AB" || prScheme === "DOUBLE_POOL") && reqCapacity > 2;

      if (!isDualSided) {
        const totalRounds = Math.max(1, Math.round(Math.log2(reqCapacity)));
        const numMatchesRound1 = reqCapacity / 2;
        const numContested = Math.max(0, N - reqCapacity / 2);

        let athIdx = 0;
        const initialSlots: any[] = [];
        for (let idx = 0; idx < numMatchesRound1; idx++) {
          if (idx < numContested) {
            const athRed = sorted[athIdx++];
            const athBlue = sorted[athIdx++];
            initialSlots.push(athRed ? { type: "athlete", id: athRed.id, name: athRed.name, club: athRed.contingent } : null);
            initialSlots.push(athBlue ? { type: "athlete", id: athBlue.id, name: athBlue.name, club: athBlue.contingent } : null);
          } else {
            if (athIdx < sorted.length) {
              const athRed = sorted[athIdx++];
              initialSlots.push({ type: "athlete", id: athRed.id, name: athRed.name, club: athRed.contingent });
              initialSlots.push(null);
            } else {
              initialSlots.push(null);
              initialSlots.push(null);
            }
          }
        }

        let currentSlots = [...initialSlots];
        for (let round = 1; round <= totalRounds; round++) {
          const matchesInRound = reqCapacity / Math.pow(2, round);
          const nextRoundSlots: any[] = [];

          for (let idx = 0; idx < matchesInRound; idx++) {
            const left = currentSlots[idx * 2];
            const right = currentSlots[idx * 2 + 1];

            if (left && right) {
              const mNo = nextMatchNumber++;
              const matchId = `m-${grp.categoryClassId}-${grp.gender}-r${round}-${idx}`;
              const stageName = round === totalRounds
                ? "Final"
                : round === totalRounds - 1
                  ? `Semi Final ${idx + 1}`
                  : round === totalRounds - 2
                    ? `Perempat Final ${idx + 1}`
                    : `Penyisihan ${idx + 1}`;

              const fRedName = left.type === "athlete" ? left.name : (left.resolvedName || `PEMENANG PARTAI ${left.matchNo}`);
              const fRedClub = left.type === "athlete" ? left.club : (left.resolvedClub || "-");
              const fBlueName = right.type === "athlete" ? right.name : (right.resolvedName || `PEMENANG PARTAI ${right.matchNo}`);
              const fBlueClub = right.type === "athlete" ? right.club : (right.resolvedClub || "-");

              const mObj = applyExistingResult({
                id: matchId,
                matchNumber: String(mNo),
                arena: cleanArena,
                stage: stageName,
                competitionMethod: "PRESTASI",
                categoryClassId: grp.categoryClassId,
                ageCategory: grp.ageCategory,
                division: grp.division,
                weightClass: grp.weightClass,
                classCategory,
                gender: grp.gender,
                fighterRedId: left.type === "athlete" ? left.id : `winner-${left.matchId}`,
                fighterRedName: fRedName,
                fighterRedClub: fRedClub,
                fighterBlueId: right.type === "athlete" ? right.id : `winner-${right.matchId}`,
                fighterBlueName: fBlueName,
                fighterBlueClub: fBlueClub,
                scoreBlue: 0,
                scoreRed: 0,
                winner: null,
                status: "BELUM",
                roundDuration: 120,
                totalRounds: 3
              });

              allMatches.push(mObj);
              nextRoundSlots.push({
                type: "winner",
                matchId,
                matchNo: mNo,
                resolvedName: mObj.winner === "MERAH" ? mObj.fighterRedName : mObj.winner === "BIRU" ? mObj.fighterBlueName : null,
                resolvedClub: mObj.winner === "MERAH" ? mObj.fighterRedClub : mObj.winner === "BIRU" ? mObj.fighterBlueClub : null
              });
            } else if (left && !right) {
              nextRoundSlots.push(left);
            } else if (!left && right) {
              nextRoundSlots.push(right);
            } else {
              nextRoundSlots.push(null);
            }
          }
          currentSlots = nextRoundSlots;
        }
      } else {
        // Dual Sided (POOL A & POOL B)
        const poolCapacity = reqCapacity / 2;
        const poolRounds = Math.max(1, Math.round(Math.log2(poolCapacity)));
        const halfCount = Math.ceil(N / 2);
        const poolAAthletes = sorted.slice(0, halfCount);
        const poolBAthletes = sorted.slice(halfCount);

        const buildPoolMatches = (poolAthletes: any[], poolTag: "POOL A" | "POOL B", poolPrefix: string) => {
          const pN = poolAthletes.length;
          const numMatchesRound1 = poolCapacity / 2;
          const numContested = Math.max(0, pN - poolCapacity / 2);
          let athIdx = 0;
          const initialSlots: any[] = [];

          for (let idx = 0; idx < numMatchesRound1; idx++) {
            if (idx < numContested) {
              const athRed = poolAthletes[athIdx++];
              const athBlue = poolAthletes[athIdx++];
              initialSlots.push(athRed ? { type: "athlete", id: athRed.id, name: athRed.name, club: athRed.contingent } : null);
              initialSlots.push(athBlue ? { type: "athlete", id: athBlue.id, name: athBlue.name, club: athBlue.contingent } : null);
            } else {
              if (athIdx < poolAthletes.length) {
                const athRed = poolAthletes[athIdx++];
                initialSlots.push({ type: "athlete", id: athRed.id, name: athRed.name, club: athRed.contingent });
                initialSlots.push(null);
              } else {
                initialSlots.push(null);
                initialSlots.push(null);
              }
            }
          }

          let currentSlots = [...initialSlots];
          for (let round = 1; round <= poolRounds; round++) {
            const matchesInRound = poolCapacity / Math.pow(2, round);
            const nextRoundSlots: any[] = [];

            for (let idx = 0; idx < matchesInRound; idx++) {
              const left = currentSlots[idx * 2];
              const right = currentSlots[idx * 2 + 1];

              if (left && right) {
                const mNo = nextMatchNumber++;
                const matchId = `m-${grp.categoryClassId}-${grp.gender}-${poolPrefix}-r${round}-${idx}`;
                const stageName = round === poolRounds
                  ? `Semifinal (${poolTag})`
                  : round === poolRounds - 1
                    ? `Perempat Final (${poolTag})`
                    : `Penyisihan ${poolTag} (#${idx + 1})`;

                const fRedName = left.type === "athlete" ? left.name : (left.resolvedName || `PEMENANG PARTAI ${left.matchNo}`);
                const fRedClub = left.type === "athlete" ? left.club : (left.resolvedClub || "-");
                const fBlueName = right.type === "athlete" ? right.name : (right.resolvedName || `PEMENANG PARTAI ${right.matchNo}`);
                const fBlueClub = right.type === "athlete" ? right.club : (right.resolvedClub || "-");

                const mObj = applyExistingResult({
                  id: matchId,
                  matchNumber: String(mNo),
                  arena: cleanArena,
                  stage: stageName,
                  competitionMethod: "PRESTASI",
                  poolName: poolTag,
                  categoryClassId: grp.categoryClassId,
                  ageCategory: grp.ageCategory,
                  division: grp.division,
                  weightClass: grp.weightClass,
                  classCategory,
                  gender: grp.gender,
                  fighterRedId: left.type === "athlete" ? left.id : `winner-${left.matchId}`,
                  fighterRedName: fRedName,
                  fighterRedClub: fRedClub,
                  fighterBlueId: right.type === "athlete" ? right.id : `winner-${right.matchId}`,
                  fighterBlueName: fBlueName,
                  fighterBlueClub: fBlueClub,
                  scoreBlue: 0,
                  scoreRed: 0,
                  winner: null,
                  status: "BELUM",
                  roundDuration: 120,
                  totalRounds: 3
                });

                allMatches.push(mObj);
                nextRoundSlots.push({
                  type: "winner",
                  matchId,
                  matchNo: mNo,
                  resolvedName: mObj.winner === "MERAH" ? mObj.fighterRedName : mObj.winner === "BIRU" ? mObj.fighterBlueName : null,
                  resolvedClub: mObj.winner === "MERAH" ? mObj.fighterRedClub : mObj.winner === "BIRU" ? mObj.fighterBlueClub : null
                });
              } else if (left && !right) {
                nextRoundSlots.push(left);
              } else if (!left && right) {
                nextRoundSlots.push(right);
              } else {
                nextRoundSlots.push(null);
              }
            }
            currentSlots = nextRoundSlots;
          }
          return currentSlots[0];
        };

        const winnerSlotA = buildPoolMatches(poolAAthletes, "POOL A", "poolA");
        const winnerSlotB = buildPoolMatches(poolBAthletes, "POOL B", "poolB");

        const finalNo = nextMatchNumber++;
        const finalId = `m-${grp.categoryClassId}-${grp.gender}-grandfinal`;
        const fRedName = winnerSlotA?.type === "athlete" ? winnerSlotA.name : (winnerSlotA?.resolvedName || "JUARA POOL A");
        const fRedClub = winnerSlotA?.type === "athlete" ? winnerSlotA.club : (winnerSlotA?.resolvedClub || "-");
        const fBlueName = winnerSlotB?.type === "athlete" ? winnerSlotB.name : (winnerSlotB?.resolvedName || "JUARA POOL B");
        const fBlueClub = winnerSlotB?.type === "athlete" ? winnerSlotB.club : (winnerSlotB?.resolvedClub || "-");

        allMatches.push(applyExistingResult({
          id: finalId,
          matchNumber: String(finalNo),
          arena: cleanArena,
          stage: "Grand Final",
          competitionMethod: "PRESTASI",
          categoryClassId: grp.categoryClassId,
          ageCategory: grp.ageCategory,
          division: grp.division,
          weightClass: grp.weightClass,
          classCategory,
          gender: grp.gender,
          fighterRedId: winnerSlotA?.type === "athlete" ? winnerSlotA.id : "winner-poolA",
          fighterRedName: fRedName,
          fighterRedClub: fRedClub,
          fighterBlueId: winnerSlotB?.type === "athlete" ? winnerSlotB.id : "winner-poolB",
          fighterBlueName: fBlueName,
          fighterBlueClub: fBlueClub,
          scoreBlue: 0,
          scoreRed: 0,
          winner: null,
          status: "BELUM",
          roundDuration: 120,
          totalRounds: 3
        }));
      }
    }
  });

  // Pertahankan partai tambahan yang dibuat secara manual (isManualCreated) jika tidak sedang di-reset penuh
  if (!options?.ignoreManualOverrides) {
    existingSchedules.forEach((ex) => {
      if (ex && ex.isManualCreated && !allMatches.some((m) => m.id === ex.id)) {
        allMatches.push(ex);
      }
    });
  }

  return {
    participants: normalizedParticipants,
    categories: categoriesList,
    matches: allMatches
  };
}

// Simpan perubahan manual data partai hasil loting ke localStorage, Server, dan BroadcastChannel
export async function saveManualSchedulesOverride(
  updatedMatches: any[],
  currentParticipants?: any[],
  currentCategories?: any[]
): Promise<any[]> {
  let participantsList = currentParticipants;
  let categoriesList = currentCategories;

  if (!participantsList) {
    try {
      const rawP = localStorage.getItem("jrz_cached_participants");
      participantsList = rawP ? JSON.parse(rawP) : [];
    } catch {
      participantsList = [];
    }
  }

  if (!categoriesList) {
    try {
      const rawC = localStorage.getItem("jrz_cached_categories");
      categoriesList = rawC ? JSON.parse(rawC) : [];
    } catch {
      categoriesList = [];
    }
  }

  try {
    localStorage.setItem("jrz_cached_schedules", JSON.stringify(updatedMatches));
    localStorage.setItem("match_schedules", JSON.stringify(updatedMatches));
    localStorage.setItem("jrz_bracket_cleared", updatedMatches.length === 0 ? "true" : "false");
  } catch (e) {
    console.warn("Gagal menyimpan jadwal manual ke localStorage:", e);
  }

  try {
    await fetch("/api/tournament/import-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newCategories: categoriesList || [],
        newParticipants: participantsList || [],
        newMatches: updatedMatches
      })
    });
  } catch {}

  // Sinkronisasi ke Firebase Realtime Database (Online mode / GitHub Pages)
  try {
    const { syncTournamentToFirebase } = await import("../services/firebase");
    syncTournamentToFirebase(updatedMatches, participantsList, categoriesList).catch(() => {});
  } catch {}

  try {
    window.dispatchEvent(
      new CustomEvent("jrz_tournament_synced", {
        detail: {
          participants: participantsList || [],
          categories: categoriesList || [],
          matches: updatedMatches,
          bracketCleared: updatedMatches.length === 0
        }
      })
    );
    window.dispatchEvent(new CustomEvent("jrz_schedules_updated", { detail: updatedMatches }));
    window.dispatchEvent(new Event("storage"));
    const ch = new BroadcastChannel("jrz_match_sync_A");
    ch.postMessage({
      type: "TOURNAMENT_SYNCED",
      participantsCount: (participantsList || []).length,
      matchesCount: updatedMatches.length
    });
    ch.close();
  } catch {}

  return updatedMatches;
}

// Sinkronisasi penuh (localStorage + Backend Server + BroadcastChannel + CustomEvent)
export async function syncAndGenerateSchedulesFromParticipants(
  rawParticipants: any[],
  options?: {
    preferredArena?: string;
    activeFilter?: { ageCategory: string; weightClass: string; gender: string };
    preserveExistingSchedules?: any[];
    ignoreManualOverrides?: boolean;
    resetCategoryClassId?: string;
    resetGender?: string;
  }
): Promise<{
  participants: any[];
  categories: any[];
  matches: any[];
}> {
  const { participants, categories, matches } = buildAutoSchedulesAndCategories(
    rawParticipants,
    options?.preserveExistingSchedules,
    options?.preferredArena || "GELANGGANG A",
    {
      ignoreManualOverrides: options?.ignoreManualOverrides,
      resetCategoryClassId: options?.resetCategoryClassId,
      resetGender: options?.resetGender
    }
  );

  try {
    localStorage.setItem("jrz_cached_participants", JSON.stringify(participants));
    localStorage.setItem("jrz_cached_schedules", JSON.stringify(matches));
    localStorage.setItem("jrz_cached_categories", JSON.stringify(categories));
    localStorage.setItem("jrz_bracket_cleared", "false");
    if (options?.activeFilter) {
      localStorage.setItem("jrz_active_category_filter", JSON.stringify(options.activeFilter));
    }
  } catch (e) {
    console.warn("Gagal menyimpan ke localStorage:", e);
  }

  // Kirim ke server terlebih dahulu agar server tidak mengembalikan data lama saat komponen lain melakukan fetch
  try {
    await fetch("/api/tournament/import-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newCategories: categories,
        newParticipants: participants,
        newMatches: matches
      })
    });
  } catch {}

  // Sinkronisasi ke Firebase Realtime Database (Online mode / GitHub Pages)
  try {
    const { syncTournamentToFirebase } = await import("../services/firebase");
    syncTournamentToFirebase(matches, participants, categories).catch(() => {});
  } catch {}

  // Broadcast ke seluruh komponen dan tab
  try {
    window.dispatchEvent(new CustomEvent("jrz_tournament_synced", {
      detail: { participants, categories, matches, bracketCleared: false, activeFilter: options?.activeFilter }
    }));
    window.dispatchEvent(new CustomEvent("jrz_schedules_updated", { detail: matches }));
    window.dispatchEvent(new CustomEvent("jrz_athletes_updated", { detail: { participants } }));
    window.dispatchEvent(new Event("storage"));
    const ch = new BroadcastChannel("jrz_match_sync_A");
    ch.postMessage({ type: "TOURNAMENT_SYNCED", participantsCount: participants.length, matchesCount: matches.length });
    ch.close();
  } catch {}

  return { participants, categories, matches };
}

// Fungsi resmi untuk mengosongkan seluruh Bagan & Jadwal Pertandingan (dan opsional data atlet)
export async function clearAllSchedulesAndBrackets(options?: { clearAthletes?: boolean }): Promise<void> {
  const clearAthletes = !!options?.clearAthletes;

  let currentParticipants: any[] = [];
  let currentCategories: any[] = [];
  if (!clearAthletes) {
    try {
      const savedP = localStorage.getItem("jrz_cached_participants");
      if (savedP) currentParticipants = JSON.parse(savedP);
      const savedC = localStorage.getItem("jrz_cached_categories");
      if (savedC) currentCategories = JSON.parse(savedC);
    } catch {}
  }

  try {
    localStorage.setItem("jrz_cached_schedules", JSON.stringify([]));
    localStorage.setItem("jrz_bracket_cleared", "true");
    if (clearAthletes) {
      localStorage.setItem("jrz_cached_participants", JSON.stringify([]));
      localStorage.setItem("jrz_cached_categories", JSON.stringify([]));
    }
  } catch {}

  try {
    if (clearAthletes) {
      await fetch("/api/athletes/clear-all", { method: "POST" });
    }
    await fetch("/api/tournament/import-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newCategories: clearAthletes ? [] : currentCategories,
        newParticipants: clearAthletes ? [] : currentParticipants,
        newMatches: []
      })
    });
  } catch {}

  // Sinkronisasi pembersihan ke Firebase Realtime Database
  try {
    const { syncTournamentToFirebase } = await import("../services/firebase");
    syncTournamentToFirebase([], clearAthletes ? [] : currentParticipants, clearAthletes ? [] : currentCategories).catch(() => {});
  } catch {}

  try {
    window.dispatchEvent(new CustomEvent("jrz_tournament_synced", {
      detail: {
        participants: clearAthletes ? [] : currentParticipants,
        categories: clearAthletes ? [] : currentCategories,
        matches: [],
        bracketCleared: true
      }
    }));
    window.dispatchEvent(new CustomEvent("jrz_schedules_updated", { detail: [] }));
    if (clearAthletes) {
      window.dispatchEvent(new CustomEvent("jrz_athletes_updated", { detail: { participants: [] } }));
    }
    window.dispatchEvent(new Event("storage"));
    const ch = new BroadcastChannel("jrz_match_sync_A");
    ch.postMessage({ type: "SCHEDULES_CLEARED", clearAthletes });
    ch.close();
  } catch {}
}

// Master function: sinkronisasi otomatis seluruh peserta terdaftar dan generate bagannya
export async function autoSyncAndGenerateAllBrackets(preferredArena: string = "A"): Promise<{
  participants: any[];
  categories: any[];
  matches: GeneratedMatch[];
}> {
  let rawParticipants: any[] = [];
  try {
    const saved = localStorage.getItem("jrz_cached_participants");
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) rawParticipants = parsed;
    } else {
      rawParticipants = loadAllRegisteredParticipants();
    }
  } catch {
    rawParticipants = loadAllRegisteredParticipants();
  }

  const res = await syncAndGenerateSchedulesFromParticipants(rawParticipants, {
    preferredArena
  });

  return {
    participants: res.participants,
    categories: res.categories,
    matches: res.matches as GeneratedMatch[]
  };
}
