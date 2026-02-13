import db from '../db';
import type { DicomStudy } from '#/types';
import { sanitizeString } from '#/utils';
import { ORTHANC_URL, ORTHANC_AUTH } from '#/config';

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

export async function getStudyById(studyId: string): Promise<DicomStudy | null> {
  try {
    const response = await fetch(`${ORTHANC_URL}/studies/${studyId}`, {
      method: 'GET',
      headers: {
        'Authorization': ORTHANC_AUTH,
      }
    });

    if (!response.ok) throw new Error(response.statusText);

    return await response.json() as DicomStudy;
  } catch (error) {
    console.log("Error al obtener el estudio", error)
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
          id: est.ID,
          name: est.PatientMainDicomTags?.PatientName && est.PatientMainDicomTags?.PatientName.substring(0, 255) || 'Sin Nombre',
          pid: est.PatientMainDicomTags?.PatientID && est.PatientMainDicomTags?.PatientID.substring(0, 64),
          sex: est.PatientMainDicomTags?.PatientSex && est.PatientMainDicomTags?.PatientSex.substring(0, 10) || 'Desconocido',
          iname: est.MainDicomTags?.InstitutionName && est.MainDicomTags?.InstitutionName.substring(0, 255) || 'Desconocido',
          date: est.MainDicomTags?.StudyDate && est.MainDicomTags?.StudyDate.substring(0, 10),
          desc: est.MainDicomTags?.StudyDescription && est.MainDicomTags?.StudyDescription.substring(0, 255) || 'DX',
          json: JSON.stringify(est)
        });
      }
    });

    transaction(estudios);
    console.log('✅ Sincronización diaria completada exitosamente.');
    return estudios.length;

  } catch (error) {
    console.error('❌ Error durante la sincronización diaria:', error);
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
