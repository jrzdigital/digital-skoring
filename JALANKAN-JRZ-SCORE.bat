@echo off
title JRZ SCORE IPSI 2026 - Digital Scoring Server
color 0b
cls
cd /d "%~dp0"

echo ================================================================
echo           JRZ SCORE - DIGITAL SCORING TANDING IPSI 2026
echo             100%% OFFLINE & LOCALHOST RUNNER (PORT 3000)
echo ================================================================
echo.

:: Deteksi Node.js Portable
set "NODE_CMD="
if exist "bin\node.exe" (
  set "NODE_CMD=%~dp0bin\node.exe"
  echo [STATUS] Menggunakan Node.js Portable bawaan aplikasi.
) else (
  where node >nul 2>nul
  if %ERRORLEVEL% EQU 0 (
    set "NODE_CMD=node"
    echo [STATUS] Menggunakan Node.js yang terpasang di sistem.
  )
)

if not defined NODE_CMD (
  echo [ERROR] node.exe tidak ditemukan di folder bin\ maupun di sistem Windows!
  echo Silakan pastikan file bin\node.exe tersedia.
  echo.
  pause
  exit /b 1
)

echo [1/2] Menyiapkan browser otomatis (http://localhost:3000)...
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

echo [2/2] Menjalankan Server Localhost JRZ SCORE...
echo.
echo ================================================================
echo  Aplikasi sudah aktif di: http://localhost:3000
echo  JANGAN TUTUP JENDELA INI SELAMA PERTANDINGAN BERLANGSUNG!
echo  Untuk berhenti, tutup jendela ini atau tekan Ctrl+C
echo ================================================================
echo.
set NODE_ENV=production
"%NODE_CMD%" dist\server.cjs
pause
