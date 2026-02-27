import type { APIRoute } from 'astro';
import { checkApiAuth } from '@/utils/server';
import { orthancFetch } from '@/libs/orthanc';

export const GET: APIRoute = async ({ params, cookies }) => {
    const instanceid = params.instanceId;
  
    if (!instanceid) {
      return new Response("Se requiere un instanceID", { status: 400 });
    }

  try {
    const isAuthorized = await checkApiAuth(instanceid, cookies, 'instance');

    if (!isAuthorized) {
        return new Response("No autorizado", { status: 401 });
    }

    const response = await orthancFetch(`/instances/${encodeURIComponent(instanceid)}/rendered?quality=100`);
    
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    
    const data = await response.arrayBuffer();
    
    return new Response(data, {
      headers: { 
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, no-store, max-age=0',
        'Pragma': 'no-cache',
        'Vary': 'Cookie'
      }
    });
  } catch (error) {
    console.error('Error en API rendered:', error);
    return new Response("Error en la api", { status: 500 });
  }
};
