import { useEffect, useRef, useState } from 'preact/hooks';
import { serieActivaId } from '@/stores/dicomStore';
import { 
    setupToolButtons, 
    setupDrawMenu, 
    setupResetButton, 
    setupDWVEventListeners 
} from '@/handlers/eventHandlers';

export function useDicomViewer() {
    const appRef = useRef<any>(null);

    const [windowCenter, setWindowCenter] = useState<number>(0);
    const [windowWidth, setWindowWidth] = useState<number>(0);
    const [range, setRange] = useState({ min: 0, max: 1 });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const initDWV = async () => {
            const dwv = await import('dwv');
            const { NoneTool } = await import('@/tools/dwvTools');
            
            dwv.toolList["None"] = NoneTool;
            const app = new dwv.App();
            appRef.current = app;

            const viewConfig = new dwv.ViewConfig("layerGroup0");
            const options = new dwv.AppOptions({ "*": [viewConfig] });

            options.tools = {
                Scroll: new dwv.ToolConfig(),
                WindowLevel: new dwv.ToolConfig(),
                ZoomAndPan: new dwv.ToolConfig(),
                Draw: {
                    options: ["Arrow", "Ruler", "Circle", "Ellipse", "Rectangle", "Protractor", "Roi"]
                },
                Floodfill: new dwv.ToolConfig(),
                None: new dwv.ToolConfig(),
            };

            app.init(options);

            // Setup de UI
            setupToolButtons(app);
            setupDrawMenu(app);
            setupResetButton(app);

            // Setup de Event Listeners de DWV (Centralizados)
            setupDWVEventListeners(app, {
                onWindowLevelChange: (center, width) => {
                    setWindowCenter(center);
                    setWindowWidth(width);
                },
                onLoad: (dataRange, wl) => {
                    setRange(dataRange);
                    setWindowCenter(wl.center);
                    setWindowWidth(wl.width);
                    setIsLoaded(true);
                },
                onLoadItem: () => {
                }
            });

            const unsubscribe = serieActivaId.subscribe((id) => {
                if (id) cargarSerie(id);
            });

            return unsubscribe;
        };

        let unsubscribeFn: (() => void) | undefined;
        initDWV().then(unsub => {
            unsubscribeFn = unsub;
        });

        return () => {
            if (unsubscribeFn) unsubscribeFn();
        };
    }, []);

    const cargarSerie = async (seriesId: string) => {
        const app = appRef.current;
        if (!app) return;

        app.reset();
        setIsLoaded(false);

        try {
            const resp = await fetch(`/orthanc/series/${seriesId}`);
            const data = await resp.json();
            const dicomUrls = data.Instances.map(
                (instance: string) => `/orthanc/instances/${instance}/file`,
            );

            // totalFilesRef.current = dicomUrls.length; // Eliminado

            app.loadURLs(dicomUrls, {
                requestHeaders: [{ name: "Accept", value: "application/dicom" }],
                withCredentials: false,
                batchSize: 5,
            });
        } catch (error) {
            console.error("Error cargando serie:", error);
            setIsLoaded(true);
        }
    };

    const applyWindowLevel = (center: number, width: number) => {
        const app = appRef.current;
        if (!app) return;

        const layerGroup = app.getLayerGroupByDivId('layerGroup0');
        const viewLayer = layerGroup.getActiveViewLayer();

        if (viewLayer) {
            const viewController = viewLayer.getViewController();
            import('dwv').then(dwv => {
                const wl = new dwv.WindowLevel(center, width);
                viewController.setWindowLevel(wl);
            });
        }
    };

    const handleWidthChange = (width: number) => {
        setWindowWidth(width);
        applyWindowLevel(windowCenter, width);
    };

    const handleCenterChange = (center: number) => {
        setWindowCenter(center);
        applyWindowLevel(center, windowWidth);
    };

    return {
        windowCenter,
        windowWidth,
        range,
        isLoaded,
        // loadProgress, // Eliminado
        // loadedFiles: loadedFilesRef.current, // Eliminado
        // totalFiles: totalFilesRef.current, // Eliminado
        handleWidthChange,
        handleCenterChange
    };
}
