// URL del servidor API - configurable desde .env
const API_BASE_URL = import.meta.env.API_BASE_URL || 'https://sega-avoid-dresses-citation.trycloudflare.com';

// Interfaces para tipado de datos DICOM
export interface DicomStudy {
  ID: string;
  PatientMainDicomTags?: {
    PatientName?: string;
    PatientID?: string;
  };
  MainDicomTags?: {
    StudyDate?: string;
    StudyDescription?: string;
    AccessionNumber?: string;
    StudyID?: string;
    ModalitiesInStudy?: string;
  };
}

export interface PaginatedStudiesResult {
  studies: DicomStudy[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Obtener estadísticas para saber el total de estudios
export async function getStatistics(): Promise<{ countStudies: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/statistics`, {
      method: "GET",
      headers: {
        'Authorization': 'Basic TUVESUNPOk1FRElDTw==', // MEDICO:MEDICO
      }

    });
    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }
    const data = await response.json();
    return { countStudies: data.CountStudies || 0 };
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return { countStudies: 0 };
  }
}

// Función para obtener estudios con paginación
export async function getStudiesPaginated(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedStudiesResult> {
  try {
    // Obtener total de estudios
    const stats = await getStatistics();
    const total = stats.countStudies;
    const totalPages = Math.ceil(total / limit);

    // Calcular offset
    const since = (page - 1) * limit;

    // Obtener estudios paginados
    const response = await fetch(
      `${API_BASE_URL}/studies?since=${since}&limit=${limit}&expand`,
      {
        method: "GET",
        headers: {
          'Authorization': 'Basic TUVESUNPOk1FRElDTw==', // MEDICO:MEDICO
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const studies = await response.json();

    return {
      studies,
      total,
      page,
      limit,
      totalPages
    };
  } catch (error) {
    console.error("Error al obtener los estudios:", error);
    return {
      studies: [],
      total: 0,
      page: 1,
      limit,
      totalPages: 0
    };
  }
}

// Función legacy para compatibilidad (obtiene todos)
export async function getStudies(): Promise<DicomStudy[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/studies?expand`, {
      method: "GET",
      headers: {
        'Authorization': 'Basic TUVESUNPOk1FRElDTw==', // MEDICO:MEDICO
        'Accept-Encoding': 'identity'
      }
    });

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error al obtener los estudios:", error);
    return [];
  }
}

export async function getSeriesByStudyId(studyId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/studies/${studyId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic TUVESUNPOk1FRElDTw==', // MEDICO:MEDICO
        'Accept-Encoding': 'identity'
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to fetch studies: ${response.statusText}`);
    }
    return data.Series;
  } catch (error) {
    throw error;
  }
}

export async function getSeriesImages(seriesId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/series/${seriesId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic TUVESUNPOk1FRElDTw==', // MEDICO:MEDICO
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to fetch series images: ${response.statusText}`);
    }
    return { Instances: data.Instances, mainDicomTags: data.MainDicomTags };
  } catch (error) {
    throw error;
  }
}

import db from '../db/db';

// TU URL ESTABLE (Cloudflare)
const ORTHANC_URL = import.meta.env.API_BASE_URL;

export async function sincronizarDatos() {
  console.log('🔄 Iniciando sincronización diaria...');

  try {
    // 1. Pedimos TODOS los estudios a Orthanc (Expandido)
    const response = await fetch(`${ORTHANC_URL}/studies?expand`, {
      headers: {
        'Authorization': 'Basic TUVESUNPOk1FRElDTw==', // MEDICO:MEDICO
      }
    });

    if (!response.ok) throw new Error('No se pudo conectar a Orthanc');

    const estudios = await response.json();
    console.log(`📥 Descargados ${estudios.length} estudios. Guardando...`);

    // 2. Preparamos la inserción en la base de datos
    // "INSERT OR REPLACE" significa: Si ya existe, actualízalo; si no, créalo.
    const insert = db.prepare(`
      INSERT OR REPLACE INTO estudios (id, patient_name, patient_id, patient_sex, institution_name, study_date, description, json_completo)
      VALUES (@id, @name, @pid, @sex, @iname, @date, @desc, @json)
    `);

    // 3. Usamos una transacción para que sea ultra-rápido
    const transaction = db.transaction((lista) => {
      for (const est of lista) {
        insert.run({
          id: est.ID,
          name: est.PatientMainDicomTags.PatientName || 'Sin Nombre',
          pid: est.PatientMainDicomTags.PatientID || '',
          sex: est.PatientMainDicomTags.PatientSex || 'Desconocido',
          iname: est.MainDicomTags.InstitutionName || 'Desconocido',
          date: est.MainDicomTags.StudyDate || '',
          desc: est.MainDicomTags.StudyDescription || 'DX',
          json: JSON.stringify(est) // Guardamos todo el JSON original por si acaso
        });
      }
    });

    transaction(estudios);
    console.log('✅ Sincronización completada con éxito.');

  } catch (error: unknown) {
    console.error('❌ Error en la sincronización:', error);
  }
}

export async function obtenerEstudios(limit: number, offset: number = 0, searchTerm: string = '') {
  try {
    let query = `
      SELECT id, patient_name, patient_id, patient_sex, institution_name, study_date, description 
      FROM estudios 
    `;

    const params: any[] = [];

    if (searchTerm) {
      // Escapar caracteres especiales en la búsqueda para evitar problemas con LIKE
      const escapedSearchTerm = searchTerm.replace(/[%_]/g, '\\$&');

      query += `
        WHERE patient_name LIKE ? ESCAPE '\\' 
        OR patient_id LIKE ? ESCAPE '\\' 
        OR description LIKE ? ESCAPE '\\' 
        OR institution_name LIKE ? ESCAPE '\\' 
      `;
      params.push(`%${escapedSearchTerm}%`, `%${escapedSearchTerm}%`, `%${escapedSearchTerm}%`, `%${escapedSearchTerm}%`);
    }

    query += ' ORDER BY study_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const data = db.prepare(query).all(...params);
    return data;
  } catch (error: unknown) {
    console.error('❌ Error al obtener estudios:', error);
    return [];
  }
}

export async function getTotalEstudios(searchTerm: string = ''): Promise<number> {
  try {
    let query = 'SELECT COUNT(*) as count FROM estudios';
    const params: any[] = [];

    if (searchTerm) {
      // Escapar caracteres especiales en la búsqueda para evitar problemas con LIKE
      const escapedSearchTerm = searchTerm.replace(/[%_]/g, '\\$&');

      query += `
        WHERE patient_name LIKE ? ESCAPE '\\' 
        OR patient_id LIKE ? ESCAPE '\\' 
        OR description LIKE ? ESCAPE '\\' 
        OR institution_name LIKE ? ESCAPE '\\' 
      `;
      params.push(`%${escapedSearchTerm}%`, `%${escapedSearchTerm}%`, `%${escapedSearchTerm}%`, `%${escapedSearchTerm}%`);
    }

    const result = db.prepare(query).get(...params) as { count: number };
    return result.count;
  } catch (error: unknown) {
    console.error('❌ Error al obtener el total de estudios:', error);
    return 0;
  }
}