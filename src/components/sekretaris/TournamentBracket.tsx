import React, { useState, useMemo, useRef } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { TournamentMatch, RegisteredAthlete } from '../../types/silat';
import * as XLSX from 'xlsx';
import {
  Trophy,
  Dices,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  Play,
  CheckCircle2,
  Users,
  Shield,
  Layers,
  Sparkles,
  AlertTriangle,
  X,
  Printer,
} from 'lucide-react';

interface BracketSlot {
  id: string;
  seed: number;
  athlete?: RegisteredAthlete;
  isBye?: boolean;
}

interface BracketMatchNode {
  id: string;
  partaiNumber: string;
  partaiIndex: number;
  roundPhase: 'PENYISIHAN' | 'PEREMPAT_FINAL' | 'SEMIFINAL' | 'FINAL';
  roundName: string;
  roundIndex: number; // 0 for earliest round, up to final
  matchIndexInRound: number;
  blueSlot: {
    name: string;
    contingent: string;
    id?: string;
    isBye?: boolean;
    prevMatchPartai?: number;
  };
  redSlot: {
    name: string;
    contingent: string;
    id?: string;
    isBye?: boolean;
    prevMatchPartai?: number;
  };
  winnerCorner?: 'BLUE' | 'RED';
  winnerName?: string;
  isByeMatch?: boolean;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  linkedTournamentMatch?: TournamentMatch;
}

export const TournamentBracket: React.FC = () => {
  const {
    registeredAthletes,
    rosterList,
    matchHistory,
    activeMatchId,
    loadMatchFromRoster,
    deleteRegisteredAthlete,
    setRegisteredAthletes,
    updateMatchInfo,
    addLog,
  } = useSilatMatch();

  // Selected Class Category
  const [selectedClassKey, setSelectedClassKey] = useState<string>('');
  const [bracketViewMode, setBracketViewMode] = useState<'SATU_SISI' | 'DUA_SISI'>('SATU_SISI');
  const [selectedMatchDetail, setSelectedMatchDetail] = useState<BracketMatchNode | null>(null);
  const [isConfirmClearClassOpen, setIsConfirmClearClassOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Group all registered athletes by class + ageGroup + gender
  const classGroups = useMemo(() => {
    const map: Record<
      string,
      {
        key: string;
        categoryClass: string;
        ageGroup: string;
        gender: 'PUTRA' | 'PUTRI';
        athletes: RegisteredAthlete[];
      }
    > = {};

    registeredAthletes.forEach((ath) => {
      const cls = ath.categoryClass || 'KELAS A';
      const age = ath.ageGroup || 'REMAJA';
      const gdr = (ath.gender === 'PUTRI' ? 'PUTRI' : 'PUTRA') as 'PUTRA' | 'PUTRI';
      const key = `${cls}__${age}__${gdr}`;

      if (!map[key]) {
        map[key] = {
          key,
          categoryClass: cls,
          ageGroup: age,
          gender: gdr,
          athletes: [],
        };
      }
      map[key].athletes.push(ath);
    });

    return Object.values(map);
  }, [registeredAthletes]);

  // Set active group key if not set or invalid
  const activeGroup = useMemo(() => {
    if (classGroups.length === 0) return null;
    const found = classGroups.find((g) => g.key === selectedClassKey);
    return found || classGroups[0];
  }, [classGroups, selectedClassKey]);

  // Keep selectedClassKey synced
  React.useEffect(() => {
    if (activeGroup && selectedClassKey !== activeGroup.key) {
      setSelectedClassKey(activeGroup.key);
    }
  }, [activeGroup, selectedClassKey]);

  // Athletes in current selected class
  const currentAthletes = useMemo(() => {
    return activeGroup ? activeGroup.athletes : [];
  }, [activeGroup]);

  // Generate Adaptive Single-Elimination Bracket Tree for active class
  const bracketData = useMemo(() => {
    if (!activeGroup || currentAthletes.length === 0) {
      return {
        capacity: 0,
        rounds: [],
        allMatches: [] as BracketMatchNode[],
      };
    }

    const n = currentAthletes.length;
    // Determine capacity: 2, 4, 8, 16, 32
    let capacity = 2;
    if (n > 16) capacity = 32;
    else if (n > 8) capacity = 16;
    else if (n > 4) capacity = 8;
    else if (n > 2) capacity = 4;
    else capacity = 2;

    // Number of rounds
    const totalRounds = Math.log2(capacity); // e.g. 16 => 4 rounds (Penyisihan, Perempat Final, Semifinal, Final)

    // Round Names based on capacity
    const getRoundName = (roundIdx: number, totalR: number) => {
      const remainingInRound = Math.pow(2, totalR - roundIdx);
      if (remainingInRound === 2) return 'FINAL';
      if (remainingInRound === 4) return 'SEMIFINAL';
      if (remainingInRound === 8) return 'PEREMPAT FINAL';
      if (remainingInRound === 16) return '16 BESAR (PENYISIHAN)';
      return `BABAK ${remainingInRound} BESAR`;
    };

    // Calculate Byes count
    const byeCount = capacity - n;

    // Standard Seed Placements for bracket capacity
    // To match official silat bracket generation:
    // Slot 1 to capacity, distributed
    const slots: BracketSlot[] = [];
    for (let i = 0; i < capacity; i++) {
      if (i < n) {
        slots.push({
          id: `slot-${i}`,
          seed: i + 1,
          athlete: currentAthletes[i],
          isBye: false,
        });
      } else {
        slots.push({
          id: `slot-${i}`,
          seed: i + 1,
          isBye: true,
        });
      }
    }

    // Build rounds & nodes
    const rounds: {
      name: string;
      phase: 'PENYISIHAN' | 'PEREMPAT_FINAL' | 'SEMIFINAL' | 'FINAL';
      matches: BracketMatchNode[];
    }[] = [];

    const allMatches: BracketMatchNode[] = [];
    let partaiCounter = 1;

    // First Round (Capacity / 2 matches)
    const firstRoundMatchesCount = capacity / 2;
    const firstRoundNodes: BracketMatchNode[] = [];
    const firstRoundName = getRoundName(0, totalRounds);
    const firstRoundPhase: 'PENYISIHAN' | 'PEREMPAT_FINAL' | 'SEMIFINAL' | 'FINAL' =
      firstRoundMatchesCount === 1
        ? 'FINAL'
        : firstRoundMatchesCount === 2
        ? 'SEMIFINAL'
        : firstRoundMatchesCount === 4
        ? 'PEREMPAT_FINAL'
        : 'PENYISIHAN';

    for (let i = 0; i < firstRoundMatchesCount; i++) {
      const blueSlot = slots[i * 2];
      const redSlot = slots[i * 2 + 1];
      const isBye = Boolean(blueSlot?.isBye || redSlot?.isBye);

      const partaiNum = isBye ? 'PARTAI -' : `PARTAI ${partaiCounter}`;
      const currentPartaiIdx = isBye ? 0 : partaiCounter;
      if (!isBye) partaiCounter++;

      const node: BracketMatchNode = {
        id: `match-node-0-${i}`,
        partaiNumber: partaiNum,
        partaiIndex: currentPartaiIdx,
        roundPhase: firstRoundPhase,
        roundName: firstRoundName,
        roundIndex: 0,
        matchIndexInRound: i,
        blueSlot: {
          name: blueSlot?.athlete ? blueSlot.athlete.name : blueSlot?.isBye ? '-' : '(BELUM ADA)',
          contingent: blueSlot?.athlete ? blueSlot.athlete.contingent : blueSlot?.isBye ? '-' : '',
          id: blueSlot?.athlete?.id,
          isBye: blueSlot?.isBye,
        },
        redSlot: {
          name: redSlot?.athlete ? redSlot.athlete.name : redSlot?.isBye ? '-' : '(BELUM ADA)',
          contingent: redSlot?.athlete ? redSlot.athlete.contingent : redSlot?.isBye ? '-' : '',
          id: redSlot?.athlete?.id,
          isBye: redSlot?.isBye,
        },
        isByeMatch: isBye,
        status: 'SCHEDULED',
      };

      // Check if this match has recorded winner in roster or history
      const partaiNumStr = String(currentPartaiIdx);
      const matchInRoster = rosterList.find((rm) => rm.partaiNumber.replace(/\D/g, '') === partaiNumStr);
      const matchInHistory = matchHistory.find((hm) => hm.matchInfo.partaiNumber.replace(/\D/g, '') === partaiNumStr);

      if (matchInRoster && (matchInRoster.status === 'COMPLETED' || matchInRoster.winnerCorner)) {
        node.winnerCorner = matchInRoster.winnerCorner;
        node.winnerName = matchInRoster.winnerCorner === 'BLUE' ? node.blueSlot.name : node.redSlot.name;
        node.status = 'COMPLETED';
      } else if (matchInHistory && matchInHistory.winner !== 'DRAW') {
        node.winnerCorner = matchInHistory.winner;
        node.winnerName = matchInHistory.winner === 'BLUE' ? node.blueSlot.name : node.redSlot.name;
        node.status = 'COMPLETED';
      } else if (blueSlot?.athlete && redSlot?.isBye) {
        // If one side is bye, winner is the other side
        node.winnerCorner = 'BLUE';
        node.winnerName = blueSlot.athlete.name;
      } else if (redSlot?.athlete && blueSlot?.isBye) {
        node.winnerCorner = 'RED';
        node.winnerName = redSlot.athlete.name;
      }

      firstRoundNodes.push(node);
      allMatches.push(node);
    }

    rounds.push({
      name: firstRoundName,
      phase: firstRoundPhase,
      matches: firstRoundNodes,
    });

    // Subsequent Rounds
    let prevRoundNodes = firstRoundNodes;
    for (let r = 1; r < totalRounds; r++) {
      const matchCountInThisRound = prevRoundNodes.length / 2;
      const roundName = getRoundName(r, totalRounds);
      const phase: 'PENYISIHAN' | 'PEREMPAT_FINAL' | 'SEMIFINAL' | 'FINAL' =
        matchCountInThisRound === 1
          ? 'FINAL'
          : matchCountInThisRound === 2
          ? 'SEMIFINAL'
          : matchCountInThisRound === 4
          ? 'PEREMPAT_FINAL'
          : 'PENYISIHAN';

      const currentRoundNodes: BracketMatchNode[] = [];

      for (let m = 0; m < matchCountInThisRound; m++) {
        const feedBlue = prevRoundNodes[m * 2];
        const feedRed = prevRoundNodes[m * 2 + 1];

        // Determine Blue Slot
        let blueName = '';
        let blueContingent = '';
        let blueId: string | undefined;
        let isBlueBye = false;

        if (feedBlue.winnerName) {
          blueName = feedBlue.winnerName;
          blueContingent =
            feedBlue.winnerCorner === 'BLUE'
              ? feedBlue.blueSlot.contingent
              : feedBlue.redSlot.contingent;
          blueId =
            feedBlue.winnerCorner === 'BLUE' ? feedBlue.blueSlot.id : feedBlue.redSlot.id;
        } else if (feedBlue.partaiIndex > 0) {
          blueName = `PEMENANG PTY ${feedBlue.partaiIndex}`;
          blueContingent = '';
        } else if (feedBlue.isByeMatch) {
          blueName = feedBlue.blueSlot.isBye ? feedBlue.redSlot.name : feedBlue.blueSlot.name;
          blueContingent = feedBlue.blueSlot.isBye
            ? feedBlue.redSlot.contingent
            : feedBlue.blueSlot.contingent;
          blueId = feedBlue.blueSlot.isBye ? feedBlue.redSlot.id : feedBlue.blueSlot.id;
        } else {
          blueName = 'TBD';
        }

        // Determine Red Slot
        let redName = '';
        let redContingent = '';
        let redId: string | undefined;
        let isRedBye = false;

        if (feedRed.winnerName) {
          redName = feedRed.winnerName;
          redContingent =
            feedRed.winnerCorner === 'BLUE' ? feedRed.blueSlot.contingent : feedRed.redSlot.contingent;
          redId =
            feedRed.winnerCorner === 'BLUE' ? feedRed.blueSlot.id : feedRed.redSlot.id;
        } else if (feedRed.partaiIndex > 0) {
          redName = `PEMENANG PTY ${feedRed.partaiIndex}`;
          redContingent = '';
        } else if (feedRed.isByeMatch) {
          redName = feedRed.blueSlot.isBye ? feedRed.redSlot.name : feedRed.blueSlot.name;
          redContingent = feedRed.blueSlot.isBye
            ? feedRed.redSlot.contingent
            : feedRed.blueSlot.contingent;
          redId = feedRed.blueSlot.isBye ? feedRed.redSlot.id : feedRed.blueSlot.id;
        } else {
          redName = 'TBD';
        }

        const isBye = blueName === '-' && redName === '-';
        const currentPartaiIdx = partaiCounter;
        const partaiNum = `PARTAI ${currentPartaiIdx}`;
        partaiCounter++;

        const node: BracketMatchNode = {
          id: `match-node-${r}-${m}`,
          partaiNumber: partaiNum,
          partaiIndex: currentPartaiIdx,
          roundPhase: phase,
          roundName: roundName,
          roundIndex: r,
          matchIndexInRound: m,
          blueSlot: {
            name: blueName,
            contingent: blueContingent,
            id: blueId,
            isBye: isBlueBye,
            prevMatchPartai: feedBlue.partaiIndex || undefined,
          },
          redSlot: {
            name: redName,
            contingent: redContingent,
            id: redId,
            isBye: isRedBye,
            prevMatchPartai: feedRed.partaiIndex || undefined,
          },
          isByeMatch: isBye,
          status: 'SCHEDULED',
        };

        // Check if this subsequent match also has a recorded winner
        const subPartaiStr = String(currentPartaiIdx);
        const subMatchInRoster = rosterList.find((rm) => rm.partaiNumber.replace(/\D/g, '') === subPartaiStr);
        const subMatchInHistory = matchHistory.find((hm) => hm.matchInfo.partaiNumber.replace(/\D/g, '') === subPartaiStr);

        if (subMatchInRoster && (subMatchInRoster.status === 'COMPLETED' || subMatchInRoster.winnerCorner)) {
          node.winnerCorner = subMatchInRoster.winnerCorner;
          node.winnerName = subMatchInRoster.winnerCorner === 'BLUE' ? node.blueSlot.name : node.redSlot.name;
          node.status = 'COMPLETED';
        } else if (subMatchInHistory && subMatchInHistory.winner !== 'DRAW') {
          node.winnerCorner = subMatchInHistory.winner;
          node.winnerName = subMatchInHistory.winner === 'BLUE' ? node.blueSlot.name : node.redSlot.name;
          node.status = 'COMPLETED';
        }

        currentRoundNodes.push(node);
        allMatches.push(node);
      }

      rounds.push({
        name: roundName,
        phase: phase,
        matches: currentRoundNodes,
      });

      prevRoundNodes = currentRoundNodes;
    }

    return {
      capacity,
      rounds,
      allMatches,
    };
  }, [activeGroup, currentAthletes]);

  // Handle Shuffle / Kocak Undian
  const handleShuffleBracket = () => {
    if (!activeGroup || currentAthletes.length <= 1) {
      showToast('Minimal 2 pesilat diperlukan untuk mengocak undian!', 'info');
      return;
    }

    // Fisher-Yates shuffle current group athletes
    const shuffled = [...currentAthletes];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Guarantee position swap if 2 or more athletes
    if (shuffled.length >= 2 && shuffled.every((a, idx) => a.id === currentAthletes[idx].id)) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }

    // Replace athletes of this group in the overall registered list
    const otherAthletes = registeredAthletes.filter(
      (a) =>
        !(
          a.categoryClass === activeGroup.categoryClass &&
          a.ageGroup === activeGroup.ageGroup &&
          a.gender === activeGroup.gender
        )
    );

    const nextList = [...shuffled, ...otherAthletes];
    setRegisteredAthletes(nextList);

    showToast(`Undian braket ${activeGroup.categoryClass} (${currentAthletes.length} Pesilat) berhasil diacak! Daftar pertemuan pertandingan telah diperbarui.`);
    addLog('SEKRETARIS', 'KOCAK UNDIAN BAGAN', `Bagan dan daftar pertemuan atlet kelas ${activeGroup.categoryClass} ${activeGroup.ageGroup} ${activeGroup.gender} berhasil diacak.`);
  };

  // Handle Clear / Kosongkan Kelas
  const handleClearClass = () => {
    if (!activeGroup) return;

    // Filter out athletes in this active class
    const nextList = registeredAthletes.filter(
      (a) =>
        !(
          a.categoryClass === activeGroup.categoryClass &&
          a.ageGroup === activeGroup.ageGroup &&
          a.gender === activeGroup.gender
        )
    );

    setRegisteredAthletes(nextList);
    setIsConfirmClearClassOpen(false);
    showToast(`Seluruh atlet pada ${activeGroup.categoryClass} telah dikosongkan!`);
    addLog('SEKRETARIS', 'KOSONGKAN KELAS', `Data atlet & bagan ${activeGroup.categoryClass} ${activeGroup.ageGroup} ${activeGroup.gender} dikosongkan.`);
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'NO': 1,
        'NAMA LENGKAP': 'RIAN SAPUTRA',
        'KONTINGEN': 'LLG',
        'KELAS TANDING': 'KELAS A',
        'GOLONGAN USIA': 'REMAJA',
        'GENDER (PUTRA/PUTRI)': 'PUTRA',
      },
      {
        'NO': 2,
        'NAMA LENGKAP': 'JAKA TARUB',
        'KONTINGEN': 'JAWA',
        'KELAS TANDING': 'KELAS A',
        'GOLONGAN USIA': 'REMAJA',
        'GENDER (PUTRA/PUTRI)': 'PUTRA',
      },
      {
        'NO': 3,
        'NAMA LENGKAP': 'RONI BASKARA',
        'KONTINGEN': 'LL',
        'KELAS TANDING': 'KELAS A',
        'GOLONGAN USIA': 'REMAJA',
        'GENDER (PUTRA/PUTRI)': 'PUTRA',
      },
      {
        'NO': 4,
        'NAMA LENGKAP': 'RENDI KURNIA',
        'KONTINGEN': 'MURA',
        'KELAS TANDING': 'KELAS A',
        'GOLONGAN USIA': 'REMAJA',
        'GENDER (PUTRA/PUTRI)': 'PUTRA',
      },
      {
        'NO': 5,
        'NAMA LENGKAP': 'REZA PAHLEVI',
        'KONTINGEN': 'BKL',
        'KELAS TANDING': 'KELAS A',
        'GOLONGAN USIA': 'REMAJA',
        'GENDER (PUTRA/PUTRI)': 'PUTRA',
      },
      {
        'NO': 6,
        'NAMA LENGKAP': 'WIJAYA KUSUMA',
        'KONTINGEN': 'KPHG',
        'KELAS TANDING': 'KELAS A',
        'GOLONGAN USIA': 'REMAJA',
        'GENDER (PUTRA/PUTRI)': 'PUTRA',
      },
      {
        'NO': 7,
        'NAMA LENGKAP': 'NANDO ARDIANSYAH',
        'KONTINGEN': 'SKY',
        'KELAS TANDING': 'KELAS A',
        'GOLONGAN USIA': 'REMAJA',
        'GENDER (PUTRA/PUTRI)': 'PUTRA',
      },
      {
        'NO': 8,
        'NAMA LENGKAP': 'RINO SEPTIAN',
        'KONTINGEN': 'GH',
        'KELAS TANDING': 'KELAS A',
        'GOLONGAN USIA': 'REMAJA',
        'GENDER (PUTRA/PUTRI)': 'PUTRA',
      },
      {
        'NO': 9,
        'NAMA LENGKAP': 'ADI NUGROHO',
        'KONTINGEN': 'GT',
        'KELAS TANDING': 'KELAS A',
        'GOLONGAN USIA': 'REMAJA',
        'GENDER (PUTRA/PUTRI)': 'PUTRA',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Bagan');
    XLSX.writeFile(wb, 'TEMPLATE_BAGAN_BRAKET_SILAT.xlsx');
    showToast('Template Excel Bagan berhasil diunduh!');
  };

  // Import Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showToast('File Excel kosong atau format tidak sesuai!', 'error');
          return;
        }

        const importedAthletes: RegisteredAthlete[] = [];

        data.forEach((row, idx) => {
          const rawName = row['NAMA LENGKAP'] || row['Nama'] || row['NAMA'] || row['Nama Atlet'] || '';
          const rawCont = row['KONTINGEN'] || row['Kontingen'] || row['Daerah'] || row['KONTINGEN / DAERAH'] || '-';
          const rawClass = row['KELAS TANDING'] || row['Kelas'] || row['KELAS'] || 'KELAS A';
          const rawAge = row['GOLONGAN USIA'] || row['Usia'] || row['USIA'] || 'REMAJA';
          const rawGen = String(row['GENDER (PUTRA/PUTRI)'] || row['Gender'] || row['JENIS KELAMIN'] || 'PUTRA').toUpperCase();

          if (rawName && String(rawName).trim().length > 0) {
            importedAthletes.push({
              id: `ath-imp-${Date.now()}-${idx}`,
              name: String(rawName).toUpperCase().trim(),
              contingent: String(rawCont).toUpperCase().trim(),
              categoryClass: String(rawClass).toUpperCase().trim(),
              ageGroup: String(rawAge).toUpperCase().trim(),
              gender: rawGen.includes('PUTRI') ? 'PUTRI' : 'PUTRA',
              createdAt: Date.now() + idx,
            });
          }
        });

        if (importedAthletes.length === 0) {
          showToast('Tidak ada data pesilat valid yang dapat dibaca!', 'error');
          return;
        }

        const combined = [...importedAthletes, ...registeredAthletes];
        setRegisteredAthletes(combined);
        showToast(`Berhasil mengimpor ${importedAthletes.length} pesilat ke bagan!`);
        addLog('SEKRETARIS', 'IMPOR EXCEL BAGAN', `${importedAthletes.length} atlet diimpor ke sistem.`);
      } catch (err) {
        showToast('Gagal membaca file Excel. Pastikan format file benar.', 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // Export Excel for current class / all classes
  const handleExportExcel = () => {
    if (bracketData.allMatches.length === 0) {
      showToast('Tidak ada data bagan untuk diekspor!', 'error');
      return;
    }

    const exportRows = bracketData.allMatches
      .filter((m) => !m.isByeMatch)
      .map((m, idx) => ({
        'NO': idx + 1,
        'NO PARTAI': m.partaiNumber,
        'BABAK': m.roundName,
        'KELAS TANDING': activeGroup?.categoryClass || '-',
        'GOLONGAN USIA': activeGroup?.ageGroup || '-',
        'GENDER': activeGroup?.gender || '-',
        'SUDUT BIRU': m.blueSlot.name,
        'KONTINGEN BIRU': m.blueSlot.contingent,
        'SUDUT MERAH': m.redSlot.name,
        'KONTINGEN MERAH': m.redSlot.contingent,
        'STATUS': m.status,
      }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bagan_Pertandingan');
    const safeTitle = `${activeGroup?.categoryClass || 'KELAS'}_${activeGroup?.ageGroup || 'REMAJA'}_${activeGroup?.gender || 'PUTRA'}`.replace(/\s+/g, '_');
    XLSX.writeFile(wb, `BAGAN_BRAKET_${safeTitle}.xlsx`);
    showToast('Data bagan berhasil diekspor ke Excel!');
  };

  // Print / PDF Preview for Single Class
  const handlePrintClassPDF = () => {
    if (!activeGroup) {
      showToast('Pilih kelas pertandingan terlebih dahulu!', 'error');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Gagal membuka jendela cetak. Izinkan pop-up peramban.', 'error');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BAGAN BRAKET - ${activeGroup.categoryClass} ${activeGroup.ageGroup} ${activeGroup.gender}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #111;
            background: #fff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .header h2 {
            margin: 4px 0 0 0;
            font-size: 14px;
            color: #444;
          }
          .meta-box {
            display: flex;
            justify-content: space-between;
            background: #f4f4f5;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 11px;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #2e1065;
            color: #fff;
            text-align: center;
          }
          .blue-col { color: #1d4ed8; font-weight: bold; }
          .red-col { color: #b91c1c; font-weight: bold; }
          .footer {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
          }
          .sign-box {
            text-align: center;
            width: 200px;
          }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BAGAN PERTANDINGAN PENCAK SILAT (SISTEM GUGUR)</h1>
          <h2>OFFICIAL TOURNAMENT BRACKET SHEET</h2>
        </div>

        <div class="meta-box">
          <div>KELAS: <span>${activeGroup.categoryClass}</span></div>
          <div>GOLONGAN: <span>${activeGroup.ageGroup}</span></div>
          <div>GENDER: <span>${activeGroup.gender}</span></div>
          <div>TOTAL PESILAT: <span>${currentAthletes.length} ATLIT</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="40">NO</th>
              <th width="90">NO PARTAI</th>
              <th width="120">BABAK</th>
              <th>SUDUT BIRU (SUDUT KANAN)</th>
              <th>KONTINGEN</th>
              <th>SUDUT MERAH (SUDUT KIRI)</th>
              <th>KONTINGEN</th>
              <th width="100">KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            ${bracketData.allMatches
              .filter((m) => !m.isByeMatch)
              .map(
                (m, i) => `
              <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td style="text-align:center;font-weight:bold;">${m.partaiNumber}</td>
                <td style="text-align:center;">${m.roundName}</td>
                <td class="blue-col">${m.blueSlot.name}</td>
                <td>${m.blueSlot.contingent || '-'}</td>
                <td class="red-col">${m.redSlot.name}</td>
                <td>${m.redSlot.contingent || '-'}</td>
                <td style="text-align:center;">-</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          <div class="sign-box">
            <p>Ketua Pertandingan</p>
            <br><br><br>
            <p>( ........................................ )</p>
          </div>
          <div class="sign-box">
            <p>Sekretaris Pertandingan</p>
            <br><br><br>
            <p>( ........................................ )</p>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Print All Classes PDF
  const handlePrintAllClassesPDF = () => {
    if (classGroups.length === 0) {
      showToast('Belum ada data kelas pertandingan terdaftar!', 'error');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Gagal membuka jendela cetak. Izinkan pop-up peramban.', 'error');
      return;
    }

    const allSections = classGroups
      .map((grp, gIdx) => {
        const aths = grp.athletes;
        return `
        <div style="page-break-after: always; margin-bottom: 40px;">
          <div class="header">
            <h1>BAGAN PERTANDINGAN PENCAK SILAT (SISTEM GUGUR)</h1>
            <h2>OFFICIAL TOURNAMENT BRACKET SHEET - KELOMPOK ${gIdx + 1}</h2>
          </div>

          <div class="meta-box">
            <div>KELAS: <span>${grp.categoryClass}</span></div>
            <div>GOLONGAN: <span>${grp.ageGroup}</span></div>
            <div>GENDER: <span>${grp.gender}</span></div>
            <div>TOTAL: <span>${aths.length} PESILAT</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th width="40">NO</th>
                <th>NAMA LENGKAP ATLIT</th>
                <th>KONTINGEN / DAERAH</th>
                <th>KELAS TANDING</th>
                <th>GOLONGAN USIA</th>
                <th>GENDER</th>
              </tr>
            </thead>
            <tbody>
              ${aths
                .map(
                  (a, i) => `
                <tr>
                  <td style="text-align:center;">${i + 1}</td>
                  <td style="font-weight:bold;">${a.name}</td>
                  <td>${a.contingent}</td>
                  <td>${a.categoryClass}</td>
                  <td>${a.ageGroup}</td>
                  <td>${a.gender}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="footer">
            <div class="sign-box">
              <p>Ketua Pertandingan</p>
              <br><br><br>
              <p>( ........................................ )</p>
            </div>
            <div class="sign-box">
              <p>Sekretaris Pertandingan</p>
              <br><br><br>
              <p>( ........................................ )</p>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>BUKU BAGAN SELURUH KELAS PERTANDINGAN</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
          .header h2 { margin: 4px 0 0 0; font-size: 13px; color: #444; }
          .meta-box { display: flex; justify-content: space-between; background: #f4f4f5; padding: 8px 12px; border-radius: 6px; font-size: 11px; font-weight: bold; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
          th { background-color: #2e1065; color: #fff; text-align: center; }
          .footer { margin-top: 25px; display: flex; justify-content: space-between; font-size: 11px; }
          .sign-box { text-align: center; width: 180px; }
        </style>
      </head>
      <body>
        ${allSections}
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Load match from bracket node to active scoreboard
  const handleLoadNodeToMatch = (node: BracketMatchNode) => {
    if (node.isByeMatch) {
      showToast('Partai BYE tidak dapat dimuat ke papan skor!', 'info');
      return;
    }

    updateMatchInfo({
      id: node.id,
      partaiNumber: String(node.partaiIndex || '1'),
      categoryClass: activeGroup?.categoryClass || 'KELAS A',
      ageGroup: activeGroup?.ageGroup || 'REMAJA',
      gender: activeGroup?.gender || 'PUTRA',
      roundPhase: node.roundPhase,
      blueAthlete: {
        id: node.blueSlot.id || 'blue-ath',
        name: node.blueSlot.name,
        contingent: node.blueSlot.contingent,
        category: `Tanding ${activeGroup?.categoryClass} ${activeGroup?.ageGroup} ${activeGroup?.gender}`,
      },
      redAthlete: {
        id: node.redSlot.id || 'red-ath',
        name: node.redSlot.name,
        contingent: node.redSlot.contingent,
        category: `Tanding ${activeGroup?.categoryClass} ${activeGroup?.ageGroup} ${activeGroup?.gender}`,
      },
    });

    showToast(`${node.partaiNumber} berhasil dimuat ke Papan Skor & Monitor!`);
    addLog('SEKRETARIS', 'MUAT PARTAI BRAKET', `${node.partaiNumber} dimuat ke papan skor utama.`);
    setSelectedMatchDetail(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 h-full min-h-[580px]">
      {/* Hidden File Input for Excel Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportExcel}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR: KELAS TERDAFTAR & IMPOR / EKSPOR EXCEL BAGAN             */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col justify-between bg-[#120722] border border-[#2d0f47] rounded-2xl p-3 sm:p-3.5 space-y-3">
        <div className="space-y-3">
          {/* Header Sidebar: KELAS TERDAFTAR */}
          <div className="flex items-center justify-between pb-2 border-b border-[#2d0f47]">
            <div className="flex items-center gap-2 text-purple-300 font-black text-xs uppercase tracking-wider">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>KELAS TERDAFTAR</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-800 text-purple-300 font-bold">
              {classGroups.length} KELAS
            </span>
          </div>

          {/* List of Registered Classes */}
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {classGroups.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#180930] border border-[#3b135c] text-center text-xs text-purple-300/60 italic">
                Belum ada kelas terdaftar. Silakan input atlet di tab <strong className="text-purple-300">1. INPUT ATLIT</strong>.
              </div>
            ) : (
              classGroups.map((grp) => {
                const isSelected = activeGroup?.key === grp.key;
                return (
                  <button
                    key={grp.key}
                    onClick={() => setSelectedClassKey(grp.key)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-700 text-white shadow-md shadow-purple-950 border border-purple-400 font-bold'
                        : 'bg-[#180930] hover:bg-[#250d4b] text-purple-200 border border-[#381359]'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black uppercase tracking-wide">
                        {grp.categoryClass}
                      </div>
                      <div className="text-[10px] text-purple-300/80 uppercase font-medium">
                        {grp.ageGroup} • {grp.gender}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-purple-200 font-mono">
                        {grp.athletes.length}
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-purple-400'}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Bottom Sidebar: IMPOR / EKSPOR EXCEL BAGAN */}
        <div className="pt-2 border-t border-[#2d0f47] space-y-2">
          <div className="text-[10px] font-black text-purple-300/80 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-400" />
            <span>IMPOR / EKSPOR EXCEL BAGAN</span>
          </div>

          {/* Row 1: Template Excel & Impor Excel */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center justify-center gap-1 p-2 rounded-xl bg-[#1c0b36] hover:bg-[#2c1254] border border-[#3b135c] text-purple-200 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Download className="w-3 h-3 text-purple-400" />
              <span>TEMPLATE EXCEL</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1 p-2 rounded-xl bg-[#1c0b36] hover:bg-[#2c1254] border border-[#3b135c] text-purple-200 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <Upload className="w-3 h-3 text-purple-400" />
              <span>IMPOR EXCEL</span>
            </button>
          </div>

          {/* Row 2: Ekspor Excel & Unduh PDF */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-1 p-2 rounded-xl bg-[#1c0b36] hover:bg-[#2c1254] border border-[#3b135c] text-emerald-300 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
              <span>EKSPOR EXCEL</span>
            </button>

            <button
              onClick={handlePrintClassPDF}
              className="flex items-center justify-center gap-1 p-2 rounded-xl bg-[#1c0b36] hover:bg-[#2c1254] border border-[#3b135c] text-amber-300 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <FileText className="w-3 h-3 text-amber-400" />
              <span>UNDUH PDF</span>
            </button>
          </div>

          {/* Row 3: Unduh Semua Bagan PDF (Full Width) */}
          <button
            onClick={handlePrintAllClassesPDF}
            className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#1c0b36] hover:bg-[#2c1254] border border-[#3b135c] text-amber-200 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>UNDUH SEMUA BAGAN PDF</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN PANEL: VISUAL BAGAN BRAKET KLASIK / DUA SISI                      */}
      {/* ========================================================================= */}
      <section className="flex-1 flex flex-col bg-[#0f051d] border border-[#2d0f47] rounded-2xl overflow-hidden p-3 sm:p-4">
        {/* Top Action Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2d0f47]">
          {/* Left Title */}
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                VISUAL BAGAN:{' '}
                <span className="text-amber-300">
                  {activeGroup ? `${activeGroup.categoryClass} ${activeGroup.ageGroup} ${activeGroup.gender}` : 'BELUM ADA KELAS'}
                </span>
              </h2>
            </div>
            <p className="text-[10px] text-purple-300/70 font-medium tracking-wide">
              BRAKET TANDING SISTEM GUGUR ADAPTIF BERDASARKAN KAPASITAS ({currentAthletes.length} PESILAT TERDAFTAR)
            </p>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Toggle Dua Sisi */}
            <button
              onClick={() => setBracketViewMode('DUA_SISI')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                bracketViewMode === 'DUA_SISI'
                  ? 'bg-purple-600 text-white shadow-md border border-purple-400'
                  : 'bg-[#180930] hover:bg-[#250d4b] text-purple-300 border border-[#381359]'
              }`}
            >
              DUA SISI (NASIONAL)
            </button>

            {/* Toggle Satu Sisi */}
            <button
              onClick={() => setBracketViewMode('SATU_SISI')}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                bracketViewMode === 'SATU_SISI'
                  ? 'bg-purple-600 text-white shadow-md border border-purple-400'
                  : 'bg-[#180930] hover:bg-[#250d4b] text-purple-300 border border-[#381359]'
              }`}
            >
              SATU SISI (KLASIK)
            </button>

            {/* Kocak Undian */}
            <button
              onClick={handleShuffleBracket}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1c0b36] hover:bg-[#2d1257] border border-purple-600/60 text-purple-200 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <Dices className="w-3.5 h-3.5 text-purple-300" />
              <span>KOCAK UNDIAN</span>
            </button>

            {/* Kosongkan Kelas */}
            <button
              onClick={() => setIsConfirmClearClassOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 text-red-300 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>KOSONGKAN KELAS</span>
            </button>
          </div>
        </header>

        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`mt-2 p-2 rounded-xl text-xs font-bold text-center border animate-in fade-in ${
              toastMessage.type === 'error'
                ? 'bg-red-950/80 border-red-700 text-red-200'
                : toastMessage.type === 'info'
                ? 'bg-blue-950/80 border-blue-700 text-blue-200'
                : 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
            }`}
          >
            {toastMessage.text}
          </div>
        )}

        {/* ========================================================================= */}
        {/* BRACKET CANVAS / TREE CONTAINER                                           */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-x-auto overflow-y-auto mt-3 pr-2 select-none">
          {bracketData.rounds.length === 0 || currentAthletes.length === 0 ? (
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center p-8 rounded-2xl bg-[#090314] border border-[#2d0f47] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-950/60 border border-purple-800 flex items-center justify-center text-purple-400">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-purple-200">
                Belum Ada Atlet Terdaftar pada Kelas Ini
              </div>
              <p className="text-xs text-purple-300/60 max-w-sm">
                Silakan input data pesilat pada tab <strong>1. INPUT ATLIT</strong> atau impor data melalui Excel.
              </p>
            </div>
          ) : (
            <div className="min-w-[900px] flex flex-col space-y-4">
              {/* STAGE HEADERS (KAPSUL EMAS / KUNING PERSIS SCREENSHOT) */}
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${bracketData.rounds.length}, minmax(200px, 1fr))`,
                }}
              >
                {bracketData.rounds.map((rnd, rIdx) => (
                  <div
                    key={`hdr-${rIdx}`}
                    className="p-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black text-center shadow-md border border-amber-300"
                  >
                    <span className="text-[11px] font-black uppercase tracking-wider block">
                      {rnd.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* TREE COLUMNS */}
              <div
                className="grid gap-4 items-stretch"
                style={{
                  gridTemplateColumns: `repeat(${bracketData.rounds.length}, minmax(200px, 1fr))`,
                }}
              >
                {bracketData.rounds.map((rnd, rIdx) => {
                  const matchCount = rnd.matches.length;
                  return (
                    <div
                      key={`col-${rIdx}`}
                      className="flex flex-col justify-around space-y-4 py-2 relative"
                    >
                      {rnd.matches.map((node) => {
                        const isNodeActive = node.id === activeMatchId;
                        return (
                          <div
                            key={node.id}
                            onClick={() => setSelectedMatchDetail(node)}
                            className={`relative rounded-xl border p-2 text-xs transition-all cursor-pointer shadow-md ${
                              isNodeActive
                                ? 'bg-[#220d3d] border-amber-400 ring-2 ring-amber-400/40'
                                : 'bg-[#140827] hover:bg-[#1f0c3a] border-[#3b135c]'
                            }`}
                          >
                            {/* Header / Partai Label */}
                            <div className="text-[9px] font-mono text-purple-300/80 mb-1 flex items-center justify-between border-b border-purple-950 pb-1">
                              <span className="font-bold text-amber-300 uppercase">
                                {node.partaiNumber}
                              </span>
                              {node.isByeMatch && (
                                <span className="text-[8px] px-1 rounded bg-purple-950 text-purple-400">
                                  BYE
                                </span>
                              )}
                            </div>

                            {/* Blue Slot (Atas) */}
                            <div className="mb-1 p-1.5 rounded-lg bg-[#0d041a] border-l-4 border-l-blue-500 border border-purple-950/60">
                              <div className="font-black text-white text-[11px] uppercase tracking-wide truncate">
                                {node.blueSlot.name}
                              </div>
                              {node.blueSlot.contingent && (
                                <div className="text-[9px] text-blue-300 font-bold truncate">
                                  {node.blueSlot.contingent}
                                </div>
                              )}
                            </div>

                            {/* Red Slot (Bawah) */}
                            <div className="p-1.5 rounded-lg bg-[#0d041a] border-l-4 border-l-red-500 border border-purple-950/60">
                              <div className="font-black text-white text-[11px] uppercase tracking-wide truncate">
                                {node.redSlot.name}
                              </div>
                              {node.redSlot.contingent && (
                                <div className="text-[9px] text-red-300 font-bold truncate">
                                  {node.redSlot.contingent}
                                </div>
                              )}
                            </div>

                            {/* Branching Connector Line to Next Round */}
                            {rIdx < bracketData.rounds.length - 1 && (
                              <div className="hidden sm:block absolute -right-4 top-1/2 w-4 h-[2px] bg-purple-500/60 pointer-events-none" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. POPUP MODAL: DETAIL PARTAI BRAKET & MUAT KE PAPAN SKOR                 */}
      {/* ========================================================================= */}
      {selectedMatchDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#120722] border border-[#3b135c] rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl text-zinc-100 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2d0f47] pb-2.5">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black uppercase text-white tracking-wider">
                  DETAIL {selectedMatchDetail.partaiNumber} ({selectedMatchDetail.roundName})
                </h3>
              </div>
              <button
                onClick={() => setSelectedMatchDetail(null)}
                className="p-1 rounded-lg hover:bg-purple-950 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Blue Corner Box */}
              <div className="p-3 rounded-xl bg-[#1a0c30] border border-blue-500/40">
                <div className="text-[10px] font-bold text-blue-400 uppercase">SUDUT BIRU</div>
                <div className="text-sm font-black text-white">{selectedMatchDetail.blueSlot.name}</div>
                <div className="text-xs text-blue-200">
                  {selectedMatchDetail.blueSlot.contingent || '-'}
                </div>
              </div>

              {/* Red Corner Box */}
              <div className="p-3 rounded-xl bg-[#1a0c30] border border-red-500/40">
                <div className="text-[10px] font-bold text-red-400 uppercase">SUDUT MERAH</div>
                <div className="text-sm font-black text-white">{selectedMatchDetail.redSlot.name}</div>
                <div className="text-xs text-red-200">
                  {selectedMatchDetail.redSlot.contingent || '-'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2d0f47]">
              <button
                onClick={() => setSelectedMatchDetail(null)}
                className="px-3.5 py-2 rounded-xl bg-[#1c0b36] hover:bg-[#2c1254] text-xs font-bold text-purple-200"
              >
                TUTUP
              </button>
              {!selectedMatchDetail.isByeMatch && (
                <button
                  onClick={() => handleLoadNodeToMatch(selectedMatchDetail)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-950"
                >
                  <Play className="w-4 h-4" />
                  <span>MUAT KE PAPAN SKOR</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL KONFIRMASI: KOSONGKAN KELAS                                      */}
      {/* ========================================================================= */}
      {isConfirmClearClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#120722] border border-red-800/80 rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-2xl text-zinc-100 space-y-4">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-black uppercase tracking-wider">KOSONGKAN DATA KELAS?</h3>
            </div>
            <p className="text-xs text-purple-200/80 leading-relaxed">
              Tindakan ini akan menghapus seluruh data atlit dan bagan pertandingan pada{' '}
              <strong className="text-white font-bold">
                {activeGroup?.categoryClass} ({activeGroup?.ageGroup} {activeGroup?.gender})
              </strong>
              . Data tidak dapat dipulihkan.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2d0f47]">
              <button
                onClick={() => setIsConfirmClearClassOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-[#1c0b36] hover:bg-[#2c1254] text-xs font-bold text-purple-200"
              >
                BATAL
              </button>
              <button
                onClick={handleClearClass}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider"
              >
                YA, KOSONGKAN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
