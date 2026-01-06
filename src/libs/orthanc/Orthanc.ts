import db from '../db/db';
import type { DicomStudy } from '../../types';
import { sanitizeString } from '@/utils';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config/orthanc';

/**
 * Funciones de Comunicación con Orthanc (API)
 * @param studyId 
 * @returns
 */
export async function getSeriesByStudyId(studyId: string) {
  try {
    const response = await fetch(`${ORTHANC_URL}/studies/${studyId}`, {
      method: 'GET',
      headers: {
        'Authorization': ORTHANC_AUTH,
      }
    });

    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    return data.Series;

  } catch (error) {
    throw error;
  }
}

/**
 * función para obtener las instancias (imágenes) de una serie dada su ID
 * @param seriesId 
 * @returns 
 */
export async function getInstancesBySeriesId(seriesId: string) {
  try {
    const response = await fetch(`${ORTHANC_URL}/series/${seriesId}`, {
      method: 'GET',
      headers: {
        'Authorization': ORTHANC_AUTH,
      }
    });

    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    return { Instances: data.Instances, mainDicomTags: data.MainDicomTags };

  } catch (error) {
    throw error;
  }
}

/**
 * Funciones de Base de Datos Local y Sincronización
 */
export async function sincronizarDatos() {
  console.log('🔄 Iniciando sincronización diaria...');

  try {
    const response = await fetch(`${ORTHANC_URL}/studies?expand`, {
      headers: {
        'Authorization': ORTHANC_AUTH,
      }
    });

    if (!response.ok) throw new Error(response.statusText);

    const estudios: DicomStudy[] = await response.json();
    console.log(`📥 Descargados ${estudios.length} estudios. Guardando...`);

    const insert = db.prepare(`
      INSERT OR REPLACE INTO studies (id, patient_name, patient_id, patient_sex, institution_name, study_date, description, json_completo)
      VALUES (@id, @name, @pid, @sex, @iname, @date, @desc, @json)
    `);

    const transaction = db.transaction((lista: DicomStudy[]) => {
      for (const est of lista) {
        insert.run({
          id: sanitizeString(est.ID, 64),
          name: sanitizeString(est.PatientMainDicomTags?.PatientName, 255) || 'Sin Nombre',
          pid: sanitizeString(est.PatientMainDicomTags?.PatientID, 64),
          sex: sanitizeString(est.PatientMainDicomTags?.PatientSex, 10) || 'Desconocido',
          iname: sanitizeString(est.MainDicomTags?.InstitutionName, 255) || 'Desconocido',
          date: sanitizeString(est.MainDicomTags?.StudyDate, 10),
          desc: sanitizeString(est.MainDicomTags?.StudyDescription, 255) || 'DX',
          json: JSON.stringify(est)
        });
      }
    });

    transaction(estudios);
    console.log('✅ Sincronización completada con éxito.');

  } catch (error) {
    throw error;
  }
}

/**
 * Función para obtener estudios desde la base de datos local
 * @param limit 
 * @param offset 
 * @param searchTerm 
 * @returns 
 */
export async function obtenerEstudios(limit: number, offset: number = 0, searchTerm: string = '') {
  try {
    const sanitizedSearchTerm = sanitizeString(searchTerm, 100);
    const safeLimit = Math.min(Math.max(1, limit), 1000);
    const safeOffset = Math.max(0, offset);

    const baseQuery = `
      SELECT 
        id, 
        patient_name as patientName, 
        patient_id as patientId, 
        patient_sex as patientSex, 
        institution_name as institutionName, 
        study_date as studyDate, 
        description 
      FROM studies
    `;
    const searchClause = ' WHERE patient_name LIKE ? OR patient_id LIKE ? OR description LIKE ? OR institution_name LIKE ?';
    const orderClause = ' ORDER BY study_date DESC LIMIT ? OFFSET ?';

    const params: any[] = [];
    let query = baseQuery;

    if (sanitizedSearchTerm) {
      query += searchClause;
      params.push(`%${sanitizedSearchTerm}%`, `%${sanitizedSearchTerm}%`, `%${sanitizedSearchTerm}%`, `%${sanitizedSearchTerm}%`);
    }

    query += orderClause;
    params.push(safeLimit, safeOffset);

    const data = db.prepare(query).all(...params);
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * función para obtener el total de estudios en la base de datos local
 * @param searchTerm 
 * @returns 
 */
export async function getTotalEstudios(searchTerm: string = ''): Promise<number> {
  try {
    const sanitizedSearchTerm = sanitizeString(searchTerm, 100);
    
    const baseQuery = 'SELECT COUNT(*) as count FROM studies';
    const searchClause = ' WHERE patient_name LIKE ? OR patient_id LIKE ? OR description LIKE ? OR institution_name LIKE ?';
    
    const params: any[] = [];
    let query = baseQuery;

    if (sanitizedSearchTerm) {
      query += searchClause;
      params.push(`%${sanitizedSearchTerm}%`, `%${sanitizedSearchTerm}%`, `%${sanitizedSearchTerm}%`, `%${sanitizedSearchTerm}%`);
    }

    const result = db.prepare(query).get(...params) as { count: number };
    return result.count;

  } catch (error) {
    throw error;
  }
}
