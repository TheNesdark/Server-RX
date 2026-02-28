import type { APIRoute } from "astro";
import { getLocalStudies, getLocalStudiesCount } from "@/libs/db";
import { STUDIES_PAGE_LIMIT } from "@/config/pagination";

export const GET: APIRoute = async ({ request, locals }) => {
  // Defense-in-depth: verificar autenticación explícita además del middleware
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = STUDIES_PAGE_LIMIT;

    // Asegurar que page sea un número válido
    const currentPage = isNaN(page) || page < 1 ? 1 : page;
    const offset = (currentPage - 1) * limit;

    const [studies, total] = await Promise.all([
      getLocalStudies(limit, offset, searchTerm),
      getLocalStudiesCount(searchTerm)
    ]);
    
    const totalPages = Math.ceil(total / limit);

    return new Response(JSON.stringify({
      studies,
      total,
      currentPage,
      totalPages
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error en la búsqueda de estudios:', error);
    return new Response("Error en la api", { status: 500});
  }
};