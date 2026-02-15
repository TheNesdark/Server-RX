import db from "./base";
import type { DicomStudy } from "@/types";

var SEARCH_CLAUSE = ' WHERE patient_name LIKE ? OR patient_id LIKE ? OR description LIKE ? OR institution_name LIKE ?';

var stmtInsertStudy = db.prepare(`
    INSERT OR REPLACE INTO studies (id, patient_name, patient_id, patient_sex, institution_name, study_date, description, json_completo)
    VALUES (@id, @name, @pid, @sex, @iname, @date, @desc, @json)
`);

var stmtDeleteStudy = db.prepare('DELETE FROM studies WHERE id = ?');
var stmtCheckExists = db.prepare('SELECT 1 FROM studies WHERE id = ?');
var stmtUpdateMeta = db.prepare('INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)');
var stmtGetMeta = db.prepare('SELECT value FROM sync_metadata WHERE key = ?');

export function getLocalStudies(limit: number, offset: number = 0, searchTerm: string = '') {
    var sanitizedSearchTerm = searchTerm.substring(0, 100);
    var params: (string | number)[] = [];
    var query = `
      SELECT id, patient_name as patientName, patient_id as patientId, 
             patient_sex as patientSex, institution_name as institutionName, 
             study_date as studyDate, description, json_completo
      FROM studies
    `;

    if (sanitizedSearchTerm) {
        query += SEARCH_CLAUSE;
        var like = `%${sanitizedSearchTerm}%`;
        params.push(like, like, like, like);
    }

    query += ' ORDER BY study_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.prepare(query).all(...params);
}

export function getLocalStudiesCount(searchTerm: string = ''): number {
    var sanitizedSearchTerm = searchTerm.substring(0, 100);
    var params: string[] = [];
    var query = 'SELECT COUNT(*) as count FROM studies';

    if (sanitizedSearchTerm) {
        query += SEARCH_CLAUSE;
        var like = `%${sanitizedSearchTerm}%`;
        params.push(like, like, like, like);
    }

    var result = db.prepare(query).get(...params) as { count: number };
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

export function setSyncMetadata(key: string, value: string) {
    stmtUpdateMeta.run(key, value);
}

export function getSyncMetadata(key: string): string | null {
    var result = stmtGetMeta.get(key) as { value: string } | undefined;
    return result ? result.value : null;
}

export var bulkUpsertLocalStudies = db.transaction(function(estudios: DicomStudy[]) {
    for (var i = 0; i < estudios.length; i++) {
        var est = estudios[i];
        stmtInsertStudy.run({
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
