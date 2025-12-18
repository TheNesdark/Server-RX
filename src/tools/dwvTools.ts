import type { App } from "dwv";

export class NoneTool {
    app: App;

    constructor(app: App) {
        this.app = app;
    }

    activate(_bool: boolean) {
    }

    init() {
    }

    setFeatures(_features: Record<string, unknown>) {
    }
}
