import React, { useState } from 'react';
import { useSilatMatch } from '../../context/SilatMatchContext';
import { InputAtlitTab } from './InputAtlitTab';
import { TournamentBracket } from './TournamentBracket';
import { RosterManager } from './RosterManager';
import {
  ArrowLeft,
  Users,
  Trophy,
  Calendar,
  RotateCw,
} from 'lucide-react';

interface GeneratorJadwalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeneratorJadwalModal: React.FC<GeneratorJadwalModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'INPUT_ATLIT' | 'BAGAN_BRAKET' | 'KONTROL_PARTAI'>('INPUT_ATLIT');
  const [isRotating, setIsRotating] = useState(false);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 md:p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0c0418] border border-[#3b135c] rounded-2xl sm:rounded-3xl w-full max-w-7xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100">
        
        {/* ================= HEADER BAR (IDENTICAL TO SCREENSHOT) ================= */}
        <header className="p-3 sm:p-4 border-b border-[#2d0f47] bg-[#120722] flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          {/* Left Side: KEMBALI & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c0b36] hover:bg-[#2c1254] border border-[#3b135c] text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>KEMBALI</span>
            </button>

            <div>
              <h1 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-sans">
                MODUL REGISTRASI DATA TURNAMEN
              </h1>
              <p className="text-[10px] text-purple-300/80 font-medium tracking-wide">
                REGISTRASI ATLIT • VISUALISASI BAGAN BRAKET • KONTROL PENJADWALAN PARTAI
              </p>
            </div>
          </div>

          {/* Right Side: 3 Tabs (1. INPUT ATLIT | 2. BAGAN BRAKET | 3. KONTROL PARTAI) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
            {/* Tab 1: 1. INPUT ATLIT */}
            <button
              type="button"
              onClick={() => setActiveTab('INPUT_ATLIT')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'INPUT_ATLIT'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950 border border-purple-400/80'
                  : 'bg-[#180930] hover:bg-[#260e4c] text-purple-300/80 hover:text-white border border-[#381359]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>1. INPUT ATLIT</span>
            </button>

            {/* Tab 2: 2. BAGAN BRAKET */}
            <button
              type="button"
              onClick={() => setActiveTab('BAGAN_BRAKET')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'BAGAN_BRAKET'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950 border border-purple-400/80'
                  : 'bg-[#180930] hover:bg-[#260e4c] text-purple-300/80 hover:text-white border border-[#381359]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>2. BAGAN BRAKET</span>
            </button>

            {/* Tab 3: 3. KONTROL PARTAI */}
            <button
              type="button"
              onClick={() => setActiveTab('KONTROL_PARTAI')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'KONTROL_PARTAI'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-950 border border-purple-400/80'
                  : 'bg-[#180930] hover:bg-[#260e4c] text-purple-300/80 hover:text-white border border-[#381359]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>3. KONTROL PARTAI</span>
            </button>
          </div>
        </header>

        {/* ================= CONTENT BODY ================= */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 bg-[#090314]">
          {activeTab === 'INPUT_ATLIT' && <InputAtlitTab />}
          {activeTab === 'BAGAN_BRAKET' && <TournamentBracket />}
          {activeTab === 'KONTROL_PARTAI' && <RosterManager />}
        </main>

        {/* ================= FOOTER BAR (IDENTICAL TO SCREENSHOT) ================= */}
        <footer className="p-2.5 sm:p-3 border-t border-[#2d0f47] bg-[#120722] flex items-center justify-between text-xs text-purple-300/70 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1c0b36] hover:bg-[#2c1254] border border-[#3b135c] text-purple-200 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BERANDA UTAMA</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-[11px] font-mono uppercase text-purple-400/70 tracking-wider">
              NEBENG'S OFFICIAL DIGITAL SCORING SILAT | VERSI 2.4. - IRFAN, S.PD.
            </span>
            <button
              onClick={handleRefresh}
              title="Refresh / Sinkronisasi"
              className="p-1 rounded-lg hover:bg-purple-900/50 text-purple-300 hover:text-white transition-all cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
