export interface DWVApp {
  init: (options: unknown) => void;
  onResize?: () => void;
  reset: () => void;
  loadURLs: (
    urls: string[],
    options: {
      requestHeaders: Array<{ name: string; value: string }>;
      withCredentials: boolean;
      batchSize: number;
    },
  ) => void;
  getLayerGroupByDivId: (id: string) => {
    getActiveViewLayer: () => {
      getViewController: () => {
        setWindowLevel: (wl: unknown) => void;
        getWindowLevel: () => { center: number; width: number };
        getImageRescaledDataRange: () => { min: number; max: number };
      };
    } | null;
  } | null;
}

export interface DWVModule {
  App: new () => DWVApp;
  ViewConfig: new (id: string) => unknown;
  AppOptions: new (config: Record<string, unknown[]>) => unknown;
  ToolConfig: new () => unknown;
  WindowLevel: new (center: number, width: number) => unknown;
  toolList: Record<string, unknown>;
}

export interface DrawController {
  removeAllAnnotationsWithCommand: (command: (cmd: object) => void) => void;
}
