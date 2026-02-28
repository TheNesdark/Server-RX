// ─── Versión de caché ────────────────────────────────────────────────────────
// Incrementar CACHE_VERSION fuerza la eliminación de cachés antiguas en el
// próximo activate y obliga a los clientes a descargar el nuevo SW.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `dicom-cache-${CACHE_VERSION}`;

// Archivos DICOM y sus renders: inmutables una vez almacenados en Orthanc.
// Estrategia: cache-first → si hay respuesta en caché se sirve directamente,
// de lo contrario se descarga, se guarda y se retorna.
const IMMUTABLE_REGEXP = /\/api\/orthanc\/instances\/[^/]+\/(file|preview|rendered)$/;

// TTL de la caché DICOM: debe coincidir con el maxAge del cookie auth_patient_*
// 4 horas en milisegundos — cuando expira, el SW borra la entrada y vuelve a la red.
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;
// Header interno usado para registrar cuándo expira cada entrada cacheada.
const CACHE_EXPIRES_HEADER = 'x-sw-cache-expires';

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
 * Cache-first con TTL: devuelve la respuesta cacheada si existe y no ha expirado.
 * Si expiró o no existe, descarga, guarda con timestamp de expiración y retorna.
 * Óptimo para archivos DICOM: inmutables en Orthanc pero con acceso temporal.
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    const expiresAt = parseInt(cached.headers.get(CACHE_EXPIRES_HEADER) || '0', 10);
    // Si el TTL no ha expirado, servir desde caché directamente
    if (expiresAt && Date.now() < expiresAt) {
      return cached;
    }
    // TTL expirado: eliminar entrada obsoleta para forzar re-descarga autenticada
    await cache.delete(request);
  }

  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok) {
      // Clonar la respuesta añadiendo el header de expiración antes de cachear
      const headers = new Headers(response.headers);
      headers.set(CACHE_EXPIRES_HEADER, String(Date.now() + CACHE_TTL_MS));
      const bodyBuffer = await response.arrayBuffer();
      const responseToCache = new Response(bodyBuffer, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, responseToCache);
      // Retornar una segunda copia fresca (la original ya fue consumida)
      return new Response(bodyBuffer, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
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
 * Network-first con TTL: intenta la red; si falla devuelve la copia cacheada
 * siempre que no haya expirado. Óptimo para metadatos que pueden cambiar pero
 * queremos offline-fallback. El TTL impide servir datos médicos obsoletos.
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set(CACHE_EXPIRES_HEADER, String(Date.now() + CACHE_TTL_MS));
      const bodyBuffer = await response.arrayBuffer();
      cache.put(request, new Response(bodyBuffer, {
        status: response.status,
        statusText: response.statusText,
        headers,
      }));
      return new Response(bodyBuffer, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const expiresAt = parseInt(cached.headers.get(CACHE_EXPIRES_HEADER) || '0', 10);
      if (expiresAt && Date.now() < expiresAt) return cached;
      // Caché expirada: no servir datos médicos obsoletos sin autenticación
      await cache.delete(request);
    }
    return new Response('Service unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}
