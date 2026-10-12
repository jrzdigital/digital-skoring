import React, { useState } from "react";
import { Match, Athlete } from "../types";
import { Trophy, Users, Plus, Award, GitBranch, Table, Zap } from "lucide-react";

interface BracketingPanelProps {
  matches: Match[];
  onAddMatch: (match: any) => void;
  onImportSchedule: (matches: Match[]) => void;
  onSelectMatch: (matchId: string) => void;
}

export default function BracketingPanel({
  matches,
  onAddMatch,
  onImportSchedule,
  onSelectMatch
}: BracketingPanelProps) {
  const [activeTab, setActiveTab] = useState<"battle" | "pool" | "generator">("battle");
  
  // Athlete registration list
  const [athletes, setAthletes] = useState<Athlete[]>([
    { id: "ath-1", nama: "Budi Santoso", kontingen: "Jawa Tengah", usia: "Dewasa", gender: "Putera" },
    { id: "ath-2", nama: "Ahmad Fauzi", kontingen: "Jawa Barat", usia: "Dewasa", gender: "Putera" },
    { id: "ath-3", nama: "Siti Rahma", kontingen: "DKI Jakarta", usia: "Dewasa", gender: "Puteri" },
    { id: "ath-4", nama: "Dewi Ayu", kontingen: "Bali", usia: "Dewasa", gender: "Puteri" },
    { id: "ath-5", nama: "Zulfikar Siregar", kontingen: "Sumatera Utara", usia: "Dewasa", gender: "Putera" },
    { id: "ath-6", nama: "Prasetyo Utomo", kontingen: "Jawa Timur", usia: "Dewasa", gender: "Putera" },
    { id: "ath-7", nama: "Fajar Nugraha", kontingen: "DI Yogyakarta", usia: "Dewasa", gender: "Putera" },
    { id: "ath-8", nama: "Rian Hidayat", kontingen: "Banten", usia: "Dewasa", gender: "Putera" }
  ]);

  // Form states for new athlete
  const [newAth, setNewAth] = useState({
    nama: "",
    kontingen: "",
    usia: "Dewasa",
    gender: "Putera" as "Putera" | "Puteri"
  });

  const handleAddAthlete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAth.nama || !newAth.kontingen) return;
    const athlete: Athlete = {
      id: `ath-${Date.now()}`,
      nama: newAth.nama,
      kontingen: newAth.kontingen,
      usia: newAth.usia,
      gender: newAth.gender
    };
    setAthletes([...athletes, athlete]);
    setNewAth({ nama: "", kontingen: "", usia: "Dewasa", gender: "Putera" });
  };

  // Auto bracket algorithm
  const generateAutomaticBrackets = () => {
    // Group athletes by Age and Gender
    const grouped: Record<string, Athlete[]> = {};
    athletes.forEach(ath => {
      const key = `${ath.usia}-${ath.gender}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ath);
    });

    const newMatchesList: Match[] = [];
    let partaiCounter = 1;

    Object.entries(grouped).forEach(([groupKey, groupAthletes]) => {
      // Create single elimination match schedule for each group
      const [usia, gender] = groupKey.split("-");
      // Pair them up
      for (let i = 0; i < groupAthletes.length; i += 2) {
        if (i + 1 < groupAthletes.length) {
          const ath1 = groupAthletes[i];
          const ath2 = groupAthletes[i + 1];
          
          newMatchesList.push({
            id: `match-gen-${partaiCounter}-${Date.now()}`,
            noPartai: partaiCounter,
            kategori: "Tunggal",
            usia: usia,
            gender: gender as "Putera" | "Puteri",
            sudutMerah: {
              athlete: ath1,
              wrongMovesDeduction: 0,
              judgesScores: {},
              isDisqualified: false,
              scoreApproved: false
            },
            sudutBiru: {
              athlete: ath2,
              wrongMovesDeduction: 0,
              judgesScores: {},
              isDisqualified: false,
              scoreApproved: false
            },
            status: "Scheduled",
            activeSudut: null,
            winner: null
          });
          partaiCounter++;
        } else {
          // Odd athlete gets a bye or matches with a placeholder
          const ath1 = groupAthletes[i];
          newMatchesList.push({
            id: `match-gen-${partaiCounter}-${Date.now()}`,
            noPartai: partaiCounter,
            kategori: "Tunggal",
            usia: usia,
            gender: gender as "Putera" | "Puteri",
            sudutMerah: {
              athlete: ath1,
              wrongMovesDeduction: 0,
              judgesScores: {},
              isDisqualified: false,
              scoreApproved: false
            },
            sudutBiru: {
              athlete: { id: "bye", nama: "BYE (Pass)", kontingen: "-", usia, gender: gender as any },
              wrongMovesDeduction: 0,
              judgesScores: {},
              isDisqualified: false,
              scoreApproved: false
            },
            status: "Scheduled",
            activeSudut: null,
            winner: null
          });
          partaiCounter++;
        }
      }
    });

    if (newMatchesList.length > 0) {
      onImportSchedule(newMatchesList);
      alert(`Berhasil membuat ${newMatchesList.length} partai pertandingan secara otomatis!`);
    }
  };

  // Helper to calculate final score for ranking in Pool view
  const getFinalScore = (competitor: any) => {
    if (!competitor || competitor.isDisqualified) return 0;
    const scores = Object.values(competitor.judgesScores).map((js: any) => {
      // Calculate individual judge total score
      // Kebenaran + Kemantapan
      const keb = js.kebenaran || 0;
      const kem = js.kemantapan || 0;
      const tek = js.teknik || 0;
      const har = js.harmonisasi || 0;
      const pen = js.penjiwaan || 0;
      
      return keb + kem + tek + har + pen;
    });

    if (scores.length === 0) return 0;

    // Standard IPSI rules: discard top and bottom scores
    const sorted = [...scores].sort((a, b) => a - b);
    let filtered = [...sorted];

    if (scores.length >= 10) {
      filtered = sorted.slice(3, 7); // discard 3 lowest and 3 highest
    } else if (scores.length >= 5) {
      filtered = sorted.slice(1, -1); // discard 1 lowest and 1 highest
    }

    const sum = filtered.reduce((a, b) => a + b, 0);
    return Math.max(0, sum - (competitor.wrongMovesDeduction || 0));
  };

  // Compile pool ranking list
  const getPoolRanking = () => {
    const list: Array<{
      athlete: Athlete;
      kategori: string;
      usia: string;
      gender: string;
      finalScore: number;
      approved: boolean;
      sudut: 'Merah' | 'Biru';
      matchNo: number;
    }> = [];

    matches.forEach(m => {
      if (m.sudutMerah.athlete && m.sudutMerah.athlete.id !== "bye") {
        list.push({
          athlete: m.sudutMerah.athlete,
          kategori: m.kategori,
          usia: m.usia,
          gender: m.gender,
          finalScore: getFinalScore(m.sudutMerah),
          approved: m.sudutMerah.scoreApproved,
          sudut: 'Merah',
          matchNo: m.noPartai
        });
      }
      if (m.sudutBiru.athlete && m.sudutBiru.athlete.id !== "bye") {
        list.push({
          athlete: m.sudutBiru.athlete,
          kategori: m.kategori,
          usia: m.usia,
          gender: m.gender,
          finalScore: getFinalScore(m.sudutBiru),
          approved: m.sudutBiru.scoreApproved,
          sudut: 'Biru',
          matchNo: m.noPartai
        });
      }
    });

    // Sort by score descending (only approved scores first, then unapproved)
    return list.sort((a, b) => b.finalScore - a.finalScore);
  };

  const poolRanking = getPoolRanking();

  return (
    <div className="glass-panel rounded-xl p-5 glow-purple border border-purple-900/30">
      {/* Tab Selectors */}
      <div className="flex border-b border-white/10 mb-5">
        <button
          onClick={() => setActiveTab("battle")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "battle"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
          id="tab-bracket-battle"
        >
          <GitBranch className="w-4 h-4" />
          Battle Bracket View
        </button>
        <button
          onClick={() => setActiveTab("pool")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "pool"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
          id="tab-bracket-pool"
        >
          <Table className="w-4 h-4" />
          Pool Klasemen
        </button>
        <button
          onClick={() => setActiveTab("generator")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-all ${
            activeTab === "generator"
              ? "border-purple-500 text-purple-400"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
          id="tab-bracket-generator"
        >
          <Users className="w-4 h-4" />
          Registrasi & Bracketing
        </button>
      </div>

      {/* Battle view tab */}
      {activeTab === "battle" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="text-yellow-500 w-5 h-5" />
              Bagan Pertandingan (Battle Tree)
            </h3>
            <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
              Total: {matches.length} Partai
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-10 text-gray-500 border-2 border-dashed border-white/5 rounded-xl">
              Belum ada jadwal pertandingan. Buka tab "Registrasi" untuk generate otomatis.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto py-2">
              {matches.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onSelectMatch(m.id)}
                  className="glass-card p-4 rounded-lg cursor-pointer border border-white/5 hover:border-purple-500/50 transition-all hover:scale-[1.01]"
                  id={`match-bracket-${m.id}`}
                >
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-2 pb-2 border-b border-white/5">
                    <span className="font-mono text-purple-400 font-bold">PARTAI {m.noPartai}</span>
                    <span className="bg-white/5 px-1.5 py-0.5 rounded font-medium">
                      {m.kategori} - {m.usia} ({m.gender === "Putera" ? "PA" : "PI"})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Sudut Merah */}
                    <div className={`flex items-center justify-between p-2 rounded ${
                      m.winner === "Merah" 
                        ? "bg-red-950/40 border border-red-500/40" 
                        : "bg-white/5"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-red-600 rounded-full glow-red"></span>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">
                            {m.sudutMerah.athlete?.nama || "TBD"}
                          </p>
                          <p className="text-xxs text-gray-400">{m.sudutMerah.athlete?.kontingen || "-"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xs font-bold text-yellow-400">
                          {m.sudutMerah.scoreApproved ? getFinalScore(m.sudutMerah).toFixed(2) : "Live"}
                        </p>
                        {m.winner === "Merah" && (
                          <span className="text-xxs bg-red-600 text-white px-1 rounded">WINNER</span>
                        )}
                      </div>
                    </div>

                    {/* VS divider */}
                    <div className="text-center text-xxs text-gray-500 font-bold py-0.5">VS</div>

                    {/* Sudut Biru */}
                    <div className={`flex items-center justify-between p-2 rounded ${
                      m.winner === "Biru" 
                        ? "bg-blue-950/40 border border-blue-500/40" 
                        : "bg-white/5"
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-blue-600 rounded-full glow-blue"></span>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">
                            {m.sudutBiru.athlete?.nama || "TBD"}
                          </p>
                          <p className="text-xxs text-gray-400">{m.sudutBiru.athlete?.kontingen || "-"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xs font-bold text-yellow-400">
                          {m.sudutBiru.scoreApproved ? getFinalScore(m.sudutBiru).toFixed(2) : "Live"}
                        </p>
                        {m.winner === "Biru" && (
                          <span className="text-xxs bg-blue-600 text-white px-1 rounded">WINNER</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between items-center text-xxs text-gray-500">
                    <span>Status: {m.status}</span>
                    <span className="text-purple-400 font-bold hover:underline">Kelola &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pool rankings view tab */}
      {activeTab === "pool" && (
        <div className="space-y-4">
          <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Award className="text-yellow-400 w-5 h-5" />
            Klasemen Sementara Pool Seni (TGR)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs font-bold text-gray-400 uppercase bg-white/5">
                  <th className="p-3">Rank</th>
                  <th className="p-3">Nama Atlet</th>
                  <th className="p-3">Kontingen</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Sudut</th>
                  <th className="p-3 text-right">Skor Akhir (TGR)</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {poolRanking.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-gray-500">
                      Belum ada atlet yang terdaftar di jadwal partai.
                    </td>
                  </tr>
                ) : (
                  poolRanking.map((item, index) => {
                    const isMedal = index < 3;
                    const medalColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
                    
                    return (
                      <tr
                        key={`${item.athlete.id}-${item.sudut}-${item.matchNo}`}
                        className="border-b border-white/5 hover:bg-white/5 transition-all text-sm"
                      >
                        <td className="p-3 font-mono font-bold">
                          {isMedal ? (
                            <span className={`flex items-center gap-1 ${medalColors[index]}`}>
                              <Award className="w-4 h-4 fill-current" />
                              {index + 1}
                            </span>
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-white">{item.athlete.nama}</td>
                        <td className="p-3 text-gray-300">{item.athlete.kontingen}</td>
                        <td className="p-3 text-gray-400 text-xs">
                          {item.kategori} - {item.usia} ({item.gender === "Putera" ? "PA" : "PI"})
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xxs font-bold ${
                            item.sudut === 'Merah' 
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            Sudut {item.sudut}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-yellow-400 text-base">
                          {item.approved ? item.finalScore.toFixed(2) : (
                            <span className="text-xs text-gray-400 font-sans italic">Belum Disahkan</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {item.approved ? (
                            <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                              Disahkan
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                              Menunggu
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generator and registration tab */}
      {activeTab === "generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Athlete Registration Form */}
          <div className="lg:col-span-1 space-y-4">
            <h4 className="font-display font-bold text-white flex items-center gap-2">
              <Plus className="text-purple-400 w-4 h-4" />
              Daftar Atlet Baru
            </h4>

            <form onSubmit={handleAddAthlete} className="space-y-3 bg-white/5 p-4 rounded-lg border border-white/5">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gilang Permana"
                  value={newAth.nama}
                  onChange={e => setNewAth({ ...newAth, nama: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Kontingen (Provinsi/Klub)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jawa Barat"
                  value={newAth.kontingen}
                  onChange={e => setNewAth({ ...newAth, kontingen: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Golongan Usia</label>
                  <select
                    value={newAth.usia}
                    onChange={e => setNewAth({ ...newAth, usia: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Pra-Usia Dini">Pra-Usia Dini</option>
                    <option value="Usia Dini">Usia Dini</option>
                    <option value="Pra-Remaja">Pra-Remaja</option>
                    <option value="Remaja">Remaja</option>
                    <option value="Dewasa">Dewasa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Jenis Kelamin</label>
                  <select
                    value={newAth.gender}
                    onChange={e => setNewAth({ ...newAth, gender: e.target.value as any })}
                    className="w-full bg-black/40 border border-white/10 rounded px-2 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Putera">Putera (PA)</option>
                    <option value="Puteri">Puteri (PI)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs py-2 rounded transition-all cursor-pointer shadow-lg shadow-purple-900/30"
              >
                Registrasikan Atlet
              </button>
            </form>
          </div>

          {/* Registered Athletes List & Bracketing Control */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-display font-bold text-white flex items-center gap-2">
                <Users className="text-blue-400 w-4 h-4" />
                Atlet Terdaftar ({athletes.length})
              </h4>
              <button
                onClick={generateAutomaticBrackets}
                className="flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-black font-bold text-xs px-3 py-1.5 rounded transition-all cursor-pointer shadow"
                id="btn-auto-bracket"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                Generate Bagan Otomatis
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 bg-black/20 p-3 rounded-lg border border-white/5">
              {athletes.map((ath) => (
                <div
                  key={ath.id}
                  className="bg-white/5 border border-white/5 p-3 rounded flex justify-between items-center hover:bg-white/10 transition-all text-xs"
                >
                  <div>
                    <p className="font-bold text-white text-sm">{ath.nama}</p>
                    <p className="text-gray-400 font-medium">{ath.kontingen}</p>
                    <p className="text-xxs text-purple-400 font-semibold uppercase mt-0.5">
                      {ath.usia} &bull; {ath.gender}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAthletes(athletes.filter(a => a.id !== ath.id));
                    }}
                    className="text-red-500 hover:text-red-400 font-bold hover:bg-red-500/10 px-2 py-1 rounded"
                  >
                    Hapus
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xxs text-gray-500 italic">
              * Tombol "Generate Bagan Otomatis" akan mengelompokkan atlet berdasarkan kategori usia dan jenis kelamin, kemudian membuat bagan eliminasi (Battle Tree) secara otomatis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
