import type { Study, FormattedStudy } from "@/types";


export function FormatStudy(study: Study): FormattedStudy {
    const patientName = study.patientName
        ? study.patientName.replace(/[^\p{L}0-9\s]/gu, ' ').trim()
        : "Paciente Anónimo";
    
    let studyDate = "Fecha Desconocida";
    if (study.studyDate && study.studyDate.length === 8) {
        try {
            const year = study.studyDate.substring(0, 4);
            const month = study.studyDate.substring(4, 6);
            const day = study.studyDate.substring(6, 8);
            
            // Validate date components
            if (year && month && day && 
                parseInt(month) >= 1 && parseInt(month) <= 12 &&
                parseInt(day) >= 1 && parseInt(day) <= 31) {
                studyDate = `${year}/${month}/${day}`;
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