/**
 * Devuelve true si el error proviene de una respuesta HTTP con el código dado.
 * Útil para suprimir logs de errores esperados (ej. 404 de IDs inexistentes).
 */
export const isHttpError = (error: unknown, status: number): boolean =>
  error instanceof Error && error.message.includes(String(status));

/**
 * Maneja errores de Orthanc suprimiendo todos los esperados:
 * códigos HTTP (1xx-5xx), errores de red (ECONNREFUSED, ETIMEDOUT, etc.).
 * Solo loguea errores verdaderamente inesperados (bugs de programación).
 *
 * @param error  El error capturado en el catch.
 * @param context Texto opcional que aparece como prefijo en el log.
 */
export const logOrthancError = (error: unknown, context?: string): void => {
  if (!(error instanceof Error)) return;
  const msg = error.message;
  if (
    /\b[1-5]\d{2}\b/.test(msg)        ||  // cualquier código HTTP (404, 500…)
    msg.includes('ECONNREFUSED')       ||  // servidor caído
    msg.includes('ECONNRESET')         ||  // conexión cortada
    msg.includes('ETIMEDOUT')          ||  // timeout
    msg.includes('EHOSTUNREACH')       ||  // host inalcanzable
    msg.includes('fetch failed')       ||  // error genérico de fetch
    msg.includes('network')                // error de red genérico
  ) return;
  console.error(context ? `[Orthanc] ${context}:` : '[Orthanc] Error inesperado:', error);
};

export const assertAuthorizedJson = (hasUser: boolean): Response | null => {
  if (!hasUser) {
    return new Response(JSON.stringify({ error: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
};

export const createUnauthorizedTextResponse = (): Response => {
  return new Response("No autorizado", {
    status: 401,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
};