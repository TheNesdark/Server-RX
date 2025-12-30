import type { App } from "dwv";
import { clearActiveButtons, clearAllAnnotations } from "@/utils";
import type { DWVEventCallbacks, DataRange, WindowLevel } from "@/types";
import { TOOL_ACTIONS } from "@/types";

const handleToolClick = (app: App, element: HTMLElement) => {
    const title = element.getAttribute("title");
    if (!title || ["Draw", "Reset", "Ayuda", "Close"].includes(title)) return;
    
    clearActiveButtons();
    const toolName = TOOL_ACTIONS[title as keyof typeof TOOL_ACTIONS];
    if (toolName) {
        app.setTool(toolName);
        element.classList.add("active");
    }
};

const handleDrawMenuClick = (app: App, drawBtn: HTMLElement, drawMenu: HTMLElement) => {
    return (e: Event) => {
        e.stopPropagation();
        const isShown = drawMenu.classList.contains("show");
        document.querySelectorAll(".draw-shapes-menu").forEach(m => m.classList.remove("show"));
        if (!isShown) drawMenu.classList.add("show");
    };
};

const handleShapeOptionClick = (app: App, drawBtn: HTMLElement, drawMenu: HTMLElement) => {
    return (e: Event) => {
        e.stopPropagation();
        const target = e.target as HTMLElement;
        const action = target.getAttribute("data-action");
        const shapeName = target.getAttribute("data-shape");
        const btnText = drawBtn.querySelector("span");

        if (action === "clear") {
            clearAllAnnotations(app);
            if (btnText) btnText.textContent = "Draw";
            drawMenu.classList.remove("show");
            return;
        }

        if (shapeName) {
            app.setTool("Draw");
            app.setToolFeatures({ shapeName });
            clearActiveButtons();
            drawBtn.classList.add("active");
            if (btnText) btnText.textContent = `Draw: ${shapeName}`;
            drawMenu.classList.remove("show");
        }
    };
};

export function setupToolButtons(app: App): void {
    document.querySelectorAll(".tool-btn").forEach((btn) => {
        btn.addEventListener("click", function (this: HTMLElement) {
            handleToolClick(app, this);
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

    drawBtn.addEventListener("click", handleDrawMenuClick(app, drawBtn, drawMenu));

    document.addEventListener("click", (e) => {
        if (drawMenu.classList.contains("show") && drawContainer && e.target instanceof HTMLElement && !drawContainer.contains(e.target)) {
            drawMenu.classList.remove("show");
        }
    });

    document.querySelectorAll(".shape-option").forEach((option) => {
        option.addEventListener("click", handleShapeOptionClick(app, drawBtn, drawMenu));
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

const getActiveViewController = (app: App) => {
    const layerGroup = app.getLayerGroupByDivId('layerGroup0');
    const viewLayer = layerGroup?.getActiveViewLayer();
    return viewLayer?.getViewController();
};

const handleWindowLevelChange = (app: App, callback: (center: number, width: number) => void) => {
    return () => {
        const viewController = getActiveViewController(app);
        if (viewController) {
            const wl = viewController.getWindowLevel();
            callback(wl.center, wl.width);
        }
    };
};

const handleLoad = (app: App, callback: (dataRange: { min: number, max: number }, wl: { center: number, width: number }) => void) => {
    return () => {
        const viewController = getActiveViewController(app);
        if (viewController) {
            const dataRange = viewController.getImageRescaledDataRange() as DataRange;
            const currentWL = viewController.getWindowLevel() as WindowLevel;
            callback(
                { min: dataRange.min, max: dataRange.max },
                { center: currentWL.center, width: currentWL.width }
            );
        }
    };
};

/**
 * Registra todos los event listeners de DWV
 */
export function setupDWVEventListeners(app: App, callbacks: DWVEventCallbacks) {
    app.addEventListener('window-level-change', handleWindowLevelChange(app, callbacks.onWindowLevelChange));
    app.addEventListener('load-item', callbacks.onLoadItem);
    app.addEventListener('load', handleLoad(app, callbacks.onLoad));
}
