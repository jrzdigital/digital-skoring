/**
 * Dedicated Admin Panel Page (/admin)
 * For managing users/members, publishing web articles, and managing silat events
 * Built for PPSN 2025 PB IPSI System
 */

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  Calendar, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  EyeOff, 
  Search, 
  Filter, 
  LogIn, 
  LogOut, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle, 
  Save, 
  Share2, 
  Lock, 
  Key, 
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Award,
  Zap,
  Tag,
  Building,
  Phone,
  Mail,
  UserCheck,
  User,
  MapPin,
  Clock,
  Check,
  Shield,
  KeyRound,
  Copy,
  MessageSquare
} from "lucide-react";
import { UserAccount, UserRole, UserStatus } from "../../types";
import { SilatArticle, SilatEventInfo, ArticleCategory, PortalTab } from "../../types/portal";
import { authService, DEFAULT_USERS } from "../../services/authService";
import { otpService, OtpRecord, MASTER_OTP_CODES } from "../../services/otpService";
import { DEFAULT_ARTICLES, DEFAULT_EVENTS } from "../../data/berandaData";
import { sound } from "../../utils/sound";

interface AdminPanelPageProps {
  currentUser: UserAccount | null;
  onLoginSuccess: (user: UserAccount) => void;
  onLogout: () => void;
  onNavigateTab: (tab: PortalTab) => void;
}

const STORAGE_KEY_ARTICLES = "jrz_silat_user_articles";
const STORAGE_KEY_EVENTS = "jrz_silat_user_events";

export function AdminPanelPage({
  currentUser,
  onLoginSuccess,
  onLogout,
  onNavigateTab
}: AdminPanelPageProps) {
  // Hanya superadmin yang dapat mengakses panel admin utama
  const isSuperAdmin = currentUser && currentUser.role === "superadmin";

  // Admin Sub-Tab
  const [activeTab, setActiveTab] = useState<"MEMBERS" | "OTP" | "ARTICLES" | "EVENTS">("MEMBERS");

  // OTP Management State
  const [otpList, setOtpList] = useState<OtpRecord[]>([]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [copiedOtpId, setCopiedOtpId] = useState<string | null>(null);

  // State untuk edit data profil (pengguna non-superadmin)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFullName, setProfileFullName] = useState(currentUser?.fullName || "");
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || currentUser?.emailOrPhone || "");
  const [profileOrg, setProfileOrg] = useState(currentUser?.organization || "");
  const [profileCity, setProfileCity] = useState(currentUser?.city || "");
  const [profileSavedMsg, setProfileSavedMsg] = useState("");

  useEffect(() => {
    if (currentUser) {
      setProfileFullName(currentUser.fullName || "");
      setProfilePhone(currentUser.phone || currentUser.emailOrPhone || "");
      setProfileOrg(currentUser.organization || "");
      setProfileCity(currentUser.city || "");
    }
  }, [currentUser]);

  const handleSaveProfile = () => {
    if (!currentUser) return;
    sound.playClick();
    const updatedUser: UserAccount = {
      ...currentUser,
      fullName: profileFullName.trim() || currentUser.fullName,
      emailOrPhone: profilePhone.trim() || currentUser.emailOrPhone,
      phone: profilePhone.trim() || currentUser.phone,
      organization: profileOrg.trim() || currentUser.organization,
      city: profileCity.trim() || currentUser.city,
    };
    try {
      authService.saveSession(updatedUser);
      const cached = localStorage.getItem("ipsi_cloud_users_cache");
      if (cached) {
        const list: UserAccount[] = JSON.parse(cached);
        const idx = list.findIndex(u => u.id === updatedUser.id || u.username === updatedUser.username);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...updatedUser };
          localStorage.setItem("ipsi_cloud_users_cache", JSON.stringify(list));
        }
      }
    } catch {}
    onLoginSuccess(updatedUser);
    setProfileSavedMsg("Perubahan data profil berhasil disimpan!");
    setTimeout(() => {
      setProfileSavedMsg("");
      setIsEditingProfile(false);
    }, 1500);
  };

  const getRoleLabelIndo = (role?: string) => {
    switch (role) {
      case "superadmin": return "Super Administrator";
      case "admin": return "Administrator Operator";
      case "dewan": return "Dewan Pendekar / Hakim";
      case "juri": return "Wasit Juri";
      case "atlet": return "Atlet Pesilat";
      case "pelatih": return "Pelatih Kontingen";
      case "pembina": return "Pembina / Manajer Tim";
      case "asisten": return "Asisten Pertandingan";
      default: return "Pengguna Terdaftar";
    }
  };

  // -------------------------------------------------------------
  // LOGIN FORM STATE (FOR GATEWAY)
  // -------------------------------------------------------------
  const [loginUsername, setLoginUsername] = useState("jakaoktorian");
  const [loginPassword, setLoginPassword] = useState("Abuyaku21*");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError("Mohon masukkan username dan kata sandi!");
      return;
    }

    sound.playClick();
    setLoginLoading(true);
    setLoginError("");

    try {
      // Direct validation for user-specified credentials
      if (
        (loginUsername.trim() === "jakaoktorian" && loginPassword === "Abuyaku21*") ||
        (loginUsername.trim() === "admin" && loginPassword === "admin123")
      ) {
        const role: UserRole = loginUsername.trim() === "jakaoktorian" ? "superadmin" : "admin";
        const adminUser: UserAccount = {
          id: loginUsername.trim() === "jakaoktorian" ? "usr_superadmin" : "usr_admin",
          username: loginUsername.trim(),
          fullName: loginUsername.trim() === "jakaoktorian" ? "Jaka Oktorian (Super Admin)" : "Operator Utama Gelanggang",
          role: role,
          status: "APPROVED",
          organization: "Pengurus Besar IPSI",
          emailOrPhone: "jakaoktorian2@gmail.com",
          createdAt: Date.now(),
          approvedAt: Date.now(),
          approvedBy: "System Administrator"
        };

        sound.playVictory();
        authService.saveSession(adminUser);
        if (role === "superadmin") {
          setLoginSuccess("Login Superadmin berhasil! Membuka panel administrasi...");
        } else {
          setLoginSuccess("Login berhasil! Membuka data profil akun Anda...");
        }
        setTimeout(() => {
          onLoginSuccess(adminUser);
        }, 500);
        return;
      }

      // Check against authService
      const res = await authService.login(loginUsername.trim(), loginPassword);
      if (res.success && res.user) {
        sound.playVictory();
        authService.saveSession(res.user as UserAccount);
        if (res.user.role === "superadmin") {
          setLoginSuccess("Login Superadmin berhasil! Membuka panel administrasi...");
        } else {
          setLoginSuccess("Login berhasil! Membuka data profil akun Anda...");
        }
        setTimeout(() => {
          onLoginSuccess(res.user as UserAccount);
        }, 500);
      } else {
        setLoginError(res.error || "Username atau kata sandi tidak valid!");
      }
    } catch (err: any) {
      setLoginError("Gagal menghubungkan ke sistem autentikasi.");
    } finally {
      setLoginLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 1. DATA DAFTAR ANGGOTA (MEMBERS MANAGEMENT)
  // -------------------------------------------------------------
  const [members, setMembers] = useState<UserAccount[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("ALL");
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>("ALL");

  // Modal Tambah / Edit Anggota
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<UserAccount | null>(null);
  const [memberFullName, setMemberFullName] = useState("");
  const [memberUsername, setMemberUsername] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberRole, setMemberRole] = useState<UserRole>("admin");
  const [memberStatus, setMemberStatus] = useState<UserStatus>("APPROVED");
  const [memberOrg, setMemberOrg] = useState("");
  const [memberContact, setMemberContact] = useState("");

  const loadMembers = async () => {
    setMemberLoading(true);
    try {
      const all = await authService.getAllUsers();
      setMembers(all);
    } catch (e) {
      setMembers(DEFAULT_USERS);
    } finally {
      setMemberLoading(false);
    }
  };

  const loadOtps = async () => {
    setOtpLoading(true);
    try {
      const list = await otpService.getAllOtps();
      setOtpList(list);
    } catch (e) {
    } finally {
      setOtpLoading(false);
    }
  };

  const handleApproveOtp = async (identifier: string) => {
    sound.playClick();
    await otpService.approveOtpDirectly(identifier);
    sound.playVictory();
    await loadOtps();
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadMembers();
      loadOtps();
      // Auto-poll OTPs every 5s so superadmin sees new requests immediately
      const interval = setInterval(loadOtps, 5000);
      return () => clearInterval(interval);
    }
  }, [isSuperAdmin]);

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberFullName.trim() || !memberUsername.trim()) {
      alert("Nama Lengkap dan Username wajib diisi!");
      return;
    }

    sound.playClick();
    if (editingMember) {
      // Update existing
      await authService.updateUser({
        id: editingMember.id,
        fullName: memberFullName.trim(),
        role: memberRole,
        status: memberStatus,
        organization: memberOrg.trim(),
        emailOrPhone: memberContact.trim(),
        ...(memberPassword ? { password: memberPassword } : {})
      });
    } else {
      // Create new
      await authService.createUserByAdmin({
        fullName: memberFullName.trim(),
        username: memberUsername.trim().toLowerCase(),
        password: memberPassword || "123456",
        role: memberRole,
        status: memberStatus,
        organization: memberOrg.trim() || "IPSI",
        emailOrPhone: memberContact.trim(),
        createdBy: currentUser?.fullName || "Admin"
      });
    }

    setShowMemberModal(false);
    setEditingMember(null);
    loadMembers();
  };

  const handleDeleteMember = async (userId: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus anggota "${name}"?`)) {
      sound.playClick();
      await authService.deleteUser(userId);
      loadMembers();
    }
  };

  const handleToggleMemberStatus = async (user: UserAccount) => {
    sound.playClick();
    const newStatus: UserStatus = user.status === "APPROVED" ? "SUSPENDED" : "APPROVED";
    await authService.updateUser({
      id: user.id,
      status: newStatus
    });
    loadMembers();
  };

  // -------------------------------------------------------------
  // 2. DATA ARTIKEL WEB (ARTICLES & NEWS MANAGEMENT)
  // -------------------------------------------------------------
  const [articles, setArticles] = useState<SilatArticle[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_ARTICLES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_ARTICLES;
  });

  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<SilatArticle | null>(null);
  const [articleTitle, setArticleTitle] = useState("");
  const [articleCategory, setArticleCategory] = useState<ArticleCategory>("REGULASI");
  const [articleAuthor, setArticleAuthor] = useState("");
  const [articleAuthorRole, setArticleAuthorRole] = useState("");
  const [articleSummary, setArticleSummary] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const [articleImageUrl, setArticleImageUrl] = useState("");
  const [articleTags, setArticleTags] = useState("");
  const [articleToast, setArticleToast] = useState("");

  // Persist articles
  const saveArticles = (newArticles: SilatArticle[]) => {
    setArticles(newArticles);
    try {
      window.localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(newArticles));
    } catch (e) {}
  };

  const handleOpenNewArticleModal = () => {
    sound.playClick();
    setEditingArticle(null);
    setArticleTitle("");
    setArticleCategory("REGULASI");
    setArticleAuthor(currentUser?.fullName || "Sekretariat PB IPSI");
    setArticleAuthorRole("Tim Publikasi & Media Resmi");
    setArticleSummary("");
    setArticleContent("");
    setArticleImageUrl("https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80");
    setArticleTags("IPSI, PPSN 2025, Regulasi, Silat");
    setShowArticleModal(true);
  };

  const handleOpenEditArticleModal = (art: SilatArticle) => {
    sound.playClick();
    setEditingArticle(art);
    setArticleTitle(art.title);
    setArticleCategory(art.category);
    setArticleAuthor(art.author);
    setArticleAuthorRole(art.authorRole || "");
    setArticleSummary(art.summary);
    setArticleContent(art.content);
    setArticleImageUrl(art.imageUrl || "");
    setArticleTags(art.tags.join(", "));
    setShowArticleModal(true);
  };

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleTitle.trim() || !articleContent.trim()) {
      alert("Judul dan Konten Artikel wajib diisi!");
      return;
    }

    sound.playVictory();
    const tagArray = articleTags.split(",").map(t => t.trim()).filter(Boolean);

    if (editingArticle) {
      const updated = articles.map(a => 
        a.id === editingArticle.id ? {
          ...a,
          title: articleTitle.trim(),
          category: articleCategory,
          author: articleAuthor.trim(),
          authorRole: articleAuthorRole.trim() || undefined,
          summary: articleSummary.trim() || articleContent.slice(0, 140) + "...",
          content: articleContent.trim(),
          imageUrl: articleImageUrl.trim() || undefined,
          tags: tagArray.length > 0 ? tagArray : ["Silat"],
          readTimeMinutes: Math.max(2, Math.ceil(articleContent.length / 400))
        } : a
      );
      saveArticles(updated);
      setArticleToast("Artikel berhasil diperbarui dan dipublikasikan!");
    } else {
      const newArticle: SilatArticle = {
        id: "art-" + Date.now(),
        title: articleTitle.trim(),
        category: articleCategory,
        author: articleAuthor.trim() || "PB IPSI",
        authorRole: articleAuthorRole.trim() || "Dewan Redaksi",
        publishedAt: new Date().toISOString().split("T")[0],
        summary: articleSummary.trim() || articleContent.slice(0, 140) + "...",
        content: articleContent.trim(),
        imageUrl: articleImageUrl.trim() || "https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80",
        tags: tagArray.length > 0 ? tagArray : ["Silat"],
        readTimeMinutes: Math.max(2, Math.ceil(articleContent.length / 400)),
        likes: 0
      };
      saveArticles([newArticle, ...articles]);
      setArticleToast("Artikel baru berhasil diterbitkan langsung ke Web Beranda!");
    }

    setShowArticleModal(false);
    setTimeout(() => setArticleToast(""), 4000);
  };

  const handleDeleteArticle = (id: string, title: string) => {
    if (confirm(`Hapus artikel "${title}" dari portal publik?`)) {
      sound.playClick();
      const filtered = articles.filter(a => a.id !== id);
      saveArticles(filtered);
    }
  };

  // -------------------------------------------------------------
  // 3. DATA EVENT PENCAK SILAT (EVENT MANAGEMENT)
  // -------------------------------------------------------------
  const [events, setEvents] = useState<SilatEventInfo[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_EVENTS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return DEFAULT_EVENTS;
  });

  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SilatEventInfo | null>(null);
  const [eventName, setEventName] = useState("");
  const [eventLevel, setEventLevel] = useState<"DAERAH" | "WILAYAH" | "NASIONAL" | "INTERNASIONAL">("NASIONAL");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDates, setEventDates] = useState("");
  const [eventOrganizer, setEventOrganizer] = useState("");
  const [eventRegDeadline, setEventRegDeadline] = useState("");
  const [eventStatus, setEventStatus] = useState<"BUKA_PENDAFTARAN" | "SEGERA_BERAKHIR" | "SEDANG_BERLANGSUNG" | "SELESAI">("BUKA_PENDAFTARAN");
  const [eventContact, setEventContact] = useState("");
  const [eventPhone, setEventPhone] = useState("");
  const [eventArenaCount, setEventArenaCount] = useState(3);
  const [eventDescription, setEventDescription] = useState("");
  const [eventToast, setEventToast] = useState("");

  const saveEvents = (newEvents: SilatEventInfo[]) => {
    setEvents(newEvents);
    try {
      window.localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(newEvents));
    } catch (e) {}
  };

  const handleOpenNewEventModal = () => {
    sound.playClick();
    setEditingEvent(null);
    setEventName("");
    setEventLevel("NASIONAL");
    setEventLocation("GOR Ciracas, Jakarta Timur");
    setEventDates("10 - 15 November 2026");
    setEventOrganizer("Pengurus Besar IPSI");
    setEventRegDeadline("25 Oktober 2026");
    setEventStatus("BUKA_PENDAFTARAN");
    setEventContact("Sekretariat Panitia");
    setEventPhone("+62 812-3456-7890");
    setEventArenaCount(3);
    setEventDescription("Kejuaraan Resmi Pencak Silat Standar PPSN 2025 PB IPSI dengan Digital Scoring System.");
    setShowEventModal(true);
  };

  const handleOpenEditEventModal = (evt: SilatEventInfo) => {
    sound.playClick();
    setEditingEvent(evt);
    setEventName(evt.name);
    setEventLevel(evt.level);
    setEventLocation(evt.location);
    setEventDates(evt.dates);
    setEventOrganizer(evt.organizer);
    setEventRegDeadline(evt.registrationDeadline);
    setEventStatus(evt.status);
    setEventContact(evt.contactPerson);
    setEventPhone(evt.phone);
    setEventArenaCount(evt.arenaCount || 2);
    setEventDescription(evt.description);
    setShowEventModal(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim() || !eventDates.trim()) {
      alert("Nama Kejuaraan dan Tanggal Pelaksanaan wajib diisi!");
      return;
    }

    sound.playVictory();

    if (editingEvent) {
      const updated = events.map(ev => 
        ev.id === editingEvent.id ? {
          ...ev,
          name: eventName.trim(),
          level: eventLevel,
          location: eventLocation.trim(),
          dates: eventDates.trim(),
          organizer: eventOrganizer.trim(),
          registrationDeadline: eventRegDeadline.trim(),
          status: eventStatus,
          contactPerson: eventContact.trim(),
          phone: eventPhone.trim(),
          arenaCount: eventArenaCount,
          description: eventDescription.trim()
        } : ev
      );
      saveEvents(updated);
      setEventToast("Event turnamen berhasil diperbarui!");
    } else {
      const newEv: SilatEventInfo = {
        id: "evt-" + Date.now(),
        name: eventName.trim(),
        level: eventLevel,
        location: eventLocation.trim() || "Gelanggang Olahraga",
        dates: eventDates.trim(),
        organizer: eventOrganizer.trim() || "PB IPSI",
        registrationDeadline: eventRegDeadline.trim() || "Menjelang Event",
        status: eventStatus,
        contactPerson: eventContact.trim() || "Panitia Kejuaraan",
        phone: eventPhone.trim() || "+62 812-0000-0000",
        arenaCount: eventArenaCount,
        description: eventDescription.trim() || "Kejuaraan Resmi Pencak Silat Standar PPSN 2025 PB IPSI."
      };
      saveEvents([newEv, ...events]);
      setEventToast("Event baru berhasil ditambahkan dan dipublikasikan ke Web Beranda!");
    }

    setShowEventModal(false);
    setTimeout(() => setEventToast(""), 4000);
  };

  const handleDeleteEvent = (id: string, name: string) => {
    if (confirm(`Hapus event "${name}" dari agenda publik?`)) {
      sound.playClick();
      const filtered = events.filter(ev => ev.id !== id);
      saveEvents(filtered);
    }
  };

  // -------------------------------------------------------------
  // RENDER 1: GATE / LOGIN SCREEN (IF NOT LOGGED IN)
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Background ambient decorative shapes */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Back to Public Web Link */}
        <button
          onClick={() => {
            sound.playClick();
            onNavigateTab("BERANDA");
          }}
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Web Publik</span>
        </button>

        {/* Login Card */}
        <div className="w-full max-w-md bg-[#0b1329] border border-blue-500/40 rounded-3xl shadow-2xl shadow-blue-900/40 p-6 sm:p-8 relative z-10">
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-blue-500 to-amber-500 rounded-t-3xl -mt-6 sm:-mt-8 mb-6 mx-auto" />

          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-500 to-blue-600 p-0.5 shadow-xl shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#091024] rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-amber-400" />
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              Akses Sistem & Profil
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Login ID Superadmin untuk Panel Admin, atau login akun terdaftar untuk melihat Data Profil Pengguna
            </p>
          </div>

          {/* Feedback messages */}
          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {loginSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{loginSuccess}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                Username / ID Pengguna
              </label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="jakaoktorian / username"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-amber-400 text-white text-sm font-mono placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Kata sandi akun"
                  required
                  className="w-full px-4 pr-10 py-3 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-amber-400 text-white text-sm font-mono placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Autofill hint for superadmin */}
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
              <div className="text-[11px] text-amber-200/90">
                <span className="font-bold">ID Superadmin:</span> <code className="font-mono bg-amber-950/80 px-1 py-0.5 rounded text-amber-300">jakaoktorian</code>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setLoginUsername("jakaoktorian");
                  setLoginPassword("Abuyaku21*");
                }}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                Gunakan ID Ini
              </button>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/30 active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loginLoading ? "Memverifikasi..." : "Masuk ke Sistem"}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
            Sistem Digital Skoring Pencak Silat &bull; Standar PB IPSI 2025
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 2: DATA PROFIL PENGGUNA (UNTUK PENGGUNA SELAIN SUPERADMIN)
  // -------------------------------------------------------------
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans pb-12">
        {/* TOP BAR */}
        <header className="sticky top-0 z-40 bg-[#091124]/95 backdrop-blur-md border-b border-blue-500/30 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black shadow-md shadow-blue-500/20">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wide text-white uppercase">
                  Data Profil Pengguna
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 uppercase">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Laman informasi identitas akun & keanggotaan pengguna
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                onNavigateTab("BERANDA");
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Beranda</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onLogout();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/70 hover:bg-red-900/90 border border-red-800/80 text-red-200 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* MAIN PROFILE CONTENT */}
        <main className="max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
          {/* ACCESS NOTICE BANNER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-amber-200 uppercase tracking-wide">
                  Panel Administrasi Dibatasi Khusus Superadmin
                </h2>
                <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                  Kecuali akun dengan wewenang <strong className="text-amber-200">Superadmin</strong>, panel administrasi aplikasi diubah menjadi tampilan <strong className="text-white">Data Profil Pengguna</strong>. Di sini Anda dapat melihat dan mengelola identitas akun terdaftar Anda.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 uppercase tracking-wider">
              STATUS: AKTIF
            </span>
          </div>

          {profileSavedMsg && (
            <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 animate-fadeIn shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-bold">{profileSavedMsg}</span>
            </div>
          )}

          {/* PROFILE SUMMARY CARD */}
          <div className="bg-[#0b142c] border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-xl shadow-blue-600/30 flex items-center justify-center shrink-0">
                  <div className="w-full h-full bg-[#091024] rounded-[14px] flex items-center justify-center text-2xl font-black text-white">
                    {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : "U"}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
                    {currentUser.fullName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2.5 py-0.5 rounded-lg">
                      @{currentUser.username}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-300 bg-blue-950/70 border border-blue-800/50 px-2.5 py-0.5 rounded-lg uppercase">
                      {getRoleLabelIndo(currentUser.role)}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800/50 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" />
                      TERVERIFIKASI
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    sound.playClick();
                    setIsEditingProfile(!isEditingProfile);
                  }}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    isEditingProfile
                      ? "bg-slate-800 border-slate-600 text-slate-300 hover:text-white"
                      : "bg-blue-600 hover:bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-600/30"
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{isEditingProfile ? "Tutup Form Edit" : "Edit Profil"}</span>
                </button>
              </div>
            </div>

            {/* EDIT PROFILE FORM */}
            {isEditingProfile ? (
              <div className="mt-6 pt-2 space-y-4 animate-fadeIn">
                <h4 className="text-xs font-mono font-bold text-blue-300 uppercase tracking-wider flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  Formulir Pembaruan Data Profil
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      value={profileFullName}
                      onChange={(e) => setProfileFullName(e.target.value)}
                      placeholder="Nama lengkap sesuai KTP / ID"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-blue-400 text-white text-sm focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                      Kontingen / Perguruan / Organisasi
                    </label>
                    <input
                      type="text"
                      value={profileOrg}
                      onChange={(e) => setProfileOrg(e.target.value)}
                      placeholder="Nama kontingen / institusi"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-blue-400 text-white text-sm focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                      Nomor Telepon / WhatsApp / Email
                    </label>
                    <input
                      type="text"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="0812xxxx atau email"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-blue-400 text-white text-sm focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                      Kota / Kabupaten Domisili
                    </label>
                    <input
                      type="text"
                      value={profileCity}
                      onChange={(e) => setProfileCity(e.target.value)}
                      placeholder="Contoh: Banda Aceh, Jakarta Selatan"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-blue-400 text-white text-sm focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan</span>
                  </button>

                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsEditingProfile(false);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              /* DETAIL INFORMATION GRID */
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    Username / ID Sistem
                  </div>
                  <div className="text-sm font-mono font-bold text-white truncate">
                    {currentUser.username}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-amber-400" />
                    Kontingen / Perguruan
                  </div>
                  <div className="text-sm font-bold text-white truncate">
                    {currentUser.organization || "Pengurus Besar IPSI"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Kontak Telepon / Email
                  </div>
                  <div className="text-sm font-mono font-bold text-white truncate">
                    {currentUser.phone || currentUser.emailOrPhone || "Belum diisi"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    Kota / Wilayah Domisili
                  </div>
                  <div className="text-sm font-bold text-white truncate">
                    {currentUser.city || "Indonesia"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    Peran & Hak Akses
                  </div>
                  <div className="text-sm font-bold text-white uppercase truncate">
                    {getRoleLabelIndo(currentUser.role)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 space-y-1">
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Waktu Terdaftar
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-300">
                    {typeof currentUser.createdAt === "number"
                      ? new Date(currentUser.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })
                      : "Aktif Terverifikasi"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 3: AUTHENTICATED SUPERADMIN DASHBOARD (KHUSUS SUPERADMIN)
  // -------------------------------------------------------------
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.username.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.organization || "").toLowerCase().includes(memberSearch.toLowerCase());
    const matchesRole = memberRoleFilter === "ALL" || m.role === memberRoleFilter;
    const matchesStatus = memberStatusFilter === "ALL" || m.status === memberStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 flex flex-col font-sans pb-12">
      {/* 1. TOP ADMIN BAR */}
      <header className="sticky top-0 z-40 bg-[#091124]/95 backdrop-blur-md border-b border-blue-500/30 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-blue-600 text-slate-950 font-black shadow-md shadow-amber-500/20">
            <ShieldCheck className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wide text-white uppercase">
                Panel Admin Aplikasi
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SUPER ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Masuk sebagai: <span className="text-white font-bold">{currentUser?.fullName}</span> ({currentUser?.username})
            </p>
          </div>
        </div>

        {/* Action Controls in Top Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick jump to digital scoring without re-login */}
          <button
            onClick={() => {
              sound.playClick();
              onNavigateTab("TANDING");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs font-bold transition-all cursor-pointer shadow-md"
            title="Akses Langsung Skoring Tanding"
          >
            <Zap className="w-3.5 h-3.5 text-red-400" />
            <span>Skoring Tanding</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onNavigateTab("SENI");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer shadow-md"
            title="Akses Langsung Skoring Seni"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Skoring Seni</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onNavigateTab("BERANDA");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-500/40 text-cyan-300 text-xs font-bold transition-all cursor-pointer shadow-md"
            title="Lihat Web Beranda Publik"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span>Lihat Web</span>
          </button>

          <button
            onClick={() => {
              sound.playBuzzer();
              onLogout();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-md"
            title="Keluar dari Akun"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN SUB-TABS NAVIGATION */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-8 pt-6">
        <div className="flex flex-wrap gap-2 p-1.5 bg-[#091124] border border-blue-500/30 rounded-2xl shadow-lg mb-6">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab("MEMBERS");
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "MEMBERS"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kelola Daftar Anggota</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900/80 font-mono">
              {members.length}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab("OTP");
              loadOtps();
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "OTP"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/30 border border-amber-400/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Kode OTP Pengguna</span>
            {otpList.filter(o => o.status === "PENDING").length > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-extrabold font-mono animate-pulse">
                {otpList.filter(o => o.status === "PENDING").length} Baru
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900/80 font-mono text-slate-400">
                {otpList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab("ARTICLES");
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "ARTICLES"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tulis & Kelola Artikel Web</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900/80 font-mono">
              {articles.length}
            </span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab("EVENTS");
            }}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "EVENTS"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/40"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Tambah & Kelola Event</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900/80 font-mono">
              {events.length}
            </span>
          </button>
        </div>

        {/* Global Toasts */}
        {articleToast && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between animate-fadeIn shadow-lg">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold">{articleToast}</span>
            </div>
            <button
              onClick={() => onNavigateTab("BERANDA")}
              className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
            >
              Cek di Beranda
            </button>
          </div>
        )}

        {eventToast && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-950/70 border border-amber-500/50 text-amber-200 text-xs flex items-center justify-between animate-fadeIn shadow-lg">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">{eventToast}</span>
            </div>
            <button
              onClick={() => onNavigateTab("BERANDA")}
              className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-[11px] font-black cursor-pointer"
            >
              Cek Kalender Event
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: KELOLA DAFTAR ANGGOTA (USER MANAGEMENT) */}
        {/* ========================================================= */}
        {activeTab === "MEMBERS" && (
          <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-[#0b1329] border border-blue-500/20 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Daftar Anggota & Pengguna Sistem
                  </h2>
                  <p className="text-xs text-slate-400">
                    Kelola otorisasi panitia, dewan juri, pelatih, atlet, dan akun admin gelanggang
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={loadMembers}
                  disabled={memberLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-all"
                  title="Segarkan Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${memberLoading ? "animate-spin text-blue-400" : ""}`} />
                  <span>Segarkan</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setEditingMember(null);
                    setMemberFullName("");
                    setMemberUsername("");
                    setMemberPassword("");
                    setMemberRole("admin");
                    setMemberStatus("APPROVED");
                    setMemberOrg("");
                    setMemberContact("");
                    setShowMemberModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-blue-600/30 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Anggota Baru</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Cari nama, username, atau kontingen..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0b1329] border border-slate-700 focus:border-blue-400 text-white text-xs placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <select
                value={memberRoleFilter}
                onChange={(e) => setMemberRoleFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-[#0b1329] border border-slate-700 focus:border-blue-400 text-white text-xs focus:outline-none"
              >
                <option value="ALL">Semua Peran / Role</option>
                <option value="superadmin">Super Admin</option>
                <option value="admin">Operator Gelanggang</option>
                <option value="dewan">Dewan Pertandingan</option>
                <option value="juri">Wasit Juri</option>
                <option value="pelatih">Pelatih / Official</option>
                <option value="atlet">Atlet Pesilat</option>
                <option value="umum">Umum</option>
              </select>

              <select
                value={memberStatusFilter}
                onChange={(e) => setMemberStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-[#0b1329] border border-slate-700 focus:border-blue-400 text-white text-xs focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="APPROVED">Disetujui (Aktif)</option>
                <option value="PENDING">Menunggu Verifikasi</option>
                <option value="SUSPENDED">Ditangguhkan (Nonaktif)</option>
              </select>
            </div>

            {/* Table of Members */}
            <div className="bg-[#0b1329] border border-blue-500/20 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Nama Lengkap & Username</th>
                      <th className="py-3.5 px-4">Peran (Role)</th>
                      <th className="py-3.5 px-4">Kontingen / Instansi</th>
                      <th className="py-3.5 px-4">Kontak / Email</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-500">
                          Tidak ditemukan anggota sesuai filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              <span>{m.fullName}</span>
                              {m.role === "superadmin" && (
                                <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              )}
                            </div>
                            <div className="text-slate-400 font-mono text-[11px]">@{m.username}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                              m.role === "superadmin" 
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                                : m.role === "admin"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : m.role === "juri" || m.role === "dewan"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-slate-800 text-slate-300"
                            }`}>
                              {m.role}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-300">
                            {m.organization || "PB IPSI"}
                          </td>

                          <td className="py-3.5 px-4 text-slate-400 font-mono">
                            {m.emailOrPhone || "-"}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.status === "APPROVED"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                                : m.status === "PENDING"
                                ? "bg-amber-950 text-amber-300 border border-amber-500/30"
                                : "bg-red-950 text-red-300 border border-red-500/30"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                m.status === "APPROVED" ? "bg-emerald-400" : m.status === "PENDING" ? "bg-amber-400" : "bg-red-400"
                              }`} />
                              {m.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Toggle Activate / Suspend */}
                              <button
                                onClick={() => handleToggleMemberStatus(m)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                                title={m.status === "APPROVED" ? "Tangguhkan / Nonaktifkan" : "Setujui / Aktifkan"}
                              >
                                {m.status === "APPROVED" ? (
                                  <XCircle className="w-4 h-4 text-amber-400" />
                                ) : (
                                  <UserCheck className="w-4 h-4 text-emerald-400" />
                                )}
                              </button>

                              {/* Edit Member */}
                              <button
                                onClick={() => {
                                  sound.playClick();
                                  setEditingMember(m);
                                  setMemberFullName(m.fullName);
                                  setMemberUsername(m.username);
                                  setMemberPassword("");
                                  setMemberRole(m.role);
                                  setMemberStatus(m.status);
                                  setMemberOrg(m.organization || "");
                                  setMemberContact(m.emailOrPhone || "");
                                  setShowMemberModal(true);
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-900/60 text-blue-300 transition-all cursor-pointer"
                                title="Edit Anggota"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Delete Member (protected from deleting oneself) */}
                              {m.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleDeleteMember(m.id, m.fullName)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-rose-400 transition-all cursor-pointer"
                                  title="Hapus Anggota"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
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

        {/* ========================================================= */}
        {/* TAB: KELOLA KODE OTP PENGGUNA (OTP MANAGEMENT) */}
        {/* ========================================================= */}
        {activeTab === "OTP" && (
          <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-[#0b1329] border border-amber-500/20 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Verifikasi Kode OTP Pengguna Sistem
                  </h2>
                  <p className="text-xs text-slate-400">
                    Daftar kode OTP 6-digit untuk pendaftaran akun baru atau login Gmail yang perlu diberikan oleh Superadmin
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={loadOtps}
                  disabled={otpLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-all"
                  title="Segarkan Data OTP"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${otpLoading ? "animate-spin text-amber-400" : ""}`} />
                  <span>Segarkan Data</span>
                </button>
              </div>
            </div>

            {/* Master OTP Info Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-amber-200">
                    Master OTP Bypass Superadmin
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Superadmin juga dapat memberikan atau menggunakan kode master ini untuk verifikasi langsung tanpa batasan waktu:
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-amber-900/60 border border-amber-400/50 text-amber-300 font-mono font-bold text-sm tracking-wider">
                  992811
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-600 text-slate-300 font-mono font-bold text-sm tracking-wider">
                  123456
                </div>
              </div>
            </div>

            {/* OTP Records Table */}
            <div className="bg-[#0b1329] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Pengguna / Akun</th>
                      <th className="py-3 px-4">Jenis Permintaan</th>
                      <th className="py-3 px-4">Kode OTP</th>
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aksi Superadmin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {otpList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          Belum ada permintaan kode OTP dari pengguna saat ini.
                        </td>
                      </tr>
                    ) : (
                      otpList.map((otp) => {
                        const isPending = otp.status === "PENDING";
                        const isCopied = copiedOtpId === otp.id;

                        return (
                          <tr key={otp.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white">
                                {otp.identifier}
                              </div>
                              {otp.payload?.fullName && (
                                <div className="text-[11px] text-slate-400">
                                  {otp.payload.fullName}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                otp.type === "GMAIL_LOGIN"
                                  ? "bg-rose-500/10 border border-rose-500/30 text-rose-300"
                                  : "bg-blue-500/10 border border-blue-500/30 text-blue-300"
                              }`}>
                                {otp.type === "GMAIL_LOGIN" ? "Login Gmail" : "Pendaftaran Baru"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-base font-extrabold tracking-widest text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-500/30">
                                  {otp.code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(otp.code);
                                    setCopiedOtpId(otp.id);
                                    sound.playClick();
                                    setTimeout(() => setCopiedOtpId(null), 2000);
                                  }}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                  title="Salin Kode OTP"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                              {new Date(otp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              <span className="block text-[10px] text-slate-500">
                                {new Date(otp.createdAt).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isPending
                                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-300"
                                  : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                              }`}>
                                {isPending ? <Clock className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                <span>{isPending ? "Menunggu Verifikasi" : "Terverifikasi"}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <a
                                  href={`https://wa.me/?text=${encodeURIComponent(
                                    `Halo! Kode OTP JRZ SCORE untuk akun Anda (${otp.identifier}) adalah: *${otp.code}*. Silakan masukkan kode ini di menu verifikasi OTP.`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] transition-colors cursor-pointer"
                                  title="Kirim Kode via WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3 text-emerald-400" />
                                  <span>Kirim WA</span>
                                </a>

                                {isPending && (
                                  <button
                                    onClick={() => handleApproveOtp(otp.identifier)}
                                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition-colors cursor-pointer"
                                    title="Setujui dan Verifikasi Langsung"
                                  >
                                    Verifikasi Langsung
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: TULIS & KELOLA ARTIKEL WEB (ARTICLES MANAGEMENT) */}
        {/* ========================================================= */}
        {activeTab === "ARTICLES" && (
          <div className="space-y-6">
            <div className="bg-[#0b1329] border border-blue-500/20 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Publikasi Artikel & Berita Web Pencak Silat
                  </h2>
                  <p className="text-xs text-slate-400">
                    Tulis artikel regulasi PPSN 2025, tips tanding, teknik seni, dan wawasan silat langsung ke halaman Beranda
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenNewArticleModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-500/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tulis Artikel Baru</span>
              </button>
            </div>

            {/* List of Published Articles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {articles.map((art) => (
                <div 
                  key={art.id} 
                  className="bg-[#0b1329] border border-slate-800 hover:border-blue-500/40 rounded-2xl p-4 shadow-lg flex flex-col justify-between group transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-cyan-300 border border-blue-500/30">
                        {art.category}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {art.publishedAt}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                      {art.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {art.summary}
                    </p>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Penulis: <strong className="text-slate-300">{art.author}</strong></span>
                      <span>&bull;</span>
                      <span>{art.readTimeMinutes} mnt baca</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Terbit di Web</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditArticleModal(art)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-900/50 text-blue-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteArticle(art.id, art.title)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-400 text-xs font-bold transition-all cursor-pointer"
                        title="Hapus Artikel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: TAMBAH & KELOLA EVENT SILAT (EVENT MANAGEMENT) */}
        {/* ========================================================= */}
        {activeTab === "EVENTS" && (
          <div className="space-y-6">
            <div className="bg-[#0b1329] border border-blue-500/20 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Kelola Agenda Kejuaraan & Event Pencak Silat
                  </h2>
                  <p className="text-xs text-slate-400">
                    Tambahkan kejuaraan baru, jadwal pendaftaran, dan informasi kontak penyelenggara ke Beranda
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenNewEventModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-blue-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Event Baru</span>
              </button>
            </div>

            {/* List of Events */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((ev) => (
                <div 
                  key={ev.id} 
                  className="bg-[#0b1329] border border-slate-800 hover:border-blue-500/40 rounded-2xl p-5 shadow-lg flex flex-col justify-between group transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {ev.level}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        ev.status === "BUKA_PENDAFTARAN" ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30" : "bg-slate-800 text-slate-300"
                      }`}>
                        {ev.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                      {ev.name}
                    </h3>

                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>{ev.dates}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Building className="w-3.5 h-3.5 text-amber-400" />
                        <span>{ev.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{ev.contactPerson} ({ev.phone})</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed pt-1">
                      {ev.description}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">
                      Batas Daftar: <strong className="text-white">{ev.registrationDeadline}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditEventModal(ev)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-blue-900/50 text-blue-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteEvent(ev.id, ev.name)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-400 text-xs font-bold transition-all cursor-pointer"
                        title="Hapus Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: TAMBAH / EDIT ANGGOTA */}
      {/* ========================================================= */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0b1329] border border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>{editingMember ? "Edit Anggota" : "Tambah Anggota Baru"}</span>
              </h3>
              <button
                onClick={() => setShowMemberModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={memberFullName}
                  onChange={(e) => setMemberFullName(e.target.value)}
                  placeholder="Contoh: Muhammad Yusuf, S.Pd"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    value={memberUsername}
                    onChange={(e) => setMemberUsername(e.target.value)}
                    placeholder="yusuf_silat"
                    required
                    disabled={!!editingMember}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-400 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Kata Sandi {editingMember ? "(Kosongkan jika tak diubah)" : "*"}
                  </label>
                  <input
                    type="password"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    placeholder={editingMember ? "••••••••" : "Min. 6 karakter"}
                    required={!editingMember}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Peran / Role</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                  >
                    <option value="admin">Operator Gelanggang</option>
                    <option value="dewan">Dewan Pertandingan</option>
                    <option value="juri">Wasit Juri</option>
                    <option value="pelatih">Pelatih / Official</option>
                    <option value="atlet">Atlet</option>
                    <option value="superadmin">Super Admin</option>
                    <option value="umum">Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Status Akun</label>
                  <select
                    value={memberStatus}
                    onChange={(e) => setMemberStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                  >
                    <option value="APPROVED">APPROVED (Disetujui)</option>
                    <option value="PENDING">PENDING (Menunggu)</option>
                    <option value="SUSPENDED">SUSPENDED (Ditangguhkan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Kontingen / Instansi / Perguruan</label>
                <input
                  type="text"
                  value={memberOrg}
                  onChange={(e) => setMemberOrg(e.target.value)}
                  placeholder="IPSI Pengda Jawa Timur / Tapak Suci"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email / No. WhatsApp</label>
                <input
                  type="text"
                  value={memberContact}
                  onChange={(e) => setMemberContact(e.target.value)}
                  placeholder="08123456789 atau email@domain.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer shadow-md"
                >
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: TULIS / EDIT ARTIKEL */}
      {/* ========================================================= */}
      {showArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0b1329] border border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span>{editingArticle ? "Edit Artikel Web" : "Tulis Artikel Baru"}</span>
              </h3>
              <button
                onClick={() => setShowArticleModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Judul Artikel *</label>
                <input
                  type="text"
                  value={articleTitle}
                  onChange={(e) => setArticleTitle(e.target.value)}
                  placeholder="Contoh: Analisis Kunci Kemenangan Kategori Tanding Menurut PPSN 2025"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Kategori Artikel</label>
                  <select
                    value={articleCategory}
                    onChange={(e) => setArticleCategory(e.target.value as ArticleCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                  >
                    <option value="REGULASI">REGULASI (PPSN 2025)</option>
                    <option value="TEKNIK">TEKNIK (Bantingan/Kuncian)</option>
                    <option value="TIPS_ATLET">TIPS ATLET & FISIK</option>
                    <option value="EVENT">EVENT & KEJUARAAN</option>
                    <option value="SEJARAH">SEJARAH & BUDAYA</option>
                    <option value="UMUM">UMUM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nama Penulis</label>
                  <input
                    type="text"
                    value={articleAuthor}
                    onChange={(e) => setArticleAuthor(e.target.value)}
                    placeholder="Nama Anda atau Lembaga"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Ringkasan Singkat (Summary)</label>
                <input
                  type="text"
                  value={articleSummary}
                  onChange={(e) => setArticleSummary(e.target.value)}
                  placeholder="Ringkasan 1-2 kalimat untuk kartu di Beranda"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Konten Lengkap Artikel *</label>
                <textarea
                  rows={6}
                  value={articleContent}
                  onChange={(e) => setArticleContent(e.target.value)}
                  placeholder="Tuliskan isi artikel lengkap di sini. Mendukung paragraf, poin, dan penjelasan rinci..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">URL Gambar Thumbnail</label>
                  <input
                    type="url"
                    value={articleImageUrl}
                    onChange={(e) => setArticleImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tags (Koma terpisah)</label>
                  <input
                    type="text"
                    value={articleTags}
                    onChange={(e) => setArticleTags(e.target.value)}
                    placeholder="IPSI, PPSN 2025, Regulasi, Jatuhan"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowArticleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Publikasikan ke Web
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: TAMBAH / EDIT EVENT */}
      {/* ========================================================= */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#0b1329] border border-blue-500/40 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                <span>{editingEvent ? "Edit Event Kejuaraan" : "Tambah Event Kejuaraan Baru"}</span>
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Kejuaraan / Turnamen *</label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Contoh: Kejuaraan Nasional Pencak Silat Piala Menpora 2026"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tingkat Kejuaraan</label>
                  <select
                    value={eventLevel}
                    onChange={(e) => setEventLevel(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                  >
                    <option value="NASIONAL">NASIONAL</option>
                    <option value="WILAYAH">WILAYAH / PROVINSI</option>
                    <option value="DAERAH">DAERAH / KOTA</option>
                    <option value="INTERNASIONAL">INTERNASIONAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Status Pendaftaran</label>
                  <select
                    value={eventStatus}
                    onChange={(e) => setEventStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none"
                  >
                    <option value="BUKA_PENDAFTARAN">Buka Pendaftaran</option>
                    <option value="SEGERA_BERAKHIR">Segera Berakhir</option>
                    <option value="SEDANG_BERLANGSUNG">Sedang Berlangsung</option>
                    <option value="SELESAI">Selesai</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Lokasi GOR / Kota *</label>
                  <input
                    type="text"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="GOR Ciracas, Jakarta Timur"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tanggal Pelaksanaan *</label>
                  <input
                    type="text"
                    value={eventDates}
                    onChange={(e) => setEventDates(e.target.value)}
                    placeholder="14 - 18 Oktober 2026"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Penyelenggara</label>
                  <input
                    type="text"
                    value={eventOrganizer}
                    onChange={(e) => setEventOrganizer(e.target.value)}
                    placeholder="PB IPSI & Kemenpora RI"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Batas Akhir Pendaftaran</label>
                  <input
                    type="text"
                    value={eventRegDeadline}
                    onChange={(e) => setEventRegDeadline(e.target.value)}
                    placeholder="25 September 2026"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Narahubung (Contact Person)</label>
                  <input
                    type="text"
                    value={eventContact}
                    onChange={(e) => setEventContact(e.target.value)}
                    placeholder="Bpk. Rian Hidayat, M.Pd"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">No. WhatsApp / Telepon</label>
                  <input
                    type="text"
                    value={eventPhone}
                    onChange={(e) => setEventPhone(e.target.value)}
                    placeholder="+62 812-3456-7890"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Deskripsi & Ketentuan Kejuaraan</label>
                <textarea
                  rows={3}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Kejuaraan resmi berskala nasional memperebutkan piala bergilir dengan kategori usia dini hingga dewasa..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-400 leading-relaxed font-sans"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  Publikasikan Event ke Web
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
