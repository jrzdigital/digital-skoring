import React, { useState } from 'react';
import { 
  Plus, 
  Minus, 
  AlertTriangle, 
  ShieldAlert, 
  UserCheck, 
  Settings, 
  RotateCcw, 
  Undo2, 
  Volume2, 
  Check, 
  Edit3,
  Flame,
  Zap
} from 'lucide-react';
import { TandingMatchState, CornerColor, PenaltyType, ScoreAction } from '../types/scoring';
import { soundManager } from '../utils/audio';

interface TandingOperatorPanelProps {
  match: TandingMatchState;
  onManualPointAdjust: (corner: CornerColor, points: number, reason: string) => void;
  onApplyPenalty: (corner: CornerColor, penaltyType: PenaltyType) => void;
  onResetPenalties: (corner: CornerColor) => void;
  onUndoLastAction: () => void;
  onUpdateMatchMeta: (meta: {
    arena: string;
    matchNumber: string;
    weightClass: string;
    redName: string;
    redContingent: string;
    blueName: string;
    blueContingent: string;
    roundDurationSeconds: number;
    judgeCount: 3 | 5;
  }) => void;
}

export const TandingOperatorPanel: React.FC<TandingOperatorPanelProps> = ({
  match,
  onManualPointAdjust,
  onApplyPenalty,
  onResetPenalties,
  onUndoLastAction,
  onUpdateMatchMeta,
}) => {
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({
    arena: match.arena,
    matchNumber: match.matchNumber,
    weightClass: match.weightClass,
    redName: match.redCorner.name,
    redContingent: match.redCorner.contingent,
    blueName: match.blueCorner.name,
    blueContingent: match.blueCorner.contingent,
    roundDurationSeconds: match.roundDurationSeconds,
    judgeCount: match.judgeCount,
  });

  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMatchMeta(metaForm);
    setIsEditingMeta(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 text-slate-100">
      {/* Panel Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Konsol Operator & Ketua Pertandingan
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-400">
              IPSI 2026 Admin
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Koreksi nilai, kontrol hukuman (Teguran/Peringatan), pengaturan gelanggang, dan log aksi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onUndoLastAction}
            disabled={match.recentActions.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold text-slate-200 transition-all border border-slate-700"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo Poin Terakhir
          </button>
          <button
            onClick={() => setIsEditingMeta(!isEditingMeta)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            {isEditingMeta ? 'Tutup Edit' : 'Edit Info Partai'}
          </button>
        </div>
      </div>

      {/* Edit Match Information Form (Collapsible) */}
      {isEditingMeta && (
        <form onSubmit={handleSaveMeta} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
            Pengaturan Info Gelanggang & Pesilat
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Gelanggang</label>
              <input
                type="text"
                value={metaForm.arena}
                onChange={(e) => setMetaForm({ ...metaForm, arena: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nomor Partai</label>
              <input
                type="text"
                value={metaForm.matchNumber}
                onChange={(e) => setMetaForm({ ...metaForm, matchNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Kelas Tanding</label>
              <input
                type="text"
                value={metaForm.weightClass}
                onChange={(e) => setMetaForm({ ...metaForm, weightClass: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            {/* Red athlete meta */}
            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl space-y-2">
              <span className="text-xs font-bold text-red-400 uppercase">Pesilat Sudut Merah</span>
              <input
                type="text"
                placeholder="Nama Atlet Merah"
                value={metaForm.redName}
                onChange={(e) => setMetaForm({ ...metaForm, redName: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white mb-2"
              />
              <input
                type="text"
                placeholder="Kontingen / Daerah"
                value={metaForm.redContingent}
                onChange={(e) => setMetaForm({ ...metaForm, redContingent: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>

            {/* Blue athlete meta */}
            <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl space-y-2">
              <span className="text-xs font-bold text-blue-400 uppercase">Pesilat Sudut Biru</span>
              <input
                type="text"
                placeholder="Nama Atlet Biru"
                value={metaForm.blueName}
                onChange={(e) => setMetaForm({ ...metaForm, blueName: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white mb-2"
              />
              <input
                type="text"
                placeholder="Kontingen / Daerah"
                value={metaForm.blueContingent}
                onChange={(e) => setMetaForm({ ...metaForm, blueContingent: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Durasi Bersih Babak</label>
              <select
                value={metaForm.roundDurationSeconds}
                onChange={(e) => setMetaForm({ ...metaForm, roundDurationSeconds: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value={90}>1 Menit 30 Detik (Usia Dini / Pra Remaja)</option>
                <option value={120}>2 Menit (Standar IPSI / Remaja / Dewasa)</option>
                <option value={180}>3 Menit (Standar Final Tertentu)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Jumlah Dewan Juri</label>
              <select
                value={metaForm.judgeCount}
                onChange={(e) => setMetaForm({ ...metaForm, judgeCount: parseInt(e.target.value) as 3 | 5 })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value={3}>3 Dewan Juri (Mayoritas 2 dari 3)</option>
                <option value={5}>5 Dewan Juri (Mayoritas 3 dari 5)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditingMeta(false)}
              className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      )}

      {/* Grid: Manual Points & Official IPSI Penalties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SUDUT MERAH CONTROLS */}
        <div className="p-6 rounded-2xl bg-slate-900 border-2 border-red-500/30 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-red-500/20">
            <div>
              <span className="text-xs font-black text-red-500 uppercase tracking-wider">
                KONTROL SUDUT MERAH
              </span>
              <h3 className="text-lg font-bold text-white">{match.redCorner.name}</h3>
            </div>
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
          </div>

          {/* Quick Manual Point Adjustment (+ / -) */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 block uppercase">
              Koreksi Poin Manual (Babak {match.currentRound})
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onManualPointAdjust('merah', 1, 'Pukulan Manual')}
                className="py-2 px-3 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-200 rounded-xl text-xs font-bold transition-all"
              >
                +1 Poin (Pukulan)
              </button>
              <button
                onClick={() => onManualPointAdjust('merah', 2, 'Tendangan Manual')}
                className="py-2 px-3 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-200 rounded-xl text-xs font-bold transition-all"
              >
                +2 Poin (Tendangan)
              </button>
              <button
                onClick={() => onManualPointAdjust('merah', 3, 'Jatuhan Manual')}
                className="py-2 px-3 bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-200 rounded-xl text-xs font-bold transition-all"
              >
                +3 Poin (Jatuhan)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onManualPointAdjust('merah', -1, 'Koreksi Minus 1')}
                className="py-1.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1"
              >
                <Minus className="w-3.5 h-3.5" /> Koreksi -1 Poin
              </button>
              <button
                onClick={() => onManualPointAdjust('merah', -2, 'Koreksi Minus 2')}
                className="py-1.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1"
              >
                <Minus className="w-3.5 h-3.5" /> Koreksi -2 Poin
              </button>
            </div>
          </div>

          {/* Official IPSI Penalties (Hukuman) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Hukuman Resmi IPSI 2026
              </span>
              <button
                onClick={() => onResetPenalties('merah')}
                className="text-[11px] text-slate-500 hover:text-red-400 transition-colors"
              >
                Reset Hukuman Merah
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onApplyPenalty('merah', 'binaan')}
                className="py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-between"
              >
                <span>Binaan Wasit</span>
                <span className="text-[10px] text-slate-500">0 Poin</span>
              </button>
              <button
                onClick={() => onApplyPenalty('merah', 'teguran1')}
                className="py-2 px-3 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
              >
                <span>Teguran 1</span>
                <span className="text-[10px] text-amber-400 font-mono">-1 Poin</span>
              </button>
              <button
                onClick={() => onApplyPenalty('merah', 'teguran2')}
                className="py-2 px-3 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-100 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
              >
                <span>Teguran 2</span>
                <span className="text-[10px] text-amber-400 font-mono">-2 Poin</span>
              </button>
              <button
                onClick={() => onApplyPenalty('merah', 'peringatan1')}
                className="py-2 px-3 bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-200 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
              >
                <span>Peringatan 1</span>
                <span className="text-[10px] text-red-400 font-mono">-5 Poin</span>
              </button>
              <button
                onClick={() => onApplyPenalty('merah', 'peringatan2')}
                className="py-2 px-3 bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-100 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
              >
                <span>Peringatan 2</span>
                <span className="text-[10px] text-red-400 font-mono">-10 Poin</span>
              </button>
              <button
                onClick={() => onApplyPenalty('merah', 'diskualifikasi')}
                className="py-2 px-3 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-between"
              >
                <span>Diskualifikasi</span>
                <span className="text-[10px] uppercase font-mono">DQ</span>
              </button>
            </div>
          </div>
        </div>

        {/* SUDUT BIRU CONTROLS */}
        <div className="p-6 rounded-2xl bg-slate-900 border-2 border-blue-500/30 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
            <div>
              <span className="text-xs font-black text-blue-500 uppercase tracking-wider">
                KONTROL SUDUT BIRU
              </span>
              <h3 className="text-lg font-bold text-white">{match.blueCorner.name}</h3>
            </div>
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          </div>

          {/* Quick Manual Point Adjustment (+ / -) */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 block uppercase">
              Koreksi Poin Manual (Babak {match.currentRound})
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onManualPointAdjust('biru', 1, 'Pukulan Manual')}
                className="py-2 px-3 bg-blue-950/60 hover:bg-blue-900 border border-blue-500/30 text-blue-200 rounded-xl text-xs font-bold transition-all"
              >
                +1 Poin (Pukulan)
              </button>
              <button
                onClick={() => onManualPointAdjust('biru', 2, 'Tendangan Manual')}
                className="py-2 px-3 bg-blue-950/60 hover:bg-blue-900 border border-blue-500/30 text-blue-200 rounded-xl text-xs font-bold transition-all"
              >
                +2 Poin (Tendangan)
              </button>
              <button
                onClick={() => onManualPointAdjust('biru', 3, 'Jatuhan Manual')}
                className="py-2 px-3 bg-blue-950/60 hover:bg-blue-900 border border-blue-500/30 text-blue-200 rounded-xl text-xs font-bold transition-all"
              >
                +3 Poin (Jatuhan)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onManualPointAdjust('biru', -1, 'Koreksi Minus 1')}
                className="py-1.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1"
              >
                <Minus className="w-3.5 h-3.5" /> Koreksi -1 Poin
              </button>
              <button
                onClick={() => onManualPointAdjust('biru', -2, 'Koreksi Minus 2')}
                className="py-1.5 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1"
              >
                <Minus className="w-3.5 h-3.5" /> Koreksi -2 Poin
              </button>
            </div>
          </div>

          {/* Official IPSI Penalties (Hukuman) */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Hukuman Resmi IPSI 2026
              </span>
              <button
                onClick={() => onResetPenalties('biru')}
                className="text-[11px] text-slate-500 hover:text-blue-400 transition-colors"
              >
                Reset Hukuman Biru
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onApplyPenalty('biru', 'binaan')}
                className="py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-between"
              >
                <span>Binaan Wasit</span>
                <span className="text-[10px] text-slate-500">0 Poin</span>
              </button>
              <button
                onClick={() => onApplyPenalty('biru', 'teguran1')}
                className="py-2 px-3 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/30 text-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
              >
                <span>Teguran 1</span>
                <span className="text-[10px] text-amber-400 font-mono">-1 Poin</span>
              </button>
              <button
                onClick={() => onApplyPenalty('biru', 'teguran2')}
                className="py-2 px-3 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-100 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
              >
                <span>Teguran 2</span>
                <span className="text-[10px] text-amber-400 font-mono">-2 Poin</span>
              </button>
              <button
                onClick={() => onApplyPenalty('biru', 'peringatan1')}
                className="py-2 px-3 bg-red-950/60 hover:bg-red-900 border border-red-500/40 text-red-200 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
              >
                <span>Peringatan 1</span>
                <span className="text-[10px] text-red-400 font-mono">-5 Poin</span>
              </button>
              <button
                onClick={() => onApplyPenalty('biru', 'peringatan2')}
                className="py-2 px-3 bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-100 rounded-xl text-xs font-bold transition-all flex items-center justify-between"
              >
                <span>Peringatan 2</span>
                <span className="text-[10px] text-red-400 font-mono">-10 Poin</span>
              </button>
              <button
                onClick={() => onApplyPenalty('biru', 'diskualifikasi')}
                className="py-2 px-3 bg-blue-700 hover:bg-blue-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-between"
              >
                <span>Diskualifikasi</span>
                <span className="text-[10px] uppercase font-mono">DQ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Match Action Stream / History Log */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            Log Linimasa Pertandingan & Verifikasi Dewan Wasit
          </h3>
          <span className="text-xs text-slate-400">
            {match.recentActions.length} Catatan Aksi Terdaftar
          </span>
        </div>

        {match.recentActions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Belum ada aksi poin atau hukuman yang tercatat pada pertandingan ini.
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {match.recentActions.map((act) => (
              <div 
                key={act.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${
                    act.corner === 'merah' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {act.corner}
                  </span>
                  <span className="text-slate-300 font-semibold">{act.description}</span>
                  <span className="text-slate-500 text-[11px] font-mono">Babak {act.round}</span>
                  {act.isAutoGenerated && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Auto-Juri
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">
                    Juri: [{act.judgesConfirmed.join(', ')}]
                  </span>
                  <span className={`font-mono font-bold ${
                    act.points > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {act.points > 0 ? `+${act.points}` : act.points} Poin
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
