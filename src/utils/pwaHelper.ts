/**
 * PWA and Desktop Installation Helper for JRZ SCORE (Digital Scoring Tanding)
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global hook listener for beforeinstallprompt
let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const listeners: Array<(prompt: BeforeInstallPromptEvent | null) => void> = [];

export function initPWA() {
  if (typeof window === 'undefined') return;

  // Capture install prompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((cb) => cb(deferredInstallPrompt));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    listeners.forEach((cb) => cb(null));
  });
}

export function subscribeInstallPrompt(cb: (prompt: BeforeInstallPromptEvent | null) => void) {
  listeners.push(cb);
  cb(deferredInstallPrompt);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredInstallPrompt;
}

export async function promptPWAInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
  if (!deferredInstallPrompt) {
    return 'unsupported';
  }
  try {
    await deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      deferredInstallPrompt = null;
      listeners.forEach((cb) => cb(null));
    }
    return choice.outcome;
  } catch (err) {
    console.error('Error triggering install prompt:', err);
    return 'unsupported';
  }
}

export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

export function detectUserPlatform(): 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'other' {
  if (typeof window === 'undefined') return 'windows';
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac') && !ua.includes('iphone') && !ua.includes('ipad')) return 'mac';
  if (ua.includes('linux') && !ua.includes('android')) return 'linux';
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
  return 'windows';
}

export function detectBrowser(): 'chrome' | 'edge' | 'safari' | 'firefox' | 'opera' | 'brave' | 'other' {
  if (typeof window === 'undefined') return 'chrome';
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'opera';
  if (ua.includes('brave')) return 'brave';
  if (ua.includes('chrome')) return 'chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('firefox')) return 'firefox';
  return 'chrome';
}

/**
 * Downloads a direct Windows Desktop Launcher (.URL) file
 */
export function downloadWindowsDesktopShortcut() {
  const currentUrl = window.location.href;
  const content = `[InternetShortcut]\nURL=${currentUrl}\nIconIndex=0\nIconFile=/jrzscoreutama.ico\n`;
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'JRZ SCORE - Digital Scoring Tanding.url';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a Linux Desktop Shortcut (.desktop) file
 */
export function downloadLinuxDesktopShortcut() {
  const currentUrl = window.location.href;
  const content = `[Desktop Entry]\nVersion=1.0\nType=Link\nName=JRZ SCORE Tanding\nComment=Digital Scoring Pencak Silat Kategori Tanding (IPSI 2026 & PERSILAT)\nURL=${currentUrl}\nIcon=applications-games\nTerminal=false\n`;
  const blob = new Blob([content], { type: 'application/x-desktop' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'JRZ_Score_Tanding.desktop';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
