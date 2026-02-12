import { obtenerEstudios, getTotalEstudios } from "@/libs/orthanc";
import { STUDIES_PAGE_LIMIT } from "@/config/pagination";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = STUDIES_PAGE_LIMIT;

    // Asegurar que page sea un número válido
    const currentPage = isNaN(page) || page < 1 ? 1 : page;
    const offset = (currentPage - 1) * limit;

    const [studies, total] = await Promise.all([
      obtenerEstudios(limit, offset, searchTerm),
      getTotalEstudios(searchTerm)
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
}