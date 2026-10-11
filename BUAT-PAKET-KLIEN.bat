@echo off
title JRZ SCORE IPSI 2026 - Pembuat Paket Portable Klien
color 0b
cls
cd /d "%~dp0"

echo ================================================================
echo       JRZ SCORE IPSI 2026 - PEMBUAT PAKET PORTABLE KLIEN
echo ================================================================
echo.

:: Cek apakah Node.js terpasang di komputer Owner
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Program Node.js tidak ditemukan di komputer Anda!
  echo Harap pasang Node.js terlebih dahulu atau buka via terminal.
  echo.
  pause
  exit /b 1
)

echo Sedang memproses dan mengemas aplikasi JRZ SCORE...
echo Harap tunggu beberapa saat hingga selesai...
echo.
node scripts\buat-paket.cjs

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [PERINGATAN] Terjadi kesalahan saat membuat paket.
  echo Periksa pesan kesalahan di atas.
  echo.
  pause
  exit /b 1
)

echo.
echo ================================================================
echo [SUKSES!] File JRZ-SCORE-PORTABLE-KLIEN.zip siap dikirimkan.
echo Tekan tombol apa saja untuk menutup jendela ini.
echo ================================================================
pause >nul
