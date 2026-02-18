import db, { 
  bulkUpsertLocalStudies, 
  bulkUpsertLocalSeries, 
  bulkUpsertLocalInstances, 
  setSyncMetadata,
  getLocalStudyById
} from '../db';
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
   // Primero intentamos desde la DB local
   const localStudy = getLocalStudyById(studyId);
   if (localStudy) {
     return localStudy.PatientMainDicomTags?.PatientID;
   }

   // Si no está en la DB, pedimos a Orthanc
   const response = await orthancFetch(`/studies/${studyId}`);
   const data: DicomStudy = await response.json();
   return data.PatientMainDicomTags?.PatientID;
 } catch (error) {
    console.error("Error al obtener el DNI:", error);
    return null;
 }
}

/**
 * Función para sincronizar datos desde Orthanc a la DB local
 */
export async function sincronizarDatos() {
  // @ts-ignore
  global.isOrthancSyncing = true;
  console.log('🔄 Iniciando sincronización completa...');
  try {
    // 1. Sincronizar estudios
    console.log('📦 Obteniendo estudios...');
    const studyRes = await orthancFetch(`/studies?expand`);
    const estudios: DicomStudy[] = await studyRes.json();
    bulkUpsertLocalStudies(estudios);
    console.log(`✅ ${estudios.length} estudios sincronizados.`);

    // 2. Sincronizar series
    console.log('📦 Obteniendo series...');
    const seriesRes = await orthancFetch(`/series?expand`);
    const series = await seriesRes.json();
    bulkUpsertLocalSeries(series);
    console.log(`✅ ${series.length} series sincronizadas.`);

    // 3. Sincronizar instancias
    console.log('📦 Obteniendo instancias...');
    const instancesRes = await orthancFetch(`/instances?expand`);
    const instances = await instancesRes.json();
    bulkUpsertLocalInstances(instances);
    console.log(`✅ ${instances.length} instancias sincronizadas.`);

    // 4. Actualizar la secuencia de cambios al último valor absoluto de Orthanc
    // Usamos un since muy alto para forzar a Orthanc a devolvernos el puntero del final (Last)
    const changesRes = await orthancFetch('/changes?since=999999999');
    const changesData = await changesRes.json();
    const lastSeq = changesData.Last;
    
    if (lastSeq !== undefined) {
      setSyncMetadata('last_change_seq', lastSeq.toString());
      console.log(`🚀 Secuencia actualizada al máximo: ${lastSeq}`);
    } 
    
    console.log('✨ Sincronización manual completada con éxito.');
    return estudios.length;
  } catch (error) {
    console.error('❌ Error en la sincronización:', error);
    throw error;
  } finally {
    // @ts-ignore
    global.isOrthancSyncing = false;
  }
}
