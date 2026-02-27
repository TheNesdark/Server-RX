import fs from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.resolve(process.cwd(), "config.json");

// H12: Interface tipada para la configuración
export interface AppConfig {
  JWT_SECRET: string;
  ORTHANC_URL: string;
  ORTHANC_USERNAME: string;
  ORTHANC_PASSWORD: string;
  ADMIN_USERNAME: string;
  ADMIN_PASSWORD: string;
  DB_PATH: string;
  PROD: boolean;
}

// H1: Sin credenciales hardcodeadas — el usuario DEBE configurarlas antes de arrancar
const DEFAULT_CONFIG: AppConfig = {
  JWT_SECRET: "",
  ORTHANC_URL: "http://localhost:8042",
  ORTHANC_USERNAME: "orthanc",
  ORTHANC_PASSWORD: "",
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "",
  DB_PATH: "db/studies.db",
  PROD: false
};

const getConfig = (): AppConfig => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
      console.warn("⚠️  Se creó config.json con valores vacíos. Configura JWT_SECRET, ADMIN_PASSWORD y ORTHANC_PASSWORD antes de usar el sistema.");
      return DEFAULT_CONFIG;
    }
    const fileContent = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(fileContent) as Partial<AppConfig>;
    const merged: AppConfig = { ...DEFAULT_CONFIG, ...parsed };

    // H1: Advertir si faltan credenciales críticas
    if (!merged.JWT_SECRET) {
      console.error("❌ CRÍTICO: JWT_SECRET está vacío en config.json. El sistema no es seguro.");
    }
    if (!merged.ADMIN_PASSWORD) {
      console.error("❌ CRÍTICO: ADMIN_PASSWORD está vacío en config.json.");
    }

    return merged;
  } catch (error) {
    console.error("Error reading/creating config.json:", error);
    return DEFAULT_CONFIG;
  }
};

const config = getConfig();

export const JWT_SECRET = config.JWT_SECRET;
export const ORTHANC_URL = config.ORTHANC_URL || "http://localhost:8042";
export const ORTHANC_USERNAME = config.ORTHANC_USERNAME || "orthanc";
export const ORTHANC_PASSWORD = config.ORTHANC_PASSWORD;
export const ADMIN_USERNAME = config.ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = config.ADMIN_PASSWORD;
export const DB_PATH = config.DB_PATH || path.join(process.cwd(), "studies.db");
export const PROD = config.PROD === true;

// H5: ORTHANC_AUTH se calcula dinámicamente para reflejar cambios de config sin reinicio
export const getOrthancAuth = (): string => {
  const cfg = readConfig();
  return `Basic ${Buffer.from(`${cfg.ORTHANC_USERNAME}:${cfg.ORTHANC_PASSWORD}`).toString("base64")}`;
};

// H12: saveConfig tipado con AppConfig
export const saveConfig = (newConfig: AppConfig): boolean => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error saving config.json:", error);
    return false;
  }
};

export const readConfig = (): AppConfig => {
  return getConfig();
};
