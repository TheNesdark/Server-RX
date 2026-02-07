import { base64Encode } from "#/utils/StudyUtils";
import fs from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.resolve(process.cwd(), "config.json");

const getConfig = () => {
  try {
    const fileContent = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error("Error reading config.json:", error);
    return {};
  }
};

const config = getConfig();

export const JWT_SECRET = config.JWT_SECRET || "fallback-secret";
export const ORTHANC_URL = config.ORTHANC_URL || "http://localhost:8042";
export const ORTHANC_USERNAME = config.ORTHANC_USERNAME || "orthanc";
export const ORTHANC_PASSWORD = config.ORTHANC_PASSWORD || "orthanc";
export const ADMIN_USERNAME = config.ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = config.ADMIN_PASSWORD || "admin";
export const DB_PATH = config.DB_PATH || path.join(process.cwd(), "studies.db");
export const PROD = config.PROD === true;
export const ORTHANC_AUTH = `Basic ${base64Encode(`${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`)}`;

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
