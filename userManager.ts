/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { UserAccount, UserRole, UserStatus, PasswordResetRequest, IpUnlockRequest } from "./src/types.ts";

function resolveWritableFile(fileName: string): string {
  if (process.env.JRZ_DATA_DIR) {
    try {
      if (!fs.existsSync(process.env.JRZ_DATA_DIR)) {
        fs.mkdirSync(process.env.JRZ_DATA_DIR, { recursive: true });
      }
      return path.join(process.env.JRZ_DATA_DIR, fileName);
    } catch (e) {
      // fallback below
    }
  }
  const localPath = path.resolve("./", fileName);
  try {
    fs.accessSync(path.dirname(localPath), fs.constants.W_OK);
    return localPath;
  } catch (e) {
    const fallbackDir = path.join(os.homedir(), ".jrz-score-ipsi");
    try {
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      return path.join(fallbackDir, fileName);
    } catch (err) {
      return localPath;
    }
  }
}

const USERS_DB_FILE = resolveWritableFile("users_db.json");

export interface ActivityLog {
  id: string;
  timestamp: number;
  action: "LOGIN" | "REGISTER" | "APPROVE" | "REJECT" | "CREATE" | "UPDATE" | "DELETE" | "PASSWORD_RESET" | "PASSWORD_RESET_REQUEST" | "IP_UNLOCK_REQUEST" | "IP_UNLOCK_APPROVE" | "IP_UNLOCK_REJECT" | "IP_LOCK_RESET";
  username: string;
  details: string;
  ip: string;
}

interface UserDbSchema {
  users: UserAccount[];
  activityLogs: ActivityLog[];
  passwordResetRequests?: PasswordResetRequest[];
  ipUnlockRequests?: IpUnlockRequest[];
}

export function normalizeIp(ip: string | undefined): string {
  if (!ip) return "127.0.0.1";
  let clean = ip.trim().toLowerCase();
  if (clean.startsWith("::ffff:")) {
    clean = clean.replace("::ffff:", "");
  }
  if (clean === "::1" || clean === "127.0.0.1" || clean === "localhost") {
    return "127.0.0.1";
  }
  return clean;
}

export function isMatchingIp(ipA: string | undefined, ipB: string | undefined): boolean {
  if (!ipA || !ipB) return true;
  return normalizeIp(ipA) === normalizeIp(ipB);
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: "usr_superadmin",
    username: "jakaoktorian",
    password: "Abuyaku21*",
    fullName: "Jaka Oktorian (Super Admin)",
    role: "superadmin",
    status: "APPROVED",
    organization: "Pengurus Besar IPSI",
    emailOrPhone: "jakaoktorian2@gmail.com",
    createdAt: 1700000000000,
    approvedAt: 1700000000000,
    approvedBy: "System Root",
    boundIp: undefined,
    ipLockEnabled: false // Bebas login multi-perangkat (Tab Juri, Dewan, dsb)
  },
  {
    id: "usr_admin",
    username: "admin",
    password: "admin123",
    fullName: "Operator Utama Gelanggang",
    role: "admin",
    status: "APPROVED",
    organization: "Panitia Pelaksana Gelanggang A",
    emailOrPhone: "admin@ipsi.id",
    createdAt: 1700000000000,
    approvedAt: 1700000000000,
    approvedBy: "Jaka Oktorian",
    boundIp: undefined,
    ipLockEnabled: false // Bebas login multi-perangkat (Tab Juri, Dewan, dsb)
  }
];

function initDb(): UserDbSchema {
  try {
    if (fs.existsSync(USERS_DB_FILE)) {
      const raw = fs.readFileSync(USERS_DB_FILE, "utf8");
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.users)) {
        let changed = false;

        // Check if old "superadmin" user exists and migrate to "jakaoktorian"
        const oldSuper = data.users.find((u: UserAccount) => u.username.toLowerCase() === "superadmin");
        if (oldSuper) {
          oldSuper.username = "jakaoktorian";
          oldSuper.password = "Abuyaku21*";
          oldSuper.fullName = "Jaka Oktorian (Super Admin)";
          oldSuper.emailOrPhone = "jakaoktorian2@gmail.com";
          oldSuper.boundIp = undefined;
          oldSuper.ipLockEnabled = false;
          changed = true;
        }

        // Ensure default superadmin (jakaoktorian) and admin exist
        DEFAULT_USERS.forEach(defUser => {
          const userObj = data.users.find((u: UserAccount) => u.username.toLowerCase() === defUser.username.toLowerCase());
          if (!userObj) {
            data.users.push(defUser);
            changed = true;
          } else {
            if (userObj.username.toLowerCase() === "jakaoktorian") {
              userObj.password = "Abuyaku21*";
              userObj.role = "superadmin";
              userObj.status = "APPROVED";
            }
            // Migrate users to multi-device login (disable restrictive IP lock by default)
            if (userObj.ipLockEnabled === true && userObj.boundIp) {
              userObj.ipLockEnabled = false;
              userObj.boundIp = undefined;
              changed = true;
            }
            if (userObj.ipLockEnabled === undefined) {
              userObj.ipLockEnabled = false;
              changed = true;
            }
          }
        });

        // Also ensure any existing user accounts have multi-device login enabled
        data.users.forEach((u: UserAccount) => {
          if (u.ipLockEnabled === undefined) {
            u.ipLockEnabled = false;
            changed = true;
          }
        });
        if (!Array.isArray(data.activityLogs)) {
          data.activityLogs = [];
          changed = true;
        }
        if (!Array.isArray(data.passwordResetRequests)) {
          data.passwordResetRequests = [];
          changed = true;
        }
        if (!Array.isArray(data.ipUnlockRequests)) {
          data.ipUnlockRequests = [];
          changed = true;
        }
        if (changed) {
          saveDb(data);
        }
        return data;
      }
    }
  } catch (err) {
    console.error("[UserManager] Gagal membaca database user, menginisialisasi ulang:", err);
  }

  const initialDb: UserDbSchema = {
    users: [...DEFAULT_USERS],
    activityLogs: [
      {
        id: "log_init",
        timestamp: Date.now(),
        action: "CREATE",
        username: "superadmin",
        details: "Inisialisasi sistem otentikasi IPSI Scoreboard",
        ip: "127.0.0.1"
      }
    ],
    passwordResetRequests: [],
    ipUnlockRequests: []
  };
  saveDb(initialDb);
  return initialDb;
}

function saveDb(db: UserDbSchema) {
  try {
    fs.writeFileSync(USERS_DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (err) {
    console.error("[UserManager] Gagal menyimpan database user ke file:", err);
  }
}

function logActivity(action: ActivityLog["action"], username: string, details: string, ip: string) {
  const db = initDb();
  const newLog: ActivityLog = {
    id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    timestamp: Date.now(),
    action,
    username,
    details,
    ip
  };
  db.activityLogs.unshift(newLog);
  if (db.activityLogs.length > 200) {
    db.activityLogs = db.activityLogs.slice(0, 200);
  }
  saveDb(db);
}

function sanitizeUser(u: UserAccount): Omit<UserAccount, "password"> {
  const { password, ...safe } = u;
  return safe;
}

export function loginUser(usernameInput: string, passwordInput: string, ip: string) {
  const db = initDb();
  const usernameClean = (usernameInput || "").trim().toLowerCase();
  const cleanCurrentIp = normalizeIp(ip);
  
  if (!usernameClean || !passwordInput) {
    return { success: false, error: "Username dan Kata Sandi wajib diisi!" };
  }

  const user = db.users.find(u => u.username.toLowerCase() === usernameClean);

  if (!user) {
    return { success: false, error: "Akun dengan username tersebut tidak ditemukan!" };
  }

  if (user.password !== passwordInput) {
    return { success: false, error: "Kata sandi yang Anda masukkan salah!" };
  }

  if (user.status === "PENDING") {
    return { 
      success: false, 
      error: "Akun Anda masih dalam status MENUNGGU VERIFIKASI dari Super Admin. Silakan hubungi Super Admin untuk menyetujui pendaftaran Anda." 
    };
  }

  if (user.status === "SUSPENDED" || user.status === "REJECTED") {
    return { 
      success: false, 
      error: `Akun Anda telah ${user.status === "SUSPENDED" ? "dinonaktifkan (Suspended)" : "ditolak"} oleh Super Admin. Hubungi pengelola untuk informasi lebih lanjut.` 
    };
  }

  // Multi-Device / Tournament Gelanggang Support:
  // IP Lock only triggers if explicitly enabled by Super Admin (ipLockEnabled === true) and boundIp is set.
  // By default (ipLockEnabled: false), multiple devices (Tab Juri 1-3, Dewan, Sekretaris, Scoreboard Monitor)
  // connected to the server can all login simultaneously using the same ID.
  const isLockActive = user.ipLockEnabled === true;
  if (isLockActive && user.boundIp && user.boundIp.trim()) {
    const cleanBoundIp = normalizeIp(user.boundIp);
    if (cleanBoundIp !== cleanCurrentIp) {
      logActivity("LOGIN", user.username, `LOGIN DITOLAK (IP Mismatch): Terkunci pada IP ${cleanBoundIp}, mencoba login dari IP ${cleanCurrentIp}`, ip);
      return {
        success: false,
        ipMismatch: true,
        error: `Login Ditolak: Akun @${user.username} terkunci khusus untuk IP Address [${cleanBoundIp}]. Anda saat ini mengakses dari IP [${cleanCurrentIp}]. Untuk login multi-perangkat atau berpindah server, nonaktifkan proteksi 1-IP di Super Admin atau ajukan izin buka kunci IP.`,
        boundIp: cleanBoundIp,
        currentIp: cleanCurrentIp,
        username: user.username,
        userId: user.id,
        fullName: user.fullName
      };
    }
  }

  user.lastLoginAt = Date.now();
  user.lastLoginIp = cleanCurrentIp;
  saveDb(db);

  logActivity("LOGIN", user.username, `Berhasil login sebagai ${user.role.toUpperCase()} (IP: ${cleanCurrentIp})`, ip);

  return {
    success: true,
    user: sanitizeUser(user)
  };
}

export function registerUser(
  data: {
    username: string;
    password: string;
    fullName: string;
    organization?: string;
    emailOrPhone?: string;
    role?: UserRole;
  },
  ip: string
) {
  const db = initDb();
  const username = (data.username || "").trim();
  const fullName = (data.fullName || "").trim();
  const password = data.password || "";
  const organization = (data.organization || "").trim() || "Kontingen IPSI";
  const emailOrPhone = (data.emailOrPhone || "").trim();
  const role: UserRole = data.role === "superadmin" ? "superadmin" : "admin";

  if (!username || username.length < 3) {
    return { success: false, error: "Username minimal harus 3 karakter!" };
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return { success: false, error: "Username hanya boleh berupa huruf, angka, titik, strip, dan underscore!" };
  }

  if (!password || password.length < 4) {
    return { success: false, error: "Kata sandi minimal harus 4 karakter!" };
  }

  if (!fullName) {
    return { success: false, error: "Nama lengkap wajib diisi!" };
  }

  const existing = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    return { success: false, error: "Username sudah digunakan! Silakan gunakan username lain." };
  }

  const newUser: UserAccount = {
    id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    username,
    password,
    fullName,
    role,
    status: "PENDING", // Pendaftaran baru default PENDING verifikasi Super Admin
    organization,
    emailOrPhone,
    ipLockEnabled: false, // Multi-perangkat aktif
    createdAt: Date.now()
  };

  db.users.push(newUser);
  saveDb(db);

  logActivity("REGISTER", username, `Mendaftar akun baru (${fullName} - ${organization}) dengan status PENDING`, ip);

  return {
    success: true,
    message: "Pendaftaran berhasil! Akun Anda telah tersimpan dan sedang menunggu verifikasi/persetujuan dari Super Admin sebelum dapat digunakan untuk login.",
    user: sanitizeUser(newUser)
  };
}

export function getAllUsers() {
  const db = initDb();
  return db.users.map(sanitizeUser);
}

export function approveUser(userId: string, approvedByUsername: string, ip: string) {
  const db = initDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: "User tidak ditemukan!" };
  }

  user.status = "APPROVED";
  user.approvedAt = Date.now();
  user.approvedBy = approvedByUsername;
  saveDb(db);

  logActivity("APPROVE", approvedByUsername, `Menyetujui pendaftaran akun ${user.username} (${user.fullName})`, ip);

  return {
    success: true,
    message: `Akun ${user.username} (${user.fullName}) berhasil disetujui & diaktifkan!`,
    user: sanitizeUser(user)
  };
}

export function rejectUser(userId: string, rejectedByUsername: string, ip: string) {
  const db = initDb();
  const idx = db.users.findIndex(u => u.id === userId);
  if (idx === -1) {
    return { success: false, error: "User tidak ditemukan!" };
  }

  const user = db.users[idx];
  // Remove or set rejected
  db.users.splice(idx, 1);
  saveDb(db);

  logActivity("REJECT", rejectedByUsername, `Menolak & menghapus pendaftaran akun ${user.username} (${user.fullName})`, ip);

  return {
    success: true,
    message: `Pendaftaran akun ${user.username} berhasil ditolak.`
  };
}

export function createUserByAdmin(
  data: {
    username: string;
    password: string;
    fullName: string;
    role: UserRole;
    organization?: string;
    emailOrPhone?: string;
  },
  createdByUsername: string,
  ip: string
) {
  const db = initDb();
  const username = (data.username || "").trim();
  const fullName = (data.fullName || "").trim();
  const password = data.password || "";
  const organization = (data.organization || "").trim() || "IPSI";
  const emailOrPhone = (data.emailOrPhone || "").trim();
  const role: UserRole = data.role === "superadmin" ? "superadmin" : "admin";

  if (!username || username.length < 3) {
    return { success: false, error: "Username minimal harus 3 karakter!" };
  }

  if (!password || password.length < 4) {
    return { success: false, error: "Kata sandi minimal harus 4 karakter!" };
  }

  if (!fullName) {
    return { success: false, error: "Nama lengkap wajib diisi!" };
  }

  const existing = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    return { success: false, error: "Username sudah digunakan!" };
  }

  const newUser: UserAccount = {
    id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    username,
    password,
    fullName,
    role,
    status: "APPROVED", // Dibuat langsung oleh Super Admin -> Otomatis APPROVED
    organization,
    emailOrPhone,
    ipLockEnabled: false, // Multi-perangkat aktif
    createdAt: Date.now(),
    approvedAt: Date.now(),
    approvedBy: createdByUsername
  };

  db.users.push(newUser);
  saveDb(db);

  logActivity("CREATE", createdByUsername, `Membuat akun baru ${username} (${role.toUpperCase()})`, ip);

  return {
    success: true,
    message: `Akun ${username} berhasil dibuat dengan status Aktif!`,
    user: sanitizeUser(newUser)
  };
}

export function updateUserByAdmin(
  userId: string,
  updates: {
    fullName?: string;
    role?: UserRole;
    status?: UserStatus;
    organization?: string;
    emailOrPhone?: string;
  },
  updatedByUsername: string,
  ip: string
) {
  const db = initDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: "User tidak ditemukan!" };
  }

  if (updates.fullName !== undefined) user.fullName = updates.fullName.trim();
  if (updates.role !== undefined) user.role = updates.role;
  if (updates.status !== undefined) user.status = updates.status;
  if (updates.organization !== undefined) user.organization = updates.organization.trim();
  if (updates.emailOrPhone !== undefined) user.emailOrPhone = updates.emailOrPhone.trim();

  saveDb(db);

  logActivity("UPDATE", updatedByUsername, `Memperbarui data akun ${user.username}`, ip);

  return {
    success: true,
    message: `Data akun ${user.username} berhasil diperbarui.`,
    user: sanitizeUser(user)
  };
}

export function resetPasswordByAdmin(userId: string, newPassword: string, resetByUsername: string, ip: string) {
  const db = initDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: "User tidak ditemukan!" };
  }

  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: "Kata sandi baru minimal 4 karakter!" };
  }

  user.password = newPassword;
  saveDb(db);

  logActivity("PASSWORD_RESET", resetByUsername, `Mereset kata sandi akun ${user.username}`, ip);

  return {
    success: true,
    message: `Kata sandi untuk ${user.username} berhasil diperbarui!`
  };
}

export function deleteUserByAdmin(userId: string, deletedByUsername: string, ip: string) {
  const db = initDb();
  const idx = db.users.findIndex(u => u.id === userId);
  if (idx === -1) {
    return { success: false, error: "User tidak ditemukan!" };
  }

  const user = db.users[idx];

  // Prevent deleting the last superadmin
  if (user.role === "superadmin") {
    const superadminCount = db.users.filter(u => u.role === "superadmin" && u.status === "APPROVED").length;
    if (superadminCount <= 1) {
      return { success: false, error: "Tidak dapat menghapus satu-satunya akun Super Admin!" };
    }
  }

  db.users.splice(idx, 1);
  saveDb(db);

  logActivity("DELETE", deletedByUsername, `Menghapus akun ${user.username} (${user.fullName})`, ip);

  return {
    success: true,
    message: `Akun ${user.username} berhasil dihapus permanen.`
  };
}

export function getActivityLogs() {
  const db = initDb();
  return db.activityLogs || [];
}

// =========================================================================
// PASSWORD RESET WORKFLOW (REQUEST, APPROVAL, TOKEN, AND NEW PASSWORD)
// =========================================================================

export function createPasswordResetRequest(usernameInput: string, emailOrPhoneInput: string, ip: string) {
  const db = initDb();
  const usernameClean = (usernameInput || "").trim().toLowerCase();
  const emailOrPhone = (emailOrPhoneInput || "").trim();

  if (!usernameClean) {
    return { success: false, error: "Username akun wajib diisi!" };
  }

  if (!emailOrPhone) {
    return { success: false, error: "No. WhatsApp atau Email terdaftar wajib diisi untuk verifikasi identitas!" };
  }

  const user = db.users.find(u => u.username.toLowerCase() === usernameClean);
  if (!user) {
    return { 
      success: false, 
      error: `Akun dengan username "${usernameInput}" tidak ditemukan dalam sistem!` 
    };
  }

  if (!db.passwordResetRequests) {
    db.passwordResetRequests = [];
  }

  // Check if there's already a pending request for this user
  const existingPending = db.passwordResetRequests.find(
    r => r.userId === user.id && r.status === "PENDING"
  );

  if (existingPending) {
    // Update contact info if changed
    existingPending.emailOrPhone = emailOrPhone;
    existingPending.createdAt = Date.now();
    saveDb(db);
    logActivity("PASSWORD_RESET_REQUEST", user.username, `Memperbarui permohonan reset sandi (Kontak: ${emailOrPhone})`, ip);
    return {
      success: true,
      message: `Permohonan reset kata sandi untuk akun "${user.username}" sudah tercatat dan sedang menunggu verifikasi Super Admin.`,
      requestId: existingPending.id
    };
  }

  const newRequest: PasswordResetRequest = {
    id: "req_pwd_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    emailOrPhone: emailOrPhone,
    status: "PENDING",
    createdAt: Date.now()
  };

  db.passwordResetRequests.unshift(newRequest);
  saveDb(db);

  logActivity("PASSWORD_RESET_REQUEST", user.username, `Mengajukan permohonan reset sandi via kontak: ${emailOrPhone}`, ip);

  return {
    success: true,
    message: `Permohonan reset kata sandi berhasil dikirim! Super Admin akan memverifikasi dan mengirimkan tautan reset kata sandi baru.`,
    requestId: newRequest.id,
    request: newRequest
  };
}

export function getPasswordResetRequests(): PasswordResetRequest[] {
  const db = initDb();
  return db.passwordResetRequests || [];
}

export function approvePasswordResetRequest(requestId: string, approvedByUsername: string, ip: string) {
  const db = initDb();
  if (!db.passwordResetRequests) {
    return { success: false, error: "Data permohonan tidak ditemukan!" };
  }

  const request = db.passwordResetRequests.find(r => r.id === requestId);
  if (!request) {
    return { success: false, error: "Permohonan reset sandi tidak ditemukan!" };
  }

  const user = db.users.find(u => u.id === request.userId);
  if (!user) {
    return { success: false, error: "Akun pengguna terkait tidak ditemukan!" };
  }

  // Generate secure random reset token
  const token = "rst_" + crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours validity

  request.status = "APPROVED";
  request.token = token;
  request.approvedAt = Date.now();
  request.approvedBy = approvedByUsername;
  request.expiresAt = expiresAt;

  saveDb(db);

  logActivity("APPROVE", approvedByUsername, `Menyetujui permohonan reset kata sandi untuk ${user.username} & membuat tautan token reset`, ip);

  return {
    success: true,
    message: `Permohonan reset kata sandi untuk "${user.username}" berhasil disetujui!`,
    token,
    request
  };
}

export function rejectPasswordResetRequest(requestId: string, rejectedByUsername: string, ip: string) {
  const db = initDb();
  if (!db.passwordResetRequests) {
    return { success: false, error: "Data permohonan tidak ditemukan!" };
  }

  const request = db.passwordResetRequests.find(r => r.id === requestId);
  if (!request) {
    return { success: false, error: "Permohonan reset sandi tidak ditemukan!" };
  }

  request.status = "REJECTED";
  saveDb(db);

  logActivity("REJECT", rejectedByUsername, `Menolak permohonan reset kata sandi untuk ${request.username}`, ip);

  return {
    success: true,
    message: `Permohonan reset kata sandi untuk "${request.username}" telah ditolak.`
  };
}

export function verifyResetToken(tokenInput: string) {
  const db = initDb();
  const token = (tokenInput || "").trim();

  if (!token) {
    return { valid: false, error: "Token reset kata sandi tidak valid atau kosong!" };
  }

  if (!db.passwordResetRequests) {
    return { valid: false, error: "Token reset tidak ditemukan dalam sistem!" };
  }

  const request = db.passwordResetRequests.find(r => r.token === token);
  if (!request) {
    return { valid: false, error: "Token reset kata sandi tidak ditemukan atau tidak valid!" };
  }

  if (request.status === "USED") {
    return { valid: false, error: "Token reset kata sandi ini sudah pernah digunakan sebelumnya!" };
  }

  if (request.status === "REJECTED") {
    return { valid: false, error: "Permohonan reset kata sandi ini telah ditolak oleh Admin!" };
  }

  if (request.status !== "APPROVED") {
    return { valid: false, error: "Permohonan reset kata sandi belum disetujui oleh Super Admin!" };
  }

  if (request.expiresAt && Date.now() > request.expiresAt) {
    return { valid: false, error: "Token reset kata sandi telah kedaluwarsa (masa berlaku 24 jam telah habis)!" };
  }

  const user = db.users.find(u => u.id === request.userId);
  if (!user) {
    return { valid: false, error: "Akun pengguna terkait tidak ditemukan!" };
  }

  return {
    valid: true,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      organization: user.organization
    },
    request
  };
}

export function resetPasswordWithToken(tokenInput: string, newPasswordInput: string, ip: string) {
  const tokenVerify = verifyResetToken(tokenInput);
  if (!tokenVerify.valid || !tokenVerify.request) {
    return { success: false, error: tokenVerify.error || "Token reset tidak valid!" };
  }

  const newPassword = (newPasswordInput || "").trim();
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: "Kata sandi baru minimal harus 4 karakter!" };
  }

  const db = initDb();
  const request = db.passwordResetRequests?.find(r => r.id === tokenVerify.request!.id);
  if (!request) {
    return { success: false, error: "Permohonan reset tidak ditemukan!" };
  }

  const user = db.users.find(u => u.id === request.userId);
  if (!user) {
    return { success: false, error: "Akun pengguna tidak ditemukan!" };
  }

  // Update password in database
  user.password = newPassword;
  request.status = "USED";
  request.usedAt = Date.now();

  saveDb(db);

  logActivity("PASSWORD_RESET", user.username, `Berhasil membuat kata sandi baru menggunakan token reset yang disetujui Admin`, ip);

  return {
    success: true,
    message: `Kata sandi baru untuk akun "${user.username}" berhasil disimpan! Silakan login menggunakan kata sandi yang baru dibuat.`,
    username: user.username
  };
}

// =========================================================================
// IP ADDRESS LOCKING & UNLOCK PERMISSION WORKFLOW
// =========================================================================

export function createIpUnlockRequest(
  usernameInput: string,
  requestedIpInput: string,
  reasonInput: string,
  emailOrPhoneInput: string,
  ip: string
) {
  const db = initDb();
  const usernameClean = (usernameInput || "").trim().toLowerCase();
  const requestedIp = normalizeIp(requestedIpInput || ip);
  const reason = (reasonInput || "").trim();
  const emailOrPhone = (emailOrPhoneInput || "").trim();

  if (!usernameClean) {
    return { success: false, error: "Username akun wajib diisi!" };
  }

  const user = db.users.find(u => u.username.toLowerCase() === usernameClean);
  if (!user) {
    return { success: false, error: `Akun dengan username "${usernameInput}" tidak ditemukan!` };
  }

  if (!db.ipUnlockRequests) {
    db.ipUnlockRequests = [];
  }

  // Check if there's already a pending request for this user
  const existingPending = db.ipUnlockRequests.find(
    r => r.userId === user.id && r.status === "PENDING"
  );

  if (existingPending) {
    existingPending.requestedIp = requestedIp;
    existingPending.currentBoundIp = user.boundIp || "127.0.0.1";
    existingPending.reason = reason || existingPending.reason;
    existingPending.emailOrPhone = emailOrPhone || existingPending.emailOrPhone;
    existingPending.createdAt = Date.now();
    saveDb(db);

    logActivity(
      "IP_UNLOCK_REQUEST",
      user.username,
      `Memperbarui permohonan izin IP: Terkunci pada [${existingPending.currentBoundIp}] -> Minta akses IP [${requestedIp}] (${reason || "Tanpa alasan"})`,
      ip
    );

    return {
      success: true,
      message: `Permohonan izin buka kunci IP untuk akun "${user.username}" sudah tercatat dan sedang menunggu persetujuan Super Admin.`,
      requestId: existingPending.id,
      request: existingPending
    };
  }

  const newRequest: IpUnlockRequest = {
    id: "req_ip_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    currentBoundIp: user.boundIp || "127.0.0.1",
    requestedIp: requestedIp,
    reason: reason || "Pindah perangkat / IP Server Gelanggang baru",
    emailOrPhone: emailOrPhone || user.emailOrPhone || "-",
    status: "PENDING",
    createdAt: Date.now()
  };

  db.ipUnlockRequests.unshift(newRequest);
  saveDb(db);

  logActivity(
    "IP_UNLOCK_REQUEST",
    user.username,
    `Mengajukan izin IP baru: Terkunci di [${newRequest.currentBoundIp}] -> Minta buka akses IP [${requestedIp}] (${reason || "Pindah server"})`,
    ip
  );

  return {
    success: true,
    message: `Permohonan izin buka kunci IP berhasil diajukan ke Super Admin! Setelah disetujui, akun Anda dapat login dari IP [${requestedIp}].`,
    requestId: newRequest.id,
    request: newRequest
  };
}

export function getIpUnlockRequests(): IpUnlockRequest[] {
  const db = initDb();
  return db.ipUnlockRequests || [];
}

export function approveIpUnlockRequest(
  requestId: string,
  approvedByUsername: string,
  actionType: "SET_NEW_IP" | "CLEAR_IP",
  ip: string
) {
  const db = initDb();
  if (!db.ipUnlockRequests) {
    return { success: false, error: "Data permohonan tidak ditemukan!" };
  }

  const request = db.ipUnlockRequests.find(r => r.id === requestId);
  if (!request) {
    return { success: false, error: "Permohonan izin IP tidak ditemukan!" };
  }

  const user = db.users.find(u => u.id === request.userId);
  if (!user) {
    return { success: false, error: "Akun pengguna terkait tidak ditemukan!" };
  }

  request.status = "APPROVED";
  request.approvedAt = Date.now();
  request.approvedBy = approvedByUsername;

  if (actionType === "CLEAR_IP") {
    user.boundIp = undefined; // Auto-rebind on next login
  } else {
    user.boundIp = normalizeIp(request.requestedIp);
  }

  saveDb(db);

  const actionDesc = actionType === "CLEAR_IP"
    ? `Membuka kunci IP akun ${user.username} (Bebas login, akan mengunci otomatis ke IP perangkat berikutnya)`
    : `Menyetujui izin IP akun ${user.username} dan mengunci ke IP baru [${user.boundIp}]`;

  logActivity("IP_UNLOCK_APPROVE", approvedByUsername, actionDesc, ip);

  return {
    success: true,
    message: `Permohonan izin IP untuk akun "${user.username}" berhasil disetujui! ${actionType === "CLEAR_IP" ? "Kunci IP telah di-reset (Bebas login)." : `Akun sekarang terkunci pada IP [${user.boundIp}].`}`,
    request
  };
}

export function rejectIpUnlockRequest(requestId: string, rejectedByUsername: string, ip: string) {
  const db = initDb();
  if (!db.ipUnlockRequests) {
    return { success: false, error: "Data permohonan tidak ditemukan!" };
  }

  const request = db.ipUnlockRequests.find(r => r.id === requestId);
  if (!request) {
    return { success: false, error: "Permohonan izin IP tidak ditemukan!" };
  }

  request.status = "REJECTED";
  saveDb(db);

  logActivity("IP_UNLOCK_REJECT", rejectedByUsername, `Menolak permohonan izin IP untuk ${request.username} (IP yang diminta: ${request.requestedIp})`, ip);

  return {
    success: true,
    message: `Permohonan izin IP untuk akun "${request.username}" telah ditolak.`
  };
}

export function resetUserBoundIp(userId: string, resetByUsername: string, ip: string) {
  const db = initDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: "Pengguna tidak ditemukan!" };
  }

  const oldIp = user.boundIp || "Belum Terikat";
  user.boundIp = undefined; // Cleared, so next login automatically locks to whatever IP they login from
  saveDb(db);

  logActivity("IP_LOCK_RESET", resetByUsername, `Mereset IP terikat akun ${user.username} (Sebelumnya: ${oldIp}). Akun dapat login dari IP baru.`, ip);

  return {
    success: true,
    message: `Kunci IP untuk akun "${user.username}" berhasil di-reset. Akun dapat langsung login dari perangkat/IP baru dan akan otomatis terikat ke IP tersebut.`
  };
}

export function updateUserBoundIp(userId: string, customIp: string, updatedByUsername: string, ip: string) {
  const db = initDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: "Pengguna tidak ditemukan!" };
  }

  const cleanIp = normalizeIp(customIp);
  user.boundIp = cleanIp;
  saveDb(db);

  logActivity("UPDATE", updatedByUsername, `Mengubah IP terikat akun ${user.username} menjadi [${cleanIp}]`, ip);

  return {
    success: true,
    message: `IP terikat untuk akun "${user.username}" berhasil diubah menjadi [${cleanIp}].`
  };
}

export function toggleUserIpLock(userId: string, enabled: boolean, updatedByUsername: string, ip: string) {
  const db = initDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: "Pengguna tidak ditemukan!" };
  }

  user.ipLockEnabled = enabled;
  saveDb(db);

  logActivity("UPDATE", updatedByUsername, `${enabled ? "Mengaktifkan" : "Menonaktifkan"} penguncian IP untuk akun ${user.username}`, ip);

  return {
    success: true,
    message: `Fitur penguncian IP untuk akun "${user.username}" berhasil ${enabled ? "diaktifkan" : "dinonaktifkan"}.`
  };
}

