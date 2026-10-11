@echo off
title JRZ SCORE IPSI 2026 - Server Offline Localhost
color 0B
echo ============================================================================
echo   JRZ SCORE - DIGITAL SCORING PENCAK SILAT (IPSI 2026 ^& PERSILAT)
echo   SERVER PERTANDINGAN OFFLINE (LOCALHOST ^& WI-FI LAN)
echo ============================================================================
echo.

cd /d "%~dp0"

if not exist "dist\index.offline.html" (
    echo Mengompilasi build offline pertama kali...
    call npm run build:offline
)

if not exist "dist-server\server.cjs" (
    echo Menyiapkan server lokal...
    call node scripts/build-server.mjs
)

echo Menjalankan Server Offline pada http://localhost:3000 ...
start "" "http://localhost:3000"
set NODE_ENV=production
node dist-server/server.cjs
pause
