export type ViewerPrimaryTool =
    | "Pan"
    | "Zoom"
    | "ZoomPan"
    | "Wwwc"
    | "StackScroll"
    | "BorderMagnify"
    | "Rotate";

export type ViewerOverlayTool =
    | "OrientationMarkers"
    | "ScaleOverlay";

export type ViewerDrawShape =
    | "Arrow"
    | "ArrowAnnotate"
    | "Ruler"
    | "Circle"
    | "Ellipse"
    | "Rectangle"
    | "Protractor"
    | "Roi"
    | "Eraser";

export interface ViewerToolController {
    activatePrimaryTool: (tool: ViewerPrimaryTool) => void;
    activateDrawShape: (shape: ViewerDrawShape) => void;
    toggleOverlayTool: (tool: ViewerOverlayTool) => boolean;
    clearAnnotations: () => void;
    resetView: () => void;
}

export const TOOL_ACTIONS = {
    "Zoom & Pan": "ZoomPan",
    "BorderMagnify": "BorderMagnify",
    "Rotate": "Rotate",
} as const;