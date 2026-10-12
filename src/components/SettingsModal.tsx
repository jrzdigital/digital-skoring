import React, { useState, useEffect, useRef } from 'react';
import { SchoolProfile, E2EESettings, ScheduleReminder, NotificationItem, UserAccount } from '../types';
import { SignaturePad } from './SignaturePad';
import { StorageService } from '../utils/storage';
import { encryptData, decryptData } from '../utils/crypto';
import {
  promptPWAInstall,
  subscribeInstallPrompt,
  isAppInstalled,
  detectUserPlatform,
  downloadWindowsDesktopShortcut,
  downloadLinuxDesktopShortcut,
  BeforeInstallPromptEvent,
} from '../utils/pwaHelper';
import {
  X,
  Settings,
  Building2,
  UserCheck,
  Laptop,
  Monitor,
  ShieldCheck,
  Lock,
  Sun,
  Moon,
  Download,
  Upload,
  Check,
  CheckCircle2,
  Smartphone,
  AlertTriangle,
  Volume2,
  Plus,
  Trash2,
  Bell,
  ChevronRight,
  ArrowLeft,
  User,
  School,
  Sparkles,
  UserPlus,
  Key,
  Camera,
  Edit2,
  Mail,
  Phone,
  MapPin,
  Shield,
  Award,
  Calendar,
  LogOut,
} from 'lucide-react';

export type SettingsTabType = 'account' | 'kop' | 'schedule' | 'install' | 'security' | 'theme';

interface SettingsMenuItem {
  id: SettingsTabType;
  title: string;
}

const SETTINGS_MENU_ITEMS: SettingsMenuItem[] = [
  { id: 'account', title: 'Identitas & Profil Akun' },
  { id: 'kop', title: 'KOP & Tanda Tangan Digital' },
  { id: 'schedule', title: 'Jadwal & Pengingat Latihan' },
  { id: 'install', title: 'Pasang Aplikasi di PC (Desktop)' },
  { id: 'security', title: 'Keamanan Enkripsi & Cadangan Data' },
  { id: 'theme', title: 'Mode Tampilan Siang / Malam' },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabType | null;
  profile: SchoolProfile;
  onSaveProfile: (profile: SchoolProfile) => void;
  currentUser?: UserAccount;
  onOpenAuthModal?: () => void;
  onOpenSuperAdmin?: () => void;
  onUserChanged?: (newUser: UserAccount) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  e2eeSettings: E2EESettings;
  onSaveE2EESettings: (settings: E2EESettings) => void;
  onDataReloadNeeded: () => void;
  schedules?: ScheduleReminder[];
  onSaveSchedules?: (schedules: ScheduleReminder[]) => void;
  notifications?: NotificationItem[];
  onAddNotification?: (notif: NotificationItem) => void;
  onLogout?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = null,
  profile,
  onSaveProfile,
  currentUser,
  onOpenAuthModal,
  onOpenSuperAdmin,
  onUserChanged,
  theme,
  onToggleTheme,
  e2eeSettings,
  onSaveE2EESettings,
  onDataReloadNeeded,
  schedules = [],
  onSaveSchedules,
  onAddNotification,
  onLogout,
}) => {
  const [activePopup, setActivePopup] = useState<SettingsTabType | null>(initialTab || null);

  // User Profile & Identity States (Halaman Akun: Edit Nama, Identitas, Ganti Foto Profil)
  const [isEditingIdentity, setIsEditingIdentity] = useState<boolean>(false);
  const [identityForm, setIdentityForm] = useState({
    name: '',
    trainingLocation: '',
    organizationBranch: '',
    city: '',
    phone: '',
    email: '',
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInputValue, setNameInputValue] = useState<string>(currentUser?.name || currentUser?.fullName || '');
  const [accountStatusMsg, setAccountStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isAvatarLoading, setIsAvatarLoading] = useState<boolean>(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setNameInputValue(currentUser.name || currentUser.fullName || '');
      setIdentityForm({
        name: currentUser.name || currentUser.fullName || '',
        trainingLocation: currentUser.trainingLocation || profile.schoolName || '',
        organizationBranch: currentUser.organizationBranch || profile.organizationBranch || 'IPSI',
        city: currentUser.city || profile.city || 'Indonesia',
        phone: currentUser.phone || profile.phone || '',
        email: currentUser.email || profile.email || '',
      });
    }
  }, [currentUser, profile]);

  const handleSaveIdentity = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    const cleanName = (identityForm.name || nameInputValue).trim();
    if (!cleanName) {
      setAccountStatusMsg({ type: 'error', text: 'Nama lengkap tidak boleh kosong!' });
      return;
    }

    const res = StorageService.updateUserProfile(currentUser.id, {
      name: cleanName,
      fullName: cleanName,
      trainingLocation: identityForm.trainingLocation.trim(),
      organizationBranch: identityForm.organizationBranch.trim(),
      city: identityForm.city.trim(),
      phone: identityForm.phone.trim(),
      email: identityForm.email.trim(),
    });

    if (res.success && res.user) {
      if (onUserChanged) onUserChanged(res.user);
      const updatedProfile: SchoolProfile = {
        ...profile,
        coachName: cleanName,
        schoolName: identityForm.trainingLocation.trim() || profile.schoolName,
        organizationBranch: identityForm.organizationBranch.trim() || profile.organizationBranch,
        city: identityForm.city.trim() || profile.city,
        phone: identityForm.phone.trim() || profile.phone,
        email: identityForm.email.trim() || profile.email,
      };
      onSaveProfile(updatedProfile);

      setIsEditingIdentity(false);
      setIsEditingName(false);
      setAccountStatusMsg({ type: 'success', text: 'Identitas akun berhasil diperbarui dan diselaraskan!' });
      setTimeout(() => setAccountStatusMsg(null), 3500);
    } else {
      setAccountStatusMsg({ type: 'error', text: res.error || 'Gagal menyimpan perubahan identitas.' });
    }
  };

  const handleExecuteLogout = () => {
    setShowLogoutConfirm(false);
    setActivePopup(null);
    onClose();
    if (onLogout) onLogout();
  };

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    const clean = nameInputValue.trim();
    if (!clean) {
      setAccountStatusMsg({ type: 'error', text: 'Nama lengkap tidak boleh kosong!' });
      return;
    }

    const res = StorageService.updateUserProfile(currentUser.id, {
      name: clean,
      fullName: clean,
    });

    if (res.success && res.user) {
      if (onUserChanged) onUserChanged(res.user);
      setIsEditingName(false);
      setAccountStatusMsg({ type: 'success', text: 'Nama profil berhasil diperbarui!' });
      setTimeout(() => setAccountStatusMsg(null), 3500);
    } else {
      setAccountStatusMsg({ type: 'error', text: res.error || 'Gagal menyimpan nama.' });
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (!file.type.startsWith('image/')) {
      setAccountStatusMsg({ type: 'error', text: 'Pilih file gambar yang valid (JPG, PNG, atau WEBP).' });
      return;
    }

    setIsAvatarLoading(true);
    setAccountStatusMsg(null);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 260;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

            const res = StorageService.updateUserProfile(currentUser.id, {
              avatar: compressedBase64,
            });

            if (res.success && res.user && onUserChanged) {
              onUserChanged(res.user);
            }
            setAccountStatusMsg({ type: 'success', text: 'Foto profil berhasil diperbarui!' });
            setTimeout(() => setAccountStatusMsg(null), 3500);
          }
        } catch {
          setAccountStatusMsg({ type: 'error', text: 'Gagal memproses gambar foto profil.' });
        } finally {
          setIsAvatarLoading(false);
        }
      };
      img.onerror = () => {
        setIsAvatarLoading(false);
        setAccountStatusMsg({ type: 'error', text: 'File gambar tidak dapat dibaca.' });
      };
      img.src = loadEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectPresetAvatar = (avatarUrl: string) => {
    if (!currentUser) return;
    const res = StorageService.updateUserProfile(currentUser.id, { avatar: avatarUrl });
    if (res.success && res.user && onUserChanged) {
      onUserChanged(res.user);
    }
    setAccountStatusMsg({ type: 'success', text: 'Foto profil berhasil diterapkan!' });
    setTimeout(() => setAccountStatusMsg(null), 3000);
  };

  const handleRemoveAvatar = () => {
    if (!currentUser) return;
    const res = StorageService.updateUserProfile(currentUser.id, { avatar: '' });
    if (res.success && res.user && onUserChanged) {
      onUserChanged(res.user);
    }
    setAccountStatusMsg({ type: 'success', text: 'Foto profil dikembalikan ke inisial huruf.' });
    setTimeout(() => setAccountStatusMsg(null), 3000);
  };

  // KOP & Signatures Form State
  const [profileForm, setProfileForm] = useState<SchoolProfile>({ ...profile });
  const [profileSubTab, setProfileSubTab] = useState<'school' | 'signatures'>('school');
  const [saveProfileSuccess, setSaveProfileSuccess] = useState<boolean>(false);

  // Schedule Reminder State
  const [scheduleList, setScheduleList] = useState<ScheduleReminder[]>(schedules);
  const [newDay, setNewDay] = useState<string>('Selasa');
  const [newTime, setNewTime] = useState<string>('15:30');
  const [newTopic, setNewTopic] = useState<string>('Latihan Kuda-kuda & Pola Langkah');
  const [newLocation, setNewLocation] = useState<string>('Lapangan Olahraga');
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [testSent, setTestSent] = useState<boolean>(false);

  // Install State
  const [hasPrompt, setHasPrompt] = useState<boolean>(false);
  const [alreadyInstalled, setAlreadyInstalled] = useState<boolean>(false);
  const [selectedOS, setSelectedOS] = useState<'windows' | 'mac' | 'linux' | 'mobile'>('windows');
  const [, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'dismissed'>('idle');

  // Security & Encryption State
  const [passphrase, setPassphrase] = useState<string>('');
  const [confirmPassphrase, setConfirmPassphrase] = useState<string>('');
  const [decryptPass, setDecryptPass] = useState<string>('');
  const [securityStatusMsg, setSecurityStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSecurityProcessing, setIsSecurityProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setActivePopup(initialTab || null);
      setProfileForm({ ...profile });
      setScheduleList(schedules);
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
    }
  }, [isOpen, initialTab, profile, schedules]);

  if (!isOpen) return null;

  // Handle KOP Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(profileForm);
    setSaveProfileSuccess(true);
    setTimeout(() => setSaveProfileSuccess(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'principalSignature' | 'coachSignature' | 'schoolLogo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileForm(prev => ({ ...prev, [field]: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Schedule Sound and Handlers
  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

      osc2.frequency.setValueAtTime(293.66, now); // D4
      osc2.frequency.exponentialRampToValueAtTime(440, now + 0.15); // A4

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch {
      // Audio not permitted or not supported
    }
  };

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission === 'granted') {
        playChimeSound();
        new Notification('Pengingat Silat Aktif', {
          body: 'Notifikasi browser untuk jadwal latihan pencak silat berhasil diaktifkan.',
          icon: '/favicon.ico',
        });
      }
    }
  };

  const handleTestNotification = () => {
    playChimeSound();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);

    if (onAddNotification) {
      onAddNotification({
        id: 'test-' + Date.now(),
        title: '🔔 Uji Pengingat Latihan Silat',
        message: 'Alarm gong berbunyi! Sesi latihan rutin akan segera dimulai dalam 30 menit.',
        timestamp: new Date().toISOString(),
        read: false,
        type: 'schedule',
      });
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('🔔 Pengingat Latihan Silat', {
        body: 'Alarm gong berbunyi! Sesi latihan rutin akan segera dimulai.',
        icon: '/favicon.ico',
      });
    }
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const newSchedule: ScheduleReminder = {
      id: 'sch-' + Date.now(),
      day: newDay,
      time: newTime,
      durationMinutes: 120,
      topic: newTopic,
      location: newLocation,
      isActive: true,
    };

    const updated = [...scheduleList, newSchedule];
    setScheduleList(updated);
    if (onSaveSchedules) onSaveSchedules(updated);
  };

  const handleToggleSchedule = (id: string) => {
    const updated = scheduleList.map(s => (s.id === id ? { ...s, isActive: !s.isActive } : s));
    setScheduleList(updated);
    if (onSaveSchedules) onSaveSchedules(updated);
  };

  const handleDeleteSchedule = (id: string) => {
    const updated = scheduleList.filter(s => s.id !== id);
    setScheduleList(updated);
    if (onSaveSchedules) onSaveSchedules(updated);
  };

  // PWA Install Handlers
  const handleInstallPWA = async () => {
    setInstallStatus('installing');
    const outcome = await promptPWAInstall();
    if (outcome === 'accepted') {
      setInstallStatus('success');
      setAlreadyInstalled(true);
    } else {
      setInstallStatus('dismissed');
    }
  };

  // Security / Encryption Handlers
  const handleEnableEncryption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passphrase.length < 6) {
      setSecurityStatusMsg({ type: 'error', text: 'Kata sandi minimal harus 6 karakter!' });
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setSecurityStatusMsg({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok!' });
      return;
    }

    setIsSecurityProcessing(true);
    setSecurityStatusMsg(null);

    try {
      const allDataStr = StorageService.getAllDataJSON();
      const encrypted = await encryptData(allDataStr, passphrase);

      const newSettings: E2EESettings = {
        isEncryptionEnabled: true,
        isUnlocked: true,
        lastBackupDate: new Date().toISOString(),
      };

      onSaveE2EESettings(newSettings);
      localStorage.setItem('silat_encrypted_vault', encrypted);
      setSecurityStatusMsg({ type: 'success', text: 'Enkripsi AES-256 berhasil diaktifkan!' });
      setPassphrase('');
      setConfirmPassphrase('');
    } catch {
      setSecurityStatusMsg({ type: 'error', text: 'Gagal mengaktifkan enkripsi.' });
    } finally {
      setIsSecurityProcessing(false);
    }
  };

  const handleDisableEncryption = () => {
    const newSettings: E2EESettings = {
      isEncryptionEnabled: false,
      isUnlocked: true,
    };
    onSaveE2EESettings(newSettings);
    localStorage.removeItem('silat_encrypted_vault');
    setSecurityStatusMsg({ type: 'success', text: 'Proteksi enkripsi dinonaktifkan.' });
  };

  const handleExportBackup = async () => {
    setIsSecurityProcessing(true);
    try {
      let dataToDownload = StorageService.getAllDataJSON();
      let filename = `silat_backup_${new Date().toISOString().slice(0, 10)}.json`;

      if (e2eeSettings.isEncryptionEnabled && passphrase) {
        dataToDownload = await encryptData(dataToDownload, passphrase);
        filename = `silat_backup_encrypted_${new Date().toISOString().slice(0, 10)}.enc`;
      }

      const blob = new Blob([dataToDownload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const updatedSettings = { ...e2eeSettings, lastBackupDate: new Date().toISOString() };
      onSaveE2EESettings(updatedSettings);
      setSecurityStatusMsg({ type: 'success', text: 'File cadangan berhasil diunduh ke perangkat Anda.' });
    } catch {
      setSecurityStatusMsg({ type: 'error', text: 'Gagal mengekspor data cadangan.' });
    } finally {
      setIsSecurityProcessing(false);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSecurityProcessing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const content = reader.result as string;
        let jsonData = content;

        if (content.startsWith('ENC:')) {
          if (!decryptPass) {
            setSecurityStatusMsg({ type: 'error', text: 'File ini terenkripsi. Masukkan kata sandi dekripsi terlebih dahulu.' });
            setIsSecurityProcessing(false);
            return;
          }
          jsonData = await decryptData(content, decryptPass);
        }

        const success = StorageService.restoreAllDataJSON(jsonData);
        if (success) {
          onDataReloadNeeded();
          setSecurityStatusMsg({ type: 'success', text: 'Data cadangan berhasil dipulihkan (restore) sepenuhnya!' });
        } else {
          setSecurityStatusMsg({ type: 'error', text: 'Format data JSON cadangan tidak valid.' });
        }
      } catch {
        setSecurityStatusMsg({ type: 'error', text: 'Kata sandi dekripsi salah atau format file rusak.' });
      } finally {
        setIsSecurityProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const getPopupTitle = (tab: SettingsTabType) => {
    switch (tab) {
      case 'account':
        return 'Identitas & Profil Akun';
      case 'kop':
        return 'KOP & Tanda Tangan Digital';
      case 'schedule':
        return 'Jadwal & Pengingat Latihan';
      case 'install':
        return 'Pasang Aplikasi di PC (Desktop)';
      case 'security':
        return 'Keamanan Enkripsi & Cadangan Data';
      case 'theme':
        return 'Mode Tampilan Siang / Malam';
      default:
        return 'Pengaturan';
    }
  };

  return (
    <>
      {/* 1. MAIN VERTICAL SETTINGS MENU (HANYA JUDULNYA SAJA BERBARIS VERTIKAL KEBAWAH) */}
      {!activePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-gradient-to-br from-[#0e0720] via-slate-950 to-black border border-purple-800/60 rounded-2xl overflow-hidden shadow-2xl shadow-purple-950/60 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900/40 bg-slate-950/90">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-900/60 border border-purple-600/60 flex items-center justify-center text-yellow-300 shadow-md">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white uppercase tracking-tight">Pengaturan</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                title="Tutup Pengaturan"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vertical Menu List - ONLY Titles */}
            <div className="p-5 sm:p-6 space-y-3">
              {SETTINGS_MENU_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActivePopup(item.id)}
                  className="w-full p-4 rounded-xl bg-slate-900/80 hover:bg-purple-950/60 border border-purple-900/50 hover:border-yellow-500/60 flex items-center justify-between text-left transition-all duration-200 group cursor-pointer shadow-md active:scale-98"
                >
                  <span className="text-sm font-bold text-white uppercase tracking-wider group-hover:text-yellow-300 transition-colors">
                    {item.title}
                  </span>
                  <ChevronRight className="w-5 h-5 text-purple-400 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all shrink-0" />
                </button>
              ))}

              {/* Tombol Menu Logout (Warna Merah) Terletak Tepat di Bawah Menu Mode Tampilan Siang/Malam */}
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full p-4 rounded-xl bg-gradient-to-r from-red-950/70 via-red-900/40 to-slate-900 border border-red-700/70 hover:border-red-500 hover:from-red-900/80 hover:to-red-950 flex items-center justify-between text-left transition-all duration-200 group cursor-pointer shadow-md active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-900/80 border border-red-500/70 flex items-center justify-center text-red-200 group-hover:bg-red-800 transition-colors">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-red-300 uppercase tracking-wider group-hover:text-white transition-colors block">
                      Keluar / Logout Akun
                    </span>
                    <span className="text-[10px] text-red-400/80 block">
                      Keluar dari sesi akun {currentUser?.name ? currentUser.name.split(',')[0] : (currentUser?.username || 'pengguna')}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-red-500/80 group-hover:text-red-300 group-hover:translate-x-1 transition-all shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEDICATED POP-UP MODAL KETIKA JUDUL DITEKAN */}
      {activePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-4xl bg-gradient-to-br from-[#0e0720] via-slate-950 to-black border border-purple-800/60 rounded-2xl overflow-hidden shadow-2xl shadow-purple-950/60 flex flex-col max-h-[90vh]">
            {/* Pop-up Header with Back Button */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900/40 bg-slate-950/90">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActivePopup(null)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-purple-900/60 text-yellow-300 hover:text-white border border-purple-900/60 transition-colors cursor-pointer"
                  title="Kembali ke Daftar Menu Pengaturan"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">
                    {getPopupTitle(activePopup)}
                  </h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pop-up Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* POPUP 0: IDENTITAS & PROFIL AKUN PENGGUNA */}
              {activePopup === 'account' && (
                <div className="space-y-6">
                  {/* Status Notification Toast/Banner */}
                  {accountStatusMsg && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
                        accountStatusMsg.type === 'success'
                          ? 'bg-emerald-950/70 border border-emerald-700 text-emerald-300'
                          : 'bg-red-950/70 border border-red-700 text-red-300'
                      }`}
                    >
                      {accountStatusMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <span>{accountStatusMsg.text}</span>
                    </div>
                  )}

                  {/* Hidden File Input for Avatar */}
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Main Profile Header Card */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/60 via-slate-900 to-black border border-purple-800/60 shadow-xl space-y-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                      {/* Avatar Display & Ganti Foto Profil */}
                      <div className="relative group shrink-0">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-purple-600 bg-slate-950 flex items-center justify-center shadow-xl shadow-purple-950/60">
                          {currentUser?.avatar || currentUser?.avatarUrl ? (
                            <img
                              src={currentUser.avatar || currentUser.avatarUrl}
                              alt={currentUser.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-900 via-purple-950 to-slate-900 flex items-center justify-center text-yellow-300 font-extrabold text-3xl">
                              {currentUser ? (currentUser.name || 'P').charAt(0).toUpperCase() : 'P'}
                            </div>
                          )}

                          {isAvatarLoading && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* Floating Camera Button */}
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isAvatarLoading}
                          className="absolute -bottom-2 -right-2 p-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-lg border border-red-400/50 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                          title="Ganti Foto Profil"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>

                      {/* User Main Identity & Name Edit Trigger */}
                      <div className="flex-1 text-center sm:text-left space-y-2">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-purple-900 text-yellow-300 border border-purple-700 uppercase tracking-wide">
                            {currentUser?.role || 'Pelatih'}
                          </span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            Akun Aktif
                          </span>
                          {currentUser?.role === 'superadmin' && (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1">
                              <Shield className="w-3 h-3 text-amber-400" />
                              Master Admin
                            </span>
                          )}
                        </div>

                        {/* Name Section & Trigger Ubah Identitas */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                            <h3 className="text-xl font-bold text-white tracking-tight">
                              {currentUser?.name || currentUser?.fullName || 'Pelatih Silat'}
                            </h3>
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingIdentity(prev => !prev);
                                setIsEditingName(false);
                              }}
                              className="px-3 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 hover:text-yellow-200 border border-yellow-500/50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                              title="Buka Menu Edit Nama & Ubah Identitas Pengguna"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-yellow-400" />
                              <span>{isEditingIdentity ? 'Tutup Formulir' : 'Edit Nama & Identitas'}</span>
                            </button>
                          </div>
                          <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1.5">
                            <School className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                            <span>{currentUser?.trainingLocation || profile.schoolName}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-300">{currentUser?.organizationBranch || profile.organizationBranch || 'IPSI'}</span>
                          </p>
                        </div>

                        {/* Avatar Actions (Ganti Foto, Preset, Hapus) */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={isAvatarLoading}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-purple-900/60 text-slate-200 hover:text-white border border-purple-800/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5 text-yellow-400" />
                            <span>Ganti Foto Profil</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectPresetAvatar('/logo_satriaapp.png')}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-purple-900/60 text-slate-200 hover:text-white border border-purple-800/60 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <img src="/logo_satriaapp.png" alt="Logo Satria" className="w-3.5 h-3.5 object-contain" />
                            <span>Gunakan Logo SatriaApp</span>
                          </button>

                          {(currentUser?.avatar || currentUser?.avatarUrl) && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-red-950 text-red-400 hover:text-red-300 border border-red-900/40 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                              title="Hapus foto dan kembali ke inisial huruf"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Hapus Foto</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Form Pengubahan Identitas Pengguna (Aktif saat tombol Edit Nama & Identitas ditekan) */}
                    {isEditingIdentity && (
                      <div className="pt-4 border-t border-yellow-500/40 animate-fade-in space-y-4">
                        <div className="bg-gradient-to-r from-yellow-950/40 via-purple-950/40 to-slate-950 border border-yellow-500/40 rounded-2xl p-4 sm:p-5 shadow-lg">
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-300">
                                <Edit2 className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                                  Menu Ubah Identitas Pengguna
                                </h4>
                                <p className="text-[11px] text-yellow-300/80">
                                  Username dan tanggal registrasi akun tidak dapat diubah demi validitas data sistem.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsEditingIdentity(false)}
                              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                              title="Tutup Formulir"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <form onSubmit={handleSaveIdentity} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              {/* 1. Nama Lengkap & Gelar */}
                              <div className="space-y-1 sm:col-span-2">
                                <label className="block text-[11px] font-bold text-yellow-300 uppercase tracking-wider">
                                  Nama Lengkap & Gelar <span className="text-red-400">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={identityForm.name}
                                  onChange={(e) => setIdentityForm({ ...identityForm, name: e.target.value })}
                                  placeholder="Contoh: Jaka Oktorian, S.Pd."
                                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-purple-800/70 focus:border-yellow-500 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                  required
                                />
                              </div>

                              {/* 2. Tempat Latihan / Sekolah */}
                              <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                  <School className="w-3 h-3 text-yellow-400" />
                                  Tempat Latihan / Sekolah
                                </label>
                                <input
                                  type="text"
                                  value={identityForm.trainingLocation}
                                  onChange={(e) => setIdentityForm({ ...identityForm, trainingLocation: e.target.value })}
                                  placeholder="Contoh: Padepokan Satria Mandiri"
                                  className="w-full px-3.5 py-2 bg-slate-950 border border-purple-800/70 focus:border-yellow-500 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                />
                              </div>

                              {/* 3. Cabang / Organisasi */}
                              <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-yellow-400" />
                                  Cabang / Organisasi
                                </label>
                                <input
                                  type="text"
                                  value={identityForm.organizationBranch}
                                  onChange={(e) => setIdentityForm({ ...identityForm, organizationBranch: e.target.value })}
                                  placeholder="Contoh: IPSI Pengcab Jakarta Barat"
                                  className="w-full px-3.5 py-2 bg-slate-950 border border-purple-800/70 focus:border-yellow-500 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                />
                              </div>

                              {/* 4. Kota / Wilayah */}
                              <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-yellow-400" />
                                  Kota / Wilayah
                                </label>
                                <input
                                  type="text"
                                  value={identityForm.city}
                                  onChange={(e) => setIdentityForm({ ...identityForm, city: e.target.value })}
                                  placeholder="Contoh: Jakarta"
                                  className="w-full px-3.5 py-2 bg-slate-950 border border-purple-800/70 focus:border-yellow-500 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                />
                              </div>

                              {/* 5. Kontak WhatsApp / HP */}
                              <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-yellow-400" />
                                  Nomor WhatsApp / HP
                                </label>
                                <input
                                  type="tel"
                                  value={identityForm.phone}
                                  onChange={(e) => setIdentityForm({ ...identityForm, phone: e.target.value })}
                                  placeholder="Contoh: 081234567890"
                                  className="w-full px-3.5 py-2 bg-slate-950 border border-purple-800/70 focus:border-yellow-500 rounded-xl text-white font-mono text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                />
                              </div>

                              {/* 6. Alamat Email */}
                              <div className="space-y-1 sm:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-yellow-400" />
                                  Alamat Email
                                </label>
                                <input
                                  type="email"
                                  value={identityForm.email}
                                  onChange={(e) => setIdentityForm({ ...identityForm, email: e.target.value })}
                                  placeholder="Contoh: coach@satriaapp.id"
                                  className="w-full px-3.5 py-2 bg-slate-950 border border-purple-800/70 focus:border-yellow-500 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500"
                                />
                              </div>

                              {/* 7. USERNAME (KECUALI: Permanen / Terkunci) */}
                              <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Key className="w-3 h-3 text-slate-400" />
                                    Username Akun
                                  </span>
                                  <span className="text-[10px] text-amber-400 font-normal flex items-center gap-0.5">
                                    <Shield className="w-2.5 h-2.5" /> Terkunci (Permanen)
                                  </span>
                                </label>
                                <div className="px-3.5 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-400 font-mono text-xs cursor-not-allowed select-none flex items-center justify-between">
                                  <span>{currentUser?.username || '-'}</span>
                                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Tidak dapat diubah</span>
                                </div>
                              </div>

                              {/* 8. TANGGAL TERDAFTAR (KECUALI: Permanen / Sistem) */}
                              <div className="space-y-1">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    Tanggal Terdaftar
                                  </span>
                                  <span className="text-[10px] text-amber-400 font-normal flex items-center gap-0.5">
                                    <Shield className="w-2.5 h-2.5" /> Sistem (Permanen)
                                  </span>
                                </label>
                                <div className="px-3.5 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-400 text-xs cursor-not-allowed select-none flex items-center justify-between">
                                  <span>
                                    {currentUser?.createdAt
                                      ? new Date(currentUser.createdAt).toLocaleDateString('id-ID', {
                                          day: 'numeric',
                                          month: 'long',
                                          year: 'numeric',
                                        })
                                      : 'Terdaftar'}
                                  </span>
                                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Otomatis sistem</span>
                                </div>
                              </div>
                            </div>

                            {/* Tombol Simpan & Batal */}
                            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-purple-900/40">
                              <button
                                type="button"
                                onClick={() => setIsEditingIdentity(false)}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                              >
                                Batal
                              </button>
                              <button
                                type="submit"
                                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                              >
                                <Check className="w-4 h-4" />
                                <span>Simpan Identitas Pengguna</span>
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* Data Lengkap Identitas User yang Menggunakan */}
                    <div className="pt-4 border-t border-purple-900/40">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="w-4 h-4" />
                          <span>Data Lengkap Identitas Pengguna</span>
                        </h4>
                        {!isEditingIdentity && (
                          <button
                            type="button"
                            onClick={() => setIsEditingIdentity(true)}
                            className="px-2.5 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          >
                            <Edit2 className="w-3 h-3 text-yellow-400" />
                            <span>Ubah Identitas</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Key className="w-3 h-3 text-yellow-400" /> Username Akun
                          </span>
                          <span className="font-mono font-bold text-white block text-sm">
                            {currentUser?.username || '-'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-yellow-400" /> Peran & Hak Akses
                          </span>
                          <span className="font-bold text-white capitalize block text-sm">
                            {currentUser?.role || 'Pelatih'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <School className="w-3 h-3 text-yellow-400" /> Tempat Latihan / Sekolah
                          </span>
                          <span className="font-bold text-white block truncate text-sm">
                            {currentUser?.trainingLocation || profile.schoolName || '-'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-yellow-400" /> Cabang / Organisasi
                          </span>
                          <span className="font-bold text-white block truncate text-sm">
                            {currentUser?.organizationBranch || profile.organizationBranch || 'IPSI'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-yellow-400" /> Kota / Wilayah
                          </span>
                          <span className="font-bold text-white block truncate text-sm">
                            {currentUser?.city || profile.city || 'Indonesia'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Phone className="w-3 h-3 text-yellow-400" /> Kontak WhatsApp / HP
                          </span>
                          <span className="font-mono text-yellow-300 block text-sm">
                            {currentUser?.phone || '-'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Mail className="w-3 h-3 text-yellow-400" /> Alamat Email
                          </span>
                          <span className="text-white block truncate text-sm font-medium">
                            {currentUser?.email || `${currentUser?.username || 'user'}@satriaapp.id`}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-yellow-400" /> Tanggal Terdaftar
                          </span>
                          <span className="text-slate-300 block text-sm">
                            {currentUser?.createdAt
                              ? new Date(currentUser.createdAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })
                              : 'Terdaftar'}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-1">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Status Verifikasi
                          </span>
                          <span className="text-emerald-400 font-bold block text-sm">
                            {currentUser?.status === 'APPROVED' ? 'Terverifikasi PB IPSI' : 'Aktif'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KHUSUS SUPERADMIN: Menu Kelola Akun (Hanya tampil jika currentUser.role === 'superadmin') */}
                  {currentUser?.role === 'superadmin' && (
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-red-950/40 to-slate-950 border border-amber-600/50 shadow-xl space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-amber-400 shrink-0" />
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                              Menu Kelola Akun (Khusus Super Administrator)
                            </h4>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                            Sebagai akun Superadmin Master, Anda memiliki otoritas penuh untuk memverifikasi pendaftaran pelatih baru, mereset kata sandi pengguna, serta menonaktifkan akun di sistem SatriaApp.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {onOpenSuperAdmin ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActivePopup(null);
                                onClose();
                                onOpenSuperAdmin();
                              }}
                              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span>Buka Dashboard Kelola Akun</span>
                            </button>
                          ) : onOpenAuthModal ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActivePopup(null);
                                onClose();
                                onOpenAuthModal();
                              }}
                              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer"
                            >
                              <UserPlus className="w-4 h-4" />
                              <span>Kelola Akun Sistem</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informational Callout: Perlindungan Privasi Akun */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-purple-900/40 text-xs text-slate-400 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-yellow-300">Keamanan Identitas & Privasi:</strong> Data akun dan tempat latihan Anda dienkripsi secara aman di perangkat. Seluruh laporan pertemuan, presensi siswa atlet, serta kop dan tanda tangan digital terikat secara privat pada akun Anda.
                    </div>
                  </div>
                </div>
              )}

              {/* POPUP 1: KOP & TANDA TANGAN DIGITAL */}
              {activePopup === 'kop' && (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {saveProfileSuccess && (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Pengaturan KOP dan Tanda Tangan Digital berhasil disimpan!
                    </div>
                  )}

                  {/* Sub Navigation between School Info and Signatures */}
                  <div className="flex items-center gap-2 border-b border-purple-900/40 pb-3">
                    <button
                      type="button"
                      onClick={() => setProfileSubTab('school')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        profileSubTab === 'school'
                          ? 'bg-gradient-to-r from-purple-900 to-indigo-900 text-yellow-300 font-bold border border-purple-600/60'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 inline mr-1.5 text-yellow-400" />
                      Informasi Sekolah & KOP
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileSubTab('signatures')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        profileSubTab === 'signatures'
                          ? 'bg-gradient-to-r from-purple-900 to-indigo-900 text-yellow-300 font-bold border border-purple-600/60'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5 inline mr-1.5 text-yellow-400" />
                      Tanda Tangan & Pengesahan
                    </button>
                  </div>

                  {profileSubTab === 'school' && (
                    <div className="space-y-5">
                      {/* Dinas / Instansi Induk */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Instansi Induk / Yayasan / Dinas Pendidikan <span className="text-slate-500 font-normal">(Opsional)</span>
                        </label>
                        <input
                          type="text"
                          value={profileForm.governmentAgency || ''}
                          onChange={e => setProfileForm({ ...profileForm, governmentAgency: e.target.value })}
                          placeholder="Contoh: PEMERINTAH DAERAH PROVINSI DKI JAKARTA / DINAS PENDIDIKAN"
                          className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 font-mono text-[11px]"
                        />
                        <p className="text-[10px] text-slate-500 mt-0.5">Teks instansi yang terletak paling atas pada KOP surat resmi</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Instansi / Sekolah *</label>
                          <input
                            type="text"
                            required
                            value={profileForm.schoolName}
                            onChange={e => setProfileForm({ ...profileForm, schoolName: e.target.value })}
                            placeholder="Contoh: SMA Negeri 1 Jakarta / SMK Satria"
                            className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Ekstrakurikuler *</label>
                          <input
                            type="text"
                            required
                            value={profileForm.extracurricularName}
                            onChange={e => setProfileForm({ ...profileForm, extracurricularName: e.target.value })}
                            placeholder="Contoh: Ekstrakurikuler Pencak Silat - Satria Muda"
                            className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 font-bold text-yellow-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Induk Organisasi / Cabang IPSI</label>
                          <input
                            type="text"
                            value={profileForm.organizationBranch || ''}
                            onChange={e => setProfileForm({ ...profileForm, organizationBranch: e.target.value })}
                            placeholder="Contoh: Pengurus Cabang Ikatan Pencak Silat Indonesia (IPSI)"
                            className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Kota / Kabupaten Pengesahan</label>
                          <input
                            type="text"
                            value={profileForm.city || ''}
                            onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                            placeholder="Contoh: Jakarta Selatan / Surabaya"
                            className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Alamat Lengkap Sekolah *</label>
                        <input
                          type="text"
                          required
                          value={profileForm.schoolAddress}
                          onChange={e => setProfileForm({ ...profileForm, schoolAddress: e.target.value })}
                          placeholder="Jl. Budi Utomo No. 7, Sawah Besar, Jakarta Pusat 10710"
                          className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      {/* Kontak Telepon, Email, Website */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-yellow-300 mb-1">
                            ☎️ No. Telepon / WhatsApp Sekolah *
                          </label>
                          <input
                            type="text"
                            required
                            value={profileForm.schoolPhone || ''}
                            onChange={e => setProfileForm({ ...profileForm, schoolPhone: e.target.value })}
                            placeholder="(021) 7890123 / 0812-3456-7890"
                            className="w-full px-3 py-2 bg-slate-950 border border-yellow-600/60 rounded-lg text-xs text-white focus:outline-none focus:border-yellow-400 font-mono text-[11px]"
                          />
                          <p className="text-[10px] text-slate-400 mt-0.5">Tampil langsung di baris kontak KOP PDF</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-yellow-300 mb-1">
                            ✉️ Email Resmi Sekolah *
                          </label>
                          <input
                            type="email"
                            required
                            value={profileForm.schoolEmail || ''}
                            onChange={e => setProfileForm({ ...profileForm, schoolEmail: e.target.value })}
                            placeholder="info@sekolah.sch.id"
                            className="w-full px-3 py-2 bg-slate-950 border border-yellow-600/60 rounded-lg text-xs text-white focus:outline-none focus:border-yellow-400 font-mono text-[11px]"
                          />
                          <p className="text-[10px] text-slate-400 mt-0.5">Tampil langsung di baris kontak KOP PDF</p>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            🌐 Website / Portal Sekolah
                          </label>
                          <input
                            type="text"
                            value={profileForm.schoolWebsite || ''}
                            onChange={e => setProfileForm({ ...profileForm, schoolWebsite: e.target.value })}
                            placeholder="www.sekolah.sch.id"
                            className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 font-mono text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Tahun Ajaran</label>
                          <input
                            type="text"
                            value={profileForm.academicYear}
                            onChange={e => setProfileForm({ ...profileForm, academicYear: e.target.value })}
                            placeholder="2026/2027"
                            className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 font-mono text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Semester</label>
                          <select
                            value={profileForm.semester}
                            onChange={e => setProfileForm({ ...profileForm, semester: e.target.value as 'Ganjil' | 'Genap' })}
                            className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500 font-mono text-[11px]"
                          >
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                          </select>
                        </div>
                      </div>

                      {/* Logo Upload */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {profileForm.schoolLogo ? (
                            <img src={profileForm.schoolLogo} alt="Logo" className="w-14 h-14 object-contain bg-white/90 rounded-lg p-1 border border-zinc-700 shadow-md" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                              <Building2 className="w-7 h-7" />
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-white uppercase tracking-tight">Logo Resmi KOP Surat</div>
                            <div className="text-[11px] text-slate-400">Format PNG / JPG transparan &bull; Tampil di sudut kiri atas KOP laporan</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {profileForm.schoolLogo && (
                            <button
                              type="button"
                              onClick={() => setProfileForm({ ...profileForm, schoolLogo: undefined })}
                              className="px-3 py-2 bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 text-xs font-bold rounded-xl transition-colors"
                            >
                              Hapus Logo
                            </button>
                          )}
                          <label className="cursor-pointer px-4 py-2 bg-slate-900 hover:bg-slate-800 text-yellow-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-purple-900/60 shadow-md">
                            <Upload className="w-3.5 h-3.5 text-yellow-400" />
                            Pilih Logo Baru
                            <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'schoolLogo')} />
                          </label>
                        </div>
                      </div>

                      {/* LIVE KOP PREVIEW */}
                      <div className="p-5 rounded-2xl bg-white text-zinc-900 border border-zinc-300 shadow-xl space-y-2 select-none">
                        <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                            Pratinjau KOP Dokumen Laporan (Live Preview)
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                            STANDAR ADMINISTRASI SEKOLAH
                          </span>
                        </div>

                        <div className="flex items-center gap-4 py-1">
                          {profileForm.schoolLogo ? (
                            <img src={profileForm.schoolLogo} alt="Logo" className="w-16 h-16 object-contain shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-400 shrink-0">
                              <Building2 className="w-8 h-8" />
                            </div>
                          )}
                          <div className="flex-1 text-center space-y-0.5">
                            {profileForm.governmentAgency && (
                              <p className="text-[10px] font-bold tracking-wider text-zinc-600 uppercase font-sans">
                                {profileForm.governmentAgency}
                              </p>
                            )}
                            <h4 className="text-sm font-extrabold text-zinc-900 uppercase tracking-tight font-sans">
                              {profileForm.schoolName || 'NAMA SEKOLAH'}
                            </h4>
                            <p className="text-xs font-bold text-red-700 uppercase font-sans">
                              {profileForm.extracurricularName || 'EKSTRAKURIKULER PENCAK SILAT'}
                            </p>
                            <p className="text-[10px] text-zinc-600 font-sans">
                              {profileForm.schoolAddress || 'Alamat Lengkap Sekolah'}
                            </p>
                            <p className="text-[10px] font-medium text-zinc-700 font-sans">
                              <span className="font-semibold">Telp/WA:</span> {profileForm.schoolPhone || '-'} &bull; <span className="font-semibold">Email:</span> {profileForm.schoolEmail || '-'} {profileForm.schoolWebsite && <>&bull; <span className="font-semibold">Web:</span> {profileForm.schoolWebsite}</>}
                            </p>
                          </div>
                        </div>

                        {/* Garis KOP Ganda */}
                        <div className="space-y-0.5 pt-1">
                          <div className="h-0.5 bg-red-800 w-full" />
                          <div className="h-[1px] bg-red-800/80 w-full" />
                        </div>
                      </div>
                    </div>
                  )}

                  {profileSubTab === 'signatures' && (
                    <div className="space-y-6">
                      {/* Principal Section */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-mono text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-yellow-400" />
                            Pejabat Pengesah (Kepala Sekolah / Kesiswaan)
                          </div>
                          {profileForm.principalSignature && (
                            <button
                              type="button"
                              onClick={() => setProfileForm({ ...profileForm, principalSignature: undefined })}
                              className="text-[11px] text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
                            >
                              Hapus Tanda Tangan
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Kepala Sekolah / Pembina *</label>
                            <input
                              type="text"
                              required
                              value={profileForm.principalName}
                              onChange={e => setProfileForm({ ...profileForm, principalName: e.target.value })}
                              placeholder="Drs. H. Ahmad Fauzi, M.Pd"
                              className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">NIP / NUPTK</label>
                            <input
                              type="text"
                              value={profileForm.principalNip || ''}
                              onChange={e => setProfileForm({ ...profileForm, principalNip: e.target.value })}
                              placeholder="19780512 200312 1 004"
                              className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Sebutan Jabatan</label>
                            <input
                              type="text"
                              value={profileForm.principalTitle || 'Kepala Sekolah'}
                              onChange={e => setProfileForm({ ...profileForm, principalTitle: e.target.value })}
                              placeholder="Kepala Sekolah / Waka Kesiswaan"
                              className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-300">Tanda Tangan Digital Kepala Sekolah</label>
                            <label className="cursor-pointer text-[11px] font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                              <Upload className="w-3 h-3" />
                              Upload File PNG Transparan
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'principalSignature')} />
                            </label>
                          </div>
                          <SignaturePad
                            title="Tanda Tangan Kepala Sekolah"
                            initialDataUrl={profileForm.principalSignature}
                            onSave={dataUrl => setProfileForm({ ...profileForm, principalSignature: dataUrl })}
                          />
                        </div>
                      </div>

                      {/* Coach Section */}
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-mono text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-yellow-400" />
                            Pelatih / Guru Pembina Ekstrakurikuler
                          </div>
                          {profileForm.coachSignature && (
                            <button
                              type="button"
                              onClick={() => setProfileForm({ ...profileForm, coachSignature: undefined })}
                              className="text-[11px] text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
                            >
                              Hapus Tanda Tangan
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Pelatih Silat *</label>
                            <input
                              type="text"
                              required
                              value={profileForm.coachName}
                              onChange={e => setProfileForm({ ...profileForm, coachName: e.target.value })}
                              placeholder="Pendekar Bambang Sutrisno, S.Pd"
                              className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Nomor Lisensi Pelatih / NIP</label>
                            <input
                              type="text"
                              value={profileForm.coachNip || ''}
                              onChange={e => setProfileForm({ ...profileForm, coachNip: e.target.value })}
                              placeholder="IPSI-DKI-2023-889"
                              className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Sebutan Jabatan</label>
                            <input
                              type="text"
                              value={profileForm.coachTitle || 'Pelatih Utama Ekstrakurikuler'}
                              onChange={e => setProfileForm({ ...profileForm, coachTitle: e.target.value })}
                              placeholder="Pelatih Utama Ekstrakurikuler"
                              className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-300">Tanda Tangan Digital Pelatih</label>
                            <label className="cursor-pointer text-[11px] font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                              <Upload className="w-3 h-3" />
                              Upload File PNG Transparan
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'coachSignature')} />
                            </label>
                          </div>
                          <SignaturePad
                            title="Tanda Tangan Pelatih Silat"
                            initialDataUrl={profileForm.coachSignature}
                            onSave={dataUrl => setProfileForm({ ...profileForm, coachSignature: dataUrl })}
                          />
                        </div>
                      </div>

                      {/* LIVE SIGNATURE PREVIEW */}
                      <div className="p-5 rounded-2xl bg-white text-zinc-900 border border-zinc-300 shadow-xl space-y-4 select-none">
                        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                            Pratinjau Lembar Pengesahan (Live Signature Preview)
                          </span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                            LEGALITAS LAPORAN
                          </span>
                        </div>

                        <div className="text-right text-[11px] text-zinc-600 font-medium">
                          {profileForm.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>

                        <div className="grid grid-cols-2 gap-8 text-center pt-2">
                          {/* Col 1: Coach */}
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold text-zinc-600">Mengetahui,</p>
                            <p className="text-xs font-bold text-zinc-900">{profileForm.coachTitle || 'Pelatih Ekstrakurikuler'}</p>
                            <div className="h-16 flex items-center justify-center">
                              {profileForm.coachSignature ? (
                                <img src={profileForm.coachSignature} alt="TTD Pelatih" className="max-h-16 max-w-full object-contain" />
                              ) : (
                                <div className="text-[10px] text-zinc-400 italic border border-dashed border-zinc-300 rounded px-3 py-2">
                                  (Belum ada TTD Digital)
                                </div>
                              )}
                            </div>
                            <p className="text-xs font-bold text-zinc-900 underline">{profileForm.coachName || 'Nama Pelatih'}</p>
                            <p className="text-[10px] text-zinc-600 font-mono">NIP/Lisensi: {profileForm.coachNip || '-'}</p>
                          </div>

                          {/* Col 2: Principal */}
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold text-zinc-600">Menyetujui,</p>
                            <p className="text-xs font-bold text-zinc-900">{profileForm.principalTitle || 'Kepala Sekolah'}</p>
                            <div className="h-16 flex items-center justify-center">
                              {profileForm.principalSignature ? (
                                <img src={profileForm.principalSignature} alt="TTD Kepala Sekolah" className="max-h-16 max-w-full object-contain" />
                              ) : (
                                <div className="text-[10px] text-zinc-400 italic border border-dashed border-zinc-300 rounded px-3 py-2">
                                  (Belum ada TTD Digital)
                                </div>
                              )}
                            </div>
                            <p className="text-xs font-bold text-zinc-900 underline">{profileForm.principalName || 'Nama Kepala Sekolah'}</p>
                            <p className="text-[10px] text-zinc-600 font-mono">NIP: {profileForm.principalNip || '-'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-900/40">
                    <button
                      type="button"
                      onClick={() => setActivePopup(null)}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                    >
                      Kembali
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer border border-purple-500/40"
                    >
                      <Check className="w-4 h-4 text-yellow-300" />
                      Simpan Perubahan KOP
                    </button>
                  </div>
                </form>
              )}

              {/* POPUP 2: JADWAL LATIHAN & NOTIFIKASI */}
              {activePopup === 'schedule' && (
                <div className="space-y-6">
                  {/* Permission & Sound Test Banner */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-600/60 flex items-center justify-center text-yellow-400">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white uppercase">Pengingat Jadwal Latihan & Alarm Gong</div>
                        <div className="text-[11px] text-slate-400">
                          Status Notifikasi Browser:{' '}
                          <span className={`font-bold ${notifPermission === 'granted' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                            {notifPermission === 'granted' ? 'Aktif (Diizinkan)' : notifPermission === 'denied' ? 'Diblokir' : 'Belum Diaktifkan'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {notifPermission !== 'granted' && (
                        <button
                          onClick={requestBrowserPermission}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white rounded-lg text-xs font-bold uppercase transition-all cursor-pointer"
                        >
                          Aktifkan Izin
                        </button>
                      )}
                      <button
                        onClick={handleTestNotification}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-yellow-300 border border-purple-900/60 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Uji Bunyi Alarm Gong & Notifikasi"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-yellow-400" />
                        Uji Alarm Gong
                      </button>
                    </div>
                  </div>

                  {testSent && (
                    <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Notifikasi alarm gong berhasil dibunyikan dan ditambahkan ke daftar pemberitahuan!
                    </div>
                  )}

                  {/* Form Tambah Jadwal Baru */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-4">
                    <div className="text-xs font-mono text-yellow-400 font-bold uppercase tracking-wider flex items-center gap-2">
                      <Plus className="w-3.5 h-3.5" />
                      Tambah Sesi Jadwal Latihan Baru
                    </div>

                    <form onSubmit={handleAddSchedule} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-semibold">Hari Latihan *</label>
                        <select
                          value={newDay}
                          onChange={e => setNewDay(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="Senin">Senin</option>
                          <option value="Selasa">Selasa</option>
                          <option value="Rabu">Rabu</option>
                          <option value="Kamis">Kamis</option>
                          <option value="Jumat">Jumat</option>
                          <option value="Sabtu">Sabtu</option>
                          <option value="Minggu">Minggu</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-semibold">Jam Mulai (WIB) *</label>
                        <input
                          type="time"
                          required
                          value={newTime}
                          onChange={e => setNewTime(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-semibold">Lokasi / Tempat</label>
                        <input
                          type="text"
                          value={newLocation}
                          onChange={e => setNewLocation(e.target.value)}
                          placeholder="Lapangan Olahraga"
                          className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-semibold">Fokus Materi</label>
                        <input
                          type="text"
                          value={newTopic}
                          onChange={e => setNewTopic(e.target.value)}
                          placeholder="Jurus Tunggal & Tanding"
                          className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="sm:col-span-2 md:col-span-4 flex justify-end pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer border border-purple-500/40"
                        >
                          <Plus className="w-3.5 h-3.5 text-yellow-300" />
                          Simpan Jadwal Latihan
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Daftar Jadwal Aktif */}
                  <div className="space-y-3">
                    <div className="text-xs font-mono text-purple-300 font-bold uppercase tracking-wider">
                      Daftar Jadwal Latihan Rutin ({scheduleList.length} Sesi)
                    </div>

                    {scheduleList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-purple-900/30">
                        Belum ada jadwal latihan rutin yang tersimpan. Tambahkan jadwal di atas.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {scheduleList.map(item => (
                          <div
                            key={item.id}
                            className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                              item.isActive
                                ? 'bg-gradient-to-br from-purple-950/40 via-slate-900/90 to-black border-purple-700/60 shadow-md'
                                : 'bg-slate-950 border-purple-900/30 opacity-60'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs uppercase">{item.day}</span>
                                <span className="px-2 py-0.5 rounded bg-slate-900 text-yellow-400 font-mono text-[10px] font-bold border border-purple-900/50">
                                  {item.time} WIB
                                </span>
                                {item.isActive && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-300">{item.topic}</div>
                              <div className="text-[10px] text-purple-300/80 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-purple-400" />
                                {item.location}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleSchedule(item.id)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                                  item.isActive
                                    ? 'bg-purple-950 text-yellow-300 border border-purple-700'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {item.isActive ? 'Aktif' : 'Non-aktif'}
                              </button>
                              <button
                                onClick={() => handleDeleteSchedule(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                title="Hapus Jadwal"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* POPUP 3: PASANG DI PC / LAPTOP */}
              {activePopup === 'install' && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-900/40 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-600/60 flex items-center justify-center text-yellow-400">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white uppercase">Status Aplikasi Komputer</div>
                        <div className="text-[11px] text-slate-400">
                          {alreadyInstalled ? 'Aplikasi sudah terpasang secara mandiri (PWA Desktop Standalone)' : 'Siap dipasang di Windows, Mac, Linux, atau Smartphone'}
                        </div>
                      </div>
                    </div>

                    {hasPrompt && !alreadyInstalled && (
                      <button
                        onClick={handleInstallPWA}
                        className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white text-xs px-4 py-2 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg cursor-pointer border border-purple-500/40"
                      >
                        <Download className="w-4 h-4 text-yellow-300" />
                        Pasang Sekarang
                      </button>
                    )}
                  </div>

                  {/* OS Selector Tabs */}
                  <div className="space-y-3">
                    <div className="text-xs font-mono text-purple-300 uppercase tracking-wider font-bold">
                      Pilih Sistem Operasi Anda
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        onClick={() => setSelectedOS('windows')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedOS === 'windows'
                            ? 'bg-slate-900 border-purple-500 text-white shadow-md'
                            : 'bg-slate-950 border-purple-900/40 text-slate-400 hover:border-purple-700'
                        }`}
                      >
                        <div className="text-xs font-bold">Windows PC</div>
                        <div className="text-[10px] text-slate-400">Win 10 / 11 Desktop</div>
                      </button>
                      <button
                        onClick={() => setSelectedOS('mac')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedOS === 'mac'
                            ? 'bg-slate-900 border-purple-500 text-white shadow-md'
                            : 'bg-slate-950 border-purple-900/40 text-slate-400 hover:border-purple-700'
                        }`}
                      >
                        <div className="text-xs font-bold">macOS</div>
                        <div className="text-[10px] text-slate-400">Chrome / Safari PWA</div>
                      </button>
                      <button
                        onClick={() => setSelectedOS('linux')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedOS === 'linux'
                            ? 'bg-slate-900 border-purple-500 text-white shadow-md'
                            : 'bg-slate-950 border-purple-900/40 text-slate-400 hover:border-purple-700'
                        }`}
                      >
                        <div className="text-xs font-bold">Linux</div>
                        <div className="text-[10px] text-slate-400">Ubuntu / Debian / Mint</div>
                      </button>
                      <button
                        onClick={() => setSelectedOS('mobile')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedOS === 'mobile'
                            ? 'bg-slate-900 border-purple-500 text-white shadow-md'
                            : 'bg-slate-950 border-purple-900/40 text-slate-400 hover:border-purple-700'
                        }`}
                      >
                        <div className="text-xs font-bold">HP Android / iOS</div>
                        <div className="text-[10px] text-slate-400">Home Screen App</div>
                      </button>
                    </div>
                  </div>

                  {/* OS-Specific Instructions & Downloads */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-4">
                    {selectedOS === 'windows' && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-yellow-400" />
                          Cara Memasang di Laptop Windows (Chrome / Edge)
                        </h4>
                        <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed">
                          <li>Buka peramban Google Chrome atau Microsoft Edge di komputer Anda.</li>
                          <li>Lihat ikon <span className="text-yellow-400 font-semibold font-mono">[Pasang / Install]</span> di sebelah kanan kolom URL (Address bar).</li>
                          <li>Klik <strong>"Install SilatReport"</strong> untuk memasangnya sebagai aplikasi jendela mandiri.</li>
                        </ol>
                        <div className="pt-2 flex items-center gap-3">
                          <button
                            onClick={downloadWindowsDesktopShortcut}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-yellow-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border border-purple-900/60 cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-yellow-400" />
                            Unduh Pintasan Desktop (.bat)
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedOS === 'mac' && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                          <Laptop className="w-4 h-4 text-yellow-400" />
                          Cara Memasang di Apple Mac (Safari / Chrome)
                        </h4>
                        <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed">
                          <li>Buka halaman ini melalui Safari atau Chrome di macOS.</li>
                          <li>Di Safari: Klik menu <strong>File</strong> &rarr; <strong>Add to Dock (Tambahkan ke Dock)</strong>.</li>
                          <li>Di Chrome: Klik menu titik tiga di kanan atas &rarr; <strong>Save and Share</strong> &rarr; <strong>Install page as app</strong>.</li>
                        </ol>
                      </div>
                    )}

                    {selectedOS === 'linux' && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                          <Laptop className="w-4 h-4 text-yellow-400" />
                          Cara Memasang di Linux
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Anda dapat memasangnya melalui Chrome / Chromium atau mengunduh launcher desktop shortcut di bawah:
                        </p>
                        <button
                          onClick={downloadLinuxDesktopShortcut}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-yellow-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border border-purple-900/60 cursor-pointer"
                        >
                          <Download className="w-4 h-4 text-yellow-400" />
                          Unduh SilatReport.desktop
                        </button>
                      </div>
                    )}

                    {selectedOS === 'mobile' && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-yellow-400" />
                          Cara Memasang di Android & iPhone
                        </h4>
                        <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1.5 leading-relaxed">
                          <li><strong>Android (Chrome):</strong> Klik ikon titik tiga di kanan atas &rarr; pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</li>
                          <li><strong>iPhone (Safari):</strong> Klik tombol <strong>Share</strong> (kotak berpanah ke atas) di bagian bawah &rarr; pilih <strong>"Add to Home Screen"</strong>.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* POPUP 4: KEAMANAN ENKRIPSI */}
              {activePopup === 'security' && (
                <div className="space-y-6">
                  {securityStatusMsg && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                        securityStatusMsg.type === 'success'
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                          : 'bg-rose-950/60 border-rose-800 text-rose-300'
                      }`}
                    >
                      {securityStatusMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      )}
                      {securityStatusMsg.text}
                    </div>
                  )}

                  {/* Encryption Toggle Card */}
                  <div className="p-5 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-600/60 flex items-center justify-center text-yellow-400">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white uppercase">Enkripsi Data AES-256 (E2EE)</div>
                          <div className="text-[11px] text-slate-400">
                            {e2eeSettings.isEncryptionEnabled ? 'Aktif - Data log dan siswa dilindungi kata sandi' : 'Non-aktif - Data disimpan dalam format standar peramban'}
                          </div>
                        </div>
                      </div>

                      {e2eeSettings.isEncryptionEnabled ? (
                        <button
                          onClick={handleDisableEncryption}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
                        >
                          Nonaktifkan
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 bg-yellow-950/60 text-yellow-400 border border-yellow-800 text-[10px] font-mono rounded font-bold uppercase">
                          Standar
                        </span>
                      )}
                    </div>

                    {!e2eeSettings.isEncryptionEnabled && (
                      <form onSubmit={handleEnableEncryption} className="pt-3 border-t border-purple-900/40 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Kata Sandi Baru *</label>
                            <input
                              type="password"
                              required
                              value={passphrase}
                              onChange={e => setPassphrase(e.target.value)}
                              placeholder="Minimal 6 karakter"
                              className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Ulangi Kata Sandi *</label>
                            <input
                              type="password"
                              required
                              value={confirmPassphrase}
                              onChange={e => setConfirmPassphrase(e.target.value)}
                              placeholder="Konfirmasi kata sandi"
                              className="w-full px-3 py-2 bg-slate-950 border border-purple-900/50 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={isSecurityProcessing}
                          className="px-4 py-2 bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer border border-purple-500/40"
                        >
                          <ShieldCheck className="w-4 h-4 text-yellow-300" />
                          Aktifkan Proteksi Sandi
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Backup & Restore Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
                        <Download className="w-4 h-4 text-yellow-400" />
                        Unduh Cadangan (Backup)
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Unduh seluruh data presensi, jurnal materi, foto, dan skor sabuk ke dalam satu file arsip aman.
                      </p>
                      <button
                        onClick={handleExportBackup}
                        disabled={isSecurityProcessing}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-yellow-300 rounded-lg text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5 border border-purple-900/60 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-yellow-400" />
                        Simpan Backup ke PC
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
                        <Upload className="w-4 h-4 text-yellow-400" />
                        Pulihkan Data (Restore)
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Unggah file cadangan (.json / .enc) untuk mengembalikan seluruh basis data yang pernah disimpan sebelumnya.
                      </p>
                      <label className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-yellow-300 rounded-lg text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1.5 border border-purple-900/60 cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-yellow-400" />
                        Pilih File Cadangan
                        <input type="file" accept=".json,.enc" className="hidden" onChange={handleImportBackup} />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* POPUP 5: MODE SIANG / MALAM */}
              {activePopup === 'theme' && (
                <div className="space-y-6">
                  <div className="p-5 rounded-xl bg-slate-950/80 border border-purple-900/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-600/60 flex items-center justify-center text-yellow-400">
                          {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white uppercase">Tema Tampilan Aplikasi</div>
                          <div className="text-[11px] text-slate-400">
                            Saat ini menggunakan: <span className="font-bold text-yellow-300">{theme === 'dark' ? 'Mode Gelap (Malam / Dark)' : 'Mode Terang (Siang / Light)'}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={onToggleTheme}
                        className="px-4 py-2 bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 hover:from-purple-600 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 active:scale-95 cursor-pointer border border-purple-500/40"
                      >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-300" /> : <Moon className="w-4 h-4 text-blue-400" />}
                        Ganti ke {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                      </button>
                    </div>
                  </div>

                  {/* Visual Theme Comparison Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Dark Card */}
                    <div
                      onClick={() => { if (theme !== 'dark') onToggleTheme(); }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        theme === 'dark'
                          ? 'bg-slate-950 border-purple-500 ring-2 ring-purple-600/50'
                          : 'bg-slate-900/60 border-purple-900/40 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Moon className="w-4 h-4 text-yellow-400" />
                          <span className="text-xs font-bold text-white uppercase">Mode Gelap (Malam)</span>
                        </div>
                        {theme === 'dark' && <span className="text-[10px] font-mono text-yellow-400 font-bold">AKTIF</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Dirancang untuk pencatatan di luar ruangan, lapangan malam hari, hemat baterai perangkat, dan kontras tinggi khas beladiri.
                      </p>
                    </div>

                    {/* Light Card */}
                    <div
                      onClick={() => { if (theme !== 'light') onToggleTheme(); }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        theme === 'light'
                          ? 'bg-zinc-200 border-purple-700 ring-2 ring-purple-600/50 text-slate-900'
                          : 'bg-slate-900/60 border-purple-900/40 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sun className="w-4 h-4 text-yellow-500" />
                          <span className={`text-xs font-bold uppercase ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                            Mode Terang (Siang)
                          </span>
                        </div>
                        {theme === 'light' && <span className="text-[10px] font-mono text-purple-700 font-bold">AKTIF</span>}
                      </div>
                      <p className={`text-[11px] leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
                        Sangat nyaman digunakan di ruang kantor kesiswaan, tata usaha, dan ruang guru saat mencetak lembar A4 di siang hari.
                      </p>
                    </div>
                  </div>

                  {/* Tombol Logout Terletak di Bawah Menu Mode Tampilan Siang/Malam */}
                  <div className="pt-4 border-t border-purple-900/40">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(true)}
                      className="w-full p-3.5 rounded-xl bg-gradient-to-r from-red-950/80 via-red-900/50 to-slate-950 hover:from-red-900/80 hover:to-red-950 border border-red-700/80 hover:border-red-500 text-red-200 hover:text-white flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-98"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Keluar / Logout dari Akun Ini</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 3. MODAL KONFIRMASI LOGOUT */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-red-800/80 rounded-2xl p-6 shadow-2xl shadow-red-950/80 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-950 border border-red-600/80 flex items-center justify-center text-red-400 shadow-md">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-tight">Konfirmasi Keluar</h3>
                <p className="text-xs text-slate-400">Keluar dari akun SatriaApp Silat</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-red-950/30 border border-red-900/40 p-3 rounded-xl">
              Apakah Anda yakin ingin keluar dari akun <strong className="text-white">"{currentUser?.name || currentUser?.username}"</strong>? Seluruh data yang tersimpan tetap aman.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteLogout}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold uppercase tracking-wider shadow-md shadow-red-950/60 transition-all cursor-pointer flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ya, Keluar Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
