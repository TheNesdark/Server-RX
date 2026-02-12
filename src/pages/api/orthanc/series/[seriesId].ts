import type { APIRoute } from 'astro';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config';
import { checkApiAuth } from '@/utils/auth';

export const GET: APIRoute = async ({ params, cookies }) => {
  const serieID = params.seriesId

  if (!serieID) {
    return new Response("Se requiere un seriesID", { status: 400 });
  }

  try {
    const isAuthorized = await checkApiAuth(serieID, cookies, 'series');

    if (!isAuthorized) {
        return new Response("No autorizado", { status: 401 });
    }

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
        'Cache-Control': 'private, no-store, max-age=0',
        'Pragma': 'no-cache',
        'Vary': 'Cookie'
      }
    });
  } catch (error) {
    console.error(`Error en API series ${serieID}:`, error);
    return new Response("Error en la api", { status: 500 });
  }
};
