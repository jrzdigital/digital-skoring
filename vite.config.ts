import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const isGitHubBuild =
    mode === 'github' ||
    process.env.VITE_INDEX_MODE === 'github' ||
    process.env.GITHUB_ACTIONS === 'true';
  const isPureOfflineBuild =
    mode === 'offline' || process.env.VITE_INDEX_MODE === 'offline';

  return {
    base: './',
    plugins: [
      {
        name: 'dual-index-selector',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            try {
              if (isPureOfflineBuild) {
                const offlineHtmlPath = path.resolve(process.cwd(), 'index.offline.html');
                if (fs.existsSync(offlineHtmlPath)) {
                  return fs.readFileSync(offlineHtmlPath, 'utf-8');
                }
              } else if (isGitHubBuild) {
                const githubHtmlPath = path.resolve(process.cwd(), 'index.github.html');
                if (fs.existsSync(githubHtmlPath)) {
                  return fs.readFileSync(githubHtmlPath, 'utf-8');
                }
              }
            } catch {
              // fallback to default index.html
            }
            return html;
          },
        },
      },
      {
        name: 'guard-hmr',
        configureServer(server) {
          const noop = () => {};
          if (!server.ws) {
            server.ws = {
              send: noop,
              on: noop,
              off: noop,
              close: noop,
              listen: noop,
              clients: new Set(),
            } as any;
          } else if (!server.ws.send) {
            server.ws.send = noop;
          }
          if (!server.hot) {
            server.hot = {
              send: noop,
              on: noop,
              off: noop,
              close: noop,
              listen: noop,
              addChannel: noop,
              channels: [] as any,
            } as any;
          } else if (!server.hot.send) {
            server.hot.send = noop;
          }
        },
      },
      react(),
      tailwindcss(),
      {
        name: 'sync-gh-pages-bundle',
        async closeBundle() {
          try {
            const distDir = path.resolve(process.cwd(), 'dist');
            const distAssetsDir = path.resolve(distDir, 'assets');
            const outBundleDir = path.resolve(process.cwd(), 'public/gh-bundle');
            const distBundleDir = path.resolve(distDir, 'gh-bundle');
            if (!fs.existsSync(distAssetsDir)) return;

            fs.mkdirSync(outBundleDir, { recursive: true });
            fs.mkdirSync(distBundleDir, { recursive: true });

            const files = fs.readdirSync(distAssetsDir);
            const jsFile = files.find((f) => f.endsWith('.js'));
            const cssFile = files.find((f) => f.endsWith('.css'));

            let jsContent = '';
            let cssContent = '';

            if (jsFile) {
              jsContent = fs.readFileSync(path.join(distAssetsDir, jsFile), 'utf-8');
              fs.writeFileSync(path.join(outBundleDir, 'app.js'), jsContent);
              fs.writeFileSync(path.join(distBundleDir, 'app.js'), jsContent);
            }
            if (cssFile) {
              cssContent = fs.readFileSync(path.join(distAssetsDir, cssFile), 'utf-8');
              fs.writeFileSync(path.join(outBundleDir, 'app.css'), cssContent);
              fs.writeFileSync(path.join(distBundleDir, 'app.css'), cssContent);
            }

            // Generate compiled dist/index.offline.html and dist/index.github.html variants
            const injectCompiledAssets = (rawTemplate: string) => {
              let out = rawTemplate;
              if (cssFile) {
                out = out.replace(
                  '</head>',
                  `    <link rel="stylesheet" crossorigin href="./assets/${cssFile}">\n  </head>`,
                );
              }
              if (jsFile) {
                out = out.replace(
                  /<script\s+type="module"\s+src="\/src\/main\.tsx"[^>]*><\/script>/,
                  `<script type="module" crossorigin src="./assets/${jsFile}"></script>`,
                );
              }
              return out;
            };

            const offlinePath = path.resolve(process.cwd(), 'index.offline.html');
            if (fs.existsSync(offlinePath)) {
              const rawOffline = fs.readFileSync(offlinePath, 'utf-8');
              fs.writeFileSync(
                path.join(distDir, 'index.offline.html'),
                injectCompiledAssets(rawOffline),
                'utf-8',
              );
            }

            const githubPath = path.resolve(process.cwd(), 'index.github.html');
            if (fs.existsSync(githubPath)) {
              const rawGithub = fs.readFileSync(githubPath, 'utf-8');
              fs.writeFileSync(
                path.join(distDir, 'index.github.html'),
                injectCompiledAssets(rawGithub),
                'utf-8',
              );
            }

            // Only push static bundle to Firebase RTDB when in GitHub/cloud build mode with short timeout
            if (jsContent && isGitHubBuild) {
              try {
                const rtdbUrl =
                  process.env.VITE_FIREBASE_DATABASE_URL ||
                  'https://jrz-score-default-rtdb.asia-southeast1.firebasedatabase.app';
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 2500);
                await fetch(`${rtdbUrl.replace(/\/$/, '')}/__jrz_static_bundle.json`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    css: cssContent,
                    js: jsContent,
                    updatedAt: Date.now(),
                  }),
                  signal: controller.signal,
                });
                clearTimeout(timer);
              } catch {
                // Ignore network errors in offline environments
              }
            }
          } catch (err) {
            console.warn('Failed to sync gh-bundle:', err);
          }
        },
      },
    ],
    build: {
      assetsInlineLimit: 1500000,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
        'jspdf',
        'jspdf-autotable',
        'xlsx',
        'qrcode',
        'firebase/app',
        'firebase/auth',
        'firebase/database',
      ],
    },
    server: {
      hmr: false,
      watch: null,
    },
  };
});
