
import type { MiddlewareHandler } from 'astro';
import { verifyToken } from '@/libs/auth';

export const onRequest: MiddlewareHandler = async (context, next) => {
    const { url, cookies, redirect } = context;

    // 1. Intentar siempre identificar al usuario Admin si existe la cookie
    const authToken = cookies.get('auth_token')?.value;
    if (authToken) {
        const payload = await verifyToken(authToken);
        if (payload && payload.type === 'admin_session') {
            context.locals.user = {
                username: payload.username as string,
                exp: payload.exp as number
            };
        } else {
            // Token inválido o de otro tipo (ej: paciente) en la cookie equivocada
            cookies.delete('auth_token', { path: '/' });
        }
    }

    // 2. Definir rutas públicas y el visor (que maneja su propia auth Lite)
    const publicExtensions = ['.svg', '.css', '.js', '.png', '.jpg', '.jpeg', '.ico', '.webmanifest'];
    const isPublicFile = publicExtensions.some(ext => url.pathname.endsWith(ext));
    const isPublicAsset = url.pathname.startsWith('/_astro') || isPublicFile;
    const isAuthPage = url.pathname === '/login' || url.pathname === '/logout';
    const isViewer = url.pathname.startsWith('/viewer/');
    const isViewerLite = url.pathname.startsWith('/viewer-lite/');
    const isOrthancApi = url.pathname.startsWith('/api/orthanc/');
    const isReport = url.pathname.startsWith('/reports/');

    if (isPublicAsset || isAuthPage || isViewer || isViewerLite || isOrthancApi || isReport) {
        return next();
    }

    // 3. Para todo lo demás (Admin panel, configuracion, etc), exigir login de admin
    if (!context.locals.user) {
        if (url.pathname.startsWith('/api/')) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        return redirect('/login');
    }

    return next();
};
