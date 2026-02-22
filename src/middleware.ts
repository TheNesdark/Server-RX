import type { MiddlewareHandler } from 'astro';
import { verifyToken } from '@/libs/auth';

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

    if (isAuthPage || isViewer || isViewerLite || isOrthancApi || isReport) {
        return next();
    }

    // 3. Exigir login de administrador para el resto de las rutas protegidas
    if (!context.locals.user) {
        if (url.pathname.startsWith('/api/')) {
            return new Response(
                JSON.stringify({ error: 'No autorizado' }), 
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }
        return redirect('/login');
    }

    return next();
};