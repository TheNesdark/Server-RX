/**
 * DICOM Viewer - Script Principal
 * 
 * Este archivo inicializa el visor DICOM y configura todos los event handlers
 * para las herramientas de visualización y anotación.
 */

import { toolList } from "dwv";
import { NoneTool } from "../tools/dwvTools";
import { loadDicomData } from "../utils/dicomLoader";
import { displayStudyInfo } from "../utils/studyInfo";
import { createMainApp, createThumbnailApp } from "../config/dwvConfig";
import {
    setupToolButtons,
    setupDrawMenu,
    setupShapeOptions,
    setupResetButton,
    setupHelpModal,
    setupSidebarToggle
} from "../handlers/eventHandlers";

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

// Registrar herramienta personalizada "None"
toolList["None"] = NoneTool;

// Cargar URLs de archivos DICOM y datos del estudio
const { urls: dicomUrls, studyData } = await loadDicomData();

// Mostrar información del estudio en la UI
displayStudyInfo(studyData);

// Crear aplicación principal
const app = createMainApp(dicomUrls);

// Crear aplicación de thumbnails
const thumbApp = createThumbnailApp(dicomUrls);

// ============================================================================
// EVENT LISTENERS DE LA APLICACIÓN
// ============================================================================

app.addEventListener("load", () => {
    console.log("DICOM image loaded successfully");
});

app.addEventListener("error", () => {
    alert("Error al cargar la imagen DICOM");
});

// ============================================================================
// CONFIGURACIÓN DE CONTROLES DE UI
// ============================================================================

// Configurar botones de herramientas (Zoom, Pan, Levels, etc.)
setupToolButtons(app);

// Configurar menú desplegable del botón Draw
setupDrawMenu();

// Configurar opciones de formas (Arrow, Circle, etc.)
setupShapeOptions(app);

// Configurar botón de Reset
setupResetButton(app);

// Configurar modal de ayuda
setupHelpModal();

// Configurar toggle del sidebar de thumbnails
setupSidebarToggle();