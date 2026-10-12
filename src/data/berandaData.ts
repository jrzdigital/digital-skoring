import { SilatArticle, SilatEventInfo } from "../types/portal";

export const DEFAULT_ARTICLES: SilatArticle[] = [
  {
    id: "art-1",
    title: "Bedah Regulasi Baru PPSN 2025 PB IPSI: Poin Jatuhan, Kuncian, Hukuman Bertingkat & Konsensus Digital",
    category: "REGULASI",
    author: "Wasit Juri Nasional IPSI",
    authorRole: "Technical Delegate & Wasit Juri Internasional PB IPSI",
    publishedAt: "2026-08-28",
    summary: "Memahami standarisasi terbaru Peraturan Pertandingan Pencak Silat Nasional (PPSN) 2025: teknik jatuhan murni (+3), batasan kuncian 5 detik, serta mekanisme konsensus juri digital.",
    content: `Peraturan Pertandingan Pencak Silat Nasional (PPSN) 2025 yang dirumuskan oleh PB IPSI dan PERSILAT membawa standarisasi modern yang menjamin sportivitas, keselamatan atlet, dan akselerasi laga:

1. **Sistem Poin Sah Serangan:**
- Serangan Tangan (Pukulan): **+1 Poin** sah masuk sasaran badan tanpa terhalang tangkisan.
- Serangan Kaki (Tendangan): **+2 Poin** sah masuk sasaran badan.
- Teknik Jatuhan / Bantingan Sah: **+3 Poin** murni dengan tangkapan, sapuan, guntingan, atau kaitan di mana pesilat pembanting tidak menyentuhkan lutut ke matras duluan atau mengontrol jatuhan. Jatuhan akibat pukulan/tendangan tidak dihitung poin jatuhan.

2. **Kuncian & Tarikan Berbatas Waktu (5 Detik):**
Waktu kuncian maksimal diperbolehkan selama 5 detik efektif sebelum wasit memberikan aba-aba "TI / BERHENTI". Tarikan berbahaya langsung sambil menjatuhkan tanpa serangan pendahulu dilarang ketat.

3. **Mekanisme Penalti Bertingkat:**
- **Binaan I & II:** Peringatan lisan tanpa pemotongan poin.
- **Teguran I:** Pengurangan 1 poin (-1) pada babak bersangkutan.
- **Teguran II:** Pengurangan 2 poin (-2) pada babak bersangkutan.
- **Peringatan I:** Pengurangan 5 poin (-5) akumulasi seluruh babak.
- **Peringatan II:** Pengurangan 10 poin (-10) akumulasi seluruh babak.
- **Peringatan III / Pelanggaran Berat:** Diskualifikasi (DISQ).

4. **Konsensus Mayoritas Juri Digital (Majority Voting):**
Nilai pukulan (+1) atau tendangan (+2) hanya masuk ke papan skor bila minimal 2 dari 3 juri menekan tombol dalam jendela toleransi waktu 1.2 detik. Eliminasi bias subjektif secara real-time.`,
    imageUrl: "https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80",
    readTimeMinutes: 5,
    tags: ["IPSI", "PPSN 2025", "PERSILAT", "Regulasi", "Bantingan", "Wasit Juri"],
    likes: 42
  },
  {
    id: "art-2",
    title: "Strategi Manajemen Stamina dan Pemulihan Atlet Tanding dalam Turnamen Multi-Babak",
    category: "TIPS_ATLET",
    author: "Dr. Hendra Wibowo, Sp.KO",
    authorRole: "Konsultan Fisik Pelatnas Silat",
    publishedAt: "2026-09-01",
    summary: "Panduan nutrisi cepat serap, protokol pendinginan cryo-towel, dan pemulihan detak jantung di jeda babak 1 menit.",
    content: `Dalam kejuaraan silat dengan jadwal padat (2-3 partai per hari), kemampuan memulihkan kondisi fisik antar babak dan antar partai adalah faktor penentu kemenangan:

- **Jeda Babak (60 Detik):** Fokus utama adalah menurunkan laju pernapasan (deep diaphragmatic breathing), hidrasi cairan elektrolit isotonik dingin bersuhu 12-15°C dalam tegukan kecil (50-100ml), dan kompres es pada leher bagian belakang untuk thermo-regulation.
- **Nutrisi Pasca Tanding:** Dalam 30 menit setelah partai selesai (anabolic window), konsumsi karbohidrat indeks glikemik tinggi berpadu protein whey (rasio 3:1) untuk mempercepat resintesis glikogen otot sebelum babak perempat atau semifinal berikutnya.
- **Timbang Badan Ulang:** Pastikan atlet tidak melakukan dehidrasi ekstrem yang berisiko kram otot dan penurunan refleks visual.`,
    imageUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
    readTimeMinutes: 4,
    tags: ["Nutrisi", "Stamina", "Recovery", "Tanding", "Kebugaran"],
    likes: 29
  },
  {
    id: "art-3",
    title: "Menguasai Unsur Kemantapan & Penghayatan dalam Kategori Seni Tunggal & Solo Kreatif",
    category: "TEKNIK",
    author: "Pendekar Kusuma Atmaja",
    authorRole: "Pelatih Puslatda Seni Jawa Barat",
    publishedAt: "2026-08-15",
    summary: "Tips mengeksekusi akselerasi gerak, keselarasan senjata golok & toya, serta irama napas yang memukau panel juri seni.",
    content: `Kategori Seni Tunggal Baku maupun Solo Kreatif bukan sekadar menghafal urutan jurus. Panel juri memberikan perhatian khusus pada:

1. **Ketepatan Titik Henti (Kuda-kuda Kokoh):**
Setiap peralihan jurus harus memiliki ketegasan batas (sharp transition). Jangan biarkan kaki bergeser atau goyang saat pendaratan lompatan.
2. **Karakter & Jiwa Gerak (Penghayatan):**
Sorotan pandangan mata (fokus tatapan), tarikan napas bertenaga, dan ketukan irama senjata toya atau bilah golok yang presisi menimbulkan aura ksatria yang memperkuat poin kemantapan.
3. **Penyelesaian Tepat Waktu (3:00 Menit):**
Keterlambatan atau kekurangan waktu sekecil 5 detik akan langsung terkena penalti pengurangan nilai otomatis dari Dewan Juri.`,
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80",
    readTimeMinutes: 6,
    tags: ["Seni Silat", "Tunggal Baku", "Solo Kreatif", "Golok", "Toya"],
    likes: 35
  },
  {
    id: "art-4",
    title: "Sejarah Perkembangan Pencak Silat Menuju Cabang Olahraga Olimpiade",
    category: "SEJARAH",
    author: "Sekretariat Pengurus Besar IPSI",
    authorRole: "Divisi Riset & Pengembangan Organisasi",
    publishedAt: "2026-07-20",
    summary: "Perjalanan warisan budaya nusantara yang kini diakui UNESCO dan dipertandingkan di lebih dari 70 negara anggota federasi dunia.",
    content: `Pencak Silat telah melangkah jauh dari bela diri tradisional nusantara menjadi cabang olahraga modern bereputasi dunia. Pengakuan UNESCO sebagai Warisan Budaya Takbenda Dunia pada 2019 menjadi tonggak penting.

Dengan standarisasi regulasi digital scoring, seragam bertaraf internasional, serta perlindungan atlet bersertifikasi, federasi dunia (PERSILAT) terus aktif mengkampanyekan eksibisi silat di multievent global demi terwujudnya mimpi berlaga di panggung pesta olahraga Olimpiade dunia.`,
    imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
    readTimeMinutes: 5,
    tags: ["UNESCO", "Sejarah Silat", "Olimpiade", "Budaya", "PERSILAT"],
    likes: 58
  }
];

export const DEFAULT_EVENTS: SilatEventInfo[] = [
  {
    id: "evt-1",
    name: "Kejuaraan Nasional Pencak Silat Piala Kemenpora 2026",
    level: "NASIONAL",
    location: "GOR Ciracas, Jakarta Timur",
    dates: "14 - 18 Oktober 2026",
    organizer: "PB IPSI & Kemenpora RI",
    registrationDeadline: "25 September 2026",
    status: "BUKA_PENDAFTARAN",
    contactPerson: "Bpk. Rian Hidayat, M.Pd",
    phone: "+62 812-3456-7890",
    description: "Kejuaraan resmi berskala nasional memperebutkan Piala Bergilir Menpora dengan kategori Usia Dini, Pra Remaja, Remaja, dan Dewasa. Menggunakan sistem digital scoring 3 arena serentak.",
    arenaCount: 3
  },
  {
    id: "evt-2",
    name: "Piala Bergilir IPSI Championship Antar Perguruan & Pelajar se-Jawa",
    level: "WILAYAH",
    location: "GOR Tri Lomba Juang, Kota Semarang",
    dates: "28 - 30 September 2026",
    organizer: "Pengprov IPSI Jawa Tengah",
    registrationDeadline: "15 September 2026",
    status: "SEGERA_BERAKHIR",
    contactPerson: "Ibu Tri Wahyuni, S.Or",
    phone: "+62 856-7890-1234",
    description: "Ajang seleksi pembibitan atlet PON dan POPNAS kategori Tanding dan Seni (TGR). Kuota terbatas 800 pesilat dengan sertifikat berpoin piagam resmi dinas pendidikan.",
    arenaCount: 2
  },
  {
    id: "evt-3",
    name: "Kejuaraan Terbuka Silat Antar Paguyuban Budaya Jawa Barat",
    level: "DAERAH",
    location: "Padepokan Silat Pajajaran, Kota Bandung",
    dates: "08 - 10 November 2026",
    organizer: "Dispora Prov. Jawa Barat & Pengda IPSI",
    registrationDeadline: "20 Oktober 2026",
    status: "BUKA_PENDAFTARAN",
    contactPerson: "Kang Dani Firmansyah",
    phone: "+62 878-9012-3456",
    description: "Mempertandingkan nomor tanding kelas bebas tradisi, seni rampak festival, dan solo kreatif bertema pelestarian jurus pusaka perguruan.",
    arenaCount: 2
  },
  {
    id: "evt-4",
    name: "Southeast Asian Open Pencak Silat Championship 2026",
    level: "INTERNASIONAL",
    location: "Singapore Indoor Stadium & OCBC Arena, Singapura",
    dates: "05 - 09 Desember 2026",
    organizer: "PERSISI & PERSILAT Regional Federation",
    registrationDeadline: "10 November 2026",
    status: "BUKA_PENDAFTARAN",
    contactPerson: "Ust. Sheikh Al-Attas",
    phone: "+65 9123 4567",
    description: "Open championship internasional yang diikuti oleh 14 federasi nasional anggota PERSILAT di kawasan Asia Tenggara dan Pasifik.",
    arenaCount: 4
  }
];

export const APP_SYSTEM_SPECS = {
  version: "v4.8.2-Enterprise",
  scoringStandard: "Peraturan Pertandingan Pencak Silat Nasional (PPSN) 2025 / PB IPSI & PERSILAT",
  syncEngine: "Firebase Realtime Database + SSE Micro-Daemon",
  clientLatency: "< 15 ms (Ultra-Low Latency WebSocket)",
  supportedRoles: [
    "Juri 1, 2, 3 (Multi-Device Touchpad)",
    "Dewan Pertandingan (Pengesahan Bantingan & Penalti)",
    "Sekretaris Pertandingan (Timer & Notulen)",
    "Layar Monitor TV Penonton (Scoreboard LED)",
    "Panel Skoring Seni 5 Juri (TGR & Solo Kreatif)",
    "Administrasi Berkas & Timbang Badan Sah"
  ],
  securityFeatures: [
    "Majority Voting Rule (2 dari 3 juri terverifikasi waktu)",
    "Enkripsi Token Sesi Gelanggang",
    "Offline Resilience Cache (tetap berjalan tanpa internet)",
    "Ekspor Lembar Nilai Resmi PDF & Excel (.xlsx)"
  ]
};
