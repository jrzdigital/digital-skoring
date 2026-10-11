import { jsPDF } from "jspdf";

export interface ParameterPertandinganConfig {
  logoLeft: string;
  logoRight: string;
  eventName: string;
  tempatPelaksanaan: string;
  waktuPelaksanaan: string;
  namaKetuaPertandingan: string;
  namaSekretarisPertandingan: string;
  namaDaerahCetak: string;
  tanggalCetakDokumen: string;
}

// In-memory cache of aspect-ratio-preserved PNG data URLs for jsPDF
const rasterizedLogoCache = new Map<string, string>();

/**
 * Rasterize any image source (data URL, SVG, JPEG, PNG, WebP, or relative/remote URL)
 * into a clean square PNG data URL with aspect ratio preserved (object-contain).
 */
export function preloadLogoForPdf(src?: string | null): Promise<string | null> {
  if (!src || !src.trim()) return Promise.resolve(null);
  const trimmed = src.trim();
  if (rasterizedLogoCache.has(trimmed)) {
    return Promise.resolve(rasterizedLogoCache.get(trimmed)!);
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const boxSize = 400;
          const canvas = document.createElement("canvas");
          canvas.width = boxSize;
          canvas.height = boxSize;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(trimmed.startsWith("data:image/") ? trimmed : null);
            return;
          }
          ctx.clearRect(0, 0, boxSize, boxSize);
          const natW = img.naturalWidth || img.width || boxSize;
          const natH = img.naturalHeight || img.height || boxSize;
          const scale = Math.min(boxSize / natW, boxSize / natH);
          const drawW = Math.round(natW * scale);
          const drawH = Math.round(natH * scale);
          const offsetX = Math.round((boxSize - drawW) / 2);
          const offsetY = Math.round((boxSize - drawH) / 2);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          const pngDataUrl = canvas.toDataURL("image/png");
          rasterizedLogoCache.set(trimmed, pngDataUrl);
          resolve(pngDataUrl);
        } catch {
          resolve(trimmed.startsWith("data:image/") ? trimmed : null);
        }
      };
      img.onerror = () => {
        resolve(trimmed.startsWith("data:image/") ? trimmed : null);
      };
      img.src = trimmed;
    } catch {
      resolve(trimmed.startsWith("data:image/") ? trimmed : null);
    }
  });
}

/**
 * Reads all 5 Kop Surat & Pengesahan parameter groups from Menu Parameter Pertandingan.
 */
export function getParameterPertandinganConfig(
  overrides?: Partial<ParameterPertandinganConfig>
): ParameterPertandinganConfig {
  const readStorage = (keys: string[], fallback: string = ""): string => {
    try {
      for (const k of keys) {
        const val = localStorage.getItem(k);
        if (val !== null && val !== undefined && val !== "") {
          return val;
        }
      }
      // Check if explicitly set to empty string in primary key
      const primaryVal = localStorage.getItem(keys[0]);
      if (primaryVal === "") return "";
    } catch {}
    return fallback;
  };

  const logoLeft =
    overrides?.logoLeft !== undefined
      ? overrides.logoLeft
      : readStorage(["sekretaris_logoLeftLocal", "jrz_logo_left", "logo_kiri"], "");

  const logoRight =
    overrides?.logoRight !== undefined
      ? overrides.logoRight
      : readStorage(["sekretaris_logoRightLocal", "jrz_logo_right", "logo_kanan"], "");

  const eventName =
    overrides?.eventName !== undefined && overrides.eventName !== ""
      ? overrides.eventName
      : readStorage(
          ["sekretaris_eventName", "jrz_event_name"],
          "KEJUARAAN PENCAK SILAT"
        );

  const tempatPelaksanaan =
    overrides?.tempatPelaksanaan !== undefined && overrides.tempatPelaksanaan !== ""
      ? overrides.tempatPelaksanaan
      : readStorage(
          ["sekretaris_tempatPelaksanaan", "jrz_tempat_pelaksanaan"],
          "TEMPAT PELAKSANAAN"
        );

  const waktuPelaksanaan =
    overrides?.waktuPelaksanaan !== undefined && overrides.waktuPelaksanaan !== ""
      ? overrides.waktuPelaksanaan
      : readStorage(
          ["sekretaris_waktuPelaksanaan", "jrz_waktu_pelaksanaan"],
          "WAKTU PELAKSANAAN"
        );

  const namaKetuaPertandingan =
    overrides?.namaKetuaPertandingan !== undefined
      ? overrides.namaKetuaPertandingan
      : readStorage(
          ["sekretaris_namaKetuaPertandingan", "jrz_nama_ketua_pertandingan"],
          ""
        );

  const namaSekretarisPertandingan =
    overrides?.namaSekretarisPertandingan !== undefined
      ? overrides.namaSekretarisPertandingan
      : readStorage(
          ["sekretaris_namaSekretarisPertandingan", "jrz_nama_sekretaris_pertandingan"],
          ""
        );

  const namaDaerahCetak =
    overrides?.namaDaerahCetak !== undefined && overrides.namaDaerahCetak !== ""
      ? overrides.namaDaerahCetak
      : readStorage(
          ["sekretaris_namaDaerahCetak", "jrz_nama_daerah_cetak"],
          "IDI RAYEUK"
        );

  const tanggalCetakDokumen =
    overrides?.tanggalCetakDokumen !== undefined && overrides.tanggalCetakDokumen !== ""
      ? overrides.tanggalCetakDokumen
      : readStorage(
          ["sekretaris_tanggalCetakDokumen", "jrz_tanggal_cetak_dokumen", "jrz_tanggal_hari"],
          "01 JULI 2026"
        );

  if (logoLeft) preloadLogoForPdf(logoLeft);
  if (logoRight) preloadLogoForPdf(logoRight);

  return {
    logoLeft,
    logoRight,
    eventName,
    tempatPelaksanaan,
    waktuPelaksanaan,
    namaKetuaPertandingan,
    namaSekretarisPertandingan,
    namaDaerahCetak,
    tanggalCetakDokumen,
  };
}

/**
 * Draw a logo (Left or Right monitor logo from Parameter Pertandingan) onto a jsPDF document.
 */
export function drawPdfLogo(
  doc: jsPDF | any,
  logoStr: string | undefined | null,
  x: number,
  y: number,
  size: number
): void {
  try {
    const raw = (logoStr || "").trim();
    const resolved = (raw && rasterizedLogoCache.get(raw)) || raw;

    if (resolved && resolved.startsWith("data:image")) {
      let format = "PNG";
      if (resolved.startsWith("data:image/jpeg") || resolved.startsWith("data:image/jpg")) {
        format = "JPEG";
      } else if (resolved.startsWith("data:image/webp")) {
        format = "WEBP";
      }
      try {
        doc.addImage(resolved, format, x, y, size, size);
        return;
      } catch {
        try {
          doc.addImage(resolved, format === "PNG" ? "JPEG" : "PNG", x, y, size, size);
          return;
        } catch {}
      }
    }

    // Fallback official emblem if no custom logo is uploaded or if URL is default placeholder
    doc.setDrawColor(74, 24, 122);
    doc.setLineWidth(0.5);
    doc.ellipse(x + size / 2, y + size / 2, size / 2, size / 2, "D");
    doc.setFillColor(74, 24, 122);
    doc.ellipse(x + size / 2, y + size / 2, size / 2 - 1, size / 2 - 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("IPSI", x + size / 2, y + size / 2 + 2.5, { align: "center" });
  } catch (err) {
    console.warn("Could not draw logo in PDF:", err);
  }
}

/**
 * Draw Tanda Tangan Ketua Pertandingan (left) & Sekretaris Pertandingan (right)
 * along with Kota/Tempat Dibuat & Tanggal Dibuat from Menu Parameter Pertandingan.
 */
export function drawPdfOfficialSignatures(
  doc: jsPDF | any,
  sigY: number,
  options?: {
    isLandscape?: boolean;
    leftCenterX?: number;
    rightCenterX?: number;
    config?: Partial<ParameterPertandinganConfig>;
  }
): void {
  const cfg = getParameterPertandinganConfig(options?.config);
  const isLandscape = Boolean(options?.isLandscape);
  const leftX = options?.leftCenterX ?? (isLandscape ? 50 : 50);
  const rightX = options?.rightCenterX ?? (isLandscape ? 245 : 160);
  const halfLineW = isLandscape ? 30 : 25;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);

  // Left block: Ketua Pertandingan
  doc.text("Mengetahui,", leftX, sigY, { align: "center" });
  doc.setFont("Helvetica", "bold");
  doc.text("Ketua Pertandingan,", leftX, sigY + 4.5, { align: "center" });
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(leftX - halfLineW, sigY + 21, leftX + halfLineW, sigY + 21);
  if (cfg.namaKetuaPertandingan && cfg.namaKetuaPertandingan.trim()) {
    doc.text(cfg.namaKetuaPertandingan.trim().toUpperCase(), leftX, sigY + 25, { align: "center" });
  } else {
    doc.setFont("Helvetica", "normal");
    doc.text("(......................................................)", leftX, sigY + 25, { align: "center" });
  }

  // Right block: Kota/Tempat Dibuat, Tanggal Dibuat & Sekretaris Pertandingan
  doc.setFont("Helvetica", "normal");
  const placeStr = (cfg.namaDaerahCetak || "IDI RAYEUK").trim().toUpperCase();
  const dateStr = (cfg.tanggalCetakDokumen || "01 JULI 2026").trim().toUpperCase();
  doc.text(`${placeStr}, ${dateStr}`, rightX, sigY, { align: "center" });
  doc.setFont("Helvetica", "bold");
  doc.text("Sekretaris Pertandingan,", rightX, sigY + 4.5, { align: "center" });
  doc.line(rightX - halfLineW, sigY + 21, rightX + halfLineW, sigY + 21);
  if (cfg.namaSekretarisPertandingan && cfg.namaSekretarisPertandingan.trim()) {
    doc.text(cfg.namaSekretarisPertandingan.trim().toUpperCase(), rightX, sigY + 25, { align: "center" });
  } else {
    doc.setFont("Helvetica", "normal");
    doc.text("(......................................................)", rightX, sigY + 25, { align: "center" });
  }
}
