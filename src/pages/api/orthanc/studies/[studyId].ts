import type { APIRoute } from 'astro';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config/orthanc';

export const GET: APIRoute = async ({ params }) => {
  if (!params?.studyId) {
    return new Response(JSON.stringify({ error: 'studyId es requerido' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch(`${ORTHANC_URL}/studies/${params.studyId}`, {
      headers: { 'Authorization': ORTHANC_AUTH }
    });
    
    if (!response.ok) {
      return new Response(null, { status: response.status });
    }
    
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Error parseando JSON en API studies:', jsonError);
      return new Response(JSON.stringify({ error: 'Respuesta inválida del servidor' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=1800' // 30 min de caché privado
      }
    });
  } catch (error) {
    const studyId = params?.studyId || 'desconocido';
    console.error(`Error en API studies ${studyId}:`, error);
    return new Response(null, { status: 500 });
  }
};
