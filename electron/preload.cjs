/**
 * Electron Preload Script - JRZ SCORE IPSI 2026
 */
const { contextBridge } = require("electron");

try {
  contextBridge.exposeInMainWorld("__JRZ_DESKTOP_APP__", {
    isDesktopExe: true,
    mode: "OFFLINE_LOCALHOST",
    version: "1.0.0"
  });
} catch {
  // Ignore if contextIsolation is disabled
}
