import type { APIRoute } from 'astro';
import { checkApiAuth } from '@/utils/server';
import { getLocalInstanceById } from '@/libs/db';
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

    // Intentar obtener desde la DB local
    const localData = getLocalInstanceById(instanceid);
    if (localData) {
      return new Response(JSON.stringify(localData), {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'private, no-store, max-age=0',
          'Pragma': 'no-cache',
          'Vary': 'Cookie'
        }
      });
    }

    const response = await orthancFetch(`/instances/${encodeURIComponent(instanceid)}`);
    
    if (!response.ok) {
      throw new Error(response.statusText);
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
    console.error('Error en API instances:', error);
    return new Response("Error en la api", { status: 500 });
  }
};
