import type { APIRoute } from 'astro';
import { sincronizarDatos } from '@/libs/orthanc';


export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Acceso no autorizado", { status: 401 });
  }

  try {
    await sincronizarDatos();
    return new Response("Sincronización completada con éxito", { status: 200 });
  } catch (error) {
    return new Response(`Error durante la sincronización`, { status: 500 });
  }
};
