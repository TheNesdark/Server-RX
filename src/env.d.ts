/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly API_BASE_URL: string;
  readonly ORTHANC_USERNAME: string;
  readonly ORTHANC_PASSWORD: string;
  readonly JWT_SECRET: string;
  readonly ADMIN_USERNAME?: string;
  readonly ADMIN_PASSWORD?: string;
  readonly PROD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    user: {
      username: string;
      exp: number; 
    } | null;
  }
}

// H11: Tipado de variables globales para eliminar @ts-ignore en orthanc/index.ts y watcher.ts
declare var _orthancWatcherStarted: boolean | undefined;
declare var isOrthancSyncing: boolean | undefined;
