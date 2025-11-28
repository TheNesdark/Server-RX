interface DicomStudy {
    ID: string;
    PatientMainDicomTags: {
        PatientName?: string;
    };
    MainDicomTags: {
        StudyDate?: string;
        StudyDescription?: string;
        AccessionNumber?: string;
        StudyID?: string;
    };
}



/**
 * Descarga el DICOM protegido, lo convierte a BLOB y genera una URL local para DWV
 */
export async function loadDicomData() {
    try {
        // 1. Usamos el Proxy de Astro para evitar errores de CORS/SSL
        const baseUrl = '/api'; 
        
        // Obtenemos el ID del estudio de la barra de direcciones (?study=...)
        const studyId = new URL(window.location.href).searchParams.get("study");
        
        if (!studyId) {
            console.error("No se encontró el ID del estudio en la URL");
            return { urls: [] };
        }

        const headers = {
            "Authorization": "Basic TUVESUNPOk1FRElDTw==", // MEDICO:MEDICO
            // No agregues headers raros aquí, el Proxy se encarga si hace falta
        };

        console.log("1. Buscando datos del estudio:", studyId);

        // --- PASO A: Obtener el Estudio para sacar la Serie ---
        const respEstudio = await fetch(`${baseUrl}/studies/${studyId}`, { headers });
        if (!respEstudio.ok) throw new Error(`Error Estudio: ${respEstudio.status}`);
        const dataEstudio = await respEstudio.json();

        // --- PASO B: Obtener la Serie para sacar la Instancia ---
        const firstSeriesId = dataEstudio.Series[0]; // Tomamos la primera serie
        const respSerie = await fetch(`${baseUrl}/series/${firstSeriesId}`, { headers });
        if (!respSerie.ok) throw new Error(`Error Serie: ${respSerie.status}`);
        const dataSerie = await respSerie.json();

        // --- PASO C: Descargar el Archivo DICOM (BINARIO) ---
        const firstInstanceId = dataSerie.Instances[0]; // Tomamos la primera imagen
        const fileUrl = `${baseUrl}/instances/${firstInstanceId}/file`
        const previewUrl = `${baseUrl}/instances/${firstInstanceId}/preview`;

        console.log("2. Descargando imagen binaria...", fileUrl);

        const respFile = await fetch(fileUrl, { headers });

        if (!respFile.ok) throw new Error(`Error descargando archivo: ${respFile.status}`);

        // ¡AQUÍ ESTÁ LA MAGIA PARA DWV!
        // 1. Convertimos la respuesta en un Blob (Objeto binario grande)
        const blob = await respFile.blob();

        // 2. Creamos una URL temporal en el navegador (ej: blob:http://localhost...)
        const blobUrl = URL.createObjectURL(blob);

        console.log("3. Blob generado correctamente:", blobUrl);

        // Retornamos el formato que espera tu viewer
        return {
            DicomUrl: [blobUrl],
            previewUrl: previewUrl
        }

    } catch (error) {
        console.error("Error crítico en loadDicomData:", error);
        return {
            urls: [],
        };
    }
}