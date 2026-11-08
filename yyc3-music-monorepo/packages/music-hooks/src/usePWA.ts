import { useState, useEffect, useCallback, useRef } from 'react';

// ==========================================
// PWA Detection & Install Prompt
// ==========================================
export interface PWAState {
  isStandalone: boolean;
  isOnline: boolean;
  canInstall: boolean;
  isIOS: boolean;
  isMobile: boolean;
  installApp: () => Promise<void>;
  dismissInstall: () => void;
  showInstallHint: boolean;
}

export function usePWA(): PWAState {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [canInstall, setCanInstall] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  // Detect standalone (installed PWA)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  // Detect mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;

  // ---- Inject PWA meta tags ----
  useEffect(() => {
    const metas: Array<{ name?: string; content: string; property?: string }> = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'D-Music' },
      { name: 'theme-color', content: '#0A0E2F' },
      { name: 'mobile-web-app-capable', content: 'yes' },
    ];

    const created: HTMLMetaElement[] = [];
    metas.forEach(({ name, content }) => {
      if (name && !document.querySelector(`meta[name="${name}"]`)) {
        const el = document.createElement('meta');
        el.name = name;
        el.content = content;
        document.head.appendChild(el);
        created.push(el);
      }
    });

    // Inject web app manifest dynamically
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = {
        name: 'D-Music',
        short_name: 'D-Music',
        description: '沉浸式智能音乐生态系统 | Immersive Intelligent Music Ecosystem',
        start_url: '/',
        display: 'standalone',
        background_color: '#0A0E2F',
        theme_color: '#0A0E2F',
        orientation: 'portrait-primary',
        categories: ['music', 'entertainment'],
        icons: [
          { src: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' },
        ],
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      const manifestUrl = URL.createObjectURL(blob);
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = manifestUrl;
      document.head.appendChild(link);
    }

    // Prevent viewport zoom on input focus (mobile)
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }

    return () => {
      created.forEach((el) => el.remove());
    };
  }, []);

  // ---- Online / Offline ----
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ---- Install prompt (Android / Desktop Chrome) ----
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ---- §10.x Enhanced Service Worker for offline caching ----
  // Three-tier caching strategy:
  //   1. Static assets (js/css/fonts/images) → Cache-first (fast loads)
  //   2. Navigation (HTML) → Network-first with offline fallback
  //   3. API calls → Network-only (skip cache)
  // Version-based cache invalidation on SW update.
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swCode = `
        const CACHE_VERSION = 'v2';
        const STATIC_CACHE = 'd-music-static-' + CACHE_VERSION;
        const PAGES_CACHE  = 'd-music-pages-' + CACHE_VERSION;
        const ALL_CACHES = [STATIC_CACHE, PAGES_CACHE];

        // Static asset extensions eligible for cache-first
        const STATIC_EXT = /\\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|webp|avif|svg|ico|gif)$/i;

        self.addEventListener('install', (event) => {
          event.waitUntil(
            caches.open(PAGES_CACHE).then((cache) => cache.addAll(['/']))
          );
          self.skipWaiting();
        });

        self.addEventListener('activate', (event) => {
          event.waitUntil(
            caches.keys().then((names) =>
              Promise.all(
                names
                  .filter((name) => name.startsWith('d-music-') && !ALL_CACHES.includes(name))
                  .map((name) => caches.delete(name))
              )
            )
          );
          self.clients.claim();
        });

        self.addEventListener('fetch', (event) => {
          const { request } = event;
          const url = new URL(request.url);

          // Skip: non-GET, cross-origin, API calls
          if (request.method !== 'GET') return;
          if (url.origin !== self.location.origin) return;
          if (url.pathname.includes('/functions/') || url.pathname.includes('/rest/')) return;

          // Strategy 1: Cache-first for static assets (immutable hashed filenames)
          if (STATIC_EXT.test(url.pathname)) {
            event.respondWith(
              caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                  if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
                  }
                  return response;
                });
              })
            );
            return;
          }

          // Strategy 2: Network-first for navigation / HTML
          event.respondWith(
            fetch(request)
              .then((response) => {
                if (response && response.status === 200 && response.type === 'basic') {
                  const clone = response.clone();
                  caches.open(PAGES_CACHE).then((cache) => cache.put(request, clone));
                }
                return response;
              })
              .catch(() =>
                caches.match(request).then((cached) =>
                  cached || caches.match('/').then((fallback) =>
                    fallback || new Response('Offline — D-Music', {
                      status: 503,
                      headers: { 'Content-Type': 'text/html' },
                    })
                  )
                )
              )
          );
        });
      `;

      try {
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        navigator.serviceWorker.register(swUrl, { scope: '/' }).catch(() => {
          // Blob URL SW registration may fail in some environments — that's fine
        });
      } catch {
        // Silently fail if SW registration is not supported
      }
    }
  }, []);

  // ---- Auto-show install hint after 30s for non-installed mobile ----
  useEffect(() => {
    if (isStandalone) return;
    if (!isMobile) return;
    const dismissed = sessionStorage.getItem('d-music-install-dismissed');
    if (dismissed) return;

    const timer = setTimeout(() => {
      setShowInstallHint(true);
    }, 30000);
    return () => clearTimeout(timer);
  }, [isStandalone, isMobile]);

  const installApp = useCallback(async () => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;
      if (outcome === 'accepted') {
        setCanInstall(false);
        setShowInstallHint(false);
      }
      deferredPromptRef.current = null;
    }
  }, []);

  const dismissInstall = useCallback(() => {
    setShowInstallHint(false);
    sessionStorage.setItem('d-music-install-dismissed', '1');
  }, []);

  return {
    isStandalone,
    isOnline,
    canInstall,
    isIOS,
    isMobile,
    installApp,
    dismissInstall,
    showInstallHint,
  };
}