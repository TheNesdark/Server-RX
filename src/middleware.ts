
import type { MiddlewareHandler } from 'astro';
import { verifyToken } from '@/libs/auth';

export const onRequest: MiddlewareHandler = async (context, next) => {
    const { url, cookies, redirect } = context;

    // Permitir acceso a login, logout y recursos estáticos (favicon, css, js públicos)
    const isPublicAsset = url.pathname.startsWith('/_astro') || url.pathname.includes('.') || url.pathname === '/favicon.svg';
    const isAuthPage = url.pathname === '/login' || url.pathname === '/logout';
    
    // Permitir acceso al viewer lite y sus recursos de imagen sin sesión iniciada
    const isViewerLite = url.pathname.startsWith('/viewer-lite/');
    const isLiteApi = url.pathname.startsWith('/api/orthanc/instances/') && (url.pathname.endsWith('/preview') || url.pathname.endsWith('/rendered'));
    const isCronTask = url.pathname === '/api/tasks/sync';

    if (isPublicAsset || isAuthPage || isViewerLite || isLiteApi || isCronTask) {
        return next();
    }

    // Verificar JWT para todas las demás rutas, incluyendo /api/orthanc
    const authToken = cookies.get('auth_token')?.value;

    if (!authToken) {
        // Si es una petición API, devolver 401 en lugar de redirigir
        if (url.pathname.startsWith('/api/')) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        return redirect('/login');
    }

    const payload = await verifyToken(authToken);

    if (!payload) {
        cookies.delete('auth_token', { path: '/' });
        if (url.pathname.startsWith('/api/')) {
            return new Response(JSON.stringify({ error: 'Sesión expirada' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        return redirect('/login?error=expired');
    }

    context.locals.user = {
        username: payload.username as string,
        exp: payload.exp as number
    };

    return next();
};
