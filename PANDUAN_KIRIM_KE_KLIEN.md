# PANDUAN LENGKAP: CARA MEMBERIKAN FILE KE KLIEN (CUKUP KLIK 2 KALI, TANPA INSTALL NODE.JS)

Panduan ini dirancang agar Anda dapat mengemas dan mengirimkan aplikasi **JRZ SCORE IPSI 2026** ke klien di mana saja. Klien **TIDAK PERLU** menginstal Node.js, Git, VS Code, atau software teknis lainnya di komputernya. Klien hanya perlu **mengekstrak ZIP** dan **klik 2 kali file launcher**, aplikasi langsung terbuka dan siap digunakan untuk pertandingan secara 100% offline.

---

## 📋 DAFTAR FILE DALAM PAKET KLIEN

Di dalam paket yang dikirim ke klien, struktur foldernya sangat ringkas:
```text
📁 JRZ-SCORE-OFFLINE/
│
├── 📁 bin/                         <-- Folder berisi node.exe portable (~35MB)
│   └── 📄 node.exe
│
├── 📁 dist/                        <-- Folder hasil build (frontend & server.cjs)
│   ├── 📁 assets/
│   ├── 📄 index.html
│   ├── 📄 server.cjs               <-- Backend Express yang sudah dibundle mandiri
│   └── ... (aset gambar & ikon)
│
├── 📁 public/                      <-- Aset gambar, logo IPSI, watermark
│
├── 📄 activeMatch.json             <-- Penyimpanan data pertandingan aktif
├── 📄 users_db.json                <-- Database akun user & lisensi
├── 📄 userManager.ts               <-- Modul manajemen akun
├── 📄 package.json                 <-- Konfigurasi aplikasi
├── 📄 JALANKAN-JRZ-SCORE.bat       <-- LAUNCHER UTAMA (KLIK 2 KALI INI)
└── 📄 BUAT-SHORTCUT-DESKTOP.bat    <-- Pembuat icon aplikasi di Desktop Windows
```

> ⚠️ **PENTING**: Folder `node_modules` dan `src` **TIDAK PERLU IKUT DIKIRIMKAN**. Dengan demikian, ukuran file ZIP jauh lebih ringan dan aman (source code terlindungi di dalam `dist/server.cjs`).

---

## 🛠️ LANGKAH 1: PERSIAPAN DI LAPTOP ANDA (HANYA SEKALI)

Sebelum mengirimkan file ke klien, lakukan langkah persiapan ini di laptop Anda:

### 1.1 Lakukan Build Produksi
Pastikan build terbaru sudah selesai dibuat dengan menjalankan perintah:
```bash
npm run build
```
*(Perintah ini otomatis membangun tampilan web dan membungkus backend server menjadi `dist/server.cjs` yang mandiri).*

### 1.2 Unduh File `node.exe` Standalone (Engine Portable)
Agar komputer klien tidak perlu install Node.js:
1. Unduh file `node.exe` (versi Windows 64-bit portable, ukuran ~35 MB) dari tautan resmi Node.js:
   👉 **https://nodejs.org/dist/v20.18.0/win-x64/node.exe**
2. Buat folder baru bernama **`bin`** di dalam folder proyek Anda.
3. Pindahkan file `node.exe` yang baru didownload ke dalam folder `bin/` tersebut sehingga jalurnya menjadi:
   ```text
   bin/node.exe
   ```

---

## 📦 LANGKAH 2: CARA MEMBUAT FILE ZIP UNTUK KLIEN

1. Buat folder baru di komputer Anda, beri nama misalnya: **`JRZ-SCORE-IPSI-PORTABLE`**.
2. Salin (copy) item-item berikut ke dalam folder tersebut:
   - ✅ Folder **`bin`** *(yang berisi `node.exe`)*
   - ✅ Folder **`dist`** *(hasil `npm run build`)*
   - ✅ Folder **`public`**
   - ✅ File **`activeMatch.json`**
   - ✅ File **`users_db.json`**
   - ✅ File **`userManager.ts`**
   - ✅ File **`package.json`**
   - ✅ File **`JALANKAN-JRZ-SCORE.bat`**
   - ✅ File **`BUAT-SHORTCUT-DESKTOP.bat`**
3. Klik kanan pada folder `JRZ-SCORE-IPSI-PORTABLE` ➡️ Pilih **Compress to ZIP file** (atau gunakan WinRAR/7-Zip).
4. Hasilnya adalah satu file arsip, misalnya: **`JRZ-SCORE-IPSI-PORTABLE.zip`** (ukuran sekitar ~45 - 55 MB).

---

## 🚀 LANGKAH 3: CARA PENGIRIMAN KE KLIEN

Kirimkan file `.zip` tersebut ke klien melalui media apa saja:
- **WhatsApp**: Kirim sebagai Dokumen (*Attach ➡️ Document*).
- **Google Drive**: Upload file ZIP, lalu bagikan tautan download (*Anyone with the link*).
- **Telegram / Flashdisk**: Kirim file langsung ke panitia / klien.

---

## 🎯 LANGKAH 4: PANDUAN UNTUK KLIEN (SANGAT MUDAH)

Berikan pesan singkat berikut kepada klien saat mengirimkan file:

```text
Halo Panitia / Klien,
Berikut panduan cara menggunakan Aplikasi JRZ SCORE IPSI 2026 di laptop Anda:

1. Download dan Ekstrak (Unzip) file "JRZ-SCORE-IPSI-PORTABLE.zip".
2. Masuk ke dalam folder hasil ekstrak.
3. Cukup KLIK 2 KALI file:
   👉 "JALANKAN-JRZ-SCORE.bat"
   
4. Jendela server hitam akan terbuka dan browser (Chrome/Edge) akan 
   LANGSUNG TERBUKA OTOMATIS menampilkan JRZ SCORE pada alamat:
   http://localhost:3000

* Catatan:
- Jangan tutup jendela hitam selama pertandingan berlangsung.
- Jika ingin memunculkan ikon aplikasi di Desktop Windows Anda, 
  cukup klik 2 kali file "BUAT-SHORTCUT-DESKTOP.bat".
- Anda TIDAK PERLU menginstal Node.js atau software apapun!
```

---

## 🌐 BONUS: MENGHUBUNGKAN HP JURI & DEWAN KE LAPTOP SERVER

Jika pertandingan menggunakan jaringan WiFi Lokal / Hotspot tanpa internet:
1. Sambungkan laptop server dan semua perangkat Juri/Dewan ke jaringan WiFi / Hotspot yang sama.
2. Cek IP Laptop Server (buka CMD, ketik `ipconfig`, lihat IPv4 Address, misal `192.168.1.100`).
3. Di HP Juri / Dewan / Monitor, cukup buka browser dan ketik alamat:
   ```text
   http://192.168.1.100:3000
   ```
4. Semua perangkat akan langsung terhubung secara real-time ke laptop server tanpa butuh kuota internet!
