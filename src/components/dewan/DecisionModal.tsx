import React, { useState } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { Corner, DecisionType } from '../../types/silat';
import { Trophy, Award, X, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const DecisionModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { declareWinner, matchInfo, blueTotalScore, redTotalScore } = useSilatMatch();

  const [selectedWinner, setSelectedWinner] = useState<Corner | 'DRAW'>(
    blueTotalScore > redTotalScore ? 'BLUE' : redTotalScore > blueTotalScore ? 'RED' : 'DRAW'
  );
  const [decisionType, setDecisionType] = useState<DecisionType>('MENANG_ANGKA');
  const [customNotes, setCustomNotes] = useState<string>('');

  if (!isOpen) return null;

  const decisionOptions: { id: DecisionType; label: string; desc: string }[] = [
    {
      id: 'MENANG_ANGKA',
      label: 'Menang Angka',
      desc: 'Kemenangan berdasarkan akumulasi total skor tertinggi setelah 3 babak selesai.',
    },
    {
      id: 'MENANG_MUTLAK',
      label: 'Menang Mutlak',
      desc: 'Keputusan mutlak wasit/dewan karena keunggulan mutlak sepanjang pertandingan.',
    },
    {
      id: 'MENANG_DISKUALIFIKASI',
      label: 'Menang Diskualifikasi',
      desc: 'Lawan terkena Peringatan 3, pelanggaran berat tingkat 3, atau tindakan mencederai lawan.',
    },
    {
      id: 'MENANG_WMP',
      label: 'Menang W.M.P',
      desc: 'Wasit Menghentikan Pertandingan karena lawan tidak mampu melanjutkan atau cedera.',
    },
    {
      id: 'MENANG_TEKNIK',
      label: 'Menang Teknik',
      desc: 'Kemenangan akibat selisih poin telak (Gap Rule) atau penyerahan diri sudut lawan.',
    },
  ];

  const handleConfirm = () => {
    declareWinner(selectedWinner, decisionType, customNotes);
    onClose();
  };

  return (
    <div
      id="modal-decision-dewan"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-zinc-900 border-2 border-amber-500/80 rounded-3xl p-6 shadow-2xl relative text-white"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black font-display uppercase tracking-wider">
              PENETAPAN PEMENANG RESMI
            </h3>
            <p className="text-xs text-zinc-400">
              Formulir Keputusan Dewan Juri & Ketua Pertandingan Persilat / IPSI
            </p>
          </div>
        </div>

        {/* Step 1: Select Winner Corner */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
            1. Sudut Pemenang
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSelectedWinner('BLUE')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                selectedWinner === 'BLUE'
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg ring-2 ring-blue-400/40'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-80">
                SUDUT BIRU
              </div>
              <div className="text-sm font-black truncate">{matchInfo.blueAthlete.name}</div>
              <div className="text-xs font-mono font-bold mt-1 text-blue-200">
                Skor: {blueTotalScore}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedWinner('RED')}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                selectedWinner === 'RED'
                  ? 'bg-red-600 border-red-400 text-white shadow-lg ring-2 ring-red-400/40'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-80">
                SUDUT MERAH
              </div>
              <div className="text-sm font-black truncate">{matchInfo.redAthlete.name}</div>
              <div className="text-xs font-mono font-bold mt-1 text-red-200">
                Skor: {redTotalScore}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedWinner('DRAW')}
              className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center transition-all ${
                selectedWinner === 'DRAW'
                  ? 'bg-amber-600 border-amber-400 text-white shadow-lg ring-2 ring-amber-400/40'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400'
              }`}
            >
              <div className="text-[10px] font-black uppercase tracking-wider mb-1 opacity-80">
                SERI / DRAW
              </div>
              <div className="text-xs font-bold">Skor Seimbang</div>
              <div className="text-xs font-mono font-bold mt-1 text-amber-200">
                {blueTotalScore} : {redTotalScore}
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Select Decision Type */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">
            2. Jenis Keputusan Wasit / Dewan
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {decisionOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDecisionType(opt.id)}
                className={`w-full p-3 rounded-xl border text-left flex items-start justify-between gap-2 transition-all ${
                  decisionType === opt.id
                    ? 'bg-zinc-800 border-amber-500 text-amber-300 ring-1 ring-amber-500/50'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800/60'
                }`}
              >
                <div>
                  <div className="text-xs font-extrabold uppercase">{opt.label}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">{opt.desc}</div>
                </div>
                {decisionType === opt.id && <CheckCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">
            Catatan Tambahan (Opsional)
          </label>
          <input
            type="text"
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            placeholder="Contoh: Menang angka dengan selisih 12 poin..."
          />
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-submit-winner-decision"
            onClick={handleConfirm}
            className="flex-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20"
          >
            Sahkan & Umumkan Pemenang
          </button>
        </div>
      </motion.div>
    </div>
  );
};
