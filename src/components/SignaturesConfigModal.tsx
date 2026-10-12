import React, { useState } from 'react';
import { SchoolProfile } from '../types';
import { SignaturePad } from './SignaturePad';
import { X, Check, Building2, UserCheck, Shield, Upload, FileText } from 'lucide-react';

interface SignaturesConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: SchoolProfile;
  onSave: (updatedProfile: SchoolProfile) => void;
}

export const SignaturesConfigModal: React.FC<SignaturesConfigModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
}) => {
  const [formData, setFormData] = useState<SchoolProfile>({ ...profile });
  const [activeTab, setActiveTab] = useState<'signatures' | 'school'>('signatures');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'principalSignature' | 'coachSignature' | 'schoolLogo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-red-500">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-tight">Pengaturan Legalitas & Tanda Tangan</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Sesuaikan nama Kepala Sekolah, Pelatih, NIP, KOP surat, dan tanda tangan digital</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-800 px-6 bg-zinc-900/40">
          <button
            type="button"
            onClick={() => setActiveTab('signatures')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'signatures'
                ? 'border-red-600 text-red-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Tanda Tangan & Pejabat Pengesah
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('school')}
            className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'school'
                ? 'border-red-600 text-red-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            KOP Surat & Identitas Sekolah
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 bg-zinc-950/80">
          {activeTab === 'signatures' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kepala Sekolah */}
              <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-4">
                <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-xs border-b border-zinc-800 pb-2 font-mono">
                  <Shield className="w-4 h-4" />
                  Pihak Mengetahui (Kepala Sekolah)
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Nama Lengkap & Gelar:</label>
                  <input
                    type="text"
                    value={formData.principalName}
                    onChange={e => setFormData({ ...formData, principalName: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600"
                    placeholder="Contoh: Drs. H. Bambang Sudirman, M.Pd."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">NIP / NUPTK:</label>
                    <input
                      type="text"
                      value={formData.principalNip}
                      onChange={e => setFormData({ ...formData, principalNip: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 font-mono text-[11px]"
                      placeholder="19750812 200003 1 004"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Jabatan:</label>
                    <input
                      type="text"
                      value={formData.principalTitle}
                      onChange={e => setFormData({ ...formData, principalTitle: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600"
                      placeholder="Kepala Sekolah"
                    />
                  </div>
                </div>

                <SignaturePad
                  title="Tanda Tangan Kepala Sekolah"
                  subtitle="Tanda tangan langsung pada canvas"
                  initialDataUrl={formData.principalSignature}
                  onSave={dataUrl => setFormData(prev => ({ ...prev, principalSignature: dataUrl }))}
                />

                <div>
                  <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">Atau unggah file tanda tangan (.png transparan):</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, 'principalSignature')}
                    className="text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                  />
                </div>
              </div>

              {/* Pelatih Utama */}
              <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-4">
                <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-xs border-b border-zinc-800 pb-2 font-mono">
                  <UserCheck className="w-4 h-4" />
                  Pelatih Ekstrakurikuler Pencak Silat
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Nama Pelatih & Tingkatan:</label>
                  <input
                    type="text"
                    value={formData.coachName}
                    onChange={e => setFormData({ ...formData, coachName: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600"
                    placeholder="Contoh: Rizky Pratama, S.Pd. (Pendekar)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">No. Lisensi / NIP:</label>
                    <input
                      type="text"
                      value={formData.coachNip}
                      onChange={e => setFormData({ ...formData, coachNip: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 font-mono text-[11px]"
                      placeholder="LIS-IPSI/DKI/2022/0981"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Jabatan:</label>
                    <input
                      type="text"
                      value={formData.coachTitle}
                      onChange={e => setFormData({ ...formData, coachTitle: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600"
                      placeholder="Pelatih Utama"
                    />
                  </div>
                </div>

                <SignaturePad
                  title="Tanda Tangan Pelatih"
                  subtitle="Tanda tangan langsung pada canvas"
                  initialDataUrl={formData.coachSignature}
                  onSave={dataUrl => setFormData(prev => ({ ...prev, coachSignature: dataUrl }))}
                />

                <div>
                  <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">Atau unggah file tanda tangan (.png transparan):</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => handleFileUpload(e, 'coachSignature')}
                    className="text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Instansi Induk / Yayasan / Dinas Pendidikan (Opsional):</label>
                <input
                  type="text"
                  value={formData.governmentAgency || ''}
                  onChange={e => setFormData({ ...formData, governmentAgency: e.target.value })}
                  placeholder="Contoh: PEMERINTAH DAERAH PROVINSI DKI JAKARTA / DINAS PENDIDIKAN"
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Nama Instansi / Sekolah *:</label>
                  <input
                    type="text"
                    value={formData.schoolName}
                    onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Nama Ekstrakurikuler *:</label>
                  <input
                    type="text"
                    value={formData.extracurricularName}
                    onChange={e => setFormData({ ...formData, extracurricularName: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 font-bold text-yellow-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Alamat Lengkap Sekolah *:</label>
                <input
                  type="text"
                  value={formData.schoolAddress}
                  onChange={e => setFormData({ ...formData, schoolAddress: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-yellow-400 font-bold mb-1">☎️ No. Telepon / WhatsApp *:</label>
                  <input
                    type="text"
                    value={formData.schoolPhone}
                    onChange={e => setFormData({ ...formData, schoolPhone: e.target.value })}
                    required
                    placeholder="(021) 7890123 / 0812-3456-7890"
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-yellow-600/60 rounded-lg text-white focus:outline-none focus:border-yellow-400 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-yellow-400 font-bold mb-1">✉️ Email Resmi Sekolah *:</label>
                  <input
                    type="email"
                    value={formData.schoolEmail}
                    onChange={e => setFormData({ ...formData, schoolEmail: e.target.value })}
                    required
                    placeholder="info@sekolah.sch.id"
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-yellow-600/60 rounded-lg text-white focus:outline-none focus:border-yellow-400 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">🌐 Website / Portal Sekolah:</label>
                  <input
                    type="text"
                    value={formData.schoolWebsite || ''}
                    onChange={e => setFormData({ ...formData, schoolWebsite: e.target.value })}
                    placeholder="www.sekolah.sch.id"
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Kota Administrasi / Lokasi:</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600"
                    placeholder="Jakarta Selatan"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Tahun Ajaran:</label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 font-mono text-[11px]"
                    placeholder="2026/2027"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">Semester:</label>
                  <select
                    value={formData.semester}
                    onChange={e => setFormData({ ...formData, semester: e.target.value as 'Ganjil' | 'Genap' })}
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-600 font-mono text-[11px]"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              {/* Logo Upload */}
              <div className="p-3.5 bg-zinc-900/80 rounded-xl border border-zinc-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {formData.schoolLogo ? (
                    <img src={formData.schoolLogo} alt="Logo" className="w-12 h-12 object-contain bg-white rounded p-1" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-zinc-800 flex items-center justify-center text-zinc-500">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-white">Logo KOP Surat Sekolah</div>
                    <div className="text-[11px] text-zinc-400">PNG transparan / JPG &bull; Tampil di kiri KOP PDF</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {formData.schoolLogo && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, schoolLogo: undefined })}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-red-400 text-xs font-bold rounded-lg transition-colors"
                    >
                      Hapus
                    </button>
                  )}
                  <label className="cursor-pointer px-3.5 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    Pilih Logo
                    <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'schoolLogo')} />
                  </label>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-xl bg-white text-zinc-900 border border-zinc-300 shadow-md space-y-1.5">
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-200 pb-1">
                  Pratinjau KOP Surat (Live Header Preview)
                </div>
                <div className="flex items-center gap-3 pt-1">
                  {formData.schoolLogo ? (
                    <img src={formData.schoolLogo} alt="Logo" className="w-12 h-12 object-contain shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 text-center space-y-0.5">
                    {formData.governmentAgency && (
                      <p className="text-[9px] font-bold text-zinc-600 uppercase">{formData.governmentAgency}</p>
                    )}
                    <h5 className="text-xs font-extrabold text-zinc-900 uppercase">{formData.schoolName || 'NAMA SEKOLAH'}</h5>
                    <p className="text-[11px] font-bold text-red-700 uppercase">{formData.extracurricularName || 'EKSTRAKURIKULER PENCAK SILAT'}</p>
                    <p className="text-[9px] text-zinc-600">{formData.schoolAddress || 'Alamat Lengkap'}</p>
                    <p className="text-[9px] font-medium text-zinc-700">
                      Telp/WA: {formData.schoolPhone || '-'} &bull; Email: {formData.schoolEmail || '-'} {formData.schoolWebsite && <>&bull; Web: {formData.schoolWebsite}</>}
                    </p>
                  </div>
                </div>
                <div className="space-y-0.5 pt-1">
                  <div className="h-0.5 bg-red-800 w-full" />
                  <div className="h-[1px] bg-red-800/80 w-full" />
                </div>
              </div>
            </div>
          )}

          {/* Footer Save */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors font-mono"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider bg-red-700 hover:bg-red-600 text-white rounded-lg shadow-lg shadow-red-900/20 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Simpan Profil & Tanda Tangan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
