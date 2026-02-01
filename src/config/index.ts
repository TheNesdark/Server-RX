import { base64Encode } from "#/utils/StudyUtils";
import "dotenv/config";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} no está definida en las variables de entorno`);
  }
  return value;
};

export const JWT_SECRET = getEnv('JWT_SECRET');
export const ORTHANC_URL = getEnv('ORTHANC_URL');
export const ORTHANC_USERNAME = getEnv('ORTHANC_USERNAME');
export const ORTHANC_PASSWORD = getEnv('ORTHANC_PASSWORD');
export const ADMIN_USERNAME = getEnv('ADMIN_USERNAME');
export const ADMIN_PASSWORD = getEnv('ADMIN_PASSWORD');
export const PROD = getEnv('PROD') === 'true';
export const ORTHANC_AUTH = `Basic ${base64Encode(`${ORTHANC_USERNAME}:${ORTHANC_PASSWORD}`)}`;