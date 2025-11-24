import type { App } from "dwv";
import { clearActiveButtons, clearAllAnnotations } from "../utils/viewerUtils";

/**
 * Configura los event listeners para los botones de herramientas
 */
export function setupToolButtons(app: App): void {
    document.querySelectorAll(".tool-btn").forEach((btn) => {
        btn.addEventListener("click", function (this: HTMLElement) {
            const title = this.getAttribute("title");
            clearActiveButtons();

            switch (title) {
                case "Zoom & Pan":
                    app.setTool("ZoomAndPan");
                    this.classList.add("active");
                    break;
                case "Levels":
                    app.setTool("WindowLevel");
                    this.classList.add("active");
                    break;
                case "Stack Scroll":
                    app.setTool("Scroll");
                    this.classList.add("active");
                    break;
                case "Floodfill":
                    app.setTool("Floodfill");
                    this.classList.add("active");
                    break;
                case "Livewire":
                    app.setTool("Livewire");
                    this.classList.add("active");
                    break;
                case "Close":
                    window.location.href = "/";
                    break;
            }
        });
    });
}

/**
 * Configura el menú desplegable del botón Draw
 */
export function setupDrawMenu(): void {
    const drawBtn = document.querySelector<HTMLElement>(".draw-btn");
    const drawMenu = document.querySelector<HTMLElement>(".draw-shapes-menu");
    const drawContainer = document.querySelector<HTMLElement>(".draw-tool-container");

    // Toggle draw menu cuando se hace clic en el botón
    drawBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        drawMenu?.classList.toggle("show");
    });

    // Cerrar el menú cuando se hace clic fuera
    document.addEventListener("click", (e) => {
        if (!drawContainer?.contains(e.target as HTMLElement)) {
            drawMenu?.classList.remove("show");
        }
    });
}

/**
 * Configura los event listeners para las opciones de formas del menú Draw
 */
export function setupShapeOptions(app: App): void {
    const drawBtn = document.querySelector<HTMLElement>(".draw-btn");
    const drawMenu = document.querySelector<HTMLElement>(".draw-shapes-menu");

    document.querySelectorAll(".shape-option").forEach((option) => {
        option.addEventListener("click", (e) => {
            e.stopPropagation();
            const action = option.getAttribute("data-action");
            const btnText = drawBtn?.querySelector("span");
            const shapeName = option.getAttribute("data-shape");

            if (action === "clear") {
                handleClearAction(app, btnText, drawMenu);
                return;
            }

            handleShapeSelection(app, shapeName, btnText, drawMenu, drawBtn);
        });
    });
}

/**
 * Maneja la acción de limpiar todas las anotaciones
 */
function handleClearAction(
    app: App,
    btnText: Element | null | undefined,
    drawMenu: HTMLElement | null
): void {
    clearAllAnnotations(app);
    app.setTool("None");
    if (btnText) btnText.textContent = "Draw";
    drawMenu?.classList.remove("show");
}

/**
 * Maneja la selección de una forma para dibujar
 */
function handleShapeSelection(
    app: App,
    shapeName: string | null,
    btnText: Element | null | undefined,
    drawMenu: HTMLElement | null,
    drawBtn: HTMLElement | null
): void {
    // Activar herramienta de dibujo
    app.setTool("Draw");
    app.setToolFeatures({ shapeName: shapeName });

    // Actualizar UI
    clearActiveButtons();
    drawBtn?.classList.add("active");

    // Actualizar texto del botón
    if (btnText) btnText.textContent = `Draw: ${shapeName}`;

    // Cerrar menú
    drawMenu?.classList.remove("show");
}

/**
 * Configura el botón de Reset
 */
export function setupResetButton(app: App): void {
    const drawBtn = document.querySelector<HTMLElement>(".draw-btn");

    document
        .querySelector(".tool-btn[title='Reset']")
        ?.addEventListener("click", () => {
            // Limpiar estados activos
            clearActiveButtons();

            // Limpiar anotaciones
            clearAllAnnotations(app);

            // Resetear vista completa
            app.resetLayout();      // Resetea el layout
            app.resetZoomPan();     // Resetea zoom y pan
            app.resetDisplay();     // Resetea window/level (contraste)
            app.setTool("None");    // Desactiva herramientas

            // Resetear texto del botón Draw
            const drawBtnText = drawBtn?.querySelector("span");
            if (drawBtnText) drawBtnText.textContent = "Draw";
        });
}

/**
 * Configura el modal de ayuda
 */
export function setupHelpModal(): void {
    const helpBtn = document.querySelector(".help-btn");
    const modal = document.getElementById("help-modal");
    const closeBtn = document.querySelector(".modal-close");

    // Abrir modal
    helpBtn?.addEventListener("click", () => {
        modal?.classList.add("show");
    });

    // Cerrar modal con botón X
    closeBtn?.addEventListener("click", () => {
        modal?.classList.remove("show");
    });

    // Cerrar modal al hacer clic fuera del contenido
    modal?.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("show");
        }
    });

    // Cerrar modal con tecla Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal?.classList.contains("show")) {
            modal.classList.remove("show");
        }
    });
}
