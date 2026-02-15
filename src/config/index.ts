import fs from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.resolve(process.cwd(), "config.json");

const DEFAULT_CONFIG = {
  JWT_SECRET: "RX_2026_JWT_8f2c4b9d6a1e3f7c0d5b8a2e1f4c6d9b",
  ORTHANC_URL: "http://localhost:8042",
  ORTHANC_USERNAME: "orthanc",
  ORTHANC_PASSWORD: "orthanc",
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "admin",
  DB_PATH: "db/studies.db",
  PROD: false
};

const getConfig = () => {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
      return DEFAULT_CONFIG;
    }
    const fileContent = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading/creating config.json:", error);
    return DEFAULT_CONFIG;
  }
};

const config = getConfig();

export const JWT_SECRET = config.JWT_SECRET || "fallback-secret-must-be-at-least-32-bytes-long";
export const ORTHANC_URL = config.ORTHANC_URL || "http://localhost:8042";
export const ORTHANC_USERNAME = config.ORTHANC_USERNAME || "orthanc";
export const ORTHANC_PASSWORD = config.ORTHANC_PASSWORD || "orthanc";
export const ADMIN_USERNAME = config.ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = config.ADMIN_PASSWORD || "admin";
export const DB_PATH = config.DB_PATH || path.join(process.cwd(), "studies.db");
export const PROD = config.PROD === true;
export const ORTHANC_AUTH = `Basic ${Buffer.from(`${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`).toString('base64')}`;

export const saveConfig = (newConfig: any) => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error("Error saving config.json:", error);
    return false;
  }
};

export const readConfig = () => {
  return getConfig();
};
