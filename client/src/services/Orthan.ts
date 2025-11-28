const API_BASE_URL = import.meta.env.API_BASE_URL || '/api';

export async function getStudyById(studyId: string) {
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
