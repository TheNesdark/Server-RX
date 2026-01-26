import type { APIRoute } from 'astro';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config/orthanc';

export const GET: APIRoute = async ({ params }) => {
  const instanceid = params.instanceId;

  if (!instanceid) {
    return new Response("Se requiere un instanceID", { status: 400 });
  }

  try {
    const response = await fetch(`${ORTHANC_URL}/instances/${instanceid}/file`, {
      headers: { 'Authorization': ORTHANC_AUTH }
    });
    
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    
    const data = await response.arrayBuffer();
    
    return new Response(data, {
      headers: { 
        'Content-Type': 'application/dicom',
        'Cache-Control': 'public, max-age=31536000, immutable' // 1 año de caché
      }
    });
  } catch (error) {
    console.error(`Error en API file para instancia ${params.instanceId}:`, error);
    return new Response("Error en la api", { status: 500 });
  }
};
