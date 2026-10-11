import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister any stale Service Worker in development/preview/GitHub Pages to prevent caching issues and blank screens
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (
    import.meta.env.DEV ||
    window.location.hostname.includes('run.app') ||
    window.location.hostname.includes('github.io') ||
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1')
  ) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().then(() => {
          console.log('[PWA Dev] Unregistered stale service worker for clean preview');
        });
      }
    }).catch(() => {});
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          if (name.includes('jrz-score')) {
            caches.delete(name);
          }
        }
      }).catch(() => {});
    }
  } else if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('[PWA] Service worker registration skipped:', err);
      });
    });
  }
}

// Intercept transient network fetch rejections and HMR send rejections
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (msg.includes("Cannot read properties of undefined (reading 'send')")) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : reason?.message || '';
    if (
      msg.includes("reading 'send'") ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('Load failed') ||
      (event.reason?.name === 'TypeError' && msg.toLowerCase().includes('fetch'))
    ) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

if (typeof window === 'undefined' || !(window as any).__JRZ_ROOT_MOUNTED__) {
  if (typeof window !== 'undefined') {
    (window as any).__JRZ_ROOT_MOUNTED__ = true;
  }
  const rootEl = document.getElementById('root');
  if (rootEl) {
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}
