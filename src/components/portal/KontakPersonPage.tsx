import React, { useState } from "react";
import { 
  PhoneCall, 
  MessageSquare, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Clock, 
  ExternalLink, 
  HeartHandshake, 
  Send, 
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Stethoscope,
  Laptop
} from "lucide-react";
import { ContactPersonItem } from "../../types/portal";
import { sound } from "../../utils/sound";

export function KontakPersonPage() {
  const [protestFormName, setProtestFormName] = useState("");
  const [protestContingent, setProtestContingent] = useState("");
  const [protestMatchNumber, setProtestMatchNumber] = useState("");
  const [protestMessage, setProtestMessage] = useState("");
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const contactList: ContactPersonItem[] = [
    {
      id: "cp-1",
      roleTitle: "Technical Delegate (TD)",
      name: "Drs. H. BAMBANG SURYONO, M.Pd",
      phone: "+62 812-8877-6655",
      whatsappLink: "https://wa.me/6281288776655?text=Halo%20Technical%20Delegate%20Kejuaraan%20Pencak%20Silat,%20saya%20ingin%20berkonsultasi%20terkait%20regulasi%20pertandingan.",
      description: "Penanggung jawab teknis tertinggi kejuaraan & interpretasi regulasi pertandingan IPSI/PERSILAT.",
      badge: "LISENSI NASIONAL IPSI",
      avatarIcon: "shield"
    },
    {
      id: "cp-2",
      roleTitle: "Ketua Pertandingan (KP)",
      name: "AGUS WIJAYANTO, S.Or",
      phone: "+62 813-2211-4433",
      whatsappLink: "https://wa.me/6281322114433?text=Halo%20Ketua%20Pertandingan,%20saya%20dari%20kontingen%20ingin%20konfirmasi%20jadwal%20gelanggang.",
      description: "Pengawas kelancaran partai pertandingan di Gelanggang A & Gelanggang B serta penanganan banding.",
      badge: "GELANGGANG KOORDINATOR",
      avatarIcon: "whistle"
    },
    {
      id: "cp-3",
      roleTitle: "Sekretariat & Pendaftaran",
      name: "NURUL AINI, S.Kom (Sekretaris Panpel)",
      phone: "+62 857-9900-1122",
      whatsappLink: "https://wa.me/6285799001122?text=Halo%20Sekretariat%20Kejuaraan,%20saya%20ingin%20menanyakan%20verifikasi%20berkas%20atlet%20dan%20ID%20card.",
      description: "Layanan registrasi kontingen, berkas timbang badan, sertifikat kejuaraan, dan rekapitulasi medali.",
      badge: "ADMINISTRASI PANPEL",
      avatarIcon: "file"
    },
    {
      id: "cp-4",
      roleTitle: "Tim Medis & Kesehatan Gelanggang",
      name: "dr. FARHAN MAULANA (Dokter Pertandingan)",
      phone: "+62 811-3344-5566",
      whatsappLink: "https://wa.me/6281133445566?text=Layanan%20Medis%20Darurat%20Gelanggang%20Silat.",
      description: "Standby 24/7 di ruang medis gelanggang, penanganan cedera atlet & ambulans rujukan resmi.",
      badge: "TIM MEDIS VENUE",
      avatarIcon: "medical"
    },
    {
      id: "cp-5",
      roleTitle: "Helpdesk IT & Digital Scoring",
      name: "JRZ SYSTEM TECH SUPPORT",
      phone: "+62 819-0022-3344",
      whatsappLink: "https://wa.me/6281900223344?text=Halo%20IT%20Support%20JRZ%20Score,%20saya%20butuh%20bantuan%20koneksi%20panel%20scoring.",
      description: "Dukungan teknis jaringan lokal, sinkronisasi Firebase Realtime Database, dan display monitor LED.",
      badge: "SISTEM DIGITAL",
      avatarIcon: "laptop"
    }
  ];

  const handleSubmitProtest = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      setProtestFormName("");
      setProtestContingent("");
      setProtestMatchNumber("");
      setProtestMessage("");
    }, 4000);
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[#070d1e] text-slate-100 p-3 sm:p-6 space-y-6 animate-fadeIn">
      
      {/* HEADER SECTION */}
      <div className="bg-gradient-to-r from-[#0d1838] via-[#09132c] to-[#0d1838] p-4 sm:p-6 rounded-2xl border border-blue-900/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
              PUSAT INFORMASI & HELPDESK
            </span>
            <span className="text-xs text-slate-400 font-mono">Respon Cepat Panitia Pelaksana</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2.5">
            <PhoneCall className="w-6 h-6 text-amber-400" />
            Kontak Person & Sekretariat Kejuaraan
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Hubungi penanggung jawab pertandingan, Technical Delegate, sekretariat pendaftaran, layanan medis, atau tim teknis scoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://wa.me/6281288776655?text=Halo%20Panitia%20Pelaksana%20Kejuaraan%20Pencak%20Silat"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat WhatsApp Panitia</span>
          </a>
        </div>
      </div>

      {/* CONTACT PERSON CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contactList.map((cp) => (
          <div
            key={cp.id}
            className="bg-[#0a1329] border border-blue-900/50 hover:border-blue-500/50 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {cp.badge}
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>

              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wide">
                {cp.roleTitle}
              </div>
              
              <h3 className="font-black text-white text-base mt-1 group-hover:text-cyan-300 transition-colors">
                {cp.name}
              </h3>

              <p className="text-xs text-slate-300 font-sans mt-2 mb-4 leading-relaxed">
                {cp.description}
              </p>
            </div>

            <div className="pt-3 border-t border-blue-900/30 flex items-center justify-between">
              <div className="text-xs font-mono font-bold text-slate-300">
                {cp.phone}
              </div>

              <a
                href={cp.whatsappLink}
                target="_blank"
                rel="noreferrer"
                onClick={() => sound.playClick()}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <span>WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* VENUE INFORMATION & FORM ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* VENUE & LOCATION CARD */}
        <div className="bg-[#0a1329] border border-blue-900/50 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-blue-900/40 pb-3">
            <MapPin className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white uppercase tracking-tight">
              Informasi Gelanggang & Venue Pertandingan
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-cyan-400 uppercase">LOKASI UTAMA:</div>
              <div className="font-bold text-white text-sm">GOR Tri Lomba Juang / Sport Hall Championship</div>
              <div className="text-slate-300">Jl. Pemuda No. 12, Kompleks Olahraga Stadion Utama</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">GELANGGANG A:</div>
                <div className="font-bold text-emerald-400 mt-0.5">Tanding Dewasa & Remaja</div>
                <div className="text-[10px] text-slate-400 font-mono">Sisi Barat Tribun Utama</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">GELANGGANG B:</div>
                <div className="font-bold text-cyan-400 mt-0.5">Tanding Pra-Remaja & Seni TGR</div>
                <div className="text-[10px] text-slate-400 font-mono">Sisi Timur Tribun Utama</div>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">FASILITAS VENUE:</div>
              <div className="text-slate-300">
                • Ruang Medis & Emergency ICU Ambulance Standby<br />
                • Ruang Dewan Pertandingan & Ruang Rapat Manajer<br />
                • Area Pemanasan Atlet Berkarpet Standar PERSILAT<br />
                • Timbangan Digital Resmi Tera Metrologi
              </div>
            </div>
          </div>
        </div>

        {/* OFFICIAL PROTEST FORM / INQUIRY */}
        <div className="bg-[#0a1329] border border-blue-900/50 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-blue-900/40 pb-3">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white uppercase tracking-tight">
              Formulir Protes Resmi / Bantuan Cepat
            </h2>
          </div>

          {submittedSuccess ? (
            <div className="bg-emerald-950 border border-emerald-500 p-6 rounded-2xl text-center space-y-2 animate-fadeIn">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="font-black text-white text-base">Laporan Berhasil Diterima Panitia!</div>
              <p className="text-xs text-slate-300 font-mono">
                Sekretariat & Ketua Pertandingan akan segera memproses pengajuan Anda di ruang dewan.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitProtest} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Nama Manajer / Ofisial:</label>
                  <input
                    type="text"
                    required
                    value={protestFormName}
                    onChange={(e) => setProtestFormName(e.target.value)}
                    placeholder="Nama Anda"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-mono">Nama Kontingen:</label>
                  <input
                    type="text"
                    required
                    value={protestContingent}
                    onChange={(e) => setProtestContingent(e.target.value)}
                    placeholder="Nama Kontingen"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Nomor Partai / Gelanggang:</label>
                <input
                  type="text"
                  value={protestMatchNumber}
                  onChange={(e) => setProtestMatchNumber(e.target.value)}
                  placeholder="Contoh: Partai 02 Gelanggang A"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono">Isi Protes / Pengaduan:</label>
                <textarea
                  rows={3}
                  required
                  value={protestMessage}
                  onChange={(e) => setProtestMessage(e.target.value)}
                  placeholder="Jelaskan kronologi kejadian atau hal yang ingin dikonfirmasi ke panitia..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-amber-400 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400 font-mono">
                  *Sesuai Aturan IPSI: Protes maksimal 10 mnt pasca partai.
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Laporan</span>
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
