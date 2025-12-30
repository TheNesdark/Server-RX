import type { App } from "dwv";

const SHAPE_TYPES = [
    "Arrow",
    "Ruler", 
    "Circle",
    "Ellipse",
    "Rectangle",
    "Protractor",
    "Roi",
] as const;

/**
 * Sanitiza datos de entrada removiendo caracteres de control y limitando longitud
 */
export function sanitizeString(input: string | undefined, maxLength: number = 255): string {
    if (!input || typeof input !== 'string') return '';
    return input.replace(/[\x00-\x1F\x7F-\x9F]/g, '').substring(0, maxLength);
}

const getDrawController = (app: App) => {
    const layerGroup = app.getLayerGroupByDivId("layerGroup0");
    const drawLayer = layerGroup?.getActiveDrawLayer();
    return drawLayer?.getDrawController();
};

const removeAnnotationsForShape = (app: App, drawController: any, shapeName: string) => {
    app.setToolFeatures({ shapeName });
    drawController.removeAllAnnotationsWithCommand(app.addToUndoStack);
};

/**
 * Limpia el estado activo de todos los botones de herramientas
 */
export function clearActiveButtons(): void {
    document
        .querySelectorAll(".tool-btn")
        .forEach((b) => b.classList.remove("active"));
}

/**
 * Limpia todas las anotaciones del visor DICOM
 */
export function clearAllAnnotations(app: App): void {
    const drawController = getDrawController(app);
    if (!drawController) return;

    SHAPE_TYPES.forEach((shapeName) => {
        removeAnnotationsForShape(app, drawController, shapeName);
    });

    app.setTool("None");
}
