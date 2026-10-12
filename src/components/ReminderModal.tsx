import React, { useState } from 'react';
import { ScheduleReminder, NotificationItem } from '../types';
import { Bell, Clock, Volume2, Plus, Trash2, CheckCircle, ShieldCheck, Play, Send } from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: ScheduleReminder[];
  onSaveSchedules: (schedules: ScheduleReminder[]) => void;
  notifications: NotificationItem[];
  onAddNotification: (notif: NotificationItem) => void;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  schedules,
  onSaveSchedules,
  notifications,
  onAddNotification,
}) => {
  const [scheduleList, setScheduleList] = useState<ScheduleReminder[]>(schedules);
  const [newDay, setNewDay] = useState<string>('Selasa');
  const [newTime, setNewTime] = useState<string>('15:30');
  const [newTopic, setNewTopic] = useState<string>('Latihan Kuda-kuda & Pola Langkah');
  const [newLocation, setNewLocation] = useState<string>('Lapangan Olahraga');
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [testSent, setTestSent] = useState<boolean>(false);

  if (!isOpen) return null;

  // Sound chime synthesizer using Web Audio API
  const playChimeSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      const ctx = new AudioContext();
      
      const now = ctx.currentTime;
      // Synthesize traditional gong / martial chime tone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(329.63, now + 1.2); // E4

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.exponentialRampToValueAtTime(261.63, now + 1.5); // C4

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.8);
      osc2.stop(now + 1.8);
    } catch (e) {
      console.warn('Audio Context not allowed or failed:', e);
    }
  };

  const requestBrowserPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        new Notification('SilatReport: Izin Notifikasi Aktif', {
          body: 'Pengingat latihan harian Pencak Silat akan dikirimkan tepat waktu.',
          icon: '/favicon.ico',
        });
      }
    }
  };

  const handleTestNotification = () => {
    playChimeSound();
    const testNotif: NotificationItem = {
      id: 'notif-' + Date.now(),
      title: '🥋 Pengingat Latihan Pencak Silat',
      message: `Jadwal Latihan Hari Ini: ${newDay} pukul ${newTime} WIB di ${newLocation}. Pastikan membawa pakaian sakral dan sabuk.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'schedule',
    };
    onAddNotification(testNotif);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(testNotif.title, {
        body: testNotif.message,
      });
    }

    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const newSch: ScheduleReminder = {
      id: 'sch-' + Date.now(),
      day: newDay,
      time: newTime,
      durationMinutes: 120,
      location: newLocation,
      topic: newTopic,
      isActive: true,
    };
    const updated = [...scheduleList, newSch];
    setScheduleList(updated);
    onSaveSchedules(updated);
  };

  const handleToggleActive = (id: string) => {
    const updated = scheduleList.map(s => (s.id === id ? { ...s, isActive: !s.isActive } : s));
    setScheduleList(updated);
    onSaveSchedules(updated);
  };

  const handleDeleteSchedule = (id: string) => {
    const updated = scheduleList.filter(s => s.id !== id);
    setScheduleList(updated);
    onSaveSchedules(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-tight">Notifikasi Pengingat Latihan Real-Time</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Atur jadwal push notification otomatis bagi atlet dan pelatih</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-zinc-950/80">
          {/* Permission & Sound Banner */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 font-mono">
                <Volume2 className="w-4 h-4 text-red-500" />
                Status Izin Push Notification & Alarm
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                Izin Browser: <strong className="text-red-400 uppercase font-mono">{notifPermission}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              {notifPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={requestBrowserPermission}
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors font-mono"
                >
                  Aktifkan Notifikasi
                </button>
              )}

              <button
                type="button"
                onClick={handleTestNotification}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg transition-colors flex items-center gap-1.5 border border-zinc-800 font-mono text-[11px]"
              >
                <Play className="w-3 h-3 text-red-400" />
                Uji Alarm & Bunyi
              </button>
            </div>
          </div>

          {testSent && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-lg flex items-center gap-2 font-mono">
              <CheckCircle className="w-4 h-4" />
              Alarm suara gong berbunyi dan notifikasi pengingat latihan berhasil dikirimkan!
            </div>
          )}

          {/* Active Schedule List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono text-[11px]">
              Jadwal Rutin Ekstrakurikuler Silat:
            </h4>

            {scheduleList.map(sch => (
              <div
                key={sch.id}
                className="p-3.5 bg-zinc-900/60 rounded-lg border border-zinc-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={sch.isActive}
                    onChange={() => handleToggleActive(sch.id)}
                    className="w-4 h-4 rounded accent-red-600 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-white uppercase">{sch.day}</strong>
                      <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded border border-red-900">
                        {sch.time} WIB
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{sch.topic} &bull; {sch.location}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSchedule(sch.id)}
                  className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Schedule Form */}
          <form onSubmit={handleAddSchedule} className="p-4 bg-zinc-900/40 rounded-lg border border-zinc-800 space-y-3">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Plus className="w-3.5 h-3.5" />
              Tambah Jadwal Rutin Baru
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Hari:</label>
                <select
                  value={newDay}
                  onChange={e => setNewDay(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono text-[11px]"
                >
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Jam Mulai:</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono text-[11px]"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Lokasi Latihan:</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  placeholder="Lapangan / Gelanggang Matras"
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-400 mb-1">Materi / Agenda Latihan:</label>
              <input
                type="text"
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                placeholder="Contoh: Latihan Sambung Tanding & Fisik Sirkuit"
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-red-950/20"
              >
                <Plus className="w-3.5 h-3.5" />
                Simpan Jadwal
              </button>
            </div>
          </form>
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
