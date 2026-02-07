import type { APIRoute } from 'astro';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config';
import { checkApiAuth } from '@/utils/auth';

export const GET: APIRoute = async ({ params, cookies }) => {
  const instanceid = params.instanceId;

  if (!instanceid) {
    return new Response("Se requiere un instanceID", { status: 400 });
  }

  try {
    const isAuthorized = await checkApiAuth(instanceid, cookies);

    if (!isAuthorized) {
        return new Response("No autorizado", { status: 401 });
    }

    const response = await fetch(`${ORTHANC_URL}/instances/${instanceid}/preview`, {
      headers: { 'Authorization': ORTHANC_AUTH }
    });
    
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    
    const data = await response.arrayBuffer();
    
    return new Response(data, {
      headers: { 
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('Error en API preview:', error);
    return new Response("Error en la api", { status: 500 });
  }
};
