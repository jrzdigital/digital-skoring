const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');

// Set production environment by default
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

let PORT = 3000;
let mainWindow = null;

// Dynamic port finder to prevent "PORT already in use" crashes
function findFreePort(startPort, callback) {
  const server = net.createServer();
  server.listen(startPort, '0.0.0.0', () => {
    const port = server.address().port;
    server.close(() => {
      callback(port);
    });
  });
  server.on('error', () => {
    console.log(`[JRZ SCORE] Port ${startPort} is in use, trying ${startPort + 1}...`);
    findFreePort(startPort + 1, callback);
  });
}

// Start the integrated Express/Node server
function startBackend() {
  try {
    process.env.PORT = String(PORT);
    process.env.ELECTRON_RUN_PORT = String(PORT);
    process.env.NODE_ENV = 'production';

    console.log('[JRZ SCORE] Starting Express Backend on port ' + PORT);

    const candidates = [
      path.join(__dirname, 'dist', 'server.cjs'),
      path.join(process.resourcesPath || '', 'app.asar', 'dist', 'server.cjs'),
      path.join(process.resourcesPath || '', 'app', 'dist', 'server.cjs'),
      path.join(__dirname, 'server.cjs'),
    ];

    let started = false;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        require(p);
        started = true;
        console.log('[JRZ SCORE] Backend loaded from: ' + p);
        break;
      }
    }

    if (!started) {
      require('./dist/server.cjs');
    }
  } catch (err) {
    console.error('[JRZ SCORE] Error starting backend:', err);
    dialog.showErrorBox(
      'Server Error',
      'Gagal memulai server lokal pada port ' + PORT + '.\nDetail: ' + err.message
    );
  }
}

function createWindow() {
  // Determine valid app icon
  const iconCandidates = [
    path.join(__dirname, 'build', 'icon.ico'),
    path.join(__dirname, 'build', 'icon.png'),
    path.join(__dirname, 'public', 'jrzscoreutama.ico'),
    path.join(__dirname, 'public', 'jrzscoreutama.png'),
    path.join(process.resourcesPath || '', 'build', 'icon.ico'),
    path.join(process.resourcesPath || '', 'public', 'jrzscoreutama.ico'),
  ];
  
  const appIcon = iconCandidates.find(p => fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    title: 'JRZ SCORE IPSI 2026 - Digital Scoring Tanding',
    ...(appIcon ? { icon: appIcon } : {}),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  Menu.setApplicationMenu(null);

  // Load app with automatic retry
  function loadURLWithRetry(retriesLeft = 12) {
    if (!mainWindow) return;
    const url = `http://localhost:${PORT}`;
    mainWindow.loadURL(url)
      .then(() => {
        mainWindow.show();
        mainWindow.maximize();
      })
      .catch((err) => {
        if (retriesLeft > 0) {
          setTimeout(() => loadURLWithRetry(retriesLeft - 1), 500);
        } else {
          dialog.showErrorBox(
            'Gagal Membuka Layar',
            `Sistem tidak dapat memuat antarmuka pada ${url}.\nDetail: ${err.message}`
          );
        }
      });
  }

  mainWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.loadURL(`http://localhost:${PORT}`);
      }
    }, 1000);
  });

  loadURLWithRetry();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  findFreePort(3000, (freePort) => {
    PORT = freePort;
    startBackend();
    setTimeout(createWindow, 400);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
