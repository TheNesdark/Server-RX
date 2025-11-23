import { App, AppOptions, ViewConfig, ToolConfig, toolList } from "https://esm.sh/dwv";

let layerGroup;
const DICOMURL = [
    "https://raw.githubusercontent.com/ivmartel/dwv/master/tests/data/bbmri-53323851.dcm"
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
    Opacity: new ToolConfig(),
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
    Filter: {
        options: [
            "Threshold",
            "Sobel", 
            "Sharpen"
        ]
    },
    Brush: new ToolConfig(),
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

// Filter tool elements
const filterBtn = document.querySelector(".filter-btn");
const filterMenu = document.querySelector(".filter-options-menu");
const filterContainer = document.querySelector(".filter-tool-container");

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
        } else if (title === "Opacity") {
            app.setTool("Opacity");
            this.classList.add("active");
        } else if (title === "Brush") {
            app.setTool("Brush");
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

// Toggle dropdown menu for filter tool
filterBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    filterMenu.classList.toggle("show");
});

// Close dropdowns when clicking outside
document.addEventListener("click", (e) => {
    if (!drawContainer?.contains(e.target)) {
        drawMenu?.classList.remove("show");
    }
    if (!filterContainer?.contains(e.target)) {
        filterMenu?.classList.remove("show");
    }
});

// Helper function to clear all annotations
function clearAllAnnotations() {
    const drawLayer = layerGroup.getActiveDrawLayer();
    const drawController = drawLayer.getDrawController();
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

// Handle filter selection
document.querySelectorAll(".filter-option").forEach((option) => {
    option.addEventListener("click", (e) => {
        e.stopPropagation();
        const filterName = option.getAttribute("data-filter");
        const btnText = filterBtn.querySelector("span");

        // Activate filter tool
        app.setTool("Filter");
        app.setToolFeatures({ filterName: filterName });

        // Update UI
        clearActiveButtons();
        filterBtn.classList.add("active");

        // Update button text to show selected filter
        btnText.textContent = `Filter: ${filterName}`;

        // Close menu
        filterMenu.classList.remove("show");
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

        // Resetear el display y volver a NoneTool
        app.resetLayout();
        app.setTool("None");

        // Resetear el texto del botón Draw
        const drawBtnText = drawBtn?.querySelector("span");
        drawBtnText.textContent = "Draw";

        // Resetear el texto del botón Filter
        const filterBtnText = filterBtn?.querySelector("span");
        filterBtnText.textContent = "Filter";
    });
