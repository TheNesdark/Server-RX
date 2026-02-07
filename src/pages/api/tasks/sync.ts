import type { APIRoute } from 'astro';
import { sincronizarDatos } from '@/libs/orthanc';


export const GET: APIRoute = async () => {
  try {
    await sincronizarDatos();
    return new Response("Sincronización completada con éxito", { status: 200 });
  } catch (error) {
    return new Response(`Error durante la sincronización`, { status: 500 });
  }
};
