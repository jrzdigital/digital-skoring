import React, { useState } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { TournamentMatch, Athlete } from '../../types/silat';
import {
  Users,
  Shuffle,
  Plus,
  Play,
  Download,
  Upload,
  Trash2,
  Check,
  X,
  Layers,
  LayoutGrid,
  Search,
} from 'lucide-react';

export const RosterManager: React.FC = () => {
  const {
    rosterList,
    updateRosterList,
    activeMatchId,
    loadMatchFromRoster,
    registeredAthletes,
    setRegisteredAthletes,
    addLog,
  } = useSilatMatch();

  const [viewMode, setViewMode] = useState<'BATTLE' | 'POOL'>('BATTLE');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form for adding a new match
  const [newMatchForm, setNewMatchForm] = useState({
    partaiNumber: `PARTAI 0${rosterList.length + 1}`,
    categoryClass: 'KELAS C (55 - 60 KG)',
    ageGroup: 'DEWASA',
    gender: 'PUTRA' as 'PUTRA' | 'PUTRI',
    roundPhase: 'PENYISIHAN' as const,
    blueName: '',
    blueContingent: '',
    redName: '',
    redContingent: '',
  });

  const handleShuffle = () => {
    if (registeredAthletes && registeredAthletes.length > 0) {
      // Group registered athletes by category (categoryClass + ageGroup + gender)
      const groups: Record<string, typeof registeredAthletes> = {};
      registeredAthletes.forEach((ath) => {
        const key = `${ath.categoryClass || 'KELAS A'}__${ath.ageGroup || 'REMAJA'}__${ath.gender || 'PUTRA'}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(ath);
      });

      const shuffledAll: typeof registeredAthletes = [];
      Object.values(groups).forEach((groupAthletes) => {
        const shuffledGroup = [...groupAthletes];
        for (let i = shuffledGroup.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledGroup[i], shuffledGroup[j]] = [shuffledGroup[j], shuffledGroup[i]];
        }
        if (shuffledGroup.length >= 2 && shuffledGroup.every((a, idx) => a.id === groupAthletes[idx].id)) {
          [shuffledGroup[0], shuffledGroup[1]] = [shuffledGroup[1], shuffledGroup[0]];
        }
        shuffledAll.push(...shuffledGroup);
      });

      setRegisteredAthletes(shuffledAll);
      addLog('SEKRETARIS', 'KOCAK UNDIAN PARTAI', 'Daftar pertemuan atlet dalam kategori yang sama berhasil diacak.');
    } else if (rosterList && rosterList.length > 0) {
      // Group roster by category and re-pair athletes randomly
      const groups: Record<string, { blue: Athlete; red: Athlete; roundPhase: any }[]> = {};
      rosterList.forEach((m) => {
        const key = `${m.categoryClass || 'KELAS A'}__${m.ageGroup || 'REMAJA'}__${m.gender || 'PUTRA'}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push({ blue: m.blueAthlete, red: m.redAthlete, roundPhase: m.roundPhase });
      });

      const updatedRoster: TournamentMatch[] = [];
      let partaiCounter = 1;

      Object.entries(groups).forEach(([key, items]) => {
        const [categoryClass, ageGroup, gender] = key.split('__');
        const parsedGender = (gender === 'PUTRI' ? 'PUTRI' : 'PUTRA') as 'PUTRA' | 'PUTRI';

        const athletes: Athlete[] = [];
        items.forEach((item) => {
          if (item.blue && item.blue.name && !item.blue.name.includes('(MENUNGGU')) athletes.push(item.blue);
          if (item.red && item.red.name && !item.red.name.includes('(MENUNGGU')) athletes.push(item.red);
        });

        // Fisher-Yates shuffle
        for (let i = athletes.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [athletes[i], athletes[j]] = [athletes[j], athletes[i]];
        }

        for (let i = 0; i < athletes.length; i += 2) {
          const blue = athletes[i];
          const red = athletes[i + 1];
          updatedRoster.push({
            id: `match-shuf-${blue.id}-${red ? red.id : 'bye'}`,
            partaiNumber: `PARTAI ${String(partaiCounter).padStart(2, '0')}`,
            roundPhase: items[Math.floor(i / 2)]?.roundPhase || 'PENYISIHAN',
            categoryClass,
            ageGroup,
            gender: parsedGender,
            blueAthlete: blue,
            redAthlete: red || { id: 'bye', name: '(MENUNGGU LAWAN)', contingent: 'BYE' },
            status: 'SCHEDULED',
            bracketPosition: partaiCounter,
          });
          partaiCounter++;
        }
      });

      updateRosterList(updatedRoster);
      addLog('SEKRETARIS', 'KOCAK UNDIAN PARTAI', 'Daftar pertemuan atlet dalam kategori yang sama berhasil diacak.');
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedMatches((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedMatches.length === rosterList.length) {
      setSelectedMatches([]);
    } else {
      setSelectedMatches(rosterList.map((m) => m.id));
    }
  };

  const handleDeleteSelected = () => {
    const remaining = rosterList.filter((m) => !selectedMatches.includes(m.id));
    updateRosterList(remaining);
    setSelectedMatches([]);
  };

  const handleAddMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMatchForm.blueName || !newMatchForm.redName) return;

    const newMatch: TournamentMatch = {
      id: 'match-' + Date.now(),
      partaiNumber: newMatchForm.partaiNumber,
      categoryClass: newMatchForm.categoryClass,
      ageGroup: newMatchForm.ageGroup,
      gender: newMatchForm.gender,
      roundPhase: newMatchForm.roundPhase,
      blueAthlete: {
        id: 'ath-' + Date.now() + '-b',
        name: newMatchForm.blueName.toUpperCase(),
        contingent: newMatchForm.blueContingent.toUpperCase() || 'KONTINGEN BIRU',
      },
      redAthlete: {
        id: 'ath-' + Date.now() + '-r',
        name: newMatchForm.redName.toUpperCase(),
        contingent: newMatchForm.redContingent.toUpperCase() || 'KONTINGEN MERAH',
      },
      status: 'SCHEDULED',
    };

    updateRosterList([...rosterList, newMatch]);
    setIsAddModalOpen(false);
    setNewMatchForm({
      partaiNumber: `PARTAI 0${rosterList.length + 2}`,
      categoryClass: 'KELAS C (55 - 60 KG)',
      ageGroup: 'DEWASA',
      gender: 'PUTRA',
      roundPhase: 'PENYISIHAN',
      blueName: '',
      blueContingent: '',
      redName: '',
      redContingent: '',
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Nomor Partai',
      'Tahapan',
      'Kelas',
      'Golongan Usia',
      'Gender',
      'Atlit Biru',
      'Kontingen Biru',
      'Atlit Merah',
      'Kontingen Merah',
      'Status',
    ];
    const rows = rosterList.map((m) => [
      m.partaiNumber,
      m.roundPhase,
      m.categoryClass,
      m.ageGroup,
      m.gender,
      `"${m.blueAthlete.name}"`,
      `"${m.blueAthlete.contingent}"`,
      `"${m.redAthlete.name}"`,
      `"${m.redAthlete.contingent}"`,
      m.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Roster_Pencak_Silat_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMatches = rosterList.filter(
    (m) =>
      m.partaiNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.blueAthlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.redAthlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.categoryClass.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('BATTLE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'BATTLE'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Battle View
            </button>
            <button
              onClick={() => setViewMode('POOL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'POOL'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Pool View
            </button>
          </div>

          <button
            onClick={handleShuffle}
            title="Acak / Shuffle Urutan Partai Pertandingan"
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors border border-zinc-700"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400" /> Acak Roster
          </button>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari atlit / partai / kelas..."
            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Actions: Add Match, Export CSV, Delete Selected */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {selectedMatches.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-300 text-xs font-bold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus ({selectedMatches.length})
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors border border-zinc-700"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Ekspor CSV
          </button>

          <button
            id="btn-open-add-match"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-purple-900/30"
          >
            <Plus className="w-4 h-4" /> Tambah Partai
          </button>
        </div>
      </div>

      {/* Roster Display Content */}
      {viewMode === 'BATTLE' ? (
        /* Battle Table View */
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-zinc-300">
              <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase text-[11px] border-b border-zinc-800">
                <tr>
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedMatches.length === rosterList.length && rosterList.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-0"
                    />
                  </th>
                  <th className="p-4">Partai</th>
                  <th className="p-4">Kelas & Kategori</th>
                  <th className="p-4">Sudut Biru</th>
                  <th className="p-4 text-center">VS</th>
                  <th className="p-4">Sudut Merah</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredMatches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500 italic">
                      Tidak ada data partai pertandingan yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredMatches.map((m) => {
                    const isLive = m.id === activeMatchId;
                    const isSelected = selectedMatches.includes(m.id);

                    return (
                      <tr
                        key={m.id}
                        className={`hover:bg-zinc-800/40 transition-colors ${
                          isLive ? 'bg-purple-950/20' : ''
                        }`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(m.id)}
                            className="rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-0"
                          />
                        </td>
                        <td className="p-4 font-mono font-bold text-amber-400">
                          {m.partaiNumber}
                          <span className="block text-[10px] text-zinc-500 font-normal">
                            {m.roundPhase}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-zinc-200">{m.categoryClass}</div>
                          <div className="text-[10px] text-zinc-400">
                            {m.ageGroup} {m.gender}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-extrabold text-blue-400">{m.blueAthlete.name}</div>
                          <div className="text-[10px] text-zinc-400">{m.blueAthlete.contingent}</div>
                        </td>
                        <td className="p-4 text-center font-black text-zinc-600">VS</td>
                        <td className="p-4">
                          <div className="font-extrabold text-red-400">{m.redAthlete.name}</div>
                          <div className="text-[10px] text-zinc-400">{m.redAthlete.contingent}</div>
                        </td>
                        <td className="p-4">
                          {m.status === 'COMPLETED' ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold text-[10px]">
                              SELESAI ({m.blueScore} - {m.redScore})
                            </span>
                          ) : isLive ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-bold text-[10px] animate-pulse">
                              SEDANG TANDING
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 font-semibold text-[10px]">
                              BELUM MULAI
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => loadMatchFromRoster(m.id)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-purple-600 text-zinc-200 hover:text-white font-bold text-xs transition-colors flex items-center gap-1 ml-auto"
                          >
                            <Play className="w-3 h-3" /> Muat
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Pool Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((m) => {
            const isLive = m.id === activeMatchId;

            return (
              <div
                key={m.id}
                className={`p-4 rounded-3xl border transition-all ${
                  isLive
                    ? 'bg-zinc-900 border-purple-500 ring-2 ring-purple-500/40 shadow-xl'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                  <span className="font-mono font-black text-amber-400">{m.partaiNumber}</span>
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                    {m.roundPhase}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-900/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-blue-300">{m.blueAthlete.name}</div>
                      <div className="text-[10px] text-zinc-400">{m.blueAthlete.contingent}</div>
                    </div>
                    {m.blueScore !== undefined && (
                      <span className="font-digital font-black text-blue-400">{m.blueScore}</span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-900/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-red-300">{m.redAthlete.name}</div>
                      <div className="text-[10px] text-zinc-400">{m.redAthlete.contingent}</div>
                    </div>
                    {m.redScore !== undefined && (
                      <span className="font-digital font-black text-red-400">{m.redScore}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <span className="text-[10px] text-zinc-400">{m.categoryClass}</span>
                  <button
                    onClick={() => loadMatchFromRoster(m.id)}
                    className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-purple-600 text-zinc-200 text-xs font-bold transition-colors"
                  >
                    Muat ke Arena
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add Match */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border-2 border-purple-500 rounded-3xl p-6 shadow-2xl relative text-white">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black font-display uppercase tracking-wider mb-4">
              TAMBAH PARTAI PERTANDINGAN BARU
            </h3>

            <form onSubmit={handleAddMatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                    Nomor Partai
                  </label>
                  <input
                    type="text"
                    required
                    value={newMatchForm.partaiNumber}
                    onChange={(e) => setNewMatchForm({ ...newMatchForm, partaiNumber: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                    Tahapan
                  </label>
                  <select
                    value={newMatchForm.roundPhase}
                    onChange={(e) =>
                      setNewMatchForm({
                        ...newMatchForm,
                        roundPhase: e.target.value as 'PENYISIHAN',
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="PENYISIHAN">Penyisihan</option>
                    <option value="PEREMPAT_FINAL">Perempat Final</option>
                    <option value="SEMIFINAL">Semifinal</option>
                    <option value="FINAL">Final</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">
                  Kelas Tanding
                </label>
                <input
                  type="text"
                  required
                  value={newMatchForm.categoryClass}
                  onChange={(e) => setNewMatchForm({ ...newMatchForm, categoryClass: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Blue athlete */}
              <div className="p-3 bg-blue-950/60 border border-blue-900 rounded-xl space-y-2">
                <span className="text-[10px] font-black text-blue-400 uppercase">SUDUT BIRU</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Atlit Biru"
                    required
                    value={newMatchForm.blueName}
                    onChange={(e) => setNewMatchForm({ ...newMatchForm, blueName: e.target.value })}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Kontingen"
                    value={newMatchForm.blueContingent}
                    onChange={(e) => setNewMatchForm({ ...newMatchForm, blueContingent: e.target.value })}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Red athlete */}
              <div className="p-3 bg-red-950/60 border border-red-900 rounded-xl space-y-2">
                <span className="text-[10px] font-black text-red-400 uppercase">SUDUT MERAH</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Atlit Merah"
                    required
                    value={newMatchForm.redName}
                    onChange={(e) => setNewMatchForm({ ...newMatchForm, redName: e.target.value })}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Kontingen"
                    value={newMatchForm.redContingent}
                    onChange={(e) => setNewMatchForm({ ...newMatchForm, redContingent: e.target.value })}
                    className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-lg"
              >
                Simpan & Daftarkan ke Roster
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
