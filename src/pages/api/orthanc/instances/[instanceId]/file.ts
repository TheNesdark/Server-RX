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
    const response = await fetch(`${ORTHANC_URL}/instances/${params.instanceId}/file`, {
      headers: { 'Authorization': ORTHANC_AUTH }
    });
    
    if (!response.ok) {
      // Si Orthanc responde con un error (ej. 404 si la instancia no existe)
      return new Response(null, { status: response.status });
    }
    
    // Obtenemos el arrayBuffer del archivo DICOM
    const data = await response.arrayBuffer();
    
    // El tipo MIME para archivos DICOM es application/dicom
    const contentType = response.headers.get('content-type') || 'application/dicom';
    
    return new Response(data, {
      headers: { 
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable' // 1 año de caché
      }
    });
  } catch (error) {
    console.error(`Error en API file para instancia ${params.instanceId}:`, error);
    return new Response(null, { status: 500 });
  }
};
