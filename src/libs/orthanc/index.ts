import db, { bulkUpsertLocalStudies, setSyncMetadata } from '../db';
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

/**
 * Función para sincronizar datos desde Orthanc a la DB local
 */
export async function sincronizarDatos() {
  // @ts-ignore
  global.isOrthancSyncing = true;
  console.log('🔄 Iniciando sincronización completa...');
  try {
    // 1. Sincronizar estudios
    const response = await orthancFetch(`/studies?expand`);
    const estudios: DicomStudy[] = await response.json();
    
    bulkUpsertLocalStudies(estudios);

    // 2. Actualizar la secuencia de cambios al último valor absoluto de Orthanc
    // Usamos un since muy alto para forzar a Orthanc a devolvernos el puntero del final (Last)
    const changesRes = await orthancFetch('/changes?since=999999999');
    const changesData = await changesRes.json();
    const lastSeq = changesData.Last;
    
    if (lastSeq !== undefined) {
      setSyncMetadata('last_change_seq', lastSeq.toString());
      console.log(`✅ Sincronización completa finalizada. Secuencia actualizada al máximo: ${lastSeq}`);
    } else {
      console.log('✅ Sincronización completa finalizada (no se pudo obtener la secuencia de cambios).');
    }
    
    return estudios.length;
  } catch (error) {
    console.error('❌ Error en la sincronización:', error);
    throw error;
  } finally {
    // @ts-ignore
    global.isOrthancSyncing = false;
  }
}
