import type { APIRoute } from 'astro';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config/orthanc';

export const GET: APIRoute = async ({ params, url }) => {
  try {
    const path = url.pathname.replace('/api/orthanc', '');
    const response = await fetch(`${ORTHANC_URL}${path}`, {
      headers: { 'Authorization': ORTHANC_AUTH }
    });
    
    if (!response.ok) {
      return new Response(null, { status: response.status });
    }
    
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const data = await response.arrayBuffer();
    
    return new Response(data, {
      headers: { 'Content-Type': contentType }
    });
  } catch (error) {
    return new Response(null, { status: 500 });
  }
};