import db from '../db/db';
import type { DicomStudy } from '../../types';

// Unificación de la URL base desde las variables de entorno
const ORTHANC_URL = import.meta.env.API_BASE_URL 
/**
 * Funciones de Comunicación con Orthanc (API)
 */

export async function getSeriesByStudyId(studyId: string) {
  try {
    const response = await fetch(`${ORTHANC_URL}/studies/${studyId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic TUVESUNPOk1FRElDTw==', // MEDICO:MEDICO
        'Accept-Encoding': 'identity'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch studies: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.Series;
  } catch (error) {
    console.error(`❌ Error al obtener series para el estudio ${studyId}:`, error);
    throw error;
  }
}

export async function getSeriesImages(seriesId: string) {
  try {
    const response = await fetch(`${ORTHANC_URL}/series/${seriesId}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic TUVESUNPOk1FRElDTw==', // MEDICO:MEDICO
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch series images: ${response.statusText}`);
    }

    const data = await response.json();
    return { Instances: data.Instances, mainDicomTags: data.MainDicomTags };
  } catch (error) {
    console.error(`❌ Error al obtener imágenes de la serie ${seriesId}:`, error);
    throw error;
  }
}

/**
 * Funciones de Base de Datos Local y Sincronización
 */

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

    const estudios: DicomStudy[] = await response.json();
    console.log(`📥 Descargados ${estudios.length} estudios. Guardando...`);

    // 2. Preparamos la inserción en la base de datos
    const insert = db.prepare(`
      INSERT OR REPLACE INTO studies (id, patient_name, patient_id, patient_sex, institution_name, study_date, description, json_completo)
      VALUES (@id, @name, @pid, @sex, @iname, @date, @desc, @json)
    `);

    // 3. Usamos una transacción para eficiencia
    const transaction = db.transaction((lista: DicomStudy[]) => {
      for (const est of lista) {
        insert.run({
          id: est.ID,
          name: est.PatientMainDicomTags?.PatientName || 'Sin Nombre',
          pid: est.PatientMainDicomTags?.PatientID || '',
          sex: est.PatientMainDicomTags?.PatientSex || 'Desconocido',
          iname: est.MainDicomTags?.InstitutionName || 'Desconocido',
          date: est.MainDicomTags?.StudyDate || '',
          desc: est.MainDicomTags?.StudyDescription || 'DX',
          json: JSON.stringify(est)
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
      FROM studies 
    `;

    const params: any[] = [];

    if (searchTerm) {
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
    console.error('❌ Error al obtener estudios de la DB:', error);
    return [];
  }
}

export async function getTotalEstudios(searchTerm: string = ''): Promise<number> {
  try {
    let query = 'SELECT COUNT(*) as count FROM studies';
    const params: any[] = [];

    if (searchTerm) {
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
    console.error('❌ Error al obtener el total de estudios de la DB:', error);
    return 0;
  }
}
