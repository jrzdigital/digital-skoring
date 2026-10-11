@echo off
title JRZ SCORE IPSI 2026 - Pembuat File Aplikasi (.EXE) Siap Kirim
color 0b
cls
cd /d "%~dp0"

echo ================================================================
echo       JRZ SCORE IPSI 2026 - PEMBUAT APLIKASI (.EXE) PORTABLE
echo ================================================================
echo.
echo Sistem ini akan memproses aplikasi pada laptop Owner menjadi:
echo   1. File Aplikasi resmi: "JRZ-SCORE-IPSI.exe" (Tipe: Application)
echo   2. Folder & File ZIP siap kirim untuk Klien/Admin
echo.
echo KLIEN TIDAK PERLU MENGINSTAL APLIKASI APA PUN!
echo Klien cukup klik 2 kali "JRZ-SCORE-IPSI.exe" dan langsung main.
echo.

:: 1. Cek Node.js pada komputer Owner
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Node.js tidak terdeteksi di laptop Owner.
  echo Harap pasang Node.js terlebih dahulu.
  echo.
  pause
  exit /b 1
)

echo Sedang memproses dan mengompilasi aplikasi JRZ SCORE...
echo Harap tunggu beberapa saat...
echo.
node scripts\buat-paket.cjs

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [PERINGATAN] Terjadi kesalahan saat membuat aplikasi.
  echo Periksa pesan kesalahan di atas.
  echo.
  pause
  exit /b 1
)

echo.
echo ================================================================
echo [SUKSES!] File Aplikasi .EXE Siap Kirim Berhasil Dibuat!
echo.
echo Yang perlu Owner kirimkan ke Klien:
echo   -> File ZIP Siap Kirim : JRZ-SCORE-PORTABLE-KLIEN.zip
echo   -> Atau Folder         : PAKET_KLIEN_JRZ_SCORE\
echo.
echo Klien tinggal ekstrak dan KLIK 2 KALI file:
echo   👉 "JRZ-SCORE-IPSI.exe"
echo ================================================================
echo.
echo Tekan sembarang tombol untuk membuka folder paket klien...
pause >nul
start "" explorer "PAKET_KLIEN_JRZ_SCORE"
