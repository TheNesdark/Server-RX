import type { APIRoute } from 'astro';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config/orthanc';

export const GET: APIRoute = async ({ params }) => {
  const studyID = params.studyId

  if (!studyID) { 
    return new Response("Se requiere un studyID", { status: 400 });
  }
  try {
    const response = await fetch(`${ORTHANC_URL}/studies/${studyID}`, {
      headers: { 'Authorization': ORTHANC_AUTH }
    });
    
    if (!response.ok) {
      throw new Error(response.statusText)
    }
    
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=1800' // 30 min de caché privado
      }
    });
  } catch (error) {
    console.error(`Error en API studies ${studyID}:`, error);
    return new Response("Error en la api", { status: 500 });
  }
};
