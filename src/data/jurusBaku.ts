export interface JurusBakuCategoryInfo {
  id: string;
  name: string;
  totalMovements: number;
  sections: {
    title: string;
    description: string;
    moveCount: number;
  }[];
  standardDurationSec: number;
  description: string;
}

export const JURUS_BAKU_TUNGGAL: JurusBakuCategoryInfo = {
  id: 'tunggal',
  name: 'Jurus Tunggal Baku IPSI / PERSILAT',
  totalMovements: 100,
  standardDurationSec: 180, // 3:00 minutes
  description: '100 Gerakan Wajib Baku IPSI tanpa iringan musik terdiri dari Tangan Kosong, Golok, dan Toya.',
  sections: [
    { title: 'Jurus 1 - 7: Tangan Kosong', description: 'Kuda-kuda, pukulan, tangkisan, tendangan, sikuan, dan elakan', moveCount: 50 },
    { title: 'Jurus 8 - 10: Senjata Golok / Parang', description: 'Tebasan, tusukan, tangkisan, dan perputaran golok', moveCount: 25 },
    { title: 'Jurus 11 - 14: Senjata Toya / Tongkat', description: 'Putaran, sodokan, tebasan toya dua tangan & satu tangan', moveCount: 25 },
  ],
};

export const JURUS_GANDA_INFO = {
  id: 'ganda',
  name: 'Kategori Ganda IPSI / PERSILAT',
  standardDurationSec: 180,
  description: 'Peragaan koreografi teknik serang-bela realistik antara 2 pesilat tangan kosong dan bersenjata.',
};

export const JURUS_REGU_INFO = {
  id: 'regu',
  name: 'Kategori Regu (Trio) IPSI / PERSILAT',
  totalMovements: 100,
  standardDurationSec: 180,
  description: '100 Gerak Baku diperagakan secara sinkron dan harmonis serempak oleh 3 pesilat regu.',
};

export const JURUS_SOLO_KREATIF_INFO = {
  id: 'solo_kreatif',
  name: 'Solo Kreatif PERSILAT / IPSI 2026',
  standardDurationSec: 180,
  description: 'Koreografi pencak silat bebas berdurasi 1-3 menit dengan iringan musik dan senjata tradisional.',
};

export const DEFAULT_TANDING_MATCH = {
  arena: 'Gelanggang 1',
  matchNumber: 'Partai 18',
  gender: 'Putra' as const,
  ageGroup: 'Dewasa' as const,
  weightClass: 'Kelas C (55 - 60 kg)',
  roundDurationSeconds: 120, // 2 minutes
  totalRounds: 3,
  judgeCount: 3 as const,
  redCorner: {
    id: 'c_red_01',
    name: 'M. Rizky Pratama',
    contingent: 'Jawa Barat (PSHT)',
    weightClass: 'Kelas C (58.4 kg)',
  },
  blueCorner: {
    id: 'c_blue_01',
    name: 'Iqbal Candra Kusuma',
    contingent: 'DKI Jakarta (Tapak Suci)',
    weightClass: 'Kelas C (59.1 kg)',
  },
};

export const SAMPLE_MATCH_PRESETS = [
  {
    arena: 'Gelanggang 1',
    matchNumber: 'Partai 18 - Final',
    weightClass: 'Kelas C (55-60 kg) Putra Dewasa',
    red: { name: 'M. Rizky Pratama', contingent: 'Jawa Barat' },
    blue: { name: 'Iqbal Candra Kusuma', contingent: 'DKI Jakarta' },
  },
  {
    arena: 'Gelanggang 2',
    matchNumber: 'Partai 24 - Semifinal',
    weightClass: 'Kelas E (65-70 kg) Putra Dewasa',
    red: { name: 'Fikri Haikal', contingent: 'Jawa Timur' },
    blue: { name: 'Bambang Sudiro', contingent: 'Jawa Tengah' },
  },
  {
    arena: 'Gelanggang 3',
    matchNumber: 'Partai 12 - Babak Penyisihan',
    weightClass: 'Kelas B (50-55 kg) Putri Remaja',
    red: { name: 'Nurul Fadhilah', contingent: 'Sumatera Barat' },
    blue: { name: 'Siti Rahmawati', contingent: 'Bali' },
  },
];
