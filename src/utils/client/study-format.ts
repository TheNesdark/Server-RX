import type { DicomStudy, FormattedStudy, Study } from "@/types";

export function FormatStudy(study: Study): FormattedStudy {
  const patientName = study.patientName
    ? study.patientName.replace(/[^\p{L}0-9\s]/gu, " ").trim()
    : "Paciente Anonimo";

  let studyDate = "Fecha Desconocida";
  if (study.studyDate && study.studyDate.length === 8) {
    try {
      const year = parseInt(study.studyDate.substring(0, 4));
      const month = parseInt(study.studyDate.substring(4, 6));
      const day = parseInt(study.studyDate.substring(6, 8));

      const dateObj = new Date(year, month - 1, day);
      if (
        dateObj.getFullYear() === year &&
        dateObj.getMonth() === month - 1 &&
        dateObj.getDate() === day
      ) {
        studyDate = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
      }
    } catch (error) {
      console.warn("Error parsing study date:", study.studyDate, error);
    }
  }

  let modality = "OT";
  if (study.json_completo) {
    try {
      const json: DicomStudy = JSON.parse(study.json_completo);
      if (json.MainDicomTags?.ModalitiesInStudy) {
        modality = json.MainDicomTags.ModalitiesInStudy;
      }
    } catch (error) {
      console.error("Error parsing json_completo for study", study.id, error);
    }
  }

  return {
    id: study.id,
    patientName,
    patientId: study.patientId || "ID Desconocido",
    patientSex: study.patientSex || "Sexo Desconocido",
    institution: study.institutionName || "Institucion Desconocida",
    studyDate,
    modality,
  };
}