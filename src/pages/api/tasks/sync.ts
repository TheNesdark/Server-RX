import type { APIRoute } from 'astro';
import { sincronizarDatos } from '../../../libs/orthanc/syncData';
import { log } from '@nanostores/logger';

export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  const userAgent = request.headers.get('user-agent');
  const cronSecret = process.env.CRON_SECRET || import.meta.env.CRON_SECRET;

  // Verificación de Vercel Cron (User-Agent estándar de Vercel)
  const isVercelCron = userAgent === 'vercel-cron/1.0';

  // Forzar salida a consola usando stdout directamente (evita buffering)
  process.stdout.write(`\n[${new Date().toISOString()}] --- PETICIÓN RECIBIDA EN /api/tasks/sync ---\n`);
  process.stdout.write(`Authorization Header: ${authHeader ? 'Presente' : 'NULO (Filtrado por túnel)'}\n`);
  process.stdout.write(`User-Agent: ${userAgent}\n`);

  // Validación flexible: si es Vercel Cron y estamos en desarrollo/preview, permitimos aunque el túnel borre el header
  const isAuthorized = 
    (cronSecret && authHeader === `Bearer ${cronSecret}`) || 
    (isVercelCron && process.env.NODE_ENV !== 'production');

  if (!isAuthorized && cronSecret) {
    process.stdout.write(`❌ ERROR: No autorizado. El túnel de GitHub Codespaces está eliminando la cabecera Authorization.\n`);
    return new Response(JSON.stringify({ 
      error: 'No autorizado',
      message: 'Cabecera filtrada por el proxy del túnel'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    process.stdout.write(`🔄 Iniciando sincronización de datos...\n`);
    await sincronizarDatos();
    process.stdout.write(`✅ Sincronización finalizada con éxito.\n`);
    
    return new Response(JSON.stringify({ message: 'Sincronización completada' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    process.stdout.write(`❌ ERROR durante sincronización: ${error}\n`);
    return new Response(JSON.stringify({ error: 'Error en la sincronización' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
