import type { APIRoute } from 'astro';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config/orthanc';

export const GET: APIRoute = async ({ params }) => {
  try {
    const response = await fetch(`${ORTHANC_URL}/studies/${params.studyId}`, {
      headers: { 'Authorization': ORTHANC_AUTH }
    });
    
    if (!response.ok) {
      return new Response(null, { status: response.status });
    }
    
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=1800' // 30 min de caché privado
      }
    });
  } catch (error) {
    console.error(`Error en API studies ${params.studyId}:`, error);
    return new Response(null, { status: 500 });
  }
};
