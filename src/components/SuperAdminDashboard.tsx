/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Shield, 
  ShieldCheck, 
  Users, 
  UserCheck, 
  UserX, 
  UserPlus, 
  Clock, 
  Check, 
  X, 
  RefreshCw, 
  Search, 
  Edit3, 
  Trash2, 
  KeyRound, 
  LogOut, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle, 
  CheckCircle2,
  Activity, 
  Building2, 
  Phone, 
  Calendar,
  Lock,
  User,
  Sliders,
  ExternalLink,
  ShieldAlert,
  Copy,
  MessageCircle,
  Link,
  Send,
  Network,
  Laptop,
  Unlock,
  Server
} from "lucide-react";
import { sound } from "../utils/sound";
import { UserAccount, UserRole, UserStatus, AuthSession, PasswordResetRequest, IpUnlockRequest } from "../types";
import { FullScreenOverlay } from "./FullScreenOverlay";
import { authService } from "../services/authService";

interface SuperAdminDashboardProps {
  currentUser: AuthSession["user"];
  onNavigateToApp: () => void;
  onLogout: () => void;
}

export function SuperAdminDashboard({
  currentUser,
  onNavigateToApp,
  onLogout
}: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "ip-requests" | "reset-requests" | "users" | "logs">("pending");
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [ipUnlockRequests, setIpUnlockRequests] = useState<IpUnlockRequest[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetApprovalModal, setShowResetApprovalModal] = useState(false);
  const [approvedResetData, setApprovedResetData] = useState<{ request: PasswordResetRequest; token: string; link: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form States for Create
  const [createFullName, setCreateFullName] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<UserRole>("admin");
  const [createOrg, setCreateOrg] = useState("");
  const [createContact, setCreateContact] = useState("");

  // Form States for Edit
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("admin");
  const [editStatus, setEditStatus] = useState<UserStatus>("APPROVED");
  const [editOrg, setEditOrg] = useState("");
  const [editContact, setEditContact] = useState("");

  // Form States for Reset Pass
  const [newPassword, setNewPassword] = useState("");

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await authService.getAllUsers();
      if (Array.isArray(data)) {
        setUsersList(data);
      }
    } catch (err) {
      console.error("Gagal mengambil data user:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResetRequests = async () => {
    try {
      const res = await fetch("/api/auth/reset-requests");
      if (res.ok) {
        const data = await res.json();
        setResetRequests(data);
      }
    } catch (err) {
      console.error("Gagal mengambil permohonan reset sandi:", err);
    }
  };

  const fetchIpUnlockRequests = async () => {
    try {
      const res = await fetch("/api/auth/ip-unlock-requests");
      if (res.ok) {
        const data = await res.json();
        setIpUnlockRequests(data);
      }
    } catch (err) {
      console.error("Gagal mengambil permohonan buka kunci IP:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/users/activity-logs");
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data);
      }
    } catch (err) {
      console.error("Gagal mengambil log aktivitas:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchResetRequests();
    fetchIpUnlockRequests();
    fetchLogs();
    const interval = setInterval(() => {
      fetchUsers();
      fetchResetRequests();
      fetchIpUnlockRequests();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const pendingUsers = usersList.filter(u => u.status === "PENDING");
  const pendingResetRequests = resetRequests.filter(r => r.status === "PENDING");
  const pendingIpRequests = ipUnlockRequests.filter(r => r.status === "PENDING");
  const approvedAdmins = usersList.filter(u => u.role === "admin" && u.status === "APPROVED");
  const superAdmins = usersList.filter(u => u.role === "superadmin");
  const suspendedUsers = usersList.filter(u => u.status === "SUSPENDED" || u.status === "REJECTED");

  // Handle Approve IP Unlock Request
  const handleApproveIpUnlock = async (requestId: string, username: string, targetIp: string) => {
    sound.playClick();
    try {
      const res = await fetch("/api/auth/approve-ip-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          approvedBy: currentUser.username,
          overrideIp: targetIp || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBell();
        showToast(`Izin IP untuk @${username} berhasil disetujui! IP Terikat: ${data.boundIp}`);
        fetchIpUnlockRequests();
        fetchUsers();
        fetchLogs();
      } else {
        sound.playBuzzer();
        showToast(data.error || "Gagal menyetujui izin IP.", "error");
      }
    } catch (err) {
      sound.playBuzzer();
      showToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  // Handle Reject IP Unlock Request
  const handleRejectIpUnlock = async (requestId: string, username: string) => {
    if (!confirm(`Apakah Anda yakin ingin menolak permohonan buka kunci IP untuk @${username}?`)) {
      return;
    }
    sound.playClick();
    try {
      const res = await fetch("/api/auth/reject-ip-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          rejectedBy: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBuzzer();
        showToast(`Permohonan izin IP @${username} ditolak.`);
        fetchIpUnlockRequests();
        fetchLogs();
      } else {
        showToast(data.error || "Gagal menolak permohonan.", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  // Handle Toggle IP Lock for user
  const handleToggleIpLock = async (userId: string, username: string, currentEnabled: boolean) => {
    sound.playClick();
    try {
      const res = await fetch(`/api/users/${userId}/toggle-ip-lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: !currentEnabled,
          updatedBy: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBell();
        showToast(`Proteksi 1-IP untuk @${username} sekarang ${!currentEnabled ? 'AKTIF' : 'NONAKTIF'}.`);
        fetchUsers();
        fetchLogs();
      } else {
        sound.playBuzzer();
        showToast(data.error || "Gagal mengubah proteksi IP.", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  // Handle Reset Bound IP for user
  const handleResetBoundIp = async (userId: string, username: string) => {
    if (!confirm(`Reset ikatan IP untuk @${username}? Akun akan dapat login dari perangkat/IP baru pada login berikutnya.`)) {
      return;
    }
    sound.playClick();
    try {
      const res = await fetch(`/api/users/${userId}/reset-bound-ip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updatedBy: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBell();
        showToast(`Ikatan IP untuk @${username} berhasil dilepas.`);
        fetchUsers();
        fetchLogs();
      } else {
        sound.playBuzzer();
        showToast(data.error || "Gagal mereset IP.", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  // Handle Approve Reset Password Request
  const handleApproveReset = async (requestId: string, username: string, contact: string) => {
    sound.playClick();
    try {
      const res = await fetch("/api/auth/approve-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          approvedBy: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        sound.playBell();
        const origin = window.location.origin;
        const resetLink = `${origin}/?action=reset-password&token=${data.token}`;
        setApprovedResetData({
          request: data.request,
          token: data.token,
          link: resetLink
        });
        setShowResetApprovalModal(true);
        showToast(`Permohonan reset untuk @${username} berhasil disetujui!`);
        fetchResetRequests();
        fetchLogs();
      } else {
        sound.playBuzzer();
        showToast(data.error || "Gagal menyetujui reset kata sandi.", "error");
      }
    } catch (err) {
      sound.playBuzzer();
      showToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  // Handle Reject Reset Password Request
  const handleRejectReset = async (requestId: string, username: string) => {
    if (!confirm(`Apakah Anda yakin ingin menolak permohonan reset sandi untuk @${username}?`)) {
      return;
    }
    sound.playClick();
    try {
      const res = await fetch("/api/auth/reject-reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          rejectedBy: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBuzzer();
        showToast(`Permohonan reset sandi @${username} ditolak.`);
        fetchResetRequests();
        fetchLogs();
      } else {
        showToast(data.error || "Gagal menolak permohonan.", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  // Handle Approve User
  const handleApprove = async (userId: string, username: string) => {
    sound.playClick();
    try {
      const res = await fetch("/api/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          approvedBy: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBell();
        showToast(`Akun @${username} berhasil disetujui & diaktifkan!`);
        fetchUsers();
        fetchLogs();
      } else {
        sound.playBuzzer();
        showToast(data.error || "Gagal menyetujui akun.", "error");
      }
    } catch (err) {
      sound.playBuzzer();
      showToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  // Handle Reject User
  const handleReject = async (userId: string, username: string) => {
    if (!confirm(`Apakah Anda yakin ingin menolak & menghapus pendaftaran akun @${username}?`)) {
      return;
    }
    sound.playClick();
    try {
      const res = await fetch("/api/users/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          rejectedBy: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBuzzer();
        showToast(`Pendaftaran @${username} berhasil ditolak.`);
        fetchUsers();
        fetchLogs();
      } else {
        showToast(data.error || "Gagal menolak akun.", "error");
      }
    } catch (err) {
      showToast("Terjadi kesalahan koneksi.", "error");
    }
  };

  // Handle Direct Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    try {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: createFullName,
          username: createUsername,
          password: createPassword,
          role: createRole,
          organization: createOrg,
          emailOrPhone: createContact,
          createdBy: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBell();
        showToast(`Akun @${createUsername} berhasil dibuat!`);
        setShowCreateModal(false);
        setCreateFullName("");
        setCreateUsername("");
        setCreatePassword("");
        setCreateOrg("");
        setCreateContact("");
        fetchUsers();
        fetchLogs();
      } else {
        sound.playBuzzer();
        showToast(data.error || "Gagal membuat akun.", "error");
      }
    } catch (err) {
      sound.playBuzzer();
      showToast("Kesalahan koneksi.", "error");
    }
  };

  // Handle Edit User
  const openEditModal = (user: UserAccount) => {
    sound.playClick();
    setSelectedUser(user);
    setEditFullName(user.fullName);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditOrg(user.organization || "");
    setEditContact(user.emailOrPhone || "");
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    sound.playClick();
    try {
      const res = await fetch("/api/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          updates: {
            fullName: editFullName,
            role: editRole,
            status: editStatus,
            organization: editOrg,
            emailOrPhone: editContact
          },
          updatedBy: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBell();
        showToast(`Data akun @${selectedUser.username} berhasil diperbarui.`);
        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsers();
        fetchLogs();
      } else {
        sound.playBuzzer();
        showToast(data.error || "Gagal memperbarui data akun.", "error");
      }
    } catch (err) {
      showToast("Kesalahan koneksi.", "error");
    }
  };

  // Handle Reset Password
  const openResetPassModal = (user: UserAccount) => {
    sound.playClick();
    setSelectedUser(user);
    setNewPassword("");
    setShowResetPassModal(true);
  };

  const handleSaveResetPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    sound.playClick();
    try {
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword,
          resetBy: currentUser.username
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBell();
        showToast(`Kata sandi untuk @${selectedUser.username} berhasil diubah.`);
        setShowResetPassModal(false);
        setSelectedUser(null);
        setNewPassword("");
        fetchLogs();
      } else {
        sound.playBuzzer();
        showToast(data.error || "Gagal mereset kata sandi.", "error");
      }
    } catch (err) {
      showToast("Kesalahan koneksi.", "error");
    }
  };

  // Handle Delete User
  const openDeleteModal = (user: UserAccount) => {
    sound.playClick();
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    sound.playClick();
    try {
      const res = await fetch(`/api/users/${selectedUser.id}?deletedBy=${currentUser.username}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sound.playBuzzer();
        showToast(`Akun @${selectedUser.username} berhasil dihapus.`);
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsers();
        fetchLogs();
      } else {
        showToast(data.error || "Gagal menghapus akun.", "error");
      }
    } catch (err) {
      showToast("Kesalahan koneksi.", "error");
    }
  };

  // Filtered users for table
  const filteredUsers = usersList.filter(user => {
    const matchSearch = 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.organization || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.emailOrPhone || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchRole = roleFilter === "ALL" || user.role === roleFilter;
    const matchStatus = statusFilter === "ALL" || user.status === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="min-h-screen bg-[#070314] text-slate-100 font-sans select-none relative overflow-x-hidden flex flex-col">
      <FullScreenOverlay onBack={onNavigateToApp} showBack={true} />
      
      {/* Background Glow */}
      <div 
        className="fixed inset-0 opacity-[0.03] pointer-events-none bg-center bg-no-repeat bg-contain z-0"
        style={{ backgroundImage: "url('/jrzscoreutama.png')", backgroundSize: "min(50vw, 50vh)" }}
      />

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-slideDown ${
          toastMessage.type === "success" 
            ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200" 
            : "bg-rose-950/90 border-rose-500/50 text-rose-200"
        }`}>
          {toastMessage.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          )}
          <span className="text-xs font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* TOP NAVBAR HEADER */}
      <header className="bg-[#0e0624]/90 border-b border-purple-500/25 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-md">
        
        {/* BRAND & TITLE */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-950/50 border border-amber-300/40">
            <Shield className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                PANEL SUPER ADMINISTRATOR
              </h1>
              <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full font-mono">
                MASTER ROOT
              </span>
            </div>
            <p className="text-[10.5px] text-purple-300/60 font-mono">
              Verifikasi Pendaftaran & Manajemen Akun Pengguna Aplikasi IPSI
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS & USER STATUS */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Quick Switch to Match Simulation App */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigateToApp();
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-purple-400/30 shadow-md shadow-purple-950/50 cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="Buka panel operasional pertandingan"
          >
            <span>Buka Panel Pertandingan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          {/* Create User Button */}
          <button
            onClick={() => {
              sound.playClick();
              setShowCreateModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-emerald-400/40 shadow-md shadow-emerald-950/50 cursor-pointer transition-all hover:scale-105 active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Akun</span>
          </button>

          {/* User Profile Badge */}
          <div className="bg-[#170a3b] border border-purple-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs">
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold text-slate-200">{currentUser.username}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => {
              sound.playClick();
              onLogout();
            }}
            className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-white transition-all cursor-pointer"
            title="Keluar dari sesi Super Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN BODY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 z-10">
        
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Pending Registrations (Highlighted) */}
          <div 
            onClick={() => {
              sound.playClick();
              setActiveTab("pending");
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
              activeTab === "pending" 
                ? "bg-amber-950/40 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]" 
                : "bg-[#110729]/80 border-purple-900/50 hover:border-amber-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono">
                Menunggu Verifikasi
              </span>
              <Clock className={`w-4 h-4 ${pendingUsers.length > 0 ? "text-amber-400 animate-spin" : "text-slate-500"}`} />
            </div>
            <div className="text-3xl font-black text-white mt-2 font-mono flex items-baseline gap-2">
              <span>{pendingUsers.length}</span>
              {pendingUsers.length > 0 && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full animate-pulse">
                  Perlu Tindakan
                </span>
              )}
            </div>
            <p className="text-[10px] text-purple-300/60 mt-1">
              Pendaftaran akun baru menunggu persetujuan
            </p>
          </div>

          {/* Card 2: Admin Aktif */}
          <div 
            onClick={() => {
              sound.playClick();
              setActiveTab("users");
              setRoleFilter("admin");
              setStatusFilter("APPROVED");
            }}
            className="p-4 rounded-2xl bg-[#110729]/80 border border-purple-900/50 hover:border-emerald-500/50 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 font-mono">
                Admin / Operator Aktif
              </span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-white mt-2 font-mono">
              {approvedAdmins.length}
            </div>
            <p className="text-[10px] text-purple-300/60 mt-1">
              Pengguna aktif pengoperasian aplikasi
            </p>
          </div>

          {/* Card 3: Total Super Admin */}
          <div 
            onClick={() => {
              sound.playClick();
              setActiveTab("users");
              setRoleFilter("superadmin");
            }}
            className="p-4 rounded-2xl bg-[#110729]/80 border border-purple-900/50 hover:border-purple-500/50 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 font-mono">
                Super Administrator
              </span>
              <ShieldCheck className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-white mt-2 font-mono">
              {superAdmins.length}
            </div>
            <p className="text-[10px] text-purple-300/60 mt-1">
              Akses master verifikasi & manajemen
            </p>
          </div>

          {/* Card 4: Total User Terdaftar */}
          <div 
            onClick={() => {
              sound.playClick();
              setActiveTab("users");
              setRoleFilter("ALL");
              setStatusFilter("ALL");
            }}
            className="p-4 rounded-2xl bg-[#110729]/80 border border-purple-900/50 hover:border-indigo-500/50 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 font-mono">
                Total Akun Database
              </span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-black text-white mt-2 font-mono">
              {usersList.length}
            </div>
            <p className="text-[10px] text-purple-300/60 mt-1">
              Seluruh akun yang terdaftar di sistem
            </p>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center justify-between border-b border-purple-900/50 pb-2">
          <div className="flex items-center gap-2">
            
            {/* Tab 1: Pending Approvals */}
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("pending");
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "pending"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black"
                  : "text-purple-300/70 hover:text-white bg-[#140833]/60 hover:bg-[#1a0c42]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Verifikasi Pendaftaran</span>
              {pendingUsers.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  activeTab === "pending" ? "bg-slate-950 text-amber-400" : "bg-amber-500 text-slate-950"
                }`}>
                  {pendingUsers.length}
                </span>
              )}
            </button>

            {/* Tab 2: IP Unlock Requests */}
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("ip-requests");
                fetchIpUnlockRequests();
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "ip-requests"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/30 font-black"
                  : "text-purple-300/70 hover:text-white bg-[#140833]/60 hover:bg-[#1a0c42]"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Izin IP Perangkat</span>
              {pendingIpRequests.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  activeTab === "ip-requests" ? "bg-slate-950 text-cyan-300" : "bg-cyan-500 text-slate-950"
                }`}>
                  {pendingIpRequests.length}
                </span>
              )}
            </button>

            {/* Tab 3: Reset Password Requests */}
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("reset-requests");
                fetchResetRequests();
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "reset-requests"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/30 font-black"
                  : "text-purple-300/70 hover:text-white bg-[#140833]/60 hover:bg-[#1a0c42]"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Permohonan Reset Sandi</span>
              {pendingResetRequests.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  activeTab === "reset-requests" ? "bg-slate-950 text-amber-300" : "bg-rose-500 text-white"
                }`}>
                  {pendingResetRequests.length}
                </span>
              )}
            </button>

            {/* Tab 3: All Users */}
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("users");
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/50 font-black"
                  : "text-purple-300/70 hover:text-white bg-[#140833]/60 hover:bg-[#1a0c42]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kelola Seluruh Pengguna</span>
              <span className="text-[10px] font-mono opacity-80">({usersList.length})</span>
            </button>

            {/* Tab 4: Activity Logs */}
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab("logs");
                fetchLogs();
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "logs"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/50 font-black"
                  : "text-purple-300/70 hover:text-white bg-[#140833]/60 hover:bg-[#1a0c42]"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Log Aktivitas & Audit</span>
            </button>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              fetchUsers();
              fetchLogs();
              showToast("Data berhasil diperbarui.");
            }}
            disabled={isLoading}
            className="p-2 rounded-xl bg-[#140833] hover:bg-[#1f0d4d] border border-purple-500/20 text-purple-300 hover:text-white transition-all cursor-pointer"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* TAB 1 CONTENT: VERIFIKASI PENDAFTARAN (PENDING REQUESTS) */}
        {activeTab === "pending" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black uppercase tracking-wide text-amber-300 flex items-center gap-2">
                  <span>Permohonan Akun Baru Menunggu Persetujuan</span>
                  <span className="text-xs bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full text-amber-400 font-mono">
                    {pendingUsers.length} Permohonan
                  </span>
                </h2>
                <p className="text-xs text-purple-300/60 mt-0.5">
                  Setujui akun agar pengguna dapat login dan mengoperasikan aplikasi scoring, atau tolak permohonan yang tidak valid.
                </p>
              </div>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="bg-[#110729]/60 border border-purple-900/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center mb-3">
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Tidak Ada Permohonan Pendaftaran Tertunda
                </h3>
                <p className="text-xs text-purple-300/50 mt-1 max-w-sm">
                  Seluruh pendaftaran akun baru telah diverifikasi. Permohonan baru akan otomatis muncul di sini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingUsers.map(user => (
                  <div 
                    key={user.id} 
                    className="bg-[#110729] border border-amber-500/40 rounded-2xl p-5 shadow-[0_4px_20px_rgba(245,158,11,0.1)] flex flex-col justify-between gap-4 animate-fadeIn"
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2 border-b border-purple-900/40 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wide">
                              {user.fullName}
                            </h3>
                            <p className="text-xs text-amber-400/90 font-mono">
                              @{user.username}
                            </p>
                          </div>
                        </div>

                        <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" /> PENDING
                        </span>
                      </div>

                      {/* Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5 text-xs text-slate-300">
                        <div className="flex items-center gap-2 bg-[#170a38] p-2.5 rounded-xl">
                          <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate">{user.organization || "Kontingen IPSI"}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#170a38] p-2.5 rounded-xl">
                          <Phone className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="truncate">{user.emailOrPhone || "Tidak ada kontak"}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-[#170a38] p-2.5 rounded-xl sm:col-span-2">
                          <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="font-mono text-[11px]">
                            Mendaftar pada: {new Date(user.createdAt).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 pt-2 border-t border-purple-900/40">
                      <button
                        onClick={() => handleApprove(user.id, user.username)}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-emerald-400/40 shadow-md shadow-emerald-950/50 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Check className="w-4 h-4" />
                        <span>Setujui Akun (Approve)</span>
                      </button>

                      <button
                        onClick={() => handleReject(user.id, user.username)}
                        className="px-4 py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <X className="w-4 h-4" />
                        <span>Tolak</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: PERMOHONAN IZIN IP PERANGKAT (IP UNLOCK REQUESTS) */}
        {activeTab === "ip-requests" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-black uppercase tracking-wide text-cyan-300 flex items-center gap-2">
                  <Network className="w-5 h-5 text-cyan-400" />
                  <span>Permohonan Izin IP Perangkat / Server</span>
                  <span className="text-xs bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded-full text-cyan-400 font-mono">
                    {pendingIpRequests.length} Menunggu Izin
                  </span>
                </h2>
                <p className="text-xs text-purple-300/60 mt-0.5">
                  Sistem mendeteksi login dari alamat IP / server baru. Setujui permohonan agar akun dapat login dari IP baru tersebut.
                </p>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  fetchIpUnlockRequests();
                  showToast("Data permohonan IP diperbarui.");
                }}
                className="px-3 py-1.5 rounded-xl bg-[#140833] hover:bg-[#1f0d4d] border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Segarkan Data</span>
              </button>
            </div>

            {ipUnlockRequests.length === 0 ? (
              <div className="bg-[#110729]/60 border border-purple-900/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
                  <Network className="w-7 h-7 text-cyan-400/80" />
                </div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Belum Ada Permohonan Izin IP
                </h3>
                <p className="text-xs text-purple-300/50 mt-1 max-w-sm">
                  Pengguna yang diblokir karena mencoba login dari alamat IP atau server yang berbeda akan mengajukan izin dan tampil di sini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ipUnlockRequests.map(req => (
                  <div 
                    key={req.id} 
                    className={`bg-[#110729] rounded-2xl p-5 border flex flex-col justify-between gap-4 animate-fadeIn ${
                      req.status === "PENDING"
                        ? "border-cyan-500/50 shadow-[0_4px_20px_rgba(6,182,212,0.15)]"
                        : req.status === "APPROVED"
                        ? "border-emerald-500/30 opacity-90"
                        : "border-slate-800 opacity-60"
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-purple-900/40 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                            req.status === "PENDING"
                              ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-400"
                              : req.status === "APPROVED"
                              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                              : "bg-slate-800 text-slate-400"
                          }`}>
                            <Laptop className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wide">
                              @{req.username}
                            </h3>
                            <p className="text-xs text-cyan-300/80 font-mono">
                              Permohonan Buka Izin IP
                            </p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full font-mono flex items-center gap-1 border ${
                          req.status === "PENDING"
                            ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 animate-pulse"
                            : req.status === "APPROVED"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      {/* Card Details */}
                      <div className="space-y-2 mt-3.5 text-xs text-slate-300">
                        <div className="grid grid-cols-2 gap-2 bg-[#170a38] p-2.5 rounded-xl">
                          <div>
                            <span className="text-[10px] text-purple-300/70 block uppercase font-mono">IP Baru Diminta:</span>
                            <span className="font-mono text-cyan-300 font-bold text-xs">{req.currentIp}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-purple-300/70 block uppercase font-mono">IP Lama Terikat:</span>
                            <span className="font-mono text-slate-300 font-bold text-xs">{req.previousBoundIp || "Belum ada"}</span>
                          </div>
                        </div>

                        {req.reason && (
                          <div className="bg-[#170a38] p-2.5 rounded-xl">
                            <span className="text-[10px] text-purple-300/70 block uppercase font-mono mb-0.5">Alasan Pergantian:</span>
                            <p className="text-slate-200 text-xs italic">"{req.reason}"</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between bg-[#170a38] p-2.5 rounded-xl">
                          <span className="text-purple-300 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-purple-400" />
                            <span>Kontak Pengaju:</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-white font-bold">{req.emailOrPhone || "Tidak ada"}</span>
                            {req.emailOrPhone && (
                              <a
                                href={`https://wa.me/${req.emailOrPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Halo @${req.username}, permohonan buka izin IP perangkat Anda di Aplikasi Skor IPSI telah kami terima.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-all cursor-pointer"
                                title="Kirim Pesan WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-[#170a38] p-2.5 rounded-xl">
                          <span className="text-purple-300 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-400" />
                            <span>Waktu Diajukan:</span>
                          </span>
                          <span className="font-mono text-[11px] text-slate-300">
                            {new Date(req.createdAt).toLocaleString("id-ID")}
                          </span>
                        </div>

                        {req.status === "APPROVED" && req.approvedBy && (
                          <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-xl text-emerald-300">
                            <span>Disetujui Oleh:</span>
                            <span className="font-mono font-bold">@{req.approvedBy}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {req.status === "PENDING" ? (
                      <div className="flex items-center gap-2.5 pt-2 border-t border-purple-900/40">
                        <button
                          onClick={() => handleApproveIpUnlock(req.id, req.username, req.currentIp)}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-cyan-950/50 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Check className="w-4 h-4" />
                          <span>Setujui & Ikat IP Ini</span>
                        </button>

                        <button
                          onClick={() => handleRejectIpUnlock(req.id, req.username)}
                          className="px-4 py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <X className="w-4 h-4" />
                          <span>Tolak</span>
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-purple-900/30 text-center">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {req.status === "APPROVED" ? `Telah disetujui untuk IP ${req.currentIp}.` : "Permohonan telah ditolak."}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: PERMOHONAN RESET SANDI (PASSWORD RESET REQUESTS) */}
        {activeTab === "reset-requests" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black uppercase tracking-wide text-amber-300 flex items-center gap-2">
                  <span>Permohonan Reset Kata Sandi Pengguna</span>
                  <span className="text-xs bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full text-amber-400 font-mono">
                    {pendingResetRequests.length} Menunggu Verifikasi
                  </span>
                </h2>
                <p className="text-xs text-purple-300/60 mt-0.5">
                  Verifikasi dan setujui permohonan reset kata sandi pengguna untuk menerbitkan tautan reset resmi yang dapat dikirimkan ke WhatsApp pengguna.
                </p>
              </div>
            </div>

            {resetRequests.length === 0 ? (
              <div className="bg-[#110729]/60 border border-purple-900/40 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                  <KeyRound className="w-7 h-7 text-amber-400/80" />
                </div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Belum Ada Permohonan Reset Kata Sandi
                </h3>
                <p className="text-xs text-purple-300/50 mt-1 max-w-sm">
                  Pengguna yang mengajukan "Lupa Sandi" dari layar login akan otomatis tercatat di sini untuk diverifikasi oleh Super Admin.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resetRequests.map(req => (
                  <div 
                    key={req.id} 
                    className={`bg-[#110729] rounded-2xl p-5 border flex flex-col justify-between gap-4 animate-fadeIn ${
                      req.status === "PENDING"
                        ? "border-amber-500/50 shadow-[0_4px_20px_rgba(245,158,11,0.1)]"
                        : req.status === "APPROVED"
                        ? "border-emerald-500/30 opacity-90"
                        : "border-slate-800 opacity-60"
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-purple-900/40 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                            req.status === "PENDING"
                              ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                              : req.status === "APPROVED"
                              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                              : "bg-slate-800 text-slate-400"
                          }`}>
                            <KeyRound className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-wide">
                              @{req.username}
                            </h3>
                            <p className="text-xs text-purple-300/80 font-mono">
                              Permohonan Reset Sandi
                            </p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full font-mono flex items-center gap-1 border ${
                          req.status === "PENDING"
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse"
                            : req.status === "APPROVED"
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                        }`}>
                          {req.status}
                        </span>
                      </div>

                      {/* Card Details */}
                      <div className="space-y-2 mt-3.5 text-xs text-slate-300">
                        <div className="flex items-center justify-between bg-[#170a38] p-2.5 rounded-xl">
                          <span className="text-purple-300 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-purple-400" />
                            <span>Kontak Pengaju:</span>
                          </span>
                          <span className="font-mono text-white font-bold">{req.emailOrPhone || "Tidak dicantumkan"}</span>
                        </div>

                        <div className="flex items-center justify-between bg-[#170a38] p-2.5 rounded-xl">
                          <span className="text-purple-300 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-400" />
                            <span>Waktu Diajukan:</span>
                          </span>
                          <span className="font-mono text-[11px] text-slate-300">
                            {new Date(req.createdAt).toLocaleString("id-ID")}
                          </span>
                        </div>

                        {req.status === "APPROVED" && req.approvedBy && (
                          <div className="flex items-center justify-between bg-emerald-950/30 border border-emerald-500/20 p-2.5 rounded-xl text-emerald-300">
                            <span>Disetujui Oleh:</span>
                            <span className="font-mono font-bold">@{req.approvedBy}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {req.status === "PENDING" ? (
                      <div className="flex items-center gap-2.5 pt-2 border-t border-purple-900/40">
                        <button
                          onClick={() => handleApproveReset(req.id, req.username, req.emailOrPhone)}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-amber-950/50 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Check className="w-4 h-4" />
                          <span>Verifikasi & Setujui Reset</span>
                        </button>

                        <button
                          onClick={() => handleRejectReset(req.id, req.username)}
                          className="px-4 py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <X className="w-4 h-4" />
                          <span>Tolak</span>
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-purple-900/30 text-center">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {req.status === "APPROVED" ? "Telah disetujui & token diterbitkan." : "Permohonan telah ditolak."}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2 CONTENT: KELOLA SELURUH PENGGUNA (USER MANAGEMENT) */}
        {activeTab === "users" && (
          <div className="space-y-4">
            
            {/* Filters and Search Bar */}
            <div className="bg-[#110729]/90 border border-purple-900/50 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              
              {/* Search Input */}
              <div className="relative flex-1 min-w-[240px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan nama, username, instansi..."
                  className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-4 py-2 pl-10 text-white placeholder-purple-300/30 text-xs focus:outline-none focus:border-purple-400 font-sans"
                />
                <Search className="w-4 h-4 text-purple-400/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono">Peran:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-sans cursor-pointer"
                >
                  <option value="ALL">Semua Peran</option>
                  <option value="superadmin">Super Admin</option>
                  <option value="admin">Admin / Operator</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-sans cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="APPROVED">Aktif (Approved)</option>
                  <option value="PENDING">Menunggu Verifikasi</option>
                  <option value="SUSPENDED">Dinonaktifkan (Suspended)</option>
                </select>
              </div>
            </div>

            {/* USERS TABLE */}
            <div className="bg-[#110729]/90 border border-purple-900/50 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-[#170a3d] border-b border-purple-900/50 text-[10.5px] uppercase font-mono font-bold text-purple-300/80 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Pengguna</th>
                      <th className="py-3 px-4">Peran (Role)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Instansi / Organisasi</th>
                      <th className="py-3 px-4">Proteksi & IP Terikat</th>
                      <th className="py-3 px-4">Terakhir Login</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/30">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-purple-300/40 font-mono">
                          Tidak ditemukan data pengguna yang cocok.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-purple-950/20 transition-colors">
                          
                          {/* User Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                                user.role === "superadmin"
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              }`}>
                                {user.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-white uppercase">{user.fullName}</div>
                                <div className="text-[11px] text-purple-400/80 font-mono">@{user.username}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3 px-4 font-mono">
                            {user.role === "superadmin" ? (
                              <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Shield className="w-3 h-3 text-amber-400" /> Super Admin
                              </span>
                            ) : (
                              <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <User className="w-3 h-3 text-emerald-400" /> Admin (Operator)
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4 font-mono">
                            {user.status === "APPROVED" && (
                              <span className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                                AKTIF
                              </span>
                            )}
                            {user.status === "PENDING" && (
                              <span className="bg-amber-950/60 border border-amber-500/40 text-amber-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full animate-pulse">
                                PENDING
                              </span>
                            )}
                            {user.status === "SUSPENDED" && (
                              <span className="bg-rose-950/60 border border-rose-500/40 text-rose-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                                SUSPENDED
                              </span>
                            )}
                            {user.status === "REJECTED" && (
                              <span className="bg-slate-900 border border-slate-700 text-slate-400 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                                DITOLAK
                              </span>
                            )}
                          </td>

                          {/* Organization & Contact */}
                          <td className="py-3 px-4">
                            <div className="text-slate-300 font-medium">{user.organization || "-"}</div>
                            <div className="text-[10.5px] text-purple-300/60 font-mono">{user.emailOrPhone || "-"}</div>
                          </td>

                          {/* IP Protection & Multi-Device Access */}
                          <td className="py-3 px-4 font-mono text-[11px]">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {user.ipLockEnabled === true ? (
                                  <span className="bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5" /> 1-IP KHUSUS
                                  </span>
                                ) : (
                                  <span className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1" title="Dapat login bersamaan di Tab Juri 1-3, Scoreboard, Dewan, & Sekretaris">
                                    <Unlock className="w-2.5 h-2.5" /> MULTI-PERANGKAT (AKTIF)
                                  </span>
                                )}

                                <button
                                  onClick={() => handleToggleIpLock(user.id, user.username, user.ipLockEnabled === true)}
                                  className="text-[9px] text-purple-400 hover:text-white underline cursor-pointer"
                                  title="Ubah mode proteksi IP / Multi-Perangkat"
                                >
                                  {user.ipLockEnabled === true ? "Ubah ke Multi-Perangkat" : "Kunci 1-IP"}
                                </button>
                              </div>

                              {user.boundIp && user.ipLockEnabled === true ? (
                                <div className="flex items-center gap-1.5 text-amber-400 text-[10.5px]">
                                  <Laptop className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span className="font-bold">{user.boundIp}</span>
                                  <button
                                    onClick={() => handleResetBoundIp(user.id, user.username)}
                                    className="p-1 rounded bg-rose-950/40 hover:bg-rose-900 text-rose-300 hover:text-white transition-all cursor-pointer"
                                    title="Lepas / Reset Kunci IP"
                                  >
                                    <Unlock className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-500">
                                  Bisa login dari banyak gawai / tab
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Last Login */}
                          <td className="py-3 px-4 font-mono text-[10.5px] text-purple-300/60">
                            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("id-ID") : "Belum Pernah"}
                            {user.lastLoginIp && (
                              <div className="text-[9.5px] text-slate-500">IP: {user.lastLoginIp}</div>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {user.status === "PENDING" && (
                                <button
                                  onClick={() => handleApprove(user.id, user.username)}
                                  className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition-all cursor-pointer"
                                  title="Setujui Akun"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => openEditModal(user)}
                                className="p-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-800 text-purple-300 hover:text-white border border-purple-500/30 transition-all cursor-pointer"
                                title="Edit Data Pengguna"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => openResetPassModal(user)}
                                className="p-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-700 text-amber-300 hover:text-white border border-amber-500/30 transition-all cursor-pointer"
                                title="Ganti / Reset Kata Sandi"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => openDeleteModal(user)}
                                className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-700 text-rose-300 hover:text-white border border-rose-500/30 transition-all cursor-pointer"
                                title="Hapus Akun"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3 CONTENT: LOG AKTIVITAS & AUDIT */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black uppercase tracking-wide text-white">
                  Riwayat Aktivitas & Keamanan Akun
                </h2>
                <p className="text-xs text-purple-300/60 mt-0.5">
                  Audit trail pencatatan aktivitas pendaftaran, login, persetujuan akun, dan modifikasi data pengguna.
                </p>
              </div>

              <button
                onClick={() => {
                  sound.playClick();
                  fetchLogs();
                  showToast("Log aktivitas dimuat ulang.");
                }}
                className="px-3 py-1.5 rounded-xl bg-[#140833] hover:bg-[#1f0d4d] border border-purple-500/30 text-xs text-purple-300 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Segarkan Log</span>
              </button>
            </div>

            <div className="bg-[#110729]/90 border border-purple-900/50 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-[#170a3d] border-b border-purple-900/50 text-[10.5px] uppercase font-mono font-bold text-purple-300/80 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Aksi</th>
                      <th className="py-3 px-4">User Pelaksana</th>
                      <th className="py-3 px-4">Rincian Aktivitas</th>
                      <th className="py-3 px-4">Alamat IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-900/30">
                    {activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-purple-300/40 font-mono">
                          Belum ada catatan aktivitas tercatat.
                        </td>
                      </tr>
                    ) : (
                      activityLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-purple-950/20 transition-colors">
                          <td className="py-3 px-4 font-mono text-[10.5px] text-purple-300/80">
                            {new Date(log.timestamp).toLocaleString("id-ID")}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black font-mono uppercase ${
                              log.action === "LOGIN" ? "bg-indigo-950 text-indigo-400 border border-indigo-500/30" :
                              log.action === "REGISTER" ? "bg-amber-950 text-amber-400 border border-amber-500/30" :
                              log.action === "APPROVE" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" :
                              log.action === "REJECT" || log.action === "DELETE" ? "bg-rose-950 text-rose-400 border border-rose-500/30" :
                              "bg-purple-950 text-purple-400 border border-purple-500/30"
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-200">
                            @{log.username}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {log.details}
                          </td>
                          <td className="py-3 px-4 font-mono text-[10.5px] text-slate-400">
                            {log.ip}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL 1: CREATE USER DIRECTLY (SUPER ADMIN) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#10062b] border border-purple-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3 mb-4">
              <h3 className="font-sans font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Tambah Akun Pengguna Baru</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-purple-400 hover:text-white cursor-pointer font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-purple-200/70 uppercase mb-1 font-mono">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={createFullName}
                  onChange={(e) => setCreateFullName(e.target.value)}
                  placeholder="Nama Lengkap Pengguna..."
                  className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase mb-1 font-mono">
                    Username
                  </label>
                  <input
                    type="text"
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value)}
                    placeholder="Username..."
                    className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase mb-1 font-mono">
                    Kata Sandi
                  </label>
                  <input
                    type="text"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Min. 4 karakter..."
                    className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase mb-1 font-mono">
                    Peran (Role)
                  </label>
                  <select
                    value={createRole}
                    onChange={(e) => setCreateRole(e.target.value as UserRole)}
                    className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                  >
                    <option value="admin">Admin / Operator</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase mb-1 font-mono">
                    No. Kontak / WA
                  </label>
                  <input
                    type="text"
                    value={createContact}
                    onChange={(e) => setCreateContact(e.target.value)}
                    placeholder="08123456789"
                    className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-200/70 uppercase mb-1 font-mono">
                  Instansi / Pengcab / Kontingen
                </label>
                <input
                  type="text"
                  value={createOrg}
                  onChange={(e) => setCreateOrg(e.target.value)}
                  placeholder="cth: Pengkab IPSI Banyumas"
                  className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900 border border-purple-500/30 text-xs font-bold text-purple-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-extrabold uppercase text-white shadow-lg cursor-pointer"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#10062b] border border-purple-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3 mb-4">
              <h3 className="font-sans font-black text-sm uppercase tracking-wider text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-purple-400" />
                <span>Edit Pengguna @{selectedUser.username}</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-purple-400 hover:text-white cursor-pointer font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-purple-200/70 uppercase mb-1 font-mono">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase mb-1 font-mono">
                    Peran (Role)
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                  >
                    <option value="admin">Admin / Operator</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-purple-200/70 uppercase mb-1 font-mono">
                    Status Akun
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                    className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                  >
                    <option value="APPROVED">Aktif (Approved)</option>
                    <option value="PENDING">Menunggu Verifikasi</option>
                    <option value="SUSPENDED">Dinonaktifkan (Suspended)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-200/70 uppercase mb-1 font-mono">
                  Instansi / Pengcab / Kontingen
                </label>
                <input
                  type="text"
                  value={editOrg}
                  onChange={(e) => setEditOrg(e.target.value)}
                  className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-200/70 uppercase mb-1 font-mono">
                  Kontak / No. HP
                </label>
                <input
                  type="text"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900 border border-purple-500/30 text-xs font-bold text-purple-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-extrabold uppercase text-white shadow-lg cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET PASSWORD */}
      {showResetPassModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#10062b] border border-amber-500/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3 mb-4">
              <h3 className="font-sans font-black text-sm uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                <span>Ganti Password Akun</span>
              </h3>
              <button
                onClick={() => setShowResetPassModal(false)}
                className="text-purple-400 hover:text-white cursor-pointer font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              Masukkan kata sandi baru untuk akun <strong className="text-amber-300">@{selectedUser.username}</strong> ({selectedUser.fullName}):
            </p>

            <form onSubmit={handleSaveResetPass} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-purple-200/70 uppercase mb-1 font-mono">
                  Kata Sandi Baru
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 4 karakter..."
                  className="w-full bg-[#180a3d] border border-purple-500/30 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-400"
                  required
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPassModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900 border border-purple-500/30 text-xs font-bold text-purple-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-extrabold uppercase text-slate-950 shadow-lg cursor-pointer"
                >
                  Ubah Kata Sandi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#180814] border border-rose-500/40 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scaleIn">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center mx-auto mb-3 text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-center font-sans font-black text-sm uppercase tracking-wider text-rose-300 mb-2">
              Hapus Akun Pengguna
            </h3>

            <p className="text-xs text-slate-300 text-center mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <strong className="text-white">@{selectedUser.username}</strong> ({selectedUser.fullName}) secara permanen dari sistem?
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900 border border-purple-500/30 text-xs font-bold text-purple-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-extrabold uppercase text-white shadow-lg cursor-pointer"
              >
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: APPROVED RESET PASSWORD LINK & WA SHARE */}
      {showResetApprovalModal && approvedResetData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#10062b] border border-emerald-500/50 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-purple-900/50 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h3 className="font-sans font-black text-sm uppercase tracking-wider text-emerald-300">
                  Reset Sandi Disetujui!
                </h3>
              </div>
              <button
                onClick={() => setShowResetApprovalModal(false)}
                className="text-purple-400 hover:text-white cursor-pointer font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Tautan dan token reset kata sandi resmi untuk akun <strong className="text-amber-300 font-mono">@{approvedResetData.request.username}</strong> telah diterbitkan. Silakan salin tautan atau kirim langsung ke kontak pengguna melalui WhatsApp.
            </p>

            {/* Token Box */}
            <div className="bg-[#180a3d] border border-purple-500/30 rounded-2xl p-3.5 mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-purple-200/70 uppercase font-mono">
                  Token Reset Sandi
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Berlaku 24 Jam</span>
              </div>
              <div className="font-mono text-xs text-amber-300 bg-[#0e0422] px-3 py-2 rounded-xl border border-purple-500/20 select-all break-all font-bold">
                {approvedResetData.token}
              </div>
            </div>

            {/* Link Box */}
            <div className="bg-[#180a3d] border border-purple-500/30 rounded-2xl p-3.5 mb-4 space-y-2">
              <span className="text-[11px] font-bold text-purple-200/70 uppercase font-mono">
                Tautan Reset Kata Sandi
              </span>
              <div className="font-mono text-[11px] text-purple-200 bg-[#0e0422] px-3 py-2 rounded-xl border border-purple-500/20 select-all break-all">
                {approvedResetData.link}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(approvedResetData.link);
                  setCopiedLink(true);
                  showToast("Tautan reset berhasil disalin ke clipboard!");
                  setTimeout(() => setCopiedLink(false), 2500);
                }}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-purple-400/40 shadow-lg cursor-pointer transition-all active:scale-[0.99]"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Tautan Berhasil Disalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Tautan Reset</span>
                  </>
                )}
              </button>

              {approvedResetData.request.emailOrPhone && (
                <a
                  href={`https://wa.me/${approvedResetData.request.emailOrPhone.replace(/[^0-9]/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(
                    `Halo @${approvedResetData.request.username}, permohonan reset kata sandi akun Aplikasi Digital Scoring IPSI Anda telah DISETUJUI oleh Super Admin.\n\nSilakan klik tautan berikut untuk membuat kata sandi baru Anda:\n${approvedResetData.link}\n\nToken Anda: ${approvedResetData.token}\n\nTerima kasih.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-emerald-400/40 shadow-lg cursor-pointer transition-all active:scale-[0.99] text-center"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim ke WhatsApp Pengguna ({approvedResetData.request.emailOrPhone})</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setShowResetApprovalModal(false)}
                className="w-full py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900 border border-purple-500/30 text-xs font-bold text-purple-300 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
