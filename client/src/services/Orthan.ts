const API_BASE_URL = import.meta.env.API_BASE_URL || 'https://sega-avoid-dresses-citation.trycloudflare.com';

// Interfaces para tipado de datos DICOM
interface DicomStudy {
  ID: string;
  PatientMainDicomTags?: {
    PatientName?: string;
  };
  MainDicomTags?: {
    StudyDate?: string;
    StudyDescription?: string;
    AccessionNumber?: string;
    StudyID?: string;
  };
}

// Función para obtener estudios DICOM desde Orthanc
export async function getStudies(): Promise<DicomStudy[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/studies?expand`, {
      method: "GET",
      headers: {
        "Bypass-Tunnel-Reminder": "true",
        "Content-Type": "application/json",
        Authorization: "Basic TUVESUNPOk1FRElDTw==",
      },
    });

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error al obtener los estudios:", error);
    return [];
  }
}

export async function getSeriesByStudyId(studyId: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/studies/${studyId}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Bypass-Tunnel-Reminder': 'true',
                },

            }
        );
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Failed to fetch studies: ${response.statusText}`);
        }
        return data.Series;
    } catch (error) {
        throw error
    }
}

export async function getSeriesImages(seriesId: string) {
    try {
        const response = await fetch(`${API_BASE_URL}/series/${seriesId}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Bypass-Tunnel-Reminder': 'true',
                },

            }
        );
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Failed to fetch series images: ${response.statusText}`);
        }
        return { Instances: data.Instances, mainDicomTags: data.MainDicomTags };
    } catch (error) {
        throw error
    }
}