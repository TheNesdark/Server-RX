import { App, AppOptions, ViewConfig, ToolConfig, toolList } from "https://esm.sh/dwv";

let layerGroup;
const DICOMURL = [
     'https://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323851.dcm',
  'https://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323707.dcm',
  'https://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323563.dcm'
];

class NoneTool {
    constructor(app) {
        this.app = app;
    }
    activate(bool) {
    }
    init() {
    }
    setFeatures(features) {
    }
}

toolList["None"] = NoneTool;

const app = new App();
const viewConfig0 = new ViewConfig("layerGroup0");
const viewConfigs = { "*": [viewConfig0] };
const options = new AppOptions(viewConfigs);
options.tools = {
    None: new ToolConfig(),
    Scroll: new ToolConfig(),
    WindowLevel: new ToolConfig(),
    ZoomAndPan: new ToolConfig(),
    Draw: {
        options: [
            "Arrow",
            "Ruler",
            "Circle",
            "Ellipse",
            "Rectangle",
            "Protractor",
            "Roi",
        ],
    },
    Floodfill: new ToolConfig(),
    Livewire: new ToolConfig()
};

app.init(options);
app.loadURLs(DICOMURL);

// Thumbnail App (Instancia separada)
const thumbApp = new App();
const thumbViewConfig = new ViewConfig("layerGroup1");
const thumbViewConfigs = { "*": [thumbViewConfig] };
const thumbOptions = new AppOptions(thumbViewConfigs);

thumbApp.init(thumbOptions);
thumbApp.loadURLs(DICOMURL);

app.addEventListener("load", function () {
    layerGroup = app.getLayerGroupByDivId("layerGroup0");
});

app.addEventListener("error", () => {
    alert("Error al cargar la imagen DICOM");
});

let currentShape = "Circle"; // Forma por defecto
const drawBtn = document.querySelector(".draw-btn");
const drawMenu = document.querySelector(".draw-shapes-menu");
const drawContainer = document.querySelector(".draw-tool-container");

// Helper function to clear active state from all buttons
function clearActiveButtons() {
    document
        .querySelectorAll(".tool-btn")
        .forEach((b) => b.classList.remove("active"));
}

document.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
        const title = this.getAttribute("title");
        clearActiveButtons();

        if (title === "Zoom & Pan") {
            app.setTool("ZoomAndPan");
            this.classList.add("active");
        } else if (title === "Levels") {
            app.setTool("WindowLevel");
            this.classList.add("active");
        } else if (title === "Stack Scroll") {
            app.setTool("Scroll");
            this.classList.add("active");
        } else if (title === "Floodfill") {
            app.setTool("Floodfill");
            this.classList.add("active");
        } else if (title === "Livewire") {
            app.setTool("Livewire");
            this.classList.add("active");
        } else if (title === "Close") {
            window.location.href = "/";
            return;
        }
    });
});

// Sidebar toggle
document
    .querySelector(".sidebar-toggle")
    ?.addEventListener("click", () => {
        document
            .querySelector(".thumbnails-sidebar")
            .classList.toggle("collapsed");
    });

// Toggle dropdown menu for draw tool
drawBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    drawMenu.classList.toggle("show");
});

// Close dropdowns when clicking outside
document.addEventListener("click", (e) => {
    if (!drawContainer?.contains(e.target)) {
        drawMenu?.classList.remove("show");
    }
});

// Helper function to clear all annotations
function clearAllAnnotations() {
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
        drawController.removeAllAnnotationsWithCommand(
            app.addToUndoStack,
        );
    });

}

// Handle shape selection and clear action
document.querySelectorAll(".shape-option").forEach((option) => {
    option.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = option.getAttribute("data-action");
        const btnText = drawBtn.querySelector("span");
        const shapeName = option.getAttribute("data-shape");
        currentShape = shapeName;
        if (action === "clear") {
            clearAllAnnotations();
            app.setTool("None");
            btnText.textContent = "Draw";
            drawMenu.classList.remove("show");
            return;
        }

        // Activate draw tool
        app.setTool("Draw");
        app.setToolFeatures({ shapeName: shapeName });

        // Update UI
        clearActiveButtons();
        drawBtn.classList.add("active");

        // Update button text to show selected shape
        btnText.textContent = `Draw: ${shapeName}`;

        // Close menu
        drawMenu.classList.remove("show");
    });
});

// Reset button - Al final para tener acceso a todas las variables
document
    .querySelector(".tool-btn[title='Reset']")
    ?.addEventListener("click", () => {
        // Limpiar todos los estados activos
        clearActiveButtons();

        // Limpiar anotaciones
        clearAllAnnotations();

        // Resetear el display completo: zoom, pan, opacidad y niveles de ventana
        app.resetLayout();
        app.resetZoomPan();
        app.setTool("None");


        // Resetear el texto del botón Draw
        const drawBtnText = drawBtn?.querySelector("span");
        drawBtnText.textContent = "Draw";
    });