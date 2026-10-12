/**
 * Standar Klasifikasi & Kategori Pertandingan Pencak Silat (IPSI / PERSILAT)
 */

import { AthleteAgeCategory, SeniSubCategory } from "../types/portal";

export interface WeightClassOption {
  code: string;
  name: string;
  minWeight: number;
  maxWeight: number;
  targetDefault: number;
}

export const SILAT_AGE_DIVISIONS: { key: AthleteAgeCategory; label: string; range: string }[] = [
  { key: "USIA_DINI", label: "Usia Dini", range: "8 - 11 Tahun (SD)" },
  { key: "PRA_REMAJA", label: "Pra Remaja", range: "12 - 14 Tahun (SMP)" },
  { key: "REMAJA", label: "Remaja", range: "14 - 17 Tahun (SMA)" },
  { key: "DEWASA", label: "Dewasa", range: "17 - 35 Tahun (Mahasiswa & Umum)" },
  { key: "MASTER", label: "Master", range: "35+ Tahun (Veteran)" }
];

export const SILAT_SENI_CATEGORIES: { key: SeniSubCategory; label: string; desc: string }[] = [
  { key: "TUNGGAL_BAKU", label: "Tunggal Baku", desc: "Jurus Wajib 100 Jurus Baku IPSI / PERSILAT (3 Menit)" },
  { key: "TUNGGAL_BEBAS", label: "Tunggal Bebas (Solo Kreatif)", desc: "Koreografi bebas dengan senjata khas silat dan musik (1-3 Menit)" },
  { key: "GANDA", label: "Ganda", desc: "Peragaan tarung berpasangan teknik serang-bela bertahap (3 Menit)" },
  { key: "REGU", label: "Regu", desc: "Jurus wajib kekompakan 3 pesilat tangan kosong & bersenjata (3 Menit)" }
];

export const SILAT_REGIONS: string[] = [
  "Jawa Barat",
  "Jawa Timur",
  "DKI Jakarta",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Banten",
  "Bali",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Sumatera Selatan",
  "Lampung",
  "Aceh",
  "Jambi",
  "Bengkulu",
  "Kepulauan Riau",
  "Kalimantan Timur",
  "Kalimantan Barat",
  "Kalimantan Selatan",
  "Kalimantan Tengah",
  "Kalimantan Utara",
  "Sulawesi Selatan",
  "Sulawesi Utara",
  "Sulawesi Tengah",
  "Sulawesi Tenggara",
  "Gorontalo",
  "Sulawesi Barat",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat"
];

export const SILAT_PERGURUAN: string[] = [
  "Tapak Suci Putera Muhammadiyah",
  "Persaudaraan Setia Hati Terate (PSHT)",
  "PPS Betako Merpati Putih",
  "Keluarga Silat Nasional Indonesia Perisai Diri",
  "Pencak Silat Nahdlatul Ulama Pagar Nusa",
  "IKSPI Kera Sakti",
  "Satria Muda Indonesia (SMI)",
  "Persinas ASAD",
  "PAMUR (Pencak Angkatan Muda Rasio)",
  "Perpi Harimurti",
  "KPS Nusantara",
  "Bima Suci",
  "Cimande Pusaka",
  "Pusaka Nusantara",
  "Tadjimalela",
  "Sinar Putih",
  "Pancasona",
  "Lainnya / Perguruan Independen"
];

// Tabel Kelas Tanding Standar IPSI
export const SILAT_TANDING_CLASSES: Record<AthleteAgeCategory, WeightClassOption[]> = {
  USIA_DINI: [
    { code: "A", name: "Kelas A (26 - 28 kg)", minWeight: 26, maxWeight: 28, targetDefault: 27 },
    { code: "B", name: "Kelas B (28 - 30 kg)", minWeight: 28, maxWeight: 30, targetDefault: 29 },
    { code: "C", name: "Kelas C (30 - 32 kg)", minWeight: 30, maxWeight: 32, targetDefault: 31 },
    { code: "D", name: "Kelas D (32 - 34 kg)", minWeight: 32, maxWeight: 34, targetDefault: 33 },
    { code: "E", name: "Kelas E (34 - 36 kg)", minWeight: 34, maxWeight: 36, targetDefault: 35 },
    { code: "F", name: "Kelas F (36 - 38 kg)", minWeight: 36, maxWeight: 38, targetDefault: 37 },
    { code: "G", name: "Kelas G (38 - 40 kg)", minWeight: 38, maxWeight: 40, targetDefault: 39 },
    { code: "BEBAS", name: "Kelas Bebas (> 40 kg)", minWeight: 40, maxWeight: 60, targetDefault: 42 }
  ],
  PRA_REMAJA: [
    { code: "A", name: "Kelas A (30 - 33 kg)", minWeight: 30, maxWeight: 33, targetDefault: 31.5 },
    { code: "B", name: "Kelas B (33 - 36 kg)", minWeight: 33, maxWeight: 36, targetDefault: 34.5 },
    { code: "C", name: "Kelas C (36 - 39 kg)", minWeight: 36, maxWeight: 39, targetDefault: 37.5 },
    { code: "D", name: "Kelas D (39 - 42 kg)", minWeight: 39, maxWeight: 42, targetDefault: 40.5 },
    { code: "E", name: "Kelas E (42 - 45 kg)", minWeight: 42, maxWeight: 45, targetDefault: 43.5 },
    { code: "F", name: "Kelas F (45 - 48 kg)", minWeight: 45, maxWeight: 48, targetDefault: 46.5 },
    { code: "G", name: "Kelas G (48 - 51 kg)", minWeight: 48, maxWeight: 51, targetDefault: 49.5 },
    { code: "H", name: "Kelas H (51 - 54 kg)", minWeight: 51, maxWeight: 54, targetDefault: 52.5 },
    { code: "I", name: "Kelas I (54 - 57 kg)", minWeight: 54, maxWeight: 57, targetDefault: 55.5 },
    { code: "BEBAS", name: "Kelas Bebas (> 57 kg)", minWeight: 57, maxWeight: 75, targetDefault: 60 }
  ],
  REMAJA: [
    { code: "A", name: "Kelas A (39 - 43 kg)", minWeight: 39, maxWeight: 43, targetDefault: 41 },
    { code: "B", name: "Kelas B (43 - 47 kg)", minWeight: 43, maxWeight: 47, targetDefault: 45 },
    { code: "C", name: "Kelas C (47 - 51 kg)", minWeight: 47, maxWeight: 51, targetDefault: 49 },
    { code: "D", name: "Kelas D (51 - 55 kg)", minWeight: 51, maxWeight: 55, targetDefault: 53 },
    { code: "E", name: "Kelas E (55 - 59 kg)", minWeight: 55, maxWeight: 59, targetDefault: 57 },
    { code: "F", name: "Kelas F (59 - 63 kg)", minWeight: 59, maxWeight: 63, targetDefault: 61 },
    { code: "G", name: "Kelas G (63 - 67 kg)", minWeight: 63, maxWeight: 67, targetDefault: 65 },
    { code: "H", name: "Kelas H (67 - 71 kg)", minWeight: 67, maxWeight: 71, targetDefault: 69 },
    { code: "I", name: "Kelas I (71 - 75 kg)", minWeight: 71, maxWeight: 75, targetDefault: 73 },
    { code: "J", name: "Kelas J (75 - 79 kg)", minWeight: 75, maxWeight: 79, targetDefault: 77 },
    { code: "BEBAS", name: "Kelas Bebas (> 79 kg)", minWeight: 79, maxWeight: 100, targetDefault: 82 }
  ],
  DEWASA: [
    { code: "A", name: "Kelas A (45 - 50 kg)", minWeight: 45, maxWeight: 50, targetDefault: 48 },
    { code: "B", name: "Kelas B (50 - 55 kg)", minWeight: 50, maxWeight: 55, targetDefault: 53 },
    { code: "C", name: "Kelas C (55 - 60 kg)", minWeight: 55, maxWeight: 60, targetDefault: 58 },
    { code: "D", name: "Kelas D (60 - 65 kg)", minWeight: 60, maxWeight: 65, targetDefault: 63 },
    { code: "E", name: "Kelas E (65 - 70 kg)", minWeight: 65, maxWeight: 70, targetDefault: 68 },
    { code: "F", name: "Kelas F (70 - 75 kg)", minWeight: 70, maxWeight: 75, targetDefault: 73 },
    { code: "G", name: "Kelas G (75 - 80 kg)", minWeight: 75, maxWeight: 80, targetDefault: 78 },
    { code: "H", name: "Kelas H (80 - 85 kg)", minWeight: 80, maxWeight: 85, targetDefault: 83 },
    { code: "I", name: "Kelas I (85 - 90 kg)", minWeight: 85, maxWeight: 90, targetDefault: 88 },
    { code: "J", name: "Kelas J (90 - 95 kg)", minWeight: 90, maxWeight: 95, targetDefault: 93 },
    { code: "OPEN", name: "Kelas Bebas / Open (> 95 kg)", minWeight: 95, maxWeight: 125, targetDefault: 100 }
  ],
  MASTER: [
    { code: "BEBAS", name: "Kelas Bebas Master (Semua Berat)", minWeight: 50, maxWeight: 120, targetDefault: 75 }
  ]
};

// Preset foto siluet atlet silat resmi jika belum upload pasfoto fisik
export const SILAT_AVATAR_PRESETS = {
  PUTRA: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&auto=format&fit=crop&q=80",
  PUTRI: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=200&auto=format&fit=crop&q=80"
};
