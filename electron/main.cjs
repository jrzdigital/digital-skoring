/**
 * Electron Main Process - JRZ SCORE IPSI 2026 (Windows Desktop Server Edition)
 * Menjalankan Server Express Lokal (Port 3000) secara otomatis di latar belakang
 * serta membuka antarmuka aplikasi desktop Windows siap pakai (Multi-Window & LAN).
 */

const { app, BrowserWindow, Menu, shell, clipboard, dialog } = require("electron");
const path = require("path");
const http = require("http");
const os = require("os");
const fs = require("fs");

const PORT = Number(process.env.PORT) || 3000;
let mainWindow = null;
const childWindows = new Set();

// Pastikan hanya 1 instance aplikasi server yang berjalan di laptop
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function getLocalLanIps() {
  const ips = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips.length > 0 ? ips : ["127.0.0.1"];
}

function startEmbeddedExpressServer() {
  try {
    process.env.NODE_ENV = "production";
    process.env.PORT = String(PORT);
    process.env.JRZ_DATA_DIR = app.getPath("userData");
    process.env.JRZ_DIST_PATH = path.join(__dirname, "..", "dist");

    const serverBundlePath = path.join(__dirname, "..", "dist-server", "server.cjs");
    if (fs.existsSync(serverBundlePath)) {
      require(serverBundlePath);
      console.log("[JRZ DESKTOP] Embedded Express Server started from:", serverBundlePath);
    } else {
      console.error("[JRZ DESKTOP] Server bundle tidak ditemukan di:", serverBundlePath);
    }
  } catch (err) {
    console.error("[JRZ DESKTOP] Gagal menjalankan embedded server:", err);
  }
}

function waitForServerReady(timeoutMs = 10000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${PORT}/api/server-info`, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else if (Date.now() - startTime < timeoutMs) {
          setTimeout(check, 150);
        } else {
          resolve(false);
        }
      });
      req.on("error", () => {
        if (Date.now() - startTime < timeoutMs) {
          setTimeout(check, 150);
        } else {
          resolve(false);
        }
      });
      req.setTimeout(1000, () => {
        req.destroy();
      });
    };
    check();
  });
}

function getAppIconPath() {
  const distIcon = path.join(__dirname, "..", "dist", "jrzscoreutama.ico");
  const publicIcon = path.join(__dirname, "..", "public", "jrzscoreutama.ico");
  if (fs.existsSync(distIcon)) return distIcon;
  if (fs.existsSync(publicIcon)) return publicIcon;
  return undefined;
}

function createPanelWindow(title, urlPath = "/") {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 960,
    minHeight: 600,
    title: title || "JRZ SCORE - Digital Scoring IPSI 2026",
    backgroundColor: "#070d1e",
    icon: getAppIconPath(),
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL(`http://localhost:${PORT}${urlPath}`);
  childWindows.add(win);
  win.on("closed", () => {
    childWindows.delete(win);
  });
  return win;
}

function buildDesktopMenu() {
  const lanIps = getLocalLanIps();
  const primaryIp = lanIps[0] || "127.0.0.1";
  const lanUrl = `http://${primaryIp}:${PORT}`;

  const template = [
    {
      label: "Panel & Multi-Layar",
      submenu: [
        {
          label: "Buka Jendela Baru (Layar Kedua / Scoreboard HDMI)",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            createPanelWindow("JRZ SCORE - Layar Scoreboard Arena (HDMI)");
          }
        },
        { type: "separator" },
        {
          label: "Buka di Browser Eksternal (Chrome / Edge)",
          click: () => {
            shell.openExternal(`http://localhost:${PORT}`);
          }
        },
        { type: "separator" },
        {
          label: "Keluar Aplikasi",
          accelerator: "Alt+F4",
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: "Jaringan LAN (Koneksi Juri & Dewan)",
      submenu: [
        {
          label: `IP Server Laptop: ${lanUrl}`,
          enabled: false
        },
        {
          label: "Salin Alamat URL Server LAN",
          click: () => {
            clipboard.writeText(lanUrl);
            dialog.showMessageBox({
              type: "info",
              title: "Alamat Server LAN Disalin",
              message: `Alamat Server LAN berhasil disalin:\n${lanUrl}`,
              detail:
                `Buka alamat ${lanUrl} pada browser Tablet/HP Juri 1-3, Ketua Dewan, atau Monitor yang terhubung ke Wi-Fi/Router yang sama dengan laptop ini.`
            });
          }
        },
        {
          label: "Lihat Semua IP Jaringan Laptop",
          click: () => {
            const allUrls = getLocalLanIps().map((ip) => `• http://${ip}:${PORT}`).join("\n");
            dialog.showMessageBox({
              type: "info",
              title: "Informasi Server Offline & Wi-Fi LAN",
              message: "JRZ SCORE IPSI 2026 - Server Offline Aktif",
              detail:
                `Laptop Server Lokal: http://localhost:${PORT}\n\n` +
                `Daftar IP Wi-Fi/LAN untuk Tablet Juri & Dewan:\n${allUrls}\n\n` +
                `Lokasi Database Lokal Otomatis:\n${app.getPath("userData")}`
            });
          }
        }
      ]
    },
    {
      label: "Tampilan",
      submenu: [
        {
          label: "Layar Penuh (Fullscreen)",
          accelerator: "F11",
          click: (_, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
            }
          }
        },
        {
          label: "Muat Ulang Halaman (Reload)",
          accelerator: "CmdOrCtrl+R",
          click: (_, focusedWindow) => {
            if (focusedWindow) focusedWindow.reload();
          }
        },
        { type: "separator" },
        { role: "zoomIn", label: "Perbesar Tampilan (Zoom In)" },
        { role: "zoomOut", label: "Perkecil Tampilan (Zoom Out)" },
        { role: "resetZoom", label: " Ukuran Normal (100%)" },
        { type: "separator" },
        { role: "toggleDevTools", label: "Buka Konsol Diagnostik (DevTools)" }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  startEmbeddedExpressServer();
  buildDesktopMenu();

  await waitForServerReady(8000);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 860,
    minWidth: 1024,
    minHeight: 640,
    title: "JRZ SCORE - Digital Scoring Tanding (IPSI 2026 & PERSILAT)",
    backgroundColor: "#070d1e",
    icon: getAppIconPath(),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.maximize();
  mainWindow.show();
  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
