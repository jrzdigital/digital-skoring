/**
 * Service to manage OTP (One-Time Password) generation, storage, and verification.
 * Supports synchronization with Firebase Realtime Database and localStorage cache.
 */

import { db, ref, get, set, update } from "./firebase";
import { UserAccount } from "../types";

export interface OtpRecord {
  id: string;
  identifier: string; // username or email
  code: string; // 6-digit OTP (full code fallback)
  codeLimited: string; // 1. Kode OTP tanpa pembayaran (Bagan, Jadwal, Monitor)
  codeFull: string;    // 2. Kode OTP dengan pembayaran (Full akses kecuali Superadmin)
  type: "SIGNUP" | "GMAIL_LOGIN";
  payload?: {
    username?: string;
    password?: string;
    fullName?: string;
    email?: string;
    user?: UserAccount;
  };
  createdAt: number;
  expiresAt: number;
  status: "PENDING" | "VERIFIED" | "EXPIRED";
  verifiedTier?: "LIMITED" | "FULL";
  requestedBy?: string;
}

const LOCAL_STORAGE_OTP_KEY = "jrz_active_otps";
const SUPERADMIN_WA_STORAGE_KEY = "jrz_superadmin_wa_number";
export const DEFAULT_SUPERADMIN_WA = "6281379876424"; // Jaka Oktorian (Super Admin)
export const MASTER_OTP_CODES = ["992811", "123456"];

export function getSuperAdminWaNumber(): string {
  if (typeof window === "undefined") return DEFAULT_SUPERADMIN_WA;
  try {
    const saved = localStorage.getItem(SUPERADMIN_WA_STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.replace(/[^0-9]/g, "").replace(/^0/, "62");
    }
  } catch (e) {}
  return DEFAULT_SUPERADMIN_WA;
}

export function setSuperAdminWaNumber(phone: string) {
  if (typeof window === "undefined") return;
  try {
    const clean = phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    localStorage.setItem(SUPERADMIN_WA_STORAGE_KEY, clean);
  } catch (e) {}
}

/**
 * Format standard WhatsApp notification message displaying:
 * 1. Daftar akun pemohon (Username/Email & Nama Lengkap)
 * 2. Jenis aksi (Sign Up / Pendaftaran Akun Baru atau Login Gmail)
 * 3. Kode 6-digit OTP pemohon disembunyikan dengan ******
 * 4. Waktu pengajuan
 * 5. Tampilan 2 Pilihan Kode OTP untuk Superadmin:
 *    - 1. Kode OTP untuk pengguna tanpa pembayaran (Akses: Bagan, Jadwal, Monitor)
 *    - 2. Kode OTP untuk pengguna dengan pembayaran (Akses: Full halaman kecuali Superadmin)
 */
export function formatOtpWhatsAppMessage(record: OtpRecord): string {
  const dateObj = new Date(record.createdAt);
  const timeFormatted = dateObj.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const dateFormatted = dateObj.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const actionText =
    record.type === "GMAIL_LOGIN"
      ? "Login Otomatis Gmail / Google"
      : "Sign Up (Pendaftaran Akun Baru)";

  const applicantName = record.payload?.fullName || record.identifier;
  const applicantId = record.identifier;
  const codeLimited = record.codeLimited || record.code || "100000";
  const codeFull = record.codeFull || record.code || "200000";

  return `*NOTIFIKASI PERMOHONAN KODE OTP*
*APLIKASI DIGITAL SCORING PENCAK SILAT (JRZ SCORE)*
━━━━━━━━━━━━━━━━━━━━━━━
👤 *Akun Pemohon:*
   • Nama: *${applicantName}*
   • Username / Email: *${applicantId}*

📌 *Jenis Aksi:*
   • *${actionText}*

🔑 *Kode 6-Digit OTP Pemohon:*
   • ****** _(Disembunyikan demi keamanan dari pendaftar)_

⏰ *Waktu Pengajuan:*
   • ${dateFormatted}, pukul ${timeFormatted} WIB
━━━━━━━━━━━━━━━━━━━━━━━
👑 *PILIHAN 2 KODE OTP SUPERADMIN:*
_(Superadmin silakan kirimkan 1 kode di bawah kepada pemohon sesuai status pembayarannya)_

1️⃣ *KODE OTP PENGGUNA TANPA PEMBAYARAN:*
   • Kode OTP: *${codeLimited}*
   • Hak Akses: Terbatas (Hanya dapat mengakses Bagan Pertandingan, Jadwal Pertandingan, dan Layar Monitor)

2️⃣ *KODE OTP PENGGUNA DENGAN PEMBAYARAN:*
   • Kode OTP: *${codeFull}*
   • Hak Akses: Akses Full (Semua halaman & fitur yang terkunci dapat diakses, kecuali Halaman Super Admin)
━━━━━━━━━━━━━━━━━━━━━━━
_Pesan ini dibuat otomatis oleh sistem saat pengguna melakukan pendaftaran akun._`;
}

/**
 * Generate full WhatsApp web / mobile intent URL directly to Superadmin
 */
export function getWhatsAppUrlForSuperadmin(record: OtpRecord): string {
  const phone = getSuperAdminWaNumber();
  const text = encodeURIComponent(formatOtpWhatsAppMessage(record));
  return `https://wa.me/${phone}?text=${text}`;
}

/**
 * Automatically open WhatsApp to Superadmin
 */
export function sendWhatsAppNotificationToSuperadmin(record: OtpRecord): boolean {
  if (typeof window === "undefined") return false;
  const url = getWhatsAppUrlForSuperadmin(record);
  try {
    // Attempt window.open
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win || win.closed || typeof win.closed === "undefined") {
      // In case popup blocker intercepts, trigger via click
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return true;
  } catch (err) {
    console.warn("Could not auto-open WhatsApp:", err);
    return false;
  }
}

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

function getLocalOtps(): Record<string, OtpRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_OTP_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

function saveLocalOtps(otps: Record<string, OtpRecord>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_OTP_KEY, JSON.stringify(otps));
  } catch (e) {}
}

export const otpService = {
  /**
   * Generate and store a new 6-digit OTP for a user
   */
  async createOtp(
    identifier: string,
    type: "SIGNUP" | "GMAIL_LOGIN",
    payload?: OtpRecord["payload"]
  ): Promise<OtpRecord> {
    const cleanId = identifier.trim().toLowerCase();
    const sanitizedKey = sanitizeKey(cleanId);
    
    // Generate two distinct 6-digit random codes:
    // 1. codeLimited: for users without payment (Bagan, Jadwal, Monitor only)
    // 2. codeFull: for users with payment (Full access except Superadmin)
    const codeLimited = Math.floor(100000 + Math.random() * 900000).toString();
    let codeFull = Math.floor(100000 + Math.random() * 900000).toString();
    while (codeFull === codeLimited) {
      codeFull = Math.floor(100000 + Math.random() * 900000).toString();
    }
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // valid for 24 hours

    const record: OtpRecord = {
      id: `otp_${now}_${sanitizedKey}`,
      identifier: cleanId,
      code: codeFull,
      codeLimited,
      codeFull,
      type,
      payload,
      createdAt: now,
      expiresAt,
      status: "PENDING",
      requestedBy: payload?.fullName || cleanId
    };

    // 1. Save locally
    const local = getLocalOtps();
    local[sanitizedKey] = record;
    saveLocalOtps(local);

    // 2. Save to Firebase RTDB
    try {
      const otpRef = ref(db, `otps/${sanitizedKey}`);
      await set(otpRef, record);
    } catch (err) {
      console.warn("Could not save OTP to Firebase RTDB, using local fallback:", err);
    }

    return record;
  },

  /**
   * Verify an entered OTP against active records or master code
   */
  async verifyOtp(
    identifier: string,
    enteredCode: string
  ): Promise<{ valid: boolean; tier?: "LIMITED" | "FULL"; record?: OtpRecord; error?: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const sanitizedKey = sanitizeKey(cleanId);
    const cleanCode = enteredCode.trim();

    if (!cleanCode) {
      return { valid: false, error: "Harap masukkan 6 digit kode OTP!" };
    }

    // Check Master Superadmin OTP Codes -> Gives Full Access
    if (MASTER_OTP_CODES.includes(cleanCode)) {
      const local = getLocalOtps();
      const record = local[sanitizedKey] || {
        id: `otp_master_${Date.now()}`,
        identifier: cleanId,
        code: cleanCode,
        codeLimited: cleanCode,
        codeFull: cleanCode,
        type: "SIGNUP",
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        status: "VERIFIED",
        verifiedTier: "FULL"
      };
      return { valid: true, tier: "FULL", record };
    }

    // Check Firebase RTDB
    let foundRecord: OtpRecord | null = null;
    try {
      const otpRef = ref(db, `otps/${sanitizedKey}`);
      const snapshot = await get(otpRef);
      if (snapshot.exists()) {
        foundRecord = snapshot.val();
      }
    } catch (e) {
      // ignore
    }

    // Check Local Storage if not found in RTDB
    if (!foundRecord) {
      const local = getLocalOtps();
      foundRecord = local[sanitizedKey] || null;
    }

    if (!foundRecord) {
      return {
        valid: false,
        error: "Permintaan OTP tidak ditemukan. Silakan minta kode OTP ulang."
      };
    }

    if (Date.now() > foundRecord.expiresAt) {
      return {
        valid: false,
        error: "Kode OTP telah kedaluwarsa. Silakan minta kode OTP baru."
      };
    }

    // Determine Tier based on entered code
    const isLimited = foundRecord.codeLimited && cleanCode === foundRecord.codeLimited;
    const isFull = (foundRecord.codeFull && cleanCode === foundRecord.codeFull) || cleanCode === foundRecord.code;

    if (!isLimited && !isFull) {
      return {
        valid: false,
        error: "Kode OTP tidak sesuai. Pastikan Anda memasukkan kode yang diberikan oleh Superadmin."
      };
    }

    const verifiedTier: "LIMITED" | "FULL" = isFull ? "FULL" : "LIMITED";

    // Mark as verified with the determined tier
    foundRecord.status = "VERIFIED";
    foundRecord.verifiedTier = verifiedTier;
    const local = getLocalOtps();
    local[sanitizedKey] = foundRecord;
    saveLocalOtps(local);

    try {
      await update(ref(db, `otps/${sanitizedKey}`), { 
        status: "VERIFIED",
        verifiedTier 
      });
    } catch (e) {}

    return { valid: true, tier: verifiedTier, record: foundRecord };
  },

  /**
   * Retrieve all OTP records (for Superadmin panel)
   */
  async getAllOtps(): Promise<OtpRecord[]> {
    const results: Record<string, OtpRecord> = { ...getLocalOtps() };

    try {
      const snapshot = await get(ref(db, "otps"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.entries(data).forEach(([key, val]) => {
          results[key] = val as OtpRecord;
        });
      }
    } catch (e) {}

    return Object.values(results).sort((a, b) => b.createdAt - a.createdAt);
  },

  /**
   * Superadmin manual approval of OTP with specific tier
   */
  async approveOtpDirectly(identifier: string, tier: "LIMITED" | "FULL" = "FULL"): Promise<boolean> {
    const sanitizedKey = sanitizeKey(identifier);
    const local = getLocalOtps();
    if (local[sanitizedKey]) {
      local[sanitizedKey].status = "VERIFIED";
      local[sanitizedKey].verifiedTier = tier;
      saveLocalOtps(local);
    }

    try {
      await update(ref(db, `otps/${sanitizedKey}`), { 
        status: "VERIFIED",
        verifiedTier: tier 
      });
      return true;
    } catch (e) {
      return !!local[sanitizedKey];
    }
  }
};
