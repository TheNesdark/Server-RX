const CACHE_PREFIX = 'dicom-cache-';
const SENSITIVE_DICOM_REGEXP = /\/api\/orthanc\/instances\/.*\/(file|preview|rendered)$/;

self.addEventListener('install', (event) => {
  console.log('Service Worker instalado, esperando activación...');
  event.waitUntil(self.skipWaiting()); // Activar inmediatamente al instalar
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith(CACHE_PREFIX)) {
              console.log('Eliminando caché antiguo:', cacheName);
              return caches.delete(cacheName);
            }
            return null;
          })
        );
      });
    })
  );
  console.log('Service Worker activado.');
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (SENSITIVE_DICOM_REGEXP.test(requestUrl.pathname)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch((error) => {
        console.error('Network fetch failed:', error);
        return new Response('Service unavailable', { status: 503 });
      })
    );
  }
});
