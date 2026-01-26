import type { Study, FormattedStudy } from "@/types";

export function FormatStudy(study: Study): FormattedStudy {
    const patientName = study.patientName
        ? study.patientName.replace(/[^\p{L}0-9\s]/gu, ' ').trim()
        : "Paciente Anónimo";
    
    let studyDate = "Fecha Desconocida";
    if (study.studyDate && study.studyDate.length === 8) {
        try {
            const year = parseInt(study.studyDate.substring(0, 4));
            const month = parseInt(study.studyDate.substring(4, 6));
            const day = parseInt(study.studyDate.substring(6, 8));
            
            // Validar con Date
            const dateObj = new Date(year, month - 1, day);
            if (dateObj.getFullYear() === year && 
                dateObj.getMonth() === month - 1 && 
                dateObj.getDate() === day) {
                studyDate = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
            }
        } catch (error) {
            console.warn('Error parsing study date:', study.studyDate, error);
        }
    }

    return {
        id: study.id,
        patientName,
        patientId: study.patientId || "ID Desconocido",
        patientSex: study.patientSex || "Sexo Desconocido",
        institution: study.institutionName || "Institución Desconocida",
        studyDate,
        modality: study.description || "Sin descripción",
    };
};

// Función para codificar en base64 de forma compatible
export function base64Encode(str: string): string {
    // En navegador, usar btoa (disponible globalmente)
    if (typeof btoa !== 'undefined') {
      return btoa(str);
    }
    // En servidor Node.js, usar Buffer (solo disponible en servidor)
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf-8').toString('base64');
    }
    // Fallback: implementación manual (raro que llegue aquí)
    throw new Error('No se puede codificar en base64: btoa y Buffer no están disponibles');
  }

export function formatCountdown(exp: number) {
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = exp - now;
  
    if (timeLeft <= 0) {
      return "00:00:00";
    }
  
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
  
    return [hours, minutes, seconds]
      .map(v => v.toString().padStart(2, "0"))
      .join(":");


}