import type { App } from "dwv";
import { clearActiveButtons, clearAllAnnotations } from "@/utils/viewerUtils";


export function setupToolButtons(app: App): void {
    document.querySelectorAll(".tool-btn").forEach((btn) => {
        btn.addEventListener("click", function (this: HTMLElement) {
            const title = this.getAttribute("title");
            
            // No procesar botones especiales
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
                case "Livewire":
                    app.setTool("Livewire");
                    this.classList.add("active");
                    break;
            }
        });
    });

    // Botón Close
    document.querySelector(".tool-btn[title='Close']")?.addEventListener("click", () => {
        window.location.href = "/";
    });
}

export function setupDrawMenu(app: App): void {
    const drawBtn = document.querySelector<HTMLElement>(".draw-btn");
    const drawMenu = document.querySelector<HTMLElement>(".draw-shapes-menu");
    const drawContainer = document.querySelector<HTMLElement>(".draw-tool-container");

    if (!drawBtn || !drawMenu) {
        console.warn("⚠️ No se encontró el botón o menú de dibujo");
        return;
    }

    // Toggle del menú al hacer clic en el botón
    drawBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Evita que el clic llegue al document
        const isShown = drawMenu.classList.contains("show");
        
        // Cerramos todos los menús primero (por si hubiera otros)
        document.querySelectorAll(".draw-shapes-menu").forEach(m => m.classList.remove("show"));
        
        if (!isShown) {
            drawMenu.classList.add("show");
            console.log("Menu Draw mostrado");
        } else {
            drawMenu.classList.remove("show");
            console.log("Menu Draw ocultado");
        }
    });

    // Cerrar el menú si se hace clic fuera
    document.addEventListener("click", (e) => {
        if (drawMenu.classList.contains("show") && !drawContainer?.contains(e.target as HTMLElement)) {
            drawMenu.classList.remove("show");
            console.log("Menu Draw cerrado por clic externo");
        }
    });

    // Opciones de formas
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
                console.log(`Herramienta Draw activada con forma: ${shapeName}`);
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
        app.setTool("None")
        console.log("Reset button clicked");
        const drawBtnText = drawBtn?.querySelector("span");
        if (drawBtnText) drawBtnText.textContent = "Draw";
    });
}

export function setupSidebarToggle(): void {
    document.querySelector(".sidebar-toggle")?.addEventListener("click", () => {
        document.querySelector(".thumbnails-sidebar")?.classList.toggle("collapsed");
    });
}
