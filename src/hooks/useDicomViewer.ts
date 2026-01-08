import { useEffect, useRef, useState } from 'preact/hooks';
import { activeSeriesId } from '@/stores/dicomStore';
import { 
    setupToolButtons, 
    setupDrawMenu, 
    setupResetButton, 
    setupDWVEventListeners 
} from '@/handlers/eventHandlers';
import type { App } from 'dwv';

// Tipos parciales para DWV (la librería no exporta tipos completos)
interface DWVApp {
    reset: () => void;
    loadURLs: (urls: string[], options: {
        requestHeaders: Array<{ name: string; value: string }>;
        withCredentials: boolean;
        batchSize: number;
    }) => void;
    getLayerGroupByDivId: (id: string) => {
        getActiveViewLayer: () => {
            getViewController: () => {
                setWindowLevel: (wl: { center: number; width: number }) => void;
            };
        } | null;
    } | null;
}

interface DWVModule {
    App: new () => DWVApp;
    ViewConfig: new (id: string) => unknown;
    AppOptions: new (config: Record<string, unknown[]>) => {
        tools: Record<string, unknown>;
    };
    ToolConfig: new () => unknown;
    WindowLevel: new (center: number, width: number) => { center: number; width: number };
    toolList: Record<string, unknown>;
}

export function useDicomViewer() {
    const dwvAppRef = useRef<DWVApp | null>(null);
    const dwvModuleRef = useRef<DWVModule | null>(null);

    const [windowCenter, setWindowCenter] = useState<number>(0);
    const [windowWidth, setWindowWidth] = useState<number>(0);
    const [range, setRange] = useState({ min: 0, max: 1 });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const initDWV = async () => {
            // Importación dinámica de DWV
            const dwvModule = await import('dwv') as unknown as DWVModule;
            dwvModuleRef.current = dwvModule;
            const { NoneTool } = await import('@/tools/dwvTools');
            
            dwvModule.toolList["None"] = NoneTool;
            const dwvApp = new dwvModule.App();
            dwvAppRef.current = dwvApp;

            const viewConfig = new dwvModule.ViewConfig("layerGroup0");
            const options = new dwvModule.AppOptions({ "*": [viewConfig] });

            options.tools = {
                Scroll: new dwvModule.ToolConfig(),
                WindowLevel: new dwvModule.ToolConfig(),
                ZoomAndPan: new dwvModule.ToolConfig(),
                Draw: {
                    options: ["Arrow", "Ruler", "Circle", "Ellipse", "Rectangle", "Protractor", "Roi"]
                },
                Floodfill: new dwvModule.ToolConfig(),
                None: new dwvModule.ToolConfig(),
            };

            dwvApp.init(options);

            // Setup de UI
            setupToolButtons(dwvApp);
            setupDrawMenu(dwvApp);
            setupResetButton(dwvApp);

            // Setup de Event Listeners de DWV (Centralizados)
            setupDWVEventListeners(dwvApp, {
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

            const unsubscribe = activeSeriesId.subscribe((id) => {
                if (id) loadSeries(id);
            });

            return unsubscribe;
        };

        let unsubscribeFn: (() => void) | undefined;
        initDWV().then(unsub => {
            unsubscribeFn = unsub;
        }).catch(error => {
            console.error('Error initializing DWV:', error);
        });

        return () => {
            if (unsubscribeFn) unsubscribeFn();
        };
    }, []);

    const loadSeries = async (seriesId: string) => {
        const dwvApp = dwvAppRef.current;
        if (!dwvApp) return;

        dwvApp.reset();
        setIsLoaded(false);

        try {
            const resp = await fetch(`/api/orthanc/series/${seriesId}`);
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
            }
            const data = await resp.json();
            if (!data || !data.Instances || !Array.isArray(data.Instances)) {
                throw new Error('Respuesta inválida: la propiedad Instances no está presente o no es un array');
            }
            const dicomUrls = data.Instances.map(
                (instance: string) => `/api/orthanc/instances/${instance}/file`,
            );

            dwvApp.loadURLs(dicomUrls, {
                requestHeaders: [{ name: "Accept", value: "application/dicom" }],
                withCredentials: false,
                batchSize: 5,
            });

        } catch (error) {
            console.error("Error cargando serie:", error);
        } 
    };

    const applyWindowLevel = (center: number, width: number) => {
        const dwvApp = dwvAppRef.current;
        if (!dwvApp) return;

        const layerGroup = dwvApp.getLayerGroupByDivId('layerGroup0');
        const viewLayer = layerGroup.getActiveViewLayer();

        if (viewLayer) {
            const viewController = viewLayer.getViewController();
            const dwvModule = dwvModuleRef.current;
            if (dwvModule) {
                const wl = new dwvModule.WindowLevel(center, width);
                viewController.setWindowLevel(wl);
            }
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
