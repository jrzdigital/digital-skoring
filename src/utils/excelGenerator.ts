import * as XLSX from 'xlsx';
import { TrainingLog, Student, SchoolProfile } from '../types';
import { formatIndoDate } from './pdfGenerator';

export function exportTrainingDataToExcel(
  logs: TrainingLog[],
  students: Student[],
  profile: SchoolProfile,
  fileNamePrefix: string = 'Laporan_Pencak_Silat'
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Laporan Latihan
  const logsData = logs.map((log, idx) => {
    const totalStudents = students.length;
    const hadir = log.attendance ? log.attendance.filter(a => a.status === 'hadir').length : 0;
    const izin = log.attendance ? log.attendance.filter(a => a.status === 'izin').length : 0;
    const sakit = log.attendance ? log.attendance.filter(a => a.status === 'sakit').length : 0;
    const alpa = log.attendance ? log.attendance.filter(a => a.status === 'alpa').length : 0;

    return {
      'No': log.number || idx + 1,
      'Hari': log.day,
      'Tanggal': log.date,
      'Format Indonesia': formatIndoDate(log.date),
      'Waktu Mulai': log.startTime,
      'Waktu Selesai': log.endTime,
      'Jenis Latihan': log.trainingType,
      'Kategori': log.category,
      'Fungsi / Manfaat Latihan': log.functionDescription,
      'Lokasi': log.location,
      'Catatan Evaluasi Pelatih': log.coachNotes,
      'Jumlah Hadir': hadir,
      'Jumlah Izin': izin,
      'Jumlah Sakit': sakit,
      'Jumlah Alpa': alpa,
      'Total Siswa': totalStudents,
      'Persentase Hadir (%)': totalStudents > 0 ? Math.round((hadir / totalStudents) * 100) : 0,
    };
  });

  const wsLogs = XLSX.utils.json_to_sheet(logsData);
  XLSX.utils.book_append_sheet(wb, wsLogs, 'Jurnal Latihan');

  // 2. Sheet 2: Rekapitulasi Absensi Siswa
  const studentRecap = students.map((std, idx) => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;
    const totalSessions = logs.length;

    logs.forEach(log => {
      const rec = log.attendance?.find(a => a.studentId === std.id);
      if (rec) {
        if (rec.status === 'hadir') hadir++;
        else if (rec.status === 'izin') izin++;
        else if (rec.status === 'sakit') sakit++;
        else if (rec.status === 'alpa') alpa++;
      }
    });

    const percent = totalSessions > 0 ? Math.round((hadir / totalSessions) * 100) : 0;

    return {
      'No': idx + 1,
      'NIS': std.nis,
      'Nama Siswa': std.name,
      'Kelas': std.classGrade,
      'Jenis Kelamin': std.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      'Tingkatan Sabuk': std.beltLevel,
      'Total Pertemuan': totalSessions,
      'Hadir': hadir,
      'Izin': izin,
      'Sakit': sakit,
      'Alpa': alpa,
      'Persentase Kehadiran': `${percent}%`,
      'Status Anggota': std.status,
    };
  });

  const wsAttendance = XLSX.utils.json_to_sheet(studentRecap);
  XLSX.utils.book_append_sheet(wb, wsAttendance, 'Rekap Absensi Siswa');

  // 3. Sheet 3: Penilaian Performa Siswa
  const performanceData = students.map((std, idx) => {
    const r = std.skillRatings;
    const avg = Math.round((r.fisik + r.teknik + r.seni + r.tanding + r.disiplin) / 5);

    let predikat = 'Sangat Baik (A)';
    if (avg < 75) predikat = 'Cukup (C)';
    else if (avg < 85) predikat = 'Baik (B)';

    return {
      'No': idx + 1,
      'NIS': std.nis,
      'Nama Siswa': std.name,
      'Kelas': std.classGrade,
      'Tingkatan Sabuk': std.beltLevel,
      'Fisik (1-100)': r.fisik,
      'Teknik Gerak (1-100)': r.teknik,
      'Seni / Jurus (1-100)': r.seni,
      'Tanding / Sambung (1-100)': r.tanding,
      'Disiplin Pendekar (1-100)': r.disiplin,
      'Rata-rata Skor': avg,
      'Predikat Evaluasi': predikat,
    };
  });

  const wsPerf = XLSX.utils.json_to_sheet(performanceData);
  XLSX.utils.book_append_sheet(wb, wsPerf, 'Evaluasi Performa Siswa');

  // 4. Sheet 4: Data Instansi & Pelatih
  const metaData = [
    { 'Informasi': 'Nama Sekolah', 'Keterangan': profile.schoolName },
    { 'Informasi': 'Nama Ekstrakurikuler', 'Keterangan': profile.extracurricularName },
    { 'Informasi': 'Induk Organisasi', 'Keterangan': profile.organizationBranch },
    { 'Informasi': 'Tahun Ajaran / Semester', 'Keterangan': `${profile.academicYear} - Semester ${profile.semester}` },
    { 'Informasi': 'Kepala Sekolah', 'Keterangan': `${profile.principalName} (NIP: ${profile.principalNip})` },
    { 'Informasi': 'Pelatih Utama', 'Keterangan': `${profile.coachName} (${profile.coachNip})` },
    { 'Informasi': 'Waktu Ekspor', 'Keterangan': new Date().toLocaleString('id-ID') },
  ];
  const wsMeta = XLSX.utils.json_to_sheet(metaData);
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Profil & Legalitas');

  // Download
  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${fileNamePrefix}_${timestamp}.xlsx`);
}

/**
 * Downloads a pre-formatted Excel template for importing students
 */
export function downloadStudentTemplateExcel() {
  const wb = XLSX.utils.book_new();

  // Template Data with realistic examples
  const templateRows = [
    {
      'NIS': '2026109',
      'Nama Lengkap': 'Dimas Satria Nugraha',
      'Kelas': 'X RPL 2',
      'Jenis Kelamin (L/P)': 'L',
      'Tingkatan Sabuk': 'Putih / Dasar',
      'No HP Siswa': '081234567809',
      'No HP Orang Tua': '081398765409',
      'Status': 'Aktif',
      'Nilai Fisik': 80,
      'Nilai Teknik': 80,
      'Nilai Seni': 80,
      'Nilai Tanding': 80,
      'Nilai Disiplin': 85,
    },
    {
      'NIS': '2026110',
      'Nama Lengkap': 'Anisa Putri Maharani',
      'Kelas': 'X AKL 2',
      'Jenis Kelamin (L/P)': 'P',
      'Tingkatan Sabuk': 'Putih / Dasar',
      'No HP Siswa': '081234567810',
      'No HP Orang Tua': '081398765410',
      'Status': 'Aktif',
      'Nilai Fisik': 85,
      'Nilai Teknik': 88,
      'Nilai Seni': 92,
      'Nilai Tanding': 80,
      'Nilai Disiplin': 90,
    },
    {
      'NIS': '2026111',
      'Nama Lengkap': 'Galang Pratama Yudha',
      'Kelas': 'XI TKJ 1',
      'Jenis Kelamin (L/P)': 'L',
      'Tingkatan Sabuk': 'Hijau',
      'No HP Siswa': '081234567811',
      'No HP Orang Tua': '081398765411',
      'Status': 'Aktif',
      'Nilai Fisik': 90,
      'Nilai Teknik': 92,
      'Nilai Seni': 88,
      'Nilai Tanding': 94,
      'Nilai Disiplin': 92,
    }
  ];

  const ws = XLSX.utils.json_to_sheet(templateRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Format Data Siswa');

  // Petunjuk Pengisian Sheet
  const instructions = [
    { 'Kolom': 'NIS', 'Keterangan': 'Nomor Induk Siswa (Wajib, unik, contoh: 2026101)' },
    { 'Kolom': 'Nama Lengkap', 'Keterangan': 'Nama lengkap anggota pesilat (Wajib)' },
    { 'Kolom': 'Kelas', 'Keterangan': 'Tingkat dan jurusan sekolah (contoh: X RPL 1, XI TKJ 2)' },
    { 'Kolom': 'Jenis Kelamin (L/P)', 'Keterangan': 'Isi L untuk Laki-laki atau P untuk Perempuan' },
    { 'Kolom': 'Tingkatan Sabuk', 'Keterangan': 'Pilihan: Putih / Dasar, Hijau, Biru, Merah / Pelatih' },
    { 'Kolom': 'No HP Siswa', 'Keterangan': 'Nomor WhatsApp / kontak aktif siswa' },
    { 'Kolom': 'No HP Orang Tua', 'Keterangan': 'Nomor kontak darurat wali / orang tua' },
    { 'Kolom': 'Status', 'Keterangan': 'Pilihan: Aktif / Nonaktif / Alumni (Default: Aktif)' },
    { 'Kolom': 'Nilai (Fisik s/d Disiplin)', 'Keterangan': 'Skor awal kemampuan 1 - 100 (Opsional, default 80-85)' },
  ];

  const wsGuide = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk Pengisian');

  XLSX.writeFile(wb, 'Format_Import_Data_Siswa_Pencak_Silat.xlsx');
}

/**
 * Parses uploaded Excel/CSV file into Student objects
 */
export async function parseStudentsFromExcel(file: File): Promise<{
  students: Student[];
  errors: string[];
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          resolve({ students: [], errors: ['File Excel tidak memiliki data baris siswa.'] });
          return;
        }

        const parsedStudents: Student[] = [];
        const errors: string[] = [];

        rows.forEach((row, idx) => {
          // Normalize key lookups (case-insensitive & loose matching)
          const getVal = (...keys: string[]): string => {
            for (const k of Object.keys(row)) {
              const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
              for (const searchKey of keys) {
                const cleanSearch = searchKey.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (lowerKey === cleanSearch || lowerKey.includes(cleanSearch)) {
                  return String(row[k]).trim();
                }
              }
            }
            return '';
          };

          const nis = getVal('nis', 'nomorinduk', 'id') || (2026100 + idx + 1).toString();
          const name = getVal('namalengkap', 'nama', 'namasiswa', 'pesilat');
          const classGrade = getVal('kelas', 'jurusan', 'tingkat') || 'X';
          const genderRaw = getVal('jeniskelamin', 'jk', 'gender', 'sex').toUpperCase();
          const gender: 'L' | 'P' = genderRaw.startsWith('P') || genderRaw.startsWith('W') ? 'P' : 'L';
          
          let beltLevel = getVal('tingkatansabuk', 'sabuk', 'level', 'belt') as Student['beltLevel'];
          const validBelts: Student['beltLevel'][] = [
            'Putih / Dasar',
            'Hijau',
            'Biru',
            'Merah / Pelatih',
          ];
          const matchedBelt = validBelts.find(b => b.toLowerCase().includes((beltLevel || '').toLowerCase()));
          beltLevel = matchedBelt || 'Putih / Dasar';

          const phone = getVal('nohpsiswa', 'nohp', 'telepon', 'hp', 'kontak') || '-';
          const parentPhone = getVal('nohporangtua', 'hportu', 'ortu', 'wali') || '-';
          
          const statusRaw = getVal('status', 'keaktifan').toLowerCase();
          let status: Student['status'] = 'Aktif';
          if (statusRaw.includes('non') || statusRaw.includes('pasif')) status = 'Non-Aktif';
          else if (statusRaw.includes('alumni') || statusRaw.includes('lulus')) status = 'Alumni';

          // Skill scores
          const parseScore = (val: string, fallback: number) => {
            const num = parseInt(val, 10);
            return isNaN(num) || num < 0 || num > 100 ? fallback : num;
          };

          const fisik = parseScore(getVal('nilaifisik', 'fisik', 'stamina'), 80);
          const teknik = parseScore(getVal('nilaiteknik', 'teknik'), 80);
          const seni = parseScore(getVal('nilaiseni', 'seni', 'jurus'), 80);
          const tanding = parseScore(getVal('nilaitanding', 'tanding', 'sparring'), 80);
          const disiplin = parseScore(getVal('nilaidisiplin', 'disiplin', 'mental'), 85);

          if (!name) {
            errors.push(`Baris ke-${idx + 2}: Nama siswa tidak boleh kosong.`);
            return;
          }

          parsedStudents.push({
            id: `std-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            nis,
            name,
            classGrade,
            gender,
            beltLevel,
            phone,
            parentPhone,
            status,
            skillRatings: {
              fisik,
              teknik,
              seni,
              tanding,
              disiplin,
            },
          });
        });

        resolve({ students: parsedStudents, errors });
      } catch (err) {
        resolve({
          students: [],
          errors: [`Gagal memproses file Excel: ${(err as Error).message || 'Format tidak dikenali'}`]
        });
      }
    };

    reader.onerror = () => {
      resolve({ students: [], errors: ['Gagal membaca file dari perangkat.'] });
    };

    reader.readAsArrayBuffer(file);
  });
}
