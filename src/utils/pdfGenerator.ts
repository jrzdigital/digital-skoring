import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TrainingLog, SchoolProfile, Student } from '../types';

export interface PdfExportOptions {
  monthFilter?: string; // "2026-08" or "all"
  includePhotos?: boolean;
  includeAttendanceRecap?: boolean;
  includeSignatures?: boolean;
}

/**
 * Robust helper to load any image URL (data URI, base64, blob, or remote https)
 * and convert it to a standardized, clean, compressed JPEG Base64 data URL for jsPDF.
 */
async function loadAndPrepareImage(url: string, maxWidth = 600, maxHeight = 450): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;

  return new Promise((resolve) => {
    // If it's already a clean JPEG data URI and small, test if we can use it or optimize it
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    // Timeout safety in case remote image is blocked or offline
    const timer = setTimeout(() => {
      if (url.startsWith('data:image/')) {
        resolve(url);
      } else {
        resolve(null);
      }
    }, 4000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width || 400;
        let height = img.naturalHeight || img.height || 300;

        // Downscale proportionally to avoid huge PDF file size while keeping high print sharpness
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(url.startsWith('data:image/') ? url : null);
          return;
        }

        // Fill white background (useful for transparent PNG signatures / logos)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const jpegData = canvas.toDataURL('image/jpeg', 0.88);
        resolve(jpegData);
      } catch (err) {
        console.warn('Canvas conversion fallback for image:', err);
        resolve(url.startsWith('data:image/') ? url : null);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      if (url.startsWith('data:image/')) {
        resolve(url);
      } else {
        resolve(null);
      }
    };

    img.src = url;
  });
}

export async function generateTrainingReportPdf(
  logs: TrainingLog[],
  profile: SchoolProfile,
  students: Student[],
  options: PdfExportOptions = {}
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Filter logs if needed
  let filteredLogs = [...logs];
  if (options.monthFilter && options.monthFilter !== 'all') {
    filteredLogs = filteredLogs.filter(l => l.date.startsWith(options.monthFilter!));
  }
  // Sort logs by date ascending
  filteredLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Preload and convert all log photos in parallel
  const preloadedPhotos: Record<string, string | null> = {};
  if (options.includePhotos !== false) {
    await Promise.all(
      filteredLogs.map(async (log) => {
        if (log.photos && log.photos.length > 0 && log.photos[0].url) {
          const processed = await loadAndPrepareImage(log.photos[0].url);
          preloadedPhotos[log.id] = processed;
        }
      })
    );
  }

  // Preload and convert signatures and logo
  let principalSigPrepared: string | null = null;
  let coachSigPrepared: string | null = null;
  let schoolLogoPrepared: string | null = null;

  if (options.includeSignatures !== false) {
    if (profile.principalSignature) {
      principalSigPrepared = await loadAndPrepareImage(profile.principalSignature);
    }
    if (profile.coachSignature) {
      coachSigPrepared = await loadAndPrepareImage(profile.coachSignature);
    }
  }

  // Preload school logo if available
  const logoSource = profile.schoolLogo || '/LogoIPSI.png';
  schoolLogoPrepared = await loadAndPrepareImage(logoSource, 200, 200);

  // 1. KOP SURAT RESMI
  let startKopY = 12;

  // Render logo on top left if available
  if (schoolLogoPrepared) {
    try {
      doc.addImage(schoolLogoPrepared, 'JPEG', 14, 11, 20, 20);
    } catch (e) {
      console.warn('Could not render school logo in KOP:', e);
    }
  }

  // Government / Yayasan Agency Line (if provided)
  if (profile.governmentAgency) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const agencyLines = profile.governmentAgency.split('\n');
    agencyLines.forEach((line) => {
      doc.text(line.trim().toUpperCase(), pageWidth / 2, startKopY, { align: 'center' });
      startKopY += 4;
    });
  }

  // School Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(20, 20, 20);
  doc.text((profile.schoolName || 'NAMA SEKOLAH').toUpperCase(), pageWidth / 2, startKopY + 1, { align: 'center' });

  // Extracurricular & Organization Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(136, 19, 55); // Crimson shade #881337
  doc.text((profile.extracurricularName || 'EKSTRAKURIKULER PENCAK SILAT').toUpperCase(), pageWidth / 2, startKopY + 6, { align: 'center' });

  // School Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(profile.schoolAddress || 'Alamat Sekolah', pageWidth / 2, startKopY + 10.5, { align: 'center' });

  // School Phone, Email & Website
  const contactParts: string[] = [];
  if (profile.schoolPhone) contactParts.push(`Telp/WA: ${profile.schoolPhone}`);
  if (profile.schoolEmail) contactParts.push(`Email: ${profile.schoolEmail}`);
  if (profile.schoolWebsite) contactParts.push(`Website: ${profile.schoolWebsite}`);
  const contactLine = contactParts.length > 0 ? contactParts.join(' | ') : `Telp: - | Email: -`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(contactLine, pageWidth / 2, startKopY + 14.5, { align: 'center' });

  const lineY = Math.max(34, startKopY + 18);

  // Garis Kop Ganda (Tebal & Tipis)
  doc.setDrawColor(136, 19, 55);
  doc.setLineWidth(0.8);
  doc.line(14, lineY, pageWidth - 14, lineY);
  doc.setLineWidth(0.3);
  doc.line(14, lineY + 1.2, pageWidth - 14, lineY + 1.2);

  // 2. JUDUL LAPORAN
  const titleY = lineY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(20, 20, 20);
  doc.text('LAPORAN PELAKSANAAN KEGIATAN & EVALUASI LATIHAN', pageWidth / 2, titleY, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  const periodText = options.monthFilter && options.monthFilter !== 'all'
    ? `Periode: ${options.monthFilter} | Tahun Ajaran ${profile.academicYear || '-'} (${profile.semester || '-'})`
    : `Tahun Ajaran ${profile.academicYear || '-'} - Semester ${profile.semester || '-'}`;
  doc.text(periodText, pageWidth / 2, titleY + 4.5, { align: 'center' });

  // 3. TABEL KEGIATAN LATIHAN
  // Kolom: No, Hari / Tanggal, Jenis Latihan, Fungsi / Manfaat, Dokumentasi Foto, Kehadiran
  const tableRows = filteredLogs.map((log, index) => {
    const totalStudents = students.length;
    const hadirCount = log.attendance ? log.attendance.filter(a => a.status === 'hadir').length : 0;
    const attendanceSummary = `${hadirCount}/${totalStudents} Hadir`;

    const hasPhoto = options.includePhotos !== false && log.photos && log.photos.length > 0;
    const docCell = hasPhoto
      ? {
          content: '',
          styles: { minCellHeight: 25, halign: 'center' as const, valign: 'middle' as const },
        }
      : {
          content: 'Tidak ada foto',
          styles: { minCellHeight: 10, halign: 'center' as const, valign: 'middle' as const, textColor: [140, 140, 140] as [number, number, number], fontStyle: 'italic' as const },
        };

    return [
      { content: log.number || (index + 1).toString().padStart(2, '0'), styles: { halign: 'center' as const } },
      { content: `${log.day},\n${formatIndoDate(log.date)}\n(${log.startTime} - ${log.endTime})` },
      { content: `${log.trainingType}\n[Kategori: ${log.category}]` },
      { content: log.functionDescription },
      docCell,
      { content: attendanceSummary, styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
    ];
  });

  autoTable(doc, {
    startY: titleY + 9,
    head: [['No', 'Hari / Tanggal', 'Jenis Latihan', 'Fungsi / Manfaat Latihan', 'Dokumentasi Foto', 'Kehadiran']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      valign: 'middle',
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [185, 28, 28], // Professional Red (Red-700 / Crimson)
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28, halign: 'left' },
      2: { cellWidth: 46, halign: 'left' },
      3: { cellWidth: 52, halign: 'left' },
      4: { cellWidth: 30, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    didDrawCell: (data) => {
      // Draw image inside the Dokumentasi Foto column (index 4)
      if (data.section === 'body' && data.column.index === 4) {
        const log = filteredLogs[data.row.index];
        if (options.includePhotos !== false && log && log.photos && log.photos.length > 0) {
          const cell = data.cell;
          const imgWidth = 26;
          const imgHeight = 19;
          const imgX = cell.x + (cell.width - imgWidth) / 2;
          const imgY = cell.y + (cell.height - imgHeight) / 2;

          const preparedImg = preloadedPhotos[log.id];

          if (preparedImg) {
            try {
              doc.addImage(preparedImg, 'JPEG', imgX, imgY, imgWidth, imgHeight, undefined, 'FAST');
              // Draw clean thin border around the photo
              doc.setDrawColor(190, 190, 195);
              doc.setLineWidth(0.2);
              doc.rect(imgX, imgY, imgWidth, imgHeight, 'D');
            } catch (e) {
              console.warn('Could not draw preloaded image in PDF cell', e);
              // Draw placeholder frame
              doc.setFillColor(245, 245, 247);
              doc.roundedRect(imgX, imgY, imgWidth, imgHeight, 0.8, 0.8, 'F');
              doc.setDrawColor(210, 210, 215);
              doc.roundedRect(imgX, imgY, imgWidth, imgHeight, 0.8, 0.8, 'D');
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(6.5);
              doc.setTextColor(110, 110, 110);
              doc.text('[Foto Kegiatan]', imgX + imgWidth / 2, imgY + imgHeight / 2 + 1, { align: 'center' });
            }
          } else {
            // Draw placeholder frame with clean style
            doc.setFillColor(245, 245, 247);
            doc.roundedRect(imgX, imgY, imgWidth, imgHeight, 0.8, 0.8, 'F');
            doc.setDrawColor(210, 210, 215);
            doc.roundedRect(imgX, imgY, imgWidth, imgHeight, 0.8, 0.8, 'D');
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6.5);
            doc.setTextColor(110, 110, 110);
            doc.text('[Foto Kegiatan]', imgX + imgWidth / 2, imgY + imgHeight / 2 + 1, { align: 'center' });
          }
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Halaman ${data.pageNumber}`;
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text(str, pageWidth - 25, pageHeight - 10);
      doc.text(`Arsip Resmi: ${profile.extracurricularName} - Dicetak secara otomatis`, 14, pageHeight - 10);
    }
  });

  let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // 4. TANDA TANGAN MENGETAHUI KEPALA SEKOLAH & PELATIH
  if (options.includeSignatures !== false) {
    if (currentY > pageHeight - 55) {
      doc.addPage();
      currentY = 25;
    } else {
      currentY += 6;
    }

    const todayIndo = formatIndoDate(new Date().toISOString().split('T')[0]);
    const signLeftX = 25;
    const signRightX = pageWidth - 75;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);

    // Header Kiri
    doc.text('Mengetahui,', signLeftX, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.principalTitle, signLeftX, currentY + 4.5);

    // Header Kanan
    doc.setFont('helvetica', 'normal');
    doc.text(`${profile.city || 'Jakarta'}, ${todayIndo}`, signRightX, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(profile.coachTitle, signRightX, currentY + 4.5);

    // Area Tanda Tangan / Gambar Signature
    const sigY = currentY + 7;
    const sigBoxHeight = 22;

    // Principal Signature Image if exists
    if (principalSigPrepared) {
      try {
        doc.addImage(principalSigPrepared, 'JPEG', signLeftX, sigY, 40, sigBoxHeight - 2);
      } catch (e) {
        console.warn('Could not render principal signature in PDF', e);
      }
    }

    // Coach Signature Image if exists
    if (coachSigPrepared) {
      try {
        doc.addImage(coachSigPrepared, 'JPEG', signRightX, sigY, 40, sigBoxHeight - 2);
      } catch (e) {
        console.warn('Could not render coach signature in PDF', e);
      }
    }

    // Nama & NIP
    const nameY = currentY + 30;

    // Kiri
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(profile.principalName, signLeftX, nameY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NIP: ${profile.principalNip || '-'}`, signLeftX, nameY + 4.5);

    // Kanan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(profile.coachName, signRightX, nameY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Lisensi/NIP: ${profile.coachNip || '-'}`, signRightX, nameY + 4.5);
  }

  return doc;
}

export function formatIndoDate(dateStr: string): string {
  if (!dateStr) return '';
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  return `${day} ${months[monthIdx] || ''} ${year}`;
}
