import type { APIRoute } from 'astro';
import { checkApiAuth } from '@/utils/server';
import { getLocalStudyById } from '@/libs/db';
import { orthancFetch } from '@/libs/orthanc';

export const GET: APIRoute = async ({ params, cookies }) => {
  const studyID = params.studyId

  if (!studyID) { 
    return new Response("Se requiere un studyID", { status: 400 });
  }
  try {
    const isAuthorized = await checkApiAuth(studyID, cookies, 'study');

    if (!isAuthorized) {
        return new Response("No autorizado", { status: 401 });
    }

    // Intentar obtener desde la DB local
    const localData = getLocalStudyById(studyID);
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

    // Fallback a Orthanc
    const response = await orthancFetch(`/studies/${encodeURIComponent(studyID)}`);
    
    if (!response.ok) {
      throw new Error(response.statusText)
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
    console.error(`Error en API studies ${studyID}:`, error);
    return new Response("Error en la api", { status: 500 });
  }
};
