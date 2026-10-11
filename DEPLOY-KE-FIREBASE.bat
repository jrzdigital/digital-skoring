@echo off
title JRZ SCORE - Deploy Update ke Firebase Hosting
color 0b
cls
cd /d "%~dp0"

echo ================================================================
echo           JRZ SCORE - DEPLOY UPDATE KE FIREBASE HOSTING
echo        Project: digital-skoring-pencak-silat.web.app
echo ================================================================
echo.

echo [1/3] Menjalankan build bundle aplikasi terbaru...
call npm run build
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] Gagal melakukan proses compile / build!
  echo Periksa koneksi atau error di atas.
  pause
  exit /b 1
)

echo.
echo [2/3] Memeriksa instalasi Firebase CLI...
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [INFO] Menjalankan via npx firebase-tools...
  set "FIREBASE_CMD=npx firebase"
) else (
  set "FIREBASE_CMD=firebase"
)

echo.
echo [3/3] Melakukan deploy hosting ke Firebase: digital-skoring-pencak-silat...
call %FIREBASE_CMD% deploy --only hosting --project digital-skoring-pencak-silat

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [CATATAN] Jika Anda belum login ke Firebase di komputer ini, jalankan:
  echo   firebase login
  echo lalu jalankan kembali file batch ini.
  echo.
) else (
  echo.
  echo ================================================================
  echo  [SUKSES] Panel Dewan dan seluruh aplikasi berhasil diperbarui!
  echo  Kunjungi: https://digital-skoring-pencak-silat.web.app/
  echo ================================================================
  echo.
)

pause
