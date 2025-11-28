import { App, AppOptions, ViewConfig, ToolConfig } from "dwv";
import { serieActivaId } from "../stores/dicomStore";
let app: App | null = null;



/**
 * Crea y configura la aplicación principal de DWV
 */
export function initDwv(): App {
    const app = new App();
    const viewConfig = new ViewConfig("imageLayer");
    const viewConfigs = { "*": [viewConfig] };
    const options = new AppOptions(viewConfigs);

    options.tools = {
        None: new ToolConfig(),
        Scroll: new ToolConfig(),
        WindowLevel: new ToolConfig(),
        ZoomAndPan: new ToolConfig(),
        Draw: {
            options: [
                "Arrow",
                "Ruler",
                "Circle",
                "Ellipse",
                "Rectangle",
                "Protractor",
                "Roi",
            ],
        },
        Floodfill: new ToolConfig(),
        Livewire: new ToolConfig()
    };

    app.init(options);

    console.log("DWV main app created and DICOM URLs loaded.");

    return app;
}
async function cargarSerie(seriesId) {
    if (!app) app = initDwv();
    app.reset();

    // 4. DESCARGAR SI ES NUEVO
    console.log(`🌐 Descargando de Orthanc: ${seriesId}`);
    try {
        const resp = await fetch(`/api/series/${seriesId}`, {
            headers: { Authorization: "Basic TUVESUNPOk1FRElDTw==" },
        });
        const data = await resp.json();

        const promesas = data.Instances.map(async (id) => {
            const r = await fetch(`/api/instances/${id}/file`, {
                headers: { Authorization: "Basic TUVESUNPOk1FRElDTw==" },
            });
            const blob = await r.blob();
            return URL.createObjectURL(blob);
        });
        console.log("Descargando imágenes DICOM...");

        const urlsNuevas = await Promise.all(promesas);


        // Mostramos
        app.loadURLs(urlsNuevas);
        console.log("Serie cargada correctamente.");

    } catch (error) {
        console.error("Error cargando serie:", error);
    }
}

serieActivaId.subscribe((nuevoId) => {
    if (nuevoId) cargarSerie(nuevoId);
});

