const CACHE_NAME = 'dicom-cache-v1';
// CORRECCIÓN: Ajustamos la expresión regular para que coincida con la ruta real de la API
const DICOM_REGEXP = /\/api\/orthanc\/instances\/.*\/file/;
const ALLOWED_ORIGINS = [self.location.origin];

// Función para validar el origen de la petición
function isValidOrigin(request) {
  const referer = request.headers.get('referer');
  // Si no hay referer, o si la petición es del mismo origen del service worker, asumimos que es válida
  if (!referer || new URL(request.url).origin === self.location.origin) return true;
  
  try {
    const refererOrigin = new URL(referer).origin;
    return ALLOWED_ORIGINS.includes(refererOrigin);
  } catch {
    return false;
  }
}

self.addEventListener('install', (event) => {
  console.log('Service Worker instalado, esperando activación...');
  event.waitUntil(self.skipWaiting()); // Activar inmediatamente al instalar
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      // Limpiar caches antiguos si los hubiera
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
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

  // Solo cacheamos las peticiones a archivos DICOM con origen válido
  if (DICOM_REGEXP.test(request.url) && isValidOrigin(request)) {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.match(request)
            .then((response) => {
              // Si ya está en cache, lo devolvemos
              if (response) {
                return response;
              }

              // Si no está en cache, hacemos la petición a la red
              return fetch(request)
                .then((networkResponse) => {
                  // Guardamos la respuesta en cache y la devolvemos
                  if (networkResponse.ok) {
                    const responseToCache = networkResponse.clone();
                    cache.put(request, responseToCache)
                      .catch((error) => {
                        console.warn('Error caching response:', error);
                      });
                  }
                  return networkResponse;
                })
                .catch((error) => {
                  console.error('Network fetch failed:', error);
                  return new Response('Network error', { status: 503 });
                });
            })
            .catch((error) => {
              console.error('Cache match failed, attempting network fetch:', error);
              return fetch(request).catch(() => new Response('Service unavailable', { status: 503 }));
            });
        })
        .catch((error) => {
          console.error('Cache open failed, attempting network fetch:', error);
          return fetch(request).catch(() => new Response('Service unavailable', { status: 503 }));
        })
    );
  }
});
