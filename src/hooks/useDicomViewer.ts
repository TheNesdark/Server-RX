import { useEffect, useRef, useState } from 'preact/hooks';
import { activeSeriesId } from '@/stores/dicomStore';
import {
    addDefaultTools,
    clearImageCache,
    clearMeasurements,
    cornerstone,
    csToolsUpdateStack,
    getImageManager,
    initializeCSTools,
    initializeImageLoader,
    readFiles,
    renderImage,
    resetFileManager,
    resetImageManager,
    resetViewports,
    resizeViewport,
    setToolActive,
    setToolEnabled,
    setToolDisabled,
    setToolPassive,
    store,
} from 'larvitar';
import type { ImageManager, Series, StoreViewport } from 'larvitar/dist/imaging/types';
import {
    setupToolButtons,
    setupDrawMenu,
    setupResetButton,
} from '@/handlers/eventHandlers';
import type { ViewerDrawShape, ViewerOverlayTool, ViewerPrimaryTool, OrthancSeriesResponse } from '@/types';

const VIEWPORT_ID = 'layerGroup0';
const VIEWER_CONTAINER_ID = 'dicom-viewer';
const TOOL_VIEWPORTS = [VIEWPORT_ID];
const OVERLAY_TOOLS: ViewerOverlayTool[] = ['ScaleOverlay'];

const DRAW_TOOL_MAP: Record<ViewerDrawShape, string> = {
    Arrow: 'ArrowAnnotate',
    ArrowAnnotate: 'ArrowAnnotate',
    Ruler: 'Length',
    Circle: 'EllipticalRoi',
    Ellipse: 'EllipticalRoi',
    Rectangle: 'RectangleRoi',
    Protractor: 'Angle',
    Roi: 'FreehandRoi',
    Eraser: 'Eraser',
};

export function useDicomViewer() {
    const loadingSeriesIdRef = useRef<string | null>(null);
    const loadedSeriesIdRef = useRef<string | null>(null);
    const resizeFrameRef = useRef<number | null>(null);
    const loadRequestRef = useRef(0);
    const renderedSeriesUidRef = useRef<string | null>(null);
    const toolsInitializedRef = useRef(false);
    const wheelZoomActiveRef = useRef(false);
    const overlayToolsStateRef = useRef<Record<ViewerOverlayTool, boolean>>({
        ScaleOverlay: false,
    });

    const [windowCenter, setWindowCenter] = useState<number>(0);
    const [windowWidth, setWindowWidth] = useState<number>(0);
    const [range, setRange] = useState({ min: 0, max: 1 });
    const [isLoaded, setIsLoaded] = useState(false);

    const safeResizeViewport = (elementId: string) => {
        const viewportElement = document.getElementById(elementId);
        if (!viewportElement) return;

        try {
            cornerstone.getEnabledElement(viewportElement);
            resizeViewport(elementId);
        } catch {
            // El elemento aún no está listo en Cornerstone, ignoramos el redimensionamiento
        }
    };

    const ensureToolsInitialized = () => {
        if (toolsInitializedRef.current) return;
        
        try {
            addDefaultTools(VIEWPORT_ID);
            // Forzar desactivación de herramientas que no queremos por defecto
            setToolDisabled("Wwwc", TOOL_VIEWPORTS);
            
            OVERLAY_TOOLS.forEach((tool) => {
                try {
                    setToolDisabled(tool, TOOL_VIEWPORTS);
                } catch (e) {
                    console.warn(`Herramienta ${tool} no disponible aún`);
                }
            });
            
            toolsInitializedRef.current = true;
        } catch (e) {
            console.warn("Error inicializando herramientas:", e);
        }
    };

    const applyWheelZoom = (deltaY: number) => {
        const viewportElement = document.getElementById(VIEWPORT_ID);
        if (!(viewportElement instanceof HTMLElement)) {
            return;
        }

        try {
            const viewport = cornerstone.getViewport(viewportElement);
            if (!viewport) {
                return;
            }

            const currentScale = Number.isFinite(viewport.scale) ? viewport.scale : 1;
            const clampedDelta = Math.max(-200, Math.min(200, deltaY));
            const scaleFactor = Math.exp(-clampedDelta / 450);
            const nextScale = Math.min(20, Math.max(0.25, currentScale * scaleFactor));

            viewport.scale = nextScale;
            cornerstone.setViewport(viewportElement, viewport);
        } catch (error) {
            console.warn('No se pudo aplicar zoom con rueda:', error);
        }
    };

    const setWheelToolMode = (mode: 'zoom' | 'stack') => {
        if (mode === 'zoom') {
            wheelZoomActiveRef.current = true;
            setToolPassive('StackScrollMouseWheel', TOOL_VIEWPORTS);
            setToolPassive('CustomMouseWheelScroll', TOOL_VIEWPORTS);
            setToolPassive('StackScroll', TOOL_VIEWPORTS);
            return;
        }

        wheelZoomActiveRef.current = false;
        setToolPassive('CustomMouseWheelScroll', TOOL_VIEWPORTS);
        setToolActive('StackScrollMouseWheel', undefined, TOOL_VIEWPORTS);
    };

    const toggleOverlayTool = (tool: ViewerOverlayTool) => {
        ensureToolsInitialized();
        const nextState = !overlayToolsStateRef.current[tool];
        
        if (nextState) setToolEnabled(tool, TOOL_VIEWPORTS);
        else setToolDisabled(tool, TOOL_VIEWPORTS);

        overlayToolsStateRef.current[tool] = nextState;
        return nextState;
    };

    const activatePrimaryTool = (tool: ViewerPrimaryTool) => {
        if (tool === 'StackScroll') {
            setToolPassive('Pan', TOOL_VIEWPORTS);
            setToolPassive('Zoom', TOOL_VIEWPORTS);
            setToolActive('StackScroll', undefined, TOOL_VIEWPORTS);
        } else if (tool === 'ZoomPan') {
            setToolActive('Pan', { mouseButtonMask: 1 }, TOOL_VIEWPORTS);
            setToolActive('Zoom', { mouseButtonMask: 2 }, TOOL_VIEWPORTS);
            setToolPassive('StackScroll', TOOL_VIEWPORTS);
        } else {
            setToolActive(tool, undefined, TOOL_VIEWPORTS);
            setToolPassive('Pan', TOOL_VIEWPORTS);
            setToolPassive('Zoom', TOOL_VIEWPORTS);
            setToolPassive('StackScroll', TOOL_VIEWPORTS);
        }
        
        setWheelToolMode(tool === 'ZoomPan' ? 'zoom' : 'stack');
    };

    const activateDrawShape = (shape: ViewerDrawShape) => {
        setToolActive(DRAW_TOOL_MAP[shape], undefined, TOOL_VIEWPORTS);
        setToolPassive('StackScroll', TOOL_VIEWPORTS);
        setWheelToolMode('stack');
    };

    const clearAnnotations = () => clearMeasurements();

    const fetchSeriesData = async (seriesId: string) => {
        const response = await fetch(`/api/orthanc/series/${seriesId}`);
        return (await response.json()) as OrthancSeriesResponse;
    };

    const resetView = () => {
        clearAnnotations();
        resetViewports([VIEWPORT_ID]);
        activatePrimaryTool('StackScroll');
    };

    const tryRenderSeries = async (
        seriesId: string,
        seriesData: OrthancSeriesResponse,
        currentRequestId: number,
    ) => {
        if (!seriesData.Instances?.length) return false;

        // Descargamos las instancias (Para RX son pocas y asegura metadatos correctos)
        const files = await Promise.all(
            seriesData.Instances.map(async (id, i) => {
                const res = await fetch(`/api/orthanc/instances/${id}/file`);
                return new File([await res.blob()], `${i}.dcm`);
            })
        );

        if (currentRequestId !== loadRequestRef.current) return false;

        // Limpieza y carga en Larvitar
        resetImageManager();
        resetFileManager();
        const stack = await readFiles(files) as any;
        const targetSeries = Object.values(stack)[0] as Series;

        if (!targetSeries) return false;

        await renderImage(targetSeries, VIEWPORT_ID);

        csToolsUpdateStack(VIEWPORT_ID, {
            imageIds: targetSeries.imageIds,
            currentImageIdIndex: 0,
        });

        ensureToolsInitialized();
        safeResizeViewport(VIEWPORT_ID);

        renderedSeriesUidRef.current = targetSeries.seriesUID;
        loadedSeriesIdRef.current = seriesId;
        loadingSeriesIdRef.current = null;
        setIsLoaded(true);

        return true;
    };

    const loadSeries = async (seriesId: string) => {
        if (loadingSeriesIdRef.current === seriesId || loadedSeriesIdRef.current === seriesId) return;

        loadRequestRef.current += 1;
        const currentRequest = loadRequestRef.current;

        loadingSeriesIdRef.current = seriesId;
        setIsLoaded(false);
        clearAnnotations();

        try {
            const seriesData = await fetchSeriesData(seriesId);
            const success = await tryRenderSeries(seriesId, seriesData, currentRequest);
            if (!success) throw new Error('Serie vacía');
        } catch (error) {
            console.error('Error cargando serie:', error);
            loadingSeriesIdRef.current = null;
        }
    };

    useEffect(() => {
        store.initialize();
        store.addViewport(VIEWPORT_ID);

        initializeImageLoader();
        initializeCSTools();

        const toolController = {
            activatePrimaryTool,
            activateDrawShape,
            toggleOverlayTool,
            clearAnnotations,
            resetView,
        };

        const removeToolButtons = setupToolButtons(toolController);
        const removeDrawMenu = setupDrawMenu(toolController);
        const removeResetButton = setupResetButton(toolController);

        const onViewportUpdate = (viewportData: StoreViewport): {} => {
            const voi = viewportData.viewport?.voi;
            if (voi) {
                setWindowCenter(voi.windowCenter);
                setWindowWidth(Math.max(1, voi.windowWidth));
            }

            setRange({ 
                min: viewportData.minPixelValue ?? 0, 
                max: viewportData.maxPixelValue ?? 1 
            });

            if (viewportData.ready) setIsLoaded(true);
            return {};
        };

        store.addViewportListener(VIEWPORT_ID, onViewportUpdate);

        const runResize = () => {
            if (resizeFrameRef.current !== null) {
                cancelAnimationFrame(resizeFrameRef.current);
            }

            resizeFrameRef.current = requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    safeResizeViewport(VIEWPORT_ID);
                });
            });
        };

        const onWindowResize = () => runResize();
        window.addEventListener('resize', onWindowResize);

        const onViewportWheel = (event: WheelEvent) => {
            if (!wheelZoomActiveRef.current) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            applyWheelZoom(event.deltaY);
        };

        const viewportElement = document.getElementById(VIEWPORT_ID);
        if (viewportElement instanceof HTMLElement) {
            viewportElement.addEventListener('wheel', onViewportWheel, {
                passive: false,
                capture: true,
            });
        }

        const container = document.getElementById(VIEWER_CONTAINER_ID);
        let resizeObserver: ResizeObserver | null = null;
        if (container && typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                runResize();
            });
            resizeObserver.observe(container);
        }

        runResize();

        const unsubscribe = activeSeriesId.subscribe((id) => {
            if (id) {
                void loadSeries(id);
            }
        });

        return () => {
            loadRequestRef.current += 1;
            unsubscribe();
            removeToolButtons();
            removeDrawMenu();
            removeResetButton();
            store.removeViewportListener(VIEWPORT_ID);
            window.removeEventListener('resize', onWindowResize);
            if (viewportElement instanceof HTMLElement) {
                viewportElement.removeEventListener('wheel', onViewportWheel, true);
            }
            resizeObserver?.disconnect();

            if (resizeFrameRef.current !== null) {
                cancelAnimationFrame(resizeFrameRef.current);
                resizeFrameRef.current = null;
            }

            if (renderedSeriesUidRef.current) {
                clearImageCache(renderedSeriesUidRef.current);
                renderedSeriesUidRef.current = null;
            }

            OVERLAY_TOOLS.forEach((toolName) => {
                setToolDisabled(toolName, TOOL_VIEWPORTS);
                overlayToolsStateRef.current[toolName] = false;
            });

            toolsInitializedRef.current = false;
            wheelZoomActiveRef.current = false;
        };
    }, []);

    const applyWindowLevel = (center: number, width: number) => {
        const viewportElement = document.getElementById(VIEWPORT_ID);
        if (!viewportElement) return;

        const viewport = cornerstone.getViewport(viewportElement);
        if (!viewport?.voi) return;

        viewport.voi.windowCenter = center;
        viewport.voi.windowWidth = Math.max(1, width);
        cornerstone.setViewport(viewportElement, viewport);
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
        handleWidthChange,
        handleCenterChange,
    };
}
