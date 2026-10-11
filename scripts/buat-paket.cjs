const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

console.log('================================================================');
console.log('     JRZ SCORE IPSI 2026 - PEMBUAT PAKET PORTABLE KLIEN');
console.log('================================================================\n');

const rootDir = path.resolve(__dirname, '..');

// Helper recursive copy
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Download helper with redirects and progress
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    function getWithRedirect(currentUrl) {
      https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return getWithRedirect(response.headers.location);
        }
        if (response.statusCode !== 200) {
          return reject(new Error(`Download gagal dengan status code ${response.statusCode}`));
        }

        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastReport = 0;

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const now = Date.now();
          if (now - lastReport > 500) {
            lastReport = now;
            const mb = (downloadedBytes / (1024 * 1024)).toFixed(1);
            const totalMb = totalBytes ? (totalBytes / (1024 * 1024)).toFixed(1) : '?';
            process.stdout.write(`\r[PROGRESS] Mengunduh node.exe portable: ${mb} MB / ${totalMb} MB...`);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            console.log('\n[SUKSES] node.exe portable berhasil diunduh!');
            resolve();
          });
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }

    getWithRedirect(url);
  });
}

// Zero-dependency ZIP Creator
function createZipArchive(sourceDir, zipPath) {
  if (fs.existsSync(zipPath)) {
    try { fs.unlinkSync(zipPath); } catch (e) {}
  }

  const parentDir = path.dirname(sourceDir);
  const baseDirName = path.basename(sourceDir);

  // Metode 1: Gunakan tar.exe bawaan Windows 10/11 & Linux/Mac
  try {
    console.log('- Mengompresi menggunakan tar sistem...');
    execSync(`tar -a -c -f "${zipPath}" "${baseDirName}"`, {
      cwd: parentDir,
      stdio: ['ignore', 'ignore', 'pipe']
    });
    if (fs.existsSync(zipPath) && fs.statSync(zipPath).size > 1000) {
      return true;
    }
  } catch (e) {
    // Tar mungkin versi lama atau tidak ada - lanjut ke metode berikutnya
  }

  // Metode 2: Gunakan PowerShell Compress-Archive bawaan Windows
  try {
    console.log('- Mengompresi menggunakan PowerShell Compress-Archive...');
    execSync(`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${zipPath}' -Force"`, {
      stdio: 'inherit'
    });
    if (fs.existsSync(zipPath) && fs.statSync(zipPath).size > 1000) {
      return true;
    }
  } catch (e) {
    // PowerShell gagal - lanjut
  }

  // Metode 3: Jika modul archiver tersedia di node_modules
  try {
    const archiverModule = require('archiver');
    console.log('- Mengompresi menggunakan modul archiver...');
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      let archive;
      if (typeof archiverModule === 'function') {
        archive = archiverModule('zip', { zlib: { level: 6 } });
      } else if (archiverModule.ZipArchive) {
        archive = new archiverModule.ZipArchive({ zlib: { level: 6 } });
      } else {
        archive = new archiverModule.Archiver('zip', { zlib: { level: 6 } });
      }

      output.on('close', () => resolve(true));
      archive.on('error', (err) => reject(err));
      archive.pipe(output);
      archive.directory(sourceDir, baseDirName);
      archive.finalize();
    });
  } catch (e) {
    // Archiver tidak terinstall
  }

  return false;
}

async function main() {
  try {
    // 1. Cek Build
    console.log('[1/4] Memeriksa hasil build aplikasi...');
    const serverBundle = path.join(rootDir, 'dist', 'server.cjs');
    const indexHtml = path.join(rootDir, 'dist', 'index.html');
    if (!fs.existsSync(serverBundle) || !fs.existsSync(indexHtml)) {
      console.log('Hasil build belum lengkap.');
      if (!fs.existsSync(path.join(rootDir, 'node_modules'))) {
        console.log('Menginstal dependensi proyek (npm install)...');
        execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
      }
      console.log('Menjalankan "npm run build"...');
      execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    } else {
      console.log('✓ File build sudah tersedia (dist/server.cjs & dist/index.html).');
    }

    // 2. Cek Engine Portable node.exe
    console.log('\n[2/4] Memeriksa engine Node.js portable (bin/node.exe)...');
    const binDir = path.join(rootDir, 'bin');
    const nodeExe = path.join(binDir, 'node.exe');

    if (!fs.existsSync(nodeExe)) {
      if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });
      console.log('File bin/node.exe belum ada.');
      console.log('Mengunduh node.exe portable resmi dari nodejs.org (~35 MB)...');
      await downloadFile('https://nodejs.org/dist/v20.18.0/win-x64/node.exe', nodeExe);
    } else {
      const sizeMB = (fs.statSync(nodeExe).size / (1024 * 1024)).toFixed(1);
      console.log(`✓ Engine node.exe portable sudah siap (${sizeMB} MB).`);
    }

    // 3. Menyiapkan Folder Paket Klien
    console.log('\n[3/4] Mengemas folder aplikasi siap kirim (PAKET_KLIEN_JRZ_SCORE)...');
    const targetDir = path.join(rootDir, 'PAKET_KLIEN_JRZ_SCORE');
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    // Salin direktori utama
    console.log('- Menyalin folder bin/ ...');
    copyRecursiveSync(binDir, path.join(targetDir, 'bin'));

    console.log('- Menyalin folder dist/ ...');
    copyRecursiveSync(path.join(rootDir, 'dist'), path.join(targetDir, 'dist'));

    console.log('- Menyalin folder public/ ...');
    copyRecursiveSync(path.join(rootDir, 'public'), path.join(targetDir, 'public'));

    // Salin file konfigurasi & database jika ada
    const filesToCopy = ['activeMatch.json', 'users_db.json', 'package.json'];
    for (const f of filesToCopy) {
      const p = path.join(rootDir, f);
      if (fs.existsSync(p)) {
        fs.copyFileSync(p, path.join(targetDir, f));
      }
    }

    // Coba kompilasi JRZ-SCORE-IPSI.exe menggunakan PowerShell (Jika di Windows)
    console.log('- Mengompilasi aplikasi native: JRZ-SCORE-IPSI.exe ...');
    const compileScript = path.join(rootDir, 'scripts', 'compile-exe.ps1');
    const iconPath = path.join(rootDir, 'public', 'jrzscoreutama.ico');
    let hasNativeExe = false;

    try {
      execSync(`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${compileScript}" -OutputDir "${targetDir}" -IconPath "${iconPath}"`, {
        stdio: 'inherit'
      });
      if (fs.existsSync(path.join(targetDir, 'JRZ-SCORE-IPSI.exe'))) {
        hasNativeExe = true;
        // Salin juga ke root dir untuk Owner
        fs.copyFileSync(path.join(targetDir, 'JRZ-SCORE-IPSI.exe'), path.join(rootDir, 'JRZ-SCORE-IPSI.exe'));
        console.log('✓ JRZ-SCORE-IPSI.exe berhasil dikompilasi!');
      }
    } catch (e) {
      // Jika di lingkungan Linux/Mac, kompilasi .ps1 dilewati
      console.log('[INFO] Kompilasi .exe via PowerShell dilewati di lingkungan ini (akan aktif otomatis di Windows).');
    }

    // Jika JRZ-SCORE-IPSI.exe sudah ada sebelumnya di root, salin ke targetDir
    if (!hasNativeExe && fs.existsSync(path.join(rootDir, 'JRZ-SCORE-IPSI.exe'))) {
      fs.copyFileSync(path.join(rootDir, 'JRZ-SCORE-IPSI.exe'), path.join(targetDir, 'JRZ-SCORE-IPSI.exe'));
      hasNativeExe = true;
    }

    // Buat launcher BAT dengan CRLF (\r\n) sebagai opsi pendamping
    const crlf = '\r\n';
    const launcherBatContent = [
      '@echo off',
      'title JRZ SCORE IPSI 2026 - Digital Scoring Server',
      'color 0b',
      'cls',
      'cd /d "%~dp0"',
      '',
      'echo ================================================================',
      'echo           JRZ SCORE - DIGITAL SCORING TANDING IPSI 2026',
      'echo             100%% OFFLINE & LOCALHOST RUNNER (PORT 3000)',
      'echo ================================================================',
      'echo.',
      '',
      ':: Deteksi Node.js Portable',
      'set "NODE_CMD="',
      'if exist "bin\\node.exe" (',
      '  set "NODE_CMD=%~dp0bin\\node.exe"',
      '  echo [STATUS] Menggunakan Node.js Portable bawaan aplikasi.',
      ') else (',
      '  where node >nul 2>nul',
      '  if %ERRORLEVEL% EQU 0 (',
      '    set "NODE_CMD=node"',
      '    echo [STATUS] Menggunakan Node.js yang terpasang di sistem.',
      '  )',
      ')',
      '',
      'if not defined NODE_CMD (',
      '  echo [ERROR] node.exe tidak ditemukan di folder bin\\ maupun di sistem Windows!',
      '  echo Silakan pastikan folder bin\\node.exe ada.',
      '  pause',
      '  exit /b 1',
      ')',
      '',
      'echo [1/2] Menyiapkan browser otomatis (http://localhost:3000)...',
      'start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"',
      '',
      'echo [2/2] Menjalankan Server Localhost JRZ SCORE...',
      'echo.',
      'echo ================================================================',
      'echo  Aplikasi sudah berjalan di: http://localhost:3000',
      'echo  JANGAN TUTUP JENDELA INI SELAMA PERTANDINGAN BERLANGSUNG!',
      'echo  Untuk berhenti, tutup jendela ini atau tekan Ctrl+C',
      'echo ================================================================',
      'echo.',
      'set NODE_ENV=production',
      '"%NODE_CMD%" dist\\server.cjs',
      'pause'
    ].join(crlf) + crlf;

    fs.writeFileSync(path.join(targetDir, 'KLIK-UNTUK-MEMBUKA-APLIKASI.bat'), launcherBatContent, 'utf8');
    fs.writeFileSync(path.join(targetDir, 'JALANKAN-JRZ-SCORE.bat'), launcherBatContent, 'utf8');

    // Buat launcher VBS tanpa jendela hitam
    const vbsContent = [
      'Set WshShell = CreateObject("WScript.Shell")',
      'WshShell.Run "KLIK-UNTUK-MEMBUKA-APLIKASI.bat", 0, False'
    ].join(crlf) + crlf;
    fs.writeFileSync(path.join(targetDir, 'JALANKAN-TANPA-KONSOL.vbs'), vbsContent, 'utf8');

    // Buat pembuat shortcut desktop dengan CRLF
    const shortcutBatContent = [
      '@echo off',
      'title JRZ SCORE - Pembuat Shortcut Desktop',
      'color 0a',
      'cls',
      'cd /d "%~dp0"',
      'echo ================================================================',
      'echo           PEMBUAT SHORTCUT DESKTOP JRZ SCORE IPSI',
      'echo ================================================================',
      'echo.',
      'echo Sedang membuat shortcut di Desktop Windows Anda...',
      '',
      'set "TARGET_FILE=KLIK-UNTUK-MEMBUKA-APLIKASI.bat"',
      'if exist "JRZ-SCORE-IPSI.exe" set "TARGET_FILE=JRZ-SCORE-IPSI.exe"',
      'powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath(\'Desktop\') + \'\\JRZ SCORE IPSI.lnk\'); $s.TargetPath = \'%~dp0\' + \'%TARGET_FILE%\'; $s.WorkingDirectory = \'%~dp0\'; if (Test-Path \'%~dp0public\\jrzscoreutama.ico\') { $s.IconLocation = \'%~dp0public\\jrzscoreutama.ico,0\' }; $s.Save()"',
      '',
      'echo.',
      'echo [BERHASIL] Shortcut \'JRZ SCORE IPSI\' telah muncul di Desktop Anda!',
      'echo Anda cukup klik 2 kali icon tersebut untuk membuka aplikasi.',
      'echo.',
      'pause'
    ].join(crlf) + crlf;

    fs.writeFileSync(path.join(targetDir, 'BUAT-SHORTCUT-DESKTOP.bat'), shortcutBatContent, 'utf8');

    // Petunjuk text file
    const txtContent = [
      '==========================================================',
      ' PANDUAN PENGGUNAAN APLIKASI JRZ SCORE IPSI 2026',
      '==========================================================',
      '',
      'KLIEN TIDAK PERLU MENGINSTAL APLIKASI APAPUN!',
      'Aplikasi ini sudah siap pakai hasil kompilasi Owner.',
      '',
      'CARA MEMBUKA APLIKASI:',
      '1. Cukup KLIK 2 KALI file:',
      '   --> "JRZ-SCORE-IPSI.exe" (Tipe: Application)',
      '   (Atau file "KLIK-UNTUK-MEMBUKA-APLIKASI.bat")',
      '',
      '2. Aplikasi akan langsung aktif dan membuka tampilan layar',
      '   secara otomatis di http://localhost:3000',
      '',
      '3. Untuk keluar:',
      '   Klik kanan icon JRZ SCORE di pojok kanan taskbar',
      '   dekat jam Windows -> pilih "Keluar & Hentikan Aplikasi".',
      '',
      '* Opsional: Klik 2 kali "BUAT-SHORTCUT-DESKTOP.bat" jika ingin',
      '  membuat icon JRZ SCORE di Desktop laptop Anda.',
      '=========================================================='
    ].join(crlf) + crlf;

    fs.writeFileSync(path.join(targetDir, 'BACA_PANDUAN_KLIEN.txt'), txtContent, 'utf8');
    console.log('✓ Folder "PAKET_KLIEN_JRZ_SCORE" selesai dikemas.');

    // 4. Kompresi ZIP
    console.log('\n[4/4] Mengompresi menjadi file ZIP (JRZ-SCORE-PORTABLE-KLIEN.zip)...');
    const zipPath = path.join(rootDir, 'JRZ-SCORE-PORTABLE-KLIEN.zip');
    const zipSuccess = await createZipArchive(targetDir, zipPath);

    console.log('\n================================================================');
    console.log('                     PROSES SELESAI!');
    console.log('================================================================');

    if (zipSuccess && fs.existsSync(zipPath)) {
      const totalMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(1);
      console.log(`✓ Berkas ZIP Siap Kirim Berhasil Dibuat:`);
      console.log(`  👉 JRZ-SCORE-PORTABLE-KLIEN.zip (${totalMb} MB)\n`);
    } else {
      console.log(`✓ Folder Siap Kirim Berhasil Dibuat:`);
      console.log(`  👉 ${targetDir}\\\n`);
      console.log(`(Tips: Anda juga dapat klik kanan folder 'PAKET_KLIEN_JRZ_SCORE' -> 'Send to Compressed (zipped) folder' jika ingin mengirim format ZIP)`);
    }

    console.log('Langkah untuk Owner:');
    console.log(' 1. Kirim file "JRZ-SCORE-PORTABLE-KLIEN.zip" (atau folder "PAKET_KLIEN_JRZ_SCORE") ke Admin/Klien.');
    console.log(' 2. Klien tinggal ekstrak dan langsung KLIK 2 KALI:');
    console.log('    👉 "JRZ-SCORE-IPSI.exe" (Application)');
    console.log(' 3. Klien TIDAK BUTUH menginstal aplikasi atau software apapun!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n[ERROR TERJADI KESALAHAN]:', err.message);
    process.exit(1);
  }
}

main();
