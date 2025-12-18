import type { App } from "dwv";

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
    const layerGroup = app.getLayerGroupByDivId("layerGroup0");
    if (!layerGroup) return;

    const drawLayer = layerGroup.getActiveDrawLayer();
    if (!drawLayer) return;

    const drawController = drawLayer.getDrawController();
    if (!drawController) return;

    const allShapes = [
        "Arrow",
        "Ruler",
        "Circle",
        "Ellipse",
        "Rectangle",
        "Protractor",
        "Roi",
    ];

    allShapes.forEach((shapeName) => {
        app.setToolFeatures({ shapeName: shapeName });
        drawController.removeAllAnnotationsWithCommand(app.addToUndoStack);
    });

    app.setTool("None")
}
