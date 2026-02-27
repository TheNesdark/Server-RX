import db from "./base";
import type { DicomStudy } from "@/types";

const SEARCH_CLAUSE = ' WHERE patient_name LIKE ? OR patient_id LIKE ? OR description LIKE ? OR institution_name LIKE ?';

const stmtInsertStudy = db.prepare(`
    INSERT OR REPLACE INTO studies (id, patient_name, patient_id, patient_sex, institution_name, study_date, description, json_completo)
    VALUES (@id, @name, @pid, @sex, @iname, @date, @desc, @json)
`);

const stmtInsertSeries = db.prepare(`
    INSERT OR REPLACE INTO series (id, study_id, series_number, modality, json_completo)
    VALUES (@id, @study_id, @number, @modality, @json)
`);

const stmtInsertInstance = db.prepare(`
    INSERT OR REPLACE INTO instances (id, series_id, study_id, instance_number, json_completo)
    VALUES (@id, @series_id, @study_id, @number, @json)
`);

const stmtDeleteStudy = db.prepare('DELETE FROM studies WHERE id = ?');
const stmtCheckExists = db.prepare('SELECT 1 FROM studies WHERE id = ?');
// H10: Prepared statement creado una sola vez al nivel de módulo, no dentro de la función
const stmtCheckSeriesExists = db.prepare('SELECT 1 FROM series WHERE id = ?');
const stmtUpdateMeta = db.prepare('INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)');
const stmtGetMeta = db.prepare('SELECT value FROM sync_metadata WHERE key = ?');

export function getLocalStudies(limit: number, offset: number = 0, searchTerm: string = '') {
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
}

export function getLocalStudiesCount(searchTerm: string = ''): number {
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
}

export function upsertLocalStudy(est: DicomStudy) {
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
}

export function deleteLocalStudy(studyId: string) {
    stmtDeleteStudy.run(studyId);
}

export function checkStudyExists(studyId: string): boolean {
    return !!stmtCheckExists.get(studyId);
}

export function checkSeriesExists(seriesId: string): boolean {
    return !!stmtCheckSeriesExists.get(seriesId);
}

export function setSyncMetadata(key: string, value: string) {
    stmtUpdateMeta.run(key, value);
}

export function getSyncMetadata(key: string): string | null {
    const result = stmtGetMeta.get(key) as { value: string } | undefined;
    return result ? result.value : null;
}

export const bulkUpsertLocalStudies = db.transaction(function(estudios: DicomStudy[]) {
    for (let i = 0; i < estudios.length; i++) {
        upsertLocalStudy(estudios[i]);
    }
});

export const bulkUpsertLocalSeries = db.transaction(function(series: any[]) {
    for (let i = 0; i < series.length; i++) {
        const s = series[i];
        upsertLocalSeries(
            s.ID, 
            s.ParentStudy, 
            s.MainDicomTags?.SeriesNumber || '', 
            s.MainDicomTags?.Modality || '',
            s
        );
    }
});

export const bulkUpsertLocalInstances = db.transaction(function(instances: any[]) {
    for (let i = 0; i < instances.length; i++) {
        const inst = instances[i];
        upsertLocalInstance(
            inst.ID, 
            inst.ParentSeries, 
            inst.ParentStudy, 
            inst.MainDicomTags?.InstanceNumber || '',
            inst
        );
    }
});

/**
 * Sincroniza un estudio completo con sus series e instancias
 */
export const syncFullStudy = db.transaction(function(study: DicomStudy, series: any[], instances: any[]) {
    // 1. Insertar/Actualizar Estudio
    upsertLocalStudy(study);

    // 2. Insertar Series
    for (const s of series) {
        upsertLocalSeries(
            s.ID, 
            study.ID, // Usamos el ID del estudio padre directamente
            s.MainDicomTags?.SeriesNumber || '', 
            s.MainDicomTags?.Modality || '',
            s
        );
    }

    // 3. Insertar Instancias
    for (const inst of instances) {
        upsertLocalInstance(
            inst.ID, 
            inst.ParentSeries, 
            study.ID, // Usamos el ID del estudio padre directamente
            inst.MainDicomTags?.InstanceNumber || '',
            inst
        );
    }
});

export function upsertLocalSeries(seriesId: string, studyId: string, number: string, modality: string, json?: any) {
    stmtInsertSeries.run({ 
        id: seriesId, 
        study_id: studyId, 
        number, 
        modality, 
        json: json ? JSON.stringify(json) : null 
    });
}

export function upsertLocalInstance(instanceId: string, seriesId: string, studyId: string, number: string, json?: any) {
    stmtInsertInstance.run({ 
        id: instanceId, 
        series_id: seriesId, 
        study_id: studyId, 
        number, 
        json: json ? JSON.stringify(json) : null 
    });
}

export function getParentStudyId(id: string, type: 'instance' | 'series'): string | null {
    if (type === 'instance') {
        const res = db.prepare('SELECT study_id FROM instances WHERE id = ?').get(id) as { study_id: string } | undefined;
        return res?.study_id || null;
    } else {
        const res = db.prepare('SELECT study_id FROM series WHERE id = ?').get(id) as { study_id: string } | undefined;
        return res?.study_id || null;
    }
}

export function getLocalStudyById(studyId: string): DicomStudy | null {
    const res = db.prepare('SELECT json_completo FROM studies WHERE id = ?').get(studyId) as { json_completo: string } | undefined;
    if (!res || !res.json_completo) return null;
    return JSON.parse(res.json_completo);
}

export function getLocalSeriesByStudyId(studyId: string): any[] {
    const rows = db.prepare('SELECT json_completo FROM series WHERE study_id = ?').all(studyId) as { json_completo: string }[];
    return rows.map(r => r.json_completo ? JSON.parse(r.json_completo) : null).filter(Boolean);
}

export function getLocalSeriesById(seriesId: string): any | null {
    const res = db.prepare('SELECT json_completo FROM series WHERE id = ?').get(seriesId) as { json_completo: string } | undefined;
    if (!res || !res.json_completo) return null;
    return JSON.parse(res.json_completo);
}

export function getLocalInstancesBySeriesId(seriesId: string): any[] {
    const rows = db.prepare('SELECT json_completo FROM instances WHERE series_id = ?').all(seriesId) as { json_completo: string }[];
    return rows.map(r => r.json_completo ? JSON.parse(r.json_completo) : null).filter(Boolean);
}

export function getLocalInstanceById(instanceId: string): any | null {
    const res = db.prepare('SELECT json_completo FROM instances WHERE id = ?').get(instanceId) as { json_completo: string } | undefined;
    if (!res || !res.json_completo) return null;
    return JSON.parse(res.json_completo);
}
