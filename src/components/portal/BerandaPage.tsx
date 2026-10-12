import React, { useState, useEffect } from "react";
import { PortalTab, SilatArticle, SilatEventInfo, ArticleCategory } from "../../types/portal";
import { DEFAULT_ARTICLES, DEFAULT_EVENTS, APP_SYSTEM_SPECS } from "../../data/berandaData";
import { sound } from "../../utils/sound";
import { subscribeToAllArenasMatches, isMatchOngoing } from "../../services/firebase";
import { MatchState, MatchStatus, UserAccount } from "../../types";

interface BerandaPageProps {
  onNavigateTab: (tab: PortalTab, subTab?: "ATLET" | "TIMBANG" | "BAGAN" | "JADWAL" | "MEDALI") => void;
  selectedArena: string;
  onSelectArena?: (arena: string) => void;
  currentUser?: UserAccount | null;
  onOpenSignModal?: (notice?: string, isRestricted?: boolean) => void;
}

const STORAGE_KEY_ARTICLES = "jrz_silat_user_articles";

export function BerandaPage({ 
  onNavigateTab, 
  selectedArena, 
  onSelectArena,
  currentUser,
  onOpenSignModal 
}: BerandaPageProps) {
  // Real-time active arenas match data from Firebase RTDB
  const [arenasMatches, setArenasMatches] = useState<Record<string, MatchState | null>>({});
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Monitor selector modal state
  const [showMonitorModal, setShowMonitorModal] = useState(false);
  const [monitorModalArena, setMonitorModalArena] = useState<string>("A");

  const handleOpenMonitor = (arena: string, targetMonitor: "MONITOR_TANDING" | "MONITOR_SENI") => {
    sound.playClick();
    if (onSelectArena) onSelectArena(arena);
    onNavigateTab(targetMonitor);
  };

  const handleOpenMonitorChoice = (arena: string = selectedArena || "A") => {
    sound.playClick();
    setMonitorModalArena(arena);
    setShowMonitorModal(true);
  };

  useEffect(() => {
    const unsubscribe = subscribeToAllArenasMatches((arenasMap) => {
      setArenasMatches(arenasMap);
      setIsFirebaseConnected(true);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Filter ONLY arenas that currently have an ongoing/active match
  const activeOngoingArenas = (Object.entries(arenasMatches) as [string, MatchState | null][])
    .filter(([_, match]) => isMatchOngoing(match))
    .map(([arenaKey, match]) => ({
      arena: arenaKey,
      match: match as MatchState
    }))
    .sort((a, b) => a.arena.localeCompare(b.arena));

  // Helper format mm:ss
  const formatTimeLeft = (seconds?: number) => {
    const s = typeof seconds === "number" ? Math.max(0, seconds) : 0;
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Articles state with localStorage fallback
  const [articles, setArticles] = useState<SilatArticle[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_ARTICLES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_ARTICLES;
  });

  // Events state with localStorage fallback
  const STORAGE_KEY_EVENTS = "jrz_silat_user_events";
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

  // Reload articles & events when window regains focus (e.g., published from admin panel)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedArts = window.localStorage.getItem(STORAGE_KEY_ARTICLES);
        if (savedArts) {
          const parsed = JSON.parse(savedArts);
          if (Array.isArray(parsed) && parsed.length > 0) setArticles(parsed);
        }
        const savedEvts = window.localStorage.getItem(STORAGE_KEY_EVENTS);
        if (savedEvts) {
          const parsed = JSON.parse(savedEvts);
          if (Array.isArray(parsed) && parsed.length > 0) setEvents(parsed);
        }
      } catch (e) {}
    };

    window.addEventListener("focus", handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("focus", handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Filter & Search states
  const [articleSearch, setArticleSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  
  // Modals state
  const [readingArticle, setReadingArticle] = useState<SilatArticle | null>(null);
  const [showAddArticleModal, setShowAddArticleModal] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState<SilatEventInfo | null>(null);
  const [eventFilterLevel, setEventFilterLevel] = useState<string>("ALL");

  // Form state for new article
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<ArticleCategory>("REGULASI");
  const [formAuthor, setFormAuthor] = useState("");
  const [formAuthorRole, setFormAuthorRole] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formError, setFormError] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState("");

  // Persist articles when changed
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_ARTICLES, JSON.stringify(articles));
    } catch (e) {
      // ignore
    }
  }, [articles]);

  // Handle Like Article
  const handleLikeArticle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    setArticles(prev => prev.map(art => {
      if (art.id === id) {
        return { ...art, likes: (art.likes || 0) + 1 };
      }
      return art;
    }));
  };

  // Handle Add Article Submit
  const handleAddArticleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formTitle.trim()) {
      setFormError("Judul artikel tidak boleh kosong");
      return;
    }
    if (!formAuthor.trim()) {
      setFormError("Nama penulis artikel wajib diisi");
      return;
    }
    if (!formSummary.trim()) {
      setFormError("Ringkasan artikel wajib diisi");
      return;
    }
    if (!formContent.trim()) {
      setFormError("Isi lengkap artikel tidak boleh kosong");
      return;
    }

    const tagsArray = formTags
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const newArticle: SilatArticle = {
      id: `art-${Date.now()}`,
      title: formTitle.trim(),
      category: formCategory,
      author: formAuthor.trim(),
      authorRole: formAuthorRole.trim() || "Kontributor Silat",
      publishedAt: new Date().toISOString().split("T")[0],
      summary: formSummary.trim(),
      content: formContent.trim(),
      imageUrl: formImageUrl.trim() || "https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80",
      readTimeMinutes: Math.max(2, Math.ceil(formContent.split(" ").length / 150)),
      tags: tagsArray.length > 0 ? tagsArray : ["Pencak Silat", "Informasi"],
      likes: 1
    };

    sound.playScore();
    setArticles([newArticle, ...articles]);
    setShowAddArticleModal(false);
    
    // Reset form
    setFormTitle("");
    setFormAuthor("");
    setFormAuthorRole("");
    setFormSummary("");
    setFormContent("");
    setFormImageUrl("");
    setFormTags("");

    setShowSuccessToast("Artikel berhasil dipublikasikan ke Portal Silat!");
    setTimeout(() => setShowSuccessToast(""), 4000);
  };

  // Filtered Articles
  const filteredArticles = articles.filter(art => {
    const matchCat = selectedCategory === "ALL" || art.category === selectedCategory;
    const matchSearch = articleSearch.trim() === "" || 
      art.title.toLowerCase().includes(articleSearch.toLowerCase()) ||
      art.summary.toLowerCase().includes(articleSearch.toLowerCase()) ||
      art.author.toLowerCase().includes(articleSearch.toLowerCase()) ||
      art.tags.some(t => t.toLowerCase().includes(articleSearch.toLowerCase()));
    return matchCat && matchSearch;
  });

  // Filtered Events
  const filteredEvents = events.filter(evt => {
    return eventFilterLevel === "ALL" || evt.level === eventFilterLevel;
  });

  return (
    <div className="w-full bg-[#070d1e] text-slate-100 min-h-screen pb-20">
      
      {/* SUCCESS TOAST NOTIFICATION */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400/30 animate-bounce">
          <span className="font-semibold text-sm">{showSuccessToast}</span>
        </div>
      )}

      {/* 1. HERO BANNER & HEADLINE (GRID UTAMA PUSAT INFORMASI & SKORING TURNAMEN SILAT) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0b1633] via-[#091126] to-[#070d1e] border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.12),rgba(255,255,255,0))] pointer-events-none" />
        
        {/* GRID UTAMA PUSAT INFORMASI & SKORING TURNAMEN SILAT DENGAN BACKGROUND WATERMARK */}
        <div className="max-w-7xl mx-auto relative rounded-3xl border border-blue-500/30 bg-[#08122a]/75 p-6 sm:p-8 lg:p-10 shadow-2xl shadow-black/80 overflow-hidden backdrop-blur-md">
          {/* WATERMARK BACKGROUND DENGAN EFFECT BAYANG-BAYANG DINAMIS & TERKUNCI DIDALAM GRID */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 rounded-3xl">
            {/* Gambar Watermark Turnamen Silat (IMG_4754.JPG.jpeg) */}
            <img 
              src="/IMG_4754.JPG.jpeg" 
              alt="Watermark Turnamen Silat"
              className="w-full h-full object-cover object-center opacity-40 mix-blend-luminosity scale-105 filter contrast-125 brightness-95 transition-all duration-700"
            />
            
            {/* Lapisan Bayang-Bayang Dinamis (Vignette & Gradient Shadow) agar tidak melewati grid & menyatu artistik */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#08122a]/85 via-[#08122a]/40 to-[#08122a]/50" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08122a]/90 via-transparent to-[#08122a]/60" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(8,18,42,0.75)_95%)]" />
            
            {/* Deep Inset Box Shadow di sekeliling pinggiran grid */}
            <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.95),inset_0_0_30px_rgba(15,23,42,0.8)]" />
            
            {/* Efek Pendar Cahaya Halus & Bayangan Dinamis */}
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-semibold tracking-wide uppercase backdrop-blur-md shadow-sm">
                Sistem Kejuaraan & Skoring Digital Resmi IPSI
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md">
                Pusat Informasi & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">Skoring Turnamen Silat</span>
              </h1>
              <p className="text-slate-200 text-base sm:text-lg leading-relaxed max-w-2xl drop-shadow-sm font-medium">
                Solusi all-in-one kejuaraan silat nusantara: pemantauan skor realtime, administrasi berkas atlet, bagan turnamen, regulasi resmi PPSN 2025 PB IPSI & PERSILAT, kalender kejuaraan, serta artikel terkurasi.
              </p>
            </div>

            {/* Quick Live Stats Card (Status Gelanggang Transparan dengan Efek Frosted Glass agar watermark terlihat) */}
            <div className="bg-slate-950/45 backdrop-blur-md border border-blue-400/25 rounded-2xl p-6 shadow-2xl shadow-black/70 lg:w-96 flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Status Gelanggang</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                  activeOngoingArenas.length > 0 
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                    : "bg-slate-800/80 text-slate-300 border-slate-700"
                }`}>
                  {activeOngoingArenas.length > 0 ? `${activeOngoingArenas.length} Gelanggang Berlangsung` : "Standby (0 Aktif)"}
                </span>
              </div>

              {activeOngoingArenas.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {activeOngoingArenas.slice(0, 2).map(({ arena, match }) => (
                    <div key={`hero-arena-${arena}`} className="bg-slate-900/50 backdrop-blur-sm p-3 rounded-xl border border-emerald-500/30">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-emerald-400 font-bold">Gelanggang {arena}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <p className="text-base font-extrabold text-white mt-0.5 truncate">{match.matchNumber || "Partai Aktif"}</p>
                      <span className="text-[10px] text-amber-300 font-semibold truncate block">
                        Babak {match.activeRound} • {match.scoreRed} - {match.scoreBlue}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900/50 backdrop-blur-sm p-3.5 rounded-xl border border-slate-700/50 text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Semua Gelanggang Standby
                  </div>
                  <p className="text-xs text-slate-200 font-medium">Belum ada pertandingan berlangsung</p>
                  <p className="text-[10px] text-slate-400">Menunggu aba-aba Dewan / Sekretaris di Firebase</p>
                </div>
              )}

              <div className="space-y-2 pt-1 text-xs text-slate-300">
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Atlet Terdaftar:</span>
                  <span className="font-bold text-white">128 Pesilat</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Regulasi Pertandingan:</span>
                  <span className="font-bold text-amber-300">PPSN 2025 PB IPSI</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400">Sistem Sinkronisasi:</span>
                  <span className="font-bold text-emerald-400">Firebase RTDB Realtime</span>
                </div>
              </div>

              <button
                onClick={() => handleOpenMonitorChoice(selectedArena || "A")}
                className="w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-950/40 cursor-pointer border border-red-500/30"
              >
                <span>Buka Monitor Skoring Arena</span>
              </button>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => handleOpenMonitor(selectedArena || "A", "MONITOR_TANDING")}
                  className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  title="Buka Layar Monitor Kategori Tanding (Scoreboard)"
                >
                  <span>Monitor Tanding</span>
                </button>
                <button
                  onClick={() => handleOpenMonitor(selectedArena || "A", "MONITOR_SENI")}
                  className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  title="Buka Layar Monitor Kategori Seni (TGR)"
                >
                  <span>Monitor Seni</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-16">

        {/* ============================================================ */}
        {/* BAGIAN 1: INFORMASI PERTANDINGAN                             */}
        {/* ============================================================ */}
        <section id="informasi-pertandingan" className="scroll-mt-32 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Informasi Pertandingan</h2>
              <p className="text-sm text-slate-400 mt-1">
                Ikhtisar partai tanding dan peragaan seni yang sedang berlangsung, monitor arena, dan jadwal partai kejuaraan.
              </p>
            </div>
          </div>

          {/* Cards Arena Pertandingan Live / Conditional Real-time Display */}
          {activeOngoingArenas.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xl">
              <div className="max-w-md space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-bold border border-slate-700 mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  MONITOR GELANGGANG STANDBY
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Belum Ada Pertandingan yang Sedang Berlangsung
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Saat ini belum ada partai tanding maupun peragaan seni yang sedang aktif berjalan di sistem digital skoring (Firebase Realtime Database). Data skor pertandingan, babak, sisa waktu, dan statistik atlet akan otomatis tampil di sini secara *real-time* begitu pertandingan dimulai oleh Dewan atau Sekretaris Pertandingan.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => handleOpenMonitor("A", "MONITOR_TANDING")}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-950/40 transition-all cursor-pointer"
                  title="Buka Layar Monitor Scoreboard Gelanggang A"
                >
                  Pantau Gelanggang A (Monitor Tanding)
                </button>
                <button
                  onClick={() => handleOpenMonitor("A", "MONITOR_SENI")}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                  title="Buka Layar Monitor Seni Gelanggang A"
                >
                  Pantau Gelanggang A (Monitor Seni)
                </button>
                <button
                  onClick={() => handleOpenMonitorChoice("A")}
                  className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                  title="Buka Pilihan Monitor Arena Lainnya"
                >
                  Pilih Monitor Arena Lainnya
                </button>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                <span>Terhubung ke Firebase RTDB • Regulasi PPSN 2025 PB IPSI Aktif</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeOngoingArenas.map(({ arena, match }) => {
                const isRunning = match.status === MatchStatus.RUNNING || (match.status as any) === "RUNNING";
                const isPaused = match.status === MatchStatus.PAUSED || (match.status as any) === "PAUSED";

                return (
                  <div 
                    key={`live-arena-${arena}`} 
                    className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col"
                  >
                    <div className="bg-slate-950/80 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? "bg-emerald-500 animate-ping" : isPaused ? "bg-amber-400" : "bg-blue-400"}`} />
                        <span className="font-bold text-sm text-white">
                          GELANGGANG {arena} - {match.matchNumber || "Partai Berlangsung"}
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-extrabold border ${
                        isRunning 
                          ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse" 
                          : isPaused 
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      }`}>
                        {isRunning ? `BABAK ${match.activeRound}` : isPaused ? `JEDA BABAK ${match.activeRound}` : `ISTIRAHAT RONDE ${match.activeRound}`}
                      </span>
                    </div>

                    <div className="p-5 flex-grow space-y-4">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="truncate max-w-[65%] font-medium">
                          {match.classCategory || match.eventName || "Tanding Kelas Silat"}
                        </span>
                        <span className="flex items-center gap-1 text-slate-200 font-mono font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {formatTimeLeft(match.timeLeft)}
                        </span>
                      </div>

                      {/* Matchup visual */}
                      <div className="grid grid-cols-2 gap-3 items-center">
                        <div className="bg-red-950/40 p-3.5 rounded-xl border border-red-800/40 text-left relative overflow-hidden">
                          <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">SUDUT MERAH</span>
                          <h4 className="font-bold text-sm text-white mt-0.5 truncate">{match.fighterRedName || "Sudut Merah"}</h4>
                          <p className="text-[11px] text-red-300/80 truncate">{match.fighterRedClub || "Kontingen Merah"}</p>
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-3xl font-black text-red-400 font-mono">{match.scoreRed ?? 0}</span>
                            <span className="text-[10px] font-semibold text-red-300/70 bg-red-900/30 px-1.5 py-0.5 rounded border border-red-800/30">
                              Jatuhan: {match.redStats?.drops || 0}
                            </span>
                          </div>
                        </div>

                        <div className="bg-blue-950/40 p-3.5 rounded-xl border border-blue-800/40 text-right relative overflow-hidden">
                          <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">SUDUT BIRU</span>
                          <h4 className="font-bold text-sm text-white mt-0.5 truncate">{match.fighterBlueName || "Sudut Biru"}</h4>
                          <p className="text-[11px] text-blue-300/80 truncate">{match.fighterBlueClub || "Kontingen Biru"}</p>
                          <div className="mt-2 flex items-baseline justify-between flex-row-reverse">
                            <span className="text-3xl font-black text-blue-400 font-mono">{match.scoreBlue ?? 0}</span>
                            <span className="text-[10px] font-semibold text-blue-300/70 bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-800/30">
                              Jatuhan: {match.blueStats?.drops || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
                        <span className="text-[11px] text-slate-400">
                          Standar: <strong className="text-amber-400">PPSN 2025 PB IPSI</strong>
                        </span>
                        <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Live RTDB Sync
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-mono">
                        Pukulan +1 • Tendangan +2 • Bantingan +3
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenMonitor(arena, "MONITOR_TANDING")}
                          className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-red-950/40 cursor-pointer"
                          title={`Buka Layar Monitor Kategori Tanding (Gelanggang ${arena})`}
                        >
                          Pantau Gelanggang {arena}
                        </button>
                        <button
                          onClick={() => handleOpenMonitor(arena, "MONITOR_SENI")}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                          title={`Buka Layar Monitor Kategori Seni (Gelanggang ${arena})`}
                        >
                          <span>Seni</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>


        {/* ============================================================ */}
        {/* BAGIAN 2: INFORMASI APLIKASI PERTANDINGAN                    */}
        {/* ============================================================ */}
        <section id="informasi-aplikasi" className="scroll-mt-32 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Informasi Sistem & Aplikasi Pertandingan</h2>
              <p className="text-sm text-slate-400 mt-1">
                Kepatuhan teknis regulasi resmi, arsitektur sinkronisasi sub-milidetik, dan panduan operasional sistem skoring silat.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-amber-400 font-semibold">
                {APP_SYSTEM_SPECS.version}
              </span>
            </div>
          </div>

          {/* Fitur Utama Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 hover:border-amber-500/30 transition-colors space-y-3">
              <h3 className="text-base font-bold text-white">Regulasi Terbaru PPSN 2025 PB IPSI</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Menerapkan standarisasi resmi Peraturan Pertandingan Pencak Silat Nasional (PPSN 2025) PB IPSI & PERSILAT. Mengatur formula sah jatuhan (+3), kuncian maksimal 5 detik, perlindungan dari tarikan/teknik berbahaya, serta mekanisme penalti bertingkat.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5">
                  Majority voting jendela 1.2 detik (2 dari 3 juri)
                </li>
                <li className="flex items-center gap-1.5">
                  Poin sah: Pukulan (+1), Tendangan (+2), Jatuhan (+3)
                </li>
                <li className="flex items-center gap-1.5">
                  Hukuman: Teguran (-1/-2), Peringatan (-5/-10), Diskualifikasi
                </li>
              </ul>
            </div>

            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/30 transition-colors space-y-3">
              <h3 className="text-base font-bold text-white">Cloud Realtime Sync (RTDB)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sinkronisasi instan antar HP Juri, Laptop Dewan Pertandingan, Sekretaris, dan Layar LED Monitor TV penonton tanpa jeda (*ultra-low latency*).
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5">
                  Multi-device client separation
                </li>
                <li className="flex items-center gap-1.5">
                  Pemisahan kanal Gelanggang A / B / C / D
                </li>
              </ul>
            </div>

            <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-colors space-y-3">
              <h3 className="text-base font-bold text-white">Scoreboard LED & Skoring Seni</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dukungan tampilan layar lebar proyektor dan smart TV, lengkap dengan scoring kategori seni Tunggal, Ganda, Regu, dan Solo Kreatif.
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5">
                  Panel 5 juri seni tereliminasi min/max
                </li>
                <li className="flex items-center gap-1.5">
                  Audio gong & bell sintetis terintegrasi
                </li>
              </ul>
            </div>

          </div>

          {/* System Specs Bar */}
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800/80 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-slate-400 block text-[11px]">Standar Regulasi:</span>
              <span className="font-bold text-white">{APP_SYSTEM_SPECS.scoringStandard}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Kecepatan Respon:</span>
              <span className="font-bold text-emerald-400">{APP_SYSTEM_SPECS.clientLatency}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Dukungan Ekspor:</span>
              <span className="font-bold text-white">Excel (.xlsx), PDF Lembar Skor, JSON Backup</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sound.playClick();
                  onNavigateTab("KONTAK");
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
              >
                Pusat Bantuan & IT Support
              </button>
            </div>
          </div>
        </section>


        {/* ============================================================ */}
        {/* BAGIAN 3: INFORMASI EVENT PENCAK SILAT                      */}
        {/* ============================================================ */}
        <section id="event-silat" className="scroll-mt-32 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Informasi Event & Kejuaraan Silat</h2>
              <p className="text-sm text-slate-400 mt-1">
                Kalender kejuaraan daerah, open championship, piala bergilir, dan multievent silat mendatang.
              </p>
            </div>

            {/* Level Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {["ALL", "NASIONAL", "WILAYAH", "DAERAH", "INTERNASIONAL"].map(lvl => (
                <button
                  key={lvl}
                  onClick={() => {
                    sound.playClick();
                    setEventFilterLevel(lvl);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    eventFilterLevel === lvl 
                      ? "bg-emerald-600 text-white shadow" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {lvl === "ALL" ? "Semua" : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Event Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredEvents.map(evt => (
              <div 
                key={evt.id}
                className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xl space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold tracking-wider uppercase border ${
                      evt.level === "NASIONAL" ? "bg-red-500/10 text-red-400 border-red-500/30" :
                      evt.level === "INTERNASIONAL" ? "bg-purple-500/10 text-purple-400 border-purple-500/30" :
                      evt.level === "WILAYAH" ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                      "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}>
                      Tingkat {evt.level}
                    </span>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      evt.status === "BUKA_PENDAFTARAN" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" :
                      evt.status === "SEGERA_BERAKHIR" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" :
                      "bg-slate-800 text-slate-300"
                    }`}>
                      {evt.status.replace("_", " ")}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white leading-snug hover:text-emerald-400 transition-colors">
                    {evt.name}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-2">
                    {evt.description}
                  </p>

                  <div className="space-y-2 pt-1 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>Jadwal: {evt.dates}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="truncate">Lokasi: {evt.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="truncate">Penyelenggara: {evt.organizer}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Batas: <strong className="text-slate-200">{evt.registrationDeadline}</strong>
                  </div>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setSelectedEventDetail(evt);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors border border-slate-700"
                  >
                    Brosur & Info
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>


        {/* ============================================================ */}
        {/* BAGIAN 4: ARTIKEL-ARTIKEL PENCAK SILAT (USER-GENERATED)      */}
        {/* ============================================================ */}
        <section id="artikel-pengguna" className="scroll-mt-32 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Artikel & Berita Pencak Silat</h2>
              <p className="text-sm text-slate-400 mt-1">
                Wawasan regulasi, bedah teknik, nutrisi atlet, dan berita kejuaraan yang dapat ditambahkan dan dibaca oleh pengguna.
              </p>
            </div>

            {/* Tombol Tambah Artikel (Hanya untuk member / yang login) */}
            {currentUser && (
              <button
                onClick={() => {
                  sound.playClick();
                  setShowAddArticleModal(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/50 transition-all hover:scale-105 active:scale-95 self-start sm:self-auto"
              >
                Tambah Artikel Baru
              </button>
            )}
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-grow max-w-md">
              <input
                type="text"
                placeholder="Cari artikel, topik jurus, atau penulis..."
                value={articleSearch}
                onChange={(e) => setArticleSearch(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {articleSearch && (
                <button
                  onClick={() => setArticleSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { key: "ALL", label: "Semua" },
                { key: "REGULASI", label: "Regulasi" },
                { key: "TEKNIK", label: "Teknik" },
                { key: "TIPS_ATLET", label: "Tips Atlet" },
                { key: "SEJARAH", label: "Sejarah" },
                { key: "EVENT", label: "Event" }
              ].map(cat => (
                <button
                  key={cat.key}
                  onClick={() => {
                    sound.playClick();
                    setSelectedCategory(cat.key);
                  }}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === cat.key
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Articles Grid */}
          {filteredArticles.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <p className="text-slate-400 text-sm font-medium">Tidak ada artikel yang cocok dengan pencarian Anda.</p>
              <button
                onClick={() => {
                  setArticleSearch("");
                  setSelectedCategory("ALL");
                }}
                className="text-xs text-indigo-400 hover:underline"
              >
                Reset filter pencarian
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {filteredArticles.map(art => (
                <article
                  key={art.id}
                  onClick={() => {
                    sound.playClick();
                    setReadingArticle(art);
                  }}
                  className="bg-slate-900/80 rounded-2xl border border-slate-800/90 overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col justify-between shadow-xl"
                >
                  <div>
                    {/* Thumbnail Image */}
                    {art.imageUrl && (
                      <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                        <img 
                          src={art.imageUrl} 
                          alt={art.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wider uppercase bg-slate-950/80 backdrop-blur text-indigo-300 border border-indigo-500/30 shadow">
                            {art.category.replace("_", " ")}
                          </span>
                        </div>
                        <div className="absolute bottom-3 right-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/70 backdrop-blur text-slate-300">
                            {art.readTimeMinutes} menit baca
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">{art.author}</span>
                        <span>•</span>
                        <span>{art.publishedAt}</span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors leading-snug">
                        {art.title}
                      </h3>

                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                        {art.summary}
                      </p>

                      {/* Tags */}
                      {art.tags && art.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {art.tags.slice(0, 3).map((tag, idx) => (
                            <span 
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={(e) => handleLikeArticle(art.id, e)}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <span>❤️ {art.likes || 0} Suka</span>
                    </button>

                    <span className="text-xs font-bold text-indigo-400">
                      Baca Selengkapnya
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </div>


      {/* ============================================================ */}
      {/* MODAL: BACA ARTIKEL LENGKAP                                  */}
      {/* ============================================================ */}
      {readingArticle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  {readingArticle.category.replace("_", " ")}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  {readingArticle.readTimeMinutes} menit baca
                </span>
              </div>
              <button
                onClick={() => setReadingArticle(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors font-bold text-sm px-2.5"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-8 space-y-6">
              {readingArticle.imageUrl && (
                <div className="h-64 sm:h-80 w-full rounded-xl overflow-hidden bg-slate-950">
                  <img
                    src={readingArticle.imageUrl}
                    alt={readingArticle.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <div className="space-y-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug">
                  {readingArticle.title}
                </h1>

                <div className="flex items-center gap-3 text-xs text-slate-400 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-200">{readingArticle.author}</span>
                    {readingArticle.authorRole && (
                      <span className="text-slate-400">({readingArticle.authorRole})</span>
                    )}
                  </div>
                  <span>•</span>
                  <span>{readingArticle.publishedAt}</span>
                </div>
              </div>

              {/* Summary callout */}
              <div className="p-4 rounded-xl bg-slate-950/70 border-l-4 border-indigo-500 text-slate-300 text-sm italic">
                {readingArticle.summary}
              </div>

              {/* Body Text */}
              <div className="text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-line space-y-4 font-normal">
                {readingArticle.content}
              </div>

              {/* Tags & Interaction */}
              <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-1.5">
                  {readingArticle.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={(e) => handleLikeArticle(readingArticle.id, e)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                >
                  <span>❤️ Suka Artikel ({readingArticle.likes || 0})</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setReadingArticle(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Tutup Bacaan
              </button>
            </div>

          </div>
        </div>
      )}


      {/* ============================================================ */}
      {/* MODAL: TAMBAH ARTIKEL BARU OLEH PENGGUNA                     */}
      {/* ============================================================ */}
      {showAddArticleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-white">Tulis & Tambahkan Artikel Baru</h3>
              </div>
              <button
                onClick={() => setShowAddArticleModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors font-bold text-sm px-2.5"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddArticleSubmit} className="p-6 space-y-4 text-xs">
              
              {formError && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-800/80 text-red-300 font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  {formError}
                </div>
              )}

              {/* Judul */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">Judul Artikel *</label>
                <input
                  type="text"
                  placeholder="Contoh: Kunci Menang Partai Tanding dengan Strategi Counter Attack"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Kategori & Waktu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 block">Kategori Artikel *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ArticleCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="REGULASI">Regulasi & Peraturan</option>
                    <option value="TEKNIK">Teknik & Taktik Silat</option>
                    <option value="TIPS_ATLET">Tips & Nutrisi Atlet</option>
                    <option value="EVENT">Berita Event</option>
                    <option value="SEJARAH">Sejarah & Budaya</option>
                    <option value="UMUM">Umum</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 block">Nama Penulis *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pelatih Rian / Wasit Juri Daerah"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Peran Penulis & Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 block">Peran / Jabatan Penulis</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pelatih Fisik Kontingen"
                    value={formAuthorRole}
                    onChange={(e) => setFormAuthorRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 block">Tagar (Pisahkan dengan koma)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Tanding, Bantingan, IPSI"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* URL Gambar */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">URL Gambar / Thumbnail (Opsional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[11px] text-slate-500">Bisa dikosongkan untuk menggunakan gambar silat default.</span>
              </div>

              {/* Ringkasan */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">Ringkasan Artikel (1-2 Kalimat) *</label>
                <textarea
                  rows={2}
                  placeholder="Jelaskan intisari artikel ini secara singkat..."
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Isi Lengkap */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">Isi Konten Artikel Lengkap *</label>
                <textarea
                  rows={6}
                  placeholder="Tuliskan isi artikel Anda di sini. Anda dapat memisahkan paragraf dengan baris baru..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Form Footer Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddArticleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/50"
                >
                  Publikasikan Artikel
                </button>
              </div>

            </form>

          </div>
        </div>
      )}


      {/* ============================================================ */}
      {/* MODAL: DETAIL BROSUR EVENT                                   */}
      {/* ============================================================ */}
      {selectedEventDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Tingkat {selectedEventDetail.level}
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5 leading-snug">
                  {selectedEventDetail.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEventDetail(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white font-bold text-sm px-2.5"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedEventDetail.description}
            </p>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Jadwal Tanding:</span>
                <span className="font-bold text-white">{selectedEventDetail.dates}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Lokasi GOR:</span>
                <span className="font-bold text-white text-right max-w-[200px] truncate">{selectedEventDetail.location}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Penyelenggara:</span>
                <span className="font-bold text-white">{selectedEventDetail.organizer}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Batas Pendaftaran:</span>
                <span className="font-bold text-amber-400">{selectedEventDetail.registrationDeadline}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Jumlah Gelanggang:</span>
                <span className="font-bold text-white">{selectedEventDetail.arenaCount} Gelanggang Resmi</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs">
                <span className="text-slate-400 block text-[11px]">Narahubung:</span>
                <strong className="text-slate-200">{selectedEventDetail.contactPerson}</strong>
              </div>

              <a
                href={`https://wa.me/${selectedEventDetail.phone.replace(/[^0-9]/g, "")}?text=Halo%20Panitia%2C%20saya%20ingin%20menanyakan%20informasi%20pendaftaran%20${encodeURIComponent(selectedEventDetail.name)}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/50"
              >
                Hubungi Panitia
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PILIH MONITOR PERTANDINGAN (BERASAL DARI NAVBAR MENU MONITOR TANDING/SENI) */}
      {showMonitorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#091124] border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => {
                sound.playClick();
                setShowMonitorModal(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer font-bold text-sm px-2.5"
            >
              ✕
            </button>

            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold mb-2">
                <span>LAYAR MONITOR PERTANDINGAN (NAVBAR MONITOR)</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Pilih Monitor Pertandingan
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Arahkan langsung ke layar scoreboard digital real-time resmi penonton & official arena yang berasal dari menu navbar <strong>Monitor (Tanding / Seni)</strong>.
              </p>
            </div>

            {/* Arena Selector inside modal */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Pilih Gelanggang:</span>
              <div className="flex items-center gap-1.5">
                {["A", "B", "C", "D"].map((ar) => (
                  <button
                    key={ar}
                    onClick={() => {
                      sound.playClick();
                      setMonitorModalArena(ar);
                      if (onSelectArena) onSelectArena(ar);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      monitorModalArena === ar
                        ? "bg-red-600 text-white shadow-md shadow-red-950/50"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Gel. {ar}
                  </button>
                ))}
              </div>
            </div>

            {/* Two Monitor Options */}
            <div className="space-y-3">
              {/* Option 1: Monitor Kategori Tanding */}
              <button
                onClick={() => {
                  setShowMonitorModal(false);
                  handleOpenMonitor(monitorModalArena, "MONITOR_TANDING");
                }}
                className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-red-950/50 to-slate-900 border border-red-800/50 hover:border-red-500 hover:from-red-950/80 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white group-hover:text-red-300 transition-colors">
                      ⚔️ Monitor Kategori Tanding
                    </h4>
                    <span className="px-1.5 py-0.2 text-[9px] font-black bg-rose-600 text-white rounded">
                      GELANGGANG {monitorModalArena}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Layar digital LED scoreboard tanding penonton: skor konsensus juri, jatuhan, babak & sisa waktu (PPSN 2025).
                  </p>
                </div>
              </button>

              {/* Option 2: Monitor Kategori Seni */}
              <button
                onClick={() => {
                  setShowMonitorModal(false);
                  handleOpenMonitor(monitorModalArena, "MONITOR_SENI");
                }}
                className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-800/40 hover:border-amber-500 hover:from-amber-950/70 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                      🏅 Monitor Kategori Seni
                    </h4>
                    <span className="px-1.5 py-0.2 text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                      GELANGGANG {monitorModalArena}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Layar scoreboard penilaian peragaan seni Tunggal, Ganda, Regu (TGR) dengan rekap nilai juri & timer resmi.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 border-t border-slate-800/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Terhubung dengan menu navbar <strong>MONITOR (Tanding / Seni)</strong></span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
