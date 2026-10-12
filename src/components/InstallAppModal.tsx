import React, { useState, useEffect } from 'react';
import {
  X,
  Monitor,
  Laptop,
  Download,
  CheckCircle2,
  Sparkles,
  WifiOff,
  Zap,
  HardDrive,
  ExternalLink,
  Smartphone,
  Copy,
  Check,
  Flame,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  promptPWAInstall,
  getDeferredPrompt,
  subscribeInstallPrompt,
  isAppInstalled,
  detectUserPlatform,
  detectBrowser,
  downloadWindowsDesktopShortcut,
  downloadLinuxDesktopShortcut,
  BeforeInstallPromptEvent,
} from '../utils/pwaHelper';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [hasPrompt, setHasPrompt] = useState<boolean>(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState<boolean>(false);
  const [selectedOS, setSelectedOS] = useState<'windows' | 'mac' | 'linux' | 'mobile'>('windows');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'dismissed'>('idle');

  const [appOrigin, setAppOrigin] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    if (typeof window !== 'undefined') {
      setAppOrigin(window.location.origin || window.location.href);
    }
    setAlreadyInstalled(isAppInstalled());
    const detected = detectUserPlatform();
    if (detected === 'windows') setSelectedOS('windows');
    else if (detected === 'mac') setSelectedOS('mac');
    else if (detected === 'linux') setSelectedOS('linux');
    else if (detected === 'android' || detected === 'ios') setSelectedOS('mobile');

    const unsubscribe = subscribeInstallPrompt((prompt: BeforeInstallPromptEvent | null) => {
      setHasPrompt(!!prompt);
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstallStatus('installing');
    const result = await promptPWAInstall();
    if (result === 'accepted') {
      setInstallStatus('success');
      setTimeout(() => {
        onClose();
        setInstallStatus('idle');
      }, 2000);
    } else if (result === 'dismissed') {
      setInstallStatus('dismissed');
      setTimeout(() => setInstallStatus('idle'), 3000);
    } else {
      setInstallStatus('idle');
      // If browser prevented prompt (e.g. inside iframe preview), prompt user to open in new tab or use browser menu
    }
  };

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        const temp = document.createElement('textarea');
        temp.value = window.location.href;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const currentBrowser = detectBrowser();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/90 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 p-1 border border-red-500/50 flex items-center justify-center shadow-lg shadow-red-950/60 shrink-0 backdrop-blur-sm">
              <img src="/logo_satriaapp.png" alt="Logo Satria App" className="w-full h-full object-contain filter drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white uppercase tracking-tight">
                  Instal Aplikasi SatriaApp di PC / Laptop / HP
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  OFFLINE READY
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Akses cepat tanpa browser, buka langsung dari Desktop &amp; Home Screen perangkat Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Top Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-red-950/60 text-red-400 border border-red-900/60 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-zinc-200">Buka 1-Klik</h5>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Icon resmi di Desktop & Taskbar tanpa buka URL browser.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-zinc-200">100% Offline</h5>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Bekerja penuh di dojang/lapangan tanpa koneksi internet.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-900/60 shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-zinc-200">Data Aman</h5>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Data tersimpan lokal di harddisk & terenkripsi AES-256.
                </p>
              </div>
            </div>
          </div>

          {/* Direct Install & Quick Actions Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-red-900/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-500" />
                  Instalasi Otomatis (Progressive Web App)
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {alreadyInstalled
                    ? 'Aplikasi telah terpasang di perangkat ini.'
                    : 'Pasang SilatReport sebagai aplikasi desktop mandiri berlayar penuh.'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {hasPrompt && (
                  <button
                    onClick={handleInstallClick}
                    disabled={installStatus === 'installing'}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/60 transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    {installStatus === 'installing' ? 'Memasang...' : 'Pasang Aplikasi Sekarang'}
                  </button>
                )}

                {/* Direct Desktop Shortcut Generator for Windows */}
                <button
                  onClick={downloadWindowsDesktopShortcut}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all active:scale-95 cursor-pointer"
                  title="Unduh file Shortcut (.url) untuk ditaruh langsung di Desktop Windows"
                >
                  <Monitor className="w-3.5 h-3.5 text-red-400" />
                  Unduh Shortcut Desktop (.url)
                </button>
              </div>
            </div>

            {installStatus === 'success' && (
              <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Aplikasi SilatReport berhasil dipasang di komputer Anda!
              </div>
            )}
          </div>

          {/* OS Selector Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Panduan Langkah Pemasangan Sesuai Perangkat:
              </h4>
              <span className="text-[10px] text-zinc-500 font-mono">
                Peramban Aktif: <strong className="text-zinc-300 capitalize">{currentBrowser}</strong>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setSelectedOS('windows')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  selectedOS === 'windows'
                    ? 'bg-red-950/80 text-red-300 border border-red-800/80 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Windows PC
              </button>

              <button
                onClick={() => setSelectedOS('mac')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  selectedOS === 'mac'
                    ? 'bg-red-950/80 text-red-300 border border-red-800/80 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                MacBook
              </button>

              <button
                onClick={() => setSelectedOS('linux')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  selectedOS === 'linux'
                    ? 'bg-red-950/80 text-red-300 border border-red-800/80 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                Linux
              </button>

              <button
                onClick={() => setSelectedOS('mobile')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  selectedOS === 'mobile'
                    ? 'bg-red-950/80 text-red-300 border border-red-800/80 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                HP / Tablet
              </button>
            </div>

            {/* Instruction Panels */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              {selectedOS === 'windows' && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                      Google Chrome & Microsoft Edge di Windows 10 / 11
                    </span>
                  </div>
                  <ol className="space-y-2 text-xs text-zinc-300 list-decimal list-inside pl-1">
                    <li className="leading-relaxed">
                      <strong className="text-white">Melalui Bilah Alamat (URL Bar):</strong> Buka aplikasi di Google Chrome atau Microsoft Edge, perhatikan sisi kanan bilah alamat (URL), klik ikon <strong className="text-red-400">"Instal SilatReport"</strong> <span className="font-mono text-[10px] text-zinc-400">(ikon monitor bertanda panah bawah)</span>.
                    </li>
                    <li className="leading-relaxed">
                      <strong className="text-white">Melalui Menu Peramban:</strong> Atau klik menu titik tiga <span className="text-zinc-100 font-mono">⋮</span> (di pojok kanan atas Chrome) &rarr; pilih <strong className="text-white">Simpan dan Bagikan (Save and Share)</strong> &rarr; klik <strong className="text-red-400">Instal Halaman Sebagai Aplikasi...</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Pada jendela konfirmasi, klik <strong className="text-white">Instal</strong>. Centang opsi <em>"Sematkan ke taskbar"</em> dan <em>"Buat pintasan desktop"</em> agar aplikasi langsung muncul di layar utama PC Anda.
                    </li>
                  </ol>
                </div>
              )}

              {selectedOS === 'mac' && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                      macOS (Safari / Google Chrome)
                    </span>
                  </div>
                  <ol className="space-y-2 text-xs text-zinc-300 list-decimal list-inside pl-1">
                    <li className="leading-relaxed">
                      <strong className="text-white">Di Safari (macOS Sonoma / Ventura):</strong> Klik menu <strong className="text-white">File</strong> di pojok kiri atas layar &rarr; klik <strong className="text-red-400">"Tambahkan ke Dock" (Add to Dock...)</strong>.
                    </li>
                    <li className="leading-relaxed">
                      <strong className="text-white">Di Google Chrome (Mac):</strong> Klik ikon titik tiga <span className="text-zinc-100 font-mono">⋮</span> &rarr; <strong className="text-white">Simpan dan Bagikan</strong> &rarr; <strong className="text-red-400">Instal SilatReport...</strong>.
                    </li>
                    <li className="leading-relaxed">
                      Aplikasi akan tersimpan di folder <em>Applications</em> Mac dan Dock untuk dibuka kapan saja seperti software native Apple.
                    </li>
                  </ol>
                </div>
              )}

              {selectedOS === 'linux' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                      Linux (Ubuntu, Debian, Fedora, Arch)
                    </span>
                    <button
                      onClick={downloadLinuxDesktopShortcut}
                      className="text-[11px] font-mono text-amber-400 hover:text-amber-300 underline"
                    >
                      Unduh .desktop file
                    </button>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Buka menggunakan Chromium atau Google Chrome, klik menu <span className="text-zinc-100 font-mono">⋮</span> &rarr; <strong>More Tools / Simpan & Bagikan</strong> &rarr; <strong>Create Shortcut / Install SilatReport</strong> &rarr; Centang <strong>"Open as window"</strong>.
                  </p>
                </div>
              )}

              {selectedOS === 'mobile' && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                      Android & iOS / iPad
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-zinc-300 list-disc list-inside pl-1">
                    <li><strong className="text-white">Android (Chrome):</strong> Ketuk menu titik tiga (⋮) &rarr; ketuk <strong className="text-red-400">"Tambahkan ke Layar Utama" / "Instal Aplikasi"</strong>.</li>
                    <li><strong className="text-white">iPhone / iPad (Safari):</strong> Ketuk tombol <em>Bagikan (Share icon)</em> &rarr; gulir ke bawah dan ketuk <strong className="text-red-400">"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Quick Copy Link */}
          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-400 truncate">
              URL Aplikasi: <span className="font-mono text-zinc-300 select-all">{appOrigin || 'https://...'}</span>
            </div>
            <button
              onClick={handleCopyUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors shrink-0"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedUrl ? 'Tersalin' : 'Salin URL'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PWA Standar Web Resmi • Bebas Virus & Iklan</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
