import type { APIRoute } from 'astro';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config/orthanc';
import { verifyToken } from '@/libs/auth/auth';

export const GET: APIRoute = async ({ params, cookies }) => {
    const instanceid = params.instanceId;
  
    if (!instanceid) {
      return new Response("Se requiere un instanceID", { status: 400 });
    }

  try {
    // 1. Verificar autenticación básica (Token de admin)
    const authToken = cookies.get('auth_token')?.value;
    let isAuthorized = false;

    if (authToken) {
        const payload = await verifyToken(authToken);
        if (payload) isAuthorized = true;
    }

    // 2. Si no es admin, verificar si tiene acceso "lite" a este estudio
    if (!isAuthorized) {
        // Necesitamos saber a qué estudio pertenece esta instancia
        const instanceInfoResponse = await fetch(`${ORTHANC_URL}/instances/${instanceid}`, {
             headers: { 'Authorization': ORTHANC_AUTH }
        });

        if (instanceInfoResponse.ok) {
            const instanceInfo = await instanceInfoResponse.json();
            const parentStudyId = instanceInfo.ParentStudy;
            
            // Verificar la cookie específica de este estudio
            const liteCookie = cookies.get(`auth_lite_${parentStudyId}`)?.value;
            if (liteCookie === 'authorized') { // O validación de token si fuera JWT
                 isAuthorized = true;
            }
        }
    }

    if (!isAuthorized) {
        return new Response("No autorizado", { status: 401 });
    }

    const response = await fetch(`${ORTHANC_URL}/instances/${instanceid}/rendered?quality=100`, {
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
    console.error('Error en API rendered:', error);
    return new Response("Error en la api", { status: 500 });
  }
};
