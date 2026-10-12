import React, { useState } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { Corner } from '../../types/silat';
import { Video, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { motion } from 'motion/react';

export const VarDewanModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { varSession, startVarSession, resolveVarSession, cancelVarSession, matchInfo } = useSilatMatch();

  const [varType, setVarType] = useState<'JATUHAN' | 'PELANGGARAN'>('JATUHAN');
  const [targetCorner, setTargetCorner] = useState<Corner | null>('BLUE');
  const [reason, setReason] = useState<string>('Verifikasi keabsahan teknik jatuhan');

  if (!isOpen && (!varSession || !varSession.active)) return null;

  const judges = [1, 2, 3] as const;

  const handleStartSession = () => {
    startVarSession(varType, targetCorner, reason);
  };

  const votes = varSession?.votes || {};
  const blueCount = Object.values(votes).filter((v) => v === 'BLUE').length;
  const redCount = Object.values(votes).filter((v) => v === 'RED').length;
  const invalidCount = Object.values(votes).filter((v) => v === 'INVALID').length;
  const totalVotes = Object.keys(votes).length;

  return (
    <div
      id="modal-var-dewan"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-zinc-900 border-2 border-amber-500/80 rounded-3xl p-6 shadow-2xl relative text-white"
      >
        <button
          onClick={() => {
            if (varSession?.active) cancelVarSession();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black font-display uppercase tracking-wider">
              PANEL VERIFIKASI DEWAN (VAR SYSTEM)
            </h3>
            <p className="text-xs text-zinc-400">
              Sesi live voting 3 juri sudut untuk keputusan Jatuhan / Pelanggaran
            </p>
          </div>
        </div>

        {!varSession || !varSession.active ? (
          /* Form to initiate VAR */
          <div className="space-y-4 my-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1.5">
                Jenis Verifikasi
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setVarType('JATUHAN');
                    setReason('Verifikasi keabsahan teknik jatuhan');
                  }}
                  className={`p-3 rounded-xl border font-bold text-sm transition-all ${
                    varType === 'JATUHAN'
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  }`}
                >
                  🥋 VERIFIKASI JATUHAN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVarType('PELANGGARAN');
                    setReason('Verifikasi pelanggaran wasit / pukulan terlarang');
                  }}
                  className={`p-3 rounded-xl border font-bold text-sm transition-all ${
                    varType === 'PELANGGARAN'
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  }`}
                >
                  ⚠️ VERIFIKASI PELANGGARAN
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1.5">
                Fokus Sudut Atlet
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTargetCorner('BLUE')}
                  className={`p-3 rounded-xl border font-bold text-sm text-left transition-all ${
                    targetCorner === 'BLUE'
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  }`}
                >
                  <span className="text-[10px] block opacity-80 uppercase">Sudut Biru</span>
                  {matchInfo.blueAthlete.name}
                </button>
                <button
                  type="button"
                  onClick={() => setTargetCorner('RED')}
                  className={`p-3 rounded-xl border font-bold text-sm text-left transition-all ${
                    targetCorner === 'RED'
                      ? 'bg-red-600 border-red-400 text-white shadow-lg'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                  }`}
                >
                  <span className="text-[10px] block opacity-80 uppercase">Sudut Merah</span>
                  {matchInfo.redAthlete.name}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase mb-1.5">
                Catatan / Alasan Verifikasi
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                placeholder="Contoh: Jatuhan sah sudut biru atau bantingan terlarang..."
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                id="btn-confirm-start-var"
                onClick={handleStartSession}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20"
              >
                Buka Sesi Verifikasi Live Juri
              </button>
            </div>
          </div>
        ) : (
          /* Active VAR Voting Progress & Resolution */
          <div className="space-y-6 my-4">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span>STATUS VOTING: {totalVotes}/3 JURI TELAH MEMILIH</span>
                <span className="font-bold text-amber-400">{varSession.type}</span>
              </div>
              <p className="text-sm font-semibold text-zinc-200">{varSession.reason}</p>
            </div>

            {/* Live 3-Judge Choices */}
            <div className="grid grid-cols-3 gap-3">
              {judges.map((judgeId) => {
                const v = varSession.votes[judgeId];
                return (
                  <div
                    key={judgeId}
                    className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center flex flex-col items-center justify-between min-h-[110px]"
                  >
                    <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> JURI {judgeId}
                    </span>
                    <div className="my-2">
                      {v === 'BLUE' ? (
                        <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-extrabold text-xs">
                          BIRU
                        </span>
                      ) : v === 'RED' ? (
                        <span className="px-2.5 py-1 rounded bg-red-600 text-white font-extrabold text-xs">
                          MERAH
                        </span>
                      ) : v === 'INVALID' ? (
                        <span className="px-2.5 py-1 rounded bg-zinc-700 text-zinc-200 font-bold text-xs">
                          TIDAK SAH
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-xs italic animate-pulse">Menunggu...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tally Summary */}
            <div className="flex items-center justify-around p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-bold">
              <span className="text-blue-400">Sudut Biru: {blueCount} Suara</span>
              <span className="text-red-400">Sudut Merah: {redCount} Suara</span>
              <span className="text-zinc-400">Tidak Sah: {invalidCount} Suara</span>
            </div>

            {/* Resolution Buttons */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-zinc-400 uppercase">
                Eksekusi Ketetapan Dewan
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  id="btn-resolve-var-blue"
                  onClick={() => {
                    resolveVarSession('BLUE');
                    onClose();
                  }}
                  className="py-3 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase transition-all shadow-md shadow-blue-900/40"
                >
                  SAHKAN BIRU (+3)
                </button>
                <button
                  type="button"
                  id="btn-resolve-var-red"
                  onClick={() => {
                    resolveVarSession('RED');
                    onClose();
                  }}
                  className="py-3 px-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase transition-all shadow-md shadow-red-900/40"
                >
                  SAHKAN MERAH (+3)
                </button>
                <button
                  type="button"
                  id="btn-resolve-var-invalid"
                  onClick={() => {
                    resolveVarSession('INVALID');
                    onClose();
                  }}
                  className="py-3 px-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase transition-all"
                >
                  TIDAK SAH / BATAL
                </button>
              </div>

              <button
                type="button"
                id="btn-cancel-var"
                onClick={() => {
                  cancelVarSession();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 hover:bg-zinc-800 text-zinc-400 text-xs font-semibold transition-colors mt-2"
              >
                Batalkan Sesi Verifikasi
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
