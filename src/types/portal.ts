/**
 * Portal & Multi-Module Tournament Types
 * Eventsilat & JRZ Championship System
 */

export type PortalTab = 
  | "BERANDA" 
  | "ADMINISTRASI" 
  | "TANDING" 
  | "SENI" 
  | "MONITOR_TANDING" 
  | "MONITOR_SENI" 
  | "KONTAK"
  | "ADMIN_PANEL";

export type AdminSubTab = "ATLET" | "TIMBANG" | "BAGAN" | "JADWAL" | "MEDALI";

// -------------------------------------------------------------
// BERANDA, ARTIKEL & EVENT PENCAK SILAT
// -------------------------------------------------------------
export type ArticleCategory = "REGULASI" | "TEKNIK" | "EVENT" | "TIPS_ATLET" | "SEJARAH" | "UMUM";

export interface SilatArticle {
  id: string;
  title: string;
  category: ArticleCategory;
  author: string;
  authorRole?: string;
  publishedAt: string;
  summary: string;
  content: string;
  imageUrl?: string;
  readTimeMinutes: number;
  tags: string[];
  likes: number;
}

export interface SilatEventInfo {
  id: string;
  name: string;
  level: "DAERAH" | "WILAYAH" | "NASIONAL" | "INTERNASIONAL";
  location: string;
  dates: string;
  organizer: string;
  registrationDeadline: string;
  status: "BUKA_PENDAFTARAN" | "SEGERA_BERAKHIR" | "SEDANG_BERLANGSUNG" | "SELESAI";
  contactPerson: string;
  phone: string;
  description: string;
  arenaCount: number;
}


// -------------------------------------------------------------
// ADMINISTRASI ATLET & KONTINGEN
// -------------------------------------------------------------
export type AthleteAgeCategory = "USIA_DINI" | "PRA_REMAJA" | "REMAJA" | "DEWASA" | "MASTER";
export type SeniSubCategory = "TUNGGAL_BAKU" | "TUNGGAL_BEBAS" | "GANDA" | "REGU";
export type MedalClassificationType = "KONTINGEN" | "WILAYAH" | "PERGURUAN";

export interface AthleteRecord {
  id: string;
  name: string;
  contingent: string;
  region?: string; // Asal Wilayah / Provinsi / Daerah
  schoolOrClub?: string; // Perguruan Silat (e.g. Tapak Suci, PSHT, Merpati Putih, dll)
  ageCategory?: AthleteAgeCategory;
  gender: "PUTRA" | "PUTRI";
  category: "TANDING" | "SENI";
  seniSubCategory?: SeniSubCategory;
  classCategory: string; // e.g., "Tanding Kelas C Putra (55-60kg)" or "Seni Tunggal Baku Putra (Dewasa)"
  weightTarget: number; // target weight in kg
  actualWeight?: number; // weighed weight
  weighInStatus: "BELUM_TIMBANG" | "SAH" | "OVERWEIGHT" | "UNDERWEIGHT" | "DISKUALIFIKASI";
  verifiedDocuments: boolean; // Akta/KTP, Surat Dokter, Rekomendasi
  arena?: string; // Gelanggang A / B
  seed?: number;
  phone?: string;
  photoUrl?: string; // Pasfoto atlet
  birthDate?: string;
  nik?: string;
}

export interface ContingentMedal {
  contingent: string;
  region?: string;
  schoolOrClub?: string;
  gold: number;
  silver: number;
  bronze: number;
  totalPoints: number;
  totalAthletes: number;
}

// -------------------------------------------------------------
// SKORING SENI (TGR & SOLO KREATIF) - PERSILAT / IPSI
// -------------------------------------------------------------
export type SeniCategory = "TUNGGAL" | "GANDA" | "REGU" | "SOLO_KREATIF";
export type SeniAgeDivision = "USIA_DINI" | "PRA_REMAJA" | "REMAJA" | "DEWASA" | "MASTER";

export interface SeniJuryScore {
  juryId: number; // 1 to 5
  kebenaranScore: number; // Max 100 or 9.90
  kemantapanScore: number; // Max 100 or 9.90
  totalScore: number;
  confirmed: boolean;
}

export interface SeniPenalties {
  boundaryViolationCount: number; // Keluar garis gelanggang (-0.05 / -0.5)
  costumeViolation: boolean; // Pakaian/atribut terlepas/tidak sesuai (-0.05)
  weaponDropViolation: boolean; // Senjata terjatuh (-0.5)
  timeDeviationSeconds: number; // Deviasi dari 3 menit (180 detik)
  manualDeduction: number; // Penalti manual dari dewan juri
  totalPenaltyDeduction: number;
}

export interface SeniPerformanceState {
  id: string;
  matchNumber: string; // e.g., "Partai Seni 01"
  pool: string; // "Pool A", "Pool B", "Final"
  arena: string; // "Gelanggang A"
  category: SeniCategory;
  ageDivision: SeniAgeDivision;
  gender: "PUTRA" | "PUTRI";
  athleteName: string;
  contingent: string;
  photoUrl?: string;
  
  // Performance Timer (Standard: 3 minutes = 180s)
  targetDurationSeconds: number; // 180s
  elapsedSeconds: number;
  timerStatus: "IDLE" | "RUNNING" | "PAUSED" | "FINISHED";

  // Juries (1..5)
  juryScores: { [juryId: number]: SeniJuryScore };
  penalties: SeniPenalties;

  // Final Results
  medianScore: number; // Nilai tengah setelah membuang nilai tertinggi & terendah
  finalScore: number; // medianScore - totalPenaltyDeduction
  status: "BELUM_TAMPIL" | "SEDANG_TAMPIL" | "SELESAI";
  rank?: number;
}

// -------------------------------------------------------------
// KONTAK PERSON & HELPDESK
// -------------------------------------------------------------
export interface ContactPersonItem {
  id: string;
  roleTitle: string; // e.g., "Technical Delegate (TD)"
  name: string;
  phone: string; // e.g., "+62 812-3456-7890"
  whatsappLink: string;
  description: string;
  badge: string;
  avatarIcon?: string;
}
