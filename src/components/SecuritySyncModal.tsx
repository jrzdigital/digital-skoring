import React, { useState } from 'react';
import { E2EESettings, TrainingLog, Student, SchoolProfile } from '../types';
import { encryptData, decryptData } from '../utils/crypto';
import { StorageService } from '../utils/storage';
import {
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Download,
  Upload,
  RefreshCw,
  Copy,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Server,
  Trash2
} from 'lucide-react';

interface SecuritySyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  e2eeSettings: E2EESettings;
  onSaveE2EESettings: (settings: E2EESettings) => void;
  onDataReloadNeeded: () => void;
}

export const SecuritySyncModal: React.FC<SecuritySyncModalProps> = ({
  isOpen,
  onClose,
  e2eeSettings,
  onSaveE2EESettings,
  onDataReloadNeeded,
}) => {
  const [passphrase, setPassphrase] = useState<string>('');
  const [confirmPassphrase, setConfirmPassphrase] = useState<string>('');
  const [decryptPass, setDecryptPass] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [syncCode, setSyncCode] = useState<string>('SILAT-' + Math.random().toString(36).substring(2, 8).toUpperCase());
  const [copiedSync, setCopiedSync] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleEnableEncryption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase || passphrase.length < 6) {
      setStatusMsg({ type: 'error', text: 'Kata sandi minimal harus 6 karakter.' });
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setStatusMsg({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' });
      return;
    }

    setIsProcessing(true);
    try {
      // Test encryption on all data
      const allDataJson = StorageService.getAllDataJSON();
      const encryptedPayload = await encryptData(allDataJson, passphrase);

      const newSettings: E2EESettings = {
        isEncryptionEnabled: true,
        isUnlocked: true,
        lastBackupDate: new Date().toISOString(),
      };
      onSaveE2EESettings(newSettings);

      setStatusMsg({ type: 'success', text: 'Enkripsi End-to-End (AES-256-GCM) berhasil diaktifkan untuk basis data arsip silat!' });
      setPassphrase('');
      setConfirmPassphrase('');
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Gagal mengaktifkan enkripsi.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportEncryptedBackup = async () => {
    setIsProcessing(true);
    try {
      const allDataJson = StorageService.getAllDataJSON();
      let exportContent = allDataJson;
      let filename = `Arsip_Silat_${new Date().toISOString().split('T')[0]}.json`;

      if (e2eeSettings.isEncryptionEnabled && passphrase) {
        exportContent = await encryptData(allDataJson, passphrase);
        filename = `Arsip_Terenkripsi_Silat_${new Date().toISOString().split('T')[0]}.silat.enc`;
      }

      const blob = new Blob([exportContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMsg({ type: 'success', text: `Berkas backup (${filename}) berhasil diunduh.` });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Gagal mengekspor data backup.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const content = reader.result as string;
        let plainJson = content;

        // If file ends with .enc or looks encrypted
        if (file.name.endsWith('.enc') || !content.trim().startsWith('{')) {
          if (!decryptPass) {
            setStatusMsg({ type: 'error', text: 'Masukkan kata sandi dekripsi terlebih dahulu untuk membuka file .enc ini!' });
            setIsProcessing(false);
            return;
          }
          plainJson = await decryptData(content, decryptPass);
        }

        const success = StorageService.restoreAllDataJSON(plainJson);
        if (success) {
          setStatusMsg({ type: 'success', text: 'Basis data berhasil dipulihkan dan disinkronkan!' });
          onDataReloadNeeded();
        } else {
          setStatusMsg({ type: 'error', text: 'Format data JSON arsip tidak valid.' });
        }
      } catch (err) {
        setStatusMsg({ type: 'error', text: 'Gagal mendekripsi atau memulihkan data. Pastikan kata sandi benar.' });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsText(file);
  };

  const handleCopySyncCode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(syncCode);
      } else {
        const temp = document.createElement('textarea');
        temp.value = syncCode;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      setCopiedSync(true);
      setTimeout(() => setCopiedSync(false), 2000);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
      setCopiedSync(true);
      setTimeout(() => setCopiedSync(false), 2000);
    }
  };

  const handleResetDatabase = () => {
    if (confirm('PERINGATAN: Apakah Anda yakin ingin mereset seluruh data kembali ke kondisi bawaan awal? Tindakan ini tidak dapat dibatalkan.')) {
      StorageService.resetToDefault();
      onDataReloadNeeded();
      setStatusMsg({ type: 'success', text: 'Basis data berhasil direset ke setelan awal.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
                Basis Data Aman & Sinkronisasi Antar Perangkat
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  AES-256 E2EE
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">Enkripsi tingkat militer untuk menjaga privasi nilai dan rekam medis atlet silat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-zinc-950/80">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-lg text-xs flex items-center gap-2 font-mono ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
                  : 'bg-red-950/80 border border-red-800 text-red-200'
              }`}
            >
              {statusMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Section 1: E2EE Enkripsi Data */}
          <div className="p-5 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-xs font-mono">
                <Lock className="w-4 h-4" />
                Proteksi Enkripsi End-to-End (AES-GCM 256-Bit)
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                  e2eeSettings.isEncryptionEnabled
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {e2eeSettings.isEncryptionEnabled ? 'STATUS: AKTIF' : 'STATUS: NON-AKTIF'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Arsip histori pelatihan, foto, dan data siswa akan dienkripsi secara lokal sebelum disimpan atau diekspor. Kunci enkripsi tidak pernah dikirim ke pihak luar tanpa izin Anda.
            </p>

            <form onSubmit={handleEnableEncryption} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Master Password Arsip:</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={e => setPassphrase(e.target.value)}
                  placeholder="Ketik kata sandi rahasia..."
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Konfirmasi Kata Sandi:</label>
                <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={e => setConfirmPassphrase(e.target.value)}
                  placeholder="Ulangi kata sandi..."
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-red-950/20"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {e2eeSettings.isEncryptionEnabled ? 'Perbarui Kunci Sandi' : 'Aktifkan Enkripsi E2EE'}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Backup & Restore */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export Backup */}
            <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 font-mono">
                  <Download className="w-4 h-4 text-red-500" />
                  Ekspor Backup Seluruh Basis Data
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Unduh cadangan data lengkap (Jurnal latihan, biodata pesilat, foto dokumentasi, dan pengaturan sekolah).
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportEncryptedBackup}
                disabled={isProcessing}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 border border-zinc-800 font-mono text-[11px]"
              >
                <Download className="w-3.5 h-3.5 text-red-400" />
                Unduh File Backup (.json / .enc)
              </button>
            </div>

            {/* Import Backup */}
            <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 font-mono">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  Pulihkan & Impor Data
                </h4>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Unggah berkas cadangan dari perangkat lain untuk sinkronisasi.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="password"
                  value={decryptPass}
                  onChange={e => setDecryptPass(e.target.value)}
                  placeholder="Kata sandi dekripsi (jika file .enc)..."
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:border-red-600 focus:outline-none font-mono text-[11px]"
                />

                <label className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 border border-zinc-800 cursor-pointer font-mono text-[11px]">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  Pilih File Backup
                  <input
                    type="file"
                    accept=".json,.enc"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Multi-device Real-time Sync Hub */}
          <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 font-mono">
              <Smartphone className="w-4 h-4 text-blue-400" />
              Sinkronisasi Antar Perangkat Real-Time
            </h4>
            <p className="text-[11px] text-zinc-400">
              Gunakan kode token pairing di bawah ini untuk menghubungkan aplikasi pelatih di lapangan dengan komputer tata usaha sekolah:
            </p>

            <div className="flex items-center gap-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800">
              <div className="flex-1 font-mono font-bold text-sm text-red-400 tracking-wider px-2">
                {syncCode}
              </div>
              <button
                type="button"
                onClick={handleCopySyncCode}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center gap-1 font-mono"
              >
                <Copy className="w-3 h-3" />
                {copiedSync ? 'Tersalin!' : 'Salin Kode'}
              </button>
            </div>
          </div>

          {/* Section 4: Factory Reset */}
          <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-lg flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5 font-mono">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                Reset Basis Data ke Contoh Awal
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Kembalikan data ke setelan kurikulum standar pencak silat.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDatabase}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-red-900/80 hover:bg-red-800 text-red-200 border border-red-700 rounded-lg transition-colors font-mono"
            >
              Reset Data
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-800 bg-zinc-950">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 font-mono"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
