param (
    [string]$OutputDir = "$PSScriptRoot\..",
    [string]$IconPath = "$PSScriptRoot\..\public\jrzscoreutama.ico"
)

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   JRZ SCORE IPSI 2026 - COMPILER NATIVE APPLICATION (.EXE)   " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$exePath = Join-Path $OutputDir "JRZ-SCORE-IPSI.exe"
if (Test-Path $exePath) {
    Remove-Item $exePath -Force -ErrorAction SilentlyContinue
}

$csharpCode = @"
using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;
using System.Drawing;

namespace JRZScore
{
    static class Program
    {
        private static Process serverProcess;
        private static NotifyIcon trayIcon;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string nodeExe = Path.Combine(appDir, "bin", "node.exe");
            string serverJs = Path.Combine(appDir, "dist", "server.cjs");

            if (!File.Exists(nodeExe))
            {
                // Cek node di system PATH
                nodeExe = "node";
            }

            if (!File.Exists(serverJs))
            {
                MessageBox.Show(
                    "Berkas server aplikasi tidak ditemukan di:\n" + serverJs + "\n\nPastikan folder 'dist' berada di sebelah file aplikasi ini.",
                    "JRZ Score IPSI 2026",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // Jalankan Express backend secara hening di latar belakang (tanpa jendela hitam CMD)
            ProcessStartInfo startInfo = new ProcessStartInfo();
            startInfo.FileName = nodeExe;
            startInfo.Arguments = "\"" + serverJs + "\"";
            startInfo.WorkingDirectory = appDir;
            startInfo.UseShellExecute = false;
            startInfo.CreateNoWindow = true;
            startInfo.EnvironmentVariables["NODE_ENV"] = "production";
            startInfo.EnvironmentVariables["PORT"] = "3000";

            try
            {
                serverProcess = Process.Start(startInfo);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Gagal memulai backend server JRZ Score:\n" + ex.Message,
                    "JRZ Score IPSI 2026",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // Tunggu port 3000 siap (maksimal 15 detik)
            for (int i = 0; i < 30; i++)
            {
                Thread.Sleep(400);
                try
                {
                    using (TcpClient client = new TcpClient())
                    {
                        var ar = client.BeginConnect("127.0.0.1", 3000, null, null);
                        bool ok = ar.AsyncWaitHandle.WaitOne(250);
                        if (ok && client.Connected)
                        {
                            client.EndConnect(ar);
                            break;
                        }
                    }
                }
                catch { }
            }

            // Buka tampilan desktop dalam App Mode (Jendela tersendiri tanpa address bar / tabs)
            OpenInAppMode("http://localhost:3000");

            // Siapkan Tray Icon di taskbar dekat jam
            trayIcon = new NotifyIcon();
            trayIcon.Text = "JRZ SCORE IPSI 2026 (Port 3000)";

            string icoFile = Path.Combine(appDir, "public", "jrzscoreutama.ico");
            if (!File.Exists(icoFile))
            {
                icoFile = Path.Combine(appDir, "jrzscoreutama.ico");
            }

            if (File.Exists(icoFile))
            {
                try { trayIcon.Icon = new Icon(icoFile); }
                catch { trayIcon.Icon = SystemIcons.Application; }
            }
            else
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            ContextMenu menu = new ContextMenu();
            menu.MenuItems.Add("Buka Tampilan JRZ Score", (s, e) => OpenInAppMode("http://localhost:3000"));
            menu.MenuItems.Add("Buka Panel Dewan", (s, e) => OpenInAppMode("http://localhost:3000/dewan"));
            menu.MenuItems.Add("Buka Layar Monitor", (s, e) => OpenInAppMode("http://localhost:3000/monitor"));
            menu.MenuItems.Add("-");
            menu.MenuItems.Add("Keluar & Hentikan Aplikasi", (s, e) => ExitApp());

            trayIcon.ContextMenu = menu;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => OpenInAppMode("http://localhost:3000");

            trayIcon.ShowBalloonTip(2500, "JRZ SCORE IPSI 2026", "Aplikasi telah aktif. Klik dua kali ikon ini untuk membuka layar skor.", ToolTipIcon.Info);

            Application.ApplicationExit += (s, e) => KillServer();
            AppDomain.CurrentDomain.ProcessExit += (s, e) => KillServer();

            Application.Run();
        }

        private static void OpenInAppMode(string url)
        {
            try
            {
                // Cek Microsoft Edge App Mode
                string edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe");
                if (!File.Exists(edgePath))
                {
                    edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe");
                }

                // Cek Google Chrome App Mode
                string chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe");
                if (!File.Exists(chromePath))
                {
                    chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe");
                }

                if (File.Exists(edgePath))
                {
                    Process.Start(edgePath, "--app=" + url + " --window-size=1366,768");
                }
                else if (File.Exists(chromePath))
                {
                    Process.Start(chromePath, "--app=" + url + " --window-size=1366,768");
                }
                else
                {
                    Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
                }
            }
            catch
            {
                try { Process.Start(new ProcessStartInfo(url) { UseShellExecute = true }); } catch { }
            }
        }

        private static void ExitApp()
        {
            KillServer();
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }
            Application.Exit();
        }

        private static void KillServer()
        {
            try
            {
                if (serverProcess != null && !serverProcess.HasExited)
                {
                    serverProcess.Kill();
                }
            }
            catch { }
        }
    }
}
"@

$compileParams = @{
    TypeDefinition = $csharpCode
    OutputAssembly = $exePath
    OutputType = "WindowsApplication"
    ReferencedAssemblies = @("System.dll", "System.Windows.Forms.dll", "System.Drawing.dll")
}

# Sertakan icon jika ada
if (Test-Path $IconPath) {
    $compileParams.CompilerOptions = "/win32icon:`"$IconPath`""
}

Write-Host "Sedang mengompilasi JRZ-SCORE-IPSI.exe menggunakan C# Compiler bawaan Windows..." -ForegroundColor Yellow

try {
    Add-Type @compileParams
    if (Test-Path $exePath) {
        $sizeKb = [math]::Round(((Get-Item $exePath).Length / 1KB), 1)
        Write-Host ""
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host " [SUKSES] File Aplikasi Berhasil Dibuat:                       " -ForegroundColor Green
        Write-Host "  -> $exePath ($sizeKb KB)" -ForegroundColor Green
        Write-Host "================================================================" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR KOMPILASI]: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
