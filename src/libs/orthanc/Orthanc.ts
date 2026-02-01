import db from '../db/db';
import type { DicomStudy } from '../../types';
import { sanitizeString } from '@/utils';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config/orthanc';

/**
* Funcion para obtener la cédula del paciente a partir del ID del estudio	
* @param studyId 
* @returns
*/
export async function GetDNIbyStudyID(studyId: string) {
 try {
   const response = await fetch(`${ORTHANC_URL}/studies/${studyId}`, {
     method: 'GET',
     headers: {
       'Authorization': ORTHANC_AUTH,
     }
   });
   if (!response.ok) throw new Error(response.statusText);

   const data: DicomStudy = await response.json();
   return data.PatientMainDicomTags?.PatientID;

 } catch (error) {
    console.log("Error al obtener el DNI", error)
    return null
 }
}

/**
 * Funcion para obtener las series (carpetas) de un estudio dado su ID
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
    console.log("Error al obtener las series", error)
    throw new Error("Error al obtener las series");
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
    return { Instances: data.Instances || [], mainDicomTags: data.MainDicomTags || {} };

  } catch (error) {
    console.log("Error al obtener las instancias", error)
    throw new Error("Error al obtener las instancias")
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
        description,
        json_completo
      FROM studies
    `;
    const searchClause = ' WHERE patient_name LIKE ? OR patient_id LIKE ? OR description LIKE ? OR institution_name LIKE ?';
    const orderClause = ' ORDER BY study_date DESC LIMIT ? OFFSET ?';

    const params: (string | number)[] = [];
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
    
    const params: string[] = [];
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
