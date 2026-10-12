import React, { useState, useEffect, useRef } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { Corner, RoundNumber } from '../../types/silat';
import { toggleFullscreen, isFullscreenActive } from '../../utils/fullscreen';
import { sound } from '../../utils/audio';
import { GeneratorJadwalModal } from './GeneratorJadwalModal';
import { OfficialScorecardPrint } from './OfficialScorecardPrint';
import { MatchAnalytics } from './MatchAnalytics';
import { defaultRosterList } from '../../utils/defaultData';
import {
  Settings,
  Clock,
  Play,
  RotateCcw,
  Pause,
  Volume2,
  Lock,
  Unlock,
  FileText,
  Download,
  Upload,
  ArrowLeft,
  Maximize2,
  Minimize2,
  CheckCircle2,
  ChevronDown,
  X,
  FileSpreadsheet,
  Zap,
  RefreshCw,
  Plus,
  Trophy,
  Users,
  BarChart2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  FileCheck,
} from 'lucide-react';

export const SekretarisView: React.FC = () => {
  const {
    setCurrentRole,
    matchInfo,
    updateMatchInfo,
    matchStatus,
    currentRound,
    setRound,
    timerSeconds,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    roundDurationSeconds,
    setRoundDuration,
    isJudgesLocked,
    setIsJudgesLocked,
    matchHistory,
    saveCurrentMatchToHistory,
    resetMatchForNextParty,
    exportStateToJson,
    importStateFromJson,
    blueTotalScore,
    redTotalScore,
    rosterList,
  } = useSilatMatch();

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(isFullscreenActive());
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    const active = await toggleFullscreen();
    setIsFullscreen(active);
  };

  // Keyboard shortcut listener for SHIFT (Bell/Horn)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'Shift') {
        sound.playArenaBuzzer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Form state initialized to match the uploaded screenshot defaults
  const [formState, setFormState] = useState({
    tournamentName:
      matchInfo.tournamentName ||
      'KEJUARAAN NASIONAL PENCAK SILAT IPSI REKOR INDONESIA',
    venue:
      matchInfo.venue || 'Padepokan Pencak Silat TMII, Jakarta East',
    eventDate: matchInfo.eventDate || '20-25 Juni 2026',
    logoLeft: matchInfo.logoLeft || '',
    logoRight: matchInfo.logoRight || '',
    partaiNumber: matchInfo.partaiNumber || '2',
    roundPhase: matchInfo.roundPhase || 'FINAL',
    classNumber: matchInfo.classNumber || 'REGU',
    categoryClass: matchInfo.categoryClass || 'REGU',
    ageGroup: matchInfo.ageGroup || 'PRA USIA DINI',
    gender: matchInfo.gender || ('PUTRA' as 'PUTRA' | 'PUTRI'),
    roundDurationSeconds: matchInfo.roundDurationSeconds || 180,
    blueAthlete: {
      id: matchInfo.blueAthlete?.id || 'ath-blue-01',
      name: matchInfo.blueAthlete?.name || '',
      contingent: matchInfo.blueAthlete?.contingent || '',
      weightClass: matchInfo.blueAthlete?.weightClass || '',
      category: matchInfo.blueAthlete?.category || '',
    },
    redAthlete: {
      id: matchInfo.redAthlete?.id || 'ath-red-01',
      name: matchInfo.redAthlete?.name || '',
      contingent: matchInfo.redAthlete?.contingent || '',
      weightClass: matchInfo.redAthlete?.weightClass || '',
      category: matchInfo.redAthlete?.category || '',
    },
  });

  // Keep form state in sync with context
  useEffect(() => {
    setFormState({
      tournamentName:
        matchInfo.tournamentName ||
        'KEJUARAAN NASIONAL PENCAK SILAT IPSI REKOR INDONESIA',
      venue:
        matchInfo.venue || 'Padepokan Pencak Silat TMII, Jakarta East',
      eventDate: matchInfo.eventDate || '20-25 Juni 2026',
      logoLeft: matchInfo.logoLeft || '',
      logoRight: matchInfo.logoRight || '',
      partaiNumber: matchInfo.partaiNumber || '2',
      roundPhase: matchInfo.roundPhase || 'FINAL',
      classNumber: matchInfo.classNumber || 'REGU',
      categoryClass: matchInfo.categoryClass || 'REGU',
      ageGroup: matchInfo.ageGroup || 'PRA USIA DINI',
      gender: matchInfo.gender || 'PUTRA',
      roundDurationSeconds: matchInfo.roundDurationSeconds || 180,
      blueAthlete: {
        id: matchInfo.blueAthlete?.id || 'ath-blue-01',
        name: matchInfo.blueAthlete?.name || '',
        contingent: matchInfo.blueAthlete?.contingent || '',
        weightClass: matchInfo.blueAthlete?.weightClass || '',
        category: matchInfo.blueAthlete?.category || '',
      },
      redAthlete: {
        id: matchInfo.redAthlete?.id || 'ath-red-01',
        name: matchInfo.redAthlete?.name || '',
        contingent: matchInfo.redAthlete?.contingent || '',
        weightClass: matchInfo.redAthlete?.weightClass || '',
        category: matchInfo.redAthlete?.category || '',
      },
    });
  }, [matchInfo]);

  // Save changes live to context
  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...formState, [field]: value };
    setFormState(updated);
    updateMatchInfo(updated);
  };

  // Upload Logo handlers
  const fileLeftRef = useRef<HTMLInputElement>(null);
  const fileRightRef = useRef<HTMLInputElement>(null);
  const fileImportBackupRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (side: 'left' | 'right', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (side === 'left') {
        handleFieldChange('logoLeft', dataUrl);
      } else {
        handleFieldChange('logoRight', dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Modals state
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isScorecardModalOpen, setIsScorecardModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isNextMatchModalOpen, setIsNextMatchModalOpen] = useState(false);
  const [saveAlert, setSaveAlert] = useState<string | null>(null);

  // Match index tracker for roster cycling (PREV MATCH / NEXT MATCH)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(1);

  const handlePrevMatch = () => {
    if (rosterList.length === 0) return;
    const nextIdx = (currentMatchIndex - 1 + rosterList.length) % rosterList.length;
    setCurrentMatchIndex(nextIdx);
    const item = rosterList[nextIdx];
    if (item) {
      updateMatchInfo({
        id: item.id,
        partaiNumber: item.partaiNumber.replace(/\D/g, '') || String(nextIdx + 1),
        roundPhase: item.roundPhase,
        categoryClass: item.categoryClass,
        ageGroup: item.ageGroup,
        gender: item.gender,
        blueAthlete: {
          id: item.blueAthlete.id,
          name: item.blueAthlete.name,
          contingent: item.blueAthlete.contingent,
        },
        redAthlete: {
          id: item.redAthlete.id,
          name: item.redAthlete.name,
          contingent: item.redAthlete.contingent,
        },
      });
      setSaveAlert(`Dimuat: Partai ${item.partaiNumber}`);
      setTimeout(() => setSaveAlert(null), 2500);
    }
  };

  const handleNextMatch = () => {
    if (rosterList.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % rosterList.length;
    setCurrentMatchIndex(nextIdx);
    const item = rosterList[nextIdx];
    if (item) {
      updateMatchInfo({
        id: item.id,
        partaiNumber: item.partaiNumber.replace(/\D/g, '') || String(nextIdx + 1),
        roundPhase: item.roundPhase,
        categoryClass: item.categoryClass,
        ageGroup: item.ageGroup,
        gender: item.gender,
        blueAthlete: {
          id: item.blueAthlete.id,
          name: item.blueAthlete.name,
          contingent: item.blueAthlete.contingent,
        },
        redAthlete: {
          id: item.redAthlete.id,
          name: item.redAthlete.name,
          contingent: item.redAthlete.contingent,
        },
      });
      setSaveAlert(`Dimuat: Partai ${item.partaiNumber}`);
      setTimeout(() => setSaveAlert(null), 2500);
    }
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (matchHistory.length === 0) {
      const headers = ['Partai', 'Nama Turnamen', 'Kategori', 'Sudut Biru', 'Skor Biru', 'Sudut Merah', 'Skor Merah', 'Status'];
      const row = [
        matchInfo.partaiNumber,
        `"${matchInfo.tournamentName}"`,
        `"${matchInfo.categoryClass} ${matchInfo.ageGroup} ${matchInfo.gender}"`,
        `"${matchInfo.blueAthlete.name} (${matchInfo.blueAthlete.contingent})"`,
        blueTotalScore,
        `"${matchInfo.redAthlete.name} (${matchInfo.redAthlete.contingent})"`,
        redTotalScore,
        matchStatus,
      ];
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), row.join(',')].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `rekap_partai_${matchInfo.partaiNumber}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSaveAlert('Berhasil mengunduh rekapan Excel/CSV');
      setTimeout(() => setSaveAlert(null), 2500);
      return;
    }

    const headers = ['ID', 'Tanggal', 'Partai', 'Turnamen', 'Kategori', 'Atlet Biru', 'Skor Biru', 'Atlet Merah', 'Skor Merah', 'Pemenang', 'Keputusan'];
    const rows = matchHistory.map((m) => [
      m.id,
      m.date,
      m.matchInfo.partaiNumber,
      `"${m.matchInfo.tournamentName}"`,
      `"${m.matchInfo.categoryClass} ${m.matchInfo.ageGroup} ${m.matchInfo.gender}"`,
      `"${m.matchInfo.blueAthlete.name} (${m.matchInfo.blueAthlete.contingent})"`,
      m.blueTotalScore,
      `"${m.matchInfo.redAthlete.name} (${m.matchInfo.redAthlete.contingent})"`,
      m.redTotalScore,
      m.winner === 'BLUE' ? 'SUDUT BIRU' : m.winner === 'RED' ? 'SUDUT MERAH' : 'SERI',
      m.decisionType,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `arsip_kejuaraan_silat_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSaveAlert('Arsip Excel/CSV berhasil diunduh!');
    setTimeout(() => setSaveAlert(null), 2500);
  };

  // Format Timer MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Main Actions
  const handleStartUnlock = () => {
    setIsJudgesLocked(false);
    startTimer();
    sound.playBeep(900, 0.1);
  };

  const handleResetLock = () => {
    pauseTimer();
    setIsJudgesLocked(true);
    resetTimer();
    sound.playBeep(400, 0.15);
  };

  const handleStartResume = () => {
    if (isTimerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
    sound.playBeep(600, 0.1);
  };

  const handleResetTime = () => {
    resetTimer();
    sound.playBeep(500, 0.1);
  };

  const handleBellHorn = () => {
    sound.playArenaBuzzer();
  };

  const handleRoundChange = (round: RoundNumber) => {
    setRound(round);
    sound.playBeep(700, 0.1);
  };

  return (
    <div className="w-full min-h-screen bg-[#06010f] text-zinc-100 p-2 sm:p-3 font-sans select-none flex flex-col justify-between">
      {/* Background ambient lighting */}
      <div className="fixed top-0 left-1/4 w-[450px] h-[450px] bg-purple-900/15 blur-[140px] pointer-events-none rounded-full" />
      <div className="fixed bottom-0 right-1/4 w-[450px] h-[450px] bg-fuchsia-900/10 blur-[140px] pointer-events-none rounded-full" />

      {/* TOP HEADER BAR: FULL WIDTH */}
      <header className="relative z-10 w-full flex items-center justify-between gap-2 pb-1">
        {/* Left Title: PANEL SEKRETARIS & ENGINE KONTROL */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentRole('LANDING')}
            title="Kembali ke Beranda"
            className="text-amber-400 hover:text-amber-300 font-black text-sm sm:text-base uppercase tracking-wider font-display drop-shadow-[0_0_12px_rgba(245,158,11,0.3)] flex items-center gap-1.5"
          >
            <span>PANEL SEKRETARIS & ENGINE KONTROL</span>
          </button>
        </div>

        {/* Right Action: LAYAR BIASA / LAYAR PENUH */}
        <div className="flex items-center gap-2">
          {saveAlert && (
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950/90 border border-emerald-500 text-[10px] font-bold text-emerald-300 animate-in fade-in">
              {saveAlert}
            </span>
          )}

          <button
            id="btn-sekretaris-fullscreen"
            onClick={handleToggleFullscreen}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#140628] hover:bg-[#200a40] border border-[#431475] text-[#d8b4fe] hover:text-white text-[11px] font-bold transition-all shadow-sm cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3 h-3 text-[#c084fc]" />
                <span>LAYAR BIASA</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3 text-[#c084fc]" />
                <span>LAYAR BIASA</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* MAIN 2-COLUMN GRID (LEFT: 7 COLS | RIGHT: 5 COLS) - FULL WIDTH */}
      <main className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 flex-1 items-stretch">
        
        {/* ======================= LEFT COLUMN (7 COLS) ======================= */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-2">
          
          {/* CARD 1: Parameter Pertandingan */}
          <section
            id="card-parameter-pertandingan"
            className="bg-[#120722]/95 border border-[#3b135c] rounded-2xl p-2.5 sm:p-3 shadow-xl space-y-1.5 backdrop-blur-md"
          >
            {/* Header: ⚙ Parameter Pertandingan */}
            <div className="flex items-center gap-1.5 pb-0 text-white">
              <Settings className="w-3.5 h-3.5 text-purple-400" />
              <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider font-display">
                Parameter Pertandingan
              </h2>
            </div>

            {/* Field 1: NAMA EVENT KEJUARAAN */}
            <div>
              <label className="block text-[10px] font-black text-purple-300/90 uppercase tracking-wider mb-0.5">
                NAMA EVENT KEJUARAAN
              </label>
              <input
                type="text"
                value={formState.tournamentName}
                onChange={(e) => handleFieldChange('tournamentName', e.target.value)}
                placeholder="KEJUARAAN NASIONAL PENCAK SILAT IPSI REKOR INDONESIA"
                className="w-full bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl px-3 py-1.5 text-[11px] text-white uppercase font-bold tracking-wide focus:outline-none transition-colors shadow-inner"
              />
            </div>

            {/* Row 2: TEMPAT PELAKSANAAN | WAKTU PELAKSANAAN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black text-purple-300/90 uppercase tracking-wider mb-0.5">
                  TEMPAT PELAKSANAAN
                </label>
                <input
                  type="text"
                  value={formState.venue}
                  onChange={(e) => handleFieldChange('venue', e.target.value)}
                  placeholder="Padepokan Pencak Silat TMII, Jakarta East"
                  className="w-full bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl px-3 py-1.5 text-[11px] text-white font-bold tracking-wide focus:outline-none transition-colors shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-purple-300/90 uppercase tracking-wider mb-0.5">
                  WAKTU PELAKSANAAN
                </label>
                <input
                  type="text"
                  value={formState.eventDate}
                  onChange={(e) => handleFieldChange('eventDate', e.target.value)}
                  placeholder="20-25 Juni 2026"
                  className="w-full bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl px-3 py-1.5 text-[11px] text-white font-bold tracking-wide focus:outline-none transition-colors shadow-inner"
                />
              </div>
            </div>

            {/* Row 3: LOGO SISI KIRI (MONITOR) | LOGO SISI KANAN (MONITOR) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* LOGO KIRI */}
              <div>
                <label className="block text-[10px] font-black text-purple-300/90 uppercase tracking-wider mb-0.5">
                  LOGO SISI KIRI (MONITOR)
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="w-10 h-10 rounded-lg bg-[#0a0314] border border-[#381359] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
                    {formState.logoLeft ? (
                      <img
                        src={formState.logoLeft}
                        alt="Logo Kiri"
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <span className="text-[8px] font-black text-purple-400/60 uppercase">
                        KOSONG
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <input
                      type="text"
                      value={formState.logoLeft}
                      onChange={(e) => handleFieldChange('logoLeft', e.target.value)}
                      placeholder="Path logo / Base64..."
                      className="w-full bg-[#0a0314] border border-[#381359] rounded-lg px-2 py-0.5 text-[10px] text-zinc-300 focus:outline-none focus:border-purple-500 font-mono truncate"
                    />
                    <input
                      type="file"
                      ref={fileLeftRef}
                      onChange={(e) => handleLogoUpload('left', e)}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileLeftRef.current?.click()}
                      className="w-full py-0.5 rounded-lg bg-[#200b3b] hover:bg-[#2d0f52] border border-[#4c1d95] text-[9px] font-black text-purple-200 uppercase tracking-wider transition-colors shadow-sm"
                    >
                      ↑ Upload Logo Kiri
                    </button>
                  </div>
                </div>
              </div>

              {/* LOGO KANAN */}
              <div>
                <label className="block text-[10px] font-black text-purple-300/90 uppercase tracking-wider mb-0.5">
                  LOGO SISI KANAN (MONITOR)
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="w-10 h-10 rounded-lg bg-[#0a0314] border border-[#381359] flex items-center justify-center flex-shrink-0 overflow-hidden shadow-inner">
                    {formState.logoRight ? (
                      <img
                        src={formState.logoRight}
                        alt="Logo Kanan"
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <span className="text-[8px] font-black text-purple-400/60 uppercase">
                        KOSONG
                      </span>
                    )}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <input
                      type="text"
                      value={formState.logoRight}
                      onChange={(e) => handleFieldChange('logoRight', e.target.value)}
                      placeholder="Path logo / Base64..."
                      className="w-full bg-[#0a0314] border border-[#381359] rounded-lg px-2 py-0.5 text-[10px] text-zinc-300 focus:outline-none focus:border-purple-500 font-mono truncate"
                    />
                    <input
                      type="file"
                      ref={fileRightRef}
                      onChange={(e) => handleLogoUpload('right', e)}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileRightRef.current?.click()}
                      className="w-full py-0.5 rounded-lg bg-[#200b3b] hover:bg-[#2d0f52] border border-[#4c1d95] text-[9px] font-black text-purple-200 uppercase tracking-wider transition-colors shadow-sm"
                    >
                      ↑ Upload Logo Kanan
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 4 (4 cols): PARTAI TANDING (#) | TAHAP PERTANDINGAN | KELAS / NOMOR | KATEGORI USIA */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
              <div>
                <label className="block text-[10px] font-black text-purple-300/90 uppercase tracking-wider mb-0.5">
                  PARTAI TANDING (#)
                </label>
                <input
                  type="text"
                  value={formState.partaiNumber}
                  onChange={(e) => handleFieldChange('partaiNumber', e.target.value)}
                  placeholder="2"
                  className="w-full bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl px-2 py-1 text-[11px] text-white font-mono font-black text-center focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-purple-300/90 uppercase tracking-wider mb-0.5">
                  TAHAP PERTANDINGAN
                </label>
                <div className="relative">
                  <select
                    value={formState.roundPhase}
                    onChange={(e) => handleFieldChange('roundPhase', e.target.value)}
                    className="w-full appearance-none bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl px-2 py-1 text-[10px] text-white font-bold uppercase tracking-wider focus:outline-none pr-6 cursor-pointer"
                  >
                    <option value="PENYISIHAN">PENYISIHAN</option>
                    <option value="PEREMPAT FINAL">PEREMPAT FINAL</option>
                    <option value="SEMI FINAL">SEMI FINAL</option>
                    <option value="FINAL">FINAL</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-purple-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-purple-300/90 uppercase tracking-wider mb-0.5">
                  KELAS / NOMOR
                </label>
                <div className="relative">
                  <select
                    value={formState.classNumber}
                    onChange={(e) => {
                      const cls = e.target.value;
                      handleFieldChange('classNumber', cls);
                      handleFieldChange('categoryClass', cls);
                    }}
                    className="w-full appearance-none bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl px-2 py-1 text-[10px] text-white font-bold uppercase tracking-wider focus:outline-none pr-6 text-center cursor-pointer"
                  >
                    <option value="REGU">REGU</option>
                    <option value="TUNGGAL">TUNGGAL</option>
                    <option value="GANDA">GANDA</option>
                    <option value="SOLO KREATIF">SOLO KREATIF</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                    <option value="E">E</option>
                    <option value="F">F</option>
                    <option value="G">G</option>
                    <option value="H">H</option>
                    <option value="I">I</option>
                    <option value="J">J</option>
                    <option value="BEBAS">BEBAS</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-purple-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-purple-300/90 uppercase tracking-wider mb-0.5">
                  KATEGORI USIA
                </label>
                <div className="relative">
                  <select
                    value={formState.ageGroup}
                    onChange={(e) => handleFieldChange('ageGroup', e.target.value)}
                    className="w-full appearance-none bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl px-2 py-1 text-[10px] text-white font-bold uppercase tracking-wider focus:outline-none pr-6 cursor-pointer"
                  >
                    <option value="PRA USIA DINI">PRA USIA DINI</option>
                    <option value="USIA DINI">USIA DINI</option>
                    <option value="PRA-REMAJA">PRA-REMAJA</option>
                    <option value="REMAJA">REMAJA</option>
                    <option value="DEWASA">DEWASA</option>
                    <option value="MASTER">MASTER</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-purple-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Row 5 (2 cols): GENDER (KATEGORI) | DURASI BABAK (TIMER) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black text-purple-300/90 uppercase tracking-wider mb-0.5">
                  GENDER (KATEGORI)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFieldChange('gender', 'PUTRA')}
                    className={`py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                      formState.gender === 'PUTRA'
                        ? 'bg-[#9333ea] text-white ring-1 ring-fuchsia-400 shadow-purple-950'
                        : 'bg-[#180930] hover:bg-[#250d4a] text-purple-300/70 border border-[#381359]'
                    }`}
                  >
                    PUTRA
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('gender', 'PUTRI')}
                    className={`py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                      formState.gender === 'PUTRI'
                        ? 'bg-[#9333ea] text-white ring-1 ring-fuchsia-400 shadow-purple-950'
                        : 'bg-[#180930] hover:bg-[#250d4a] text-purple-300/70 border border-[#381359]'
                    }`}
                  >
                    PUTRI
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-purple-300/90 uppercase tracking-wider mb-0.5">
                  DURASI BABAK (TIMER)
                </label>
                <div className="relative">
                  <select
                    value={formState.roundDurationSeconds}
                    onChange={(e) => {
                      const secs = Number(e.target.value);
                      handleFieldChange('roundDurationSeconds', secs);
                      setRoundDuration(secs);
                    }}
                    className="w-full appearance-none bg-[#0a0314] border border-[#381359] focus:border-purple-500 rounded-xl px-3 py-1 text-[10px] text-white font-mono font-bold uppercase tracking-wider focus:outline-none pr-6 cursor-pointer"
                  >
                    <option value={180}>03.00 Menit</option>
                    <option value={120}>02.00 Menit</option>
                    <option value={90}>01.30 Menit</option>
                    <option value={60}>01.00 Menit</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-purple-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: SUDUT BIRU & SUDUT MERAH ATHLETE BOXES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* SUDUT BIRU BOX */}
            <div className="bg-gradient-to-br from-[#0c2461]/95 via-[#08153c]/95 to-[#040924]/95 border-2 border-blue-500/80 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_15px_rgba(37,99,235,0.2)] space-y-1.5 relative overflow-hidden backdrop-blur-md">
              <span className="text-[11px] sm:text-xs font-black text-white uppercase tracking-wider block drop-shadow-sm">
                SUDUT BIRU
              </span>

              <div>
                <label className="block text-[9px] font-black text-sky-300 uppercase tracking-wider mb-0.5">
                  NAMA ATLIT
                </label>
                <input
                  type="text"
                  value={formState.blueAthlete.name}
                  onChange={(e) => {
                    const ath = { ...formState.blueAthlete, name: e.target.value.toUpperCase() };
                    handleFieldChange('blueAthlete', ath);
                  }}
                  placeholder="NAMA ATLIT..."
                  className="w-full bg-[#08102e]/90 border border-blue-700/80 focus:border-sky-400 rounded-xl px-2.5 py-1.5 text-[11px] text-white font-bold uppercase tracking-wide focus:outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-sky-300 uppercase tracking-wider mb-0.5">
                  KONTINGEN
                </label>
                <input
                  type="text"
                  value={formState.blueAthlete.contingent}
                  onChange={(e) => {
                    const ath = { ...formState.blueAthlete, contingent: e.target.value.toUpperCase() };
                    handleFieldChange('blueAthlete', ath);
                  }}
                  placeholder="KONTINGEN..."
                  className="w-full bg-[#08102e]/90 border border-blue-700/80 focus:border-sky-400 rounded-xl px-2.5 py-1.5 text-[10px] text-zinc-200 font-bold uppercase tracking-wide focus:outline-none shadow-inner"
                />
              </div>
            </div>

            {/* SUDUT MERAH BOX */}
            <div className="bg-gradient-to-br from-[#5c0d16]/95 via-[#3a080e]/95 to-[#1e0407]/95 border-2 border-red-500/80 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_15px_rgba(239,68,68,0.2)] space-y-1.5 relative overflow-hidden backdrop-blur-md">
              <span className="text-[11px] sm:text-xs font-black text-white uppercase tracking-wider block drop-shadow-sm">
                SUDUT MERAH
              </span>

              <div>
                <label className="block text-[9px] font-black text-rose-300 uppercase tracking-wider mb-0.5">
                  NAMA ATLIT
                </label>
                <input
                  type="text"
                  value={formState.redAthlete.name}
                  onChange={(e) => {
                    const ath = { ...formState.redAthlete, name: e.target.value.toUpperCase() };
                    handleFieldChange('redAthlete', ath);
                  }}
                  placeholder="NAMA ATLIT..."
                  className="w-full bg-[#24060a]/90 border border-red-700/80 focus:border-rose-400 rounded-xl px-2.5 py-1.5 text-[11px] text-white font-bold uppercase tracking-wide focus:outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-rose-300 uppercase tracking-wider mb-0.5">
                  KONTINGEN
                </label>
                <input
                  type="text"
                  value={formState.redAthlete.contingent}
                  onChange={(e) => {
                    const ath = { ...formState.redAthlete, contingent: e.target.value.toUpperCase() };
                    handleFieldChange('redAthlete', ath);
                  }}
                  placeholder="KONTINGEN..."
                  className="w-full bg-[#24060a]/90 border border-red-700/80 focus:border-rose-400 rounded-xl px-2.5 py-1.5 text-[10px] text-zinc-200 font-bold uppercase tracking-wide focus:outline-none shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* CARD 3: NAVIGATION BUTTONS (ALIGNED 1:1 WITH SUDUT BIRU & SUDUT MERAH) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Left Column: CEK PARTAI SELANJUTNYA (Directly under Sudut Biru) */}
            <button
              id="btn-cek-partai-selanjutnya"
              onClick={() => setIsNextMatchModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-[#eab308] hover:bg-[#facc15] active:scale-[0.99] text-zinc-950 font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-yellow-950/30 cursor-pointer"
            >
              <FileCheck className="w-4 h-4 text-zinc-950" />
              <span>CEK PARTAI SELANJUTNYA</span>
            </button>

            {/* Right Column: PREV MATCH & NEXT MATCH (Directly under Sudut Merah) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-prev-match"
                onClick={handlePrevMatch}
                className="w-full py-2.5 rounded-xl bg-[#ea580c] hover:bg-[#f97316] active:scale-[0.99] text-white font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-md shadow-orange-950/30 cursor-pointer"
              >
                <span>‹ PREV MATCH</span>
              </button>

              <button
                id="btn-next-match"
                onClick={handleNextMatch}
                className="w-full py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#22c55e] active:scale-[0.99] text-white font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-md shadow-emerald-950/30 cursor-pointer"
              >
                <span>NEXT MATCH ›</span>
              </button>
            </div>
          </div>

          {/* CARD 4: REGISTRASI DATA & TURNAMEN */}
          <section
            id="card-registrasi-data"
            className="bg-[#120722]/95 border border-[#3b135c] rounded-2xl p-2.5 sm:p-3 shadow-xl space-y-1.5 backdrop-blur-md"
          >
            <div>
              <h2 className="text-[11px] sm:text-xs font-black uppercase text-purple-300 tracking-wider">
                REGISTRASI DATA & TURNAMEN
              </h2>
              <p className="text-[10px] text-purple-300/70 font-medium">
                Pendaftaran pesilat, visualisasi bagan braket tanding, dan kontrol penjadwalan partai.
              </p>
            </div>

            {/* Purple Button: 🤼 REGISTRASI DATA */}
            <button
              id="btn-registrasi-data"
              onClick={() => setIsGeneratorModalOpen(true)}
              className="w-full py-2 rounded-xl bg-[#6b21a8] hover:bg-[#7e22ce] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-950/80 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-purple-200" />
              <span>REGISTRASI DATA</span>
            </button>
          </section>
        </div>

        {/* ======================= RIGHT COLUMN (5 COLS) ======================= */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-2">
          
          {/* CARD 1: KONTROL UTAMA JALANNYA TANDING */}
          <section
            id="card-kontrol-utama"
            className="bg-[#120722]/95 border border-[#3b135c] rounded-2xl p-2.5 sm:p-3 shadow-xl space-y-1.5 relative backdrop-blur-md"
          >
            {/* Header */}
            <div className="flex items-center gap-1.5 text-white">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider font-display">
                KONTROL UTAMA JALANNYA TANDING
              </h2>
            </div>

            {/* Status Header: STATUS LAGA: ● LAGA AKTIF BERJALAN | ACTIVE */}
            <div className="flex items-center justify-between text-[10px] font-bold">
              <div className="flex items-center gap-1 text-purple-300">
                <span>STATUS LAGA:</span>
                {isTimerRunning ? (
                  <span className="flex items-center gap-1 text-[#22c55e]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-ping" />
                    <span>LAGA AKTIF BERJALAN</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span>JEDA / BERHENTI</span>
                  </span>
                )}
              </div>

              <span className="px-2 py-0.5 rounded border border-emerald-500/70 text-emerald-400 text-[9px] font-black tracking-widest uppercase bg-emerald-950/40">
                ACTIVE
              </span>
            </div>

            {/* Action Row 1: MULAI (BUKA KUNCI) | RESET (RESET & KUNCI) */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                id="btn-mulai-buka-kunci"
                onClick={handleStartUnlock}
                className="py-1.5 rounded-xl bg-[#4a1d6d]/80 hover:bg-[#6b21a8] text-purple-300 hover:text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all border border-purple-800/40"
              >
                <Zap className="w-2.5 h-2.5 text-purple-400" />
                <span>MULAI (BUKA KUNCI)</span>
              </button>

              <button
                id="btn-reset-kunci"
                onClick={handleResetLock}
                className="py-1.5 rounded-xl bg-[#3f1616]/80 hover:bg-[#581c1c] text-red-300 hover:text-red-200 font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all border border-red-900/50"
              >
                <RotateCcw className="w-2.5 h-2.5 text-red-400" />
                <span>RESET (RESET & KUNCI)</span>
              </button>
            </div>

            {/* DIGITAL LED CLOCK DISPLAY BOX (00:00) */}
            <div
              id="led-digital-clock-box"
              className="bg-[#000000] border border-[#2e1065] rounded-2xl p-2 sm:p-2.5 text-center shadow-xl relative overflow-hidden"
            >
              <div className="text-4xl sm:text-5xl font-mono font-black text-[#f59e0b] tracking-wider drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] select-all">
                {formatTimer(timerSeconds)}
              </div>
              <div className="text-[8px] font-black tracking-[0.25em] text-zinc-500 uppercase mt-0.5">
                STELLAR OFFLINE COUNTER CLOCK
              </div>
            </div>

            {/* Action Row 2: ▷ MULAI / RESUME (Green) | ⟲ RESET WAKTU (Dark) */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                id="btn-mulai-resume"
                onClick={handleStartResume}
                className={`py-1.5 rounded-xl text-white font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-sm ${
                  isTimerRunning
                    ? 'bg-[#ea580c] hover:bg-[#f97316] text-zinc-950 shadow-orange-950/30'
                    : 'bg-[#16a34a] hover:bg-[#22c55e] shadow-emerald-950/30'
                }`}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    <span>JEDA / PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>MULAI / RESUME</span>
                  </>
                )}
              </button>

              <button
                id="btn-reset-waktu"
                onClick={handleResetTime}
                className="py-1.5 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] border border-slate-700/60 text-slate-200 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-sm"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>RESET WAKTU</span>
              </button>
            </div>

            {/* Action Row 3: BELL / HORN with SHIFT Key tag */}
            <button
              id="btn-bell-horn"
              onClick={handleBellHorn}
              className="w-full py-2 rounded-xl bg-[#9333ea] hover:bg-[#a855f7] active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-950/80 cursor-pointer"
            >
              <span>BELL / HORN</span>
              <span className="px-1.5 py-0.2 rounded bg-black/40 border border-white/20 text-[9px] font-mono font-bold tracking-widest text-purple-200">
                SHIFT
              </span>
            </button>

            {/* Action Row 4: Round Selectors B1 | B2 | B3 */}
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3].map((r) => {
                const roundNum = r as RoundNumber;
                const isActive = currentRound === roundNum;
                return (
                  <button
                    key={r}
                    id={`btn-round-b${r}`}
                    onClick={() => handleRoundChange(roundNum)}
                    className={`py-1.5 rounded-xl font-black text-xs uppercase transition-all shadow-sm ${
                      isActive
                        ? 'bg-[#9333ea] text-white ring-1 ring-fuchsia-400 shadow-purple-950'
                        : 'bg-[#180930] hover:bg-[#250e4a] text-purple-300/60 border border-[#3b135c]'
                    }`}
                  >
                    B{r}
                  </button>
                );
              })}
            </div>

            {/* Action Row 5: UNDUH PDF (PARTAI SEDANG BERJALAN) */}
            <button
              id="btn-unduh-pdf-partai"
              onClick={() => setIsScorecardModalOpen(true)}
              className="w-full py-1.5 rounded-xl bg-[#140628] hover:bg-[#200a40] border border-[#3b135c] text-purple-200 hover:text-white font-black text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <FileText className="w-3 h-3 text-fuchsia-400" />
              <span>UNDUH PDF (PARTAI SEDANG BERJALAN)</span>
            </button>
          </section>

          {/* CARD 2: Histori Hasil Tanding */}
          <section
            id="card-histori-hasil"
            className="bg-[#120722]/95 border border-[#3b135c] rounded-2xl p-2.5 sm:p-3 shadow-xl space-y-1.5 relative backdrop-blur-md flex-1 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-white">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wider font-display">
                  Histori Hasil Tanding
                </h2>
              </div>

              {/* Arsipkan EXCEL Button */}
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1 text-[10px] font-bold text-purple-300 hover:text-emerald-400 transition-colors"
                title="Ekspor Seluruh Rekap Hasil Pertandingan ke Format Excel/CSV"
              >
                <span>Arsipkan</span>
                <span className="flex items-center gap-0.5 font-mono font-black text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-700 text-[9px]">
                  <Download className="w-2.5 h-2.5" />
                  EXCEL
                </span>
              </button>
            </div>

            {/* Content box */}
            <div className="p-2.5 rounded-xl bg-[#0a0314] border border-[#270d42] flex-1 min-h-[52px] flex items-center justify-center text-center">
              {matchHistory.length === 0 ? (
                <span className="text-[10px] text-purple-400/60 font-medium">
                  Belum ada sejarah tanding diarsipkan.
                </span>
              ) : (
                <div className="w-full space-y-1 max-h-28 overflow-y-auto pr-1">
                  {matchHistory.map((hist) => (
                    <div
                      key={hist.id}
                      className="p-1.5 rounded-lg bg-[#140628] border border-[#381359] flex items-center justify-between text-[10px] text-left"
                    >
                      <div>
                        <span className="font-bold text-amber-400">Partai {hist.matchInfo.partaiNumber}</span>
                        <span className="text-zinc-400 text-[9px] ml-1.5">{hist.matchInfo.blueAthlete.name} vs {hist.matchInfo.redAthlete.name}</span>
                      </div>
                      <div className="font-mono font-bold">
                        <span className="text-blue-400">{hist.blueTotalScore}</span> - <span className="text-red-400">{hist.redTotalScore}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Button: STATISTIK PERTANDINGAN */}
            <button
              id="btn-statistik-pertandingan"
              onClick={() => setIsStatsModalOpen(true)}
              className="w-full py-1.5 rounded-xl bg-[#180930] hover:bg-[#250e4a] border border-[#3b135c] text-purple-200 hover:text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-sm cursor-pointer"
            >
              <BarChart2 className="w-3 h-3 text-purple-400" />
              <span>STATISTIK PERTANDINGAN</span>
            </button>
          </section>

          {/* BOTTOM FOOTER BUTTON: STATUS LISENSI */}
          <div className="flex justify-center pt-0.5">
            <button
              id="btn-status-lisensi"
              onClick={() => setIsLicenseModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1 rounded-xl bg-[#120722] hover:bg-[#1c0b36] border border-[#3b135c] text-purple-300 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>STATUS LISENSI</span>
            </button>
          </div>
        </div>
      </main>

      {/* GENERATOR JADWAL & REGISTRASI DATA MODAL */}
      <GeneratorJadwalModal
        isOpen={isGeneratorModalOpen}
        onClose={() => setIsGeneratorModalOpen(false)}
      />

      {/* STATISTIK PERTANDINGAN MODAL */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#120722] border border-[#581c87] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
            <div className="p-4 border-b border-[#3b135c] flex items-center justify-between bg-[#190a30]">
              <h2 className="text-sm sm:text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-fuchsia-400" />
                STATISTIK & ANALISIS PERTANDINGAN
              </h2>
              <button
                onClick={() => setIsStatsModalOpen(false)}
                className="p-1.5 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0f051c]">
              <MatchAnalytics />
            </div>
          </div>
        </div>
      )}

      {/* CEK PARTAI SELANJUTNYA MODAL */}
      {isNextMatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#120722] border border-[#581c87] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
            <div className="p-4 border-b border-[#3b135c] flex items-center justify-between bg-[#190a30]">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm sm:text-base font-black uppercase text-white tracking-wider">
                  DAFTAR PARTAI SELANJUTNYA (JADWAL GELANGGANG)
                </h2>
              </div>
              <button
                onClick={() => setIsNextMatchModalOpen(false)}
                className="p-1.5 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3 overflow-y-auto max-h-[60vh] bg-[#0f051c]">
              {defaultRosterList.map((m, idx) => (
                <div
                  key={m.id}
                  onClick={() => {
                    updateMatchInfo({
                      partaiNumber: m.partaiNumber.replace(/\D/g, '') || String(idx + 1),
                      roundPhase: m.roundPhase,
                      categoryClass: m.categoryClass,
                      ageGroup: m.ageGroup,
                      gender: m.gender,
                      blueAthlete: {
                        id: m.blueAthlete.id,
                        name: m.blueAthlete.name,
                        contingent: m.blueAthlete.contingent,
                      },
                      redAthlete: {
                        id: m.redAthlete.id,
                        name: m.redAthlete.name,
                        contingent: m.redAthlete.contingent,
                      },
                    });
                    setIsNextMatchModalOpen(false);
                    setSaveAlert(`Partai ${m.partaiNumber} Berhasil Dimuat ke Arena!`);
                    setTimeout(() => setSaveAlert(null), 2500);
                  }}
                  className="p-3.5 rounded-2xl bg-[#16082b] hover:bg-[#250d45] border border-[#3b135c] hover:border-amber-400/80 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 font-mono font-bold text-xs">
                      <span className="text-amber-400">{m.partaiNumber}</span>
                      <span className="text-purple-400">•</span>
                      <span className="text-purple-200">{m.categoryClass}</span>
                      <span className="text-purple-400">•</span>
                      <span className="text-zinc-400">{m.roundPhase}</span>
                    </div>
                    <div className="text-xs mt-1">
                      <span className="text-blue-400 font-bold">{m.blueAthlete.name} ({m.blueAthlete.contingent})</span>
                      <span className="text-zinc-500 mx-2">vs</span>
                      <span className="text-red-400 font-bold">{m.redAthlete.name} ({m.redAthlete.contingent})</span>
                    </div>
                  </div>

                  <button className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold uppercase tracking-wider">
                    Muat Partai
                  </button>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-[#3b135c] bg-[#140628] flex justify-end">
              <button
                onClick={() => setIsNextMatchModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-purple-700 text-white text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS LISENSI MODAL */}
      {isLicenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#120722] border border-[#581c87] rounded-3xl w-full max-w-md p-6 shadow-2xl text-zinc-100 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                SISTEM PERWASITAN RESMI PERSILAT / IPSI
              </h2>
              <p className="text-xs text-purple-300/80 mt-1">
                Lisensi Digital Terminal Pertandingan & Digital Scoring Engine
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0a0314] border border-[#3b135c] text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Status Lisensi:</span>
                <span className="font-bold text-emerald-400">AKTIF / TERVERIFIKASI</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Regulasi Peraturan:</span>
                <span className="font-bold text-purple-200">PERSILAT RULES REVISI 2022/2026</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Dukungan Mode:</span>
                <span className="font-bold text-amber-400">100% OFFLINE & REAL-TIME SYNC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Validasi Dewan:</span>
                <span className="font-bold text-purple-200">TERHUBUNG OTOMATIS</span>
              </div>
            </div>

            <button
              onClick={() => setIsLicenseModalOpen(false)}
              className="w-full py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs uppercase tracking-wider"
            >
              Tutup Info Lisensi
            </button>
          </div>
        </div>
      )}

      {/* OFFICIAL SCORECARD PRINT MODAL */}
      {isScorecardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#120722] border border-[#581c87] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
            <div className="p-4 border-b border-[#3b135c] flex items-center justify-between bg-[#190a30]">
              <h2 className="text-sm sm:text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-fuchsia-400" />
                LEMBAR REKAPITULASI RESMI PERSILAT / IPSI
              </h2>
              <button
                onClick={() => setIsScorecardModalOpen(false)}
                className="p-1.5 rounded-xl bg-zinc-900 text-zinc-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-900/90">
              <OfficialScorecardPrint />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
