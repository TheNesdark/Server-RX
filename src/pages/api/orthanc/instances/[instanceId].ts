import type { APIRoute } from 'astro';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config/orthanc';

export const GET: APIRoute = async ({ params }) => {
  if (!params?.instanceId) {
    return new Response(JSON.stringify({ error: 'instanceId es requerido' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch(`${ORTHANC_URL}/instances/${params.instanceId}`, {
      headers: { 'Authorization': ORTHANC_AUTH }
    });
    
    if (!response.ok) {
      return new Response(null, { status: response.status });
    }
    
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Error parseando JSON en API instances:', jsonError);
      return new Response(JSON.stringify({ error: 'Respuesta inválida del servidor' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error en API instances:', error);
    return new Response(null, { status: 500 });
  }
};
