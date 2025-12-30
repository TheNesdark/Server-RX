const CACHE_NAME = 'dicom-cache-v1';
const DICOM_REGEXP = /\/orthanc\/instances\/.*\/file/;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo cacheamos las peticiones a archivos DICOM
  if (DICOM_REGEXP.test(request.url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((response) => {
          // Si ya está en cache, lo devolvemos
          if (response) {
            // console.log('Serving from cache:', request.url);
            return response;
          }

          // Si no está, hacemos la petición y guardamos el resultado
          return fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              // Es importante clonar la respuesta porque solo se puede usar una vez
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
  }
});
