import { sincronizarDatos } from './libs/orthanc/Orthanc';
import type { MiddlewareHandler } from 'astro';
import { verifyToken } from './utils/auth';

// Estado global para evitar re-inicializaciones por HMR en desarrollo
interface GlobalSyncState {
    isSyncing?: boolean;
    isSyncJobScheduled?: boolean;
}

const globalState = (globalThis as any) as GlobalSyncState;

const TWENTY_FOUR_HOURS_IN_MS = 24 * 60 * 60 * 1000;

// Función que ejecuta la sincronización de forma segura
async function runSync() {
    // Previene ejecuciones concurrentes si una sincronización tarda más de 24h
    if (globalState.isSyncing) {
        console.log('🟡 Sincronización ya en progreso. Saltando esta ejecución.');
        return;
    }

    globalState.isSyncing = true;
    console.log('🚀 Iniciando sincronización automática de datos de Orthanc...');
    try {
        await sincronizarDatos();
        console.log(`✅ Sincronización completada. Próxima ejecución programada en 24 horas.`);
    } catch (error) {
        console.error('❌ Error durante la sincronización automática:', error);
    } finally {
        globalState.isSyncing = false;
    }
}

// --- Lógica de inicialización ---
// Esto se ejecuta UNA SOLA VEZ cuando el proceso del servidor arranca.
if (!globalState.isSyncJobScheduled) {
    try {
        globalState.isSyncing = false;

        console.log('🔧 Configurando la tarea de sincronización automática cada 24 horas.');

        // 1. Ejecutamos la sincronización una vez al inicio para tener datos frescos.
        runSync().catch(error => {
            console.error('❌ Error al iniciar la sincronización automática:', error);
        });

        // 2. Configuramos la ejecución periódica cada 24 horas.
        setInterval(() => {
            runSync().catch(error => {
                console.error('❌ Error en sincronización periódica:', error);
            });
        }, TWENTY_FOUR_HOURS_IN_MS);

        // 3. Marcamos como configurado para que no se vuelva a ejecutar.
        globalState.isSyncJobScheduled = true;
    } catch (error) {
        console.error('❌ Error configurando sincronización automática:', error);
    }
}

export const onRequest: MiddlewareHandler = async (context, next) => {
    const { url, cookies, redirect } = context;

    // Permitir acceso a login, logout y recursos estáticos/públicos
    if (
        url.pathname === '/login' || 
        url.pathname === '/logout' ||
        url.pathname.startsWith('/_astro') || 
        url.pathname.includes('.') || 
        url.pathname.startsWith('/api/orthanc')
    ) {
        return next();
    }

    // Verificar JWT
    const authToken = cookies.get('auth_token')?.value;

    if (!authToken) {
        return redirect('/login');
    }

    const payload = await verifyToken(authToken);

    if (!payload) {
        // Token inválido o expirado
        cookies.delete('auth_token', { path: '/' });
        return redirect('/login?error=expired');
    }

    // Guardar información del usuario y la expiración en locals
    context.locals.user = {
        username: payload.username as string,
        exp: payload.exp as number
    };

    return next();
};
