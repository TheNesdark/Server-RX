import { App, AppOptions, ViewConfig, ToolConfig, toolOptions } from "dwv";
import { serieActivaId } from "../stores/dicomStore";
import { NoneTool } from "@/tools/dwvTools";
import { setupToolButtons, setupDrawMenu, setupResetButton, setupSidebarToggle } from "../handlers/eventHandlers";

let app: App | null = null;
toolOptions["None"] = NoneTool;

function initDwv(): App {

    const newApp = new App();
    const viewConfig = new ViewConfig("layerGroup0");
    const viewConfigs = { "*": [viewConfig] };
    const options = new AppOptions(viewConfigs);

    options.tools = {
        Scroll: new ToolConfig(),
        WindowLevel: new ToolConfig(),
        ZoomAndPan: new ToolConfig(),
        Draw: {
            options: ["Arrow", "Ruler", "Circle", "Ellipse", "Rectangle", "Protractor", "Roi"],
        },
        Floodfill: new ToolConfig(),
        Livewire: new ToolConfig(),
        None: new ToolConfig(),
    };

    newApp.init(options);
    console.log("DWV initialized");

    return newApp;
}

async function cargarSerie(seriesId: string) {
    if (!app) {
        app = initDwv();
        // Configurar handlers después de inicializar
        setupToolButtons(app);
        setupDrawMenu(app);
        setupResetButton(app);
        setupSidebarToggle();
    }
    app.reset();

    console.log(`🌐 Descargando serie: ${seriesId}`);
    try {
        const resp = await fetch(`/api/series/${seriesId}`);
        const data = await resp.json();

        const dicomUrls = data.Instances.map((instance: string) => `/api/instances/${instance}/file`);
        app.loadURLs(dicomUrls);
        console.log("Serie cargada correctamente");
    } catch (error) {
        console.error("Error cargando serie:", error);
    }
}

serieActivaId.subscribe((nuevoId) => {
    if (nuevoId) cargarSerie(nuevoId);
});

