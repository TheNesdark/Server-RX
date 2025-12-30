const CACHE_NAME = 'dicom-cache-v1';
const DICOM_REGEXP = /\/orthanc\/instances\/.*\/file/;
const ALLOWED_ORIGINS = [self.location.origin];

// Función para validar el origen de la petición
function isValidOrigin(request) {
  const referer = request.headers.get('referer');
  if (!referer) return false;
  
  try {
    const refererOrigin = new URL(referer).origin;
    return ALLOWED_ORIGINS.includes(refererOrigin);
  } catch {
    return false;
  }
}

self.addEventListener('install', (event) => {
  // Esperar a que se cierre la pestaña actual para evitar activación inmediata
  console.log('Service Worker instalado, esperando activación...');
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
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

              // Si no está, hacemos la petición y guardamos el resultado
              return fetch(request)
                .then((networkResponse) => {
                  if (networkResponse.status === 200) {
                    try {
                      cache.put(request, networkResponse.clone());
                    } catch (error) {
                      console.warn('Error caching response:', error);
                    }
                  }
                  return networkResponse;
                })
                .catch((error) => {
                  console.error('Network fetch failed:', error);
                  return new Response('Network error', { status: 503 });
                });
            })
            .catch((error) => {
              console.error('Cache match failed:', error);
              return fetch(request).catch(() => new Response('Service unavailable', { status: 503 }));
            });
        })
        .catch((error) => {
          console.error('Cache open failed:', error);
          return fetch(request).catch(() => new Response('Service unavailable', { status: 503 }));
        })
    );
  }
});
