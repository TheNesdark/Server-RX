import type { MiddlewareHandler } from 'astro';
import { verifyToken } from '@/libs/auth';

/** Añade cabeceras de seguridad HTTP a cualquier respuesta */
function addSecurityHeaders(response: Response): Response {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
        'Content-Security-Policy',
        [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob:",
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
        ].join('; ')
    );
    return response;
}

export const onRequest: MiddlewareHandler = async (context, next) => {
    const { url, cookies, redirect } = context;

    // 1. Intentar identificar al usuario Admin mediante el token de sesión
    const authToken = cookies.get('auth_token')?.value;
    if (authToken) {
        const payload = await verifyToken(authToken);
        if (payload && payload.type === 'admin_session') {
            context.locals.user = {
                username: payload.username as string,
                exp: payload.exp as number
            };
        } else {
            cookies.delete('auth_token', { path: '/' });
        }
    }

    // 2. Definir rutas que no requieren autenticación de administrador
    const isAuthPage = url.pathname === '/login' || url.pathname === '/logout';
    const isViewer = url.pathname.startsWith('/viewer/');
    const isViewerLite = url.pathname.startsWith('/viewer-lite/');
    const isOrthancApi = url.pathname.startsWith('/api/orthanc/');
    const isReport = url.pathname.startsWith('/reports/');

    // Bloquear acceso directo a archivos sensibles de la raíz (defensa en producción)
    const BLOCKED_FILES = ['/config.json', '/sea-config.json', '/.env', '/README.md', '/readme.md'];
    if (BLOCKED_FILES.includes(url.pathname)) {
        return new Response(null, { status: 404 });
    }

    // P7: Siempre pasamos por una variable para poder añadir headers de seguridad
    let response: Response;

    if (isAuthPage || isViewer || isViewerLite || isOrthancApi || isReport) {
        response = await next();
    } else if (!context.locals.user) {
        // 3. Exigir login de administrador para el resto de las rutas protegidas
        if (url.pathname.startsWith('/api/')) {
            response = new Response(
                JSON.stringify({ error: 'No autorizado' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        } else {
            response = redirect('/login');
        }
    } else {
        response = await next();
    }

    return addSecurityHeaders(response);
};