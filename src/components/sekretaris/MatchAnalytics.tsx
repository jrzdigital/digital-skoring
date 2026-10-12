import React from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { TrendingUp, BarChart3, PieChart, ShieldCheck } from 'lucide-react';

export const MatchAnalytics: React.FC = () => {
  const { blueScores, redScores, blueTotalScore, redTotalScore, calculateRoundScore, matchInfo } =
    useSilatMatch();

  // Round progression accumulation
  const r1Blue = calculateRoundScore(blueScores.round1).totalSubtotal;
  const r2Blue = r1Blue + calculateRoundScore(blueScores.round2).totalSubtotal;
  const r3Blue = r2Blue + calculateRoundScore(blueScores.round3).totalSubtotal;

  const r1Red = calculateRoundScore(redScores.round1).totalSubtotal;
  const r2Red = r1Red + calculateRoundScore(redScores.round2).totalSubtotal;
  const r3Red = r2Red + calculateRoundScore(redScores.round3).totalSubtotal;

  const progressionData = [
    { round: 'Mulai', blue: 0, red: 0 },
    { round: 'Babak 1', blue: r1Blue, red: r1Red },
    { round: 'Babak 2', blue: r2Blue, red: r2Red },
    { round: 'Babak 3', blue: r3Blue, red: r3Red },
  ];

  // Attack category totals across 3 rounds
  const totalPukulanBlue =
    blueScores.round1.pukulan + blueScores.round2.pukulan + blueScores.round3.pukulan;
  const totalTendanganBlue =
    blueScores.round1.tendangan + blueScores.round2.tendangan + blueScores.round3.tendangan;
  const totalJatuhanBlue =
    blueScores.round1.jatuhan + blueScores.round2.jatuhan + blueScores.round3.jatuhan;
  const totalPenaltiesBlue =
    calculateRoundScore(blueScores.round1).penaltiesPts +
    calculateRoundScore(blueScores.round2).penaltiesPts +
    calculateRoundScore(blueScores.round3).penaltiesPts;

  const totalPukulanRed =
    redScores.round1.pukulan + redScores.round2.pukulan + redScores.round3.pukulan;
  const totalTendanganRed =
    redScores.round1.tendangan + redScores.round2.tendangan + redScores.round3.tendangan;
  const totalJatuhanRed =
    redScores.round1.jatuhan + redScores.round2.jatuhan + redScores.round3.jatuhan;
  const totalPenaltiesRed =
    calculateRoundScore(redScores.round1).penaltiesPts +
    calculateRoundScore(redScores.round2).penaltiesPts +
    calculateRoundScore(redScores.round3).penaltiesPts;

  const attackDistributionData = [
    { category: 'Pukulan (+1)', blue: totalPukulanBlue, red: totalPukulanRed },
    { category: 'Tendangan (+2)', blue: totalTendanganBlue, red: totalTendanganRed },
    { category: 'Jatuhan (+3)', blue: totalJatuhanBlue, red: totalJatuhanRed },
    { category: 'Hukuman (-)', blue: totalPenaltiesBlue, red: totalPenaltiesRed },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-blue-950/60 border border-blue-600/60">
          <span className="text-[10px] font-black text-blue-400 uppercase">SUDUT BIRU</span>
          <div className="text-2xl font-black font-digital text-blue-300 mt-1">{blueTotalScore} Poin</div>
          <p className="text-xs text-zinc-400 mt-1 truncate">{matchInfo.blueAthlete.name}</p>
        </div>

        <div className="p-4 rounded-2xl bg-red-950/60 border border-red-600/60">
          <span className="text-[10px] font-black text-red-400 uppercase">SUDUT MERAH</span>
          <div className="text-2xl font-black font-digital text-red-300 mt-1">{redTotalScore} Poin</div>
          <p className="text-xs text-zinc-400 mt-1 truncate">{matchInfo.redAthlete.name}</p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] font-black text-amber-400 uppercase">SELISIH ANGKA</span>
          <div className="text-2xl font-black font-digital text-amber-300 mt-1">
            {Math.abs(blueTotalScore - redTotalScore)} Poin
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {blueTotalScore > redTotalScore
              ? 'Sudut Biru Memimpin'
              : redTotalScore > blueTotalScore
              ? 'Sudut Merah Memimpin'
              : 'Skor Imbang'}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <span className="text-[10px] font-black text-emerald-400 uppercase">TOTAL SERANGAN MASUK</span>
          <div className="text-2xl font-black font-digital text-emerald-300 mt-1">
            {totalPukulanBlue + totalTendanganBlue + totalJatuhanBlue + totalPukulanRed + totalTendanganRed + totalJatuhanRed}
          </div>
          <p className="text-xs text-zinc-400 mt-1">Teknik terkonfirmasi sah</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progression Area Chart */}
        <div className="p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Tren Akumulasi Poin Per Babak
            </h3>
            <span className="text-[11px] text-zinc-400">Area Chart</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressionData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="round" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#3f3f46',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="blue"
                  name="Sudut Biru"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorBlue)"
                />
                <Area
                  type="monotone"
                  dataKey="red"
                  name="Sudut Merah"
                  stroke="#ef4444"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRed)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attack Category Comparison Bar Chart */}
        <div className="p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              Perbandingan Serangan Masuk & Hukuman
            </h3>
            <span className="text-[11px] text-zinc-400">Bar Chart</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attackDistributionData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="category" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#3f3f46',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="blue" name="Sudut Biru" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="red" name="Sudut Merah" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
