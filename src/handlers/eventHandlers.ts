import { clearActiveButtons } from "@/utils";
import type { ViewerDrawShape, ViewerOverlayTool, ViewerToolController } from "@/types";
import { TOOL_ACTIONS } from "@/types";

const DRAW_SHAPES: ViewerDrawShape[] = [
    "Arrow",
    "ArrowAnnotate",
    "Ruler",
    "Circle",
    "Ellipse",
    "Rectangle",
    "Protractor",
    "Roi",
    "Eraser",
];

const isViewerDrawShape = (value: string): value is ViewerDrawShape => {
    return DRAW_SHAPES.includes(value as ViewerDrawShape);
};

const OVERLAY_TOOLS: ViewerOverlayTool[] = [
    "OrientationMarkers",
    "ScaleOverlay",
];

const isViewerOverlayTool = (value: string): value is ViewerOverlayTool => {
    return OVERLAY_TOOLS.includes(value as ViewerOverlayTool);
};

const handleToolClick = (controller: ViewerToolController, element: HTMLElement) => {
    const title = element.getAttribute("title");
    if (!title || ["Draw", "Reset", "Ayuda", "Close", "Compartir"].includes(title)) {
        return;
    }

    if (isViewerOverlayTool(title)) {
        const isEnabled = controller.toggleOverlayTool(title);
        element.classList.toggle("active", isEnabled);
        return;
    }

    const toolName = TOOL_ACTIONS[title as keyof typeof TOOL_ACTIONS];
    if (!toolName) {
        return;
    }

    clearActiveButtons();
    controller.activatePrimaryTool(toolName);
    element.classList.add("active");
};

const handleDrawMenuClick = (drawMenu: HTMLElement) => {
    return (event: Event) => {
        event.stopPropagation();
        const isShown = drawMenu.classList.contains("show");
        document.querySelectorAll(".draw-shapes-menu").forEach((menu) => {
            menu.classList.remove("show");
        });

        if (!isShown) {
            drawMenu.classList.add("show");
        }
    };
};

const handleShapeOptionClick = (
    controller: ViewerToolController,
    drawBtn: HTMLElement,
    drawMenu: HTMLElement,
) => {
    return (event: Event) => {
        event.stopPropagation();
        const target = event.currentTarget;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const action = target.getAttribute("data-action");
        const shapeName = target.getAttribute("data-shape");
        const btnText = drawBtn.querySelector("span");

        if (action === "clear") {
            controller.clearAnnotations();
            if (btnText) {
                btnText.textContent = "Draw";
            }
            drawMenu.classList.remove("show");
            return;
        }

        if (!shapeName || !isViewerDrawShape(shapeName)) {
            return;
        }

        clearActiveButtons();
        controller.activateDrawShape(shapeName);
        drawBtn.classList.add("active");
        if (btnText) {
            btnText.textContent = `Draw: ${shapeName}`;
        }
        drawMenu.classList.remove("show");
    };
};

export function setupToolButtons(controller: ViewerToolController): () => void {
    const cleanupCallbacks: Array<() => void> = [];

    document.querySelectorAll<HTMLElement>(".tool-btn").forEach((button) => {
        const handler = () => {
            handleToolClick(controller, button);
        };

        button.addEventListener("click", handler);
        cleanupCallbacks.push(() => {
            button.removeEventListener("click", handler);
        });
    });

    const closeButton = document.querySelector<HTMLElement>(".tool-btn[title='Close']");
    if (closeButton) {
        const closeHandler = () => {
            window.location.href = "/";
        };

        closeButton.addEventListener("click", closeHandler);
        cleanupCallbacks.push(() => {
            closeButton.removeEventListener("click", closeHandler);
        });
    }

    return () => {
        cleanupCallbacks.forEach((cleanup) => {
            cleanup();
        });
    };
}

export function setupDrawMenu(controller: ViewerToolController): () => void {
    const drawBtn = document.querySelector<HTMLElement>(".draw-btn");
    const drawMenu = document.querySelector<HTMLElement>(".draw-shapes-menu");
    const drawContainer = document.querySelector<HTMLElement>(".draw-tool-container");

    if (!drawBtn || !drawMenu) {
        return () => {};
    }

    const drawButtonHandler = handleDrawMenuClick(drawMenu);
    drawBtn.addEventListener("click", drawButtonHandler);

    const onOutsideClick = (event: Event) => {
        if (
            drawMenu.classList.contains("show") &&
            drawContainer &&
            event.target instanceof HTMLElement &&
            !drawContainer.contains(event.target)
        ) {
            drawMenu.classList.remove("show");
        }
    };

    document.addEventListener("click", onOutsideClick);

    const shapeListeners: Array<() => void> = [];
    document.querySelectorAll<HTMLElement>(".shape-option").forEach((option) => {
        const shapeHandler = handleShapeOptionClick(controller, drawBtn, drawMenu);
        option.addEventListener("click", shapeHandler);
        shapeListeners.push(() => {
            option.removeEventListener("click", shapeHandler);
        });
    });

    return () => {
        drawBtn.removeEventListener("click", drawButtonHandler);
        document.removeEventListener("click", onOutsideClick);
        shapeListeners.forEach((cleanup) => {
            cleanup();
        });
    };
}

export function setupResetButton(controller: ViewerToolController): () => void {
    const drawBtn = document.querySelector<HTMLElement>(".draw-btn");
    const resetButton = document.querySelector<HTMLElement>(".tool-btn[title='Reset']");

    if (!resetButton) {
        return () => {};
    }

    const resetHandler = () => {
        clearActiveButtons();
        controller.clearAnnotations();
        controller.resetView();

        const drawBtnText = drawBtn?.querySelector("span");
        if (drawBtnText) {
            drawBtnText.textContent = "Draw";
        }
    };

    resetButton.addEventListener("click", resetHandler);

    return () => {
        resetButton.removeEventListener("click", resetHandler);
    };
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
