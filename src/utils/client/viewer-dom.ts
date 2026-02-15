/**
 * Limpia el estado activo de todos los botones de herramientas
 */
export function clearActiveButtons(): void {
    document
    .querySelectorAll(".tool-btn:not([data-overlay-tool='true'])")
        .forEach((b) => b.classList.remove("active"));
}

/**
 * Limpia todas las anotaciones del visor DICOM
 */
export function clearAllAnnotations(): void {
    if (typeof window === 'undefined') {
        return;
    }

    void import('larvitar')
        .then(({ clearMeasurements }) => {
            clearMeasurements();
        })
        .catch((error) => {
            console.warn('No se pudieron limpiar las anotaciones:', error);
        });
}
