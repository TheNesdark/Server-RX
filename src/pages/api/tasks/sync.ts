import type { APIRoute } from 'astro';
import { sincronizarDatos } from '../../../libs/orthanc/syncData';

export const GET: APIRoute = async ({ request }) => {
  // Verificación básica de seguridad (opcional pero recomendada para Vercel Cron)
  // Vercel envía una cabecera 'Authorization: Bearer ...' si se configura
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('🌐 [Vercel Cron] Iniciando sincronización...');
    await sincronizarDatos();
    return new Response(JSON.stringify({ message: 'Sincronización completada' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ [Vercel Cron] Error:', error);
    return new Response(JSON.stringify({ error: 'Error en la sincronización' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
