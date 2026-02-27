import { RateLimiterMemory } from 'rate-limiter-flexible';

// Configuración por defecto
const DEFAULT_POINTS = 5;
const DEFAULT_DURATION = 60; // 1 minuto

// Almacenamos los limitadores creados para reutilizarlos (persisten en la RAM del proceso)
const limiters = new Map<string, RateLimiterMemory>();

/**
 * Obtiene o crea un limitador para una acción específica
 */
const getLimiter = (key: string, points = DEFAULT_POINTS, duration = DEFAULT_DURATION) => {
    if (!limiters.has(key)) {
        limiters.set(key, new RateLimiterMemory({
            points,
            duration,
        }));
    }
    return limiters.get(key)!;
};

/**
 * Consume un punto del rate limit para una clave dada
 * @throws ActionError si se supera el límite
 */
export const checkRateLimit = async (key: string, options?: { points?: number; duration?: number }) => {
    const limiter = getLimiter(key, options?.points, options?.duration);
    try {
        await limiter.consume(key);
    } catch (rejRes: any) {
        const retrySecs = Math.round(rejRes.msBeforeNext / 1000) || 1;
        return {
            allowed: false,
            retryAfter: retrySecs,
        };
    }
    return {
        allowed: true,
        retryAfter: 0,
    };
};

/**
 * Limpia los intentos para una clave dada (ej. tras un login exitoso)
 */
export const clearRateLimit = async (key: string) => {
    const limiter = getLimiter(key);
    await limiter.delete(key);
};

/**
 * Obtiene el identificador del cliente (IP).
 * Prioriza la IP real del socket (proporcionada por Astro) para evitar IP spoofing.
 * Solo usa cf-connecting-ip como segunda opción (solo fiable si hay Cloudflare).
 * No confía en x-forwarded-for ni x-real-ip ya que el cliente puede falsificarlos.
 */
export const getClientIP = (request: Request, clientAddress?: string): string => {
    // Opción más segura: IP real del socket entregada por Astro
    if (clientAddress) return clientAddress;
    // Solo fiable bajo Cloudflare; cualquier cliente puede enviar este header si no hay CF
    return request.headers.get("cf-connecting-ip") ?? "unknown";
};
