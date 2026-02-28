import { 
    syncFullStudy,
    deleteLocalStudy, 
    setSyncMetadata, 
    getSyncMetadata
} from '../db';
import { orthancFetch } from './index';
import { logOrthancError } from '@/utils/server/http-responses';
import type { DicomStudy } from '@/types';

const WATCH_INTERVAL = 5000; // 5 segundos
let isProcessing = false;

export async function startOrthancWatcher() {
    console.log('👀 Observador de Orthanc activo.');

    let lastSeq = -1; // -1 indica que aún no hemos leído la DB al arrancar

    setInterval(async function() {
        // H11: Variables globales tipadas en env.d.ts — sin @ts-ignore necesario
        if (isProcessing || global.isOrthancSyncing) return;
        isProcessing = true;

        try {
            // 1. Obtener la posición actual de la base de datos (Fuente única de verdad)
            const dbSeqStr = getSyncMetadata('last_change_seq');
            let dbSeq = dbSeqStr ? parseInt(dbSeqStr, 10) : 0;

            // El watcher simplemente sigue a la base de datos
            if (lastSeq === -1 || dbSeq > lastSeq) {
                lastSeq = dbSeq;
            }

            // 2. Pedimos cambios desde nuestra última posición conocida
            const response = await orthancFetch(`/changes?since=${lastSeq}&limit=100`);
            const data = await response.json();
            const changes = data.Changes;
            
            if (!changes || changes.length === 0) {
                isProcessing = false;
                return;
            }

            for (let i = 0; i < changes.length; i++) {
                const change = changes[i];
                lastSeq = change.Seq;

                // Solo sincronizamos cuando el estudio es estable (todas las imágenes llegaron)
                // para evitar mensajes duplicados (NewStudy + StableStudy) y datos incompletos.
                if (change.ChangeType === 'StableStudy') {
                    try {
                        const [studyRes, seriesRes, instancesRes] = await Promise.all([
                            orthancFetch(`/studies/${change.ID}`),
                            orthancFetch(`/studies/${change.ID}/series?expand`),
                            orthancFetch(`/studies/${change.ID}/instances?expand`)
                        ]);

                        const [study, series, instances] = await Promise.all([
                            studyRes.json(),
                            seriesRes.json(),
                            instancesRes.json()
                        ]);
                        
                        syncFullStudy(study, series, instances);
                        console.log(`[Watcher] ✅ Sincronizado completo: ${study.PatientMainDicomTags?.PatientName || 'S/N'}`);
                    } catch (e) {
                        logOrthancError(e, `sincronizando estudio ${change.ID}`);
                    }
                } 
                else if (change.ChangeType === 'DeletedStudy') {
                    deleteLocalStudy(change.ID);
                    console.log(`[Watcher] 🗑️ Eliminado: ${change.ID}`);
                }
            }

            // SEGURIDAD: Antes de guardar, verificamos que no estemos bajando la secuencia 
            // que pudo haber sido actualizada por una sincronización manual.
            const currentDbSeqStr = getSyncMetadata('last_change_seq');
            const currentDbSeq = currentDbSeqStr ? parseInt(currentDbSeqStr, 10) : 0;
            
            if (lastSeq > currentDbSeq) {
                setSyncMetadata('last_change_seq', lastSeq.toString());
            } else {
                // Si la DB ya es mayor, nos sincronizamos con ella para el próximo ciclo
                lastSeq = currentDbSeq;
            }

        } catch (error) {
            logOrthancError(error, 'Watcher loop');
        } finally {
            isProcessing = false;
        }
    }, WATCH_INTERVAL);
}