import db from '../db';
import { orthancFetch } from './index';
import type { DicomStudy } from '@/types';

const WATCH_INTERVAL = 5000; // 5 segundos
let isProcessing = false;

// Preparamos las sentencias fuera del bucle para mejor rendimiento
const stmtCheckExists = db.prepare('SELECT 1 FROM studies WHERE id = ?');
const stmtInsertStudy = db.prepare(`
    INSERT OR REPLACE INTO studies (id, patient_name, patient_id, patient_sex, institution_name, study_date, description, json_completo)
    VALUES (@id, @name, @pid, @sex, @iname, @date, @desc, @json)
`);
const stmtDeleteStudy = db.prepare('DELETE FROM studies WHERE id = ?');
const stmtUpdateMeta = db.prepare('INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)');
const stmtGetMeta = db.prepare('SELECT value FROM sync_metadata WHERE key = ?');

async function getStudyDetails(studyId: string): Promise<DicomStudy | null> {
    try {
        const response = await orthancFetch(`/studies/${studyId}`);
        if (!response.ok) return null; // Manejar 404 si se borró mientras procesabamos
        return await response.json();
    } catch (error) {
        console.error(`[Watcher] Error fetch estudio ${studyId}:`, error);
        return null;
    }
}

function updateLocalStudy(est: DicomStudy) {
    try {
        stmtInsertStudy.run({
            id: est.ID,
            name: (est.PatientMainDicomTags?.PatientName?.substring(0, 255)) || 'Sin Nombre',
            pid: est.PatientMainDicomTags?.PatientID?.substring(0, 64) || 'S/N',
            sex: (est.PatientMainDicomTags?.PatientSex?.substring(0, 10)) || 'O',
            iname: (est.MainDicomTags?.InstitutionName?.substring(0, 255)) || 'Desconocido',
            date: est.MainDicomTags?.StudyDate?.substring(0, 10) || '',
            desc: (est.MainDicomTags?.StudyDescription?.trim() || est.MainDicomTags?.StudyID || 'RX').substring(0, 255),
            json: JSON.stringify(est)
        });
    } catch (err) {
        console.error("[Watcher] Error insertando en DB:", err);
    }
}

export async function startOrthancWatcher() {
    console.log('👀 Observador de Orthanc activo.');

    let lastSeq = 0;

    setInterval(async () => {
        if (isProcessing) return;
        isProcessing = true;

        try {
            // 1. Siempre verificar en DB si hubo una sincronización manual o externa
            const row = stmtGetMeta.get('last_change_seq') as { value: string } | undefined;
            if (row) {
                const dbSeq = parseInt(row.value, 10);
                // Si la DB tiene una secuencia mayor, saltamos a ella
                if (dbSeq > lastSeq) {
                    lastSeq = dbSeq;
                }
            }

            // 2. Pedimos cambios desde nuestra última posición
            const response = await orthancFetch(`/changes?since=${lastSeq}&limit=100`);
            const data = await response.json();
            const changes = data.Changes;
            
            // Si no hay cambios, salimos
            if (!changes || changes.length === 0) {
                isProcessing = false;
                return;
            }

            for (const change of changes) {
                // Actualizamos lastSeq cambio a cambio para no perder progreso en caso de error
                lastSeq = change.Seq;

                if (change.ChangeType === 'StableStudy' || change.ChangeType === 'NewStudy') {
                    const exists = stmtCheckExists.get(change.ID);
                    const study = await getStudyDetails(change.ID);
                    
                    if (study) {
                        updateLocalStudy(study);
                        if (!exists) {
                            console.log(`[Watcher] ✨ ${change.ChangeType === 'NewStudy' ? 'Nuevo' : 'Estable'}: ${study.PatientMainDicomTags?.PatientName || 'S/N'}`);
                        }
                    }
                } 
                else if (change.ChangeType === 'DeletedStudy') {
                    stmtDeleteStudy.run(change.ID);
                    console.log(`[Watcher] 🗑️ Eliminado: ${change.ID}`);
                }
            }

            // Guardamos en DB la última secuencia procesada
            stmtUpdateMeta.run('last_change_seq', lastSeq.toString());

        } catch (error) {
            // Silencio parcial para evitar spam, pero logueamos errores críticos
            if (error instanceof Error && !error.message.includes('ECONNREFUSED')) {
                console.error('[Watcher] Error:', error.message);
            }
        } finally {
            isProcessing = false;
        }
    }, WATCH_INTERVAL);
}