@echo off
title JRZ SCORE - Pembuat Shortcut Desktop
color 0a
cls
cd /d "%~dp0"

echo ================================================================
echo           PEMBUAT SHORTCUT DESKTOP JRZ SCORE IPSI
echo ================================================================
echo.
echo Sedang membuat shortcut di Desktop Windows Anda...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\JRZ SCORE IPSI.lnk'); if (Test-Path '%~dp0KLIK-UNTUK-MEMBUKA-APLIKASI.bat') { $s.TargetPath = '%~dp0KLIK-UNTUK-MEMBUKA-APLIKASI.bat' } else { $s.TargetPath = '%~dp0JALANKAN-JRZ-SCORE.bat' }; $s.WorkingDirectory = '%~dp0'; if (Test-Path '%~dp0public\jrzscoreutama.ico') { $s.IconLocation = '%~dp0public\jrzscoreutama.ico,0' }; $s.Save()"

echo.
echo [BERHASIL] Shortcut 'JRZ SCORE IPSI' telah muncul di Desktop Anda!
echo Anda cukup klik 2 kali icon tersebut untuk membuka aplikasi.
echo.
pause
