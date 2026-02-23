// ─── Versión de caché ────────────────────────────────────────────────────────
// Incrementar CACHE_VERSION fuerza la eliminación de cachés antiguas en el
// próximo activate y obliga a los clientes a descargar el nuevo SW.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `dicom-cache-${CACHE_VERSION}`;

// Archivos DICOM y sus renders: inmutables una vez almacenados en Orthanc.
// Estrategia: cache-first → si hay respuesta en caché se sirve directamente,
// de lo contrario se descarga, se guarda y se retorna.
const IMMUTABLE_REGEXP = /\/api\/orthanc\/instances\/[^/]+\/(file|preview|rendered)$/;

// Metadatos de series y estudios: pueden actualizarse (nuevas instancias, etc.).
// Estrategia: network-first → se intenta la red; si falla se sirve desde caché.
const METADATA_REGEXP = /\/api\/orthanc\/(series|studies)\/[^/]+$/;

// ─── Ciclo de vida ────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  // Activar el nuevo SW sin esperar a que los clientes anteriores cierren.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Tomar el control de todos los clientes abiertos de inmediato.
      clients.claim(),
      // Eliminar versiones de caché anteriores.
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith('dicom-cache-') && n !== CACHE_NAME)
            .map((n) => caches.delete(n)),
        ),
      ),
    ]),
  );
});

// ─── Mensajes desde la aplicación ────────────────────────────────────────────

self.addEventListener('message', (event) => {
  // { type: 'CLEAR_CACHE' }
  // Elimina TODA la caché DICOM activa (p.ej. al forzar una recarga de series).
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        event.source?.postMessage({ type: 'CACHE_CLEARED' });
      }),
    );
  }
});

// ─── Interceptación de peticiones ────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (IMMUTABLE_REGEXP.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (METADATA_REGEXP.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }
});

// ─── Estrategias de caché ─────────────────────────────────────────────────────

/**
 * Cache-first: devuelve la respuesta cacheada si existe; si no, descarga,
 * guarda en caché y devuelve. Óptimo para recursos inmutables (archivos DICOM).
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    // cache: 'no-cache' respeta las cabeceras HTTP y evita desactivar por completo
    // la caché del navegador, manteniendo la estrategia de cache del SW.
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Service unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network-first: intenta la red; si falla devuelve la copia cacheada.
 * Óptimo para metadatos que pueden cambiar pero queremos offline-fallback.
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response('Service unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}
