import type { App } from "dwv";
import { clearActiveButtons, clearAllAnnotations } from "@/utils/viewerUtils";

interface DWVEventCallbacks {
    onWindowLevelChange: (center: number, width: number) => void;
    onLoad: (dataRange: { min: number, max: number }, wl: { center: number, width: number }) => void;
    onLoadItem: () => void;
}

interface DataRange {
    min: number;
    max: number;
}

interface WindowLevel {
    center: number;
    width: number;
}

export function setupToolButtons(app: App): void {
    document.querySelectorAll(".tool-btn").forEach((btn) => {
        btn.addEventListener("click", function (this: HTMLElement) {
            const title = this.getAttribute("title");
            
            if (title === "Draw" || title === "Reset" || title === "Ayuda" || title === "Close") return;
            
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
                case "Floodfill":
                    app.setTool("Floodfill");
                    this.classList.add("active");
                    break;
            }
        });
    });

    document.querySelector(".tool-btn[title='Close']")?.addEventListener("click", () => {
        window.location.href = "/";
    });
}

export function setupDrawMenu(app: App): void {
    const drawBtn = document.querySelector<HTMLElement>(".draw-btn");
    const drawMenu = document.querySelector<HTMLElement>(".draw-shapes-menu");
    const drawContainer = document.querySelector<HTMLElement>(".draw-tool-container");

    if (!drawBtn || !drawMenu) return;

    drawBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isShown = drawMenu.classList.contains("show");
        document.querySelectorAll(".draw-shapes-menu").forEach(m => m.classList.remove("show"));
        if (!isShown) drawMenu.classList.add("show");
    });

    document.addEventListener("click", (e) => {
        if (drawMenu.classList.contains("show") && drawContainer && e.target instanceof HTMLElement && !drawContainer.contains(e.target)) {
            drawMenu.classList.remove("show");
        }
    });

    document.querySelectorAll(".shape-option").forEach((option) => {
        option.addEventListener("click", (e) => {
            e.stopPropagation();
            const action = option.getAttribute("data-action");
            const shapeName = option.getAttribute("data-shape");
            const btnText = drawBtn.querySelector("span");

            if (action === "clear") {
                clearAllAnnotations(app);
                if (btnText) btnText.textContent = "Draw";
                drawMenu.classList.remove("show");
                return;
            }

            if (shapeName) {
                app.setTool("Draw");
                app.setToolFeatures({ shapeName: shapeName });
                clearActiveButtons();
                drawBtn.classList.add("active");
                if (btnText) btnText.textContent = `Draw: ${shapeName}`;
                drawMenu.classList.remove("show");
            }
        });
    });
}

export function setupResetButton(app: App): void {
    const drawBtn = document.querySelector<HTMLElement>(".draw-btn");
    document.querySelector(".tool-btn[title='Reset']")?.addEventListener("click", () => {
        clearActiveButtons();
        clearAllAnnotations(app);
        app.resetDisplay();
        app.setTool("None");
        const drawBtnText = drawBtn?.querySelector("span");
        if (drawBtnText) drawBtnText.textContent = "Draw";
    });
}

export function setupSidebarToggle(): void {
    const sidebarToggle = document.querySelector(".sidebar-toggle");
    const thumbnailsSidebar = document.querySelector(".thumbnails-sidebar");
    
    if (sidebarToggle && thumbnailsSidebar) {
        sidebarToggle.addEventListener("click", () => {
            thumbnailsSidebar.classList.toggle("collapsed");
        });
    }
}

/**
 * Registra todos los event listeners de DWV
 */
export function setupDWVEventListeners(app: App, callbacks: DWVEventCallbacks) {
    app.addEventListener('window-level-change', () => {
        const layerGroup = app.getLayerGroupByDivId('layerGroup0');
        if (layerGroup) {
            const viewLayer = layerGroup.getActiveViewLayer();
            if (viewLayer) {
                const wl = viewLayer.getViewController().getWindowLevel();
                callbacks.onWindowLevelChange(wl.center, wl.width);
            }
        }
    });

    app.addEventListener('load-item', () => {
        callbacks.onLoadItem();
    });

    app.addEventListener('load', () => {
        const layerGroup = app.getLayerGroupByDivId('layerGroup0');
        if (layerGroup) {
            const viewLayer = layerGroup.getActiveViewLayer();
            if (viewLayer) {
                const viewController = viewLayer.getViewController();
                const dataRange = viewController.getImageRescaledDataRange() as DataRange;
                const currentWL = viewController.getWindowLevel() as WindowLevel;
                callbacks.onLoad(
                    { min: dataRange.min, max: dataRange.max },
                    { center: currentWL.center, width: currentWL.width }
                );
            }
        }
    });
}
