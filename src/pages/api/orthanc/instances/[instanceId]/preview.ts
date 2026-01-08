import type { APIRoute } from 'astro';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config/orthanc';

export const GET: APIRoute = async ({ params, url }) => {
  if (!params?.instanceId) {
    return new Response(JSON.stringify({ error: 'instanceId es requerido' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const viewport = url.searchParams.get('viewport') || '256';

  try {
    const response = await fetch(`${ORTHANC_URL}/instances/${params.instanceId}/preview?viewport=${viewport}`, {
      headers: { 'Authorization': ORTHANC_AUTH }
    });
    
    if (!response.ok) {
      return new Response(null, { status: response.status });
    }
    
    const data = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    return new Response(data, {
      headers: { 
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('Error en API preview:', error);
    return new Response(null, { status: 500 });
  }
};
