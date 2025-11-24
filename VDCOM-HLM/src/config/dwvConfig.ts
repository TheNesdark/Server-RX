import { App, AppOptions, ViewConfig, ToolConfig } from "dwv";

/**
 * Crea y configura la aplicación principal de DWV
 */
export function createMainApp(dicomUrls: string[]): App {
    const app = new App();
    const viewConfig = new ViewConfig("layerGroup0");
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
    app.loadURLs(dicomUrls);

    return app;
}

/**
 * Crea y configura la aplicación de thumbnails de DWV
 */
export function createThumbnailApp(dicomUrls: string[]): App {
    const thumbApp = new App();
    const thumbViewConfig = new ViewConfig("layerGroup1");
    const thumbViewConfigs = { "*": [thumbViewConfig] };
    const thumbOptions = new AppOptions(thumbViewConfigs);

    thumbApp.init(thumbOptions);
    thumbApp.loadURLs(dicomUrls);

    return thumbApp;
}
