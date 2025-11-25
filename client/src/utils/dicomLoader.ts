export interface StudyData {
    id: string;
    patientName: string;
    studyDate: string;
    studyType: string;
    dicomFile: string;
}

export interface DicomLoadResult {
    urls: string[];
    studyData: StudyData | null;
}

/**
 * Carga las URLs de los archivos DICOM y los datos del estudio desde el servidor
 */
export async function loadDicomData(): Promise<DicomLoadResult> {
    try {
        const baseUrl = import.meta.env.PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const studyId = new URL(window.location.href).searchParams.get("study");
        const response = await fetch(`${baseUrl}/studies/${studyId}`);
        const data: StudyData = await response.json();

        return {
            urls: [`${baseUrl}/files/` + data.dicomFile],
            studyData: data
        };
    } catch (error) {
        console.error("Error fetching study data:", error);
        return {
            urls: [],
            studyData: null
        };
    }
}

