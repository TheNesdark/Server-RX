export interface DWVEventCallbacks {
    onWindowLevelChange: (center: number, width: number) => void;
    onLoad: (dataRange: { min: number, max: number }, wl: { center: number, width: number }) => void;
    onLoadItem: () => void;
}

export interface DataRange {
    min: number;
    max: number;
}

export interface WindowLevel {
    center: number;
    width: number;
}

export const TOOL_ACTIONS = {
    "Zoom & Pan": "ZoomAndPan",
    "Levels": "WindowLevel",
    "Floodfill": "Floodfill"
} as const;