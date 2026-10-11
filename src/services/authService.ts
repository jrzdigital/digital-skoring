/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authentication Service (Firebase Realtime Database + Local Hybrid)
 */

import { signInWithPopup } from "firebase/auth";
import { UserAccount, UserRole, UserStatus } from "../types";
import {
  db,
  auth,
  googleProvider,
  ref,
  get,
  set,
  saveUserToFirebase,
  updateUserInFirebase
} from "./firebase";

export const DEFAULT_USERS: UserAccount[] = [
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
    ipLockEnabled: false
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
    ipLockEnabled: false
  },
  {
    id: "usr_umum",
    username: "umum",
    password: "umum123",
    fullName: "Pengunjung / Penonton",
    role: "umum",
    status: "APPROVED",
    organization: "Masyarakat Umum Silat",
    emailOrPhone: "umum@ipsi.id",
    createdAt: 1700000000000,
    approvedAt: 1700000000000,
    approvedBy: "System Root",
    boundIp: undefined,
    ipLockEnabled: false
  }
];

function getLocalCachedUsers(): UserAccount[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = window.localStorage.getItem("ipsi_registered_users");
    if (!raw) {
      window.localStorage.setItem("ipsi_registered_users", JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    const combined = [...DEFAULT_USERS];
    if (Array.isArray(parsed)) {
      parsed.forEach((p) => {
        if (!combined.some((c) => c.username && c.username.toLowerCase() === p.username?.toLowerCase())) {
          combined.push(p);
        }
      });
    }
    return combined;
  } catch {
    return DEFAULT_USERS;
  }
}

function saveLocalCachedUsers(users: UserAccount[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("ipsi_registered_users", JSON.stringify(users));
  } catch {}
}

export const authService = {
  /**
   * Login with username and password
   */
  async login(
    username: string,
    password?: string
  ): Promise<{
    success: boolean;
    user?: UserAccount;
    error?: string;
    ipMismatch?: boolean;
    serverIp?: string;
    boundIp?: string;
    currentIp?: string;
    username?: string;
    userId?: string;
    fullName?: string;
  }> {
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = (password || "").trim();

    // 1. Check DEFAULT_USERS
    const defaultMatch = DEFAULT_USERS.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.password === cleanPassword
    );
    if (defaultMatch) {
      const { password: _, ...safeUser } = defaultMatch;
      return { success: true, user: safeUser as UserAccount };
    }

    // 2. Check Firebase Realtime Database & Local Cached Users via getAllUsers()
    const allUsers = await this.getAllUsers();
    const rtdbMatch = allUsers.find((u) => u.username && u.username.toLowerCase() === cleanUsername);
    if (rtdbMatch && rtdbMatch.password === cleanPassword) {
      if (rtdbMatch.status === "REJECTED" || rtdbMatch.status === "SUSPENDED") {
        return { success: false, error: "Akun Anda dinonaktifkan atau ditolak oleh Super Admin." };
      }
      if (rtdbMatch.status !== "APPROVED" && rtdbMatch.role !== "superadmin") {
        return { success: false, error: "Akun Anda masih menunggu persetujuan dari Super Admin." };
      }
      const { password: _, ...safeUser } = rtdbMatch;
      return { success: true, user: safeUser as UserAccount };
    }

    // 3. Try backend API
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
        signal: controller.signal
      });
      clearTimeout(timer);

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.success && data.user) {
          return data;
        }
        if (data.ipMismatch) {
          return data;
        }
        if (!data.success && data.error && !data.error.includes("tidak ditemukan")) {
          return data;
        }
      }
    } catch {
      // Fall back to local users cache
    }

    if (rtdbMatch && rtdbMatch.password !== cleanPassword) {
      return { success: false, error: "Kata sandi salah! Pastikan huruf besar/kecil sesuai." };
    }

    return {
      success: false,
      error: `Username "${username}" tidak ditemukan. Silakan hubungi Super Admin untuk membuat akun.`
    };
  },

  /**
   * Register a new user account
   */
  async register(params: {
    fullName: string;
    username: string;
    password?: string;
    organization?: string;
    emailOrPhone?: string;
    tier?: "LIMITED" | "FULL";
    accessTier?: "LIMITED" | "FULL";
    role?: UserRole;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string; message?: string }> {
    try {
      const cleanUsername = params.username.trim().toLowerCase();
      if (!cleanUsername) {
        return { success: false, error: "Username wajib diisi!" };
      }

      // Check for duplicates
      const allUsers = await this.getAllUsers();
      if (allUsers.some((u) => u.username?.toLowerCase() === cleanUsername)) {
        return {
          success: false,
          error: `Username "${params.username}" sudah terdaftar. Gunakan username lain.`
        };
      }

      const tier = params.accessTier || params.tier || "FULL";
      const defaultRole: UserRole = tier === "FULL" ? "admin" : "umum";
      const assignedRole: UserRole = params.role || defaultRole;

      const newUserId = "usr_" + Date.now();
      const newUser: UserAccount = {
        id: newUserId,
        username: cleanUsername,
        password: params.password?.trim() || "silat123",
        fullName: params.fullName.trim() || params.username,
        role: assignedRole,
        accessTier: tier,
        status: "APPROVED",
        organization: params.organization || "Panitia Pertandingan IPSI",
        emailOrPhone: params.emailOrPhone || "-",
        createdAt: Date.now(),
        approvedAt: Date.now(),
        approvedBy: "Cloud Auto-Approval",
        ipLockEnabled: false
      };

      const list = getLocalCachedUsers();
      list.push(newUser);
      saveLocalCachedUsers(list);
      await saveUserToFirebase(newUser);

      return {
        success: true,
        user: newUser,
        message: "Pendaftaran berhasil! Akun Anda telah aktif dan dapat langsung digunakan untuk masuk."
      };
    } catch (err: any) {
      return { success: false, error: err?.message || "Gagal mendaftarkan akun baru." };
    }
  },

  /**
   * Get active logged-in user from localStorage
   */
  getCurrentUser(): UserAccount | null {
    if (typeof window === "undefined") return null;
    try {
      const saved = window.localStorage.getItem("ipsi_auth_user");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  },

  /**
   * Save active user session to localStorage
   */
  setCurrentUser(user: UserAccount | null) {
    if (typeof window === "undefined") return;
    try {
      if (user) {
        window.localStorage.setItem("ipsi_auth_user", JSON.stringify(user));
        window.dispatchEvent(new Event("ipsi_auth_user_changed"));
      } else {
        this.logout();
      }
    } catch {}
  },

  /**
   * Logout current user
   */
  logout() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem("ipsi_auth_user");
      window.dispatchEvent(new Event("ipsi_auth_user_changed"));
    } catch {}
  },

  /**
   * Create a new member user
   */
  async createMember(params: {
    fullName: string;
    username: string;
    password: string;
    role: UserRole;
    status: UserStatus;
    organization?: string;
    emailOrPhone?: string;
    createdBy?: string;
  }): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const cleanUsername = params.username.trim().toLowerCase();
    const existing = (await this.getAllUsers()).find((u) => u.username?.toLowerCase() === cleanUsername);
    if (existing) {
      return { success: false, error: "Username sudah digunakan!" };
    }

    const newUserId = "usr_" + Date.now();
    const newUser: UserAccount = {
      id: newUserId,
      username: cleanUsername,
      password: params.password.trim(),
      fullName: params.fullName.trim(),
      role: params.role,
      status: params.status,
      organization: params.organization || "PB IPSI",
      emailOrPhone: params.emailOrPhone || "-",
      createdAt: Date.now(),
      approvedAt: params.status === "APPROVED" ? Date.now() : undefined,
      approvedBy: params.createdBy || "Admin",
      ipLockEnabled: false
    };

    const list = await this.getAllUsers();
    saveLocalCachedUsers([...list, newUser]);
    await saveUserToFirebase(newUser);
    return { success: true, user: newUser };
  },

  /**
   * Get all registered users (Firebase Realtime Database + Backend + LocalStorage)
   */
  async getAllUsers(): Promise<UserAccount[]> {
    const mergedMap = new Map<string, UserAccount>();
    getLocalCachedUsers().forEach((u) => {
      if (u && u.username) {
        mergedMap.set(u.username.toLowerCase(), u);
      }
    });

    if (db) {
      try {
        const snap = await get(ref(db, "users"));
        if (snap.exists()) {
          const val = snap.val();
          const rtdbList: UserAccount[] = Array.isArray(val) ? val : Object.values(val || {});
          rtdbList.forEach((u) => {
            if (u && u.username) {
              mergedMap.set(u.username.toLowerCase(), u);
            }
          });
        }
      } catch {}
    }

    try {
      const res = await fetch("/api/users/list");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          data.forEach((u: UserAccount) => {
            if (u && u.username) {
              mergedMap.set(u.username.toLowerCase(), u);
            }
          });
        }
      }
    } catch {}

    const combined = Array.from(mergedMap.values());
    saveLocalCachedUsers(combined);
    return combined;
  },

  async approveUser(
    userId: string,
    approvedBy: string,
    accessTier: "LIMITED" | "FULL" = "FULL"
  ): Promise<{ success: boolean; error?: string }> {
    const partial: Partial<UserAccount> = {
      status: "APPROVED" as UserStatus,
      accessTier,
      role: (accessTier === "FULL" ? "admin" : "umum") as UserRole,
      approvedAt: Date.now(),
      approvedBy
    };

    await updateUserInFirebase(userId, partial);

    try {
      const res = await fetch("/api/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, approvedBy, accessTier })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    const all = await this.getAllUsers();
    const updatedList = all.map((u) => (u.id === userId ? { ...u, ...partial } : u));
    saveLocalCachedUsers(updatedList);
    return { success: true };
  },

  async rejectUser(userId: string, rejectedBy: string): Promise<{ success: boolean; error?: string }> {
    await updateUserInFirebase(userId, { status: "REJECTED" as UserStatus });

    try {
      const res = await fetch("/api/users/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rejectedBy })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    const all = await this.getAllUsers();
    const updatedList = all.map((u) =>
      u.id === userId ? { ...u, status: "REJECTED" as UserStatus } : u
    );
    saveLocalCachedUsers(updatedList);
    return { success: true };
  },

  async createUser(userData: {
    fullName: string;
    username: string;
    password: string;
    role: UserRole;
    organization?: string;
    emailOrPhone?: string;
    createdBy: string;
  }): Promise<{ success: boolean; error?: string }> {
    const newUserId = "usr_" + Date.now();
    const newUser: UserAccount = {
      id: newUserId,
      username: userData.username.trim().toLowerCase(),
      password: userData.password,
      fullName: userData.fullName.trim(),
      role: userData.role,
      status: "APPROVED",
      organization: userData.organization || "-",
      emailOrPhone: userData.emailOrPhone || "-",
      createdAt: Date.now(),
      approvedAt: Date.now(),
      approvedBy: userData.createdBy,
      ipLockEnabled: false
    };

    await saveUserToFirebase(newUser);

    try {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    const all = await this.getAllUsers();
    saveLocalCachedUsers([...all, newUser]);
    return { success: true };
  },

  async resetPassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    await updateUserInFirebase(userId, { password: newPassword });

    try {
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    const all = await this.getAllUsers();
    const updatedList = all.map((u) => (u.id === userId ? { ...u, password: newPassword } : u));
    saveLocalCachedUsers(updatedList);
    return { success: true };
  },

  async signInWithGoogle(): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    if (auth && googleProvider) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user?.email) {
          return this.signInWithGmail(
            result.user.email,
            result.user.displayName || undefined
          );
        }
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || "Gagal masuk menggunakan Google."
        };
      }
    }
    return {
      success: false,
      error: "Silakan gunakan login username & kata sandi."
    };
  },

  async signInWithGmail(
    email: string,
    fullName?: string
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        return { success: false, error: "Alamat email tidak valid" };
      }

      const allUsers = await this.getAllUsers();
      let foundUser = allUsers.find(
        (u) =>
          (u.emailOrPhone && u.emailOrPhone.toLowerCase() === normalizedEmail) ||
          (u.username && u.username.toLowerCase() === normalizedEmail)
      );

      if (!foundUser) {
        const isSuperAdminEmail = normalizedEmail === "jakaoktorian2@gmail.com";
        const baseUsername =
          normalizedEmail
            .split("@")[0]
            .replace(/[^a-zA-Z0-9_]/g, "")
            .slice(0, 16) || "user";
        const newUserId = isSuperAdminEmail ? "usr_superadmin" : "usr_g_" + Date.now();
        const role: UserRole = isSuperAdminEmail ? "superadmin" : "admin";

        const newUser: UserAccount = {
          id: newUserId,
          username: isSuperAdminEmail ? "jakaoktorian" : baseUsername,
          fullName: fullName || (isSuperAdminEmail ? "Jaka Oktorian (Super Admin)" : baseUsername),
          role: role,
          status: "APPROVED",
          organization: isSuperAdminEmail ? "Pengurus Besar IPSI" : "IPSI Kontingen Daerah",
          emailOrPhone: normalizedEmail,
          createdAt: Date.now(),
          approvedAt: Date.now(),
          approvedBy: "Firebase Google SSO",
          ipLockEnabled: false
        };

        saveLocalCachedUsers([...allUsers, newUser]);
        await saveUserToFirebase(newUser);
        foundUser = newUser;
      }

      return { success: true, user: foundUser };
    } catch (err: any) {
      return { success: false, error: err?.message || "Gagal proses masuk Gmail" };
    }
  },

  async updateUser(
    userData: Partial<UserAccount> & { id: string }
  ): Promise<{ success: boolean; error?: string }> {
    await updateUserInFirebase(userData.id, userData);
    const all = await this.getAllUsers();
    const updatedList = all.map((u) => (u.id === userData.id ? { ...u, ...userData } : u));
    saveLocalCachedUsers(updatedList);
    return { success: true };
  },

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    if (db && userId) {
      try {
        await set(ref(db, `users/${userId}`), null);
      } catch {}
    }
    const all = await this.getAllUsers();
    const filtered = all.filter((u) => u.id !== userId);
    saveLocalCachedUsers(filtered);
    return { success: true };
  },

  saveSession(user: UserAccount | null) {
    this.setCurrentUser(user);
  },

  saveUserToStorage(user: UserAccount | null) {
    this.setCurrentUser(user);
  },

  async createUserByAdmin(
    userData: any
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    return this.createUser(userData);
  }
};
