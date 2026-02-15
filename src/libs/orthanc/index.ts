import db from '../db';
import type { DicomStudy } from '@/types';
import { ORTHANC_URL, ORTHANC_AUTH } from '@/config';
import { startOrthancWatcher } from './watcher';

// Iniciar el observador de cambios automáticamente si estamos en Node
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  // @ts-ignore
  if (!global._orthancWatcherStarted) {
    console.log('🚀 Sistema de sincronización automática activado');
    startOrthancWatcher().catch(err => {
      console.error('❌ Error al iniciar el watcher:', err);
    });
    // @ts-ignore
    global._orthancWatcherStarted = true;
  }
}

export async function orthancFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${ORTHANC_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': ORTHANC_AUTH,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Orthanc error: ${response.status} ${response.statusText}`);
  }

  return response;
}

/**
* Funcion para obtener la cédula del paciente a partir del ID del estudio	
* @param studyId 
* @returns
*/
export async function GetDNIbyStudyID(studyId: string) {
 try {
   const response = await orthancFetch(`/studies/${studyId}`);
   const data: DicomStudy = await response.json();
   return data.PatientMainDicomTags?.PatientID;
 } catch (error) {
    console.error("Error al obtener el DNI:", error);
    return null;
 }
}

export async function getStudyById(studyId: string): Promise<DicomStudy | null> {
  try {
    const response = await orthancFetch(`/studies/${studyId}`);
    return await response.json() as DicomStudy;
  } catch (error) {
    console.error("Error al obtener el estudio:", error);
    return null;
  }
}

/**
 * Funcion para obtener las series (carpetas) de un estudio dado su ID
 * @param studyId 
 * @returns
 */
export async function getSeriesByStudyId(studyId: string) {
  try {
    const response = await orthancFetch(`/studies/${studyId}`);
    const data = await response.json();
    return data.Series;
  } catch (error) {
    console.error("Error al obtener las series:", error);
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
    const response = await orthancFetch(`/series/${seriesId}`);
    const data = await response.json();
    return { Instances: data.Instances || [], mainDicomTags: data.MainDicomTags || {} };
  } catch (error) {
    console.error("Error al obtener las instancias:", error);
    throw error;
  }
}

const SEARCH_CLAUSE = ' WHERE patient_name LIKE ? OR patient_id LIKE ? OR description LIKE ? OR institution_name LIKE ?';

/**
 * Función para obtener estudios desde la base de datos local (Búsqueda rápida en tiempo real)
 */
export async function obtenerEstudios(limit: number, offset: number = 0, searchTerm: string = '') {
  try {
    const sanitizedSearchTerm = searchTerm.substring(0, 100);
    const params: (string | number)[] = [];
    let query = `
      SELECT id, patient_name as patientName, patient_id as patientId, 
             patient_sex as patientSex, institution_name as institutionName, 
             study_date as studyDate, description, json_completo
      FROM studies
    `;

    if (sanitizedSearchTerm) {
      query += SEARCH_CLAUSE;
      const like = `%${sanitizedSearchTerm}%`;
      params.push(like, like, like, like);
    }

    query += ' ORDER BY study_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('Error obteniendo estudios de la DB local:', error);
    throw error;
  }
}

/**
 * función para obtener el total de estudios en la base de datos local
 */
export async function getTotalEstudios(searchTerm: string = ''): Promise<number> {
  try {
    const sanitizedSearchTerm = searchTerm.substring(0, 100);
    const params: string[] = [];
    let query = 'SELECT COUNT(*) as count FROM studies';

    if (sanitizedSearchTerm) {
      query += SEARCH_CLAUSE;
      const like = `%${sanitizedSearchTerm}%`;
      params.push(like, like, like, like);
    }

    const result = db.prepare(query).get(...params) as { count: number };
    return result.count;
  } catch (error) {
    console.error('Error obteniendo total de estudios:', error);
    throw error;
  }
}

/**
 * Función para sincronizar datos desde Orthanc a la DB local
 */
export async function sincronizarDatos() {
  console.log('🔄 Iniciando sincronización completa...');
  try {
    // 1. Sincronizar estudios
    const response = await orthancFetch(`/studies?expand`);
    const estudios: DicomStudy[] = await response.json();
    
    const insert = db.prepare(`
      INSERT OR REPLACE INTO studies (id, patient_name, patient_id, patient_sex, institution_name, study_date, description, json_completo)
      VALUES (@id, @name, @pid, @sex, @iname, @date, @desc, @json)
    `);

    const transaction = db.transaction((lista: DicomStudy[]) => {
      for (const est of lista) {
        insert.run({
          id: est.ID,
          name: (est.PatientMainDicomTags?.PatientName?.substring(0, 255)) || 'Sin Nombre',
          pid: est.PatientMainDicomTags?.PatientID?.substring(0, 64),
          sex: (est.PatientMainDicomTags?.PatientSex?.substring(0, 10)) || 'O',
          iname: (est.MainDicomTags?.InstitutionName?.substring(0, 255)) || 'Desconocido',
          date: est.MainDicomTags?.StudyDate?.substring(0, 10),
          desc: (est.MainDicomTags?.StudyDescription?.trim() || est.MainDicomTags?.StudyID || 'RX').substring(0, 255),
          json: JSON.stringify(est)
        });
      }
    });

    transaction(estudios);

    // 2. Actualizar la secuencia de cambios al último valor de Orthanc para el watcher
    const changesRes = await orthancFetch('/changes?limit=1');
    const changesData = await changesRes.json();
    const lastSeq = changesData.Last;
    
    db.prepare('INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)').run('last_change_seq', lastSeq.toString());

    console.log(`✅ Sincronización completa finalizada. Secuencia actualizada a ${lastSeq}`);
    return estudios.length;
  } catch (error) {
    console.error('❌ Error en la sincronización:', error);
    throw error;
  }
}
