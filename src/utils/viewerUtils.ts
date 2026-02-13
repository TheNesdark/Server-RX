/**
 * Sanitiza datos de entrada removiendo caracteres de control y limitando longitud
 */
export function sanitizeString(input: string | undefined, maxLength: number = 255): string {
    if (!input || typeof input !== 'string') return '';
    return input.replace(/[\x00-\x1F\x7F-\x9F]/g, '').substring(0, maxLength);
}

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
