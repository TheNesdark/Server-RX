import { sincronizarDatos } from './libs/orthanc/Orthanc';
import type { MiddlewareHandler } from 'astro';
import { verifyToken } from '@/libs/auth/auth';

// Estado global para evitar re-inicializaciones por HMR en desarrollo
interface GlobalSyncState {
    isSyncing?: boolean;
    isSyncJobScheduled?: boolean;
}

const globalState = (globalThis as any) as GlobalSyncState;

const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

// Función que ejecuta la sincronización de forma segura
async function runSync() {
    if (globalState.isSyncing) return;
    globalState.isSyncing = true;
    try {
        await sincronizarDatos();
    } catch (error) {
        // Log del error pero no lanzarlo para evitar que afecte el middleware
        console.error('❌ Error en sincronización:', error);
        // No relanzar el error para que el middleware continúe funcionando
    } finally {
        globalState.isSyncing = false;
    }
}

if (!globalState.isSyncJobScheduled) {
    try {
        globalState.isSyncing = false;
        runSync().catch(e => console.error('❌ Error en sincronización inicial:', e));
        setInterval(() => runSync().catch(e => console.error('❌ Error en sincronización periódica:', e)), TWENTY_FOUR_HOURS_IN_MS);
        globalState.isSyncJobScheduled = true;
    } catch (error) {
        console.error('❌ Error configurando sincronización automática:', error);
    }
}

export const onRequest: MiddlewareHandler = async (context, next) => {
    const { url, cookies, redirect } = context;

    // Permitir acceso a login, logout y recursos estáticos (favicon, css, js públicos)
    const isPublicAsset = url.pathname.startsWith('/_astro') || url.pathname.includes('.') || url.pathname === '/favicon.svg';
    const isAuthPage = url.pathname === '/login' || url.pathname === '/logout';

    if (isPublicAsset || isAuthPage) {
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

    let payload;
    try {
        payload = await verifyToken(authToken);
    } catch (err) {
        console.error('❌ Error verificando token:', err);
        cookies.delete('auth_token', { path: '/' });
        if (url.pathname.startsWith('/api/')) {
            return new Response(JSON.stringify({ error: 'Sesión inválida' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        return redirect('/login?error=invalid');
    }

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
