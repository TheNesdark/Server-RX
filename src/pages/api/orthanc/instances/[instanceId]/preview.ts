import type { APIRoute } from 'astro';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config';
import { checkApiAuth } from '@/utils/server';

const PREVIEW_FALLBACK_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="Sin vista previa">
  <rect width="256" height="256" fill="#0f1720"/>
  <rect x="48" y="56" width="160" height="120" rx="10" fill="#152535" stroke="#2b4258" stroke-width="2"/>
  <circle cx="98" cy="102" r="16" fill="#2f5878"/>
  <path d="M66 160l42-38 26 24 30-34 26 48z" fill="#24435e"/>
  <text x="128" y="212" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#97b5ca">Sin vista previa</text>
</svg>`;

const PRIVATE_NO_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Pragma': 'no-cache',
  'Vary': 'Cookie',
};

export const GET: APIRoute = async ({ params, cookies, url }) => {
  const instanceid = params.instanceId;

  if (!instanceid) {
    return new Response("Se requiere un instanceID", { status: 400 });
  }

  try {
    const isAuthorized = await checkApiAuth(instanceid, cookies, 'instance');

    if (!isAuthorized) {
        return new Response("No autorizado", { status: 401 });
    }

    const orthancPreviewUrl = new URL(`${ORTHANC_URL}/instances/${instanceid}/preview`);
    url.searchParams.forEach((value, key) => {
      orthancPreviewUrl.searchParams.append(key, value);
    });

    const response = await fetch(orthancPreviewUrl, {
      headers: { 'Authorization': ORTHANC_AUTH }
    });

    if (response.status === 415) {
      return new Response(PREVIEW_FALLBACK_SVG, {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          ...PRIVATE_NO_CACHE_HEADERS,
        }
      });
    }

    if (!response.ok) {
      console.error(
        `Error en API preview (${instanceid}): Orthanc respondio ${response.status} ${response.statusText}`,
      );
      return new Response('Error en la api', { status: 502 });
    }

    const data = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new Response(data, {
      headers: {
        'Content-Type': contentType,
        ...PRIVATE_NO_CACHE_HEADERS,
      }
    });
  } catch (error) {
    console.error('Error en API preview:', error);
    return new Response(PREVIEW_FALLBACK_SVG, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        ...PRIVATE_NO_CACHE_HEADERS,
      }
    });
  }
};
