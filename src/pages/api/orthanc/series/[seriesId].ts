import type { APIRoute } from 'astro';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config/orthanc';

export const GET: APIRoute = async ({ params }) => {
  const serieID = params.seriesId

  if (!serieID) {
    return new Response("Se requiere un seriesID", { status: 400 });
  }

  try {
    const response = await fetch(`${ORTHANC_URL}/series/${serieID}`, {
      headers: { 'Authorization': ORTHANC_AUTH }
    });
    
    if (!response.ok) {
      throw new Error(response.statusText)
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=3600' // 1 hora de caché privado
      }
    });
  } catch (error) {
    console.error(`Error en API series ${serieID}:`, error);
    return new Response("Error en la api", { status: 500 });
  }
};
