@echo off
title JRZ SCORE IPSI 2026 - Pembuat Installer Windows (.EXE)
color 0A
echo ============================================================================
echo   JRZ SCORE - DIGITAL SCORING PENCAK SILAT (IPSI 2026 ^& PERSILAT)
echo   PEMBUAT APLIKASI DESKTOP WINDOWS SETUP INSTALLER (.EXE)
echo ============================================================================
echo.

cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js belum terinstal di laptop ini!
    echo Silakan instal Node.js LTS terlebih dahulu dari https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [1/2] Menginstal dependensi paket aplikasi...
    call npm install
)

echo [2/2] Memulai proses pembuatan file Setup Installer (.exe)...
call npm run build:exe

echo.
echo ============================================================================
echo   PROSES SELESAI!
echo   Silakan buka folder "release" untuk melihat file Setup .EXE Anda.
echo ============================================================================
pause
