import React from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { Printer, Download, FileText, CheckCircle } from 'lucide-react';
import { IpsiLogo, PersilatLogo } from '../shared/IpsiLogo';

export const OfficialScorecardPrint: React.FC = () => {
  const {
    matchInfo,
    blueScores,
    redScores,
    blueTotalScore,
    redTotalScore,
    calculateRoundScore,
    winnerAnnouncement,
  } = useSilatMatch();

  const handlePrint = () => {
    window.print();
  };

  const rounds = [1, 2, 3] as const;

  const winnerName =
    blueTotalScore > redTotalScore
      ? matchInfo.blueAthlete.name
      : redTotalScore > blueTotalScore
      ? matchInfo.redAthlete.name
      : 'HASIL SERI';

  const winnerCorner =
    blueTotalScore > redTotalScore
      ? 'SUDUT BIRU'
      : redTotalScore > blueTotalScore
      ? 'SUDUT MERAH'
      : 'DRAW';

  return (
    <div className="space-y-6">
      {/* Top Action bar (Hidden when printing) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            FORMULIR REKAPITULASI NILAI RESMI PERSILAT / IPSI
          </h3>
          <p className="text-xs text-zinc-400">
            Dokumen sah rekapitulasi poin dan keputusan pertandingan kategori tanding.
          </p>
        </div>
        <button
          id="btn-print-official-scorecard"
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20"
        >
          <Printer className="w-4 h-4" />
          Cetak / Simpan PDF Rekapitulasi
        </button>
      </div>

      {/* THE OFFICIAL PRINTABLE PAPER DOCUMENT */}
      <div
        id="official-printable-scorecard-form"
        className="bg-white text-zinc-900 p-6 sm:p-10 rounded-3xl border border-zinc-300 shadow-2xl font-sans max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0"
      >
        {/* Official Header */}
        <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <IpsiLogo size={56} />
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-zinc-900 leading-tight">
                IKATAN PENCAK SILAT INDONESIA (IPSI)
              </h2>
              <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
                LEMBAR REKAPITULASI NILAI PERTANDINGAN KATEGORI TANDING
              </p>
              <p className="text-[10px] text-zinc-500">
                Standar Peraturan Pertandingan Internasional PERSILAT
              </p>
            </div>
          </div>
          <PersilatLogo size={56} />
        </div>

        {/* Tournament & Match Metadata Table */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-zinc-100 rounded-xl border border-zinc-300 text-xs mb-4">
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">KEJUARAAN</span>
            <span className="font-bold text-zinc-900 truncate block">{matchInfo.tournamentName}</span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">GELANGGANG / PARTAI</span>
            <span className="font-bold text-zinc-900">
              {matchInfo.arena} - {matchInfo.partaiNumber}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">KELAS & GOLONGAN</span>
            <span className="font-bold text-zinc-900">
              {matchInfo.categoryClass} ({matchInfo.ageGroup} {matchInfo.gender})
            </span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">TAHAPAN</span>
            <span className="font-bold text-zinc-900">{matchInfo.roundPhase}</span>
          </div>
        </div>

        {/* Athletes Banner */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Blue */}
          <div className="p-3 bg-blue-50 border-2 border-blue-600 rounded-xl">
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block">
              SUDUT BIRU (BLUE CORNER)
            </span>
            <h4 className="text-sm font-black text-zinc-900 uppercase mt-0.5">
              {matchInfo.blueAthlete.name}
            </h4>
            <div className="text-xs text-blue-900 font-semibold">
              KONTINGEN: {matchInfo.blueAthlete.contingent}
            </div>
          </div>

          {/* Red */}
          <div className="p-3 bg-red-50 border-2 border-red-600 rounded-xl">
            <span className="text-[10px] font-black text-red-700 uppercase tracking-wider block">
              SUDUT MERAH (RED CORNER)
            </span>
            <h4 className="text-sm font-black text-zinc-900 uppercase mt-0.5">
              {matchInfo.redAthlete.name}
            </h4>
            <div className="text-xs text-red-900 font-semibold">
              KONTINGEN: {matchInfo.redAthlete.contingent}
            </div>
          </div>
        </div>

        {/* Per-Round Official Score Matrix Table */}
        <table className="w-full text-xs border-collapse border border-zinc-400 mb-6 text-center">
          <thead>
            <tr className="bg-zinc-800 text-white">
              <th className="border border-zinc-400 p-2 uppercase" colSpan={4}>
                SUDUT BIRU
              </th>
              <th className="border border-zinc-400 p-2 uppercase w-32">RINCIAN TEKNIK</th>
              <th className="border border-zinc-400 p-2 uppercase" colSpan={4}>
                SUDUT MERAH
              </th>
            </tr>
            <tr className="bg-zinc-200 text-zinc-800 font-bold">
              <th className="border border-zinc-400 p-1">Babak 1</th>
              <th className="border border-zinc-400 p-1">Babak 2</th>
              <th className="border border-zinc-400 p-1">Babak 3</th>
              <th className="border border-zinc-400 p-1 bg-blue-100 text-blue-900">Total</th>
              <th className="border border-zinc-400 p-1 bg-zinc-300">Unsur Nilai</th>
              <th className="border border-zinc-400 p-1 bg-red-100 text-red-900">Total</th>
              <th className="border border-zinc-400 p-1">Babak 1</th>
              <th className="border border-zinc-400 p-1">Babak 2</th>
              <th className="border border-zinc-400 p-1">Babak 3</th>
            </tr>
          </thead>
          <tbody>
            {/* Pukulan (+1) */}
            <tr>
              <td className="border border-zinc-400 p-1 font-mono">{blueScores.round1.pukulan}</td>
              <td className="border border-zinc-400 p-1 font-mono">{blueScores.round2.pukulan}</td>
              <td className="border border-zinc-400 p-1 font-mono">{blueScores.round3.pukulan}</td>
              <td className="border border-zinc-400 p-1 font-mono font-bold bg-blue-50">
                {blueScores.round1.pukulan + blueScores.round2.pukulan + blueScores.round3.pukulan}
              </td>
              <td className="border border-zinc-400 p-1 font-bold bg-zinc-100">Pukulan (+1)</td>
              <td className="border border-zinc-400 p-1 font-mono font-bold bg-red-50">
                {redScores.round1.pukulan + redScores.round2.pukulan + redScores.round3.pukulan}
              </td>
              <td className="border border-zinc-400 p-1 font-mono">{redScores.round1.pukulan}</td>
              <td className="border border-zinc-400 p-1 font-mono">{redScores.round2.pukulan}</td>
              <td className="border border-zinc-400 p-1 font-mono">{redScores.round3.pukulan}</td>
            </tr>

            {/* Tendangan (+2) */}
            <tr>
              <td className="border border-zinc-400 p-1 font-mono">{blueScores.round1.tendangan}</td>
              <td className="border border-zinc-400 p-1 font-mono">{blueScores.round2.tendangan}</td>
              <td className="border border-zinc-400 p-1 font-mono">{blueScores.round3.tendangan}</td>
              <td className="border border-zinc-400 p-1 font-mono font-bold bg-blue-50">
                {(blueScores.round1.tendangan + blueScores.round2.tendangan + blueScores.round3.tendangan) * 2}
              </td>
              <td className="border border-zinc-400 p-1 font-bold bg-zinc-100">Tendangan (+2)</td>
              <td className="border border-zinc-400 p-1 font-mono font-bold bg-red-50">
                {(redScores.round1.tendangan + redScores.round2.tendangan + redScores.round3.tendangan) * 2}
              </td>
              <td className="border border-zinc-400 p-1 font-mono">{redScores.round1.tendangan}</td>
              <td className="border border-zinc-400 p-1 font-mono">{redScores.round2.tendangan}</td>
              <td className="border border-zinc-400 p-1 font-mono">{redScores.round3.tendangan}</td>
            </tr>

            {/* Jatuhan (+3) */}
            <tr>
              <td className="border border-zinc-400 p-1 font-mono">{blueScores.round1.jatuhan}</td>
              <td className="border border-zinc-400 p-1 font-mono">{blueScores.round2.jatuhan}</td>
              <td className="border border-zinc-400 p-1 font-mono">{blueScores.round3.jatuhan}</td>
              <td className="border border-zinc-400 p-1 font-mono font-bold bg-blue-50">
                {(blueScores.round1.jatuhan + blueScores.round2.jatuhan + blueScores.round3.jatuhan) * 3}
              </td>
              <td className="border border-zinc-400 p-1 font-bold bg-zinc-100">Jatuhan (+3)</td>
              <td className="border border-zinc-400 p-1 font-mono font-bold bg-red-50">
                {(redScores.round1.jatuhan + redScores.round2.jatuhan + redScores.round3.jatuhan) * 3}
              </td>
              <td className="border border-zinc-400 p-1 font-mono">{redScores.round1.jatuhan}</td>
              <td className="border border-zinc-400 p-1 font-mono">{redScores.round2.jatuhan}</td>
              <td className="border border-zinc-400 p-1 font-mono">{redScores.round3.jatuhan}</td>
            </tr>

            {/* Hukuman (-) */}
            <tr className="text-red-700 bg-red-50/50">
              <td className="border border-zinc-400 p-1 font-mono">
                -{calculateRoundScore(blueScores.round1).penaltiesPts}
              </td>
              <td className="border border-zinc-400 p-1 font-mono">
                -{calculateRoundScore(blueScores.round2).penaltiesPts}
              </td>
              <td className="border border-zinc-400 p-1 font-mono">
                -{calculateRoundScore(blueScores.round3).penaltiesPts}
              </td>
              <td className="border border-zinc-400 p-1 font-mono font-bold">
                -(
                {calculateRoundScore(blueScores.round1).penaltiesPts +
                  calculateRoundScore(blueScores.round2).penaltiesPts +
                  calculateRoundScore(blueScores.round3).penaltiesPts}
                )
              </td>
              <td className="border border-zinc-400 p-1 font-bold bg-zinc-100 text-zinc-900">Hukuman (-)</td>
              <td className="border border-zinc-400 p-1 font-mono font-bold">
                -(
                {calculateRoundScore(redScores.round1).penaltiesPts +
                  calculateRoundScore(redScores.round2).penaltiesPts +
                  calculateRoundScore(redScores.round3).penaltiesPts}
                )
              </td>
              <td className="border border-zinc-400 p-1 font-mono">
                -{calculateRoundScore(redScores.round1).penaltiesPts}
              </td>
              <td className="border border-zinc-400 p-1 font-mono">
                -{calculateRoundScore(redScores.round2).penaltiesPts}
              </td>
              <td className="border border-zinc-400 p-1 font-mono">
                -{calculateRoundScore(redScores.round3).penaltiesPts}
              </td>
            </tr>

            {/* TOTAL AKUMULASI */}
            <tr className="bg-zinc-100 font-bold text-sm">
              <td className="border border-zinc-400 p-2 font-mono" colSpan={4}>
                <span className="text-blue-700 font-extrabold text-base">{blueTotalScore}</span>
              </td>
              <td className="border border-zinc-400 p-2 uppercase bg-zinc-300">TOTAL AKHIR</td>
              <td className="border border-zinc-400 p-2 font-mono" colSpan={4}>
                <span className="text-red-700 font-extrabold text-base">{redTotalScore}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Official Decision Box */}
        <div className="p-4 border-2 border-zinc-800 rounded-2xl mb-6 bg-zinc-50 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
              KEPUTUSAN PEMENANG RESMI
            </span>
            <div className="text-base font-black text-zinc-900 uppercase mt-0.5">
              PEMENANG: <span className="text-blue-700">{winnerName}</span> ({winnerCorner})
            </div>
            <div className="text-xs text-zinc-700 font-semibold mt-1">
              STATUS KEPUTUSAN:{' '}
              <span className="font-bold">
                {winnerAnnouncement?.decisionType || 'MENANG ANGKA'}
              </span>
            </div>
          </div>

          <div className="text-center p-3 border border-zinc-400 rounded-xl bg-white min-w-[140px]">
            <span className="text-[10px] text-zinc-500 block uppercase font-bold">SKOR AKHIR</span>
            <span className="text-xl font-black font-mono text-zinc-900">
              {blueTotalScore} : {redTotalScore}
            </span>
          </div>
        </div>

        {/* Official Signatures Section */}
        <div className="grid grid-cols-4 gap-4 text-center text-xs text-zinc-800 pt-2 border-t border-zinc-300">
          <div>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-zinc-400 w-full text-center pb-1 text-[11px]">
                ( Juri 1 )
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 block mt-1">JURI SUDUT 1</span>
          </div>

          <div>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-zinc-400 w-full text-center pb-1 text-[11px]">
                ( Juri 2 )
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 block mt-1">JURI SUDUT 2</span>
          </div>

          <div>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-zinc-400 w-full text-center pb-1 text-[11px]">
                ( Juri 3 )
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 block mt-1">JURI SUDUT 3</span>
          </div>

          <div>
            <div className="h-16 flex items-end justify-center">
              <span className="border-b border-zinc-400 w-full text-center pb-1 text-[11px]">
                ( Ketua Pertandingan )
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 block mt-1">DEWAN JURI / KETUA</span>
          </div>
        </div>
      </div>
    </div>
  );
};
