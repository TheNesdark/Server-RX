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

    const response = await fetch(`${ORTHANC_URL}/instances/${instanceid}`, {
      headers: { 'Authorization': ORTHANC_AUTH }
    });
    
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error en API instances:', error);
    return new Response("Error en la api", { status: 500 });
  }
};
