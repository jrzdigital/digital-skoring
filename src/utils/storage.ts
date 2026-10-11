import { TrainingLog, Student, SchoolProfile, ScheduleReminder, NotificationItem, E2EESettings, QRScanRecord, UserAccount, UserRole, UserStatus } from '../types';
import {
  DEFAULT_SCHOOL_PROFILE,
  INITIAL_STUDENTS,
  INITIAL_TRAINING_LOGS,
  INITIAL_SCHEDULES,
  INITIAL_NOTIFICATIONS,
  INITIAL_USERS,
  getProfileForUser,
  getStudentsForUser,
  getLogsForUser,
} from './initialData';

const KEYS = {
  CURRENT_USER_ID: 'silat_current_user_id_v2',
  USERS_LIST: 'silat_users_list_v2',
  TRAINING_LOGS: 'silat_report_logs_v2',
  STUDENTS: 'silat_report_students_v2',
  SCHOOL_PROFILE: 'silat_report_profile_v2',
  SCHEDULES: 'silat_report_schedules_v2',
  NOTIFICATIONS: 'silat_report_notifs_v2',
  E2EE_SETTINGS: 'silat_report_e2ee_v2',
  THEME_MODE: 'silat_report_theme_v2',
  QR_SCANS: 'silat_report_qr_scans_v2',
  AUDIT_LOGS: 'silat_audit_logs_v2',
  RESET_REQUESTS: 'silat_reset_requests_v2',
  // Legacy keys for backward compatibility migration
  LEGACY_LOGS: 'silat_report_logs_v1',
  LEGACY_STUDENTS: 'silat_report_students_v1',
  LEGACY_PROFILE: 'silat_report_profile_v1',
  LEGACY_SCHEDULES: 'silat_report_schedules_v1',
  LEGACY_NOTIFS: 'silat_report_notifs_v1',
};

// -----------------------------------------------------------------
// IndexedDB Engine for high-capacity, crash-free offline storage
// -----------------------------------------------------------------
const DB_NAME = 'satria_silat_db_v2';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

function openIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB open error:', request.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB not supported or restricted:', err);
      resolve(null);
    }
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openIndexedDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(value, key);
  } catch (err) {
    console.warn(`IndexedDB save error for [${key}]:`, err);
  }
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------
// Safe LocalStorage Set with Quota Protection & Photo Compression
// -----------------------------------------------------------------
function safeLocalStorageSet(key: string, valueStr: string): void {
  try {
    localStorage.setItem(key, valueStr);
  } catch (err: unknown) {
    console.warn(`LocalStorage write quota warning for [${key}]:`, err);
    // If quota exceeded, try cleaning up old cached logs or optimize image data in localStorage
    try {
      if (key === KEYS.TRAINING_LOGS) {
        // Create a trimmed lightweight version for localStorage cache
        const logs: TrainingLog[] = JSON.parse(valueStr);
        const lightLogs = logs.map(log => ({
          ...log,
          // Keep at most 2 photos and truncate heavy strings in localStorage cache if needed
          photos: (log.photos || []).slice(0, 2).map(p => ({
            ...p,
            url: p.url.length > 500000 ? p.url.substring(0, 10000) : p.url,
          })),
        }));
        localStorage.setItem(key, JSON.stringify(lightLogs));
      }
    } catch {
      // Ignore if localStorage is entirely blocked (e.g. strict incognito)
    }
  }
}

export const StorageService = {
  // -------------------------------------------------------------
  // USER ACCOUNT & AUTHENTICATION METHODS
  // -------------------------------------------------------------
  getUsers(): UserAccount[] {
    try {
      const data = localStorage.getItem(KEYS.USERS_LIST);
      if (!data) {
        safeLocalStorageSet(KEYS.USERS_LIST, JSON.stringify(INITIAL_USERS));
        idbSet(KEYS.USERS_LIST, INITIAL_USERS);
        return INITIAL_USERS;
      }
      const parsed: UserAccount[] = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        safeLocalStorageSet(KEYS.USERS_LIST, JSON.stringify(INITIAL_USERS));
        idbSet(KEYS.USERS_LIST, INITIAL_USERS);
        return INITIAL_USERS;
      }

      // Ensure superadmin account credentials are guaranteed as jakaoktorian / Abuyaku21
      const superAdmin = parsed.find(u => u.username === 'jakaoktorian' || u.username === 'superadmin' || u.role === 'superadmin');
      if (superAdmin) {
        if (superAdmin.username !== 'jakaoktorian' || superAdmin.password !== 'Abuyaku21') {
          superAdmin.username = 'jakaoktorian';
          superAdmin.password = 'Abuyaku21';
          superAdmin.name = 'Jaka Oktorian (Super Administrator)';
          superAdmin.fullName = 'Jaka Oktorian';
          superAdmin.role = 'superadmin';
          superAdmin.status = 'APPROVED';
          safeLocalStorageSet(KEYS.USERS_LIST, JSON.stringify(parsed));
          idbSet(KEYS.USERS_LIST, parsed);
        }
      } else {
        parsed.unshift(INITIAL_USERS[0]);
        safeLocalStorageSet(KEYS.USERS_LIST, JSON.stringify(parsed));
        idbSet(KEYS.USERS_LIST, parsed);
      }

      return parsed;
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: UserAccount[]): void {
    safeLocalStorageSet(KEYS.USERS_LIST, JSON.stringify(users));
    idbSet(KEYS.USERS_LIST, users);
  },

  getUserById(id: string): UserAccount | undefined {
    const users = this.getUsers();
    return users.find(u => u.id === id);
  },

  getCurrentUserId(): string | null {
    try {
      const saved = localStorage.getItem(KEYS.CURRENT_USER_ID);
      if (saved) return saved;
      return null;
    } catch {
      return null;
    }
  },

  getLoggedInUser(): UserAccount | null {
    try {
      const currentId = this.getCurrentUserId();
      if (!currentId) return null;
      const user = this.getUserById(currentId);
      if (!user) return null;
      // Superadmin always allowed; normal users must be APPROVED
      if (user.role !== 'superadmin' && user.status && user.status !== 'APPROVED') {
        this.logout();
        return null;
      }
      return user;
    } catch {
      return null;
    }
  },

  getCurrentUser(): UserAccount {
    const logged = this.getLoggedInUser();
    if (logged) return logged;
    // Fallback for sub-components that expect a valid profile structure
    const users = this.getUsers();
    return users.find(u => u.status === 'APPROVED') || users[0] || INITIAL_USERS[0];
  },

  setCurrentUser(user: UserAccount | null): void {
    try {
      if (!user) {
        localStorage.removeItem(KEYS.CURRENT_USER_ID);
      } else {
        localStorage.setItem(KEYS.CURRENT_USER_ID, user.id);
      }
    } catch (err) {
      console.warn('Error setting current user:', err);
    }
  },

  login(identifier: string, password?: string): { 
    success: boolean; 
    user?: UserAccount; 
    error?: string; 
    isPending?: boolean;
    isRejected?: boolean;
    isSuspended?: boolean;
  } {
    const cleanId = (identifier || '').trim().toLowerCase();
    if (!cleanId) {
      return { success: false, error: 'Username atau email wajib diisi.' };
    }
    const users = this.getUsers();
    const user = users.find(
      u => u.username.toLowerCase() === cleanId || (u.email && u.email.toLowerCase() === cleanId)
    );

    if (!user) {
      return {
        success: false,
        error: `Akun "${identifier}" tidak ditemukan dalam sistem. Silakan periksa kembali atau lakukan pendaftaran baru.`,
      };
    }

    if (user.password && password && user.password !== password) {
      return { success: false, error: 'Kata sandi tidak sesuai. Silakan coba lagi.' };
    }

    // Role check & status check
    if (user.role !== 'superadmin') {
      const status = user.status || 'APPROVED';
      if (status === 'PENDING') {
        this.logActivity('LOGIN_ATTEMPT_PENDING', user.username, 'Mencoba login saat akun masih berstatus PENDING verifikasi.');
        return {
          success: false,
          isPending: true,
          error: 'Akun Anda sedang menunggu verifikasi dan persetujuan (ACC) dari Superadmin. Silakan hubungi Superadmin atau tunggu proses verifikasi selesai.',
        };
      }
      if (status === 'REJECTED') {
        return {
          success: false,
          isRejected: true,
          error: 'Pendaftaran akun Anda telah ditolak oleh Superadmin. Hubungi pengurus pusat untuk informasi lebih lanjut.',
        };
      }
      if (status === 'SUSPENDED') {
        return {
          success: false,
          isSuspended: true,
          error: 'Akun Anda sedang dinonaktifkan / ditangguhkan sementara oleh Superadmin.',
        };
      }
    }

    this.setCurrentUser(user);
    this.logActivity('LOGIN_SUCCESS', user.username, `Berhasil masuk ke dalam sistem sebagai [${user.role.toUpperCase()}].`);
    return { success: true, user };
  },

  register(data: {
    username: string;
    password?: string;
    name: string;
    email: string;
    phone?: string;
    trainingLocation: string;
    extracurricularName: string;
    organizationBranch?: string;
    city?: string;
    role?: UserRole;
  }): { success: boolean; user?: UserAccount; error?: string; isPending?: boolean; message?: string } {
    const cleanUsername = (data.username || '').trim().toLowerCase();
    const cleanEmail = (data.email || '').trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username minimal 3 karakter tanpa spasi.' };
    }
    if (!data.name || data.name.trim().length < 2) {
      return { success: false, error: 'Nama lengkap penanggung jawab / pelatih wajib diisi.' };
    }
    if (!data.trainingLocation || data.trainingLocation.trim().length < 2) {
      return { success: false, error: 'Nama tempat latihan / sekolah / perguruan wajib diisi.' };
    }

    const users = this.getUsers();
    const existing = users.find(
      u => u.username.toLowerCase() === cleanUsername || (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
    );
    if (existing) {
      return { success: false, error: `Username "${cleanUsername}" atau email sudah terdaftar dalam sistem.` };
    }

    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isSuper = data.role === 'superadmin';
    const newUser: UserAccount = {
      id: newId,
      username: cleanUsername,
      password: data.password || 'password123',
      name: data.name.trim(),
      fullName: data.name.trim(),
      email: cleanEmail || `${cleanUsername}@silat.id`,
      phone: data.phone || '',
      role: data.role || 'pelatih',
      status: isSuper ? 'APPROVED' : 'PENDING',
      trainingLocation: data.trainingLocation.trim(),
      extracurricularName: data.extracurricularName?.trim() || 'Ekstrakurikuler Pencak Silat',
      organizationBranch: data.organizationBranch?.trim() || 'Ikatan Pencak Silat Indonesia (IPSI)',
      city: data.city?.trim() || 'Jakarta',
      createdAt: new Date().toISOString(),
      ...(isSuper ? { approvedAt: new Date().toISOString(), approvedBy: 'System Root' } : {})
    };

    const updatedUsers = [...users, newUser];
    this.saveUsers(updatedUsers);

    // Bootstrap isolated records for this newly registered place of training
    const userProfile = getProfileForUser(newUser);
    const userStudents = getStudentsForUser(newUser);
    const userLogs = getLogsForUser(newUser, userStudents);

    this.saveSchoolProfile(userProfile, newId);
    this.saveStudents(userStudents, newId);
    this.saveTrainingLogs(userLogs, newId);
    this.saveSchedules(INITIAL_SCHEDULES, newId);
    this.saveNotifications(INITIAL_NOTIFICATIONS, newId);

    this.logActivity(
      'REGISTER_NEW_ACCOUNT', 
      newUser.username, 
      `Mendaftar akun baru atas nama '${newUser.name}' (${newUser.role.toUpperCase()}). Status: PENDING verifikasi Superadmin.`
    );

    // Also sync to backend API in background if server is active
    try {
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          name: newUser.name,
          role: newUser.role,
          phone: newUser.phone,
          email: newUser.email,
          actorName: 'Pendaftaran Mandiri'
        })
      }).catch(() => {});
    } catch {}

    // DO NOT automatically login when pending
    return { 
      success: true, 
      user: newUser, 
      isPending: !isSuper,
      message: isSuper 
        ? 'Pendaftaran Superadmin berhasil! Silakan masuk ke dalam sistem.'
        : 'Pendaftaran berhasil diajukan! Akun Anda berstatus PENDING dan harus diverifikasi serta disetujui (ACC) oleh Superadmin sebelum dapat digunakan.'
    };
  },

  updateCurrentUserProfile(updates: Partial<UserAccount>): UserAccount {
    const current = this.getCurrentUser();
    const updated: UserAccount = { ...current, ...updates };
    const users = this.getUsers().map(u => (u.id === current.id ? updated : u));
    this.saveUsers(users);
    return updated;
  },

  logout(): void {
    try {
      const cur = this.getCurrentUserId();
      if (cur) {
        const u = this.getUserById(cur);
        if (u) {
          this.logActivity('LOGOUT', u.username, 'Pengguna keluar dari aplikasi.');
        }
      }
      localStorage.removeItem(KEYS.CURRENT_USER_ID);
    } catch {
      // ignore
    }
  },

  // -------------------------------------------------------------
  // SUPERADMIN MANAGEMENT METHODS
  // -------------------------------------------------------------
  approveUser(userId: string, approvedBy?: string): { success: boolean; user?: UserAccount; error?: string } {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }

    const now = new Date().toISOString();
    user.status = 'APPROVED';
    user.approvedAt = now;
    user.approvedBy = approvedBy || 'Super Administrator';

    this.saveUsers(users);
    this.logActivity('USER_APPROVED', user.username, `Akun disetujui (ACC) oleh ${user.approvedBy}.`);

    // Sync to backend API
    try {
      fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approvedBy: user.approvedBy })
      }).catch(() => {});
    } catch {}

    return { success: true, user };
  },

  rejectUser(userId: string, rejectedBy?: string): { success: boolean; user?: UserAccount; error?: string } {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }

    user.status = 'REJECTED';
    this.saveUsers(users);
    this.logActivity('USER_REJECTED', user.username, `Pendaftaran akun ditolak oleh ${rejectedBy || 'Super Administrator'}.`);

    try {
      fetch('/api/users/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rejectedBy: rejectedBy || 'Super Administrator' })
      }).catch(() => {});
    } catch {}

    return { success: true, user };
  },

  toggleUserStatus(userId: string, actorName?: string): { success: boolean; user?: UserAccount; error?: string } {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }

    const prevStatus = user.status || 'APPROVED';
    user.status = prevStatus === 'APPROVED' ? 'SUSPENDED' : 'APPROVED';
    this.saveUsers(users);

    this.logActivity(
      'USER_STATUS_TOGGLED', 
      user.username, 
      `Status diubah dari ${prevStatus} menjadi ${user.status} oleh ${actorName || 'Super Administrator'}.`
    );

    return { success: true, user };
  },

  deleteUser(userId: string, actorName?: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }
    if (target.role === 'superadmin') {
      return { success: false, error: 'Akun Superadmin tidak dapat dihapus.' };
    }

    const filtered = users.filter(u => u.id !== userId);
    this.saveUsers(filtered);
    this.logActivity('USER_DELETED', target.username, `Akun '${target.username}' (${target.name}) dihapus oleh ${actorName || 'Super Administrator'}.`);

    try {
      fetch(`/api/users/${userId}?actorName=${encodeURIComponent(actorName || 'Super Administrator')}`, {
        method: 'DELETE'
      }).catch(() => {});
    } catch {}

    return { success: true };
  },

  resetUserPassword(userId: string, newPass: string, actorName?: string): { success: boolean; error?: string } {
    const users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }

    target.password = newPass;
    this.saveUsers(users);
    this.logActivity('PASSWORD_RESET', target.username, `Kata sandi diatur ulang oleh ${actorName || 'Super Administrator'}.`);

    try {
      fetch(`/api/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPass, actorName: actorName || 'Super Administrator' })
      }).catch(() => {});
    } catch {}

    return { success: true };
  },

  updateUserProfile(userId: string, updates: { 
    name?: string; 
    fullName?: string; 
    avatar?: string;
    trainingLocation?: string;
    organizationBranch?: string;
    city?: string;
    phone?: string;
    email?: string;
  }): { success: boolean; user?: UserAccount; error?: string } {
    const users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) {
      return { success: false, error: 'Pengguna tidak ditemukan.' };
    }

    if (updates.name !== undefined && updates.name.trim()) {
      target.name = updates.name.trim();
      target.fullName = updates.name.trim();
    }
    if (updates.fullName !== undefined && updates.fullName.trim()) {
      target.fullName = updates.fullName.trim();
      target.name = updates.fullName.trim();
    }
    if (updates.avatar !== undefined) {
      target.avatar = updates.avatar;
      target.avatarUrl = updates.avatar;
    }
    if (updates.trainingLocation !== undefined) {
      target.trainingLocation = updates.trainingLocation.trim();
    }
    if (updates.organizationBranch !== undefined) {
      target.organizationBranch = updates.organizationBranch.trim();
    }
    if (updates.city !== undefined) {
      target.city = updates.city.trim();
    }
    if (updates.phone !== undefined) {
      target.phone = updates.phone.trim();
    }
    if (updates.email !== undefined) {
      target.email = updates.email.trim();
    }

    this.saveUsers(users);

    // If active user is being updated, ensure schoolProfile is synchronized
    try {
      const activeUser = this.getLoggedInUser();
      if (activeUser && activeUser.id === userId) {
        this.setCurrentUser(target);
        const profile = this.getSchoolProfile(userId);
        if (profile) {
          if (updates.name) profile.coachName = target.name || profile.coachName;
          if (updates.trainingLocation) profile.schoolName = target.trainingLocation || profile.schoolName;
          if (updates.organizationBranch) profile.organizationBranch = target.organizationBranch || profile.organizationBranch;
          if (updates.city) profile.city = target.city || profile.city;
          if (updates.phone) profile.phone = target.phone || profile.phone;
          if (updates.email) profile.email = target.email || profile.email;
          this.saveSchoolProfile(profile, userId);
        }
      }
    } catch {}

    // Background sync to server API
    try {
      fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: target.username,
          name: target.name,
          fullName: target.fullName,
          avatarUrl: target.avatar,
          avatar: target.avatar,
          trainingLocation: target.trainingLocation,
          organizationBranch: target.organizationBranch,
          city: target.city,
          phone: target.phone,
          email: target.email,
        })
      }).catch(() => {});
    } catch {}

    this.logActivity('PROFILE_UPDATED', target.username, `Identitas akun diperbarui: nama="${target.name}", lokasi="${target.trainingLocation || '-'}".`);

    return { success: true, user: target };
  },

  createUserDirect(data: Partial<UserAccount>, actorName?: string): { success: boolean; user?: UserAccount; error?: string } {
    const cleanUsername = (data.username || '').trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username minimal 3 karakter.' };
    }
    const users = this.getUsers();
    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: `Username "${cleanUsername}" sudah digunakan.` };
    }

    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newUser: UserAccount = {
      id: newId,
      username: cleanUsername,
      password: data.password || 'password123',
      name: (data.name || data.fullName || cleanUsername).trim(),
      fullName: (data.fullName || data.name || cleanUsername).trim(),
      email: data.email?.trim() || `${cleanUsername}@silat.id`,
      phone: data.phone?.trim() || '',
      role: data.role || 'pelatih',
      status: 'APPROVED',
      trainingLocation: data.trainingLocation?.trim() || 'PADEPOKAN SILAT INDONESIA',
      extracurricularName: data.extracurricularName?.trim() || 'Ekstrakurikuler Pencak Silat',
      organizationBranch: data.organizationBranch?.trim() || 'IPSI',
      city: data.city?.trim() || 'Jakarta',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: actorName || 'Super Administrator',
    };

    const updated = [...users, newUser];
    this.saveUsers(updated);
    this.logActivity('USER_CREATED_DIRECT', newUser.username, `Dibuat langsung dengan status APPROVED oleh ${actorName || 'Super Administrator'}.`);

    return { success: true, user: newUser };
  },

  // -------------------------------------------------------------
  // AUDIT LOGS & SYSTEM ACTIVITIES
  // -------------------------------------------------------------
  getActivityLogs(): Array<{ id: string; timestamp: string; action: string; actor: string; details: string }> {
    try {
      const raw = localStorage.getItem(KEYS.AUDIT_LOGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}

    const initialLogs = [
      {
        id: 'log-init-1',
        timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        action: 'SYSTEM_BOOT',
        actor: 'System Root',
        details: 'Sistem Pencak Silat & Panel Otentikasi Terpadu diinisialisasi.'
      },
      {
        id: 'log-init-2',
        timestamp: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        action: 'USER_REGISTER',
        actor: 'fauzi_pelatih',
        details: 'Mendaftar akun baru atas nama Ahmad Fauzi, S.Pd. Menunggu verifikasi Superadmin.'
      }
    ];
    safeLocalStorageSet(KEYS.AUDIT_LOGS, JSON.stringify(initialLogs));
    return initialLogs;
  },

  logActivity(action: string, actor: string, details: string): void {
    try {
      const logs = this.getActivityLogs();
      const newLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        action,
        actor: actor || 'Sistem',
        details
      };
      const updated = [newLog, ...logs].slice(0, 200); // Keep latest 200 logs
      safeLocalStorageSet(KEYS.AUDIT_LOGS, JSON.stringify(updated));
    } catch (err) {
      console.warn('Gagal mencatat log aktivitas:', err);
    }
  },

  // -------------------------------------------------------------
  // PASSWORD RESET REQUESTS
  // -------------------------------------------------------------
  getPasswordResetRequests(): any[] {
    try {
      const raw = localStorage.getItem(KEYS.RESET_REQUESTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  },

  requestPasswordReset(username: string, contactInfo: string): { success: boolean; message: string } {
    const users = this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) {
      return { success: false, message: 'Username tidak ditemukan.' };
    }

    const requests = this.getPasswordResetRequests();
    const newReq = {
      id: `rst_${Date.now()}`,
      userId: user.id,
      username: user.username,
      fullName: user.name,
      organization: user.trainingLocation || user.organization || 'IPSI',
      emailOrPhone: contactInfo || user.phone || user.email,
      status: 'PENDING',
      createdAt: Date.now(),
    };

    requests.unshift(newReq);
    safeLocalStorageSet(KEYS.RESET_REQUESTS, JSON.stringify(requests));
    this.logActivity('PASSWORD_RESET_REQUESTED', user.username, `Mengajukan permintaan reset sandi kontak: ${contactInfo}`);
    return { success: true, message: 'Permintaan reset sandi telah dikirimkan ke Superadmin untuk diverifikasi.' };
  },

  // -------------------------------------------------------------
  // SCOPED STORAGE HELPER
  // -------------------------------------------------------------
  getUserKey(baseKey: string, targetUserId?: string): string {
    const uid = targetUserId || this.getCurrentUserId();
    return `${baseKey}_${uid}`;
  },

  // Asynchronously initialize IndexedDB data sync in background
  async initAsyncSync(onDataLoaded?: (data: { logs?: TrainingLog[]; students?: Student[] }) => void): Promise<void> {
    try {
      const uid = this.getCurrentUserId();
      const logsKey = this.getUserKey(KEYS.TRAINING_LOGS, uid);
      const studentsKey = this.getUserKey(KEYS.STUDENTS, uid);
      const profileKey = this.getUserKey(KEYS.SCHOOL_PROFILE, uid);

      const [idbLogs, idbStudents] = await Promise.all([
        idbGet<TrainingLog[]>(logsKey),
        idbGet<Student[]>(studentsKey),
      ]);

      const localLogs = this.getTrainingLogs(uid);
      const localStudents = this.getStudents(uid);

      if (idbLogs && Array.isArray(idbLogs) && idbLogs.length >= localLogs.length) {
        this.saveTrainingLogs(idbLogs, uid);
        if (onDataLoaded) {
          onDataLoaded({ logs: idbLogs, students: idbStudents || undefined });
        }
      } else {
        await idbSet(logsKey, localLogs);
        await idbSet(studentsKey, localStudents);
        await idbSet(profileKey, this.getSchoolProfile(uid));
      }
    } catch (err) {
      console.warn('Storage async sync warning:', err);
    }
  },

  getTrainingLogs(targetUserId?: string): TrainingLog[] {
    const uid = targetUserId || this.getCurrentUserId();
    const key = this.getUserKey(KEYS.TRAINING_LOGS, uid);
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        // Migration fallback: check legacy key if user is primary default user
        if (uid === 'usr_satria_smk1') {
          const legacy = localStorage.getItem(KEYS.LEGACY_LOGS);
          if (legacy) {
            safeLocalStorageSet(key, legacy);
            try {
              const parsed = JSON.parse(legacy);
              idbSet(key, parsed);
              return parsed;
            } catch {
              // ignore
            }
          }
        }
        const user = this.getUserById(uid) || INITIAL_USERS[0];
        const students = this.getStudents(uid);
        const initial = getLogsForUser(user, students);
        safeLocalStorageSet(key, JSON.stringify(initial));
        idbSet(key, initial);
        return initial;
      }
      const parsed: TrainingLog[] = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];

      // Auto-normalize long format like 001/PS-SMK1/VIII/2026 to clean sequential 01, 02, etc.
      let needsSave = false;
      const normalized = parsed.map((log, idx) => {
        if (log.number && log.number.includes('/PS-SM')) {
          needsSave = true;
          return { ...log, number: String(idx + 1).padStart(2, '0') };
        }
        return log;
      });
      if (needsSave) {
        safeLocalStorageSet(key, JSON.stringify(normalized));
        idbSet(key, normalized);
      }
      return normalized;
    } catch {
      return [];
    }
  },

  saveTrainingLogs(logs: TrainingLog[], targetUserId?: string): void {
    const uid = targetUserId || this.getCurrentUserId();
    const key = this.getUserKey(KEYS.TRAINING_LOGS, uid);
    try {
      const json = JSON.stringify(logs);
      safeLocalStorageSet(key, json);
    } catch (err) {
      console.warn('Error serializing training logs:', err);
    }
    idbSet(key, logs);
  },

  getStudents(targetUserId?: string): Student[] {
    const uid = targetUserId || this.getCurrentUserId();
    const key = this.getUserKey(KEYS.STUDENTS, uid);
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        if (uid === 'usr_satria_smk1') {
          const legacy = localStorage.getItem(KEYS.LEGACY_STUDENTS);
          if (legacy) {
            safeLocalStorageSet(key, legacy);
            try {
              const parsed = JSON.parse(legacy);
              idbSet(key, parsed);
              return parsed;
            } catch {
              // ignore
            }
          }
        }
        const user = this.getUserById(uid) || INITIAL_USERS[0];
        const initial = getStudentsForUser(user);
        safeLocalStorageSet(key, JSON.stringify(initial));
        idbSet(key, initial);
        return initial;
      }
      const parsed: Student[] = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];

      const validBelts: Student['beltLevel'][] = ['Putih / Dasar', 'Hijau', 'Biru', 'Merah / Pelatih'];
      let needsUpdate = false;
      const normalized = parsed.map(s => {
        if (!validBelts.includes(s.beltLevel)) {
          needsUpdate = true;
          const lower = (s.beltLevel || '').toLowerCase();
          if (lower.includes('hijau')) return { ...s, beltLevel: 'Hijau' as const };
          if (lower.includes('biru')) return { ...s, beltLevel: 'Biru' as const };
          if (lower.includes('merah') || lower.includes('pelatih') || lower.includes('hitam') || lower.includes('pendekar')) return { ...s, beltLevel: 'Merah / Pelatih' as const };
          return { ...s, beltLevel: 'Putih / Dasar' as const };
        }
        return s;
      });
      if (needsUpdate) {
        safeLocalStorageSet(key, JSON.stringify(normalized));
        idbSet(key, normalized);
      }
      return normalized;
    } catch {
      return [];
    }
  },

  saveStudents(students: Student[], targetUserId?: string): void {
    const uid = targetUserId || this.getCurrentUserId();
    const key = this.getUserKey(KEYS.STUDENTS, uid);
    try {
      safeLocalStorageSet(key, JSON.stringify(students));
    } catch (err) {
      console.warn('Error saving students:', err);
    }
    idbSet(key, students);
  },

  getSchoolProfile(targetUserId?: string): SchoolProfile {
    const uid = targetUserId || this.getCurrentUserId();
    const key = this.getUserKey(KEYS.SCHOOL_PROFILE, uid);
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        if (uid === 'usr_satria_smk1') {
          const legacy = localStorage.getItem(KEYS.LEGACY_PROFILE);
          if (legacy) {
            safeLocalStorageSet(key, legacy);
            try {
              const parsed = JSON.parse(legacy);
              idbSet(key, parsed);
              return parsed;
            } catch {
              // ignore
            }
          }
        }
        const user = this.getUserById(uid) || INITIAL_USERS[0];
        const initial = getProfileForUser(user);
        safeLocalStorageSet(key, JSON.stringify(initial));
        idbSet(key, initial);
        return initial;
      }
      return JSON.parse(data);
    } catch {
      const user = this.getUserById(uid) || INITIAL_USERS[0];
      return getProfileForUser(user);
    }
  },

  saveSchoolProfile(profile: SchoolProfile, targetUserId?: string): void {
    const uid = targetUserId || this.getCurrentUserId();
    const key = this.getUserKey(KEYS.SCHOOL_PROFILE, uid);
    try {
      safeLocalStorageSet(key, JSON.stringify(profile));
    } catch (err) {
      console.warn('Error saving school profile:', err);
    }
    idbSet(key, profile);
  },

  getSchedules(targetUserId?: string): ScheduleReminder[] {
    const uid = targetUserId || this.getCurrentUserId();
    const key = this.getUserKey(KEYS.SCHEDULES, uid);
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        if (uid === 'usr_satria_smk1') {
          const legacy = localStorage.getItem(KEYS.LEGACY_SCHEDULES);
          if (legacy) {
            safeLocalStorageSet(key, legacy);
            return JSON.parse(legacy);
          }
        }
        safeLocalStorageSet(key, JSON.stringify(INITIAL_SCHEDULES));
        idbSet(key, INITIAL_SCHEDULES);
        return INITIAL_SCHEDULES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_SCHEDULES;
    }
  },

  saveSchedules(schedules: ScheduleReminder[], targetUserId?: string): void {
    const uid = targetUserId || this.getCurrentUserId();
    const key = this.getUserKey(KEYS.SCHEDULES, uid);
    try {
      safeLocalStorageSet(key, JSON.stringify(schedules));
    } catch (err) {
      console.warn('Error saving schedules:', err);
    }
    idbSet(key, schedules);
  },

  getNotifications(targetUserId?: string): NotificationItem[] {
    const uid = targetUserId || this.getCurrentUserId();
    const key = this.getUserKey(KEYS.NOTIFICATIONS, uid);
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        if (uid === 'usr_satria_smk1') {
          const legacy = localStorage.getItem(KEYS.LEGACY_NOTIFS);
          if (legacy) {
            safeLocalStorageSet(key, legacy);
            return JSON.parse(legacy);
          }
        }
        safeLocalStorageSet(key, JSON.stringify(INITIAL_NOTIFICATIONS));
        idbSet(key, INITIAL_NOTIFICATIONS);
        return INITIAL_NOTIFICATIONS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  saveNotifications(notifs: NotificationItem[], targetUserId?: string): void {
    const uid = targetUserId || this.getCurrentUserId();
    const key = this.getUserKey(KEYS.NOTIFICATIONS, uid);
    try {
      safeLocalStorageSet(key, JSON.stringify(notifs));
    } catch (err) {
      console.warn('Error saving notifications:', err);
    }
    idbSet(key, notifs);
  },

  getE2EESettings(targetUserId?: string): E2EESettings {
    const key = this.getUserKey(KEYS.E2EE_SETTINGS, targetUserId);
    try {
      const data = localStorage.getItem(key) || localStorage.getItem(KEYS.E2EE_SETTINGS);
      if (!data) {
        return { isEncryptionEnabled: false, isUnlocked: true };
      }
      return JSON.parse(data);
    } catch {
      return { isEncryptionEnabled: false, isUnlocked: true };
    }
  },

  saveE2EESettings(settings: E2EESettings, targetUserId?: string): void {
    const key = this.getUserKey(KEYS.E2EE_SETTINGS, targetUserId);
    try {
      safeLocalStorageSet(key, JSON.stringify(settings));
    } catch (err) {
      console.warn('Error saving E2EE:', err);
    }
    idbSet(key, settings);
  },

  getTheme(): 'dark' | 'light' {
    try {
      const saved = localStorage.getItem(KEYS.THEME_MODE);
      if (saved === 'light') return 'light';
      return 'dark'; // Default dark theme
    } catch {
      return 'dark';
    }
  },

  saveTheme(theme: 'dark' | 'light'): void {
    try {
      safeLocalStorageSet(KEYS.THEME_MODE, theme);
    } catch (err) {
      console.warn('Error saving theme:', err);
    }
  },

  getQRScans(targetUserId?: string): QRScanRecord[] {
    const uid = targetUserId || this.getCurrentUserId();
    const key = this.getUserKey(KEYS.QR_SCANS, uid);
    try {
      const data = localStorage.getItem(key);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveQRScans(scans: QRScanRecord[], targetUserId?: string): void {
    const uid = targetUserId || this.getCurrentUserId();
    const key = this.getUserKey(KEYS.QR_SCANS, uid);
    try {
      safeLocalStorageSet(key, JSON.stringify(scans));
    } catch (err) {
      console.warn('Error saving scans:', err);
    }
    idbSet(key, scans);
  },

  isStudentScannedOnDate(studentId: string, dateFormatted?: string): boolean {
    const targetDate = dateFormatted || new Date().toISOString().split('T')[0];
    const scans = this.getQRScans();
    return scans.some(s => s.studentId === studentId && s.dateFormatted === targetDate);
  },

  getScanForStudentOnDate(studentId: string, dateFormatted?: string): QRScanRecord | undefined {
    const targetDate = dateFormatted || new Date().toISOString().split('T')[0];
    const scans = this.getQRScans();
    return scans.find(s => s.studentId === studentId && s.dateFormatted === targetDate);
  },

  addQRScan(scan: QRScanRecord): QRScanRecord[] {
    const current = this.getQRScans();
    const filtered = current.filter(
      s => !(s.studentId === scan.studentId && s.dateFormatted === scan.dateFormatted)
    );
    const updated = [scan, ...filtered];
    this.saveQRScans(updated);
    return updated;
  },

  getTodayQRScans(): QRScanRecord[] {
    const today = new Date().toISOString().split('T')[0];
    const all = this.getQRScans();
    return all.filter(s => s.dateFormatted === today);
  },

  getScansForDate(dateFormatted: string): QRScanRecord[] {
    const all = this.getQRScans();
    return all.filter(s => s.dateFormatted === dateFormatted);
  },

  getAllDataJSON(): string {
    const user = this.getCurrentUser();
    const profile = this.getSchoolProfile();
    const payload = {
      appName: 'SilatReport Pro - Multi-User Edition',
      version: '2.5',
      exportedAt: new Date().toISOString(),
      userAccount: {
        id: user.id,
        username: user.username,
        name: user.name,
        trainingLocation: user.trainingLocation,
        extracurricularName: user.extracurricularName,
      },
      metadata: {
        totalStudents: this.getStudents().length,
        totalTrainingLogs: this.getTrainingLogs().length,
        totalQRScans: this.getQRScans().length,
        schoolName: profile.schoolName,
      },
      profile: profile,
      students: this.getStudents(),
      logs: this.getTrainingLogs(),
      qrScans: this.getQRScans(),
      schedules: this.getSchedules(),
      notifications: this.getNotifications(),
      e2eeSettings: this.getE2EESettings(),
      theme: this.getTheme(),
    };
    return JSON.stringify(payload, null, 2);
  },

  downloadDatabaseJSON(): void {
    const jsonStr = this.getAllDataJSON();
    const profile = this.getSchoolProfile();
    const user = this.getCurrentUser();
    const cleanSchoolName = (user.trainingLocation || profile.schoolName || 'Silat')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `SatriaApp_Backup_${user.username}_${cleanSchoolName}_${dateStr}.json`;

    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  restoreAllDataJSON(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      const uid = this.getCurrentUserId();
      if (parsed.profile) this.saveSchoolProfile(parsed.profile, uid);
      if (parsed.students && Array.isArray(parsed.students)) this.saveStudents(parsed.students, uid);
      if (parsed.logs && Array.isArray(parsed.logs)) this.saveTrainingLogs(parsed.logs, uid);
      if (parsed.qrScans && Array.isArray(parsed.qrScans)) this.saveQRScans(parsed.qrScans, uid);
      if (parsed.schedules && Array.isArray(parsed.schedules)) this.saveSchedules(parsed.schedules, uid);
      if (parsed.notifications && Array.isArray(parsed.notifications)) this.saveNotifications(parsed.notifications, uid);
      if (parsed.e2eeSettings) this.saveE2EESettings(parsed.e2eeSettings);
      if (parsed.theme) this.saveTheme(parsed.theme);
      return true;
    } catch (e) {
      console.error('Failed to restore data:', e);
      return false;
    }
  },

  resetCurrentVenueToDefault(): void {
    const user = this.getCurrentUser();
    const uid = user.id;
    const profile = getProfileForUser(user);
    const students = getStudentsForUser(user);
    const logs = getLogsForUser(user, students);

    this.saveSchoolProfile(profile, uid);
    this.saveStudents(students, uid);
    this.saveTrainingLogs(logs, uid);
    this.saveSchedules(INITIAL_SCHEDULES, uid);
    this.saveNotifications(INITIAL_NOTIFICATIONS, uid);
    this.saveQRScans([], uid);
  },

  resetToDefault(): void {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    this.saveUsers(INITIAL_USERS);
    this.setCurrentUser(INITIAL_USERS[0]);
    this.resetCurrentVenueToDefault();
    this.saveTheme('dark');
  }
};
