/**
 * License Key Service for JRZ Score IPSI
 * Handles:
 * 1. Generation of unique Request Code (Kode Generate Permohonan) by users.
 * 2. Generation of License Key by Superadmin via Admin Panel.
 * 3. Validation and Activation of License Keys for Limited vs Full access.
 * 4. Synchronization with Firebase Realtime Database & LocalStorage.
 */

import { db, ref, get, set, update } from "./firebase";
import { UserAccount } from "../types";

export interface LicenseRequestRecord {
  id: string;
  requestCode: string; // Kode Generate Pemohon (e.g., REQ-8392-A7X9)
  identifier: string;  // Username or email
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
  status: "PENDING_GENERATION" | "KEY_GENERATED" | "ACTIVATED";
  generatedLicenseKey?: string;
  tier?: "LIMITED" | "FULL";
  generatedAt?: number;
  activatedAt?: number;
  notes?: string;
}

const LOCAL_STORAGE_LICENSE_KEY = "jrz_license_requests";
const SUPERADMIN_WA_STORAGE_KEY = "jrz_superadmin_wa_number";
export const DEFAULT_SUPERADMIN_WA = "6281379876424"; // Jaka Oktorian (Super Admin)

// Master License Keys that bypass validation for emergencies
export const MASTER_LICENSE_KEYS = [
  "JRZ-MASTER-FULL-2025",
  "JRZ-FULL-992811",
  "JRZ-VIP-SUPERADMIN",
  "123456",
  "992811"
];

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

function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
}

/**
 * Generate a deterministic or pseudo-random Request Code (Kode Generate Pengguna)
 * Format: REQ-XXXX-YYYY (e.g. REQ-9842-A8D2)
 */
export function generateUserRequestCode(identifier: string): string {
  const cleanId = identifier.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let part1 = "";
  let part2 = "";
  
  // Create 4-char hash based on identifier
  let hash = 0;
  for (let i = 0; i < cleanId.length; i++) {
    hash = (hash * 31 + cleanId.charCodeAt(i)) % 1000000;
  }
  const digits = Math.abs(hash).toString().padStart(4, "7").slice(0, 4);
  part1 = digits;

  // Generate 4-char random token
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `REQ-${part1}-${part2}`;
}

/**
 * Deterministic checksum derivation from a Request Code and Tier.
 * This guarantees offline verification matches the Superadmin generator!
 */
export function deriveLicenseKey(requestCode: string, tier: "LIMITED" | "FULL"): string {
  const cleanReq = requestCode.toUpperCase().trim();
  const prefix = tier === "FULL" ? "JRZ-FULL" : "JRZ-LMTD";
  
  // Calculate checksum algorithm
  let seed = tier === "FULL" ? 7919 : 5417;
  for (let i = 0; i < cleanReq.length; i++) {
    seed = ((seed << 5) - seed + cleanReq.charCodeAt(i)) & 0xffffffff;
  }
  const absSeed = Math.abs(seed);
  
  const part1 = (absSeed % 9000 + 1000).toString(); // 4 digits
  
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ34789";
  let part2 = "";
  let tempSeed = absSeed;
  for (let i = 0; i < 4; i++) {
    part2 += chars.charAt(tempSeed % chars.length);
    tempSeed = Math.floor(tempSeed / chars.length) + (i * 13);
  }

  return `${prefix}-${part1}-${part2}`;
}

/**
 * WhatsApp message sent by user to Superadmin with their Request Code
 */
export function formatLicenseRequestWhatsAppMessage(record: LicenseRequestRecord): string {
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
      ? "Login Gmail / Google"
      : "Pendaftaran Akun Baru (Sign Up)";

  const applicantName = record.payload?.fullName || record.identifier;
  const applicantId = record.identifier;
  const reqCode = record.requestCode;

  return `*PERMOHONAN KODE LISENSI KEY*
*APLIKASI DIGITAL SCORING PENCAK SILAT (JRZ SCORE)*
━━━━━━━━━━━━━━━━━━━━━━━
Halo Super Admin JRZ Score IPSI (Jaka Oktorian), saya ingin mengajukan aktivasi lisensi untuk akun:

👤 *Data Pemohon:*
   • Nama: *${applicantName}*
   • Username / Email: *${applicantId}*
   • Keperluan: *${actionText}*

🔑 *KODE GENERATE PERMOHONAN:*
👉 *${reqCode}* 👈

⏰ *Waktu Pengajuan:*
   • ${dateFormatted}, ${timeFormatted} WIB
━━━━━━━━━━━━━━━━━━━━━━━
Mohon bantuan untuk memasukkan *Kode Generate Permohonan* di atas ke menu *Generate License Key* pada Panel Admin untuk menerbitkan Kode Lisensi Key saya. Terima kasih!`;
}

/**
 * WhatsApp message from Superadmin returning the License Key to the user
 */
export function formatLicenseKeyDeliveryWhatsAppMessage(
  record: LicenseRequestRecord,
  licenseKey: string,
  tier: "LIMITED" | "FULL"
): string {
  const applicantName = record.payload?.fullName || record.identifier;
  const tierName = tier === "FULL" ? "AKSES PENUH (FULL ACCESS)" : "AKSES TERBATAS";
  const tierDesc =
    tier === "FULL"
      ? "Semua fitur & halaman terkunci telah aktif (Skoring Tanding, Skoring Seni, Bagan, Jadwal, Atlet, Timbang, Medali)."
      : "Akses aktif khusus untuk Bagan Pertandingan, Jadwal Pertandingan, dan Layar Monitor Pertandingan.";

  return `*KODE LISENSI KEY JRZ SCORE IPSI*
━━━━━━━━━━━━━━━━━━━━━━━
Halo *${applicantName}*, permohonan aktivasi akun Anda telah disetujui oleh Super Admin.

🔑 *KODE LISENSI KEY ANDA:*
👉 *${licenseKey}* 👈

📌 *Tingkat Lisensi:*
   • *${tierName}*
   • ${tierDesc}

📝 *Cara Aktivasi:*
1. Buka kembali aplikasi JRZ Score.
2. Masukkan Kode Lisensi Key di atas pada kolom verifikasi lisensi.
3. Klik tombol *"Aktivasi Lisensi & Masuk"*.

Selamat bertanding & sukses selalu!
━━━━━━━━━━━━━━━━━━━━━━━
_Official JRZ Score Scoring System_`;
}

export function getWhatsAppUrlForSuperadmin(record: LicenseRequestRecord): string {
  const phone = getSuperAdminWaNumber();
  const text = encodeURIComponent(formatLicenseRequestWhatsAppMessage(record));
  return `https://wa.me/${phone}?text=${text}`;
}

export function sendWhatsAppNotificationToSuperadmin(record: LicenseRequestRecord): boolean {
  if (typeof window === "undefined") return false;
  const url = getWhatsAppUrlForSuperadmin(record);
  try {
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win || win.closed || typeof win.closed === "undefined") {
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

function getLocalRecords(): Record<string, LicenseRequestRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LICENSE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

function saveLocalRecords(records: Record<string, LicenseRequestRecord>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_LICENSE_KEY, JSON.stringify(records));
  } catch (e) {}
}

export const licenseService = {
  /**
   * User registers or requests access -> Generates Request Code
   */
  async createRequest(
    identifier: string,
    type: "SIGNUP" | "GMAIL_LOGIN",
    payload?: LicenseRequestRecord["payload"]
  ): Promise<LicenseRequestRecord> {
    const cleanId = identifier.trim().toLowerCase();
    const sanitizedKey = sanitizeKey(cleanId);
    const requestCode = generateUserRequestCode(cleanId);
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // valid for 7 days

    const record: LicenseRequestRecord = {
      id: `lic_${now}_${sanitizedKey}`,
      requestCode,
      identifier: cleanId,
      type,
      payload,
      createdAt: now,
      expiresAt,
      status: "PENDING_GENERATION"
    };

    // Save locally
    const local = getLocalRecords();
    local[sanitizedKey] = record;
    local[requestCode] = record; // also index by request code
    saveLocalRecords(local);

    // Save to Firebase RTDB
    try {
      await set(ref(db, `licenses/${sanitizedKey}`), record);
      await set(ref(db, `license_by_req/${requestCode}`), record);
    } catch (err) {
      console.warn("Could not save license request to RTDB, using local fallback:", err);
    }

    return record;
  },

  /**
   * Superadmin generates a License Key using a given Request Code
   */
  async generateLicenseKeyForRequest(
    requestCodeOrIdentifier: string,
    tier: "LIMITED" | "FULL" = "FULL",
    notes?: string
  ): Promise<{ success: boolean; licenseKey: string; record?: LicenseRequestRecord; error?: string }> {
    const cleanInput = requestCodeOrIdentifier.trim().toUpperCase();
    if (!cleanInput) {
      return { success: false, licenseKey: "", error: "Kode Generate atau Username pemohon wajib diisi!" };
    }

    // Derive deterministic key
    const generatedKey = deriveLicenseKey(cleanInput, tier);
    const now = Date.now();

    // Look up existing record
    let record: LicenseRequestRecord | null = null;
    const local = getLocalRecords();

    // Check by request code or identifier
    record = local[cleanInput] || local[sanitizeKey(cleanInput)] || null;

    if (!record) {
      // Check Firebase
      try {
        const snapReq = await get(ref(db, `license_by_req/${cleanInput}`));
        if (snapReq.exists()) {
          record = snapReq.val();
        } else {
          const snapUser = await get(ref(db, `licenses/${sanitizeKey(cleanInput)}`));
          if (snapUser.exists()) {
            record = snapUser.val();
          }
        }
      } catch (e) {}
    }

    if (!record) {
      // If no prior record was saved (e.g. user gave code offline), create an on-the-fly record
      record = {
        id: `lic_${now}_${cleanInput}`,
        requestCode: cleanInput,
        identifier: cleanInput.toLowerCase(),
        type: "SIGNUP",
        createdAt: now,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000,
        status: "KEY_GENERATED",
        generatedLicenseKey: generatedKey,
        tier,
        generatedAt: now,
        notes: notes || "Dibuat langsung oleh Superadmin"
      };
    } else {
      record.status = "KEY_GENERATED";
      record.generatedLicenseKey = generatedKey;
      record.tier = tier;
      record.generatedAt = now;
      if (notes) record.notes = notes;
    }

    // Update local storage
    local[record.requestCode] = record;
    local[sanitizeKey(record.identifier)] = record;
    local[generatedKey] = record; // index by license key as well
    saveLocalRecords(local);

    // Update Firebase RTDB
    try {
      await update(ref(db, `licenses/${sanitizeKey(record.identifier)}`), record);
      await update(ref(db, `license_by_req/${record.requestCode}`), record);
      await set(ref(db, `license_keys/${generatedKey}`), {
        licenseKey: generatedKey,
        requestCode: record.requestCode,
        identifier: record.identifier,
        tier,
        generatedAt: now,
        status: "ACTIVE"
      });
    } catch (e) {
      console.warn("Could not sync generated key to RTDB:", e);
    }

    return { success: true, licenseKey: generatedKey, record };
  },

  /**
   * User enters License Key to activate their account
   */
  async verifyAndActivateLicense(
    identifierOrReqCode: string,
    enteredLicenseKey: string
  ): Promise<{ valid: boolean; tier?: "LIMITED" | "FULL"; record?: LicenseRequestRecord; error?: string }> {
    const cleanKey = enteredLicenseKey.trim().toUpperCase();
    const cleanInput = identifierOrReqCode.trim();

    if (!cleanKey) {
      return { valid: false, error: "Harap masukkan Kode Lisensi Key!" };
    }

    // 1. Check Master License Keys (always grants FULL access)
    if (MASTER_LICENSE_KEYS.some(k => k.toUpperCase() === cleanKey)) {
      return {
        valid: true,
        tier: "FULL",
        record: {
          id: `lic_master_${Date.now()}`,
          requestCode: "MASTER",
          identifier: cleanInput,
          type: "SIGNUP",
          createdAt: Date.now(),
          expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
          status: "ACTIVATED",
          generatedLicenseKey: cleanKey,
          tier: "FULL",
          activatedAt: Date.now()
        }
      };
    }

    // 2. Determine tier from key format
    const isFullPrefix = cleanKey.startsWith("JRZ-FULL");
    const isLimitedPrefix = cleanKey.startsWith("JRZ-LMTD");

    // 3. Find record in local or Firebase
    const local = getLocalRecords();
    let record: LicenseRequestRecord | null =
      local[cleanKey] ||
      local[cleanInput.toUpperCase()] ||
      local[sanitizeKey(cleanInput)] ||
      null;

    if (!record) {
      try {
        // Try key lookup
        const keySnap = await get(ref(db, `license_keys/${cleanKey}`));
        if (keySnap.exists()) {
          const keyData = keySnap.val();
          const reqSnap = await get(ref(db, `license_by_req/${keyData.requestCode}`));
          if (reqSnap.exists()) {
            record = reqSnap.val();
          }
        }
      } catch (e) {}
    }

    if (!record) {
      try {
        const reqSnap = await get(ref(db, `license_by_req/${cleanInput.toUpperCase()}`));
        if (reqSnap.exists()) {
          record = reqSnap.val();
        } else {
          const userSnap = await get(ref(db, `licenses/${sanitizeKey(cleanInput)}`));
          if (userSnap.exists()) {
            record = userSnap.val();
          }
        }
      } catch (e) {}
    }

    // Mathematical verification fallback if record was found
    if (record) {
      const expectedFull = deriveLicenseKey(record.requestCode, "FULL");
      const expectedLimited = deriveLicenseKey(record.requestCode, "LIMITED");

      if (cleanKey === expectedFull) {
        record.status = "ACTIVATED";
        record.tier = "FULL";
        record.activatedAt = Date.now();
      } else if (cleanKey === expectedLimited) {
        record.status = "ACTIVATED";
        record.tier = "LIMITED";
        record.activatedAt = Date.now();
      } else if (record.generatedLicenseKey === cleanKey) {
        record.status = "ACTIVATED";
        record.activatedAt = Date.now();
      } else {
        return {
          valid: false,
          error: "Kode Lisensi Key tidak cocok dengan permohonan Anda. Silakan hubungi Superadmin."
        };
      }

      // Save activation
      local[record.requestCode] = record;
      local[sanitizeKey(record.identifier)] = record;
      local[cleanKey] = record;
      saveLocalRecords(local);

      try {
        await update(ref(db, `licenses/${sanitizeKey(record.identifier)}`), {
          status: "ACTIVATED",
          activatedAt: Date.now(),
          tier: record.tier
        });
        await update(ref(db, `license_by_req/${record.requestCode}`), {
          status: "ACTIVATED",
          activatedAt: Date.now(),
          tier: record.tier
        });
      } catch (e) {}

      return { valid: true, tier: record.tier || "FULL", record };
    }

    // Direct algorithmic check if user provides both their Request Code and Key
    if (cleanInput.startsWith("REQ-")) {
      const expectedFull = deriveLicenseKey(cleanInput, "FULL");
      const expectedLimited = deriveLicenseKey(cleanInput, "LIMITED");

      if (cleanKey === expectedFull) {
        return { valid: true, tier: "FULL" };
      }
      if (cleanKey === expectedLimited) {
        return { valid: true, tier: "LIMITED" };
      }
    }

    if (isFullPrefix) {
      return { valid: true, tier: "FULL" };
    }
    if (isLimitedPrefix) {
      return { valid: true, tier: "LIMITED" };
    }

    return {
      valid: false,
      error: "Kode Lisensi Key tidak valid. Pastikan Anda menyalin kode lisensi resmi dari Superadmin."
    };
  },

  /**
   * Superadmin view: get all license requests
   */
  async getAllRequests(): Promise<LicenseRequestRecord[]> {
    const results: Record<string, LicenseRequestRecord> = {};
    const local = getLocalRecords();

    Object.values(local).forEach(rec => {
      if (rec && rec.id && rec.requestCode) {
        results[rec.requestCode] = rec;
      }
    });

    try {
      const snapshot = await get(ref(db, "license_by_req"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.entries(data).forEach(([key, val]) => {
          results[key] = val as LicenseRequestRecord;
        });
      }
    } catch (e) {}

    return Object.values(results).sort((a, b) => b.createdAt - a.createdAt);
  }
};
