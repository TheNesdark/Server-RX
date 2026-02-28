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
 * Detrás de Cloudflare Tunnel, la IP real viene en cf-connecting-ip (inyectada por CF,
 * no falsificable desde el cliente). clientAddress es la IP del edge de CF, no del usuario.
 * Sin Cloudflare, usa clientAddress (IP del socket, la más segura).
 */
export const getClientIP = (request: Request, clientAddress?: string): string => {
    // Si la conexión viene de un proxy reverso local (ej: cloudflared), podemos confiar en los headers inyectados
    const isLocal = clientAddress === '127.0.0.1' || clientAddress === '::1' || clientAddress === '::ffff:127.0.0.1';
    
    if (isLocal) {
        const forwardedIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for");
        if (forwardedIp) return forwardedIp.split(',')[0].trim();
    }
    
    // Si la conexión no viene del localhost, los headers HTTP pueden ser falsificados.
    // Usamos el IP real del socket provisto por Astro.
    if (clientAddress) return clientAddress;
    return "unknown";
};
