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
import type { ViewerDrawShape, ViewerOverlayTool, ViewerPrimaryTool } from '@/types';

const VIEWPORT_ID = 'layerGroup0';
const VIEWER_CONTAINER_ID = 'dicom-viewer';
const TOOL_VIEWPORTS = [VIEWPORT_ID];
const OVERLAY_TOOLS: ViewerOverlayTool[] = ['OrientationMarkers', 'ScaleOverlay'];

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

interface OrthancSeriesResponse {
    ID?: string;
    ParentStudy?: string;
    Instances?: string[];
    MainDicomTags?: {
        Modality?: string;
        SeriesDescription?: string;
    };
}

interface OrthancStudyResponse {
    Series?: string[];
}

const NON_RENDERABLE_MODALITIES = new Set([
    'DOC',
    'KO',
    'PR',
    'RTDOSE',
    'RTPLAN',
    'RTSTRUCT',
    'SEG',
    'SR',
]);

const asImageManager = (value: unknown): ImageManager => {
    if (!value || typeof value !== 'object') {
        return null;
    }

    return value as ImageManager;
};

const isRenderableSeries = (value: unknown): value is Series => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const candidate = value as { imageIds?: unknown };
    return Array.isArray(candidate.imageIds) && candidate.imageIds.length > 0;
};

const pickSeries = (manager: ImageManager, expectedInstances: number): Series | null => {
    if (!manager) {
        return null;
    }

    const seriesList = Object.values(manager).filter(isRenderableSeries);
    if (seriesList.length === 0) {
        return null;
    }

    const exactMatch = seriesList.find((series) => series.imageIds.length === expectedInstances);
    if (exactMatch) {
        return exactMatch;
    }

    const sortedByImages = [...seriesList].sort((a, b) => b.imageIds.length - a.imageIds.length);
    return sortedByImages[0] ?? null;
};

export function useDicomViewer() {
    const loadingSeriesIdRef = useRef<string | null>(null);
    const loadedSeriesIdRef = useRef<string | null>(null);
    const resizeFrameRef = useRef<number | null>(null);
    const loadRequestRef = useRef(0);
    const renderedSeriesUidRef = useRef<string | null>(null);
    const toolsInitializedRef = useRef(false);
    const wheelZoomActiveRef = useRef(false);
    const failedSeriesRef = useRef<Set<string>>(new Set());
    const overlayToolsStateRef = useRef<Record<ViewerOverlayTool, boolean>>({
        OrientationMarkers: false,
        ScaleOverlay: false,
    });

    const [windowCenter, setWindowCenter] = useState<number>(0);
    const [windowWidth, setWindowWidth] = useState<number>(0);
    const [range, setRange] = useState({ min: 0, max: 1 });
    const [isLoaded, setIsLoaded] = useState(false);

    const isViewportEnabled = (elementId: string) => {
        const viewportElement = document.getElementById(elementId);
        if (!(viewportElement instanceof HTMLElement)) {
            return false;
        }

        try {
            cornerstone.getEnabledElement(viewportElement);
            return true;
        } catch {
            return false;
        }
    };

    const safeResizeViewport = (elementId: string) => {
        if (!isViewportEnabled(elementId)) {
            return;
        }

        try {
            resizeViewport(elementId);
        } catch (error) {
            console.warn(`No se pudo redimensionar el viewport ${elementId}:`, error);
        }
    };

    const ensureToolsInitialized = () => {
        if (toolsInitializedRef.current || !isViewportEnabled(VIEWPORT_ID)) {
            return;
        }

        try {
            addDefaultTools(VIEWPORT_ID);

            try {
                setToolDisabled('Brush', TOOL_VIEWPORTS);
            } catch {}

            try {
                setToolDisabled('WSToggle', TOOL_VIEWPORTS);
            } catch {}

            OVERLAY_TOOLS.forEach((toolName) => {
                try {
                    setToolDisabled(toolName, TOOL_VIEWPORTS);
                } catch {}

                overlayToolsStateRef.current[toolName] = false;
            });

            toolsInitializedRef.current = true;
            activatePrimaryTool('Wwwc');
        } catch (error) {
            console.warn('No se pudieron inicializar las herramientas de Larvitar:', error);
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

    const syncWheelToolMode = (tool: ViewerPrimaryTool) => {
        const wheelMode = tool === 'ZoomPan' ? 'zoom' : 'stack';
        setWheelToolMode(wheelMode);
    };

    const setToolPassiveSafely = (toolName: string) => {
        try {
            setToolPassive(toolName, TOOL_VIEWPORTS);
        } catch {}
    };

    const releaseSegmentationTools = () => {
        setToolPassiveSafely('WSToggle');
        setToolPassiveSafely('Brush');
    };

    const toggleOverlayTool = (tool: ViewerOverlayTool) => {
        if (!toolsInitializedRef.current) {
            ensureToolsInitialized();
        }

        if (!toolsInitializedRef.current) {
            return overlayToolsStateRef.current[tool];
        }

        const nextState = !overlayToolsStateRef.current[tool];

        try {
            if (nextState) {
                setToolEnabled(tool, TOOL_VIEWPORTS);
            } else {
                setToolDisabled(tool, TOOL_VIEWPORTS);
            }

            overlayToolsStateRef.current[tool] = nextState;
            return nextState;
        } catch (error) {
            console.warn(`No se pudo cambiar el estado de ${tool}:`, error);
            return overlayToolsStateRef.current[tool];
        }
    };

    const activatePrimaryTool = (tool: ViewerPrimaryTool) => {
        try {
            releaseSegmentationTools();

            if (tool === 'ZoomPan') {
                setToolActive('Pan', { mouseButtonMask: 1 }, TOOL_VIEWPORTS);
                setToolActive('Zoom', { mouseButtonMask: 2 }, TOOL_VIEWPORTS);
                setToolPassive('StackScroll', TOOL_VIEWPORTS);
                syncWheelToolMode('ZoomPan');
                return;
            }

            setToolActive(tool, undefined, TOOL_VIEWPORTS);
            setToolPassive('StackScroll', TOOL_VIEWPORTS);
            syncWheelToolMode(tool);
        } catch (error) {
            console.warn(`No se pudo activar la herramienta ${tool}:`, error);
        }
    };

    const activateDrawShape = (shape: ViewerDrawShape) => {
        const mappedTool = DRAW_TOOL_MAP[shape];
        if (!mappedTool) {
            return;
        }

        try {
            releaseSegmentationTools();
            setToolActive(mappedTool, undefined, TOOL_VIEWPORTS);
            setToolPassive('StackScroll', TOOL_VIEWPORTS);
            syncWheelToolMode('Pan');
        } catch (error) {
            console.warn(`No se pudo activar la forma ${shape}:`, error);
        }
    };

    const clearAnnotations = () => {
        try {
            clearMeasurements();
        } catch (error) {
            console.warn('No se pudieron limpiar las anotaciones:', error);
        }
    };

    const isLikelyRenderableModality = (modality?: string) => {
        if (!modality) {
            return true;
        }

        return !NON_RENDERABLE_MODALITIES.has(modality.trim().toUpperCase());
    };

    const fetchSeriesData = async (seriesId: string) => {
        const response = await fetch(`/api/orthanc/series/${seriesId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return (await response.json()) as OrthancSeriesResponse;
    };

    const fetchStudySeriesIds = async (studyId: string) => {
        const response = await fetch(`/api/orthanc/studies/${studyId}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as OrthancStudyResponse;
        return Array.isArray(data.Series) ? data.Series : [];
    };

    const buildCandidateSeriesIds = async (
        requestedSeriesId: string,
        requestedSeriesData: OrthancSeriesResponse,
    ) => {
        const candidates = [requestedSeriesId];
        const parentStudyId = requestedSeriesData.ParentStudy;

        if (!parentStudyId) {
            return candidates;
        }

        const studySeriesIds = await fetchStudySeriesIds(parentStudyId);
        studySeriesIds.forEach((candidateId) => {
            if (candidateId !== requestedSeriesId && !candidates.includes(candidateId)) {
                candidates.push(candidateId);
            }
        });

        return candidates;
    };

    const resetView = () => {
        clearAnnotations();

        try {
            resetViewports([VIEWPORT_ID]);
            activatePrimaryTool('Wwwc');
        } catch (error) {
            console.warn('No se pudo resetear el viewport:', error);
        }
    };

    const tryRenderSeriesCandidate = async (
        candidateSeriesId: string,
        seriesData: OrthancSeriesResponse,
        currentRequest: number,
    ) => {
        if (!Array.isArray(seriesData.Instances) || seriesData.Instances.length === 0) {
            failedSeriesRef.current.add(candidateSeriesId);
            return false;
        }

        if (!isLikelyRenderableModality(seriesData.MainDicomTags?.Modality)) {
            failedSeriesRef.current.add(candidateSeriesId);
            return false;
        }

        const dicomUrls = seriesData.Instances.map(
            (instanceId) => `/api/orthanc/instances/${instanceId}/file`,
        );

        const files = await Promise.all(
            dicomUrls.map(async (url, index) => {
                const fileResponse = await fetch(url, {
                    headers: {
                        Accept: 'application/dicom',
                    },
                });

                if (!fileResponse.ok) {
                    throw new Error(`No se pudo descargar ${url}`);
                }

                const blob = await fileResponse.blob();
                return new File([blob], `instance-${index}.dcm`, {
                    type: 'application/dicom',
                });
            }),
        );

        if (currentRequest !== loadRequestRef.current) {
            return false;
        }

        if (renderedSeriesUidRef.current) {
            clearImageCache(renderedSeriesUidRef.current);
            renderedSeriesUidRef.current = null;
        }

        resetImageManager();
        resetFileManager();

        const parsedSeriesStack = await readFiles(files);

        if (currentRequest !== loadRequestRef.current) {
            return false;
        }

        const parsedManager = asImageManager(parsedSeriesStack);
        const globalManager = getImageManager() as ImageManager;
        const managerToUse =
            parsedManager && Object.keys(parsedManager).length > 0
                ? parsedManager
                : globalManager;

        const targetSeries = pickSeries(managerToUse, seriesData.Instances.length);

        if (!targetSeries) {
            const parsedKeys = parsedManager ? Object.keys(parsedManager) : [];
            const globalKeys = globalManager ? Object.keys(globalManager) : [];
            console.warn(
                `Serie ${candidateSeriesId} sin stack renderizable. parsedKeys=${parsedKeys.length}, globalKeys=${globalKeys.length}`,
            );
            failedSeriesRef.current.add(candidateSeriesId);
            return false;
        }

        renderedSeriesUidRef.current = targetSeries.uniqueUID || targetSeries.seriesUID || null;
        await renderImage(targetSeries, VIEWPORT_ID, {
            cached: true,
            imageIndex: 0,
        });

        if (currentRequest !== loadRequestRef.current) {
            return false;
        }

        csToolsUpdateStack(VIEWPORT_ID, {
            imageIds: targetSeries.imageIds,
            currentImageIdIndex: 0,
        });

        ensureToolsInitialized();
        safeResizeViewport(VIEWPORT_ID);
        activatePrimaryTool('Wwwc');

        loadedSeriesIdRef.current = candidateSeriesId;
        loadingSeriesIdRef.current = null;
        setIsLoaded(true);
        failedSeriesRef.current.delete(candidateSeriesId);

        return true;
    };

    const loadSeries = async (seriesId: string) => {
        if (
            loadingSeriesIdRef.current === seriesId ||
            loadedSeriesIdRef.current === seriesId
        ) {
            return;
        }

        loadRequestRef.current += 1;
        const currentRequest = loadRequestRef.current;

        loadingSeriesIdRef.current = seriesId;
        loadedSeriesIdRef.current = null;
        setIsLoaded(false);
        clearAnnotations();

        try {
            const requestedSeriesData = await fetchSeriesData(seriesId);
            const candidateSeriesIds = await buildCandidateSeriesIds(seriesId, requestedSeriesData);

            for (const candidateSeriesId of candidateSeriesIds) {
                if (currentRequest !== loadRequestRef.current) {
                    return;
                }

                if (candidateSeriesId !== seriesId && failedSeriesRef.current.has(candidateSeriesId)) {
                    continue;
                }

                let candidateData = requestedSeriesData;
                if (candidateSeriesId !== seriesId) {
                    try {
                        candidateData = await fetchSeriesData(candidateSeriesId);
                    } catch (error) {
                        console.warn(`No se pudo consultar la serie ${candidateSeriesId}:`, error);
                        continue;
                    }
                }

                const rendered = await tryRenderSeriesCandidate(
                    candidateSeriesId,
                    candidateData,
                    currentRequest,
                );

                if (rendered) {
                    if (candidateSeriesId !== seriesId) {
                        console.warn(
                            `Serie ${seriesId} no renderizable. Se cargo automaticamente la serie ${candidateSeriesId}.`,
                        );
                        activeSeriesId.set(candidateSeriesId);
                    }
                    return;
                }
            }

            throw new Error('No se encontro una serie renderizable en Larvitar');
        } catch (error) {
            console.error('Error cargando serie con Larvitar:', error);
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

            const min = Number.isFinite(viewportData.minPixelValue)
                ? viewportData.minPixelValue
                : 0;
            const max = Number.isFinite(viewportData.maxPixelValue)
                ? viewportData.maxPixelValue
                : 1;

            if (max >= min) {
                setRange({ min, max });
            }

            if (viewportData.ready) {
                setIsLoaded(true);
            }

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
                try {
                    setToolDisabled(toolName, TOOL_VIEWPORTS);
                } catch {}

                overlayToolsStateRef.current[toolName] = false;
            });

            toolsInitializedRef.current = false;
            wheelZoomActiveRef.current = false;
            failedSeriesRef.current.clear();
        };
    }, []);

    const applyWindowLevel = (center: number, width: number) => {
        const viewportElement = document.getElementById(VIEWPORT_ID);
        if (!(viewportElement instanceof HTMLElement)) {
            return;
        }

        try {
            const viewport = cornerstone.getViewport(viewportElement);
            if (!viewport?.voi) {
                return;
            }

            viewport.voi.windowCenter = center;
            viewport.voi.windowWidth = Math.max(1, width);
            cornerstone.setViewport(viewportElement, viewport);
        } catch (error) {
            console.warn('No se pudo aplicar Window/Level:', error);
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
