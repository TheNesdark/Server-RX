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
        const studyId = new URL(window.location.href).searchParams.get("study");
        const response = await fetch(`http://localhost:3001/studies/${studyId}`);
        const data: StudyData = await response.json();

        return {
            urls: ["http://localhost:3001/files/" + data.dicomFile],
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

