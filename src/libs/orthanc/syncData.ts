import 'dotenv/config';
import db from '../db/db';
import type { DicomStudy } from '../../types';

const ORTHANC_URL = process.env.ORTHANC_URL || 'http://localhost:8042';
const ORTHANC_USERNAME = process.env.ORTHANC_USERNAME || 'orthanc';
const ORTHANC_PASSWORD = process.env.ORTHANC_PASSWORD || 'orthanc';
const ORTHANC_AUTH = 'Basic ' + Buffer.from(`${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`).toString('base64');

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
    console.log('✅ Sincronización completada con éxito.');

  } catch (error) {
    console.log("Error al sincronizar los datos:", error);
  }
}
