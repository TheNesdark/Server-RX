import type { Study, FormattedStudy } from "@/types";


export function FormatStudy(study: Study): FormattedStudy {
    const patientName = study.patient_name
        ? study.patient_name.replace(/[^a-zA-Z0-9\s]/g, " ")
        : "Paciente Anónimo";
    const studyDate = study.study_date
        ? `${study.study_date.substring(0,4)}/${study.study_date.substring(4,6)}/${study.study_date.substring(6,8)}`
        : "Fecha Desconocida"
          

    return {
        id: study.id,
        patientName,
        patientId: study.patient_id || "ID Desconocido",
        patientSex: study.patient_sex || "Sexo Desconocido",
        institution: study.institution_name || "Institución Desconocida",
        studyDate,
        modality: study.description || "Sin descripción",
    };
};
