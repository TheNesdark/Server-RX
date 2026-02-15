import { clearActiveButtons } from "@/utils/client";
import type { ViewerDrawShape, ViewerOverlayTool, ViewerToolController } from "@/types";
import { TOOL_ACTIONS } from "@/types";

const OVERLAY_TOOLS: ViewerOverlayTool[] = ["ScaleOverlay"];

export function setupToolButtons(controller: ViewerToolController): () => void {
    const buttons = document.querySelectorAll<HTMLElement>(".tool-btn");
    const cleanupTasks: Array<() => void> = [];

    buttons.forEach((btn) => {
        const handleClick = () => {
            const toolTitle = btn.getAttribute("title");
            if (!toolTitle) return;

            // 1. Acciones especiales
            if (toolTitle === "Close") return (window.location.href = "/");
            if (["Draw", "Reset", "Ayuda", "Compartir"].includes(toolTitle)) return;

            // 2. Herramientas de Capas (Overlays)
            if (OVERLAY_TOOLS.includes(toolTitle as ViewerOverlayTool)) {
                const isEnabled = controller.toggleOverlayTool(toolTitle as ViewerOverlayTool);
                return btn.classList.toggle("active", isEnabled);
            }

            // 3. Herramientas Principales
            const toolName = TOOL_ACTIONS[toolTitle as keyof typeof TOOL_ACTIONS];
            if (!toolName) return;

            // Si se pulsa Zoom y ya está activo, volvemos al scroll normal
            if (toolName === "ZoomPan" && btn.classList.contains("active")) {
                clearActiveButtons();
                return controller.activatePrimaryTool("StackScroll");
            }

            clearActiveButtons();
            controller.activatePrimaryTool(toolName);
            btn.classList.add("active");
        };

        btn.addEventListener("click", handleClick);
        cleanupTasks.push(() => btn.removeEventListener("click", handleClick));
    });

    return () => cleanupTasks.forEach((cleanup) => cleanup());
}

export function setupDrawMenu(controller: ViewerToolController): () => void {
    const drawBtn = document.querySelector<HTMLElement>(".draw-btn");
    const drawMenu = document.querySelector<HTMLElement>(".draw-shapes-menu");
    if (!drawBtn || !drawMenu) return () => {};

    const toggleMenu = (e: Event) => {
        e.stopPropagation();
        drawMenu.classList.toggle("show");
    };

    const handleMenuSelection = (e: Event) => {
        const option = (e.target as HTMLElement).closest(".shape-option") as HTMLElement;
        if (!option) return;

        const action = option.getAttribute("data-action");
        const shape = option.getAttribute("data-shape") as ViewerDrawShape;
        const btnText = drawBtn.querySelector("span");

        if (action === "clear") {
            controller.clearAnnotations();
            if (btnText) btnText.textContent = "Draw";
        } else if (shape) {
            clearActiveButtons();
            controller.activateDrawShape(shape);
            drawBtn.classList.add("active");
            if (btnText) btnText.textContent = `Draw: ${shape}`;
        }
        drawMenu.classList.remove("show");
    };

    const closeOnOutsideClick = () => drawMenu.classList.remove("show");

    drawBtn.addEventListener("click", toggleMenu);
    drawMenu.addEventListener("click", handleMenuSelection);
    document.addEventListener("click", closeOnOutsideClick);

    return () => {
        drawBtn.removeEventListener("click", toggleMenu);
        drawMenu.removeEventListener("click", handleMenuSelection);
        document.removeEventListener("click", closeOnOutsideClick);
    };
}

export function setupResetButton(controller: ViewerToolController): () => void {
    const resetBtn = document.querySelector<HTMLElement>(".tool-btn[title='Reset']");
    if (!resetBtn) return () => {};

    const h = () => {
        clearActiveButtons();
        controller.clearAnnotations();
        controller.resetView();
        const drawSpan = document.querySelector(".draw-btn span");
        if (drawSpan) drawSpan.textContent = "Draw";
    };

    resetBtn.addEventListener("click", h);
    return () => resetBtn.removeEventListener("click", h);
}

export function setupSidebarToggle(): void {
    document.querySelector(".sidebar-toggle")?.addEventListener("click", () => {
        document.querySelector(".thumbnails-sidebar")?.classList.toggle("collapsed");
    });
}
