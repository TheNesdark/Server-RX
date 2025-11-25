import type { StudyData } from "./dicomLoader";

/**
 * Actualiza la información del paciente en la UI usando los datos del estudio
 */
export function displayStudyInfo(studyData: StudyData | null): void {
    if (!studyData) {
        console.warn("No hay datos del estudio para mostrar");
        return;
    }

    // Actualizar elementos del DOM
    updateElement("patient-name", studyData.patientName || "Paciente Desconocido");
    updateElement("study-date", `Fecha: ${studyData.studyDate || "N/A"}`);
    updateElement("study-description", studyData.studyType || "");
    updateElement("study-time", `ID: ${studyData.id || "N/A"}`);

    console.log("Información del estudio mostrada:", studyData);
}

/**
 * Actualiza el contenido de un elemento del DOM
 */
function updateElement(id: string, content: string): void {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = content;
    }
}
