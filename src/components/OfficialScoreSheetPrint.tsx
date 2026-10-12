import React from 'react';
import { Printer, X, Download, ShieldCheck } from 'lucide-react';
import { TandingMatchState, JurusMatchState, MatchCategory } from '../types/scoring';

interface OfficialScoreSheetPrintProps {
  category: MatchCategory;
  tandingMatch: TandingMatchState;
  jurusMatch: JurusMatchState;
  onClose: () => void;
}

export const OfficialScoreSheetPrint: React.FC<OfficialScoreSheetPrintProps> = ({
  category,
  tandingMatch,
  jurusMatch,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const calculateTotalTanding = (scores: typeof tandingMatch.redScores, penalties: typeof tandingMatch.redPenalties) => {
    const raw = scores.reduce((acc, curr) => acc + curr.total, 0);
    const penaltyPoints = (penalties.teguran === 1 ? -1 : penalties.teguran >= 2 ? -3 : 0) +
      (penalties.peringatan === 1 ? -5 : penalties.peringatan >= 2 ? -15 : 0);
    return Math.max(0, raw + penaltyPoints);
  };

  const redTotal = calculateTotalTanding(tandingMatch.redScores, tandingMatch.redPenalties);
  const blueTotal = calculateTotalTanding(tandingMatch.blueScores, tandingMatch.bluePenalties);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Floating Print Action Bar (Hidden in Print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">
              Pratinjau Lembar Nilai Resmi IPSI / PERSILAT 2026
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 space-y-6 text-sm">
          {/* Official Letterhead */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <h1 className="text-xl font-black uppercase tracking-wider">
              IKATAN PENCAK SILAT INDONESIA (IPSI) & PERSILAT
            </h1>
            <h2 className="text-sm font-bold uppercase tracking-wide">
              LEMBAR PENILAIAN DIGITAL & BERITA ACARA PERTANDINGAN
            </h2>
            <p className="text-xs text-slate-600">
              Sistem Digital Scoring Resmi Berdasarkan Peraturan Pertandingan IPSI 2026
            </p>
          </div>

          {/* Match Metadata Table */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <p><span className="font-bold text-slate-600">Gelanggang:</span> {category === 'tanding' ? tandingMatch.arena : jurusMatch.arena}</p>
              <p><span className="font-bold text-slate-600">Nomor Partai:</span> {category === 'tanding' ? tandingMatch.matchNumber : jurusMatch.matchNumber}</p>
              <p><span className="font-bold text-slate-600">Kategori:</span> {category === 'tanding' ? `Tanding (${tandingMatch.weightClass})` : `Seni / Jurus (${jurusMatch.subCategory.toUpperCase()})`}</p>
            </div>
            <div className="text-right">
              <p><span className="font-bold text-slate-600">Tanggal:</span> {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
              <p><span className="font-bold text-slate-600">Status Pertandingan:</span> {category === 'tanding' ? (tandingMatch.winner ? 'SELESAI (DISAHKAN)' : 'BERLANGSUNG') : (jurusMatch.isFinished ? 'SELESAI' : 'BERLANGSUNG')}</p>
              <p><span className="font-bold text-slate-600">Sistem Juri:</span> {category === 'tanding' ? `${tandingMatch.judgeCount} Dewan Juri Wasit` : '5 Dewan Juri Seni (Median IPSI)'}</p>
            </div>
          </div>

          {category === 'tanding' ? (
            /* TANDING RESULT TABLE */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Red Corner Box */}
                <div className="border border-red-300 rounded-lg p-4 bg-red-50/40">
                  <span className="text-xs font-bold text-red-700 uppercase">SUDUT MERAH</span>
                  <h3 className="text-base font-extrabold text-slate-900">{tandingMatch.redCorner.name}</h3>
                  <p className="text-xs text-slate-600">{tandingMatch.redCorner.contingent}</p>
                  <div className="mt-3 text-3xl font-black font-mono text-red-600">
                    {redTotal} <span className="text-xs font-normal text-slate-500">Poin Akhir</span>
                  </div>
                </div>

                {/* Blue Corner Box */}
                <div className="border border-blue-300 rounded-lg p-4 bg-blue-50/40">
                  <span className="text-xs font-bold text-blue-700 uppercase">SUDUT BIRU</span>
                  <h3 className="text-base font-extrabold text-slate-900">{tandingMatch.blueCorner.name}</h3>
                  <p className="text-xs text-slate-600">{tandingMatch.blueCorner.contingent}</p>
                  <div className="mt-3 text-3xl font-black font-mono text-blue-600">
                    {blueTotal} <span className="text-xs font-normal text-slate-500">Poin Akhir</span>
                  </div>
                </div>
              </div>

              {/* Rounds Breakdown Table */}
              <table className="w-full text-xs text-left border border-slate-300">
                <thead className="bg-slate-100 font-bold">
                  <tr>
                    <th className="p-2 border border-slate-300">Rincian Perolehan</th>
                    <th className="p-2 border border-slate-300 text-center">Babak 1</th>
                    <th className="p-2 border border-slate-300 text-center">Babak 2</th>
                    <th className="p-2 border border-slate-300 text-center">Babak 3</th>
                    <th className="p-2 border border-slate-300 text-center">Hukuman</th>
                    <th className="p-2 border border-slate-300 text-center font-black">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-slate-300 font-bold text-red-700">Sudut Merah</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{tandingMatch.redScores[0].total}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{tandingMatch.redScores[1].total}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{tandingMatch.redScores[2].total}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono text-red-600">
                      T:{tandingMatch.redPenalties.teguran} / P:{tandingMatch.redPenalties.peringatan}
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-mono font-black text-red-700">{redTotal}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-slate-300 font-bold text-blue-700">Sudut Biru</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{tandingMatch.blueScores[0].total}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{tandingMatch.blueScores[1].total}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{tandingMatch.blueScores[2].total}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono text-blue-600">
                      T:{tandingMatch.bluePenalties.teguran} / P:{tandingMatch.bluePenalties.peringatan}
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-mono font-black text-blue-700">{blueTotal}</td>
                  </tr>
                </tbody>
              </table>

              {/* Decision Box */}
              <div className="p-3 bg-slate-100 rounded-lg border border-slate-300 text-xs">
                <span className="font-bold text-slate-800">Keputusan Wasit / Pemenang: </span>
                {tandingMatch.winner ? (
                  <span className="font-black uppercase text-amber-700">
                    SUDUT {tandingMatch.winner.toUpperCase()} ({tandingMatch.winner === 'merah' ? tandingMatch.redCorner.name : tandingMatch.blueCorner.name}) - MENANG {tandingMatch.winType?.toUpperCase() || 'ANGKA'}
                  </span>
                ) : (
                  <span className="text-slate-500">Pertandingan belum selesai diputuskan.</span>
                )}
              </div>
            </div>
          ) : (
            /* JURUS / SENI RESULT TABLE */
            <div className="space-y-4">
              <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase">PESILAT SENI</span>
                <h3 className="text-lg font-black text-slate-900">{jurusMatch.competitor.name}</h3>
                <p className="text-xs text-slate-600">{jurusMatch.competitor.contingent}</p>
                <div className="mt-3 text-4xl font-black font-mono text-slate-900">
                  {jurusMatch.finalScore.toFixed(3)} <span className="text-xs font-normal text-slate-500">Skor Akhir Resmi</span>
                </div>
              </div>

              {/* 5 Judges Table */}
              <table className="w-full text-xs text-left border border-slate-300">
                <thead className="bg-slate-100 font-bold">
                  <tr>
                    <th className="p-2 border border-slate-300">Dewan Juri</th>
                    <th className="p-2 border border-slate-300">Kebenaran Gerak</th>
                    <th className="p-2 border border-slate-300">Salah Gerak</th>
                    <th className="p-2 border border-slate-300">Kemantapan</th>
                    <th className="p-2 border border-slate-300">Total Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {jurusMatch.judges.map((j) => (
                    <tr key={j.judgeId}>
                      <td className="p-2 border border-slate-300 font-semibold">{j.judgeName}</td>
                      <td className="p-2 border border-slate-300 font-mono">{j.kebenaran.toFixed(2)}</td>
                      <td className="p-2 border border-slate-300 font-mono">{j.kesalahanCount}x</td>
                      <td className="p-2 border border-slate-300 font-mono">+{j.kemantapan.toFixed(2)}</td>
                      <td className="p-2 border border-slate-300 font-mono font-bold">{j.total.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures Area */}
          <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs">
            <div>
              <p className="text-slate-600 mb-14">Official Sudut Merah</p>
              <div className="border-t border-slate-400 pt-1 font-semibold">
                ( .................................................. )
              </div>
            </div>
            <div>
              <p className="text-slate-600 mb-14">Wasit Utama Gelanggang</p>
              <div className="border-t border-slate-400 pt-1 font-semibold">
                ( .................................................. )
              </div>
            </div>
            <div>
              <p className="text-slate-600 mb-14">Ketua Pertandingan</p>
              <div className="border-t border-slate-400 pt-1 font-semibold">
                ( .................................................. )
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
